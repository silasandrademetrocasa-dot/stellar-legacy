-- STELLAR LEGACY V19.0.3 • Editor de cupons ADM e resgate seguro
-- Sem alterações em cupons antigos ou inventários existentes. Rodar uma vez.
create table if not exists public.game_coupon_reward_catalog_v193(
 kind text not null, item_id text not null, name text not null, category text not null, rarity text not null,
 primary key(kind,item_id)
);
alter table public.game_coupon_reward_catalog_v193 enable row level security;
revoke all on public.game_coupon_reward_catalog_v193 from public,anon,authenticated;
-- O bloco de INSERT com os 99 tipos é gerado a partir do arquivo public/data.js da V19.0.2.
INSERT INTO public.game_coupon_reward_catalog_v193(kind,item_id,name,category,rarity) VALUES
('inventory','lf1','ARC-1','LASERS','COMUM'),
('inventory','mp1','ARC-P1','LASERS','COMUM'),
('inventory','sl01','SOL-1','LASERS','COMUM'),
('inventory','lf2','ARC-2','LASERS','COMUM'),
('inventory','lf3','ARC-3','LASERS','ELITE'),
('inventory','lf4','ARC-4','LASERS','ELITE'),
('inventory','g3n1010','THR-1','GERADORES','COMUM'),
('inventory','g3n2010','THR-2','GERADORES','COMUM'),
('inventory','g3n3210','THR-3','GERADORES','COMUM'),
('inventory','g3n3310','THR-4','GERADORES','COMUM'),
('inventory','g3n6900','THR-5','GERADORES','ELITE'),
('inventory','g3n7900','THR-6','GERADORES','ELITE'),
('inventory','fs01','AEG-1','GERADORES','COMUM'),
('inventory','fs02','AEG-2','GERADORES','COMUM'),
('inventory','fs03','AEG-3','GERADORES','EVENTO'),
('inventory','fs04','AEG-4','GERADORES','EVENTO'),
('inventory','sg3nb00','VSH-0','GERADORES','EVENTO'),
('inventory','sg3na01','VSH-1','GERADORES','COMUM'),
('inventory','sg3na02','VSH-2','GERADORES','COMUM'),
('inventory','sg3na03','VSH-3','GERADORES','COMUM'),
('inventory','sg3nb01','VSH-4','GERADORES','COMUM'),
('inventory','sg3nb02','VSH-5','GERADORES','ELITE'),
('inventory','sg3nb03','VSH-6','GERADORES','EVENTO'),
('inventory','autoLaserCpu','Mira Autônoma','EXTRAS','COMUM'),
('inventory','autoRocketCpu','Lançador Autônomo','EXTRAS','COMUM'),
('inventory','rocketTurboCpu','Propulsor de Recarga','EXTRAS','COMUM'),
('inventory','extraSlotCpuCommon','CPU Expansora de Extras • Comum','EXTRAS','COMUM'),
('inventory','extraSlotCpuElite','CPU Expansora de Extras • Elite','EXTRAS','ELITE'),
('inventory','rep2','Nanobot de Reparo • Comum','EXTRAS','COMUM'),
('inventory','repElite','Nanobot de Reparo • Elite','EXTRAS','ELITE'),
('inventory','cargoCpuCommon','Módulo de Porão • Comum','EXTRAS','COMUM'),
('inventory','cargoCpuElite','Módulo de Porão • Elite','EXTRAS','ELITE'),
('inventory','ammoAutoBuyCpu','Repositor Automático','EXTRAS','COMUM'),
('inventory','remoteTraderCpuElite','Terminal Mercante Remoto • Elite','EXTRAS','ELITE'),
('drone','flax','Halo','DRONES','COMUM'),
('drone','iris','Nova','DRONES','ELITE'),
('ship','phoenix','Aurora','NAVES','EVENTO'),
('ship','liberator','Pioneer','NAVES','COMUM'),
('ship','piranha','Raptor','NAVES','COMUM'),
('ship','nostromo','Meridian','NAVES','COMUM'),
('ship','bigboy','Bastion','NAVES','COMUM'),
('ship','nDiplomat','Concord','NAVES','COMUM'),
('ship','nEnvoy','Vanguard','NAVES','COMUM'),
('ship','nAmbassador','Sovereign','NAVES','COMUM'),
('ship','leonov','Lynx','NAVES','ELITE'),
('ship','vengeance','Valkyrie','NAVES','ELITE'),
('ship','goliath','Leviathan','NAVES','ELITE'),
('ship','pusat','Striker','NAVES','ELITE'),
('ship','aegis','Seraph','NAVES','EVENTO'),
('ship','basilisk','Venatrix','NAVES','EVENTO'),
('ship','berserker','Ravager','NAVES','EVENTO'),
('ship','centurion','Praetor','NAVES','EVENTO'),
('ship','citadel','Bulwark','NAVES','EVENTO'),
('ship','cyborg','Nexus Prime','NAVES','EVENTO'),
('ship','defcom','Phantom','NAVES','EVENTO'),
('ship','defcomRaven','Wraith','NAVES','EVENTO'),
('ship','diminisher','Nullifier','NAVES','EVENTO'),
('ship','disruptor','Interdictor','NAVES','EVENTO'),
('ship','goliathX','Leviathan-X','NAVES','EVENTO'),
('ship','hammerclaw','Ironclaw','NAVES','EVENTO'),
('ship','hecate','Lumina','NAVES','EVENTO'),
('ship','holo','Mirage','NAVES','EVENTO'),
('ship','hyperion','Gravastar','NAVES','EVENTO'),
('ship','keres','Plaguewing','NAVES','EVENTO'),
('ship','mimesis','Echo','NAVES','EVENTO'),
('ship','orcus','Doppel','NAVES','EVENTO'),
('ship','paladin','Warden','NAVES','EVENTO'),
('ship','retiarus','Lancer','NAVES','EVENTO'),
('ship','sentinel','Guardian','NAVES','EVENTO'),
('ship','solace','Reclaimer','NAVES','EVENTO'),
('ship','solaris','Helios','NAVES','EVENTO'),
('ship','spearhead','Pathfinder','NAVES','EVENTO'),
('ship','spectrum','Prism','NAVES','EVENTO'),
('ship','tartarus','Hellrunner','NAVES','EVENTO'),
('ship','tempest','Stormrider','NAVES','EVENTO'),
('ship','venom','Viper','NAVES','EVENTO'),
('ship','yamato','Kensei','NAVES','EVENTO'),
('ship','yRonin','Shogun','NAVES','EVENTO'),
('ship','zephyr','Gale','NAVES','EVENTO'),
('ammo','lcb10','PLS-1','MUNIÇÕES','COMUM'),
('ammo','mcb25','PLS-2','MUNIÇÕES','COMUM'),
('ammo','mcb50','PLS-3','MUNIÇÕES','ELITE'),
('ammo','ucb100','PLS-4','MUNIÇÕES','ELITE'),
('ammo','sab50','SIP-2','MUNIÇÕES','ELITE'),
('rocket','r310','CMT-1','MÍSSEIS','COMUM'),
('rocket','plt2026','CMT-2','MÍSSEIS','COMUM'),
('rocket','plt2021','CMT-3','MÍSSEIS','ELITE'),
('rocket','plt3030','CMT-4','MÍSSEIS','ELITE'),
('cargo','Prometium','Ferron','RECURSOS','RECURSO'),
('cargo','Endurium','Cryon','RECURSOS','RECURSO'),
('cargo','Terbium','Virel','RECURSOS','RECURSO'),
('cargo','Prometid','Ferrite','RECURSOS','RECURSO'),
('cargo','Duranium','Duracite','RECURSOS','RECURSO'),
('cargo','Promerium','Solarium','RECURSOS','RECURSO'),
('cargo','Xenomit','Voidite','RECURSOS','RECURSO'),
('premium','premium','Premium (escolha os dias)','PREMIUM E PASSE','PREMIUM'),
('battle_pass','battle_pass','Passe Premium da temporada','PREMIUM E PASSE','PASSE'),
('credits','credits','Créditos (CR)','MOEDAS','MOEDA'),
('uridium','uridium','Stellarium (STL)','MOEDAS','MOEDA')
ON CONFLICT (kind,item_id) DO UPDATE SET name=excluded.name,category=excluded.category,rarity=excluded.rarity;

