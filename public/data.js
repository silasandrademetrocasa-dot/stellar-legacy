export const FACTIONS = {
  earth: { id: 'earth', name: 'Terra Alliance', short: 'TERRA', prefix: '1', color: '#4fd7ff', description: 'Tecnologia, comércio e defesa orbital.' },
  mars: { id: 'mars', name: 'Mars Dominion', short: 'MARTE', prefix: '2', color: '#ff6a59', description: 'Força militar, indústria e expansão agressiva.' },
  jupiter: { id: 'jupiter', name: 'Jupiter Federation', short: 'JÚPITER', prefix: '3', color: '#bd78ff', description: 'Pesquisa, mineração e domínio das rotas externas.' },
};

export const SHIPS = {
  // Naves sem habilidade especial: disponíveis normalmente na Loja.
  phoenix: { id:'phoenix', name:'Aurora', lasers:1, generators:1, speed:320, cargo:100, hp:104000, extras:1, price:0, currency:'credits', role:'Nave inicial', shopAvailable:false },
  liberator: { id:'liberator', name:'Pioneer', lasers:4, generators:6, speed:300, cargo:400, hp:116000, extras:2, price:10000000, currency:'credits', role:'Progressão inicial' },
  piranha: { id:'piranha', name:'Raptor', lasers:6, generators:8, speed:360, cargo:600, hp:164000, extras:2, price:30000000, currency:'credits', role:'Ataque rápido' },
  nostromo: { id:'nostromo', name:'Meridian', lasers:7, generators:10, speed:340, cargo:700, hp:220000, extras:3, price:80000000, currency:'credits', role:'Farm e progressão' },
  bigboy: { id:'bigboy', name:'Bastion', lasers:8, generators:15, speed:260, cargo:800, hp:360000, extras:3, price:150000000, currency:'credits', role:'Tanque comum' },
  nDiplomat: { id:'nDiplomat', name:'Concord', lasers:7, generators:10, speed:340, cargo:900, hp:240000, extras:3, price:160000000, currency:'credits', role:'Nave de progressão avançada' },
  nEnvoy: { id:'nEnvoy', name:'Vanguard', lasers:10, generators:10, speed:340, cargo:1000, hp:160000, extras:3, price:240000000, currency:'credits', role:'Caçadora comum avançada' },
  nAmbassador: { id:'nAmbassador', name:'Sovereign', lasers:12, generators:12, speed:340, cargo:1500, hp:320000, extras:3, price:400000000, currency:'credits', role:'Nave comum topo de créditos' },

  // Elite de Loja.
  leonov: { id:'leonov', name:'Lynx', lasers:6, generators:6, speed:360, cargo:500, hp:164000, extras:1, price:900000, currency:'uridium', role:'Elite de mapas baixos', bonusLowMaps:{hp:96000,speed:20,cargo:500,laserMult:1.5,rocketMult:2,shieldMult:2} },
  vengeance: { id:'vengeance', name:'Valkyrie', lasers:10, generators:10, speed:380, cargo:1000, hp:280000, extras:2, price:1400000, currency:'uridium', role:'Elite veloz' },
  goliath: { id:'goliath', name:'Leviathan', lasers:15, generators:15, speed:300, cargo:1500, hp:356000, extras:3, price:2500000, currency:'uridium', role:'Elite de combate pesado' },
  pusat: { id:'pusat', name:'Striker', lasers:16, generators:12, speed:370, cargo:500, hp:225000, extras:3, price:3500000, currency:'uridium', role:'Elite ofensiva de alta velocidade' },

  // Naves com habilidades especiais: catálogo futuro de Evento / Missão / Passe.
  aegis: { id:'aegis', name:'Seraph', lasers:10, generators:15, speed:300, cargo:2000, hp:375000, extras:3, price:0, currency:'uridium', eventOnly:true, role:'EVENTO • suporte', ability:'Hull Mend • Barrier Mend • Repair Beacon' },
  basilisk: { id:'basilisk', name:'Venatrix', lasers:15, generators:17, speed:310, cargo:1500, hp:325000, extras:3, price:0, currency:'uridium', eventOnly:true, role:'EVENTO • controle tóxico', ability:'Toxic Veil • Overdrive Valor' },
  berserker: { id:'berserker', name:'Ravager', lasers:5, generators:16, speed:290, cargo:1500, hp:500000, extras:3, price:0, currency:'uridium', eventOnly:true, role:'EVENTO • contra-ataque', ability:'Barrier Link • Fury Core • Retaliation' },
  centurion: { id:'centurion', name:'Praetor', lasers:16, generators:16, speed:300, cargo:1500, hp:365000, extras:3, price:0, currency:'uridium', eventOnly:true, role:'EVENTO • projetos instáveis', ability:'Projetos especiais com bônus e habilidades' },
  citadel: { id:'citadel', name:'Bulwark', lasers:7, generators:20, speed:240, cargo:4000, hp:650000, extras:5, price:0, currency:'uridium', eventOnly:true, role:'EVENTO • tanque pesado', ability:'Taunt Beacon • Warp Surge • Guardian Field • Bastion Mode' },
  cyborg: { id:'cyborg', name:'Nexus Prime', lasers:16, generators:16, speed:300, cargo:1500, hp:365000, extras:3, price:0, currency:'uridium', eventOnly:true, role:'EVENTO • dano contínuo', ability:'Rift Collapse' },
  defcom: { id:'defcom', name:'Phantom', lasers:12, generators:8, speed:340, cargo:800, hp:150000, extras:2, price:0, currency:'uridium', eventOnly:true, role:'EVENTO • camuflagem', ability:'Phase Cloak' },
  defcomRaven: { id:'defcomRaven', name:'Wraith', lasers:12, generators:8, speed:340, cargo:800, hp:287500, extras:2, price:0, currency:'uridium', eventOnly:true, role:'EVENTO • camuflagem reforçada', ability:'Phase Cloak' },
  diminisher: { id:'diminisher', name:'Nullifier', lasers:15, generators:15, speed:300, cargo:1600, hp:356000, extras:3, price:0, currency:'uridium', eventOnly:true, role:'EVENTO • anti-escudo', ability:'Barrier Break' },
  disruptor: { id:'disruptor', name:'Interdictor', lasers:14, generators:14, speed:300, cargo:1500, hp:356000, extras:3, price:0, currency:'uridium', eventOnly:true, role:'EVENTO • interferência', ability:'Vector Redirect • Barrier Scramble • Signal Blackout' },
  goliathX: { id:'goliathX', name:'Leviathan-X', lasers:15, generators:15, speed:300, cargo:1500, hp:356000, extras:3, price:0, currency:'uridium', eventOnly:true, role:'EVENTO • congelamento', ability:'Cryo Talon' },
  hammerclaw: { id:'hammerclaw', name:'Ironclaw', lasers:12, generators:15, speed:290, cargo:1500, hp:377500, extras:3, price:0, currency:'uridium', eventOnly:true, role:'EVENTO • suporte pesado', ability:'Hull Mend • Barrier Mend • Repair Beacon' },
  hecate: { id:'hecate', name:'Lumina', lasers:15, generators:16, speed:300, cargo:1500, hp:377500, extras:3, price:0, currency:'uridium', eventOnly:true, role:'EVENTO • feixe de partículas', ability:'Photon Lance' },
  holo: { id:'holo', name:'Mirage', lasers:15, generators:15, speed:300, cargo:1500, hp:375000, extras:3, price:0, currency:'uridium', eventOnly:true, role:'EVENTO • reversão', ability:'Self Rewind • Target Rewind' },
  hyperion: { id:'hyperion', name:'Gravastar', lasers:15, generators:16, speed:300, cargo:1500, hp:400000, extras:3, price:0, currency:'uridium', eventOnly:true, role:'EVENTO • controle gravitacional', ability:'Gravity Lock' },
  keres: { id:'keres', name:'Plaguewing', lasers:15, generators:16, speed:300, cargo:1500, hp:356000, extras:3, price:0, currency:'uridium', eventOnly:true, role:'EVENTO • contágio', ability:'Contagion Spread • Phase Feint' },
  mimesis: { id:'mimesis', name:'Echo', lasers:12, generators:14, speed:300, cargo:1500, hp:386000, extras:3, price:0, currency:'uridium', eventOnly:true, role:'EVENTO • evasão', ability:'Echo Scramble • Phase Shift' },
  orcus: { id:'orcus', name:'Doppel', lasers:15, generators:15, speed:280, cargo:1500, hp:300000, extras:3, price:0, currency:'uridium', eventOnly:true, role:'EVENTO • duplicação', ability:'Echo Clone • Energy Assimilation' },
  paladin: { id:'paladin', name:'Warden', lasers:12, generators:18, speed:300, cargo:1500, hp:325000, extras:3, price:0, currency:'uridium', eventOnly:true, role:'EVENTO • sobrevivência', ability:'Void Ripper • Final Stand' },
  retiarus: { id:'retiarus', name:'Lancer', lasers:15, generators:14, speed:310, cargo:1500, hp:386000, extras:3, price:0, currency:'uridium', eventOnly:true, role:'EVENTO • tiro carregado', ability:'Overcharge • Charged Lance' },
  sentinel: { id:'sentinel', name:'Guardian', lasers:15, generators:15, speed:300, cargo:1600, hp:356000, extras:3, price:0, currency:'uridium', eventOnly:true, role:'EVENTO • defesa', ability:'Fortress Matrix' },
  solace: { id:'solace', name:'Reclaimer', lasers:15, generators:15, speed:300, cargo:1500, hp:356000, extras:3, price:0, currency:'uridium', eventOnly:true, role:'EVENTO • reparação', ability:'Nanite Swarm' },
  solaris: { id:'solaris', name:'Helios', lasers:15, generators:15, speed:300, cargo:1500, hp:377500, extras:3, price:0, currency:'uridium', eventOnly:true, role:'EVENTO • incêndio', ability:'Solar Burn' },
  spearhead: { id:'spearhead', name:'Pathfinder', lasers:5, generators:12, speed:370, cargo:500, hp:200000, extras:2, price:0, currency:'uridium', eventOnly:true, role:'EVENTO • reconhecimento', ability:'Phase Cloak • Signal Jam • Hunter Mark • Deep Scan' },
  spectrum: { id:'spectrum', name:'Prism', lasers:15, generators:15, speed:300, cargo:1500, hp:356000, extras:3, price:0, currency:'uridium', eventOnly:true, role:'EVENTO • defesa prismática', ability:'Prism Barrier' },
  tartarus: { id:'tartarus', name:'Hellrunner', lasers:14, generators:15, speed:220, cargo:1500, hp:360000, extras:3, price:0, currency:'uridium', eventOnly:true, role:'EVENTO • velocidade / foguetes', ability:'Barrage Mode • Vector Boost' },
  tempest: { id:'tempest', name:'Stormrider', lasers:14, generators:15, speed:330, cargo:1500, hp:300000, extras:3, price:0, currency:'uridium', eventOnly:true, role:'EVENTO • eletricidade', ability:'Arc Link • Arc Discharge • Arc Reserve' },
  venom: { id:'venom', name:'Viper', lasers:15, generators:15, speed:300, cargo:1600, hp:356000, extras:3, price:0, currency:'uridium', eventOnly:true, role:'EVENTO • dano contínuo', ability:'Rift Collapse' },
  yamato: { id:'yamato', name:'Kensei', lasers:8, generators:12, speed:260, cargo:1000, hp:260000, extras:2, price:0, currency:'uridium', eventOnly:true, role:'EVENTO • aceleração', ability:'Warp Surge' },
  yRonin: { id:'yRonin', name:'Shogun', lasers:8, generators:12, speed:260, cargo:1000, hp:300000, extras:2, price:0, currency:'uridium', eventOnly:true, role:'EVENTO • aceleração', ability:'Warp Surge' },
  zephyr: { id:'zephyr', name:'Gale', lasers:12, generators:16, speed:300, cargo:1500, hp:250000, extras:3, price:0, currency:'uridium', eventOnly:true, role:'EVENTO • momentum', ability:'Kinetic Drive • Tri-Barrage' },
};

