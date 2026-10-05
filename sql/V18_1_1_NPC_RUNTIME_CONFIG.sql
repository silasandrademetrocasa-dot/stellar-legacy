-- Stellar Legacy V18.1.1 — NPCs + Recompensas Data Driven

insert into public.game_runtime_meta_v1810(config_key,version)
values('npc',1)
on conflict(config_key) do nothing;

create table if not exists public.game_npc_config_v1811 (
  npc_key text primary key,
  name text not null,
  hp bigint not null check(hp >= 1),
  shield bigint not null default 0 check(shield >= 0),
  credits bigint not null default 0 check(credits >= 0),
  stl bigint not null default 0 check(stl >= 0),
  xp bigint not null default 0 check(xp >= 0),
  speed numeric not null default 30 check(speed >= 1 and speed <= 1000),
  damage bigint not null default 1 check(damage >= 0),
  color text not null default '#ff755d',
  size numeric not null default 18 check(size >= 4 and size <= 250),
  resources jsonb not null default '{}'::jsonb,
  respawn_min_ms integer not null default 6000 check(respawn_min_ms between 1000 and 600000),
  respawn_max_ms integer not null default 13000 check(respawn_max_ms between 1000 and 600000),
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  check(respawn_max_ms >= respawn_min_ms)
);

create table if not exists public.game_map_npc_spawns_v1811 (
  map_id text not null,
  npc_key text not null references public.game_npc_config_v1811(npc_key) on delete cascade,
  spawn_count integer not null default 0 check(spawn_count between 0 and 500),
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key(map_id,npc_key)
);

alter table public.game_npc_config_v1811 enable row level security;
alter table public.game_map_npc_spawns_v1811 enable row level security;
revoke all on public.game_npc_config_v1811,public.game_map_npc_spawns_v1811 from anon,authenticated;

create or replace function public.bump_npc_runtime_config_v1811()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  insert into public.game_runtime_meta_v1810(config_key,version,updated_at)
  values('npc',1,now())
  on conflict(config_key) do update
  set version=public.game_runtime_meta_v1810.version+1,
      updated_at=now();
  return null;
end;
$$;

drop trigger if exists game_npc_config_bump_v1811 on public.game_npc_config_v1811;
create trigger game_npc_config_bump_v1811
after insert or update or delete on public.game_npc_config_v1811
for each statement execute function public.bump_npc_runtime_config_v1811();

drop trigger if exists game_map_npc_spawns_bump_v1811 on public.game_map_npc_spawns_v1811;
create trigger game_map_npc_spawns_bump_v1811
after insert or update or delete on public.game_map_npc_spawns_v1811
for each statement execute function public.bump_npc_runtime_config_v1811();

