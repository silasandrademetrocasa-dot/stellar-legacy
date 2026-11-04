-- Desliga somente a captura, preservando saves e recibos historicos.
DROP TRIGGER IF EXISTS stellar_capture_save_insert_v119 ON public.game_saves;
DROP TRIGGER IF EXISTS stellar_capture_save_update_v119 ON public.game_saves;
