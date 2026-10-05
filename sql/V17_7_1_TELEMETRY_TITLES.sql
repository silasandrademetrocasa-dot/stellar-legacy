-- Stellar Legacy V17.7.1 — Player Telemetry + Titles
-- Depends on V17_6_3_ADMIN_CONTROL_PANEL.sql.

alter table public.player_presence
  add column if not exists pilot_title text not null default 'Piloto Estelar';

drop function if exists public.get_map_presence_v12(text,text);
create function public.get_map_presence_v12(p_map_id text, p_territory_faction text)
returns table(
  user_id uuid, callsign text, map_id text, territory_faction text,
  x double precision, y double precision, angle double precision, ship_id text,
  faction text, level integer, hp bigint, max_hp bigint, shield bigint, max_shield bigint,
  updated_at timestamptz, rank_code text, rank_title text, clan_tag text, is_admin boolean,
  pilot_title text
)
language sql security definer set search_path=public,auth,pg_temp as $$
  select pp.user_id,pp.callsign,pp.map_id,pp.territory_faction,pp.x,pp.y,pp.angle,pp.ship_id,pp.faction,pp.level,
         pp.hp,pp.max_hp,pp.shield,pp.max_shield,pp.updated_at,
         case when ga.user_id is not null then 'admin' else coalesce(r.rank_code,'pilot_basic') end,
         case when ga.user_id is not null then 'Administrador' else coalesce(r.rank_title,'Piloto Básico') end,
         c.tag,(ga.user_id is not null),coalesce(nullif(trim(pp.pilot_title),''),'Piloto Estelar')
  from public.player_presence pp
  left join public.get_public_rankings() r on r.id=pp.user_id
  left join public.game_admins ga on ga.user_id=pp.user_id and lower(coalesce(ga.role,''))='admin'
  left join public.clan_members cm on cm.user_id=pp.user_id
  left join public.clans c on c.id=cm.clan_id
  where pp.map_id=p_map_id and pp.territory_faction=p_territory_faction
    and pp.updated_at>=now()-interval '9 seconds'
  order by pp.updated_at desc;
$$;
revoke all on function public.get_map_presence_v12(text,text) from anon;
grant execute on function public.get_map_presence_v12(text,text) to authenticated,service_role;

