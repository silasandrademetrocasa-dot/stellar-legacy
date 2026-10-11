-- Stellar Legacy 18.2.5: Bonus Box + Poeira Stellar editor LIVE OPS.
-- Safe to run once or re-run: retains configured values after first installation.
CREATE TABLE IF NOT EXISTS public.bonus_box_config_v1825 (
  id integer PRIMARY KEY CHECK (id=1),
  config jsonb NOT NULL,
  version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
ALTER TABLE public.bonus_box_config_v1825 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bonus_box_config_v1825 FROM PUBLIC, anon, authenticated;

INSERT INTO public.bonus_box_config_v1825(id,config)
VALUES(1, '{
  "map_counts":{"x1":20,"x2":20,"x3":20,"x4":20,"b41":30,"b42":30,"b43":30},
  "respawn_min_ms":40000,"respawn_max_ms":70000,
  "premium_discount_pct":10,
  "gate_prices":{"alpha":{"stl":100,"dust":1},"beta":{"stl":100,"dust":1},"gamma":{"stl":100,"dust":1}},
  "rewards":[
    {"kind":"ammo","id":"lcb10","min":15,"max":100,"weight":1},
    {"kind":"ammo","id":"mcb25","min":15,"max":75,"weight":1},
    {"kind":"ammo","id":"mcb50","min":15,"max":50,"weight":1},
    {"kind":"ammo","id":"sab50","min":15,"max":75,"weight":1},
    {"kind":"credits","min":100,"max":10000,"weight":1},
    {"kind":"uridium","min":1,"max":200,"weight":1},
    {"kind":"stellarDust","min":1,"max":2,"weight":1}
  ]}'::jsonb)
ON CONFLICT(id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_bonus_box_config_v1825()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $f$
 SELECT jsonb_build_object('version',version,'updated_at',updated_at,'config',config)
 FROM public.bonus_box_config_v1825 WHERE id=1;
$f$;
REVOKE ALL ON FUNCTION public.get_bonus_box_config_v1825() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_bonus_box_config_v1825() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_bonus_box_config_v1825(p_config jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $f$
DECLARE
  v_uid uuid := auth.uid();
  v_key text;
  v_reward jsonb;
  v_rows jsonb := '[]'::jsonb;
  v_gate jsonb;
  v_maps jsonb := '{}'::jsonb;
  v_prices jsonb := '{}'::jsonb;
  v_limit integer;
  v_min integer;
  v_max integer;
  v_weight numeric;
  v_total numeric := 0;
  v_labels text[] := ARRAY['lcb10','mcb25','mcb50','sab50','credits','uridium','stellarDust'];
  v_kind text;
  v_id text;
  v_idx integer;
  v_respawn_min integer;
  v_respawn_max integer;
  v_discount integer;
  v_clean jsonb;
  v_out jsonb;
BEGIN
  IF v_uid IS NULL OR NOT public.is_game_admin_v1763(v_uid) THEN
    RAISE EXCEPTION 'Acesso administrativo negado.' USING ERRCODE='42501';
  END IF;
  IF jsonb_typeof(p_config)<>'object' THEN
    RAISE EXCEPTION 'Configuração deve ser um objeto JSON.';
  END IF;
  IF jsonb_typeof(p_config->'map_counts') <> 'object'
     OR jsonb_typeof(p_config->'gate_prices') <> 'object'
     OR jsonb_typeof(p_config->'rewards') <> 'array'
     OR jsonb_array_length(p_config->'rewards') <> 7 THEN
    RAISE EXCEPTION 'Mapas, preços e as sete recompensas são obrigatórios.';
  END IF;
  FOR v_key IN SELECT unnest(ARRAY['x1','x2','x3','x4','b41','b42','b43']) LOOP
    IF (p_config->'map_counts'->>v_key) IS NULL OR (p_config->'map_counts'->>v_key) !~ '^[0-9]{1,3}$' THEN
      RAISE EXCEPTION 'Quantidade inválida para o mapa %.',v_key;
    END IF;
    v_limit := (p_config->'map_counts'->>v_key)::integer;
    IF v_limit>100 THEN RAISE EXCEPTION 'Máximo de 100 caixas para o mapa %.',v_key; END IF;
    v_maps := v_maps || jsonb_build_object(v_key,v_limit);
  END LOOP;
  v_respawn_min := (p_config->>'respawn_min_ms')::integer;
  v_respawn_max := (p_config->>'respawn_max_ms')::integer;
  IF v_respawn_min IS NULL OR v_respawn_max IS NULL
    OR v_respawn_min<5000 OR v_respawn_max>3600000 OR v_respawn_max<v_respawn_min THEN
    RAISE EXCEPTION 'Respawn precisa ser entre 5 e 3600 segundos, com mínimo <= máximo.';
  END IF;
  v_discount := (p_config->>'premium_discount_pct')::integer;
  IF v_discount IS NULL OR v_discount<0 OR v_discount>50 THEN
    RAISE EXCEPTION 'Desconto Premium permitido: 0 a 50 por cento.';
  END IF;
  FOR v_key IN SELECT unnest(ARRAY['alpha','beta','gamma']) LOOP
    v_gate := p_config->'gate_prices'->v_key;
    IF jsonb_typeof(v_gate)<>'object' THEN RAISE EXCEPTION 'Preço ausente: %.',v_key; END IF;
    v_min := (v_gate->>'stl')::integer;
    v_max := (v_gate->>'dust')::integer;
    IF v_min IS NULL OR v_min<1 OR v_min>100000 OR v_max IS NULL OR v_max<1 OR v_max>100 THEN
      RAISE EXCEPTION 'Preço inválido do portal % (STL: 1..100000, Poeira: 1..100).',v_key;
    END IF;
    v_prices := v_prices || jsonb_build_object(v_key,jsonb_build_object('stl',v_min,'dust',v_max));
  END LOOP;
  FOR v_idx IN 0..6 LOOP
    v_reward := p_config->'rewards'->v_idx;
    IF jsonb_typeof(v_reward)<>'object' THEN RAISE EXCEPTION 'Prêmio % inválido.',v_idx+1; END IF;
    v_id := v_labels[v_idx+1];
    v_kind := CASE WHEN v_idx<4 THEN 'ammo' ELSE v_id END;
    IF v_reward->>'kind'<>v_kind OR (v_idx<4 AND v_reward->>'id'<>v_id) THEN
      RAISE EXCEPTION 'Tipo de recompensa % não corresponde ao padrão permitido.',v_idx+1;
    END IF;
    v_min := (v_reward->>'min')::integer;
    v_max := (v_reward->>'max')::integer;
    v_weight := (v_reward->>'weight')::numeric;
    IF v_min IS NULL OR v_max IS NULL OR v_weight IS NULL
      OR v_min<1 OR v_max<v_min OR v_weight<0 OR v_weight>100 THEN
      RAISE EXCEPTION 'Intervalo/chance inválido na recompensa %.',v_id;
    END IF;
    IF v_max > (CASE WHEN v_kind='credits' THEN 10000000 WHEN v_kind='uridium' THEN 100000 WHEN v_kind='stellarDust' THEN 100 ELSE 1000000 END) THEN
      RAISE EXCEPTION 'Quantidade máxima de % excedida.',v_id;
    END IF;
    v_total := v_total + v_weight;
    v_rows := v_rows || jsonb_build_array(jsonb_build_object('kind',v_kind,'min',v_min,'max',v_max,'weight',v_weight)
      || CASE WHEN v_kind='ammo' THEN jsonb_build_object('id',v_id) ELSE '{}'::jsonb END);
  END LOOP;
  IF v_total<=0 THEN RAISE EXCEPTION 'Pelo menos uma recompensa deve ter chance maior que zero.'; END IF;
  v_clean := jsonb_build_object('map_counts',v_maps,'respawn_min_ms',v_respawn_min,
    'respawn_max_ms',v_respawn_max,'premium_discount_pct',v_discount,
    'gate_prices',v_prices,'rewards',v_rows);
  UPDATE public.bonus_box_config_v1825
    SET config=v_clean,version=version+1,updated_at=now(),updated_by=v_uid
    WHERE id=1;
  -- O cadastro de preços do LIVE OPS continua sincronizado com o painel.
  UPDATE public.live_shop_prices_v16 AS p
    SET price=(v_prices->split_part(p.catalog_key,':',2)->>'stl')::integer,updated_at=now()
    WHERE p.catalog_key IN ('gate_spin:alpha','gate_spin:beta','gate_spin:gamma')
      AND p.kind='gate_spin' AND p.currency='uridium';
  RETURN public.get_bonus_box_config_v1825();
END;
$f$;
REVOKE ALL ON FUNCTION public.admin_update_bonus_box_config_v1825(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_update_bonus_box_config_v1825(jsonb) TO authenticated;
