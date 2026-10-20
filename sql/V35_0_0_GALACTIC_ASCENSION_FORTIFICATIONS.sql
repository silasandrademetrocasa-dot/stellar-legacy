-- STELLAR LEGACY V35.0.0 — GALACTIC ASCENSION / FORTIFICATIONS
-- APPLY AFTER V35.0.0 IS LIVE. SQL is transactional and preserves ownership,
-- clan vault values, module inventory, player saves, war actions and mission claims.
BEGIN;
CREATE TABLE IF NOT EXISTS public.stellar_relay_fortification_tiers_v350 (
 level integer PRIMARY KEY CHECK(level BETWEEN 1 AND 3),
 hp_bonus bigint NOT NULL DEFAULT 0 CHECK(hp_bonus BETWEEN 0 AND 3000000),
 shield_bonus bigint NOT NULL DEFAULT 0 CHECK(shield_bonus BETWEEN 0 AND 3000000),
 parts_each integer NOT NULL DEFAULT 0 CHECK(parts_each BETWEEN 0 AND 250),
 credits bigint NOT NULL DEFAULT 0 CHECK(credits BETWEEN 0 AND 10000000),
 min_clan_level integer NOT NULL DEFAULT 1 CHECK(min_clan_level BETWEEN 1 AND 50),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT fortification_level_one_v350 CHECK(level<>1 OR (hp_bonus=0 AND shield_bonus=0 AND parts_each=0 AND credits=0 AND min_clan_level=1))
);
INSERT INTO public.stellar_relay_fortification_tiers_v350(level,hp_bonus,shield_bonus,parts_each,credits,min_clan_level)
VALUES (1,0,0,0,0,1),(2,250000,250000,12,2000000,3),(3,750000,750000,25,5000000,5)
ON CONFLICT(level) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.stellar_relay_fortifications_v350 (
 map_id text NOT NULL CHECK(map_id IN ('b41','b42','b43')),
 node_id text NOT NULL CHECK(node_id IN ('A','B','C')),
 level integer NOT NULL DEFAULT 1 REFERENCES public.stellar_relay_fortification_tiers_v350(level),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(map_id,node_id),
 FOREIGN KEY(map_id,node_id) REFERENCES public.stellar_relay_state_v346(map_id,node_id) ON DELETE RESTRICT
);
INSERT INTO public.stellar_relay_fortifications_v350(map_id,node_id,level)
SELECT map_id,node_id,1 FROM public.stellar_relay_state_v346
ON CONFLICT(map_id,node_id) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.stellar_relay_fortification_audit_v350 (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor uuid NOT NULL,
 clan_id uuid NOT NULL,
 map_id text NOT NULL,
 node_id text NOT NULL,
 previous_level integer NOT NULL,
 new_level integer NOT NULL,
 credits_spent bigint NOT NULL,
 parts_each_used integer NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT relay_fortification_sequential_v350 CHECK(new_level=previous_level+1)
);
CREATE INDEX IF NOT EXISTS stellar_relay_fortification_audit_recent_v350
ON public.stellar_relay_fortification_audit_v350(created_at DESC);
ALTER TABLE public.stellar_relay_fortification_tiers_v350 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stellar_relay_fortifications_v350 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stellar_relay_fortification_audit_v350 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stellar_relay_fortification_tiers_v350,public.stellar_relay_fortifications_v350,public.stellar_relay_fortification_audit_v350 FROM PUBLIC,anon,authenticated;
GRANT SELECT,UPDATE ON public.stellar_relay_fortification_tiers_v350 TO service_role;
GRANT SELECT,INSERT,UPDATE ON public.stellar_relay_fortifications_v350 TO service_role;
GRANT SELECT,INSERT ON public.stellar_relay_fortification_audit_v350 TO service_role;
-- Existing module system remains intact. Tier bonuses are additive to current base
-- and current equipped modules. Module swaps and tier upgrade NEVER heal in battle.
CREATE OR REPLACE FUNCTION public.stellar_relay_recompute_v346(p_map_id text,p_node_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE bh bigint;bs bigint;mh bigint;ms bigint;th bigint;ts bigint;
BEGIN
 SELECT max_hp,max_shield INTO bh,bs FROM public.stellar_relay_rules_v346 WHERE id=1;
 IF NOT FOUND THEN RAISE EXCEPTION 'RELAY_RULES_UNAVAILABLE'; END IF;
 SELECT coalesce(sum(b.hp_bonus),0),coalesce(sum(b.shield_bonus),0) INTO mh,ms
 FROM public.stellar_relay_modules_v346 m
 JOIN public.stellar_relay_module_balance_v3463 b
 ON b.category=m.category AND b.attribute=m.attribute AND b.level=m.level
 WHERE m.map_id=p_map_id AND m.node_id=p_node_id;
 SELECT coalesce(t.hp_bonus,0),coalesce(t.shield_bonus,0) INTO th,ts
 FROM public.stellar_relay_fortifications_v350 f
 JOIN public.stellar_relay_fortification_tiers_v350 t ON t.level=f.level
 WHERE f.map_id=p_map_id AND f.node_id=p_node_id;
 UPDATE public.stellar_relay_state_v346 SET
   max_hp=LEAST(16000000,bh+mh+coalesce(th,0)),
   max_shield=LEAST(10000000,bs+ms+coalesce(ts,0)),
   hp=LEAST(hp,LEAST(16000000,bh+mh+coalesce(th,0))),
   shield=LEAST(shield,LEAST(10000000,bs+ms+coalesce(ts,0))),
   revision=revision+1,updated_at=now()
 WHERE map_id=p_map_id AND node_id=p_node_id;
END;$fn$;
-- Capture and admin release in 34.6 rebuild the base directly; this deferred
-- trigger restores the tier's proper max after a clan changes while respecting
-- historic modules (the old clan's items return to inventory before the update).
CREATE OR REPLACE FUNCTION public.stellar_relay_fortification_transfer_v350()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
 IF NEW.owner_clan_id IS NOT DISTINCT FROM OLD.owner_clan_id THEN RETURN NEW;END IF;
 PERFORM public.stellar_relay_recompute_v346(NEW.map_id,NEW.node_id);
 -- Conquest/admin release already heals to the base. Finish reconstruction
 -- to the correct FULL max (no free healing on ordinary equipment switches).
 UPDATE public.stellar_relay_state_v346
 SET hp=max_hp,shield=max_shield,revision=revision+1,updated_at=now()
 WHERE map_id=NEW.map_id AND node_id=NEW.node_id;
 RETURN NEW;
END;$fn$;
DROP TRIGGER IF EXISTS stellar_relay_fortification_transfer_v350 ON public.stellar_relay_state_v346;
CREATE TRIGGER stellar_relay_fortification_transfer_v350
AFTER UPDATE OF owner_clan_id ON public.stellar_relay_state_v346
FOR EACH ROW WHEN(OLD.owner_clan_id IS DISTINCT FROM NEW.owner_clan_id)
EXECUTE FUNCTION public.stellar_relay_fortification_transfer_v350();
-- Admin and member JWTs have no raw write access. Only clan leader may buy a tier,
-- and prices, prerequisites and parts are loaded and locked by the SQL.
CREATE OR REPLACE FUNCTION public.stellar_relay_fortification_upgrade_v350(p_map_id text,p_node_id text,p_expected_level integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE uid uuid:=auth.uid(); cl public.clans; st public.stellar_relay_state_v346;
 fort public.stellar_relay_fortifications_v350; cfg public.stellar_relay_fortification_tiers_v350;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED';END IF;
 IF p_map_id NOT IN('b41','b42','b43') OR p_node_id NOT IN('A','B','C') THEN RAISE EXCEPTION 'INVALID_RELAY';END IF;
 SELECT * INTO cl FROM public.clans WHERE owner_id=uid ORDER BY created_at LIMIT 1 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'ONLY_CLAN_OWNER'; END IF;
 SELECT * INTO st FROM public.stellar_relay_state_v346 WHERE map_id=p_map_id AND node_id=p_node_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'RELAY_NOT_FOUND';END IF;
 IF st.owner_clan_id IS DISTINCT FROM cl.id THEN RAISE EXCEPTION 'RELAY_NOT_OWNED';END IF;
 SELECT * INTO fort FROM public.stellar_relay_fortifications_v350 WHERE map_id=p_map_id AND node_id=p_node_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'FORTIFICATION_NOT_READY';END IF;
 IF fort.level>=3 THEN RAISE EXCEPTION 'MAX_LEVEL';END IF;
 IF p_expected_level NOT BETWEEN 1 AND 2 OR fort.level IS DISTINCT FROM p_expected_level THEN RAISE EXCEPTION 'STALE_FORTIFICATION_LEVEL';END IF;
 SELECT * INTO cfg FROM public.stellar_relay_fortification_tiers_v350 WHERE level=fort.level+1 FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'FORTIFICATION_PRICE_MISSING';END IF;
 IF cl.level<cfg.min_clan_level THEN RAISE EXCEPTION 'CLAN_LEVEL_REQUIRED_%',cfg.min_clan_level;END IF;
 UPDATE public.stellar_relay_clan_parts_v346 SET quantity=quantity-cfg.parts_each
 WHERE clan_id=cl.id AND part_type='hull_parts' AND quantity>=cfg.parts_each;
 IF NOT FOUND THEN RAISE EXCEPTION 'INSUFFICIENT_HULL_PARTS';END IF;
 UPDATE public.stellar_relay_clan_parts_v346 SET quantity=quantity-cfg.parts_each
 WHERE clan_id=cl.id AND part_type='shield_parts' AND quantity>=cfg.parts_each;
 IF NOT FOUND THEN RAISE EXCEPTION 'INSUFFICIENT_SHIELD_PARTS';END IF;
 UPDATE public.clans SET vault_credits=vault_credits-cfg.credits
 WHERE id=cl.id AND vault_credits>=cfg.credits;
 IF NOT FOUND THEN RAISE EXCEPTION 'INSUFFICIENT_CLAN_VAULT';END IF;
 UPDATE public.stellar_relay_fortifications_v350 SET level=cfg.level,updated_at=now()
 WHERE map_id=p_map_id AND node_id=p_node_id;
 PERFORM public.stellar_relay_recompute_v346(p_map_id,p_node_id);
 INSERT INTO public.stellar_relay_fortification_audit_v350(actor,clan_id,map_id,node_id,previous_level,new_level,credits_spent,parts_each_used)
 VALUES(uid,cl.id,p_map_id,p_node_id,fort.level,cfg.level,cfg.credits,cfg.parts_each);
 RETURN jsonb_build_object('ok',true,'map_id',p_map_id,'node_id',p_node_id,
  'level',cfg.level,'spent_credits',cfg.credits,'parts_each_used',cfg.parts_each,
  'hp_bonus',cfg.hp_bonus,'shield_bonus',cfg.shield_bonus);
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_relay_fortification_upgrade_v350(text,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_relay_fortification_upgrade_v350(text,text,integer) TO authenticated;
COMMIT;
