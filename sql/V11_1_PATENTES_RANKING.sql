-- Stellar Legacy V11.1 — Patentes & Ranking
-- Compatível com o schema atual do projeto e já aplicado/testado no Supabase stellar-legacy.

insert into public.game_admins (user_id, role, unlimited_arena, unlimited_jump, unlimited_repair, updated_at)
select p.id, 'admin', true, true, true, now()
from public.profiles p
where upper(coalesce(p.callsign, '')) in ('FELP22', 'FELP22[ADM]')
on conflict (user_id) do update
set role = 'admin',
    unlimited_arena = true,
    unlimited_jump = true,
    unlimited_repair = true,
    updated_at = now();

create or replace function public.ship_rank_value(p_ship_id text)
returns integer
language sql
immutable
set search_path = pg_catalog
as $$
  select case lower(coalesce(p_ship_id, 'phoenix'))
    when 'phoenix' then 3
    when 'yamato' then 6
    when 'leonov' then 12
    when 'defcom' then 18
    when 'liberator' then 24
    when 'piranha' then 30
    when 'nostromo' then 36
    when 'bigboy' then 44
    when 'vengeance' then 49
    when 'goliath' then 65
    when 'goliathx' then 68
    when 'goliath-x' then 68
    when 'diminisher' then 69
    when 'sentinel' then 69
    when 'spectrum' then 69
    when 'venom' then 69
    when 'solace' then 70
    when 'pusat' then 70
    when 'aegis' then 71
    when 'citadel' then 71
    when 'spearhead' then 71
    when 'cyborg' then 72
    when 'orcus' then 72
    when 'centurion' then 73
    when 'hammerclaw' then 73
    when 'hecate' then 73
    when 'hyperion' then 74
    when 'keres' then 74
    when 'mimesis' then 74
    when 'solaris' then 74
    when 'tempest' then 74
    when 'tartarus' then 75
    when 'berserker' then 75
    when 'basilisk' then 75
    when 'disruptor' then 75
    when 'paladin' then 75
    when 'retiarus' then 75
    when 'zephyr' then 75
    when 'nambassador' then 62
    when 'nenvoy' then 58
    when 'ndiplomat' then 52
    else 55
  end;
$$;

drop function if exists public.get_public_rankings();

