/* ---------- Portal do cliente: link individual ---------- */
async function openPortal(c){
  S.modal={kind:"portal", c, acc:undefined, confirm:null, busy:false};
  const draw=()=>{ const M=S.modal; if(!M||M.kind!=="portal") return; const a=M.acc; const link=a?location.origin+"/p/"+a.token:"";
    const nIdeias=S.citems.filter(i=>i.portal).length, nArq=S.cfiles.filter(f=>f.portal).length;
    mount(`<div class="scrim"><div class="modal sm" role="dialog" aria-modal="true" aria-labelledby="pt-t" style="width:min(620px,100%)">
      <div class="m-head"><div style="flex:1"><div class="eyebrow">Spectra</div><h2 id="pt-t" class="dot-title">Portal do cliente</h2></div><button type="button" class="icon-btn" data-close aria-label="Fechar">${icon(I.x)}</button></div>
      <div class="m-body" style="display:flex;flex-direction:column;gap:14px">
        <div style="display:flex;gap:14px;align-items:flex-start"><span class="shield">${icon('<path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/>')}</span>
          <div><b style="font-size:17px;color:var(--accent)">Um link. Só o universo de ${esc(c.nome)}.</b><p style="margin:6px 0 0;color:var(--muted)">Quem tiver o link vê os conteúdos em aprovação, ajuste ou aprovados, e as ideias e arquivos que você liberar. Pode aprovar, pedir ajuste e comentar.</p></div></div>
        <div class="note-box" style="margin:0"><b>Informações internas ficam com a Spectra.</b><br>CRM, contratos, briefing, rascunhos e mensagens internas não aparecem no portal.</div>
        <div class="chips"><span class="chip">${nIdeias} ${nIdeias===1?"ideia liberada":"ideias liberadas"}</span><span class="chip">${nArq} ${nArq===1?"arquivo liberado":"arquivos liberados"}</span></div>
        ${a===undefined?`<div class="skeleton" style="height:60px"></div>`:a&&a.ativo?`<div class="field"><label for="pt-link">Link individual do cliente</label><input class="inp" id="pt-link" readonly value="${esc(link)}"></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn accent" id="pt-copy">${icon(CI.copy)}Copiar link</button><a class="btn" href="${esc(link)}" target="_blank" rel="noopener">${icon(I.ext)}Visualizar portal</a></div>`
          :`<div class="empty" style="padding:20px"><p>${a?"O acesso está desativado. O link antigo não abre mais.":"Este cliente ainda não tem link de portal."}</p><button type="button" class="btn accent" id="pt-create" ${S.dbState==="ready"?"":"disabled"}>${a?"Reativar com um link novo":"Gerar link do portal"}</button></div>`}
      </div>
      ${a&&a.ativo?`<div class="m-foot">${M.confirm?`<div class="confirm-inline"><span>${M.confirm==="novo"?"O link atual vai parar de funcionar. Gerar outro?":"Desativar o acesso deste cliente ao portal?"}</span><button type="button" class="btn small" id="pt-no">Cancelar</button><button type="button" class="btn small danger solid" id="pt-yes">${M.confirm==="novo"?"Gerar novo link":"Desativar"}</button></div>`
        :`<button type="button" class="linkish" id="pt-new">Gerar novo link</button><span class="spacer"></span><button type="button" class="linkish danger" id="pt-off">Desativar acesso</button>`}</div>`:""}
    </div></div>`);
    const q=s=>$(s);
    if(q("#pt-copy")) q("#pt-copy").onclick=async()=>{ try{ await navigator.clipboard.writeText(link); toast("Link copiado."); }catch(e){ const i=q("#pt-link"); i.focus(); i.select(); toast("Selecione e copie com Ctrl+C."); } };
    const save=async row=>{ const { data, error } = await sb.from("portal_acessos").upsert({cliente_id:c.id, ...row}).select().single(); if(error) throw mapErr(error); M.acc=data; M.confirm=null; draw(); };
    if(q("#pt-create")) q("#pt-create").onclick=async()=>{ try{ await save({token:crypto.randomUUID(), ativo:true}); toast("Link do portal criado."); }catch(e){ writeErr(e); } };
    if(q("#pt-new")) q("#pt-new").onclick=()=>{ M.confirm="novo"; draw(); };
    if(q("#pt-off")) q("#pt-off").onclick=()=>{ M.confirm="off"; draw(); };
    if(q("#pt-no")) q("#pt-no").onclick=()=>{ M.confirm=null; draw(); };
    if(q("#pt-yes")) q("#pt-yes").onclick=async()=>{ try{ if(M.confirm==="novo"){ await save({token:crypto.randomUUID(), ativo:true}); toast("Novo link gerado. O anterior não abre mais."); } else { await save({ativo:false}); toast("Acesso desativado."); } }catch(e){ writeErr(e); } };
  };
  draw();
  const { data } = await sb.from("portal_acessos").select("*").eq("cliente_id", c.id).maybeSingle();
  if(S.modal&&S.modal.kind==="portal"){ S.modal.acc=data||null; draw(); }
}

/* ---------- Equipe ---------- */
function openTeam(){
  S.modal={kind:"team"};
  const draw=()=>{ if(!S.modal||S.modal.kind!=="team") return; const list=Object.values(TEAM).sort((a,b)=>(a.papel==="pendente"?0:1)-(b.papel==="pendente"?0:1)||(a.nome||"").localeCompare(b.nome||""));
    const admin=S.me.papel==="admin";
    mount(`<div class="scrim"><div class="modal sm" role="dialog" aria-modal="true" aria-labelledby="tm-t" style="width:min(620px,100%)">
      <div class="m-head"><div style="flex:1"><h2 id="tm-t">Equipe</h2><div class="sub">Quem cria conta em ${esc(location.host)} entra como pendente até ${admin?"você aprovar":"um administrador aprovar"}.</div></div><button type="button" class="icon-btn" data-close aria-label="Fechar">${icon(I.x)}</button></div>
      <div class="m-body"><div class="hist">${list.map(p=>`<div class="hist-item" style="grid-template-columns:28px minmax(0,1fr) auto;align-items:center"><span class="av">${esc((p.nome||p.email||"?")[0].toUpperCase())}</span>
        <div><p><b>${esc(p.nome||p.email)}</b>${p.id===S.me.id?" (você)":""}</p><time>${esc(p.email)}</time></div>
        ${admin&&p.id!==S.me.id?`<div style="display:flex;gap:6px;align-items:center"><select class="select" style="height:34px" data-papel="${esc(p.id)}" aria-label="Papel de ${esc(p.nome||p.email)}">${[["pendente","Pendente"],["equipe","Equipe"],["admin","Administrador"]].map(([k,n])=>`<option value="${k}" ${p.papel===k?"selected":""}>${n}</option>`).join("")}</select><button type="button" class="icon-btn" data-rmuser="${esc(p.id)}" aria-label="Remover ${esc(p.nome||p.email)}">${icon(I.trash)}</button></div>`
          :`<span class="badge ${p.papel==="pendente"?"Pausado":""}">${p.papel==="admin"?"Administrador":p.papel==="equipe"?"Equipe":"Pendente"}</span>`}</div>`).join("")}</div></div>
      <div class="m-foot"><span class="spacer"></span><button type="button" class="btn" data-close>Fechar</button></div></div></div>`);
    $("#layer").querySelectorAll("[data-papel]").forEach(s=>s.onchange=async()=>{ const { error } = await sb.from("profiles").update({papel:s.value}).eq("id",s.dataset.papel); if(error) writeErr(mapErr(error)); else toast("Acesso atualizado."); });
    $("#layer").querySelectorAll("[data-rmuser]").forEach(b=>b.onclick=async()=>{ if(b.dataset.armed!=="1"){ b.dataset.armed="1"; b.style.background="var(--danger)"; b.style.color="#fff"; toast("Clique de novo para remover o acesso."); return; }
      const { error } = await sb.from("profiles").delete().eq("id",b.dataset.rmuser); if(error) writeErr(mapErr(error)); else toast("Acesso removido."); });
  };
  S.modal.redraw=draw; draw();
}

/* ---------- Login ---------- */
function authScreen(mode, msg){
  const box=$("#auth"); box.hidden=false; $(".app").hidden=true;
  const titles={entrar:"Entrar",criar:"Criar conta",esqueci:"Recuperar senha",nova:"Nova senha",pendente:"Quase lá",confirme:"Confirme seu e-mail"};
  let form="";
  if(mode==="entrar") form=`<div class="field"><label for="a-email">E-mail</label><input class="inp" id="a-email" type="email" autocomplete="email"></div>
    <div class="field"><label for="a-pass">Senha</label><input class="inp" id="a-pass" type="password" autocomplete="current-password"></div>
    <button type="submit" class="btn accent" style="width:100%">Entrar</button>
    <div class="auth-links"><button type="button" class="linkish" data-mode="esqueci">Esqueci minha senha</button><button type="button" class="linkish" data-mode="criar">Criar conta</button></div>`;
  else if(mode==="criar") form=`<div class="field"><label for="a-nome">Nome</label><input class="inp" id="a-nome" autocomplete="name"></div>
    <div class="field"><label for="a-email">E-mail</label><input class="inp" id="a-email" type="email" autocomplete="email"></div>
    <div class="field"><label for="a-pass">Senha</label><input class="inp" id="a-pass" type="password" autocomplete="new-password" minlength="8"><span class="hint">Pelo menos 8 caracteres.</span></div>
    <button type="submit" class="btn accent" style="width:100%">Criar conta</button>
    <div class="auth-links"><button type="button" class="linkish" data-mode="entrar">Já tenho conta</button></div>`;
  else if(mode==="esqueci") form=`<div class="field"><label for="a-email">E-mail da sua conta</label><input class="inp" id="a-email" type="email" autocomplete="email"></div>
    <button type="submit" class="btn accent" style="width:100%">Enviar link de recuperação</button>
    <div class="auth-links"><button type="button" class="linkish" data-mode="entrar">Voltar</button></div>`;
  else if(mode==="nova") form=`<div class="field"><label for="a-pass">Nova senha</label><input class="inp" id="a-pass" type="password" autocomplete="new-password" minlength="8"></div>
    <button type="submit" class="btn accent" style="width:100%">Salvar nova senha</button>`;
  else form=`<button type="button" class="btn" style="width:100%" id="a-out">Sair</button>`;
  box.innerHTML=`<div class="auth-card"><div class="auth-brand"><span class="mark">${LOGO_SVG}</span><div><div class="wm">SPECTRA<sup>®</sup></div><div class="wm-sub">WORKSPACE</div></div></div>
    <div class="prism" style="margin:18px 0 22px"></div><h1 class="dot-title" style="font-size:28px">${titles[mode]}</h1>
    ${msg?`<p class="auth-msg">${esc(msg)}</p>`:""}
    <form id="a-form" novalidate style="display:flex;flex-direction:column;gap:14px;margin-top:16px">${form}</form>
    <p class="auth-slogan">Stay inspired, never stop creating.</p></div>`;
  box.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>authScreen(b.dataset.mode));
  const out=$("#a-out"); if(out) out.onclick=async()=>{ await sb.auth.signOut(); location.reload(); };
  const f=$("#a-form"); f.onsubmit=async e=>{ e.preventDefault(); const btn=f.querySelector("button[type=submit]"); if(btn) btn.disabled=true;
    const v=id=>{ const el=$("#"+id); return el?el.value.trim():""; };
    try{
      if(mode==="entrar"){ const { error } = await sb.auth.signInWithPassword({email:v("a-email"), password:$("#a-pass").value}); if(error) throw error; }
      else if(mode==="criar"){ if($("#a-pass").value.length<8) throw {message:"A senha precisa de pelo menos 8 caracteres."};
        const { data, error } = await sb.auth.signUp({email:v("a-email"), password:$("#a-pass").value, options:{data:{nome:v("a-nome")}, emailRedirectTo:location.origin}}); if(error) throw error;
        if(!data.session) authScreen("confirme","Enviamos um link para "+v("a-email")+". Abra o e-mail e clique no link para ativar a conta."); }
      else if(mode==="esqueci"){ const { error } = await sb.auth.resetPasswordForEmail(v("a-email"),{redirectTo:location.origin}); if(error) throw error; authScreen("entrar","Se o e-mail tiver conta, chega um link para criar uma nova senha."); }
      else if(mode==="nova"){ const { error } = await sb.auth.updateUser({password:$("#a-pass").value}); if(error) throw error; location.hash=""; location.reload(); }
    }catch(err){ const m=(err&&err.message)||""; authScreen(mode, /Invalid login/i.test(m)?"E-mail ou senha incorretos.":/Email not confirmed/i.test(m)?"Confirme seu e-mail pelo link que enviamos antes de entrar.":/already registered/i.test(m)?"Este e-mail já tem conta. Use Entrar.":m||"Não foi possível concluir. Tente de novo."); }
  };
  const first=box.querySelector("input"); if(first) first.focus();
}

async function startApp(session){
  if(S.started) return;
  const { data: me, error } = await sb.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
  if(error||!me){ authScreen("entrar","Não encontramos seu perfil. Saia e entre de novo."); return; }
  if(me.papel==="pendente"){ authScreen("pendente","Sua conta foi criada. Um administrador da Spectra precisa liberar seu acesso. Avise o Pedro e recarregue a página depois."); return; }
  S.started=true; S.me=me; S.uid=me.id; S.db=DB; S.user=USER; S.assets=ASSETS; S.sample=SAMPLE;
  $("#auth").hidden=true; $(".app").hidden=false;
  readRoute(); applyBrand(); renderNav(); renderMe(); render(); connect();
}

async function boot(){
  S.recovering = location.hash.includes("type=recovery");
  sb.auth.onAuthStateChange((ev, session)=>{
    if(ev==="PASSWORD_RECOVERY"){ authScreen("nova","Escolha uma nova senha para sua conta."); return; }
    if(ev==="SIGNED_IN" && session && !S.started && !S.recovering) setTimeout(()=>startApp(session),0);
    if(ev==="SIGNED_OUT"){ location.hash=""; location.reload(); }
  });
  const { data: { session } } = await sb.auth.getSession();
  if(S.recovering) return;
  if(session) startApp(session); else authScreen("entrar");
}
