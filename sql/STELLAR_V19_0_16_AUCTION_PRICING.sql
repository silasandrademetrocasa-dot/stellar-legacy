-- STELLAR LEGACY V19.0.16 — Pricing do leilão, editável pelo ADM.
-- APENAS SQL aditivo: mantém histórico de leilão, lances existentes, créditos, contas e itens.
BEGIN;
ALTER TABLE public.game_auction_rules_v1908
 ADD COLUMN IF NOT EXISTS stl_to_credits bigint NOT NULL DEFAULT 6667,
 ADD COLUMN IF NOT EXISTS category_multipliers jsonb NOT NULL DEFAULT '{"ammo":2.5,"rocket":2,"ship":0.03,"laser":0.04,"generator":0.04,"drone":0.05,"extra":0.04,"petGear":0.05}'::jsonb,
 ADD COLUMN IF NOT EXISTS item_multipliers jsonb NOT NULL DEFAULT '{}'::jsonb;

-- A função de leitura mantém o endpoint e RPC usados pelos clientes atuais.
CREATE OR REPLACE FUNCTION public.get_auction_rules_v1908()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','auth','pg_temp' AS $rule_read$
DECLARE r public.game_auction_rules_v1908%rowtype;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sessão ausente.'; END IF;
 SELECT * INTO r FROM public.game_auction_rules_v1908 WHERE id=1;
 RETURN jsonb_build_object('nova_floor',r.nova_floor,'common_floor',r.common_floor,'stl_to_credits',r.stl_to_credits,
 'category_multipliers',r.category_multipliers,'item_multipliers',r.item_multipliers,'version',r.version);
END;
$rule_read$;

-- Preço mínimo confiável. A fonte é a loja real, não o JSON vindo do cliente.
CREATE OR REPLACE FUNCTION public.auction_minimum_floor_v1916(p_lot_ref text)
RETURNS bigint LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $floor$
DECLARE
 r public.game_auction_rules_v1908%rowtype;
 v_prefix text; v_item text; v_kind text; v_price bigint; v_multiplier numeric; v_candidate numeric;
BEGIN
 IF p_lot_ref IS NULL OR p_lot_ref !~ '^(ammo|rocket|ship|item|petGear):[a-zA-Z0-9_]+$' THEN RETURN NULL; END IF;
 SELECT * INTO r FROM public.game_auction_rules_v1908 WHERE id=1;
 IF NOT FOUND THEN RETURN NULL; END IF;
 v_prefix:=split_part(p_lot_ref,':',1); v_item:=split_part(p_lot_ref,':',2);
 IF p_lot_ref='item:iris' THEN
   SELECT price INTO v_price FROM public.live_shop_prices_v16 WHERE catalog_key='drone:iris' AND currency='uridium' AND enabled=true AND shop_visible=true;
   IF NOT FOUND THEN RETURN NULL; END IF;
   RETURN r.nova_floor;
 END IF;
 IF v_prefix='item' THEN
   SELECT kind,price INTO v_kind,v_price FROM public.live_shop_prices_v16
   WHERE ref_id=v_item AND kind IN ('laser','generator','drone','extra') AND currency='uridium' AND enabled=true AND shop_visible=true
   ORDER BY kind LIMIT 1;
 ELSE
   v_kind:=CASE WHEN v_prefix='petGear' THEN 'pet_gear' ELSE v_prefix END;
   SELECT kind,price INTO v_kind,v_price FROM public.live_shop_prices_v16
   WHERE ref_id=v_item AND kind=v_kind AND currency='uridium' AND enabled=true AND shop_visible=true LIMIT 1;
 END IF;
 IF v_kind IS NULL OR v_price IS NULL OR v_price<=0 THEN RETURN NULL; END IF;
 v_multiplier:=COALESCE((r.item_multipliers->>p_lot_ref)::numeric,
  (r.category_multipliers->>(CASE WHEN v_prefix='petGear' THEN 'petGear' ELSE v_kind END))::numeric);
 IF v_multiplier IS NULL OR v_multiplier<0.01 OR v_multiplier>15 THEN RETURN NULL; END IF;
 v_candidate:=CEIL((v_price::numeric*r.stl_to_credits::numeric*v_multiplier)/100000::numeric)*100000;
 RETURN GREATEST(r.common_floor,v_candidate)::bigint;
