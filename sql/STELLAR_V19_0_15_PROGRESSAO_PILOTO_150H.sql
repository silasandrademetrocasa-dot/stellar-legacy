-- STELLAR LEGACY V19.0.15 | Curva de nivel do PILOTO (meta: ~150h LV7->LV32)
-- COMPATIVEL COM CLIENTES ANTIGOS: saves com xpModelV1915 ausente continuam na V1770.
-- Nenhum save, saldo, nivel ou XP de jogador sera modificado por esta migracao.
BEGIN;

CREATE OR REPLACE FUNCTION public.player_xp_threshold_v1770(p_level integer)
RETURNS bigint LANGUAGE sql IMMUTABLE STRICT
SET search_path TO 'public','pg_temp'
AS $old$
  SELECT CASE WHEN p_level<=1 THEN 0::bigint ELSE
    round((15000::double precision * power((p_level-1)::double precision,2.3::double precision)
       * power(1.20::double precision,greatest(0,p_level-2)::double precision))::numeric)::bigint
  END;
$old$;

CREATE OR REPLACE FUNCTION public.player_xp_threshold_v1915(p_level integer,p_old_curve boolean DEFAULT false)
RETURNS bigint LANGUAGE plpgsql IMMUTABLE STRICT
SET search_path TO 'public','pg_temp'
AS $curve$
DECLARE
  lv integer:=greatest(1,p_level);
  oldxp bigint;
  left_lv integer;right_lv integer;left_xp bigint;right_xp bigint;
  old_left bigint;old_right bigint;
BEGIN
  oldxp:=public.player_xp_threshold_v1770(lv);
  IF p_old_curve OR lv<=10 THEN RETURN oldxp; END IF;
  IF lv<=32 THEN
    IF lv<=18 THEN
      left_lv:=10;right_lv:=18;left_xp:=10099480;right_xp:=49299480;
    ELSIF lv<=22 THEN
      left_lv:=18;right_lv:=22;left_xp:=49299480;right_xp:=158299480;
    ELSIF lv<=27 THEN
      left_lv:=22;right_lv:=27;left_xp:=158299480;right_xp:=397249480;
    ELSE
      left_lv:=27;right_lv:=32;left_xp:=397249480;right_xp:=741049480;
    END IF;
    old_left:=public.player_xp_threshold_v1770(left_lv);
    old_right:=public.player_xp_threshold_v1770(right_lv);
    RETURN round(left_xp::numeric + (right_xp-left_xp)::numeric
      * (oldxp-old_left)::numeric / greatest(1,old_right-old_left)::numeric)::bigint;
  END IF;
  -- LV33..44: extrapolacao continua; LV32 exatamente 741.049.480 XP.
  RETURN round(oldxp::numeric * 741049480::numeric
    / greatest(1,public.player_xp_threshold_v1770(32))::numeric)::bigint;
END;
$curve$;

-- A verificacao do cla se adapta ao modelo salvo, sem confiar apenas no level enviado.
CREATE OR REPLACE FUNCTION public.clan_check_entry_level_v19(p_uid uuid)
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $clan$
DECLARE
  v_req integer:=public.clan_required_level_v19();
  v_level integer;v_saved_level integer;v_xp bigint;v_saved_xp bigint;
  v_new_model boolean:=false;v_calc_level integer:=1;v_i integer;v_threshold bigint;
BEGIN
  SELECT p.level,p.xp,
    coalesce(nullif(s.state #>> '{profile,level}','')::integer,p.level),
    coalesce(nullif(s.state #>> '{profile,xp}','')::bigint,p.xp),
    coalesce(nullif(s.state #>> '{profile,xpModelV1915}','')::boolean,false)
    INTO v_level,v_xp,v_saved_level,v_saved_xp,v_new_model
    FROM public.profiles p LEFT JOIN public.game_saves s ON s.user_id=p.id
    WHERE p.id=p_uid;
  IF v_level IS NULL OR v_saved_level IS NULL THEN
    RAISE EXCEPTION 'Perfil e save online são necessários para acessar alianças.';
  END IF;
  v_xp:=least(greatest(0,coalesce(v_xp,0)),greatest(0,coalesce(v_saved_xp,0)));
  FOR v_i IN 2..44 LOOP
    v_threshold:=public.player_xp_threshold_v1915(v_i,NOT v_new_model);
    EXIT WHEN v_xp<v_threshold;
    v_calc_level:=v_i;
  END LOOP;
  IF least(v_level,v_saved_level,v_calc_level)<v_req THEN
    RAISE EXCEPTION 'Aliança libera no nível % (conforme XP e save). Seu nível validado é %.',v_req,least(v_level,v_saved_level,v_calc_level);
  END IF;
  IF NOT coalesce((SELECT enabled FROM public.game_ui_modules_v1810 WHERE module_key='clan'),true) THEN
    RAISE EXCEPTION 'Alianças temporariamente indisponíveis.';
  END IF;
END;
$clan$;

-- Preserva INTEGRALMENTE a funcao atual da Arena (inclusive premios, transacoes e
-- permissoes). Altera somente a linha que verifica qual nivel resulta do XP.
DO $arena_patch$
DECLARE
  fn text;
  old_line text:='v_threshold := round((15000::double precision * power((v_i - 1)::double precision, 2.3::double precision) * power(1.20::double precision, greatest(0,v_i-2)::double precision))::numeric)::bigint;';
  new_line text:='v_threshold := public.player_xp_threshold_v1915(v_i, coalesce((v_state #>> ''{profile,xpModelV1915}'')::boolean,false) IS NOT TRUE);';
BEGIN
  SELECT pg_get_functiondef('public.claim_arena_daily_reward()'::regprocedure) INTO fn;
  IF fn IS NULL OR strpos(fn,old_line)=0 THEN
    RAISE EXCEPTION 'A função da Arena mudou. Nenhuma alteração aplicada. Atualize a migração após revisão.';
  END IF;
  IF strpos(fn,new_line)>0 THEN RAISE EXCEPTION 'Arena já está usando nova curva'; END IF;
  EXECUTE replace(fn,old_line,new_line);
END;
$arena_patch$;

REVOKE ALL ON FUNCTION public.player_xp_threshold_v1770(integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.player_xp_threshold_v1915(integer,boolean) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.clan_check_entry_level_v19(uuid) FROM PUBLIC,anon,authenticated;

-- Valida os marcos e a monotonicidade antes do COMMIT.
DO $check_curve$
DECLARE lv integer;prev bigint:=-1;cur bigint;
BEGIN
  IF public.player_xp_threshold_v1915(10,false)<>10099480 OR
     public.player_xp_threshold_v1915(18,false)<>49299480 OR
     public.player_xp_threshold_v1915(22,false)<>158299480 OR
     public.player_xp_threshold_v1915(27,false)<>397249480 OR
     public.player_xp_threshold_v1915(32,false)<>741049480 THEN
       RAISE EXCEPTION 'Marcos da curva 150h inconsistentes';
  END IF;
  FOR lv IN 1..44 LOOP
    cur:=public.player_xp_threshold_v1915(lv,false);
    IF cur<=prev THEN RAISE EXCEPTION 'Curva nao cresce entre LV % e %',lv-1,lv; END IF;
    IF lv<=10 AND cur<>public.player_xp_threshold_v1770(lv) THEN
      RAISE EXCEPTION 'Curva inicial diferente no LV %',lv;
    END IF;
    prev:=cur;
  END LOOP;
END;
$check_curve$;
COMMIT;
