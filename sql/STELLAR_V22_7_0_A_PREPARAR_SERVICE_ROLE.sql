-- Etapa A (segura com a versao antiga ainda no ar):
-- libera a credencial privilegiada do Render, SEM revogar escrita dos jogadores.
BEGIN;
GRANT SELECT, INSERT, UPDATE ON public.game_saves TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO service_role;
COMMIT;
