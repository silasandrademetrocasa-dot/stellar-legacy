-- STELLAR LEGACY — GUERRA DE FACÇÕES | instalação única, transacional, sem apagar saves/donos
-- Requer migração V21.4.0 instalada. Execute antes de publicar o código novo.
begin;

create table if not exists public.stellar_war_rules (
 id int primary key default 1 check (id=1),
 daily_credits_per_node int not null default 400 check (daily_credits_per_node between 0 and 2000),
 daily_credits_cap int not null default 2800 check (daily_credits_cap between 0 and 10000),
 capture_points int not null default 10 check (capture_points between 1 and 100),
 defense_points int not null default 3 check (defense_points between 1 and 50),
 updated_at timestamptz not null default now()
);
insert into public.stellar_war_rules(id) values (1) on conflict do nothing;

create table if not exists public.stellar_war_campaigns (
 id uuid primary key default gen_random_uuid(),
 title text not null check (length(trim(title)) between 3 and 70),
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 enabled boolean not null default false,
 min_points int not null default 10 check(min_points between 1 and 10000),
 reward_credits int not null default 2500 check(reward_credits between 0 and 10000),
 reward_stl int not null default 10 check(reward_stl between 0 and 50),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check (ends_at>starts_at+interval '5 minutes' and ends_at<=starts_at+interval '31 days')
);
create index if not exists stellar_war_campaign_dates_idx on public.stellar_war_campaigns(starts_at,ends_at);

-- Campanhas não podem se sobrepor ou ter regras de prêmio mudadas após início.
create or replace function public.stellar_war_validate_campaign()
returns trigger language plpgsql set search_path=public as $$
begin
 perform pg_advisory_xact_lock(552150021);
 if exists(select 1 from public.stellar_war_campaigns c where c.enabled and new.enabled and c.id is distinct from new.id and c.starts_at<new.ends_at and c.ends_at>new.starts_at)
 then raise exception 'WAR_CAMPAIGN_DATE_CONFLICT'; end if;
 if tg_op='UPDATE' and (now()>=old.starts_at or exists(select 1 from public.stellar_war_scores s where s.campaign_id=old.id)) then
   if row(old.title,old.starts_at,old.ends_at,old.min_points,old.reward_credits,old.reward_stl,old.enabled)
   is distinct from row(new.title,new.starts_at,new.ends_at,new.min_points,new.reward_credits,new.reward_stl,new.enabled)
   then raise exception 'WAR_CAMPAIGN_LOCKED'; end if;
 end if;
 new.updated_at=now();return new;
end;$$;

create table if not exists public.stellar_war_scores (
 campaign_id uuid not null references public.stellar_war_campaigns(id) on delete restrict,
 user_id uuid not null references auth.users(id) on delete cascade,
 faction text not null check(faction in('earth','mars','jupiter')),
 captures int not null default 0 check(captures>=0),
 defenses int not null default 0 check(defenses>=0),
 points int not null default 0 check(points>=0),
 updated_at timestamptz not null default now(),
 primary key(campaign_id,user_id)
);
create index if not exists stellar_war_scores_rank_idx on public.stellar_war_scores(campaign_id,points desc);
create trigger stellar_war_campaign_guard before insert or update on public.stellar_war_campaigns
for each row execute function public.stellar_war_validate_campaign();

create table if not exists public.stellar_war_actions (
 id bigint generated always as identity primary key,
 occurred_at timestamptz not null default now(),
 campaign_id uuid references public.stellar_war_campaigns(id) on delete restrict,
 kind text not null check(kind in('capture','defense')),
 map_id text not null check(map_id in('b41','b42','b43')),
 node_id text not null check(node_id in('A','B','C')),
 faction text not null check(faction in('earth','mars','jupiter')),
 former_owner text,
 actor_user_id uuid references auth.users(id) on delete set null,
 points int not null default 0 check(points>=0)
);
create index if not exists stellar_war_actions_recent_idx on public.stellar_war_actions(occurred_at desc);
create index if not exists stellar_war_actions_campaign_idx on public.stellar_war_actions(campaign_id,occurred_at desc);

