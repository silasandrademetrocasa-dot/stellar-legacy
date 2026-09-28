export const FACTIONS = {
  earth: { id: 'earth', name: 'Terra Alliance', short: 'TERRA', prefix: '1', color: '#4fd7ff', description: 'Tecnologia, comércio e defesa orbital.' },
  mars: { id: 'mars', name: 'Mars Dominion', short: 'MARTE', prefix: '2', color: '#ff6a59', description: 'Força militar, indústria e expansão agressiva.' },
  jupiter: { id: 'jupiter', name: 'Jupiter Federation', short: 'JÚPITER', prefix: '3', color: '#bd78ff', description: 'Pesquisa, mineração e domínio das rotas externas.' },
};

export const SHIPS = {
  phoenix: { id: 'phoenix', name: 'Phoenix', lasers: 1, generators: 1, speed: 320, cargo: 100, hp: 104000, extras: 1, price: 0, currency: 'credits', role: 'Nave inicial' },
  liberator: { id: 'liberator', name: 'Liberator', lasers: 4, generators: 6, speed: 300, cargo: 400, hp: 116000, extras: 2, price: 40000, currency: 'credits', role: 'Equilíbrio inicial' },
  piranha: { id: 'piranha', name: 'Piranha', lasers: 6, generators: 8, speed: 360, cargo: 600, hp: 164000, extras: 2, price: 80000, currency: 'credits', role: 'Ataque rápido' },
  leonov: { id: 'leonov', name: 'Leonov', lasers: 6, generators: 6, speed: 360, cargo: 500, hp: 164000, extras: 1, price: 15000, currency: 'uridium', role: 'Especialista em mapas baixos', bonusLowMaps: { hp: 96000, speed: 20, cargo: 500, laserMult: 1.5, rocketMult: 2, shieldMult: 2 } },
  nostromo: { id: 'nostromo', name: 'Nostromo', lasers: 7, generators: 10, speed: 340, cargo: 700, hp: 220000, extras: 3, price: 180000, currency: 'credits', role: 'Farm e progressão' },
  bigboy: { id: 'bigboy', name: 'Bigboy', lasers: 8, generators: 15, speed: 260, cargo: 800, hp: 360000, extras: 3, price: 350000, currency: 'credits', role: 'Tanque de entrada' },
  vengeance: { id: 'vengeance', name: 'Vengeance', lasers: 10, generators: 10, speed: 380, cargo: 1000, hp: 280000, extras: 2, price: 30000, currency: 'uridium', role: 'Caçadora veloz' },
  goliath: { id: 'goliath', name: 'Goliath', lasers: 15, generators: 15, speed: 300, cargo: 1500, hp: 356000, extras: 3, price: 80000, currency: 'uridium', role: 'Combate pesado' },
  spearhead: { id: 'spearhead', name: 'Spearhead', lasers: 5, generators: 12, speed: 370, cargo: 500, hp: 200000, extras: 2, price: 45000, currency: 'uridium', role: 'Reconhecimento e mobilidade' },
  aegis: { id: 'aegis', name: 'Aegis', lasers: 10, generators: 15, speed: 300, cargo: 2000, hp: 375000, extras: 3, price: 70000, currency: 'uridium', role: 'Suporte e resistência' },
  citadel: { id: 'citadel', name: 'Citadel', lasers: 7, generators: 20, speed: 240, cargo: 4000, hp: 650000, extras: 5, price: 100000, currency: 'uridium', role: 'Tanque pesado' },
  solace: { id: 'solace', name: 'Solace', lasers: 15, generators: 15, speed: 300, cargo: 1500, hp: 356000, extras: 3, price: 110000, currency: 'uridium', role: 'Combate e reparo' },
  spectrum: { id: 'spectrum', name: 'Spectrum', lasers: 15, generators: 15, speed: 300, cargo: 1500, hp: 356000, extras: 3, price: 110000, currency: 'uridium', role: 'Defesa tática' },
};

