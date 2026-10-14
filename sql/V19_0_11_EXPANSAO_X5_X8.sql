-- V19.0.11 | EXPANSÃO X-5 a X-8 por facção, 8 NPCs, 2ª base no X-8
-- APENAS INSERTS AUSENTES: não reconfigura mapas, preços, NPCs anteriores, saves ou usuários.
BEGIN;

insert into public.game_map_config_v1814(map_id,label,tier,name,risk,world_w,world_h,enemy_multiplier,ore_count,ore_respawn_min_ms,ore_respawn_max_ms,landmark_count,min_level,battle,gate,enabled,palette,structures) values
('x5',null,5,'Véu da Fenda','Alto',8400,6100,1,74,6000,14000,10,18,false,false,true,'{"accent": "#51e5ff", "deep": "#030b13", "nebula": "#133948"}'::jsonb,'["Portal 4-X", "Portal X-6"]'::jsonb),
('x6',null,6,'Desfiladeiro Vazio','Crítico',8900,6500,1,81,6000,14000,11,22,false,false,true,'{"accent": "#d28fff", "deep": "#0b0517", "nebula": "#3a1d50"}'::jsonb,'["Portal X-5", "Portal X-7"]'::jsonb),
('x7',null,7,'Coração do Nexus','Extremo',9400,6900,1,88,6000,14000,12,27,false,false,true,'{"accent": "#8cffb5", "deep": "#030d0b", "nebula": "#134637"}'::jsonb,'["Portal X-6", "Portal X-8"]'::jsonb),
('x8',null,8,'Bastião Astral','Extremo',10000,7400,1,94,6000,14000,13,32,false,false,true,'{"accent": "#ff947b", "deep": "#120611", "nebula": "#4e243d"}'::jsonb,'["Portal X-7", "Base Avançada", "Trader", "Hangar", "Reparação", "Mission Control"]'::jsonb)
on conflict do nothing;

insert into public.game_map_resource_pool_v1814(map_id,resource_key,weight,enabled) values
('x5','Endurium',1,true),
('x5','Terbium',1,true),
('x5','Prometid',1,true),
('x6','Terbium',1,true),
('x6','Prometid',1,true),
('x6','Duranium',1,true),
('x7','Duranium',1,true),
('x7','Promerium',1,true),
('x7','Terbium',1,true),
('x8','Duranium',1,true),
('x8','Promerium',1,true),
('x8','Terbium',1,true)
on conflict do nothing;

insert into public.game_sector_nodes_v1814(sector_label,map_id,territory_faction,graph_x,graph_y,min_level,enabled) values
('1-5','x5','earth',24,36,18,true),
('2-5','x5','mars',51,9,18,true),
('3-5','x5','jupiter',53,93,18,true),
('1-6','x6','earth',13,28,22,true),
('2-6','x6','mars',66,9,22,true),
('3-6','x6','jupiter',66,93,22,true),
('1-7','x7','earth',10,15,27,true),
('2-7','x7','mars',79,9,27,true),
('3-7','x7','jupiter',79,93,27,true),
('1-8','x8','earth',29,11,32,true),
('2-8','x8','mars',95,5,32,true),
('3-8','x8','jupiter',94,96,32,true)
on conflict do nothing;

insert into public.game_portal_links_v1814(portal_key,from_sector,to_sector,bidirectional,enabled,sort_order) values
('p_v1911_4_1_1_5','4-1','1-5',true,true,200),
('p_v1911_1_5_1_6','1-5','1-6',true,true,210),
('p_v1911_1_6_1_7','1-6','1-7',true,true,220),
('p_v1911_1_7_1_8','1-7','1-8',true,true,230),
('p_v1911_4_2_2_5','4-2','2-5',true,true,240),
('p_v1911_2_5_2_6','2-5','2-6',true,true,250),
('p_v1911_2_6_2_7','2-6','2-7',true,true,260),
('p_v1911_2_7_2_8','2-7','2-8',true,true,270),
('p_v1911_4_3_3_5','4-3','3-5',true,true,280),
('p_v1911_3_5_3_6','3-5','3-6',true,true,290),
('p_v1911_3_6_3_7','3-6','3-7',true,true,300),
('p_v1911_3_7_3_8','3-7','3-8',true,true,310),
('p_v1911_3_4_4_3','3-4','4-3',true,true,330)
on conflict do nothing;

