BEGIN;
-- V45 is additive: no save, inventory, relay, currency or Warfront modification.
DO $$ BEGIN
 IF to_regclass('public.game_sector_nodes_v1814') IS NULL
 OR to_regclass('public.game_map_npc_spawns_v1811') IS NULL
 OR to_regclass('public.stellar_u435_raid_config') IS NULL
 THEN RAISE EXCEPTION 'PREREQUISITE_V44_SQL_MISSING'; END IF;
END $$;
CREATE OR REPLACE FUNCTION public.stellar_u450_admin_diagnostics()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE
 v_uid uuid:=auth.uid();
 v_maps jsonb;v_routes jsonb;v_raid jsonb;v_total integer;v_world bigint;v_npc bigint;
BEGIN
 IF v_uid IS NULL OR NOT public.is_game_admin_v1763(v_uid)
 THEN RAISE EXCEPTION 'ADMIN_ONLY' USING ERRCODE='42501';END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'id',m.map_id,'label',m.label,'name',m.name,'enabled',m.enabled,
  'spawnTypes',(SELECT count(*) FROM public.game_map_npc_spawns_v1811 n WHERE n.map_id=m.map_id AND n.enabled AND n.spawn_count>0),
  'resourceTypes',(SELECT count(*) FROM public.game_map_resource_pool_v1814 r WHERE r.map_id=m.map_id AND r.enabled)
 ) ORDER BY m.map_id),'[]'::jsonb) INTO v_maps
 FROM public.game_map_config_v1814 m WHERE m.map_id IN ('u1','u2','u3');
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'from',p.from_sector,'to',p.to_sector,'enabled',p.enabled,'bidirectional',p.bidirectional
 ) ORDER BY p.sort_order),'[]'::jsonb) INTO v_routes
 FROM public.game_portal_links_v1814 p
 WHERE p.portal_key IN ('stellar_u440_earth','stellar_u440_mars','stellar_u440_jupiter','stellar_u440_veil_ion','stellar_u440_ion_void');
 SELECT jsonb_build_object('enabled',r.enabled,'target',r.target_kills,'minimum',r.min_player_kills,'reward',r.research_reward)
 INTO v_raid FROM public.stellar_u435_raid_config r WHERE r.id=1;
 SELECT count(*) INTO v_total FROM public.game_map_config_v1814;
 SELECT version INTO v_world FROM public.game_runtime_meta_v1810 WHERE config_key='world';
 SELECT version INTO v_npc FROM public.game_runtime_meta_v1810 WHERE config_key='npc';
 RETURN jsonb_build_object('maps',v_maps,'routes',v_routes,'raid',coalesce(v_raid,'{}'::jsonb),
   'totalMaps',v_total,'worldRevision',v_world,'npcRevision',v_npc);
END $$;
REVOKE ALL ON FUNCTION public.stellar_u450_admin_diagnostics() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_u450_admin_diagnostics() TO authenticated;
COMMIT;
