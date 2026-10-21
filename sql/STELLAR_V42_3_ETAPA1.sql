-- STELLAR LEGACY 42.3 | ETAPA 1 | somente adicoes a V42.1
-- Aplicar antes do ZIP. Modulos de combate NAO recebem buffs automaticos.
BEGIN;
CREATE TABLE IF NOT EXISTS public.stellar_u423_module_rules (
 item text PRIMARY KEY REFERENCES public.stellar_u42_catalog(code),
 slot text NOT NULL CHECK (slot IN ('defense','engine','weapon','utility')),
 proposed_bonus jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(proposed_bonus)='object'),
 combat_enabled boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.stellar_u423_module_rules(item,slot,proposed_bonus) VALUES
 ('astral_guard','defense','{"shieldPercent":4}'::jsonb),
 ('nexus_drive','engine','{"speedPercent":3}'::jsonb),
 ('eclipse_lance','weapon','{"npcDamagePercent":4}'::jsonb),
 ('trinity_matrix','utility','{"shieldPercent":2,"speedPercent":2}'::jsonb)
ON CONFLICT(item) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.stellar_u423_loadouts (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 config smallint NOT NULL CHECK (config IN (1,2)),
 slot text NOT NULL CHECK (slot IN ('defense','engine','weapon','utility')),
 item text NOT NULL REFERENCES public.stellar_u423_module_rules(item),
 equipped_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (user_id,config,slot)
);
CREATE INDEX IF NOT EXISTS stellar_u423_loadout_item_idx ON public.stellar_u423_loadouts(user_id,item);
CREATE TABLE IF NOT EXISTS public.stellar_u423_ops_config (
 tier smallint PRIMARY KEY CHECK (tier IN (1,2,3)),
 goal_kills integer NOT NULL CHECK (goal_kills BETWEEN 10 AND 10000),
 personal_min integer NOT NULL CHECK (personal_min BETWEEN 1 AND 2000),
 research_points integer NOT NULL CHECK (research_points BETWEEN 1 AND 5000),
 enabled boolean NOT NULL DEFAULT true,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (personal_min<=goal_kills)
);
INSERT INTO public.stellar_u423_ops_config(tier,goal_kills,personal_min,research_points) VALUES
 (1,150,25,80),(2,400,60,200),(3,900,120,450)
