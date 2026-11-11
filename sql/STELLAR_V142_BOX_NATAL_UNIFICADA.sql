BEGIN;
SET LOCAL lock_timeout='5s';

-- Same slots, same personal drop IDs and same collection commit. No second reward writer.
CREATE OR REPLACE FUNCTION public.stellar_player_bonus_ensure(p_user_id uuid,p_map_key text,p_count integer,p_width integer,p_height integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE n int;seasonal boolean;wanted int;present int;
BEGIN
 IF p_user_id IS NULL OR p_count IS NULL OR p_width IS NULL OR p_height IS NULL OR p_map_key IS NULL OR p_count NOT BETWEEN 0 AND 100 OR p_width<500 OR p_height<500 OR length(p_map_key)>100 THEN RAISE EXCEPTION 'BONUS_MAP_INVALID';END IF;
 IF p_map_key !~ '^((earth|mars|jupiter):(x[1-8]|u[1-3])|battle:b4[1-3])$' THEN RETURN '[]'::jsonb;END IF;
 -- Old Render instances keep normal boxes until the V142 backend is deployed.
 SELECT coalesce(nullif(current_setting('request.headers',true),'')::jsonb->>'x-stellar-collections','')='mixed-v142' AND EXISTS(SELECT 1 FROM public.stellar_natal_config_v132 WHERE id=1 AND enabled AND starts_at<=clock_timestamp() AND ends_at>clock_timestamp()) INTO seasonal;
 SELECT count(*) INTO n FROM public.stellar_collection_drops_v134 WHERE user_id=p_user_id AND map_key=p_map_key AND kind='bonus';
 -- Serializes initialization, type assignment and respawn with all other player writes.
 PERFORM public.stellar_player_lock(p_user_id);
 IF n<p_count THEN
  SELECT count(*) INTO n FROM public.stellar_collection_drops_v134 WHERE user_id=p_user_id AND map_key=p_map_key AND kind='bonus';
  INSERT INTO public.stellar_collection_drops_v134(user_id,drop_id,kind,map_key,x,y,payload)
   SELECT p_user_id,'bonus_'||md5(random()::text||clock_timestamp()::text||i::text),'bonus',p_map_key,220+random()*(p_width-440),220+random()*(p_height-440),'{}'::jsonb FROM generate_series(1,greatest(0,p_count-n)) i;
 END IF;
 wanted:=CASE WHEN seasonal THEN p_count/2 ELSE 0 END;
 SELECT count(*) INTO present FROM public.stellar_collection_drops_v134 WHERE user_id=p_user_id AND map_key=p_map_key AND kind='bonus' AND payload->>'variant'='natal';
 IF present<wanted THEN
  UPDATE public.stellar_collection_drops_v134 SET payload=payload||'{"variant":"natal"}'::jsonb WHERE user_id=p_user_id AND drop_id IN
   (SELECT drop_id FROM public.stellar_collection_drops_v134 WHERE user_id=p_user_id AND map_key=p_map_key AND kind='bonus' AND (payload->>'variant') IS DISTINCT FROM 'natal' ORDER BY drop_id LIMIT wanted-present);
 ELSIF present>wanted THEN
  UPDATE public.stellar_collection_drops_v134 SET payload=payload-'variant' WHERE user_id=p_user_id AND drop_id IN
   (SELECT drop_id FROM public.stellar_collection_drops_v134 WHERE user_id=p_user_id AND map_key=p_map_key AND kind='bonus' AND payload->>'variant'='natal' ORDER BY drop_id LIMIT present-wanted);
 END IF;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id',drop_id,'x',x,'y',y,'variant',coalesce(payload->>'variant','bonus'))) FROM
  (SELECT * FROM public.stellar_collection_drops_v134 WHERE user_id=p_user_id AND map_key=p_map_key AND kind='bonus' AND available_at<=clock_timestamp() ORDER BY drop_id LIMIT p_count) boxes),'[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.stellar_player_bonus_ensure(uuid,text,integer,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_player_bonus_ensure(uuid,text,integer,integer,integer) TO service_role;

-- Called only after successful merge/save, inside the same transaction and after replay checks.
CREATE OR REPLACE FUNCTION public.stellar_collection_natal_v142(p_user_id uuid,p_drop_id text,p_map_key text,p_faction text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF p_map_key !~ '^((earth|mars|jupiter):(x[1-8]|u[1-3])|battle:b4[1-3])$' OR NOT EXISTS(SELECT 1 FROM public.stellar_natal_config_v132 WHERE id=1 AND enabled AND starts_at<=clock_timestamp() AND ends_at>clock_timestamp()) THEN RAISE EXCEPTION 'NATAL_COLLECTION_CLOSED';END IF;
 INSERT INTO public.stellar_natal_counts_v132(key,faction,kind) VALUES('box:player:'||p_user_id::text||':'||p_drop_id,p_faction,'box') ON CONFLICT DO NOTHING;
 IF NOT FOUND THEN RAISE EXCEPTION 'NATAL_COLLECTION_ALREADY_COUNTED';END IF;
 INSERT INTO public.stellar_natal_players_v132(user_id,faction,box) VALUES(p_user_id,p_faction,1)
 ON CONFLICT(user_id) DO UPDATE SET faction=excluded.faction,box=public.stellar_natal_players_v132.box+1;
END $$;
REVOKE ALL ON FUNCTION public.stellar_collection_natal_v142(uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_collection_natal_v142(uuid,text,text,text) TO service_role;

DO $patch$
DECLARE d text;anchor text:=$anchor$  IF p_module='collection' THEN
   IF p_payload->'drop_after'$anchor$;
 hook text:=$hook$  IF p_module='collection' THEN
   -- NATAL_COLLECTION_V142: counters, reward, consumption and receipt share this transaction.
   IF drop_row.payload->>'variant'='natal' OR p_payload#>>'{receipt,variant}'='natal' THEN
    IF drop_row.kind<>'bonus' OR (drop_row.payload->>'variant') IS DISTINCT FROM 'natal' OR (p_payload#>>'{receipt,variant}') IS DISTINCT FROM 'natal' THEN RAISE EXCEPTION 'NATAL_COLLECTION_VARIANT_INVALID';END IF;
    PERFORM public.stellar_collection_natal_v142(p_user_id,drop_row.drop_id,drop_row.map_key,coalesce(merged#>>'{profile,faction}','earth'));
   END IF;
   IF p_payload->'drop_after'$hook$;
 old_spawn text:=$old$'{}',clock_timestamp()+make_interval$old$;
 new_spawn text:=$new$CASE WHEN drop_row.payload->>'variant'='natal' THEN '{"variant":"natal"}'::jsonb ELSE '{}'::jsonb END,clock_timestamp()+make_interval$new$;
BEGIN
 d:=pg_get_functiondef('public.stellar_player_commit(uuid,text,text,text,jsonb)'::regprocedure);
 IF position('NATAL_COLLECTION_V142' in d)=0 THEN
  IF position(anchor in d)=0 OR position(old_spawn in d)=0 THEN RAISE EXCEPTION 'V142_COMMIT_VERSION_MISMATCH';END IF;
  d:=replace(d,anchor,hook);d:=replace(d,old_spawn,new_spawn);EXECUTE d;
 END IF;
END $patch$;
NOTIFY pgrst,'reload schema';
COMMIT;
