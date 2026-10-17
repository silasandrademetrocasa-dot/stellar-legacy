-- STELLAR LEGACY — restaurar titulo comum quando o piloto optar por ele.
-- Complemento não destrutivo ao esquema de temporadas.
begin;
create or replace function public.stellar_unequip_elite_title()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 delete from public.stellar_elite_selected_titles where user_id=v_uid;
 return jsonb_build_object('ok',true,'title',null);
end;$$;
revoke all on function public.stellar_unequip_elite_title() from public,anon;
grant execute on function public.stellar_unequip_elite_title() to authenticated;
commit;
