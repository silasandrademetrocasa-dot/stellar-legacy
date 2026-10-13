-- STELLAR LEGACY V19.0.2 | APLICAR UMA VEZ EM SUPABASE
-- Nao modifica saves, saldos, experiencia ou membros existentes.
-- Instala sistema de pedidos e cargos, endurece autorizacao de cofre e clan, corrige calculo de nivel da Arena.

-- 1) Novos cargos em clan_members. Preserve 'owner' para compatibilidade.
alter table public.clan_members drop constraint if exists clan_members_role_check;
alter table public.clan_members add constraint clan_members_role_check check (role in ('owner','deputy','elite','member'));

-- 2) Pedidos de entrada: uma solicitacao pendente por piloto, nunca associacao automatica.
create table if not exists public.clan_join_requests_v19 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  clan_id uuid not null references public.clans(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','approved','rejected','cancelled')),
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique(user_id,clan_id)
);
create unique index if not exists uq_stellar_clan_pending_by_user_v19 on public.clan_join_requests_v19 (user_id) where status='pending';
create index if not exists ix_stellar_clan_requests_clan_status_v19 on public.clan_join_requests_v19(clan_id,status,created_at);
alter table public.clan_join_requests_v19 enable row level security;
revoke all on public.clan_join_requests_v19 from PUBLIC, anon, authenticated;

-- Canonical clan level required, reflecting ADM runtime min_level, never under default 8.
create or replace function public.clan_required_level_v19()
returns integer language sql stable security definer set search_path=public,pg_temp as $fn$
 select greatest(8,coalesce((select min_level from public.game_ui_modules_v1810 where module_key='clan'),8))::integer;
$fn$;

create or replace function public.clan_check_entry_level_v19(p_uid uuid)
returns void language plpgsql stable security definer set search_path=public,pg_temp as $fn$
declare v_req integer:=public.clan_required_level_v19(); v_level integer;
begin
  select p.level into v_level from public.profiles p where p.id=p_uid;
  if coalesce(v_level,1)<v_req then raise exception 'Aliança libera no nível %. Seu nível atual é %.',v_req,coalesce(v_level,1); end if;
  if not coalesce((select enabled from public.game_ui_modules_v1810 where module_key='clan'),true) then
    raise exception 'Alianças temporariamente indisponíveis.';
  end if;
end;$fn$;

-- Replaces direct-join RPC with apply-only RPC, leaving stable signature for old clients.
create or replace function public.join_clan_v12(p_clan_id uuid)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $fn$
declare v_uid uuid:=auth.uid(); v_name text; v_tag text; v_request uuid;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  perform public.clan_check_entry_level_v19(v_uid);
  if exists(select 1 from public.clan_members where user_id=v_uid) then raise exception 'Você já pertence a uma aliança.'; end if;
  select name,tag into v_name,v_tag from public.clans where id=p_clan_id;
  if v_name is null then raise exception 'Aliança não encontrada.'; end if;
  if exists(select 1 from public.clan_join_requests_v19 where user_id=v_uid and status='pending' and clan_id<>p_clan_id) then
    raise exception 'Cancele seu pedido anterior antes de solicitar outra aliança.';
  end if;
  insert into public.clan_join_requests_v19(user_id,clan_id,status,created_at,reviewed_at,reviewed_by)
    values(v_uid,p_clan_id,'pending',now(),null,null)
    on conflict(user_id,clan_id) do update set
      status='pending', created_at=case when public.clan_join_requests_v19.status='pending' then public.clan_join_requests_v19.created_at else now() end,
      reviewed_at=null,reviewed_by=null
      returning id into v_request;
  return jsonb_build_object('ok',true,'pending',true,'request_id',v_request,'name',v_name,'tag',v_tag);
end;$fn$;

