-- STELLAR LEGACY V125.0 — recibos duraveis por operacao de economia
-- Apenas DDL aditivo: nao altera saldos, nao zera contas, nao liga enforce.
CREATE TABLE IF NOT EXISTS public.stellar_economy_receipts_v125 (
 user_id uuid NOT NULL,
 request_id text NOT NULL CHECK (request_id ~ '^[A-Za-z0-9_-]{10,90}$'),
 operation text NOT NULL,
 request_hash text NOT NULL CHECK (request_hash ~ '^[a-f0-9]{64}$'),
 receipt jsonb NOT NULL,
 committed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY (user_id,request_id)
);
CREATE INDEX IF NOT EXISTS stellar_economy_receipts_v125_recent_idx
 ON public.stellar_economy_receipts_v125(user_id,committed_at DESC);
ALTER TABLE public.stellar_economy_receipts_v125 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stellar_economy_receipts_v125 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.stellar_economy_receipts_v125 TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_commit_economy_operation_v125(
 p_user_id uuid, p_request_id text, p_operation text, p_request_hash text,
 p_expected_updated_at timestamptz, p_state jsonb, p_callsign text, p_receipt jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $econ$
DECLARE
 saved public.game_saves%rowtype;
 previous public.stellar_economy_receipts_v125%rowtype;
 save_result jsonb;
 now_at timestamptz;
 from_rev bigint;
 to_rev bigint;
 currency text;
 val text;
BEGIN
 IF p_user_id IS NULL OR p_request_id IS NULL
    OR p_request_id !~ '^[A-Za-z0-9_-]{10,90}$'
    OR p_operation IS NULL OR p_operation !~ '^(economy:[a-z_]{3,45}|bulk:(ammo|rocket):[A-Za-z0-9_-]{2,50})$'
    OR p_request_hash IS NULL OR p_request_hash !~ '^[a-f0-9]{64}$'
    OR p_expected_updated_at IS NULL
    OR p_state IS NULL OR jsonb_typeof(p_state)<>'object'
    OR p_receipt IS NULL OR jsonb_typeof(p_receipt)<>'object'
    OR p_state->>'accountOwnerId' IS DISTINCT FROM p_user_id::text
 THEN RETURN jsonb_build_object('ok',false,'code','ECONOMY_ARGUMENTS_INVALID');END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,125));
 SELECT * INTO previous FROM public.stellar_economy_receipts_v125
  WHERE user_id=p_user_id AND request_id=p_request_id FOR UPDATE;
 IF FOUND THEN
   IF previous.operation IS DISTINCT FROM p_operation OR previous.request_hash IS DISTINCT FROM p_request_hash THEN
     RETURN jsonb_build_object('ok',false,'code','ECONOMY_ID_REUSED');
   END IF;
   SELECT * INTO saved FROM public.game_saves WHERE user_id=p_user_id;
   RETURN jsonb_build_object('ok',true,'replayed',true,
     'receipt',previous.receipt,'state',saved.state,'updated_at',saved.updated_at);
 END IF;
 SELECT * INTO saved FROM public.game_saves WHERE user_id=p_user_id FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'code','ECONOMY_SAVE_MISSING');END IF;
 IF saved.updated_at IS DISTINCT FROM p_expected_updated_at THEN
   RETURN jsonb_build_object('ok',false,'code','ECONOMY_STALE');END IF;
 IF saved.state->>'accountOwnerId' IS NOT NULL AND saved.state->>'accountOwnerId' IS DISTINCT FROM p_user_id::text THEN
   RETURN jsonb_build_object('ok',false,'code','ECONOMY_OWNER_MISMATCH');END IF;
 -- Reject invalid monetary values and any unexpected revision skips.
 FOREACH currency IN ARRAY ARRAY['credits','uridium'] LOOP
   val:=p_state#>>array['profile',currency];
   IF val IS NULL OR val !~ '^[0-9]{1,15}$' THEN
     RETURN jsonb_build_object('ok',false,'code','ECONOMY_BALANCE_INVALID');END IF;
 END LOOP;
 from_rev:=coalesce((saved.state->>'serverPurchaseRevision')::bigint,0);
 to_rev:=coalesce((p_state->>'serverPurchaseRevision')::bigint,0);
 IF to_rev<>from_rev+1 THEN RETURN jsonb_build_object('ok',false,'code','ECONOMY_REVISION_INVALID');END IF;
 -- Canonical save + profile + checkpoint and durable receipt are ONE transaction.
 now_at:=clock_timestamp();
 save_result:=public.stellar_commit_player_save_v118(p_user_id,p_state,now_at,p_callsign);
 IF coalesce((save_result->>'ok')::boolean,false) IS DISTINCT FROM true THEN
   RETURN jsonb_build_object('ok',false,'code','ECONOMY_SAVE_REJECTED');END IF;
 INSERT INTO public.stellar_economy_receipts_v125(user_id,request_id,operation,request_hash,receipt)
 VALUES(p_user_id,p_request_id,p_operation,p_request_hash,p_receipt);
 RETURN jsonb_build_object('ok',true,'replayed',false,
   'receipt',p_receipt,'state',p_state,'updated_at',now_at);
END;
$econ$;
REVOKE ALL ON FUNCTION public.stellar_commit_economy_operation_v125(uuid,text,text,text,timestamptz,jsonb,text,jsonb)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_commit_economy_operation_v125(uuid,text,text,text,timestamptz,jsonb,text,jsonb)
 TO service_role;
