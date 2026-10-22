-- V48 • Acesso ao Autopilot exclusivo por autorização do servidor.
-- Não libera pagamentos, Premium, passe nem compra na loja.
-- Seguro para executar novamente: não habilita nenhum jogador automaticamente.
BEGIN;
CREATE TABLE IF NOT EXISTS public.stellar_autopilot_access_v48 (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'admin' CHECK(source IN ('admin','verified_purchase')),
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);
ALTER TABLE public.stellar_autopilot_access_v48 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stellar_autopilot_access_v48 FROM PUBLIC,anon,authenticated;
-- Leitura/escrita exclusivamente pelo Render, através da service role.
-- A origem verified_purchase é reservada à futura confirmação segura de checkout;
-- não existe endpoint público que possa alterar source.
COMMIT;
