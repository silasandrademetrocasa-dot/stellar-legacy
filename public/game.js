import { FACTIONS, SHIPS, ITEMS, LASER_AMMO, ROCKETS, NPC_TYPES, MAPS, RESOURCES } from './data.js?v=10.1.0';
import { V8_ASSETS } from './assets/v8/manifest.js?v=10.1.0';
import { signUp, signIn, restoreSession, signOutLocal, getUser, loadCloudSave, saveCloudSave } from './api.js?v=10.1.0';

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const minimap = document.querySelector('#minimap');
const mm = minimap.getContext('2d');
const $ = (s) => document.querySelector(s);

const V8_IMAGES = new Map();
function flattenAssetPaths(value,out=[]){
  if(!value)return out;
  if(typeof value==='string')out.push(value);
  else if(Array.isArray(value))value.forEach(v=>flattenAssetPaths(v,out));
  else if(typeof value==='object')Object.values(value).forEach(v=>flattenAssetPaths(v,out));
  return out;
}
function preloadV8Assets(){
  [...new Set(flattenAssetPaths(V8_ASSETS))].forEach(path=>{
    const img=new Image();
    img.decoding='async';
    img.src=path;
    img.onload=()=>V8_IMAGES.set(path,img);
    img.onerror=()=>console.warn('V8 asset não carregado:',path);
  });
}
function v8Image(path){return path ? V8_IMAGES.get(path) : null;}
function drawSprite(path,x,y,maxSize,rotation=0,alpha=1){
  const img=v8Image(path);
  if(!img||!img.naturalWidth)return false;
  const scale=maxSize/Math.max(img.naturalWidth,img.naturalHeight);
  const w=img.naturalWidth*scale,h=img.naturalHeight*scale;
  ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.globalAlpha=alpha;
  ctx.drawImage(img,-w/2,-h/2,w,h);ctx.restore();return true;
}
function assetForProduct(id,type,subtype){
  if(type==='ship')return V8_ASSETS.ships[id];
  if(type==='drone')return V8_ASSETS.drones[id];
  if(type==='pet')return V8_ASSETS.drones.pet;
  if(type==='ammo'||type==='rocket')return V8_ASSETS.ammo[id];
  if(V8_ASSETS.equipment[id])return V8_ASSETS.equipment[id];
  return null;
}
function factionAsset(id){return V8_ASSETS.branding[id]||V8_ASSETS.branding.earth;}
function currentMapBackground(){return progress ? (V8_ASSETS.backgrounds[progress.mapId]||V8_ASSETS.backgrounds.b42) : null;}
function drawMapBackground(){
  const img=v8Image(currentMapBackground());
  if(!img||!img.naturalWidth)return false;
  const world=state.currentMap?.world||{w:6000,h:4500};
  const nx=Math.max(0,Math.min(1,(state.camera?.x||0)/Math.max(1,world.w)));
  const ny=Math.max(0,Math.min(1,(state.camera?.y||0)/Math.max(1,world.h)));
  const viewAspect=W/Math.max(1,H),imgAspect=img.naturalWidth/img.naturalHeight;
  let sw=img.naturalWidth*.92,sh=img.naturalHeight*.92;
  if(sw/sh<viewAspect) sh=sw/viewAspect; else sw=sh*viewAspect;
  sw=Math.min(sw,img.naturalWidth);sh=Math.min(sh,img.naturalHeight);
  const sx=(img.naturalWidth-sw)*nx,sy=(img.naturalHeight-sh)*ny;
  ctx.save();ctx.globalAlpha=.34;
  ctx.drawImage(img,sx,sy,sw,sh,0,0,W,H);
  const shade=ctx.createLinearGradient(0,0,0,H);
  shade.addColorStop(0,'rgba(1,7,16,.16)');shade.addColorStop(.52,'rgba(1,6,14,.05)');shade.addColorStop(1,'rgba(1,5,12,.38)');
  ctx.fillStyle=shade;ctx.fillRect(0,0,W,H);
  const vignette=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.25,W/2,H/2,Math.max(W,H)*.72);
  vignette.addColorStop(0,'rgba(0,0,0,0)');vignette.addColorStop(1,'rgba(0,0,0,.25)');ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
  ctx.restore();return true;
}

let W = 0, H = 0, DPR = 1;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight;
  canvas.width = W * DPR; canvas.height = H * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
addEventListener('resize', resize); resize();

const ui = {
  topbar: $('#topbar'), topMeta: document.querySelector('#topbar .top-meta'), hudToggle: $('#hudToggle'), leftStats: $('#leftStats'), statsToggle: $('#statsToggle'), minimapPanel: $('#minimapPanel'), minimapToggle: $('#minimapToggle'), minimapHeader: $('#minimapHeader'), statsHeader: $('#statsHeader'), shipHudArt: $('#shipHudArt'), factionIcon: $('#factionIcon'), factionLabel: $('#factionLabel'), mapLabel: $('#mapLabel'), sectorName: $('#sectorName'), coordLabel: $('#coordLabel'), routeLabel: $('#routeLabel'), discoveriesLabel: $('#discoveriesLabel'), shipLabel: $('#shipLabel'), lvl: $('#lvl'),
  hp: $('#hp'), maxHp: $('#maxHp'), shield: $('#shield'), maxShield: $('#maxShield'), speed: $('#speed'), dmg: $('#dmg'), credits: $('#credits'), uridium: $('#uridium'), xp: $('#xp'), droneCount: $('#droneCount'),
  targetName: $('#targetName'), targetHpBar: $('#targetHpBar'), targetShieldBar: $('#targetShieldBar'), targetStats: $('#targetStats'),
  laserAmmoButtons: $('#laserAmmoButtons'), rocketAmmoButtons: $('#rocketAmmoButtons'), laserToggle: $('#laserToggle'), rocketFire: $('#rocketFire'), autoLaser: $('#autoLaser'), autoRocket: $('#autoRocket'), turboRocket: $('#turboRocket'), rocketCd: $('#rocketCd'), weaponBar: $('#weaponBar'), weaponBarContent: $('#weaponBarContent'), weaponBarToggle: $('#weaponBarToggle'),
  toast: $('#toast'), gameCelebration: $('#gameCelebration'), celebrationPanel: $('#celebrationPanel'), celebrationKicker: $('#celebrationKicker'), celebrationTitle: $('#celebrationTitle'), celebrationSubtitle: $('#celebrationSubtitle'), portalPrompt: $('#portalPrompt'), portalPromptMap: $('#portalPromptMap'), jumpTransition: $('#jumpTransition'), jumpTitle: $('#jumpTitle'), jumpSubtitle: $('#jumpSubtitle'), factionModal: $('#factionModal'), factionCards: $('#factionCards'),
  mapBtn: $('#mapBtn'), mapModal: $('#mapModal'), closeMap: $('#closeMap'), mapNetwork: $('#mapNetwork'),
  missionBtn: $('#missionBtn'), missionActiveCount: $('#missionActiveCount'), missionModal: $('#missionModal'), closeMission: $('#closeMission'), missionContent: $('#missionContent'),
  gateBtn: $('#gateBtn'), gatePieceBadge: $('#gatePieceBadge'), gateModal: $('#gateModal'), closeGate: $('#closeGate'), gatePiecesText: $('#gatePiecesText'), gateLivesText: $('#gateLivesText'), gateCompletedText: $('#gateCompletedText'), gatePieceGrid: $('#gatePieceGrid'), gateJumpBtn: $('#gateJumpBtn'), gateUriText: $('#gateUriText'), gateSpinButtons: $('#gateSpinButtons'), gateJumpBonus: $('#gateJumpBonus'), gateRepairBonus: $('#gateRepairBonus'), gateLogDisks: $('#gateLogDisks'), useRepairBonus: $('#useRepairBonus'), gateResultBox: $('#gateResultBox'), gateRoundsGrid: $('#gateRoundsGrid'), gateAlphaStatusTitle: $('#gateAlphaStatusTitle'), gateAlphaStatusText: $('#gateAlphaStatusText'), gateHud: $('#gateHud'), gateHudRound: $('#gateHudRound'), gateHudWave: $('#gateHudWave'), gateHudRemaining: $('#gateHudRemaining'), gateHudNext: $('#gateHudNext'), gateHudLives: $('#gateHudLives'),
  petBtn: $('#petBtn'), petModal: $('#petModal'), closePet: $('#closePet'), petContent: $('#petContent'),
  pilotBtn: $('#pilotBtn'), pilotPointBadge: $('#pilotPointBadge'), pilotModal: $('#pilotModal'), closePilot: $('#closePilot'), pilotLogDisks: $('#pilotLogDisks'), pilotPointsTotal: $('#pilotPointsTotal'), pilotPointsAvailable: $('#pilotPointsAvailable'), pilotPointsSpent: $('#pilotPointsSpent'), pilotNextPointTitle: $('#pilotNextPointTitle'), pilotNextPointCost: $('#pilotNextPointCost'), pilotConvertPoint: $('#pilotConvertPoint'), pilotLogBuyButtons: $('#pilotLogBuyButtons'), pilotResetCost: $('#pilotResetCost'), pilotResetBtn: $('#pilotResetBtn'), pilotSkillTree: $('#pilotSkillTree'),
  auctionBtn: $('#auctionBtn'), auctionTopClock: $('#auctionTopClock'), auctionModal: $('#auctionModal'), closeAuction: $('#closeAuction'), auctionClock: $('#auctionClock'), auctionCredits: $('#auctionCredits'), auctionEscrow: $('#auctionEscrow'), auctionGrid: $('#auctionGrid'), auctionHistory: $('#auctionHistory'),
  shopBtn: $('#shopBtn'), shopModal: $('#shopModal'), closeShop: $('#closeShop'), shopTabs: $('#shopTabs'), shopGrid: $('#shopGrid'), shopCredits: $('#shopCredits'), shopUridium: $('#shopUridium'),
  hangarBtn: $('#hangarBtn'), hangarModal: $('#hangarModal'), closeHangar: $('#closeHangar'), hangarTabs: $('#hangarTabs'), hangarContent: $('#hangarContent'), hangarShipName: $('#hangarShipName'),
  loginModal: $('#loginModal'), loginTabBtn: $('#loginTabBtn'), registerTabBtn: $('#registerTabBtn'), loginForm: $('#loginForm'), registerForm: $('#registerForm'), loginEmail: $('#loginEmail'), loginPassword: $('#loginPassword'), registerCallsign: $('#registerCallsign'), registerEmail: $('#registerEmail'), registerPassword: $('#registerPassword'), authMessage: $('#authMessage'), userLabel: $('#userLabel'), syncLabel: $('#syncLabel'), logoutBtn: $('#logoutBtn'), safeZoneLabel: $('#safeZoneLabel'), cargoUsed: $('#cargoUsed'), cargoMax: $('#cargoMax'), cargoBtn: $('#cargoBtn'), cargoModal: $('#cargoModal'), closeCargo: $('#closeCargo'), cargoSummary: $('#cargoSummary'), cargoGrid: $('#cargoGrid'), sellAllCargo: $('#sellAllCargo'),
};

const SAVE_KEY_PREFIX = 'stellarLegacyV5Save';
const SAFE_ZONE = { mapId: 'x1', x: 620, y: MAPS.x1.world.h / 2, radius: 520 };
let cloudDirty = false;
let cloudBusy = false;
let authenticated = false;
function saveKey(){return `${SAVE_KEY_PREFIX}:${getUser()?.id || 'guest'}`;}
const TWO_PI = Math.PI * 2;
const categories = {
  ships:'Naves', lasers:'Lasers', generators:'Geradores', drones:'Drones', pet:'P.E.T.', extras:'Extras', ammo:'Munição', rockets:'Mísseis'
};

// ===================== V10 PILOT BIO =====================
const PILOT_POINT_MAX=50;
const LOG_DISK_URI_PRICE=300;
const PILOT_BRANCHES={defense:{label:'DEFESA',className:'def'},utility:{label:'UTILIDADE',className:'util'},offense:{label:'ATAQUE',className:'off'}};
const PILOT_SKILLS={
  hull1:{id:'hull1',branch:'defense',name:'Casco I',max:2,values:[5000,10000],unit:' HP',creditBase:2000000,desc:'Aumenta o HP máximo da nave.',requires:null},
  engineering:{id:'engineering',branch:'defense',name:'Engenharia',max:5,values:[5,10,15,20,30],unit:'%',creditBase:3000000,desc:'Acelera a reparação automática.',requires:'hull1'},
  shieldEngineering:{id:'shieldEngineering',branch:'defense',name:'Engenharia de Escudo',max:5,values:[4,8,12,18,25],unit:'%',creditBase:5000000,desc:'Aumenta a força total dos escudos.',requires:'engineering'},
  evasive1:{id:'evasive1',branch:'defense',name:'Manobras Evasivas I',max:2,values:[2,4],unit:'%',creditBase:10000000,desc:'Chance de evitar completamente um ataque inimigo.',requires:'shieldEngineering'},
  hull2:{id:'hull2',branch:'defense',name:'Casco II',max:3,values:[5000,15000,40000],unit:' HP',creditBase:20000000,desc:'Complementa o Casco I para um casco muito maior.',requires:'evasive1'},
  shieldMechanics:{id:'shieldMechanics',branch:'defense',name:'Mecânica de Escudo',max:5,values:[2,4,6,8,12],unit:'%',creditBase:40000000,desc:'Aumenta a parcela de dano absorvida pelo escudo.',requires:'hull2'},
  evasive2:{id:'evasive2',branch:'defense',name:'Manobras Evasivas II',max:3,values:[2,4,8],unit:'%',creditBase:80000000,desc:'Amplia Manobras Evasivas até 12% no total.',requires:'shieldMechanics'},
  tactics:{id:'tactics',branch:'utility',name:'Táticas',max:5,values:[2,4,6,8,12],unit:'%',creditBase:2000000,desc:'Aumenta XP recebido ao destruir aliens.',requires:null},
  logistics:{id:'logistics',branch:'utility',name:'Logística',max:5,values:[4,8,12,16,25],unit:'%',creditBase:4000000,desc:'Expande a capacidade total do porão.',requires:'tactics'},
  luck1:{id:'luck1',branch:'utility',name:'Sorte I',max:2,values:[2,4],unit:'%',creditBase:10000000,desc:'Melhora recompensas raras no Materializador.',requires:'logistics'},
  cruelty1:{id:'cruelty1',branch:'utility',name:'Crueldade I',max:2,values:[4,8],unit:'%',creditBase:15000000,desc:'Aumenta Uridium recebido de aliens.',requires:'luck1'},
  tractor1:{id:'tractor1',branch:'utility',name:'Raio Trator I',max:2,values:[1,2],unit:'%',creditBase:20000000,desc:'Aumenta recursos em caixas de carga.',requires:'cruelty1'},
  greed:{id:'greed',branch:'utility',name:'Ganância',max:5,values:[4,8,12,18,25],unit:'%',creditBase:35000000,desc:'Aumenta Créditos recebidos de aliens.',requires:'tractor1'},
  tractor2:{id:'tractor2',branch:'utility',name:'Raio Trator II',max:3,values:[4,8,18],unit:'%',creditBase:60000000,desc:'Amplia o bônus de carga coletada.',requires:'greed'},
  cruelty2:{id:'cruelty2',branch:'utility',name:'Crueldade II',max:3,values:[4,10,17],unit:'%',creditBase:80000000,desc:'Amplia o bônus de Uridium até 25% no total.',requires:'tractor2'},
  luck2:{id:'luck2',branch:'utility',name:'Sorte II',max:3,values:[2,4,8],unit:'%',creditBase:100000000,desc:'Amplia Sorte do Materializador até 12%.',requires:'cruelty2'},
  detonation1:{id:'detonation1',branch:'offense',name:'Detonação I',max:2,values:[7,14],unit:'%',creditBase:2000000,desc:'Aumenta o dano explosivo do Kamikaze.',requires:null},
  explosives:{id:'explosives',branch:'offense',name:'Explosivos',max:5,values:[4,8,12,18,25],unit:'%',creditBase:4000000,desc:'Aumenta o raio do Kamikaze.',requires:'detonation1'},
  heatSeeking:{id:'heatSeeking',branch:'offense',name:'Mísseis Teleguiados',max:5,values:[1,2,4,6,10],unit:'%',creditBase:8000000,desc:'Aprimora eficiência ofensiva dos mísseis.',requires:'explosives'},
  bounty1:{id:'bounty1',branch:'offense',name:'Caçador I',max:2,values:[2,4],unit:'%',creditBase:15000000,desc:'Aumenta dano laser em mapas de batalha e Gates.',requires:'heatSeeking'},
  rocketFusion:{id:'rocketFusion',branch:'offense',name:'Fusão de Foguetes',max:5,values:[2,4,6,8,15],unit:'%',creditBase:25000000,desc:'Aumenta o dano dos mísseis.',requires:'bounty1'},
  alienHunter:{id:'alienHunter',branch:'offense',name:'Caçador de Aliens',max:5,values:[2,4,6,8,12],unit:'%',creditBase:40000000,desc:'Aumenta dano laser contra NPCs.',requires:'rocketFusion'},
  detonation2:{id:'detonation2',branch:'offense',name:'Detonação II',max:3,values:[7,14,36],unit:'%',creditBase:60000000,desc:'Amplia Detonação até 50% no total.',requires:'alienHunter'},
  electroOptics:{id:'electroOptics',branch:'offense',name:'Eletro-Óptica',max:5,values:[5,10,15,20,25],unit:'%',creditBase:80000000,desc:'Aprimora precisão e estabilidade dos lasers.',requires:'detonation2'},
  bounty2:{id:'bounty2',branch:'offense',name:'Caçador II',max:3,values:[2,4,8],unit:'%',creditBase:120000000,desc:'Amplia Caçador até 12% no total.',requires:'electroOptics'}
};
function freshPilotBio(){return {logDisks:0,totalPoints:0,skills:{},resetCount:0};}
function normalizePilotBio(){progress.pilotBio ||= freshPilotBio();const p=progress.pilotBio;p.logDisks=Math.max(0,Math.floor(Number(p.logDisks)||0));p.totalPoints=Math.max(0,Math.min(PILOT_POINT_MAX,Math.floor(Number(p.totalPoints)||0)));p.skills ||= {};p.resetCount=Math.max(0,Math.floor(Number(p.resetCount)||0));for(const [id,skill] of Object.entries(PILOT_SKILLS))p.skills[id]=Math.max(0,Math.min(skill.max,Math.floor(Number(p.skills[id])||0)));}
function pilotSkillLevel(id){return Number(progress?.pilotBio?.skills?.[id])||0;}
function pilotSkillValue(id){const skill=PILOT_SKILLS[id],lv=pilotSkillLevel(id);return !skill||lv<=0?0:Number(skill.values[Math.min(lv,skill.values.length)-1]||0);}
function pilotCombined(a,b){return pilotSkillValue(a)+pilotSkillValue(b);}
function pilotSpentPoints(){return Object.values(progress?.pilotBio?.skills||{}).reduce((a,b)=>a+(Number(b)||0),0);}
function pilotAvailablePoints(){return Math.max(0,(progress?.pilotBio?.totalPoints||0)-pilotSpentPoints());}
function pilotPointLogCost(pointNo){return Math.max(30,Math.round(30*Math.pow(1.1,Math.max(0,pointNo-1))));}
function pilotSkillCreditCost(skill,nextLevel){return Math.round(skill.creditBase*nextLevel);}
function pilotRequirementMet(skill){return !skill.requires||pilotSkillLevel(skill.requires)>=PILOT_SKILLS[skill.requires].max;}
function pilotRareChanceBonus(){return pilotCombined('luck1','luck2')/100;}function pilotLootBonus(){return pilotCombined('tractor1','tractor2')/100;}function pilotEvasion(){return Math.min(.35,pilotCombined('evasive1','evasive2')/100);}function pilotBattleLaserBonus(){return pilotCombined('bounty1','bounty2')/100;}function pilotKamikazeDamageBonus(){return pilotCombined('detonation1','detonation2')/100;}function pilotKamikazeRadiusBonus(){return pilotSkillValue('explosives')/100;}

