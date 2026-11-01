-- STELLAR LEGACY V113.0 • BALANCEAMENTO ONLINE (execute apenas 1 vez).
-- Bases: 43 naves/40 equipamentos, 34 NPCs, missões dinâmicas e temporada 2026-11.
-- Não altera jogadores, inventários, farms, recompensas já resgatadas ou slots de equipamentos.
-- Backup antes da mudança, RLS ativo e tabela fechada à API do cliente.
CREATE TABLE IF NOT EXISTS public.stellar_v113_balance_backup (
  source_name text NOT NULL, key text NOT NULL, old_row jsonb NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(source_name,key)
);
ALTER TABLE public.stellar_v113_balance_backup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stellar_v113_balance_backup FROM anon, authenticated;

DO $v113$
DECLARE recorded boolean;
BEGIN
 SELECT EXISTS(SELECT 1 FROM public.stellar_v113_balance_backup WHERE source_name='_v113' AND key='applied') INTO recorded;
 IF recorded THEN RAISE NOTICE 'V113 ja aplicada; SQL idempotente.'; RETURN; END IF;
 IF (SELECT count(*) FROM public.game_npc_config_v1811 WHERE enabled) < 30
    OR (SELECT count(*) FROM public.game_balance_entries_v1909 WHERE kind='ship') < 40
    OR NOT EXISTS(SELECT 1 FROM public.game_battle_pass_seasons_v1817b WHERE season_key='2026-11')
 THEN RAISE EXCEPTION 'CATALOGO_V113_INCOMPLETO: revise as tabelas antes de balancear'; END IF;

 INSERT INTO public.stellar_v113_balance_backup(source_name,key,old_row)
 SELECT 'npc',npc_key,to_jsonb(n) FROM public.game_npc_config_v1811 n
 WHERE (npc_key='apexOverlord' OR npc_key LIKE 'boss%' OR (hp+shield)>=500000) AND enabled
 ON CONFLICT DO NOTHING;
 INSERT INTO public.stellar_v113_balance_backup(source_name,key,old_row)
 SELECT kind, item_id,to_jsonb(b) FROM public.game_balance_entries_v1909 b
 WHERE (kind='ship' AND item_id=ANY(ARRAY['phoenix','liberator','piranha','nostromo','bigboy','nDiplomat','nEnvoy','nAmbassador']))
 OR (kind='item' AND item_id=ANY(ARRAY['lf1','lf2','lf3','lf4','sg3na01','sg3na02','sg3na03','fs01']))
 ON CONFLICT DO NOTHING;
 INSERT INTO public.stellar_v113_balance_backup(source_name,key,old_row)
 SELECT 'mission', category,to_jsonb(m) FROM public.game_mission_category_v1815 m WHERE enabled
 ON CONFLICT DO NOTHING;
 INSERT INTO public.stellar_v113_balance_backup(source_name,key,old_row)
 SELECT 'pass',season_key,to_jsonb(s) FROM public.game_battle_pass_seasons_v1817b s WHERE season_key='2026-11'
 ON CONFLICT DO NOTHING;
 INSERT INTO public.stellar_v113_balance_backup(source_name,key,old_row)
 SELECT 'balance_meta',id::text,to_jsonb(m) FROM public.game_balance_meta_v1909 m WHERE id=1
 ON CONFLICT DO NOTHING;

 -- NPCs altos: pequena redução de inflação CR/STL e ganho proporcional de XP.
 -- Chefes Prime e Apex ganham melhor relação recompensa/risco, sem acelerar respawn.
 UPDATE public.game_npc_config_v1811 n SET
   hp=CASE WHEN npc_key='apexOverlord' THEN round(hp*1.06)::bigint WHEN npc_key LIKE 'boss%' THEN round(hp*1.05)::bigint ELSE round(hp*1.02)::bigint END,
   shield=CASE WHEN npc_key='apexOverlord' THEN round(shield*1.06)::bigint WHEN npc_key LIKE 'boss%' THEN round(shield*1.05)::bigint ELSE round(shield*1.02)::bigint END,
   damage=CASE WHEN npc_key='apexOverlord' THEN round(damage*1.06)::bigint WHEN npc_key LIKE 'boss%' THEN round(damage*1.03)::bigint ELSE damage END,
   credits=CASE WHEN npc_key='apexOverlord' THEN round(credits*1.28)::bigint WHEN npc_key LIKE 'boss%' THEN round(credits*1.12)::bigint ELSE round(credits*.93)::bigint END,
   stl=CASE WHEN npc_key='apexOverlord' THEN round(stl*1.20)::bigint WHEN npc_key LIKE 'boss%' THEN round(stl*1.10)::bigint ELSE round(stl*.96)::bigint END,
   xp=CASE WHEN npc_key='apexOverlord' THEN round(xp*1.25)::bigint WHEN npc_key LIKE 'boss%' THEN round(xp*1.14)::bigint ELSE round(xp*1.06)::bigint END,
   updated_at=now()
 WHERE enabled AND (npc_key='apexOverlord' OR npc_key LIKE 'boss%' OR (hp+shield)>=500000);

 -- Naves: progressão inicial/intermediária mais sustentável. NÃO alterar lasers/geradores/extras.
 UPDATE public.game_balance_entries_v1909 b SET
 params=b.params || CASE item_id
  WHEN 'phoenix' THEN jsonb_build_object('hp',118000,'cargo',150)
  WHEN 'liberator' THEN jsonb_build_object('hp',155000,'speed',315)
  WHEN 'piranha' THEN jsonb_build_object('hp',198000,'cargo',720)
  WHEN 'nostromo' THEN jsonb_build_object('hp',265000,'cargo',1050)
  WHEN 'bigboy' THEN jsonb_build_object('hp',415000,'speed',265)
  WHEN 'nDiplomat' THEN jsonb_build_object('hp',340000)
  WHEN 'nEnvoy' THEN jsonb_build_object('hp',365000)
  WHEN 'nAmbassador' THEN jsonb_build_object('hp',430000)
  ELSE '{}'::jsonb END, updated_at=now()
 WHERE kind='ship' AND item_id=ANY(ARRAY['phoenix','liberator','piranha','nostromo','bigboy','nDiplomat','nEnvoy','nAmbassador']);

 -- Drones preservam 1/2 slots. Ganhos vêm dos equipamentos; não aumenta multiplicador duplicado.
 UPDATE public.game_balance_entries_v1909 b SET
 params=b.params||CASE item_id
  WHEN 'lf1' THEN jsonb_build_object('damage',82,'description','Laser ARC-1 • dano 82 (V113).')
  WHEN 'lf2' THEN jsonb_build_object('damage',168,'description','Laser ARC-2 • dano 168 (V113).')
  WHEN 'lf3' THEN jsonb_build_object('damage',195,'description','Laser Elite ARC-3 • dano 195 • +8% contra aliens.')
  WHEN 'lf4' THEN jsonb_build_object('damage',238,'description','Laser Elite ARC-4 • dano 238.')
  WHEN 'sg3na01' THEN jsonb_build_object('shield',1750,'description','VSH-1 • 1.750 escudo • 45% absorção.')
  WHEN 'sg3na02' THEN jsonb_build_object('shield',5400,'description','VSH-2 • 5.400 escudo • 55% absorção.')
  WHEN 'sg3na03' THEN jsonb_build_object('shield',8100,'description','VSH-3 • 8.100 escudo • 60% absorção.')
  WHEN 'fs01' THEN jsonb_build_object('shield',5900,'description','AEG-1 • 5.900 escudo • 70% absorção.')
  ELSE '{}'::jsonb END,updated_at=now()
 WHERE kind='item' AND item_id=ANY(ARRAY['lf1','lf2','lf3','lf4','sg3na01','sg3na02','sg3na03','fs01']);

 -- Missões gerenciadas pelo ADM: mais acessíveis no início; recompensas e marcos proporcionais.
 UPDATE public.game_mission_category_v1815 m SET
  reward_factor=CASE category WHEN 'daily' THEN .62 WHEN 'weekly' THEN .90 WHEN 'monthly' THEN 1.10 WHEN 'special' THEN 1.28 ELSE reward_factor END,
  item_chance=CASE category WHEN 'daily' THEN .50 WHEN 'weekly' THEN .60 WHEN 'monthly' THEN .78 WHEN 'special' THEN .88 ELSE item_chance END,
  config=CASE WHEN category='daily' THEN config||jsonb_build_object(
    'hunt_boss_target',16,'hunt_normal_target',60,'combo_normal_target',32,'combo_boss_target',6,'ore_target',450) ELSE config END,
  updated_at=now()
 WHERE enabled AND category IN ('daily','weekly','monthly','special');

 -- Próxima temporada: 30 tiers x 450 = 13.500 pts (19,29 dias com sete dailies FREE).
 -- Nenhum tier/passe já comprado é regravado. Manter recompensa do tier30 conquistável.
 UPDATE public.game_battle_pass_seasons_v1817b SET points_per_tier=450,updated_at=now()
 WHERE season_key='2026-11' AND tier_count=30 AND enabled;
 UPDATE public.game_balance_meta_v1909 SET version=version+1,updated_at=now() WHERE id=1;

 INSERT INTO public.stellar_v113_balance_backup(source_name,key,old_row)
 VALUES('_v113','applied',jsonb_build_object('installed_at',now(),'version','V113.0','notes','progression and combat rebalance'));
END
$v113$;
