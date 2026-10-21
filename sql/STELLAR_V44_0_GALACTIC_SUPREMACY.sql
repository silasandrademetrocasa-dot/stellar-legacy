BEGIN;
-- V44 additive finalization: U sector canonical links, spawn controls and private ADM kit.
-- Never edits game_saves, player wallets, relay modules or legacy combat rewards.
DO $$ BEGIN
 IF to_regclass('public.game_map_config_v1814') IS NULL OR to_regclass('public.stellar_u42_inventory') IS NULL
 OR (SELECT count(*) FROM public.game_map_config_v1814 WHERE map_id IN ('u1','u2','u3')) <> 3
 OR (SELECT count(*) FROM public.game_sector_nodes_v1814 WHERE sector_label IN ('U-1','U-2','U-3')) <> 3
 THEN RAISE EXCEPTION 'INSTALL_V435_FRONTIER_MAPS_FIRST'; END IF;
 IF (SELECT count(*) FROM public.game_npc_config_v1811 WHERE npc_key IN ('riftScout','voidCorsair','bossRiftScout','nexusWarden','bossVoidCorsair','astralReaper','bossAstralReaper')) <> 7
 THEN RAISE EXCEPTION 'MISSING_FRONTIER_NPC_DEFINITIONS'; END IF;
END $$;
-- Five canonical bidirectional routes: each faction's X-8 reaches U-1, then U-2 and U-3.
WITH v(portal_key,from_sector,to_sector,sort_order) AS (VALUES
 ('stellar_u440_earth','1-8','U-1',440),
 ('stellar_u440_mars','2-8','U-1',441),
 ('stellar_u440_jupiter','3-8','U-1',442),
 ('stellar_u440_veil_ion','U-1','U-2',443),
 ('stellar_u440_ion_void','U-2','U-3',444))
INSERT INTO public.game_portal_links_v1814(portal_key,from_sector,to_sector,bidirectional,enabled,sort_order)
SELECT v.portal_key,v.from_sector,v.to_sector,true,true,v.sort_order FROM v
WHERE NOT EXISTS (SELECT 1 FROM public.game_portal_links_v1814 p WHERE
 (p.from_sector=v.from_sector AND p.to_sector=v.to_sector) OR
 (p.bidirectional AND p.from_sector=v.to_sector AND p.to_sector=v.from_sector))
ON CONFLICT(portal_key) DO NOTHING;
-- Only fill missing NPC spawn rows: existing ADM modifications win.
WITH spawn(map_id,npc_key,spawn_count) AS (VALUES
 ('u1','riftScout',7),('u1','voidCorsair',7),('u1','bossRiftScout',2),
 ('u2','voidCorsair',8),('u2','nexusWarden',7),('u2','bossVoidCorsair',2),
 ('u3','nexusWarden',8),('u3','astralReaper',7),('u3','bossAstralReaper',2))
INSERT INTO public.game_map_npc_spawns_v1811(map_id,npc_key,spawn_count,enabled)
SELECT map_id,npc_key,spawn_count,true FROM spawn
ON CONFLICT(map_id,npc_key) DO NOTHING;
-- Owned by the ADM only; no relay modules, currency or raw materials.
CREATE TABLE IF NOT EXISTS public.stellar_u440_admin_test_grants(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 item text NOT NULL CHECK(item IN ('astral_guard','nexus_drive','eclipse_lance','trinity_matrix')),
 quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 5),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stellar_u440_admin_test_grants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.stellar_u440_admin_test_grants FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.stellar_u440_admin_test_kit(p_code text,p_quantity integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE u uuid:=auth.uid(); q integer;
BEGIN
 IF u IS NULL OR NOT public.is_game_admin_v1763(u) THEN RAISE EXCEPTION 'ADMIN_ONLY' USING ERRCODE='42501'; END IF;
 IF p_code IS NULL OR p_code NOT IN ('astral_guard','nexus_drive','eclipse_lance','trinity_matrix')
 OR p_quantity IS NULL OR p_quantity NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'INVALID_TEST_ITEM'; END IF;
 -- There is deliberately no target_user parameter: admins can only grant to themselves.
 INSERT INTO public.stellar_u42_inventory(user_id,item,quantity) VALUES(u,p_code,p_quantity)
 ON CONFLICT(user_id,item) DO UPDATE SET quantity=public.stellar_u42_inventory.quantity+excluded.quantity
 WHERE public.stellar_u42_inventory.quantity+excluded.quantity<=30
 RETURNING quantity INTO q;
 IF q IS NULL THEN RAISE EXCEPTION 'TEST_INVENTORY_LIMIT_30'; END IF;
 INSERT INTO public.stellar_u440_admin_test_grants(user_id,item,quantity) VALUES(u,p_code,p_quantity);
 RETURN jsonb_build_object('ok',true,'item',p_code,'quantity',q,'added',p_quantity);
END $$;
REVOKE ALL ON FUNCTION public.stellar_u440_admin_test_kit(text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_u440_admin_test_kit(text,integer) TO authenticated;
-- Invalidate the two relevant runtimes so both the web client and Node rooms refresh.
UPDATE public.game_runtime_meta_v1810 SET version=version+1,updated_at=now() WHERE config_key IN ('world','npc');
COMMIT;
