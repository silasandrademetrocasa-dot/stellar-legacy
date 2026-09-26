import { FACTIONS, SHIPS, ITEMS, LASER_AMMO, ROCKETS, NPC_TYPES, MAPS } from './data.js';

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
  laserAmmoButtons: $('#laserAmmoButtons'), rocketAmmoButtons: $('#rocketAmmoButtons'), laserToggle: $('#laserToggle'), rocketFire: $('#rocketFire'), autoLaser: $('#autoLaser'), autoRocket: $('#autoRocket'), turboRocket: $('#turboRocket'), rocketCd: $('#rocketCd'),
  toast: $('#toast'), factionModal: $('#factionModal'), factionCards: $('#factionCards'),
  shopBtn: $('#shopBtn'), shopModal: $('#shopModal'), closeShop: $('#closeShop'), shopTabs: $('#shopTabs'), shopGrid: $('#shopGrid'), shopCredits: $('#shopCredits'), shopUridium: $('#shopUridium'),
  hangarBtn: $('#hangarBtn'), hangarModal: $('#hangarModal'), closeHangar: $('#closeHangar'), hangarTabs: $('#hangarTabs'), hangarContent: $('#hangarContent'), hangarShipName: $('#hangarShipName'),
};

const SAVE_KEY = 'stellarLegacyV3Save';
const TWO_PI = Math.PI * 2;
const categories = {
  ships: 'Naves', lasers: 'Lasers', generators: 'Geradores', drones: 'Drones', extras: 'Extras', ammo: 'Munição', rockets: 'Mísseis'
};

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
    profile: { faction: factionId, level: 1, xp: 0, credits: 20000, uridium: 0 },
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
    hp: SHIPS.phoenix.hp,
    shield: 1000,
    flags: { autoLaser: false, autoRocket: false, turboRocket: false },
  };
}

let progress = null;
const player = {
  x: 380, y: 900, tx: 380, ty: 900,
  hp: 1, maxHp: 1, shield: 0, maxShield: 0, speed: 320, laserDamage: 0, shieldAbsorption: 0,
  laserFiring: false, lastLaserShot: 0, lastRocketShot: -999,
};
const state = {
  currentMap: MAPS.x1, camera: { x: 380, y: 900 }, target: null, enemies: [], loot: [], ores: [], particles: [], lastPortalAt: 0,
  shopTab: 'ships', hangarTab: 'ships', toastTimer: null,
  stars: Array.from({length:240},()=>({x:Math.random()*5200-2600,y:Math.random()*5200-2600,r:Math.random()*1.5+.3,a:Math.random()*.6+.2})),
};

function clone(v){return JSON.parse(JSON.stringify(v));}
function rand(a,b){return Math.random()*(b-a)+a;}
function nowSec(){return performance.now()/1000;}
function fmt(v){return Math.max(0,Math.round(v)).toLocaleString('pt-BR');}
function getFaction(){return progress?.profile?.faction ? FACTIONS[progress.profile.faction] : null;}
function displayMapLabel(mapId){const f=getFaction(); return f ? `${f.prefix}-${MAPS[mapId].tier}` : `X-${MAPS[mapId].tier}`;}
function showToast(msg){ui.toast.textContent=msg;ui.toast.classList.add('show');clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),1900);}
function saveGame(){if(progress)localStorage.setItem(SAVE_KEY,JSON.stringify(progress));}

