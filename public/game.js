const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const minimap = document.querySelector('#minimap');
const mm = minimap.getContext('2d');

let W = 0;
let H = 0;
let DPR = 1;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener('resize', resize);
resize();

const $ = (sel) => document.querySelector(sel);
const ui = {
  mapLabel: $('#mapLabel'),
  shipLabel: $('#shipLabel'),
  lvl: $('#lvl'),
  hp: $('#hp'),
  shield: $('#shield'),
  credits: $('#credits'),
  uridium: $('#uridium'),
  xp: $('#xp'),
  dmg: $('#dmg'),
  rocketCd: $('#rocketCd'),
  targetName: $('#targetName'),
  targetHpBar: $('#targetHpBar'),
  targetShieldBar: $('#targetShieldBar'),
  targetStats: $('#targetStats'),
  laserAmmoButtons: $('#laserAmmoButtons'),
  rocketAmmoButtons: $('#rocketAmmoButtons'),
  laserToggle: $('#laserToggle'),
  rocketFire: $('#rocketFire'),
  autoRocket: $('#autoRocket'),
  turboRocket: $('#turboRocket'),
  hint: $('#hint'),
  toast: $('#toast'),
  hangarBtn: $('#hangarBtn'),
  hangarModal: $('#hangarModal'),
  closeHangar: $('#closeHangar'),
  shipCards: $('#shipCards'),
};

const SAVE_KEY = 'stellarLegacyV2Save';
const TWO_PI = Math.PI * 2;

const SHIPS = {
  phoenix: { id: 'phoenix', name: 'Phoenix', lasers: 1, generators: 1, speed: 320, cargo: 100, hp: 104000, extras: 1, price: 0, role: 'Iniciante' },
  liberator: { id: 'liberator', name: 'Liberator', lasers: 4, generators: 6, speed: 300, cargo: 400, hp: 116000, extras: 2, price: 20000, role: 'Equilíbrio inicial' },
  piranha: { id: 'piranha', name: 'Piranha', lasers: 6, generators: 8, speed: 360, cargo: 600, hp: 164000, extras: 2, price: 100000, role: 'Caçadora veloz' },
  leonov: { id: 'leonov', name: 'Leonov', lasers: 6, generators: 6, speed: 360, cargo: 500, hp: 164000, extras: 1, price: 200000, role: 'Rainha dos mapas baixos', bonusLowMaps: { hp: 96000, speed: 20, cargo: 500, laserMult: 1.5, rocketMult: 2, shieldMult: 2 } },
  nostromo: { id: 'nostromo', name: 'Nostromo', lasers: 7, generators: 10, speed: 340, cargo: 700, hp: 220000, extras: 3, price: 450000, role: 'Farm e progressão' },
  bigboy: { id: 'bigboy', name: 'Bigboy', lasers: 8, generators: 15, speed: 260, cargo: 800, hp: 360000, extras: 3, price: 600000, role: 'Tanque de entrada' },
  goliath: { id: 'goliath', name: 'Goliath', lasers: 15, generators: 15, speed: 300, cargo: 1500, hp: 356000, extras: 3, price: 1500000, role: 'Clássica de combate' },
};

const LASER_AMMO = [
  { id: 'lcb10', label: 'LCB-10', mult: 1, color: '#76d9ff' },
  { id: 'mcb25', label: 'MCB-25', mult: 2, color: '#ffe36d' },
  { id: 'mcb50', label: 'MCB-50', mult: 3, color: '#ff9d62' },
  { id: 'ucb100', label: 'UCB-100', mult: 4, color: '#ff5d8b' },
];

const ROCKETS = [
  { id: 'r310', label: 'R-310', damage: 1000, color: '#79d1ff' },
  { id: 'plt2026', label: 'PLT-2026', damage: 2000, color: '#98ff6c' },
  { id: 'plt2021', label: 'PLT-2021', damage: 4000, color: '#ffd15b' },
  { id: 'plt3030', label: 'PLT-3030', damage: 6000, color: '#ff7676' },
];

const NPC_TYPES = {
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
  bossDevolarium: { name: 'Boss Devolarium', hp: 400000, shield: 400000, credits: 204800, uridium: 64, speed: 34, damage: 620, color: '#c8f0ff', size: 36 },
  sibelon: { name: 'Sibelon', hp: 200000, shield: 200000, credits: 102400, uridium: 32, speed: 30, damage: 520, color: '#66ffcb', size: 36 },
  bossSibelon: { name: 'Boss Sibelon', hp: 800000, shield: 800000, credits: 409600, uridium: 128, speed: 28, damage: 840, color: '#19d59d', size: 42 },
};

