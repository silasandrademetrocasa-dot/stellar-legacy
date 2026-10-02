-- Stellar Legacy V11.2 — Clãs, cofre e nameplates de patente
-- 1) Administradores ficam totalmente fora do ranking público.
-- 2) Clãs possuem cofre com queima automática de 10% em cada doação.
-- 3) O líder pode transferir créditos do cofre para qualquer jogador por callsign.
-- 4) Transferências entram como crédito pendente e são resgatadas pelo destinatário,
--    evitando que um save aberto sobrescreva o saldo recebido.
-- 5) Presença online passa a expor patente + tag do clã para o nameplate do mapa.

create table if not exists public.clans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tag text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  vault_credits bigint not null default 0 check (vault_credits >= 0),
  total_donated bigint not null default 0 check (total_donated >= 0),
  total_burned bigint not null default 0 check (total_burned >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists clans_name_lower_uidx on public.clans (lower(name));
create unique index if not exists clans_tag_lower_uidx on public.clans (lower(tag));

create table if not exists public.clan_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  clan_id uuid not null references public.clans(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now()
);
create index if not exists clan_members_clan_idx on public.clan_members(clan_id);

create table if not exists public.clan_transactions (
  id bigserial primary key,
  clan_id uuid not null references public.clans(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('donation','transfer')),
  gross_amount bigint not null default 0,
  net_amount bigint not null default 0,
  burn_amount bigint not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists clan_transactions_clan_created_idx on public.clan_transactions(clan_id, created_at desc);

create table if not exists public.clan_credit_grants (
  id bigserial primary key,
  clan_id uuid not null references public.clans(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  amount bigint not null check (amount > 0),
  claimed boolean not null default false,
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);
create index if not exists clan_credit_grants_recipient_idx on public.clan_credit_grants(recipient_id, claimed, created_at);

alter table public.clans enable row level security;
alter table public.clan_members enable row level security;
alter table public.clan_transactions enable row level security;
alter table public.clan_credit_grants enable row level security;

revoke all on table public.clans from anon, authenticated;
revoke all on table public.clan_members from anon, authenticated;
revoke all on table public.clan_transactions from anon, authenticated;
revoke all on table public.clan_credit_grants from anon, authenticated;

-- Ranking V11.2: administradores deixam de participar completamente.
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
    coalesce(u.created_at, now()) as registered_at,
    p.updated_at
  from public.profiles p
  left join auth.users u on u.id = p.id
  left join public.game_saves gs on gs.user_id = p.id
  left join public.arena_stats ast on ast.user_id = p.id
  where not exists (
    select 1 from public.game_admins ga
    where ga.user_id = p.id and lower(coalesce(ga.role,'')) = 'admin'
  )
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
  select * from scored
  where not negative_honor and level >= 2 and registered_days >= 1
),
ranked_eligible as (
  select e.id,
         row_number() over (order by e.rank_points desc, e.xp desc, e.updated_at desc nulls last, e.id) as regular_position,
         count(*) over () as total_regular
  from eligible e
),
leaderboard as (
  select s.*,
         row_number() over (order by s.rank_points desc, s.xp desc, s.updated_at desc nulls last, s.id) as rank_position,
         count(*) over () as total_players,
         re.regular_position,
         re.total_regular
  from scored s
  left join ranked_eligible re on re.id = s.id
)
select
  l.id,l.callsign,l.faction,l.level,l.xp,l.aliens_killed,l.gg_completed,l.ship_id,l.missions_completed,l.honor,
  l.arena_rating,l.arena_wins,l.arena_losses,l.rank_points,
  case
    when l.negative_honor then 'negative_honor'
    when l.regular_position = 1 then 'general'
    when l.regular_position <= 4 then 'general_basic'
    when l.regular_position <= 9 then 'colonel_chief'
    when l.regular_position <= 29 then 'colonel'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular,1),1)) <= .01 then 'colonel_basic'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular,1),1)) <= .015 then 'major_chief'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular,1),1)) <= .02 then 'major'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular,1),1)) <= .025 then 'major_basic'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular,1),1)) <= .03 then 'captain_chief'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular,1),1)) <= .035 then 'captain'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular,1),1)) <= .04 then 'captain_basic'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular,1),1)) <= .045 then 'lieutenant_chief'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular,1),1)) <= .05 then 'lieutenant'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular,1),1)) <= .06 then 'lieutenant_basic'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular,1),1)) <= .07 then 'sergeant_chief'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular,1),1)) <= .08 then 'sergeant'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular,1),1)) <= .09 then 'sergeant_basic'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular,1),1)) <= .10 then 'pilot_chief'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular,1),1)) <= .129 then 'pilot'
    else 'pilot_basic'
  end as rank_code,
  case
    when l.negative_honor then 'Honra Negativa'
    when l.regular_position = 1 then 'General'
    when l.regular_position <= 4 then 'General Básico'
    when l.regular_position <= 9 then 'Coronel Chefe'
    when l.regular_position <= 29 then 'Coronel'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular,1),1)) <= .01 then 'Coronel Básico'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular,1),1)) <= .015 then 'Major Chefe'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular,1),1)) <= .02 then 'Major'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular,1),1)) <= .025 then 'Major Básico'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular,1),1)) <= .03 then 'Capitão Chefe'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular,1),1)) <= .035 then 'Capitão'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular,1),1)) <= .04 then 'Capitão Básico'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular,1),1)) <= .045 then 'Tenente Chefe'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular,1),1)) <= .05 then 'Tenente'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular,1),1)) <= .06 then 'Tenente Básico'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular,1),1)) <= .07 then 'Sargento Chefe'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular,1),1)) <= .08 then 'Sargento'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular,1),1)) <= .09 then 'Sargento Básico'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular,1),1)) <= .10 then 'Piloto Chefe'
    when (l.regular_position::numeric / greatest(coalesce(l.total_regular,1),1)) <= .129 then 'Piloto'
    else 'Piloto Básico'
  end as rank_title,
  l.rank_position::integer,l.total_players::integer,false as is_admin,l.negative_honor