function loadGame(){
  const raw=localStorage.getItem(SAVE_KEY);
  if(!raw){progress=null;return;}
  try{
    progress=JSON.parse(raw);
    if(!progress.profile?.faction || !SHIPS[progress.activeShipId]) throw new Error('save incompleto');
    progress.ownedShips ||= ['phoenix']; progress.inventory ||= {}; progress.drones ||= []; progress.ammo ||= {}; progress.rockets ||= {}; progress.flags ||= {};
    progress.shipLoadout ||= blankLoadout(progress.activeShipId);
    normalizeLoadout();
  }catch(e){console.warn(e);progress=null;}
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
function allEquippedIds(){return [...progress.shipLoadout.lasers,...progress.shipLoadout.generators,...progress.shipLoadout.extras,...progress.drones.flatMap(d=>d.slots)].filter(Boolean);}

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
  progress=freshSave(factionId);state.currentMap=MAPS.x1;player.hp=SHIPS.phoenix.hp;player.shield=1000;computeStats(false);setMap('x1',false);ui.factionModal.classList.add('hidden');buildAmmoButtons();renderAll();saveGame();showToast(`Bem-vindo à ${FACTIONS[factionId].name}`);
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

function createOres(){
  state.ores=[];const names=state.currentMap.ores;
  for(let i=0;i<14;i++){const type=names[i%names.length];state.ores.push({x:rand(180,state.currentMap.world.w-180),y:rand(180,state.currentMap.world.h-180),type,amount:Math.round(rand(15,40)),color:type==='Prometium'?'#ffa94f':type==='Endurium'?'#59d3ff':'#d76bff'});}
}
function spawnEnemies(){
  state.enemies=[];let n=0;
  for(const group of state.currentMap.enemyGroups){const base=NPC_TYPES[group.type];for(let i=0;i<group.count;i++)state.enemies.push({id:`${group.type}_${n++}_${Math.random().toString(16).slice(2,6)}`,type:group.type,name:base.name,x:rand(160,state.currentMap.world.w-160),y:rand(160,state.currentMap.world.h-160),hp:base.hp,maxHp:base.hp,shield:base.shield,maxShield:base.shield,credits:base.credits,uridium:base.uridium,speed:base.speed,damage:base.damage,color:base.color,size:base.size,attackRange:Math.min(360,140+base.size*5),aggroRange:520,lastShot:0,angle:rand(0,TWO_PI),drift:rand(.4,1.4)});}
}
function setMap(mapId,preserve=false){
  progress.mapId=mapId;state.currentMap=MAPS[mapId];computeStats(true);
  if(!preserve){player.x=mapId==='x1'?260:400;player.y=state.currentMap.world.h/2;player.tx=player.x;player.ty=player.y;}
  state.camera.x=player.x;state.camera.y=player.y;state.target=null;state.loot=[];createOres();spawnEnemies();saveGame();showToast(`Entrando em ${displayMapLabel(mapId)}`);
}

function currentLaserAmmo(){return LASER_AMMO[progress.selectedLaserAmmo]||LASER_AMMO.lcb10;}
function currentRocket(){return ROCKETS[progress.selectedRocket]||ROCKETS.r310;}
function ammoQty(id){return progress.ammo[id]||0;}
function rocketQty(id){return progress.rockets[id]||0;}
function getRocketCooldown(){return hasExtra('rocketTurboCpu')&&progress.flags.turboRocket?2.5:5;}
function rocketReady(){return nowSec()-player.lastRocketShot>=getRocketCooldown();}
function enemyDistance(e){return Math.hypot(e.x-player.x,e.y-player.y);}

function dealDamageToEnemy(enemy,damage,color){
  let remain=damage;if(enemy.shield>0){const a=Math.min(enemy.shield,remain);enemy.shield-=a;remain-=a;}if(remain>0)enemy.hp-=remain;
  spawnParticle(enemy.x,enemy.y-enemy.size,fmt(damage),color);
  if(enemy.hp<=0){enemy.hp=0;state.loot.push({x:enemy.x,y:enemy.y,credits:enemy.credits,uridium:enemy.uridium});if(state.target?.id===enemy.id){state.target=null;player.laserFiring=false;}}
}
function fireLaserTick(){
  if(!state.target||state.target.hp<=0||enemyDistance(state.target)>650)return;
  const ammo=currentLaserAmmo();if(ammoQty(ammo.id)<=0){player.laserFiring=false;showToast(`${ammo.name} acabou`);return;}
  if(player.laserDamage<=0){player.laserFiring=false;showToast('Equipe pelo menos um laser no Hangar');return;}
  if(nowSec()-player.lastLaserShot<.42)return;
  player.lastLaserShot=nowSec();progress.ammo[ammo.id]-=1;const damage=Math.round(player.laserDamage*ammo.mult*rand(.95,1.08));dealDamageToEnemy(state.target,damage,ammo.color);
}
function fireRocket(manual=false){
  if(!state.target||state.target.hp<=0){if(manual)showToast('Selecione um alvo');return;}
  if(enemyDistance(state.target)>680){if(manual)showToast('Alvo fora do alcance');return;}
  const r=currentRocket();if(rocketQty(r.id)<=0){if(manual)showToast(`${r.name} acabou`);return;}
  if(!rocketReady()){if(manual)showToast(`Míssil recarregando`);return;}
  player.lastRocketShot=nowSec();progress.rockets[r.id]-=1;dealDamageToEnemy(state.target,Math.round(r.damage*player.rocketMult),r.color);saveGame();
}
function takePlayerDamage(dmg){
  const absorb=Math.max(0,Math.min(100,player.shieldAbsorption))/100;let shieldPart=dmg*absorb;let hullPart=dmg-shieldPart;
  if(player.shield>0){const got=Math.min(player.shield,shieldPart);player.shield-=got;shieldPart-=got;hullPart+=shieldPart;}
  else hullPart+=shieldPart;
  player.hp-=hullPart;
}
function gainLoot(drop){progress.profile.credits+=drop.credits;progress.profile.uridium+=drop.uridium;progress.profile.xp+=Math.round(drop.credits/10+drop.uridium*12);while(progress.profile.xp>=progress.profile.level*2000){progress.profile.xp-=progress.profile.level*2000;progress.profile.level++;showToast(`Level ${progress.profile.level}!`);}saveGame();}

function updatePlayer(dt){
  const dx=player.tx-player.x,dy=player.ty-player.y,d=Math.hypot(dx,dy);if(d>2){const step=Math.min(d,player.speed*dt);player.x+=dx/d*step;player.y+=dy/d*step;}
  player.x=Math.max(35,Math.min(state.currentMap.world.w-35,player.x));player.y=Math.max(35,Math.min(state.currentMap.world.h-35,player.y));state.camera.x+=(player.x-state.camera.x)*.08;state.camera.y+=(player.y-state.camera.y)*.08;
  const inCombat=state.enemies.some(e=>e.hp>0&&enemyDistance(e)<430);if(!inCombat){player.shield=Math.min(player.maxShield,player.shield+player.maxShield*.045*dt);if(hasExtra('rep2'))player.hp=Math.min(player.maxHp,player.hp+player.maxHp*.025*dt);}
  if(player.laserFiring)fireLaserTick();
  if(progress.flags.autoRocket&&hasExtra('autoRocketCpu')&&player.laserFiring&&rocketReady())fireRocket(false);
  for(let i=state.loot.length-1;i>=0;i--){const l=state.loot[i];if(Math.hypot(l.x-player.x,l.y-player.y)<40){gainLoot(l);spawnParticle(l.x,l.y,`+${fmt(l.credits)} CR +${l.uridium} URI`,'#ffe57b');state.loot.splice(i,1);}}
  for(let i=state.ores.length-1;i>=0;i--){const o=state.ores[i];if(Math.hypot(o.x-player.x,o.y-player.y)<30){progress.profile.credits+=o.amount*25;spawnParticle(o.x,o.y,`+${o.amount} ${o.type}`,o.color);state.ores.splice(i,1);saveGame();}}
  if(player.hp<=0){player.hp=player.maxHp;player.shield=Math.round(player.maxShield*.5);progress.profile.credits=Math.max(0,Math.round(progress.profile.credits*.95));player.x=180;player.y=state.currentMap.world.h/2;player.tx=player.x;player.ty=player.y;state.target=null;player.laserFiring=false;showToast('Nave destruída. Reparada na base.');saveGame();}
  if(nowSec()-state.lastPortalAt>1.5)for(const p of state.currentMap.portals)if(Math.hypot(p.x-player.x,p.y-player.y)<58){state.lastPortalAt=nowSec();setMap(p.to,false);break;}
  progress.hp=player.hp;progress.shield=player.shield;
}
function updateEnemies(dt){
  for(const e of state.enemies){if(e.hp<=0)continue;const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy);e.angle+=dt*e.drift;if(d<e.aggroRange&&d>e.attackRange*.8){e.x+=dx/d*e.speed*dt;e.y+=dy/d*e.speed*dt;}else if(d>e.aggroRange){e.x+=Math.cos(e.angle)*e.speed*.16*dt;e.y+=Math.sin(e.angle)*e.speed*.16*dt;}e.x=Math.max(25,Math.min(state.currentMap.world.w-25,e.x));e.y=Math.max(25,Math.min(state.currentMap.world.h-25,e.y));if(d<e.attackRange&&nowSec()-e.lastShot>(e.name.includes('Boss')?1.6:1.15)){e.lastShot=nowSec();takePlayerDamage(e.damage*rand(.92,1.12));spawnParticle(player.x,player.y-28,Math.round(e.damage),'#ff8080');}}
}
function updateParticles(dt){for(let i=state.particles.length-1;i>=0;i--){const p=state.particles[i];p.y-=p.vy*dt;p.life-=dt;if(p.life<=0)state.particles.splice(i,1);}}
function update(dt){if(!progress)return;updatePlayer(dt);updateEnemies(dt);updateParticles(dt);updateUI();}

