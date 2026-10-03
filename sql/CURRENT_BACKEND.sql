-- Stellar Legacy V12 — Premium Shop, Passe Premium e Clã 2.0
-- Regras de horário em America/Sao_Paulo. pg_cron roda em UTC:
-- 23:00 BRT = 02:00 UTC (rendimento); 00:00 BRT = 03:00 UTC (coleta diária).

create extension if not exists pg_cron;

alter table public.clans add column if not exists level integer not null default 1;
alter table public.clans add column if not exists mission_kills jsonb not null default '{}'::jsonb;
alter table public.clans add column if not exists total_interest bigint not null default 0;
alter table public.clans add column if not exists total_collected bigint not null default 0;
alter table public.clans add column if not exists total_transfer_fees bigint not null default 0;
alter table public.clans add column if not exists last_interest_date date;
alter table public.clans add column if not exists last_collection_date date;

do $$ begin
  alter table public.clans add constraint clans_level_v12_check check (level between 1 and 10);
exception when duplicate_object then null; end $$;

alter table public.clan_transactions drop constraint if exists clan_transactions_kind_check;
alter table public.clan_transactions add constraint clan_transactions_kind_check
  check (kind in ('donation','daily_collection','interest','transfer','level_up'));

-- Catálogo em REAL. Somente produtos Elite + Passe/Premium entram aqui.
create table if not exists public.premium_catalog_v12 (
  id text primary key,
  name text not null,
  category text not null check (category in ('battle_pass','premium','elite_item')),
  price_brl numeric(10,2) not null check (price_brl >= 0),
  item_id text,
  quantity integer not null default 1 check (quantity > 0),
  description text,
  active boolean not null default true,
  sort_order integer not null default 100
);

insert into public.premium_catalog_v12(id,name,category,price_brl,item_id,quantity,description,sort_order) values
 ('battle_pass_monthly','Passe de Batalha Mensal','battle_pass',19.90,null,1,'Libera a trilha Premium da temporada atual e todas as recompensas premium dos tiers alcançados.',10),
 ('premium_30d','PREMIUM • 30 dias','premium',29.90,null,1,'Reparo gratuito da nave, regeneração HP/ESC 2x, míssil 20% mais rápido, -5% em itens Elite e -10% no Materializador.',20),
 ('elite_lf3','LF-3','elite_item',4.90,'lf3',1,'Laser Elite • dano 175 • bônus PvE.',100),
 ('elite_lf4','LF-4','elite_item',9.90,'lf4',1,'Laser Elite de alto desempenho.',110),
 ('elite_sg3nb02','SG3N-B02','elite_item',7.90,'sg3nb02',1,'Gerador de escudo Elite • 10.000 ESC • 80% absorção.',120),
 ('elite_g3n6900','G3N-6900','elite_item',5.90,'g3n6900',1,'Motor Elite • +7 velocidade.',130),
 ('elite_g3n7900','G3N-7900','elite_item',9.90,'g3n7900',1,'Motor Elite • +10 velocidade.',140),
 ('elite_repair_bot','Repair Bot Auto • Elite','elite_item',9.90,'repElite',1,'Regenerador Elite para HP e escudo.',150),
 ('elite_extra_slots','CPU Expansora de Extras • Elite','elite_item',9.90,'extraSlotCpuElite',1,'Libera +6 slots EXTRAS enquanto equipada.',160),
 ('elite_cargo','Módulo de Porão • Elite','elite_item',9.90,'cargoCpuElite',1,'Aumenta o porão em +10.000 enquanto equipado.',170)
on conflict(id) do update set
  name=excluded.name, category=excluded.category, price_brl=excluded.price_brl,
  item_id=excluded.item_id, quantity=excluded.quantity, description=excluded.description,
  active=excluded.active, sort_order=excluded.sort_order;

create table if not exists public.premium_accounts_v12 (
  user_id uuid primary key references auth.users(id) on delete cascade,
  premium_until timestamptz,
  battle_pass_season text,
  updated_at timestamptz not null default now()
);

