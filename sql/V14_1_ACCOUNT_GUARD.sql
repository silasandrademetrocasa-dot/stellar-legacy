-- Stellar Legacy V14.1.0 — ACCOUNT GUARD + UNIQUE CALLSIGN
-- Execute uma vez no Supabase SQL Editor antes de liberar novos cadastros/renomes.

-- 1) Pré-validação: não altera jogadores existentes silenciosamente.
DO $$
DECLARE dupes text;
BEGIN
  SELECT string_agg(k || ' (' || n || 'x)', ', ') INTO dupes
  FROM (
    SELECT lower(btrim(callsign)) k, count(*) n
    FROM public.profiles
    WHERE callsign is not null AND btrim(callsign) <> ''
    GROUP BY lower(btrim(callsign))
    HAVING count(*) > 1
  ) d;
  IF dupes IS NOT NULL THEN
    RAISE EXCEPTION 'Existem callsigns duplicados antes da V14.1: %. Renomeie os duplicados e execute novamente.', dupes;
  END IF;
END $$;

-- 2) Garantia definitiva no banco: case-insensitive e ignorando espaços nas pontas.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_callsign_unique_ci_v141
  ON public.profiles ((lower(btrim(callsign))))
  WHERE callsign IS NOT NULL AND btrim(callsign) <> '';

-- 3) Consulta segura de disponibilidade sem expor a tabela de perfis.
CREATE OR REPLACE FUNCTION public.callsign_available_v141(p_callsign text, p_exclude_user uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path=public,auth
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE lower(btrim(p.callsign)) = lower(btrim(coalesce(p_callsign,'')))
      AND (p_exclude_user IS NULL OR p.id <> p_exclude_user)
  );
$$;

REVOKE ALL ON FUNCTION public.callsign_available_v141(text,uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.callsign_available_v141(text,uuid) TO anon, authenticated, service_role;

-- Diagnóstico final: deve retornar zero linhas.
SELECT lower(btrim(callsign)) AS callsign_normalizado, count(*) AS quantidade
FROM public.profiles
WHERE callsign IS NOT NULL AND btrim(callsign) <> ''
GROUP BY lower(btrim(callsign))
HAVING count(*) > 1;

-- 4) Benefício comercial V14.1: AUTO-COMBATE em PREMIUM e PASSE MENSAL.
UPDATE public.premium_catalog_v12
SET description='AUTO-COMBATE, reparo gratuito da nave, regeneração HP/ESC 2x, míssil 20% mais rápido, -5% em itens Elite e -10% no Materializador.'
WHERE id='premium_30d';

UPDATE public.premium_catalog_v12
SET description='Libera a trilha Premium da temporada atual, recompensas premium e AUTO-COMBATE durante a temporada.'
WHERE id='battle_pass_monthly';
