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