export const ITEMS = {
  // LASERS
  lf1: { id:'lf1', type:'laser', name:'ARC-1', damage:65, price:1000000, currency:'credits', description:'Laser comum • dano 65.' },
  mp1: { id:'mp1', type:'laser', name:'ARC-P1', damage:70, alienDamage:60, price:5000000, currency:'credits', description:'Laser comum • 70 contra pilotos / 60 contra aliens.' },
  sl01: { id:'sl01', type:'laser', name:'SOL-1', damage:125, price:20000000, currency:'credits', shopAvailable:false, legacy:true, description:'Laser legado preservado em saves antigos; fora da Loja atual.' },
  lf2: { id:'lf2', type:'laser', name:'ARC-2', damage:140, price:25000000, currency:'credits', description:'Laser comum avançado • dano 140.' },
  lf3: { id:'lf3', type:'laser', name:'ARC-3', damage:175, alienBonus:0.15, price:125000, currency:'uridium', description:'Laser Elite • dano 175 • +15% contra aliens.' },
  lf4: { id:'lf4', type:'laser', name:'ARC-4', damage:200, price:500000, currency:'uridium', description:'Laser Elite de alto desempenho • dano 200.' },

  // SPEED GENERATORS
  g3n1010: { id: 'g3n1010', type: 'generator', subtype: 'speed', name: 'THR-1', speed: 2, price: 250000, currency: 'credits', description: '+2 velocidade.' },
  g3n2010: { id: 'g3n2010', type: 'generator', subtype: 'speed', name: 'THR-2', speed: 3, price: 1000000, currency: 'credits', description: '+3 velocidade.' },
  g3n3210: { id: 'g3n3210', type: 'generator', subtype: 'speed', name: 'THR-3', speed: 4, price: 3000000, currency: 'credits', description: '+4 velocidade.' },
  g3n3310: { id: 'g3n3310', type: 'generator', subtype: 'speed', name: 'THR-4', speed: 5, price: 10000000, currency: 'credits', description: '+5 velocidade.' },
  g3n6900: { id: 'g3n6900', type: 'generator', subtype: 'speed', name: 'THR-5', speed: 7, price: 80000, currency: 'uridium', description: '+7 velocidade.' },
  g3n7900: { id: 'g3n7900', type: 'generator', subtype: 'speed', name: 'THR-6', speed: 10, price: 250000, currency: 'uridium', description: '+10 velocidade.' },

  // SHIELD GENERATORS
  fs01: { id:'fs01', type:'generator', subtype:'shield', name:'AEG-1', shield:3200, absorption:70, shieldRegenBonus:0.0625, price:15000000, currency:'credits', description:'3.200 escudo • 70% absorção • +6,25% regeneração.' },
  fs02: { id:'fs02', type:'generator', subtype:'shield', name:'AEG-2', shield:5600, absorption:75, shieldRegenBonus:0.0625, price:80000000, currency:'credits', description:'5.600 escudo • 75% absorção • +6,25% regeneração.' },
  fs03: { id:'fs03', type:'generator', subtype:'shield', name:'AEG-3', shield:8000, absorption:80, shieldRegenBonus:0.0625, price:0, currency:'uridium', eventOnly:true, description:'8.000 escudo • 80% absorção • recompensa de evento/missão.' },
  fs04: { id:'fs04', type:'generator', subtype:'shield', name:'AEG-4', shield:11400, absorption:80, shieldRegenBonus:0.0625, price:0, currency:'uridium', eventOnly:true, description:'11.400 escudo • 80% absorção • recompensa de evento.' },
  sg3nb00: { id:'sg3nb00', type:'generator', subtype:'shield', name:'VSH-0', shield:9000, absorption:70, price:0, currency:'uridium', eventOnly:true, description:'9.000 escudo • 70% absorção • recompensa especial.' },
  sg3na01: { id:'sg3na01', type:'generator', subtype:'shield', name:'VSH-1', shield:1000, absorption:40, price:1000000, currency:'credits', description:'1.000 escudo • 40% absorção.' },
  sg3na02: { id:'sg3na02', type:'generator', subtype:'shield', name:'VSH-2', shield:5000, absorption:50, price:5000000, currency:'credits', description:'5.000 escudo • 50% absorção.' },
  sg3na03: { id:'sg3na03', type:'generator', subtype:'shield', name:'VSH-3', shield:5000, absorption:60, price:20000000, currency:'credits', description:'5.000 escudo • 60% absorção.' },
  sg3nb01: { id:'sg3nb01', type:'generator', subtype:'shield', name:'VSH-4', shield:9500, absorption:70, price:60000000, currency:'credits', description:'9.500 escudo • 70% absorção.' },
  sg3nb02: { id:'sg3nb02', type:'generator', subtype:'shield', name:'VSH-5', shield:10000, absorption:80, price:250000, currency:'uridium', description:'10.000 escudo • 80% absorção.' },
  sg3nb03: { id:'sg3nb03', type:'generator', subtype:'shield', name:'VSH-6', shield:11450, absorption:80, price:0, currency:'uridium', eventOnly:true, description:'11.450 escudo • 80% absorção • evento/missão.' },

  // EXTRAS
  autoLaserCpu: { id: 'autoLaserCpu', type: 'extra', name: 'Mira Autônoma', price: 10000000, currency: 'credits', description: 'Ao selecionar um alvo, inicia o laser automaticamente.' },
  autoRocketCpu: { id: 'autoRocketCpu', type: 'extra', name: 'Lançador Autônomo', price: 12000000, currency: 'credits', description: 'Dispara automaticamente o míssil selecionado durante o combate.' },
  rocketTurboCpu: { id: 'rocketTurboCpu', type: 'extra', name: 'Propulsor de Recarga', price: 25000000, currency: 'credits', description: 'Reduz o cooldown de mísseis pela metade.' },

  // EXPANSÃO DE SLOTS EXTRAS
  extraSlotCpuCommon: {
    id: 'extraSlotCpuCommon', type: 'extra', name: 'CPU Expansora de Extras • Comum',
    price: 50000000, currency: 'credits', slotBonus: 3, exclusiveGroup: 'extraSlotExpansion',
    description: 'Enquanto equipada, libera +3 slots EXTRAS adicionais na nave ativa. Não acumula com a versão Elite.'
  },
  extraSlotCpuElite: {
    id: 'extraSlotCpuElite', type: 'extra', name: 'CPU Expansora de Extras • Elite',
    price: 250000, currency: 'uridium', slotBonus: 6, exclusiveGroup: 'extraSlotExpansion',
    description: 'Enquanto equipada, libera +6 slots EXTRAS adicionais na nave ativa. Não acumula com a versão Comum.'
  },

  // ROBÔS DE REPARAÇÃO AUTOMÁTICA
  rep2: {
    id: 'rep2', type: 'extra', name: 'Nanobot de Reparo • Comum',
    price: 20000000, currency: 'credits', repairRate: 0.01, repairTick: 5000, shieldRepairTick: 10000, repairDelay: 5, exclusiveGroup: 'repairBot',
    description: 'Após 5s sem receber dano, repara +5.000 HP por segundo. O escudo regenera +10.000 por segundo.'
  },
  repElite: {
    id: 'repElite', type: 'extra', name: 'Nanobot de Reparo • Elite',
    price: 180000, currency: 'uridium', repairRate: 0.02, repairTick: 10000, shieldRepairTick: 15000, repairDelay: 5, exclusiveGroup: 'repairBot',
    description: 'Após 5s sem receber dano, repara +10.000 HP por segundo. Enquanto equipado, o escudo regenera +15.000 por segundo.'
  },

  // EXPANSÃO DE PORÃO
  cargoCpuCommon: {
    id: 'cargoCpuCommon', type: 'extra', name: 'Módulo de Porão • Comum',
    price: 75000000, currency: 'credits', cargoBonus: 2500, exclusiveGroup: 'cargoExpansion',
    description: 'Enquanto equipado, aumenta a capacidade do porão da nave ativa em +2.500 unidades. Não acumula com a versão Elite.'
  },
  cargoCpuElite: {
    id: 'cargoCpuElite', type: 'extra', name: 'Módulo de Porão • Elite',
    price: 500000, currency: 'uridium', cargoBonus: 10000, exclusiveGroup: 'cargoExpansion',
    description: 'Enquanto equipado, aumenta a capacidade do porão da nave ativa em +10.000 unidades. Não acumula com a versão Comum.'
  },

  ammoAutoBuyCpu: { id: 'ammoAutoBuyCpu', type: 'extra', name: 'Repositor Automático', price: 30000000, currency: 'credits', description: 'Compra automaticamente novo pacote da munição laser e do míssil selecionados quando o estoque estiver baixo.' },

  // DRONES
  flax: { id:'flax', type:'drone', name:'Halo', slots:1, price:30000000, currency:'credits', description:'Drone comum com 1 slot de equipamento.' },
  iris: { id:'iris', type:'drone', name:'Nova', slots:2, price:900000, currency:'uridium', description:'Drone Elite com 2 slots de equipamento.' },
};

