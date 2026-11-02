/* ================= Supabase: dados, arquivos, IA e equipe ================= */
const SUPA_URL = "https://lqlnsbnafbccyesdaqhj.supabase.co";
const SUPA_KEY = "sb_publishable_O3tJ8MAfoUlyStIU6YvV9A_44Kq3qI3";
const sb = window.supabase.createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
const BLOB = id => SUPA_URL + "/storage/v1/object/public/midias/" + encodeURIComponent(id || "");
const DOC_TABLES = new Set(["oportunidades","clientes","posts","post_conversa","criativo","arquivos","mensagens","briefings","config","atividades"]);
const HAS_CLIENTE = new Set(["posts","criativo","arquivos","mensagens"]);
const META = { fromCache:false, hasPendingWrites:false };
const mapErr = e => {
  const msg = (e && (e.message || e.msg)) || String(e);
  if (e && (e.code === "42501" || /row-level security|permission denied|JWT/i.test(msg))) return { code:"invalid_argument", message:msg };
  if (e && e.code === "P0002") return { code:"invalid_argument", message:msg };
  return { code:"unavailable", message:msg };
};
function colInfo(path){
  const s = path.split("/");
  if (s.length === 1 && DOC_TABLES.has(s[0])) return { table:s[0], path };
  if (s.length === 3 && s[0] === "posts" && s[2] === "conversa") return { table:"post_conversa", parent:s[1], path };
  throw new TypeError("Caminho não suportado: " + path);
}
const snapRow = r => ({ id:r.id, exists:true, data:()=>r.data, metadata:META });
function makeQuery(info, filters, order, lim){
  const build = () => {
    let q = sb.from(info.table).select("id,data");
    if (info.parent) q = q.eq("post_id", info.parent);
    filters.forEach(([f,op,v]) => { if (op !== "==") throw new TypeError("Filtro não suportado: " + op); q = q.eq("data->>" + f, String(v)); });
    if (order) q = q.order("data->>" + order[0], { ascending: order[1] !== "desc" });
    q = q.limit(lim || 5000);
    return q;
  };
  const run = async () => { const { data, error } = await build(); if (error) throw mapErr(error);
    const docs = (data || []).map(snapRow); return { docs, size:docs.length, empty:!docs.length, docChanges:()=>[], metadata:META }; };
  const cf = filters.find(([f]) => f === "clienteId");
  const rtFilter = info.parent ? "post_id=eq." + info.parent : (cf && HAS_CLIENTE.has(info.table) ? "cliente_id=eq." + cf[2] : null);
  return {
    path: info.path,
    where: (f,o,v) => makeQuery(info, [...filters,[f,o,v]], order, lim),
    orderBy: (f,d) => makeQuery(info, filters, [f, d || "asc"], lim),
    limit: n => makeQuery(info, filters, order, n),
    get: run,
    onSnapshot: (next, err) => liveSub(info.table, rtFilter, run, next, err),
    doc: id => docRef(info, id || uid()),
    add: async d => { const r = docRef(info, uid()); await r.set(d); return r; }
  };
}
function liveSub(table, filter, run, next, err){
  let alive = true, timer = null, seq = 0;
  const fire = async () => { const my = ++seq; try { const s = await run(); if (alive && my === seq) next(s); } catch(e){ if (alive && err) err(e); } };
  fire();
  const opts = { event:"*", schema:"public", table }; if (filter) opts.filter = filter;
  const ch = sb.channel("rt-" + uid()).on("postgres_changes", opts, () => { clearTimeout(timer); timer = setTimeout(fire, 120); }).subscribe();
  return () => { alive = false; clearTimeout(timer); sb.removeChannel(ch); };
}
function docRef(info, id){
  const t = info.table, path = info.path + "/" + id;
  const get = async () => { const { data, error } = await sb.from(t).select("id,data").eq("id", id).maybeSingle(); if (error) throw mapErr(error);
    return data ? snapRow(data) : { id, exists:false, data:()=>undefined, metadata:META }; };
  return {
    id, path, get,
    set: async d => { const row = { id, data: JSON.parse(JSON.stringify(d)), atualizado_em: new Date().toISOString() }; if (info.parent) row.post_id = info.parent;
      const { error } = await sb.from(t).upsert(row); if (error) throw mapErr(error); },
    update: async d => { const { error } = await sb.rpc("merge_doc", { p_table:t, p_id:id, p_patch: JSON.parse(JSON.stringify(d)) }); if (error) throw mapErr(error); },
    delete: async () => { const { error } = await sb.from(t).delete().eq("id", id); if (error) throw mapErr(error); },
    onSnapshot: (next, err) => liveSub(t, "id=eq." + id, get, next, err),
    collection: sub => makeQuery(colInfo(path + "/" + sub), [], null, null)
  };
}
const DB = {
  collection: p => makeQuery(colInfo(p), [], null, null),
  doc: p => { const s = p.split("/"); return docRef(colInfo(s.slice(0,-1).join("/")), s[s.length-1]); }
};

