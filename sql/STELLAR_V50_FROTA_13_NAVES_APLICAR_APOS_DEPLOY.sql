-- STELLAR LEGACY V50 • FROTA 3D OFICIAL
-- EXECUTAR SOMENTE DEPOIS DO DEPLOY DA V50, E DA VERIFICAÇÃO DO HANGAR!
-- 13 ship IDs: phoenix leonov liberator piranha vengeance bigboy goliath citadel aegis spearhead defcom yamato nostromo.
-- Não altera saldos, propriedade histórica, equipamentos, drones, habilidades, missão ou balanceamento.
-- Backup privado. Sem políticas de leitura externa; acesso só administrativo interno.
BEGIN;
CREATE TABLE IF NOT EXISTS public.stellar_ship_v50_save_backup (
  user_id uuid PRIMARY KEY,
  previous_state jsonb NOT NULL,
  backed_up_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stellar_ship_v50_save_backup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stellar_ship_v50_save_backup FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS public.stellar_ship_v50_shop_backup (
  catalog_key text PRIMARY KEY,
  was_enabled boolean,
  was_visible boolean,
  backed_up_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stellar_ship_v50_shop_backup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stellar_ship_v50_shop_backup FROM PUBLIC, anon, authenticated;

INSERT INTO public.stellar_ship_v50_save_backup(user_id,previous_state)
SELECT s.user_id,s.state FROM public.game_saves s
WHERE COALESCE(s.state->>'activeShipId','') NOT IN
('phoenix','leonov','liberator','piranha','vengeance','bigboy','goliath','citadel','aegis','spearhead','defcom','yamato','nostromo')
ON CONFLICT(user_id) DO NOTHING;
INSERT INTO public.stellar_ship_v50_shop_backup(catalog_key,was_enabled,was_visible)
SELECT catalog_key,enabled,shop_visible FROM public.live_shop_prices_v16
WHERE kind='ship' AND ref_id NOT IN
('phoenix','leonov','liberator','piranha','vengeance','bigboy','goliath','citadel','aegis','spearhead','defcom','yamato','nostromo')
ON CONFLICT(catalog_key) DO NOTHING;

UPDATE public.game_saves s
SET state = jsonb_set(
    jsonb_set(
      jsonb_set(s.state,'{activeShipId}','"phoenix"'::jsonb,true),
      '{ownedShips}',
      CASE WHEN jsonb_typeof(s.state->'ownedShips')='array' AND (s.state->'ownedShips') @> '["phoenix"]'::jsonb
           THEN s.state->'ownedShips'
           WHEN jsonb_typeof(s.state->'ownedShips')='array' THEN s.state->'ownedShips'||'["phoenix"]'::jsonb
           ELSE '["phoenix"]'::jsonb END,true),
    '{repairRequired}',
    CASE WHEN jsonb_typeof(s.state->'repairRequired')='object'
         THEN jsonb_set(s.state->'repairRequired','{shipId}','"phoenix"'::jsonb,true)
         ELSE coalesce(s.state->'repairRequired','null'::jsonb) END,true),
    updated_at = now()
WHERE COALESCE(s.state->>'activeShipId','') NOT IN
('phoenix','leonov','liberator','piranha','vengeance','bigboy','goliath','citadel','aegis','spearhead','defcom','yamato','nostromo');

-- Mantém as 13 autorizadas com seus critérios atuais de Loja/Evento.
-- Desabilita apenas compras das naves antigas, sem retirar propriedade do usuário.
UPDATE public.live_shop_prices_v16
SET enabled=false, shop_visible=false, updated_at=now()
WHERE kind='ship' AND ref_id NOT IN
('phoenix','leonov','liberator','piranha','vengeance','bigboy','goliath','citadel','aegis','spearhead','defcom','yamato','nostromo');
COMMIT;
-- Verificação: COUNT de saves fora da frota deve ser 0.
SELECT count(*) AS saves_incompativeis FROM public.game_saves
WHERE coalesce(state->>'activeShipId','') NOT IN
('phoenix','leonov','liberator','piranha','vengeance','bigboy','goliath','citadel','aegis','spearhead','defcom','yamato','nostromo');