// ===================== V10 HOURLY AUCTION =====================
function freshAuctionState(){return {hourKey:null,lots:{},history:[]};}
function auctionHourKey(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}-${String(d.getHours()).padStart(2,'0')}`;}
function auctionSecondsLeft(){const d=new Date(),next=new Date(d);next.setMinutes(60,0,0);return Math.max(0,Math.ceil((next-d)/1000));}
function auctionSeed(str){let h=2166136261>>>0;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function auctionRand(seed){let x=seed>>>0;return()=>{x=(Math.imul(1664525,x)+1013904223)>>>0;return x/4294967296;};}
function eliteAuctionCatalog(){const out=[];Object.values(SHIPS).filter(x=>x.currency==='uridium'&&!x.eventOnly&&x.shopAvailable!==false&&x.auctionEligible!==false).forEach(x=>out.push({ref:`ship:${x.id}`,kind:'ship',id:x.id,name:x.name,uri:x.price,qty:1}));Object.values(ITEMS).filter(x=>x.currency==='uridium'&&!x.eventOnly&&x.shopAvailable!==false&&x.auctionEligible!==false).forEach(x=>out.push({ref:`item:${x.id}`,kind:'item',id:x.id,name:x.name,uri:x.price,qty:1}));Object.values(LASER_AMMO).filter(x=>x.currency==='uridium').forEach(x=>out.push({ref:`ammo:${x.id}`,kind:'ammo',id:x.id,name:`${x.name} • pacote ${fmt(x.pack)}`,uri:x.price,qty:x.pack}));Object.values(ROCKETS).filter(x=>x.currency==='uridium').forEach(x=>out.push({ref:`rocket:${x.id}`,kind:'rocket',id:x.id,name:`${x.name} • pacote ${fmt(x.pack)}`,uri:x.price,qty:x.pack}));Object.values(PET_GEARS).filter(x=>x.currency==='uridium').forEach(x=>out.push({ref:`petGear:${x.id}`,kind:'petGear',id:x.id,name:`P.E.T. • ${x.name}`,uri:x.cost,qty:1}));return out;}
function buildAuctionLots(key){const lots={};for(const entry of eliteAuctionCatalog()){const rnd=auctionRand(auctionSeed(`${key}:${entry.ref}`)),reserve=Math.max(100000,Math.round(entry.uri*70*(.75+rnd()*.5)/100000)*100000),finalBid=Math.max(reserve+100000,Math.round(reserve*(1.25+rnd()*1.75)/100000)*100000);lots[entry.ref]={...entry,reserve,finalNpcBid:finalBid,userBid:0,escrow:0};}return lots;}
function auctionNpcBid(lot){const d=new Date(),fraction=(d.getMinutes()*60+d.getSeconds())/3600;return Math.max(100000,Math.round((lot.reserve+(lot.finalNpcBid-lot.reserve)*fraction)/100000)*100000);}
function auctionEscrow(){return Object.values(progress?.auction?.lots||{}).reduce((sum,l)=>sum+(Number(l.escrow)||0),0);}
function grantAuctionLot(lot){
  if(lot.kind==='ship'){if(progress.ownedShips.includes(lot.id))return false;progress.ownedShips.push(lot.id);return true;}
  if(lot.kind==='item'){const item=ITEMS[lot.id];if(item?.type==='drone'){if(progress.drones.length>=8)return false;progress.drones.push({id:`d_auc_${Date.now()}_${Math.random().toString(16).slice(2,5)}`,type:lot.id,slots:Array(item.slots).fill(null)});return true;}addInventory(lot.id);return true;}
  if(lot.kind==='ammo'){progress.ammo[lot.id]=(progress.ammo[lot.id]||0)+(LASER_AMMO[lot.id]?.pack||lot.qty||0);return true;}
  if(lot.kind==='rocket'){progress.rockets[lot.id]=(progress.rockets[lot.id]||0)+(ROCKETS[lot.id]?.pack||lot.qty||0);return true;}if(lot.kind==='petGear'){if(progress.pet.gearsOwned[lot.id])return false;progress.pet.gearsOwned[lot.id]=true;return true;}return false;
}
function settleAuction(){const a=progress.auction;if(!a?.lots)return;for(const lot of Object.values(a.lots)){if(!lot.userBid||!lot.escrow)continue;const won=lot.userBid>=lot.finalNpcBid;let granted=false;if(won)granted=grantAuctionLot(lot);if(!won||!granted)progress.profile.credits+=lot.escrow;a.history.unshift({at:Date.now(),name:lot.name,bid:lot.userBid,result:won&&granted?'VENCEU':won?'REEMBOLSADO':'PERDEU'});}a.history=a.history.slice(0,12);}
function ensureAuctionState(){progress.auction ||= freshAuctionState();const key=auctionHourKey();if(progress.auction.hourKey!==key){if(progress.auction.hourKey)settleAuction();progress.auction.hourKey=key;progress.auction.lots=buildAuctionLots(key);saveGame();}}

const PLAYER_MAX_LEVEL=44;
const PET_MAX_LEVEL=44;
const PET_SLOT_LEVEL_CAP=15;
const PET_BASE_PRICE=1500000;
function levelXpThreshold(level){
  if(level<=1)return 0;
  return Math.round(10000*Math.pow(2,level-2));
}
function levelProgressPercent(xp,level,maxLevel=PLAYER_MAX_LEVEL){
  if(level>=maxLevel)return 100;
  const base=levelXpThreshold(level),next=levelXpThreshold(level+1);
  return Math.max(0,Math.min(100,(xp-base)/Math.max(1,next-base)*100));
}
function levelFromXp(xp,maxLevel=PLAYER_MAX_LEVEL){
  let level=1;
  while(level<maxLevel&&xp>=levelXpThreshold(level+1))level++;
  return level;
}
const PET_GEARS = {
  guard: { id:'guard', name:'Modo Guardião', cost:150000, currency:'uridium', description:'Ataca automaticamente inimigos no alcance que estiverem causando dano à sua nave.' },
  box: { id:'box', name:'Coletor de BOX', cost:100000, currency:'uridium', description:'Busca cargo boxes próximas e vende automaticamente os recursos vendáveis. Xenomit é guardada.' },
  ore: { id:'ore', name:'Coletor de Pedras', cost:80000, currency:'uridium', description:'Busca e coleta automaticamente pedras/minérios soltos dentro do alcance do P.E.T.' },
  repair: { id:'repair', name:'Regenerador de Vida', cost:200000, currency:'uridium', description:'Segue a nave e regenera HP automaticamente quando você estiver danificado.' },
  kami: { id:'kami', name:'Kamikaze', cost:350000, currency:'uridium', description:'Investida explosiva contra alvos próximos, causando dano em área com recarga.' },
};
function freshPet(){
  return {
    owned:false, level:1, xp:0, xpModelV101:true,
    laserSlotsUnlocked:0, shieldSlotsUnlocked:0,
    lasers:[], shields:[],
    gearsOwned:{guard:false,box:false,ore:false,repair:false,kami:false},
    activeGear:'off'
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



const MISSION_CATEGORIES = {
  daily: { label: 'MISSÕES DIÁRIAS', accent: '#58d9ff', reset: 'daily' },
  weekly: { label: 'MISSÕES SEMANAIS', accent: '#8d7bff', reset: 'weekly' },
  monthly: { label: 'MISSÕES MENSAIS', accent: '#ffc65a', reset: 'monthly' },
  special: { label: 'MISSÕES ESPECIAIS', accent: '#ff668a', reset: 'special' },
};

const WEEKLY_STEPS = [10,25,50,100,150,200,250,500,750,1000];
const MONTHLY_STEPS = WEEKLY_STEPS.map(v=>v*10);
const MISSION_NPCS = Object.keys(NPC_TYPES);
const NORMAL_MISSION_NPCS = MISSION_NPCS.filter(id=>!id.startsWith('boss'));
const BOSS_MISSION_NPCS = MISSION_NPCS.filter(id=>id.startsWith('boss'));
const MISSION_ORES = ['Prometium','Endurium','Terbium'];

function missionPeriodKey(category,now=new Date()){
  const y=now.getFullYear(),m=String(now.getMonth()+1).padStart(2,'0'),d=String(now.getDate()).padStart(2,'0');
  if(category==='daily')return `${y}-${m}-${d}`;
  if(category==='monthly')return `${y}-${m}`;
  if(category==='weekly'){
    const copy=new Date(y,now.getMonth(),now.getDate());
    const day=copy.getDay()||7;copy.setDate(copy.getDate()-day+1);
    return `${copy.getFullYear()}-${String(copy.getMonth()+1).padStart(2,'0')}-${String(copy.getDate()).padStart(2,'0')}`;
  }
  return 'special-v9.6';
}
function hashStringSeed(str){
  let h=2166136261>>>0;
  for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}
  return h>>>0;
}
function seededRng(seed){
  let x=seed>>>0;
  return ()=>{x=(Math.imul(1664525,x)+1013904223)>>>0;return x/4294967296;};
}
function pickSeeded(list,rng,exclude=[]){
  const pool=list.filter(x=>!exclude.includes(x));
  return pool[Math.floor(rng()*pool.length)]||pool[0]||list[0];
}
function taskKill(npc,target,id=null){return {id:id||`kill_${npc}_${target}`,type:'kill',npc,target};}
function taskOre(resource,target,id=null){return {id:id||`ore_${resource}_${target}`,type:'ore',resource,target};}
function makeMission({id,title,desc,tasks,group='mix',sequence=false,rewardFactor=.5,tag=''}) {
  return {id,title,desc,tasks,group,sequence,rewardFactor,tag};
}
function buildDailyMissions(){
  const key=missionPeriodKey('daily'),rng=seededRng(hashStringSeed(`daily:${key}`));
  const huntNpc=pickSeeded(MISSION_NPCS,rng);
  const huntTarget=huntNpc.startsWith('boss')?50:100;
  const ore=pickSeeded(MISSION_ORES,rng);
  const n1=pickSeeded(NORMAL_MISSION_NPCS,rng);
  const n2=pickSeeded(NORMAL_MISSION_NPCS,rng,[n1]);
  const boss=pickSeeded(BOSS_MISSION_NPCS,rng);
  return [
    makeMission({
      id:'daily_hunt',
      title:`Caçada do Dia • ${NPC_TYPES[huntNpc].name}`,
      desc:`Alvo diário sorteado para hoje. Elimine somente ${NPC_TYPES[huntNpc].name}.`,
      tasks:[taskKill(huntNpc,huntTarget,'daily_hunt_target')],
      group:huntNpc.startsWith('boss')?'boss':'npc',rewardFactor:.5,tag:'DIÁRIA'
    }),
    makeMission({
      id:'daily_ore',
      title:`Mineração do Dia • ${RESOURCES[ore].name}`,
      desc:`Colete a pedra sorteada do dia. Somente ${RESOURCES[ore].name} conta.`,
      tasks:[taskOre(ore,500,'daily_ore_target')],
      group:'ore',rewardFactor:.5,tag:'DIÁRIA'
    }),
    makeMission({
      id:'daily_combo',
      title:'Operação Tripla do Dia',
      desc:`Missão conjunta diária: dois NPCs comuns + um BOSS sorteado.`,
      tasks:[
        taskKill(n1,50,'daily_combo_a'),
        taskKill(n2,50,'daily_combo_b'),
        taskKill(boss,10,'daily_combo_boss'),
      ],
      group:'mix',rewardFactor:.5,tag:'DIÁRIA'
    }),
  ];
}
function buildTierMissions(category,steps){
  const label=category==='weekly'?'Semanal':'Mensal';
  const missions=[];
  for(const npc of MISSION_NPCS){
    const boss=npc.startsWith('boss');
    steps.forEach((target,i)=>{
      missions.push(makeMission({
        id:`${category}_npc_${npc}_${target}`,
        title:`${label} • ${NPC_TYPES[npc].name} • ${target}`,
        desc:`Elimine exatamente ${target} ${NPC_TYPES[npc].name}.`,
        tasks:[taskKill(npc,target)],
        group:boss?'boss':'npc',rewardFactor:.5,
        tag:`${label.toUpperCase()} • NÍVEL ${i+1}`
      }));
    });
  }
  for(const ore of MISSION_ORES){
    steps.forEach((target,i)=>{
      missions.push(makeMission({
        id:`${category}_ore_${ore}_${target}`,
        title:`${label} • ${RESOURCES[ore].name} • ${target}`,
        desc:`Colete ${target} unidades de ${RESOURCES[ore].name}.`,
        tasks:[taskOre(ore,target)],
        group:'ore',rewardFactor:.5,
        tag:`${label.toUpperCase()} • NÍVEL ${i+1}`
      }));
    });
  }
  return missions;
}
function buildSpecialMissions(){
  const missions=[];
  // 1 missão de cada NPC, sempre 10 eliminações, pagamento de 100% da soma dos alvos.
  for(const npc of MISSION_NPCS){
    missions.push(makeMission({
      id:`special_npc_${npc}`,
      title:`Contrato Especial • ${NPC_TYPES[npc].name}`,
      desc:`Contrato direto: elimine 10 ${NPC_TYPES[npc].name}.`,
      tasks:[taskKill(npc,10)],
      group:npc.startsWith('boss')?'boss':'npc',rewardFactor:1,
      tag:'CONTRATO 100%'
    }));
  }
  // 1 missão de cada pedra.
  for(const ore of MISSION_ORES){
    missions.push(makeMission({
      id:`special_ore_${ore}`,
      title:`Contrato Mineral • ${RESOURCES[ore].name}`,
      desc:`Colete 250 unidades de ${RESOURCES[ore].name}.`,
      tasks:[taskOre(ore,250)],
      group:'ore',rewardFactor:1,tag:'MINERAÇÃO 100%'
    }));
  }

  const npcMixes=[
    ['special_mix_npc_1','Trinca de Fronteira',false,[['streuner',10],['lordakia',10],['saimon',5]]],
    ['special_mix_npc_2','Escalada de Patrulha',true,[['recruitStreuner',15],['aiderStreuner',10],['mordon',5]]],
    ['special_mix_npc_3','Rota de Caça',false,[['lordakia',20],['saimon',10],['devolarium',3]]],
    ['special_mix_npc_4','Linha de Ataque',true,[['streuner',25],['mordon',10],['sibelon',3]]],
    ['special_mix_npc_5','Operação Veterana',false,[['aiderStreuner',20],['devolarium',5],['sibelon',2]]],
  ];
  npcMixes.forEach(([id,title,sequence,defs])=>missions.push(makeMission({
    id,title,sequence,group:'mix',rewardFactor:1,tag:sequence?'SEQUENCIAL':'MULTIALVO',
    desc:sequence?'Conclua cada alvo na ordem para liberar a próxima etapa.':'Todos os alvos podem ser concluídos em qualquer ordem.',
    tasks:defs.map(([npc,target],i)=>taskKill(npc,target,`${id}_t${i+1}`))
  })));

  const bossSingles=[
    ['bossLordakia',10],['bossSaimon',10],['bossMordon',10],['bossDevolarium',10],['bossSibelon',10]
  ];
  bossSingles.forEach(([npc,target],i)=>missions.push(makeMission({
    id:`special_boss_contract_${i+1}`,title:`Caçada BOSS ${i+1} • ${NPC_TYPES[npc].name}`,
    desc:`Contrato pesado contra ${NPC_TYPES[npc].name}.`,
    tasks:[taskKill(npc,target)],group:'boss',rewardFactor:1,tag:'BOSS 100%'
  })));

  const bossMixes=[
    ['special_boss_mix_1','Tríade BOSS I',false,[['bossStreuner',10],['bossLordakia',8],['bossSaimon',6]]],
    ['special_boss_mix_2','Tríade BOSS II',true,[['bossLordakia',10],['bossSaimon',8],['bossMordon',5]]],
    ['special_boss_mix_3','Tríade BOSS III',false,[['bossSaimon',10],['bossMordon',8],['bossDevolarium',4]]],
    ['special_boss_mix_4','Tríade BOSS IV',true,[['bossMordon',8],['bossDevolarium',5],['bossSibelon',3]]],
    ['special_boss_mix_5','Tríade BOSS V',false,[['bossStreuner',20],['bossDevolarium',4],['bossSibelon',2]]],
  ];
  bossMixes.forEach(([id,title,sequence,defs])=>missions.push(makeMission({
    id,title,sequence,group:'boss',rewardFactor:1,tag:sequence?'BOSS SEQUENCIAL':'BOSS MISTO',
    desc:sequence?'Derrube cada grupo BOSS na ordem marcada.':'Elimine os três grupos BOSS em qualquer ordem.',
    tasks:defs.map(([npc,target],i)=>taskKill(npc,target,`${id}_t${i+1}`))
  })));

  const hybrids=[
    ['special_hybrid_1','Ferro e Cristal I',false,[taskKill('streuner',20,'h1a'),taskOre('Prometium',100,'h1b')]],
    ['special_hybrid_2','Ferro e Cristal II',true,[taskKill('lordakia',20,'h2a'),taskOre('Endurium',100,'h2b')]],
    ['special_hybrid_3','Ferro e Cristal III',false,[taskKill('mordon',10,'h3a'),taskOre('Terbium',100,'h3b')]],
    ['special_hybrid_4','Ferro e Cristal IV',true,[taskKill('saimon',15,'h4a'),taskOre('Prometium',150,'h4b'),taskOre('Endurium',150,'h4c')]],
    ['special_hybrid_5','Ferro e Cristal V',false,[taskKill('devolarium',5,'h5a'),taskOre('Endurium',200,'h5b'),taskOre('Terbium',150,'h5c')]],
    ['special_hybrid_6','Ferro e Cristal VI',true,[taskKill('sibelon',3,'h6a'),taskOre('Prometium',250,'h6b'),taskOre('Terbium',250,'h6c')]],
  ];
  hybrids.forEach(([id,title,sequence,tasks])=>missions.push(makeMission({
    id,title,sequence,tasks,group:'hybrid',rewardFactor:1,
    tag:sequence?'HÍBRIDA SEQUENCIAL':'HÍBRIDA',
    desc:sequence?'Complete combate e mineração na ordem para liberar a próxima tarefa.':'Combate e mineração podem avançar ao mesmo tempo.'
  })));
  return missions;
}

let CACHED_WEEKLY_MISSIONS=null,CACHED_MONTHLY_MISSIONS=null,CACHED_SPECIAL_MISSIONS=null;
function getMissionLibrary(category){
  if(category==='daily')return buildDailyMissions();
  if(category==='weekly')return CACHED_WEEKLY_MISSIONS ||= buildTierMissions('weekly',WEEKLY_STEPS);
  if(category==='monthly')return CACHED_MONTHLY_MISSIONS ||= buildTierMissions('monthly',MONTHLY_STEPS);
  if(category==='special')return CACHED_SPECIAL_MISSIONS ||= buildSpecialMissions();
  return [];
}
function missionById(category,id){return getMissionLibrary(category).find(m=>m.id===id)||null;}
function freshMissions(){return {active:{daily:null,weekly:null,monthly:null,special:null},completed:{}};}
function missionInstanceKey(category,id){return `${category}:${missionPeriodKey(category)}:${id}`;}
function missionCompleted(category,id){return !!progress?.missions?.completed?.[missionInstanceKey(category,id)];}
function missionUnlocked(){return true;}

function normalizeMissionState(){
  if(!progress)return;
  progress.missions ||= freshMissions();
  progress.missions.active ||= {daily:null,weekly:null,monthly:null,special:null};
  progress.missions.completed ||= {};
  for(const category of Object.keys(MISSION_CATEGORIES)){
    if(progress.missions.active[category]===undefined)progress.missions.active[category]=null;
    const active=progress.missions.active[category];
    if(active && (active.period!==missionPeriodKey(category) || !missionById(category,active.id))){
      progress.missions.active[category]=null;
      continue;
    }
    if(active){
      const mission=missionById(category,active.id);
      active.taskProgress ||= {};
      // Migração de saves com missão antiga de uma tarefa.
      if(mission?.tasks?.length===1 && active.progress && active.taskProgress[mission.tasks[0].id]===undefined){
        active.taskProgress[mission.tasks[0].id]=Number(active.progress)||0;
      }
      active.bonus ||= {credits:0,uridium:0,xp:0};
      active.bonus.credits=Number(active.bonus.credits)||0;
      active.bonus.uridium=Number(active.bonus.uridium)||0;
      active.bonus.xp=Number(active.bonus.xp)||0;
      active.complete=mission ? mission.tasks.every(t=>(Number(active.taskProgress[t.id])||0)>=t.target) : false;
    }
  }
}
function npcKillReward(enemy){
  if(!enemy)return {credits:0,uridium:0,xp:0};
  return {
    credits:Math.max(0,Number(enemy.credits)||0),
    uridium:Math.max(0,Number(enemy.uridium)||0),
    xp:Math.max(0,Math.round(Number(enemy.xp) || ((Number(enemy.credits)||0)/10+(Number(enemy.uridium)||0)*12))),
  };
}
function missionFactor(mission){return Math.max(0,Number(mission?.rewardFactor ?? .5));}
function addMissionReward(active,mission,kind,payload,units=1){
  active.bonus ||= {credits:0,uridium:0,xp:0};
  const factor=missionFactor(mission);
  if(kind==='kill'){
    const r=npcKillReward(payload.enemy);
    active.bonus.credits+=(r.credits*factor)*units;
    active.bonus.uridium+=(r.uridium*factor)*units;
    active.bonus.xp+=(r.xp*factor)*units;
  }else if(kind==='ore'){
    const ore=RESOURCES[payload.type];
    active.bonus.credits+=((ore?.sell||0)*factor)*units;
  }
}
function roundedMissionBonus(active){
  const b=active?.bonus||{};
  return {
    credits:Math.max(0,Math.round(Number(b.credits)||0)),
    uridium:Math.max(0,Math.round(Number(b.uridium)||0)),
    xp:Math.max(0,Math.round(Number(b.xp)||0)),
  };
}
function projectedMissionReward(mission){
  const factor=missionFactor(mission),r={credits:0,uridium:0,xp:0};
  for(const task of mission.tasks||[]){
    if(task.type==='kill'){
      const npc=NPC_TYPES[task.npc];if(!npc)continue;
      const one=npcKillReward(npc);
      r.credits+=one.credits*task.target*factor;
      r.uridium+=one.uridium*task.target*factor;
      r.xp+=one.xp*task.target*factor;
    }else if(task.type==='ore'){
      r.credits+=(RESOURCES[task.resource]?.sell||0)*task.target*factor;
    }
  }
  return {credits:Math.round(r.credits),uridium:Math.round(r.uridium),xp:Math.round(r.xp)};
}
function missionRewardText(mission,active=null){
  const r=active?roundedMissionBonus(active):projectedMissionReward(mission);
  return `${fmt(r.credits)} CR • ${fmt(r.uridium)} URI • ${fmt(r.xp)} XP`;
}
function taskLabel(task){
  if(task.type==='kill')return `${NPC_TYPES[task.npc]?.name||task.npc}`;
  if(task.type==='ore')return `${RESOURCES[task.resource]?.name||task.resource}`;
  return 'Tarefa';
}
function taskCurrent(active,task){return Math.min(task.target,Math.max(0,Number(active?.taskProgress?.[task.id])||0));}
function taskDone(active,task){return taskCurrent(active,task)>=task.target;}
function taskUnlocked(mission,active,index){
  if(!mission.sequence)return true;
  for(let i=0;i<index;i++)if(!taskDone(active,mission.tasks[i]))return false;
  return true;
}
function missionTasksHtml(mission,active,isActive){
  return `<div class="mission-task-list">${mission.tasks.map((task,index)=>{
    const current=isActive?taskCurrent(active,task):0,done=isActive&&taskDone(active,task),unlocked=!isActive||taskUnlocked(mission,active,index);
    const pct=isActive?Math.max(0,Math.min(100,current/task.target*100)):0;
    const icon=task.type==='kill'?'☠':'◆';
    return `<div class="mission-task${done?' done':''}${!unlocked?' task-locked':''}">
      <div class="mission-task-head"><span>${!unlocked?'🔒':icon} ${taskLabel(task)}</span><b>${isActive?`${fmt(current)} / `:''}${fmt(task.target)}</b></div>
      ${isActive?`<div class="mission-task-progress"><i style="width:${pct}%"></i></div>`:''}
    </div>`;
  }).join('')}</div>`;
}
function missionProgressPercent(mission,active){
  if(!active)return 0;
  const total=(mission.tasks||[]).reduce((a,t)=>a+t.target,0)||1;
  const current=(mission.tasks||[]).reduce((a,t)=>a+taskCurrent(active,t),0);
  return Math.round(Math.max(0,Math.min(100,current/total*100)));
}
function updateMissionButton(){
  if(!ui.missionBtn||!progress)return;
  normalizeMissionState();
  const active=Object.values(progress.missions.active).filter(Boolean).length;
  if(ui.missionActiveCount)ui.missionActiveCount.textContent=active;
  ui.missionBtn.classList.toggle('mission-active',active>0);
}
function acceptMission(category,id){
  normalizeMissionState();
  if(progress.missions.active[category]){showToast('Você já tem uma missão ativa nessa categoria');return;}
  const mission=missionById(category,id);if(!mission)return;
  const key=missionInstanceKey(category,id);
  if(progress.missions.completed[key]){showToast('Essa missão já foi concluída neste ciclo');return;}
  progress.missions.active[category]={
    id,period:missionPeriodKey(category),complete:false,acceptedAt:Date.now(),
    taskProgress:{},bonus:{credits:0,uridium:0,xp:0}
  };
  saveGame();renderMissions();updateMissionButton();showToast(`${mission.title} aceita — progresso iniciado`);
}
function abandonMission(category){
  normalizeMissionState();const active=progress.missions.active[category];if(!active)return;
  const mission=missionById(category,active.id);progress.missions.active[category]=null;
  saveGame();renderMissions();updateMissionButton();showToast(`${mission?.title||'Missão'} abandonada`);
}
const MISSION_ITEM_REWARD_POOLS={
  commonGear:['lf1','mp1','lf2','sg3na02','sg3na03','fs01','fs02'],
  eliteGear:['lf3','sg3nb02'],
  jackpotGear:['lf4'],
  ammo:[
    {kind:'ammo',id:'mcb25',qty:2500,label:'2.500 MCB-25'},
    {kind:'ammo',id:'mcb50',qty:1500,label:'1.500 MCB-50'},
    {kind:'ammo',id:'ucb100',qty:750,label:'750 UCB-100'},
    {kind:'ammo',id:'sab50',qty:1000,label:'1.000 SAB-50'},
    {kind:'rocket',id:'plt2021',qty:50,label:'50 PLT-2021'},
    {kind:'rocket',id:'plt3030',qty:30,label:'30 PLT-3030'},
  ]
};
function missionItemChance(category){
  return ({daily:.28,weekly:.46,monthly:.72,special:.82})[category]??.3;
}
function grantMissionSurprise(category){
  if(Math.random()>missionItemChance(category))return null;
  const r=Math.random();
  if(r<.55){
    const reward=randomChoice(MISSION_ITEM_REWARD_POOLS.ammo);
    if(reward.kind==='ammo')progress.ammo[reward.id]=(progress.ammo[reward.id]||0)+reward.qty;
    else progress.rockets[reward.id]=(progress.rockets[reward.id]||0)+reward.qty;
    return reward.label;
  }
  let pool=MISSION_ITEM_REWARD_POOLS.commonGear;
  if(category==='monthly'||category==='special'){
    if(r>.96)pool=MISSION_ITEM_REWARD_POOLS.jackpotGear;
    else if(r>.75)pool=MISSION_ITEM_REWARD_POOLS.eliteGear;
  }else if(category==='weekly'&&r>.90)pool=MISSION_ITEM_REWARD_POOLS.eliteGear;
  const id=randomChoice(pool),item=ITEMS[id];if(!item)return null;
  addInventory(id);return item.name;
}
function missionRewardItemHint(category){
  return `Chance bônus: ${Math.round(missionItemChance(category)*100)}% de munição/equipamento`;
}
function finishMissionAutomatically(category,mission,active){
  if(!mission||!active)return;
  const bonus=roundedMissionBonus(active);
  progress.profile.credits+=bonus.credits;progress.profile.uridium+=bonus.uridium;progress.profile.xp+=bonus.xp;
  const surprise=grantMissionSurprise(category);
  if(surprise)bonus.itemText=`BÔNUS: ${surprise}`;
  progress.missions.completed[missionInstanceKey(category,mission.id)]=Date.now();
  progress.missions.active[category]=null;
  showMissionCompleteAnimation(mission,bonus);processPlayerLevelUps();
  showToast(`Recompensa automática • ${mission.title}${surprise?` • ${surprise}`:''}`);
  saveGame();updateMissionButton();updateUI();
  if(ui.missionModal&&!ui.missionModal.classList.contains('hidden'))renderMissions();
}
function claimMission(category){normalizeMissionState();const active=progress.missions.active[category];if(!active||!active.complete)return;finishMissionAutomatically(category,missionById(category,active.id),active);}
function missionEvent(type,payload={}){if(!progress)return;normalizeMissionState();let anyChanged=false;const finished=[];for(const category of Object.keys(MISSION_CATEGORIES)){const active=progress.missions.active[category];if(!active||active.complete)continue;const mission=missionById(category,active.id);if(!mission)continue;let categoryChanged=false;let eventAmount=type==='collectOre'?Math.max(0,Number(payload.amount)||0):1;if(eventAmount<=0)continue;for(let i=0;i<mission.tasks.length;i++){const task=mission.tasks[i];if(!taskUnlocked(mission,active,i))continue;const current=taskCurrent(active,task),remaining=Math.max(0,task.target-current);if(!remaining)continue;let matches=false;if(type==='kill'&&task.type==='kill'&&payload.enemy?.type===task.npc)matches=true;if(type==='collectOre'&&task.type==='ore'&&payload.type===task.resource)matches=true;if(!matches)continue;const add=Math.min(remaining,type==='kill'?1:eventAmount);if(add<=0)continue;active.taskProgress[task.id]=current+add;addMissionReward(active,mission,task.type==='kill'?'kill':'ore',payload,add);categoryChanged=true;anyChanged=true;if(mission.sequence)break;if(type==='kill')break;}if(categoryChanged){active.complete=mission.tasks.every(x=>taskDone(active,x));if(active.complete)finished.push({category,mission,active});}}for(const item of finished)finishMissionAutomatically(item.category,item.mission,item.active);if(anyChanged&&!finished.length){saveGame();updateMissionButton();if(ui.missionModal&&!ui.missionModal.classList.contains('hidden'))renderMissions();}}
function missionGroupLabel(group){
  return group==='npc'?'NPC':group==='boss'?'BOSS':group==='ore'?'PEDRAS':group==='hybrid'?'NPC + PEDRA':'MISTAS';
}
function missionSeriesKey(mission){if(!mission?.tasks?.length)return mission?.id||'';if(mission.tasks.length!==1)return `unique:${mission.id}`;const task=mission.tasks[0];if(task.type==='kill')return `kill:${task.npc}`;if(task.type==='ore')return `ore:${task.resource}`;return `unique:${mission.id}`;}
function visibleMissionCatalog(category,missions){const pending=missions.filter(m=>!missionCompleted(category,m.id));if(category!=='weekly'&&category!=='monthly')return pending;const bySeries=new Map();for(const mission of pending){const key=missionSeriesKey(mission);if(!bySeries.has(key))bySeries.set(key,[]);bySeries.get(key).push(mission);}const visible=[];const active=progress.missions.active[category];for(const list of bySeries.values()){list.sort((a,b)=>(a.tasks?.[0]?.target||0)-(b.tasks?.[0]?.target||0));const activeMission=active?list.find(m=>m.id===active.id):null;visible.push(activeMission||list[0]);}return visible;}

function renderMissionFilter(section,category,grid,missions){
  if(missions.length<=12)return;
  const tools=document.createElement('div');tools.className='mission-catalog-tools';
  tools.innerHTML=`<input class="mission-search" type="search" placeholder="Buscar missão, NPC ou pedra..." aria-label="Buscar missão">
  <select class="mission-group-filter" aria-label="Filtrar missões">
    <option value="all">TODAS</option>
    <option value="npc">NPC</option>
    <option value="boss">BOSS</option>
    <option value="ore">PEDRAS</option>
    <option value="mix">MISTAS</option>
    <option value="hybrid">NPC + PEDRA</option>
  </select>`;
  const apply=()=>{
    const q=tools.querySelector('.mission-search').value.trim().toLowerCase();
    const group=tools.querySelector('.mission-group-filter').value;
    [...grid.children].forEach(card=>{
      const okGroup=group==='all'||card.dataset.group===group;
      const okText=!q||card.dataset.search.includes(q);
      card.classList.toggle('catalog-hidden',!(okGroup&&okText));
    });
  };
  tools.querySelector('.mission-search').addEventListener('input',apply);
  tools.querySelector('.mission-group-filter').addEventListener('change',apply);
  section.appendChild(tools);
}
function renderMissions(){
  if(!ui.missionContent||!progress)return;
  normalizeMissionState();ui.missionContent.innerHTML='';
  for(const [category,meta] of Object.entries(MISSION_CATEGORIES)){
    const allMissions=getMissionLibrary(category);const missions=visibleMissionCatalog(category,allMissions);
    const section=document.createElement('section');section.className='mission-category';section.style.setProperty('--mission-accent',meta.accent);
    const active=progress.missions.active[category];
    section.innerHTML=`<div class="mission-category-head"><div><div class="eyebrow">${meta.label}</div><h3>${active?'1 missão ativa':`${missions.length} contratos disponíveis agora`}</h3></div><span class="mission-slot-badge">${active?'ATIVA':'LIVRE'}</span></div>`;
    const grid=document.createElement('div');grid.className='mission-grid';
    renderMissionFilter(section,category,grid,missions);
    for(const mission of missions){
      const isActive=active?.id===mission.id,done=missionCompleted(category,mission.id),slotLocked=!!active&&!isActive,locked=slotLocked;if(done)continue;
      const pct=isActive?missionProgressPercent(mission,active):0;
      const card=document.createElement('article');card.className=`mission-card${isActive?' active':''}${done?' completed':''}${locked?' locked':''}`;
      card.dataset.group=mission.group||'mix';
      card.dataset.search=`${mission.title} ${mission.desc} ${(mission.tasks||[]).map(taskLabel).join(' ')}`.toLowerCase();
      const factor=Math.round(missionFactor(mission)*100);
      card.innerHTML=`<div class="mission-card-top"><div><span class="mission-type-chip">${mission.tag||missionGroupLabel(mission.group)}</span><h4>${mission.title}</h4></div></div>
        <p>${mission.desc}</p>
        ${mission.sequence?'<div class="mission-sequence-badge">SEQUENCIAL • complete uma etapa para liberar a próxima</div>':''}
        ${missionTasksHtml(mission,active,isActive)}
        ${isActive?`<div class="mission-progress-row"><span>PROGRESSO TOTAL</span><b>${pct}%</b></div><div class="mission-progress"><i style="width:${pct}%"></i></div>`:''}
        <div class="mission-reward"><span>${isActive?`BÔNUS ACUMULADO • ${factor}%`:`RECOMPENSA ESTIMADA • ${factor}%`}</span><b>${missionRewardText(mission,isActive?active:null)}</b><small>${missionRewardItemHint(category)}</small></div>`;
      const actions=document.createElement('div');actions.className='mission-actions';
      if(isActive){
        const primary=document.createElement('button');primary.className='small-btn';primary.textContent='EM ANDAMENTO';primary.disabled=true;actions.appendChild(primary);
        const abandon=document.createElement('button');abandon.className='ghost-btn';abandon.textContent='ABANDONAR';abandon.onclick=()=>abandonMission(category);actions.appendChild(abandon);
      }else{
        const b=document.createElement('button');b.className='small-btn';b.disabled=locked;b.textContent=slotLocked?'OUTRA ATIVA':'ACEITAR';
        b.onclick=()=>acceptMission(category,mission.id);actions.appendChild(b);
      }
      card.appendChild(actions);grid.appendChild(card);
    }
    section.appendChild(grid);ui.missionContent.appendChild(section);
  }
  updateMissionButton();
}
function openMissions(){normalizeMissionState();renderMissions();ui.missionModal.classList.remove('hidden');}



const GALAXY_ALPHA_PIECES = 34;
const GALAXY_ALPHA_SPIN_COST = 100;
const GALAXY_ALPHA_WAVE_INTERVAL_MS = 10000;
const GALAXY_ALPHA_ROUND_INTERVAL_MS = 10000;
const GALAXY_ALPHA_ROUNDS = [
  {round:1,name:'Streuner',waves:[{type:'streuner',count:10},{type:'streuner',count:10},{type:'streuner',count:10},{type:'streuner',count:10}]},
  {round:2,name:'Lordakia',waves:[{type:'lordakia',count:10},{type:'lordakia',count:10},{type:'lordakia',count:10},{type:'lordakia',count:10}]},
  {round:3,name:'Saimon',waves:[{type:'saimon',count:10},{type:'saimon',count:10},{type:'saimon',count:10},{type:'saimon',count:10}]},
  {round:4,name:'Mordon',waves:[{type:'mordon',count:10},{type:'mordon',count:10},{type:'mordon',count:10},{type:'mordon',count:10}]},
  {round:5,name:'BOSS Quartet',waves:[{type:'bossStreuner',count:10},{type:'bossLordakia',count:10},{type:'bossSaimon',count:10},{type:'bossMordon',count:10}]},
  {round:6,name:'Devolarium',waves:[{type:'devolarium',count:5},{type:'devolarium',count:5},{type:'devolarium',count:5},{type:'devolarium',count:5}]},
  {round:7,name:'Boss Devolarium',waves:[{type:'bossDevolarium',count:5},{type:'bossDevolarium',count:5}]},
  {round:8,name:'Sibelon Finale',waves:[{type:'sibelon',count:10},{type:'sibelon',count:10},{type:'bossSibelon',count:10},{type:'bossSibelon',count:5}]},
];
function freshGalaxyGateState(){
  return {
    jumpBonus:0,repairBonus:0,lastResults:[],
    alpha:{
      pieces:[],built:false,lives:3,completed:0,failed:0,
      run:null,lastCompletion:null,
    }
  };
}
function normalizeGalaxyGateState(){
  if(!progress)return;
  progress.galaxyGate ||= freshGalaxyGateState();
  progress.galaxyGate.jumpBonus=Math.max(0,Number(progress.galaxyGate.jumpBonus)||0);
  progress.galaxyGate.repairBonus=Math.max(0,Number(progress.galaxyGate.repairBonus)||0);
  progress.galaxyGate.lastResults ||= [];
  progress.galaxyGate.alpha ||= freshGalaxyGateState().alpha;
  const a=progress.galaxyGate.alpha;
  a.pieces=Array.isArray(a.pieces)?[...new Set(a.pieces.map(Number).filter(n=>n>=1&&n<=GALAXY_ALPHA_PIECES))]:[];
  a.built=!!a.built||a.pieces.length>=GALAXY_ALPHA_PIECES;
  a.lives=Math.max(0,Math.min(3,Number(a.lives)||3));
  a.completed=Math.max(0,Number(a.completed)||0);
  a.failed=Math.max(0,Number(a.failed)||0);
  if(a.run){
    a.run.round=Math.max(1,Math.min(8,Number(a.run.round)||1));
    a.run.waveIndex=Math.max(0,Number(a.run.waveIndex)||0);
    a.run.remaining ||= {};
    a.run.killRewards ||= {credits:0,uridium:0,xp:0};
    a.run.nextWaveAt=Number(a.run.nextWaveAt)||0;
    a.run.nextRoundAt=Number(a.run.nextRoundAt)||0;
    a.run.active=a.run.active!==false;
  }
}
function alphaGate(){normalizeGalaxyGateState();return progress.galaxyGate.alpha;}
function isGalaxyGateMap(){return progress?.mapId==='ggAlpha';}
function alphaRoundDef(){const a=alphaGate();return GALAXY_ALPHA_ROUNDS[a.run?.round-1]||GALAXY_ALPHA_ROUNDS[0];}
function alphaWaveDef(){const a=alphaGate(),r=alphaRoundDef();return r.waves[Math.max(0,(a.run?.waveIndex||0)-1)]||r.waves[0];}
function alphaRemainingCount(){return state.enemies.filter(e=>e.hp>0&&e.gateEnemy).length;}
function alphaRunReward(){
  const a=alphaGate(),r=a.run?.killRewards||{};
  return {credits:Math.round(r.credits||0),uridium:Math.round(r.uridium||0),xp:Math.round(r.xp||0)};
}

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
    profile: { callsign:getUser()?.callsign || getUser()?.email?.split('@')[0] || 'Pilot', faction:factionId, level:1, xp:0, xpModelV101:true, credits:20000, uridium:0 },
    activeShipId: 'phoenix',
    ownedShips: ['phoenix'],
    shipLoadout: loadout,
    inventory: {},
    drones: [],
    ammo: { lcb10:10000, mcb25:0, mcb50:0, ucb100:0, sab50:0 },
    rockets: { r310: 100, plt2026: 0, plt2021: 0, plt3030: 0 },
    selectedLaserAmmo: 'lcb10',
    selectedRocket: 'r310',
    mapId: 'x1',
    x: SAFE_ZONE.x, y: SAFE_ZONE.y,
    hp: SHIPS.phoenix.hp,
    shield: 1000,
    flags: { autoLaser: false, autoRocket: false, turboRocket: false },
    cargo: {},
    discoveries: {},
    missions: freshMissions(),
    pilotBio: freshPilotBio(),
    auction: freshAuctionState(),
    galaxyGate: freshGalaxyGateState(),
    pet: freshPet(),
    expeditionV9: 1,
  };
}

let progress = null;
const player = {
  x: 620, y: MAPS.x1.world.h/2, tx: 620, ty: MAPS.x1.world.h/2,
  hp:1,maxHp:1,shield:0,maxShield:0,speed:320,laserDamage:0,shieldAbsorption:0,
  angle:0,laserFiring:false,lastLaserShot:0,lastRocketShot:-999,
};
const petRuntime = {
  x: 410, y: 930, tx: 410, ty: 930,
  lastShot: -999, laserTargetId: null, laserUntil: 0,
  taskType: 'follow', taskId: null
};
const state = {
  currentMap: MAPS.x1, camera: { x: 620, y: MAPS.x1.world.h/2 }, target: null, enemies: [], loot: [], ores: [], particles: [], fx: [], rocketFx: [], landmarks: [], enemyRespawns: [], oreRespawns: [], lastPortalAt: 0, radarRange: 1500, jumping: false,
  lastPlayerDamageAt:nowSec(), repairFxAt:0,
  pointerNavActive:false, pointerNavId:null,
  shopTab: 'ships', hangarTab: 'ships', toastTimer: null, ammoUiExpanded: true, statsUiExpanded: true, minimapUiExpanded: true, topMetaExpanded: true,
  stars: Array.from({length:240},()=>({x:Math.random()*5200-2600,y:Math.random()*5200-2600,r:Math.random()*1.5+.3,a:Math.random()*.6+.2})),
};

function clone(v){return JSON.parse(JSON.stringify(v));}
function rand(a,b){return Math.random()*(b-a)+a;}
function nowSec(){return performance.now()/1000;}
function fmt(v){return Math.max(0,Math.round(v)).toLocaleString('pt-BR');}
function shortLaserLabel(id){return ({lcb10:'x1',mcb25:'x2',mcb50:'x3',ucb100:'x4',sab50:'SAB'})[id]||id.toUpperCase();}
function shortRocketLabel(id){return ({r310:'R310',plt2026:'PLT26',plt2021:'PLT21',plt3030:'PLT30'})[id]||id.replace(/[^a-z0-9]/gi,'').toUpperCase();}
function ammoTooltipText(a,qty,laserUse,petUse,bursts){const mode=a.shieldDrain?'CAPTURA ESCUDO x2':`dano x${a.mult}`;return `${a.name} • ${mode}\nEstoque: ${fmt(qty)}\nNave: -${laserUse}/rajada${petUse?` • P.E.T.: -${petUse}`:''}\nRajadas restantes: ~${fmt(bursts)}`;}
function rocketTooltipText(r,qty){return `${r.name} • dano ${fmt(r.damage)}\nEstoque: ${fmt(qty)}\nConsumo: -1/disparo`; }
function applyAmmoUiState(){ if(!ui.weaponBar) return; ui.weaponBar.classList.toggle('collapsed', !state.ammoUiExpanded); if(ui.weaponBarToggle) ui.weaponBarToggle.textContent = state.ammoUiExpanded ? '▾' : '▸'; }
function loadAmmoUiState(){ try{ const raw=localStorage.getItem('stellar_ammo_ui_expanded'); if(raw!==null) state.ammoUiExpanded = raw==='1'; }catch{} applyAmmoUiState(); }
function toggleAmmoUi(){ state.ammoUiExpanded=!state.ammoUiExpanded; try{ localStorage.setItem('stellar_ammo_ui_expanded', state.ammoUiExpanded?'1':'0'); }catch{} applyAmmoUiState(); syncHudButton(); }

function applyStatsUiState(){ if(!ui.leftStats) return; ui.leftStats.classList.toggle('collapsed', !state.statsUiExpanded); if(ui.statsToggle) ui.statsToggle.textContent = state.statsUiExpanded ? '▾' : '▸'; }
function loadStatsUiState(){ try{ const raw=localStorage.getItem('stellar_stats_ui_expanded'); if(raw!==null) state.statsUiExpanded = raw==='1'; }catch{} applyStatsUiState(); }
function toggleStatsUi(){ state.statsUiExpanded=!state.statsUiExpanded; try{ localStorage.setItem('stellar_stats_ui_expanded', state.statsUiExpanded?'1':'0'); }catch{} applyStatsUiState(); syncHudButton(); }

function applyMinimapUiState(){ if(!ui.minimapPanel) return; ui.minimapPanel.classList.toggle('collapsed', !state.minimapUiExpanded); if(ui.minimapToggle) ui.minimapToggle.textContent = state.minimapUiExpanded ? '▾' : '▸'; }
function loadMinimapUiState(){ try{ const raw=localStorage.getItem('stellar_minimap_ui_expanded'); if(raw!==null) state.minimapUiExpanded = raw==='1'; }catch{} applyMinimapUiState(); }
function toggleMinimapUi(){ state.minimapUiExpanded=!state.minimapUiExpanded; try{ localStorage.setItem('stellar_minimap_ui_expanded', state.minimapUiExpanded?'1':'0'); }catch{} applyMinimapUiState(); syncHudButton(); }
function applyTopMetaUiState(){ if(!ui.topbar) return; ui.topbar.classList.toggle('meta-collapsed', !state.topMetaExpanded); }
function loadTopMetaUiState(){ try{ const raw=localStorage.getItem('stellar_top_meta_expanded'); if(raw!==null) state.topMetaExpanded = raw==='1'; }catch{} applyTopMetaUiState(); }
function toggleTopMetaUi(){ state.topMetaExpanded=!state.topMetaExpanded; try{ localStorage.setItem('stellar_top_meta_expanded', state.topMetaExpanded?'1':'0'); }catch{} applyTopMetaUiState(); syncHudButton(); }
function setHudState(expanded){
  state.ammoUiExpanded = expanded; state.statsUiExpanded = expanded; state.minimapUiExpanded = expanded; state.topMetaExpanded = expanded;
  try{
    localStorage.setItem('stellar_ammo_ui_expanded', expanded?'1':'0');
    localStorage.setItem('stellar_stats_ui_expanded', expanded?'1':'0');
    localStorage.setItem('stellar_minimap_ui_expanded', expanded?'1':'0');
    localStorage.setItem('stellar_top_meta_expanded', expanded?'1':'0');
  }catch{}
  applyAmmoUiState(); applyStatsUiState(); applyMinimapUiState(); applyTopMetaUiState(); syncHudButton();
}
function toggleHudUi(){
  const anyExpanded = state.ammoUiExpanded || state.statsUiExpanded || state.minimapUiExpanded || state.topMetaExpanded;
  setHudState(!anyExpanded ? true : false);
}
function syncHudButton(){
  if(!ui.hudToggle) return;
  const allCollapsed = !state.ammoUiExpanded && !state.statsUiExpanded && !state.minimapUiExpanded && !state.topMetaExpanded;
  ui.hudToggle.textContent = allCollapsed ? 'HUD +' : 'HUD';
  ui.hudToggle.classList.toggle('active-hud', !allCollapsed);
}

function layoutHudPanels(){
  const topbarH = ui.topbar ? Math.ceil(ui.topbar.getBoundingClientRect().height) : 54;
  const weaponH = ui.weaponBar ? Math.ceil(ui.weaponBar.getBoundingClientRect().height) : 150;
  document.documentElement.style.setProperty('--hud-top-offset', `${topbarH + 8}px`);
  document.documentElement.style.setProperty('--weaponbar-height', `${weaponH + 12}px`);
}
function getFaction(){return progress?.profile?.faction ? FACTIONS[progress.profile.faction] : null;}
function displayMapLabel(mapId){const map=MAPS[mapId];if(!map)return '—';if(map.gate)return map.label||'GATE';if(map.battle)return map.label;const f=getFaction();return f?`${f.prefix}-${map.tier}`:`X-${map.tier}`;}
function currentGraphMapLabel(){return progress?displayMapLabel(progress.mapId):null;}
function internalMapFromGraphLabel(label){if(label==='4-1')return 'b41';if(label==='4-2')return 'b42';if(label==='4-3')return 'b43';const f=getFaction();if(!f||!label.startsWith(`${f.prefix}-`))return null;const tier=Number(label.split('-')[1]);return tier>=1&&tier<=4?`x${tier}`:null;}
function graphLevelRequirement(label){if(label.startsWith('4-'))return 4;const tier=Number(label.split('-')[1]||99);return tier<=2?1:tier===3?2:tier===4?3:99;}
function canTravelGraphLabel(label){const mapId=internalMapFromGraphLabel(label);if(!mapId)return {ok:false,reason:'Território de outra facção'};const req=graphLevelRequirement(label);if((progress?.profile?.level||1)<req)return {ok:false,reason:`Requer nível ${req}`};return {ok:true,mapId};}
function mapArtFor(label){
  const prefix=label.split('-')[0],tier=Number(label.split('-')[1]||1);
  let path=V8_ASSETS.backgrounds.x1;
  if(prefix==='4')path=tier===1?V8_ASSETS.backgrounds.b41:tier===2?V8_ASSETS.backgrounds.b42:V8_ASSETS.backgrounds.b43;
  else if(tier===1)path=V8_ASSETS.backgrounds.x1;
  else if(tier===2)path=V8_ASSETS.backgrounds.x2;
  else if(tier===3)path=prefix==='3'?V8_ASSETS.backgrounds.x4:V8_ASSETS.backgrounds.x3;
  else path=V8_ASSETS.backgrounds.x4;
  return `url('${path}') center/cover no-repeat`;
}
function renderMapModal(){if(!ui.mapNetwork||!progress)return;const current=currentGraphMapLabel();const nodeMap=Object.fromEntries(MAP_GRAPH_NODES.map(n=>[n.id,n]));let html=`<svg class="map-svg" viewBox="0 0 100 100" preserveAspectRatio="none">`;for(const [a,b] of MAP_GRAPH_LINKS){const na=nodeMap[a],nb=nodeMap[b];html+=`<line class="map-link" x1="${na.x}" y1="${na.y}" x2="${nb.x}" y2="${nb.y}" />`;}html+='</svg>';html+=`<div class="map-legend"><span><i class="dot curr"></i> mapa atual</span><span><i class="dot own"></i> liberado</span><span><i class="dot future"></i> bloqueado</span></div>`;for(const node of MAP_GRAPH_NODES){const access=canTravelGraphLabel(node.id),active=node.id===current,battle=node.id.startsWith('4-');const own=!!internalMapFromGraphLabel(node.id);const classes=['map-node'];if(active)classes.push('current');if(own)classes.push('faction');if(battle)classes.push('battle');if(access.ok&&!active)classes.push('travel');if(!access.ok)classes.push('locked');const sub=active?'ATUAL':access.ok?'LIBERADO':access.reason;html+=`<div class="${classes.join(' ')}" data-map-label="${node.id}" style="left:${node.x}%;top:${node.y}%;--art:${mapArtFor(node.id)}"><div class="node-art"></div><div class="node-overlay"></div><div class="node-sub">${sub}</div>${!access.ok?'<div class="node-lock">🔒</div>':''}<div class="node-label">${node.id}</div></div>`;}ui.mapNetwork.innerHTML=html;ui.mapNetwork.querySelectorAll('.map-node.travel').forEach(el=>el.addEventListener('click',()=>{const label=el.dataset.mapLabel,access=canTravelGraphLabel(label);if(!access.ok)return;ui.mapModal.classList.add('hidden');runMapTransition(access.mapId,null,'NAVIGAÇÃO DIRETA');}));}
function openMapModal(){if(isGalaxyGateMap()){showToast('Galaxy Gate ativo: complete o portal ou perca uma vida para retornar à base');return;}renderMapModal();ui.mapModal.classList.remove('hidden');}
function isSafeZone(x=player.x,y=player.y){return !!progress&&progress.mapId===SAFE_ZONE.mapId&&Math.hypot(x-SAFE_ZONE.x,y-SAFE_ZONE.y)<=SAFE_ZONE.radius;}
function safeZoneDistance(x,y){return Math.hypot(x-SAFE_ZONE.x,y-SAFE_ZONE.y);}
function cargoExtraBonus(){
  return (progress?.shipLoadout?.extras||[]).reduce((sum,id)=>sum+(Number(ITEMS[id]?.cargoBonus)||0),0);
}
function cargoCapacity(){
  const ship=SHIPS[progress?.activeShipId||'phoenix'];
  let cap=ship.cargo||0;
  if(ship.bonusLowMaps&&progress&&['x1','x2','x3','x4'].includes(progress.mapId))cap+=ship.bonusLowMaps.cargo||0;
  cap+=cargoExtraBonus();
  cap*=1+pilotSkillValue('logistics')/100;
  return Math.round(cap);
}
function cargoUsed(){return Object.entries(progress?.cargo||{}).reduce((a,[id,b])=>id==='Xenomit'?a:a+(Number(b)||0),0);}
function cargoFree(){return Math.max(0,cargoCapacity()-cargoUsed());}
function addCargoResource(id,qty){if(!progress||qty<=0)return 0;const amount=Math.floor(qty);if(id==='Xenomit'){progress.cargo[id]=(progress.cargo[id]||0)+amount;return amount;}const take=Math.min(amount,cargoFree());if(take<=0)return 0;progress.cargo[id]=(progress.cargo[id]||0)+take;return take;}
function playerLaserRange(){return state.currentMap?.battle ? 1250 : 900;}
function playerRocketRange(){return state.currentMap?.battle ? 1100 : 820;}
function mapRadarRange(){return state.currentMap?.battle ? 2200 : 1650;}
function isAtTrader(){return progress?.mapId==='x1'&&isSafeZone();}
function showToast(msg){ui.toast.textContent=msg;ui.toast.classList.add('show');clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),1900);}
const celebrationQueue=[];let celebrationRunning=false;
function queueCelebration(kind,title,subtitle=''){celebrationQueue.push({kind,title,subtitle});playNextCelebration();}
function playNextCelebration(){if(celebrationRunning||!celebrationQueue.length||!ui.gameCelebration)return;celebrationRunning=true;const item=celebrationQueue.shift();ui.gameCelebration.classList.remove('hidden','mission','level');ui.gameCelebration.classList.add(item.kind==='level'?'level':'mission');ui.celebrationKicker.textContent=item.kind==='level'?'EVOLUÇÃO DE PILOTO':'PROTOCOLO DE MISSÃO';ui.celebrationTitle.textContent=item.title;ui.celebrationSubtitle.textContent=item.subtitle||'';void ui.gameCelebration.offsetWidth;ui.gameCelebration.classList.add('play');setTimeout(()=>{ui.gameCelebration.classList.remove('play');setTimeout(()=>{ui.gameCelebration.classList.add('hidden');celebrationRunning=false;playNextCelebration();},320);},1900);}
function showMissionCompleteAnimation(mission,bonus){
  const extra=bonus?.itemText?` • ${bonus.itemText}`:'';
  queueCelebration('mission','MISSÃO COMPLETA',`${mission.title} • +${fmt(bonus.credits)} CR • +${fmt(bonus.uridium)} URI • +${fmt(bonus.xp)} XP${extra}`);
}
function showLevelUpAnimation(level){queueCelebration('level',`NÍVEL ${level}`,`Seu piloto alcançou o nível ${level}`);}
function processPlayerLevelUps(){
  let gained=0;
  while(progress.profile.level<PLAYER_MAX_LEVEL&&progress.profile.xp>=levelXpThreshold(progress.profile.level+1)){
    progress.profile.level++;
    gained++;
    showLevelUpAnimation(progress.profile.level);
  }
  return gained;
}

function setSync(text,cls=''){ui.syncLabel.textContent=text;ui.syncLabel.className=`sync-chip ${cls}`.trim();}
function saveGame(){if(!progress)return;if(isGalaxyGateMap())syncAlphaGateSnapshot();localStorage.setItem(saveKey(),JSON.stringify(progress));cloudDirty=true;}
function loadLocalGame(){
  const raw=localStorage.getItem(saveKey());
  if(!raw){progress=null;return;}
  try{progress=JSON.parse(raw);hydrateProgress();}catch(e){console.warn(e);progress=null;}
}
function hydrateProgress(){
  if(!progress)return;
  if(!progress.profile?.faction || !SHIPS[progress.activeShipId]) throw new Error('save incompleto');
  progress.profile.callsign ||= getUser()?.callsign || getUser()?.email?.split('@')[0] || 'Pilot';
  progress.profile.level=Math.max(1,Math.min(PLAYER_MAX_LEVEL,Number(progress.profile.level)||1));
  progress.profile.xp=Math.max(0,Number(progress.profile.xp)||0);
  if(!progress.profile.xpModelV101){
    const oldCarry=progress.profile.xp;
    progress.profile.xp=levelXpThreshold(progress.profile.level)+oldCarry;
    progress.profile.xpModelV101=true;
  }
  progress.profile.level=levelFromXp(progress.profile.xp,PLAYER_MAX_LEVEL);
  progress.ownedShips ||= ['phoenix'];progress.inventory ||= {};progress.drones ||= [];progress.ammo ||= {};progress.rockets ||= {};progress.flags ||= {};progress.cargo ||= {};progress.discoveries ||= {};progress.missions ||= freshMissions();normalizeMissionState();progress.pilotBio ||= freshPilotBio();normalizePilotBio();progress.auction ||= freshAuctionState();ensureAuctionState();progress.galaxyGate ||= freshGalaxyGateState();normalizeGalaxyGateState();
  for(const id of Object.keys(LASER_AMMO))if(progress.ammo[id]===undefined)progress.ammo[id]=0;
  if(!LASER_AMMO[progress.selectedLaserAmmo])progress.selectedLaserAmmo='lcb10';
  progress.pet ||= freshPet();
  const legacyPetOwned=progress.pet.owned===undefined&&(Number(progress.pet.level)>1||(progress.pet.lasers||[]).some(Boolean)||(progress.pet.shields||[]).some(Boolean)||Object.values(progress.pet.gearsOwned||{}).some(Boolean));
  if(progress.pet.owned===undefined)progress.pet.owned=!!legacyPetOwned;
  progress.pet.level=Math.max(1,Math.min(PET_MAX_LEVEL,Number(progress.pet.level)||1));
  progress.pet.xp=Math.max(0,Number(progress.pet.xp)||0);
  if(progress.pet.owned&&!progress.pet.xpModelV101){
    progress.pet.xp=levelXpThreshold(progress.pet.level)+progress.pet.xp;
    progress.pet.xpModelV101=true;
  }
  if(!progress.pet.owned){
    progress.pet.level=1;progress.pet.xp=0;progress.pet.laserSlotsUnlocked=0;progress.pet.shieldSlotsUnlocked=0;progress.pet.lasers=[];progress.pet.shields=[];progress.pet.activeGear='off';
  }else{
    progress.pet.level=levelFromXp(progress.pet.xp,PET_MAX_LEVEL);
    const slotCap=Math.min(progress.pet.level,PET_SLOT_LEVEL_CAP);
    progress.pet.laserSlotsUnlocked=Math.max(1,Math.min(slotCap,Number(progress.pet.laserSlotsUnlocked)||1));
    progress.pet.shieldSlotsUnlocked=Math.max(1,Math.min(slotCap,Number(progress.pet.shieldSlotsUnlocked)||1));
    progress.pet.lasers ||= [null]; progress.pet.shields ||= [null];
    while(progress.pet.lasers.length<progress.pet.laserSlotsUnlocked)progress.pet.lasers.push(null);
    while(progress.pet.shields.length<progress.pet.shieldSlotsUnlocked)progress.pet.shields.push(null);
    progress.pet.lasers=progress.pet.lasers.slice(0,progress.pet.laserSlotsUnlocked);
    progress.pet.shields=progress.pet.shields.slice(0,progress.pet.shieldSlotsUnlocked);
  }
  progress.pet.gearsOwned ||= {guard:false,box:false,ore:false,repair:false,kami:false};
  for(const key of ['guard','box','ore','repair','kami']) if(progress.pet.gearsOwned[key]===undefined) progress.pet.gearsOwned[key]=false;
  progress.pet.activeGear ||= 'off';
  if(!progress.expeditionV9){
    const oldWorld={x1:{w:2400,h:1800},x2:{w:2600,h:1900},x3:{w:2900,h:2100},x4:{w:3200,h:2300},b41:{w:4600,h:3200},b42:{w:4800,h:3400},b43:{w:5000,h:3600}};
    const id=progress.mapId||'x1',old=oldWorld[id],now=MAPS[id]?.world;
    if(old&&now&&Number.isFinite(progress.x)&&Number.isFinite(progress.y)){progress.x=Math.max(35,Math.min(now.w-35,progress.x*(now.w/old.w)));progress.y=Math.max(35,Math.min(now.h-35,progress.y*(now.h/old.h)));}
    progress.expeditionV9=1;
  }
  progress.shipLoadout ||= blankLoadout(progress.activeShipId);normalizeLoadout();
}
async function flushCloudSave(force=false){
  if(!authenticated||!progress||cloudBusy||(!cloudDirty&&!force))return;
  cloudBusy=true;setSync('SALVANDO','busy');
  try{await saveCloudSave(progress);cloudDirty=false;setSync('ONLINE','ok');}
  catch(e){console.warn('cloud save',e);setSync('OFFLINE','err');}
  finally{cloudBusy=false;}
}

function extraSlotBonusFromLoadout(loadout=progress?.shipLoadout){
  const extras=loadout?.extras||[];
  let bonus=0;
  for(const id of extras)bonus=Math.max(bonus,Number(ITEMS[id]?.slotBonus)||0);
  return bonus;
}
function shipExtraCapacity(shipId=progress?.activeShipId,loadout=progress?.shipLoadout){
  const ship=SHIPS[shipId];if(!ship)return 0;
  return ship.extras+extraSlotBonusFromLoadout(loadout);
}
function activeRepairBot(){
  const extras=progress?.shipLoadout?.extras||[];
  let best=null;
  for(const id of extras){
    const item=ITEMS[id];
    if(!item?.repairRate)continue;
    if(!best||item.repairRate>best.repairRate)best=item;
  }
  return best;
}
function normalizeLoadout(){
  if(!progress)return 0;
  const ship=SHIPS[progress.activeShipId];
  let overflowCount=0;
  for(const type of ['lasers','generators']){
    progress.shipLoadout[type] ||= [];
    const cap=type==='lasers'?ship.lasers:ship.generators;
    while(progress.shipLoadout[type].length<cap)progress.shipLoadout[type].push(null);
    if(progress.shipLoadout[type].length>cap){
      const overflow=progress.shipLoadout[type].splice(cap);
      overflow.filter(Boolean).forEach(id=>{addInventory(id);overflowCount++;});
    }
  }
  progress.shipLoadout.extras ||= [];
  const extraCap=shipExtraCapacity(progress.activeShipId,progress.shipLoadout);
  while(progress.shipLoadout.extras.length<extraCap)progress.shipLoadout.extras.push(null);
  if(progress.shipLoadout.extras.length>extraCap){
    const overflow=progress.shipLoadout.extras.splice(extraCap);
    overflow.filter(Boolean).forEach(id=>{addInventory(id);overflowCount++;});
  }
  return overflowCount;
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
  const laserNeed=Math.max(1,equippedLaserCount()+petLaserIds().length)*10;
  if(ammoQty(laser.id)<laserNeed && canAutoBuy(laser) && buyAmmoPack(laser.id,true)) bought.push(`${laser.name} +${fmt(laser.pack)}`);
  if(rocketQty(rocket.id)<10 && canAutoBuy(rocket) && buyRocketPack(rocket.id,true)) bought.push(`${rocket.name} +${fmt(rocket.pack)}`);
  if(bought.length){state.lastAutoBuyAt=now;refreshAmmoCounters();renderShop();showToast(`Auto Buy: ${bought.join(' • ')}`);} 
}
function allEquippedIds(){return [...progress.shipLoadout.lasers,...progress.shipLoadout.generators,...progress.shipLoadout.extras,...progress.drones.flatMap(d=>d.slots)].filter(Boolean);}
function equippedLaserIds(){return [...progress.shipLoadout.lasers,...progress.drones.flatMap(d=>d.slots)].filter(id=>ITEMS[id]?.type==='laser');}
function equippedLaserCount(){return equippedLaserIds().length;}

function petLevelXp(level){return levelXpThreshold(level+1);}
function petRange(){return 300+(progress?.pet?.owned?(progress.pet.level||1):1)*34;}
function petSlotCost(slotNumber){return Math.round(25000*slotNumber+10000*slotNumber*slotNumber);}
function petLaserIds(){return progress?.pet?.owned?(progress.pet.lasers||[]).filter(id=>ITEMS[id]?.type==='laser'):[];}
function petShieldIds(){return progress?.pet?.owned?(progress.pet.shields||[]).filter(id=>ITEMS[id]?.type==='generator'&&ITEMS[id]?.subtype==='shield'):[];}
function petDamage(){return petLaserIds().reduce((sum,id)=>{const it=ITEMS[id];const base=it?.alienDamage??it?.damage??0;return sum+base*(1+(Number(it?.alienBonus)||0));},0);}
function petMaxShield(){return petShieldIds().reduce((sum,id)=>sum+(ITEMS[id]?.shield||0),0);}
function addPetXp(amount){
  if(!progress?.pet?.owned||amount<=0||progress.pet.level>=PET_MAX_LEVEL)return;
  progress.pet.xp+=Math.round(amount);
  let leveled=false;
  while(progress.pet.level<PET_MAX_LEVEL&&progress.pet.xp>=levelXpThreshold(progress.pet.level+1)){
    progress.pet.level++;
    leveled=true;
    showToast(`P.E.T. subiu para o nível ${progress.pet.level}!`);
  }
  if(leveled){saveGame();if(ui.petModal&&!ui.petModal.classList.contains('hidden'))renderPet();}
}
function unlockPetSlot(kind){
  const pet=progress.pet;if(!pet?.owned){showToast('Adquira o P.E.T. primeiro');return;}
  const key=kind==='laser'?'laserSlotsUnlocked':'shieldSlotsUnlocked';
  const list=kind==='laser'?pet.lasers:pet.shields;
  const next=pet[key]+1;
  const availableSlots=Math.min(pet.level,PET_SLOT_LEVEL_CAP);
  if(next>availableSlots){showToast(next>PET_SLOT_LEVEL_CAP?`P.E.T. atingiu o limite de ${PET_SLOT_LEVEL_CAP} slots`:`P.E.T. precisa estar no nível ${next}`);return;}
  const cost=petSlotCost(next);
  if(progress.profile.uridium<cost){showToast(`Faltam ${fmt(cost-progress.profile.uridium)} URI`);return;}
  progress.profile.uridium-=cost;pet[key]=next;list.push(null);saveGame();renderPet();updateUI();showToast(`Slot ${next} de ${kind==='laser'?'laser':'escudo'} liberado`);
}
function equipPetItem(itemId,kind){
  if(!progress?.pet?.owned){showToast('Adquira o P.E.T. primeiro');return;}
  const item=ITEMS[itemId];
  const valid=kind==='laser'?item?.type==='laser':item?.type==='generator'&&item?.subtype==='shield';
  if(!valid){showToast(kind==='laser'?'O P.E.T. aceita lasers nesse espaço':'O P.E.T. aceita geradores de escudo nesse espaço');return;}
  const list=kind==='laser'?progress.pet.lasers:progress.pet.shields;
  const idx=list.findIndex(v=>!v);if(idx<0){showToast('Sem slot liberado vazio no P.E.T.');return;}
  if(!removeInventory(itemId)){showToast('Item não disponível');return;}
  list[idx]=itemId;saveGame();renderPet();refreshAmmoCounters();
}
function unequipPetSlot(kind,index){
  if(!progress?.pet?.owned)return;
  const list=kind==='laser'?progress.pet.lasers:progress.pet.shields;
  const id=list[index];if(!id)return;list[index]=null;addInventory(id);saveGame();renderPet();refreshAmmoCounters();
}
function buyPetUnit(){
  if(progress?.pet?.owned){showToast('P.E.T. já adquirido');return;}
  if(progress.profile.uridium<PET_BASE_PRICE){showToast(`Faltam ${fmt(PET_BASE_PRICE-progress.profile.uridium)} URI para o P.E.T.`);return;}
  progress.profile.uridium-=PET_BASE_PRICE;
  progress.pet=freshPet();progress.pet.owned=true;progress.pet.laserSlotsUnlocked=1;progress.pet.shieldSlotsUnlocked=1;progress.pet.lasers=[null];progress.pet.shields=[null];
  petRuntime.x=player.x+82;petRuntime.y=player.y+64;petRuntime.tx=petRuntime.x;petRuntime.ty=petRuntime.y;
  saveGame();renderShop();renderPet();updateUI();showToast('P.E.T. adquirido! Agora equipe armas, escudos e módulos.');
}
function buyPetGear(id){
  if(!progress?.pet?.owned){showToast('Adquira o P.E.T. primeiro');return;}
  const gear=PET_GEARS[id];if(!gear)return;
  if(progress.pet.gearsOwned[id]){showToast('Módulo já comprado');return;}
  if(progress.profile.uridium<gear.cost){showToast(`Faltam ${fmt(gear.cost-progress.profile.uridium)} URI`);return;}
  progress.profile.uridium-=gear.cost;progress.pet.gearsOwned[id]=true;saveGame();renderPet();updateUI();showToast(`${gear.name} adquirido`);
}
function setPetGear(id){
  if(!progress?.pet?.owned){showToast('Adquira o P.E.T. primeiro');return;}
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
  if(!progress?.pet?.owned)return;
  const pet=progress.pet, mode=pet.activeGear||'off', followAngle=nowSec()*.7;
  let targetX=player.x+Math.cos(followAngle)*92,targetY=player.y+Math.sin(followAngle)*92,task=null;
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
    targetX=player.x+72;targetY=player.y-78;
    if(player.hp<player.maxHp)player.hp=Math.min(player.maxHp, player.hp + player.maxHp*(0.012+pet.level*0.0008)*dt);
  }else if(mode==='kami'&&pet.gearsOwned.kami){
    task=state.enemies.filter(e=>e.hp>0&&Math.hypot(e.x-player.x,e.y-player.y)<=Math.min(petRange(),340))
      .sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y))[0]||null;
    if(task){targetX=task.x;targetY=task.y;petRuntime.taskType='kami';petRuntime.taskId=task.id;}
  }else {petRuntime.taskType='follow';petRuntime.taskId=null;}

  const dx=targetX-petRuntime.x,dy=targetY-petRuntime.y,d=Math.hypot(dx,dy);
  const petSpeed=Math.max(420,player.speed*1.35);
  if(d>4){const step=Math.min(d,petSpeed*dt);petRuntime.x+=dx/d*step;petRuntime.y+=dy/d*step;}
  if(Math.hypot(petRuntime.x-player.x,petRuntime.y-player.y)>petRange()*1.45){petRuntime.x=player.x+78;petRuntime.y=player.y+64;}

  if(mode==='guard'&&task&&task.hp>0){
    const pd=Math.hypot(task.x-petRuntime.x,task.y-petRuntime.y);
    const lasers=petLaserIds(),ammo=currentLaserAmmo();let stock=ammoQty(ammo.id);
    if(pd<350&&lasers.length&&stock<=0&&autoBuyEnabled()&&buyAmmoPack(ammo.id,true)){stock=ammoQty(ammo.id);refreshAmmoCounters();renderShop();showToast(`Auto Buy P.E.T.: ${ammo.name}`);}
    if(pd<350&&lasers.length&&stock>0&&nowSec()-petRuntime.lastShot>.58){
      const firing=Math.min(lasers.length,stock);const ids=lasers.slice(0,firing);
      const rawBase=Math.round(laserPveBase(ids)*rand(.95,1.08));
      progress.ammo[ammo.id]=Math.max(0,stock-firing);petRuntime.lastShot=nowSec();petRuntime.laserTargetId=task.id;petRuntime.laserUntil=nowSec()+.16;
      if(rawBase>0)applyLaserAmmoHit(task,rawBase,ammo,ammo.color);refreshAmmoCounters();
    }
  }
  if(mode==='kami'&&task&&task.hp>0&&Math.hypot(task.x-petRuntime.x,task.y-petRuntime.y)<70&&now-(petRuntime.lastKami||0)>15){
    petRuntime.lastKami=now;
    const boomDmg=Math.round((3500 + pet.level*650 + petDamage()*2.5)*(1+pilotKamikazeDamageBonus()));
    const boomRadius=110*(1+pilotKamikazeRadiusBonus());
    spawnParticle(petRuntime.x,petRuntime.y,'KAMIKAZE','#ff7d8f');
    state.enemies.filter(e=>e.hp>0&&Math.hypot(e.x-petRuntime.x,e.y-petRuntime.y)<boomRadius).forEach(e=>dealDamageToEnemy(e,boomDmg,'#ff7d8f'));
  }
  if(mode==='box'&&task&&Math.hypot(task.x-petRuntime.x,task.y-petRuntime.y)<28){
    sellPetCargoBox(task);state.loot=state.loot.filter(x=>x.id!==task.id);petRuntime.taskId=null;
  }
  if(mode==='ore'&&task&&Math.hypot(task.x-petRuntime.x,task.y-petRuntime.y)<24){
    const got=addCargoResource(task.type,task.amount);
    if(got>0){spawnParticle(task.x,task.y,`P.E.T. +${got} ${task.type}`,task.color);missionEvent('collectOre',{amount:got,type:task.type,mapId:progress.mapId});addPetXp(3);state.ores=state.ores.filter(x=>x.id!==task.id);state.oreRespawns.push({type:task.type,at:nowSec()+rand(5,12)});saveGame();}
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
  let hp=ship.hp, speed=ship.speed, shield=0, laserDamage=0, absorption=0, rocketMult=1, shieldRegenBoost=0;
  // Combate atual é PvE: respeita dano específico contra aliens e bônus PvE por laser.
  for(const id of laserIds){const it=ITEMS[id];const base=it?.alienDamage??it?.damage??0;laserDamage+=base*(1+(Number(it?.alienBonus)||0));}
  for(const id of genIds){const it=ITEMS[id];speed+=it.speed||0;shield+=it.shield||0;absorption=Math.max(absorption,it.absorption||0);shieldRegenBoost=Math.max(shieldRegenBoost,Number(it.shieldRegenBonus)||0);}
  if(ship.bonusLowMaps&&low){hp+=ship.bonusLowMaps.hp;speed+=ship.bonusLowMaps.speed;shield*=ship.bonusLowMaps.shieldMult;laserDamage*=ship.bonusLowMaps.laserMult;rocketMult=ship.bonusLowMaps.rocketMult;}
  hp+=pilotSkillValue('hull1')+pilotSkillValue('hull2');
  shield*=1+pilotSkillValue('shieldEngineering')/100;
  laserDamage*=1+pilotSkillValue('alienHunter')/100;
  if(state.currentMap?.battle||state.currentMap?.gate)laserDamage*=1+pilotBattleLaserBonus();
  absorption=Math.min(95,absorption+pilotSkillValue('shieldMechanics'));
  rocketMult*=1+pilotSkillValue('rocketFusion')/100;
  player.maxHp=Math.round(hp);player.maxShield=Math.round(shield);player.speed=Math.round(speed);player.laserDamage=Math.round(laserDamage);player.shieldAbsorption=absorption;player.rocketMult=rocketMult;player.shieldRegenBoost=shieldRegenBoost;
  player.hp=keepRatio?Math.min(player.maxHp,Math.max(1,Math.round(player.maxHp*oldHpRatio))):player.maxHp;
  player.shield=keepRatio?Math.min(player.maxShield,Math.max(0,Math.round(player.maxShield*oldShieldRatio))):player.maxShield;
  progress.hp=player.hp;progress.shield=player.shield;
}

function initializeFaction(factionId){
  state.lastPlayerDamageAt=nowSec();
  progress=freshSave(factionId);state.currentMap=MAPS.x1;player.hp=SHIPS.phoenix.hp;player.shield=1000;computeStats(false);setMap('x1',false);ui.factionModal.classList.add('hidden');buildAmmoButtons();renderAll();saveGame();flushCloudSave(true);showToast(`Bem-vindo à ${FACTIONS[factionId].name}`);
}

function renderFactionChoice(){
  ui.factionCards.innerHTML='';
  Object.values(FACTIONS).forEach(f=>{
    const el=document.createElement('div');el.className='faction-card';el.style.color=f.color;
    const art=factionAsset(f.id);
    el.innerHTML=`<div><div class="faction-orb" style="background-image:url('${art}')"></div><h3>${f.name}</h3><p>${f.description}</p><p class="muted">Base inicial: mapa ${f.prefix}-1</p></div>`;
    const b=document.createElement('button');b.className='small-btn';b.textContent=`Escolher ${f.short}`;b.onclick=()=>initializeFaction(f.id);el.appendChild(b);ui.factionCards.appendChild(el);
  });
  ui.factionModal.classList.remove('hidden');
}

function screenPos(x,y){return{x:x-state.camera.x+W/2,y:y-state.camera.y+H/2};}
function spawnParticle(x,y,text,color){state.particles.push({x,y,text,color,life:1,vy:rand(20,32)});}
function spawnImpactFx(x,y,color='#7edcff',size=24,type='impact'){
  state.fx.push({x,y,color,size,type,life:1,maxLife:1,rot:rand(0,TWO_PI)});
}
function spawnExplosionFx(x,y,color='#ff754f',boss=false){
  state.fx.push({x,y,color,size:boss?110:64,type:'explosion',life:1.15,maxLife:1.15,rot:rand(0,TWO_PI)});
  const sparks=boss?18:10;
  for(let i=0;i<sparks;i++){
    const a=rand(0,TWO_PI),speed=rand(boss?85:55,boss?190:125);
    state.fx.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,color:i%3===0?'#fff2b0':color,size:rand(2,5),type:'spark',life:rand(.45,.9),maxLife:.9,rot:0});
  }
}
function seededUnit(key){let h=2166136261;for(let i=0;i<key.length;i++){h^=key.charCodeAt(i);h=Math.imul(h,16777619);}return((h>>>0)%100000)/100000;}
function createLandmarks(){
  const w=state.currentMap.world.w,h=state.currentMap.world.h,count=state.currentMap.landmarkCount||6,mapKey=progress?.mapId||'x1';
  const names=state.currentMap.battle?['Zona de Conflito','Beacon Tático','Campo de Destroços','Nó de Combate','Ruína Orbital','Anomalia Hostil','Rota de Patrulha','Setor de Caça']:['Beacon de Navegação','Campo de Mineração','Estação Abandonada','Anomalia Espacial','Ruínas Orbitais','Rota Comercial','Campo de Destroços','Ponto de Varredura'];
  const items=[];
  for(let i=0;i<count;i++){
    const col=(i%4)+1,row=Math.floor(i/4)+1,jx=(seededUnit(`${mapKey}:${i}:x`)-.5)*w*.09,jy=(seededUnit(`${mapKey}:${i}:y`)-.5)*h*.11;
    let x=w*(col/5)+jx,y=h*(row/(Math.ceil(count/4)+1))+jy;
    if(mapKey==='x1'&&Math.hypot(x-SAFE_ZONE.x,y-SAFE_ZONE.y)<SAFE_ZONE.radius+700){x=Math.min(w-500,SAFE_ZONE.x+SAFE_ZONE.radius+900+i*170);}
    items.push({id:`lm_${i}`,x:Math.max(260,Math.min(w-260,x)),y:Math.max(260,Math.min(h-260,y)),name:names[i%names.length],type:i%3===0?'scan':i%3===1?'wreck':'beacon'});
  }
  state.landmarks=items;
}
function routeDistance(){return Math.hypot(player.tx-player.x,player.ty-player.y);}
function checkLandmarkDiscovery(){
  if(!progress?.discoveries)return;
  for(const l of state.landmarks){const key=`${progress.mapId}:${l.id}`;if(progress.discoveries[key])continue;if(Math.hypot(player.x-l.x,player.y-l.y)>105)continue;progress.discoveries[key]=true;const tier=state.currentMap.battle?8:Math.max(1,state.currentMap.tier||1),cr=750+tier*450,xp=180+tier*90;progress.profile.credits+=cr;progress.profile.xp+=xp;processPlayerLevelUps();spawnParticle(l.x,l.y-24,`DESCOBERTA +${fmt(cr)} CR`,'#74e7ff');spawnImpactFx(l.x,l.y,'#74e7ff',46,'shield');missionEvent('explore',{landmark:l,mapId:progress.mapId});showToast(`Descoberta: ${l.name} • +${fmt(cr)} CR • +${fmt(xp)} XP`);saveGame();}
}
function visibleWorldBounds(margin=0){return {left:state.camera.x-W/2-margin,right:state.camera.x+W/2+margin,top:state.camera.y-H/2-margin,bottom:state.camera.y+H/2+margin};}
function onScreenWorld(x,y,margin=180){const b=visibleWorldBounds(margin);return x>=b.left&&x<=b.right&&y>=b.top&&y<=b.bottom;}

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
function createOres(){state.ores=[];state.oreRespawns=[];const count=state.currentMap.oreCount||(state.currentMap.battle?72:48);for(let i=0;i<count;i++)spawnOre();}
function makeEnemy(type){
  const base=NPC_TYPES[type],cluster=state.landmarks.length&&Math.random()<.74?state.landmarks[Math.floor(Math.random()*state.landmarks.length)]:null;
  let pos=cluster?{x:cluster.x+rand(-520,520),y:cluster.y+rand(-420,420)}:randomMapPosition(160);
  pos.x=Math.max(160,Math.min(state.currentMap.world.w-160,pos.x));pos.y=Math.max(160,Math.min(state.currentMap.world.h-160,pos.y));
  if(progress?.mapId==='x1'&&safeZoneDistance(pos.x,pos.y)<SAFE_ZONE.radius+180)pos=randomMapPosition(180);
  const battle=state.currentMap?.battle;return {id:`${type}_${Math.random().toString(16).slice(2,9)}`,type,name:base.name,x:pos.x,y:pos.y,hp:base.hp,maxHp:base.hp,shield:base.shield,maxShield:base.shield,credits:base.credits,uridium:base.uridium,xp:base.xp,speed:base.speed,damage:base.damage,color:base.color,size:base.size,resources:{...(base.resources||{})},attackRange:Math.min(battle?500:420,(battle?210:170)+base.size*5.8),aggroRange:battle?920:720,lastShot:0,angle:rand(0,TWO_PI),drift:rand(.4,1.4)};
}
function spawnEnemies(){state.enemies=[];state.enemyRespawns=[];const mult=Math.max(1,Number(state.currentMap.enemyMultiplier)||1);for(const group of state.currentMap.enemyGroups){const count=Math.max(1,Math.round(group.count*mult));for(let i=0;i<count;i++)state.enemies.push(makeEnemy(group.type));}}
function scheduleEnemyRespawn(type){state.enemyRespawns.push({type,at:nowSec()+rand(6,13)});}
function makeGateEnemy(type,index=0,total=1){
  const e=makeEnemy(type);
  const center={x:player.x||MAPS.ggAlpha.world.w/2,y:player.y||MAPS.ggAlpha.world.h/2};
  const radar=Math.max(1200,state.radarRange||mapRadarRange());
  const ring=radar*rand(.82,.96);
  const baseAngle=(index/Math.max(1,total))*TWO_PI;
  let a=baseAngle+rand(-.16,.16),x=center.x+Math.cos(a)*ring,y=center.y+Math.sin(a)*ring;
  // Tenta preservar o nascimento no anel do radar sem grudar na borda do mapa.
  for(let tries=0;tries<10&&(x<180||x>MAPS.ggAlpha.world.w-180||y<180||y>MAPS.ggAlpha.world.h-180);tries++){
    a=baseAngle+rand(-.55,.55);
    x=center.x+Math.cos(a)*ring;y=center.y+Math.sin(a)*ring;
  }
  e.x=Math.max(180,Math.min(MAPS.ggAlpha.world.w-180,x));
  e.y=Math.max(180,Math.min(MAPS.ggAlpha.world.h-180,y));
  e.gateEnemy=true;
  e.forceChase=true;
  e.aggroRange=Number.POSITIVE_INFINITY;
  e.attackRange=Math.min(620,e.attackRange+80);
  return e;
}
function countAliveGateByType(){
  const out={};for(const e of state.enemies)if(e.hp>0&&e.gateEnemy)out[e.type]=(out[e.type]||0)+1;return out;
}
function syncAlphaGateSnapshot(){
  if(!progress?.galaxyGate?.alpha?.run||!isGalaxyGateMap())return;
  const run=progress.galaxyGate.alpha.run;
  run.remaining=countAliveGateByType();
  run.savedAt=Date.now();
}
function restoreAlphaGateEnemies(){
  const a=alphaGate(),remaining=a.run?.remaining||{};state.enemies=[];let cursor=0;
  for(const [type,count] of Object.entries(remaining)){
    for(let i=0;i<count;i++)state.enemies.push(makeGateEnemy(type,cursor++,Math.max(1,Object.values(remaining).reduce((s,v)=>s+v,0))));
  }
}
function spawnAlphaWave(){
  const a=alphaGate();if(!a.run?.active||!isGalaxyGateMap())return;
  const def=GALAXY_ALPHA_ROUNDS[a.run.round-1];if(!def||a.run.waveIndex>=def.waves.length)return;
  const wave=def.waves[a.run.waveIndex];
  const existing=alphaRemainingCount();
  for(let i=0;i<wave.count;i++)state.enemies.push(makeGateEnemy(wave.type,existing+i,existing+wave.count));
  a.run.waveIndex++;
  a.run.nextRoundAt=0;
  a.run.nextWaveAt=a.run.waveIndex<def.waves.length?Date.now()+GALAXY_ALPHA_WAVE_INTERVAL_MS:0;
  syncAlphaGateSnapshot();saveGame();
  showToast(`ALFA • Round ${a.run.round} • Onda ${a.run.waveIndex}/${def.waves.length}: ${wave.count} ${NPC_TYPES[wave.type].name}`);
  renderGateHud();renderGalaxyGate();
}
function initAlphaRun(){
  const a=alphaGate();
  a.run={active:true,round:1,waveIndex:0,remaining:{},nextWaveAt:0,nextRoundAt:0,killRewards:{credits:0,uridium:0,xp:0},startedAt:Date.now()};
  a.lives=3;
}
function setupAlphaMap(resume=false){
  const a=alphaGate();if(!a.run?.active)initAlphaRun();
  progress.mapId='ggAlpha';state.currentMap=MAPS.ggAlpha;state.radarRange=mapRadarRange();computeStats(true);
  player.x=MAPS.ggAlpha.world.w/2;player.y=MAPS.ggAlpha.world.h/2;player.tx=player.x;player.ty=player.y;
  petRuntime.x=player.x+82;petRuntime.y=player.y+64;petRuntime.tx=petRuntime.x;petRuntime.ty=petRuntime.y;
  state.camera.x=player.x;state.camera.y=player.y;state.target=null;state.loot=[];state.ores=[];state.landmarks=[];state.fx=[];state.rocketFx=[];state.enemyRespawns=[];state.oreRespawns=[];
  if(resume&&Object.values(a.run.remaining||{}).some(v=>Number(v)>0))restoreAlphaGateEnemies();else state.enemies=[];

  const def=GALAXY_ALPHA_ROUNDS[a.run.round-1];
  const alive=alphaRemainingCount();
  const now=Date.now();

  // Entrada nova: o primeiro grupo nasce após 10 segundos.
  if(a.run.waveIndex===0&&alive===0){
    a.run.nextRoundAt=0;
    a.run.nextWaveAt=now+GALAXY_ALPHA_WAVE_INTERVAL_MS;
    showToast(`ALFA • Round ${a.run.round} começa em 10 segundos`);
  }
  // Save antigo / retorno após morte no meio de um round: garante que o relógio recomece.
  else if(a.run.waveIndex<def.waves.length&&!a.run.nextWaveAt){
    a.run.nextRoundAt=0;
    a.run.nextWaveAt=now+GALAXY_ALPHA_WAVE_INTERVAL_MS;
  }
  // Todas as ondas já nasceram e não há mais NPC: prepara o próximo round.
  else if(a.run.waveIndex>=def.waves.length&&alive===0&&a.run.round<GALAXY_ALPHA_ROUNDS.length&&!a.run.nextRoundAt){
    a.run.nextWaveAt=0;
    a.run.nextRoundAt=now+GALAXY_ALPHA_ROUND_INTERVAL_MS;
  }

  saveGame();renderAll();layoutHudPanels();renderGateHud();
}
function enterAlphaGate(){
  const a=alphaGate();
  if(!a.built&&!a.run){showToast('Monte as 34 peças do ALFA primeiro');return;}
  if(!isAtTrader()){showToast('O Galaxy Gate ALFA só pode ser acessado pela base X-1');return;}
  if(a.lives<=0){showToast('O portal ALFA foi perdido');return;}
  if(!a.run)initAlphaRun();
  ui.gateModal?.classList.add('hidden');
  state.jumping=true;player.laserFiring=false;ui.jumpTitle.textContent='X-1 → ALFA';ui.jumpSubtitle.textContent='GALAXY GATE';ui.jumpTransition.classList.remove('hidden');
  requestAnimationFrame(()=>ui.jumpTransition.classList.add('active'));
  setTimeout(()=>setupAlphaMap(!!Object.keys(a.run.remaining||{}).length),430);
  setTimeout(()=>{ui.jumpTransition.classList.remove('active');setTimeout(()=>ui.jumpTransition.classList.add('hidden'),240);state.jumping=false;},1050);
}
function recordAlphaKillReward(enemy){
  const a=alphaGate();if(!a.run)return;
  const xp=Math.round(Number(enemy.xp)||enemy.credits/10+enemy.uridium*12);
  a.run.killRewards.credits=(a.run.killRewards.credits||0)+enemy.credits;
  a.run.killRewards.uridium=(a.run.killRewards.uridium||0)+enemy.uridium;
  a.run.killRewards.xp=(a.run.killRewards.xp||0)+xp;
}
function completeAlphaGate(){
  const a=alphaGate(),earned=alphaRunReward(),bonus={credits:earned.credits*2,uridium:earned.uridium*2,xp:earned.xp*2};
  progress.profile.credits+=bonus.credits;progress.profile.uridium+=bonus.uridium;progress.profile.xp+=bonus.xp;
  processPlayerLevelUps();
  const logReward=50;normalizePilotBio();progress.pilotBio.logDisks+=logReward;
  a.completed++;a.lastCompletion={at:Date.now(),earned,bonus,logDisks:logReward,total:{credits:earned.credits*3,uridium:earned.uridium*3,xp:earned.xp*3}};
  a.pieces=[];a.built=false;a.lives=3;a.run=null;
  showToast(`ALFA CONCLUÍDO! +${fmt(logReward)} Log-Disks • bônus 3X aplicado`);
  saveGame();renderGalaxyGate();
  setTimeout(()=>runMapTransition('x1',null,'ALFA CONCLUÍDO • RECOMPENSA 3X'),1800);
}
function failAlphaGate(){
  const a=alphaGate();a.failed++;a.pieces=[];a.built=false;a.lives=3;a.run=null;
  showToast('GALAXY GATE ALFA PERDIDO — as 3 vidas acabaram e o portal precisa ser remontado');
  progress.mapId='x1';state.currentMap=MAPS.x1;state.radarRange=mapRadarRange();
  player.x=SAFE_ZONE.x;player.y=SAFE_ZONE.y;player.tx=player.x;player.ty=player.y;state.camera.x=player.x;state.camera.y=player.y;
  state.target=null;player.laserFiring=false;createLandmarks();createOres();spawnEnemies();saveGame();renderAll();
}
function handleAlphaDeath(){
  const a=alphaGate();syncAlphaGateSnapshot();a.lives=Math.max(0,a.lives-1);
  if(a.run){a.run.nextWaveAt=0;a.run.nextRoundAt=0;}
  player.hp=player.maxHp;player.shield=Math.round(player.maxShield*.5);state.target=null;player.laserFiring=false;state.fx=[];state.rocketFx=[];
  if(a.lives<=0){failAlphaGate();return;}
  progress.mapId='x1';state.currentMap=MAPS.x1;state.radarRange=mapRadarRange();player.x=SAFE_ZONE.x;player.y=SAFE_ZONE.y;player.tx=player.x;player.ty=player.y;state.camera.x=player.x;state.camera.y=player.y;
  createLandmarks();createOres();spawnEnemies();saveGame();renderAll();renderGalaxyGate();
  showToast(`ALFA: você perdeu 1 vida • ${a.lives} vida${a.lives===1?'':'s'} restante${a.lives===1?'':'s'} • volte ao Galaxy Gate para continuar`);
}
function updateAlphaGate(){
  if(!isGalaxyGateMap())return;
  const a=alphaGate(),run=a.run;if(!run?.active)return;
  const def=GALAXY_ALPHA_ROUNDS[run.round-1];if(!def)return;
  const now=Date.now(),alive=alphaRemainingCount();

  // Autocorreção: nunca deixa um round congelado sem timer.
  if(run.waveIndex<def.waves.length&&!run.nextWaveAt){
    run.nextWaveAt=now+GALAXY_ALPHA_WAVE_INTERVAL_MS;
  }

  if(run.waveIndex<def.waves.length&&run.nextWaveAt&&now>=run.nextWaveAt){
    run.nextWaveAt=0;
    spawnAlphaWave();
    return;
  }

  // O próximo round só é liberado depois que TODAS as ondas do atual já nasceram
  // E todos os NPCs restantes foram eliminados.
  if(run.waveIndex>=def.waves.length&&alive===0){
    if(run.round>=GALAXY_ALPHA_ROUNDS.length){completeAlphaGate();return;}
    if(!run.nextRoundAt){
      run.nextRoundAt=now+GALAXY_ALPHA_ROUND_INTERVAL_MS;
      showToast(`Round ${run.round} concluído • próximo round em 10 segundos`);
      saveGame();
    }else if(now>=run.nextRoundAt){
      run.round++;
      run.waveIndex=0;
      run.remaining={};
      run.nextRoundAt=0;
      run.nextWaveAt=now+GALAXY_ALPHA_WAVE_INTERVAL_MS;
      showToast(`ALFA • Round ${run.round} começa em 10 segundos`);
      saveGame();
    }
  }
  renderGateHud();
}

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
  if(!MAPS[mapId])return;if(mapId==='ggAlpha'){setupAlphaMap(true);return;}progress.mapId=mapId;state.currentMap=MAPS[mapId];state.radarRange=mapRadarRange();computeStats(true);
  if(!preserve){const returnPortal=fromMapId?findReturnPortal(mapId,fromMapId):null;player.x=returnPortal?returnPortal.x:(mapId==='x1'?SAFE_ZONE.x:400);player.y=returnPortal?returnPortal.y:(mapId==='x1'?SAFE_ZONE.y:state.currentMap.world.h/2);player.tx=player.x;player.ty=player.y;}
  petRuntime.x=player.x+82;petRuntime.y=player.y+64;petRuntime.tx=petRuntime.x;petRuntime.ty=petRuntime.y;state.camera.x=player.x;state.camera.y=player.y;state.target=null;state.loot=[];state.fx=[];state.rocketFx=[];createLandmarks();createOres();spawnEnemies();saveGame();showToast(mapId==='x1'?`Base ${getFaction()?.short||''} • Zona Segura`:`Entrando em ${displayMapLabel(mapId)}`);renderMapModal();
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
  const creditMult=1+pilotSkillValue('greed')/100,uriMult=1+pilotCombined('cruelty1','cruelty2')/100,xpMult=1+pilotSkillValue('tactics')/100;
  const earnedCredits=Math.round(enemy.credits*creditMult),earnedUri=Math.round(enemy.uridium*uriMult),earnedXp=Math.round((Number(enemy.xp)||enemy.credits/10+enemy.uridium*12)*xpMult);
  progress.profile.credits+=earnedCredits;progress.profile.uridium+=earnedUri;progress.profile.xp+=earnedXp;
  addPetXp(Math.max(12,Math.round(enemy.credits/120+enemy.uridium*4)));
  processPlayerLevelUps();
  const lootMult=1+pilotLootBonus(),boostedResources=Object.fromEntries(Object.entries(enemy.resources||{}).map(([id,q])=>[id,Math.max(1,Math.round(q*lootMult))]));
  state.loot.push({id:`box_${Math.random().toString(16).slice(2)}`,x:enemy.x,y:enemy.y,resources:boostedResources,source:enemy.name});
  missionEvent('kill',{enemy,mapId:progress.mapId});
  if(isGalaxyGateMap()&&enemy.gateEnemy){recordAlphaKillReward(enemy);syncAlphaGateSnapshot();}else scheduleEnemyRespawn(enemy.type);
  saveGame();
}
function dealDamageToEnemy(enemy,damage,color){
  let remain=damage;const hadShield=enemy.shield>0;if(enemy.shield>0){const a=Math.min(enemy.shield,remain);enemy.shield-=a;remain-=a;}if(remain>0)enemy.hp-=remain;
  spawnParticle(enemy.x,enemy.y-enemy.size,fmt(damage),color);spawnImpactFx(enemy.x,enemy.y,hadShield?'#55d8ff':color,hadShield?30:22,hadShield?'shield':'impact');
  if(enemy.hp<=0){enemy.hp=0;enemy.deadAt=nowSec();spawnExplosionFx(enemy.x,enemy.y,enemy.color,enemy.type.startsWith('boss'));rewardEnemyKill(enemy);if(state.target?.id===enemy.id){state.target=null;player.laserFiring=false;}}
}
function laserPveBase(ids){
  return ids.reduce((sum,id)=>{const it=ITEMS[id];const base=it?.alienDamage??it?.damage??0;return sum+base*(1+(Number(it?.alienBonus)||0));},0);
}
function applyLaserAmmoHit(enemy,baseDamage,ammo,color){
  if(!enemy||enemy.hp<=0||baseDamage<=0)return 0;
  if(ammo?.shieldDrain){
    // SAB-50: não causa dano ao casco. Drena o escudo inimigo em x2 e transfere
    // exatamente a energia capturada para o escudo da nave, limitada ao máximo.
    const requested=Math.max(0,Math.round(baseDamage*(Number(ammo.mult)||2)));
    const drained=Math.min(Math.max(0,enemy.shield||0),requested);
    if(drained<=0){spawnParticle(enemy.x,enemy.y-enemy.size,'SEM ESCUDO','#79f1ff');return 0;}
    enemy.shield=Math.max(0,enemy.shield-drained);
    const before=player.shield;
    player.shield=Math.min(player.maxShield,player.shield+drained);
    const restored=Math.max(0,Math.round(player.shield-before));
    spawnParticle(enemy.x,enemy.y-enemy.size,`SAB -${fmt(drained)} ESC`,'#79f1ff');
    spawnImpactFx(enemy.x,enemy.y,'#79f1ff',34,'shield');
    if(restored>0)spawnParticle(player.x,player.y-34,`+${fmt(restored)} ESC`,'#79f1ff');
    progress.shield=player.shield;
    return drained;
  }
  const damage=Math.max(0,Math.round(baseDamage*(Number(ammo?.mult)||1)));
  if(damage>0)dealDamageToEnemy(enemy,damage,color||ammo?.color||'#7edcff');
  return damage;
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
  const allBase=laserPveBase(laserIds);
  const firingBase=laserPveBase(firingIds);
  const fraction=allBase>0?firingBase/allBase:0;

  player.lastLaserShot=nowSec();
  progress.ammo[ammo.id]=Math.max(0,stock-firingCount);refreshAmmoCounters();
  const rawBase=Math.round((player.laserDamage*fraction)*rand(.95,1.08));
  const laserHitChance=Math.min(1,.75+pilotSkillValue('electroOptics')/100);
  if(Math.random()<=laserHitChance){if(rawBase>0)applyLaserAmmoHit(state.target,rawBase,ammo,ammo.color);}else spawnParticle(state.target.x,state.target.y-state.target.size,'MISS','#7acfff');

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
  player.lastRocketShot=nowSec();progress.rockets[r.id]=Math.max(0,(progress.rockets[r.id]||0)-1);state.rocketFx.push({sx:player.x,sy:player.y,tx:state.target.x,ty:state.target.y,color:r.color,born:nowSec(),duration:Math.max(.18,Math.min(.48,enemyDistance(state.target)/1700)),size:5});
  const rocketHitChance=Math.min(1,.90+pilotSkillValue('heatSeeking')/100);
  if(Math.random()<=rocketHitChance)dealDamageToEnemy(state.target,Math.round(r.damage*player.rocketMult),r.color);else spawnParticle(state.target.x,state.target.y-state.target.size,'MÍSSIL ERROU','#ffb36d');saveGame();
}
function takePlayerDamage(dmg){
  if(isSafeZone())return;
  if(pilotEvasion()>0&&Math.random()<pilotEvasion()){spawnParticle(player.x,player.y-35,'EVASÃO','#66d9ff');return;}
  state.lastPlayerDamageAt=nowSec();
  const hadShield=player.shield>0,absorb=Math.max(0,Math.min(100,player.shieldAbsorption))/100;let shieldPart=dmg*absorb;let hullPart=dmg-shieldPart;
  if(player.shield>0){const got=Math.min(player.shield,shieldPart);player.shield-=got;shieldPart-=got;hullPart+=shieldPart;}
  else hullPart+=shieldPart;
  player.hp-=hullPart;spawnImpactFx(player.x,player.y,hadShield?'#55d8ff':'#ff6078',hadShield?38:28,hadShield?'shield':'impact');
}
function collectCargoBox(drop){const before=cargoFree();let total=0;for(const [id,qty] of Object.entries(drop.resources||{})){const got=addCargoResource(id,qty);if(got>0){drop.resources[id]-=got;if(drop.resources[id]<=0)delete drop.resources[id];total+=got;}}if(total>0){spawnParticle(drop.x,drop.y,`+${fmt(total)} recursos`,'#ffe57b');saveGame();}if(total===0&&before<=0)showToast('Porão cheio');return Object.keys(drop.resources||{}).length===0;}

function angleDelta(from,to){return Math.atan2(Math.sin(to-from),Math.cos(to-from));}
function updatePlayer(dt){
  const dx=player.tx-player.x,dy=player.ty-player.y,d=Math.hypot(dx,dy);if(d>2){const step=Math.min(d,player.speed*dt);player.x+=dx/d*step;player.y+=dy/d*step;}
  let desiredAngle=player.angle||0;
  if(state.target&&state.target.hp>0)desiredAngle=Math.atan2(state.target.y-player.y,state.target.x-player.x);
  else if(d>3)desiredAngle=Math.atan2(dy,dx);
  player.angle=(player.angle||0)+angleDelta(player.angle||0,desiredAngle)*Math.min(1,dt*9);
  player.x=Math.max(35,Math.min(state.currentMap.world.w-35,player.x));player.y=Math.max(35,Math.min(state.currentMap.world.h-35,player.y));state.camera.x+=(player.x-state.camera.x)*.08;state.camera.y+=(player.y-state.camera.y)*.08;
  const safe=isSafeZone();
  const inCombat=!safe&&state.enemies.some(e=>e.hp>0&&enemyDistance(e)<430);
  if(!inCombat){
    const shieldRegen=(safe?.12:.045)*(1+(Number(player.shieldRegenBoost)||0));
    player.shield=Math.min(player.maxShield,player.shield+player.maxShield*shieldRegen*dt);
  }
  if(safe){
    player.hp=Math.min(player.maxHp,player.hp+player.maxHp*.08*dt);
  }else{
    const repairBot=activeRepairBot();
    if(repairBot&&player.hp<player.maxHp&&nowSec()-state.lastPlayerDamageAt>=Number(repairBot.repairDelay||5)){
      const before=player.hp;
      const repairRate=Number(repairBot.repairRate||0)*(1+pilotSkillValue('engineering')/100);
      player.hp=Math.min(player.maxHp,player.hp+player.maxHp*repairRate*dt);
      if(player.hp>before&&nowSec()-state.repairFxAt>.8){
        state.repairFxAt=nowSec();
        spawnParticle(player.x,player.y,`AUTO REPAIR +${Math.round((repairBot.repairRate||0)*100)}%/s`,'#73ffc0');
      }
    }
  }
  maybeAutoBuyAmmo();
  checkLandmarkDiscovery();
  if(player.laserFiring)fireLaserTick();
  if(autoRocketEnabled()&&player.laserFiring&&rocketReady())fireRocket(false);
  for(let i=state.loot.length-1;i>=0;i--){const l=state.loot[i];if(Math.hypot(l.x-player.x,l.y-player.y)<40){const empty=collectCargoBox(l);if(empty)state.loot.splice(i,1);}}
  for(let i=state.ores.length-1;i>=0;i--){const o=state.ores[i];if(Math.hypot(o.x-player.x,o.y-player.y)<30){const got=addCargoResource(o.type,o.amount);if(got>0){spawnParticle(o.x,o.y,`+${got} ${o.type}`,o.color);missionEvent('collectOre',{amount:got,type:o.type,mapId:progress.mapId});state.ores.splice(i,1);state.oreRespawns.push({type:o.type,at:nowSec()+rand(5,12)});saveGame();}else showToast('Porão cheio');}}
  if(player.hp<=0){
    if(isGalaxyGateMap())handleAlphaDeath();
    else{player.hp=player.maxHp;player.shield=Math.round(player.maxShield*.5);progress.profile.credits=Math.max(0,Math.round(progress.profile.credits*.95));progress.mapId='x1';state.currentMap=MAPS.x1;state.radarRange=mapRadarRange();player.x=SAFE_ZONE.x;player.y=SAFE_ZONE.y;player.tx=player.x;player.ty=player.y;state.camera.x=player.x;state.camera.y=player.y;state.target=null;player.laserFiring=false;state.fx=[];state.rocketFx=[];createLandmarks();createOres();spawnEnemies();showToast('Nave destruída. Retorno automático à Zona Segura.');saveGame();}
  }
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
    const forceChase=!!e.gateEnemy||!!e.forceChase;
    if(!playerSafe&&(forceChase||d<e.aggroRange)&&d>e.attackRange*.8){
      const nd=Math.max(1,d),nx=e.x+dx/nd*e.speed*dt,ny=e.y+dy/nd*e.speed*dt;
      if(!(progress.mapId==='x1'&&safeZoneDistance(nx,ny)<SAFE_ZONE.radius+25)){e.x=nx;e.y=ny;}
    }else if(!forceChase&&(d>e.aggroRange||playerSafe)){e.x+=Math.cos(e.angle)*e.speed*.16*dt;e.y+=Math.sin(e.angle)*e.speed*.16*dt;}
    e.x=Math.max(25,Math.min(state.currentMap.world.w-25,e.x));e.y=Math.max(25,Math.min(state.currentMap.world.h-25,e.y));
    if(!playerSafe&&d<e.attackRange&&nowSec()-e.lastShot>(e.name.includes('Boss')?1.6:1.15)){e.lastShot=nowSec();e.lastAttackPlayerAt=nowSec();takePlayerDamage(e.damage*rand(.92,1.12));spawnParticle(player.x,player.y-28,Math.round(e.damage),'#ff8080');}
  }
}
function updateParticles(dt){for(let i=state.particles.length-1;i>=0;i--){const p=state.particles[i];p.y-=p.vy*dt;p.life-=dt;if(p.life<=0)state.particles.splice(i,1);}}
function updateFx(dt){
  for(let i=state.fx.length-1;i>=0;i--){const f=state.fx[i];f.life-=dt;if(f.vx){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vx*=.985;f.vy*=.985;}if(f.life<=0)state.fx.splice(i,1);}
  const now=nowSec();for(let i=state.rocketFx.length-1;i>=0;i--)if(now-state.rocketFx[i].born>state.rocketFx[i].duration+.12)state.rocketFx.splice(i,1);
}
function update(dt){if(!progress)return;processRespawns();updatePlayer(dt);updateEnemies(dt);updatePet(dt);updateParticles(dt);updateFx(dt);updateAlphaGate();updateAuctionSystem();updateUI();}

function drawSectorGrid(){
  const spacing=800,b=visibleWorldBounds(0),startX=Math.floor(b.left/spacing)*spacing,startY=Math.floor(b.top/spacing)*spacing;
  ctx.save();ctx.strokeStyle='rgba(92,193,255,.055)';ctx.fillStyle='rgba(120,218,255,.16)';ctx.lineWidth=1;ctx.font='9px Arial';
  for(let x=startX;x<=b.right;x+=spacing){const p=screenPos(x,0);ctx.beginPath();ctx.moveTo(p.x,0);ctx.lineTo(p.x,H);ctx.stroke();if(x>=0&&x<=state.currentMap.world.w)ctx.fillText(`X${Math.round(x/100)}`,p.x+4,92);}
  for(let y=startY;y<=b.bottom;y+=spacing){const p=screenPos(0,y);ctx.beginPath();ctx.moveTo(0,p.y);ctx.lineTo(W,p.y);ctx.stroke();}
  ctx.restore();
}
function drawLandmarks(){
  for(const l of state.landmarks){if(!onScreenWorld(l.x,l.y,220))continue;const p=screenPos(l.x,l.y),d=Math.hypot(l.x-player.x,l.y-player.y),pulse=.85+Math.sin(nowSec()*2+l.x*.01)*.15;
    ctx.save();ctx.translate(p.x,p.y);ctx.strokeStyle=l.type==='wreck'?'rgba(255,187,85,.5)':l.type==='scan'?'rgba(181,112,255,.55)':'rgba(84,215,255,.55)';ctx.lineWidth=1.5;ctx.setLineDash([5,5]);ctx.beginPath();ctx.arc(0,0,20+8*pulse,0,TWO_PI);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(-8,0);ctx.lineTo(8,0);ctx.moveTo(0,-8);ctx.lineTo(0,8);ctx.stroke();ctx.restore();
    if(d<900){ctx.fillStyle='rgba(203,239,255,.72)';ctx.font='10px Arial';ctx.textAlign='center';ctx.fillText(l.name,p.x,p.y+38);}
  }
}
function drawRocketFx(){
  const now=nowSec();for(const r of state.rocketFx){const t=Math.max(0,Math.min(1,(now-r.born)/r.duration)),ease=1-Math.pow(1-t,2),x=r.sx+(r.tx-r.sx)*ease,y=r.sy+(r.ty-r.sy)*ease,p=screenPos(x,y),tail=screenPos(r.sx+(r.tx-r.sx)*Math.max(0,ease-.08),r.sy+(r.ty-r.sy)*Math.max(0,ease-.08));ctx.save();ctx.strokeStyle=r.color;ctx.shadowColor=r.color;ctx.shadowBlur=12;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(tail.x,tail.y);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(p.x,p.y,r.size,0,TWO_PI);ctx.fill();ctx.restore();}
}
function drawFx(){
  for(const f of state.fx){if(!onScreenWorld(f.x,f.y,180))continue;const p=screenPos(f.x,f.y),a=Math.max(0,f.life/(f.maxLife||1));ctx.save();ctx.globalAlpha=Math.min(1,a*1.4);ctx.translate(p.x,p.y);ctx.rotate(f.rot||0);
    if(f.type==='explosion'){const r=f.size*(1-a*.35);const g=ctx.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,'rgba(255,255,255,.95)');g.addColorStop(.18,f.color);g.addColorStop(.55,'rgba(255,126,54,.45)');g.addColorStop(1,'rgba(255,72,38,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r,0,TWO_PI);ctx.fill();ctx.strokeStyle=`rgba(255,220,145,${a})`;ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,r*.75,0,TWO_PI);ctx.stroke();}
    else if(f.type==='spark'){ctx.fillStyle=f.color;ctx.shadowColor=f.color;ctx.shadowBlur=7;ctx.beginPath();ctx.arc(0,0,f.size,0,TWO_PI);ctx.fill();}
    else {ctx.strokeStyle=f.color;ctx.shadowColor=f.color;ctx.shadowBlur=8;ctx.lineWidth=f.type==='shield'?2.4:1.6;ctx.beginPath();ctx.arc(0,0,f.size*(1.5-a*.5),0,TWO_PI);ctx.stroke();}
    ctx.restore();
  }
}
function drawNavigationOverlay(){
  const d=routeDistance();if(d<35)return;const target=screenPos(player.tx,player.ty),margin=74;ctx.save();ctx.font='bold 11px Arial';ctx.textAlign='center';
  if(target.x>margin&&target.x<W-margin&&target.y>margin&&target.y<H-margin){ctx.strokeStyle='rgba(86,220,255,.72)';ctx.setLineDash([6,6]);ctx.beginPath();ctx.arc(target.x,target.y,16+Math.sin(nowSec()*3)*3,0,TWO_PI);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#9deaff';ctx.fillText(`${fmt(d)}u`,target.x,target.y-24);}
  else{const dx=target.x-W/2,dy=target.y-H/2,a=Math.atan2(dy,dx),rx=W/2-margin,ry=H/2-margin,t=Math.min(rx/Math.max(1,Math.abs(Math.cos(a))),ry/Math.max(1,Math.abs(Math.sin(a)))),x=W/2+Math.cos(a)*t,y=H/2+Math.sin(a)*t;ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle='rgba(93,222,255,.9)';ctx.beginPath();ctx.moveTo(14,0);ctx.lineTo(-8,-8);ctx.lineTo(-4,0);ctx.lineTo(-8,8);ctx.closePath();ctx.fill();ctx.rotate(-a);ctx.fillStyle='#c8f5ff';ctx.fillText(`${fmt(d)}u`,0,-15);}
  ctx.restore();
}
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
function drawOres(){for(const o of state.ores){if(!onScreenWorld(o.x,o.y,100))continue;
  const p=screenPos(o.x,o.y),path=V8_ASSETS.resources[o.type];
  const img=v8Image(path);
  if(img&&img.naturalWidth){
    const size=Math.max(26,o.r*3.2),pulse=.94+Math.sin(nowSec()*2.4+o.x*.01)*.06;
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate((o.rot||0)+nowSec()*.08);ctx.globalAlpha=.96;ctx.shadowColor=o.color;ctx.shadowBlur=12;
    const scale=(size*pulse)/Math.max(img.naturalWidth,img.naturalHeight),w=img.naturalWidth*scale,h=img.naturalHeight*scale;ctx.drawImage(img,-w/2,-h/2,w,h);ctx.restore();continue;
  }
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(o.rot||0);ctx.shadowColor=o.color;ctx.shadowBlur=10;ctx.fillStyle=o.color;ctx.beginPath();ctx.arc(0,0,o.r,0,TWO_PI);ctx.fill();ctx.restore();
}}
function drawLoot(){for(const l of state.loot){if(!onScreenWorld(l.x,l.y,100))continue;
  const p=screenPos(l.x,l.y),pulse=.92+Math.sin(nowSec()*4+l.x*.02)*.08,img=v8Image(V8_ASSETS.loot.cargo);
  if(img&&img.naturalWidth){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.sin(nowSec()+l.x)*.06);ctx.shadowColor='#ffbd48';ctx.shadowBlur=12;const size=42*pulse,sc=size/Math.max(img.naturalWidth,img.naturalHeight);ctx.drawImage(img,-img.naturalWidth*sc/2,-img.naturalHeight*sc/2,img.naturalWidth*sc,img.naturalHeight*sc);ctx.restore();continue;}
  ctx.fillStyle='#f5b84c';ctx.fillRect(p.x-10,p.y-10,20,20);
}}
function drawNpcModel(e){const boss=e.type.startsWith('boss');const type=e.type.toLowerCase();ctx.save();if(boss){ctx.strokeStyle='rgba(255,76,104,.55)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,e.size+7+Math.sin(nowSec()*4)*2,0,TWO_PI);ctx.stroke();}ctx.shadowColor=e.color;ctx.shadowBlur=boss?20:10;const s=e.size;const fill=ctx.createLinearGradient(-s,-s,s,s);fill.addColorStop(0,'rgba(255,255,255,.92)');fill.addColorStop(.22,e.color);fill.addColorStop(1,'rgba(18,26,48,.96)');ctx.fillStyle=fill;ctx.strokeStyle='rgba(255,255,255,.42)';ctx.lineWidth=1.1;
  if(type.includes('streuner')){ctx.beginPath();ctx.moveTo(s,0);ctx.lineTo(-s*.05,-s*.5);ctx.lineTo(-s*.5,-s*.26);ctx.lineTo(-s*.15,0);ctx.lineTo(-s*.5,s*.26);ctx.lineTo(-s*.05,s*.5);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='rgba(9,21,37,.86)';ctx.beginPath();ctx.arc(s*.16,0,s*.18,0,TWO_PI);ctx.fill();}
  else if(type.includes('lordakia')){ctx.beginPath();for(let i=0;i<6;i++){const a=i*TWO_PI/6,r=i%2?s*.55:s;const x=Math.cos(a)*r,y=Math.sin(a)*r;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='rgba(27,8,47,.9)';ctx.beginPath();ctx.arc(0,0,s*.3,0,TWO_PI);ctx.fill();ctx.strokeStyle=e.color;ctx.beginPath();ctx.moveTo(-s*.8,0);ctx.lineTo(s*.8,0);ctx.stroke();}
  else if(type.includes('saimon')){ctx.beginPath();ctx.moveTo(s,0);ctx.lineTo(s*.2,-s*.54);ctx.lineTo(-s*.7,-s*.74);ctx.lineTo(-s*.28,0);ctx.lineTo(-s*.7,s*.74);ctx.lineTo(s*.2,s*.54);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='rgba(9,22,37,.92)';ctx.fillRect(-s*.18,-s*.16,s*.5,s*.32);}
  else if(type.includes('mordon')){ctx.beginPath();ctx.moveTo(s,0);ctx.lineTo(s*.2,-s*.72);ctx.lineTo(-s*.58,-s*.42);ctx.lineTo(-s*.95,0);ctx.lineTo(-s*.58,s*.42);ctx.lineTo(s*.2,s*.72);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='rgba(52,19,9,.92)';ctx.beginPath();ctx.arc(-s*.08,0,s*.28,0,TWO_PI);ctx.fill();}
  else if(type.includes('devolarium')){ctx.beginPath();ctx.ellipse(0,0,s,s*.62,0,0,TWO_PI);ctx.fill();ctx.stroke();ctx.fillStyle='rgba(6,20,34,.92)';ctx.beginPath();ctx.ellipse(s*.12,0,s*.44,s*.25,0,0,TWO_PI);ctx.fill();ctx.strokeStyle=e.color;ctx.beginPath();ctx.moveTo(-s*.85,-s*.38);ctx.lineTo(-s*1.18,-s*.7);ctx.moveTo(-s*.85,s*.38);ctx.lineTo(-s*1.18,s*.7);ctx.moveTo(s*.6,-s*.24);ctx.lineTo(s*.98,-s*.5);ctx.moveTo(s*.6,s*.24);ctx.lineTo(s*.98,s*.5);ctx.stroke();}
  else {ctx.beginPath();for(let i=0;i<8;i++){const a=i*TWO_PI/8,r=i%2?s*.68:s;const x=Math.cos(a)*r,y=Math.sin(a)*r;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='rgba(8,35,28,.9)';ctx.beginPath();ctx.arc(0,0,s*.34,0,TWO_PI);ctx.fill();}
ctx.shadowBlur=0;ctx.restore();}
function drawEnemy(e){
  const p=screenPos(e.x,e.y),boss=e.type.startsWith('boss'),img=v8Image(V8_ASSETS.npcs[e.type]);
  ctx.save();ctx.translate(p.x,p.y);
  if(state.target?.id===e.id){ctx.strokeStyle='rgba(255,74,95,.98)';ctx.lineWidth=2;ctx.setLineDash([6,4]);ctx.beginPath();ctx.arc(0,0,e.size+15+Math.sin(nowSec()*5)*1.5,0,TWO_PI);ctx.stroke();ctx.setLineDash([]);}
  if(img&&img.naturalWidth){
    const face=Math.atan2(player.y-e.y,player.x-e.x)+Math.PI/2,size=e.size*(boss?3.35:3.05),sc=size/Math.max(img.naturalWidth,img.naturalHeight);
    ctx.rotate(face);ctx.shadowColor=boss?'#ff405a':e.color;ctx.shadowBlur=boss?20:10;ctx.drawImage(img,-img.naturalWidth*sc/2,-img.naturalHeight*sc/2,img.naturalWidth*sc,img.naturalHeight*sc);
  }else drawNpcModel(e);
  ctx.restore();
  const hp=e.hp/e.maxHp,sh=e.maxShield?e.shield/e.maxShield:0,barW=Math.max(34,e.size*2.4),bx=p.x-barW/2;
  ctx.fillStyle='rgba(48,8,16,.86)';ctx.fillRect(bx,p.y-e.size-21,barW,5);ctx.fillStyle='#ff4f67';ctx.fillRect(bx,p.y-e.size-21,barW*hp,5);
  ctx.fillStyle='rgba(8,26,44,.86)';ctx.fillRect(bx,p.y-e.size-14,barW,4);ctx.fillStyle='#49cfff';ctx.fillRect(bx,p.y-e.size-14,barW*sh,4);
  ctx.fillStyle=boss?'#ffcf71':'#ff958d';ctx.font=`bold ${boss?12:11}px Arial`;ctx.textAlign='center';ctx.fillText(e.name,p.x,p.y+e.size+22);
}
function drawDrones(p){const f=getFaction();progress.drones.forEach((d,i)=>{
  const a=nowSec()*.8+i*TWO_PI/Math.max(1,progress.drones.length),r=66+(i%2)*18,x=p.x+Math.cos(a)*r,y=p.y+Math.sin(a)*r,img=v8Image(V8_ASSETS.drones[d.type]);
  if(img&&img.naturalWidth){const size=d.type==='iris'?26:23,sc=size/Math.max(img.naturalWidth,img.naturalHeight);ctx.save();ctx.translate(x,y);ctx.rotate(a+Math.PI);ctx.shadowColor=d.type==='iris'?'#c77cff':'#71dfff';ctx.shadowBlur=8;ctx.drawImage(img,-img.naturalWidth*sc/2,-img.naturalHeight*sc/2,img.naturalWidth*sc,img.naturalHeight*sc);ctx.restore();return;}
  ctx.fillStyle=d.type==='iris'?'#bd7cff':'#71dfff';ctx.beginPath();ctx.arc(x,y,4,0,TWO_PI);ctx.fill();
});}
function drawPet(){
  if(!progress?.pet?.owned)return;
  const p=screenPos(petRuntime.x,petRuntime.y),mode=progress.pet.activeGear||'off',color=mode==='guard'?'#ff8c93':mode==='box'?'#ffd46b':mode==='ore'?'#7fffc4':'#7edcff';
  const path=progress.pet.level>=10?V8_ASSETS.drones.petElite:V8_ASSETS.drones.pet,img=v8Image(path);
  if(img&&img.naturalWidth){const size=34+(progress.pet.level/15)*10,sc=size/Math.max(img.naturalWidth,img.naturalHeight);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(nowSec()*.6);ctx.shadowColor=color;ctx.shadowBlur=12;ctx.drawImage(img,-img.naturalWidth*sc/2,-img.naturalHeight*sc/2,img.naturalWidth*sc,img.naturalHeight*sc);ctx.restore();}
  else{ctx.fillStyle=color;ctx.beginPath();ctx.arc(p.x,p.y,8,0,TWO_PI);ctx.fill();}
  ctx.fillStyle=color;ctx.font='bold 10px Arial';ctx.textAlign='center';ctx.fillText(`P.E.T. LV ${progress.pet.level}`,p.x,p.y+28);
  if(petRuntime.laserTargetId&&nowSec()<petRuntime.laserUntil){const e=state.enemies.find(x=>x.id===petRuntime.laserTargetId&&x.hp>0);if(e){const t=screenPos(e.x,e.y);ctx.strokeStyle=currentLaserAmmo().color;ctx.shadowColor=currentLaserAmmo().color;ctx.shadowBlur=8;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(t.x,t.y);ctx.stroke();ctx.shadowBlur=0;}}
}
function drawShipModel(id,color){ctx.shadowColor=color;ctx.shadowBlur=18;ctx.strokeStyle='rgba(230,250,255,.65)';ctx.lineWidth=1.2;const fill=ctx.createLinearGradient(-26,-16,28,16);fill.addColorStop(0,'#ebfcff');fill.addColorStop(.2,color);fill.addColorStop(.72,'#25345d');fill.addColorStop(1,'#11182f');ctx.fillStyle=fill;ctx.beginPath();
  if(id==='phoenix'){ctx.moveTo(25,0);ctx.lineTo(-12,-12);ctx.lineTo(-4,0);ctx.lineTo(-12,12);}
  else if(id==='liberator'){ctx.moveTo(27,0);ctx.lineTo(6,-6);ctx.lineTo(-14,-14);ctx.lineTo(-10,-4);ctx.lineTo(-20,0);ctx.lineTo(-10,4);ctx.lineTo(-14,14);ctx.lineTo(6,6);}
  else if(id==='piranha'||id==='vengeance'){ctx.moveTo(30,0);ctx.lineTo(3,-6);ctx.lineTo(-18,-16);ctx.lineTo(-11,-3);ctx.lineTo(-25,0);ctx.lineTo(-11,3);ctx.lineTo(-18,16);ctx.lineTo(3,6);}
  else if(id==='leonov'){ctx.moveTo(24,0);ctx.lineTo(8,-12);ctx.lineTo(-12,-9);ctx.lineTo(-18,0);ctx.lineTo(-12,9);ctx.lineTo(8,12);}
  else if(id==='nostromo'){ctx.moveTo(26,0);ctx.lineTo(8,-10);ctx.lineTo(-18,-12);ctx.lineTo(-24,-5);ctx.lineTo(-24,5);ctx.lineTo(-18,12);ctx.lineTo(8,10);}
  else if(id==='bigboy'||id==='citadel'){ctx.moveTo(25,0);ctx.lineTo(10,-14);ctx.lineTo(-17,-16);ctx.lineTo(-27,-7);ctx.lineTo(-27,7);ctx.lineTo(-17,16);ctx.lineTo(10,14);}
  else if(id==='spearhead'){ctx.moveTo(33,0);ctx.lineTo(2,-5);ctx.lineTo(-21,-10);ctx.lineTo(-12,0);ctx.lineTo(-21,10);ctx.lineTo(2,5);}
  else if(id==='aegis'){ctx.moveTo(25,0);ctx.lineTo(8,-9);ctx.lineTo(-8,-8);ctx.lineTo(-18,-17);ctx.lineTo(-17,-5);ctx.lineTo(-25,0);ctx.lineTo(-17,5);ctx.lineTo(-18,17);ctx.lineTo(-8,8);ctx.lineTo(8,9);}
  else {ctx.moveTo(29,0);ctx.lineTo(9,-9);ctx.lineTo(-10,-15);ctx.lineTo(-18,-7);ctx.lineTo(-25,0);ctx.lineTo(-18,7);ctx.lineTo(-10,15);ctx.lineTo(9,9);}
ctx.closePath();ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='rgba(5,13,25,.9)';ctx.beginPath();ctx.ellipse(6,0,7.5,3.8,0,0,TWO_PI);ctx.fill();ctx.fillStyle='#f4ffff';ctx.beginPath();ctx.arc(8,0,1.6,0,TWO_PI);ctx.fill();ctx.fillStyle='#b47bff';ctx.fillRect(-25,-2.2,8,4.4);ctx.fillStyle='rgba(255,255,255,.34)';ctx.fillRect(-2,-8,12,2.2);ctx.fillRect(-8,6,9,1.6);}
function drawPlayer(){
  const p=screenPos(player.x,player.y),f=getFaction(),a=player.angle||0,color=f?.color||'#76e0ff',path=V8_ASSETS.ships[progress.activeShipId],img=v8Image(path);
  ctx.save();ctx.translate(p.x,p.y);
  if(img&&img.naturalWidth){
    const ship=SHIPS[progress.activeShipId],size=(ship.id==='citadel'?105:ship.id==='bigboy'?96:ship.id==='goliath'||ship.id==='aegis'?88:78),sc=size/Math.max(img.naturalWidth,img.naturalHeight);
    ctx.rotate((a||0)+Math.PI/2);ctx.shadowColor=color;ctx.shadowBlur=14;ctx.drawImage(img,-img.naturalWidth*sc/2,-img.naturalHeight*sc/2,img.naturalWidth*sc,img.naturalHeight*sc);
  }else{ctx.rotate(a||0);drawShipModel(progress.activeShipId,color);}
  ctx.restore();drawDrones(p);
  ctx.strokeStyle='rgba(119,228,255,.23)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(p.x,p.y,25,0,TWO_PI);ctx.stroke();
  ctx.fillStyle=color;ctx.font='bold 12px Arial';ctx.textAlign='center';ctx.shadowColor='rgba(0,0,0,.85)';ctx.shadowBlur=4;ctx.fillText(progress.profile.callsign||getUser()?.callsign||'Pilot',p.x,p.y+38);ctx.shadowBlur=0;
  if(player.laserFiring&&state.target&&state.target.hp>0&&enemyDistance(state.target)<=playerLaserRange()){const t=screenPos(state.target.x,state.target.y);ctx.strokeStyle=currentLaserAmmo().color;ctx.shadowColor=currentLaserAmmo().color;ctx.shadowBlur=9;ctx.lineWidth=2.3;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(t.x,t.y);ctx.stroke();ctx.shadowBlur=0;}
}
function drawParticles(){ctx.font='12px Arial';ctx.textAlign='center';for(const p of state.particles){const q=screenPos(p.x,p.y);ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.fillText(p.text,q.x,q.y);}ctx.globalAlpha=1;}
function drawMinimap(){
  mm.clearRect(0,0,minimap.width,minimap.height);const bg=mm.createLinearGradient(0,0,0,minimap.height);bg.addColorStop(0,'#081522');bg.addColorStop(1,'#040b14');mm.fillStyle=bg;mm.fillRect(0,0,minimap.width,minimap.height);mm.strokeStyle='rgba(75,180,255,.5)';mm.strokeRect(1,1,minimap.width-2,minimap.height-2);
  const sx=minimap.width/state.currentMap.world.w,sy=minimap.height/state.currentMap.world.h;
  mm.strokeStyle='rgba(78,180,255,.08)';mm.lineWidth=.7;for(let x=0;x<=state.currentMap.world.w;x+=1000){mm.beginPath();mm.moveTo(x*sx,0);mm.lineTo(x*sx,minimap.height);mm.stroke();}for(let y=0;y<=state.currentMap.world.h;y+=1000){mm.beginPath();mm.moveTo(0,y*sy);mm.lineTo(minimap.width,y*sy);mm.stroke();}
  if(progress.mapId==='x1'){mm.strokeStyle='rgba(100,255,190,.65)';mm.lineWidth=2;mm.beginPath();mm.arc(SAFE_ZONE.x*sx,SAFE_ZONE.y*sy,SAFE_ZONE.radius*Math.min(sx,sy),0,TWO_PI);mm.stroke();}
  for(const p of resolvedPortals()){mm.fillStyle='#56dbff';mm.beginPath();mm.arc(p.x*sx,p.y*sy,4,0,TWO_PI);mm.fill();}
  for(const l of state.landmarks){mm.fillStyle=l.type==='wreck'?'#ffc45a':l.type==='scan'?'#bd78ff':'#4fd7ff';mm.fillRect(l.x*sx-1,l.y*sy-1,2,2);}
  const px=player.x*sx,py=player.y*sy,tx=player.tx*sx,ty=player.ty*sy,rad=state.radarRange*Math.min(sx,sy);mm.strokeStyle='rgba(130,220,255,.22)';mm.lineWidth=1;mm.beginPath();mm.arc(px,py,rad,0,TWO_PI);mm.stroke();
  if(routeDistance()>35){mm.strokeStyle='rgba(115,225,255,.55)';mm.setLineDash([4,3]);mm.beginPath();mm.moveTo(px,py);mm.lineTo(tx,ty);mm.stroke();mm.setLineDash([]);mm.strokeStyle='#fff';mm.beginPath();mm.arc(tx,ty,4,0,TWO_PI);mm.stroke();}
  for(const e of state.enemies){if(e.hp<=0||Math.hypot(e.x-player.x,e.y-player.y)>state.radarRange)continue;mm.fillStyle=state.target?.id===e.id?'#ff345e':'#ff755d';mm.beginPath();mm.arc(e.x*sx,e.y*sy,e.type.startsWith('boss')?2.6:1.8,0,TWO_PI);mm.fill();}
  for(const o of state.ores){if(Math.hypot(o.x-player.x,o.y-player.y)>state.radarRange*.8)continue;mm.fillStyle=o.color;mm.beginPath();mm.arc(o.x*sx,o.y*sy,1.3,0,TWO_PI);mm.fill();}
  mm.fillStyle=getFaction()?.color||'#fff';mm.beginPath();mm.arc(px,py,4.5,0,TWO_PI);mm.fill();mm.strokeStyle='rgba(255,255,255,.7)';mm.stroke();
}
function draw(){ctx.clearRect(0,0,W,H);if(!progress){drawNebula();drawStars();return;}if(!drawMapBackground())drawNebula();drawStars();drawSectorGrid();drawBounds();drawLandmarks();drawBaseSafeZone();drawPortals();drawOres();drawLoot();state.enemies.forEach(e=>e.hp>0&&onScreenWorld(e.x,e.y,180)&&drawEnemy(e));drawRocketFx();drawPlayer();drawPet();drawFx();drawParticles();drawNavigationOverlay();drawMinimap();}

function ammoWarningClass(qty,perUse){
  if(qty<=0)return 'empty';
  const uses=perUse>0?Math.floor(qty/perUse):qty;
  if(uses<=3)return 'critical';
  if(uses<=10)return 'low';
  return '';
}
function refreshAmmoCounters(){
  if(!progress)return;
  const laserUse=Math.max(1,equippedLaserCount()+petLaserIds().length);
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
    b.innerHTML=`<img class="ammo-art" src="${V8_ASSETS.ammo[a.id]}" alt=""><span class="ammo-code">${shortLaserLabel(a.id)}</span><span class="ammo-qty"></span>`;
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
    b.innerHTML=`<img class="ammo-art" src="${V8_ASSETS.ammo[r.id]}" alt=""><span class="ammo-code">${shortRocketLabel(r.id)}</span><span class="ammo-qty"></span>`;
    b.onclick=()=>{progress.selectedRocket=r.id;refreshAmmoCounters();saveGame();};
    ui.rocketAmmoButtons.appendChild(b);
  });
  refreshAmmoCounters();
}

function updateExtraControls(){ return; }
function updateUI(){
  refreshAmmoCounters();
  const f=getFaction(),ship=SHIPS[progress.activeShipId],safe=isSafeZone();ui.factionLabel.textContent=f?.short||'—';ui.factionLabel.style.color=f?.color||'';ui.mapLabel.textContent=displayMapLabel(progress.mapId);if(ui.sectorName)ui.sectorName.textContent=state.currentMap.name||'Setor';if(ui.coordLabel)ui.coordLabel.textContent=`${Math.round(player.x)} / ${Math.round(player.y)}`;if(ui.routeLabel){const rd=routeDistance();ui.routeLabel.textContent=rd>35?`${fmt(rd)}u`:'PARADO';ui.routeLabel.parentElement?.classList.toggle('active',rd>35);}if(ui.discoveriesLabel){const found=state.landmarks.filter(l=>progress.discoveries?.[`${progress.mapId}:${l.id}`]).length;ui.discoveriesLabel.textContent=`${found}/${state.landmarks.length}`;}ui.shipLabel.textContent=ship.name;ui.lvl.textContent=progress.profile.level;ui.hp.textContent=fmt(player.hp);ui.maxHp.textContent=fmt(player.maxHp);ui.shield.textContent=fmt(player.shield);ui.maxShield.textContent=fmt(player.maxShield);ui.speed.textContent=fmt(player.speed);if(ui.dmg)ui.dmg.textContent=fmt(player.laserDamage*currentLaserAmmo().mult);ui.credits.textContent=fmt(progress.profile.credits);ui.uridium.textContent=fmt(progress.profile.uridium);ui.xp.textContent=fmt(progress.profile.xp);ui.xp.title=progress.profile.level>=PLAYER_MAX_LEVEL?'Nível máximo':`Próximo nível: ${fmt(levelXpThreshold(progress.profile.level+1))} XP • ${Math.round(levelProgressPercent(progress.profile.xp,progress.profile.level))}%`;if(ui.droneCount)ui.droneCount.textContent=progress.drones.length;ui.laserToggle.classList.toggle('active',player.laserFiring);ui.rocketCd.textContent=rocketReady()?'MÍSSIL PRONTO':`MÍSSIL ${(getRocketCooldown()-(nowSec()-player.lastRocketShot)).toFixed(1)}s`;
  if(ui.shipHudArt)ui.shipHudArt.src=V8_ASSETS.ships[progress.activeShipId]||V8_ASSETS.ships.phoenix;
  if(ui.factionIcon)ui.factionIcon.src=factionAsset(progress.profile.faction);
  ui.userLabel.textContent=progress.profile.callsign||getUser()?.callsign||'Pilot';if(ui.petBtn)ui.petBtn.textContent=progress.pet?.owned?`P.E.T. LV${progress.pet.level}`:'P.E.T. LOJA';ui.safeZoneLabel.textContent=safe?'ZONA SEGURA ATIVA':'FORA DA BASE';ui.safeZoneLabel.classList.toggle('active',safe);ui.cargoUsed.textContent=fmt(cargoUsed());ui.cargoMax.textContent=fmt(cargoCapacity());ui.cargoBtn.classList.toggle('gold',isAtTrader());
  if(state.target&&state.target.hp>0){ui.targetName.textContent=state.target.name;ui.targetStats.textContent=`HP ${fmt(state.target.hp)} • ESC ${fmt(state.target.shield)}`;ui.targetHpBar.style.width=`${state.target.hp/state.target.maxHp*100}%`;ui.targetShieldBar.style.width=`${state.target.maxShield?state.target.shield/state.target.maxShield*100:0}%`;}else{ui.targetName.textContent='Sem alvo';ui.targetStats.textContent='Toque em um NPC para selecionar';ui.targetHpBar.style.width='0%';ui.targetShieldBar.style.width='0%';}
  ui.shopCredits.textContent=fmt(progress.profile.credits);ui.shopUridium.textContent=fmt(progress.profile.uridium);ui.hangarShipName.textContent=ship.name;updateExtraControls();
  const portal=nearbyPortal();if(portal&&!state.jumping&&ui.portalPrompt){const pos=screenPos(portal.x,portal.y);ui.portalPrompt.style.left=`${Math.max(85,Math.min(W-85,pos.x))}px`;ui.portalPrompt.style.top=`${Math.max(115,Math.min(H-90,pos.y-58))}px`;ui.portalPromptMap.textContent=`Destino ${displayMapLabel(portal.to)} • clique ou J`;ui.portalPrompt.classList.remove('hidden');}else ui.portalPrompt?.classList.add('hidden');
}

function canAfford(price,currency){return currency==='credits'?progress.profile.credits>=price:progress.profile.uridium>=price;}
function charge(price,currency){if(!canAfford(price,currency))return false;if(currency==='credits')progress.profile.credits-=price;else progress.profile.uridium-=price;return true;}
function priceText(p,c){return `${fmt(p)} ${c==='credits'?'CR':'URI'}`;}
function productIcon(type,subtype){return type==='ship'?'🛸':type==='laser'?'⚡':type==='generator'?(subtype==='speed'?'💨':'🛡️'):type==='drone'?'◆':type==='pet'?'🤖':type==='extra'?'🧩':type==='ammo'?'✦':'🚀';}

function buyShip(shipId){const ship=SHIPS[shipId];if(!ship)return;if(ship.eventOnly||ship.shopAvailable===false){showToast(`${ship.name}: nave reservada para Evento / Missão / Passe`);return;}if(progress.ownedShips.includes(shipId)){showToast('Nave já obtida');return;}if(!charge(ship.price,ship.currency)){showToast('Saldo insuficiente');return;}progress.ownedShips.push(shipId);saveGame();renderShop();showToast(`${ship.name} adicionada ao Hangar`);}
function buyItem(itemId){const item=ITEMS[itemId];if(item.type==='drone'){buyDrone(itemId);return;}if(!charge(item.price,item.currency)){showToast('Saldo insuficiente');return;}addInventory(itemId);saveGame();renderShop();if(!ui.hangarModal.classList.contains('hidden'))renderHangar();showToast(`${item.name} comprado`);}
function buyDrone(type){if(progress.drones.length>=8){showToast('Limite de 8 drones atingido');return;}const item=ITEMS[type];if(!charge(item.price,item.currency)){showToast('Saldo insuficiente');return;}progress.drones.push({id:`d_${Date.now()}_${Math.random().toString(16).slice(2,5)}`,type,slots:Array(item.slots).fill(null)});computeStats(true);saveGame();renderShop();showToast(`${item.name} adquirido (${progress.drones.length}/8)`);}
function buyAmmo(id){if(!buyAmmoPack(id,false)){showToast('Saldo insuficiente');return;}buildAmmoButtons();renderShop();}
function buyRockets(id){if(!buyRocketPack(id,false)){showToast('Saldo insuficiente');return;}buildAmmoButtons();renderShop();}

function renderTabs(container,map,active,onPick){container.innerHTML='';for(const [id,label] of Object.entries(map)){const b=document.createElement('button');b.className=`tab-btn ${active===id?'active':''}`;b.textContent=label;b.onclick=()=>onPick(id);container.appendChild(b);}}
function makeProductCard({id,name,desc,price,currency,type,subtype,badge,owned,onBuy,disabled=false,priceLabel=null,buttonLabel=null}){
  const card=document.createElement('div');card.className='product-card';
  const art=assetForProduct(id,type,subtype);
  card.innerHTML=`<div class="product-icon">${art?`<img src="${art}" alt="${name}" loading="lazy">`:productIcon(type,subtype)}</div><div>${badge?`<span class="badge ${badge==='ELITE'?'elite':''}">${badge}</span>`:''}<h3>${name}</h3></div><div class="product-desc">${desc}</div><div class="price ${currency}">${owned?'OBTIDO':(priceLabel||priceText(price,currency))}</div>`;
  const b=document.createElement('button');b.className='buy-btn';b.textContent=owned?'Obtido':(buttonLabel||'Comprar');b.disabled=owned||disabled;b.onclick=onBuy;card.appendChild(b);return card;
}
function renderShop(){
  if(!progress)return;renderTabs(ui.shopTabs,categories,state.shopTab,id=>{state.shopTab=id;renderShop();});ui.shopGrid.innerHTML='';
  if(state.shopTab==='ships')Object.values(SHIPS).forEach(s=>{const event=!!s.eventOnly||s.shopAvailable===false;ui.shopGrid.appendChild(makeProductCard({id:s.id,name:s.name,desc:`${s.role}<br>HP ${fmt(s.hp)} • ${s.lasers} lasers • ${s.generators} geradores • ${s.extras} extras • VEL ${s.speed}${s.ability?`<br><b>Habilidade:</b> ${s.ability}`:''}`,price:s.price,currency:s.currency,type:'ship',badge:event?'EVENTO':(s.currency==='uridium'?'ELITE':'COMUM'),owned:progress.ownedShips.includes(s.id),disabled:event&&!progress.ownedShips.includes(s.id),priceLabel:event?'EVENTO / MISSÃO / PASSE':null,buttonLabel:event?'BLOQUEADA':null,onBuy:()=>buyShip(s.id)}));});
  if(state.shopTab==='lasers')Object.values(ITEMS).filter(i=>i.type==='laser'&&i.shopAvailable!==false).forEach(i=>ui.shopGrid.appendChild(makeProductCard({id:i.id,name:i.name,desc:`Dano base: <b>${i.damage}</b>${i.alienDamage?` • Alien ${i.alienDamage}`:''}${i.alienBonus?` • +${Math.round(i.alienBonus*100)}% PvE`:''}<br>${i.description}`,price:i.price,currency:i.currency,type:i.type,badge:i.currency==='uridium'?'ELITE':'COMUM',onBuy:()=>buyItem(i.id)})));
  if(state.shopTab==='generators')Object.values(ITEMS).filter(i=>i.type==='generator').forEach(i=>{const event=!!i.eventOnly||i.shopAvailable===false;ui.shopGrid.appendChild(makeProductCard({id:i.id,name:i.name,desc:i.description,price:i.price,currency:i.currency,type:i.type,subtype:i.subtype,badge:event?'EVENTO':(i.currency==='uridium'?'ELITE':'COMUM'),disabled:event,priceLabel:event?'EVENTO / MISSÃO':null,buttonLabel:event?'BLOQUEADO':null,onBuy:()=>buyItem(i.id)}));});
  if(state.shopTab==='pet')ui.shopGrid.appendChild(makeProductCard({id:'petBaseUnit',name:'P.E.T. — Unidade Base',desc:`Companheiro autônomo com progressão até o nível ${PET_MAX_LEVEL}. Armas, escudos e módulos são comprados separadamente.`,price:PET_BASE_PRICE,currency:'uridium',type:'pet',badge:'ELITE',owned:!!progress.pet?.owned,onBuy:()=>buyPetUnit()}));
  if(state.shopTab==='drones')Object.values(ITEMS).filter(i=>i.type==='drone').forEach(i=>ui.shopGrid.appendChild(makeProductCard({id:i.id,name:i.name,desc:`${i.description}<br>Você possui ${progress.drones.filter(d=>d.type===i.id).length}. Total: ${progress.drones.length}/8`,price:i.price,currency:i.currency,type:i.type,badge:i.id==='iris'?'ELITE':'COMUM',disabled:progress.drones.length>=8,onBuy:()=>buyDrone(i.id)})));
  if(state.shopTab==='extras')Object.values(ITEMS).filter(i=>i.type==='extra').forEach(i=>ui.shopGrid.appendChild(makeProductCard({id:i.id,name:i.name,desc:i.description,price:i.price,currency:i.currency,type:i.type,badge:i.currency==='uridium'?'ELITE':'COMUM',onBuy:()=>buyItem(i.id)})));
  if(state.shopTab==='ammo')Object.values(LASER_AMMO).forEach(a=>ui.shopGrid.appendChild(makeProductCard({id:a.id,name:a.name,desc:`Pacote com ${fmt(a.pack)} disparos • ${a.shieldDrain?'captura escudo x2':`dano x${a.mult}`}<br>Em estoque: ${fmt(ammoQty(a.id))}`,price:a.price,currency:a.currency,type:'ammo',badge:a.currency==='uridium'?'ELITE':'COMUM',onBuy:()=>buyAmmo(a.id)})));
  if(state.shopTab==='rockets')Object.values(ROCKETS).forEach(r=>ui.shopGrid.appendChild(makeProductCard({id:r.id,name:r.name,desc:`Pacote com ${fmt(r.pack)} mísseis • dano ${fmt(r.damage)}<br>Em estoque: ${fmt(rocketQty(r.id))}`,price:r.price,currency:r.currency,type:'rocket',badge:r.currency==='uridium'?'ELITE':'COMUM',onBuy:()=>buyRockets(r.id)})));
  updateUI();
}

function returnShipEquipmentToInventory(){for(const k of ['lasers','generators','extras'])for(const id of progress.shipLoadout[k])if(id)addInventory(id);}
function switchShip(shipId){if(!progress.ownedShips.includes(shipId)){showToast('Compre essa nave na Loja');return;}if(shipId===progress.activeShipId)return;returnShipEquipmentToInventory();progress.activeShipId=shipId;progress.shipLoadout=blankLoadout(shipId);player.laserFiring=false;computeStats(false);saveGame();renderHangar();buildAmmoButtons();showToast(`${SHIPS[shipId].name} ativada. Equipamentos antigos voltaram ao inventário.`);}
function equipShipItem(itemId){
  const item=ITEMS[itemId];const key=item.type==='laser'?'lasers':item.type==='generator'?'generators':item.type==='extra'?'extras':null;if(!key)return;
  if(key==='extras'&&item.exclusiveGroup){
    const conflict=progress.shipLoadout.extras.find(id=>id&&id!==itemId&&ITEMS[id]?.exclusiveGroup===item.exclusiveGroup);
    if(conflict){showToast(`Remova primeiro: ${ITEMS[conflict].name}`);return;}
  }
  if(!removeInventory(itemId)){showToast('Item não disponível');return;}
  const idx=progress.shipLoadout[key].findIndex(v=>!v);
  if(idx<0){addInventory(itemId);showToast('Sem slot livre na nave');return;}
  progress.shipLoadout[key][idx]=itemId;
  if(key==='extras')normalizeLoadout();
  computeStats(true);saveGame();renderHangar();buildAmmoButtons();updateExtraControls();
  if(item.slotBonus)showToast(`${item.name}: +${item.slotBonus} slots EXTRAS liberados`);
}
function unequipShipSlot(key,index){
  const id=progress.shipLoadout[key][index];if(!id)return;
  const wasExpansion=Number(ITEMS[id]?.slotBonus)||0;
  progress.shipLoadout[key][index]=null;addInventory(id);
  let overflow=0;
  if(key==='extras'){
    for(const flag of ['autoLaser','autoRocket','turboRocket'])progress.flags[flag]=false;
    overflow=normalizeLoadout();
  }
  computeStats(true);saveGame();renderHangar();buildAmmoButtons();
  if(wasExpansion&&overflow>0)showToast(`${overflow} equipamento${overflow>1?'s':''} excedente${overflow>1?'s':''} voltou${overflow>1?'aram':''} ao inventário`);
}
function equipDroneItem(itemId){const item=ITEMS[itemId];if(!(item.type==='laser'||(item.type==='generator'&&item.subtype==='shield'))){showToast('Drones aceitam lasers ou geradores de escudo');return;}const drone=progress.drones.find(d=>d.slots.some(v=>!v));if(!drone){showToast('Nenhum slot livre nos drones');return;}if(!removeInventory(itemId))return;drone.slots[drone.slots.findIndex(v=>!v)]=itemId;computeStats(true);saveGame();renderHangar();buildAmmoButtons();}
function unequipDroneSlot(droneId,index){const d=progress.drones.find(x=>x.id===droneId);if(!d||!d.slots[index])return;addInventory(d.slots[index]);d.slots[index]=null;computeStats(true);saveGame();renderHangar();buildAmmoButtons();}
function sellDrone(droneId){const d=progress.drones.find(x=>x.id===droneId);if(!d)return;d.slots.filter(Boolean).forEach(addInventory);progress.drones=progress.drones.filter(x=>x.id!==droneId);computeStats(true);saveGame();renderHangar();buildAmmoButtons();showToast('Drone removido; equipamentos voltaram ao inventário');}

function slotCard(label,itemId,key,index,droneId=null){
  const el=document.createElement('div');el.className=`slot-card ${itemId?'':'empty'}`;const item=itemId?ITEMS[itemId]:null,art=item?V8_ASSETS.equipment[itemId]:null;
  el.innerHTML=`<div class="slot-label">${label}</div>${item&&art?`<img class="slot-item-art" src="${art}" alt="${item.name}">`:''}<div class="slot-item">${item?item.name:'VAZIO'}</div>${item?`<div class="muted" style="font-size:10px">${item.description}</div>`:''}`;
  if(item){const a=document.createElement('div');a.className='slot-actions';const b=document.createElement('button');b.className='ghost-btn';b.textContent='Remover';b.onclick=()=>droneId?unequipDroneSlot(droneId,index):unequipShipSlot(key,index);a.appendChild(b);el.appendChild(a);}return el;
}
function inventoryCard(itemId,count){
  const item=ITEMS[itemId],art=V8_ASSETS.equipment[itemId];const el=document.createElement('div');el.className='inventory-card';
  el.innerHTML=`${art?`<img class="inventory-item-art" src="${art}" alt="${item.name}">`:''}<b>${item.name}</b><div class="qty">Quantidade: ${count}</div><div class="muted" style="font-size:10px;margin-top:4px">${item.description}</div>`;
  const actions=document.createElement('div');actions.className='inventory-actions';const shipBtn=document.createElement('button');shipBtn.className='ghost-btn';shipBtn.textContent='Nave';shipBtn.onclick=()=>equipShipItem(itemId);actions.appendChild(shipBtn);if((item.type==='laser'||(item.type==='generator'&&item.subtype==='shield'))&&progress.drones.length){const d=document.createElement('button');d.className='ghost-btn';d.textContent='Drone';d.onclick=()=>equipDroneItem(itemId);actions.appendChild(d);}el.appendChild(actions);return el;
}

function renderHangarShips(){
  const wrap=document.createElement('div');wrap.className='ship-grid';
  Object.values(SHIPS).forEach(s=>{
    const owned=progress.ownedShips.includes(s.id),active=s.id===progress.activeShipId,c=document.createElement('div');c.className='ship-card';
    c.innerHTML=`<div class="ship-visual"><img src="${V8_ASSETS.ships[s.id]||V8_ASSETS.ships.phoenix}" alt="${s.name}"></div><div><span class="badge">${owned?'OBTIDA':'BLOQUEADA'}</span><h3>${s.name}</h3></div><div class="ship-stats">HP ${fmt(s.hp)}<br>Lasers ${s.lasers} • Geradores ${s.generators} • Extras ${s.extras}<br>VEL ${s.speed} • Cargo ${fmt(s.cargo)}</div>`;
    const event=!!s.eventOnly||s.shopAvailable===false;const b=document.createElement('button');b.className='equip-btn';b.textContent=active?'Nave ativa':owned?'Usar nave':event?'EVENTO / MISSÃO / PASSE':'Comprar na Loja';b.disabled=active||(!owned&&event);b.onclick=()=>owned?switchShip(s.id):(ui.hangarModal.classList.add('hidden'),openShop('ships'));c.appendChild(b);wrap.appendChild(c);
  });return wrap;
}
function renderHangarEquipment(){
  const ship=SHIPS[progress.activeShipId],root=document.createElement('div');root.className='hangar-layout';const left=document.createElement('div');left.className='hangar-column';const right=document.createElement('div');right.className='hangar-column';
  const repairBot=activeRepairBot(),extraCap=shipExtraCapacity(),extraBonus=extraCap-ship.extras;
  const summary=document.createElement('div');summary.className='summary-grid';summary.innerHTML=`<div class="stat-card">Dano por tiro<strong>${fmt(player.laserDamage)}</strong></div><div class="stat-card">Escudo<strong>${fmt(player.maxShield)}</strong></div><div class="stat-card">Absorção<strong>${player.shieldAbsorption}%</strong></div><div class="stat-card">Velocidade<strong>${fmt(player.speed)}</strong></div><div class="stat-card">Slots EXTRAS<strong>${extraCap}${extraBonus?` (+${extraBonus})`:''}</strong></div><div class="stat-card">Reparo Auto<strong>${repairBot?`${Math.round(repairBot.repairRate*100)}%/s`:'OFF'}</strong></div><div class="stat-card">Porão<strong>${fmt(cargoCapacity())}${cargoExtraBonus()?` (+${fmt(cargoExtraBonus())})`:''}</strong></div>`;left.appendChild(summary);
  for(const [key,title] of [['lasers',`Lasers da ${ship.name} (${ship.lasers})`],['generators',`Geradores (${ship.generators})`],['extras',`Extras (${extraCap}${extraBonus?` = ${ship.extras} + ${extraBonus}`:''})`]]){const box=document.createElement('div');box.className='section-box';box.innerHTML=`<h3>${title}</h3>`;const grid=document.createElement('div');grid.className='slot-grid';progress.shipLoadout[key].forEach((id,i)=>grid.appendChild(slotCard(`${title.split(' ')[0]} ${i+1}`,id,key,i)));box.appendChild(grid);left.appendChild(box);}
  const inv=document.createElement('div');inv.className='section-box';inv.innerHTML='<h3>Inventário disponível</h3>';const grid=document.createElement('div');grid.className='inventory-grid';const entries=Object.entries(progress.inventory).filter(([id,q])=>q>0&&ITEMS[id]);if(!entries.length)grid.innerHTML='<div class="empty-state">Seu inventário de equipamentos está vazio. Compre itens na Loja.</div>';else entries.forEach(([id,q])=>grid.appendChild(inventoryCard(id,q)));inv.appendChild(grid);right.appendChild(inv);root.append(left,right);return root;
}
function renderHangarDrones(){const root=document.createElement('div');const info=document.createElement('div');info.className='section-box';info.innerHTML=`<h3>Esquadrão de drones — ${progress.drones.length}/8</h3><div class="muted" style="font-size:12px">Flax: 1 slot • Iris: 2 slots. Os drones permanecem equipados quando você troca de nave.</div>`;root.appendChild(info);const grid=document.createElement('div');grid.className='drone-grid';if(!progress.drones.length){grid.innerHTML='<div class="empty-state">Você ainda não possui drones. Vá à Loja → Drones.</div>';}progress.drones.forEach((d,idx)=>{const model=ITEMS[d.type],c=document.createElement('div');c.className='drone-card';c.innerHTML=`<img class="drone-art" src="${V8_ASSETS.drones[d.type]}" alt="${model.name}"><div><span class="badge ${d.type==='iris'?'elite':''}">${d.type==='iris'?'ELITE':'COMUM'}</span><h3>${model.name} #${idx+1}</h3></div><div class="drone-stats">${model.slots} slot${model.slots>1?'s':''} • aceita laser ou gerador de escudo</div>`;const sg=document.createElement('div');sg.className='slot-grid';d.slots.forEach((id,i)=>sg.appendChild(slotCard(`Slot ${i+1}`,id,null,i,d.id)));c.appendChild(sg);const rm=document.createElement('button');rm.className='danger-btn';rm.textContent='Remover drone';rm.onclick=()=>sellDrone(d.id);c.appendChild(rm);grid.appendChild(c);});root.appendChild(grid);return root;}
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
  const pet=progress.pet;ui.petContent.innerHTML='';
  if(!pet.owned){
    const hero=document.createElement('div');hero.className='pet-hero pet-store-hero';hero.innerHTML=`<div class="pet-avatar"><img src="${V8_ASSETS.drones.pet}" alt="P.E.T."></div><div class="pet-hero-copy"><div class="eyebrow">UNIDADE P.E.T.</div><h2>P.E.T. ainda não adquirido</h2><p class="muted">O P.E.T. não é mais gratuito. Adquira a unidade base para desbloquear progressão, armas, escudos, coleta, reparo e Kamikaze.</p><div class="price uridium">${fmt(PET_BASE_PRICE)} URI</div></div>`;const b=document.createElement('button');b.className='primary-btn';b.textContent=`COMPRAR P.E.T. • ${fmt(PET_BASE_PRICE)} URI`;b.disabled=progress.profile.uridium<PET_BASE_PRICE;b.onclick=()=>buyPetUnit();hero.querySelector('.pet-hero-copy').appendChild(b);ui.petContent.appendChild(hero);return;
  }
  const base=levelXpThreshold(pet.level),need=pet.level<PET_MAX_LEVEL?petLevelXp(pet.level):base,pct=pet.level>=PET_MAX_LEVEL?100:Math.min(100,(pet.xp-base)/Math.max(1,need-base)*100);
  const hero=document.createElement('div');hero.className='pet-hero';
  hero.innerHTML=`<div class="pet-avatar"><img src="${pet.level>=10?V8_ASSETS.drones.petElite:V8_ASSETS.drones.pet}" alt="P.E.T."></div><div class="pet-hero-copy"><div class="eyebrow">P.E.T. DE COMBATE</div><h2>Nível ${pet.level} / ${PET_MAX_LEVEL}</h2><div class="pet-xpbar"><span style="width:${pct}%"></span></div><div class="muted">${pet.level>=PET_MAX_LEVEL?'Nível máximo':`${fmt(pet.xp)} XP total • próximo ${fmt(need)}`} • Alcance ${fmt(petRange())} • Dano ${fmt(petDamage())} • Escudo ${fmt(petMaxShield())}</div><div class="muted">Módulos disponíveis: Guardião, BOX, Pedras, Regenerador e Kamikaze.</div></div>`;
  ui.petContent.appendChild(hero);

  const gears=document.createElement('div');gears.className='section-box';gears.innerHTML='<h3>Modos / Extras do P.E.T.</h3><div class="muted">Apenas um modo fica ativo por vez. Os módulos são permanentes depois de comprados.</div>';
  const gearGrid=document.createElement('div');gearGrid.className='pet-gear-grid';
  const off=document.createElement('button');off.className=`pet-gear ${pet.activeGear==='off'?'active':''}`;off.innerHTML='<b>COMPANHIA</b><small>Segue sua nave sem executar tarefa automática.</small>';off.onclick=()=>setPetGear('off');gearGrid.appendChild(off);
  Object.values(PET_GEARS).forEach(g=>{const owned=pet.gearsOwned[g.id],b=document.createElement('button');b.className=`pet-gear ${pet.activeGear===g.id?'active':''}`;const gearArt={guard:V8_ASSETS.equipment.autoLaserCpu,box:V8_ASSETS.equipment.ammoAutoBuyCpu,ore:V8_ASSETS.equipment.rocketTurboCpu,repair:V8_ASSETS.equipment.rep2,kami:V8_ASSETS.equipment.autoRocketCpu}[g.id];b.innerHTML=`${gearArt?`<img class="pet-gear-art" src="${gearArt}" alt="">`:''}<b>${g.name}</b><small>${g.description}</small><em>${owned?'COMPRADO':'ELITE • '+fmt(g.cost)+' URI'}</em>`;b.onclick=()=>owned?setPetGear(g.id):buyPetGear(g.id);gearGrid.appendChild(b);});
  gears.appendChild(gearGrid);ui.petContent.appendChild(gears);

  for(const kind of ['laser','shield']){
    const unlocked=kind==='laser'?pet.laserSlotsUnlocked:pet.shieldSlotsUnlocked;
    const box=document.createElement('div');box.className='section-box';box.innerHTML=`<h3>${kind==='laser'?'Armas':'Escudos'} — ${unlocked}/${Math.min(pet.level,PET_SLOT_LEVEL_CAP)} liberados</h3><div class="muted">O nível do P.E.T. define quantos espaços podem ser comprados. O slot 1 já vem liberado.</div>`;
    const grid=document.createElement('div');grid.className='pet-slot-grid';
    for(let i=0;i<Math.min(pet.level,PET_SLOT_LEVEL_CAP);i++)grid.appendChild(i<unlocked?petEquipCard(kind,i):petLockedCard(kind,i));
    box.appendChild(grid);ui.petContent.appendChild(box);
  }

  const inv=document.createElement('div');inv.className='section-box';inv.innerHTML='<h3>Equipamentos disponíveis no inventário</h3>';
  const grid=document.createElement('div');grid.className='inventory-grid';
  const entries=Object.entries(progress.inventory).filter(([id,q])=>q>0&&ITEMS[id]&&(ITEMS[id].type==='laser'||(ITEMS[id].type==='generator'&&ITEMS[id].subtype==='shield')));
  if(!entries.length)grid.innerHTML='<div class="empty-state">Compre lasers ou geradores de escudo na Loja e eles aparecerão aqui.</div>';
  else entries.forEach(([id,q])=>{const item=ITEMS[id],c=document.createElement('div');c.className='inventory-card';c.innerHTML=`${V8_ASSETS.equipment[id]?`<img class="inventory-item-art" src="${V8_ASSETS.equipment[id]}" alt="${item.name}">`:''}<b>${item.name}</b><div class="qty">Quantidade: ${q}</div><div class="muted">${item.description}</div>`;const b=document.createElement('button');b.className='ghost-btn';b.textContent=item.type==='laser'?'Equipar no P.E.T. (arma)':'Equipar no P.E.T. (escudo)';b.onclick=()=>equipPetItem(id,item.type==='laser'?'laser':'shield');c.appendChild(b);grid.appendChild(c);});
  inv.appendChild(grid);ui.petContent.appendChild(inv);
}
function openPet(){if(!progress?.pet?.owned){openShop('pet');showToast(`P.E.T. disponível na Loja por ${fmt(PET_BASE_PRICE)} URI`);return;}renderPet();ui.petModal.classList.remove('hidden');}

