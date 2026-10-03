# AUDIT V13.1.0 — WARFRONT

**Status:** APROVADO

## Validações
- Node --check: game.js/api.js/data.js/server index aprovados
- World Boss: dano client-side agrupado antes do RPC; HP global no Supabase
- Guerra: janela de 12h, placar compartilhado, boss/PvP/world boss pontuam
- Blueprints: ARC-4, VSH-5, THR-6
- Mastery: 5 níveis por classe; potência + cooldown
- Compatibilidade: hydrate cria progress.warfront em saves antigos

## Resultado
- Nenhum ID duplicado no HTML.
- Nenhum import de API sem export correspondente.
- Referências diretas de assets existentes.
- Marcadores do sistema WARFRONT e SQL presentes.
- Versões principais alinhadas em 13.1.0.

## Deploy obrigatório
- Para ativar World Boss e Guerra de Clãs online, execute `sql/V13_1_WARFRONT.sql` no Supabase (ou `sql/CURRENT_BACKEND.sql` completo).
- Depois, suba os arquivos no Git/Render. Blueprints e Mastery usam o save normal do jogador.
