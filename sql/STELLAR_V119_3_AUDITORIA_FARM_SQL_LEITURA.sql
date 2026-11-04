-- V119.3: diagnostico somente leitura. Nao paga, cancela ou resgata Farm.
SELECT status, count(*) AS sessions,
       count(*) FILTER (WHERE (started_at AT TIME ZONE 'UTC')::date IS DISTINCT FROM (ends_at AT TIME ZONE 'UTC')::date) AS crosses_utc_day
FROM public.stellar_offline_farm_v484 GROUP BY status ORDER BY status;
SELECT proname,pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc p WHERE p.pronamespace='public'::regnamespace
 AND p.proname IN ('stellar_offline_farm_claim_v1111','stellar_offline_farm_claim_v484',
                  'stellar_offline_farm_claim_v487','stellar_offline_farm_claim_v49');
