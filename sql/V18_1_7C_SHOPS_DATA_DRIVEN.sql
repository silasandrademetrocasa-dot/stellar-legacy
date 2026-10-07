-- Stellar Legacy V18.1.7C — Lojas Comum + Premium Data Driven
-- Requer V18.1.7B.

insert into public.game_runtime_meta_v1810(config_key,version)
values('shops',1)
on conflict(config_key) do nothing;

alter table public.live_shop_prices_v16
  add column if not exists display_name text,
  add column if not exists description text,
  add column if not exists shop_tab text,
  add column if not exists shop_visible boolean not null default false,
  add column if not exists min_level integer not null default 1,
  add column if not exists sort_order integer not null default 100;

alter table public.premium_catalog_v12
  add column if not exists min_level integer not null default 1,
  add column if not exists meta jsonb not null default '{}'::jsonb;

do $$ begin
  alter table public.live_shop_prices_v16 add constraint live_shop_min_level_v1817c_check check (min_level between 1 and 100);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.live_shop_prices_v16 add constraint live_shop_tab_v1817c_check check (shop_tab is null or shop_tab in ('ships','lasers','generators','drones','pet','extras','ammo','rockets'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.premium_catalog_v12 add constraint premium_catalog_min_level_v1817c_check check (min_level between 1 and 100);
exception when duplicate_object then null; end $$;

update public.live_shop_prices_v16
set shop_tab = case kind
  when 'ship' then 'ships' when 'laser' then 'lasers' when 'generator' then 'generators'
  when 'drone' then 'drones' when 'pet' then 'pet' when 'pet_gear' then 'pet'
  when 'extra' then 'extras' when 'ammo' then 'ammo' when 'rocket' then 'rockets' else null end,
    shop_visible = kind in ('ship','laser','generator','drone','pet','pet_gear','extra','ammo','rocket');

update public.live_shop_prices_v16 set shop_visible=false where ref_id in (
  'aegis','basilisk','berserker','centurion','citadel','cyborg','defcom','defcomRaven','diminisher','disruptor',
  'goliathX','hammerclaw','hecate','holo','hyperion','keres','mimesis','orcus','paladin','retiarus','sentinel',
  'solace','solaris','spearhead','spectrum','tartarus','tempest','venom','yamato','yRonin','zephyr',
  'sl01','fs03','fs04','sg3nb00','sg3nb03'
);

with ranked as (
  select catalog_key,row_number() over(partition by coalesce(shop_tab,'zzz') order by currency,price,catalog_key)*10 rn
  from public.live_shop_prices_v16
)
update public.live_shop_prices_v16 s set sort_order=r.rn from ranked r where r.catalog_key=s.catalog_key;

insert into public.premium_catalog_v12(id,name,category,price_brl,item_id,quantity,description,active,sort_order,min_level,meta)
values
('premium_7d','PREMIUM • 1 SEMANA','premium',14.90,null,1,'7 dias de Premium com todos os bônus ativos.',true,20,1,'{"days":7}'::jsonb),
('premium_30d','PREMIUM • 1 MÊS','premium',39.90,null,1,'30 dias de Premium para farm, combate e progressão.',true,30,1,'{"days":30}'::jsonb),
('premium_90d','PREMIUM • 3 MESES','premium',99.90,null,1,'90 dias de Premium com excelente custo-benefício.',true,40,1,'{"days":90}'::jsonb),
('premium_180d','PREMIUM • 6 MESES','premium',179.90,null,1,'180 dias de Premium para longa temporada.',true,50,1,'{"days":180}'::jsonb)
on conflict(id) do update set name=excluded.name,category=excluded.category,price_brl=excluded.price_brl,
description=excluded.description,active=excluded.active,sort_order=excluded.sort_order,min_level=excluded.min_level,meta=excluded.meta;

create or replace function public.bump_shops_runtime_config_v1817c() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  insert into public.game_runtime_meta_v1810(config_key,version,updated_at) values('shops',1,now())
  on conflict(config_key) do update set version=public.game_runtime_meta_v1810.version+1,updated_at=now();
  return null;
end; $$;

drop trigger if exists live_shop_bump_v1817c on public.live_shop_prices_v16;
create trigger live_shop_bump_v1817c after insert or update or delete on public.live_shop_prices_v16
for each statement execute function public.bump_shops_runtime_config_v1817c();
drop trigger if exists premium_shop_bump_v1817c on public.premium_catalog_v12;
create trigger premium_shop_bump_v1817c after insert or update or delete on public.premium_catalog_v12
for each statement execute function public.bump_shops_runtime_config_v1817c();

create or replace function public.get_shops_runtime_config_v1817c() returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_version bigint:=1; v_updated timestamptz; v_common jsonb; v_premium jsonb;
begin
  select version,updated_at into v_version,v_updated from public.game_runtime_meta_v1810 where config_key='shops';
  select coalesce(jsonb_agg(jsonb_build_object(
    'catalog_key',catalog_key,'kind',kind,'ref_id',ref_id,'display_name',display_name,'description',description,
    'price',price,'currency',currency,'enabled',enabled,'shop_tab',shop_tab,'shop_visible',shop_visible,
    'min_level',min_level,'sort_order',sort_order,'meta',meta,'updated_at',updated_at
  ) order by coalesce(shop_tab,'zzz'),sort_order,catalog_key),'[]'::jsonb) into v_common
  from public.live_shop_prices_v16 where kind in ('ship','laser','generator','drone','pet','pet_gear','extra','ammo','rocket');

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',id,'name',name,'category',category,'price_brl',price_brl,'item_id',item_id,'quantity',quantity,
    'description',description,'active',active,'sort_order',sort_order,'min_level',min_level,'meta',meta
  ) order by sort_order,id),'[]'::jsonb) into v_premium from public.premium_catalog_v12;

  return jsonb_build_object('version',coalesce(v_version,1),'updated_at',v_updated,'common',v_common,'premium',v_premium);