create table if not exists public.stellar_war_defense_cooldowns (
 user_id uuid not null references auth.users(id) on delete cascade,
 map_id text not null,
 node_id text not null,
 defended_at timestamptz not null default now(),
 primary key(user_id,map_id,node_id)
);
create table if not exists public.stellar_war_supply_claims (
 user_id uuid not null references auth.users(id) on delete cascade,
 claim_day date not null,
 faction text not null,
 owned_nodes int not null,
 credits bigint not null,
 claimed_at timestamptz not null default now(),
 primary key(user_id,claim_day)
);
create table if not exists public.stellar_war_campaign_claims (
 campaign_id uuid not null references public.stellar_war_campaigns(id) on delete restrict,
 user_id uuid not null references auth.users(id) on delete cascade,
 faction text not null,
 points int not null,
 victorious boolean not null,
 credits bigint not null,
 stl bigint not null,
 claimed_at timestamptz not null default now(),
 primary key(campaign_id,user_id)
);

-- Auditoria no mesmo COMMIT do domínio: só o servidor de jogo, com service_role.
create or replace function public.stellar_commit_warfront_capture(p_map_id text,p_node_id text,p_faction text,p_expected_revision bigint,p_actor uuid)
returns public.stellar_warfront_nodes
language plpgsql security invoker set search_path=public as $$
declare v_row public.stellar_warfront_nodes;v_campaign uuid;v_points int;v_old text;
begin
 if p_map_id not in ('b41','b42','b43') or p_node_id not in ('A','B','C') or p_faction not in ('earth','mars','jupiter') or p_actor is null then raise exception 'INVALID_WARFRONT_CAPTURE';end if;
 select owner into v_old from public.stellar_warfront_nodes where map_id=p_map_id and node_id=p_node_id for update;
 update public.stellar_warfront_nodes set owner=p_faction,captured_at=now(),captured_by=p_actor,revision=revision+1
 where map_id=p_map_id and node_id=p_node_id and revision=p_expected_revision and owner is distinct from p_faction returning * into v_row;
 if not found then raise exception 'WARFRONT_REVISION_CONFLICT';end if;
 select id into v_campaign from public.stellar_war_campaigns where enabled and now()>=starts_at and now()<ends_at order by starts_at desc limit 1;
 select capture_points into v_points from public.stellar_war_rules where id=1;
 v_points:=coalesce(v_points,10);
 insert into public.stellar_war_actions(campaign_id,kind,map_id,node_id,faction,former_owner,actor_user_id,points)
 values(v_campaign,'capture',p_map_id,p_node_id,p_faction,v_old,p_actor,case when v_campaign is null then 0 else v_points end);
 if v_campaign is not null then
   insert into public.stellar_war_scores(campaign_id,user_id,faction,captures,points)
   values(v_campaign,p_actor,p_faction,1,v_points)
   on conflict(campaign_id,user_id) do update set captures=public.stellar_war_scores.captures+1,points=public.stellar_war_scores.points+excluded.points,updated_at=now();
 end if;
 return v_row;
end;$$;
revoke all on function public.stellar_commit_warfront_capture(text,text,text,bigint,uuid) from public,anon,authenticated;
grant execute on function public.stellar_commit_warfront_capture(text,text,text,bigint,uuid) to service_role;

