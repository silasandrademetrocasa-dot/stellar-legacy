-- V10.10 — Daily Arena Rewards
-- Applied to Supabase project stellar-legacy on 2026-10-01.
-- One claim per player per Sao Paulo calendar day.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.arena_daily_rewards (
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_date date not null,
  rating integer not null,
  rank_position integer not null,
  league text not null,
  player_level integer not null,
  level_bonus_percent integer not null default 0,
  rank_bonus_percent integer not null default 0,
  total_bonus_percent integer not null default 0,
  credits bigint not null default 0,
  uridium bigint not null default 0,
  xp bigint not null default 0,
  repair_bonus integer not null default 0,
  claimed_at timestamptz not null default now(),
  primary key (user_id, reward_date)
);

alter table public.arena_daily_rewards enable row level security;
drop policy if exists "read own arena daily rewards" on public.arena_daily_rewards;
create policy "read own arena daily rewards"
on public.arena_daily_rewards
for select to authenticated
using ((select auth.uid()) = user_id);

revoke insert, update, delete on public.arena_daily_rewards from anon, authenticated;
grant select on public.arena_daily_rewards to authenticated;

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
  v_rank integer := 1;
  v_league text;
  v_next_league text;
  v_next_rating integer;
  v_base_credits bigint;
  v_base_uridium bigint;
  v_base_xp bigint;
  v_base_repair integer;
  v_level_bonus integer;
  v_rank_bonus integer;
  v_total_bonus integer;
  v_credits bigint;
  v_uridium bigint;
  v_xp bigint;
  v_repair integer;
  v_claimed boolean := false;
  v_claimed_at timestamptz;
begin
  if p_user_id is null then raise exception 'Usuário não autenticado.'; end if;

  select coalesce(s.rating, 1000) into v_rating
  from public.arena_stats s where s.user_id = p_user_id;
  v_rating := coalesce(v_rating, 1000);

  select coalesce(p.level, 1) into v_level
  from public.profiles p where p.id = p_user_id;
  v_level := greatest(1, least(44, coalesce(v_level, 1)));

  select ranked.pos into v_rank
  from (
    select s.user_id,
      row_number() over (order by s.rating desc, s.wins desc, s.losses asc, s.battles desc, s.user_id)::integer as pos
    from public.arena_stats s
  ) ranked
  where ranked.user_id = p_user_id;
  if v_rank is null then select count(*)::integer + 1 into v_rank from public.arena_stats; end if;

  if v_rating < 1000 then
    v_league := 'CADETE'; v_next_league := 'BRONZE'; v_next_rating := 1000;
    v_base_credits := 25000; v_base_uridium := 250; v_base_xp := 1000; v_base_repair := 0;
  elsif v_rating < 1200 then
    v_league := 'BRONZE'; v_next_league := 'PRATA'; v_next_rating := 1200;
    v_base_credits := 50000; v_base_uridium := 500; v_base_xp := 2000; v_base_repair := 1;
  elsif v_rating < 1400 then
    v_league := 'PRATA'; v_next_league := 'OURO'; v_next_rating := 1400;
    v_base_credits := 100000; v_base_uridium := 1000; v_base_xp := 4000; v_base_repair := 1;
  elsif v_rating < 1600 then
    v_league := 'OURO'; v_next_league := 'PLATINA'; v_next_rating := 1600;
    v_base_credits := 200000; v_base_uridium := 2000; v_base_xp := 8000; v_base_repair := 2;
  elsif v_rating < 1800 then
    v_league := 'PLATINA'; v_next_league := 'DIAMANTE'; v_next_rating := 1800;
    v_base_credits := 400000; v_base_uridium := 4000; v_base_xp := 15000; v_base_repair := 2;
  elsif v_rating < 2100 then
    v_league := 'DIAMANTE'; v_next_league := 'LENDA'; v_next_rating := 2100;
    v_base_credits := 750000; v_base_uridium := 7500; v_base_xp := 25000; v_base_repair := 3;
  else
    v_league := 'LENDA'; v_next_league := null; v_next_rating := null;
    v_base_credits := 1250000; v_base_uridium := 12500; v_base_xp := 40000; v_base_repair := 5;
  end if;

  v_level_bonus := least(20, floor(v_level / 10.0)::integer * 5);
  v_rank_bonus := case
    when v_rank = 1 then 50
    when v_rank = 2 then 35
    when v_rank = 3 then 25
    when v_rank between 4 and 10 then 15
    when v_rank between 11 and 25 then 5
    else 0 end;
  v_total_bonus := v_level_bonus + v_rank_bonus;

  v_credits := round(v_base_credits * (100 + v_total_bonus) / 100.0)::bigint;
  v_uridium := round(v_base_uridium * (100 + v_total_bonus) / 100.0)::bigint;
  v_xp := round(v_base_xp * (100 + v_total_bonus) / 100.0)::bigint;
  v_repair := v_base_repair + case when v_rank = 1 then 2 when v_rank in (2,3) then 1 else 0 end;

  select true, r.claimed_at into v_claimed, v_claimed_at
  from public.arena_daily_rewards r
  where r.user_id = p_user_id and r.reward_date = v_today;

  return jsonb_build_object(
    'reward_date', v_today, 'rating', v_rating, 'rank_position', v_rank,
    'league', v_league, 'next_league', v_next_league, 'next_rating', v_next_rating,
    'points_to_next', case when v_next_rating is null then 0 else greatest(0, v_next_rating - v_rating) end,
    'player_level', v_level, 'level_bonus_percent', v_level_bonus,
    'rank_bonus_percent', v_rank_bonus, 'total_bonus_percent', v_total_bonus,
    'credits', v_credits, 'uridium', v_uridium, 'xp', v_xp, 'repair_bonus', v_repair,
    'claimed_today', coalesce(v_claimed, false), 'claimable', not coalesce(v_claimed, false),
    'claimed_at', v_claimed_at,
    'next_claim_at', (((v_today + 1)::timestamp) at time zone 'America/Sao_Paulo')
  );
