-- V134.1: compatible preparation for both V134 and V134.1 servers.
BEGIN;
SET LOCAL lock_timeout='5s';
CREATE INDEX IF NOT EXISTS stellar_collection_map_v1341 ON public.stellar_collection_drops_v134(user_id,map_key,kind,available_at);
CREATE INDEX IF NOT EXISTS stellar_collection_expiry_v1341 ON public.stellar_collection_drops_v134(user_id,expires_at) WHERE expires_at IS NOT NULL;
-- Read the normal case without holding the player's write lock; lock/recheck only to issue slots.
CREATE OR REPLACE FUNCTION public.stellar_player_bonus_ensure(p_user_id uuid,p_map_key text,p_count int,p_width int,p_height int)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE n int;
BEGIN
 IF p_user_id IS NULL OR p_count IS NULL OR p_width IS NULL OR p_height IS NULL OR p_map_key IS NULL OR p_count NOT BETWEEN 0 AND 100 OR p_width<500 OR p_height<500 OR length(p_map_key)>100 THEN RAISE EXCEPTION 'BONUS_MAP_INVALID';END IF;
 SELECT count(*) INTO n FROM public.stellar_collection_drops_v134 WHERE user_id=p_user_id AND map_key=p_map_key AND kind='bonus';
 IF n<p_count THEN
  PERFORM public.stellar_player_lock(p_user_id);
  SELECT count(*) INTO n FROM public.stellar_collection_drops_v134 WHERE user_id=p_user_id AND map_key=p_map_key AND kind='bonus';
  INSERT INTO public.stellar_collection_drops_v134(user_id,drop_id,kind,map_key,x,y,payload)
   SELECT p_user_id,'bonus_'||md5(random()::text||clock_timestamp()::text||i::text),'bonus',p_map_key,220+random()*(p_width-440),220+random()*(p_height-440),'{}' FROM generate_series(1,greatest(0,p_count-n)) i;
 END IF;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id',drop_id,'x',x,'y',y)) FROM (SELECT * FROM public.stellar_collection_drops_v134 WHERE user_id=p_user_id AND map_key=p_map_key AND kind='bonus' AND available_at<=clock_timestamp() ORDER BY drop_id LIMIT p_count) boxes),'[]');
END $$;
REVOKE ALL ON FUNCTION public.stellar_player_bonus_ensure(uuid,text,int,int,int) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_player_bonus_ensure(uuid,text,int,int,int) TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_player_collections_snapshot(p_user_id uuid,p_map_key text,p_count int,p_width int,p_height int)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE boxes jsonb;loot jsonb;
BEGIN
 boxes:=public.stellar_player_bonus_ensure(p_user_id,p_map_key,p_count,p_width,p_height);
 -- Expired drops have passed their gameplay lifetime. Keep issue and command receipts.
 DELETE FROM public.stellar_collection_drops_v134 WHERE user_id=p_user_id AND expires_at<=clock_timestamp();
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',drop_id,'x',x,'y',y,'resources',payload->'resources','expires_at',expires_at)),'[]') INTO loot
 FROM public.stellar_collection_drops_v134 WHERE user_id=p_user_id AND map_key=p_map_key AND kind='loot' AND expires_at>clock_timestamp();
 RETURN jsonb_build_object('boxes',boxes,'loot',loot);
END $$;
REVOKE ALL ON FUNCTION public.stellar_player_collections_snapshot(uuid,text,int,int,int) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_player_collections_snapshot(uuid,text,int,int,int) TO service_role;

CREATE OR REPLACE FUNCTION public.stellar_player_cargo_context(p_state jsonb) RETURNS jsonb LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path='' AS $ctx$
 SELECT jsonb_build_array(p_state->'activeShipId',p_state#>'{shipLoadout,extras}',p_state#>'{pilotBio,skills,logistics}',p_state#>'{pet,owned}',p_state#>'{pet,level}',p_state#>'{pet,advancedProtocolEquippedV110}',p_state#>'{pet,advancedProtocolOwnedV110}',p_state#>'{economyBoosts,cargo}',p_state#>'{economyServices,cargo}',p_state->'mapId',p_state#>'{profile,faction}');
$ctx$;
REVOKE ALL ON FUNCTION public.stellar_player_cargo_context(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_player_cargo_context(jsonb) TO service_role;
-- Validate space again under the common account lock, after concurrent deltas merge.
DO $capacity$
DECLARE definition text;at int;guard text:=$guard$
  -- COLLECTION_CAPACITY_V1341
  IF p_module='collection' AND p_payload ? 'cargo_limit' THEN
   IF public.stellar_player_cargo_context(p_payload->'base') IS DISTINCT FROM public.stellar_player_cargo_context(current_state)
    OR coalesce((p_payload->>'cargo_limit')::numeric,-1)<0
    OR (SELECT coalesce(sum(value::numeric),0) FROM jsonb_each_text(coalesce(merged->'cargo','{}')) WHERE key<>'Xenomit')>(p_payload->>'cargo_limit')::numeric
   THEN RETURN '{"ok":false,"code":"PLAYER_RETRY","detail":"CARGO_CAPACITY_CHANGED"}'::jsonb;END IF;
  END IF;
$guard$;
BEGIN
 definition:=pg_get_functiondef('public.stellar_player_commit(uuid,text,text,text,jsonb)'::regprocedure);
 IF position('COLLECTION_CAPACITY_V1341' in definition)=0 THEN
  at:=position($anchor$  IF p_module='checkpoint' THEN$anchor$ in definition);
  IF at=0 THEN RAISE EXCEPTION 'COLLECTION_COMMIT_VERSION_MISMATCH';END IF;
  EXECUTE left(definition,at-1)||guard||substring(definition from at);
 END IF;
END $capacity$;

NOTIFY pgrst,'reload schema';
COMMIT;