ON CONFLICT(tier) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.stellar_u423_ops_claims (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 week_start date NOT NULL,
 tier smallint NOT NULL REFERENCES public.stellar_u423_ops_config(tier),
 squad_id uuid NOT NULL,
 personal_kills bigint NOT NULL,
 team_kills bigint NOT NULL,
 granted_research integer NOT NULL,
 claimed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (user_id,week_start,tier)
);
CREATE INDEX IF NOT EXISTS stellar_u423_ops_claim_history_idx ON public.stellar_u423_ops_claims(user_id,claimed_at DESC);
DO $ddl$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['stellar_u423_module_rules','stellar_u423_loadouts','stellar_u423_ops_config','stellar_u423_ops_claims'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC,anon,authenticated',t);
 END LOOP;
END $ddl$;

-- Exibe equipados e owned no servidor: nao aceita quantidade ou atributo enviado pelo navegador.
CREATE OR REPLACE FUNCTION public.stellar_u423_loadout_snapshot()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $fn$
DECLARE u uuid:=auth.uid();
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'SESSION_REQUIRED' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object(
 'items',(SELECT coalesce(jsonb_agg(jsonb_build_object('code',i.item,'qty',i.quantity)),'[]'::jsonb)
          FROM public.stellar_u42_inventory i WHERE i.user_id=u AND i.quantity>0),
 'definitions',(SELECT coalesce(jsonb_agg(jsonb_build_object('code',m.item,'slot',m.slot,'proposal',m.proposed_bonus,'combatEnabled',m.combat_enabled)),'[]'::jsonb)
                FROM public.stellar_u423_module_rules m),
 'equipped',(SELECT coalesce(jsonb_agg(jsonb_build_object('config',l.config,'slot',l.slot,'code',l.item)),'[]'::jsonb)
             FROM public.stellar_u423_loadouts l WHERE l.user_id=u));
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_u423_loadout_snapshot() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_u423_loadout_snapshot() TO authenticated;

CREATE OR REPLACE FUNCTION public.stellar_u423_equip(p_config integer,p_slot text,p_item text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $fn$
DECLARE u uuid:=auth.uid(); slot_found text; owned bigint; needed bigint;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'SESSION_REQUIRED' USING ERRCODE='42501'; END IF;
 IF p_config NOT IN (1,2) OR p_slot NOT IN ('defense','engine','weapon','utility')
    OR length(coalesce(p_item,''))>48 THEN RAISE EXCEPTION 'INVALID_LOADOUT'; END IF;
 -- Bloqueio da linha central impede equipagens simultaneas acima da quantidade fabricada.
 PERFORM 1 FROM public.game_saves WHERE user_id=u FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'SAVE_REQUIRED'; END IF;
 IF p_item IS NULL THEN
  DELETE FROM public.stellar_u423_loadouts WHERE user_id=u AND config=p_config AND slot=p_slot;
 ELSE
  SELECT m.slot INTO slot_found FROM public.stellar_u423_module_rules m WHERE m.item=p_item;
  IF slot_found IS DISTINCT FROM p_slot THEN RAISE EXCEPTION 'MODULE_SLOT_MISMATCH'; END IF;
  SELECT quantity INTO owned FROM public.stellar_u42_inventory WHERE user_id=u AND item=p_item;
  SELECT count(*) INTO needed FROM public.stellar_u423_loadouts
   WHERE user_id=u AND item=p_item AND NOT(config=p_config AND slot=p_slot);
  IF coalesce(owned,0)<=needed THEN RAISE EXCEPTION 'MODULE_NOT_OWNED_OR_BUSY'; END IF;
  INSERT INTO public.stellar_u423_loadouts(user_id,config,slot,item) VALUES(u,p_config,p_slot,p_item)
  ON CONFLICT(user_id,config,slot) DO UPDATE SET item=excluded.item,equipped_at=now();
 END IF;
 RETURN jsonb_build_object('ok',true,'config',p_config,'slot',p_slot,'item',p_item);
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_u423_equip(integer,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_u423_equip(integer,text,text) TO authenticated;

-- Operacao cooperativa baseada SOMENTE em ledger de abates do servidor, nunca no cliente.
CREATE OR REPLACE FUNCTION public.stellar_u423_operation_progress()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $fn$
DECLARE u uuid:=auth.uid(); s_id uuid; w date:=(date_trunc('week',now() AT TIME ZONE 'UTC'))::date;
 personal bigint:=0; team bigint:=0; tiers jsonb;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'SESSION_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT squad_id INTO s_id FROM public.stellar_u42_squad_members WHERE user_id=u;
 IF s_id IS NOT NULL THEN
  SELECT coalesce(sum(x.kills),0),coalesce(max(x.kills) FILTER (WHERE x.player=u),0)
  INTO team,personal FROM (
   SELECT m.user_id player,count(n.kill_key)::bigint kills
   FROM public.stellar_u42_squad_members m
   JOIN public.stellar_u42_squads s ON s.id=m.squad_id
   LEFT JOIN public.stellar_npc_reward_ledger n ON n.user_id=m.user_id
    AND n.issued_at>=GREATEST(w::timestamptz,m.joined_at,s.created_at)
   WHERE m.squad_id=s_id GROUP BY m.user_id
  ) x;
 END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('tier',c.tier,'goal',c.goal_kills,'mineRequired',c.personal_min,
  'reward',c.research_points,'enabled',c.enabled,'claimed',EXISTS(
   SELECT 1 FROM public.stellar_u423_ops_claims z WHERE z.user_id=u AND z.week_start=w AND z.tier=c.tier),
  'ready',(s_id IS NOT NULL AND c.enabled AND team>=c.goal_kills AND personal>=c.personal_min AND NOT EXISTS(
   SELECT 1 FROM public.stellar_u423_ops_claims z WHERE z.user_id=u AND z.week_start=w AND z.tier=c.tier))) ORDER BY c.tier),'[]'::jsonb)
 INTO tiers FROM public.stellar_u423_ops_config c;
 RETURN jsonb_build_object('inSquad',s_id IS NOT NULL,'weekStart',w,'teamKills',team,'personalKills',personal,'tiers',tiers);
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_u423_operation_progress() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_u423_operation_progress() TO authenticated;

CREATE OR REPLACE FUNCTION public.stellar_u423_operation_claim(p_tier integer)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $fn$
DECLARE u uuid:=auth.uid(); p jsonb; c jsonb; v_id uuid; w date; inserted uuid; v_kills bigint; v_team bigint;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'SESSION_REQUIRED' USING ERRCODE='42501'; END IF;
 IF p_tier NOT IN (1,2,3) THEN RAISE EXCEPTION 'INVALID_TIER'; END IF;
 -- A elegibilidade e apurada no banco; UNIQUE permite so um resgate por piloto/semana/tier.
 p:=public.stellar_u423_operation_progress();
 SELECT t.val INTO c FROM jsonb_array_elements(p->'tiers') AS t(val) WHERE (t.val->>'tier')::integer=p_tier;
 IF c IS NULL THEN RAISE EXCEPTION 'TIER_DISABLED'; END IF;
 IF (c->>'claimed')::boolean THEN RETURN jsonb_build_object('ok',true,'alreadyClaimed',true); END IF;
 IF NOT (c->>'ready')::boolean THEN RAISE EXCEPTION 'MISSION_INCOMPLETE'; END IF;
 w:=(p->>'weekStart')::date;
 v_kills:=(p->>'personalKills')::bigint;
 v_team:=(p->>'teamKills')::bigint;
 SELECT squad_id INTO v_id FROM public.stellar_u42_squad_members WHERE user_id=u;
 IF v_id IS NULL THEN RAISE EXCEPTION 'SQUAD_REQUIRED'; END IF;
 INSERT INTO public.stellar_u423_ops_claims(user_id,week_start,tier,squad_id,personal_kills,team_kills,granted_research)
 VALUES(u,w,p_tier,v_id,v_kills,v_team,(c->>'reward')::integer)
 ON CONFLICT(user_id,week_start,tier) DO NOTHING RETURNING user_id INTO inserted;
 IF inserted IS NULL THEN RETURN jsonb_build_object('ok',true,'alreadyClaimed',true); END IF;
 INSERT INTO public.stellar_u42_research(user_id,points) VALUES(u,(c->>'reward')::integer)
 ON CONFLICT(user_id) DO UPDATE SET points=public.stellar_u42_research.points+excluded.points,updated_at=now();
 RETURN jsonb_build_object('ok',true,'claimed',true,'tier',p_tier,'rewardResearch',(c->>'reward')::integer);
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_u423_operation_claim(integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_u423_operation_claim(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.stellar_u423_operation_admin(p_tier integer,p_goal integer,p_min integer,p_reward integer,p_enabled boolean)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_game_admin_v1763(auth.uid()) THEN
  RAISE EXCEPTION 'ADMIN_ONLY' USING ERRCODE='42501'; END IF;
 IF p_tier NOT IN (1,2,3) OR p_goal NOT BETWEEN 10 AND 10000 OR p_min NOT BETWEEN 1 AND 2000 OR p_min>p_goal
  OR p_reward NOT BETWEEN 1 AND 5000 OR p_enabled IS NULL THEN RAISE EXCEPTION 'INVALID_RULE'; END IF;
 UPDATE public.stellar_u423_ops_config SET goal_kills=p_goal,personal_min=p_min,research_points=p_reward,
 enabled=p_enabled,updated_at=now() WHERE tier=p_tier;
 RETURN jsonb_build_object('ok',true,'tier',p_tier);
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_u423_operation_admin(integer,integer,integer,integer,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_u423_operation_admin(integer,integer,integer,integer,boolean) TO authenticated;
COMMIT;
