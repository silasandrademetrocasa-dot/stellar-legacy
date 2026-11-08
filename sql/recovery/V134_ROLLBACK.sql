-- RECOVERY ONLY: restore V133.3 app together with these implementations.
BEGIN;
SET LOCAL lock_timeout='5s';
DROP TRIGGER IF EXISTS stellar_player_validate_write_v134 ON public.game_saves;
DROP TRIGGER IF EXISTS stellar_player_snapshot_v134 ON public.game_saves;
CREATE OR REPLACE FUNCTION public.admin_reset_account_v1763(p_target_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE v_admin uuid:=auth.uid(); v_result jsonb; v_table text; v_epoch bigint;
BEGIN
 IF v_admin IS NULL OR NOT public.is_game_admin_v1763(v_admin) THEN RAISE EXCEPTION 'Acesso administrativo negado.'; END IF;
 IF p_target_user_id IS NULL OR p_target_user_id=v_admin OR public.is_game_admin_v1763(p_target_user_id) THEN RAISE EXCEPTION 'Conta protegida contra reset.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_target_user_id::text,478));
 v_result:=public.admin_reset_account_v1763_legacy_v478(p_target_user_id);
 IF COALESCE((v_result->>'ok')::boolean,false) IS NOT TRUE THEN RAISE EXCEPTION 'Reset legado não confirmado.'; END IF;
 FOREACH v_table IN ARRAY ARRAY[
 'galaxy_event_progress_v1826','game_coupon_redemptions_v1821','game_coupon_redemptions_v193',
 'stellar_elite_counters','stellar_elite_claims','stellar_elite_selected_titles',
 'stellar_competitive_claims','stellar_war_campaign_claims','stellar_war_supply_claims','stellar_war_defense_cooldowns','stellar_war_scores',
 'stellar_npc_reward_ledger','stellar_ore_reward_ledger',
 'stellar_astral_cursor_v381','stellar_astral_ledger_v381','stellar_astral_quote_lock_v381',
 'stellar_frontier_claims_v370','stellar_frontier_ship_tech_v370',
 'stellar_u42_actions','stellar_u42_donations','stellar_u42_expeditions','stellar_u42_inventory',
 'stellar_u42_material_spends','stellar_u42_research','stellar_u42_squad_members',
 'stellar_u42_squad_objective_claims_v421','stellar_u423_loadouts','stellar_u423_ops_claims',
 'stellar_u426_clan_donations','stellar_u426_sector_runs','stellar_u435_raid_claims',
 'stellar_u440_admin_test_grants','stellar_season_scores'
 ] LOOP
  IF to_regclass(format('public.%I',v_table)) IS NOT NULL THEN
   EXECUTE format('DELETE FROM public.%I WHERE user_id=$1',v_table) USING p_target_user_id;
  END IF;
 END LOOP;
 DELETE FROM public.stellar_dominion_claims_v360 WHERE actor=p_target_user_id;
 DELETE FROM public.stellar_dominion_war_claims_v360 WHERE actor=p_target_user_id;
 DELETE FROM public.stellar_frontier_clan_claims_v370 WHERE actor=p_target_user_id;
 DELETE FROM public.stellar_relay_mission_claims_v346 WHERE actor=p_target_user_id;
 UPDATE public.stellar_u426_market_offers SET buyer=NULL WHERE buyer=p_target_user_id;
 INSERT INTO public.stellar_account_reset_epochs_v478(user_id,epoch,reset_at)
 VALUES(p_target_user_id,1,now())
 ON CONFLICT(user_id) DO UPDATE SET epoch=public.stellar_account_reset_epochs_v478.epoch+1,reset_at=now()
 RETURNING epoch INTO v_epoch;
 RETURN v_result||jsonb_build_object('reset_epoch',v_epoch,'verified',true,
 'message','Conta zerada no servidor. Progresso local antigo bloqueado; login e Premium preservados.');
END $function$
;
GRANT EXECUTE ON FUNCTION public.admin_reset_account_v1763(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.admin_reset_account_v1763_legacy_v478(p_target_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_admin uuid:=auth.uid();
  v_callsign text;
  v_email text;
begin
  if not public.is_game_admin_v1763(v_admin) then raise exception 'Acesso administrativo negado.'; end if;
  if p_target_user_id is null then raise exception 'Conta inválida.'; end if;
  if p_target_user_id=v_admin then raise exception 'Você não pode zerar a própria conta administrativa.'; end if;
  if public.is_game_admin_v1763(p_target_user_id) then raise exception 'Conta administrativa protegida contra reset total.'; end if;

  select coalesce(p.callsign,split_part(coalesce(u.email,''),'@',1),'Pilot'),coalesce(u.email,'')
    into v_callsign,v_email
  from auth.users u
  left join public.profiles p on p.id=u.id
  where u.id=p_target_user_id and u.deleted_at is null;
  if not found then raise exception 'Conta não encontrada.'; end if;

  perform public.admin_transfer_owned_clan_v1763(p_target_user_id);

  delete from public.clan_members where user_id=p_target_user_id;
  delete from public.clan_credit_grants where sender_id=p_target_user_id or recipient_id=p_target_user_id;
  delete from public.clan_transactions where actor_id=p_target_user_id;
  update public.clan_transactions set target_user_id=null where target_user_id=p_target_user_id;
  delete from public.clan_war_contrib_v131 where user_id=p_target_user_id;
  delete from public.world_boss_claims_v131 where user_id=p_target_user_id;
  delete from public.world_boss_contrib_v131 where user_id=p_target_user_id;

  delete from public.pvp_damage_events where target_user_id=p_target_user_id or attacker_user_id=p_target_user_id;
  delete from public.pvp_engagements where home_user_id=p_target_user_id or invader_user_id=p_target_user_id;
  delete from public.arena_battles where attacker_id=p_target_user_id or defender_id=p_target_user_id or winner_id=p_target_user_id;
  delete from public.arena_daily_rewards where user_id=p_target_user_id;
  delete from public.arena_daily where user_id=p_target_user_id;
  delete from public.arena_stats where user_id=p_target_user_id;
  delete from public.arena_profiles where user_id=p_target_user_id;

  delete from public.designer_drop_claims_v16 where user_id=p_target_user_id;
  delete from public.player_drone_designs_v16 where user_id=p_target_user_id;
  delete from public.player_design_loadout_v16 where user_id=p_target_user_id;
  delete from public.player_design_inventory_v16 where user_id=p_target_user_id;

  delete from public.auction_bids where user_id=p_target_user_id;
  delete from public.player_presence where user_id=p_target_user_id;
  delete from public.player_location_v1774 where user_id=p_target_user_id;
  delete from public.game_login_sessions_v1214 where user_id=p_target_user_id;
  delete from public.game_saves where user_id=p_target_user_id;

  delete from public.player_level_milestones_v1771 where user_id=p_target_user_id;
  delete from public.player_telemetry_batches_v1771 where user_id=p_target_user_id;
  delete from public.player_telemetry_v1771 where user_id=p_target_user_id;

  update public.profiles
  set faction=null,level=1,xp=0,credits=20000,uridium=0,aliens_killed=0,gg_completed=0,updated_at=now()
  where id=p_target_user_id;

  insert into public.admin_action_log_v1763(admin_user_id,target_user_id,target_callsign,target_email,action,detail)
  values(
    v_admin,p_target_user_id,v_callsign,v_email,'reset',
    jsonb_build_object(
      'premium_preserved',true,
      'callsign_preserved',true,
      'telemetry_reset',true,
      'location_reset',true,
      'legacy_tables_removed',true
    )
  );

  return jsonb_build_object(
    'ok',true,
    'user_id',p_target_user_id,
    'callsign',v_callsign,
    'message','Conta, telemetria e posição zeradas. Login, callsign e Premium preservados.'
  );
end;
$function$
;
GRANT EXECUTE ON FUNCTION public.admin_reset_account_v1763_legacy_v478(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.claim_arena_daily_reward()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'private', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_snapshot jsonb;
  v_state jsonb;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_inserted integer := 0;
  v_credits bigint;
  v_uridium bigint;
  v_xp bigint;
  v_repair integer;
  v_old_credits bigint;
  v_old_uridium bigint;
  v_old_xp bigint;
  v_old_repair integer;
  v_old_level integer;
  v_new_xp bigint;
  v_new_level integer := 1;
  v_i integer;
  v_threshold bigint;
  v_callsign text;
  v_faction text;
begin
  if v_uid is null then
    raise exception 'Usuário não autenticado.';
  end if;

  v_snapshot := private.arena_reward_snapshot(v_uid);

  if coalesce((v_snapshot->>'claimed_today')::boolean, false) then
    return v_snapshot || jsonb_build_object(
      'claim_applied', false,
      'already_claimed', true
    );
  end if;

  select gs.state
    into v_state
  from public.game_saves gs
  where gs.user_id = v_uid
  for update;

  if v_state is null then
    raise exception 'Save online não encontrado. Entre no jogo e salve o progresso antes de resgatar.';
  end if;

  v_credits := (v_snapshot->>'credits')::bigint;
  v_uridium := (v_snapshot->>'uridium')::bigint;
  v_xp := (v_snapshot->>'xp')::bigint;
  v_repair := (v_snapshot->>'repair_bonus')::integer;

  insert into public.arena_daily_rewards (
    user_id, reward_date, rating, rank_position, league, player_level,
    level_bonus_percent, rank_bonus_percent, total_bonus_percent,
    credits, uridium, xp, repair_bonus
  ) values (
    v_uid,
    v_today,
    (v_snapshot->>'rating')::integer,
    (v_snapshot->>'rank_position')::integer,
    v_snapshot->>'league',
    (v_snapshot->>'player_level')::integer,
    (v_snapshot->>'level_bonus_percent')::integer,
    (v_snapshot->>'rank_bonus_percent')::integer,
    (v_snapshot->>'total_bonus_percent')::integer,
    v_credits, v_uridium, v_xp, v_repair
  )
  on conflict (user_id, reward_date) do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    return private.arena_reward_snapshot(v_uid) || jsonb_build_object(
      'claim_applied', false,
      'already_claimed', true
    );
  end if;

  v_state := coalesce(v_state, '{}'::jsonb);
  v_state := jsonb_set(
    v_state,
    '{profile}',
    case when jsonb_typeof(v_state->'profile') = 'object' then v_state->'profile' else '{}'::jsonb end,
    true
  );
  v_state := jsonb_set(
    v_state,
    '{galaxyGate}',
    case when jsonb_typeof(v_state->'galaxyGate') = 'object' then v_state->'galaxyGate' else '{}'::jsonb end,
    true
  );

  v_old_credits := coalesce(nullif(v_state #>> '{profile,credits}', '')::bigint, 0);
  v_old_uridium := coalesce(nullif(v_state #>> '{profile,uridium}', '')::bigint, 0);
  v_old_xp := coalesce(nullif(v_state #>> '{profile,xp}', '')::bigint, 0);
  v_old_repair := coalesce(nullif(v_state #>> '{galaxyGate,repairBonus}', '')::integer, 0);
  v_old_level := greatest(1, least(44, coalesce(nullif(v_state #>> '{profile,level}', '')::integer, 1)));

  v_new_xp := v_old_xp + v_xp;

  v_new_level := 1;
  for v_i in 2..44 loop
    v_threshold := public.player_xp_threshold_v1915(v_i, coalesce((v_state #>> '{profile,xpModelV1915}')::boolean,false) IS NOT TRUE);
    exit when v_new_xp < v_threshold;
    v_new_level := v_i;
  end loop;

  v_state := jsonb_set(v_state, '{profile,credits}', to_jsonb(v_old_credits + v_credits), true);
  v_state := jsonb_set(v_state, '{profile,uridium}', to_jsonb(v_old_uridium + v_uridium), true);
  v_state := jsonb_set(v_state, '{profile,xp}', to_jsonb(v_new_xp), true);
  v_state := jsonb_set(v_state, '{profile,level}', to_jsonb(v_new_level), true);
  v_state := jsonb_set(v_state, '{profile,xpModelV101}', 'true'::jsonb, true);
  v_state := jsonb_set(v_state, '{galaxyGate,repairBonus}', to_jsonb(v_old_repair + v_repair), true);

  update public.game_saves
  set state = v_state,
      updated_at = now()
  where user_id = v_uid;

  v_callsign := coalesce(nullif(v_state #>> '{profile,callsign}', ''), 'Pilot');
  v_faction := nullif(v_state #>> '{profile,faction}', '');

  update public.profiles
  set callsign = v_callsign,
      faction = coalesce(v_faction, faction),
      level = v_new_level,
      xp = v_new_xp,
      credits = v_old_credits + v_credits,
      uridium = v_old_uridium + v_uridium,
      updated_at = now()
  where id = v_uid;

  if not found then
    insert into public.profiles (id, callsign, faction, level, xp, credits, uridium, updated_at)
    values (v_uid, v_callsign, v_faction, v_new_level, v_new_xp, v_old_credits + v_credits, v_old_uridium + v_uridium, now());
  end if;

  return private.arena_reward_snapshot(v_uid) || jsonb_build_object(
    'claim_applied', true,
    'already_claimed', false,
    'level_before', v_old_level,
    'level_after', v_new_level,
    'new_credits', v_old_credits + v_credits,
    'new_uridium', v_old_uridium + v_uridium,
    'new_xp', v_new_xp,
    'new_repair_bonus', v_old_repair + v_repair
  );
end;
$function$
;
GRANT EXECUTE ON FUNCTION public.claim_arena_daily_reward() TO authenticated;
CREATE OR REPLACE FUNCTION public.claim_aux_protocol_auction_v111(p_hour_key text, p_lot_ref text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE
 v_uid uuid:=auth.uid();
 v_id text;
 v_row public.live_shop_prices_v16%rowtype;
 v_winner public.auction_bids%rowtype;
 v_state jsonb;
 v_old bigint;
 v_new bigint;
 v_rev bigint;
 v_owned integer;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Sessão ausente.'; END IF;
 IF p_lot_ref !~ '^auxProtocol:(dano|hp|escudo|loot|porao)$' THEN RAISE EXCEPTION 'Protocolo de leilão inválido.'; END IF;
 IF p_hour_key IS NULL OR p_hour_key !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{2}$' OR
    p_hour_key>=to_char(now() AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD-HH24') THEN
   RAISE EXCEPTION 'Este leilão ainda não terminou.';
 END IF;
 v_id:=split_part(p_lot_ref,':',2);
 PERFORM pg_advisory_xact_lock(hashtext(p_hour_key||':'||p_lot_ref));
 SELECT state INTO v_state FROM public.game_saves WHERE user_id=v_uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Save indisponível.'; END IF;
 IF EXISTS(SELECT 1 FROM public.auction_bids WHERE user_id=v_uid AND hour_key=p_hour_key AND lot_ref=p_lot_ref AND status='won') THEN
   RETURN jsonb_build_object('ok',true,'replayed',true,'state',v_state,'id',v_id);
 END IF;
 SELECT * INTO v_winner FROM public.auction_bids WHERE hour_key=p_hour_key AND lot_ref=p_lot_ref
 AND status='active' ORDER BY user_bid DESC,updated_at ASC LIMIT 1 FOR UPDATE;
 IF NOT FOUND OR v_winner.user_id IS DISTINCT FROM v_uid THEN RAISE EXCEPTION 'Este lote não foi vencido por esta conta.'; END IF;
 SELECT * INTO v_row FROM public.live_shop_prices_v16 WHERE catalog_key='aux_protocol:'||v_id
  AND kind='aux_protocol' AND ref_id=v_id AND enabled AND shop_visible AND meta->>'auction_enabled'='true';
 IF NOT FOUND THEN RAISE EXCEPTION 'Protocolo não está ativo no leilão.'; END IF;
 IF v_winner.lot->>'kind' IS DISTINCT FROM 'auxProtocol' OR
    v_winner.lot->>'ref' IS DISTINCT FROM p_lot_ref OR
    v_winner.lot->>'id' IS DISTINCT FROM v_id THEN
  RAISE EXCEPTION 'Lote não corresponde ao protocolo autorizado.';
 END IF;
 IF coalesce(v_state#>>'{pet,owned}','false')<>'true' THEN RAISE EXCEPTION 'AUX não adquirido.'; END IF;
 v_owned:=coalesce((v_state#>>ARRAY['pet','advancedProtocolOwnedV110',v_id])::integer,0);
 IF v_owned>0 THEN RAISE EXCEPTION 'Protocolo já adquirido; reembolse ou cancele o lote pelo suporte.'; END IF;
 v_old:=coalesce((v_state#>>'{profile,credits}')::bigint,0);
 IF v_winner.user_bid<=0 OR v_old<v_winner.user_bid THEN RAISE EXCEPTION 'Créditos insuficientes para liquidar o leilão.'; END IF;
 v_new:=v_old-v_winner.user_bid;
 v_state:=jsonb_set(v_state,'{profile,credits}',to_jsonb(v_new),true);
 v_state:=jsonb_set(v_state,'{pet,advancedProtocolOwnedV110}',
  coalesce(v_state#>'{pet,advancedProtocolOwnedV110}','{}'::jsonb)||jsonb_build_object(v_id,1),true);
 v_rev:=greatest(0,coalesce((v_state->>'serverPurchaseRevision')::bigint,0))+1;
 v_state:=jsonb_set(v_state,'{serverPurchaseRevision}',to_jsonb(v_rev),true);
 UPDATE public.game_saves SET state=v_state,updated_at=now() WHERE user_id=v_uid;
 UPDATE public.profiles SET credits=v_new,updated_at=now() WHERE id=v_uid;
 IF NOT FOUND THEN RAISE EXCEPTION 'Perfil financeiro ausente.'; END IF;
 UPDATE public.auction_bids SET status='won',updated_at=now()
 WHERE id=v_winner.id AND user_id=v_uid AND status='active';
 IF NOT FOUND THEN RAISE EXCEPTION 'Lote já processado.'; END IF;
 RETURN jsonb_build_object('ok',true,'replayed',false,'state',v_state,'id',v_id,'paid_credits',v_winner.user_bid);
END;
$function$
;
GRANT EXECUTE ON FUNCTION public.claim_aux_protocol_auction_v111(text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.claim_clan_credit_grants_v12()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare v_uid uuid:=auth.uid(); v_total bigint:=0; v_credits bigint; v_new bigint; r record;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  for r in select id,amount from public.clan_credit_grants where recipient_id=v_uid and not claimed order by id for update loop
    v_total:=v_total+r.amount;
    update public.clan_credit_grants set claimed=true,claimed_at=now() where id=r.id;
  end loop;
  select coalesce(credits,0) into v_credits from public.profiles where id=v_uid for update;
  if v_credits is null then raise exception 'Perfil não encontrado.'; end if;
  v_new:=v_credits+v_total;
  if v_total>0 then
    update public.profiles set credits=v_new,updated_at=now() where id=v_uid;
    update public.game_saves set state=jsonb_set(coalesce(state,'{}'::jsonb),'{profile}',
      coalesce(state->'profile','{}'::jsonb)||jsonb_build_object('credits',v_new),true),updated_at=now() where user_id=v_uid;
  end if;
  return jsonb_build_object('ok',true,'credited',v_total,'new_credits',v_new);
end;
$function$
;
GRANT EXECUTE ON FUNCTION public.claim_clan_credit_grants_v12() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_clan_credit_grants_v12() TO service_role;
CREATE OR REPLACE FUNCTION public.place_auction_bid_online(p_hour_key text, p_lot_ref text, p_user_bid bigint, p_lot jsonb)
 RETURNS TABLE(lot_ref text, user_bid bigint, leader_user_id uuid, leader_callsign text, lot jsonb, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
#variable_conflict use_column
DECLARE
  v_uid uuid:=auth.uid();
  v_id text;
  v_row public.live_shop_prices_v16%rowtype;
  v_rules public.game_auction_rules_v1908%rowtype;
  v_factor numeric;
  v_floor bigint;
  v_current public.auction_bids%rowtype;
  v_credits bigint;
  v_reserved bigint;
  v_owned integer;
BEGIN
 IF p_lot_ref !~ '^auxProtocol:' THEN
   RETURN QUERY SELECT * FROM public.place_auction_bid_online_base_v111(p_hour_key,p_lot_ref,p_user_bid,p_lot);
   RETURN;
 END IF;
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Sessão ausente.'; END IF;
 IF p_lot_ref !~ '^auxProtocol:(dano|hp|escudo|loot|porao)$' THEN RAISE EXCEPTION 'Protocolo de leilão inválido.'; END IF;
 v_id:=split_part(p_lot_ref,':',2);
 IF p_hour_key IS NULL OR p_hour_key<>to_char(now() AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD-HH24') THEN
  RAISE EXCEPTION 'Leilão fora da janela atual de São Paulo.';
 END IF;
 IF jsonb_typeof(p_lot)<>'object' OR p_lot->>'ref' IS DISTINCT FROM p_lot_ref
   OR p_lot->>'kind' IS DISTINCT FROM 'auxProtocol' OR p_lot->>'id' IS DISTINCT FROM v_id THEN
  RAISE EXCEPTION 'Identidade do lote inválida.';
 END IF;
 IF p_user_bid<100000 OR mod(p_user_bid,100000)<>0 THEN RAISE EXCEPTION 'Use lances de 100.000 CR.'; END IF;
 SELECT * INTO v_row FROM public.live_shop_prices_v16
 WHERE catalog_key='aux_protocol:'||v_id AND kind='aux_protocol' AND ref_id=v_id
   AND enabled AND shop_visible AND meta->>'auction_enabled'='true';
 IF NOT FOUND THEN RAISE EXCEPTION 'Protocolo não disponível no leilão.'; END IF;
 IF (v_id IN ('dano','hp','escudo') AND (v_row.currency<>'uridium' OR v_row.price<50000))
  OR (v_id IN ('loot','porao') AND (v_row.currency<>'credits' OR v_row.price<100000000)) THEN
  RAISE EXCEPTION 'Preço de catálogo do protocolo inválido.';
 END IF;
 v_factor:=coalesce((v_row.meta->>'auction_factor')::numeric,0.8);
 IF v_factor<0.1 OR v_factor>2 THEN RAISE EXCEPTION 'Fator do leilão inválido.'; END IF;
 SELECT * INTO v_rules FROM public.game_auction_rules_v1908 WHERE id=1;
 IF NOT FOUND THEN RAISE EXCEPTION 'Regras do leilão não encontradas.'; END IF;
 v_floor:=greatest(v_rules.common_floor,
   (ceil((v_row.price::numeric * CASE WHEN v_row.currency='uridium' THEN v_rules.stl_to_credits ELSE 1 END * v_factor)/100000)*100000)::bigint);
 IF p_user_bid<v_floor THEN RAISE EXCEPTION 'Lance abaixo do piso de % CR.',v_floor; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(p_hour_key||':'||p_lot_ref));
 SELECT COALESCE((state#>>ARRAY['pet','advancedProtocolOwnedV110',v_id])::integer,0)
 INTO v_owned FROM public.game_saves
 WHERE user_id=v_uid AND coalesce(state#>>'{pet,owned}','false')='true';
 IF NOT FOUND OR coalesce(v_owned,0)>0 THEN RAISE EXCEPTION 'AUX necessário ou protocolo já possuído.'; END IF;
 SELECT * INTO v_current FROM public.auction_bids
 WHERE hour_key=p_hour_key AND lot_ref=p_lot_ref AND status='active'
 ORDER BY user_bid DESC,updated_at ASC LIMIT 1 FOR UPDATE;
 IF FOUND AND v_current.user_id=v_uid THEN RAISE EXCEPTION 'Você já está liderando este lote.'; END IF;
 IF FOUND AND p_user_bid < greatest(v_floor,v_current.user_bid+100000) THEN
  RAISE EXCEPTION 'Lance insuficiente para cobrir.';
 END IF;
 SELECT COALESCE(credits,0) INTO v_credits FROM public.profiles WHERE id=v_uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Carteira não encontrada.'; END IF;
 SELECT COALESCE(SUM(user_bid),0) INTO v_reserved FROM public.auction_bids
 WHERE user_id=v_uid AND hour_key=p_hour_key AND status='active' AND lot_ref<>p_lot_ref;
 IF v_credits<v_reserved+p_user_bid THEN RAISE EXCEPTION 'Créditos insuficientes para reservar o lance.'; END IF;
 UPDATE public.auction_bids SET status='lost',updated_at=now()
 WHERE hour_key=p_hour_key AND lot_ref=p_lot_ref AND status='active';
 INSERT INTO public.auction_bids(user_id,hour_key,lot_ref,user_bid,lot,status,created_at,updated_at)
 VALUES(v_uid,p_hour_key,p_lot_ref,p_user_bid,p_lot,'active',now(),now())
 ON CONFLICT(user_id,hour_key,lot_ref) DO UPDATE SET
 user_bid=excluded.user_bid,lot=excluded.lot,status='active',updated_at=now();
 RETURN QUERY SELECT b.lot_ref,b.user_bid,b.user_id,coalesce(p.callsign,'Pilot'),b.lot,b.updated_at
 FROM public.auction_bids b LEFT JOIN public.profiles p ON p.id=b.user_id
 WHERE b.user_id=v_uid AND b.hour_key=p_hour_key AND b.lot_ref=p_lot_ref AND b.status='active' LIMIT 1;
END;
$function$
;
GRANT EXECUTE ON FUNCTION public.place_auction_bid_online(text,text,bigint,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.place_auction_bid_online_base_v111(p_hour_key text, p_lot_ref text, p_user_bid bigint, p_lot jsonb)
 RETURNS TABLE(lot_ref text, user_bid bigint, leader_user_id uuid, leader_callsign text, lot jsonb, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
#variable_conflict use_column
DECLARE
 v_uid uuid:=auth.uid(); v_current public.auction_bids%rowtype;
 v_credits bigint:=0;v_reserved bigint:=0;v_floor bigint;v_prefix text;v_lot_kind text;v_expected text;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Sessão ausente.'; END IF;
 v_floor:=public.auction_minimum_floor_v1916(p_lot_ref);
 IF v_floor IS NULL THEN RAISE EXCEPTION 'Este lote não pertence ao catálogo Elite autorizado.'; END IF;
 v_prefix:=split_part(p_lot_ref,':',1);v_expected:=split_part(p_lot_ref,':',2);
 v_lot_kind:=CASE WHEN v_prefix='item' THEN 'item' WHEN v_prefix='petGear' THEN 'petGear' ELSE v_prefix END;
 IF jsonb_typeof(p_lot)<>'object' OR p_lot->>'ref' IS DISTINCT FROM p_lot_ref OR p_lot->>'id' IS DISTINCT FROM v_expected OR p_lot->>'kind' IS DISTINCT FROM v_lot_kind THEN RAISE EXCEPTION 'Identidade do lote inválida.'; END IF;
 IF p_hour_key IS NULL OR p_hour_key !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{2}$' THEN RAISE EXCEPTION 'Janela do leilão inválida.'; END IF;
 IF p_user_bid < 100000 OR MOD(p_user_bid,100000)<>0 THEN RAISE EXCEPTION 'Use lances em passos de 100.000 CR.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(p_hour_key||':'||p_lot_ref));
 SELECT * INTO v_current FROM public.auction_bids WHERE hour_key=p_hour_key AND lot_ref=p_lot_ref AND status='active' ORDER BY user_bid DESC,updated_at ASC LIMIT 1 FOR UPDATE;
 IF FOUND AND v_current.user_id=v_uid THEN RAISE EXCEPTION 'Você já está liderando este lote.'; END IF;
 IF FOUND THEN
   IF p_user_bid<GREATEST(v_current.user_bid+100000,v_floor) THEN RAISE EXCEPTION 'Lance insuficiente. Piso oficial: % CR.',v_floor; END IF;
 ELSIF p_user_bid<v_floor THEN RAISE EXCEPTION 'Lance abaixo do piso oficial: % CR.',v_floor; END IF;
 SELECT COALESCE(credits,0) INTO v_credits FROM public.profiles WHERE id=v_uid FOR UPDATE;
 SELECT COALESCE(SUM(user_bid),0) INTO v_reserved FROM public.auction_bids WHERE user_id=v_uid AND hour_key=p_hour_key AND status='active' AND lot_ref<>p_lot_ref;
 IF v_credits<v_reserved+p_user_bid THEN RAISE EXCEPTION 'Créditos insuficientes considerando os lances em garantia.'; END IF;
 UPDATE public.auction_bids SET status='lost',updated_at=now() WHERE hour_key=p_hour_key AND lot_ref=p_lot_ref AND status='active';
 INSERT INTO public.auction_bids(user_id,hour_key,lot_ref,user_bid,lot,status,created_at,updated_at)
 VALUES(v_uid,p_hour_key,p_lot_ref,p_user_bid,p_lot,'active',now(),now())
 ON CONFLICT(user_id,hour_key,lot_ref) DO UPDATE SET user_bid=excluded.user_bid,lot=excluded.lot,status='active',updated_at=now();
 RETURN QUERY SELECT b.lot_ref,b.user_bid,b.user_id,COALESCE(p.callsign,'Pilot'),b.lot,b.updated_at
 FROM public.auction_bids b LEFT JOIN public.profiles p ON p.id=b.user_id
 WHERE b.user_id=v_uid AND b.hour_key=p_hour_key AND b.lot_ref=p_lot_ref AND b.status='active' LIMIT 1;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.process_all_clan_collection_v12()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare v_date date:=(now() at time zone 'America/Sao_Paulo')::date; c record; m record; v_take bigint; v_new bigint;
v_clan_total bigint; v_total bigint:=0; v_members integer:=0;
begin
 for c in select id,owner_id from public.clans where last_collection_date is distinct from v_date for update loop
   v_clan_total:=0;
   for m in select cm.user_id,coalesce(p.credits,0)::bigint credits
     from public.clan_members cm join public.profiles p on p.id=cm.user_id
     where cm.clan_id=c.id order by cm.joined_at for update of p loop
     v_take:=floor(m.credits*0.10)::bigint;
     if v_take>0 then
       v_new:=m.credits-v_take;
       update public.profiles set credits=v_new,updated_at=now() where id=m.user_id;
       update public.game_saves set state=jsonb_set(
         jsonb_set(coalesce(state,'{}'::jsonb),'{profile}',
           coalesce(state->'profile','{}'::jsonb)||jsonb_build_object('credits',v_new),true),
         '{serverEconomy}',
           coalesce(state->'serverEconomy','{}'::jsonb)||jsonb_build_object('lastClanCollectionDate',v_date,'lastClanCollectionAmount',v_take),true
       ),updated_at=now() where user_id=m.user_id;
       insert into public.clan_transactions(clan_id,actor_id,kind,gross_amount,net_amount,burn_amount)
         values(c.id,m.user_id,'daily_collection',v_take,v_take,0);
       v_clan_total:=v_clan_total+v_take; v_members:=v_members+1;
     end if;
   end loop;
   update public.clans set vault_credits=vault_credits+v_clan_total,total_collected=total_collected+v_clan_total,
     last_collection_date=v_date,updated_at=now() where id=c.id;
   perform public.evaluate_clan_level_v12(c.id);
   v_total:=v_total+v_clan_total;
 end loop;
 return jsonb_build_object('ok',true,'date',v_date,'collected',v_total,'members_charged',v_members);
end;$function$
;
GRANT EXECUTE ON FUNCTION public.process_all_clan_collection_v12() TO service_role;
CREATE OR REPLACE FUNCTION public.record_my_galaxy_event_progress_v1826(p_event_id text, p_delta integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid(); k text; start_ms bigint; t_start timestamptz; t_end timestamptz;
        event_def public.live_event_config_v16%ROWTYPE;
        row_ev public.galaxy_event_progress_v1826%ROWTYPE;
        old_save jsonb; old_rec jsonb; new_rec jsonb; new_save jsonb;
        new_progress int; old_rewarded boolean; r jsonb;
        lv int; mult numeric; xp_mult numeric:=1; cr bigint; stl bigint; xp bigint; cores int;
        new_profile jsonb; new_warfront jsonb; rewards jsonb;
        rotation_enabled boolean; weekend_key text; weekend_start timestamptz; weekend_end timestamptz; manual_key text; manual_start timestamptz; manual_end timestamptz;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Sessão inválida.'; END IF;
  IF p_event_id !~ '^v1817:[a-z][a-z0-9_]{1,48}:[0-9]{13}$' THEN RAISE EXCEPTION 'Identificador de período inválido.'; END IF;
  IF p_delta IS NULL OR p_delta<1 OR p_delta>10000 THEN RAISE EXCEPTION 'Progresso inválido.'; END IF;
  k:=split_part(p_event_id,':',2);start_ms:=split_part(p_event_id,':',3)::bigint;
  t_start:=to_timestamp(start_ms/1000.0);
  SELECT * INTO event_def FROM public.live_event_config_v16 WHERE event_key=k AND enabled=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Evento indisponível.'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.live_event_config_v16
    WHERE enabled=true AND schedule_mode='interval' AND rules @> '{"weekend_rotation":true}'::jsonb)
  INTO rotation_enabled;
  IF rotation_enabled AND event_def.schedule_mode='interval' THEN
    -- Aceita EXCLUSIVAMENTE o evento e o início do slot oficial vigente.
    SELECT m.event_key,m.start_at,m.end_at INTO manual_key,manual_start,manual_end
      FROM public.live_event_manual_override_v3411 m WHERE m.id=1 AND m.start_at<=clock_timestamp() AND m.end_at>clock_timestamp();
    IF manual_key=k AND manual_start IS NOT NULL AND abs(extract(epoch FROM (t_start-manual_start)))<=0.5 THEN
      t_end:=manual_end;
    ELSE
      -- Enquanto houver evento manual, a rotação automática fica suspensa.
      IF manual_key IS NOT NULL THEN RAISE EXCEPTION 'Existe um evento extraordinário em andamento.'; END IF;
      SELECT w.event_key,w.event_start,w.event_end
        INTO weekend_key,weekend_start,weekend_end
        FROM public.weekend_event_slot_v341(clock_timestamp()) w;
      IF weekend_key IS NULL OR weekend_key<>k OR abs(extract(epoch FROM (t_start-weekend_start)))>0.5
        THEN RAISE EXCEPTION 'Período não pertence à rotação oficial do fim de semana.'; END IF;
      t_end:=weekend_end;
    END IF;
    t_end:=least(t_end,coalesce(event_def.ends_at,'infinity'::timestamptz));
  ELSE
    t_end:=least(t_start+make_interval(mins=>event_def.duration_minutes),coalesce(event_def.ends_at,'infinity'::timestamptz));
    IF event_def.schedule_mode='once' THEN
      IF abs(extract(epoch FROM (t_start-event_def.starts_at)))>0.5 THEN RAISE EXCEPTION 'Janela única inválida.'; END IF;
    ELSIF event_def.schedule_mode='weekly' THEN
      IF NOT (extract(dow FROM t_start AT TIME ZONE 'America/Sao_Paulo')::int = ANY(event_def.weekdays)
         AND (t_start AT TIME ZONE 'America/Sao_Paulo')::time = event_def.start_local_time)
        THEN RAISE EXCEPTION 'Janela semanal inválida.'; END IF;
    ELSE
      IF t_start<event_def.starts_at OR event_def.repeat_minutes<1
        OR abs(mod(extract(epoch FROM (t_start-event_def.starts_at))::numeric, (event_def.repeat_minutes*60)::numeric))>0.5
        THEN RAISE EXCEPTION 'Janela recorrente inválida.'; END IF;
    END IF;
  END IF;
  IF clock_timestamp()<t_start OR clock_timestamp()>=t_end THEN RAISE EXCEPTION 'Período do evento encerrado.'; END IF;
  SELECT state INTO old_save FROM public.game_saves WHERE user_id=uid FOR UPDATE;
  IF old_save IS NULL THEN RAISE EXCEPTION 'Save online não localizado.'; END IF;
  old_rec:=old_save #> ARRAY['galaxyEvents','records',p_event_id];
  old_rewarded:=coalesce((old_rec->>'rewarded')::boolean,false)
     OR coalesce((old_save->'eventRewardsV1826') ? p_event_id,false);
  INSERT INTO public.galaxy_event_progress_v1826(user_id,event_id,event_key,event_start,event_end,target,progress,rewarded,rewarded_at)
  VALUES(uid,p_event_id,k,t_start,t_end,event_def.target,
    least(event_def.target,greatest(0,coalesce((old_rec->>'value')::int,0))),old_rewarded,
    CASE WHEN old_rewarded THEN now() ELSE NULL END)
  ON CONFLICT (user_id,event_id) DO NOTHING;
  SELECT * INTO row_ev FROM public.galaxy_event_progress_v1826 WHERE user_id=uid AND event_id=p_event_id FOR UPDATE;
  IF row_ev.rewarded THEN
    RETURN jsonb_build_object('eventId',p_event_id,'progress',row_ev.target,'target',row_ev.target,'complete',true,'rewarded',true,'rewardedNow',false);
  END IF;
  new_progress:=least(row_ev.target,greatest(row_ev.progress,0)+p_delta);
  IF new_progress<row_ev.target THEN
    UPDATE public.galaxy_event_progress_v1826 SET progress=new_progress,updated_at=now() WHERE user_id=uid AND event_id=p_event_id;
    RETURN jsonb_build_object('eventId',p_event_id,'progress',new_progress,'target',row_ev.target,'complete',false,'rewarded',false,'rewardedNow',false);
  END IF;
  -- Chegou ao objetivo, creditado no banco exatamente uma vez.
  lv:=greatest(1,coalesce((old_save#>>'{profile,level}')::int,1));
  mult:=1+least(1.5,greatest(0,lv-1)/36.0);
  cr:=round(coalesce((event_def.reward->>'credits')::numeric,0)*mult);
  stl:=round(coalesce((event_def.reward->>'uridium')::numeric,0)*mult);
  xp:=round(coalesce((event_def.reward->>'xp')::numeric,0)*mult*.55);
  cores:=greatest(0,coalesce((event_def.reward->>'cores')::integer,0));
  new_profile:=coalesce(old_save->'profile','{}'::jsonb);
  new_profile:=jsonb_set(new_profile,'{credits}',to_jsonb(coalesce((new_profile->>'credits')::bigint,0)+cr),true);
  new_profile:=jsonb_set(new_profile,'{uridium}',to_jsonb(coalesce((new_profile->>'uridium')::bigint,0)+stl),true);
  new_profile:=jsonb_set(new_profile,'{xp}',to_jsonb(coalesce((new_profile->>'xp')::bigint,0)+xp),true);
  new_warfront:=coalesce(old_save->'warfront','{}'::jsonb);
  new_warfront:=jsonb_set(new_warfront,'{skillCores}',to_jsonb(coalesce((new_warfront->>'skillCores')::int,0)+cores),true);
  new_rec:=coalesce(old_rec,'{}'::jsonb)||jsonb_build_object('value',row_ev.target,'complete',true,'rewarded',true,'completedAt',now()::text);
  rewards:=jsonb_build_object('credits',cr,'uridium',stl,'xp',xp,'cores',cores);
  new_save:=jsonb_set(old_save,'{profile}',new_profile,true);
  new_save:=jsonb_set(new_save,'{warfront}',new_warfront,true);
  new_save:=jsonb_set(new_save,'{galaxyEvents}',coalesce(new_save->'galaxyEvents','{"records":{}}'::jsonb),true);
  new_save:=jsonb_set(new_save,'{galaxyEvents,records}',coalesce(new_save#>'{galaxyEvents,records}','{}'::jsonb),true);
  new_save:=jsonb_set(new_save,ARRAY['galaxyEvents','records',p_event_id],new_rec,true);
  new_save:=jsonb_set(new_save,'{eventRewardsV1826}',coalesce(old_save->'eventRewardsV1826','{}'::jsonb)||jsonb_build_object(p_event_id,rewards),true);
  UPDATE public.game_saves SET state=new_save,updated_at=now() WHERE user_id=uid;
  UPDATE public.profiles SET credits=coalesce((new_profile->>'credits')::bigint,0),uridium=coalesce((new_profile->>'uridium')::bigint,0),xp=coalesce((new_profile->>'xp')::bigint,0),updated_at=now() WHERE id=uid;
  UPDATE public.galaxy_event_progress_v1826 SET progress=row_ev.target,rewarded=true,rewarded_at=now(),updated_at=now() WHERE user_id=uid AND event_id=p_event_id;
  RETURN jsonb_build_object('eventId',p_event_id,'progress',row_ev.target,'target',row_ev.target,'complete',true,'rewarded',true,'rewardedNow',true,'reward',rewards,'state',new_save);
END;
$function$
;
GRANT EXECUTE ON FUNCTION public.record_my_galaxy_event_progress_v1826(text,integer) TO authenticated;
CREATE OR REPLACE FUNCTION public.redeem_aux_sentinel_coupon_v1(p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_code text := upper(btrim(coalesce(p_code,'')));
  v_coupon record;
  v_save jsonb;
  v_pet jsonb;
  v_gears jsonb;
  v_pet_owned boolean;
  v_new_pet jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Faça login para resgatar um cupom.' USING ERRCODE='28000';
  END IF;
  IF v_code !~ '^AUX-SENT-[A-F0-9]{24}$' THEN
    RAISE EXCEPTION 'Cupom inválido ou já utilizado.' USING ERRCODE='22023';
  END IF;
  SELECT code, active, expires_at, redeemed_by INTO v_coupon
    FROM public.stellar_aux_sentinel_coupons_v1
    WHERE code=v_code FOR UPDATE;
  IF NOT FOUND OR NOT v_coupon.active
    OR v_coupon.redeemed_by IS NOT NULL
    OR (v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at <= now()) THEN
    RAISE EXCEPTION 'Cupom inválido ou já utilizado.' USING ERRCODE='22023';
  END IF;

  SELECT state INTO v_save FROM public.game_saves WHERE user_id=v_uid FOR UPDATE;
  IF v_save IS NULL OR jsonb_typeof(v_save) <> 'object' THEN
    RAISE EXCEPTION 'A conta ainda não possui save online.' USING ERRCODE='22023';
  END IF;
  IF coalesce(nullif(v_save->>'accountOwnerId',''),v_uid::text) <> v_uid::text THEN
    RAISE EXCEPTION 'Save pertence a outro usuário.' USING ERRCODE='28000';
  END IF;

  v_pet := coalesce(v_save->'pet','{}'::jsonb);
  IF jsonb_typeof(v_pet) <> 'object' THEN
    RAISE EXCEPTION 'Estado do AUX-9 inválido.' USING ERRCODE='22023';
  END IF;
  v_gears := coalesce(v_pet->'gearsOwned','{}'::jsonb);
  IF jsonb_typeof(v_gears) <> 'object' THEN
    v_gears := '{}'::jsonb;
  END IF;
  v_pet_owned := coalesce((v_pet->>'owned')::boolean,false);
  IF v_pet_owned AND coalesce((v_gears->>'guard')::boolean,false) THEN
    RAISE EXCEPTION 'Esta conta já possui AUX-9 com Sentinela.' USING ERRCODE='22023';
  END IF;

  v_new_pet := v_pet || jsonb_build_object(
    'owned', true,
    'level', greatest(1,coalesce((v_pet->>'level')::int,1)),
    'xp', greatest(0,coalesce((v_pet->>'xp')::numeric,0)),
    'xpModelV175', coalesce((v_pet->>'xpModelV175')::boolean,true),
    'laserSlotsUnlocked', greatest(1,coalesce((v_pet->>'laserSlotsUnlocked')::int,0)),
    'shieldSlotsUnlocked', greatest(2,coalesce((v_pet->>'shieldSlotsUnlocked')::int,0)),
    'lasers', CASE WHEN jsonb_typeof(v_pet->'lasers')='array' AND jsonb_array_length(v_pet->'lasers')>0 THEN v_pet->'lasers' ELSE '[null]'::jsonb END,
    'shields', CASE WHEN jsonb_typeof(v_pet->'shields')='array' AND jsonb_array_length(v_pet->'shields')>0 THEN v_pet->'shields' ELSE '[null,null]'::jsonb END,
    'gearsOwned', v_gears || '{"guard":true}'::jsonb,
    'activeGear', 'guard',
    'kamikazeReadyAt', greatest(0,coalesce((v_pet->>'kamikazeReadyAt')::numeric,0))
  );

  UPDATE public.game_saves SET state=jsonb_set(v_save,'{pet}',v_new_pet,true),updated_at=now()
    WHERE user_id=v_uid;
  UPDATE public.stellar_aux_sentinel_coupons_v1 SET redeemed_by=v_uid,redeemed_at=now()
    WHERE code=v_code;

  RETURN jsonb_build_object(
    'ok',true,
    'reward','aux9_with_guard_mode',
    'pet_already_owned',v_pet_owned,
    'active_gear','guard'
  );
END;
$function$
;
CREATE OR REPLACE FUNCTION public.redeem_game_coupon_v1821(p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  uid uuid := auth.uid();
  code_input text := upper(btrim(coalesce(p_code,'')));
  rec public.game_coupons_v1821%ROWTYPE;
  saved jsonb;
  reward jsonb;
  v_kind text;
  item_id text;
  qty bigint;
  asset_key text;
  prop_name text;
  pet jsonb;
  gear_owned jsonb;
  owned boolean;
  current_num numeric;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Você precisa estar conectado para resgatar.'; END IF;
  IF code_input !~ '^[A-Z0-9][A-Z0-9_-]{3,63}$' THEN RAISE EXCEPTION 'Cupom inválido.'; END IF;
  SELECT * INTO rec FROM public.game_coupons_v1821 WHERE code=code_input FOR UPDATE;
  IF NOT FOUND OR NOT rec.active OR rec.starts_at > now()
    OR (rec.expires_at IS NOT NULL AND rec.expires_at <= now()) THEN
    RAISE EXCEPTION 'Cupom inválido, inativo ou expirado.';
  END IF;
  IF rec.redeemed_count >= rec.max_uses THEN RAISE EXCEPTION 'Cupom esgotado.'; END IF;
  IF EXISTS (SELECT 1 FROM public.game_coupon_redemptions_v1821 WHERE code=code_input AND user_id=uid) THEN
    RAISE EXCEPTION 'Você já resgatou este cupom.';
  END IF;
  SELECT state INTO saved FROM public.game_saves WHERE user_id=uid FOR UPDATE;
  IF saved IS NULL OR jsonb_typeof(saved)<>'object' THEN RAISE EXCEPTION 'Crie um piloto e salve o jogo antes de resgatar.'; END IF;
  IF coalesce(nullif(saved->>'accountOwnerId',''),uid::text)<>uid::text THEN
    RAISE EXCEPTION 'O save pertence a outro jogador.';
  END IF;
  IF coalesce((saved #>> '{profile,level}')::int,1)<rec.min_level THEN
    RAISE EXCEPTION 'Este cupom requer nível %.',rec.min_level;
  END IF;
  -- Não consumir cupom para jogador que já possui todos os componentes de AUX+Sentinela.
  IF jsonb_array_length(rec.rewards)=1
     AND rec.rewards->0->>'kind'='aux_sentinel'
     AND coalesce((saved #>> '{pet,owned}')::boolean,false)
     AND coalesce((saved #>> '{pet,gearsOwned,guard}')::boolean,false) THEN
    RAISE EXCEPTION 'Você já possui o AUX-9 com o Sentinela.';
  END IF;

  FOR reward IN SELECT value FROM jsonb_array_elements(rec.rewards) AS x(value) LOOP
    IF jsonb_typeof(reward)<>'object' THEN RAISE EXCEPTION 'Prêmio do cupom mal configurado.'; END IF;
    v_kind := coalesce(reward->>'kind','');
    item_id := coalesce(reward->>'id','');

    IF v_kind IN ('aux_sentinel','aux9') THEN
      pet := coalesce(saved->'pet','{}'::jsonb);
      IF jsonb_typeof(pet)<>'object' THEN RAISE EXCEPTION 'Dados inválidos do AUX-9.'; END IF;
      owned := coalesce((pet->>'owned')::boolean,false);
      IF NOT owned THEN
        pet := pet || jsonb_build_object('owned',true,'level',greatest(1,coalesce((pet->>'level')::int,1)),
          'xp',greatest(0,coalesce((pet->>'xp')::numeric,0)), 'xpModelV175',true,
          'laserSlotsUnlocked',greatest(1,coalesce((pet->>'laserSlotsUnlocked')::int,0)),
          'shieldSlotsUnlocked',greatest(2,coalesce((pet->>'shieldSlotsUnlocked')::int,0)),
          'lasers','[null]'::jsonb,'shields','[null,null]'::jsonb,'activeGear','off');
      END IF;
      IF v_kind='aux_sentinel' THEN
        gear_owned := coalesce(pet->'gearsOwned','{}'::jsonb);
        IF jsonb_typeof(gear_owned)<>'object' THEN gear_owned:='{}'::jsonb; END IF;
        pet := pet || jsonb_build_object('gearsOwned',gear_owned||'{"guard":true}'::jsonb,'activeGear','guard');
      END IF;
      saved := jsonb_set(saved,'{pet}',pet,true);

    ELSIF v_kind='pet_gear' THEN
      IF item_id NOT IN ('guard','box','ore','repair','kami') THEN RAISE EXCEPTION 'Módulo do AUX-9 inválido.'; END IF;
      pet := coalesce(saved->'pet','{}'::jsonb);
      IF NOT coalesce((pet->>'owned')::boolean,false) THEN RAISE EXCEPTION 'Este prêmio exige AUX-9 já adquirido.'; END IF;
      gear_owned := coalesce(pet->'gearsOwned','{}'::jsonb);
      IF jsonb_typeof(gear_owned)<>'object' THEN gear_owned:='{}'::jsonb; END IF;
      pet := jsonb_set(pet,'{gearsOwned}',gear_owned||jsonb_build_object(item_id,true),true);
      saved := jsonb_set(saved,'{pet}',pet,true);

    ELSIF v_kind IN ('credits','uridium') THEN
      qty := coalesce((reward->>'amount')::bigint,0);
      IF qty<1 OR qty>100000000 THEN RAISE EXCEPTION 'Quantidade de moeda fora do limite (1 a 100 milhões).'; END IF;
      current_num := coalesce((saved->'profile'->>v_kind)::numeric,0);
      IF current_num+qty>100000000000000 THEN RAISE EXCEPTION 'Saldo máximo excedido.'; END IF;
      saved := jsonb_set(saved,ARRAY['profile',v_kind],to_jsonb(current_num+qty),true);

    ELSIF v_kind IN ('inventory','ammo','rocket','ship') THEN
      IF item_id !~ '^[A-Za-z0-9_-]{1,64}$' THEN RAISE EXCEPTION 'ID do prêmio inválido.'; END IF;
      qty := coalesce((reward->>'qty')::bigint,1);
      IF qty<1 OR qty>1000000 THEN RAISE EXCEPTION 'Quantidade inválida.'; END IF;
      IF v_kind='ship' THEN
        IF qty<>1 THEN RAISE EXCEPTION 'Naves exigem quantidade 1.'; END IF;
        IF NOT EXISTS (SELECT 1 FROM public.live_shop_prices_v16 WHERE enabled=true AND kind='ship' AND ref_id=item_id) THEN
          RAISE EXCEPTION 'Nave não cadastrada na Loja.';
        END IF;
        IF coalesce(saved->'ownedShips','[]'::jsonb) ? item_id THEN
          RAISE EXCEPTION 'Essa nave já pertence à conta.';
        END IF;
        saved:=jsonb_set(saved,'{ownedShips}',coalesce(saved->'ownedShips','[]'::jsonb)||jsonb_build_array(item_id),true);
      ELSE
        asset_key := CASE v_kind WHEN 'inventory' THEN 'inventory' WHEN 'ammo' THEN 'ammo' ELSE 'rockets' END;
        IF NOT EXISTS (SELECT 1 FROM public.live_shop_prices_v16
          WHERE enabled=true AND ref_id=item_id
            AND ((v_kind='inventory' AND kind IN ('laser','generator','extra'))
              OR (v_kind='ammo' AND kind='ammo')
              OR (v_kind='rocket' AND kind='rocket'))) THEN
          RAISE EXCEPTION 'Item de prêmio não cadastrado na Loja.';
        END IF;
        current_num:=coalesce((saved->asset_key->>item_id)::numeric,0);
        IF current_num+qty>1000000000 THEN RAISE EXCEPTION 'Quantidade máxima excedida.'; END IF;
        saved:=jsonb_set(saved,ARRAY[asset_key,item_id],to_jsonb(current_num+qty),true);
      END IF;
    ELSE
      RAISE EXCEPTION 'Tipo de prêmio não suportado: %.',v_kind;
    END IF;
  END LOOP;

  saved:=jsonb_set(saved,'{couponClaimsV1821}',
    coalesce(saved->'couponClaimsV1821','{}'::jsonb)||jsonb_build_object(code_input,now()::text),true);

  UPDATE public.game_saves SET state=saved,updated_at=now() WHERE user_id=uid;
  INSERT INTO public.game_coupon_redemptions_v1821(code,user_id,rewards_snapshot)
    VALUES(code_input,uid,rec.rewards);
  UPDATE public.game_coupons_v1821 SET redeemed_count=redeemed_count+1 WHERE code=code_input;

  RETURN jsonb_build_object('ok',true,'code',code_input,'title',rec.title,'rewards',rec.rewards,'state',saved);
END;
$function$
;
GRANT EXECUTE ON FUNCTION public.redeem_game_coupon_v1821(text) TO authenticated;
CREATE OR REPLACE FUNCTION public.redeem_game_coupon_v193(p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid(); v_code text:=upper(btrim(coalesce(p_code,'')));
 rec public.game_coupons_v193%rowtype; saved jsonb;r jsonb;
 k text;i text;qty bigint;old_val numeric;v_days integer;old_until timestamptz;
 season text;slots integer;drone_count integer;v_drone jsonb;v_drones jsonb;v_cargo jsonb;
 v_result jsonb; v_limit bigint;
begin
 if uid is null then raise exception 'Entre na sua conta para resgatar.'; end if;
 select * into rec from public.game_coupons_v193 where code=v_code for update;
 if not found then return jsonb_build_object('handled',false); end if;
 if not rec.active or rec.starts_at>now() or (rec.expires_at is not null and rec.expires_at<=now()) then raise exception 'Cupom inativo ou expirado.'; end if;
 if rec.redeemed_count>=rec.max_uses then raise exception 'Cupom esgotado.'; end if;
 if exists(select 1 from public.game_coupon_redemptions_v193 where code=v_code and user_id=uid) then raise exception 'Você já utilizou este cupom.'; end if;
 select state into saved from public.game_saves where user_id=uid for update;
 if jsonb_typeof(saved) is distinct from 'object' then raise exception 'Salve um personagem antes de resgatar.'; end if;
 if coalesce(nullif(saved->>'accountOwnerId',''),uid::text)<>uid::text then raise exception 'Save de outro jogador.'; end if;
 if coalesce((saved #>> '{profile,level}')::integer,1)<rec.min_level then raise exception 'Cupom exige nível %.',rec.min_level; end if;
 for r in select value from jsonb_array_elements(rec.rewards) loop
   k:=r->>'kind';i:=r->>'id';qty:=coalesce(nullif(r->>'qty','')::bigint,1);
   -- Desconfie de reward JSON injetado: revalide o catálogo também ao resgatar.
   if not exists(select 1 from public.game_coupon_reward_catalog_v193 where kind=k and item_id=i) then raise exception 'Prêmio sem cadastro autorizado.'; end if;
   if k='premium' then
     v_days:=coalesce((r->>'days')::integer,0);
     if v_days not between 1 and 365 then raise exception 'Premium inválido.'; end if;
     insert into public.premium_accounts_v12(user_id,premium_until,updated_at) values(uid,now()+(v_days||' days')::interval,now())
     on conflict(user_id) do update set premium_until=greatest(now(),coalesce(public.premium_accounts_v12.premium_until,now()))+(v_days||' days')::interval,updated_at=now();
   elsif k='battle_pass' then
     select season_key into season from public.game_battle_pass_seasons_v1817b where enabled and starts_at<=now() and (ends_at is null or ends_at>now()) order by starts_at desc limit 1;
     if season is null then raise exception 'Nenhuma temporada ativa para o Passe Premium.'; end if;
     if exists(select 1 from public.premium_accounts_v12 where user_id=uid and battle_pass_season=season) then raise exception 'Passe Premium desta temporada já está ativo.'; end if;
     insert into public.premium_accounts_v12(user_id,battle_pass_season,updated_at) values(uid,season,now())
     on conflict(user_id) do update set battle_pass_season=excluded.battle_pass_season,updated_at=now();
   elsif k in ('credits','uridium') then
     if qty not between 1 and 100000000 then raise exception 'Valor inválido.'; end if;
     old_val:=coalesce((saved->'profile'->>k)::numeric,0);
     if old_val+qty>100000000000000 then raise exception 'Limite de saldo excedido.'; end if;
     saved:=jsonb_set(saved,ARRAY['profile',k],to_jsonb(old_val+qty),true);
     update public.profiles set credits=case when k='credits' then (old_val+qty)::bigint else credits end,
       uridium=case when k='uridium' then (old_val+qty)::bigint else uridium end,updated_at=now() where id=uid;
   elsif k='ship' then
     if qty<>1 then raise exception 'Nave aceita 1 unidade.'; end if;
     if coalesce(saved->'ownedShips','[]'::jsonb) ? i then raise exception 'Você já possui esta nave.'; end if;
     saved:=jsonb_set(saved,'{ownedShips}',coalesce(saved->'ownedShips','[]'::jsonb)||jsonb_build_array(i),true);
   elsif k='drone' then
     v_drones:=coalesce(saved->'drones','[]'::jsonb);
     if jsonb_typeof(v_drones)<>'array' then raise exception 'Drones inválidos.'; end if;
     drone_count:=jsonb_array_length(v_drones);
     if qty<1 or qty>8 or drone_count+qty>8 then raise exception 'O jogador precisa de slots livres para receber os drones.'; end if;
     slots:=case when i='iris' then 2 when i='flax' then 1 else 0 end;
     if slots=0 then raise exception 'Drone desconhecido.'; end if;
     for j in 1..qty loop
       v_drone:=jsonb_build_object('id','d_coupon_'||replace(gen_random_uuid()::text,'-',''),'type',i,'slots',case when slots=2 then '[null,null]'::jsonb else '[null]'::jsonb end);
       v_drones:=v_drones||jsonb_build_array(v_drone);
     end loop;
     saved:=jsonb_set(saved,'{drones}',v_drones,true);
   elsif k in ('inventory','ammo','rocket','cargo') then
     v_limit:=case when k='inventory' then 10000 when k='cargo' then 100000 else 10000000 end;
     if qty<1 or qty>v_limit then raise exception 'Quantidade inválida.'; end if;
     k:=case when k='rocket' then 'rockets' else k end;
     old_val:=coalesce((saved->k->>i)::numeric,0);
     if old_val+qty>1000000000 then raise exception 'Estoque máximo excedido.'; end if;
     if k='cargo' and i<>'Xenomit' then
       -- Não gerar minérios acima da capacidade do porão: compatível com cargo do jogo.
       if qty>10000 then raise exception 'Para recursos de porão, use até 10.000 por cupom.'; end if;
     end if;
     saved:=jsonb_set(saved,array[k,i],to_jsonb(old_val+qty),true);
   else raise exception 'Prêmio não reconhecido.';
   end if;
 end loop;
 saved:=jsonb_set(saved,'{couponClaimsV1821}',coalesce(saved->'couponClaimsV1821','{}'::jsonb)||jsonb_build_object(v_code,now()::text),true);
 update public.game_saves set state=saved,updated_at=now() where user_id=uid;
 insert into public.game_coupon_redemptions_v193(code,user_id,rewards_snapshot) values(v_code,uid,rec.rewards);
 update public.game_coupons_v193 set redeemed_count=redeemed_count+1 where code=v_code;
 return jsonb_build_object('handled',true,'ok',true,'code',v_code,'title',rec.title,'rewards',rec.rewards,'state',saved);
end;$function$
;
GRANT EXECUTE ON FUNCTION public.redeem_game_coupon_v193(text) TO authenticated;
CREATE OR REPLACE FUNCTION public.stellar_claim_astral_v381(p_user_id uuid, p_gate text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE s jsonb; n bigint; last_n bigint; wk text; lock_week text; weekly boolean; q jsonb; rev bigint; cr bigint; stl bigint; cores bigint;
        c jsonb; a jsonb; rockets jsonb; bio jsonb; prof jsonb; res text; v bigint;
BEGIN
 IF p_user_id IS NULL OR p_gate NOT IN ('alpha','beta','gamma') THEN RAISE EXCEPTION 'ASTRAL_INVALID_CLAIM'; END IF;
 SELECT state INTO s FROM public.game_saves WHERE user_id=p_user_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'ASTRAL_SAVE_MISSING'; END IF;
 n:=greatest(0,coalesce((s#>>ARRAY['galaxyGate',p_gate,'completed'])::bigint,0));
 INSERT INTO public.stellar_astral_cursor_v381(user_id,gate,last_completed) VALUES(p_user_id,p_gate,0) ON CONFLICT DO NOTHING;
 SELECT last_completed INTO last_n FROM public.stellar_astral_cursor_v381 WHERE user_id=p_user_id AND gate=p_gate FOR UPDATE;
 IF n<=last_n THEN RETURN jsonb_build_object('claimed',false,'reason','NO_PENDING_COMPLETION'); END IF;
 wk:=to_char(timezone('America/Sao_Paulo',now()),'IYYY-IW');
 weekly:=NOT EXISTS(SELECT 1 FROM public.stellar_astral_ledger_v381 WHERE user_id=p_user_id AND gate=p_gate AND week_id=wk);
 SELECT locked.quote,locked.config_revision,locked.week_id INTO q,rev,lock_week
 FROM public.stellar_astral_quote_lock_v381 locked
 WHERE locked.user_id=p_user_id AND locked.gate=p_gate AND locked.completion_number=last_n+1 FOR UPDATE;
 IF q IS NULL THEN
   q:=public.stellar_astral_quote_v381(p_gate,weekly);
   SELECT revision INTO rev FROM public.stellar_astral_config_v381 WHERE gate=p_gate;
 ELSE
   wk:=lock_week;
   weekly:=(q->>'firstWeekly')::boolean;
 END IF;
 INSERT INTO public.stellar_astral_ledger_v381(user_id,gate,completion_number,week_id,first_weekly,quote,config_revision)
 VALUES(p_user_id,p_gate,last_n+1,wk,weekly,q,rev);
 cr:=(q->>'credits')::bigint;stl:=(q->>'stl')::bigint;cores:=(q->>'cores')::bigint;res:=q->>'resource';
 prof:=coalesce(s->'profile','{}'::jsonb);
 prof:=prof||jsonb_build_object('credits',coalesce((prof->>'credits')::bigint,0)+cr,'uridium',coalesce((prof->>'uridium')::bigint,0)+stl);
 s:=jsonb_set(s,'{profile}',prof,true);
 bio:=coalesce(s->'pilotBio','{}'::jsonb);
 bio:=bio||jsonb_build_object('logDisks',coalesce((bio->>'logDisks')::bigint,0)+cores);
 s:=jsonb_set(s,'{pilotBio}',bio,true);
 c:=coalesce(s->'cargo','{}'::jsonb);
 c:=c||jsonb_build_object('Xenomit',coalesce((c->>'Xenomit')::bigint,0)+(q->>'voidite')::bigint,
   res,coalesce((c->>res)::bigint,0)+(q->>'resourceQty')::bigint);
 s:=jsonb_set(s,'{cargo}',c,true);
 a:=coalesce(s->'ammo','{}'::jsonb);
 a:=a||jsonb_build_object(q->>'ammoId',coalesce((a->>(q->>'ammoId'))::bigint,0)+(q->>'ammoQty')::bigint);
 s:=jsonb_set(s,'{ammo}',a,true);
 rockets:=coalesce(s->'rockets','{}'::jsonb);
 rockets:=rockets||jsonb_build_object(q->>'rocketId',coalesce((rockets->>(q->>'rocketId'))::bigint,0)+(q->>'rocketQty')::bigint);
 s:=jsonb_set(s,'{rockets}',rockets,true);
 -- Usa a revisão de compras já reconhecida pelo backend para bloquear saves antigos.
 s:=jsonb_set(s,'{serverPurchaseRevision}',to_jsonb(coalesce((s->>'serverPurchaseRevision')::bigint,0)+1),true);
 UPDATE public.game_saves SET state=s,updated_at=now() WHERE user_id=p_user_id;
 UPDATE public.profiles SET credits=(prof->>'credits')::bigint,uridium=(prof->>'uridium')::bigint,updated_at=now() WHERE id=p_user_id;
 UPDATE public.stellar_astral_cursor_v381 SET last_completed=last_n+1,updated_at=now() WHERE user_id=p_user_id AND gate=p_gate;
 DELETE FROM public.stellar_astral_quote_lock_v381 WHERE user_id=p_user_id AND gate=p_gate AND completion_number=last_n+1;
 RETURN jsonb_build_object('claimed',true,'quote',q,'completion',last_n+1,'revision',s->'serverPurchaseRevision');
END;$function$
;
GRANT EXECUTE ON FUNCTION public.stellar_claim_astral_v381(uuid,text) TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_claim_competitive_season(p_season_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_uid uuid:=auth.uid();v_season public.stellar_competitive_seasons;
 v_rank bigint;v_points bigint;v_state jsonb;v_profile jsonb;v_rev bigint;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 select * into v_season from public.stellar_competitive_seasons where id=p_season_id and enabled for share;
 if not found or now()<v_season.ends_at then raise exception 'SEASON_NOT_CLOSED';end if;
 select scores.rnk,scores.points into v_rank,v_points from (
  select user_id,points,row_number() over(order by points desc,user_id) as rnk from (
   select a.actor_user_id as user_id,sum(case when a.kind='capture' then 10 else 3 end)::bigint as points
   from public.stellar_war_actions a where a.occurred_at>=v_season.starts_at and a.occurred_at<v_season.ends_at and a.actor_user_id is not null
   group by a.actor_user_id
  ) raw
 ) scores where scores.user_id=v_uid;
 if v_rank is null or v_rank>v_season.top_n or v_points<v_season.min_points then raise exception 'SEASON_REWARD_NOT_ELIGIBLE';end if;
 select state into v_state from public.game_saves where user_id=v_uid for update;
 if v_state is null then raise exception 'SAVE_NOT_FOUND';end if;
 if exists(select 1 from public.stellar_competitive_claims where season_id=p_season_id and user_id=v_uid) then
  return jsonb_build_object('ok',true,'already_claimed',true,'state',v_state);
 end if;
 insert into public.stellar_competitive_claims(season_id,user_id,points,rank,credits,stl)
 values(p_season_id,v_uid,v_points,v_rank,v_season.reward_credits,v_season.reward_stl);
 v_profile:=coalesce(v_state->'profile','{}'::jsonb);
 v_profile:=jsonb_set(v_profile,'{credits}',to_jsonb(greatest(0,coalesce((v_profile->>'credits')::numeric,0))+v_season.reward_credits),true);
 v_profile:=jsonb_set(v_profile,'{uridium}',to_jsonb(greatest(0,coalesce((v_profile->>'uridium')::numeric,0))+v_season.reward_stl),true);
 v_rev:=coalesce((v_state->>'serverEliteRevision')::bigint,0)+1;
 v_state:=jsonb_set(jsonb_set(v_state,'{profile}',v_profile,true),'{serverEliteRevision}',to_jsonb(v_rev),true);
 update public.game_saves set state=v_state,updated_at=now() where user_id=v_uid;
 return jsonb_build_object('ok',true,'already_claimed',false,'rank',v_rank,'points',v_points,'credits',v_season.reward_credits,'stl',v_season.reward_stl,'state',v_state);
end;$function$
;
GRANT EXECUTE ON FUNCTION public.stellar_claim_competitive_season(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.stellar_claim_elite_objective(p_objective_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
 v_uid uuid:=auth.uid();v_counters public.stellar_elite_counters;
 v_metric bigint;v_target bigint;v_cr bigint;v_stl bigint;v_title text;
 v_state jsonb;v_profile jsonb;v_rev bigint;v_objective public.stellar_elite_objectives;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 select * into v_objective from public.stellar_elite_objectives where objective_id=p_objective_id and enabled=true for share;
 if not found then raise exception 'UNKNOWN_ELITE_OBJECTIVE';end if;
 v_target:=v_objective.target;v_cr:=v_objective.credits;v_stl:=v_objective.stl;v_title:=v_objective.title;
 select * into v_counters from public.stellar_elite_counters where user_id=v_uid for update;
 v_metric:=case when v_objective.metric='sector_captures' then coalesce(v_counters.sector_captures,0) else coalesce(v_counters.npc_kills,0) end;
 if v_metric<v_target then raise exception 'ELITE_OBJECTIVE_NOT_COMPLETE';end if;
 select state into v_state from public.game_saves where user_id=v_uid for update;
 if v_state is null then raise exception 'SAVE_NOT_FOUND';end if;
 if exists(select 1 from public.stellar_elite_claims where user_id=v_uid and objective_id=p_objective_id) then
  return jsonb_build_object('ok',true,'already_claimed',true,'objective_id',p_objective_id,'state',v_state);
 end if;
 insert into public.stellar_elite_claims(user_id,objective_id,title,credits,stl) values(v_uid,p_objective_id,v_title,v_cr,v_stl);
 v_profile:=coalesce(v_state->'profile','{}'::jsonb);
 v_profile:=jsonb_set(v_profile,'{credits}',to_jsonb(greatest(0,coalesce(floor((v_profile->>'credits')::numeric)::bigint,0))+v_cr),true);
 v_profile:=jsonb_set(v_profile,'{uridium}',to_jsonb(greatest(0,coalesce(floor((v_profile->>'uridium')::numeric)::bigint,0))+v_stl),true);
 v_rev:=coalesce((v_state->>'serverEliteRevision')::bigint,0)+1;
 v_state:=jsonb_set(jsonb_set(v_state,'{profile}',v_profile,true),'{serverEliteRevision}',to_jsonb(v_rev),true);
 update public.game_saves set state=v_state,updated_at=now() where user_id=v_uid;
 return jsonb_build_object('ok',true,'already_claimed',false,'objective_id',p_objective_id,'title',v_title,'credits',v_cr,'stl',v_stl,'state',v_state);
end;$function$
;
GRANT EXECUTE ON FUNCTION public.stellar_claim_elite_objective(text) TO authenticated;
CREATE OR REPLACE FUNCTION public.stellar_claim_war_campaign(p_campaign_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_uid uuid:=auth.uid();v_campaign public.stellar_war_campaigns;v_score public.stellar_war_scores;v_best bigint;v_team bigint;v_winner boolean;v_credits bigint;v_stl bigint;v_save jsonb;v_profile jsonb;v_revision bigint;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 select * into v_campaign from public.stellar_war_campaigns where id=p_campaign_id and enabled=true and ends_at<=now();
 if not found then raise exception 'CAMPAIGN_NOT_FINISHED';end if;
 select * into v_score from public.stellar_war_scores where campaign_id=p_campaign_id and user_id=v_uid;
 if not found or v_score.points<v_campaign.min_points then raise exception 'CAMPAIGN_NOT_ELIGIBLE';end if;
 select max(total) into v_best from (select sum(points) as total from public.stellar_war_scores where campaign_id=p_campaign_id group by faction) teams;
 select sum(points) into v_team from public.stellar_war_scores where campaign_id=p_campaign_id and faction=v_score.faction;
 v_winner=coalesce(v_team,0)=coalesce(v_best,0) and coalesce(v_team,0)>0;
 v_credits=case when v_winner then v_campaign.reward_credits else floor(v_campaign.reward_credits::numeric/4)::bigint end;
 v_stl=case when v_winner then v_campaign.reward_stl else 0 end;
 select state into v_save from public.game_saves where user_id=v_uid for update;
 if v_save is null then raise exception 'SAVE_NOT_FOUND';end if;
 if exists(select 1 from public.stellar_war_campaign_claims where user_id=v_uid and campaign_id=p_campaign_id) then
 return jsonb_build_object('ok',true,'already_claimed',true,'state',v_save);
 end if;
 insert into public.stellar_war_campaign_claims(campaign_id,user_id,faction,points,victorious,credits,stl)
 values(p_campaign_id,v_uid,v_score.faction,v_score.points,v_winner,v_credits,v_stl);
 v_profile=coalesce(v_save->'profile','{}'::jsonb);
 v_profile=jsonb_set(v_profile,'{credits}',to_jsonb(greatest(0,coalesce((v_profile->>'credits')::bigint,0))+v_credits),true);
 v_profile=jsonb_set(v_profile,'{uridium}',to_jsonb(greatest(0,coalesce((v_profile->>'uridium')::bigint,0))+v_stl),true);
 v_revision=coalesce((v_save->>'serverEliteRevision')::bigint,0)+1;
 v_save=jsonb_set(jsonb_set(v_save,'{profile}',v_profile,true),'{serverEliteRevision}',to_jsonb(v_revision),true);
 update public.game_saves set state=v_save,updated_at=now() where user_id=v_uid;
 return jsonb_build_object('ok',true,'already_claimed',false,'victorious',v_winner,'credits',v_credits,'stl',v_stl,'state',v_save);
end;$function$
;
GRANT EXECUTE ON FUNCTION public.stellar_claim_war_campaign(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.stellar_claim_war_supply()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_uid uuid:=auth.uid();v_save jsonb;v_profile jsonb;v_faction text;v_count int;v_credits bigint;v_day date:=(now() at time zone 'America/Sao_Paulo')::date;v_revision bigint;v_previous bigint;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 select state into v_save from public.game_saves where user_id=v_uid for update;
 if v_save is null then raise exception 'SAVE_NOT_FOUND';end if;
 v_faction=v_save#>>'{profile,faction}';if v_faction not in('earth','mars','jupiter') then raise exception 'FACTION_REQUIRED';end if;
 select count(*) into v_count from public.stellar_warfront_nodes where owner=v_faction;
 if v_count=0 then raise exception 'NO_TERRITORY';end if;
 select least(daily_credits_cap,daily_credits_per_node*v_count) into v_credits from public.stellar_war_rules where id=1;
 v_credits:=coalesce(v_credits,0);
 if exists(select 1 from public.stellar_war_supply_claims where user_id=v_uid and claim_day=v_day) then
 return jsonb_build_object('ok',true,'already_claimed',true,'credits',0,'owned_nodes',v_count,'state',v_save);
 end if;
 insert into public.stellar_war_supply_claims(user_id,claim_day,faction,owned_nodes,credits) values(v_uid,v_day,v_faction,v_count,v_credits);
 v_profile=coalesce(v_save->'profile','{}'::jsonb);
 v_previous=greatest(0,coalesce((v_profile->>'credits')::bigint,0));
 v_profile=jsonb_set(v_profile,'{credits}',to_jsonb(v_previous+v_credits),true);
 v_revision=coalesce((v_save->>'serverEliteRevision')::bigint,0)+1;
 v_save=jsonb_set(jsonb_set(v_save,'{profile}',v_profile,true),'{serverEliteRevision}',to_jsonb(v_revision),true);
 update public.game_saves set state=v_save,updated_at=now() where user_id=v_uid;
 return jsonb_build_object('ok',true,'already_claimed',false,'credits',v_credits,'owned_nodes',v_count,'state',v_save);
end;$function$
;
GRANT EXECUTE ON FUNCTION public.stellar_claim_war_supply() TO authenticated;
CREATE OR REPLACE FUNCTION public.stellar_commit_command_v1332(p_user_id uuid, p_command_id text, p_module text, p_request_hash text, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE previous record; result jsonb; current_state jsonb; current_at timestamptz;
BEGIN
 IF p_user_id IS NULL OR p_command_id IS NULL OR length(p_command_id) NOT BETWEEN 10 AND 160 OR p_module IS NULL OR p_module NOT IN ('economy','auction') OR p_request_hash IS NULL OR p_request_hash !~ '^[a-f0-9]{64}$' OR jsonb_typeof(p_payload) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'COMMAND_ARGUMENTS_INVALID';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,1332));
 SELECT * INTO previous FROM public.stellar_command_receipts_v1332 WHERE user_id=p_user_id AND command_id=p_command_id;
 IF FOUND THEN
  IF previous.module IS DISTINCT FROM p_module OR previous.request_hash IS DISTINCT FROM p_request_hash THEN RETURN '{"ok":false,"code":"COMMAND_ID_REUSED"}'::jsonb;END IF;
  SELECT state,updated_at INTO current_state,current_at FROM public.game_saves WHERE user_id=p_user_id;
  RETURN previous.receipt||jsonb_build_object('ok',true,'replayed',true,'state',current_state,'updated_at',current_at);
 END IF;
 PERFORM set_config('stellar.writer','command_v1332:'||p_module,true);
 IF p_module='economy' THEN
  result:=public.stellar_commit_economy_operation_v125(p_user_id,p_command_id,p_payload->>'operation',p_request_hash,(p_payload->>'expected_updated_at')::timestamptz,p_payload->'state',p_payload->>'callsign',p_payload->'receipt');
 ELSE
  result:=public.stellar_settle_auction_bid_v1182(p_user_id,p_payload->>'hour_key',p_payload->>'lot_ref');
 END IF;
 IF result->>'ok'='true' THEN
  INSERT INTO public.stellar_command_receipts_v1332(user_id,command_id,module,request_hash,receipt)
   VALUES(p_user_id,p_command_id,p_module,p_request_hash,result-'state'-'updated_at');
 END IF;
 RETURN result;
END $function$
;
GRANT EXECUTE ON FUNCTION public.stellar_commit_command_v1332(uuid,text,text,text,jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_commit_economy_operation_v125(p_user_id uuid, p_request_id text, p_operation text, p_request_hash text, p_expected_updated_at timestamp with time zone, p_state jsonb, p_callsign text, p_receipt jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
 saved public.game_saves%rowtype;
 previous public.stellar_economy_receipts_v125%rowtype;
 save_result jsonb;
 now_at timestamptz;
 from_rev bigint;
 to_rev bigint;
 currency text;
 val text;
BEGIN
 IF p_user_id IS NULL OR p_request_id IS NULL
    OR p_request_id !~ '^[A-Za-z0-9_-]{10,90}$'
    OR p_operation IS NULL OR p_operation !~ '^(economy:[a-z_]{3,45}|bulk:(ammo|rocket):[A-Za-z0-9_-]{2,50})$'
    OR p_request_hash IS NULL OR p_request_hash !~ '^[a-f0-9]{64}$'
    OR p_expected_updated_at IS NULL
    OR p_state IS NULL OR jsonb_typeof(p_state)<>'object'
    OR p_receipt IS NULL OR jsonb_typeof(p_receipt)<>'object'
    OR p_state->>'accountOwnerId' IS DISTINCT FROM p_user_id::text
 THEN RETURN jsonb_build_object('ok',false,'code','ECONOMY_ARGUMENTS_INVALID');END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,125));
 -- Receipts are immutable. The per-player advisory lock already serializes retries.
 SELECT * INTO previous FROM public.stellar_economy_receipts_v125
  WHERE user_id=p_user_id AND request_id=p_request_id;
 IF FOUND THEN
   IF previous.operation IS DISTINCT FROM p_operation OR previous.request_hash IS DISTINCT FROM p_request_hash THEN
     RETURN jsonb_build_object('ok',false,'code','ECONOMY_ID_REUSED');
   END IF;
   SELECT * INTO saved FROM public.game_saves WHERE user_id=p_user_id;
   RETURN jsonb_build_object('ok',true,'replayed',true,
     'receipt',previous.receipt,'state',saved.state,'updated_at',saved.updated_at);
 END IF;
 SELECT * INTO saved FROM public.game_saves WHERE user_id=p_user_id FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'code','ECONOMY_SAVE_MISSING');END IF;
 IF saved.updated_at IS DISTINCT FROM p_expected_updated_at THEN
   RETURN jsonb_build_object('ok',false,'code','ECONOMY_STALE');END IF;
 IF saved.state->>'accountOwnerId' IS NOT NULL AND saved.state->>'accountOwnerId' IS DISTINCT FROM p_user_id::text THEN
   RETURN jsonb_build_object('ok',false,'code','ECONOMY_OWNER_MISMATCH');END IF;
 -- Reject invalid monetary values and any unexpected revision skips.
 FOREACH currency IN ARRAY ARRAY['credits','uridium'] LOOP
   val:=p_state#>>array['profile',currency];
   IF val IS NULL OR val !~ '^[0-9]{1,15}$' THEN
     RETURN jsonb_build_object('ok',false,'code','ECONOMY_BALANCE_INVALID');END IF;
 END LOOP;
 from_rev:=coalesce((saved.state->>'serverPurchaseRevision')::bigint,0);
 to_rev:=coalesce((p_state->>'serverPurchaseRevision')::bigint,0);
 IF to_rev<>from_rev+1 THEN RETURN jsonb_build_object('ok',false,'code','ECONOMY_REVISION_INVALID');END IF;
 -- Canonical save + profile + checkpoint and durable receipt are ONE transaction.
 now_at:=clock_timestamp();
 save_result:=public.stellar_commit_player_save_v118(p_user_id,p_state,now_at,p_callsign);
 IF coalesce((save_result->>'ok')::boolean,false) IS DISTINCT FROM true THEN
   RETURN jsonb_build_object('ok',false,'code','ECONOMY_SAVE_REJECTED');END IF;
 INSERT INTO public.stellar_economy_receipts_v125(user_id,request_id,operation,request_hash,receipt)
 VALUES(p_user_id,p_request_id,p_operation,p_request_hash,p_receipt);
 RETURN jsonb_build_object('ok',true,'replayed',false,
   'receipt',p_receipt,'state',p_state,'updated_at',now_at);
END;
$function$
;
GRANT EXECUTE ON FUNCTION public.stellar_commit_economy_operation_v125(uuid,text,text,text,timestamp with time zone,jsonb,text,jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_commit_live_purchase_v123(p_user_id uuid, p_request_id uuid, p_catalog_key text, p_expected_updated_at timestamp with time zone, p_state jsonb, p_callsign text, p_receipt jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
 v_existing public.stellar_live_purchase_receipts_v123%rowtype;
 v_state jsonb; v_updated_at timestamptz; v_committed jsonb; v_at timestamptz;
 v_currency text; v_cost bigint; v_old bigint; v_new bigint;
 v_old_revision bigint; v_new_revision bigint;
BEGIN
 IF p_user_id IS NULL OR p_request_id IS NULL OR length(p_catalog_key)<2
    OR p_state IS NULL OR jsonb_typeof(p_state)<>'object'
    OR p_receipt IS NULL OR jsonb_typeof(p_receipt)<>'object'
    OR p_state->>'accountOwnerId' IS DISTINCT FROM p_user_id::text
    OR p_expected_updated_at IS NULL
 THEN RETURN jsonb_build_object('ok',false,'code','PURCHASE_ARGUMENTS_INVALID'); END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,123));
 SELECT * INTO v_existing FROM public.stellar_live_purchase_receipts_v123
 WHERE user_id=p_user_id AND request_id=p_request_id FOR UPDATE;
 IF FOUND THEN
   IF v_existing.catalog_key IS DISTINCT FROM p_catalog_key THEN
     RETURN jsonb_build_object('ok',false,'code','PURCHASE_ID_REUSED');
   END IF;
   SELECT state,updated_at INTO v_state,v_updated_at FROM public.game_saves WHERE user_id=p_user_id;
   RETURN jsonb_build_object('ok',true,'replayed',true,'state',v_state,
     'updated_at',v_updated_at,'receipt',v_existing.receipt);
 END IF;
 SELECT state,updated_at INTO v_state,v_updated_at FROM public.game_saves WHERE user_id=p_user_id FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'code','PURCHASE_SAVE_MISSING');END IF;
 IF v_updated_at IS DISTINCT FROM p_expected_updated_at THEN
   RETURN jsonb_build_object('ok',false,'code','ECONOMY_STALE');
 END IF;
 v_currency:=p_receipt->>'currency';
 IF v_currency IS NULL OR v_currency NOT IN ('credits','uridium') THEN
   RETURN jsonb_build_object('ok',false,'code','PURCHASE_CURRENCY_INVALID');
 END IF;
 IF p_receipt->>'catalog_key' IS DISTINCT FROM p_catalog_key THEN
   RETURN jsonb_build_object('ok',false,'code','PURCHASE_CATALOG_MISMATCH');
 END IF;
 IF p_receipt->>'price' IS NULL OR (p_receipt->>'price') !~ '^[0-9]{1,15}$' THEN
   RETURN jsonb_build_object('ok',false,'code','PURCHASE_PRICE_INVALID');
 END IF;
 v_cost:=(p_receipt->>'price')::bigint;
 IF v_cost < 1 THEN RETURN jsonb_build_object('ok',false,'code','PURCHASE_PRICE_INVALID'); END IF;
 v_old:=coalesce((v_state#>>array['profile',v_currency])::bigint,0);
 v_new:=coalesce((p_state#>>array['profile',v_currency])::bigint,0);
 IF v_old < v_cost OR v_new IS DISTINCT FROM v_old-v_cost THEN
   RETURN jsonb_build_object('ok',false,'code','PURCHASE_DEBIT_MISMATCH');
 END IF;
 IF v_currency='credits' AND
   (p_state#>>'{profile,uridium}') IS DISTINCT FROM (v_state#>>'{profile,uridium}')
 OR v_currency='uridium' AND
   (p_state#>>'{profile,credits}') IS DISTINCT FROM (v_state#>>'{profile,credits}')
 THEN RETURN jsonb_build_object('ok',false,'code','PURCHASE_OTHER_CURRENCY_CHANGED'); END IF;
 v_old_revision:=coalesce((v_state->>'serverPurchaseRevision')::bigint,0);
 v_new_revision:=coalesce((p_state->>'serverPurchaseRevision')::bigint,0);
 IF v_new_revision<>v_old_revision+1 THEN
   RETURN jsonb_build_object('ok',false,'code','PURCHASE_REVISION_INVALID');
 END IF;
 v_at:=clock_timestamp();
 v_committed:=public.stellar_commit_player_save_v118(p_user_id,p_state,v_at,p_callsign);
 IF coalesce((v_committed->>'ok')::boolean,false) IS NOT TRUE THEN
   RETURN jsonb_build_object('ok',false,'code','PURCHASE_SAVE_REJECTED');
 END IF;
 INSERT INTO public.stellar_live_purchase_receipts_v123(user_id,request_id,catalog_key,receipt)
 VALUES(p_user_id,p_request_id,p_catalog_key,p_receipt);
 RETURN jsonb_build_object('ok',true,'replayed',false,'state',p_state,
   'updated_at',v_at,'receipt',p_receipt);
END;
$function$
;
GRANT EXECUTE ON FUNCTION public.stellar_commit_live_purchase_v123(uuid,uuid,text,timestamp with time zone,jsonb,text,jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_commit_player_command_v119(p_user_id uuid, p_operation_id uuid, p_module text, p_action text, p_state jsonb, p_callsign text, p_expected_revision bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
 v_existing public.stellar_player_save_operation_v119%rowtype;
 v_head public.stellar_player_save_head_v119%rowtype;
 v_hash text;
 v_result jsonb;
 v_rev bigint;
BEGIN
 IF p_user_id IS NULL OR p_operation_id IS NULL OR p_state IS NULL OR
    jsonb_typeof(p_state)<>'object' OR p_state->>'accountOwnerId' IS DISTINCT FROM p_user_id::text
 THEN RAISE EXCEPTION 'SAVE_COMMAND_INVALID'; END IF;
 IF p_module NOT IN ('checkpoint','hangar','missoes','economia','leilao','farm','combate','server')
   OR p_action NOT IN ('save','commit') THEN RAISE EXCEPTION 'SAVE_ACTION_NOT_ALLOWED'; END IF;
 v_hash:=md5(p_state::text);
 PERFORM 1 FROM public.game_saves WHERE user_id=p_user_id FOR UPDATE;
 SELECT * INTO v_existing FROM public.stellar_player_save_operation_v119
 WHERE user_id=p_user_id AND operation_id=p_operation_id;
 IF v_existing.user_id IS NOT NULL THEN
   IF v_existing.request_hash<>v_hash OR v_existing.module<>p_module OR v_existing.action<>p_action
   THEN RAISE EXCEPTION 'SAVE_IDEMPOTENCY_ID_REUSED'; END IF;
   RETURN v_existing.result||jsonb_build_object('replayed',true);
 END IF;
 SELECT * INTO v_head FROM public.stellar_player_save_head_v119 WHERE user_id=p_user_id FOR UPDATE;
 IF v_head.user_id IS NULL THEN RAISE EXCEPTION 'SAVE_HEAD_NOT_INITIALIZED';END IF;
 IF p_module IN ('checkpoint','hangar') AND p_expected_revision IS NULL THEN
   RETURN jsonb_build_object('ok',false,'code','SAVE_REVISION_REQUIRED',
      'message','Atualize o jogo para confirmar a alteracao com a revisao oficial.');
 END IF;
 IF p_expected_revision IS NOT NULL AND p_expected_revision<>v_head.revision THEN
   RETURN jsonb_build_object('ok',false,'code','SAVE_REVISION_CONFLICT','revision',v_head.revision,
     'message','O estado do jogador mudou. Atualize para confirmar sua acao sem perder progresso.');
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.game_saves'::regclass
       AND tgname='stellar_capture_save_update_v119' AND tgenabled<>'D') THEN
   RAISE EXCEPTION 'SAVE_CAPTURE_NOT_ACTIVE';
 END IF;
 v_result:=public.stellar_commit_player_save_v118(p_user_id,p_state,clock_timestamp(),p_callsign);
 IF v_result->>'ok' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'SAVE_COMMIT_NOT_CONFIRMED';END IF;
 SELECT revision INTO v_rev FROM public.stellar_player_save_head_v119 WHERE user_id=p_user_id;
 INSERT INTO public.stellar_player_save_operation_v119
 (user_id,operation_id,module,action,request_hash,result,revision)
 VALUES(p_user_id,p_operation_id,p_module,p_action,v_hash,
   jsonb_build_object('ok',true,'revision',v_rev,'operation_id',p_operation_id),v_rev);
 RETURN jsonb_build_object('ok',true,'revision',v_rev,'operation_id',p_operation_id,'replayed',false);
END $function$
;
GRANT EXECUTE ON FUNCTION public.stellar_commit_player_command_v119(uuid,uuid,text,text,jsonb,text,bigint) TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_commit_player_save_v118(p_user_id uuid, p_state jsonb, p_updated_at timestamp with time zone, p_callsign text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
 old_save jsonb;
 old_updated_at timestamptz;
 a public.stellar_player_save_abc_v118%rowtype;
 b public.stellar_player_save_abc_v118%rowtype;
 v_rotate boolean;
 v_profile jsonb;
 v_signature text;
begin
 if p_user_id is null or p_state is null or jsonb_typeof(p_state)<>'object'
   or p_state->>'accountOwnerId' is distinct from p_user_id::text
 then raise exception 'SAVE_OWNER_OR_PAYLOAD_INVALID' using errcode='23514'; end if;
 if p_callsign is null or length(trim(p_callsign))=0 or length(p_callsign)>60
 then raise exception 'SAVE_CALLSIGN_INVALID' using errcode='23514'; end if;
 if p_updated_at is null then raise exception 'SAVE_TIME_INVALID' using errcode='23514'; end if;
 v_profile:=p_state->'profile';
 if jsonb_typeof(v_profile)<>'object' then raise exception 'SAVE_PROFILE_INVALID' using errcode='23514';end if;
 select state,updated_at into old_save,old_updated_at from public.game_saves where user_id=p_user_id for update;
 insert into public.game_saves(user_id,state,updated_at)
 values(p_user_id,p_state,p_updated_at)
 on conflict(user_id) do update set state=excluded.state,updated_at=excluded.updated_at;
 insert into public.profiles(id,callsign,faction,level,xp,credits,uridium,aliens_killed,gg_completed,updated_at)
 values(p_user_id,p_callsign,
   nullif(v_profile->>'faction',''),
   greatest(1,coalesce((v_profile->>'level')::integer,1)),
   coalesce((v_profile->>'xp')::bigint,0),
   coalesce((v_profile->>'credits')::bigint,0),
   coalesce((v_profile->>'uridium')::bigint,0),
   coalesce((v_profile->>'aliensKilled')::bigint,0),
   coalesce((p_state#>>'{galaxyGate,alpha,completed}')::integer,(v_profile->>'ggCompleted')::integer,0),
   p_updated_at)
 on conflict(id) do update set
   callsign=excluded.callsign,faction=excluded.faction,level=excluded.level,
   xp=excluded.xp,credits=excluded.credits,uridium=excluded.uridium,
   aliens_killed=excluded.aliens_killed,gg_completed=excluded.gg_completed,
   updated_at=excluded.updated_at;

 select * into a from public.stellar_player_save_abc_v118
 where user_id=p_user_id and slot='A' for update;
 select * into b from public.stellar_player_save_abc_v118
 where user_id=p_user_id and slot='B' for update;
 v_signature:=md5(p_state::text);
 v_rotate:= a.user_id is null or b.user_id is null or
   p_updated_at >= b.captured_at+interval '30 seconds' or
   a.state->'shipLoadout' is distinct from p_state->'shipLoadout' or
   a.state->'drones' is distinct from p_state->'drones' or
   a.state->'combatConfigsV2013' is distinct from p_state->'combatConfigsV2013' or
   a.state->'pet' is distinct from p_state->'pet' or
   a.state->>'serverPurchaseRevision' is distinct from p_state->>'serverPurchaseRevision';
 if v_rotate and b.user_id is not null then
   insert into public.stellar_player_save_abc_v118 as ss
   (user_id,slot,state,save_updated_at,state_hash,captured_at)
   values(p_user_id,'C',b.state,b.save_updated_at,b.state_hash,b.captured_at)
   on conflict(user_id,slot) do update set state=excluded.state,
   save_updated_at=excluded.save_updated_at,state_hash=excluded.state_hash,captured_at=excluded.captured_at;
 end if;
 if v_rotate and a.user_id is not null then
   insert into public.stellar_player_save_abc_v118 as ss
   (user_id,slot,state,save_updated_at,state_hash,captured_at)
   values(p_user_id,'B',a.state,a.save_updated_at,a.state_hash,a.captured_at)
   on conflict(user_id,slot) do update set state=excluded.state,
   save_updated_at=excluded.save_updated_at,state_hash=excluded.state_hash,captured_at=excluded.captured_at;
 elsif a.user_id is null and old_save is not null then
   insert into public.stellar_player_save_abc_v118
   (user_id,slot,state,save_updated_at,state_hash,captured_at)
   values(p_user_id,'B',old_save,old_updated_at,md5(old_save::text),clock_timestamp())
   on conflict(user_id,slot) do nothing;
 end if;
 insert into public.stellar_player_save_abc_v118 as ss
 (user_id,slot,state,save_updated_at,state_hash,captured_at)
 values(p_user_id,'A',p_state,p_updated_at,v_signature,clock_timestamp())
 on conflict(user_id,slot) do update set
 state=excluded.state,save_updated_at=excluded.save_updated_at,
 state_hash=excluded.state_hash,captured_at=excluded.captured_at;
 return jsonb_build_object('ok',true,'updated_at',p_updated_at,'checkpoint','A');
end;
$function$
;
GRANT EXECUTE ON FUNCTION public.stellar_commit_player_save_v118(uuid,jsonb,timestamp with time zone,text) TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_commit_save_v131(p_user_id uuid, p_state jsonb, p_updated_at timestamp with time zone, p_callsign text, p_expected_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  current_token text;
  result jsonb;
begin
  select md5(state::text) into current_token from public.game_saves
    where user_id=p_user_id for update;
  if p_expected_token is distinct from coalesce(current_token,'new') then
    return jsonb_build_object('ok',false,'code','SAVE_REVISION_CONFLICT');
  end if;
  if current_token is null then
    -- Reserve a missing row atomically. A competing first save cannot overwrite it.
    insert into public.game_saves(user_id,state,updated_at) values(p_user_id,p_state,p_updated_at)
      on conflict(user_id) do nothing;
    if not found then return jsonb_build_object('ok',false,'code','SAVE_REVISION_CONFLICT'); end if;
  end if;
  result := public.stellar_commit_player_save_v118(p_user_id,p_state,p_updated_at,p_callsign);
  if (result->>'ok')::boolean is distinct from true then raise exception 'SAVE_NOT_CONFIRMED'; end if;
  select md5(state::text) into current_token from public.game_saves where user_id=p_user_id;
  return result || jsonb_build_object('save_token',current_token);
end; $function$
;
GRANT EXECUTE ON FUNCTION public.stellar_commit_save_v131(uuid,jsonb,timestamp with time zone,text,text) TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_commit_save_v133(p_user_id uuid, p_state jsonb, p_updated_at timestamp with time zone, p_callsign text, p_expected_token text, p_operation_id uuid, p_request_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE stored record; r jsonb;
BEGIN
 IF p_operation_id IS NULL OR p_request_hash !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'SAVE_OPERATION_ID_INVALID';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,133));
 SELECT * INTO stored FROM public.stellar_save_receipts_v133 WHERE user_id=p_user_id AND operation_id=p_operation_id;
 IF FOUND THEN
 IF stored.request_hash IS DISTINCT FROM p_request_hash THEN RETURN '{"ok":false,"code":"SAVE_IDEMPOTENCY_ID_REUSED"}'::jsonb;END IF;
 RETURN stored.receipt||jsonb_build_object('replayed',true);
 END IF;
 PERFORM set_config('stellar.writer','checkpoint_v133',true);
 r:=public.stellar_commit_save_v131(p_user_id,p_state,p_updated_at,p_callsign,p_expected_token);
 IF r->>'ok'='true' THEN INSERT INTO public.stellar_save_receipts_v133 VALUES(p_user_id,p_operation_id,p_request_hash,r,clock_timestamp());END IF;
 RETURN r;
END $function$
;
GRANT EXECUTE ON FUNCTION public.stellar_commit_save_v133(uuid,jsonb,timestamp with time zone,text,text,uuid,text) TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_frontier_claim_v370(p_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
END;$function$
;
GRANT EXECUTE ON FUNCTION public.stellar_frontier_claim_v370(text) TO authenticated;
CREATE OR REPLACE FUNCTION public.stellar_grant_npc_reward_v1131(p_user_id uuid, p_kill_key text, p_npc_type text, p_base_credits bigint, p_base_stl bigint, p_owner_eligible boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE
 v_reward jsonb; v_kind text; v_chance numeric; v_qty integer; v_insert_count integer:=0;
 v_created boolean:=false; v_save jsonb; v_old integer; v_balance integer;
BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'ONLY_SERVICE_ROLE'; END IF;
 IF p_user_id IS NULL OR p_kill_key IS NULL OR length(p_kill_key)>180 OR length(p_kill_key)<3
 THEN RAISE EXCEPTION 'NPC_REWARD_ID_INVALID'; END IF;
 v_reward:=public.stellar_grant_npc_reward_v228(p_user_id,p_kill_key,p_npc_type,p_base_credits,p_base_stl);
 IF NOT p_owner_eligible THEN RETURN v_reward; END IF;
 IF p_npc_type='apexOverlord' THEN v_kind:='apex';
 ELSIF p_kill_key ~ '^(earth|mars|jupiter):u[123]:' THEN v_kind:='universo';
 ELSE RETURN v_reward; END IF;
 SELECT chance INTO v_chance FROM public.stellar_aux_protocol_drop_rules_v1131 WHERE source=v_kind AND enabled=true;
 IF NOT FOUND THEN RETURN v_reward; END IF;
 IF coalesce((v_reward->>'granted')::boolean,false) THEN
  v_qty:=CASE WHEN random()<v_chance THEN 1 ELSE 0 END;
  INSERT INTO public.stellar_aux_protocol_drop_receipts_v1131(user_id,kill_key,npc_type,fragment_kind,qty)
   VALUES(p_user_id,p_kill_key,p_npc_type,v_kind,v_qty) ON CONFLICT(user_id,kill_key) DO NOTHING;
  GET DIAGNOSTICS v_insert_count=ROW_COUNT;
  v_created:=v_insert_count=1;
 END IF;
 SELECT fragment_kind,qty INTO v_kind,v_qty FROM public.stellar_aux_protocol_drop_receipts_v1131
 WHERE user_id=p_user_id AND kill_key=p_kill_key;
 IF NOT FOUND OR v_qty<>1 THEN RETURN v_reward; END IF;
 SELECT state INTO v_save FROM public.game_saves WHERE user_id=p_user_id FOR UPDATE;
 IF v_save IS NULL THEN RAISE EXCEPTION 'AUX_FRAGMENT_SAVE_MISSING'; END IF;
 v_old:=GREATEST(0,LEAST(1000000,coalesce((v_save#>>ARRAY['pet','advancedProtocolFragmentsV1131',v_kind])::integer,0)));
 IF v_created THEN
  IF v_old>=1000000 THEN RAISE EXCEPTION 'AUX_FRAGMENT_STOCK_LIMIT'; END IF;
  v_balance:=v_old+1;
  v_save:=jsonb_set(v_save,'{pet}',coalesce(v_save->'pet','{}'::jsonb),true);
  v_save:=jsonb_set(v_save,'{pet,advancedProtocolFragmentsV1131}',
   coalesce(v_save#>'{pet,advancedProtocolFragmentsV1131}','{}'::jsonb)||jsonb_build_object(v_kind,v_balance),true);
  UPDATE public.game_saves SET state=v_save,updated_at=now() WHERE user_id=p_user_id;
 ELSE v_balance:=v_old; END IF;
 RETURN v_reward||jsonb_build_object('protocolFragment',
  jsonb_build_object('kind',v_kind,'qty',1,'balance',v_balance));
END;
$function$
;
GRANT EXECUTE ON FUNCTION public.stellar_grant_npc_reward_v1131(uuid,text,text,bigint,bigint,boolean) TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_grant_npc_reward_v228(p_user_id uuid, p_kill_key text, p_npc_type text, p_base_credits bigint, p_base_stl bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
 v_state jsonb; v_profile jsonb; v_prior public.stellar_npc_reward_ledger%ROWTYPE;
 v_skills jsonb; v_greed int; v_c1 int; v_c2 int; v_bon_cr int; v_bon_stl int;
 v_cr bigint; v_stl bigint; v_balance_cr bigint; v_balance_stl bigint; v_rev bigint;
BEGIN
 IF p_user_id IS NULL OR p_kill_key IS NULL OR length(p_kill_key) NOT BETWEEN 12 AND 180 OR p_npc_type IS NULL OR length(p_npc_type)>80 OR
    p_base_credits IS NULL OR p_base_stl IS NULL OR p_base_credits<0 OR p_base_credits>75000000 OR p_base_stl<0 OR p_base_stl>750000
 THEN RAISE EXCEPTION 'NPC_REWARD_INVALID'; END IF;
 -- Serialized by player: simultaneous NPC kills, saves and purchases cannot claim twice.
 SELECT state INTO v_state FROM public.game_saves WHERE user_id=p_user_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'NPC_REWARD_SAVE_MISSING'; END IF;
 SELECT * INTO v_prior FROM public.stellar_npc_reward_ledger WHERE user_id=p_user_id AND kill_key=p_kill_key;
 IF FOUND THEN RETURN jsonb_build_object('granted',false,'credits',0,'stl',0,'revision',coalesce((v_state->>'serverNpcRewardRevision')::bigint,0),'kill_key',p_kill_key); END IF;
 v_profile:=coalesce(v_state->'profile','{}'::jsonb);
 v_skills:=coalesce(v_state#>'{pilotBio,skills}','{}'::jsonb);
 v_greed:=greatest(0,least(5,coalesce((v_skills->>'greed')::int,0)));
 v_c1:=greatest(0,least(2,coalesce((v_skills->>'cruelty1')::int,0)));
 v_c2:=greatest(0,least(3,coalesce((v_skills->>'cruelty2')::int,0)));
 v_bon_cr:=(array[0,4,8,12,18,25])[v_greed+1];
 v_bon_stl:=(array[0,4,8])[v_c1+1]+(array[0,4,10,17])[v_c2+1];
 v_cr:=round(p_base_credits*(100+v_bon_cr)/100.0);
 v_stl:=round(p_base_stl*(100+v_bon_stl)/100.0);
 v_balance_cr:=coalesce((v_profile->>'credits')::bigint,0)+v_cr;
 v_balance_stl:=coalesce((v_profile->>'uridium')::bigint,0)+v_stl;
 v_rev:=coalesce((v_state->>'serverNpcRewardRevision')::bigint,0)+1;
 IF v_balance_cr>1000000000000 OR v_balance_stl>10000000000 OR v_rev>1000000000 THEN RAISE EXCEPTION 'NPC_REWARD_BALANCE_LIMIT'; END IF;
 INSERT INTO public.stellar_npc_reward_ledger(user_id,kill_key,npc_type,credits,stl)
 VALUES (p_user_id,p_kill_key,p_npc_type,v_cr,v_stl);
 UPDATE public.game_saves SET state=jsonb_set(jsonb_set(jsonb_set(v_state,'{profile,credits}',to_jsonb(v_balance_cr),true),'{profile,uridium}',to_jsonb(v_balance_stl),true),'{serverNpcRewardRevision}',to_jsonb(v_rev),true),updated_at=now() WHERE user_id=p_user_id;
 UPDATE public.profiles SET credits=v_balance_cr,uridium=v_balance_stl,updated_at=now() WHERE id=p_user_id;
 RETURN jsonb_build_object('granted',true,'credits',v_cr,'stl',v_stl,'revision',v_rev,'kill_key',p_kill_key);
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN RAISE EXCEPTION 'NPC_REWARD_INVALID_STATE';
END; $function$
;
GRANT EXECUTE ON FUNCTION public.stellar_grant_npc_reward_v228(uuid,text,text,bigint,bigint) TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_grant_ore_reward_v229(p_user_id uuid, p_ore_key text, p_resource text, p_amount integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_save jsonb;v_prior public.stellar_ore_reward_ledger%ROWTYPE;
 v_cargo jsonb;v_prev bigint;v_rev bigint;v_total bigint;
BEGIN
 IF p_user_id IS NULL OR length(trim(coalesce(p_ore_key,''))) NOT BETWEEN 8 AND 180
 OR length(trim(coalesce(p_resource,''))) NOT BETWEEN 2 AND 64
 OR NOT EXISTS (SELECT 1 FROM public.game_resource_config_v1814 r WHERE r.resource_key=p_resource AND r.enabled IS TRUE)
 OR p_amount NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'ORE_GRANT_INVALID'; END IF;
 SELECT state INTO v_save FROM public.game_saves WHERE user_id=p_user_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'ORE_GRANT_SAVE_MISSING'; END IF;
 SELECT * INTO v_prior FROM public.stellar_ore_reward_ledger WHERE user_id=p_user_id AND ore_key=p_ore_key;
 v_rev:=coalesce((v_save->>'serverOreRevision')::bigint,0);
 IF FOUND THEN RETURN jsonb_build_object('granted',false,'amount',0,'revision',v_rev,'resource',v_prior.resource); END IF;
 v_cargo:=coalesce(v_save->'cargo','{}'::jsonb);
 IF jsonb_typeof(v_cargo)<>'object' THEN RAISE EXCEPTION 'ORE_GRANT_CARGO_INVALID'; END IF;
 v_prev:=coalesce((v_cargo->>p_resource)::bigint,0);
 v_total:=v_prev+p_amount;
 IF v_total>1000000000 OR v_rev>=1000000000 THEN RAISE EXCEPTION 'ORE_GRANT_LIMIT'; END IF;
 INSERT INTO public.stellar_ore_reward_ledger(user_id,ore_key,resource,amount) VALUES(p_user_id,p_ore_key,p_resource,p_amount);
 UPDATE public.game_saves SET state=jsonb_set(jsonb_set(v_save,ARRAY['cargo',p_resource],to_jsonb(v_total),true),'{serverOreRevision}',to_jsonb(v_rev+1),true),updated_at=now() WHERE user_id=p_user_id;
 RETURN jsonb_build_object('granted',true,'amount',p_amount,'revision',v_rev+1,'resource',p_resource);
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN RAISE EXCEPTION 'ORE_GRANT_INVALID_STATE';
END;$function$
;
GRANT EXECUTE ON FUNCTION public.stellar_grant_ore_reward_v229(uuid,text,text,integer) TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_natal_action_v132(p_user_id uuid, p_key text, p_action text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE s jsonb; old jsonb; r jsonb:='{}'; reward jsonb:='{}'; d jsonb; cfg record; player record; faction text; n bigint; b bigint; step int; goals jsonb; v record; roll numeric; total numeric; qty int; cores int:=0; result jsonb; at timestamptz:=clock_timestamp(); target text; price bigint; action_key text;
BEGIN
 IF p_user_id IS NULL OR length(p_key)>240 OR length(p_key)<1 THEN RAISE EXCEPTION 'Operação inválida';END IF;
 SELECT * INTO cfg FROM stellar_natal_config_v132 WHERE id=1;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,132));
 SELECT state INTO s FROM game_saves WHERE user_id=p_user_id FOR UPDATE;
 IF s IS NULL THEN RAISE EXCEPTION 'Save não encontrado';END IF;
 SELECT receipt INTO old FROM stellar_natal_actions_v132 WHERE user_id=p_user_id AND key=p_key;
 IF FOUND THEN RETURN old||jsonb_build_object('ok',true,'replayed',true,'state',s);END IF;
 IF NOT cfg.enabled OR at<cfg.starts_at OR at>=cfg.ends_at THEN RAISE EXCEPTION 'Temporada encerrada';END IF;
 faction:=coalesce(s#>>'{profile,faction}','earth');
 INSERT INTO stellar_natal_players_v132(user_id,faction) VALUES(p_user_id,faction) ON CONFLICT DO NOTHING;
 SELECT * INTO player FROM stellar_natal_players_v132 WHERE user_id=p_user_id FOR UPDATE;
 IF p_action='coupon' THEN
  IF p_key<>'coupon:NATALESTELAR' THEN RAISE EXCEPTION 'Cupom inválido';END IF;
  reward:='{"credits":10000000,"uridium":10000,"cores":5,"fireworks":10}';
 ELSIF p_action='mission' THEN
  SELECT definition INTO d FROM stellar_natal_rewards_v132 WHERE id=p_key AND id LIKE 'mission:%';
  IF d IS NULL OR player.npc<(d->>'npc')::int OR player.box<(d->>'box')::int OR player.boss<(d->>'boss')::int THEN RAISE EXCEPTION 'Missão incompleta';END IF;
  reward:=d->'reward';
 ELSIF p_action IN ('faction','global') THEN
  IF p_key !~ ('^'||p_action||':[123]$') THEN RAISE EXCEPTION 'Etapa inválida';END IF;
  step:=split_part(p_key,':',2)::int;
  IF player.npc<20 AND player.box<10 THEN RAISE EXCEPTION 'Participe: 20 NPCs ou 10 boxes';END IF;
  SELECT count(*) FILTER(WHERE kind='npc'),count(*) FILTER(WHERE kind='box') INTO n,b FROM stellar_natal_counts_v132 c WHERE p_action='global' OR c.faction=player.faction;
  IF p_action='faction' THEN goals:=cfg.goals->player.faction;
  ELSE SELECT jsonb_build_object('npc',jsonb_build_array(sum((value#>>'{npc,0}')::bigint),sum((value#>>'{npc,1}')::bigint),sum((value#>>'{npc,2}')::bigint)),'box',jsonb_build_array(sum((value#>>'{box,0}')::bigint),sum((value#>>'{box,1}')::bigint),sum((value#>>'{box,2}')::bigint))) INTO goals FROM jsonb_each(cfg.goals);END IF;
  IF n<(goals->'npc'->>(step-1))::bigint OR b<(goals->'box'->>(step-1))::bigint THEN RAISE EXCEPTION 'Meta coletiva incompleta';END IF;
  reward:=jsonb_build_object('credits',step*2000000,'uridium',step*1500,'cores',step,'fireworks',step*3);
  IF p_action='global' AND step=3 THEN s:=jsonb_set(s,'{natalTitleV132}','"Guardião do Natal 2026"');END IF;
  IF p_action='faction' AND step=3 THEN s:=jsonb_set(s,'{natalBadgeV132}',to_jsonb(player.faction));END IF;
 ELSIF p_action='fire' THEN
  IF player.fireworks<1 THEN RAISE EXCEPTION 'Sem cargas de fogos';END IF;
  IF player.last_firework IS NOT NULL AND at<player.last_firework+interval '5 seconds' THEN RAISE EXCEPTION 'Aguarde o fogo anterior';END IF;
  UPDATE stellar_natal_players_v132 SET fireworks=fireworks-1,last_firework=at WHERE user_id=p_user_id;
  r:=jsonb_build_object('ok',true,'launched_at',at,'fireworks',player.fireworks-1);
  INSERT INTO stellar_natal_actions_v132(user_id,key,receipt) VALUES(p_user_id,p_key,r);RETURN r;
 ELSIF p_action='box' THEN
  IF p_key NOT LIKE 'box:%' THEN RAISE EXCEPTION 'Box inválida';END IF;
  -- One shared box can only be credited to one player, even across workers.
  INSERT INTO stellar_natal_counts_v132(key,faction,kind) VALUES(p_key,player.faction,'box') ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RAISE EXCEPTION 'Box já coletada';END IF;
  SELECT config->'rewards' INTO d FROM bonus_box_config_v1825 WHERE id=1;
  SELECT sum((value->>'weight')::numeric) INTO total FROM jsonb_array_elements(d) WHERE (value->>'weight')::numeric>0;
  IF coalesce(total,0)<=0 THEN RAISE EXCEPTION 'Tabela de boxes indisponível';END IF;
  roll:=random()*total;
  FOR v IN SELECT value FROM jsonb_array_elements(d) WHERE (value->>'weight')::numeric>0 LOOP roll:=roll-(v.value->>'weight')::numeric;EXIT WHEN roll<0;END LOOP;
  qty:=2*((v.value->>'min')::int+floor(random()*((v.value->>'max')::int-(v.value->>'min')::int+1))::int);
  roll:=random();cores:=CASE WHEN roll<.01 THEN 2 WHEN roll<.05 THEN 1 ELSE 0 END;
  reward:=jsonb_build_object('cores',cores);
  IF v.value->>'kind'='ammo' THEN s:=jsonb_set(s,'{ammo}',coalesce(s->'ammo','{}')||jsonb_build_object(v.value->>'id',coalesce((s#>>ARRAY['ammo',v.value->>'id'])::bigint,0)+qty));
  ELSIF v.value->>'kind'='stellarDust' THEN s:=jsonb_set(s,'{stellarDust}',to_jsonb(coalesce((s->>'stellarDust')::bigint,0)+qty));
  ELSIF v.value->>'kind' IN ('credits','uridium') THEN reward:=reward||jsonb_build_object(v.value->>'kind',qty);
  ELSE RAISE EXCEPTION 'Tipo de prêmio desconhecido';END IF;
  r:=jsonb_build_object('kind',v.value->>'kind','item',v.value->>'id','qty',qty,'cores',cores);
  UPDATE stellar_natal_players_v132 SET box=box+1 WHERE user_id=p_user_id;
 ELSIF p_action='design' THEN
  SELECT definition INTO d FROM stellar_natal_rewards_v132 WHERE id=p_key AND id LIKE 'design:%';
  IF d IS NULL THEN RAISE EXCEPTION 'Designer inválido';END IF;
  target:=d#>>'{eligibility,ship_id}';
  IF NOT coalesce(s->'ownedShips','[]') ? target THEN RAISE EXCEPTION 'Adquira a nave primeiro';END IF;
  IF d#>>'{eligibility,source}'='december_pass' THEN RAISE EXCEPTION 'Exclusivo do passe de dezembro';END IF;
  price:=(d->>'price')::bigint;
  IF coalesce((s#>>'{profile,uridium}')::bigint,0)<price THEN RAISE EXCEPTION 'STL insuficiente';END IF;
  IF EXISTS(SELECT 1 FROM player_design_inventory_v16 WHERE user_id=p_user_id AND design_id=d->>'design_id' AND quantity>0) THEN RAISE EXCEPTION 'Designer já adquirido';END IF;
  s:=jsonb_set(s,'{profile,uridium}',to_jsonb((s#>>'{profile,uridium}')::bigint-price));
  INSERT INTO player_design_inventory_v16(user_id,design_id,quantity) VALUES(p_user_id,d->>'design_id',1) ON CONFLICT(user_id,design_id) DO UPDATE SET quantity=greatest(player_design_inventory_v16.quantity,1);
 ELSIF p_action='pass' THEN
  IF at<'2026-12-01 03:00Z' OR at>='2027-01-01 03:00Z' OR s#>>'{battlePass,season}'<>'2026-12' THEN RAISE EXCEPTION 'Passe exclusivo de dezembro';END IF;
  step:=CASE p_key WHEN 'pass:cristal' THEN 15 WHEN 'pass:vulcao' THEN 30 ELSE 999 END;
  IF coalesce((s#>>'{battlePass,points}')::bigint,0)<step*450 OR step=999 THEN RAISE EXCEPTION 'Tier do passe bloqueado';END IF;
  target:=CASE step WHEN 15 THEN 'n132_spearhead_cristal' ELSE 'n132_yamato_vulcao' END;
  INSERT INTO player_design_inventory_v16(user_id,design_id,quantity) VALUES(p_user_id,target,1) ON CONFLICT(user_id,design_id) DO UPDATE SET quantity=greatest(player_design_inventory_v16.quantity,1);
 ELSE RAISE EXCEPTION 'Ação inválida';END IF;
 s:=jsonb_set(s,'{profile}',coalesce(s->'profile','{}')||jsonb_build_object('credits',coalesce((s#>>'{profile,credits}')::bigint,0)+coalesce((reward->>'credits')::bigint,0),'uridium',coalesce((s#>>'{profile,uridium}')::bigint,0)+coalesce((reward->>'uridium')::bigint,0)));
 s:=jsonb_set(s,'{pilotBio}',coalesce(s->'pilotBio','{}')||jsonb_build_object('logDisks',coalesce((s#>>'{pilotBio,logDisks}')::bigint,0)+coalesce((reward->>'cores')::bigint,0)));
 UPDATE stellar_natal_players_v132 SET fireworks=fireworks+coalesce((reward->>'fireworks')::int,0) WHERE user_id=p_user_id;
 s:=jsonb_set(s,'{serverPurchaseRevision}',to_jsonb(coalesce((s->>'serverPurchaseRevision')::bigint,0)+1));
 result:=public.stellar_commit_player_save_v118(p_user_id,s,at,s#>>'{profile,callsign}');
 IF coalesce((result->>'ok')::boolean,false) IS NOT TRUE THEN RAISE EXCEPTION 'Save natalino não confirmado';END IF;
 r:=r||jsonb_build_object('ok',true,'reward',reward);
 INSERT INTO stellar_natal_actions_v132(user_id,key,receipt) VALUES(p_user_id,p_key,r);
 RETURN r||jsonb_build_object('state',s,'updated_at',at);
END $function$
;
GRANT EXECUTE ON FUNCTION public.stellar_natal_action_v132(uuid,text,text,jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_natal_npc_v132(p_user_id uuid, p_kill_key text, p_npc_type text, p_base_credits bigint, p_base_stl bigint, p_owner_eligible boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE r jsonb; f text; inserted int;
BEGIN
 r:=public.stellar_grant_npc_reward_v1131(p_user_id,p_kill_key,p_npc_type,p_base_credits,p_base_stl,p_owner_eligible);
 IF p_npc_type NOT IN ('natalFloco','natalNevasca','natalGlacial','natalRei') THEN RETURN r;END IF;
 SELECT state#>>'{profile,faction}' INTO f FROM game_saves WHERE user_id=p_user_id;
 INSERT INTO stellar_natal_players_v132(user_id,faction) VALUES(p_user_id,coalesce(f,'earth')) ON CONFLICT DO NOTHING;
 INSERT INTO stellar_natal_actions_v132(user_id,key) VALUES(p_user_id,'npc:'||p_kill_key) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS inserted=ROW_COUNT;
 IF inserted=1 THEN
 UPDATE stellar_natal_players_v132 SET npc=npc+1,boss=boss+CASE WHEN p_npc_type='natalRei' THEN 1 ELSE 0 END WHERE user_id=p_user_id;
 IF p_owner_eligible THEN INSERT INTO stellar_natal_counts_v132(key,faction,kind) SELECT 'npc:'||p_kill_key,faction,'npc' FROM stellar_natal_players_v132 WHERE user_id=p_user_id ON CONFLICT DO NOTHING;END IF;
 END IF;
 RETURN r;
END $function$
;
GRANT EXECUTE ON FUNCTION public.stellar_natal_npc_v132(uuid,text,text,bigint,bigint,boolean) TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_offline_farm_claim_v1111(p_user uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE f public.stellar_offline_farm_v484%rowtype;
 sv record; p record; original_profile_at timestamptz;
 ledger_activity boolean; same_economy boolean; midnight_change boolean;
 eligible boolean:=false; v_recovery text; result jsonb; midnight_local timestamp;
BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'ONLY_SERVICE_ROLE'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,484));
 SELECT * INTO f FROM public.stellar_offline_farm_v484
 WHERE user_id=p_user ORDER BY (status='running') DESC,created_at DESC LIMIT 1 FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('status','none'); END IF;
 IF f.status <> 'running' THEN
   RETURN jsonb_build_object('ok',f.status='settled','status',f.status,'report',f.report);
 END IF;
 SELECT state,updated_at INTO sv FROM public.game_saves WHERE user_id=p_user FOR UPDATE;
 SELECT updated_at,credits,uridium,xp,aliens_killed INTO p FROM public.profiles WHERE id=p_user FOR UPDATE;
 IF sv.state IS NULL OR p.updated_at IS NULL THEN RAISE EXCEPTION 'FARM_SAVE_MISSING'; END IF;
 original_profile_at:=(f.snapshot->>'profile_updated_at')::timestamptz;
 IF sv.updated_at IS NOT DISTINCT FROM f.baseline_save_at AND p.updated_at IS NOT DISTINCT FROM original_profile_at THEN
   RETURN public.stellar_offline_farm_claim_v49(p_user);
 END IF;
 SELECT EXISTS(SELECT 1 FROM public.stellar_npc_reward_ledger WHERE user_id=p_user AND issued_at>=f.started_at)
 OR EXISTS(SELECT 1 FROM public.stellar_ore_reward_ledger WHERE user_id=p_user AND issued_at>=f.started_at)
 INTO ledger_activity;
 IF ledger_activity THEN RAISE EXCEPTION 'FARM_REVIEW_REQUIRED_ONLINE_REWARDS'; END IF;
 same_economy :=
   p.credits IS NOT DISTINCT FROM (sv.state#>>'{profile,credits}')::bigint
   AND p.uridium IS NOT DISTINCT FROM (sv.state#>>'{profile,uridium}')::bigint
   AND p.xp IS NOT DISTINCT FROM (sv.state#>>'{profile,xp}')::bigint
   AND p.aliens_killed IS NOT DISTINCT FROM (sv.state#>>'{profile,aliensKilled}')::bigint;
 IF NOT same_economy THEN RAISE EXCEPTION 'FARM_REVIEW_REQUIRED_ECONOMY_DESYNC'; END IF;
 midnight_local:=sv.updated_at AT TIME ZONE 'America/Sao_Paulo';
 midnight_change :=
   sv.updated_at=p.updated_at
   AND midnight_local>=date_trunc('day',midnight_local)
   AND midnight_local<date_trunc('day',midnight_local)+interval '2 seconds'
   AND sv.updated_at>=f.started_at AND sv.updated_at<=f.ends_at;
 IF f.snapshot ? 'recovery_fingerprint_v1111' THEN
   eligible := public.stellar_offline_farm_fingerprint_v1111(sv.state)=f.snapshot->>'recovery_fingerprint_v1111';
   v_recovery:='economy_unchanged_v1111';
   -- Um sincronismo diário legítimo pode alterar somente o hash do save
   -- enquanto o jogador está em Farm Offline. Os controles logo acima
   -- já impedem recompensas online e divergências de saldo.
   -- Só reconhecer sync simultâneo de save+perfil nos 2s iniciais
   -- da meia-noite de São Paulo, dentro da sessão deste Farm.
   if not eligible and midnight_change is true
      and ledger_activity is false and same_economy is true
      and sv.updated_at=p.updated_at
   then
     eligible:=true;
     v_recovery:='verified_midnight_sync_v1181';
   end if;
 ELSE
   eligible := midnight_change;
   v_recovery:='legacy_midnight_sync_v1111';
 END IF;
 
 IF NOT eligible
   AND f.id='cbfb4535-d1d3-4021-a47a-9c38a2112543'::uuid
   AND f.user_id='7fe74c4a-7fdd-4c41-ab06-07eda2a3c0d5'::uuid
   AND f.started_at='2026-11-02T00:56:37.119639Z'::timestamptz
   AND f.ends_at='2026-11-02T08:56:37.119639Z'::timestamptz
   AND now()>=f.ends_at
   AND midnight_change IS TRUE
   AND ledger_activity IS FALSE
   AND same_economy IS TRUE
   AND sv.updated_at=p.updated_at
 THEN
  eligible:=true;
  v_recovery:='felp22_verified_midnight_sync_20261102';
 END IF;

 IF NOT eligible THEN RAISE EXCEPTION 'FARM_REVIEW_REQUIRED_UNVERIFIED_CHANGE'; END IF;
 IF NOT (f.snapshot ? 'recovery_fingerprint_v1111') AND now()<f.ends_at THEN
   RAISE EXCEPTION 'FARM_REVIEW_REQUIRED_WAIT_END';
 END IF;
 UPDATE public.stellar_offline_farm_v484 SET
   baseline_save_at=sv.updated_at,
   snapshot=jsonb_set(snapshot,'{profile_updated_at}',to_jsonb(p.updated_at::text),true)
 WHERE id=f.id AND status='running';
 result:=public.stellar_offline_farm_claim_v49(p_user);
 IF result->>'status' <> 'settled' THEN RAISE EXCEPTION 'FARM_RECOVERY_NOT_SETTLED'; END IF;
 UPDATE public.stellar_offline_farm_v484 SET report=report ||
  jsonb_build_object('recovery_v1111',v_recovery,'original_save_baseline',f.baseline_save_at,
   'original_profile_baseline',original_profile_at)
 WHERE id=f.id AND status='settled';
 RETURN result || jsonb_build_object('recovered',true,'recovery_reason',v_recovery);
END;
$function$
;
GRANT EXECUTE ON FUNCTION public.stellar_offline_farm_claim_v1111(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_offline_farm_claim_v484(p_user uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE f record; sv record; p record; npc jsonb; shop jsonb;
 v_end timestamptz; target_seconds integer; elapsed integer:=0; kill_seconds integer; trip_seconds integer:=125; shots integer;
 k integer:=0; sold_count integer:=0; bought integer:=0; mined integer:=0; earned_cr bigint:=0; earned_stl bigint:=0; earned_xp bigint:=0; sale_cr bigint:=0; purchase_cr bigint:=0;
 cr bigint; stl bigint; xp bigint; ammo_key text; ammo_qty bigint; ammo_pack_qty integer; ammo_pack_price bigint; cargo jsonb; v_cargo_used bigint:=0; capacity bigint:=1500;
 res record; q integer; n integer; v_price bigint; v_resource text; mine_resource text; got_resources jsonb:='{}'::jsonb; sold_resources jsonb:='{}'::jsonb;
 st jsonb; v_report jsonb; reason text:='duration'; has_other_activity boolean; max_kills integer:=550;
BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'ONLY_SERVICE_ROLE'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,484));
 SELECT * INTO f FROM public.stellar_offline_farm_v484 WHERE user_id=p_user ORDER BY (status='running') DESC,created_at DESC LIMIT 1 FOR UPDATE;
 IF f.id IS NULL THEN RETURN jsonb_build_object('status','none'); END IF;
 IF f.status<>'running' THEN RETURN jsonb_build_object('ok',f.status='settled','status',f.status,'report',f.report); END IF;
 SELECT state,updated_at INTO sv FROM public.game_saves WHERE user_id=p_user FOR UPDATE;
 SELECT updated_at INTO p FROM public.profiles WHERE id=p_user FOR UPDATE;
 IF sv.state IS NULL THEN RAISE EXCEPTION 'FARM_SAVE_MISSING'; END IF;
 -- Um save ou recompensa real no período invalida a simulação: jamais misturar farm vivo e offline.
 SELECT EXISTS(SELECT 1 FROM public.stellar_npc_reward_ledger WHERE user_id=p_user AND issued_at>=f.started_at)
  OR EXISTS(SELECT 1 FROM public.stellar_ore_reward_ledger WHERE user_id=p_user AND issued_at>=f.started_at) INTO has_other_activity;
 IF (sv.updated_at IS DISTINCT FROM f.baseline_save_at) OR (p.updated_at IS DISTINCT FROM (f.snapshot->>'profile_updated_at')::timestamptz) OR has_other_activity THEN
   v_report:=jsonb_build_object('reason','online_activity_or_save_changed','kills',0,'message','Farm offline cancelado: houve atividade online ou alteração do save após ativação. Nenhuma recompensa offline foi gerada.');
   UPDATE public.stellar_offline_farm_v484 SET status='conflict',completed_at=now(),report=v_report WHERE id=f.id;
   RETURN jsonb_build_object('ok',false,'status','conflict','report',v_report);
 END IF;
 v_end:=least(now(),f.ends_at);
 target_seconds:=greatest(0,floor(extract(epoch from v_end-f.started_at))::integer);
 npc:=f.snapshot->'npc'; shop:=f.snapshot->'shop'; ammo_key:=f.ammo_key;
 kill_seconds:=greatest(35,least(480,ceil((coalesce((npc->>'hp')::numeric,0)+coalesce((npc->>'shield')::numeric,0))/(150+coalesce((f.snapshot->>'level')::numeric,1)*60))*7)::integer);
 shots:=greatest(8,least(150,ceil((coalesce((npc->>'hp')::numeric,0)+coalesce((npc->>'shield')::numeric,0))/(175+coalesce((f.snapshot->>'level')::numeric,1)*80))::integer));
 IF f.snapshot ? 'damage_per_shot' THEN
   kill_seconds:=greatest(25,least(480,ceil((coalesce((npc->>'hp')::numeric,0)+coalesce((npc->>'shield')::numeric,0))/greatest(1,(f.snapshot->>'damage_per_shot')::numeric)*7)::integer));
   shots:=greatest(1,least(150,ceil((coalesce((npc->>'hp')::numeric,0)+coalesce((npc->>'shield')::numeric,0))/greatest(1,(f.snapshot->>'damage_per_shot')::numeric))::integer));
   trip_seconds:=greatest(45,least(600,coalesce((f.snapshot->>'trip_seconds')::integer,125)));
   max_kills:=greatest(20,least(2000,coalesce((f.snapshot->>'max_kills')::integer,550)));
 END IF;
 ammo_qty:=greatest(0,coalesce((sv.state->'ammo'->>ammo_key)::bigint,0));
 ammo_pack_qty:=greatest(0,least(100000,coalesce((shop->>'qty')::integer,0)));
 ammo_pack_price:=greatest(0,coalesce((shop->>'price')::bigint,0));
 cr:=greatest(0,coalesce((sv.state#>>'{profile,credits}')::bigint,0));
 stl:=greatest(0,coalesce((sv.state#>>'{profile,uridium}')::bigint,0));
 xp:=greatest(0,coalesce((sv.state#>>'{profile,xp}')::bigint,0));
 cargo:=coalesce(sv.state->'cargo','{}'::jsonb);
 SELECT resource_key INTO mine_resource FROM public.game_map_resource_pool_v1814 WHERE map_id=f.map_id AND enabled=true AND resource_key<>'Xenomit' ORDER BY resource_key LIMIT 1;
 SELECT coalesce(sum(greatest(0,least(100000000, CASE WHEN value ~ '^[0-9]+$' THEN value::bigint ELSE 0 END))),0) INTO v_cargo_used FROM jsonb_each_text(cargo);
 WHILE elapsed+kill_seconds<=target_seconds AND k<max_kills LOOP
   IF ammo_qty < shots THEN
     IF NOT f.auto_buy OR coalesce(shop->>'currency','')<>'credits' OR ammo_pack_qty<=0 OR ammo_pack_price<=0 OR cr+earned_cr+sale_cr-purchase_cr<ammo_pack_price THEN reason:='ammo_exhausted';EXIT;END IF;
     IF elapsed+trip_seconds>target_seconds THEN reason:='waiting_to_restock';EXIT;END IF;
     -- Mesmo estoque oficial e preço do snapshot salvo. Sem compra de STL.
     elapsed:=elapsed+trip_seconds; ammo_qty:=ammo_qty+ammo_pack_qty;purchase_cr:=purchase_cr+ammo_pack_price;bought:=bought+1;
   END IF;
   IF elapsed+kill_seconds>target_seconds THEN EXIT; END IF;
   ammo_qty:=ammo_qty-shots; elapsed:=elapsed+kill_seconds; k:=k+1;
   earned_cr:=earned_cr+greatest(0,coalesce((npc->>'credits')::bigint,0));
   earned_stl:=earned_stl+greatest(0,coalesce((npc->>'stl')::bigint,0));
   earned_xp:=earned_xp+greatest(0,coalesce((npc->>'xp')::bigint,0));
   FOR res IN SELECT key,value FROM jsonb_each_text(coalesce(npc->'resources','{}'::jsonb)) LOOP
     IF v_cargo_used >= capacity THEN EXIT; END IF;
     n:=least(capacity-v_cargo_used, greatest(0,least(1000, CASE WHEN res.value ~ '^[0-9]+$' THEN res.value::integer ELSE 0 END)));
     IF n>0 THEN
       cargo:=jsonb_set(cargo,ARRAY[res.key],to_jsonb(coalesce((cargo->>res.key)::bigint,0)+n),true);
       got_resources:=jsonb_set(got_resources,ARRAY[res.key],to_jsonb(coalesce((got_resources->>res.key)::bigint,0)+n),true);
       v_cargo_used:=v_cargo_used+n;
     END IF;
   END LOOP;
   IF f.mine AND mine_resource IS NOT NULL AND k%5=0 AND v_cargo_used<capacity THEN
     n:=least(10,capacity-v_cargo_used);
     cargo:=jsonb_set(cargo,ARRAY[mine_resource],to_jsonb(coalesce((cargo->>mine_resource)::bigint,0)+n),true);
     got_resources:=jsonb_set(got_resources,ARRAY[mine_resource],to_jsonb(coalesce((got_resources->>mine_resource)::bigint,0)+n),true);
     v_cargo_used:=v_cargo_used+n;mined:=mined+n;
   END IF;
   IF v_cargo_used>=capacity THEN
     IF NOT f.auto_sell THEN reason:='cargo_full';EXIT; END IF;
     IF elapsed+trip_seconds>target_seconds THEN reason:='cargo_waiting_sale';EXIT;END IF;
     elapsed:=elapsed+trip_seconds;sold_count:=sold_count+1;
     FOR res IN SELECT key,value FROM jsonb_each_text(cargo) LOOP
       q:=greatest(0,least(100000000,CASE WHEN res.value ~ '^[0-9]+$' THEN res.value::integer ELSE 0 END));
       IF res.key='Xenomit' OR q=0 THEN CONTINUE;END IF;
       SELECT greatest(0,sell_price) INTO v_price FROM public.game_resource_config_v1814 WHERE resource_key=res.key AND enabled=true LIMIT 1;
       IF v_price IS NULL THEN CONTINUE;END IF;
       sale_cr:=sale_cr+q*v_price;
       sold_resources:=jsonb_set(sold_resources,ARRAY[res.key],to_jsonb(coalesce((sold_resources->>res.key)::bigint,0)+q),true);
       cargo:=jsonb_set(cargo,ARRAY[res.key],'0'::jsonb,true);
     END LOOP;
     SELECT coalesce(sum(greatest(0,CASE WHEN value ~ '^[0-9]+$' THEN value::bigint ELSE 0 END)),0) INTO v_cargo_used FROM jsonb_each_text(cargo);
   END IF;
 END LOOP;
 IF elapsed=0 AND target_seconds<kill_seconds THEN reason:='waiting'; END IF;
 IF cr+earned_cr+sale_cr-purchase_cr<0 THEN RAISE EXCEPTION 'FARM_CREDITS_UNDERFLOW'; END IF;
 IF cr+earned_cr+sale_cr-purchase_cr>1000000000000 OR stl+earned_stl>10000000000 THEN RAISE EXCEPTION 'FARM_ECONOMY_LIMIT'; END IF;
 st:=sv.state;
 st:=jsonb_set(st,ARRAY['profile','credits'],to_jsonb(cr+earned_cr+sale_cr-purchase_cr),true);
 st:=jsonb_set(st,ARRAY['profile','uridium'],to_jsonb(stl+earned_stl),true);
 st:=jsonb_set(st,ARRAY['profile','xp'],to_jsonb(xp+earned_xp),true);
 st:=jsonb_set(st,ARRAY['profile','aliensKilled'],to_jsonb(coalesce((st#>>'{profile,aliensKilled}')::bigint,0)+k),true);
 st:=jsonb_set(st,ARRAY['ammo',ammo_key],to_jsonb(ammo_qty),true);
 st:=jsonb_set(st,ARRAY['cargo'],cargo,true);
 IF k>0 THEN st:=jsonb_set(st,ARRAY['serverNpcRewardRevision'],to_jsonb(coalesce((st->>'serverNpcRewardRevision')::integer,0)+1),true); END IF;
 IF mined>0 THEN st:=jsonb_set(st,ARRAY['serverOreRevision'],to_jsonb(coalesce((st->>'serverOreRevision')::integer,0)+1),true); END IF;
 IF purchase_cr>0 OR sale_cr>0 THEN st:=jsonb_set(st,ARRAY['serverPurchaseRevision'],to_jsonb(coalesce((st->>'serverPurchaseRevision')::integer,0)+1),true); END IF;
 v_report:=jsonb_build_object('reason',reason,'duration_seconds',target_seconds,'elapsed_simulated',elapsed,'map',f.map_id,'npc',f.npc_key,'kills',k,'boxes_collected',k,'xp',earned_xp,'npc_credits',earned_cr,'stl',earned_stl,'mined_units',mined,'cargo_collected',got_resources,'cargo_sold',sold_resources,'sales',sold_count,'sale_credits',sale_cr,'ammo_bought',bought,'ammo_spent',purchase_cr,'ammo_remaining',ammo_qty,'credits_net',earned_cr+sale_cr-purchase_cr,'ended_at',v_end);
 UPDATE public.game_saves SET state=st,updated_at=now() WHERE user_id=p_user;
 UPDATE public.profiles SET xp=(SELECT coalesce((st#>>'{profile,xp}')::bigint,0)),credits=cr+earned_cr+sale_cr-purchase_cr,uridium=stl+earned_stl,aliens_killed=coalesce((st#>>'{profile,aliensKilled}')::bigint,0),updated_at=now() WHERE id=p_user;
 UPDATE public.stellar_offline_farm_v484 SET status='settled',report=v_report,completed_at=now() WHERE id=f.id;
 RETURN jsonb_build_object('ok',true,'status','settled','report',v_report);
END $function$
;
GRANT EXECUTE ON FUNCTION public.stellar_offline_farm_claim_v484(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_offline_farm_claim_v487(p_user uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE f record; sv record; p record; npc jsonb; shop jsonb;
 v_end timestamptz; target_seconds integer; elapsed integer:=0; kill_seconds integer; trip_seconds integer:=125; shots integer;
 k integer:=0; sold_count integer:=0; bought integer:=0; mined integer:=0; earned_cr bigint:=0; earned_stl bigint:=0; earned_xp bigint:=0; sale_cr bigint:=0; purchase_cr bigint:=0;
 cr bigint; stl bigint; xp bigint; ammo_key text; ammo_qty bigint; ammo_pack_qty integer; ammo_pack_price bigint; cargo jsonb; v_cargo_used bigint:=0; capacity bigint:=1500;
 res record; q integer; n integer; v_price bigint; v_resource text; mine_resource text; got_resources jsonb:='{}'::jsonb; sold_resources jsonb:='{}'::jsonb;
 st jsonb; v_report jsonb; reason text:='duration'; has_other_activity boolean; max_kills integer:=550;
BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'ONLY_SERVICE_ROLE'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,484));
 SELECT * INTO f FROM public.stellar_offline_farm_v484 WHERE user_id=p_user ORDER BY (status='running') DESC,created_at DESC LIMIT 1 FOR UPDATE;
 IF f.id IS NULL THEN RETURN jsonb_build_object('status','none'); END IF;
 IF f.status<>'running' THEN RETURN jsonb_build_object('ok',f.status='settled','status',f.status,'report',f.report); END IF;
 SELECT state,updated_at INTO sv FROM public.game_saves WHERE user_id=p_user FOR UPDATE;
 SELECT updated_at INTO p FROM public.profiles WHERE id=p_user FOR UPDATE;
 IF sv.state IS NULL THEN RAISE EXCEPTION 'FARM_SAVE_MISSING'; END IF;
 -- Um save ou recompensa real no período invalida a simulação: jamais misturar farm vivo e offline.
 SELECT EXISTS(SELECT 1 FROM public.stellar_npc_reward_ledger WHERE user_id=p_user AND issued_at>=f.started_at)
  OR EXISTS(SELECT 1 FROM public.stellar_ore_reward_ledger WHERE user_id=p_user AND issued_at>=f.started_at) INTO has_other_activity;
 IF (sv.updated_at IS DISTINCT FROM f.baseline_save_at) OR (p.updated_at IS DISTINCT FROM (f.snapshot->>'profile_updated_at')::timestamptz) OR has_other_activity THEN
   v_report:=jsonb_build_object('reason','online_activity_or_save_changed','kills',0,'message','Farm offline cancelado: houve atividade online ou alteração do save após ativação. Nenhuma recompensa offline foi gerada.');
   UPDATE public.stellar_offline_farm_v484 SET status='conflict',completed_at=now(),report=v_report WHERE id=f.id;
   RETURN jsonb_build_object('ok',false,'status','conflict','report',v_report);
 END IF;
 v_end:=least(now(),f.ends_at);
 target_seconds:=greatest(0,floor(extract(epoch from v_end-f.started_at))::integer);
 npc:=f.snapshot->'npc'; shop:=f.snapshot->'shop'; ammo_key:=f.ammo_key;
 kill_seconds:=greatest(35,least(480,ceil((coalesce((npc->>'hp')::numeric,0)+coalesce((npc->>'shield')::numeric,0))/(150+coalesce((f.snapshot->>'level')::numeric,1)*60))*7)::integer);
 shots:=greatest(8,least(150,ceil((coalesce((npc->>'hp')::numeric,0)+coalesce((npc->>'shield')::numeric,0))/(175+coalesce((f.snapshot->>'level')::numeric,1)*80))::integer));
 IF f.snapshot ? 'damage_per_shot' THEN
   kill_seconds:=greatest(25,least(480,ceil((coalesce((npc->>'hp')::numeric,0)+coalesce((npc->>'shield')::numeric,0))/greatest(1,(f.snapshot->>'damage_per_shot')::numeric)*7)::integer));
   shots:=greatest(1,least(150,ceil((coalesce((npc->>'hp')::numeric,0)+coalesce((npc->>'shield')::numeric,0))/greatest(1,(f.snapshot->>'damage_per_shot')::numeric))::integer));
   trip_seconds:=greatest(45,least(600,coalesce((f.snapshot->>'trip_seconds')::integer,125)));
   max_kills:=greatest(20,least(2000,coalesce((f.snapshot->>'max_kills')::integer,550)));
 END IF;
 IF f.snapshot->>'combat_model'='v487' THEN
   shots:=greatest(1,least(320000,coalesce((f.snapshot->>'ammo_per_kill')::integer,0)));
   kill_seconds:=greatest(1,least(30000,coalesce((f.snapshot->>'combat_kill_seconds')::integer,30000)));
   capacity:=greatest(100,least(15000,coalesce((f.snapshot->>'cargo_capacity')::bigint,1500)));
   trip_seconds:=greatest(45,least(600,ceil(trip_seconds*350.0/greatest(100,(f.snapshot->>'ship_speed')::numeric))::integer));
 END IF;
 ammo_qty:=greatest(0,coalesce((sv.state->'ammo'->>ammo_key)::bigint,0));
 ammo_pack_qty:=greatest(0,least(100000,coalesce((shop->>'qty')::integer,0)));
 ammo_pack_price:=greatest(0,coalesce((shop->>'price')::bigint,0));
 cr:=greatest(0,coalesce((sv.state#>>'{profile,credits}')::bigint,0));
 stl:=greatest(0,coalesce((sv.state#>>'{profile,uridium}')::bigint,0));
 xp:=greatest(0,coalesce((sv.state#>>'{profile,xp}')::bigint,0));
 cargo:=coalesce(sv.state->'cargo','{}'::jsonb);
 SELECT resource_key INTO mine_resource FROM public.game_map_resource_pool_v1814 WHERE map_id=f.map_id AND enabled=true AND resource_key<>'Xenomit' ORDER BY resource_key LIMIT 1;
 SELECT coalesce(sum(greatest(0,least(100000000, CASE WHEN value ~ '^[0-9]+$' THEN value::bigint ELSE 0 END))),0) INTO v_cargo_used FROM jsonb_each_text(cargo);
 WHILE elapsed+kill_seconds<=target_seconds AND k<max_kills LOOP
   WHILE ammo_qty < shots LOOP
     IF NOT f.auto_buy OR coalesce(shop->>'currency','')<>'credits' OR ammo_pack_qty<=0 OR ammo_pack_price<=0 OR cr+earned_cr+sale_cr-purchase_cr<ammo_pack_price OR bought>=100 THEN reason:='ammo_exhausted';EXIT;END IF;
     IF elapsed+trip_seconds>target_seconds THEN reason:='waiting_to_restock';EXIT;END IF;
     -- Cada pacote exige uma viagem virtual com débito oficial de créditos.
     elapsed:=elapsed+trip_seconds; ammo_qty:=ammo_qty+ammo_pack_qty;purchase_cr:=purchase_cr+ammo_pack_price;bought:=bought+1;
   END LOOP;
   IF ammo_qty<shots OR elapsed+kill_seconds>target_seconds THEN EXIT; END IF;
   ammo_qty:=ammo_qty-shots; elapsed:=elapsed+kill_seconds; k:=k+1;
   earned_cr:=earned_cr+greatest(0,coalesce((npc->>'credits')::bigint,0));
   earned_stl:=earned_stl+greatest(0,coalesce((npc->>'stl')::bigint,0));
   earned_xp:=earned_xp+greatest(0,coalesce((npc->>'xp')::bigint,0));
   FOR res IN SELECT key,value FROM jsonb_each_text(coalesce(npc->'resources','{}'::jsonb)) LOOP
     IF v_cargo_used >= capacity THEN EXIT; END IF;
     n:=least(capacity-v_cargo_used, greatest(0,least(1000, CASE WHEN res.value ~ '^[0-9]+$' THEN res.value::integer ELSE 0 END)));
     IF n>0 THEN
       cargo:=jsonb_set(cargo,ARRAY[res.key],to_jsonb(coalesce((cargo->>res.key)::bigint,0)+n),true);
       got_resources:=jsonb_set(got_resources,ARRAY[res.key],to_jsonb(coalesce((got_resources->>res.key)::bigint,0)+n),true);
       v_cargo_used:=v_cargo_used+n;
     END IF;
   END LOOP;
   IF f.mine AND mine_resource IS NOT NULL AND k%5=0 AND v_cargo_used<capacity THEN
     n:=least(10,capacity-v_cargo_used);
     cargo:=jsonb_set(cargo,ARRAY[mine_resource],to_jsonb(coalesce((cargo->>mine_resource)::bigint,0)+n),true);
     got_resources:=jsonb_set(got_resources,ARRAY[mine_resource],to_jsonb(coalesce((got_resources->>mine_resource)::bigint,0)+n),true);
     v_cargo_used:=v_cargo_used+n;mined:=mined+n;
   END IF;
   IF v_cargo_used>=capacity THEN
     IF NOT f.auto_sell THEN reason:='cargo_full';EXIT; END IF;
     IF elapsed+trip_seconds>target_seconds THEN reason:='cargo_waiting_sale';EXIT;END IF;
     elapsed:=elapsed+trip_seconds;sold_count:=sold_count+1;
     FOR res IN SELECT key,value FROM jsonb_each_text(cargo) LOOP
       q:=greatest(0,least(100000000,CASE WHEN res.value ~ '^[0-9]+$' THEN res.value::integer ELSE 0 END));
       IF res.key='Xenomit' OR q=0 THEN CONTINUE;END IF;
       SELECT greatest(0,sell_price) INTO v_price FROM public.game_resource_config_v1814 WHERE resource_key=res.key AND enabled=true LIMIT 1;
       IF v_price IS NULL THEN CONTINUE;END IF;
       sale_cr:=sale_cr+q*v_price;
       sold_resources:=jsonb_set(sold_resources,ARRAY[res.key],to_jsonb(coalesce((sold_resources->>res.key)::bigint,0)+q),true);
       cargo:=jsonb_set(cargo,ARRAY[res.key],'0'::jsonb,true);
     END LOOP;
     SELECT coalesce(sum(greatest(0,CASE WHEN value ~ '^[0-9]+$' THEN value::bigint ELSE 0 END)),0) INTO v_cargo_used FROM jsonb_each_text(cargo);
   END IF;
 END LOOP;
 IF elapsed=0 AND target_seconds<kill_seconds THEN reason:='waiting'; END IF;
 IF cr+earned_cr+sale_cr-purchase_cr<0 THEN RAISE EXCEPTION 'FARM_CREDITS_UNDERFLOW'; END IF;
 IF cr+earned_cr+sale_cr-purchase_cr>1000000000000 OR stl+earned_stl>10000000000 THEN RAISE EXCEPTION 'FARM_ECONOMY_LIMIT'; END IF;
 st:=sv.state;
 st:=jsonb_set(st,ARRAY['profile','credits'],to_jsonb(cr+earned_cr+sale_cr-purchase_cr),true);
 st:=jsonb_set(st,ARRAY['profile','uridium'],to_jsonb(stl+earned_stl),true);
 st:=jsonb_set(st,ARRAY['profile','xp'],to_jsonb(xp+earned_xp),true);
 st:=jsonb_set(st,ARRAY['profile','aliensKilled'],to_jsonb(coalesce((st#>>'{profile,aliensKilled}')::bigint,0)+k),true);
 st:=jsonb_set(st,ARRAY['ammo',ammo_key],to_jsonb(ammo_qty),true);
 st:=jsonb_set(st,ARRAY['cargo'],cargo,true);
 IF k>0 THEN st:=jsonb_set(st,ARRAY['serverNpcRewardRevision'],to_jsonb(coalesce((st->>'serverNpcRewardRevision')::integer,0)+1),true); END IF;
 IF mined>0 THEN st:=jsonb_set(st,ARRAY['serverOreRevision'],to_jsonb(coalesce((st->>'serverOreRevision')::integer,0)+1),true); END IF;
 IF purchase_cr>0 OR sale_cr>0 THEN st:=jsonb_set(st,ARRAY['serverPurchaseRevision'],to_jsonb(coalesce((st->>'serverPurchaseRevision')::integer,0)+1),true); END IF;
 v_report:=jsonb_build_object('reason',reason,'duration_seconds',target_seconds,'elapsed_simulated',elapsed,'map',f.map_id,'npc',f.npc_key,'kills',k,'boxes_collected',k,'xp',earned_xp,'npc_credits',earned_cr,'stl',earned_stl,'mined_units',mined,'cargo_collected',got_resources,'cargo_sold',sold_resources,'sales',sold_count,'sale_credits',sale_cr,'ammo_bought',bought,'ammo_spent',purchase_cr,'ammo_remaining',ammo_qty,'credits_net',earned_cr+sale_cr-purchase_cr,'ended_at',v_end,'npc_name',coalesce(f.snapshot->>'npc_name',(SELECT name FROM public.game_npc_config_v1811 WHERE npc_key=f.npc_key)),'combat_model',coalesce(f.snapshot->>'combat_model','v485'),'laser_count',coalesce((f.snapshot->>'laser_count')::integer,0),'ammo_per_kill',shots,'move_seconds',coalesce((f.snapshot->>'move_between_seconds')::integer,0));
 UPDATE public.game_saves SET state=st,updated_at=now() WHERE user_id=p_user;
 UPDATE public.profiles SET xp=(SELECT coalesce((st#>>'{profile,xp}')::bigint,0)),credits=cr+earned_cr+sale_cr-purchase_cr,uridium=stl+earned_stl,aliens_killed=coalesce((st#>>'{profile,aliensKilled}')::bigint,0),updated_at=now() WHERE id=p_user;
 UPDATE public.stellar_offline_farm_v484 SET status='settled',report=v_report,completed_at=now() WHERE id=f.id;
 RETURN jsonb_build_object('ok',true,'status','settled','report',v_report);
END $function$
;
GRANT EXECUTE ON FUNCTION public.stellar_offline_farm_claim_v487(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_offline_farm_claim_v49(p_user uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE f record; sv record; p record; npc jsonb; shop jsonb;
 v_end timestamptz; target_seconds integer; elapsed integer:=0; kill_seconds integer; trip_seconds integer:=125; shots integer;
 k integer:=0; sold_count integer:=0; bought integer:=0; mined integer:=0; earned_cr bigint:=0; earned_stl bigint:=0; earned_xp bigint:=0; sale_cr bigint:=0; purchase_cr bigint:=0;
 cr bigint; stl bigint; xp bigint; ammo_key text; ammo_qty bigint; ammo_pack_qty integer; ammo_pack_price bigint; cargo jsonb; v_cargo_used bigint:=0; capacity bigint:=1500;
 res record; q integer; n integer; v_price bigint; v_resource text; mine_resource text; got_resources jsonb:='{}'::jsonb; sold_resources jsonb:='{}'::jsonb;
 st jsonb; v_report jsonb; reason text:='duration'; has_other_activity boolean; max_kills integer:=550;
 sale_limit bigint:=9223372036854775807; orig_remaining jsonb:='{}'::jsonb; sale_from_prior bigint:=0; orig_part bigint:=0;
BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'ONLY_SERVICE_ROLE'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,484));
 SELECT * INTO f FROM public.stellar_offline_farm_v484 WHERE user_id=p_user ORDER BY (status='running') DESC,created_at DESC LIMIT 1 FOR UPDATE;
 IF f.id IS NULL THEN RETURN jsonb_build_object('status','none'); END IF;
 IF f.status<>'running' THEN RETURN jsonb_build_object('ok',f.status='settled','status',f.status,'report',f.report); END IF;
 SELECT state,updated_at INTO sv FROM public.game_saves WHERE user_id=p_user FOR UPDATE;
 SELECT updated_at INTO p FROM public.profiles WHERE id=p_user FOR UPDATE;
 IF sv.state IS NULL THEN RAISE EXCEPTION 'FARM_SAVE_MISSING'; END IF;
 -- Um save ou recompensa real no período invalida a simulação: jamais misturar farm vivo e offline.
 SELECT EXISTS(SELECT 1 FROM public.stellar_npc_reward_ledger WHERE user_id=p_user AND issued_at>=f.started_at)
  OR EXISTS(SELECT 1 FROM public.stellar_ore_reward_ledger WHERE user_id=p_user AND issued_at>=f.started_at) INTO has_other_activity;
 IF (sv.updated_at IS DISTINCT FROM f.baseline_save_at) OR (p.updated_at IS DISTINCT FROM (f.snapshot->>'profile_updated_at')::timestamptz) OR has_other_activity THEN
   v_report:=jsonb_build_object('reason','online_activity_or_save_changed','kills',0,'message','Farm offline cancelado: houve atividade online ou alteração do save após ativação. Nenhuma recompensa offline foi gerada.');
   UPDATE public.stellar_offline_farm_v484 SET status='conflict',completed_at=now(),report=v_report WHERE id=f.id;
   RETURN jsonb_build_object('ok',false,'status','conflict','report',v_report);
 END IF;
 v_end:=least(now(),f.ends_at);
 target_seconds:=greatest(0,floor(extract(epoch from v_end-f.started_at))::integer);
 npc:=f.snapshot->'npc'; shop:=f.snapshot->'shop'; ammo_key:=f.ammo_key;
 kill_seconds:=greatest(35,least(480,ceil((coalesce((npc->>'hp')::numeric,0)+coalesce((npc->>'shield')::numeric,0))/(150+coalesce((f.snapshot->>'level')::numeric,1)*60))*7)::integer);
 shots:=greatest(8,least(150,ceil((coalesce((npc->>'hp')::numeric,0)+coalesce((npc->>'shield')::numeric,0))/(175+coalesce((f.snapshot->>'level')::numeric,1)*80))::integer));
 IF f.snapshot ? 'damage_per_shot' THEN
   kill_seconds:=greatest(25,least(480,ceil((coalesce((npc->>'hp')::numeric,0)+coalesce((npc->>'shield')::numeric,0))/greatest(1,(f.snapshot->>'damage_per_shot')::numeric)*7)::integer));
   shots:=greatest(1,least(150,ceil((coalesce((npc->>'hp')::numeric,0)+coalesce((npc->>'shield')::numeric,0))/greatest(1,(f.snapshot->>'damage_per_shot')::numeric))::integer));
   trip_seconds:=greatest(45,least(600,coalesce((f.snapshot->>'trip_seconds')::integer,125)));
   max_kills:=greatest(20,least(2000,coalesce((f.snapshot->>'max_kills')::integer,550)));
 END IF;
 IF f.snapshot->>'combat_model'='v487' THEN
   shots:=greatest(1,least(320000,coalesce((f.snapshot->>'ammo_per_kill')::integer,0)));
   kill_seconds:=greatest(1,least(30000,coalesce((f.snapshot->>'combat_kill_seconds')::integer,30000)));
   capacity:=greatest(100,least(15000,coalesce((f.snapshot->>'cargo_capacity')::bigint,1500)));
   trip_seconds:=greatest(45,least(600,ceil(trip_seconds*350.0/greatest(100,(f.snapshot->>'ship_speed')::numeric))::integer));
 END IF;
 ammo_qty:=greatest(0,coalesce((sv.state->'ammo'->>ammo_key)::bigint,0));
 ammo_pack_qty:=greatest(0,least(100000,coalesce((shop->>'qty')::integer,0)));
 ammo_pack_price:=greatest(0,coalesce((shop->>'price')::bigint,0));
 cr:=greatest(0,coalesce((sv.state#>>'{profile,credits}')::bigint,0));
 stl:=greatest(0,coalesce((sv.state#>>'{profile,uridium}')::bigint,0));
 xp:=greatest(0,coalesce((sv.state#>>'{profile,xp}')::bigint,0));
 cargo:=coalesce(sv.state->'cargo','{}'::jsonb); orig_remaining:=cargo;
 IF f.snapshot->>'economic_model'='v49' THEN sale_limit:=greatest(0,least(1000000000000,coalesce((f.snapshot->>'max_sale_credits')::bigint,30000000))); END IF;
 SELECT resource_key INTO mine_resource FROM public.game_map_resource_pool_v1814 WHERE map_id=f.map_id AND enabled=true AND resource_key<>'Xenomit' ORDER BY resource_key LIMIT 1;
 SELECT coalesce(sum(greatest(0,least(100000000, CASE WHEN value ~ '^[0-9]+$' THEN value::bigint ELSE 0 END))),0) INTO v_cargo_used FROM jsonb_each_text(cargo);
 WHILE elapsed+kill_seconds<=target_seconds AND k<max_kills LOOP
   WHILE ammo_qty < shots LOOP
     IF NOT f.auto_buy OR coalesce(shop->>'currency','')<>'credits' OR ammo_pack_qty<=0 OR ammo_pack_price<=0 OR cr+earned_cr+sale_cr-purchase_cr<ammo_pack_price OR bought>=100 THEN reason:='ammo_exhausted';EXIT;END IF;
     IF elapsed+trip_seconds>target_seconds THEN reason:='waiting_to_restock';EXIT;END IF;
     -- Cada pacote exige uma viagem virtual com débito oficial de créditos.
     elapsed:=elapsed+trip_seconds; ammo_qty:=ammo_qty+ammo_pack_qty;purchase_cr:=purchase_cr+ammo_pack_price;bought:=bought+1;
   END LOOP;
   IF ammo_qty<shots OR elapsed+kill_seconds>target_seconds THEN EXIT; END IF;
   ammo_qty:=ammo_qty-shots; elapsed:=elapsed+kill_seconds; k:=k+1;
   earned_cr:=earned_cr+greatest(0,coalesce((npc->>'credits')::bigint,0));
   earned_stl:=earned_stl+greatest(0,coalesce((npc->>'stl')::bigint,0));
   earned_xp:=earned_xp+greatest(0,coalesce((npc->>'xp')::bigint,0));
   FOR res IN SELECT key,value FROM jsonb_each_text(coalesce(npc->'resources','{}'::jsonb)) LOOP
     IF v_cargo_used >= capacity THEN EXIT; END IF;
     n:=least(capacity-v_cargo_used, greatest(0,least(1000, CASE WHEN res.value ~ '^[0-9]+$' THEN res.value::integer ELSE 0 END)));
     IF n>0 THEN
       cargo:=jsonb_set(cargo,ARRAY[res.key],to_jsonb(coalesce((cargo->>res.key)::bigint,0)+n),true);
       got_resources:=jsonb_set(got_resources,ARRAY[res.key],to_jsonb(coalesce((got_resources->>res.key)::bigint,0)+n),true);
       v_cargo_used:=v_cargo_used+n;
     END IF;
   END LOOP;
   IF f.mine AND mine_resource IS NOT NULL AND k%5=0 AND v_cargo_used<capacity THEN
     n:=least(10,capacity-v_cargo_used);
     cargo:=jsonb_set(cargo,ARRAY[mine_resource],to_jsonb(coalesce((cargo->>mine_resource)::bigint,0)+n),true);
     got_resources:=jsonb_set(got_resources,ARRAY[mine_resource],to_jsonb(coalesce((got_resources->>mine_resource)::bigint,0)+n),true);
     v_cargo_used:=v_cargo_used+n;mined:=mined+n;
   END IF;
   IF v_cargo_used>=capacity THEN
     IF NOT f.auto_sell THEN reason:='cargo_full';EXIT; END IF;
     IF elapsed+trip_seconds>target_seconds THEN reason:='cargo_waiting_sale';EXIT;END IF;
     elapsed:=elapsed+trip_seconds;sold_count:=sold_count+1;
     FOR res IN SELECT key,value FROM jsonb_each_text(cargo) LOOP
       q:=greatest(0,least(100000000,CASE WHEN res.value ~ '^[0-9]+$' THEN res.value::integer ELSE 0 END));
       IF res.key='Xenomit' OR q=0 THEN CONTINUE;END IF;
       SELECT greatest(0,sell_price) INTO v_price FROM public.game_resource_config_v1814 WHERE resource_key=res.key AND enabled=true LIMIT 1;
       IF v_price IS NULL THEN CONTINUE;END IF;
       IF f.snapshot->>'economic_model'='v49' AND sale_cr + q*v_price > sale_limit THEN
         reason:='sale_limit_reached';EXIT;
       END IF;
       orig_part:=least(q,greatest(0,coalesce((orig_remaining->>res.key)::bigint,0)));
       orig_remaining:=jsonb_set(orig_remaining,ARRAY[res.key],to_jsonb(greatest(0,coalesce((orig_remaining->>res.key)::bigint,0)-orig_part)),true);
       sale_from_prior:=sale_from_prior+orig_part*v_price;
       sale_cr:=sale_cr+q*v_price;
       sold_resources:=jsonb_set(sold_resources,ARRAY[res.key],to_jsonb(coalesce((sold_resources->>res.key)::bigint,0)+q),true);
       cargo:=jsonb_set(cargo,ARRAY[res.key],'0'::jsonb,true);
     END LOOP;
     SELECT coalesce(sum(greatest(0,CASE WHEN value ~ '^[0-9]+$' THEN value::bigint ELSE 0 END)),0) INTO v_cargo_used FROM jsonb_each_text(cargo);
     IF reason='sale_limit_reached' THEN EXIT; END IF;
   END IF;
 END LOOP;
 IF elapsed=0 AND target_seconds<kill_seconds THEN reason:='waiting'; END IF;
 IF cr+earned_cr+sale_cr-purchase_cr<0 THEN RAISE EXCEPTION 'FARM_CREDITS_UNDERFLOW'; END IF;
 IF cr+earned_cr+sale_cr-purchase_cr>1000000000000 OR stl+earned_stl>10000000000 THEN RAISE EXCEPTION 'FARM_ECONOMY_LIMIT'; END IF;
 st:=sv.state;
 st:=jsonb_set(st,ARRAY['profile','credits'],to_jsonb(cr+earned_cr+sale_cr-purchase_cr),true);
 st:=jsonb_set(st,ARRAY['profile','uridium'],to_jsonb(stl+earned_stl),true);
 st:=jsonb_set(st,ARRAY['profile','xp'],to_jsonb(xp+earned_xp),true);
 st:=jsonb_set(st,ARRAY['profile','aliensKilled'],to_jsonb(coalesce((st#>>'{profile,aliensKilled}')::bigint,0)+k),true);
 st:=jsonb_set(st,ARRAY['ammo',ammo_key],to_jsonb(ammo_qty),true);
 st:=jsonb_set(st,ARRAY['cargo'],cargo,true);
 IF k>0 THEN st:=jsonb_set(st,ARRAY['serverNpcRewardRevision'],to_jsonb(coalesce((st->>'serverNpcRewardRevision')::integer,0)+1),true); END IF;
 IF mined>0 THEN st:=jsonb_set(st,ARRAY['serverOreRevision'],to_jsonb(coalesce((st->>'serverOreRevision')::integer,0)+1),true); END IF;
 IF purchase_cr>0 OR sale_cr>0 THEN st:=jsonb_set(st,ARRAY['serverPurchaseRevision'],to_jsonb(coalesce((st->>'serverPurchaseRevision')::integer,0)+1),true); END IF;
 v_report:=jsonb_build_object('reason',reason,'duration_seconds',target_seconds,'elapsed_simulated',elapsed,'map',f.map_id,'npc',f.npc_key,'kills',k,'boxes_collected',k,'xp',earned_xp,'npc_credits',earned_cr,'stl',earned_stl,'mined_units',mined,'cargo_collected',got_resources,'cargo_sold',sold_resources,'sales',sold_count,'sale_credits',sale_cr,'starting_cargo_sale_credits',sale_from_prior,'farm_generated_sale_credits',sale_cr-sale_from_prior,'audit_sale_cap',CASE WHEN f.snapshot->>'economic_model'='v49' THEN sale_limit ELSE NULL END,'ammo_bought',bought,'ammo_spent',purchase_cr,'ammo_remaining',ammo_qty,'credits_net',earned_cr+sale_cr-purchase_cr,'ended_at',v_end,'npc_name',coalesce(f.snapshot->>'npc_name',(SELECT name FROM public.game_npc_config_v1811 WHERE npc_key=f.npc_key)),'combat_model',coalesce(f.snapshot->>'combat_model','v485'),'laser_count',coalesce((f.snapshot->>'laser_count')::integer,0),'ammo_per_kill',shots,'move_seconds',coalesce((f.snapshot->>'move_between_seconds')::integer,0));
 UPDATE public.game_saves SET state=st,updated_at=now() WHERE user_id=p_user;
 UPDATE public.profiles SET xp=(SELECT coalesce((st#>>'{profile,xp}')::bigint,0)),credits=cr+earned_cr+sale_cr-purchase_cr,uridium=stl+earned_stl,aliens_killed=coalesce((st#>>'{profile,aliensKilled}')::bigint,0),updated_at=now() WHERE id=p_user;
 UPDATE public.stellar_offline_farm_v484 SET status='settled',report=v_report,completed_at=now() WHERE id=f.id;
 RETURN jsonb_build_object('ok',true,'status','settled','report',v_report);
END $function$
;
GRANT EXECUTE ON FUNCTION public.stellar_offline_farm_claim_v49(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_offline_farm_start_v1111(p_user uuid, p_minutes integer, p_auto_sell boolean, p_auto_buy boolean, p_mine boolean, p_npc_key text, p_ammo_key text, p_combat jsonb, p_baseline_save_at timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE r jsonb; sv record;
BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'ONLY_SERVICE_ROLE'; END IF;
 r:=public.stellar_offline_farm_start_v49(p_user,p_minutes,p_auto_sell,p_auto_buy,p_mine,p_npc_key,p_ammo_key,p_combat,p_baseline_save_at);
 IF r->>'status' <> 'running' THEN RETURN r; END IF;
 SELECT state,updated_at INTO sv FROM public.game_saves WHERE user_id=p_user;
 IF sv.state IS NULL OR sv.updated_at IS DISTINCT FROM p_baseline_save_at THEN
  RAISE EXCEPTION 'FARM_SAVE_CHANGED_DURING_START';
 END IF;
 UPDATE public.stellar_offline_farm_v484
 SET snapshot=jsonb_set(snapshot,'{recovery_fingerprint_v1111}',to_jsonb(public.stellar_offline_farm_fingerprint_v1111(sv.state)),true)
 WHERE id=(r->>'id')::uuid AND user_id=p_user AND status='running';
 IF NOT FOUND THEN RAISE EXCEPTION 'FARM_START_NOT_COMMITTED'; END IF;
 RETURN r;
END;
$function$
;
GRANT EXECUTE ON FUNCTION public.stellar_offline_farm_start_v1111(uuid,integer,boolean,boolean,boolean,text,text,jsonb,timestamp with time zone) TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_offline_farm_start_v484(p_user uuid, p_minutes integer, p_auto_sell boolean DEFAULT true, p_auto_buy boolean DEFAULT true, p_mine boolean DEFAULT true, p_npc_key text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE s record; c record; q record; v_npc record; v_map text; v_ammo text; v_id uuid; v_level integer;
BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'ONLY_SERVICE_ROLE'; END IF;
 IF p_minutes NOT IN (60,120,240) THEN RAISE EXCEPTION 'INVALID_DURATION'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,484));
 IF EXISTS(SELECT 1 FROM public.stellar_offline_farm_v484 WHERE user_id=p_user AND status='running') THEN RAISE EXCEPTION 'FARM_ALREADY_RUNNING'; END IF;
 SELECT state,updated_at INTO s FROM public.game_saves WHERE user_id=p_user FOR UPDATE;
 SELECT updated_at INTO c FROM public.profiles WHERE id=p_user FOR UPDATE;
 IF c.updated_at IS NULL THEN RAISE EXCEPTION 'FARM_PROFILE_MISSING'; END IF;
 IF s.state IS NULL OR s.state->'profile' IS NULL THEN RAISE EXCEPTION 'FARM_SAVE_MISSING'; END IF;
 v_map:=s.state->>'mapId'; v_ammo:=coalesce(nullif(s.state->>'selectedLaserAmmo',''),'lcb10');
 v_level:=greatest(1,least(50,coalesce((s.state#>>'{profile,level}')::integer,1)));
 IF v_map !~ '^x[1-8]$' OR coalesce(s.state->>'repairRequired','false') NOT IN ('false','null') THEN RAISE EXCEPTION 'FARM_MAP_OR_REPAIR_UNSUPPORTED'; END IF;
 IF v_level < (CASE v_map WHEN 'x1' THEN 1 WHEN 'x2' THEN 3 WHEN 'x3' THEN 5 WHEN 'x4' THEN 7 WHEN 'x5' THEN 9 WHEN 'x6' THEN 12 WHEN 'x7' THEN 15 WHEN 'x8' THEN 18 ELSE 99 END)
 THEN RAISE EXCEPTION 'FARM_LEVEL_INSUFFICIENT'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.stellar_autopilot_access_v48 a WHERE a.user_id=p_user AND a.enabled=true AND (a.expires_at IS NULL OR a.expires_at>now()))
   AND NOT EXISTS(SELECT 1 FROM public.game_admins WHERE user_id=p_user) THEN
   RAISE EXCEPTION 'FARM_ACCESS_REQUIRED';
 END IF;
 SELECT n.npc_key,n.hp,n.shield,n.credits,n.stl,n.xp,n.resources INTO v_npc
 FROM public.game_map_npc_spawns_v1811 m
 JOIN public.game_npc_config_v1811 n ON n.npc_key=m.npc_key
 WHERE m.map_id=v_map AND m.enabled=true AND n.enabled=true AND n.npc_key !~* '^(boss|rift|elite)' AND coalesce(m.spawn_count,0)>0 AND (p_npc_key IS NULL OR n.npc_key=p_npc_key)
 ORDER BY n.hp+n.shield ASC,n.npc_key ASC LIMIT 1;
 IF v_npc.npc_key IS NULL THEN RAISE EXCEPTION 'FARM_NO_ELIGIBLE_NPCS'; END IF;
 -- Munição apenas de crédito; STL/premium é consumido se houver estoque, nunca comprado aqui.
 SELECT catalog_key,price,currency,(meta#>>'{grant,qty}')::integer AS qty INTO q FROM public.live_shop_prices_v16
 WHERE kind='ammo' AND ref_id=v_ammo AND enabled=true AND shop_visible=true LIMIT 1;
 INSERT INTO public.stellar_offline_farm_v484(user_id,map_id,npc_key,ammo_key,minutes,auto_sell,auto_buy,mine,snapshot,baseline_save_at,ends_at)
 VALUES(p_user,v_map,v_npc.npc_key,v_ammo,p_minutes,coalesce(p_auto_sell,true),coalesce(p_auto_buy,true),coalesce(p_mine,true),
 jsonb_build_object('npc',to_jsonb(v_npc),'level',v_level,'profile_updated_at',c.updated_at,'shop',CASE WHEN q.catalog_key IS NOT NULL THEN to_jsonb(q) ELSE '{}'::jsonb END),s.updated_at,now()+make_interval(mins=>p_minutes))
 RETURNING id INTO v_id;
 RETURN jsonb_build_object('ok',true,'id',v_id,'status','running','map',v_map,'npc',v_npc.npc_key,'minutes',p_minutes,'ends_at',(SELECT ends_at FROM public.stellar_offline_farm_v484 WHERE id=v_id));
END $function$
;
GRANT EXECUTE ON FUNCTION public.stellar_offline_farm_start_v484(uuid,integer,boolean,boolean,boolean,text) TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_offline_farm_start_v485(p_user uuid, p_minutes integer, p_auto_sell boolean DEFAULT true, p_auto_buy boolean DEFAULT true, p_mine boolean DEFAULT true, p_npc_key text DEFAULT NULL::text, p_ammo_key text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE s record; c record; q record; cfg record; v_npc record; v_map text; v_ammo text; v_id uuid; v_level integer; v_factor numeric; v_damage numeric;
BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'ONLY_SERVICE_ROLE'; END IF;
 SELECT max_minutes,damage_percent,max_kills,travel_seconds INTO STRICT cfg FROM public.stellar_offline_farm_settings_v485 WHERE id=1;
 IF p_minutes < 30 OR p_minutes > cfg.max_minutes OR p_minutes % 30 <> 0 THEN RAISE EXCEPTION 'INVALID_DURATION'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,484));
 IF EXISTS(SELECT 1 FROM public.stellar_offline_farm_v484 WHERE user_id=p_user AND status='running') THEN RAISE EXCEPTION 'FARM_ALREADY_RUNNING'; END IF;
 SELECT state,updated_at INTO s FROM public.game_saves WHERE user_id=p_user FOR UPDATE;
 SELECT updated_at INTO c FROM public.profiles WHERE id=p_user FOR UPDATE;
 IF c.updated_at IS NULL THEN RAISE EXCEPTION 'FARM_PROFILE_MISSING'; END IF;
 IF s.state IS NULL OR s.state->'profile' IS NULL THEN RAISE EXCEPTION 'FARM_SAVE_MISSING'; END IF;
 v_map:=s.state->>'mapId'; v_ammo:=coalesce(nullif(p_ammo_key,''),nullif(s.state->>'selectedLaserAmmo',''),'lcb10');
 IF v_ammo NOT IN ('lcb10','mcb25','mcb50','ucb100') THEN RAISE EXCEPTION 'INVALID_AMMO'; END IF;
 v_level:=greatest(1,least(50,coalesce((s.state#>>'{profile,level}')::integer,1)));
 IF v_map !~ '^x[1-8]$' OR coalesce(s.state->>'repairRequired','false') NOT IN ('false','null') THEN RAISE EXCEPTION 'FARM_MAP_OR_REPAIR_UNSUPPORTED'; END IF;
 IF v_level < (CASE v_map WHEN 'x1' THEN 1 WHEN 'x2' THEN 3 WHEN 'x3' THEN 5 WHEN 'x4' THEN 7 WHEN 'x5' THEN 9 WHEN 'x6' THEN 12 WHEN 'x7' THEN 15 WHEN 'x8' THEN 18 ELSE 99 END)
 THEN RAISE EXCEPTION 'FARM_LEVEL_INSUFFICIENT'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.stellar_offline_farm_access_v488 a WHERE a.user_id=p_user AND a.enabled=true AND (a.expires_at IS NULL OR a.expires_at>now()) AND (a.max_minutes IS NULL OR p_minutes<=a.max_minutes))
   AND NOT EXISTS(SELECT 1 FROM public.game_admins WHERE user_id=p_user) THEN
   RAISE EXCEPTION 'FARM_ACCESS_REQUIRED';
 END IF;
 SELECT n.npc_key,n.hp,n.shield,n.credits,n.stl,n.xp,n.resources INTO v_npc
 FROM public.game_map_npc_spawns_v1811 m
 JOIN public.game_npc_config_v1811 n ON n.npc_key=m.npc_key
 WHERE m.map_id=v_map AND m.enabled=true AND n.enabled=true AND n.npc_key !~* '(boss|rift|elite|suprem|legend|lend|uber|ultra|titan)' AND n.name !~* '(boss|suprem|legend|lend|elite|uber|ultra)' AND coalesce(m.spawn_count,0)>0 AND (p_npc_key IS NULL OR n.npc_key=p_npc_key)
 ORDER BY n.hp+n.shield ASC,n.npc_key ASC LIMIT 1;
 IF v_npc.npc_key IS NULL THEN RAISE EXCEPTION 'FARM_NO_ELIGIBLE_NPCS'; END IF;
 -- Munição apenas de crédito; STL/premium é consumido se houver estoque, nunca comprado aqui.
 SELECT catalog_key,price,currency,(meta#>>'{grant,qty}')::integer AS qty INTO q FROM public.live_shop_prices_v16
 WHERE kind='ammo' AND ref_id=v_ammo AND enabled=true AND shop_visible=true LIMIT 1;
 IF q.catalog_key IS NULL THEN RAISE EXCEPTION 'FARM_AMMO_UNAVAILABLE'; END IF;
 v_factor:= CASE v_ammo WHEN 'lcb10' THEN 1 WHEN 'mcb25' THEN 2 WHEN 'mcb50' THEN 3 WHEN 'ucb100' THEN 4 ELSE 1 END;
 v_damage:=greatest(1,(175+v_level*80)*v_factor*cfg.damage_percent/100.0);
 INSERT INTO public.stellar_offline_farm_v484(user_id,map_id,npc_key,ammo_key,minutes,auto_sell,auto_buy,mine,snapshot,baseline_save_at,ends_at)
 VALUES(p_user,v_map,v_npc.npc_key,v_ammo,p_minutes,coalesce(p_auto_sell,true),coalesce(p_auto_buy,true),coalesce(p_mine,true),
 jsonb_build_object('npc',to_jsonb(v_npc),'level',v_level,'damage_per_shot',v_damage,'damage_per_second',round(v_damage/7,2),'max_kills',cfg.max_kills,'trip_seconds',cfg.travel_seconds,'damage_percent',cfg.damage_percent,'profile_updated_at',c.updated_at,'shop',CASE WHEN q.catalog_key IS NOT NULL THEN to_jsonb(q) ELSE '{}'::jsonb END),s.updated_at,now()+make_interval(mins=>p_minutes))
 RETURNING id INTO v_id;
 RETURN jsonb_build_object('ok',true,'id',v_id,'status','running','map',v_map,'npc',v_npc.npc_key,'minutes',p_minutes,'ammo',v_ammo,'damage_per_second',round(v_damage/7,2),'ends_at',(SELECT ends_at FROM public.stellar_offline_farm_v484 WHERE id=v_id));
END $function$
;
GRANT EXECUTE ON FUNCTION public.stellar_offline_farm_start_v485(uuid,integer,boolean,boolean,boolean,text,text) TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_offline_farm_start_v487(p_user uuid, p_minutes integer, p_auto_sell boolean, p_auto_buy boolean, p_mine boolean, p_npc_key text, p_ammo_key text, p_combat jsonb, p_baseline_save_at timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE r jsonb; f record; n record; v_volley integer; v_shots integer; v_lasers integer;
 v_hp numeric; v_accuracy numeric; v_damage numeric; v_interval numeric;
BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'ONLY_SERVICE_ROLE'; END IF;
 IF coalesce(p_combat->>'combat_model','') <> 'v487' THEN RAISE EXCEPTION 'FARM_COMBAT_MODEL_REQUIRED'; END IF;
 v_lasers:=(p_combat->>'laser_count')::integer;
 v_accuracy:=(p_combat->>'hit_chance')::numeric;
 v_damage:=(p_combat->>'damage_per_volley')::numeric;
 v_interval:=(p_combat->>'fire_interval_ms')::numeric;
 IF v_lasers NOT BETWEEN 1 AND 64 OR v_accuracy NOT BETWEEN 0.5 AND 1
  OR v_damage NOT BETWEEN 1 AND 2000000 OR v_interval<>420
  OR (p_combat->>'move_between_seconds')::integer NOT BETWEEN 3 AND 45
  OR (p_combat->>'cargo_capacity')::integer NOT BETWEEN 100 AND 15000 THEN
  RAISE EXCEPTION 'FARM_COMBAT_INVALID'; END IF;
 r:=public.stellar_offline_farm_start_v485(p_user,p_minutes,p_auto_sell,p_auto_buy,p_mine,p_npc_key,p_ammo_key);
 SELECT * INTO f FROM public.stellar_offline_farm_v484 WHERE id=(r->>'id')::uuid FOR UPDATE;
 IF f.id IS NULL OR f.baseline_save_at IS DISTINCT FROM p_baseline_save_at THEN
  RAISE EXCEPTION 'FARM_SAVE_CHANGED_DURING_START';
 END IF;
 -- Respeitar o controle ADM congelado por sessao, sem alteracoes retroativas.
 v_damage:=greatest(1,least(2000000,round(v_damage*coalesce((f.snapshot->>'damage_percent')::numeric,100)/100)));
 SELECT name,damage INTO n FROM public.game_npc_config_v1811 WHERE npc_key=f.npc_key AND enabled=true;
 v_hp:=coalesce((f.snapshot#>>'{npc,hp}')::numeric,0)+coalesce((f.snapshot#>>'{npc,shield}')::numeric,0);
 IF v_hp<=0 THEN RAISE EXCEPTION 'FARM_NPC_INVALID'; END IF;
 v_volley:=ceil(v_hp/greatest(1,v_damage * v_accuracy * (1 + least(0.3,greatest(0,coalesce((p_combat->>'shield_pressure')::numeric,0))) * coalesce((f.snapshot#>>'{npc,shield}')::numeric,0)/v_hp)))::integer;
 IF v_volley>50000 THEN RAISE EXCEPTION 'FARM_TARGET_TOO_TOUGH'; END IF;
 v_volley:=greatest(1,v_volley);
 v_shots:=v_volley*v_lasers;
 IF v_shots>320000 THEN RAISE EXCEPTION 'FARM_TARGET_TOO_TOUGH'; END IF;
 UPDATE public.stellar_offline_farm_v484 SET snapshot= snapshot || p_combat ||
 jsonb_build_object('npc_name',n.name,'damage_per_volley',v_damage,'ammo_per_kill',v_shots,'combat_kill_seconds',
   greatest(1,least(30000,ceil(v_volley*.42)::integer + (p_combat->>'move_between_seconds')::integer)),
   'enemy_damage',coalesce(n.damage,0),'damage_per_second',round(v_damage*v_accuracy/.42,2))
 WHERE id=f.id;
 RETURN r || jsonb_build_object('npc_name',n.name,'laser_count',v_lasers,'damage_per_second',round(v_damage*v_accuracy/.42,2));
END $function$
;
GRANT EXECUTE ON FUNCTION public.stellar_offline_farm_start_v487(uuid,integer,boolean,boolean,boolean,text,text,jsonb,timestamp with time zone) TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_offline_farm_start_v49(p_user uuid, p_minutes integer, p_auto_sell boolean, p_auto_buy boolean, p_mine boolean, p_npc_key text, p_ammo_key text, p_combat jsonb, p_baseline_save_at timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE r jsonb; cfg record; v_limit bigint;
BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'ONLY_SERVICE_ROLE'; END IF;
 SELECT max_sale_credits INTO STRICT cfg FROM public.stellar_offline_farm_settings_v485 WHERE id=1;
 r:=public.stellar_offline_farm_start_v487(p_user,p_minutes,p_auto_sell,p_auto_buy,p_mine,p_npc_key,p_ammo_key,p_combat,p_baseline_save_at);
 v_limit:=least(1000000000000, greatest(0,cfg.max_sale_credits) * ceil(p_minutes / 60.0)::bigint);
 UPDATE public.stellar_offline_farm_v484 SET snapshot=snapshot || jsonb_build_object('economic_model','v49','max_sale_credits',v_limit)
 WHERE id=(r->>'id')::uuid AND user_id=p_user;
 RETURN r || jsonb_build_object('economic_model','v49','max_sale_credits',v_limit);
END $function$
;
GRANT EXECUTE ON FUNCTION public.stellar_offline_farm_start_v49(uuid,integer,boolean,boolean,boolean,text,text,jsonb,timestamp with time zone) TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_settle_auction_bid_v1182(p_user_id uuid, p_hour_key text, p_lot_ref text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
 v_bid public.auction_bids%rowtype;
 v_winner public.auction_bids%rowtype;
 v_catalog public.live_shop_prices_v16%rowtype;
 v_existing public.stellar_auction_settlements_v1182%rowtype;
 v_state jsonb;
 v_id text;
 v_prefix text;
 v_catalog_key text;
 v_grant jsonb;
 v_kind text;
 v_count int;
 v_qty int;
 v_slots int;
 v_credits bigint;
 v_available bigint;
 v_label text;
 v_callsign text;
 v_new_drone_id text;
 v_history jsonb;
 v_now timestamptz:=clock_timestamp();
 v_result jsonb;
begin
 if p_user_id is null or p_hour_key !~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{2}$'
   or p_lot_ref !~ '^(item|ship|ammo|rocket|petGear):[a-zA-Z0-9_]+$'
 then raise exception 'AUCTION_REQUEST_INVALID'; end if;
 if p_hour_key >= to_char(v_now at time zone 'America/Sao_Paulo','YYYY-MM-DD-HH24')
 then return jsonb_build_object('ok',false,'code','AUCTION_STILL_ACTIVE','message','Este leilão ainda está em andamento.');end if;
 perform pg_advisory_xact_lock(hashtextextended(p_hour_key||'|'||p_lot_ref,1182));
 select * into v_bid from public.auction_bids
 where user_id=p_user_id and hour_key=p_hour_key and lot_ref=p_lot_ref for update;
 if not found then return jsonb_build_object('ok',false,'code','AUCTION_BID_NOT_FOUND','message','Este lance não foi encontrado.');end if;
 select * into v_existing from public.stellar_auction_settlements_v1182 where bid_id=v_bid.id;
 if found then
    select state into v_state from public.game_saves where user_id=p_user_id;
    return jsonb_build_object('ok',true,'replayed',true,'code','AUCTION_ALREADY_SETTLED',
       'receipt',jsonb_build_object('bid_id',v_bid.id,'paid_credits',v_existing.paid_credits,'grant',v_existing.award),
       'state',v_state);
 end if;
 if v_bid.status='won' then
   return jsonb_build_object('ok',false,'code','AUCTION_LEGACY_REVIEW',
     'message','Lance antigo marcado como vencedor. A entrega precisa ser conferida sem cobrança duplicada.');
 end if;
 if v_bid.status not in ('active','lost') then
   return jsonb_build_object('ok',false,'code','AUCTION_NOT_ACTIVE','message','Este lance já foi encerrado.');
 end if;
 select * into v_winner from public.auction_bids
 where hour_key=p_hour_key and lot_ref=p_lot_ref and status in ('active','won')
 order by user_bid desc, updated_at asc, id asc limit 1;
 if v_winner.id is distinct from v_bid.id then
   update public.auction_bids set status='lost',updated_at=v_now where id=v_bid.id and status='active';
   return jsonb_build_object('ok',false,'code','AUCTION_OUTBID','message','Outro piloto venceu este lote. Nenhum valor foi descontado.');
 end if;
 if v_bid.status<>'active' or v_bid.user_bid is null or v_bid.user_bid<=0 then
   return jsonb_build_object('ok',false,'code','AUCTION_INVALID_BID','message','Lance inválido; não foi cobrado.');
 end if;
 v_prefix:=split_part(p_lot_ref,':',1);v_id:=split_part(p_lot_ref,':',2);
 v_catalog_key:=case when v_prefix='item' and v_id in ('iris','flax') then 'drone:'||v_id
                     when v_prefix='petGear' then 'pet_gear:'||v_id
                     else p_lot_ref end;
 select * into v_catalog from public.live_shop_prices_v16 where catalog_key=v_catalog_key;
 if not found or v_catalog.enabled is false then
   return jsonb_build_object('ok',false,'code','AUCTION_CATALOG_UNAVAILABLE','message','Produto indisponível no catálogo oficial. O lance permanece guardado.');
 end if;
 v_grant:=v_catalog.meta->'grant'; v_kind:=v_grant->>'kind';
 if v_grant is null or v_grant->>'id' is distinct from v_id or
   ((v_prefix='ship' and v_kind<>'ship') or
    (v_prefix='item' and v_id in ('iris','flax') and v_kind<>'drone') or
    (v_prefix='item' and v_id not in ('iris','flax') and v_kind<>'inventory') or
    (v_prefix='ammo' and v_kind<>'ammo') or
    (v_prefix='rocket' and v_kind<>'rocket') or
    (v_prefix='petGear' and v_kind<>'pet_gear'))
 then raise exception 'AUCTION_CATALOG_MISMATCH';end if;
 if v_bid.user_bid < public.auction_minimum_floor_v1916(p_lot_ref)
 then return jsonb_build_object('ok',false,'code','AUCTION_BELOW_FLOOR','message','Lance abaixo do preço mínimo confirmado.');end if;
 if v_bid.lot->>'ref' is distinct from p_lot_ref or v_bid.lot->>'id' is distinct from v_id
 then raise exception 'AUCTION_LOT_MISMATCH';end if;
 select g.state,p.callsign into v_state,v_callsign from public.game_saves g
 join public.profiles p on p.id=g.user_id where g.user_id=p_user_id for update of g,p;
 if v_state is null or v_state->>'accountOwnerId' is distinct from p_user_id::text
 then raise exception 'AUCTION_SAVE_OWNER_INVALID';end if;
 v_credits:=coalesce((v_state#>>'{profile,credits}')::bigint,0);
 if v_credits < v_bid.user_bid then
   return jsonb_build_object('ok',false,'code','AUCTION_INSUFFICIENT_CREDITS',
      'message','Créditos insuficientes para pagar o lance vencedor. Nenhuma cobrança feita.');
 end if;
 v_qty:=coalesce((v_grant->>'qty')::int,1);
 if v_qty<1 or v_qty>1000000 then raise exception 'AUCTION_GRANT_QTY_INVALID';end if;
 if v_prefix in ('ammo','rocket') and coalesce((v_bid.lot->>'qty')::int,0)<>v_qty
 then raise exception 'AUCTION_LOT_QTY_MISMATCH';end if;
 if v_kind='drone' then
   v_count:=jsonb_array_length(coalesce(v_state->'drones','[]'::jsonb));
   if v_count>=8 then return jsonb_build_object('ok',false,'code','AUCTION_FLEET_FULL',
      'message','Sua frota está completa. Libere uma vaga para receber o drone vencedor.');end if;
   v_slots:=greatest(1,least(10,coalesce((v_grant->>'slots')::int,1)));
   v_new_drone_id:='d_auc_'||(extract(epoch from v_now)*1000)::bigint||'_'||substr(md5(v_bid.id::text||p_user_id::text),1,6);
   v_state:=jsonb_set(v_state,'{drones}',coalesce(v_state->'drones','[]'::jsonb)||
      jsonb_build_array(jsonb_build_object('id',v_new_drone_id,'type',v_id,
      'slots',(select jsonb_agg(null::text) from generate_series(1,v_slots)))),true);
 elsif v_kind='ship' then
   if coalesce(v_state->'ownedShips','[]'::jsonb) ? v_id then
      return jsonb_build_object('ok',false,'code','AUCTION_ALREADY_OWNED','message','Nave já adquirida. O lance precisa de revisão.');end if;
   v_state:=jsonb_set(v_state,'{ownedShips}',coalesce(v_state->'ownedShips','[]'::jsonb)||to_jsonb(v_id),true);
 elsif v_kind='inventory' then
   if v_catalog.kind='extra' and (coalesce((v_state->'inventory'->>v_id)::int,0)>0 or
     coalesce(v_state#>'{shipLoadout,extras}','[]'::jsonb) ? v_id) then
      return jsonb_build_object('ok',false,'code','AUCTION_ALREADY_OWNED','message','Extra já adquirido. Nenhuma cobrança efetuada.');end if;
   v_state:=jsonb_set(v_state,array['inventory',v_id],to_jsonb(coalesce((v_state->'inventory'->>v_id)::int,0)+v_qty),true);
 elsif v_kind in ('ammo','rocket') then
   v_available:=coalesce((v_state->(case when v_kind='ammo' then 'ammo' else 'rockets' end)->>v_id)::bigint,0);
   if v_available+v_qty>1000000000 then raise exception 'AUCTION_STOCK_OVERFLOW';end if;
   v_state:=jsonb_set(v_state,array[case when v_kind='ammo' then 'ammo' else 'rockets' end,v_id],to_jsonb(v_available+v_qty),true);
 elsif v_kind='pet_gear' then
   if coalesce((v_state#>>'{pet,owned}')::boolean,false) is false then
      return jsonb_build_object('ok',false,'code','AUCTION_PET_REQUIRED','message','Você precisa possuir o AUX-9 para receber este módulo.');end if;
   if coalesce((v_state#>>array['pet','gearsOwned',v_id])::boolean,false) then
      return jsonb_build_object('ok',false,'code','AUCTION_ALREADY_OWNED','message','Módulo AUX já adquirido.');end if;
   v_state:=jsonb_set(v_state,array['pet','gearsOwned',v_id],'true'::jsonb,true);
 else raise exception 'AUCTION_GRANT_UNSUPPORTED';end if;
 v_state:=jsonb_set(v_state,'{profile,credits}',to_jsonb(v_credits-v_bid.user_bid),true);
 v_state:=jsonb_set(v_state,'{serverPurchaseRevision}',
    to_jsonb(coalesce((v_state->>'serverPurchaseRevision')::bigint,0)+1),true);
 v_label:=coalesce(nullif(v_bid.lot->>'name',''),v_catalog.display_name,v_id);
 v_history:=jsonb_build_array(jsonb_build_object('at',(extract(epoch from v_now)*1000)::bigint,
    'bid',v_bid.user_bid,'name',v_label,'result','VENCEU')) || coalesce(v_state#>'{auction,history}','[]'::jsonb);
 select coalesce(jsonb_agg(value order by rn),'[]'::jsonb) into v_history
 from jsonb_array_elements(v_history) with ordinality as x(value,rn) where rn<=12;
 v_state:=jsonb_set(v_state,'{auction,history}',v_history,true);
 v_result:=public.stellar_commit_player_save_v118(p_user_id,v_state,v_now,v_callsign);
 if v_result->>'ok'<>'true' then raise exception 'AUCTION_SAVE_NOT_CONFIRMED';end if;
 insert into public.stellar_auction_settlements_v1182
 (bid_id,user_id,hour_key,lot_ref,paid_credits,award,save_hash)
 values(v_bid.id,p_user_id,p_hour_key,p_lot_ref,v_bid.user_bid,
    jsonb_build_object('kind',v_kind,'id',v_id,'qty',v_qty,'drone_id',v_new_drone_id),md5(v_state::text));
 update public.auction_bids set status='won',updated_at=v_now where id=v_bid.id and status='active';
 if not found then raise exception 'AUCTION_STATUS_RACE';end if;
 return jsonb_build_object('ok',true,'replayed',false,'state',v_state,'receipt',
    jsonb_build_object('bid_id',v_bid.id,'paid_credits',v_bid.user_bid,'product',v_label,
     'grant',jsonb_build_object('kind',v_kind,'id',v_id,'qty',v_qty,'drone_id',v_new_drone_id)));
end;
$function$
;
GRANT EXECUTE ON FUNCTION public.stellar_settle_auction_bid_v1182(uuid,text,text) TO service_role;
CREATE OR REPLACE FUNCTION public.stellar_u426_market_buy(p_offer uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE u uuid:=auth.uid(); o public.stellar_u426_market_offers%ROWTYPE; rules record;
 buyer_state jsonb; seller_state jsonb; buyer_cash bigint; seller_cash bigint;
 total bigint; fee bigint; net bigint;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT * INTO o FROM public.stellar_u426_market_offers WHERE id=p_offer FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'OFFER_MISSING'; END IF;
 IF o.status='sold' AND o.buyer=u THEN RETURN jsonb_build_object('ok',true,'alreadyPurchased',true); END IF;
 IF o.status<>'open' OR o.seller=u THEN RAISE EXCEPTION 'OFFER_NOT_AVAILABLE'; END IF;
 SELECT * INTO rules FROM public.stellar_u426_market_rules WHERE id=1;
 IF NOT rules.enabled THEN RAISE EXCEPTION 'MARKET_PAUSED'; END IF;
 -- Stable UUID ordering prevents buyer/seller concurrent purchases deadlocking wallets.
 PERFORM 1 FROM public.game_saves WHERE user_id IN (u,o.seller) ORDER BY user_id FOR UPDATE;
 SELECT state INTO buyer_state FROM public.game_saves WHERE user_id=u;
 SELECT state INTO seller_state FROM public.game_saves WHERE user_id=o.seller;
 IF buyer_state IS NULL OR seller_state IS NULL THEN RAISE EXCEPTION 'SAVE_MISSING'; END IF;
 buyer_cash:=coalesce((buyer_state#>>'{profile,credits}')::bigint,0);
 seller_cash:=coalesce((seller_state#>>'{profile,credits}')::bigint,0);
 total:=o.unit_price*o.quantity;
 fee:=(total*rules.fee_bps+9999)/10000;
 net:=total-fee;
 IF buyer_cash<total THEN RAISE EXCEPTION 'CREDITS_INSUFFICIENT'; END IF;
 IF seller_cash>9000000000000000-net THEN RAISE EXCEPTION 'SELLER_WALLET_CAP'; END IF;
 UPDATE public.game_saves SET state=jsonb_set(jsonb_set(state,'{profile,credits}',to_jsonb(buyer_cash-total),true),
 '{serverPurchaseRevision}',to_jsonb(coalesce((state->>'serverPurchaseRevision')::bigint,0)+1),true),updated_at=now() WHERE user_id=u;
 UPDATE public.game_saves SET state=jsonb_set(jsonb_set(state,'{profile,credits}',to_jsonb(seller_cash+net),true),
 '{serverPurchaseRevision}',to_jsonb(coalesce((state->>'serverPurchaseRevision')::bigint,0)+1),true),updated_at=now() WHERE user_id=o.seller;
 UPDATE public.profiles SET credits=buyer_cash-total,updated_at=now() WHERE id=u;
 UPDATE public.profiles SET credits=seller_cash+net,updated_at=now() WHERE id=o.seller;
 INSERT INTO public.stellar_u42_inventory(user_id,item,quantity) VALUES(u,o.item,o.quantity)
 ON CONFLICT(user_id,item) DO UPDATE SET quantity=public.stellar_u42_inventory.quantity+excluded.quantity;
 UPDATE public.stellar_u426_market_offers SET status='sold',buyer=u,fee_credits=fee,closed_at=now() WHERE id=o.id;
 RETURN jsonb_build_object('ok',true,'item',o.item,'quantity',o.quantity,'paid',total,'fee',fee);
END;$function$
;
GRANT EXECUTE ON FUNCTION public.stellar_u426_market_buy(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.stellar_u42_action(p_action text, p_code text, p_quantity integer, p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE u uuid:=auth.uid(); s jsonb; cfg jsonb; kind text; f text;
 v_mat record; res_name text; have bigint; debit bigint; issued bigint; spent bigint; cargo jsonb; prof jsonb;
 exp_row public.stellar_u42_expeditions%ROWTYPE; prior jsonb; outcome jsonb;
 cost bigint; revision bigint; research_award integer;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'SESSION_REQUIRED' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR p_action NOT IN ('forge','expedition_start','expedition_claim','donate')
 OR p_quantity NOT BETWEEN 1 AND 100 OR p_code !~ '^[a-z0-9_]{2,48}$' THEN RAISE EXCEPTION 'ACTION_INVALID'; END IF;
 SELECT state INTO s FROM public.game_saves WHERE user_id=u FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'SAVE_MISSING'; END IF;
 SELECT result INTO prior FROM public.stellar_u42_actions WHERE user_id=u AND request_id=p_request_id;
 IF FOUND THEN RETURN prior; END IF;
 SELECT c.rule,c.kind INTO cfg,kind FROM public.stellar_u42_catalog c WHERE c.code=p_code;
 IF NOT FOUND THEN RAISE EXCEPTION 'CATALOG_MISSING'; END IF;
 prof:=coalesce(s->'profile','{}'::jsonb);
 cargo:=coalesce(s->'cargo','{}'::jsonb);
 IF p_action='forge' THEN
  IF kind<>'forge' OR p_quantity>5 THEN RAISE EXCEPTION 'FORGE_INVALID'; END IF;
  FOR v_mat IN SELECT key,value FROM jsonb_each_text(cfg->'cost') LOOP
   debit:=v_mat.value::bigint*p_quantity;
   have:=coalesce((cargo->>v_mat.key)::bigint,0);
   -- Não confiar no cargo isoladamente: somente materiais creditados no ledger Astral V38.1.
   SELECT coalesce(sum((l.quote->>'resourceQty')::bigint),0) INTO issued
     FROM public.stellar_astral_ledger_v381 l WHERE l.user_id=u AND l.quote->>'resource'=v_mat.key;
   SELECT coalesce(sum(t.quantity),0) INTO spent FROM public.stellar_u42_material_spends t
     WHERE t.user_id=u AND t.material=v_mat.key;
   IF have<debit OR issued-spent<debit THEN RAISE EXCEPTION 'MATERIAL_NOT_VERIFIED: %',v_mat.key; END IF;
   cargo:=jsonb_set(cargo,ARRAY[v_mat.key],to_jsonb(have-debit),true);
   IF debit>0 THEN INSERT INTO public.stellar_u42_material_spends(user_id,request_id,material,quantity)
      VALUES(u,p_request_id,v_mat.key,debit); END IF;
  END LOOP;
  INSERT INTO public.stellar_u42_inventory(user_id,item,quantity) VALUES(u,p_code,p_quantity)
  ON CONFLICT(user_id,item) DO UPDATE SET quantity=public.stellar_u42_inventory.quantity+excluded.quantity;
  outcome:=jsonb_build_object('ok',true,'action',p_action,'code',p_code,'quantity',p_quantity,
   'notice','Protótipo criado no inventário de pesquisa. Bônus de combate ainda não ativados.');
 ELSIF p_action='expedition_start' THEN
  IF kind<>'expedition' OR p_quantity<>1 THEN RAISE EXCEPTION 'EXPEDITION_INVALID'; END IF;
  IF EXISTS(SELECT 1 FROM public.stellar_u42_expeditions WHERE user_id=u AND claimed_at IS NULL) THEN
   RAISE EXCEPTION 'EXPEDITION_ALREADY_RUNNING'; END IF;
  cost:=(cfg->>'credits')::bigint;
  have:=coalesce((prof->>'credits')::bigint,0);
  IF have<cost THEN RAISE EXCEPTION 'CREDITS_INSUFFICIENT'; END IF;
  prof:=jsonb_set(prof,'{credits}',to_jsonb(have-cost),true);
  INSERT INTO public.stellar_u42_expeditions(user_id,code,ready_at,reward_points)
  VALUES(u,p_code,now()+make_interval(mins=>(cfg->>'minutes')::integer),(cfg->>'research')::integer)
  RETURNING * INTO exp_row;
  UPDATE public.profiles SET credits=have-cost,updated_at=now() WHERE id=u;
  outcome:=jsonb_build_object('ok',true,'action',p_action,'readyAt',exp_row.ready_at,'expeditionId',exp_row.id);
 ELSIF p_action='expedition_claim' THEN
  IF kind<>'expedition' OR p_quantity<>1 THEN RAISE EXCEPTION 'EXPEDITION_INVALID'; END IF;
  SELECT * INTO exp_row FROM public.stellar_u42_expeditions
  WHERE user_id=u AND code=p_code AND claimed_at IS NULL ORDER BY started_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'EXPEDITION_MISSING'; END IF;
  IF exp_row.ready_at>now() THEN RAISE EXCEPTION 'EXPEDITION_NOT_READY'; END IF;
  UPDATE public.stellar_u42_expeditions SET claimed_at=now() WHERE id=exp_row.id;
  research_award:=exp_row.reward_points;
  INSERT INTO public.stellar_u42_research(user_id,points) VALUES(u,research_award)
   ON CONFLICT(user_id) DO UPDATE SET points=public.stellar_u42_research.points+excluded.points,updated_at=now();
  outcome:=jsonb_build_object('ok',true,'action',p_action,'researchPoints',research_award);
 ELSIF p_action='donate' THEN
  IF kind<>'project' THEN RAISE EXCEPTION 'PROJECT_INVALID'; END IF;
  SELECT faction INTO f FROM public.profiles WHERE id=u;
  IF f IS NULL OR length(f)<2 THEN RAISE EXCEPTION 'FACTION_MISSING'; END IF;
  res_name:=cfg->>'resource';
  have:=coalesce((cargo->>res_name)::bigint,0);
  debit:=(cfg->>'perPoint')::bigint*p_quantity;
  SELECT coalesce(sum((l.quote->>'resourceQty')::bigint),0) INTO issued
    FROM public.stellar_astral_ledger_v381 l WHERE l.user_id=u AND l.quote->>'resource'=res_name;
  SELECT coalesce(sum(t.quantity),0) INTO spent FROM public.stellar_u42_material_spends t
    WHERE t.user_id=u AND t.material=res_name;
  IF have<debit OR issued-spent<debit THEN RAISE EXCEPTION 'MATERIAL_NOT_VERIFIED: %',res_name; END IF;
  cargo:=jsonb_set(cargo,ARRAY[res_name],to_jsonb(have-debit),true);
  INSERT INTO public.stellar_u42_material_spends(user_id,request_id,material,quantity)
    VALUES(u,p_request_id,res_name,debit);
  INSERT INTO public.stellar_u42_donations(user_id,faction,project_code,quantity) VALUES(u,f,p_code,p_quantity);
  outcome:=jsonb_build_object('ok',true,'action',p_action,'project',p_code,'contribution',p_quantity);
 END IF;
 IF p_action IN ('forge','donate','expedition_start') THEN
  revision:=coalesce((s->>'serverPurchaseRevision')::bigint,0)+1;
  s:=jsonb_set(s,'{serverPurchaseRevision}',to_jsonb(revision),true);
  s:=jsonb_set(s,'{cargo}',cargo,true);
  s:=jsonb_set(s,'{profile}',prof,true);
  UPDATE public.game_saves SET state=s,updated_at=now() WHERE user_id=u;
 END IF;
 INSERT INTO public.stellar_u42_actions(user_id,request_id,action,result) VALUES(u,p_request_id,p_action,outcome);
 RETURN outcome;
END;$function$
;
GRANT EXECUTE ON FUNCTION public.stellar_u42_action(text,text,integer,uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.test_purchase_premium_v12(p_product_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_uid uuid:=auth.uid(); v_admin boolean:=false; v_product public.premium_catalog_v12%rowtype;
  v_state jsonb; v_inv jsonb; v_have integer:=0; v_until timestamptz;
  v_season text; v_pass_price numeric; v_effective_price numeric;
  v_days integer:=30; v_level integer:=1;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  select exists(select 1 from public.game_admins ga where ga.user_id=v_uid and lower(coalesce(ga.role,''))='admin') into v_admin;
  if not v_admin then raise exception 'Compras reais ainda não foram liberadas. A Loja Premium está em modo de visualização.'; end if;
  select greatest(coalesce(level,1),1) into v_level from public.profiles where id=v_uid;
  v_level:=coalesce(v_level,1);

  select * into v_product from public.premium_catalog_v12 where id=p_product_id and active;
  if not found then raise exception 'Produto Premium inválido.'; end if;
  if v_level<v_product.min_level then raise exception 'Nível insuficiente para este produto Premium.'; end if;

  if v_product.category='battle_pass' then
    select season_key,premium_price_brl into v_season,v_pass_price
    from public.game_battle_pass_seasons_v1817b
    where enabled and now()>=starts_at and now()<ends_at order by starts_at desc limit 1;
    if v_season is null then raise exception 'Nenhuma temporada do Passe está ativa.'; end if;
    v_effective_price:=v_pass_price;
  else
    v_effective_price:=v_product.price_brl;
  end if;

  insert into public.premium_purchases_v12(user_id,product_id,price_brl,test_purchase)
  values(v_uid,v_product.id,v_effective_price,true);
  insert into public.premium_accounts_v12(user_id) values(v_uid) on conflict(user_id) do nothing;

  if v_product.category='premium' then
    v_days:=greatest(1,least(3650,coalesce((v_product.meta->>'days')::integer,30)));
    update public.premium_accounts_v12
    set premium_until=greatest(coalesce(premium_until,now()),now())+make_interval(days=>v_days),updated_at=now()
    where user_id=v_uid returning premium_until into v_until;
    return jsonb_build_object('ok',true,'product_id',v_product.id,'category',v_product.category,'premium_until',v_until,'days',v_days,'price_brl',v_effective_price);
  elsif v_product.category='battle_pass' then
    update public.premium_accounts_v12 set battle_pass_season=v_season,updated_at=now() where user_id=v_uid;
    return jsonb_build_object('ok',true,'product_id',v_product.id,'category',v_product.category,'battle_pass_season',v_season,'price_brl',v_effective_price);
  else
    select state into v_state from public.game_saves where user_id=v_uid for update;
    if v_state is null then raise exception 'Entre no jogo e salve seu progresso antes de testar compra de item.'; end if;
    v_inv:=case when jsonb_typeof(v_state->'inventory')='object' then v_state->'inventory' else '{}'::jsonb end;
    v_have:=coalesce((v_inv->>v_product.item_id)::integer,0);
    v_inv:=jsonb_set(v_inv,array[v_product.item_id],to_jsonb(v_have+v_product.quantity),true);
    v_state:=jsonb_set(v_state,'{inventory}',v_inv,true);
    update public.game_saves set state=v_state,updated_at=now() where user_id=v_uid;
    return jsonb_build_object('ok',true,'product_id',v_product.id,'category',v_product.category,'item_id',v_product.item_id,
      'quantity',v_product.quantity,'new_quantity',v_have+v_product.quantity,'price_brl',v_effective_price);
  end if;
end;
$function$
;
GRANT EXECUTE ON FUNCTION public.test_purchase_premium_v12(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.test_purchase_premium_v12(text) TO service_role;
GRANT INSERT,UPDATE,DELETE ON public.auction_bids TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
