-- V119.4 read-only. Inspeciona funcoes de leilao, clã, Arena, PvP e rele.
-- Nao muda SQL de partidas ou economia. Atualizar a lista apos novos RPCs.
SELECT proname,
       pg_get_function_identity_arguments(p.oid) AS arguments,
       p.prosecdef AS security_definer,
       has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_can_execute,
       has_function_privilege('anon',p.oid,'EXECUTE') AS anon_can_execute
FROM pg_proc p
WHERE p.pronamespace='public'::regnamespace
AND (proname ~ '(auction|arena|pvp|clan|relay|dominion|war_campaign)')
ORDER BY proname;
-- Auditoria externa a game_saves, sem duplicar o wallet.
SELECT (SELECT COUNT(*) FROM public.stellar_player_save_operation_v119) AS gateway_receipts,
       (SELECT COUNT(*) FROM public.stellar_player_save_journal_v119) AS save_journal_events;
