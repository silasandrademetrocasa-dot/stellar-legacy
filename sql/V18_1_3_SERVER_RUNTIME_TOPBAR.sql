-- Stellar Legacy V18.1.3 — Server Runtime Topbar Cache
-- Aplicada no Supabase: snapshot público de configuração para o Render materializar em JSON temporário.

create or replace function public.get_game_runtime_public_v1813()
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_version bigint:=1;
  v_updated timestamptz;
  v_modules jsonb;
  v_flags jsonb;
begin
  select version,updated_at into v_version,v_updated
  from public.game_runtime_meta_v1810
  where config_key='core';

  select coalesce(jsonb_agg(row_to_json(m) order by m.parent_sort,m.sort_order,m.module_key),'[]'::jsonb)
  into v_modules
  from (
    select u.module_key,u.parent_key,u.label,u.sort_order,u.min_level,u.enabled,
           u.hide_until_level,u.admin_only,u.config,
           coalesce(p.sort_order,u.sort_order) parent_sort
    from public.game_ui_modules_v1810 u
    left join public.game_ui_modules_v1810 p on p.module_key=u.parent_key
    order by coalesce(p.sort_order,u.sort_order),u.sort_order,u.module_key
  ) m;

  select coalesce(jsonb_agg(row_to_json(f) order by f.flag_key),'[]'::jsonb)
  into v_flags
  from (
    select flag_key,enabled,description,config
    from public.game_feature_flags_v1810
    order by flag_key
  ) f;

  return jsonb_build_object(
    'version',coalesce(v_version,1),
    'updated_at',v_updated,
    'modules',coalesce(v_modules,'[]'::jsonb),
    'flags',coalesce(v_flags,'[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_game_runtime_public_v1813() from public;
grant execute on function public.get_game_runtime_public_v1813() to anon,authenticated,service_role;