const MAPS = {
  x1: {
    id: 'x1', label: 'X-1', world: { w: 2400, h: 1800 },
    ores: ['Prometium', 'Endurium'],
    structures: ['Home Base', 'Mission Control', 'Trader', 'Hangar', 'Ship Repair', 'Company Hierarchy', 'Jump Gate to X-2'],
    portals: [{ x: 2130, y: 900, to: 'x2', label: 'X-2' }],
    enemyGroups: [
      { type: 'streuner', count: 9 },
      { type: 'recruitStreuner', count: 5 },
      { type: 'aiderStreuner', count: 4 },
    ],
  },
  x2: {
    id: 'x2', label: 'X-2', world: { w: 2600, h: 1900 },
    ores: ['Prometium', 'Endurium', 'Terbium'],
    structures: ['Jump Gate to X-1', 'Jump Gate to X-3', 'Jump Gate to X-4'],
    portals: [
      { x: 220, y: 950, to: 'x1', label: 'X-1' },
      { x: 2350, y: 360, to: 'x3', label: 'X-3' },
      { x: 2350, y: 1540, to: 'x4', label: 'X-4' },
    ],
    enemyGroups: [
      { type: 'streuner', count: 6 },
      { type: 'recruitStreuner', count: 4 },
      { type: 'aiderStreuner', count: 4 },
      { type: 'bossStreuner', count: 3 },
      { type: 'lordakia', count: 7 },
      { type: 'bossLordakia', count: 2 },
    ],
  },
  x3: {
    id: 'x3', label: 'X-3', world: { w: 2900, h: 2100 },
    ores: ['Endurium', 'Terbium'],
    structures: ['Jump Gate to X-2', 'Jump Gate to X-4', 'Jump Gate to LoW', 'Clan Battle Station'],
    portals: [
      { x: 280, y: 1050, to: 'x2', label: 'X-2' },
      { x: 2620, y: 1050, to: 'x4', label: 'X-4' },
    ],
    enemyGroups: [
      { type: 'lordakia', count: 6 },
      { type: 'saimon', count: 6 },
      { type: 'bossSaimon', count: 2 },
      { type: 'mordon', count: 4 },
      { type: 'bossMordon', count: 2 },
      { type: 'devolarium', count: 1 },
    ],
  },
  x4: {
    id: 'x4', label: 'X-4', world: { w: 3200, h: 2300 },
    ores: ['Endurium', 'Terbium'],
    structures: ['Jump Gate to X-2', 'Jump Gate to X-3', 'Jump Gate to 4-X', 'Clan Battle Station'],
    portals: [
      { x: 300, y: 430, to: 'x2', label: 'X-2' },
      { x: 300, y: 1900, to: 'x3', label: 'X-3' },
    ],
    enemyGroups: [
      { type: 'lordakia', count: 4 },
      { type: 'saimon', count: 4 },
      { type: 'bossSaimon', count: 3 },
      { type: 'mordon', count: 4 },
      { type: 'sibelon', count: 2 },
      { type: 'bossSibelon', count: 1 },
    ],
  },
};

const state = {
  mapId: 'x1',
  currentMap: MAPS.x1,
  stars: Array.from({ length: 220 }, () => ({ x: Math.random() * 5000 - 2500, y: Math.random() * 5000 - 2500, r: Math.random() * 1.5 + 0.3, a: Math.random() * 0.6 + 0.2 })),
  particles: [],
  loot: [],
  ores: [],
  enemies: [],
  camera: { x: 0, y: 0 },
  pointer: { worldX: 0, worldY: 0 },
  target: null,
  toastTimer: null,
  lastPortalAt: 0,
};

const player = {
  x: 400,
  y: 900,
  tx: 400,
  ty: 900,
  level: 1,
  xp: 0,
  credits: 1000,
  uridium: 250,
  shipId: 'leonov',
  laserAmmoId: 'lcb10',
  rocketId: 'r310',
  laserAuto: false,
  autoRocket: false,
  turboRocket: false,
  lastLaserShot: 0,
  lastRocketShot: 0,
  hp: 0,
  maxHp: 0,
  shield: 0,
  maxShield: 0,
  speed: 0,
  baseLaserDamage: 0,
  rocketMult: 1,
};

function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
function rand(min, max) { return Math.random() * (max - min) + min; }
function nowSec() { return performance.now() / 1000; }