create table if not exists public.game_coupons_v193(
 code text primary key check(code ~ '^[A-Z0-9][A-Z0-9_-]{3,63}$'),
 title text not null check(char_length(title) between 3 and 100),
 rewards jsonb not null check(jsonb_typeof(rewards)='array' and jsonb_array_length(rewards) between 1 and 12),
 active boolean not null default true,
 min_level integer not null default 1 check(min_level between 1 and 44),
 max_uses integer not null default 1 check(max_uses between 1 and 100000),
 redeemed_count integer not null default 0,
 starts_at timestamptz not null default now(),
 expires_at timestamptz,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 check(expires_at is null or expires_at>starts_at)
);
create table if not exists public.game_coupon_redemptions_v193(
 code text not null references public.game_coupons_v193(code),
 user_id uuid not null references auth.users(id),
 redeemed_at timestamptz not null default now(),
 rewards_snapshot jsonb not null,
 primary key(code,user_id)
);
create index if not exists game_coupon_redemptions_v193_account_idx on public.game_coupon_redemptions_v193(user_id,redeemed_at desc);
alter table public.game_coupons_v193 enable row level security;
alter table public.game_coupon_redemptions_v193 enable row level security;
revoke all on public.game_coupons_v193 from public,anon,authenticated;
revoke all on public.game_coupon_redemptions_v193 from public,anon,authenticated;

