
insert into public.game_runtime_meta_v1810(config_key,version)
values('pass',1)
on conflict(config_key) do nothing;

create table if not exists public.game_battle_pass_seasons_v1817b (
  season_key text primary key,
  name text not null,
  description text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  tier_count integer not null default 30 check(tier_count between 1 and 100),
  points_per_tier integer not null default 500 check(points_per_tier between 1 and 1000000),
  daily_points integer not null default 100 check(daily_points between 1 and 100000),
  premium_price_brl numeric(10,2) not null default 19.90 check(premium_price_brl >= 0 and premium_price_brl <= 99999),
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  check(ends_at > starts_at)
);

create table if not exists public.game_battle_pass_tiers_v1817b (
  season_key text not null references public.game_battle_pass_seasons_v1817b(season_key) on delete cascade,
  tier_no integer not null check(tier_no between 1 and 100),
  free_reward jsonb not null default '{}'::jsonb,
  premium_reward jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key(season_key,tier_no)
);

alter table public.game_battle_pass_seasons_v1817b enable row level security;
alter table public.game_battle_pass_tiers_v1817b enable row level security;
revoke all on public.game_battle_pass_seasons_v1817b,public.game_battle_pass_tiers_v1817b from anon,authenticated;

create or replace function public.bump_pass_runtime_config_v1817b()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  insert into public.game_runtime_meta_v1810(config_key,version,updated_at)
  values('pass',1,now())
  on conflict(config_key) do update
  set version=public.game_runtime_meta_v1810.version+1,updated_at=now();
  return null;
end;
$$;

drop trigger if exists battle_pass_seasons_bump_v1817b on public.game_battle_pass_seasons_v1817b;
create trigger battle_pass_seasons_bump_v1817b
after insert or update or delete on public.game_battle_pass_seasons_v1817b
for each statement execute function public.bump_pass_runtime_config_v1817b();

drop trigger if exists battle_pass_tiers_bump_v1817b on public.game_battle_pass_tiers_v1817b;
create trigger battle_pass_tiers_bump_v1817b
after insert or update or delete on public.game_battle_pass_tiers_v1817b
for each statement execute function public.bump_pass_runtime_config_v1817b();

insert into public.game_battle_pass_seasons_v1817b
(season_key,name,description,starts_at,ends_at,tier_count,points_per_tier,daily_points,premium_price_brl,enabled)
values(
  '2026-10','TEMPORADA OUTUBRO 2026',
  '30 tiers • missões diárias • trilhas Free e Premium.',
  '2026-10-01 00:00:00 America/Sao_Paulo',
  '2026-11-01 00:00:00 America/Sao_Paulo',
  30,500,100,19.90,true
)
on conflict(season_key) do nothing;

