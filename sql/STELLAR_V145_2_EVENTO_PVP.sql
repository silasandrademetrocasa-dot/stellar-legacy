BEGIN;
-- Calendar compatibility with server/event-rotation-v135.js. No grants or economic changes.
CREATE OR REPLACE FUNCTION public.stellar_event_window_v1452(p_event_id text,p_at timestamptz DEFAULT clock_timestamp())
RETURNS TABLE(event_key text,event_start timestamptz,event_end timestamptz)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $window$
DECLARE anchor timestamptz:='2026-11-09 03:00:00+00';serial bigint;roster text[];expected_key text;
 starts timestamptz;ends timestamptz;natal boolean:=false;expected_ms bigint;
BEGIN
 IF p_event_id IS NULL OR p_at IS NULL OR p_event_id !~ '^v135:[a-z][a-z0-9_]{1,48}:[0-9]{13}$' OR p_at<anchor THEN RETURN;END IF;
 -- A manual override suspends the automatic calendar, as on Render.
 IF EXISTS(SELECT 1 FROM public.live_event_manual_override_v3411 m WHERE m.id=1 AND m.event_key IS NOT NULL AND m.start_at<=p_at AND m.end_at>p_at) THEN RETURN;END IF;
 serial:=floor(extract(epoch FROM (p_at-anchor))/14400)::bigint;
 starts:=anchor+serial*interval '4 hours';expected_ms:=(extract(epoch FROM starts)*1000)::bigint;
 IF split_part(p_event_id,':',3)::bigint<>expected_ms THEN RETURN;END IF;
 SELECT coalesce(c.enabled AND p_at>=c.starts_at AND p_at<c.ends_at,false) INTO natal FROM public.stellar_natal_config_v132 c WHERE c.id=1;
 natal:=coalesce(natal,false) AND p_at>='2026-11-07 03:00:00+00'::timestamptz AND p_at<'2027-01-06 03:00:00+00'::timestamptz;
 -- Festival has no regular-event reward slot. The last hour is Christmas outside festival.
 IF natal AND p_at>='2026-11-16 03:00:00+00'::timestamptz AND p_at<'2026-11-23 03:00:00+00'::timestamptz THEN RETURN;END IF;
 ends:=starts+CASE WHEN natal THEN interval '3 hours' ELSE interval '4 hours' END;
 IF p_at>=ends THEN RETURN;END IF;
 SELECT array_agg(r.key ORDER BY r.n) INTO roster
 FROM unnest(ARRAY['invasion','prime','mining','convoy','battle']) WITH ORDINALITY r(key,n)
 JOIN public.live_event_config_v16 c ON c.event_key=r.key AND c.enabled=true;
 IF coalesce(array_length(roster,1),0)=0 THEN RETURN;END IF;
 expected_key:=roster[(serial % array_length(roster,1))::int+1];
 IF split_part(p_event_id,':',2)<>expected_key THEN RETURN;END IF;
 event_key:=expected_key;event_start:=starts;event_end:=ends;RETURN NEXT;
END $window$;
REVOKE ALL ON FUNCTION public.stellar_event_window_v1452(text,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_event_window_v1452(text,timestamptz) TO service_role;

CREATE OR REPLACE FUNCTION public.record_my_galaxy_event_progress_v1826(p_event_id text, p_delta integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid(); k text; start_ms bigint; t_start timestamptz; t_end timestamptz;
        event_def public.live_event_config_v16%ROWTYPE;
        row_ev public.galaxy_event_progress_v1826%ROWTYPE;
        old_save jsonb; old_rec jsonb; new_rec jsonb; new_save jsonb;
        new_progress int; old_rewarded boolean; r jsonb;
        lv int; mult numeric; xp_mult numeric:=1; cr bigint; stl bigint; xp bigint; cores int;
        new_profile jsonb; new_warfront jsonb; rewards jsonb;
        rotation_enabled boolean; weekend_key text; weekend_start timestamptz; weekend_end timestamptz; manual_key text; manual_start timestamptz; manual_end timestamptz;
BEGIN
-- PLAYER_SHARED_LOCK_V134
PERFORM public.stellar_player_lock(auth.uid()); IF coalesce(current_setting('stellar.farm_commit',true),'')<>'1' AND EXISTS(SELECT 1 FROM public.stellar_offline_farm_v484 WHERE user_id=auth.uid() AND status='running') THEN RAISE EXCEPTION 'FARM_OFFLINE_ACTIVE';END IF;
  IF uid IS NULL THEN RAISE EXCEPTION 'Sessão inválida.'; END IF;
  IF p_event_id !~ '^(v1817|v135):[a-z][a-z0-9_]{1,48}:[0-9]{13}$' THEN RAISE EXCEPTION 'Identificador de período inválido.'; END IF;
  IF p_delta IS NULL OR p_delta<1 OR p_delta>10000 THEN RAISE EXCEPTION 'Progresso inválido.'; END IF;
  k:=split_part(p_event_id,':',2);start_ms:=split_part(p_event_id,':',3)::bigint;
  t_start:=to_timestamp(start_ms/1000.0);
  SELECT * INTO event_def FROM public.live_event_config_v16 WHERE event_key=k AND enabled=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Evento indisponível.'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.live_event_config_v16
    WHERE enabled=true AND schedule_mode='interval' AND rules @> '{"weekend_rotation":true}'::jsonb)
  INTO rotation_enabled;
  IF split_part(p_event_id,':',1)='v135' THEN
    SELECT w.event_end INTO t_end FROM public.stellar_event_window_v1452(p_event_id,clock_timestamp()) w;
    IF t_end IS NULL THEN RAISE EXCEPTION 'Período não pertence à rotação oficial V135.';END IF;
  ELSIF rotation_enabled AND event_def.schedule_mode='interval' THEN
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
$function$
;
COMMIT;
