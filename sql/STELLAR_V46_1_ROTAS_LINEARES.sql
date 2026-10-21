BEGIN;
-- Stellar Legacy V46.1: topologia linear PvE / PvP somente a partir de X-1 da propria faccao.
-- Preserva U-1/U-2/U-3, posicoes da base, saves, NPCs, relés, loot, pagamentos e níveis.
DO $$ BEGIN
 IF (SELECT COUNT(*) FROM public.game_sector_nodes_v1814 WHERE enabled AND sector_label ~ '^([123]-[1-8]|4-[1-3]|U-[123])$') <> 30 THEN
  RAISE EXCEPTION 'V461_SECTORS_INCOMPLETE'; END IF;
 IF (SELECT COUNT(*) FROM public.game_portal_links_v1814 WHERE portal_key IN
 ('stellar_u440_earth','stellar_u440_mars','stellar_u440_jupiter','stellar_u440_veil_ion','stellar_u440_ion_void') AND enabled)<>5 THEN
  RAISE EXCEPTION 'V461_FRONTIER_LINKS_MISSING'; END IF;
END $$;
-- Apenas pares entre X-1..X-8 e 4-1..4-3: qualquer atalho não aprovado fica desativado e reversível.
-- Os cinco links envolvendo U permanecem intocados, com disposição inalterada dentro dos U.
WITH desired(a,b) AS (
 SELECT f::text||'-'||i::text, f::text||'-'||(i+1)::text
 FROM generate_series(1,3) AS f CROSS JOIN generate_series(1,7) AS i
 UNION ALL VALUES ('1-1','4-1'),('2-1','4-2'),('3-1','4-3'),
                  ('4-1','4-2'),('4-1','4-3'),('4-2','4-3')
)
UPDATE public.game_portal_links_v1814 p
SET enabled=EXISTS(SELECT 1 FROM desired d WHERE (p.from_sector=d.a AND p.to_sector=d.b) OR (p.bidirectional AND p.from_sector=d.b AND p.to_sector=d.a)),
    updated_at=now()
WHERE p.from_sector ~ '^([123]-[1-8]|4-[1-3])$'
  AND p.to_sector ~ '^([123]-[1-8]|4-[1-3])$'
  AND p.enabled IS DISTINCT FROM EXISTS(SELECT 1 FROM desired d WHERE (p.from_sector=d.a AND p.to_sector=d.b) OR (p.bidirectional AND p.from_sector=d.b AND p.to_sector=d.a));
-- Garante as 27 conexões previstas mesmo em instalações com rotas antigas ausentes.
WITH desired(a,b,ord) AS (
 SELECT f::text||'-'||i::text,f::text||'-'||(i+1)::text,4600+f*100+i
 FROM generate_series(1,3) AS f CROSS JOIN generate_series(1,7) AS i
 UNION ALL VALUES ('1-1','4-1',4911),('2-1','4-2',4912),('3-1','4-3',4913),
                  ('4-1','4-2',4941),('4-1','4-3',4942),('4-2','4-3',4943)
)
INSERT INTO public.game_portal_links_v1814(portal_key,from_sector,to_sector,bidirectional,enabled,sort_order)
SELECT 'stellar_v461_'||replace(d.a,'-','_')||'__'||replace(d.b,'-','_'),d.a,d.b,true,true,d.ord FROM desired d
WHERE NOT EXISTS(SELECT 1 FROM public.game_portal_links_v1814 p WHERE
 p.from_sector=d.a AND p.to_sector=d.b AND p.enabled AND p.bidirectional
 OR p.from_sector=d.b AND p.to_sector=d.a AND p.enabled AND p.bidirectional)
ON CONFLICT(portal_key) DO UPDATE SET bidirectional=true,enabled=true,updated_at=now();
-- Falha fechada caso alguma conexão não aprovada permaneça habilitada.
DO $$ DECLARE wrong_links int; good_links int; BEGIN
 WITH desired(a,b) AS (
 SELECT f::text||'-'||i::text,f::text||'-'||(i+1)::text FROM generate_series(1,3) f CROSS JOIN generate_series(1,7) i
 UNION ALL VALUES ('1-1','4-1'),('2-1','4-2'),('3-1','4-3'),('4-1','4-2'),('4-1','4-3'),('4-2','4-3'))
 SELECT count(*) FILTER(WHERE NOT EXISTS(SELECT 1 FROM desired d WHERE
 (p.from_sector=d.a AND p.to_sector=d.b) OR (p.bidirectional AND p.from_sector=d.b AND p.to_sector=d.a))),
 count(*) FILTER(WHERE EXISTS(SELECT 1 FROM desired d WHERE
 (p.from_sector=d.a AND p.to_sector=d.b) OR (p.bidirectional AND p.from_sector=d.b AND p.to_sector=d.a)))
 INTO wrong_links,good_links FROM public.game_portal_links_v1814 p
 WHERE p.enabled AND p.from_sector ~ '^([123]-[1-8]|4-[1-3])$' AND p.to_sector ~ '^([123]-[1-8]|4-[1-3])$';
 IF wrong_links<>0 OR good_links<>27 THEN RAISE EXCEPTION 'V461_TOPOLOGY_INVALID: off-route %, expected 27 got %',wrong_links,good_links; END IF;
END $$;
UPDATE public.game_runtime_meta_v1810 SET version=version+1,updated_at=now() WHERE config_key='world';
COMMIT;