insert into public.game_npc_config_v1811
(npc_key,name,hp,shield,credits,stl,xp,speed,damage,color,size,resources,respawn_min_ms,respawn_max_ms,enabled)
values
('streuner','Scavenger',800,400,7500,15,200,62,60,'#ff8e47',15,'{"Prometium":10,"Terbium":10}'::jsonb,6000,13000,true),
('recruitStreuner','Scavenger Scout',600,800,9000,20,260,68,120,'#ffa852',14,'{"Prometium":12,"Terbium":12}'::jsonb,6000,13000,true),
('aiderStreuner','Scavenger Support',1500,1000,12000,25,340,72,210,'#ffbb62',16,'{"Prometium":15,"Terbium":15}'::jsonb,6000,13000,true),
('bossStreuner','Scavenger Prime',1600,800,15000,30,400,62,120,'#ff5e6e',19,'{"Prometium":20,"Terbium":20}'::jsonb,7000,15000,true),
('lordakia','Vrax',2000,2000,18000,30,480,95,240,'#9f73ff',18,'{"Prometium":20,"Terbium":20,"Endurium":20}'::jsonb,6000,13000,true),
('bossLordakia','Vrax Prime',4000,4000,36000,60,960,95,480,'#c765ff',22,'{"Prometium":40,"Terbium":40,"Endurium":40,"Xenomit":1}'::jsonb,7000,15000,true),
('saimon','Zyron',6000,6000,35000,45,960,82,600,'#55e2ff',20,'{"Prometium":40,"Terbium":40,"Endurium":40,"Prometid":2,"Duranium":2}'::jsonb,6500,13500,true),
('bossSaimon','Zyron Prime',12000,12000,70000,90,1920,82,1200,'#24b0ff',25,'{"Prometium":80,"Terbium":80,"Endurium":80,"Prometid":4,"Duranium":4,"Xenomit":2}'::jsonb,7500,15500,true),
('mordon','Kharon',20000,10000,90000,100,2400,52,1170,'#ffa34d',25,'{"Prometium":80,"Terbium":80,"Endurium":80,"Prometid":8,"Duranium":8,"Promerium":1}'::jsonb,7000,14500,true),
('bossMordon','Kharon Prime',40000,20000,180000,200,4800,52,2340,'#ff6948',31,'{"Prometium":160,"Terbium":160,"Endurium":160,"Prometid":16,"Duranium":16,"Promerium":2,"Xenomit":4}'::jsonb,8000,16500,true),
('devolarium','Dreadnox',100000,100000,300000,250,7200,38,3600,'#7edcff',32,'{"Prometium":100,"Terbium":100,"Endurium":100,"Prometid":16,"Duranium":16,"Promerium":2}'::jsonb,8000,16000,true),
('bossDevolarium','Dreadnox Prime',200000,200000,600000,500,14400,38,7200,'#c8f0ff',40,'{"Prometium":200,"Terbium":200,"Endurium":200,"Prometid":32,"Duranium":32,"Promerium":4,"Xenomit":8}'::jsonb,9000,18000,true),
('sibelon','Colossar',200000,200000,650000,400,12000,30,7950,'#66ffcb',36,'{"Prometium":200,"Terbium":200,"Endurium":200,"Prometid":32,"Duranium":32,"Promerium":4}'::jsonb,9000,18000,true),
('bossSibelon','Colossar Prime',400000,400000,1300000,800,24000,30,15900,'#19d59d',45,'{"Prometium":400,"Terbium":400,"Endurium":400,"Prometid":64,"Duranium":64,"Promerium":8,"Xenomit":16}'::jsonb,10000,20000,true)
on conflict(npc_key) do nothing;

-- Contagens abaixo preservam exatamente a população efetiva da V18.1.0
-- (enemyGroups * enemyMultiplier), mas agora são valores explícitos e editáveis.
insert into public.game_map_npc_spawns_v1811(map_id,npc_key,spawn_count,enabled) values
('x1','streuner',24,true),('x1','recruitStreuner',13,true),('x1','aiderStreuner',11,true),
('x2','streuner',16,true),('x2','recruitStreuner',11,true),('x2','aiderStreuner',11,true),('x2','bossStreuner',8,true),('x2','lordakia',19,true),('x2','bossLordakia',5,true),
('x3','lordakia',17,true),('x3','saimon',17,true),('x3','bossSaimon',5,true),('x3','mordon',14,true),('x3','bossMordon',5,true),('x3','devolarium',5,true),('x3','bossDevolarium',2,true),
('x4','lordakia',12,true),('x4','saimon',14,true),('x4','bossSaimon',9,true),('x4','mordon',14,true),('x4','sibelon',7,true),('x4','bossSibelon',4,true),
('b41','lordakia',15,true),('b41','saimon',19,true),('b41','mordon',15,true),('b41','bossMordon',8,true),('b41','devolarium',8,true),
('b42','saimon',18,true),('b42','mordon',20,true),('b42','bossMordon',10,true),('b42','devolarium',12,true),('b42','bossDevolarium',4,true),
('b43','mordon',20,true),('b43','devolarium',18,true),('b43','bossDevolarium',9,true),('b43','sibelon',13,true),('b43','bossSibelon',7,true)
on conflict(map_id,npc_key) do nothing;

create or replace function public.get_npc_runtime_config_v1811()
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_version bigint:=1;
  v_updated timestamptz;
  v_npcs jsonb;
  v_spawns jsonb;
begin
  select version,updated_at into v_version,v_updated
  from public.game_runtime_meta_v1810
  where config_key='npc';

  select coalesce(jsonb_agg(row_to_json(n) order by n.npc_key),'[]'::jsonb)
  into v_npcs
  from (
    select npc_key,name,hp,shield,credits,stl,xp,speed,damage,color,size,resources,
           respawn_min_ms,respawn_max_ms,enabled
    from public.game_npc_config_v1811
    order by npc_key
  ) n;

  select coalesce(jsonb_agg(row_to_json(s) order by s.map_id,s.npc_key),'[]'::jsonb)
  into v_spawns
  from (
    select map_id,npc_key,spawn_count,enabled
    from public.game_map_npc_spawns_v1811
    order by map_id,npc_key
  ) s;

  return jsonb_build_object(
    'version',coalesce(v_version,1),
    'updated_at',v_updated,
    'npcs',v_npcs,
    'spawns',v_spawns
  );
