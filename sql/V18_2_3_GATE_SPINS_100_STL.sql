-- V18.2.3 • mesmo preço para AURORA / NEXUS / ECLIPSE
-- Já aplicado no banco principal do Stellar Legacy em 10/10/2026.
-- Em projetos alternativos, execute apenas uma vez. A opção por Poeira é do servidor Node v18.2.3.
BEGIN;
UPDATE public.live_shop_prices_v16
SET price=100, updated_at=now()
WHERE catalog_key IN ('gate_spin:alpha','gate_spin:beta','gate_spin:gamma')
  AND kind='gate_spin' AND currency='uridium';
DO $$ BEGIN
  IF (SELECT count(*) FROM public.live_shop_prices_v16
      WHERE catalog_key IN ('gate_spin:alpha','gate_spin:beta','gate_spin:gamma')
      AND enabled=true AND price=100 AND currency='uridium') <> 3 THEN
    RAISE EXCEPTION 'Não foi possível ajustar todos os três giros para 100 STL.';
  END IF;
END $$;
COMMIT;
