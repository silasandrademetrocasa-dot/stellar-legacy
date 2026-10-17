-- STELLAR LEGACY GUERRA: clã vinculado na data da conquista, sem transferência retroativa
begin;
alter table public.stellar_war_scores add column if not exists clan_id uuid references public.clans(id) on delete set null;
alter table public.stellar_war_actions add column if not exists clan_id uuid references public.clans(id) on delete set null;
create or replace function public.stellar_war_validate_campaign()
returns trigger language plpgsql set search_path=public as $$
begin
 perform pg_advisory_xact_lock(552150021);
 if exists(select 1 from public.stellar_war_campaigns c where c.enabled and new.enabled and c.id is distinct from new.id and c.starts_at<new.ends_at and c.ends_at>new.starts_at)
 then raise exception 'WAR_CAMPAIGN_DATE_CONFLICT'; end if;
 if tg_op='UPDATE' then
  if now()>=old.starts_at or exists(select 1 from public.stellar_war_scores s where s.campaign_id=old.id) then
   if row(old.title,old.starts_at,old.ends_at,old.min_points,old.reward_credits,old.reward_stl,old.enabled)
   is distinct from row(new.title,new.starts_at,new.ends_at,new.min_points,new.reward_credits,new.reward_stl,new.enabled)
   then raise exception 'WAR_CAMPAIGN_LOCKED'; end if;
  end if;
 end if;
 new.updated_at=now();return new;
end;$$;

create or replace function public.stellar_commit_warfront_capture(p_map_id text,p_node_id text,p_faction text,p_expected_revision bigint,p_actor uuid)
returns public.stellar_warfront_nodes
language plpgsql security invoker set search_path=public as $$
declare v_row public.stellar_warfront_nodes;v_campaign uuid;v_points int;v_old text;v_clan uuid;
begin
 if p_map_id not in ('b41','b42','b43') or p_node_id not in ('A','B','C') or p_faction not in ('earth','mars','jupiter') or p_actor is null then raise exception 'INVALID_WARFRONT_CAPTURE';end if;
 select owner into v_old from public.stellar_warfront_nodes where map_id=p_map_id and node_id=p_node_id for update;
 update public.stellar_warfront_nodes set owner=p_faction,captured_at=now(),captured_by=p_actor,revision=revision+1
 where map_id=p_map_id and node_id=p_node_id and revision=p_expected_revision and owner is distinct from p_faction returning * into v_row;
 if not found then raise exception 'WARFRONT_REVISION_CONFLICT';end if;
 select id into v_campaign from public.stellar_war_campaigns where enabled and now()>=starts_at and now()<ends_at order by starts_at desc limit 1;
 select clan_id into v_clan from public.clan_members where user_id=p_actor limit 1;
 select capture_points into v_points from public.stellar_war_rules where id=1;
 v_points:=coalesce(v_points,10);
 insert into public.stellar_war_actions(campaign_id,kind,map_id,node_id,faction,former_owner,actor_user_id,points,clan_id)
 values(v_campaign,'capture',p_map_id,p_node_id,p_faction,v_old,p_actor,case when v_campaign is null then 0 else v_points end,v_clan);
 if v_campaign is not null then
   insert into public.stellar_war_scores(campaign_id,user_id,faction,captures,points,clan_id)
   values(v_campaign,p_actor,p_faction,1,v_points,v_clan)
   on conflict(campaign_id,user_id) do update set captures=public.stellar_war_scores.captures+1,points=public.stellar_war_scores.points+excluded.points,updated_at=now();
 end if;
 return v_row;
end;$$;
create or replace function public.stellar_record_war_defense(p_map_id text,p_node_id text,p_faction text,p_actor uuid)
returns boolean language plpgsql security invoker set search_path=public as $$
declare v_campaign uuid;v_points int;v_clan uuid;
begin
 if p_map_id not in('b41','b42','b43') or p_node_id not in('A','B','C') or p_faction not in('earth','mars','jupiter') or p_actor is null then raise exception 'INVALID_DEFENSE';end if;
 if not exists(select 1 from public.stellar_warfront_nodes where map_id=p_map_id and node_id=p_node_id and owner=p_faction) then return false;end if;
 insert into public.stellar_war_defense_cooldowns(user_id,map_id,node_id,defended_at) values(p_actor,p_map_id,p_node_id,now())
 on conflict(user_id,map_id,node_id) do update set defended_at=excluded.defended_at
 where public.stellar_war_defense_cooldowns.defended_at<now()-interval '10 minutes';
 if not found then return false;end if;
 select id into v_campaign from public.stellar_war_campaigns where enabled and now()>=starts_at and now()<ends_at order by starts_at desc limit 1;
 select clan_id into v_clan from public.clan_members where user_id=p_actor limit 1;
 select defense_points into v_points from public.stellar_war_rules where id=1;v_points:=coalesce(v_points,3);
 insert into public.stellar_war_actions(campaign_id,kind,map_id,node_id,faction,former_owner,actor_user_id,points,clan_id)
 values(v_campaign,'defense',p_map_id,p_node_id,p_faction,p_faction,p_actor,case when v_campaign is null then 0 else v_points end,v_clan);
 if v_campaign is not null then
 insert into public.stellar_war_scores(campaign_id,user_id,faction,defenses,points,clan_id) values(v_campaign,p_actor,p_faction,1,v_points,v_clan)
 on conflict(campaign_id,user_id) do update set defenses=public.stellar_war_scores.defenses+1,points=public.stellar_war_scores.points+excluded.points,updated_at=now();
 end if;
 return true;
end;$$;
commit;