export const ITEMS = {
  // LASERS
  lf1: { id: 'lf1', type: 'laser', name: 'LF-1', damage: 65, price: 10000, currency: 'credits', description: 'Laser básico.' },
  mp1: { id: 'mp1', type: 'laser', name: 'MP-1', damage: 70, price: 40000, currency: 'credits', description: 'Laser intermediário.' },
  sl01: { id: 'sl01', type: 'laser', name: 'SL-01', damage: 125, price: 2500000, currency: 'credits', description: 'Laser de pulso reforçado.' },
  lf2: { id: 'lf2', type: 'laser', name: 'LF-2', damage: 140, price: 250000, currency: 'credits', description: 'Laser forte para progressão.' },
  lf3: { id: 'lf3', type: 'laser', name: 'LF-3', damage: 175, price: 10000, currency: 'uridium', description: 'Laser elite clássico.' },
  lf4: { id: 'lf4', type: 'laser', name: 'LF-4', damage: 200, price: 45000, currency: 'uridium', description: 'Laser de alto desempenho.' },

  // SPEED GENERATORS
  g3n1010: { id: 'g3n1010', type: 'generator', subtype: 'speed', name: 'G3N-1010', speed: 2, price: 2000, currency: 'credits', description: '+2 velocidade.' },
  g3n2010: { id: 'g3n2010', type: 'generator', subtype: 'speed', name: 'G3N-2010', speed: 3, price: 4000, currency: 'credits', description: '+3 velocidade.' },
  g3n3210: { id: 'g3n3210', type: 'generator', subtype: 'speed', name: 'G3N-3210', speed: 4, price: 8000, currency: 'credits', description: '+4 velocidade.' },
  g3n3310: { id: 'g3n3310', type: 'generator', subtype: 'speed', name: 'G3N-3310', speed: 5, price: 16000, currency: 'credits', description: '+5 velocidade.' },
  g3n6900: { id: 'g3n6900', type: 'generator', subtype: 'speed', name: 'G3N-6900', speed: 7, price: 1000, currency: 'uridium', description: '+7 velocidade.' },
  g3n7900: { id: 'g3n7900', type: 'generator', subtype: 'speed', name: 'G3N-7900', speed: 10, price: 2000, currency: 'uridium', description: '+10 velocidade.' },

  // SHIELD GENERATORS
  sg3na01: { id: 'sg3na01', type: 'generator', subtype: 'shield', name: 'SG3N-A01', shield: 1000, absorption: 40, price: 8000, currency: 'credits', description: '1.000 escudo • 40% absorção.' },
  sg3na02: { id: 'sg3na02', type: 'generator', subtype: 'shield', name: 'SG3N-A02', shield: 5000, absorption: 50, price: 16000, currency: 'credits', description: '5.000 escudo • 50% absorção.' },
  sg3na03: { id: 'sg3na03', type: 'generator', subtype: 'shield', name: 'SG3N-A03', shield: 5000, absorption: 60, price: 256000, currency: 'credits', description: '5.000 escudo • 60% absorção.' },
  sg3nb01: { id: 'sg3nb01', type: 'generator', subtype: 'shield', name: 'SG3N-B01', shield: 9500, absorption: 70, price: 256000, currency: 'credits', description: '9.500 escudo • 70% absorção.' },
  sg3nb02: { id: 'sg3nb02', type: 'generator', subtype: 'shield', name: 'SG3N-B02', shield: 10000, absorption: 80, price: 10000, currency: 'uridium', description: '10.000 escudo • 80% absorção.' },
  sg3nb03: { id: 'sg3nb03', type: 'generator', subtype: 'shield', name: 'SG3N-B03', shield: 11450, absorption: 80, price: 18000, currency: 'uridium', description: '11.450 escudo • 80% absorção.' },

  // EXTRAS
  autoLaserCpu: { id: 'autoLaserCpu', type: 'extra', name: 'Auto Laser CPU', price: 12000, currency: 'credits', description: 'Ao selecionar um alvo, inicia o laser automaticamente.' },
  autoRocketCpu: { id: 'autoRocketCpu', type: 'extra', name: 'Auto Rocket CPU', price: 15000, currency: 'credits', description: 'Dispara automaticamente o míssil selecionado durante o combate.' },
  rocketTurboCpu: { id: 'rocketTurboCpu', type: 'extra', name: 'Rocket Turbo CPU', price: 12000, currency: 'credits', description: 'Reduz o cooldown de mísseis pela metade.' },
  rep2: { id: 'rep2', type: 'extra', name: 'Repair Bot REP-2', price: 10000, currency: 'credits', description: 'Regenera HP fora de combate.' },
  ammoAutoBuyCpu: { id: 'ammoAutoBuyCpu', type: 'extra', name: 'Auto Buy CPU', price: 18000, currency: 'credits', description: 'Compra automaticamente novo pacote da munição laser e do míssil selecionados quando o estoque estiver baixo.' },

  // DRONES
  flax: { id: 'flax', type: 'drone', name: 'Flax', slots: 1, price: 100000, currency: 'credits', description: 'Drone comum com 1 slot de equipamento.' },
  iris: { id: 'iris', type: 'drone', name: 'Iris', slots: 2, price: 15000, currency: 'uridium', description: 'Drone elite com 2 slots de equipamento.' },
};

