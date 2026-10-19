-- STELLAR LEGACY V34.1.0 — GALACTIC WEEKEND EVENTS
-- APLICAR APÓS O DEPLOY DA V34.1.0 NO RENDER.
-- Roda em uma transação: prepara o validador antes de ativar a rotação.
-- Não altera economias, saves, objetivos ou recompensas dos eventos.
BEGIN;

DO $check$
BEGIN
 IF (SELECT count(*) FROM public.live_event_config_v16
     WHERE event_key IN ('invasion','prime','mining','convoy','battle'))<>5
 THEN RAISE EXCEPTION 'Esperados cinco eventos cadastrados. Agenda não foi alterada.'; END IF;
END;
$check$;

CREATE TABLE IF NOT EXISTS public.live_event_weekend_backup_v341
  (event_key text PRIMARY KEY, original_row jsonb NOT NULL, backup_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.live_event_weekend_backup_v341 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.live_event_weekend_backup_v341 FROM PUBLIC,anon,authenticated;
INSERT INTO public.live_event_weekend_backup_v341(event_key,original_row)
  SELECT event_key,to_jsonb(t) FROM public.live_event_config_v16 t
  WHERE event_key IN ('invasion','prime','mining','convoy','battle')
ON CONFLICT (event_key) DO NOTHING;

-- Consulta de slot único, idêntica à fila circular implementada no servidor JS.
CREATE OR REPLACE FUNCTION public.weekend_event_slot_v341(p_at timestamptz)
RETURNS TABLE(event_key text,event_start timestamptz,event_end timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $fn$
DECLARE
  local_ts timestamp:=p_at AT TIME ZONE 'America/Sao_Paulo';
  local_date date:=local_ts::date;
  week_day integer:=extract(dow FROM local_ts)::int;
  local_clock time:=local_ts::time;
  slot_index integer;
  start_hour integer;
  sat_date date;
  weeks_since_anchor integer;
  serial bigint;
  count_events integer;
BEGIN
  IF week_day NOT IN (0,6) THEN RETURN; END IF;
  IF local_clock>=time '11:00' AND local_clock<time '13:00' THEN slot_index:=0;start_hour:=11;
  ELSIF local_clock>=time '14:00' AND local_clock<time '16:00' THEN slot_index:=1;start_hour:=14;
  ELSIF local_clock>=time '17:00' AND local_clock<time '19:00' THEN slot_index:=2;start_hour:=17;
  ELSIF local_clock>=time '20:00' AND local_clock<time '22:00' THEN slot_index:=3;start_hour:=20;
  ELSE RETURN; END IF;
  sat_date:=local_date-CASE WHEN week_day=0 THEN 1 ELSE 0 END;
  weeks_since_anchor:=(sat_date-date '2026-10-24')/7;
  IF weeks_since_anchor<0 THEN RETURN; END IF;
  serial:=weeks_since_anchor*8+CASE WHEN week_day=0 THEN 4 ELSE 0 END+slot_index;
  SELECT count(*) INTO count_events FROM public.live_event_config_v16
     WHERE enabled=true AND schedule_mode='interval' AND rules @> '{"weekend_rotation":true}'::jsonb;
  IF count_events=0 THEN RETURN; END IF;
  SELECT cfg.event_key INTO event_key FROM public.live_event_config_v16 cfg
    WHERE cfg.enabled=true AND cfg.schedule_mode='interval' AND cfg.rules @> '{"weekend_rotation":true}'::jsonb
    ORDER BY cfg.priority,cfg.event_key OFFSET (serial % count_events)::int LIMIT 1;
  event_start:=(local_date::timestamp+make_interval(hours=>start_hour)) AT TIME ZONE 'America/Sao_Paulo';
  event_end:=event_start+interval '120 minutes';
  RETURN NEXT;
END;
$fn$;
REVOKE ALL ON FUNCTION public.weekend_event_slot_v341(timestamptz) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.weekend_event_slot_v341(timestamptz) TO service_role;

CREATE OR REPLACE FUNCTION public.record_my_galaxy_event_progress_v1826(p_event_id text,p_delta integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE uid uuid:=auth.uid(); k text; start_ms bigint; t_start timestamptz; t_end timestamptz;
        event_def public.live_event_config_v16%ROWTYPE;
        row_ev public.galaxy_event_progress_v1826%ROWTYPE;
        old_save jsonb; old_rec jsonb; new_rec jsonb; new_save jsonb;
        new_progress int; old_rewarded boolean; r jsonb;
        lv int; mult numeric; xp_mult numeric:=1; cr bigint; stl bigint; xp bigint; cores int;
        new_profile jsonb; new_warfront jsonb; rewards jsonb;
        rotation_enabled boolean; weekend_key text; weekend_start timestamptz; weekend_end timestamptz;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Sessão inválida.'; END IF;
  IF p_event_id !~ '^v1817:[a-z][a-z0-9_]{1,48}:[0-9]{13}$' THEN RAISE EXCEPTION 'Identificador de período inválido.'; END IF;
  IF p_delta IS NULL OR p_delta<1 OR p_delta>10000 THEN RAISE EXCEPTION 'Progresso inválido.'; END IF;
  k:=split_part(p_event_id,':',2);start_ms:=split_part(p_event_id,':',3)::bigint;
  t_start:=to_timestamp(start_ms/1000.0);
  SELECT * INTO event_def FROM public.live_event_config_v16 WHERE event_key=k AND enabled=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Evento indisponível.'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.live_event_config_v16
    WHERE enabled=true AND schedule_mode='interval' AND rules @> '{"weekend_rotation":true}'::jsonb)
  INTO rotation_enabled;
  IF rotation_enabled AND event_def.schedule_mode='interval' THEN
    -- Aceita EXCLUSIVAMENTE o evento e o início do slot oficial vigente.
    SELECT w.event_key,w.event_start,w.event_end
      INTO weekend_key,weekend_start,weekend_end
      FROM public.weekend_event_slot_v341(clock_timestamp()) w;
    IF weekend_key IS NULL OR weekend_key<>k OR abs(extract(epoch FROM (t_start-weekend_start)))>0.5
      THEN RAISE EXCEPTION 'Período não pertence à rotação oficial do fim de semana.'; END IF;
    t_end:=least(weekend_end,coalesce(event_def.ends_at,'infinity'::timestamptz));
  ELSE
    t_end:=least(t_start+make_interval(mins=>event_def.duration_minutes),coalesce(event_def.ends_at,'infinity'::timestamptz));
    IF event_def.schedule_mode='once' THEN
      IF abs(extract(epoch FROM (t_start-event_def.starts_at)))>0.5 THEN RAISE EXCEPTION 'Janela única inválida.'; END IF;
    ELSIF event_def.schedule_mode='weekly' THEN
      IF NOT (extract(dow FROM t_start AT TIME ZONE 'America/Sao_Paulo')::int = ANY(event_def.weekdays)
         AND (t_start AT TIME ZONE 'America/Sao_Paulo')::time = event_def.start_local_time)
        THEN RAISE EXCEPTION 'Janela semanal inválida.'; END IF;
    ELSE
      IF t_start<event_def.starts_at OR event_def.repeat_minutes<1
        OR abs(mod(extract(epoch FROM (t_start-event_def.starts_at))::numeric, (event_def.repeat_minutes*60)::numeric))>0.5
        THEN RAISE EXCEPTION 'Janela recorrente inválida.'; END IF;
    END IF;
  END IF;
  IF clock_timestamp()<t_start OR clock_timestamp()>=t_end THEN RAISE EXCEPTION 'Período do evento encerrado.'; END IF;
  SELECT state INTO old_save FROM public.game_saves WHERE user_id=uid FOR UPDATE;
  IF old_save IS NULL THEN RAISE EXCEPTION 'Save online não localizado.'; END IF;
  old_rec:=old_save #> ARRAY['galaxyEvents','records',p_event_id];
  old_rewarded:=coalesce((old_rec->>'rewarded')::boolean,false)
     OR coalesce((old_save->'eventRewardsV1826') ? p_event_id,false);
  INSERT INTO public.galaxy_event_progress_v1826(user_id,event_id,event_key,event_start,event_end,target,progress,rewarded,rewarded_at)
  VALUES(uid,p_event_id,k,t_start,t_end,event_def.target,
    least(event_def.target,greatest(0,coalesce((old_rec->>'value')::int,0))),old_rewarded,
    CASE WHEN old_rewarded THEN now() ELSE NULL END)
  ON CONFLICT (user_id,event_id) DO NOTHING;
  SELECT * INTO row_ev FROM public.galaxy_event_progress_v1826 WHERE user_id=uid AND event_id=p_event_id FOR UPDATE;
  IF row_ev.rewarded THEN
    RETURN jsonb_build_object('eventId',p_event_id,'progress',row_ev.target,'target',row_ev.target,'complete',true,'rewarded',true,'rewardedNow',false);
  END IF;
  new_progress:=least(row_ev.target,greatest(row_ev.progress,0)+p_delta);
  IF new_progress<row_ev.target THEN
    UPDATE public.galaxy_event_progress_v1826 SET progress=new_progress,updated_at=now() WHERE user_id=uid AND event_id=p_event_id;
    RETURN jsonb_build_object('eventId',p_event_id,'progress',new_progress,'target',row_ev.target,'complete',false,'rewarded',false,'rewardedNow',false);
  END IF;
  -- Chegou ao objetivo, creditado no banco exatamente uma vez.
  lv:=greatest(1,coalesce((old_save#>>'{profile,level}')::int,1));
  mult:=1+least(1.5,greatest(0,lv-1)/36.0);
  cr:=round(coalesce((event_def.reward->>'credits')::numeric,0)*mult);
  stl:=round(coalesce((event_def.reward->>'uridium')::numeric,0)*mult);
  xp:=round(coalesce((event_def.reward->>'xp')::numeric,0)*mult*.55);
  cores:=greatest(0,coalesce((event_def.reward->>'cores')::integer,0));
  new_profile:=coalesce(old_save->'profile','{}'::jsonb);
  new_profile:=jsonb_set(new_profile,'{credits}',to_jsonb(coalesce((new_profile->>'credits')::bigint,0)+cr),true);
  new_profile:=jsonb_set(new_profile,'{uridium}',to_jsonb(coalesce((new_profile->>'uridium')::bigint,0)+stl),true);
  new_profile:=jsonb_set(new_profile,'{xp}',to_jsonb(coalesce((new_profile->>'xp')::bigint,0)+xp),true);
  new_warfront:=coalesce(old_save->'warfront','{}'::jsonb);
  new_warfront:=jsonb_set(new_warfront,'{skillCores}',to_jsonb(coalesce((new_warfront->>'skillCores')::int,0)+cores),true);
  new_rec:=coalesce(old_rec,'{}'::jsonb)||jsonb_build_object('value',row_ev.target,'complete',true,'rewarded',true,'completedAt',now()::text);
  rewards:=jsonb_build_object('credits',cr,'uridium',stl,'xp',xp,'cores',cores);
  new_save:=jsonb_set(old_save,'{profile}',new_profile,true);
  new_save:=jsonb_set(new_save,'{warfront}',new_warfront,true);
  new_save:=jsonb_set(new_save,'{galaxyEvents}',coalesce(new_save->'galaxyEvents','{"records":{}}'::jsonb),true);
  new_save:=jsonb_set(new_save,'{galaxyEvents,records}',coalesce(new_save#>'{galaxyEvents,records}','{}'::jsonb),true);
  new_save:=jsonb_set(new_save,ARRAY['galaxyEvents','records',p_event_id],new_rec,true);
  new_save:=jsonb_set(new_save,'{eventRewardsV1826}',coalesce(old_save->'eventRewardsV1826','{}'::jsonb)||jsonb_build_object(p_event_id,rewards),true);
  UPDATE public.game_saves SET state=new_save,updated_at=now() WHERE user_id=uid;
  UPDATE public.profiles SET credits=coalesce((new_profile->>'credits')::bigint,0),uridium=coalesce((new_profile->>'uridium')::bigint,0),xp=coalesce((new_profile->>'xp')::bigint,0),updated_at=now() WHERE id=uid;
  UPDATE public.galaxy_event_progress_v1826 SET progress=row_ev.target,rewarded=true,rewarded_at=now(),updated_at=now() WHERE user_id=uid AND event_id=p_event_id;
  RETURN jsonb_build_object('eventId',p_event_id,'progress',row_ev.target,'target',row_ev.target,'complete',true,'rewarded',true,'rewardedNow',true,'reward',rewards,'state',new_save);
END;
$fn$;
REVOKE ALL ON FUNCTION public.record_my_galaxy_event_progress_v1826(text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_my_galaxy_event_progress_v1826(text,integer) TO authenticated;

-- Habilitar a nova agenda SOMENTE após instalar o validador seguro acima.
UPDATE public.live_event_config_v16
 SET schedule_mode='interval', duration_minutes=120,
     rules=coalesce(rules,'{}'::jsonb)||'{"weekend_rotation":true}'::jsonb,
     timezone='America/Sao_Paulo', ends_at=NULL,updated_at=now()
 WHERE event_key IN ('invasion','prime','mining','convoy','battle');

-- Inventário de agenda para conferência pós-deploy.
-- SELECT event_key,name,duration_minutes,rules->>'weekend_rotation' FROM public.live_event_config_v16 ORDER BY priority;
-- SELECT * FROM public.weekend_event_slot_v341('2026-10-24 11:30:00-03'::timestamptz);
COMMIT;