end; $$;

create or replace function public.admin_update_common_shop_item_v1817c(
  p_catalog_key text,p_display_name text default null,p_description text default null,p_price bigint default null,
  p_currency text default null,p_quantity integer default null,p_min_level integer default null,p_sort_order integer default null,
  p_shop_tab text default null,p_shop_visible boolean default null,p_enabled boolean default null
) returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare v_uid uuid:=auth.uid(); v_kind text;
begin
  if not public.is_game_admin_v1763(v_uid) then raise exception 'Acesso administrativo negado.'; end if;
  select kind into v_kind from public.live_shop_prices_v16 where catalog_key=p_catalog_key;
  if v_kind is null or v_kind not in ('ship','laser','generator','drone','pet','pet_gear','extra','ammo','rocket') then raise exception 'Produto da Loja Comum inválido.'; end if;
  if p_currency is not null and p_currency not in ('credits','uridium') then raise exception 'Moeda inválida.'; end if;
  if p_shop_tab is not null and p_shop_tab not in ('ships','lasers','generators','drones','pet','extras','ammo','rockets') then raise exception 'Aba da loja inválida.'; end if;

  update public.live_shop_prices_v16 set
    display_name=case when p_display_name is null then display_name else nullif(trim(p_display_name),'') end,
    description=case when p_description is null then description else nullif(trim(p_description),'') end,
    price=case when p_price is null then price else greatest(0,p_price) end,
    currency=case when p_currency is null then currency else p_currency end,
    min_level=case when p_min_level is null then min_level else greatest(1,least(100,p_min_level)) end,
    sort_order=case when p_sort_order is null then sort_order else greatest(0,least(9999,p_sort_order)) end,
    shop_tab=case when p_shop_tab is null then shop_tab else p_shop_tab end,
    shop_visible=case when p_shop_visible is null then shop_visible else p_shop_visible end,
    enabled=case when p_enabled is null then enabled else p_enabled end,
    meta=case when p_quantity is null then meta else jsonb_set(coalesce(meta,'{}'::jsonb),'{grant}',coalesce(meta->'grant','{}'::jsonb)||jsonb_build_object('qty',greatest(1,least(10000000,p_quantity))),true) end,
    updated_at=now()
  where catalog_key=p_catalog_key;
  return public.get_shops_runtime_config_v1817c();
end; $$;

