-- Central economic event receipts, per-device sequence and atomic canonical acknowledgement.
BEGIN;
CREATE TABLE IF NOT EXISTS public.stellar_localfirst_streams_v146(
 user_id uuid NOT NULL,device_id uuid NOT NULL,sequence bigint NOT NULL DEFAULT 0,PRIMARY KEY(user_id,device_id));
CREATE TABLE IF NOT EXISTS public.stellar_localfirst_events_v146(
 user_id uuid NOT NULL,event_id uuid NOT NULL,device_id uuid NOT NULL,sequence bigint NOT NULL,
 request_hash text NOT NULL,status text NOT NULL CHECK(status IN ('confirmed','rejected')),
 receipt jsonb NOT NULL DEFAULT '{}',code text,created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,event_id),UNIQUE(user_id,device_id,sequence));
ALTER TABLE public.stellar_localfirst_streams_v146 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stellar_localfirst_events_v146 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stellar_localfirst_streams_v146,public.stellar_localfirst_events_v146 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.stellar_localfirst_streams_v146,public.stellar_localfirst_events_v146 TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_localfirst_guard_v146() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $f$
BEGIN
 IF coalesce(current_setting('stellar.localfirst_ack',true),'')<>'1' THEN
  IF OLD.state ? 'serverEconomicAckV146' THEN NEW.state:=jsonb_set(NEW.state,'{serverEconomicAckV146}',OLD.state->'serverEconomicAckV146',true);
  ELSE NEW.state:=NEW.state-'serverEconomicAckV146';END IF;
 END IF;
 RETURN NEW;
