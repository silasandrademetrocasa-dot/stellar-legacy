-- Stellar Legacy: reversão do isolamento experimental do Universo Estelar V42.
-- Executar APÓS a versão V107+ estar publicada e o login validado.
-- Não altera saldos, saves, inventário, mapas U-X, eventos ou missões.
BEGIN;
DO $restore_v42$
DECLARE r record; n integer:=0;
BEGIN
 FOR r IN SELECT p.oid,p.proname,pg_get_function_identity_arguments(p.oid) args
            FROM pg_proc p JOIN pg_namespace ns ON ns.oid=p.pronamespace
           WHERE ns.nspname='public' AND p.proname LIKE 'stellar_u42%'
 LOOP
   EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated',r.proname,r.args);
   n:=n+1;
 END LOOP;
 IF n<>24 THEN RAISE EXCEPTION 'EXPECTED_24_UNIVERSE_FUNCTIONS_GOT_%',n; END IF;
END $restore_v42$;
UPDATE public.game_feature_flags_v1810 SET enabled=true,updated_at=now()
 WHERE flag_key='unified_expansion_v42' AND enabled=false;
COMMIT;
-- Verify: SELECT count(*) FILTER (WHERE has_function_privilege('authenticated',p.oid,'EXECUTE'))
-- FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
-- WHERE n.nspname='public' AND p.proname LIKE 'stellar_u42%'; -- expected 24
