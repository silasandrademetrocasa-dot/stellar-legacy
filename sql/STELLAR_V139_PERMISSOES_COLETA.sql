BEGIN;
SET LOCAL lock_timeout='5s';
-- SECURITY INVOKER needs table privileges as well as EXECUTE on its RPC.
-- Only the backend's existing BYPASSRLS role receives the missing permissions.
GRANT SELECT ON public.game_login_sessions_v1214,
 public.account_moderation_v1763,public.live_designs_v16,
 public.player_design_inventory_v16,public.player_design_loadout_v16 TO service_role;
-- The save trigger restores the owned design belonging to the selected hull.
GRANT UPDATE(ship_design_id) ON public.player_design_loadout_v16 TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
