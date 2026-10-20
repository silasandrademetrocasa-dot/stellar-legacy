-- V35 rollback. Run only if reverting runtime to V34.7.1 and AFTER checking
-- that no V35 tier upgrade must be refunded; no automatic refund/erase of logs.
BEGIN;
DROP TRIGGER IF EXISTS stellar_relay_fortification_transfer_v350 ON public.stellar_relay_state_v346;
DROP FUNCTION IF EXISTS public.stellar_relay_fortification_transfer_v350();
REVOKE ALL ON FUNCTION public.stellar_relay_fortification_upgrade_v350(text,text,integer) FROM PUBLIC,authenticated,anon;
-- Keep V35 tables & audit for recovery. Existing level should not be silently lost.
-- Restore the V34.7.1 module-only recompute (not new tiers).
CREATE OR REPLACE FUNCTION public.stellar_relay_recompute_v346(p_map_id text,p_node_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE bh bigint;bs bigint;mh bigint;ms bigint;
BEGIN
 SELECT max_hp,max_shield INTO bh,bs FROM public.stellar_relay_rules_v346 WHERE id=1;
 SELECT coalesce(sum(b.hp_bonus),0),coalesce(sum(b.shield_bonus),0) INTO mh,ms
 FROM public.stellar_relay_modules_v346 m
 JOIN public.stellar_relay_module_balance_v3463 b ON b.category=m.category AND b.attribute=m.attribute AND b.level=m.level
 WHERE m.map_id=p_map_id AND m.node_id=p_node_id;
 UPDATE public.stellar_relay_state_v346
 SET max_hp=LEAST(16000000,bh+mh),max_shield=LEAST(10000000,bs+ms),
 hp=LEAST(hp,LEAST(16000000,bh+mh)),
 shield=LEAST(shield,LEAST(10000000,bs+ms)),revision=revision+1,updated_at=now()
 WHERE map_id=p_map_id AND node_id=p_node_id;
END;$fn$;
COMMIT;
