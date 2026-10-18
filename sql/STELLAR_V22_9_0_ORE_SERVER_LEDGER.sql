-- Stellar Legacy 22.9: minério compartilhado confirmado no servidor, transação idempotente.
-- Ativa nova função sem impactar fluxos antigos. Não altera os saves existentes.
BEGIN;
CREATE TABLE IF NOT EXISTS public.stellar_ore_reward_ledger (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 ore_key text NOT NULL CHECK(length(ore_key) BETWEEN 8 AND 180),
 resource text NOT NULL CHECK(length(resource) BETWEEN 2 AND 64),
 amount integer NOT NULL CHECK(amount >= 1 AND amount <= 1000),
 issued_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (user_id,ore_key)
);
CREATE INDEX IF NOT EXISTS stellar_ore_rewards_user_issued_idx ON public.stellar_ore_reward_ledger(user_id,issued_at DESC);
ALTER TABLE public.stellar_ore_reward_ledger ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.stellar_ore_reward_ledger FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON TABLE public.stellar_ore_reward_ledger TO service_role;

CREATE OR REPLACE FUNCTION public.stellar_grant_ore_reward_v229(
 p_user_id uuid,p_ore_key text,p_resource text,p_amount integer
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_save jsonb;v_prior public.stellar_ore_reward_ledger%ROWTYPE;
 v_cargo jsonb;v_prev bigint;v_rev bigint;v_total bigint;
BEGIN
 IF p_user_id IS NULL OR length(trim(coalesce(p_ore_key,''))) NOT BETWEEN 8 AND 180
 OR length(trim(coalesce(p_resource,''))) NOT BETWEEN 2 AND 64
 OR NOT EXISTS (SELECT 1 FROM public.game_resource_config_v1814 r WHERE r.resource_key=p_resource AND r.enabled IS TRUE)
 OR p_amount NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'ORE_GRANT_INVALID'; END IF;
 SELECT state INTO v_save FROM public.game_saves WHERE user_id=p_user_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'ORE_GRANT_SAVE_MISSING'; END IF;
 SELECT * INTO v_prior FROM public.stellar_ore_reward_ledger WHERE user_id=p_user_id AND ore_key=p_ore_key;
 v_rev:=coalesce((v_save->>'serverOreRevision')::bigint,0);
 IF FOUND THEN RETURN jsonb_build_object('granted',false,'amount',0,'revision',v_rev,'resource',v_prior.resource); END IF;
 v_cargo:=coalesce(v_save->'cargo','{}'::jsonb);
 IF jsonb_typeof(v_cargo)<>'object' THEN RAISE EXCEPTION 'ORE_GRANT_CARGO_INVALID'; END IF;
 v_prev:=coalesce((v_cargo->>p_resource)::bigint,0);
 v_total:=v_prev+p_amount;
 IF v_total>1000000000 OR v_rev>=1000000000 THEN RAISE EXCEPTION 'ORE_GRANT_LIMIT'; END IF;
 INSERT INTO public.stellar_ore_reward_ledger(user_id,ore_key,resource,amount) VALUES(p_user_id,p_ore_key,p_resource,p_amount);
 UPDATE public.game_saves SET state=jsonb_set(jsonb_set(v_save,ARRAY['cargo',p_resource],to_jsonb(v_total),true),'{serverOreRevision}',to_jsonb(v_rev+1),true),updated_at=now() WHERE user_id=p_user_id;
 RETURN jsonb_build_object('granted',true,'amount',p_amount,'revision',v_rev+1,'resource',p_resource);
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN RAISE EXCEPTION 'ORE_GRANT_INVALID_STATE';
END;$$;
REVOKE ALL ON FUNCTION public.stellar_grant_ore_reward_v229(uuid,text,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_grant_ore_reward_v229(uuid,text,text,integer) TO service_role;

CREATE OR REPLACE FUNCTION public.stellar_guard_ore_reward_revision_v229() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_new numeric;v_old numeric;
BEGIN
 IF NEW.state ? 'serverOreRevision' AND jsonb_typeof(NEW.state->'serverOreRevision')<>'number' THEN RAISE EXCEPTION 'SECURITY_ORE_REVISION'; END IF;
 v_new:=coalesce((NEW.state->>'serverOreRevision')::numeric,0);
 IF v_new<0 OR v_new>1000000000 OR v_new<>trunc(v_new) THEN RAISE EXCEPTION 'SECURITY_ORE_REVISION'; END IF;
 IF TG_OP='UPDATE' THEN
 v_old:=coalesce((OLD.state->>'serverOreRevision')::numeric,0);
 IF v_new<v_old THEN RAISE EXCEPTION 'SAVE_ORE_STALE';END IF;
 IF v_new>v_old+1 THEN RAISE EXCEPTION 'SECURITY_ORE_REVISION';END IF;
 END IF;
 RETURN NEW;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN RAISE EXCEPTION 'SECURITY_ORE_REVISION';
END;$$;
DROP TRIGGER IF EXISTS stellar_guard_ore_revision_update_v229 ON public.game_saves;
DROP TRIGGER IF EXISTS stellar_guard_ore_revision_insert_v229 ON public.game_saves;
CREATE TRIGGER stellar_guard_ore_revision_update_v229 BEFORE UPDATE OF state ON public.game_saves FOR EACH ROW EXECUTE FUNCTION public.stellar_guard_ore_reward_revision_v229();
CREATE TRIGGER stellar_guard_ore_revision_insert_v229 BEFORE INSERT ON public.game_saves FOR EACH ROW EXECUTE FUNCTION public.stellar_guard_ore_reward_revision_v229();
REVOKE ALL ON FUNCTION public.stellar_guard_ore_reward_revision_v229() FROM PUBLIC,anon,authenticated;
COMMIT;
