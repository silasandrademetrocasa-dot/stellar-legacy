-- V67 — Catálogo oficial de NPCs Stellar Legacy
-- Execute no SQL Editor do Supabase.

begin;

-- 1) Atualiza / cria catálogo de NPCs.
insert into public.game_npc_config_v1811(npc_key,name,hp,shield,credits,stl,xp,speed,damage,color,size,resources,respawn_min_ms,respawn_max_ms,enabled) values
('streuner','Scavenger',900,500,6000,12,180,68,95,'#ff8b75',14,'{"Prometium":12,"Endurium":12}'::jsonb,6000,12000,true),
('recruitStreuner','Scavenger Scout',1100,700,8500,16,240,90,130,'#ff9b6f',15,'{"Prometium":14,"Endurium":14}'::jsonb,6000,12000,true),
('aiderStreuner','Scavenger Support',1500,1000,12000,25,340,72,210,'#ffbb62',16,'{"Prometium":15,"Terbium":15}'::jsonb,6500,12500,true),
('bossStreuner','Scavenger Prime',1600,800,15000,30,400,62,120,'#ff5e6e',19,'{"Prometium":20,"Terbium":20}'::jsonb,9000,15000,true),
('lordakia','Vrax',2000,2000,18000,30,480,95,240,'#9f73ff',18,'{"Prometium":20,"Terbium":20,"Endurium":20}'::jsonb,7000,13000,true),
('bossLordakia','Vrax Prime',4000,4000,36000,60,960,95,480,'#c765ff',22,'{"Prometium":40,"Terbium":40,"Endurium":40,"Xenomit":1}'::jsonb,9000,15000,true),
('saimon','Zyron',6000,6000,35000,45,960,82,600,'#55e2ff',20,'{"Prometium":40,"Terbium":40,"Endurium":40,"Prometid":2,"Duranium":2}'::jsonb,8000,14000,true),
('bossSaimon','Zyron Prime',12000,12000,70000,90,1920,82,1200,'#24b0ff',25,'{"Prometium":80,"Terbium":80,"Endurium":80,"Prometid":4,"Duranium":4,"Xenomit":2}'::jsonb,10000,16000,true),
('mordon','Kharon',20000,10000,90000,100,2400,52,1170,'#ffa34d',25,'{"Prometium":80,"Terbium":80,"Endurium":80,"Prometid":8,"Duranium":8,"Promerium":1}'::jsonb,10000,16000,true),
('bossMordon','Kharon Prime',40000,20000,180000,200,4800,52,2340,'#ff6948',31,'{"Prometium":160,"Terbium":160,"Endurium":160,"Prometid":16,"Duranium":16,"Promerium":2,"Xenomit":4}'::jsonb,11000,18000,true),
('devolarium','Dreadnox',100000,100000,300000,250,7200,38,3600,'#7edcff',32,'{"Prometium":100,"Terbium":100,"Endurium":100,"Prometid":16,"Duranium":16,"Promerium":2}'::jsonb,13000,20000,true),
('bossDevolarium','Dreadnox Prime',200000,200000,600000,500,14400,38,7200,'#c8f0ff',40,'{"Prometium":200,"Terbium":200,"Endurium":200,"Prometid":32,"Duranium":32,"Promerium":4,"Xenomit":8}'::jsonb,15000,22000,true),
('sibelon','Colossar',200000,200000,650000,400,12000,30,7950,'#66ffcb',36,'{"Prometium":200,"Terbium":200,"Endurium":200,"Prometid":32,"Duranium":32,"Promerium":4}'::jsonb,16000,24000,true),
('bossSibelon','Colossar Prime',400000,400000,1300000,800,24000,30,15900,'#19d59d',45,'{"Prometium":400,"Terbium":400,"Endurium":400,"Prometid":64,"Duranium":64,"Promerium":8,"Xenomit":16}'::jsonb,18000,26000,true),
('emberFang','Ember Fang',230000,150000,620000,420,14500,88,4200,'#ff6d5d',32,'{"Prometid":18,"Duranium":18,"Promerium":3}'::jsonb,14000,22000,true),
('bossEmberFang','Ember Fang Prime',460000,300000,1250000,850,30000,78,7800,'#ff8c75',42,'{"Prometid":28,"Duranium":28,"Promerium":6,"Xenomit":2}'::jsonb,17000,25000,true),
('ironWasp','Iron Wasp',280000,220000,760000,500,17500,96,5100,'#ff8970',34,'{"Prometid":20,"Duranium":20,"Promerium":3}'::jsonb,14000,22000,true),
('bossIronWasp','Iron Wasp Prime',560000,430000,1550000,980,36000,84,9300,'#ff9a84',44,'{"Prometid":32,"Duranium":32,"Promerium":6,"Xenomit":2}'::jsonb,18000,26000,true),
('riftMauler','Rift Mauler',360000,320000,980000,650,23000,82,6400,'#ff7854',38,'{"Prometid":22,"Duranium":22,"Promerium":4,"Xenomit":1}'::jsonb,15000,23000,true),
('bossRiftMauler','Rift Mauler Prime',720000,620000,2000000,1300,47000,72,11800,'#ff8a61',50,'{"Prometid":36,"Duranium":36,"Promerium":8,"Xenomit":3}'::jsonb,18000,27000,true),
('obsidianPike','Obsidian Pike',500000,420000,1350000,850,31000,90,8300,'#ff6a44',40,'{"Prometid":24,"Duranium":26,"Promerium":5,"Xenomit":2}'::jsonb,16000,24000,true),
('bossObsidianPike','Obsidian Pike Prime',980000,860000,2800000,1700,65000,78,15200,'#ff7e57',54,'{"Prometid":40,"Duranium":42,"Promerium":10,"Xenomit":4}'::jsonb,19000,28000,true),
('apexOverlord','Apex Overlord',1800000,1400000,4800000,2900,115000,68,22500,'#ff5038',64,'{"Prometid":48,"Duranium":48,"Promerium":12,"Xenomit":8}'::jsonb,25000,36000,true),
('sentinelScavenger','Sentinel Scavenger',650000,500000,1600000,950,36000,92,9600,'#ff705a',42,'{"Prometid":30,"Duranium":30,"Promerium":6,"Xenomit":2}'::jsonb,17000,25000,true),
('sentinelScout','Sentinel Scout',760000,580000,1850000,1100,42000,100,10800,'#ff8064',43,'{"Prometid":32,"Duranium":32,"Promerium":6,"Xenomit":2}'::jsonb,17000,25000,true),
('sentinelSupport','Sentinel Support',900000,700000,2200000,1300,52000,86,12800,'#ff8a70',46,'{"Prometid":34,"Duranium":36,"Promerium":8,"Xenomit":3}'::jsonb,18000,26000,true),
('riftScout','Batedor da Fenda',320000,220000,850000,600,18000,96,5200,'#4bdaff',33,'{"Prometid":24,"Duranium":24,"Promerium":4}'::jsonb,15000,22000,true),
('bossRiftScout','Batedor da Fenda Prime',620000,450000,1800000,1200,38000,82,9800,'#8ceaff',45,'{"Prometid":36,"Duranium":36,"Promerium":8,"Xenomit":2}'::jsonb,18000,26000,true),
('voidCorsair','Corsário do Vazio',480000,380000,1250000,850,28000,94,7600,'#e58cff',38,'{"Prometid":28,"Duranium":28,"Promerium":5,"Xenomit":1}'::jsonb,16000,24000,true),
('bossVoidCorsair','Corsário do Vazio Prime',920000,760000,2700000,1650,58000,78,14500,'#ff9fd0',52,'{"Prometid":40,"Duranium":40,"Promerium":9,"Xenomit":3}'::jsonb,19000,28000,true),
('nexusWarden','Guardião Nexus',700000,620000,1900000,1200,43000,82,11000,'#7fffbb',44,'{"Prometid":34,"Duranium":34,"Promerium":7,"Xenomit":2}'::jsonb,18000,26000,true),
('bossNexusWarden','Guardião Nexus Prime',1350000,1150000,3900000,2300,86000,68,20600,'#9dffcf',58,'{"Prometid":48,"Duranium":48,"Promerium":12,"Xenomit":5}'::jsonb,22000,32000,true),
('astralReaper','Ceifador Astral',1050000,880000,2850000,1750,64000,108,15600,'#c5fbff',48,'{"Prometid":38,"Duranium":38,"Promerium":8,"Xenomit":3}'::jsonb,20000,30000,true),
('bossAstralReaper','Ceifador Astral Prime',2050000,1700000,5800000,3400,132000,86,28400,'#fb4a8f',66,'{"Prometid":56,"Duranium":56,"Promerium":14,"Xenomit":8}'::jsonb,26000,36000,true)
on conflict (npc_key) do update set
name=excluded.name,hp=excluded.hp,shield=excluded.shield,credits=excluded.credits,stl=excluded.stl,xp=excluded.xp,speed=excluded.speed,damage=excluded.damage,color=excluded.color,size=excluded.size,resources=excluded.resources,respawn_min_ms=excluded.respawn_min_ms,respawn_max_ms=excluded.respawn_max_ms,enabled=excluded.enabled,updated_at=now();

