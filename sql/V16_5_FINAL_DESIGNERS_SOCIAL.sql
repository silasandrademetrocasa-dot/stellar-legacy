-- Stellar Legacy V16.5.0 — FINAL DESIGNERS & SOCIAL
-- Já aplicado no projeto Supabase pelo fluxo de release.

CREATE OR REPLACE FUNCTION public.claim_event_designer_v165(p_event_id text,p_event_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','auth'
AS $function$
DECLARE
  v_uid uuid:=auth.uid(); v_cfg public.live_event_config_v16%ROWTYPE;
  v_key text:=lower(btrim(coalesce(p_event_key,''))); v_id text:=btrim(coalesce(p_event_id,''));
  v_match text[]; v_start_ms bigint; v_base_ms bigint; v_repeat_ms bigint; v_duration_ms bigint;
  v_now_ms bigint:=floor(extract(epoch from clock_timestamp())*1000)::bigint; v_claim_key text;
  r record; v_design text:=null; v_qty integer:=1; v_name text:=null; v_rarity text:=null;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sessão inválida.'; END IF;
  v_match:=regexp_match(v_id,'^v16:([a-z0-9_]+):([0-9]{13})$');
  IF v_match IS NULL OR array_length(v_match,1)<2 THEN RAISE EXCEPTION 'Evento inválido.'; END IF;
  IF v_match[1]<>v_key THEN RAISE EXCEPTION 'Evento divergente.'; END IF;
  SELECT * INTO v_cfg FROM public.live_event_config_v16 WHERE event_key=v_key AND enabled=true;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',true,'eligible',false,'design_id',null,'quantity',0); END IF;
  v_start_ms:=v_match[2]::bigint; v_base_ms:=floor(extract(epoch from v_cfg.starts_at)*1000)::bigint;
  v_repeat_ms:=greatest(1,v_cfg.repeat_minutes)::bigint*60000; v_duration_ms:=greatest(1,v_cfg.duration_minutes)::bigint*60000;
  IF v_start_ms<v_base_ms OR mod(v_start_ms-v_base_ms,v_repeat_ms)<>0 OR v_start_ms>v_now_ms+60000 OR v_now_ms>v_start_ms+v_duration_ms+1200000 THEN
    RAISE EXCEPTION 'Janela do evento não é válida.';
  END IF;
  v_claim_key:='event:'||v_id;
  BEGIN
    INSERT INTO public.designer_drop_claims_v16(user_id,claim_key,source_kind,source_ref) VALUES(v_uid,v_claim_key,'event',v_key);
  EXCEPTION WHEN unique_violation THEN
    SELECT c.design_id,d.name,d.rarity INTO v_design,v_name,v_rarity
      FROM public.designer_drop_claims_v16 c LEFT JOIN public.live_designs_v16 d ON d.design_id=c.design_id
      WHERE c.user_id=v_uid AND c.claim_key=v_claim_key;
    RETURN jsonb_build_object('ok',true,'eligible',true,'already_claimed',true,'design_id',v_design,'name',v_name,'rarity',v_rarity,'quantity',case when v_design is null then 0 else 1 end);
  END;
  FOR r IN
    SELECT dr.*,d.name,d.rarity FROM public.live_drop_rules_v16 dr
    JOIN public.live_designs_v16 d ON d.design_id=dr.design_id
    WHERE dr.enabled=true AND d.enabled=true AND dr.source_kind='event' AND dr.source_ref=v_key AND d.kind IN ('ship','pet')
    ORDER BY dr.chance ASC,dr.drop_key
  LOOP
    IF random()<r.chance THEN v_design:=r.design_id;v_name:=r.name;v_rarity:=r.rarity;v_qty:=greatest(1,coalesce((r.metadata->>'qty')::integer,1));EXIT; END IF;
  END LOOP;
  IF v_design IS NOT NULL THEN
    INSERT INTO public.player_design_inventory_v16(user_id,design_id,quantity) VALUES(v_uid,v_design,v_qty)
    ON CONFLICT(user_id,design_id) DO UPDATE SET quantity=public.player_design_inventory_v16.quantity+excluded.quantity,updated_at=now();
    UPDATE public.designer_drop_claims_v16 SET design_id=v_design WHERE user_id=v_uid AND claim_key=v_claim_key;
  END IF;
  RETURN jsonb_build_object('ok',true,'eligible',true,'already_claimed',false,'design_id',v_design,'name',v_name,'rarity',v_rarity,'quantity',case when v_design is null then 0 else v_qty end);
END
$function$;

CREATE OR REPLACE FUNCTION public.set_design_loadout_v16(p_kind text,p_design_id text DEFAULT NULL::text,p_drone_id text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','auth'
AS $function$
DECLARE
  v_uid uuid:=auth.uid();v_design_kind text;v_eligibility jsonb;v_owned integer:=0;v_used integer:=0;
  v_state jsonb;v_ship_id text;v_pet_owned boolean:=false;v_allowed_ship boolean:=false;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sessão inválida.'; END IF;
  p_kind:=lower(btrim(coalesce(p_kind,'')));IF p_kind NOT IN ('ship','pet','drone') THEN RAISE EXCEPTION 'Tipo de design inválido.'; END IF;
  SELECT state INTO v_state FROM public.game_saves WHERE user_id=v_uid;
  v_ship_id:=coalesce(v_state->>'activeShipId','');v_pet_owned:=coalesce((v_state->'pet'->>'owned')::boolean,false);
  v_allowed_ship:=v_ship_id=ANY(ARRAY['leonov','vengeance','goliath','pusat','aegis','basilisk','berserker','centurion','citadel','cyborg','defcom','defcomRaven','diminisher','disruptor','goliathX','hammerclaw','hecate','holo','hyperion','keres','mimesis','orcus','paladin','retiarus','sentinel','solace','solaris','spearhead','spectrum','tartarus','tempest','venom','yamato','yRonin','zephyr']);
  IF p_design_id IS NOT NULL AND btrim(p_design_id)<>'' THEN
    SELECT kind,eligibility INTO v_design_kind,v_eligibility FROM public.live_designs_v16 WHERE design_id=p_design_id AND enabled=true;
    IF v_design_kind IS NULL OR v_design_kind<>p_kind THEN RAISE EXCEPTION 'Design incompatível ou desativado.'; END IF;
    SELECT quantity INTO v_owned FROM public.player_design_inventory_v16 WHERE user_id=v_uid AND design_id=p_design_id;
    IF coalesce(v_owned,0)<=0 THEN RAISE EXCEPTION 'Você não possui esse design.'; END IF;
    IF p_kind='ship' AND (NOT v_allowed_ship OR coalesce((v_eligibility->>'elite_or_event')::boolean,false)=false) THEN RAISE EXCEPTION 'Designer de nave exige nave ELITE ou ESPECIAL DE EVENTO.'; END IF;
    IF p_kind='pet' AND (NOT v_pet_owned OR coalesce((v_eligibility->>'event_only')::boolean,false)=false) THEN RAISE EXCEPTION 'Designer AUX-9 indisponível para este equipamento.'; END IF;
  ELSE p_design_id:=null; END IF;
  IF p_kind='ship' THEN
    INSERT INTO public.player_design_loadout_v16(user_id,ship_design_id) VALUES(v_uid,p_design_id)
    ON CONFLICT(user_id) DO UPDATE SET ship_design_id=excluded.ship_design_id,updated_at=now();
  ELSIF p_kind='pet' THEN
    INSERT INTO public.player_design_loadout_v16(user_id,pet_design_id) VALUES(v_uid,p_design_id)
    ON CONFLICT(user_id) DO UPDATE SET pet_design_id=excluded.pet_design_id,updated_at=now();
  ELSE
    IF coalesce(btrim(p_drone_id),'')='' THEN RAISE EXCEPTION 'Drone não informado.'; END IF;
    IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(v_state->'drones','[]'::jsonb)) d WHERE d->>'id'=p_drone_id) THEN RAISE EXCEPTION 'Drone não pertence ao seu hangar.'; END IF;
    IF p_design_id IS NULL THEN DELETE FROM public.player_drone_designs_v16 WHERE user_id=v_uid AND drone_id=p_drone_id;
    ELSE
      SELECT count(*) INTO v_used FROM public.player_drone_designs_v16 WHERE user_id=v_uid AND design_id=p_design_id AND drone_id<>p_drone_id;
      IF v_used>=v_owned THEN RAISE EXCEPTION 'Todas as cópias desse design já estão equipadas.'; END IF;
      INSERT INTO public.player_drone_designs_v16(user_id,drone_id,design_id) VALUES(v_uid,p_drone_id,p_design_id)
      ON CONFLICT(user_id,drone_id) DO UPDATE SET design_id=excluded.design_id,updated_at=now();
    END IF;
  END IF;
  RETURN public.get_my_designers_v16();
END
$function$;

REVOKE ALL ON FUNCTION public.claim_event_designer_v165(text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.claim_event_designer_v165(text,text) TO authenticated,service_role;
REVOKE EXECUTE ON FUNCTION public.roll_design_drop_v16(text,text,text) FROM anon,authenticated;
