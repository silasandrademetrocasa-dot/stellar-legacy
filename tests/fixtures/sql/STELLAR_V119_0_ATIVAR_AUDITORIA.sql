-- EXECUTE APOS PREPARAR + CHECK DE BACKUP + TESTE EM HOMOLOGACAO.
-- Captura TODAS as mutacoes no save canonico, inclusive RPCs legadas.
DROP TRIGGER IF EXISTS stellar_capture_save_insert_v119 ON public.game_saves;
DROP TRIGGER IF EXISTS stellar_capture_save_update_v119 ON public.game_saves;
CREATE TRIGGER stellar_capture_save_insert_v119
  AFTER INSERT ON public.game_saves FOR EACH ROW
  EXECUTE FUNCTION public.stellar_capture_canonical_save_v119();
CREATE TRIGGER stellar_capture_save_update_v119
  AFTER UPDATE OF state ON public.game_saves FOR EACH ROW
  WHEN (OLD.state IS DISTINCT FROM NEW.state)
  EXECUTE FUNCTION public.stellar_capture_canonical_save_v119();
