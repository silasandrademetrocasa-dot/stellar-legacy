-- Non-destructive rollback for V34.6.1 admin-release feature.
-- Apply only if reverting server code to V34.6.0.
BEGIN;
REVOKE ALL ON FUNCTION public.stellar_relay_admin_release_v3461(text,text,boolean,uuid) FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
