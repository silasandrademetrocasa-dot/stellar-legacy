BEGIN;
-- Stellar Legacy V46 Galactic Warfare — conservative NPC composition and official arena sizes.
-- NO player saves/XP/levels/accounts, currencies, market, PvP relays or raid payouts modified.
DO $$ BEGIN
 IF (SELECT count(*) FROM public.game_map_config_v1814 WHERE map_id IN ('x1','x2','x3','x4','x5','x6','x7','x8','u1','u2','u3'))<>11 THEN
  RAISE EXCEPTION 'V46_EXPECTED_V451_MAPS_MISSING';
 END IF;
 IF (SELECT count(*) FROM public.game_portal_links_v1814 WHERE portal_key LIKE 'stellar_v451_%' AND enabled)<>6 THEN
  RAISE EXCEPTION 'V46_EXPECTED_V451_PORTALS_MISSING';
 END IF;
 IF (SELECT count(*) FROM public.game_map_config_v1814 WHERE map_id IN ('ggAlpha','ggBeta','ggGamma'))<>3 THEN
  RAISE EXCEPTION 'V46_ARENA_CONFIG_MISSING';
 END IF;
END $$;
-- Align persisted Galaxy Gate room dimensions with client ASTRAL_ARENAS.
UPDATE public.game_map_config_v1814 AS m
SET world_w=v.w, world_h=v.h,updated_at=now()
FROM (VALUES ('ggAlpha',11500,8500),('ggBeta',13200,9600),('ggGamma',14800,10800)) AS v(id,w,h)
WHERE m.map_id=v.id AND (m.world_w IS DISTINCT FROM v.w OR m.world_h IS DISTINCT FROM v.h);
-- More entry-level enemies, fewer high-health bosses at the 5–12 milestones.
-- Attributes, XP, cash and STL per kill stay unchanged, no reward exploit.
INSERT INTO public.game_map_npc_spawns_v1811(map_id,npc_key,spawn_count,enabled)
VALUES
 ('x3','saimon',16,true),('x3','mordon',7,true),('x3','devolarium',1,true),('x3','bossDevolarium',1,true),
 ('x4','saimon',15,true),('x4','mordon',7,true),('x4','sibelon',2,true),('x4','bossSibelon',1,true),
 ('x5','mordon',9,true),('x5','riftScout',4,true),('x5','sibelon',2,true),('x5','bossRiftScout',1,true),
 ('x6','devolarium',6,true),('x6','riftScout',9,true),('x6','voidCorsair',3,true),('x6','bossVoidCorsair',1,true)
ON CONFLICT(map_id,npc_key) DO UPDATE SET spawn_count=excluded.spawn_count,enabled=excluded.enabled,updated_at=now();
UPDATE public.game_runtime_meta_v1810 SET version=version+1,updated_at=now() WHERE config_key IN ('world','npc');
COMMIT;
