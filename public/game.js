import { FACTIONS, SHIPS, ITEMS, LASER_AMMO, ROCKETS, NPC_TYPES, MAPS, RESOURCES } from './data.js';
import { signUp, signIn, restoreSession, signOutLocal, getUser, loadCloudSave, saveCloudSave } from './api.js';

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const minimap = document.querySelector('#minimap');
const mm = minimap.getContext('2d');
const $ = (s) => document.querySelector(s);

let W = 0, H = 0, DPR = 1;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight;
  canvas.width = W * DPR; canvas.height = H * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
addEventListener('resize', resize); resize();

const ui = {
  factionLabel: $('#factionLabel'), mapLabel: $('#mapLabel'), shipLabel: $('#shipLabel'), lvl: $('#lvl'),
  hp: $('#hp'), maxHp: $('#maxHp'), shield: $('#shield'), maxShield: $('#maxShield'), speed: $('#speed'), dmg: $('#dmg'), credits: $('#credits'), uridium: $('#uridium'), xp: $('#xp'), droneCount: $('#droneCount'),
  targetName: $('#targetName'), targetHpBar: $('#targetHpBar'), targetShieldBar: $('#targetShieldBar'), targetStats: $('#targetStats'),
  laserAmmoButtons: $('#laserAmmoButtons'), rocketAmmoButtons: $('#rocketAmmoButtons'), laserToggle: $('#laserToggle'), rocketFire: $('#rocketFire'), autoLaser: $('#autoLaser'), autoRocket: $('#autoRocket'), turboRocket: $('#turboRocket'), rocketCd: $('#rocketCd'), weaponBar: $('#weaponBar'), weaponBarContent: $('#weaponBarContent'), weaponBarToggle: $('#weaponBarToggle'),
  toast: $('#toast'), portalPrompt: $('#portalPrompt'), portalPromptMap: $('#portalPromptMap'), jumpTransition: $('#jumpTransition'), jumpTitle: $('#jumpTitle'), jumpSubtitle: $('#jumpSubtitle'), factionModal: $('#factionModal'), factionCards: $('#factionCards'),
  mapBtn: $('#mapBtn'), mapModal: $('#mapModal'), closeMap: $('#closeMap'), mapNetwork: $('#mapNetwork'),
  petBtn: $('#petBtn'), petModal: $('#petModal'), closePet: $('#closePet'), petContent: $('#petContent'),
  shopBtn: $('#shopBtn'), shopModal: $('#shopModal'), closeShop: $('#closeShop'), shopTabs: $('#shopTabs'), shopGrid: $('#shopGrid'), shopCredits: $('#shopCredits'), shopUridium: $('#shopUridium'),
  hangarBtn: $('#hangarBtn'), hangarModal: $('#hangarModal'), closeHangar: $('#closeHangar'), hangarTabs: $('#hangarTabs'), hangarContent: $('#hangarContent'), hangarShipName: $('#hangarShipName'),
  loginModal: $('#loginModal'), loginTabBtn: $('#loginTabBtn'), registerTabBtn: $('#registerTabBtn'), loginForm: $('#loginForm'), registerForm: $('#registerForm'), loginEmail: $('#loginEmail'), loginPassword: $('#loginPassword'), registerCallsign: $('#registerCallsign'), registerEmail: $('#registerEmail'), registerPassword: $('#registerPassword'), authMessage: $('#authMessage'), userLabel: $('#userLabel'), syncLabel: $('#syncLabel'), logoutBtn: $('#logoutBtn'), safeZoneLabel: $('#safeZoneLabel'), cargoUsed: $('#cargoUsed'), cargoMax: $('#cargoMax'), cargoBtn: $('#cargoBtn'), cargoModal: $('#cargoModal'), closeCargo: $('#closeCargo'), cargoSummary: $('#cargoSummary'), cargoGrid: $('#cargoGrid'), sellAllCargo: $('#sellAllCargo'),
};

const SAVE_KEY_PREFIX = 'stellarLegacyV5Save';
const SAFE_ZONE = { mapId: 'x1', x: 260, y: MAPS.x1.world.h / 2, radius: 300 };
let cloudDirty = false;
let cloudBusy = false;
let authenticated = false;
function saveKey(){return `${SAVE_KEY_PREFIX}:${getUser()?.id || 'guest'}`;}
const TWO_PI = Math.PI * 2;
const categories = {
  ships: 'Naves', lasers: 'Lasers', generators: 'Geradores', drones: 'Drones', extras: 'Extras', ammo: 'Munição', rockets: 'Mísseis'
};

const PET_MAX_LEVEL = 15;
const PET_GEARS = {
  guard: { id:'guard', name:'Modo Guardião', cost:5000, description:'Ataca automaticamente inimigos no alcance que estiverem causando dano à sua nave.' },
  box: { id:'box', name:'Coletor de BOX', cost:3500, description:'Busca cargo boxes próximas e vende automaticamente os recursos vendáveis. Xenomit é guardada.' },
  ore: { id:'ore', name:'Coletor de Pedras', cost:3000, description:'Busca e coleta automaticamente pedras/minérios soltos dentro do alcance do P.E.T.' },
  repair: { id:'repair', name:'Regenerador de Vida', cost:7000, description:'Segue a nave e regenera HP automaticamente quando você estiver danificado.' },
  kami: { id:'kami', name:'Kamikaze', cost:11000, description:'Investida explosiva contra alvos próximos, causando dano em área com recarga.' },
};
function freshPet(){
  return {
    level: 1, xp: 0,
    laserSlotsUnlocked: 1, shieldSlotsUnlocked: 1,
    lasers: [null], shields: [null],
    gearsOwned: { guard:false, box:false, ore:false, repair:false, kami:false },
    activeGear: 'off'
  };
}

const MAP_GRAPH_NODES = [
  { id:'1-1', x:8, y:54 }, { id:'1-2', x:23, y:54 }, { id:'1-3', x:37, y:38 }, { id:'1-4', x:37, y:67 },
  { id:'2-1', x:82, y:10 }, { id:'2-2', x:67, y:18 }, { id:'2-3', x:53, y:28 }, { id:'2-4', x:88, y:28 },
  { id:'3-1', x:82, y:92 }, { id:'3-2', x:67, y:80 }, { id:'3-3', x:82, y:55 }, { id:'3-4', x:53, y:73 },
  { id:'4-1', x:52, y:53 }, { id:'4-2', x:66, y:44 }, { id:'4-3', x:66, y:63 }
];
const MAP_GRAPH_LINKS = [
  ['1-1','1-2'],
  ['1-2','1-3'], ['1-2','1-4'],
  ['1-3','1-4'], ['1-3','2-3'],
  ['1-4','3-4'], ['1-4','4-1'],
  ['2-1','2-2'],
  ['2-2','2-3'], ['2-2','2-4'],
  ['2-3','4-1'],
  ['2-4','4-2'], ['2-4','3-3'],
  ['3-1','3-2'],
  ['3-2','3-3'], ['3-2','3-4'],
  ['3-3','4-3'],
  ['3-4','4-3'],
  ['4-1','4-2'], ['4-1','4-3'], ['4-2','4-3']
];
const PLAYABLE_GRAPH_LABELS = new Set(['1-1','1-2','1-3','1-4','2-1','2-2','2-3','2-4','3-1','3-2','3-3','3-4','4-1','4-2','4-3']);

function blankLoadout(shipId='phoenix') {
  const ship = SHIPS[shipId];
  return {
    lasers: Array(ship.lasers).fill(null),
    generators: Array(ship.generators).fill(null),
    extras: Array(ship.extras).fill(null),
  };
}

function freshSave(factionId) {
  const loadout = blankLoadout('phoenix');
  loadout.lasers[0] = 'lf1';
  loadout.generators[0] = 'sg3na01';
  return {
    profile: { callsign: getUser()?.callsign || getUser()?.email?.split('@')[0] || 'Pilot', faction: factionId, level: 1, xp: 0, credits: 20000, uridium: 0 },
    activeShipId: 'phoenix',
    ownedShips: ['phoenix'],
    shipLoadout: loadout,
    inventory: {},
    drones: [],
    ammo: { lcb10: 10000, mcb25: 0, mcb50: 0, ucb100: 0 },
    rockets: { r310: 100, plt2026: 0, plt2021: 0, plt3030: 0 },
    selectedLaserAmmo: 'lcb10',
    selectedRocket: 'r310',
    mapId: 'x1',
    x: SAFE_ZONE.x, y: SAFE_ZONE.y,
    hp: SHIPS.phoenix.hp,
    shield: 1000,
    flags: { autoLaser: false, autoRocket: false, turboRocket: false },
    cargo: {},
    pet: freshPet(),
  };
}

let progress = null;
const player = {
  x: 380, y: 900, tx: 380, ty: 900,
  hp: 1, maxHp: 1, shield: 0, maxShield: 0, speed: 320, laserDamage: 0, shieldAbsorption: 0,
  laserFiring: false, lastLaserShot: 0, lastRocketShot: -999,
};
const petRuntime = {
  x: 410, y: 930, tx: 410, ty: 930,
  lastShot: -999, laserTargetId: null, laserUntil: 0,
  taskType: 'follow', taskId: null
};
const state = {
  currentMap: MAPS.x1, camera: { x: 380, y: 900 }, target: null, enemies: [], loot: [], ores: [], particles: [], enemyRespawns: [], oreRespawns: [], lastPortalAt: 0, radarRange: 920, jumping: false,
  shopTab: 'ships', hangarTab: 'ships', toastTimer: null, ammoUiExpanded: true,
  stars: Array.from({length:240},()=>({x:Math.random()*5200-2600,y:Math.random()*5200-2600,r:Math.random()*1.5+.3,a:Math.random()*.6+.2})),
};

function clone(v){return JSON.parse(JSON.stringify(v));}
function rand(a,b){return Math.random()*(b-a)+a;}
function nowSec(){return performance.now()/1000;}
function fmt(v){return Math.max(0,Math.round(v)).toLocaleString('pt-BR');}
function shortLaserLabel(id){return ({lcb10:'x1',mcb25:'x2',mcb50:'x3',ucb100:'x4'})[id]||id.toUpperCase();}
function shortRocketLabel(id){return ({r310:'R310',plt2026:'PLT26',plt2021:'PLT21',plt3030:'PLT30'})[id]||id.replace(/[^a-z0-9]/gi,'').toUpperCase();}
function ammoTooltipText(a,qty,laserUse,petUse,bursts){return `${a.name} • dano x${a.mult}\nEstoque: ${fmt(qty)}\nNave: -${laserUse}/rajada${petUse?` • P.E.T.: -${petUse}`:''}\nRajadas restantes: ~${fmt(bursts)}`;}
function rocketTooltipText(r,qty){return `${r.name} • dano ${fmt(r.damage)}\nEstoque: ${fmt(qty)}\nConsumo: -1/disparo`; }
function applyAmmoUiState(){ if(!ui.weaponBar) return; ui.weaponBar.classList.toggle('collapsed', !state.ammoUiExpanded); if(ui.weaponBarToggle) ui.weaponBarToggle.textContent = state.ammoUiExpanded ? '▾' : '▸'; }
function loadAmmoUiState(){ try{ const raw=localStorage.getItem('stellar_ammo_ui_expanded'); if(raw!==null) state.ammoUiExpanded = raw==='1'; }catch{} applyAmmoUiState(); }
function toggleAmmoUi(){ state.ammoUiExpanded=!state.ammoUiExpanded; try{ localStorage.setItem('stellar_ammo_ui_expanded', state.ammoUiExpanded?'1':'0'); }catch{} applyAmmoUiState(); }
function getFaction(){return progress?.profile?.faction ? FACTIONS[progress.profile.faction] : null;}
function displayMapLabel(mapId){const map=MAPS[mapId];if(!map)return '—';if(map.battle)return map.label;const f=getFaction();return f?`${f.prefix}-${map.tier}`:`X-${map.tier}`;}
function currentGraphMapLabel(){return progress?displayMapLabel(progress.mapId):null;}
function internalMapFromGraphLabel(label){if(label==='4-1')return 'b41';if(label==='4-2')return 'b42';if(label==='4-3')return 'b43';const f=getFaction();if(!f||!label.startsWith(`${f.prefix}-`))return null;const tier=Number(label.split('-')[1]);return tier>=1&&tier<=4?`x${tier}`:null;}
function graphLevelRequirement(label){if(label.startsWith('4-'))return 4;const tier=Number(label.split('-')[1]||99);return tier<=2?1:tier===3?2:tier===4?3:99;}
function canTravelGraphLabel(label){const mapId=internalMapFromGraphLabel(label);if(!mapId)return {ok:false,reason:'Território de outra facção'};const req=graphLevelRequirement(label);if((progress?.profile?.level||1)<req)return {ok:false,reason:`Requer nível ${req}`};return {ok:true,mapId};}
function mapArtFor(label){const palettes={
  '1-1':'radial-gradient(circle at 28% 35%,#6ce6ff 0 3%,transparent 4%),radial-gradient(circle at 70% 62%,#1f6a8c 0 8%,transparent 22%),linear-gradient(135deg,#06131f,#112c3c)',
  '1-2':'radial-gradient(circle at 62% 35%,#35c879 0 7%,transparent 18%),radial-gradient(circle at 34% 70%,#11654a 0 8%,transparent 22%),linear-gradient(135deg,#04130f,#17382d)',
  '1-3':'radial-gradient(circle at 28% 60%,#5488ff 0 7%,transparent 18%),radial-gradient(circle at 72% 30%,#2d203e 0 12%,transparent 25%),linear-gradient(135deg,#080b18,#182338)',
  '1-4':'radial-gradient(circle at 68% 36%,#7566e8 0 7%,transparent 18%),radial-gradient(circle at 35% 65%,#3b2c66 0 11%,transparent 26%),linear-gradient(135deg,#0a0818,#201737)',
  '2-1':'radial-gradient(circle at 36% 38%,#9d6bff 0 8%,transparent 19%),radial-gradient(circle at 75% 62%,#5d497c 0 12%,transparent 24%),linear-gradient(135deg,#080713,#21182d)',
  '2-2':'radial-gradient(circle at 62% 55%,#39b88b 0 7%,transparent 20%),radial-gradient(circle at 32% 32%,#5b2674 0 9%,transparent 21%),linear-gradient(135deg,#071114,#262038)',
  '2-3':'radial-gradient(circle at 25% 48%,#d48b32 0 9%,transparent 20%),radial-gradient(circle at 70% 30%,#5e7bb2 0 10%,transparent 24%),linear-gradient(135deg,#10101a,#312417)',
  '2-4':'radial-gradient(circle at 40% 36%,#4da0b8 0 8%,transparent 20%),radial-gradient(circle at 76% 68%,#28505c 0 10%,transparent 24%),linear-gradient(135deg,#06101a,#172d35)',
  '3-1':'radial-gradient(circle at 68% 54%,#39a96f 0 8%,transparent 20%),radial-gradient(circle at 30% 38%,#7b2137 0 12%,transparent 26%),linear-gradient(135deg,#16070b,#3d121b)',
  '3-2':'radial-gradient(circle at 32% 52%,#ff6d77 0 7%,transparent 19%),radial-gradient(circle at 70% 35%,#8c2943 0 12%,transparent 25%),linear-gradient(135deg,#16070d,#42131f)',
  '3-3':'radial-gradient(circle at 72% 52%,#d77942 0 9%,transparent 21%),radial-gradient(circle at 30% 30%,#7b381f 0 12%,transparent 26%),linear-gradient(135deg,#140b07,#3b2317)',
  '3-4':'radial-gradient(circle at 40% 40%,#74b9ff 0 8%,transparent 20%),radial-gradient(circle at 70% 67%,#2b6d91 0 12%,transparent 25%),linear-gradient(135deg,#06101a,#163248)',
  '4-1':'radial-gradient(circle at 28% 42%,#ba6aff 0 7%,transparent 18%),radial-gradient(circle at 68% 60%,#536f9d 0 10%,transparent 24%),linear-gradient(135deg,#090918,#222949)',
  '4-2':'radial-gradient(circle at 36% 35%,#ff8d92 0 7%,transparent 20%),radial-gradient(circle at 72% 62%,#4c8655 0 10%,transparent 25%),linear-gradient(135deg,#0a100a,#243526)',
  '4-3':'radial-gradient(circle at 70% 40%,#ffc85a 0 8%,transparent 20%),radial-gradient(circle at 30% 65%,#805d1e 0 12%,transparent 24%),linear-gradient(135deg,#120e06,#40300e)'};return palettes[label]||'linear-gradient(135deg,#08111c,#172338)';}
