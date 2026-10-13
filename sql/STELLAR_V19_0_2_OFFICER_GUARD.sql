-- V19.0.2: nivel para cargos elevados e para movimentar o cofre.
-- Mantem cargos anteriores intactos. Impede que membros nivel <8 recebam privilegios.
do $m$
declare v_src text;
begin
  v_src:=pg_get_functiondef('public.set_clan_member_role_v19(uuid,text)'::regprocedure);
  if position('  update public.clan_members set role=v_new where user_id=p_target_user_id and clan_id=v_clan;' in v_src)=0 then
    raise exception 'Cargos: assinatura mudou, abortando sem mexer.';
  end if;
  v_src:=replace(v_src,'  update public.clan_members set role=v_new where user_id=p_target_user_id and clan_id=v_clan;',
    '  if v_new in (''deputy'',''elite'') then perform public.clan_check_entry_level_v19(p_target_user_id); end if;'||chr(10)||
    '  update public.clan_members set role=v_new where user_id=p_target_user_id and clan_id=v_clan;');
  execute v_src;
  v_src:=pg_get_functiondef('public.transfer_clan_credits_v12(text,bigint)'::regprocedure);
  if position(' if v_role not in(''owner'',''deputy'') then' in v_src)=0 then
    raise exception 'Cofre: assinatura mudou, abortando sem mexer.';
  end if;
  v_src:=replace(v_src,
    ' if v_role not in(''owner'',''deputy'') then',
    '  perform public.clan_check_entry_level_v19(v_uid);'||chr(10)||' if v_role not in(''owner'',''deputy'') then');
  execute v_src;
end;$m$;
