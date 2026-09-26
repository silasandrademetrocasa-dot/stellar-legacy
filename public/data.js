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

export const NPC_TYPES = {
  streuner: { name: 'Streuner', hp: 800, shield: 400, credits: 400, uridium: 1, speed: 62, damage: 50, color: '#ff8e47', size: 15 },
  recruitStreuner: { name: 'Recruit Streuner', hp: 600, shield: 800, credits: 500, uridium: 2, speed: 68, damage: 56, color: '#ffa852', size: 14 },
  aiderStreuner: { name: 'Aider Streuner', hp: 1500, shield: 1000, credits: 700, uridium: 2, speed: 72, damage: 65, color: '#ffbb62', size: 16 },
  bossStreuner: { name: 'Boss Streuner', hp: 3200, shield: 1600, credits: 1600, uridium: 4, speed: 70, damage: 90, color: '#ff5e6e', size: 19 },
  lordakia: { name: 'Lordakia', hp: 2000, shield: 2000, credits: 800, uridium: 2, speed: 95, damage: 95, color: '#9f73ff', size: 18 },
  bossLordakia: { name: 'Boss Lordakia', hp: 8000, shield: 8000, credits: 3200, uridium: 8, speed: 90, damage: 150, color: '#c765ff', size: 20 },
  saimon: { name: 'Saimon', hp: 6000, shield: 6000, credits: 1600, uridium: 4, speed: 82, damage: 140, color: '#55e2ff', size: 20 },
  bossSaimon: { name: 'Boss Saimon', hp: 24000, shield: 12000, credits: 6400, uridium: 16, speed: 78, damage: 230, color: '#24b0ff', size: 23 },
  mordon: { name: 'Mordon', hp: 20000, shield: 10000, credits: 6400, uridium: 8, speed: 52, damage: 220, color: '#ffa34d', size: 25 },
  bossMordon: { name: 'Boss Mordon', hp: 80000, shield: 40000, credits: 25600, uridium: 32, speed: 48, damage: 360, color: '#ff6948', size: 28 },
  devolarium: { name: 'Devolarium', hp: 100000, shield: 100000, credits: 51200, uridium: 16, speed: 38, damage: 420, color: '#7edcff', size: 32 },
  sibelon: { name: 'Sibelon', hp: 200000, shield: 200000, credits: 102400, uridium: 32, speed: 30, damage: 520, color: '#66ffcb', size: 36 },
  bossSibelon: { name: 'Boss Sibelon', hp: 800000, shield: 800000, credits: 409600, uridium: 128, speed: 28, damage: 840, color: '#19d59d', size: 42 },
};

export const MAPS = {
  x1: {
    id: 'x1', tier: 1, world: { w: 2400, h: 1800 }, ores: ['Prometium', 'Endurium'],
    structures: ['Home Base', 'Mission Control', 'Trader', 'Hangar', 'Ship Repair', 'Company Hierarchy'],
    portals: [{ x: 2130, y: 900, to: 'x2' }],
    enemyGroups: [{ type: 'streuner', count: 9 }, { type: 'recruitStreuner', count: 5 }, { type: 'aiderStreuner', count: 4 }],
  },
  x2: {
    id: 'x2', tier: 2, world: { w: 2600, h: 1900 }, ores: ['Prometium', 'Endurium', 'Terbium'],
    structures: ['Jump Gate X-1', 'Jump Gate X-3', 'Jump Gate X-4'],
    portals: [{ x: 220, y: 950, to: 'x1' }, { x: 2350, y: 360, to: 'x3' }, { x: 2350, y: 1540, to: 'x4' }],
    enemyGroups: [{ type: 'streuner', count: 6 }, { type: 'recruitStreuner', count: 4 }, { type: 'aiderStreuner', count: 4 }, { type: 'bossStreuner', count: 3 }, { type: 'lordakia', count: 7 }, { type: 'bossLordakia', count: 2 }],
  },
  x3: {
    id: 'x3', tier: 3, world: { w: 2900, h: 2100 }, ores: ['Endurium', 'Terbium'],
    structures: ['Jump Gate X-2', 'Jump Gate X-4', 'Clan Battle Station'],
    portals: [{ x: 280, y: 1050, to: 'x2' }, { x: 2620, y: 1050, to: 'x4' }],
    enemyGroups: [{ type: 'lordakia', count: 6 }, { type: 'saimon', count: 6 }, { type: 'bossSaimon', count: 2 }, { type: 'mordon', count: 4 }, { type: 'bossMordon', count: 2 }, { type: 'devolarium', count: 1 }],
  },
  x4: {
    id: 'x4', tier: 4, world: { w: 3200, h: 2300 }, ores: ['Endurium', 'Terbium'],
    structures: ['Jump Gate X-2', 'Jump Gate X-3', 'Clan Battle Station'],
    portals: [{ x: 300, y: 430, to: 'x2' }, { x: 300, y: 1900, to: 'x3' }],
    enemyGroups: [{ type: 'lordakia', count: 4 }, { type: 'saimon', count: 4 }, { type: 'bossSaimon', count: 3 }, { type: 'mordon', count: 4 }, { type: 'sibelon', count: 2 }, { type: 'bossSibelon', count: 1 }],
  },
};
