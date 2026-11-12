-- ETAPA ATIVAR (SOMENTE apos PREPARAR e testes em homologacao).
-- Trata saves que mudaram entre PREPARAR e ATIVAR, sem alterar game_saves.
-- A ativacao e o resync ocorrem no mesmo commit da migration.
-- ROLLBACK do trigger: STELLAR_V119_1_CAPTURA_DESATIVAR.sql
DO $preflight$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='stellar_player_save_head_v119'
      AND column_name='checkpointed_at')
 THEN RAISE EXCEPTION 'SAVE_V1191_PREPARACAO_PENDENTE'; END IF;
 IF EXISTS (SELECT 1 FROM public.stellar_offline_farm_v484 WHERE status='running')
 THEN RAISE EXCEPTION 'FARM_EM_ANDAMENTO_ADIAR_ATIVACAO'; END IF;
END $preflight$;
LOCK TABLE public.game_saves IN SHARE ROW EXCLUSIVE MODE;
-- Congela o snapshot inicial dos saves divergentes, inclusive os antigos A/B.
CREATE TEMP TABLE _stellar_v1191_stale ON COMMIT DROP AS
SELECT g.user_id,g.state,g.updated_at,
       coalesce(h.revision,0) as revision,
       a.state as prev_a,a.state_hash as prev_a_hash,a.revision as prev_a_revision,
       a.captured_at as prev_a_time,
       b.state as prev_b,b.state_hash as prev_b_hash,b.revision as prev_b_revision,
       b.captured_at as prev_b_time
FROM public.game_saves g
LEFT JOIN public.stellar_player_save_head_v119 h ON h.user_id=g.user_id
LEFT JOIN public.stellar_player_save_checkpoint_v119 a ON a.user_id=g.user_id AND a.slot='A'
LEFT JOIN public.stellar_player_save_checkpoint_v119 b ON b.user_id=g.user_id AND b.slot='B'
WHERE g.state IS NOT NULL
AND (h.user_id IS NULL OR h.state_hash<>md5(g.state::text) OR a.user_id IS NULL
    OR a.state_hash<>md5(a.state::text));
-- Backups historicos antigos nunca sao apagados sem tentar preserva-los primeiro.
INSERT INTO public.stellar_player_save_checkpoint_v119 AS cp
  (user_id,slot,revision,state,state_hash,captured_at)
SELECT user_id,'C',prev_b_revision,prev_b,prev_b_hash,prev_b_time
FROM _stellar_v1191_stale WHERE prev_b IS NOT NULL
ON CONFLICT(user_id,slot) DO UPDATE SET
 revision=EXCLUDED.revision,state=EXCLUDED.state,
 state_hash=EXCLUDED.state_hash,captured_at=EXCLUDED.captured_at;
INSERT INTO public.stellar_player_save_checkpoint_v119 AS cp
  (user_id,slot,revision,state,state_hash,captured_at)
SELECT user_id,'B',prev_a_revision,prev_a,prev_a_hash,prev_a_time
FROM _stellar_v1191_stale WHERE prev_a IS NOT NULL
ON CONFLICT(user_id,slot) DO UPDATE SET
 revision=EXCLUDED.revision,state=EXCLUDED.state,
 state_hash=EXCLUDED.state_hash,captured_at=EXCLUDED.captured_at;
INSERT INTO public.stellar_player_save_head_v119 AS h
  (user_id,revision,state_hash,changed_at,checkpointed_at,journaled_at)
SELECT user_id,revision+1,md5(state::text),clock_timestamp(),clock_timestamp(),clock_timestamp()
FROM _stellar_v1191_stale
ON CONFLICT(user_id) DO UPDATE SET
 revision=h.revision+1,state_hash=EXCLUDED.state_hash,
 changed_at=EXCLUDED.changed_at,checkpointed_at=EXCLUDED.checkpointed_at,
 journaled_at=EXCLUDED.journaled_at;
INSERT INTO public.stellar_player_save_checkpoint_v119 AS cp
  (user_id,slot,revision,state,state_hash,captured_at)
SELECT s.user_id,'A',h.revision,s.state,md5(s.state::text),clock_timestamp()
FROM _stellar_v1191_stale s
JOIN public.stellar_player_save_head_v119 h ON h.user_id=s.user_id
ON CONFLICT(user_id,slot) DO UPDATE SET
 revision=EXCLUDED.revision,state=EXCLUDED.state,
 state_hash=EXCLUDED.state_hash,captured_at=EXCLUDED.captured_at;
-- Resync e registrado como evento de auditoria, sem tocar no progresso.
INSERT INTO public.stellar_player_save_journal_v119
  (user_id,revision,modules,before_hash,after_hash,created_at)
SELECT s.user_id,h.revision,ARRAY['migracao']::text[],s.prev_a_hash,
       md5(s.state::text),clock_timestamp()
FROM _stellar_v1191_stale s
JOIN public.stellar_player_save_head_v119 h ON h.user_id=s.user_id
ON CONFLICT(user_id,revision) DO NOTHING;
DROP TRIGGER IF EXISTS stellar_capture_save_insert_v119 ON public.game_saves;
DROP TRIGGER IF EXISTS stellar_capture_save_update_v119 ON public.game_saves;
CREATE TRIGGER stellar_capture_save_insert_v119
 AFTER INSERT ON public.game_saves FOR EACH ROW
 EXECUTE FUNCTION public.stellar_capture_canonical_save_v119();
CREATE TRIGGER stellar_capture_save_update_v119
 AFTER UPDATE OF state ON public.game_saves FOR EACH ROW
 WHEN (OLD.state IS DISTINCT FROM NEW.state)
 EXECUTE FUNCTION public.stellar_capture_canonical_save_v119();