function cargoSaleValue(){let total=0;for(const [id,qty] of Object.entries(progress.cargo||{}))total+=(RESOURCES[id]?.sell||0)*qty;return total;}
function sellCargoResource(id){if(!isAtTrader()){showToast('Venda disponível somente na base X-1');return;}const qty=progress.cargo[id]||0,price=RESOURCES[id]?.sell||0;if(qty<=0||price<=0)return;progress.profile.credits+=qty*price;delete progress.cargo[id];saveGame();renderCargo();updateUI();showToast(`${qty} ${id} vendidos por ${fmt(qty*price)} CR`);}
function sellAllCargo(){if(!isAtTrader()){showToast('Volte à base X-1 para vender');return;}let total=0;for(const [id,qty] of Object.entries(progress.cargo||{})){const price=RESOURCES[id]?.sell||0;if(price>0){total+=qty*price;delete progress.cargo[id];}}progress.profile.credits+=total;saveGame();renderCargo();updateUI();showToast(total?`Porão vendido: +${fmt(total)} CR`:'Nada vendável no porão');}
function renderCargo(){if(!progress)return;const atBase=isAtTrader();const xeno=progress.cargo?.Xenomit||0;const cargoBonus=cargoExtraBonus();ui.cargoSummary.innerHTML=`<b>${fmt(cargoUsed())}/${fmt(cargoCapacity())}</b> unidades ocupadas${cargoBonus?` • Expansão equipada: <b>+${fmt(cargoBonus)}</b>`:''} • Valor vendável: <b>${fmt(cargoSaleValue())} CR</b><br><span class="muted">${atBase?'Trader disponível: você está na base.':'Para vender recursos, retorne à Zona Segura do seu X-1.'} ${xeno?`• Xenomit: <b>${fmt(xeno)}</b> (não ocupa porão)`:''}</span>`;ui.cargoGrid.innerHTML='';const entries=Object.entries(progress.cargo||{}).filter(([,q])=>q>0);if(!entries.length){ui.cargoGrid.innerHTML='<div class="empty-state">Seu porão está vazio. Colete minérios no mapa ou caixas deixadas pelos NPCs.</div>';}for(const [id,qty] of entries){const r=RESOURCES[id]||{name:id,color:'#fff',sell:0};const special=id==='Xenomit';const c=document.createElement('div');c.className='cargo-card';c.innerHTML=`<div class="cargo-ore" style="--ore:${r.color}"><img src="${V8_ASSETS.resources[id]||V8_ASSETS.loot.cargo}" alt="${r.name}"></div><div><b>${r.name}</b><div class="muted">${fmt(qty)} un. • ${special?'especial • não ocupa porão':(r.sell?fmt(r.sell)+' CR/un.':'não vendável')}</div></div>`;const b=document.createElement('button');b.className='ghost-btn';b.textContent=r.sell?'Vender':'Guardar';b.disabled=!atBase||!r.sell;b.onclick=()=>sellCargoResource(id);c.appendChild(b);ui.cargoGrid.appendChild(c);}ui.sellAllCargo.disabled=!atBase||cargoSaleValue()<=0;}
function openCargo(){renderCargo();ui.cargoModal.classList.remove('hidden');}

