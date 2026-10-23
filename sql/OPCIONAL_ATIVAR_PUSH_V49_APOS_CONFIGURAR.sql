-- OPCIONAL: NÃO executar junto da migração principal.
-- 1) Defina estas variáveis secretas no Render: STELLAR_FARM_VAPID_PUBLIC,
--    STELLAR_FARM_VAPID_PRIVATE, STELLAR_FARM_VAPID_CONTACT,
--    STELLAR_FARM_PUSH_DISPATCH_TOKEN.
-- 2) Crie no Supabase Vault um segredo chamado stellar_farm_dispatch_token_v49,
--    com EXATAMENTE o mesmo valor do STELLAR_FARM_PUSH_DISPATCH_TOKEN do Render.
-- 3) Depois que o ZIP V49 estiver LIVE, e só então rode este script.
-- 4) Cron executa a checagem no Supabase 1 vez/min; HTTP acorda o Render APENAS
--    quando há uma sessão vencida com assinante pendente de aviso.
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
SELECT cron.schedule('stellar-farm-push-v49', '* * * * *', $cron$
  SELECT net.http_post(
    url := 'https://darkorbit-legacy.onrender.com/api/offline-farm/v49/dispatch',
    headers := jsonb_build_object('Content-Type','application/json',
      'x-stellar-farm-push-token',
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='stellar_farm_dispatch_token_v49' LIMIT 1)),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  )
  WHERE EXISTS (
    SELECT 1
    FROM public.stellar_offline_farm_v484 farm
    JOIN public.stellar_farm_push_subscriptions_v489 sub ON sub.user_id=farm.user_id AND sub.enabled
    WHERE farm.status='running' AND farm.ends_at<=now()
      AND farm.ends_at>now()-interval '12 hours'
      AND sub.last_notified_session_id IS DISTINCT FROM farm.id
  )
  AND EXISTS(SELECT 1 FROM vault.decrypted_secrets WHERE name='stellar_farm_dispatch_token_v49');
$cron$);
-- Se necessário desativar: SELECT cron.unschedule('stellar-farm-push-v49');