function effectiveShipData(shipId = player.shipId, mapId = state.mapId) {
  const ship = clone(SHIPS[shipId]);
  let shieldMult = 1;
  let laserMult = 1;
  let rocketMult = 1;
  if (ship.bonusLowMaps && ['x1', 'x2', 'x3', 'x4'].includes(mapId)) {
    ship.hp += ship.bonusLowMaps.hp;
    ship.speed += ship.bonusLowMaps.speed;
    ship.cargo += ship.bonusLowMaps.cargo;
    shieldMult = ship.bonusLowMaps.shieldMult;
    laserMult = ship.bonusLowMaps.laserMult;
    rocketMult = ship.bonusLowMaps.rocketMult;
  }
  ship.maxShield = Math.round(ship.generators * 12000 * shieldMult);
  ship.baseLaserDamage = Math.round(ship.lasers * 90 * laserMult);
  ship.rocketMult = rocketMult;
  return ship;
}

function applyShipStats(keepRatio = false) {
  const ship = effectiveShipData();
  const hpRatio = keepRatio && player.maxHp ? player.hp / player.maxHp : 1;
  const shRatio = keepRatio && player.maxShield ? player.shield / player.maxShield : 1;
  player.maxHp = ship.hp;
  player.maxShield = ship.maxShield;
  player.speed = ship.speed;
  player.baseLaserDamage = ship.baseLaserDamage;
  player.rocketMult = ship.rocketMult;
  player.hp = Math.max(1, Math.round(player.maxHp * hpRatio));
  player.shield = Math.max(0, Math.round(player.maxShield * shRatio));
}

function saveGame() {
  const data = {
    mapId: state.mapId,
    shipId: player.shipId,
    level: player.level,
    xp: player.xp,
    credits: player.credits,
    uridium: player.uridium,
    laserAmmoId: player.laserAmmoId,
    rocketId: player.rocketId,
    autoRocket: player.autoRocket,
    turboRocket: player.turboRocket,
    hp: player.hp,
    shield: player.shield,
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) {
    applyShipStats(false);
    return;
  }
  try {
    const data = JSON.parse(raw);
    Object.assign(player, {
      shipId: data.shipId || player.shipId,
      level: data.level || player.level,
      xp: data.xp || player.xp,
      credits: data.credits ?? player.credits,
      uridium: data.uridium ?? player.uridium,
      laserAmmoId: data.laserAmmoId || player.laserAmmoId,
      rocketId: data.rocketId || player.rocketId,
      autoRocket: !!data.autoRocket,
      turboRocket: !!data.turboRocket,
    });
    state.mapId = MAPS[data.mapId] ? data.mapId : 'x1';
    state.currentMap = MAPS[state.mapId];
    applyShipStats(false);
    player.hp = Math.min(player.maxHp, data.hp ?? player.maxHp);
    player.shield = Math.min(player.maxShield, data.shield ?? player.maxShield);
  } catch (err) {
    console.error('Falha ao carregar save', err);
    applyShipStats(false);
  }
}

function showToast(message) {
  ui.toast.textContent = message;
  ui.toast.classList.add('show');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => ui.toast.classList.remove('show'), 1800);
}

function screenPos(worldX, worldY) {
  return {
    x: worldX - state.camera.x + W / 2,
    y: worldY - state.camera.y + H / 2,
  };
}

function createOres() {
  state.ores = [];
  const ores = state.currentMap.ores;
  for (let i = 0; i < 14; i++) {
    const oreName = ores[i % ores.length];
    state.ores.push({
      x: rand(220, state.currentMap.world.w - 220),
      y: rand(220, state.currentMap.world.h - 220),
      type: oreName,
      amount: Math.round(rand(15, 40)),
      color: oreName === 'Prometium' ? '#ffa94f' : oreName === 'Endurium' ? '#59d3ff' : '#d76bff',
    });
  }
}

function spawnEnemies() {
  state.enemies = [];
  let idx = 0;
  for (const group of state.currentMap.enemyGroups) {
    const base = NPC_TYPES[group.type];
    for (let i = 0; i < group.count; i++) {
      const spawn = {
        id: `${group.type}_${idx++}_${Math.random().toString(16).slice(2, 6)}`,
        type: group.type,
        name: base.name,
        x: rand(180, state.currentMap.world.w - 180),
        y: rand(180, state.currentMap.world.h - 180),
        hp: base.hp,
        maxHp: base.hp,
        shield: base.shield,
        maxShield: base.shield,
        credits: base.credits,
        uridium: base.uridium,
        speed: base.speed,
        damage: base.damage,
        color: base.color,
        size: base.size,
        attackRange: Math.min(360, 140 + base.size * 5),
        aggroRange: 520,
        lastShot: 0,
        angle: rand(0, TWO_PI),
        drift: rand(0.4, 1.4),
      };
      state.enemies.push(spawn);
    }
  }
}