create or replace function public.admin_coupon_dashboard_v193()
returns jsonb language plpgsql security definer set search_path = '' as $fn$
declare uid uuid:=auth.uid();
begin
 if uid is null or not exists(select 1 from public.game_admins where user_id=uid and lower(role)='admin') then
  raise exception 'Acesso administrativo negado.';
 end if;
 return jsonb_build_object(
   'catalog',coalesce((select jsonb_agg(jsonb_build_object('kind',kind,'id',item_id,'name',name,'category',category,'rarity',rarity) order by category,rarity,name) from public.game_coupon_reward_catalog_v193),'[]'::jsonb),
   'coupons',coalesce((select jsonb_agg(jsonb_build_object('code',code,'title',title,'rewards',rewards,'active',active,'max_uses',max_uses,'redeemed_count',redeemed_count,'min_level',min_level,'starts_at',starts_at,'expires_at',expires_at,'created_at',created_at) order by created_at desc) from (select * from public.game_coupons_v193 order by created_at desc limit 100) q),'[]'::jsonb)
 );
end;$fn$;

create or replace function public.admin_create_coupon_v193(
 p_code text,p_title text,p_rewards jsonb,p_max_uses integer default 1,
 p_min_level integer default 1,p_starts_at timestamptz default null,p_expires_at timestamptz default null)
returns jsonb language plpgsql security definer set search_path = '' as $fn$
declare uid uuid:=auth.uid(); v_code text:=upper(btrim(coalesce(p_code,'')));
 r jsonb; v_kind text; v_id text; v_qty bigint; v_days integer; v_max bigint;
 v_start timestamptz:=coalesce(p_starts_at,now());
begin
 if uid is null or not exists(select 1 from public.game_admins where user_id=uid and lower(role)='admin') then raise exception 'Acesso administrativo negado.'; end if;
 if v_code='' then v_code:='SL-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,11)); end if;
 if v_code !~ '^[A-Z0-9][A-Z0-9_-]{3,63}$' or v_code='EVENTO7D' then raise exception 'Código inválido ou reservado.'; end if;
 if exists(select 1 from public.game_coupons_v1821 where code=v_code) then raise exception 'Este código já existe no sistema antigo.'; end if;
 if char_length(btrim(coalesce(p_title,''))) not between 3 and 100 then raise exception 'Título deve ter entre 3 e 100 caracteres.'; end if;
 if coalesce(p_max_uses,0) not between 1 and 100000 then raise exception 'Limite de usos inválido.'; end if;
 if coalesce(p_min_level,0) not between 1 and 44 then raise exception 'Nível mínimo inválido.'; end if;
 if p_expires_at is not null and p_expires_at<=v_start then raise exception 'Validade precisa ser posterior ao início.'; end if;
 if jsonb_typeof(p_rewards) is distinct from 'array' or jsonb_array_length(p_rewards) not between 1 and 12 then raise exception 'Escolha de 1 a 12 prêmios.'; end if;
 for r in select value from jsonb_array_elements(p_rewards) loop
   if jsonb_typeof(r)<>'object' then raise exception 'Estrutura de prêmio inválida.'; end if;
   v_kind:=coalesce(r->>'kind',''); v_id:=coalesce(r->>'id','');
   if not exists(select 1 from public.game_coupon_reward_catalog_v193 where kind=v_kind and item_id=v_id) then
     raise exception 'Prêmio não cadastrado no catálogo: % (%).',v_id,v_kind;
   end if;
   if v_kind='premium' then
     v_days:=coalesce(nullif(r->>'days','')::integer,0);
     if v_days not between 1 and 365 then raise exception 'Premium: escolha de 1 a 365 dias.'; end if;
   elsif v_kind='battle_pass' then
     if coalesce((r->>'qty')::integer,1)<>1 then raise exception 'Passe não aceita quantidade diferente de 1.'; end if;
   else
     v_qty:=coalesce(nullif(r->>'qty','')::bigint,0);
     v_max:=case when v_kind in ('ship') then 1 when v_kind='drone' then 8 when v_kind='inventory' then 10000 when v_kind in ('ammo','rocket') then 10000000 when v_kind='cargo' then 100000 when v_kind in ('credits','uridium') then 100000000 else 0 end;
     if v_qty not between 1 and v_max then raise exception 'Quantidade inválida para %: máximo %.',v_id,v_max; end if;
   end if;
 end loop;
 insert into public.game_coupons_v193(code,title,rewards,active,max_uses,min_level,starts_at,expires_at,created_by)
 values(v_code,btrim(p_title),p_rewards,true,p_max_uses,p_min_level,v_start,p_expires_at,uid);
 return jsonb_build_object('ok',true,'code',v_code,'title',btrim(p_title));