function openShop(tab='ships'){state.shopTab=tab;renderShop();ui.shopModal.classList.remove('hidden');}
function openHangar(tab='ships'){state.hangarTab=tab;renderHangar();ui.hangarModal.classList.remove('hidden');}

function alphaPieceCount(){return alphaGate().pieces.length;}
function addAlphaPiece(){
  const a=alphaGate(),missing=Array.from({length:GALAXY_ALPHA_PIECES},(_,i)=>i+1).filter(n=>!a.pieces.includes(n));
  if(!missing.length){a.built=true;return null;}
  const piece=missing[Math.floor(Math.random()*missing.length)];a.pieces.push(piece);a.pieces.sort((x,y)=>x-y);
  if(a.pieces.length>=GALAXY_ALPHA_PIECES){a.built=true;showToast('GALAXY GATE ALFA COMPLETO — 34/34 peças!');}
  return piece;
}
function randomChoice(list){return list[Math.floor(Math.random()*list.length)];}
function rollAlphaOnce(){
  const g=progress.galaxyGate,a=alphaGate();normalizePilotBio();
  const luck=pilotRareChanceBonus();let r=Math.random()*100;if(luck>0)r=Math.max(0,r-luck*18);
  if(a.built&&r<12)r=12+Math.random()*88;
  if(r<12){const piece=addAlphaPiece();return {kind:'piece',label:`Peça ALFA #${piece}`,piece};}
  if(r<20){const qty=Math.max(1,Math.round(rand(1,5)));progress.pilotBio.logDisks+=qty;return {kind:'logdisk',label:`Log-Disks +${qty}`};}
  if(r<45){const id=randomChoice(Object.keys(LASER_AMMO)),base={lcb10:300,mcb25:200,mcb50:120,ucb100:70}[id]||100,qty=base*Math.ceil(rand(1,4));progress.ammo[id]=(progress.ammo[id]||0)+qty;return {kind:'ammo',label:`${LASER_AMMO[id].name} +${fmt(qty)}`};}
  if(r<64){const id=randomChoice(Object.keys(ROCKETS)),base={r310:15,plt2026:10,plt2021:7,plt3030:5}[id]||5,qty=base*Math.ceil(rand(1,4));progress.rockets[id]=(progress.rockets[id]||0)+qty;return {kind:'rocket',label:`${ROCKETS[id].name} +${fmt(qty)}`};}
  if(r<80){const qty=Math.round(rand(1500,12000));progress.profile.credits+=qty;return {kind:'credits',label:`Créditos +${fmt(qty)}`};}
  if(r<90){const qty=Math.max(1,Math.round(rand(4,18)));progress.cargo.Xenomit=(progress.cargo.Xenomit||0)+qty;return {kind:'xenomit',label:`Xenomit +${fmt(qty)}`};}
  if(r<95){g.jumpBonus++;return {kind:'jump',label:'Bônus de Salto +1'};}
  g.repairBonus++;return {kind:'repair',label:'Bônus de Reparo +1'};
}
function spinAlpha(amount){
  normalizeGalaxyGateState();const cost=amount*GALAXY_ALPHA_SPIN_COST;
  if(progress.profile.uridium<cost){showToast(`Faltam ${fmt(cost-progress.profile.uridium)} URI para ${amount} sorteio${amount>1?'s':''}`);return;}
  progress.profile.uridium-=cost;const results=[];for(let i=0;i<amount;i++)results.push(rollAlphaOnce());
  progress.galaxyGate.lastResults=results.slice(-12);
  const summary={};results.forEach(r=>summary[r.label]=(summary[r.label]||0)+1);
  const pieces=results.filter(r=>r.kind==='piece').length;
  const lines=Object.entries(summary).slice(0,12).map(([label,count])=>`${count>1?`${count}× `:''}${label}`);
  ui.gateResultBox.innerHTML=`<b>${amount} sorteio${amount>1?'s':''} • ${fmt(cost)} URI</b>${pieces?`<div class="gate-piece-win">✦ ${pieces} peça${pieces>1?'s':''} ALFA encontrada${pieces>1?'s':''}</div>`:''}<div>${lines.join(' • ')}</div>`;
  saveGame();refreshAmmoCounters();renderGalaxyGate();updateUI();
}
function useGalaxyRepairBonus(){
  normalizeGalaxyGateState();
  if(progress.galaxyGate.repairBonus<=0){showToast('Você não possui Bônus de Reparo');return;}
  if(!isAtTrader()){showToast('Use o Bônus de Reparo na base X-1');return;}
  progress.galaxyGate.repairBonus--;player.hp=player.maxHp;player.shield=player.maxShield;progress.hp=player.hp;progress.shield=player.shield;saveGame();renderGalaxyGate();updateUI();showToast('Nave totalmente reparada com 1 Bônus de Reparo');
}
function renderGateRounds(){
  if(!ui.gateRoundsGrid)return;
  ui.gateRoundsGrid.innerHTML=GALAXY_ALPHA_ROUNDS.map(r=>`<div class="gate-round-card"><div class="gate-round-num">ROUND ${r.round}</div><b>${r.name}</b><div>${r.waves.map((w,i)=>`<span>O${i+1}: ${w.count} ${NPC_TYPES[w.type].name}</span>`).join('')}</div></div>`).join('');
}
function renderGateHud(){
  if(!ui.gateHud||!progress)return;
  const active=isGalaxyGateMap()&&alphaGate().run?.active;ui.gateHud.classList.toggle('hidden',!active);if(!active)return;
  const a=alphaGate(),run=a.run,def=GALAXY_ALPHA_ROUNDS[run.round-1],now=Date.now();
  ui.gateHudRound.textContent=`${run.round} / 8`;
  ui.gateHudWave.textContent=run.waveIndex===0?'AGUARDANDO':`${run.waveIndex} / ${def.waves.length}`;
  ui.gateHudRemaining.textContent=fmt(alphaRemainingCount());
  let next='—';
  if(run.nextWaveAt)next=`${Math.max(0,Math.ceil((run.nextWaveAt-now)/1000))}s`;
  else if(run.nextRoundAt)next=`ROUND ${run.round+1} • ${Math.max(0,Math.ceil((run.nextRoundAt-now)/1000))}s`;
  else if(run.waveIndex>=def.waves.length)next='LIMPE O MAPA';
  ui.gateHudNext.textContent=next;
  ui.gateHudLives.textContent='♥ '.repeat(a.lives).trim()+' ♡ '.repeat(Math.max(0,3-a.lives)).trim();
}
function renderGalaxyGate(){
  if(!progress||!ui.gatePieceGrid)return;normalizeGalaxyGateState();const g=progress.galaxyGate,a=g.alpha,count=a.pieces.length;
  if(ui.gatePieceBadge)ui.gatePieceBadge.textContent=`${count}/34`;
  ui.gatePiecesText.textContent=`${count} / 34`;ui.gateLivesText.textContent=a.lives;ui.gateCompletedText.textContent=a.completed;ui.gateUriText.textContent=fmt(progress.profile.uridium);
  ui.gateJumpBonus.textContent=fmt(g.jumpBonus);ui.gateRepairBonus.textContent=fmt(g.repairBonus);if(ui.gateLogDisks){normalizePilotBio();ui.gateLogDisks.textContent=fmt(progress.pilotBio.logDisks);}
  ui.gatePieceGrid.innerHTML=Array.from({length:GALAXY_ALPHA_PIECES},(_,i)=>`<span class="gate-piece ${a.pieces.includes(i+1)?'found':''}" title="Peça ${i+1}">${i+1}</span>`).join('');
  ui.gateSpinButtons.innerHTML='';[1,5,10,50,100].forEach(n=>{const b=document.createElement('button');b.className='small-btn gate-spin-btn';b.innerHTML=`${n}x <small>${fmt(n*GALAXY_ALPHA_SPIN_COST)} URI</small>`;b.disabled=progress.profile.uridium<n*GALAXY_ALPHA_SPIN_COST;b.onclick=()=>spinAlpha(n);ui.gateSpinButtons.appendChild(b);});
  const atBase=isAtTrader();
  if(a.run){
    ui.gateAlphaStatusTitle.textContent=`ALFA em andamento • Round ${a.run.round}`;
    ui.gateAlphaStatusText.textContent=`${a.lives} vidas restantes. Os NPCs eliminados continuam eliminados quando você retornar.`;
    ui.gateJumpBtn.textContent=isGalaxyGateMap()?'VOCÊ ESTÁ NO ALFA':atBase?'RETORNAR AO ALFA':'VOLTE À BASE X-1';
    ui.gateJumpBtn.disabled=isGalaxyGateMap()||!atBase||a.lives<=0;
  }else if(a.built){
    ui.gateAlphaStatusTitle.textContent='PORTAL ALFA MONTADO';
    ui.gateAlphaStatusText.textContent='34/34 peças encontradas. 8 rounds, 3 vidas. O primeiro salto inicia a tentativa.';
    ui.gateJumpBtn.textContent=atBase?'SALTAR PARA O ALFA':'VOLTE À BASE X-1';
    ui.gateJumpBtn.disabled=!atBase;
  }else{
    ui.gateAlphaStatusTitle.textContent='Em construção';
    ui.gateAlphaStatusText.textContent=`Faltam ${GALAXY_ALPHA_PIECES-count} peças para montar o portal ALFA.`;
    ui.gateJumpBtn.textContent='PORTAL INCOMPLETO';ui.gateJumpBtn.disabled=true;
  }
  ui.useRepairBonus.disabled=g.repairBonus<=0||isGalaxyGateMap();
  renderGateRounds();renderGateHud();
}
function openGalaxyGate(){
  if(isGalaxyGateMap()){
    const a=alphaGate(),def=GALAXY_ALPHA_ROUNDS[a.run?.round-1];
    renderGateHud();
    showToast(`ALFA • Round ${a.run?.round||1} • ${alphaRemainingCount()} NPCs vivos${def?` • ${a.lives} vidas`:''}`);
    return;
  }
  renderGalaxyGate();ui.gateModal.classList.remove('hidden');
}


