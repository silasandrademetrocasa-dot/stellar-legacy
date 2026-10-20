-- STELLAR LEGACY V34.6.3 • RELAY COMBAT / MODULE BALANCE / CLAN MISSION PROGRESS
-- Apply only AFTER the matching Render deployment is LIVE.
-- Non-destructive to player saves, clan vault, equipment, missions already claimed and capture history.
BEGIN;
CREATE TABLE IF NOT EXISTS public.stellar_relay_module_balance_v3463 (
 category text NOT NULL CHECK(category IN ('weapon','shield','hp','bonus')),
 attribute text NOT NULL CHECK(attribute IN ('laser','missile','capacitor','regenerator','armor','nanobots','damage','shield','hp','speed','xp','resources')),
 level integer NOT NULL CHECK(level BETWEEN 1 AND 3),
 damage integer NOT NULL DEFAULT 0 CHECK(damage BETWEEN 0 AND 20000),
 cooldown_ms integer NOT NULL DEFAULT 0 CHECK(cooldown_ms BETWEEN 0 AND 10000),
 shield_bonus integer NOT NULL DEFAULT 0 CHECK(shield_bonus BETWEEN 0 AND 500000),
 hp_bonus integer NOT NULL DEFAULT 0 CHECK(hp_bonus BETWEEN 0 AND 500000),
 bonus_pct numeric(5,2) NOT NULL DEFAULT 0 CHECK(bonus_pct BETWEEN 0 AND 25),
 parts integer NOT NULL CHECK(parts BETWEEN 0 AND 250),
 credits bigint NOT NULL CHECK(credits BETWEEN 0 AND 10000000),
 min_clan_level integer NOT NULL CHECK(min_clan_level BETWEEN 1 AND 50),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(category,attribute,level),
 CHECK ((category='weapon' AND attribute IN ('laser','missile')) OR
  (category='shield' AND attribute IN ('capacitor','regenerator')) OR
  (category='hp' AND attribute IN ('armor','nanobots')) OR
  (category='bonus' AND attribute IN ('damage','shield','hp','speed','xp','resources')))
);
INSERT INTO public.stellar_relay_module_balance_v3463(category,attribute,level,damage,cooldown_ms,shield_bonus,hp_bonus,bonus_pct,parts,credits,min_clan_level)
VALUES
('weapon','laser',1,1350,1150,0,0,0,5,0,1),
('weapon','laser',2,2000,1150,0,0,0,12,100000,3),
('weapon','laser',3,2650,1150,0,0,0,25,350000,5),
('weapon','missile',1,2600,3200,0,0,0,5,0,1),
('weapon','missile',2,3600,3200,0,0,0,12,100000,3),
('weapon','missile',3,4600,3200,0,0,0,25,350000,5),
('shield','capacitor',1,0,0,40000,0,0,5,0,1),
('shield','capacitor',2,0,0,80000,0,0,12,100000,3),
('shield','capacitor',3,0,0,120000,0,0,25,350000,5),
('shield','regenerator',1,0,0,40000,0,0,5,0,1),
('shield','regenerator',2,0,0,80000,0,0,12,100000,3),
('shield','regenerator',3,0,0,120000,0,0,25,350000,5),
('hp','armor',1,0,0,0,35000,0,5,0,1),
('hp','armor',2,0,0,0,70000,0,12,100000,3),
('hp','armor',3,0,0,0,105000,0,25,350000,5),
('hp','nanobots',1,0,0,0,35000,0,5,0,1),
('hp','nanobots',2,0,0,0,70000,0,12,100000,3),
('hp','nanobots',3,0,0,0,105000,0,25,350000,5),
('bonus','damage',1,0,0,0,0,3,5,0,1),
('bonus','damage',2,0,0,0,0,4,12,100000,3),
('bonus','damage',3,0,0,0,0,5,25,350000,5),
('bonus','shield',1,0,0,0,0,5,5,0,1),
('bonus','shield',2,0,0,0,0,7,12,100000,3),
('bonus','shield',3,0,0,0,0,9,25,350000,5),
('bonus','hp',1,0,0,0,0,5,5,0,1),
('bonus','hp',2,0,0,0,0,7,12,100000,3),
('bonus','hp',3,0,0,0,0,9,25,350000,5),
('bonus','speed',1,0,0,0,0,2,5,0,1),
('bonus','speed',2,0,0,0,0,3,12,100000,3),
('bonus','speed',3,0,0,0,0,4,25,350000,5),
('bonus','xp',1,0,0,0,0,5,5,0,1),
('bonus','xp',2,0,0,0,0,7,12,100000,3),
('bonus','xp',3,0,0,0,0,10,25,350000,5),
('bonus','resources',1,0,0,0,0,3,5,0,1),
('bonus','resources',2,0,0,0,0,4,12,100000,3),
('bonus','resources',3,0,0,0,0,5,25,350000,5)
ON CONFLICT (category,attribute,level) DO NOTHING;
ALTER TABLE public.stellar_relay_module_balance_v3463 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stellar_relay_module_balance_v3463 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.stellar_relay_module_balance_v3463 TO service_role;

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
  IF NOT ((p_category='bonus' AND p_attribute IN('damage','shield','hp','speed','xp','resources')) OR (p_category='weapon' AND p_attribute IN('laser','missile')) OR (p_category='shield' AND p_attribute IN('capacitor','regenerator')) OR (p_category='hp' AND p_attribute IN('armor','nanobots'))) THEN RAISE EXCEPTION 'INVALID_ATTRIBUTE';END IF;
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
   IF mod.category<>'bonus' AND mod.attribute <> (CASE p_slot WHEN 1 THEN 'laser' WHEN 2 THEN 'missile' WHEN 3 THEN 'capacitor' WHEN 4 THEN 'regenerator' WHEN 5 THEN 'armor' WHEN 6 THEN 'nanobots' ELSE '?' END) THEN RAISE EXCEPTION 'SLOT_SUBTYPE_MISMATCH'; END IF;
   IF NOT EXISTS(SELECT 1 FROM public.stellar_relay_state_v346 s JOIN public.stellar_warfront_nodes n ON n.map_id=s.map_id AND n.node_id=s.node_id WHERE s.map_id=p_map_id AND s.node_id=p_node_id AND s.owner_clan_id=cid) THEN RAISE EXCEPTION 'RELAY_NOT_OWNED';END IF;
   -- Equipar em um slot ocupado faz troca atomica: modulo anterior volta ao inventario.
   UPDATE public.stellar_relay_modules_v346 SET map_id=NULL,node_id=NULL,slot=NULL,updated_at=now()
   WHERE map_id=p_map_id AND node_id=p_node_id AND slot=p_slot AND id<>mod.id AND clan_id=cid;
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
 SELECT b.parts,b.credits,b.min_clan_level INTO need,cost,minimum
 FROM public.stellar_relay_module_balance_v3463 b
 WHERE b.category=coalesce(mod.category,p_category) AND b.attribute=coalesce(mod.attribute,p_attribute) AND b.level=next_level;
 IF NOT FOUND THEN RAISE EXCEPTION 'RELAY_MODULE_BALANCE_MISSING';END IF;
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
CREATE OR REPLACE FUNCTION public.stellar_relay_recompute_v346(p_map_id text,p_node_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE bh bigint;bs bigint;mh bigint;ms bigint;
BEGIN
 SELECT max_hp,max_shield INTO bh,bs FROM public.stellar_relay_rules_v346 WHERE id=1;
 SELECT coalesce(sum(b.hp_bonus),0),coalesce(sum(b.shield_bonus),0) INTO mh,ms
 FROM public.stellar_relay_modules_v346 m
 JOIN public.stellar_relay_module_balance_v3463 b ON b.category=m.category AND b.attribute=m.attribute AND b.level=m.level
 WHERE m.map_id=p_map_id AND m.node_id=p_node_id;
 UPDATE public.stellar_relay_state_v346 SET max_hp=LEAST(3000000,bh+mh),max_shield=LEAST(2000000,bs+ms),
   hp=LEAST(hp,LEAST(3000000,bh+mh)),shield=LEAST(shield,LEAST(2000000,bs+ms)),revision=revision+1,updated_at=now()
 WHERE map_id=p_map_id AND node_id=p_node_id;
END;$fn$;
CREATE OR REPLACE FUNCTION public.stellar_relay_active_bonus_v346(p_user_id uuid,p_map_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE cid uuid;fac text;winner record;faction_all boolean;
BEGIN
 IF auth.role()<>'service_role' OR p_user_id IS NULL THEN RAISE EXCEPTION 'RELAY_BONUS_DENIED';END IF;
 SELECT clan_id INTO cid FROM public.clan_members WHERE user_id=p_user_id;
 SELECT faction INTO fac FROM public.profiles WHERE id=p_user_id;
 SELECT count(*)=9 INTO faction_all FROM public.stellar_warfront_nodes WHERE owner=fac;
 SELECT m.attribute,m.level,
   b.bonus_pct AS value
 INTO winner
 FROM public.stellar_relay_modules_v346 m
 JOIN public.stellar_relay_module_balance_v3463 b ON b.category=m.category AND b.attribute=m.attribute AND b.level=m.level
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
CREATE OR REPLACE FUNCTION public.stellar_relay_damage_v346(p_map_id text,p_node_id text,p_damage integer,p_attacker uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE s public.stellar_relay_state_v346; old_s bigint; actual bigint; rem bigint;
BEGIN
 IF auth.role() <> 'service_role' OR p_attacker IS NULL OR p_damage NOT BETWEEN 1 AND 500000 THEN RAISE EXCEPTION 'RELAY_DAMAGE_DENIED'; END IF;
 SELECT * INTO s FROM public.stellar_relay_state_v346 WHERE map_id=p_map_id AND node_id=p_node_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'RELAY_NOT_FOUND';END IF;
 IF s.protected_until>now() OR s.hp=0 THEN RETURN jsonb_build_object('ok',false,'protected',s.protected_until>now(),'hp',s.hp,'shield',s.shield);END IF;
 old_s:=LEAST(s.shield,p_damage);rem:=p_damage-old_s;actual:=old_s+LEAST(s.hp,rem);
 UPDATE public.stellar_relay_state_v346 SET shield=shield-old_s,hp=hp-LEAST(hp,rem),last_hit_at=now(),revision=revision+1,updated_at=now() WHERE map_id=p_map_id AND node_id=p_node_id RETURNING * INTO s;
 RETURN jsonb_build_object('ok',true,'actual',actual,'hp',s.hp,'shield',s.shield,'revision',s.revision);
END;$fn$;
-- Server-recorded mission progress, exactly the same targets and clock as the claim RPC.
CREATE OR REPLACE FUNCTION public.stellar_relay_mission_progress_v3463()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE uid uuid:=auth.uid();cid uuid;week_date date:=date_trunc('week',now() AT TIME ZONE 'America/Sao_Paulo')::date;
 captures bigint;defenses bigint;hunts bigint; claimed text[];
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
 SELECT clan_id INTO cid FROM public.clan_members WHERE user_id=uid;
 IF cid IS NULL THEN RETURN jsonb_build_object('week',week_date,'capture_week',jsonb_build_object('count',0,'target',2,'claimed',false),'defend_week',jsonb_build_object('count',0,'target',3,'claimed',false),'hunter_week',jsonb_build_object('count',0,'target',100,'claimed',false),'domination_week',jsonb_build_object('count',0,'target',5,'claimed',false));END IF;
 SELECT count(*) FILTER (WHERE kind='capture'),count(*) FILTER (WHERE kind='defense') INTO captures,defenses
 FROM public.stellar_war_actions WHERE clan_id=cid AND kind IN ('capture','defense') AND occurred_at>=(week_date::timestamp AT TIME ZONE 'America/Sao_Paulo');
 SELECT coalesce(npc_kills,0) INTO hunts FROM public.stellar_relay_clan_pve_v346 WHERE clan_id=cid AND period_start=week_date;
 SELECT array_agg(mission_id) INTO claimed FROM public.stellar_relay_mission_claims_v346 WHERE clan_id=cid AND period_start=week_date;
 claimed:=coalesce(claimed,ARRAY[]::text[]);
 RETURN jsonb_build_object('week',week_date,
  'capture_week',jsonb_build_object('count',captures,'target',2,'claimed','capture_week'=ANY(claimed)),
  'defend_week',jsonb_build_object('count',defenses,'target',3,'claimed','defend_week'=ANY(claimed)),
  'hunter_week',jsonb_build_object('count',coalesce(hunts,0),'target',100,'claimed','hunter_week'=ANY(claimed)),
  'domination_week',jsonb_build_object('count',captures,'target',5,'claimed','domination_week'=ANY(claimed)));
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_relay_mission_progress_v3463() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_relay_mission_progress_v3463() TO authenticated;
COMMIT;