export const LASER_AMMO = {
  lcb10: { id:'lcb10', name:'PLS-1', mult:1, color:'#76d9ff', pack:10000, price:500000, currency:'credits' },
  mcb25: { id:'mcb25', name:'PLS-2', mult:2, color:'#ffe36d', pack:5000, price:1500000, currency:'credits' },
  mcb50: { id:'mcb50', name:'PLS-3', mult:3, color:'#ff9d62', pack:5000, price:20000, currency:'uridium' },
  ucb100: { id:'ucb100', name:'PLS-4', mult:4, color:'#ff5d8b', pack:5000, price:100000, currency:'uridium' },
  sab50: { id:'sab50', name:'SIP-2', mult:2, shieldDrain:true, color:'#79f1ff', pack:5000, price:45000, currency:'uridium', description:'Captura energia de escudo x2 e transfere o valor drenado para seu próprio escudo.' },
}

export const ROCKETS = {
  r310: { id: 'r310', name: 'CMT-1', damage: 1000, color: '#79d1ff', pack: 100, price: 500000, currency: 'credits' },
  plt2026: { id: 'plt2026', name: 'CMT-2', damage: 2000, color: '#98ff6c', pack: 100, price: 2000000, currency: 'credits' },
  plt2021: { id: 'plt2021', name: 'CMT-3', damage: 4000, color: '#ffd15b', pack: 100, price: 10000, currency: 'uridium' },
  plt3030: { id: 'plt3030', name: 'CMT-4', damage: 6000, color: '#ff7676', pack: 100, price: 30000, currency: 'uridium' },
};