from leaderboard l
order by l.rank_points desc,l.xp desc,l.updated_at desc nulls last,l.id;
$$;

create or replace function public.list_clans_v12()
returns table (id uuid, name text, tag text, member_count integer, created_at timestamptz)
language sql
security definer
set search_path = public, auth
as $$
  select c.id,c.name,c.tag,count(cm.user_id)::integer,c.created_at
  from public.clans c
  left join public.clan_members cm on cm.clan_id=c.id
  group by c.id,c.name,c.tag,c.created_at
  order by count(cm.user_id) desc,c.created_at asc;
$$;

create or replace function public.get_my_clan_v12()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_clan_id uuid;
  v_role text;
  v_clan jsonb;
  v_members jsonb := '[]'::jsonb;
  v_transactions jsonb := '[]'::jsonb;
  v_pending bigint := 0;
  v_admin boolean := false;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  select exists(select 1 from public.game_admins ga where ga.user_id=v_uid and lower(coalesce(ga.role,''))='admin') into v_admin;
  select cm.clan_id,cm.role into v_clan_id,v_role from public.clan_members cm where cm.user_id=v_uid;
  select coalesce(sum(g.amount),0) into v_pending from public.clan_credit_grants g where g.recipient_id=v_uid and not g.claimed;

  if v_clan_id is null then
    return jsonb_build_object('is_admin',v_admin,'role',null,'clan',null,'members','[]'::jsonb,'transactions','[]'::jsonb,'pending_credits',v_pending);
  end if;

  select jsonb_build_object(
    'id',c.id,'name',c.name,'tag',c.tag,'owner_id',c.owner_id,
    'vault_credits',c.vault_credits,'total_donated',c.total_donated,'total_burned',c.total_burned,
    'created_at',c.created_at
  ) into v_clan from public.clans c where c.id=v_clan_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id',p.id,'callsign',p.callsign,'level',coalesce(p.level,1),'role',cm.role,'joined_at',cm.joined_at
  ) order by case when cm.role='owner' then 0 else 1 end,p.callsign),'[]'::jsonb)
  into v_members
  from public.clan_members cm join public.profiles p on p.id=cm.user_id
  where cm.clan_id=v_clan_id;

  select coalesce(jsonb_agg(x.obj order by x.created_at desc),'[]'::jsonb) into v_transactions
  from (
    select t.created_at,jsonb_build_object(
      'id',t.id,'kind',t.kind,'gross_amount',t.gross_amount,'net_amount',t.net_amount,'burn_amount',t.burn_amount,
      'actor_callsign',pa.callsign,'target_callsign',pt.callsign,'created_at',t.created_at
    ) obj
    from public.clan_transactions t
    left join public.profiles pa on pa.id=t.actor_id
    left join public.profiles pt on pt.id=t.target_user_id
    where t.clan_id=v_clan_id
    order by t.created_at desc limit 30
  ) x;

  return jsonb_build_object('is_admin',v_admin,'role',v_role,'clan',v_clan,'members',v_members,'transactions',v_transactions,'pending_credits',v_pending);
end;
$$;

