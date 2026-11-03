-- AUDITORIA: já executado no Supabase em 03/11/2026. NÃO EXECUTAR NOVAMENTE.
-- Recuperação única do leilão Nova 2026-11-03 03h (The Devil of Dead).
-- Motivo: registro WON legado sem comprovante/entrega; compensação SEM nova cobrança.
-- Antes de executar, valida status, vencedor, frota, farms e ausência de recibo.
DO $fix$
DECLARE
 v_bid public.auction_bids%rowtype;
 v_user_id uuid;
 v_callsign text;
 v_state jsonb;
 v_new_id text:='d_auc_legacy_nova_20261103_03';
 v_old_credits bigint;
 v_history jsonb;
 v_now timestamptz:=clock_timestamp();
 v_result jsonb;
 v_profile text;
BEGIN
 SELECT b.* INTO v_bid
 FROM public.auction_bids b JOIN public.profiles p ON p.id=b.user_id
 WHERE p.callsign='°•The•Devil•Of•Dead•°' AND b.hour_key='2026-11-03-03'
 AND b.lot_ref='item:iris' AND b.status='won' AND b.user_bid=189700000
 FOR UPDATE OF b;
 IF v_bid.id IS NULL THEN RAISE EXCEPTION 'LEGACY_WIN_NOT_FOUND_OR_CHANGED';END IF;
 v_user_id:=v_bid.user_id;
 SELECT p.callsign INTO v_callsign FROM public.profiles p WHERE p.id=v_user_id;
 IF EXISTS(SELECT 1 FROM public.stellar_auction_settlements_v1182 WHERE bid_id=v_bid.id)
 THEN RAISE EXCEPTION 'LEGACY_WIN_ALREADY_RECONCILED';END IF;
 IF EXISTS(SELECT 1 FROM public.stellar_offline_farm_v484 f WHERE f.user_id=v_user_id AND f.status='running')
 THEN RAISE EXCEPTION 'OFFLINE_FARM_MUST_FINISH_BEFORE_RECOVERY';END IF;
 SELECT state INTO v_state FROM public.game_saves WHERE user_id=v_user_id FOR UPDATE;
 IF v_state->>'accountOwnerId' IS DISTINCT FROM v_user_id::text
 THEN RAISE EXCEPTION 'LEGACY_SAVE_OWNER_CHANGED';END IF;
 IF jsonb_array_length(coalesce(v_state->'drones','[]'::jsonb))<>6
 THEN RAISE EXCEPTION 'LEGACY_FLEET_CHANGED_RECHECK_REQUIRED';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(v_state->'drones') d WHERE d->>'id'=v_new_id)
 THEN RAISE EXCEPTION 'LEGACY_RECOVERY_ALREADY_APPEARS_IN_FLEET';END IF;
 v_old_credits:=(v_state#>>'{profile,credits}')::bigint;
 IF v_old_credits IS DISTINCT FROM (SELECT credits FROM public.profiles WHERE id=v_user_id)
 THEN RAISE EXCEPTION 'LEGACY_ECONOMY_NOT_SYNCHRONIZED';END IF;
 v_state:=jsonb_set(v_state,'{drones}',v_state->'drones'||jsonb_build_array(
 jsonb_build_object('id',v_new_id,'type','iris','slots','[null,null]'::jsonb)),true);
 FOR v_profile IN SELECT x FROM unnest(ARRAY['1','2']) t(x) LOOP
    v_state:=jsonb_set(v_state,ARRAY['combatConfigsV2013','profiles',v_profile,'droneSlots',v_new_id],
      '[null,null]'::jsonb,true);
 END LOOP;
 v_state:=jsonb_set(v_state,'{serverPurchaseRevision}',
    to_jsonb(coalesce((v_state->>'serverPurchaseRevision')::bigint,0)+1),true);
 v_history:=jsonb_build_array(jsonb_build_object('at',(extract(epoch from v_now)*1000)::bigint,
   'bid',v_bid.user_bid,'name','Nova • entrega recuperada','result','VENCEU'))||
   coalesce(v_state#>'{auction,history}','[]'::jsonb);
 SELECT coalesce(jsonb_agg(value order by n),'[]'::jsonb) INTO v_history
 FROM jsonb_array_elements(v_history) with ordinality x(value,n) WHERE n<=12;
 v_state:=jsonb_set(v_state,'{auction,history}',v_history,true);
 v_result:=public.stellar_commit_player_save_v118(v_user_id,v_state,v_now,v_callsign);
 IF v_result->>'ok'<>'true' THEN RAISE EXCEPTION 'LEGACY_RECOVERY_SAVE_FAILED';END IF;
 INSERT INTO public.stellar_auction_settlements_v1182
 (bid_id,user_id,hour_key,lot_ref,paid_credits,award,save_hash)
 SELECT v_bid.id,v_user_id,v_bid.hour_key,v_bid.lot_ref,0,
   jsonb_build_object('kind','drone','id','iris','qty',1,'drone_id',v_new_id,
   'reason','legacy_win_missing_delivery','original_bid',v_bid.user_bid),md5(g.state::text)
 FROM public.game_saves g WHERE g.user_id=v_user_id;
 IF (SELECT (state#>>'{profile,credits}')::bigint FROM public.game_saves WHERE user_id=v_user_id)
    IS DISTINCT FROM v_old_credits
 THEN RAISE EXCEPTION 'LEGACY_RECOVERY_MUST_NOT_CHANGE_CREDITS';END IF;
END $fix$;
