-- STELLAR LEGACY V119.1 -- adaptacao da captura do Save Unico.
-- ETAPA PREPARAR: NAO ativa triggers, NAO altera game_saves, NAO paga recompensas.
-- Objetivo: um so estado canonico (game_saves), uma revisao por alteracao,
-- e backups A/B/C AMOSTRADOS (nao duplicar JSON completo a cada NPC).
-- Os ledgers especificos continuam contendo recibos/recompensas auditaveis.

ALTER TABLE public.stellar_player_save_head_v119
  ADD COLUMN IF NOT EXISTS checkpointed_at timestamptz,
  ADD COLUMN IF NOT EXISTS journaled_at timestamptz;

UPDATE public.stellar_player_save_head_v119 h
SET checkpointed_at=coalesce(h.checkpointed_at,c.captured_at),
    journaled_at=coalesce(h.journaled_at,h.changed_at)
FROM public.stellar_player_save_checkpoint_v119 c
WHERE c.user_id=h.user_id AND c.slot='A'
  AND (h.checkpointed_at IS NULL OR h.journaled_at IS NULL);

CREATE OR REPLACE FUNCTION public.stellar_capture_canonical_save_v119()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,pg_temp AS $capture$
DECLARE
  v_now timestamptz:=clock_timestamp();
  v_hash text;
  v_before text;
  v_rev bigint;
  v_last_checkpoint timestamptz;
  v_last_journal timestamptz;
  v_prev public.stellar_player_save_checkpoint_v119%rowtype;
  v_backup_b public.stellar_player_save_checkpoint_v119%rowtype;
  v_important boolean:=false;
  v_combat boolean:=false;
  v_modules text[]:=ARRAY[]::text[];
  v_capture boolean;
  v_log boolean;
