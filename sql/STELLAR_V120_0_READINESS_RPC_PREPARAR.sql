-- V120.0 RC: RPC SOMENTE LEITURA, com permissao APENAS service_role.
-- Nao cria saldo, altera save, forca checkpoint, liquida premios nem ativa trigger.
CREATE OR REPLACE FUNCTION public.stellar_save_release_readiness_v120()
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=public,pg_temp STABLE AS $readiness$
 WITH counts AS (
  SELECT
   (SELECT count(*) FROM public.game_saves) AS saves,
   (SELECT count(*) FROM public.stellar_player_save_head_v119) AS heads,
   (SELECT count(*) FROM public.stellar_player_save_operation_v119) AS receipts,
   (SELECT count(*) FROM public.stellar_offline_farm_v484 WHERE status='running') AS active_farms,
   (SELECT count(*) FROM public.game_saves g LEFT JOIN public.stellar_player_save_head_v119 h
      ON h.user_id=g.user_id WHERE h.user_id IS NULL OR h.state_hash IS DISTINCT FROM md5(g.state::text)) AS hash_mismatches,
   (SELECT count(*) FROM public.game_saves g LEFT JOIN public.stellar_player_save_checkpoint_v119 c
      ON c.user_id=g.user_id AND c.slot='A' WHERE c.user_id IS NULL) AS missing_a,
   (SELECT count(*) FROM public.stellar_player_save_checkpoint_v119 c
      WHERE c.state_hash IS DISTINCT FROM md5(c.state::text)) AS corrupted_checkpoints,
   (SELECT count(*) FROM pg_trigger WHERE tgrelid='public.game_saves'::regclass
      AND tgname IN ('stellar_capture_save_insert_v119','stellar_capture_save_update_v119')
      AND tgenabled IN ('O','A')) AS capture_triggers
 )
 SELECT jsonb_build_object(
  'readonly',true,'version','V120.0-RC','canonical_saves',saves,
  'revision_heads',heads,'command_receipts',receipts,'active_farms',active_farms,
  'hash_mismatches',hash_mismatches,'missing_checkpoint_a',missing_a,
  'corrupted_checkpoints',corrupted_checkpoints,'active_capture_triggers',capture_triggers,
  'db_preflight_passed',(saves=heads AND hash_mismatches=0 AND missing_a=0
                        AND corrupted_checkpoints=0 AND active_farms=0 AND capture_triggers=2),
  'cutover_certified',false,
  'note','Preflight database only. Legacy writers must be migrated and load-tested before enforce.'
 ) FROM counts;
$readiness$;
REVOKE ALL ON FUNCTION public.stellar_save_release_readiness_v120() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_save_release_readiness_v120() TO service_role;
