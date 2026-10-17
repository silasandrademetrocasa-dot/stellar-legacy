-- STELLAR LEGACY — CONTROLE PERSISTENTE A/B/C E OPERAÇÕES DE ELITE
-- Execute UMA VEZ no SQL Editor do Supabase ANTES do deploy do ZIP.
-- As funções de escrita do domínio são exclusivamente de serviço; navegador não pode escolher dono.
begin;
create table if not exists public.stellar_warfront_nodes (
  map_id text not null check (map_id in ('b41','b42','b43')),
  node_id text not null check (node_id in ('A','B','C')),
  owner text check (owner is null or owner in ('earth','mars','jupiter')),
  revision bigint not null default 0 check (revision >= 0),
  captured_at timestamptz,
  captured_by uuid,
  primary key(map_id,node_id)
);
insert into public.stellar_warfront_nodes(map_id,node_id)
select m,n from unnest(array['b41','b42','b43']) m cross join unnest(array['A','B','C']) n
on conflict do nothing;
alter table public.stellar_warfront_nodes enable row level security;
revoke all on public.stellar_warfront_nodes from public,anon,authenticated;
grant select,update on public.stellar_warfront_nodes to service_role;
-- Nenhuma política de escrita pelo navegador.

create or replace function public.stellar_commit_warfront_capture(p_map_id text,p_node_id text,p_faction text,p_expected_revision bigint,p_actor uuid)
returns public.stellar_warfront_nodes
language plpgsql security invoker set search_path=public as $$
declare v_row public.stellar_warfront_nodes;
begin
 if p_map_id not in ('b41','b42','b43') or p_node_id not in ('A','B','C') or p_faction not in ('earth','mars','jupiter') or p_actor is null then
   raise exception 'INVALID_WARFRONT_CAPTURE';
 end if;
 update public.stellar_warfront_nodes set owner=p_faction, captured_at=now(), captured_by=p_actor, revision=revision+1
 where map_id=p_map_id and node_id=p_node_id and revision=p_expected_revision and owner is distinct from p_faction
 returning * into v_row;
 if not found then raise exception 'WARFRONT_REVISION_CONFLICT'; end if;
 return v_row;
end;$$;
revoke all on function public.stellar_commit_warfront_capture(text,text,text,bigint,uuid) from public,anon,authenticated;
grant execute on function public.stellar_commit_warfront_capture(text,text,text,bigint,uuid) to service_role;

create table if not exists public.stellar_elite_counters (
 user_id uuid primary key references auth.users(id) on delete cascade,
 npc_kills bigint not null default 0 check (npc_kills>=0),
 sector_captures bigint not null default 0 check (sector_captures>=0),
 updated_at timestamptz not null default now()
);
create table if not exists public.stellar_elite_claims (
 user_id uuid not null references auth.users(id) on delete cascade,
 objective_id text not null,
 title text not null,
 credits bigint not null default 0,
 stl bigint not null default 0,
 claimed_at timestamptz not null default now(),
 primary key(user_id,objective_id)
);
alter table public.stellar_elite_counters enable row level security;
alter table public.stellar_elite_claims enable row level security;
revoke all on public.stellar_elite_counters,public.stellar_elite_claims from public,anon,authenticated;
grant select on public.stellar_elite_counters,public.stellar_elite_claims to authenticated;
grant select,insert,update on public.stellar_elite_counters to service_role;
grant select,insert on public.stellar_elite_claims to service_role;
drop policy if exists stellar_elite_counters_read on public.stellar_elite_counters;
create policy stellar_elite_counters_read on public.stellar_elite_counters for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists stellar_elite_claims_read on public.stellar_elite_claims;
create policy stellar_elite_claims_read on public.stellar_elite_claims for select to authenticated using (user_id=(select auth.uid()));

-- O servidor usa service_role; somente eventos efetivamente processados no Render contabilizam.
create or replace function public.stellar_record_elite_event(p_user_id uuid,p_kind text,p_amount int default 1)
returns void language plpgsql security invoker set search_path=public as $$
begin
 if p_user_id is null or p_kind not in ('npc_kill','sector_capture') or p_amount<1 or p_amount>100 then
   raise exception 'INVALID_ELITE_EVENT';
 end if;
 insert into public.stellar_elite_counters(user_id,npc_kills,sector_captures)
 values(p_user_id,case when p_kind='npc_kill' then p_amount else 0 end,case when p_kind='sector_capture' then p_amount else 0 end)
 on conflict(user_id) do update set
 npc_kills=public.stellar_elite_counters.npc_kills+excluded.npc_kills,
 sector_captures=public.stellar_elite_counters.sector_captures+excluded.sector_captures,
 updated_at=now();
end;$$;
revoke all on function public.stellar_record_elite_event(uuid,text,int) from public,anon,authenticated;
grant execute on function public.stellar_record_elite_event(uuid,text,int) to service_role;

