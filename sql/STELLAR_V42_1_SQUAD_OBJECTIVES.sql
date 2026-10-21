-- Stellar Legacy V42.1.0 — Esquadrões: objetivos semanais com abates verificados
-- Migração incremental sem sobrescrever saves, recompensas ou catálogo V42.0.
BEGIN;
CREATE TABLE IF NOT EXISTS public.stellar_u42_squad_objective_config_v421 (
 id smallint PRIMARY KEY DEFAULT 1 CHECK(id=1),
 weekly_kills integer NOT NULL DEFAULT 100 CHECK(weekly_kills BETWEEN 20 AND 10000),
 minimum_player_kills integer NOT NULL DEFAULT 10 CHECK(minimum_player_kills BETWEEN 1 AND 1000),
 research_points integer NOT NULL DEFAULT 60 CHECK(research_points BETWEEN 1 AND 1000),
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.stellar_u42_squad_objective_config_v421(id) VALUES(1) ON CONFLICT(id) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.stellar_u42_squad_objective_claims_v421 (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 week_start date NOT NULL,
 squad_id uuid NOT NULL, -- registro histórico continua mesmo após dissolver o esquadrão
 credited_kills bigint NOT NULL CHECK(credited_kills>=0),
 granted_research integer NOT NULL CHECK(granted_research>=0),
 claimed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,week_start)
);
CREATE INDEX IF NOT EXISTS stellar_u42_squad_objective_claims_idx ON public.stellar_u42_squad_objective_claims_v421(squad_id,claimed_at DESC);
ALTER TABLE public.stellar_u42_squad_objective_config_v421 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stellar_u42_squad_objective_claims_v421 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stellar_u42_squad_objective_config_v421 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.stellar_u42_squad_objective_claims_v421 FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.stellar_u42_squad_objective_v421()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $fn$
DECLARE
 u uuid:=auth.uid(); v_squad uuid; v_week date:=(date_trunc('week',now() AT TIME ZONE 'UTC'))::date;
 v_total bigint:=0; v_personal bigint:=0; v_goal integer; v_min integer; v_reward integer;
 v_claimed boolean:=false; v_team jsonb:='[]'::jsonb;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'SESSION_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT m.squad_id INTO v_squad FROM public.stellar_u42_squad_members m WHERE m.user_id=u;
 SELECT weekly_kills,minimum_player_kills,research_points INTO v_goal,v_min,v_reward
 FROM public.stellar_u42_squad_objective_config_v421 WHERE id=1;
 IF v_squad IS NULL THEN
  RETURN jsonb_build_object('inSquad',false,'weekStart',v_week,'goal',v_goal,'minimumPersonal',v_min,'rewardResearch',v_reward);
 END IF;
 SELECT coalesce(sum(kills),0),coalesce(max(kills) FILTER (WHERE player_id=u),0),
        coalesce(jsonb_agg(jsonb_build_object('callsign',callsign,'kills',kills) ORDER BY kills DESC),'[]'::jsonb)
 INTO v_total,v_personal,v_team
 FROM (
  SELECT m.user_id AS player_id,p.callsign, count(n.kill_key)::bigint AS kills
  FROM public.stellar_u42_squad_members m
  JOIN public.stellar_u42_squads s ON s.id=m.squad_id
  LEFT JOIN public.profiles p ON p.id=m.user_id
  LEFT JOIN public.stellar_npc_reward_ledger n ON n.user_id=m.user_id
    AND n.issued_at >= GREATEST(v_week::timestamptz,m.joined_at,s.created_at)
  WHERE m.squad_id=v_squad
  GROUP BY m.user_id,p.callsign
 ) team;
 SELECT EXISTS(SELECT 1 FROM public.stellar_u42_squad_objective_claims_v421
 WHERE user_id=u AND week_start=v_week) INTO v_claimed;
 RETURN jsonb_build_object('inSquad',true,'weekStart',v_week,'goal',v_goal,'minimumPersonal',v_min,
 'rewardResearch',v_reward,'verifiedKills',v_total,'personalKills',v_personal,'team',v_team,
 'claimed',v_claimed,'eligible',NOT v_claimed AND v_total>=v_goal AND v_personal>=v_min);
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_u42_squad_objective_v421() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_u42_squad_objective_v421() TO authenticated;

CREATE OR REPLACE FUNCTION public.stellar_u42_squad_claim_v421()
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $fn$
DECLARE
 u uuid:=auth.uid(); progress jsonb; v_week date; v_squad uuid; v_new uuid; v_reward integer; v_kills bigint;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'SESSION_REQUIRED' USING ERRCODE='42501'; END IF;
 progress:=public.stellar_u42_squad_objective_v421();
 IF coalesce((progress->>'inSquad')::boolean,false) IS NOT TRUE THEN RAISE EXCEPTION 'SQUAD_REQUIRED'; END IF;
 IF coalesce((progress->>'claimed')::boolean,false) THEN RETURN jsonb_build_object('ok',true,'claimed',false,'alreadyClaimed',true); END IF;
 IF coalesce((progress->>'eligible')::boolean,false) IS NOT TRUE THEN RAISE EXCEPTION 'OBJECTIVE_NOT_MET'; END IF;
 v_week:=(progress->>'weekStart')::date;
 SELECT squad_id INTO v_squad FROM public.stellar_u42_squad_members WHERE user_id=u;
 v_reward:=(progress->>'rewardResearch')::integer;
 v_kills:=(progress->>'personalKills')::bigint;
 INSERT INTO public.stellar_u42_squad_objective_claims_v421(user_id,week_start,squad_id,credited_kills,granted_research)
 VALUES(u,v_week,v_squad,v_kills,v_reward)
 ON CONFLICT(user_id,week_start) DO NOTHING RETURNING user_id INTO v_new;
 IF v_new IS NULL THEN RETURN jsonb_build_object('ok',true,'claimed',false,'alreadyClaimed',true); END IF;
 INSERT INTO public.stellar_u42_research(user_id,points) VALUES(u,v_reward)
 ON CONFLICT(user_id) DO UPDATE SET points=public.stellar_u42_research.points+excluded.points,updated_at=now();
 RETURN jsonb_build_object('ok',true,'claimed',true,'rewardResearch',v_reward,'weekStart',v_week);
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_u42_squad_claim_v421() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_u42_squad_claim_v421() TO authenticated;

CREATE OR REPLACE FUNCTION public.stellar_u42_squad_config_v421(p_weekly_kills integer,p_minimum_player integer,p_reward integer)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_game_admin_v1763(auth.uid()) THEN
  RAISE EXCEPTION 'ADMIN_ONLY' USING ERRCODE='42501'; END IF;
 IF p_weekly_kills NOT BETWEEN 20 AND 10000 OR p_minimum_player NOT BETWEEN 1 AND 1000
  OR p_reward NOT BETWEEN 1 AND 1000 OR p_minimum_player>p_weekly_kills THEN
  RAISE EXCEPTION 'INVALID_CONFIG'; END IF;
 UPDATE public.stellar_u42_squad_objective_config_v421
 SET weekly_kills=p_weekly_kills,minimum_player_kills=p_minimum_player,research_points=p_reward,updated_at=now()
 WHERE id=1;
 RETURN jsonb_build_object('ok',true,'goal',p_weekly_kills,'minimumPersonal',p_minimum_player,'rewardResearch',p_reward);
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_u42_squad_config_v421(integer,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_u42_squad_config_v421(integer,integer,integer) TO authenticated;
COMMIT;