end;
$$;
revoke all on function private.arena_reward_snapshot(uuid) from public, anon, authenticated;

create or replace function public.get_arena_daily_reward_status()
returns jsonb
language plpgsql
security definer
set search_path = public, auth, private, pg_temp
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Usuário não autenticado.'; end if;
  return private.arena_reward_snapshot(v_uid);
end;
$$;
revoke all on function public.get_arena_daily_reward_status() from public, anon;
grant execute on function public.get_arena_daily_reward_status() to authenticated;

create or replace function public.claim_arena_daily_reward()
returns jsonb
language plpgsql
security definer
set search_path = public, auth, private, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_snapshot jsonb;
  v_state jsonb;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_inserted integer := 0;
  v_credits bigint; v_uridium bigint; v_xp bigint; v_repair integer;
  v_old_credits bigint; v_old_uridium bigint; v_old_xp bigint; v_old_repair integer; v_old_level integer;
  v_new_xp bigint; v_new_level integer := 1; v_i integer; v_threshold bigint;
  v_callsign text; v_faction text;
begin
  if v_uid is null then raise exception 'Usuário não autenticado.'; end if;
  v_snapshot := private.arena_reward_snapshot(v_uid);
  if coalesce((v_snapshot->>'claimed_today')::boolean, false) then
    return v_snapshot || jsonb_build_object('claim_applied', false, 'already_claimed', true);
  end if;

  select gs.state into v_state from public.game_saves gs where gs.user_id = v_uid for update;
  if v_state is null then
    raise exception 'Save online não encontrado. Entre no jogo e salve o progresso antes de resgatar.';
  end if;

  v_credits := (v_snapshot->>'credits')::bigint;
  v_uridium := (v_snapshot->>'uridium')::bigint;
  v_xp := (v_snapshot->>'xp')::bigint;
  v_repair := (v_snapshot->>'repair_bonus')::integer;

  insert into public.arena_daily_rewards (
    user_id, reward_date, rating, rank_position, league, player_level,
    level_bonus_percent, rank_bonus_percent, total_bonus_percent,
    credits, uridium, xp, repair_bonus
  ) values (
    v_uid, v_today, (v_snapshot->>'rating')::integer, (v_snapshot->>'rank_position')::integer,
    v_snapshot->>'league', (v_snapshot->>'player_level')::integer,
    (v_snapshot->>'level_bonus_percent')::integer, (v_snapshot->>'rank_bonus_percent')::integer,
    (v_snapshot->>'total_bonus_percent')::integer, v_credits, v_uridium, v_xp, v_repair
  ) on conflict (user_id, reward_date) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    return private.arena_reward_snapshot(v_uid) || jsonb_build_object('claim_applied', false, 'already_claimed', true);
  end if;

  v_state := coalesce(v_state, '{}'::jsonb);
  v_state := jsonb_set(v_state, '{profile}', case when jsonb_typeof(v_state->'profile')='object' then v_state->'profile' else '{}'::jsonb end, true);
  v_state := jsonb_set(v_state, '{galaxyGate}', case when jsonb_typeof(v_state->'galaxyGate')='object' then v_state->'galaxyGate' else '{}'::jsonb end, true);

  v_old_credits := coalesce(nullif(v_state #>> '{profile,credits}', '')::bigint, 0);
  v_old_uridium := coalesce(nullif(v_state #>> '{profile,uridium}', '')::bigint, 0);
  v_old_xp := coalesce(nullif(v_state #>> '{profile,xp}', '')::bigint, 0);
  v_old_repair := coalesce(nullif(v_state #>> '{galaxyGate,repairBonus}', '')::integer, 0);
  v_old_level := greatest(1, least(44, coalesce(nullif(v_state #>> '{profile,level}', '')::integer, 1)));
  v_new_xp := v_old_xp + v_xp;

  v_new_level := 1;
  for v_i in 2..44 loop
    v_threshold := round(10000 * power(2::numeric, v_i - 2))::bigint;
    exit when v_new_xp < v_threshold;
    v_new_level := v_i;
  end loop;

  v_state := jsonb_set(v_state, '{profile,credits}', to_jsonb(v_old_credits + v_credits), true);
  v_state := jsonb_set(v_state, '{profile,uridium}', to_jsonb(v_old_uridium + v_uridium), true);
  v_state := jsonb_set(v_state, '{profile,xp}', to_jsonb(v_new_xp), true);
  v_state := jsonb_set(v_state, '{profile,level}', to_jsonb(v_new_level), true);
  v_state := jsonb_set(v_state, '{profile,xpModelV101}', 'true'::jsonb, true);
  v_state := jsonb_set(v_state, '{galaxyGate,repairBonus}', to_jsonb(v_old_repair + v_repair), true);

  update public.game_saves set state=v_state, updated_at=now() where user_id=v_uid;

  v_callsign := coalesce(nullif(v_state #>> '{profile,callsign}', ''), 'Pilot');
  v_faction := nullif(v_state #>> '{profile,faction}', '');
  update public.profiles
  set callsign=v_callsign, faction=coalesce(v_faction,faction), level=v_new_level, xp=v_new_xp,
      credits=v_old_credits+v_credits, uridium=v_old_uridium+v_uridium, updated_at=now()
  where id=v_uid;
  if not found then
    insert into public.profiles (id,callsign,faction,level,xp,credits,uridium,updated_at)
    values (v_uid,v_callsign,v_faction,v_new_level,v_new_xp,v_old_credits+v_credits,v_old_uridium+v_uridium,now());
  end if;

  return private.arena_reward_snapshot(v_uid) || jsonb_build_object(
    'claim_applied', true, 'already_claimed', false,
    'level_before', v_old_level, 'level_after', v_new_level,
    'new_credits', v_old_credits+v_credits, 'new_uridium', v_old_uridium+v_uridium,
    'new_xp', v_new_xp, 'new_repair_bonus', v_old_repair+v_repair
  );
end;
$$;
revoke all on function public.claim_arena_daily_reward() from public, anon;
grant execute on function public.claim_arena_daily_reward() to authenticated;