insert into public.game_npc_config_v1811(npc_key,name,hp,shield,credits,stl,xp,speed,damage,color,size,resources,respawn_min_ms,respawn_max_ms,enabled) values
('riftScout','Batedor da Fenda',270000,175000,700000,550,15500,86,4600,'#4bdaff',32,'{"Duranium": 30, "Promerium": 6, "Prometid": 26}'::jsonb,8000,18000,true),
('bossRiftScout','Batedor da Fenda Prime',510000,360000,1550000,950,34000,75,8500,'#8ceaff',44,'{"Duranium": 30, "Promerium": 6, "Prometid": 26}'::jsonb,8000,18000,true),
('voidCorsair','Corsário do Vazio',420000,350000,1100000,800,23500,92,6700,'#e58cff',35,'{"Duranium": 30, "Promerium": 6, "Prometid": 26}'::jsonb,8000,18000,true),
('bossVoidCorsair','Corsário do Vazio Prime',820000,650000,2250000,1450,48000,70,12800,'#ff9fd0',48,'{"Duranium": 30, "Promerium": 6, "Prometid": 26}'::jsonb,8000,18000,true),
('nexusWarden','Guardião Nexus',660000,550000,1700000,1200,38000,80,9400,'#7fffbb',40,'{"Duranium": 30, "Promerium": 6, "Prometid": 26}'::jsonb,8000,18000,true),
('bossNexusWarden','Guardião Nexus Prime',1250000,1050000,3650000,2150,79000,65,17800,'#ffe08b',53,'{"Duranium": 30, "Promerium": 6, "Prometid": 26}'::jsonb,8000,18000,true),
('astralReaper','Ceifador Astral',920000,780000,2400000,1700,60000,100,13200,'#fe877a',44,'{"Duranium": 30, "Promerium": 6, "Prometid": 26}'::jsonb,8000,18000,true),
('bossAstralReaper','Ceifador Astral Prime',1850000,1550000,4900000,3100,125000,80,24800,'#fb4a8f',61,'{"Duranium": 30, "Promerium": 6, "Prometid": 26}'::jsonb,8000,18000,true)
on conflict do nothing;

insert into public.game_map_npc_spawns_v1811(map_id,npc_key,spawn_count,enabled) values
('x5','sibelon',6,true),
('x5','bossSibelon',2,true),
('x5','riftScout',10,true),
('x5','bossRiftScout',2,true),
('x6','riftScout',7,true),
('x6','bossRiftScout',3,true),
('x6','voidCorsair',9,true),
('x6','bossVoidCorsair',2,true),
('x7','voidCorsair',8,true),
('x7','bossVoidCorsair',3,true),
('x7','nexusWarden',8,true),
('x7','bossNexusWarden',2,true),
('x8','nexusWarden',7,true),
('x8','bossNexusWarden',3,true),
('x8','astralReaper',7,true),
('x8','bossAstralReaper',2,true)
on conflict do nothing;

DO $assert$
BEGIN
 IF (SELECT count(*) FROM public.game_map_config_v1814 WHERE map_id IN ('x5','x6','x7','x8')) <> 4 THEN RAISE EXCEPTION 'Falha: mapas incompletos';END IF;
 IF (SELECT count(*) FROM public.game_sector_nodes_v1814 WHERE sector_label IN ('1-5','1-6','1-7','1-8','2-5','2-6','2-7','2-8','3-5','3-6','3-7','3-8')) <> 12 THEN RAISE EXCEPTION 'Falha: 12 setores esperados';END IF;
 IF (SELECT count(*) FROM public.game_portal_links_v1814 WHERE portal_key LIKE 'p_v1911_%')<>13 THEN RAISE EXCEPTION 'Falha: 13 portais esperados';END IF;
 IF (SELECT count(*) FROM public.game_npc_config_v1811 WHERE npc_key IN ('riftScout','bossRiftScout','voidCorsair','bossVoidCorsair','nexusWarden','bossNexusWarden','astralReaper','bossAstralReaper'))<>8 THEN RAISE EXCEPTION 'Falha: 8 NPCs esperados';END IF;
 IF (SELECT count(*) FROM public.game_map_npc_spawns_v1811 WHERE map_id IN ('x5','x6','x7','x8'))<>16 THEN RAISE EXCEPTION 'Falha: 16 populações esperadas';END IF;
END;
$assert$;
COMMIT;
