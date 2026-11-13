-- Stops only the optional read helper; never removes saves, receipts, inventory or currency.
-- App automatically uses its compatible parallel-read path when this function is absent.
BEGIN;
DROP FUNCTION IF EXISTS public.stellar_shop_context_v1451(uuid,text,text,boolean);
-- Keep service_role configuration SELECT privileges: they may predate this change.
COMMIT;
