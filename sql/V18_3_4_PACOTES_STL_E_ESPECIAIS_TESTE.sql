-- STELLAR LEGACY V18.3.4 | Loja Premium: Recargas STL + pacotes de boas-vindas
-- AMBIENTE: TESTE. Nao habilita faturamento, credito de STL, inventario nem Premium efetivo.
-- Os pacotes Iniciante/Piloto/Avancado sao compra unica por conta.
-- Os pacotes STL sao recargas repetiveis, sem assinatura.
BEGIN;

-- 1) Nova categoria de vitrine isolada. Demais constraints de teste permanecem.
ALTER TABLE public.premium_offers_stage_v1832
  DROP CONSTRAINT premium_offers_stage_v1832_category_check;
ALTER TABLE public.premium_offers_stage_v1832
  ADD CONSTRAINT premium_offers_stage_v1832_category_check
  CHECK (category = ANY (ARRAY['premium'::text,'starter_bundle'::text,'battle_pass'::text,'pass_tiers'::text,'stl_pack'::text]));

-- 2) Pacotes STL: valores em BRL e unidades STL fixos; todos test_only, live_enabled=false.
INSERT INTO public.premium_offers_stage_v1832
(product_id,display_name,category,billing_mode,price_brl,duration_days,billing_months,tier_quantity,reward_plan,display_order,test_only,live_enabled)
VALUES
('stl_explorador_v1834','Explorador • 1.000 STL','stl_pack','one_time',7.90,NULL,NULL,NULL,
 '{"stl":1000,"items":[],"purchase_limit":null,"grants_enabled":false,"status":"staged_only"}'::jsonb,201,true,false),
('stl_patrulheiro_v1834','Patrulheiro • 2.500 STL','stl_pack','one_time',16.90,NULL,NULL,NULL,
 '{"stl":2500,"items":[],"purchase_limit":null,"grants_enabled":false,"status":"staged_only"}'::jsonb,202,true,false),
('stl_cacador_v1834','Caçador • 5.000 STL','stl_pack','one_time',29.90,NULL,NULL,NULL,
 '{"stl":5000,"items":[],"purchase_limit":null,"grants_enabled":false,"status":"staged_only"}'::jsonb,203,true,false),
('stl_elite_v1834','Elite • 12.000 STL','stl_pack','one_time',59.90,NULL,NULL,NULL,
 '{"stl":12000,"items":[],"purchase_limit":null,"grants_enabled":false,"status":"staged_only"}'::jsonb,204,true,false),
('stl_comandante_v1834','Comandante • 25.000 STL','stl_pack','one_time',109.90,NULL,NULL,NULL,
 '{"stl":25000,"items":[],"purchase_limit":null,"grants_enabled":false,"status":"staged_only"}'::jsonb,205,true,false),
('stl_galactico_v1834','Galáctico • 60.000 STL','stl_pack','one_time',219.90,NULL,NULL,NULL,
 '{"stl":60000,"items":[],"purchase_limit":null,"grants_enabled":false,"status":"staged_only"}'::jsonb,206,true,false)
ON CONFLICT(product_id) DO UPDATE SET
  display_name=excluded.display_name,
  category=excluded.category,billing_mode=excluded.billing_mode,
  price_brl=excluded.price_brl,
  reward_plan=excluded.reward_plan,
  display_order=excluded.display_order,
  test_only=true,live_enabled=false,updated_at=now();

-- 3) Pacotes especiais aprovados: 7 dias Premium + STL + munição + equipamento.
-- Recompensas catalogadas apenas para futura entrega validada, SEM conceder recursos.
UPDATE public.premium_offers_stage_v1832 SET
 reward_plan = CASE product_id
   WHEN 'starter_iniciante_v1832' THEN
    '{"stl":1500,"premium_days":7,"purchase_limit":1,"status":"approved_pending_delivery","grants_enabled":false,"items":[{"kind":"ammo","id":"mcb50","quantity":15000},{"kind":"rocket","id":"plt2021","quantity":300},{"kind":"inventory","id":"lf3","quantity":1}]}'::jsonb
   WHEN 'starter_piloto_v1832' THEN
    '{"stl":4000,"premium_days":7,"purchase_limit":1,"status":"approved_pending_delivery","grants_enabled":false,"items":[{"kind":"ammo","id":"mcb50","quantity":50000},{"kind":"rocket","id":"plt2021","quantity":1000},{"kind":"inventory","id":"lf3","quantity":2},{"kind":"inventory","id":"sg3nb02","quantity":1}]}'::jsonb
   WHEN 'starter_avancado_v1832' THEN
    '{"stl":10000,"premium_days":7,"purchase_limit":1,"status":"approved_pending_delivery","grants_enabled":false,"items":[{"kind":"ammo","id":"mcb50","quantity":120000},{"kind":"rocket","id":"plt2021","quantity":3000},{"kind":"inventory","id":"lf3","quantity":3},{"kind":"inventory","id":"sg3nb02","quantity":2}]}'::jsonb
   ELSE reward_plan
 END,updated_at=now()
