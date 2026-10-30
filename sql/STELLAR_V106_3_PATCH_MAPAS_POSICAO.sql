-- V106.3: CORRECAO DE COMPATIBILIDADE DO MAPA NA POSICAO. EXECUTAR APOS O FARM / DEPLOY.
-- Extend only game-known map IDs, retaining authorization, timestamp and coordinate checks.
-- The current save_player_location_v1774 wrongly permits only x1..x4, while the official
-- game_map_npc_spawns_v1811 includes x5..x8 and u1..u3. Does not alter balances or saves.
DO $stellar_v1063$
DECLARE
  v_oid oid;
  v_ddl text;
  v_old text := 'if v_map not in (''x1'',''x2'',''x3'',''x4'',''b41'',''b42'',''b43'',''ggAlpha'',''ggBeta'',''ggGamma'') then raise exception ''Mapa inválido.''; end if;';
  v_new text := 'if v_map not in (''x1'',''x2'',''x3'',''x4'',''x5'',''x6'',''x7'',''x8'',''u1'',''u2'',''u3'',''b41'',''b42'',''b43'',''ggAlpha'',''ggBeta'',''ggGamma'') then raise exception ''Mapa inválido.''; end if;';
BEGIN
  SELECT p.oid INTO v_oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='save_player_location_v1774'
     AND pg_get_function_identity_arguments(p.oid) LIKE 'p_map_id text%';
  IF v_oid IS NULL THEN RAISE EXCEPTION 'V1063_ABORT: target function not found'; END IF;
  v_ddl:=pg_get_functiondef(v_oid);
  IF position(v_new IN v_ddl)>0 THEN RAISE NOTICE 'V1063: already patched';RETURN;END IF;
  IF position(v_old IN v_ddl)=0 THEN RAISE EXCEPTION 'V1063_ABORT: unexpected function definition; update manually'; END IF;
  EXECUTE replace(v_ddl,v_old,v_new);
  RAISE NOTICE 'V1063: valid maps x1-x8, u1-u3, b41-b43, astral enabled';
END
$stellar_v1063$;

-- Validation (read only):
SELECT pg_get_functiondef('public.save_player_location_v1774(text,text,double precision,double precision,double precision,bigint)'::regprocedure) LIKE '%''x7''%' AS supports_x7,
       pg_get_functiondef('public.save_player_location_v1774(text,text,double precision,double precision,double precision,bigint)'::regprocedure) LIKE '%''u3''%' AS supports_u3;
