-- STELLAR V20 ETAPA 2: receitas viáveis e próxima temporada, preservando Outubro
BEGIN;
DO $v20$ BEGIN
  IF (SELECT count(*) FROM public.game_crafting_recipe_v1815 WHERE recipe_id IN ('ammo_pls2','rocket_pack','prometid_batch','duranium_batch','promerium_batch','repair_bonus')) <> 6 THEN
    RAISE EXCEPTION 'V20 craft: receitas incompletas; abortando';
  END IF;
  IF EXISTS (SELECT 1 FROM public.game_crafting_recipe_v1815 WHERE (recipe_id='ammo_pls2' AND cost NOT IN (750000,20000)) OR (recipe_id='rocket_pack' AND cost NOT IN (500000,50000)) OR (recipe_id='prometid_batch' AND cost NOT IN (200000,30000)) OR (recipe_id='duranium_batch' AND cost NOT IN (400000,25000)) OR (recipe_id='promerium_batch' AND cost NOT IN (1500000,50000)) OR (recipe_id='repair_bonus' AND cost NOT IN (1000000,150000))) THEN
    RAISE EXCEPTION 'V20 craft: preço foi editado no ADM; revisar antes de aplicar';
  END IF;
END $v20$;
UPDATE public.game_crafting_recipe_v1815 SET cost=20000,ingredients='{"Prometium": 20, "Endurium": 20, "Terbium": 20}'::jsonb,updated_at=now() WHERE recipe_id='ammo_pls2' AND cost IN (750000,20000);
UPDATE public.game_crafting_recipe_v1815 SET cost=50000,ingredients='{"Endurium": 20, "Terbium": 50}'::jsonb,updated_at=now() WHERE recipe_id='rocket_pack' AND cost IN (500000,50000);
UPDATE public.game_crafting_recipe_v1815 SET cost=30000,ingredients='{"Prometium": 75, "Endurium": 50, "Terbium": 25}'::jsonb,updated_at=now() WHERE recipe_id='prometid_batch' AND cost IN (200000,30000);
UPDATE public.game_crafting_recipe_v1815 SET cost=25000,ingredients='{"Endurium": 60, "Terbium": 45, "Prometid": 3}'::jsonb,updated_at=now() WHERE recipe_id='duranium_batch' AND cost IN (400000,25000);
UPDATE public.game_crafting_recipe_v1815 SET cost=50000,ingredients='{"Xenomit": 1, "Duranium": 3, "Prometid": 3}'::jsonb,updated_at=now() WHERE recipe_id='promerium_batch' AND cost IN (1500000,50000);
UPDATE public.game_crafting_recipe_v1815 SET cost=150000,ingredients='{"Duranium": 2, "Endurium": 10, "Prometium": 10}'::jsonb,updated_at=now() WHERE recipe_id='repair_bonus' AND cost IN (1000000,150000);

-- Pré-configura NOVEMBRO (350 pontos/tier, 100 por missão): 21 dias para completar, Outubro inalterado.
-- A nova temporada fica ativa SOMENTE dentro de sua janela futura (01 Nov - 01 Dez SP).
INSERT INTO public.game_battle_pass_seasons_v1817b (season_key,name,description,starts_at,ends_at,tier_count,points_per_tier,daily_points,premium_price_brl,enabled,updated_at)
SELECT '2026-11','TEMPORADA NOVEMBRO 2026','Temporada equilibrada: 30 tiers, cerca de 21 dias de missões ativas.',
'2026-11-01 03:00:00+00'::timestamptz,'2026-12-01 03:00:00+00'::timestamptz,
30,350,100,premium_price_brl,true,now()
FROM public.game_battle_pass_seasons_v1817b WHERE season_key='2026-10'
ON CONFLICT (season_key) DO NOTHING;
INSERT INTO public.game_battle_pass_tiers_v1817b (season_key,tier_no,free_reward,premium_reward,enabled,updated_at)
SELECT '2026-11',tier_no,free_reward,premium_reward,true,now() FROM public.game_battle_pass_tiers_v1817b
WHERE season_key='2026-10' AND enabled
ON CONFLICT (season_key,tier_no) DO NOTHING;
-- O ARC-X especial fica como prêmio de mérito no tier final gratuito (somente novembro).
UPDATE public.game_battle_pass_tiers_v1817b SET free_reward=jsonb_set(free_reward,'{items}', ' ["lfx"] '::jsonb,true),updated_at=now()
WHERE season_key='2026-11' AND tier_no=30 AND free_reward->'items'='["g3n3310"]'::jsonb;
-- O laser ARC-Ω fica no último nível Premium (um único item em vez de equipamento padrão).
UPDATE public.game_battle_pass_tiers_v1817b SET premium_reward=jsonb_set(premium_reward,'{items}', '["lfomega"]'::jsonb,true),updated_at=now()
WHERE season_key='2026-11' AND tier_no=30 AND premium_reward->'items'='["sg3nb03"]'::jsonb;
DO $v20$ BEGIN
 IF (SELECT count(*) FROM public.game_battle_pass_tiers_v1817b WHERE season_key='2026-11' AND enabled)<>30 THEN RAISE EXCEPTION 'V20 pass: 30 tiers necessários'; END IF;
 IF (SELECT points_per_tier FROM public.game_battle_pass_seasons_v1817b WHERE season_key='2026-10')<>500 THEN RAISE EXCEPTION 'V20 pass: Outubro não pode ser alterado'; END IF;
END $v20$;
-- Ativa a atualização das configurações para clientes e Render sem exigir novo relog.
UPDATE public.game_runtime_meta_v1810 SET version=version+1,updated_at=now()
 WHERE config_key IN ('systems','pass');
COMMIT;