WHERE product_id IN ('starter_iniciante_v1832','starter_piloto_v1832','starter_avancado_v1832')
  AND category='starter_bundle' AND test_only=true AND live_enabled=false;

-- 4) Vitrine segura para jogador: expor APENAS resumo das recompensas, sem liberar compras.
CREATE OR REPLACE FUNCTION public.get_premium_stage_catalog_v1833()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public','auth','pg_temp'
AS $function$
DECLARE v_offers jsonb; v_season jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida' USING ERRCODE='42501';
  END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id',product_id,'name',display_name,'category',category,'billing_mode',billing_mode,
    'price_brl',price_brl,'duration_days',duration_days,'billing_months',billing_months,
    'tier_quantity',tier_quantity,'stl_amount',NULLIF(reward_plan->>'stl','')::bigint,
    'premium_days',NULLIF(reward_plan->>'premium_days','')::int,
    'bundle_items', CASE WHEN category='starter_bundle' THEN reward_plan->'items' ELSE NULL END,
    'purchase_limit', NULLIF(reward_plan->>'purchase_limit','')::int,
    'test_only',true,'live_enabled',false
  ) ORDER BY display_order,product_id),'[]'::jsonb) INTO v_offers
  FROM public.premium_offers_stage_v1832 WHERE test_only=true AND live_enabled=false;
  SELECT to_jsonb(s) INTO v_season FROM (
    SELECT season_key,name,tier_count,ends_at FROM public.game_battle_pass_seasons_v1817b
    WHERE enabled AND now()>=starts_at AND now()<ends_at ORDER BY starts_at DESC LIMIT 1
  ) s;
  RETURN jsonb_build_object('test_mode',true,'billing_live',false,'rewards_live',false,
    'public_preview',true,'can_simulate',false,'offers',v_offers,'current_season',v_season,
    'test_subscription',null,'test_tiers',null);
END;$function$;