function drawStars(){ctx.fillStyle='#fff';for(const s of state.stars){const sx=((s.x-state.camera.x*.15)%(W+80)+(W+80))%(W+80)-40,sy=((s.y-state.camera.y*.15)%(H+80)+(H+80))%(H+80)-40;ctx.globalAlpha=s.a;ctx.beginPath();ctx.arc(sx,sy,s.r,0,TWO_PI);ctx.fill();}ctx.globalAlpha=1;}
function drawBounds(){const p=screenPos(0,0);ctx.strokeStyle='rgba(60,140,255,.16)';ctx.lineWidth=2;ctx.strokeRect(p.x,p.y,state.currentMap.world.w,state.currentMap.world.h);}
function drawPortals(){for(const portal of state.currentMap.portals){const p=screenPos(portal.x,portal.y);ctx.save();ctx.translate(p.x,p.y);ctx.strokeStyle=getFaction()?.color||'#38ddff';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(0,0,34,54,0,0,TWO_PI);ctx.stroke();ctx.strokeStyle='rgba(84,225,255,.30)';ctx.lineWidth=10;ctx.beginPath();ctx.ellipse(0,0,20+Math.sin(nowSec()*4)*2,38,0,0,TWO_PI);ctx.stroke();ctx.fillStyle='#d4f9ff';ctx.font='12px Arial';ctx.textAlign='center';ctx.fillText(displayMapLabel(portal.to),0,-68);ctx.restore();}}
function drawOres(){for(const o of state.ores){const p=screenPos(o.x,o.y);ctx.fillStyle=o.color;ctx.beginPath();ctx.moveTo(p.x,p.y-12);ctx.lineTo(p.x+10,p.y);ctx.lineTo(p.x,p.y+12);ctx.lineTo(p.x-10,p.y);ctx.closePath();ctx.fill();}}
function drawLoot(){for(const l of state.loot){const p=screenPos(l.x,l.y);ctx.fillStyle='#ffe77b';ctx.fillRect(p.x-7,p.y-7,14,14);ctx.strokeStyle='#fff6bc';ctx.strokeRect(p.x-7,p.y-7,14,14);}}
function drawEnemy(e){const p=screenPos(e.x,e.y);ctx.save();ctx.translate(p.x,p.y);if(state.target?.id===e.id){ctx.strokeStyle='#ff3159';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,e.size+7+Math.sin(nowSec()*5)*1.2,0,TWO_PI);ctx.stroke();}ctx.fillStyle=e.color;ctx.beginPath();ctx.moveTo(e.size,0);ctx.lineTo(-e.size*.75,-e.size*.7);ctx.lineTo(-e.size*.15,0);ctx.lineTo(-e.size*.75,e.size*.7);ctx.closePath();ctx.fill();ctx.restore();const hp=e.hp/e.maxHp,sh=e.maxShield?e.shield/e.maxShield:0;ctx.fillStyle='#320b12';ctx.fillRect(p.x-e.size,p.y-e.size-16,e.size*2,4);ctx.fillStyle='#ff4560';ctx.fillRect(p.x-e.size,p.y-e.size-16,e.size*2*hp,4);ctx.fillStyle='#10253f';ctx.fillRect(p.x-e.size,p.y-e.size-10,e.size*2,4);ctx.fillStyle='#4bcfff';ctx.fillRect(p.x-e.size,p.y-e.size-10,e.size*2*sh,4);}
function drawDrones(p){const f=getFaction();progress.drones.forEach((d,i)=>{const a=nowSec()*.8+i*TWO_PI/Math.max(1,progress.drones.length);const r=34+(i%2)*8;ctx.fillStyle=d.type==='iris'?'#d49cff':'#89d8ff';ctx.beginPath();ctx.arc(p.x+Math.cos(a)*r,p.y+Math.sin(a)*r,3.5,0,TWO_PI);ctx.fill();ctx.strokeStyle=f?.color||'#fff';ctx.stroke();});}
function drawPlayer(){const p=screenPos(player.x,player.y),f=getFaction(),a=Math.atan2(player.ty-player.y,player.tx-player.x||0);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(a||0);ctx.fillStyle=f?.color||'#76e0ff';ctx.beginPath();ctx.moveTo(22,0);ctx.lineTo(-14,-12);ctx.lineTo(-5,0);ctx.lineTo(-14,12);ctx.closePath();ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(-18,-4,8,8);ctx.fillStyle='#6d4fff';ctx.fillRect(-12,-2,8,4);ctx.restore();drawDrones(p);if(player.laserFiring&&state.target&&state.target.hp>0&&enemyDistance(state.target)<=650){const t=screenPos(state.target.x,state.target.y);ctx.strokeStyle=currentLaserAmmo().color;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(t.x,t.y);ctx.stroke();}}
function drawParticles(){ctx.font='12px Arial';ctx.textAlign='center';for(const p of state.particles){const q=screenPos(p.x,p.y);ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.fillText(p.text,q.x,q.y);}ctx.globalAlpha=1;}
function drawMinimap(){mm.clearRect(0,0,minimap.width,minimap.height);mm.fillStyle='#07111c';mm.fillRect(0,0,minimap.width,minimap.height);mm.strokeStyle='rgba(75,180,255,.5)';mm.strokeRect(1,1,minimap.width-2,minimap.height-2);const sx=minimap.width/state.currentMap.world.w,sy=minimap.height/state.currentMap.world.h;for(const p of state.currentMap.portals){mm.fillStyle=getFaction()?.color||'#2ce4ff';mm.beginPath();mm.arc(p.x*sx,p.y*sy,4,0,TWO_PI);mm.fill();}for(const e of state.enemies){if(e.hp<=0)continue;mm.fillStyle=state.target?.id===e.id?'#ff345e':e.color;mm.fillRect(e.x*sx-1,e.y*sy-1,3,3);}for(const o of state.ores){mm.fillStyle=o.color;mm.fillRect(o.x*sx-1,o.y*sy-1,2,2);}mm.fillStyle='#fff';mm.beginPath();mm.arc(player.x*sx,player.y*sy,4,0,TWO_PI);mm.fill();}
function draw(){ctx.clearRect(0,0,W,H);drawStars();if(!progress)return;drawBounds();drawPortals();drawOres();drawLoot();state.enemies.forEach(e=>e.hp>0&&drawEnemy(e));drawPlayer();drawParticles();drawMinimap();}

