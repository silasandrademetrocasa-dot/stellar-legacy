-- STELLAR LEGACY V81 • ROLLBACK ADMINISTRATIVO DOS DADOS DE CONFIGURACAO
-- Somente se desejar desfazer o BALANCEAMENTO NO SUPABASE.
-- O ZIP de rollback do GitHub nao desfaz automaticamente configuracoes do Supabase.
-- Usa backup privado criado no projeto stellar-legacy. Nao altera game_saves nem perfis.
BEGIN;
DO $check$ BEGIN
IF (SELECT count(*) FROM public.stellar_balance_backup_v81)<150 THEN
 RAISE EXCEPTION 'Backup V81 ausente/incompleto: pare para evitar corrupcao';END IF;
END $check$;
UPDATE public.game_npc_config_v1811 n SET
 hp=(b.original->>'hp')::bigint,shield=(b.original->>'shield')::bigint,
 damage=(b.original->>'damage')::bigint,speed=(b.original->>'speed')::numeric,
 xp=(b.original->>'xp')::bigint,credits=(b.original->>'credits')::bigint,
 stl=(b.original->>'stl')::bigint,resources=b.original->'resources',
 respawn_min_ms=(b.original->>'respawn_min_ms')::integer,
 respawn_max_ms=(b.original->>'respawn_max_ms')::integer,
 enabled=(b.original->>'enabled')::boolean,updated_at=now()
FROM public.stellar_balance_backup_v81 b WHERE b.kind='npc' AND b.row_key=n.npc_key;
UPDATE public.game_map_npc_spawns_v1811 s SET
 spawn_count=(b.original->>'spawn_count')::integer,enabled=(b.original->>'enabled')::boolean,updated_at=now()
FROM public.stellar_balance_backup_v81 b WHERE b.kind='spawn' AND b.row_key=s.map_id||':'||s.npc_key;
UPDATE public.game_map_config_v1814 m SET min_level=(b.original->>'min_level')::integer,updated_at=now()
FROM public.stellar_balance_backup_v81 b WHERE b.kind='map' AND b.row_key=m.map_id;
UPDATE public.game_mission_category_v1815 m SET
 reward_factor=(b.original->>'reward_factor')::numeric,item_chance=(b.original->>'item_chance')::numeric,
 min_level=(b.original->>'min_level')::integer,config=b.original->'config',
 enabled=(b.original->>'enabled')::boolean,updated_at=now()
FROM public.stellar_balance_backup_v81 b WHERE b.kind='mission_category' AND b.row_key=m.category;
DELETE FROM public.game_mission_custom_v1815 WHERE mission_id LIKE 'v81_%'
 AND NOT EXISTS(SELECT 1 FROM public.stellar_balance_backup_v81 b
 WHERE b.kind='mission_custom' AND b.row_key=game_mission_custom_v1815.mission_id);
UPDATE public.galaxy_gate_config_v1906 g SET
 config=b.original->'config',version=g.version+1,updated_at=now()
FROM public.stellar_balance_backup_v81 b WHERE b.kind='portal' AND b.row_key=g.id::text;
UPDATE public.game_runtime_meta_v1810 SET version=version+1,updated_at=now()
 WHERE config_key IN ('npc','world','systems');
COMMIT;
-- A lista de especies aceitas pelo editor ADM de Portais tambem mudou na V81;
-- para restauração integral da funcao usar backup de schema SQL do projeto ou suporte tecnico.