-- 5) Simulador ADM: compra unica dos pacotes especiais e idempotencia na recarga de STL.
-- Sem saldos, inventarios, saves ou premios reais alterados.
CREATE OR REPLACE FUNCTION public.admin_simulate_premium_checkout_v1832(p_product_id text,p_idempotency_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','auth','pg_temp'
AS $function$
DECLARE v_uid uuid:=auth.uid(); v_product public.premium_offers_stage_v1832%rowtype;
 v_order public.premium_checkout_tests_v1832%rowtype;
 v_season text; v_max_tier integer; v_existing_tiers integer; v_new_total integer;
BEGIN
 IF v_uid IS NULL OR NOT public.is_game_admin_v1763(v_uid) THEN
  RAISE EXCEPTION 'Acesso administrativo negado' USING ERRCODE='42501';
 END IF;
 IF length(coalesce(p_idempotency_key,''))<8 OR length(p_idempotency_key)>120
   OR p_idempotency_key !~ '^[a-zA-Z0-9:_-]+$' THEN
  RAISE EXCEPTION 'Chave de teste inválida';
 END IF;
 PERFORM pg_advisory_xact_lock(hashtext('premium_v1832:'||v_uid::text));
 SELECT * INTO v_order FROM public.premium_checkout_tests_v1832
 WHERE user_id=v_uid AND idempotency_key=p_idempotency_key;
 IF FOUND THEN
  IF v_order.product_id<>p_product_id THEN RAISE EXCEPTION 'Chave usada com outro produto'; END IF;
  RETURN jsonb_build_object('ok',true,'duplicate',true,'test_only',true,'order_id',v_order.id,
   'product_id',v_order.product_id,'price_brl',v_order.quoted_price_brl);
 END IF;
 SELECT * INTO v_product FROM public.premium_offers_stage_v1832 WHERE product_id=p_product_id AND test_only AND NOT live_enabled;
 IF NOT FOUND THEN RAISE EXCEPTION 'Oferta de teste inexistente'; END IF;
 IF v_product.category='starter_bundle' AND EXISTS (
  SELECT 1 FROM public.premium_checkout_tests_v1832 c
  WHERE c.user_id=v_uid AND c.product_id=v_product.product_id
 ) THEN
  RAISE EXCEPTION 'Pacote de compra única já simulado nesta conta.';
 END IF;
 IF v_product.category IN ('battle_pass','pass_tiers') THEN
  SELECT season_key,tier_count INTO v_season,v_max_tier FROM public.game_battle_pass_seasons_v1817b
  WHERE enabled AND now()>=starts_at AND now()<ends_at ORDER BY starts_at DESC LIMIT 1;
  IF v_season IS NULL THEN RAISE EXCEPTION 'Nenhuma temporada ativa para o teste'; END IF;
 END IF;
 IF v_product.category='pass_tiers' THEN
  SELECT purchased_tiers INTO v_existing_tiers FROM public.premium_pass_tier_tests_v1832
   WHERE user_id=v_uid AND season_key=v_season;
  v_new_total:=coalesce(v_existing_tiers,0)+v_product.tier_quantity;
  IF v_new_total>v_max_tier THEN RAISE EXCEPTION 'Teste ultrapassaria o limite de % níveis da temporada',v_max_tier; END IF;
 END IF;
 INSERT INTO public.premium_checkout_tests_v1832(user_id,idempotency_key,product_id,quoted_price_brl,season_key)
 VALUES(v_uid,p_idempotency_key,v_product.product_id,v_product.price_brl,v_season)
 RETURNING * INTO v_order;
 IF v_product.category='premium' AND v_product.billing_mode='auto_renew' THEN
  INSERT INTO public.premium_subscription_tests_v1832
   (user_id,product_id,status,auto_renew,started_at,next_renewal_at,renewal_count,last_checkout_id,updated_at)
  VALUES(v_uid,v_product.product_id,'test_active',true,now(),now()+make_interval(months=>v_product.billing_months),0,v_order.id,now())
  ON CONFLICT(user_id) DO UPDATE SET
   product_id=excluded.product_id,status='test_active',auto_renew=true,started_at=now(),
   next_renewal_at=excluded.next_renewal_at,renewal_count=0,last_checkout_id=v_order.id,updated_at=now();
 ELSIF v_product.category='pass_tiers' THEN
  INSERT INTO public.premium_pass_tier_tests_v1832(user_id,season_key,purchased_tiers)
  VALUES(v_uid,v_season,v_product.tier_quantity)
  ON CONFLICT(user_id,season_key) DO UPDATE SET
   purchased_tiers=public.premium_pass_tier_tests_v1832.purchased_tiers+excluded.purchased_tiers,updated_at=now();
 END IF;
 RETURN jsonb_build_object('ok',true,'duplicate',false,'test_only',true,
 'billing_live',false,'rewards_live',false,'order_id',v_order.id,'product_id',v_order.product_id,
 'price_brl',v_order.quoted_price_brl,'season_key',v_season,
 'simulated_tiers_total',CASE WHEN v_product.category='pass_tiers' THEN v_new_total ELSE NULL END);
END;$function$;

-- 6) Validacao atomica antes do COMMIT.
DO $$
BEGIN
 IF (SELECT count(*) FROM public.premium_offers_stage_v1832 WHERE category='stl_pack' AND test_only AND NOT live_enabled) <> 6 THEN
  RAISE EXCEPTION 'Pacotes STL divergentes, abortando atualização.';
 END IF;
 IF (SELECT count(*) FROM public.premium_offers_stage_v1832 WHERE category='starter_bundle'
  AND reward_plan->>'grants_enabled'='false' AND reward_plan->>'purchase_limit'='1'
  AND reward_plan->>'premium_days'='7') <> 3 THEN
  RAISE EXCEPTION 'Pacotes especiais nao foram protegidos como compra unica.';
 END IF;
END;$$;
COMMIT;
