# Stellar Legacy — V121 Local-First

Documento central de produto: [ROADMAP completo](docs/ROADMAP_STELLAR_LEGACY_V121.md).

Catálogo de produtos com nomes oficiais: [catálogo](docs/CATALOGO_OFICIAL_STELLAR_LEGACY_V121.md).

Arquitetura e modo piloto: [local-first](docs/ARQUITETURA_LOCAL_FIRST_V121.md).

Auditoria da limpeza: [limpeza](docs/LIMPEZA_GITHUB_V121.md).

**Status:** laboratório local-first opt-in; economia compartilhada e save online permanecem nos fluxos legados até migração homologada.


## V130.0 — Cumulativa Android / vendas / economia (04-11-2026)

- Corrigido o bloqueio de vendas do porão e de inventário por pendências visuais de save do hangar, missões e munição.
- Vendas seguem autoritativas no Render/Supabase e usam os recibos idempotentes V125 (mesmo request_id no retry).
- Simplificada consulta de preços de recursos no servidor; botões de venda remota corrigidos quando o Terminal Mercante Elite está equipado.
- Otimização do painel de missões enquanto Autopilot está ativo; métricas de latência por venda disponíveis no navegador/APK.
- Nenhum SQL adicional; nenhum wipe de contas; Farm/PvP/Warfront mantidos nas rotas existentes.
- Consulte `docs/V130_0_CUMULATIVA_ESTABILIDADE_APK_VENDAS.md` para validação e pendências do roadmap.
