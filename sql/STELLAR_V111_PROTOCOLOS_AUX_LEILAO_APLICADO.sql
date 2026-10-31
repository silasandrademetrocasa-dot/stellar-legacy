-- JÁ APLICADO NO SUPABASE: NÃO REEXECUTAR A MIGRAÇÃO.
-- Stellar Legacy V111 • Leilão de protocolos AUX-9 N1
-- A função antiga permanece intacta, renomeada como *_base_v111.
-- A nova entrada mantém leilões antigos e valida os cinco protocolos exclusivamente no SQL.
ALTER FUNCTION public.place_auction_bid_online(text,text,bigint,jsonb)
  RENAME TO place_auction_bid_online_base_v111;

CREATE FUNCTION public.place_auction_bid_online(
 p_hour_key text, p_lot_ref text, p_user_bid bigint, p_lot jsonb)
RETURNS TABLE(lot_ref text,user_bid bigint,leader_user_id uuid,leader_callsign text,lot jsonb,updated_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','auth','pg_temp'
AS $auction_v111$
#variable_conflict use_column
DECLARE
  v_uid uuid:=auth.uid();
  v_id text;
  v_row public.live_shop_prices_v16%rowtype;
  v_rules public.game_auction_rules_v1908%rowtype;
  v_factor numeric;
  v_floor bigint;
  v_current public.auction_bids%rowtype;
  v_credits bigint;
  v_reserved bigint;
  v_owned integer;
BEGIN
 IF p_lot_ref !~ '^auxProtocol:' THEN
   RETURN QUERY SELECT * FROM public.place_auction_bid_online_base_v111(p_hour_key,p_lot_ref,p_user_bid,p_lot);
   RETURN;
 END IF;
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Sessão ausente.'; END IF;
 IF p_lot_ref !~ '^auxProtocol:(dano|hp|escudo|loot|porao)$' THEN RAISE EXCEPTION 'Protocolo de leilão inválido.'; END IF;
 v_id:=split_part(p_lot_ref,':',2);
 IF p_hour_key IS NULL OR p_hour_key<>to_char(now() AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD-HH24') THEN
  RAISE EXCEPTION 'Leilão fora da janela atual de São Paulo.';
 END IF;
 IF jsonb_typeof(p_lot)<>'object' OR p_lot->>'ref' IS DISTINCT FROM p_lot_ref
   OR p_lot->>'kind' IS DISTINCT FROM 'auxProtocol' OR p_lot->>'id' IS DISTINCT FROM v_id THEN
  RAISE EXCEPTION 'Identidade do lote inválida.';
 END IF;
 IF p_user_bid<100000 OR mod(p_user_bid,100000)<>0 THEN RAISE EXCEPTION 'Use lances de 100.000 CR.'; END IF;
 SELECT * INTO v_row FROM public.live_shop_prices_v16
 WHERE catalog_key='aux_protocol:'||v_id AND kind='aux_protocol' AND ref_id=v_id
   AND enabled AND shop_visible AND meta->>'auction_enabled'='true';
 IF NOT FOUND THEN RAISE EXCEPTION 'Protocolo não disponível no leilão.'; END IF;
 IF (v_id IN ('dano','hp','escudo') AND (v_row.currency<>'uridium' OR v_row.price<50000))
  OR (v_id IN ('loot','porao') AND (v_row.currency<>'credits' OR v_row.price<100000000)) THEN
  RAISE EXCEPTION 'Preço de catálogo do protocolo inválido.';
 END IF;
 v_factor:=coalesce((v_row.meta->>'auction_factor')::numeric,0.8);
 IF v_factor<0.1 OR v_factor>2 THEN RAISE EXCEPTION 'Fator do leilão inválido.'; END IF;
 SELECT * INTO v_rules FROM public.game_auction_rules_v1908 WHERE id=1;
 IF NOT FOUND THEN RAISE EXCEPTION 'Regras do leilão não encontradas.'; END IF;
 v_floor:=greatest(v_rules.common_floor,
   (ceil((v_row.price::numeric * CASE WHEN v_row.currency='uridium' THEN v_rules.stl_to_credits ELSE 1 END * v_factor)/100000)*100000)::bigint);
 IF p_user_bid<v_floor THEN RAISE EXCEPTION 'Lance abaixo do piso de % CR.',v_floor; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(p_hour_key||':'||p_lot_ref));
 -- Somente contas com AUX e sem este protocolo podem disputar o lote.
 -- Propriedade lida por caminho JSON específico, sem confiar no lote enviado.
 SELECT COALESCE((state#>>ARRAY['pet','advancedProtocolOwnedV110',v_id])::integer,0)
 INTO v_owned FROM public.game_saves
 WHERE user_id=v_uid AND coalesce(state#>>'{pet,owned}','false')='true';
 IF NOT FOUND OR coalesce(v_owned,0)>0 THEN RAISE EXCEPTION 'AUX necessário ou protocolo já possuído.'; END IF;
 SELECT * INTO v_current FROM public.auction_bids
 WHERE hour_key=p_hour_key AND lot_ref=p_lot_ref AND status='active'
 ORDER BY user_bid DESC,updated_at ASC LIMIT 1 FOR UPDATE;
 IF FOUND AND v_current.user_id=v_uid THEN RAISE EXCEPTION 'Você já está liderando este lote.'; END IF;
 IF FOUND AND p_user_bid < greatest(v_floor,v_current.user_bid+100000) THEN
  RAISE EXCEPTION 'Lance insuficiente para cobrir.';
 END IF;
 SELECT COALESCE(credits,0) INTO v_credits FROM public.profiles WHERE id=v_uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Carteira não encontrada.'; END IF;
 SELECT COALESCE(SUM(user_bid),0) INTO v_reserved FROM public.auction_bids
 WHERE user_id=v_uid AND hour_key=p_hour_key AND status='active' AND lot_ref<>p_lot_ref;
 IF v_credits<v_reserved+p_user_bid THEN RAISE EXCEPTION 'Créditos insuficientes para reservar o lance.'; END IF;
 UPDATE public.auction_bids SET status='lost',updated_at=now()
 WHERE hour_key=p_hour_key AND lot_ref=p_lot_ref AND status='active';
 INSERT INTO public.auction_bids(user_id,hour_key,lot_ref,user_bid,lot,status,created_at,updated_at)
 VALUES(v_uid,p_hour_key,p_lot_ref,p_user_bid,p_lot,'active',now(),now())
 ON CONFLICT(user_id,hour_key,lot_ref) DO UPDATE SET
 user_bid=excluded.user_bid,lot=excluded.lot,status='active',updated_at=now();
 RETURN QUERY SELECT b.lot_ref,b.user_bid,b.user_id,coalesce(p.callsign,'Pilot'),b.lot,b.updated_at
 FROM public.auction_bids b LEFT JOIN public.profiles p ON p.id=b.user_id
 WHERE b.user_id=v_uid AND b.hour_key=p_hour_key AND b.lot_ref=p_lot_ref AND b.status='active' LIMIT 1;
END;
$auction_v111$;

CREATE FUNCTION public.claim_aux_protocol_auction_v111(p_hour_key text,p_lot_ref text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','auth','pg_temp'
AS $claim_v111$
DECLARE
 v_uid uuid:=auth.uid();
 v_id text;
 v_row public.live_shop_prices_v16%rowtype;
 v_winner public.auction_bids%rowtype;
 v_state jsonb;
 v_old bigint;
 v_new bigint;
 v_rev bigint;
 v_owned integer;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Sessão ausente.'; END IF;
 IF p_lot_ref !~ '^auxProtocol:(dano|hp|escudo|loot|porao)$' THEN RAISE EXCEPTION 'Protocolo de leilão inválido.'; END IF;
 IF p_hour_key IS NULL OR p_hour_key !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{2}$' OR
    p_hour_key>=to_char(now() AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD-HH24') THEN
   RAISE EXCEPTION 'Este leilão ainda não terminou.';
 END IF;
 v_id:=split_part(p_lot_ref,':',2);
 PERFORM pg_advisory_xact_lock(hashtext(p_hour_key||':'||p_lot_ref));
 SELECT state INTO v_state FROM public.game_saves WHERE user_id=v_uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Save indisponível.'; END IF;
 -- Idempotência: não debitar duas vezes o mesmo lote já liquidado.
 IF EXISTS(SELECT 1 FROM public.auction_bids WHERE user_id=v_uid AND hour_key=p_hour_key AND lot_ref=p_lot_ref AND status='won') THEN
   RETURN jsonb_build_object('ok',true,'replayed',true,'state',v_state,'id',v_id);
 END IF;
 SELECT * INTO v_winner FROM public.auction_bids WHERE hour_key=p_hour_key AND lot_ref=p_lot_ref
 AND status='active' ORDER BY user_bid DESC,updated_at ASC LIMIT 1 FOR UPDATE;
 IF NOT FOUND OR v_winner.user_id IS DISTINCT FROM v_uid THEN RAISE EXCEPTION 'Este lote não foi vencido por esta conta.'; END IF;
 SELECT * INTO v_row FROM public.live_shop_prices_v16 WHERE catalog_key='aux_protocol:'||v_id
  AND kind='aux_protocol' AND ref_id=v_id AND enabled AND shop_visible AND meta->>'auction_enabled'='true';
 IF NOT FOUND THEN RAISE EXCEPTION 'Protocolo não está ativo no leilão.'; END IF;
 IF v_winner.lot->>'kind' IS DISTINCT FROM 'auxProtocol' OR
    v_winner.lot->>'ref' IS DISTINCT FROM p_lot_ref OR
    v_winner.lot->>'id' IS DISTINCT FROM v_id THEN
  RAISE EXCEPTION 'Lote não corresponde ao protocolo autorizado.';
 END IF;
 IF coalesce(v_state#>>'{pet,owned}','false')<>'true' THEN RAISE EXCEPTION 'AUX não adquirido.'; END IF;
 v_owned:=coalesce((v_state#>>ARRAY['pet','advancedProtocolOwnedV110',v_id])::integer,0);
 IF v_owned>0 THEN RAISE EXCEPTION 'Protocolo já adquirido; reembolse ou cancele o lote pelo suporte.'; END IF;
 v_old:=coalesce((v_state#>>'{profile,credits}')::bigint,0);
 IF v_winner.user_bid<=0 OR v_old<v_winner.user_bid THEN RAISE EXCEPTION 'Créditos insuficientes para liquidar o leilão.'; END IF;
 v_new:=v_old-v_winner.user_bid;
 v_state:=jsonb_set(v_state,'{profile,credits}',to_jsonb(v_new),true);
 v_state:=jsonb_set(v_state,'{pet,advancedProtocolOwnedV110}',
  coalesce(v_state#>'{pet,advancedProtocolOwnedV110}','{}'::jsonb)||jsonb_build_object(v_id,1),true);
 v_rev:=greatest(0,coalesce((v_state->>'serverPurchaseRevision')::bigint,0))+1;
 v_state:=jsonb_set(v_state,'{serverPurchaseRevision}',to_jsonb(v_rev),true);
 UPDATE public.game_saves SET state=v_state,updated_at=now() WHERE user_id=v_uid;
 UPDATE public.profiles SET credits=v_new,updated_at=now() WHERE id=v_uid;
 IF NOT FOUND THEN RAISE EXCEPTION 'Perfil financeiro ausente.'; END IF;
 UPDATE public.auction_bids SET status='won',updated_at=now()
 WHERE id=v_winner.id AND user_id=v_uid AND status='active';
 IF NOT FOUND THEN RAISE EXCEPTION 'Lote já processado.'; END IF;
 RETURN jsonb_build_object('ok',true,'replayed',false,'state',v_state,'id',v_id,'paid_credits',v_winner.user_bid);
END;
$claim_v111$;

-- Somente RPC autorizada pode criar ou atualizar lotes de protocolo AUX.
CREATE POLICY auction_aux_rpc_only_insert_v111 ON public.auction_bids AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (lot_ref !~ '^auxProtocol:');
CREATE POLICY auction_aux_rpc_only_update_v111 ON public.auction_bids AS RESTRICTIVE FOR UPDATE TO authenticated USING (lot_ref !~ '^auxProtocol:') WITH CHECK (lot_ref !~ '^auxProtocol:');

REVOKE ALL ON FUNCTION public.place_auction_bid_online_base_v111(text,text,bigint,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.place_auction_bid_online(text,text,bigint,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_auction_bid_online(text,text,bigint,jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.claim_aux_protocol_auction_v111(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_aux_protocol_auction_v111(text,text) TO authenticated;

NOTIFY pgrst, 'reload schema';