create table if not exists public.premium_purchases_v12 (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null references public.premium_catalog_v12(id),
  price_brl numeric(10,2) not null,
  test_purchase boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.premium_catalog_v12 enable row level security;
alter table public.premium_accounts_v12 enable row level security;
alter table public.premium_purchases_v12 enable row level security;
revoke all on public.premium_catalog_v12 from anon, authenticated;
revoke all on public.premium_accounts_v12 from anon, authenticated;
revoke all on public.premium_purchases_v12 from anon, authenticated;

-- ==================== CLÃ • REQUISITOS E LEVEL ====================
create or replace function public.clan_interest_rate_v12(p_level integer)
returns numeric language sql immutable as $$
  select case greatest(1,least(10,coalesce(p_level,1)))
    when 1 then 5.0 when 2 then 5.5 when 3 then 6.0 when 4 then 6.5 when 5 then 7.0
    when 6 then 7.5 when 7 then 8.0 when 8 then 8.5 when 9 then 9.0 else 10.0 end::numeric;
$$;

create or replace function public.clan_requirement_v12(p_current_level integer)
returns jsonb language sql immutable as $$
  select case greatest(1,least(10,coalesce(p_current_level,1)))
    when 1 then jsonb_build_object('next_level',2,'xp',20000,'members',2,'credits',5000000,'mission',jsonb_build_object('streuner',100))
    when 2 then jsonb_build_object('next_level',3,'xp',60000,'members',3,'credits',15000000,'mission',jsonb_build_object('lordakia',150))
    when 3 then jsonb_build_object('next_level',4,'xp',160000,'members',4,'credits',40000000,'mission',jsonb_build_object('saimon',200))
    when 4 then jsonb_build_object('next_level',5,'xp',400000,'members',5,'credits',100000000,'mission',jsonb_build_object('mordon',150))
    when 5 then jsonb_build_object('next_level',6,'xp',1120000,'members',7,'credits',250000000,'mission',jsonb_build_object('devolarium',100))
    when 6 then jsonb_build_object('next_level',7,'xp',2880000,'members',9,'credits',600000000,'mission',jsonb_build_object('sibelon',100))
    when 7 then jsonb_build_object('next_level',8,'xp',7680000,'members',12,'credits',1200000000,'mission',jsonb_build_object('boss_mordon',50,'boss_devolarium',50))
    when 8 then jsonb_build_object('next_level',9,'xp',20480000,'members',16,'credits',2500000000,'mission',jsonb_build_object('boss_sibelon',100))
    when 9 then jsonb_build_object('next_level',10,'xp',51200000,'members',20,'credits',5000000000,'mission',jsonb_build_object('boss_any',300))
    else jsonb_build_object('next_level',null,'xp',0,'members',0,'credits',0,'mission','{}'::jsonb)
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
  if v_members<coalesce((v_req->>'members')::integer,0) then v_ok:=false; end if;
  if v_clan.vault_credits<coalesce((v_req->>'credits')::bigint,0) then v_ok:=false; end if;
  return jsonb_build_object(
    'level',v_clan.level,'interest_rate',public.clan_interest_rate_v12(v_clan.level),'member_xp',v_xp,'members',v_members,
    'requirements',v_req,'mission_progress',v_mission,'ready',v_ok
  );
end;$$;

create or replace function public.evaluate_clan_level_v12(p_clan_id uuid)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_status jsonb; v_level integer; v_cost bigint; v_owner uuid; v_new integer;
begin
  select level,owner_id into v_level,v_owner from public.clans where id=p_clan_id for update;
  if v_level is null then return null; end if;
  v_status:=public.clan_level_status_v12(p_clan_id);
  if coalesce((v_status->>'ready')::boolean,false) then
    v_cost:=(v_status->'requirements'->>'credits')::bigint; v_new:=v_level+1;
    update public.clans set level=v_new,vault_credits=vault_credits-v_cost,mission_kills='{}'::jsonb,updated_at=now() where id=p_clan_id;
    insert into public.clan_transactions(clan_id,actor_id,kind,gross_amount,net_amount,burn_amount)
      values(p_clan_id,v_owner,'level_up',v_cost,0,v_cost);
    return public.clan_level_status_v12(p_clan_id)||jsonb_build_object('leveled_up',true,'new_level',v_new,'cost_paid',v_cost);
  end if;
  return v_status||jsonb_build_object('leveled_up',false);
end;$$;

create or replace function public.record_clan_alien_kill_v12(p_npc_type text,p_is_boss boolean default false)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_uid uuid:=auth.uid(); v_clan uuid; v_key text; v_kills jsonb; v_result jsonb;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  select clan_id into v_clan from public.clan_members where user_id=v_uid;
  if v_clan is null then return jsonb_build_object('ok',true,'in_clan',false); end if;
  v_key:=lower(regexp_replace(coalesce(p_npc_type,''),'[^a-zA-Z0-9_]+','','g'));
  if v_key='' then return jsonb_build_object('ok',true,'in_clan',true); end if;
  select mission_kills into v_kills from public.clans where id=v_clan for update;
  if p_is_boss then
    v_kills:=jsonb_set(v_kills,array['boss_'||v_key],to_jsonb(coalesce((v_kills->>('boss_'||v_key))::bigint,0)+1),true);
    v_kills:=jsonb_set(v_kills,array['boss_any'],to_jsonb(coalesce((v_kills->>'boss_any')::bigint,0)+1),true);
  else
    v_kills:=jsonb_set(v_kills,array[v_key],to_jsonb(coalesce((v_kills->>v_key)::bigint,0)+1),true);
  end if;
  update public.clans set mission_kills=v_kills,updated_at=now() where id=v_clan;
  v_result:=public.evaluate_clan_level_v12(v_clan);
  return jsonb_build_object('ok',true,'in_clan',true,'status',v_result);
end;$$;

-- ==================== CLÃ • ECONOMIA DIÁRIA ====================
create or replace function public.process_all_clan_interest_v12()
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_date date:=(now() at time zone 'America/Sao_Paulo')::date; c record; v_amount bigint; v_count integer:=0; v_total bigint:=0;
begin
  for c in select id,owner_id,level,vault_credits from public.clans where last_interest_date is distinct from v_date for update loop
    v_amount:=floor(c.vault_credits*public.clan_interest_rate_v12(c.level)/100.0)::bigint;
    update public.clans set vault_credits=vault_credits+v_amount,total_interest=total_interest+v_amount,last_interest_date=v_date,updated_at=now() where id=c.id;
    if v_amount>0 then
      insert into public.clan_transactions(clan_id,actor_id,kind,gross_amount,net_amount,burn_amount) values(c.id,c.owner_id,'interest',v_amount,v_amount,0);
    end if;
    v_count:=v_count+1; v_total:=v_total+v_amount;
  end loop;
  return jsonb_build_object('ok',true,'date',v_date,'clans',v_count,'interest',v_total);
end;$$;

create or replace function public.process_all_clan_collection_v12()
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_date date:=(now() at time zone 'America/Sao_Paulo')::date; c record; m record; v_take bigint; v_new bigint; v_clan_total bigint; v_total bigint:=0; v_members integer:=0;
begin
  for c in select id,owner_id from public.clans where last_collection_date is distinct from v_date for update loop
    v_clan_total:=0;
    for m in
      select cm.user_id,coalesce(p.credits,0)::bigint credits
      from public.clan_members cm join public.profiles p on p.id=cm.user_id
      where cm.clan_id=c.id order by cm.joined_at for update of p
    loop
      v_take:=floor(m.credits*0.10)::bigint;
      if v_take>0 then
        v_new:=m.credits-v_take;
        update public.profiles set credits=v_new,updated_at=now() where id=m.user_id;
        update public.game_saves set state=jsonb_set(
          jsonb_set(coalesce(state,'{}'::jsonb),'{profile}',coalesce(state->'profile','{}'::jsonb)||jsonb_build_object('credits',v_new),true),
          '{serverEconomy}',coalesce(state->'serverEconomy','{}'::jsonb)||jsonb_build_object('lastClanCollectionDate',v_date,'lastClanCollectionAmount',v_take),true
        ),updated_at=now() where user_id=m.user_id;
        insert into public.clan_transactions(clan_id,actor_id,kind,gross_amount,net_amount,burn_amount) values(c.id,m.user_id,'daily_collection',v_take,v_take,0);
        v_clan_total:=v_clan_total+v_take; v_members:=v_members+1;
      end if;
    end loop;
    update public.clans set vault_credits=vault_credits+v_clan_total,total_collected=total_collected+v_clan_total,last_collection_date=v_date,updated_at=now() where id=c.id;
    perform public.evaluate_clan_level_v12(c.id);
    v_total:=v_total+v_clan_total;
  end loop;
  return jsonb_build_object('ok',true,'date',v_date,'collected',v_total,'members_charged',v_members);
end;$$;

-- Doação manual fica permanentemente desligada na V12.
create or replace function public.donate_clan_credits_v12(p_amount bigint)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
begin raise exception 'Na V12 o cofre recebe Créditos apenas pela coleta automática diária de 10%%.'; end;$$;

-- Repasse: valor informado sai do cofre; destinatário recebe 95%; 5% é juros queimado.
create or replace function public.transfer_clan_credits_v12(p_target_callsign text,p_amount bigint)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_uid uuid:=auth.uid(); v_clan uuid; v_role text; v_target uuid; v_target_name text; v_matches integer; v_vault bigint; v_net bigint; v_fee bigint;
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
  v_net:=floor(p_amount*0.95)::bigint; v_fee:=p_amount-v_net;
  update public.clans set vault_credits=vault_credits-p_amount,total_transfer_fees=total_transfer_fees+v_fee,updated_at=now() where id=v_clan returning vault_credits into v_vault;
  insert into public.clan_credit_grants(clan_id,sender_id,recipient_id,amount) values(v_clan,v_uid,v_target,v_net);
  insert into public.clan_transactions(clan_id,actor_id,target_user_id,kind,gross_amount,net_amount,burn_amount) values(v_clan,v_uid,v_target,'transfer',p_amount,v_net,v_fee);
  return jsonb_build_object('ok',true,'target_user_id',v_target,'target_callsign',v_target_name,'gross_amount',p_amount,'net_amount',v_net,'fee',v_fee,'vault_credits',v_vault);
end;$$;

create or replace function public.get_my_clan_v12()
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_uid uuid:=auth.uid(); v_clan_id uuid; v_role text; v_clan jsonb; v_members jsonb:='[]'::jsonb; v_transactions jsonb:='[]'::jsonb; v_pending bigint:=0; v_admin boolean:=false; v_status jsonb;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  select exists(select 1 from public.game_admins ga where ga.user_id=v_uid and lower(coalesce(ga.role,''))='admin') into v_admin;
  select cm.clan_id,cm.role into v_clan_id,v_role from public.clan_members cm where cm.user_id=v_uid;
  select coalesce(sum(g.amount),0) into v_pending from public.clan_credit_grants g where g.recipient_id=v_uid and not g.claimed;
  if v_clan_id is null then return jsonb_build_object('is_admin',v_admin,'role',null,'clan',null,'members','[]'::jsonb,'transactions','[]'::jsonb,'pending_credits',v_pending); end if;
  select jsonb_build_object('id',c.id,'name',c.name,'tag',c.tag,'owner_id',c.owner_id,'level',c.level,'vault_credits',c.vault_credits,
    'total_collected',c.total_collected,'total_interest',c.total_interest,'total_transfer_fees',c.total_transfer_fees,
    'last_interest_date',c.last_interest_date,'last_collection_date',c.last_collection_date,'created_at',c.created_at)
    into v_clan from public.clans c where c.id=v_clan_id;
  v_status:=public.clan_level_status_v12(v_clan_id);
  select coalesce(jsonb_agg(jsonb_build_object('user_id',p.id,'callsign',p.callsign,'level',coalesce(p.level,1),'xp',coalesce(p.xp,0),'credits',coalesce(p.credits,0),'role',cm.role,'joined_at',cm.joined_at)
    order by case when cm.role='owner' then 0 else 1 end,p.callsign),'[]'::jsonb)
    into v_members from public.clan_members cm join public.profiles p on p.id=cm.user_id where cm.clan_id=v_clan_id;
  select coalesce(jsonb_agg(x.obj order by x.created_at desc),'[]'::jsonb) into v_transactions from (
    select t.created_at,jsonb_build_object('id',t.id,'kind',t.kind,'gross_amount',t.gross_amount,'net_amount',t.net_amount,'burn_amount',t.burn_amount,
      'actor_callsign',pa.callsign,'target_callsign',pt.callsign,'created_at',t.created_at) obj
    from public.clan_transactions t left join public.profiles pa on pa.id=t.actor_id left join public.profiles pt on pt.id=t.target_user_id
    where t.clan_id=v_clan_id order by t.created_at desc limit 40) x;
  return jsonb_build_object('is_admin',v_admin,'role',v_role,'clan',v_clan,'level_status',v_status,'members',v_members,'transactions',v_transactions,'pending_credits',v_pending);
end;$$;

drop function if exists public.list_clans_v12();
create function public.list_clans_v12()
returns table(id uuid,name text,tag text,member_count integer,level integer,created_at timestamptz)
language sql security definer set search_path=public,auth as $$
  select c.id,c.name,c.tag,count(cm.user_id)::integer,c.level,c.created_at
  from public.clans c left join public.clan_members cm on cm.clan_id=c.id
  group by c.id,c.name,c.tag,c.level,c.created_at order by c.level desc,count(cm.user_id) desc,c.created_at asc;
$$;

-- ==================== PREMIUM SHOP / TESTE ADM ====================
create or replace function public.get_premium_shop_v12()
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_uid uuid:=auth.uid(); v_admin boolean:=false; v_until timestamptz; v_season text; v_current text:=to_char((now() at time zone 'America/Sao_Paulo'),'YYYY-MM'); v_catalog jsonb;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  select exists(select 1 from public.game_admins ga where ga.user_id=v_uid and lower(coalesce(ga.role,''))='admin') into v_admin;
  select premium_until,battle_pass_season into v_until,v_season from public.premium_accounts_v12 where user_id=v_uid;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'category',category,'price_brl',price_brl,'item_id',item_id,'quantity',quantity,'description',description) order by sort_order,id),'[]'::jsonb)
    into v_catalog from public.premium_catalog_v12 where active;
  return jsonb_build_object('is_admin',v_admin,'can_purchase',v_admin,'test_mode',true,'premium_until',v_until,'premium_active',coalesce(v_until>now(),false),
    'battle_pass_season',v_season,'battle_pass_active',coalesce(v_season=v_current,false),'current_season',v_current,'catalog',v_catalog);