exception when unique_violation then raise exception 'Este código já está em uso.';
end;$fn$;

create or replace function public.admin_set_coupon_active_v193(p_code text,p_active boolean)
returns jsonb language plpgsql security definer set search_path = '' as $fn$
declare uid uuid:=auth.uid();v_code text:=upper(btrim(coalesce(p_code,'')));
begin
 if uid is null or not exists(select 1 from public.game_admins where user_id=uid and lower(role)='admin') then raise exception 'Acesso administrativo negado.'; end if;
 update public.game_coupons_v193 set active=coalesce(p_active,false) where code=v_code;
 if not found then raise exception 'Cupom não encontrado.'; end if;
 return jsonb_build_object('ok',true,'code',v_code,'active',coalesce(p_active,false));
end;$fn$;

create or replace function public.redeem_game_coupon_v193(p_code text)
returns jsonb language plpgsql security definer set search_path = '' as $fn$
declare uid uuid:=auth.uid(); v_code text:=upper(btrim(coalesce(p_code,'')));
 rec public.game_coupons_v193%rowtype; saved jsonb;r jsonb;
 k text;i text;qty bigint;old_val numeric;v_days integer;old_until timestamptz;
 season text;slots integer;drone_count integer;v_drone jsonb;v_drones jsonb;v_cargo jsonb;
 v_result jsonb; v_limit bigint;