function buyLogDisks(qty){normalizePilotBio();qty=Math.max(1,Math.floor(qty));const cost=qty*LOG_DISK_URI_PRICE;if(progress.profile.uridium<cost){showToast('Uridium insuficiente para Log-Disks');return;}progress.profile.uridium-=cost;progress.pilotBio.logDisks+=qty;saveGame();renderPilotProfile();updateUI();}
function convertPilotPoint(){normalizePilotBio();const p=progress.pilotBio;if(p.totalPoints>=PILOT_POINT_MAX){showToast('Limite de 50 Pontos de Pesquisa atingido');return;}const no=p.totalPoints+1,cost=pilotPointLogCost(no);if(p.logDisks<cost){showToast(`Faltam ${fmt(cost-p.logDisks)} Log-Disks`);return;}p.logDisks-=cost;p.totalPoints++;saveGame();renderPilotProfile();showToast(`Ponto de Pesquisa #${p.totalPoints} obtido`);}
function upgradePilotSkill(id){normalizePilotBio();const skill=PILOT_SKILLS[id],lv=pilotSkillLevel(id);if(!skill||lv>=skill.max)return;if(!pilotRequirementMet(skill)){showToast(`Complete ${PILOT_SKILLS[skill.requires].name} primeiro`);return;}if(pilotAvailablePoints()<1){showToast('Você não possui PP disponível');return;}const cost=pilotSkillCreditCost(skill,lv+1);if(progress.profile.credits<cost){showToast(`Faltam ${fmt(cost-progress.profile.credits)} CR`);return;}progress.profile.credits-=cost;progress.pilotBio.skills[id]=lv+1;computeStats(true);saveGame();renderPilotProfile();updateUI();showToast(`${skill.name} • nível ${lv+1}/${skill.max}`);}
function resetPilotTree(){normalizePilotBio();const cost=1000*Math.pow(2,progress.pilotBio.resetCount);if(progress.profile.uridium<cost){showToast(`Reset requer ${fmt(cost)} URI`);return;}if(pilotSpentPoints()<=0){showToast('Nenhum ponto investido para resetar');return;}progress.profile.uridium-=cost;for(const id of Object.keys(PILOT_SKILLS))progress.pilotBio.skills[id]=0;progress.pilotBio.resetCount++;computeStats(true);saveGame();renderPilotProfile();updateUI();showToast('Árvore de Piloto resetada');}
function pilotSkillBonusLabel(skill,lv){if(lv<=0)return 'SEM BÔNUS';const value=skill.values[Math.min(lv,skill.values.length)-1];return `${fmt(value)}${skill.unit}`;}
function renderPilotProfile(){
  if(!progress||!ui.pilotSkillTree)return;normalizePilotBio();const p=progress.pilotBio,spent=pilotSpentPoints(),avail=pilotAvailablePoints(),next=p.totalPoints+1;
  ui.pilotLogDisks.textContent=fmt(p.logDisks);ui.pilotPointsTotal.textContent=`${p.totalPoints} / ${PILOT_POINT_MAX}`;ui.pilotPointsAvailable.textContent=fmt(avail);ui.pilotPointsSpent.textContent=fmt(spent);if(ui.pilotPointBadge)ui.pilotPointBadge.textContent=`${avail} PP`;
  if(p.totalPoints>=PILOT_POINT_MAX){ui.pilotNextPointTitle.textContent='PESQUISA COMPLETA';ui.pilotNextPointCost.textContent='50 / 50 Pontos de Pesquisa';ui.pilotConvertPoint.disabled=true;ui.pilotConvertPoint.textContent='LIMITE ATINGIDO';}
  else{const logs=pilotPointLogCost(next);ui.pilotNextPointTitle.textContent=`PP #${next}`;ui.pilotNextPointCost.textContent=`${fmt(logs)} Log-Disks • equivalente ${fmt(logs*LOG_DISK_URI_PRICE)} URI`;ui.pilotConvertPoint.disabled=p.logDisks<logs;ui.pilotConvertPoint.textContent='CONVERTER LOG-DISKS EM 1 PP';}
  ui.pilotLogBuyButtons.innerHTML='';[1,10,100,500].forEach(q=>{const b=document.createElement('button');b.className='small-btn';b.innerHTML=`${q}x <small>${fmt(q*LOG_DISK_URI_PRICE)} URI</small>`;b.disabled=progress.profile.uridium<q*LOG_DISK_URI_PRICE;b.onclick=()=>buyLogDisks(q);ui.pilotLogBuyButtons.appendChild(b);});
  const resetCost=1000*Math.pow(2,p.resetCount);ui.pilotResetCost.textContent=`Reset #${p.resetCount+1}: ${fmt(resetCost)} URI`;ui.pilotResetBtn.disabled=spent<=0||progress.profile.uridium<resetCost;
  ui.pilotSkillTree.innerHTML='';
  for(const [branch,meta] of Object.entries(PILOT_BRANCHES)){
    const col=document.createElement('section');col.className=`pilot-branch ${meta.className}`;col.innerHTML=`<div class="pilot-branch-title">${meta.label}</div>`;
    Object.values(PILOT_SKILLS).filter(s=>s.branch===branch).forEach(skill=>{
      const lv=pilotSkillLevel(skill.id),maxed=lv>=skill.max,req=pilotRequirementMet(skill),cost=maxed?0:pilotSkillCreditCost(skill,lv+1),card=document.createElement('article');card.className=`pilot-skill-node${maxed?' maxed':''}${!req?' locked':''}`;
      card.innerHTML=`<div class="pilot-skill-head"><b>${skill.name}</b><span>${lv}/${skill.max}</span></div><div class="pilot-skill-desc">${skill.desc}</div><div class="pilot-skill-bonus">ATUAL: <b>${pilotSkillBonusLabel(skill,lv)}</b>${!maxed?` • PRÓXIMO: <b>${pilotSkillBonusLabel(skill,lv+1)}</b>`:''}</div>${skill.requires?`<div class="pilot-skill-req">${req?'✓':'🔒'} Requer ${PILOT_SKILLS[skill.requires].name} ${PILOT_SKILLS[skill.requires].max}/${PILOT_SKILLS[skill.requires].max}</div>`:''}`;
      const b=document.createElement('button');b.className=maxed?'small-btn gold':'small-btn';b.disabled=maxed||!req||avail<=0||progress.profile.credits<cost;b.textContent=maxed?'MAX':`UP • 1 PP + ${fmt(cost)} CR`;b.onclick=()=>upgradePilotSkill(skill.id);card.appendChild(b);col.appendChild(card);
    });ui.pilotSkillTree.appendChild(col);
  }
}
function openPilotProfile(){renderPilotProfile();ui.pilotModal.classList.remove('hidden');}