END $f$;
DROP TRIGGER IF EXISTS localfirst_ack_guard_v146 ON public.game_saves;
CREATE TRIGGER localfirst_ack_guard_v146 BEFORE INSERT OR UPDATE OF state ON public.game_saves FOR EACH ROW EXECUTE FUNCTION public.stellar_localfirst_guard_v146();
REVOKE ALL ON FUNCTION public.stellar_localfirst_guard_v146() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.stellar_localfirst_finish_v146(p_user_id uuid,p_event_id uuid,p_device_id uuid,p_sequence bigint,p_event_hash text,p_status text,p_receipt jsonb,p_code text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $f$
DECLARE prior public.stellar_localfirst_events_v146%ROWTYPE;last_seq bigint;s jsonb;stamp timestamptz;ack jsonb;
BEGIN
 IF p_user_id IS NULL OR p_device_id IS NULL OR p_event_id IS NULL OR p_sequence<1 OR p_sequence>9007199254740991 OR p_event_hash !~ '^[a-f0-9]{64}$' OR p_status NOT IN ('confirmed','rejected') THEN RAISE EXCEPTION 'OUTBOX_ARGUMENT_INVALID';END IF;
 PERFORM public.stellar_player_lock(p_user_id);
 SELECT * INTO prior FROM public.stellar_localfirst_events_v146 WHERE user_id=p_user_id AND event_id=p_event_id;
 IF FOUND THEN
  IF prior.request_hash<>p_event_hash OR prior.device_id<>p_device_id OR prior.sequence<>p_sequence THEN RAISE EXCEPTION 'OUTBOX_ID_REUSED';END IF;
 ELSE
  INSERT INTO public.stellar_localfirst_streams_v146(user_id,device_id) VALUES(p_user_id,p_device_id) ON CONFLICT DO NOTHING;
  SELECT sequence INTO last_seq FROM public.stellar_localfirst_streams_v146 WHERE user_id=p_user_id AND device_id=p_device_id FOR UPDATE;
  IF p_sequence<>last_seq+1 THEN RAISE EXCEPTION 'OUTBOX_SEQUENCE_CONFLICT';END IF;
  INSERT INTO public.stellar_localfirst_events_v146(user_id,event_id,device_id,sequence,request_hash,status,receipt,code)
   VALUES(p_user_id,p_event_id,p_device_id,p_sequence,p_event_hash,p_status,coalesce(p_receipt,'{}'),p_code);
  UPDATE public.stellar_localfirst_streams_v146 SET sequence=p_sequence WHERE user_id=p_user_id AND device_id=p_device_id;
 END IF;
 SELECT state,updated_at INTO s,stamp FROM public.game_saves WHERE user_id=p_user_id;
 IF s IS NULL THEN RAISE EXCEPTION 'PLAYER_SAVE_MISSING';END IF;
 IF coalesce((s#>>ARRAY['serverEconomicAckV146',p_device_id::text])::bigint,0)<p_sequence THEN
  ack:=coalesce(s->'serverEconomicAckV146','{}')||jsonb_build_object(p_device_id::text,p_sequence);
  PERFORM set_config('stellar.localfirst_ack','1',true);
  UPDATE public.game_saves SET state=jsonb_set(state,'{serverEconomicAckV146}',ack,true) WHERE user_id=p_user_id RETURNING state,updated_at INTO s,stamp;
 END IF;
 INSERT INTO public.stellar_player_baselines_v134(user_id,token,state) VALUES(p_user_id,md5(s::text),s) ON CONFLICT DO NOTHING;
 SELECT * INTO prior FROM public.stellar_localfirst_events_v146 WHERE user_id=p_user_id AND event_id=p_event_id;
 RETURN jsonb_build_object('ok',true,'state',s,'save_token',md5(s::text),'updated_at',stamp,'status',prior.status,'receipt',prior.receipt,'code',prior.code);
END $f$;
REVOKE ALL ON FUNCTION public.stellar_localfirst_finish_v146(uuid,uuid,uuid,bigint,text,text,jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_localfirst_finish_v146(uuid,uuid,uuid,bigint,text,text,jsonb,text) TO service_role;

CREATE OR REPLACE FUNCTION public.stellar_localfirst_commit_v146(p_user_id uuid,p_command_id text,p_module text,p_request_hash text,p_payload jsonb,p_event_id uuid,p_device_id uuid,p_sequence bigint,p_event_hash text,p_expected_price bigint DEFAULT NULL,p_expected_currency text DEFAULT NULL,p_reset_epoch bigint DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $f$
DECLARE prior public.stellar_localfirst_events_v146%ROWTYPE;s jsonb;last_seq bigint;draft jsonb;args jsonb:=p_payload;r jsonb;final jsonb;quoted jsonb;paid numeric;
BEGIN
 IF p_sequence<1 OR p_event_id IS NULL OR p_device_id IS NULL OR p_event_hash !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'OUTBOX_ARGUMENT_INVALID';END IF;
 PERFORM public.stellar_player_lock(p_user_id);
 SELECT * INTO prior FROM public.stellar_localfirst_events_v146 WHERE user_id=p_user_id AND event_id=p_event_id;
 IF FOUND THEN
  IF prior.request_hash<>p_event_hash OR prior.device_id<>p_device_id OR prior.sequence<>p_sequence THEN RAISE EXCEPTION 'OUTBOX_ID_REUSED';END IF;
  IF prior.status<>'confirmed' THEN RETURN jsonb_build_object('ok',false,'code',prior.code);END IF;
  SELECT state INTO s FROM public.game_saves WHERE user_id=p_user_id;
  RETURN jsonb_build_object('ok',true,'replayed',true,'state',s,'receipt',prior.receipt,'save_token',md5(s::text));
 END IF;
 INSERT INTO public.stellar_localfirst_streams_v146(user_id,device_id) VALUES(p_user_id,p_device_id) ON CONFLICT DO NOTHING;
 SELECT sequence INTO last_seq FROM public.stellar_localfirst_streams_v146 WHERE user_id=p_user_id AND device_id=p_device_id FOR UPDATE;
 IF p_sequence<>last_seq+1 THEN RAISE EXCEPTION 'OUTBOX_SEQUENCE_CONFLICT';END IF;
 SELECT state INTO s FROM public.game_saves WHERE user_id=p_user_id;
 IF coalesce((s->>'adminResetEpoch')::bigint,0)<>p_reset_epoch THEN RETURN '{"ok":false,"code":"OUTBOX_RESET_STALE"}'::jsonb;END IF;
 IF p_expected_price IS NOT NULL THEN
  quoted:=CASE WHEN p_module='purchase' THEN args->'receipt' WHEN args#>'{receipt,purchase}' IS NOT NULL THEN args#>'{receipt,purchase}' ELSE args#>'{receipt,info}' END;
  paid:=coalesce((quoted->>'price')::numeric,(quoted->>'cost')::numeric,(quoted->>'total')::numeric);
  IF paid IS DISTINCT FROM p_expected_price::numeric OR quoted->>'currency' IS DISTINCT FROM p_expected_currency THEN RETURN '{"ok":false,"code":"OUTBOX_QUOTE_CHANGED"}'::jsonb;END IF;
 END IF;
 -- Install server-authored ACK in the SAME save commit as the actual economic delta.
 IF args->'state' IS NOT NULL AND args->'state'<>'null'::jsonb THEN
  draft:=args->'state';draft:=jsonb_set(draft,'{serverEconomicAckV146}',coalesce(s->'serverEconomicAckV146','{}')||jsonb_build_object(p_device_id::text,p_sequence),true);
  args:=jsonb_set(args,'{state}',draft,true);
  IF args->'base' IS NOT NULL AND args->'base'<>'null'::jsonb THEN args:=jsonb_set(args,'{base}',jsonb_set(args->'base','{serverEconomicAckV146}',coalesce(s->'serverEconomicAckV146','{}'),true),true);END IF;
 END IF;
 PERFORM set_config('stellar.localfirst_ack','1',true);
 r:=public.stellar_player_commit(p_user_id,p_command_id,p_module,p_request_hash,args);
 IF r->>'ok' IS DISTINCT FROM 'true' THEN RETURN r;END IF;
 final:=public.stellar_localfirst_finish_v146(p_user_id,p_event_id,p_device_id,p_sequence,p_event_hash,'confirmed',coalesce(r->'receipt','{}'),NULL);
 RETURN r||jsonb_build_object('state',final->'state','save_token',final->'save_token','updated_at',final->'updated_at');
END $f$;
REVOKE ALL ON FUNCTION public.stellar_localfirst_commit_v146(uuid,text,text,text,jsonb,uuid,uuid,bigint,text,bigint,text,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_localfirst_commit_v146(uuid,text,text,text,jsonb,uuid,uuid,bigint,text,bigint,text,bigint) TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_localfirst_read_v146(p_user_id uuid,p_token text DEFAULT NULL,p_checkpoint_ids text[] DEFAULT NULL)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $f$
 SELECT public.stellar_player_read(p_user_id,p_token,p_checkpoint_ids)||'{"local_first_v146":{"enabled":true,"protocol":1}}'::jsonb;
$f$;
REVOKE ALL ON FUNCTION public.stellar_localfirst_read_v146(uuid,text,text[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_localfirst_read_v146(uuid,text,text[]) TO service_role;
COMMIT;
