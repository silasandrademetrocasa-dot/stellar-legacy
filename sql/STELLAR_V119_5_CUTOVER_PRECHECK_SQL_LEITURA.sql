-- V119.5: SOMENTE LEITURA / inspect before cutover.
-- Nao ativa trigger/enforce e nao mexe em save, farmacia, leilao ou catalogo.
SELECT (SELECT count(*) FROM public.game_saves) AS canonical_saves,
 (SELECT count(*) FROM public.stellar_player_save_head_v119) AS revision_heads,
 (SELECT count(*) FROM public.stellar_player_save_operation_v119) AS gateway_receipts,
 (SELECT count(*) FROM public.stellar_offline_farm_v484 WHERE status='running') AS running_farms;
SELECT COUNT(*) AS divergent_heads
FROM public.game_saves g LEFT JOIN public.stellar_player_save_head_v119 h ON h.user_id=g.user_id
WHERE h.user_id IS NULL OR h.state_hash IS DISTINCT FROM md5(g.state::text);
SELECT slot,count(*) AS rows,count(*) FILTER(WHERE state_hash=md5(state::text)) AS correct_hash
FROM public.stellar_player_save_checkpoint_v119 GROUP BY slot ORDER BY slot;
SELECT tgname,tgenabled FROM pg_trigger
WHERE tgrelid='public.game_saves'::regclass AND tgname LIKE '%v119%';
