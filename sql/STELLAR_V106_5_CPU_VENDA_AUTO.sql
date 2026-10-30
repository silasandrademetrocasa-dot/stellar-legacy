-- STELLAR LEGACY V106.5 | Bloqueio da VENDA AUTOMATICA OFFLINE sem CPU equipado.
-- Migration separada e idempotente; executar SOMENTE apos o encerramento do farm e
-- o deploy do codigo V106.5. Nao modifica saldos, estoque, itens nem farms antigos.
BEGIN;
CREATE OR REPLACE FUNCTION public.stellar_auto_sale_cpu_guard_v1065()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $f$
DECLARE v_has_cpu boolean := false;
BEGIN
  IF NEW.auto_sell IS TRUE THEN
    SELECT COALESCE((state->'shipLoadout'->'extras') ? 'remoteTraderCpuElite',false)
      INTO v_has_cpu FROM public.game_saves WHERE user_id=NEW.user_id;
    IF NOT COALESCE(v_has_cpu,false) THEN
      RAISE EXCEPTION 'Venda automática offline exige Terminal Mercante Remoto Elite EQUIPADO.' USING ERRCODE='P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$f$;
DROP TRIGGER IF EXISTS trg_stellar_auto_sale_cpu_guard_v1065 ON public.stellar_offline_farm_v484;
CREATE TRIGGER trg_stellar_auto_sale_cpu_guard_v1065
  BEFORE INSERT OR UPDATE OF auto_sell ON public.stellar_offline_farm_v484
  FOR EACH ROW EXECUTE FUNCTION public.stellar_auto_sale_cpu_guard_v1065();
COMMIT;
