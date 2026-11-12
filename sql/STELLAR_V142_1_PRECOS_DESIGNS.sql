BEGIN;
SET LOCAL lock_timeout='5s';
CREATE OR REPLACE FUNCTION public.stellar_natal_design_price_v1421(p_definition jsonb) RETURNS bigint
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE base bigint;factor int;
BEGIN
 IF p_definition#>>'{eligibility,source}' IS DISTINCT FROM 'shop' THEN RETURN 0;END IF;
 SELECT price INTO base FROM public.live_shop_prices_v16 WHERE catalog_key='ship:'||(p_definition#>>'{eligibility,ship_id}') AND currency='uridium' AND price>0;
 IF base IS NULL THEN SELECT greatest(2500000,coalesce(max(price),0)) INTO base FROM public.live_shop_prices_v16 WHERE kind='ship' AND currency='uridium';END IF;
 factor:=CASE WHEN p_definition->>'design_id' ~ '_(br|us|jp|es|pt)$' THEN 10 ELSE 2 END;
 RETURN base*factor;
END $$;
REVOKE ALL ON FUNCTION public.stellar_natal_design_price_v1421(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_natal_design_price_v1421(jsonb) TO service_role;

UPDATE public.stellar_natal_rewards_v132 SET definition=jsonb_set(definition,'{price}',to_jsonb(public.stellar_natal_design_price_v1421(definition))) WHERE id LIKE 'design:%' AND definition#>>'{eligibility,source}'='shop';

CREATE OR REPLACE FUNCTION public.stellar_natal_status_v132(p_user_id uuid) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT jsonb_build_object('config',(SELECT to_jsonb(c) FROM public.stellar_natal_config_v132 c WHERE id=1),
 'player',(SELECT to_jsonb(p) FROM public.stellar_natal_players_v132 p WHERE user_id=p_user_id),
 'counts',(SELECT coalesce(jsonb_agg(t),'[]') FROM (SELECT faction,kind,count(*) qty FROM public.stellar_natal_counts_v132 GROUP BY faction,kind) t),
 'claims',(SELECT coalesce(jsonb_agg(key),'[]') FROM public.stellar_natal_actions_v132 WHERE user_id=p_user_id AND key NOT LIKE 'box:%' AND key NOT LIKE 'npc:%' AND key NOT LIKE 'fire:%'),
 'design_prices',(SELECT coalesce(jsonb_object_agg(definition->>'design_id',public.stellar_natal_design_price_v1421(definition)),'{}') FROM public.stellar_natal_rewards_v132 WHERE id LIKE 'design:%'));
$$;
REVOKE ALL ON FUNCTION public.stellar_natal_status_v132(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_natal_status_v132(uuid) TO service_role;

DO $patch$
DECLARE d text;old_price text:=$old$price:=(d->>'price')::bigint;$old$;
 new_price text:=$new$
 -- DESIGN_PRICE_QUOTE_V1421
 price:=public.stellar_natal_design_price_v1421(d);
 IF jsonb_typeof(p_payload->'price_quote') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Preços atualizados. Atualize o jogo e abra a loja de Natal novamente.';END IF;
 IF (p_payload->>'price_quote')::numeric IS DISTINCT FROM price::numeric OR price<=0 THEN RAISE EXCEPTION 'O preço mudou. Atualize a loja de Natal antes de comprar.';END IF;
 $new$;
BEGIN
 d:=pg_get_functiondef('public.stellar_natal_action_v132(uuid,text,text,jsonb)'::regprocedure);
 IF position('DESIGN_PRICE_QUOTE_V1421' in d)=0 THEN
  IF position(old_price in d)=0 THEN RAISE EXCEPTION 'DESIGN_PRICE_VERSION_MISMATCH';END IF;
  EXECUTE replace(d,old_price,new_price);
 END IF;
END $patch$;
NOTIFY pgrst,'reload schema';
COMMIT;
