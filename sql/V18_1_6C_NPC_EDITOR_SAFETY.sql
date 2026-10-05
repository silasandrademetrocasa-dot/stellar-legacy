-- Stellar Legacy V18.1.6C — segurança dos campos opcionais do editor de NPCs.
-- Mantém o valor existente quando um parâmetro opcional chega NULL.
create or replace function public.admin_update_npc_v1811(
  p_npc_key text,
  p_name text default null,
  p_hp bigint default null,
  p_shield bigint default null,
  p_credits bigint default null,
  p_stl bigint default null,
  p_xp bigint default null,
  p_speed numeric default null,
  p_damage bigint default null,
  p_color text default null,
  p_size numeric default null,
  p_resources jsonb default null,
  p_respawn_min_ms integer default null,
  p_respawn_max_ms integer default null,
  p_enabled boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare v_uid uuid:=auth.uid();
begin
  if not public.is_game_admin_v1763(v_uid) then raise exception 'Acesso administrativo negado.'; end if;
  update public.game_npc_config_v1811
  set name=case when p_name is null or trim(p_name)='' then name else trim(p_name) end,
      hp=case when p_hp is null then hp else greatest(1,p_hp) end,
      shield=case when p_shield is null then shield else greatest(0,p_shield) end,
      credits=case when p_credits is null then credits else greatest(0,p_credits) end,
      stl=case when p_stl is null then stl else greatest(0,p_stl) end,
      xp=case when p_xp is null then xp else greatest(0,p_xp) end,
      speed=case when p_speed is null then speed else greatest(1,least(1000,p_speed)) end,
      damage=case when p_damage is null then damage else greatest(0,p_damage) end,
      color=case when p_color is null or trim(p_color)='' then color else trim(p_color) end,
      size=case when p_size is null then size else greatest(4,least(250,p_size)) end,
      resources=case when p_resources is null then resources else p_resources end,
      respawn_min_ms=case when p_respawn_min_ms is null then respawn_min_ms else greatest(1000,least(600000,p_respawn_min_ms)) end,
      respawn_max_ms=case when p_respawn_max_ms is null then respawn_max_ms else greatest(1000,least(600000,p_respawn_max_ms)) end,
      enabled=case when p_enabled is null then enabled else p_enabled end,
      updated_at=now()
  where npc_key=p_npc_key;
  if not found then raise exception 'NPC não encontrado.'; end if;
  if exists(select 1 from public.game_npc_config_v1811 where npc_key=p_npc_key and respawn_max_ms<respawn_min_ms) then
    raise exception 'Respawn máximo deve ser maior ou igual ao mínimo.';
  end if;
  return public.get_npc_runtime_config_v1811();
end;
$$;