end;$$;

create or replace function public.test_purchase_premium_v12(p_product_id text)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_uid uuid:=auth.uid(); v_admin boolean:=false; v_product public.premium_catalog_v12%rowtype; v_state jsonb; v_inv jsonb; v_have integer:=0; v_until timestamptz; v_season text:=to_char((now() at time zone 'America/Sao_Paulo'),'YYYY-MM');
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  select exists(select 1 from public.game_admins ga where ga.user_id=v_uid and lower(coalesce(ga.role,''))='admin') into v_admin;
  if not v_admin then raise exception 'Compras reais ainda não foram liberadas. A Loja Premium está em modo de visualização.'; end if;
  select * into v_product from public.premium_catalog_v12 where id=p_product_id and active;
  if not found then raise exception 'Produto Premium inválido.'; end if;
  insert into public.premium_purchases_v12(user_id,product_id,price_brl,test_purchase) values(v_uid,v_product.id,v_product.price_brl,true);
  insert into public.premium_accounts_v12(user_id) values(v_uid) on conflict(user_id) do nothing;
  if v_product.category='premium' then
    update public.premium_accounts_v12 set premium_until=greatest(coalesce(premium_until,now()),now())+interval '30 days',updated_at=now() where user_id=v_uid returning premium_until into v_until;
    return jsonb_build_object('ok',true,'product_id',v_product.id,'category',v_product.category,'premium_until',v_until);
  elsif v_product.category='battle_pass' then
    update public.premium_accounts_v12 set battle_pass_season=v_season,updated_at=now() where user_id=v_uid;
    return jsonb_build_object('ok',true,'product_id',v_product.id,'category',v_product.category,'battle_pass_season',v_season);
  else
    select state into v_state from public.game_saves where user_id=v_uid for update;
    if v_state is null then raise exception 'Entre no jogo e salve seu progresso antes de testar compra de item.'; end if;
    v_inv:=case when jsonb_typeof(v_state->'inventory')='object' then v_state->'inventory' else '{}'::jsonb end;
    v_have:=coalesce((v_inv->>v_product.item_id)::integer,0);
    v_inv:=jsonb_set(v_inv,array[v_product.item_id],to_jsonb(v_have+v_product.quantity),true);
    v_state:=jsonb_set(v_state,'{inventory}',v_inv,true);
    update public.game_saves set state=v_state,updated_at=now() where user_id=v_uid;
    return jsonb_build_object('ok',true,'product_id',v_product.id,'category',v_product.category,'item_id',v_product.item_id,'quantity',v_product.quantity,'new_quantity',v_have+v_product.quantity);
  end if;
