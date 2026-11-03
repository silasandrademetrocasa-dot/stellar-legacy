-- STELLAR LEGACY V118.0 - SAVE UNICO TRANSACIONAL + COPIAS A/B/C
-- EXECUTE UMA VEZ no Supabase SQL Editor ANTES de subir o codigo V118.
-- Nao remove tabelas, nao cancela Farm, nao altera saldos existentes.
-- Somente Render com service_role pode invocar o commit.

create table if not exists public.stellar_player_save_abc_v118 (
 user_id uuid not null,
 slot char(1) not null check (slot in ('A','B','C')),
 state jsonb not null,
 save_updated_at timestamptz not null,
 state_hash text not null,
 captured_at timestamptz not null default clock_timestamp(),
 primary key (user_id,slot)
);
alter table public.stellar_player_save_abc_v118 enable row level security;
revoke all on public.stellar_player_save_abc_v118 from public,anon,authenticated;
grant select,insert,update on public.stellar_player_save_abc_v118 to service_role;

-- Guarda a versao atual de cada conta como A, sem mudar seu save.
-- B e C surgem apenas apos novas confirmacoes; nunca fabricar 3 copias identicas.
insert into public.stellar_player_save_abc_v118
(user_id,slot,state,save_updated_at,state_hash,captured_at)
select user_id,'A',state,updated_at,md5(state::text),clock_timestamp()
from public.game_saves where state is not null
on conflict(user_id,slot) do nothing;

-- A transacao grava o estado completo e a projecao do perfil; so depois
-- atualiza A/B/C. Falha de trigger, anti-fraude ou perfil reverte TUDO.
create or replace function public.stellar_commit_player_save_v118(
 p_user_id uuid,p_state jsonb,p_updated_at timestamptz,p_callsign text
) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp
as $fn$
declare
 old_save jsonb;
 old_updated_at timestamptz;
 a public.stellar_player_save_abc_v118%rowtype;
 b public.stellar_player_save_abc_v118%rowtype;
 v_rotate boolean;
 v_profile jsonb;
 v_signature text;
begin
 if p_user_id is null or p_state is null or jsonb_typeof(p_state)<>'object'
   or p_state->>'accountOwnerId' is distinct from p_user_id::text
 then raise exception 'SAVE_OWNER_OR_PAYLOAD_INVALID' using errcode='23514'; end if;
 if p_callsign is null or length(trim(p_callsign))=0 or length(p_callsign)>60
 then raise exception 'SAVE_CALLSIGN_INVALID' using errcode='23514'; end if;
 if p_updated_at is null then raise exception 'SAVE_TIME_INVALID' using errcode='23514'; end if;
 v_profile:=p_state->'profile';
 if jsonb_typeof(v_profile)<>'object' then raise exception 'SAVE_PROFILE_INVALID' using errcode='23514';end if;
 -- Lock em game_saves para um piloto por vez. Os RPCs de recompensa
 -- e compra existentes continuam protegidos por revisoes e triggers SQL.
 select state,updated_at into old_save,old_updated_at from public.game_saves where user_id=p_user_id for update;
 insert into public.game_saves(user_id,state,updated_at)
 values(p_user_id,p_state,p_updated_at)
 on conflict(user_id) do update set state=excluded.state,updated_at=excluded.updated_at;
 insert into public.profiles(id,callsign,faction,level,xp,credits,uridium,aliens_killed,gg_completed,updated_at)
 values(p_user_id,p_callsign,
   nullif(v_profile->>'faction',''),
   greatest(1,coalesce((v_profile->>'level')::integer,1)),
   coalesce((v_profile->>'xp')::bigint,0),
   coalesce((v_profile->>'credits')::bigint,0),
   coalesce((v_profile->>'uridium')::bigint,0),
   coalesce((v_profile->>'aliensKilled')::bigint,0),
   coalesce((p_state#>>'{galaxyGate,alpha,completed}')::integer,(v_profile->>'ggCompleted')::integer,0),
   p_updated_at)
 on conflict(id) do update set
   callsign=excluded.callsign,faction=excluded.faction,level=excluded.level,
   xp=excluded.xp,credits=excluded.credits,uridium=excluded.uridium,
   aliens_killed=excluded.aliens_killed,gg_completed=excluded.gg_completed,
   updated_at=excluded.updated_at;

 select * into a from public.stellar_player_save_abc_v118
 where user_id=p_user_id and slot='A' for update;
 select * into b from public.stellar_player_save_abc_v118
 where user_id=p_user_id and slot='B' for update;
 v_signature:=md5(p_state::text);
 v_rotate:= a.user_id is null or b.user_id is null or
   p_updated_at >= b.captured_at+interval '30 seconds' or
   a.state->'shipLoadout' is distinct from p_state->'shipLoadout' or
   a.state->'drones' is distinct from p_state->'drones' or
   a.state->'combatConfigsV2013' is distinct from p_state->'combatConfigsV2013' or
   a.state->'pet' is distinct from p_state->'pet' or
   a.state->>'serverPurchaseRevision' is distinct from p_state->>'serverPurchaseRevision';
 if v_rotate and b.user_id is not null then
   insert into public.stellar_player_save_abc_v118 as ss
   (user_id,slot,state,save_updated_at,state_hash,captured_at)
   values(p_user_id,'C',b.state,b.save_updated_at,b.state_hash,b.captured_at)
   on conflict(user_id,slot) do update set state=excluded.state,
   save_updated_at=excluded.save_updated_at,state_hash=excluded.state_hash,captured_at=excluded.captured_at;
 end if;
 if v_rotate and a.user_id is not null then
   insert into public.stellar_player_save_abc_v118 as ss
   (user_id,slot,state,save_updated_at,state_hash,captured_at)
   values(p_user_id,'B',a.state,a.save_updated_at,a.state_hash,a.captured_at)
   on conflict(user_id,slot) do update set state=excluded.state,
   save_updated_at=excluded.save_updated_at,state_hash=excluded.state_hash,captured_at=excluded.captured_at;
 elsif a.user_id is null and old_save is not null then
   insert into public.stellar_player_save_abc_v118
   (user_id,slot,state,save_updated_at,state_hash,captured_at)
   values(p_user_id,'B',old_save,old_updated_at,md5(old_save::text),clock_timestamp())
   on conflict(user_id,slot) do nothing;
 end if;
 insert into public.stellar_player_save_abc_v118 as ss
 (user_id,slot,state,save_updated_at,state_hash,captured_at)
 values(p_user_id,'A',p_state,p_updated_at,v_signature,clock_timestamp())
 on conflict(user_id,slot) do update set
 state=excluded.state,save_updated_at=excluded.save_updated_at,
 state_hash=excluded.state_hash,captured_at=excluded.captured_at;
 return jsonb_build_object('ok',true,'updated_at',p_updated_at,'checkpoint','A');
end;
$fn$;
revoke all on function public.stellar_commit_player_save_v118(uuid,jsonb,timestamptz,text) from public,anon,authenticated;
grant execute on function public.stellar_commit_player_save_v118(uuid,jsonb,timestamptz,text) to service_role;

-- Check inicial no SQL Editor (nao modifica estado):
-- select proname from pg_proc where proname='stellar_commit_player_save_v118';
-- select slot,save_updated_at,state_hash from public.stellar_player_save_abc_v118 where user_id='<uuid>' order by slot;
-- NUNCA restaurar A/B/C cegamente: reconciliar primeiro recompensas NPC, compras e recibos.
