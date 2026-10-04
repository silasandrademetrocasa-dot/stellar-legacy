-- Stellar Legacy V16.3.0 — DRONE DESIGNERS
-- Esta migration já foi aplicada no Supabase do projeto stellar-legacy.

UPDATE public.live_designs_v16
SET name='FURY CORE', rarity='rare', enabled=true,
    visual='{"glow":"#ff5c6c","accent":"#ffb15c","filter":"hue-rotate(330deg) saturate(1.35) contrast(1.08)"}'::jsonb,
    bonuses='{"damage_per_drone":0.015,"full_set_shield":0.08}'::jsonb,
    eligibility='{"max_equipped":8,"set_size":8,"source":"NEXUS"}'::jsonb,
    updated_at=now()
WHERE design_id='drone_fury';

UPDATE public.live_designs_v16
SET name='AEGIS VEIL', rarity='rare', enabled=true,
    visual='{"glow":"#5bdcff","accent":"#80a7ff","filter":"hue-rotate(165deg) saturate(1.25) contrast(1.08)"}'::jsonb,
    bonuses='{"shield_per_drone":0.02,"full_set_hp":0.08}'::jsonb,
    eligibility='{"max_equipped":8,"set_size":8,"source":"ECLIPSE"}'::jsonb,
    updated_at=now()
WHERE design_id='drone_aegis';

UPDATE public.live_designs_v16
SET name='TITAN HYBRID', rarity='mythic', enabled=true,
    visual='{"glow":"#d179ff","accent":"#76ffd8","filter":"hue-rotate(245deg) saturate(1.30) contrast(1.10)"}'::jsonb,
    bonuses='{"hp_per_drone":0.0125,"shield_per_drone":0.0125,"full_set_damage":0.08}'::jsonb,
    eligibility='{"event_only":true,"max_equipped":8,"set_size":8,"source":"EVENTO_ESPECIAL"}'::jsonb,
    updated_at=now()
WHERE design_id='drone_titan';

INSERT INTO public.live_drop_rules_v16(drop_key,source_kind,source_ref,design_id,chance,enabled,metadata,updated_at)
VALUES
('nexus_drone_fury','gate','beta','drone_fury',0.10,true,'{"qty":1,"label":"NEXUS"}'::jsonb,now()),
('eclipse_drone_aegis','gate','gamma','drone_aegis',0.10,true,'{"qty":1,"label":"ECLIPSE"}'::jsonb,now()),
('event_drone_titan','event','future_design_event','drone_titan',0.025,false,'{"qty":1,"reserved":true,"label":"EVENTO ESPECIAL"}'::jsonb,now())
ON CONFLICT(drop_key) DO UPDATE SET
 source_kind=excluded.source_kind, source_ref=excluded.source_ref,
 design_id=excluded.design_id, chance=excluded.chance, enabled=excluded.enabled,
 metadata=excluded.metadata, updated_at=now();

CREATE OR REPLACE FUNCTION public.get_my_designers_v16()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','auth'
AS $function$
DECLARE
  v_uid uuid:=auth.uid();
  v_inventory jsonb;
  v_drones jsonb;
  v_loadout jsonb;
  v_catalog jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sessão inválida.'; END IF;
  SELECT coalesce(jsonb_object_agg(design_id,quantity),'{}'::jsonb)
    INTO v_inventory FROM public.player_design_inventory_v16
    WHERE user_id=v_uid AND quantity>0;
  SELECT coalesce(jsonb_object_agg(drone_id,design_id),'{}'::jsonb)
    INTO v_drones FROM public.player_drone_designs_v16 WHERE user_id=v_uid;
  SELECT jsonb_build_object('ship',ship_design_id,'pet',pet_design_id)
    INTO v_loadout FROM public.player_design_loadout_v16 WHERE user_id=v_uid;
  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'design_id',design_id,'kind',kind,'name',name,'rarity',rarity,
      'visual',visual,'bonuses',bonuses,'ability',ability,'eligibility',eligibility
    ) ORDER BY kind,rarity,name),'[]'::jsonb)
    INTO v_catalog FROM public.live_designs_v16 WHERE enabled=true;
  RETURN jsonb_build_object(
    'inventory',coalesce(v_inventory,'{}'::jsonb),
    'drones',coalesce(v_drones,'{}'::jsonb),
    'loadout',coalesce(v_loadout,'{"ship":null,"pet":null}'::jsonb),
    'catalog',coalesce(v_catalog,'[]'::jsonb)
  );
