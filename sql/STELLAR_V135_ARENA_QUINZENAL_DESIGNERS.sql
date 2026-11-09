-- V135.0 — Arena competitiva 14 dias, títulos com validade, aposentadoria não destrutiva dos designs antigos.
-- Calendário fixo: segunda 09/11/2026 00h São Paulo (UTC-3); corte a cada 14 dias.
-- O histórico vitalício e o rating legado NUNCA são zerados.
BEGIN;

CREATE TABLE IF NOT EXISTS public.stellar_arena_titles_v135 (
 season_start timestamptz NOT NULL,
 user_id uuid NOT NULL,
 season_rank integer NOT NULL CHECK (season_rank BETWEEN 1 AND 10),
 title text NOT NULL,
 granted_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 PRIMARY KEY (season_start,user_id)
);
ALTER TABLE public.stellar_arena_titles_v135 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stellar_arena_titles_v135 FROM PUBLIC,anon,authenticated;
CREATE TABLE IF NOT EXISTS public.stellar_arena_closed_v135 (
 season_start timestamptz PRIMARY KEY,
 closed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stellar_arena_closed_v135 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stellar_arena_closed_v135 FROM PUBLIC,anon,authenticated;
CREATE INDEX IF NOT EXISTS idx_arena_battles_v135_season ON public.arena_battles(created_at,attacker_id,winner_id);

-- Apenas ataques iniciados por pilotos não ADM contam; evita farm ilimitado.
CREATE OR REPLACE FUNCTION public.stellar_arena_ranking_v135(p_start timestamptz)
RETURNS TABLE(user_id uuid,callsign text,wins bigint,losses bigint,points bigint,place bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
WITH scores AS (
 SELECT b.attacker_id AS uid,
 sum(CASE WHEN b.winner_id=b.attacker_id THEN 1 ELSE 0 END)::bigint AS w,
 sum(CASE WHEN b.winner_id IS DISTINCT FROM b.attacker_id THEN 1 ELSE 0 END)::bigint AS l,
 max(b.created_at) AS last_battle
 FROM public.arena_battles b
 WHERE b.created_at>=p_start AND b.created_at<p_start+interval '14 days'
 AND NOT EXISTS(SELECT 1 FROM public.game_admins adm WHERE adm.user_id=b.attacker_id)
 GROUP BY b.attacker_id
), ranked AS (
 SELECT s.uid,s.w,s.l,greatest(0,s.w*100-s.l*10)::bigint AS score,
 row_number() OVER(ORDER BY greatest(0,s.w*100-s.l*10) DESC,s.w DESC,s.l ASC,s.last_battle ASC,s.uid) AS rank_no
 FROM scores s WHERE s.w>0
)
SELECT r.uid,coalesce(nullif(p.callsign,''),'Piloto')::text,r.w,r.l,r.score,r.rank_no
FROM ranked r LEFT JOIN public.arena_profiles p ON p.user_id=r.uid
ORDER BY r.rank_no;
$fn$;
REVOKE ALL ON FUNCTION public.stellar_arena_ranking_v135(timestamptz) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.stellar_arena_close_v135(p_start timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
 IF p_start < '2026-11-09 03:00:00+00'::timestamptz THEN RETURN; END IF;
 IF p_start+interval '14 days'>now() THEN RETURN; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('stellar-arena-v135:'||p_start::text));
 IF EXISTS(SELECT 1 FROM public.stellar_arena_closed_v135 WHERE season_start=p_start) THEN RETURN; END IF;
 INSERT INTO public.stellar_arena_titles_v135(season_start,user_id,season_rank,title,expires_at)
 SELECT p_start,r.user_id,r.place::int,
 CASE r.place WHEN 1 THEN 'Imperador da Arena' WHEN 2 THEN 'Lenda da Arena' WHEN 3 THEN 'Elite da Arena' ELSE 'Gladiador da Arena' END,
 p_start+interval '28 days'
 FROM public.stellar_arena_ranking_v135(p_start) r WHERE r.place<=10
 ON CONFLICT (season_start,user_id) DO NOTHING;
 INSERT INTO public.stellar_arena_closed_v135(season_start) VALUES(p_start) ON CONFLICT DO NOTHING;
END;
$fn$;
REVOKE ALL ON FUNCTION public.stellar_arena_close_v135(timestamptz) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.stellar_arena_status_v135()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE
 v_uid uuid:=auth.uid();
 v_now timestamptz:=now();
 v_anchor timestamptz:='2026-11-09 03:00:00+00'::timestamptz;
 v_cycle integer;
 v_start timestamptz;
 v_last timestamptz;
 v_ranking jsonb;
 v_mine jsonb;
 v_title jsonb;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória'; END IF;
 v_cycle:=greatest(0,floor(extract(epoch from (v_now-v_anchor))/1209600)::int);
 v_start:=v_anchor+make_interval(days=>v_cycle*14);
 v_last:=v_start-interval '14 days';
 IF v_start>v_anchor THEN PERFORM public.stellar_arena_close_v135(v_last); END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('user_id',r.user_id,'callsign',r.callsign,'wins',r.wins,'losses',r.losses,'points',r.points,'rank',r.place) ORDER BY r.place),'[]'::jsonb)
 INTO v_ranking FROM public.stellar_arena_ranking_v135(v_start) r WHERE r.place<=10;
 SELECT jsonb_build_object('rank',r.place,'wins',r.wins,'losses',r.losses,'points',r.points)
 INTO v_mine FROM public.stellar_arena_ranking_v135(v_start) r WHERE r.user_id=v_uid;
 SELECT jsonb_build_object('title',t.title,'rank',t.season_rank,'granted_at',t.granted_at,'expires_at',t.expires_at,'season_start',t.season_start)
 INTO v_title FROM public.stellar_arena_titles_v135 t
 WHERE t.user_id=v_uid AND t.expires_at>v_now
 ORDER BY t.season_start DESC LIMIT 1;
 RETURN jsonb_build_object('starts_at',v_start,'ends_at',v_start+interval '14 days','days',14,
 'ranking',v_ranking,'me',v_mine,'title',v_title,'server_time',v_now);
END;
$fn$;
REVOKE ALL ON FUNCTION public.stellar_arena_status_v135() FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.stellar_arena_status_v135() TO authenticated;

-- The V134 wrapper only returned full state when the legacy RPC already included it;
-- legacy claim does not. Always attach the transaction-committed state to avoid client saldo patches.
CREATE OR REPLACE FUNCTION public.stellar_player_claim_arena_daily_reward()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE r jsonb;s jsonb;t timestamptz;
BEGIN
 r:=public.claim_arena_daily_reward();
 SELECT state,updated_at INTO s,t FROM public.game_saves WHERE user_id=auth.uid();
 IF s IS NOT NULL THEN
  r:=r||jsonb_build_object('state',s,'updated_at',t,'save_token',md5(s::text));
 END IF;
 RETURN r;
END;
$fn$;

-- Preserva inventários de itens adquiridos e designers do AUX/drones. Apenas aposenta os visuais de nave antigos.
UPDATE public.live_designs_v16 SET enabled=false WHERE kind='ship' AND design_id NOT IN (
 'n132_aegis_solstice','n132_citadel_arctic','n132_defcom_midnight','n132_spearhead_orion',
 'n132_yamato_crimson','n132_spearhead_cristal','n132_yamato_vulcao');
COMMIT;
