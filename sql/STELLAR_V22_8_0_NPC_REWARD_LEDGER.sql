-- Stellar Legacy: concessao de CR/STL de NPC exclusivamente pelo servidor.
-- Compatível com a V22.7.0: nenhum save existente e alterado na instalacao.
BEGIN;
CREATE TABLE IF NOT EXISTS public.stellar_npc_reward_ledger (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 kill_key text NOT NULL CHECK (length(kill_key) BETWEEN 12 AND 180),
 npc_type text NOT NULL DEFAULT 'npc',
 credits bigint NOT NULL DEFAULT 0 CHECK (credits >= 0 AND credits <= 100000000),
 stl bigint NOT NULL DEFAULT 0 CHECK (stl >= 0 AND stl <= 1000000),
 issued_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,kill_key)
);
CREATE INDEX IF NOT EXISTS stellar_npc_reward_ledger_issued_idx ON public.stellar_npc_reward_ledger(user_id,issued_at DESC);
ALTER TABLE public.stellar_npc_reward_ledger ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stellar_npc_reward_ledger FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.stellar_npc_reward_ledger TO service_role;

CREATE OR REPLACE FUNCTION public.stellar_grant_npc_reward_v228(
 p_user_id uuid,p_kill_key text,p_npc_type text,p_base_credits bigint,p_base_stl bigint
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
 v_state jsonb; v_profile jsonb; v_prior public.stellar_npc_reward_ledger%ROWTYPE;
 v_skills jsonb; v_greed int; v_c1 int; v_c2 int; v_bon_cr int; v_bon_stl int;
 v_cr bigint; v_stl bigint; v_balance_cr bigint; v_balance_stl bigint; v_rev bigint;
BEGIN
 IF p_user_id IS NULL OR p_kill_key IS NULL OR length(p_kill_key) NOT BETWEEN 12 AND 180 OR p_npc_type IS NULL OR length(p_npc_type)>80 OR
    p_base_credits IS NULL OR p_base_stl IS NULL OR p_base_credits<0 OR p_base_credits>75000000 OR p_base_stl<0 OR p_base_stl>750000
 THEN RAISE EXCEPTION 'NPC_REWARD_INVALID'; END IF;
 -- Serialized by player: simultaneous NPC kills, saves and purchases cannot claim twice.
 SELECT state INTO v_state FROM public.game_saves WHERE user_id=p_user_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'NPC_REWARD_SAVE_MISSING'; END IF;
 SELECT * INTO v_prior FROM public.stellar_npc_reward_ledger WHERE user_id=p_user_id AND kill_key=p_kill_key;
 IF FOUND THEN RETURN jsonb_build_object('granted',false,'credits',0,'stl',0,'revision',coalesce((v_state->>'serverNpcRewardRevision')::bigint,0),'kill_key',p_kill_key); END IF;
 v_profile:=coalesce(v_state->'profile','{}'::jsonb);
 v_skills:=coalesce(v_state#>'{pilotBio,skills}','{}'::jsonb);
 v_greed:=greatest(0,least(5,coalesce((v_skills->>'greed')::int,0)));
 v_c1:=greatest(0,least(2,coalesce((v_skills->>'cruelty1')::int,0)));
 v_c2:=greatest(0,least(3,coalesce((v_skills->>'cruelty2')::int,0)));
 v_bon_cr:=(array[0,4,8,12,18,25])[v_greed+1];
 v_bon_stl:=(array[0,4,8])[v_c1+1]+(array[0,4,10,17])[v_c2+1];
 v_cr:=round(p_base_credits*(100+v_bon_cr)/100.0);
 v_stl:=round(p_base_stl*(100+v_bon_stl)/100.0);
 v_balance_cr:=coalesce((v_profile->>'credits')::bigint,0)+v_cr;
 v_balance_stl:=coalesce((v_profile->>'uridium')::bigint,0)+v_stl;
 v_rev:=coalesce((v_state->>'serverNpcRewardRevision')::bigint,0)+1;
 IF v_balance_cr>1000000000000 OR v_balance_stl>10000000000 OR v_rev>1000000000 THEN RAISE EXCEPTION 'NPC_REWARD_BALANCE_LIMIT'; END IF;
 INSERT INTO public.stellar_npc_reward_ledger(user_id,kill_key,npc_type,credits,stl)
 VALUES (p_user_id,p_kill_key,p_npc_type,v_cr,v_stl);
 UPDATE public.game_saves SET state=jsonb_set(jsonb_set(jsonb_set(v_state,'{profile,credits}',to_jsonb(v_balance_cr),true),'{profile,uridium}',to_jsonb(v_balance_stl),true),'{serverNpcRewardRevision}',to_jsonb(v_rev),true),updated_at=now() WHERE user_id=p_user_id;
 UPDATE public.profiles SET credits=v_balance_cr,uridium=v_balance_stl,updated_at=now() WHERE id=p_user_id;
 RETURN jsonb_build_object('granted',true,'credits',v_cr,'stl',v_stl,'revision',v_rev,'kill_key',p_kill_key);
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN RAISE EXCEPTION 'NPC_REWARD_INVALID_STATE';
END; $$;
REVOKE ALL ON FUNCTION public.stellar_grant_npc_reward_v228(uuid,text,text,bigint,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_grant_npc_reward_v228(uuid,text,text,bigint,bigint) TO service_role;

-- Prevent rollback or fabrication of server NPC reward revision through regular save writes.
CREATE OR REPLACE FUNCTION public.stellar_guard_npc_reward_revision_v228()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE old_rev numeric; new_rev numeric;
BEGIN
 IF NEW.state ? 'serverNpcRewardRevision' AND jsonb_typeof(NEW.state->'serverNpcRewardRevision')<>'number' THEN RAISE EXCEPTION 'SECURITY_NPC_REWARD_REVISION'; END IF;
 new_rev:=coalesce((NEW.state->>'serverNpcRewardRevision')::numeric,0);
 IF new_rev<0 OR new_rev>1000000000 OR new_rev<>trunc(new_rev) THEN RAISE EXCEPTION 'SECURITY_NPC_REWARD_REVISION'; END IF;
 IF TG_OP='UPDATE' THEN
   old_rev:=coalesce((OLD.state->>'serverNpcRewardRevision')::numeric,0);
   IF new_rev<old_rev THEN RAISE EXCEPTION 'SAVE_NPC_STALE'; END IF;
   IF new_rev>old_rev+1 THEN RAISE EXCEPTION 'SECURITY_NPC_REWARD_REVISION'; END IF;
 END IF;
 RETURN NEW;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN RAISE EXCEPTION 'SECURITY_NPC_REWARD_REVISION';
END; $$;
DROP TRIGGER IF EXISTS stellar_guard_npc_reward_revision_update_v228 ON public.game_saves;
DROP TRIGGER IF EXISTS stellar_guard_npc_reward_revision_insert_v228 ON public.game_saves;
CREATE TRIGGER stellar_guard_npc_reward_revision_update_v228 BEFORE UPDATE OF state ON public.game_saves FOR EACH ROW EXECUTE FUNCTION public.stellar_guard_npc_reward_revision_v228();
CREATE TRIGGER stellar_guard_npc_reward_revision_insert_v228 BEFORE INSERT ON public.game_saves FOR EACH ROW EXECUTE FUNCTION public.stellar_guard_npc_reward_revision_v228();
REVOKE ALL ON FUNCTION public.stellar_guard_npc_reward_revision_v228() FROM PUBLIC,anon,authenticated;
COMMIT;
