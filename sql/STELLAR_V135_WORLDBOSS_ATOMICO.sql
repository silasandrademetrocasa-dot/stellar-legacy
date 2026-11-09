-- V135.0: claim, state modification and reward receipt share one PostgreSQL transaction.
-- Deploy before V135.0 client. The old claim RPC is deliberately not modified to avoid
-- breaking older mobile sessions; once the V135 rollout completes, revoke old RPC access.
BEGIN;
CREATE OR REPLACE FUNCTION public.stellar_player_claim_world_boss_v135()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $v135$
DECLARE
 v_uid uuid:=auth.uid();v_state jsonb;v_saved_at timestamptz;v_result jsonb;
 v_w jsonb;v_bp jsonb;v_claims jsonb;v_key text;v_boss text;
 v_cr bigint;v_stl bigint;v_cores bigint;v_frags bigint;v_receipt jsonb;
 v_saved jsonb;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Sessão inválida'; END IF;
 PERFORM public.stellar_player_lock(v_uid);
 IF EXISTS(SELECT 1 FROM public.stellar_offline_farm_v484 WHERE user_id=v_uid AND status='running')
 THEN RAISE EXCEPTION 'FARM_OFFLINE_ACTIVE'; END IF;
 SELECT state,updated_at INTO v_state,v_saved_at FROM public.game_saves WHERE user_id=v_uid FOR UPDATE;
 IF jsonb_typeof(v_state) IS DISTINCT FROM 'object' OR jsonb_typeof(v_state->'profile') IS DISTINCT FROM 'object'
 THEN RAISE EXCEPTION 'Save do piloto indisponível'; END IF;
 -- An exception in any step rolls back the claim record and every reward together.
 v_result:=public.claim_world_boss_reward_v131();
 IF coalesce((v_result->>'already_claimed')::boolean,false) THEN
  RETURN v_result||jsonb_build_object('ok',true,'state',v_state,'updated_at',v_saved_at,'save_token',md5(v_state::text));
 END IF;
 v_cr:=greatest(0,coalesce((v_result->>'credits')::bigint,0));
 v_stl:=greatest(0,coalesce((v_result->>'uridium')::bigint,0));
 v_cores:=greatest(0,coalesce((v_result->>'cores')::bigint,0));
 v_frags:=greatest(0,coalesce((v_result->>'fragments')::bigint,0));
 v_key:=v_result->>'blueprint_id';
 IF v_key NOT IN ('lf4','sg3nb02','g3n7900') OR v_key IS NULL THEN
  RAISE EXCEPTION 'World Boss blueprint inválido';END IF;
 v_boss:=v_result->>'boss_id';
 v_state:=jsonb_set(v_state,'{profile,credits}',to_jsonb(greatest(0,coalesce((v_state #>> '{profile,credits}')::bigint,0))+v_cr),true);
 v_state:=jsonb_set(v_state,'{profile,uridium}',to_jsonb(greatest(0,coalesce((v_state #>> '{profile,uridium}')::bigint,0))+v_stl),true);
 v_w:=coalesce(v_state->'warfront','{}'::jsonb);
 v_w:=jsonb_set(v_w,'{skillCores}',to_jsonb(greatest(0,coalesce((v_w->>'skillCores')::bigint,0))+v_cores),true);
 v_bp:=coalesce(v_w->'blueprints','{}'::jsonb);
 v_bp:=jsonb_set(v_bp,ARRAY[v_key],to_jsonb(greatest(0,coalesce((v_bp->>v_key)::bigint,0))+v_frags),true);
 v_w:=jsonb_set(v_w,'{blueprints}',v_bp,true);
 v_claims:=coalesce(v_w->'worldBossClaims','{}'::jsonb);
 v_claims:=jsonb_set(v_claims,ARRAY[v_boss],to_jsonb(floor(extract(epoch from clock_timestamp())*1000)::bigint),true);
 v_w:=jsonb_set(v_w,'{worldBossClaims}',v_claims,true);
 v_state:=jsonb_set(v_state,'{warfront}',v_w,true);
 v_state:=jsonb_set(v_state,'{serverPurchaseRevision}',to_jsonb(coalesce((v_state->>'serverPurchaseRevision')::bigint,0)+1),true);
 PERFORM set_config('stellar.writer','player:reward',true);
 v_saved:=public.stellar_commit_player_save_v118(v_uid,v_state,clock_timestamp(),
  coalesce(nullif(v_state #>> '{profile,callsign}',''),nullif(v_state->>'callsign',''),'Pilot'));
 IF v_saved->>'ok' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'World Boss não foi gravado';END IF;
 RETURN v_result||jsonb_build_object('ok',true,'state',v_state,'updated_at',v_saved->'updated_at','save_token',md5(v_state::text));
END;
$v135$;
REVOKE ALL ON FUNCTION public.stellar_player_claim_world_boss_v135() FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.stellar_player_claim_world_boss_v135() TO authenticated;
COMMIT;