function setMap(mapId, preservePosition = false) {
  state.mapId = mapId;
  state.currentMap = MAPS[mapId];
  applyShipStats(true);
  if (!preservePosition) {
    player.x = 400;
    player.y = state.currentMap.world.h / 2;
    player.tx = player.x;
    player.ty = player.y;
  }
  state.camera.x = player.x;
  state.camera.y = player.y;
  state.target = null;
  state.loot = [];
  createOres();
  spawnEnemies();
  showToast(`Entrando em ${state.currentMap.label}`);
  saveGame();
}

function spawnParticle(x, y, text, color) {
  state.particles.push({ x, y, text, color, life: 1, vy: rand(20, 32) });
}

function addLoot(enemy) {
  state.loot.push({
    x: enemy.x,
    y: enemy.y,
    credits: enemy.credits,
    uridium: enemy.uridium,
    size: 14,
  });
}

function selectShip(shipId) {
  player.shipId = shipId;
  applyShipStats(false);
  ui.shipLabel.textContent = SHIPS[shipId].name;
  ui.hangarModal.classList.add('hidden');
  showToast(`${SHIPS[shipId].name} equipada`);
  saveGame();
}

function renderShipCards() {
  ui.shipCards.innerHTML = '';
  Object.values(SHIPS).forEach((ship) => {
    const current = ship.id === player.shipId;
    const eff = effectiveShipData(ship.id, state.mapId);
    const card = document.createElement('div');
    card.className = 'ship-card';
    card.innerHTML = `
      <div class="ship-visual"></div>
      <h3>${ship.name}</h3>
      <div class="ship-stats">
        HP: ${eff.hp.toLocaleString('pt-BR')}<br>
        ESC: ${eff.maxShield.toLocaleString('pt-BR')}<br>
        Velocidade: ${eff.speed}<br>
        Lasers: ${ship.lasers} • Geradores: ${ship.generators}<br>
        Cargo: ${eff.cargo.toLocaleString('pt-BR')}<br>
        Perfil: ${ship.role}
      </div>
    `;
    const btn = document.createElement('button');
    btn.className = 'small-btn';
    btn.textContent = current ? 'Equipado' : 'Equipar';
    btn.disabled = current;
    btn.addEventListener('click', () => selectShip(ship.id));
    card.appendChild(btn);
    ui.shipCards.appendChild(card);
  });
}

function buildAmmoButtons() {
  ui.laserAmmoButtons.innerHTML = '';
  LASER_AMMO.forEach((ammo) => {
    const btn = document.createElement('button');
    btn.className = `ammo-btn ${ammo.id === player.laserAmmoId ? 'active' : ''}`;
    btn.innerHTML = `${ammo.label}<small>x${ammo.mult}</small>`;
    btn.style.borderColor = ammo.color;
    btn.addEventListener('click', () => {
      player.laserAmmoId = ammo.id;
      buildAmmoButtons();
      saveGame();
    });
    ui.laserAmmoButtons.appendChild(btn);
  });

  ui.rocketAmmoButtons.innerHTML = '';
  ROCKETS.forEach((rocket) => {
    const btn = document.createElement('button');
    btn.className = `ammo-btn ${rocket.id === player.rocketId ? 'active' : ''}`;
    btn.innerHTML = `${rocket.label}<small>${rocket.damage.toLocaleString('pt-BR')}</small>`;
    btn.style.borderColor = rocket.color;
    btn.addEventListener('click', () => {
      player.rocketId = rocket.id;
      buildAmmoButtons();
      saveGame();
    });
    ui.rocketAmmoButtons.appendChild(btn);
  });
}

function getLaserAmmo() {
  return LASER_AMMO.find((a) => a.id === player.laserAmmoId) || LASER_AMMO[0];
}

function getRocketAmmo() {
  return ROCKETS.find((r) => r.id === player.rocketId) || ROCKETS[0];
}

function getRocketCooldown() {
  return player.turboRocket ? 3 : 5;
}

function rocketReady() {
  return nowSec() - player.lastRocketShot >= getRocketCooldown();
}

function enemyDistance(enemy) {
  return Math.hypot(enemy.x - player.x, enemy.y - player.y);
}

