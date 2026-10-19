-- Stellar Legacy V34.1.1 • instalar código antes deste SQL.
-- Central visual de eventos administrada no Supabase; sem alterações nos saves.
BEGIN;
CREATE TABLE IF NOT EXISTS public.live_event_weekend_settings_v3411 (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id=1),
  enabled boolean NOT NULL DEFAULT true,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo' CHECK (timezone='America/Sao_Paulo'),
  slots jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.live_event_weekend_settings_v3411 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.live_event_weekend_settings_v3411 FROM PUBLIC,anon,authenticated;
INSERT INTO public.live_event_weekend_settings_v3411(id,enabled,slots) VALUES(1,true,
  '[{"day":6,"start":"11:00","duration":120},{"day":6,"start":"14:00","duration":120},{"day":6,"start":"17:00","duration":120},{"day":6,"start":"20:00","duration":120},{"day":0,"start":"11:00","duration":120},{"day":0,"start":"14:00","duration":120},{"day":0,"start":"17:00","duration":120},{"day":0,"start":"20:00","duration":120}]'::jsonb)
ON CONFLICT(id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.live_event_manual_override_v3411 (
  id smallint PRIMARY KEY DEFAULT 1 CHECK(id=1),
  event_key text,
  start_at timestamptz,
  end_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_at IS NULL OR start_at IS NULL OR end_at>start_at)
);
ALTER TABLE public.live_event_manual_override_v3411 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.live_event_manual_override_v3411 FROM PUBLIC,anon,authenticated;
INSERT INTO public.live_event_manual_override_v3411(id) VALUES(1) ON CONFLICT(id) DO NOTHING;

-- Visão LIVE OPS reutilizada por cliente e servidor (única fonte de verdade).
CREATE OR REPLACE FUNCTION public.get_live_ops_v16()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='public' AS $fn$
 SELECT jsonb_build_object(
  'server_time',(extract(epoch FROM clock_timestamp())*1000)::bigint,
  'weekend_settings',coalesce((SELECT to_jsonb(t)-'id' FROM public.live_event_weekend_settings_v3411 t WHERE id=1),'{}'::jsonb),
  'manual_override',coalesce((SELECT to_jsonb(t)-'id' FROM public.live_event_manual_override_v3411 t WHERE id=1),'{}'::jsonb),
  'events',coalesce((SELECT jsonb_agg(jsonb_build_object(
    'event_key',event_key,'name',name,'icon',icon,'description',description,'enabled',enabled,
    'starts_at',starts_at,'duration_minutes',duration_minutes,'repeat_minutes',repeat_minutes,
    'schedule_mode',schedule_mode,'weekdays',weekdays,'start_local_time',start_local_time,
    'timezone',timezone,'ends_at',ends_at,
    'priority',priority,'target',target,'reward',reward,'rules',rules,'updated_at',updated_at)
    ORDER BY priority,event_key) FROM public.live_event_config_v16),'[]'::jsonb),
  'catalog',coalesce((SELECT jsonb_agg(jsonb_build_object(
    'catalog_key',catalog_key,'kind',kind,'ref_id',ref_id,'display_name',display_name,
    'description',description,'price',price,'currency',currency,'enabled',enabled,
    'shop_tab',shop_tab,'shop_visible',shop_visible,'min_level',min_level,'sort_order',sort_order,
    'meta',meta,'updated_at',updated_at) ORDER BY coalesce(shop_tab,'zzz'),sort_order,catalog_key)
    FROM public.live_shop_prices_v16 WHERE enabled),'[]'::jsonb)
 );
$fn$;

