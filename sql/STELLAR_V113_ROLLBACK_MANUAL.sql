-- V113 rollback MANUAL: use somente em incidente confirmado após inspeção.
-- Backup não inclui jogadores. Não execute junto com o instalador.
BEGIN;
DO $rollback$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.stellar_v113_balance_backup WHERE source_name='_v113' AND key='applied')
 THEN RAISE EXCEPTION 'V113 não registrada no backup'; END IF;
 UPDATE public.game_npc_config_v1811 n SET
  hp=(b.old_row->>'hp')::bigint,shield=(b.old_row->>'shield')::bigint,damage=(b.old_row->>'damage')::bigint,
  credits=(b.old_row->>'credits')::bigint,stl=(b.old_row->>'stl')::bigint,xp=(b.old_row->>'xp')::bigint,updated_at=now()
 FROM public.stellar_v113_balance_backup b WHERE b.source_name='npc' AND n.npc_key=b.key;
 UPDATE public.game_balance_entries_v1909 n SET params=b.old_row->'params',updated_at=now()
 FROM public.stellar_v113_balance_backup b WHERE b.source_name IN ('ship','item') AND n.kind=b.source_name AND n.item_id=b.key;
 UPDATE public.game_mission_category_v1815 n SET reward_factor=(b.old_row->>'reward_factor')::numeric,
  item_chance=(b.old_row->>'item_chance')::numeric,config=b.old_row->'config',updated_at=now()
 FROM public.stellar_v113_balance_backup b WHERE b.source_name='mission' AND n.category=b.key;
 UPDATE public.game_battle_pass_seasons_v1817b n SET points_per_tier=(b.old_row->>'points_per_tier')::integer,updated_at=now()
 FROM public.stellar_v113_balance_backup b WHERE b.source_name='pass' AND n.season_key=b.key;
 UPDATE public.game_balance_meta_v1909 SET version=version+1,updated_at=now() WHERE id=1;
 DELETE FROM public.stellar_v113_balance_backup WHERE source_name='_v113' AND key='applied';
END $rollback$;
COMMIT;
