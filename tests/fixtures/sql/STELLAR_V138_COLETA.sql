BEGIN;
SET LOCAL lock_timeout='5s';
CREATE OR REPLACE FUNCTION public.stellar_collection_session_v138(p_user_id uuid,p_session_id uuid) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF p_user_id IS NULL OR p_session_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.game_login_sessions_v1214 WHERE user_id=p_user_id AND session_id=p_session_id) THEN RAISE EXCEPTION 'SESSION_REPLACED' USING ERRCODE='28000';END IF;
 IF EXISTS(SELECT 1 FROM public.account_moderation_v1763 WHERE user_id=p_user_id AND is_banned AND (banned_until IS NULL OR banned_until>clock_timestamp())) THEN RAISE EXCEPTION 'ACCOUNT_BANNED' USING ERRCODE='28000';END IF;
END $$;
CREATE OR REPLACE FUNCTION public.stellar_collection_context_v138(p_user_id uuid,p_session_id uuid,p_drop_id text,p_command_id text) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE s jsonb;d jsonb;r jsonb;
BEGIN
 PERFORM public.stellar_collection_session_v138(p_user_id,p_session_id);
 SELECT jsonb_build_object('state',state,'updated_at',updated_at) INTO s FROM public.game_saves WHERE user_id=p_user_id;
 SELECT to_jsonb(t) INTO d FROM public.stellar_collection_drops_v134 t WHERE user_id=p_user_id AND drop_id=p_drop_id;
 SELECT jsonb_build_object('request_hash',request_hash,'module',module) INTO r FROM public.stellar_player_commands_v134 WHERE user_id=p_user_id AND command_id=p_command_id;
 RETURN jsonb_build_object('save',s,'drop',d,'receipt',r);
END $$;
REVOKE ALL ON FUNCTION public.stellar_collection_session_v138(uuid,uuid),public.stellar_collection_context_v138(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_collection_session_v138(uuid,uuid),public.stellar_collection_context_v138(uuid,uuid,text,text) TO service_role;
-- Validate the game session again at the commit boundary, including replay.
DO $patch$
DECLARE d text;at int;guard text:=$guard$
 -- COLLECTION_SESSION_V138
 IF p_module='collection' AND p_payload ? 'collection_session' THEN
  PERFORM public.stellar_collection_session_v138(p_user_id,(p_payload->>'collection_session')::uuid);
 END IF;
$guard$;
BEGIN
 d:=pg_get_functiondef('public.stellar_player_commit(uuid,text,text,text,jsonb)'::regprocedure);
 IF position('COLLECTION_SESSION_V138' in d)=0 THEN
  at:=position(' PERFORM public.stellar_player_lock(p_user_id);' in d);
  IF at=0 THEN RAISE EXCEPTION 'COMMIT_VERSION_MISMATCH';END IF;
  at:=at+length(' PERFORM public.stellar_player_lock(p_user_id);');
  d:=left(d,at-1)||guard||substring(d from at);EXECUTE d;
 END IF;
END $patch$;
NOTIFY pgrst,'reload schema';
COMMIT;