-- Versão dinâmica do mesmo validador de slots usado no calendário JS.
CREATE OR REPLACE FUNCTION public.weekend_event_slot_v341(p_at timestamptz)
RETURNS TABLE(event_key text,event_start timestamptz,event_end timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $fn$
DECLARE
  local_ts timestamp:=p_at AT TIME ZONE 'America/Sao_Paulo';
  local_date date:=local_ts::date;
  week_day int:=extract(dow FROM local_ts)::int;
  local_clock time:=local_ts::time;
  entry jsonb; ord bigint; count_slots int; index_slots bigint;
  saturday_date date; weeks_since_anchor int; serial bigint; count_events int;
  start_minutes int; duration_minutes int;
BEGIN
  SELECT t.slots INTO entry FROM public.live_event_weekend_settings_v3411 t WHERE id=1 AND enabled=true;
  IF entry IS NULL OR jsonb_typeof(entry)<>'array' OR jsonb_array_length(entry)<1 THEN RETURN; END IF;
  count_slots:=jsonb_array_length(entry);
  SELECT t.value,t.ordinality INTO entry,ord FROM public.live_event_weekend_settings_v3411 cfg,
    jsonb_array_elements(cfg.slots) WITH ORDINALITY t(value,ordinality)
    WHERE cfg.id=1 AND cfg.enabled=true AND (t.value->>'day')::int=week_day
    AND local_clock>=(t.value->>'start')::time
    AND local_clock<((t.value->>'start')::time+make_interval(mins=>(t.value->>'duration')::int))
    ORDER BY t.ordinality LIMIT 1;
  IF entry IS NULL THEN RETURN; END IF;
  saturday_date:=local_date-((week_day+1)%7);
  weeks_since_anchor:=(saturday_date-date '2026-10-24')/7;
  IF weeks_since_anchor<0 THEN RETURN; END IF;
  serial:=weeks_since_anchor*count_slots+ord-1;
  SELECT count(*) INTO count_events FROM public.live_event_config_v16
    WHERE enabled=true AND schedule_mode='interval' AND rules @> '{"weekend_rotation":true}'::jsonb;
  IF count_events=0 THEN RETURN; END IF;
  SELECT cfg.event_key INTO event_key FROM public.live_event_config_v16 cfg
    WHERE cfg.enabled=true AND cfg.schedule_mode='interval' AND cfg.rules @> '{"weekend_rotation":true}'::jsonb
    ORDER BY cfg.priority,cfg.event_key OFFSET (serial % count_events)::int LIMIT 1;
  start_minutes:=split_part(entry->>'start',':',1)::int*60+split_part(entry->>'start',':',2)::int;
  duration_minutes:=(entry->>'duration')::int;
  event_start:=(local_date::timestamp+make_interval(mins=>start_minutes)) AT TIME ZONE 'America/Sao_Paulo';
  event_end:=event_start+make_interval(mins=>duration_minutes);
  RETURN NEXT;
END;
$fn$;
REVOKE ALL ON FUNCTION public.weekend_event_slot_v341(timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.weekend_event_slot_v341(timestamptz) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_set_weekend_settings_v3411(p_enabled boolean,p_slots jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE rec record; last_day int:=-1; last_end int:=0; day_value int; minute_value int; duration_value int; start_text text;
BEGIN
 IF NOT public.is_game_admin_v1763(auth.uid()) THEN RAISE EXCEPTION 'Acesso administrativo negado.'; END IF;
 IF jsonb_typeof(p_slots)<>'array' OR jsonb_array_length(p_slots) NOT BETWEEN 1 AND 16 THEN RAISE EXCEPTION 'Informe de 1 a 16 horários.'; END IF;
 FOR rec IN SELECT value FROM jsonb_array_elements(p_slots) LOOP
   IF jsonb_typeof(rec.value)<>'object' OR (rec.value->>'day') !~ '^[0-6]$'
     OR (rec.value->>'start') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
     OR (rec.value->>'duration') !~ '^\d{2,3}$' THEN RAISE EXCEPTION 'Horário inválido.'; END IF;
   day_value:=(rec.value->>'day')::int;start_text:=rec.value->>'start';
   minute_value:=split_part(start_text,':',1)::int*60+split_part(start_text,':',2)::int;
   duration_value:=(rec.value->>'duration')::int;
   IF duration_value NOT BETWEEN 15 AND 360 OR minute_value+duration_value>1440 THEN RAISE EXCEPTION 'Duração inválida ou ultrapassa meia-noite.'; END IF;
 END LOOP;
 -- Os slots devem estar ordenados a partir de sábado, sem sobreposições.
 FOR rec IN SELECT (value->>'day')::int AS dow,
    split_part(value->>'start',':',1)::int*60+split_part(value->>'start',':',2)::int AS minute,
    (value->>'duration')::int AS duration
    FROM jsonb_array_elements(p_slots)
    ORDER BY CASE (value->>'day')::int WHEN 6 THEN 0 WHEN 0 THEN 1 ELSE (value->>'day')::int+1 END,
      split_part(value->>'start',':',1)::int*60+split_part(value->>'start',':',2)::int
 LOOP
   IF rec.dow=last_day AND rec.minute<last_end THEN RAISE EXCEPTION 'Horários sobrepostos.'; END IF;
   last_day:=rec.dow;last_end:=rec.minute+rec.duration;
 END LOOP;
 UPDATE public.live_event_weekend_settings_v3411 SET enabled=coalesce(p_enabled,true),
   slots=(SELECT jsonb_agg(value ORDER BY sort_day, minute)
      FROM (SELECT value,CASE (value->>'day')::int WHEN 6 THEN 0 WHEN 0 THEN 1 ELSE (value->>'day')::int+1 END AS sort_day,
        split_part(value->>'start',':',1)::int*60+split_part(value->>'start',':',2)::int AS minute
        FROM jsonb_array_elements(p_slots)) sorted),updated_at=now() WHERE id=1;
 RETURN public.get_live_ops_v16();
END;
$fn$;
REVOKE ALL ON FUNCTION public.admin_set_weekend_settings_v3411(boolean,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_set_weekend_settings_v3411(boolean,jsonb) TO authenticated;

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
  IF v !~ '^\d{1,10}$' OR v::numeric>CASE k WHEN 'credits' THEN 100000000 WHEN 'uridium' THEN 500000 WHEN 'xp' THEN 10000000 ELSE 100 END THEN RAISE EXCEPTION 'Recompensa acima do limite.'; END IF;
 END LOOP;
 IF jsonb_typeof(p_controls)<>'object' THEN RAISE EXCEPTION 'Controles inválidos.'; END IF;
 FOR k IN SELECT jsonb_object_keys(p_controls) LOOP
  IF k NOT IN ('wave_count','min_alive','ore_count','wave_interval_ms') THEN RAISE EXCEPTION 'Parâmetro do evento não permitido.'; END IF;
  v:=p_controls->>k;
  IF v !~ '^\d{1,6}$' OR v::numeric > CASE k WHEN 'wave_count' THEN 12 WHEN 'min_alive' THEN 12 WHEN 'ore_count' THEN 20 ELSE 120000 END
      OR v::numeric < CASE k WHEN 'wave_interval_ms' THEN 3000 ELSE 1 END THEN RAISE EXCEPTION 'Parâmetro de onda fora do limite.'; END IF;
 END LOOP;
 SELECT coalesce(rules,'{}'::jsonb) INTO new_rules FROM public.live_event_config_v16 WHERE event_key=p_event_key FOR UPDATE;
 UPDATE public.live_event_config_v16 SET enabled=coalesce(p_enabled,true),priority=p_priority,target=p_target,
    reward=p_reward,rules=new_rules||jsonb_build_object('event_control',p_controls),updated_at=now() WHERE event_key=p_event_key;
 RETURN public.get_live_ops_v16();
END;
$fn$;
REVOKE ALL ON FUNCTION public.admin_set_weekend_event_v3411(text,boolean,integer,integer,jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_set_weekend_event_v3411(text,boolean,integer,integer,jsonb,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_manual_event_v3411(p_event_key text,p_duration_minutes integer,p_stop boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
 IF NOT public.is_game_admin_v1763(auth.uid()) THEN RAISE EXCEPTION 'Acesso administrativo negado.'; END IF;
 IF p_stop THEN UPDATE public.live_event_manual_override_v3411 SET event_key=NULL,start_at=NULL,end_at=NULL,updated_at=now() WHERE id=1;
 ELSE
   IF p_duration_minutes NOT BETWEEN 15 AND 360 OR NOT EXISTS (SELECT 1 FROM public.live_event_config_v16 WHERE event_key=p_event_key AND enabled=true) THEN RAISE EXCEPTION 'Evento ou duração inválida.'; END IF;
   UPDATE public.live_event_manual_override_v3411 SET event_key=p_event_key,start_at=clock_timestamp(),end_at=clock_timestamp()+make_interval(mins=>p_duration_minutes),updated_at=now() WHERE id=1;
 END IF;
 RETURN public.get_live_ops_v16();
END;
$fn$;
REVOKE ALL ON FUNCTION public.admin_set_manual_event_v3411(text,integer,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_set_manual_event_v3411(text,integer,boolean) TO authenticated;

-- Recompensas: preservar a operação transacional existente, apenas ajustar a janela.
CREATE OR REPLACE FUNCTION public.record_my_galaxy_event_progress_v1826(p_event_id text,p_delta integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE uid uuid:=auth.uid(); k text; start_ms bigint; t_start timestamptz; t_end timestamptz;
        event_def public.live_event_config_v16%ROWTYPE;
        row_ev public.galaxy_event_progress_v1826%ROWTYPE;
        old_save jsonb; old_rec jsonb; new_rec jsonb; new_save jsonb;
        new_progress int; old_rewarded boolean; r jsonb;
        lv int; mult numeric; xp_mult numeric:=1; cr bigint; stl bigint; xp bigint; cores int;
        new_profile jsonb; new_warfront jsonb; rewards jsonb;
        rotation_enabled boolean; weekend_key text; weekend_start timestamptz; weekend_end timestamptz; manual_key text; manual_start timestamptz; manual_end timestamptz;
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
    SELECT m.event_key,m.start_at,m.end_at INTO manual_key,manual_start,manual_end
      FROM public.live_event_manual_override_v3411 m WHERE m.id=1 AND m.start_at<=clock_timestamp() AND m.end_at>clock_timestamp();
    IF manual_key=k AND manual_start IS NOT NULL AND abs(extract(epoch FROM (t_start-manual_start)))<=0.5 THEN
      t_end:=manual_end;
    ELSE
      -- Enquanto houver evento manual, a rotação automática fica suspensa.
      IF manual_key IS NOT NULL THEN RAISE EXCEPTION 'Existe um evento extraordinário em andamento.'; END IF;
      SELECT w.event_key,w.event_start,w.event_end
        INTO weekend_key,weekend_start,weekend_end
        FROM public.weekend_event_slot_v341(clock_timestamp()) w;
      IF weekend_key IS NULL OR weekend_key<>k OR abs(extract(epoch FROM (t_start-weekend_start)))>0.5
        THEN RAISE EXCEPTION 'Período não pertence à rotação oficial do fim de semana.'; END IF;
      t_end:=weekend_end;
    END IF;
    t_end:=least(t_end,coalesce(event_def.ends_at,'infinity'::timestamptz));
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


COMMIT;