create or replace function public.admin_update_premium_shop_item_v1817c(
  p_product_id text,p_name text default null,p_description text default null,p_price_brl numeric default null,
  p_quantity integer default null,p_min_level integer default null,p_sort_order integer default null,p_active boolean default null,p_days integer default null
) returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare v_uid uuid:=auth.uid(); v_category text;
begin
  if not public.is_game_admin_v1763(v_uid) then raise exception 'Acesso administrativo negado.'; end if;
  select category into v_category from public.premium_catalog_v12 where id=p_product_id;
  if v_category is null then raise exception 'Produto Premium inválido.'; end if;
  update public.premium_catalog_v12 set
    name=case when p_name is null or trim(p_name)='' then name else left(trim(p_name),100) end,
    description=case when p_description is null then description else left(trim(p_description),300) end,
    price_brl=case when p_price_brl is null or v_category='battle_pass' then price_brl else greatest(0,least(99999,p_price_brl)) end,
    quantity=case when p_quantity is null then quantity else greatest(1,least(10000000,p_quantity)) end,
    min_level=case when p_min_level is null then min_level else greatest(1,least(100,p_min_level)) end,
    sort_order=case when p_sort_order is null then sort_order else greatest(0,least(9999,p_sort_order)) end,
    active=case when p_active is null then active else p_active end,
    meta=case when p_days is null or v_category<>'premium' then meta else coalesce(meta,'{}'::jsonb)||jsonb_build_object('days',greatest(1,least(3650,p_days))) end
  where id=p_product_id;
  return public.get_shops_runtime_config_v1817c();
end; $$;

-- O LIVE OPS agora leva metadados de vitrine para o cliente.
create or replace function public.get_live_ops_v16() returns jsonb language sql security definer set search_path='public' as $$
select jsonb_build_object(
  'server_time',(extract(epoch from clock_timestamp())*1000)::bigint,
  'events',coalesce((select jsonb_agg(jsonb_build_object(
    'event_key',event_key,'name',name,'icon',icon,'description',description,'enabled',enabled,'starts_at',starts_at,
    'duration_minutes',duration_minutes,'repeat_minutes',repeat_minutes,'schedule_mode',schedule_mode,'weekdays',weekdays,
    'start_local_time',start_local_time,'timezone',timezone,'ends_at',ends_at,'priority',priority,'target',target,
    'reward',reward,'rules',rules,'updated_at',updated_at) order by priority,event_key) from public.live_event_config_v16),'[]'::jsonb),
  'catalog',coalesce((select jsonb_agg(jsonb_build_object(
    'catalog_key',catalog_key,'kind',kind,'ref_id',ref_id,'display_name',display_name,'description',description,
    'price',price,'currency',currency,'enabled',enabled,'shop_tab',shop_tab,'shop_visible',shop_visible,
    'min_level',min_level,'sort_order',sort_order,'meta',meta,'updated_at',updated_at
  ) order by coalesce(shop_tab,'zzz'),sort_order,catalog_key) from public.live_shop_prices_v16 where enabled),'[]'::jsonb)
); $$;

-- O catálogo Premium retorna metadados do banco e mantém o preço do Passe ligado à temporada ativa.
create or replace function public.get_premium_shop_v12() returns jsonb language plpgsql security definer set search_path='public','auth' as $$
declare v_uid uuid:=auth.uid(); v_admin boolean:=false; v_until timestamptz; v_season text; v_current text; v_pass_name text; v_pass_desc text; v_pass_price numeric; v_catalog jsonb; v_level integer:=1;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  select exists(select 1 from public.game_admins ga where ga.user_id=v_uid and lower(coalesce(ga.role,''))='admin') into v_admin;
  select greatest(coalesce(level,1),1) into v_level from public.profiles where id=v_uid; v_level:=coalesce(v_level,1);
  select premium_until,battle_pass_season into v_until,v_season from public.premium_accounts_v12 where user_id=v_uid;
  select season_key,name,description,premium_price_brl into v_current,v_pass_name,v_pass_desc,v_pass_price from public.game_battle_pass_seasons_v1817b
  where enabled and now()>=starts_at and now()<ends_at order by starts_at desc limit 1;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',id,'name',case when category='battle_pass' and v_current is not null then v_pass_name else name end,
    'category',category,'price_brl',case when category='battle_pass' and v_current is not null then v_pass_price else price_brl end,
    'item_id',item_id,'quantity',quantity,'description',case when category='battle_pass' and v_current is not null then v_pass_desc else description end,
    'sort_order',sort_order,'min_level',min_level,'meta',meta,'locked',v_level<min_level
  ) order by sort_order,id),'[]'::jsonb) into v_catalog from public.premium_catalog_v12
  where active and (category<>'battle_pass' or v_current is not null);
  return jsonb_build_object('is_admin',v_admin,'can_purchase',v_admin,'test_mode',true,'premium_until',v_until,'premium_active',coalesce(v_until>now(),false),
    'battle_pass_season',v_season,'battle_pass_active',coalesce(v_current is not null and v_season=v_current,false),'current_season',v_current,'player_level',v_level,'catalog',v_catalog);
