-- V133.2: gateway único para commits econômicos (porão/missões/compras) e entrega de leilão.
BEGIN;
CREATE TABLE IF NOT EXISTS public.stellar_command_receipts_v1332(
 user_id uuid NOT NULL,command_id text NOT NULL CHECK(length(command_id) BETWEEN 10 AND 160),
 module text NOT NULL CHECK(module IN ('economy','auction')),request_hash text NOT NULL,
 receipt jsonb NOT NULL,committed_at timestamptz NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(user_id,command_id));
ALTER TABLE public.stellar_command_receipts_v1332 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stellar_command_receipts_v1332 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.stellar_command_receipts_v1332 TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_commit_command_v1332(p_user_id uuid,p_command_id text,p_module text,p_request_hash text,p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE previous record; result jsonb; current_state jsonb; current_at timestamptz;
BEGIN
 IF p_user_id IS NULL OR p_command_id IS NULL OR length(p_command_id) NOT BETWEEN 10 AND 160 OR p_module IS NULL OR p_module NOT IN ('economy','auction') OR p_request_hash IS NULL OR p_request_hash !~ '^[a-f0-9]{64}$' OR jsonb_typeof(p_payload) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'COMMAND_ARGUMENTS_INVALID';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,1332));
 SELECT * INTO previous FROM public.stellar_command_receipts_v1332 WHERE user_id=p_user_id AND command_id=p_command_id;
 IF FOUND THEN
  IF previous.module IS DISTINCT FROM p_module OR previous.request_hash IS DISTINCT FROM p_request_hash THEN RETURN '{"ok":false,"code":"COMMAND_ID_REUSED"}'::jsonb;END IF;
  SELECT state,updated_at INTO current_state,current_at FROM public.game_saves WHERE user_id=p_user_id;
  RETURN previous.receipt||jsonb_build_object('ok',true,'replayed',true,'state',current_state,'updated_at',current_at);
 END IF;
 PERFORM set_config('stellar.writer','command_v1332:'||p_module,true);
 IF p_module='economy' THEN
  result:=public.stellar_commit_economy_operation_v125(p_user_id,p_command_id,p_payload->>'operation',p_request_hash,(p_payload->>'expected_updated_at')::timestamptz,p_payload->'state',p_payload->>'callsign',p_payload->'receipt');
 ELSE
  result:=public.stellar_settle_auction_bid_v1182(p_user_id,p_payload->>'hour_key',p_payload->>'lot_ref');
 END IF;
 IF result->>'ok'='true' THEN
  INSERT INTO public.stellar_command_receipts_v1332(user_id,command_id,module,request_hash,receipt)
   VALUES(p_user_id,p_command_id,p_module,p_request_hash,result-'state'-'updated_at');
 END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.stellar_commit_command_v1332(uuid,text,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_commit_command_v1332(uuid,text,text,text,jsonb) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
