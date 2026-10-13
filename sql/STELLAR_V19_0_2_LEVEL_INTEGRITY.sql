-- V19.0.2 supplementary migration: level gate validates XP under current V19 curve,
-- not just the level number previously corrupted by Arena rewards.
create or replace function public.clan_check_entry_level_v19(p_uid uuid)
returns void language plpgsql stable security definer set search_path=public,pg_temp as $fn$
declare
  v_req integer:=public.clan_required_level_v19();
  v_level integer;
  v_saved_level integer;
  v_xp bigint;
  v_saved_xp bigint;
  v_calc_level integer:=1;
  v_i integer;
  v_threshold bigint;
begin
  select p.level,p.xp,
    coalesce(nullif(s.state #>> '{profile,level}','')::integer,p.level),
    coalesce(nullif(s.state #>> '{profile,xp}','')::bigint,p.xp)
    into v_level,v_xp,v_saved_level,v_saved_xp
    from public.profiles p left join public.game_saves s on s.user_id=p.id
    where p.id=p_uid;
  if v_level is null or v_saved_level is null then raise exception 'Perfil e save online são necessários para acessar alianças.'; end if;
  v_xp:=least(greatest(0,coalesce(v_xp,0)),greatest(0,coalesce(v_saved_xp,0)));
  for v_i in 2..44 loop
    v_threshold:=round((15000::double precision * power((v_i-1)::double precision,2.3::double precision) * power(1.20::double precision,greatest(0,v_i-2)::double precision))::numeric)::bigint;
    exit when v_xp < v_threshold;
    v_calc_level:=v_i;
  end loop;
  if least(v_level,v_saved_level,v_calc_level)<v_req then
    raise exception 'Aliança libera no nível % (conforme XP e save). Seu nível validado é %.',v_req,least(v_level,v_saved_level,v_calc_level);
  end if;
  if not coalesce((select enabled from public.game_ui_modules_v1810 where module_key='clan'),true) then
    raise exception 'Alianças temporariamente indisponíveis.';
  end if;
end;$fn$;
revoke all on function public.clan_check_entry_level_v19(uuid) from PUBLIC,anon,authenticated;