function dealDamageToEnemy(enemy, damage, color = '#ffffff') {
  let remaining = damage;
  if (enemy.shield > 0) {
    const absorbed = Math.min(enemy.shield, remaining);
    enemy.shield -= absorbed;
    remaining -= absorbed;
  }
  if (remaining > 0) enemy.hp -= remaining;
  spawnParticle(enemy.x, enemy.y - enemy.size, Math.round(damage), color);
  if (enemy.hp <= 0) {
    enemy.hp = 0;
    addLoot(enemy);
    if (state.target?.id === enemy.id) {
      state.target = null;
      player.laserAuto = false;
    }
  }
}

function fireRocket(manual = false) {
  if (!state.target || state.target.hp <= 0) return;
  const target = state.target;
  if (enemyDistance(target) > 680) {
    if (manual) showToast('Alvo fora do alcance do míssil');
    return;
  }
  if (!rocketReady()) {
    if (manual) showToast(`Míssil recarregando (${(getRocketCooldown() - (nowSec() - player.lastRocketShot)).toFixed(1)}s)`);
    return;
  }
  player.lastRocketShot = nowSec();
  const rocket = getRocketAmmo();
  const total = Math.round(rocket.damage * player.rocketMult);
  dealDamageToEnemy(target, total, rocket.color);
}

function gainRewards(loot) {
  player.credits += loot.credits;
  player.uridium += loot.uridium;
  player.xp += Math.round((loot.credits / 10) + loot.uridium * 12);
  spawnParticle(loot.x, loot.y, `+${loot.credits} CR / +${loot.uridium} URI`, '#ffe57b');
  while (player.xp >= player.level * 2000) {
    player.xp -= player.level * 2000;
    player.level += 1;
    showToast(`Level ${player.level}!`);
  }
}

function recoverShield(dt) {
  if (state.enemies.some((e) => e.hp > 0 && enemyDistance(e) < 430)) return;
  player.shield = Math.min(player.maxShield, player.shield + player.maxShield * 0.045 * dt);
}

function updatePlayer(dt) {
  const dx = player.tx - player.x;
  const dy = player.ty - player.y;
  const dist = Math.hypot(dx, dy);
  if (dist > 2) {
    const step = Math.min(dist, player.speed * dt);
    player.x += dx / dist * step;
    player.y += dy / dist * step;
  }
  player.x = Math.max(40, Math.min(state.currentMap.world.w - 40, player.x));
  player.y = Math.max(40, Math.min(state.currentMap.world.h - 40, player.y));

  state.camera.x += (player.x - state.camera.x) * 0.08;
  state.camera.y += (player.y - state.camera.y) * 0.08;
  recoverShield(dt);

  if (player.laserAuto && state.target && state.target.hp > 0) {
    if (enemyDistance(state.target) <= 650) {
      const shotDelay = 0.42;
      if (nowSec() - player.lastLaserShot >= shotDelay) {
        player.lastLaserShot = nowSec();
        const ammo = getLaserAmmo();
        const damage = Math.round(player.baseLaserDamage * ammo.mult * rand(0.95, 1.08));
        dealDamageToEnemy(state.target, damage, ammo.color);
      }
    }
  }

  if (player.autoRocket && state.target && state.target.hp > 0 && rocketReady()) {
    fireRocket(false);
  }

  for (let i = state.loot.length - 1; i >= 0; i--) {
    const drop = state.loot[i];
    if (Math.hypot(drop.x - player.x, drop.y - player.y) < 40) {
      gainRewards(drop);
      state.loot.splice(i, 1);
      saveGame();
    }
  }

  for (let i = state.ores.length - 1; i >= 0; i--) {
    const ore = state.ores[i];
    if (Math.hypot(ore.x - player.x, ore.y - player.y) < 30) {
      player.credits += ore.amount * 25;
      spawnParticle(ore.x, ore.y, `+${ore.amount} ${ore.type}`, ore.color);
      state.ores.splice(i, 1);
      saveGame();
    }
  }

  if (player.hp <= 0) {
    player.hp = player.maxHp;
    player.shield = Math.round(player.maxShield * 0.65);
    player.credits = Math.max(0, Math.round(player.credits * 0.95));
    player.x = 160;
    player.y = state.currentMap.world.h / 2;
    player.tx = player.x;
    player.ty = player.y;
    state.target = null;
    player.laserAuto = false;
    showToast('Nave destruída. Reparada na base.');
    saveGame();
  }

  if (nowSec() - state.lastPortalAt > 1.5) {
    for (const portal of state.currentMap.portals) {
      if (Math.hypot(portal.x - player.x, portal.y - player.y) < 58) {
        state.lastPortalAt = nowSec();
        setMap(portal.to, false);
        return;
      }
    }
  }
}