END
$function$;

CREATE OR REPLACE FUNCTION public.set_design_loadout_v16(
  p_kind text, p_design_id text DEFAULT NULL::text, p_drone_id text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','auth'
AS $function$
DECLARE
  v_uid uuid:=auth.uid();
  v_design_kind text;
  v_owned integer:=0;
  v_used integer:=0;
  v_state jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sessão inválida.'; END IF;
  p_kind:=lower(btrim(coalesce(p_kind,'')));
  IF p_kind NOT IN ('ship','pet','drone') THEN RAISE EXCEPTION 'Tipo de design inválido.'; END IF;
  IF p_design_id IS NOT NULL AND btrim(p_design_id)<>'' THEN
    SELECT kind INTO v_design_kind FROM public.live_designs_v16
      WHERE design_id=p_design_id AND enabled=true;
    IF v_design_kind IS NULL OR v_design_kind<>p_kind THEN RAISE EXCEPTION 'Design incompatível ou desativado.'; END IF;
    SELECT quantity INTO v_owned FROM public.player_design_inventory_v16
      WHERE user_id=v_uid AND design_id=p_design_id;
    IF coalesce(v_owned,0)<=0 THEN RAISE EXCEPTION 'Você não possui esse design.'; END IF;
  ELSE
    p_design_id:=null;
  END IF;
  IF p_kind='ship' THEN
    INSERT INTO public.player_design_loadout_v16(user_id,ship_design_id) VALUES(v_uid,p_design_id)
    ON CONFLICT(user_id) DO UPDATE SET ship_design_id=excluded.ship_design_id,updated_at=now();
  ELSIF p_kind='pet' THEN
    INSERT INTO public.player_design_loadout_v16(user_id,pet_design_id) VALUES(v_uid,p_design_id)
    ON CONFLICT(user_id) DO UPDATE SET pet_design_id=excluded.pet_design_id,updated_at=now();
  ELSE
    IF coalesce(btrim(p_drone_id),'')='' THEN RAISE EXCEPTION 'Drone não informado.'; END IF;
    SELECT state INTO v_state FROM public.game_saves WHERE user_id=v_uid;
    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(coalesce(v_state->'drones','[]'::jsonb)) d
      WHERE d->>'id'=p_drone_id
    ) THEN RAISE EXCEPTION 'Drone não pertence ao seu hangar.'; END IF;
    IF p_design_id IS NULL THEN
      DELETE FROM public.player_drone_designs_v16 WHERE user_id=v_uid AND drone_id=p_drone_id;
    ELSE
      SELECT count(*) INTO v_used FROM public.player_drone_designs_v16
        WHERE user_id=v_uid AND design_id=p_design_id AND drone_id<>p_drone_id;
      IF v_used>=v_owned THEN RAISE EXCEPTION 'Todas as cópias desse design já estão equipadas.'; END IF;
      INSERT INTO public.player_drone_designs_v16(user_id,drone_id,design_id) VALUES(v_uid,p_drone_id,p_design_id)
      ON CONFLICT(user_id,drone_id) DO UPDATE SET design_id=excluded.design_id,updated_at=now();
    END IF;
  END IF;
  RETURN public.get_my_designers_v16();
END
$function$;