function renderMapModal(){if(!ui.mapNetwork||!progress)return;const current=currentGraphMapLabel();const nodeMap=Object.fromEntries(MAP_GRAPH_NODES.map(n=>[n.id,n]));let html=`<svg class="map-svg" viewBox="0 0 100 100" preserveAspectRatio="none">`;for(const [a,b] of MAP_GRAPH_LINKS){const na=nodeMap[a],nb=nodeMap[b];html+=`<line class="map-link" x1="${na.x}" y1="${na.y}" x2="${nb.x}" y2="${nb.y}" />`;}html+='</svg>';html+=`<div class="map-legend"><span><i class="dot curr"></i> mapa atual</span><span><i class="dot own"></i> liberado</span><span><i class="dot future"></i> bloqueado</span></div>`;for(const node of MAP_GRAPH_NODES){const access=canTravelGraphLabel(node.id),active=node.id===current,battle=node.id.startsWith('4-');const own=!!internalMapFromGraphLabel(node.id);const classes=['map-node'];if(active)classes.push('current');if(own)classes.push('faction');if(battle)classes.push('battle');if(access.ok&&!active)classes.push('travel');if(!access.ok)classes.push('locked');const sub=active?'ATUAL':access.ok?'LIBERADO':access.reason;html+=`<div class="${classes.join(' ')}" data-map-label="${node.id}" style="left:${node.x}%;top:${node.y}%;--art:${mapArtFor(node.id)}"><div class="node-art"></div><div class="node-overlay"></div><div class="node-sub">${sub}</div>${!access.ok?'<div class="node-lock">🔒</div>':''}<div class="node-label">${node.id}</div></div>`;}ui.mapNetwork.innerHTML=html;ui.mapNetwork.querySelectorAll('.map-node.travel').forEach(el=>el.addEventListener('click',()=>{const label=el.dataset.mapLabel,access=canTravelGraphLabel(label);if(!access.ok)return;ui.mapModal.classList.add('hidden');runMapTransition(access.mapId,null,'NAVIGAÇÃO DIRETA');}));}
function openMapModal(){renderMapModal();ui.mapModal.classList.remove('hidden');}
function isSafeZone(x=player.x,y=player.y){return !!progress&&progress.mapId===SAFE_ZONE.mapId&&Math.hypot(x-SAFE_ZONE.x,y-SAFE_ZONE.y)<=SAFE_ZONE.radius;}
function safeZoneDistance(x,y){return Math.hypot(x-SAFE_ZONE.x,y-SAFE_ZONE.y);}
function cargoCapacity(){const ship=SHIPS[progress?.activeShipId||'phoenix'];let cap=ship.cargo||0;if(ship.bonusLowMaps&&progress&&['x1','x2','x3','x4'].includes(progress.mapId))cap+=ship.bonusLowMaps.cargo||0;return cap;}
function cargoUsed(){return Object.entries(progress?.cargo||{}).reduce((a,[id,b])=>id==='Xenomit'?a:a+(Number(b)||0),0);}
function cargoFree(){return Math.max(0,cargoCapacity()-cargoUsed());}
function addCargoResource(id,qty){if(!progress||qty<=0)return 0;const amount=Math.floor(qty);if(id==='Xenomit'){progress.cargo[id]=(progress.cargo[id]||0)+amount;return amount;}const take=Math.min(amount,cargoFree());if(take<=0)return 0;progress.cargo[id]=(progress.cargo[id]||0)+take;return take;}
function playerLaserRange(){return state.currentMap?.battle ? 980 : 760;}
function playerRocketRange(){return state.currentMap?.battle ? 860 : 680;}
function mapRadarRange(){return state.currentMap?.battle ? 1380 : 920;}
function isAtTrader(){return progress?.mapId==='x1'&&isSafeZone();}
function showToast(msg){ui.toast.textContent=msg;ui.toast.classList.add('show');clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),1900);}
function setSync(text,cls=''){ui.syncLabel.textContent=text;ui.syncLabel.className=`sync-chip ${cls}`.trim();}
function saveGame(){if(!progress)return;localStorage.setItem(saveKey(),JSON.stringify(progress));cloudDirty=true;}
function loadLocalGame(){
  const raw=localStorage.getItem(saveKey());
  if(!raw){progress=null;return;}
  try{progress=JSON.parse(raw);hydrateProgress();}catch(e){console.warn(e);progress=null;}
}
function hydrateProgress(){
  if(!progress)return;
  if(!progress.profile?.faction || !SHIPS[progress.activeShipId]) throw new Error('save incompleto');
  progress.profile.callsign ||= getUser()?.callsign || getUser()?.email?.split('@')[0] || 'Pilot';
  progress.ownedShips ||= ['phoenix'];progress.inventory ||= {};progress.drones ||= [];progress.ammo ||= {};progress.rockets ||= {};progress.flags ||= {};progress.cargo ||= {};
  progress.pet ||= freshPet();
  progress.pet.level=Math.max(1,Math.min(PET_MAX_LEVEL,Number(progress.pet.level)||1));
  progress.pet.xp=Math.max(0,Number(progress.pet.xp)||0);
  progress.pet.laserSlotsUnlocked=Math.max(1,Math.min(progress.pet.level,Number(progress.pet.laserSlotsUnlocked)||1));
  progress.pet.shieldSlotsUnlocked=Math.max(1,Math.min(progress.pet.level,Number(progress.pet.shieldSlotsUnlocked)||1));
  progress.pet.lasers ||= [null]; progress.pet.shields ||= [null];
  while(progress.pet.lasers.length<progress.pet.laserSlotsUnlocked)progress.pet.lasers.push(null);
  while(progress.pet.shields.length<progress.pet.shieldSlotsUnlocked)progress.pet.shields.push(null);
  progress.pet.lasers=progress.pet.lasers.slice(0,progress.pet.laserSlotsUnlocked);
  progress.pet.shields=progress.pet.shields.slice(0,progress.pet.shieldSlotsUnlocked);
  progress.pet.gearsOwned ||= {guard:false,box:false,ore:false,repair:false,kami:false};
  for(const key of ['guard','box','ore','repair','kami']) if(progress.pet.gearsOwned[key]===undefined) progress.pet.gearsOwned[key]=false;
  progress.pet.activeGear ||= 'off';
  progress.shipLoadout ||= blankLoadout(progress.activeShipId);normalizeLoadout();
}
async function flushCloudSave(force=false){
  if(!authenticated||!progress||cloudBusy||(!cloudDirty&&!force))return;
  cloudBusy=true;setSync('SALVANDO','busy');
  try{await saveCloudSave(progress);cloudDirty=false;setSync('ONLINE','ok');}
  catch(e){console.warn('cloud save',e);setSync('OFFLINE','err');}
  finally{cloudBusy=false;}
}

function normalizeLoadout(){
  if(!progress)return;
  const ship=SHIPS[progress.activeShipId];
  for(const type of ['lasers','generators','extras']){
    progress.shipLoadout[type] ||= [];
    const cap=type==='lasers'?ship.lasers:type==='generators'?ship.generators:ship.extras;
    while(progress.shipLoadout[type].length<cap)progress.shipLoadout[type].push(null);
    if(progress.shipLoadout[type].length>cap){
      const overflow=progress.shipLoadout[type].splice(cap);
      overflow.filter(Boolean).forEach(addInventory);
    }
  }
}

function addInventory(itemId,count=1){progress.inventory[itemId]=(progress.inventory[itemId]||0)+count;}
function removeInventory(itemId,count=1){
  if((progress.inventory[itemId]||0)<count)return false;
  progress.inventory[itemId]-=count;
  if(progress.inventory[itemId]<=0)delete progress.inventory[itemId];
  return true;
}
function hasExtra(itemId){return progress.shipLoadout.extras.includes(itemId);}
function autoLaserEnabled(){return hasExtra('autoLaserCpu');}
function autoRocketEnabled(){return hasExtra('autoRocketCpu');}
function turboRocketEnabled(){return hasExtra('rocketTurboCpu');}
function autoBuyEnabled(){return hasExtra('ammoAutoBuyCpu');}
function canAutoBuy(def){return !!def && (def.currency==='credits'?progress.profile.credits>=def.price:progress.profile.uridium>=def.price);}
function buyAmmoPack(id,silent=false){const a=LASER_AMMO[id];if(!a||!charge(a.price,a.currency))return false;progress.ammo[id]=(progress.ammo[id]||0)+a.pack;if(!silent)showToast(`+${fmt(a.pack)} ${a.name}`);saveGame();return true;}
function buyRocketPack(id,silent=false){const r=ROCKETS[id];if(!r||!charge(r.price,r.currency))return false;progress.rockets[id]=(progress.rockets[id]||0)+r.pack;if(!silent)showToast(`+${fmt(r.pack)} ${r.name}`);saveGame();return true;}
function maybeAutoBuyAmmo(){
  if(!progress||!autoBuyEnabled()) return;
  const now=nowSec();
  if(now-state.lastAutoBuyAt<0.9) return;
  let bought=[];
  const laser=currentLaserAmmo(), rocket=currentRocket();
  const laserNeed=Math.max(1,equippedLaserCount())*10;
  if(ammoQty(laser.id)<laserNeed && canAutoBuy(laser) && buyAmmoPack(laser.id,true)) bought.push(`${laser.name} +${fmt(laser.pack)}`);
  if(rocketQty(rocket.id)<10 && canAutoBuy(rocket) && buyRocketPack(rocket.id,true)) bought.push(`${rocket.name} +${fmt(rocket.pack)}`);
  if(bought.length){state.lastAutoBuyAt=now;refreshAmmoCounters();renderShop();showToast(`Auto Buy: ${bought.join(' • ')}`);} 
}
function allEquippedIds(){return [...progress.shipLoadout.lasers,...progress.shipLoadout.generators,...progress.shipLoadout.extras,...progress.drones.flatMap(d=>d.slots)].filter(Boolean);}
function equippedLaserIds(){return [...progress.shipLoadout.lasers,...progress.drones.flatMap(d=>d.slots)].filter(id=>ITEMS[id]?.type==='laser');}
function equippedLaserCount(){return equippedLaserIds().length;}

