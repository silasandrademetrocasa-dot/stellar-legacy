-- Non-destructive rollback: stop new optimistic events; retain the drain path and all receipts.
-- KEEP V146 server/client deployed until each device's pending outbox has drained.
BEGIN;
CREATE OR REPLACE FUNCTION public.stellar_localfirst_read_v146(p_user_id uuid,p_token text DEFAULT NULL,p_checkpoint_ids text[] DEFAULT NULL)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $f$
 SELECT public.stellar_player_read(p_user_id,p_token,p_checkpoint_ids)||'{"local_first_v146":{"enabled":false,"drain":true,"protocol":1}}'::jsonb;
$f$;
REVOKE ALL ON FUNCTION public.stellar_localfirst_read_v146(uuid,text,text[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stellar_localfirst_read_v146(uuid,text,text[]) TO service_role;
COMMIT;