end;$$;

-- Permissões RPC
revoke all on function public.clan_interest_rate_v12(integer) from public,anon;
revoke all on function public.clan_requirement_v12(integer) from public,anon;
revoke all on function public.clan_level_status_v12(uuid) from public,anon;
revoke all on function public.evaluate_clan_level_v12(uuid) from public,anon;
revoke all on function public.record_clan_alien_kill_v12(text,boolean) from public,anon;
revoke all on function public.process_all_clan_interest_v12() from public,anon,authenticated;
revoke all on function public.process_all_clan_collection_v12() from public,anon,authenticated;
revoke all on function public.get_premium_shop_v12() from public,anon;
revoke all on function public.test_purchase_premium_v12(text) from public,anon;

grant execute on function public.clan_interest_rate_v12(integer) to authenticated,service_role;
grant execute on function public.clan_requirement_v12(integer) to authenticated,service_role;
grant execute on function public.clan_level_status_v12(uuid) to authenticated,service_role;
grant execute on function public.evaluate_clan_level_v12(uuid) to authenticated,service_role;
grant execute on function public.record_clan_alien_kill_v12(text,boolean) to authenticated,service_role;
grant execute on function public.process_all_clan_interest_v12() to service_role,postgres;
grant execute on function public.process_all_clan_collection_v12() to service_role,postgres;
grant execute on function public.get_premium_shop_v12() to authenticated,service_role;
grant execute on function public.test_purchase_premium_v12(text) to authenticated,service_role;