end; $$;

create or replace function public.test_purchase_premium_v12(p_product_id text) returns jsonb language plpgsql security definer set search_path='public','auth' as $$
declare v_uid uuid:=auth.uid(); v_admin boolean:=false; v_product public.premium_catalog_v12%rowtype; v_state jsonb; v_inv jsonb; v_have integer:=0; v_until timestamptz; v_season text; v_pass_price numeric; v_effective_price numeric; v_days integer:=30; v_level integer:=1;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  select exists(select 1 from public.game_admins ga where ga.user_id=v_uid and lower(coalesce(ga.role,''))='admin') into v_admin;
  if not v_admin then raise exception 'Compras reais ainda não foram liberadas. A Loja Premium está em modo de visualização.'; end if;
  select greatest(coalesce(level,1),1) into v_level from public.profiles where id=v_uid; v_level:=coalesce(v_level,1);
  select * into v_product from public.premium_catalog_v12 where id=p_product_id and active;
  if not found then raise exception 'Produto Premium inválido.'; end if;
  if v_level<v_product.min_level then raise exception 'Nível insuficiente para este produto Premium.'; end if;
  if v_product.category='battle_pass' then
    select season_key,premium_price_brl into v_season,v_pass_price from public.game_battle_pass_seasons_v1817b
    where enabled and now()>=starts_at and now()<ends_at order by starts_at desc limit 1;
    if v_season is null then raise exception 'Nenhuma temporada do Passe está ativa.'; end if; v_effective_price:=v_pass_price;
  else v_effective_price:=v_product.price_brl; end if;
  insert into public.premium_purchases_v12(user_id,product_id,price_brl,test_purchase) values(v_uid,v_product.id,v_effective_price,true);
  insert into public.premium_accounts_v12(user_id) values(v_uid) on conflict(user_id) do nothing;
  if v_product.category='premium' then
    v_days:=greatest(1,least(3650,coalesce((v_product.meta->>'days')::integer,30)));
    update public.premium_accounts_v12 set premium_until=greatest(coalesce(premium_until,now()),now())+make_interval(days=>v_days),updated_at=now()
    where user_id=v_uid returning premium_until into v_until;
    return jsonb_build_object('ok',true,'product_id',v_product.id,'category',v_product.category,'premium_until',v_until,'days',v_days,'price_brl',v_effective_price);
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
    return jsonb_build_object('ok',true,'product_id',v_product.id,'category',v_product.category,'item_id',v_product.item_id,'quantity',v_product.quantity,'new_quantity',v_have+v_product.quantity,'price_brl',v_effective_price);
  end if;
end; $$;

revoke all on function public.get_shops_runtime_config_v1817c() from public;
grant execute on function public.get_shops_runtime_config_v1817c() to anon,authenticated,service_role;
revoke all on function public.admin_update_common_shop_item_v1817c(text,text,text,bigint,text,integer,integer,integer,text,boolean,boolean) from public,anon;
grant execute on function public.admin_update_common_shop_item_v1817c(text,text,text,bigint,text,integer,integer,integer,text,boolean,boolean) to authenticated,service_role;
revoke all on function public.admin_update_premium_shop_item_v1817c(text,text,text,numeric,integer,integer,integer,boolean,integer) from public,anon;
grant execute on function public.admin_update_premium_shop_item_v1817c(text,text,text,numeric,integer,integer,integer,boolean,integer) to authenticated,service_role;