-- 2) Spawns oficiais por mapa.
insert into public.game_map_npc_spawns_v1811(map_id,npc_key,spawn_count,enabled) values
('x1','streuner',10,true),('x1','recruitStreuner',6,true),('x1','aiderStreuner',5,true),
('x2','streuner',7,true),('x2','recruitStreuner',5,true),('x2','aiderStreuner',5,true),('x2','bossStreuner',4,true),('x2','lordakia',8,true),('x2','bossLordakia',2,true),
('x3','lordakia',7,true),('x3','saimon',7,true),('x3','bossSaimon',2,true),('x3','mordon',6,true),('x3','bossMordon',2,true),('x3','devolarium',2,true),('x3','bossDevolarium',1,true),
('x4','lordakia',5,true),('x4','saimon',6,true),('x4','bossSaimon',4,true),('x4','mordon',6,true),('x4','sibelon',3,true),('x4','bossSibelon',1,true),
('x5','emberFang',10,true),('x5','bossEmberFang',2,true),('x5','ironWasp',8,true),('x5','bossIronWasp',2,true),
('x6','riftMauler',8,true),('x6','bossRiftMauler',2,true),('x6','obsidianPike',7,true),('x6','bossObsidianPike',2,true),
('x7','riftMauler',5,true),('x7','obsidianPike',7,true),('x7','bossObsidianPike',3,true),('x7','apexOverlord',1,true),
('x8','sentinelScavenger',7,true),('x8','sentinelScout',6,true),('x8','sentinelSupport',5,true),
('b41','riftScout',8,true),('b41','bossRiftScout',2,true),('b41','voidCorsair',6,true),
('b42','voidCorsair',8,true),('b42','bossVoidCorsair',3,true),('b42','nexusWarden',5,true),
('b43','nexusWarden',8,true),('b43','bossNexusWarden',2,true),('b43','astralReaper',4,true),('b43','apexOverlord',1,true)
on conflict (map_id,npc_key) do update set spawn_count=excluded.spawn_count,enabled=excluded.enabled,updated_at=now();

-- Desliga NPCs antigos de x5-x8 / 4-X que saíram do catálogo destas rotas.
update public.game_map_npc_spawns_v1811
set enabled=false, updated_at=now()
where map_id in ('x5','x6','x7','x8','b41','b42','b43')
and npc_key not in (
  'emberFang','bossEmberFang','ironWasp','bossIronWasp','riftMauler','bossRiftMauler','obsidianPike','bossObsidianPike','apexOverlord','sentinelScavenger','sentinelScout','sentinelSupport',
  'riftScout','bossRiftScout','voidCorsair','bossVoidCorsair','nexusWarden','bossNexusWarden','astralReaper','bossAstralReaper'
);

commit;