export const RESOURCES = {
  // Mineração precisa competir com caça e missões.
  // Valores unitários de venda na base X-1.
  Prometium: { id: 'Prometium', name: 'Ferron', color: '#ff9f43', sell: 1000 },
  Endurium: { id: 'Endurium', name: 'Cryon', color: '#59d3ff', sell: 1500 },
  Terbium: { id: 'Terbium', name: 'Virel', color: '#d76bff', sell: 2500 },
  Prometid: { id: 'Prometid', name: 'Ferrite', color: '#ff6b6b', sell: 10000 },
  Duranium: { id: 'Duranium', name: 'Duracite', color: '#65f0bf', sell: 15000 },
  Promerium: { id: 'Promerium', name: 'Solarium', color: '#ffe66d', sell: 35000 },
  // Voidite usa o ID legado de recurso especial e não é vendido por Créditos.
  Xenomit: { id: 'Xenomit', name: 'Voidite', color: '#ffffff', sell: 0 },
};

// ECONOMIA: recompensas base ampliadas para sustentar a progressão de preços atual.
// BOSS principais continuam com aproximadamente 2x a recompensa do alien normal correspondente.
export const NPC_TYPES = {
  // Dano normal rebalanceado para o HP moderno das naves do Stellar Legacy.
  // A base segue a progressão do Stellar Codex, com escala de combate maior.
  streuner: { name: 'Scavenger', hp: 800, shield: 400, credits: 7500, uridium: 6, xp: 500, speed: 62, damage: 60, color: '#ff8e47', size: 15, resources: { Prometium: 10, Terbium: 10 } },
  recruitStreuner: { name: 'Scavenger Scout', hp: 600, shield: 800, credits: 9000, uridium: 8, xp: 650, speed: 68, damage: 120, color: '#ffa852', size: 14, resources: { Prometium: 12, Terbium: 12 } },
  aiderStreuner: { name: 'Scavenger Support', hp: 1500, shield: 1000, credits: 12000, uridium: 10, xp: 850, speed: 72, damage: 210, color: '#ffbb62', size: 16, resources: { Prometium: 15, Terbium: 15 } },

  // Regra Stellar Legacy: BOSS = 2x HP, escudo, dano, créditos, uridium e carga do NPC normal.
  bossStreuner: { name: 'Scavenger Prime', hp: 1600, shield: 800, credits: 15000, uridium: 12, xp: 1000, speed: 62, damage: 120, color: '#ff5e6e', size: 19, resources: { Prometium: 20, Terbium: 20 } },

  lordakia: { name: 'Vrax', hp: 2000, shield: 2000, credits: 18000, uridium: 12, xp: 1200, speed: 95, damage: 240, color: '#9f73ff', size: 18, resources: { Prometium: 20, Terbium: 20, Endurium: 20 } },
  bossLordakia: { name: 'Vrax Prime', hp: 4000, shield: 4000, credits: 36000, uridium: 24, xp: 2400, speed: 95, damage: 480, color: '#c765ff', size: 22, resources: { Prometium: 40, Terbium: 40, Endurium: 40, Xenomit: 1 } },

  saimon: { name: 'Zyron', hp: 6000, shield: 6000, credits: 35000, uridium: 18, xp: 2400, speed: 82, damage: 600, color: '#55e2ff', size: 20, resources: { Prometium: 40, Terbium: 40, Endurium: 40, Prometid: 2, Duranium: 2 } },
  bossSaimon: { name: 'Zyron Prime', hp: 12000, shield: 12000, credits: 70000, uridium: 36, xp: 4800, speed: 82, damage: 1200, color: '#24b0ff', size: 25, resources: { Prometium: 80, Terbium: 80, Endurium: 80, Prometid: 4, Duranium: 4, Xenomit: 2 } },

  mordon: { name: 'Kharon', hp: 20000, shield: 10000, credits: 90000, uridium: 40, xp: 6000, speed: 52, damage: 1170, color: '#ffa34d', size: 25, resources: { Prometium: 80, Terbium: 80, Endurium: 80, Prometid: 8, Duranium: 8, Promerium: 1 } },
  bossMordon: { name: 'Kharon Prime', hp: 40000, shield: 20000, credits: 180000, uridium: 80, xp: 12000, speed: 52, damage: 2340, color: '#ff6948', size: 31, resources: { Prometium: 160, Terbium: 160, Endurium: 160, Prometid: 16, Duranium: 16, Promerium: 2, Xenomit: 4 } },

  devolarium: { name: 'Dreadnox', hp: 100000, shield: 100000, credits: 300000, uridium: 100, xp: 18000, speed: 38, damage: 3600, color: '#7edcff', size: 32, resources: { Prometium: 100, Terbium: 100, Endurium: 100, Prometid: 16, Duranium: 16, Promerium: 2 } },
  bossDevolarium: { name: 'Dreadnox Prime', hp: 200000, shield: 200000, credits: 600000, uridium: 200, xp: 36000, speed: 38, damage: 7200, color: '#c8f0ff', size: 40, resources: { Prometium: 200, Terbium: 200, Endurium: 200, Prometid: 32, Duranium: 32, Promerium: 4, Xenomit: 8 } },

  sibelon: { name: 'Colossar', hp: 200000, shield: 200000, credits: 650000, uridium: 160, xp: 30000, speed: 30, damage: 7950, color: '#66ffcb', size: 36, resources: { Prometium: 200, Terbium: 200, Endurium: 200, Prometid: 32, Duranium: 32, Promerium: 4 } },
  bossSibelon: { name: 'Colossar Prime', hp: 400000, shield: 400000, credits: 1300000, uridium: 320, xp: 60000, speed: 30, damage: 15900, color: '#19d59d', size: 45, resources: { Prometium: 400, Terbium: 400, Endurium: 400, Prometid: 64, Duranium: 64, Promerium: 8, Xenomit: 16 } },
};