end;
$$;

create or replace function public.admin_update_npc_v1811(
  p_npc_key text,
  p_name text default null,
  p_hp bigint default null,
  p_shield bigint default null,
  p_credits bigint default null,
  p_stl bigint default null,
  p_xp bigint default null,
  p_speed numeric default null,
  p_damage bigint default null,
  p_color text default null,
  p_size numeric default null,
  p_resources jsonb default null,
  p_respawn_min_ms integer default null,
  p_respawn_max_ms integer default null,
  p_enabled boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare v_uid uuid:=auth.uid();
begin
  if not public.is_game_admin_v1763(v_uid) then raise exception 'Acesso administrativo negado.'; end if;
  update public.game_npc_config_v1811
  set name=coalesce(nullif(trim(p_name),''),name),
      hp=coalesce(greatest(1,p_hp),hp),
      shield=coalesce(greatest(0,p_shield),shield),
      credits=coalesce(greatest(0,p_credits),credits),
      stl=coalesce(greatest(0,p_stl),stl),
      xp=coalesce(greatest(0,p_xp),xp),
      speed=coalesce(greatest(1,least(1000,p_speed)),speed),
      damage=coalesce(greatest(0,p_damage),damage),
      color=coalesce(nullif(trim(p_color),''),color),
      size=coalesce(greatest(4,least(250,p_size)),size),
      resources=coalesce(p_resources,resources),
      respawn_min_ms=coalesce(greatest(1000,least(600000,p_respawn_min_ms)),respawn_min_ms),
      respawn_max_ms=coalesce(greatest(1000,least(600000,p_respawn_max_ms)),respawn_max_ms),
      enabled=coalesce(p_enabled,enabled),
      updated_at=now()
  where npc_key=p_npc_key;
  if not found then raise exception 'NPC não encontrado.'; end if;
  if exists(select 1 from public.game_npc_config_v1811 where npc_key=p_npc_key and respawn_max_ms<respawn_min_ms) then
    raise exception 'Respawn máximo deve ser maior ou igual ao mínimo.';
  end if;
  return public.get_npc_runtime_config_v1811();
end;
$$;

create or replace function public.admin_update_map_npc_spawn_v1811(
  p_map_id text,
  p_npc_key text,
  p_spawn_count integer default null,
  p_enabled boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare v_uid uuid:=auth.uid();
begin
  if not public.is_game_admin_v1763(v_uid) then raise exception 'Acesso administrativo negado.'; end if;
  if not exists(select 1 from public.game_npc_config_v1811 where npc_key=p_npc_key) then raise exception 'NPC não encontrado.'; end if;
  insert into public.game_map_npc_spawns_v1811(map_id,npc_key,spawn_count,enabled,updated_at)
  values(trim(p_map_id),p_npc_key,greatest(0,least(500,coalesce(p_spawn_count,0))),coalesce(p_enabled,true),now())
  on conflict(map_id,npc_key) do update
  set spawn_count=coalesce(greatest(0,least(500,p_spawn_count)),public.game_map_npc_spawns_v1811.spawn_count),
      enabled=coalesce(p_enabled,public.game_map_npc_spawns_v1811.enabled),
      updated_at=now();
  return public.get_npc_runtime_config_v1811();
end;
$$;

revoke all on function public.get_npc_runtime_config_v1811() from public;
revoke all on function public.admin_update_npc_v1811(text,text,bigint,bigint,bigint,bigint,bigint,numeric,bigint,text,numeric,jsonb,integer,integer,boolean) from public,anon;
revoke all on function public.admin_update_map_npc_spawn_v1811(text,text,integer,boolean) from public,anon;
grant execute on function public.get_npc_runtime_config_v1811() to anon,authenticated,service_role;
grant execute on function public.admin_update_npc_v1811(text,text,bigint,bigint,bigint,bigint,bigint,numeric,bigint,text,numeric,jsonb,integer,integer,boolean) to authenticated,service_role;
grant execute on function public.admin_update_map_npc_spawn_v1811(text,text,integer,boolean) to authenticated,service_role;