CREATE OR REPLACE FUNCTION public.claim_gate_drone_design_v163(p_gate text, p_completion integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','auth'
AS $function$
DECLARE
  v_uid uuid:=auth.uid();
  v_state jsonb;
  v_server_completed integer:=0;
  v_claim_key text;
  r record;
  v_design text:=null;
  v_qty integer:=1;
  v_name text:=null;
  v_rarity text:=null;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sessão inválida.'; END IF;
  p_gate:=lower(btrim(coalesce(p_gate,'')));
  IF p_gate NOT IN ('beta','gamma') THEN
    RETURN jsonb_build_object('ok',true,'eligible',false,'design_id',null,'quantity',0);
  END IF;
  IF coalesce(p_completion,0)<=0 THEN RAISE EXCEPTION 'Conclusão inválida.'; END IF;
  SELECT state INTO v_state FROM public.game_saves WHERE user_id=v_uid;
  v_server_completed:=coalesce((v_state->'galaxyGate'->p_gate->>'completed')::integer,0);
  IF p_completion>v_server_completed THEN RAISE EXCEPTION 'Conclusão ainda não sincronizada com o servidor.'; END IF;
  v_claim_key:='gate:'||p_gate||':'||p_completion;
  BEGIN
    INSERT INTO public.designer_drop_claims_v16(user_id,claim_key,source_kind,source_ref)
      VALUES(v_uid,v_claim_key,'gate',p_gate);
  EXCEPTION WHEN unique_violation THEN
    SELECT c.design_id,d.name,d.rarity INTO v_design,v_name,v_rarity
      FROM public.designer_drop_claims_v16 c
      LEFT JOIN public.live_designs_v16 d ON d.design_id=c.design_id
      WHERE c.user_id=v_uid AND c.claim_key=v_claim_key;
    RETURN jsonb_build_object('ok',true,'eligible',true,'already_claimed',true,
      'design_id',v_design,'name',v_name,'rarity',v_rarity,
      'quantity',case when v_design is null then 0 else 1 end);
  END;
  FOR r IN
    SELECT dr.*,d.name,d.rarity FROM public.live_drop_rules_v16 dr
    JOIN public.live_designs_v16 d ON d.design_id=dr.design_id
    WHERE dr.enabled=true AND d.enabled=true AND dr.source_kind='gate' AND dr.source_ref=p_gate
    ORDER BY dr.chance ASC,dr.drop_key
  LOOP
    IF random() < r.chance THEN
      v_design:=r.design_id; v_name:=r.name; v_rarity:=r.rarity;
      v_qty:=greatest(1,coalesce((r.metadata->>'qty')::integer,1)); EXIT;
    END IF;
  END LOOP;
  IF v_design IS NOT NULL THEN
    INSERT INTO public.player_design_inventory_v16(user_id,design_id,quantity)
      VALUES(v_uid,v_design,v_qty)
    ON CONFLICT(user_id,design_id) DO UPDATE
      SET quantity=public.player_design_inventory_v16.quantity+excluded.quantity,updated_at=now();
    UPDATE public.designer_drop_claims_v16 SET design_id=v_design
      WHERE user_id=v_uid AND claim_key=v_claim_key;
  END IF;
  RETURN jsonb_build_object('ok',true,'eligible',true,'already_claimed',false,
    'design_id',v_design,'name',v_name,'rarity',v_rarity,
    'quantity',case when v_design is null then 0 else v_qty end);
END
$function$;

REVOKE ALL ON FUNCTION public.get_my_designers_v16() FROM public;
REVOKE ALL ON FUNCTION public.set_design_loadout_v16(text,text,text) FROM public;
REVOKE ALL ON FUNCTION public.claim_gate_drone_design_v163(text,integer) FROM public;
GRANT EXECUTE ON FUNCTION public.get_my_designers_v16() TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.set_design_loadout_v16(text,text,text) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.claim_gate_drone_design_v163(text,integer) TO authenticated,service_role;
REVOKE EXECUTE ON FUNCTION public.roll_design_drop_v16(text,text,text) FROM anon,authenticated;