insert into public.game_battle_pass_tiers_v1817b
(season_key,tier_no,free_reward,premium_reward,enabled)
values
('2026-10',1,'{"credits":425000,"uridium":425,"ammo":{"lcb10":1650},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,'{"credits":850000,"uridium":850,"ammo":{"lcb10":3300},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,true),
('2026-10',2,'{"credits":600000,"uridium":500,"ammo":{"lcb10":1800},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,'{"credits":1200000,"uridium":1000,"ammo":{"lcb10":3600},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,true),
('2026-10',3,'{"credits":775000,"uridium":575,"ammo":{"lcb10":1950,"mcb25":1650},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,'{"credits":1550000,"uridium":1150,"ammo":{"lcb10":3900,"mcb25":3300},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,true),
('2026-10',4,'{"credits":950000,"uridium":650,"ammo":{"lcb10":2100},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,'{"credits":1900000,"uridium":1300,"ammo":{"lcb10":4200},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,true),
('2026-10',5,'{"credits":1125000,"uridium":725,"ammo":{"lcb10":2250,"mcb50":875},"rockets":{},"items":["lf1"],"ships":[],"repairBonus":0}'::jsonb,'{"credits":2250000,"uridium":1450,"ammo":{"lcb10":4500,"mcb50":1750},"rockets":{},"items":["lf3"],"ships":[],"repairBonus":0}'::jsonb,true),
('2026-10',6,'{"credits":1300000,"uridium":800,"ammo":{"lcb10":2400,"mcb25":1800},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,'{"credits":2600000,"uridium":1600,"ammo":{"lcb10":4800,"mcb25":3600},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,true),
('2026-10',7,'{"credits":1475000,"uridium":875,"ammo":{"lcb10":2550},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,'{"credits":2950000,"uridium":1750,"ammo":{"lcb10":5100},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,true),
('2026-10',8,'{"credits":1650000,"uridium":950,"ammo":{"lcb10":2700},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,'{"credits":3300000,"uridium":1900,"ammo":{"lcb10":5400},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,true),
('2026-10',9,'{"credits":1825000,"uridium":1025,"ammo":{"lcb10":2850,"mcb25":1950},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,'{"credits":3650000,"uridium":2050,"ammo":{"lcb10":5700,"mcb25":3900},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,true),
('2026-10',10,'{"credits":2000000,"uridium":1100,"ammo":{"lcb10":3000,"mcb50":1000,"ucb100":1300},"rockets":{},"items":["sg3na02"],"ships":[],"repairBonus":1}'::jsonb,'{"credits":4000000,"uridium":2200,"ammo":{"lcb10":6000,"mcb50":2000,"ucb100":2600},"rockets":{},"items":["sg3nb02"],"ships":[],"repairBonus":2}'::jsonb,true),
('2026-10',11,'{"credits":2175000,"uridium":1175,"ammo":{"lcb10":3150},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,'{"credits":4350000,"uridium":2350,"ammo":{"lcb10":6300},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,true),
('2026-10',12,'{"credits":2350000,"uridium":1250,"ammo":{"lcb10":3300,"mcb25":2100},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,'{"credits":4700000,"uridium":2500,"ammo":{"lcb10":6600,"mcb25":4200},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,true),
('2026-10',13,'{"credits":2525000,"uridium":1325,"ammo":{"lcb10":3450},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,'{"credits":5050000,"uridium":2650,"ammo":{"lcb10":6900},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,true),
('2026-10',14,'{"credits":2700000,"uridium":1400,"ammo":{"lcb10":3600},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,'{"credits":5400000,"uridium":2800,"ammo":{"lcb10":7200},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,true),
('2026-10',15,'{"credits":2875000,"uridium":1475,"ammo":{"lcb10":3750,"mcb25":2250,"mcb50":1125},"rockets":{},"items":["g3n3210"],"ships":[],"repairBonus":0}'::jsonb,'{"credits":5750000,"uridium":2950,"ammo":{"lcb10":7500,"mcb25":4500,"mcb50":2250},"rockets":{},"items":["g3n6900"],"ships":[],"repairBonus":0}'::jsonb,true),
('2026-10',16,'{"credits":3050000,"uridium":1550,"ammo":{"lcb10":3900},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,'{"credits":6100000,"uridium":3100,"ammo":{"lcb10":7800},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,true),
('2026-10',17,'{"credits":3225000,"uridium":1625,"ammo":{"lcb10":4050},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,'{"credits":6450000,"uridium":3250,"ammo":{"lcb10":8100},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,true),
('2026-10',18,'{"credits":3400000,"uridium":1700,"ammo":{"lcb10":4200,"mcb25":2400},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,'{"credits":6800000,"uridium":3400,"ammo":{"lcb10":8400,"mcb25":4800},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,true),
('2026-10',19,'{"credits":3575000,"uridium":1775,"ammo":{"lcb10":4350},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,'{"credits":7150000,"uridium":3550,"ammo":{"lcb10":8700},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,true),
('2026-10',20,'{"credits":3750000,"uridium":1850,"ammo":{"lcb10":4500,"mcb50":1250,"ucb100":1600},"rockets":{},"items":["lf2"],"ships":[],"repairBonus":1}'::jsonb,'{"credits":7500000,"uridium":3700,"ammo":{"lcb10":9000,"mcb50":2500,"ucb100":3200},"rockets":{},"items":["lf4"],"ships":[],"repairBonus":2}'::jsonb,true),
('2026-10',21,'{"credits":3925000,"uridium":1925,"ammo":{"lcb10":4650,"mcb25":2550},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,'{"credits":7850000,"uridium":3850,"ammo":{"lcb10":9300,"mcb25":5100},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,true),
('2026-10',22,'{"credits":4100000,"uridium":2000,"ammo":{"lcb10":4800},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,'{"credits":8200000,"uridium":4000,"ammo":{"lcb10":9600},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,true),
('2026-10',23,'{"credits":4275000,"uridium":2075,"ammo":{"lcb10":4950},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,'{"credits":8550000,"uridium":4150,"ammo":{"lcb10":9900},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,true),
('2026-10',24,'{"credits":4450000,"uridium":2150,"ammo":{"lcb10":5100,"mcb25":2700},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,'{"credits":8900000,"uridium":4300,"ammo":{"lcb10":10200,"mcb25":5400},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,true),
('2026-10',25,'{"credits":4625000,"uridium":2225,"ammo":{"lcb10":5250,"mcb50":1375},"rockets":{},"items":["sg3nb01"],"ships":[],"repairBonus":0}'::jsonb,'{"credits":9250000,"uridium":4450,"ammo":{"lcb10":10500,"mcb50":2750},"rockets":{},"items":["g3n7900"],"ships":[],"repairBonus":0}'::jsonb,true),
('2026-10',26,'{"credits":4800000,"uridium":2300,"ammo":{"lcb10":5400},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,'{"credits":9600000,"uridium":4600,"ammo":{"lcb10":10800},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,true),
('2026-10',27,'{"credits":4975000,"uridium":2375,"ammo":{"lcb10":5550,"mcb25":2850},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,'{"credits":9950000,"uridium":4750,"ammo":{"lcb10":11100,"mcb25":5700},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,true),
('2026-10',28,'{"credits":5150000,"uridium":2450,"ammo":{"lcb10":5700},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,'{"credits":10300000,"uridium":4900,"ammo":{"lcb10":11400},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,true),
('2026-10',29,'{"credits":5325000,"uridium":2525,"ammo":{"lcb10":5850},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,'{"credits":10650000,"uridium":5050,"ammo":{"lcb10":11700},"rockets":{},"items":[],"ships":[],"repairBonus":0}'::jsonb,true),
('2026-10',30,'{"credits":10500000,"uridium":5100,"ammo":{"lcb10":6000,"mcb25":3000,"mcb50":1500,"ucb100":1900},"rockets":{},"items":["g3n3310"],"ships":[],"repairBonus":1}'::jsonb,'{"credits":21000000,"uridium":10200,"ammo":{"lcb10":12000,"mcb25":6000,"mcb50":3000,"ucb100":13800},"rockets":{},"items":["sg3nb03"],"ships":["solace"],"repairBonus":5}'::jsonb,true)
on conflict(season_key,tier_no) do nothing;

create or replace function public.get_battle_pass_runtime_config_v1817b()
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_version bigint:=1;
  v_updated timestamptz;
  v_active public.game_battle_pass_seasons_v1817b%rowtype;
  v_active_json jsonb;
  v_seasons jsonb;
  v_tiers jsonb;
begin
  select version,updated_at into v_version,v_updated
  from public.game_runtime_meta_v1810 where config_key='pass';

  select * into v_active
  from public.game_battle_pass_seasons_v1817b
  where enabled and now()>=starts_at and now()<ends_at
  order by starts_at desc,season_key desc
  limit 1;

  if found then
    v_active_json:=jsonb_build_object(
      'season_key',v_active.season_key,'name',v_active.name,'description',v_active.description,
      'starts_at',v_active.starts_at,'ends_at',v_active.ends_at,'tier_count',v_active.tier_count,
      'points_per_tier',v_active.points_per_tier,'daily_points',v_active.daily_points,
      'premium_price_brl',v_active.premium_price_brl,'enabled',v_active.enabled
    );
    select coalesce(jsonb_agg(jsonb_build_object(
      'season_key',season_key,'tier_no',tier_no,'free_reward',free_reward,
      'premium_reward',premium_reward,'enabled',enabled
    ) order by tier_no),'[]'::jsonb)
    into v_tiers
    from public.game_battle_pass_tiers_v1817b
    where season_key=v_active.season_key;
  else
    v_active_json:=null;
    v_tiers:='[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'season_key',season_key,'name',name,'description',description,'starts_at',starts_at,'ends_at',ends_at,
    'tier_count',tier_count,'points_per_tier',points_per_tier,'daily_points',daily_points,
    'premium_price_brl',premium_price_brl,'enabled',enabled,'updated_at',updated_at
  ) order by starts_at desc,season_key desc),'[]'::jsonb)
  into v_seasons
  from public.game_battle_pass_seasons_v1817b;

  return jsonb_build_object(
    'version',coalesce(v_version,1),
    'updated_at',v_updated,
    'active_season',v_active_json,
    'seasons',v_seasons,
    'tiers',coalesce(v_tiers,'[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_update_battle_pass_season_v1817b(
  p_season_key text,
  p_name text default null,
  p_description text default null,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_tier_count integer default null,
  p_points_per_tier integer default null,
  p_daily_points integer default null,
  p_premium_price_brl numeric default null,
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

  update public.game_battle_pass_seasons_v1817b
  set name=case when p_name is null or trim(p_name)='' then name else left(trim(p_name),80) end,
      description=case when p_description is null then description else left(trim(p_description),240) end,
      starts_at=case when p_starts_at is null then starts_at else p_starts_at end,
      ends_at=case when p_ends_at is null then ends_at else p_ends_at end,
      tier_count=case when p_tier_count is null then tier_count else greatest(1,least(100,p_tier_count)) end,
      points_per_tier=case when p_points_per_tier is null then points_per_tier else greatest(1,least(1000000,p_points_per_tier)) end,
      daily_points=case when p_daily_points is null then daily_points else greatest(1,least(100000,p_daily_points)) end,
      premium_price_brl=case when p_premium_price_brl is null then premium_price_brl else greatest(0,least(99999,p_premium_price_brl)) end,
      enabled=case when p_enabled is null then enabled else p_enabled end,
      updated_at=now()
  where season_key=p_season_key;

  if not found then raise exception 'Temporada não encontrada.'; end if;
  if exists(select 1 from public.game_battle_pass_seasons_v1817b where season_key=p_season_key and ends_at<=starts_at) then
    raise exception 'O fim da temporada precisa ser posterior ao início.';
  end if;

  return public.get_battle_pass_runtime_config_v1817b();
end;
$$;

create or replace function public.admin_update_battle_pass_tier_v1817b(
  p_season_key text,
  p_tier_no integer,
  p_free_reward jsonb default null,
  p_premium_reward jsonb default null,
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
  if not exists(select 1 from public.game_battle_pass_seasons_v1817b where season_key=p_season_key) then raise exception 'Temporada não encontrada.'; end if;

  insert into public.game_battle_pass_tiers_v1817b(season_key,tier_no,free_reward,premium_reward,enabled,updated_at)
  values(
    p_season_key,greatest(1,least(100,p_tier_no)),
    coalesce(p_free_reward,'{}'::jsonb),coalesce(p_premium_reward,'{}'::jsonb),coalesce(p_enabled,true),now()
  )
  on conflict(season_key,tier_no) do update
  set free_reward=case when p_free_reward is null then public.game_battle_pass_tiers_v1817b.free_reward else p_free_reward end,
      premium_reward=case when p_premium_reward is null then public.game_battle_pass_tiers_v1817b.premium_reward else p_premium_reward end,
      enabled=case when p_enabled is null then public.game_battle_pass_tiers_v1817b.enabled else p_enabled end,
      updated_at=now();

  return public.get_battle_pass_runtime_config_v1817b();
end;
$$;

revoke all on function public.get_battle_pass_runtime_config_v1817b() from public;
grant execute on function public.get_battle_pass_runtime_config_v1817b() to anon,authenticated,service_role;

revoke all on function public.admin_update_battle_pass_season_v1817b(text,text,text,timestamptz,timestamptz,integer,integer,integer,numeric,boolean) from public,anon;
grant execute on function public.admin_update_battle_pass_season_v1817b(text,text,text,timestamptz,timestamptz,integer,integer,integer,numeric,boolean) to authenticated,service_role;

revoke all on function public.admin_update_battle_pass_tier_v1817b(text,integer,jsonb,jsonb,boolean) from public,anon;
grant execute on function public.admin_update_battle_pass_tier_v1817b(text,integer,jsonb,jsonb,boolean) to authenticated,service_role;

create or replace function public.get_premium_shop_v12()
returns jsonb
language plpgsql
security definer
set search_path to 'public','auth'
as $$
declare
  v_uid uuid:=auth.uid();
  v_admin boolean:=false;
  v_until timestamptz;
  v_season text;
  v_current text;
  v_pass_name text;
  v_pass_desc text;
  v_pass_price numeric;
  v_catalog jsonb;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  select exists(select 1 from public.game_admins ga where ga.user_id=v_uid and lower(coalesce(ga.role,''))='admin') into v_admin;
  select premium_until,battle_pass_season into v_until,v_season from public.premium_accounts_v12 where user_id=v_uid;

  select season_key,name,description,premium_price_brl
    into v_current,v_pass_name,v_pass_desc,v_pass_price
  from public.game_battle_pass_seasons_v1817b
  where enabled and now()>=starts_at and now()<ends_at
  order by starts_at desc limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',id,
    'name',case when category='battle_pass' and v_current is not null then v_pass_name else name end,
    'category',category,
    'price_brl',case when category='battle_pass' and v_current is not null then v_pass_price else price_brl end,
    'item_id',item_id,'quantity',quantity,
    'description',case when category='battle_pass' and v_current is not null then v_pass_desc else description end
  ) order by sort_order,id),'[]'::jsonb)
  into v_catalog
  from public.premium_catalog_v12
  where active and (category<>'battle_pass' or v_current is not null);

  return jsonb_build_object(
    'is_admin',v_admin,'can_purchase',v_admin,'test_mode',true,'premium_until',v_until,
    'premium_active',coalesce(v_until>now(),false),
    'battle_pass_season',v_season,
    'battle_pass_active',coalesce(v_current is not null and v_season=v_current,false),
    'current_season',v_current,
    'catalog',v_catalog
  );
end;
$$;

create or replace function public.test_purchase_premium_v12(p_product_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'public','auth'
as $$
declare
  v_uid uuid:=auth.uid();
  v_admin boolean:=false;
  v_product public.premium_catalog_v12%rowtype;
  v_state jsonb; v_inv jsonb; v_have integer:=0; v_until timestamptz;
  v_season text; v_pass_price numeric; v_effective_price numeric;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  select exists(select 1 from public.game_admins ga where ga.user_id=v_uid and lower(coalesce(ga.role,''))='admin') into v_admin;
  if not v_admin then raise exception 'Compras reais ainda não foram liberadas. A Loja Premium está em modo de visualização.'; end if;

  select * into v_product from public.premium_catalog_v12 where id=p_product_id and active;
  if not found then raise exception 'Produto Premium inválido.'; end if;

  if v_product.category='battle_pass' then
    select season_key,premium_price_brl into v_season,v_pass_price
    from public.game_battle_pass_seasons_v1817b
    where enabled and now()>=starts_at and now()<ends_at
    order by starts_at desc limit 1;
    if v_season is null then raise exception 'Nenhuma temporada do Passe está ativa.'; end if;
    v_effective_price:=v_pass_price;
  else
    v_effective_price:=v_product.price_brl;
  end if;

  insert into public.premium_purchases_v12(user_id,product_id,price_brl,test_purchase)
  values(v_uid,v_product.id,v_effective_price,true);

  insert into public.premium_accounts_v12(user_id) values(v_uid) on conflict(user_id) do nothing;

  if v_product.category='premium' then
    update public.premium_accounts_v12
    set premium_until=greatest(coalesce(premium_until,now()),now())+interval '30 days',updated_at=now()
    where user_id=v_uid returning premium_until into v_until;
    return jsonb_build_object('ok',true,'product_id',v_product.id,'category',v_product.category,'premium_until',v_until);
  elsif v_product.category='battle_pass' then
    update public.premium_accounts_v12 set battle_pass_season=v_season,updated_at=now() where user_id=v_uid;
    return jsonb_build_object('ok',true,'product_id',v_product.id,'category',v_product.category,'battle_pass_season',v_season,'price_brl',v_effective_price);
  else
    select state into v_state from public.game_saves where user_id=v_uid for update;
    if v_state is null then raise exception 'Entre no jogo e salve seu progresso antes de testar compra de item.'; end if;
    v_inv:=case when jsonb_typeof(v_state->'inventory')='object' then v_state->'inventory' else '{}'::jsonb end;
    v_have:=coalesce((v_inv->>v_product.item_id)::integer,0);
    v_inv:=jsonb_set(v_inv,array[v_product.item_id],to_jsonb(v_have+v_product.quantity),true);
    v_state:=jsonb_set(v_state,'{inventory}',v_inv,true);
    update public.game_saves set state=v_state,updated_at=now() where user_id=v_uid;
    return jsonb_build_object('ok',true,'product_id',v_product.id,'category',v_product.category,'item_id',v_product.item_id,
      'quantity',v_product.quantity,'new_quantity',v_have+v_product.quantity);
  end if;
end;
$$;

-- Hotfix da mesma versão: mantém os tiers editáveis mesmo quando a temporada sai da janela ativa.
create or replace function public.get_battle_pass_runtime_config_v1817b()
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_version bigint:=1; v_updated timestamptz;
  v_active public.game_battle_pass_seasons_v1817b%rowtype;
  v_active_json jsonb; v_seasons jsonb; v_tiers jsonb; v_tier_season_key text;
begin
  select version,updated_at into v_version,v_updated from public.game_runtime_meta_v1810 where config_key='pass';
  select * into v_active from public.game_battle_pass_seasons_v1817b
  where enabled and now()>=starts_at and now()<ends_at order by starts_at desc,season_key desc limit 1;
  if found then
    v_active_json:=jsonb_build_object('season_key',v_active.season_key,'name',v_active.name,'description',v_active.description,'starts_at',v_active.starts_at,'ends_at',v_active.ends_at,'tier_count',v_active.tier_count,'points_per_tier',v_active.points_per_tier,'daily_points',v_active.daily_points,'premium_price_brl',v_active.premium_price_brl,'enabled',v_active.enabled);
    v_tier_season_key:=v_active.season_key;
  else
    v_active_json:=null;
    select season_key into v_tier_season_key from public.game_battle_pass_seasons_v1817b order by enabled desc,starts_at desc,season_key desc limit 1;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('season_key',season_key,'tier_no',tier_no,'free_reward',free_reward,'premium_reward',premium_reward,'enabled',enabled) order by tier_no),'[]'::jsonb)
  into v_tiers from public.game_battle_pass_tiers_v1817b where season_key=v_tier_season_key;
  select coalesce(jsonb_agg(jsonb_build_object('season_key',season_key,'name',name,'description',description,'starts_at',starts_at,'ends_at',ends_at,'tier_count',tier_count,'points_per_tier',points_per_tier,'daily_points',daily_points,'premium_price_brl',premium_price_brl,'enabled',enabled,'updated_at',updated_at) order by starts_at desc,season_key desc),'[]'::jsonb)
  into v_seasons from public.game_battle_pass_seasons_v1817b;
  return jsonb_build_object('version',coalesce(v_version,1),'updated_at',v_updated,'active_season',v_active_json,'editor_season_key',v_tier_season_key,'seasons',v_seasons,'tiers',coalesce(v_tiers,'[]'::jsonb));
end;
$$;
