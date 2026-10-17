-- Stellar Legacy: balanceamento de distancias PvP (4-1, 4-2, 4-3).
-- Execute somente quando for publicar o ZIP da mesma versao: muda o World Runtime vivo.
-- Preserva donos A/B/C, conquistas, saves, NPCs, niveis e posicoes existentes.
BEGIN;
UPDATE public.game_map_config_v1814
SET world_w = CASE map_id WHEN 'b41' THEN 11800 WHEN 'b42' THEN 12500 WHEN 'b43' THEN 13500 END,
    world_h = CASE map_id WHEN 'b41' THEN 8400 WHEN 'b42' THEN 8900 WHEN 'b43' THEN 9600 END,
    updated_at = now()
WHERE (map_id='b41' AND world_w=9800 AND world_h=7000)
   OR (map_id='b42' AND world_w=10400 AND world_h=7400)
   OR (map_id='b43' AND world_w=11200 AND world_h=8000);
-- Trigger existente map_config_bump_v1814 atualiza a versao do runtime.
COMMIT;
