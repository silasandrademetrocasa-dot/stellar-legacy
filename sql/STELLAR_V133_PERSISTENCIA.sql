-- V133: recibos duráveis de checkpoint e revisão observável de todos os escritores.
BEGIN;
CREATE TABLE IF NOT EXISTS public.stellar_save_receipts_v133(user_id uuid NOT NULL,operation_id uuid NOT NULL,request_hash text NOT NULL,receipt jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,operation_id));
CREATE TABLE IF NOT EXISTS public.stellar_save_clock_v133(user_id uuid PRIMARY KEY,revision bigint NOT NULL,updated_at timestamptz NOT NULL,writer text NOT NULL);
ALTER TABLE public.stellar_save_receipts_v133 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stellar_save_clock_v133 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stellar_save_receipts_v133,public.stellar_save_clock_v133 FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.stellar_save_receipts_v133,public.stellar_save_clock_v133 TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_observe_save_v133() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW.state IS NOT DISTINCT FROM OLD.state THEN RETURN NEW;END IF;
 INSERT INTO public.stellar_save_clock_v133(user_id,revision,updated_at,writer) VALUES(NEW.user_id,1,clock_timestamp(),coalesce(nullif(current_setting('stellar.writer',true),''),'legacy_rpc'))
 ON CONFLICT(user_id) DO UPDATE SET revision=public.stellar_save_clock_v133.revision+1,updated_at=excluded.updated_at,writer=excluded.writer;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.stellar_observe_save_v133() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS stellar_save_clock_v133 ON public.game_saves;
CREATE TRIGGER stellar_save_clock_v133 AFTER INSERT OR UPDATE OF state ON public.game_saves FOR EACH ROW EXECUTE FUNCTION public.stellar_observe_save_v133();
CREATE OR REPLACE FUNCTION public.stellar_read_save_v133(p_user_id uuid,p_operation_id uuid DEFAULT NULL,p_request_hash text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE r jsonb; stored record;
BEGIN
 r:=public.stellar_read_save_v131(p_user_id);
 IF p_operation_id IS NOT NULL THEN
 SELECT * INTO stored FROM public.stellar_save_receipts_v133 WHERE user_id=p_user_id AND operation_id=p_operation_id;
 IF FOUND THEN
 IF stored.request_hash IS DISTINCT FROM p_request_hash THEN RETURN r||'{"receipt_error":"SAVE_IDEMPOTENCY_ID_REUSED"}'::jsonb;END IF;
 RETURN r||jsonb_build_object('replayed',true,'receipt',stored.receipt);
 END IF;END IF;
 RETURN r;
END $$;
CREATE OR REPLACE FUNCTION public.stellar_commit_save_v133(p_user_id uuid,p_state jsonb,p_updated_at timestamptz,p_callsign text,p_expected_token text,p_operation_id uuid,p_request_hash text) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE stored record; r jsonb;
BEGIN
 IF p_operation_id IS NULL OR p_request_hash !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'SAVE_OPERATION_ID_INVALID';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,133));
 SELECT * INTO stored FROM public.stellar_save_receipts_v133 WHERE user_id=p_user_id AND operation_id=p_operation_id;
 IF FOUND THEN
 IF stored.request_hash IS DISTINCT FROM p_request_hash THEN RETURN '{"ok":false,"code":"SAVE_IDEMPOTENCY_ID_REUSED"}'::jsonb;END IF;
 RETURN stored.receipt||jsonb_build_object('replayed',true);
 END IF;
 PERFORM set_config('stellar.writer','checkpoint_v133',true);
 r:=public.stellar_commit_save_v131(p_user_id,p_state,p_updated_at,p_callsign,p_expected_token);
 IF r->>'ok'='true' THEN INSERT INTO public.stellar_save_receipts_v133 VALUES(p_user_id,p_operation_id,p_request_hash,r,clock_timestamp());END IF;
 RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.stellar_read_save_v133(uuid,uuid,text),public.stellar_commit_save_v133(uuid,jsonb,timestamptz,text,text,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_read_save_v133(uuid,uuid,text),public.stellar_commit_save_v133(uuid,jsonb,timestamptz,text,text,uuid,text) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
