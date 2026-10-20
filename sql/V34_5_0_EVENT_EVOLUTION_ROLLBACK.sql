-- Restore the V34.1.1 Event Control RPC, preserving all current saves, shops and rows.
BEGIN;
CREATE OR REPLACE FUNCTION public.admin_set_weekend_event_v3411(p_event_key text,p_enabled boolean,p_priority integer,p_target integer,p_reward jsonb,p_controls jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE new_rules jsonb; k text; v text;
BEGIN
 IF NOT public.is_game_admin_v1763(auth.uid()) THEN RAISE EXCEPTION 'Acesso administrativo negado.'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.live_event_config_v16 WHERE event_key=p_event_key AND rules @> '{"weekend_rotation":true}'::jsonb) THEN RAISE EXCEPTION 'Evento não pertence à rotação.'; END IF;
 IF p_priority NOT BETWEEN 1 AND 10000 OR p_target NOT BETWEEN 1 AND 100000 THEN RAISE EXCEPTION 'Prioridade ou meta fora dos limites.'; END IF;
 IF jsonb_typeof(p_reward)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(p_reward))<>4 THEN RAISE EXCEPTION 'Recompensa deve conter 4 campos.'; END IF;
 FOR k IN SELECT jsonb_object_keys(p_reward) LOOP
  IF k NOT IN ('credits','uridium','xp','cores') THEN RAISE EXCEPTION 'Recompensa não reconhecida.'; END IF;
  v:=p_reward->>k;
  IF v !~ '^\d{1,10}$' OR v::numeric > (CASE k WHEN 'credits' THEN 100000000 WHEN 'uridium' THEN 500000 WHEN 'xp' THEN 10000000 ELSE 100 END) THEN RAISE EXCEPTION 'Recompensa acima do limite.'; END IF;
 END LOOP;
 IF jsonb_typeof(p_controls)<>'object' THEN RAISE EXCEPTION 'Controles inválidos.'; END IF;
 FOR k IN SELECT jsonb_object_keys(p_controls) LOOP
  IF k NOT IN ('wave_count','min_alive','ore_count','wave_interval_ms') THEN RAISE EXCEPTION 'Parâmetro do evento não permitido.'; END IF;
  v:=p_controls->>k;
  IF v !~ '^\d{1,6}$' OR v::numeric > (CASE k WHEN 'wave_count' THEN 12 WHEN 'min_alive' THEN 12 WHEN 'ore_count' THEN 20 ELSE 120000 END)
      OR v::numeric < (CASE k WHEN 'wave_interval_ms' THEN 3000 ELSE 1 END) THEN RAISE EXCEPTION 'Parâmetro de onda fora do limite.'; END IF;
 END LOOP;
 SELECT coalesce(rules,'{}'::jsonb) INTO new_rules FROM public.live_event_config_v16 WHERE event_key=p_event_key FOR UPDATE;
 UPDATE public.live_event_config_v16 SET enabled=coalesce(p_enabled,true),priority=p_priority,target=p_target,
    reward=p_reward,rules=new_rules||jsonb_build_object('event_control',p_controls),updated_at=now() WHERE event_key=p_event_key;
 RETURN public.get_live_ops_v16();
END;
$fn$;
REVOKE ALL ON FUNCTION public.admin_set_weekend_event_v3411(text,boolean,integer,integer,jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_set_weekend_event_v3411(text,boolean,integer,integer,jsonb,jsonb) TO authenticated;
COMMIT;