function petLevelXp(level){return Math.round(900+level*650+level*level*80);}
function petRange(){return 300+(progress?.pet?.level||1)*34;}
function petSlotCost(slotNumber){return Math.round(250*slotNumber+75*slotNumber*slotNumber);}
function petLaserIds(){return (progress?.pet?.lasers||[]).filter(id=>ITEMS[id]?.type==='laser');}
function petShieldIds(){return (progress?.pet?.shields||[]).filter(id=>ITEMS[id]?.type==='generator'&&ITEMS[id]?.subtype==='shield');}
function petDamage(){return petLaserIds().reduce((sum,id)=>sum+(ITEMS[id]?.damage||0),0);}
function petMaxShield(){return petShieldIds().reduce((sum,id)=>sum+(ITEMS[id]?.shield||0),0);}
function addPetXp(amount){
  if(!progress?.pet||amount<=0||progress.pet.level>=PET_MAX_LEVEL)return;
  progress.pet.xp+=Math.round(amount);
  let leveled=false;
  while(progress.pet.level<PET_MAX_LEVEL){
    const need=petLevelXp(progress.pet.level);
    if(progress.pet.xp<need)break;
    progress.pet.xp-=need;
    progress.pet.level++;
    leveled=true;
    showToast(`P.E.T. subiu para o nível ${progress.pet.level}! Novo slot disponível para compra.`);
  }
  if(progress.pet.level>=PET_MAX_LEVEL)progress.pet.xp=0;
  if(leveled){saveGame();if(ui.petModal&&!ui.petModal.classList.contains('hidden'))renderPet();}
}
function unlockPetSlot(kind){
  const pet=progress.pet;
  const key=kind==='laser'?'laserSlotsUnlocked':'shieldSlotsUnlocked';
  const list=kind==='laser'?pet.lasers:pet.shields;
  const next=pet[key]+1;
  if(next>pet.level){showToast(`P.E.T. precisa estar no nível ${next}`);return;}
  const cost=petSlotCost(next);
  if(progress.profile.uridium<cost){showToast(`Faltam ${fmt(cost-progress.profile.uridium)} URI`);return;}
  progress.profile.uridium-=cost;pet[key]=next;list.push(null);saveGame();renderPet();updateUI();showToast(`Slot ${next} de ${kind==='laser'?'laser':'escudo'} liberado`);
}
function equipPetItem(itemId,kind){
  const item=ITEMS[itemId];
  const valid=kind==='laser'?item?.type==='laser':item?.type==='generator'&&item?.subtype==='shield';
  if(!valid){showToast(kind==='laser'?'O P.E.T. aceita lasers nesse espaço':'O P.E.T. aceita geradores de escudo nesse espaço');return;}
  const list=kind==='laser'?progress.pet.lasers:progress.pet.shields;
  const idx=list.findIndex(v=>!v);if(idx<0){showToast('Sem slot liberado vazio no P.E.T.');return;}
  if(!removeInventory(itemId)){showToast('Item não disponível');return;}
  list[idx]=itemId;saveGame();renderPet();refreshAmmoCounters();
}
function unequipPetSlot(kind,index){
  const list=kind==='laser'?progress.pet.lasers:progress.pet.shields;
  const id=list[index];if(!id)return;list[index]=null;addInventory(id);saveGame();renderPet();refreshAmmoCounters();
}
function buyPetGear(id){
  const gear=PET_GEARS[id];if(!gear)return;
  if(progress.pet.gearsOwned[id]){showToast('Módulo já comprado');return;}
  if(progress.profile.uridium<gear.cost){showToast(`Faltam ${fmt(gear.cost-progress.profile.uridium)} URI`);return;}
  progress.profile.uridium-=gear.cost;progress.pet.gearsOwned[id]=true;saveGame();renderPet();updateUI();showToast(`${gear.name} adquirido`);
}
function setPetGear(id){
  if(id!=='off'&&!progress.pet.gearsOwned[id]){showToast('Compre esse módulo primeiro');return;}
  progress.pet.activeGear=id;petRuntime.taskId=null;petRuntime.taskType='follow';saveGame();renderPet();
  showToast(id==='off'?'P.E.T. em modo companhia':PET_GEARS[id].name+' ativado');
}
function sellPetCargoBox(drop){
  let credits=0,total=0;
  for(const [id,qty] of Object.entries(drop.resources||{})){
    if(id==='Xenomit'){progress.cargo.Xenomit=(progress.cargo.Xenomit||0)+qty;total+=qty;continue;}
    const price=RESOURCES[id]?.sell||0;
    if(price>0){credits+=price*qty;total+=qty;}
    else {const got=addCargoResource(id,qty);total+=got;}
  }
  progress.profile.credits+=credits;
  if(credits>0)spawnParticle(drop.x,drop.y,`P.E.T. +${fmt(credits)} CR`,'#ffd36c');
  addPetXp(Math.max(4,total*2));saveGame();
}
function petNearest(list,xKey='x',yKey='y'){
  let best=null,bestD=Infinity;const range=petRange();
  for(const obj of list){const d=Math.hypot(obj[xKey]-player.x,obj[yKey]-player.y);if(d<=range&&d<bestD){best=obj;bestD=d;}}
  return best;
}
function updatePet(dt){
  if(!progress?.pet)return;
  const pet=progress.pet, mode=pet.activeGear||'off', followAngle=nowSec()*.7;
  let targetX=player.x+Math.cos(followAngle)*58,targetY=player.y+Math.sin(followAngle)*58,task=null;
  const now=nowSec();

  if(mode==='guard'&&pet.gearsOwned.guard){
    task=state.enemies.filter(e=>e.hp>0&&e.lastAttackPlayerAt&&now-e.lastAttackPlayerAt<4.2&&Math.hypot(e.x-player.x,e.y-player.y)<=petRange())
      .sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y))[0]||null;
    if(task){targetX=task.x;targetY=task.y;petRuntime.taskType='guard';petRuntime.taskId=task.id;}
  }else if(mode==='box'&&pet.gearsOwned.box){
    task=petNearest(state.loot);
    if(task){targetX=task.x;targetY=task.y;petRuntime.taskType='box';petRuntime.taskId=task.id;}
  }else if(mode==='ore'&&pet.gearsOwned.ore&&cargoFree()>0){
    task=petNearest(state.ores);
    if(task){targetX=task.x;targetY=task.y;petRuntime.taskType='ore';petRuntime.taskId=task.id;}
  }else if(mode==='repair'&&pet.gearsOwned.repair){
    petRuntime.taskType='repair';petRuntime.taskId=null;
    targetX=player.x+38;targetY=player.y-42;
    if(player.hp<player.maxHp)player.hp=Math.min(player.maxHp, player.hp + player.maxHp*(0.012+pet.level*0.0008)*dt);
  }else if(mode==='kami'&&pet.gearsOwned.kami){
    task=state.enemies.filter(e=>e.hp>0&&Math.hypot(e.x-player.x,e.y-player.y)<=Math.min(petRange(),340))
      .sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y))[0]||null;
    if(task){targetX=task.x;targetY=task.y;petRuntime.taskType='kami';petRuntime.taskId=task.id;}
  }else {petRuntime.taskType='follow';petRuntime.taskId=null;}

  const dx=targetX-petRuntime.x,dy=targetY-petRuntime.y,d=Math.hypot(dx,dy);
  const petSpeed=Math.max(420,player.speed*1.35);
  if(d>4){const step=Math.min(d,petSpeed*dt);petRuntime.x+=dx/d*step;petRuntime.y+=dy/d*step;}
  if(Math.hypot(petRuntime.x-player.x,petRuntime.y-player.y)>petRange()*1.45){petRuntime.x=player.x+42;petRuntime.y=player.y+42;}

  if(mode==='guard'&&task&&task.hp>0){
    const pd=Math.hypot(task.x-petRuntime.x,task.y-petRuntime.y);
    const lasers=petLaserIds(),ammo=currentLaserAmmo(),stock=ammoQty(ammo.id);
    if(pd<350&&lasers.length&&stock>0&&nowSec()-petRuntime.lastShot>.58){
      const firing=Math.min(lasers.length,stock);
      const ids=lasers.slice(0,firing);
      const damage=Math.round(ids.reduce((s,id)=>s+(ITEMS[id]?.damage||0),0)*ammo.mult*rand(.95,1.08));
      progress.ammo[ammo.id]=Math.max(0,stock-firing);petRuntime.lastShot=nowSec();petRuntime.laserTargetId=task.id;petRuntime.laserUntil=nowSec()+.16;
      if(damage>0)dealDamageToEnemy(task,damage,ammo.color);refreshAmmoCounters();
    }
  }
  if(mode==='kami'&&task&&task.hp>0&&Math.hypot(task.x-petRuntime.x,task.y-petRuntime.y)<70&&now-(petRuntime.lastKami||0)>15){
    petRuntime.lastKami=now;
    const boomDmg=Math.round(3500 + pet.level*650 + petDamage()*2.5);
    spawnParticle(petRuntime.x,petRuntime.y,'KAMIKAZE','#ff7d8f');
    state.enemies.filter(e=>e.hp>0&&Math.hypot(e.x-petRuntime.x,e.y-petRuntime.y)<110).forEach(e=>dealDamageToEnemy(e,boomDmg,'#ff7d8f'));
  }
  if(mode==='box'&&task&&Math.hypot(task.x-petRuntime.x,task.y-petRuntime.y)<28){
    sellPetCargoBox(task);state.loot=state.loot.filter(x=>x.id!==task.id);petRuntime.taskId=null;
  }
  if(mode==='ore'&&task&&Math.hypot(task.x-petRuntime.x,task.y-petRuntime.y)<24){
    const got=addCargoResource(task.type,task.amount);
    if(got>0){spawnParticle(task.x,task.y,`P.E.T. +${got} ${task.type}`,task.color);addPetXp(3);state.ores=state.ores.filter(x=>x.id!==task.id);state.oreRespawns.push({type:task.type,at:nowSec()+rand(5,12)});saveGame();}
    petRuntime.taskId=null;
  }
}

function computeStats(keepRatio=true){
  if(!progress)return;
  const ship=SHIPS[progress.activeShipId];
  const low=['x1','x2','x3','x4'].includes(progress.mapId);
  const oldHpRatio=player.maxHp?player.hp/player.maxHp:1, oldShieldRatio=player.maxShield?player.shield/player.maxShield:1;
  const laserIds=[...progress.shipLoadout.lasers,...progress.drones.flatMap(d=>d.slots)].filter(id=>ITEMS[id]?.type==='laser');
  const genIds=[...progress.shipLoadout.generators,...progress.drones.flatMap(d=>d.slots)].filter(id=>ITEMS[id]?.type==='generator');
  let hp=ship.hp, speed=ship.speed, shield=0, laserDamage=0, absorption=0, rocketMult=1;
  for(const id of laserIds)laserDamage+=ITEMS[id].damage||0;
  for(const id of genIds){const it=ITEMS[id];speed+=it.speed||0;shield+=it.shield||0;absorption=Math.max(absorption,it.absorption||0);}
  if(ship.bonusLowMaps&&low){hp+=ship.bonusLowMaps.hp;speed+=ship.bonusLowMaps.speed;shield*=ship.bonusLowMaps.shieldMult;laserDamage*=ship.bonusLowMaps.laserMult;rocketMult=ship.bonusLowMaps.rocketMult;}
  player.maxHp=Math.round(hp);player.maxShield=Math.round(shield);player.speed=Math.round(speed);player.laserDamage=Math.round(laserDamage);player.shieldAbsorption=absorption;player.rocketMult=rocketMult;
  player.hp=keepRatio?Math.min(player.maxHp,Math.max(1,Math.round(player.maxHp*oldHpRatio))):player.maxHp;
  player.shield=keepRatio?Math.min(player.maxShield,Math.max(0,Math.round(player.maxShield*oldShieldRatio))):player.maxShield;
  progress.hp=player.hp;progress.shield=player.shield;
}

function initializeFaction(factionId){
  progress=freshSave(factionId);state.currentMap=MAPS.x1;player.hp=SHIPS.phoenix.hp;player.shield=1000;computeStats(false);setMap('x1',false);ui.factionModal.classList.add('hidden');buildAmmoButtons();renderAll();saveGame();flushCloudSave(true);showToast(`Bem-vindo à ${FACTIONS[factionId].name}`);
}

function renderFactionChoice(){
  ui.factionCards.innerHTML='';
  Object.values(FACTIONS).forEach(f=>{
    const el=document.createElement('div');el.className='faction-card';el.style.color=f.color;
    el.innerHTML=`<div><div class="faction-orb"></div><h3>${f.name}</h3><p>${f.description}</p><p class="muted">Base inicial: mapa ${f.prefix}-1</p></div>`;
    const b=document.createElement('button');b.className='small-btn';b.textContent=`Escolher ${f.short}`;b.onclick=()=>initializeFaction(f.id);el.appendChild(b);ui.factionCards.appendChild(el);
  });
  ui.factionModal.classList.remove('hidden');
}

function screenPos(x,y){return{x:x-state.camera.x+W/2,y:y-state.camera.y+H/2};}
function spawnParticle(x,y,text,color){state.particles.push({x,y,text,color,life:1,vy:rand(20,32)});}

function randomMapPosition(padding=180){
  let x,y,tries=0;
  do{x=rand(padding,state.currentMap.world.w-padding);y=rand(padding,state.currentMap.world.h-padding);tries++;}
  while(progress?.mapId==='x1'&&safeZoneDistance(x,y)<SAFE_ZONE.radius+120&&tries<80);
  return {x,y};
}
function spawnOre(type=null){
  const names=state.currentMap.ores;const oreType=type||names[Math.floor(Math.random()*names.length)];const pos=randomMapPosition(100);const res=RESOURCES[oreType]||{color:'#fff'};
  state.ores.push({id:`ore_${Math.random().toString(16).slice(2)}`,x:pos.x,y:pos.y,type:oreType,amount:1,color:res.color,r:rand(7,13),rot:rand(0,TWO_PI),shape:Array.from({length:7},()=>rand(.72,1.18))});
}
function createOres(){state.ores=[];state.oreRespawns=[];for(let i=0;i<18;i++)spawnOre();}
function makeEnemy(type){
  const base=NPC_TYPES[type],pos=randomMapPosition(160);
  const battle=state.currentMap?.battle;return {id:`${type}_${Math.random().toString(16).slice(2,9)}`,type,name:base.name,x:pos.x,y:pos.y,hp:base.hp,maxHp:base.hp,shield:base.shield,maxShield:base.shield,credits:base.credits,uridium:base.uridium,speed:base.speed,damage:base.damage,color:base.color,size:base.size,resources:{...(base.resources||{})},attackRange:Math.min(battle?460:390,(battle?190:150)+base.size*5.8),aggroRange:battle?760:560,lastShot:0,angle:rand(0,TWO_PI),drift:rand(.4,1.4)};
}
function spawnEnemies(){state.enemies=[];state.enemyRespawns=[];for(const group of state.currentMap.enemyGroups)for(let i=0;i<group.count;i++)state.enemies.push(makeEnemy(group.type));}
function scheduleEnemyRespawn(type){state.enemyRespawns.push({type,at:nowSec()+rand(6,13)});}
function processRespawns(){
  const now=nowSec();state.enemies=state.enemies.filter(e=>e.hp>0||!e.deadAt||now-e.deadAt<1.2);
  for(let i=state.enemyRespawns.length-1;i>=0;i--)if(now>=state.enemyRespawns[i].at){state.enemies.push(makeEnemy(state.enemyRespawns[i].type));state.enemyRespawns.splice(i,1);}
  for(let i=state.oreRespawns.length-1;i>=0;i--)if(now>=state.oreRespawns[i].at){spawnOre(state.oreRespawns[i].type);state.oreRespawns.splice(i,1);}
}
function factionBattleMap(){const id=progress?.profile?.faction;return id==='earth'?'b41':id==='mars'?'b42':'b43';}
function resolvePortalTarget(code){if(code==='battleHome')return factionBattleMap();if(code==='x4HomeEarth')return progress?.profile?.faction==='earth'?'x4':null;if(code==='x4HomeMars')return progress?.profile?.faction==='mars'?'x4':null;if(code==='x4HomeJupiter')return progress?.profile?.faction==='jupiter'?'x4':null;return MAPS[code]?code:null;}
function resolvedPortals(map=state.currentMap){return (map?.portals||[]).map(p=>({...p,to:resolvePortalTarget(p.to)})).filter(p=>p.to);}
function findReturnPortal(targetMapId,fromMapId){return resolvedPortals(MAPS[targetMapId]).find(p=>p.to===fromMapId)||null;}
function setMap(mapId,preserve=false,fromMapId=null){
  if(!MAPS[mapId])return;progress.mapId=mapId;state.currentMap=MAPS[mapId];computeStats(true);
  if(!preserve){const returnPortal=fromMapId?findReturnPortal(mapId,fromMapId):null;player.x=returnPortal?returnPortal.x:(mapId==='x1'?SAFE_ZONE.x:400);player.y=returnPortal?returnPortal.y:(mapId==='x1'?SAFE_ZONE.y:state.currentMap.world.h/2);player.tx=player.x;player.ty=player.y;}
  petRuntime.x=player.x+44;petRuntime.y=player.y+44;petRuntime.tx=petRuntime.x;petRuntime.ty=petRuntime.y;state.camera.x=player.x;state.camera.y=player.y;state.target=null;state.loot=[];createOres();spawnEnemies();saveGame();showToast(mapId==='x1'?`Base ${getFaction()?.short||''} • Zona Segura`:`Entrando em ${displayMapLabel(mapId)}`);renderMapModal();
}
function runMapTransition(targetMapId,fromMapId=null,mode='PORTAL QUÂNTICO'){if(state.jumping||!MAPS[targetMapId])return;state.jumping=true;player.laserFiring=false;ui.portalPrompt?.classList.add('hidden');ui.jumpTitle.textContent=`${displayMapLabel(progress.mapId)} → ${displayMapLabel(targetMapId)}`;ui.jumpSubtitle.textContent=mode;ui.jumpTransition.classList.remove('hidden');requestAnimationFrame(()=>ui.jumpTransition.classList.add('active'));setTimeout(()=>setMap(targetMapId,false,fromMapId),430);setTimeout(()=>{ui.jumpTransition.classList.remove('active');setTimeout(()=>ui.jumpTransition.classList.add('hidden'),240);state.jumping=false;},1050);}

