-- V119.1 -- consultas somente leitura. Os dados jogaveis continuam no game_saves.
SELECT COUNT(*) AS saves FROM public.game_saves;
SELECT COUNT(*) AS heads FROM public.stellar_player_save_head_v119;
SELECT t.tgname,t.tgenabled FROM pg_trigger t
 WHERE t.tgrelid='public.game_saves'::regclass
 AND t.tgname LIKE 'stellar_capture_save_%_v119';
SELECT p.callsign,h.revision,
       h.state_hash=md5(g.state::text) AS authoritative_hash_ok,
       h.checkpointed_at AS last_checkpoint,
       h.journaled_at AS last_summary,
       (SELECT COUNT(*) FROM public.stellar_player_save_operation_v119 o WHERE o.user_id=p.id) AS operation_receipts
FROM public.profiles p JOIN public.game_saves g ON g.user_id=p.id
JOIN public.stellar_player_save_head_v119 h ON h.user_id=p.id
ORDER BY p.callsign;
SELECT slot,COUNT(*) AS copies,
 COUNT(*) FILTER (WHERE state_hash=md5(state::text)) AS hash_ok
FROM public.stellar_player_save_checkpoint_v119 GROUP BY slot ORDER BY slot;
SELECT unnest(modules) AS module,COUNT(*) AS logs_15m
FROM public.stellar_player_save_journal_v119
WHERE created_at>now()-interval '15 minutes'
GROUP BY 1 ORDER BY 2 DESC;