create or replace function public.create_clan_v12(p_name text,p_tag text)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $fn$
declare v_uid uuid:=auth.uid();v_name text:=trim(coalesce(p_name,''));v_tag text:=upper(trim(coalesce(p_tag,'')));v_id uuid;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  perform public.clan_check_entry_level_v19(v_uid);
  if exists(select 1 from public.clan_members where user_id=v_uid) then raise exception 'Você já pertence a um clã.'; end if;
  if char_length(v_name)<3 or char_length(v_name)>28 then raise exception 'O nome do clã precisa ter entre 3 e 28 caracteres.'; end if;
  if v_tag !~ '^[A-Z0-9]{2,6}$' then raise exception 'A TAG deve ter 2 a 6 letras/números.'; end if;
  insert into public.clans(name,tag,owner_id) values(v_name,v_tag,v_uid) returning id into v_id;
  insert into public.clan_members(user_id,clan_id,role) values(v_uid,v_id,'owner');
  update public.clan_join_requests_v19 set status='cancelled',reviewed_at=now() where user_id=v_uid and status='pending';
  return jsonb_build_object('ok',true,'clan_id',v_id,'name',v_name,'tag',v_tag);
exception when unique_violation then raise exception 'Nome ou TAG já está em uso ou sua conta já possui clã.';
end;$fn$;

-- Shared RPC for member roles and pending requests, filtered by current membership.
create or replace function public.get_clan_requests_v19()
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $fn$
declare v_uid uuid:=auth.uid();v_clan uuid;v_role text;v_incoming jsonb:='[]'::jsonb;v_outgoing jsonb:='[]'::jsonb;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  select clan_id,role into v_clan,v_role from public.clan_members where user_id=v_uid;
  if v_role in ('owner','deputy') then
    select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'callsign',coalesce(p.callsign,'Piloto'),'level',coalesce(p.level,1),'created_at',r.created_at) order by r.created_at),'[]'::jsonb)
      into v_incoming from public.clan_join_requests_v19 r left join public.profiles p on p.id=r.user_id
      where r.clan_id=v_clan and r.status='pending';
  end if;
  if v_clan is null then
    select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'clan_id',c.id,'clan_name',c.name,'clan_tag',c.tag,'created_at',r.created_at) order by r.created_at),'[]'::jsonb)
      into v_outgoing from public.clan_join_requests_v19 r join public.clans c on c.id=r.clan_id
      where r.user_id=v_uid and r.status='pending';
  end if;
  return jsonb_build_object('incoming',v_incoming,'outgoing',v_outgoing,'can_review',v_role in ('owner','deputy'));
end;$fn$;

create or replace function public.review_clan_request_v19(p_request_id uuid,p_approve boolean)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $fn$
declare v_uid uuid:=auth.uid();v_clan uuid;v_role text;v_req public.clan_join_requests_v19%rowtype;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  select clan_id,role into v_clan,v_role from public.clan_members where user_id=v_uid;
  if v_clan is null or v_role not in('owner','deputy') then raise exception 'Somente líder ou vice-líder pode analisar solicitações.'; end if;
  select * into v_req from public.clan_join_requests_v19 where id=p_request_id and clan_id=v_clan for update;
  if not found or v_req.status<>'pending' then raise exception 'Solicitação não encontrada ou já analisada.'; end if;
  if p_approve then
    perform public.clan_check_entry_level_v19(v_req.user_id);
    if exists(select 1 from public.clan_members where user_id=v_req.user_id) then raise exception 'Este jogador já pertence a uma aliança.'; end if;
    insert into public.clan_members(user_id,clan_id,role) values(v_req.user_id,v_clan,'member');
  end if;
  update public.clan_join_requests_v19 set status=case when p_approve then 'approved' else 'rejected' end,reviewed_by=v_uid,reviewed_at=now() where id=p_request_id;
  return jsonb_build_object('ok',true,'approved',p_approve,'request_id',p_request_id);
end;$fn$;

create or replace function public.cancel_clan_request_v19(p_request_id uuid)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $fn$
declare v_uid uuid:=auth.uid();
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  update public.clan_join_requests_v19 set status='cancelled',reviewed_at=now()
  where id=p_request_id and user_id=v_uid and status='pending';
  if not found then raise exception 'Solicitação não encontrada.'; end if;
  return jsonb_build_object('ok',true,'cancelled',true);
end;$fn$;

