-- STELLAR LEGACY V34.6.0 — RELAY DOMINATION. Apply AFTER Render is LIVE on v34.6.0.
-- Does not remove existing sector history, saves, economy, campaigns or weekend events.
BEGIN;
CREATE TABLE IF NOT EXISTS public.stellar_relay_rules_v346 (
 id integer PRIMARY KEY DEFAULT 1 CHECK(id=1), enabled boolean NOT NULL DEFAULT true,
 max_shield bigint NOT NULL DEFAULT 240000 CHECK(max_shield BETWEEN 10000 AND 2000000),
 max_hp bigint NOT NULL DEFAULT 360000 CHECK(max_hp BETWEEN 10000 AND 3000000),
 hit_damage int NOT NULL DEFAULT 12000 CHECK(hit_damage BETWEEN 100 AND 50000),
 hit_cooldown_ms int NOT NULL DEFAULT 650 CHECK(hit_cooldown_ms BETWEEN 400 AND 3000),
 capture_ms int NOT NULL DEFAULT 8000 CHECK(capture_ms BETWEEN 5000 AND 60000),
 protection_ms int NOT NULL DEFAULT 90000 CHECK(protection_ms BETWEEN 10000 AND 180000),
 weekend_multiplier numeric(4,2) NOT NULL DEFAULT 1.2 CHECK(weekend_multiplier BETWEEN 1 AND 2),
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.stellar_relay_rules_v346(id) VALUES(1) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS public.stellar_relay_state_v346 (
 map_id text NOT NULL, node_id text NOT NULL,
 owner_clan_id uuid REFERENCES public.clans(id) ON DELETE SET NULL,
 hp bigint NOT NULL DEFAULT 360000 CHECK(hp BETWEEN 0 AND 3000000),
 shield bigint NOT NULL DEFAULT 240000 CHECK(shield BETWEEN 0 AND 2000000),
 max_hp bigint NOT NULL DEFAULT 360000 CHECK(max_hp BETWEEN 10000 AND 3000000),
 max_shield bigint NOT NULL DEFAULT 240000 CHECK(max_shield BETWEEN 10000 AND 2000000),
 protected_until timestamptz, last_hit_at timestamptz, revision bigint NOT NULL DEFAULT 0 CHECK(revision>=0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(map_id,node_id),
 FOREIGN KEY(map_id,node_id) REFERENCES public.stellar_warfront_nodes(map_id,node_id) ON DELETE CASCADE,
 CHECK (hp<=max_hp AND shield<=max_shield)
);
INSERT INTO public.stellar_relay_state_v346(map_id,node_id)
 SELECT map_id,node_id FROM public.stellar_warfront_nodes ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS public.stellar_relay_clan_parts_v346 (
 clan_id uuid NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
 part_type text NOT NULL CHECK(part_type IN('weapon_parts','shield_parts','hull_parts','circuit_parts')),
 quantity int NOT NULL DEFAULT 0 CHECK(quantity BETWEEN 0 AND 1000000),
 PRIMARY KEY(clan_id,part_type)
);
CREATE TABLE IF NOT EXISTS public.stellar_relay_modules_v346 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 clan_id uuid NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
 category text NOT NULL CHECK(category IN('weapon','shield','hp','bonus')),
 attribute text NOT NULL CHECK(attribute IN('weapon','shield','hp','damage','speed','xp','resources')),
 level int NOT NULL DEFAULT 1 CHECK(level BETWEEN 1 AND 3),
 map_id text, node_id text, slot smallint,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((category='bonus' AND attribute IN('damage','shield','hp','speed','xp','resources')) OR
 (category<>'bonus' AND category=attribute)),
 CHECK ((map_id IS NULL AND node_id IS NULL AND slot IS NULL) OR
   (map_id IN('b41','b42','b43') AND node_id IN('A','B','C') AND slot BETWEEN 1 AND 8)),
 CHECK (slot IS NULL OR
  (category='weapon' AND slot IN(1,2)) OR
  (category='shield' AND slot IN(3,4)) OR
  (category='hp' AND slot IN(5,6)) OR
  (category='bonus' AND slot IN(7,8))),
 FOREIGN KEY(map_id,node_id) REFERENCES public.stellar_relay_state_v346(map_id,node_id) ON DELETE RESTRICT
);
-- No duplicate slot and, crucially, no two bonus modules with the same attribute on the same relay.
CREATE UNIQUE INDEX IF NOT EXISTS stellar_relay_slot_unique_v346 ON public.stellar_relay_modules_v346(map_id,node_id,slot) WHERE map_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS stellar_relay_bonus_unique_v346 ON public.stellar_relay_modules_v346(map_id,node_id,attribute) WHERE map_id IS NOT NULL AND category='bonus';
CREATE TABLE IF NOT EXISTS public.stellar_relay_mission_claims_v346 (
 clan_id uuid NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
 mission_id text NOT NULL CHECK(mission_id IN ('capture_week','defend_week','hunter_week','domination_week')),
 period_start date NOT NULL,
 actor uuid NOT NULL REFERENCES auth.users(id),
 claimed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(clan_id,mission_id,period_start)
);
CREATE TABLE IF NOT EXISTS public.stellar_relay_audit_v346 (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor uuid, clan_id uuid, action text NOT NULL,
 module_id uuid, map_id text, node_id text, details jsonb NOT NULL DEFAULT '{}'::jsonb,
 at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stellar_relay_audit_recent_v346 ON public.stellar_relay_audit_v346(at DESC);
DO $$DECLARE t text;BEGIN FOREACH t IN ARRAY ARRAY['stellar_relay_rules_v346','stellar_relay_state_v346','stellar_relay_clan_parts_v346','stellar_relay_modules_v346','stellar_relay_mission_claims_v346','stellar_relay_audit_v346'] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC,anon,authenticated',t);
 EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role',t);
 END LOOP; END$$;
GRANT USAGE,SELECT ON SEQUENCE public.stellar_relay_audit_v346_id_seq TO service_role;
-- Recompute structural module strength after equip, remove, upgrade or conquest.
CREATE OR REPLACE FUNCTION public.stellar_relay_recompute_v346(p_map_id text,p_node_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE bh bigint;bs bigint;mh bigint;ms bigint;
BEGIN
 SELECT max_hp,max_shield INTO bh,bs FROM public.stellar_relay_rules_v346 WHERE id=1;
 SELECT coalesce(sum(CASE WHEN category='hp' THEN level*35000 ELSE 0 END),0),coalesce(sum(CASE WHEN category='shield' THEN level*40000 ELSE 0 END),0)
 INTO mh,ms FROM public.stellar_relay_modules_v346 WHERE map_id=p_map_id AND node_id=p_node_id;
 UPDATE public.stellar_relay_state_v346 SET max_hp=LEAST(3000000,bh+mh),max_shield=LEAST(2000000,bs+ms),
   hp=LEAST(hp,LEAST(3000000,bh+mh)),shield=LEAST(shield,LEAST(2000000,bs+ms)),revision=revision+1,updated_at=now()
 WHERE map_id=p_map_id AND node_id=p_node_id;
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_relay_recompute_v346(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_relay_recompute_v346(text,text) TO service_role;
-- Atomic authenticated crafting/equip/upgrade. Only clan owner spends resources.
CREATE OR REPLACE FUNCTION public.stellar_relay_module_action_v346(p_action text,p_module_id uuid DEFAULT NULL,p_category text DEFAULT NULL,p_attribute text DEFAULT NULL,p_map_id text DEFAULT NULL,p_node_id text DEFAULT NULL,p_slot int DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE uid uuid:=auth.uid(); cid uuid; cl public.clans; mod public.stellar_relay_modules_v346; part text;cost bigint;need int;minimum int;next_level int; ident uuid;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED';END IF;
 SELECT c.* INTO cl FROM public.clans c WHERE c.owner_id=uid ORDER BY c.created_at LIMIT 1 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'ONLY_CLAN_OWNER';END IF;
 cid:=cl.id;
 IF p_action='craft' THEN
  IF p_category NOT IN('weapon','shield','hp','bonus') THEN RAISE EXCEPTION 'INVALID_CATEGORY';END IF;
  IF NOT ((p_category='bonus' AND p_attribute IN('damage','shield','hp','speed','xp','resources')) OR (p_category<>'bonus' AND p_attribute=p_category)) THEN RAISE EXCEPTION 'INVALID_ATTRIBUTE';END IF;
  next_level:=1;
 ELSE
  SELECT * INTO mod FROM public.stellar_relay_modules_v346 WHERE id=p_module_id AND clan_id=cid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'MODULE_NOT_OWNED';END IF;
  IF p_action='upgrade' THEN
   IF mod.level>=3 THEN RAISE EXCEPTION 'MAX_LEVEL';END IF;
   next_level:=mod.level+1;
  ELSIF p_action='equip' THEN
   IF p_map_id NOT IN('b41','b42','b43') OR p_node_id NOT IN('A','B','C') OR p_slot NOT BETWEEN 1 AND 8 THEN RAISE EXCEPTION 'INVALID_RELAY_OR_SLOT';END IF;
   IF NOT ((mod.category='weapon' AND p_slot IN(1,2)) OR (mod.category='shield' AND p_slot IN(3,4)) OR (mod.category='hp' AND p_slot IN(5,6)) OR (mod.category='bonus' AND p_slot IN(7,8))) THEN RAISE EXCEPTION 'SLOT_CATEGORY_MISMATCH'; END IF;
   IF NOT EXISTS(SELECT 1 FROM public.stellar_relay_state_v346 s JOIN public.stellar_warfront_nodes n ON n.map_id=s.map_id AND n.node_id=s.node_id WHERE s.map_id=p_map_id AND s.node_id=p_node_id AND s.owner_clan_id=cid) THEN RAISE EXCEPTION 'RELAY_NOT_OWNED';END IF;
   UPDATE public.stellar_relay_modules_v346 SET map_id=p_map_id,node_id=p_node_id,slot=p_slot,updated_at=now() WHERE id=mod.id;
   PERFORM public.stellar_relay_recompute_v346(p_map_id,p_node_id);
   IF mod.map_id IS NOT NULL AND (mod.map_id IS DISTINCT FROM p_map_id OR mod.node_id IS DISTINCT FROM p_node_id) THEN PERFORM public.stellar_relay_recompute_v346(mod.map_id,mod.node_id);END IF;
   INSERT INTO public.stellar_relay_audit_v346(actor,clan_id,action,module_id,map_id,node_id) VALUES(uid,cid,'equip',mod.id,p_map_id,p_node_id);
   RETURN jsonb_build_object('ok',true,'action','equip','id',mod.id);
  ELSIF p_action='unequip' THEN
   UPDATE public.stellar_relay_modules_v346 SET map_id=NULL,node_id=NULL,slot=NULL,updated_at=now() WHERE id=mod.id;
   IF mod.map_id IS NOT NULL THEN PERFORM public.stellar_relay_recompute_v346(mod.map_id,mod.node_id);END IF;
   INSERT INTO public.stellar_relay_audit_v346(actor,clan_id,action,module_id) VALUES(uid,cid,'unequip',mod.id);
   RETURN jsonb_build_object('ok',true,'action','unequip','id',mod.id);
  ELSE RAISE EXCEPTION 'INVALID_ACTION';END IF;
 END IF;
 part:=CASE WHEN coalesce(mod.category,p_category)='weapon' THEN 'weapon_parts' WHEN coalesce(mod.category,p_category)='shield' THEN 'shield_parts' WHEN coalesce(mod.category,p_category)='hp' THEN 'hull_parts' ELSE 'circuit_parts' END;
 need:=CASE next_level WHEN 1 THEN 5 WHEN 2 THEN 12 ELSE 25 END;
 cost:=CASE next_level WHEN 1 THEN 0 WHEN 2 THEN 100000 ELSE 350000 END;
 minimum:=CASE next_level WHEN 1 THEN 1 WHEN 2 THEN 3 ELSE 5 END;
 IF cl.level<minimum THEN RAISE EXCEPTION 'CLAN_LEVEL_REQUIRED_%',minimum;END IF;
 UPDATE public.stellar_relay_clan_parts_v346 SET quantity=quantity-need WHERE clan_id=cid AND part_type=part AND quantity>=need;
 IF NOT FOUND THEN RAISE EXCEPTION 'INSUFFICIENT_RELAY_PARTS';END IF;
 IF cost>0 THEN
  UPDATE public.clans SET vault_credits=vault_credits-cost WHERE id=cid AND vault_credits>=cost;
  IF NOT FOUND THEN RAISE EXCEPTION 'INSUFFICIENT_CLAN_VAULT';END IF;
 END IF;
 IF p_action='craft' THEN
  INSERT INTO public.stellar_relay_modules_v346(clan_id,category,attribute) VALUES(cid,p_category,p_attribute) RETURNING id INTO ident;
 ELSE
  UPDATE public.stellar_relay_modules_v346 SET level=next_level,updated_at=now() WHERE id=mod.id;ident:=mod.id;
  IF mod.map_id IS NOT NULL THEN PERFORM public.stellar_relay_recompute_v346(mod.map_id,mod.node_id);END IF;
 END IF;
 INSERT INTO public.stellar_relay_audit_v346(actor,clan_id,action,module_id,details) VALUES(uid,cid,p_action,ident,jsonb_build_object('level',next_level,'parts',need,'credits',cost));
 RETURN jsonb_build_object('ok',true,'id',ident,'level',next_level,'parts_used',need,'vault_spent',cost);
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_relay_module_action_v346(text,uuid,text,text,text,text,int) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_relay_module_action_v346(text,uuid,text,text,text,text,int) TO authenticated;
-- Server only damage. Never trust client-supplied damage or tick timing.
CREATE OR REPLACE FUNCTION public.stellar_relay_damage_v346(p_map_id text,p_node_id text,p_damage integer,p_attacker uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE s public.stellar_relay_state_v346; old_s bigint; actual bigint; rem bigint;
BEGIN
 IF auth.role() <> 'service_role' OR p_attacker IS NULL OR p_damage NOT BETWEEN 1 AND 50000 THEN RAISE EXCEPTION 'RELAY_DAMAGE_DENIED'; END IF;
 SELECT * INTO s FROM public.stellar_relay_state_v346 WHERE map_id=p_map_id AND node_id=p_node_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'RELAY_NOT_FOUND';END IF;
 IF s.protected_until>now() OR s.hp=0 THEN RETURN jsonb_build_object('ok',false,'protected',s.protected_until>now(),'hp',s.hp,'shield',s.shield);END IF;
 old_s:=LEAST(s.shield,p_damage);rem:=p_damage-old_s;actual:=old_s+LEAST(s.hp,rem);
 UPDATE public.stellar_relay_state_v346 SET shield=shield-old_s,hp=hp-LEAST(hp,rem),last_hit_at=now(),revision=revision+1,updated_at=now() WHERE map_id=p_map_id AND node_id=p_node_id RETURNING * INTO s;
 RETURN jsonb_build_object('ok',true,'actual',actual,'hp',s.hp,'shield',s.shield,'revision',s.revision);
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_relay_damage_v346(text,text,integer,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_relay_damage_v346(text,text,integer,uuid) TO service_role;
-- Capture is committed atomically with legacy ownership, ranking and modular unmount.
CREATE OR REPLACE FUNCTION public.stellar_relay_capture_v346(p_map_id text,p_node_id text,p_faction text,p_expected_revision bigint,p_actor uuid)
RETURNS public.stellar_warfront_nodes LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE st public.stellar_relay_state_v346; roww public.stellar_warfront_nodes;cid uuid; old_owner text;campaign uuid;points integer;
BEGIN
 IF auth.role()<>'service_role' OR p_actor IS NULL OR p_faction NOT IN('earth','mars','jupiter') THEN RAISE EXCEPTION 'RELAY_CAPTURE_DENIED';END IF;
 SELECT clan_id INTO cid FROM public.clan_members WHERE user_id=p_actor;
 IF cid IS NULL THEN RAISE EXCEPTION 'CLAN_REQUIRED';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_actor AND faction=p_faction) THEN RAISE EXCEPTION 'FACTION_MISMATCH';END IF;
 SELECT * INTO st FROM public.stellar_relay_state_v346 WHERE map_id=p_map_id AND node_id=p_node_id FOR UPDATE;
 IF NOT FOUND OR st.hp>0 OR st.protected_until>now() THEN RAISE EXCEPTION 'RELAY_NOT_VULNERABLE';END IF;
 SELECT * INTO roww FROM public.stellar_warfront_nodes WHERE map_id=p_map_id AND node_id=p_node_id FOR UPDATE;
 IF NOT FOUND OR roww.revision<>p_expected_revision THEN RAISE EXCEPTION 'WARFRONT_REVISION_CONFLICT';END IF;
 IF st.owner_clan_id=cid THEN RAISE EXCEPTION 'ALREADY_OWNED';END IF;
 old_owner:=roww.owner;
 UPDATE public.stellar_warfront_nodes SET owner=p_faction,captured_at=now(),captured_by=p_actor,revision=revision+1 WHERE map_id=p_map_id AND node_id=p_node_id RETURNING * INTO roww;
 -- Previous clan does not lose upgrades: modules safely return to inventory.
 UPDATE public.stellar_relay_modules_v346 SET map_id=NULL,node_id=NULL,slot=NULL,updated_at=now() WHERE map_id=p_map_id AND node_id=p_node_id;
 UPDATE public.stellar_relay_state_v346 SET owner_clan_id=cid,
  max_hp=(SELECT max_hp FROM public.stellar_relay_rules_v346 WHERE id=1),max_shield=(SELECT max_shield FROM public.stellar_relay_rules_v346 WHERE id=1),
  hp=(SELECT max_hp FROM public.stellar_relay_rules_v346 WHERE id=1),shield=(SELECT max_shield FROM public.stellar_relay_rules_v346 WHERE id=1),
  protected_until=now()+((SELECT protection_ms FROM public.stellar_relay_rules_v346 WHERE id=1)*interval '1 millisecond'),revision=revision+1,updated_at=now() WHERE map_id=p_map_id AND node_id=p_node_id;
 SELECT id INTO campaign FROM public.stellar_war_campaigns WHERE enabled AND now()>=starts_at AND now()<ends_at ORDER BY starts_at DESC LIMIT 1;
 SELECT capture_points INTO points FROM public.stellar_war_rules WHERE id=1; points:=coalesce(points,10);
 IF EXTRACT(ISODOW FROM (now() AT TIME ZONE 'America/Sao_Paulo')) IN (6,7) THEN
  points:=floor(points*(SELECT weekend_multiplier FROM public.stellar_relay_rules_v346 WHERE id=1))::int;
 END IF;
 INSERT INTO public.stellar_war_actions(campaign_id,kind,map_id,node_id,faction,former_owner,actor_user_id,points,clan_id) VALUES(campaign,'capture',p_map_id,p_node_id,p_faction,old_owner,p_actor,CASE WHEN campaign IS NULL THEN 0 ELSE points END,cid);
 IF campaign IS NOT NULL THEN
  INSERT INTO public.stellar_war_scores(campaign_id,user_id,faction,captures,points,clan_id) VALUES(campaign,p_actor,p_faction,1,points,cid)
  ON CONFLICT(campaign_id,user_id) DO UPDATE SET captures=public.stellar_war_scores.captures+1,points=public.stellar_war_scores.points+EXCLUDED.points,updated_at=now();
 END IF;
 INSERT INTO public.stellar_relay_audit_v346(actor,clan_id,action,map_id,node_id,details) VALUES(p_actor,cid,'capture',p_map_id,p_node_id,jsonb_build_object('faction',p_faction,'previous_faction',old_owner));
 RETURN roww;
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_relay_capture_v346(text,text,text,bigint,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_relay_capture_v346(text,text,text,bigint,uuid) TO service_role;
-- Server-verified PvE contribution, weekly per clan with event de-duplication.
CREATE TABLE IF NOT EXISTS public.stellar_relay_clan_pve_v346 (
 clan_id uuid NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
 period_start date NOT NULL, npc_kills bigint NOT NULL DEFAULT 0 CHECK(npc_kills>=0),
 ore_collections bigint NOT NULL DEFAULT 0 CHECK(ore_collections>=0),
 PRIMARY KEY(clan_id,period_start)
);
CREATE TABLE IF NOT EXISTS public.stellar_relay_pve_events_v346 (
 event_key text PRIMARY KEY CHECK(length(event_key) BETWEEN 8 AND 180),
 actor uuid NOT NULL REFERENCES auth.users(id),
 recorded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stellar_relay_clan_pve_v346 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stellar_relay_pve_events_v346 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.stellar_relay_clan_pve_v346,public.stellar_relay_pve_events_v346 FROM PUBLIC,anon,authenticated;
GRANT ALL ON TABLE public.stellar_relay_clan_pve_v346,public.stellar_relay_pve_events_v346 TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_relay_record_pve_v346(p_user_id uuid,p_event_key text,p_kind text)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE cid uuid;start_date date:=(date_trunc('week',now() AT TIME ZONE 'America/Sao_Paulo'))::date;
BEGIN
 IF auth.role()<>'service_role' OR p_user_id IS NULL OR length(p_event_key) NOT BETWEEN 8 AND 180 OR p_kind NOT IN ('npc','ore') THEN RAISE EXCEPTION 'RELAY_PVE_DENIED'; END IF;
 SELECT clan_id INTO cid FROM public.clan_members WHERE user_id=p_user_id;
 IF cid IS NULL THEN RETURN false;END IF;
 INSERT INTO public.stellar_relay_pve_events_v346(event_key,actor) VALUES(p_event_key,p_user_id) ON CONFLICT DO NOTHING;
 IF NOT FOUND THEN RETURN false;END IF;
 INSERT INTO public.stellar_relay_clan_pve_v346(clan_id,period_start,npc_kills,ore_collections) VALUES(cid,start_date,CASE WHEN p_kind='npc' THEN 1 ELSE 0 END,CASE WHEN p_kind='ore' THEN 1 ELSE 0 END)
 ON CONFLICT(clan_id,period_start) DO UPDATE SET npc_kills=public.stellar_relay_clan_pve_v346.npc_kills+EXCLUDED.npc_kills,ore_collections=public.stellar_relay_clan_pve_v346.ore_collections+EXCLUDED.ore_collections;
 RETURN true;
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_relay_record_pve_v346(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_relay_record_pve_v346(uuid,text,text) TO service_role;
-- Offline-combat repairs; only the leader of the owning clan may spend its vault.
CREATE OR REPLACE FUNCTION public.stellar_relay_repair_v346(p_map_id text,p_node_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE uid uuid:=auth.uid(); cid uuid;s public.stellar_relay_state_v346;cost bigint:=3000;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED';END IF;
 SELECT id INTO cid FROM public.clans WHERE owner_id=uid FOR UPDATE;
 IF cid IS NULL THEN RAISE EXCEPTION 'ONLY_CLAN_OWNER';END IF;
 SELECT * INTO s FROM public.stellar_relay_state_v346 WHERE map_id=p_map_id AND node_id=p_node_id FOR UPDATE;
 IF NOT FOUND OR s.owner_clan_id IS DISTINCT FROM cid THEN RAISE EXCEPTION 'RELAY_NOT_OWNED';END IF;
 IF s.last_hit_at>now()-interval '15 seconds' THEN RAISE EXCEPTION 'RELAY_IN_COMBAT';END IF;
 IF s.hp>=s.max_hp AND s.shield>=s.max_shield THEN RAISE EXCEPTION 'RELAY_FULL';END IF;
 UPDATE public.clans SET vault_credits=vault_credits-cost WHERE id=cid AND vault_credits>=cost;
 IF NOT FOUND THEN RAISE EXCEPTION 'INSUFFICIENT_CLAN_VAULT';END IF;
 UPDATE public.stellar_relay_state_v346 SET hp=LEAST(max_hp,hp+100000),shield=LEAST(max_shield,shield+100000),revision=revision+1,updated_at=now()
 WHERE map_id=p_map_id AND node_id=p_node_id RETURNING * INTO s;
 INSERT INTO public.stellar_relay_audit_v346(actor,clan_id,action,map_id,node_id,details) VALUES(uid,cid,'repair',p_map_id,p_node_id,jsonb_build_object('credits',cost));
 RETURN jsonb_build_object('ok',true,'hp',s.hp,'shield',s.shield,'cost',cost);
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_relay_repair_v346(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_relay_repair_v346(text,text) TO authenticated;
-- Read-only active bonus selection for server-authoritative rewards (one best attribute total).
CREATE OR REPLACE FUNCTION public.stellar_relay_active_bonus_v346(p_user_id uuid,p_map_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE cid uuid;fac text;winner record;faction_all boolean;
BEGIN
 IF auth.role()<>'service_role' OR p_user_id IS NULL THEN RAISE EXCEPTION 'RELAY_BONUS_DENIED';END IF;
 SELECT clan_id INTO cid FROM public.clan_members WHERE user_id=p_user_id;
 SELECT faction INTO fac FROM public.profiles WHERE id=p_user_id;
 SELECT count(*)=9 INTO faction_all FROM public.stellar_warfront_nodes WHERE owner=fac;
 SELECT m.attribute,m.level,
   CASE m.attribute
     WHEN 'damage' THEN (ARRAY[3,4,5])[m.level]
     WHEN 'shield' THEN (ARRAY[5,7,9])[m.level]
     WHEN 'hp' THEN (ARRAY[5,7,9])[m.level]
     WHEN 'speed' THEN (ARRAY[2,3,4])[m.level]
     WHEN 'xp' THEN (ARRAY[5,7,10])[m.level]
     WHEN 'resources' THEN (ARRAY[3,4,5])[m.level] END AS value
 INTO winner
 FROM public.stellar_relay_modules_v346 m
 JOIN public.stellar_relay_state_v346 s ON s.map_id=m.map_id AND s.node_id=m.node_id
 JOIN public.stellar_warfront_nodes n ON n.map_id=s.map_id AND n.node_id=s.node_id
 WHERE m.category='bonus' AND
   ((cid IS NOT NULL AND s.owner_clan_id=cid AND (
       s.map_id=p_map_id OR
       (SELECT count(*) FROM public.stellar_relay_state_v346 sc WHERE sc.map_id=s.map_id AND sc.owner_clan_id=cid)=3
   )) OR (faction_all AND n.owner=fac))
 ORDER BY m.level DESC,value DESC,m.attribute ASC LIMIT 1;
 IF winner IS NULL THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('attribute',winner.attribute,'level',winner.level,'value',winner.value);
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_relay_active_bonus_v346(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_relay_active_bonus_v346(uuid,text) TO service_role;
-- Free mission parts, each once weekly; progress verified against server-recorded records.
CREATE OR REPLACE FUNCTION public.stellar_relay_claim_mission_v346(p_mission_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE uid uuid:=auth.uid();cid uuid;counted bigint;pt text;reward int;start_date date:=(date_trunc('week',now() AT TIME ZONE 'America/Sao_Paulo'))::date;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED';END IF;
 SELECT id INTO cid FROM public.clans WHERE owner_id=uid;
 IF cid IS NULL THEN RAISE EXCEPTION 'ONLY_CLAN_OWNER';END IF;
 IF p_mission_id='capture_week' THEN
  SELECT count(*) INTO counted FROM public.stellar_war_actions WHERE clan_id=cid AND kind='capture' AND occurred_at >= (start_date::timestamp AT TIME ZONE 'America/Sao_Paulo');pt:='weapon_parts';reward:=5;
 ELSIF p_mission_id='defend_week' THEN
  SELECT count(*) INTO counted FROM public.stellar_war_actions WHERE clan_id=cid AND kind='defense' AND occurred_at >= (start_date::timestamp AT TIME ZONE 'America/Sao_Paulo');pt:='shield_parts';reward:=5;
 ELSIF p_mission_id='hunter_week' THEN
  SELECT coalesce(sum(e.npc_kills),0) INTO counted FROM public.stellar_relay_clan_pve_v346 e WHERE e.clan_id=cid AND e.period_start=start_date;pt:='hull_parts';reward:=5;
 ELSIF p_mission_id='domination_week' THEN
  SELECT count(*) INTO counted FROM public.stellar_war_actions WHERE clan_id=cid AND kind='capture' AND occurred_at >= (start_date::timestamp AT TIME ZONE 'America/Sao_Paulo');pt:='circuit_parts';reward:=5;
 ELSE RAISE EXCEPTION 'UNKNOWN_MISSION';END IF;
 IF counted<(CASE p_mission_id WHEN 'capture_week' THEN 2 WHEN 'defend_week' THEN 3 WHEN 'domination_week' THEN 5 ELSE 100 END) THEN RAISE EXCEPTION 'MISSION_NOT_COMPLETE';END IF;
 INSERT INTO public.stellar_relay_mission_claims_v346(clan_id,mission_id,period_start,actor) VALUES(cid,p_mission_id,start_date,uid);
 INSERT INTO public.stellar_relay_clan_parts_v346(clan_id,part_type,quantity) VALUES(cid,pt,reward)
 ON CONFLICT(clan_id,part_type) DO UPDATE SET quantity=public.stellar_relay_clan_parts_v346.quantity+EXCLUDED.quantity;
 INSERT INTO public.stellar_relay_audit_v346(actor,clan_id,action,details) VALUES(uid,cid,'mission',jsonb_build_object('mission',p_mission_id,'parts',reward));
 RETURN jsonb_build_object('ok',true,'mission',p_mission_id,'parts',reward,'part_type',pt);
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_relay_claim_mission_v346(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_relay_claim_mission_v346(text) TO authenticated;
COMMIT;
