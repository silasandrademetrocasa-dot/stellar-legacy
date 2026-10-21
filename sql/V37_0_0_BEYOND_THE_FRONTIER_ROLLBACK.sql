-- V37 rollback (only if no claims/crafts have been made; preserves previous V36 systems).
BEGIN;
DO $safe$
BEGIN
 IF EXISTS(SELECT 1 FROM public.stellar_frontier_claims_v370 LIMIT 1)
 OR EXISTS(SELECT 1 FROM public.stellar_frontier_clan_claims_v370 LIMIT 1)
 OR EXISTS(SELECT 1 FROM public.stellar_frontier_ship_tech_v370 WHERE level>1 OR shards>0 LIMIT 1)
 THEN RAISE EXCEPTION 'V37_ROLLBACK_BLOCKED_PROGRESS_EXISTS';END IF;
END;$safe$;
DROP FUNCTION IF EXISTS public.stellar_frontier_clan_claim_v370();
DROP FUNCTION IF EXISTS public.stellar_frontier_craft_v370();
DROP FUNCTION IF EXISTS public.stellar_frontier_claim_v370(text);
DROP FUNCTION IF EXISTS public.stellar_frontier_state_v370();
DROP TABLE IF EXISTS public.stellar_frontier_clan_claims_v370;
DROP TABLE IF EXISTS public.stellar_frontier_claims_v370;
DROP TABLE IF EXISTS public.stellar_frontier_ship_tech_v370;
DROP TABLE IF EXISTS public.stellar_frontier_contracts_v370;
COMMIT;