function updateEnemies(dt) {
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) continue;
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy);

    enemy.angle += dt * enemy.drift;
    if (dist < enemy.aggroRange && dist > enemy.attackRange * 0.8) {
      enemy.x += (dx / dist) * enemy.speed * dt;
      enemy.y += (dy / dist) * enemy.speed * dt;
    } else if (dist > enemy.aggroRange) {
      enemy.x += Math.cos(enemy.angle) * enemy.speed * 0.16 * dt;
      enemy.y += Math.sin(enemy.angle) * enemy.speed * 0.16 * dt;
    }

    enemy.x = Math.max(25, Math.min(state.currentMap.world.w - 25, enemy.x));
    enemy.y = Math.max(25, Math.min(state.currentMap.world.h - 25, enemy.y));

    if (dist < enemy.attackRange) {
      const interval = enemy.name.includes('Boss') ? 1.6 : 1.15;
      if (nowSec() - enemy.lastShot > interval) {
        enemy.lastShot = nowSec();
        let damage = enemy.damage * rand(0.92, 1.12);
        if (player.shield > 0) {
          const shieldTaken = Math.min(player.shield, damage);
          player.shield -= shieldTaken;
          damage -= shieldTaken;
        }
        if (damage > 0) player.hp -= damage;
        spawnParticle(player.x, player.y - 28, Math.round(enemy.damage), '#ff8080');
      }
    }
  }
}

function updateParticles(dt) {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.y -= p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}

function update(dt) {
  updatePlayer(dt);
  updateEnemies(dt);
  updateParticles(dt);
  updateUI();
}

function drawWorldBounds() {
  const p = screenPos(0, 0);
  ctx.strokeStyle = 'rgba(60,140,255,0.16)';
  ctx.lineWidth = 2;
  ctx.strokeRect(p.x, p.y, state.currentMap.world.w, state.currentMap.world.h);
}

function drawStars() {
  ctx.fillStyle = '#ffffff';
  state.stars.forEach((s) => {
    const sx = ((s.x - state.camera.x * 0.15) % (W + 80) + (W + 80)) % (W + 80) - 40;
    const sy = ((s.y - state.camera.y * 0.15) % (H + 80) + (H + 80)) % (H + 80) - 40;
    ctx.globalAlpha = s.a;
    ctx.beginPath();
    ctx.arc(sx, sy, s.r, 0, TWO_PI);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawPortals() {
  for (const portal of state.currentMap.portals) {
    const p = screenPos(portal.x, portal.y);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.strokeStyle = '#38ddff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 0, 34, 54, 0, 0, TWO_PI);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(84,225,255,.35)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.ellipse(0, 0, 20 + Math.sin(nowSec() * 4) * 2, 38, 0, 0, TWO_PI);
    ctx.stroke();
    ctx.fillStyle = '#d4f9ff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(portal.label, 0, -68);
    ctx.restore();
  }
}

function drawOres() {
  state.ores.forEach((ore) => {
    const p = screenPos(ore.x, ore.y);
    ctx.fillStyle = ore.color;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 12);
    ctx.lineTo(p.x + 10, p.y);
    ctx.lineTo(p.x, p.y + 12);
    ctx.lineTo(p.x - 10, p.y);
    ctx.closePath();
    ctx.fill();
  });
}

function drawLoot() {
  state.loot.forEach((drop) => {
    const p = screenPos(drop.x, drop.y);
    ctx.fillStyle = '#ffe77b';
    ctx.fillRect(p.x - 7, p.y - 7, 14, 14);
    ctx.strokeStyle = '#fff6bc';
    ctx.strokeRect(p.x - 7, p.y - 7, 14, 14);
  });
}

function drawEnemy(enemy) {
  const p = screenPos(enemy.x, enemy.y);
  ctx.save();
  ctx.translate(p.x, p.y);
  if (state.target?.id === enemy.id) {
    ctx.strokeStyle = '#ff3159';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.size + 7 + Math.sin(nowSec() * 5) * 1.2, 0, TWO_PI);
    ctx.stroke();
  }
  ctx.fillStyle = enemy.color;
  ctx.beginPath();
  ctx.moveTo(enemy.size, 0);
  ctx.lineTo(-enemy.size * 0.75, -enemy.size * 0.7);
  ctx.lineTo(-enemy.size * 0.15, 0);
  ctx.lineTo(-enemy.size * 0.75, enemy.size * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  const hpPct = enemy.hp / enemy.maxHp;
  const shPct = enemy.shield / enemy.maxShield;
  ctx.fillStyle = '#320b12';
  ctx.fillRect(p.x - enemy.size, p.y - enemy.size - 16, enemy.size * 2, 4);
  ctx.fillStyle = '#ff4560';
  ctx.fillRect(p.x - enemy.size, p.y - enemy.size - 16, enemy.size * 2 * hpPct, 4);
  ctx.fillStyle = '#10253f';
  ctx.fillRect(p.x - enemy.size, p.y - enemy.size - 10, enemy.size * 2, 4);
  ctx.fillStyle = '#4bcfff';
  ctx.fillRect(p.x - enemy.size, p.y - enemy.size - 10, enemy.size * 2 * shPct, 4);
}

function drawPlayer() {
  const p = screenPos(player.x, player.y);
  const ship = effectiveShipData();
  const angle = Math.atan2(player.ty - player.y, player.tx - player.x || 0);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle || 0);
  for (let i = 0; i < Math.min(ship.lasers, 8); i++) {
    const t = nowSec() * 1.5 + i * (TWO_PI / Math.min(ship.lasers, 8));
    const dx = Math.cos(t) * 24;
    const dy = Math.sin(t) * 24;
    ctx.fillStyle = 'rgba(135,210,255,.85)';
    ctx.beginPath();
    ctx.arc(dx, dy, 2.5, 0, TWO_PI);
    ctx.fill();
  }

  ctx.fillStyle = '#76e0ff';
  ctx.beginPath();
  ctx.moveTo(22, 0);
  ctx.lineTo(-14, -12);
  ctx.lineTo(-5, 0);
  ctx.lineTo(-14, 12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-18, -4, 8, 8);
  ctx.fillStyle = '#6d4fff';
  ctx.fillRect(-12, -2, 8, 4);
  ctx.restore();

  if (player.laserAuto && state.target && state.target.hp > 0 && enemyDistance(state.target) <= 650) {
    const t = screenPos(state.target.x, state.target.y);
    ctx.strokeStyle = getLaserAmmo().color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(t.x, t.y);
    ctx.stroke();
  }
}

function drawParticles() {
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  for (const p of state.particles) {
    const q = screenPos(p.x, p.y);
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, q.x, q.y);
  }
  ctx.globalAlpha = 1;
}

