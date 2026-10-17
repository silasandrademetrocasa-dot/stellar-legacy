-- STELLAR LEGACY: antifraude com auditoria e suspensão temporária após reincidência
-- Aplica somente estruturas novas. Não edita saves, saldos ou proprietários de territórios.
BEGIN;
CREATE TABLE IF NOT EXISTS public.stellar_security_events (
 id bigserial PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 code text NOT NULL CHECK (code ~ '^[A-Z_]{4,64}$'),
 severity text NOT NULL CHECK (severity IN ('warn','critical')),
 context jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(context)='object' AND octet_length(context::text)<4000),
 created_at timestamptz NOT NULL DEFAULT now(),
 auto_suspended boolean NOT NULL DEFAULT false,
 reviewed_at timestamptz,
 reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 review_note text
);
CREATE INDEX IF NOT EXISTS stellar_security_events_user_time_idx ON public.stellar_security_events(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS stellar_security_events_pending_idx ON public.stellar_security_events(created_at DESC) WHERE reviewed_at IS NULL;
ALTER TABLE public.stellar_security_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stellar_security_events FROM PUBLIC,anon,authenticated;
REVOKE ALL ON SEQUENCE public.stellar_security_events_id_seq FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.stellar_security_events TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.stellar_security_events_id_seq TO service_role;

-- Somente credencial do servidor consegue registrar violações.
CREATE OR REPLACE FUNCTION public.stellar_security_report_server(p_user_id uuid,p_code text,p_severity text,p_context jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public,pg_temp AS $$
DECLARE v_last timestamptz; v_count integer; v_event bigint; v_banned boolean:=false; v_admin boolean:=false;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Somente servidor autorizado'; END IF;
 IF p_user_id IS NULL OR p_code !~ '^[A-Z_]{4,64}$' OR p_severity NOT IN ('warn','critical') THEN RAISE EXCEPTION 'Evento inválido'; END IF;
 IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id=p_user_id) THEN RAISE EXCEPTION 'Conta inexistente'; END IF;
 -- Nunca aplicar suspensão automática a admins, nem por eventos de severidade warning.
 SELECT EXISTS (SELECT 1 FROM public.game_admins WHERE user_id=p_user_id) INTO v_admin;
 SELECT max(created_at) INTO v_last FROM public.stellar_security_events WHERE user_id=p_user_id AND code=p_code AND created_at>now()-interval '1 minute';
 IF v_last IS NOT NULL THEN RETURN jsonb_build_object('recorded',false,'deduplicated',true,'auto_suspended',false); END IF;
 INSERT INTO public.stellar_security_events(user_id,code,severity,context)
 VALUES(p_user_id,p_code,p_severity,coalesce(p_context,'{}'::jsonb)) RETURNING id INTO v_event;
 IF p_severity='critical' AND NOT v_admin THEN
  SELECT count(*) INTO v_count FROM public.stellar_security_events
  WHERE user_id=p_user_id AND severity='critical' AND created_at>now()-interval '2 hours' AND reviewed_at IS NULL;
  IF v_count>=3 THEN
    INSERT INTO public.account_moderation_v1763(user_id,is_banned,banned_until,banned_reason,banned_by,updated_at)
    VALUES(p_user_id,true,now()+interval '24 hours','Proteção antifraude: violações graves recorrentes. Revisão disponível.',NULL,now())
    ON CONFLICT(user_id) DO UPDATE SET is_banned=true,banned_until=excluded.banned_until,banned_reason=excluded.banned_reason,banned_by=NULL,updated_at=now();
    DELETE FROM public.game_login_sessions_v1214 WHERE user_id=p_user_id;
    DELETE FROM public.player_presence WHERE user_id=p_user_id;
    UPDATE public.stellar_security_events SET auto_suspended=true WHERE id=v_event;
    v_banned:=true;
  END IF;
 END IF;
 RETURN jsonb_build_object('recorded',true,'event_id',v_event,'auto_suspended',v_banned,'critical_strikes',coalesce(v_count,0));
END; $$;
REVOKE ALL ON FUNCTION public.stellar_security_report_server(uuid,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_security_report_server(uuid,text,text,jsonb) TO service_role;

-- Auditoria por ADM, sem exposição da tabela de incidentes ao navegador.
CREATE OR REPLACE FUNCTION public.stellar_security_review_incident(p_event_id bigint,p_note text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_row public.stellar_security_events;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_game_admin_v1763(auth.uid()) THEN RAISE EXCEPTION 'Acesso administrativo negado'; END IF;
 IF p_note IS NULL OR length(btrim(p_note))<3 THEN RAISE EXCEPTION 'Motivo da revisão obrigatório'; END IF;
 UPDATE public.stellar_security_events SET reviewed_at=now(),reviewed_by=auth.uid(),review_note=left(btrim(p_note),200)
 WHERE id=p_event_id RETURNING * INTO v_row;
 IF NOT FOUND THEN RAISE EXCEPTION 'Incidente inexistente'; END IF;
 RETURN jsonb_build_object('ok',true,'event_id',v_row.id,'user_id',v_row.user_id,'reviewed_at',v_row.reviewed_at);
END; $$;
REVOKE ALL ON FUNCTION public.stellar_security_review_incident(bigint,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_security_review_incident(bigint,text) TO authenticated;

-- Salvaguarda do lado do banco: não pode ser contornada chamando o REST do Supabase
-- diretamente. Limiares altos para não bloquear recompensas legítimas já existentes.
CREATE OR REPLACE FUNCTION public.stellar_guard_saves_antifraud_v226()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_credits numeric;v_stl numeric;v_old_credits numeric;v_old_stl numeric;
BEGIN
 IF new.state IS NULL OR jsonb_typeof(new.state)<>'object' THEN RAISE EXCEPTION 'SECURITY_SAVE_INVALID'; END IF;
 IF new.state ? 'accountOwnerId' AND nullif(new.state->>'accountOwnerId','') IS NOT NULL
    AND new.state->>'accountOwnerId' <> new.user_id::text THEN RAISE EXCEPTION 'SECURITY_OWNER_MISMATCH'; END IF;
 IF auth.role() = 'service_role' THEN RETURN new; END IF;
 IF coalesce(new.state->'profile','{}'::jsonb) ? 'credits' THEN
  IF jsonb_typeof(new.state#>'{profile,credits}') <> 'number' THEN RAISE EXCEPTION 'SECURITY_CREDITS_FORMAT'; END IF;
 END IF;
 IF coalesce(new.state->'profile','{}'::jsonb) ? 'uridium' THEN
  IF jsonb_typeof(new.state#>'{profile,uridium}') <> 'number' THEN RAISE EXCEPTION 'SECURITY_STL_FORMAT'; END IF;
 END IF;
 v_credits:=coalesce((new.state#>>'{profile,credits}')::numeric,0);
 v_stl:=coalesce((new.state#>>'{profile,uridium}')::numeric,0);
 IF v_credits<0 OR v_credits>1000000000000 OR v_stl<0 OR v_stl>10000000000 THEN RAISE EXCEPTION 'SECURITY_BALANCE_RANGE'; END IF;
 IF TG_OP='UPDATE' THEN
  IF old.state IS NOT NULL THEN
   v_old_credits:=coalesce((old.state#>>'{profile,credits}')::numeric,0);
   v_old_stl:=coalesce((old.state#>>'{profile,uridium}')::numeric,0);
   IF v_credits-v_old_credits>100000000 OR v_stl-v_old_stl>1000000 THEN
     RAISE EXCEPTION 'SECURITY_UNVERIFIED_BALANCE_INCREASE';
   END IF;
  END IF;
 END IF;
 RETURN new;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
 RAISE EXCEPTION 'SECURITY_INVALID_ECONOMY_FORMAT';
END; $$;
DROP TRIGGER IF EXISTS stellar_save_antifraud_v226 ON public.game_saves;
CREATE TRIGGER stellar_save_antifraud_v226 BEFORE UPDATE OF state ON public.game_saves
FOR EACH ROW EXECUTE FUNCTION public.stellar_guard_saves_antifraud_v226();
CREATE TRIGGER stellar_save_antifraud_insert_v226 BEFORE INSERT ON public.game_saves
FOR EACH ROW EXECUTE FUNCTION public.stellar_guard_saves_antifraud_v226();
COMMIT;