export const LASER_AMMO = {
  lcb10: { id: 'lcb10', name: 'LCB-10', mult: 1, color: '#76d9ff', pack: 10000, price: 10000, currency: 'credits' },
  mcb25: { id: 'mcb25', name: 'MCB-25', mult: 2, color: '#ffe36d', pack: 5000, price: 10000, currency: 'credits' },
  mcb50: { id: 'mcb50', name: 'MCB-50', mult: 3, color: '#ff9d62', pack: 5000, price: 500, currency: 'uridium' },
  ucb100: { id: 'ucb100', name: 'UCB-100', mult: 4, color: '#ff5d8b', pack: 5000, price: 2500, currency: 'uridium' },
};

export const ROCKETS = {
  r310: { id: 'r310', name: 'R-310', damage: 1000, color: '#79d1ff', pack: 100, price: 10000, currency: 'credits' },
  plt2026: { id: 'plt2026', name: 'PLT-2026', damage: 2000, color: '#98ff6c', pack: 100, price: 50000, currency: 'credits' },
  plt2021: { id: 'plt2021', name: 'PLT-2021', damage: 4000, color: '#ffd15b', pack: 100, price: 500, currency: 'uridium' },
  plt3030: { id: 'plt3030', name: 'PLT-3030', damage: 6000, color: '#ff7676', pack: 100, price: 700, currency: 'uridium' },
};


export const RESOURCES = {
  Prometium: { id: 'Prometium', name: 'Prometium', color: '#ff9f43', sell: 10 },
  Endurium: { id: 'Endurium', name: 'Endurium', color: '#59d3ff', sell: 15 },
  Terbium: { id: 'Terbium', name: 'Terbium', color: '#d76bff', sell: 25 },
  Prometid: { id: 'Prometid', name: 'Prometid', color: '#ff6b6b', sell: 200 },
  Duranium: { id: 'Duranium', name: 'Duranium', color: '#65f0bf', sell: 200 },
  Promerium: { id: 'Promerium', name: 'Promerium', color: '#ffe66d', sell: 500 },
  Xenomit: { id: 'Xenomit', name: 'Xenomit', color: '#ffffff', sell: 0 },
};