create table if not exists public.player_telemetry_v1771 (
  user_id uuid primary key references auth.users(id) on delete cascade,
  sessions bigint not null default 0,
  play_seconds bigint not null default 0,
  kills bigint not null default 0,
  boxes bigint not null default 0,
  ore_nodes bigint not null default 0,
  ore_units bigint not null default 0,
  missions_completed bigint not null default 0,
  deaths bigint not null default 0,
  map_jumps bigint not null default 0,
  level_ups bigint not null default 0,
  credits_earned bigint not null default 0,
  credits_spent bigint not null default 0,
  stl_earned bigint not null default 0,
  stl_spent bigint not null default 0,
  xp_earned bigint not null default 0,
  npc_cr bigint not null default 0, npc_stl bigint not null default 0, npc_xp bigint not null default 0,
  mission_cr bigint not null default 0, mission_stl bigint not null default 0, mission_xp bigint not null default 0,
  resource_cr bigint not null default 0, resource_stl bigint not null default 0, resource_xp bigint not null default 0,
  pass_cr bigint not null default 0, pass_stl bigint not null default 0, pass_xp bigint not null default 0,
  event_cr bigint not null default 0, event_stl bigint not null default 0, event_xp bigint not null default 0,
  gate_cr bigint not null default 0, gate_stl bigint not null default 0, gate_xp bigint not null default 0,
  discovery_cr bigint not null default 0, discovery_stl bigint not null default 0, discovery_xp bigint not null default 0,
  other_cr bigint not null default 0, other_stl bigint not null default 0, other_xp bigint not null default 0,
  last_level integer not null default 1,
  last_credits bigint not null default 0,
  last_stl bigint not null default 0,
  last_xp bigint not null default 0,
  selected_title text not null default 'Piloto Estelar',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.player_level_milestones_v1771 (
  user_id uuid not null references auth.users(id) on delete cascade,
  level integer not null check(level between 1 and 100),
  reached_at timestamptz not null default now(),
  play_seconds bigint not null default 0,
  kills bigint not null default 0,
  credits_earned bigint not null default 0,
  stl_earned bigint not null default 0,
  xp_earned bigint not null default 0,
  credits_balance bigint not null default 0,
  stl_balance bigint not null default 0,
  primary key(user_id,level)
);

create table if not exists public.player_telemetry_batches_v1771 (
  user_id uuid not null references auth.users(id) on delete cascade,
  batch_id text not null,
  created_at timestamptz not null default now(),
  primary key(user_id,batch_id)
);

alter table public.player_telemetry_v1771 enable row level security;
alter table public.player_level_milestones_v1771 enable row level security;
alter table public.player_telemetry_batches_v1771 enable row level security;
revoke all on public.player_telemetry_v1771,public.player_level_milestones_v1771,public.player_telemetry_batches_v1771 from anon,authenticated;

create or replace function public.telemetry_num_v1771(p_doc jsonb,p_path text[],p_min bigint default 0,p_max bigint default 1000000000000)
returns bigint language plpgsql immutable set search_path=public,pg_temp as $$
declare v text; n numeric;
begin
  v:=p_doc#>>p_path;
  if v is null or v !~ '^-?[0-9]+([.][0-9]+)?$' then return 0; end if;
  n:=trunc(v::numeric);
  if n<p_min then return p_min; end if;
  if n>p_max then return p_max; end if;
  return n::bigint;
exception when others then return 0;
end;$$;
revoke all on function public.telemetry_num_v1771(jsonb,text[],bigint,bigint) from public,anon,authenticated;

create or replace function public.record_player_telemetry_v1771(p_batch jsonb)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare
  v_uid uuid:=auth.uid(); v_batch text; v_row public.player_telemetry_v1771%rowtype;
  v_sessions bigint;v_seconds bigint;v_kills bigint;v_boxes bigint;v_ore_nodes bigint;v_ore_units bigint;v_missions bigint;v_deaths bigint;v_jumps bigint;v_levelups bigint;
  v_spent_cr bigint;v_spent_stl bigint;v_level integer;v_credits bigint;v_stl bigint;v_xp bigint;v_title text;
  v_npc_cr bigint;v_npc_stl bigint;v_npc_xp bigint;v_mis_cr bigint;v_mis_stl bigint;v_mis_xp bigint;v_res_cr bigint;v_res_stl bigint;v_res_xp bigint;
  v_pass_cr bigint;v_pass_stl bigint;v_pass_xp bigint;v_event_cr bigint;v_event_stl bigint;v_event_xp bigint;v_gate_cr bigint;v_gate_stl bigint;v_gate_xp bigint;
  v_disc_cr bigint;v_disc_stl bigint;v_disc_xp bigint;v_other_cr bigint;v_other_stl bigint;v_other_xp bigint;v_cr_earned bigint;v_stl_earned bigint;v_xp_earned bigint;
  v_level_event jsonb;v_reached integer;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  if p_batch is null or jsonb_typeof(p_batch)<>'object' then raise exception 'Telemetria inválida.'; end if;
  v_batch:=left(coalesce(nullif(trim(p_batch->>'batch_id'),''),gen_random_uuid()::text),80);
  insert into public.player_telemetry_batches_v1771(user_id,batch_id) values(v_uid,v_batch) on conflict do nothing;
  if not found then return jsonb_build_object('ok',true,'duplicate',true); end if;

  v_sessions:=public.telemetry_num_v1771(p_batch,array['counters','sessions'],0,10);
  v_seconds:=public.telemetry_num_v1771(p_batch,array['counters','play_seconds'],0,900);
  v_kills:=public.telemetry_num_v1771(p_batch,array['counters','kills'],0,100000);
  v_boxes:=public.telemetry_num_v1771(p_batch,array['counters','boxes'],0,100000);
  v_ore_nodes:=public.telemetry_num_v1771(p_batch,array['counters','ore_nodes'],0,100000);
  v_ore_units:=public.telemetry_num_v1771(p_batch,array['counters','ore_units'],0,100000000);
  v_missions:=public.telemetry_num_v1771(p_batch,array['counters','missions_completed'],0,10000);
  v_deaths:=public.telemetry_num_v1771(p_batch,array['counters','deaths'],0,10000);
  v_jumps:=public.telemetry_num_v1771(p_batch,array['counters','map_jumps'],0,10000);
  v_levelups:=public.telemetry_num_v1771(p_batch,array['counters','level_ups'],0,100);
  v_spent_cr:=public.telemetry_num_v1771(p_batch,array['spent','cr'],0,1000000000000);
  v_spent_stl:=public.telemetry_num_v1771(p_batch,array['spent','stl'],0,1000000000000);

  v_npc_cr:=public.telemetry_num_v1771(p_batch,array['sources','npc','cr']);v_npc_stl:=public.telemetry_num_v1771(p_batch,array['sources','npc','stl']);v_npc_xp:=public.telemetry_num_v1771(p_batch,array['sources','npc','xp']);
  v_mis_cr:=public.telemetry_num_v1771(p_batch,array['sources','mission','cr']);v_mis_stl:=public.telemetry_num_v1771(p_batch,array['sources','mission','stl']);v_mis_xp:=public.telemetry_num_v1771(p_batch,array['sources','mission','xp']);
  v_res_cr:=public.telemetry_num_v1771(p_batch,array['sources','resource','cr']);v_res_stl:=public.telemetry_num_v1771(p_batch,array['sources','resource','stl']);v_res_xp:=public.telemetry_num_v1771(p_batch,array['sources','resource','xp']);
  v_pass_cr:=public.telemetry_num_v1771(p_batch,array['sources','pass','cr']);v_pass_stl:=public.telemetry_num_v1771(p_batch,array['sources','pass','stl']);v_pass_xp:=public.telemetry_num_v1771(p_batch,array['sources','pass','xp']);
  v_event_cr:=public.telemetry_num_v1771(p_batch,array['sources','event','cr']);v_event_stl:=public.telemetry_num_v1771(p_batch,array['sources','event','stl']);v_event_xp:=public.telemetry_num_v1771(p_batch,array['sources','event','xp']);
  v_gate_cr:=public.telemetry_num_v1771(p_batch,array['sources','gate','cr']);v_gate_stl:=public.telemetry_num_v1771(p_batch,array['sources','gate','stl']);v_gate_xp:=public.telemetry_num_v1771(p_batch,array['sources','gate','xp']);
  v_disc_cr:=public.telemetry_num_v1771(p_batch,array['sources','discovery','cr']);v_disc_stl:=public.telemetry_num_v1771(p_batch,array['sources','discovery','stl']);v_disc_xp:=public.telemetry_num_v1771(p_batch,array['sources','discovery','xp']);
  v_other_cr:=public.telemetry_num_v1771(p_batch,array['sources','other','cr']);v_other_stl:=public.telemetry_num_v1771(p_batch,array['sources','other','stl']);v_other_xp:=public.telemetry_num_v1771(p_batch,array['sources','other','xp']);
  v_cr_earned:=v_npc_cr+v_mis_cr+v_res_cr+v_pass_cr+v_event_cr+v_gate_cr+v_disc_cr+v_other_cr;
  v_stl_earned:=v_npc_stl+v_mis_stl+v_res_stl+v_pass_stl+v_event_stl+v_gate_stl+v_disc_stl+v_other_stl;
  v_xp_earned:=v_npc_xp+v_mis_xp+v_res_xp+v_pass_xp+v_event_xp+v_gate_xp+v_disc_xp+v_other_xp;

  v_level:=greatest(1,least(100,public.telemetry_num_v1771(p_batch,array['snapshot','level'],1,100)::integer));
  v_credits:=public.telemetry_num_v1771(p_batch,array['snapshot','credits'],0,9223372036854775807);
  v_stl:=public.telemetry_num_v1771(p_batch,array['snapshot','stl'],0,9223372036854775807);
  v_xp:=public.telemetry_num_v1771(p_batch,array['snapshot','xp'],0,9223372036854775807);
  v_title:=left(coalesce(nullif(trim(p_batch#>>'{snapshot,title}'),''),'Piloto Estelar'),64);

  insert into public.player_telemetry_v1771(user_id,sessions,play_seconds,kills,boxes,ore_nodes,ore_units,missions_completed,deaths,map_jumps,level_ups,credits_earned,credits_spent,stl_earned,stl_spent,xp_earned,npc_cr,npc_stl,npc_xp,mission_cr,mission_stl,mission_xp,resource_cr,resource_stl,resource_xp,pass_cr,pass_stl,pass_xp,event_cr,event_stl,event_xp,gate_cr,gate_stl,gate_xp,discovery_cr,discovery_stl,discovery_xp,other_cr,other_stl,other_xp,last_level,last_credits,last_stl,last_xp,selected_title,first_seen_at,last_seen_at)
  values(v_uid,v_sessions,v_seconds,v_kills,v_boxes,v_ore_nodes,v_ore_units,v_missions,v_deaths,v_jumps,v_levelups,v_cr_earned,v_spent_cr,v_stl_earned,v_spent_stl,v_xp_earned,v_npc_cr,v_npc_stl,v_npc_xp,v_mis_cr,v_mis_stl,v_mis_xp,v_res_cr,v_res_stl,v_res_xp,v_pass_cr,v_pass_stl,v_pass_xp,v_event_cr,v_event_stl,v_event_xp,v_gate_cr,v_gate_stl,v_gate_xp,v_disc_cr,v_disc_stl,v_disc_xp,v_other_cr,v_other_stl,v_other_xp,v_level,v_credits,v_stl,v_xp,v_title,now(),now())
  on conflict(user_id) do update set
    sessions=player_telemetry_v1771.sessions+excluded.sessions,play_seconds=player_telemetry_v1771.play_seconds+excluded.play_seconds,kills=player_telemetry_v1771.kills+excluded.kills,boxes=player_telemetry_v1771.boxes+excluded.boxes,ore_nodes=player_telemetry_v1771.ore_nodes+excluded.ore_nodes,ore_units=player_telemetry_v1771.ore_units+excluded.ore_units,missions_completed=player_telemetry_v1771.missions_completed+excluded.missions_completed,deaths=player_telemetry_v1771.deaths+excluded.deaths,map_jumps=player_telemetry_v1771.map_jumps+excluded.map_jumps,level_ups=player_telemetry_v1771.level_ups+excluded.level_ups,
    credits_earned=player_telemetry_v1771.credits_earned+excluded.credits_earned,credits_spent=player_telemetry_v1771.credits_spent+excluded.credits_spent,stl_earned=player_telemetry_v1771.stl_earned+excluded.stl_earned,stl_spent=player_telemetry_v1771.stl_spent+excluded.stl_spent,xp_earned=player_telemetry_v1771.xp_earned+excluded.xp_earned,
    npc_cr=player_telemetry_v1771.npc_cr+excluded.npc_cr,npc_stl=player_telemetry_v1771.npc_stl+excluded.npc_stl,npc_xp=player_telemetry_v1771.npc_xp+excluded.npc_xp,mission_cr=player_telemetry_v1771.mission_cr+excluded.mission_cr,mission_stl=player_telemetry_v1771.mission_stl+excluded.mission_stl,mission_xp=player_telemetry_v1771.mission_xp+excluded.mission_xp,resource_cr=player_telemetry_v1771.resource_cr+excluded.resource_cr,resource_stl=player_telemetry_v1771.resource_stl+excluded.resource_stl,resource_xp=player_telemetry_v1771.resource_xp+excluded.resource_xp,
    pass_cr=player_telemetry_v1771.pass_cr+excluded.pass_cr,pass_stl=player_telemetry_v1771.pass_stl+excluded.pass_stl,pass_xp=player_telemetry_v1771.pass_xp+excluded.pass_xp,event_cr=player_telemetry_v1771.event_cr+excluded.event_cr,event_stl=player_telemetry_v1771.event_stl+excluded.event_stl,event_xp=player_telemetry_v1771.event_xp+excluded.event_xp,gate_cr=player_telemetry_v1771.gate_cr+excluded.gate_cr,gate_stl=player_telemetry_v1771.gate_stl+excluded.gate_stl,gate_xp=player_telemetry_v1771.gate_xp+excluded.gate_xp,discovery_cr=player_telemetry_v1771.discovery_cr+excluded.discovery_cr,discovery_stl=player_telemetry_v1771.discovery_stl+excluded.discovery_stl,discovery_xp=player_telemetry_v1771.discovery_xp+excluded.discovery_xp,other_cr=player_telemetry_v1771.other_cr+excluded.other_cr,other_stl=player_telemetry_v1771.other_stl+excluded.other_stl,other_xp=player_telemetry_v1771.other_xp+excluded.other_xp,
    last_level=excluded.last_level,last_credits=excluded.last_credits,last_stl=excluded.last_stl,last_xp=excluded.last_xp,selected_title=excluded.selected_title,last_seen_at=now();

  select * into v_row from public.player_telemetry_v1771 where user_id=v_uid;
  if jsonb_typeof(p_batch->'level_events')='array' then
    for v_level_event in select value from jsonb_array_elements(p_batch->'level_events') loop
      begin v_reached:=greatest(1,least(100,(v_level_event->>'level')::integer)); exception when others then continue; end;
      insert into public.player_level_milestones_v1771(user_id,level,reached_at,play_seconds,kills,credits_earned,stl_earned,xp_earned,credits_balance,stl_balance)
      values(v_uid,v_reached,now(),v_row.play_seconds,v_row.kills,v_row.credits_earned,v_row.stl_earned,v_row.xp_earned,v_row.last_credits,v_row.last_stl)
      on conflict(user_id,level) do nothing;
    end loop;
  end if;
  return jsonb_build_object('ok',true,'duplicate',false,'play_seconds',v_row.play_seconds,'kills',v_row.kills,'last_level',v_row.last_level);
end;$$;
revoke all on function public.record_player_telemetry_v1771(jsonb) from public,anon;
grant execute on function public.record_player_telemetry_v1771(jsonb) to authenticated,service_role;

create or replace function public.admin_telemetry_overview_v1771()
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare v_uid uuid:=auth.uid();v_summary jsonb;v_sources jsonb;v_milestones jsonb;v_players jsonb;
begin
  if not public.is_game_admin_v1763(v_uid) then raise exception 'Acesso administrativo negado.'; end if;
  select jsonb_build_object('tracked_players',count(*),'play_seconds',coalesce(sum(play_seconds),0),'kills',coalesce(sum(kills),0),'missions_completed',coalesce(sum(missions_completed),0),'deaths',coalesce(sum(deaths),0),'credits_earned',coalesce(sum(credits_earned),0),'credits_spent',coalesce(sum(credits_spent),0),'stl_earned',coalesce(sum(stl_earned),0),'stl_spent',coalesce(sum(stl_spent),0),'xp_earned',coalesce(sum(xp_earned),0)) into v_summary from public.player_telemetry_v1771;
  select jsonb_agg(x order by x.sort_order) into v_sources from (
    select 1 sort_order,'npc' key,'NPCs' label,coalesce(sum(npc_cr),0) cr,coalesce(sum(npc_stl),0) stl,coalesce(sum(npc_xp),0) xp from public.player_telemetry_v1771
    union all select 2,'mission','Missões',coalesce(sum(mission_cr),0),coalesce(sum(mission_stl),0),coalesce(sum(mission_xp),0) from public.player_telemetry_v1771
    union all select 3,'resource','Recursos',coalesce(sum(resource_cr),0),coalesce(sum(resource_stl),0),coalesce(sum(resource_xp),0) from public.player_telemetry_v1771
    union all select 4,'pass','Passe / Nível',coalesce(sum(pass_cr),0),coalesce(sum(pass_stl),0),coalesce(sum(pass_xp),0) from public.player_telemetry_v1771
    union all select 5,'event','Eventos',coalesce(sum(event_cr),0),coalesce(sum(event_stl),0),coalesce(sum(event_xp),0) from public.player_telemetry_v1771
    union all select 6,'gate','Portais',coalesce(sum(gate_cr),0),coalesce(sum(gate_stl),0),coalesce(sum(gate_xp),0) from public.player_telemetry_v1771
    union all select 7,'discovery','Exploração',coalesce(sum(discovery_cr),0),coalesce(sum(discovery_stl),0),coalesce(sum(discovery_xp),0) from public.player_telemetry_v1771
    union all select 8,'other','Outros',coalesce(sum(other_cr),0),coalesce(sum(other_stl),0),coalesce(sum(other_xp),0) from public.player_telemetry_v1771
  ) x;
  select coalesce(jsonb_agg(row_to_json(m) order by m.level),'[]'::jsonb) into v_milestones from (
    select level,count(*) players,round(avg(play_seconds))::bigint avg_seconds,round(avg(kills))::bigint avg_kills,round(avg(credits_earned))::bigint avg_cr_earned,round(avg(stl_earned))::bigint avg_stl_earned from public.player_level_milestones_v1771 where level in(2,3,5,6,7,8,10,12,15,20,30,40) group by level
  ) m;
  select coalesce(jsonb_agg(row_to_json(p) order by p.last_seen_at desc),'[]'::jsonb) into v_players from (
    select t.user_id::text,coalesce(pr.callsign,'Pilot') callsign,t.last_level level,t.selected_title,t.play_seconds,t.sessions,t.kills,t.missions_completed,t.deaths,t.ore_units,t.credits_earned,t.credits_spent,t.stl_earned,t.stl_spent,t.xp_earned,
      case when t.play_seconds>0 then round(t.credits_earned*3600.0/t.play_seconds)::bigint else 0 end cr_per_hour,
      case when t.play_seconds>0 then round(t.stl_earned*3600.0/t.play_seconds)::bigint else 0 end stl_per_hour,
      case when t.play_seconds>0 then round(t.xp_earned*3600.0/t.play_seconds)::bigint else 0 end xp_per_hour,
      t.last_credits,t.last_stl,t.last_seen_at from public.player_telemetry_v1771 t left join public.profiles pr on pr.id=t.user_id order by t.last_seen_at desc limit 80
  ) p;
  return jsonb_build_object('summary',coalesce(v_summary,'{}'::jsonb),'sources',coalesce(v_sources,'[]'::jsonb),'milestones',v_milestones,'players',v_players);
end;$$;
revoke all on function public.admin_telemetry_overview_v1771() from public,anon;
grant execute on function public.admin_telemetry_overview_v1771() to authenticated,service_role;

create or replace function public.admin_player_telemetry_v1771(p_target_user_id uuid)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare v_uid uuid:=auth.uid();v_data jsonb;v_milestones jsonb;
begin
  if not public.is_game_admin_v1763(v_uid) then raise exception 'Acesso administrativo negado.'; end if;
  select to_jsonb(t)||jsonb_build_object('callsign',coalesce(p.callsign,'Pilot')) into v_data from public.player_telemetry_v1771 t left join public.profiles p on p.id=t.user_id where t.user_id=p_target_user_id;
  select coalesce(jsonb_agg(row_to_json(m) order by m.level),'[]'::jsonb) into v_milestones from public.player_level_milestones_v1771 m where m.user_id=p_target_user_id;
  return jsonb_build_object('telemetry',coalesce(v_data,'{}'::jsonb),'milestones',v_milestones);
end;$$;
revoke all on function public.admin_player_telemetry_v1771(uuid) from public,anon;
grant execute on function public.admin_player_telemetry_v1771(uuid) to authenticated,service_role;

-- The production migration also updates admin_reset_account_v1763 so an ADM test reset
-- removes rows from the three telemetry tables. Keep the full account reset implementation
-- in V17_6_3_ADMIN_CONTROL_PANEL.sql and add these lines before resetting public.profiles:
--   delete from public.player_level_milestones_v1771 where user_id=p_target_user_id;
--   delete from public.player_telemetry_batches_v1771 where user_id=p_target_user_id;
--   delete from public.player_telemetry_v1771 where user_id=p_target_user_id;
