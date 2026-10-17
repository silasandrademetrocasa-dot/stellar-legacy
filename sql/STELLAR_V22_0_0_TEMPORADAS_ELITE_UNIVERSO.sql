-- STELLAR LEGACY • TEMPORADAS COMPETITIVAS, ELITE EQUIPAVEL E DIRETIVAS DO UNIVERSO
-- Instalacao aditiva: nao altera saves existentes, relés A/B/C nem Passe atual.
-- Esta migracao NÃO inicia nenhuma temporada nem publica alertas automaticamente.
begin;
create table if not exists public.stellar_competitive_seasons (
 id uuid primary key default gen_random_uuid(),
 title text not null check (length(btrim(title)) between 3 and 70),
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 enabled boolean not null default false,
 min_points integer not null default 10 check(min_points between 1 and 10000),
 top_n integer not null default 10 check(top_n between 1 and 100),
 reward_credits integer not null default 0 check(reward_credits between 0 and 100000),
 reward_stl integer not null default 0 check(reward_stl between 0 and 100),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint stellar_season_valid_range check(ends_at>starts_at and ends_at<=starts_at+interval '90 days')
);
create index if not exists stellar_comp_seasons_dates_idx on public.stellar_competitive_seasons(enabled,ends_at desc);
create or replace function public.stellar_competitive_season_guard()
returns trigger language plpgsql set search_path=public as $$
begin
 if tg_op='UPDATE' and old.enabled and now()>=old.starts_at
    and (new.title,new.starts_at,new.ends_at,new.enabled,new.min_points,new.top_n,new.reward_credits,new.reward_stl)
      is distinct from
        (old.title,old.starts_at,old.ends_at,old.enabled,old.min_points,old.top_n,old.reward_credits,old.reward_stl) then
   raise exception 'SEASON_CONFIG_LOCKED_AFTER_START';
 end if;
 new.updated_at:=now();
 return new;
end;$$;
drop trigger if exists stellar_competitive_season_guard on public.stellar_competitive_seasons;
create trigger stellar_competitive_season_guard
before update on public.stellar_competitive_seasons
for each row execute function public.stellar_competitive_season_guard();

create table if not exists public.stellar_competitive_claims (
 season_id uuid not null references public.stellar_competitive_seasons(id) on delete restrict,
 user_id uuid not null references auth.users(id) on delete cascade,
 points integer not null,
 rank integer not null,
 credits integer not null,
 stl integer not null,
 claimed_at timestamptz not null default now(),
 primary key(season_id,user_id)
);
-- Rank alimentado EXCLUSIVAMENTE por capturas e defesas gravadas pelo servidor.
-- Nenhuma pontuacao do navegador, nenhum reset territorial.
create or replace view public.stellar_season_scores with (security_invoker=true) as
 select s.id as season_id,a.actor_user_id as user_id,a.faction,
 count(*) filter(where a.kind='capture')::integer as captures,
 count(*) filter(where a.kind='defense')::integer as defenses,
 sum(case when a.kind='capture' then 10 else 3 end)::integer as points
 from public.stellar_competitive_seasons s
 join public.stellar_war_actions a on a.occurred_at>=s.starts_at and a.occurred_at<s.ends_at
 where s.enabled and a.actor_user_id is not null
 group by s.id,a.actor_user_id,a.faction;
create or replace view public.stellar_season_clan_scores with (security_invoker=true) as
 select s.id as season_id,a.clan_id,a.faction,
 count(distinct a.actor_user_id)::integer as pilots,
 count(*) filter(where a.kind='capture')::integer as captures,
 count(*) filter(where a.kind='defense')::integer as defenses,
 sum(case when a.kind='capture' then 10 else 3 end)::integer as points
 from public.stellar_competitive_seasons s
 join public.stellar_war_actions a on a.occurred_at>=s.starts_at and a.occurred_at<s.ends_at
 where s.enabled and a.clan_id is not null
 group by s.id,a.clan_id,a.faction;

create table if not exists public.stellar_elite_selected_titles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 objective_id text not null,
 title text not null,
 equipped_at timestamptz not null default now()
);
create table if not exists public.stellar_world_directives (
 id bigint generated always as identity primary key,
 title text not null check(length(btrim(title)) between 3 and 80),
 description text not null default '' check(length(description)<=280),
 map_id text not null default 'all' check(map_id in ('all','x1','x2','x3','x4','x5','x6','x7','x8','b41','b42','b43','ggAlpha','ggBeta','ggGamma')),
 category text not null default 'alert' check(category in('alert','invasion','boss','resource')),
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 enabled boolean not null default false,
 updated_at timestamptz not null default now(),
 constraint stellar_directive_dates check(ends_at>starts_at and ends_at<=starts_at+interval '30 days')
);
create index if not exists stellar_directives_active_idx on public.stellar_world_directives(enabled,starts_at,ends_at);

