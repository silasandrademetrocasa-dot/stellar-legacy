-- STELLAR LEGACY • CATÁLOGO E ASSINATURAS (MODO DE TESTE) V18.3.2
-- SAFE: Não altera premium_catalog_v12, premium_accounts_v12, game_saves ou saldos.
-- Não realiza cobranças, não cria assinaturas em processadores, nem concede itens.
-- Valores Premium abaixo são copiados do catálogo atual, sem mudar valores existentes.

CREATE TABLE IF NOT EXISTS public.premium_offers_stage_v1832 (
  product_id text PRIMARY KEY,
  display_name text NOT NULL,
  category text NOT NULL CHECK (category IN ('premium','starter_bundle','battle_pass','pass_tiers')),
  billing_mode text NOT NULL CHECK (billing_mode IN ('prepaid','auto_renew','one_time')),
  price_brl numeric(10,2) NOT NULL CHECK (price_brl >= 0),
  duration_days integer CHECK (duration_days > 0),
  billing_months integer CHECK (billing_months IN (1,3,6)),
  tier_quantity integer CHECK (tier_quantity > 0),
  reward_plan jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(reward_plan)='object'),
  display_order integer NOT NULL DEFAULT 100,
  test_only boolean NOT NULL DEFAULT true CHECK (test_only),
  live_enabled boolean NOT NULL DEFAULT false CHECK (NOT live_enabled),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT premium_stage_valid_billing CHECK (
    (billing_mode='auto_renew' AND billing_months IS NOT NULL AND duration_days IS NULL)
    OR (billing_mode='prepaid' AND duration_days IS NOT NULL AND billing_months IS NULL)
    OR (billing_mode='one_time' AND billing_months IS NULL AND duration_days IS NULL)
  ),
  CONSTRAINT premium_stage_valid_tiers CHECK (
    (category='pass_tiers' AND tier_quantity IS NOT NULL)
    OR (category<>'pass_tiers' AND tier_quantity IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.premium_checkout_tests_v1832 (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  idempotency_key text NOT NULL,
  product_id text NOT NULL REFERENCES public.premium_offers_stage_v1832(product_id),
  quoted_price_brl numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'simulated_paid' CHECK (status IN ('simulated_paid')),
  season_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id,idempotency_key)
);
CREATE INDEX IF NOT EXISTS premium_checkout_tests_user_v1832 ON public.premium_checkout_tests_v1832(user_id,created_at DESC);

CREATE TABLE IF NOT EXISTS public.premium_subscription_tests_v1832 (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  product_id text NOT NULL REFERENCES public.premium_offers_stage_v1832(product_id),
  status text NOT NULL DEFAULT 'test_active' CHECK (status IN ('test_active','test_cancel_at_period_end')),
  auto_renew boolean NOT NULL DEFAULT true,
  started_at timestamptz NOT NULL DEFAULT now(),
  next_renewal_at timestamptz NOT NULL,
  renewal_count integer NOT NULL DEFAULT 0 CHECK (renewal_count>=0),
  last_checkout_id bigint REFERENCES public.premium_checkout_tests_v1832(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.premium_pass_tier_tests_v1832 (
  user_id uuid NOT NULL REFERENCES auth.users(id),
  season_key text NOT NULL,
  purchased_tiers integer NOT NULL DEFAULT 0 CHECK(purchased_tiers BETWEEN 0 AND 1000),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,season_key)
);

-- Defense-in-depth: nenhuma tabela de teste é exposta diretamente no Data API.
ALTER TABLE public.premium_offers_stage_v1832 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_checkout_tests_v1832 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_subscription_tests_v1832 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_pass_tier_tests_v1832 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.premium_offers_stage_v1832,public.premium_checkout_tests_v1832,
 public.premium_subscription_tests_v1832,public.premium_pass_tier_tests_v1832 FROM PUBLIC,anon,authenticated;

-- Seed: preços Premium preservados da tabela ativa. Nenhum item ativo da Loja é alterado.
INSERT INTO public.premium_offers_stage_v1832
(product_id,display_name,category,billing_mode,price_brl,duration_days,billing_months,reward_plan,display_order)
SELECT p.id,p.name,'premium',
CASE WHEN p.id='premium_7d' THEN 'prepaid' ELSE 'auto_renew' END,
p.price_brl,
CASE WHEN p.id='premium_7d' THEN 7 ELSE NULL END,
CASE p.id WHEN 'premium_30d' THEN 1 WHEN 'premium_90d' THEN 3 WHEN 'premium_180d' THEN 6 ELSE NULL END,
jsonb_build_object('entitlement','premium','source_product',p.id,'test_only',true),
p.sort_order
FROM public.premium_catalog_v12 p
WHERE p.id IN ('premium_7d','premium_30d','premium_90d','premium_180d')
ON CONFLICT (product_id) DO NOTHING;

INSERT INTO public.premium_offers_stage_v1832
(product_id,display_name,category,billing_mode,price_brl,tier_quantity,reward_plan,display_order)
VALUES
('starter_iniciante_v1832','Pacote Iniciante','starter_bundle','one_time',9.90,NULL,'{"status":"pending_balance","stl":null,"items":[],"grants_enabled":false}'::jsonb,101),
('starter_piloto_v1832','Pacote Piloto','starter_bundle','one_time',24.90,NULL,'{"status":"pending_balance","stl":null,"items":[],"grants_enabled":false}'::jsonb,102),
('starter_avancado_v1832','Pacote Avançado','starter_bundle','one_time',49.90,NULL,'{"status":"pending_balance","stl":null,"items":[],"grants_enabled":false}'::jsonb,103),
('battle_pass_monthly','Passe de Temporada','battle_pass','one_time',19.90,NULL,'{"entitlement":"season_premium","season":"current","grants_enabled":false}'::jsonb,110),
('pass_tiers_1_v1832','Passe • +1 nível','pass_tiers','one_time',2.90,1,'{"season":"current","grants_enabled":false}'::jsonb,121),
('pass_tiers_3_v1832','Passe • +3 níveis','pass_tiers','one_time',7.90,3,'{"season":"current","grants_enabled":false}'::jsonb,122),
('pass_tiers_5_v1832','Passe • +5 níveis','pass_tiers','one_time',11.90,5,'{"season":"current","grants_enabled":false}'::jsonb,123),
('pass_tiers_10_v1832','Passe • +10 níveis','pass_tiers','one_time',19.90,10,'{"season":"current","grants_enabled":false}'::jsonb,124)
ON CONFLICT(product_id) DO NOTHING;

-- Compatibiliza o preço do Passe de teste com a temporada atual (sem alterá-la).
UPDATE public.premium_offers_stage_v1832
SET price_brl=(SELECT s.premium_price_brl FROM public.game_battle_pass_seasons_v1817b s
WHERE s.enabled AND now()>=s.starts_at AND now()<s.ends_at ORDER BY s.starts_at DESC LIMIT 1),updated_at=now()
WHERE product_id='battle_pass_monthly' AND EXISTS (
SELECT 1 FROM public.game_battle_pass_seasons_v1817b s
WHERE s.enabled AND now()>=s.starts_at AND now()<s.ends_at);

-- Operações administrativas de prévia/teste. Nenhum UPDATE/INSERT em tabelas de recompensas reais.
CREATE OR REPLACE FUNCTION public.admin_preview_premium_stage_v1832()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public','auth','pg_temp' AS $$
DECLARE v_uid uuid:=auth.uid(); v_season jsonb; v_catalog jsonb; v_sub jsonb; v_pass jsonb;
BEGIN
 IF v_uid IS NULL OR NOT public.is_game_admin_v1763(v_uid) THEN
  RAISE EXCEPTION 'Acesso administrativo negado' USING ERRCODE='42501';
 END IF;
 SELECT to_jsonb(s) INTO v_season FROM (
   SELECT season_key,name,tier_count,premium_price_brl,ends_at FROM public.game_battle_pass_seasons_v1817b
   WHERE enabled AND now()>=starts_at AND now()<ends_at ORDER BY starts_at DESC LIMIT 1
 ) s;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'id',product_id,'name',display_name,'category',category,'billing_mode',billing_mode,
  'price_brl',price_brl,'duration_days',duration_days,'billing_months',billing_months,
  'tier_quantity',tier_quantity,'reward_plan',reward_plan,'test_only',test_only,'live_enabled',live_enabled
 ) ORDER BY display_order,product_id),'[]'::jsonb) INTO v_catalog
 FROM public.premium_offers_stage_v1832;
 SELECT to_jsonb(s) INTO v_sub FROM (SELECT product_id,status,auto_renew,started_at,next_renewal_at,renewal_count
 FROM public.premium_subscription_tests_v1832 WHERE user_id=v_uid) s;
 SELECT to_jsonb(t) INTO v_pass FROM (SELECT season_key,purchased_tiers FROM public.premium_pass_tier_tests_v1832
 WHERE user_id=v_uid AND season_key=(v_season->>'season_key')) t;
 RETURN jsonb_build_object('test_mode',true,'billing_live',false,'rewards_live',false,
 'offers',v_catalog,'current_season',v_season,'test_subscription',v_sub,'test_tiers',v_pass);
END;$$;
REVOKE ALL ON FUNCTION public.admin_preview_premium_stage_v1832() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_preview_premium_stage_v1832() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_simulate_premium_checkout_v1832(p_product_id text,p_idempotency_key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public','auth','pg_temp' AS $$
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
END;$$;
REVOKE ALL ON FUNCTION public.admin_simulate_premium_checkout_v1832(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_simulate_premium_checkout_v1832(text,text) TO authenticated;

COMMENT ON TABLE public.premium_offers_stage_v1832 IS 'STAGING de produtos Premium. Somente modo teste, SEM checkout real ou concessão de itens.';
COMMENT ON TABLE public.premium_checkout_tests_v1832 IS 'Simulações administrativas SEM cobrança real; não significa pagamento aprovado por processador.';
COMMENT ON TABLE public.premium_subscription_tests_v1832 IS 'Assinaturas PREVIEW sem renovação real ou concessão de Premium.';
COMMENT ON TABLE public.premium_pass_tier_tests_v1832 IS 'Níveis simulados em separado do Passe real (sem mexer em game_saves).';
