-- V134: shared account transaction discipline. Install before publishing V134 client.
BEGIN;
SET LOCAL lock_timeout='5s';
CREATE TABLE IF NOT EXISTS public.stellar_player_baselines_v134(
 user_id uuid NOT NULL, token text NOT NULL,state jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(user_id,token));
CREATE TABLE IF NOT EXISTS public.stellar_player_commands_v134(
 user_id uuid NOT NULL,command_id text NOT NULL,module text NOT NULL,request_hash text NOT NULL,receipt jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(user_id,command_id));
CREATE TABLE IF NOT EXISTS public.stellar_collection_drops_v134(
 user_id uuid NOT NULL,drop_id text NOT NULL,kind text NOT NULL CHECK(kind IN ('loot','bonus')),
 map_key text NOT NULL, x double precision NOT NULL,y double precision NOT NULL,
 payload jsonb NOT NULL,available_at timestamptz NOT NULL DEFAULT clock_timestamp(),expires_at timestamptz,
 PRIMARY KEY(user_id,drop_id));
ALTER TABLE public.stellar_player_baselines_v134 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stellar_player_commands_v134 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stellar_collection_drops_v134 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stellar_player_baselines_v134,public.stellar_player_commands_v134,public.stellar_collection_drops_v134 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.stellar_player_baselines_v134,public.stellar_player_commands_v134,public.stellar_collection_drops_v134 TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_player_lock(p_user_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF p_user_id IS NULL THEN RAISE EXCEPTION 'PLAYER_ID_REQUIRED';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,134));
 PERFORM 1 FROM public.game_saves WHERE user_id=p_user_id FOR UPDATE;
