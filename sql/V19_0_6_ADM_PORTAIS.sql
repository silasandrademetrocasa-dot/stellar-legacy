-- Stellar Legacy V19.0.6 — Fase 2 / Portais Astrais
-- Execute UMA VEZ no Supabase antes de publicar o codigo V19.0.6.
-- Nao altera os saves dos jogadores ou a estrutura do materializador antigo.
BEGIN;
CREATE TABLE IF NOT EXISTS public.galaxy_gate_config_v1906 (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id=1),
  config jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(config)='object'),
  version bigint NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
ALTER TABLE public.galaxy_gate_config_v1906 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.galaxy_gate_config_v1906 FROM PUBLIC,anon,authenticated;
INSERT INTO public.galaxy_gate_config_v1906(id,config) VALUES(1,'{}'::jsonb)
ON CONFLICT(id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_galaxy_gate_config_v1906()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $fn$
DECLARE v_result jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sessao necessaria.' USING ERRCODE='42501'; END IF;
 SELECT jsonb_build_object('version',version,'updated_at',updated_at,'config',config)
   INTO v_result FROM public.galaxy_gate_config_v1906 WHERE id=1;
 RETURN COALESCE(v_result,'{"version":0,"config":{}}'::jsonb);
END;$fn$;
REVOKE ALL ON FUNCTION public.get_galaxy_gate_config_v1906() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_galaxy_gate_config_v1906() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_galaxy_gate_config_v1906(p_key text,p_gate jsonb)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path TO ''
AS $fn$
DECLARE
 v_round jsonb; v_wave jsonb; v_reward jsonb; v_key text; v_number numeric;
 v_i integer; v_j integer; v_count integer; v_total integer:=0;
 v_npcs text[]:=ARRAY['streuner','recruitStreuner','aiderStreuner','lordakia','saimon','mordon','devolarium','sibelon','bossLordakia','bossSaimon','bossMordon','bossDevolarium','bossSibelon'];
 v_out jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_game_admin_v1763(auth.uid()) THEN
   RAISE EXCEPTION 'Permissao administrativa negada.' USING ERRCODE='42501';
 END IF;
 IF p_key NOT IN ('alpha','beta','gamma') OR jsonb_typeof(p_gate)<>'object'
   OR jsonb_typeof(p_gate->'rounds')<>'array' THEN
   RAISE EXCEPTION 'Portal/estrutura invalidos.';
 END IF;
 IF jsonb_array_length(p_gate->'rounds') NOT BETWEEN 1 AND 20 THEN
   RAISE EXCEPTION 'Informe entre 1 e 20 rounds.';
 END IF;
 FOREACH v_key IN ARRAY ARRAY['waveIntervalMs','roundIntervalMs'] LOOP
   IF coalesce(p_gate->>v_key,'') !~ '^[0-9]{4,6}$' THEN RAISE EXCEPTION 'Tempo % invalido.',v_key; END IF;
   IF (p_gate->>v_key)::integer NOT BETWEEN 2000 AND 120000 THEN RAISE EXCEPTION 'Tempo % fora do limite.',v_key; END IF;
 END LOOP;
 FOREACH v_key IN ARRAY ARRAY['enemyScale','damageScale','rewardScale','totalRewardMult'] LOOP
   IF coalesce(p_gate->>v_key,'') !~ '^[0-9]{1,2}(\.[0-9]{1,2})?$' THEN RAISE EXCEPTION 'Escala % invalida.',v_key; END IF;
   v_number:=(p_gate->>v_key)::numeric;
   IF v_number<0.25 OR v_number>3 THEN RAISE EXCEPTION 'Escala % fora de 0.25..3.',v_key; END IF;
 END LOOP;
 FOR v_i IN 0..jsonb_array_length(p_gate->'rounds')-1 LOOP
   v_round:=p_gate->'rounds'->v_i;
   IF jsonb_typeof(v_round)<>'object' OR length(coalesce(v_round->>'name','')) NOT BETWEEN 1 AND 60
     OR jsonb_typeof(v_round->'waves')<>'array' THEN RAISE EXCEPTION 'Round % invalido.',v_i+1; END IF;
   IF jsonb_array_length(v_round->'waves') NOT BETWEEN 1 AND 12 THEN RAISE EXCEPTION 'Round %: configure 1 a 12 ondas.',v_i+1; END IF;
   FOR v_j IN 0..jsonb_array_length(v_round->'waves')-1 LOOP
     v_wave:=v_round->'waves'->v_j;
     IF jsonb_typeof(v_wave)<>'object' OR NOT (coalesce(v_wave->>'type','')=ANY(v_npcs))
       OR coalesce(v_wave->>'count','') !~ '^[0-9]{1,2}$' THEN
       RAISE EXCEPTION 'NPC/quantidade invalidos no round %, onda %.',v_i+1,v_j+1;
     END IF;
     v_count:=(v_wave->>'count')::integer;
     IF v_count NOT BETWEEN 1 AND 15 THEN RAISE EXCEPTION 'Quantidade permitida: 1 a 15 NPCs por onda.'; END IF;
     v_total:=v_total+v_count;
   END LOOP;
 END LOOP;
 IF v_total>240 THEN RAISE EXCEPTION 'Maximo de 240 NPCs somados por portal.'; END IF;
 FOR v_reward IN SELECT p_gate->'roundReward' UNION ALL SELECT p_gate->'finalReward' LOOP
   IF jsonb_typeof(v_reward)<>'object' THEN RAISE EXCEPTION 'Recompensa invalida.'; END IF;
   FOREACH v_key IN ARRAY ARRAY['credits','uridium','cores','ammoQty','rocketQty','voidite'] LOOP
     IF coalesce(v_reward->>v_key,'') !~ '^[0-9]{1,11}$' THEN RAISE EXCEPTION 'Quantidade % invalida.',v_key; END IF;
     v_number:=(v_reward->>v_key)::numeric;
     IF v_number>(CASE v_key WHEN 'credits' THEN 100000000 WHEN 'uridium' THEN 100000 WHEN 'cores' THEN 1000 WHEN 'ammoQty' THEN 50000 WHEN 'rocketQty' THEN 2000 WHEN 'voidite' THEN 500 ELSE 0 END) THEN
       RAISE EXCEPTION 'Recompensa % acima do limite.',v_key;
     END IF;
   END LOOP;
   IF coalesce(v_reward->>'ammoId','') NOT IN ('','lcb10','mcb25','mcb50','ucb100','sab50')
    OR coalesce(v_reward->>'rocketId','') NOT IN ('','r310','plt2026','plt2021','plt3030') THEN
    RAISE EXCEPTION 'Tipo de municao/missil invalido.';
   END IF;
 END LOOP;
 -- Salva somente as chaves permitidas; o servidor valida o mesmo contrato antes do POST.
 UPDATE public.galaxy_gate_config_v1906 SET
   config=jsonb_set(config,ARRAY[p_key],jsonb_build_object(
    'rounds',p_gate->'rounds','waveIntervalMs',(p_gate->>'waveIntervalMs')::integer,
    'roundIntervalMs',(p_gate->>'roundIntervalMs')::integer,
    'enemyScale',(p_gate->>'enemyScale')::numeric,
    'damageScale',(p_gate->>'damageScale')::numeric,
    'rewardScale',(p_gate->>'rewardScale')::numeric,
    'totalRewardMult',(p_gate->>'totalRewardMult')::numeric,
    'roundReward',p_gate->'roundReward','finalReward',p_gate->'finalReward'),true),
   version=version+1,updated_at=now(),updated_by=auth.uid()
 WHERE id=1;
 RETURN public.get_galaxy_gate_config_v1906();
END;$fn$;
REVOKE ALL ON FUNCTION public.admin_update_galaxy_gate_config_v1906(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_update_galaxy_gate_config_v1906(text,jsonb) TO authenticated;

-- Vida adicional sempre: 10.000 STL, para todos os tres protocolos.
UPDATE public.live_shop_prices_v16
 SET price=10000,currency='uridium',updated_at=now()
 WHERE catalog_key IN ('gate_life:alpha','gate_life:beta','gate_life:gamma')
   AND kind='gate_life';
COMMIT;