-- Role update: owner -> deputy/elite/member; deputy -> elite/member on non-deputies.
create or replace function public.set_clan_member_role_v19(p_target_user_id uuid,p_role text)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $fn$
declare v_uid uuid:=auth.uid();v_clan uuid;v_role text;v_target_role text;v_target_name text;v_new text:=lower(trim(coalesce(p_role,'')));
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  select clan_id,role into v_clan,v_role from public.clan_members where user_id=v_uid;
  if v_role not in('owner','deputy') or v_clan is null then raise exception 'Sem permissão para cargos.'; end if;
  if v_new not in('deputy','elite','member') then raise exception 'Cargo inválido.'; end if;
  if p_target_user_id=v_uid then raise exception 'Não é possível alterar seu próprio cargo.'; end if;
  select cm.role,p.callsign into v_target_role,v_target_name from public.clan_members cm left join public.profiles p on p.id=cm.user_id
    where cm.user_id=p_target_user_id and cm.clan_id=v_clan for update of cm;
  if v_target_role is null then raise exception 'Jogador não pertence à sua aliança.'; end if;
  if v_target_role='owner' then raise exception 'Não é possível alterar o cargo do líder.'; end if;
  if v_role='deputy' and (v_new='deputy' or v_target_role='deputy') then raise exception 'Apenas o líder pode alterar vice-lideranças.'; end if;
  update public.clan_members set role=v_new where user_id=p_target_user_id and clan_id=v_clan;
  return jsonb_build_object('ok',true,'role',v_new,'callsign',v_target_name);
end;$fn$;

-- 3) Vice-líder também gerencia recursos com as mesmas regras e taxa existentes.
create or replace function public.transfer_clan_credits_v12(p_target_callsign text,p_amount bigint)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $fn$
declare v_uid uuid:=auth.uid(); v_clan uuid; v_role text; v_target uuid; v_target_name text; v_matches integer; v_vault bigint; v_net bigint; v_fee bigint;
begin
 if v_uid is null then raise exception 'Sessão inválida.'; end if;
 if p_amount is null or p_amount<=0 then raise exception 'Informe um valor maior que zero.'; end if;
 select clan_id,role into v_clan,v_role from public.clan_members where user_id=v_uid;
 if v_clan is null then raise exception 'Você não pertence a um clã.'; end if;
 if v_role not in('owner','deputy') then raise exception 'Somente o líder ou vice-líder pode usar o cofre.'; end if;
 select count(*) into v_matches from public.profiles where lower(callsign)=lower(trim(p_target_callsign));
 if v_matches=0 then raise exception 'Jogador não encontrado.'; end if;
 if v_matches>1 then raise exception 'Há mais de um jogador com esse callsign. Use um callsign único.'; end if;
 select id,callsign into v_target,v_target_name from public.profiles where lower(callsign)=lower(trim(p_target_callsign));
 if v_target=v_uid then raise exception 'Escolha outro jogador.'; end if;
 select vault_credits into v_vault from public.clans where id=v_clan for update;
 if coalesce(v_vault,0)<p_amount then raise exception 'Saldo insuficiente no cofre do clã.'; end if;
 v_net:=floor(p_amount*0.95)::bigint; v_fee:=p_amount-v_net;
 update public.clans set vault_credits=vault_credits-p_amount,total_transfer_fees=total_transfer_fees+v_fee,updated_at=now()
   where id=v_clan returning vault_credits into v_vault;
 insert into public.clan_credit_grants(clan_id,sender_id,recipient_id,amount) values(v_clan,v_uid,v_target,v_net);
 insert into public.clan_transactions(clan_id,actor_id,target_user_id,kind,gross_amount,net_amount,burn_amount)
   values(v_clan,v_uid,v_target,'transfer',p_amount,v_net,v_fee);
 return jsonb_build_object('ok',true,'target_user_id',v_target,'target_callsign',v_target_name,
   'gross_amount',p_amount,'net_amount',v_net,'fee',v_fee,'vault_credits',v_vault);
end;$fn$;

-- 4) Arena XP: replaces outdated 10k*2^(level-2) curve by V19 game's XP curve.
-- Keep original SQL function and all its reward logic; only fix formula.
do $fix_arena$
declare v_source text;
begin
  select pg_get_functiondef('public.claim_arena_daily_reward()'::regprocedure) into v_source;
  if position('v_threshold := round(10000 * power(2::numeric, v_i - 2))::bigint;' in v_source)=0 then
    raise exception 'Arena XP function diverged; migration aborted safely.';
  end if;
  v_source := replace(v_source,
    'v_threshold := round(10000 * power(2::numeric, v_i - 2))::bigint;',
    'v_threshold := round((15000::double precision * power((v_i - 1)::double precision, 2.3::double precision) * power(1.20::double precision, greatest(0,v_i-2)::double precision))::numeric)::bigint;');
  execute v_source;
