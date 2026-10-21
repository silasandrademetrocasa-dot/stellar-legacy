-- Stellar Legacy V47.7 — Bot Wars (default OFF)
-- Executar no Supabase SQL Editor ANTES do deploy da V47.7.
-- Sem modificações em saves, saldos, NPCs existentes, Warfront A/B/C ou preços.
BEGIN;
CREATE TABLE IF NOT EXISTS public.stellar_warbot_events_v477 (
  map_id text PRIMARY KEY CHECK (map_id IN ('b41','b42','b43')),
  enabled boolean NOT NULL DEFAULT false,
  mode text NOT NULL DEFAULT 'training' CHECK (mode IN ('training','conquest')),
  bots_per_faction integer NOT NULL DEFAULT 2 CHECK (bots_per_faction BETWEEN 1 AND 4),
  tier integer NOT NULL DEFAULT 1 CHECK (tier BETWEEN 1 AND 3),
  attack_players boolean NOT NULL DEFAULT false,
  ends_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT warbot_duration_requires_end CHECK (NOT enabled OR ends_at IS NOT NULL),
  CONSTRAINT warbot_training_nonlethal CHECK (NOT attack_players OR mode='conquest')
);
ALTER TABLE public.stellar_warbot_events_v477 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stellar_warbot_events_v477 FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.stellar_warbot_events_v477 TO service_role;
INSERT INTO public.stellar_warbot_events_v477(map_id,enabled,mode,bots_per_faction,tier,attack_players)
VALUES ('b41',false,'training',2,1,false),('b42',false,'training',2,1,false),('b43',false,'training',2,1,false)
ON CONFLICT (map_id) DO NOTHING;
COMMIT;
-- Verificação:
-- SELECT map_id,enabled,mode,bots_per_faction,tier,attack_players,ends_at FROM public.stellar_warbot_events_v477 ORDER BY map_id;
