-- Stellar Legacy • prelaunch: ADM reset/delete integrity, no player is reset by migration.
-- Apply once via Supabase SQL editor or MCP. Reset/delete only on deliberate authenticated ADM action.
BEGIN;

CREATE TABLE IF NOT EXISTS public.stellar_account_reset_epochs_v478 (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  epoch bigint NOT NULL DEFAULT 1 CHECK(epoch >= 1),
  reset_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stellar_account_reset_epochs_v478 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stellar_account_reset_epochs_v478 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.stellar_account_reset_epochs_v478 TO authenticated;
DROP POLICY IF EXISTS stellar_reset_epoch_read_own_v478 ON public.stellar_account_reset_epochs_v478;
CREATE POLICY stellar_reset_epoch_read_own_v478
ON public.stellar_account_reset_epochs_v478 FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

-- A stale local save must not be able to revive a freshly reset account, even during an in-flight write.
CREATE OR REPLACE FUNCTION public.stellar_verify_save_reset_epoch_v478()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $fn$
DECLARE v_epoch bigint;
BEGIN
 SELECT epoch INTO v_epoch FROM public.stellar_account_reset_epochs_v478 WHERE user_id=NEW.user_id;
 IF FOUND AND COALESCE(NULLIF(NEW.state->>'adminResetEpoch','')::bigint,0) <> v_epoch THEN
   RAISE EXCEPTION 'SAVE_RESET_STALE: save anterior ao reset administrativo.' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END
$fn$;
REVOKE ALL ON FUNCTION public.stellar_verify_save_reset_epoch_v478() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS stellar_save_reset_epoch_guard_v478 ON public.game_saves;
CREATE TRIGGER stellar_save_reset_epoch_guard_v478
 BEFORE INSERT OR UPDATE OF state ON public.game_saves
 FOR EACH ROW EXECUTE FUNCTION public.stellar_verify_save_reset_epoch_v478();

DO $fn$
BEGIN
 IF to_regprocedure('public.admin_reset_account_v1763_legacy_v478(uuid)') IS NULL THEN
   ALTER FUNCTION public.admin_reset_account_v1763(uuid) RENAME TO admin_reset_account_v1763_legacy_v478;
 END IF;
 IF to_regprocedure('public.admin_delete_account_v1763_legacy_v478(uuid)') IS NULL THEN
   ALTER FUNCTION public.admin_delete_account_v1763(uuid) RENAME TO admin_delete_account_v1763_legacy_v478;
 END IF;
END
$fn$;
-- Bypass of the new reset marker through old procedures must not be possible for players.
REVOKE ALL ON FUNCTION public.admin_reset_account_v1763_legacy_v478(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.admin_delete_account_v1763_legacy_v478(uuid) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.admin_reset_account_v1763(p_target_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','auth','pg_temp' AS $fn$
DECLARE v_admin uuid := auth.uid(); v_result jsonb; v_table text; v_epoch bigint;
BEGIN
 IF v_admin IS NULL OR NOT public.is_game_admin_v1763(v_admin) THEN RAISE EXCEPTION 'Acesso administrativo negado.'; END IF;
 IF p_target_user_id IS NULL OR p_target_user_id=v_admin OR public.is_game_admin_v1763(p_target_user_id) THEN RAISE EXCEPTION 'Conta protegida contra reset.'; END IF;
 -- Serialize resets with another ADM reset of the same target.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_target_user_id::text,478));
 -- Existing procedure keeps identity, callsign, and premium, and resets core arena/save/profile.
 v_result := public.admin_reset_account_v1763_legacy_v478(p_target_user_id);
 IF COALESCE((v_result->>'ok')::boolean,false) IS NOT TRUE THEN RAISE EXCEPTION 'Reset legado não confirmado.'; END IF;

 -- Dedicated player progression/reward histories absent in the older reset.
 FOREACH v_table IN ARRAY ARRAY[
   'galaxy_event_progress_v1826', 'game_coupon_redemptions_v1821', 'game_coupon_redemptions_v193',
   'stellar_elite_counters','stellar_elite_claims','stellar_elite_selected_titles',
   'stellar_competitive_claims','stellar_war_campaign_claims','stellar_war_supply_claims','stellar_war_defense_cooldowns','stellar_war_scores',
   'stellar_npc_reward_ledger','stellar_ore_reward_ledger',
   'stellar_astral_cursor_v381','stellar_astral_ledger_v381','stellar_astral_quote_lock_v381',
   'stellar_frontier_claims_v370','stellar_frontier_ship_tech_v370',
   'stellar_u42_actions','stellar_u42_donations','stellar_u42_expeditions','stellar_u42_inventory',
   'stellar_u42_material_spends','stellar_u42_research','stellar_u42_squad_members',
   'stellar_u42_squad_objective_claims_v421','stellar_u423_loadouts','stellar_u423_ops_claims',
   'stellar_u426_clan_donations','stellar_u426_sector_runs','stellar_u435_raid_claims',
   'stellar_u440_admin_test_grants','stellar_season_scores'
 ] LOOP
  IF to_regclass(format('public.%I',v_table)) IS NOT NULL THEN
   EXECUTE format('DELETE FROM public.%I WHERE user_id=$1',v_table) USING p_target_user_id;
  END IF;
 END LOOP;
 DELETE FROM public.stellar_dominion_claims_v360 WHERE actor=p_target_user_id;
 DELETE FROM public.stellar_dominion_war_claims_v360 WHERE actor=p_target_user_id;
 DELETE FROM public.stellar_frontier_clan_claims_v370 WHERE actor=p_target_user_id;
 DELETE FROM public.stellar_relay_mission_claims_v346 WHERE actor=p_target_user_id;
 -- Keep forensic security logs, market shared offers and Premium history intact.
 UPDATE public.stellar_u426_market_offers SET buyer=NULL WHERE buyer=p_target_user_id;
 INSERT INTO public.stellar_account_reset_epochs_v478(user_id,epoch,reset_at)
 VALUES(p_target_user_id,1,now())
 ON CONFLICT(user_id) DO UPDATE SET epoch=public.stellar_account_reset_epochs_v478.epoch+1,reset_at=now()
 RETURNING epoch INTO v_epoch;
 -- Active sessions were invalidated by the legacy RPC; never create a new save here.
 RETURN v_result||jsonb_build_object('reset_epoch',v_epoch,'verified',true,
 'message','Conta zerada no servidor. Progresso local antigo bloqueado; login e Premium preservados.');
END
$fn$;
REVOKE ALL ON FUNCTION public.admin_reset_account_v1763(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_reset_account_v1763(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_account_v1763(p_target_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','auth','pg_temp' AS $fn$
DECLARE v_admin uuid := auth.uid(); v_result jsonb;
BEGIN
 IF v_admin IS NULL OR NOT public.is_game_admin_v1763(v_admin) THEN RAISE EXCEPTION 'Acesso administrativo negado.'; END IF;
 IF p_target_user_id IS NULL OR p_target_user_id=v_admin OR public.is_game_admin_v1763(p_target_user_id) THEN RAISE EXCEPTION 'Conta administrativa protegida.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_target_user_id::text,478));
 -- Legacy deletion encounters foreign keys configured with NO ACTION. Clean these up first.
 DELETE FROM public.game_coupon_redemptions_v193 WHERE user_id=p_target_user_id;
 UPDATE public.game_coupons_v193 SET created_by=v_admin WHERE created_by=p_target_user_id;
 DELETE FROM public.premium_checkout_tests_v1832 WHERE user_id=p_target_user_id;
 DELETE FROM public.premium_pass_tier_tests_v1832 WHERE user_id=p_target_user_id;
 DELETE FROM public.premium_subscription_tests_v1832 WHERE user_id=p_target_user_id;
 DELETE FROM public.stellar_relay_mission_claims_v346 WHERE actor=p_target_user_id;
 DELETE FROM public.stellar_relay_pve_events_v346 WHERE actor=p_target_user_id;
 UPDATE public.stellar_u426_market_offers SET buyer=NULL WHERE buyer=p_target_user_id;
 v_result := public.admin_delete_account_v1763_legacy_v478(p_target_user_id);
 IF COALESCE((v_result->>'ok')::boolean,false) IS NOT TRUE OR EXISTS(SELECT 1 FROM auth.users WHERE id=p_target_user_id) THEN
  RAISE EXCEPTION 'Exclusão não confirmada: usuário ainda presente.';
 END IF;
 RETURN v_result||jsonb_build_object('verified',true,'message','Conta excluída e ausência no Auth confirmada.');
END
$fn$;
REVOKE ALL ON FUNCTION public.admin_delete_account_v1763(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_account_v1763(uuid) TO authenticated;
COMMIT;
