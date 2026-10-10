-- Restaura somente os valores originais ainda iguais à redução aplicada pela V18.1.9.
-- Não sobrescreve alterações posteriores feitas manualmente no ADM.
BEGIN;
WITH target(map_id,npc_key,prior_count,new_count) AS (
  VALUES
    ('b41', 'bossMordon', 8, 6),
    ('b41', 'devolarium', 8, 6),
    ('b41', 'lordakia', 15, 11),
    ('b41', 'mordon', 15, 11),
    ('b41', 'saimon', 19, 13),
    ('b42', 'bossDevolarium', 4, 3),
    ('b42', 'bossMordon', 10, 7),
    ('b42', 'devolarium', 12, 8),
    ('b42', 'mordon', 20, 14),
    ('b42', 'saimon', 18, 13),
    ('b43', 'bossDevolarium', 9, 6),
    ('b43', 'bossSibelon', 7, 5),
    ('b43', 'devolarium', 18, 13),
    ('b43', 'mordon', 20, 14),
    ('b43', 'sibelon', 13, 9),
    ('x1', 'aiderStreuner', 10, 7),
    ('x1', 'recruitStreuner', 10, 7),
    ('x1', 'streuner', 30, 21),
    ('x2', 'aiderStreuner', 11, 8),
    ('x2', 'bossLordakia', 5, 4),
    ('x2', 'bossStreuner', 8, 6),
    ('x2', 'lordakia', 19, 13),
    ('x2', 'recruitStreuner', 11, 8),
    ('x2', 'streuner', 16, 11),
    ('x3', 'bossDevolarium', 2, 1),
    ('x3', 'bossMordon', 5, 4),
    ('x3', 'bossSaimon', 5, 4),
    ('x3', 'devolarium', 5, 4),
    ('x3', 'lordakia', 17, 12),
    ('x3', 'mordon', 14, 10),
    ('x3', 'saimon', 17, 12),
    ('x4', 'bossSaimon', 9, 6),
    ('x4', 'bossSibelon', 4, 3),
    ('x4', 'lordakia', 12, 8),
    ('x4', 'mordon', 14, 10),
    ('x4', 'saimon', 14, 10),
    ('x4', 'sibelon', 7, 5)
)
UPDATE public.game_map_npc_spawns_v1811 AS spawn
SET spawn_count = target.prior_count, updated_at = NOW()
FROM target
WHERE spawn.map_id = target.map_id
  AND spawn.npc_key = target.npc_key
  AND spawn.spawn_count = target.new_count;
COMMIT;
