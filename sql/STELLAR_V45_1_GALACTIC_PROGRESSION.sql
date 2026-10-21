BEGIN;
-- Stellar Legacy V45.1 — level progression and faction PvP entry. No save/ledger/market mutation.
DO $$ BEGIN
 IF to_regclass('public.game_map_config_v1814') IS NULL OR
    to_regclass('public.game_sector_nodes_v1814') IS NULL OR
    to_regclass('public.game_portal_links_v1814') IS NULL OR
    to_regclass('public.game_map_npc_spawns_v1811') IS NULL OR
    to_regclass('public.game_runtime_meta_v1810') IS NULL
 THEN RAISE EXCEPTION 'V45_PREREQUISITES_MISSING';END IF;
 IF (SELECT count(*) FROM public.game_map_config_v1814 WHERE map_id IN ('x1','x2','x3','x4','x5','x6','x7','x8','u1','u2','u3'))<>11
 OR (SELECT count(*) FROM public.game_sector_nodes_v1814 WHERE sector_label IN ('1-1','2-1','3-1','1-4','2-4','3-4','1-5','2-5','3-5','4-1','4-2','4-3','U-1','U-2','U-3'))<>15
 THEN RAISE EXCEPTION 'V45_MAP_OR_SECTOR_INCOMPLETE';END IF;
END $$;
-- Exact levels on map definitions (server join uses both map and sector). All factions equal.
WITH levels(map_id,min_level) AS (
 VALUES ('x1',1),('x2',3),('x3',5),('x4',7),('x5',9),('x6',12),('x7',15),('x8',18),('u1',20),('u2',21),('u3',22))
UPDATE public.game_map_config_v1814 m SET min_level=l.min_level,updated_at=now()
FROM levels l WHERE m.map_id=l.map_id AND m.min_level IS DISTINCT FROM l.min_level;
WITH levels(map_id,min_level) AS (
 VALUES ('x1',1),('x2',3),('x3',5),('x4',7),('x5',9),('x6',12),('x7',15),('x8',18),('u1',20),('u2',21),('u3',22),('b41',15),('b42',15),('b43',15))
UPDATE public.game_sector_nodes_v1814 s SET min_level=l.min_level,updated_at=now()
FROM levels l WHERE s.map_id=l.map_id AND s.min_level IS DISTINCT FROM l.min_level;
-- Own-faction PvP entries at each starting map + uninterrupted PvE X-4 -> X-5.
-- All links are bidirectional, keep previous battle routes as optional alternatives.
INSERT INTO public.game_portal_links_v1814(portal_key,from_sector,to_sector,bidirectional,enabled,sort_order)
VALUES
 ('stellar_v451_earth_pvp','1-1','4-1',true,true,120),
 ('stellar_v451_mars_pvp','2-1','4-2',true,true,121),
 ('stellar_v451_jupiter_pvp','3-1','4-3',true,true,122),
 ('stellar_v451_earth_pve','1-4','1-5',true,true,123),
 ('stellar_v451_mars_pve','2-4','2-5',true,true,124),
 ('stellar_v451_jupiter_pve','3-4','3-5',true,true,125)
ON CONFLICT(portal_key) DO UPDATE SET from_sector=excluded.from_sector,to_sector=excluded.to_sector,
 bidirectional=true,enabled=true,sort_order=excluded.sort_order,updated_at=now();
-- Rebalance density only: keep enemy stats and reward definitions unchanged.
-- Introduce transitional enemies to lower the equipment cliff between tiers 5–18.
WITH distribution(map_id,npc_key,spawn_count) AS (
 VALUES
 ('x3','mordon',6),('x3','devolarium',2),('x3','bossMordon',2),
 ('x4','bossSibelon',1),('x4','sibelon',3),('x4','bossSaimon',2),
 ('x5','riftScout',6),('x5','bossRiftScout',1),('x5','sibelon',3),('x5','bossSibelon',1),('x5','mordon',6),
 ('x6','voidCorsair',5),('x6','bossVoidCorsair',1),('x6','bossRiftScout',1),('x6','devolarium',4),
 ('x7','bossNexusWarden',1),('x7','bossVoidCorsair',1),('x7','nexusWarden',6),('x7','riftScout',5),
 ('x8','bossAstralReaper',1),('x8','bossNexusWarden',1),('x8','astralReaper',5)
)
INSERT INTO public.game_map_npc_spawns_v1811(map_id,npc_key,spawn_count,enabled)
SELECT d.map_id,d.npc_key,d.spawn_count,true FROM distribution d
ON CONFLICT(map_id,npc_key) DO UPDATE SET spawn_count=excluded.spawn_count,enabled=true,updated_at=now();
UPDATE public.game_runtime_meta_v1810 SET version=version+1,updated_at=now() WHERE config_key IN ('world','npc');
COMMIT;