function formatAuctionClock(sec){const m=Math.floor(sec/60),s=sec%60;return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;}
function auctionMinBid(lot){const npc=auctionNpcBid(lot);return Math.max(100000,npc+(npc<1000000?100000:Math.max(100000,Math.round(npc*.05/100000)*100000)));}
function placeAuctionBid(ref,amount){ensureAuctionState();const lot=progress.auction.lots[ref];if(!lot)return;const min=auctionMinBid(lot);amount=Math.round(Number(amount)/100000)*100000;if(!Number.isFinite(amount)||amount<min){showToast(`Lance mínimo: ${fmt(min)} CR`);return;}const delta=amount-(lot.escrow||0);if(delta>progress.profile.credits){showToast('Créditos insuficientes para esse lance');return;}progress.profile.credits-=delta;lot.userBid=amount;lot.escrow=amount;saveGame();renderAuction();updateUI();showToast(`Lance registrado: ${fmt(amount)} CR`);}
function renderAuction(){
  if(!progress||!ui.auctionGrid)return;ensureAuctionState();const sec=auctionSecondsLeft(),clock=formatAuctionClock(sec);ui.auctionClock.textContent=clock;ui.auctionTopClock.textContent=clock;ui.auctionCredits.textContent=fmt(progress.profile.credits);ui.auctionEscrow.textContent=fmt(auctionEscrow());ui.auctionGrid.innerHTML='';
  for(const lot of Object.values(progress.auction.lots)){
    const npc=auctionNpcBid(lot),leader=lot.userBid>=npc&&lot.userBid>0?'VOCÊ':'SISTEMA',current=Math.max(npc,lot.userBid||0),min=auctionMinBid(lot),card=document.createElement('article');card.className=`auction-card ${leader==='VOCÊ'?'leading':''}`;card.dataset.auctionRef=lot.ref;const type=lot.kind==='ship'?'NAVE':lot.kind==='item'?'EQUIPAMENTO':lot.kind==='ammo'?'MUNIÇÃO':lot.kind==='rocket'?'MÍSSIL':'P.E.T.';
    let art=null;if(lot.kind==='ship')art=V8_ASSETS.ships[lot.id];else if(lot.kind==='item')art=assetForProduct(lot.id,ITEMS[lot.id]?.type,ITEMS[lot.id]?.subtype);else if(lot.kind==='ammo'||lot.kind==='rocket')art=V8_ASSETS.ammo[lot.id];else if(lot.kind==='petGear')art={guard:V8_ASSETS.equipment.autoLaserCpu,box:V8_ASSETS.equipment.ammoAutoBuyCpu,ore:V8_ASSETS.equipment.rocketTurboCpu,repair:V8_ASSETS.equipment.rep2,kami:V8_ASSETS.equipment.autoRocketCpu}[lot.id];
    card.innerHTML=`${art?`<img class="auction-art" src="${art}" alt="${lot.name}">`:''}<div class="auction-card-top"><span>${type}</span><b>${leader}</b></div><h3>${lot.name}</h3><div class="auction-bid-value">${fmt(current)} CR</div><div class="auction-meta">Lance mínimo ${fmt(min)} CR${lot.userBid?` • Seu lance ${fmt(lot.userBid)} CR`:''}</div>`;
    const row=document.createElement('div');row.className='auction-bid-row';const input=document.createElement('input');input.className='auction-bid-input';input.type='number';input.min=String(min);input.step='100000';input.value=String(min);input.setAttribute('aria-label',`Lance para ${lot.name}`);const b=document.createElement('button');b.className='small-btn';b.textContent='DAR LANCE';b.onclick=()=>placeAuctionBid(lot.ref,input.value);row.append(input,b);card.appendChild(row);ui.auctionGrid.appendChild(card);
  }
  ui.auctionHistory.innerHTML=(progress.auction.history||[]).length?progress.auction.history.map(h=>`<div class="auction-history-row"><span>${h.result}</span><b>${h.name}</b><em>${fmt(h.bid)} CR</em></div>`).join(''):'<div class="muted">Nenhum ciclo encerrado ainda.</div>';
}
function openAuction(){renderAuction();ui.auctionModal.classList.remove('hidden');}
let auctionUiTick=0;
function updateAuctionSystem(){
  if(!progress)return;const now=Date.now();if(now-auctionUiTick<1000)return;auctionUiTick=now;ensureAuctionState();
  const clock=formatAuctionClock(auctionSecondsLeft());if(ui.auctionTopClock)ui.auctionTopClock.textContent=clock;if(ui.auctionClock)ui.auctionClock.textContent=clock;
  if(ui.auctionModal&&!ui.auctionModal.classList.contains('hidden')){
    ui.auctionCredits.textContent=fmt(progress.profile.credits);ui.auctionEscrow.textContent=fmt(auctionEscrow());
    ui.auctionGrid.querySelectorAll('[data-auction-ref]').forEach(card=>{const lot=progress.auction.lots[card.dataset.auctionRef];if(!lot)return;const npc=auctionNpcBid(lot),leader=lot.userBid>=npc&&lot.userBid>0?'VOCÊ':'SISTEMA',current=Math.max(npc,lot.userBid||0),min=auctionMinBid(lot);card.classList.toggle('leading',leader==='VOCÊ');const lead=card.querySelector('.auction-card-top b');if(lead)lead.textContent=leader;const value=card.querySelector('.auction-bid-value');if(value)value.textContent=`${fmt(current)} CR`;const meta=card.querySelector('.auction-meta');if(meta)meta.textContent=`Lance mínimo ${fmt(min)} CR${lot.userBid?` • Seu lance ${fmt(lot.userBid)} CR`:''}`;const input=card.querySelector('.auction-bid-input');if(input){input.min=String(min);if(document.activeElement!==input&&Number(input.value)<min)input.value=String(min);}});
  }
}