function currentLaserAmmo(){return LASER_AMMO[progress.selectedLaserAmmo]||LASER_AMMO.lcb10;}
function currentRocket(){return ROCKETS[progress.selectedRocket]||ROCKETS.r310;}
function ammoQty(id){return progress.ammo[id]||0;}
function rocketQty(id){return progress.rockets[id]||0;}
function getRocketCooldown(){return turboRocketEnabled()?2.5:5;}
function rocketReady(){return nowSec()-player.lastRocketShot>=getRocketCooldown();}
function enemyDistance(e){return Math.hypot(e.x-player.x,e.y-player.y);}
function nearbyPortal(){return resolvedPortals().find(p=>Math.hypot(p.x-player.x,p.y-player.y)<58)||null;}
function portalAtWorld(x,y){return resolvedPortals().find(p=>Math.hypot(p.x-x,p.y-y)<50)||null;}
function jumpThroughPortal(portal){if(!portal||state.jumping||nowSec()-state.lastPortalAt<1.1)return;const fromMap=progress.mapId;state.lastPortalAt=nowSec();runMapTransition(portal.to,fromMap,'PORTAL QUÂNTICO');}

function rewardEnemyKill(enemy){
  progress.profile.credits+=enemy.credits;progress.profile.uridium+=enemy.uridium;progress.profile.xp+=Math.round(enemy.credits/10+enemy.uridium*12);
  addPetXp(Math.max(12,Math.round(enemy.credits/120+enemy.uridium*4)));
  while(progress.profile.xp>=progress.profile.level*2000){progress.profile.xp-=progress.profile.level*2000;progress.profile.level++;showToast(`Level ${progress.profile.level}!`);}
  state.loot.push({id:`box_${Math.random().toString(16).slice(2)}`,x:enemy.x,y:enemy.y,resources:{...(enemy.resources||{})},source:enemy.name});
  scheduleEnemyRespawn(enemy.type);saveGame();
}
function dealDamageToEnemy(enemy,damage,color){
  let remain=damage;if(enemy.shield>0){const a=Math.min(enemy.shield,remain);enemy.shield-=a;remain-=a;}if(remain>0)enemy.hp-=remain;
  spawnParticle(enemy.x,enemy.y-enemy.size,fmt(damage),color);
  if(enemy.hp<=0){enemy.hp=0;enemy.deadAt=nowSec();rewardEnemyKill(enemy);if(state.target?.id===enemy.id){state.target=null;player.laserFiring=false;}}
}
function fireLaserTick(){
  if(!state.target||state.target.hp<=0||enemyDistance(state.target)>playerLaserRange())return;
  const ammo=currentLaserAmmo();
  const laserIds=equippedLaserIds();
  const totalLasers=laserIds.length;
  if(totalLasers<=0){player.laserFiring=false;showToast('Equipe pelo menos um laser no Hangar');return;}
  const stock=ammoQty(ammo.id);
  if(stock<=0){if(autoBuyEnabled()&&buyAmmoPack(ammo.id,true)){refreshAmmoCounters();renderShop();showToast(`Auto Buy: ${ammo.name}`);}else{player.laserFiring=false;showToast(`${ammo.name} acabou`);return;}}
  if(nowSec()-player.lastLaserShot<.42)return;

  // Cada laser equipado consome 1 unidade de munição por rajada.
  // Se houver menos munição que lasers, somente parte da bateria dispara.
  const firingCount=Math.min(totalLasers,stock);
  const firingIds=laserIds.slice(0,firingCount);
  const allBase=laserIds.reduce((sum,id)=>sum+(ITEMS[id]?.damage||0),0);
  const firingBase=firingIds.reduce((sum,id)=>sum+(ITEMS[id]?.damage||0),0);
  const fraction=allBase>0?firingBase/allBase:0;

  player.lastLaserShot=nowSec();
  progress.ammo[ammo.id]=Math.max(0,stock-firingCount);refreshAmmoCounters();
  const damage=Math.round(player.laserDamage*fraction*ammo.mult*rand(.95,1.08));
  if(damage>0)dealDamageToEnemy(state.target,damage,ammo.color);

  if(progress.ammo[ammo.id]<=0){
    if(autoBuyEnabled()&&buyAmmoPack(ammo.id,true)){refreshAmmoCounters();renderShop();showToast(`Auto Buy: ${ammo.name}`);}
    else { player.laserFiring=false; showToast(`${ammo.name} acabou`); }
  }
}
function fireRocket(manual=false){
  if(!state.target||state.target.hp<=0){if(manual)showToast('Selecione um alvo');return;}
  if(enemyDistance(state.target)>playerRocketRange()){if(manual)showToast('Alvo fora do alcance');return;}
  const r=currentRocket();
  if(rocketQty(r.id)<=0){
    if(autoBuyEnabled()&&buyRocketPack(r.id,true)){refreshAmmoCounters();renderShop();if(manual)showToast(`Auto Buy: ${r.name}`);}
    else { if(manual)showToast(`${r.name} acabou`); return; }
  }
  if(!rocketReady()){if(manual)showToast(`Míssil recarregando`);return;}
  player.lastRocketShot=nowSec();progress.rockets[r.id]=Math.max(0,(progress.rockets[r.id]||0)-1);dealDamageToEnemy(state.target,Math.round(r.damage*player.rocketMult),r.color);saveGame();
}
function takePlayerDamage(dmg){
  if(isSafeZone())return;
  const absorb=Math.max(0,Math.min(100,player.shieldAbsorption))/100;let shieldPart=dmg*absorb;let hullPart=dmg-shieldPart;
  if(player.shield>0){const got=Math.min(player.shield,shieldPart);player.shield-=got;shieldPart-=got;hullPart+=shieldPart;}
  else hullPart+=shieldPart;
  player.hp-=hullPart;
}
function collectCargoBox(drop){const before=cargoFree();let total=0;for(const [id,qty] of Object.entries(drop.resources||{})){const got=addCargoResource(id,qty);if(got>0){drop.resources[id]-=got;if(drop.resources[id]<=0)delete drop.resources[id];total+=got;}}if(total>0){spawnParticle(drop.x,drop.y,`+${fmt(total)} recursos`,'#ffe57b');saveGame();}if(total===0&&before<=0)showToast('Porão cheio');return Object.keys(drop.resources||{}).length===0;}

function updatePlayer(dt){
  const dx=player.tx-player.x,dy=player.ty-player.y,d=Math.hypot(dx,dy);if(d>2){const step=Math.min(d,player.speed*dt);player.x+=dx/d*step;player.y+=dy/d*step;}
  player.x=Math.max(35,Math.min(state.currentMap.world.w-35,player.x));player.y=Math.max(35,Math.min(state.currentMap.world.h-35,player.y));state.camera.x+=(player.x-state.camera.x)*.08;state.camera.y+=(player.y-state.camera.y)*.08;
  const safe=isSafeZone();const inCombat=!safe&&state.enemies.some(e=>e.hp>0&&enemyDistance(e)<430);if(!inCombat){const regen=safe?.12:.045;player.shield=Math.min(player.maxShield,player.shield+player.maxShield*regen*dt);if(safe||hasExtra('rep2'))player.hp=Math.min(player.maxHp,player.hp+player.maxHp*(safe?.08:.025)*dt);}
  maybeAutoBuyAmmo();
  if(player.laserFiring)fireLaserTick();
  if(autoRocketEnabled()&&player.laserFiring&&rocketReady())fireRocket(false);
  for(let i=state.loot.length-1;i>=0;i--){const l=state.loot[i];if(Math.hypot(l.x-player.x,l.y-player.y)<40){const empty=collectCargoBox(l);if(empty)state.loot.splice(i,1);}}
  for(let i=state.ores.length-1;i>=0;i--){const o=state.ores[i];if(Math.hypot(o.x-player.x,o.y-player.y)<30){const got=addCargoResource(o.type,o.amount);if(got>0){spawnParticle(o.x,o.y,`+${got} ${o.type}`,o.color);state.ores.splice(i,1);state.oreRespawns.push({type:o.type,at:nowSec()+rand(5,12)});saveGame();}else showToast('Porão cheio');}}
  if(player.hp<=0){player.hp=player.maxHp;player.shield=Math.round(player.maxShield*.5);progress.profile.credits=Math.max(0,Math.round(progress.profile.credits*.95));progress.mapId='x1';state.currentMap=MAPS.x1;player.x=SAFE_ZONE.x;player.y=SAFE_ZONE.y;player.tx=player.x;player.ty=player.y;state.target=null;player.laserFiring=false;createOres();spawnEnemies();showToast('Nave destruída. Retorno automático à Zona Segura.');saveGame();}
  progress.hp=player.hp;progress.shield=player.shield;progress.x=player.x;progress.y=player.y;
}
function updateEnemies(dt){
  const playerSafe=isSafeZone();
  for(const e of state.enemies){
    if(e.hp<=0)continue;
    const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy);e.angle+=dt*e.drift;
    if(progress.mapId==='x1'&&safeZoneDistance(e.x,e.y)<SAFE_ZONE.radius+35){
      const ox=e.x-SAFE_ZONE.x,oy=e.y-SAFE_ZONE.y,od=Math.hypot(ox,oy)||1;e.x=SAFE_ZONE.x+ox/od*(SAFE_ZONE.radius+38);e.y=SAFE_ZONE.y+oy/od*(SAFE_ZONE.radius+38);
    }
    if(!playerSafe&&d<e.aggroRange&&d>e.attackRange*.8){
      const nx=e.x+dx/d*e.speed*dt,ny=e.y+dy/d*e.speed*dt;
      if(!(progress.mapId==='x1'&&safeZoneDistance(nx,ny)<SAFE_ZONE.radius+25)){e.x=nx;e.y=ny;}
    }else if(d>e.aggroRange||playerSafe){e.x+=Math.cos(e.angle)*e.speed*.16*dt;e.y+=Math.sin(e.angle)*e.speed*.16*dt;}
    e.x=Math.max(25,Math.min(state.currentMap.world.w-25,e.x));e.y=Math.max(25,Math.min(state.currentMap.world.h-25,e.y));
    if(!playerSafe&&d<e.attackRange&&nowSec()-e.lastShot>(e.name.includes('Boss')?1.6:1.15)){e.lastShot=nowSec();e.lastAttackPlayerAt=nowSec();takePlayerDamage(e.damage*rand(.92,1.12));spawnParticle(player.x,player.y-28,Math.round(e.damage),'#ff8080');}
  }
}
function updateParticles(dt){for(let i=state.particles.length-1;i>=0;i--){const p=state.particles[i];p.y-=p.vy*dt;p.life-=dt;if(p.life<=0)state.particles.splice(i,1);}}
function update(dt){if(!progress)return;processRespawns();updatePlayer(dt);updateEnemies(dt);updatePet(dt);updateParticles(dt);updateUI();}