create function public.get_public_rankings()
returns table (
  id uuid,
  callsign text,
  faction text,
  level integer,
  xp bigint,
  aliens_killed bigint,
  gg_completed bigint,
  ship_id text,
  missions_completed integer,
  honor numeric,
  arena_rating integer,
  arena_wins integer,
  arena_losses integer,
  rank_points bigint,
  rank_code text,
  rank_title text,
  rank_position integer,
  total_players integer,
  is_admin boolean,
  negative_honor boolean
)
language sql
security definer
set search_path = public, auth
as $$
with pilots as (
  select
    p.id,
    coalesce(nullif(p.callsign, ''), split_part(u.email, '@', 1), 'Pilot') as callsign,
    p.faction,
    greatest(coalesce(p.level, 1), 1)::integer as level,
    greatest(coalesce(p.xp, 0), 0)::bigint as xp,
    greatest(coalesce(p.aliens_killed, 0), 0)::bigint as aliens_killed,
    greatest(coalesce(p.gg_completed, 0), 0)::bigint as gg_completed,
    coalesce(gs.state, '{}'::jsonb) as state,
    greatest(coalesce(ast.rating, 1000), 0)::integer as arena_rating,
    greatest(coalesce(ast.wins, 0), 0)::integer as arena_wins,
    greatest(coalesce(ast.losses, 0), 0)::integer as arena_losses,
    exists(
      select 1
      from public.game_admins ga
      where ga.user_id = p.id
        and lower(coalesce(ga.role, '')) = 'admin'
    ) as is_admin,
    coalesce(u.created_at, now()) as registered_at,
    p.updated_at
  from public.profiles p
  left join auth.users u on u.id = p.id
  left join public.game_saves gs on gs.user_id = p.id
  left join public.arena_stats ast on ast.user_id = p.id
),
base as (
  select
    pilots.*,
    coalesce(nullif(pilots.state->>'activeShipId', ''), 'phoenix') as ship_id,
    case
      when jsonb_typeof(pilots.state->'missions'->'completed') = 'object'
        then (select count(*)::integer from jsonb_object_keys(pilots.state->'missions'->'completed'))
      else 0
    end::integer as missions_completed,
    coalesce(nullif(pilots.state->'profile'->>'honor', '')::numeric, 0) as honor,
    greatest(coalesce(nullif(pilots.state->'profileStats'->>'friendlyKills', '')::integer, 0), 0) as friendly_kills,
    greatest(coalesce(nullif(pilots.state->'profileStats'->>'enemyDeaths', '')::integer, 0), 0) as enemy_deaths,
    greatest(coalesce(nullif(pilots.state->'profileStats'->>'radiationDeaths', '')::integer, 0), 0) as radiation_deaths,
    greatest(coalesce(nullif(pilots.state->'profileStats'->>'phoenixDeaths', '')::integer, 0), 0) as phoenix_deaths,
    greatest((current_date - (pilots.registered_at at time zone 'UTC')::date), 0) as registered_days,
    coalesce(nullif(pilots.state->'profileStats'->>'negativeHonor', '')::integer, 0) as negative_honor_flag
  from pilots
),
scored as (
  select
    b.*,
    greatest((
      floor(coalesce(b.xp, 0)::numeric / 100000)
      + floor(greatest(coalesce(b.honor, 0), 0) / 100)
      + (coalesce(b.arena_wins, 0) * 3)
      + (coalesce(b.level, 1) * 100)
      + (coalesce(b.registered_days, 0) * 6)
      + public.ship_rank_value(b.ship_id)
      + floor(coalesce(b.aliens_killed, 0)::numeric / 2)
      + (coalesce(b.missions_completed, 0) * 100)
      - (coalesce(b.friendly_kills, 0) * 100)
      - (coalesce(b.enemy_deaths, 0) * 4)
      - (coalesce(b.radiation_deaths, 0) * 8)
      - (coalesce(b.phoenix_deaths, 0) * 2)
    )::bigint, 0) as rank_points,
    (
      coalesce(b.honor, 0) < 0
      or coalesce(b.friendly_kills, 0) >= 10
      or coalesce(b.negative_honor_flag, 0) > 0
    ) as negative_honor
  from base b
),
eligible as (
  select *
  from scored
  where not is_admin
    and not negative_honor
    and level >= 2
    and registered_days >= 1
),
ranked_eligible as (
  select
    e.id,
    row_number() over (order by e.rank_points desc, e.xp desc, e.updated_at desc nulls last, e.id) as regular_position,
    count(*) over () as total_regular
  from eligible e
),
leaderboard as (
  select
    s.*,
    row_number() over (order by s.is_admin desc, s.rank_points desc, s.xp desc, s.updated_at desc nulls last, s.id) as rank_position,
    count(*) over () as total_players,
    re.regular_position,
    re.total_regular
  from scored s
  left join ranked_eligible re on re.id = s.id
)
select
  l.id,
  l.callsign,
  l.faction,
  l.level,
  l.xp,
  l.aliens_killed,
  l.gg_completed,
  l.ship_id,
  l.missions_completed,
  l.honor,
  l.arena_rating,
  l.arena_wins,
  l.arena_losses,
  l.rank_points,
  case
    when l.is_admin then 'admin'
    when l.negative_honor then 'negative_honor'
    when l.regular_position = 1 then 'general'
    when l.regular_position <= 4 then 'general_basic'
    when l.regular_position <= 9 then 'colonel_chief'
    when l.regular_position <= 29 then 'colonel'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular, 1), 1)) <= 0.01 then 'colonel_basic'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular, 1), 1)) <= 0.015 then 'major_chief'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular, 1), 1)) <= 0.02 then 'major'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular, 1), 1)) <= 0.025 then 'major_basic'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular, 1), 1)) <= 0.03 then 'captain_chief'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular, 1), 1)) <= 0.035 then 'captain'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular, 1), 1)) <= 0.04 then 'captain_basic'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular, 1), 1)) <= 0.045 then 'lieutenant_chief'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular, 1), 1)) <= 0.05 then 'lieutenant'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular, 1), 1)) <= 0.06 then 'lieutenant_basic'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular, 1), 1)) <= 0.07 then 'sergeant_chief'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular, 1), 1)) <= 0.08 then 'sergeant'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular, 1), 1)) <= 0.09 then 'sergeant_basic'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular, 1), 1)) <= 0.10 then 'pilot_chief'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular, 1), 1)) <= 0.129 then 'pilot'
    else 'pilot_basic'
  end as rank_code,
  case
    when l.is_admin then 'Administrador'
    when l.negative_honor then 'Honra Negativa'
    when l.regular_position = 1 then 'General'
    when l.regular_position <= 4 then 'General Básico'
    when l.regular_position <= 9 then 'Coronel Chefe'
    when l.regular_position <= 29 then 'Coronel'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular, 1), 1)) <= 0.01 then 'Coronel Básico'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular, 1), 1)) <= 0.015 then 'Major Chefe'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular, 1), 1)) <= 0.02 then 'Major'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular, 1), 1)) <= 0.025 then 'Major Básico'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular, 1), 1)) <= 0.03 then 'Capitão Chefe'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular, 1), 1)) <= 0.035 then 'Capitão'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular, 1), 1)) <= 0.04 then 'Capitão Básico'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular, 1), 1)) <= 0.045 then 'Tenente Chefe'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular, 1), 1)) <= 0.05 then 'Tenente'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular, 1), 1)) <= 0.06 then 'Tenente Básico'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular, 1), 1)) <= 0.07 then 'Sargento Chefe'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular, 1), 1)) <= 0.08 then 'Sargento'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular, 1), 1)) <= 0.09 then 'Sargento Básico'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular, 1), 1)) <= 0.10 then 'Piloto Chefe'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular, 1), 1)) <= 0.129 then 'Piloto'
    else 'Piloto Básico'
  end as rank_title,
  l.rank_position::integer,
  l.total_players::integer,
  l.is_admin,
  l.negative_honor
from leaderboard l
order by l.is_admin desc, l.rank_points desc, l.xp desc, l.updated_at desc nulls last, l.id;
$$;

revoke all on function public.get_public_rankings() from public, anon;
grant execute on function public.get_public_rankings() to authenticated, service_role;
grant execute on function public.ship_rank_value(text) to authenticated, service_role;
