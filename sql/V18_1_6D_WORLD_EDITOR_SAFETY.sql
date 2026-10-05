-- Stellar Legacy V18.1.6D — segurança dos campos opcionais do Editor de Mundo.

create or replace function public.admin_update_map_v1814(
  p_map_id text,p_name text default null,p_risk text default null,p_world_w integer default null,p_world_h integer default null,
  p_enemy_multiplier numeric default null,p_ore_count integer default null,p_ore_respawn_min_ms integer default null,p_ore_respawn_max_ms integer default null,
  p_landmark_count integer default null,p_min_level integer default null,p_enabled boolean default null,p_palette jsonb default null,p_structures jsonb default null
) returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare v_uid uuid:=auth.uid();
begin
 if not public.is_game_admin_v1763(v_uid) then raise exception 'Acesso administrativo negado.'; end if;
 update public.game_map_config_v1814 set
  name=case when p_name is null or trim(p_name)='' then name else trim(p_name) end,
  risk=case when p_risk is null or trim(p_risk)='' then risk else trim(p_risk) end,
  world_w=case when p_world_w is null then world_w else greatest(1000,least(50000,p_world_w)) end,
  world_h=case when p_world_h is null then world_h else greatest(1000,least(50000,p_world_h)) end,
  enemy_multiplier=case when p_enemy_multiplier is null then enemy_multiplier else greatest(.1,least(10,p_enemy_multiplier)) end,
  ore_count=case when p_ore_count is null then ore_count else greatest(0,least(1000,p_ore_count)) end,
  ore_respawn_min_ms=case when p_ore_respawn_min_ms is null then ore_respawn_min_ms else greatest(1000,least(600000,p_ore_respawn_min_ms)) end,
  ore_respawn_max_ms=case when p_ore_respawn_max_ms is null then ore_respawn_max_ms else greatest(1000,least(600000,p_ore_respawn_max_ms)) end,
  landmark_count=case when p_landmark_count is null then landmark_count else greatest(0,least(100,p_landmark_count)) end,
  min_level=case when p_min_level is null then min_level else greatest(1,least(100,p_min_level)) end,
  enabled=case when p_enabled is null then enabled else p_enabled end,
  palette=case when p_palette is null then palette else p_palette end,
  structures=case when p_structures is null then structures else p_structures end,
  updated_at=now()
 where map_id=p_map_id;
 if not found then raise exception 'Mapa não encontrado.'; end if;
 if exists(select 1 from public.game_map_config_v1814 where map_id=p_map_id and ore_respawn_max_ms<ore_respawn_min_ms) then
   raise exception 'Respawn máximo deve ser maior ou igual ao mínimo.';
 end if;
 return public.get_world_runtime_config_v1814();
end; $$;

create or replace function public.admin_update_resource_v1814(
 p_resource_key text,p_name text default null,p_color text default null,p_sell_price bigint default null,p_enabled boolean default null
) returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare v_uid uuid:=auth.uid();
begin
 if not public.is_game_admin_v1763(v_uid) then raise exception 'Acesso administrativo negado.'; end if;
 update public.game_resource_config_v1814 set
  name=case when p_name is null or trim(p_name)='' then name else trim(p_name) end,
  color=case when p_color is null or trim(p_color)='' then color else trim(p_color) end,
  sell_price=case when p_sell_price is null then sell_price else greatest(0,p_sell_price) end,
  enabled=case when p_enabled is null then enabled else p_enabled end,
  updated_at=now()
 where resource_key=p_resource_key;
 if not found then raise exception 'Recurso não encontrado.'; end if;
 return public.get_world_runtime_config_v1814();
end; $$;

create or replace function public.admin_update_sector_v1814(
 p_sector_label text,p_graph_x numeric default null,p_graph_y numeric default null,p_min_level integer default null,p_enabled boolean default null
) returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare v_uid uuid:=auth.uid();
begin
 if not public.is_game_admin_v1763(v_uid) then raise exception 'Acesso administrativo negado.'; end if;
 update public.game_sector_nodes_v1814 set
  graph_x=case when p_graph_x is null then graph_x else greatest(0,least(100,p_graph_x)) end,
  graph_y=case when p_graph_y is null then graph_y else greatest(0,least(100,p_graph_y)) end,
  min_level=case when p_min_level is null then min_level else greatest(1,least(100,p_min_level)) end,
  enabled=case when p_enabled is null then enabled else p_enabled end,
  updated_at=now()
 where sector_label=p_sector_label;
 if not found then raise exception 'Setor não encontrado.'; end if;
 return public.get_world_runtime_config_v1814();
end; $$;

create or replace function public.admin_update_portal_link_v1814(
 p_portal_key text,p_enabled boolean default null,p_bidirectional boolean default null,p_sort_order integer default null
) returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare v_uid uuid:=auth.uid();
begin
 if not public.is_game_admin_v1763(v_uid) then raise exception 'Acesso administrativo negado.'; end if;
 update public.game_portal_links_v1814 set
  enabled=case when p_enabled is null then enabled else p_enabled end,
  bidirectional=case when p_bidirectional is null then bidirectional else p_bidirectional end,
  sort_order=case when p_sort_order is null then sort_order else greatest(0,least(9999,p_sort_order)) end,
  updated_at=now()
 where portal_key=p_portal_key;
 if not found then raise exception 'Portal não encontrado.'; end if;
 return public.get_world_runtime_config_v1814();
end; $$;

create or replace function public.admin_update_map_resource_pool_v1816(
  p_map_id text,p_resource_key text,p_weight numeric default null,p_enabled boolean default null
) returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare v_uid uuid:=auth.uid();
begin
  if not public.is_game_admin_v1763(v_uid) then raise exception 'Acesso administrativo negado.'; end if;
  if not exists(select 1 from public.game_map_config_v1814 where map_id=p_map_id) then raise exception 'Mapa não encontrado.'; end if;
  if not exists(select 1 from public.game_resource_config_v1814 where resource_key=p_resource_key) then raise exception 'Recurso não encontrado.'; end if;
  insert into public.game_map_resource_pool_v1814(map_id,resource_key,weight,enabled,updated_at)
  values(trim(p_map_id),trim(p_resource_key),case when p_weight is null then 1 else greatest(.01,least(1000,p_weight)) end,coalesce(p_enabled,true),now())
  on conflict(map_id,resource_key) do update
  set weight=case when p_weight is null then public.game_map_resource_pool_v1814.weight else greatest(.01,least(1000,p_weight)) end,
      enabled=case when p_enabled is null then public.game_map_resource_pool_v1814.enabled else p_enabled end,
      updated_at=now();
  return public.get_world_runtime_config_v1814();
end;
$$;