export const NPC_TYPES = {
  // Dano normal rebalanceado para o HP moderno das naves do Stellar Legacy.
  // A base segue a progressão do DarkOrbitWiki, com escala de combate maior.
  streuner: { name: 'Streuner', hp: 800, shield: 400, credits: 400, uridium: 1, speed: 62, damage: 60, color: '#ff8e47', size: 15, resources: { Prometium: 10, Terbium: 10 } },
  recruitStreuner: { name: 'Recruit Streuner', hp: 600, shield: 800, credits: 500, uridium: 2, speed: 68, damage: 120, color: '#ffa852', size: 14, resources: { Prometium: 12, Terbium: 12 } },
  aiderStreuner: { name: 'Aider Streuner', hp: 1500, shield: 1000, credits: 700, uridium: 2, speed: 72, damage: 210, color: '#ffbb62', size: 16, resources: { Prometium: 15, Terbium: 15 } },

  // Regra Stellar Legacy: BOSS = 2x HP, escudo, dano, créditos, uridium e carga do NPC normal.
  bossStreuner: { name: 'Boss Streuner', hp: 1600, shield: 800, credits: 800, uridium: 2, speed: 62, damage: 120, color: '#ff5e6e', size: 19, resources: { Prometium: 20, Terbium: 20 } },

  lordakia: { name: 'Lordakia', hp: 2000, shield: 2000, credits: 800, uridium: 2, speed: 95, damage: 240, color: '#9f73ff', size: 18, resources: { Prometium: 20, Terbium: 20, Endurium: 20 } },
  bossLordakia: { name: 'Boss Lordakia', hp: 4000, shield: 4000, credits: 1600, uridium: 4, speed: 95, damage: 480, color: '#c765ff', size: 22, resources: { Prometium: 40, Terbium: 40, Endurium: 40, Xenomit: 1 } },

  saimon: { name: 'Saimon', hp: 6000, shield: 6000, credits: 1600, uridium: 4, speed: 82, damage: 600, color: '#55e2ff', size: 20, resources: { Prometium: 40, Terbium: 40, Endurium: 40, Prometid: 2, Duranium: 2 } },
  bossSaimon: { name: 'Boss Saimon', hp: 12000, shield: 12000, credits: 3200, uridium: 8, speed: 82, damage: 1200, color: '#24b0ff', size: 25, resources: { Prometium: 80, Terbium: 80, Endurium: 80, Prometid: 4, Duranium: 4, Xenomit: 2 } },

  mordon: { name: 'Mordon', hp: 20000, shield: 10000, credits: 6400, uridium: 8, speed: 52, damage: 1170, color: '#ffa34d', size: 25, resources: { Prometium: 80, Terbium: 80, Endurium: 80, Prometid: 8, Duranium: 8, Promerium: 1 } },
  bossMordon: { name: 'Boss Mordon', hp: 40000, shield: 20000, credits: 12800, uridium: 16, speed: 52, damage: 2340, color: '#ff6948', size: 31, resources: { Prometium: 160, Terbium: 160, Endurium: 160, Prometid: 16, Duranium: 16, Promerium: 2, Xenomit: 4 } },

  devolarium: { name: 'Devolarium', hp: 100000, shield: 100000, credits: 51200, uridium: 16, speed: 38, damage: 3600, color: '#7edcff', size: 32, resources: { Prometium: 100, Terbium: 100, Endurium: 100, Prometid: 16, Duranium: 16, Promerium: 2 } },
  bossDevolarium: { name: 'Boss Devolarium', hp: 200000, shield: 200000, credits: 102400, uridium: 32, speed: 38, damage: 7200, color: '#c8f0ff', size: 40, resources: { Prometium: 200, Terbium: 200, Endurium: 200, Prometid: 32, Duranium: 32, Promerium: 4, Xenomit: 8 } },

  sibelon: { name: 'Sibelon', hp: 200000, shield: 200000, credits: 102400, uridium: 32, speed: 30, damage: 7950, color: '#66ffcb', size: 36, resources: { Prometium: 200, Terbium: 200, Endurium: 200, Prometid: 32, Duranium: 32, Promerium: 4 } },
  bossSibelon: { name: 'Boss Sibelon', hp: 400000, shield: 400000, credits: 204800, uridium: 64, speed: 30, damage: 15900, color: '#19d59d', size: 45, resources: { Prometium: 400, Terbium: 400, Endurium: 400, Prometid: 64, Duranium: 64, Promerium: 8, Xenomit: 16 } },
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
};