create or replace function public.create_clan_v12(p_name text,p_tag text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_uid uuid:=auth.uid(); v_name text:=trim(p_name); v_tag text:=upper(trim(p_tag)); v_id uuid;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  if exists(select 1 from public.clan_members where user_id=v_uid) then raise exception 'Você já pertence a um clã.'; end if;
  if char_length(v_name)<3 or char_length(v_name)>28 then raise exception 'O nome do clã precisa ter entre 3 e 28 caracteres.'; end if;
  if v_tag !~ '^[A-Z0-9]{2,6}$' then raise exception 'A TAG deve ter 2 a 6 letras/números.'; end if;
  insert into public.clans(name,tag,owner_id) values(v_name,v_tag,v_uid) returning id into v_id;
  insert into public.clan_members(user_id,clan_id,role) values(v_uid,v_id,'owner');
  return jsonb_build_object('ok',true,'clan_id',v_id,'name',v_name,'tag',v_tag);
exception when unique_violation then raise exception 'Nome ou TAG já está em uso.';
end;
$$;

create or replace function public.join_clan_v12(p_clan_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_uid uuid:=auth.uid(); v_name text; v_tag text;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  if exists(select 1 from public.clan_members where user_id=v_uid) then raise exception 'Você já pertence a um clã.'; end if;
  select name,tag into v_name,v_tag from public.clans where id=p_clan_id;
  if v_name is null then raise exception 'Clã não encontrado.'; end if;
  insert into public.clan_members(user_id,clan_id,role) values(v_uid,p_clan_id,'member');
  return jsonb_build_object('ok',true,'name',v_name,'tag',v_tag);
end;
$$;

create or replace function public.leave_clan_v12()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_uid uuid:=auth.uid(); v_clan uuid; v_role text; v_count integer;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  select clan_id,role into v_clan,v_role from public.clan_members where user_id=v_uid;
  if v_clan is null then raise exception 'Você não pertence a um clã.'; end if;
  if v_role='owner' then
    select count(*) into v_count from public.clan_members where clan_id=v_clan;
    if v_count>1 then raise exception 'O líder não pode sair enquanto houver outros membros.'; end if;
    delete from public.clans where id=v_clan;
    return jsonb_build_object('ok',true,'disbanded',true);
  end if;
  delete from public.clan_members where user_id=v_uid;
  return jsonb_build_object('ok',true,'disbanded',false);
end;
$$;

create or replace function public.donate_clan_credits_v12(p_amount bigint)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid:=auth.uid(); v_clan uuid; v_credits bigint; v_new bigint; v_net bigint; v_burn bigint; v_vault bigint;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  if p_amount is null or p_amount<=0 then raise exception 'Informe um valor maior que zero.'; end if;
  select clan_id into v_clan from public.clan_members where user_id=v_uid;
  if v_clan is null then raise exception 'Você não pertence a um clã.'; end if;
  select credits into v_credits from public.profiles where id=v_uid for update;
  if coalesce(v_credits,0)<p_amount then raise exception 'Créditos insuficientes.'; end if;
  v_new:=v_credits-p_amount; v_net:=(p_amount*90)/100; v_burn:=p_amount-v_net;
  update public.profiles set credits=v_new,updated_at=now() where id=v_uid;
  update public.game_saves
     set state=jsonb_set(coalesce(state,'{}'::jsonb),'{profile}',coalesce(state->'profile','{}'::jsonb)||jsonb_build_object('credits',v_new),true),updated_at=now()
   where user_id=v_uid;
  update public.clans set vault_credits=vault_credits+v_net,total_donated=total_donated+p_amount,total_burned=total_burned+v_burn,updated_at=now()
   where id=v_clan returning vault_credits into v_vault;
  insert into public.clan_transactions(clan_id,actor_id,kind,gross_amount,net_amount,burn_amount)
  values(v_clan,v_uid,'donation',p_amount,v_net,v_burn);
  return jsonb_build_object('ok',true,'donated',p_amount,'net',v_net,'burned',v_burn,'vault_credits',v_vault,'new_credits',v_new);
end;
$$;

create or replace function public.transfer_clan_credits_v12(p_target_callsign text,p_amount bigint)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid:=auth.uid(); v_clan uuid; v_role text; v_target uuid; v_target_name text; v_matches integer; v_vault bigint;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  if p_amount is null or p_amount<=0 then raise exception 'Informe um valor maior que zero.'; end if;
  select clan_id,role into v_clan,v_role from public.clan_members where user_id=v_uid;
  if v_clan is null then raise exception 'Você não pertence a um clã.'; end if;
  if v_role<>'owner' then raise exception 'Somente o líder pode usar o cofre.'; end if;
  select count(*) into v_matches from public.profiles where lower(callsign)=lower(trim(p_target_callsign));
  if v_matches=0 then raise exception 'Jogador não encontrado.'; end if;
  if v_matches>1 then raise exception 'Há mais de um jogador com esse callsign. Use um callsign único.'; end if;
  select id,callsign into v_target,v_target_name from public.profiles where lower(callsign)=lower(trim(p_target_callsign));
  if v_target=v_uid then raise exception 'Escolha outro jogador.'; end if;
  select vault_credits into v_vault from public.clans where id=v_clan for update;
  if coalesce(v_vault,0)<p_amount then raise exception 'Saldo insuficiente no cofre do clã.'; end if;
  update public.clans set vault_credits=vault_credits-p_amount,updated_at=now() where id=v_clan returning vault_credits into v_vault;
  insert into public.clan_credit_grants(clan_id,sender_id,recipient_id,amount) values(v_clan,v_uid,v_target,p_amount);
  insert into public.clan_transactions(clan_id,actor_id,target_user_id,kind,gross_amount,net_amount,burn_amount)
  values(v_clan,v_uid,v_target,'transfer',p_amount,p_amount,0);
  return jsonb_build_object('ok',true,'target_user_id',v_target,'target_callsign',v_target_name,'amount',p_amount,'vault_credits',v_vault);
end;
$$;

create or replace function public.claim_clan_credit_grants_v12()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid:=auth.uid(); v_total bigint:=0; v_credits bigint; v_new bigint; r record;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  for r in select id,amount from public.clan_credit_grants where recipient_id=v_uid and not claimed order by id for update loop
    v_total:=v_total+r.amount;
    update public.clan_credit_grants set claimed=true,claimed_at=now() where id=r.id;
  end loop;
  select coalesce(credits,0) into v_credits from public.profiles where id=v_uid for update;
  if v_credits is null then raise exception 'Perfil não encontrado.'; end if;
  v_new:=v_credits+v_total;
  if v_total>0 then
    update public.profiles set credits=v_new,updated_at=now() where id=v_uid;
    update public.game_saves
       set state=jsonb_set(coalesce(state,'{}'::jsonb),'{profile}',coalesce(state->'profile','{}'::jsonb)||jsonb_build_object('credits',v_new),true),updated_at=now()
     where user_id=v_uid;
  end if;
  return jsonb_build_object('ok',true,'credited',v_total,'new_credits',v_new);
end;
$$;

create or replace function public.get_map_presence_v12(p_map_id text,p_territory_faction text)
returns table (
  user_id uuid,callsign text,map_id text,territory_faction text,x double precision,y double precision,angle double precision,
  ship_id text,faction text,level integer,hp bigint,max_hp bigint,shield bigint,max_shield bigint,updated_at timestamptz,
  rank_code text,rank_title text,clan_tag text,is_admin boolean
)
language sql
security definer
set search_path = public, auth
as $$
  select pp.user_id,pp.callsign,pp.map_id,pp.territory_faction,pp.x,pp.y,pp.angle,pp.ship_id,pp.faction,pp.level,
         pp.hp,pp.max_hp,pp.shield,pp.max_shield,pp.updated_at,
         case when ga.user_id is not null then 'admin' else coalesce(r.rank_code,'pilot_basic') end,
         case when ga.user_id is not null then 'Administrador' else coalesce(r.rank_title,'Piloto Básico') end,
         c.tag,
         (ga.user_id is not null)
  from public.player_presence pp
  left join public.get_public_rankings() r on r.id=pp.user_id
  left join public.game_admins ga on ga.user_id=pp.user_id and lower(coalesce(ga.role,''))='admin'
  left join public.clan_members cm on cm.user_id=pp.user_id
  left join public.clans c on c.id=cm.clan_id
  where pp.map_id=p_map_id
    and pp.territory_faction=p_territory_faction
    and pp.updated_at >= now()-interval '9 seconds'
  order by pp.updated_at desc;
$$;

revoke all on function public.get_public_rankings() from public,anon;
revoke all on function public.list_clans_v12() from public,anon;
revoke all on function public.get_my_clan_v12() from public,anon;
revoke all on function public.create_clan_v12(text,text) from public,anon;
revoke all on function public.join_clan_v12(uuid) from public,anon;
revoke all on function public.leave_clan_v12() from public,anon;
revoke all on function public.donate_clan_credits_v12(bigint) from public,anon;
revoke all on function public.transfer_clan_credits_v12(text,bigint) from public,anon;
revoke all on function public.claim_clan_credit_grants_v12() from public,anon;
revoke all on function public.get_map_presence_v12(text,text) from public,anon;

grant execute on function public.get_public_rankings() to authenticated,service_role;
grant execute on function public.list_clans_v12() to authenticated,service_role;
grant execute on function public.get_my_clan_v12() to authenticated,service_role;
grant execute on function public.create_clan_v12(text,text) to authenticated,service_role;
grant execute on function public.join_clan_v12(uuid) to authenticated,service_role;
grant execute on function public.leave_clan_v12() to authenticated,service_role;
grant execute on function public.donate_clan_credits_v12(bigint) to authenticated,service_role;
grant execute on function public.transfer_clan_credits_v12(text,bigint) to authenticated,service_role;
grant execute on function public.claim_clan_credit_grants_v12() to authenticated,service_role;
grant execute on function public.get_map_presence_v12(text,text) to authenticated,service_role;
