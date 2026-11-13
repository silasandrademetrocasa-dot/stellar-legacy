-- Additive optimization. No price, balance, item, receipt or existing function is changed.
BEGIN;
CREATE OR REPLACE FUNCTION public.stellar_shop_context_v1451(
 p_user_id uuid,p_request_id text,p_catalog_key text,p_bulk boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE s jsonb; at timestamptz; product jsonb; prior jsonb; premium boolean:=false;
BEGIN
 IF p_user_id IS NULL OR p_request_id IS NULL OR length(p_request_id) NOT BETWEEN 10 AND 90
  OR p_catalog_key IS NULL OR length(p_catalog_key) NOT BETWEEN 2 AND 120 THEN
  RAISE EXCEPTION 'SHOP_CONTEXT_ARGUMENT_INVALID';
 END IF;
 -- Read-only context, no account lock held over a network round trip.
 -- The existing stellar_player_commit still serializes and validates the actual debit/receipt.
 IF p_bulk THEN
  SELECT jsonb_build_object('operation',r.operation,'request_hash',r.request_hash,'receipt',r.receipt)
   INTO prior FROM public.stellar_economy_receipts_v125 r WHERE r.user_id=p_user_id AND r.request_id=p_request_id;
 ELSE
  IF p_request_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RAISE EXCEPTION 'PURCHASE_ID_INVALID';END IF;
  SELECT jsonb_build_object('catalog_key',r.catalog_key,'receipt',r.receipt)
   INTO prior FROM public.stellar_live_purchase_receipts_v123 r WHERE r.user_id=p_user_id AND r.request_id=p_request_id::uuid;
 END IF;
 SELECT state,updated_at INTO s,at FROM public.game_saves WHERE user_id=p_user_id;
 IF s IS NOT NULL AND nullif(s->>'accountOwnerId','') IS NOT NULL AND s->>'accountOwnerId' IS DISTINCT FROM p_user_id::text THEN RAISE EXCEPTION 'PLAYER_OWNER_INVALID';END IF;
 -- Recover a durable receipt before consulting the current product or Premium entitlement.
 IF prior IS NULL THEN
  SELECT to_jsonb(c) INTO product FROM public.live_shop_prices_v16 c WHERE c.catalog_key=p_catalog_key;
  IF NOT p_bulk AND product->>'currency'='uridium' AND product->>'kind' IN ('ship','laser','generator','drone','extra','pet','pet_gear') THEN
   SELECT coalesce(premium_until>now(),false) INTO premium FROM public.premium_accounts_v12 WHERE user_id=p_user_id;
  END IF;
 END IF;
 RETURN jsonb_build_object('save',jsonb_build_object('state',s,'updated_at',at,'save_token',md5(s::text)),
  'receipt',prior,'catalog',product,'premium_active',coalesce(premium,false));
END $fn$;
REVOKE ALL ON FUNCTION public.stellar_shop_context_v1451(uuid,text,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_shop_context_v1451(uuid,text,text,boolean) TO service_role;
-- The existing server already reads saves/receipts under service_role.
-- Only these extra configuration columns are required for the invoker context helper.
GRANT SELECT ON TABLE public.live_shop_prices_v16 TO service_role;
GRANT SELECT(user_id,premium_until) ON TABLE public.premium_accounts_v12 TO service_role;
COMMIT;
