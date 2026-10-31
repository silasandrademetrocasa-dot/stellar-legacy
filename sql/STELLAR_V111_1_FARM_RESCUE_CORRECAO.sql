-- V111.1 - Recuperacao segura do farm offline sem resgate duplicado.
-- Executado uma unica vez por migracao no Supabase. Rotinas autorizadas apenas para service_role.
CREATE OR REPLACE FUNCTION public.stellar_offline_farm_fingerprint_v1111(s jsonb)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO ''
AS $fingerprint$
 SELECT md5(jsonb_build_object(
  'profile',s->'profile','ammo',s->'ammo','rockets',s->'rockets',
  'cargo',s->'cargo','inventory',s->'inventory',
  'shipLoadout',s->'shipLoadout','drones',s->'drones','pet',s->'pet',
  'serverNpcRewardRevision',s->'serverNpcRewardRevision',
  'serverOreRevision',s->'serverOreRevision',
  'serverPurchaseRevision',s->'serverPurchaseRevision')::text);
$fingerprint$;

CREATE OR REPLACE FUNCTION public.stellar_offline_farm_start_v1111(
 p_user uuid,p_minutes integer,p_auto_sell boolean,p_auto_buy boolean,p_mine boolean,
 p_npc_key text,p_ammo_key text,p_combat jsonb,p_baseline_save_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $start$
DECLARE r jsonb; sv record;
BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'ONLY_SERVICE_ROLE'; END IF;
 r:=public.stellar_offline_farm_start_v49(p_user,p_minutes,p_auto_sell,p_auto_buy,p_mine,p_npc_key,p_ammo_key,p_combat,p_baseline_save_at);
 IF r->>'status' <> 'running' THEN RETURN r; END IF;
 SELECT state,updated_at INTO sv FROM public.game_saves WHERE user_id=p_user;
 IF sv.state IS NULL OR sv.updated_at IS DISTINCT FROM p_baseline_save_at THEN
  RAISE EXCEPTION 'FARM_SAVE_CHANGED_DURING_START';
 END IF;
 UPDATE public.stellar_offline_farm_v484
 SET snapshot=jsonb_set(snapshot,'{recovery_fingerprint_v1111}',to_jsonb(public.stellar_offline_farm_fingerprint_v1111(sv.state)),true)
 WHERE id=(r->>'id')::uuid AND user_id=p_user AND status='running';
 IF NOT FOUND THEN RAISE EXCEPTION 'FARM_START_NOT_COMMITTED'; END IF;
 RETURN r;
END;
$start$;

CREATE OR REPLACE FUNCTION public.stellar_offline_farm_claim_v1111(p_user uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $claim$
DECLARE f public.stellar_offline_farm_v484%rowtype;
 sv record; p record; original_profile_at timestamptz;
 ledger_activity boolean; same_economy boolean; midnight_change boolean;
 eligible boolean:=false; v_recovery text; result jsonb; midnight_local timestamp;
BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'ONLY_SERVICE_ROLE'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,484));
 SELECT * INTO f FROM public.stellar_offline_farm_v484
 WHERE user_id=p_user ORDER BY (status='running') DESC,created_at DESC LIMIT 1 FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('status','none'); END IF;
 IF f.status <> 'running' THEN
   RETURN jsonb_build_object('ok',f.status='settled','status',f.status,'report',f.report);
 END IF;
 SELECT state,updated_at INTO sv FROM public.game_saves WHERE user_id=p_user FOR UPDATE;
 SELECT updated_at,credits,uridium,xp,aliens_killed INTO p FROM public.profiles WHERE id=p_user FOR UPDATE;
 IF sv.state IS NULL OR p.updated_at IS NULL THEN RAISE EXCEPTION 'FARM_SAVE_MISSING'; END IF;
 original_profile_at:=(f.snapshot->>'profile_updated_at')::timestamptz;
 IF sv.updated_at IS NOT DISTINCT FROM f.baseline_save_at AND p.updated_at IS NOT DISTINCT FROM original_profile_at THEN
   RETURN public.stellar_offline_farm_claim_v49(p_user);
 END IF;
 -- Nunca ignorar recompensas de combate e coleta realizadas online na janela.
 SELECT EXISTS(SELECT 1 FROM public.stellar_npc_reward_ledger WHERE user_id=p_user AND issued_at>=f.started_at)
 OR EXISTS(SELECT 1 FROM public.stellar_ore_reward_ledger WHERE user_id=p_user AND issued_at>=f.started_at)
 INTO ledger_activity;
 IF ledger_activity THEN RAISE EXCEPTION 'FARM_REVIEW_REQUIRED_ONLINE_REWARDS'; END IF;
 -- Os valores no perfil SQL e no save devem estar absolutamente sincronizados.
 same_economy :=
   p.credits IS NOT DISTINCT FROM (sv.state#>>'{profile,credits}')::bigint
   AND p.uridium IS NOT DISTINCT FROM (sv.state#>>'{profile,uridium}')::bigint
   AND p.xp IS NOT DISTINCT FROM (sv.state#>>'{profile,xp}')::bigint
   AND p.aliens_killed IS NOT DISTINCT FROM (sv.state#>>'{profile,aliensKilled}')::bigint;
 IF NOT same_economy THEN RAISE EXCEPTION 'FARM_REVIEW_REQUIRED_ECONOMY_DESYNC'; END IF;
 -- Para as sessoes antigas sem assinatura, aceitar APENAS a atualizacao
 -- simultanea de save/perfil nos 2s iniciais da meia-noite de Sao Paulo.
 midnight_local:=sv.updated_at AT TIME ZONE 'America/Sao_Paulo';
 midnight_change :=
   sv.updated_at=p.updated_at
   AND midnight_local>=date_trunc('day',midnight_local)
   AND midnight_local<date_trunc('day',midnight_local)+interval '2 seconds'
   AND sv.updated_at>=f.started_at AND sv.updated_at<=f.ends_at;
 IF f.snapshot ? 'recovery_fingerprint_v1111' THEN
   eligible := public.stellar_offline_farm_fingerprint_v1111(sv.state)=f.snapshot->>'recovery_fingerprint_v1111';
   v_recovery:='economy_unchanged_v1111';
 ELSE
   eligible := midnight_change;
   v_recovery:='legacy_midnight_sync_v1111';
 END IF;
 IF NOT eligible THEN RAISE EXCEPTION 'FARM_REVIEW_REQUIRED_UNVERIFIED_CHANGE'; END IF;
 -- Para a sessao legada, resgate automatico so apos o tempo total encerrar.
 IF NOT (f.snapshot ? 'recovery_fingerprint_v1111') AND now()<f.ends_at THEN
   RAISE EXCEPTION 'FARM_REVIEW_REQUIRED_WAIT_END';
 END IF;
 -- Actualiza somente a referencia da sessao, jamais o saldo do jogador.
 UPDATE public.stellar_offline_farm_v484 SET
   baseline_save_at=sv.updated_at,
   snapshot=jsonb_set(snapshot,'{profile_updated_at}',to_jsonb(p.updated_at::text),true)
 WHERE id=f.id AND status='running';
 -- Liquida uma unica vez usando o calculo SQL original (sem duplicar economia).
 result:=public.stellar_offline_farm_claim_v49(p_user);
 IF result->>'status' <> 'settled' THEN RAISE EXCEPTION 'FARM_RECOVERY_NOT_SETTLED'; END IF;
 UPDATE public.stellar_offline_farm_v484 SET report=report ||
  jsonb_build_object('recovery_v1111',v_recovery,'original_save_baseline',f.baseline_save_at,
   'original_profile_baseline',original_profile_at)
 WHERE id=f.id AND status='settled';
 RETURN result || jsonb_build_object('recovered',true,'recovery_reason',v_recovery);
END;
$claim$;

REVOKE ALL ON FUNCTION public.stellar_offline_farm_fingerprint_v1111(jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.stellar_offline_farm_start_v1111(uuid,integer,boolean,boolean,boolean,text,text,jsonb,timestamptz) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.stellar_offline_farm_claim_v1111(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_offline_farm_fingerprint_v1111(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.stellar_offline_farm_start_v1111(uuid,integer,boolean,boolean,boolean,text,text,jsonb,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.stellar_offline_farm_claim_v1111(uuid) TO service_role;
NOTIFY pgrst,'reload schema';