function drawStars(){ctx.fillStyle='#fff';for(const s of state.stars){const sx=((s.x-state.camera.x*.15)%(W+80)+(W+80))%(W+80)-40,sy=((s.y-state.camera.y*.15)%(H+80)+(H+80))%(H+80)-40;ctx.globalAlpha=s.a;ctx.beginPath();ctx.arc(sx,sy,s.r,0,TWO_PI);ctx.fill();}ctx.globalAlpha=1;}
function drawNebula(){const pal=state.currentMap.palette||{nebula:'#173159',accent:'#66d9ff',deep:'#030816'};const g=ctx.createRadialGradient(W*.62,H*.36,20,W*.62,H*.36,Math.max(W,H)*.72);g.addColorStop(0,`${pal.nebula}55`);g.addColorStop(.38,`${pal.nebula}22`);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);const g2=ctx.createRadialGradient(W*.18,H*.78,10,W*.18,H*.78,Math.max(W,H)*.42);g2.addColorStop(0,`${pal.accent}1f`);g2.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g2;ctx.fillRect(0,0,W,H);}
function drawBounds(){const p=screenPos(0,0);ctx.strokeStyle='rgba(60,140,255,.13)';ctx.lineWidth=2;ctx.strokeRect(p.x,p.y,state.currentMap.world.w,state.currentMap.world.h);}
function drawBaseSafeZone(){
  if(progress.mapId!=='x1')return;
  const p=screenPos(SAFE_ZONE.x,SAFE_ZONE.y),f=getFaction(),pulse=1+Math.sin(nowSec()*2.4)*.02;
  ctx.save();ctx.translate(p.x,p.y);ctx.strokeStyle=f?.color||'#5ce8ff';ctx.fillStyle='rgba(40,220,170,.045)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,SAFE_ZONE.radius*pulse,0,TWO_PI);ctx.fill();ctx.stroke();
  ctx.strokeStyle='rgba(130,255,210,.22)';ctx.lineWidth=10;ctx.beginPath();ctx.arc(0,0,SAFE_ZONE.radius-10,0,TWO_PI);ctx.stroke();
  ctx.rotate(nowSec()*.25);ctx.strokeStyle=f?.color||'#fff';ctx.lineWidth=4;for(let i=0;i<3;i++){ctx.rotate(TWO_PI/3);ctx.beginPath();ctx.moveTo(22,0);ctx.lineTo(72,0);ctx.stroke();}
  ctx.rotate(-nowSec()*.25);const core=ctx.createRadialGradient(-6,-6,2,0,0,28);core.addColorStop(0,'#fff');core.addColorStop(.35,f?.color||'#5ce8ff');core.addColorStop(1,'#0a1c2b');ctx.fillStyle=core;ctx.beginPath();ctx.arc(0,0,24,0,TWO_PI);ctx.fill();
  ctx.fillStyle='#caffdf';ctx.font='bold 13px Arial';ctx.textAlign='center';ctx.fillText(`${f?.short||''} • ZONA SEGURA`,0,-SAFE_ZONE.radius-18);ctx.restore();
}
function drawPortals(){for(const portal of resolvedPortals()){const p=screenPos(portal.x,portal.y),t=nowSec();ctx.save();ctx.translate(p.x,p.y);ctx.shadowColor='#43d8ff';ctx.shadowBlur=18;ctx.strokeStyle='rgba(83,221,255,.88)';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,36,56,0,0,TWO_PI);ctx.stroke();ctx.shadowBlur=0;ctx.rotate(t*.7);ctx.strokeStyle='rgba(174,102,255,.62)';ctx.lineWidth=5;for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(0,0,27,-.55+i*Math.PI/2,.55+i*Math.PI/2);ctx.stroke();}ctx.rotate(-t*1.4);ctx.strokeStyle='rgba(92,231,255,.42)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,19,0,Math.PI*1.35);ctx.stroke();ctx.rotate(t*.7);const cg=ctx.createRadialGradient(0,0,2,0,0,24);cg.addColorStop(0,'rgba(240,255,255,.72)');cg.addColorStop(.35,'rgba(72,211,255,.32)');cg.addColorStop(1,'rgba(51,91,255,.02)');ctx.fillStyle=cg;ctx.beginPath();ctx.ellipse(0,0,22,38,0,0,TWO_PI);ctx.fill();ctx.fillStyle='#9aeaff';ctx.font='bold 11px Arial';ctx.textAlign='center';ctx.fillText(displayMapLabel(portal.to),0,-68);ctx.restore();}}
function drawOres(){for(const o of state.ores){const p=screenPos(o.x,o.y);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(o.rot||0);ctx.shadowColor=o.color;ctx.shadowBlur=10;const grad=ctx.createLinearGradient(-o.r,-o.r,o.r,o.r);grad.addColorStop(0,'rgba(255,255,255,.88)');grad.addColorStop(.24,o.color);grad.addColorStop(1,'rgba(8,20,32,.85)');ctx.fillStyle=grad;ctx.strokeStyle='rgba(240,252,255,.5)';ctx.lineWidth=1;ctx.beginPath();const n=o.shape?.length||7;for(let i=0;i<n;i++){const a=i*TWO_PI/n,r=(o.r||10)*(o.shape?.[i]||1),x=Math.cos(a)*r,y=Math.sin(a)*r;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='rgba(255,255,255,.5)';ctx.beginPath();ctx.arc(-o.r*.25,-o.r*.28,1.8,0,TWO_PI);ctx.fill();ctx.restore();}}
function drawLoot(){for(const l of state.loot){const p=screenPos(l.x,l.y),pulse=.85+Math.sin(nowSec()*4+l.x)*.15;ctx.save();ctx.translate(p.x,p.y);ctx.shadowColor='#ffb33f';ctx.shadowBlur=15*pulse;ctx.fillStyle='rgba(255,179,63,.18)';ctx.beginPath();ctx.arc(0,0,19,0,TWO_PI);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#2b3443';ctx.strokeStyle='#f5b84c';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(-13,-10,26,20,4);ctx.fill();ctx.stroke();ctx.strokeStyle='#6f7886';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-13,0);ctx.lineTo(13,0);ctx.moveTo(0,-10);ctx.lineTo(0,10);ctx.stroke();ctx.fillStyle='#ffd77a';ctx.fillRect(-3,-2,6,4);ctx.restore();}}
function drawNpcModel(e){const boss=e.type.startsWith('boss');const type=e.type.toLowerCase();ctx.save();if(boss){ctx.strokeStyle='rgba(255,76,104,.55)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,e.size+7+Math.sin(nowSec()*4)*2,0,TWO_PI);ctx.stroke();}ctx.shadowColor=e.color;ctx.shadowBlur=boss?15:8;const s=e.size;ctx.fillStyle=e.color;ctx.strokeStyle='rgba(255,255,255,.38)';ctx.lineWidth=1;
  if(type.includes('streuner')){ctx.beginPath();ctx.moveTo(s,0);ctx.lineTo(-s*.2,-s*.55);ctx.lineTo(-s*.7,-s*.28);ctx.lineTo(-s*.35,0);ctx.lineTo(-s*.7,s*.28);ctx.lineTo(-s*.2,s*.55);ctx.closePath();ctx.fill();ctx.stroke();}
  else if(type.includes('lordakia')){ctx.beginPath();for(let i=0;i<6;i++){const a=i*TWO_PI/6,r=i%2?s*.55:s;const x=Math.cos(a)*r,y=Math.sin(a)*r;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#190b2a';ctx.beginPath();ctx.arc(0,0,s*.32,0,TWO_PI);ctx.fill();}
  else if(type.includes('saimon')){ctx.beginPath();ctx.moveTo(s,0);ctx.lineTo(s*.15,-s*.55);ctx.lineTo(-s*.75,-s*.72);ctx.lineTo(-s*.38,0);ctx.lineTo(-s*.75,s*.72);ctx.lineTo(s*.15,s*.55);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#071b2a';ctx.fillRect(-s*.2,-s*.18,s*.45,s*.36);}
  else if(type.includes('mordon')){ctx.beginPath();ctx.moveTo(s,0);ctx.lineTo(s*.25,-s*.72);ctx.lineTo(-s*.58,-s*.45);ctx.lineTo(-s*.9,0);ctx.lineTo(-s*.58,s*.45);ctx.lineTo(s*.25,s*.72);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#351409';ctx.beginPath();ctx.arc(-s*.08,0,s*.28,0,TWO_PI);ctx.fill();}
  else if(type.includes('devolarium')){ctx.beginPath();ctx.ellipse(0,0,s,s*.62,0,0,TWO_PI);ctx.fill();ctx.stroke();ctx.fillStyle='rgba(4,24,38,.9)';ctx.beginPath();ctx.ellipse(s*.12,0,s*.45,s*.26,0,0,TWO_PI);ctx.fill();ctx.strokeStyle=e.color;ctx.beginPath();ctx.moveTo(-s*.85,-s*.38);ctx.lineTo(-s*1.18,-s*.7);ctx.moveTo(-s*.85,s*.38);ctx.lineTo(-s*1.18,s*.7);ctx.stroke();}
  else {ctx.beginPath();for(let i=0;i<8;i++){const a=i*TWO_PI/8,r=i%2?s*.68:s;const x=Math.cos(a)*r,y=Math.sin(a)*r;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='rgba(8,35,28,.88)';ctx.beginPath();ctx.arc(0,0,s*.34,0,TWO_PI);ctx.fill();}
ctx.shadowBlur=0;ctx.restore();}
function drawEnemy(e){const p=screenPos(e.x,e.y);ctx.save();ctx.translate(p.x,p.y);if(state.target?.id===e.id){ctx.strokeStyle='rgba(236,84,111,.95)';ctx.lineWidth=2;ctx.setLineDash([5,4]);ctx.beginPath();ctx.arc(0,0,e.size+10+Math.sin(nowSec()*5)*1.2,0,TWO_PI);ctx.stroke();ctx.setLineDash([]);}drawNpcModel(e);ctx.restore();const hp=e.hp/e.maxHp,sh=e.maxShield?e.shield/e.maxShield:0;ctx.fillStyle='rgba(48,8,16,.82)';ctx.fillRect(p.x-e.size,p.y-e.size-18,e.size*2,4);ctx.fillStyle='#ec536b';ctx.fillRect(p.x-e.size,p.y-e.size-18,e.size*2*hp,4);ctx.fillStyle='rgba(8,26,44,.82)';ctx.fillRect(p.x-e.size,p.y-e.size-12,e.size*2,4);ctx.fillStyle='#4bcfff';ctx.fillRect(p.x-e.size,p.y-e.size-12,e.size*2*sh,4);ctx.fillStyle='#ff9c91';ctx.font='bold 12px Arial';ctx.textAlign='center';ctx.fillText(e.name,p.x,p.y+e.size+17);}
function drawDrones(p){const f=getFaction();progress.drones.forEach((d,i)=>{const a=nowSec()*.8+i*TWO_PI/Math.max(1,progress.drones.length),r=36+(i%2)*9,x=p.x+Math.cos(a)*r,y=p.y+Math.sin(a)*r;ctx.save();ctx.translate(x,y);ctx.rotate(a+Math.PI/2);ctx.shadowColor=d.type==='iris'?'#c77cff':'#71dfff';ctx.shadowBlur=8;ctx.fillStyle=d.type==='iris'?'#bd7cff':'#71dfff';ctx.beginPath();ctx.moveTo(0,-5);ctx.lineTo(5,4);ctx.lineTo(0,2);ctx.lineTo(-5,4);ctx.closePath();ctx.fill();ctx.strokeStyle=f?.color||'#fff';ctx.stroke();ctx.restore();});}
function drawPet(){
  if(!progress?.pet)return;
  const p=screenPos(petRuntime.x,petRuntime.y),mode=progress.pet.activeGear||'off';
  const color=mode==='guard'?'#ff8c93':mode==='box'?'#ffd46b':mode==='ore'?'#7fffc4':'#7edcff';
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(nowSec()*1.2);ctx.shadowColor=color;ctx.shadowBlur=14;ctx.strokeStyle=color;ctx.fillStyle='rgba(8,25,38,.92)';ctx.lineWidth=2;
  ctx.beginPath();for(let i=0;i<6;i++){const a=i*TWO_PI/6,r=i%2?8:12;const x=Math.cos(a)*r,y=Math.sin(a)*r;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle=color;ctx.beginPath();ctx.arc(0,0,3.5,0,TWO_PI);ctx.fill();ctx.restore();
  ctx.fillStyle=color;ctx.font='bold 10px Arial';ctx.textAlign='center';ctx.fillText(`P.E.T. LV ${progress.pet.level}`,p.x,p.y+23);
  if(petRuntime.laserTargetId&&nowSec()<petRuntime.laserUntil){
    const e=state.enemies.find(x=>x.id===petRuntime.laserTargetId&&x.hp>0);if(e){const t=screenPos(e.x,e.y);ctx.strokeStyle=currentLaserAmmo().color;ctx.shadowColor=currentLaserAmmo().color;ctx.shadowBlur=8;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(t.x,t.y);ctx.stroke();ctx.shadowBlur=0;}
  }
}
function drawShipModel(id,color){const s=1;ctx.shadowColor=color;ctx.shadowBlur=14;ctx.strokeStyle='rgba(230,250,255,.58)';ctx.lineWidth=1.1;const fill=ctx.createLinearGradient(-24,-14,25,14);fill.addColorStop(0,'#d9fbff');fill.addColorStop(.25,color);fill.addColorStop(1,'#1a2340');ctx.fillStyle=fill;ctx.beginPath();
  if(id==='phoenix'){ctx.moveTo(25,0);ctx.lineTo(-12,-12);ctx.lineTo(-5,0);ctx.lineTo(-12,12);}
  else if(id==='liberator'){ctx.moveTo(27,0);ctx.lineTo(4,-6);ctx.lineTo(-14,-14);ctx.lineTo(-10,-4);ctx.lineTo(-20,0);ctx.lineTo(-10,4);ctx.lineTo(-14,14);ctx.lineTo(4,6);}
  else if(id==='piranha'||id==='vengeance'){ctx.moveTo(30,0);ctx.lineTo(2,-5);ctx.lineTo(-17,-16);ctx.lineTo(-10,-3);ctx.lineTo(-25,0);ctx.lineTo(-10,3);ctx.lineTo(-17,16);ctx.lineTo(2,5);}
  else if(id==='leonov'){ctx.moveTo(24,0);ctx.lineTo(7,-12);ctx.lineTo(-12,-9);ctx.lineTo(-18,0);ctx.lineTo(-12,9);ctx.lineTo(7,12);}
  else if(id==='nostromo'){ctx.moveTo(26,0);ctx.lineTo(7,-10);ctx.lineTo(-18,-12);ctx.lineTo(-24,-5);ctx.lineTo(-24,5);ctx.lineTo(-18,12);ctx.lineTo(7,10);}
  else if(id==='bigboy'||id==='citadel'){ctx.moveTo(25,0);ctx.lineTo(10,-14);ctx.lineTo(-17,-16);ctx.lineTo(-27,-7);ctx.lineTo(-27,7);ctx.lineTo(-17,16);ctx.lineTo(10,14);}
  else if(id==='spearhead'){ctx.moveTo(33,0);ctx.lineTo(2,-5);ctx.lineTo(-21,-10);ctx.lineTo(-12,0);ctx.lineTo(-21,10);ctx.lineTo(2,5);}
  else if(id==='aegis'){ctx.moveTo(25,0);ctx.lineTo(8,-9);ctx.lineTo(-8,-8);ctx.lineTo(-18,-17);ctx.lineTo(-17,-5);ctx.lineTo(-25,0);ctx.lineTo(-17,5);ctx.lineTo(-18,17);ctx.lineTo(-8,8);ctx.lineTo(8,9);}
  else {ctx.moveTo(29,0);ctx.lineTo(9,-9);ctx.lineTo(-10,-15);ctx.lineTo(-18,-7);ctx.lineTo(-25,0);ctx.lineTo(-18,7);ctx.lineTo(-10,15);ctx.lineTo(9,9);}
ctx.closePath();ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='rgba(5,13,25,.88)';ctx.beginPath();ctx.ellipse(5,0,7,3.5,0,0,TWO_PI);ctx.fill();ctx.fillStyle='#f4ffff';ctx.beginPath();ctx.arc(7,0,1.6,0,TWO_PI);ctx.fill();ctx.fillStyle='#875bff';ctx.fillRect(-25,-2,8,4);}
function drawPlayer(){const p=screenPos(player.x,player.y),f=getFaction(),a=Math.atan2(player.ty-player.y,player.tx-player.x||0),color=f?.color||'#76e0ff';ctx.save();ctx.translate(p.x,p.y);ctx.rotate(a||0);drawShipModel(progress.activeShipId,color);ctx.restore();drawDrones(p);ctx.fillStyle=color;ctx.font='bold 12px Arial';ctx.textAlign='center';ctx.shadowColor='rgba(0,0,0,.85)';ctx.shadowBlur=4;ctx.fillText(progress.profile.callsign||getUser()?.callsign||'Pilot',p.x,p.y+33);ctx.shadowBlur=0;if(player.laserFiring&&state.target&&state.target.hp>0&&enemyDistance(state.target)<=playerLaserRange()){const t=screenPos(state.target.x,state.target.y);ctx.strokeStyle=currentLaserAmmo().color;ctx.shadowColor=currentLaserAmmo().color;ctx.shadowBlur=8;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(t.x,t.y);ctx.stroke();ctx.shadowBlur=0;}}
function drawParticles(){ctx.font='12px Arial';ctx.textAlign='center';for(const p of state.particles){const q=screenPos(p.x,p.y);ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.fillText(p.text,q.x,q.y);}ctx.globalAlpha=1;}
function drawMinimap(){
  mm.clearRect(0,0,minimap.width,minimap.height);mm.fillStyle='#07111c';mm.fillRect(0,0,minimap.width,minimap.height);mm.strokeStyle='rgba(75,180,255,.5)';mm.strokeRect(1,1,minimap.width-2,minimap.height-2);
  const sx=minimap.width/state.currentMap.world.w,sy=minimap.height/state.currentMap.world.h;
  if(progress.mapId==='x1'){mm.strokeStyle='rgba(100,255,190,.65)';mm.lineWidth=2;mm.beginPath();mm.arc(SAFE_ZONE.x*sx,SAFE_ZONE.y*sy,SAFE_ZONE.radius*Math.min(sx,sy),0,TWO_PI);mm.stroke();}
  for(const p of resolvedPortals()){mm.fillStyle='#56dbff';mm.beginPath();mm.arc(p.x*sx,p.y*sy,4,0,TWO_PI);mm.fill();}
  const px=player.x*sx,py=player.y*sy,rad=state.radarRange*Math.min(sx,sy);mm.strokeStyle='rgba(130,220,255,.22)';mm.lineWidth=1;mm.beginPath();mm.arc(px,py,rad,0,TWO_PI);mm.stroke();
  for(const e of state.enemies){if(e.hp<=0||Math.hypot(e.x-player.x,e.y-player.y)>state.radarRange)continue;mm.fillStyle=state.target?.id===e.id?'#ff345e':'#ff755d';mm.fillRect(e.x*sx-1.5,e.y*sy-1.5,3,3);}
  for(const o of state.ores){if(Math.hypot(o.x-player.x,o.y-player.y)>state.radarRange*.75)continue;mm.fillStyle=o.color;mm.fillRect(o.x*sx-1,o.y*sy-1,2,2);}
  mm.fillStyle=getFaction()?.color||'#fff';mm.beginPath();mm.arc(px,py,4,0,TWO_PI);mm.fill();
  if(Math.hypot(player.tx-player.x,player.ty-player.y)>30){mm.strokeStyle='#fff';mm.beginPath();mm.arc(player.tx*sx,player.ty*sy,4,0,TWO_PI);mm.stroke();}
}
function draw(){ctx.clearRect(0,0,W,H);drawNebula();drawStars();if(!progress)return;drawBounds();drawBaseSafeZone();drawPortals();drawOres();drawLoot();state.enemies.forEach(e=>e.hp>0&&drawEnemy(e));drawPlayer();drawPet();drawParticles();drawMinimap();}

function ammoWarningClass(qty,perUse){
  if(qty<=0)return 'empty';
  const uses=perUse>0?Math.floor(qty/perUse):qty;
  if(uses<=3)return 'critical';
  if(uses<=10)return 'low';
  return '';
}
function refreshAmmoCounters(){
  if(!progress)return;
  const laserUse=Math.max(1,equippedLaserCount());
  ui.laserAmmoButtons.querySelectorAll('[data-ammo-id]').forEach(btn=>{
    const id=btn.dataset.ammoId,a=LASER_AMMO[id],q=ammoQty(id),bursts=Math.floor(q/laserUse);
    btn.classList.toggle('active',progress.selectedLaserAmmo===id);
    btn.classList.remove('empty','low','critical');
    const warn=ammoWarningClass(q,laserUse);if(warn)btn.classList.add(warn);
    const qty=btn.querySelector('.ammo-qty');
    const petUse=(progress.pet?.activeGear==='guard'&&progress.pet?.gearsOwned?.guard)?petLaserIds().length:0;
    if(qty)qty.textContent=fmt(q);
    btn.dataset.tip=ammoTooltipText(a,q,laserUse,petUse,bursts);
    btn.title=ammoTooltipText(a,q,laserUse,petUse,bursts).replace(/\n/g,' | ');
  });
  ui.rocketAmmoButtons.querySelectorAll('[data-rocket-id]').forEach(btn=>{
    const id=btn.dataset.rocketId,r=ROCKETS[id],q=rocketQty(id);
    btn.classList.toggle('active',progress.selectedRocket===id);
    btn.classList.remove('empty','low','critical');
    const warn=ammoWarningClass(q,1);if(warn)btn.classList.add(warn);
    const qty=btn.querySelector('.ammo-qty');
    if(qty)qty.textContent=fmt(q);
    btn.dataset.tip=rocketTooltipText(r,q);
    btn.title=rocketTooltipText(r,q).replace(/\n/g,' | ');
  });
}
function buildAmmoButtons(){
  if(!progress)return;
  ui.laserAmmoButtons.innerHTML='';
  Object.values(LASER_AMMO).forEach(a=>{
    const b=document.createElement('button');
    b.type='button';
    b.dataset.ammoId=a.id;
    b.className='ammo-btn circular';
    b.style.borderColor=a.color;
    b.innerHTML=`<span class="ammo-code">${shortLaserLabel(a.id)}</span><span class="ammo-qty"></span>`;
    b.onclick=()=>{progress.selectedLaserAmmo=a.id;refreshAmmoCounters();saveGame();};
    ui.laserAmmoButtons.appendChild(b);
  });
  ui.rocketAmmoButtons.innerHTML='';
  Object.values(ROCKETS).forEach(r=>{
    const b=document.createElement('button');
    b.type='button';
    b.dataset.rocketId=r.id;
    b.className='ammo-btn circular';
    b.style.borderColor=r.color;
    b.innerHTML=`<span class="ammo-code">${shortRocketLabel(r.id)}</span><span class="ammo-qty"></span>`;
    b.onclick=()=>{progress.selectedRocket=r.id;refreshAmmoCounters();saveGame();};
    ui.rocketAmmoButtons.appendChild(b);
  });
  refreshAmmoCounters();
}

function updateExtraControls(){ return; }
function updateUI(){
  refreshAmmoCounters();
  const f=getFaction(),ship=SHIPS[progress.activeShipId],safe=isSafeZone();ui.factionLabel.textContent=f?.short||'—';ui.factionLabel.style.color=f?.color||'';ui.mapLabel.textContent=displayMapLabel(progress.mapId);ui.shipLabel.textContent=ship.name;ui.lvl.textContent=progress.profile.level;ui.hp.textContent=fmt(player.hp);ui.maxHp.textContent=fmt(player.maxHp);ui.shield.textContent=fmt(player.shield);ui.maxShield.textContent=fmt(player.maxShield);ui.speed.textContent=fmt(player.speed);if(ui.dmg)ui.dmg.textContent=fmt(player.laserDamage*currentLaserAmmo().mult);ui.credits.textContent=fmt(progress.profile.credits);ui.uridium.textContent=fmt(progress.profile.uridium);ui.xp.textContent=fmt(progress.profile.xp);if(ui.droneCount)ui.droneCount.textContent=progress.drones.length;ui.laserToggle.classList.toggle('active',player.laserFiring);ui.rocketCd.textContent=rocketReady()?'MÍSSIL PRONTO':`MÍSSIL ${(getRocketCooldown()-(nowSec()-player.lastRocketShot)).toFixed(1)}s`;
  ui.userLabel.textContent=progress.profile.callsign||getUser()?.callsign||'Pilot';if(ui.petBtn)ui.petBtn.textContent=`P.E.T. LV${progress.pet?.level||1}`;ui.safeZoneLabel.textContent=safe?'ZONA SEGURA ATIVA':'FORA DA BASE';ui.safeZoneLabel.classList.toggle('active',safe);ui.cargoUsed.textContent=fmt(cargoUsed());ui.cargoMax.textContent=fmt(cargoCapacity());ui.cargoBtn.classList.toggle('gold',isAtTrader());
  if(state.target&&state.target.hp>0){ui.targetName.textContent=state.target.name;ui.targetStats.textContent=`HP ${fmt(state.target.hp)} • ESC ${fmt(state.target.shield)}`;ui.targetHpBar.style.width=`${state.target.hp/state.target.maxHp*100}%`;ui.targetShieldBar.style.width=`${state.target.maxShield?state.target.shield/state.target.maxShield*100:0}%`;}else{ui.targetName.textContent='Sem alvo';ui.targetStats.textContent='Toque em um NPC para selecionar';ui.targetHpBar.style.width='0%';ui.targetShieldBar.style.width='0%';}
  ui.shopCredits.textContent=fmt(progress.profile.credits);ui.shopUridium.textContent=fmt(progress.profile.uridium);ui.hangarShipName.textContent=ship.name;updateExtraControls();
  const portal=nearbyPortal();if(portal&&!state.jumping&&ui.portalPrompt){const pos=screenPos(portal.x,portal.y);ui.portalPrompt.style.left=`${Math.max(85,Math.min(W-85,pos.x))}px`;ui.portalPrompt.style.top=`${Math.max(115,Math.min(H-90,pos.y-58))}px`;ui.portalPromptMap.textContent=`Destino ${displayMapLabel(portal.to)} • clique ou J`;ui.portalPrompt.classList.remove('hidden');}else ui.portalPrompt?.classList.add('hidden');
}

function canAfford(price,currency){return currency==='credits'?progress.profile.credits>=price:progress.profile.uridium>=price;}
function charge(price,currency){if(!canAfford(price,currency))return false;if(currency==='credits')progress.profile.credits-=price;else progress.profile.uridium-=price;return true;}
function priceText(p,c){return `${fmt(p)} ${c==='credits'?'CR':'URI'}`;}
function productIcon(type,subtype){return type==='ship'?'🛸':type==='laser'?'⚡':type==='generator'?(subtype==='speed'?'💨':'🛡️'):type==='drone'?'◆':type==='extra'?'🧩':type==='ammo'?'✦':'🚀';}

function buyShip(shipId){const ship=SHIPS[shipId];if(progress.ownedShips.includes(shipId)){showToast('Nave já obtida');return;}if(!charge(ship.price,ship.currency)){showToast('Saldo insuficiente');return;}progress.ownedShips.push(shipId);saveGame();renderShop();showToast(`${ship.name} adicionada ao Hangar`);}
function buyItem(itemId){const item=ITEMS[itemId];if(item.type==='drone'){buyDrone(itemId);return;}if(!charge(item.price,item.currency)){showToast('Saldo insuficiente');return;}addInventory(itemId);saveGame();renderShop();if(!ui.hangarModal.classList.contains('hidden'))renderHangar();showToast(`${item.name} comprado`);}
function buyDrone(type){if(progress.drones.length>=8){showToast('Limite de 8 drones atingido');return;}const item=ITEMS[type];if(!charge(item.price,item.currency)){showToast('Saldo insuficiente');return;}progress.drones.push({id:`d_${Date.now()}_${Math.random().toString(16).slice(2,5)}`,type,slots:Array(item.slots).fill(null)});computeStats(true);saveGame();renderShop();showToast(`${item.name} adquirido (${progress.drones.length}/8)`);}
function buyAmmo(id){if(!buyAmmoPack(id,false)){showToast('Saldo insuficiente');return;}buildAmmoButtons();renderShop();}
function buyRockets(id){if(!buyRocketPack(id,false)){showToast('Saldo insuficiente');return;}buildAmmoButtons();renderShop();}

function renderTabs(container,map,active,onPick){container.innerHTML='';for(const [id,label] of Object.entries(map)){const b=document.createElement('button');b.className=`tab-btn ${active===id?'active':''}`;b.textContent=label;b.onclick=()=>onPick(id);container.appendChild(b);}}
function makeProductCard({name,desc,price,currency,type,subtype,badge,owned,onBuy,disabled=false}){const card=document.createElement('div');card.className='product-card';card.innerHTML=`<div class="product-icon">${productIcon(type,subtype)}</div><div>${badge?`<span class="badge ${badge==='ELITE'?'elite':''}">${badge}</span>`:''}<h3>${name}</h3></div><div class="product-desc">${desc}</div><div class="price ${currency}">${owned?'OBTIDO':priceText(price,currency)}</div>`;const b=document.createElement('button');b.className='buy-btn';b.textContent=owned?'Obtido':'Comprar';b.disabled=owned||disabled;b.onclick=onBuy;card.appendChild(b);return card;}
function renderShop(){
  if(!progress)return;renderTabs(ui.shopTabs,categories,state.shopTab,id=>{state.shopTab=id;renderShop();});ui.shopGrid.innerHTML='';
  if(state.shopTab==='ships')Object.values(SHIPS).forEach(s=>ui.shopGrid.appendChild(makeProductCard({name:s.name,desc:`${s.role}<br>HP ${fmt(s.hp)} • ${s.lasers} lasers • ${s.generators} geradores • ${s.extras} extras • VEL ${s.speed}`,price:s.price,currency:s.currency,type:'ship',owned:progress.ownedShips.includes(s.id),onBuy:()=>buyShip(s.id)})));
  if(state.shopTab==='lasers')Object.values(ITEMS).filter(i=>i.type==='laser').forEach(i=>ui.shopGrid.appendChild(makeProductCard({name:i.name,desc:`Dano base: <b>${i.damage}</b><br>${i.description}`,price:i.price,currency:i.currency,type:i.type,onBuy:()=>buyItem(i.id)})));
  if(state.shopTab==='generators')Object.values(ITEMS).filter(i=>i.type==='generator').forEach(i=>ui.shopGrid.appendChild(makeProductCard({name:i.name,desc:i.description,price:i.price,currency:i.currency,type:i.type,subtype:i.subtype,onBuy:()=>buyItem(i.id)})));
  if(state.shopTab==='drones')Object.values(ITEMS).filter(i=>i.type==='drone').forEach(i=>ui.shopGrid.appendChild(makeProductCard({name:i.name,desc:`${i.description}<br>Você possui ${progress.drones.filter(d=>d.type===i.id).length}. Total: ${progress.drones.length}/8`,price:i.price,currency:i.currency,type:i.type,badge:i.id==='iris'?'ELITE':'COMUM',disabled:progress.drones.length>=8,onBuy:()=>buyDrone(i.id)})));
  if(state.shopTab==='extras')Object.values(ITEMS).filter(i=>i.type==='extra').forEach(i=>ui.shopGrid.appendChild(makeProductCard({name:i.name,desc:i.description,price:i.price,currency:i.currency,type:i.type,onBuy:()=>buyItem(i.id)})));
  if(state.shopTab==='ammo')Object.values(LASER_AMMO).forEach(a=>ui.shopGrid.appendChild(makeProductCard({name:a.name,desc:`Pacote com ${fmt(a.pack)} disparos • multiplicador x${a.mult}<br>Em estoque: ${fmt(ammoQty(a.id))}`,price:a.price,currency:a.currency,type:'ammo',onBuy:()=>buyAmmo(a.id)})));
  if(state.shopTab==='rockets')Object.values(ROCKETS).forEach(r=>ui.shopGrid.appendChild(makeProductCard({name:r.name,desc:`Pacote com ${fmt(r.pack)} mísseis • dano ${fmt(r.damage)}<br>Em estoque: ${fmt(rocketQty(r.id))}`,price:r.price,currency:r.currency,type:'rocket',onBuy:()=>buyRockets(r.id)})));
  updateUI();
}

function returnShipEquipmentToInventory(){for(const k of ['lasers','generators','extras'])for(const id of progress.shipLoadout[k])if(id)addInventory(id);}
function switchShip(shipId){if(!progress.ownedShips.includes(shipId)){showToast('Compre essa nave na Loja');return;}if(shipId===progress.activeShipId)return;returnShipEquipmentToInventory();progress.activeShipId=shipId;progress.shipLoadout=blankLoadout(shipId);player.laserFiring=false;computeStats(false);saveGame();renderHangar();buildAmmoButtons();showToast(`${SHIPS[shipId].name} ativada. Equipamentos antigos voltaram ao inventário.`);}
function equipShipItem(itemId){const item=ITEMS[itemId];const key=item.type==='laser'?'lasers':item.type==='generator'?'generators':item.type==='extra'?'extras':null;if(!key)return;if(!removeInventory(itemId)){showToast('Item não disponível');return;}const idx=progress.shipLoadout[key].findIndex(v=>!v);if(idx<0){addInventory(itemId);showToast('Sem slot livre na nave');return;}progress.shipLoadout[key][idx]=itemId;computeStats(true);saveGame();renderHangar();buildAmmoButtons();updateExtraControls();}
function unequipShipSlot(key,index){const id=progress.shipLoadout[key][index];if(!id)return;progress.shipLoadout[key][index]=null;addInventory(id);if(key==='extras'){for(const flag of ['autoLaser','autoRocket','turboRocket'])progress.flags[flag]=false;}computeStats(true);saveGame();renderHangar();buildAmmoButtons();}
function equipDroneItem(itemId){const item=ITEMS[itemId];if(!(item.type==='laser'||(item.type==='generator'&&item.subtype==='shield'))){showToast('Drones aceitam lasers ou geradores de escudo');return;}const drone=progress.drones.find(d=>d.slots.some(v=>!v));if(!drone){showToast('Nenhum slot livre nos drones');return;}if(!removeInventory(itemId))return;drone.slots[drone.slots.findIndex(v=>!v)]=itemId;computeStats(true);saveGame();renderHangar();buildAmmoButtons();}
function unequipDroneSlot(droneId,index){const d=progress.drones.find(x=>x.id===droneId);if(!d||!d.slots[index])return;addInventory(d.slots[index]);d.slots[index]=null;computeStats(true);saveGame();renderHangar();buildAmmoButtons();}
function sellDrone(droneId){const d=progress.drones.find(x=>x.id===droneId);if(!d)return;d.slots.filter(Boolean).forEach(addInventory);progress.drones=progress.drones.filter(x=>x.id!==droneId);computeStats(true);saveGame();renderHangar();buildAmmoButtons();showToast('Drone removido; equipamentos voltaram ao inventário');}

function slotCard(label,itemId,key,index,droneId=null){const el=document.createElement('div');el.className=`slot-card ${itemId?'':'empty'}`;const item=itemId?ITEMS[itemId]:null;el.innerHTML=`<div class="slot-label">${label}</div><div class="slot-item">${item?item.name:'VAZIO'}</div>${item?`<div class="muted" style="font-size:10px">${item.description}</div>`:''}`;if(item){const a=document.createElement('div');a.className='slot-actions';const b=document.createElement('button');b.className='ghost-btn';b.textContent='Remover';b.onclick=()=>droneId?unequipDroneSlot(droneId,index):unequipShipSlot(key,index);a.appendChild(b);el.appendChild(a);}return el;}
function inventoryCard(itemId,count){const item=ITEMS[itemId];const el=document.createElement('div');el.className='inventory-card';el.innerHTML=`<b>${item.name}</b><div class="qty">Quantidade: ${count}</div><div class="muted" style="font-size:10px;margin-top:4px">${item.description}</div>`;const actions=document.createElement('div');actions.className='inventory-actions';const shipBtn=document.createElement('button');shipBtn.className='ghost-btn';shipBtn.textContent='Nave';shipBtn.onclick=()=>equipShipItem(itemId);actions.appendChild(shipBtn);if((item.type==='laser'||(item.type==='generator'&&item.subtype==='shield'))&&progress.drones.length){const d=document.createElement('button');d.className='ghost-btn';d.textContent='Drone';d.onclick=()=>equipDroneItem(itemId);actions.appendChild(d);}el.appendChild(actions);return el;}

function renderHangarShips(){const wrap=document.createElement('div');wrap.className='ship-grid';Object.values(SHIPS).forEach(s=>{const owned=progress.ownedShips.includes(s.id),active=s.id===progress.activeShipId,c=document.createElement('div');c.className='ship-card';c.innerHTML=`<div class="ship-visual"></div><div><span class="badge">${owned?'OBTIDA':'BLOQUEADA'}</span><h3>${s.name}</h3></div><div class="ship-stats">HP ${fmt(s.hp)}<br>Lasers ${s.lasers} • Geradores ${s.generators} • Extras ${s.extras}<br>VEL ${s.speed} • Cargo ${fmt(s.cargo)}</div>`;const b=document.createElement('button');b.className='equip-btn';b.textContent=active?'Nave ativa':owned?'Usar nave':'Comprar na Loja';b.disabled=active;b.onclick=()=>owned?switchShip(s.id):(ui.hangarModal.classList.add('hidden'),openShop('ships'));c.appendChild(b);wrap.appendChild(c);});return wrap;}
function renderHangarEquipment(){
  const ship=SHIPS[progress.activeShipId],root=document.createElement('div');root.className='hangar-layout';const left=document.createElement('div');left.className='hangar-column';const right=document.createElement('div');right.className='hangar-column';
  const summary=document.createElement('div');summary.className='summary-grid';summary.innerHTML=`<div class="stat-card">Dano por tiro<strong>${fmt(player.laserDamage)}</strong></div><div class="stat-card">Escudo<strong>${fmt(player.maxShield)}</strong></div><div class="stat-card">Absorção<strong>${player.shieldAbsorption}%</strong></div><div class="stat-card">Velocidade<strong>${fmt(player.speed)}</strong></div>`;left.appendChild(summary);
  for(const [key,title] of [['lasers',`Lasers da ${ship.name} (${ship.lasers})`],['generators',`Geradores (${ship.generators})`],['extras',`Extras (${ship.extras})`]]){const box=document.createElement('div');box.className='section-box';box.innerHTML=`<h3>${title}</h3>`;const grid=document.createElement('div');grid.className='slot-grid';progress.shipLoadout[key].forEach((id,i)=>grid.appendChild(slotCard(`${title.split(' ')[0]} ${i+1}`,id,key,i)));box.appendChild(grid);left.appendChild(box);}
  const inv=document.createElement('div');inv.className='section-box';inv.innerHTML='<h3>Inventário disponível</h3>';const grid=document.createElement('div');grid.className='inventory-grid';const entries=Object.entries(progress.inventory).filter(([id,q])=>q>0&&ITEMS[id]);if(!entries.length)grid.innerHTML='<div class="empty-state">Seu inventário de equipamentos está vazio. Compre itens na Loja.</div>';else entries.forEach(([id,q])=>grid.appendChild(inventoryCard(id,q)));inv.appendChild(grid);right.appendChild(inv);root.append(left,right);return root;
}
function renderHangarDrones(){const root=document.createElement('div');const info=document.createElement('div');info.className='section-box';info.innerHTML=`<h3>Esquadrão de drones — ${progress.drones.length}/8</h3><div class="muted" style="font-size:12px">Flax: 1 slot • Iris: 2 slots. Os drones permanecem equipados quando você troca de nave.</div>`;root.appendChild(info);const grid=document.createElement('div');grid.className='drone-grid';if(!progress.drones.length){grid.innerHTML='<div class="empty-state">Você ainda não possui drones. Vá à Loja → Drones.</div>';}progress.drones.forEach((d,idx)=>{const model=ITEMS[d.type],c=document.createElement('div');c.className='drone-card';c.innerHTML=`<div><span class="badge ${d.type==='iris'?'elite':''}">${d.type==='iris'?'ELITE':'COMUM'}</span><h3>${model.name} #${idx+1}</h3></div><div class="drone-stats">${model.slots} slot${model.slots>1?'s':''} • aceita laser ou gerador de escudo</div>`;const sg=document.createElement('div');sg.className='slot-grid';d.slots.forEach((id,i)=>sg.appendChild(slotCard(`Slot ${i+1}`,id,null,i,d.id)));c.appendChild(sg);const rm=document.createElement('button');rm.className='danger-btn';rm.textContent='Remover drone';rm.onclick=()=>sellDrone(d.id);c.appendChild(rm);grid.appendChild(c);});root.appendChild(grid);return root;}
function renderHangar(){if(!progress)return;renderTabs(ui.hangarTabs,{ships:'Naves',equipment:'Equipamentos',drones:'Drones'},state.hangarTab,id=>{state.hangarTab=id;renderHangar();});ui.hangarContent.innerHTML='';computeStats(true);ui.hangarContent.appendChild(state.hangarTab==='ships'?renderHangarShips():state.hangarTab==='equipment'?renderHangarEquipment():renderHangarDrones());updateUI();}

function petEquipCard(kind,index){
  const pet=progress.pet,list=kind==='laser'?pet.lasers:pet.shields,id=list[index],item=id?ITEMS[id]:null;
  const card=document.createElement('div');card.className=`pet-slot ${item?'filled':''}`;
  card.innerHTML=`<div class="slot-label">${kind==='laser'?'ARMA':'ESCUDO'} ${index+1}</div><div class="slot-item">${item?item.name:'VAZIO'}</div>${item?`<div class="muted">${item.description}</div>`:'<div class="muted">Slot liberado</div>'}`;
  if(item){const b=document.createElement('button');b.className='ghost-btn';b.textContent='Remover';b.onclick=()=>unequipPetSlot(kind,index);card.appendChild(b);}
  return card;
}
function petLockedCard(kind,index){
  const slot=index+1,cost=petSlotCost(slot),card=document.createElement('div');card.className='pet-slot locked';
  const available=slot<=progress.pet.level;
  card.innerHTML=`<div class="slot-label">${kind==='laser'?'ARMA':'ESCUDO'} ${slot}</div><div class="slot-item">🔒 ${available?'LIBERÁVEL':'NÍVEL '+slot}</div><div class="muted">${available?`${fmt(cost)} URI para liberar`:`Alcance o nível ${slot} do P.E.T.`}</div>`;
  const b=document.createElement('button');b.className='ghost-btn';b.textContent=available?`Liberar • ${fmt(cost)} URI`:`Nível ${slot}`;b.disabled=!available;b.onclick=()=>unlockPetSlot(kind);card.appendChild(b);return card;
}
function renderPet(){
  if(!progress?.pet||!ui.petContent)return;
  const pet=progress.pet,need=pet.level<PET_MAX_LEVEL?petLevelXp(pet.level):0,pct=pet.level>=PET_MAX_LEVEL?100:Math.min(100,pet.xp/need*100);
  ui.petContent.innerHTML='';
  const hero=document.createElement('div');hero.className='pet-hero';
  hero.innerHTML=`<div class="pet-avatar"><div class="pet-core"></div></div><div class="pet-hero-copy"><div class="eyebrow">P.E.T. DE COMBATE</div><h2>Nível ${pet.level} / ${PET_MAX_LEVEL}</h2><div class="pet-xpbar"><span style="width:${pct}%"></span></div><div class="muted">${pet.level>=PET_MAX_LEVEL?'Nível máximo':`${fmt(pet.xp)} / ${fmt(need)} XP`} • Alcance ${fmt(petRange())} • Dano ${fmt(petDamage())} • Escudo ${fmt(petMaxShield())}</div><div class="muted">Módulos disponíveis: Guardião, BOX, Pedras, Regenerador e Kamikaze.</div></div>`;
  ui.petContent.appendChild(hero);

  const gears=document.createElement('div');gears.className='section-box';gears.innerHTML='<h3>Modos / Extras do P.E.T.</h3><div class="muted">Apenas um modo fica ativo por vez. Os módulos são permanentes depois de comprados.</div>';
  const gearGrid=document.createElement('div');gearGrid.className='pet-gear-grid';
  const off=document.createElement('button');off.className=`pet-gear ${pet.activeGear==='off'?'active':''}`;off.innerHTML='<b>COMPANHIA</b><small>Segue sua nave sem executar tarefa automática.</small>';off.onclick=()=>setPetGear('off');gearGrid.appendChild(off);
  Object.values(PET_GEARS).forEach(g=>{const owned=pet.gearsOwned[g.id],b=document.createElement('button');b.className=`pet-gear ${pet.activeGear===g.id?'active':''}`;b.innerHTML=`<b>${g.name}</b><small>${g.description}</small><em>${owned?'COMPRADO':fmt(g.cost)+' URI'}</em>`;b.onclick=()=>owned?setPetGear(g.id):buyPetGear(g.id);gearGrid.appendChild(b);});
  gears.appendChild(gearGrid);ui.petContent.appendChild(gears);

  for(const kind of ['laser','shield']){
    const unlocked=kind==='laser'?pet.laserSlotsUnlocked:pet.shieldSlotsUnlocked;
    const box=document.createElement('div');box.className='section-box';box.innerHTML=`<h3>${kind==='laser'?'Armas':'Escudos'} — ${unlocked}/${pet.level} liberados</h3><div class="muted">O nível do P.E.T. define quantos espaços podem ser comprados. O slot 1 já vem liberado.</div>`;
    const grid=document.createElement('div');grid.className='pet-slot-grid';
    for(let i=0;i<pet.level;i++)grid.appendChild(i<unlocked?petEquipCard(kind,i):petLockedCard(kind,i));
    box.appendChild(grid);ui.petContent.appendChild(box);
  }

  const inv=document.createElement('div');inv.className='section-box';inv.innerHTML='<h3>Equipamentos disponíveis no inventário</h3>';
  const grid=document.createElement('div');grid.className='inventory-grid';
  const entries=Object.entries(progress.inventory).filter(([id,q])=>q>0&&ITEMS[id]&&(ITEMS[id].type==='laser'||(ITEMS[id].type==='generator'&&ITEMS[id].subtype==='shield')));
  if(!entries.length)grid.innerHTML='<div class="empty-state">Compre lasers ou geradores de escudo na Loja e eles aparecerão aqui.</div>';
  else entries.forEach(([id,q])=>{const item=ITEMS[id],c=document.createElement('div');c.className='inventory-card';c.innerHTML=`<b>${item.name}</b><div class="qty">Quantidade: ${q}</div><div class="muted">${item.description}</div>`;const b=document.createElement('button');b.className='ghost-btn';b.textContent=item.type==='laser'?'Equipar no P.E.T. (arma)':'Equipar no P.E.T. (escudo)';b.onclick=()=>equipPetItem(id,item.type==='laser'?'laser':'shield');c.appendChild(b);grid.appendChild(c);});
  inv.appendChild(grid);ui.petContent.appendChild(inv);
}
function openPet(){renderPet();ui.petModal.classList.remove('hidden');}

function cargoSaleValue(){let total=0;for(const [id,qty] of Object.entries(progress.cargo||{}))total+=(RESOURCES[id]?.sell||0)*qty;return total;}
function sellCargoResource(id){if(!isAtTrader()){showToast('Venda disponível somente na base X-1');return;}const qty=progress.cargo[id]||0,price=RESOURCES[id]?.sell||0;if(qty<=0||price<=0)return;progress.profile.credits+=qty*price;delete progress.cargo[id];saveGame();renderCargo();updateUI();showToast(`${qty} ${id} vendidos por ${fmt(qty*price)} CR`);}
function sellAllCargo(){if(!isAtTrader()){showToast('Volte à base X-1 para vender');return;}let total=0;for(const [id,qty] of Object.entries(progress.cargo||{})){const price=RESOURCES[id]?.sell||0;if(price>0){total+=qty*price;delete progress.cargo[id];}}progress.profile.credits+=total;saveGame();renderCargo();updateUI();showToast(total?`Porão vendido: +${fmt(total)} CR`:'Nada vendável no porão');}
function renderCargo(){if(!progress)return;const atBase=isAtTrader();const xeno=progress.cargo?.Xenomit||0;ui.cargoSummary.innerHTML=`<b>${fmt(cargoUsed())}/${fmt(cargoCapacity())}</b> unidades ocupadas • Valor vendável: <b>${fmt(cargoSaleValue())} CR</b><br><span class="muted">${atBase?'Trader disponível: você está na base.':'Para vender recursos, retorne à Zona Segura do seu X-1.'} ${xeno?`• Xenomit: <b>${fmt(xeno)}</b> (não ocupa porão)`:''}</span>`;ui.cargoGrid.innerHTML='';const entries=Object.entries(progress.cargo||{}).filter(([,q])=>q>0);if(!entries.length){ui.cargoGrid.innerHTML='<div class="empty-state">Seu porão está vazio. Colete minérios no mapa ou caixas deixadas pelos NPCs.</div>';}for(const [id,qty] of entries){const r=RESOURCES[id]||{name:id,color:'#fff',sell:0};const special=id==='Xenomit';const c=document.createElement('div');c.className='cargo-card';c.innerHTML=`<div class="cargo-ore" style="--ore:${r.color}"></div><div><b>${r.name}</b><div class="muted">${fmt(qty)} un. • ${special?'especial • não ocupa porão':(r.sell?fmt(r.sell)+' CR/un.':'não vendável')}</div></div>`;const b=document.createElement('button');b.className='ghost-btn';b.textContent=r.sell?'Vender':'Guardar';b.disabled=!atBase||!r.sell;b.onclick=()=>sellCargoResource(id);c.appendChild(b);ui.cargoGrid.appendChild(c);}ui.sellAllCargo.disabled=!atBase||cargoSaleValue()<=0;}
function openCargo(){renderCargo();ui.cargoModal.classList.remove('hidden');}

function openShop(tab='ships'){state.shopTab=tab;renderShop();ui.shopModal.classList.remove('hidden');}
function openHangar(tab='ships'){state.hangarTab=tab;renderHangar();ui.hangarModal.classList.remove('hidden');}
function renderAll(){buildAmmoButtons();renderShop();renderHangar();renderCargo();renderMapModal();renderPet();updateUI();}

function worldPoint(ev){const r=canvas.getBoundingClientRect(),sx=ev.clientX-r.left,sy=ev.clientY-r.top;return{x:sx-W/2+state.camera.x,y:sy-H/2+state.camera.y};}
function pointerAction(ev){if(!authenticated||!progress||!ui.loginModal.classList.contains('hidden')||!ui.shopModal.classList.contains('hidden')||!ui.hangarModal.classList.contains('hidden')||!ui.cargoModal.classList.contains('hidden')||!ui.petModal.classList.contains('hidden')||!ui.factionModal.classList.contains('hidden'))return;const p=worldPoint(ev);const found=state.enemies.find(e=>e.hp>0&&Math.hypot(e.x-p.x,e.y-p.y)<=e.size+12);if(found){state.target=found;showToast(`Alvo: ${found.name}`);if(autoLaserEnabled())player.laserFiring=true;return;}const clickedPortal=portalAtWorld(p.x,p.y);const readyPortal=nearbyPortal();if(clickedPortal&&readyPortal&&clickedPortal.to===readyPortal.to&&Math.hypot(clickedPortal.x-readyPortal.x,clickedPortal.y-readyPortal.y)<1){jumpThroughPortal(readyPortal);return;}player.tx=Math.max(40,Math.min(state.currentMap.world.w-40,p.x));player.ty=Math.max(40,Math.min(state.currentMap.world.h-40,p.y));}
canvas.addEventListener('pointerdown',pointerAction);
ui.portalPrompt.onclick=()=>{const portal=nearbyPortal();if(portal)jumpThroughPortal(portal);};
minimap.addEventListener('pointerdown',e=>{if(!authenticated||!progress)return;e.preventDefault();e.stopPropagation();const r=minimap.getBoundingClientRect();const mx=(e.clientX-r.left)/r.width*minimap.width,my=(e.clientY-r.top)/r.height*minimap.height;player.tx=Math.max(35,Math.min(state.currentMap.world.w-35,mx/minimap.width*state.currentMap.world.w));player.ty=Math.max(35,Math.min(state.currentMap.world.h-35,my/minimap.height*state.currentMap.world.h));showToast(`Rota definida no minimapa`);});
ui.laserToggle.onclick=()=>{if(!state.target||state.target.hp<=0){showToast('Selecione um alvo');return;}player.laserFiring=!player.laserFiring;};ui.rocketFire.onclick=()=>fireRocket(true);
ui.mapBtn.onclick=()=>openMapModal();ui.closeMap.onclick=()=>ui.mapModal.classList.add('hidden');ui.petBtn.onclick=()=>openPet();ui.closePet.onclick=()=>ui.petModal.classList.add('hidden');ui.shopBtn.onclick=()=>openShop();if(ui.weaponBarToggle)ui.weaponBarToggle.onclick=()=>toggleAmmoUi();ui.closeShop.onclick=()=>ui.shopModal.classList.add('hidden');ui.hangarBtn.onclick=()=>openHangar();ui.closeHangar.onclick=()=>ui.hangarModal.classList.add('hidden');ui.cargoBtn.onclick=()=>openCargo();ui.closeCargo.onclick=()=>ui.cargoModal.classList.add('hidden');ui.sellAllCargo.onclick=()=>sellAllCargo();ui.mapModal.onclick=e=>{if(e.target===ui.mapModal)ui.mapModal.classList.add('hidden');};ui.petModal.onclick=e=>{if(e.target===ui.petModal)ui.petModal.classList.add('hidden');};ui.shopModal.onclick=e=>{if(e.target===ui.shopModal)ui.shopModal.classList.add('hidden');};ui.hangarModal.onclick=e=>{if(e.target===ui.hangarModal)ui.hangarModal.classList.add('hidden');};ui.cargoModal.onclick=e=>{if(e.target===ui.cargoModal)ui.cargoModal.classList.add('hidden');};
document.addEventListener('keydown',e=>{if(!authenticated||!progress||!ui.loginModal.classList.contains('hidden')||!ui.factionModal.classList.contains('hidden'))return;const tag=document.activeElement?.tagName;if(tag==='INPUT'||tag==='TEXTAREA')return;if(e.key==='Control'){e.preventDefault();if(state.target&&state.target.hp>0)player.laserFiring=!player.laserFiring;else showToast('Selecione um alvo');}if(e.code==='Space'){e.preventDefault();fireRocket(true);}if(['j','J'].includes(e.key)||e.key==='Enter'){const portal=nearbyPortal();if(portal){e.preventDefault();jumpThroughPortal(portal);}}if(e.key.toLowerCase()==='h')openHangar();if(e.key.toLowerCase()==='b')openShop();if(e.key.toLowerCase()==='c')openCargo();if(e.key.toLowerCase()==='m')openMapModal();if(e.key.toLowerCase()==='p')openPet();if(['1','2','3','4'].includes(e.key)){progress.selectedLaserAmmo=Object.keys(LASER_AMMO)[Number(e.key)-1];buildAmmoButtons();saveGame();}});

function showAuthMode(mode){
  const login=mode==='login';ui.loginForm.classList.toggle('hidden',!login);ui.registerForm.classList.toggle('hidden',login);ui.loginTabBtn.classList.toggle('active',login);ui.registerTabBtn.classList.toggle('active',!login);ui.authMessage.textContent='';
}
ui.loginTabBtn.onclick=()=>showAuthMode('login');ui.registerTabBtn.onclick=()=>showAuthMode('register');
ui.loginForm.onsubmit=async e=>{e.preventDefault();ui.authMessage.textContent='Entrando...';try{await signIn({email:ui.loginEmail.value,password:ui.loginPassword.value});await afterAuth();}catch(err){ui.authMessage.textContent=err.message;}};
ui.registerForm.onsubmit=async e=>{e.preventDefault();ui.authMessage.textContent='Criando conta...';try{const result=await signUp({callsign:ui.registerCallsign.value,email:ui.registerEmail.value,password:ui.registerPassword.value});if(result.requires_confirmation){ui.authMessage.textContent='Conta criada. Confirme o e-mail no Supabase e depois entre.';showAuthMode('login');ui.loginEmail.value=ui.registerEmail.value;return;}await afterAuth();}catch(err){ui.authMessage.textContent=err.message;}};
ui.logoutBtn.onclick=async()=>{await flushCloudSave(true);signOutLocal();authenticated=false;progress=null;state.target=null;player.laserFiring=false;ui.mapModal.classList.add('hidden');ui.petModal.classList.add('hidden');ui.shopModal.classList.add('hidden');ui.hangarModal.classList.add('hidden');ui.cargoModal.classList.add('hidden');ui.factionModal.classList.add('hidden');ui.portalPrompt.classList.add('hidden');ui.loginModal.classList.remove('hidden');ui.userLabel.textContent='—';setSync('LOCAL','');showAuthMode('login');};

function startLoadedGame(){
  const savedX=Number.isFinite(progress.x)?progress.x:null,savedY=Number.isFinite(progress.y)?progress.y:null;state.currentMap=MAPS[progress.mapId]||MAPS.x1;player.hp=progress.hp||1;player.shield=progress.shield||0;computeStats(true);player.hp=Math.min(player.maxHp,progress.hp??player.maxHp);player.shield=Math.min(player.maxShield,progress.shield??player.maxShield);
  player.x=savedX??(progress.mapId==='x1'?SAFE_ZONE.x:400);player.y=savedY??state.currentMap.world.h/2;player.tx=player.x;player.ty=player.y;petRuntime.x=player.x+44;petRuntime.y=player.y+44;petRuntime.tx=petRuntime.x;petRuntime.ty=petRuntime.y;state.camera.x=player.x;state.camera.y=player.y;state.target=null;state.loot=[];createOres();spawnEnemies();renderAll();saveGame();
}

async function afterAuth(){
  authenticated=true;ui.loginModal.classList.add('hidden');ui.userLabel.textContent=getUser()?.callsign||getUser()?.email?.split('@')[0]||'Pilot';setSync('SINCRONIZANDO','busy');
  try{
    const remote=await loadCloudSave();
    if(remote.state){progress=remote.state;hydrateProgress();setSync('ONLINE','ok');}
    else{loadLocalGame();setSync('ONLINE','ok');}
  }catch(err){console.warn(err);loadLocalGame();setSync('OFFLINE','err');}
  if(!progress){renderFactionChoice();return;}
  startLoadedGame();
}

async function boot(){
  ui.loginModal.classList.remove('hidden');showAuthMode('login');setSync('LOCAL','');
  try{const restored=await restoreSession();if(restored)await afterAuth();}catch(err){console.warn(err);}
}

loadAmmoUiState();
boot();
setInterval(()=>{if(progress){saveGame();flushCloudSave();}},7000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flushCloudSave(true);});
let last=performance.now();function loop(t){const dt=Math.min((t-last)/1000,.035);last=t;update(dt);draw();requestAnimationFrame(loop);}requestAnimationFrame(loop);