END $$;
REVOKE ALL ON FUNCTION public.stellar_player_lock(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_player_lock(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_player_lock_many(p_users uuid[]) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid;
BEGIN FOR u IN SELECT DISTINCT x FROM unnest(p_users) x WHERE x IS NOT NULL ORDER BY x LOOP PERFORM public.stellar_player_lock(u);END LOOP;END $$;
REVOKE ALL ON FUNCTION public.stellar_player_lock_many(uuid[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_player_lock_many(uuid[]) TO service_role;
-- Pure three-way merge. Numeric deltas are permitted only on server-validated counters.
CREATE OR REPLACE FUNCTION public.stellar_player_merge(p_base jsonb,p_next jsonb,p_current jsonb,p_path text[] DEFAULT ARRAY[]::text[])
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE result jsonb; k text; b jsonb; n jsonb; c jsonb; v jsonb; amount numeric; additive boolean;path_text text:=array_to_string(p_path,'.');
BEGIN
 IF p_next IS NOT DISTINCT FROM p_base THEN RETURN p_current;END IF;
 IF p_current IS NOT DISTINCT FROM p_base THEN RETURN p_next;END IF;
 IF jsonb_typeof(p_next)='object' AND (p_base IS NULL OR jsonb_typeof(p_base)='object') AND (p_current IS NULL OR jsonb_typeof(p_current)='object') THEN
  result:=coalesce(p_current,'{}'::jsonb);
  FOR k IN SELECT jsonb_object_keys(coalesce(p_base,'{}')||p_next) LOOP
   b:=p_base->k;n:=p_next->k;c:=p_current->k;
   v:=public.stellar_player_merge(b,n,c,p_path||k);
   IF v IS NULL THEN result:=result-k;ELSE result:=jsonb_set(result,ARRAY[k],v,true);END IF;
  END LOOP;RETURN result;
 END IF;
 additive:=path_text ~ '^(profile\.(credits|uridium|xp|aliensKilled)|cargo\.[^.]+|ammo\.[^.]+|rockets\.[^.]+|inventory\.[^.]+|stellarDust|pilotBio\.logDisks|galaxyGate\.(repairBonus|jumpBonus|lifeBonus)|server(Purchase|NpcReward|Ore|Elite)Revision)$';
 IF additive AND coalesce(jsonb_typeof(p_base),'number')='number' AND coalesce(jsonb_typeof(p_next),'number')='number' AND coalesce(jsonb_typeof(p_current),'number')='number' THEN
  amount:=coalesce((p_current#>>'{}')::numeric,0)+coalesce((p_next#>>'{}')::numeric,0)-coalesce((p_base#>>'{}')::numeric,0);
  IF amount<0 OR amount>9007199254740991 OR amount<>trunc(amount) THEN RAISE EXCEPTION 'PLAYER_BALANCE_CONFLICT:%',path_text USING ERRCODE='40001';END IF;
  IF p_next IS NULL AND amount=0 THEN RETURN NULL;END IF;RETURN to_jsonb(amount);
 END IF;
 IF p_next IS NOT DISTINCT FROM p_current THEN RETURN p_current;END IF;
 RAISE EXCEPTION 'PLAYER_FIELD_CONFLICT:%',path_text USING ERRCODE='40001';
END $$;
REVOKE ALL ON FUNCTION public.stellar_player_merge(jsonb,jsonb,jsonb,text[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_player_merge(jsonb,jsonb,jsonb,text[]) TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_player_read(p_user_id uuid,p_token text DEFAULT NULL,p_checkpoint_ids text[] DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE s jsonb;at timestamptz; t text;b jsonb;confirmed jsonb;
BEGIN
 PERFORM public.stellar_player_lock(p_user_id);
 SELECT state,updated_at INTO s,at FROM public.game_saves WHERE user_id=p_user_id;
 IF s IS NULL THEN RETURN jsonb_build_object('state',NULL,'save_token','new');END IF;
 t:=md5(s::text);
 INSERT INTO public.stellar_player_baselines_v134(user_id,token,state) VALUES(p_user_id,t,s) ON CONFLICT DO NOTHING;
 DELETE FROM public.stellar_player_baselines_v134 WHERE user_id=p_user_id AND token IN (SELECT token FROM public.stellar_player_baselines_v134 WHERE user_id=p_user_id ORDER BY created_at DESC,token OFFSET 32) AND token IS DISTINCT FROM p_token AND token<>t;
 IF p_token IS NOT NULL THEN SELECT state INTO b FROM public.stellar_player_baselines_v134 WHERE user_id=p_user_id AND token=p_token;END IF;
 SELECT coalesce(jsonb_agg(command_id),'[]'::jsonb) INTO confirmed FROM public.stellar_player_commands_v134 WHERE user_id=p_user_id AND module='checkpoint' AND command_id=ANY(p_checkpoint_ids[1:16]);
 RETURN jsonb_build_object('state',s,'updated_at',at,'save_token',t,'baseline_state',b,'checkpoint_receipts',confirmed);
END $$;
CREATE OR REPLACE FUNCTION public.stellar_player_commit(p_user_id uuid,p_command_id text,p_module text,p_request_hash text,p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
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
END $$;
REVOKE ALL ON FUNCTION public.stellar_player_read(uuid,text,text[]),public.stellar_player_commit(uuid,text,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_player_read(uuid,text,text[]),public.stellar_player_commit(uuid,text,text,text,jsonb) TO service_role;
CREATE TABLE IF NOT EXISTS public.stellar_loot_issues_v134(user_id uuid NOT NULL,drop_id text NOT NULL,issued_at timestamptz NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(user_id,drop_id));
ALTER TABLE public.stellar_loot_issues_v134 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stellar_loot_issues_v134 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.stellar_loot_issues_v134 TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_player_loot_issue(p_user_id uuid,p_drop_id text,p_map_key text,p_x double precision,p_y double precision,p_resources jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE s jsonb;resources jsonb:='{}';k text;n numeric;bonus numeric;created int;
BEGIN
 PERFORM public.stellar_player_lock(p_user_id);
 IF p_drop_id IS NULL OR length(p_drop_id) NOT BETWEEN 8 AND 180 OR jsonb_typeof(p_resources) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'LOOT_ISSUE_INVALID';END IF;
 INSERT INTO public.stellar_loot_issues_v134(user_id,drop_id) VALUES(p_user_id,p_drop_id) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS created=ROW_COUNT;
 IF created=1 THEN
  SELECT state INTO s FROM public.game_saves WHERE user_id=p_user_id;
  bonus:=(ARRAY[0,1,2])[least(2,greatest(0,coalesce((s#>>'{pilotBio,skills,tractor1}')::int,0)))+1]+(ARRAY[0,4,8,18])[least(3,greatest(0,coalesce((s#>>'{pilotBio,skills,tractor2}')::int,0)))+1];
  FOR k,n IN SELECT key,value::numeric FROM jsonb_each_text(p_resources) LOOP
   IF n<0 OR n>1000000 OR NOT EXISTS(SELECT 1 FROM public.game_resource_config_v1814 WHERE resource_key=k AND enabled) THEN RAISE EXCEPTION 'LOOT_RESOURCE_INVALID';END IF;
   resources:=resources||jsonb_build_object(k,greatest(1,round(n*(1+bonus/100))));
  END LOOP;
  INSERT INTO public.stellar_collection_drops_v134(user_id,drop_id,kind,map_key,x,y,payload,expires_at) VALUES(p_user_id,p_drop_id,'loot',p_map_key,p_x,p_y,jsonb_build_object('resources',resources),clock_timestamp()+interval '30 seconds');
 END IF;
 RETURN (SELECT jsonb_build_object('id',drop_id,'x',x,'y',y,'resources',payload->'resources','expires_at',expires_at) FROM public.stellar_collection_drops_v134 WHERE user_id=p_user_id AND drop_id=p_drop_id);
END $$;
CREATE OR REPLACE FUNCTION public.stellar_player_bonus_ensure(p_user_id uuid,p_map_key text,p_count int,p_width int,p_height int)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE n int;
BEGIN
 PERFORM public.stellar_player_lock(p_user_id);
 IF p_count IS NULL OR p_width IS NULL OR p_height IS NULL OR p_map_key IS NULL OR p_count NOT BETWEEN 0 AND 100 OR p_width<500 OR p_height<500 OR length(p_map_key)>100 THEN RAISE EXCEPTION 'BONUS_MAP_INVALID';END IF;
 SELECT count(*) INTO n FROM public.stellar_collection_drops_v134 WHERE user_id=p_user_id AND map_key=p_map_key AND kind='bonus';
 IF n<p_count THEN
  INSERT INTO public.stellar_collection_drops_v134(user_id,drop_id,kind,map_key,x,y,payload)
  SELECT p_user_id,'bonus_'||md5(random()::text||clock_timestamp()::text||i::text),'bonus',p_map_key,220+random()*(p_width-440),220+random()*(p_height-440),'{}' FROM generate_series(1,p_count-n) i;
 END IF;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id',drop_id,'x',x,'y',y)) FROM (SELECT * FROM public.stellar_collection_drops_v134 WHERE user_id=p_user_id AND map_key=p_map_key AND kind='bonus' AND available_at<=clock_timestamp() ORDER BY drop_id LIMIT p_count) boxes),'[]');
END $$;
REVOKE ALL ON FUNCTION public.stellar_player_loot_issue(uuid,text,text,double precision,double precision,jsonb),public.stellar_player_bonus_ensure(uuid,text,int,int,int) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_player_loot_issue(uuid,text,text,double precision,double precision,jsonb),public.stellar_player_bonus_ensure(uuid,text,int,int,int) TO service_role;
-- One bid entry for every lot. The server owns round time and bid identity.
CREATE OR REPLACE FUNCTION public.stellar_player_bid(p_request_id text,p_hour_key text,p_lot_ref text,p_user_bid bigint,p_lot jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid:=auth.uid();h text;prior record;r jsonb;current_state jsonb;bid_at timestamptz;floor_base bigint;floor_now bigint;final_bid bigint;seed bigint:=2166136261;seed_text text;i int;
BEGIN
 IF u IS NULL OR p_request_id IS NULL OR p_request_id !~ '^[A-Za-z0-9_-]{10,90}$' OR p_hour_key IS NULL OR p_lot_ref IS NULL OR p_user_bid IS NULL THEN RAISE EXCEPTION 'BID_ARGUMENTS_INVALID';END IF;
 PERFORM public.stellar_player_lock(u);
 h:=md5(jsonb_build_array(p_hour_key,p_lot_ref,p_user_bid)::text);
 SELECT * INTO prior FROM public.stellar_player_commands_v134 WHERE user_id=u AND command_id=p_request_id;
 IF FOUND THEN
  IF prior.module<>'bid' OR prior.request_hash<>h THEN RAISE EXCEPTION 'COMMAND_ID_REUSED';END IF;
  RETURN prior.receipt||'{"replayed":true}'::jsonb;
 END IF;
 bid_at:=clock_timestamp();
 IF p_hour_key<>to_char(bid_at AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD-HH24') THEN RAISE EXCEPTION 'AUCTION_ROUND_CLOSED';END IF;
 IF p_user_bid<100000 OR p_user_bid>1000000000000 OR mod(p_user_bid,100000)<>0 THEN RAISE EXCEPTION 'AUCTION_BID_STEP_INVALID';END IF;
 SELECT state INTO current_state FROM public.game_saves WHERE user_id=u;
 floor_base:=public.auction_minimum_floor_v1916(p_lot_ref);
 IF floor_base IS NULL AND p_lot_ref ~ '^auxProtocol:' THEN
  SELECT greatest(rules.common_floor,(ceil((price.price::numeric*CASE WHEN price.currency='uridium' THEN rules.stl_to_credits ELSE 1 END*coalesce((price.meta->>'auction_factor')::numeric,0.8))/100000)*100000)::bigint)
   INTO floor_base FROM public.live_shop_prices_v16 price CROSS JOIN public.game_auction_rules_v1908 rules
   WHERE rules.id=1 AND price.catalog_key='aux_protocol:'||split_part(p_lot_ref,':',2) AND price.enabled AND price.shop_visible;
 END IF;
 IF floor_base IS NULL THEN RAISE EXCEPTION 'AUCTION_CATALOG_INVALID';END IF;
 seed_text:=p_hour_key||':'||p_lot_ref;
 FOR i IN 1..length(seed_text) LOOP seed:=mod((seed # ascii(substr(seed_text,i,1))::bigint)*16777619,4294967296);END LOOP;
 seed:=mod(1664525*seed+1013904223,4294967296);
 final_bid:=greatest(floor_base+100000,(ceil(floor_base*(1.25+seed::numeric/4294967296*1.75)/100000)*100000)::bigint);
 floor_now:=greatest(100000,(round((floor_base+(final_bid-floor_base)*extract(minute FROM bid_at AT TIME ZONE 'America/Sao_Paulo')/60)/100000)*100000)::bigint);
 IF p_user_bid<floor_now THEN RAISE EXCEPTION 'AUCTION_MINIMUM_CHANGED:%',floor_now;END IF;
 -- Existing SQL validates catalog, AUX ownership, floor, wallet and other reservations.
 -- Lock ordering is account before lot in every bid/settlement path.
 SELECT to_jsonb(v) INTO r FROM public.place_auction_bid_online(p_hour_key,p_lot_ref,p_user_bid,p_lot) v;
 IF r IS NULL THEN RAISE EXCEPTION 'AUCTION_ACK_MISSING';END IF;
 r:=jsonb_build_object('ok',true,'bid',r,'hour_key',p_hour_key,'request_id',p_request_id);
 INSERT INTO public.stellar_player_commands_v134(user_id,command_id,module,request_hash,receipt) VALUES(u,p_request_id,'bid',h,r);
 RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.stellar_player_bid(text,text,text,bigint,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_player_bid(text,text,text,bigint,jsonb) TO authenticated;

-- All existing writers acquire the SAME account lock BEFORE reading wallets/state.
-- No rule/reward formula is replaced; historical implementations remain internal dependencies.
DO $instrument$
DECLARE n text; statement text; f record; definition text;body_at integer;head text;body text;
BEGIN
 FOR n,statement IN SELECT * FROM (VALUES
('stellar_offline_farm_start_v1111','PERFORM public.stellar_player_lock(p_user);'),('stellar_offline_farm_start_v484','PERFORM public.stellar_player_lock(p_user);'),('stellar_offline_farm_start_v485','PERFORM public.stellar_player_lock(p_user);'),('stellar_offline_farm_start_v487','PERFORM public.stellar_player_lock(p_user);'),('stellar_offline_farm_start_v49','PERFORM public.stellar_player_lock(p_user);'),('place_auction_bid_online','PERFORM public.stellar_player_lock(auth.uid());'),('place_auction_bid_online_base_v111','PERFORM public.stellar_player_lock(auth.uid());'),('admin_reset_account_v1763','PERFORM public.stellar_player_lock(p_target_user_id);'),('admin_reset_account_v1763_legacy_v478','PERFORM public.stellar_player_lock(p_target_user_id);'),('claim_arena_daily_reward','PERFORM public.stellar_player_lock(auth.uid());'),('claim_aux_protocol_auction_v111','PERFORM public.stellar_player_lock(auth.uid());'),('claim_clan_credit_grants_v12','PERFORM public.stellar_player_lock(auth.uid());'),('process_all_clan_collection_v12','PERFORM public.stellar_player_lock_many(ARRAY(SELECT cm.user_id FROM public.clan_members cm));'),('record_my_galaxy_event_progress_v1826','PERFORM public.stellar_player_lock(auth.uid());'),('redeem_aux_sentinel_coupon_v1','PERFORM public.stellar_player_lock(auth.uid());'),('redeem_game_coupon_v1821','PERFORM public.stellar_player_lock(auth.uid());'),('redeem_game_coupon_v193','PERFORM public.stellar_player_lock(auth.uid());'),('stellar_claim_astral_v381','PERFORM public.stellar_player_lock(p_user_id);'),('stellar_claim_competitive_season','PERFORM public.stellar_player_lock(auth.uid());'),('stellar_claim_elite_objective','PERFORM public.stellar_player_lock(auth.uid());'),('stellar_claim_war_campaign','PERFORM public.stellar_player_lock(auth.uid());'),('stellar_claim_war_supply','PERFORM public.stellar_player_lock(auth.uid());'),('stellar_commit_command_v1332','PERFORM public.stellar_player_lock(p_user_id);'),('stellar_commit_economy_operation_v125','PERFORM public.stellar_player_lock(p_user_id);'),('stellar_commit_live_purchase_v123','PERFORM public.stellar_player_lock(p_user_id);'),('stellar_commit_player_command_v119','PERFORM public.stellar_player_lock(p_user_id);'),('stellar_commit_player_save_v118','PERFORM public.stellar_player_lock(p_user_id);'),('stellar_commit_save_v131','PERFORM public.stellar_player_lock(p_user_id);'),('stellar_commit_save_v133','PERFORM public.stellar_player_lock(p_user_id);'),('stellar_frontier_claim_v370','PERFORM public.stellar_player_lock(auth.uid());'),('stellar_grant_npc_reward_v1131','PERFORM public.stellar_player_lock(p_user_id);'),('stellar_grant_npc_reward_v228','PERFORM public.stellar_player_lock(p_user_id);'),('stellar_grant_ore_reward_v229','PERFORM public.stellar_player_lock(p_user_id);'),('stellar_natal_action_v132','PERFORM public.stellar_player_lock(p_user_id);'),('stellar_natal_npc_v132','PERFORM public.stellar_player_lock(p_user_id);'),('stellar_offline_farm_claim_v1111','PERFORM public.stellar_player_lock(p_user);'),('stellar_offline_farm_claim_v484','PERFORM public.stellar_player_lock(p_user);'),('stellar_offline_farm_claim_v487','PERFORM public.stellar_player_lock(p_user);'),('stellar_offline_farm_claim_v49','PERFORM public.stellar_player_lock(p_user);'),('stellar_settle_auction_bid_v1182','PERFORM public.stellar_player_lock(p_user_id);'),('stellar_u426_market_buy','PERFORM public.stellar_player_lock_many(ARRAY[auth.uid(),(SELECT seller FROM public.stellar_u426_market_offers WHERE id=p_offer)]);'),('stellar_u42_action','PERFORM public.stellar_player_lock(auth.uid());'),('test_purchase_premium_v12','PERFORM public.stellar_player_lock(auth.uid());')
 ) AS writers(name,lock_statement) LOOP
  FOR f IN SELECT p.oid FROM pg_proc p JOIN pg_namespace ns ON ns.oid=p.pronamespace WHERE ns.nspname='public' AND p.proname=n LOOP
   definition:=pg_get_functiondef(f.oid);
   IF position('-- PLAYER_SHARED_LOCK_V134' in definition)>0 THEN CONTINUE;END IF;
   body_at:=position('AS $function$' in definition);
   IF body_at=0 THEN RAISE EXCEPTION 'PLAYER_FUNCTION_FORMAT:%',n;END IF;
   head:=left(definition,body_at+length('AS $function$')-1);body:=substring(definition from body_at+length('AS $function$'));
   IF body !~* E'\\mBEGIN\\M' THEN RAISE EXCEPTION 'PLAYER_FUNCTION_BEGIN_MISSING:%',n;END IF;
   IF n LIKE 'stellar_offline_farm_claim_%' OR n LIKE 'admin_reset_account_%' THEN statement:=statement||' PERFORM set_config(''stellar.farm_commit'',''1'',true);';
   ELSIF n NOT LIKE 'stellar_offline_farm_start_%' AND n NOT IN ('place_auction_bid_online','place_auction_bid_online_base_v111','process_all_clan_collection_v12','stellar_u426_market_buy') THEN
    statement:=statement||' IF coalesce(current_setting(''stellar.farm_commit'',true),'''')<>''1'' AND EXISTS(SELECT 1 FROM public.stellar_offline_farm_v484 WHERE user_id='||CASE WHEN n LIKE 'stellar_commit_%' OR n LIKE 'stellar_grant_%' OR n LIKE 'stellar_natal_%' OR n IN ('stellar_claim_astral_v381','stellar_settle_auction_bid_v1182') THEN 'p_user_id' ELSE 'auth.uid()' END||' AND status=''running'') THEN RAISE EXCEPTION ''FARM_OFFLINE_ACTIVE'';END IF;';
   END IF;
   body:=regexp_replace(body,E'\\mBEGIN\\M','BEGIN'||chr(10)||'-- PLAYER_SHARED_LOCK_V134'||chr(10)||statement,'i');
   EXECUTE head||body;
  END LOOP;
  IF NOT FOUND THEN RAISE EXCEPTION 'PLAYER_WRITER_MISSING:%',n;END IF;
 END LOOP;
END $instrument$;


CREATE OR REPLACE FUNCTION public.stellar_player_validate_write() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE k text;v numeric;
BEGIN
 IF jsonb_typeof(NEW.state) IS DISTINCT FROM 'object' OR jsonb_typeof(NEW.state->'profile') IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'PLAYER_STATE_FORMAT' USING ERRCODE='23514';END IF;
 IF NEW.state->>'accountOwnerId' IS NOT NULL AND NEW.state->>'accountOwnerId' IS DISTINCT FROM NEW.user_id::text THEN RAISE EXCEPTION 'PLAYER_OWNER_INVALID' USING ERRCODE='23514';END IF;
 FOREACH k IN ARRAY ARRAY['credits','uridium','xp'] LOOP
  v:=coalesce((NEW.state#>>ARRAY['profile',k])::numeric,0);
  IF v<0 OR v>9007199254740991 OR v<>trunc(v) THEN RAISE EXCEPTION 'PLAYER_BALANCE_INVALID:%',k USING ERRCODE='23514';END IF;
 END LOOP;
 NEW.state:=NEW.state||jsonb_build_object('serverStateClockV134',CASE WHEN TG_OP='UPDATE' THEN coalesce((OLD.state->>'serverStateClockV134')::bigint,0)+1 ELSE 1 END);
 NEW.updated_at:=clock_timestamp();
 IF TG_OP='UPDATE' THEN NEW.updated_at:=greatest(NEW.updated_at,OLD.updated_at+interval '1 microsecond');END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.stellar_player_validate_write() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS stellar_player_validate_write_v134 ON public.game_saves;
CREATE TRIGGER stellar_player_validate_write_v134 BEFORE INSERT OR UPDATE OF state ON public.game_saves FOR EACH ROW EXECUTE FUNCTION public.stellar_player_validate_write();
-- One post-write owner for profile projection and A/B/C, including NPC/coupon/farm writes.
CREATE OR REPLACE FUNCTION public.stellar_player_snapshot() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p_user_id uuid:=NEW.user_id;p_state jsonb:=NEW.state;p_updated_at timestamptz:=NEW.updated_at;
 p_callsign text:=coalesce(nullif(NEW.state#>>'{profile,callsign}',''),(SELECT callsign FROM public.profiles WHERE id=NEW.user_id),'Pilot');
 old_save jsonb;old_updated_at timestamptz;v_profile jsonb:=NEW.state->'profile';
 a public.stellar_player_save_abc_v118%rowtype;b public.stellar_player_save_abc_v118%rowtype;
 v_rotate boolean;v_signature text;
BEGIN
 IF TG_OP='UPDATE' AND OLD.state IS NOT DISTINCT FROM NEW.state THEN RETURN NEW;END IF;
 IF TG_OP='UPDATE' THEN old_save:=OLD.state;old_updated_at:=OLD.updated_at;END IF;
 insert into public.profiles(id,callsign,faction,level,xp,credits,uridium,aliens_killed,gg_completed,updated_at)
 values(p_user_id,p_callsign,
   nullif(v_profile->>'faction',''),
   greatest(1,coalesce((v_profile->>'level')::integer,1)),
   coalesce((v_profile->>'xp')::bigint,0),
   coalesce((v_profile->>'credits')::bigint,0),
   coalesce((v_profile->>'uridium')::bigint,0),
   coalesce((v_profile->>'aliensKilled')::bigint,0),
   coalesce((p_state#>>'{galaxyGate,alpha,completed}')::integer,(v_profile->>'ggCompleted')::integer,0),
   p_updated_at)
 on conflict(id) do update set
   callsign=excluded.callsign,faction=excluded.faction,level=excluded.level,
   xp=excluded.xp,credits=excluded.credits,uridium=excluded.uridium,
   aliens_killed=excluded.aliens_killed,gg_completed=excluded.gg_completed,
   updated_at=excluded.updated_at;

 select * into a from public.stellar_player_save_abc_v118
 where user_id=p_user_id and slot='A' for update;
 select * into b from public.stellar_player_save_abc_v118
 where user_id=p_user_id and slot='B' for update;
 v_signature:=md5(p_state::text);
 v_rotate:= a.user_id is null or b.user_id is null or
   p_updated_at >= b.captured_at+interval '30 seconds' or
   a.state->'shipLoadout' is distinct from p_state->'shipLoadout' or
   a.state->'drones' is distinct from p_state->'drones' or
   a.state->'combatConfigsV2013' is distinct from p_state->'combatConfigsV2013' or
   a.state->'pet' is distinct from p_state->'pet' or
   a.state->>'serverPurchaseRevision' is distinct from p_state->>'serverPurchaseRevision';
 if v_rotate and b.user_id is not null then
   insert into public.stellar_player_save_abc_v118 as ss
   (user_id,slot,state,save_updated_at,state_hash,captured_at)
   values(p_user_id,'C',b.state,b.save_updated_at,b.state_hash,b.captured_at)
   on conflict(user_id,slot) do update set state=excluded.state,
   save_updated_at=excluded.save_updated_at,state_hash=excluded.state_hash,captured_at=excluded.captured_at;
 end if;
 if v_rotate and a.user_id is not null then
   insert into public.stellar_player_save_abc_v118 as ss
   (user_id,slot,state,save_updated_at,state_hash,captured_at)
   values(p_user_id,'B',a.state,a.save_updated_at,a.state_hash,a.captured_at)
   on conflict(user_id,slot) do update set state=excluded.state,
   save_updated_at=excluded.save_updated_at,state_hash=excluded.state_hash,captured_at=excluded.captured_at;
 elsif a.user_id is null and old_save is not null then
   insert into public.stellar_player_save_abc_v118
   (user_id,slot,state,save_updated_at,state_hash,captured_at)
   values(p_user_id,'B',old_save,old_updated_at,md5(old_save::text),clock_timestamp())
   on conflict(user_id,slot) do nothing;
 end if;
 insert into public.stellar_player_save_abc_v118 as ss
 (user_id,slot,state,save_updated_at,state_hash,captured_at)
 values(p_user_id,'A',p_state,p_updated_at,v_signature,clock_timestamp())
 on conflict(user_id,slot) do update set
 state=excluded.state,save_updated_at=excluded.save_updated_at,
 state_hash=excluded.state_hash,captured_at=excluded.captured_at;

 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.stellar_player_snapshot() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS stellar_player_snapshot_v134 ON public.game_saves;
CREATE TRIGGER stellar_player_snapshot_v134 AFTER INSERT OR UPDATE OF state ON public.game_saves FOR EACH ROW EXECUTE FUNCTION public.stellar_player_snapshot();
-- Keep V118's owner/economy guards and storage; projections have one owner above.
DO $single_projection$
DECLARE definition text;start_at int;end_at int;
BEGIN
 definition:=pg_get_functiondef('public.stellar_commit_player_save_v118(uuid,jsonb,timestamptz,text)'::regprocedure);
 IF position('-- PLAYER_PROJECTION_TRIGGER_V134' in definition)=0 THEN
  start_at:=position(' insert into public.profiles' in lower(definition));
  end_at:=position(' return jsonb_build_object(''ok'',true' in lower(definition));
  IF start_at=0 OR end_at<=start_at THEN RAISE EXCEPTION 'PLAYER_PROJECTION_FORMAT';END IF;
  EXECUTE left(definition,start_at-1)||chr(10)||' -- PLAYER_PROJECTION_TRIGGER_V134'||chr(10)||substring(definition from end_at);
 END IF;
END $single_projection$;


-- Current public RPC names. Old routines remain implementation dependencies, never duplicated rules.
CREATE OR REPLACE FUNCTION public.stellar_player_admin_reset_account(p_target_user_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $current$ DECLARE r jsonb;s jsonb;t timestamptz;BEGIN r:=public.admin_reset_account_v1763(p_target_user_id);IF r ? 'state' THEN SELECT state,updated_at INTO s,t FROM public.game_saves WHERE user_id=p_target_user_id;r:=r||jsonb_build_object('state',s,'updated_at',t,'save_token',md5(s::text));END IF;RETURN r;END $current$;
REVOKE ALL ON FUNCTION public.stellar_player_admin_reset_account(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.stellar_player_admin_reset_account(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.stellar_player_claim_arena_daily_reward() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $current$ DECLARE r jsonb;s jsonb;t timestamptz;BEGIN r:=public.claim_arena_daily_reward();IF r ? 'state' THEN SELECT state,updated_at INTO s,t FROM public.game_saves WHERE user_id=auth.uid();r:=r||jsonb_build_object('state',s,'updated_at',t,'save_token',md5(s::text));END IF;RETURN r;END $current$;
REVOKE ALL ON FUNCTION public.stellar_player_claim_arena_daily_reward() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.stellar_player_claim_arena_daily_reward() TO authenticated;
CREATE OR REPLACE FUNCTION public.stellar_player_claim_aux_protocol_auction(p_hour_key text, p_lot_ref text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $current$ DECLARE r jsonb;s jsonb;t timestamptz;BEGIN r:=public.claim_aux_protocol_auction_v111(p_hour_key,p_lot_ref);IF r ? 'state' THEN SELECT state,updated_at INTO s,t FROM public.game_saves WHERE user_id=auth.uid();r:=r||jsonb_build_object('state',s,'updated_at',t,'save_token',md5(s::text));END IF;RETURN r;END $current$;
REVOKE ALL ON FUNCTION public.stellar_player_claim_aux_protocol_auction(text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.stellar_player_claim_aux_protocol_auction(text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.stellar_player_claim_clan_credit_grants() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $current$ DECLARE r jsonb;s jsonb;t timestamptz;BEGIN r:=public.claim_clan_credit_grants_v12();IF r ? 'state' THEN SELECT state,updated_at INTO s,t FROM public.game_saves WHERE user_id=auth.uid();r:=r||jsonb_build_object('state',s,'updated_at',t,'save_token',md5(s::text));END IF;RETURN r;END $current$;
REVOKE ALL ON FUNCTION public.stellar_player_claim_clan_credit_grants() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.stellar_player_claim_clan_credit_grants() TO authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_player_claim_clan_credit_grants() TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_player_process_all_clan_collection() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $current$ BEGIN RETURN public.process_all_clan_collection_v12();END $current$;
REVOKE ALL ON FUNCTION public.stellar_player_process_all_clan_collection() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.stellar_player_process_all_clan_collection() TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_player_record_my_galaxy_event_progress(p_event_id text, p_delta integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $current$ DECLARE r jsonb;s jsonb;t timestamptz;BEGIN r:=public.record_my_galaxy_event_progress_v1826(p_event_id,p_delta);IF r ? 'state' THEN SELECT state,updated_at INTO s,t FROM public.game_saves WHERE user_id=auth.uid();r:=r||jsonb_build_object('state',s,'updated_at',t,'save_token',md5(s::text));END IF;RETURN r;END $current$;
REVOKE ALL ON FUNCTION public.stellar_player_record_my_galaxy_event_progress(text,integer) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.stellar_player_record_my_galaxy_event_progress(text,integer) TO authenticated;
CREATE OR REPLACE FUNCTION public.stellar_player_redeem_aux_sentinel_coupon(p_code text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $current$ DECLARE r jsonb;s jsonb;t timestamptz;BEGIN r:=public.redeem_aux_sentinel_coupon_v1(p_code);IF r ? 'state' THEN SELECT state,updated_at INTO s,t FROM public.game_saves WHERE user_id=auth.uid();r:=r||jsonb_build_object('state',s,'updated_at',t,'save_token',md5(s::text));END IF;RETURN r;END $current$;
REVOKE ALL ON FUNCTION public.stellar_player_redeem_aux_sentinel_coupon(text) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.stellar_player_redeem_game_coupon(p_code text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid:=auth.uid();v_code text:=upper(btrim(p_code));r jsonb;s jsonb;t timestamptz;rewards jsonb;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED';END IF;
 PERFORM public.stellar_player_lock(u);
 SELECT rewards_snapshot INTO rewards FROM public.game_coupon_redemptions_v193 c WHERE c.user_id=u AND c.code=v_code;
 IF NOT FOUND THEN SELECT rewards_snapshot INTO rewards FROM public.game_coupon_redemptions_v1821 c WHERE c.user_id=u AND c.code=v_code;END IF;
 IF FOUND THEN r:=jsonb_build_object('ok',true,'handled',true,'replayed',true,'rewards',rewards,'message','Cupom já confirmado.');
 ELSE
  r:=public.redeem_game_coupon_v193(p_code);
  IF r->>'handled' IS DISTINCT FROM 'true' THEN r:=public.redeem_game_coupon_v1821(p_code);END IF;
 END IF;
 SELECT state,updated_at INTO s,t FROM public.game_saves WHERE user_id=u;
 RETURN r||jsonb_build_object('handled',true,'state',s,'updated_at',t,'save_token',md5(s::text));
END $$;
REVOKE ALL ON FUNCTION public.stellar_player_redeem_game_coupon(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_player_redeem_game_coupon(text) TO authenticated;

REVOKE ALL ON FUNCTION public.stellar_player_redeem_game_coupon(text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.stellar_player_redeem_game_coupon(text) TO authenticated;
REVOKE ALL ON FUNCTION public.stellar_player_redeem_game_coupon(text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.stellar_player_redeem_game_coupon(text) TO authenticated;
CREATE OR REPLACE FUNCTION public.stellar_player_claim_astral(p_user_id uuid, p_gate text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $current$ DECLARE r jsonb;s jsonb;t timestamptz;BEGIN r:=public.stellar_claim_astral_v381(p_user_id,p_gate);IF r ? 'state' THEN SELECT state,updated_at INTO s,t FROM public.game_saves WHERE user_id=p_user_id;r:=r||jsonb_build_object('state',s,'updated_at',t,'save_token',md5(s::text));END IF;RETURN r;END $current$;
REVOKE ALL ON FUNCTION public.stellar_player_claim_astral(uuid,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.stellar_player_claim_astral(uuid,text) TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_player_claim_competitive_season(p_season_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $current$ DECLARE r jsonb;s jsonb;t timestamptz;BEGIN r:=public.stellar_claim_competitive_season(p_season_id);IF r ? 'state' THEN SELECT state,updated_at INTO s,t FROM public.game_saves WHERE user_id=auth.uid();r:=r||jsonb_build_object('state',s,'updated_at',t,'save_token',md5(s::text));END IF;RETURN r;END $current$;
REVOKE ALL ON FUNCTION public.stellar_player_claim_competitive_season(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.stellar_player_claim_competitive_season(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.stellar_player_claim_elite_objective(p_objective_id text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $current$ DECLARE r jsonb;s jsonb;t timestamptz;BEGIN r:=public.stellar_claim_elite_objective(p_objective_id);IF r ? 'state' THEN SELECT state,updated_at INTO s,t FROM public.game_saves WHERE user_id=auth.uid();r:=r||jsonb_build_object('state',s,'updated_at',t,'save_token',md5(s::text));END IF;RETURN r;END $current$;
REVOKE ALL ON FUNCTION public.stellar_player_claim_elite_objective(text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.stellar_player_claim_elite_objective(text) TO authenticated;
CREATE OR REPLACE FUNCTION public.stellar_player_claim_war_campaign(p_campaign_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $current$ DECLARE r jsonb;s jsonb;t timestamptz;BEGIN r:=public.stellar_claim_war_campaign(p_campaign_id);IF r ? 'state' THEN SELECT state,updated_at INTO s,t FROM public.game_saves WHERE user_id=auth.uid();r:=r||jsonb_build_object('state',s,'updated_at',t,'save_token',md5(s::text));END IF;RETURN r;END $current$;
REVOKE ALL ON FUNCTION public.stellar_player_claim_war_campaign(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.stellar_player_claim_war_campaign(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.stellar_player_claim_war_supply() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $current$ DECLARE r jsonb;s jsonb;t timestamptz;BEGIN r:=public.stellar_claim_war_supply();IF r ? 'state' THEN SELECT state,updated_at INTO s,t FROM public.game_saves WHERE user_id=auth.uid();r:=r||jsonb_build_object('state',s,'updated_at',t,'save_token',md5(s::text));END IF;RETURN r;END $current$;
REVOKE ALL ON FUNCTION public.stellar_player_claim_war_supply() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.stellar_player_claim_war_supply() TO authenticated;
CREATE OR REPLACE FUNCTION public.stellar_player_frontier_claim(p_id text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $current$ DECLARE r jsonb;s jsonb;t timestamptz;BEGIN r:=public.stellar_frontier_claim_v370(p_id);IF r ? 'state' THEN SELECT state,updated_at INTO s,t FROM public.game_saves WHERE user_id=auth.uid();r:=r||jsonb_build_object('state',s,'updated_at',t,'save_token',md5(s::text));END IF;RETURN r;END $current$;
REVOKE ALL ON FUNCTION public.stellar_player_frontier_claim(text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.stellar_player_frontier_claim(text) TO authenticated;
CREATE OR REPLACE FUNCTION public.stellar_player_grant_npc_reward(p_user_id uuid, p_kill_key text, p_npc_type text, p_base_credits bigint, p_base_stl bigint, p_owner_eligible boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $current$ DECLARE r jsonb;s jsonb;t timestamptz;BEGIN r:=public.stellar_grant_npc_reward_v1131(p_user_id,p_kill_key,p_npc_type,p_base_credits,p_base_stl,p_owner_eligible);IF r ? 'state' THEN SELECT state,updated_at INTO s,t FROM public.game_saves WHERE user_id=p_user_id;r:=r||jsonb_build_object('state',s,'updated_at',t,'save_token',md5(s::text));END IF;RETURN r;END $current$;
REVOKE ALL ON FUNCTION public.stellar_player_grant_npc_reward(uuid,text,text,bigint,bigint,boolean) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.stellar_player_grant_npc_reward(uuid,text,text,bigint,bigint,boolean) TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_player_grant_ore_reward(p_user_id uuid, p_ore_key text, p_resource text, p_amount integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $current$ DECLARE r jsonb;s jsonb;t timestamptz;BEGIN r:=public.stellar_grant_ore_reward_v229(p_user_id,p_ore_key,p_resource,p_amount);IF r ? 'state' THEN SELECT state,updated_at INTO s,t FROM public.game_saves WHERE user_id=p_user_id;r:=r||jsonb_build_object('state',s,'updated_at',t,'save_token',md5(s::text));END IF;RETURN r;END $current$;
REVOKE ALL ON FUNCTION public.stellar_player_grant_ore_reward(uuid,text,text,integer) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.stellar_player_grant_ore_reward(uuid,text,text,integer) TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_player_natal_action(p_user_id uuid, p_key text, p_action text, p_payload jsonb DEFAULT '{}'::jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $current$ DECLARE r jsonb;s jsonb;t timestamptz;BEGIN r:=public.stellar_natal_action_v132(p_user_id,p_key,p_action,p_payload);IF r ? 'state' THEN SELECT state,updated_at INTO s,t FROM public.game_saves WHERE user_id=p_user_id;r:=r||jsonb_build_object('state',s,'updated_at',t,'save_token',md5(s::text));END IF;RETURN r;END $current$;
REVOKE ALL ON FUNCTION public.stellar_player_natal_action(uuid,text,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.stellar_player_natal_action(uuid,text,text,jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_player_natal_npc(p_user_id uuid, p_kill_key text, p_npc_type text, p_base_credits bigint, p_base_stl bigint, p_owner_eligible boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $current$ DECLARE r jsonb;s jsonb;t timestamptz;BEGIN r:=public.stellar_natal_npc_v132(p_user_id,p_kill_key,p_npc_type,p_base_credits,p_base_stl,p_owner_eligible);IF r ? 'state' THEN SELECT state,updated_at INTO s,t FROM public.game_saves WHERE user_id=p_user_id;r:=r||jsonb_build_object('state',s,'updated_at',t,'save_token',md5(s::text));END IF;RETURN r;END $current$;
REVOKE ALL ON FUNCTION public.stellar_player_natal_npc(uuid,text,text,bigint,bigint,boolean) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.stellar_player_natal_npc(uuid,text,text,bigint,bigint,boolean) TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_player_offline_farm_claim(p_user uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $current$ DECLARE r jsonb;s jsonb;t timestamptz;BEGIN r:=public.stellar_offline_farm_claim_v1111(p_user);IF r ? 'state' THEN SELECT state,updated_at INTO s,t FROM public.game_saves WHERE user_id=p_user;r:=r||jsonb_build_object('state',s,'updated_at',t,'save_token',md5(s::text));END IF;RETURN r;END $current$;
REVOKE ALL ON FUNCTION public.stellar_player_offline_farm_claim(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.stellar_player_offline_farm_claim(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_player_settle_auction_bid(p_user_id uuid, p_hour_key text, p_lot_ref text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $current$ DECLARE r jsonb;s jsonb;t timestamptz;BEGIN r:=public.stellar_settle_auction_bid_v1182(p_user_id,p_hour_key,p_lot_ref);IF r ? 'state' THEN SELECT state,updated_at INTO s,t FROM public.game_saves WHERE user_id=p_user_id;r:=r||jsonb_build_object('state',s,'updated_at',t,'save_token',md5(s::text));END IF;RETURN r;END $current$;
REVOKE ALL ON FUNCTION public.stellar_player_settle_auction_bid(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.stellar_player_settle_auction_bid(uuid,text,text) TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_player_u426_market_buy(p_offer uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $current$ BEGIN RETURN public.stellar_u426_market_buy(p_offer);END $current$;
REVOKE ALL ON FUNCTION public.stellar_player_u426_market_buy(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.stellar_player_u426_market_buy(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.stellar_player_u42_action(p_action text, p_code text, p_quantity integer, p_request_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $current$ DECLARE r jsonb;s jsonb;t timestamptz;BEGIN r:=public.stellar_u42_action(p_action,p_code,p_quantity,p_request_id);IF r ? 'state' THEN SELECT state,updated_at INTO s,t FROM public.game_saves WHERE user_id=auth.uid();r:=r||jsonb_build_object('state',s,'updated_at',t,'save_token',md5(s::text));END IF;RETURN r;END $current$;
REVOKE ALL ON FUNCTION public.stellar_player_u42_action(text,text,integer,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.stellar_player_u42_action(text,text,integer,uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.stellar_player_test_purchase_premium(p_product_id text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $current$ DECLARE r jsonb;s jsonb;t timestamptz;BEGIN r:=public.test_purchase_premium_v12(p_product_id);IF r ? 'state' THEN SELECT state,updated_at INTO s,t FROM public.game_saves WHERE user_id=auth.uid();r:=r||jsonb_build_object('state',s,'updated_at',t,'save_token',md5(s::text));END IF;RETURN r;END $current$;
REVOKE ALL ON FUNCTION public.stellar_player_test_purchase_premium(text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.stellar_player_test_purchase_premium(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_player_test_purchase_premium(text) TO service_role;

CREATE OR REPLACE FUNCTION public.stellar_player_offline_farm_start(p_user uuid, p_minutes integer, p_auto_sell boolean, p_auto_buy boolean, p_mine boolean, p_npc_key text, p_ammo_key text, p_combat jsonb, p_baseline_save_at timestamp with time zone) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$BEGIN RETURN public.stellar_offline_farm_start_v1111(p_user,p_minutes,p_auto_sell,p_auto_buy,p_mine,p_npc_key,p_ammo_key,p_combat,p_baseline_save_at);END $$;
REVOKE ALL ON FUNCTION public.stellar_player_offline_farm_start(uuid,integer,boolean,boolean,boolean,text,text,jsonb,timestamp with time zone) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_player_offline_farm_start(uuid,integer,boolean,boolean,boolean,text,text,jsonb,timestamp with time zone) TO service_role;

-- No browser needs these structural privileges. RLS does not protect TRUNCATE.
REVOKE TRUNCATE,REFERENCES,TRIGGER ON public.game_saves,public.profiles,public.auction_bids FROM anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_bonus_box_config_v1825() TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
