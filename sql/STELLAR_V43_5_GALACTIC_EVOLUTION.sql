BEGIN;
-- Expansão aditiva. Nenhuma alteração em game_saves, saldos existentes ou relés.
DO $$ BEGIN
 IF to_regclass('public.stellar_u423_module_rules') IS NULL OR to_regclass('public.stellar_u42_research') IS NULL OR to_regclass('public.stellar_npc_reward_ledger') IS NULL OR to_regclass('public.stellar_u42_squad_members') IS NULL THEN
  RAISE EXCEPTION 'PREVIOUS_EXPANSIONS_REQUIRED';
 END IF;
END $$;

CREATE OR REPLACE FUNCTION public.stellar_u435_admin_module(p_code text,p_enabled boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_game_admin_v1763(auth.uid()) THEN RAISE EXCEPTION 'ADMIN_ONLY' USING ERRCODE='42501'; END IF;
 IF p_code NOT IN ('astral_guard','nexus_drive','eclipse_lance','trinity_matrix') OR p_enabled IS NULL THEN RAISE EXCEPTION 'INVALID_MODULE'; END IF;
 UPDATE public.stellar_u423_module_rules SET combat_enabled=p_enabled,updated_at=now() WHERE item=p_code;
 IF NOT FOUND THEN RAISE EXCEPTION 'MODULE_NOT_FOUND'; END IF;
 RETURN jsonb_build_object('ok',true,'item',p_code,'enabled',p_enabled);
END $$;
REVOKE ALL ON FUNCTION public.stellar_u435_admin_module(text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_u435_admin_module(text,boolean) TO authenticated;

CREATE TABLE IF NOT EXISTS public.stellar_u435_raid_config(
 id integer PRIMARY KEY DEFAULT 1 CHECK(id=1), target_kills integer NOT NULL DEFAULT 3 CHECK(target_kills BETWEEN 1 AND 50),
 min_player_kills integer NOT NULL DEFAULT 1 CHECK(min_player_kills BETWEEN 1 AND 10),
 research_reward integer NOT NULL DEFAULT 120 CHECK(research_reward BETWEEN 1 AND 5000),
 enabled boolean NOT NULL DEFAULT true, updated_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.stellar_u435_raid_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stellar_u435_raid_config FROM PUBLIC,anon,authenticated;
INSERT INTO public.stellar_u435_raid_config(id) VALUES(1) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.stellar_u435_raid_claims(
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 week_start date NOT NULL,
 squad_id uuid NOT NULL, -- preserva histórico mesmo que o esquadrão seja encerrado
 personal_kills bigint NOT NULL,
 squad_kills bigint NOT NULL,
 reward integer NOT NULL,
 claimed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,week_start));
ALTER TABLE public.stellar_u435_raid_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stellar_u435_raid_claims FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.stellar_u435_raid_snapshot()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $$
DECLARE u uuid:=auth.uid(); sq uuid; wk date;
 total bigint:=0; mine bigint:=0; cfg record; done boolean:=false;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'SESSION_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT * INTO cfg FROM public.stellar_u435_raid_config WHERE id=1;
 wk:=(timezone('America/Sao_Paulo',now()))::date -(extract(isodow from timezone('America/Sao_Paulo',now()))::int-1);
 SELECT squad_id INTO sq FROM public.stellar_u42_squad_members WHERE user_id=u;
 IF sq IS NULL THEN RETURN jsonb_build_object('ok',true,'inSquad',false,'ready',false,'target',cfg.target_kills,'minimum',cfg.min_player_kills,'reward',cfg.research_reward,'enabled',cfg.enabled); END IF;
 SELECT count(DISTINCT n.kill_key),count(DISTINCT n.kill_key) FILTER(WHERE n.user_id=u)
 INTO total,mine
 FROM public.stellar_npc_reward_ledger n
 JOIN public.stellar_u42_squad_members m ON m.user_id=n.user_id AND m.squad_id=sq
 WHERE n.npc_type LIKE 'boss%' AND n.issued_at>=wk::timestamp AT TIME ZONE 'America/Sao_Paulo'
 AND n.issued_at>=m.joined_at;
 SELECT EXISTS(SELECT 1 FROM public.stellar_u435_raid_claims c WHERE c.user_id=u AND c.week_start=wk) INTO done;
 RETURN jsonb_build_object('ok',true,'inSquad',true,'squadId',sq,'kills',total,'personal',mine,'target',cfg.target_kills,
 'minimum',cfg.min_player_kills,'reward',cfg.research_reward,'enabled',cfg.enabled,'claimed',done,
 'ready',cfg.enabled AND total>=cfg.target_kills AND mine>=cfg.min_player_kills AND NOT done);
END $$;
REVOKE ALL ON FUNCTION public.stellar_u435_raid_snapshot() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_u435_raid_snapshot() TO authenticated;

CREATE OR REPLACE FUNCTION public.stellar_u435_raid_claim()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE u uuid:=auth.uid(); row jsonb; wk date; sq uuid; reward integer;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'SESSION_REQUIRED' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('stellar_raid_435:'||u::text));
 row:=public.stellar_u435_raid_snapshot();
 IF coalesce((row->>'ready')::boolean,false) IS DISTINCT FROM true THEN RAISE EXCEPTION 'RAID_NOT_READY_OR_CLAIMED'; END IF;
 wk:=(timezone('America/Sao_Paulo',now()))::date -(extract(isodow from timezone('America/Sao_Paulo',now()))::int-1);
 sq:=(row->>'squadId')::uuid; reward:=(row->>'reward')::integer;
 INSERT INTO public.stellar_u435_raid_claims(user_id,week_start,squad_id,personal_kills,squad_kills,reward)
 VALUES(u,wk,sq,(row->>'personal')::bigint,(row->>'kills')::bigint,reward);
 INSERT INTO public.stellar_u42_research(user_id,points) VALUES(u,reward)
 ON CONFLICT(user_id) DO UPDATE SET points=least(100000000,public.stellar_u42_research.points+excluded.points),updated_at=now();
 RETURN jsonb_build_object('ok',true,'reward',reward,'weekStart',wk);
END $$;
REVOKE ALL ON FUNCTION public.stellar_u435_raid_claim() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_u435_raid_claim() TO authenticated;
CREATE OR REPLACE FUNCTION public.stellar_u435_raid_admin(p_target integer,p_minimum integer,p_reward integer,p_enabled boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_game_admin_v1763(auth.uid()) THEN RAISE EXCEPTION 'ADMIN_ONLY' USING ERRCODE='42501'; END IF;
 IF p_target NOT BETWEEN 1 AND 50 OR p_minimum NOT BETWEEN 1 AND 10 OR p_reward NOT BETWEEN 1 AND 5000 OR p_enabled IS NULL THEN RAISE EXCEPTION 'INVALID_RAID_RULES'; END IF;
 UPDATE public.stellar_u435_raid_config SET target_kills=p_target,min_player_kills=p_minimum,research_reward=p_reward,enabled=p_enabled,updated_at=now() WHERE id=1;
 RETURN jsonb_build_object('ok',true);
END $$;
REVOKE ALL ON FUNCTION public.stellar_u435_raid_admin(integer,integer,integer,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_u435_raid_admin(integer,integer,integer,boolean) TO authenticated;
COMMIT;