// Catálogo preparado para mapas futuros. Estes aliens NÃO são usados nos mapas atuais.
export const FUTURE_ALIENS = {
  lordakiumSpore:{name:'Vrax Spore',hp:4000,shield:4000,damage:160,xp:400,credits:800,uridium:3,futureOnly:true},
  sibelonit:{name:'Colossar Spawn',hp:40000,shield:40000,damage:3200,xp:3200,credits:12800,uridium:12,futureOnly:true},
  bossSibelonit:{name:'Colossar Spawn Prime',hp:160000,shield:160000,damage:12800,xp:12800,credits:102400,uridium:48,futureOnly:true},
  uberSibelonit:{name:'Colossar Spawn Apex',hp:320000,shield:320000,damage:8000,xp:25600,credits:204800,uridium:96,futureOnly:true},
  lordakium:{name:'Vrax Overlord',hp:300000,shield:200000,damage:3600,xp:25600,credits:204800,uridium:64,futureOnly:true},
  bossLordakium:{name:'Vrax Overlord Prime',hp:1200000,shield:800000,damage:14400,xp:102400,credits:819200,uridium:256,futureOnly:true},
  uberLordakium:{name:'Vrax Overlord Apex',hp:2400000,shield:1600000,damage:32000,xp:204800,credits:1638400,uridium:512,futureOnly:true},
  kristallin:{name:'Crysalid',hp:50000,shield:40000,damage:1650,xp:6400,credits:12800,uridium:16,futureOnly:true},
  bossKristallin:{name:'Crysalid Prime',hp:200000,shield:160000,damage:4700,xp:25600,credits:51200,uridium:64,futureOnly:true},
  uberKristallin:{name:'Crysalid Apex',hp:400000,shield:320000,damage:13200,xp:51200,credits:102400,uridium:128,futureOnly:true},
  kristallon:{name:'Crysalon',hp:400000,shield:300000,damage:4450,xp:51200,credits:409600,uridium:128,futureOnly:true},
  bossKristallon:{name:'Crysalon Prime',hp:1600000,shield:1200000,damage:20000,xp:204800,credits:1638400,uridium:512,futureOnly:true},
  uberKristallon:{name:'Crysalon Apex',hp:3200000,shield:2400000,damage:40000,xp:490000,credits:3276800,uridium:1024,futureOnly:true},
  streuneR:{name:'Reaver',hp:40000,shield:30000,damage:3000,xp:6000,credits:12000,uridium:15,futureOnly:true},
  bossStreuneR:{name:'Reaver Prime',hp:80000,shield:40000,damage:2000,xp:12800,credits:25600,uridium:32,futureOnly:true},
  uberStreuneR:{name:'Reaver Apex',hp:320000,shield:240000,damage:7500,xp:48000,credits:96000,uridium:120,futureOnly:true},
  protegit:{name:'Wardrone',hp:50000,shield:40000,damage:1500,xp:6400,credits:12800,uridium:16,futureOnly:true},
  uberProtegit:{name:'Wardrone Apex',hp:400000,shield:320000,damage:12000,xp:51200,credits:102400,uridium:128,futureOnly:true},
  cubikon:{name:'Nexus Core',hp:1600000,shield:1200000,damage:0,xp:536200,credits:1638400,uridium:1024,futureOnly:true,spawns:'Protegit'},
  impulseII:{name:'Riftling II',hp:1200000,shield:750000,damage:null,xp:null,credits:200000,uridium:45,futureOnly:true},
  attendIX:{name:'Warden IX',hp:9000000,shield:4800000,damage:null,xp:null,credits:1000000,uridium:275,futureOnly:true},
  invokeXVI:{name:'Harbinger XVI',hp:36000000,shield:0,damage:null,xp:null,credits:9500000,uridium:2000,futureOnly:true},
  mindfireBehemoth:{name:'Pyre Behemoth',hp:135000000,shield:0,damage:null,xp:null,credits:200000000,uridium:5000,futureOnly:true},
  strokelightBarrage:{name:'Starfall Barrage',hp:4500000,shield:500000,damage:null,xp:null,credits:6500000,uridium:4000,futureOnly:true},
  emperorLordakium:{name:'Emperor Vrax',hp:9600000,shield:6800000,damage:45000,xp:768000,credits:2000000,uridium:9214,futureOnly:true},
  emperorKristallon:{name:'Emperor Crysalon',hp:14080000,shield:10560000,damage:60000,xp:1536000,credits:5000000,uridium:36864,futureOnly:true},
  emperorSibelon:{name:'Emperor Colossar',hp:6400000,shield:6400000,damage:35000,xp:409600,credits:1400000,uridium:4608,futureOnly:true},
};

