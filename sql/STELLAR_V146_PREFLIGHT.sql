BEGIN READ ONLY;
DO $$
BEGIN
 IF to_regprocedure('public.stellar_player_read(uuid,text,text[])') IS NULL OR
    to_regprocedure('public.stellar_player_commit(uuid,text,text,text,jsonb)') IS NULL OR
    to_regprocedure('public.stellar_player_lock(uuid)') IS NULL THEN
  RAISE EXCEPTION 'V146: núcleo transacional V134 ausente';
 END IF;
 IF to_regclass('public.stellar_player_baselines_v134') IS NULL OR
    to_regclass('public.stellar_player_save_abc_v118') IS NULL OR
    to_regclass('public.stellar_collection_drops_v134') IS NULL THEN
  RAISE EXCEPTION 'V146: baseline/ABC/coleta ausentes';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.game_saves'::regclass AND tgname='stellar_player_snapshot_v134' AND NOT tgisinternal) THEN
  RAISE EXCEPTION 'V146: snapshot central/ABC ausente';
 END IF;
END $$;
COMMIT;