function renderAll(){buildAmmoButtons();renderShop();renderHangar();renderCargo();renderMapModal();renderPet();renderMissions();renderGalaxyGate();renderPilotProfile();ensureAuctionState();updateUI();}

function worldPoint(ev){const r=canvas.getBoundingClientRect(),sx=ev.clientX-r.left,sy=ev.clientY-r.top;return{x:sx-W/2+state.camera.x,y:sy-H/2+state.camera.y};}
function gameplayPointerAllowed(){return authenticated&&progress&&ui.loginModal.classList.contains('hidden')&&ui.shopModal.classList.contains('hidden')&&ui.hangarModal.classList.contains('hidden')&&ui.cargoModal.classList.contains('hidden')&&ui.petModal.classList.contains('hidden')&&ui.missionModal.classList.contains('hidden')&&ui.gateModal.classList.contains('hidden')&&ui.pilotModal.classList.contains('hidden')&&ui.auctionModal.classList.contains('hidden')&&ui.factionModal.classList.contains('hidden');}
function setPointerDestination(ev){const p=worldPoint(ev);player.tx=Math.max(40,Math.min(state.currentMap.world.w-40,p.x));player.ty=Math.max(40,Math.min(state.currentMap.world.h-40,p.y));}
function pointerAction(ev){
  if(!gameplayPointerAllowed()||ev.button!==0)return;
  const p=worldPoint(ev);const found=state.enemies.find(e=>e.hp>0&&Math.hypot(e.x-p.x,e.y-p.y)<=e.size*1.8+18);
  if(found){state.target=found;state.pointerNavActive=false;showToast(`Alvo: ${found.name}`);if(autoLaserEnabled())player.laserFiring=true;return;}
  const clickedPortal=portalAtWorld(p.x,p.y),readyPortal=nearbyPortal();
  if(clickedPortal&&readyPortal&&clickedPortal.to===readyPortal.to&&Math.hypot(clickedPortal.x-readyPortal.x,clickedPortal.y-readyPortal.y)<1){state.pointerNavActive=false;jumpThroughPortal(readyPortal);return;}
  setPointerDestination(ev);state.pointerNavActive=true;state.pointerNavId=ev.pointerId;
  try{canvas.setPointerCapture(ev.pointerId);}catch(_e){}
}
function pointerNavigateMove(ev){if(!state.pointerNavActive||state.pointerNavId!==ev.pointerId||!gameplayPointerAllowed())return;setPointerDestination(ev);}
function stopPointerNavigation(ev){if(state.pointerNavId!==null&&ev.pointerId!==undefined&&state.pointerNavId!==ev.pointerId)return;state.pointerNavActive=false;state.pointerNavId=null;try{if(ev.pointerId!==undefined)canvas.releasePointerCapture(ev.pointerId);}catch(_e){}}
canvas.addEventListener('pointerdown',pointerAction);
canvas.addEventListener('pointermove',pointerNavigateMove);
canvas.addEventListener('pointerup',stopPointerNavigation);
canvas.addEventListener('pointercancel',stopPointerNavigation);
canvas.addEventListener('lostpointercapture',()=>{state.pointerNavActive=false;state.pointerNavId=null;});
ui.portalPrompt.onclick=()=>{const portal=nearbyPortal();if(portal)jumpThroughPortal(portal);};
minimap.addEventListener('pointerdown',e=>{if(!authenticated||!progress)return;e.preventDefault();e.stopPropagation();const r=minimap.getBoundingClientRect();const mx=(e.clientX-r.left)/r.width*minimap.width,my=(e.clientY-r.top)/r.height*minimap.height;player.tx=Math.max(35,Math.min(state.currentMap.world.w-35,mx/minimap.width*state.currentMap.world.w));player.ty=Math.max(35,Math.min(state.currentMap.world.h-35,my/minimap.height*state.currentMap.world.h));showToast(`Rota definida no minimapa`);});
ui.laserToggle.onclick=()=>{if(!state.target||state.target.hp<=0){showToast('Selecione um alvo');return;}player.laserFiring=!player.laserFiring;};ui.rocketFire.onclick=()=>fireRocket(true);
const dismissibleModals=()=>[
  ui.auctionModal,ui.pilotModal,ui.gateModal,ui.missionModal,ui.shopModal,ui.hangarModal,ui.petModal,ui.cargoModal,ui.mapModal
].filter(Boolean);
function closeTopOverlay(){
  const open=dismissibleModals().filter(modal=>!modal.classList.contains('hidden'));
  if(!open.length)return false;
  open[0].classList.add('hidden');
  return true;
}
function bindOverlayDismiss(){
  for(const modal of dismissibleModals()){
    modal.addEventListener('pointerdown',e=>{
      if(e.target===modal)modal.classList.add('hidden');
    });
  }
}