function buildAmmoButtons(){
  if(!progress)return;ui.laserAmmoButtons.innerHTML='';Object.values(LASER_AMMO).forEach(a=>{const q=ammoQty(a.id),b=document.createElement('button');b.className=`ammo-btn ${progress.selectedLaserAmmo===a.id?'active':''} ${q<=0?'empty':''}`;b.style.borderColor=a.color;b.innerHTML=`${a.name}<small>x${a.mult} • ${fmt(q)}</small>`;b.onclick=()=>{progress.selectedLaserAmmo=a.id;buildAmmoButtons();saveGame();};ui.laserAmmoButtons.appendChild(b);});
  ui.rocketAmmoButtons.innerHTML='';Object.values(ROCKETS).forEach(r=>{const q=rocketQty(r.id),b=document.createElement('button');b.className=`ammo-btn ${progress.selectedRocket===r.id?'active':''} ${q<=0?'empty':''}`;b.style.borderColor=r.color;b.innerHTML=`${r.name}<small>${fmt(r.damage)} • ${fmt(q)}</small>`;b.onclick=()=>{progress.selectedRocket=r.id;buildAmmoButtons();saveGame();};ui.rocketAmmoButtons.appendChild(b);});
}
function updateExtraControls(){
  const configs=[['autoLaser','autoLaserCpu'],['autoRocket','autoRocketCpu'],['turboRocket','rocketTurboCpu']];
  for(const [flag,item] of configs){const el=ui[flag],owned=hasExtra(item);el.disabled=!owned;if(!owned)progress.flags[flag]=false;el.checked=!!progress.flags[flag];el.closest('label')?.classList.toggle('locked',!owned);}
}
function updateUI(){
  const f=getFaction(),ship=SHIPS[progress.activeShipId];ui.factionLabel.textContent=f?.short||'—';ui.factionLabel.style.color=f?.color||'';ui.mapLabel.textContent=displayMapLabel(progress.mapId);ui.shipLabel.textContent=ship.name;ui.lvl.textContent=progress.profile.level;ui.hp.textContent=fmt(player.hp);ui.maxHp.textContent=fmt(player.maxHp);ui.shield.textContent=fmt(player.shield);ui.maxShield.textContent=fmt(player.maxShield);ui.speed.textContent=fmt(player.speed);ui.dmg.textContent=fmt(player.laserDamage*currentLaserAmmo().mult);ui.credits.textContent=fmt(progress.profile.credits);ui.uridium.textContent=fmt(progress.profile.uridium);ui.xp.textContent=fmt(progress.profile.xp);ui.droneCount.textContent=progress.drones.length;ui.laserToggle.classList.toggle('active',player.laserFiring);ui.rocketCd.textContent=rocketReady()?'MÍSSIL PRONTO':`MÍSSIL ${(getRocketCooldown()-(nowSec()-player.lastRocketShot)).toFixed(1)}s`;
  if(state.target&&state.target.hp>0){ui.targetName.textContent=state.target.name;ui.targetStats.textContent=`HP ${fmt(state.target.hp)} • ESC ${fmt(state.target.shield)}`;ui.targetHpBar.style.width=`${state.target.hp/state.target.maxHp*100}%`;ui.targetShieldBar.style.width=`${state.target.maxShield?state.target.shield/state.target.maxShield*100:0}%`;}else{ui.targetName.textContent='Sem alvo';ui.targetStats.textContent='Toque em um NPC para selecionar';ui.targetHpBar.style.width='0%';ui.targetShieldBar.style.width='0%';}
  ui.shopCredits.textContent=fmt(progress.profile.credits);ui.shopUridium.textContent=fmt(progress.profile.uridium);ui.hangarShipName.textContent=ship.name;updateExtraControls();
}

