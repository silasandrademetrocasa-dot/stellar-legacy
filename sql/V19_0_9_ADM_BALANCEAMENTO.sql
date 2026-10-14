-- STELLAR LEGACY V19.0.9 • CENTRAL DE BALANCEAMENTO
-- Base derivada do data.js V19.0.8. Nenhuma alteração de atributos na instalação.
-- RLS ligado; cliente autenticado lê; somente game_admins publica.
BEGIN;
CREATE TABLE IF NOT EXISTS public.game_balance_entries_v1909 (
 kind text NOT NULL CHECK (kind IN ('ship','item')),
 item_id text NOT NULL,
 label text NOT NULL,
 params jsonb NOT NULL CHECK (jsonb_typeof(params)='object'),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(kind,item_id)
);
CREATE TABLE IF NOT EXISTS public.game_balance_meta_v1909 (
 id integer PRIMARY KEY CHECK (id=1),
 version integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.game_balance_meta_v1909(id,version) VALUES(1,1) ON CONFLICT(id) DO NOTHING;
ALTER TABLE public.game_balance_entries_v1909 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_balance_meta_v1909 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.game_balance_entries_v1909,public.game_balance_meta_v1909 FROM PUBLIC,anon,authenticated;
-- Sementes: ON CONFLICT DO NOTHING => nunca altera balanceamentos já publicados.
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','phoenix','Aurora','{"name":"Aurora","role":"Nave inicial","hp":104000,"speed":320,"cargo":100,"lasers":1,"generators":1,"extras":1,"bonusLowMaps":null}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','liberator','Pioneer','{"name":"Pioneer","role":"Progressão inicial","hp":116000,"speed":300,"cargo":400,"lasers":4,"generators":6,"extras":2,"bonusLowMaps":null}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','piranha','Raptor','{"name":"Raptor","role":"Ataque rápido","hp":164000,"speed":360,"cargo":600,"lasers":6,"generators":8,"extras":2,"bonusLowMaps":null}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','nostromo','Meridian','{"name":"Meridian","role":"Farm e progressão","hp":220000,"speed":340,"cargo":700,"lasers":7,"generators":10,"extras":3,"bonusLowMaps":null}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','bigboy','Bastion','{"name":"Bastion","role":"Tanque comum","hp":360000,"speed":260,"cargo":800,"lasers":8,"generators":15,"extras":3,"bonusLowMaps":null}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','nDiplomat','Concord','{"name":"Concord","role":"Nave de progressão avançada","hp":240000,"speed":340,"cargo":900,"lasers":7,"generators":10,"extras":3,"bonusLowMaps":null}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','nEnvoy','Vanguard','{"name":"Vanguard","role":"Caçadora comum avançada","hp":160000,"speed":340,"cargo":1000,"lasers":10,"generators":10,"extras":3,"bonusLowMaps":null}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','nAmbassador','Sovereign','{"name":"Sovereign","role":"Nave comum topo de créditos","hp":320000,"speed":340,"cargo":1500,"lasers":12,"generators":12,"extras":3,"bonusLowMaps":null}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','leonov','Lynx','{"name":"Lynx","role":"Elite de mapas baixos","hp":164000,"speed":360,"cargo":500,"lasers":6,"generators":6,"extras":1,"bonusLowMaps":{"hp":96000,"speed":20,"cargo":500,"laserMult":1.5,"rocketMult":2,"shieldMult":2}}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','vengeance','Valkyrie','{"name":"Valkyrie","role":"Elite veloz","hp":280000,"speed":380,"cargo":1000,"lasers":10,"generators":10,"extras":2,"bonusLowMaps":null}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','goliath','Leviathan','{"name":"Leviathan","role":"Elite de combate pesado","hp":356000,"speed":300,"cargo":1500,"lasers":15,"generators":15,"extras":3,"bonusLowMaps":null}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','pusat','Striker','{"name":"Striker","role":"Elite ofensiva de alta velocidade","hp":225000,"speed":370,"cargo":500,"lasers":16,"generators":12,"extras":3,"bonusLowMaps":null}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','aegis','Seraph','{"name":"Seraph","role":"EVENTO • suporte","hp":375000,"speed":300,"cargo":2000,"lasers":10,"generators":15,"extras":3,"bonusLowMaps":null}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','basilisk','Venatrix','{"name":"Venatrix","role":"EVENTO • controle tóxico","hp":325000,"speed":310,"cargo":1500,"lasers":15,"generators":17,"extras":3,"bonusLowMaps":null}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','berserker','Ravager','{"name":"Ravager","role":"EVENTO • contra-ataque","hp":500000,"speed":290,"cargo":1500,"lasers":5,"generators":16,"extras":3,"bonusLowMaps":null}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','centurion','Praetor','{"name":"Praetor","role":"EVENTO • projetos instáveis","hp":365000,"speed":300,"cargo":1500,"lasers":16,"generators":16,"extras":3,"bonusLowMaps":null}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','citadel','Bulwark','{"name":"Bulwark","role":"EVENTO • tanque pesado","hp":650000,"speed":240,"cargo":4000,"lasers":7,"generators":20,"extras":5,"bonusLowMaps":null}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','cyborg','Nexus Prime','{"name":"Nexus Prime","role":"EVENTO • dano contínuo","hp":365000,"speed":300,"cargo":1500,"lasers":16,"generators":16,"extras":3,"bonusLowMaps":null}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','defcom','Phantom','{"name":"Phantom","role":"EVENTO • camuflagem","hp":150000,"speed":340,"cargo":800,"lasers":12,"generators":8,"extras":2,"bonusLowMaps":null}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','defcomRaven','Wraith','{"name":"Wraith","role":"EVENTO • camuflagem reforçada","hp":287500,"speed":340,"cargo":800,"lasers":12,"generators":8,"extras":2,"bonusLowMaps":null}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','diminisher','Nullifier','{"name":"Nullifier","role":"EVENTO • anti-escudo","hp":356000,"speed":300,"cargo":1600,"lasers":15,"generators":15,"extras":3,"bonusLowMaps":null}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','disruptor','Interdictor','{"name":"Interdictor","role":"EVENTO • interferência","hp":356000,"speed":300,"cargo":1500,"lasers":14,"generators":14,"extras":3,"bonusLowMaps":null}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','goliathX','Leviathan-X','{"name":"Leviathan-X","role":"EVENTO • congelamento","hp":356000,"speed":300,"cargo":1500,"lasers":15,"generators":15,"extras":3,"bonusLowMaps":null}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','hammerclaw','Ironclaw','{"name":"Ironclaw","role":"EVENTO • suporte pesado","hp":377500,"speed":290,"cargo":1500,"lasers":12,"generators":15,"extras":3,"bonusLowMaps":null}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','hecate','Lumina','{"name":"Lumina","role":"EVENTO • feixe de partículas","hp":377500,"speed":300,"cargo":1500,"lasers":15,"generators":16,"extras":3,"bonusLowMaps":null}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','holo','Mirage','{"name":"Mirage","role":"EVENTO • reversão","hp":375000,"speed":300,"cargo":1500,"lasers":15,"generators":15,"extras":3,"bonusLowMaps":null}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','hyperion','Gravastar','{"name":"Gravastar","role":"EVENTO • controle gravitacional","hp":400000,"speed":300,"cargo":1500,"lasers":15,"generators":16,"extras":3,"bonusLowMaps":null}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','keres','Plaguewing','{"name":"Plaguewing","role":"EVENTO • contágio","hp":356000,"speed":300,"cargo":1500,"lasers":15,"generators":16,"extras":3,"bonusLowMaps":null}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','mimesis','Echo','{"name":"Echo","role":"EVENTO • evasão","hp":386000,"speed":300,"cargo":1500,"lasers":12,"generators":14,"extras":3,"bonusLowMaps":null}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','orcus','Doppel','{"name":"Doppel","role":"EVENTO • duplicação","hp":300000,"speed":280,"cargo":1500,"lasers":15,"generators":15,"extras":3,"bonusLowMaps":null}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','paladin','Warden','{"name":"Warden","role":"EVENTO • sobrevivência","hp":325000,"speed":300,"cargo":1500,"lasers":12,"generators":18,"extras":3,"bonusLowMaps":null}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','retiarus','Lancer','{"name":"Lancer","role":"EVENTO • tiro carregado","hp":386000,"speed":310,"cargo":1500,"lasers":15,"generators":14,"extras":3,"bonusLowMaps":null}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','sentinel','Guardian','{"name":"Guardian","role":"EVENTO • defesa","hp":356000,"speed":300,"cargo":1600,"lasers":15,"generators":15,"extras":3,"bonusLowMaps":null}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','solace','Reclaimer','{"name":"Reclaimer","role":"EVENTO • reparação","hp":356000,"speed":300,"cargo":1500,"lasers":15,"generators":15,"extras":3,"bonusLowMaps":null}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','solaris','Helios','{"name":"Helios","role":"EVENTO • incêndio","hp":377500,"speed":300,"cargo":1500,"lasers":15,"generators":15,"extras":3,"bonusLowMaps":null}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','spearhead','Pathfinder','{"name":"Pathfinder","role":"EVENTO • reconhecimento","hp":200000,"speed":370,"cargo":500,"lasers":5,"generators":12,"extras":2,"bonusLowMaps":null}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','spectrum','Prism','{"name":"Prism","role":"EVENTO • defesa prismática","hp":356000,"speed":300,"cargo":1500,"lasers":15,"generators":15,"extras":3,"bonusLowMaps":null}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','tartarus','Hellrunner','{"name":"Hellrunner","role":"EVENTO • velocidade / foguetes","hp":360000,"speed":220,"cargo":1500,"lasers":14,"generators":15,"extras":3,"bonusLowMaps":null}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','tempest','Stormrider','{"name":"Stormrider","role":"EVENTO • eletricidade","hp":300000,"speed":330,"cargo":1500,"lasers":14,"generators":15,"extras":3,"bonusLowMaps":null}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','venom','Viper','{"name":"Viper","role":"EVENTO • dano contínuo","hp":356000,"speed":300,"cargo":1600,"lasers":15,"generators":15,"extras":3,"bonusLowMaps":null}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','yamato','Kensei','{"name":"Kensei","role":"EVENTO • aceleração","hp":260000,"speed":260,"cargo":1000,"lasers":8,"generators":12,"extras":2,"bonusLowMaps":null}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','yRonin','Shogun','{"name":"Shogun","role":"EVENTO • aceleração","hp":300000,"speed":260,"cargo":1000,"lasers":8,"generators":12,"extras":2,"bonusLowMaps":null}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('ship','zephyr','Gale','{"name":"Gale","role":"EVENTO • momentum","hp":250000,"speed":300,"cargo":1500,"lasers":12,"generators":16,"extras":3,"bonusLowMaps":null}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('item','lf1','ARC-1','{"name":"ARC-1","description":"Laser comum • dano 65.","damage":65,"equipment_type":"laser","equipment_subtype":""}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('item','mp1','ARC-P1','{"name":"ARC-P1","description":"Laser comum • 70 contra pilotos / 60 contra aliens.","damage":70,"alienDamage":60,"equipment_type":"laser","equipment_subtype":""}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('item','sl01','SOL-1','{"name":"SOL-1","description":"Laser legado preservado em saves antigos; fora da Loja atual.","damage":125,"equipment_type":"laser","equipment_subtype":""}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('item','lf2','ARC-2','{"name":"ARC-2","description":"Laser comum avançado • dano 140.","damage":140,"equipment_type":"laser","equipment_subtype":""}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('item','lf3','ARC-3','{"name":"ARC-3","description":"Laser Elite • dano 175 • +15% contra aliens.","damage":175,"alienBonus":0.15,"equipment_type":"laser","equipment_subtype":""}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('item','lf4','ARC-4','{"name":"ARC-4","description":"Laser Elite de alto desempenho • dano 200.","damage":200,"equipment_type":"laser","equipment_subtype":""}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('item','g3n1010','THR-1','{"name":"THR-1","description":"+2 velocidade.","speed":2,"equipment_type":"generator","equipment_subtype":"speed"}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('item','g3n2010','THR-2','{"name":"THR-2","description":"+3 velocidade.","speed":3,"equipment_type":"generator","equipment_subtype":"speed"}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('item','g3n3210','THR-3','{"name":"THR-3","description":"+4 velocidade.","speed":4,"equipment_type":"generator","equipment_subtype":"speed"}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('item','g3n3310','THR-4','{"name":"THR-4","description":"+5 velocidade.","speed":5,"equipment_type":"generator","equipment_subtype":"speed"}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('item','g3n6900','THR-5','{"name":"THR-5","description":"+7 velocidade.","speed":7,"equipment_type":"generator","equipment_subtype":"speed"}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('item','g3n7900','THR-6','{"name":"THR-6","description":"+10 velocidade.","speed":10,"equipment_type":"generator","equipment_subtype":"speed"}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('item','fs01','AEG-1','{"name":"AEG-1","description":"3.200 escudo • 70% absorção • +6,25% regeneração.","shield":3200,"absorption":70,"shieldRegenBonus":0.0625,"equipment_type":"generator","equipment_subtype":"shield"}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('item','fs02','AEG-2','{"name":"AEG-2","description":"5.600 escudo • 75% absorção • +6,25% regeneração.","shield":5600,"absorption":75,"shieldRegenBonus":0.0625,"equipment_type":"generator","equipment_subtype":"shield"}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('item','fs03','AEG-3','{"name":"AEG-3","description":"8.000 escudo • 80% absorção • recompensa de evento/missão.","shield":8000,"absorption":80,"shieldRegenBonus":0.0625,"equipment_type":"generator","equipment_subtype":"shield"}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('item','fs04','AEG-4','{"name":"AEG-4","description":"11.400 escudo • 80% absorção • recompensa de evento.","shield":11400,"absorption":80,"shieldRegenBonus":0.0625,"equipment_type":"generator","equipment_subtype":"shield"}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('item','sg3nb00','VSH-0','{"name":"VSH-0","description":"9.000 escudo • 70% absorção • recompensa especial.","shield":9000,"absorption":70,"equipment_type":"generator","equipment_subtype":"shield"}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('item','sg3na01','VSH-1','{"name":"VSH-1","description":"1.000 escudo • 40% absorção.","shield":1000,"absorption":40,"equipment_type":"generator","equipment_subtype":"shield"}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('item','sg3na02','VSH-2','{"name":"VSH-2","description":"5.000 escudo • 50% absorção.","shield":5000,"absorption":50,"equipment_type":"generator","equipment_subtype":"shield"}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('item','sg3na03','VSH-3','{"name":"VSH-3","description":"5.000 escudo • 60% absorção.","shield":5000,"absorption":60,"equipment_type":"generator","equipment_subtype":"shield"}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('item','sg3nb01','VSH-4','{"name":"VSH-4","description":"9.500 escudo • 70% absorção.","shield":9500,"absorption":70,"equipment_type":"generator","equipment_subtype":"shield"}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('item','sg3nb02','VSH-5','{"name":"VSH-5","description":"10.000 escudo • 80% absorção.","shield":10000,"absorption":80,"equipment_type":"generator","equipment_subtype":"shield"}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('item','sg3nb03','VSH-6','{"name":"VSH-6","description":"11.450 escudo • 80% absorção • evento/missão.","shield":11450,"absorption":80,"equipment_type":"generator","equipment_subtype":"shield"}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('item','autoLaserCpu','Mira Autônoma','{"name":"Mira Autônoma","description":"Ao selecionar um alvo, inicia o laser automaticamente.","equipment_type":"extra","equipment_subtype":""}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('item','autoRocketCpu','Lançador Autônomo','{"name":"Lançador Autônomo","description":"Dispara automaticamente o míssil selecionado durante o combate.","equipment_type":"extra","equipment_subtype":""}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('item','rocketTurboCpu','Propulsor de Recarga','{"name":"Propulsor de Recarga","description":"Reduz o cooldown de mísseis pela metade.","equipment_type":"extra","equipment_subtype":""}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('item','extraSlotCpuCommon','CPU Expansora de Extras • Comum','{"name":"CPU Expansora de Extras • Comum","description":"Enquanto equipada, libera +3 slots EXTRAS adicionais na nave ativa. Não acumula com a versão Elite.","slotBonus":3,"equipment_type":"extra","equipment_subtype":""}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('item','extraSlotCpuElite','CPU Expansora de Extras • Elite','{"name":"CPU Expansora de Extras • Elite","description":"Enquanto equipada, libera +6 slots EXTRAS adicionais na nave ativa. Não acumula com a versão Comum.","slotBonus":6,"equipment_type":"extra","equipment_subtype":""}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('item','rep2','Nanobot de Reparo • Comum','{"name":"Nanobot de Reparo • Comum","description":"Após 5s sem receber dano, repara +5.000 HP por segundo. O escudo regenera +10.000 por segundo.","repairRate":0.01,"repairTick":5000,"shieldRepairTick":10000,"repairDelay":5,"equipment_type":"extra","equipment_subtype":""}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('item','repElite','Nanobot de Reparo • Elite','{"name":"Nanobot de Reparo • Elite","description":"Após 5s sem receber dano, repara +10.000 HP por segundo. Enquanto equipado, o escudo regenera +15.000 por segundo.","repairRate":0.02,"repairTick":10000,"shieldRepairTick":15000,"repairDelay":5,"equipment_type":"extra","equipment_subtype":""}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('item','cargoCpuCommon','Módulo de Porão • Comum','{"name":"Módulo de Porão • Comum","description":"Enquanto equipado, aumenta a capacidade do porão da nave ativa em +2.500 unidades. Não acumula com a versão Elite.","cargoBonus":2500,"equipment_type":"extra","equipment_subtype":""}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('item','cargoCpuElite','Módulo de Porão • Elite','{"name":"Módulo de Porão • Elite","description":"Enquanto equipado, aumenta a capacidade do porão da nave ativa em +10.000 unidades. Não acumula com a versão Comum.","cargoBonus":10000,"equipment_type":"extra","equipment_subtype":""}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('item','ammoAutoBuyCpu','Repositor Automático','{"name":"Repositor Automático","description":"Compra automaticamente novo pacote da munição laser e do míssil selecionados quando o estoque estiver baixo.","equipment_type":"extra","equipment_subtype":""}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('item','remoteTraderCpuElite','Terminal Mercante Remoto • Elite','{"name":"Terminal Mercante Remoto • Elite","description":"EXTRA Elite: enquanto equipado, permite vender recursos diretamente na aba Refinaria do Hangar em qualquer setor, sem retorno à base. Venda manual, nunca automática.","equipment_type":"extra","equipment_subtype":""}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('item','flax','Halo','{"name":"Halo","description":"Drone comum com 1 slot de equipamento.","slots":1,"equipment_type":"drone","equipment_subtype":""}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;
INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES('item','iris','Nova','{"name":"Nova","description":"Drone Elite com 2 slots de equipamento.","slots":2,"equipment_type":"drone","equipment_subtype":""}'::jsonb) ON CONFLICT(kind,item_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_balance_runtime_v1909()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public,auth,pg_temp AS $$
DECLARE v_version integer;v_updated timestamptz;v_rows jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login obrigatório.'; END IF;
 SELECT version,updated_at INTO v_version,v_updated FROM public.game_balance_meta_v1909 WHERE id=1;
 SELECT coalesce(jsonb_agg(jsonb_build_object('kind',kind,'item_id',item_id,'label',label,'params',params) ORDER BY kind,item_id),'[]'::jsonb)
 INTO v_rows FROM public.game_balance_entries_v1909;
 RETURN jsonb_build_object('version',v_version,'updated_at',v_updated,'entries',v_rows);
END;$$;

CREATE OR REPLACE FUNCTION public.admin_set_balance_v1909(p_kind text,p_item_id text,p_fields jsonb,p_expected_version integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public,auth,pg_temp AS $$
DECLARE v_old jsonb;v_out jsonb;v_key text;v_value jsonb;v_num numeric;v_min numeric;v_max numeric;
 v_type text;v_subtype text;v_meta integer;v_low jsonb;v_subkey text;v_subnum numeric;
BEGIN
 IF NOT public.is_game_admin_v1763(auth.uid()) THEN RAISE EXCEPTION 'Acesso administrativo negado.'; END IF;
 IF p_kind NOT IN ('ship','item') OR p_item_id IS NULL OR length(p_item_id)>64 OR jsonb_typeof(p_fields)<>'object' THEN
  RAISE EXCEPTION 'Registro de balanceamento inválido.';
 END IF;
 IF (SELECT count(*) FROM jsonb_object_keys(p_fields))=0 OR (SELECT count(*) FROM jsonb_object_keys(p_fields))>18 OR length(p_fields::text)>3500 THEN
  RAISE EXCEPTION 'Quantidade de atributos inválida.';
 END IF;
 SELECT version INTO v_meta FROM public.game_balance_meta_v1909 WHERE id=1 FOR UPDATE;
 IF p_expected_version IS NOT NULL AND p_expected_version<>v_meta THEN
  RAISE EXCEPTION 'Configuração mudou no servidor (v%). Recarregue antes de salvar.',v_meta;
 END IF;
 SELECT params INTO v_old FROM public.game_balance_entries_v1909
 WHERE kind=p_kind AND item_id=p_item_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Este equipamento ou nave não consta no catálogo autorizado.'; END IF;
 v_type := coalesce(v_old->>'equipment_type','');v_subtype:=coalesce(v_old->>'equipment_subtype','');
 v_out:=v_old;
 FOR v_key,v_value IN SELECT key,value FROM jsonb_each(p_fields) LOOP
  IF v_key IN ('name','role','description') THEN
   IF (v_key='role' AND p_kind<>'ship') OR (v_key='description' AND p_kind<>'item') OR
       jsonb_typeof(v_value)<>'string' OR length(btrim(v_value #>> '{}')) NOT BETWEEN 1 AND 180 THEN
    RAISE EXCEPTION 'Texto inválido para %.',v_key;
   END IF;
   v_out:=jsonb_set(v_out,ARRAY[v_key],to_jsonb(left(btrim(v_value #>> '{}'),180)),true);
   CONTINUE;
  END IF;
  IF p_kind='ship' THEN
   IF v_key NOT IN ('hp','speed','cargo','lasers','generators','extras','bonusLowMaps') THEN RAISE EXCEPTION 'Atributo de nave não permitido: %',v_key; END IF;
  ELSIF v_key='equipment_type' OR v_key='equipment_subtype' OR
    NOT ((v_type='laser' AND v_key IN ('damage','alienDamage','alienBonus')) OR
    (v_type='generator' AND v_subtype='speed' AND v_key='speed') OR
    (v_type='generator' AND v_subtype='shield' AND v_key IN ('shield','absorption','shieldRegenBonus')) OR
    (v_type='extra' AND v_key IN ('slotBonus','repairRate','repairTick','shieldRepairTick','repairDelay','cargoBonus') AND v_old ? v_key) OR
    (v_type='drone' AND v_key='slots')) THEN
    RAISE EXCEPTION 'Atributo de equipamento não permitido: %',v_key;
  END IF;
  IF v_key='bonusLowMaps' THEN
   IF p_kind<>'ship' THEN RAISE EXCEPTION 'Bônus de mapa é exclusivo de nave.'; END IF;
   IF v_value='null'::jsonb THEN
    v_out:=jsonb_set(v_out,ARRAY[v_key],'null'::jsonb,true);
   ELSE
    IF jsonb_typeof(v_value)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(v_value))<>6 THEN RAISE EXCEPTION 'Bônus de mapa requer os 6 campos.'; END IF;
    FOR v_subkey,v_num IN SELECT key,0::numeric FROM jsonb_each(v_value) LOOP
     IF jsonb_typeof(v_value->v_subkey)<>'number' THEN RAISE EXCEPTION 'Bônus de mapa inválido.'; END IF;
     v_subnum:=(v_value->>v_subkey)::numeric;
     IF v_subkey IN ('hp','speed','cargo') THEN
      v_max:=CASE v_subkey WHEN 'hp' THEN 2000000 WHEN 'speed' THEN 1000 ELSE 100000 END;
      IF v_subnum<0 OR v_subnum>v_max THEN RAISE EXCEPTION 'Bônus de mapa fora do limite.'; END IF;
     ELSIF v_subkey IN ('laserMult','rocketMult','shieldMult') THEN
      IF v_subnum<0.1 OR v_subnum>5 THEN RAISE EXCEPTION 'Multiplicador de mapa fora do limite.'; END IF;
     ELSE RAISE EXCEPTION 'Campo de bônus de mapa inválido: %',v_subkey; END IF;
    END LOOP;
    v_out:=jsonb_set(v_out,ARRAY[v_key],v_value,true);
   END IF;
   CONTINUE;
  END IF;
  IF jsonb_typeof(v_value)<>'number' THEN RAISE EXCEPTION 'Atributo % precisa ser numérico.',v_key; END IF;
  v_num:=(v_value #>> '{}')::numeric;
  v_min:=CASE v_key WHEN 'hp' THEN 1000 WHEN 'speed' THEN CASE WHEN p_kind='ship' THEN 50 ELSE 0 END
         WHEN 'lasers' THEN 1 WHEN 'slots' THEN 1 ELSE 0 END;
  v_max:=CASE v_key WHEN 'hp' THEN 10000000 WHEN 'speed' THEN 1200 WHEN 'cargo' THEN 100000
    WHEN 'lasers' THEN 32 WHEN 'generators' THEN 32 WHEN 'extras' THEN 20 WHEN 'damage' THEN 100000
    WHEN 'alienDamage' THEN 100000 WHEN 'alienBonus' THEN 5 WHEN 'shield' THEN 1000000
    WHEN 'absorption' THEN 95 WHEN 'shieldRegenBonus' THEN 1 WHEN 'slotBonus' THEN 20
    WHEN 'repairRate' THEN 1 WHEN 'repairTick' THEN 1000000 WHEN 'shieldRepairTick' THEN 1000000
    WHEN 'repairDelay' THEN 120 WHEN 'cargoBonus' THEN 100000 WHEN 'slots' THEN 12 ELSE -1 END;
  IF v_max<0 OR v_num<v_min OR v_num>v_max OR
    (v_key IN ('hp','speed','cargo','lasers','generators','extras','damage','alienDamage','shield','absorption','slotBonus','repairTick','shieldRepairTick','repairDelay','cargoBonus','slots') AND v_num<>trunc(v_num)) THEN
    RAISE EXCEPTION 'Atributo % fora dos limites.',v_key;
  END IF;
  v_out:=jsonb_set(v_out,ARRAY[v_key],v_value,true);
 END LOOP;
 UPDATE public.game_balance_entries_v1909 SET params=v_out,label=coalesce(v_out->>'name',label),updated_at=now()
 WHERE kind=p_kind AND item_id=p_item_id;
 UPDATE public.game_balance_meta_v1909 SET version=version+1,updated_at=now() WHERE id=1;
 RETURN public.get_balance_runtime_v1909();
END;$$;
REVOKE ALL ON FUNCTION public.get_balance_runtime_v1909() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.admin_set_balance_v1909(text,text,jsonb,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_balance_runtime_v1909() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_balance_v1909(text,text,jsonb,integer) TO authenticated;
COMMIT;
