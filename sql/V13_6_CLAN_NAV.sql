-- Stellar Legacy V13.6.0
-- Evolução de clã: XP + Cofre + Missão NPC (quantidade de membros não é requisito)

create or replace function public.clan_requirement_v12(p_current_level integer)
returns jsonb language sql immutable as $$
  select case greatest(1,least(10,coalesce(p_current_level,1)))
    when 1 then jsonb_build_object('next_level',2,'xp',20000,'credits',5000000,'mission',jsonb_build_object('streuner',100))
    when 2 then jsonb_build_object('next_level',3,'xp',60000,'credits',15000000,'mission',jsonb_build_object('lordakia',150))
    when 3 then jsonb_build_object('next_level',4,'xp',160000,'credits',40000000,'mission',jsonb_build_object('saimon',200))
    when 4 then jsonb_build_object('next_level',5,'xp',400000,'credits',100000000,'mission',jsonb_build_object('mordon',150))
    when 5 then jsonb_build_object('next_level',6,'xp',1120000,'credits',250000000,'mission',jsonb_build_object('devolarium',100))
    when 6 then jsonb_build_object('next_level',7,'xp',2880000,'credits',600000000,'mission',jsonb_build_object('sibelon',100))
    when 7 then jsonb_build_object('next_level',8,'xp',7680000,'credits',1200000000,'mission',jsonb_build_object('boss_mordon',50,'boss_devolarium',50))
    when 8 then jsonb_build_object('next_level',9,'xp',20480000,'credits',2500000000,'mission',jsonb_build_object('boss_sibelon',100))
    when 9 then jsonb_build_object('next_level',10,'xp',51200000,'credits',5000000000,'mission',jsonb_build_object('boss_any',300))
    else jsonb_build_object('next_level',null,'xp',0,'credits',0,'mission','{}'::jsonb)
  end;
$$;

create or replace function public.clan_level_status_v12(p_clan_id uuid)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare
  v_clan public.clans%rowtype; v_req jsonb; v_xp bigint:=0; v_members integer:=0; v_mission jsonb:='{}'::jsonb;
  v_ok boolean:=true; k text; target bigint; current bigint;
begin
  select * into v_clan from public.clans where id=p_clan_id;
  if not found then return null; end if;
  v_req:=public.clan_requirement_v12(v_clan.level);
  select coalesce(sum(coalesce(p.xp,0)),0)::bigint,count(*)::integer into v_xp,v_members
  from public.clan_members cm join public.profiles p on p.id=cm.user_id where cm.clan_id=p_clan_id;
  for k,target in select key,(value::text)::bigint from jsonb_each(v_req->'mission') loop
    current:=coalesce((v_clan.mission_kills->>k)::bigint,0);
    v_mission:=v_mission||jsonb_build_object(k,jsonb_build_object('current',current,'target',target,'done',current>=target));
    if current<target then v_ok:=false; end if;
  end loop;
  if v_clan.level>=10 then v_ok:=false; end if;
  if v_xp<coalesce((v_req->>'xp')::bigint,0) then v_ok:=false; end if;
  if v_clan.vault_credits<coalesce((v_req->>'credits')::bigint,0) then v_ok:=false; end if;
  return jsonb_build_object(
    'level',v_clan.level,
    'interest_rate',public.clan_interest_rate_v12(v_clan.level),
    'member_xp',v_xp,
    'members',v_members,
    'vault_credits',v_clan.vault_credits,
    'requirements',v_req,
    'mission_progress',v_mission,
    'ready',v_ok
  );
end;$$;
