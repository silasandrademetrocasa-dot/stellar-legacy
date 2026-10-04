import { FACTIONS, SHIPS, ITEMS, LASER_AMMO, ROCKETS, NPC_TYPES, MAPS, RESOURCES } from './data.js?v=13.4.0';
import { GAME_ASSETS } from './assets/v8/manifest.js?v=13.4.0';
import { signUp, signIn, requestPasswordReset, getRecoveryAccessToken, completePasswordRecovery, restoreSession, signOutLocal, checkGameSession, endGameSession, getUser, loadCloudSave, saveCloudSave, updateCallsign, updatePassword, loadRankings, loadAuctionBids, saveAuctionBidOnline, markAuctionBidStatusOnline, loadAuctionMarket, upsertPlayerPresenceOnline, loadMapPresenceOnline, removePlayerPresenceOnline, queuePvpAttackOnline, consumePvpDamageEventsOnline, syncArenaProfileOnline, loadArenaState, loadArenaDailyRewardStatus, claimArenaDailyReward, loadArenaOpponents, loadArenaHistory, arenaAttackOnline, listClansOnline, loadMyClanOnline, createClanOnline, joinClanOnline, leaveClanOnline, transferClanCreditsOnline, claimClanCreditGrantsOnline, recordClanAlienKillOnline, getPremiumShopOnline, testPurchasePremiumOnline, loadWarfrontStateOnline, hitWorldBossOnline, claimWorldBossRewardOnline, declareClanWarOnline, recordClanWarScoreOnline } from './api.js?v=13.4.0';

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const minimap = document.querySelector('#minimap');
const mm = minimap.getContext('2d');
const $ = (s) => document.querySelector(s);

const QUALITY_STORAGE_KEY='stellar_quality_mode';
const QUALITY_PROFILES={
  high:{label:'ALTA',dpr:2.35,fps:60,background:true,backgroundAlpha:.72,stars:1,grid:false,fx:true,particles:120,preload:'all',saturation:1.16,contrast:1.07},
  medium:{label:'MÉDIA',dpr:1.35,fps:45,background:true,backgroundAlpha:.48,stars:.58,grid:false,fx:true,particles:55,preload:'core',saturation:1.03,contrast:1.02},
  low:{label:'BAIXA',dpr:1,fps:30,background:false,backgroundAlpha:0,stars:.2,grid:false,fx:false,particles:18,preload:'minimal',saturation:1,contrast:1},
};
let qualityMode=(()=>{try{const v=localStorage.getItem(QUALITY_STORAGE_KEY);return QUALITY_PROFILES[v]?v:'high';}catch{return 'high';}})();
function qualityProfile(){return QUALITY_PROFILES[qualityMode]||QUALITY_PROFILES.high;}

const AUDIO_STORAGE_KEY='stellar_audio_enabled_v1';
let audioEnabled=(()=>{try{return localStorage.getItem(AUDIO_STORAGE_KEY)!=='0';}catch{return true;}})();
let audioCtx=null;
const sfxLast={};
function ensureAudio(){
  if(!audioEnabled)return null;
  try{
    audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});
    return audioCtx;
  }catch{return null;}
}
function setAudioEnabled(value){audioEnabled=!!value;try{localStorage.setItem(AUDIO_STORAGE_KEY,audioEnabled?'1':'0');}catch{};if(audioEnabled)ensureAudio();renderSettings();}
function playSfx(type,level=1){
  if(!audioEnabled)return;
  const ctx=ensureAudio();if(!ctx)return;
  const now=ctx.currentTime, throttle={laser:.09,rocket:.12,impact:.06,damage:.12,explode:.16,pickup:.08,ui:.05}[type]||.05;
  if(now-(sfxLast[type]||0)<throttle)return;sfxLast[type]=now;
  const out=ctx.createGain();out.gain.setValueAtTime(.0001,now);out.connect(ctx.destination);
  const gain=Math.max(.015,Math.min(.18,.08*Number(level||1)));
  out.gain.exponentialRampToValueAtTime(gain,now+.008);
  const osc=ctx.createOscillator();const g=ctx.createGain();osc.connect(g);g.connect(out);
  const cfg={laser:[760,170,'sawtooth',.11],rocket:[150,58,'square',.24],impact:[240,90,'triangle',.09],damage:[120,52,'sawtooth',.16],explode:[95,32,'square',.34],pickup:[560,980,'sine',.13],ui:[420,520,'sine',.07]}[type]||[300,180,'sine',.08];
  osc.type=cfg[2];osc.frequency.setValueAtTime(cfg[0],now);osc.frequency.exponentialRampToValueAtTime(Math.max(20,cfg[1]),now+cfg[3]);
  g.gain.setValueAtTime(.8,now);g.gain.exponentialRampToValueAtTime(.0001,now+cfg[3]);
  osc.start(now);osc.stop(now+cfg[3]+.02);out.gain.exponentialRampToValueAtTime(.0001,now+cfg[3]+.025);
  if(type==='explode'){
    const len=Math.floor(ctx.sampleRate*.18),buffer=ctx.createBuffer(1,len,ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*(1-i/len);
    const noise=ctx.createBufferSource();const ng=ctx.createGain();noise.buffer=buffer;ng.gain.setValueAtTime(.12,now);ng.gain.exponentialRampToValueAtTime(.0001,now+.18);noise.connect(ng);ng.connect(ctx.destination);noise.start(now);
  }
}
function qualityShouldPreload(path){
  const mode=qualityProfile().preload;
  if(mode==='all')return true;
  if(mode==='core')return /\/(branding|backgrounds|ammo)\//.test(path);
  return /\/branding\//.test(path);
}

const ASSET_IMAGES = new Map();
function flattenAssetPaths(value,out=[]){
  if(!value)return out;
  if(typeof value==='string')out.push(value);
  else if(Array.isArray(value))value.forEach(v=>flattenAssetPaths(v,out));
  else if(typeof value==='object')Object.values(value).forEach(v=>flattenAssetPaths(v,out));
  return out;
}
function requestAssetImage(path){
  if(!path)return null;
  let img=ASSET_IMAGES.get(path);
  if(img)return img;
  img=new Image();img.decoding='async';img.loading='eager';try{img.fetchPriority=qualityMode==='high'?'high':'auto';}catch{}
  ASSET_IMAGES.set(path,img);img.src=path;
  img.onerror=()=>console.warn('Asset não carregado:',path);
  return img;
}
function preloadAssets(){
  [...new Set(flattenAssetPaths(GAME_ASSETS))].filter(qualityShouldPreload).forEach(requestAssetImage);
}
function assetImage(path){return path ? requestAssetImage(path) : null;}
function drawSprite(path,x,y,maxSize,rotation=0,alpha=1){
  const img=assetImage(path);
  if(!img||!img.naturalWidth)return false;
  const scale=maxSize/Math.max(img.naturalWidth,img.naturalHeight);
  const w=img.naturalWidth*scale,h=img.naturalHeight*scale;
  ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.globalAlpha=alpha;
  ctx.drawImage(img,-w/2,-h/2,w,h);ctx.restore();return true;
}
function assetForProduct(id,type,subtype){
  if(type==='ship')return GAME_ASSETS.ships[id];
  if(type==='drone')return GAME_ASSETS.drones[id];
  if(type==='pet')return GAME_ASSETS.drones.pet;
  if(type==='petGear')return ({guard:GAME_ASSETS.equipment.autoLaserCpu,box:GAME_ASSETS.equipment.ammoAutoBuyCpu,ore:GAME_ASSETS.equipment.rocketTurboCpu,repair:GAME_ASSETS.equipment.rep2,kami:GAME_ASSETS.equipment.autoRocketCpu})[id]||GAME_ASSETS.drones.pet;
  if(type==='ammo'||type==='rocket')return GAME_ASSETS.ammo[id];
  if(GAME_ASSETS.equipment[id])return GAME_ASSETS.equipment[id];
  return null;
}
function factionAsset(id){return GAME_ASSETS.branding[id]||GAME_ASSETS.branding.earth;}
function currentMapBackground(){return progress ? (GAME_ASSETS.backgrounds[progress.mapId]||GAME_ASSETS.backgrounds.b42) : null;}
function drawMapBackground(){
  const img=assetImage(currentMapBackground());
  if(!img||!img.naturalWidth)return false;
  const world=state.currentMap?.world||{w:6000,h:4500};
  const nx=Math.max(0,Math.min(1,(state.camera?.x||0)/Math.max(1,world.w)));
  const ny=Math.max(0,Math.min(1,(state.camera?.y||0)/Math.max(1,world.h)));
  const viewAspect=W/Math.max(1,H),imgAspect=img.naturalWidth/img.naturalHeight;
  let sw=img.naturalWidth*.92,sh=img.naturalHeight*.92;
  if(sw/sh<viewAspect) sh=sw/viewAspect; else sw=sh*viewAspect;
  sw=Math.min(sw,img.naturalWidth);sh=Math.min(sh,img.naturalHeight);
  const sx=(img.naturalWidth-sw)*nx,sy=(img.naturalHeight-sh)*ny;
  const q=qualityProfile();ctx.save();ctx.globalAlpha=q.backgroundAlpha??.5;ctx.filter=`saturate(${q.saturation||1}) contrast(${q.contrast||1})`;
  ctx.drawImage(img,sx,sy,sw,sh,0,0,W,H);ctx.filter='none';
  const shade=ctx.createLinearGradient(0,0,0,H);
  shade.addColorStop(0,'rgba(1,7,16,.16)');shade.addColorStop(.52,'rgba(1,6,14,.05)');shade.addColorStop(1,'rgba(1,5,12,.38)');
  ctx.fillStyle=shade;ctx.fillRect(0,0,W,H);
  const vignette=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.25,W/2,H/2,Math.max(W,H)*.72);
  vignette.addColorStop(0,'rgba(0,0,0,0)');vignette.addColorStop(1,'rgba(0,0,0,.25)');ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
  ctx.restore();return true;
}

let W = 0, H = 0, DPR = 1;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, qualityProfile().dpr);
  W = innerWidth; H = innerHeight;
  canvas.width = Math.max(1,Math.floor(W * DPR)); canvas.height = Math.max(1,Math.floor(H * DPR));
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
addEventListener('resize', resize); resize();

const ui = {
  topbar: $('#topbar'), topMeta: document.querySelector('#topbar .top-meta'), hudToggle: $('#hudToggle'), playerPanel: $('#playerPanel'), playerHeader: $('#playerHeader'), playerToggle: $('#playerToggle'), leftStats: $('#leftStats'), statsToggle: $('#statsToggle'), minimapPanel: $('#minimapPanel'), minimapToggle: $('#minimapToggle'), minimapHeader: $('#minimapHeader'), statsHeader: $('#statsHeader'), shipHudArt: $('#shipHudArt'), factionIcon: $('#factionIcon'), factionLabel: $('#factionLabel'), mapLabel: $('#mapLabel'), sectorName: $('#sectorName'), coordLabel: $('#coordLabel'), routeLabel: $('#routeLabel'), discoveriesLabel: $('#discoveriesLabel'), shipLabel: $('#shipLabel'), lvl: $('#lvl'), petFloatPanel: $('#petFloatPanel'), petFloatLevel: $('#petFloatLevel'), petGearQuickSelect: $('#petGearQuickSelect'), petFloatStatus: $('#petFloatStatus'),
  hp: $('#hp'), maxHp: $('#maxHp'), shield: $('#shield'), maxShield: $('#maxShield'), speed: $('#speed'), dmg: $('#dmg'), credits: $('#credits'), uridium: $('#uridium'), xp: $('#xp'), droneCount: $('#droneCount'),
  laserAmmoButtons: $('#laserAmmoButtons'), rocketAmmoButtons: $('#rocketAmmoButtons'), laserToggle: $('#laserToggle'), rocketFire: $('#rocketFire'), autoLaser: $('#autoLaser'), autoRocket: $('#autoRocket'), turboRocket: $('#turboRocket'), rocketCd: $('#rocketCd'), weaponBar: $('#weaponBar'), weaponBarContent: $('#weaponBarContent'), weaponBarToggle: $('#weaponBarToggle'),
  toast: $('#toast'), baseTradePrompt: $('#baseTradePrompt'), baseTradePromptInfo: $('#baseTradePromptInfo'), repairModal: $('#repairModal'), repairModalText: $('#repairModalText'), repairShipName: $('#repairShipName'), repairBonusCount: $('#repairBonusCount'), repairUriCount: $('#repairUriCount'), repairUseBonus: $('#repairUseBonus'), repairUseUri: $('#repairUseUri'), repairUseAurora: $('#repairUseAurora'), gameCelebration: $('#gameCelebration'), celebrationPanel: $('#celebrationPanel'), celebrationKicker: $('#celebrationKicker'), celebrationTitle: $('#celebrationTitle'), celebrationSubtitle: $('#celebrationSubtitle'), portalPrompt: $('#portalPrompt'), portalPromptMap: $('#portalPromptMap'), jumpTransition: $('#jumpTransition'), jumpTitle: $('#jumpTitle'), jumpSubtitle: $('#jumpSubtitle'), factionModal: $('#factionModal'), factionCards: $('#factionCards'),
  mapBtn: $('#mapBtn'), mapModal: $('#mapModal'), closeMap: $('#closeMap'), mapNetwork: $('#mapNetwork'),
  missionBtn: $('#missionBtn'), missionActiveCount: $('#missionActiveCount'), missionModal: $('#missionModal'), closeMission: $('#closeMission'), missionContent: $('#missionContent'), passBtn: $('#passBtn'), passTierBadge: $('#passTierBadge'), passModal: $('#passModal'), closePass: $('#closePass'), passContent: $('#passContent'), activeMissionPanel: $('#activeMissionPanel'), activeMissionCategory: $('#activeMissionCategory'), activeMissionTitle: $('#activeMissionTitle'), activeMissionTask: $('#activeMissionTask'), activeMissionProgressBar: $('#activeMissionProgressBar'), activeMissionProgressText: $('#activeMissionProgressText'), activeMissionRewardFactor: $('#activeMissionRewardFactor'), activeMissionDots: $('#activeMissionDots'), activeMissionOpen: $('#activeMissionOpen'), activityPanel: $('#activityPanel'), activityFeed: $('#activityFeed'), activityClearBtn: $('#activityClearBtn'),
  gateBtn: $('#gateBtn'), gatePieceBadge: $('#gatePieceBadge'), gateModal: $('#gateModal'), closeGate: $('#closeGate'), gatePiecesText: $('#gatePiecesText'), gateLivesText: $('#gateLivesText'), gateCompletedText: $('#gateCompletedText'), gatePieceGrid: $('#gatePieceGrid'), gateJumpBtn: $('#gateJumpBtn'), gateUriText: $('#gateUriText'), gateSpinButtons: $('#gateSpinButtons'), gateJumpBonus: $('#gateJumpBonus'), gateRepairBonus: $('#gateRepairBonus'), gateLogDisks: $('#gateLogDisks'), useRepairBonus: $('#useRepairBonus'), gateResultBox: $('#gateResultBox'), gateRoundsGrid: $('#gateRoundsGrid'), gateAlphaStatusTitle: $('#gateAlphaStatusTitle'), gateAlphaStatusText: $('#gateAlphaStatusText'), gateHud: $('#gateHud'), gateHudRound: $('#gateHudRound'), gateHudWave: $('#gateHudWave'), gateHudRemaining: $('#gateHudRemaining'), gateHudNext: $('#gateHudNext'), gateHudLives: $('#gateHudLives'),
  gateProtocolTabs: $('#gateProtocolTabs'), gateCoreLabel: $('#gateCoreLabel'), gateProtocolLabel: $('#gateProtocolLabel'), gateCombatProtocol: $('#gateCombatProtocol'), gateRewardNote: $('#gateRewardNote'), gateHudTitle: $('#gateHudTitle'),
  abilityBar: $('#abilityBar'), shipAbilityBtn: $('#shipAbilityBtn'), shipAbilityIcon: $('#shipAbilityIcon'), shipAbilityName: $('#shipAbilityName'), shipAbilityStatus: $('#shipAbilityStatus'), shipAbilityFill: $('#shipAbilityFill'), petKamiAbilityBtn: $('#petKamiAbilityBtn'), petKamiAbilityStatus: $('#petKamiAbilityStatus'), petKamiAbilityFill: $('#petKamiAbilityFill'), bossPhaseHud: $('#bossPhaseHud'), bossPhaseName: $('#bossPhaseName'), bossPhaseLabel: $('#bossPhaseLabel'), bossPhaseFill: $('#bossPhaseFill'), bossPhaseStatus: $('#bossPhaseStatus'),
  petBtn: $('#petBtn'), petModal: $('#petModal'), closePet: $('#closePet'), petContent: $('#petContent'),
  pilotBtn: $('#pilotBtn'), pilotPointBadge: $('#pilotPointBadge'), pilotModal: $('#pilotModal'), closePilot: $('#closePilot'), pilotLogDisks: $('#pilotLogDisks'), pilotPointsTotal: $('#pilotPointsTotal'), pilotPointsAvailable: $('#pilotPointsAvailable'), pilotPointsSpent: $('#pilotPointsSpent'), pilotNextPointTitle: $('#pilotNextPointTitle'), pilotNextPointCost: $('#pilotNextPointCost'), pilotConvertPoint: $('#pilotConvertPoint'), pilotLogBuyButtons: $('#pilotLogBuyButtons'), pilotResetCost: $('#pilotResetCost'), pilotResetBtn: $('#pilotResetBtn'), pilotSkillTree: $('#pilotSkillTree'),
  auctionBtn: $('#auctionBtn'), auctionTopClock: $('#auctionTopClock'), auctionModal: $('#auctionModal'), closeAuction: $('#closeAuction'), auctionClock: $('#auctionClock'), auctionCredits: $('#auctionCredits'), auctionEscrow: $('#auctionEscrow'), auctionGrid: $('#auctionGrid'), auctionHistory: $('#auctionHistory'),
  arenaBtn: $('#arenaBtn'), arenaTopCount: $('#arenaTopCount'), arenaModal: $('#arenaModal'), closeArena: $('#closeArena'), arenaRefresh: $('#arenaRefresh'), arenaAttacksLeft: $('#arenaAttacksLeft'), arenaRating: $('#arenaRating'), arenaWins: $('#arenaWins'), arenaLosses: $('#arenaLosses'), arenaPower: $('#arenaPower'), arenaDailyReward: $('#arenaDailyReward'), arenaRewardLeague: $('#arenaRewardLeague'), arenaRewardRank: $('#arenaRewardRank'), arenaRewardBonus: $('#arenaRewardBonus'), arenaRewardProgress: $('#arenaRewardProgress'), arenaRewardItems: $('#arenaRewardItems'), arenaRewardClaim: $('#arenaRewardClaim'), arenaRewardFoot: $('#arenaRewardFoot'), arenaOpponents: $('#arenaOpponents'), arenaHistory: $('#arenaHistory'), arenaResult: $('#arenaResult'), arenaBattleStage: $('#arenaBattleStage'), arenaBattleStatus: $('#arenaBattleStatus'), arenaBattleTimer: $('#arenaBattleTimer'), arenaBattleSkip: $('#arenaBattleSkip'), arenaBattleField: $('#arenaBattleField'), arenaFighterAttacker: $('#arenaFighterAttacker'), arenaFighterDefender: $('#arenaFighterDefender'), arenaAttackerName: $('#arenaAttackerName'), arenaDefenderName: $('#arenaDefenderName'), arenaAttackerShip: $('#arenaAttackerShip'), arenaDefenderShip: $('#arenaDefenderShip'), arenaAttackerShieldBar: $('#arenaAttackerShieldBar'), arenaDefenderShieldBar: $('#arenaDefenderShieldBar'), arenaAttackerHpBar: $('#arenaAttackerHpBar'), arenaDefenderHpBar: $('#arenaDefenderHpBar'), arenaAttackerShieldText: $('#arenaAttackerShieldText'), arenaDefenderShieldText: $('#arenaDefenderShieldText'), arenaAttackerHpText: $('#arenaAttackerHpText'), arenaDefenderHpText: $('#arenaDefenderHpText'), arenaBattleRound: $('#arenaBattleRound'), arenaProjectileLayer: $('#arenaProjectileLayer'), arenaBattleFeed: $('#arenaBattleFeed'), arenaBattleAnalysis: $('#arenaBattleAnalysis'),
  clanBtn: $('#clanBtn'), clanTopTag: $('#clanTopTag'), clanModal: $('#clanModal'), closeClan: $('#closeClan'), clanRefresh: $('#clanRefresh'), clanContent: $('#clanContent'),
  warfrontBtn: $('#warfrontBtn'), warfrontTopStatus: $('#warfrontTopStatus'), warfrontModal: $('#warfrontModal'), closeWarfront: $('#closeWarfront'), warfrontRefresh: $('#warfrontRefresh'), warfrontContent: $('#warfrontContent'),
  premiumBtn: $('#premiumBtn'), premiumTopStatus: $('#premiumTopStatus'), premiumModal: $('#premiumModal'), closePremium: $('#closePremium'), premiumModeChip: $('#premiumModeChip'), premiumBenefits: $('#premiumBenefits'), premiumProductGrid: $('#premiumProductGrid'),
  saleConfirmModal: $('#saleConfirmModal'), saleConfirmEyebrow: $('#saleConfirmEyebrow'), saleConfirmTitle: $('#saleConfirmTitle'), saleConfirmItem: $('#saleConfirmItem'), saleConfirmCopy: $('#saleConfirmCopy'), saleConfirmValueLabel: $('#saleConfirmValueLabel'), saleConfirmValue: $('#saleConfirmValue'), saleConfirmCancel: $('#saleConfirmCancel'), saleConfirmAccept: $('#saleConfirmAccept'),
  shopBtn: $('#shopBtn'), shopModal: $('#shopModal'), closeShop: $('#closeShop'), shopTabs: $('#shopTabs'), shopGrid: $('#shopGrid'), shopCredits: $('#shopCredits'), shopStellarium: $('#shopStellarium'),
  hangarBtn: $('#hangarBtn'), hangarModal: $('#hangarModal'), closeHangar: $('#closeHangar'), hangarTabs: $('#hangarTabs'), hangarContent: $('#hangarContent'), hangarShipName: $('#hangarShipName'),
  loginModal: $('#loginModal'), loginTabBtn: $('#loginTabBtn'), registerTabBtn: $('#registerTabBtn'), authTabs: $('#authTabs'), loginForm: $('#loginForm'), registerForm: $('#registerForm'), recoveryForm: $('#recoveryForm'), forgotPasswordBtn: $('#forgotPasswordBtn'), recoveryPassword: $('#recoveryPassword'), recoveryPasswordConfirm: $('#recoveryPasswordConfirm'), loginEmail: $('#loginEmail'), loginPassword: $('#loginPassword'), registerCallsign: $('#registerCallsign'), registerEmail: $('#registerEmail'), registerPassword: $('#registerPassword'), authMessage: $('#authMessage'), userLabel: $('#userLabel'), rankChip: $('#rankChip'), syncLabel: $('#syncLabel'), logoutBtn: $('#logoutBtn'), safeZoneLabel: $('#safeZoneLabel'), cargoUsed: $('#cargoUsed'), cargoMax: $('#cargoMax'), cargoBtn: $('#cargoBtn'), cargoModal: $('#cargoModal'), closeCargo: $('#closeCargo'), cargoSummary: $('#cargoSummary'), cargoGrid: $('#cargoGrid'), sellAllCargo: $('#sellAllCargo'), configBtn: $('#configBtn'), configModal: $('#configModal'), closeConfig: $('#closeConfig'), qualityButtons: $('#qualityButtons'), qualityCurrentBadge: $('#qualityCurrentBadge'), audioEnabledToggle: $('#audioEnabledToggle'), hudSettingsGrid: $('#hudSettingsGrid'), settingsTabs: $('#settingsTabs'), settingsGamePanel: $('#settingsGamePanel'), settingsRankingPanel: $('#settingsRankingPanel'), settingsAccountPanel: $('#settingsAccountPanel'), rankingRefreshBtn: $('#rankingRefreshBtn'), rankingMyPatent: $('#rankingMyPatent'), rankingPatentGuide: $('#rankingPatentGuide'), rankingPoints: $('#rankingPoints'), rankingArena: $('#rankingArena'), rankingAliens: $('#rankingAliens'), rankingGg: $('#rankingGg'), rankingUpdated: $('#rankingUpdated'), accountEmail: $('#accountEmail'), accountCallsign: $('#accountCallsign'), accountSaveName: $('#accountSaveName'), accountNameStatus: $('#accountNameStatus'), accountNewPassword: $('#accountNewPassword'), accountConfirmPassword: $('#accountConfirmPassword'), accountSavePassword: $('#accountSavePassword'), accountPasswordStatus: $('#accountPasswordStatus'), accountSummary: $('#accountSummary'),
};

const SAVE_KEY_PREFIX = 'stellarLegacyV5Save';
const SAFE_ZONE = { mapId: 'x1', x: 620, y: MAPS.x1.world.h / 2, radius: 520 };
const PORTAL_NEUTRAL_RADIUS = 180;

function basePointForFaction(factionId){
  const w=MAPS.x1.world.w,h=MAPS.x1.world.h;
  if(factionId==='mars') return {x:w-620,y:Math.round(h*.28)};
  if(factionId==='jupiter') return {x:w-620,y:Math.round(h*.72)};
  return {x:620,y:Math.round(h*.50)};
}
function currentBasePoint(){
  const owner=currentTerritoryFaction?.()||progress?.profile?.faction||'earth';
  return basePointForFaction(owner);
}
let cloudDirty = false;
let cloudBusy = false;
let authenticated = false;
function saveKey(){return `${SAVE_KEY_PREFIX}:${getUser()?.id || 'guest'}`;}
const TWO_PI = Math.PI * 2;
const CARGO_BOX_LIFETIME_SEC = 30;
const categories = {
  ships:'Naves', lasers:'Lasers', generators:'Geradores', drones:'Drones', pet:'AUX-9', extras:'Extras', ammo:'Munição', rockets:'Mísseis'
};

// ===================== V12 PREMIUM RUNTIME =====================
const premiumRuntime={state:null,busy:false,lastAt:0};
function premiumActive(){return !!premiumRuntime.state?.premium_active;}
function premiumPassActive(){return !!premiumRuntime.state?.battle_pass_active;}
function premiumCanPurchase(){return !!premiumRuntime.state?.can_purchase;}
function premiumElitePrice(price,currency){const p=Math.max(0,Math.round(Number(price)||0));return currency==='uridium'&&premiumActive()?Math.max(1,Math.floor(p*.95)):p;}
function alphaSpinUnitCost(){const base=galaxyGateDef().spinCost;return premiumActive()?Math.max(1,Math.floor(base*.90)):base;}
function updatePremiumBadge(){if(!ui.premiumTopStatus)return;ui.premiumTopStatus.textContent=premiumActive()?'ATIVO':premiumPassActive()?'PASSE':'LOJA';ui.premiumBtn?.classList.toggle('gold',premiumActive()||premiumPassActive());}
async function refreshPremiumState(force=false){if(!authenticated)return premiumRuntime.state;if(!force&&premiumRuntime.state&&Date.now()-premiumRuntime.lastAt<30000)return premiumRuntime.state;if(premiumRuntime.busy)return premiumRuntime.state;premiumRuntime.busy=true;try{premiumRuntime.state=await getPremiumShopOnline();premiumRuntime.lastAt=Date.now();updatePremiumBadge();return premiumRuntime.state;}catch(e){console.warn('premium state',e);return premiumRuntime.state;}finally{premiumRuntime.busy=false;}}

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
  cruelty1:{id:'cruelty1',branch:'utility',name:'Crueldade I',max:2,values:[4,8],unit:'%',creditBase:15000000,desc:'Aumenta Stellarium recebido de aliens.',requires:'luck1'},
  tractor1:{id:'tractor1',branch:'utility',name:'Raio Trator I',max:2,values:[1,2],unit:'%',creditBase:20000000,desc:'Aumenta recursos em caixas de carga.',requires:'cruelty1'},
  greed:{id:'greed',branch:'utility',name:'Ganância',max:5,values:[4,8,12,18,25],unit:'%',creditBase:35000000,desc:'Aumenta Créditos recebidos de aliens.',requires:'tractor1'},
  tractor2:{id:'tractor2',branch:'utility',name:'Raio Trator II',max:3,values:[4,8,18],unit:'%',creditBase:60000000,desc:'Amplia o bônus de carga coletada.',requires:'greed'},
  cruelty2:{id:'cruelty2',branch:'utility',name:'Crueldade II',max:3,values:[4,10,17],unit:'%',creditBase:80000000,desc:'Amplia o bônus de Stellarium até 25% no total.',requires:'tractor2'},
  luck2:{id:'luck2',branch:'utility',name:'Sorte II',max:3,values:[2,4,8],unit:'%',creditBase:100000000,desc:'Amplia Sorte do Materializador até 12%.',requires:'cruelty2'},
  detonation1:{id:'detonation1',branch:'offense',name:'Detonação I',max:2,values:[7,14],unit:'%',creditBase:2000000,desc:'Aumenta o dano explosivo do Nova Burst.',requires:null},
  explosives:{id:'explosives',branch:'offense',name:'Explosivos',max:5,values:[4,8,12,18,25],unit:'%',creditBase:4000000,desc:'Aumenta o raio do Nova Burst.',requires:'detonation1'},
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

// ===================== REAL-PLAYER ONLINE AUCTION =====================
function freshAuctionState(){return {hourKey:null,lots:{},history:[],onlineReady:false,legacyEscrowMigrated:false,marketVersion:3};}
function auctionHourKey(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}-${String(d.getHours()).padStart(2,'0')}`;}
function auctionSecondsLeft(){const d=new Date(),next=new Date(d);next.setMinutes(60,0,0);return Math.max(0,Math.ceil((next-d)/1000));}
function auctionSeed(str){let h=2166136261>>>0;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function auctionRand(seed){let x=seed>>>0;return()=>{x=(Math.imul(1664525,x)+1013904223)>>>0;return x/4294967296;};}
function eliteAuctionCatalog(){
  const out=[];
  Object.values(SHIPS).filter(x=>x.currency==='uridium'&&!x.eventOnly&&x.shopAvailable!==false&&x.auctionEligible!==false&&!progress?.ownedShips?.includes(x.id)).forEach(x=>out.push({ref:`ship:${x.id}`,kind:'ship',id:x.id,name:x.name,uri:x.price,qty:1,unique:true}));
  Object.values(ITEMS).filter(x=>x.currency==='uridium'&&!x.eventOnly&&x.shopAvailable!==false&&x.auctionEligible!==false&&!(x.type==='extra'&&progress&&ownsExtraItem(x.id))).forEach(x=>out.push({ref:`item:${x.id}`,kind:'item',id:x.id,name:x.name,uri:x.price,qty:1,unique:x.type==='extra'}));
  Object.values(LASER_AMMO).filter(x=>x.currency==='uridium'&&x.purchasable!==false).forEach(x=>out.push({ref:`ammo:${x.id}`,kind:'ammo',id:x.id,name:`${x.name} • pacote ${fmt(x.pack)}`,uri:x.price,qty:x.pack}));
  Object.values(ROCKETS).filter(x=>x.currency==='uridium').forEach(x=>out.push({ref:`rocket:${x.id}`,kind:'rocket',id:x.id,name:`${x.name} • pacote ${fmt(x.pack)}`,uri:x.price,qty:x.pack}));
  Object.values(PET_GEARS).filter(x=>x.currency==='uridium'&&!progress?.pet?.gearsOwned?.[x.id]).forEach(x=>out.push({ref:`petGear:${x.id}`,kind:'petGear',id:x.id,name:`AUX-9 • ${x.name}`,uri:x.cost,qty:1,unique:true}));
  return out;
}
function normalizeAuctionEconomy(lot,key=progress?.auction?.hourKey||auctionHourKey()){
  if(!lot)return lot;
  if(!Number.isFinite(Number(lot.reserve))||Number(lot.reserve)<100000||!Number.isFinite(Number(lot.finalSystemBid))){
    const rnd=auctionRand(auctionSeed(`${key}:${lot.ref}`));
    lot.reserve=Math.max(100000,Math.round((Number(lot.uri)||1000)*70*(.75+rnd()*.5)/100000)*100000);
    lot.finalSystemBid=Math.max(lot.reserve+100000,Math.round(lot.reserve*(1.25+rnd()*1.75)/100000)*100000);
  }
  return lot;
}
function buildAuctionLots(key){
  const lots={};
  for(const entry of eliteAuctionCatalog()){
    const lot=normalizeAuctionEconomy({...entry,userBid:0,escrow:0,marketBid:0,leaderUserId:null,leaderCallsign:null},key);
    lots[entry.ref]=lot;
  }
  return lots;
}
function auctionSystemBid(lot){
  normalizeAuctionEconomy(lot);
  const d=new Date(),fraction=(d.getMinutes()*60+d.getSeconds())/3600;
  return Math.max(100000,Math.round((lot.reserve+(lot.finalSystemBid-lot.reserve)*fraction)/100000)*100000);
}
function auctionCurrentBid(lot){return Number(lot?.marketBid)>0?Number(lot.marketBid):auctionSystemBid(lot);}
function auctionEscrow(){return Object.values(progress?.auction?.lots||{}).reduce((sum,l)=>sum+(auctionLotEligible(l)?(Number(l.userBid)||0):0),0);}
function auctionSpendableCredits(excludeRef=null){const reserved=Object.values(progress?.auction?.lots||{}).reduce((sum,l)=>sum+(!auctionLotEligible(l)||l.ref===excludeRef?0:(Number(l.userBid)||0)),0);return Math.max(0,(progress?.profile?.credits||0)-reserved);}
function grantAuctionLot(lot){
  if(lot.kind==='ship'){if(progress.ownedShips.includes(lot.id))return false;progress.ownedShips.push(lot.id);return true;}
  if(lot.kind==='item'){const item=ITEMS[lot.id];if(item?.type==='drone'){if(progress.drones.length>=8)return false;progress.drones.push({id:`d_auc_${Date.now()}_${Math.random().toString(16).slice(2,5)}`,type:lot.id,slots:Array(item.slots).fill(null)});return true;}if(item?.type==='extra'&&ownsExtraItem(lot.id))return false;addInventory(lot.id);return true;}
  if(lot.kind==='ammo'){progress.ammo[lot.id]=(progress.ammo[lot.id]||0)+(LASER_AMMO[lot.id]?.pack||lot.qty||0);return true;}
  if(lot.kind==='rocket'){progress.rockets[lot.id]=(progress.rockets[lot.id]||0)+(ROCKETS[lot.id]?.pack||lot.qty||0);return true;}
  if(lot.kind==='petGear'){if(progress.pet.gearsOwned[lot.id])return false;progress.pet.gearsOwned[lot.id]=true;return true;}
  return false;
}
async function finalizeOnlineAuctionBid(row){
  const lot=row.lot||{};if(!lot?.ref||row.status!=='active')return;
  try{
    const market=await loadAuctionMarket(row.hour_key),winner=market.find(x=>x.lot_ref===row.lot_ref),mine=getUser()?.id;
    const won=winner?.leader_user_id===mine&&Number(winner?.user_bid)===Number(row.user_bid);
    let result='PERDEU',status='lost';
    if(won){
      if(progress.profile.credits>=Number(row.user_bid)&&grantAuctionLot(lot)){progress.profile.credits-=Number(row.user_bid);result='VENCEU';status='won';}
      else{result='CANCELADO';status='cancelled';}
    }
    progress.auction.history.unshift({at:Date.now(),name:lot.name||row.lot_ref,bid:Number(row.user_bid)||0,result});
    progress.auction.history=progress.auction.history.slice(0,12);
    await markAuctionBidStatusOnline({hourKey:row.hour_key,lotRef:row.lot_ref,status});
    saveGame();await flushCloudSave(true);
  }catch(e){console.warn('auction settle online',e);}
}
let auctionSyncBusy=false,auctionLastMarketSync=0;
async function syncAuctionBidsOnline(){
  if(!authenticated||!progress||auctionSyncBusy)return;
  auctionSyncBusy=true;
  try{
    ensureAuctionState();
    const current=auctionHourKey();
    const [ownRows,marketRows]=await Promise.all([loadAuctionBids(),loadAuctionMarket(current)]);
    for(const row of ownRows)if(row.hour_key!==current)await finalizeOnlineAuctionBid(row);
    const a=progress.auction;
    const prevLeading=new Set(Object.values(a.lots||{}).filter(l=>l.userBid>0).map(l=>l.ref));
    for(const lot of Object.values(a.lots||{})){lot.userBid=0;lot.escrow=0;lot.marketBid=0;lot.leaderUserId=null;lot.leaderCallsign=null;}
    for(const row of ownRows){
      if(row.hour_key!==current)continue;
      let lot=a.lots[row.lot_ref];
      if(!lot&&auctionLotEligible(row.lot)){lot=normalizeAuctionEconomy({...row.lot,userBid:0,escrow:0,marketBid:0,leaderUserId:null,leaderCallsign:null},a.hourKey);a.lots[row.lot_ref]=lot;}
      if(lot&&auctionLotEligible(lot)){lot.userBid=Number(row.user_bid)||0;lot.escrow=lot.userBid;}
    }
    for(const row of marketRows){
      let lot=a.lots[row.lot_ref];
      if(!lot&&auctionLotEligible(row.lot)){lot=normalizeAuctionEconomy({...row.lot,userBid:0,escrow:0,marketBid:0,leaderUserId:null,leaderCallsign:null},a.hourKey);a.lots[row.lot_ref]=lot;}
      if(!lot||!auctionLotEligible(lot))continue;
      lot.marketBid=Number(row.user_bid)||0;lot.leaderUserId=row.leader_user_id||null;lot.leaderCallsign=row.leader_callsign||'Piloto';
    }
    const myId=getUser()?.id;
    const staleOwn=[];
    for(const lot of Object.values(a.lots||{})){
      if(lot.userBid>0&&lot.leaderUserId&&lot.leaderUserId!==myId){
        staleOwn.push(lot.ref);
        lot.userBid=0;lot.escrow=0;
      }
    }
    if(staleOwn.length){
      Promise.allSettled(staleOwn.map(ref=>markAuctionBidStatusOnline({hourKey:current,lotRef:ref,status:'lost'})));
    }
    for(const ref of prevLeading){
      const lot=a.lots[ref];
      if(lot&&lot.leaderUserId&&lot.leaderUserId!==myId)showToast(`${lot.name}: seu lance foi superado por ${lot.leaderCallsign}`);
    }
    a.onlineReady=true;auctionLastMarketSync=Date.now();saveGame();if(ui.auctionModal&&!ui.auctionModal.classList.contains('hidden'))renderAuction();
  }catch(e){console.warn('auction sync online',e);if(ui.auctionModal&&!ui.auctionModal.classList.contains('hidden'))showToast('Leilão online indisponível temporariamente');}
  finally{auctionSyncBusy=false;}
}
function settleAuction(){syncAuctionBidsOnline();}
function ensureAuctionState(){
  progress.auction ||= freshAuctionState();const a=progress.auction;
  if(!a.legacyEscrowMigrated){const legacy=Object.values(a.lots||{}).reduce((sum,l)=>sum+(Number(l.escrow)||0),0);if(legacy>0)progress.profile.credits+=legacy;a.legacyEscrowMigrated=true;}
  const key=auctionHourKey();
  if(a.marketVersion!==3||a.hourKey!==key){a.hourKey=key;a.lots=buildAuctionLots(key);a.marketVersion=3;a.onlineReady=false;saveGame();setTimeout(()=>syncAuctionBidsOnline(),0);}
}

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
const PET_KAMIKAZE_COOLDOWN=15;
const PET_GEARS = {
  guard: { id:'guard', name:'Modo Sentinela', cost:150000, currency:'uridium', description:'Combate assistido: prioriza seu alvo atual e, quando você está livre, caça somente dentro do mesmo alcance de ataque laser da nave.' },
  box: { id:'box', name:'Módulo Salvager', cost:100000, currency:'uridium', description:'Busca a caixa de saque mais próxima do próprio AUX-9 em até 50% do raio do minimapa e mantém o alvo até concluir a coleta. Seu alvo em combate sempre tem prioridade máxima.' },
  ore: { id:'ore', name:'Módulo Minerador', cost:80000, currency:'uridium', description:'Busca a pedra/minério mais próximo do próprio AUX-9 em até 50% do raio do minimapa e mantém o alvo até concluir a coleta. Seu alvo em combate sempre tem prioridade máxima.' },
  repair: { id:'repair', name:'Módulo Reclaimer', cost:200000, currency:'uridium', description:'Segue a nave e regenera HP automaticamente quando você estiver danificado.' },
  kami: { id:'kami', name:'Nova Burst', cost:350000, currency:'uridium', description:'Ativação única: o AUX-9 investe, explode uma vez e volta ao modo Companhia. Recarga de 15s antes de uma nova ativação.' },
};
function freshPet(){
  return {
    owned:false, level:1, xp:0, xpModelV101:true,
    laserSlotsUnlocked:0, shieldSlotsUnlocked:0,
    lasers:[], shields:[],
    gearsOwned:{guard:false,box:false,ore:false,repair:false,kami:false},
    activeGear:'off', kamikazeReadyAt:0
  };
}

// ===================== V13 ACTIVE COMBAT ABILITIES =====================
const SHIP_ABILITY_CLASSES={
  support:new Set(['aegis','hammerclaw','solace','holo']),
  tank:new Set(['bigboy','citadel','sentinel','spectrum','berserker','paladin']),
  control:new Set(['spearhead','defcom','defcomRaven','mimesis','disruptor','hyperion','keres']),
  singularity:new Set(['venom','cyborg','solaris','diminisher','basilisk','hecate']),
};
const WARFRONT_BLUEPRINTS={
  lf4:{id:'lf4',name:'ARC-4 PROTOTYPE',icon:'⚡',need:12,cores:2,itemId:'lf4',qty:1,desc:'Constrói 1 ARC-4 com tecnologia recuperada.'},
  sg3nb02:{id:'sg3nb02',name:'MATRIZ B02',icon:'⬢',need:18,cores:3,itemId:'sg3nb02',qty:1,desc:'Constrói 1 VSH-5 Elite.'},
  g3n7900:{id:'g3n7900',name:'PROPULSOR 7900',icon:'➤',need:15,cores:2,itemId:'g3n7900',qty:1,desc:'Constrói 1 THR-6 Elite.'},
};
function freshWarfrontProgress(){return {skillCores:0,rareDrops:0,blueprints:{lf4:0,sg3nb02:0,g3n7900:0},crafted:{},skillMastery:{support:1,tank:1,control:1,singularity:1,assault:1},worldBossClaims:{}};}
function normalizeWarfrontProgress(){if(!progress)return;progress.warfront ||= freshWarfrontProgress();const w=progress.warfront;w.skillCores=Math.max(0,Math.floor(Number(w.skillCores)||0));w.rareDrops=Math.max(0,Math.floor(Number(w.rareDrops)||0));w.blueprints ||= {};w.crafted ||= {};w.skillMastery ||= {};w.worldBossClaims ||= {};for(const id of Object.keys(WARFRONT_BLUEPRINTS))w.blueprints[id]=Math.max(0,Math.floor(Number(w.blueprints[id])||0));for(const id of ['support','tank','control','singularity','assault'])w.skillMastery[id]=Math.max(1,Math.min(5,Math.floor(Number(w.skillMastery[id])||1)));}
function abilityClassId(){const id=progress?.activeShipId;if(SHIP_ABILITY_CLASSES.support.has(id))return 'support';if(SHIP_ABILITY_CLASSES.tank.has(id))return 'tank';if(SHIP_ABILITY_CLASSES.control.has(id))return 'control';if(SHIP_ABILITY_CLASSES.singularity.has(id))return 'singularity';return 'assault';}
function abilityMasteryLevel(){normalizeWarfrontProgress();return progress?.warfront?.skillMastery?.[abilityClassId()]||1;}
function abilityPowerMultiplier(){return 1+(abilityMasteryLevel()-1)*.08;}
function abilityCooldownMultiplier(){return Math.max(.82,1-(abilityMasteryLevel()-1)*.045);}
function abilityEffectiveCooldown(def=shipAbilityDef()){return def.cooldown*abilityCooldownMultiplier();}
const SHIP_ABILITIES={
  support:{id:'support',name:'NANO RESTORE',icon:'✚',cooldown:38,duration:0,desc:'Repara 30% do HP e 22% do escudo instantaneamente.'},
  tank:{id:'tank',name:'FORTRESS',icon:'⬢',cooldown:50,duration:9,desc:'Reduz em 48% o dano recebido por 9s.'},
  control:{id:'control',name:'JAM PULSE',icon:'◉',cooldown:44,duration:6,desc:'Silencia NPCs próximos por 5s e acelera a nave por 6s.'},
  singularity:{id:'singularity',name:'SINGULARITY',icon:'☢',cooldown:48,duration:7,desc:'Aplica 7 pulsos de dano contínuo no alvo.'},
  assault:{id:'assault',name:'OVERDRIVE',icon:'⚡',cooldown:42,duration:10,desc:'+35% dano e +20% velocidade por 10s.'},
};
const abilityRuntime={activeId:null,activeUntil:0,dotTargetId:null,dotTicks:0,dotNextAt:0};
function normalizeCombatAbilities(){if(!progress)return;progress.combatAbilities ||= {shipReadyAt:0};progress.combatAbilities.shipReadyAt=Math.max(0,Number(progress.combatAbilities.shipReadyAt)||0);}
function shipAbilityDef(){return SHIP_ABILITIES[abilityClassId()]||SHIP_ABILITIES.assault;}
function shipAbilityCooldownRemaining(){normalizeCombatAbilities();return Math.max(0,(progress.combatAbilities.shipReadyAt-Date.now())/1000);}
function shipAbilityActive(id=null){return abilityRuntime.activeUntil>Date.now()&&(!id||abilityRuntime.activeId===id);}
function shipAbilityDamageMultiplier(){return shipAbilityActive('assault')?(1.35+(abilityMasteryLevel()-1)*.05):1;}
function shipAbilitySpeedMultiplier(){if(shipAbilityActive('assault'))return 1.20+(abilityMasteryLevel()-1)*.025;if(shipAbilityActive('control'))return 1.24+(abilityMasteryLevel()-1)*.025;return 1;}
function shipAbilityIncomingMultiplier(){return shipAbilityActive('tank')?Math.max(.34,.52-(abilityMasteryLevel()-1)*.045):1;}
function triggerPetKamikaze(){
  if(!progress?.pet?.owned){showToast('Adquira o AUX-9 primeiro');return;}
  if(!progress.pet.gearsOwned?.kami){showToast('Compre o módulo Nova Burst no AUX-9');return;}
  if(petKamikazeCooldownRemaining()>0){showToast(`Nova Burst recarregando • ${petKamikazeCooldownRemaining().toFixed(1)}s`);return;}
  if(!state.target||state.target.hp<=0||state.target.isPlayer){const nearest=petNearestToPlayer(state.enemies.filter(e=>e.hp>0),petCombatSearchRange());if(nearest)state.target=nearest;}
  if(!state.target||state.target.hp<=0||state.target.isPlayer){showToast('Selecione um NPC para lançar o Nova Burst');return;}
  setPetGear('kami');
}
function useShipAbility(){
  if(!progress||progress.repairRequired||state.jumping)return; const def=shipAbilityDef(),remaining=shipAbilityCooldownRemaining();
  if(remaining>0){showToast(`${def.name} recarregando • ${remaining.toFixed(1)}s`);return;}
  const now=Date.now();normalizeCombatAbilities();
  if(def.id==='support'){
    const power=abilityPowerMultiplier(),hp=Math.round(player.maxHp*.30*power),shield=Math.round(player.maxShield*.22*power);const bh=player.hp,bs=player.shield;player.hp=Math.min(player.maxHp,player.hp+hp);player.shield=Math.min(player.maxShield,player.shield+shield);spawnParticle(player.x,player.y-34,`+${fmt(player.hp-bh)} HP • +${fmt(player.shield-bs)} ESC`,'#74ffc2');spawnImpactFx(player.x,player.y,'#74ffc2',70,'shield');
  }else if(def.id==='control'){
    const victims=state.enemies.filter(e=>e.hp>0&&Math.hypot(e.x-player.x,e.y-player.y)<=520);for(const e of victims)e.jammedUntil=nowSec()+5+(abilityMasteryLevel()-1)*.75;abilityRuntime.activeId=def.id;abilityRuntime.activeUntil=now+def.duration*1000;spawnParticle(player.x,player.y-42,`JAM • ${victims.length} ALVOS`,'#7eeeff');spawnImpactFx(player.x,player.y,'#7eeeff',110,'shield');
  }else if(def.id==='singularity'){
    if(!state.target||state.target.hp<=0||state.target.isPlayer){showToast('Selecione um NPC para usar Singularity');return;}abilityRuntime.dotTargetId=state.target.id;abilityRuntime.dotTicks=7;abilityRuntime.dotNextAt=nowSec();abilityRuntime.activeId=def.id;abilityRuntime.activeUntil=now+def.duration*1000;spawnParticle(state.target.x,state.target.y-state.target.size,'SINGULARITY','#ff5f9e');
  }else{
    abilityRuntime.activeId=def.id;abilityRuntime.activeUntil=now+def.duration*1000;spawnParticle(player.x,player.y-40,def.name,def.id==='tank'?'#ffe777':'#72dcff');spawnImpactFx(player.x,player.y,def.id==='tank'?'#ffe777':'#72dcff',100,'shield');
  }
  progress.combatAbilities.shipReadyAt=now+abilityEffectiveCooldown(def)*1000;saveGame();showToast(`${def.name} ATIVADA!`,'reward');
}
function updateCombatAbilities(){
  if(!progress)return; const now=nowSec();
  if(abilityRuntime.dotTicks>0&&now>=abilityRuntime.dotNextAt){const e=state.enemies.find(x=>x.id===abilityRuntime.dotTargetId&&x.hp>0);if(!e){abilityRuntime.dotTicks=0;abilityRuntime.dotTargetId=null;}else{const dmg=Math.max(1800,Math.round(player.laserDamage*1.15*abilityPowerMultiplier()));dealDamageToEnemy(e,dmg,'#ff5f9e');abilityRuntime.dotTicks--;abilityRuntime.dotNextAt=now+1;if(abilityRuntime.dotTicks<=0)abilityRuntime.dotTargetId=null;}}
}
function updateAbilityHud(){
  if(!progress||!ui.shipAbilityBtn)return;const def=shipAbilityDef(),rem=shipAbilityCooldownRemaining(),active=shipAbilityActive(def.id);ui.shipAbilityName.textContent=def.name;ui.shipAbilityIcon.textContent=def.icon;ui.shipAbilityBtn.title=def.desc;ui.shipAbilityBtn.disabled=rem>0&&!active;ui.shipAbilityBtn.classList.toggle('ready',rem<=0&&!active);ui.shipAbilityBtn.classList.toggle('active',active);ui.shipAbilityStatus.textContent=active?`ATIVA • ${Math.max(0,(abilityRuntime.activeUntil-Date.now())/1000).toFixed(1)}s`:rem>0?`RECARGA ${rem.toFixed(1)}s • E`:`PRONTA • E • M${abilityMasteryLevel()}`;const ratio=active?1:Math.max(0,Math.min(1,1-rem/abilityEffectiveCooldown(def)));ui.shipAbilityFill.style.transform=`scaleX(${ratio})`;
  const pet=progress.pet,kRem=petKamikazeCooldownRemaining(),kamiReady=!!pet?.owned&&!!pet?.gearsOwned?.kami;ui.petKamiAbilityBtn.disabled=!kamiReady||kRem>0||petRuntime.kamiArmed;ui.petKamiAbilityBtn.classList.toggle('ready',kamiReady&&kRem<=0&&!petRuntime.kamiArmed);ui.petKamiAbilityBtn.classList.toggle('active',!!petRuntime.kamiArmed);ui.petKamiAbilityStatus.textContent=!kamiReady?'BLOQUEADO • K':petRuntime.kamiArmed?'EM ROTA • K':kRem>0?`RECARGA ${kRem.toFixed(1)}s • K`:'PRONTO • K';ui.petKamiAbilityFill.style.transform=`scaleX(${!kamiReady?0:kRem<=0?1:Math.max(0,1-kRem/PET_KAMIKAZE_COOLDOWN)})`;
}

const MAP_GRAPH_NODES = [
  // TERRA — esquerda / centro
  { id:'1-1', x:8,  y:54 }, { id:'1-2', x:22, y:54 }, { id:'1-3', x:36, y:35 }, { id:'1-4', x:36, y:72 },
  // MARTE — topo / direita
  { id:'2-4', x:49, y:24 }, { id:'2-3', x:63, y:24 }, { id:'2-2', x:77, y:24 }, { id:'2-1', x:91, y:16 },
  // JÚPITER — base / direita
  { id:'3-4', x:52, y:78 }, { id:'3-3', x:67, y:78 }, { id:'3-2', x:81, y:78 }, { id:'3-1', x:92, y:87 },
  // BATTLE MAPS — triângulo central
  { id:'4-1', x:50, y:53 }, { id:'4-2', x:63, y:43 }, { id:'4-3', x:68, y:59 }
];

const MAP_GRAPH_LINKS = [
  // TERRA
  ['1-1','1-2'],
  ['1-2','1-3'], ['1-2','1-4'],
  ['1-3','1-4'], ['1-3','2-4'],
  ['1-4','3-4'], ['1-4','4-1'],

  // MARTE — cadeia 2-1 > 2-2 > 2-3 > 2-4
  ['2-1','2-2'],
  ['2-2','2-3'],
  ['2-3','2-4'],
  ['2-3','3-3'],
  ['2-4','4-2'],

  // JÚPITER — cadeia 3-1 > 3-2 > 3-3 > 3-4
  ['3-1','3-2'],
  ['3-2','3-3'],
  ['3-3','3-4'],
  ['3-3','4-3'],

  // BATTLE MAPS — triângulo
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
function makeMission({id,title,desc,tasks,group='mix',sequence=false,rewardFactor=.5,tag='',flatReward=null}) {
  return {id,title,desc,tasks,group,sequence,rewardFactor,tag,flatReward};
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
      group:huntNpc.startsWith('boss')?'boss':'npc',rewardFactor:10,tag:'DIÁRIA • 10X'
    }),
    makeMission({
      id:'daily_ore',
      title:`Mineração do Dia • ${RESOURCES[ore].name}`,
      desc:`Colete a pedra sorteada do dia. Somente ${RESOURCES[ore].name} conta.`,
      tasks:[taskOre(ore,500,'daily_ore_target')],
      group:'ore',rewardFactor:10,tag:'DIÁRIA • RECOMPENSA GARANTIDA',flatReward:{credits:3000000,uridium:0,xp:15000}
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
      group:'mix',rewardFactor:10,tag:'DIÁRIA • 10X'
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
        group:boss?'boss':'npc',rewardFactor:category==='weekly'?7:5,
        tag:`${label.toUpperCase()} • NÍVEL ${i+1} • ${category==='weekly'?'7X':'5X'}`
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
        group:'ore',rewardFactor:category==='weekly'?7:5,
        tag:`${label.toUpperCase()} • NÍVEL ${i+1} • ${category==='weekly'?'7X':'5X'}`
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
      group:npc.startsWith('boss')?'boss':'npc',rewardFactor:3,
      tag:'CONTRATO ESPECIAL • 3X'
    }));
  }
  // 1 missão de cada pedra.
  for(const ore of MISSION_ORES){
    missions.push(makeMission({
      id:`special_ore_${ore}`,
      title:`Contrato Mineral • ${RESOURCES[ore].name}`,
      desc:`Colete 250 unidades de ${RESOURCES[ore].name}.`,
      tasks:[taskOre(ore,250)],
      group:'ore',rewardFactor:3,tag:'MINERAÇÃO ESPECIAL • 3X'
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
    id,title,sequence,group:'mix',rewardFactor:3,tag:sequence?'SEQUENCIAL':'MULTIALVO',
    desc:sequence?'Conclua cada alvo na ordem para liberar a próxima etapa.':'Todos os alvos podem ser concluídos em qualquer ordem.',
    tasks:defs.map(([npc,target],i)=>taskKill(npc,target,`${id}_t${i+1}`))
  })));

  const bossSingles=[
    ['bossLordakia',10],['bossSaimon',10],['bossMordon',10],['bossDevolarium',10],['bossSibelon',10]
  ];
  bossSingles.forEach(([npc,target],i)=>missions.push(makeMission({
    id:`special_boss_contract_${i+1}`,title:`Caçada BOSS ${i+1} • ${NPC_TYPES[npc].name}`,
    desc:`Contrato pesado contra ${NPC_TYPES[npc].name}.`,
    tasks:[taskKill(npc,target)],group:'boss',rewardFactor:3,tag:'BOSS ESPECIAL • 3X'
  })));

  const bossMixes=[
    ['special_boss_mix_1','Tríade BOSS I',false,[['bossStreuner',10],['bossLordakia',8],['bossSaimon',6]]],
    ['special_boss_mix_2','Tríade BOSS II',true,[['bossLordakia',10],['bossSaimon',8],['bossMordon',5]]],
    ['special_boss_mix_3','Tríade BOSS III',false,[['bossSaimon',10],['bossMordon',8],['bossDevolarium',4]]],
    ['special_boss_mix_4','Tríade BOSS IV',true,[['bossMordon',8],['bossDevolarium',5],['bossSibelon',3]]],
    ['special_boss_mix_5','Tríade BOSS V',false,[['bossStreuner',20],['bossDevolarium',4],['bossSibelon',2]]],
  ];
  bossMixes.forEach(([id,title,sequence,defs])=>missions.push(makeMission({
    id,title,sequence,group:'boss',rewardFactor:3,tag:sequence?'BOSS SEQUENCIAL':'BOSS MISTO',
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
    id,title,sequence,tasks,group:'hybrid',rewardFactor:3,
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
      active.bonus ||= {credits:0,uridium:0,xp:0};active.flatRewardApplied=!!active.flatRewardApplied;
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
  if(mission.flatReward){r.credits+=Number(mission.flatReward.credits)||0;r.uridium+=Number(mission.flatReward.uridium)||0;r.xp+=Number(mission.flatReward.xp)||0;}
  return {credits:Math.round(r.credits),uridium:Math.round(r.uridium),xp:Math.round(r.xp)};
}
function missionRewardText(mission,active=null){
  const r=active?roundedMissionBonus(active):projectedMissionReward(mission);
  if(active&&mission.flatReward&&!active.flatRewardApplied){r.credits+=Number(mission.flatReward.credits)||0;r.uridium+=Number(mission.flatReward.uridium)||0;r.xp+=Number(mission.flatReward.xp)||0;}
  return `${fmt(r.credits)} CR • ${fmt(r.uridium)} STL • ${fmt(r.xp)} XP`;
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
function activeMissionEntries(){
  if(!progress)return [];
  normalizeMissionState();
  return Object.entries(progress.missions.active).filter(([,active])=>!!active).map(([category,active])=>({category,active,mission:missionById(category,active.id)})).filter(x=>x.mission);
}
function activeMissionTaskSummary(mission,active){
  const pending=(mission.tasks||[]).find(t=>!taskDone(active,t))||(mission.tasks||[])[0];
  if(!pending)return 'Objetivo concluído';
  const current=taskCurrent(active,pending);
  return `${taskLabel(pending)} • ${fmt(current)} / ${fmt(pending.target)}`;
}
function renderActiveMissionHud(force=false){
  if(!ui.activeMissionPanel||!progress)return;
  const entries=activeMissionEntries();
  if(!entries.length){ui.activeMissionPanel.classList.add('hidden');state.missionHudPage=0;state.missionHudSignature='';return;}
  ui.activeMissionPanel.classList.remove('hidden');
  layoutHudPanels();
  state.missionHudPage=Math.max(0,Math.min(state.missionHudPage,entries.length-1));
  const entry=entries[state.missionHudPage],pct=missionProgressPercent(entry.mission,entry.active);
  const sig=entries.map(x=>`${x.category}:${x.active.id}:${missionProgressPercent(x.mission,x.active)}:${Object.entries(x.active.taskProgress||{}).map(([k,v])=>`${k}=${v}`).join(',')}`).join('|')+`|${state.missionHudPage}`;
  if(!force&&sig===state.missionHudSignature)return;
  state.missionHudSignature=sig;
  ui.activeMissionCategory.textContent=MISSION_CATEGORIES[entry.category]?.label?.replace('MISSÕES ','')||entry.category.toUpperCase();
  ui.activeMissionTitle.textContent=entry.mission.title;
  ui.activeMissionTask.textContent=activeMissionTaskSummary(entry.mission,entry.active);
  ui.activeMissionProgressBar.style.width=`${pct}%`;
  ui.activeMissionProgressText.textContent=`${pct}%`;
  ui.activeMissionRewardFactor.textContent=`RECOMPENSA ${missionFactor(entry.mission)}X`;
  ui.activeMissionDots.innerHTML='';
  entries.forEach((x,i)=>{const b=document.createElement('button');b.type='button';b.className=`active-mission-dot${i===state.missionHudPage?' active':''}`;b.title=MISSION_CATEGORIES[x.category]?.label||x.category;b.onclick=e=>{e.stopPropagation();state.missionHudPage=i;state.missionHudSignature='';renderActiveMissionHud(true);};ui.activeMissionDots.appendChild(b);});
}

function acceptMission(category,id){
  normalizeMissionState();
  if(progress.missions.active[category]){showToast('Você já tem uma missão ativa nessa categoria');return;}
  const mission=missionById(category,id);if(!mission)return;
  const key=missionInstanceKey(category,id);
  if(progress.missions.completed[key]){showToast('Essa missão já foi concluída neste ciclo');return;}
  progress.missions.active[category]={
    id,period:missionPeriodKey(category),complete:false,acceptedAt:Date.now(),
    taskProgress:{},bonus:{credits:0,uridium:0,xp:0},flatRewardApplied:false
  };
  saveGame();renderMissions();updateMissionButton();state.missionHudSignature='';renderActiveMissionHud(true);showToast(`${mission.title} aceita — progresso iniciado`);
}
function abandonMission(category){
  normalizeMissionState();const active=progress.missions.active[category];if(!active)return;
  const mission=missionById(category,active.id);progress.missions.active[category]=null;
  saveGame();renderMissions();updateMissionButton();state.missionHudSignature='';renderActiveMissionHud(true);showToast(`${mission?.title||'Missão'} abandonada`);
}
const MISSION_ITEM_REWARD_POOLS={
  commonGear:['lf1','mp1','lf2','sg3na02','sg3na03','fs01','fs02'],
  eliteGear:['lf3','sg3nb02'],
  jackpotGear:['lf4'],
  ammo:[
    {kind:'ammo',id:'mcb25',qty:10000,label:'10.000 PLS-2'},
    {kind:'ammo',id:'mcb50',qty:5000,label:'5.000 PLS-3'},
    {kind:'ammo',id:'ucb100',qty:2500,label:'2.500 PLS-4'},
    {kind:'ammo',id:'sab50',qty:3000,label:'3.000 SIP-2'},
    {kind:'rocket',id:'plt2021',qty:200,label:'200 CMT-3'},
    {kind:'rocket',id:'plt3030',qty:100,label:'100 CMT-4'},
  ]
};
function missionItemChance(category,mission=null){
  if(category==='daily'&&mission?.group==='ore')return 1;
  return ({daily:.55,weekly:.60,monthly:.78,special:.88})[category]??.45;
}
function grantMissionSurprise(category,mission=null){
  if(Math.random()>missionItemChance(category,mission))return null;
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
function missionRewardItemHint(category,mission=null){
  const chance=missionItemChance(category,mission);return chance>=1?'BÔNUS GARANTIDO: munição ou equipamento':`Chance bônus: ${Math.round(chance*100)}% de munição/equipamento`;
}
function finishMissionAutomatically(category,mission,active){
  if(!mission||!active)return;
  const flat=mission.flatReward||null;
  if(flat&&!active.flatRewardApplied){active.bonus.credits+=(Number(flat.credits)||0);active.bonus.uridium+=(Number(flat.uridium)||0);active.bonus.xp+=(Number(flat.xp)||0);active.flatRewardApplied=true;}
  const bonus=roundedMissionBonus(active);
  progress.profile.credits+=bonus.credits;progress.profile.uridium+=bonus.uridium;progress.profile.xp+=bonus.xp;
  const surprise=grantMissionSurprise(category,mission);
  if(surprise)bonus.itemText=`BÔNUS: ${surprise}`;
  progress.missions.completed[missionInstanceKey(category,mission.id)]=Date.now();
  progress.missions.active[category]=null;
  showMissionCompleteAnimation(mission,bonus);processPlayerLevelUps();
  showToast(`Recompensa automática • ${mission.title}${surprise?` • ${surprise}`:''}`,'mission');
  saveGame();updateMissionButton();state.missionHudSignature='';renderActiveMissionHud(true);updateUI();
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
      const factor=missionFactor(mission);
      card.innerHTML=`<div class="mission-card-top"><div><span class="mission-type-chip">${mission.tag||missionGroupLabel(mission.group)}</span><h4>${mission.title}</h4></div></div>
        <p>${mission.desc}</p>
        ${mission.sequence?'<div class="mission-sequence-badge">SEQUENCIAL • complete uma etapa para liberar a próxima</div>':''}
        ${missionTasksHtml(mission,active,isActive)}
        ${isActive?`<div class="mission-progress-row"><span>PROGRESSO TOTAL</span><b>${pct}%</b></div><div class="mission-progress"><i style="width:${pct}%"></i></div>`:''}
        <div class="mission-reward"><span>${isActive?`BÔNUS ACUMULADO • ${factor}X`:`RECOMPENSA ESTIMADA • ${factor}X`}</span><b>${missionRewardText(mission,isActive?active:null)}</b><small>${missionRewardItemHint(category,mission)}</small></div>`;
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
function openMissions(){closeNavigationModals(ui.missionModal);normalizeMissionState();renderMissions();ui.missionModal.classList.remove('hidden');}

// ===================== PROGRESSÃO V12 • FREE + PREMIUM =====================
const BATTLE_PASS_TIER_COUNT=30;
const BATTLE_PASS_POINTS_PER_TIER=500;
const BATTLE_PASS_DAILY_POINTS=100;
function progressionDateKey(now=new Date()){return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;}
function battlePassSeasonKey(now=new Date()){return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;}
function freshBattlePass(){return {season:battlePassSeasonKey(),points:0,claimedTiers:{},premiumClaimedTiers:{},daily:{key:progressionDateKey(),progress:{},completed:{}}};}
function freshLevelRewards(){return {claimed:{}};}
function normalizeLevelRewards(){if(!progress)return;progress.levelRewards ||= freshLevelRewards();progress.levelRewards.claimed ||= {};}
function normalizeBattlePass(){
  if(!progress)return;
  const season=battlePassSeasonKey(),day=progressionDateKey();
  if(!progress.battlePass||progress.battlePass.season!==season)progress.battlePass=freshBattlePass();
  progress.battlePass.points=Math.max(0,Math.min(BATTLE_PASS_TIER_COUNT*BATTLE_PASS_POINTS_PER_TIER,Math.floor(Number(progress.battlePass.points)||0)));
  progress.battlePass.claimedTiers ||= {};
  progress.battlePass.premiumClaimedTiers ||= {};
  progress.battlePass.daily ||= {key:day,progress:{},completed:{}};
  if(progress.battlePass.daily.key!==day)progress.battlePass.daily={key:day,progress:{},completed:{}};
  progress.battlePass.daily.progress ||= {};progress.battlePass.daily.completed ||= {};
}
function battlePassDailyMissions(){
  normalizeBattlePass();
  const level=Math.max(1,Number(progress?.profile?.level)||1),seed=hashStringSeed(`bp:${progressionDateKey()}`),rng=seededRng(seed);
  const nudge=()=>Math.floor(rng()*3);
  return [
    {id:'kills',kind:'kill',icon:'☠',title:'Caçada diária',desc:'Elimine aliens em qualquer mapa.',target:Math.min(100,10+level*2+nudge()*5),points:BATTLE_PASS_DAILY_POINTS},
    {id:'damage',kind:'damage',icon:'⚡',title:'Poder de fogo',desc:'Cause dano real em aliens, incluindo escudo e casco.',target:Math.round((120000+level*65000+nudge()*50000)/1000)*1000,points:BATTLE_PASS_DAILY_POINTS},
    {id:'attacks',kind:'attack',icon:'✦',title:'Pressão de combate',desc:'Acerte ataques em aliens. Laser, míssil e AUX-9 contam quando causam dano.',target:25+level*3+nudge()*10,points:BATTLE_PASS_DAILY_POINTS},
    {id:'boxes',kind:'box',icon:'▣',title:'Recuperação de carga',desc:'Colete boxes deixadas pelos aliens destruídos.',target:5+Math.ceil(level/4)+nudge()*2,points:BATTLE_PASS_DAILY_POINTS},
    {id:'dropResources',kind:'dropResource',icon:'◆',title:'Recursos de combate',desc:'Colete recursos das boxes dos aliens. Pedras soltas do mapa NÃO contam.',target:100+level*30+nudge()*50,points:BATTLE_PASS_DAILY_POINTS},
  ];
}
function battlePassTier(){normalizeBattlePass();return Math.min(BATTLE_PASS_TIER_COUNT,Math.floor(progress.battlePass.points/BATTLE_PASS_POINTS_PER_TIER));}
function battlePassTierProgress(){normalizeBattlePass();if(battlePassTier()>=BATTLE_PASS_TIER_COUNT)return 100;return Math.round((progress.battlePass.points%BATTLE_PASS_POINTS_PER_TIER)/BATTLE_PASS_POINTS_PER_TIER*100);}
function updatePassBadge(){if(!ui.passTierBadge)return;ui.passTierBadge.textContent=`${battlePassTier()}/${BATTLE_PASS_TIER_COUNT}`;}
function battlePassEvent(kind,amount=1){
  if(!progress||amount<=0)return;normalizeBattlePass();
  const daily=progress.battlePass.daily,missions=battlePassDailyMissions();let changed=false,completedNow=[];const tierBefore=battlePassTier();
  for(const mission of missions){
    if(mission.kind!==kind||daily.completed[mission.id])continue;
    const current=Math.max(0,Number(daily.progress[mission.id])||0),next=Math.min(mission.target,current+Math.max(0,Number(amount)||0));
    if(next===current)continue;daily.progress[mission.id]=next;changed=true;
    if(next>=mission.target){daily.completed[mission.id]=Date.now();progress.battlePass.points=Math.min(BATTLE_PASS_TIER_COUNT*BATTLE_PASS_POINTS_PER_TIER,progress.battlePass.points+mission.points);completedNow.push(mission);}
  }
  if(completedNow.length){
    for(const mission of completedNow){queueCelebration('mission','PASSE +100',`${mission.title} concluída • +${mission.points} pontos`);pushActivity(`PASSE • ${mission.title} • +${mission.points} pontos`,'reward');}
    const tierAfter=battlePassTier();if(tierAfter>tierBefore)queueCelebration('level',`PASSE • TIER ${tierAfter}`,`Free liberado${premiumPassActive()?' • Premium liberado':''}`);
    saveGame();updatePassBadge();if(ui.passModal&&!ui.passModal.classList.contains('hidden'))renderProgression();
  }else if(changed){cloudDirty=true;if(ui.passModal&&!ui.passModal.classList.contains('hidden'))renderProgression();}
}
function rewardBundle(){return {credits:0,uridium:0,ammo:{},rockets:{},items:[],ships:[],repairBonus:0};}
function addRewardQty(obj,id,qty){if(qty>0)obj[id]=(obj[id]||0)+Math.floor(qty);}
function levelRewardDef(level){
  const r=rewardBundle();r.credits=level*100000;r.uridium=level*75;addRewardQty(r.ammo,'lcb10',level*250);
  if(level===5)addRewardQty(r.ammo,'mcb25',5000);
  if(level===10){addRewardQty(r.ammo,'mcb50',2500);r.repairBonus+=1;}
  if(level===15)r.items.push('lf2');
  if(level===20){addRewardQty(r.ammo,'ucb100',2500);r.repairBonus+=1;}
  if(level===25)r.items.push('lf3');
  if(level===30){r.items.push('sg3nb02');addRewardQty(r.ammo,'mcb50',5000);r.repairBonus+=1;}
  if(level===35){addRewardQty(r.ammo,'ucb100',5000);r.repairBonus+=2;}
  if(level===40)r.items.push('lf4');
  if(level===44){r.credits+=10000000;r.uridium+=10000;addRewardQty(r.ammo,'ucb100',10000);r.items.push('lf4');r.repairBonus+=3;}
  return r;
}
function battlePassRewardDef(tier){
  const r=rewardBundle();r.credits=250000+tier*175000;r.uridium=150+tier*35;addRewardQty(r.ammo,'lcb10',1500+tier*150);
  if(tier%3===0)addRewardQty(r.ammo,'mcb25',1500+tier*50);
  if(tier%5===0)addRewardQty(r.ammo,'mcb50',750+tier*25);
  if(tier%10===0){addRewardQty(r.ammo,'ucb100',1000+tier*30);r.repairBonus+=1;}
  // Marcos FREE: somente equipamentos comuns.
  if(tier===5)r.items.push('lf1');
  if(tier===10)r.items.push('sg3na02');
  if(tier===15)r.items.push('g3n3210');
  if(tier===20)r.items.push('lf2');
  if(tier===25)r.items.push('sg3nb01');
  if(tier===30){r.items.push('g3n3310');r.credits+=5000000;r.uridium+=2500;}
  return r;
}
function doubleRewardNumbers(source){
  const r=rewardBundle();r.credits=(source.credits||0)*2;r.uridium=(source.uridium||0)*2;r.repairBonus=(source.repairBonus||0)*2;
  for(const [id,q] of Object.entries(source.ammo||{}))r.ammo[id]=q*2;
  for(const [id,q] of Object.entries(source.rockets||{}))r.rockets[id]=q*2;
  return r;
}
function premiumBattlePassRewardDef(tier){
  const r=doubleRewardNumbers(battlePassRewardDef(tier));
  // Marcos Premium: armas / escudos / motores Elite. Tier 30 estreia a nave de evento Reclaimer.
  if(tier===5)r.items.push('lf3');
  if(tier===10)r.items.push('sg3nb02');
  if(tier===15)r.items.push('g3n6900');
  if(tier===20)r.items.push('lf4');
  if(tier===25)r.items.push('g3n7900');
  if(tier===30){r.items.push('sg3nb03');r.ships.push('solace');addRewardQty(r.ammo,'ucb100',10000);r.repairBonus+=3;}
  return r;
}
function progressionRewardText(r){
  const parts=[];if(r.credits)parts.push(`${fmt(r.credits)} CR`);if(r.uridium)parts.push(`${fmt(r.uridium)} STL`);
  for(const [id,qty] of Object.entries(r.ammo||{}))if(qty)parts.push(`${fmt(qty)} ${shortLaserLabel(id)}`);
  for(const [id,qty] of Object.entries(r.rockets||{}))if(qty)parts.push(`${fmt(qty)} ${shortRocketLabel(id)}`);
  for(const id of r.items||[])parts.push(ITEMS[id]?.name||id.toUpperCase());
  for(const id of r.ships||[])parts.push(`NAVE ${SHIPS[id]?.name||id.toUpperCase()}`);
  if(r.repairBonus)parts.push(`${r.repairBonus} Bônus de Reparo`);return parts.join(' • ');
}
function grantProgressionBundle(r){
  progress.profile.credits+=(Number(r.credits)||0);progress.profile.uridium+=(Number(r.uridium)||0);
  progress.ammo ||= {};progress.rockets ||= {};
  for(const [id,qty] of Object.entries(r.ammo||{}))progress.ammo[id]=(progress.ammo[id]||0)+Math.floor(qty);
  for(const [id,qty] of Object.entries(r.rockets||{}))progress.rockets[id]=(progress.rockets[id]||0)+Math.floor(qty);
  for(const id of r.items||[])addInventory(id);
  for(const id of r.ships||[])if(SHIPS[id]&&!progress.ownedShips.includes(id))progress.ownedShips.push(id);
  normalizeGalaxyGateState();progress.galaxyGate.repairBonus+=(Number(r.repairBonus)||0);
}
function claimLevelReward(level){
  normalizeLevelRewards();level=Math.floor(Number(level)||0);if(level<2||level>PLAYER_MAX_LEVEL)return;
  if(progress.profile.level<level){showToast(`Requer nível ${level}`);return;}if(progress.levelRewards.claimed[level]){showToast('Recompensa já resgatada');return;}
  const reward=levelRewardDef(level);grantProgressionBundle(reward);progress.levelRewards.claimed[level]=Date.now();saveGame();flushCloudSave(true).catch(()=>{});showToast(`LV ${level} • recompensa resgatada`,'reward');pushActivity(`NÍVEL ${level} • ${progressionRewardText(reward)}`,'reward');renderProgression();updateUI();
}
function claimAllLevelRewards(){normalizeLevelRewards();let count=0;for(let level=2;level<=Math.min(PLAYER_MAX_LEVEL,progress.profile.level);level++){if(progress.levelRewards.claimed[level])continue;grantProgressionBundle(levelRewardDef(level));progress.levelRewards.claimed[level]=Date.now();count++;}if(!count){showToast('Nenhuma recompensa de nível pendente');return;}saveGame();flushCloudSave(true).catch(()=>{});showToast(`${count} recompensa(s) de nível resgatada(s)`,'reward');renderProgression();updateUI();}
function claimBattlePassTier(tier){
  normalizeBattlePass();tier=Math.floor(Number(tier)||0);if(tier<1||tier>BATTLE_PASS_TIER_COUNT)return;if(battlePassTier()<tier){showToast('Tier ainda bloqueado');return;}if(progress.battlePass.claimedTiers[tier]){showToast('Recompensa Free já resgatada');return;}
  const reward=battlePassRewardDef(tier);grantProgressionBundle(reward);progress.battlePass.claimedTiers[tier]=Date.now();saveGame();flushCloudSave(true).catch(()=>{});showToast(`PASSE FREE • Tier ${tier} resgatado`,'reward');pushActivity(`PASSE FREE T${tier} • ${progressionRewardText(reward)}`,'reward');renderProgression();updateUI();
}
function claimPremiumBattlePassTier(tier){
  normalizeBattlePass();tier=Math.floor(Number(tier)||0);if(!premiumPassActive()){showToast('Adquira o Passe Premium desta temporada');openPremiumShop();return;}if(tier<1||tier>BATTLE_PASS_TIER_COUNT||battlePassTier()<tier){showToast('Tier Premium ainda bloqueado');return;}if(progress.battlePass.premiumClaimedTiers[tier]){showToast('Recompensa Premium já resgatada');return;}
  const reward=premiumBattlePassRewardDef(tier);grantProgressionBundle(reward);progress.battlePass.premiumClaimedTiers[tier]=Date.now();saveGame();flushCloudSave(true).catch(()=>{});showToast(`PASSE PREMIUM • Tier ${tier} resgatado`,'reward');pushActivity(`PASSE PREMIUM T${tier} • ${progressionRewardText(reward)}`,'reward');renderProgression();updateUI();
}
function claimAllBattlePassRewards(){normalizeBattlePass();const unlocked=battlePassTier();let count=0;for(let tier=1;tier<=unlocked;tier++){if(progress.battlePass.claimedTiers[tier])continue;grantProgressionBundle(battlePassRewardDef(tier));progress.battlePass.claimedTiers[tier]=Date.now();count++;}if(!count){showToast('Nenhuma recompensa Free pendente');return;}saveGame();flushCloudSave(true).catch(()=>{});showToast(`${count} recompensa(s) Free resgatada(s)`,'reward');renderProgression();updateUI();}
function claimAllPremiumBattlePassRewards(){normalizeBattlePass();if(!premiumPassActive()){showToast('Passe Premium ainda não adquirido');openPremiumShop();return;}const unlocked=battlePassTier();let count=0;for(let tier=1;tier<=unlocked;tier++){if(progress.battlePass.premiumClaimedTiers[tier])continue;grantProgressionBundle(premiumBattlePassRewardDef(tier));progress.battlePass.premiumClaimedTiers[tier]=Date.now();count++;}if(!count){showToast('Nenhuma recompensa Premium pendente');return;}saveGame();flushCloudSave(true).catch(()=>{});showToast(`${count} recompensa(s) Premium resgatada(s)`,'reward');renderProgression();updateUI();}
function renderProgression(){
  if(!ui.passContent||!progress)return;normalizeBattlePass();normalizeLevelRewards();updatePassBadge();
  const unlocked=battlePassTier(),points=progress.battlePass.points,daily=progress.battlePass.daily,missions=battlePassDailyMissions(),paid=premiumPassActive();
  const dailyHtml=missions.map(m=>{const current=Math.min(m.target,Math.floor(Number(daily.progress[m.id])||0)),done=!!daily.completed[m.id],pct=Math.min(100,Math.round(current/m.target*100));return `<div class="pass-mission ${done?'done':''}"><span class="pass-mission-icon">${m.icon}</span><div class="pass-mission-main"><b>${m.title}</b><small>${m.desc}</small><div class="pass-mini-progress"><i style="width:${pct}%"></i></div><em>${fmt(current)} / ${fmt(m.target)}</em></div><strong>${done?'✓':`+${m.points}`}</strong></div>`;}).join('');
  const tiers=Array.from({length:BATTLE_PASS_TIER_COUNT},(_,i)=>i+1).map(tier=>{
    const freeClaimed=!!progress.battlePass.claimedTiers[tier],premiumClaimed=!!progress.battlePass.premiumClaimedTiers[tier],open=tier<=unlocked,free=battlePassRewardDef(tier),vip=premiumBattlePassRewardDef(tier);
    return `<article class="pass-tier pass-tier-v12 ${open?'unlocked':'locked'}"><div class="pass-tier-num">TIER <b>${tier}</b></div><div class="pass-track-columns"><div class="pass-track free"><span>FREE</span><div class="pass-tier-reward">${progressionRewardText(free)}</div><button class="small-btn ${open&&!freeClaimed?'gold':''}" data-pass-claim="${tier}" ${!open||freeClaimed?'disabled':''}>${freeClaimed?'RESGATADO':open?'RESGATAR':'BLOQUEADO'}</button></div><div class="pass-track premium ${paid?'active':'locked-premium'}"><span>PREMIUM • 2X</span><div class="pass-tier-reward">${progressionRewardText(vip)}</div><button class="small-btn premium-buy-btn" data-pass-premium-claim="${tier}" ${!open||premiumClaimed||!paid?'disabled':''}>${premiumClaimed?'RESGATADO':paid?(open?'RESGATAR':'BLOQUEADO'):'PASSE PAGO'}</button></div></div></article>`;
  }).join('');
  const levels=Array.from({length:PLAYER_MAX_LEVEL-1},(_,i)=>i+2).map(level=>{const reached=level<=progress.profile.level,claimed=!!progress.levelRewards.claimed[level],reward=levelRewardDef(level);return `<article class="level-reward ${reached?'reached':'locked'} ${claimed?'claimed':''}"><div class="level-reward-head"><span>LV</span><b>${level}</b></div><div>${progressionRewardText(reward)}</div><button class="small-btn ${reached&&!claimed?'gold':''}" data-level-claim="${level}" ${!reached||claimed?'disabled':''}>${claimed?'RESGATADO':reached?'RESGATAR':'BLOQUEADO'}</button></article>`;}).join('');
  const nextPoints=unlocked>=BATTLE_PASS_TIER_COUNT?0:BATTLE_PASS_POINTS_PER_TIER-(points%BATTLE_PASS_POINTS_PER_TIER);
  ui.passContent.innerHTML=`<section class="pass-hero"><div><div class="eyebrow">TEMPORADA ${progress.battlePass.season}</div><h3>TIER ${unlocked} / ${BATTLE_PASS_TIER_COUNT}</h3><p>5 missões diárias • 100 pontos cada • Free + trilha Premium com ganhos 2X e itens Elite.</p></div><div class="pass-points"><span>PONTOS</span><b>${fmt(points)}</b><small>${unlocked>=BATTLE_PASS_TIER_COUNT?'PASSE COMPLETO':`faltam ${fmt(nextPoints)} para o próximo tier`}</small></div></section><div class="pass-main-progress"><i style="width:${battlePassTierProgress()}%"></i></div>${paid?'<div class="pass-premium-active">✦ PASSE PREMIUM ATIVO NESTA TEMPORADA</div>':'<div class="pass-premium-cta">A trilha Premium entrega 2X os ganhos, equipamentos Elite nos marcos e <b>Reclaimer</b> no Tier 30. <button class="gold-btn" id="passOpenPremium">VER PASSE PREMIUM</button></div>'}<section class="pass-section"><div class="pass-section-head"><div><span>MISSÕES DIÁRIAS</span><b>${missions.filter(m=>daily.completed[m.id]).length}/5 concluídas hoje</b></div></div><div class="pass-missions">${dailyHtml}</div></section><section class="pass-section"><div class="pass-section-head"><div><span>RECOMPENSAS DO PASSE</span><b>FREE + PREMIUM • 30 tiers</b></div><div><button class="ghost-btn" id="passClaimAll">RESGATAR FREE</button> <button class="ghost-btn" id="passPremiumClaimAll" ${paid?'':'disabled'}>RESGATAR PREMIUM</button></div></div><div class="pass-tier-grid">${tiers}</div></section><section class="pass-section level-section"><div class="pass-section-head"><div><span>RECOMPENSAS DE NÍVEL</span><b>LV 2 → LV ${PLAYER_MAX_LEVEL}</b></div><button class="ghost-btn" id="levelClaimAll">RESGATAR DISPONÍVEIS</button></div><p class="muted">Recompensas antigas também ficam disponíveis uma única vez para pilotos que já estavam acima do nível 1.</p><div class="level-reward-grid">${levels}</div></section>`;
  ui.passContent.querySelectorAll('[data-pass-claim]').forEach(b=>b.onclick=()=>claimBattlePassTier(b.dataset.passClaim));
  ui.passContent.querySelectorAll('[data-pass-premium-claim]').forEach(b=>b.onclick=()=>claimPremiumBattlePassTier(b.dataset.passPremiumClaim));
  ui.passContent.querySelectorAll('[data-level-claim]').forEach(b=>b.onclick=()=>claimLevelReward(b.dataset.levelClaim));
  $('#passClaimAll')?.addEventListener('click',claimAllBattlePassRewards);$('#passPremiumClaimAll')?.addEventListener('click',claimAllPremiumBattlePassRewards);$('#levelClaimAll')?.addEventListener('click',claimAllLevelRewards);$('#passOpenPremium')?.addEventListener('click',openPremiumShop);
}
function openProgression(){if(!progress)return;closeNavigationModals(ui.passModal);normalizeBattlePass();normalizeLevelRewards();refreshPremiumState().finally(()=>{renderProgression();ui.passModal?.classList.remove('hidden');});}



const STARTER_SHIP_ID = 'phoenix';
const SHIP_REPAIR_URI_COST = 500;

const GALAXY_ALPHA_WAVE_INTERVAL_MS = 10000;
const GALAXY_ALPHA_ROUND_INTERVAL_MS = 10000;
const GALAXY_ALPHA_ROUNDS = [
  {round:1,name:'Scavenger',waves:[{type:'streuner',count:10},{type:'streuner',count:10},{type:'streuner',count:10},{type:'streuner',count:10}]},
  {round:2,name:'Vrax',waves:[{type:'lordakia',count:10},{type:'lordakia',count:10},{type:'lordakia',count:10},{type:'lordakia',count:10}]},
  {round:3,name:'Zyron',waves:[{type:'saimon',count:10},{type:'saimon',count:10},{type:'saimon',count:10},{type:'saimon',count:10}]},
  {round:4,name:'Kharon',waves:[{type:'mordon',count:10},{type:'mordon',count:10},{type:'mordon',count:10},{type:'mordon',count:10}]},
  {round:5,name:'BOSS Quartet',waves:[{type:'bossStreuner',count:10},{type:'bossLordakia',count:10},{type:'bossSaimon',count:10},{type:'bossMordon',count:10}]},
  {round:6,name:'Dreadnox',waves:[{type:'devolarium',count:5},{type:'devolarium',count:5},{type:'devolarium',count:5},{type:'devolarium',count:5}]},
  {round:7,name:'Dreadnox Prime',waves:[{type:'bossDevolarium',count:5},{type:'bossDevolarium',count:5}]},
  {round:8,name:'Colossar Finale',waves:[{type:'sibelon',count:10},{type:'sibelon',count:10},{type:'bossSibelon',count:10},{type:'bossSibelon',count:5}]},
];
const GALAXY_NEXUS_ROUNDS = [
  {round:1,name:'Vrax Assault',waves:[{type:'lordakia',count:12},{type:'lordakia',count:12},{type:'lordakia',count:12},{type:'bossLordakia',count:6}]},
  {round:2,name:'Zyron Swarm',waves:[{type:'saimon',count:12},{type:'saimon',count:12},{type:'saimon',count:12},{type:'bossSaimon',count:6}]},
  {round:3,name:'Kharon Breaker',waves:[{type:'mordon',count:12},{type:'mordon',count:12},{type:'bossMordon',count:6}]},
  {round:4,name:'Dreadnox Wall',waves:[{type:'devolarium',count:7},{type:'devolarium',count:7},{type:'bossDevolarium',count:4}]},
  {round:5,name:'Boss Convoy',waves:[{type:'bossStreuner',count:12},{type:'bossLordakia',count:10},{type:'bossSaimon',count:8},{type:'bossMordon',count:6}]},
  {round:6,name:'Colossar Siege',waves:[{type:'sibelon',count:8},{type:'sibelon',count:8},{type:'sibelon',count:8}]},
  {round:7,name:'Dreadnox Prime',waves:[{type:'bossDevolarium',count:4},{type:'bossDevolarium',count:4},{type:'bossDevolarium',count:4}]},
  {round:8,name:'Colossar Prime',waves:[{type:'bossSibelon',count:5},{type:'bossSibelon',count:5},{type:'bossSibelon',count:5}]},
  {round:9,name:'NEXUS Annihilation',waves:[{type:'bossMordon',count:6},{type:'bossDevolarium',count:5},{type:'bossSibelon',count:5}]},
];
const GALAXY_ECLIPSE_ROUNDS = [
  {round:1,name:'Scavenger Prime Legion',waves:[{type:'bossStreuner',count:15},{type:'bossStreuner',count:15},{type:'bossLordakia',count:8}]},
  {round:2,name:'Vrax Prime Legion',waves:[{type:'bossLordakia',count:12},{type:'bossLordakia',count:12},{type:'bossSaimon',count:6}]},
  {round:3,name:'Zyron Prime Legion',waves:[{type:'bossSaimon',count:10},{type:'bossSaimon',count:10},{type:'bossMordon',count:5}]},
  {round:4,name:'Kharon Prime Legion',waves:[{type:'bossMordon',count:8},{type:'bossMordon',count:8},{type:'bossMordon',count:8}]},
  {round:5,name:'Dreadnox Crucible',waves:[{type:'devolarium',count:10},{type:'devolarium',count:10},{type:'bossDevolarium',count:5}]},
  {round:6,name:'Dreadnox Prime Crucible',waves:[{type:'bossDevolarium',count:5},{type:'bossDevolarium',count:5},{type:'bossDevolarium',count:5}]},
  {round:7,name:'Colossar Crucible',waves:[{type:'sibelon',count:10},{type:'sibelon',count:10},{type:'bossSibelon',count:5}]},
  {round:8,name:'Colossar Prime Crucible',waves:[{type:'bossSibelon',count:6},{type:'bossSibelon',count:6},{type:'bossSibelon',count:6}]},
  {round:9,name:'ECLIPSE Cataclysm',waves:[{type:'bossSaimon',count:8},{type:'bossMordon',count:8},{type:'bossDevolarium',count:6},{type:'bossSibelon',count:4}]},
  {round:10,name:'OMEGA WAVE',waves:[{type:'bossMordon',count:10},{type:'bossDevolarium',count:8},{type:'bossSibelon',count:8}]},
];
const GALAXY_GATE_DEFS={
  alpha:{key:'alpha',label:'AURORA',mapId:'ggAlpha',pieces:34,spinCost:100,rounds:GALAXY_ALPHA_ROUNDS,enemyScale:1,rewardScale:1,totalRewardMult:3,logReward:10,unlock:null},
  beta:{key:'beta',label:'NEXUS',mapId:'ggBeta',pieces:48,spinCost:125,rounds:GALAXY_NEXUS_ROUNDS,enemyScale:1.30,rewardScale:1.30,totalRewardMult:4,logReward:22,unlock:'alpha'},
  gamma:{key:'gamma',label:'ECLIPSE',mapId:'ggGamma',pieces:64,spinCost:150,rounds:GALAXY_ECLIPSE_ROUNDS,enemyScale:1.65,rewardScale:1.65,totalRewardMult:5,logReward:40,unlock:'beta'},
};
function freshGateProtocol(){return {pieces:[],built:false,lives:3,completed:0,failed:0,run:null,lastCompletion:null};}
function freshGalaxyGateState(){return {jumpBonus:0,repairBonus:0,lastResults:[],selected:'alpha',alpha:freshGateProtocol(),beta:freshGateProtocol(),gamma:freshGateProtocol()};}
function gateKeyForMap(mapId=progress?.mapId){return Object.values(GALAXY_GATE_DEFS).find(d=>d.mapId===mapId)?.key||null;}
function normalizeGalaxyGateState(){
  if(!progress)return; progress.galaxyGate ||= freshGalaxyGateState(); const g=progress.galaxyGate;
  g.jumpBonus=Math.max(0,Number(g.jumpBonus)||0);g.repairBonus=Math.max(0,Number(g.repairBonus)||0);g.lastResults ||= [];g.selected='alpha';
  for(const [key,def] of Object.entries(GALAXY_GATE_DEFS)){
    g[key] ||= freshGateProtocol(); const a=g[key];
    a.pieces=Array.isArray(a.pieces)?[...new Set(a.pieces.map(Number).filter(n=>n>=1&&n<=def.pieces))]:[];
    a.built=!!a.built||a.pieces.length>=def.pieces;a.lives=Math.max(0,Math.min(3,Number(a.lives)||3));a.completed=Math.max(0,Number(a.completed)||0);a.failed=Math.max(0,Number(a.failed)||0);
    if(a.run){a.run.round=Math.max(1,Math.min(def.rounds.length,Number(a.run.round)||1));a.run.waveIndex=Math.max(0,Number(a.run.waveIndex)||0);a.run.remaining ||= {};a.run.killRewards ||= {credits:0,uridium:0,xp:0};a.run.nextWaveAt=Number(a.run.nextWaveAt)||0;a.run.nextRoundAt=Number(a.run.nextRoundAt)||0;a.run.active=a.run.active!==false;}
  }
}
function currentGateKey(){normalizeGalaxyGateState();return gateKeyForMap()||progress.galaxyGate.selected||'alpha';}
function galaxyGateDef(key=currentGateKey()){return GALAXY_GATE_DEFS[key]||GALAXY_GATE_DEFS.alpha;}
function gateUnlocked(key){return key==='alpha';}
function alphaGate(){normalizeGalaxyGateState();return progress.galaxyGate[currentGateKey()];}
function isGalaxyGateMap(){return !!gateKeyForMap();}
function alphaRoundDef(){const a=alphaGate(),def=galaxyGateDef();return def.rounds[a.run?.round-1]||def.rounds[0];}
function alphaWaveDef(){const a=alphaGate(),r=alphaRoundDef();return r.waves[Math.max(0,(a.run?.waveIndex||0)-1)]||r.waves[0];}
function alphaRemainingCount(){return state.enemies.filter(e=>e.hp>0&&e.gateEnemy).length;}
function alphaRunReward(){const a=alphaGate(),r=a.run?.killRewards||{};return {credits:Math.round(r.credits||0),uridium:Math.round(r.uridium||0),xp:Math.round(r.xp||0)};}

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
    profile: { callsign:getUser()?.callsign || getUser()?.email?.split('@')[0] || 'Pilot', faction:factionId, level:1, xp:0, xpModelV101:true, credits:20000, uridium:0, aliensKilled:0, ggCompleted:0 },
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
    territoryFaction: factionId,
    x: basePointForFaction(factionId).x, y: basePointForFaction(factionId).y,
    hp: SHIPS.phoenix.hp,
    shield: 1000,
    flags: { autoLaser: false, autoRocket: false, turboRocket: false },
    cargo: {},
    discoveries: {},
    missions: freshMissions(),
    battlePass: freshBattlePass(),
    levelRewards: freshLevelRewards(),
    pilotBio: freshPilotBio(),
    auction: freshAuctionState(),
    galaxyGate: freshGalaxyGateState(),
    repairRequired: null,
    pet: freshPet(),
    combatAbilities:{shipReadyAt:0},
    warfront:freshWarfrontProgress(),
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
  x: 410, y: 930, tx: 410, ty: 930, angle: 0,
  lastShot: -999, laserTargetId: null, laserUntil: 0,
  taskType: 'follow', taskId: null,
  roamX: null, roamY: null, nextRoamAt: 0, lastMode: 'off',
  lastKami: -999, kamiArmed: false, kamiActivationId: 0
};
const state = {
  currentMap: MAPS.x1, camera: { x: 620, y: MAPS.x1.world.h/2 }, target: null, pvpShotPending:false, pvpRocketPending:false, enemies: [], loot: [], ores: [], particles: [], fx: [], rocketFx: [], landmarks: [], enemyRespawns: [], oreRespawns: [], lastPortalAt: 0, radarRange: 1500, jumping: false,
  lastPlayerDamageAt:nowSec(), repairFxAt:0, shieldRepairFxAt:0,
  pointerNavActive:false, pointerNavId:null, missionHudPage:0, missionHudSignature:'',
  shopTab: 'ships', hangarTab: 'ships', toastTimer: null, ammoUiExpanded: true, playerUiExpanded: true, statsUiExpanded: true, minimapUiExpanded: true, topMetaExpanded: true,
  stars: Array.from({length:240},()=>({x:Math.random()*5200-2600,y:Math.random()*5200-2600,r:Math.random()*1.5+.3,a:Math.random()*.6+.2})),
};

function clone(v){return JSON.parse(JSON.stringify(v));}
function rand(a,b){return Math.random()*(b-a)+a;}
function nowSec(){return performance.now()/1000;}
function fmt(v){return Math.max(0,Math.round(v)).toLocaleString('pt-BR');}
function shortLaserLabel(id){return ({lcb10:'x1',mcb25:'x2',mcb50:'x3',ucb100:'x4',sab50:'SAB'})[id]||id.toUpperCase();}
function shortRocketLabel(id){return ({r310:'R310',plt2026:'PLT26',plt2021:'PLT21',plt3030:'PLT30'})[id]||id.replace(/[^a-z0-9]/gi,'').toUpperCase();}
function ammoTooltipText(a,qty,laserUse,petUse,bursts){const mode=a.shieldDrain?'CAPTURA ESCUDO x2':`dano x${a.mult}`;return `${a.name} • ${mode}\nEstoque: ${fmt(qty)}\nNave: -${laserUse}/rajada${petUse?` • AUX-9: -${petUse}`:''}\nRajadas restantes: ~${fmt(bursts)}`;}
function rocketTooltipText(r,qty){return `${r.name} • dano ${fmt(r.damage)}\nEstoque: ${fmt(qty)}\nConsumo: -1/disparo`; }
function applyAmmoUiState(){ if(!ui.weaponBar) return; ui.weaponBar.classList.toggle('collapsed', !state.ammoUiExpanded); if(ui.weaponBarToggle) ui.weaponBarToggle.textContent = state.ammoUiExpanded ? '▾' : '▸'; }
function loadAmmoUiState(){ try{ const raw=localStorage.getItem('stellar_ammo_ui_expanded'); if(raw!==null) state.ammoUiExpanded = raw==='1'; }catch{} applyAmmoUiState(); }
function toggleAmmoUi(){ state.ammoUiExpanded=!state.ammoUiExpanded; try{ localStorage.setItem('stellar_ammo_ui_expanded', state.ammoUiExpanded?'1':'0'); }catch{} applyAmmoUiState(); syncHudButton(); }

function applyPlayerUiState(){ if(!ui.playerPanel) return; ui.playerPanel.classList.toggle('collapsed', !state.playerUiExpanded); if(ui.playerToggle) ui.playerToggle.textContent=state.playerUiExpanded?'▾':'▸'; }
function loadPlayerUiState(){ try{const raw=localStorage.getItem('stellar_player_ui_expanded');if(raw!==null)state.playerUiExpanded=raw==='1';}catch{} applyPlayerUiState(); }
function togglePlayerUi(){ state.playerUiExpanded=!state.playerUiExpanded;try{localStorage.setItem('stellar_player_ui_expanded',state.playerUiExpanded?'1':'0');}catch{}applyPlayerUiState();syncHudButton();layoutHudPanels();}
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
  state.ammoUiExpanded = expanded; state.playerUiExpanded = expanded; state.statsUiExpanded = expanded; state.minimapUiExpanded = expanded; state.topMetaExpanded = expanded;
  try{
    localStorage.setItem('stellar_ammo_ui_expanded', expanded?'1':'0');
    localStorage.setItem('stellar_player_ui_expanded', expanded?'1':'0');
    localStorage.setItem('stellar_stats_ui_expanded', expanded?'1':'0');
    localStorage.setItem('stellar_minimap_ui_expanded', expanded?'1':'0');
    localStorage.setItem('stellar_top_meta_expanded', expanded?'1':'0');
  }catch{}
  applyAmmoUiState(); applyPlayerUiState(); applyStatsUiState(); applyMinimapUiState(); applyTopMetaUiState(); syncHudButton();
}
function toggleHudUi(){
  const anyExpanded = state.ammoUiExpanded || state.playerUiExpanded || state.statsUiExpanded || state.minimapUiExpanded || state.topMetaExpanded;
  setHudState(!anyExpanded ? true : false);
}
function syncHudButton(){
  if(!ui.hudToggle) return;
  const allCollapsed = !state.ammoUiExpanded && !state.playerUiExpanded && !state.statsUiExpanded && !state.minimapUiExpanded && !state.topMetaExpanded;
  ui.hudToggle.textContent = allCollapsed ? 'HUD +' : 'HUD';
  ui.hudToggle.classList.toggle('active-hud', !allCollapsed);
}

const HUD_VISIBILITY_KEY='stellar_hud_visibility_v2';
const HUD_VISIBILITY_DEFAULT={player:true,ship:true,pet:true,missions:true,activity:true,minimap:true,weapons:true,gate:true};
let hudVisibility={...HUD_VISIBILITY_DEFAULT};
function loadHudVisibility(){
  try{const raw=JSON.parse(localStorage.getItem(HUD_VISIBILITY_KEY)||'null');if(raw&&typeof raw==='object')hudVisibility={...HUD_VISIBILITY_DEFAULT,...raw};}catch{}
  applyHudVisibility();
}
function saveHudVisibility(){try{localStorage.setItem(HUD_VISIBILITY_KEY,JSON.stringify(hudVisibility));}catch{}}
function applyHudVisibility(){
  ui.playerPanel?.classList.toggle('hud-user-hidden',!hudVisibility.player);
  ui.leftStats?.classList.toggle('hud-user-hidden',!hudVisibility.ship);
  ui.petFloatPanel?.classList.toggle('hud-user-disabled',!hudVisibility.pet);
  ui.activeMissionPanel?.classList.toggle('hud-user-disabled',!hudVisibility.missions);
  ui.activityPanel?.classList.toggle('hud-user-disabled',!hudVisibility.activity);
  ui.minimapPanel?.classList.toggle('hud-user-hidden',!hudVisibility.minimap);
  ui.weaponBar?.classList.toggle('hud-user-hidden',!hudVisibility.weapons);
  ui.gateHud?.classList.toggle('hud-user-disabled',!hudVisibility.gate);
}
function setHudVisibility(key,value){if(!(key in HUD_VISIBILITY_DEFAULT))return;hudVisibility[key]=!!value;saveHudVisibility();applyHudVisibility();renderSettings();updatePetFloat();renderGateHud();layoutHudPanels();}
function applyQualityMode(mode,persist=true){
  if(!QUALITY_PROFILES[mode])mode='high';qualityMode=mode;
  if(persist){try{localStorage.setItem(QUALITY_STORAGE_KEY,mode);}catch{}}
  document.body.dataset.quality=mode;
  for(const path of [...ASSET_IMAGES.keys()])if(!qualityShouldPreload(path))ASSET_IMAGES.delete(path);
  preloadAssets();resize();renderSettings();
  showToast(`Qualidade ${QUALITY_PROFILES[mode].label} ativada`);
}
let settingsTab='game';
let rankingsCache=[];
let rankingsLoadedAt=0;
const PATENT_GUIDE=[
  {code:'pilot_basic',title:'Piloto Básico',short:'PB',color:'#94a8bb',rule:'Base para todos os pilotos.'},
  {code:'pilot',title:'Piloto',short:'P',color:'#a6bccc',rule:'Top 12,9% do ranking.'},
  {code:'pilot_chief',title:'Piloto Chefe',short:'PC',color:'#b7c9d6',rule:'Top 10%.'},
  {code:'sergeant_basic',title:'Sargento Básico',short:'SB',color:'#c0cdd8',rule:'Top 9%.'},
  {code:'sergeant',title:'Sargento',short:'SG',color:'#cad3dc',rule:'Top 8%.'},
  {code:'sergeant_chief',title:'Sargento Chefe',short:'SC',color:'#d6d9de',rule:'Top 7%.'},
  {code:'lieutenant_basic',title:'Tenente Básico',short:'TB',color:'#d3d8e7',rule:'Top 6%.'},
  {code:'lieutenant',title:'Tenente',short:'TEN',color:'#d9dfec',rule:'Top 5%.'},
  {code:'lieutenant_chief',title:'Tenente Chefe',short:'TC',color:'#e1e6f0',rule:'Top 4,5%.'},
  {code:'captain_basic',title:'Capitão Básico',short:'CB',color:'#d7dcc7',rule:'Top 4%.'},
  {code:'captain',title:'Capitão',short:'CAP',color:'#e1e5cf',rule:'Top 3,5%.'},
  {code:'captain_chief',title:'Capitão Chefe',short:'CC',color:'#ebeeda',rule:'Top 3%.'},
  {code:'major_basic',title:'Major Básico',short:'MB',color:'#dfd6ad',rule:'Top 2,5%.'},
  {code:'major',title:'Major',short:'MAJ',color:'#ebdfb7',rule:'Top 2%.'},
  {code:'major_chief',title:'Major Chefe',short:'MC',color:'#f3e7c3',rule:'Top 1,5%.'},
  {code:'colonel_basic',title:'Coronel Básico',short:'COB',color:'#e2caa4',rule:'Top 1%.'},
  {code:'colonel',title:'Coronel',short:'COL',color:'#edc899',rule:'Top 20 absolutos.'},
  {code:'colonel_chief',title:'Coronel Chefe',short:'CLC',color:'#f1b684',rule:'Top 5 absolutos.'},
  {code:'general_basic',title:'General Básico',short:'GB',color:'#f0c56a',rule:'Top 4 absolutos.'},
  {code:'general',title:'General',short:'GEN',color:'#ffd86d',rule:'#1 do ranking.'},
  {code:'negative_honor',title:'Honra Negativa',short:'HN',color:'#ff7492',rule:'Aplicada em caso de punição / honra negativa.'},
];
const PATENT_BY_CODE=Object.fromEntries(PATENT_GUIDE.map(item=>[item.code,item]));
const SPECIAL_RANK_META={admin:{code:'admin',title:'Administrador',short:'ADM',color:'#7de3ff'}};
function patentMeta(code){return SPECIAL_RANK_META[code]||PATENT_BY_CODE[code]||PATENT_BY_CODE.pilot_basic;}
function patentBadgeMarkup(code,title){const meta=patentMeta(code);const label=title||meta.title;return `<span class="rank-badge" style="--rank-color:${meta.color}"><span class="rank-badge-icon">${meta.short}</span><span class="rank-badge-text">${label}</span></span>`;}
function patentMiniMarkup(code){const meta=patentMeta(code);return `<span class="rank-mini" style="--rank-color:${meta.color}" title="${meta.title}">${meta.short}</span>`;}
const clanRuntime={state:null,clans:[],busy:false,lastAt:0,claimBusy:false,lastClaimAt:0};
const warfrontRuntime={state:null,clans:[],busy:false,lastAt:0,pendingBossDamage:0,lastDamageFlush:0,lastBossSync:0};
function myRankingRow(){const me=getUser()?.id;return rankingsCache.find(r=>r.id===me)||null;}
function updateRankChip(){if(!ui.rankChip)return;ui.rankChip.textContent=clanRuntime.state?.is_admin?'ADMINISTRADOR':(myRankingRow()?.rank_title||'Piloto Básico');}
function renderSettings(){
  if(!ui.configModal)return;
  addEventListener('pagehide',()=>{if(progress){saveGame();flushCloudSave(true);}clearOnlinePlayers();removePlayerPresenceOnline().catch(()=>{});});

document.body.dataset.quality=qualityMode;
  if(ui.qualityCurrentBadge)ui.qualityCurrentBadge.textContent=qualityProfile().label;
  ui.qualityButtons?.querySelectorAll('[data-quality]').forEach(b=>b.classList.toggle('active',b.dataset.quality===qualityMode));
  ui.hudSettingsGrid?.querySelectorAll('[data-hud-key]').forEach(input=>input.checked=hudVisibility[input.dataset.hudKey]!==false);
  if(ui.audioEnabledToggle)ui.audioEnabledToggle.checked=audioEnabled;
  ui.settingsTabs?.querySelectorAll('[data-settings-tab]').forEach(b=>b.classList.toggle('active',b.dataset.settingsTab===settingsTab));
  ui.settingsGamePanel?.classList.toggle('hidden',settingsTab!=='game');
  ui.settingsRankingPanel?.classList.toggle('hidden',settingsTab!=='ranking');
  ui.settingsAccountPanel?.classList.toggle('hidden',settingsTab!=='account');
  if(settingsTab==='account')renderAccountSettings();
}
function rankingRows(metric){
  const rows=[...rankingsCache];
  if(metric==='points')rows.sort((a,b)=>(Number(b.rank_points)-Number(a.rank_points))||(Number(b.xp)-Number(a.xp))||((a.rank_position||999999)-(b.rank_position||999999)));
  else if(metric==='arena')rows.sort((a,b)=>(Number(b.arena_wins)-Number(a.arena_wins))||(Number(b.arena_rating)-Number(a.arena_rating))||(Number(b.rank_points)-Number(a.rank_points)));
  else if(metric==='aliens')rows.sort((a,b)=>Number(b.aliens_killed)-Number(a.aliens_killed));
  else rows.sort((a,b)=>Number(b.gg_completed)-Number(a.gg_completed));
  return rows.slice(0,15);
}
function rankingMetricText(r,metric){
  if(metric==='points')return `${fmt(r.rank_points||0)} pts`;
  if(metric==='arena')return `${fmt(r.arena_wins||0)} vit • rating ${fmt(r.arena_rating||1000)}`;
  if(metric==='aliens')return `${fmt(r.aliens_killed||0)} aliens`;
  return `${fmt(r.gg_completed||0)} PORTAIS • ${fmt(r.missions_completed||0)} missões`;
}
function rankingSecondaryText(r,metric){
  if(metric==='arena')return `${r.rank_title||'Patente'} • ${fmt(r.arena_losses||0)} derrotas`;
  if(metric==='aliens')return `${r.rank_title||'Patente'} • LV ${fmt(r.level||1)} • ${fmt(r.xp||0)} XP`;
  if(metric==='gg')return `${r.rank_title||'Patente'} • ${fmt(r.aliens_killed||0)} aliens`;
  return `${r.rank_title||'Patente'} • LV ${fmt(r.level||1)} • ${fmt(r.missions_completed||0)} missões`;
}
function renderRankingBoard(el,metric){
  if(!el)return;const me=getUser()?.id;
  const rows=rankingRows(metric);if(!rows.length){el.innerHTML='<div class="muted ranking-empty">Nenhum piloto ranqueado ainda.</div>';return;}
  el.innerHTML=rows.map((r,i)=>{const pos=metric==='points'?(r.rank_position||i+1):(i+1);return `<div class="ranking-row${r.id===me?' me':''}"><span class="ranking-pos">#${pos}</span><div class="ranking-main"><b>${r.callsign||'Pilot'}</b><small>${rankingSecondaryText(r,metric==='gg'?'gg':metric)}</small></div>${patentMiniMarkup(r.rank_code||'pilot_basic')}<em>${rankingMetricText(r,metric)}</em></div>`;}).join('');
}
function renderPatentGuide(){
  if(!ui.rankingPatentGuide)return;
  ui.rankingPatentGuide.innerHTML=PATENT_GUIDE.map(item=>`<div class="rank-guide-item">${patentMiniMarkup(item.code)}<div><b>${item.title}</b><small>${item.rule}</small></div></div>`).join('');
}
function renderMyPatent(){
  if(!ui.rankingMyPatent)return;
  if(clanRuntime.state?.is_admin){
    ui.rankingMyPatent.innerHTML=`<div class="ranking-my-head">${patentBadgeMarkup('admin','Administrador')}<div class="ranking-my-name"><b>${progress?.profile?.callsign||getUser()?.callsign||'Administrador'}</b><small>Conta administrativa • não participa de nenhum ranking.</small></div></div><div class="ranking-my-foot">Administradores são removidos de todas as tabelas, posições e cálculos de patente do ranking público.</div>`;
    updateRankChip();return;
  }
  const row=myRankingRow();
  if(!row){
    ui.rankingMyPatent.innerHTML=`<div class="ranking-my-head">${patentBadgeMarkup('pilot_basic','Piloto Básico')}<div class="ranking-my-name"><b>${progress?.profile?.callsign||getUser()?.callsign||'Pilot'}</b><small>Abra o ranking para sincronizar seus pontos online.</small></div></div><div class="rank-summary"><div><span>PONTOS</span><b>0</b></div><div><span>POSIÇÃO</span><b>—</b></div><div><span>NÍVEL</span><b>${fmt(progress?.profile?.level||1)}</b></div></div><div class="ranking-my-foot">A patente é atribuída de acordo com a posição do piloto no ranking de pontos.</div>`;
    updateRankChip();return;
  }
  ui.rankingMyPatent.innerHTML=`<div class="ranking-my-head">${patentBadgeMarkup(row.rank_code||'pilot_basic',row.rank_title||'Piloto Básico')}<div class="ranking-my-name"><b>${row.callsign||'Pilot'}</b><small>#${fmt(row.rank_position||0)} de ${fmt(row.total_players||0)} pilotos ranqueados</small></div></div><div class="rank-summary"><div><span>PONTOS</span><b>${fmt(row.rank_points||0)}</b></div><div><span>POSIÇÃO</span><b>#${fmt(row.rank_position||0)}</b></div><div><span>NÍVEL</span><b>${fmt(row.level||1)}</b></div><div><span>ARENA</span><b>${fmt(row.arena_wins||0)}W/${fmt(row.arena_losses||0)}L</b></div><div><span>ALIENS</span><b>${fmt(row.aliens_killed||0)}</b></div><div><span>PORTAIS</span><b>${fmt(row.gg_completed||0)}</b></div></div><div class="ranking-my-foot">A régua superior segue o padrão clássico: quanto maior sua pontuação, maior a sua patente.</div>`;
  updateRankChip();
}
function renderRankings(){
  renderPatentGuide();
  renderMyPatent();
  renderRankingBoard(ui.rankingPoints,'points');
  renderRankingBoard(ui.rankingArena,'arena');
  renderRankingBoard(ui.rankingAliens,'aliens');
  renderRankingBoard(ui.rankingGg,'gg');
  if(settingsTab==='account')renderAccountSettings();
  updateRankChip();
  if(ui.rankingUpdated)ui.rankingUpdated.textContent=rankingsLoadedAt?`Atualizado ${new Date(rankingsLoadedAt).toLocaleTimeString('pt-BR')}`:'Ranking ainda não carregado.';
}
async function refreshRankings(force=false){
  if(!force&&rankingsCache.length&&Date.now()-rankingsLoadedAt<30000){renderRankings();return;}
  if(ui.rankingUpdated)ui.rankingUpdated.textContent='Carregando ranking online...';
  try{rankingsCache=(await loadRankings()).filter(r=>!r.is_admin&&r.rank_code!=='admin');rankingsLoadedAt=Date.now();renderRankings();}
  catch(err){if(ui.rankingUpdated)ui.rankingUpdated.textContent=`Falha ao carregar ranking: ${err.message}`;}
}
function renderAccountSettings(){
  const user=getUser();const row=myRankingRow(),isAdmin=!!clanRuntime.state?.is_admin;if(ui.accountEmail)ui.accountEmail.value=user?.email||'';if(ui.accountCallsign)ui.accountCallsign.value=progress?.profile?.callsign||user?.callsign||'';
  const patent=isAdmin?'Administrador':(row?.rank_title||'Piloto Básico'),points=isAdmin?'—':fmt(row?.rank_points||0),position=isAdmin?'FORA DO RANKING':(row?`#${fmt(row.rank_position||0)}`:'—');
  if(ui.accountSummary)ui.accountSummary.innerHTML=`<div><span>STATUS</span><b>${patent}</b></div><div><span>PONTOS</span><b>${points}</b></div><div><span>POSIÇÃO</span><b>${position}</b></div><div><span>NÍVEL</span><b>${fmt(progress?.profile?.level||1)}</b></div><div><span>ALIENS</span><b>${fmt(progress?.profile?.aliensKilled||0)}</b></div><div><span>PORTAIS</span><b>${fmt(progress?.galaxyGate?.alpha?.completed||0)}</b></div>`;
  updateRankChip();
}
async function saveAccountName(){
  const value=String(ui.accountCallsign?.value||'').trim();if(ui.accountNameStatus)ui.accountNameStatus.textContent='Salvando...';
  try{const user=await updateCallsign(value);progress.profile.callsign=user.callsign;ui.userLabel.textContent=user.callsign;saveGame();await flushCloudSave(true);if(ui.accountNameStatus)ui.accountNameStatus.textContent='Nome atualizado online.';showToast('Nome de piloto atualizado');refreshRankings(true).catch(()=>{});}
  catch(err){if(ui.accountNameStatus)ui.accountNameStatus.textContent=err.message;}
}
async function saveAccountPassword(){
  const a=ui.accountNewPassword?.value||'',b=ui.accountConfirmPassword?.value||'';if(a!==b){ui.accountPasswordStatus.textContent='As senhas não conferem.';return;}if(ui.accountPasswordStatus)ui.accountPasswordStatus.textContent='Atualizando...';
  try{await updatePassword(a);ui.accountNewPassword.value='';ui.accountConfirmPassword.value='';ui.accountPasswordStatus.textContent='Senha alterada com sucesso.';showToast('Senha atualizada');}
  catch(err){ui.accountPasswordStatus.textContent=err.message;}
}
function switchSettingsTab(tab){settingsTab=['game','ranking','account'].includes(tab)?tab:'game';renderSettings();if(settingsTab==='ranking')refreshRankings();if(settingsTab==='account'&&!rankingsCache.length)refreshRankings();}
function openSettings(){closeNavigationModals(ui.configModal);renderSettings();if(!rankingsCache.length)refreshRankings().catch(()=>{});ui.configModal?.classList.remove('hidden');}

// ===================== CLÃS / ALIANÇAS V11.2 =====================
function escHtml(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function clanState(){return clanRuntime.state||{clan:null,members:[],transactions:[],pending_credits:0,is_admin:false,role:null};}
function currentClanTag(){return clanState().clan?.tag||'';}
function updateClanBadge(){if(ui.clanTopTag)ui.clanTopTag.textContent=currentClanTag()?`[${currentClanTag()}]`:'—';updateRankChip();}
async function refreshClanState(force=false){
  if(!authenticated||clanRuntime.busy)return clanRuntime.state;
  if(!force&&clanRuntime.state&&Date.now()-clanRuntime.lastAt<15000){renderClan();return clanRuntime.state;}
  clanRuntime.busy=true;
  try{
    clanRuntime.state=await loadMyClanOnline();
    clanRuntime.clans=clanRuntime.state?.clan?[]:await listClansOnline();
    clanRuntime.lastAt=Date.now();updateClanBadge();renderClan();
    return clanRuntime.state;
  }catch(e){console.warn('clan state',e);if(ui.clanContent&&!ui.clanModal?.classList.contains('hidden'))ui.clanContent.innerHTML=`<div class="muted">Falha ao carregar clã: ${escHtml(e.message)}</div>`;}
  finally{clanRuntime.busy=false;}
}
async function syncClanCreditGrants(force=false){
  if(!authenticated||!progress||clanRuntime.claimBusy)return;
  if(!force&&Date.now()-clanRuntime.lastClaimAt<12000)return;
  clanRuntime.claimBusy=true;clanRuntime.lastClaimAt=Date.now();
  try{
    const result=await claimClanCreditGrantsOnline();
    const credited=Number(result?.credited||0);
    if(credited>0){
      progress.profile.credits=Number(result.new_credits??progress.profile.credits);saveGame();
      showToast(`CLÃ • +${fmt(credited)} CR recebidos`);pushActivity(`CLÃ • Crédito recebido do cofre • +${fmt(credited)} CR`,'reward');
      await refreshClanState(true);
    }
  }catch(e){console.warn('clan credit grants',e);}
  finally{clanRuntime.claimBusy=false;}
}
function clanMissionLabel(key){const map={streuner:'Scavenger',lordakia:'Vrax',saimon:'Zyron',mordon:'Kharon',devolarium:'Dreadnox',sibelon:'Colossar',boss_mordon:'Kharon Prime',boss_devolarium:'Dreadnox Prime',boss_sibelon:'Colossar Prime',boss_any:'BOSS variados'};return map[key]||key;}
function clanRequirementHtml(status){
  if(!status||Number(status.level)>=10)return '<div class="clan-max-level">NÍVEL 10 • CLÃ NO NÍVEL MÁXIMO</div>';
  const req=status.requirements||{},mission=status.mission_progress||{};
  const missions=Object.entries(mission).map(([k,v])=>`<div class="clan-requirement ${v.done?'done':''}"><span>${clanMissionLabel(k)}</span><b>${fmt(v.current||0)} / ${fmt(v.target||0)}</b></div>`).join('');
  return `<div class="clan-next-level"><div class="clan-level-arrow"><b>LV ${status.level}</b><span>→</span><b>LV ${req.next_level}</b></div><div class="clan-req-grid"><div class="clan-requirement ${Number(status.member_xp)>=Number(req.xp)?'done':''}"><span>XP SOMADO DOS MEMBROS</span><b>${fmt(status.member_xp||0)} / ${fmt(req.xp||0)}</b></div><div class="clan-requirement ${Number(status.members)>=Number(req.members)?'done':''}"><span>MEMBROS</span><b>${fmt(status.members||0)} / ${fmt(req.members||0)}</b></div><div class="clan-requirement"><span>CUSTO NO COFRE</span><b>${fmt(req.credits||0)} CR</b></div>${missions}</div><small>O UP é automático quando XP + membros + missão interna + saldo do cofre estiverem completos.</small></div>`;
}
function renderClan(){
  if(!ui.clanContent)return;
  const st=clanState(),pending=Number(st.pending_credits||0);
  if(!st.clan){
    const list=(clanRuntime.clans||[]).map(c=>`<div class="clan-public-row"><div><b>[${escHtml(c.tag)}] ${escHtml(c.name)}</b><small>LV ${fmt(c.level||1)} • ${fmt(c.member_count||0)} membro(s)</small></div><span class="clan-role">ABERTO</span><button class="ghost-btn" data-clan-join="${escHtml(c.id)}">ENTRAR</button></div>`).join('')||'<div class="muted">Nenhuma aliança criada ainda.</div>';
    ui.clanContent.innerHTML=`${pending>0?`<div class="clan-panel clan-pending"><b>CRÉDITOS PENDENTES</b><div class="clan-tax-preview">Você tem <b>${fmt(pending)} CR</b> aguardando entrega automática.</div></div>`:''}<div class="clan-panel clan-create-box"><div class="clan-empty-title"><div class="eyebrow">FUNDE UMA ALIANÇA</div><h3>Crie seu clã ou entre em um existente</h3><p class="muted">O cofre cresce automaticamente pela coleta diária de 10% dos Créditos dos membros.</p></div><div class="clan-create-grid"><label>NOME DO CLÃ<input id="clanCreateName" maxlength="28" placeholder="Ex.: Guardiões Orbitais"></label><label>TAG<input id="clanCreateTag" maxlength="6" placeholder="GO"></label><button class="primary-btn" id="clanCreateSubmit">CRIAR</button></div></div><div class="clan-panel"><h3>ALIANÇAS DISPONÍVEIS</h3>${list}</div>`;
    return;
  }
  const c=st.clan,members=Array.isArray(st.members)?st.members:[],txs=Array.isArray(st.transactions)?st.transactions:[],owner=st.role==='owner',status=st.level_status||{};
  const memberHtml=members.map(m=>`<div class="clan-member"><div><b>${escHtml(m.callsign||'Pilot')}</b><small>LV ${fmt(m.level||1)} • XP ${fmt(m.xp||0)} • CR ${fmt(m.credits||0)}</small></div><span class="clan-role">${m.role==='owner'?'LÍDER':'MEMBRO'}</span></div>`).join('');
  const txHtml=txs.map(t=>{
    const kind=t.kind||'';let icon='•',title='',sub='',cls='clan-vault-number';
    if(kind==='daily_collection'){icon='⬆';title=`Coleta diária de ${escHtml(t.actor_callsign||'Piloto')} • ${fmt(t.net_amount||0)} CR`;sub='10% do saldo do membro no reset diário';cls='clan-net';}
    else if(kind==='interest'){icon='↗';title=`Rendimento do cofre • +${fmt(t.net_amount||0)} CR`;sub='Processado às 23:00';cls='clan-net';}
    else if(kind==='transfer'){icon='➜';title=`${escHtml(t.actor_callsign||'Líder')} enviou ${fmt(t.net_amount||0)} CR para ${escHtml(t.target_callsign||'Piloto')}`;sub=`Cofre -${fmt(t.gross_amount||0)} • juros 5%: ${fmt(t.burn_amount||0)} CR`;cls='clan-burn';}
    else if(kind==='level_up'){icon='★';title=`Clã evoluiu • custo ${fmt(t.gross_amount||0)} CR`;sub='Requisitos completos automaticamente';cls='clan-net';}
    else{icon='•';title=`Movimentação ${fmt(t.net_amount||0)} CR`;sub=kind;}
    return `<div class="clan-tx"><span>${icon}</span><div><b>${title}</b><small>${new Date(t.created_at).toLocaleString('pt-BR')} • ${sub}</small></div><span class="${cls}">${kind==='interest'||kind==='daily_collection'?`+${fmt(t.net_amount||0)}`:kind==='transfer'?`-${fmt(t.gross_amount||0)}`:''}</span></div>`;
  }).join('')||'<div class="muted">Ainda não há movimentações.</div>';
  const rate=Number(status.interest_rate||5).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});
  ui.clanContent.innerHTML=`
    ${pending>0?`<div class="clan-panel clan-pending"><b>CRÉDITOS RECEBIDOS</b><div class="clan-tax-preview"><b>${fmt(pending)} CR</b> serão adicionados automaticamente à sua conta.</div></div>`:''}
    <div class="clan-head-grid"><div class="clan-identity"><span class="clan-tag-big">[${escHtml(c.tag)}]</span><h3>${escHtml(c.name)}</h3><small>${owner?'Você é o líder':'Você é membro'} • Nível ${fmt(c.level||1)}/10</small></div><div class="clan-stat"><span>COFRE</span><b class="clan-vault-number">${fmt(c.vault_credits||0)} CR</b></div><div class="clan-stat"><span>RENDE ÀS 23H</span><b>${rate}% / DIA</b></div><div class="clan-stat"><span>COLETADO 10%</span><b>${fmt(c.total_collected||0)}</b></div><div class="clan-stat"><span>JUROS DE REPASSE</span><b class="clan-burn">${fmt(c.total_transfer_fees||0)}</b></div></div>
    <div class="clan-panel clan-economy-rule"><b>ECONOMIA AUTOMÁTICA:</b> 23:00 = rendimento do cofre • 00:00 = coleta de 10% dos Créditos atuais de cada membro • sem doações manuais.</div>
    <section class="clan-panel"><h3>EVOLUÇÃO DO CLÃ</h3>${clanRequirementHtml(status)}</section>
    <div class="clan-grid">${owner?`<section class="clan-panel"><h3>REPASSE DO LÍDER • JUROS 5%</h3><div class="clan-action-row"><label>CALLSIGN DO PILOTO<input id="clanTransferCallsign" maxlength="24" placeholder="Nome exato do jogador"></label><label>VALOR QUE SAI DO COFRE<input id="clanTransferAmount" type="number" min="1" step="1" placeholder="100000000"></label><button class="primary-btn" id="clanTransferBtn">ENVIAR</button></div><div class="clan-tax-preview" id="clanTransferPreview">Ex.: 100.000.000 CR saem do cofre → jogador recebe <b>95.000.000 CR</b> • <b>5.000.000 CR</b> viram juros.</div></section>`:'<section class="clan-panel"><h3>COFRE DA ALIANÇA</h3><p class="muted">Somente o líder pode encaminhar Créditos do cofre. Cada repasse consome 5% do valor como juros.</p></section>'}<section class="clan-panel"><h3>MEMBROS • ${members.length}</h3>${memberHtml}</section></div>
    <section class="clan-panel"><h3>MOVIMENTAÇÕES RECENTES</h3>${txHtml}</section>
    <div class="clan-panel"><button class="ghost-btn" id="clanLeaveBtn">${owner&&members.length===1?'ENCERRAR CLÃ':'SAIR DO CLÃ'}</button></div>`;
}
async function openClan(){closeNavigationModals(ui.clanModal);ui.clanModal?.classList.remove('hidden');if(ui.clanContent)ui.clanContent.innerHTML='<div class="muted">Sincronizando aliança...</div>';await syncClanCreditGrants(true);await refreshClanState(true);}
async function createClanNow(){const name=$('#clanCreateName')?.value||'',tag=$('#clanCreateTag')?.value||'';try{await createClanOnline({name,tag});showToast(`Clã [${tag.toUpperCase()}] criado`);await refreshClanState(true);syncOnlineWorld();}catch(e){showToast(e.message);}}
async function joinClanNow(id){try{await joinClanOnline(id);showToast('Você entrou na aliança');await refreshClanState(true);syncOnlineWorld();}catch(e){showToast(e.message);}}
async function leaveClanNow(){try{await leaveClanOnline();showToast('Aliança atualizada');await refreshClanState(true);syncOnlineWorld();}catch(e){showToast(e.message);}}
async function transferClanNow(){const callsign=$('#clanTransferCallsign')?.value||'',amount=Math.trunc(Number($('#clanTransferAmount')?.value)||0);if(!callsign||amount<=0){showToast('Informe callsign e valor');return;}try{const r=await transferClanCreditsOnline({callsign,amount});showToast(`${fmt(r.net_amount||0)} CR recebidos por ${r.target_callsign} • juros ${fmt(r.fee||0)} CR`);pushActivity(`CLÃ • Cofre -${fmt(r.gross_amount||0)} • ${r.target_callsign} +${fmt(r.net_amount||0)} • juros ${fmt(r.fee||0)}`,'reward');await refreshClanState(true);}catch(e){showToast(e.message);}}

// ===================== V13.1 WARFRONT =====================
function worldBossState(){return warfrontRuntime.state?.world_boss||null;}
function currentClanWar(){return warfrontRuntime.state?.war||null;}
function updateWarfrontBadge(){if(!ui.warfrontTopStatus)return;const wb=worldBossState(),war=currentClanWar();if(war)ui.warfrontTopStatus.textContent='WAR';else if(wb&&Number(wb.hp)>0)ui.warfrontTopStatus.textContent='BOSS';else if(wb&&Number(wb.hp)<=0)ui.warfrontTopStatus.textContent='LOOT';else ui.warfrontTopStatus.textContent='READY';}
function warfrontBossRatio(){const wb=worldBossState();return wb?Math.max(0,Math.min(1,Number(wb.hp||0)/Math.max(1,Number(wb.max_hp)||1))):0;}
function warfrontClanName(id){const all=[...(warfrontRuntime.clans||[])];const c=all.find(x=>x.id===id);return c?`[${c.tag}] ${c.name}`:'Clã rival';}
function blueprintCardHtml(bp){normalizeWarfrontProgress();const have=Number(progress.warfront.blueprints[bp.id]||0),cores=progress.warfront.skillCores,ready=have>=bp.need&&cores>=bp.cores;return `<div class="blueprint-card ${ready?'ready':''}"><div class="blueprint-icon">${bp.icon}</div><div><b>${bp.name}</b><small>${bp.desc}</small><div class="blueprint-progress"><i style="width:${Math.min(100,have/bp.need*100)}%"></i></div><span>FRAGMENTOS ${fmt(have)}/${fmt(bp.need)} • CORES ${fmt(cores)}/${fmt(bp.cores)}</span></div><button class="small-btn" data-blueprint-craft="${bp.id}" ${ready?'':'disabled'}>CONSTRUIR</button></div>`;}
function abilityMasteryHtml(){normalizeWarfrontProgress();const cls=abilityClassId(),def=SHIP_ABILITIES[cls],lv=abilityMasteryLevel(),cost=lv>=5?0:[2,4,7,11][lv-1];return `<div class="mastery-card"><div class="mastery-title"><span>${def.icon}</span><div><b>${def.name} • MASTERY ${lv}/5</b><small>+${Math.round((abilityPowerMultiplier()-1)*100)}% potência • -${Math.round((1-abilityCooldownMultiplier())*100)}% recarga</small></div></div><div class="mastery-pips">${[1,2,3,4,5].map(n=>`<i class="${n<=lv?'on':''}"></i>`).join('')}</div>${lv<5?`<button class="primary-btn" data-mastery-upgrade>EVOLUIR • ${cost} CORE${cost>1?'S':''}</button>`:'<div class="mastery-max">MASTERY MÁXIMA</div>'}</div>`;}
function renderWarfront(){if(!ui.warfrontContent)return;normalizeWarfrontProgress();const st=warfrontRuntime.state,wb=worldBossState(),war=currentClanWar(),myClan=clanState().clan,myRole=clanState().role;const bp=Object.values(WARFRONT_BLUEPRINTS).map(blueprintCardHtml).join('');let bossHtml='<div class="muted">World Boss indisponível no momento.</div>';if(wb){const hp=Math.max(0,Number(wb.hp)||0),max=Math.max(1,Number(wb.max_hp)||1),dead=hp<=0,claimed=!!wb.claimed;bossHtml=`<div class="world-boss-card ${dead?'dead':''}"><div class="world-boss-head"><div><span class="threat-chip">AMEAÇA GLOBAL</span><h3>${escHtml(wb.name||'NEMESIS PRIME')}</h3><small>${dead?'DERROTADO • recompensa disponível':`Encerra ${new Date(wb.ends_at).toLocaleString('pt-BR')}`}</small></div><b>${dead?'ELIMINADO':`${(hp/max*100).toFixed(2)}%`}</b></div><div class="world-boss-track"><i style="width:${Math.round(hp/max*100)}%"></i></div><div class="world-boss-stats"><span>HP <b>${fmt(hp)} / ${fmt(max)}</b></span><span>SEU DANO <b>${fmt(wb.my_damage||0)}</b></span><span>RANK <b>#${fmt(wb.my_rank||0)||'—'}</b></span></div><div class="warfront-actions">${dead?`<button class="primary-btn" data-worldboss-claim ${claimed?'disabled':''}>${claimed?'RECOMPENSA RESGATADA':'RESGATAR RECOMPENSA'}</button>`:`<button class="danger-btn" data-worldboss-engage>ENGAJAR EM MAPA BATTLE</button>`}</div></div>`;}
let warHtml='';if(!myClan)warHtml='<div class="war-empty">Entre em um clã para participar das Guerras de Clãs.</div>';else if(war){const mine=war.my_side==='attacker'?Number(war.attacker_score||0):Number(war.defender_score||0),theirs=war.my_side==='attacker'?Number(war.defender_score||0):Number(war.attacker_score||0),opp=war.my_side==='attacker'?war.defender:war.attacker;warHtml=`<div class="clan-war-live"><div class="war-vs"><div><small>SEU CLÃ</small><b>[${escHtml(myClan.tag)}]</b><strong>${fmt(mine)}</strong></div><span>VS</span><div><small>RIVAL</small><b>[${escHtml(opp?.tag||'?')}]</b><strong>${fmt(theirs)}</strong></div></div><div class="war-score-track"><i style="width:${Math.min(100,(mine/Math.max(1,mine+theirs))*100)}%"></i></div><small>Termina ${new Date(war.ends_at).toLocaleString('pt-BR')} • BOSS +10 pts • PvP causa pontos por dano • World Boss também pontua.</small></div>`;}else if(myRole==='owner'){const opts=(warfrontRuntime.clans||[]).filter(c=>c.id!==myClan.id).map(c=>`<option value="${c.id}">[${escHtml(c.tag)}] ${escHtml(c.name)} • LV ${fmt(c.level||1)}</option>`).join('');warHtml=`<div class="war-declare"><b>DECLARAR GUERRA</b><small>Uma guerra dura 12 horas. Escolha um clã rival.</small><div class="clan-action-row"><select id="warTargetClan"><option value="">Escolha o rival...</option>${opts}</select><button class="danger-btn" data-war-declare>DECLARAR</button></div></div>`;}else warHtml='<div class="war-empty">Somente o líder pode declarar uma guerra.</div>';
ui.warfrontContent.innerHTML=`<div class="warfront-grid"><section class="warfront-panel worldboss-panel"><div class="section-kicker">WORLD BOSS</div>${bossHtml}</section><section class="warfront-panel"><div class="section-kicker">GUERRA DE CLÃS</div>${warHtml}</section></div><section class="warfront-panel"><div class="section-kicker">MASTERY DA HABILIDADE</div>${abilityMasteryHtml()}</section><section class="warfront-panel"><div class="section-kicker">BLUEPRINT FORGE • ${fmt(progress.warfront.skillCores)} CORES</div><div class="blueprint-grid">${bp}</div><small class="warfront-hint">BOSS comuns têm chance de dropar fragmentos. World Boss garante fragmentos + cores conforme sua contribuição.</small></section>`;updateWarfrontBadge();}
async function refreshWarfrontState(force=false){if(!authenticated||warfrontRuntime.busy)return warfrontRuntime.state;if(!force&&warfrontRuntime.state&&Date.now()-warfrontRuntime.lastAt<5000){renderWarfront();return warfrontRuntime.state;}warfrontRuntime.busy=true;try{warfrontRuntime.clans=await listClansOnline().catch(()=>warfrontRuntime.clans||[]);warfrontRuntime.state=await loadWarfrontStateOnline();warfrontRuntime.lastAt=Date.now();updateWarfrontBadge();renderWarfront();syncWorldBossEnemyFromState();return warfrontRuntime.state;}catch(e){console.warn('warfront',e);if(ui.warfrontContent&&!ui.warfrontModal?.classList.contains('hidden'))ui.warfrontContent.innerHTML=`<div class="warfront-error"><b>WARFRONT OFFLINE</b><span>Recurso temporariamente indisponível.</span></div>`;}finally{warfrontRuntime.busy=false;}}
async function openWarfront(){closeNavigationModals(ui.warfrontModal);ui.warfrontModal?.classList.remove('hidden');if(ui.warfrontContent)ui.warfrontContent.innerHTML='<div class="muted">Sincronizando frente de guerra...</div>';await refreshClanState(true);await refreshWarfrontState(true);}
async function declareWarNow(){const target=$('#warTargetClan')?.value;if(!target){showToast('Escolha um clã rival');return;}try{await declareClanWarOnline(target);showToast('GUERRA DECLARADA!','reward');pushActivity('WARFRONT • Guerra de Clãs iniciada','reward');await refreshWarfrontState(true);}catch(e){showToast(e.message);}}
function activeWorldBossEnemy(){return state.enemies.find(e=>e.worldBoss&&e.hp>0)||null;}
function spawnWorldBossEncounter(){const wb=worldBossState();if(!wb||Number(wb.hp)<=0){showToast('World Boss já foi derrotado');return;}if(!state.currentMap?.battle){showToast('Entre em um mapa BATTLE (4-1 / 4-2 / 4-3) para enfrentar o World Boss');return;}let e=activeWorldBossEnemy();if(e){state.target=e;showToast('NEMESIS PRIME já está no setor');return;}const base=makeEnemy('bossSibelon');base.id=`worldboss_${wb.id}`;base.worldBoss=true;base.forceChase=true;base.name=wb.name||'NEMESIS PRIME';base.maxHp=Math.max(1,Number(wb.max_hp)||250000000);base.hp=Math.max(1,Number(wb.hp)||base.maxHp);base.maxShield=0;base.shield=0;base.damage=Math.max(base.damage*2.25,22000);base.speed=Math.max(base.speed,145);base.aggroRange=1800;base.attackRange=520;base.size=Math.max(base.size,78);base.x=Math.min(state.currentMap.world.w-350,Math.max(350,player.x+700));base.y=Math.min(state.currentMap.world.h-350,Math.max(350,player.y+250));state.enemies.push(base);state.target=base;showToast('NEMESIS PRIME ENTROU NO SETOR!','reward');pushActivity('WORLD BOSS • NEMESIS PRIME detectado','combat');}
function syncWorldBossEnemyFromState(){const wb=worldBossState(),e=activeWorldBossEnemy();if(!wb||!e)return;if(Number(wb.hp)<=0){e.hp=0;spawnExplosionFx(e.x,e.y,'#ff416b',true);if(state.target?.id===e.id)state.target=null;return;}e.maxHp=Math.max(1,Number(wb.max_hp)||e.maxHp);e.hp=Math.max(1,Number(wb.hp)||e.hp);}
async function flushWorldBossDamage(force=false){if(!authenticated||warfrontRuntime.busyDamage)return;const dmg=Math.floor(warfrontRuntime.pendingBossDamage||0);if(dmg<=0)return;if(!force&&Date.now()-warfrontRuntime.lastDamageFlush<900)return;warfrontRuntime.busyDamage=true;warfrontRuntime.pendingBossDamage=0;warfrontRuntime.lastDamageFlush=Date.now();try{const r=await hitWorldBossOnline(dmg);warfrontRuntime.state ||= {};warfrontRuntime.state.world_boss={...(warfrontRuntime.state.world_boss||{}),...r};updateWarfrontBadge();syncWorldBossEnemyFromState();if(r?.defeated){showToast('WORLD BOSS DERROTADO! RESGATE SEU LOOT!','reward');pushActivity('WORLD BOSS • NEMESIS PRIME eliminado!','reward');renderWarfront();}}catch(e){warfrontRuntime.pendingBossDamage+=dmg;console.warn('world boss damage',e);}finally{warfrontRuntime.busyDamage=false;}}
async function claimWorldBossNow(){try{const r=await claimWorldBossRewardOnline();if(r?.already_claimed){showToast('Recompensa já resgatada');return;}normalizeWarfrontProgress();progress.profile.credits+=Number(r.credits)||0;progress.profile.uridium+=Number(r.uridium)||0;progress.warfront.skillCores+=Number(r.cores)||0;const bp=WARFRONT_BLUEPRINTS[r.blueprint_id]?r.blueprint_id:'lf4';progress.warfront.blueprints[bp]=(progress.warfront.blueprints[bp]||0)+(Number(r.fragments)||0);progress.warfront.worldBossClaims[String(r.boss_id||'boss')]=Date.now();saveGame();await flushCloudSave(true);showToast(`WORLD BOSS • +${fmt(r.credits||0)} CR • +${fmt(r.uridium||0)} STL • +${fmt(r.fragments||0)} FRAG`,'reward');pushActivity(`WORLD BOSS LOOT • ${fmt(r.fragments||0)} ${WARFRONT_BLUEPRINTS[bp].name} • +${fmt(r.cores||0)} cores`,'reward');await refreshWarfrontState(true);}catch(e){showToast(e.message);}}
function rollRareBossLoot(enemy){if(!enemy||enemy.worldBoss||!String(enemy.type||'').startsWith('boss'))return;normalizeWarfrontProgress();const chance=enemy.gateEnemy?.22:.13;if(Math.random()>chance)return;const ids=Object.keys(WARFRONT_BLUEPRINTS),id=ids[Math.floor(Math.random()*ids.length)],frags=1+(Math.random()<.22?1:0),core=Math.random()<.18?1:0;progress.warfront.blueprints[id]+=frags;progress.warfront.skillCores+=core;progress.warfront.rareDrops++;showToast(`LOOT RARO • ${WARFRONT_BLUEPRINTS[id].name} +${frags}${core?' • +1 CORE':''}`,'reward');pushActivity(`BLUEPRINT • ${WARFRONT_BLUEPRINTS[id].name} +${frags}${core?' • SKILL CORE +1':''}`,'reward');}
function craftBlueprint(id){normalizeWarfrontProgress();const bp=WARFRONT_BLUEPRINTS[id];if(!bp)return;const have=progress.warfront.blueprints[id]||0;if(have<bp.need||progress.warfront.skillCores<bp.cores){showToast('Fragmentos ou cores insuficientes');return;}progress.warfront.blueprints[id]-=bp.need;progress.warfront.skillCores-=bp.cores;progress.inventory[bp.itemId]=(progress.inventory[bp.itemId]||0)+bp.qty;progress.warfront.crafted[id]=(progress.warfront.crafted[id]||0)+1;saveGame();renderWarfront();renderHangar();showToast(`${bp.name} CONSTRUÍDO!`,'reward');pushActivity(`FORJA • ${bp.name} criado`,'reward');}
function upgradeAbilityMastery(){normalizeWarfrontProgress();const cls=abilityClassId(),lv=abilityMasteryLevel();if(lv>=5){showToast('Mastery máxima');return;}const cost=[2,4,7,11][lv-1];if(progress.warfront.skillCores<cost){showToast(`Você precisa de ${cost} Skill Cores`);return;}progress.warfront.skillCores-=cost;progress.warfront.skillMastery[cls]=lv+1;saveGame();renderWarfront();updateAbilityHud();showToast(`${SHIP_ABILITIES[cls].name} • MASTERY ${lv+1}!`,'reward');pushActivity(`MASTERY • ${SHIP_ABILITIES[cls].name} subiu para ${lv+1}`,'reward');}
async function scoreClanWar(points,reason){if(!authenticated||!currentClanTag())return;try{const r=await recordClanWarScoreOnline(points,reason);if(r?.scored){warfrontRuntime.state ||= {};warfrontRuntime.state.war=r.war||warfrontRuntime.state.war;updateWarfrontBadge();}}catch{}}
function updateWarfrontRuntime(){if(!authenticated||!progress)return;if(warfrontRuntime.pendingBossDamage>0)flushWorldBossDamage();if(activeWorldBossEnemy()&&Date.now()-warfrontRuntime.lastBossSync>5000){warfrontRuntime.lastBossSync=Date.now();refreshWarfrontState(true).catch(()=>{});}}


function layoutHudPanels(){
  const topbarH=ui.topbar?Math.ceil(ui.topbar.getBoundingClientRect().height):42;
  const weaponH=ui.weaponBar?Math.ceil(ui.weaponBar.getBoundingClientRect().height):150;
  document.documentElement.style.setProperty('--hud-top-offset',`${topbarH+8}px`);
  document.documentElement.style.setProperty('--weaponbar-height',`${weaponH+12}px`);
  let left=8;
  const place=(el,visible=true,gap=8)=>{if(!el||!visible)return;el.style.left=`${left}px`;const w=Math.ceil(el.getBoundingClientRect().width||0);left+=w+gap;};
  place(ui.leftStats,hudVisibility.ship!==false);
  place(ui.playerPanel,hudVisibility.player!==false);
  place(ui.petFloatPanel,hudVisibility.pet!==false&&!!progress?.pet?.owned);
  if(ui.activeMissionPanel&&hudVisibility.missions!==false&&innerWidth>820)ui.activeMissionPanel.style.left=`${left}px`;
}
function getFaction(){return progress?.profile?.faction ? FACTIONS[progress.profile.faction] : null;}
function factionFromPrefix(prefix){
  return Object.values(FACTIONS).find(f=>String(f.prefix)===String(prefix))||null;
}
function currentTerritoryFaction(){
  if(!progress)return null;
  if(!['x1','x2','x3','x4'].includes(progress.mapId))return null;
  return progress.territoryFaction||progress.profile.faction;
}
function territoryOwner(){
  const id=currentTerritoryFaction();
  return id?FACTIONS[id]||null:null;
}
function isOwnTerritory(){
  return !!progress&&!!currentTerritoryFaction()&&currentTerritoryFaction()===progress.profile.faction;
}
function displayMapLabel(mapId,territoryFaction=null){
  const map=MAPS[mapId];if(!map)return '—';
  if(map.gate)return map.label||'GATE';
  if(map.battle)return map.label;
  const ownerId=territoryFaction||(mapId===progress?.mapId?currentTerritoryFaction():progress?.profile?.faction);
  const f=ownerId?FACTIONS[ownerId]:getFaction();
  return f?`${f.prefix}-${map.tier}`:`X-${map.tier}`;
}
function currentGraphMapLabel(){return progress?displayMapLabel(progress.mapId,currentTerritoryFaction()):null;}
function graphDestination(label){
  if(label==='4-1')return {mapId:'b41',territoryFaction:null,battle:true};
  if(label==='4-2')return {mapId:'b42',territoryFaction:null,battle:true};
  if(label==='4-3')return {mapId:'b43',territoryFaction:null,battle:true};
  const [prefix,tierRaw]=String(label||'').split('-'),f=factionFromPrefix(prefix),tier=Number(tierRaw);
  if(!f||tier<1||tier>4)return null;
  return {mapId:`x${tier}`,territoryFaction:f.id,battle:false};
}
function internalMapFromGraphLabel(label){return graphDestination(label)?.mapId||null;}
function graphLevelRequirement(label){if(label.startsWith('4-'))return 4;const tier=Number(label.split('-')[1]||99);return tier<=2?1:tier===3?2:tier===4?3:99;}
function canTravelGraphLabel(label){
  const dest=graphDestination(label);if(!dest)return {ok:false,reason:'Rota inválida'};
  const req=graphLevelRequirement(label);if((progress?.profile?.level||1)<req)return {ok:false,reason:`Requer nível ${req}`};
  const foreign=!dest.battle&&dest.territoryFaction!==progress.profile.faction;
  return {ok:true,mapId:dest.mapId,territoryFaction:dest.territoryFaction,battle:dest.battle,foreign};
}
function mapArtFor(label){
  const prefix=label.split('-')[0],tier=Number(label.split('-')[1]||1);
  let path=GAME_ASSETS.backgrounds.x1;
  if(prefix==='4')path=tier===1?GAME_ASSETS.backgrounds.b41:tier===2?GAME_ASSETS.backgrounds.b42:GAME_ASSETS.backgrounds.b43;
  else if(tier===1)path=GAME_ASSETS.backgrounds.x1;
  else if(tier===2)path=GAME_ASSETS.backgrounds.x2;
  else if(tier===3)path=prefix==='3'?GAME_ASSETS.backgrounds.x4:GAME_ASSETS.backgrounds.x3;
  else path=GAME_ASSETS.backgrounds.x4;
  return `url('${path}') center/cover no-repeat`;
}
function renderMapModal(){
  if(!ui.mapNetwork||!progress)return;
  normalizeGalaxyGateState();
  const jumps=progress.galaxyGate.jumpBonus;
  const current=currentGraphMapLabel(),nodeMap=Object.fromEntries(MAP_GRAPH_NODES.map(n=>[n.id,n]));
  let html=`<svg class="map-svg" viewBox="0 0 100 100" preserveAspectRatio="none">`;
  for(const [a,b] of MAP_GRAPH_LINKS){const na=nodeMap[a],nb=nodeMap[b];html+=`<line class="map-link" x1="${na.x}" y1="${na.y}" x2="${nb.x}" y2="${nb.y}" />`;}
  html+='</svg>';
  html+=`<div class="map-legend"><span><i class="dot curr"></i> mapa atual</span><span><i class="dot own"></i> território aliado</span><span><i class="dot hostile"></i> território inimigo / invasão</span><span class="jump-wallet">↯ BÔNUS DE SALTO <b>${fmt(jumps)}</b></span></div>`;
  for(const node of MAP_GRAPH_NODES){
    const access=canTravelGraphLabel(node.id),active=node.id===current,battle=node.id.startsWith('4-'),foreign=!!access.foreign;
    const canJump=access.ok&&!active&&jumps>0;
    const classes=['map-node'];
    if(active)classes.push('current');if(!foreign&&!battle)classes.push('faction');if(foreign)classes.push('hostile');if(battle)classes.push('battle');
    if(canJump)classes.push('travel');else if(access.ok&&!active)classes.push('no-jump');
    if(!access.ok)classes.push('locked');
    const sub=active?'ATUAL':!access.ok?access.reason:jumps>0?'1 BÔNUS DE SALTO':'USE OS PORTAIS';
    html+=`<div class="${classes.join(' ')}" data-map-label="${node.id}" style="left:${node.x}%;top:${node.y}%;--art:${mapArtFor(node.id)}"><div class="node-art"></div><div class="node-overlay"></div><div class="node-sub">${sub}</div>${!access.ok?'<div class="node-lock">🔒</div>':''}<div class="node-label">${node.id}</div></div>`;
  }
  ui.mapNetwork.innerHTML=html;
  ui.mapNetwork.querySelectorAll('.map-node[data-map-label]').forEach(el=>el.addEventListener('click',()=>{
    const label=el.dataset.mapLabel;
    if(label===current)return;
    const access=canTravelGraphLabel(label);
    if(!access.ok){showToast(access.reason);return;}
    normalizeGalaxyGateState();
    if(progress.galaxyGate.jumpBonus<=0){
      showToast('Sem Bônus de Salto • viaje pelos portais físicos');
      return;
    }
    progress.galaxyGate.jumpBonus--;
    saveGame();renderGalaxyGate();
    ui.mapModal.classList.add('hidden');
    runMapTransition(access.mapId,null,'BÔNUS DE SALTO CONSUMIDO',access.territoryFaction,currentGraphMapLabel());
  }));
}
function openMapModal(){if(isGalaxyGateMap()){showToast('Portal Astral ativo: complete o portal ou perca uma vida para retornar à base');return;}closeNavigationModals(ui.mapModal);renderMapModal();ui.mapModal.classList.remove('hidden');}
function isBaseSafeZone(x=player.x,y=player.y){
  if(!progress||progress.mapId!==SAFE_ZONE.mapId||!isOwnTerritory())return false;
  const b=currentBasePoint();
  return Math.hypot(x-b.x,y-b.y)<=SAFE_ZONE.radius;
}
function isPortalNeutralZone(x=player.x,y=player.y){
  if(!progress||isGalaxyGateMap())return false;
  try{return resolvedPortals().some(p=>Math.hypot(x-p.x,y-p.y)<=PORTAL_NEUTRAL_RADIUS);}catch{return false;}
}
function isSafeZone(x=player.x,y=player.y){return isBaseSafeZone(x,y)||isPortalNeutralZone(x,y);}
function canChangeEquipment(){return isBaseSafeZone();}
function safeZoneDistance(x,y){
  const b=currentBasePoint();
  return Math.hypot(x-b.x,y-b.y);
}
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
function isAtTrader(){return progress?.mapId==='x1'&&isOwnTerritory()&&isBaseSafeZone();}
const ACTIVITY_MAX=24;
let activityEntries=[];
function activityStorageKey(){return `stellar_activity_log_v1:${getUser()?.id||'guest'}`;}
function loadActivityLog(){
  try{
    const raw=JSON.parse(localStorage.getItem(activityStorageKey())||'[]');
    activityEntries=Array.isArray(raw)?raw.slice(0,ACTIVITY_MAX):[];
  }catch{activityEntries=[];}
  renderActivityFeed();
}
function saveActivityLog(){
  try{localStorage.setItem(activityStorageKey(),JSON.stringify(activityEntries.slice(0,ACTIVITY_MAX)));}catch{}
}
function activityIcon(type){
  return ({reward:'+',ore:'◆',loot:'□',combat:'☠',mission:'★',shop:'¤',nav:'↯',system:'•'})[type]||'•';
}
function pushActivity(text,type='system'){
  const clean=String(text||'').replace(/\s+/g,' ').trim();
  if(!clean)return;
  const last=activityEntries[0];
  if(last&&last.text===clean&&Date.now()-last.at<850)return;
  activityEntries.unshift({text:clean,type,at:Date.now()});
  if(activityEntries.length>ACTIVITY_MAX)activityEntries.length=ACTIVITY_MAX;
  saveActivityLog();renderActivityFeed();
}
function renderActivityFeed(){
  if(!ui.activityFeed)return;
  const rows=activityEntries.slice(0,5);
  if(!rows.length){
    ui.activityFeed.innerHTML='<div class="activity-empty">As últimas ações e recompensas aparecem aqui.</div>';
    return;
  }
  ui.activityFeed.innerHTML=rows.map((e,i)=>{
    const tm=new Date(e.at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    return `<div class="activity-row ${e.type||'system'}${i===0?' newest':''}"><i>${activityIcon(e.type)}</i><span>${e.text}</span><time>${tm}</time></div>`;
  }).join('');
}
function clearActivityFeed(){
  activityEntries=[];saveActivityLog();renderActivityFeed();
}
function showToast(msg,activityType='system'){
  ui.toast.textContent=msg;ui.toast.classList.add('show');clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),1900);
  pushActivity(msg,activityType);
}
const celebrationQueue=[];let celebrationRunning=false;
function queueCelebration(kind,title,subtitle=''){celebrationQueue.push({kind,title,subtitle});playNextCelebration();}
function playNextCelebration(){if(celebrationRunning||!celebrationQueue.length||!ui.gameCelebration)return;celebrationRunning=true;const item=celebrationQueue.shift();ui.gameCelebration.classList.remove('hidden','mission','level');ui.gameCelebration.classList.add(item.kind==='level'?'level':'mission');ui.celebrationKicker.textContent=item.kind==='level'?'EVOLUÇÃO DE PILOTO':'PROTOCOLO DE MISSÃO';ui.celebrationTitle.textContent=item.title;ui.celebrationSubtitle.textContent=item.subtitle||'';void ui.gameCelebration.offsetWidth;ui.gameCelebration.classList.add('play');setTimeout(()=>{ui.gameCelebration.classList.remove('play');setTimeout(()=>{ui.gameCelebration.classList.add('hidden');celebrationRunning=false;playNextCelebration();},320);},1900);}
function showMissionCompleteAnimation(mission,bonus){
  const extra=bonus?.itemText?` • ${bonus.itemText}`:'';
  queueCelebration('mission','MISSÃO COMPLETA',`${mission.title} • +${fmt(bonus.credits)} CR • +${fmt(bonus.uridium)} STL • +${fmt(bonus.xp)} XP${extra}`);
}
function showLevelUpAnimation(level){queueCelebration('level',`NÍVEL ${level}`,`Seu piloto alcançou o nível ${level}`);}
function processPlayerLevelUps(){
  let gained=0;
  while(progress.profile.level<PLAYER_MAX_LEVEL&&progress.profile.xp>=levelXpThreshold(progress.profile.level+1)){
    progress.profile.level++;
    gained++;
    showLevelUpAnimation(progress.profile.level);
    queueCelebration('mission','RECOMPENSA LIBERADA',`Nível ${progress.profile.level} • abra PASSE para resgatar`);
  }
  if(gained){normalizeLevelRewards();updatePassBadge();saveGame();}
  return gained;
}

function setSync(text,cls=''){ui.syncLabel.textContent=text;ui.syncLabel.className=`sync-chip ${cls}`.trim();}
function locationStorageKey(mapId=progress?.mapId,territoryFaction=progress?.territoryFaction){
  const id=String(mapId||'x1');
  if(['x1','x2','x3','x4'].includes(id)){
    const faction=territoryFaction||progress?.profile?.faction||'battle';
    return `${id}:${faction}`;
  }
  return id;
}
function syncRuntimeLocationToProgress(){
  if(!progress||!state?.currentMap)return;
  const x=Number(player?.x),y=Number(player?.y);
  if(!Number.isFinite(x)||!Number.isFinite(y))return;
  progress.x=x;progress.y=y;
  progress.savedMapId=progress.mapId;
  progress.savedTerritoryFaction=progress.territoryFaction||null;
  progress.positionByMap ||= {};
  progress.positionByMap[locationStorageKey()]={
    x,y,mapId:progress.mapId,territoryFaction:progress.territoryFaction||null,savedAt:Date.now()
  };
}
function savedLocationForCurrentMap(){
  if(!progress)return null;
  const entry=progress.positionByMap?.[locationStorageKey()];
  if(entry&&Number.isFinite(Number(entry.x))&&Number.isFinite(Number(entry.y)))return {x:Number(entry.x),y:Number(entry.y)};
  const sameMap=String(progress.savedMapId||progress.mapId||'')===String(progress.mapId||'');
  const sameTerritory=!['x1','x2','x3','x4'].includes(progress.mapId)||!progress.savedTerritoryFaction||progress.savedTerritoryFaction===progress.territoryFaction;
  if(sameMap&&sameTerritory&&Number.isFinite(Number(progress.x))&&Number.isFinite(Number(progress.y)))return {x:Number(progress.x),y:Number(progress.y)};
  return null;
}
function saveGame(){
  if(!progress)return;
  if(isGalaxyGateMap())syncAlphaGateSnapshot();
  syncRuntimeLocationToProgress();
  progress.clientSavedAt=Date.now();
  localStorage.setItem(saveKey(),JSON.stringify(progress));
  cloudDirty=true;
}
function readLocalGameState(){
  const raw=localStorage.getItem(saveKey());
  if(!raw)return null;
  try{return JSON.parse(raw);}catch(e){console.warn(e);return null;}
}
function loadLocalGame(){
  const local=readLocalGameState();
  if(!local){progress=null;return;}
  try{progress=local;hydrateProgress();}catch(e){console.warn(e);progress=null;}
}
function hydrateProgress(){
  if(!progress)return;
  if(!progress.profile?.faction || !SHIPS[progress.activeShipId]) throw new Error('save incompleto');
  progress.profile.callsign ||= getUser()?.callsign || getUser()?.email?.split('@')[0] || 'Pilot';
  progress.profile.level=Math.max(1,Math.min(PLAYER_MAX_LEVEL,Number(progress.profile.level)||1));
  progress.profile.xp=Math.max(0,Number(progress.profile.xp)||0);
  progress.profile.aliensKilled=Math.max(0,Math.floor(Number(progress.profile.aliensKilled)||0));
  progress.profile.ggCompleted=Math.max(0,Math.floor(Number(progress.profile.ggCompleted)||0));
  normalizeWarfrontProgress();
  if(['x1','x2','x3','x4'].includes(progress.mapId))progress.territoryFaction=progress.territoryFaction||progress.profile.faction;
  else progress.territoryFaction=null;
  progress.positionByMap ||= {};
  if(!progress.savedMapId)progress.savedMapId=progress.mapId;
  if(progress.savedTerritoryFaction===undefined)progress.savedTerritoryFaction=progress.territoryFaction||null;
  const legacyLocationKey=locationStorageKey(progress.mapId,progress.territoryFaction);
  if(!progress.positionByMap[legacyLocationKey]&&Number.isFinite(Number(progress.x))&&Number.isFinite(Number(progress.y))){
    progress.positionByMap[legacyLocationKey]={x:Number(progress.x),y:Number(progress.y),mapId:progress.mapId,territoryFaction:progress.territoryFaction||null,savedAt:Number(progress.clientSavedAt)||0};
  }
  if(!progress.profile.xpModelV101){
    const oldCarry=progress.profile.xp;
    progress.profile.xp=levelXpThreshold(progress.profile.level)+oldCarry;
    progress.profile.xpModelV101=true;
  }
  progress.profile.level=levelFromXp(progress.profile.xp,PLAYER_MAX_LEVEL);
  progress.ownedShips ||= ['phoenix'];progress.inventory ||= {};progress.drones ||= [];progress.ammo ||= {};progress.rockets ||= {};progress.flags ||= {};progress.cargo ||= {};progress.discoveries ||= {};progress.missions ||= freshMissions();normalizeMissionState();normalizeBattlePass();normalizeLevelRewards();progress.pilotBio ||= freshPilotBio();normalizePilotBio();progress.auction ||= freshAuctionState();ensureAuctionState();progress.galaxyGate ||= freshGalaxyGateState();normalizeGalaxyGateState();normalizeCombatAbilities();
  if(progress.repairRequired&&(!progress.repairRequired.shipId||!SHIPS[progress.repairRequired.shipId]))progress.repairRequired=null;
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
  progress.pet.kamikazeReadyAt=Math.max(0,Number(progress.pet.kamikazeReadyAt)||0);
  // Nova Burst é uma habilidade de ativação única. Nunca restaura armado após reload/save antigo.
  if(progress.pet.activeGear==='kami')progress.pet.activeGear='off';
  petRuntime.kamiArmed=false;
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
  try{const result=await saveCloudSave(progress);if(result?.statePatch){const patch=result.statePatch;if(Number.isFinite(Number(patch.credits)))progress.profile.credits=Number(patch.credits);if(patch.serverEconomy)progress.serverEconomy={...(progress.serverEconomy||{}),...patch.serverEconomy};localStorage.setItem(saveKey(),JSON.stringify(progress));updateUI();if(patch.serverEconomy?.lastClanCollectionDate)showToast('CLÃ • coleta diária de 10% sincronizada','system');}cloudDirty=false;setSync('ONLINE','ok');}
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
function canAutoBuy(def){
  if(!def||def.purchasable===false||def.sourceOnly===true)return false;
  return def.currency==='credits'?progress.profile.credits>=def.price:progress.profile.uridium>=def.price;
}
function buyAmmoPack(id,silent=false){
  const a=LASER_AMMO[id];
  if(!a||a.purchasable===false||a.sourceOnly===true||!charge(a.price,a.currency))return false;
  progress.ammo[id]=(progress.ammo[id]||0)+a.pack;
  if(!silent)showToast(`+${fmt(a.pack)} ${a.name}`,'shop');
  saveGame();return true;
}
function buyRocketPack(id,silent=false){
  const r=ROCKETS[id];
  if(!r||r.purchasable===false||r.sourceOnly===true||!charge(r.price,r.currency))return false;
  progress.rockets[id]=(progress.rockets[id]||0)+r.pack;
  if(!silent)showToast(`+${fmt(r.pack)} ${r.name}`,'shop');
  saveGame();return true;
}

// Ordem de queda automática. SAB é especial: ao acabar, cai para x2 -> x1.
const LASER_AMMO_FALLBACK={
  ucb100:['mcb50','mcb25','lcb10'],
  mcb50:['mcb25','lcb10'],
  sab50:['mcb25','lcb10'],
  mcb25:['lcb10'],
  lcb10:[]
};
const ROCKET_FALLBACK={
  plt3030:['plt2021','plt2026','r310'],
  plt2021:['plt2026','r310'],
  plt2026:['r310'],
  r310:[]
};

function autoBuyActiveLaser(id,announce=true){
  const def=LASER_AMMO[id];
  if(!autoBuyEnabled()||!canAutoBuy(def)||!buyAmmoPack(id,true))return false;
  state.lastAutoBuyAt=nowSec();
  refreshAmmoCounters();renderShop();
  if(announce)showToast(`AUTO BUY • ${shortLaserLabel(id)} +${fmt(def.pack)}`,'shop');
  return true;
}
function autoBuyActiveRocket(id,announce=true){
  const def=ROCKETS[id];
  if(!autoBuyEnabled()||!canAutoBuy(def)||!buyRocketPack(id,true))return false;
  state.lastAutoBuyAt=nowSec();
  refreshAmmoCounters();renderShop();
  if(announce)showToast(`AUTO BUY • ${shortRocketLabel(id)} +${fmt(def.pack)}`,'shop');
  return true;
}
function switchToWeakerLaser(expiredId){
  const next=(LASER_AMMO_FALLBACK[expiredId]||[]).find(id=>ammoQty(id)>0);
  if(!next)return null;
  progress.selectedLaserAmmo=next;
  refreshAmmoCounters();saveGame();
  showToast(`${shortLaserLabel(expiredId)} acabou → ${shortLaserLabel(next)}`,'system');
  return LASER_AMMO[next];
}
function switchToWeakerRocket(expiredId){
  const next=(ROCKET_FALLBACK[expiredId]||[]).find(id=>rocketQty(id)>0);
  if(!next)return null;
  progress.selectedRocket=next;
  refreshAmmoCounters();saveGame();
  showToast(`${shortRocketLabel(expiredId)} acabou → ${shortRocketLabel(next)}`,'system');
  return ROCKETS[next];
}
function recoverActiveLaser(expiredId,announceBuy=true){
  if(ammoQty(expiredId)>0)return LASER_AMMO[expiredId];
  if(autoBuyActiveLaser(expiredId,announceBuy))return LASER_AMMO[expiredId];
  return switchToWeakerLaser(expiredId);
}
function recoverActiveRocket(expiredId,announceBuy=true){
  if(rocketQty(expiredId)>0)return ROCKETS[expiredId];
  if(autoBuyActiveRocket(expiredId,announceBuy))return ROCKETS[expiredId];
  return switchToWeakerRocket(expiredId);
}
function maybeAutoBuyAmmo(){
  if(!progress||!autoBuyEnabled())return;
  const now=nowSec();
  if(now-state.lastAutoBuyAt<0.9)return;

  const laser=currentLaserAmmo(),rocket=currentRocket();
  const laserNeed=Math.max(1,equippedLaserCount()+petLaserIds().length)*10;
  const bought=[];

  // CPU compra SOMENTE o laser e o míssil atualmente selecionados.
  if(ammoQty(laser.id)<laserNeed&&canAutoBuy(laser)&&buyAmmoPack(laser.id,true)){
    bought.push(`${shortLaserLabel(laser.id)} +${fmt(laser.pack)}`);
  }
  if(rocketQty(rocket.id)<10&&canAutoBuy(rocket)&&buyRocketPack(rocket.id,true)){
    bought.push(`${shortRocketLabel(rocket.id)} +${fmt(rocket.pack)}`);
  }

  if(bought.length){
    state.lastAutoBuyAt=now;
    refreshAmmoCounters();renderShop();
    showToast(`AUTO BUY • ${bought.join(' • ')}`,'shop');
  }
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
    showToast(`AUX-9 subiu para o nível ${progress.pet.level}!`);
  }
  if(leveled){saveGame();refreshPetViews();}
}
function unlockPetSlot(kind){
  const pet=progress.pet;if(!pet?.owned){showToast('Adquira o AUX-9 primeiro');return;}
  const key=kind==='laser'?'laserSlotsUnlocked':'shieldSlotsUnlocked';
  const list=kind==='laser'?pet.lasers:pet.shields;
  const next=pet[key]+1;
  const availableSlots=Math.min(pet.level,PET_SLOT_LEVEL_CAP);
  if(next>availableSlots){showToast(next>PET_SLOT_LEVEL_CAP?`AUX-9 atingiu o limite de ${PET_SLOT_LEVEL_CAP} slots`:`AUX-9 precisa estar no nível ${next}`);return;}
  const cost=petSlotCost(next);
  if(progress.profile.uridium<cost){showToast(`Faltam ${fmt(cost-progress.profile.uridium)} STL`);return;}
  openSpendConfirm({title:'Liberar slot do AUX-9?',itemName:`Slot ${next} de ${kind==='laser'?'laser':'escudo'}`,detail:'Confirme para gastar Stellarium e desbloquear este slot do AUX-9',value:cost,currency:'uridium',confirmLabel:'LIBERAR SLOT',onConfirm:()=>{if(progress.profile.uridium<cost){showToast(`Faltam ${fmt(cost-progress.profile.uridium)} STL`);return;}progress.profile.uridium-=cost;pet[key]=next;list.push(null);saveGame();refreshPetViews();updateUI();showToast(`Slot ${next} de ${kind==='laser'?'laser':'escudo'} liberado`);}});
}
function equipPetItem(itemId,kind){
  if(!canChangeEquipment()){showToast('Configure equipamentos do AUX-9 somente dentro da sua base X-1');return;}
  if(!progress?.pet?.owned){showToast('Adquira o AUX-9 primeiro');return;}
  const item=ITEMS[itemId];
  const valid=kind==='laser'?item?.type==='laser':item?.type==='generator'&&item?.subtype==='shield';
  if(!valid){showToast(kind==='laser'?'O AUX-9 aceita lasers nesse espaço':'O AUX-9 aceita geradores de escudo nesse espaço');return;}
  const list=kind==='laser'?progress.pet.lasers:progress.pet.shields;
  const idx=list.findIndex(v=>!v);if(idx<0){showToast('Sem slot liberado vazio no AUX-9');return;}
  if(!removeInventory(itemId)){showToast('Item não disponível');return;}
  list[idx]=itemId;saveGame();refreshPetViews();refreshAmmoCounters();
}
function unequipPetSlot(kind,index){
  if(!canChangeEquipment()){showToast('Configure equipamentos do AUX-9 somente dentro da sua base X-1');return;}
  if(!progress?.pet?.owned)return;
  const list=kind==='laser'?progress.pet.lasers:progress.pet.shields;
  const id=list[index];if(!id)return;list[index]=null;addInventory(id);saveGame();refreshPetViews();refreshAmmoCounters();
}
function buyPetUnit(){
  if(progress?.pet?.owned){showToast('AUX-9 já adquirido');return;}
  const petCost=premiumElitePrice(PET_BASE_PRICE,'uridium');if(progress.profile.uridium<petCost){showToast(`Faltam ${fmt(petCost-progress.profile.uridium)} STL para o AUX-9`);return;}
  openSpendConfirm({title:'Comprar AUX-9?',itemName:'AUX-9 — Unidade Base',detail:`Confirme a compra da unidade base do AUX-9.${petCost<PET_BASE_PRICE?' Bônus PREMIUM aplicado (-5%).':''}`,value:petCost,currency:'uridium',onConfirm:()=>{if(progress?.pet?.owned){showToast('AUX-9 já adquirido');return;}if(progress.profile.uridium<petCost){showToast(`Faltam ${fmt(petCost-progress.profile.uridium)} STL para o AUX-9`);return;}progress.profile.uridium-=petCost;progress.pet=freshPet();progress.pet.owned=true;progress.pet.laserSlotsUnlocked=1;progress.pet.shieldSlotsUnlocked=1;progress.pet.lasers=[null];progress.pet.shields=[null];petRuntime.x=player.x+82;petRuntime.y=player.y+64;petRuntime.tx=petRuntime.x;petRuntime.ty=petRuntime.y;petRuntime.roamX=null;petRuntime.roamY=null;petRuntime.nextRoamAt=0;saveGame();renderShop();refreshPetViews();updateUI();showToast('AUX-9 adquirido! Agora equipe armas, escudos e módulos.');}});
}
function buyPetGear(id){
  if(!progress?.pet?.owned){showToast('Adquira o AUX-9 primeiro');return;}
  const gear=PET_GEARS[id];if(!gear)return;
  if(progress.pet.gearsOwned[id]){showToast('Módulo já comprado');return;}
  const gearCost=premiumElitePrice(gear.cost,'uridium');if(progress.profile.uridium<gearCost){showToast(`Faltam ${fmt(gearCost-progress.profile.uridium)} STL`);return;}
  openSpendConfirm({title:'Comprar módulo do AUX-9?',itemName:gear.name,detail:`Confirme a compra do módulo.${gearCost<gear.cost?' Bônus PREMIUM aplicado (-5%).':''}`,value:gearCost,currency:'uridium',onConfirm:()=>{if(progress.pet.gearsOwned[id]){showToast('Módulo já comprado');return;}if(progress.profile.uridium<gearCost){showToast(`Faltam ${fmt(gearCost-progress.profile.uridium)} STL`);return;}progress.profile.uridium-=gearCost;progress.pet.gearsOwned[id]=true;saveGame();renderShop();refreshPetViews();updateUI();showToast(`${gear.name} adquirido`);}});
}
function petKamikazeCooldownRemaining(){
  return Math.max(0,(Number(progress?.pet?.kamikazeReadyAt)||0-Date.now())/1000);
}
function cancelPetKamikazeCharge(){
  petRuntime.kamiArmed=false;
  if(petRuntime.taskType==='kami'){petRuntime.taskType='follow';petRuntime.taskId=null;}
}
function setPetGear(id){
  if(!progress?.pet?.owned){showToast('Adquira o AUX-9 primeiro');return;}
  if(id!=='off'&&!progress.pet.gearsOwned[id]){showToast('Compre esse módulo primeiro');return;}
  if(id==='kami'){
    const remaining=petKamikazeCooldownRemaining();
    if(remaining>0){showToast(`Nova Burst recarregando • ${remaining.toFixed(1)}s`);return;}
    petRuntime.kamiArmed=true;
    petRuntime.kamiActivationId=(petRuntime.kamiActivationId||0)+1;
  }else cancelPetKamikazeCharge();
  progress.pet.activeGear=id;petRuntime.taskId=null;petRuntime.taskType='follow';saveGame();refreshPetViews();
  showToast(id==='off'?'AUX-9 em modo companhia':id==='kami'?'Nova Burst armado • 1 explosão':PET_GEARS[id].name+' ativado');
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
  if(total>0){battlePassEvent('dropResource',total);battlePassEvent('box',1);}
  if(credits>0)spawnParticle(drop.x,drop.y,`AUX-9 +${fmt(credits)} CR`,'#ffd36c');
  addPetXp(Math.max(4,total*2));saveGame();
}
function petCollectionRange(){return Math.max(300,(Number(state?.radarRange)||1500)*.5);}
function petCombatSearchRange(){return playerLaserRange();}
function petTetherRange(){return Math.max(900,(Number(state?.radarRange)||1500)*.82);}
function petWithinPlayerRadar(obj,range=petCollectionRange()){
  return !!obj&&Number.isFinite(obj.x)&&Number.isFinite(obj.y)&&Math.hypot(obj.x-player.x,obj.y-player.y)<=range;
}
function petNearestToPlayer(list,range=petCombatSearchRange()){
  let best=null,bestD=Infinity;
  for(const obj of list){if(!petWithinPlayerRadar(obj,range))continue;const d=Math.hypot(obj.x-player.x,obj.y-player.y);if(d<bestD){best=obj;bestD=d;}}
  return best;
}
function petNearestToPet(list,range=petCollectionRange()){
  let best=null,bestD=Infinity;
  for(const obj of list){if(!petWithinPlayerRadar(obj,range))continue;const d=Math.hypot(obj.x-petRuntime.x,obj.y-petRuntime.y);if(d<bestD){best=obj;bestD=d;}}
  return best;
}
function petLockedCollectionTarget(list,type,validFn=()=>true){
  if(petRuntime.taskType===type&&petRuntime.taskId){
    const locked=list.find(obj=>obj.id===petRuntime.taskId);
    if(locked&&validFn(locked)&&petWithinPlayerRadar(locked))return locked;
  }
  const next=petNearestToPet(list.filter(validFn));
  petRuntime.taskId=next?.id||null;
  return next;
}
function petNearestEnemy(){
  if(isSafeZone())return null;
  return petNearestToPlayer(state.enemies.filter(e=>e.hp>0),petCombatSearchRange());
}
function petStableEnemyTarget(type='autoCombat'){
  if(isSafeZone())return null;
  if(petRuntime.taskType===type&&petRuntime.taskId){
    const locked=state.enemies.find(e=>e.id===petRuntime.taskId&&e.hp>0&&petWithinPlayerRadar(e,petCombatSearchRange()));
    if(locked)return locked;
  }
  const next=petNearestEnemy();petRuntime.taskId=next?.id||null;return next;
}
function petPlayerCombatTarget(){
  const t=state.target;
  if(isSafeZone()||!player.laserFiring||!t||t.hp<=0)return null;
  const inShipRange=Math.hypot(t.x-player.x,t.y-player.y)<=petCombatSearchRange();
  if(t.isPlayer){
    if(!pvpTargetAllowed(t)||!inShipRange)return null;
    return t;
  }
  return inShipRange?t:null;
}
function petChooseRoamPoint(force=false){
  const now=nowSec();
  // Mantém o mesmo waypoint por alguns segundos. Chegar ao ponto não dispara outra escolha imediata.
  if(!force&&petRuntime.roamX!=null&&petRuntime.roamY!=null&&now<petRuntime.nextRoamAt)return;
  const angle=rand(0,TWO_PI),radius=rand(90,Math.min(250,petCollectionRange()*.20));
  petRuntime.roamX=Math.max(45,Math.min(state.currentMap.world.w-45,player.x+Math.cos(angle)*radius));
  petRuntime.roamY=Math.max(45,Math.min(state.currentMap.world.h-45,player.y+Math.sin(angle)*radius));
  petRuntime.nextRoamAt=now+rand(7,12);
}
function petMovementSpeed(taskType){
  const base=Math.max(220,Number(player.speed)||320);
  if(taskType==='roam')return Math.max(165,Math.min(250,base*.56));
  if(taskType==='box'||taskType==='ore')return Math.max(230,Math.min(340,base*.74));
  if(taskType==='escort')return Math.max(235,Math.min(360,base*.78));
  if(taskType==='repair')return Math.max(215,Math.min(315,base*.68));
  return Math.max(260,Math.min(390,base*.84));
}
function petMoveGoalNearCombatTarget(task){
  const a=Math.atan2(petRuntime.y-task.y,petRuntime.x-task.x)||0;
  const stand=110;
  return {x:task.x+Math.cos(a)*stand,y:task.y+Math.sin(a)*stand};
}
function petFireAt(task){
  if(!task||task.hp<=0)return;
  const pd=Math.hypot(task.x-petRuntime.x,task.y-petRuntime.y),lasers=petLaserIds();
  if(pd>420||!lasers.length||nowSec()-petRuntime.lastShot<=.58)return;
  let ammo=currentLaserAmmo(),stock=ammoQty(ammo.id);
  if(stock<=0){ammo=recoverActiveLaser(ammo.id,true);stock=ammo?ammoQty(ammo.id):0;}
  if(!ammo||stock<=0)return;
  const firing=Math.min(lasers.length,stock),ids=lasers.slice(0,firing);
  petRuntime.lastShot=nowSec();petRuntime.laserTargetId=task.id;petRuntime.laserUntil=nowSec()+.16;
  if(task.isPlayer){
    if(state.pvpShotPending)return;
    const shotAmmo=ammo,base=ids.reduce((sum,id)=>sum+(Number(ITEMS[id]?.damage)||0),0),raw=Math.round(base*(Number(shotAmmo.mult)||1)*rand(.95,1.08));
    queuePvpShot(task,shotAmmo.shieldDrain?Math.round(base*(Number(shotAmmo.mult)||2)):raw,!!shotAmmo.shieldDrain,shotAmmo.color).then(row=>{
      if(!row)return;
      progress.ammo[shotAmmo.id]=Math.max(0,(progress.ammo[shotAmmo.id]||0)-firing);
      refreshAmmoCounters();saveGame();
      if(progress.ammo[shotAmmo.id]<=0)recoverActiveLaser(shotAmmo.id,true);
    });
    return;
  }
  const rawBase=Math.round(laserPveBase(ids)*rand(.95,1.08));
  progress.ammo[ammo.id]=Math.max(0,stock-firing);
  if(rawBase>0)applyLaserAmmoHit(task,rawBase,ammo,ammo.color);
  refreshAmmoCounters();
  if(progress.ammo[ammo.id]<=0)recoverActiveLaser(ammo.id,true);
}
function updatePet(dt){
  if(!progress?.pet?.owned)return;
  const pet=progress.pet,mode=pet.activeGear||'off',now=nowSec();
  const playerMoving=Math.hypot(player.tx-player.x,player.ty-player.y)>24;
  let targetX=player.x,targetY=player.y,task=null,combatTask=null;

  // Cada módulo executa somente sua função principal.
  if(mode==='guard'&&pet.gearsOwned.guard){
    task=petPlayerCombatTarget()||petStableEnemyTarget('guard');
    if(task){combatTask=task;petRuntime.taskType='guard';petRuntime.taskId=task.id;const goal=petMoveGoalNearCombatTarget(task);targetX=goal.x;targetY=goal.y;}
  }else if(mode==='box'&&pet.gearsOwned.box){
    task=petLockedCollectionTarget(state.loot,'box',l=>!Number.isFinite(l.expiresAt)||now<l.expiresAt);
    if(task){targetX=task.x;targetY=task.y;petRuntime.taskType='box';petRuntime.taskId=task.id;}
  }else if(mode==='ore'&&pet.gearsOwned.ore&&cargoFree()>0){
    task=petLockedCollectionTarget(state.ores,'ore');
    if(task){targetX=task.x;targetY=task.y;petRuntime.taskType='ore';petRuntime.taskId=task.id;}
  }else if(mode==='repair'&&pet.gearsOwned.repair){
    petRuntime.taskType='repair';petRuntime.taskId=null;targetX=player.x+72;targetY=player.y-78;
    if(player.hp<player.maxHp)player.hp=Math.min(player.maxHp,player.hp+player.maxHp*(0.012+pet.level*0.0008)*dt*(premiumActive()?2:1));
  }else if(mode==='kami'&&pet.gearsOwned.kami&&petRuntime.kamiArmed){
    task=petStableEnemyTarget('kami');
    if(task){targetX=task.x;targetY=task.y;petRuntime.taskType='kami';petRuntime.taskId=task.id;}
  }

  // Sem alvo da função ativa: apenas acompanha/patrulha. Nunca muda de função sozinho.
  if(!task&&mode!=='repair'){
    if(playerMoving){const back=(player.angle||0)+Math.PI,side=Math.sin(now*.85)*55;targetX=player.x+Math.cos(back)*145+Math.cos(back+Math.PI/2)*side;targetY=player.y+Math.sin(back)*145+Math.sin(back+Math.PI/2)*side;petRuntime.taskType='escort';petRuntime.taskId=null;}
    else{petChooseRoamPoint(mode!==petRuntime.lastMode);targetX=petRuntime.roamX;targetY=petRuntime.roamY;petRuntime.taskType='roam';petRuntime.taskId=null;}
  }
  petRuntime.lastMode=mode;

  const dx=targetX-petRuntime.x,dy=targetY-petRuntime.y,d=Math.hypot(dx,dy);
  let petSpeed=petMovementSpeed(petRuntime.taskType),distanceFromPlayer=Math.hypot(petRuntime.x-player.x,petRuntime.y-player.y);
  if(playerMoving&&distanceFromPlayer>petCollectionRange()*.72)petSpeed=Math.max(petSpeed,Math.min(430,player.speed*.94));
  const arrival=d<150?Math.max(.26,d/150):1;
  if(d>5){const step=Math.min(d,petSpeed*arrival*dt);petRuntime.angle=Math.atan2(dy,dx);petRuntime.x+=dx/d*step;petRuntime.y+=dy/d*step;}
  if(distanceFromPlayer>petTetherRange()*1.25){const back=(player.angle||0)+Math.PI;petRuntime.x=player.x+Math.cos(back)*130;petRuntime.y=player.y+Math.sin(back)*130;petRuntime.taskId=null;petChooseRoamPoint(true);}

  if(mode==='guard'&&combatTask&&combatTask.hp>0)petFireAt(combatTask);

  if(mode==='kami'&&petRuntime.kamiArmed&&task&&!task.isPlayer&&task.hp>0&&Math.hypot(task.x-petRuntime.x,task.y-petRuntime.y)<70&&petKamikazeCooldownRemaining()<=0){
    petRuntime.kamiArmed=false;petRuntime.lastKami=now;progress.pet.kamikazeReadyAt=Date.now()+PET_KAMIKAZE_COOLDOWN*1000;
    const activationId=petRuntime.kamiActivationId,boomDmg=Math.round((3500+pet.level*650+petDamage()*2.5)*(1+pilotKamikazeDamageBonus())),boomRadius=110*(1+pilotKamikazeRadiusBonus());
    const victims=state.enemies.filter(e=>e.hp>0&&Math.hypot(e.x-petRuntime.x,e.y-petRuntime.y)<boomRadius);spawnParticle(petRuntime.x,petRuntime.y,'KAMIKAZE','#ff7d8f');playSfx('explode',1.2);victims.forEach(e=>dealDamageToEnemy(e,boomDmg,'#ff7d8f'));
    if(activationId===petRuntime.kamiActivationId){progress.pet.activeGear='off';petRuntime.taskId=null;petRuntime.taskType='follow';saveGame();refreshPetViews();showToast(`Nova Burst concluído • ${PET_KAMIKAZE_COOLDOWN}s de recarga`);}
  }
  if(mode==='box'&&task&&Math.hypot(task.x-petRuntime.x,task.y-petRuntime.y)<28){if(!Number.isFinite(task.expiresAt)||now<task.expiresAt)sellPetCargoBox(task);state.loot=state.loot.filter(x=>x.id!==task.id);petRuntime.taskId=null;playSfx('pickup');}
  if(mode==='ore'&&task&&Math.hypot(task.x-petRuntime.x,task.y-petRuntime.y)<24){const got=addCargoResource(task.type,task.amount);if(got>0){spawnParticle(task.x,task.y,`AUX-9 +${got} ${task.type}`,task.color);pushActivity(`AUX-9 coletou +${fmt(got)} ${task.type} • ${fmt((RESOURCES[task.type]?.sell||0)*got)} CR na base`,'ore');missionEvent('collectOre',{amount:got,type:task.type,mapId:progress.mapId});addPetXp(3);state.ores=state.ores.filter(x=>x.id!==task.id);state.oreRespawns.push({type:task.type,at:nowSec()+rand(5,12)});saveGame();playSfx('pickup');}petRuntime.taskId=null;}
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
  progress=freshSave(factionId);refreshPremiumState(true).catch(()=>{});state.currentMap=MAPS.x1;player.hp=SHIPS.phoenix.hp;player.shield=1000;computeStats(false);setMap('x1',false);ui.factionModal.classList.add('hidden');buildAmmoButtons();renderAll();saveGame();flushCloudSave(true);showToast(`Bem-vindo à ${FACTIONS[factionId].name}`);
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
function spawnParticle(x,y,text,color){const cap=qualityProfile().particles;if(cap<=0)return;if(state.particles.length>=cap)state.particles.splice(0,state.particles.length-cap+1);state.particles.push({x,y,text,color,life:1,vy:rand(20,32)});}
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
    if(mapKey==='x1'){
      const b=currentBasePoint();
      if(Math.hypot(x-b.x,y-b.y)<SAFE_ZONE.radius+700){
        const dir=b.x<w/2?1:-1;
        x=Math.max(500,Math.min(w-500,b.x+dir*(SAFE_ZONE.radius+900+i*170)));
      }
    }
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
  const battle=state.currentMap?.battle;return {id:`${type}_${Math.random().toString(16).slice(2,9)}`,type,name:base.name,x:pos.x,y:pos.y,hp:base.hp,maxHp:base.hp,shield:base.shield,maxShield:base.shield,credits:base.credits,uridium:base.uridium,xp:base.xp,speed:base.speed,baseSpeed:base.speed,damage:base.damage,baseDamage:base.damage,bossPhase:0,bossAttackScale:1,jammedUntil:0,color:base.color,size:base.size,resources:{...(base.resources||{})},attackRange:Math.min(battle?500:420,(battle?210:170)+base.size*5.8),aggroRange:battle?920:720,lastShot:0,angle:rand(0,TWO_PI),drift:rand(.4,1.4)};
}
function spawnEnemies(){state.enemies=[];state.enemyRespawns=[];const mult=Math.max(1,Number(state.currentMap.enemyMultiplier)||1);for(const group of state.currentMap.enemyGroups){const count=Math.max(1,Math.round(group.count*mult));for(let i=0;i<count;i++)state.enemies.push(makeEnemy(group.type));}}
function scheduleEnemyRespawn(type){state.enemyRespawns.push({type,at:nowSec()+rand(6,13)});}
function makeGateEnemy(type,index=0,total=1){
  const e=makeEnemy(type);
  const gateWorld=state.currentMap?.world||MAPS[galaxyGateDef().mapId].world;const center={x:player.x||gateWorld.w/2,y:player.y||gateWorld.h/2};
  const radar=Math.max(1200,state.radarRange||mapRadarRange());
  const ring=radar*rand(.82,.96);
  const baseAngle=(index/Math.max(1,total))*TWO_PI;
  let a=baseAngle+rand(-.16,.16),x=center.x+Math.cos(a)*ring,y=center.y+Math.sin(a)*ring;
  // Tenta preservar o nascimento no anel do radar sem grudar na borda do mapa.
  for(let tries=0;tries<10&&(x<180||x>gateWorld.w-180||y<180||y>gateWorld.h-180);tries++){
    a=baseAngle+rand(-.55,.55);
    x=center.x+Math.cos(a)*ring;y=center.y+Math.sin(a)*ring;
  }
  e.x=Math.max(180,Math.min(gateWorld.w-180,x));
  e.y=Math.max(180,Math.min(gateWorld.h-180,y));
  e.gateEnemy=true;
  e.forceChase=true;
  e.aggroRange=Number.POSITIVE_INFINITY;
  e.attackRange=Math.min(620,e.attackRange+80);
  const gd=galaxyGateDef();if(gd.enemyScale!==1){e.hp=e.maxHp=Math.round(e.maxHp*gd.enemyScale);e.shield=e.maxShield=Math.round(e.maxShield*gd.enemyScale);e.damage=e.baseDamage=Math.round(e.damage*gd.enemyScale);e.credits=Math.round(e.credits*gd.rewardScale);e.uridium=Math.round(e.uridium*gd.rewardScale);e.xp=Math.round(e.xp*gd.rewardScale);}
  return e;
}
function countAliveGateByType(){
  const out={};for(const e of state.enemies)if(e.hp>0&&e.gateEnemy)out[e.type]=(out[e.type]||0)+1;return out;
}
function syncAlphaGateSnapshot(){
  if(!isGalaxyGateMap()||!alphaGate()?.run)return;
  const run=alphaGate().run;
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
  const def=galaxyGateDef().rounds[a.run.round-1];if(!def||a.run.waveIndex>=def.waves.length)return;
  const wave=def.waves[a.run.waveIndex];
  const existing=alphaRemainingCount();
  for(let i=0;i<wave.count;i++)state.enemies.push(makeGateEnemy(wave.type,existing+i,existing+wave.count));
  a.run.waveIndex++;
  a.run.nextRoundAt=0;
  a.run.nextWaveAt=a.run.waveIndex<def.waves.length?Date.now()+GALAXY_ALPHA_WAVE_INTERVAL_MS:0;
  syncAlphaGateSnapshot();saveGame();
  showToast(`${galaxyGateDef().label} • Round ${a.run.round} • Onda ${a.run.waveIndex}/${def.waves.length}: ${wave.count} ${NPC_TYPES[wave.type].name}`);
  renderGateHud();renderGalaxyGate();
}
function initAlphaRun(){
  const a=alphaGate();
  a.run={active:true,round:1,waveIndex:0,remaining:{},nextWaveAt:0,nextRoundAt:0,killRewards:{credits:0,uridium:0,xp:0},startedAt:Date.now()};
  a.lives=3;
}
function setupAlphaMap(resume=false){
  if(progress?.pet?.activeGear==='kami')progress.pet.activeGear='off';
  cancelPetKamikazeCharge();
  const a=alphaGate();if(!a.run?.active)initAlphaRun();
  const gd=galaxyGateDef();progress.mapId=gd.mapId;state.currentMap=MAPS[gd.mapId];state.radarRange=mapRadarRange();computeStats(true);
  player.x=state.currentMap.world.w/2;player.y=state.currentMap.world.h/2;player.tx=player.x;player.ty=player.y;
  petRuntime.x=player.x+82;petRuntime.y=player.y+64;petRuntime.tx=petRuntime.x;petRuntime.ty=petRuntime.y;petRuntime.roamX=null;petRuntime.roamY=null;petRuntime.nextRoamAt=0;
  state.camera.x=player.x;state.camera.y=player.y;state.target=null;state.loot=[];state.ores=[];state.landmarks=[];state.fx=[];state.rocketFx=[];state.enemyRespawns=[];state.oreRespawns=[];
  if(resume&&Object.values(a.run.remaining||{}).some(v=>Number(v)>0))restoreAlphaGateEnemies();else state.enemies=[];

  const def=galaxyGateDef().rounds[a.run.round-1];
  const alive=alphaRemainingCount();
  const now=Date.now();

  // Entrada nova: o primeiro grupo nasce após 10 segundos.
  if(a.run.waveIndex===0&&alive===0){
    a.run.nextRoundAt=0;
    a.run.nextWaveAt=now+GALAXY_ALPHA_WAVE_INTERVAL_MS;
    showToast(`${galaxyGateDef().label} • Round ${a.run.round} começa em 10 segundos`);
  }
  // Save antigo / retorno após morte no meio de um round: garante que o relógio recomece.
  else if(a.run.waveIndex<def.waves.length&&!a.run.nextWaveAt){
    a.run.nextRoundAt=0;
    a.run.nextWaveAt=now+GALAXY_ALPHA_WAVE_INTERVAL_MS;
  }
  // Todas as ondas já nasceram e não há mais NPC: prepara o próximo round.
  else if(a.run.waveIndex>=def.waves.length&&alive===0&&a.run.round<galaxyGateDef().rounds.length&&!a.run.nextRoundAt){
    a.run.nextWaveAt=0;
    a.run.nextRoundAt=now+GALAXY_ALPHA_ROUND_INTERVAL_MS;
  }

  saveGame();renderAll();layoutHudPanels();renderGateHud();
}
function enterAlphaGate(){
  const a=alphaGate();
  const gd=galaxyGateDef();if(!gateUnlocked(gd.key)){showToast(`${gd.label} bloqueado • conclua ${GALAXY_GATE_DEFS[gd.unlock].label} primeiro`);return;}if(!a.built&&!a.run){showToast(`Monte as ${gd.pieces} peças do ${gd.label} primeiro`);return;}
  if(!isAtTrader()){showToast(`O Portal Astral ${gd.label} só pode ser acessado pela base X-1`);return;}
  if(a.lives<=0){showToast(`O portal ${gd.label} foi perdido`);return;}
  if(!a.run)initAlphaRun();
  ui.gateModal?.classList.add('hidden');
  state.jumping=true;player.laserFiring=false;ui.jumpTitle.textContent=`X-1 → ${galaxyGateDef().label}`;ui.jumpSubtitle.textContent='PORTAL ASTRAL';ui.jumpTransition.classList.remove('hidden');
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
  const a=alphaGate(),gd=galaxyGateDef(),earned=alphaRunReward(),extra=Math.max(0,gd.totalRewardMult-1),bonus={credits:earned.credits*extra,uridium:earned.uridium*extra,xp:earned.xp*extra};
  progress.profile.credits+=bonus.credits;progress.profile.uridium+=bonus.uridium;progress.profile.xp+=bonus.xp;processPlayerLevelUps();normalizePilotBio();progress.pilotBio.logDisks+=gd.logReward;progress.profile.ggCompleted=(progress.profile.ggCompleted||0)+1;a.completed++;a.lastCompletion={at:Date.now(),reward:{...earned,bonus},totalMult:gd.totalRewardMult};a.pieces=[];a.built=false;a.lives=3;a.run=null;
  showToast(`${gd.label} CONCLUÍDO! +${fmt(gd.logReward)} Núcleos Quânticos • recompensa ${gd.totalRewardMult}X`,'reward');pushActivity(`PORTAL ASTRAL ${gd.label} • ${gd.totalRewardMult}X • +${fmt(gd.logReward)} Núcleos Quânticos`,'reward');saveGame();
  setTimeout(()=>runMapTransition('x1',null,`${gd.label} CONCLUÍDO • RECOMPENSA ${gd.totalRewardMult}X`),1800);
}
function failAlphaGate(){const a=alphaGate(),gd=galaxyGateDef();a.failed++;a.pieces=[];a.built=false;a.lives=3;a.run=null;showToast(`PORTAL ASTRAL ${gd.label} PERDIDO — as 3 vidas acabaram e o portal precisa ser remontado`);saveGame();setTimeout(()=>runMapTransition('x1',null,`${gd.label} PERDIDO`),900);}
function handleAlphaDeath(){const a=alphaGate(),gd=galaxyGateDef();syncAlphaGateSnapshot();a.lives=Math.max(0,a.lives-1);if(a.lives<=0){failAlphaGate();return;}a.run.active=true;progress.mapId='x1';progress.territoryFaction=progress.profile.faction;const b=basePointForFaction(progress.profile.faction);player.x=b.x;player.y=b.y;player.tx=b.x;player.ty=b.y;progress.x=b.x;progress.y=b.y;progress.hp=1;player.hp=1;player.shield=0;progress.shield=0;state.currentMap=MAPS.x1;state.radarRange=mapRadarRange();state.enemies=[];state.loot=[];state.ores=[];state.landmarks=[];state.target=null;state.repairRequired={shipId:progress.activeShipId,source:`Portal Astral ${gd.label}`};saveGame();openRepairModal();showToast(`${gd.label}: você perdeu 1 vida • ${a.lives} restante(s) • repare a nave para retornar`);}
function updateAlphaGate(){
  if(!isGalaxyGateMap())return;
  const a=alphaGate(),run=a.run;if(!run?.active)return;
  const gd=galaxyGateDef(),def=gd.rounds[run.round-1];if(!def)return;
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
    if(run.round>=gd.rounds.length){completeAlphaGate();return;}
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
      showToast(`${gd.label} • Round ${run.round} começa em 10 segundos`);
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

function graphNode(label){return MAP_GRAPH_NODES.find(n=>n.id===label)||null;}
function graphNeighbors(label){
  const out=[];
  for(const [a,b] of MAP_GRAPH_LINKS){
    if(a===label)out.push(b);
    else if(b===label)out.push(a);
  }
  return out;
}
function portalEdgePoint(fromLabel,toLabel,map){
  const a=graphNode(fromLabel),b=graphNode(toLabel);
  const w=map.world.w,h=map.world.h,inset=175,cx=w/2,cy=h/2;
  if(!a||!b)return {x:cx,y:cy};

  // direção visual do grafo convertida para proporção real do mapa
  const vx=((b.x-a.x)/100)*w;
  const vy=((b.y-a.y)/100)*h;
  const ax=Math.abs(vx),ay=Math.abs(vy);
  const tx=ax>0?(cx-inset)/ax:Infinity;
  const ty=ay>0?(cy-inset)/ay:Infinity;
  const t=Math.max(0,Math.min(tx,ty));

  return {
    x:Math.round(Math.max(inset,Math.min(w-inset,cx+vx*t))),
    y:Math.round(Math.max(inset,Math.min(h-inset,cy+vy*t)))
  };
}
function portalsForGraphLabel(label){
  const origin=graphDestination(label);
  if(!origin)return [];
  const map=MAPS[origin.mapId];
  return graphNeighbors(label).map(targetLabel=>{
    const dest=graphDestination(targetLabel),pos=portalEdgePoint(label,targetLabel,map);
    return {
      x:pos.x,y:pos.y,
      to:dest.mapId,
      targetLabel,
      targetTerritoryFaction:dest.territoryFaction,
      battle:!!dest.battle
    };
  });
}
function resolvedPortals(map=state.currentMap,label=null){
  const mapLabel=label||(map===state.currentMap?currentGraphMapLabel():null);
  if(mapLabel)return portalsForGraphLabel(mapLabel);
  return [];
}
function findReturnPortal(targetLabel,fromLabel){
  if(!targetLabel||!fromLabel)return null;
  return portalsForGraphLabel(targetLabel).find(p=>p.targetLabel===fromLabel)||null;
}
function setMap(mapId,preserve=false,fromMapId=null,targetTerritoryFaction=null,fromGraphLabel=null){
  if(!MAPS[mapId])return;if(gateKeyForMap(mapId)){progress.galaxyGate.selected=gateKeyForMap(mapId);setupAlphaMap(true);return;}
  if(progress?.pet?.activeGear==='kami')progress.pet.activeGear='off';
  cancelPetKamikazeCharge();

  const previousWasTerritory=['x1','x2','x3','x4'].includes(progress.mapId);
  progress.mapId=mapId;
  if(['x1','x2','x3','x4'].includes(mapId)){
    progress.territoryFaction=targetTerritoryFaction||(previousWasTerritory?progress.territoryFaction:null)||progress.profile.faction;
  }else progress.territoryFaction=null;

  state.currentMap=MAPS[mapId];state.radarRange=mapRadarRange();computeStats(true);

  if(!preserve){
    const targetLabel=displayMapLabel(mapId,currentTerritoryFaction());
    const returnPortal=fromGraphLabel?findReturnPortal(targetLabel,fromGraphLabel):null;
    const base=currentBasePoint();

    player.x=returnPortal?returnPortal.x:(mapId==='x1'?base.x:400);
    player.y=returnPortal?returnPortal.y:(mapId==='x1'?base.y:state.currentMap.world.h/2);

    // Nasce alguns pixels para dentro do mapa, evitando reativar instantaneamente o portal.
    if(returnPortal){
      const cx=state.currentMap.world.w/2,cy=state.currentMap.world.h/2;
      const dx=cx-player.x,dy=cy-player.y,d=Math.hypot(dx,dy)||1;
      player.x+=dx/d*95;player.y+=dy/d*95;
    }
    player.tx=player.x;player.ty=player.y;
  }

  petRuntime.x=player.x+82;petRuntime.y=player.y+64;petRuntime.tx=petRuntime.x;petRuntime.ty=petRuntime.y;petRuntime.roamX=null;petRuntime.roamY=null;petRuntime.nextRoamAt=0;
  state.camera.x=player.x;state.camera.y=player.y;state.target=null;state.loot=[];state.fx=[];state.rocketFx=[];
  clearOnlinePlayers();createLandmarks();createOres();spawnEnemies();saveGame();
  if(authenticated)flushCloudSave(true).catch(()=>{});

  const owner=territoryOwner(),home=isOwnTerritory();
  showToast(mapId==='x1'?(home?`Base ${owner?.short||''} • Zona Segura`:`INVASÃO • Base ${owner?.short||''}`):`Entrando em ${displayMapLabel(mapId,currentTerritoryFaction())}`);
  renderMapModal();syncOnlineWorld();
}
function runMapTransition(targetMapId,fromMapId=null,mode='PORTAL QUÂNTICO',targetTerritoryFaction=null,fromGraphLabel=null){
  if(state.jumping||!MAPS[targetMapId])return;
  state.jumping=true;player.laserFiring=false;ui.portalPrompt?.classList.add('hidden');

  const sourceLabel=fromGraphLabel||currentGraphMapLabel();
  const targetLabel=displayMapLabel(targetMapId,targetTerritoryFaction);
  ui.jumpTitle.textContent=`${sourceLabel} → ${targetLabel}`;
  ui.jumpSubtitle.textContent=mode;
  ui.jumpTransition.classList.remove('hidden');
  requestAnimationFrame(()=>ui.jumpTransition.classList.add('active'));

  setTimeout(()=>setMap(targetMapId,false,fromMapId,targetTerritoryFaction,sourceLabel),430);
  setTimeout(()=>{
    ui.jumpTransition.classList.remove('active');
    setTimeout(()=>ui.jumpTransition.classList.add('hidden'),240);
    state.jumping=false;
  },1050);
}

function currentLaserAmmo(){return LASER_AMMO[progress.selectedLaserAmmo]||LASER_AMMO.lcb10;}
function currentRocket(){return ROCKETS[progress.selectedRocket]||ROCKETS.r310;}
function ammoQty(id){return progress.ammo[id]||0;}
function rocketQty(id){return progress.rockets[id]||0;}
function getRocketCooldown(){const base=turboRocketEnabled()?2.5:5;return base*(premiumActive()?.8:1);}
function rocketReady(){return nowSec()-player.lastRocketShot>=getRocketCooldown();}
function enemyDistance(e){return Math.hypot(e.x-player.x,e.y-player.y);}
function nearbyPortal(){return resolvedPortals().find(p=>Math.hypot(p.x-player.x,p.y-player.y)<58)||null;}
function portalAtWorld(x,y){return resolvedPortals().find(p=>Math.hypot(p.x-x,p.y-y)<50)||null;}
function jumpThroughPortal(portal){
  if(!portal||state.jumping||nowSec()-state.lastPortalAt<1.1)return;
  const fromMap=progress.mapId,fromLabel=currentGraphMapLabel();
  state.lastPortalAt=nowSec();
  runMapTransition(portal.to,fromMap,'PORTAL QUÂNTICO',portal.targetTerritoryFaction,fromLabel);
}


function isStarterShip(shipId=progress?.activeShipId){return shipId===STARTER_SHIP_ID;}
function movePlayerToHomeBase(){
  progress.mapId='x1';
  progress.territoryFaction=progress.profile.faction;
  state.currentMap=MAPS.x1;
  state.radarRange=mapRadarRange();
  const b=basePointForFaction(progress.profile.faction);
  player.x=b.x;player.y=b.y;player.tx=b.x;player.ty=b.y;
  state.camera.x=b.x;state.camera.y=b.y;
  state.target=null;player.laserFiring=false;state.fx=[];state.rocketFx=[];
  createLandmarks();createOres();spawnEnemies();
}
function finishShipRepair(method='repair'){
  progress.repairRequired=null;
  computeStats(false);
  player.hp=player.maxHp;
  player.shield=player.maxShield;
  progress.hp=player.hp;
  progress.shield=player.shield;
  state.lastPlayerDamageAt=nowSec();
  ui.repairModal?.classList.add('hidden');
  saveGame();renderGalaxyGate();renderAll();updateUI();
  const labels={bonus:'1 Bônus de Reparo consumido',uridium:`${fmt(SHIP_REPAIR_URI_COST)} STL consumidos`,free:'Aurora reparada gratuitamente',phoenix:'Aurora ativada • reparo gratuito',premium:'PREMIUM • nave reparada gratuitamente'};
  showToast(labels[method]||'Nave reparada','system');
}
function resolveDeathRepair({allowAuto=true}={}){
  normalizeGalaxyGateState();
  if(isStarterShip()){
    finishShipRepair('free');
    return true;
  }
  if(premiumActive()){
    finishShipRepair('premium');
    return true;
  }
  if(allowAuto&&progress.galaxyGate.repairBonus>0){
    progress.galaxyGate.repairBonus--;
    finishShipRepair('bonus');
    return true;
  }
  if(allowAuto&&progress.profile.uridium>=SHIP_REPAIR_URI_COST){
    progress.profile.uridium-=SHIP_REPAIR_URI_COST;
    finishShipRepair('uridium');
    return true;
  }
  progress.repairRequired={shipId:progress.activeShipId,cost:SHIP_REPAIR_URI_COST,at:Date.now()};
  player.hp=1;player.shield=0;progress.hp=1;progress.shield=0;
  saveGame();openRepairModal();
  return false;
}
function openRepairModal(){
  if(!progress?.repairRequired||!ui.repairModal)return;
  normalizeGalaxyGateState();
  const ship=SHIPS[progress.repairRequired.shipId]||SHIPS[progress.activeShipId];
  ui.repairShipName.textContent=ship?.name||'Nave';
  ui.repairBonusCount.textContent=fmt(progress.galaxyGate.repairBonus);
  ui.repairUriCount.textContent=fmt(progress.profile.uridium);
  ui.repairModalText.textContent=`${ship?.name||'Sua nave'} foi destruída. Repare para voltar ao combate.`;
  ui.repairUseBonus.disabled=progress.galaxyGate.repairBonus<=0;
  ui.repairUseUri.disabled=progress.profile.uridium<SHIP_REPAIR_URI_COST;
  ui.repairUseAurora.disabled=!progress.ownedShips.includes(STARTER_SHIP_ID)||progress.activeShipId===STARTER_SHIP_ID;
  ui.repairModal.classList.remove('hidden');
}
function repairDestroyedWithBonus(){
  if(!progress?.repairRequired)return;
  normalizeGalaxyGateState();
  if(progress.galaxyGate.repairBonus<=0){showToast('Sem Bônus de Reparo');openRepairModal();return;}
  progress.galaxyGate.repairBonus--;
  finishShipRepair('bonus');
}
function repairDestroyedWithUri(){
  if(!progress?.repairRequired)return;
  if(progress.profile.uridium<SHIP_REPAIR_URI_COST){showToast(`Faltam ${fmt(SHIP_REPAIR_URI_COST-progress.profile.uridium)} STL`);openRepairModal();return;}
  progress.profile.uridium-=SHIP_REPAIR_URI_COST;
  finishShipRepair('uridium');
}
function recoverWithAurora(){
  if(!progress?.repairRequired)return;
  if(!progress.ownedShips.includes(STARTER_SHIP_ID)){showToast('Aurora não disponível');return;}
  returnShipEquipmentToInventory();
  progress.activeShipId=STARTER_SHIP_ID;
  progress.shipLoadout=blankLoadout(STARTER_SHIP_ID);
  progress.repairRequired=null;
  computeStats(false);
  player.hp=player.maxHp;player.shield=player.maxShield;progress.hp=player.hp;progress.shield=player.shield;
  ui.repairModal?.classList.add('hidden');
  saveGame();renderAll();buildAmmoButtons();showToast('Aurora ativada • reparo gratuito','system');
}
function handleNormalShipDeath(){
  // A nova taxa de reparo substitui a antiga perda automática de 5% dos Créditos.
  movePlayerToHomeBase();
  resolveDeathRepair({allowAuto:true});
}
function rewardEnemyKill(enemy){
  const creditMult=1+pilotSkillValue('greed')/100,uriMult=1+pilotCombined('cruelty1','cruelty2')/100,xpMult=1+pilotSkillValue('tactics')/100;
  const earnedCredits=Math.round(enemy.credits*creditMult),earnedUri=Math.round(enemy.uridium*uriMult),earnedXp=Math.round((Number(enemy.xp)||enemy.credits/10+enemy.uridium*12)*xpMult);
  progress.profile.credits+=earnedCredits;progress.profile.uridium+=earnedUri;progress.profile.xp+=earnedXp;progress.profile.aliensKilled=(progress.profile.aliensKilled||0)+1;
  if(authenticated){const boss=/^boss/i.test(String(enemy.type||''));const clanType=String(enemy.type||'').replace(/^boss/i,'').toLowerCase();recordClanAlienKillOnline({npcType:clanType,isBoss:boss}).then(r=>{if(r?.status?.leveled_up){showToast(`CLÃ SUBIU PARA O LV ${r.status.new_level}!`,'reward');refreshClanState(true);}}).catch(()=>{});}
  pushActivity(`${enemy.name} • +${fmt(earnedCredits)} CR • +${fmt(earnedUri)} STL • +${fmt(earnedXp)} XP`,'combat');
  if(String(enemy.type||'').startsWith('boss')){rollRareBossLoot(enemy);scoreClanWar(10,'boss_kill');}
  addPetXp(Math.max(12,Math.round(enemy.credits/120+enemy.uridium*4)));
  processPlayerLevelUps();
  const lootMult=1+pilotLootBonus(),boostedResources=Object.fromEntries(Object.entries(enemy.resources||{}).map(([id,q])=>[id,Math.max(1,Math.round(q*lootMult))]));
  state.loot.push({
    id:`box_${Math.random().toString(16).slice(2)}`,
    x:enemy.x,y:enemy.y,
    resources:boostedResources,
    source:enemy.name,
    spawnedAt:nowSec(),
    expiresAt:nowSec()+CARGO_BOX_LIFETIME_SEC
  });
  missionEvent('kill',{enemy,mapId:progress.mapId});battlePassEvent('kill',1);
  if(isGalaxyGateMap()&&enemy.gateEnemy){recordAlphaKillReward(enemy);syncAlphaGateSnapshot();}else scheduleEnemyRespawn(enemy.type);
  saveGame();
}
function dealDamageToEnemy(enemy,damage,color){
  const before=Math.max(0,Number(enemy.shield)||0)+Math.max(0,Number(enemy.hp)||0);
  let remain=damage;const hadShield=enemy.shield>0;if(enemy.shield>0){const a=Math.min(enemy.shield,remain);enemy.shield-=a;remain-=a;}if(remain>0)enemy.hp-=remain;
  const after=Math.max(0,Number(enemy.shield)||0)+Math.max(0,Number(enemy.hp)||0),actual=Math.max(0,Math.round(before-after));
  if(actual>0){battlePassEvent('damage',actual);battlePassEvent('attack',1);}
  spawnParticle(enemy.x,enemy.y-enemy.size,fmt(damage),color);playSfx('impact',.65);spawnImpactFx(enemy.x,enemy.y,hadShield?'#55d8ff':color,hadShield?30:22,hadShield?'shield':'impact');
  if(enemy.worldBoss){if(actual>0)warfrontRuntime.pendingBossDamage+=actual;if(enemy.hp<=0)enemy.hp=1;flushWorldBossDamage();return;}
  if(enemy.hp<=0){enemy.hp=0;enemy.deadAt=nowSec();playSfx('explode',enemy.type.startsWith('boss')?1.25:1);spawnExplosionFx(enemy.x,enemy.y,enemy.color,enemy.type.startsWith('boss'));rewardEnemyKill(enemy);if(state.target?.id===enemy.id){state.target=null;player.laserFiring=false;}}
}
function laserPveBase(ids){
  return ids.reduce((sum,id)=>{const it=ITEMS[id];const base=it?.alienDamage??it?.damage??0;return sum+base*(1+(Number(it?.alienBonus)||0));},0);
}
function applyLaserAmmoHit(enemy,baseDamage,ammo,color){
  if(!enemy||enemy.hp<=0||baseDamage<=0)return 0;
  if(ammo?.shieldDrain){
    // SIP-2: não causa dano ao casco. Drena o escudo inimigo em x2 e transfere
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
    if(drained>0){battlePassEvent('damage',drained);battlePassEvent('attack',1);}
    return drained;
  }
  const damage=Math.max(0,Math.round(baseDamage*(Number(ammo?.mult)||1)));
  if(damage>0)dealDamageToEnemy(enemy,damage,color||ammo?.color||'#7edcff');
  return damage;
}
function fireLaserTick(){
  if(!state.target||state.target.hp<=0||enemyDistance(state.target)>playerLaserRange())return;

  let ammo=currentLaserAmmo();
  const laserIds=equippedLaserIds(),totalLasers=laserIds.length;
  if(totalLasers<=0){player.laserFiring=false;showToast('Equipe pelo menos um laser no Hangar');return;}

  let stock=ammoQty(ammo.id);
  if(stock<=0){
    ammo=recoverActiveLaser(ammo.id,true);
    if(!ammo){player.laserFiring=false;showToast('Sem munição laser disponível');return;}
    stock=ammoQty(ammo.id);
  }
  if(nowSec()-player.lastLaserShot<.42)return;

  const firingCount=Math.min(totalLasers,stock),firingIds=laserIds.slice(0,firingCount);

  if(state.target.isPlayer){
    if(!pvpTargetAllowed(state.target)){player.laserFiring=false;showToast('Fogo amigo bloqueado');return;}
    if(state.pvpShotPending)return;
    const shotAmmo=ammo,base=pvpLaserBase(firingIds),raw=Math.round(base*(Number(shotAmmo.mult)||1)*rand(.95,1.08));
    player.lastLaserShot=nowSec();playSfx('laser');
    queuePvpShot(state.target,shotAmmo.shieldDrain?Math.round(base*(Number(shotAmmo.mult)||2)):raw,!!shotAmmo.shieldDrain,shotAmmo.color).then(row=>{
      if(!row)return;
      progress.ammo[shotAmmo.id]=Math.max(0,(progress.ammo[shotAmmo.id]||0)-firingCount);
      refreshAmmoCounters();saveGame();
      if(progress.ammo[shotAmmo.id]<=0){
        const replacement=recoverActiveLaser(shotAmmo.id,true);
        if(!replacement){player.laserFiring=false;showToast(`${shortLaserLabel(shotAmmo.id)} acabou • sem munição reserva`);}
      }
    });
    return;
  }

  const allBase=laserPveBase(laserIds),firingBase=laserPveBase(firingIds),fraction=allBase>0?firingBase/allBase:0;
  player.lastLaserShot=nowSec();playSfx('laser');
  progress.ammo[ammo.id]=Math.max(0,stock-firingCount);
  refreshAmmoCounters();

  const rawBase=Math.round((player.laserDamage*fraction)*shipAbilityDamageMultiplier()*rand(.95,1.08));
  const laserHitChance=Math.min(1,.75+pilotSkillValue('electroOptics')/100);
  if(Math.random()<=laserHitChance){
    if(rawBase>0)applyLaserAmmoHit(state.target,rawBase,ammo,ammo.color);
  }else spawnParticle(state.target.x,state.target.y-state.target.size,'MISS','#7acfff');

  if(progress.ammo[ammo.id]<=0){
    const replacement=recoverActiveLaser(ammo.id,true);
    if(!replacement){player.laserFiring=false;showToast(`${shortLaserLabel(ammo.id)} acabou • sem munição reserva`);}
  }
}
function fireRocket(manual=false){
  if(!state.target||state.target.hp<=0){if(manual)showToast('Selecione um alvo');return;}
  if(enemyDistance(state.target)>playerRocketRange()){if(manual)showToast('Alvo fora do alcance');return;}

  let r=currentRocket();
  if(rocketQty(r.id)<=0){
    r=recoverActiveRocket(r.id,true);
    if(!r){if(manual)showToast('Sem mísseis disponíveis');return;}
  }
  if(!rocketReady()){if(manual)showToast('Míssil recarregando');return;}

  if(state.target.isPlayer){
    if(!pvpTargetAllowed(state.target)){if(manual)showToast('Fogo amigo bloqueado');return;}
    if(state.pvpRocketPending)return;

    const shotRocket=r;
    state.pvpRocketPending=true;player.lastRocketShot=nowSec();playSfx('rocket');
    queuePvpAttackOnline({
      targetUserId:state.target.id,
      damage:Math.round(shotRocket.damage*player.rocketMult),
      shieldDrain:false,
      mapId:progress.mapId,
      territoryFaction:onlineTerritoryKey()
    })
      .then(row=>{
        if(!row?.accepted)return;
        progress.rockets[shotRocket.id]=Math.max(0,(progress.rockets[shotRocket.id]||0)-1);
        state.rocketFx.push({
          sx:player.x,sy:player.y,tx:state.target.x,ty:state.target.y,color:shotRocket.color,
          born:nowSec(),duration:Math.max(.18,Math.min(.48,enemyDistance(state.target)/1700)),size:5
        });
        refreshAmmoCounters();saveGame();
        if(progress.rockets[shotRocket.id]<=0)recoverActiveRocket(shotRocket.id,true);
      })
      .catch(e=>showToast(String(e?.message||e).replace(/^.*?:\s*/,'')))
      .finally(()=>{state.pvpRocketPending=false;});
    return;
  }

  const shotRocket=r;
  player.lastRocketShot=nowSec();playSfx('rocket');
  progress.rockets[shotRocket.id]=Math.max(0,(progress.rockets[shotRocket.id]||0)-1);
  state.rocketFx.push({
    sx:player.x,sy:player.y,tx:state.target.x,ty:state.target.y,color:shotRocket.color,
    born:nowSec(),duration:Math.max(.18,Math.min(.48,enemyDistance(state.target)/1700)),size:5
  });

  const rocketHitChance=Math.min(1,.90+pilotSkillValue('heatSeeking')/100);
  if(Math.random()<=rocketHitChance)dealDamageToEnemy(state.target,Math.round(shotRocket.damage*player.rocketMult*shipAbilityDamageMultiplier()),shotRocket.color);
  else spawnParticle(state.target.x,state.target.y-state.target.size,'MÍSSIL ERROU','#ffb36d');

  refreshAmmoCounters();saveGame();
  if(progress.rockets[shotRocket.id]<=0)recoverActiveRocket(shotRocket.id,true);
}
function takePlayerDamage(dmg,opts={}){
  if(isSafeZone()&&!opts.forcePvP)return;
  dmg*=shipAbilityIncomingMultiplier();
  if(pilotEvasion()>0&&Math.random()<pilotEvasion()){spawnParticle(player.x,player.y-35,'EVASÃO','#66d9ff');return;}
  state.lastPlayerDamageAt=nowSec();
  const hadShield=player.shield>0,absorb=Math.max(0,Math.min(100,player.shieldAbsorption))/100;let shieldPart=dmg*absorb;let hullPart=dmg-shieldPart;
  if(player.shield>0){const got=Math.min(player.shield,shieldPart);player.shield-=got;shieldPart-=got;hullPart+=shieldPart;}
  else hullPart+=shieldPart;
  player.hp-=hullPart;playSfx('damage',.75);spawnImpactFx(player.x,player.y,hadShield?'#55d8ff':'#ff6078',hadShield?38:28,hadShield?'shield':'impact');
}
function collectCargoBox(drop){
  const before=cargoFree();let total=0;const picked=[];
  for(const [id,qty] of Object.entries(drop.resources||{})){
    const got=addCargoResource(id,qty);
    if(got>0){drop.resources[id]-=got;if(drop.resources[id]<=0)delete drop.resources[id];total+=got;picked.push(`${fmt(got)} ${id}`);}
  }
  if(total>0){
    battlePassEvent('dropResource',total);
    if(!drop.battlePassBoxCounted){drop.battlePassBoxCounted=true;battlePassEvent('box',1);}
    spawnParticle(drop.x,drop.y,`+${fmt(total)} recursos`,'#ffe57b');
    pushActivity(`BOX ${drop.source||''} • ${picked.join(' • ')}`,'loot');
    saveGame();
  }
  if(total===0&&before<=0)showToast('Porão cheio');
  return Object.keys(drop.resources||{}).length===0;
}

function angleDelta(from,to){return Math.atan2(Math.sin(to-from),Math.cos(to-from));}
function updatePlayer(dt){
  if(progress?.repairRequired){
    const b=basePointForFaction(progress.profile.faction);
    player.x=b.x;player.y=b.y;player.tx=b.x;player.ty=b.y;player.laserFiring=false;
    state.camera.x+=(b.x-state.camera.x)*.12;state.camera.y+=(b.y-state.camera.y)*.12;
    progress.x=player.x;progress.y=player.y;progress.hp=player.hp;progress.shield=player.shield;
    if(ui.repairModal?.classList.contains('hidden'))openRepairModal();
    return;
  }
  const dx=player.tx-player.x,dy=player.ty-player.y,d=Math.hypot(dx,dy);if(d>2){const step=Math.min(d,player.speed*shipAbilitySpeedMultiplier()*dt);player.x+=dx/d*step;player.y+=dy/d*step;}
  let desiredAngle=player.angle||0;
  if(state.target&&state.target.hp>0)desiredAngle=Math.atan2(state.target.y-player.y,state.target.x-player.x);
  else if(d>3)desiredAngle=Math.atan2(dy,dx);
  player.angle=(player.angle||0)+angleDelta(player.angle||0,desiredAngle)*Math.min(1,dt*9);
  player.x=Math.max(35,Math.min(state.currentMap.world.w-35,player.x));player.y=Math.max(35,Math.min(state.currentMap.world.h-35,player.y));state.camera.x+=(player.x-state.camera.x)*.08;state.camera.y+=(player.y-state.camera.y)*.08;
  const baseSafe=isBaseSafeZone();
  const repairBot=activeRepairBot();
  const secondsWithoutDamage=nowSec()-state.lastPlayerDamageAt;
  const repairDelay=5;

  // Reparação em valores FIXOS por pulso de 1 segundo.
  // HP: Base ou Repair Bot Comum = +5.000; Repair Bot Elite = +10.000.
  // ESC: padrão = +10.000; com Repair Bot Elite = +15.000.
  // Fora da base, o pulso só começa após 5s completos sem receber dano.
  const regenReady=baseSafe||secondsWithoutDamage>=repairDelay;
  if(regenReady&&player.shield<player.maxShield&&nowSec()-state.shieldRepairFxAt>=1){
    const shieldTick=(repairBot?.id==='repElite'?15000:10000)*(premiumActive()?2:1);
    const beforeShield=player.shield;
    player.shield=Math.min(player.maxShield,player.shield+shieldTick);
    state.shieldRepairFxAt=nowSec();
    const gained=Math.max(0,Math.round(player.shield-beforeShield));
    if(gained>0)spawnParticle(player.x,player.y,`ESCUDO +${fmt(gained)}`,'#62d9ff');
  }

  const hpCanRepair=baseSafe||!!repairBot;
  const hpDelayReady=baseSafe||secondsWithoutDamage>=Number(repairBot?.repairDelay||5);
  if(hpCanRepair&&hpDelayReady&&player.hp<player.maxHp&&nowSec()-state.repairFxAt>=1){
    const hpTick=(repairBot?.id==='repElite'?10000:5000)*(premiumActive()?2:1);
    const beforeHp=player.hp;
    player.hp=Math.min(player.maxHp,player.hp+hpTick);
    state.repairFxAt=nowSec();
    const gained=Math.max(0,Math.round(player.hp-beforeHp));
    if(gained>0)spawnParticle(player.x,player.y,`${baseSafe?'BASE':'AUTO REPAIR'} +${fmt(gained)} HP`,'#73ffc0');
  }
  maybeAutoBuyAmmo();
  checkLandmarkDiscovery();
  if(player.laserFiring)fireLaserTick();
  if(autoRocketEnabled()&&player.laserFiring&&rocketReady())fireRocket(false);
  for(let i=state.loot.length-1;i>=0;i--){
    const l=state.loot[i];
    if(!Number.isFinite(l.expiresAt))l.expiresAt=nowSec()+CARGO_BOX_LIFETIME_SEC;
    if(nowSec()>=l.expiresAt){state.loot.splice(i,1);continue;}
    if(Math.hypot(l.x-player.x,l.y-player.y)<40){
      const empty=collectCargoBox(l);
      if(empty)state.loot.splice(i,1);
    }
  }
  for(let i=state.ores.length-1;i>=0;i--){const o=state.ores[i];if(Math.hypot(o.x-player.x,o.y-player.y)<30){const got=addCargoResource(o.type,o.amount);if(got>0){spawnParticle(o.x,o.y,`+${got} ${o.type}`,o.color);pushActivity(`Pedra • +${fmt(got)} ${o.type} • ${fmt((RESOURCES[o.type]?.sell||0)*got)} CR na base`,'ore');missionEvent('collectOre',{amount:got,type:o.type,mapId:progress.mapId});state.ores.splice(i,1);state.oreRespawns.push({type:o.type,at:nowSec()+rand(5,12)});saveGame();}else showToast('Porão cheio');}}
  if(player.hp<=0){
    if(isGalaxyGateMap())handleAlphaDeath();
    else handleNormalShipDeath();
  }
  progress.hp=player.hp;progress.shield=player.shield;progress.x=player.x;progress.y=player.y;
}
function updateBossPhase(e){
  if(!e?.type?.startsWith('boss')||e.hp<=0)return;const total=Math.max(1,e.maxHp+e.maxShield),remain=Math.max(0,e.hp)+Math.max(0,e.shield),ratio=remain/total;let next=e.bossPhase||0;if(ratio<=.33)next=2;else if(ratio<=.66)next=Math.max(next,1);if(next===(e.bossPhase||0))return;e.bossPhase=next;
  const mult=next===1?1.16:1.36;e.speed=Math.round((e.baseSpeed||e.speed)*mult);e.damage=Math.round((e.baseDamage||e.damage)*(next===1?1.20:1.48));e.bossAttackScale=next===1?.88:.70;spawnExplosionFx(e.x,e.y,next===1?'#ffb15f':'#ff3763',true);spawnParticle(e.x,e.y-e.size-16,next===1?'BOSS • FASE II':'BOSS • FASE III','#ff718c');
  if(next===2&&Math.hypot(e.x-player.x,e.y-player.y)<420){const pulse=Math.max(1500,Math.round(player.maxHp*.04));takePlayerDamage(pulse);spawnParticle(player.x,player.y-38,`PULSO -${fmt(pulse)}`,'#ff587b');}
  showToast(`${e.name} entrou na ${next===1?'FASE II • FÚRIA':'FASE III • OVERDRIVE'}!`);
}
function updateBossHud(){
  if(!ui.bossPhaseHud)return;const e=state.target&&!state.target.isPlayer&&state.target.type?.startsWith('boss')&&state.target.hp>0?state.target:null;ui.bossPhaseHud.classList.toggle('hidden',!e);if(!e)return;const total=Math.max(1,e.maxHp+e.maxShield),remain=Math.max(0,e.hp)+Math.max(0,e.shield),ratio=Math.max(0,Math.min(1,remain/total));ui.bossPhaseName.textContent=e.name.toUpperCase();ui.bossPhaseLabel.textContent=`FASE ${(e.bossPhase||0)+1}`;ui.bossPhaseFill.style.width=`${Math.round(ratio*100)}%`;ui.bossPhaseStatus.textContent=(e.bossPhase||0)===0?'ESTÁVEL • 66% ativa FÚRIA':(e.bossPhase||0)===1?'FÚRIA • 33% ativa OVERDRIVE':'OVERDRIVE • MÁXIMA AMEAÇA';
}

function updateEnemies(dt){
  const playerSafe=isSafeZone();
  for(const e of state.enemies){
    if(e.hp<=0)continue;updateBossPhase(e);
    const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy);e.angle+=dt*e.drift;
    if(progress.mapId==='x1'&&safeZoneDistance(e.x,e.y)<SAFE_ZONE.radius+35){
      const b=currentBasePoint(),ox=e.x-b.x,oy=e.y-b.y,od=Math.hypot(ox,oy)||1;
      e.x=b.x+ox/od*(SAFE_ZONE.radius+38);e.y=b.y+oy/od*(SAFE_ZONE.radius+38);
    }
    const forceChase=!!e.gateEnemy||!!e.forceChase;
    if(!playerSafe&&(forceChase||d<e.aggroRange)&&d>e.attackRange*.8){
      const nd=Math.max(1,d),nx=e.x+dx/nd*e.speed*dt,ny=e.y+dy/nd*e.speed*dt;
      if(!(progress.mapId==='x1'&&safeZoneDistance(nx,ny)<SAFE_ZONE.radius+25)){e.x=nx;e.y=ny;}
    }else if(!forceChase&&(d>e.aggroRange||playerSafe)){e.x+=Math.cos(e.angle)*e.speed*.16*dt;e.y+=Math.sin(e.angle)*e.speed*.16*dt;}
    e.x=Math.max(25,Math.min(state.currentMap.world.w-25,e.x));e.y=Math.max(25,Math.min(state.currentMap.world.h-25,e.y));
    if(!playerSafe&&nowSec()>=(e.jammedUntil||0)&&d<e.attackRange&&nowSec()-e.lastShot>((e.name.includes('Boss')?1.6:1.15)*(e.bossAttackScale||1))){e.lastShot=nowSec();e.lastAttackPlayerAt=nowSec();takePlayerDamage(e.damage*rand(.92,1.12));spawnParticle(player.x,player.y-28,Math.round(e.damage),'#ff8080');}
  }
}
function updateParticles(dt){for(let i=state.particles.length-1;i>=0;i--){const p=state.particles[i];p.y-=p.vy*dt;p.life-=dt;if(p.life<=0)state.particles.splice(i,1);}}
function updateFx(dt){
  for(let i=state.fx.length-1;i>=0;i--){const f=state.fx[i];f.life-=dt;if(f.vx){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vx*=.985;f.vy*=.985;}if(f.life<=0)state.fx.splice(i,1);}
  const now=nowSec();for(let i=state.rocketFx.length-1;i>=0;i--)if(now-state.rocketFx[i].born>state.rocketFx[i].duration+.12)state.rocketFx.splice(i,1);
}
// ===================== ONLINE MAP PRESENCE =====================
const onlineWorld={players:new Map(),busy:false,lastSyncAt:0,privateRemoved:false};
function clearOnlinePlayers(){if(state.target?.isPlayer){state.target=null;player.laserFiring=false;}onlineWorld.players.clear();}
function shortestAngleDelta(a,b){return Math.atan2(Math.sin(b-a),Math.cos(b-a));}
function onlineTerritoryKey(){
  return ['x1','x2','x3','x4'].includes(progress?.mapId)?(currentTerritoryFaction()||progress.profile.faction):'battle';
}
function onlinePlayerEnemy(rp){return !!rp&&rp.faction&&rp.faction!==progress?.profile?.faction;}
async function syncOnlineWorld(){
  if(!authenticated||!progress||onlineWorld.busy)return;
  onlineWorld.busy=true;
  try{
    if(isGalaxyGateMap()){
      clearOnlinePlayers();
      if(!onlineWorld.privateRemoved){await removePlayerPresenceOnline().catch(()=>{});onlineWorld.privateRemoved=true;}
      onlineWorld.lastSyncAt=Date.now();return;
    }
    onlineWorld.privateRemoved=false;
    const territory=onlineTerritoryKey();
    await upsertPlayerPresenceOnline({
      callsign:progress.profile.callsign,mapId:progress.mapId,territoryFaction:territory,
      x:player.x,y:player.y,angle:player.angle||0,shipId:progress.activeShipId,faction:progress.profile.faction,
      level:progress.profile.level,hp:player.hp,maxHp:player.maxHp,shield:player.shield,maxShield:player.maxShield
    });
    const rows=await loadMapPresenceOnline(progress.mapId,territory),me=getUser()?.id,seen=new Set();
    for(const row of rows){
      if(!row?.user_id||row.user_id===me)continue;seen.add(row.user_id);
      let rp=onlineWorld.players.get(row.user_id);
      if(!rp){rp={id:row.user_id,isPlayer:true,x:Number(row.x)||0,y:Number(row.y)||0,tx:Number(row.x)||0,ty:Number(row.y)||0,angle:Number(row.angle)||0,targetAngle:Number(row.angle)||0};onlineWorld.players.set(row.user_id,rp);}
      rp.isPlayer=true;rp.tx=Number(row.x)||0;rp.ty=Number(row.y)||0;rp.targetAngle=Number(row.angle)||0;
      rp.callsign=row.callsign||'Pilot';rp.name=rp.callsign;rp.shipId=row.ship_id||'phoenix';rp.faction=row.faction||null;rp.level=Number(row.level)||1;
      rp.hp=Number(row.hp)||0;rp.maxHp=Number(row.max_hp)||1;rp.shield=Number(row.shield)||0;rp.maxShield=Number(row.max_shield)||0;
      rp.rankCode=row.rank_code||'pilot_basic';rp.rankTitle=row.rank_title||'Piloto Básico';rp.clanTag=row.clan_tag||'';rp.isAdmin=!!row.is_admin;
      rp.territoryFaction=row.territory_faction||territory;rp.size=onlineShipSize(rp.shipId)*.48;rp.updatedAt=row.updated_at;
    }
    for(const id of [...onlineWorld.players.keys()]){
      if(!seen.has(id)){
        if(state.target?.isPlayer&&state.target.id===id){state.target=null;player.laserFiring=false;}
        onlineWorld.players.delete(id);
      }
    }
    onlineWorld.lastSyncAt=Date.now();
  }catch(e){console.warn('online presence sync',e);}
  finally{onlineWorld.busy=false;}
}
let pvpInboxBusy=false,pvpInboxLastAt=0;
async function syncPvpInbox(){
  if(!authenticated||!progress||isGalaxyGateMap()||pvpInboxBusy||Date.now()-pvpInboxLastAt<450)return;
  pvpInboxBusy=true;pvpInboxLastAt=Date.now();
  try{
    const events=await consumePvpDamageEventsOnline();
    for(const ev of events){
      const dmg=Math.max(0,Number(ev.damage)||0);
      if(ev.shield_drain){
        const drained=Math.min(player.shield,dmg);player.shield=Math.max(0,player.shield-drained);
        state.lastPlayerDamageAt=nowSec();
        spawnParticle(player.x,player.y-34,`SAB -${fmt(drained)} ESC`,'#79f1ff');
        spawnImpactFx(player.x,player.y,'#79f1ff',38,'shield');
      }else{
        takePlayerDamage(dmg,{forcePvP:true});
        spawnParticle(player.x,player.y-35,`${ev.attacker_callsign||'PILOTO'} -${fmt(dmg)}`,'#ff657d');
      }
    }
    if(events.length){progress.hp=player.hp;progress.shield=player.shield;saveGame();}
  }catch(e){console.warn('pvp inbox',e);}
  finally{pvpInboxBusy=false;}
}
function pvpTargetAllowed(target){
  if(!target?.isPlayer)return false;
  if(target.faction===progress.profile.faction)return false;
  return true;
}
function pvpLaserBase(ids){
  let dmg=ids.reduce((sum,id)=>sum+(Number(ITEMS[id]?.damage)||0),0);
  const ship=SHIPS[progress.activeShipId],low=['x1','x2','x3','x4'].includes(progress.mapId);
  if(ship?.bonusLowMaps&&low)dmg*=Number(ship.bonusLowMaps.laserMult)||1;
  if(state.currentMap?.battle)dmg*=1+pilotBattleLaserBonus();
  return dmg;
}
async function queuePvpShot(target,damage,shieldDrain=false,color='#ff657d'){
  if(!target?.isPlayer||state.pvpShotPending)return null;
  state.pvpShotPending=true;
  try{
    const row=await queuePvpAttackOnline({
      targetUserId:target.id,damage:Math.max(0,Math.round(damage)),shieldDrain,
      mapId:progress.mapId,territoryFaction:onlineTerritoryKey()
    });
    if(!row?.accepted)throw new Error('Ataque não autorizado.');
    const effective=Math.max(0,Number(row.effective_damage)||0);
    if(shieldDrain&&effective>0){
      const before=player.shield;player.shield=Math.min(player.maxShield,player.shield+effective);
      const restored=Math.max(0,Math.round(player.shield-before));if(restored>0)spawnParticle(player.x,player.y-34,`+${fmt(restored)} ESC`,'#79f1ff');
    }
    if(effective>0){spawnImpactFx(target.x,target.y,shieldDrain?'#79f1ff':color,32,shieldDrain?'shield':'impact');if(target.clanTag&&target.clanTag!==currentClanTag())scoreClanWar(Math.max(1,Math.min(6,Math.floor(effective/50000))),'pvp_damage');}
    return row;
  }catch(e){
    player.laserFiring=false;
    showToast(String(e?.message||e).replace(/^.*?:\s*/,''));
    return null;
  }finally{state.pvpShotPending=false;}
}
function updateOnlineWorld(dt){
  if(!authenticated||!progress)return;
  if(Date.now()-onlineWorld.lastSyncAt>1200&&!onlineWorld.busy)syncOnlineWorld();
  syncPvpInbox();syncClanCreditGrants();
  for(const rp of onlineWorld.players.values()){
    const k=Math.min(1,dt*6.5);rp.x+=(rp.tx-rp.x)*k;rp.y+=(rp.ty-rp.y)*k;rp.angle+=shortestAngleDelta(rp.angle,rp.targetAngle)*Math.min(1,dt*7);
  }
}
function onlineShipSize(shipId){const ship=SHIPS[shipId];if(!ship)return 72;if(ship.id==='citadel')return 96;if(ship.id==='bigboy')return 88;if(['goliath','aegis','solace','spectrum','sentinel','diminisher','venom'].includes(ship.id))return 82;return 72;}
function mapRankGlyph(code){
  if(code==='admin')return 'ADM';if(code==='negative_honor')return '!';
  if(code==='general')return '★★★';if(code==='general_basic')return '★★';
  if(code?.startsWith('colonel'))return code==='colonel_chief'?'★★':(code==='colonel'?'★◆':'★');
  if(code?.startsWith('major'))return code==='major_chief'?'◆◆':(code==='major'?'◆★':'◆');
  if(code?.startsWith('captain'))return code==='captain_chief'?'✦✦':(code==='captain'?'✦★':'✦');
  if(code?.startsWith('lieutenant'))return code==='lieutenant_chief'?'◇◇':(code==='lieutenant'?'◇★':'◇');
  if(code?.startsWith('sergeant'))return code==='sergeant_chief'?'▲▲':(code==='sergeant'?'▲◆':'▲');
  if(code==='pilot_chief')return '››';if(code==='pilot')return '›';return '•';
}
function drawRankEmblemCanvas(code,x,y,size=17){
  const meta=patentMeta(code),w=code==='admin'?32:26,h=size,glyph=mapRankGlyph(code);
  ctx.save();ctx.translate(x,y);ctx.shadowColor=meta.color;ctx.shadowBlur=5;ctx.fillStyle='rgba(3,12,24,.9)';ctx.strokeStyle=meta.color;ctx.lineWidth=1.2;
  ctx.beginPath();ctx.moveTo(-w/2+5,-h/2);ctx.lineTo(w/2-5,-h/2);ctx.lineTo(w/2,h/2-4);ctx.lineTo(0,h/2+2);ctx.lineTo(-w/2,h/2-4);ctx.closePath();ctx.fill();ctx.stroke();ctx.shadowBlur=0;
  ctx.fillStyle=meta.color;ctx.font=`900 ${code==='admin'?8:9}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(glyph,0,0);ctx.restore();return w;
}
function drawPilotNameplate({x,y,rankCode='pilot_basic',clanTag='',callsign='Pilot',level=1,color='#8fffd0',isAdmin=false}){
  const code=isAdmin?'admin':rankCode,tag=clanTag?`[${clanTag}] `:'',label=`${tag}${callsign}`,fontSize=12;
  ctx.save();ctx.font=`bold ${fontSize}px Arial`;const textW=ctx.measureText(label).width,badgeW=code==='admin'?32:26,gap=6,total=badgeW+gap+textW,start=x-total/2;
  drawRankEmblemCanvas(code,start+badgeW/2,y,badgeW===32?17:16);
  ctx.font=`bold ${fontSize}px Arial`;ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.shadowColor='rgba(0,0,0,.95)';ctx.shadowBlur=4;ctx.fillText(label,start+badgeW+gap,y);ctx.shadowBlur=0;
  ctx.font='9px Arial';ctx.fillStyle='rgba(205,235,247,.78)';ctx.textAlign='center';ctx.fillText(`${isAdmin?'ADMINISTRADOR':patentMeta(code).title} • LV ${level}`,x,y+13);ctx.restore();
}
function drawOnlinePlayers(){
  for(const rp of onlineWorld.players.values()){
    if(!onScreenWorld(rp.x,rp.y,180))continue;const p=screenPos(rp.x,rp.y),f=FACTIONS[rp.faction],enemy=onlinePlayerEnemy(rp),color=enemy?'#ff4d69':(f?.color||'#69ffbd'),path=GAME_ASSETS.ships[rp.shipId],img=assetImage(path),size=onlineShipSize(rp.shipId);
    ctx.save();ctx.translate(p.x,p.y);ctx.globalAlpha=.9;
    if(img&&img.naturalWidth){const sc=size/Math.max(img.naturalWidth,img.naturalHeight);ctx.rotate((rp.angle||0)+Math.PI/2);ctx.shadowColor=color;ctx.shadowBlur=10;ctx.drawImage(img,-img.naturalWidth*sc/2,-img.naturalHeight*sc/2,img.naturalWidth*sc,img.naturalHeight*sc);}else{ctx.rotate(rp.angle||0);drawShipModel(rp.shipId,color);}ctx.restore();
    const barW=58,bx=p.x-barW/2,hp=Math.max(0,Math.min(1,rp.hp/Math.max(1,rp.maxHp))),sh=Math.max(0,Math.min(1,rp.shield/Math.max(1,rp.maxShield)));
    ctx.fillStyle='rgba(8,20,28,.78)';ctx.fillRect(bx,p.y-size*.42-17,barW,4);ctx.fillStyle='#55ff9d';ctx.fillRect(bx,p.y-size*.42-17,barW*hp,4);ctx.fillStyle='rgba(7,25,45,.82)';ctx.fillRect(bx,p.y-size*.42-11,barW,3);ctx.fillStyle='#4fcfff';ctx.fillRect(bx,p.y-size*.42-11,barW*sh,3);
    drawPilotNameplate({x:p.x,y:p.y+size*.45+17,rankCode:rp.rankCode,clanTag:rp.clanTag,callsign:rp.callsign,level:rp.level,color:enemy?'#ff8b9e':'#8fffd0',isAdmin:rp.isAdmin});
  }
}

function update(dt){if(!progress)return;processRespawns();updateCombatAbilities();updatePlayer(dt);updateEnemies(dt);updatePet(dt);updateOnlineWorld(dt);updateWarfrontRuntime();updateParticles(dt);updateFx(dt);updateAlphaGate();updateAuctionSystem();updateUI();}

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
function drawStars(){const fraction=qualityProfile().stars;if(fraction<=0)return;ctx.fillStyle='#fff';const step=fraction>=1?1:fraction>=.5?2:5;for(let i=0;i<state.stars.length;i+=step){const s=state.stars[i],sx=((s.x-state.camera.x*.15)%(W+80)+(W+80))%(W+80)-40,sy=((s.y-state.camera.y*.15)%(H+80)+(H+80))%(H+80)-40;ctx.globalAlpha=s.a;ctx.beginPath();ctx.arc(sx,sy,s.r,0,TWO_PI);ctx.fill();}ctx.globalAlpha=1;}
function drawNebula(){const pal=state.currentMap.palette||{nebula:'#173159',accent:'#66d9ff',deep:'#030816'};const g=ctx.createRadialGradient(W*.62,H*.36,20,W*.62,H*.36,Math.max(W,H)*.72);g.addColorStop(0,`${pal.nebula}55`);g.addColorStop(.38,`${pal.nebula}22`);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);const g2=ctx.createRadialGradient(W*.18,H*.78,10,W*.18,H*.78,Math.max(W,H)*.42);g2.addColorStop(0,`${pal.accent}1f`);g2.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g2;ctx.fillRect(0,0,W,H);}
function drawBounds(){const p=screenPos(0,0);ctx.strokeStyle='rgba(60,140,255,.13)';ctx.lineWidth=2;ctx.strokeRect(p.x,p.y,state.currentMap.world.w,state.currentMap.world.h);}
function drawBaseSafeZone(){
  if(progress.mapId!=='x1')return;
  const b=currentBasePoint(),p=screenPos(b.x,b.y),f=territoryOwner()||getFaction(),home=isOwnTerritory(),pulse=1+Math.sin(nowSec()*2.2)*.012;
  ctx.save();ctx.translate(p.x,p.y);

  // Campo de proteção.
  ctx.strokeStyle=f?.color||'#5ce8ff';
  ctx.fillStyle=home?'rgba(40,220,170,.035)':'rgba(255,65,82,.028)';
  ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,SAFE_ZONE.radius*pulse,0,TWO_PI);ctx.fill();ctx.stroke();
  ctx.strokeStyle=home?'rgba(100,255,210,.18)':'rgba(255,85,110,.16)';
  ctx.lineWidth=9;ctx.beginPath();ctx.arc(0,0,SAFE_ZONE.radius-10,0,TWO_PI);ctx.stroke();

  // Nova estação orbital.
  const station=assetImage(GAME_ASSETS.bases?.orbitalStation);
  if(station&&station.naturalWidth){
    const targetW=520,targetH=targetW*(station.naturalHeight/station.naturalWidth);
    ctx.save();
    ctx.shadowColor=f?.color||'#51dfff';ctx.shadowBlur=34;
    ctx.drawImage(station,-targetW/2,-targetH/2,targetW,targetH);
    ctx.restore();

    // Pulso da usina central com a cor da companhia.
    const core=ctx.createRadialGradient(0,-8,4,0,-8,84);
    core.addColorStop(0,'rgba(255,255,255,.30)');
    core.addColorStop(.22,`${f?.color||'#55ddff'}66`);
    core.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=core;ctx.beginPath();ctx.arc(0,-8,84+Math.sin(nowSec()*3)*3,0,TWO_PI);ctx.fill();
  }else{
    const core=ctx.createRadialGradient(-6,-6,2,0,0,38);
    core.addColorStop(0,'#fff');core.addColorStop(.35,f?.color||'#5ce8ff');core.addColorStop(1,'#0a1c2b');
    ctx.fillStyle=core;ctx.beginPath();ctx.arc(0,0,34,0,TWO_PI);ctx.fill();
  }

  ctx.fillStyle=home?'#caffdf':'#ff9aa8';ctx.font='bold 13px Arial';ctx.textAlign='center';
  ctx.fillText(`${f?.short||''} • ${home?'BASE ORBITAL / ZONA SEGURA':'BASE INIMIGA'}`,0,-SAFE_ZONE.radius-18);
  ctx.restore();
}
function drawPortals(){for(const portal of resolvedPortals()){const p=screenPos(portal.x,portal.y),t=nowSec();ctx.save();ctx.translate(p.x,p.y);ctx.save();ctx.setLineDash([8,10]);ctx.strokeStyle='rgba(98,255,210,.18)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,PORTAL_NEUTRAL_RADIUS,0,TWO_PI);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='rgba(98,255,210,.035)';ctx.beginPath();ctx.arc(0,0,PORTAL_NEUTRAL_RADIUS,0,TWO_PI);ctx.fill();ctx.restore();ctx.shadowColor='#43d8ff';ctx.shadowBlur=18;ctx.strokeStyle='rgba(83,221,255,.88)';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,36,56,0,0,TWO_PI);ctx.stroke();ctx.shadowBlur=0;ctx.rotate(t*.7);ctx.strokeStyle='rgba(174,102,255,.62)';ctx.lineWidth=5;for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(0,0,27,-.55+i*Math.PI/2,.55+i*Math.PI/2);ctx.stroke();}ctx.rotate(-t*1.4);ctx.strokeStyle='rgba(92,231,255,.42)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,19,0,Math.PI*1.35);ctx.stroke();ctx.rotate(t*.7);const cg=ctx.createRadialGradient(0,0,2,0,0,24);cg.addColorStop(0,'rgba(240,255,255,.72)');cg.addColorStop(.35,'rgba(72,211,255,.32)');cg.addColorStop(1,'rgba(51,91,255,.02)');ctx.fillStyle=cg;ctx.beginPath();ctx.ellipse(0,0,22,38,0,0,TWO_PI);ctx.fill();ctx.fillStyle='#9aeaff';ctx.font='bold 11px Arial';ctx.textAlign='center';ctx.fillText(portal.targetLabel||displayMapLabel(portal.to,portal.targetTerritoryFaction),0,-68);ctx.restore();}}
function drawOres(){for(const o of state.ores){if(!onScreenWorld(o.x,o.y,100))continue;
  const p=screenPos(o.x,o.y),path=GAME_ASSETS.resources[o.type];
  const img=assetImage(path);
  if(img&&img.naturalWidth){
    const size=Math.max(26,o.r*3.2),pulse=.94+Math.sin(nowSec()*2.4+o.x*.01)*.06;
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate((o.rot||0)+nowSec()*.08);ctx.globalAlpha=.96;ctx.shadowColor=o.color;ctx.shadowBlur=12;
    const scale=(size*pulse)/Math.max(img.naturalWidth,img.naturalHeight),w=img.naturalWidth*scale,h=img.naturalHeight*scale;ctx.drawImage(img,-w/2,-h/2,w,h);ctx.restore();continue;
  }
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(o.rot||0);ctx.shadowColor=o.color;ctx.shadowBlur=10;ctx.fillStyle=o.color;ctx.beginPath();ctx.arc(0,0,o.r,0,TWO_PI);ctx.fill();ctx.restore();
}}
function drawLoot(){for(const l of state.loot){
  if(!Number.isFinite(l.expiresAt))l.expiresAt=nowSec()+CARGO_BOX_LIFETIME_SEC;
  const remaining=l.expiresAt-nowSec();
  if(remaining<=0||!onScreenWorld(l.x,l.y,100))continue;
  const p=screenPos(l.x,l.y),pulse=.92+Math.sin(nowSec()*4+l.x*.02)*.08,img=assetImage(GAME_ASSETS.loot.cargo);
  const dyingAlpha=remaining<=5?(.38+.62*Math.abs(Math.sin(nowSec()*7))):1;
  if(img&&img.naturalWidth){
    ctx.save();ctx.globalAlpha=dyingAlpha;ctx.translate(p.x,p.y);ctx.rotate(Math.sin(nowSec()+l.x)*.06);
    ctx.shadowColor=remaining<=5?'#ff5a4c':'#ffbd48';ctx.shadowBlur=remaining<=5?18:12;
    const size=42*pulse,sc=size/Math.max(img.naturalWidth,img.naturalHeight);
    ctx.drawImage(img,-img.naturalWidth*sc/2,-img.naturalHeight*sc/2,img.naturalWidth*sc,img.naturalHeight*sc);
    ctx.restore();continue;
  }
  ctx.save();ctx.globalAlpha=dyingAlpha;ctx.fillStyle='#f5b84c';ctx.fillRect(p.x-10,p.y-10,20,20);ctx.restore();
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
  const p=screenPos(e.x,e.y),boss=e.type.startsWith('boss'),img=assetImage(GAME_ASSETS.npcs[e.type]);
  ctx.save();ctx.translate(p.x,p.y);
  if(state.target?.id===e.id){ctx.strokeStyle='rgba(255,74,95,.98)';ctx.lineWidth=2;ctx.setLineDash([6,4]);ctx.beginPath();ctx.arc(0,0,e.size+15+Math.sin(nowSec()*5)*1.5,0,TWO_PI);ctx.stroke();ctx.setLineDash([]);}
  if(img&&img.naturalWidth){
    const face=Math.atan2(player.y-e.y,player.x-e.x)+Math.PI/2,size=e.size*(boss?3.35:3.05),sc=size/Math.max(img.naturalWidth,img.naturalHeight);
    ctx.rotate(face);ctx.shadowColor=boss?'#ff405a':e.color;ctx.shadowBlur=boss?20:10;ctx.drawImage(img,-img.naturalWidth*sc/2,-img.naturalHeight*sc/2,img.naturalWidth*sc,img.naturalHeight*sc);
  }else{
    // Enquanto o PNG carrega, o modo ALTO usa uma silhueta angular discreta em vez de círculos/quadrados.
    if(qualityMode==='high'){
      const face=Math.atan2(player.y-e.y,player.x-e.x)+Math.PI/2,s=e.size*1.35;ctx.rotate(face);ctx.shadowColor=e.color;ctx.shadowBlur=16;ctx.fillStyle='rgba(8,18,30,.9)';ctx.strokeStyle=e.color;ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(0,-s);ctx.lineTo(s*.72,s*.55);ctx.lineTo(0,s*.22);ctx.lineTo(-s*.72,s*.55);ctx.closePath();ctx.fill();ctx.stroke();ctx.shadowBlur=0;
    }else drawNpcModel(e);
  }
  ctx.restore();
  const hp=e.hp/e.maxHp,sh=e.maxShield?e.shield/e.maxShield:0,barW=Math.max(34,e.size*2.4),bx=p.x-barW/2;
  ctx.fillStyle='rgba(48,8,16,.86)';ctx.fillRect(bx,p.y-e.size-21,barW,5);ctx.fillStyle='#ff4f67';ctx.fillRect(bx,p.y-e.size-21,barW*hp,5);
  ctx.fillStyle='rgba(8,26,44,.86)';ctx.fillRect(bx,p.y-e.size-14,barW,4);ctx.fillStyle='#49cfff';ctx.fillRect(bx,p.y-e.size-14,barW*sh,4);
  ctx.fillStyle=boss?'#ffcf71':'#ff958d';ctx.font=`bold ${boss?12:11}px Arial`;ctx.textAlign='center';ctx.fillText(e.name,p.x,p.y+e.size+22);
}
function drawDrones(p){const f=getFaction();progress.drones.forEach((d,i)=>{
  const a=nowSec()*.8+i*TWO_PI/Math.max(1,progress.drones.length),r=66+(i%2)*18,x=p.x+Math.cos(a)*r,y=p.y+Math.sin(a)*r,img=assetImage(GAME_ASSETS.drones[d.type]);
  if(img&&img.naturalWidth){const size=d.type==='iris'?26:23,sc=size/Math.max(img.naturalWidth,img.naturalHeight);ctx.save();ctx.translate(x,y);ctx.rotate(a+Math.PI);ctx.shadowColor=d.type==='iris'?'#c77cff':'#71dfff';ctx.shadowBlur=8;ctx.drawImage(img,-img.naturalWidth*sc/2,-img.naturalHeight*sc/2,img.naturalWidth*sc,img.naturalHeight*sc);ctx.restore();return;}
  ctx.fillStyle=d.type==='iris'?'#bd7cff':'#71dfff';ctx.beginPath();ctx.arc(x,y,4,0,TWO_PI);ctx.fill();
});}
function drawPet(){
  if(!progress?.pet?.owned)return;
  const p=screenPos(petRuntime.x,petRuntime.y),mode=progress.pet.activeGear||'off',color=mode==='guard'?'#ff8c93':mode==='box'?'#ffd46b':mode==='ore'?'#7fffc4':'#7edcff';
  const path=progress.pet.level>=10?GAME_ASSETS.drones.petElite:GAME_ASSETS.drones.pet,img=assetImage(path);
  if(img&&img.naturalWidth){const size=34+(progress.pet.level/15)*10,sc=size/Math.max(img.naturalWidth,img.naturalHeight);ctx.save();ctx.translate(p.x,p.y);ctx.rotate((petRuntime.angle||0)+Math.PI/2);ctx.shadowColor=color;ctx.shadowBlur=12;ctx.drawImage(img,-img.naturalWidth*sc/2,-img.naturalHeight*sc/2,img.naturalWidth*sc,img.naturalHeight*sc);ctx.restore();}
  else{ctx.fillStyle=color;ctx.beginPath();ctx.arc(p.x,p.y,8,0,TWO_PI);ctx.fill();}
  ctx.fillStyle=color;ctx.font='bold 10px Arial';ctx.textAlign='center';ctx.fillText(`AUX-9 LV ${progress.pet.level}`,p.x,p.y+28);
  if(petRuntime.laserTargetId&&nowSec()<petRuntime.laserUntil){const e=state.enemies.find(x=>x.id===petRuntime.laserTargetId&&x.hp>0)||onlineWorld.players.get(petRuntime.laserTargetId);if(e&&e.hp>0){const t=screenPos(e.x,e.y);ctx.strokeStyle=currentLaserAmmo().color;ctx.shadowColor=currentLaserAmmo().color;ctx.shadowBlur=8;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(t.x,t.y);ctx.stroke();ctx.shadowBlur=0;}}
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
  const p=screenPos(player.x,player.y),f=getFaction(),a=player.angle||0,color=f?.color||'#76e0ff',path=GAME_ASSETS.ships[progress.activeShipId],img=assetImage(path);
  ctx.save();ctx.translate(p.x,p.y);
  if(img&&img.naturalWidth){
    const ship=SHIPS[progress.activeShipId],size=(ship.id==='citadel'?105:ship.id==='bigboy'?96:ship.id==='goliath'||ship.id==='aegis'?88:78),sc=size/Math.max(img.naturalWidth,img.naturalHeight);
    ctx.rotate((a||0)+Math.PI/2);ctx.shadowColor=color;ctx.shadowBlur=14;ctx.drawImage(img,-img.naturalWidth*sc/2,-img.naturalHeight*sc/2,img.naturalWidth*sc,img.naturalHeight*sc);
  }else{ctx.rotate(a||0);drawShipModel(progress.activeShipId,color);}
  ctx.restore();drawDrones(p);
  ctx.strokeStyle='rgba(119,228,255,.23)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(p.x,p.y,25,0,TWO_PI);ctx.stroke();
  drawPilotNameplate({x:p.x,y:p.y+39,rankCode:myRankingRow()?.rank_code||'pilot_basic',clanTag:currentClanTag(),callsign:progress.profile.callsign||getUser()?.callsign||'Pilot',level:progress.profile.level||1,color,isAdmin:!!clanRuntime.state?.is_admin});
  if(player.laserFiring&&state.target&&state.target.hp>0&&enemyDistance(state.target)<=playerLaserRange()){const t=screenPos(state.target.x,state.target.y);ctx.strokeStyle=currentLaserAmmo().color;ctx.shadowColor=currentLaserAmmo().color;ctx.shadowBlur=9;ctx.lineWidth=2.3;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(t.x,t.y);ctx.stroke();ctx.shadowBlur=0;}
}
function drawParticles(){ctx.font='12px Arial';ctx.textAlign='center';for(const p of state.particles){const q=screenPos(p.x,p.y);ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.fillText(p.text,q.x,q.y);}ctx.globalAlpha=1;}
function drawMinimap(){
  mm.clearRect(0,0,minimap.width,minimap.height);const bg=mm.createLinearGradient(0,0,0,minimap.height);bg.addColorStop(0,'#081522');bg.addColorStop(1,'#040b14');mm.fillStyle=bg;mm.fillRect(0,0,minimap.width,minimap.height);mm.strokeStyle='rgba(75,180,255,.5)';mm.strokeRect(1,1,minimap.width-2,minimap.height-2);
  const sx=minimap.width/state.currentMap.world.w,sy=minimap.height/state.currentMap.world.h;
  mm.strokeStyle='rgba(78,180,255,.08)';mm.lineWidth=.7;for(let x=0;x<=state.currentMap.world.w;x+=1000){mm.beginPath();mm.moveTo(x*sx,0);mm.lineTo(x*sx,minimap.height);mm.stroke();}for(let y=0;y<=state.currentMap.world.h;y+=1000){mm.beginPath();mm.moveTo(0,y*sy);mm.lineTo(minimap.width,y*sy);mm.stroke();}
  if(progress.mapId==='x1'){const b=currentBasePoint();mm.strokeStyle='rgba(100,255,190,.65)';mm.lineWidth=2;mm.beginPath();mm.arc(b.x*sx,b.y*sy,SAFE_ZONE.radius*Math.min(sx,sy),0,TWO_PI);mm.stroke();}
  for(const p of resolvedPortals()){mm.fillStyle='#56dbff';mm.beginPath();mm.arc(p.x*sx,p.y*sy,4,0,TWO_PI);mm.fill();}
  for(const l of state.landmarks){mm.fillStyle=l.type==='wreck'?'#ffc45a':l.type==='scan'?'#bd78ff':'#4fd7ff';mm.fillRect(l.x*sx-1,l.y*sy-1,2,2);}
  const px=player.x*sx,py=player.y*sy,tx=player.tx*sx,ty=player.ty*sy,rad=state.radarRange*Math.min(sx,sy);mm.strokeStyle='rgba(130,220,255,.22)';mm.lineWidth=1;mm.beginPath();mm.arc(px,py,rad,0,TWO_PI);mm.stroke();
  if(routeDistance()>35){mm.strokeStyle='rgba(115,225,255,.55)';mm.setLineDash([4,3]);mm.beginPath();mm.moveTo(px,py);mm.lineTo(tx,ty);mm.stroke();mm.setLineDash([]);mm.strokeStyle='#fff';mm.beginPath();mm.arc(tx,ty,4,0,TWO_PI);mm.stroke();}
  for(const e of state.enemies){if(e.hp<=0||Math.hypot(e.x-player.x,e.y-player.y)>state.radarRange)continue;mm.fillStyle=state.target?.id===e.id?'#ff345e':'#ff755d';mm.beginPath();mm.arc(e.x*sx,e.y*sy,e.type.startsWith('boss')?2.6:1.8,0,TWO_PI);mm.fill();}
  // Minimap: sem pedras e sem cargo boxes. Somente NPCs + pilotos inimigos.
  for(const rp of onlineWorld.players.values()){
    if(!onlinePlayerEnemy(rp)||Math.hypot(rp.x-player.x,rp.y-player.y)>state.radarRange)continue;
    const x=rp.x*sx,y=rp.y*sy,selected=state.target?.isPlayer&&state.target.id===rp.id,size=selected?5.8:4.6;
    mm.save();mm.translate(x,y);mm.rotate(Math.PI/4);mm.fillStyle=selected?'#ff174f':'#ff4d69';mm.strokeStyle='#ffd4dc';mm.lineWidth=1;
    mm.fillRect(-size/2,-size/2,size,size);mm.strokeRect(-size/2,-size/2,size,size);mm.restore();
  }
  mm.fillStyle=getFaction()?.color||'#fff';mm.beginPath();mm.arc(px,py,4.5,0,TWO_PI);mm.fill();mm.strokeStyle='rgba(255,255,255,.7)';mm.stroke();
}
function draw(){const q=qualityProfile();ctx.clearRect(0,0,W,H);if(!progress){drawNebula();drawStars();return;}if(!(q.background&&drawMapBackground()))drawNebula();drawStars();if(q.grid)drawSectorGrid();drawBounds();drawLandmarks();drawBaseSafeZone();drawPortals();drawOres();drawLoot();state.enemies.forEach(e=>e.hp>0&&onScreenWorld(e.x,e.y,180)&&drawEnemy(e));drawOnlinePlayers();if(q.fx)drawRocketFx();drawPlayer();drawPet();if(q.fx)drawFx();drawParticles();drawNavigationOverlay();drawMinimap();}

function ammoWarningClass(qty,perUse){
  if(qty<=0)return 'empty';
  const uses=perUse>0?Math.floor(qty/perUse):qty;
  if(uses<=3)return 'critical';
  if(uses<=10)return 'low';
  return '';
}
function refreshAmmoCounters(){
  if(!progress)return;
  const shipLaserUse=Math.max(1,equippedLaserCount()),petUseCount=progress.pet?.owned?petLaserIds().length:0,totalLaserUse=Math.max(1,shipLaserUse+petUseCount);
  ui.laserAmmoButtons.querySelectorAll('[data-ammo-id]').forEach(btn=>{
    const id=btn.dataset.ammoId,a=LASER_AMMO[id],q=ammoQty(id),bursts=Math.floor(q/totalLaserUse);
    btn.classList.toggle('active',progress.selectedLaserAmmo===id);
    btn.classList.remove('empty','low','critical');
    const warn=ammoWarningClass(q,totalLaserUse);if(warn)btn.classList.add(warn);
    const qty=btn.querySelector('.ammo-qty');
    if(qty)qty.textContent=fmt(q);
    btn.dataset.tip=ammoTooltipText(a,q,shipLaserUse,petUseCount,bursts);
    btn.title=ammoTooltipText(a,q,shipLaserUse,petUseCount,bursts).replace(/\n/g,' | ');
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
    b.innerHTML=`<img class="ammo-art" src="${GAME_ASSETS.ammo[a.id]}" alt=""><span class="ammo-code">${shortLaserLabel(a.id)}</span><span class="ammo-qty"></span>`;
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
    b.innerHTML=`<img class="ammo-art" src="${GAME_ASSETS.ammo[r.id]}" alt=""><span class="ammo-code">${shortRocketLabel(r.id)}</span><span class="ammo-qty"></span>`;
    b.onclick=()=>{progress.selectedRocket=r.id;refreshAmmoCounters();saveGame();};
    ui.rocketAmmoButtons.appendChild(b);
  });
  refreshAmmoCounters();
}

function updateExtraControls(){ return; }
function updatePetFloat(){
  if(!ui.petFloatPanel)return;
  const pet=progress?.pet;
  const shouldShow=!!pet?.owned&&hudVisibility.pet!==false;
  ui.petFloatPanel.classList.toggle('hidden',!shouldShow);
  if(!shouldShow)return;
  ui.petFloatPanel.classList.remove('hud-user-disabled');
  if(ui.petFloatLevel)ui.petFloatLevel.textContent=`LV${pet.level}`;
  if(ui.petFloatStatus){const gear=pet.activeGear==='off'?'COMPANHIA':(PET_GEARS[pet.activeGear]?.name||'COMPANHIA');const behavior=({guard:'COMBATENDO',box:'BUSCANDO BOX',ore:'BUSCANDO PEDRA',repair:'REPARANDO',kami:petRuntime.kamiArmed?'KAMIKAZE ARMADO':'KAMIKAZE',roam:'PATRULHANDO',escort:'ESCOLTANDO'})[petRuntime.taskType]||'LIVRE';const rangeLabel=pet.activeGear==='guard'?`ATAQUE ${fmt(petCombatSearchRange())}`:pet.activeGear==='box'||pet.activeGear==='ore'?`COLETA ${fmt(petCollectionRange())}`:pet.activeGear==='repair'?'REPARO':'COMPANHIA';ui.petFloatStatus.textContent=`${behavior} • ${gear} • ${rangeLabel}`;}
  if(ui.petGearQuickSelect){
    const owned=['off',...Object.keys(PET_GEARS).filter(id=>id!=='kami'&&pet.gearsOwned?.[id])];
    const signature=owned.join('|');
    if(ui.petGearQuickSelect.dataset.signature!==signature){
      ui.petGearQuickSelect.innerHTML='';
      for(const id of owned){const opt=document.createElement('option');opt.value=id;opt.textContent=id==='off'?'COMPANHIA':PET_GEARS[id].name;ui.petGearQuickSelect.appendChild(opt);}
      ui.petGearQuickSelect.dataset.signature=signature;
    }
    ui.petGearQuickSelect.value=owned.includes(pet.activeGear)?pet.activeGear:'off';
  }
}
function updateBaseTradePrompt(){
  if(!ui.baseTradePrompt)return;
  const active=!!progress&&isAtTrader()&&!isGalaxyGateMap()&&!state.jumping;
  ui.baseTradePrompt.classList.toggle('hidden',!active);
  if(!active)return;
  const b=currentBasePoint(),pos=screenPos(b.x,b.y);
  ui.baseTradePrompt.style.left=`${Math.max(120,Math.min(W-120,pos.x))}px`;
  ui.baseTradePrompt.style.top=`${Math.max(145,Math.min(H-110,pos.y+205))}px`;
  if(ui.baseTradePromptInfo)ui.baseTradePromptInfo.textContent=`Porão ${fmt(cargoUsed())}/${fmt(cargoCapacity())} • ${fmt(cargoSaleValue())} CR`;
}
function updateUI(){
  refreshAmmoCounters();
  const f=getFaction(),ship=SHIPS[progress.activeShipId],baseSafe=isBaseSafeZone(),portalSafe=isPortalNeutralZone(),safe=baseSafe||portalSafe;ui.factionLabel.textContent=f?.short||'—';ui.factionLabel.style.color=f?.color||'';ui.mapLabel.textContent=displayMapLabel(progress.mapId);if(ui.sectorName)ui.sectorName.textContent=state.currentMap.name||'Setor';if(ui.coordLabel)ui.coordLabel.textContent=`${Math.round(player.x)} / ${Math.round(player.y)}`;if(ui.routeLabel){const rd=routeDistance();ui.routeLabel.textContent=rd>35?`${fmt(rd)}u`:'PARADO';ui.routeLabel.parentElement?.classList.toggle('active',rd>35);}if(ui.discoveriesLabel){const found=state.landmarks.filter(l=>progress.discoveries?.[`${progress.mapId}:${l.id}`]).length;ui.discoveriesLabel.textContent=`${found}/${state.landmarks.length}`;}ui.shipLabel.textContent=ship.name;ui.lvl.textContent=progress.profile.level;ui.hp.textContent=fmt(player.hp);ui.maxHp.textContent=fmt(player.maxHp);ui.shield.textContent=fmt(player.shield);ui.maxShield.textContent=fmt(player.maxShield);ui.speed.textContent=fmt(player.speed*shipAbilitySpeedMultiplier());if(ui.dmg)ui.dmg.textContent=fmt(player.laserDamage*currentLaserAmmo().mult);ui.credits.textContent=fmt(progress.profile.credits);ui.uridium.textContent=fmt(progress.profile.uridium);ui.xp.textContent=fmt(progress.profile.xp);ui.xp.title=progress.profile.level>=PLAYER_MAX_LEVEL?'Nível máximo':`Próximo nível: ${fmt(levelXpThreshold(progress.profile.level+1))} XP • ${Math.round(levelProgressPercent(progress.profile.xp,progress.profile.level))}%`;if(ui.droneCount)ui.droneCount.textContent=progress.drones.length;ui.laserToggle.classList.toggle('active',player.laserFiring);ui.rocketCd.textContent=rocketReady()?'MÍSSIL PRONTO':`MÍSSIL ${(getRocketCooldown()-(nowSec()-player.lastRocketShot)).toFixed(1)}s`;
  if(ui.shipHudArt)ui.shipHudArt.src=GAME_ASSETS.ships[progress.activeShipId]||GAME_ASSETS.ships.phoenix;
  if(ui.factionIcon)ui.factionIcon.src=factionAsset(progress.profile.faction);
  if(ui.userLabel)ui.userLabel.textContent=progress.profile.callsign||getUser()?.callsign||'Pilot';updateRankChip();if(ui.petBtn)ui.petBtn.textContent=progress.pet?.owned?`AUX-9 LV${progress.pet.level}`:'AUX-9 LOJA';if(ui.safeZoneLabel){ui.safeZoneLabel.textContent=baseSafe?'BASE • ZONA SEGURA':portalSafe?'PORTAL • ZONA NEUTRA':'ZONA DE COMBATE';ui.safeZoneLabel.classList.toggle('active',safe);}updatePremiumBadge();if(ui.cargoUsed)ui.cargoUsed.textContent=fmt(cargoUsed());if(ui.cargoMax)ui.cargoMax.textContent=fmt(cargoCapacity());if(ui.cargoBtn)ui.cargoBtn.classList.toggle('gold',isAtTrader());updatePetFloat();updateAbilityHud();updateBossHud();updateBaseTradePrompt();renderActiveMissionHud();
  ui.shopCredits.textContent=fmt(progress.profile.credits);ui.shopStellarium.textContent=fmt(progress.profile.uridium);ui.hangarShipName.textContent=ship.name;updateExtraControls();
  const portal=nearbyPortal();if(portal&&!state.jumping&&ui.portalPrompt){const pos=screenPos(portal.x,portal.y);ui.portalPrompt.style.left=`${Math.max(85,Math.min(W-85,pos.x))}px`;ui.portalPrompt.style.top=`${Math.max(115,Math.min(H-90,pos.y-58))}px`;ui.portalPromptMap.textContent=`Destino ${displayMapLabel(portal.to)} • clique ou J`;ui.portalPrompt.classList.remove('hidden');}else ui.portalPrompt?.classList.add('hidden');
}

function canAfford(price,currency){return currency==='credits'?progress.profile.credits>=price:progress.profile.uridium>=price;}
function charge(price,currency){if(!canAfford(price,currency))return false;if(currency==='credits')progress.profile.credits-=price;else progress.profile.uridium-=price;return true;}
function priceText(p,c){return `${fmt(p)} ${c==='credits'?'CR':'STL'}`;}
function productIcon(type,subtype){return type==='ship'?'🛸':type==='laser'?'⚡':type==='generator'?(subtype==='speed'?'💨':'🛡️'):type==='drone'?'◆':type==='pet'?'🤖':type==='extra'?'🧩':type==='ammo'?'✦':'🚀';}

function ownsExtraItem(itemId){
  return (progress?.inventory?.[itemId]||0)>0||(progress?.shipLoadout?.extras||[]).includes(itemId);
}
function itemSellValue(item){return Math.max(1,Math.floor((Number(item?.price)||0)*.5));}
let pendingConfirmAction=null;
let confirmReturnModal=null;
function saleCurrencyLabel(currency){return currency==='uridium'?'STL':'CR';}
function closeSaleConfirm(){pendingConfirmAction=null;ui.saleConfirmModal?.classList.add('hidden');const back=confirmReturnModal;confirmReturnModal=null;if(back)back.classList.remove('hidden');}
function openConfirmModal({eyebrow='CONFIRMAÇÃO',title='Confirmar ação?',itemName='Item',detail='Revise a ação antes de continuar.',value=0,currency='credits',valueLabel='VALOR',confirmLabel='CONFIRMAR',confirmClass='danger-btn',onConfirm}){
  confirmReturnModal=dismissibleModals().find(modal=>modal!==ui.saleConfirmModal&&!modal.classList.contains('hidden'))||null;
  if(confirmReturnModal)confirmReturnModal.classList.add('hidden');
  pendingConfirmAction=typeof onConfirm==='function'?onConfirm:null;
  if(ui.saleConfirmEyebrow)ui.saleConfirmEyebrow.textContent=eyebrow;
  if(ui.saleConfirmTitle)ui.saleConfirmTitle.textContent=title;
  if(ui.saleConfirmItem)ui.saleConfirmItem.textContent=itemName;
  if(ui.saleConfirmCopy)ui.saleConfirmCopy.textContent=detail;
  if(ui.saleConfirmValueLabel)ui.saleConfirmValueLabel.textContent=valueLabel;
  if(ui.saleConfirmValue)ui.saleConfirmValue.textContent=`${fmt(value)} ${saleCurrencyLabel(currency)}`;
  if(ui.saleConfirmAccept){ui.saleConfirmAccept.textContent=confirmLabel;ui.saleConfirmAccept.className=confirmClass;}
  ui.saleConfirmModal?.classList.remove('hidden');
}
function openSaleConfirm({title='Confirmar venda?',itemName='Item',detail='Esta ação não poderá ser desfeita.',value=0,currency='credits',onConfirm}){
  openConfirmModal({eyebrow:'CONFIRMAÇÃO DE VENDA',title,itemName,detail,value,currency,valueLabel:'VOCÊ RECEBERÁ',confirmLabel:'CONFIRMAR VENDA',confirmClass:'danger-btn',onConfirm});
}
function openSpendConfirm({title='Confirmar compra?',itemName='Item',detail='Seu saldo será consumido somente ao confirmar.',value=0,currency='credits',onConfirm,confirmLabel='CONFIRMAR COMPRA'}){
  openConfirmModal({eyebrow:'CONFIRMAÇÃO DE COMPRA',title,itemName,detail,value,currency,valueLabel:'VOCÊ GASTARÁ',confirmLabel,confirmClass:'primary-btn',onConfirm});
}
function confirmSaleNow(){const action=pendingConfirmAction;if(!action){closeSaleConfirm();return;}const back=confirmReturnModal;pendingConfirmAction=null;confirmReturnModal=null;ui.saleConfirmModal?.classList.add('hidden');action();if(back)back.classList.remove('hidden');}
function performSellInventoryItem(itemId,qty=1){
  const item=ITEMS[itemId],have=progress?.inventory?.[itemId]||0;qty=Math.max(1,Math.floor(qty));
  if(!item||have<qty){showToast('Item não disponível para venda');return;}
  const total=itemSellValue(item)*qty;
  progress.inventory[itemId]-=qty;if(progress.inventory[itemId]<=0)delete progress.inventory[itemId];
  if(item.currency==='uridium')progress.profile.uridium+=total;else progress.profile.credits+=total;
  saveGame();renderShop();renderHangar();updateUI();showToast(`${item.name} vendido por ${fmt(total)} ${saleCurrencyLabel(item.currency)}`);
}
function sellInventoryItem(itemId,qty=1){
  const item=ITEMS[itemId],have=progress?.inventory?.[itemId]||0;qty=Math.max(1,Math.floor(qty));
  if(!item||have<qty){showToast('Item não disponível para venda');return;}
  const total=itemSellValue(item)*qty;
  openSaleConfirm({title:'Vender equipamento?',itemName:`${item.name}${qty>1?` ×${qty}`:''}`,detail:'Confirme antes de remover o item do inventário. A venda é definitiva.',value:total,currency:item.currency,onConfirm:()=>performSellInventoryItem(itemId,qty)});
}
function buyShip(shipId){const ship=SHIPS[shipId];if(!ship)return;if(ship.eventOnly||ship.shopAvailable===false){showToast(`${ship.name}: nave reservada para Evento / Missão / Passe`);return;}if(progress.ownedShips.includes(shipId)){showToast('Nave já obtida');return;}const cost=premiumElitePrice(ship.price,ship.currency);if(!canAfford(cost,ship.currency)){showToast('Saldo insuficiente');return;}openSpendConfirm({title:'Comprar nave?',itemName:ship.name,detail:`Confirme a compra da nave para adicioná-la ao Hangar.${cost<ship.price?' Bônus PREMIUM aplicado (-5%).':''}`,value:cost,currency:ship.currency,onConfirm:()=>{if(progress.ownedShips.includes(shipId)){showToast('Nave já obtida');return;}if(!charge(cost,ship.currency)){showToast('Saldo insuficiente');return;}progress.ownedShips.push(shipId);saveGame();renderShop();showToast(`${ship.name} adicionada ao Hangar${cost<ship.price?' • PREMIUM -5%':''}`);}});}
function buyItem(itemId){const item=ITEMS[itemId];if(!item)return;if(item.type==='drone'){buyDrone(itemId);return;}if(item.type==='extra'&&ownsExtraItem(itemId)){showToast('Esse EXTRA já pertence à sua conta');return;}const cost=premiumElitePrice(item.price,item.currency);if(!canAfford(cost,item.currency)){showToast('Saldo insuficiente');return;}openSpendConfirm({title:'Comprar item?',itemName:item.name,detail:`Confirme a compra do item.${cost<item.price?' Bônus PREMIUM aplicado (-5%).':''}`,value:cost,currency:item.currency,onConfirm:()=>{if(item.type==='extra'&&ownsExtraItem(itemId)){showToast('Esse EXTRA já pertence à sua conta');return;}if(!charge(cost,item.currency)){showToast('Saldo insuficiente');return;}addInventory(itemId);saveGame();renderShop();if(!ui.hangarModal.classList.contains('hidden'))renderHangar();showToast(`${item.name} comprado${cost<item.price?' • PREMIUM -5%':''}`);}});}
function buyDrone(type){if(progress.drones.length>=8){showToast('Limite de 8 drones atingido');return;}const item=ITEMS[type],cost=premiumElitePrice(item.price,item.currency);if(!canAfford(cost,item.currency)){showToast('Saldo insuficiente');return;}openSpendConfirm({title:'Comprar drone?',itemName:item.name,detail:`Confirme a compra do drone.${cost<item.price?' Bônus PREMIUM aplicado (-5%).':''}`,value:cost,currency:item.currency,onConfirm:()=>{if(progress.drones.length>=8){showToast('Limite de 8 drones atingido');return;}if(!charge(cost,item.currency)){showToast('Saldo insuficiente');return;}progress.drones.push({id:`d_${Date.now()}_${Math.random().toString(16).slice(2,5)}`,type,slots:Array(item.slots).fill(null)});computeStats(true);saveGame();renderShop();showToast(`${item.name} adquirido (${progress.drones.length}/8)${cost<item.price?' • PREMIUM -5%':''}`);}});}
function buyAmmo(id){const ammo=LASER_AMMO[id];if(!ammo||ammo.purchasable===false||ammo.sourceOnly===true)return;if(!canAfford(ammo.price,ammo.currency)){showToast('Saldo insuficiente');return;}openSpendConfirm({title:'Comprar munição?',itemName:`${ammo.name} • pacote ${fmt(ammo.pack)}`,detail:'Confirme a compra da munição selecionada.',value:ammo.price,currency:ammo.currency,onConfirm:()=>{if(!buyAmmoPack(id,false)){showToast('Saldo insuficiente');return;}buildAmmoButtons();renderShop();},confirmLabel:'CONFIRMAR COMPRA'});}
function buyRockets(id){const rocket=ROCKETS[id];if(!rocket||rocket.purchasable===false||rocket.sourceOnly===true)return;if(!canAfford(rocket.price,rocket.currency)){showToast('Saldo insuficiente');return;}openSpendConfirm({title:'Comprar míssil?',itemName:`${rocket.name} • pacote ${fmt(rocket.pack)}`,detail:'Confirme a compra do pacote de mísseis.',value:rocket.price,currency:rocket.currency,onConfirm:()=>{if(!buyRocketPack(id,false)){showToast('Saldo insuficiente');return;}buildAmmoButtons();renderShop();},confirmLabel:'CONFIRMAR COMPRA'});}

function renderTabs(container,map,active,onPick){container.innerHTML='';for(const [id,label] of Object.entries(map)){const b=document.createElement('button');b.className=`tab-btn ${active===id?'active':''}`;b.textContent=label;b.onclick=()=>onPick(id);container.appendChild(b);}}
function makeProductCard({id,name,desc,price,currency,type,subtype,badge,owned,onBuy,disabled=false,priceLabel=null,buttonLabel=null}){
  const card=document.createElement('div');card.className='product-card';
  const art=assetForProduct(id,type,subtype);
  card.innerHTML=`<div class="product-icon">${art?`<img src="${art}" alt="${name}" loading="lazy">`:productIcon(type,subtype)}</div><div>${badge?`<span class="badge ${badge==='ELITE'?'elite':''}">${badge}</span>`:''}<h3>${name}</h3></div><div class="product-desc">${desc}</div><div class="price ${currency}">${owned?'OBTIDO':(priceLabel||priceText(price,currency))}</div>`;
  const b=document.createElement('button');b.className='buy-btn';b.textContent=owned?'Obtido':(buttonLabel||'Comprar');b.disabled=owned||disabled;b.onclick=onBuy;card.appendChild(b);return card;
}
function renderShop(){
  if(!progress)return;renderTabs(ui.shopTabs,categories,state.shopTab,id=>{state.shopTab=id;renderShop();});ui.shopGrid.innerHTML='';
  if(state.shopTab==='ships'){
    const availableShips=Object.values(SHIPS).filter(s=>!progress.ownedShips.includes(s.id));
    if(!availableShips.length){
      ui.shopGrid.innerHTML='<div class="empty-state">Você já adquiriu todas as naves disponíveis deste catálogo.</div>';
    }else{
      availableShips.forEach(s=>{
        const event=!!s.eventOnly||s.shopAvailable===false;
        ui.shopGrid.appendChild(makeProductCard({
          id:s.id,name:s.name,
          desc:`${s.role}<br>HP ${fmt(s.hp)} • ${s.lasers} lasers • ${s.generators} geradores • ${s.extras} extras • VEL ${s.speed}${s.ability?`<br><b>Habilidade:</b> ${s.ability}`:''}`,
          price:premiumElitePrice(s.price,s.currency),currency:s.currency,type:'ship',
          badge:event?'EVENTO':(s.currency==='uridium'?'ELITE':'COMUM'),
          disabled:event,
          priceLabel:event?'EVENTO / MISSÃO / PASSE':null,
          buttonLabel:event?'BLOQUEADA':null,
          onBuy:()=>buyShip(s.id)
        }));
      });
    }
  }
  if(state.shopTab==='lasers')Object.values(ITEMS).filter(i=>i.type==='laser'&&i.shopAvailable!==false).forEach(i=>ui.shopGrid.appendChild(makeProductCard({id:i.id,name:i.name,desc:`Dano base: <b>${i.damage}</b>${i.alienDamage?` • Alien ${i.alienDamage}`:''}${i.alienBonus?` • +${Math.round(i.alienBonus*100)}% PvE`:''}<br>${i.description}`,price:premiumElitePrice(i.price,i.currency),currency:i.currency,type:i.type,badge:i.currency==='uridium'?'ELITE':'COMUM',onBuy:()=>buyItem(i.id)})));
  if(state.shopTab==='generators')Object.values(ITEMS).filter(i=>i.type==='generator').forEach(i=>{const event=!!i.eventOnly||i.shopAvailable===false;ui.shopGrid.appendChild(makeProductCard({id:i.id,name:i.name,desc:i.description,price:premiumElitePrice(i.price,i.currency),currency:i.currency,type:i.type,subtype:i.subtype,badge:event?'EVENTO':(i.currency==='uridium'?'ELITE':'COMUM'),disabled:event,priceLabel:event?'EVENTO / MISSÃO':null,buttonLabel:event?'BLOQUEADO':null,onBuy:()=>buyItem(i.id)}));});
  if(state.shopTab==='pet'){
    if(!progress.pet?.owned)ui.shopGrid.appendChild(makeProductCard({id:'petBaseUnit',name:'AUX-9 — Unidade Base',desc:`Companheiro autônomo com progressão até o nível ${PET_MAX_LEVEL}. Armas, escudos e módulos são comprados separadamente.`,price:premiumElitePrice(PET_BASE_PRICE,'uridium'),currency:'uridium',type:'pet',badge:'ELITE',onBuy:()=>buyPetUnit()}));
    else{
      const missing=Object.values(PET_GEARS).filter(g=>!progress.pet.gearsOwned?.[g.id]);
      if(!missing.length)ui.shopGrid.innerHTML='<div class="empty-state">Todos os módulos do AUX-9 já foram adquiridos. Eles ficam organizados em HANGAR → AUX-9</div>';
      else missing.forEach(g=>ui.shopGrid.appendChild(makeProductCard({id:g.id,name:`AUX-9 • ${g.name}`,desc:g.description,price:premiumElitePrice(g.cost,'uridium'),currency:'uridium',type:'petGear',badge:'ELITE',onBuy:()=>buyPetGear(g.id)})));
    }
  }
  if(state.shopTab==='drones')Object.values(ITEMS).filter(i=>i.type==='drone').forEach(i=>ui.shopGrid.appendChild(makeProductCard({id:i.id,name:i.name,desc:`${i.description}<br>Você possui ${progress.drones.filter(d=>d.type===i.id).length}. Total: ${progress.drones.length}/8`,price:i.price,currency:i.currency,type:i.type,badge:i.id==='iris'?'ELITE':'COMUM',disabled:progress.drones.length>=8,onBuy:()=>buyDrone(i.id)})));
  if(state.shopTab==='extras'){
    const available=Object.values(ITEMS).filter(i=>i.type==='extra'&&!ownsExtraItem(i.id));
    if(!available.length)ui.shopGrid.innerHTML='<div class="empty-state">Você já possui todos os EXTRAS disponíveis. Itens únicos comprados somem da Loja para manter seu inventário organizado.</div>';
    else available.forEach(i=>ui.shopGrid.appendChild(makeProductCard({id:i.id,name:i.name,desc:i.description,price:premiumElitePrice(i.price,i.currency),currency:i.currency,type:i.type,badge:i.currency==='uridium'?'ELITE':'COMUM',onBuy:()=>buyItem(i.id)})));
  }
  if(state.shopTab==='ammo')Object.values(LASER_AMMO).forEach(a=>ui.shopGrid.appendChild(makeProductCard({id:a.id,name:a.name,desc:`Pacote com ${fmt(a.pack)} disparos • ${a.shieldDrain?'captura escudo x2':`dano x${a.mult}`}<br>Em estoque: ${fmt(ammoQty(a.id))}`,price:a.price,currency:a.currency,type:'ammo',badge:a.currency==='uridium'?'ELITE':'COMUM',onBuy:()=>buyAmmo(a.id)})));
  if(state.shopTab==='rockets')Object.values(ROCKETS).forEach(r=>ui.shopGrid.appendChild(makeProductCard({id:r.id,name:r.name,desc:`Pacote com ${fmt(r.pack)} mísseis • dano ${fmt(r.damage)}<br>Em estoque: ${fmt(rocketQty(r.id))}`,price:r.price,currency:r.currency,type:'rocket',badge:r.currency==='uridium'?'ELITE':'COMUM',onBuy:()=>buyRockets(r.id)})));
  updateUI();
}

function returnShipEquipmentToInventory(){for(const k of ['lasers','generators','extras'])for(const id of progress.shipLoadout[k])if(id)addInventory(id);}
function switchShip(shipId){
  if(!canChangeEquipment()){showToast('Troca de nave/equipamentos disponível somente na sua base X-1');return;}
  if(!progress.ownedShips.includes(shipId)){showToast('Compre essa nave na Loja');return;}
  if(progress.repairRequired){
    if(shipId===STARTER_SHIP_ID)return recoverWithAurora();
    showToast('Sua nave está destruída • repare ou use a Aurora gratuita');openRepairModal();return;
  }
  if(shipId===progress.activeShipId)return;
  returnShipEquipmentToInventory();progress.activeShipId=shipId;progress.shipLoadout=blankLoadout(shipId);player.laserFiring=false;computeStats(false);saveGame();renderHangar();buildAmmoButtons();showToast(`${SHIPS[shipId].name} ativada. Equipamentos antigos voltaram ao inventário.`);
}
function equipShipItem(itemId){
  if(!canChangeEquipment()){showToast('Equipe itens somente dentro da sua base X-1');return;}
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
  if(!canChangeEquipment()){showToast('Remova equipamentos somente dentro da sua base X-1');return;}
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
function equipDroneItem(itemId){if(!canChangeEquipment()){showToast('Configure drones somente dentro da sua base X-1');return;}const item=ITEMS[itemId];if(!(item.type==='laser'||(item.type==='generator'&&item.subtype==='shield'))){showToast('Drones aceitam lasers ou geradores de escudo');return;}const drone=progress.drones.find(d=>d.slots.some(v=>!v));if(!drone){showToast('Nenhum slot livre nos drones');return;}if(!removeInventory(itemId))return;drone.slots[drone.slots.findIndex(v=>!v)]=itemId;computeStats(true);saveGame();renderHangar();buildAmmoButtons();}
function unequipDroneSlot(droneId,index){if(!canChangeEquipment()){showToast('Configure drones somente dentro da sua base X-1');return;}const d=progress.drones.find(x=>x.id===droneId);if(!d||!d.slots[index])return;addInventory(d.slots[index]);d.slots[index]=null;computeStats(true);saveGame();renderHangar();buildAmmoButtons();}
function performSellDrone(droneId){
  const d=progress.drones.find(x=>x.id===droneId);if(!d)return;
  const model=ITEMS[d.type];d.slots.filter(Boolean).forEach(addInventory);progress.drones=progress.drones.filter(x=>x.id!==droneId);
  const refund=itemSellValue(model);if(model.currency==='uridium')progress.profile.uridium+=refund;else progress.profile.credits+=refund;
  computeStats(true);saveGame();renderHangar();renderShop();buildAmmoButtons();updateUI();showToast(`${model.name} vendido por ${fmt(refund)} ${saleCurrencyLabel(model.currency)} • equipamentos retornaram ao inventário`);
}
function sellDrone(droneId){
  if(!canChangeEquipment()){showToast('Venda/configuração de drones somente na sua base X-1');return;}
  const d=progress.drones.find(x=>x.id===droneId);if(!d)return;const model=ITEMS[d.type],refund=itemSellValue(model);
  openSaleConfirm({title:'Vender drone?',itemName:model.name,detail:`Os ${d.slots.filter(Boolean).length} equipamento(s) instalado(s) voltarão ao inventário. O drone será removido definitivamente.`,value:refund,currency:model.currency,onConfirm:()=>performSellDrone(droneId)});
}

function sellEquippedSlot(key,index,droneId=null){
  if(!canChangeEquipment()){showToast('Venda de equipamento equipado somente dentro da sua base X-1');return;}
  const id=droneId?progress.drones.find(d=>d.id===droneId)?.slots?.[index]:progress.shipLoadout?.[key]?.[index];
  const item=id?ITEMS[id]:null;if(!item)return;const refund=itemSellValue(item);
  openSaleConfirm({title:'Vender equipamento equipado?',itemName:item.name,detail:'Ao confirmar, o item será removido do slot e vendido por 50% do valor base.',value:refund,currency:item.currency,onConfirm:()=>{if(droneId)unequipDroneSlot(droneId,index);else unequipShipSlot(key,index);performSellInventoryItem(id,1);}});
}
function sellPetEquippedSlot(kind,index){
  if(!canChangeEquipment()){showToast('Venda de equipamento do AUX-9 somente dentro da sua base X-1');return;}
  const list=kind==='laser'?progress.pet?.lasers:progress.pet?.shields;const id=list?.[index],item=id?ITEMS[id]:null;if(!item)return;const refund=itemSellValue(item);
  openSaleConfirm({title:'Vender equipamento do AUX-9?',itemName:item.name,detail:'Ao confirmar, o equipamento será removido do AUX-9 e vendido por 50% do valor base.',value:refund,currency:item.currency,onConfirm:()=>{unequipPetSlot(kind,index);performSellInventoryItem(id,1);}});
}
function slotCard(label,itemId,key,index,droneId=null){
  const el=document.createElement('div');el.className=`slot-card ${itemId?'':'empty'}`;const item=itemId?ITEMS[itemId]:null,art=item?GAME_ASSETS.equipment[itemId]:null;
  el.innerHTML=`<div class="slot-label">${label}</div>${item&&art?`<img class="slot-item-art" src="${art}" alt="${item.name}">`:''}<div class="slot-item">${item?item.name:'VAZIO'}</div>${item?`<div class="muted" style="font-size:10px">${item.description}</div>`:''}`;
  if(item){const a=document.createElement('div');a.className='slot-actions';const b=document.createElement('button');b.className='ghost-btn';b.textContent='Remover';b.onclick=()=>droneId?unequipDroneSlot(droneId,index):unequipShipSlot(key,index);a.appendChild(b);const sell=document.createElement('button');sell.className='danger-btn sell-item-btn';sell.textContent=`Vender 50%`;sell.title=`${fmt(itemSellValue(item))} ${item.currency==='uridium'?'STL':'CR'}`;sell.onclick=()=>sellEquippedSlot(key,index,droneId);a.appendChild(sell);el.appendChild(a);}return el;
}
function inventoryCard(itemId,count){
  const item=ITEMS[itemId],art=GAME_ASSETS.equipment[itemId];const el=document.createElement('div');el.className='inventory-card';
  el.innerHTML=`${art?`<img class="inventory-item-art" src="${art}" alt="${item.name}">`:''}<b>${item.name}</b><div class="qty">Quantidade: ${count}</div><div class="muted" style="font-size:10px;margin-top:4px">${item.description}</div>`;
  const actions=document.createElement('div');actions.className='inventory-actions';const shipBtn=document.createElement('button');shipBtn.className='ghost-btn';shipBtn.textContent='Nave';shipBtn.onclick=()=>equipShipItem(itemId);actions.appendChild(shipBtn);if((item.type==='laser'||(item.type==='generator'&&item.subtype==='shield'))&&progress.drones.length){const d=document.createElement('button');d.className='ghost-btn';d.textContent='Drone';d.onclick=()=>equipDroneItem(itemId);actions.appendChild(d);}const sell=document.createElement('button');sell.className='danger-btn sell-item-btn';sell.textContent=`Vender 50% • ${fmt(itemSellValue(item))} ${item.currency==='uridium'?'STL':'CR'}`;sell.onclick=()=>sellInventoryItem(itemId,1);actions.appendChild(sell);el.appendChild(actions);return el;
}

function renderHangarShips(){
  const wrap=document.createElement('div');wrap.className='ship-grid';
  const catalog=Object.values(SHIPS);
  const orderedShips=[
    ...catalog.filter(s=>progress.ownedShips.includes(s.id)),
    ...catalog.filter(s=>!progress.ownedShips.includes(s.id)),
  ];
  orderedShips.forEach(s=>{
    const owned=progress.ownedShips.includes(s.id),active=s.id===progress.activeShipId,c=document.createElement('div');c.className='ship-card';
    c.innerHTML=`<div class="ship-visual"><img src="${GAME_ASSETS.ships[s.id]||GAME_ASSETS.ships.phoenix}" alt="${s.name}"></div><div><span class="badge">${owned?'OBTIDA':'BLOQUEADA'}</span><h3>${s.name}</h3></div><div class="ship-stats">HP ${fmt(s.hp)}<br>Lasers ${s.lasers} • Geradores ${s.generators} • Extras ${s.extras}<br>VEL ${s.speed} • Cargo ${fmt(s.cargo)}</div>`;
    const event=!!s.eventOnly||s.shopAvailable===false;const b=document.createElement('button');b.className='equip-btn';b.textContent=active?'Nave ativa':owned?'Usar nave':event?'EVENTO / MISSÃO / PASSE':'Comprar na Loja';b.disabled=active||(!owned&&event);b.onclick=()=>owned?switchShip(s.id):(ui.hangarModal.classList.add('hidden'),openShop('ships'));c.appendChild(b);wrap.appendChild(c);
  });return wrap;
}
function renderHangarEquipment(){
  const ship=SHIPS[progress.activeShipId],root=document.createElement('div');root.className='hangar-layout';const left=document.createElement('div');left.className='hangar-column';const right=document.createElement('div');right.className='hangar-column';
  const repairBot=activeRepairBot(),extraCap=shipExtraCapacity(),extraBonus=extraCap-ship.extras;
  const summary=document.createElement('div');summary.className='summary-grid';summary.innerHTML=`<div class="stat-card">Dano por tiro<strong>${fmt(player.laserDamage)}</strong></div><div class="stat-card">Escudo<strong>${fmt(player.maxShield)}</strong></div><div class="stat-card">Absorção<strong>${player.shieldAbsorption}%</strong></div><div class="stat-card">Velocidade<strong>${fmt(player.speed)}</strong></div><div class="stat-card">Slots EXTRAS<strong>${extraCap}${extraBonus?` (+${extraBonus})`:''}</strong></div><div class="stat-card">Reparo Auto<strong>${repairBot?`+${fmt(repairBot.id==='repElite'?10000:5000)} HP/s`:'OFF'}</strong></div><div class="stat-card">Porão<strong>${fmt(cargoCapacity())}${cargoExtraBonus()?` (+${fmt(cargoExtraBonus())})`:''}</strong></div>`;left.appendChild(summary);
  for(const [key,title] of [['lasers',`Lasers da ${ship.name} (${ship.lasers})`],['generators',`Geradores (${ship.generators})`],['extras',`Extras (${extraCap}${extraBonus?` = ${ship.extras} + ${extraBonus}`:''})`]]){const box=document.createElement('div');box.className='section-box';box.innerHTML=`<h3>${title}</h3>`;const grid=document.createElement('div');grid.className='slot-grid';progress.shipLoadout[key].forEach((id,i)=>grid.appendChild(slotCard(`${title.split(' ')[0]} ${i+1}`,id,key,i)));box.appendChild(grid);left.appendChild(box);}
  const inv=document.createElement('div');inv.className='section-box';inv.innerHTML='<h3>Inventário disponível</h3>';const grid=document.createElement('div');grid.className='inventory-grid';const entries=Object.entries(progress.inventory).filter(([id,q])=>q>0&&ITEMS[id]);if(!entries.length)grid.innerHTML='<div class="empty-state">Seu inventário de equipamentos está vazio. Compre itens na Loja.</div>';else entries.forEach(([id,q])=>grid.appendChild(inventoryCard(id,q)));inv.appendChild(grid);right.appendChild(inv);root.append(left,right);return root;
}
function renderHangarDrones(){const root=document.createElement('div');const info=document.createElement('div');info.className='section-box';info.innerHTML=`<h3>Esquadrão de drones — ${progress.drones.length}/8</h3><div class="muted" style="font-size:12px">Halo: 1 slot • Nova: 2 slots. Os drones permanecem equipados quando você troca de nave.</div>`;root.appendChild(info);const grid=document.createElement('div');grid.className='drone-grid';if(!progress.drones.length){grid.innerHTML='<div class="empty-state">Você ainda não possui drones. Vá à Loja → Drones.</div>';}progress.drones.forEach((d,idx)=>{const model=ITEMS[d.type],c=document.createElement('div');c.className='drone-card';c.innerHTML=`<img class="drone-art" src="${GAME_ASSETS.drones[d.type]}" alt="${model.name}"><div><span class="badge ${d.type==='iris'?'elite':''}">${d.type==='iris'?'ELITE':'COMUM'}</span><h3>${model.name} #${idx+1}</h3></div><div class="drone-stats">${model.slots} slot${model.slots>1?'s':''} • aceita laser ou gerador de escudo</div>`;const sg=document.createElement('div');sg.className='slot-grid';d.slots.forEach((id,i)=>sg.appendChild(slotCard(`Slot ${i+1}`,id,null,i,d.id)));c.appendChild(sg);const rm=document.createElement('button');rm.className='danger-btn';rm.textContent=`Vender drone • 50% (${fmt(itemSellValue(model))} ${model.currency==='uridium'?'STL':'CR'})`;rm.onclick=()=>sellDrone(d.id);c.appendChild(rm);grid.appendChild(c);});root.appendChild(grid);return root;}
function renderHangarPet(){const root=document.createElement('div');root.className='hangar-embedded-panel pet-hangar-panel';renderPet(root);return root;}
function renderHangarPilot(){
  normalizePilotBio();const p=progress.pilotBio,spent=pilotSpentPoints(),avail=pilotAvailablePoints(),next=p.totalPoints+1;
  const root=document.createElement('div');root.className='hangar-embedded-panel pilot-hangar-panel';
  const summary=document.createElement('div');summary.className='pilot-wallet-grid';summary.innerHTML=`<div><span>NÚCLEOS QUÂNTICOS</span><b>${fmt(p.logDisks)}</b></div><div><span>PP OBTIDOS</span><b>${p.totalPoints}/${PILOT_POINT_MAX}</b></div><div><span>PP DISPONÍVEIS</span><b>${avail}</b></div><div><span>PP INVESTIDOS</span><b>${spent}</b></div>`;root.appendChild(summary);
  const research=document.createElement('section');research.className='pilot-research-panel';
  const nextBox=document.createElement('div');if(p.totalPoints>=PILOT_POINT_MAX)nextBox.innerHTML='<div class="eyebrow">PESQUISA COMPLETA</div><h3>50 / 50 PP</h3><div class="muted">Limite máximo atingido.</div>';
  else{const logs=pilotPointLogCost(next);nextBox.innerHTML=`<div class="eyebrow">PRÓXIMO PONTO</div><h3>PP #${next}</h3><div>${fmt(logs)} Núcleos Quânticos • ${fmt(logs*LOG_DISK_URI_PRICE)} STL equivalente</div>`;const b=document.createElement('button');b.className='primary-btn';b.textContent='CONVERTER EM 1 PP';b.disabled=p.logDisks<logs;b.onclick=()=>convertPilotPoint();nextBox.appendChild(b);}research.appendChild(nextBox);
  const store=document.createElement('div');store.innerHTML='<div class="eyebrow">NÚCLEOS QUÂNTICOS • 300 STL CADA</div>';const row=document.createElement('div');row.className='pilot-log-buttons';[1,10,100,500].forEach(q=>{const b=document.createElement('button');b.className='small-btn';b.innerHTML=`${q}x <small>${fmt(q*LOG_DISK_URI_PRICE)} STL</small>`;b.disabled=progress.profile.uridium<q*LOG_DISK_URI_PRICE;b.onclick=()=>buyLogDisks(q);row.appendChild(b);});store.appendChild(row);research.appendChild(store);
  const reset=document.createElement('div');const resetCost=1000*Math.pow(2,p.resetCount);reset.innerHTML=`<div class="eyebrow">RECONFIGURAÇÃO</div><div>Reset #${p.resetCount+1}: ${fmt(resetCost)} STL</div>`;const rb=document.createElement('button');rb.className='ghost-btn';rb.textContent='RESETAR ÁRVORE';rb.disabled=spent<=0||progress.profile.uridium<resetCost;rb.onclick=()=>resetPilotTree();reset.appendChild(rb);research.appendChild(reset);root.appendChild(research);
  const tree=document.createElement('div');tree.className='pilot-skill-tree';for(const [branch,meta] of Object.entries(PILOT_BRANCHES)){const col=document.createElement('section');col.className=`pilot-branch ${meta.className}`;col.innerHTML=`<div class="pilot-branch-title">${meta.label}</div>`;Object.values(PILOT_SKILLS).filter(skill=>skill.branch===branch).forEach(skill=>{const lv=pilotSkillLevel(skill.id),maxed=lv>=skill.max,req=pilotRequirementMet(skill),cost=maxed?0:pilotSkillCreditCost(skill,lv+1),card=document.createElement('article');card.className=`pilot-skill-node${maxed?' maxed':''}${!req?' locked':''}`;card.innerHTML=`<div class="pilot-skill-head"><b>${skill.name}</b><span>${lv}/${skill.max}</span></div><div class="pilot-skill-desc">${skill.desc}</div><div class="pilot-skill-bonus">ATUAL: <b>${pilotSkillBonusLabel(skill,lv)}</b>${!maxed?` • PRÓXIMO: <b>${pilotSkillBonusLabel(skill,lv+1)}</b>`:''}</div>${skill.requires?`<div class="pilot-skill-req">${req?'✓':'🔒'} Requer ${PILOT_SKILLS[skill.requires].name}</div>`:''}`;const b=document.createElement('button');b.className=maxed?'small-btn gold':'small-btn';b.disabled=maxed||!req||avail<=0||progress.profile.credits<cost;b.textContent=maxed?'MAX':`UP • 1 PP + ${fmt(cost)} CR`;b.onclick=()=>upgradePilotSkill(skill.id);card.appendChild(b);col.appendChild(card);});tree.appendChild(col);}root.appendChild(tree);return root;
}
function renderHangar(){
  if(!progress)return;
  const tabs={ships:'NAVES',equipment:'EQUIPAMENTOS',drones:'DRONES',pet:'AUX-9',pilot:'PERFIL DE PILOTO'};
  renderTabs(ui.hangarTabs,tabs,state.hangarTab,id=>{state.hangarTab=id;renderHangar();});ui.hangarContent.innerHTML='';computeStats(true);
  const content=state.hangarTab==='ships'?renderHangarShips():state.hangarTab==='equipment'?renderHangarEquipment():state.hangarTab==='drones'?renderHangarDrones():state.hangarTab==='pet'?renderHangarPet():renderHangarPilot();
  ui.hangarContent.appendChild(content);updateUI();
}

function petEquipCard(kind,index){
  const pet=progress.pet,list=kind==='laser'?pet.lasers:pet.shields,id=list[index],item=id?ITEMS[id]:null;
  const card=document.createElement('div');card.className=`pet-slot ${item?'filled':''}`;
  card.innerHTML=`<div class="slot-label">${kind==='laser'?'ARMA':'ESCUDO'} ${index+1}</div><div class="slot-item">${item?item.name:'VAZIO'}</div>${item?`<div class="muted">${item.description}</div>`:'<div class="muted">Slot liberado</div>'}`;
  if(item){const actions=document.createElement('div');actions.className='slot-actions';const b=document.createElement('button');b.className='ghost-btn';b.textContent='Remover';b.onclick=()=>unequipPetSlot(kind,index);actions.appendChild(b);const sell=document.createElement('button');sell.className='danger-btn sell-item-btn';sell.textContent='Vender 50%';sell.title=`${fmt(itemSellValue(item))} ${item.currency==='uridium'?'STL':'CR'}`;sell.onclick=()=>sellPetEquippedSlot(kind,index);actions.appendChild(sell);card.appendChild(actions);}
  return card;
}
function petLockedCard(kind,index){
  const slot=index+1,cost=petSlotCost(slot),card=document.createElement('div');card.className='pet-slot locked';
  const available=slot<=progress.pet.level;
  card.innerHTML=`<div class="slot-label">${kind==='laser'?'ARMA':'ESCUDO'} ${slot}</div><div class="slot-item">🔒 ${available?'LIBERÁVEL':'NÍVEL '+slot}</div><div class="muted">${available?`${fmt(cost)} STL para liberar`:`Alcance o nível ${slot} do AUX-9`}</div>`;
  const b=document.createElement('button');b.className='ghost-btn';b.textContent=available?`Liberar • ${fmt(cost)} STL`:`Nível ${slot}`;b.disabled=!available;b.onclick=()=>unlockPetSlot(kind);card.appendChild(b);return card;
}
function renderPet(root=ui.petContent){
  if(!progress?.pet||!root)return;
  const pet=progress.pet;root.innerHTML='';
  if(!pet.owned){
    const hero=document.createElement('div');hero.className='pet-hero pet-store-hero';hero.innerHTML=`<div class="pet-avatar"><img src="${GAME_ASSETS.drones.pet}" alt="AUX-9"></div><div class="pet-hero-copy"><div class="eyebrow">UNIDADE AUX-9</div><h2>AUX-9 ainda não adquirido</h2><p class="muted">O AUX-9 não é mais gratuito. Adquira a unidade base para desbloquear progressão, armas, escudos, coleta, reparo e Nova Burst.</p><div class="price uridium">${fmt(PET_BASE_PRICE)} STL</div></div>`;const b=document.createElement('button');b.className='primary-btn';b.textContent=`COMPRAR AUX-9 • ${fmt(PET_BASE_PRICE)} STL`;b.disabled=progress.profile.uridium<PET_BASE_PRICE;b.onclick=()=>buyPetUnit();hero.querySelector('.pet-hero-copy').appendChild(b);root.appendChild(hero);return;
  }
  const base=levelXpThreshold(pet.level),need=pet.level<PET_MAX_LEVEL?petLevelXp(pet.level):base,pct=pet.level>=PET_MAX_LEVEL?100:Math.min(100,(pet.xp-base)/Math.max(1,need-base)*100);
  const hero=document.createElement('div');hero.className='pet-hero';
  hero.innerHTML=`<div class="pet-avatar"><img src="${pet.level>=10?GAME_ASSETS.drones.petElite:GAME_ASSETS.drones.pet}" alt="AUX-9"></div><div class="pet-hero-copy"><div class="eyebrow">AUX-9</div><h2>Nível ${pet.level} / ${PET_MAX_LEVEL}</h2><div class="pet-xpbar"><span style="width:${pct}%"></span></div><div class="muted">${pet.level>=PET_MAX_LEVEL?'Nível máximo':`${fmt(pet.xp)} XP total • próximo ${fmt(need)}`} • Coleta ${fmt(petCollectionRange())}u • Guardião ${fmt(petCombatSearchRange())}u • Dano ${fmt(petDamage())} • Escudo ${fmt(petMaxShield())}</div></div>`;
  root.appendChild(hero);

  const gears=document.createElement('div');gears.className='section-box';gears.innerHTML='<h3>Modos / Extras do AUX-9</h3><div class="muted">Apenas um modo fica ativo por vez. Os módulos são permanentes depois de comprados.</div>';
  const gearGrid=document.createElement('div');gearGrid.className='pet-gear-grid';
  const off=document.createElement('button');off.className=`pet-gear ${pet.activeGear==='off'?'active':''}`;off.innerHTML='<b>COMPANHIA</b><small>Acompanha sua nave e patrulha ao redor. Não ataca nem coleta.</small>';off.onclick=()=>setPetGear('off');gearGrid.appendChild(off);
  Object.values(PET_GEARS).forEach(g=>{const owned=pet.gearsOwned[g.id],b=document.createElement('button');b.className=`pet-gear ${pet.activeGear===g.id?'active':''}`;const gearArt={guard:GAME_ASSETS.equipment.autoLaserCpu,box:GAME_ASSETS.equipment.ammoAutoBuyCpu,ore:GAME_ASSETS.equipment.rocketTurboCpu,repair:GAME_ASSETS.equipment.rep2,kami:GAME_ASSETS.equipment.autoRocketCpu}[g.id];b.innerHTML=`${gearArt?`<img class="pet-gear-art" src="${gearArt}" alt="">`:''}<b>${g.name}</b><small>${g.description}</small><em>${owned?'COMPRADO':'ELITE • '+fmt(g.cost)+' STL'}</em>`;b.onclick=()=>owned?(g.id==='kami'?triggerPetKamikaze():setPetGear(g.id)):buyPetGear(g.id);gearGrid.appendChild(b);});
  gears.appendChild(gearGrid);root.appendChild(gears);

  for(const kind of ['laser','shield']){
    const unlocked=kind==='laser'?pet.laserSlotsUnlocked:pet.shieldSlotsUnlocked;
    const box=document.createElement('div');box.className='section-box';box.innerHTML=`<h3>${kind==='laser'?'Armas':'Escudos'} — ${unlocked}/${Math.min(pet.level,PET_SLOT_LEVEL_CAP)} liberados</h3><div class="muted">O nível do AUX-9 define quantos espaços podem ser comprados. O slot 1 já vem liberado.</div>`;
    const grid=document.createElement('div');grid.className='pet-slot-grid';
    for(let i=0;i<Math.min(pet.level,PET_SLOT_LEVEL_CAP);i++)grid.appendChild(i<unlocked?petEquipCard(kind,i):petLockedCard(kind,i));
    box.appendChild(grid);root.appendChild(box);
  }

  const inv=document.createElement('div');inv.className='section-box';inv.innerHTML='<h3>Equipamentos disponíveis no inventário</h3>';
  const grid=document.createElement('div');grid.className='inventory-grid';
  const entries=Object.entries(progress.inventory).filter(([id,q])=>q>0&&ITEMS[id]&&(ITEMS[id].type==='laser'||(ITEMS[id].type==='generator'&&ITEMS[id].subtype==='shield')));
  if(!entries.length)grid.innerHTML='<div class="empty-state">Compre lasers ou geradores de escudo na Loja e eles aparecerão aqui.</div>';
  else entries.forEach(([id,q])=>{const item=ITEMS[id],c=document.createElement('div');c.className='inventory-card';c.innerHTML=`${GAME_ASSETS.equipment[id]?`<img class="inventory-item-art" src="${GAME_ASSETS.equipment[id]}" alt="${item.name}">`:''}<b>${item.name}</b><div class="qty">Quantidade: ${q}</div><div class="muted">${item.description}</div>`;const actions=document.createElement('div');actions.className='inventory-actions';const b=document.createElement('button');b.className='ghost-btn';b.textContent=item.type==='laser'?'Equipar no AUX-9 (arma)':'Equipar no AUX-9 (escudo)';b.onclick=()=>equipPetItem(id,item.type==='laser'?'laser':'shield');actions.appendChild(b);const sell=document.createElement('button');sell.className='danger-btn sell-item-btn';sell.textContent=`Vender 50% • ${fmt(itemSellValue(item))} ${item.currency==='uridium'?'STL':'CR'}`;sell.onclick=()=>sellInventoryItem(id,1);actions.appendChild(sell);c.appendChild(actions);grid.appendChild(c);});
  inv.appendChild(grid);root.appendChild(inv);
}
function refreshPetViews(){
  renderPet();updatePetFloat();
  if(ui.hangarModal&&!ui.hangarModal.classList.contains('hidden')&&state.hangarTab==='pet')renderHangar();
}
function openPet(){if(!progress?.pet?.owned){openShop('pet');showToast(`AUX-9 disponível na Loja por ${fmt(PET_BASE_PRICE)} STL`);return;}renderPet();ui.petModal.classList.remove('hidden');}

function cargoSaleValue(){let total=0;for(const [id,qty] of Object.entries(progress.cargo||{}))total+=(RESOURCES[id]?.sell||0)*qty;return total;}
function sellCargoResource(id){if(!isAtTrader()){showToast('Venda disponível somente na base X-1');return;}const qty=progress.cargo[id]||0,price=RESOURCES[id]?.sell||0;if(qty<=0||price<=0)return;progress.profile.credits+=qty*price;delete progress.cargo[id];saveGame();renderCargo();updateUI();showToast(`${qty} ${id} vendidos por ${fmt(qty*price)} CR`);}
function sellAllCargo(){if(!isAtTrader()){showToast('Volte à base X-1 para vender');return;}let total=0;for(const [id,qty] of Object.entries(progress.cargo||{})){const price=RESOURCES[id]?.sell||0;if(price>0){total+=qty*price;delete progress.cargo[id];}}progress.profile.credits+=total;saveGame();renderCargo();updateUI();showToast(total?`Porão vendido: +${fmt(total)} CR`:'Nada vendável no porão');}
function renderCargo(){if(!progress)return;const atBase=isAtTrader();const xeno=progress.cargo?.Xenomit||0;const cargoBonus=cargoExtraBonus();ui.cargoSummary.innerHTML=`<b>${fmt(cargoUsed())}/${fmt(cargoCapacity())}</b> unidades ocupadas${cargoBonus?` • Expansão equipada: <b>+${fmt(cargoBonus)}</b>`:''} • Valor vendável: <b>${fmt(cargoSaleValue())} CR</b><br><span class="muted">${atBase?'Trader disponível: você está na base.':'Para vender recursos, retorne à Zona Segura do seu X-1.'} ${xeno?`• Voidite: <b>${fmt(xeno)}</b> (não ocupa porão)`:''}</span>`;ui.cargoGrid.innerHTML='';const entries=Object.entries(progress.cargo||{}).filter(([,q])=>q>0);if(!entries.length){ui.cargoGrid.innerHTML='<div class="empty-state">Seu porão está vazio. Colete minérios no mapa ou caixas deixadas pelos NPCs.</div>';}for(const [id,qty] of entries){const r=RESOURCES[id]||{name:id,color:'#fff',sell:0};const special=id==='Xenomit';const c=document.createElement('div');c.className='cargo-card';c.innerHTML=`<div class="cargo-ore" style="--ore:${r.color}"><img src="${GAME_ASSETS.resources[id]||GAME_ASSETS.loot.cargo}" alt="${r.name}"></div><div><b>${r.name}</b><div class="muted">${fmt(qty)} un. • ${special?'especial • não ocupa porão':(r.sell?fmt(r.sell)+' CR/un.':'não vendável')}</div></div>`;const b=document.createElement('button');b.className='ghost-btn';b.textContent=r.sell?'Vender':'Guardar';b.disabled=!atBase||!r.sell;b.onclick=()=>sellCargoResource(id);c.appendChild(b);ui.cargoGrid.appendChild(c);}ui.sellAllCargo.disabled=!atBase||cargoSaleValue()<=0;}
function openCargo(){if(!isAtTrader()){showToast('Venda de recursos disponível somente na base X-1');return;}closeNavigationModals(ui.cargoModal);renderCargo();ui.cargoModal.classList.remove('hidden');}

// ===================== V12 LOJA PREMIUM =====================
function premiumProductIcon(product){
  if(product.category==='battle_pass')return '🎫';
  if(product.category==='premium')return '✦';
  const item=product.item_id?ITEMS[product.item_id]:null;
  const art=item?assetForProduct(product.item_id,item.type,item.subtype):null;
  return art?`<img src="${art}" alt="${escHtml(product.name)}">`:'◆';
}
function formatPremiumUntil(value){if(!value)return 'INATIVO';const d=new Date(value);return Number.isNaN(d.getTime())?'INATIVO':d.toLocaleString('pt-BR');}
function renderPremiumShop(){
  if(!ui.premiumProductGrid||!ui.premiumBenefits)return;
  const st=premiumRuntime.state||{},products=Array.isArray(st.catalog)?st.catalog:[];
  if(ui.premiumModeChip){ui.premiumModeChip.textContent=st.can_purchase?'ADMIN':'CATÁLOGO';ui.premiumModeChip.classList.toggle('active',!!st.can_purchase);}
  ui.premiumBenefits.innerHTML=`<div><span>PREMIUM 30D</span><b>${st.premium_active?'ATIVO':'INATIVO'}</b><small>${st.premium_active?`até ${formatPremiumUntil(st.premium_until)}`:'Reparo grátis • regen 2X • míssil -20% • Elite -5% • Portais -10%'}</small></div><div><span>PASSE PREMIUM</span><b>${st.battle_pass_active?'ATIVO':'INATIVO'}</b><small>Temporada ${escHtml(st.current_season||battlePassSeasonKey())} • 2X ganhos + Elite + Reclaimer T30</small></div>`;
  if(!products.length){ui.premiumProductGrid.innerHTML='<div class="muted">Catálogo Premium indisponível.</div>';return;}
  ui.premiumProductGrid.innerHTML=products.map(p=>{
    const owned=p.category==='premium'?!!st.premium_active:p.category==='battle_pass'?!!st.battle_pass_active:false;
    const typeLabel=p.category==='elite_item'?'ITEM ELITE':p.category==='battle_pass'?'PASSE MENSAL':'ASSINATURA';
    return `<article class="premium-product ${p.category}"><div class="premium-product-icon">${premiumProductIcon(p)}</div><div class="premium-product-copy"><span class="premium-product-type">${typeLabel}</span><h3>${escHtml(p.name)}</h3><p>${escHtml(p.description||'')}</p></div><div class="premium-product-price">R$ ${Number(p.price_brl||0).toFixed(2).replace('.',',')}</div><button class="${st.can_purchase?'gold-btn':'ghost-btn'}" data-premium-buy="${escHtml(p.id)}" ${owned||!st.can_purchase?'disabled':''}>${owned?'ATIVO / OBTIDO':st.can_purchase?'COMPRAR':'INDISPONÍVEL'}</button></article>`;
  }).join('');
  ui.premiumProductGrid.querySelectorAll('[data-premium-buy]').forEach(b=>b.onclick=()=>testPremiumPurchaseNow(b.dataset.premiumBuy));
}
async function refreshAndRenderPremium(force=false){await refreshPremiumState(force);renderPremiumShop();if(ui.passModal&&!ui.passModal.classList.contains('hidden'))renderProgression();renderGalaxyGate();renderShop();}
async function testPremiumPurchaseNow(productId){
  if(!premiumCanPurchase()){showToast('Compras ainda não foram liberadas para jogadores');return;}
  try{
    await flushCloudSave(true);
    const result=await testPurchasePremiumOnline(productId);
    if(result?.category==='elite_item'&&result.item_id){progress.inventory ||= {};progress.inventory[result.item_id]=(progress.inventory[result.item_id]||0)+Math.max(1,Number(result.quantity)||1);saveGame();await flushCloudSave(true);showToast(`${ITEMS[result.item_id]?.name||result.item_id} recebido`,'reward');}
    else if(result?.category==='battle_pass')showToast('Passe Premium ativado nesta temporada','reward');
    else if(result?.category==='premium')showToast('PREMIUM ativado por +30 dias','reward');
    await refreshAndRenderPremium(true);
  }catch(e){showToast(String(e?.message||e));}
}
async function openPremiumShop(){closeNavigationModals(ui.premiumModal);ui.premiumModal?.classList.remove('hidden');if(ui.premiumProductGrid)ui.premiumProductGrid.innerHTML='<div class="muted">Sincronizando Loja Premium...</div>';await refreshPremiumState(true);renderPremiumShop();}

function openShop(tab='ships'){closeNavigationModals(ui.shopModal);state.shopTab=tab;refreshPremiumState().finally(()=>{renderShop();ui.shopModal.classList.remove('hidden');});}
function openHangar(tab='ships'){closeNavigationModals(ui.hangarModal);state.hangarTab=tab;renderHangar();ui.hangarModal.classList.remove('hidden');if(!canChangeEquipment())showToast('Hangar em modo consulta • alterações de equipamento só funcionam na base X-1');}

function alphaPieceCount(){return alphaGate().pieces.length;}
function addAlphaPiece(){
  const a=alphaGate(),gd=galaxyGateDef(),missing=Array.from({length:gd.pieces},(_,i)=>i+1).filter(n=>!a.pieces.includes(n));
  if(!missing.length){a.built=true;return null;}
  const piece=missing[Math.floor(Math.random()*missing.length)];a.pieces.push(piece);a.pieces.sort((x,y)=>x-y);
  if(a.pieces.length>=gd.pieces){a.built=true;showToast(`PORTAL ASTRAL ${gd.label} COMPLETO — ${gd.pieces}/${gd.pieces} peças!`);}
  return piece;
}
function randomChoice(list){return list[Math.floor(Math.random()*list.length)];}
function rollAlphaOnce(){
  const g=progress.galaxyGate,a=alphaGate();normalizePilotBio();
  const luck=pilotRareChanceBonus();let r=Math.random()*100;if(luck>0)r=Math.max(0,r-luck*18);
  if(a.built&&r<12)r=12+Math.random()*88;
  if(r<12){const piece=addAlphaPiece();return {kind:'piece',label:`Peça ${galaxyGateDef().label} #${piece}`,piece};}
  if(r<20){const qty=Math.max(1,Math.round(rand(1,5)));progress.pilotBio.logDisks+=qty;return {kind:'logdisk',label:`Núcleos Quânticos +${qty}`};}
  if(r<45){const id=randomChoice(Object.keys(LASER_AMMO)),base={lcb10:300,mcb25:200,mcb50:120,ucb100:70}[id]||100,qty=base*Math.ceil(rand(1,4));progress.ammo[id]=(progress.ammo[id]||0)+qty;return {kind:'ammo',label:`${LASER_AMMO[id].name} +${fmt(qty)}`};}
  if(r<64){const id=randomChoice(Object.keys(ROCKETS)),base={r310:15,plt2026:10,plt2021:7,plt3030:5}[id]||5,qty=base*Math.ceil(rand(1,4));progress.rockets[id]=(progress.rockets[id]||0)+qty;return {kind:'rocket',label:`${ROCKETS[id].name} +${fmt(qty)}`};}
  if(r<80){const qty=Math.round(rand(1500,12000));progress.profile.credits+=qty;return {kind:'credits',label:`Créditos +${fmt(qty)}`};}
  if(r<90){const qty=Math.max(1,Math.round(rand(4,18)));progress.cargo.Xenomit=(progress.cargo.Xenomit||0)+qty;return {kind:'xenomit',label:`Voidite +${fmt(qty)}`};}
  if(r<95){g.jumpBonus++;return {kind:'jump',label:'Bônus de Salto +1'};}
  g.repairBonus++;return {kind:'repair',label:'Bônus de Reparo +1'};
}
function spinAlpha(amount){
  normalizeGalaxyGateState();const cost=amount*alphaSpinUnitCost();
  if(progress.profile.uridium<cost){showToast(`Faltam ${fmt(cost-progress.profile.uridium)} STL para ${amount} sorteio${amount>1?'s':''}`);return;}
  openSpendConfirm({title:`Girar portal ${galaxyGateDef().label}?`,itemName:`${amount} sorteio${amount>1?'s':''} do Portal Astral`,detail:`Confirme para gastar Stellarium na montagem do portal ${galaxyGateDef().label}.`,value:cost,currency:'uridium',confirmLabel:'CONFIRMAR GIRO',onConfirm:()=>{if(progress.profile.uridium<cost){showToast(`Faltam ${fmt(cost-progress.profile.uridium)} STL para ${amount} sorteio${amount>1?'s':''}`);return;}progress.profile.uridium-=cost;const results=[];for(let i=0;i<amount;i++)results.push(rollAlphaOnce());progress.galaxyGate.lastResults=results.slice(-12);const summary={};results.forEach(r=>summary[r.label]=(summary[r.label]||0)+1);const pieces=results.filter(r=>r.kind==='piece').length;const lines=Object.entries(summary).slice(0,12).map(([label,count])=>`${count>1?`${count}× `:''}${label}`);ui.gateResultBox.innerHTML=`<b>${amount} sorteio${amount>1?'s':''} • ${fmt(cost)} STL</b>${pieces?`<div class="gate-piece-win">✦ ${pieces} peça${pieces>1?'s':''} ${galaxyGateDef().label} encontrada${pieces>1?'s':''}</div>`:''}<div>${lines.join(' • ')}</div>`;saveGame();refreshAmmoCounters();renderGalaxyGate();updateUI();}});
}
function useGalaxyRepairBonus(){
  normalizeGalaxyGateState();
  if(progress.galaxyGate.repairBonus<=0){showToast('Você não possui Bônus de Reparo');return;}
  if(!isAtTrader()){showToast('Use o Bônus de Reparo na base X-1');return;}
  progress.galaxyGate.repairBonus--;player.hp=player.maxHp;player.shield=player.maxShield;progress.hp=player.hp;progress.shield=player.shield;saveGame();renderGalaxyGate();updateUI();showToast('Nave totalmente reparada com 1 Bônus de Reparo');
}
function renderGateRounds(){
  if(!ui.gateRoundsGrid)return;
  ui.gateRoundsGrid.innerHTML=galaxyGateDef().rounds.map(r=>`<div class="gate-round-card"><div class="gate-round-num">ROUND ${r.round}</div><b>${r.name}</b><div>${r.waves.map((w,i)=>`<span>O${i+1}: ${w.count} ${NPC_TYPES[w.type].name}</span>`).join('')}</div></div>`).join('');
}
function renderGateHud(){
  if(!ui.gateHud||!progress)return;
  const active=isGalaxyGateMap()&&alphaGate().run?.active;ui.gateHud.classList.toggle('hidden',!active);if(!active)return;if(ui.gateHudTitle)ui.gateHudTitle.textContent=`PORTAL ASTRAL ${galaxyGateDef().label}`;
  const a=alphaGate(),run=a.run,def=galaxyGateDef().rounds[run.round-1],now=Date.now();
  ui.gateHudRound.textContent=`${run.round} / ${galaxyGateDef().rounds.length}`;
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
  if(!progress||!ui.gatePieceGrid)return;normalizeGalaxyGateState();const g=progress.galaxyGate,gd=galaxyGateDef(),a=alphaGate(),count=a.pieces.length,atBase=isAtTrader(),unlocked=gateUnlocked(gd.key);
  if(ui.gatePieceBadge)ui.gatePieceBadge.textContent=`${gd.label} ${count}/${gd.pieces}`;ui.gatePiecesText.textContent=`${count} / ${gd.pieces}`;ui.gateLivesText.textContent=a.lives;ui.gateCompletedText.textContent=a.completed;ui.gateUriText.textContent=fmt(progress.profile.uridium);ui.gateJumpBonus.textContent=fmt(g.jumpBonus);ui.gateRepairBonus.textContent=fmt(g.repairBonus);if(ui.gateLogDisks){normalizePilotBio();ui.gateLogDisks.textContent=fmt(progress.pilotBio.logDisks);}if(ui.gateCoreLabel)ui.gateCoreLabel.textContent=gd.label;if(ui.gateProtocolLabel)ui.gateProtocolLabel.textContent=`PORTAL ${gd.label}`;if(ui.gateCombatProtocol)ui.gateCombatProtocol.textContent=`PROTOCOLO ${gd.label} • ${gd.rounds.length} ROUNDS • 3 VIDAS • NPC ${Math.round(gd.enemyScale*100)}%`;if(ui.gateRewardNote)ui.gateRewardNote.innerHTML=`${gd.label} aplica dificuldade <b>${Math.round(gd.enemyScale*100)}%</b> e fecha <b>${gd.totalRewardMult}X</b> no total • ${gd.logReward} Núcleos Quânticos ao concluir.`;
  if(ui.gateProtocolTabs)ui.gateProtocolTabs.querySelectorAll('[data-gate-protocol]').forEach(b=>{const key=b.dataset.gateProtocol;b.classList.toggle('active',key===gd.key);const locked=!gateUnlocked(key);b.disabled=locked;b.title=locked?`${GALAXY_GATE_DEFS[key].label} ainda está bloqueado`:'';});
  ui.gatePieceGrid.innerHTML=Array.from({length:gd.pieces},(_,i)=>`<span class="gate-piece ${a.pieces.includes(i+1)?'found':''}" title="Peça ${i+1}">${i+1}</span>`).join('');ui.gateSpinButtons.innerHTML='';[1,5,10,50,100].forEach(n=>{const cost=n*alphaSpinUnitCost(),b=document.createElement('button');b.className='small-btn gate-spin-btn';b.innerHTML=`${n}x <small>${fmt(cost)} STL${premiumActive()?' • -10%':''}</small>`;b.disabled=!unlocked||progress.profile.uridium<cost;b.onclick=()=>spinAlpha(n);ui.gateSpinButtons.appendChild(b);});
  renderGateRounds();
  if(!unlocked){ui.gateAlphaStatusTitle.textContent=`${gd.label} BLOQUEADO`;ui.gateAlphaStatusText.textContent=`Conclua o Portal Astral ${GALAXY_GATE_DEFS[gd.unlock].label} ao menos 1 vez para liberar este protocolo.`;ui.gateJumpBtn.textContent='PROTOCOLO BLOQUEADO';ui.gateJumpBtn.disabled=true;}
  else if(a.run?.active){ui.gateAlphaStatusTitle.textContent=`${gd.label} em andamento • Round ${a.run.round}`;ui.gateAlphaStatusText.textContent=`${a.lives} vidas restantes. NPCs eliminados permanecem eliminados ao retornar.`;ui.gateJumpBtn.textContent=isGalaxyGateMap()?`VOCÊ ESTÁ NO ${gd.label}`:atBase?`RETORNAR AO ${gd.label}`:'VOLTE À BASE X-1';ui.gateJumpBtn.disabled=isGalaxyGateMap()||!atBase||a.lives<=0;}
  else if(a.built){ui.gateAlphaStatusTitle.textContent=`PORTAL ${gd.label} MONTADO`;ui.gateAlphaStatusText.textContent=`${gd.pieces}/${gd.pieces} peças • ${gd.rounds.length} rounds • 3 vidas • recompensa total ${gd.totalRewardMult}X.`;ui.gateJumpBtn.textContent=atBase?`SALTAR PARA O ${gd.label}`:'VOLTE À BASE X-1';ui.gateJumpBtn.disabled=!atBase;}
  else{ui.gateAlphaStatusTitle.textContent='Em construção';ui.gateAlphaStatusText.textContent=`Faltam ${gd.pieces-count} peças para montar o portal ${gd.label}.`;ui.gateJumpBtn.textContent='PORTAL INCOMPLETO';ui.gateJumpBtn.disabled=true;}
  ui.useRepairBonus.disabled=g.repairBonus<=0||isGalaxyGateMap();renderGateHud();
}
function openGalaxyGate(){
  if(isGalaxyGateMap()){
    const a=alphaGate(),def=galaxyGateDef().rounds[a.run?.round-1];
    renderGateHud();
    showToast(`${galaxyGateDef().label} • Round ${a.run?.round||1} • ${alphaRemainingCount()} NPCs vivos${def?` • ${a.lives} vidas`:''}`);
    return;
  }
  closeNavigationModals(ui.gateModal);renderGalaxyGate();ui.gateModal.classList.remove('hidden');
}


function buyLogDisks(qty){normalizePilotBio();qty=Math.max(1,Math.floor(qty));const cost=qty*LOG_DISK_URI_PRICE;if(progress.profile.uridium<cost){showToast('Stellarium insuficiente para Núcleos Quânticos');return;}openSpendConfirm({title:'Comprar Núcleos Quânticos?',itemName:`${qty} Núcleos Quânticos`,detail:'Confirme a compra dos Núcleos Quânticos com Stellarium.',value:cost,currency:'uridium',onConfirm:()=>{if(progress.profile.uridium<cost){showToast('Stellarium insuficiente para Núcleos Quânticos');return;}progress.profile.uridium-=cost;progress.pilotBio.logDisks+=qty;saveGame();refreshPilotViews();updateUI();},confirmLabel:'CONFIRMAR COMPRA'});}
function convertPilotPoint(){normalizePilotBio();const p=progress.pilotBio;if(p.totalPoints>=PILOT_POINT_MAX){showToast('Limite de 50 Pontos de Pesquisa atingido');return;}const no=p.totalPoints+1,cost=pilotPointLogCost(no);if(p.logDisks<cost){showToast(`Faltam ${fmt(cost-p.logDisks)} Núcleos Quânticos`);return;}p.logDisks-=cost;p.totalPoints++;saveGame();refreshPilotViews();showToast(`Ponto de Pesquisa #${p.totalPoints} obtido`);}
function upgradePilotSkill(id){normalizePilotBio();const skill=PILOT_SKILLS[id],lv=pilotSkillLevel(id);if(!skill||lv>=skill.max)return;if(!pilotRequirementMet(skill)){showToast(`Complete ${PILOT_SKILLS[skill.requires].name} primeiro`);return;}if(pilotAvailablePoints()<1){showToast('Você não possui PP disponível');return;}const cost=pilotSkillCreditCost(skill,lv+1);if(progress.profile.credits<cost){showToast(`Faltam ${fmt(cost-progress.profile.credits)} CR`);return;}openSpendConfirm({title:'Evoluir habilidade?',itemName:`${skill.name} • nível ${lv+1}/${skill.max}`,detail:'Confirme para gastar créditos e evoluir esta habilidade da Árvore de Piloto.',value:cost,currency:'credits',confirmLabel:'EVOLUIR HABILIDADE',onConfirm:()=>{if(progress.profile.credits<cost){showToast(`Faltam ${fmt(cost-progress.profile.credits)} CR`);return;}progress.profile.credits-=cost;progress.pilotBio.skills[id]=lv+1;computeStats(true);saveGame();refreshPilotViews();updateUI();showToast(`${skill.name} • nível ${lv+1}/${skill.max}`);}});}
function resetPilotTree(){normalizePilotBio();const cost=1000*Math.pow(2,progress.pilotBio.resetCount);if(progress.profile.uridium<cost){showToast(`Reset requer ${fmt(cost)} STL`);return;}if(pilotSpentPoints()<=0){showToast('Nenhum ponto investido para resetar');return;}openSpendConfirm({title:'Resetar Árvore de Piloto?',itemName:`Reset #${progress.pilotBio.resetCount+1}`,detail:'Confirme para gastar Stellarium e resetar todos os pontos investidos.',value:cost,currency:'uridium',confirmLabel:'CONFIRMAR RESET',onConfirm:()=>{if(progress.profile.uridium<cost){showToast(`Reset requer ${fmt(cost)} STL`);return;}if(pilotSpentPoints()<=0){showToast('Nenhum ponto investido para resetar');return;}progress.profile.uridium-=cost;for(const id of Object.keys(PILOT_SKILLS))progress.pilotBio.skills[id]=0;progress.pilotBio.resetCount++;computeStats(true);saveGame();refreshPilotViews();updateUI();showToast('Árvore de Piloto resetada');}});}
function pilotSkillBonusLabel(skill,lv){if(lv<=0)return 'SEM BÔNUS';const value=skill.values[Math.min(lv,skill.values.length)-1];return `${fmt(value)}${skill.unit}`;}
function renderPilotProfile(){
  if(!progress||!ui.pilotSkillTree)return;normalizePilotBio();const p=progress.pilotBio,spent=pilotSpentPoints(),avail=pilotAvailablePoints(),next=p.totalPoints+1;
  ui.pilotLogDisks.textContent=fmt(p.logDisks);ui.pilotPointsTotal.textContent=`${p.totalPoints} / ${PILOT_POINT_MAX}`;ui.pilotPointsAvailable.textContent=fmt(avail);ui.pilotPointsSpent.textContent=fmt(spent);if(ui.pilotPointBadge)ui.pilotPointBadge.textContent=`${avail} PP`;
  if(p.totalPoints>=PILOT_POINT_MAX){ui.pilotNextPointTitle.textContent='PESQUISA COMPLETA';ui.pilotNextPointCost.textContent='50 / 50 Pontos de Pesquisa';ui.pilotConvertPoint.disabled=true;ui.pilotConvertPoint.textContent='LIMITE ATINGIDO';}
  else{const logs=pilotPointLogCost(next);ui.pilotNextPointTitle.textContent=`PP #${next}`;ui.pilotNextPointCost.textContent=`${fmt(logs)} Núcleos Quânticos • equivalente ${fmt(logs*LOG_DISK_URI_PRICE)} STL`;ui.pilotConvertPoint.disabled=p.logDisks<logs;ui.pilotConvertPoint.textContent='CONVERTER NÚCLEOS QUÂNTICOS EM 1 PP';}
  ui.pilotLogBuyButtons.innerHTML='';[1,10,100,500].forEach(q=>{const b=document.createElement('button');b.className='small-btn';b.innerHTML=`${q}x <small>${fmt(q*LOG_DISK_URI_PRICE)} STL</small>`;b.disabled=progress.profile.uridium<q*LOG_DISK_URI_PRICE;b.onclick=()=>buyLogDisks(q);ui.pilotLogBuyButtons.appendChild(b);});
  const resetCost=1000*Math.pow(2,p.resetCount);ui.pilotResetCost.textContent=`Reset #${p.resetCount+1}: ${fmt(resetCost)} STL`;ui.pilotResetBtn.disabled=spent<=0||progress.profile.uridium<resetCost;
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
function refreshPilotViews(){renderPilotProfile();if(ui.hangarModal&&state.hangarTab==='pilot')renderHangar();}
function openPilotProfile(){openHangar('pilot');}

function formatAuctionClock(sec){const m=Math.floor(sec/60),s=sec%60;return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;}
function auctionMinBid(lot){
  const playerBid=Number(lot?.marketBid)||0;
  // Depois que existe um jogador liderando, somente outro jogador pode cobrir
  // e precisa acrescentar no mínimo 100k.
  if(playerBid>0)return Math.max(100000,playerBid+100000);
  // Antes do primeiro jogador, o preço do sistema é o próprio lance mínimo.
  // Ex.: SISTEMA = 100k -> primeiro jogador pode dar exatamente 100k.
  return Math.max(100000,auctionSystemBid(lot));
}
async function placeAuctionBid(ref,amount){
  ensureAuctionState();
  const lot=progress.auction.lots[ref];
  if(!lot)return;

  const myId=getUser()?.id;
  if(!myId){showToast('Sessão online não encontrada');return;}

  // Busca o mercado real ANTES de aceitar o lance.
  let market=[];
  try{market=await loadAuctionMarket(progress.auction.hourKey);}
  catch(e){showToast(`Leilão online indisponível: ${e.message}`);return;}

  const live=market.find(x=>x.lot_ref===ref)||null;
  if(live?.leader_user_id===myId){
    showToast('Você já está liderando esse lote — espere outro jogador cobrir');
    return;
  }

  // Se já existe jogador real, precisa cobrir +100k.
  // Se ainda é o SISTEMA, basta cobrir o preço automático atual.
  const systemFloor=auctionSystemBid(lot);
  const liveMin=live?Math.max(100000,(Number(live.user_bid)||0)+100000):Math.max(100000,systemFloor);
  const uiMin=auctionMinBid(lot);
  const min=Math.max(liveMin,uiMin);

  amount=Number(amount);
  if(!Number.isFinite(amount)){showToast('Digite um lance válido');return;}
  amount=Math.floor(amount/100000)*100000;

  if(amount<min){
    showToast(`Lance mínimo atualizado: ${fmt(min)} CR`);
    renderAuction();
    return;
  }

  if(amount>auctionSpendableCredits(ref)){
    showToast('Créditos insuficientes considerando os outros lances em garantia');
    return;
  }

  try{
    // Atualiza perfil/Créditos no banco antes da operação.
    await flushCloudSave(true);

    // Grava SOMENTE o lance do próprio jogador.
    // Isso evita o bug do RPC antigo e respeita o RLS do Supabase.
    const row=await saveAuctionBidOnline({
      hourKey:progress.auction.hourKey,
      lotRef:ref,
      userBid:amount,
      lot:{...lot,systemFloor,userBid:0,escrow:0,marketBid:0,leaderUserId:null,leaderCallsign:null}
    });
    if(!row)throw new Error('O banco não confirmou o lance.');

    // Confirma quem realmente ficou na liderança (resolve disputa simultânea).
    const after=await loadAuctionMarket(progress.auction.hourKey);
    const winner=after.find(x=>x.lot_ref===ref)||null;

    if(!winner||winner.leader_user_id!==myId||Number(winner.user_bid)!==amount){
      await markAuctionBidStatusOnline({hourKey:progress.auction.hourKey,lotRef:ref,status:'lost'}).catch(()=>{});
      lot.userBid=0;lot.escrow=0;
      if(winner){
        lot.marketBid=Number(winner.user_bid)||0;
        lot.leaderUserId=winner.leader_user_id||null;
        lot.leaderCallsign=winner.leader_callsign||'JOGADOR';
        showToast(`Lance simultâneo perdido • ${lot.leaderCallsign} lidera com ${fmt(lot.marketBid)} CR`);
      }else showToast('O lance não foi confirmado pelo mercado.');
      saveGame();renderAuction();updateUI();
      return;
    }

    lot.userBid=amount;
    lot.escrow=amount;
    lot.marketBid=amount;
    lot.leaderUserId=myId;
    lot.leaderCallsign=winner.leader_callsign||progress.profile.callsign;

    saveGame();
    renderAuction();
    updateUI();
    showToast(`Você lidera ${lot.name} com ${fmt(amount)} CR`);
    setTimeout(()=>syncAuctionBidsOnline(),350);
  }catch(err){
    console.warn('auction bid',err);
    showToast(`Lance recusado: ${err.message}`);
    setTimeout(()=>syncAuctionBidsOnline(),250);
  }
}
function auctionLotEligible(lot){
  if(!lot)return false;
  if(lot.kind==='ship')return !progress?.ownedShips?.includes(lot.id);
  if(lot.kind==='item'&&ITEMS[lot.id]?.type==='extra')return !ownsExtraItem(lot.id);
  if(lot.kind==='petGear')return !progress?.pet?.gearsOwned?.[lot.id];
  return true;
}
const AUCTION_SECTIONS=[
  {id:'ships',label:'NAVES',icon:'🛸'},
  {id:'ammo',label:'MUNIÇÕES & MÍSSEIS',icon:'✦'},
  {id:'equipment',label:'EQUIPAMENTOS',icon:'⚙'},
  {id:'extras',label:'EXTRAS',icon:'🧩'},
  {id:'pet',label:'AUX-9',icon:'🤖'},
];
function auctionSectionId(lot){
  if(lot.kind==='ship')return 'ships';
  if(lot.kind==='ammo'||lot.kind==='rocket')return 'ammo';
  if(lot.kind==='petGear')return 'pet';
  if(lot.kind==='item'){
    const type=ITEMS[lot.id]?.type;
    if(type==='extra')return 'extras';
    if(type==='pet')return 'pet';
    return 'equipment';
  }
  return 'equipment';
}
function auctionSectionLabelCount(sectionId,lots){
  return lots.filter(l=>auctionSectionId(l)===sectionId).length;
}

function renderAuction(){
  if(!progress||!ui.auctionGrid)return;
  ensureAuctionState();

  const sec=auctionSecondsLeft(),clock=formatAuctionClock(sec);
  ui.auctionClock.textContent=clock;
  ui.auctionTopClock.textContent=clock;
  ui.auctionCredits.textContent=fmt(auctionSpendableCredits());
  ui.auctionEscrow.textContent=fmt(auctionEscrow());
  ui.auctionGrid.innerHTML='';

  const myId=getUser()?.id;
  const lots=Object.values(progress.auction.lots).filter(auctionLotEligible);

  for(const section of AUCTION_SECTIONS){
    const sectionLots=lots.filter(l=>auctionSectionId(l)===section.id);
    if(!sectionLots.length)continue;

    const block=document.createElement('section');
    block.className='auction-section';
    block.dataset.auctionSection=section.id;

    const head=document.createElement('div');
    head.className='auction-section-title';
    head.innerHTML=`<div><span>${section.icon}</span><b>${section.label}</b></div><em>${sectionLots.length} ${sectionLots.length===1?'lote':'lotes'}</em>`;

    const grid=document.createElement('div');
    grid.className='auction-section-grid';

    for(const lot of sectionLots){
      const playerBid=Number(lot.marketBid)||0;
      const current=auctionCurrentBid(lot);
      const isMine=lot.leaderUserId===myId&&playerBid>0;
      const leader=isMine?'VOCÊ':playerBid>0?(lot.leaderCallsign||'JOGADOR'):'SISTEMA';
      const displayBid=current,min=auctionMinBid(lot);
      const card=document.createElement('article');

      card.className=`auction-card ${isMine?'leading':''}`;
      card.dataset.auctionRef=lot.ref;

      const type=lot.kind==='ship'?'NAVE':lot.kind==='item'?(ITEMS[lot.id]?.type==='extra'?'EXTRA':'EQUIPAMENTO'):lot.kind==='ammo'?'MUNIÇÃO':lot.kind==='rocket'?'MÍSSIL':'AUX-9';

      let art=null;
      if(lot.kind==='ship')art=GAME_ASSETS.ships[lot.id];
      else if(lot.kind==='item')art=assetForProduct(lot.id,ITEMS[lot.id]?.type,ITEMS[lot.id]?.subtype);
      else if(lot.kind==='ammo'||lot.kind==='rocket')art=GAME_ASSETS.ammo[lot.id];
      else if(lot.kind==='petGear')art={guard:GAME_ASSETS.equipment.autoLaserCpu,box:GAME_ASSETS.equipment.ammoAutoBuyCpu,ore:GAME_ASSETS.equipment.rocketTurboCpu,repair:GAME_ASSETS.equipment.rep2,kami:GAME_ASSETS.equipment.autoRocketCpu}[lot.id];

      card.innerHTML=`${art?`<img class="auction-art" src="${art}" alt="${lot.name}">`:''}
        <div class="auction-card-top"><span>${type}</span><b>${leader}</b></div>
        <h3>${lot.name}</h3>
        <div class="auction-bid-value">${fmt(displayBid)} CR</div>
        <div class="auction-meta">${playerBid?`Lance atual de ${leader}`:'Preço automático do SISTEMA'} • Próximo mínimo ${fmt(min)} CR${lot.userBid?` • Seu lance ${fmt(lot.userBid)} CR`:''}</div>`;

      const row=document.createElement('div');
      row.className='auction-bid-row';

      const input=document.createElement('input');
      input.className='auction-bid-input';
      input.type='number';
      input.min=String(min);
      input.step='100000';
      input.value=String(min);
      input.disabled=isMine;
      input.setAttribute('aria-label',`Lance para ${lot.name}`);

      const b=document.createElement('button');
      b.className='small-btn';
      b.textContent=isMine?'VOCÊ LIDERA':'DAR LANCE';
      b.disabled=isMine;
      b.onclick=()=>placeAuctionBid(lot.ref,input.value);

      row.append(input,b);
      card.appendChild(row);
      grid.appendChild(card);
    }

    block.append(head,grid);
    ui.auctionGrid.appendChild(block);
  }

  if(!lots.length){
    ui.auctionGrid.innerHTML='<div class="auction-empty">Nenhum item Elite disponível para sua conta neste ciclo.</div>';
  }

  ui.auctionHistory.innerHTML=(progress.auction.history||[]).length
    ?progress.auction.history.map(h=>`<div class="auction-history-row"><span>${h.result}</span><b>${h.name}</b><em>${fmt(h.bid)} CR</em></div>`).join('')
    :'<div class="muted">Nenhum ciclo encerrado ainda.</div>';
}
function openAuction(){closeNavigationModals(ui.auctionModal);renderAuction();ui.auctionModal.classList.remove('hidden');syncAuctionBidsOnline();}
let auctionUiTick=0;
function updateAuctionSystem(){
  if(!progress)return;const now=Date.now();if(now-auctionUiTick<1000)return;auctionUiTick=now;ensureAuctionState();
  const clock=formatAuctionClock(auctionSecondsLeft());if(ui.auctionTopClock)ui.auctionTopClock.textContent=clock;if(ui.auctionClock)ui.auctionClock.textContent=clock;
  const open=ui.auctionModal&&!ui.auctionModal.classList.contains('hidden');
  if((open&&now-auctionLastMarketSync>2200)||(!open&&now-auctionLastMarketSync>9000))syncAuctionBidsOnline();
  if(open){
    ui.auctionCredits.textContent=fmt(auctionSpendableCredits());ui.auctionEscrow.textContent=fmt(auctionEscrow());
    const myId=getUser()?.id;
    ui.auctionGrid.querySelectorAll('[data-auction-ref]').forEach(card=>{const lot=progress.auction.lots[card.dataset.auctionRef];if(!lot)return;const playerBid=Number(lot.marketBid)||0,current=auctionCurrentBid(lot),isMine=lot.leaderUserId===myId&&playerBid>0,leader=isMine?'VOCÊ':playerBid>0?(lot.leaderCallsign||'JOGADOR'):'SISTEMA',min=auctionMinBid(lot);card.classList.toggle('leading',isMine);const lead=card.querySelector('.auction-card-top b');if(lead)lead.textContent=leader;const value=card.querySelector('.auction-bid-value');if(value)value.textContent=`${fmt(current||100000)} CR`;const meta=card.querySelector('.auction-meta');if(meta)meta.textContent=`${playerBid?`Lance atual de ${leader}`:'Preço automático do SISTEMA'} • Próximo mínimo ${fmt(min)} CR${lot.userBid?` • Seu lance ${fmt(lot.userBid)} CR`:''}`;const input=card.querySelector('.auction-bid-input'),button=card.querySelector('.auction-bid-row button');if(input){input.min=String(min);input.disabled=isMine;if(document.activeElement!==input&&Number(input.value)<min)input.value=String(min);}if(button){button.disabled=isMine;button.textContent=isMine?'VOCÊ LIDERA':'DAR LANCE';}});
  }
}


/* ===================== V11 ARENA PVP CINEMÁTICA ===================== */
const ARENA_DAILY_LIMIT=10;
const arenaRuntime={state:null,reward:null,opponents:[],history:[],lastResult:null,busy:false,rewardBusy:false,loadedAt:0,badgeAt:0,badgeBusy:false,battleAnimating:false,skipAnimation:false};

function arenaSafeText(value){
  return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function arenaFactionLabel(id){return FACTIONS[id]?.short||String(id||'—').toUpperCase();}
function arenaStateLeft(){return Math.max(0,Math.min(ARENA_DAILY_LIMIT,Number(arenaRuntime.state?.attacks_left??ARENA_DAILY_LIMIT)));}

const ARENA_EVENT_MS=360;
const arenaSleep=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
function arenaPct(value,max){return Math.max(0,Math.min(100,(Number(value)||0)/Math.max(1,Number(max)||1)*100));}
function arenaSetBar(bar,text,value,max){
  if(bar)bar.style.width=`${arenaPct(value,max).toFixed(2)}%`;
  if(text)text.textContent=`${fmt(Math.max(0,Number(value)||0))} / ${fmt(Math.max(0,Number(max)||0))}`;
}
function arenaShipMarkup(shipId,label){
  const src=GAME_ASSETS.ships[shipId]||GAME_ASSETS.ships.phoenix;
  return `<img src="${src}" alt="${arenaSafeText(label||SHIPS[shipId]?.name||'Nave')}">`;
}
function arenaBattleSnapshot(result){
  const snap={
    attackerHp:Number(result.attacker_hp_start)||1,
    attackerShield:Number(result.attacker_shield_start)||0,
    defenderHp:Number(result.defender_hp_start)||1,
    defenderShield:Number(result.defender_shield_start)||0,
  };
  for(const ev of Array.isArray(result.combat_log)?result.combat_log:[]){
    if(ev.actor==='attacker'){
      snap.defenderHp=Math.max(0,Number(ev.target_hp)||0);
      snap.defenderShield=Math.max(0,Number(ev.target_shield)||0);
    }else{
      snap.attackerHp=Math.max(0,Number(ev.target_hp)||0);
      snap.attackerShield=Math.max(0,Number(ev.target_shield)||0);
    }
  }
  return snap;
}
function arenaBattleTips(r){
  const tips=[];
  const myLaser=Number(r.attacker_laser_damage)||0, enemyLaser=Number(r.defender_laser_damage)||0;
  const myShield=Number(r.attacker_shield_start)||0, enemyShield=Number(r.defender_shield_start)||0;
  const myHp=Number(r.attacker_hp_start)||1, enemyHp=Number(r.defender_hp_start)||1;
  const mySpeed=Number(r.attacker_speed)||0, enemySpeed=Number(r.defender_speed)||0;
  if(!r.won){
    if(myLaser<enemyLaser*.92)tips.push(`Aumentar o dano base dos lasers: você entrou com ${fmt(myLaser)} contra ${fmt(enemyLaser)}.`);
    if(myShield<enemyShield*.82)tips.push(`Reforçar geradores de escudo: ${fmt(myShield)} contra ${fmt(enemyShield)} do adversário.`);
    if(myHp<enemyHp*.82)tips.push(`Uma nave com mais HP ou bônus defensivo aumentaria sua margem de sobrevivência.`);
    if(mySpeed+25<enemySpeed)tips.push(`Mais velocidade ajuda na chance defensiva da Arena: ${fmt(mySpeed)} contra ${fmt(enemySpeed)}.`);
    if(!tips.length)tips.push('O duelo foi equilibrado; pequenos upgrades de laser ou escudo já podem inverter o resultado.');
  }else{
    const margin=Number(r.attacker_remaining)||0;
    tips.push(margin>Math.max(1,(myHp+myShield)*.35)?'Vitória com boa margem de resistência. Seu conjunto está bem dimensionado para este adversário.':'Vitória apertada: escudo extra reduziria o risco em uma revanche.');
  }
  tips.push('A Arena usa armamento padronizado para manter os duelos equilibrados.');
  return tips.slice(0,4);
}
function arenaRenderAnalysis(r){
  if(!ui.arenaBattleAnalysis)return;
  const startMe=(Number(r.attacker_hp_start)||0)+(Number(r.attacker_shield_start)||0);
  const startEnemy=(Number(r.defender_hp_start)||0)+(Number(r.defender_shield_start)||0);
  const dealt=Math.max(0,startEnemy-(Number(r.defender_remaining)||0));
  const taken=Math.max(0,startMe-(Number(r.attacker_remaining)||0));
  const duration=Math.max(0,Number(r.battle_duration_ms)||0)/1000;
  const tips=arenaBattleTips(r);
  ui.arenaBattleAnalysis.classList.remove('hidden');
  ui.arenaBattleAnalysis.innerHTML=`
    <div class="arena-analysis-title"><span>${r.won?'VITÓRIA':'DERROTA'}</span><b>Relatório de combate</b></div>
    <div class="arena-analysis-grid">
      <div><span>TEMPO DE BATALHA</span><b>${duration.toFixed(1)}s</b></div>
      <div><span>ROUNDS</span><b>${fmt(r.rounds||0)}</b></div>
      <div><span>DANO CAUSADO</span><b>${fmt(dealt)}</b></div>
      <div><span>DANO RECEBIDO</span><b>${fmt(taken)}</b></div>
    </div>
    <div class="arena-analysis-tips"><strong>LEITURA TÁTICA</strong>${tips.map(t=>`<p>• ${arenaSafeText(t)}</p>`).join('')}</div>`;
}
function arenaBattleFeedLine(ev){
  const side=ev.actor==='attacker'?'VOCÊ':'INIMIGO';
  const dodge=ev.dodged?' • EVADEU PARTE':'';
  return `<div class="${ev.actor}"><span>R${fmt(ev.round||0)} • ${side}</span><b>${arenaSafeText(ev.weapon||'PLS-1')} −${fmt(ev.damage||0)}</b><em>${fmt(ev.shield_damage||0)} escudo • ${fmt(ev.hp_damage||0)} HP${dodge}</em></div>`;
}
function arenaSpawnProjectile(ev){
  if(!ui.arenaProjectileLayer)return;
  const el=document.createElement('i');
  const dir=ev.actor==='attacker'?'to-right':'to-left';
  const rocket=ev.weapon==='CMT-1';
  el.className=`arena-shot ${rocket?'rocket':'laser'} ${dir}`;
  ui.arenaProjectileLayer.appendChild(el);
  setTimeout(()=>el.remove(),Math.max(260,ARENA_EVENT_MS));
}
function arenaDamageFloat(target,ev){
  const host=target==='attacker'?ui.arenaFighterAttacker:ui.arenaFighterDefender;
  if(!host)return;
  const el=document.createElement('div');
  el.className=`arena-damage-float ${ev.weapon==='CMT-1'?'rocket':''}`;
  el.textContent=`-${fmt(ev.damage||0)}${ev.dodged?' EVADE':''}`;
  host.appendChild(el);
  setTimeout(()=>el.remove(),720);
}
async function playArenaBattle(result){
  if(!ui.arenaBattleStage)return;
  const log=Array.isArray(result.combat_log)?result.combat_log:[];
  arenaRuntime.battleAnimating=true;
  arenaRuntime.skipAnimation=false;
  ui.arenaFighterAttacker?.classList.remove('destroyed','firing','hit');
  ui.arenaFighterDefender?.classList.remove('destroyed','firing','hit');
  ui.arenaBattleStage.classList.remove('hidden');
  ui.arenaBattleAnalysis?.classList.add('hidden');
  if(ui.arenaBattleFeed)ui.arenaBattleFeed.innerHTML='';
  if(ui.arenaProjectileLayer)ui.arenaProjectileLayer.innerHTML='';
  if(ui.arenaBattleSkip){ui.arenaBattleSkip.disabled=false;ui.arenaBattleSkip.textContent='PULAR ANIMAÇÃO';}

  const aHpMax=Math.max(1,Number(result.attacker_hp_start)||1), aShMax=Math.max(0,Number(result.attacker_shield_start)||0);
  const dHpMax=Math.max(1,Number(result.defender_hp_start)||1), dShMax=Math.max(0,Number(result.defender_shield_start)||0);
  let aHp=aHpMax,aSh=aShMax,dHp=dHpMax,dSh=dShMax;
  if(ui.arenaAttackerName)ui.arenaAttackerName.textContent=result.attacker_callsign||progress.profile.callsign||'Piloto';
  if(ui.arenaDefenderName)ui.arenaDefenderName.textContent=result.defender_callsign||result.opponent_callsign||'Piloto';
  if(ui.arenaAttackerShip)ui.arenaAttackerShip.innerHTML=arenaShipMarkup(result.attacker_ship||progress.activeShipId,'Sua nave');
  if(ui.arenaDefenderShip)ui.arenaDefenderShip.innerHTML=arenaShipMarkup(result.defender_ship||'phoenix','Nave adversária');
  arenaSetBar(ui.arenaAttackerHpBar,ui.arenaAttackerHpText,aHp,aHpMax);
  arenaSetBar(ui.arenaAttackerShieldBar,ui.arenaAttackerShieldText,aSh,aShMax);
  arenaSetBar(ui.arenaDefenderHpBar,ui.arenaDefenderHpText,dHp,dHpMax);
  arenaSetBar(ui.arenaDefenderShieldBar,ui.arenaDefenderShieldText,dSh,dShMax);
  if(ui.arenaBattleStatus)ui.arenaBattleStatus.textContent=`${result.attacker_callsign||'Você'} vs ${result.defender_callsign||result.opponent_callsign||'Piloto'}`;
  if(ui.arenaBattleRound)ui.arenaBattleRound.textContent='ROUND 1';
  if(ui.arenaBattleTimer)ui.arenaBattleTimer.textContent='0.0s';
  ui.arenaBattleStage.scrollIntoView({behavior:'smooth',block:'nearest'});

  const start=performance.now();
  for(const ev of log){
    if(arenaRuntime.skipAnimation)break;
    const attacker=ev.actor==='attacker';
    const source=attacker?ui.arenaFighterAttacker:ui.arenaFighterDefender;
    const target=attacker?ui.arenaFighterDefender:ui.arenaFighterAttacker;
    if(ui.arenaBattleRound)ui.arenaBattleRound.textContent=`ROUND ${fmt(ev.round||1)}`;
    source?.classList.add('firing');
    arenaSpawnProjectile(ev);
    await arenaSleep(100);
    target?.classList.add('hit');
    arenaDamageFloat(attacker?'defender':'attacker',ev);
    if(attacker){
      dHp=Math.max(0,Number(ev.target_hp)||0);dSh=Math.max(0,Number(ev.target_shield)||0);
      arenaSetBar(ui.arenaDefenderHpBar,ui.arenaDefenderHpText,dHp,dHpMax);
      arenaSetBar(ui.arenaDefenderShieldBar,ui.arenaDefenderShieldText,dSh,dShMax);
    }else{
      aHp=Math.max(0,Number(ev.target_hp)||0);aSh=Math.max(0,Number(ev.target_shield)||0);
      arenaSetBar(ui.arenaAttackerHpBar,ui.arenaAttackerHpText,aHp,aHpMax);
      arenaSetBar(ui.arenaAttackerShieldBar,ui.arenaAttackerShieldText,aSh,aShMax);
    }
    if(ui.arenaBattleFeed){ui.arenaBattleFeed.insertAdjacentHTML('afterbegin',arenaBattleFeedLine(ev));while(ui.arenaBattleFeed.children.length>6)ui.arenaBattleFeed.lastElementChild?.remove();}
    if(ui.arenaBattleTimer)ui.arenaBattleTimer.textContent=`${((performance.now()-start)/1000).toFixed(1)}s`;
    await arenaSleep(Math.max(80,ARENA_EVENT_MS-100));
    source?.classList.remove('firing');target?.classList.remove('hit');
  }

  if(arenaRuntime.skipAnimation){
    const end=arenaBattleSnapshot(result);aHp=end.attackerHp;aSh=end.attackerShield;dHp=end.defenderHp;dSh=end.defenderShield;
    arenaSetBar(ui.arenaAttackerHpBar,ui.arenaAttackerHpText,aHp,aHpMax);
    arenaSetBar(ui.arenaAttackerShieldBar,ui.arenaAttackerShieldText,aSh,aShMax);
    arenaSetBar(ui.arenaDefenderHpBar,ui.arenaDefenderHpText,dHp,dHpMax);
    arenaSetBar(ui.arenaDefenderShieldBar,ui.arenaDefenderShieldText,dSh,dShMax);
  }
  const duration=Math.max(0,Number(result.battle_duration_ms)||0)/1000;
  if(ui.arenaBattleTimer)ui.arenaBattleTimer.textContent=`${duration.toFixed(1)}s`;
  if(ui.arenaBattleStatus)ui.arenaBattleStatus.textContent=result.won?'ALVO DESTRUÍDO • VITÓRIA':'SUA NAVE FOI DESTRUÍDA • DERROTA';
  ui.arenaFighterAttacker?.classList.toggle('destroyed',!result.won);
  ui.arenaFighterDefender?.classList.toggle('destroyed',!!result.won);
  if(ui.arenaBattleSkip){ui.arenaBattleSkip.disabled=true;ui.arenaBattleSkip.textContent='BATALHA ENCERRADA';}
  arenaRenderAnalysis(result);
  arenaRuntime.battleAnimating=false;
}

async function syncArenaSnapshot(){
  if(!authenticated||!progress)return null;
  return syncArenaProfileOnline({
    callsign:progress.profile.callsign,
    faction:progress.profile.faction,
    level:progress.profile.level,
    shipId:progress.activeShipId,
    hp:Math.max(1,Math.round(player.maxHp||player.hp||1)),
    shield:Math.max(0,Math.round(player.maxShield||player.shield||0)),
    laserDamage:Math.max(0,Math.round(player.laserDamage||0)),
    speed:Math.max(0,Math.round(player.speed||0)),
  });
}
function updateArenaBadge(){
  if(!ui.arenaTopCount)return;
  ui.arenaTopCount.textContent=`${arenaStateLeft()}/${ARENA_DAILY_LIMIT}`;
  ui.arenaBtn?.classList.toggle('arena-empty',arenaStateLeft()<=0);
}
async function refreshArenaBadge(force=false){
  if(!authenticated||!progress||arenaRuntime.badgeBusy)return;
  if(!force&&Date.now()-arenaRuntime.badgeAt<45000)return;
  arenaRuntime.badgeBusy=true;
  try{
    const s=await loadArenaState();
    if(s)arenaRuntime.state=s;
    arenaRuntime.badgeAt=Date.now();
    updateArenaBadge();
  }catch(e){console.warn('arena badge',e);}
  finally{arenaRuntime.badgeBusy=false;}
}
function renderArenaReward(){
  if(!ui.arenaDailyReward)return;
  const r=arenaRuntime.reward;
  if(!r){
    ui.arenaRewardLeague.textContent='—';
    ui.arenaRewardRank.textContent='—';
    ui.arenaRewardBonus.textContent='—';
    ui.arenaRewardProgress.textContent='Carregando progressão da liga...';
    ui.arenaRewardItems.innerHTML='<div><span>CRÉDITOS</span><b>—</b></div><div><span>STELLARIUM</span><b>—</b></div><div><span>XP</span><b>—</b></div><div><span>REPAROS</span><b>—</b></div>';
    ui.arenaRewardClaim.disabled=true;
    return;
  }
  const league=String(r.league||'BRONZE').toUpperCase();
  ui.arenaDailyReward.dataset.league=league.toLowerCase();
  ui.arenaRewardLeague.textContent=league;
  ui.arenaRewardRank.textContent=r.is_admin?'FORA DO RANKING':`#${fmt(r.rank_position||1)}`;
  ui.arenaRewardBonus.textContent=Number(r.total_bonus_percent||0)>0?`+${fmt(r.total_bonus_percent)}% BÔNUS`:'RECOMPENSA BASE';
  ui.arenaRewardProgress.textContent=r.next_league
    ?`Faltam ${fmt(r.points_to_next||0)} de Rating para ${String(r.next_league).toUpperCase()} • Nível ${fmt(r.player_level||1)} dá +${fmt(r.level_bonus_percent||0)}%`
    :`Liga máxima alcançada • Nível ${fmt(r.player_level||1)} dá +${fmt(r.level_bonus_percent||0)}%`;
  ui.arenaRewardItems.innerHTML=`
    <div><span>CRÉDITOS</span><b>+${fmt(r.credits||0)}</b></div>
    <div><span>STELLARIUM</span><b>+${fmt(r.uridium||0)}</b></div>
    <div><span>XP</span><b>+${fmt(r.xp||0)}</b></div>
    <div><span>REPAROS</span><b>+${fmt(r.repair_bonus||0)}</b></div>
  `;
  const claimed=!!r.claimed_today;
  ui.arenaRewardClaim.disabled=claimed||arenaRuntime.rewardBusy;
  ui.arenaRewardClaim.textContent=arenaRuntime.rewardBusy?'RESGATANDO...':claimed?'RESGATADO HOJE':'RESGATAR RECOMPENSA';
  const rankBonus=Number(r.rank_bonus_percent||0);
  ui.arenaRewardFoot.textContent=claimed
    ?'Recompensa de hoje entregue. Novo resgate à meia-noite no horário de São Paulo.'
    :r.is_admin?'Administrador: sem posição e sem bônus de ranking • 1 resgate por dia.':`Bônus de posição: ${rankBonus?`+${rankBonus}%`:'0%'} • Bônus de nível: +${fmt(r.level_bonus_percent||0)}% • 1 resgate por dia.`;
}
async function claimArenaRewardNow(){
  if(!authenticated||!progress||arenaRuntime.rewardBusy||arenaRuntime.reward?.claimed_today)return;
  arenaRuntime.rewardBusy=true;
  renderArenaReward();
  try{
    const result=await claimArenaDailyReward();
    if(!result)throw new Error('O servidor não retornou a recompensa diária.');
    arenaRuntime.reward=result;
    if(result.claim_applied){
      const oldLevel=Number(progress.profile.level||1);
      progress.profile.credits=Number(result.new_credits??progress.profile.credits);
      progress.profile.uridium=Number(result.new_uridium??progress.profile.uridium);
      progress.profile.xp=Number(result.new_xp??progress.profile.xp);
      progress.profile.level=Number(result.level_after??levelFromXp(progress.profile.xp,PLAYER_MAX_LEVEL));
      progress.galaxyGate ||= freshGalaxyGateState();
      progress.galaxyGate.repairBonus=Number(result.new_repair_bonus??progress.galaxyGate.repairBonus??0);
      localStorage.setItem(saveKey(),JSON.stringify(progress));
      cloudDirty=false;
      for(let lv=oldLevel+1;lv<=progress.profile.level;lv++)showLevelUpAnimation(lv);
      renderAll();
      showToast(`RECOMPENSA ${String(result.league||'ARENA').toUpperCase()} • +${fmt(result.credits||0)} CR • +${fmt(result.uridium||0)} STL`);
      pushActivity(`ARENA • Recompensa diária ${String(result.league||'').toUpperCase()} resgatada • +${fmt(result.credits||0)} CR • +${fmt(result.uridium||0)} STL • +${fmt(result.xp||0)} XP`,'reward');
    }else{
      showToast('A recompensa diária de hoje já foi resgatada.');
    }
  }catch(e){
    showToast(String(e?.message||e).replace(/^.*?:\s*/,''));
  }finally{
    arenaRuntime.rewardBusy=false;
    renderArenaReward();
    updateUI();
  }
}

function renderArenaResult(){
  if(!ui.arenaResult)return;
  const r=arenaRuntime.lastResult;
  if(!r){ui.arenaResult.classList.add('hidden');ui.arenaResult.innerHTML='';return;}
  const won=!!r.won;
  ui.arenaResult.classList.remove('hidden','win','loss');
  ui.arenaResult.classList.add(won?'win':'loss');
  ui.arenaResult.innerHTML=`
    <div class="arena-result-kicker">${won?'VITÓRIA NA ARENA':'DERROTA NA ARENA'}</div>
    <strong>${arenaSafeText(r.opponent_callsign||'Piloto')}</strong>
    <span>${fmt(r.rounds||0)} rounds • ${(Math.max(0,Number(r.battle_duration_ms)||0)/1000).toFixed(1)}s • ${fmt(r.attacker_remaining||0)} resistência restante • Rating ${fmt(r.attacker_rating||1000)} • PLS-1 + CMT-1</span>
  `;
}
function renderArena(){
  if(!ui.arenaModal||!progress)return;
  const s=arenaRuntime.state||{attacks_left:ARENA_DAILY_LIMIT,wins:0,losses:0,rating:1000,power:0};
  const left=arenaStateLeft();
  ui.arenaAttacksLeft.textContent=`${left} / ${ARENA_DAILY_LIMIT}`;
  ui.arenaRating.textContent=fmt(s.rating||1000);
  ui.arenaWins.textContent=fmt(s.wins||0);
  ui.arenaLosses.textContent=fmt(s.losses||0);
  ui.arenaPower.textContent=fmt(s.power||0);
  updateArenaBadge();
  renderArenaReward();
  renderArenaResult();

  if(!arenaRuntime.opponents.length){
    ui.arenaOpponents.innerHTML='<div class="arena-empty-state">Nenhum adversário disponível ainda. Assim que outro piloto sincronizar a Arena, ele aparece aqui.</div>';
  }else{
    ui.arenaOpponents.innerHTML='';
    for(const o of arenaRuntime.opponents){
      const card=document.createElement('article');
      card.className='arena-opponent-card';
      const art=GAME_ASSETS.ships[o.ship_id]||GAME_ASSETS.ships.phoenix;
      const ratio=(Number(o.power)||1)/Math.max(1,Number(s.power)||1);
      const threat=ratio>1.25?'AMEAÇA ALTA':ratio<.75?'VANTAGEM':'EQUILIBRADO';
      card.innerHTML=`
        <div class="arena-opponent-art">${art?`<img src="${art}" alt="">`:''}</div>
        <div class="arena-opponent-copy">
          <div class="arena-opponent-top"><span>${arenaSafeText(arenaFactionLabel(o.faction))}</span><em>LV ${fmt(o.level||1)}</em></div>
          <h3>${arenaSafeText(o.callsign||'Pilot')}</h3>
          <p>${arenaSafeText(SHIPS[o.ship_id]?.name||o.ship_id||'Nave')} • PODER ${fmt(o.power||0)}</p>
          <div class="arena-opponent-record"><span>Rating <b>${fmt(o.rating||1000)}</b></span><span>${fmt(o.wins||0)}V / ${fmt(o.losses||0)}D</span><span class="arena-threat">${threat}</span></div>
        </div>
        <button class="primary-btn arena-attack-btn" data-arena-target="${o.user_id}" ${left<=0||arenaRuntime.busy?'disabled':''}>${left<=0?'SEM ATAQUES':'ATACAR'}</button>
      `;
      ui.arenaOpponents.appendChild(card);
    }
    ui.arenaOpponents.querySelectorAll('[data-arena-target]').forEach(btn=>btn.onclick=()=>arenaFight(btn.dataset.arenaTarget));
  }

  ui.arenaHistory.innerHTML=arenaRuntime.history.length
    ?arenaRuntime.history.map(h=>`<div class="arena-history-row ${h.won?'win':'loss'}"><span>${h.won?'VITÓRIA':'DERROTA'}</span><b>${arenaSafeText(h.opponent_callsign||'Pilot')}</b><em>${fmt(h.rounds||0)} rounds</em></div>`).join('')
    :'<div class="muted">Nenhuma batalha registrada ainda.</div>';
}
async function refreshArena(force=false){
  if(!authenticated||!progress||arenaRuntime.busy)return;
  if(!force&&arenaRuntime.loadedAt&&Date.now()-arenaRuntime.loadedAt<12000){renderArena();return;}
  arenaRuntime.busy=true;
  if(ui.arenaOpponents)ui.arenaOpponents.classList.add('loading');
  try{
    await syncArenaSnapshot();
    const [s,reward,opponents,history]=await Promise.all([loadArenaState(),loadArenaDailyRewardStatus(),loadArenaOpponents(),loadArenaHistory()]);
    arenaRuntime.state=s||arenaRuntime.state;
    arenaRuntime.reward=reward||arenaRuntime.reward;
    arenaRuntime.opponents=Array.isArray(opponents)?opponents:[];
    arenaRuntime.history=Array.isArray(history)?history:[];
    arenaRuntime.loadedAt=Date.now();
    arenaRuntime.badgeAt=Date.now();
  }catch(e){
    console.warn('arena refresh',e);
    showToast(String(e?.message||e).replace(/^.*?:\s*/,''));
  }finally{
    arenaRuntime.busy=false;
    ui.arenaOpponents?.classList.remove('loading');
    renderArena();
  }
}
async function arenaFight(targetUserId){
  if(arenaRuntime.busy||arenaRuntime.battleAnimating||arenaStateLeft()<=0)return;
  arenaRuntime.busy=true;
  arenaRuntime.lastResult=null;
  ui.arenaResult?.classList.add('hidden');
  if(ui.arenaBattleStage){
    ui.arenaBattleStage.classList.remove('hidden');
    ui.arenaBattleStatus.textContent='Calculando combate no servidor...';
    ui.arenaBattleAnalysis?.classList.add('hidden');
  }
  renderArena();
  try{
    const result=await arenaAttackOnline(targetUserId);
    if(!result)throw new Error('A Arena não retornou o resultado da batalha.');
    await playArenaBattle(result);
    arenaRuntime.lastResult=result;
    renderArenaResult();
    const won=!!result.won;
    showToast(`ARENA • ${won?'VITÓRIA':'DERROTA'} contra ${result.opponent_callsign||'Piloto'}`);
    pushActivity(`ARENA • ${won?'Vitória':'Derrota'} vs ${result.opponent_callsign||'Piloto'} • ${result.rounds||0} rounds • ${result.attacks_left}/10 ataques restantes`,'combat');
  }catch(e){
    ui.arenaBattleStage?.classList.add('hidden');
    showToast(String(e?.message||e).replace(/^.*?:\s*/,''));
  }finally{
    arenaRuntime.busy=false;
    arenaRuntime.loadedAt=0;
    await refreshArena(true);
  }
}
function openArena(){
  if(!progress)return;
  closeNavigationModals(ui.arenaModal);
  ui.arenaModal?.classList.remove('hidden');
  refreshArena(true);
}

function renderAll(){buildAmmoButtons();renderShop();renderHangar();renderCargo();renderMapModal();renderPet();renderMissions();renderGalaxyGate();renderPilotProfile();ensureAuctionState();updatePassBadge();updateUI();updateWarfrontBadge();refreshArenaBadge();}

function worldPoint(ev){const r=canvas.getBoundingClientRect(),sx=ev.clientX-r.left,sy=ev.clientY-r.top;return{x:sx-W/2+state.camera.x,y:sy-H/2+state.camera.y};}
function gameplayPointerAllowed(){return authenticated&&progress&&ui.loginModal.classList.contains('hidden')&&ui.shopModal.classList.contains('hidden')&&ui.hangarModal.classList.contains('hidden')&&ui.cargoModal.classList.contains('hidden')&&ui.petModal.classList.contains('hidden')&&ui.missionModal.classList.contains('hidden')&&ui.passModal.classList.contains('hidden')&&ui.gateModal.classList.contains('hidden')&&ui.pilotModal.classList.contains('hidden')&&ui.auctionModal.classList.contains('hidden')&&ui.arenaModal.classList.contains('hidden')&&ui.configModal.classList.contains('hidden')&&ui.mapModal.classList.contains('hidden')&&ui.factionModal.classList.contains('hidden');}
function setPointerDestination(ev){const p=worldPoint(ev);player.tx=Math.max(40,Math.min(state.currentMap.world.w-40,p.x));player.ty=Math.max(40,Math.min(state.currentMap.world.h-40,p.y));}
function pointerAction(ev){
  if(!gameplayPointerAllowed()||ev.button!==0)return;
  const p=worldPoint(ev);
  const found=state.enemies.find(e=>e.hp>0&&Math.hypot(e.x-p.x,e.y-p.y)<=e.size*1.8+18);
  if(found){state.target=found;state.pointerNavActive=false;pushActivity(`Alvo selecionado • ${found.name}`,'combat');if(autoLaserEnabled())player.laserFiring=true;return;}
  const hostile=[...onlineWorld.players.values()].filter(rp=>onlinePlayerEnemy(rp)&&rp.hp>0).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
  if(hostile&&Math.hypot(hostile.x-p.x,hostile.y-p.y)<=Math.max(34,hostile.size*1.7)){
    state.target=hostile;state.pointerNavActive=false;pushActivity(`PVP • Alvo selecionado • ${hostile.callsign}`,'combat');
    if(autoLaserEnabled())player.laserFiring=true;return;
  }
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
  ui.saleConfirmModal,ui.configModal,ui.premiumModal,ui.warfrontModal,ui.clanModal,ui.passModal,ui.arenaModal,ui.auctionModal,ui.pilotModal,ui.gateModal,ui.missionModal,ui.shopModal,ui.hangarModal,ui.petModal,ui.cargoModal,ui.mapModal
].filter(Boolean);
function closeNavigationModals(except=null){
  for(const modal of dismissibleModals()){
    if(modal===except||modal===ui.saleConfirmModal)continue;
    modal.classList.add('hidden');
  }
}
function closeTopOverlay(){
  const open=dismissibleModals().filter(modal=>!modal.classList.contains('hidden'));
  if(!open.length)return false;
  if(open[0]===ui.saleConfirmModal)closeSaleConfirm();else open[0].classList.add('hidden');
  return true;
}
function bindOverlayDismiss(){
  for(const modal of dismissibleModals()){
    modal.addEventListener('pointerdown',e=>{
      if(e.target===modal){if(modal===ui.saleConfirmModal)closeSaleConfirm();else modal.classList.add('hidden');}
    });
  }
}

if(ui.mapBtn)ui.mapBtn.onclick=()=>openMapModal();
if(ui.closeMap)ui.closeMap.onclick=()=>ui.mapModal.classList.add('hidden');
if(ui.missionBtn)ui.missionBtn.onclick=()=>openMissions();if(ui.activeMissionOpen)ui.activeMissionOpen.onclick=()=>openMissions();
if(ui.closeMission)ui.closeMission.onclick=()=>ui.missionModal.classList.add('hidden');
if(ui.passBtn)ui.passBtn.onclick=()=>openProgression();
if(ui.closePass)ui.closePass.onclick=()=>ui.passModal.classList.add('hidden');
if(ui.gateBtn)ui.gateBtn.onclick=()=>openGalaxyGate();
if(ui.pilotBtn)ui.pilotBtn.onclick=()=>openPilotProfile();
if(ui.closePilot)ui.closePilot.onclick=()=>ui.pilotModal.classList.add('hidden');
if(ui.pilotConvertPoint)ui.pilotConvertPoint.onclick=()=>convertPilotPoint();
if(ui.pilotResetBtn)ui.pilotResetBtn.onclick=()=>resetPilotTree();
if(ui.auctionBtn)ui.auctionBtn.onclick=()=>openAuction();
if(ui.closeAuction)ui.closeAuction.onclick=()=>ui.auctionModal.classList.add('hidden');
if(ui.arenaBtn)ui.arenaBtn.onclick=()=>openArena();
if(ui.closeArena)ui.closeArena.onclick=()=>{arenaRuntime.skipAnimation=true;ui.arenaModal.classList.add('hidden');};
if(ui.clanBtn)ui.clanBtn.onclick=()=>openClan();
if(ui.warfrontBtn)ui.warfrontBtn.onclick=()=>openWarfront();
if(ui.closeWarfront)ui.closeWarfront.onclick=()=>ui.warfrontModal.classList.add('hidden');
if(ui.warfrontRefresh)ui.warfrontRefresh.onclick=()=>refreshWarfrontState(true);
if(ui.warfrontContent)ui.warfrontContent.onclick=e=>{const craft=e.target.closest('[data-blueprint-craft]');if(craft){craftBlueprint(craft.dataset.blueprintCraft);return;}if(e.target.closest('[data-mastery-upgrade]')){upgradeAbilityMastery();return;}if(e.target.closest('[data-worldboss-engage]')){spawnWorldBossEncounter();ui.warfrontModal.classList.add('hidden');return;}if(e.target.closest('[data-worldboss-claim]')){claimWorldBossNow();return;}if(e.target.closest('[data-war-declare]')){declareWarNow();return;}};
if(ui.closeClan)ui.closeClan.onclick=()=>ui.clanModal.classList.add('hidden');
if(ui.clanRefresh)ui.clanRefresh.onclick=()=>refreshClanState(true);
if(ui.clanContent)ui.clanContent.onclick=e=>{const join=e.target.closest('[data-clan-join]');if(join){joinClanNow(join.dataset.clanJoin);return;}if(e.target.closest('#clanCreateSubmit'))createClanNow();else if(e.target.closest('#clanTransferBtn'))transferClanNow();else if(e.target.closest('#clanLeaveBtn'))leaveClanNow();};
if(ui.clanContent)ui.clanContent.addEventListener('input',e=>{if(e.target.id==='clanTransferAmount'){const gross=Math.max(0,Math.trunc(Number(e.target.value)||0)),net=Math.floor(gross*.95),fee=gross-net,el=$('#clanTransferPreview');if(el)el.innerHTML=`Do cofre saem <b>${fmt(gross)} CR</b> → jogador recebe <b class="clan-net">${fmt(net)} CR</b> • juros <b class="clan-burn">${fmt(fee)} CR</b>.`;}});
if(ui.arenaRefresh)ui.arenaRefresh.onclick=()=>refreshArena(true);
if(ui.arenaRewardClaim)ui.arenaRewardClaim.onclick=()=>claimArenaRewardNow();
if(ui.arenaBattleSkip)ui.arenaBattleSkip.onclick=()=>{arenaRuntime.skipAnimation=true;ui.arenaBattleSkip.disabled=true;ui.arenaBattleSkip.textContent='ENCERRANDO...';};
if(ui.closeGate)ui.closeGate.onclick=()=>ui.gateModal.classList.add('hidden');
if(ui.gateJumpBtn)ui.gateJumpBtn.onclick=()=>enterAlphaGate();
if(ui.gateProtocolTabs)ui.gateProtocolTabs.onclick=e=>{const b=e.target.closest('[data-gate-protocol]');if(!b||isGalaxyGateMap())return;const key=b.dataset.gateProtocol;if(!gateUnlocked(key)){showToast(`${GALAXY_GATE_DEFS[key].label} está bloqueado`);return;}progress.galaxyGate.selected=key;saveGame();renderGalaxyGate();};
if(ui.useRepairBonus)ui.useRepairBonus.onclick=()=>useGalaxyRepairBonus();
if(ui.petBtn)ui.petBtn.onclick=()=>openHangar('pet');
if(ui.closePet)ui.closePet.onclick=()=>ui.petModal.classList.add('hidden');
if(ui.shopBtn)ui.shopBtn.onclick=()=>openShop();
if(ui.premiumBtn)ui.premiumBtn.onclick=()=>openPremiumShop();
if(ui.closePremium)ui.closePremium.onclick=()=>ui.premiumModal.classList.add('hidden');
if(ui.saleConfirmCancel)ui.saleConfirmCancel.onclick=()=>closeSaleConfirm();
if(ui.saleConfirmAccept)ui.saleConfirmAccept.onclick=()=>confirmSaleNow();
if(ui.hangarBtn)ui.hangarBtn.onclick=()=>openHangar();
if(ui.closeHangar)ui.closeHangar.onclick=()=>ui.hangarModal.classList.add('hidden');
if(ui.configBtn)ui.configBtn.onclick=()=>openSettings();
if(ui.closeConfig)ui.closeConfig.onclick=()=>ui.configModal.classList.add('hidden');
if(ui.baseTradePrompt)ui.baseTradePrompt.onclick=()=>{if(isAtTrader())openCargo();};
if(ui.petGearQuickSelect)ui.petGearQuickSelect.onchange=e=>setPetGear(e.target.value);
if(ui.shipAbilityBtn)ui.shipAbilityBtn.onclick=()=>useShipAbility();if(ui.petKamiAbilityBtn)ui.petKamiAbilityBtn.onclick=()=>triggerPetKamikaze();
if(ui.qualityButtons)ui.qualityButtons.addEventListener('click',e=>{const b=e.target.closest('[data-quality]');if(b)applyQualityMode(b.dataset.quality);});
if(ui.hudSettingsGrid)ui.hudSettingsGrid.addEventListener('change',e=>{const input=e.target.closest('[data-hud-key]');if(input)setHudVisibility(input.dataset.hudKey,input.checked);});
if(ui.settingsTabs)ui.settingsTabs.addEventListener('click',e=>{const b=e.target.closest('[data-settings-tab]');if(b)switchSettingsTab(b.dataset.settingsTab);});
if(ui.rankingRefreshBtn)ui.rankingRefreshBtn.onclick=()=>refreshRankings(true);
if(ui.accountSaveName)ui.accountSaveName.onclick=()=>saveAccountName();
if(ui.accountSavePassword)ui.accountSavePassword.onclick=()=>saveAccountPassword();
if(ui.audioEnabledToggle)ui.audioEnabledToggle.onchange=e=>setAudioEnabled(e.target.checked);
if(ui.weaponBarToggle)ui.weaponBarToggle.onclick=()=>toggleAmmoUi();
if(ui.playerToggle){ui.playerToggle.onclick=e=>{e.stopPropagation();togglePlayerUi();};ui.playerToggle.ontouchstart=e=>e.stopPropagation();}
if(ui.playerHeader)ui.playerHeader.onclick=()=>togglePlayerUi();
if(ui.statsToggle){ui.statsToggle.onclick=e=>{e.stopPropagation();toggleStatsUi();};ui.statsToggle.ontouchstart=e=>e.stopPropagation();}
if(ui.statsHeader)ui.statsHeader.onclick=()=>toggleStatsUi();
if(ui.minimapToggle){ui.minimapToggle.onclick=e=>{e.stopPropagation();toggleMinimapUi();};ui.minimapToggle.ontouchstart=e=>e.stopPropagation();}
if(ui.minimapHeader)ui.minimapHeader.onclick=()=>toggleMinimapUi();
if(ui.hudToggle)ui.hudToggle.onclick=()=>toggleHudUi();
if(ui.closeShop)ui.closeShop.onclick=()=>ui.shopModal.classList.add('hidden');
if(ui.cargoBtn)ui.cargoBtn.onclick=()=>{if(isAtTrader())openCargo();else showToast('O Porão comercial só abre na base X-1');};
if(ui.activityClearBtn)ui.activityClearBtn.onclick=()=>clearActivityFeed();
if(ui.repairUseBonus)ui.repairUseBonus.onclick=()=>repairDestroyedWithBonus();
if(ui.repairUseUri)ui.repairUseUri.onclick=()=>repairDestroyedWithUri();
if(ui.repairUseAurora)ui.repairUseAurora.onclick=()=>recoverWithAurora();
if(ui.closeCargo)ui.closeCargo.onclick=()=>ui.cargoModal.classList.add('hidden');
if(ui.sellAllCargo)ui.sellAllCargo.onclick=()=>sellAllCargo();
bindOverlayDismiss();
document.addEventListener('keydown',e=>{
  if(!authenticated||!progress||!ui.loginModal.classList.contains('hidden')||!ui.factionModal.classList.contains('hidden'))return;
  if(e.key==='Escape'){if(closeTopOverlay()){e.preventDefault();return;}}
  const tag=document.activeElement?.tagName;if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT')return;
  if(e.key==='Control'){e.preventDefault();if(state.target&&state.target.hp>0)player.laserFiring=!player.laserFiring;else showToast('Selecione um alvo');}
  if(e.code==='Space'){e.preventDefault();fireRocket(true);}
  if(['j','J'].includes(e.key)||e.key==='Enter'){const portal=nearbyPortal();if(portal){e.preventDefault();jumpThroughPortal(portal);}}
  const k=e.key.toLowerCase();
  if(k==='e')useShipAbility();if(k==='k')triggerPetKamikaze();
  if(k==='h')toggleHudUi();if(k==='b')openShop();if(k==='c'){if(isAtTrader())openCargo();else showToast('Venda de recursos disponível somente na base X-1');}
  if(k==='m')openMapModal();if(k==='w')openWarfront();if(k==='y')openPremiumShop();if(k==='q')openMissions();if(k==='x')openProgression();if(k==='g')openGalaxyGate();if(k==='p')openHangar('pet');if(k==='o')openHangar('pilot');if(k==='l')openAuction();if(k==='a')openArena();if(k==='n')openClan();
  if(['1','2','3','4','5'].includes(e.key)){progress.selectedLaserAmmo=Object.keys(LASER_AMMO)[Number(e.key)-1];buildAmmoButtons();saveGame();}
});


function forceLogoutBecauseSessionMoved(message='Sua conta foi acessada em outro dispositivo.',userId=null){
  const staleUserId=userId||getUser()?.id||null;
  authenticated=false;
  cloudDirty=false;
  player.laserFiring=false;
  state.target=null;
  clearOnlinePlayers();
  try{if(staleUserId)localStorage.removeItem(`${SAVE_KEY_PREFIX}:${staleUserId}`);}catch{}
  progress=null;
  clanRuntime.state=null;clanRuntime.clans=[];clanRuntime.lastAt=0;
  warfrontRuntime.state=null;warfrontRuntime.clans=[];warfrontRuntime.lastAt=0;warfrontRuntime.pendingBossDamage=0;
  premiumRuntime.state=null;premiumRuntime.lastAt=0;
  updateClanBadge();updatePremiumBadge();
  for(const modal of dismissibleModals())modal.classList.add('hidden');
  ui.factionModal.classList.add('hidden');
  ui.portalPrompt?.classList.add('hidden');
  ui.baseTradePrompt?.classList.add('hidden');
  ui.petFloatPanel?.classList.add('hidden');
  ui.loginModal.classList.remove('hidden');
  if(ui.userLabel)ui.userLabel.textContent='—';
  if(ui.rankChip)ui.rankChip.textContent='Piloto Básico';
  setSync('SESSÃO ENCERRADA','err');
  showAuthMode('login');
  ui.authMessage.textContent=message+' O login mais recente permaneceu conectado.';
}
window.addEventListener('stellar-session-replaced',e=>{
  forceLogoutBecauseSessionMoved(e?.detail?.message||'Sua conta foi acessada em outro dispositivo.',e?.detail?.userId||null);
});

let recoveryAccessToken=null;
function showAuthMode(mode){
  const login=mode==='login',register=mode==='register',recovery=mode==='recovery';
  ui.loginForm.classList.toggle('hidden',!login);ui.registerForm.classList.toggle('hidden',!register);ui.recoveryForm?.classList.toggle('hidden',!recovery);
  ui.authTabs?.classList.toggle('hidden',recovery);ui.loginTabBtn.classList.toggle('active',login);ui.registerTabBtn.classList.toggle('active',register);ui.authMessage.textContent='';
}
ui.loginTabBtn.onclick=()=>showAuthMode('login');ui.registerTabBtn.onclick=()=>showAuthMode('register');
ui.forgotPasswordBtn.onclick=async()=>{const email=String(ui.loginEmail.value||'').trim();if(!email){ui.authMessage.textContent='Digite seu e-mail acima para receber o link de recuperação.';ui.loginEmail.focus();return;}ui.authMessage.textContent='Enviando link...';try{const r=await requestPasswordReset(email);ui.authMessage.textContent=r?.message||'Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.';}catch(err){ui.authMessage.textContent=err.message;}};
ui.loginForm.onsubmit=async e=>{e.preventDefault();ensureAudio();ui.authMessage.textContent='Entrando...';try{await signIn({email:ui.loginEmail.value,password:ui.loginPassword.value});await afterAuth();}catch(err){ui.authMessage.textContent=err.message;}};
ui.registerForm.onsubmit=async e=>{e.preventDefault();ensureAudio();ui.authMessage.textContent='Criando conta...';try{const result=await signUp({callsign:ui.registerCallsign.value,email:ui.registerEmail.value,password:ui.registerPassword.value});if(result.requires_confirmation){showAuthMode('login');ui.loginEmail.value=ui.registerEmail.value;ui.authMessage.textContent='Conta criada. Confira seu e-mail para confirmar o cadastro.';return;}await afterAuth();}catch(err){ui.authMessage.textContent=err.message;}};
ui.recoveryForm.onsubmit=async e=>{e.preventDefault();const p1=ui.recoveryPassword.value,p2=ui.recoveryPasswordConfirm.value;if(p1!==p2){ui.authMessage.textContent='As senhas não conferem.';return;}ui.authMessage.textContent='Atualizando senha...';try{await completePasswordRecovery(recoveryAccessToken,p1);history.replaceState(null,'',location.pathname+location.search.replace(/[?&]recovery=1/,'').replace(/^&/,'?'));recoveryAccessToken=null;showAuthMode('login');ui.authMessage.textContent='Senha atualizada. Você já pode entrar.';}catch(err){ui.authMessage.textContent=err.message;}};
ui.logoutBtn.onclick=async()=>{await flushCloudSave(true);await removePlayerPresenceOnline().catch(()=>{});clearOnlinePlayers();await endGameSession().catch(()=>signOutLocal());authenticated=false;progress=null;clanRuntime.state=null;clanRuntime.clans=[];clanRuntime.lastAt=0;warfrontRuntime.state=null;warfrontRuntime.clans=[];warfrontRuntime.lastAt=0;warfrontRuntime.pendingBossDamage=0;premiumRuntime.state=null;premiumRuntime.lastAt=0;updateClanBadge();updatePremiumBadge();state.target=null;player.laserFiring=false;for(const modal of dismissibleModals())modal.classList.add('hidden');ui.factionModal.classList.add('hidden');ui.portalPrompt?.classList.add('hidden');ui.baseTradePrompt?.classList.add('hidden');ui.petFloatPanel?.classList.add('hidden');ui.loginModal.classList.remove('hidden');if(ui.userLabel)ui.userLabel.textContent='—';if(ui.rankChip)ui.rankChip.textContent='Piloto Básico';setSync('LOCAL','');showAuthMode('login');};

function startLoadedGame(){
  state.lastPlayerDamageAt=nowSec();
  normalizeGalaxyGateState();normalizeCombatAbilities();
  const loadedGateKey=gateKeyForMap(progress.mapId);if(loadedGateKey&&!progress.galaxyGate[loadedGateKey]?.run?.active){progress.mapId='x1';progress.territoryFaction=progress.profile.faction;}else if(loadedGateKey)progress.galaxyGate.selected=loadedGateKey;
  const savedLocation=savedLocationForCurrentMap(),savedX=savedLocation?.x??null,savedY=savedLocation?.y??null;state.currentMap=MAPS[progress.mapId]||MAPS.x1;state.radarRange=mapRadarRange();player.hp=progress.hp||1;player.shield=progress.shield||0;computeStats(true);player.hp=Math.min(player.maxHp,progress.hp??player.maxHp);player.shield=Math.min(player.maxShield,progress.shield??player.maxShield);
  if(isGalaxyGateMap()){
    const gd=galaxyGateDef();player.x=savedX??MAPS[gd.mapId].world.w/2;player.y=savedY??MAPS[gd.mapId].world.h/2;player.tx=player.x;player.ty=player.y;petRuntime.x=player.x+82;petRuntime.y=player.y+64;petRuntime.tx=petRuntime.x;petRuntime.ty=petRuntime.y;petRuntime.roamX=null;petRuntime.roamY=null;petRuntime.nextRoamAt=0;state.camera.x=player.x;state.camera.y=player.y;state.target=null;state.loot=[];state.fx=[];state.rocketFx=[];state.ores=[];state.landmarks=[];state.enemyRespawns=[];state.oreRespawns=[];restoreAlphaGateEnemies();const a=alphaGate(),def=galaxyGateDef().rounds[a.run.round-1],alive=alphaRemainingCount(),now=Date.now();if(a.run.waveIndex<def.waves.length&&!a.run.nextWaveAt){a.run.nextWaveAt=now+GALAXY_ALPHA_WAVE_INTERVAL_MS;}else if(a.run.waveIndex>=def.waves.length&&alive===0&&a.run.round<galaxyGateDef().rounds.length&&!a.run.nextRoundAt){a.run.nextRoundAt=now+GALAXY_ALPHA_ROUND_INTERVAL_MS;}renderAll();saveGame();return;
  }
  const spawnBase=currentBasePoint();player.x=savedX??(progress.mapId==='x1'?spawnBase.x:400);player.y=savedY??(progress.mapId==='x1'?spawnBase.y:state.currentMap.world.h/2);player.tx=player.x;player.ty=player.y;petRuntime.x=player.x+82;petRuntime.y=player.y+64;petRuntime.tx=petRuntime.x;petRuntime.ty=petRuntime.y;petRuntime.roamX=null;petRuntime.roamY=null;petRuntime.nextRoamAt=0;state.camera.x=player.x;state.camera.y=player.y;state.target=null;state.loot=[];state.fx=[];state.rocketFx=[];createLandmarks();createOres();spawnEnemies();renderAll();saveGame();
  if(progress.repairRequired){movePlayerToHomeBase();player.hp=1;player.shield=0;progress.hp=1;progress.shield=0;saveGame();if(premiumActive())resolveDeathRepair({allowAuto:true});else openRepairModal();}
}

async function afterAuth(){
  authenticated=true;ui.loginModal.classList.add('hidden');ui.userLabel.textContent=getUser()?.callsign||getUser()?.email?.split('@')[0]||'Pilot';loadActivityLog();refreshClanState(true).then(()=>refreshRankings(true)).catch(()=>{});setSync('SINCRONIZANDO','busy');
  try{
    const local=readLocalGameState();
    const remote=await loadCloudSave();
    const localStamp=Number(local?.clientSavedAt)||0;
    const remoteStamp=Number(remote?.state?.clientSavedAt)||Date.parse(remote?.updated_at||'')||0;
    const localStampSane=localStamp>0&&localStamp<=Date.now()+300000;
    if(local&&localStampSane&&localStamp>remoteStamp+250){
      progress=local;hydrateProgress();cloudDirty=true;setSync('LOCAL MAIS NOVO','busy');
      setTimeout(()=>flushCloudSave(true),0);
    }else if(remote.state){
      progress=remote.state;hydrateProgress();setSync('ONLINE','ok');
    }else{
      loadLocalGame();setSync('ONLINE','ok');
    }
  }catch(err){console.warn(err);loadLocalGame();setSync('OFFLINE','err');}
  if(!progress){renderFactionChoice();return;}
  await refreshPremiumState(true);
  startLoadedGame();
  updatePassBadge();
  syncAuctionBidsOnline();
  syncOnlineWorld();
  syncClanCreditGrants(true);
  refreshClanState(true);
  refreshWarfrontState(true).catch(()=>{});
}

async function boot(){
  ui.loginModal.classList.remove('hidden');recoveryAccessToken=getRecoveryAccessToken();showAuthMode(recoveryAccessToken?'recovery':'login');setSync('LOCAL','');
  if(recoveryAccessToken)return;
  try{const restored=await restoreSession();if(restored)await afterAuth();}catch(err){console.warn(err);}
}

document.body.dataset.quality=qualityMode;
loadActivityLog();
loadHudVisibility();
renderSettings();
preloadAssets();
loadAmmoUiState();
loadPlayerUiState();
loadStatsUiState();
loadMinimapUiState();
loadTopMetaUiState();
syncHudButton();
layoutHudPanels();
window.addEventListener('resize', layoutHudPanels);
window.addEventListener('orientationchange', ()=>setTimeout(layoutHudPanels, 120));
document.addEventListener('pointerdown',()=>ensureAudio(),{once:true});
boot();
setInterval(()=>{
  if(!authenticated)return;
  checkGameSession().catch(()=>{});
},3000);
setInterval(()=>{if(progress){saveGame();flushCloudSave();}},7000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&progress){saveGame();flushCloudSave(true);}else if(document.visibilityState==='visible'&&authenticated){checkGameSession().catch(()=>{});}});
let last=performance.now();function loop(t){const minFrame=1000/qualityProfile().fps;if(t-last<minFrame){requestAnimationFrame(loop);return;}const dt=Math.min((t-last)/1000,.05);last=t;update(dt);draw();requestAnimationFrame(loop);}requestAnimationFrame(loop);
