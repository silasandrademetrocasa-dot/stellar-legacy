-- Restore V35 without dropping records from newer systems. Safe, non-destructive.
-- If reverting runtime to V35, do not erase the V36 tables or historical claims.
BEGIN;
REVOKE ALL ON FUNCTION public.stellar_dominion_war_prize_v360(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.stellar_dominion_claim_v360(text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.stellar_dominion_declare_v360(uuid,timestamptz) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.stellar_dominion_regen_v360() FROM PUBLIC,anon,authenticated,service_role;
UPDATE public.stellar_dominion_rules_v360 SET enabled=false,updated_at=now() WHERE id=1;
COMMIT;