-- Recria jobs de forma idempotente.
do $$
declare r record;
begin
  for r in select jobid from cron.job where jobname in ('stellar-v12-clan-interest','stellar-v12-clan-collection') loop
    perform cron.unschedule(r.jobid);
  end loop;
end $$;
select cron.schedule('stellar-v12-clan-interest','0 2 * * *','select public.process_all_clan_interest_v12();');
select cron.schedule('stellar-v12-clan-collection','0 3 * * *','select public.process_all_clan_collection_v12();');


-- ============================================================
-- V12.1.4 — LOGIN ÚNICO / GAME SESSION LOCK
-- ============================================================
create table if not exists public.game_login_sessions_v1214 (
  user_id uuid primary key references auth.users(id) on delete cascade,
  session_id uuid not null,
  device_label text,
  issued_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);

alter table public.game_login_sessions_v1214 enable row level security;
revoke all on table public.game_login_sessions_v1214 from anon, authenticated;

create or replace function public.register_game_session_v1214(p_session_id uuid,p_device_label text default null)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare v_uid uuid:=auth.uid(); v_previous uuid;
begin
  if v_uid is null then raise exception 'Usuário não autenticado.'; end if;
  if p_session_id is null then raise exception 'Identificador de sessão ausente.'; end if;
  select session_id into v_previous from public.game_login_sessions_v1214 where user_id=v_uid;
  insert into public.game_login_sessions_v1214(user_id,session_id,device_label,issued_at,last_seen)
  values(v_uid,p_session_id,left(nullif(trim(coalesce(p_device_label,'')),''),160),now(),now())
  on conflict(user_id) do update set session_id=excluded.session_id,device_label=excluded.device_label,issued_at=now(),last_seen=now();
  return jsonb_build_object('ok',true,'session_id',p_session_id,'replaced_previous',v_previous is not null and v_previous<>p_session_id);