/* Arquivos no Supabase Storage (bucket público "midias", caminhos impossíveis de adivinhar) */
const ASSETS = {
  upload: async (file, opts = {}) => {
    const type = opts.type || file.type || "application/octet-stream";
    const ext = ((file.name || "").split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin";
    const id = uid() + uid() + "." + ext;
    const { error } = await sb.storage.from("midias").upload(id, file, { contentType:type, upsert:false, cacheControl:"31536000" });
    if (error) { const m = error.message || ""; throw { code: /size|large|exceed/i.test(m) ? "too_large" : /mime|type/i.test(m) ? "unsupported_type" : "upstream_error", message:m }; }
    return { id, url: BLOB(id), contentType: type, sizeBytes: file.size };
  },
  delete: async id => { await sb.storage.from("midias").remove([id]); return { deleted:true }; }
};

/* IA via função do Supabase (chave fica guardada no servidor) */
async function callIA(input, opts = {}){
  const prompt = typeof input === "string" ? input : input.map(m => m.content).join("\n\n");
  const { data: { session } } = await sb.auth.getSession();
  let r;
  try {
    r = await fetch(SUPA_URL + "/functions/v1/ia", { method:"POST", signal: opts.signal,
      headers: { "Content-Type":"application/json", apikey: SUPA_KEY, Authorization: "Bearer " + (session ? session.access_token : SUPA_KEY) },
      body: JSON.stringify({ prompt }) });
  } catch(e){ if (e && e.name === "AbortError") throw { code:"cancelled" }; throw { code:"upstream_error", message:String(e) }; }
  let d = {}; try { d = await r.json(); } catch(e){}
  if (!r.ok || d.error) throw { code: d.error === "sem_chave" ? "sem_chave" : d.error === "sem_permissao" ? "not_granted" : r.status === 429 ? "rate_limited" : "upstream_error", message: d.detalhe || d.error || String(r.status) };
  return { text: d.text || "", truncated: !!d.truncated };
}
const SAMPLE = (input, opts) => callIA(input, opts);
SAMPLE.json = async (input, opts) => {
  const { text } = await callIA(input, opts);
  const tryParse = s => { try { return JSON.parse(s); } catch(e){ return undefined; } };
  let v = tryParse(text.trim());
  if (v === undefined) { const m = text.match(/```(?:json)?\s*([\s\S]*?)```/); if (m) v = tryParse(m[1].trim()); }
  if (v === undefined) { const a = text.search(/[\[{]/), b = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]")); if (a >= 0 && b > a) v = tryParse(text.slice(a, b+1)); }
  if (v === undefined) throw { code:"invalid_json", text };
  return v;
};

/* Equipe: nomes vêm da tabela de perfis */
const TEAM = {};
const USER = {
  me: async () => ({ id:S.me.id, name:S.me.nome || S.me.email, avatarUrl:"", isOwner: S.me.papel === "admin", canEdit:true }),
  id: async () => S.me.id,
  profiles: async ids => Object.fromEntries([].concat(ids).map(i => [i, { id:i, name:(TEAM[i] && (TEAM[i].nome || TEAM[i].email)) || "", avatarUrl:"", isMe: i === S.me.id }]))
};