-- O ADM pode personalizar somente as duas metricas que o servidor consegue validar.
create table if not exists public.stellar_elite_objectives (
 objective_id text primary key check(objective_id ~ '^[a-z][a-z0-9_]{2,39}$'),
 label text not null check(length(trim(label)) between 3 and 70),
 title text not null check(length(trim(title)) between 3 and 70),
 metric text not null check(metric in ('npc_kills','sector_captures')),
 target bigint not null check(target between 1 and 1000000),
 credits bigint not null default 0 check(credits between 0 and 500000),
 stl bigint not null default 0 check(stl between 0 and 1000),
 enabled boolean not null default false,
 sort_order int not null default 100,
 updated_at timestamptz not null default now()
);
insert into public.stellar_elite_objectives(objective_id,label,title,metric,target,credits,stl,enabled,sort_order) values
 ('capture_1','Primeira Conquista','Conquistador','sector_captures',1,5000,10,true,10),
 ('capture_5','Guardiao dos Reles','Guardiao de Setores','sector_captures',5,15000,25,true,20),
 ('capture_25','Dominio Galactico','Dominador Galactico','sector_captures',25,50000,100,true,30),
 ('hunt_100','Cacada Inicial','Cacador Estelar','npc_kills',100,3000,5,true,40),
 ('hunt_1000','Defensor do Cosmos','Defensor do Cosmos','npc_kills',1000,30000,30,true,50),
 ('hunt_10000','Lenda dos Cacadores','Lenda dos Cacadores','npc_kills',10000,100000,120,true,60)
on conflict(objective_id) do nothing;
alter table public.stellar_elite_objectives enable row level security;
revoke all on public.stellar_elite_objectives from public,anon,authenticated;
grant select on public.stellar_elite_objectives to authenticated;
grant select,insert,update on public.stellar_elite_objectives to service_role;
drop policy if exists stellar_elite_objectives_read on public.stellar_elite_objectives;
create policy stellar_elite_objectives_read on public.stellar_elite_objectives for select to authenticated using(enabled=true);

-- Premiacao atomica, idempotente, autenticada e com tabela independente do save local.
-- Somente seis objetivos comprovados pelo servidor podem conceder CR/STL/titulos.
create or replace function public.stellar_claim_elite_objective(p_objective_id text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
 v_uid uuid:=auth.uid();v_counters public.stellar_elite_counters;
 v_metric bigint;v_target bigint;v_cr bigint;v_stl bigint;v_title text;
 v_state jsonb;v_profile jsonb;v_rev bigint;v_objective public.stellar_elite_objectives;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 select * into v_objective from public.stellar_elite_objectives where objective_id=p_objective_id and enabled=true for share;
 if not found then raise exception 'UNKNOWN_ELITE_OBJECTIVE';end if;
 v_target:=v_objective.target;v_cr:=v_objective.credits;v_stl:=v_objective.stl;v_title:=v_objective.title;
 select * into v_counters from public.stellar_elite_counters where user_id=v_uid for update;
 v_metric:=case when v_objective.metric='sector_captures' then coalesce(v_counters.sector_captures,0) else coalesce(v_counters.npc_kills,0) end;
 if v_metric<v_target then raise exception 'ELITE_OBJECTIVE_NOT_COMPLETE';end if;
 select state into v_state from public.game_saves where user_id=v_uid for update;
 if v_state is null then raise exception 'SAVE_NOT_FOUND';end if;
 if exists(select 1 from public.stellar_elite_claims where user_id=v_uid and objective_id=p_objective_id) then
  return jsonb_build_object('ok',true,'already_claimed',true,'objective_id',p_objective_id,'state',v_state);
 end if;
 insert into public.stellar_elite_claims(user_id,objective_id,title,credits,stl) values(v_uid,p_objective_id,v_title,v_cr,v_stl);
 v_profile:=coalesce(v_state->'profile','{}'::jsonb);
 v_profile:=jsonb_set(v_profile,'{credits}',to_jsonb(greatest(0,coalesce(floor((v_profile->>'credits')::numeric)::bigint,0))+v_cr),true);
 v_profile:=jsonb_set(v_profile,'{uridium}',to_jsonb(greatest(0,coalesce(floor((v_profile->>'uridium')::numeric)::bigint,0))+v_stl),true);
 v_rev:=coalesce((v_state->>'serverEliteRevision')::bigint,0)+1;
 v_state:=jsonb_set(jsonb_set(v_state,'{profile}',v_profile,true),'{serverEliteRevision}',to_jsonb(v_rev),true);
 update public.game_saves set state=v_state,updated_at=now() where user_id=v_uid;
 return jsonb_build_object('ok',true,'already_claimed',false,'objective_id',p_objective_id,'title',v_title,'credits',v_cr,'stl',v_stl,'state',v_state);
end;$$;
revoke all on function public.stellar_claim_elite_objective(text) from public,anon;
grant execute on function public.stellar_claim_elite_objective(text) to authenticated;

-- Protecao contra sobrescrita de bonus por save antigo (inclusive requisicoes em voo).
create or replace function public.stellar_guard_elite_save_revision()
returns trigger language plpgsql set search_path=public as $$
begin
 if coalesce((new.state->>'serverEliteRevision')::bigint,0)<coalesce((old.state->>'serverEliteRevision')::bigint,0) then
   raise exception 'SAVE_ELITE_STALE';
 end if;
 return new;
end;$$;
drop trigger if exists stellar_guard_elite_save_revision on public.game_saves;
create trigger stellar_guard_elite_save_revision before update of state on public.game_saves
for each row execute function public.stellar_guard_elite_save_revision();
commit;