-- Escrita administrativa SOMENTE pelo servidor com chave secreta.
do $$
declare t text;
begin
 foreach t in array array['stellar_competitive_seasons','stellar_competitive_claims','stellar_elite_selected_titles','stellar_world_directives'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select,insert,update on public.%I to service_role',t);
 end loop;
end;$$;
revoke all on public.stellar_season_scores,public.stellar_season_clan_scores from public,anon,authenticated;
grant select on public.stellar_season_scores,public.stellar_season_clan_scores to service_role;
grant usage,select on sequence public.stellar_world_directives_id_seq to service_role;
grant select on public.stellar_competitive_seasons,public.stellar_competitive_claims,public.stellar_elite_selected_titles,public.stellar_world_directives to authenticated;
create policy stellar_season_public_read on public.stellar_competitive_seasons for select to authenticated using(enabled);
create policy stellar_claims_own_read on public.stellar_competitive_claims for select to authenticated using(user_id=(select auth.uid()));
create policy stellar_title_own_read on public.stellar_elite_selected_titles for select to authenticated using(user_id=(select auth.uid()));
create policy stellar_directives_active_read on public.stellar_world_directives for select to authenticated using(enabled and starts_at<=now() and ends_at>now());

-- Titulo equipavel: precisa ter conquista REAL em stellar_elite_claims.
create or replace function public.stellar_equip_elite_title(p_objective_id text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid();v_title text;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 select title into v_title from public.stellar_elite_claims where user_id=v_uid and objective_id=p_objective_id;
 if v_title is null then raise exception 'ELITE_TITLE_NOT_EARNED';end if;
 insert into public.stellar_elite_selected_titles(user_id,objective_id,title)
 values(v_uid,p_objective_id,v_title)
 on conflict(user_id) do update set objective_id=excluded.objective_id,title=excluded.title,equipped_at=now();
 return jsonb_build_object('ok',true,'title',v_title,'objective_id',p_objective_id);
end;$$;
revoke all on function public.stellar_equip_elite_title(text) from public,anon;
grant execute on function public.stellar_equip_elite_title(text) to authenticated;

-- Ranking competitivo ao final da temporada. Resgate único e atômico no save.
-- Não usa pontos enviados pelo cliente; somente ações de combate registradas pelo servidor.
create or replace function public.stellar_claim_competitive_season(p_season_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid();v_season public.stellar_competitive_seasons;
 v_rank bigint;v_points bigint;v_state jsonb;v_profile jsonb;v_rev bigint;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 select * into v_season from public.stellar_competitive_seasons where id=p_season_id and enabled for share;
 if not found or now()<v_season.ends_at then raise exception 'SEASON_NOT_CLOSED';end if;
 select scores.rnk,scores.points into v_rank,v_points from (
  select user_id,points,row_number() over(order by points desc,user_id) as rnk from (
   select a.actor_user_id as user_id,sum(case when a.kind='capture' then 10 else 3 end)::bigint as points
   from public.stellar_war_actions a where a.occurred_at>=v_season.starts_at and a.occurred_at<v_season.ends_at and a.actor_user_id is not null
   group by a.actor_user_id
  ) raw
 ) scores where scores.user_id=v_uid;
 if v_rank is null or v_rank>v_season.top_n or v_points<v_season.min_points then raise exception 'SEASON_REWARD_NOT_ELIGIBLE';end if;
 select state into v_state from public.game_saves where user_id=v_uid for update;
 if v_state is null then raise exception 'SAVE_NOT_FOUND';end if;
 if exists(select 1 from public.stellar_competitive_claims where season_id=p_season_id and user_id=v_uid) then
  return jsonb_build_object('ok',true,'already_claimed',true,'state',v_state);
 end if;
 insert into public.stellar_competitive_claims(season_id,user_id,points,rank,credits,stl)
 values(p_season_id,v_uid,v_points,v_rank,v_season.reward_credits,v_season.reward_stl);
 v_profile:=coalesce(v_state->'profile','{}'::jsonb);
 v_profile:=jsonb_set(v_profile,'{credits}',to_jsonb(greatest(0,coalesce((v_profile->>'credits')::numeric,0))+v_season.reward_credits),true);
 v_profile:=jsonb_set(v_profile,'{uridium}',to_jsonb(greatest(0,coalesce((v_profile->>'uridium')::numeric,0))+v_season.reward_stl),true);
 v_rev:=coalesce((v_state->>'serverEliteRevision')::bigint,0)+1;
 v_state:=jsonb_set(jsonb_set(v_state,'{profile}',v_profile,true),'{serverEliteRevision}',to_jsonb(v_rev),true);
 update public.game_saves set state=v_state,updated_at=now() where user_id=v_uid;
 return jsonb_build_object('ok',true,'already_claimed',false,'rank',v_rank,'points',v_points,'credits',v_season.reward_credits,'stl',v_season.reward_stl,'state',v_state);
end;$$;
revoke all on function public.stellar_claim_competitive_season(uuid) from public,anon;
grant execute on function public.stellar_claim_competitive_season(uuid) to authenticated;
commit;