ui.mapBtn.onclick=()=>openMapModal();ui.closeMap.onclick=()=>ui.mapModal.classList.add('hidden');if(ui.missionBtn)ui.missionBtn.onclick=()=>openMissions();if(ui.closeMission)ui.closeMission.onclick=()=>ui.missionModal.classList.add('hidden');if(ui.gateBtn)ui.gateBtn.onclick=()=>openGalaxyGate();if(ui.pilotBtn)ui.pilotBtn.onclick=()=>openPilotProfile();if(ui.closePilot)ui.closePilot.onclick=()=>ui.pilotModal.classList.add('hidden');if(ui.pilotConvertPoint)ui.pilotConvertPoint.onclick=()=>convertPilotPoint();if(ui.pilotResetBtn)ui.pilotResetBtn.onclick=()=>resetPilotTree();if(ui.auctionBtn)ui.auctionBtn.onclick=()=>openAuction();if(ui.closeAuction)ui.closeAuction.onclick=()=>ui.auctionModal.classList.add('hidden');if(ui.closeGate)ui.closeGate.onclick=()=>ui.gateModal.classList.add('hidden');if(ui.gateJumpBtn)ui.gateJumpBtn.onclick=()=>enterAlphaGate();if(ui.useRepairBonus)ui.useRepairBonus.onclick=()=>useGalaxyRepairBonus();ui.petBtn.onclick=()=>openPet();ui.closePet.onclick=()=>ui.petModal.classList.add('hidden');ui.shopBtn.onclick=()=>openShop();if(ui.weaponBarToggle)ui.weaponBarToggle.onclick=()=>toggleAmmoUi();if(ui.statsToggle){ui.statsToggle.onclick=e=>{e.stopPropagation();toggleStatsUi();};ui.statsToggle.ontouchstart=e=>e.stopPropagation();}if(ui.statsHeader)ui.statsHeader.onclick=()=>toggleStatsUi();if(ui.minimapToggle){ui.minimapToggle.onclick=e=>{e.stopPropagation();toggleMinimapUi();};ui.minimapToggle.ontouchstart=e=>e.stopPropagation();}if(ui.minimapHeader)ui.minimapHeader.onclick=()=>toggleMinimapUi();if(ui.hudToggle)ui.hudToggle.onclick=()=>toggleHudUi();ui.closeShop.onclick=()=>ui.shopModal.classList.add('hidden');ui.hangarBtn.onclick=()=>openHangar();ui.closeHangar.onclick=()=>ui.hangarModal.classList.add('hidden');ui.cargoBtn.onclick=()=>openCargo();ui.closeCargo.onclick=()=>ui.cargoModal.classList.add('hidden');ui.sellAllCargo.onclick=()=>sellAllCargo();ui.mapModal.onclick=e=>{if(e.target===ui.mapModal)ui.mapModal.classList.add('hidden');};if(ui.missionModal)ui.missionModal.onclick=e=>{if(e.target===ui.missionModal)ui.missionModal.classList.add('hidden');};if(ui.gateModal)ui.gateModal.onclick=e=>{if(e.target===ui.gateModal)ui.gateModal.classList.add('hidden');};ui.petModal.onclick=e=>{if(e.target===ui.petModal)ui.petModal.classList.add('hidden');};ui.shopModal.onclick=e=>{if(e.target===ui.shopModal)ui.shopModal.classList.add('hidden');};ui.hangarModal.onclick=e=>{if(e.target===ui.hangarModal)ui.hangarModal.classList.add('hidden');};ui.cargoModal.onclick=e=>{if(e.target===ui.cargoModal)ui.cargoModal.classList.add('hidden');};
bindOverlayDismiss();
document.addEventListener('keydown',e=>{if(!authenticated||!progress||!ui.loginModal.classList.contains('hidden')||!ui.factionModal.classList.contains('hidden'))return;if(e.key==='Escape'){if(closeTopOverlay()){e.preventDefault();return;}}const tag=document.activeElement?.tagName;if(tag==='INPUT'||tag==='TEXTAREA')return;if(e.key==='Control'){e.preventDefault();if(state.target&&state.target.hp>0)player.laserFiring=!player.laserFiring;else showToast('Selecione um alvo');}if(e.code==='Space'){e.preventDefault();fireRocket(true);}if(['j','J'].includes(e.key)||e.key==='Enter'){const portal=nearbyPortal();if(portal){e.preventDefault();jumpThroughPortal(portal);}}if(e.key.toLowerCase()==='h')toggleHudUi();if(e.key.toLowerCase()==='b')openShop();if(e.key.toLowerCase()==='c')openCargo();if(e.key.toLowerCase()==='m')openMapModal();if(e.key.toLowerCase()==='q')openMissions();if(e.key.toLowerCase()==='g')openGalaxyGate();if(e.key.toLowerCase()==='p')openPet();if(e.key.toLowerCase()==='o')openPilotProfile();if(e.key.toLowerCase()==='l')openAuction();if(['1','2','3','4','5'].includes(e.key)){progress.selectedLaserAmmo=Object.keys(LASER_AMMO)[Number(e.key)-1];buildAmmoButtons();saveGame();}});

function showAuthMode(mode){
  const login=mode==='login';ui.loginForm.classList.toggle('hidden',!login);ui.registerForm.classList.toggle('hidden',login);ui.loginTabBtn.classList.toggle('active',login);ui.registerTabBtn.classList.toggle('active',!login);ui.authMessage.textContent='';
}
ui.loginTabBtn.onclick=()=>showAuthMode('login');ui.registerTabBtn.onclick=()=>showAuthMode('register');
ui.loginForm.onsubmit=async e=>{e.preventDefault();ui.authMessage.textContent='Entrando...';try{await signIn({email:ui.loginEmail.value,password:ui.loginPassword.value});await afterAuth();}catch(err){ui.authMessage.textContent=err.message;}};
ui.registerForm.onsubmit=async e=>{e.preventDefault();ui.authMessage.textContent='Criando conta...';try{const result=await signUp({callsign:ui.registerCallsign.value,email:ui.registerEmail.value,password:ui.registerPassword.value});if(result.requires_confirmation){ui.authMessage.textContent='Conta criada. Confirme o e-mail no Supabase e depois entre.';showAuthMode('login');ui.loginEmail.value=ui.registerEmail.value;return;}await afterAuth();}catch(err){ui.authMessage.textContent=err.message;}};
ui.logoutBtn.onclick=async()=>{await flushCloudSave(true);signOutLocal();authenticated=false;progress=null;state.target=null;player.laserFiring=false;ui.mapModal.classList.add('hidden');ui.petModal.classList.add('hidden');ui.shopModal.classList.add('hidden');ui.hangarModal.classList.add('hidden');ui.cargoModal.classList.add('hidden');ui.pilotModal?.classList.add('hidden');ui.auctionModal?.classList.add('hidden');ui.gateModal?.classList.add('hidden');ui.factionModal.classList.add('hidden');ui.portalPrompt.classList.add('hidden');ui.loginModal.classList.remove('hidden');ui.userLabel.textContent='—';setSync('LOCAL','');showAuthMode('login');};

function startLoadedGame(){
  state.lastPlayerDamageAt=nowSec();
  normalizeGalaxyGateState();
  if(progress.mapId==='ggAlpha'&&!progress.galaxyGate.alpha.run?.active)progress.mapId='x1';
  const savedX=Number.isFinite(progress.x)?progress.x:null,savedY=Number.isFinite(progress.y)?progress.y:null;state.currentMap=MAPS[progress.mapId]||MAPS.x1;state.radarRange=mapRadarRange();player.hp=progress.hp||1;player.shield=progress.shield||0;computeStats(true);player.hp=Math.min(player.maxHp,progress.hp??player.maxHp);player.shield=Math.min(player.maxShield,progress.shield??player.maxShield);
  if(progress.mapId==='ggAlpha'){
    player.x=savedX??MAPS.ggAlpha.world.w/2;player.y=savedY??MAPS.ggAlpha.world.h/2;player.tx=player.x;player.ty=player.y;petRuntime.x=player.x+82;petRuntime.y=player.y+64;petRuntime.tx=petRuntime.x;petRuntime.ty=petRuntime.y;state.camera.x=player.x;state.camera.y=player.y;state.target=null;state.loot=[];state.fx=[];state.rocketFx=[];state.ores=[];state.landmarks=[];state.enemyRespawns=[];state.oreRespawns=[];restoreAlphaGateEnemies();const a=alphaGate(),def=GALAXY_ALPHA_ROUNDS[a.run.round-1],alive=alphaRemainingCount(),now=Date.now();if(a.run.waveIndex<def.waves.length&&!a.run.nextWaveAt){a.run.nextWaveAt=now+GALAXY_ALPHA_WAVE_INTERVAL_MS;}else if(a.run.waveIndex>=def.waves.length&&alive===0&&a.run.round<GALAXY_ALPHA_ROUNDS.length&&!a.run.nextRoundAt){a.run.nextRoundAt=now+GALAXY_ALPHA_ROUND_INTERVAL_MS;}renderAll();saveGame();return;
  }
  player.x=savedX??(progress.mapId==='x1'?SAFE_ZONE.x:400);player.y=savedY??state.currentMap.world.h/2;player.tx=player.x;player.ty=player.y;petRuntime.x=player.x+82;petRuntime.y=player.y+64;petRuntime.tx=petRuntime.x;petRuntime.ty=petRuntime.y;state.camera.x=player.x;state.camera.y=player.y;state.target=null;state.loot=[];state.fx=[];state.rocketFx=[];createLandmarks();createOres();spawnEnemies();renderAll();saveGame();
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

preloadV8Assets();
loadAmmoUiState();
loadStatsUiState();
loadMinimapUiState();
loadTopMetaUiState();
syncHudButton();
layoutHudPanels();
window.addEventListener('resize', layoutHudPanels);
window.addEventListener('orientationchange', ()=>setTimeout(layoutHudPanels, 120));
boot();
setInterval(()=>{if(progress){saveGame();flushCloudSave();}},7000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flushCloudSave(true);});
let last=performance.now();function loop(t){const dt=Math.min((t-last)/1000,.035);last=t;update(dt);draw();requestAnimationFrame(loop);}requestAnimationFrame(loop);
