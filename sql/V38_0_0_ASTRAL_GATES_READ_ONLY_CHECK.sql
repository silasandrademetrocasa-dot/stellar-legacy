-- V38.0.0: somente verificação; esta versão NÃO exige SQL de migração.
-- Não altera nem lê dados pessoais de jogadores.
SELECT
 to_regclass('public.galaxy_gate_config_v1906') IS NOT NULL AS portal_admin_config_exists,
 to_regclass('public.game_saves') IS NOT NULL AS player_save_table_exists,
 to_regclass('public.stellar_dominion_rules_v360') IS NOT NULL AS previous_release_exists,
 to_regclass('public.stellar_frontier_contracts_v370') IS NOT NULL AS frontier_release_exists;
