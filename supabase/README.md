# Supabase — estado atual

O banco de produção `stellar-legacy` é a fonte canônica do schema atual.

Principais tabelas usadas pelo jogo:

- `profiles`
- `game_saves`
- `auction_bids`
- `player_presence`
- `pvp_engagements`
- `pvp_damage_events`
- `arena_profiles`
- `arena_stats`
- `arena_daily`
- `arena_battles`
- `arena_daily_rewards`

A V11 adiciona a RPC `public.arena_attack_v11(uuid)` sem remover a RPC anterior, facilitando rollback.

Para atualizar a Arena V11, execute `sql/V11_ARENA_CINEMATIC.sql` no projeto Supabase `stellar-legacy`.
