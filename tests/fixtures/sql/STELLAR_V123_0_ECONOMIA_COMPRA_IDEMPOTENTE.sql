-- STELLAR LEGACY V123.0 - COMPRA AUTORITATIVA COM RECIBO DURAVEL
-- Preparar ANTES do deploy. Nao apaga jogadores, saldos nem checkpoints.
-- Somente o servidor Render com service_role pode executar a RPC.
CREATE TABLE IF NOT EXISTS public.stellar_live_purchase_receipts_v123 (
 user_id uuid NOT NULL,
 request_id uuid NOT NULL,
 catalog_key text NOT NULL,
 receipt jsonb NOT NULL,
 committed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY (user_id,request_id)
);
CREATE INDEX IF NOT EXISTS stellar_live_purchase_receipts_v123_recent_idx
 ON public.stellar_live_purchase_receipts_v123(user_id,committed_at DESC);
ALTER TABLE public.stellar_live_purchase_receipts_v123 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stellar_live_purchase_receipts_v123 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.stellar_live_purchase_receipts_v123 TO service_role;

CREATE OR REPLACE FUNCTION public.stellar_commit_live_purchase_v123(
 p_user_id uuid, p_request_id uuid, p_catalog_key text,
 p_expected_updated_at timestamptz, p_state jsonb, p_callsign text,
 p_receipt jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $fn$
DECLARE
 v_existing public.stellar_live_purchase_receipts_v123%rowtype;
 v_state jsonb;
 v_updated_at timestamptz;
 v_committed jsonb;
 v_at timestamptz;
 v_currency text;
 v_cost bigint;
 v_old bigint;
 v_new bigint;
 v_old_revision bigint;
 v_new_revision bigint;
BEGIN
 IF p_user_id IS NULL OR p_request_id IS NULL OR length(p_catalog_key)<2
    OR p_state IS NULL OR jsonb_typeof(p_state)<>'object'
    OR p_receipt IS NULL OR jsonb_typeof(p_receipt)<>'object'
    OR p_state->>'accountOwnerId' IS DISTINCT FROM p_user_id::text
    OR p_expected_updated_at IS NULL
 THEN RETURN jsonb_build_object('ok',false,'code','PURCHASE_ARGUMENTS_INVALID'); END IF;
 -- Serialize this pilot even across multiple Render workers/restarts.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,123));
 SELECT * INTO v_existing FROM public.stellar_live_purchase_receipts_v123
 WHERE user_id=p_user_id AND request_id=p_request_id FOR UPDATE;
 IF FOUND THEN
   IF v_existing.catalog_key IS DISTINCT FROM p_catalog_key THEN
     RETURN jsonb_build_object('ok',false,'code','PURCHASE_ID_REUSED');
   END IF;
   SELECT state,updated_at INTO v_state,v_updated_at FROM public.game_saves WHERE user_id=p_user_id;
   RETURN jsonb_build_object('ok',true,'replayed',true,'state',v_state,
     'updated_at',v_updated_at,'receipt',v_existing.receipt);
 END IF;
 SELECT state,updated_at INTO v_state,v_updated_at FROM public.game_saves WHERE user_id=p_user_id FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'code','PURCHASE_SAVE_MISSING');END IF;
 IF v_updated_at IS DISTINCT FROM p_expected_updated_at THEN
   RETURN jsonb_build_object('ok',false,'code','ECONOMY_STALE');
 END IF;
 -- Credit and Stellarium cannot be client-authored in this RPC.
 v_currency:=p_receipt->>'currency';
 IF v_currency IS NULL OR v_currency NOT IN ('credits','uridium') THEN
   RETURN jsonb_build_object('ok',false,'code','PURCHASE_CURRENCY_INVALID');
 END IF;
 IF p_receipt->>'catalog_key' IS DISTINCT FROM p_catalog_key THEN
   RETURN jsonb_build_object('ok',false,'code','PURCHASE_CATALOG_MISMATCH');
 END IF;
 IF p_receipt->>'price' IS NULL OR (p_receipt->>'price') !~ '^[0-9]{1,15}$' THEN
   RETURN jsonb_build_object('ok',false,'code','PURCHASE_PRICE_INVALID');
 END IF;
 v_cost:=(p_receipt->>'price')::bigint;
 IF v_cost < 1 THEN RETURN jsonb_build_object('ok',false,'code','PURCHASE_PRICE_INVALID'); END IF;
 v_old:=coalesce((v_state#>>array['profile',v_currency])::bigint,0);
 v_new:=coalesce((p_state#>>array['profile',v_currency])::bigint,0);
 IF v_old < v_cost OR v_new IS DISTINCT FROM v_old-v_cost THEN
   RETURN jsonb_build_object('ok',false,'code','PURCHASE_DEBIT_MISMATCH');
 END IF;
 -- Reject changes to the other currency during a single item purchase.
 IF v_currency='credits' AND
   (p_state#>>'{profile,uridium}') IS DISTINCT FROM (v_state#>>'{profile,uridium}')
 OR v_currency='uridium' AND
   (p_state#>>'{profile,credits}') IS DISTINCT FROM (v_state#>>'{profile,credits}')
 THEN RETURN jsonb_build_object('ok',false,'code','PURCHASE_OTHER_CURRENCY_CHANGED'); END IF;
 v_old_revision:=coalesce((v_state->>'serverPurchaseRevision')::bigint,0);
 v_new_revision:=coalesce((p_state->>'serverPurchaseRevision')::bigint,0);
 IF v_new_revision<>v_old_revision+1 THEN
   RETURN jsonb_build_object('ok',false,'code','PURCHASE_REVISION_INVALID');
 END IF;
 v_at:=clock_timestamp();
 v_committed:=public.stellar_commit_player_save_v118(p_user_id,p_state,v_at,p_callsign);
 IF coalesce((v_committed->>'ok')::boolean,false) IS NOT TRUE THEN
   RETURN jsonb_build_object('ok',false,'code','PURCHASE_SAVE_REJECTED');
 END IF;
 INSERT INTO public.stellar_live_purchase_receipts_v123(user_id,request_id,catalog_key,receipt)
 VALUES(p_user_id,p_request_id,p_catalog_key,p_receipt);
 RETURN jsonb_build_object('ok',true,'replayed',false,'state',p_state,
   'updated_at',v_at,'receipt',p_receipt);
END;
$fn$;
REVOKE ALL ON FUNCTION public.stellar_commit_live_purchase_v123(uuid,uuid,text,timestamptz,jsonb,text,jsonb)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_commit_live_purchase_v123(uuid,uuid,text,timestamptz,jsonb,text,jsonb)
 TO service_role;
