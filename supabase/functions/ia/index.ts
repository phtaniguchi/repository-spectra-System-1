// Função de IA da Spectra: recebe um prompt da plataforma e responde com o texto do modelo.
// A chave fica guardada como segredo no Supabase (ANTHROPIC_API_KEY ou OPENAI_API_KEY).
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "metodo" }, 405);
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: ok, error: e1 } = await sb.rpc("is_team");
    if (e1 || !ok) return json({ error: "sem_permissao" }, 403);

    const body = await req.json().catch(() => ({}));
    const prompt = typeof body.prompt === "string" ? body.prompt : "";
    if (!prompt) return json({ error: "pedido_invalido" }, 400);
    if (prompt.length > 200_000) return json({ error: "pedido_grande" }, 413);
    const maxTokens = Math.min(Number(body.max_tokens) || 12000, 16000);

    const anthropic = Deno.env.get("ANTHROPIC_API_KEY");
    const openai = Deno.env.get("OPENAI_API_KEY");
    if (anthropic) {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": anthropic, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: Deno.env.get("IA_MODELO") || "claude-sonnet-5-5",
          max_tokens: maxTokens,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const d = await r.json();
      if (!r.ok) return json({ error: r.status === 429 ? "limite" : "ia_falhou", detalhe: d?.error?.message || r.status }, r.status === 429 ? 429 : 502);
      const text = (d.content || []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
      return json({ text, truncated: d.stop_reason === "max_tokens" });
    }
    if (openai) {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: "Bearer " + openai, "content-type": "application/json" },
        body: JSON.stringify({
          model: Deno.env.get("IA_MODELO") || "gpt-4o",
          max_tokens: Math.min(maxTokens, 16000),
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const d = await r.json();
      if (!r.ok) return json({ error: r.status === 429 ? "limite" : "ia_falhou", detalhe: d?.error?.message || r.status }, r.status === 429 ? 429 : 502);
      const ch = d.choices?.[0];
      return json({ text: ch?.message?.content || "", truncated: ch?.finish_reason === "length" });
    }
    return json({ error: "sem_chave" }, 400);
  } catch (e) {
    return json({ error: "erro_interno", detalhe: String(e) }, 500);
  }
});