end;$$;

create or replace function public.validate_game_session_v1214(p_session_id uuid,p_touch boolean default true)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare v_uid uuid:=auth.uid(); v_current uuid; v_issued timestamptz; v_last_seen timestamptz;
begin
  if v_uid is null then raise exception 'Usuário não autenticado.'; end if;
  select session_id,issued_at,last_seen into v_current,v_issued,v_last_seen from public.game_login_sessions_v1214 where user_id=v_uid;
  if v_current is null or p_session_id is null or v_current<>p_session_id then return jsonb_build_object('valid',false,'reason','replaced'); end if;
  if p_touch then update public.game_login_sessions_v1214 set last_seen=now() where user_id=v_uid and session_id=p_session_id returning last_seen into v_last_seen; end if;
  return jsonb_build_object('valid',true,'issued_at',v_issued,'last_seen',v_last_seen);
end;$$;

create or replace function public.clear_game_session_v1214(p_session_id uuid)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare v_uid uuid:=auth.uid(); v_deleted integer:=0;
begin
  if v_uid is null then raise exception 'Usuário não autenticado.'; end if;
  delete from public.game_login_sessions_v1214 where user_id=v_uid and session_id=p_session_id;
  get diagnostics v_deleted=row_count;
  return jsonb_build_object('ok',true,'cleared',v_deleted>0);
end;$$;

revoke all on function public.register_game_session_v1214(uuid,text) from public,anon;
revoke all on function public.validate_game_session_v1214(uuid,boolean) from public,anon;
revoke all on function public.clear_game_session_v1214(uuid) from public,anon;
grant execute on function public.register_game_session_v1214(uuid,text) to authenticated,service_role;
grant execute on function public.validate_game_session_v1214(uuid,boolean) to authenticated,service_role;
grant execute on function public.clear_game_session_v1214(uuid) to authenticated,service_role;
