-- Stellar Legacy V13.1.0 — WARFRONT
-- World Boss global diário + Guerra de Clãs + contribuições/recompensas.
-- Execute este arquivo DEPOIS do CURRENT_BACKEND.sql da V13.1.

create extension if not exists pgcrypto;

create table if not exists public.world_boss_v131 (
  id text primary key,
  name text not null default 'NEMESIS PRIME',
  max_hp bigint not null check(max_hp>0),
  hp bigint not null check(hp>=0),
  spawn_at timestamptz not null default now(),
  ends_at timestamptz not null,
  defeated_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.world_boss_contrib_v131 (
  boss_id text not null references public.world_boss_v131(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  clan_id uuid references public.clans(id) on delete set null,
  damage bigint not null default 0,
  hits integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key(boss_id,user_id)
);
create table if not exists public.world_boss_claims_v131 (
  boss_id text not null references public.world_boss_v131(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  claimed_at timestamptz not null default now(),
  primary key(boss_id,user_id)
);
create table if not exists public.clan_wars_v131 (
  id uuid primary key default gen_random_uuid(),
  attacker_clan_id uuid not null references public.clans(id) on delete cascade,
  defender_clan_id uuid not null references public.clans(id) on delete cascade,
  attacker_score bigint not null default 0,
  defender_score bigint not null default 0,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null default (now()+interval '12 hours'),
  status text not null default 'active' check(status in ('active','finished')),
  winner_clan_id uuid references public.clans(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  check(attacker_clan_id<>defender_clan_id)
);
create table if not exists public.clan_war_contrib_v131 (
  war_id uuid not null references public.clan_wars_v131(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  clan_id uuid not null references public.clans(id) on delete cascade,
  score bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key(war_id,user_id)
);

alter table public.world_boss_v131 enable row level security;
alter table public.world_boss_contrib_v131 enable row level security;
alter table public.world_boss_claims_v131 enable row level security;
alter table public.clan_wars_v131 enable row level security;
alter table public.clan_war_contrib_v131 enable row level security;
revoke all on public.world_boss_v131,public.world_boss_contrib_v131,public.world_boss_claims_v131,public.clan_wars_v131,public.clan_war_contrib_v131 from anon,authenticated;

create or replace function public.ensure_world_boss_v131()
returns public.world_boss_v131 language plpgsql security definer set search_path=public,auth as $$
declare v_key text:=to_char((now() at time zone 'America/Sao_Paulo'),'YYYYMMDD'); v_id text:='nemesis_'||v_key; v_row public.world_boss_v131%rowtype; v_end timestamptz;
begin
  select * into v_row from public.world_boss_v131 where id=v_id;
  if found then return v_row; end if;
  v_end:=((date_trunc('day',now() at time zone 'America/Sao_Paulo')+interval '1 day') at time zone 'America/Sao_Paulo');
  insert into public.world_boss_v131(id,name,max_hp,hp,spawn_at,ends_at) values(v_id,'NEMESIS PRIME',250000000,250000000,now(),v_end)
  on conflict(id) do nothing;
  select * into v_row from public.world_boss_v131 where id=v_id;
  return v_row;
end;$$;

create or replace function public.finish_expired_clan_wars_v131()
returns void language plpgsql security definer set search_path=public,auth as $$
begin
  update public.clan_wars_v131 set status='finished',winner_clan_id=case when attacker_score>defender_score then attacker_clan_id when defender_score>attacker_score then defender_clan_id else null end
  where status='active' and ends_at<=now();
end;$$;

create or replace function public.get_warfront_state_v131()
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_uid uuid:=auth.uid(); v_clan uuid; v_boss public.world_boss_v131%rowtype; v_damage bigint:=0; v_rank integer:=0; v_claimed boolean:=false; v_war public.clan_wars_v131%rowtype; v_war_json jsonb:=null;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  perform public.finish_expired_clan_wars_v131();
  select * into v_boss from public.ensure_world_boss_v131();
  select clan_id into v_clan from public.clan_members where user_id=v_uid;
  select coalesce(damage,0) into v_damage from public.world_boss_contrib_v131 where boss_id=v_boss.id and user_id=v_uid;
  select count(*)+1 into v_rank from public.world_boss_contrib_v131 where boss_id=v_boss.id and damage>v_damage;
  select exists(select 1 from public.world_boss_claims_v131 where boss_id=v_boss.id and user_id=v_uid) into v_claimed;
  if v_clan is not null then
    select * into v_war from public.clan_wars_v131 where status='active' and ends_at>now() and (attacker_clan_id=v_clan or defender_clan_id=v_clan) order by starts_at desc limit 1;
    if found then
      v_war_json:=jsonb_build_object('id',v_war.id,'attacker_score',v_war.attacker_score,'defender_score',v_war.defender_score,'starts_at',v_war.starts_at,'ends_at',v_war.ends_at,'my_side',case when v_war.attacker_clan_id=v_clan then 'attacker' else 'defender' end,
        'attacker',(select jsonb_build_object('id',id,'name',name,'tag',tag) from public.clans where id=v_war.attacker_clan_id),
        'defender',(select jsonb_build_object('id',id,'name',name,'tag',tag) from public.clans where id=v_war.defender_clan_id));
    end if;
  end if;
  return jsonb_build_object('world_boss',jsonb_build_object('id',v_boss.id,'name',v_boss.name,'max_hp',v_boss.max_hp,'hp',v_boss.hp,'spawn_at',v_boss.spawn_at,'ends_at',v_boss.ends_at,'defeated_at',v_boss.defeated_at,'my_damage',v_damage,'my_rank',case when v_damage>0 then v_rank else 0 end,'claimed',v_claimed),'war',v_war_json);
end;$$;

create or replace function public.record_clan_war_score_v131(p_points integer,p_reason text default 'combat')
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_uid uuid:=auth.uid(); v_clan uuid; v_war public.clan_wars_v131%rowtype; v_pts integer:=greatest(1,least(20,coalesce(p_points,1)));
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  perform public.finish_expired_clan_wars_v131();
  select clan_id into v_clan from public.clan_members where user_id=v_uid;
  if v_clan is null then return jsonb_build_object('scored',false); end if;
  select * into v_war from public.clan_wars_v131 where status='active' and ends_at>now() and (attacker_clan_id=v_clan or defender_clan_id=v_clan) order by starts_at desc limit 1 for update;
  if not found then return jsonb_build_object('scored',false); end if;
  if v_war.attacker_clan_id=v_clan then update public.clan_wars_v131 set attacker_score=attacker_score+v_pts where id=v_war.id returning * into v_war; else update public.clan_wars_v131 set defender_score=defender_score+v_pts where id=v_war.id returning * into v_war; end if;
  insert into public.clan_war_contrib_v131(war_id,user_id,clan_id,score) values(v_war.id,v_uid,v_clan,v_pts) on conflict(war_id,user_id) do update set score=public.clan_war_contrib_v131.score+excluded.score,updated_at=now();
  return jsonb_build_object('scored',true,'points',v_pts,'reason',left(coalesce(p_reason,'combat'),40),'war',jsonb_build_object('id',v_war.id,'attacker_score',v_war.attacker_score,'defender_score',v_war.defender_score,'ends_at',v_war.ends_at,'my_side',case when v_war.attacker_clan_id=v_clan then 'attacker' else 'defender' end,'attacker',(select jsonb_build_object('id',id,'name',name,'tag',tag) from public.clans where id=v_war.attacker_clan_id),'defender',(select jsonb_build_object('id',id,'name',name,'tag',tag) from public.clans where id=v_war.defender_clan_id)));
end;$$;

create or replace function public.hit_world_boss_v131(p_damage bigint)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_uid uuid:=auth.uid(); v_clan uuid; v_boss public.world_boss_v131%rowtype; v_req bigint:=greatest(1,least(10000000,coalesce(p_damage,1))); v_applied bigint; v_before bigint; v_total bigint;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  select * into v_boss from public.ensure_world_boss_v131();
  select * into v_boss from public.world_boss_v131 where id=v_boss.id for update;
  if v_boss.hp<=0 or v_boss.ends_at<=now() then return jsonb_build_object('id',v_boss.id,'name',v_boss.name,'max_hp',v_boss.max_hp,'hp',v_boss.hp,'ends_at',v_boss.ends_at,'defeated',v_boss.hp<=0,'applied',0); end if;
  v_before:=v_boss.hp; v_applied:=least(v_req,v_before);
  update public.world_boss_v131 set hp=greatest(0,hp-v_applied),defeated_at=case when hp-v_applied<=0 then coalesce(defeated_at,now()) else defeated_at end where id=v_boss.id returning * into v_boss;
  select clan_id into v_clan from public.clan_members where user_id=v_uid;
  insert into public.world_boss_contrib_v131(boss_id,user_id,clan_id,damage,hits) values(v_boss.id,v_uid,v_clan,v_applied,1) on conflict(boss_id,user_id) do update set damage=public.world_boss_contrib_v131.damage+excluded.damage,hits=public.world_boss_contrib_v131.hits+1,clan_id=excluded.clan_id,updated_at=now() returning damage into v_total;
  if v_clan is not null and v_applied>0 then perform public.record_clan_war_score_v131(greatest(1,least(20,(v_applied/250000)::integer)),'world_boss'); end if;
  return jsonb_build_object('id',v_boss.id,'name',v_boss.name,'max_hp',v_boss.max_hp,'hp',v_boss.hp,'ends_at',v_boss.ends_at,'defeated',v_boss.hp<=0,'applied',v_applied,'my_damage',v_total,'claimed',false);
end;$$;

create or replace function public.claim_world_boss_reward_v131()
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_uid uuid:=auth.uid(); v_boss public.world_boss_v131%rowtype; v_damage bigint:=0; v_inserted integer:=0; v_credits bigint; v_uri bigint; v_frags integer; v_cores integer; v_bp text;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  select * into v_boss from public.ensure_world_boss_v131();
  if v_boss.hp>0 then raise exception 'O World Boss ainda está vivo.'; end if;
  select coalesce(damage,0) into v_damage from public.world_boss_contrib_v131 where boss_id=v_boss.id and user_id=v_uid;
  if v_damage<=0 then raise exception 'Você precisa causar dano no World Boss para receber recompensa.'; end if;
  insert into public.world_boss_claims_v131(boss_id,user_id) values(v_boss.id,v_uid) on conflict do nothing;
  get diagnostics v_inserted=row_count;
  if v_inserted=0 then return jsonb_build_object('already_claimed',true,'boss_id',v_boss.id); end if;
  v_credits:=5000000+least(20000000,v_damage/10); v_uri:=5000+least(20000,v_damage/10000); v_frags:=5+least(10,greatest(0,(v_damage/5000000)::integer)); v_cores:=1+least(3,greatest(0,(v_damage/25000000)::integer));
  v_bp:=(array['lf4','sg3nb02','g3n7900'])[1+(floor(random()*3))::integer];
  return jsonb_build_object('already_claimed',false,'boss_id',v_boss.id,'credits',v_credits,'uridium',v_uri,'fragments',v_frags,'cores',v_cores,'blueprint_id',v_bp);
end;$$;

create or replace function public.declare_clan_war_v131(p_target_clan_id uuid)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_uid uuid:=auth.uid(); v_clan uuid; v_role text; v_existing integer; v_war public.clan_wars_v131%rowtype;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  perform public.finish_expired_clan_wars_v131();
  select clan_id,role into v_clan,v_role from public.clan_members where user_id=v_uid;
  if v_clan is null or v_role<>'owner' then raise exception 'Somente o líder do clã pode declarar guerra.'; end if;
  if p_target_clan_id is null or p_target_clan_id=v_clan then raise exception 'Escolha um clã rival válido.'; end if;
  if not exists(select 1 from public.clans where id=p_target_clan_id) then raise exception 'Clã rival não encontrado.'; end if;
  select count(*) into v_existing from public.clan_wars_v131 where status='active' and ends_at>now() and (attacker_clan_id in(v_clan,p_target_clan_id) or defender_clan_id in(v_clan,p_target_clan_id));
  if v_existing>0 then raise exception 'Um dos clãs já está em uma guerra ativa.'; end if;
  insert into public.clan_wars_v131(attacker_clan_id,defender_clan_id,created_by) values(v_clan,p_target_clan_id,v_uid) returning * into v_war;
  return jsonb_build_object('ok',true,'war_id',v_war.id,'ends_at',v_war.ends_at);
end;$$;

revoke all on function public.ensure_world_boss_v131() from public,anon;
revoke all on function public.finish_expired_clan_wars_v131() from public,anon,authenticated;
revoke all on function public.get_warfront_state_v131() from public,anon;
revoke all on function public.hit_world_boss_v131(bigint) from public,anon;
revoke all on function public.claim_world_boss_reward_v131() from public,anon;
revoke all on function public.declare_clan_war_v131(uuid) from public,anon;
revoke all on function public.record_clan_war_score_v131(integer,text) from public,anon;
grant execute on function public.ensure_world_boss_v131() to authenticated,service_role;
grant execute on function public.finish_expired_clan_wars_v131() to service_role,postgres;
grant execute on function public.get_warfront_state_v131() to authenticated,service_role;
grant execute on function public.hit_world_boss_v131(bigint) to authenticated,service_role;
grant execute on function public.claim_world_boss_reward_v131() to authenticated,service_role;
grant execute on function public.declare_clan_war_v131(uuid) to authenticated,service_role;
grant execute on function public.record_clan_war_score_v131(integer,text) to authenticated,service_role;
