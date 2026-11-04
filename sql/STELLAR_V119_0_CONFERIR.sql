-- CONSULTAS READ ONLY, rodar antes e apos ativar.
select count(*) as saves from public.game_saves;
select count(*) as canonical_heads from public.stellar_player_save_head_v119;
select slot,count(*) as copies,count(*) filter(where state_hash=md5(state::text)) as valid
  from public.stellar_player_save_checkpoint_v119 group by slot order by slot;
select p.callsign, h.revision, h.state_hash=md5(g.state::text) as current_hash_matches,
  (g.state#>>'{profile,credits}')::bigint=p.credits as credits_match,
  (g.state#>>'{profile,uridium}')::bigint=p.uridium as stl_match
from public.game_saves g join public.stellar_player_save_head_v119 h on h.user_id=g.user_id
 join public.profiles p on p.id=g.user_id order by p.callsign;
select m.module,count(*) as writes from public.stellar_player_save_modules_v119 m
 where m.created_at>now()-interval '1 hour' group by m.module order by writes desc;
