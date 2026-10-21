-- STELLAR LEGACY V36.0.0 - GALACTIC DOMINION
-- Run after V36.0.0 is LIVE. Transactional, additive; no user save/inventory resets.
BEGIN;
DO $preflight$
BEGIN
 IF to_regclass('public.stellar_relay_state_v346') IS NULL
    OR to_regclass('public.stellar_relay_fortifications_v350') IS NULL
    OR to_regclass('public.stellar_war_actions') IS NULL
    OR (SELECT count(*) FROM public.stellar_relay_state_v346)<>9
 THEN RAISE EXCEPTION 'V36_REQUIRES_V35_LIVE_WITH_9_RELAYS'; END IF;
END;$preflight$;
CREATE TABLE IF NOT EXISTS public.stellar_dominion_rules_v360 (
 id integer PRIMARY KEY DEFAULT 1 CHECK(id=1),
 enabled boolean NOT NULL DEFAULT true,
 regen_hp_tick integer NOT NULL DEFAULT 3000 CHECK(regen_hp_tick BETWEEN 0 AND 50000),
 regen_shield_tick integer NOT NULL DEFAULT 5000 CHECK(regen_shield_tick BETWEEN 0 AND 50000),
 regen_idle_seconds integer NOT NULL DEFAULT 60 CHECK(regen_idle_seconds BETWEEN 30 AND 3600),
 daily_credits_per_relay integer NOT NULL DEFAULT 15000 CHECK(daily_credits_per_relay BETWEEN 0 AND 100000),
 daily_credits_cap integer NOT NULL DEFAULT 90000 CHECK(daily_credits_cap BETWEEN 0 AND 900000),
 weekly_war_actions integer NOT NULL DEFAULT 3 CHECK(weekly_war_actions BETWEEN 1 AND 100),
 weekly_credits integer NOT NULL DEFAULT 120000 CHECK(weekly_credits BETWEEN 0 AND 500000),
 war_reward_credits integer NOT NULL DEFAULT 60000 CHECK(war_reward_credits BETWEEN 0 AND 300000),
 war_hours integer NOT NULL DEFAULT 24 CHECK(war_hours BETWEEN 1 AND 72),
 war_cooldown_hours integer NOT NULL DEFAULT 24 CHECK(war_cooldown_hours BETWEEN 1 AND 168),
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.stellar_dominion_rules_v360(id) VALUES(1) ON CONFLICT(id) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.stellar_dominion_wars_v360 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 attacker uuid NOT NULL REFERENCES public.clans(id) ON DELETE RESTRICT,
 defender uuid NOT NULL REFERENCES public.clans(id) ON DELETE RESTRICT,
 declared_by uuid NOT NULL,
 starts_at timestamptz NOT NULL DEFAULT now(),
 ends_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(attacker<>defender),CHECK(ends_at>starts_at)
);
CREATE INDEX IF NOT EXISTS stellar_dominion_wars_attacker_v360 ON public.stellar_dominion_wars_v360(attacker,ends_at DESC);
CREATE INDEX IF NOT EXISTS stellar_dominion_wars_defender_v360 ON public.stellar_dominion_wars_v360(defender,ends_at DESC);
CREATE TABLE IF NOT EXISTS public.stellar_dominion_claims_v360 (
 clan_id uuid NOT NULL REFERENCES public.clans(id) ON DELETE RESTRICT,
 claim_kind text NOT NULL CHECK(claim_kind IN ('daily','weekly')),
 period_start date NOT NULL,
 actor uuid NOT NULL,
 credits bigint NOT NULL CHECK(credits BETWEEN 0 AND 900000),
 earned_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(clan_id,claim_kind,period_start)
);
CREATE INDEX IF NOT EXISTS stellar_dominion_claims_recent_v360 ON public.stellar_dominion_claims_v360(earned_at DESC);
CREATE TABLE IF NOT EXISTS public.stellar_dominion_war_claims_v360 (
 war_id uuid PRIMARY KEY REFERENCES public.stellar_dominion_wars_v360(id) ON DELETE RESTRICT,
 clan_id uuid NOT NULL REFERENCES public.clans(id) ON DELETE RESTRICT,
 actor uuid NOT NULL,
 credits bigint NOT NULL CHECK(credits BETWEEN 0 AND 300000),
 claimed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stellar_dominion_rules_v360 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stellar_dominion_wars_v360 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stellar_dominion_claims_v360 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stellar_dominion_war_claims_v360 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stellar_dominion_rules_v360,public.stellar_dominion_wars_v360,public.stellar_dominion_claims_v360,public.stellar_dominion_war_claims_v360 FROM PUBLIC,anon,authenticated;
GRANT SELECT,UPDATE ON public.stellar_dominion_rules_v360 TO service_role;
GRANT SELECT ON public.stellar_dominion_wars_v360,public.stellar_dominion_claims_v360,public.stellar_dominion_war_claims_v360 TO service_role;
-- Regen may run only with the service role; never expose manual healing to players.
-- One SQL call covers at most nine relays. Idle attacks + destroyed relays are excluded.
CREATE OR REPLACE FUNCTION public.stellar_dominion_regen_v360()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE cfg public.stellar_dominion_rules_v360; changed integer:=0;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'DOMINION_SERVICE_ONLY';END IF;
 SELECT * INTO cfg FROM public.stellar_dominion_rules_v360 WHERE id=1;
 IF NOT FOUND OR NOT cfg.enabled THEN RETURN jsonb_build_object('ok',true,'updated',0);END IF;
 WITH loadouts AS (
   SELECT s.map_id,s.node_id,
    COALESCE(MAX(m.level) FILTER(WHERE m.category='hp' AND m.attribute='nanobots'),0)::integer AS nano_lv,
    COALESCE(MAX(m.level) FILTER(WHERE m.category='shield' AND m.attribute='regenerator'),0)::integer AS regen_lv
   FROM public.stellar_relay_state_v346 s
   LEFT JOIN public.stellar_relay_modules_v346 m ON m.map_id=s.map_id AND m.node_id=s.node_id
   WHERE s.owner_clan_id IS NOT NULL AND s.hp>0 AND
    (s.last_hit_at IS NULL OR s.last_hit_at<now()-make_interval(secs=>cfg.regen_idle_seconds))
   GROUP BY s.map_id,s.node_id
 ), applied AS (
   UPDATE public.stellar_relay_state_v346 s SET
    hp=LEAST(s.max_hp,s.hp+cfg.regen_hp_tick*(1+l.nano_lv)),
    shield=LEAST(s.max_shield,s.shield+cfg.regen_shield_tick*(1+l.regen_lv)),
    revision=s.revision+1,updated_at=now()
   FROM loadouts l WHERE s.map_id=l.map_id AND s.node_id=l.node_id
   AND (s.last_hit_at IS NULL OR s.last_hit_at<now()-make_interval(secs=>cfg.regen_idle_seconds))
   AND s.hp>0 AND s.owner_clan_id IS NOT NULL
   AND (s.hp<s.max_hp AND cfg.regen_hp_tick>0 OR s.shield<s.max_shield AND cfg.regen_shield_tick>0)
   RETURNING s.map_id
 ) SELECT count(*) INTO changed FROM applied;
 RETURN jsonb_build_object('ok',true,'updated',changed);
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_dominion_regen_v360() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_dominion_regen_v360() TO service_role;
-- A war declaration never transfers credits or territory. Clan owner only.
-- Ordered advisory lock serializes simultaneous declarations for the same clan pair.
CREATE OR REPLACE FUNCTION public.stellar_dominion_declare_v360(p_defender uuid,p_starts_at timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE uid uuid:=auth.uid(); cl public.clans; target public.clans; cfg public.stellar_dominion_rules_v360; w public.stellar_dominion_wars_v360; battle_start timestamptz;battle_end timestamptz;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED';END IF;
 SELECT * INTO cl FROM public.clans WHERE owner_id=uid ORDER BY created_at LIMIT 1;
 IF NOT FOUND THEN RAISE EXCEPTION 'ONLY_CLAN_OWNER';END IF;
 IF p_defender IS NULL OR p_defender=cl.id THEN RAISE EXCEPTION 'INVALID_RIVAL_CLAN';END IF;
 SELECT * INTO target FROM public.clans WHERE id=p_defender;
 IF NOT FOUND THEN RAISE EXCEPTION 'RIVAL_CLAN_NOT_FOUND';END IF;
 SELECT * INTO cfg FROM public.stellar_dominion_rules_v360 WHERE id=1;
 IF NOT FOUND OR NOT cfg.enabled THEN RAISE EXCEPTION 'DOMINION_DISABLED';END IF;
 battle_start:=COALESCE(p_starts_at,now());
 IF p_starts_at IS NOT NULL AND (battle_start<now()+interval '2 minutes' OR battle_start>now()+interval '7 days')
 THEN RAISE EXCEPTION 'WAR_SCHEDULE_OUT_OF_RANGE';END IF;
 battle_end:=battle_start+make_interval(hours=>cfg.war_hours);
 PERFORM pg_advisory_xact_lock(hashtext(LEAST(cl.id::text,p_defender::text)||':'||GREATEST(cl.id::text,p_defender::text))::bigint);
 IF EXISTS(SELECT 1 FROM public.stellar_dominion_wars_v360
  WHERE ((attacker=cl.id AND defender=p_defender) OR (attacker=p_defender AND defender=cl.id))
  AND ends_at>battle_start-make_interval(hours=>cfg.war_cooldown_hours)
  AND starts_at<battle_end+make_interval(hours=>cfg.war_cooldown_hours)) THEN RAISE EXCEPTION 'WAR_ACTIVE_OR_COOLDOWN';END IF;
 -- Limit unbounded spam: an attacker can have only one live offensive war.
 IF EXISTS(SELECT 1 FROM public.stellar_dominion_wars_v360 WHERE attacker=cl.id AND ends_at>battle_start AND starts_at<battle_end) THEN RAISE EXCEPTION 'ATTACKER_ALREADY_AT_WAR';END IF;
 INSERT INTO public.stellar_dominion_wars_v360(attacker,defender,declared_by,starts_at,ends_at)
 VALUES(cl.id,p_defender,uid,battle_start,battle_end) RETURNING * INTO w;
 RETURN jsonb_build_object('ok',true,'war_id',w.id,'starts_at',w.starts_at,'ends_at',w.ends_at);
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_dominion_declare_v360(uuid,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_dominion_declare_v360(uuid,timestamptz) TO authenticated;
-- Daily and weekly clan payouts are based ONLY on authoritative relay ownership and
-- authenticated capture/defense logs, respectively. Idempotent unique period per clan.
CREATE OR REPLACE FUNCTION public.stellar_dominion_claim_v360(p_kind text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE uid uuid:=auth.uid(); cl public.clans; cfg public.stellar_dominion_rules_v360;
 day_start date; period date; owned integer; war_count integer; award bigint; inserted integer:=0;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED';END IF;
 IF p_kind NOT IN('daily','weekly') OR p_kind IS NULL THEN RAISE EXCEPTION 'INVALID_REWARD_KIND';END IF;
 SELECT c.* INTO cl FROM public.clan_members cm JOIN public.clans c ON c.id=cm.clan_id
 WHERE cm.user_id=uid FOR UPDATE OF c;
 IF NOT FOUND THEN RAISE EXCEPTION 'CLAN_REQUIRED';END IF;
 SELECT * INTO cfg FROM public.stellar_dominion_rules_v360 WHERE id=1;
 IF NOT FOUND OR NOT cfg.enabled THEN RAISE EXCEPTION 'DOMINION_DISABLED';END IF;
 day_start:=(now() AT TIME ZONE 'America/Sao_Paulo')::date;
 period:=CASE WHEN p_kind='weekly' THEN date_trunc('week',now() AT TIME ZONE 'America/Sao_Paulo')::date ELSE day_start END;
 IF p_kind='daily' THEN
   SELECT count(*) INTO owned FROM public.stellar_relay_state_v346 WHERE owner_clan_id=cl.id AND hp>0;
   IF owned=0 THEN RAISE EXCEPTION 'NO_ACTIVE_CLAN_RELAY';END IF;
   award:=LEAST(cfg.daily_credits_cap,owned*cfg.daily_credits_per_relay);
 ELSE
   SELECT count(*) INTO war_count FROM public.stellar_war_actions
   WHERE clan_id=cl.id AND kind IN('capture','defense') AND occurred_at >= (period::timestamp AT TIME ZONE 'America/Sao_Paulo')
   AND occurred_at<((period+7)::timestamp AT TIME ZONE 'America/Sao_Paulo');
   IF war_count<cfg.weekly_war_actions THEN RAISE EXCEPTION 'WEEKLY_OBJECTIVE_INCOMPLETE';END IF;
   award:=cfg.weekly_credits;
 END IF;
 INSERT INTO public.stellar_dominion_claims_v360(clan_id,claim_kind,period_start,actor,credits)
 VALUES(cl.id,p_kind,period,uid,award) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS inserted=ROW_COUNT;
 IF inserted<>1 THEN RAISE EXCEPTION 'DOMINION_REWARD_ALREADY_CLAIMED';END IF;
 UPDATE public.clans SET vault_credits=vault_credits+award,updated_at=now() WHERE id=cl.id;
 RETURN jsonb_build_object('ok',true,'kind',p_kind,'credits',award,'period',period);
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_dominion_claim_v360(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_dominion_claim_v360(text) TO authenticated;
-- End-of-war prize is paid to the winner only, never to a tie or no-fight war.
-- The same official capture/defense action log used by existing PvP remains the source.
CREATE OR REPLACE FUNCTION public.stellar_dominion_war_prize_v360(p_war_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE uid uuid:=auth.uid(); cl public.clans; w public.stellar_dominion_wars_v360; cfg public.stellar_dominion_rules_v360;
 sa bigint;sb bigint;award bigint;inserted integer;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED';END IF;
 SELECT c.* INTO cl FROM public.clan_members cm JOIN public.clans c ON c.id=cm.clan_id WHERE cm.user_id=uid FOR UPDATE OF c;
 IF NOT FOUND THEN RAISE EXCEPTION 'CLAN_REQUIRED';END IF;
 SELECT * INTO w FROM public.stellar_dominion_wars_v360 WHERE id=p_war_id FOR UPDATE;
 IF NOT FOUND OR cl.id NOT IN (w.attacker,w.defender) THEN RAISE EXCEPTION 'WAR_NOT_FOUND_FOR_CLAN';END IF;
 IF w.ends_at>now() THEN RAISE EXCEPTION 'WAR_NOT_FINISHED';END IF;
 SELECT * INTO cfg FROM public.stellar_dominion_rules_v360 WHERE id=1;
 IF NOT FOUND OR NOT cfg.enabled THEN RAISE EXCEPTION 'DOMINION_DISABLED';END IF;
 SELECT coalesce(sum(CASE WHEN kind='capture' THEN 5 ELSE 2 END),0) INTO sa
 FROM public.stellar_war_actions WHERE clan_id=w.attacker AND kind IN('capture','defense') AND occurred_at>=w.starts_at AND occurred_at<w.ends_at;
 SELECT coalesce(sum(CASE WHEN kind='capture' THEN 5 ELSE 2 END),0) INTO sb
 FROM public.stellar_war_actions WHERE clan_id=w.defender AND kind IN('capture','defense') AND occurred_at>=w.starts_at AND occurred_at<w.ends_at;
 IF sa=sb OR greatest(sa,sb)=0 OR (cl.id=w.attacker AND sa<=sb) OR (cl.id=w.defender AND sb<=sa) THEN
   RAISE EXCEPTION 'WAR_PRIZE_NOT_WON';END IF;
 award:=cfg.war_reward_credits;
 INSERT INTO public.stellar_dominion_war_claims_v360(war_id,clan_id,actor,credits) VALUES(w.id,cl.id,uid,award) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS inserted=ROW_COUNT;
 IF inserted<>1 THEN RAISE EXCEPTION 'WAR_PRIZE_ALREADY_CLAIMED';END IF;
 UPDATE public.clans SET vault_credits=vault_credits+award,updated_at=now() WHERE id=cl.id;
 RETURN jsonb_build_object('ok',true,'war_id',w.id,'credits',award,'attacker_score',sa,'defender_score',sb);
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_dominion_war_prize_v360(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_dominion_war_prize_v360(uuid) TO authenticated;
COMMIT;
