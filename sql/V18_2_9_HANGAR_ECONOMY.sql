-- Stellar Legacy V18.2.9 — refinaria remota, Terminal Mercante Elite e drones progressivos
-- Executado no Supabase de produção durante a preparação da atualização.
-- Reexecutável de forma segura para o novo EXTRA; NÃO redefine preços editados pelo ADM
-- quando já estão com os novos valores.
BEGIN;
INSERT INTO public.live_shop_prices_v16
 (catalog_key,kind,ref_id,price,currency,enabled,meta,shop_tab,shop_visible,min_level,sort_order,display_name,description,updated_at)
VALUES
 ('item:remoteTraderCpuElite','extra','remoteTraderCpuElite',350000,'uridium',true,
  '{"grant":{"kind":"inventory","id":"remoteTraderCpuElite","qty":1}}'::jsonb,
  'extras',true,1,115,'Terminal Mercante Remoto • Elite',
  'EXTRA Elite que permite vender manualmente recursos do porão em qualquer mapa pelo Hangar → Refinaria, enquanto equipado.',now())
ON CONFLICT (catalog_key) DO NOTHING;

UPDATE public.live_shop_prices_v16
SET price=10000000,meta=jsonb_set(coalesce(meta,'{}'::jsonb),'{drone_price_multiplier}','2'::jsonb,true),updated_at=now()
WHERE catalog_key='drone:flax' AND price=30000000;
UPDATE public.live_shop_prices_v16
SET price=15000,meta=jsonb_set(coalesce(meta,'{}'::jsonb),'{drone_price_multiplier}','2'::jsonb,true),updated_at=now()
WHERE catalog_key='drone:iris' AND price=900000;
-- Multiplicador 2 para registros preexistentes, sem substituir mudanças posteriores do ADM.
UPDATE public.live_shop_prices_v16
SET meta=jsonb_set(coalesce(meta,'{}'::jsonb),'{drone_price_multiplier}','2'::jsonb,true),updated_at=now()
WHERE kind='drone' AND coalesce(meta,'{}'::jsonb)->'drone_price_multiplier' IS NULL;

CREATE OR REPLACE FUNCTION public.admin_update_drone_multiplier_v1829(p_type text,p_multiplier numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public,auth,pg_temp AS $$
DECLARE v_uid uuid:=auth.uid();v_updated jsonb;
BEGIN
 IF v_uid IS NULL OR NOT public.is_game_admin_v1763(v_uid) THEN
   RAISE EXCEPTION 'Acesso administrativo negado.' USING ERRCODE='42501';
 END IF;
 IF p_type NOT IN ('flax','iris') OR p_multiplier IS NULL OR p_multiplier<1 OR p_multiplier>4 THEN
   RAISE EXCEPTION 'Multiplicador inválido: permitido 1 a 4.';
 END IF;
 UPDATE public.live_shop_prices_v16
 SET meta=jsonb_set(coalesce(meta,'{}'::jsonb),'{drone_price_multiplier}',to_jsonb(p_multiplier),true),updated_at=now()
 WHERE catalog_key='drone:'||p_type AND kind='drone'
 RETURNING meta INTO v_updated;
 IF NOT FOUND THEN RAISE EXCEPTION 'Drone não encontrado.';END IF;
 RETURN v_updated;
END;$$;
REVOKE ALL ON FUNCTION public.admin_update_drone_multiplier_v1829(text,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_update_drone_multiplier_v1829(text,numeric) TO authenticated;
-- Impede que um save antigo apague a contagem histórica de compras de drone.
CREATE OR REPLACE FUNCTION public.guard_drone_purchase_history_v1829()
RETURNS trigger LANGUAGE plpgsql SET search_path = public,pg_temp AS $$
DECLARE k text; n_old numeric; n_new numeric; preserved jsonb;
BEGIN
 IF NEW.state IS NULL OR OLD.state IS NULL THEN RETURN NEW; END IF;
 preserved:=CASE WHEN jsonb_typeof(NEW.state->'dronePurchasesV1829')='object' THEN NEW.state->'dronePurchasesV1829' ELSE '{}'::jsonb END;
 FOR k IN SELECT unnest(ARRAY['flax','iris']) LOOP
   n_old:=CASE WHEN jsonb_typeof(OLD.state->'dronePurchasesV1829'->k)='number' THEN LEAST(100000,GREATEST(0,(OLD.state->'dronePurchasesV1829'->>k)::numeric)) ELSE 0 END;
   n_new:=CASE WHEN jsonb_typeof(preserved->k)='number' THEN LEAST(100000,GREATEST(0,(preserved->>k)::numeric)) ELSE 0 END;
   IF n_old>n_new THEN preserved:=jsonb_set(preserved,ARRAY[k],to_jsonb(n_old::bigint),true); END IF;
 END LOOP;
 IF preserved<>'{}'::jsonb THEN NEW.state:=jsonb_set(NEW.state,'{dronePurchasesV1829}',preserved,true); END IF;
 RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS game_saves_drone_history_v1829 ON public.game_saves;
CREATE TRIGGER game_saves_drone_history_v1829 BEFORE UPDATE ON public.game_saves
FOR EACH ROW EXECUTE FUNCTION public.guard_drone_purchase_history_v1829();
COMMIT;