function drawStructuresInfo() {
  ctx.save();
  ctx.font = '12px Arial';
  ctx.fillStyle = 'rgba(200, 235, 255, .35)';
  ctx.fillText(state.currentMap.structures.join(' • '), 26, H - 60);
  ctx.restore();
}

function drawMinimap() {
  mm.clearRect(0, 0, minimap.width, minimap.height);
  mm.fillStyle = '#07111c';
  mm.fillRect(0, 0, minimap.width, minimap.height);
  mm.strokeStyle = 'rgba(75,180,255,.5)';
  mm.strokeRect(1, 1, minimap.width - 2, minimap.height - 2);

  const { w, h } = state.currentMap.world;
  const sx = minimap.width / w;
  const sy = minimap.height / h;

  for (const portal of state.currentMap.portals) {
    mm.fillStyle = '#2ce4ff';
    mm.beginPath();
    mm.arc(portal.x * sx, portal.y * sy, 4, 0, TWO_PI);
    mm.fill();
  }

  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) continue;
    mm.fillStyle = state.target?.id === enemy.id ? '#ff345e' : enemy.color;
    mm.fillRect(enemy.x * sx - 1, enemy.y * sy - 1, 3, 3);
  }

  for (const ore of state.ores) {
    mm.fillStyle = ore.color;
    mm.fillRect(ore.x * sx - 1, ore.y * sy - 1, 2, 2);
  }

  mm.fillStyle = '#ffffff';
  mm.beginPath();
  mm.arc(player.x * sx, player.y * sy, 4, 0, TWO_PI);
  mm.fill();
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  drawStars();
  drawWorldBounds();
  drawPortals();
  drawOres();
  drawLoot();
  state.enemies.forEach((enemy) => enemy.hp > 0 && drawEnemy(enemy));
  drawPlayer();
  drawParticles();
  drawStructuresInfo();
  drawMinimap();
}