function canAfford(price,currency){return currency==='credits'?progress.profile.credits>=price:progress.profile.uridium>=price;}
function charge(price,currency){if(!canAfford(price,currency))return false;if(currency==='credits')progress.profile.credits-=price;else progress.profile.uridium-=price;return true;}
function priceText(p,c){return `${fmt(p)} ${c==='credits'?'CR':'URI'}`;}
function productIcon(type,subtype){return type==='ship'?'🛸':type==='laser'?'⚡':type==='generator'?(subtype==='speed'?'💨':'🛡️'):type==='drone'?'◆':type==='extra'?'🧩':type==='ammo'?'✦':'🚀';}

function buyShip(shipId){const ship=SHIPS[shipId];if(progress.ownedShips.includes(shipId)){showToast('Nave já obtida');return;}if(!charge(ship.price,ship.currency)){showToast('Saldo insuficiente');return;}progress.ownedShips.push(shipId);saveGame();renderShop();showToast(`${ship.name} adicionada ao Hangar`);}
function buyItem(itemId){const item=ITEMS[itemId];if(item.type==='drone'){buyDrone(itemId);return;}if(!charge(item.price,item.currency)){showToast('Saldo insuficiente');return;}addInventory(itemId);saveGame();renderShop();if(!ui.hangarModal.classList.contains('hidden'))renderHangar();showToast(`${item.name} comprado`);}
function buyDrone(type){if(progress.drones.length>=8){showToast('Limite de 8 drones atingido');return;}const item=ITEMS[type];if(!charge(item.price,item.currency)){showToast('Saldo insuficiente');return;}progress.drones.push({id:`d_${Date.now()}_${Math.random().toString(16).slice(2,5)}`,type,slots:Array(item.slots).fill(null)});computeStats(true);saveGame();renderShop();showToast(`${item.name} adquirido (${progress.drones.length}/8)`);}
function buyAmmo(id){const a=LASER_AMMO[id];if(!charge(a.price,a.currency)){showToast('Saldo insuficiente');return;}progress.ammo[id]=(progress.ammo[id]||0)+a.pack;saveGame();buildAmmoButtons();renderShop();showToast(`+${fmt(a.pack)} ${a.name}`);}
function buyRockets(id){const r=ROCKETS[id];if(!charge(r.price,r.currency)){showToast('Saldo insuficiente');return;}progress.rockets[id]=(progress.rockets[id]||0)+r.pack;saveGame();buildAmmoButtons();renderShop();showToast(`+${fmt(r.pack)} ${r.name}`);}

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
function equipShipItem(itemId){const item=ITEMS[itemId];const key=item.type==='laser'?'lasers':item.type==='generator'?'generators':item.type==='extra'?'extras':null;if(!key)return;if(!removeInventory(itemId)){showToast('Item não disponível');return;}const idx=progress.shipLoadout[key].findIndex(v=>!v);if(idx<0){addInventory(itemId);showToast('Sem slot livre na nave');return;}progress.shipLoadout[key][idx]=itemId;computeStats(true);saveGame();renderHangar();updateExtraControls();}
function unequipShipSlot(key,index){const id=progress.shipLoadout[key][index];if(!id)return;progress.shipLoadout[key][index]=null;addInventory(id);if(key==='extras'){for(const flag of ['autoLaser','autoRocket','turboRocket'])progress.flags[flag]=false;}computeStats(true);saveGame();renderHangar();}
function equipDroneItem(itemId){const item=ITEMS[itemId];if(!(item.type==='laser'||(item.type==='generator'&&item.subtype==='shield'))){showToast('Drones aceitam lasers ou geradores de escudo');return;}const drone=progress.drones.find(d=>d.slots.some(v=>!v));if(!drone){showToast('Nenhum slot livre nos drones');return;}if(!removeInventory(itemId))return;drone.slots[drone.slots.findIndex(v=>!v)]=itemId;computeStats(true);saveGame();renderHangar();}
function unequipDroneSlot(droneId,index){const d=progress.drones.find(x=>x.id===droneId);if(!d||!d.slots[index])return;addInventory(d.slots[index]);d.slots[index]=null;computeStats(true);saveGame();renderHangar();}
function sellDrone(droneId){const d=progress.drones.find(x=>x.id===droneId);if(!d)return;d.slots.filter(Boolean).forEach(addInventory);progress.drones=progress.drones.filter(x=>x.id!==droneId);computeStats(true);saveGame();renderHangar();showToast('Drone removido; equipamentos voltaram ao inventário');}

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
function openShop(tab='ships'){state.shopTab=tab;renderShop();ui.shopModal.classList.remove('hidden');}
function openHangar(tab='ships'){state.hangarTab=tab;renderHangar();ui.hangarModal.classList.remove('hidden');}
function renderAll(){buildAmmoButtons();renderShop();renderHangar();updateUI();}

