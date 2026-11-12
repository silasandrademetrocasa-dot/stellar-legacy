-- V145 changes transport and local persistence only; no schema migration is necessary.
-- Safe on production: read-only transaction, no function/table/data changes.
BEGIN READ ONLY;
DO $$
BEGIN
 IF to_regprocedure('public.stellar_player_read(uuid,text,text[])') IS NULL THEN
  RAISE EXCEPTION 'V145_PREFLIGHT: stellar_player_read V134 ausente';
 END IF;
 IF to_regprocedure('public.stellar_player_commit(uuid,text,text,text,jsonb)') IS NULL THEN
  RAISE EXCEPTION 'V145_PREFLIGHT: stellar_player_commit V134 ausente';
 END IF;
 IF to_regclass('public.game_saves') IS NULL OR to_regclass('public.stellar_player_save_abc_v118') IS NULL THEN
  RAISE EXCEPTION 'V145_PREFLIGHT: save único/ABC ausente';
 END IF;
 IF to_regclass('public.stellar_player_commands_v134') IS NULL THEN
  RAISE EXCEPTION 'V145_PREFLIGHT: recibos idempotentes ausentes';
 END IF;
END $$;
COMMIT;