begin
 if uid is null then raise exception 'Entre na sua conta para resgatar.'; end if;
 select * into rec from public.game_coupons_v193 where code=v_code for update;
 if not found then return jsonb_build_object('handled',false); end if;
 if not rec.active or rec.starts_at>now() or (rec.expires_at is not null and rec.expires_at<=now()) then raise exception 'Cupom inativo ou expirado.'; end if;
 if rec.redeemed_count>=rec.max_uses then raise exception 'Cupom esgotado.'; end if;
 if exists(select 1 from public.game_coupon_redemptions_v193 where code=v_code and user_id=uid) then raise exception 'Você já utilizou este cupom.'; end if;
 select state into saved from public.game_saves where user_id=uid for update;
 if jsonb_typeof(saved) is distinct from 'object' then raise exception 'Salve um personagem antes de resgatar.'; end if;
 if coalesce(nullif(saved->>'accountOwnerId',''),uid::text)<>uid::text then raise exception 'Save de outro jogador.'; end if;
 if coalesce((saved #>> '{profile,level}')::integer,1)<rec.min_level then raise exception 'Cupom exige nível %.',rec.min_level; end if;
 for r in select value from jsonb_array_elements(rec.rewards) loop
   k:=r->>'kind';i:=r->>'id';qty:=coalesce(nullif(r->>'qty','')::bigint,1);
   -- Desconfie de reward JSON injetado: revalide o catálogo também ao resgatar.
   if not exists(select 1 from public.game_coupon_reward_catalog_v193 where kind=k and item_id=i) then raise exception 'Prêmio sem cadastro autorizado.'; end if;
   if k='premium' then
     v_days:=coalesce((r->>'days')::integer,0);
     if v_days not between 1 and 365 then raise exception 'Premium inválido.'; end if;
     insert into public.premium_accounts_v12(user_id,premium_until,updated_at) values(uid,now()+(v_days||' days')::interval,now())
     on conflict(user_id) do update set premium_until=greatest(now(),coalesce(public.premium_accounts_v12.premium_until,now()))+(v_days||' days')::interval,updated_at=now();
   elsif k='battle_pass' then
     select season_key into season from public.game_battle_pass_seasons_v1817b where enabled and starts_at<=now() and (ends_at is null or ends_at>now()) order by starts_at desc limit 1;
     if season is null then raise exception 'Nenhuma temporada ativa para o Passe Premium.'; end if;
     if exists(select 1 from public.premium_accounts_v12 where user_id=uid and battle_pass_season=season) then raise exception 'Passe Premium desta temporada já está ativo.'; end if;
     insert into public.premium_accounts_v12(user_id,battle_pass_season,updated_at) values(uid,season,now())
     on conflict(user_id) do update set battle_pass_season=excluded.battle_pass_season,updated_at=now();
   elsif k in ('credits','uridium') then
     if qty not between 1 and 100000000 then raise exception 'Valor inválido.'; end if;
     old_val:=coalesce((saved->'profile'->>k)::numeric,0);
     if old_val+qty>100000000000000 then raise exception 'Limite de saldo excedido.'; end if;
     saved:=jsonb_set(saved,ARRAY['profile',k],to_jsonb(old_val+qty),true);
     update public.profiles set credits=case when k='credits' then (old_val+qty)::bigint else credits end,
       uridium=case when k='uridium' then (old_val+qty)::bigint else uridium end,updated_at=now() where id=uid;
   elsif k='ship' then
     if qty<>1 then raise exception 'Nave aceita 1 unidade.'; end if;
     if coalesce(saved->'ownedShips','[]'::jsonb) ? i then raise exception 'Você já possui esta nave.'; end if;
     saved:=jsonb_set(saved,'{ownedShips}',coalesce(saved->'ownedShips','[]'::jsonb)||jsonb_build_array(i),true);
   elsif k='drone' then
     v_drones:=coalesce(saved->'drones','[]'::jsonb);
     if jsonb_typeof(v_drones)<>'array' then raise exception 'Drones inválidos.'; end if;
     drone_count:=jsonb_array_length(v_drones);
     if qty<1 or qty>8 or drone_count+qty>8 then raise exception 'O jogador precisa de slots livres para receber os drones.'; end if;
     slots:=case when i='iris' then 2 when i='flax' then 1 else 0 end;
     if slots=0 then raise exception 'Drone desconhecido.'; end if;
     for j in 1..qty loop
       v_drone:=jsonb_build_object('id','d_coupon_'||replace(gen_random_uuid()::text,'-',''),'type',i,'slots',case when slots=2 then '[null,null]'::jsonb else '[null]'::jsonb end);
       v_drones:=v_drones||jsonb_build_array(v_drone);
     end loop;
     saved:=jsonb_set(saved,'{drones}',v_drones,true);
   elsif k in ('inventory','ammo','rocket','cargo') then
     v_limit:=case when k='inventory' then 10000 when k='cargo' then 100000 else 10000000 end;
     if qty<1 or qty>v_limit then raise exception 'Quantidade inválida.'; end if;
     k:=case when k='rocket' then 'rockets' else k end;
     old_val:=coalesce((saved->k->>i)::numeric,0);
     if old_val+qty>1000000000 then raise exception 'Estoque máximo excedido.'; end if;
     if k='cargo' and i<>'Xenomit' then
       -- Não gerar minérios acima da capacidade do porão: compatível com cargo do jogo.
       if qty>10000 then raise exception 'Para recursos de porão, use até 10.000 por cupom.'; end if;
     end if;
     saved:=jsonb_set(saved,array[k,i],to_jsonb(old_val+qty),true);
   else raise exception 'Prêmio não reconhecido.';
   end if;
 end loop;
 saved:=jsonb_set(saved,'{couponClaimsV1821}',coalesce(saved->'couponClaimsV1821','{}'::jsonb)||jsonb_build_object(v_code,now()::text),true);
 update public.game_saves set state=saved,updated_at=now() where user_id=uid;
 insert into public.game_coupon_redemptions_v193(code,user_id,rewards_snapshot) values(v_code,uid,rec.rewards);
 update public.game_coupons_v193 set redeemed_count=redeemed_count+1 where code=v_code;
 return jsonb_build_object('handled',true,'ok',true,'code',v_code,'title',rec.title,'rewards',rec.rewards,'state',saved);
end;$fn$;

revoke all on function public.admin_coupon_dashboard_v193() from public,anon,authenticated;
revoke all on function public.admin_create_coupon_v193(text,text,jsonb,integer,integer,timestamptz,timestamptz) from public,anon,authenticated;
revoke all on function public.admin_set_coupon_active_v193(text,boolean) from public,anon,authenticated;
revoke all on function public.redeem_game_coupon_v193(text) from public,anon,authenticated;
grant execute on function public.admin_coupon_dashboard_v193() to authenticated;
grant execute on function public.admin_create_coupon_v193(text,text,jsonb,integer,integer,timestamptz,timestamptz) to authenticated;
grant execute on function public.admin_set_coupon_active_v193(text,boolean) to authenticated;
grant execute on function public.redeem_game_coupon_v193(text) to authenticated;