function updateUI() {
  const ship = effectiveShipData();
  ui.mapLabel.textContent = state.currentMap.label;
  ui.shipLabel.textContent = ship.name;
  ui.lvl.textContent = player.level;
  ui.hp.textContent = Math.round(player.hp).toLocaleString('pt-BR');
  ui.shield.textContent = Math.round(player.shield).toLocaleString('pt-BR');
  ui.credits.textContent = Math.round(player.credits).toLocaleString('pt-BR');
  ui.uridium.textContent = Math.round(player.uridium).toLocaleString('pt-BR');
  ui.xp.textContent = Math.round(player.xp).toLocaleString('pt-BR');
  ui.dmg.textContent = Math.round(player.baseLaserDamage * getLaserAmmo().mult).toLocaleString('pt-BR');
  ui.rocketCd.textContent = rocketReady() ? 'PRONTO' : `${(getRocketCooldown() - (nowSec() - player.lastRocketShot)).toFixed(1)}s`;

  ui.laserToggle.classList.toggle('active', player.laserAuto);
  ui.autoRocket.checked = player.autoRocket;
  ui.turboRocket.checked = player.turboRocket;

  if (state.target && state.target.hp > 0) {
    ui.targetName.textContent = state.target.name;
    ui.targetStats.textContent = `HP ${Math.round(state.target.hp).toLocaleString('pt-BR')} • ESC ${Math.round(state.target.shield).toLocaleString('pt-BR')}`;
    ui.targetHpBar.style.width = `${(state.target.hp / state.target.maxHp) * 100}%`;
    ui.targetShieldBar.style.width = `${(state.target.shield / state.target.maxShield) * 100}%`;
  } else {
    ui.targetName.textContent = 'Sem alvo';
    ui.targetStats.textContent = 'Toque em um NPC para selecionar';
    ui.targetHpBar.style.width = '0%';
    ui.targetShieldBar.style.width = '0%';
  }
}

function worldPointFromEvent(ev) {
  const rect = canvas.getBoundingClientRect();
  const sx = ev.clientX - rect.left;
  const sy = ev.clientY - rect.top;
  return {
    x: sx - W / 2 + state.camera.x,
    y: sy - H / 2 + state.camera.y,
  };
}

function pointerAction(ev) {
  const p = worldPointFromEvent(ev);
  state.pointer.worldX = p.x;
  state.pointer.worldY = p.y;

  let selected = null;
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) continue;
    if (Math.hypot(enemy.x - p.x, enemy.y - p.y) <= enemy.size + 12) {
      selected = enemy;
      break;
    }
  }

  if (selected) {
    state.target = selected;
    showToast(`Alvo: ${selected.name}`);
  } else {
    player.tx = Math.max(40, Math.min(state.currentMap.world.w - 40, p.x));
    player.ty = Math.max(40, Math.min(state.currentMap.world.h - 40, p.y));
  }
}

canvas.addEventListener('pointerdown', pointerAction);
ui.laserToggle.addEventListener('click', () => {
  if (!state.target || state.target.hp <= 0) {
    showToast('Selecione um alvo primeiro');
    return;
  }
  player.laserAuto = !player.laserAuto;
  saveGame();
});
ui.rocketFire.addEventListener('click', () => fireRocket(true));
ui.autoRocket.addEventListener('change', (e) => {
  player.autoRocket = e.target.checked;
  saveGame();
});
ui.turboRocket.addEventListener('change', (e) => {
  player.turboRocket = e.target.checked;
  saveGame();
});
ui.hangarBtn.addEventListener('click', () => {
  renderShipCards();
  ui.hangarModal.classList.remove('hidden');
});
ui.closeHangar.addEventListener('click', () => ui.hangarModal.classList.add('hidden'));
ui.hangarModal.addEventListener('click', (e) => {
  if (e.target === ui.hangarModal) ui.hangarModal.classList.add('hidden');
});

document.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'h') {
    renderShipCards();
    ui.hangarModal.classList.toggle('hidden');
  }
  if (e.key === ' ') {
    e.preventDefault();
    if (state.target && state.target.hp > 0) player.laserAuto = !player.laserAuto;
  }
  if (e.key.toLowerCase() === 'r') fireRocket(true);
  if (e.key === '1') { player.laserAmmoId = LASER_AMMO[0].id; buildAmmoButtons(); }
  if (e.key === '2') { player.laserAmmoId = LASER_AMMO[1].id; buildAmmoButtons(); }
  if (e.key === '3') { player.laserAmmoId = LASER_AMMO[2].id; buildAmmoButtons(); }
  if (e.key === '4') { player.laserAmmoId = LASER_AMMO[3].id; buildAmmoButtons(); }
});

loadGame();
buildAmmoButtons();
renderShipCards();
setMap(state.mapId, false);
ui.autoRocket.checked = player.autoRocket;
ui.turboRocket.checked = player.turboRocket;
setInterval(saveGame, 7000);

let last = performance.now();
function loop(t) {
  const dt = Math.min((t - last) / 1000, 0.035);
  last = t;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
