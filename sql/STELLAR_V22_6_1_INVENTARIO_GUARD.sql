-- Protecao das quantidades de inventario inclusive via REST direto do Supabase.
-- Valida formatos e limites, sem alterar saldos nem inventarios existentes.
BEGIN;
CREATE OR REPLACE FUNCTION public.stellar_guard_inventory_v226()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_group text; v_payload jsonb; v_item record; v_max numeric;
BEGIN
 IF auth.role()='service_role' THEN RETURN NEW; END IF;
 FOREACH v_group IN ARRAY ARRAY['inventory','ammo','rockets','cargo'] LOOP
  v_payload:=NEW.state->v_group;
  IF v_payload IS NULL THEN CONTINUE; END IF;
  IF jsonb_typeof(v_payload)<>'object' THEN RAISE EXCEPTION 'SECURITY_INVALID_INVENTORY_FORMAT'; END IF;
  v_max:=CASE WHEN v_group='ammo' THEN 1000000000000::numeric ELSE 1000000000::numeric END;
  FOR v_item IN SELECT key,value FROM jsonb_each(v_payload) LOOP
   IF jsonb_typeof(v_item.value)<>'number' THEN RAISE EXCEPTION 'SECURITY_INVALID_ITEM_TYPE'; END IF;
   IF (v_item.value#>>'{}')::numeric<0 OR (v_item.value#>>'{}')::numeric>v_max
      OR (v_item.value#>>'{}')::numeric<>trunc((v_item.value#>>'{}')::numeric) THEN
      RAISE EXCEPTION 'SECURITY_INVALID_ITEM_QUANTITY';
   END IF;
  END LOOP;
 END LOOP;
 RETURN NEW;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN RAISE EXCEPTION 'SECURITY_INVALID_ITEM_QUANTITY';
END; $$;
DROP TRIGGER IF EXISTS stellar_inventory_guard_update_v226 ON public.game_saves;
DROP TRIGGER IF EXISTS stellar_inventory_guard_insert_v226 ON public.game_saves;
CREATE TRIGGER stellar_inventory_guard_update_v226 BEFORE UPDATE OF state ON public.game_saves
FOR EACH ROW EXECUTE FUNCTION public.stellar_guard_inventory_v226();
CREATE TRIGGER stellar_inventory_guard_insert_v226 BEFORE INSERT ON public.game_saves
FOR EACH ROW EXECUTE FUNCTION public.stellar_guard_inventory_v226();
COMMIT;
