-- STELLAR LEGACY — ampliacao PvE X-1 a X-8 (V21.5.4).
-- Aplicacao idempotente e condicionada: nunca sobrescreve ajustes personalizados do ADM.
-- Preserva TODOS os saves, donos A/B/C, recompensas, NPCs, recursos, niveis e campanhas.
-- Aurora/Nexus/Eclipse e PvP 4-X NAO sao alterados por esta migracao.
BEGIN;
WITH expected(map_id, old_w, old_h, new_w, new_h) AS (
 VALUES
  ('x1', 6000, 4500, 7200, 5400),
  ('x2', 6600, 4800, 7900, 5800),
  ('x3', 7200, 5200, 8650, 6250),
  ('x4', 7800, 5600, 9400, 6750),
  ('x5', 8400, 6100, 10100, 7300),
  ('x6', 8900, 6500, 10700, 7800),
  ('x7', 9400, 6900, 11300, 8300),
  ('x8', 10000, 7400, 12000, 8900)
)
UPDATE public.game_map_config_v1814 m
SET world_w = e.new_w, world_h = e.new_h, updated_at = now()
FROM expected e
WHERE m.map_id = e.map_id
  AND m.battle = false AND m.gate = false
  AND m.world_w = e.old_w AND m.world_h = e.old_h;
-- Trigger map_config_bump_v1814 notifica automaticamente o World Runtime.
COMMIT;
