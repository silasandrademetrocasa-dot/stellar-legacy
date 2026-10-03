-- Stellar Legacy V13.2.0 — EVENT DOMINATION
-- 4-1 / 4-2 / 4-3 exclusivos para eventos + rotação diária + dominação entre clãs.
-- Execute DEPOIS do CURRENT_BACKEND.sql / V13_1_WARFRONT.sql.

create extension if not exists pgcrypto;

create table if not exists public.map_event_instances_v132 (
  id uuid primary key default gen_random_uuid(),
  event_key text not null,
  name text not null,
  kind text not null default 'world_boss',
  map_id text not null check (map_id in ('b41','b42','b43')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'active' check (status in ('scheduled','active','finished','cancelled')),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(event_key,starts_at),
  check(ends_at>starts_at)
);

create table if not exists public.clan_map_domination_scores_v132 (
  event_id uuid not null references public.map_event_instances_v132(id) on delete cascade,
  clan_id uuid not null references public.clans(id) on delete cascade,
  score bigint not null default 0 check(score>=0),
  boss_score bigint not null default 0 check(boss_score>=0),
  pvp_score bigint not null default 0 check(pvp_score>=0),
  event_score bigint not null default 0 check(event_score>=0),
  updated_at timestamptz not null default now(),
  primary key(event_id,clan_id)
);

create table if not exists public.clan_map_domination_results_v132 (
  event_id uuid primary key references public.map_event_instances_v132(id) on delete cascade,
  map_id text not null check (map_id in ('b41','b42','b43')),
  winner_clan_id uuid references public.clans(id) on delete set null,
  winning_score bigint not null default 0,
  finalized_at timestamptz not null default now()
);

create table if not exists public.clan_map_ownership_v132 (
  map_id text primary key check (map_id in ('b41','b42','b43')),
  clan_id uuid references public.clans(id) on delete set null,
  source_event_id uuid references public.map_event_instances_v132(id) on delete set null,
  winning_score bigint not null default 0,
  captured_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.clan_map_ownership_v132(map_id) values('b41'),('b42'),('b43')
on conflict(map_id) do nothing;

create index if not exists idx_map_events_v132_active on public.map_event_instances_v132(map_id,starts_at,ends_at);
create index if not exists idx_map_domination_scores_v132_event on public.clan_map_domination_scores_v132(event_id,score desc);
create index if not exists idx_map_domination_scores_v132_clan on public.clan_map_domination_scores_v132(clan_id);
create index if not exists idx_map_domination_results_v132_winner on public.clan_map_domination_results_v132(winner_clan_id);
create index if not exists idx_map_ownership_v132_clan on public.clan_map_ownership_v132(clan_id);
create index if not exists idx_map_ownership_v132_source_event on public.clan_map_ownership_v132(source_event_id);

alter table public.map_event_instances_v132 enable row level security;
alter table public.clan_map_domination_scores_v132 enable row level security;
alter table public.clan_map_domination_results_v132 enable row level security;
alter table public.clan_map_ownership_v132 enable row level security;
revoke all on public.map_event_instances_v132,public.clan_map_domination_scores_v132,public.clan_map_domination_results_v132,public.clan_map_ownership_v132 from anon,authenticated;

create or replace function public.ensure_daily_event_v132()
returns public.map_event_instances_v132
language plpgsql security definer set search_path=public,auth as $$
declare
  v_day date := (now() at time zone 'America/Sao_Paulo')::date;
  v_start timestamptz;
  v_end timestamptz;
  v_map text;
  v_key text := 'nemesis_'||to_char(v_day,'YYYYMMDD');
  v_boss public.world_boss_v131%rowtype;
  v_row public.map_event_instances_v132%rowtype;
begin
  v_start := (v_day::timestamp at time zone 'America/Sao_Paulo');
  v_end := ((v_day + 1)::timestamp at time zone 'America/Sao_Paulo');
  v_map := case mod(extract(doy from v_day)::integer,3) when 0 then 'b41' when 1 then 'b42' else 'b43' end;
  -- Se um evento futuro já reservou o setor rotativo, usa o próximo 4-X livre.
  if exists(
    select 1 from public.map_event_instances_v132 e
    where e.map_id=v_map and e.status<>'cancelled' and e.event_key<>v_key
      and tstzrange(e.starts_at,e.ends_at,'[)') && tstzrange(v_start,v_end,'[)')
  ) then
    select candidate into v_map
    from (values ('b41'::text),('b42'::text),('b43'::text)) m(candidate)
    where not exists(
      select 1 from public.map_event_instances_v132 e
      where e.map_id=m.candidate and e.status<>'cancelled' and e.event_key<>v_key
        and tstzrange(e.starts_at,e.ends_at,'[)') && tstzrange(v_start,v_end,'[)')
    )
    order by case m.candidate when 'b41' then 1 when 'b42' then 2 else 3 end
    limit 1;
  end if;
  if v_map is null then raise exception 'Nenhum setor 4-X livre para o evento diário.'; end if;
  select * into v_boss from public.ensure_world_boss_v131();
  insert into public.map_event_instances_v132(event_key,name,kind,map_id,starts_at,ends_at,status,config)
  values(v_key,'NEMESIS PRIME • INVASÃO GLOBAL','world_boss',v_map,v_start,v_end,'active',jsonb_build_object('boss_id',v_boss.id,'exclusive_4x',true,'domination',true,'event_family','world_boss','npc_groups','[]'::jsonb))
  on conflict(event_key,starts_at) do update set
    map_id=excluded.map_id,
    ends_at=excluded.ends_at,
    status=case when public.map_event_instances_v132.status='cancelled' then 'cancelled' else 'active' end,
    config=public.map_event_instances_v132.config||excluded.config
  returning * into v_row;
  return v_row;
end;$$;

create or replace function public.schedule_map_event_v132(
  p_event_key text,
  p_name text,
  p_kind text,
  p_map_id text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_config jsonb default '{}'::jsonb
)
returns public.map_event_instances_v132
language plpgsql security definer set search_path=public,auth as $$
declare
  v_row public.map_event_instances_v132%rowtype;
  v_status text;
begin
  if coalesce(trim(p_event_key),'')='' or coalesce(trim(p_name),'')='' then raise exception 'Evento inválido.'; end if;
  if p_map_id not in ('b41','b42','b43') then raise exception 'Eventos só podem usar os setores 4-X.'; end if;
  if p_ends_at<=p_starts_at then raise exception 'Janela de evento inválida.'; end if;
  v_status:=case when p_ends_at<=now() then 'finished' when p_starts_at<=now() then 'active' else 'scheduled' end;
  if exists(
    select 1 from public.map_event_instances_v132 e
    where e.map_id=p_map_id and e.status<>'cancelled'
      and not (e.event_key=left(trim(p_event_key),80) and e.starts_at=p_starts_at)
      and tstzrange(e.starts_at,e.ends_at,'[)') && tstzrange(p_starts_at,p_ends_at,'[)')
  ) then raise exception 'Este setor 4-X já possui evento nessa janela.'; end if;
  insert into public.map_event_instances_v132(event_key,name,kind,map_id,starts_at,ends_at,status,config)
  values(left(trim(p_event_key),80),left(trim(p_name),120),left(coalesce(nullif(trim(p_kind),''),'event'),40),p_map_id,p_starts_at,p_ends_at,v_status,coalesce(p_config,'{}'::jsonb)||jsonb_build_object('exclusive_4x',true))
  on conflict(event_key,starts_at) do update set
    name=excluded.name,kind=excluded.kind,map_id=excluded.map_id,ends_at=excluded.ends_at,
    status=case when public.map_event_instances_v132.status='cancelled' then 'cancelled' else excluded.status end,
    config=public.map_event_instances_v132.config||excluded.config
  returning * into v_row;
  return v_row;
end;$$;

create or replace function public.sync_event_flow_v132()
returns void language plpgsql security definer set search_path=public,auth as $$
begin
  perform public.ensure_daily_event_v132();
  update public.map_event_instances_v132
    set status='active'
    where status='scheduled' and starts_at<=now() and ends_at>now();
  update public.map_event_instances_v132
    set status='finished'
    where status in ('scheduled','active') and ends_at<=now();
end;$$;

create or replace function public.finalize_map_domination_v132()
returns void language plpgsql security definer set search_path=public,auth as $$
declare
  v_event public.map_event_instances_v132%rowtype;
  v_winner uuid;
  v_score bigint;
begin
  for v_event in
    select e.* from public.map_event_instances_v132 e
    where e.ends_at<=now() and e.status<>'cancelled'
      and not exists(select 1 from public.clan_map_domination_results_v132 r where r.event_id=e.id)
    order by e.ends_at asc
  loop
    select s.clan_id,s.score into v_winner,v_score
    from public.clan_map_domination_scores_v132 s
    where s.event_id=v_event.id
    order by s.score desc,s.updated_at asc
    limit 1;

    insert into public.clan_map_domination_results_v132(event_id,map_id,winner_clan_id,winning_score)
    values(v_event.id,v_event.map_id,v_winner,coalesce(v_score,0))
    on conflict(event_id) do nothing;

    if v_winner is not null then
      insert into public.clan_map_ownership_v132(map_id,clan_id,source_event_id,winning_score,captured_at,updated_at)
      values(v_event.map_id,v_winner,v_event.id,coalesce(v_score,0),now(),now())
      on conflict(map_id) do update set
        clan_id=excluded.clan_id,
        source_event_id=excluded.source_event_id,
        winning_score=excluded.winning_score,
        captured_at=excluded.captured_at,
        updated_at=now();
    end if;

    update public.map_event_instances_v132 set status='finished' where id=v_event.id and status<>'cancelled';
  end loop;
end;$$;

create or replace function public.record_map_domination_score_v132(p_map_id text,p_points integer,p_reason text default 'combat')
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare
  v_uid uuid:=auth.uid();
  v_clan uuid;
  v_event public.map_event_instances_v132%rowtype;
  v_pts integer:=greatest(1,least(25,coalesce(p_points,1)));
  v_reason text:=lower(left(coalesce(p_reason,'combat'),40));
  v_row public.clan_map_domination_scores_v132%rowtype;
  v_dom jsonb;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  if p_map_id not in ('b41','b42','b43') then return jsonb_build_object('scored',false,'reason','map_not_event'); end if;
  perform public.sync_event_flow_v132();
  perform public.finalize_map_domination_v132();
  select clan_id into v_clan from public.clan_members where user_id=v_uid;
  if v_clan is null then return jsonb_build_object('scored',false,'reason','no_clan'); end if;
  select * into v_event from public.map_event_instances_v132
    where map_id=p_map_id and status='active' and starts_at<=now() and ends_at>now()
    order by starts_at desc limit 1;
  if not found then return jsonb_build_object('scored',false,'reason','no_active_event'); end if;

  insert into public.clan_map_domination_scores_v132(event_id,clan_id,score,boss_score,pvp_score,event_score)
  values(v_event.id,v_clan,v_pts,
    case when v_reason like '%boss%' then v_pts else 0 end,
    case when v_reason like '%pvp%' then v_pts else 0 end,
    case when v_reason not like '%boss%' and v_reason not like '%pvp%' then v_pts else 0 end)
  on conflict(event_id,clan_id) do update set
    score=public.clan_map_domination_scores_v132.score+excluded.score,
    boss_score=public.clan_map_domination_scores_v132.boss_score+excluded.boss_score,
    pvp_score=public.clan_map_domination_scores_v132.pvp_score+excluded.pvp_score,
    event_score=public.clan_map_domination_scores_v132.event_score+excluded.event_score,
    updated_at=now()
  returning * into v_row;

  select public.get_domination_state_v132() into v_dom;
  return jsonb_build_object('scored',true,'points',v_pts,'reason',v_reason,'map_id',p_map_id,'event_id',v_event.id,'clan_score',v_row.score,'domination',v_dom);
end;$$;

create or replace function public.get_event_flow_v132()
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare
  v_uid uuid:=auth.uid();
  v_active jsonb;
  v_upcoming jsonb;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  perform public.sync_event_flow_v132();
  perform public.finalize_map_domination_v132();
  select coalesce(jsonb_agg(jsonb_build_object(
      'id',e.id,'event_key',e.event_key,'name',e.name,'kind',e.kind,'map_id',e.map_id,
      'map_label',case e.map_id when 'b41' then '4-1' when 'b42' then '4-2' else '4-3' end,
      'starts_at',e.starts_at,'ends_at',e.ends_at,'status',e.status,'config',e.config
    ) order by e.starts_at,e.created_at),'[]'::jsonb)
  into v_active
  from public.map_event_instances_v132 e
  where e.status='active' and e.starts_at<=now() and e.ends_at>now();

  select coalesce(jsonb_agg(jsonb_build_object(
      'id',e.id,'event_key',e.event_key,'name',e.name,'kind',e.kind,'map_id',e.map_id,
      'map_label',case e.map_id when 'b41' then '4-1' when 'b42' then '4-2' else '4-3' end,
      'starts_at',e.starts_at,'ends_at',e.ends_at,'status',e.status,'config',e.config
    ) order by e.starts_at),'[]'::jsonb)
  into v_upcoming
  from (select * from public.map_event_instances_v132 where status='scheduled' and starts_at>now() order by starts_at limit 12) e;

  return jsonb_build_object('active',v_active,'upcoming',v_upcoming,'event_only_maps',jsonb_build_array('b41','b42','b43'));
end;$$;

create or replace function public.get_domination_state_v132()
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare
  v_uid uuid:=auth.uid();
  v_clan uuid;
  v_maps jsonb;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  perform public.sync_event_flow_v132();
  perform public.finalize_map_domination_v132();
  select clan_id into v_clan from public.clan_members where user_id=v_uid;

  select coalesce(jsonb_agg(jsonb_build_object(
    'map_id',m.map_id,
    'map_label',m.map_label,
    'owner',case when oc.id is null then null else jsonb_build_object('id',oc.id,'name',oc.name,'tag',oc.tag,'captured_at',o.captured_at,'winning_score',o.winning_score) end,
    'active_event',case when ev.id is null then null else jsonb_build_object('id',ev.id,'name',ev.name,'event_key',ev.event_key,'kind',ev.kind,'starts_at',ev.starts_at,'ends_at',ev.ends_at) end,
    'leader',case when lc.id is null then null else jsonb_build_object('id',lc.id,'name',lc.name,'tag',lc.tag,'score',lead.score) end,
    'my_clan_score',coalesce(mine.score,0)
  ) order by m.map_label),'[]'::jsonb)
  into v_maps
  from (values ('b41'::text,'4-1'::text),('b42','4-2'),('b43','4-3')) as m(map_id,map_label)
  left join public.clan_map_ownership_v132 o on o.map_id=m.map_id
  left join public.clans oc on oc.id=o.clan_id
  left join lateral (
    select e.id,e.name,e.event_key,e.kind,e.starts_at,e.ends_at
    from public.map_event_instances_v132 e
    where e.map_id=m.map_id and e.status='active' and e.starts_at<=now() and e.ends_at>now()
    order by e.starts_at desc limit 1
  ) ev on true
  left join lateral (
    select s.clan_id,s.score from public.clan_map_domination_scores_v132 s
    where s.event_id=ev.id order by s.score desc,s.updated_at asc limit 1
  ) lead on true
  left join public.clans lc on lc.id=lead.clan_id
  left join lateral (
    select s.score from public.clan_map_domination_scores_v132 s
    where s.event_id=ev.id and s.clan_id=v_clan limit 1
  ) mine on true;

  return jsonb_build_object('maps',v_maps,'my_clan_id',v_clan,'owner_bonus_percent',10);
end;$$;

create or replace function public.get_warfront_state_v132()
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare
  v_uid uuid:=auth.uid();
  v_base jsonb;
  v_events jsonb;
  v_dom jsonb;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  select public.get_warfront_state_v131() into v_base;
  select public.get_event_flow_v132() into v_events;
  select public.get_domination_state_v132() into v_dom;
  return coalesce(v_base,'{}'::jsonb)||jsonb_build_object('event_flow',v_events,'domination',v_dom,'version','13.2.0');
end;$$;

create or replace function public.hit_world_boss_v132(p_damage bigint)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare
  v_uid uuid:=auth.uid();
  v_result jsonb;
  v_applied bigint:=0;
  v_points integer:=0;
  v_event public.map_event_instances_v132%rowtype;
  v_dom jsonb:=null;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  perform public.ensure_daily_event_v132();
  select * into v_event from public.map_event_instances_v132 where status='active' and kind='world_boss' and starts_at<=now() and ends_at>now() order by starts_at desc limit 1;
  select public.hit_world_boss_v131(p_damage) into v_result;
  v_applied:=coalesce((v_result->>'applied')::bigint,0);
  if v_applied>0 and v_event.id is not null then
    v_points:=greatest(1,least(25,ceil(v_applied/250000.0)::integer));
    select public.record_map_domination_score_v132(v_event.map_id,v_points,'world_boss') into v_dom;
  end if;
  return coalesce(v_result,'{}'::jsonb)||jsonb_build_object('event_map_id',v_event.map_id,'domination',v_dom);
end;$$;

create or replace function public.claim_world_boss_reward_v132()
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare
  v_uid uuid:=auth.uid();
  v_result jsonb;
  v_clan uuid;
  v_event public.map_event_instances_v132%rowtype;
  v_owner uuid;
  v_bonus boolean:=false;
  v_cr bigint;
  v_uri bigint;
  v_frags integer;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  perform public.ensure_daily_event_v132();
  select public.claim_world_boss_reward_v131() into v_result;
  if coalesce((v_result->>'already_claimed')::boolean,false) then return v_result; end if;
  select clan_id into v_clan from public.clan_members where user_id=v_uid;
  select * into v_event from public.map_event_instances_v132 where status='active' and kind='world_boss' and starts_at<=now() and ends_at>now() order by starts_at desc limit 1;
  select clan_id into v_owner from public.clan_map_ownership_v132 where map_id=v_event.map_id;
  v_bonus:=v_clan is not null and v_owner is not null and v_clan=v_owner;
  if v_bonus then
    v_cr:=round(coalesce((v_result->>'credits')::numeric,0)*1.10)::bigint;
    v_uri:=round(coalesce((v_result->>'uridium')::numeric,0)*1.10)::bigint;
    v_frags:=coalesce((v_result->>'fragments')::integer,0)+1;
    v_result:=jsonb_set(v_result,'{credits}',to_jsonb(v_cr),true);
    v_result:=jsonb_set(v_result,'{uridium}',to_jsonb(v_uri),true);
    v_result:=jsonb_set(v_result,'{fragments}',to_jsonb(v_frags),true);
  end if;
  return v_result||jsonb_build_object('domination_owner_bonus',v_bonus,'event_map_id',v_event.map_id,'owner_bonus_percent',10);
end;$$;

revoke all on function public.ensure_daily_event_v132() from public,anon,authenticated;
revoke all on function public.schedule_map_event_v132(text,text,text,text,timestamptz,timestamptz,jsonb) from public,anon,authenticated;
revoke all on function public.sync_event_flow_v132() from public,anon,authenticated;
revoke all on function public.finalize_map_domination_v132() from public,anon,authenticated;
revoke all on function public.get_event_flow_v132() from public,anon;
revoke all on function public.get_domination_state_v132() from public,anon;
revoke all on function public.get_warfront_state_v132() from public,anon;
revoke all on function public.hit_world_boss_v132(bigint) from public,anon;
revoke all on function public.claim_world_boss_reward_v132() from public,anon;
revoke all on function public.record_map_domination_score_v132(text,integer,text) from public,anon;

grant execute on function public.ensure_daily_event_v132() to service_role,postgres;
grant execute on function public.schedule_map_event_v132(text,text,text,text,timestamptz,timestamptz,jsonb) to service_role,postgres;
grant execute on function public.sync_event_flow_v132() to service_role,postgres;
grant execute on function public.finalize_map_domination_v132() to service_role,postgres;
grant execute on function public.get_event_flow_v132() to authenticated,service_role;
grant execute on function public.get_domination_state_v132() to authenticated,service_role;
grant execute on function public.get_warfront_state_v132() to authenticated,service_role;
grant execute on function public.hit_world_boss_v132(bigint) to authenticated,service_role;
grant execute on function public.claim_world_boss_reward_v132() to authenticated,service_role;
grant execute on function public.record_map_domination_score_v132(text,integer,text) to authenticated,service_role;