-- Defesa válida: facção permanece proprietária; no máximo uma recompensa de pontos por relé/piloto a cada 10 min.
create or replace function public.stellar_record_war_defense(p_map_id text,p_node_id text,p_faction text,p_actor uuid)
returns boolean language plpgsql security invoker set search_path=public as $$
declare v_campaign uuid;v_points int;
begin
 if p_map_id not in('b41','b42','b43') or p_node_id not in('A','B','C') or p_faction not in('earth','mars','jupiter') or p_actor is null then raise exception 'INVALID_DEFENSE';end if;
 if not exists(select 1 from public.stellar_warfront_nodes where map_id=p_map_id and node_id=p_node_id and owner=p_faction) then return false;end if;
 insert into public.stellar_war_defense_cooldowns(user_id,map_id,node_id,defended_at) values(p_actor,p_map_id,p_node_id,now())
 on conflict(user_id,map_id,node_id) do update set defended_at=excluded.defended_at
 where public.stellar_war_defense_cooldowns.defended_at<now()-interval '10 minutes';
 if not found then return false;end if;
 select id into v_campaign from public.stellar_war_campaigns where enabled and now()>=starts_at and now()<ends_at order by starts_at desc limit 1;
 select defense_points into v_points from public.stellar_war_rules where id=1;v_points:=coalesce(v_points,3);
 insert into public.stellar_war_actions(campaign_id,kind,map_id,node_id,faction,former_owner,actor_user_id,points)
 values(v_campaign,'defense',p_map_id,p_node_id,p_faction,p_faction,p_actor,case when v_campaign is null then 0 else v_points end);
 if v_campaign is not null then
 insert into public.stellar_war_scores(campaign_id,user_id,faction,defenses,points) values(v_campaign,p_actor,p_faction,1,v_points)
 on conflict(campaign_id,user_id) do update set defenses=public.stellar_war_scores.defenses+1,points=public.stellar_war_scores.points+excluded.points,updated_at=now();
 end if;
 return true;
