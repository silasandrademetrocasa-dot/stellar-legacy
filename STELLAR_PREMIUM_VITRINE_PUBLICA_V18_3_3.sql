-- V18.3.3 • Stellar Legacy — prévia somente leitura do catálogo Premium de testes
-- Visibilidade para pilotos autenticados; compras simuladas permanecem exclusivas do ADM.
-- NÃO altera recompensas, save, preços, assinaturas, cartões ou cobradores.
CREATE OR REPLACE FUNCTION public.get_premium_stage_catalog_v1833()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
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
    'tier_quantity',tier_quantity,'test_only',true,'live_enabled',false
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
REVOKE ALL ON FUNCTION public.get_premium_stage_catalog_v1833() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_premium_stage_catalog_v1833() TO authenticated;
COMMENT ON FUNCTION public.get_premium_stage_catalog_v1833() IS 'Vitrine Premium de testes; somente dados públicos de ofertas, nenhuma simulação ou cobrança.';
