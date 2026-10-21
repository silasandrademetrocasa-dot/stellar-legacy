BEGIN;
-- Integração ADITIVA. Nenhum save, saldo, item ou equipamento é modificado.
-- Bônus permanecem DESATIVADOS até homologação manual pelo ADM.
DO $$ BEGIN
 IF to_regclass('public.stellar_u423_loadouts') IS NULL
 OR to_regclass('public.stellar_u423_module_rules') IS NULL
 OR to_regclass('public.stellar_u42_inventory') IS NULL
 THEN RAISE EXCEPTION 'REQUIRES_V42_3_LOADOUTS'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.stellar_u431_combat_profile(p_user uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $$
DECLARE active_config integer:=1; buff numeric:=0; item_count integer:=0;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN
  RAISE EXCEPTION 'SERVICE_ONLY' USING ERRCODE='42501';
 END IF;
 SELECT coalesce(nullif(state #>> '{combatConfigsV2013,active}','')::integer,1)
 INTO active_config FROM public.game_saves WHERE user_id=p_user;
 active_config:=CASE WHEN active_config=2 THEN 2 ELSE 1 END;
 SELECT coalesce(i.quantity,0),
        CASE WHEN m.combat_enabled IS TRUE THEN least(4,greatest(0,coalesce((m.proposed_bonus->>'npcDamagePercent')::numeric,0))) ELSE 0 END
 INTO item_count,buff
 FROM public.stellar_u423_loadouts l
 JOIN public.stellar_u423_module_rules m ON m.item=l.item AND m.slot=l.slot
 LEFT JOIN public.stellar_u42_inventory i ON i.user_id=l.user_id AND i.item=l.item
 WHERE l.user_id=p_user AND l.config=active_config AND l.slot='weapon' AND l.item='eclipse_lance'
 LIMIT 1;
 IF item_count<1 OR item_count IS NULL THEN buff:=0; END IF;
 RETURN jsonb_build_object('enabled',coalesce(buff,0)>0,'npcDamagePercent',coalesce(buff,0),'activeConfig',active_config);
END; $$;
REVOKE ALL ON FUNCTION public.stellar_u431_combat_profile(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_u431_combat_profile(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.stellar_u431_admin_weapon(p_enabled boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_game_admin_v1763(auth.uid()) THEN
  RAISE EXCEPTION 'ADMIN_ONLY' USING ERRCODE='42501';
 END IF;
 IF p_enabled IS NULL THEN RAISE EXCEPTION 'INVALID_ENABLED'; END IF;
 UPDATE public.stellar_u423_module_rules
 SET combat_enabled=p_enabled,updated_at=now()
 WHERE item='eclipse_lance' AND slot='weapon';
 IF NOT FOUND THEN RAISE EXCEPTION 'MODULE_MISSING'; END IF;
 RETURN jsonb_build_object('ok',true,'enabled',p_enabled);
END; $$;
REVOKE ALL ON FUNCTION public.stellar_u431_admin_weapon(boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_u431_admin_weapon(boolean) TO authenticated;
COMMIT;
