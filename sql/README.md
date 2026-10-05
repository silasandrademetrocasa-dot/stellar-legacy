# SQL atual do Stellar Legacy

O banco de produção já está migrado. O ZIP mantém somente referências técnicas atuais; migrations antigas ficam no histórico do Git e não viajam mais em releases.

- `CURRENT_BACKEND.sql`: snapshot consolidado do backend principal.
- `V17_7_1_TELEMETRY_TITLES.sql`: telemetria, milestones e títulos.
- `V17_7_5_POSITION_SQL_CLEANUP.sql`: persistência robusta de posição + limpeza das tabelas legadas.

### Limpeza 17.7.5
Foram removidas tabelas antigas vazias que não participavam mais do runtime: `ammunition`, `inventory`, `inventory_items`, `owned_ships`, `player_drones`, `player_state`, `ship_loadout` e as tabelas temporárias `chatgpt_deploy_*`.

A posição persistente continua em `player_location_v1774`, e agora `player_presence` espelha automaticamente o último movimento real para ela.

## V18.1.1 — NPC Runtime Config
`V18_1_1_NPC_RUNTIME_CONFIG.sql` move stats, recompensas, respawn e população por mapa dos NPCs para o Supabase. O servidor mantém fallback do `public/data.js` caso a configuração remota não esteja disponível.