end;$fix_arena$;

-- 5) Secure level authority for arena profile from stored save, not client-supplied level.
-- Other pilot stats use existing game data; this patch addresses level spoofing in this RPC.
create or replace function public.sync_arena_profile(p_callsign text,p_faction text,p_level integer,p_ship_id text,p_hp bigint,p_shield bigint,p_laser_damage bigint,p_speed integer)
returns table(power bigint) language plpgsql security definer set search_path=public,pg_temp as $fn$
declare v_uid uuid:=auth.uid();v_power bigint;v_level integer;
begin
  if v_uid is null then raise exception 'Sessão ausente.'; end if;
  select coalesce(nullif(s.state #>> '{profile,level}','')::integer,p.level,1) into v_level
  from public.profiles p left join public.game_saves s on s.user_id=p.id where p.id=v_uid;
  v_level:=greatest(1,least(44,coalesce(v_level,1)));
  v_power:=greatest(1,greatest(1,coalesce(p_hp,1))+round(greatest(0,coalesce(p_shield,0))*0.9)
      +greatest(0,coalesce(p_laser_damage,0))*65+greatest(0,coalesce(p_speed,0))*120+v_level*5000);
  insert into public.arena_profiles(user_id,callsign,faction,level,ship_id,hp,shield,laser_damage,speed,power,updated_at)
    values(v_uid,left(coalesce(nullif(trim(p_callsign),''),'Pilot'),24),p_faction,v_level,coalesce(nullif(p_ship_id,''),'phoenix'),
      greatest(1,coalesce(p_hp,1)),greatest(0,coalesce(p_shield,0)),greatest(0,coalesce(p_laser_damage,0)),greatest(0,coalesce(p_speed,0)),v_power,now())
    on conflict(user_id) do update set callsign=excluded.callsign,faction=excluded.faction,level=excluded.level,
      ship_id=excluded.ship_id,hp=excluded.hp,shield=excluded.shield,laser_damage=excluded.laser_damage,
      speed=excluded.speed,power=excluded.power,updated_at=now();
  insert into public.arena_stats(user_id) values(v_uid) on conflict(user_id) do nothing;
  return query select v_power;
end;$fn$;

-- 6) Permissions. Prevent unauthenticated RPC calls; prevent unauthorized clan-level inflation.
revoke all on function public.clan_required_level_v19() from PUBLIC,anon;
revoke all on function public.clan_check_entry_level_v19(uuid) from PUBLIC,anon,authenticated;
revoke all on function public.get_clan_requests_v19() from PUBLIC,anon;
revoke all on function public.review_clan_request_v19(uuid,boolean) from PUBLIC,anon;
revoke all on function public.cancel_clan_request_v19(uuid) from PUBLIC,anon;
revoke all on function public.set_clan_member_role_v19(uuid,text) from PUBLIC,anon;
revoke all on function public.join_clan_v12(uuid) from PUBLIC,anon;
revoke all on function public.create_clan_v12(text,text) from PUBLIC,anon;
revoke all on function public.transfer_clan_credits_v12(text,bigint) from PUBLIC,anon;
revoke all on function public.claim_arena_daily_reward() from PUBLIC,anon;
revoke all on function public.sync_arena_profile(text,text,integer,text,bigint,bigint,bigint,integer) from PUBLIC,anon;
revoke all on function public.evaluate_clan_level_v12(uuid) from PUBLIC,anon,authenticated;
grant execute on function public.clan_required_level_v19() to authenticated;
grant execute on function public.get_clan_requests_v19() to authenticated;
grant execute on function public.review_clan_request_v19(uuid,boolean) to authenticated;
grant execute on function public.cancel_clan_request_v19(uuid) to authenticated;
grant execute on function public.set_clan_member_role_v19(uuid,text) to authenticated;
grant execute on function public.join_clan_v12(uuid) to authenticated;
grant execute on function public.create_clan_v12(text,text) to authenticated;
grant execute on function public.transfer_clan_credits_v12(text,bigint) to authenticated;
grant execute on function public.claim_arena_daily_reward() to authenticated;
grant execute on function public.sync_arena_profile(text,text,integer,text,bigint,bigint,bigint,integer) to authenticated;
