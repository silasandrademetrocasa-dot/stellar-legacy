-- Restore pre-expansion functions; preserves any saved module-balance rows.
BEGIN;
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
COMMIT;
