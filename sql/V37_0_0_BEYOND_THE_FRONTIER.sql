-- STELLAR LEGACY V37.0.0 • BEYOND THE FRONTIER
-- Execute SOMENTE depois que o código V37.0.0 estiver Live.
-- Usa exclusivamente recibos de NPC/mineração emitidos pelo servidor e não altera saves durante instalação.
BEGIN;
DO $preflight$
BEGIN
 IF to_regclass('public.game_saves') IS NULL OR to_regclass('public.stellar_npc_reward_ledger') IS NULL
 OR to_regclass('public.stellar_ore_reward_ledger') IS NULL OR to_regclass('public.stellar_dominion_rules_v360') IS NULL
 OR to_regclass('public.clan_members') IS NULL THEN RAISE EXCEPTION 'FRONTIER_V37_REQUIRES_V36_AND_REWARD_LEDGERS';END IF;
END;$preflight$;
CREATE TABLE IF NOT EXISTS public.stellar_frontier_contracts_v370 (
 id text PRIMARY KEY CHECK (id ~ '^[a-z0-9_]{3,36}$'),
 title text NOT NULL CHECK (length(title) BETWEEN 3 AND 80),
 sector text NOT NULL CHECK (sector IN ('x6','x7','x8')),
 min_level integer NOT NULL CHECK (min_level BETWEEN 1 AND 70),
 task_kind text NOT NULL CHECK (task_kind IN ('npc','ore')),
 target_type text NOT NULL CHECK (length(target_type) BETWEEN 2 AND 50),
 target_count integer NOT NULL CHECK (target_count BETWEEN 1 AND 250),
 reward_credits integer NOT NULL CHECK (reward_credits BETWEEN 0 AND 3000000),
 reward_stl integer NOT NULL CHECK (reward_stl BETWEEN 0 AND 10000),
 reward_shards integer NOT NULL CHECK (reward_shards BETWEEN 1 AND 20),
 enabled boolean NOT NULL DEFAULT true,
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.stellar_frontier_contracts_v370(id,title,sector,min_level,task_kind,target_type,target_count,reward_credits,reward_stl,reward_shards)
VALUES
 ('void_patrol','Patrulha do Desfiladeiro','x6',22,'npc','voidCorsair',12,250000,350,2),
 ('nexus_guard','Guardiões do Nexus','x7',27,'npc','nexusWarden',10,400000,500,3),
 ('astral_prime','Caçada ao Ceifador Prime','x8',32,'npc','bossAstralReaper',3,750000,800,5),
 ('deep_mining','Prospecção de Cristais','x8',32,'ore','Terbium',24,220000,280,2)
ON CONFLICT(id) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.stellar_frontier_ship_tech_v370 (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 level integer NOT NULL DEFAULT 1 CHECK(level BETWEEN 1 AND 3),
 shards integer NOT NULL DEFAULT 0 CHECK(shards BETWEEN 0 AND 100000),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.stellar_frontier_claims_v370 (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 contract_id text NOT NULL REFERENCES public.stellar_frontier_contracts_v370(id),
 week_start date NOT NULL,
 credits bigint NOT NULL CHECK(credits BETWEEN 0 AND 5000000),
 stl integer NOT NULL CHECK(stl BETWEEN 0 AND 15000),
 shards integer NOT NULL CHECK(shards BETWEEN 1 AND 20),
 claimed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,contract_id,week_start)
);
CREATE TABLE IF NOT EXISTS public.stellar_frontier_clan_claims_v370 (
 clan_id uuid NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
 week_start date NOT NULL,
 actor uuid NOT NULL,
 credits integer NOT NULL CHECK(credits BETWEEN 0 AND 500000),
 claimed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(clan_id,week_start)
);
CREATE INDEX IF NOT EXISTS stellar_frontier_npc_receipts_v370 ON public.stellar_npc_reward_ledger(user_id,npc_type,issued_at DESC);
CREATE INDEX IF NOT EXISTS stellar_frontier_ore_receipts_v370 ON public.stellar_ore_reward_ledger(user_id,resource,issued_at DESC);
CREATE INDEX IF NOT EXISTS stellar_frontier_npc_clan_v370 ON public.stellar_npc_reward_ledger(npc_type,issued_at DESC);
ALTER TABLE public.stellar_frontier_contracts_v370 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stellar_frontier_ship_tech_v370 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stellar_frontier_claims_v370 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stellar_frontier_clan_claims_v370 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stellar_frontier_contracts_v370,public.stellar_frontier_ship_tech_v370,public.stellar_frontier_claims_v370,public.stellar_frontier_clan_claims_v370 FROM PUBLIC,anon,authenticated;
GRANT SELECT,UPDATE ON public.stellar_frontier_contracts_v370 TO service_role;
GRANT SELECT ON public.stellar_frontier_ship_tech_v370,public.stellar_frontier_claims_v370,public.stellar_frontier_clan_claims_v370 TO service_role;
-- Estado da exploração: somente contratos e contadores confirmados pelo servidor.
CREATE OR REPLACE FUNCTION public.stellar_frontier_state_v370()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE uid uuid:=auth.uid(); s jsonb; p date; r public.stellar_frontier_contracts_v370; row_json jsonb; contracts jsonb:='[]'::jsonb;
 cnt bigint; userlevel integer; tech public.stellar_frontier_ship_tech_v370; cid uuid; team_kills bigint:=0; team_claimed boolean:=false;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED';END IF;
 SELECT state INTO s FROM public.game_saves WHERE user_id=uid;
 IF NOT FOUND THEN RAISE EXCEPTION 'FRONTIER_SAVE_MISSING';END IF;
 userlevel:=coalesce((s#>>'{profile,level}')::integer,1);
 p:=date_trunc('week',now() AT TIME ZONE 'America/Sao_Paulo')::date;
 SELECT * INTO tech FROM public.stellar_frontier_ship_tech_v370 WHERE user_id=uid;
 FOR r IN SELECT * FROM public.stellar_frontier_contracts_v370 ORDER BY min_level,id LOOP
  IF r.task_kind='npc' THEN
   SELECT count(*) INTO cnt FROM public.stellar_npc_reward_ledger n
   WHERE n.user_id=uid AND n.npc_type=r.target_type AND n.issued_at>=(p::timestamp AT TIME ZONE 'America/Sao_Paulo');
  ELSE
   SELECT count(*) INTO cnt FROM public.stellar_ore_reward_ledger o
   WHERE o.user_id=uid AND o.resource=r.target_type AND o.issued_at>=(p::timestamp AT TIME ZONE 'America/Sao_Paulo');
  END IF;
  row_json:=jsonb_build_object('id',r.id,'title',r.title,'sector',r.sector,'minLevel',r.min_level,
   'kind',r.task_kind,'targetType',r.target_type,'count',least(cnt,r.target_count),'target',r.target_count,
   'credits',r.reward_credits,'stl',r.reward_stl,'shards',r.reward_shards,'unlocked',userlevel>=r.min_level,
   'enabled',r.enabled,'claimed',EXISTS(SELECT 1 FROM public.stellar_frontier_claims_v370 c WHERE c.user_id=uid AND c.contract_id=r.id AND c.week_start=p));
  contracts:=contracts||jsonb_build_array(row_json);
 END LOOP;
 SELECT cm.clan_id INTO cid FROM public.clan_members cm WHERE cm.user_id=uid;
 IF cid IS NOT NULL THEN
  SELECT count(*) INTO team_kills FROM public.stellar_npc_reward_ledger n
  JOIN public.clan_members cm ON cm.user_id=n.user_id
  WHERE cm.clan_id=cid AND n.npc_type IN ('bossVoidCorsair','bossNexusWarden','bossAstralReaper')
    AND n.issued_at>=(p::timestamp AT TIME ZONE 'America/Sao_Paulo');
  SELECT EXISTS(SELECT 1 FROM public.stellar_frontier_clan_claims_v370 c WHERE c.clan_id=cid AND c.week_start=p) INTO team_claimed;
 END IF;
 RETURN jsonb_build_object('ok',true,'week',p,'level',userlevel,'contracts',contracts,
 'tech',jsonb_build_object('level',coalesce(tech.level,1),'shards',coalesce(tech.shards,0),'nextCost',CASE coalesce(tech.level,1) WHEN 1 THEN 5 WHEN 2 THEN 15 ELSE 0 END),
 'clan',jsonb_build_object('kills',least(team_kills,8),'target',8,'claimed',team_claimed,'hasClan',cid IS NOT NULL),
 'serverTime',now());
END;$fn$;
-- Uma recompensa por contrato por semana. Nenhum dado de recompensa vem do cliente.
CREATE OR REPLACE FUNCTION public.stellar_frontier_claim_v370(p_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE uid uuid:=auth.uid(); r public.stellar_frontier_contracts_v370; s jsonb; tech public.stellar_frontier_ship_tech_v370;
 p date; cnt bigint; inserted integer; reward_cr bigint;reward_stl bigint; current_cr bigint;current_stl bigint; rev bigint; new_shards integer;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
 SELECT state INTO s FROM public.game_saves WHERE user_id=uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'FRONTIER_SAVE_MISSING';END IF;
 SELECT * INTO r FROM public.stellar_frontier_contracts_v370 WHERE id=p_id AND enabled FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'FRONTIER_CONTRACT_MISSING';END IF;
 IF coalesce((s#>>'{profile,level}')::integer,1)<r.min_level THEN RAISE EXCEPTION 'FRONTIER_LEVEL_REQUIRED';END IF;
 p:=date_trunc('week',now() AT TIME ZONE 'America/Sao_Paulo')::date;
 IF r.task_kind='npc' THEN
  SELECT count(*) INTO cnt FROM public.stellar_npc_reward_ledger n WHERE n.user_id=uid AND n.npc_type=r.target_type AND n.issued_at>=(p::timestamp AT TIME ZONE 'America/Sao_Paulo');
 ELSE
  SELECT count(*) INTO cnt FROM public.stellar_ore_reward_ledger o WHERE o.user_id=uid AND o.resource=r.target_type AND o.issued_at>=(p::timestamp AT TIME ZONE 'America/Sao_Paulo');
 END IF;
 IF cnt<r.target_count THEN RAISE EXCEPTION 'FRONTIER_OBJECTIVE_INCOMPLETE';END IF;
 INSERT INTO public.stellar_frontier_ship_tech_v370(user_id) VALUES(uid) ON CONFLICT(user_id) DO NOTHING;
 SELECT * INTO tech FROM public.stellar_frontier_ship_tech_v370 WHERE user_id=uid FOR UPDATE;
 reward_cr:=round(r.reward_credits*(1+(tech.level-1)*0.1));reward_stl:=round(r.reward_stl*(1+(tech.level-1)*0.1));
 current_cr:=coalesce((s#>>'{profile,credits}')::bigint,0);current_stl:=coalesce((s#>>'{profile,uridium}')::bigint,0);
 rev:=coalesce((s->>'serverNpcRewardRevision')::bigint,0);
 IF current_cr+reward_cr>1000000000000 OR current_stl+reward_stl>10000000000 OR rev>=1000000000 THEN RAISE EXCEPTION 'FRONTIER_BALANCE_LIMIT';END IF;
 INSERT INTO public.stellar_frontier_claims_v370(user_id,contract_id,week_start,credits,stl,shards)
 VALUES(uid,p_id,p,reward_cr,reward_stl,r.reward_shards) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS inserted=ROW_COUNT;
 IF inserted<>1 THEN RAISE EXCEPTION 'FRONTIER_ALREADY_CLAIMED';END IF;
 UPDATE public.stellar_frontier_ship_tech_v370 SET shards=shards+r.reward_shards,updated_at=now() WHERE user_id=uid;
 UPDATE public.game_saves SET state=jsonb_set(jsonb_set(jsonb_set(s,'{profile,credits}',to_jsonb(current_cr+reward_cr),true),'{profile,uridium}',to_jsonb(current_stl+reward_stl),true),'{serverNpcRewardRevision}',to_jsonb(rev+1),true),updated_at=now() WHERE user_id=uid;
 UPDATE public.profiles SET credits=current_cr+reward_cr,uridium=current_stl+reward_stl,updated_at=now() WHERE id=uid;
 RETURN jsonb_build_object('ok',true,'credits',reward_cr,'stl',reward_stl,'shards',r.reward_shards,'revision',rev+1,'contract',p_id);
END;$fn$;
-- Craft da nave: Módulo Explorador LV1 a LV3; bonifica pagamentos futuros de expedição (+10%/LV), nunca HP/PvP.
CREATE OR REPLACE FUNCTION public.stellar_frontier_craft_v370()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE uid uuid:=auth.uid(); tech public.stellar_frontier_ship_tech_v370; cost integer;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED';END IF;
 INSERT INTO public.stellar_frontier_ship_tech_v370(user_id) VALUES(uid) ON CONFLICT(user_id) DO NOTHING;
 SELECT * INTO tech FROM public.stellar_frontier_ship_tech_v370 WHERE user_id=uid FOR UPDATE;
 IF tech.level>=3 THEN RAISE EXCEPTION 'FRONTIER_TECH_MAX_LEVEL';END IF;
 cost:=CASE tech.level WHEN 1 THEN 5 ELSE 15 END;
 IF tech.shards<cost THEN RAISE EXCEPTION 'FRONTIER_INSUFFICIENT_SHARDS';END IF;
 UPDATE public.stellar_frontier_ship_tech_v370 SET level=level+1,shards=shards-cost,updated_at=now() WHERE user_id=uid;
 RETURN jsonb_build_object('ok',true,'level',tech.level+1,'spent',cost);
END;$fn$;
-- Objetivo cooperativo: 8 boss kills confirmados por recibos, uma transferência ao cofre por semana.
CREATE OR REPLACE FUNCTION public.stellar_frontier_clan_claim_v370()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE uid uuid:=auth.uid(); cl public.clans; kills integer; week date; inserted integer;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED';END IF;
 SELECT * INTO cl FROM public.clans WHERE owner_id=uid ORDER BY created_at LIMIT 1 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'FRONTIER_ONLY_CLAN_OWNER';END IF;
 week:=date_trunc('week',now() AT TIME ZONE 'America/Sao_Paulo')::date;
 SELECT count(*) INTO kills FROM public.stellar_npc_reward_ledger n JOIN public.clan_members cm ON cm.user_id=n.user_id
 WHERE cm.clan_id=cl.id AND n.npc_type IN ('bossVoidCorsair','bossNexusWarden','bossAstralReaper')
 AND n.issued_at>=(week::timestamp AT TIME ZONE 'America/Sao_Paulo');
 IF kills<8 THEN RAISE EXCEPTION 'FRONTIER_CLAN_OBJECTIVE_INCOMPLETE'; END IF;
 INSERT INTO public.stellar_frontier_clan_claims_v370(clan_id,week_start,actor,credits)
 VALUES(cl.id,week,uid,125000) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS inserted=ROW_COUNT;
 IF inserted<>1 THEN RAISE EXCEPTION 'FRONTIER_CLAN_ALREADY_CLAIMED';END IF;
 UPDATE public.clans SET vault_credits=vault_credits+125000,updated_at=now() WHERE id=cl.id;
 RETURN jsonb_build_object('ok',true,'credits',125000,'week',week);
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_frontier_state_v370() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.stellar_frontier_claim_v370(text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.stellar_frontier_craft_v370() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.stellar_frontier_clan_claim_v370() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_frontier_state_v370() TO authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_frontier_claim_v370(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_frontier_craft_v370() TO authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_frontier_clan_claim_v370() TO authenticated;
COMMIT;
