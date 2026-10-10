-- STELLAR LEGACY V18.2.1 — SISTEMA DE CUPONS CONFIGURÁVEIS VIA SQL
-- EXECUTAR UMA VEZ NO SUPABASE (o assistente pode aplicar a estrutura antes do deploy).
-- Próximos cupons: apenas INSERT no banco; sem alterar JS, ZIP ou Render.
-- Tabelas não são expostas à REST API; somente RPC com autenticação pode resgatar.

CREATE TABLE IF NOT EXISTS public.game_coupons_v1821 (
  code text PRIMARY KEY CHECK (code ~ '^[A-Z0-9][A-Z0-9_-]{3,63}$'),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 100),
  rewards jsonb NOT NULL CHECK (jsonb_typeof(rewards)='array' AND jsonb_array_length(rewards) BETWEEN 1 AND 8),
  active boolean NOT NULL DEFAULT true,
  min_level integer NOT NULL DEFAULT 1 CHECK (min_level BETWEEN 1 AND 44),
  max_uses integer NOT NULL DEFAULT 1 CHECK (max_uses BETWEEN 1 AND 100000),
  redeemed_count integer NOT NULL DEFAULT 0 CHECK (redeemed_count >= 0),
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coupon_dates_valid CHECK (expires_at IS NULL OR expires_at > starts_at)
);
CREATE TABLE IF NOT EXISTS public.game_coupon_redemptions_v1821 (
  code text NOT NULL REFERENCES public.game_coupons_v1821(code) ON DELETE RESTRICT,
  user_id uuid NOT NULL,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  rewards_snapshot jsonb NOT NULL,
  PRIMARY KEY(code,user_id)
);
CREATE INDEX IF NOT EXISTS game_coupon_redemptions_v1821_player_idx
  ON public.game_coupon_redemptions_v1821(user_id,redeemed_at DESC);

ALTER TABLE public.game_coupons_v1821 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_coupon_redemptions_v1821 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.game_coupons_v1821 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.game_coupon_redemptions_v1821 FROM PUBLIC,anon,authenticated;

-- Proteção contra sobrescrever um prêmio com save antigo de outra aba/dispositivo.
-- A restrição se aplica apenas quando o jogador escreve no PRÓPRIO save.
CREATE OR REPLACE FUNCTION public.game_coupon_protect_save_v1821()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE
  old_claims jsonb := coalesce(OLD.state->'couponClaimsV1821','{}'::jsonb);
  new_claims jsonb := coalesce(NEW.state->'couponClaimsV1821','{}'::jsonb);
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid()=OLD.user_id
    AND jsonb_typeof(old_claims)='object'
    AND NOT (jsonb_typeof(new_claims)='object' AND new_claims @> old_claims) THEN
    RAISE EXCEPTION 'SAVE_COUPON_STALE: Atualize o jogo para sincronizar seus prêmios antes de salvar.' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$fn$;
DROP TRIGGER IF EXISTS game_coupon_protect_save_v1821 ON public.game_saves;
CREATE TRIGGER game_coupon_protect_save_v1821
BEFORE UPDATE OF state ON public.game_saves
FOR EACH ROW EXECUTE FUNCTION public.game_coupon_protect_save_v1821();
REVOKE ALL ON FUNCTION public.game_coupon_protect_save_v1821() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.redeem_game_coupon_v1821(p_code text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
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
$fn$;

REVOKE ALL ON FUNCTION public.redeem_game_coupon_v1821(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.redeem_game_coupon_v1821(text) TO authenticated;

-- Migra cupons Sentinela antigos que ainda não foram usados, mantendo o MESMO código.
INSERT INTO public.game_coupons_v1821(code,title,rewards,max_uses)
SELECT code,'AUX-9 + Modo Sentinela','[{"kind":"aux_sentinel"}]'::jsonb,1
FROM public.stellar_aux_sentinel_coupons_v1
WHERE active=true AND redeemed_by IS NULL AND (expires_at IS NULL OR expires_at>now())
ON CONFLICT (code) DO NOTHING;
-- O resgate agora fica somente no sistema V18.2.1 (não permitir resgates duplos pela função antiga).
REVOKE EXECUTE ON FUNCTION public.redeem_aux_sentinel_coupon_v1(text) FROM authenticated;