BEGIN
  -- Nunca rejeita o save canonico se a carga for apenas metadado identico.
  IF TG_OP='UPDATE' AND NEW.state IS NOT DISTINCT FROM OLD.state THEN
    RETURN NULL;
  END IF;
  v_hash:=md5(NEW.state::text);
  v_before:=CASE WHEN TG_OP='UPDATE' THEN md5(OLD.state::text) ELSE NULL END;

  IF TG_OP='INSERT' THEN
    v_modules:=ARRAY['criacao']::text[];v_important:=true;
  ELSE
    v_combat:=NEW.state->'serverNpcRewardRevision' IS DISTINCT FROM OLD.state->'serverNpcRewardRevision'
      OR NEW.state->'serverOreRevision' IS DISTINCT FROM OLD.state->'serverOreRevision';
    IF NEW.state->'drones' IS DISTINCT FROM OLD.state->'drones'
      OR NEW.state->'shipLoadout' IS DISTINCT FROM OLD.state->'shipLoadout'
      OR NEW.state->'combatConfigsV2013' IS DISTINCT FROM OLD.state->'combatConfigsV2013'
      OR NEW.state#>'{pet,lasers}' IS DISTINCT FROM OLD.state#>'{pet,lasers}'
      OR NEW.state#>'{pet,shields}' IS DISTINCT FROM OLD.state#>'{pet,shields}'
      OR NEW.state#>'{pet,gearsOwned}' IS DISTINCT FROM OLD.state#>'{pet,gearsOwned}'
      OR NEW.state#>'{pet,activeGear}' IS DISTINCT FROM OLD.state#>'{pet,activeGear}'
      OR NEW.state#>'{pet,protocols}' IS DISTINCT FROM OLD.state#>'{pet,protocols}'
      OR NEW.state#>'{pet,advancedProtocolEquippedV110}' IS DISTINCT FROM OLD.state#>'{pet,advancedProtocolEquippedV110}'
      OR (NEW.state->'inventory' IS DISTINCT FROM OLD.state->'inventory' AND NOT v_combat)
    THEN
      v_modules:=array_append(v_modules,'hangar');v_important:=true;
    END IF;
    IF NEW.state->'missions' IS DISTINCT FROM OLD.state->'missions'
      OR NEW.state->'battlePass' IS DISTINCT FROM OLD.state->'battlePass'
      OR NEW.state->'levelRewards' IS DISTINCT FROM OLD.state->'levelRewards'
    THEN
      v_modules:=array_append(v_modules,'missoes');
      -- Progresso por tiro/abate nao gera checkpoint completo a cada evento.
      IF NEW.state#>'{missions,completed}' IS DISTINCT FROM OLD.state#>'{missions,completed}'
         OR NEW.state#>'{battlePass,claimedTiers}' IS DISTINCT FROM OLD.state#>'{battlePass,claimedTiers}'
         OR NEW.state#>'{battlePass,premiumClaimedTiers}' IS DISTINCT FROM OLD.state#>'{battlePass,premiumClaimedTiers}'
         OR NEW.state->'levelRewards' IS DISTINCT FROM OLD.state->'levelRewards'
      THEN v_important:=true; END IF;
    END IF;
    IF NEW.state->'auction' IS DISTINCT FROM OLD.state->'auction' THEN
      v_modules:=array_append(v_modules,'leilao');v_important:=true;
    END IF;
    IF NEW.state->'serverPurchaseRevision' IS DISTINCT FROM OLD.state->'serverPurchaseRevision'
      OR (NOT v_combat AND (
        NEW.state#>>'{profile,credits}' IS DISTINCT FROM OLD.state#>>'{profile,credits}'
        OR NEW.state#>>'{profile,uridium}' IS DISTINCT FROM OLD.state#>>'{profile,uridium}'
        OR NEW.state->'ammo' IS DISTINCT FROM OLD.state->'ammo'
        OR NEW.state->'rockets' IS DISTINCT FROM OLD.state->'rockets'
        OR NEW.state->'resources' IS DISTINCT FROM OLD.state->'resources'))
    THEN
      v_modules:=array_append(v_modules,'economia');v_important:=true;
    END IF;
    IF v_combat THEN v_modules:=array_append(v_modules,'combate');END IF;
  END IF;
  IF cardinality(v_modules)=0 THEN v_modules:=ARRAY['progresso']::text[]; END IF;

  -- REVISAO GLOBAL: sempre acompanha o unico game_saves confirmado.
  -- Uma unica linha por conta, sob o lock ja existente da transacao do save.
  INSERT INTO public.stellar_player_save_head_v119
    (user_id,revision,state_hash,changed_at,checkpointed_at,journaled_at)
  VALUES(NEW.user_id,1,v_hash,v_now,NULL,NULL)
  ON CONFLICT(user_id) DO UPDATE SET
    revision=public.stellar_player_save_head_v119.revision+1,
    state_hash=EXCLUDED.state_hash,
    changed_at=EXCLUDED.changed_at
  RETURNING revision,checkpointed_at,journaled_at
    INTO v_rev,v_last_checkpoint,v_last_journal;

  -- Checkpoint completo apenas em mudanca importante ou apos 30s.
  -- Recompensas de NPC ja possuem ledger proprio: nao duplicar estado a cada abate.
  v_capture:=v_important OR v_last_checkpoint IS NULL
    OR v_now-v_last_checkpoint>=interval '30 seconds';
  v_log:=v_important OR v_last_journal IS NULL
    OR v_now-v_last_journal>=interval '90 seconds';

  IF v_capture THEN
    SELECT * INTO v_prev FROM public.stellar_player_save_checkpoint_v119
      WHERE user_id=NEW.user_id AND slot='A' FOR UPDATE;
    IF v_prev.user_id IS NOT NULL AND v_prev.state_hash<>v_hash THEN
      SELECT * INTO v_backup_b FROM public.stellar_player_save_checkpoint_v119
        WHERE user_id=NEW.user_id AND slot='B' FOR UPDATE;
      IF v_backup_b.user_id IS NOT NULL THEN
        INSERT INTO public.stellar_player_save_checkpoint_v119 AS c
          (user_id,slot,revision,state,state_hash,captured_at)
        VALUES(NEW.user_id,'C',v_backup_b.revision,v_backup_b.state,
          v_backup_b.state_hash,v_backup_b.captured_at)
        ON CONFLICT(user_id,slot) DO UPDATE SET
          revision=EXCLUDED.revision,state=EXCLUDED.state,
          state_hash=EXCLUDED.state_hash,captured_at=EXCLUDED.captured_at;
      END IF;
      INSERT INTO public.stellar_player_save_checkpoint_v119 AS c
        (user_id,slot,revision,state,state_hash,captured_at)
      VALUES(NEW.user_id,'B',v_prev.revision,v_prev.state,
        v_prev.state_hash,v_prev.captured_at)
      ON CONFLICT(user_id,slot) DO UPDATE SET
        revision=EXCLUDED.revision,state=EXCLUDED.state,
        state_hash=EXCLUDED.state_hash,captured_at=EXCLUDED.captured_at;
    END IF;
    INSERT INTO public.stellar_player_save_checkpoint_v119 AS c
      (user_id,slot,revision,state,state_hash,captured_at)
    VALUES(NEW.user_id,'A',v_rev,NEW.state,v_hash,v_now)
    ON CONFLICT(user_id,slot) DO UPDATE SET
      revision=EXCLUDED.revision,state=EXCLUDED.state,
      state_hash=EXCLUDED.state_hash,captured_at=EXCLUDED.captured_at;
    UPDATE public.stellar_player_save_head_v119
      SET checkpointed_at=v_now WHERE user_id=NEW.user_id;
  END IF;

  -- Log resumido: compras, Hangar, leilao e missoes geram evento imediato.
  -- Combate rotineiro usa ledger detalhado e apenas 1 resumo a cada 90 segundos.
  IF v_log THEN
    INSERT INTO public.stellar_player_save_journal_v119
      (user_id,revision,modules,before_hash,after_hash,created_at)
    VALUES(NEW.user_id,v_rev,v_modules,v_before,v_hash,v_now);
    UPDATE public.stellar_player_save_head_v119
      SET journaled_at=v_now WHERE user_id=NEW.user_id;
  END IF;
  RETURN NULL;
END $capture$;
REVOKE ALL ON FUNCTION public.stellar_capture_canonical_save_v119()
  FROM PUBLIC,anon,authenticated;

-- Ativacao separada em STELLAR_V119_1_CAPTURA_ATIVAR.sql (apos teste de carga).
