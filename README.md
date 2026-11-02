# Spectra Workspace

Plataforma interna da agência Spectra: CRM, clientes (calendário de conteúdo, central criativa, arquivos, briefing com IA, mensagens) e portal do cliente.

- `index.html` – app da equipe (login por e-mail e senha; o primeiro usuário vira administrador e aprova os demais em **Equipe**)
- `portal.html` – portal do cliente, aberto pelo link `/p/<token>` gerado em cada cliente
- `supabase/functions/ia` – função de IA (usa o segredo `ANTHROPIC_API_KEY` ou `OPENAI_API_KEY`)
- Banco: Supabase, projeto `lqlnsbnafbccyesdaqhj` (São Paulo)
- Hospedagem: Netlify, publica a cada push na branch `main`
