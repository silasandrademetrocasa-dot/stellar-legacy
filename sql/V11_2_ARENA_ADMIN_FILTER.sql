-- Stellar Legacy V11.2 — Admin fora do ranking da Arena
-- Mantém o ADM jogável/testável na Arena, mas sem posição nem bônus por colocação.

create or replace function private.arena_reward_snapshot(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_rating integer := 1000;
  v_level integer := 1;
  v_rank integer := 0;
  v_admin boolean := false;
  v_league text; v_next_league text; v_next_rating integer;
  v_base_credits bigint; v_base_uridium bigint; v_base_xp bigint; v_base_repair integer;
  v_level_bonus integer; v_rank_bonus integer; v_total_bonus integer;
  v_credits bigint; v_uridium bigint; v_xp bigint; v_repair integer;
  v_claimed boolean := false; v_claimed_at timestamptz;
begin
  if p_user_id is null then raise exception 'Usuário não autenticado.'; end if;

  select exists(
    select 1 from public.game_admins ga
    where ga.user_id=p_user_id and lower(coalesce(ga.role,''))='admin'
  ) into v_admin;

  select coalesce(s.rating,1000) into v_rating from public.arena_stats s where s.user_id=p_user_id;
  v_rating:=coalesce(v_rating,1000);
  select coalesce(p.level,1) into v_level from public.profiles p where p.id=p_user_id;
  v_level:=greatest(1,least(44,coalesce(v_level,1)));

  if not v_admin then
    select ranked.pos into v_rank
    from (
      select s.user_id,row_number() over(order by s.rating desc,s.wins desc,s.losses asc,s.battles desc,s.user_id)::integer pos
      from public.arena_stats s
      where not exists (
        select 1 from public.game_admins ga
        where ga.user_id=s.user_id and lower(coalesce(ga.role,''))='admin'
      )
    ) ranked where ranked.user_id=p_user_id;

    if v_rank is null then
      select count(*)::integer+1 into v_rank
      from public.arena_stats s
      where not exists (
        select 1 from public.game_admins ga
        where ga.user_id=s.user_id and lower(coalesce(ga.role,''))='admin'
      );
    end if;
  else
    v_rank:=0;
  end if;

  if v_rating < 1000 then
    v_league:='CADETE';v_next_league:='BRONZE';v_next_rating:=1000;v_base_credits:=25000;v_base_uridium:=250;v_base_xp:=1000;v_base_repair:=0;
  elsif v_rating < 1200 then
    v_league:='BRONZE';v_next_league:='PRATA';v_next_rating:=1200;v_base_credits:=50000;v_base_uridium:=500;v_base_xp:=2000;v_base_repair:=1;
  elsif v_rating < 1400 then
    v_league:='PRATA';v_next_league:='OURO';v_next_rating:=1400;v_base_credits:=100000;v_base_uridium:=1000;v_base_xp:=4000;v_base_repair:=1;
  elsif v_rating < 1600 then
    v_league:='OURO';v_next_league:='PLATINA';v_next_rating:=1600;v_base_credits:=200000;v_base_uridium:=2000;v_base_xp:=8000;v_base_repair:=2;
  elsif v_rating < 1800 then
    v_league:='PLATINA';v_next_league:='DIAMANTE';v_next_rating:=1800;v_base_credits:=400000;v_base_uridium:=4000;v_base_xp:=15000;v_base_repair:=2;
  elsif v_rating < 2100 then
    v_league:='DIAMANTE';v_next_league:='LENDA';v_next_rating:=2100;v_base_credits:=750000;v_base_uridium:=7500;v_base_xp:=25000;v_base_repair:=3;
  else
    v_league:='LENDA';v_next_league:=null;v_next_rating:=null;v_base_credits:=1250000;v_base_uridium:=12500;v_base_xp:=40000;v_base_repair:=5;
  end if;

  v_level_bonus:=least(20,floor(v_level/10.0)::integer*5);
  v_rank_bonus:=case when v_admin then 0 when v_rank=1 then 50 when v_rank=2 then 35 when v_rank=3 then 25 when v_rank between 4 and 10 then 15 when v_rank between 11 and 25 then 5 else 0 end;
  v_total_bonus:=v_level_bonus+v_rank_bonus;
  v_credits:=round(v_base_credits*(100+v_total_bonus)/100.0)::bigint;
  v_uridium:=round(v_base_uridium*(100+v_total_bonus)/100.0)::bigint;
  v_xp:=round(v_base_xp*(100+v_total_bonus)/100.0)::bigint;
  v_repair:=v_base_repair+case when v_admin then 0 when v_rank=1 then 2 when v_rank in (2,3) then 1 else 0 end;

  select true,r.claimed_at into v_claimed,v_claimed_at
  from public.arena_daily_rewards r
  where r.user_id=p_user_id and r.reward_date=v_today;

  return jsonb_build_object(
    'reward_date',v_today,'rating',v_rating,'rank_position',v_rank,'is_admin',v_admin,
    'league',v_league,'next_league',v_next_league,'next_rating',v_next_rating,
    'points_to_next',case when v_next_rating is null then 0 else greatest(0,v_next_rating-v_rating) end,
    'player_level',v_level,'level_bonus_percent',v_level_bonus,'rank_bonus_percent',v_rank_bonus,'total_bonus_percent',v_total_bonus,
    'credits',v_credits,'uridium',v_uridium,'xp',v_xp,'repair_bonus',v_repair,
    'claimed_today',coalesce(v_claimed,false),'claimable',not coalesce(v_claimed,false),'claimed_at',v_claimed_at,
    'next_claim_at',(((v_today+1)::timestamp) at time zone 'America/Sao_Paulo')
  );
end;
$$;
