-- ROLLBACK DA CAPTURA (mantem snapshots/recibos preservados).
DROP TRIGGER IF EXISTS stellar_capture_save_insert_v119 ON public.game_saves;
DROP TRIGGER IF EXISTS stellar_capture_save_update_v119 ON public.game_saves;
