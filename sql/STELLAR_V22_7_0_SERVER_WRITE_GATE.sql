-- Stellar Legacy • escrita do save e espelho economico somente pelo servidor.
-- ETAPA B: SOMENTE APOS deploy da V22.7.0 no Render.
-- Nunca aplicar enquanto V22.6.0 ainda estiver publicada.
-- Sem atualizacao de saldos, inventarios, niveis, terrenos ou saves existentes.
BEGIN;

-- O service_role neste projeto nao possui grants implicitos nessas tabelas.
GRANT SELECT,INSERT,UPDATE ON TABLE public.game_saves TO service_role;
GRANT SELECT,INSERT,UPDATE ON TABLE public.profiles TO service_role;

-- O jogador continua lendo o proprio save via suas politicas RLS, mas nenhuma
-- requisicao REST direta pode INSERT/UPDATE/DELETE um save.
REVOKE INSERT,UPDATE,DELETE ON TABLE public.game_saves FROM PUBLIC, anon, authenticated;

-- Dados financeiros e progressao visiveis nos rankings pertencem ao servidor.
-- O jogador ainda pode criar o perfil inicial e ajustar somente o callsign.
REVOKE INSERT,UPDATE,DELETE ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT INSERT (id,callsign,updated_at) ON TABLE public.profiles TO authenticated;
GRANT UPDATE (id,callsign,updated_at) ON TABLE public.profiles TO authenticated;

-- Revisao monetaria: o save nao pode apagar compras confirmadas pelo Render.
-- Tambem protege mutacoes legadas feitas por SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.stellar_guard_purchase_revision_v227()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public,pg_temp AS $$
DECLARE old_rev numeric; new_rev numeric;
BEGIN
  IF NEW.state IS NULL OR jsonb_typeof(NEW.state)<>'object' THEN
     RAISE EXCEPTION 'SECURITY_SAVE_INVALID';
  END IF;
  IF NEW.state ? 'serverPurchaseRevision' AND
     jsonb_typeof(NEW.state->'serverPurchaseRevision')<>'number' THEN
     RAISE EXCEPTION 'SECURITY_PURCHASE_REVISION_INVALID';
  END IF;
  new_rev:=COALESCE((NEW.state->>'serverPurchaseRevision')::numeric,0);
  IF new_rev<0 OR new_rev>1000000000 OR new_rev<>trunc(new_rev) THEN
     RAISE EXCEPTION 'SECURITY_PURCHASE_REVISION_INVALID';
  END IF;
  IF TG_OP='UPDATE' THEN
    old_rev:=COALESCE((OLD.state->>'serverPurchaseRevision')::numeric,0);
    IF new_rev<old_rev THEN RAISE EXCEPTION 'SAVE_ECONOMY_STALE'; END IF;
    IF new_rev>old_rev+1 THEN RAISE EXCEPTION 'SECURITY_PURCHASE_REVISION_INVALID'; END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
  RAISE EXCEPTION 'SECURITY_PURCHASE_REVISION_INVALID';
END; $$;
DROP TRIGGER IF EXISTS stellar_purchase_revision_update_v227 ON public.game_saves;
DROP TRIGGER IF EXISTS stellar_purchase_revision_insert_v227 ON public.game_saves;
CREATE TRIGGER stellar_purchase_revision_update_v227
BEFORE UPDATE OF state ON public.game_saves
FOR EACH ROW EXECUTE FUNCTION public.stellar_guard_purchase_revision_v227();
CREATE TRIGGER stellar_purchase_revision_insert_v227
BEFORE INSERT ON public.game_saves
FOR EACH ROW EXECUTE FUNCTION public.stellar_guard_purchase_revision_v227();
REVOKE ALL ON FUNCTION public.stellar_guard_purchase_revision_v227() FROM PUBLIC,anon,authenticated;

COMMIT;
