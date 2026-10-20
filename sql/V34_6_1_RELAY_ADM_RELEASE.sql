-- STELLAR LEGACY — RELAY TARGETING / ADMIN RELEASE HOTFIX
-- Apply AFTER the V34.6.1 server deployment. This is additive and reversible.
-- No player save, credits, clan level, modules or war history are deleted.
BEGIN;
CREATE OR REPLACE FUNCTION public.stellar_relay_admin_release_v3461(
  p_map_id text,p_node_id text,p_clear_faction boolean,p_actor uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE
 st public.stellar_relay_state_v346;
 previous public.stellar_warfront_nodes;
 rules public.stellar_relay_rules_v346;
 modules_returned int;
BEGIN
 IF auth.role()<>'service_role' OR p_actor IS NULL OR p_clear_faction IS NULL
    OR p_map_id NOT IN ('b41','b42','b43') OR p_node_id NOT IN ('A','B','C')
 THEN RAISE EXCEPTION 'RELAY_ADMIN_RELEASE_DENIED'; END IF;
 -- Defense-in-depth: caller is also checked using user's JWT at the HTTP route.
 IF NOT public.is_game_admin_v1763(p_actor) THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
 SELECT * INTO rules FROM public.stellar_relay_rules_v346 WHERE id=1;
 IF NOT FOUND THEN RAISE EXCEPTION 'RELAY_RULES_UNAVAILABLE'; END IF;
 SELECT * INTO st FROM public.stellar_relay_state_v346
 WHERE map_id=p_map_id AND node_id=p_node_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'RELAY_NOT_FOUND'; END IF;
 SELECT * INTO previous FROM public.stellar_warfront_nodes
 WHERE map_id=p_map_id AND node_id=p_node_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'WARFRONT_NOT_FOUND'; END IF;
 -- Inventory retains category, attribute and upgrade level; only slots are unassigned.
 UPDATE public.stellar_relay_modules_v346
 SET map_id=NULL,node_id=NULL,slot=NULL,updated_at=now()
 WHERE map_id=p_map_id AND node_id=p_node_id;
 GET DIAGNOSTICS modules_returned = ROW_COUNT;
 UPDATE public.stellar_relay_state_v346 SET
   owner_clan_id=NULL,
   max_hp=rules.max_hp,max_shield=rules.max_shield,
   hp=rules.max_hp,shield=rules.max_shield,
   protected_until=NULL,last_hit_at=NULL,
   revision=revision+1,updated_at=now()
 WHERE map_id=p_map_id AND node_id=p_node_id;
 IF p_clear_faction THEN
   UPDATE public.stellar_warfront_nodes SET
     owner=NULL,captured_by=NULL,captured_at=NULL,revision=revision+1
   WHERE map_id=p_map_id AND node_id=p_node_id;
 END IF;
 INSERT INTO public.stellar_relay_audit_v346
   (actor,clan_id,action,map_id,node_id,details)
 VALUES (p_actor,st.owner_clan_id,'admin_release',p_map_id,p_node_id,
   jsonb_build_object('clear_faction',p_clear_faction,'previous_faction',previous.owner,
     'previous_clan',st.owner_clan_id,'modules_returned',modules_returned));
 RETURN jsonb_build_object('ok',true,'map_id',p_map_id,'node_id',p_node_id,
   'faction_released',p_clear_faction,'modules_returned',modules_returned);
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_relay_admin_release_v3461(text,text,boolean,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_relay_admin_release_v3461(text,text,boolean,uuid) TO service_role;
COMMIT;