function worldPoint(ev){const r=canvas.getBoundingClientRect(),sx=ev.clientX-r.left,sy=ev.clientY-r.top;return{x:sx-W/2+state.camera.x,y:sy-H/2+state.camera.y};}
function pointerAction(ev){if(!progress||!ui.shopModal.classList.contains('hidden')||!ui.hangarModal.classList.contains('hidden')||!ui.factionModal.classList.contains('hidden'))return;const p=worldPoint(ev);const found=state.enemies.find(e=>e.hp>0&&Math.hypot(e.x-p.x,e.y-p.y)<=e.size+12);if(found){state.target=found;showToast(`Alvo: ${found.name}`);if(progress.flags.autoLaser&&hasExtra('autoLaserCpu'))player.laserFiring=true;}else{player.tx=Math.max(40,Math.min(state.currentMap.world.w-40,p.x));player.ty=Math.max(40,Math.min(state.currentMap.world.h-40,p.y));}}
canvas.addEventListener('pointerdown',pointerAction);
ui.laserToggle.onclick=()=>{if(!state.target||state.target.hp<=0){showToast('Selecione um alvo');return;}player.laserFiring=!player.laserFiring;};ui.rocketFire.onclick=()=>fireRocket(true);
ui.autoLaser.onchange=e=>{if(!hasExtra('autoLaserCpu')){e.target.checked=false;showToast('Equipe Auto Laser CPU no Hangar');return;}progress.flags.autoLaser=e.target.checked;saveGame();};
ui.autoRocket.onchange=e=>{if(!hasExtra('autoRocketCpu')){e.target.checked=false;showToast('Equipe Auto Rocket CPU no Hangar');return;}progress.flags.autoRocket=e.target.checked;saveGame();};
ui.turboRocket.onchange=e=>{if(!hasExtra('rocketTurboCpu')){e.target.checked=false;showToast('Equipe Rocket Turbo CPU no Hangar');return;}progress.flags.turboRocket=e.target.checked;saveGame();};
ui.shopBtn.onclick=()=>openShop();ui.closeShop.onclick=()=>ui.shopModal.classList.add('hidden');ui.hangarBtn.onclick=()=>openHangar();ui.closeHangar.onclick=()=>ui.hangarModal.classList.add('hidden');ui.shopModal.onclick=e=>{if(e.target===ui.shopModal)ui.shopModal.classList.add('hidden');};ui.hangarModal.onclick=e=>{if(e.target===ui.hangarModal)ui.hangarModal.classList.add('hidden');};
document.addEventListener('keydown',e=>{if(!progress||!ui.factionModal.classList.contains('hidden'))return;const tag=document.activeElement?.tagName;if(tag==='INPUT'||tag==='TEXTAREA')return;if(e.key==='Control'){e.preventDefault();if(state.target&&state.target.hp>0)player.laserFiring=!player.laserFiring;else showToast('Selecione um alvo');}if(e.code==='Space'){e.preventDefault();fireRocket(true);}if(e.key.toLowerCase()==='h')openHangar();if(e.key.toLowerCase()==='b')openShop();if(['1','2','3','4'].includes(e.key)){progress.selectedLaserAmmo=Object.keys(LASER_AMMO)[Number(e.key)-1];buildAmmoButtons();saveGame();}});

loadGame();
if(!progress){renderFactionChoice();}else{
  state.currentMap=MAPS[progress.mapId]||MAPS.x1;player.hp=progress.hp||1;player.shield=progress.shield||0;computeStats(true);player.hp=Math.min(player.maxHp,progress.hp??player.maxHp);player.shield=Math.min(player.maxShield,progress.shield??player.maxShield);setMap(progress.mapId||'x1',false);renderAll();
}
setInterval(()=>{if(progress)saveGame();},7000);
let last=performance.now();function loop(t){const dt=Math.min((t-last)/1000,.035);last=t;update(dt);draw();requestAnimationFrame(loop);}requestAnimationFrame(loop);
