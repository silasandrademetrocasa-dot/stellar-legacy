-- STELLAR LEGACY V18.2.6 - EVENTOS POR JOGADOR / PERÍODO
-- Execute uma vez no Supabase (instalação do assistente). Saves e progresso preservados.
CREATE TABLE IF NOT EXISTS public.galaxy_event_progress_v1826 (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id text NOT NULL CHECK (length(event_id) BETWEEN 16 AND 110),
  event_key text NOT NULL,
  event_start timestamptz NOT NULL,
  event_end timestamptz NOT NULL,
  target integer NOT NULL CHECK (target BETWEEN 1 AND 100000),
  progress integer NOT NULL DEFAULT 0 CHECK (progress >= 0),
  rewarded boolean NOT NULL DEFAULT false,
  rewarded_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id,event_id)
);
CREATE INDEX IF NOT EXISTS galaxy_event_progress_v1826_period_idx ON public.galaxy_event_progress_v1826 (event_end);
ALTER TABLE public.galaxy_event_progress_v1826 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.galaxy_event_progress_v1826 FROM PUBLIC,anon,authenticated;

-- Cliente não pode sobrescrever as recompensas persistidas por RPC, mesmo com um save antigo aberto.
CREATE OR REPLACE FUNCTION public.galaxy_event_save_guard_v1826()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE old_claims jsonb := coalesce(OLD.state->'eventRewardsV1826','{}'::jsonb);
        new_claims jsonb := coalesce(NEW.state->'eventRewardsV1826','{}'::jsonb);
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid()=OLD.user_id
    AND jsonb_typeof(old_claims)='object'
    AND NOT (jsonb_typeof(new_claims)='object' AND new_claims @> old_claims)
  THEN RAISE EXCEPTION 'SAVE_EVENT_STALE: reabra o jogo para sincronizar a recompensa de evento.' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$fn$;
DROP TRIGGER IF EXISTS galaxy_event_save_guard_v1826 ON public.game_saves;
CREATE TRIGGER galaxy_event_save_guard_v1826 BEFORE UPDATE OF state ON public.game_saves
FOR EACH ROW EXECUTE FUNCTION public.galaxy_event_save_guard_v1826();
REVOKE ALL ON FUNCTION public.galaxy_event_save_guard_v1826() FROM PUBLIC,anon,authenticated;

-- Status é idempotente, inclusive para saves anteriores à instalação da V18.2.6.
CREATE OR REPLACE FUNCTION public.get_my_galaxy_event_progress_v1826(p_event_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE uid uuid:=auth.uid(); row_ev public.galaxy_event_progress_v1826%ROWTYPE; old_rec jsonb;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Sessão inválida.'; END IF;
 SELECT * INTO row_ev FROM public.galaxy_event_progress_v1826 WHERE user_id=uid AND event_id=p_event_id;
 IF FOUND THEN RETURN jsonb_build_object('eventId',p_event_id,'progress',row_ev.progress,'target',row_ev.target,'complete',row_ev.rewarded,'rewarded',row_ev.rewarded,'rewardedNow',false); END IF;
 SELECT state #> ARRAY['galaxyEvents','records',p_event_id] INTO old_rec FROM public.game_saves WHERE user_id=uid;
 RETURN jsonb_build_object('eventId',p_event_id,'progress',greatest(0,coalesce((old_rec->>'value')::int,0)),
   'complete',coalesce((old_rec->>'rewarded')::boolean,false),
   'rewarded',coalesce((old_rec->>'rewarded')::boolean,false),'rewardedNow',false);
END;
$fn$;
REVOKE ALL ON FUNCTION public.get_my_galaxy_event_progress_v1826(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_galaxy_event_progress_v1826(text) TO authenticated;

-- Chamado pelo backend WebSocket após abates/recursos validados por ele.
-- Valida período ativo publicado no LIVE OPS e impede recompensa repetida.
CREATE OR REPLACE FUNCTION public.record_my_galaxy_event_progress_v1826(p_event_id text,p_delta integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE uid uuid:=auth.uid(); k text; start_ms bigint; t_start timestamptz; t_end timestamptz;
        event_def public.live_event_config_v16%ROWTYPE;
        row_ev public.galaxy_event_progress_v1826%ROWTYPE;
        old_save jsonb; old_rec jsonb; new_rec jsonb; new_save jsonb;
        new_progress int; old_rewarded boolean; r jsonb;
        lv int; mult numeric; xp_mult numeric:=1; cr bigint; stl bigint; xp bigint; cores int;
        new_profile jsonb; new_warfront jsonb; rewards jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Sessão inválida.'; END IF;
  IF p_event_id !~ '^v1817:[a-z][a-z0-9_]{1,48}:[0-9]{13}$' THEN RAISE EXCEPTION 'Identificador de período inválido.'; END IF;
  IF p_delta IS NULL OR p_delta<1 OR p_delta>10000 THEN RAISE EXCEPTION 'Progresso inválido.'; END IF;
  k:=split_part(p_event_id,':',2);start_ms:=split_part(p_event_id,':',3)::bigint;
  t_start:=to_timestamp(start_ms/1000.0);
  SELECT * INTO event_def FROM public.live_event_config_v16 WHERE event_key=k AND enabled=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Evento indisponível.'; END IF;
  t_end:=least(t_start+make_interval(mins=>event_def.duration_minutes),coalesce(event_def.ends_at,'infinity'::timestamptz));
  IF clock_timestamp()<t_start OR clock_timestamp()>=t_end THEN RAISE EXCEPTION 'Período do evento encerrado.'; END IF;
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