end;$$;
revoke all on function public.stellar_record_war_defense(text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.stellar_record_war_defense(text,text,text,uuid) to service_role;

-- Bônus logístico: resgate diário SEM moedas automáticas; não duplica e usa o save com lock.
create or replace function public.stellar_claim_war_supply()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_save jsonb;v_profile jsonb;v_faction text;v_count int;v_credits bigint;v_day date:=(now() at time zone 'America/Sao_Paulo')::date;v_revision bigint;v_previous bigint;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 select state into v_save from public.game_saves where user_id=v_uid for update;
 if v_save is null then raise exception 'SAVE_NOT_FOUND';end if;
 v_faction=v_save#>>'{profile,faction}';if v_faction not in('earth','mars','jupiter') then raise exception 'FACTION_REQUIRED';end if;
 select count(*) into v_count from public.stellar_warfront_nodes where owner=v_faction;
 if v_count=0 then raise exception 'NO_TERRITORY';end if;
 select least(daily_credits_cap,daily_credits_per_node*v_count) into v_credits from public.stellar_war_rules where id=1;
 v_credits:=coalesce(v_credits,0);
 if exists(select 1 from public.stellar_war_supply_claims where user_id=v_uid and claim_day=v_day) then
 return jsonb_build_object('ok',true,'already_claimed',true,'credits',0,'owned_nodes',v_count,'state',v_save);
 end if;
 insert into public.stellar_war_supply_claims(user_id,claim_day,faction,owned_nodes,credits) values(v_uid,v_day,v_faction,v_count,v_credits);
 v_profile=coalesce(v_save->'profile','{}'::jsonb);
 v_previous=greatest(0,coalesce((v_profile->>'credits')::bigint,0));
 v_profile=jsonb_set(v_profile,'{credits}',to_jsonb(v_previous+v_credits),true);
 v_revision=coalesce((v_save->>'serverEliteRevision')::bigint,0)+1;
 v_save=jsonb_set(jsonb_set(v_save,'{profile}',v_profile,true),'{serverEliteRevision}',to_jsonb(v_revision),true);
 update public.game_saves set state=v_save,updated_at=now() where user_id=v_uid;
 return jsonb_build_object('ok',true,'already_claimed',false,'credits',v_credits,'owned_nodes',v_count,'state',v_save);
end;$$;
revoke all on function public.stellar_claim_war_supply() from public,anon;
grant execute on function public.stellar_claim_war_supply() to authenticated;

-- Prêmios encerrados: recompensa individual calculada no servidor. Resultado da campanha NÃO muda o dono dos relés.
create or replace function public.stellar_claim_war_campaign(p_campaign_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_campaign public.stellar_war_campaigns;v_score public.stellar_war_scores;v_best bigint;v_team bigint;v_winner boolean;v_credits bigint;v_stl bigint;v_save jsonb;v_profile jsonb;v_revision bigint;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 select * into v_campaign from public.stellar_war_campaigns where id=p_campaign_id and enabled=true and ends_at<=now();
 if not found then raise exception 'CAMPAIGN_NOT_FINISHED';end if;
 select * into v_score from public.stellar_war_scores where campaign_id=p_campaign_id and user_id=v_uid;
 if not found or v_score.points<v_campaign.min_points then raise exception 'CAMPAIGN_NOT_ELIGIBLE';end if;
 select max(total) into v_best from (select sum(points) as total from public.stellar_war_scores where campaign_id=p_campaign_id group by faction) teams;
 select sum(points) into v_team from public.stellar_war_scores where campaign_id=p_campaign_id and faction=v_score.faction;
 v_winner=coalesce(v_team,0)=coalesce(v_best,0) and coalesce(v_team,0)>0;
 v_credits=case when v_winner then v_campaign.reward_credits else floor(v_campaign.reward_credits::numeric/4)::bigint end;
 v_stl=case when v_winner then v_campaign.reward_stl else 0 end;
 select state into v_save from public.game_saves where user_id=v_uid for update;
 if v_save is null then raise exception 'SAVE_NOT_FOUND';end if;
 if exists(select 1 from public.stellar_war_campaign_claims where user_id=v_uid and campaign_id=p_campaign_id) then
 return jsonb_build_object('ok',true,'already_claimed',true,'state',v_save);
 end if;
 insert into public.stellar_war_campaign_claims(campaign_id,user_id,faction,points,victorious,credits,stl)
 values(p_campaign_id,v_uid,v_score.faction,v_score.points,v_winner,v_credits,v_stl);
 v_profile=coalesce(v_save->'profile','{}'::jsonb);
 v_profile=jsonb_set(v_profile,'{credits}',to_jsonb(greatest(0,coalesce((v_profile->>'credits')::bigint,0))+v_credits),true);
 v_profile=jsonb_set(v_profile,'{uridium}',to_jsonb(greatest(0,coalesce((v_profile->>'uridium')::bigint,0))+v_stl),true);
 v_revision=coalesce((v_save->>'serverEliteRevision')::bigint,0)+1;
 v_save=jsonb_set(jsonb_set(v_save,'{profile}',v_profile,true),'{serverEliteRevision}',to_jsonb(v_revision),true);
 update public.game_saves set state=v_save,updated_at=now() where user_id=v_uid;
 return jsonb_build_object('ok',true,'already_claimed',false,'victorious',v_winner,'credits',v_credits,'stl',v_stl,'state',v_save);
end;$$;
revoke all on function public.stellar_claim_war_campaign(uuid) from public,anon;
grant execute on function public.stellar_claim_war_campaign(uuid) to authenticated;

-- APIs de serviço (somente Render); tabelas não são editáveis diretamente pelo navegador.
do $$declare t text;begin
 foreach t in array array['stellar_war_rules','stellar_war_campaigns','stellar_war_scores','stellar_war_actions','stellar_war_defense_cooldowns','stellar_war_supply_claims','stellar_war_campaign_claims'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select,insert,update on public.%I to service_role',t);
 end loop;
end$$;
-- service role usa sequences em tabelas de auditoria.
grant usage,select on sequence public.stellar_war_actions_id_seq to service_role;
commit;
