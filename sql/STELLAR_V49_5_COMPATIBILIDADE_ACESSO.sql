-- V49.5: apenas permissão de leitura service_role (já aplicada em 23/10/2026).
-- Reexecutável; não cria/modifica jogadores, resgates nem economia.
GRANT SELECT ON TABLE public.game_admins TO service_role;
REVOKE SELECT ON TABLE public.game_admins FROM anon, authenticated;
