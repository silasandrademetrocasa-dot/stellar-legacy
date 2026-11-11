CREATE OR REPLACE FUNCTION public.stellar_player_commit(p_user_id uuid, p_command_id text, p_module text, p_request_hash text, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE prior record;current_state jsonb;merged jsonb;at timestamptz;r jsonb;receipt jsonb;drop_row record;reserved bigint;
BEGIN
 IF p_user_id IS NULL OR p_command_id IS NULL OR length(p_command_id) NOT BETWEEN 10 AND 160 OR p_request_hash IS NULL OR p_request_hash !~ '^[a-f0-9]{64}$' OR p_module IS NULL OR p_module NOT IN ('checkpoint','economy','auction','reward','collection','purchase') OR jsonb_typeof(p_payload) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'PLAYER_COMMAND_INVALID';END IF;
 PERFORM public.stellar_player_lock(p_user_id);
 SELECT state,updated_at INTO current_state,at FROM public.game_saves WHERE user_id=p_user_id;
 SELECT * INTO prior FROM public.stellar_player_commands_v134 WHERE user_id=p_user_id AND command_id=p_command_id;
 IF FOUND THEN
  IF prior.module IS DISTINCT FROM p_module OR prior.request_hash IS DISTINCT FROM p_request_hash THEN RETURN '{"ok":false,"code":"COMMAND_ID_REUSED"}'::jsonb;END IF;
  RETURN jsonb_build_object('ok',true,'replayed',true,'receipt',prior.receipt,'state',current_state,'updated_at',at,'save_token',md5(current_state::text));
 END IF;
 -- Recover receipts issued by V125/V133 before cutover without charging again.
 IF p_module='purchase' THEN
  SELECT t.receipt,t.catalog_key INTO prior FROM public.stellar_live_purchase_receipts_v123 t WHERE t.user_id=p_user_id AND t.request_id=p_command_id::uuid;
  IF FOUND THEN
   IF prior.catalog_key IS DISTINCT FROM p_payload->>'catalog_key' THEN RETURN '{"ok":false,"code":"COMMAND_ID_REUSED"}'::jsonb;END IF;
   RETURN jsonb_build_object('ok',true,'replayed',true,'receipt',prior.receipt,'state',current_state,'updated_at',at,'save_token',md5(current_state::text));
  END IF;
 END IF;
 IF p_module='economy' THEN
  SELECT t.receipt,t.operation,t.request_hash INTO prior FROM public.stellar_economy_receipts_v125 t WHERE t.user_id=p_user_id AND t.request_id=p_command_id;
  IF FOUND THEN
   IF prior.request_hash IS DISTINCT FROM p_request_hash OR prior.operation IS DISTINCT FROM p_payload->>'operation' THEN RETURN '{"ok":false,"code":"COMMAND_ID_REUSED"}'::jsonb;END IF;
   RETURN jsonb_build_object('ok',true,'replayed',true,'receipt',prior.receipt,'state',current_state,'updated_at',at,'save_token',md5(current_state::text));
  END IF;
 END IF;
 IF EXISTS(SELECT 1 FROM public.stellar_offline_farm_v484 WHERE user_id=p_user_id AND status='running') THEN RETURN '{"ok":false,"code":"FARM_OFFLINE_ACTIVE"}'::jsonb;END IF;
 PERFORM set_config('stellar.writer','player:'||p_module,true);
 IF p_module='auction' THEN
  r:=public.stellar_settle_auction_bid_v1182(p_user_id,p_payload->>'hour_key',p_payload->>'lot_ref');
  IF r->>'ok' IS DISTINCT FROM 'true' THEN RETURN r;END IF;
  receipt:=r-'state'-'updated_at';
 ELSE
  IF current_state IS NULL AND p_module<>'checkpoint' THEN RETURN '{"ok":false,"code":"PLAYER_SAVE_MISSING"}'::jsonb;END IF;
  IF current_state IS NOT NULL AND (p_payload#>>'{base,adminResetEpoch}') IS DISTINCT FROM (current_state->>'adminResetEpoch') THEN RETURN '{"ok":false,"code":"SAVE_RESET_STALE"}'::jsonb;END IF;
  IF p_payload#>>'{state,accountOwnerId}' IS DISTINCT FROM p_user_id::text THEN RAISE EXCEPTION 'PLAYER_OWNER_INVALID';END IF;
  IF p_module='collection' THEN
   SELECT * INTO drop_row FROM public.stellar_collection_drops_v134 WHERE user_id=p_user_id AND drop_id=p_payload->>'drop_id' FOR UPDATE;
   IF NOT FOUND OR drop_row.available_at>clock_timestamp() OR (drop_row.expires_at IS NOT NULL AND drop_row.expires_at<=clock_timestamp()) THEN RETURN '{"ok":false,"code":"COLLECTION_UNAVAILABLE"}'::jsonb;END IF;
   IF drop_row.payload IS DISTINCT FROM p_payload->'drop_before' THEN RETURN '{"ok":false,"code":"COLLECTION_STALE"}'::jsonb;END IF;
  END IF;
  BEGIN merged:=public.stellar_player_merge(p_payload->'base',p_payload->'state',current_state);
  EXCEPTION WHEN serialization_failure THEN RETURN jsonb_build_object('ok',false,'code','PLAYER_RETRY','detail',SQLERRM);END;
  IF p_module IN ('economy','purchase') AND coalesce((merged#>>'{profile,credits}')::bigint,0)<coalesce((current_state#>>'{profile,credits}')::bigint,0) THEN
   SELECT coalesce(sum(b.user_bid),0) INTO reserved FROM public.auction_bids b WHERE b.user_id=p_user_id AND b.status='active' AND b.hour_key=to_char(clock_timestamp() AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD-HH24');
   IF coalesce((merged#>>'{profile,credits}')::bigint,0)<reserved THEN RETURN '{"ok":false,"code":"AUCTION_FUNDS_RESERVED"}'::jsonb;END IF;
  END IF;

  -- COLLECTION_CAPACITY_V1341
  IF p_module='collection' AND p_payload ? 'cargo_limit' THEN
   IF public.stellar_player_cargo_context(p_payload->'base') IS DISTINCT FROM public.stellar_player_cargo_context(current_state)
    OR coalesce((p_payload->>'cargo_limit')::numeric,-1)<0
    OR (SELECT coalesce(sum(value::numeric),0) FROM jsonb_each_text(coalesce(merged->'cargo','{}')) WHERE key<>'Xenomit')>(p_payload->>'cargo_limit')::numeric
   THEN RETURN '{"ok":false,"code":"PLAYER_RETRY","detail":"CARGO_CAPACITY_CHANGED"}'::jsonb;END IF;
  END IF;
  IF p_module='checkpoint' THEN merged:=merged||jsonb_build_object('serverCheckpointReceiptV134',p_command_id);END IF;
  at:=clock_timestamp();
  r:=public.stellar_commit_player_save_v118(p_user_id,merged,at,merged#>>'{profile,callsign}');
  IF r->>'ok' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'PLAYER_SAVE_NOT_CONFIRMED';END IF;
  receipt:=coalesce(p_payload->'receipt','{}');
  IF p_module='economy' THEN
   INSERT INTO public.stellar_economy_receipts_v125(user_id,request_id,operation,request_hash,receipt) VALUES(p_user_id,p_command_id,p_payload->>'operation',p_request_hash,receipt);
  END IF;
  IF p_module='purchase' THEN INSERT INTO public.stellar_live_purchase_receipts_v123(user_id,request_id,catalog_key,receipt) VALUES(p_user_id,p_command_id::uuid,p_payload->>'catalog_key',receipt);END IF;
  IF p_module='collection' THEN
   IF p_payload->'drop_after' IS NULL OR p_payload->'drop_after'='null'::jsonb THEN
    DELETE FROM public.stellar_collection_drops_v134 WHERE user_id=p_user_id AND drop_id=p_payload->>'drop_id';
    IF drop_row.kind='bonus' THEN INSERT INTO public.stellar_collection_drops_v134(user_id,drop_id,kind,map_key,x,y,payload,available_at)
     VALUES(p_user_id,'bonus_'||md5(random()::text||clock_timestamp()::text),'bonus',drop_row.map_key,coalesce((p_payload->>'respawn_x')::double precision,drop_row.x),coalesce((p_payload->>'respawn_y')::double precision,drop_row.y),'{}',clock_timestamp()+make_interval(secs=>greatest(1,least(3600,coalesce((p_payload->>'respawn_ms')::numeric,10000)/1000))::double precision));END IF;
   ELSE UPDATE public.stellar_collection_drops_v134 SET payload=p_payload->'drop_after' WHERE user_id=p_user_id AND drop_id=p_payload->>'drop_id';END IF;
  END IF;
 END IF;
 SELECT state,updated_at INTO current_state,at FROM public.game_saves WHERE user_id=p_user_id;
 INSERT INTO public.stellar_player_commands_v134(user_id,command_id,module,request_hash,receipt) VALUES(p_user_id,p_command_id,p_module,p_request_hash,receipt);
 INSERT INTO public.stellar_player_baselines_v134(user_id,token,state) VALUES(p_user_id,md5(current_state::text),current_state) ON CONFLICT DO NOTHING;
 RETURN jsonb_build_object('ok',true,'replayed',false,'receipt',receipt,'state',current_state,'updated_at',at,'save_token',md5(current_state::text));
END $function$
;
