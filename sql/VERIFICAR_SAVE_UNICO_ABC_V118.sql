-- Consultas SOMENTE LEITURA para validar depois do deploy.
-- A lista de nomes abaixo é apenas exemplo; troque pelo piloto de teste.
select p.callsign,s.slot,s.save_updated_at,
       s.state_hash=md5(s.state::text) as hash_ok,
       s.captured_at
from public.stellar_player_save_abc_v118 s
join public.profiles p on p.id=s.user_id
where p.callsign ilike '%Devil%Dead%'
order by s.slot;

-- Snapshot oficial e a projecao do perfil precisam concordar:
select p.callsign,
  p.credits=(g.state#>>'{profile,credits}')::bigint as credits_ok,
  p.uridium=(g.state#>>'{profile,uridium}')::bigint as stl_ok,
  p.xp=(g.state#>>'{profile,xp}')::bigint as xp_ok,
  p.aliens_killed=(g.state#>>'{profile,aliensKilled}')::bigint as kills_ok
from public.profiles p join public.game_saves g on g.user_id=p.id
where p.callsign ilike '%Devil%Dead%';

-- Referencias de drones validas em ambas as CONF:
select p.callsign,
 (select count(*) from jsonb_object_keys(coalesce(g.state#>'{combatConfigsV2013,profiles,1,droneSlots}','{}'::jsonb)) as k(id)
  where not exists (select 1 from jsonb_array_elements(g.state->'drones') d where d->>'id'=k.id)) as orfaos_conf1,
 (select count(*) from jsonb_object_keys(coalesce(g.state#>'{combatConfigsV2013,profiles,2,droneSlots}','{}'::jsonb)) as k(id)
  where not exists (select 1 from jsonb_array_elements(g.state->'drones') d where d->>'id'=k.id)) as orfaos_conf2
from public.profiles p join public.game_saves g on g.user_id=p.id
where p.callsign ilike '%Devil%Dead%';