export const MAPS = {
  x1: {
    id: 'x1', tier: 1, name: 'Fronteira Inicial', risk: 'Seguro', world: { w: 6000, h: 4500 }, enemyMultiplier: 1.60, ores: ['Prometium', 'Endurium'], oreCount: 44, landmarkCount: 6,
    palette: { nebula: '#123a52', accent: '#4fd7ff', deep: '#030916' },
    structures: ['Home Base', 'Mission Control', 'Trader', 'Hangar', 'Ship Repair', 'Company Hierarchy'],
    portals: [{ x: 5550, y: 2250, to: 'x2' }],
    enemyGroups: [{ type: 'streuner', count: 15 }, { type: 'recruitStreuner', count: 8 }, { type: 'aiderStreuner', count: 7 }],
  },
  x2: {
    id: 'x2', tier: 2, name: 'Nebulosa Azul', risk: 'Baixo', world: { w: 6600, h: 4800 }, enemyMultiplier: 1.60, ores: ['Prometium', 'Endurium', 'Terbium'], oreCount: 52, landmarkCount: 7,
    palette: { nebula: '#154d3e', accent: '#63e7bf', deep: '#030a12' },
    structures: ['Jump Gate X-1', 'Jump Gate X-3', 'Jump Gate X-4'],
    portals: [{ x: 420, y: 2400, to: 'x1' }, { x: 6120, y: 900, to: 'x3' }, { x: 6120, y: 3900, to: 'x4' }],
    enemyGroups: [{ type: 'streuner', count: 10 }, { type: 'recruitStreuner', count: 7 }, { type: 'aiderStreuner', count: 7 }, { type: 'bossStreuner', count: 5 }, { type: 'lordakia', count: 12 }, { type: 'bossLordakia', count: 3 }],
  },
  x3: {
    id: 'x3', tier: 3, name: 'Cinturão Sombrio', risk: 'Médio', world: { w: 7200, h: 5200 }, enemyMultiplier: 1.70, ores: ['Endurium', 'Terbium'], oreCount: 58, landmarkCount: 8,
    palette: { nebula: '#4b2b58', accent: '#c978ff', deep: '#080512' },
    structures: ['Jump Gate X-2', 'Jump Gate X-4', 'Clan Battle Station'],
    portals: [{ x: 500, y: 2600, to: 'x2' }, { x: 6700, y: 2600, to: 'x4' }],
    enemyGroups: [{ type: 'lordakia', count: 10 }, { type: 'saimon', count: 10 }, { type: 'bossSaimon', count: 3 }, { type: 'mordon', count: 8 }, { type: 'bossMordon', count: 3 }, { type: 'devolarium', count: 3 }, { type: 'bossDevolarium', count: 1 }],
  },
  x4: {
    id: 'x4', tier: 4, name: 'Planícies de Fogo', risk: 'Alto', world: { w: 7800, h: 5600 }, enemyMultiplier: 1.75, ores: ['Endurium', 'Terbium'], oreCount: 64, landmarkCount: 9,
    palette: { nebula: '#173159', accent: '#66d9ff', deep: '#040a18' },
    structures: ['Jump Gate X-2', 'Jump Gate X-3', 'Battle Gate'],
    portals: [{ x: 560, y: 1100, to: 'x2' }, { x: 560, y: 4500, to: 'x3' }, { x: 7200, y: 2800, to: 'battleHome' }],
    enemyGroups: [{ type: 'lordakia', count: 7 }, { type: 'saimon', count: 8 }, { type: 'bossSaimon', count: 5 }, { type: 'mordon', count: 8 }, { type: 'sibelon', count: 4 }, { type: 'bossSibelon', count: 2 }],
  },
  b41: {
    id: 'b41', label: '4-1', tier: 41, battle: true, name: 'Deep Battle Alpha', risk: 'Extremo', world: { w: 9800, h: 7000 }, enemyMultiplier: 1.90, ores: ['Terbium'], oreCount: 72, landmarkCount: 10,
    palette: { nebula: '#29385d', accent: '#7ec8ff', deep: '#050814' },
    structures: ['Battle Gate 4-2', 'Battle Gate 4-3', 'Earth Battle Gate'],
    portals: [{ x: 750, y: 3500, to: 'x4HomeEarth' }, { x: 9000, y: 1900, to: 'b42' }, { x: 9000, y: 5100, to: 'b43' }],
    enemyGroups: [{ type: 'lordakia', count: 8 }, { type: 'saimon', count: 10 }, { type: 'mordon', count: 8 }, { type: 'bossMordon', count: 4 }, { type: 'devolarium', count: 4 }],
  },
  b42: {
    id: 'b42', label: '4-2', tier: 42, battle: true, name: 'Alien Core Beta', risk: 'Extremo', world: { w: 10400, h: 7400 }, enemyMultiplier: 2.00, ores: ['Endurium', 'Terbium'], oreCount: 78, landmarkCount: 11,
    palette: { nebula: '#38442a', accent: '#8ee1a1', deep: '#050b12' },
    structures: ['Battle Gate 4-1', 'Battle Gate 4-3', 'Mars Battle Gate'],
    portals: [{ x: 800, y: 3700, to: 'x4HomeMars' }, { x: 9500, y: 2100, to: 'b41' }, { x: 9500, y: 5300, to: 'b43' }],
    enemyGroups: [{ type: 'saimon', count: 9 }, { type: 'mordon', count: 10 }, { type: 'bossMordon', count: 5 }, { type: 'devolarium', count: 6 }, { type: 'bossDevolarium', count: 2 }],
  },
  b43: {
    id: 'b43', label: '4-3', tier: 43, battle: true, name: 'Abismo Vermelho', risk: 'Extremo', world: { w: 11200, h: 8000 }, enemyMultiplier: 2.20, ores: ['Endurium', 'Terbium'], oreCount: 86, landmarkCount: 12,
    palette: { nebula: '#5d4421', accent: '#ffc65a', deep: '#0a0805' },
    structures: ['Battle Gate 4-1', 'Battle Gate 4-2', 'Jupiter Battle Gate'],
    portals: [{ x: 850, y: 4000, to: 'x4HomeJupiter' }, { x: 10200, y: 2300, to: 'b41' }, { x: 10200, y: 5700, to: 'b42' }],
    enemyGroups: [{ type: 'mordon', count: 9 }, { type: 'devolarium', count: 8 }, { type: 'bossDevolarium', count: 4 }, { type: 'sibelon', count: 6 }, { type: 'bossSibelon', count: 3 }],
  },
  ggAlpha: {
    id: 'ggAlpha', label: 'AURORA', tier: 90, gate: true, battle: true, name: 'Portal Astral Alpha', risk: 'Portal',
    world: { w: 7200, h: 5200 }, enemyMultiplier: 1, ores: [], oreCount: 0, landmarkCount: 0,
    palette: { nebula: '#2f1d5e', accent: '#b278ff', deep: '#03030d' },
    structures: ['Portal Astral Alpha'], portals: [], enemyGroups: [],
  },
  ggBeta: {
    id: 'ggBeta', label: 'NEXUS', tier: 94, gate: true, battle: true, name: 'Portal Astral Beta', risk: 'Portal Elite',
    world: { w: 7800, h: 5600 }, enemyMultiplier: 1, ores: [], oreCount: 0, landmarkCount: 0,
    palette: { nebula: '#153f54', accent: '#55e6ff', deep: '#020c13' },
    structures: ['Portal Astral Beta'], portals: [], enemyGroups: [],
  },
  ggGamma: {
    id: 'ggGamma', label: 'ECLIPSE', tier: 99, gate: true, battle: true, name: 'Portal Astral Gamma', risk: 'Portal Extremo',
    world: { w: 8400, h: 6200 }, enemyMultiplier: 1, ores: [], oreCount: 0, landmarkCount: 0,
    palette: { nebula: '#5a1729', accent: '#ff4778', deep: '#100208' },
    structures: ['Portal Astral Gamma'], portals: [], enemyGroups: [],
  },
};