END;
$floor$;

-- Atualizações só via administrador registrado. Controle de versão evita sobrescrever alterações concorrentes.
CREATE OR REPLACE FUNCTION public.admin_update_auction_rules_v1916(p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','auth','pg_temp' AS $adm$
DECLARE
 r public.game_auction_rules_v1908%rowtype;
 v_nova bigint;v_common bigint;v_ratio bigint;v_cats jsonb;v_items jsonb;
 v_key text;v_value jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_game_admin_v1763(auth.uid()) THEN RAISE EXCEPTION 'Acesso administrativo negado.'; END IF;
 IF jsonb_typeof(p_payload)<>'object' THEN RAISE EXCEPTION 'Configuração inválida.'; END IF;
 SELECT * INTO r FROM public.game_auction_rules_v1908 WHERE id=1 FOR UPDATE;
 IF r.version <> COALESCE((p_payload->>'version')::bigint,-1) THEN RAISE EXCEPTION 'Outra alteração já foi publicada. Recarregue o editor e revise.'; END IF;
 v_nova:=(p_payload->>'nova_floor')::bigint;
 v_common:=(p_payload->>'common_floor')::bigint;
 v_ratio:=(p_payload->>'stl_to_credits')::bigint;
 v_cats:=p_payload->'category_multipliers';v_items:=p_payload->'item_multipliers';
 IF v_nova NOT BETWEEN 100000000 AND 1000000000 OR v_nova%100000<>0 OR v_common NOT BETWEEN 100000 AND 10000000 OR v_common%100000<>0 OR v_ratio NOT BETWEEN 100 AND 100000 THEN RAISE EXCEPTION 'Valores de conversão ou piso fora do limite.'; END IF;
 IF jsonb_typeof(v_cats)<>'object' OR (SELECT COUNT(*) FROM jsonb_object_keys(v_cats))<>8 OR jsonb_typeof(v_items)<>'object' OR (SELECT COUNT(*) FROM jsonb_object_keys(v_items))>200 THEN RAISE EXCEPTION 'A lista de multiplicadores deve ter 8 categorias e até 200 exceções.'; END IF;
 FOR v_key,v_value IN SELECT key,value FROM jsonb_each(v_cats) LOOP
   IF v_key NOT IN ('ammo','rocket','ship','laser','generator','drone','extra','petGear') OR jsonb_typeof(v_value)<>'number' THEN RAISE EXCEPTION 'Categoria inválida: %',v_key; END IF;
   IF (v_value::text)::numeric NOT BETWEEN .01 AND 15 THEN RAISE EXCEPTION 'Multiplicador de % inválido.',v_key; END IF;
 END LOOP;
 FOR v_key,v_value IN SELECT key,value FROM jsonb_each(v_items) LOOP
   IF v_key !~ '^(ammo|rocket|ship|item|petGear):[a-zA-Z0-9_]+$' OR jsonb_typeof(v_value)<>'number' THEN RAISE EXCEPTION 'Exceção inválida: %',v_key; END IF;
   IF (v_value::text)::numeric NOT BETWEEN .01 AND 15 THEN RAISE EXCEPTION 'Multiplicador de % inválido.',v_key; END IF;
 END LOOP;
 UPDATE public.game_auction_rules_v1908 SET nova_floor=v_nova,common_floor=v_common,stl_to_credits=v_ratio,
 category_multipliers=v_cats,item_multipliers=v_items,version=version+1,updated_at=now() WHERE id=1 RETURNING * INTO r;
 RETURN jsonb_build_object('nova_floor',r.nova_floor,'common_floor',r.common_floor,'stl_to_credits',r.stl_to_credits,
  'category_multipliers',r.category_multipliers,'item_multipliers',r.item_multipliers,'version',r.version);
END;
$adm$;

-- Regra obrigatória do lado servidor para cada lance. Sem confiar em p_lot.systemFloor.
CREATE OR REPLACE FUNCTION public.place_auction_bid_online(p_hour_key text,p_lot_ref text,p_user_bid bigint,p_lot jsonb)
RETURNS TABLE(lot_ref text,user_bid bigint,leader_user_id uuid,leader_callsign text,lot jsonb,updated_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','auth','pg_temp' AS $bids$
#variable_conflict use_column
DECLARE
 v_uid uuid:=auth.uid(); v_current public.auction_bids%rowtype;
 v_credits bigint:=0;v_reserved bigint:=0;v_floor bigint;v_prefix text;v_lot_kind text;v_expected text;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Sessão ausente.'; END IF;
 v_floor:=public.auction_minimum_floor_v1916(p_lot_ref);
 IF v_floor IS NULL THEN RAISE EXCEPTION 'Este lote não pertence ao catálogo Elite autorizado.'; END IF;
 v_prefix:=split_part(p_lot_ref,':',1);v_expected:=split_part(p_lot_ref,':',2);
 v_lot_kind:=CASE WHEN v_prefix='item' THEN 'item' WHEN v_prefix='petGear' THEN 'petGear' ELSE v_prefix END;
 IF jsonb_typeof(p_lot)<>'object' OR p_lot->>'ref' IS DISTINCT FROM p_lot_ref OR p_lot->>'id' IS DISTINCT FROM v_expected OR p_lot->>'kind' IS DISTINCT FROM v_lot_kind THEN RAISE EXCEPTION 'Identidade do lote inválida.'; END IF;
 IF p_hour_key IS NULL OR p_hour_key !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{2}$' THEN RAISE EXCEPTION 'Janela do leilão inválida.'; END IF;
 IF p_user_bid < 100000 OR MOD(p_user_bid,100000)<>0 THEN RAISE EXCEPTION 'Use lances em passos de 100.000 CR.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(p_hour_key||':'||p_lot_ref));
 SELECT * INTO v_current FROM public.auction_bids WHERE hour_key=p_hour_key AND lot_ref=p_lot_ref AND status='active' ORDER BY user_bid DESC,updated_at ASC LIMIT 1 FOR UPDATE;
 IF FOUND AND v_current.user_id=v_uid THEN RAISE EXCEPTION 'Você já está liderando este lote.'; END IF;
 IF FOUND THEN
   IF p_user_bid<GREATEST(v_current.user_bid+100000,v_floor) THEN RAISE EXCEPTION 'Lance insuficiente. Piso oficial: % CR.',v_floor; END IF;
 ELSIF p_user_bid<v_floor THEN RAISE EXCEPTION 'Lance abaixo do piso oficial: % CR.',v_floor; END IF;
 SELECT COALESCE(credits,0) INTO v_credits FROM public.profiles WHERE id=v_uid FOR UPDATE;
 SELECT COALESCE(SUM(user_bid),0) INTO v_reserved FROM public.auction_bids WHERE user_id=v_uid AND hour_key=p_hour_key AND status='active' AND lot_ref<>p_lot_ref;
 IF v_credits<v_reserved+p_user_bid THEN RAISE EXCEPTION 'Créditos insuficientes considerando os lances em garantia.'; END IF;
 UPDATE public.auction_bids SET status='lost',updated_at=now() WHERE hour_key=p_hour_key AND lot_ref=p_lot_ref AND status='active';
 INSERT INTO public.auction_bids(user_id,hour_key,lot_ref,user_bid,lot,status,created_at,updated_at)
 VALUES(v_uid,p_hour_key,p_lot_ref,p_user_bid,p_lot,'active',now(),now())
 ON CONFLICT(user_id,hour_key,lot_ref) DO UPDATE SET user_bid=excluded.user_bid,lot=excluded.lot,status='active',updated_at=now();
 RETURN QUERY SELECT b.lot_ref,b.user_bid,b.user_id,COALESCE(p.callsign,'Pilot'),b.lot,b.updated_at
 FROM public.auction_bids b LEFT JOIN public.profiles p ON p.id=b.user_id
 WHERE b.user_id=v_uid AND b.hour_key=p_hour_key AND b.lot_ref=p_lot_ref AND b.status='active' LIMIT 1;
END;
$bids$;

REVOKE ALL ON FUNCTION public.auction_minimum_floor_v1916(text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.admin_update_auction_rules_v1916(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_update_auction_rules_v1916(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_auction_rules_v1908() TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_auction_bid_online(text,text,bigint,jsonb) TO authenticated;
COMMIT;
