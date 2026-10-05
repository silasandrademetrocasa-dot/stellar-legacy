-- Stellar Legacy 17.7.5 — Position Root Fix + SQL cleanup
-- Migration já aplicada no Supabase de produção.
-- Mantida no ZIP apenas como referência técnica.

-- 1) O reset ADM não depende mais das tabelas normalizadas antigas.
-- 2) As tabelas vazias/obsoletas foram removidas do banco:
--    ammunition, inventory, inventory_items, owned_ships, player_drones,
--    player_state, ship_loadout, chatgpt_deploy_chunks, chatgpt_deploy_files.
-- 3) player_presence espelha a posição real para player_location_v1774.
--    Assim a persistência continua funcionando mesmo se a chamada RPC direta
--    de checkpoint falhar no navegador.

create or replace function public.mirror_presence_to_location_v1775()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_stamp bigint;
begin
  if new.user_id is null or new.map_id is null then return new; end if;
  if new.x is null or new.y is null then return new; end if;
  v_stamp:=floor(extract(epoch from coalesce(new.updated_at,now()))*1000)::bigint;

  insert into public.player_location_v1774(
    user_id,map_id,territory_faction,x,y,angle,client_saved_at,updated_at
  ) values(
    new.user_id,new.map_id,new.territory_faction,new.x,new.y,coalesce(new.angle,0),v_stamp,coalesce(new.updated_at,now())
  )
  on conflict(user_id) do update set
    map_id=excluded.map_id,
    territory_faction=excluded.territory_faction,
    x=excluded.x,
    y=excluded.y,
    angle=excluded.angle,
    client_saved_at=greatest(public.player_location_v1774.client_saved_at,excluded.client_saved_at),
    updated_at=excluded.updated_at
  where excluded.updated_at>=public.player_location_v1774.updated_at;

  return new;
end;
$$;

drop trigger if exists player_presence_location_mirror_v1775 on public.player_presence;
create trigger player_presence_location_mirror_v1775
after insert or update of map_id,territory_faction,x,y,angle,updated_at
on public.player_presence
for each row execute function public.mirror_presence_to_location_v1775();

revoke all on function public.mirror_presence_to_location_v1775() from public,anon,authenticated;

-- Os DROP abaixo também já foram aplicados em produção.
drop table if exists public.ammunition restrict;
drop table if exists public.inventory_items restrict;
drop table if exists public.owned_ships restrict;
drop table if exists public.player_drones restrict;
drop table if exists public.player_state restrict;
drop table if exists public.ship_loadout restrict;
drop table if exists public.inventory restrict;
drop table if exists public.chatgpt_deploy_chunks restrict;
drop table if exists public.chatgpt_deploy_files restrict;
