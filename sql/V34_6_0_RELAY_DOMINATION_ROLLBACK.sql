-- SAFE ROLLBACK: re-enable the proven V34.5 capture mode without deleting anything.
-- Run only if you also roll back the code release to V34.5.0.
-- Saves, war scores, relay modules, clan parts and audit logs remain intact.
BEGIN;
UPDATE public.stellar_relay_rules_v346 SET enabled=false,updated_at=now() WHERE id=1;
COMMIT;
