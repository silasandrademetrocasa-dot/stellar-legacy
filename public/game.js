import { FACTIONS, SHIPS, ITEMS, LASER_AMMO, ROCKETS, NPC_TYPES, MAPS, RESOURCES } from './data.js?v=18.1.7a';
import { GAME_ASSETS } from './assets/v17/manifest.js?v=18.1.7a';
import { signUp, signIn, requestPasswordReset, restorePasswordRecoveryFromUrl, restoreSession, signOutLocal, checkGameSession, endGameSession, getUser, getSessionCredentials, loadCloudSave, saveCloudSave, updateCallsign, updatePassword, loadRankings, loadAuctionBids, saveAuctionBidOnline, markAuctionBidStatusOnline, loadAuctionMarket, upsertPlayerPresenceOnline, loadMapPresenceOnline, savePlayerLocationCheckpointOnline, loadPlayerLocationCheckpointOnline, removePlayerPresenceOnline, queuePvpAttackOnline, consumePvpDamageEventsOnline, syncArenaProfileOnline, loadArenaState, loadArenaDailyRewardStatus, claimArenaDailyReward, loadArenaOpponents, loadArenaHistory, arenaAttackOnline, listClansOnline, loadMyClanOnline, createClanOnline, joinClanOnline, leaveClanOnline, transferClanCreditsOnline, claimClanCreditGrantsOnline, recordClanAlienKillOnline, getPremiumShopOnline, testPurchasePremiumOnline, loadWarfrontStateOnline, hitWorldBossOnline, claimWorldBossRewardOnline, declareClanWarOnline, recordClanWarScoreOnline, loadLiveOpsOnline, adminUpdateLiveEventScheduleOnline, purchaseLiveCatalogOnline, economyActionOnline, getChatHistoryOnline, sendChatMessageOnline, getMyDesignersOnline, setDesignLoadoutOnline, claimGateDroneDesignOnline, claimEventDesignerOnline, getAdminStatus, adminSearchAccounts, adminRecentActions, adminBanAccount, adminUnbanAccount, adminResetAccount, adminDeleteAccount, pushTelemetryBatch, adminTelemetryOverview, adminPlayerTelemetry, getBattleGroupOnline, createBattleGroupOnline, inviteBattleGroupOnline, searchBattleGroupPlayersOnline, inviteBattleGroupUserOnline, respondBattleGroupInviteOnline, leaveBattleGroupOnline, kickBattleGroupMemberOnline, setBattleGroupRallyOnline, loadRuntimeConfigOnline, loadNpcRuntimeConfigOnline, loadWorldRuntimeConfigOnline, loadSystemsRuntimeConfigOnline, loadAdminRuntimeMonitorOnline, adminUpdateRuntimeModuleOnline, adminUpdateNpcRuntimeOnline, adminUpdateNpcSpawnRuntimeOnline, adminUpdateWorldMapOnline, adminUpdateWorldResourceOnline, adminUpdateWorldSectorOnline, adminUpdateWorldPortalOnline, adminUpdateWorldResourcePoolOnline, adminUpdateMissionCategoryOnline, adminUpdateEconomyServiceOnline, adminUpdateCraftingRecipeOnline } from './api.js?v=18.1.7a';
import { SharedUniverseClient } from './world.js?v=18.1.7a';

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const minimap = document.querySelector('#minimap');
const mm = minimap.getContext('2d');
const $ = (s) => document.querySelector(s);

const QUALITY_STORAGE_KEY='stellar_quality_mode';
const DEVICE_CAPS=(()=>{
  const ua=String(navigator.userAgent||'');
  const coarse=matchMedia?.('(pointer: coarse)')?.matches||false;
  const mobile=/Android|iPhone|iPad|iPod|Mobile/i.test(ua)||coarse||innerWidth<=820;
  const memory=Number(navigator.deviceMemory)||0;
  const cores=Number(navigator.hardwareConcurrency)||0;
  const saveData=!!navigator.connection?.saveData;
  const reducedMotion=matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||false;
  return {mobile,memory,cores,saveData,reducedMotion};
})();
const QUALITY_PROFILES={
  // V17.5.2: qualidade dinâmica atua no CENÁRIO / ILUMINAÇÃO / densidade de efeitos,
  // mas nunca rebaixa ou descarta os sprites V17 de NAVE, NPC, DRONES ou AUX-9.
  high:{label:'ALTA',dpr:2,fps:60,background:true,backgroundAlpha:.78,stars:1,grid:false,fx:true,particles:105,preload:'smart',saturation:1.16,contrast:1.08,sceneLight:1,assetCap:54},
  medium:{label:'MÉDIA',dpr:1.30,fps:45,background:true,backgroundAlpha:.56,stars:.52,grid:false,fx:true,particles:48,preload:'core',saturation:1.05,contrast:1.03,sceneLight:.68,assetCap:34},
  low:{label:'BAIXA',dpr:.90,fps:30,background:true,backgroundAlpha:.34,stars:.12,grid:false,fx:true,particles:12,preload:'minimal',saturation:.98,contrast:1.01,sceneLight:.30,assetCap:24},
};
function initialAutoQuality(){
  if(DEVICE_CAPS.saveData)return 'low';
  if(DEVICE_CAPS.mobile&&(innerWidth<=620||(DEVICE_CAPS.memory&&DEVICE_CAPS.memory<=4)||(DEVICE_CAPS.cores&&DEVICE_CAPS.cores<=4)))return 'low';
  if(DEVICE_CAPS.mobile)return 'medium';
  if((DEVICE_CAPS.memory&&DEVICE_CAPS.memory<=4)||(DEVICE_CAPS.cores&&DEVICE_CAPS.cores<=4))return 'medium';
  return 'high';
}
const AUTO_QUALITY_CEILING=initialAutoQuality();
let autoQualityResolved=AUTO_QUALITY_CEILING;
let qualityMode=(()=>{try{const v=localStorage.getItem(QUALITY_STORAGE_KEY);return v==='auto'||QUALITY_PROFILES[v]?v:'auto';}catch{return 'auto';}})();
function resolvedQualityMode(){return qualityMode==='auto'?autoQualityResolved:qualityMode;}
function qualityProfile(){return QUALITY_PROFILES[resolvedQualityMode()]||QUALITY_PROFILES.high;}
function qualityBadgeLabel(){return qualityMode==='auto'?`AUTO • ${qualityProfile().label}`:qualityProfile().label;}

const AUDIO_STORAGE_KEY='stellar_audio_settings_v1';
let audioEnabled=true;
let audioVolume=.70;
let audioCtx=null;
const sfxLastAt=new Map();
const COMBAT_PREFS_KEY='stellar_combat_prefs_v14';
let combatPrefs={autoTarget:true,tapAttack:true,alerts:true};
try{const savedPrefs=JSON.parse(localStorage.getItem(COMBAT_PREFS_KEY)||'null');if(savedPrefs&&typeof savedPrefs==='object')combatPrefs={...combatPrefs,...savedPrefs};}catch{}
function saveCombatPrefs(){try{localStorage.setItem(COMBAT_PREFS_KEY,JSON.stringify(combatPrefs));}catch{}}
try{
  const saved=JSON.parse(localStorage.getItem(AUDIO_STORAGE_KEY)||'null');
  if(saved&&typeof saved==='object'){
    if(typeof saved.enabled==='boolean')audioEnabled=saved.enabled;
    if(Number.isFinite(Number(saved.volume)))audioVolume=Math.max(0,Math.min(1,Number(saved.volume)));
  }
}catch{}
function saveAudioSettings(){try{localStorage.setItem(AUDIO_STORAGE_KEY,JSON.stringify({enabled:audioEnabled,volume:audioVolume}));}catch{}}
function ensureAudioContext(){
  if(!audioEnabled)return null;
  const Ctor=window.AudioContext||window.webkitAudioContext;
  if(!Ctor)return null;
  if(!audioCtx)audioCtx=new Ctor();
  if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});
  return audioCtx;
}
function audioGain(mult=1){return Math.max(0,Math.min(.32,audioVolume*.22*mult));}
function sfxTone(freq=440,endFreq=freq,duration=.08,type='sine',gainMult=1,delay=0){
  const ac=ensureAudioContext();if(!ac)return;
  const t=ac.currentTime+Math.max(0,delay),o=ac.createOscillator(),g=ac.createGain();
  o.type=type;o.frequency.setValueAtTime(Math.max(20,freq),t);o.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),t+duration);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0001,audioGain(gainMult)),t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
  o.connect(g);g.connect(ac.destination);o.start(t);o.stop(t+duration+.02);
}
function sfxNoise(duration=.12,gainMult=.7,cutoff=1200,delay=0){
  const ac=ensureAudioContext();if(!ac)return;
  const t=ac.currentTime+Math.max(0,delay),len=Math.max(1,Math.floor(ac.sampleRate*duration)),buf=ac.createBuffer(1,len,ac.sampleRate),arr=buf.getChannelData(0);
  for(let i=0;i<len;i++)arr[i]=(Math.random()*2-1)*(1-i/len);
  const src=ac.createBufferSource(),filter=ac.createBiquadFilter(),g=ac.createGain();src.buffer=buf;filter.type='lowpass';filter.frequency.value=cutoff;
  g.gain.setValueAtTime(Math.max(.0001,audioGain(gainMult)),t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
  src.connect(filter);filter.connect(g);g.connect(ac.destination);src.start(t);
}
function playSfx(kind){
  if(!audioEnabled||audioVolume<=0)return;
  const now=performance.now(),cooldown={laser:90,petLaser:110,impact:80,shield:80,rocket:120,explosion:140,pickup:90,portal:500,ability:180,reward:300,target:120,warning:350,repair:650,ui:60,critical:180,event:500}[kind]||0;
  if(now-(sfxLastAt.get(kind)||0)<cooldown)return;sfxLastAt.set(kind,now);
  if(kind==='laser'){sfxTone(980,340,.075,'sawtooth',.75);sfxTone(1500,620,.045,'square',.28,.01);}
  else if(kind==='petLaser'){sfxTone(1350,520,.06,'square',.50);}
  else if(kind==='rocket'){sfxNoise(.16,.55,500);sfxTone(145,58,.18,'sawtooth',.75);}
  else if(kind==='impact'){sfxTone(210,95,.055,'triangle',.55);sfxNoise(.045,.28,1800);}
  else if(kind==='shield'){sfxTone(780,300,.085,'sine',.50);sfxTone(1100,620,.06,'triangle',.24,.01);}
  else if(kind==='explosion'){sfxNoise(.28,1.05,780);sfxTone(95,32,.30,'sawtooth',.75);}
  else if(kind==='pickup'){sfxTone(560,920,.09,'sine',.48);sfxTone(850,1260,.08,'sine',.34,.055);}
  else if(kind==='portal'){sfxTone(120,980,.42,'sine',.62);sfxTone(220,1460,.34,'triangle',.28,.10);}
  else if(kind==='ability'){sfxTone(220,720,.20,'sawtooth',.58);sfxTone(420,980,.15,'sine',.30,.05);}
  else if(kind==='reward'){sfxTone(440,660,.11,'sine',.45);sfxTone(660,880,.11,'sine',.45,.10);sfxTone(880,1320,.15,'sine',.42,.20);}
  else if(kind==='target'){sfxTone(520,760,.045,'square',.28);sfxTone(860,1120,.055,'sine',.22,.04);}
  else if(kind==='warning'){sfxTone(180,120,.16,'sawtooth',.55);sfxTone(180,120,.16,'sawtooth',.45,.20);}
  else if(kind==='repair'){sfxTone(340,620,.10,'sine',.20);sfxTone(620,880,.08,'sine',.14,.06);}
  else if(kind==='ui'){sfxTone(420,560,.035,'triangle',.15);}
  else if(kind==='critical'){sfxTone(260,980,.12,'sawtooth',.66);sfxTone(980,1380,.08,'square',.24,.04);}
  else if(kind==='event'){sfxTone(110,760,.32,'sine',.58);sfxTone(640,1280,.22,'triangle',.35,.11);}
}
function setAudioEnabled(value){audioEnabled=!!value;saveAudioSettings();if(audioEnabled){ensureAudioContext();playSfx('pickup');}renderSettings();}
function setAudioVolume(value){audioVolume=Math.max(0,Math.min(1,Number(value)||0));saveAudioSettings();if(ui?.audioVolumeValue)ui.audioVolumeValue.textContent=`${Math.round(audioVolume*100)}%`;}
function unlockGameAudio(){if(audioEnabled)ensureAudioContext();}
addEventListener('pointerdown',unlockGameAudio,{passive:true});
addEventListener('keydown',unlockGameAudio);
function qualityShouldPreload(path){
  const mode=qualityProfile().preload;
  const value=String(path||'');
  // Não pré-carrega todos os fundos grandes de uma vez; o mapa ativo entra em preloadActiveGameplayAssets().
  if(mode==='smart')return /\/(branding|ammo|loot)\//.test(value)||/\/assets\/v17\/environment\/(?:orbital-station\.webp|resources\/|portals\/)/.test(value);
  if(mode==='core')return /\/(branding|ammo|loot)\//.test(value)||/\/assets\/v17\/environment\/(?:orbital-station\.webp|portals\/)/.test(value);
  return /\/branding\//.test(value)||/\/assets\/v17\/loot\/cargo-box\.webp/.test(value);
}

const ASSET_REVISION='18.1.7a';
function versionedAssetUrl(path){
  const value=String(path||'');if(!value)return value;
  return value.includes('?')?`${value}&asset=${ASSET_REVISION}`:`${value}?asset=${ASSET_REVISION}`;
}
const ASSET_IMAGES = new Map();
const ASSET_TOUCH = new Map();
function flattenAssetPaths(value,out=[]){
  if(!value)return out;
  if(typeof value==='string')out.push(value);
  else if(Array.isArray(value))value.forEach(v=>flattenAssetPaths(v,out));
  else if(typeof value==='object')Object.values(value).forEach(v=>flattenAssetPaths(v,out));
  return out;
}
function entityAssetPath(path){return /\/assets\/v17\/(ships|ships-map|drones|drones-map|npcs)\//.test(String(path||''));}
function coreAssetPath(path){const value=String(path||'');return entityAssetPath(value)||/\/(branding|ammo)\//.test(value)||/\/assets\/v17\/(environment|loot)\//.test(value);}
function requestAssetImage(path){
  if(!path)return null;
  let img=ASSET_IMAGES.get(path);
  if(img){ASSET_TOUCH.set(path,performance.now());return img;}
  const entity=entityAssetPath(path),priority=entity||coreAssetPath(path);
  img=new Image();img.decoding='async';img.loading=priority?'eager':'lazy';
  try{img.fetchPriority=priority?'high':'low';}catch{}
  ASSET_IMAGES.set(path,img);ASSET_TOUCH.set(path,performance.now());img.src=versionedAssetUrl(path);
  img.onload=()=>ASSET_TOUCH.set(path,performance.now());
  img.onerror=()=>console.warn('Asset não carregado:',path,'→',img.src);
  return img;
}
function trimAssetCache(){
  const cap=qualityProfile().assetCap||32;
  // Sprites de entidades são protegidos: AUTO nunca desmonta nave/NPC/AUX/drone da memória.
  const evictable=[...ASSET_IMAGES.keys()].filter(path=>!coreAssetPath(path)).sort((a,b)=>(ASSET_TOUCH.get(a)||0)-(ASSET_TOUCH.get(b)||0));
  let nonCoreCount=evictable.length;
  while(nonCoreCount>cap&&evictable.length){const path=evictable.shift();ASSET_IMAGES.delete(path);ASSET_TOUCH.delete(path);nonCoreCount--;}
}
function preloadAssets(){
  requestAssetImage(GAME_ASSETS.loot?.cargo);
  [...new Set(flattenAssetPaths(GAME_ASSETS))].filter(qualityShouldPreload).forEach(requestAssetImage);
  setTimeout(trimAssetCache,1500);
}
function preloadActiveGameplayAssets(){
  if(!progress)return;
  requestAssetImage(currentMapBackground());
  if(progress.mapId==='x1')requestAssetImage(GAME_ASSETS.bases?.orbitalStation);
  Object.values(GAME_ASSETS.portals||{}).forEach(requestAssetImage);
  const activeOreTypes=[...new Set((state.ores||[]).map(o=>o?.type).filter(Boolean))];
  activeOreTypes.forEach(type=>requestAssetImage(GAME_ASSETS.resources?.[type]));
  requestAssetImage(GAME_ASSETS.loot?.cargo);
  requestAssetImage(shipMapAsset(progress.activeShipId));
  requestAssetImage(shipCardAsset(progress.activeShipId));
  requestAssetImage(droneMapAsset(progress?.pet?.level>=10?'petElite':'pet'));
  requestAssetImage(droneCardAsset(progress?.pet?.level>=10?'petElite':'pet'));
  for(const d of progress.drones||[]){requestAssetImage(droneMapAsset(d.type));requestAssetImage(droneCardAsset(d.type));}
  // Pré-carrega os NPCs presentes e as naves online para impedir fallback após mudança do modo AUTO.
  for(const e of state.enemies||[])if(e?.hp>0)requestAssetImage(GAME_ASSETS.npcs?.[e.type]);
  for(const rp of onlineWorld?.players?.values?.()||[])requestAssetImage(shipMapAsset(rp.shipId));
  setTimeout(trimAssetCache,1200);
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
function shipCardAsset(id){return (GAME_ASSETS.ships&&GAME_ASSETS.ships[id])||null;}
function shipMapAsset(id){return (GAME_ASSETS.shipMap&&GAME_ASSETS.shipMap[id])||shipCardAsset(id);}
function droneCardAsset(id){return (GAME_ASSETS.drones&&GAME_ASSETS.drones[id])||null;}
function droneMapAsset(id){return (GAME_ASSETS.droneMap&&GAME_ASSETS.droneMap[id])||droneCardAsset(id);}
function assetForProduct(id,type,subtype){
  if(type==='ship')return shipCardAsset(id);
  if(type==='drone')return droneCardAsset(id);
  if(type==='pet')return droneCardAsset('pet');
  if(type==='petGear')return ({guard:GAME_ASSETS.equipment.autoLaserCpu,box:GAME_ASSETS.equipment.ammoAutoBuyCpu,ore:GAME_ASSETS.equipment.rocketTurboCpu,repair:GAME_ASSETS.equipment.rep2,kami:GAME_ASSETS.equipment.autoRocketCpu})[id]||droneCardAsset('pet');
  if(type==='ammo'||type==='rocket')return GAME_ASSETS.ammo[id];
  if(GAME_ASSETS.equipment[id])return GAME_ASSETS.equipment[id];
  return null;
}
function factionAsset(id){return GAME_ASSETS.branding[id]||GAME_ASSETS.branding.earth;}
function currentMapBackground(){
  if(!progress)return null;
  return GAME_ASSETS.backgrounds[progress.mapId]||GAME_ASSETS.backgrounds.b42;
}
function hexToRgba(hex,alpha=1){const h=String(hex||'#ffffff').replace('#','');const v=h.length===3?h.split('').map(c=>c+c).join(''):h;const n=parseInt(v,16)||0xffffff;return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${alpha})`;}
const ENVIRONMENT_PROFILES={
  x1:{accent:'#58dfff',secondary:'#64ffc8',edge:'#06182a',dust:'#9cecff',motion:.28,label:'ORBITAL SAFE-ZONE'},
  x2:{accent:'#51f0cf',secondary:'#58aaff',edge:'#041a20',dust:'#9dfff0',motion:.38,label:'BLUE FRONTIER'},
  x3:{accent:'#c878ff',secondary:'#705cff',edge:'#160824',dust:'#e0b0ff',motion:.46,label:'SHADOW BELT'},
  x4:{accent:'#ff9a55',secondary:'#63dfff',edge:'#1d0e08',dust:'#ffd1a8',motion:.54,label:'STORM FRONT'},
  b41:{accent:'#6fb7ff',secondary:'#7c8fff',edge:'#061225',dust:'#a9d4ff',motion:.62,label:'WARZONE ALPHA'},
  b42:{accent:'#73ff9d',secondary:'#b17aff',edge:'#06180f',dust:'#b5ffc9',motion:.68,label:'ALIEN CORE'},
  b43:{accent:'#ff6e49',secondary:'#ffc15f',edge:'#240703',dust:'#ffd0a2',motion:.72,label:'RED ABYSS'},
  ggAlpha:{accent:'#bd81ff',secondary:'#6f8cff',edge:'#160724',dust:'#e2c5ff',motion:.78,label:'AURORA'},
  ggBeta:{accent:'#5eeaff',secondary:'#44b8ff',edge:'#031927',dust:'#c5f8ff',motion:.82,label:'NEXUS'},
  ggGamma:{accent:'#ff557f',secondary:'#c35cff',edge:'#25030b',dust:'#ffd0dc',motion:.90,label:'ECLIPSE'}
};
function environmentProfile(){return ENVIRONMENT_PROFILES[progress?.mapId]||ENVIRONMENT_PROFILES.x2;}
function drawEnvironmentLighting(){
  if(!progress)return;
  const q=qualityProfile(),strength=q.sceneLight??1;
  if(strength<=.18)return;
  const e=environmentProfile(),t=nowSec(),hi=resolvedQualityMode()==='high';
  ctx.save();ctx.globalCompositeOperation='lighter';
  const pulse=.92+Math.sin(t*(.45+e.motion*.2))*.08;
  const g=ctx.createRadialGradient(W*.18,H*.24,0,W*.18,H*.24,Math.max(W,H)*.54);
  g.addColorStop(0,hexToRgba(e.accent,.11*strength*pulse));g.addColorStop(.48,hexToRgba(e.accent,.035*strength));g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  const g2=ctx.createRadialGradient(W*.82,H*.70,0,W*.82,H*.70,Math.max(W,H)*.44);
  g2.addColorStop(0,hexToRgba(e.secondary,.07*strength));g2.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g2;ctx.fillRect(0,0,W,H);
  ctx.restore();
  if(!hi)return;
  const count=14,drift=(t*7*e.motion)%120;
  ctx.save();ctx.fillStyle=e.dust;
  for(let i=0;i<count;i++){
    const x=((i*137+37+drift*(i%3+.4))%(W+100))-50,y=((i*83+59+drift*.23)%(H+100))-50,r=(i%4===0?1.4:.7);
    ctx.globalAlpha=.06+.04*(i%3);ctx.beginPath();ctx.arc(x,y,r,0,TWO_PI);ctx.fill();
  }
  ctx.restore();
}
function portalVisualPalette(portal){
  const to=String(portal?.to||'').toLowerCase();
  if(to.includes('battle')||to.startsWith('b4'))return {main:'#ff9855',ring:'#ff5f72',core:'#ffe0aa'};
  if(to.includes('x4'))return {main:'#64dcff',ring:'#ff9258',core:'#efffff'};
  if(to.includes('x3'))return {main:'#b879ff',ring:'#765bff',core:'#f1dcff'};
  if(to.includes('x2'))return {main:'#53edcf',ring:'#50a8ff',core:'#e5fffa'};
  return {main:'#59dcff',ring:'#63ffc2',core:'#efffff'};
}
function portalAsset(portal){
  const to=String(portal?.to||'').toLowerCase();
  if(to.includes('battle')||to.startsWith('b4'))return GAME_ASSETS.portals?.warzone||GAME_ASSETS.portals?.standard;
  if(to.includes('x3')||to.includes('gamma'))return GAME_ASSETS.portals?.shadow||GAME_ASSETS.portals?.standard;
  return GAME_ASSETS.portals?.standard;
}
function drawMapBackground(){
  const img=assetImage(currentMapBackground());
  if(!img||!img.naturalWidth)return false;
  const world=state.currentMap?.world||{w:6000,h:4500};
  const nx=Math.max(0,Math.min(1,(state.camera?.x||0)/Math.max(1,world.w)));
  const ny=Math.max(0,Math.min(1,(state.camera?.y||0)/Math.max(1,world.h)));
  const viewAspect=W/Math.max(1,H);
  let sw=img.naturalWidth*.975,sh=img.naturalHeight*.975;
  if(sw/sh<viewAspect) sh=sw/viewAspect; else sw=sh*viewAspect;
  sw=Math.min(sw,img.naturalWidth);sh=Math.min(sh,img.naturalHeight);
  const sx=(img.naturalWidth-sw)*nx,sy=(img.naturalHeight-sh)*ny;
  const q=qualityProfile(),sceneLight=q.sceneLight??1,env=environmentProfile();
  ctx.save();
  ctx.globalAlpha=q.backgroundAlpha??.5;
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality='high';
  ctx.filter=`saturate(${q.saturation||1}) contrast(${q.contrast||1}) brightness(${.90+.10*sceneLight})`;
  ctx.drawImage(img,sx,sy,sw,sh,0,0,W,H);
  ctx.filter='none';
  const shade=ctx.createLinearGradient(0,0,0,H);shade.addColorStop(0,'rgba(1,7,16,.05)');shade.addColorStop(.52,'rgba(1,6,14,.018)');shade.addColorStop(1,'rgba(1,5,12,.18)');ctx.fillStyle=shade;ctx.fillRect(0,0,W,H);
  const vignette=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.28,W/2,H/2,Math.max(W,H)*.78);vignette.addColorStop(0,'rgba(0,0,0,0)');vignette.addColorStop(1,hexToRgba(env.edge,.24));ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
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
  topbar: $('#topbar'), topHudDock: $('#topHudDock'), topbarDockToggle: $('#topbarDockToggle'), topMeta: document.querySelector('#playerPanel .top-meta'), hudToggle: $('#hudToggle'), leftStats: $('#leftStats'), statsToggle: $('#statsToggle'), minimapPanel: $('#minimapPanel'), minimapToggle: $('#minimapToggle'), minimapHeader: $('#minimapHeader'), statsHeader: $('#statsHeader'), shipHudArt: $('#shipHudArt'), factionIcon: $('#factionIcon'), factionLabel: $('#factionLabel'), mapLabel: $('#mapLabel'), sectorName: $('#sectorName'), coordLabel: $('#coordLabel'), routeLabel: $('#routeLabel'), discoveriesLabel: $('#discoveriesLabel'), shipLabel: $('#shipLabel'), lvl: $('#lvl'), petFloatPanel: $('#petFloatPanel'), petFloatLevel: $('#petFloatLevel'), petFloatToggle: $('#petFloatToggle'), petFloatBody: $('#petFloatBody'), petGearQuickSelect: $('#petGearQuickSelect'), petFloatStatus: $('#petFloatStatus'),
  hp: $('#hp'), maxHp: $('#maxHp'), shield: $('#shield'), maxShield: $('#maxShield'), speed: $('#speed'), dmg: $('#dmg'), credits: $('#credits'), uridium: $('#uridium'), xp: $('#xp'), droneCount: $('#droneCount'),
  laserAmmoButtons: $('#laserAmmoButtons'), rocketAmmoButtons: $('#rocketAmmoButtons'), laserToggle: $('#laserToggle'), rocketFire: $('#rocketFire'), autoLaser: $('#autoLaser'), autoRocket: $('#autoRocket'), turboRocket: $('#turboRocket'), rocketCd: $('#rocketCd'), weaponBar: $('#weaponBar'), weaponBarContent: $('#weaponBarContent'), weaponBarToggle: $('#weaponBarToggle'),
  toast: $('#toast'), baseTradePrompt: $('#baseTradePrompt'), baseTradePromptInfo: $('#baseTradePromptInfo'), repairModal: $('#repairModal'), repairModalText: $('#repairModalText'), repairShipName: $('#repairShipName'), repairBonusCount: $('#repairBonusCount'), repairUriCount: $('#repairUriCount'), repairUseBonus: $('#repairUseBonus'), repairUseUri: $('#repairUseUri'), repairUseAurora: $('#repairUseAurora'), gameCelebration: $('#gameCelebration'), celebrationPanel: $('#celebrationPanel'), celebrationKicker: $('#celebrationKicker'), celebrationTitle: $('#celebrationTitle'), celebrationSubtitle: $('#celebrationSubtitle'), portalPrompt: $('#portalPrompt'), portalPromptMap: $('#portalPromptMap'), jumpTransition: $('#jumpTransition'), jumpTitle: $('#jumpTitle'), jumpSubtitle: $('#jumpSubtitle'), factionModal: $('#factionModal'), factionCards: $('#factionCards'),
  mapBtn: $('#mapBtn'), mapModal: $('#mapModal'), closeMap: $('#closeMap'), mapNetwork: $('#mapNetwork'),
  missionBtn: $('#missionBtn'), missionActiveCount: $('#missionActiveCount'), missionModal: $('#missionModal'), closeMission: $('#closeMission'), missionContent: $('#missionContent'), passBtn: $('#passBtn'), passTierBadge: $('#passTierBadge'), passModal: $('#passModal'), closePass: $('#closePass'), passContent: $('#passContent'), activeMissionPanel: $('#activeMissionPanel'), activeMissionCategory: $('#activeMissionCategory'), activeMissionTitle: $('#activeMissionTitle'), activeMissionTask: $('#activeMissionTask'), activeMissionProgressBar: $('#activeMissionProgressBar'), activeMissionProgressText: $('#activeMissionProgressText'), activeMissionRewardFactor: $('#activeMissionRewardFactor'), activeMissionDots: $('#activeMissionDots'), activeMissionToggle: $('#activeMissionToggle'), activeMissionBody: $('#activeMissionBody'), activeMissionOpen: $('#activeMissionOpen'), activityPanel: $('#activityPanel'), activityFeed: $('#activityFeed'), activityClearBtn: $('#activityClearBtn'),
  gateBtn: $('#gateBtn'), gatePieceBadge: $('#gatePieceBadge'), gateModal: $('#gateModal'), closeGate: $('#closeGate'), gatePiecesText: $('#gatePiecesText'), gateLivesText: $('#gateLivesText'), gateCompletedText: $('#gateCompletedText'), gatePieceGrid: $('#gatePieceGrid'), gateJumpBtn: $('#gateJumpBtn'), gateUriText: $('#gateUriText'), gateSpinButtons: $('#gateSpinButtons'), gateJumpBonus: $('#gateJumpBonus'), gateLifeBonus: $('#gateLifeBonus'), gateLogDisks: $('#gateLogDisks'), useLifeBonus: $('#useLifeBonus'), buyGateLife: $('#buyGateLife'), gateResultBox: $('#gateResultBox'), gateRoundsGrid: $('#gateRoundsGrid'), gateAlphaStatusTitle: $('#gateAlphaStatusTitle'), gateAlphaStatusText: $('#gateAlphaStatusText'), gateHud: $('#gateHud'), gateHudRound: $('#gateHudRound'), gateHudWave: $('#gateHudWave'), gateHudRemaining: $('#gateHudRemaining'), gateHudNext: $('#gateHudNext'), gateHudLives: $('#gateHudLives'),
  gateProtocolTabs: $('#gateProtocolTabs'), gateCoreLabel: $('#gateCoreLabel'), gateProtocolLabel: $('#gateProtocolLabel'), gateCombatProtocol: $('#gateCombatProtocol'), gateRewardNote: $('#gateRewardNote'), gateHudTitle: $('#gateHudTitle'),
  abilityBar: $('#abilityBar'), shipAbilityBtn: $('#shipAbilityBtn'), shipAbilityIcon: $('#shipAbilityIcon'), shipAbilityName: $('#shipAbilityName'), shipAbilityStatus: $('#shipAbilityStatus'), shipAbilityFill: $('#shipAbilityFill'), petKamiAbilityBtn: $('#petKamiAbilityBtn'), petKamiAbilityStatus: $('#petKamiAbilityStatus'), petKamiAbilityFill: $('#petKamiAbilityFill'), bossPhaseHud: $('#bossPhaseHud'), bossPhaseName: $('#bossPhaseName'), bossPhaseLabel: $('#bossPhaseLabel'), bossPhaseHpFill: $('#bossPhaseHpFill'), bossPhaseShieldFill: $('#bossPhaseShieldFill'), bossPhaseHpText: $('#bossPhaseHpText'), bossPhaseShieldText: $('#bossPhaseShieldText'), bossPhaseDistance: $('#bossPhaseDistance'), bossPhaseStatus: $('#bossPhaseStatus'), targetLockHud: $('#targetLockHud'), targetLockToggle: $('#targetLockToggle'), targetLockDetail: $('#targetLockDetail'), targetLockName: $('#targetLockName'), targetLockPortrait: $('#targetLockPortrait'), targetLockPortraitWrap: $('#targetLockPortraitWrap'), targetLockType: $('#targetLockType'), targetLockDistance: $('#targetLockDistance'), targetLockThreat: $('#targetLockThreat'), targetLockHpFill: $('#targetLockHpFill'), targetLockHpText: $('#targetLockHpText'), targetLockShieldFill: $('#targetLockShieldFill'), targetLockShieldText: $('#targetLockShieldText'), combatStateHud: $('#combatStateHud'), combatStateText: $('#combatStateText'), combatStateMeta: $('#combatStateMeta'), combatFlash: $('#combatFlash'), galaxyEventHud: $('#galaxyEventHud'), galaxyEventToggle: $('#galaxyEventToggle'), galaxyEventIcon: $('#galaxyEventIcon'), galaxyEventName: $('#galaxyEventName'), galaxyEventObjective: $('#galaxyEventObjective'), galaxyEventTimer: $('#galaxyEventTimer'), galaxyEventProgress: $('#galaxyEventProgress'),
  shipMenuBtn: $('#shipMenuBtn'), battleTopStatus: $('#battleTopStatus'), playerPanel: $('#playerPanel'), playerPanelToggle: $('#playerPanelToggle'), playerPanelContent: $('#playerPanelContent'), petBtn: $('#petBtn'), petModal: $('#petModal'), closePet: $('#closePet'), petContent: $('#petContent'),
  pilotBtn: $('#pilotBtn'), pilotPointBadge: $('#pilotPointBadge'), pilotModal: $('#pilotModal'), closePilot: $('#closePilot'), pilotLogDisks: $('#pilotLogDisks'), pilotPointsTotal: $('#pilotPointsTotal'), pilotPointsAvailable: $('#pilotPointsAvailable'), pilotPointsSpent: $('#pilotPointsSpent'), pilotNextPointTitle: $('#pilotNextPointTitle'), pilotNextPointCost: $('#pilotNextPointCost'), pilotConvertPoint: $('#pilotConvertPoint'), pilotLogBuyButtons: $('#pilotLogBuyButtons'), pilotResetCost: $('#pilotResetCost'), pilotResetBtn: $('#pilotResetBtn'), pilotSkillTree: $('#pilotSkillTree'),
  auctionBtn: $('#auctionBtn'), auctionTopClock: $('#auctionTopClock'), auctionModal: $('#auctionModal'), closeAuction: $('#closeAuction'), auctionClock: $('#auctionClock'), auctionCredits: $('#auctionCredits'), auctionEscrow: $('#auctionEscrow'), auctionGrid: $('#auctionGrid'), auctionHistory: $('#auctionHistory'),
  arenaBtn: $('#arenaBtn'), arenaTopCount: $('#arenaTopCount'), arenaModal: $('#arenaModal'), closeArena: $('#closeArena'), arenaRefresh: $('#arenaRefresh'), arenaAttacksLeft: $('#arenaAttacksLeft'), arenaRating: $('#arenaRating'), arenaWins: $('#arenaWins'), arenaLosses: $('#arenaLosses'), arenaPower: $('#arenaPower'), arenaDailyReward: $('#arenaDailyReward'), arenaRewardLeague: $('#arenaRewardLeague'), arenaRewardRank: $('#arenaRewardRank'), arenaRewardBonus: $('#arenaRewardBonus'), arenaRewardProgress: $('#arenaRewardProgress'), arenaRewardItems: $('#arenaRewardItems'), arenaRewardClaim: $('#arenaRewardClaim'), arenaRewardFoot: $('#arenaRewardFoot'), arenaOpponents: $('#arenaOpponents'), arenaHistory: $('#arenaHistory'), arenaResult: $('#arenaResult'), arenaBattleStage: $('#arenaBattleStage'), arenaBattleStatus: $('#arenaBattleStatus'), arenaBattleTimer: $('#arenaBattleTimer'), arenaBattleSkip: $('#arenaBattleSkip'), arenaBattleField: $('#arenaBattleField'), arenaFighterAttacker: $('#arenaFighterAttacker'), arenaFighterDefender: $('#arenaFighterDefender'), arenaAttackerName: $('#arenaAttackerName'), arenaDefenderName: $('#arenaDefenderName'), arenaAttackerShip: $('#arenaAttackerShip'), arenaDefenderShip: $('#arenaDefenderShip'), arenaAttackerShieldBar: $('#arenaAttackerShieldBar'), arenaDefenderShieldBar: $('#arenaDefenderShieldBar'), arenaAttackerHpBar: $('#arenaAttackerHpBar'), arenaDefenderHpBar: $('#arenaDefenderHpBar'), arenaAttackerShieldText: $('#arenaAttackerShieldText'), arenaDefenderShieldText: $('#arenaDefenderShieldText'), arenaAttackerHpText: $('#arenaAttackerHpText'), arenaDefenderHpText: $('#arenaDefenderHpText'), arenaBattleRound: $('#arenaBattleRound'), arenaProjectileLayer: $('#arenaProjectileLayer'), arenaBattleFeed: $('#arenaBattleFeed'), arenaBattleAnalysis: $('#arenaBattleAnalysis'),
  clanBtn: $('#clanBtn'), clanTopTag: $('#clanTopTag'), clanModal: $('#clanModal'), closeClan: $('#closeClan'), clanRefresh: $('#clanRefresh'), clanContent: $('#clanContent'), battleGroupBtn: $('#battleGroupBtn'), battleGroupTopStatus: $('#battleGroupTopStatus'), battleGroupModal: $('#battleGroupModal'), closeBattleGroup: $('#closeBattleGroup'), battleGroupRefresh: $('#battleGroupRefresh'), battleGroupContent: $('#battleGroupContent'),
  warfrontBtn: $('#warfrontBtn'), warfrontTopStatus: $('#warfrontTopStatus'), warfrontModal: $('#warfrontModal'), closeWarfront: $('#closeWarfront'), warfrontRefresh: $('#warfrontRefresh'), warfrontContent: $('#warfrontContent'), galaxyEventBtn: $('#galaxyEventBtn'), galaxyEventTopStatus: $('#galaxyEventTopStatus'), galaxyEventModal: $('#galaxyEventModal'), closeGalaxyEvent: $('#closeGalaxyEvent'), galaxyEventContent: $('#galaxyEventContent'), autoTargetToggle: $('#autoTargetToggle'), tapAttackToggle: $('#tapAttackToggle'), combatAlertsToggle: $('#combatAlertsToggle'), premiumAutoCombatSetting: $('#premiumAutoCombatSetting'), autoCombatAccessTag: $('#autoCombatAccessTag'),
  premiumBtn: $('#premiumBtn'), premiumTopStatus: $('#premiumTopStatus'), premiumModal: $('#premiumModal'), closePremium: $('#closePremium'), premiumModeChip: $('#premiumModeChip'), premiumBenefits: $('#premiumBenefits'), premiumProductGrid: $('#premiumProductGrid'),
  saleConfirmModal: $('#saleConfirmModal'), saleConfirmEyebrow: $('#saleConfirmEyebrow'), saleConfirmTitle: $('#saleConfirmTitle'), saleConfirmItem: $('#saleConfirmItem'), saleConfirmCopy: $('#saleConfirmCopy'), saleConfirmValueLabel: $('#saleConfirmValueLabel'), saleConfirmValue: $('#saleConfirmValue'), saleConfirmCancel: $('#saleConfirmCancel'), saleConfirmAccept: $('#saleConfirmAccept'),
  shopBtn: $('#shopBtn'), shopModal: $('#shopModal'), closeShop: $('#closeShop'), shopTabs: $('#shopTabs'), shopGrid: $('#shopGrid'), shopCredits: $('#shopCredits'), shopStellarium: $('#shopStellarium'),
  hangarBtn: $('#hangarBtn'), hangarModal: $('#hangarModal'), closeHangar: $('#closeHangar'), hangarTabs: $('#hangarTabs'), hangarContent: $('#hangarContent'), hangarShipName: $('#hangarShipName'),
  bottomHudDock: $('#bottomHudDock'), chatDock: $('#chatDock'), chatToggle: $('#chatToggle'), chatBody: $('#chatBody'), chatTabs: $('#chatTabs'), chatStatus: $('#chatStatus'), chatChannelChip: $('#chatChannelChip'), chatPrivateRow: $('#chatPrivateRow'), chatPrivateCallsign: $('#chatPrivateCallsign'), chatPrivateOpen: $('#chatPrivateOpen'), chatFeed: $('#chatFeed'), chatForm: $('#chatForm'), chatInput: $('#chatInput'), chatSend: $('#chatSend'),
  loginModal: $('#loginModal'), loginTabBtn: $('#loginTabBtn'), registerTabBtn: $('#registerTabBtn'), loginForm: $('#loginForm'), registerForm: $('#registerForm'), recoveryForm: $('#recoveryForm'), forgotPasswordBtn: $('#forgotPasswordBtn'), recoveryPassword: $('#recoveryPassword'), recoveryPasswordConfirm: $('#recoveryPasswordConfirm'), loginEmail: $('#loginEmail'), loginPassword: $('#loginPassword'), registerCallsign: $('#registerCallsign'), registerEmail: $('#registerEmail'), registerPassword: $('#registerPassword'), authMessage: $('#authMessage'), userLabel: $('#userLabel'), rankChip: $('#rankChip'), syncLabel: $('#syncLabel'), worldSyncLabel: $('#worldSyncLabel'), logoutBtn: $('#logoutBtn'), safeZoneLabel: $('#safeZoneLabel'), cargoUsed: $('#cargoUsed'), cargoMax: $('#cargoMax'), cargoBtn: $('#cargoBtn'), cargoModal: $('#cargoModal'), closeCargo: $('#closeCargo'), cargoSummary: $('#cargoSummary'), cargoGrid: $('#cargoGrid'), sellAllCargo: $('#sellAllCargo'), refineryGrid: $('#refineryGrid'), baseServiceGrid: $('#baseServiceGrid'), adminBtn: $('#adminBtn'), adminModal: $('#adminModal'), closeAdmin: $('#closeAdmin'), adminSearchInput: $('#adminSearchInput'), adminSearchBtn: $('#adminSearchBtn'), adminRefreshBtn: $('#adminRefreshBtn'), adminUserList: $('#adminUserList'), adminActionLog: $('#adminActionLog'), adminMessage: $('#adminMessage'), adminBanDuration: $('#adminBanDuration'), adminBanReason: $('#adminBanReason'), adminTotalAccounts: $('#adminTotalAccounts'), adminOnlineAccounts: $('#adminOnlineAccounts'), adminBannedAccounts: $('#adminBannedAccounts'), adminRuntimeMonitorRefresh: $('#adminRuntimeMonitorRefresh'), adminRuntimeMonitorGrid: $('#adminRuntimeMonitorGrid'), adminRuntimeMonitorFoot: $('#adminRuntimeMonitorFoot'), adminRuntimeTabs: $('#adminRuntimeTabs'), adminRuntimeMonitorPanel: $('#adminRuntimeMonitorPanel'), adminRuntimeInterfacePanel: $('#adminRuntimeInterfacePanel'), adminRuntimeInterfaceReload: $('#adminRuntimeInterfaceReload'), adminRuntimeInterfaceGrid: $('#adminRuntimeInterfaceGrid'), adminRuntimeInterfaceMessage: $('#adminRuntimeInterfaceMessage'), adminRuntimeNpcPanel: $('#adminRuntimeNpcPanel'), adminRuntimeNpcReload: $('#adminRuntimeNpcReload'), adminRuntimeNpcGrid: $('#adminRuntimeNpcGrid'), adminRuntimeNpcMessage: $('#adminRuntimeNpcMessage'), adminRuntimeWorldPanel: $('#adminRuntimeWorldPanel'), adminRuntimeWorldReload: $('#adminRuntimeWorldReload'), adminRuntimeWorldTabs: $('#adminRuntimeWorldTabs'), adminRuntimeWorldGrid: $('#adminRuntimeWorldGrid'), adminRuntimeWorldMessage: $('#adminRuntimeWorldMessage'), adminRuntimeSystemsPanel: $('#adminRuntimeSystemsPanel'), adminRuntimeSystemsReload: $('#adminRuntimeSystemsReload'), adminRuntimeSystemsTabs: $('#adminRuntimeSystemsTabs'), adminRuntimeSystemsGrid: $('#adminRuntimeSystemsGrid'), adminRuntimeSystemsMessage: $('#adminRuntimeSystemsMessage'), adminRuntimeEventsPanel: $('#adminRuntimeEventsPanel'), adminRuntimeEventsReload: $('#adminRuntimeEventsReload'), adminRuntimeEventsGrid: $('#adminRuntimeEventsGrid'), adminRuntimeEventsMessage: $('#adminRuntimeEventsMessage'), adminTelemetrySummary: $('#adminTelemetrySummary'), adminHealthToggle: $('#adminHealthToggle'), adminTelemetryHealth: $('#adminTelemetryHealth'), adminTelemetrySources: $('#adminTelemetrySources'), adminTelemetryMilestones: $('#adminTelemetryMilestones'), adminTelemetryPlayers: $('#adminTelemetryPlayers'), adminTelemetryDetail: $('#adminTelemetryDetail'), configBtn: $('#configBtn'), configModal: $('#configModal'), closeConfig: $('#closeConfig'), qualityButtons: $('#qualityButtons'), qualityCurrentBadge: $('#qualityCurrentBadge'), performanceHint: $('#performanceHint'), audioEnabledToggle: $('#audioEnabledToggle'), audioVolumeRange: $('#audioVolumeRange'), audioVolumeValue: $('#audioVolumeValue'), hudSettingsGrid: $('#hudSettingsGrid'), settingsTabs: $('#settingsTabs'), settingsGamePanel: $('#settingsGamePanel'), settingsRankingPanel: $('#settingsRankingPanel'), settingsAccountPanel: $('#settingsAccountPanel'), rankingRefreshBtn: $('#rankingRefreshBtn'), rankingMyPatent: $('#rankingMyPatent'), rankingPatentGuide: $('#rankingPatentGuide'), rankingPoints: $('#rankingPoints'), rankingArena: $('#rankingArena'), rankingAliens: $('#rankingAliens'), rankingGg: $('#rankingGg'), rankingUpdated: $('#rankingUpdated'), accountEmail: $('#accountEmail'), accountCallsign: $('#accountCallsign'), accountSaveName: $('#accountSaveName'), accountNameStatus: $('#accountNameStatus'), accountNewPassword: $('#accountNewPassword'), accountConfirmPassword: $('#accountConfirmPassword'), accountSavePassword: $('#accountSavePassword'), accountPasswordStatus: $('#accountPasswordStatus'), accountSummary: $('#accountSummary'),
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
// Login bootstrap must never expose a half-initialized world (HP 1/1, empty NPC map, etc.).
const gameBootstrapRuntime={loading:false,ready:false,generation:0,lastError:null};
function bootstrapDelay(ms){return new Promise(resolve=>setTimeout(resolve,ms));}


// ===================== V15.1 SHARED UNIVERSE • REALTIME COMBAT PRESENCE =====================
const sharedUniverseRuntime={ready:false,status:'offline',latency:0,event:null,warfront:null,roomKey:null,lastPlayerSyncAt:0,lastCombatSignature:'',pendingOres:new Set(),lastSnapshotToastAt:0};
function sharedUniverseMap(){return !!authenticated&&!!progress&&!isGalaxyGateMap();}
function sharedUniverseOnline(){return sharedUniverseMap()&&sharedUniverseRuntime.ready&&sharedUniverse.isOnline();}
function updateSharedUniverseChip(){
  if(!ui.worldSyncLabel)return;const st=sharedUniverseRuntime.status,lat=Math.round(sharedUniverseRuntime.latency||0);
  ui.worldSyncLabel.textContent=st==='online'?(lat?`ONLINE ${lat}ms`:'ONLINE'):st==='connecting'?'CONECTANDO':st==='reconnecting'?'RECONECTANDO':st==='auth_error'?'SESSÃO':'OFFLINE';
  ui.worldSyncLabel.className=`sync-chip world-chip ${st==='online'?'ok':st==='reconnecting'||st==='connecting'?'busy':st==='offline'?'':'err'}`.trim();
}
function sharedWorldEvent(){return sharedUniverseRuntime.event||null;}
function sectorControlState(){return state.currentMap?.battle?(sharedUniverseRuntime.warfront||null):null;}
function sectorFactionColor(id){return FACTIONS[id]?.color||'#b7c8d4';}
function sectorFactionLabel(id){return FACTIONS[id]?.short||'NEUTRO';}
function sectorControlScore(id){return Math.max(0,Number(sectorControlState()?.scores?.[id])||0);}
function sectorControlNearbyTotal(node){return Object.values(node?.nearby||{}).reduce((s,n)=>s+Math.max(0,Number(n)||0),0);}
function sectorControlNodeHtml(node){const owner=node?.owner||null,challenger=node?.challenger||null,ownerLabel=owner?sectorFactionLabel(owner):'NEUTRO',ownerColor=owner?sectorFactionColor(owner):'#8aa0ad',challengeLabel=node?.contested?'CONTESTADO':challenger?(owner?'NEUTRALIZANDO':'CAPTURANDO'):'ESTÁVEL',challengeColor=node?.contested?'#ffffff':challenger?sectorFactionColor(challenger):ownerColor,progress=Math.max(0,Math.min(100,Number(node?.progress)||0)),near=sectorControlNearbyTotal(node);return `<article class="sector-node-card${node?.contested?' contested':''}" style="--sector-owner:${ownerColor};--sector-challenge:${challengeColor}"><div class="sector-node-symbol">${escHtml(node?.id||'?')}</div><div class="sector-node-main"><div><b>${escHtml(node?.label||'PONTO')}</b><small>${escHtml(ownerLabel)} • ${near} PILOTO(S) NA ZONA</small></div><strong>${escHtml(challengeLabel)}</strong></div><div class="sector-node-track"><i style="width:${progress}%"></i></div><div class="sector-node-foot"><span>${challenger?`${escHtml(sectorFactionLabel(challenger))} • ${Math.round(progress)}%`:owner?'SETOR CONTROLADO':'AGUARDANDO CAPTURA'}</span>${state.currentMap?.battle?`<button class="ghost-btn" data-warfront-nav="${escHtml(node?.id||'')}">IR</button>`:''}</div></article>`;}
function sectorControlPanelHtml(){const sc=sectorControlState();if(!state.currentMap?.battle)return `<section class="warfront-panel sector-control-panel"><div class="section-kicker">CONTROLE DE SETOR</div><div class="sector-control-empty"><b>ENTRE EM 4-1 / 4-2 / 4-3</b><span>Os pontos de controle são sincronizados pelo Shared Universe quando você entra em um Battle Map.</span></div></section>`;if(!sc)return `<section class="warfront-panel sector-control-panel"><div class="section-kicker">CONTROLE DE SETOR</div><div class="sector-control-empty"><b>SINCRONIZANDO SETOR...</b><span>Aguardando o estado tático do servidor.</span></div></section>`;const scores=sc.scores||{},dominant=sc.dominantFaction||null;return `<section class="warfront-panel sector-control-panel"><div class="sector-control-head"><div><div class="section-kicker">CONTROLE DE SETOR • ${escHtml(displayMapLabel(progress.mapId))}</div><h3>${dominant?`${escHtml(sectorFactionLabel(dominant))} EM VANTAGEM`:'SETOR DISPUTADO'}</h3><small>Capture os 3 relés. Mais pilotos da mesma facção aceleram a captura até o limite de 3.</small></div><div class="sector-scoreboard">${['earth','mars','jupiter'].map(id=>`<div style="--faction:${sectorFactionColor(id)}"><span>${escHtml(sectorFactionLabel(id))}</span><b>${fmt(scores[id]||0)}/3</b></div>`).join('')}</div></div><div class="sector-node-grid">${(sc.nodes||[]).map(sectorControlNodeHtml).join('')}</div><div class="warfront-rule-banner"><b>REGRA DA ETAPA 1:</b> captura territorial ainda não gera CR/STL/XP. Primeiro validamos disputa, tempo de captura e fluxo PvP; a economia entra na próxima etapa.</div></section>`;}

function normalizeSharedNpc(raw){
  const base=NPC_TYPES[raw.type]||{},x=Number(raw.x)||0,y=Number(raw.y)||0;return {...raw,x,y,tx:x,ty:y,netX:x,netY:y,netAt:Date.now(),vx:0,vy:0,sharedWorld:true,name:raw.name||base.name||raw.type,color:raw.color||base.color||'#ff755d',size:Number(raw.size||base.size||18),resources:{...(raw.resources||base.resources||{})},lastShot:0,lastAttackPlayerAt:0,jammedUntil:Number(raw.jammedUntil)||0,bossAttackScale:Number(raw.bossAttackScale)||1};
}
function joinSharedUniverse(){
  if(!sharedUniverseMap())return;sharedUniverseRuntime.ready=false;sharedUniverseRuntime.warfront=null;sharedUniverseRuntime.pendingOres.clear();state.enemyRespawns=[];state.oreRespawns=[];
  sharedUniverse.join({mapId:progress.mapId,territoryFaction:currentTerritoryFaction()||'battle',faction:progress.profile.faction,callsign:progress.profile.callsign||getUser()?.callsign||'Pilot',pilotTitle:activePilotTitle().label,shipId:progress.activeShipId,shipDesignId:currentShipDesign()?.design_id||null,level:progress.profile.level||1,x:player.x,y:player.y,angle:player.angle||0,hp:player.hp,maxHp:player.maxHp,shield:player.shield,maxShield:player.maxShield});
}
function syncSharedUniversePlayer(force=false){
  if(!sharedUniverseMap()||!sharedUniverse.isOnline())return;const now=Date.now(),ammo=currentLaserAmmo(),target=state.target&&state.target.hp>0?state.target:null,petOwned=!!progress.pet?.owned,petLaserActive=petOwned&&!!petRuntime.laserTargetId&&nowSec()<petRuntime.laserUntil;
  const combatSignature=[player.laserFiring?1:0,ammo?.id||'',target?.id||'',target?.isPlayer?1:0,petOwned?1:0,petRuntime.laserTargetId||'',petLaserActive?1:0,progress.pet?.activeGear||'off',currentShipDesignId()||'',currentPetDesignId()||''].join('|');
  if(!force&&now-sharedUniverseRuntime.lastPlayerSyncAt<75&&combatSignature===sharedUniverseRuntime.lastCombatSignature)return;sharedUniverseRuntime.lastPlayerSyncAt=now;sharedUniverseRuntime.lastCombatSignature=combatSignature;
  sharedUniverse.updatePlayer({x:player.x,y:player.y,angle:player.angle||0,hp:player.hp,maxHp:player.maxHp,shield:player.shield,maxShield:player.maxShield,faction:progress.profile.faction,shipId:progress.activeShipId,level:progress.profile.level||1,pilotTitle:activePilotTitle().label,shipDesignId:currentShipDesign()?.design_id||null,
    laserFiring:!!player.laserFiring&&!!target,laserColor:ammo?.color||'#76d9ff',laserAmmoId:ammo?.id||'lcb10',laserAmmoName:ammo?.name||'PLS-1',targetId:target?.id||null,targetIsPlayer:!!target?.isPlayer,
    pet:petOwned?{owned:true,level:progress.pet.level||1,x:petRuntime.x,y:petRuntime.y,angle:petRuntime.angle||0,activeGear:progress.pet.activeGear||'off',laserTargetId:petRuntime.laserTargetId||null,laserActive:petLaserActive,laserColor:ammo?.color||'#76d9ff',designId:currentPetDesign()?.design_id||null}:{owned:false}});
}
function findSharedNpc(id){return state.enemies.find(e=>e.id===id&&e.sharedWorld)||null;}
function purgeSharedEventEntities(activeEventId=null){
  const targetWasEvent=!!state.target?.eventNpc;
  state.enemies=state.enemies.filter(e=>!e.eventNpc||(activeEventId&&e.eventId===activeEventId));
  state.ores=state.ores.filter(o=>!o.eventOre||(activeEventId&&o.eventId===activeEventId));
  state.enemyRespawns=state.enemyRespawns.filter(r=>!r.eventId);
  state.oreRespawns=state.oreRespawns.filter(r=>!r.eventId&&!r.eventOre);
  if(targetWasEvent&&!state.enemies.some(e=>e.id===state.target?.id)){state.target=null;player.laserFiring=false;}
  galaxyEventRuntime.convoy=null;
}
function applySharedNpcPatch(raw){const e=findSharedNpc(raw.id);if(!e)return;const now=Date.now(),nx=Number(raw.x),ny=Number(raw.y),dt=Math.max(.001,Math.min(1,(now-(e.netAt||now))/1000));if(Number.isFinite(nx)&&Number.isFinite(ny)){const px=Number.isFinite(e.netX)?e.netX:e.x,py=Number.isFinite(e.netY)?e.netY:e.y;e.vx=Math.max(-1400,Math.min(1400,(nx-px)/dt));e.vy=Math.max(-1400,Math.min(1400,(ny-py)/dt));e.netX=nx;e.netY=ny;e.tx=nx;e.ty=ny;e.netAt=now;}const rest={...raw};delete rest.x;delete rest.y;Object.assign(e,rest);}
function sharedKillReward(entity,factor=1,opts={}){
  if(!progress)return;
  const share=Math.max(0,Math.min(1,Number(factor)||0));
  const clone=normalizeSharedNpc({...entity,
    credits:Math.max(0,Math.round((entity.credits||0)*share)),
    uridium:Math.max(0,Math.round((entity.uridium||0)*share)),
    xp:Math.max(0,Math.round((entity.xp||0)*share)),
    resources:{...(entity.resources||{})},sharedReward:true,sharedRewardShare:share,
    sharedFinalBlow:false,sharedDropBox:!!opts.dropBox,sharedGroupReward:!!opts.groupShared,sharedOwner:!!opts.owner
  });

  // V18.0.0: membros elegíveis recebem somente a parcela econômica do NPC.
  // Kill/missão/conquista/passe/clã pertencem ao primeiro atacante, evitando farm passivo de objetivos.
  const creditMult=1+pilotSkillValue('greed')/100,
        uriMult=1+pilotCombined('cruelty1','cruelty2')/100,
        xpMult=1+pilotSkillValue('tactics')/100;
  const earnedCredits=Math.round(clone.credits*creditMult),
        earnedUri=Math.round(clone.uridium*uriMult),
        earnedXp=Math.round((Number(clone.xp)||clone.credits/10+clone.uridium*12)*xpMult*designerXpMultiplier());
  progress.profile.credits+=earnedCredits;
  progress.profile.uridium+=earnedUri;
  progress.profile.xp+=earnedXp;
  telemetryEconomy('npc',{cr:earnedCredits,stl:earnedUri,xp:earnedXp});

  if(opts.owner){
    progress.profile.aliensKilled=(progress.profile.aliensKilled||0)+1;
    telemetryCounter('kills',1);journeyEvent('kill',1);syncAchievements(true);
    if(authenticated){
      const boss=/^boss/i.test(String(clone.type||'')),clanType=String(clone.type||'').replace(/^boss/i,'').toLowerCase();
      recordClanAlienKillOnline({npcType:clanType,isBoss:boss}).then(r=>{if(r?.status?.leveled_up){showToast(`CLÃ SUBIU PARA O LV ${r.status.new_level}!`,'reward');refreshClanState(true);}}).catch(()=>{});
    }
    if(String(clone.type||'').startsWith('boss')){
      rollRareBossLoot(clone);
      scoreClanWar(Math.max(1,Math.round(10*share)),'boss_kill');
    }
    addPetXp(Math.max(12,Math.round(clone.credits/120+clone.uridium*4)));
    missionEvent('kill',{enemy:clone,mapId:progress.mapId});
    battlePassEvent('kill',1);
  }
  processPlayerLevelUps();
  if(opts.dropBox)spawnNpcLootBox(clone);
  saveGame();

  const suffix=opts.groupShared?`GRUPO ${Math.max(1,Number(opts.eligibleCount)||1)} PILOTO(S)`:(opts.owner?'MARCAÇÃO EXCLUSIVA':'ABATE');
  pushActivity(`${suffix} • ${clone.name} • +${fmt(earnedCredits)} CR • +${fmt(earnedUri)} STL • +${fmt(earnedXp)} XP`,'combat');
}
function sharedNpcClaimState(e){
  const owner=String(e?.ownerUserId||''),me=String(getUser()?.id||'');if(!owner)return {claimed:false,friendly:false,owner:false};
  const myGroup=String(battleGroupState()?.group?.id||''),ownerGroup=String(e?.ownerGroupId||'');
  return {claimed:true,owner:owner===me,friendly:owner===me||!!(myGroup&&ownerGroup&&myGroup===ownerGroup)};
}
const warfrontAnnouncementQueue=[];
let warfrontAnnouncementRunning=false;
function warfrontAnnouncementElement(){
  let el=document.getElementById('warfrontGlobalAnnouncement');
  if(el)return el;
  el=document.createElement('div');el.id='warfrontGlobalAnnouncement';el.className='warfront-global-announcement';
  el.innerHTML='<div class="warfront-global-kicker">TRANSMISSÃO GLOBAL</div><strong></strong><span></span>';
  document.body.appendChild(el);return el;
}
function playNextWarfrontAnnouncement(){
  if(warfrontAnnouncementRunning||!warfrontAnnouncementQueue.length)return;
  warfrontAnnouncementRunning=true;
  const msg=warfrontAnnouncementQueue.shift(),el=warfrontAnnouncementElement();
  el.className=`warfront-global-announcement ${escHtml(msg.kind||'warfront_point')}`;
  el.querySelector('strong').textContent=String(msg.title||'WARFRONT');
  el.querySelector('span').textContent=String(msg.subtitle||'');
  requestAnimationFrame(()=>el.classList.add('show'));
  try{playSfx(msg.kind==='warfront_domination'?'reward':'warning');}catch{}
  pushActivity(`${msg.title||'WARFRONT'}${msg.subtitle?` • ${msg.subtitle}`:''}`,'combat');
  setTimeout(()=>{el.classList.remove('show');setTimeout(()=>{warfrontAnnouncementRunning=false;playNextWarfrontAnnouncement();},320);},4200);
}
function queueWarfrontGlobalAnnouncement(msg){
  if(!msg)return;
  warfrontAnnouncementQueue.push(msg);
  if(warfrontAnnouncementQueue.length>6)warfrontAnnouncementQueue.splice(0,warfrontAnnouncementQueue.length-6);
  playNextWarfrontAnnouncement();
}

function handleSharedUniverseMessage(msg){
  if(!msg||!progress)return;
  if(msg.type==='world_snapshot'){
    const targetId=state.target&&!state.target.isPlayer?state.target.id:null;state.enemies=(msg.npcs||[]).map(normalizeSharedNpc);state.ores=(msg.ores||[]).map(o=>({...o,sharedWorld:true}));state.enemyRespawns=[];state.oreRespawns=[];for(const rp of msg.players||[])upsertRealtimePlayer(rp,true);sharedUniverseRuntime.event=msg.event||null;sharedUniverseRuntime.warfront=msg.warfront||null;sharedUniverseRuntime.roomKey=msg.roomKey||null;sharedUniverseRuntime.ready=true;galaxyEventRuntime.convoy=msg.event?.convoy?{...msg.event.convoy}:null;if(targetId){const e=findSharedNpc(targetId);state.target=e||null;if(!e)player.laserFiring=false;}const now=Date.now();if(now-sharedUniverseRuntime.lastSnapshotToastAt>3000){sharedUniverseRuntime.lastSnapshotToastAt=now;showToast(`UNIVERSO SINCRONIZADO • ${state.enemies.length} NPCs • ${state.ores.length} recursos`,'system');}updateSharedUniverseChip();return;
  }
  if(msg.type==='world_player_spawn'||msg.type==='world_player_patch'){upsertRealtimePlayer(msg.entity||{},msg.type==='world_player_spawn');return;}
  if(msg.type==='world_player_leave'){const id=String(msg.userId||'');if(state.target?.isPlayer&&state.target.id===id){state.target=null;player.laserFiring=false;}onlineWorld.players.delete(id);return;}
  if(msg.type==='warfront_control'){sharedUniverseRuntime.warfront=msg.warfront||null;updateWarfrontBadge();if(ui.warfrontModal&&!ui.warfrontModal.classList.contains('hidden'))renderWarfront();return;}
  if(msg.type==='global_announcement'){queueWarfrontGlobalAnnouncement(msg);return;}
  if(msg.type==='npc_batch'){for(const e of msg.entities||[])applySharedNpcPatch(e);return;}
  if(msg.type==='npc_patch'){applySharedNpcPatch(msg.entity||{});return;}
  if(msg.type==='npc_claim'){const e=findSharedNpc(msg.entityId);if(e){e.ownerUserId=msg.ownerUserId||null;e.ownerGroupId=msg.ownerGroupId||null;e.claimedAt=Number(msg.claimedAt)||Date.now();}return;}
  if(msg.type==='npc_spawn'){const e=normalizeSharedNpc(msg.entity||{});if(e.id&&!findSharedNpc(e.id))state.enemies.push(e);return;}
  if(msg.type==='npc_remove'){const id=String(msg.entityId||'');state.enemies=state.enemies.filter(e=>String(e.id)!==id);if(state.target&&!state.target.isPlayer&&String(state.target.id)===id){state.target=null;player.laserFiring=false;}return;}
  if(msg.type==='npc_death'){
    const e=findSharedNpc(msg.entity?.id)||normalizeSharedNpc(msg.entity||{});if(e?.id){playSfx('explosion');spawnExplosionFx(e.x,e.y,e.color,String(e.type||'').startsWith('boss'));triggerCombatFlash(String(e.type||'').startsWith('boss')?'red':'cyan');state.enemies=state.enemies.filter(x=>x.id!==e.id);if(state.target?.id===e.id){state.target=null;player.laserFiring=false;autoAcquireNextTarget(e.id);}}return;
  }
  if(msg.type==='kill_credit'){const me=String(getUser()?.id||'');sharedKillReward(msg.entity||{},msg.factor,{groupShared:!!msg.groupShared,eligibleCount:msg.eligibleCount,dropBox:!!msg.dropBox,owner:String(msg.ownerUserId||'')===me});return;}
  if(msg.type==='npc_loot_credit'){const e=normalizeSharedNpc(msg.entity||{});spawnNpcLootBox(e);pushActivity(`BOX EXCLUSIVA • ${e.name} • primeira marcação`,'reward');return;}
  if(msg.type==='damage_result'){
    const e=findSharedNpc(msg.entityId);if(e){e.hp=Number(msg.hp??e.hp);e.shield=Number(msg.shield??e.shield);if(msg.ownerUserId!==undefined)e.ownerUserId=msg.ownerUserId||null;if(msg.ownerGroupId!==undefined)e.ownerGroupId=msg.ownerGroupId||null;if(msg.actual>0){const shieldHit=Number(msg.beforeShield||0)>Number(msg.shield||0);spawnCombatText(e.x,e.y-e.size,msg.critical?`CRÍTICO ${fmt(msg.actual)}`:`-${fmt(msg.actual)}`,msg.critical?'#ffe96f':(shieldHit?'#62dcff':'#ff8b8b'),{critical:!!msg.critical,kind:shieldHit?'shield':'damage'});spawnImpactFx(e.x,e.y,shieldHit?'#55d8ff':'#ff6b77',shieldHit?30:22,shieldHit?'shield':'impact');battlePassEvent('damage',msg.actual);battlePassEvent('attack',1);}if(msg.mode==='shield_drain'&&msg.actual>0){const before=player.shield;player.shield=Math.min(player.maxShield,player.shield+Number(msg.actual||0));const gain=Math.max(0,Math.round(player.shield-before));if(gain)spawnParticle(player.x,player.y-34,`ESCUDO +${fmt(gain)}`,'#79f1ff');}}return;
  }
  if(msg.type==='ore_remove'){sharedUniverseRuntime.pendingOres.delete(msg.entityId);state.ores=state.ores.filter(o=>o.id!==msg.entityId);return;}
  if(msg.type==='ore_spawn'){const o={...(msg.ore||{}),sharedWorld:true};if(o.id&&!state.ores.some(x=>x.id===o.id))state.ores.push(o);return;}
  if(msg.type==='ore_collect_result'){sharedUniverseRuntime.pendingOres.delete(msg.entityId);return;}
  if(msg.type==='ore_collected'){
    const o=msg.ore;if(!o)return;sharedUniverseRuntime.pendingOres.delete(o.id);state.ores=state.ores.filter(x=>x.id!==o.id);const got=addCargoResource(o.type,o.amount);if(got>0){playSfx('pickup');spawnParticle(o.x,o.y,`+${fmt(got)} ${o.type}`,o.color);pushActivity(`RECURSO ONLINE • +${fmt(got)} ${o.type}`,'ore');telemetryCounter('ore_nodes',1);telemetryCounter('ore_units',got);titleStatAdd('oreUnits',got);journeyEvent('ore',got);missionEvent('collectOre',{amount:got,type:o.type,mapId:progress.mapId});saveGame();}return;
  }
  if(msg.type==='npc_aggro'){const e=findSharedNpc(msg.entityId);if(e)e.aggroUserId=msg.userId||null;if(String(msg.userId||'')===String(getUser()?.id||'')){state.portalCombatUntil=Math.max(state.portalCombatUntil,nowSec()+6);setCombatAlert('NPC FIXOU ALVO EM VOCÊ','combat',1.4);}return;}
  if(msg.type==='npc_attack'){const e=findSharedNpc(msg.entityId);if(e)e.lastAttackPlayerAt=nowSec();const retaliation=!!msg.retaliation;if(retaliation&&isPortalNeutralZone())state.portalCombatUntil=Math.max(state.portalCombatUntil,nowSec()+6);takePlayerDamage(Math.max(0,Number(msg.damage)||0),{forceNpcRetaliation:retaliation});return;}
  if(msg.type==='event_cleanup'){
    const npcIds=new Set(msg.npcIds||[]),oreIds=new Set(msg.oreIds||[]);
    if(npcIds.size)state.enemies=state.enemies.filter(e=>!npcIds.has(e.id));else purgeSharedEventEntities(null);
    if(oreIds.size)state.ores=state.ores.filter(o=>!oreIds.has(o.id));
    if(state.target?.eventNpc&&(!state.enemies.some(e=>e.id===state.target.id))){state.target=null;player.laserFiring=false;}
    galaxyEventRuntime.convoy=null;return;
  }
  if(msg.type==='event_update'){
    const previousEventId=sharedUniverseRuntime.event?.eventId||null,nextEventId=msg.event?.eventId||null;
    sharedUniverseRuntime.event=msg.event||null;
    if(previousEventId!==nextEventId||!nextEventId||msg.event?.complete)purgeSharedEventEntities(nextEventId&&!msg.event?.complete?nextEventId:null);
    galaxyEventRuntime.convoy=msg.event?.convoy?{...msg.event.convoy}:null;
    if(msg.event){const ev=currentGalaxyEvent(),rec=galaxyEventRecord(ev);rec.value=Math.max(0,Number(msg.event.progress)||0);rec.complete=!!msg.event.complete;}
    return;
  }
  if(msg.type==='event_credit'){
    sharedUniverseRuntime.event=msg.event||sharedUniverseRuntime.event;const ev=currentGalaxyEvent(),rec=galaxyEventRecord(ev);if(!rec.rewarded)completeGalaxyEvent(ev);return;
  }
}
const sharedUniverse=new SharedUniverseClient({
  getCredentials:()=>getSessionCredentials(),
  onMessage:handleSharedUniverseMessage,
  onStatus:st=>{sharedUniverseRuntime.status=st.state;sharedUniverseRuntime.latency=st.latency||0;if(st.state!=='online')sharedUniverseRuntime.ready=false;updateSharedUniverseChip();}
});
function saveKey(){return `${SAVE_KEY_PREFIX}:${getUser()?.id || 'guest'}`;}
const TWO_PI = Math.PI * 2;
const CARGO_BOX_LIFETIME_SEC = 30;
const categories = {
  ships:'Naves', lasers:'Lasers', generators:'Geradores', drones:'Drones', pet:'AUX-9', extras:'Extras', ammo:'Munição', rockets:'Mísseis'
};

// ===================== V16.6 PREMIUM • CUPONS =====================
const premiumRuntime={state:null,busy:false,lastAt:0};
const PREMIUM_LOCAL_PLANS=[
  {id:'premium_7d',category:'premium',name:'PREMIUM • 1 SEMANA',description:'7 dias de Premium com todos os bônus ativos.',price_brl:14.9,days:7},
  {id:'premium_30d',category:'premium',name:'PREMIUM • 1 MÊS',description:'30 dias de Premium para farm, combate e progressão.',price_brl:39.9,days:30},
  {id:'premium_90d',category:'premium',name:'PREMIUM • 3 MESES',description:'90 dias de Premium com excelente custo-benefício.',price_brl:99.9,days:90},
  {id:'premium_180d',category:'premium',name:'PREMIUM • 6 MESES',description:'180 dias de Premium para longa temporada.',price_brl:179.9,days:180},
];
const PREMIUM_EVENT_COUPONS={
  EVENTO7D:{code:'EVENTO7D',name:'Cupom de Evento • 7D',days:7,items:{rep2:1},description:'Libera 1 semana de Premium e 1 Nanobot de Reparo • Comum.'}
};
function freshPremiumMeta(){return {localPremiumUntil:null,couponsRedeemed:{}};}
function normalizePremiumMeta(){if(!progress)return freshPremiumMeta();progress.premiumMeta ||= freshPremiumMeta();progress.premiumMeta.couponsRedeemed ||= {};return progress.premiumMeta;}
function localPremiumUntilMs(){const iso=progress?normalizePremiumMeta().localPremiumUntil:null;const ts=iso?Date.parse(iso):0;return Number.isFinite(ts)?ts:0;}
function remotePremiumUntilMs(){const iso=premiumRuntime.state?.premium_until||null;const ts=iso?Date.parse(iso):0;return Number.isFinite(ts)?ts:0;}
function effectivePremiumUntilMs(){return Math.max(remotePremiumUntilMs(),localPremiumUntilMs());}
function premiumActive(){return effectivePremiumUntilMs()>Date.now();}
function premiumPassActive(){return !!premiumRuntime.state?.battle_pass_active;}
function premiumCanPurchase(){return !!premiumRuntime.state?.can_purchase||isAdminPilot();}
function premiumAutoCombatAccess(){return premiumActive()||premiumPassActive();}
function premiumElitePrice(price,currency){const p=Math.max(0,Math.round(Number(price)||0));return currency==='uridium'&&premiumActive()?Math.max(1,Math.floor(p*.95)):p;}
function alphaSpinUnitCost(){const gd=galaxyGateDef(),q=liveQuote(`gate_spin:${gd.key}`),base=Math.max(1,Math.round(Number(q?.basePrice??q?.price??gd.spinCost)||gd.spinCost));return premiumActive()?Math.max(1,Math.floor(base*.90)):base;}
function premiumLocalPlanById(id){return PREMIUM_LOCAL_PLANS.find(p=>p.id===String(id||''))||null;}
function premiumCatalogForRender(){const remote=Array.isArray(premiumRuntime.state?.catalog)?premiumRuntime.state.catalog:[];return [...PREMIUM_LOCAL_PLANS,...remote.filter(p=>p.category!=='premium')];}
function extendLocalPremium(days){if(!progress)return 0;const meta=normalizePremiumMeta();const base=Math.max(Date.now(),effectivePremiumUntilMs());const until=base+Math.max(1,Number(days)||0)*86400000;meta.localPremiumUntil=new Date(until).toISOString();cloudDirty=true;saveGame();return until;}
function redeemPremiumCouponLocal(code){const key=String(code||'').trim().toUpperCase();const meta=normalizePremiumMeta();const def=PREMIUM_EVENT_COUPONS[key];if(!def)throw new Error('Cupom inválido ou expirado.');if(meta.couponsRedeemed[key])throw new Error('Cupom já resgatado nesta conta.');const until=extendLocalPremium(def.days);for(const [itemId,qty] of Object.entries(def.items||{})){if(ITEMS[itemId])addInventory(itemId,Math.max(1,Number(qty)||1));}meta.couponsRedeemed[key]=new Date().toISOString();cloudDirty=true;saveGame();return {def,until};}
function updatePremiumBadge(){if(!ui.premiumTopStatus)return;ui.premiumTopStatus.textContent=premiumActive()?'ATIVO':premiumPassActive()?'PASSE':'LOJA';ui.premiumBtn?.classList.toggle('gold',premiumActive()||premiumPassActive());}
async function refreshPremiumState(force=false){if(!authenticated){updatePremiumBadge();return premiumRuntime.state;}if(!force&&premiumRuntime.state&&Date.now()-premiumRuntime.lastAt<30000){updatePremiumBadge();return premiumRuntime.state;}if(premiumRuntime.busy)return premiumRuntime.state;premiumRuntime.busy=true;try{premiumRuntime.state=await getPremiumShopOnline();premiumRuntime.lastAt=Date.now();updatePremiumBadge();renderSettings();return premiumRuntime.state;}catch(e){console.warn('premium state',e);updatePremiumBadge();renderSettings();return premiumRuntime.state;}finally{premiumRuntime.busy=false;}}

// ===================== V16 LIVE OPS RUNTIME =====================
const liveOpsRuntime={state:null,catalog:new Map(),busy:false,lastAt:0};
const livePetSlotPrices=new Map();
function liveCatalog(key){return liveOpsRuntime.catalog.get(String(key||''))||null;}
function liveQuote(key){const row=liveCatalog(key);if(!row||row.enabled===false)return null;const base=Math.max(0,Math.round(Number(row.price)||0)),discount=String(row.currency)==='uridium'&&premiumActive()&&['ship','laser','generator','drone','extra','pet','pet_gear'].includes(String(row.kind||''));return {...row,basePrice:base,price:discount?Math.max(1,Math.floor(base*.95)):base,currency:String(row.currency)==='uridium'?'uridium':'credits'};}
function applyLiveCatalog(rows){
  liveOpsRuntime.catalog=new Map();livePetSlotPrices.clear();
  for(const row of Array.isArray(rows)?rows:[]){
    if(!row?.enabled)continue;liveOpsRuntime.catalog.set(String(row.catalog_key||''),row);const id=String(row.ref_id||''),price=Math.max(0,Number(row.price)||0),currency=String(row.currency||'credits');
    if(row.kind==='ship'&&SHIPS[id]){SHIPS[id].price=price;SHIPS[id].currency=currency;}
    else if(['laser','generator','extra'].includes(row.kind)&&ITEMS[id]){ITEMS[id].price=price;ITEMS[id].currency=currency;}
    else if(row.kind==='drone'&&ITEMS[id]){ITEMS[id].price=price;ITEMS[id].currency=currency;}
    else if(row.kind==='ammo'&&LASER_AMMO[id]){LASER_AMMO[id].price=price;LASER_AMMO[id].currency=currency;}
    else if(row.kind==='rocket'&&ROCKETS[id]){ROCKETS[id].price=price;ROCKETS[id].currency=currency;}
    else if(row.kind==='pet'){PET_BASE_PRICE=price;}
    else if(row.kind==='pet_gear'&&PET_GEARS[id]){PET_GEARS[id].cost=price;PET_GEARS[id].currency=currency;}
    else if(row.kind==='pet_slot')livePetSlotPrices.set(Number(id),price);
    else if(row.kind==='gate_spin'&&GALAXY_GATE_DEFS[id])GALAXY_GATE_DEFS[id].spinCost=price;
    else if(row.kind==='quantum_core')LOG_DISK_URI_PRICE=price;
    else if(row.kind==='resource'&&RESOURCES[id])RESOURCES[id].sell=price;
  }
}
async function refreshLiveOpsState(force=false){
  if(!authenticated)return liveOpsRuntime.state;if(!force&&liveOpsRuntime.state&&Date.now()-liveOpsRuntime.lastAt<15000)return liveOpsRuntime.state;if(liveOpsRuntime.busy)return liveOpsRuntime.state;liveOpsRuntime.busy=true;
  try{const data=await loadLiveOpsOnline(force);liveOpsRuntime.state=data||{events:[],catalog:[]};liveOpsRuntime.lastAt=Date.now();applyLiveCatalog(data?.catalog||[]);return liveOpsRuntime.state;}catch(e){console.warn('live ops',e);return liveOpsRuntime.state;}finally{liveOpsRuntime.busy=false;}
}
async function applyAuthoritativePurchase(catalogKey,label='Item'){
  try{await flushCloudSave(true);const before={credits:Number(progress?.profile?.credits)||0,uridium:Number(progress?.profile?.uridium)||0};const result=await purchaseLiveCatalogOnline(catalogKey);if(!result?.state)throw new Error('Servidor não retornou o save atualizado.');installServerStatePreservingPosition(result.state);telemetryTrackEconomyTransition('catalog_purchase',before,progress?.profile,result?.purchase||{});cloudDirty=false;try{localStorage.setItem(saveKey(),JSON.stringify(progress));}catch{}computeStats(true);buildAmmoButtons();renderShop();refreshPetViews();updateUI();showToast(`${label} adquirido • compra validada no servidor`,'shop');return true;}catch(e){showToast(e.message||'Compra recusada pelo servidor');return false;}
}


// ===================== V16.5 DESIGNER SYSTEM • DRONE + SHIP + AUX =====================
const designerRuntime={state:{inventory:{},drones:{},loadout:{ship:null,pet:null},catalog:[]},busy:false,lastAt:0};
function designerCatalog(){return Array.isArray(designerRuntime.state?.catalog)?designerRuntime.state.catalog:[];}
function designById(id){return designerCatalog().find(d=>d.design_id===id)||null;}
function droneDesignId(droneId){return designerRuntime.state?.drones?.[String(droneId||'')]||null;}
function droneDesignFor(droneId){return designById(droneDesignId(droneId));}
function currentShipDesignId(){return designerRuntime.state?.loadout?.ship||null;}
function currentPetDesignId(){return designerRuntime.state?.loadout?.pet||null;}
function shipDesignerEligible(shipId=progress?.activeShipId){const ship=SHIPS[shipId];return !!ship&&(!!ship.eventOnly||ship.currency==='uridium');}
function currentShipDesign(){const d=designById(currentShipDesignId());return d?.kind==='ship'&&shipDesignerEligible()?d:null;}
function currentPetDesign(){const d=designById(currentPetDesignId());return d?.kind==='pet'&&progress?.pet?.owned?d:null;}
function ownedDesignQty(id){return Math.max(0,Number(designerRuntime.state?.inventory?.[id])||0);}
function freshAdminUnlockState(){return {kitGranted:false,designer:{loadout:{ship:null,pet:null},drones:{}}};}
function normalizeAdminUnlockState(){if(!progress)return freshAdminUnlockState();progress.adminUnlock ||= freshAdminUnlockState();progress.adminUnlock.designer ||= {loadout:{ship:null,pet:null},drones:{}};progress.adminUnlock.designer.loadout ||= {ship:null,pet:null};progress.adminUnlock.designer.drones ||= {};return progress.adminUnlock;}
function ensureAdminEntitlements(){
  if(!progress||!isAdminPilot())return false;
  const admin=normalizeAdminUnlockState();let changed=false;
  progress.ownedShips ||= ['phoenix'];
  for(const shipId of Object.keys(SHIPS))if(!progress.ownedShips.includes(shipId)){progress.ownedShips.push(shipId);changed=true;}
  progress.inventory ||= {};
  for(const [itemId,item] of Object.entries(ITEMS)){
    if(item.type==='drone')continue;
    const target=item.type==='laser'||item.type==='generator'?32:item.type==='ammo'||item.type==='rocket'?5000:1;
    if((Number(progress.inventory[itemId])||0)<target){progress.inventory[itemId]=target;changed=true;}
  }
  progress.drones ||= [];
  const irisSlots=Math.max(1,Number(ITEMS.iris?.slots)||2);
  while(progress.drones.length<8){progress.drones.push({id:`adm_iris_${Date.now()}_${progress.drones.length}`,type:'iris',slots:Array(irisSlots).fill(null)});changed=true;}
  progress.pet ||= freshPet();
  if(!progress.pet.owned){progress.pet.owned=true;changed=true;}
  progress.pet.gearsOwned ||= {guard:false,box:false,ore:false,repair:false,kami:false};
  for(const key of ['guard','box','ore','repair','kami'])if(!progress.pet.gearsOwned[key]){progress.pet.gearsOwned[key]=true;changed=true;}
  normalizePremiumMeta();
  if(changed){admin.kitGranted=true;cloudDirty=true;saveGame();}
  return changed;
}
function applyAdminDesignerOverrides(state=designerRuntime.state){
  if(!progress||!isAdminPilot()||!state)return state;
  const admin=normalizeAdminUnlockState().designer;
  state.inventory ||= {};state.drones ||= {};state.loadout ||= {ship:null,pet:null};state.catalog ||= [];
  for(const def of state.catalog){const qty=def.kind==='drone'?8:1;if((Number(state.inventory[def.design_id])||0)<qty)state.inventory[def.design_id]=qty;}
  if(admin.loadout.ship!==undefined)state.loadout.ship=admin.loadout.ship;
  if(admin.loadout.pet!==undefined)state.loadout.pet=admin.loadout.pet;
  for(const [droneId,designId] of Object.entries(admin.drones||{})){if(designId&&(progress.drones||[]).some(d=>d.id===droneId))state.drones[droneId]=designId;}
  return state;
}
function persistAdminDesignerSelection(kind,designId=null,droneId=null){
  if(!progress||!isAdminPilot())return;
  const admin=normalizeAdminUnlockState().designer;
  if(kind==='ship')admin.loadout.ship=designId||null;
  else if(kind==='pet')admin.loadout.pet=designId||null;
  else if(kind==='drone'&&droneId){if(designId)admin.drones[droneId]=designId;else delete admin.drones[droneId];}
  cloudDirty=true;saveGame();
}
function equippedDesignCount(id){return progress?.drones?.filter(d=>droneDesignId(d.id)===id).length||0;}
function pctText(v){return `${(Math.max(0,Number(v)||0)*100).toFixed((Number(v)||0)*100%1?1:0)}%`;}
function rarityLabel(r='rare'){return ({rare:'RARO',epic:'ÉPICO',legendary:'LENDÁRIO',mythic:'MÍTICO'})[String(r||'').toLowerCase()]||String(r||'RARO').toUpperCase();}
function designerBonusSummary(d){
  const b=d?.bonuses||{},parts=[];
  if(b.damage_per_drone)parts.push(`+${pctText(b.damage_per_drone)} DANO / drone`);
  if(b.shield_per_drone)parts.push(`+${pctText(b.shield_per_drone)} ESCUDO / drone`);
  if(b.hp_per_drone)parts.push(`+${pctText(b.hp_per_drone)} HP / drone`);
  if(b.full_set_damage)parts.push(`SET 8/8: +${pctText(b.full_set_damage)} DANO`);
  if(b.full_set_shield)parts.push(`SET 8/8: +${pctText(b.full_set_shield)} ESCUDO`);
  if(b.full_set_hp)parts.push(`SET 8/8: +${pctText(b.full_set_hp)} HP`);
  if(b.hp)parts.push(`+${pctText(b.hp)} HP`);if(b.shield)parts.push(`+${pctText(b.shield)} ESCUDO`);if(b.damage)parts.push(`+${pctText(b.damage)} DANO`);
  if(b.xp)parts.push(`+${pctText(b.xp)} XP`);if(b.crit)parts.push(`+${pctText(b.crit)} CRÍTICO`);if(b.repair)parts.push(`+${pctText(b.repair)} REPARAÇÃO`);
  if(d?.ability?.name)parts.push(`HAB: ${d.ability.name}`);
  return parts.join(' • ')||'Visual raro';
}
function droneDesignerMultipliers(){
  const counts=new Map();for(const d of progress?.drones||[]){const id=droneDesignId(d.id);if(id)counts.set(id,(counts.get(id)||0)+1);}
  let hp=1,shield=1,damage=1;const setSize=8;
  for(const [id,count] of counts){const def=designById(id),b=def?.bonuses||{};hp+=Number(b.hp_per_drone||0)*count;shield+=Number(b.shield_per_drone||0)*count;damage+=Number(b.damage_per_drone||0)*count;if((progress?.drones?.length||0)===setSize&&count===setSize){hp+=Number(b.full_set_hp||0);shield+=Number(b.full_set_shield||0);damage+=Number(b.full_set_damage||0);}}
  return {hp,shield,damage,counts};
}
function shipDesignerBonuses(){return currentShipDesign()?.bonuses||{};}
function petDesignerBonuses(){return currentPetDesign()?.bonuses||{};}
function petDesignerDamageMultiplier(){return 1+Number(petDesignerBonuses().damage||0);}
function designerXpMultiplier(){const ship=Number(shipDesignerBonuses().xp||0),pet=Number(petDesignerBonuses().xp||0),def=shipAbilityDef?.(),active=def&&shipAbilityActive?.(def.id)?Number(def.xp_active||0)*abilityPowerMultiplier():0;return 1+ship+pet+active;}
function designerCritChanceBonus(){const def=shipAbilityDef?.(),active=def&&shipAbilityActive?.(def.id)?Number(def.crit_active||0)*abilityPowerMultiplier():0;return Number(shipDesignerBonuses().crit||0)+active;}
function designerRepairMultiplier(){return 1+Number(shipDesignerBonuses().repair||0);}
function designerVisualCss(d){return d?.visual?.filter||'none';}
async function refreshDesignerState(force=false){
  if(!authenticated)return applyAdminDesignerOverrides(designerRuntime.state);
  if(!force&&designerRuntime.lastAt&&Date.now()-designerRuntime.lastAt<15000)return applyAdminDesignerOverrides(designerRuntime.state);
  if(designerRuntime.busy)return designerRuntime.state;designerRuntime.busy=true;
  try{
    const data=await getMyDesignersOnline();
    if(data&&typeof data==='object')designerRuntime.state={inventory:data.inventory||{},drones:data.drones||{},loadout:data.loadout||{ship:null,pet:null},catalog:Array.isArray(data.catalog)?data.catalog:[]};
    designerRuntime.state=applyAdminDesignerOverrides(designerRuntime.state);designerRuntime.lastAt=Date.now();return designerRuntime.state;
  }catch(e){console.warn('designers',e);designerRuntime.state=applyAdminDesignerOverrides(designerRuntime.state);return designerRuntime.state;}
  finally{designerRuntime.busy=false;}
}
async function equipDroneDesigner(droneId,designId){
  if(!canChangeEquipment()){showToast('Designers de drone só podem ser alterados na sua base X-1');return;}
  if(isAdminPilot()){designerRuntime.state.drones[droneId]=designId||null;if(!designId)delete designerRuntime.state.drones[droneId];persistAdminDesignerSelection('drone',designId||null,droneId);designerRuntime.lastAt=Date.now();computeStats(true);saveGame();renderHangar();updateUI();syncSharedUniversePlayer(true);showToast(designId?`${designById(designId)?.name||'Designer'} equipado`:'Designer removido');return;}
  try{await flushCloudSave(true);designerRuntime.state=await setDesignLoadoutOnline({kind:'drone',designId:designId||null,droneId});designerRuntime.state=applyAdminDesignerOverrides(designerRuntime.state);designerRuntime.lastAt=Date.now();computeStats(true);saveGame();renderHangar();updateUI();syncSharedUniversePlayer(true);showToast(designId?`${designById(designId)?.name||'Designer'} equipado`:'Designer removido');}catch(e){showToast(e.message||'Não foi possível equipar o designer');}
}
async function equipShipDesigner(designId){
  if(!canChangeEquipment()){showToast('Designer de nave só pode ser alterado na sua base X-1');return;}
  if(designId&&!shipDesignerEligible()){showToast('Designers de nave são exclusivos de naves ELITE ou ESPECIAIS DE EVENTO');return;}
  if(isAdminPilot()){designerRuntime.state.loadout.ship=designId||null;persistAdminDesignerSelection('ship',designId||null);designerRuntime.lastAt=Date.now();abilityRuntime.activeId=null;abilityRuntime.activeUntil=0;computeStats(true);saveGame();renderHangar();updateAbilityHud();updateUI();syncSharedUniversePlayer(true);showToast(designId?`${designById(designId)?.name||'Designer'} ativado na nave`:'Designer de nave removido');return;}
  try{await flushCloudSave(true);designerRuntime.state=await setDesignLoadoutOnline({kind:'ship',designId:designId||null});designerRuntime.state=applyAdminDesignerOverrides(designerRuntime.state);designerRuntime.lastAt=Date.now();abilityRuntime.activeId=null;abilityRuntime.activeUntil=0;computeStats(true);saveGame();renderHangar();updateAbilityHud();updateUI();syncSharedUniversePlayer(true);showToast(designId?`${designById(designId)?.name||'Designer'} ativado na nave`:'Designer de nave removido');}catch(e){showToast(e.message||'Não foi possível equipar o designer de nave');}
}
async function equipPetDesigner(designId){
  if(!canChangeEquipment()){showToast('Designer do AUX-9 só pode ser alterado na sua base X-1');return;}
  if(!progress?.pet?.owned){showToast('Adquira o AUX-9 primeiro');return;}
  if(isAdminPilot()){designerRuntime.state.loadout.pet=designId||null;persistAdminDesignerSelection('pet',designId||null);designerRuntime.lastAt=Date.now();computeStats(true);saveGame();refreshPetViews();renderHangar();updateUI();syncSharedUniversePlayer(true);showToast(designId?`${designById(designId)?.name||'Designer'} ativado no AUX-9`:'Designer do AUX-9 removido');return;}
  try{await flushCloudSave(true);designerRuntime.state=await setDesignLoadoutOnline({kind:'pet',designId:designId||null});designerRuntime.state=applyAdminDesignerOverrides(designerRuntime.state);designerRuntime.lastAt=Date.now();computeStats(true);saveGame();refreshPetViews();renderHangar();updateUI();syncSharedUniversePlayer(true);showToast(designId?`${designById(designId)?.name||'Designer'} ativado no AUX-9`:'Designer do AUX-9 removido');}catch(e){showToast(e.message||'Não foi possível equipar o designer do AUX-9');}
}
async function claimGateDroneDesignerDrop(gate,completion){
  if(!['beta','gamma'].includes(String(gate)))return;
  try{await flushCloudSave(true);const r=await claimGateDroneDesignOnline({gate,completion});if(!r?.eligible)return;if(r.design_id&&!r.already_claimed){await refreshDesignerState(true);const d=designById(r.design_id);playSfx('reward');showToast(`DROP RARO! ${d?.name||r.name||r.design_id} • Designer de Drone`,'reward');pushActivity(`DESIGNER RARO • ${d?.name||r.name||r.design_id} obtido no ${gate==='beta'?'NEXUS':'ECLIPSE'}`,'reward');renderHangar();}else if(r.design_id&&r.already_claimed){await refreshDesignerState(true);}}catch(e){console.warn('designer gate claim',e);}
}
async function claimEventDesignerDrop(ev){
  if(!authenticated||!ev||ev.id==='none'||!ev.eventId)return;
  try{await flushCloudSave(true);const r=await claimEventDesignerOnline({eventId:ev.eventId,eventKey:ev.id});if(!r?.eligible)return;if(r.design_id&&!r.already_claimed){await refreshDesignerState(true);const d=designById(r.design_id);playSfx('reward');triggerCombatFlash('gold');queueCelebration('mission','DROP DE EVENTO',`${d?.name||r.name||r.design_id} • ${d?.kind==='ship'?'DESIGNER DE NAVE':'DESIGNER AUX-9'}`);showToast(`DROP ${rarityLabel(d?.rarity)}! ${d?.name||r.name||r.design_id}`,'reward');pushActivity(`DESIGNER DE EVENTO • ${d?.name||r.name||r.design_id} • ${ev.name}`,'reward');renderHangar();refreshPetViews();}else if(r.design_id&&r.already_claimed){await refreshDesignerState(true);}}catch(e){console.warn('designer event claim',e);}
}


// ===================== V16.1 ECONOMY GUARD =====================
const economyRuntime={queue:Promise.resolve(),autoPending:new Set()};


// ===================== V17.9.3 PROGRESSION TELEMETRY =====================
const TELEMETRY_SOURCE_KEYS=['npc','mission','resource','pass','event','gate','discovery','other'];
function freshTelemetryPending(){return {counters:{sessions:0,play_seconds:0,kills:0,boxes:0,ore_nodes:0,ore_units:0,missions_completed:0,deaths:0,map_jumps:0,level_ups:0},spent:{cr:0,stl:0},sources:Object.fromEntries(TELEMETRY_SOURCE_KEYS.map(k=>[k,{cr:0,stl:0,xp:0}])),level_events:[]};}
const telemetryRuntime={pending:freshTelemetryPending(),activeRemainder:0,lastFlushAt:0,flushing:false,sessionOpen:false};
function telemetrySafeAdd(obj,key,value){const n=Math.round(Number(value)||0);if(!n)return;obj[key]=Math.max(0,(Number(obj[key])||0)+n);}
function telemetryCounter(key,amount=1){if(!telemetryRuntime.pending?.counters)return;telemetrySafeAdd(telemetryRuntime.pending.counters,key,amount);}
function telemetryEconomy(source,{cr=0,stl=0,xp=0}={}){const key=TELEMETRY_SOURCE_KEYS.includes(source)?source:'other',row=telemetryRuntime.pending.sources[key];if(Number(cr)>0)telemetrySafeAdd(row,'cr',cr);else if(Number(cr)<0)telemetrySafeAdd(telemetryRuntime.pending.spent,'cr',-Number(cr));if(Number(stl)>0)telemetrySafeAdd(row,'stl',stl);else if(Number(stl)<0)telemetrySafeAdd(telemetryRuntime.pending.spent,'stl',-Number(stl));if(Number(xp)>0)telemetrySafeAdd(row,'xp',xp);}
function telemetrySpend(currency,amount){const n=Math.max(0,Math.round(Number(amount)||0));if(!n)return;telemetrySafeAdd(telemetryRuntime.pending.spent,currency==='uridium'?'stl':'cr',n);}
function telemetryLevelReached(level){const lv=Math.max(1,Math.floor(Number(level)||1));telemetryCounter('level_ups',1);if(!telemetryRuntime.pending.level_events.some(x=>Number(x.level)===lv))telemetryRuntime.pending.level_events.push({level:lv});flushTelemetry(true).catch(()=>{});}
function telemetryMarkTitle(){if(!authenticated||!progress)return;telemetryRuntime.lastFlushAt=0;}
function telemetryStartSession(){telemetryRuntime.pending=freshTelemetryPending();telemetryRuntime.pending.counters.sessions=1;telemetryRuntime.activeRemainder=0;telemetryRuntime.lastFlushAt=Date.now();telemetryRuntime.sessionOpen=true;if(Number(progress?.profile?.level||0)===1)telemetryRuntime.pending.level_events.push({level:1});}
function telemetryHasPayload(p){if(!p)return false;if((p.level_events||[]).length)return true;if(Object.values(p.counters||{}).some(Number))return true;if(Object.values(p.spent||{}).some(Number))return true;return Object.values(p.sources||{}).some(r=>Object.values(r||{}).some(Number));}
function mergeTelemetryPending(dst,src){for(const [k,v] of Object.entries(src.counters||{}))telemetrySafeAdd(dst.counters,k,v);for(const [k,v] of Object.entries(src.spent||{}))telemetrySafeAdd(dst.spent,k,v);for(const key of TELEMETRY_SOURCE_KEYS)for(const [k,v] of Object.entries(src.sources?.[key]||{}))telemetrySafeAdd(dst.sources[key],k,v);for(const ev of src.level_events||[])if(!dst.level_events.some(x=>Number(x.level)===Number(ev.level)))dst.level_events.push(ev);}
async function flushTelemetry(force=false){if(!authenticated||!progress||telemetryRuntime.flushing)return null;if(!force&&Date.now()-telemetryRuntime.lastFlushAt<45000)return null;const snapshot=telemetryRuntime.pending;if(!telemetryHasPayload(snapshot)&&!force)return null;telemetryRuntime.pending=freshTelemetryPending();telemetryRuntime.lastFlushAt=Date.now();telemetryRuntime.flushing=true;const batch={batch_id:(crypto?.randomUUID?.()||`t_${Date.now()}_${Math.random().toString(16).slice(2)}`),counters:snapshot.counters,spent:snapshot.spent,sources:snapshot.sources,level_events:snapshot.level_events,snapshot:{level:Number(progress.profile.level)||1,credits:Number(progress.profile.credits)||0,stl:Number(progress.profile.uridium)||0,xp:Number(progress.profile.xp)||0,title:activePilotTitle().label}};try{return await pushTelemetryBatch(batch);}catch(e){mergeTelemetryPending(telemetryRuntime.pending,snapshot);console.warn('telemetry',e);return null;}finally{telemetryRuntime.flushing=false;}}
function telemetryTick(dt){if(!authenticated||!progress||!telemetryRuntime.sessionOpen)return;if(document.visibilityState==='visible'){telemetryRuntime.activeRemainder+=Math.max(0,Math.min(.25,Number(dt)||0));if(telemetryRuntime.activeRemainder>=1){const sec=Math.floor(telemetryRuntime.activeRemainder);telemetryRuntime.activeRemainder-=sec;telemetryCounter('play_seconds',sec);}}if(Date.now()-telemetryRuntime.lastFlushAt>=45000)flushTelemetry(false).catch(()=>{});}
function telemetryTrackEconomyTransition(action,before,after,info={}){if(!before||!after)return;const dCr=Math.round((Number(after.credits)||0)-(Number(before.credits)||0)),dStl=Math.round((Number(after.uridium)||0)-(Number(before.uridium)||0));if(action==='sell_cargo')telemetryEconomy('resource',{cr:Math.max(0,dCr),stl:Math.max(0,dStl)});else if(dCr>0||dStl>0)telemetryEconomy('other',{cr:Math.max(0,dCr),stl:Math.max(0,dStl)});if(dCr<0)telemetrySpend('credits',-dCr);if(dStl<0)telemetrySpend('uridium',-dStl);}
function queueEconomy(fn){const run=economyRuntime.queue.then(fn,fn);economyRuntime.queue=run.catch(()=>{});return run;}
async function waitCloudIdle(maxMs=1800){const start=Date.now();while(cloudBusy&&Date.now()-start<maxMs)await new Promise(r=>setTimeout(r,35));}
async function syncBeforeEconomy(){await waitCloudIdle();if(cloudDirty)await flushCloudSave(false);await waitCloudIdle();}
function installEconomyState(state){if(!state||typeof state!=='object')throw new Error('Servidor não retornou o estado econômico atualizado.');installServerStatePreservingPosition(state);cloudDirty=false;try{localStorage.setItem(saveKey(),JSON.stringify(progress));}catch{}computeStats(true);buildAmmoButtons();refreshPetViews();renderShop();renderCargo();renderGalaxyGate();refreshPilotViews();updateUI();}
async function runEconomyAction(action,payload={},options={}){
  const {applyState=true,flush=true}=options;
  return queueEconomy(async()=>{if(flush)await syncBeforeEconomy();const before=progress?{credits:Number(progress.profile?.credits)||0,uridium:Number(progress.profile?.uridium)||0}:null;const result=await economyActionOnline(action,payload);if(applyState&&result?.state){installEconomyState(result.state);telemetryTrackEconomyTransition(action,before,progress?.profile,result?.info||{});}return result;});
}
async function runAutoBuy(catalogKey,label){
  const key=String(catalogKey||'');if(!key||economyRuntime.autoPending.has(key))return false;economyRuntime.autoPending.add(key);
  try{
    const result=await runEconomyAction('auto_buy',{catalog_key:key},{applyState:false,flush:true}),info=result?.info||{};
    if(info.kind==='ammo'&&info.id){progress.ammo[info.id]=(Number(progress.ammo[info.id])||0)+Math.max(1,Number(info.qty)||1);}
    else if(info.kind==='rocket'&&info.id){progress.rockets[info.id]=(Number(progress.rockets[info.id])||0)+Math.max(1,Number(info.qty)||1);}
    const cur=info.currency==='uridium'?'uridium':'credits',spent=Math.max(0,Number(info.price)||0);progress.profile[cur]=Math.max(0,(Number(progress.profile[cur])||0)-spent);telemetrySpend(cur,spent);cloudDirty=true;saveGame();refreshAmmoCounters();renderShop();updateUI();showToast(`AUTO BUY • ${label}`,'shop');return true;
  }catch(e){console.warn('auto buy server',e);return false;}finally{economyRuntime.autoPending.delete(key);}
}

// ===================== V10 PILOT BIO =====================
const PILOT_POINT_MAX=50;
let LOG_DISK_URI_PRICE=300;
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
const PILOT_UI_PREFS_KEY='stellar_pilot_ui_v1767';
let pilotUiPrefs={collapsed:{defense:false,utility:false,offense:false}};
function loadPilotUiPrefs(){try{const raw=JSON.parse(localStorage.getItem(PILOT_UI_PREFS_KEY)||'{}');pilotUiPrefs={collapsed:{defense:!!raw?.collapsed?.defense,utility:!!raw?.collapsed?.utility,offense:!!raw?.collapsed?.offense}};}catch{pilotUiPrefs={collapsed:{defense:false,utility:false,offense:false}};}return pilotUiPrefs;}
function savePilotUiPrefs(){try{localStorage.setItem(PILOT_UI_PREFS_KEY,JSON.stringify(pilotUiPrefs));}catch{}}
function pilotRequiredLevelForPrerequisite(requiredSkill){if(!requiredSkill)return 0;return requiredSkill.max===5?3:requiredSkill.max;}
function pilotRequirementInfo(skill){if(!skill?.requires)return null;const required=PILOT_SKILLS[skill.requires],need=pilotRequiredLevelForPrerequisite(required),current=pilotSkillLevel(skill.requires);return {skill:required,need,current,met:current>=need};}
function pilotRequirementMet(skill){const req=pilotRequirementInfo(skill);return !req||req.met;}
function togglePilotBranch(branch){loadPilotUiPrefs();pilotUiPrefs.collapsed[branch]=!pilotUiPrefs.collapsed[branch];savePilotUiPrefs();refreshPilotViews();}
function pilotRareChanceBonus(){return pilotCombined('luck1','luck2')/100;}function pilotLootBonus(){return pilotCombined('tractor1','tractor2')/100;}function pilotEvasion(){return Math.min(.35,pilotCombined('evasive1','evasive2')/100);}function pilotBattleLaserBonus(){return pilotCombined('bounty1','bounty2')/100;}function pilotKamikazeDamageBonus(){return pilotCombined('detonation1','detonation2')/100;}function pilotKamikazeRadiusBonus(){return pilotSkillValue('explosives')/100;}



// ===================== V17.9.3 — CONQUISTAS =====================
const ACHIEVEMENT_DEFS=[
  {id:'first_blood',group:'COMBATE',label:'Primeiro Abate',desc:'Destrua seu primeiro NPC.',target:1,metric:()=>Number(progress?.profile?.aliensKilled||0),icon:'☠'},
  {id:'hunter_100',group:'COMBATE',label:'Caçador de Setor',desc:'Destrua 100 NPCs.',target:100,metric:()=>Number(progress?.profile?.aliensKilled||0),icon:'⌖'},
  {id:'hunter_1000',group:'COMBATE',label:'Extermínio Estelar',desc:'Destrua 1.000 NPCs.',target:1000,metric:()=>Number(progress?.profile?.aliensKilled||0),icon:'✹'},
  {id:'salvage_100',group:'COLETA',label:'Recuperador',desc:'Colete 100 boxes de carga.',target:100,metric:()=>Number(progress?.titles?.stats?.boxes||0),icon:'▣'},
  {id:'ore_5000',group:'COLETA',label:'Minerador Cósmico',desc:'Colete 5.000 unidades de recursos.',target:5000,metric:()=>Number(progress?.titles?.stats?.oreUnits||0),icon:'◆'},
  {id:'mission_10',group:'MISSÕES',label:'Contratado',desc:'Conclua 10 missões.',target:10,metric:()=>Number(progress?.titles?.stats?.missions||0),icon:'✓'},
  {id:'mission_50',group:'MISSÕES',label:'Operador de Elite',desc:'Conclua 50 missões.',target:50,metric:()=>Number(progress?.titles?.stats?.missions||0),icon:'★'},
  {id:'jump_25',group:'EXPLORAÇÃO',label:'Cartógrafo',desc:'Realize 25 saltos entre setores.',target:25,metric:()=>Number(progress?.titles?.stats?.mapJumps||0),icon:'◎'},
  {id:'gate_1',group:'PORTAIS',label:'Além do Horizonte',desc:'Conclua um Portal Astral.',target:1,metric:()=>Number(progress?.profile?.ggCompleted||0),icon:'◉'},
  {id:'level_10',group:'PROGRESSÃO',label:'Piloto Veterano',desc:'Alcance o nível 10.',target:10,metric:()=>Number(progress?.profile?.level||1),icon:'▲'},
  {id:'level_25',group:'PROGRESSÃO',label:'Comandante Estelar',desc:'Alcance o nível 25.',target:25,metric:()=>Number(progress?.profile?.level||1),icon:'✦'}
];
function freshAchievements(){return {unlocked:{},seen:{}};}
function normalizeAchievements(){if(!progress)return freshAchievements();progress.achievements ||= freshAchievements();progress.achievements.unlocked ||= {};progress.achievements.seen ||= {};return progress.achievements;}
function achievementProgress(def){const current=Math.max(0,Number(def.metric?.()||0));return {current,target:def.target,pct:Math.max(0,Math.min(100,current/Math.max(1,def.target)*100))};}
function achievementUnlocked(id){normalizeAchievements();return !!progress.achievements.unlocked[id];}
function syncAchievements(announce=true){if(!progress)return [];normalizeAchievements();const fresh=[];for(const def of ACHIEVEMENT_DEFS){const pg=achievementProgress(def);if(pg.current>=pg.target&&!progress.achievements.unlocked[def.id]){progress.achievements.unlocked[def.id]=Date.now();fresh.push(def);}}if(announce)for(const def of fresh){queueCelebration('mission','CONQUISTA DESBLOQUEADA',`${def.label} • identidade liberada`);pushActivity(`CONQUISTA • ${def.label}`,'reward');}return fresh;}
function achievementUnlockedCount(){syncAchievements(false);return ACHIEVEMENT_DEFS.filter(x=>achievementUnlocked(x.id)).length;}
function buildAchievementsPanel(){syncAchievements(false);const section=document.createElement('section');section.className='pilot-achievement-profile';const count=achievementUnlockedCount();section.innerHTML=`<div class="pilot-achievement-head"><div><div class="eyebrow">CONQUISTAS</div><h3>REGISTRO DO PILOTO</h3><small>${count}/${ACHIEVEMENT_DEFS.length} conquistas concluídas • foco em identidade, não inflação.</small></div><span>${Math.round(count/ACHIEVEMENT_DEFS.length*100)}%</span></div>`;const grid=document.createElement('div');grid.className='pilot-achievement-grid';for(const def of ACHIEVEMENT_DEFS){const pg=achievementProgress(def),open=achievementUnlocked(def.id),card=document.createElement('article');card.className=`pilot-achievement-card${open?' unlocked':''}`;card.innerHTML=`<div class="pilot-achievement-icon">${def.icon}</div><div class="pilot-achievement-main"><span>${escHtml(def.group)}</span><b>${escHtml(def.label)}</b><p>${escHtml(def.desc)}</p><div class="pilot-achievement-track"><i style="width:${pg.pct}%"></i></div><small>${fmt(Math.min(pg.current,pg.target))} / ${fmt(pg.target)}</small></div><em>${open?'✓':'○'}</em>`;grid.appendChild(card);}section.appendChild(grid);return section;}

// ===================== V17.9.3 PILOT TITLES =====================
const PILOT_TITLES=[
  {id:'pioneer',group:'PROGRESSÃO',label:'Pioneiro Estelar',desc:'Título inicial de todo piloto.',target:1,metric:()=>1,format:(n)=>`${fmt(n)}/1`,req:'Disponível desde o início.'},
  {id:'cadet',group:'PROGRESSÃO',label:'Cadete Estelar',desc:'Primeiros sistemas dominados.',target:5,metric:()=>Number(progress?.profile?.level||1),format:(n)=>`Nível ${fmt(n)}/5`,req:'Alcance o nível 5.'},
  {id:'veteran',group:'PROGRESSÃO',label:'Veterano do Vazio',desc:'Experiência comprovada em setores avançados.',target:15,metric:()=>Number(progress?.profile?.level||1),format:(n)=>`Nível ${fmt(n)}/15`,req:'Alcance o nível 15.'},
  {id:'ace',group:'PROGRESSÃO',label:'Ás Estelar',desc:'Piloto de progressão avançada.',target:25,metric:()=>Number(progress?.profile?.level||1),format:(n)=>`Nível ${fmt(n)}/25`,req:'Alcance o nível 25.'},
  {id:'hunter',group:'COMBATE',label:'Caçador de Aliens',desc:'Especialista em combate contra NPCs.',target:100,metric:()=>Number(progress?.profile?.aliensKilled||0),format:(n)=>`${fmt(n)}/100 NPCs`,req:'Destrua 100 NPCs.'},
  {id:'exterminator',group:'COMBATE',label:'Exterminador Estelar',desc:'Marca de uma campanha de caça prolongada.',target:1000,metric:()=>Number(progress?.profile?.aliensKilled||0),format:(n)=>`${fmt(n)}/1.000 NPCs`,req:'Destrua 1.000 NPCs.'},
  {id:'prospector',group:'EXPLORAÇÃO',label:'Prospector Cósmico',desc:'Dominou a coleta de recursos espaciais.',target:1000,metric:()=>Number(progress?.titles?.stats?.oreUnits||0),format:(n)=>`${fmt(n)}/1.000 recursos`,req:'Colete 1.000 unidades de recursos.'},
  {id:'contractor',group:'MISSÕES',label:'Agente de Missões',desc:'Cumpriu contratos de várias categorias.',target:25,metric:()=>Number(progress?.titles?.stats?.missions||0),format:(n)=>`${fmt(n)}/25 missões`,req:'Conclua 25 missões.'},
  {id:'navigator',group:'EXPLORAÇÃO',label:'Navegador Quântico',desc:'Acumulou experiência viajando entre setores.',target:50,metric:()=>Number(progress?.titles?.stats?.mapJumps||0),format:(n)=>`${fmt(n)}/50 saltos`,req:'Realize 50 saltos de mapa.'},
  {id:'gatebreaker',group:'PORTAIS',label:'Rompe-Portais',desc:'Concluiu seu primeiro Portal Astral.',target:1,metric:()=>Number(progress?.profile?.ggCompleted||0),format:(n)=>`${fmt(n)}/1 Portal`,req:'Conclua 1 Portal Astral.'},
  {id:'gatemaster',group:'PORTAIS',label:'Mestre dos Portais',desc:'Especialista em ciclos de Portal Astral.',target:10,metric:()=>Number(progress?.profile?.ggCompleted||0),format:(n)=>`${fmt(n)}/10 Portais`,req:'Conclua 10 Portais Astrais.'},
  {id:'initiated',group:'JORNADA',label:'Iniciado Estelar',desc:'Concluiu o treinamento inicial do Stellar Legacy.',target:1,metric:()=>progress?.journey?.completed?1:0,format:(n)=>n?'Jornada concluída':'Jornada em andamento',req:'Conclua a Jornada do Piloto.'},
  {id:'salvager',group:'CONQUISTA',label:'Recuperador Estelar',desc:'Identidade concedida a pilotos especializados em carga.',target:1,metric:()=>achievementUnlocked('salvage_100')?1:0,format:(n)=>n?'Conquista concluída':'0/1',req:'Conquista: Recuperador.'},
  {id:'cartographer',group:'CONQUISTA',label:'Cartógrafo do Vazio',desc:'Reconhecido por explorar rotas entre setores.',target:1,metric:()=>achievementUnlocked('jump_25')?1:0,format:(n)=>n?'Conquista concluída':'0/1',req:'Conquista: Cartógrafo.'},
  {id:'operator',group:'CONQUISTA',label:'Operador de Elite',desc:'Título de quem domina contratos e objetivos.',target:1,metric:()=>achievementUnlocked('mission_50')?1:0,format:(n)=>n?'Conquista concluída':'0/1',req:'Conquista: Operador de Elite.'},
  {id:'commander',group:'CONQUISTA',label:'Comandante Estelar',desc:'Marca de progressão avançada.',target:1,metric:()=>achievementUnlocked('level_25')?1:0,format:(n)=>n?'Conquista concluída':'0/1',req:'Conquista: Comandante Estelar.'},
  {id:'admin',group:'ESPECIAL',label:'Administrador',desc:'Título reservado à administração do universo.',target:1,metric:()=>isAdminPilot()?1:0,format:(n)=>n?'Autorizado':'Restrito',req:'Título administrativo.'}
];
function freshPilotTitles(){return {selected:'pioneer',stats:{missions:0,oreUnits:0,boxes:0,deaths:0,mapJumps:0}};}
function normalizePilotTitles(){if(!progress)return freshPilotTitles();progress.titles ||= freshPilotTitles();progress.titles.stats ||= {};for(const k of ['missions','oreUnits','boxes','deaths','mapJumps'])progress.titles.stats[k]=Math.max(0,Math.floor(Number(progress.titles.stats[k])||0));if(!PILOT_TITLES.some(x=>x.id===progress.titles.selected))progress.titles.selected='pioneer';if(!pilotTitleUnlocked(progress.titles.selected))progress.titles.selected='pioneer';return progress.titles;}
function pilotTitleDef(id){return PILOT_TITLES.find(x=>x.id===id)||PILOT_TITLES[0];}
function pilotTitleProgress(idOrDef){const def=typeof idOrDef==='string'?pilotTitleDef(idOrDef):idOrDef;let current=0;try{current=Math.max(0,Number(def?.metric?.())||0);}catch{}const target=Math.max(1,Number(def?.target)||1);return {current,target,pct:Math.max(0,Math.min(100,current/target*100)),text:def?.format?def.format(Math.min(current,target)): `${fmt(Math.min(current,target))}/${fmt(target)}`};}
function pilotTitleUnlocked(idOrDef){const def=typeof idOrDef==='string'?pilotTitleDef(idOrDef):idOrDef;return pilotTitleProgress(def).current>=pilotTitleProgress(def).target;}
function activePilotTitle(){normalizePilotTitles();const def=pilotTitleDef(progress?.titles?.selected||'pioneer');return pilotTitleUnlocked(def)?def:PILOT_TITLES[0];}
function titleStatAdd(key,amount=1){if(!progress)return;normalizePilotTitles();progress.titles.stats[key]=Math.max(0,(Number(progress.titles.stats[key])||0)+Math.max(0,Number(amount)||0));syncAchievements(true);}
function selectPilotTitle(id){normalizePilotTitles();const def=pilotTitleDef(id);if(!pilotTitleUnlocked(def)){showToast(`Título bloqueado • ${def.req}`);return;}progress.titles.selected=def.id;saveGame();syncSharedUniversePlayer(true);syncOnlineWorld();telemetryMarkTitle();renderHangar();showToast(`Título equipado: ${def.label}`,'system');}

// ===================== REAL-PLAYER ONLINE AUCTION =====================
function freshAuctionState(){return {hourKey:null,lots:{},history:[],onlineReady:false,legacyEscrowMigrated:false,marketVersion:3};}
function auctionHourKey(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}-${String(d.getHours()).padStart(2,'0')}`;}
function auctionSecondsLeft(){const d=new Date(),next=new Date(d);next.setMinutes(60,0,0);return Math.max(0,Math.ceil((next-d)/1000));}
function auctionSeed(str){let h=2166136261>>>0;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function auctionRand(seed){let x=seed>>>0;return()=>{x=(Math.imul(1664525,x)+1013904223)>>>0;return x/4294967296;};}
function eliteAuctionCatalog(){
  const out=[];
  Object.values(SHIPS).filter(x=>x.currency==='uridium'&&!x.eventOnly&&x.shopAvailable!==false&&x.auctionEligible!==false&&!progress?.ownedShips?.includes(x.id)).forEach(x=>out.push({ref:`ship:${x.id}`,kind:'ship',id:x.id,name:x.name,uri:x.price,qty:1,unique:true}));
  Object.values(ITEMS).filter(x=>x.currency==='uridium'&&!x.eventOnly&&x.shopAvailable!==false&&x.auctionEligible!==false&&!(x.type==='extra'&&progress&&ownsExtraItem(x.id))&&!(x.type==='drone'&&(progress?.drones?.length||0)>=8)).forEach(x=>out.push({ref:`item:${x.id}`,kind:'item',id:x.id,name:x.name,uri:x.price,qty:1,unique:x.type==='extra'||x.type==='drone'}));
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
const PET_MAX_LEVEL=20;
const PET_LEVEL_TABLE={
  1:{xp:0,laser:2,shield:3,gear:2,protocol:3,bonus:'ESCUDO +2%',shieldBonus:2},
  2:{xp:64000,laser:2,shield:4,gear:2,protocol:4,bonus:'DANO +2%',damageBonus:2},
  3:{xp:216000,laser:3,shield:5,gear:3,protocol:5,bonus:'ESCUDO +4%',shieldBonus:4},
  4:{xp:512000,laser:3,shield:6,gear:3,protocol:6,bonus:'EQUIPAMENTO N2',tier:2},
  5:{xp:1000000,laser:4,shield:7,gear:4,protocol:7,bonus:'DANO +4%',damageBonus:4},
  6:{xp:1728000,laser:4,shield:8,gear:4,protocol:8,bonus:'ESCUDO +6%',shieldBonus:6},
  7:{xp:2744000,laser:5,shield:9,gear:5,protocol:9,bonus:'DANO +6%',damageBonus:6},
  8:{xp:4096000,laser:5,shield:10,gear:5,protocol:10,bonus:'EQUIPAMENTO N3',tier:3},
  9:{xp:5832000,laser:6,shield:11,gear:6,protocol:11,bonus:'ESCUDO +8%',shieldBonus:8},
  10:{xp:8000000,laser:6,shield:12,gear:6,protocol:12,bonus:'DANO +8%',damageBonus:8},
  11:{xp:10648000,laser:7,shield:13,gear:6,protocol:12,bonus:'ESCUDO +10%',shieldBonus:10},
  12:{xp:13824000,laser:7,shield:14,gear:6,protocol:12,bonus:'DANO +10%',damageBonus:10},
  13:{xp:17576000,laser:8,shield:15,gear:6,protocol:12,bonus:'ESCUDO +12%',shieldBonus:12},
  14:{xp:21952000,laser:9,shield:16,gear:6,protocol:12,bonus:'DANO +12%',damageBonus:12},
  15:{xp:27000000,laser:10,shield:17,gear:6,protocol:12,bonus:'ESCUDO +14%',shieldBonus:14},
  16:{xp:39000000,laser:10,shield:18,gear:6,protocol:12,bonus:'DANO +14%',damageBonus:14},
  17:{xp:50000000,laser:11,shield:19,gear:6,protocol:12,bonus:'ESCUDO +16%',shieldBonus:16},
  18:{xp:70000000,laser:11,shield:20,gear:6,protocol:12,bonus:'DANO +16%',damageBonus:16},
  19:{xp:100000000,laser:12,shield:21,gear:6,protocol:12,bonus:'ESCUDO +18%',shieldBonus:18},
  20:{xp:150000000,laser:12,shield:22,gear:6,protocol:12,bonus:'EQUIPAMENTO N4',tier:4},
};
let PET_BASE_PRICE=1500000;
function legacyLevelXpThresholdV1767(level){
  if(level<=1)return 0;
  return Math.round(10000*Math.pow(2,level-2));
}
function levelXpThreshold(level){
  if(level<=1)return 0;
  const n=Math.max(1,level-1);
  return Math.round(15000*Math.pow(n,2.3)*Math.pow(1.20,Math.max(0,level-2)));
}
function migratePlayerXpCurveV1770(){
  if(!progress?.profile||progress.profile.xpModelV1770)return;
  let level=Math.max(1,Math.min(PLAYER_MAX_LEVEL,Math.floor(Number(progress.profile.level)||1)));
  const xp=Math.max(0,Number(progress.profile.xp)||0);
  // Mantém exatamente o nível e aproximadamente o percentual de progresso do modelo anterior.
  if(level<PLAYER_MAX_LEVEL){
    const oldBase=legacyLevelXpThresholdV1767(level),oldNext=legacyLevelXpThresholdV1767(level+1);
    const ratio=Math.max(0,Math.min(.999999,(xp-oldBase)/Math.max(1,oldNext-oldBase)));
    const nextBase=levelXpThreshold(level),nextTarget=levelXpThreshold(level+1);
    progress.profile.xp=Math.round(nextBase+(nextTarget-nextBase)*ratio);
  }else progress.profile.xp=Math.max(levelXpThreshold(PLAYER_MAX_LEVEL),xp);
  progress.profile.xpModelV1770=true;
}

// ===================== V18.1.0 DATA DRIVEN CORE =====================
// O banco configura o motor; nunca executa HTML/JS arbitrário vindo do SQL.
const RUNTIME_CONFIG_CACHE_PREFIX='stellar_runtime_config_v1810';
const RUNTIME_MODULE_SELECTORS={
  pilot_menu:'[data-menu-group="pilot"]',hangar:'#hangarBtn',ship:'#shipMenuBtn',pilot_research:'#pilotBtn',pet:'#petBtn',
  missions_menu:'[data-menu-group="missions"]',missions:'#missionBtn',pass:'#passBtn',
  battle_menu:'[data-menu-group="battle"]',arena:'#arenaBtn',warfront:'#warfrontBtn',gates:'#gateBtn',events:'#galaxyEventBtn',battle_group:'#battleGroupBtn',
  clan:'#clanBtn',map:'#mapBtn',auction:'#auctionBtn',shops_menu:'[data-menu-group="shops"]',shop:'#shopBtn',premium:'#premiumBtn',admin:'#adminBtn',config:'#configBtn'
};
const RUNTIME_MODULE_FLAGS={missions_menu:'missions',missions:'missions',pass:'battle_pass',arena:'arena',warfront:'warfront',events:'live_events',battle_group:'battle_groups',clan:'clans',auction:'auction',premium:'premium_shop'};
const RUNTIME_FALLBACK_MODULES=[
  ['pilot_menu',null,'PILOTO',10,1,true,false,false],['hangar','pilot_menu','HANGAR',10,1,true,false,false],['ship','pilot_menu','NAVE',20,1,true,false,false],['pilot_research','pilot_menu','HABILIDADES',30,6,true,false,false],['pet','pilot_menu','AUX-9',40,1,true,false,false],
  ['missions_menu',null,'MISSÕES',20,5,true,true,false],['missions','missions_menu','MISSÕES',10,5,true,false,false],['pass','missions_menu','PASSE',20,5,true,false,false],
  ['battle_menu',null,'BATALHA',30,1,true,false,false],['arena','battle_menu','ARENA',10,1,true,false,false],['warfront','battle_menu','WARFRONT',20,15,true,false,false],['gates','battle_menu','PORTAIS',30,1,true,false,false],['events','battle_menu','EVENTOS',40,1,true,false,false],['battle_group','battle_menu','GRUPO',50,1,true,false,false],
  ['clan',null,'CLÃ',40,8,true,true,false],['map',null,'MAPA',50,1,true,false,false],['auction',null,'LEILÃO',60,1,true,false,false],
  ['shops_menu',null,'LOJAS',70,1,true,false,false],['shop','shops_menu','LOJA',10,1,true,false,false],['premium','shops_menu','LOJA PREMIUM',20,1,true,false,false],['admin',null,'ADM',80,1,true,false,true],['config',null,'CONF',90,1,true,false,false]
].map(([module_key,parent_key,label,sort_order,min_level,enabled,hide_until_level,admin_only])=>({module_key,parent_key,label,sort_order,min_level,enabled,hide_until_level,admin_only,config:{}}));
const RUNTIME_FALLBACK_FLAGS={missions:true,battle_pass:true,arena:true,warfront:true,battle_groups:true,clans:true,auction:true,premium_shop:true,crafting:true,economy_services:true,live_events:true};
const runtimeConfigRuntime={version:0,updatedAt:null,modules:new Map(RUNTIME_FALLBACK_MODULES.map(x=>[x.module_key,x])),flags:new Map(Object.entries(RUNTIME_FALLBACK_FLAGS).map(([flag_key,enabled])=>[flag_key,{flag_key,enabled,config:{}}])),lastFetchAt:0,source:'fallback'};
function runtimeConfigCacheKey(){return `${RUNTIME_CONFIG_CACHE_PREFIX}:${String(getUser()?.id||'guest')}`;}
function runtimeModule(key){return runtimeConfigRuntime.modules.get(String(key||''))||null;}
function runtimeFeatureEnabled(key,fallback=true){const row=runtimeConfigRuntime.flags.get(String(key||''));return row?row.enabled!==false:!!fallback;}
function runtimeModuleEnabled(key){const row=runtimeModule(key);if(!row||row.enabled===false)return false;const flag=RUNTIME_MODULE_FLAGS[key];return flag?runtimeFeatureEnabled(flag,true):true;}
function runtimeModuleMinLevel(key,fallback=1){const row=runtimeModule(key);return Math.max(1,Number(row?.min_level)||Number(fallback)||1);}
function runtimeModuleUnlocked(key){return (Number(progress?.profile?.level)||1)>=runtimeModuleMinLevel(key,1);}
function runtimeSetButtonLabel(btn,label){if(!btn||!label)return;const node=[...btn.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&String(n.textContent||'').trim());if(node)node.textContent=`${label} `;else btn.insertBefore(document.createTextNode(`${label} `),btn.firstChild);}
function runtimeModuleElement(key){const sel=RUNTIME_MODULE_SELECTORS[key];return sel?document.querySelector(sel):null;}
function applyRuntimeMenuConfig(){
  const level=Math.max(1,Number(progress?.profile?.level)||1);
  // V18.1.4: NUNCA reanexa os nós da topbar. A ordem vem do SQL, mas é aplicada
  // somente via CSS order. Assim os elementos originais e seus listeners permanecem intactos.
  for(const [key,selector] of Object.entries(RUNTIME_MODULE_SELECTORS)){
    const row=runtimeModule(key),el=document.querySelector(selector);if(!el)continue;
    el.dataset.runtimeModule=key;
    el.style.order=String(Number(row?.sort_order)||100);
    const enabled=runtimeModuleEnabled(key),unlocked=level>=runtimeModuleMinLevel(key,1),hidden=!enabled||(row?.admin_only&&!runtimeConfigRuntime.isAdmin)||(!unlocked&&row?.hide_until_level===true);
    el.classList.toggle('runtime-module-hidden',hidden);
    el.classList.toggle('runtime-module-locked',!hidden&&!unlocked);
    el.setAttribute('aria-disabled',String(!enabled||!unlocked));
    const target=el.matches('.menu-group')?el.querySelector(':scope > .menu-group-toggle'):el;
    runtimeSetButtonLabel(target,row?.label||RUNTIME_FALLBACK_MODULES.find(x=>x.module_key===key)?.label||key.toUpperCase());
    if(target&&!hidden&&!unlocked)target.title=`Libera no nível ${runtimeModuleMinLevel(key,1)}`;
    else if(target&&target.title?.startsWith('Libera no nível'))target.title='';
  }
}
function normalizeRuntimeConfig(raw,source='online'){
  if(!raw||typeof raw!=='object')return false;
  const modules=Array.isArray(raw.modules)?raw.modules.filter(x=>x&&RUNTIME_MODULE_SELECTORS[x.module_key]):[];
  const flags=Array.isArray(raw.flags)?raw.flags.filter(x=>x?.flag_key):[];
  if(!modules.length)return false;
  runtimeConfigRuntime.version=Math.max(0,Number(raw.version)||0);runtimeConfigRuntime.updatedAt=raw.updated_at||null;runtimeConfigRuntime.isAdmin=!!raw.is_admin;
  runtimeConfigRuntime.modules=new Map(modules.map(x=>[String(x.module_key),{...x,module_key:String(x.module_key),sort_order:Number(x.sort_order)||100,min_level:Math.max(1,Number(x.min_level)||1),enabled:x.enabled!==false,hide_until_level:!!x.hide_until_level,admin_only:!!x.admin_only}]));
  for(const fallback of RUNTIME_FALLBACK_MODULES)if(!runtimeConfigRuntime.modules.has(fallback.module_key))runtimeConfigRuntime.modules.set(fallback.module_key,fallback);
  runtimeConfigRuntime.flags=new Map(flags.map(x=>[String(x.flag_key),{...x,enabled:x.enabled!==false}]));
  for(const [flag_key,enabled] of Object.entries(RUNTIME_FALLBACK_FLAGS))if(!runtimeConfigRuntime.flags.has(flag_key))runtimeConfigRuntime.flags.set(flag_key,{flag_key,enabled,config:{}});
  runtimeConfigRuntime.source=source;applyRuntimeMenuConfig();return true;
}
function loadRuntimeConfigCache(){try{const raw=JSON.parse(localStorage.getItem(runtimeConfigCacheKey())||'null');if(raw&&normalizeRuntimeConfig(raw,'cache'))return true;}catch{}return false;}
function saveRuntimeConfigCache(raw){try{localStorage.setItem(runtimeConfigCacheKey(),JSON.stringify(raw));}catch{}}
async function refreshRuntimeConfig(force=false){
  if(!authenticated||!getUser()?.id)return null;
  const now=Date.now();if(!force&&now-runtimeConfigRuntime.lastFetchAt<30000)return null;runtimeConfigRuntime.lastFetchAt=now;
  try{const raw=await loadRuntimeConfigOnline();if(!raw)return null;const changed=Number(raw.version)!==Number(runtimeConfigRuntime.version)||runtimeConfigRuntime.source!=='online';if(changed){normalizeRuntimeConfig(raw,'online');saveRuntimeConfigCache(raw);console.info(`[runtime-config] v${runtimeConfigRuntime.version} aplicado`);}return raw;}catch(err){console.warn('[runtime-config] usando cache/fallback',err);if(runtimeConfigRuntime.source==='fallback')loadRuntimeConfigCache();applyRuntimeMenuConfig();return null;}
}
function runtimeGuardMessage(key){const row=runtimeModule(key);if(!runtimeModuleEnabled(key))return `${row?.label||'Recurso'} está temporariamente desativado.`;const req=runtimeModuleMinLevel(key,1);if(!runtimeModuleUnlocked(key))return `${row?.label||'Recurso'} libera no nível ${req}.`;return '';}

// V18.1.4: a configuração da topbar chega por um snapshot temporário criado pelo Render.
// Os handlers originais continuam sendo a única rota de clique. Este guard só bloqueia
// módulos desativados/bloqueados; para módulos normais ele NÃO intercepta o evento.
function installRuntimeMenuGuard(){
  const nav=document.querySelector('#topbar .command-actions');
  if(!nav||nav.dataset.runtimeGuard==='1')return;
  nav.dataset.runtimeGuard='1';
  nav.addEventListener('click',e=>{
    const el=e.target.closest('[data-runtime-module]');
    if(!el||!nav.contains(el))return;
    const key=String(el.dataset.runtimeModule||'');
    if(!key)return;
    const msg=runtimeGuardMessage(key);
    if(!msg)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    showToast(msg);
  },true);
}
installRuntimeMenuGuard();
setInterval(()=>{if(authenticated)refreshRuntimeConfig(false);},45000);

// ===================== V18.1.1 NPC + RECOMPENSAS DATA DRIVEN =====================
const NPC_RUNTIME_CACHE_PREFIX='stellar_npc_runtime_v1811';
const NPC_FALLBACK_SNAPSHOT=Object.fromEntries(Object.entries(NPC_TYPES).map(([key,row])=>[key,{...row,resources:{...(row.resources||{})}}]));
const npcRuntimeConfig={version:0,updatedAt:null,lastFetchAt:0,source:'fallback'};
function npcRuntimeCacheKey(){return `${NPC_RUNTIME_CACHE_PREFIX}:${String(getUser()?.id||'guest')}`;}
function normalizeNpcRuntimeConfig(raw,source='online'){
  if(!raw||typeof raw!=='object'||!Array.isArray(raw.npcs)||!raw.npcs.length)return false;
  for(const row of raw.npcs){
    const key=String(row?.npc_key||'').trim();if(!key)continue;
    const fallback=NPC_FALLBACK_SNAPSHOT[key]||{};
    NPC_TYPES[key]={...fallback,...NPC_TYPES[key],name:String(row.name||fallback.name||key),hp:Math.max(1,Number(row.hp)||1),shield:Math.max(0,Number(row.shield)||0),credits:Math.max(0,Number(row.credits)||0),uridium:Math.max(0,Number(row.stl)||0),xp:Math.max(0,Number(row.xp)||0),speed:Math.max(1,Number(row.speed)||1),damage:Math.max(0,Number(row.damage)||0),color:String(row.color||fallback.color||'#ff755d'),size:Math.max(4,Number(row.size)||18),resources:row.resources&&typeof row.resources==='object'?{...row.resources}:{...(fallback.resources||{})},respawnMinMs:Math.max(1000,Number(row.respawn_min_ms)||6000),respawnMaxMs:Math.max(1000,Number(row.respawn_max_ms)||13000),enabled:row.enabled!==false};
  }
  npcRuntimeConfig.version=Math.max(0,Number(raw.version)||0);npcRuntimeConfig.updatedAt=raw.updated_at||null;npcRuntimeConfig.source=source;return true;
}
function loadNpcRuntimeConfigCache(){try{const raw=JSON.parse(localStorage.getItem(npcRuntimeCacheKey())||'null');return !!(raw&&normalizeNpcRuntimeConfig(raw,'cache'));}catch{return false;}}
function saveNpcRuntimeConfigCache(raw){try{localStorage.setItem(npcRuntimeCacheKey(),JSON.stringify(raw));}catch{}}
async function refreshNpcRuntimeConfig(force=false){
  if(!authenticated||!getUser()?.id)return null;const now=Date.now();if(!force&&now-npcRuntimeConfig.lastFetchAt<30000)return null;npcRuntimeConfig.lastFetchAt=now;
  try{const raw=await loadNpcRuntimeConfigOnline();if(!raw)return null;const changed=Number(raw.version)!==Number(npcRuntimeConfig.version)||npcRuntimeConfig.source!=='online';if(changed){normalizeNpcRuntimeConfig(raw,'online');saveNpcRuntimeConfigCache(raw);console.info(`[npc-config] v${npcRuntimeConfig.version} aplicado no cliente`);try{renderAll();}catch{}}return raw;}catch(err){console.warn('[npc-config] usando cache/fallback',err);if(npcRuntimeConfig.source==='fallback')loadNpcRuntimeConfigCache();return null;}
}
setInterval(()=>{if(authenticated)refreshNpcRuntimeConfig(false);},45000);

const PROGRESSION_UNLOCKS={missions:5,pilot:6,clan:8};
let MISSION_CATEGORY_LEVELS={daily:5,weekly:7,monthly:10,special:12};
function featureRequiredLevel(key){const map={missions:'missions',pilot:'pilot_research',clan:'clan'};const moduleKey=map[key];return moduleKey?runtimeModuleMinLevel(moduleKey,PROGRESSION_UNLOCKS[key]||1):Number(PROGRESSION_UNLOCKS[key]||1);}
function featureUnlocked(key){return (Number(progress?.profile?.level)||1)>=featureRequiredLevel(key);}
function showFeatureLock(key,label){const req=featureRequiredLevel(key);showToast(`${label} libera no nível ${req}`);}
function missionCategoryRequiredLevel(category){return Number(systemsMissionCategory(category)?.minLevel||MISSION_CATEGORY_LEVELS[category]||5);}
function missionCategoryUnlocked(category){return (Number(progress?.profile?.level)||1)>=missionCategoryRequiredLevel(category);}
function progressionUnlocksAtLevel(level){
  const out=[];
  if(level===3)out.push('MAPA X-2');
  if(level===5)out.push('MISSÕES DIÁRIAS');
  if(level===6)out.push('PERFIL DE PILOTO');
  if(level===7)out.push('MAPA X-3','MISSÕES SEMANAIS');
  if(level===8)out.push('CLÃ');
  if(level===10)out.push('MAPA X-4','MISSÕES MENSAIS');
  if(level===12)out.push('MISSÕES ESPECIAIS');
  if(level===15)out.push('BATTLE MAPS');
  return out;
}
function updateProgressionAccessLocks(){
  if(!progress)return;applyRuntimeMenuConfig();
  const lock=(el,key,label)=>{if(!el)return;const req=featureRequiredLevel(key),locked=!featureUnlocked(key);el.classList.toggle('level-locked',locked);el.setAttribute('aria-disabled',String(locked));el.title=locked?`${label} • libera no nível ${req}`:'';};
  lock(ui.missionBtn,'missions','Missões');lock(ui.pilotBtn,'pilot','Perfil de Piloto');lock(ui.clanBtn,'clan','Clã');
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
  guard: { id:'guard', name:'Modo Sentinela', cost:150000, currency:'uridium', description:'Combate: ataca apenas alvos inimigos.' },
  box: { id:'box', name:'Módulo Salvager', cost:100000, currency:'uridium', description:'Coleta: busca apenas caixas de saque.' },
  ore: { id:'ore', name:'Módulo Minerador', cost:80000, currency:'uridium', description:'Mineração: busca apenas minérios e pedras.' },
  repair: { id:'repair', name:'Módulo Reclaimer', cost:200000, currency:'uridium', description:'Suporte: repara apenas a nave quando necessário.' },
  kami: { id:'kami', name:'Nova Burst', cost:350000, currency:'uridium', description:'Ataque especial: investida explosiva de uso único.' },
};
function freshPet(){
  return {
    owned:false, level:1, xp:0, xpModelV175:true,
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
  support:{id:'support',name:'NANO RESTORE',icon:'✚',cooldown:38,duration:0,desc:'Repara 30% do HP e 22% do escudo instantaneamente.',heal_hp:.30,heal_shield:.22},
  tank:{id:'tank',name:'FORTRESS',icon:'⬢',cooldown:50,duration:9,desc:'Reduz em 48% o dano recebido por 9s.',incoming_mult:.52},
  control:{id:'control',name:'JAM PULSE',icon:'◉',cooldown:44,duration:6,desc:'Silencia NPCs próximos por 5s e acelera a nave por 6s.',speed_active:.24},
  singularity:{id:'singularity',name:'SINGULARITY',icon:'☢',cooldown:48,duration:7,desc:'Aplica 7 pulsos de dano contínuo no alvo.'},
  assault:{id:'assault',name:'OVERDRIVE',icon:'⚡',cooldown:42,duration:10,desc:'+35% dano e +20% velocidade por 10s.',damage_active:.35,speed_active:.20},
};
const abilityRuntime={activeId:null,activeUntil:0,dotTargetId:null,dotTicks:0,dotNextAt:0};
function normalizeCombatAbilities(){if(!progress)return;progress.combatAbilities ||= {shipReadyAt:0};progress.combatAbilities.shipReadyAt=Math.max(0,Number(progress.combatAbilities.shipReadyAt)||0);}
function designerShipAbilityDef(){const d=currentShipDesign(),a=d?.ability;if(!a?.id)return null;const cooldown=Math.max(8,Number(a.cooldown)||45),duration=Math.max(0,Number(a.duration)||0);return {...a,id:String(a.id),name:String(a.name||d.name||'HABILIDADE'),icon:String(a.icon||'✦'),cooldown,duration,desc:`${d.name} • ${designerBonusSummary(d)}`,designerId:d.design_id};}
function shipAbilityDef(){return designerShipAbilityDef()||SHIP_ABILITIES[abilityClassId()]||SHIP_ABILITIES.assault;}
function shipAbilityCooldownRemaining(){normalizeCombatAbilities();return Math.max(0,(progress.combatAbilities.shipReadyAt-Date.now())/1000);}
function shipAbilityActive(id=null){return abilityRuntime.activeUntil>Date.now()&&(!id||abilityRuntime.activeId===id);}
function shipAbilityDamageMultiplier(){const def=shipAbilityDef();if(shipAbilityActive(def.id)&&Number(def.damage_active)>0)return 1+Number(def.damage_active)*abilityPowerMultiplier();return 1;}
function shipAbilitySpeedMultiplier(){const def=shipAbilityDef();if(shipAbilityActive(def.id)&&Number(def.speed_active)>0)return 1+Number(def.speed_active)*abilityPowerMultiplier();return 1;}
function shipAbilityIncomingMultiplier(){const def=shipAbilityDef();if(shipAbilityActive(def.id)&&Number(def.incoming_mult)>0)return Math.max(.25,Number(def.incoming_mult)-(abilityMasteryLevel()-1)*.045);return 1;}
function triggerPetKamikaze(){
  if(!progress?.pet?.owned){showToast('Adquira o AUX-9 primeiro');return;}
  if(!progress.pet.gearsOwned?.kami){showToast('Compre o módulo Nova Burst no AUX-9');return;}
  if(petKamikazeCooldownRemaining()>0){showToast(`Nova Burst recarregando • ${petKamikazeCooldownRemaining().toFixed(1)}s`);return;}
  if(!state.target||state.target.hp<=0||state.target.isPlayer){const nearest=petNearestToPlayer(state.enemies.filter(e=>e.hp>0),petCombatSearchRange());if(nearest)state.target=nearest;}
  if(!state.target||state.target.hp<=0||state.target.isPlayer){showToast('Selecione um NPC para lançar o Nova Burst');return;}
  setPetGear('kami');triggerCombatFlash('red');setCombatAlert('NOVA BURST ARMADA','ability',1.8);
}
function useShipAbility(){
  if(!progress||progress.repairRequired||state.jumping)return;const def=shipAbilityDef(),remaining=shipAbilityCooldownRemaining();
  if(remaining>0){showToast(`${def.name} recarregando • ${remaining.toFixed(1)}s`);return;}
  const now=Date.now(),power=abilityPowerMultiplier();normalizeCombatAbilities();
  const healHp=Math.max(0,Number(def.heal_hp)||0),healShield=Math.max(0,Number(def.heal_shield)||0);
  if(healHp>0||healShield>0){
    const bh=player.hp,bs=player.shield;
    if(healHp>0)player.hp=Math.min(player.maxHp,player.hp+Math.round(player.maxHp*healHp*power));
    if(healShield>0)player.shield=Math.min(player.maxShield,player.shield+Math.round(player.maxShield*healShield*power));
    const dh=Math.max(0,player.hp-bh),ds=Math.max(0,player.shield-bs);spawnParticle(player.x,player.y-34,`${dh?`+${fmt(dh)} HP`:''}${dh&&ds?' • ':''}${ds?`+${fmt(ds)} ESC`:''}`,'#74ffc2');spawnImpactFx(player.x,player.y,'#74ffc2',82,'shield');
  }else if(def.id==='control'){
    const victims=state.enemies.filter(e=>e.hp>0&&Math.hypot(e.x-player.x,e.y-player.y)<=520);for(const e of victims)e.jammedUntil=nowSec()+5+(abilityMasteryLevel()-1)*.75;abilityRuntime.activeId=def.id;abilityRuntime.activeUntil=now+def.duration*1000;spawnParticle(player.x,player.y-42,`JAM • ${victims.length} ALVOS`,'#7eeeff');spawnImpactFx(player.x,player.y,'#7eeeff',110,'shield');
  }else if(def.id==='singularity'){
    if(!state.target||state.target.hp<=0||state.target.isPlayer){showToast('Selecione um NPC para usar Singularity');return;}abilityRuntime.dotTargetId=state.target.id;abilityRuntime.dotTicks=7;abilityRuntime.dotNextAt=nowSec();abilityRuntime.activeId=def.id;abilityRuntime.activeUntil=now+def.duration*1000;spawnParticle(state.target.x,state.target.y-state.target.size,'SINGULARITY','#ff5f9e');
  }else{
    abilityRuntime.activeId=def.id;abilityRuntime.activeUntil=now+Math.max(.2,def.duration)*1000;const design=currentShipDesign(),fx=design?.visual?.glow||(def.id==='tank'?'#ffe777':'#72dcff');spawnParticle(player.x,player.y-40,def.name,fx);spawnImpactFx(player.x,player.y,fx,112,'shield');
  }
  playSfx('ability');triggerCombatFlash(def.id==='tank'?'gold':def.id==='singularity'?'red':'cyan');setCombatAlert(`${def.name} ATIVADA`,'ability',1.8);progress.combatAbilities.shipReadyAt=now+abilityEffectiveCooldown(def)*1000;saveGame();syncSharedUniversePlayer(true);showToast(`${def.name} ATIVADA!`,'reward');
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

// ===================== V18.1.4 MAPAS + PORTAIS + RECURSOS DATA DRIVEN =====================
const WORLD_RUNTIME_CACHE_KEY='stellar_world_runtime_v1814';
const WORLD_FALLBACK_MAPS=Object.fromEntries(Object.entries(MAPS).map(([key,row])=>[key,JSON.parse(JSON.stringify(row))]));
const WORLD_FALLBACK_RESOURCES=Object.fromEntries(Object.entries(RESOURCES).map(([key,row])=>[key,{...row}]));
const WORLD_FALLBACK_GRAPH_NODES=MAP_GRAPH_NODES.map(x=>({...x}));
const WORLD_FALLBACK_GRAPH_LINKS=MAP_GRAPH_LINKS.map(x=>[...x]);
const worldRuntimeConfig={version:0,updatedAt:null,lastFetchAt:0,source:'fallback',sectorDestinations:new Map(),sectorInfo:new Map()};
function normalizeWorldRuntimeConfig(raw,source='online'){
  if(!raw||typeof raw!=='object'||!Array.isArray(raw.maps)||!raw.maps.length||!Array.isArray(raw.sectors)||!raw.sectors.length)return false;
  for(const row of raw.resources||[]){const key=String(row?.resource_key||'').trim();if(!key)continue;const fallback=WORLD_FALLBACK_RESOURCES[key]||{};RESOURCES[key]={...fallback,...RESOURCES[key],id:key,name:String(row.name||fallback.name||key),color:String(row.color||fallback.color||'#ffffff'),sell:Math.max(0,Number(row.sell_price)||0),enabled:row.enabled!==false};}
  for(const row of raw.maps){const key=String(row?.map_id||'').trim();if(!key)continue;const fallback=WORLD_FALLBACK_MAPS[key]||{};MAPS[key]={...fallback,...MAPS[key],id:key,label:row.label??fallback.label,tier:Number(row.tier)||fallback.tier||1,name:String(row.name||fallback.name||key),risk:String(row.risk||fallback.risk||'Normal'),world:{w:Math.max(1000,Number(row.world_w)||fallback.world?.w||6000),h:Math.max(1000,Number(row.world_h)||fallback.world?.h||4500)},enemyMultiplier:Math.max(.1,Number(row.enemy_multiplier)||fallback.enemyMultiplier||1),oreCount:Math.max(0,Math.round(Number(row.ore_count)||0)),oreRespawnMinMs:Math.max(1000,Number(row.ore_respawn_min_ms)||5000),oreRespawnMaxMs:Math.max(1000,Number(row.ore_respawn_max_ms)||12000),landmarkCount:Math.max(0,Math.round(Number(row.landmark_count)||0)),minLevel:Math.max(1,Number(row.min_level)||1),battle:!!row.battle,gate:!!row.gate,enabled:row.enabled!==false,palette:row.palette&&typeof row.palette==='object'?{...row.palette}:{...(fallback.palette||{})},structures:Array.isArray(row.structures)?[...row.structures]:(fallback.structures||[])};}
  const pools=new Map();for(const row of raw.map_resources||[]){const mapId=String(row?.map_id||''),key=String(row?.resource_key||'');if(!mapId||!key||row.enabled===false)continue;if(!pools.has(mapId))pools.set(mapId,[]);pools.get(mapId).push({key,weight:Math.max(.01,Number(row.weight)||1)});}
  for(const [mapId,map] of Object.entries(MAPS)){const pool=pools.get(mapId);if(pool){map.ores=pool.map(x=>x.key);map.oreWeights=Object.fromEntries(pool.map(x=>[x.key,x.weight]));}}
  MAP_GRAPH_NODES.length=0;MAP_GRAPH_LINKS.length=0;PLAYABLE_GRAPH_LABELS.clear();worldRuntimeConfig.sectorDestinations.clear();worldRuntimeConfig.sectorInfo.clear();
  for(const row of raw.sectors){if(row?.enabled===false)continue;const label=String(row?.sector_label||''),mapId=String(row?.map_id||'');if(!label||!mapId||!MAPS[mapId])continue;const info={label,mapId,territoryFaction:row.territory_faction?String(row.territory_faction):null,x:Number(row.graph_x)||0,y:Number(row.graph_y)||0,minLevel:Math.max(1,Number(row.min_level)||MAPS[mapId].minLevel||1),enabled:true,battle:!!MAPS[mapId].battle};MAP_GRAPH_NODES.push({id:label,x:info.x,y:info.y});PLAYABLE_GRAPH_LABELS.add(label);worldRuntimeConfig.sectorInfo.set(label,info);worldRuntimeConfig.sectorDestinations.set(label,{mapId,territoryFaction:info.territoryFaction,battle:info.battle});}
  for(const row of [...(raw.portals||[])].sort((a,b)=>(Number(a.sort_order)||0)-(Number(b.sort_order)||0))){if(row?.enabled===false)continue;const a=String(row?.from_sector||''),b=String(row?.to_sector||'');if(!PLAYABLE_GRAPH_LABELS.has(a)||!PLAYABLE_GRAPH_LABELS.has(b))continue;MAP_GRAPH_LINKS.push([a,b,row.bidirectional!==false]);}
  if(!MAP_GRAPH_NODES.length){MAP_GRAPH_NODES.push(...WORLD_FALLBACK_GRAPH_NODES.map(x=>({...x})));PLAYABLE_GRAPH_LABELS.clear();for(const n of WORLD_FALLBACK_GRAPH_NODES)PLAYABLE_GRAPH_LABELS.add(n.id);}
  if(!MAP_GRAPH_LINKS.length)MAP_GRAPH_LINKS.push(...WORLD_FALLBACK_GRAPH_LINKS.map(x=>[...x]));
  worldRuntimeConfig.version=Math.max(0,Number(raw.version)||0);worldRuntimeConfig.updatedAt=raw.updated_at||null;worldRuntimeConfig.source=source;return true;
}
function loadWorldRuntimeConfigCache(){try{const raw=JSON.parse(localStorage.getItem(WORLD_RUNTIME_CACHE_KEY)||'null');return !!(raw&&normalizeWorldRuntimeConfig(raw,'cache'));}catch{return false;}}
function saveWorldRuntimeConfigCache(raw){try{localStorage.setItem(WORLD_RUNTIME_CACHE_KEY,JSON.stringify(raw));}catch{}}
async function refreshWorldRuntimeConfig(force=false){
  if(!authenticated||!getUser()?.id)return null;const now=Date.now();if(!force&&now-worldRuntimeConfig.lastFetchAt<30000)return null;worldRuntimeConfig.lastFetchAt=now;
  try{const raw=await loadWorldRuntimeConfigOnline();if(!raw)return null;const changed=Number(raw.version)!==Number(worldRuntimeConfig.version)||worldRuntimeConfig.source!=='online';if(changed){normalizeWorldRuntimeConfig(raw,'online');saveWorldRuntimeConfigCache(raw);if(progress){state.currentMap=MAPS[progress.mapId]||MAPS.x1;state.radarRange=mapRadarRange();try{renderAll();}catch{}}console.info(`[world-config] v${worldRuntimeConfig.version} aplicado no cliente`);}return raw;}catch(err){console.warn('[world-config] usando cache/fallback',err);if(worldRuntimeConfig.source==='fallback')loadWorldRuntimeConfigCache();return null;}
}
setInterval(()=>{if(authenticated)refreshWorldRuntimeConfig(false);},45000);


let MISSION_CATEGORIES = {
  daily: { label: 'MISSÕES DIÁRIAS', accent: '#58d9ff', reset: 'daily' },
  weekly: { label: 'MISSÕES SEMANAIS', accent: '#8d7bff', reset: 'weekly' },
  monthly: { label: 'MISSÕES MENSAIS', accent: '#ffc65a', reset: 'monthly' },
  special: { label: 'MISSÕES ESPECIAIS', accent: '#ff668a', reset: 'special' },
};

let WEEKLY_STEPS = [10,25,50,100,150,200,250,500,750,1000];
let MONTHLY_STEPS = WEEKLY_STEPS.map(v=>v*10);
const MISSION_NPCS = Object.keys(NPC_TYPES);
const NORMAL_MISSION_NPCS = MISSION_NPCS.filter(id=>!id.startsWith('boss'));
const BOSS_MISSION_NPCS = MISSION_NPCS.filter(id=>id.startsWith('boss'));
let MISSION_ORES = ['Prometium','Endurium','Terbium'];

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
  const key=missionPeriodKey('daily'),rng=seededRng(hashStringSeed(`daily:${key}`)),rule=systemsMissionCategory('daily'),cfg=rule?.config||{},factor=Number(rule?.rewardFactor??.5);
  const huntNpc=pickSeeded(MISSION_NPCS,rng);
  const huntTarget=huntNpc.startsWith('boss')?Math.max(1,Number(cfg.hunt_boss_target)||50):Math.max(1,Number(cfg.hunt_normal_target)||100);
  const orePool=missionOrePool('daily'),ore=pickSeeded(orePool,rng);
  const n1=pickSeeded(NORMAL_MISSION_NPCS,rng);
  const n2=pickSeeded(NORMAL_MISSION_NPCS,rng,[n1]);
  const boss=pickSeeded(BOSS_MISSION_NPCS,rng);
  return [
    makeMission({
      id:'daily_hunt',
      title:`Caçada do Dia • ${NPC_TYPES[huntNpc].name}`,
      desc:`Alvo diário sorteado para hoje. Elimine somente ${NPC_TYPES[huntNpc].name}.`,
      tasks:[taskKill(huntNpc,huntTarget,'daily_hunt_target')],
      group:huntNpc.startsWith('boss')?'boss':'npc',rewardFactor:factor,tag:`DIÁRIA • BÔNUS ${Math.round(factor*100)}%`
    }),
    makeMission({
      id:'daily_ore',
      title:`Mineração do Dia • ${RESOURCES[ore].name}`,
      desc:`Colete a pedra sorteada do dia. Somente ${RESOURCES[ore].name} conta.`,
      tasks:[taskOre(ore,Math.max(1,Number(cfg.ore_target)||500),'daily_ore_target')],
      group:'ore',rewardFactor:factor,tag:`DIÁRIA • BÔNUS ${Math.round(factor*100)}%`,flatReward:cfg.ore_flat_reward&&typeof cfg.ore_flat_reward==='object'?{...cfg.ore_flat_reward}:{credits:750000,uridium:750,xp:2500}
    }),
    makeMission({
      id:'daily_combo',
      title:'Operação Tripla do Dia',
      desc:`Missão conjunta diária: dois NPCs comuns + um BOSS sorteado.`,
      tasks:[
        taskKill(n1,Math.max(1,Number(cfg.combo_normal_target)||50),'daily_combo_a'),
        taskKill(n2,Math.max(1,Number(cfg.combo_normal_target)||50),'daily_combo_b'),
        taskKill(boss,Math.max(1,Number(cfg.combo_boss_target)||10),'daily_combo_boss'),
      ],
      group:'mix',rewardFactor:factor,tag:`DIÁRIA • BÔNUS ${Math.round(factor*100)}%`
    }),
  ];
}
function buildTierMissions(category,steps){
  const label=category==='weekly'?'Semanal':'Mensal',factor=Number(systemsMissionCategory(category)?.rewardFactor??(category==='weekly'?.8:1)),orePool=missionOrePool(category);
  const missions=[];
  for(const npc of MISSION_NPCS){
    const boss=npc.startsWith('boss');
    steps.forEach((target,i)=>{
      missions.push(makeMission({
        id:`${category}_npc_${npc}_${target}`,
        title:`${label} • ${NPC_TYPES[npc].name} • ${target}`,
        desc:`Elimine exatamente ${target} ${NPC_TYPES[npc].name}.`,
        tasks:[taskKill(npc,target)],
        group:boss?'boss':'npc',rewardFactor:factor,
        tag:`${label.toUpperCase()} • NÍVEL ${i+1} • BÔNUS ${Math.round(factor*100)}%`
      }));
    });
  }
  for(const ore of orePool){
    steps.forEach((target,i)=>{
      missions.push(makeMission({
        id:`${category}_ore_${ore}_${target}`,
        title:`${label} • ${RESOURCES[ore].name} • ${target}`,
        desc:`Colete ${target} unidades de ${RESOURCES[ore].name}.`,
        tasks:[taskOre(ore,target)],
        group:'ore',rewardFactor:factor,
        tag:`${label.toUpperCase()} • NÍVEL ${i+1} • BÔNUS ${Math.round(factor*100)}%`
      }));
    });
  }
  return missions;
}
function buildSpecialMissions(){
  const missions=[],rule=systemsMissionCategory('special'),cfg=rule?.config||{},factor=Number(rule?.rewardFactor??1.25),orePool=missionOrePool('special');
  // 1 missão de cada NPC, sempre 10 eliminações, com bônus controlado sobre a recompensa normal.
  for(const npc of MISSION_NPCS){
    missions.push(makeMission({
      id:`special_npc_${npc}`,
      title:`Contrato Especial • ${NPC_TYPES[npc].name}`,
      desc:`Contrato direto: elimine ${Math.max(1,Number(cfg.npc_target)||10)} ${NPC_TYPES[npc].name}.`,
      tasks:[taskKill(npc,Math.max(1,Number(cfg.npc_target)||10))],
      group:npc.startsWith('boss')?'boss':'npc',rewardFactor:factor,
      tag:`CONTRATO ESPECIAL • BÔNUS ${Math.round(factor*100)}%`
    }));
  }
  // 1 missão de cada pedra.
  for(const ore of orePool){
    missions.push(makeMission({
      id:`special_ore_${ore}`,
      title:`Contrato Mineral • ${RESOURCES[ore].name}`,
      desc:`Colete ${Math.max(1,Number(cfg.ore_target)||250)} unidades de ${RESOURCES[ore].name}.`,
      tasks:[taskOre(ore,Math.max(1,Number(cfg.ore_target)||250))],
      group:'ore',rewardFactor:factor,tag:`MINERAÇÃO ESPECIAL • BÔNUS ${Math.round(factor*100)}%`
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
    id,title,sequence,group:'mix',rewardFactor:factor,tag:sequence?'SEQUENCIAL':'MULTIALVO',
    desc:sequence?'Conclua cada alvo na ordem para liberar a próxima etapa.':'Todos os alvos podem ser concluídos em qualquer ordem.',
    tasks:defs.map(([npc,target],i)=>taskKill(npc,target,`${id}_t${i+1}`))
  })));

  const bossSingles=[
    ['bossLordakia',10],['bossSaimon',10],['bossMordon',10],['bossDevolarium',10],['bossSibelon',10]
  ];
  bossSingles.forEach(([npc,target],i)=>missions.push(makeMission({
    id:`special_boss_contract_${i+1}`,title:`Caçada BOSS ${i+1} • ${NPC_TYPES[npc].name}`,
    desc:`Contrato pesado contra ${NPC_TYPES[npc].name}.`,
    tasks:[taskKill(npc,target)],group:'boss',rewardFactor:factor,tag:`BOSS ESPECIAL • BÔNUS ${Math.round(factor*100)}%`
  })));

  const bossMixes=[
    ['special_boss_mix_1','Tríade BOSS I',false,[['bossStreuner',10],['bossLordakia',8],['bossSaimon',6]]],
    ['special_boss_mix_2','Tríade BOSS II',true,[['bossLordakia',10],['bossSaimon',8],['bossMordon',5]]],
    ['special_boss_mix_3','Tríade BOSS III',false,[['bossSaimon',10],['bossMordon',8],['bossDevolarium',4]]],
    ['special_boss_mix_4','Tríade BOSS IV',true,[['bossMordon',8],['bossDevolarium',5],['bossSibelon',3]]],
    ['special_boss_mix_5','Tríade BOSS V',false,[['bossStreuner',20],['bossDevolarium',4],['bossSibelon',2]]],
  ];
  bossMixes.forEach(([id,title,sequence,defs])=>missions.push(makeMission({
    id,title,sequence,group:'boss',rewardFactor:factor,tag:sequence?'BOSS SEQUENCIAL':'BOSS MISTO',
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
    id,title,sequence,tasks,group:'hybrid',rewardFactor:factor,
    tag:sequence?'HÍBRIDA SEQUENCIAL':'HÍBRIDA',
    desc:sequence?'Complete combate e mineração na ordem para liberar a próxima tarefa.':'Combate e mineração podem avançar ao mesmo tempo.'
  })));
  for(const cm of systemsCustomMissions('special')){if(missions.some(m=>m.id===cm.id))continue;missions.push(cm);}
  return missions;
}

let CACHED_WEEKLY_MISSIONS=null,CACHED_MONTHLY_MISSIONS=null,CACHED_SPECIAL_MISSIONS=null;
function getMissionLibrary(category){
  if(category==='daily')return buildDailyMissions();
  if(category==='weekly')return CACHED_WEEKLY_MISSIONS ||= buildTierMissions('weekly',missionSteps('weekly',WEEKLY_STEPS));
  if(category==='monthly')return CACHED_MONTHLY_MISSIONS ||= buildTierMissions('monthly',missionSteps('monthly',MONTHLY_STEPS));
  if(category==='special')return CACHED_SPECIAL_MISSIONS ||= buildSpecialMissions();
  return [];
}
function missionById(category,id){return getMissionLibrary(category).find(m=>m.id===id)||null;}
function freshMissions(){return {balanceVersion:'17.7',active:{daily:null,weekly:null,monthly:null,special:null},completed:{}};}
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
  if(progress.missions.balanceVersion!=='17.7'){
    for(const category of Object.keys(MISSION_CATEGORIES)){
      const active=progress.missions.active[category];if(!active)continue;
      const mission=missionById(category,active.id);if(!mission)continue;
      const next={credits:0,uridium:0,xp:0},factor=missionFactor(mission);
      for(const task of mission.tasks||[]){
        const units=Math.max(0,Math.min(task.target,Number(active.taskProgress?.[task.id])||0));if(!units)continue;
        if(task.type==='kill'){const r=npcKillReward(NPC_TYPES[task.npc]);next.credits+=r.credits*factor*units;next.uridium+=r.uridium*factor*units;next.xp+=r.xp*factor*units;}
        else if(task.type==='ore')next.credits+=(RESOURCES[task.resource]?.sell||0)*factor*units;
      }
      active.bonus={credits:Math.round(next.credits),uridium:Math.round(next.uridium),xp:Math.round(next.xp)};active.flatRewardApplied=false;
    }
    progress.missions.balanceVersion='17.7';
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
  const unlocked=featureUnlocked('missions'),active=Object.values(progress.missions.active).filter(Boolean).length;
  if(ui.missionActiveCount)ui.missionActiveCount.textContent=unlocked?active:`LV${featureRequiredLevel('missions')}`;
  ui.missionBtn.classList.toggle('mission-active',unlocked&&active>0);
  ui.missionBtn.classList.toggle('level-locked',!unlocked);
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
  normalizePilotJourney();const journey=currentJourneyStep();
  if(journey){const pct=Math.round(journeyStepPct(journey)),sig=`journey:${progress.journey.step}:${journeyStepValue(journey)}:${pct}`;ui.activeMissionPanel.classList.remove('hidden');if(!force&&sig===state.missionHudSignature)return;state.missionHudSignature=sig;ui.activeMissionCategory.textContent='JORNADA';ui.activeMissionTitle.textContent=journey.label;ui.activeMissionTask.textContent=`${journey.desc} • ${fmt(Math.min(journeyStepValue(journey),journey.target))}/${fmt(journey.target)}`;ui.activeMissionProgressBar.style.width=`${pct}%`;ui.activeMissionProgressText.textContent=`${pct}%`;ui.activeMissionRewardFactor.textContent=journey.reward;ui.activeMissionDots.innerHTML='';return;}
  if(!featureUnlocked('missions')){ui.activeMissionPanel.classList.add('hidden');return;}
  const entries=activeMissionEntries();
  if(!entries.length){ui.activeMissionPanel.classList.add('hidden');state.missionHudPage=0;state.missionHudSignature='';return;}
  ui.activeMissionPanel.classList.remove('hidden');
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
  if(!featureUnlocked('missions')){showFeatureLock('missions','Missões');return;}
  if(!missionCategoryUnlocked(category)){showToast(`${MISSION_CATEGORIES[category]?.label||'Categoria'} libera no nível ${missionCategoryRequiredLevel(category)}`);return;}
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
  const rule=systemsMissionCategory(category),cfg=rule?.config||{};if(category==='daily'&&mission?.group==='ore')return Number.isFinite(Number(cfg.ore_item_chance))?Math.max(0,Math.min(1,Number(cfg.ore_item_chance))):1;
  return Number.isFinite(Number(rule?.itemChance))?Math.max(0,Math.min(1,Number(rule.itemChance))):(({daily:.55,weekly:.60,monthly:.78,special:.88})[category]??.45);
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
  progress.profile.credits+=bonus.credits;progress.profile.uridium+=bonus.uridium;bonus.xp=Math.round(bonus.xp*designerXpMultiplier());progress.profile.xp+=bonus.xp;telemetryEconomy('mission',{cr:bonus.credits,stl:bonus.uridium,xp:bonus.xp});telemetryCounter('missions_completed',1);titleStatAdd('missions',1);
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
function missionEvent(type,payload={}){if(!progress||!featureUnlocked('missions'))return;normalizeMissionState();let anyChanged=false;const finished=[];for(const category of Object.keys(MISSION_CATEGORIES)){if(MISSION_CATEGORIES[category]?.enabled===false)continue;const active=progress.missions.active[category];if(!active||active.complete)continue;const mission=missionById(category,active.id);if(!mission)continue;let categoryChanged=false;let eventAmount=type==='collectOre'?Math.max(0,Number(payload.amount)||0):1;if(eventAmount<=0)continue;for(let i=0;i<mission.tasks.length;i++){const task=mission.tasks[i];if(!taskUnlocked(mission,active,i))continue;const current=taskCurrent(active,task),remaining=Math.max(0,task.target-current);if(!remaining)continue;let matches=false;if(type==='kill'&&task.type==='kill'&&payload.enemy?.type===task.npc)matches=true;if(type==='collectOre'&&task.type==='ore'&&payload.type===task.resource)matches=true;if(!matches)continue;const add=Math.min(remaining,type==='kill'?1:eventAmount);if(add<=0)continue;active.taskProgress[task.id]=current+add;addMissionReward(active,mission,task.type==='kill'?'kill':'ore',payload,add);categoryChanged=true;anyChanged=true;if(mission.sequence)break;if(type==='kill')break;}if(categoryChanged){active.complete=mission.tasks.every(x=>taskDone(active,x));if(active.complete)finished.push({category,mission,active});}}for(const item of finished)finishMissionAutomatically(item.category,item.mission,item.active);if(anyChanged&&!finished.length){saveGame();updateMissionButton();if(ui.missionModal&&!ui.missionModal.classList.contains('hidden'))renderMissions();}}
const MISSION_UI_PREFS_KEY='stellar_mission_ui_v1765';
const missionUiPrefs={loaded:false,collapsed:{}};
function loadMissionUiPrefs(){
  if(missionUiPrefs.loaded)return;missionUiPrefs.loaded=true;
  try{const raw=JSON.parse(localStorage.getItem(MISSION_UI_PREFS_KEY)||'{}');if(raw.collapsed&&typeof raw.collapsed==='object')missionUiPrefs.collapsed={...raw.collapsed};}catch{}
}
function saveMissionUiPrefs(){try{localStorage.setItem(MISSION_UI_PREFS_KEY,JSON.stringify({collapsed:missionUiPrefs.collapsed}));}catch{}}
function toggleMissionCategory(category){loadMissionUiPrefs();missionUiPrefs.collapsed[category]=!missionUiPrefs.collapsed[category];saveMissionUiPrefs();renderMissions();}
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
  loadMissionUiPrefs();normalizeMissionState();normalizePilotJourney();ui.missionContent.innerHTML='';
  ui.missionContent.appendChild(journeyPanel());
  for(const [category,meta] of Object.entries(MISSION_CATEGORIES)){
    if(meta?.enabled===false)continue;
    const allMissions=getMissionLibrary(category);const missions=visibleMissionCatalog(category,allMissions);
    const categoryLocked=!missionCategoryUnlocked(category),collapsed=categoryLocked||!!missionUiPrefs.collapsed[category];
    const section=document.createElement('section');section.className=`mission-category${collapsed?' collapsed':''}${categoryLocked?' level-locked-section':''}`;section.style.setProperty('--mission-accent',meta.accent);
    const active=progress.missions.active[category];
    const head=document.createElement('button');head.type='button';head.className='mission-category-head';head.setAttribute('aria-expanded',String(!collapsed));
    const summary=categoryLocked?`LIBERA NO NÍVEL ${missionCategoryRequiredLevel(category)}`:(active?'1 missão ativa • ATIVA':`${missions.length} contratos disponíveis agora • LIVRE`);
    head.innerHTML=`<span><b>${meta.label}</b><small>${summary}</small></span><em>${categoryLocked?'🔒':collapsed?'▸':'▾'}</em>`;
    head.onclick=()=>categoryLocked?showToast(`${meta.label} libera no nível ${missionCategoryRequiredLevel(category)}`):toggleMissionCategory(category);section.appendChild(head);
    const body=document.createElement('div');body.className='mission-category-body';
    const grid=document.createElement('div');grid.className='mission-grid';
    renderMissionFilter(body,category,grid,missions);
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
    body.appendChild(grid);section.appendChild(body);ui.missionContent.appendChild(section);
  }
  updateMissionButton();
}
function openMissions(){if(!featureUnlocked('missions')){showFeatureLock('missions','Missões');return;}closeNavigationModals(ui.missionModal);normalizeMissionState();renderMissions();ui.missionModal.classList.remove('hidden');}


// ===================== V17.9.3 — JORNADA DO PILOTO =====================
const PILOT_JOURNEY_STEPS=[
  {id:'first_kills',label:'Batismo de Fogo',desc:'Destrua 3 NPCs para dominar seleção, laser e míssil.',event:'kill',target:3,reward:'2.000 PLS-1',grant:()=>{progress.ammo.lcb10=(progress.ammo.lcb10||0)+2000;}},
  {id:'first_boxes',label:'Recupere a Carga',desc:'Colete 2 boxes deixadas por NPCs destruídos.',event:'box',target:2,reward:'50 R-310',grant:()=>{progress.rockets.r310=(progress.rockets.r310||0)+50;}},
  {id:'first_ore',label:'Mineração Inicial',desc:'Colete 100 unidades de recursos no setor.',event:'ore',target:100,reward:'500 PLS-2',grant:()=>{progress.ammo.mcb25=(progress.ammo.mcb25||0)+500;}},
  {id:'first_sale',label:'Primeira Venda',desc:'Retorne à base e venda recursos pelo menos uma vez.',event:'sell',target:1,reward:'100 STL',grant:()=>{progress.profile.uridium=(progress.profile.uridium||0)+100;telemetryEconomy('other',{stl:100});}},
  {id:'first_jump',label:'Rota Estelar',desc:'Use um portal e viaje para outro setor.',event:'jump',target:1,reward:'1 Bônus de Reparo',grant:()=>{normalizeGalaxyGateState();progress.galaxyGate.repairBonus=(progress.galaxyGate.repairBonus||0)+1;}},
  {id:'reach_level_5',label:'Piloto Operacional',desc:'Alcance o nível 5 e libere o Controle de Missões.',event:'level',target:5,reward:'Título • Iniciado Estelar',value:()=>Number(progress?.profile?.level||1),grant:()=>{progress.journey.titleUnlocked=true;}}
];
function freshPilotJourney(){return {step:0,progress:0,claimed:{},completed:false,completedAt:null,titleUnlocked:false};}
function normalizePilotJourney(){if(!progress)return freshPilotJourney();progress.journey ||= freshPilotJourney();const j=progress.journey;j.step=Math.max(0,Math.min(PILOT_JOURNEY_STEPS.length,Math.floor(Number(j.step)||0)));j.progress=Math.max(0,Number(j.progress)||0);j.claimed ||= {};j.completed=!!j.completed||j.step>=PILOT_JOURNEY_STEPS.length;j.titleUnlocked=!!j.titleUnlocked;if(j.completed&&!j.completedAt)j.completedAt=Date.now();return j;}
function currentJourneyStep(){const j=normalizePilotJourney();return j.completed?null:PILOT_JOURNEY_STEPS[j.step]||null;}
function journeyStepValue(step=currentJourneyStep()){if(!step)return 0;if(typeof step.value==='function')return Math.max(0,Number(step.value())||0);return Math.max(0,Number(progress?.journey?.progress)||0);}
function journeyStepPct(step=currentJourneyStep()){if(!step)return 100;return Math.max(0,Math.min(100,journeyStepValue(step)/Math.max(1,step.target)*100));}
function grantJourneyReward(step){if(!step||progress.journey.claimed[step.id])return;progress.journey.claimed[step.id]=Date.now();try{step.grant?.();}catch(e){console.warn('journey grant',step.id,e);}pushActivity(`JORNADA • ${step.label} • ${step.reward}`,'reward');}
function advanceJourney(){const j=normalizePilotJourney();let guard=0;while(!j.completed&&guard++<PILOT_JOURNEY_STEPS.length){const step=PILOT_JOURNEY_STEPS[j.step];const value=journeyStepValue(step);if(value<step.target)break;grantJourneyReward(step);j.step++;j.progress=0;if(j.step>=PILOT_JOURNEY_STEPS.length){j.completed=true;j.completedAt=Date.now();queueCelebration('mission','JORNADA CONCLUÍDA','Treinamento inicial finalizado • novos sistemas liberam conforme seu nível');showToast('Jornada do Piloto concluída','reward');break;}const next=PILOT_JOURNEY_STEPS[j.step];queueCelebration('mission','JORNADA AVANÇOU',`${next.label} • ${next.desc}`);}saveGame();state.missionHudSignature='';renderActiveMissionHud(true);if(ui.missionModal&&!ui.missionModal.classList.contains('hidden'))renderMissions();}
function journeyEvent(type,amount=1){if(!progress)return;const j=normalizePilotJourney(),step=currentJourneyStep();if(!step||step.event!==type)return;if(typeof step.value==='function'){advanceJourney();return;}j.progress=Math.max(0,(Number(j.progress)||0)+Math.max(0,Number(amount)||0));advanceJourney();}
function journeyPanel(){const j=normalizePilotJourney(),section=document.createElement('section');section.className='pilot-journey-panel';const current=currentJourneyStep();section.innerHTML=`<div class="pilot-journey-head"><div><div class="eyebrow">JORNADA DO PILOTO</div><h3>${j.completed?'TREINAMENTO CONCLUÍDO':escHtml(current?.label||'Jornada')}</h3><small>${j.completed?'Você já domina os fundamentos do Stellar Legacy.':'Tutorial orgânico • siga os objetivos enquanto joga normalmente.'}</small></div><span>${j.completed?'100%':`${j.step+1}/${PILOT_JOURNEY_STEPS.length}`}</span></div>`;const grid=document.createElement('div');grid.className='pilot-journey-grid';PILOT_JOURNEY_STEPS.forEach((s,i)=>{const done=i<j.step||j.completed,active=i===j.step&&!j.completed,locked=i>j.step&&!j.completed,val=done?s.target:active?journeyStepValue(s):0,pct=done?100:active?journeyStepPct(s):0;const card=document.createElement('article');card.className=`pilot-journey-step${done?' done':''}${active?' active':''}${locked?' locked':''}`;card.innerHTML=`<div class="pilot-journey-step-top"><b>${i+1}. ${escHtml(s.label)}</b><span>${done?'✓':active?'ATUAL':'🔒'}</span></div><p>${escHtml(s.desc)}</p><div class="pilot-journey-progress"><i style="width:${pct}%"></i></div><small>${active?`${fmt(Math.min(val,s.target))} / ${fmt(s.target)} • `:''}${escHtml(s.reward)}</small>`;grid.appendChild(card);});section.appendChild(grid);return section;}
function openJourneyPanel(){closeNavigationModals(ui.missionModal);normalizeMissionState();renderMissions();ui.missionModal.classList.remove('hidden');}

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
  const r=rewardBundle();r.credits=level*100000;r.uridium=level*150;addRewardQty(r.ammo,'lcb10',level*250);
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
  const r=rewardBundle();r.credits=250000+tier*175000;r.uridium=350+tier*75;addRewardQty(r.ammo,'lcb10',1500+tier*150);
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
function grantProgressionBundle(r,telemetrySource='pass'){
  const gainCr=Number(r.credits)||0,gainStl=Number(r.uridium)||0;progress.profile.credits+=gainCr;progress.profile.uridium+=gainStl;telemetryEconomy(telemetrySource,{cr:gainCr,stl:gainStl});
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
const PASS_UI_PREFS_KEY='stellar_pass_ui_v1770';
let passUiPrefs={loaded:false,collapsed:{missions:false,rewards:false,levels:false}};
function loadPassUiPrefs(){if(passUiPrefs.loaded)return passUiPrefs;passUiPrefs.loaded=true;try{const raw=JSON.parse(localStorage.getItem(PASS_UI_PREFS_KEY)||'{}');for(const k of Object.keys(passUiPrefs.collapsed))passUiPrefs.collapsed[k]=!!raw?.collapsed?.[k];}catch{}return passUiPrefs;}
function savePassUiPrefs(){try{localStorage.setItem(PASS_UI_PREFS_KEY,JSON.stringify({collapsed:passUiPrefs.collapsed}));}catch{}}
function togglePassSection(key){loadPassUiPrefs();passUiPrefs.collapsed[key]=!passUiPrefs.collapsed[key];savePassUiPrefs();renderProgression();}
function passSectionClass(key,extra=''){loadPassUiPrefs();return `pass-section ${extra}${passUiPrefs.collapsed[key]?' collapsed':''}`.trim();}
function passSectionIcon(key){loadPassUiPrefs();return passUiPrefs.collapsed[key]?'▸':'▾';}
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
  loadPassUiPrefs();
  ui.passContent.innerHTML=`<section class="pass-hero"><div><div class="eyebrow">TEMPORADA ${progress.battlePass.season}</div><h3>TIER ${unlocked} / ${BATTLE_PASS_TIER_COUNT}</h3><p>5 missões diárias • 100 pontos cada • Free + trilha Premium com ganhos 2X e itens Elite.</p></div><div class="pass-points"><span>PONTOS</span><b>${fmt(points)}</b><small>${unlocked>=BATTLE_PASS_TIER_COUNT?'PASSE COMPLETO':`faltam ${fmt(nextPoints)} para o próximo tier`}</small></div></section><div class="pass-main-progress"><i style="width:${battlePassTierProgress()}%"></i></div>${paid?'<div class="pass-premium-active">✦ PASSE PREMIUM ATIVO NESTA TEMPORADA</div>':'<div class="pass-premium-cta">A trilha Premium entrega 2X os ganhos, equipamentos Elite nos marcos e <b>Reclaimer</b> no Tier 30. <button class="gold-btn" id="passOpenPremium">VER PASSE PREMIUM</button></div>'}
  <section class="${passSectionClass('missions')}"><button class="pass-section-head pass-section-toggle" type="button" data-pass-toggle="missions"><span class="pass-head-copy"><b>MISSÕES DIÁRIAS</b><small>${missions.filter(m=>daily.completed[m.id]).length}/5 concluídas hoje</small></span><em>${passSectionIcon('missions')}</em></button><div class="pass-section-body"><div class="pass-missions">${dailyHtml}</div></div></section>
  <section class="${passSectionClass('rewards')}"><div class="pass-section-head"><button class="pass-section-title-button" type="button" data-pass-toggle="rewards"><span class="pass-head-copy"><b>RECOMPENSAS DO PASSE</b><small>FREE + PREMIUM • 30 tiers</small></span><em>${passSectionIcon('rewards')}</em></button><div class="pass-claim-stack"><button class="ghost-btn" id="passClaimAll">RESGATAR FREE</button><button class="ghost-btn" id="passPremiumClaimAll" ${paid?'':'disabled'}>RESGATAR PREMIUM</button></div></div><div class="pass-section-body"><div class="pass-tier-grid">${tiers}</div></div></section>
  <section class="${passSectionClass('levels','level-section')}"><div class="pass-section-head"><button class="pass-section-title-button" type="button" data-pass-toggle="levels"><span class="pass-head-copy"><b>RECOMPENSAS DE NÍVEL</b><small>LV 2 → LV ${PLAYER_MAX_LEVEL}</small></span><em>${passSectionIcon('levels')}</em></button><button class="ghost-btn" id="levelClaimAll">RESGATAR DISPONÍVEIS</button></div><div class="pass-section-body"><p class="muted">Cada recompensa de nível pode ser resgatada uma única vez.</p><div class="level-reward-grid">${levels}</div></div></section>`;
  ui.passContent.querySelectorAll('[data-pass-toggle]').forEach(b=>b.onclick=e=>{e.stopPropagation();togglePassSection(b.dataset.passToggle);});
  ui.passContent.querySelectorAll('[data-pass-claim]').forEach(b=>b.onclick=()=>claimBattlePassTier(b.dataset.passClaim));
  ui.passContent.querySelectorAll('[data-pass-premium-claim]').forEach(b=>b.onclick=()=>claimPremiumBattlePassTier(b.dataset.passPremiumClaim));
  ui.passContent.querySelectorAll('[data-level-claim]').forEach(b=>b.onclick=()=>claimLevelReward(b.dataset.levelClaim));
  $('#passClaimAll')?.addEventListener('click',claimAllBattlePassRewards);$('#passPremiumClaimAll')?.addEventListener('click',claimAllPremiumBattlePassRewards);$('#levelClaimAll')?.addEventListener('click',claimAllLevelRewards);$('#passOpenPremium')?.addEventListener('click',openPremiumShop);
}
function openProgression(){if(!progress)return;closeNavigationModals(ui.passModal);normalizeBattlePass();normalizeLevelRewards();refreshPremiumState().finally(()=>{renderProgression();ui.passModal?.classList.remove('hidden');});}



const STARTER_SHIP_ID = 'phoenix';
const SHIP_REPAIR_URI_COST = 500;

const GALAXY_ALPHA_WAVE_INTERVAL_MS = 8000;
const GALAXY_ALPHA_ROUND_INTERVAL_MS = 9000;
const GALAXY_GATE_MAX_LIVES = 5;
const GALAXY_GATE_BASE_LIVES = 3;

// V16.7.9 • Portais refeitos para serem vencíveis também por jogador FREE bem equipado em Créditos.
// A dificuldade vem de progressão, posicionamento e kite — não de dezenas de NPCs batendo ao mesmo tempo.
const GALAXY_ALPHA_ROUNDS = [
  {round:1,name:'Primeiro Contato',waves:[{type:'streuner',count:5},{type:'recruitStreuner',count:4},{type:'aiderStreuner',count:3}]},
  {round:2,name:'Incursão Vrax',waves:[{type:'lordakia',count:4},{type:'lordakia',count:4},{type:'bossLordakia',count:1}]},
  {round:3,name:'Enxame Zyron',waves:[{type:'saimon',count:4},{type:'saimon',count:3},{type:'bossSaimon',count:1}]},
  {round:4,name:'Cerco Kharon',waves:[{type:'mordon',count:3},{type:'mordon',count:2},{type:'bossMordon',count:1}]},
  {round:5,name:'Muralha Dreadnox',waves:[{type:'devolarium',count:2},{type:'mordon',count:2},{type:'bossDevolarium',count:1}]},
  {round:6,name:'Guardião Aurora',waves:[{type:'sibelon',count:1},{type:'devolarium',count:2},{type:'sibelon',count:1}]},
];
const GALAXY_NEXUS_ROUNDS = [
  {round:1,name:'Brecha Vrax',waves:[{type:'lordakia',count:4},{type:'saimon',count:3},{type:'bossSaimon',count:1}]},
  {round:2,name:'Linha Zyron',waves:[{type:'saimon',count:3},{type:'mordon',count:2},{type:'bossMordon',count:1}]},
  {round:3,name:'Fortaleza Kharon',waves:[{type:'mordon',count:3},{type:'mordon',count:2},{type:'bossMordon',count:1}]},
  {round:4,name:'Pressão Dreadnox',waves:[{type:'devolarium',count:2},{type:'mordon',count:2},{type:'bossDevolarium',count:1}]},
  {round:5,name:'Corredor Colossar',waves:[{type:'devolarium',count:2},{type:'bossDevolarium',count:1},{type:'sibelon',count:1}]},
  {round:6,name:'Núcleo Colossar',waves:[{type:'sibelon',count:1},{type:'sibelon',count:1},{type:'bossSibelon',count:1}]},
  {round:7,name:'Tríade Nexus',waves:[{type:'bossMordon',count:1},{type:'bossDevolarium',count:1},{type:'bossSibelon',count:1}]},
];
const GALAXY_ECLIPSE_ROUNDS = [
  {round:1,name:'Eclipse Zyron',waves:[{type:'saimon',count:3},{type:'bossSaimon',count:2},{type:'mordon',count:2}]},
  {round:2,name:'Eclipse Kharon',waves:[{type:'mordon',count:2},{type:'bossMordon',count:1},{type:'mordon',count:2}]},
  {round:3,name:'Eclipse Dreadnox',waves:[{type:'devolarium',count:2},{type:'bossDevolarium',count:1},{type:'devolarium',count:2}]},
  {round:4,name:'Eclipse Colossar',waves:[{type:'sibelon',count:1},{type:'sibelon',count:1},{type:'bossSibelon',count:1}]},
  {round:5,name:'Prime Ascension',waves:[{type:'bossMordon',count:2},{type:'bossDevolarium',count:1},{type:'sibelon',count:1}]},
  {round:6,name:'Prime Convergence',waves:[{type:'bossDevolarium',count:1},{type:'bossSibelon',count:1},{type:'bossMordon',count:1}]},
  {round:7,name:'Colapso Astral',waves:[{type:'sibelon',count:2},{type:'bossSibelon',count:1},{type:'bossDevolarium',count:1}]},
  {round:8,name:'OMEGA ECLIPSE',waves:[{type:'bossMordon',count:1},{type:'bossDevolarium',count:1},{type:'bossSibelon',count:1}]},
];
const GALAXY_GATE_DEFS={
  alpha:{key:'alpha',label:'AURORA',mapId:'ggAlpha',pieces:34,spinCost:100,rounds:GALAXY_ALPHA_ROUNDS,enemyScale:.90,damageScale:.72,rewardScale:1.05,totalRewardMult:1.25,logReward:100,baseLives:3,maxLives:5,lifeCost:4000000,roundReward:{cores:5,credits:500000,ammoId:'mcb25',ammoQty:500},finalReward:{credits:10000000,uridium:5000,cores:100,ammoId:'mcb25',ammoQty:10000,rocketId:'plt2026',rocketQty:100,voidite:12},unlock:null},
  beta:{key:'beta',label:'NEXUS',mapId:'ggBeta',pieces:48,spinCost:125,rounds:GALAXY_NEXUS_ROUNDS,enemyScale:1.00,damageScale:.85,rewardScale:1.25,totalRewardMult:1.50,logReward:200,baseLives:3,maxLives:5,lifeCost:8000000,roundReward:{cores:10,credits:1000000,ammoId:'mcb50',ammoQty:750},finalReward:{credits:25000000,uridium:12500,cores:200,ammoId:'mcb50',ammoQty:10000,rocketId:'plt2021',rocketQty:200,voidite:28},unlock:null},
  gamma:{key:'gamma',label:'ECLIPSE',mapId:'ggGamma',pieces:64,spinCost:150,rounds:GALAXY_ECLIPSE_ROUNDS,enemyScale:1.08,damageScale:.95,rewardScale:1.50,totalRewardMult:1.75,logReward:300,baseLives:3,maxLives:5,lifeCost:15000000,roundReward:{cores:15,credits:2000000,ammoId:'ucb100',ammoQty:1000},finalReward:{credits:60000000,uridium:30000,cores:300,ammoId:'ucb100',ammoQty:10000,rocketId:'plt3030',rocketQty:300,voidite:55},unlock:null},
};
function freshGateProtocol(){return {pieces:[],built:false,lives:GALAXY_GATE_BASE_LIVES,completed:0,failed:0,run:null,lastCompletion:null};}
function freshGalaxyGateState(){return {jumpBonus:0,lifeBonus:0,repairBonus:0,lastResults:[],selected:'alpha',alpha:freshGateProtocol(),beta:freshGateProtocol(),gamma:freshGateProtocol()};}
function gateKeyForMap(mapId=progress?.mapId){return Object.values(GALAXY_GATE_DEFS).find(d=>d.mapId===mapId)?.key||null;}
function normalizeGalaxyGateState(){
  if(!progress)return; progress.galaxyGate ||= freshGalaxyGateState(); const g=progress.galaxyGate;
  g.jumpBonus=Math.max(0,Number(g.jumpBonus)||0);g.lifeBonus=Math.max(0,Number(g.lifeBonus)||0);g.repairBonus=Math.max(0,Number(g.repairBonus)||0);g.lastResults ||= [];g.selected=GALAXY_GATE_DEFS[g.selected]?g.selected:'alpha';
  for(const [key,def] of Object.entries(GALAXY_GATE_DEFS)){
    g[key] ||= freshGateProtocol(); const a=g[key];
    a.pieces=Array.isArray(a.pieces)?[...new Set(a.pieces.map(Number).filter(n=>n>=1&&n<=def.pieces))]:[];
    a.built=!!a.built||a.pieces.length>=def.pieces;a.lives=Math.max(0,Math.min(def.maxLives,Number(a.lives)||def.baseLives));a.completed=Math.max(0,Number(a.completed)||0);a.failed=Math.max(0,Number(a.failed)||0);
    if(a.run){a.run.round=Math.max(1,Math.min(def.rounds.length,Number(a.run.round)||1));a.run.waveIndex=Math.max(0,Number(a.run.waveIndex)||0);a.run.remaining ||= {};a.run.killRewards ||= {credits:0,uridium:0,xp:0};a.run.roundRewardsClaimed=Array.isArray(a.run.roundRewardsClaimed)?a.run.roundRewardsClaimed.map(Number):[];a.run.nextWaveAt=Number(a.run.nextWaveAt)||0;a.run.nextRoundAt=Number(a.run.nextRoundAt)||0;a.run.active=a.run.active!==false;}
  }
}
function currentGateKey(){normalizeGalaxyGateState();return gateKeyForMap()||progress.galaxyGate.selected||'alpha';}
function galaxyGateDef(key=currentGateKey()){return GALAXY_GATE_DEFS[key]||GALAXY_GATE_DEFS.alpha;}
function gateUnlocked(key){return !!GALAXY_GATE_DEFS[key];}
function alphaGate(){normalizeGalaxyGateState();return progress.galaxyGate[currentGateKey()];}
function isGalaxyGateMap(){return !!gateKeyForMap();}
function alphaRoundDef(){const a=alphaGate(),def=galaxyGateDef();return def.rounds[a.run?.round-1]||def.rounds[0];}
function alphaWaveDef(){const a=alphaGate(),r=alphaRoundDef();return r.waves[Math.max(0,(a.run?.waveIndex||0)-1)]||r.waves[0];}
function alphaRemainingCount(){return state.enemies.filter(e=>e.hp>0&&e.gateEnemy).length;}
function alphaRunReward(){const a=alphaGate(),r=a.run?.killRewards||{};return {credits:Math.round(r.credits||0),uridium:Math.round(r.uridium||0),xp:Math.round(r.xp||0)};}
function gateFinalRewardText(gd=galaxyGateDef()){const r=gd.finalReward||{};return `${fmt(r.credits||0)} CR • ${fmt(r.uridium||0)} STL • ${fmt(r.cores||0)} Núcleos • ${fmt(r.ammoQty||0)} ${LASER_AMMO[r.ammoId]?.name||''} • ${fmt(r.rocketQty||0)} ${ROCKETS[r.rocketId]?.name||''} • ${fmt(r.voidite||0)} Voidite`;}
function gateRoundRewardText(gd=galaxyGateDef()){const r=gd.roundReward||{};return `+${fmt(r.cores||0)} Núcleos • +${fmt(r.credits||0)} CR${r.ammoQty?` • +${fmt(r.ammoQty)} ${LASER_AMMO[r.ammoId]?.name||''}`:''}`;}

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
    accountOwnerId:getUser()?.id||null,
    accountOwnerEmail:getUser()?.email||null,
    profile: { callsign:getUser()?.callsign || getUser()?.email?.split('@')[0] || 'Pilot', faction:factionId, level:1, xp:0, xpModelV101:true, xpModelV1770:true, credits:20000, uridium:0, aliensKilled:0, ggCompleted:0 },
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
    titles: freshPilotTitles(),
    journey: freshPilotJourney(),
    achievements: freshAchievements(),
    economyBoosts: {},
    auction: freshAuctionState(),
    galaxyGate: freshGalaxyGateState(),
    repairRequired: null,
    pet: freshPet(),
    combatAbilities:{shipReadyAt:0},
    warfront:freshWarfrontProgress(),
    galaxyEvents:{records:{},lastSeenEvent:null},
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
  pointerNavActive:false, pointerNavId:null, lastTargetTapId:null, lastTargetTapAt:0, combatAlertText:'', combatAlertKind:'', combatAlertUntil:0, lowHpWarned:false, eventSpawnKey:'', missionHudPage:0, missionHudSignature:'', portalCombatUntil:0,
  shopTab: 'ships', hangarTab: 'ships', hangarEquipFilter:'all', hangarDroneFilter:'all', hangarPetFilter:'all', toastTimer: null, ammoUiExpanded: true, statsUiExpanded: true, playerUiExpanded: true, missionUiExpanded: true, petUiExpanded: true, minimapUiExpanded: true, chatUiExpanded: true, topMetaExpanded: true, topbarDockExpanded: true, targetLockUiExpanded:true, galaxyEventUiExpanded:true,
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
function applyAmmoUiState(){ if(!ui.weaponBar) return; ui.weaponBar.classList.toggle('collapsed', !state.ammoUiExpanded); if(ui.weaponBarToggle) ui.weaponBarToggle.textContent = state.ammoUiExpanded ? '▾' : '▸'; requestAnimationFrame(layoutHudPanels); }
function loadAmmoUiState(){ try{ const raw=localStorage.getItem('stellar_ammo_ui_expanded'); if(raw!==null) state.ammoUiExpanded = raw==='1'; }catch{} applyAmmoUiState(); }
function toggleAmmoUi(){ state.ammoUiExpanded=!state.ammoUiExpanded; try{ localStorage.setItem('stellar_ammo_ui_expanded', state.ammoUiExpanded?'1':'0'); }catch{} applyAmmoUiState(); syncHudButton(); }

function applyStatsUiState(){ if(!ui.leftStats) return; ui.leftStats.classList.toggle('collapsed', !state.statsUiExpanded); if(ui.statsToggle) ui.statsToggle.textContent = state.statsUiExpanded ? '▾' : '▸'; requestAnimationFrame(layoutHudPanels); }
function loadStatsUiState(){ try{ const raw=localStorage.getItem('stellar_stats_ui_expanded'); if(raw!==null) state.statsUiExpanded = raw==='1'; }catch{} applyStatsUiState(); }
function toggleStatsUi(){ state.statsUiExpanded=!state.statsUiExpanded; try{ localStorage.setItem('stellar_stats_ui_expanded', state.statsUiExpanded?'1':'0'); }catch{} applyStatsUiState(); syncHudButton(); }

function applyPlayerUiState(){ if(!ui.playerPanel) return; ui.playerPanel.classList.toggle('collapsed', !state.playerUiExpanded); if(ui.playerPanelToggle) ui.playerPanelToggle.textContent = state.playerUiExpanded ? '▾' : '▸'; requestAnimationFrame(layoutHudPanels); }
function loadPlayerUiState(){ try{ const raw=localStorage.getItem('stellar_player_ui_expanded'); if(raw!==null) state.playerUiExpanded = raw==='1'; }catch{} applyPlayerUiState(); }
function togglePlayerUi(){ state.playerUiExpanded=!state.playerUiExpanded; try{ localStorage.setItem('stellar_player_ui_expanded', state.playerUiExpanded?'1':'0'); }catch{} applyPlayerUiState(); }


function applyMissionUiState(){
  if(!ui.activeMissionPanel)return;
  ui.activeMissionPanel.classList.toggle('collapsed',!state.missionUiExpanded);
  if(ui.activeMissionToggle)ui.activeMissionToggle.textContent=state.missionUiExpanded?'▾':'▸';
  requestAnimationFrame(layoutHudPanels);
}
function loadMissionUiState(){try{const raw=localStorage.getItem('stellar_mission_ui_expanded');if(raw!==null)state.missionUiExpanded=raw==='1';}catch{}applyMissionUiState();}
function toggleMissionUi(){state.missionUiExpanded=!state.missionUiExpanded;try{localStorage.setItem('stellar_mission_ui_expanded',state.missionUiExpanded?'1':'0');}catch{}applyMissionUiState();}

function applyPetUiState(){
  if(!ui.petFloatPanel)return;
  ui.petFloatPanel.classList.toggle('collapsed',!state.petUiExpanded);
  if(ui.petFloatToggle)ui.petFloatToggle.textContent=state.petUiExpanded?'▾':'▸';
  requestAnimationFrame(layoutHudPanels);
}
function loadPetUiState(){try{const raw=localStorage.getItem('stellar_pet_ui_expanded');if(raw!==null)state.petUiExpanded=raw==='1';}catch{}applyPetUiState();}
function togglePetUi(){state.petUiExpanded=!state.petUiExpanded;try{localStorage.setItem('stellar_pet_ui_expanded',state.petUiExpanded?'1':'0');}catch{}applyPetUiState();}

function applyTargetLockUiState(){
  if(!ui.targetLockHud)return;ui.targetLockHud.classList.toggle('collapsed',!state.targetLockUiExpanded);
  if(ui.targetLockToggle){ui.targetLockToggle.textContent=state.targetLockUiExpanded?'▾':'▸';ui.targetLockToggle.setAttribute('aria-label',state.targetLockUiExpanded?'Minimizar Target Lock':'Expandir Target Lock');}
}
function loadTargetLockUiState(){try{const raw=localStorage.getItem('stellar_target_lock_ui_expanded');if(raw!==null)state.targetLockUiExpanded=raw==='1';}catch{}applyTargetLockUiState();}
function toggleTargetLockUi(){state.targetLockUiExpanded=!state.targetLockUiExpanded;try{localStorage.setItem('stellar_target_lock_ui_expanded',state.targetLockUiExpanded?'1':'0');}catch{}applyTargetLockUiState();}
function applyGalaxyEventUiState(){
  if(!ui.galaxyEventHud)return;ui.galaxyEventHud.classList.toggle('collapsed',!state.galaxyEventUiExpanded);
  if(ui.galaxyEventToggle){ui.galaxyEventToggle.textContent=state.galaxyEventUiExpanded?'▾':'▸';ui.galaxyEventToggle.setAttribute('aria-label',state.galaxyEventUiExpanded?'Minimizar evento':'Expandir evento');}
}
function loadGalaxyEventUiState(){try{const raw=localStorage.getItem('stellar_galaxy_event_ui_expanded');if(raw!==null)state.galaxyEventUiExpanded=raw==='1';}catch{}applyGalaxyEventUiState();}
function toggleGalaxyEventUi(){state.galaxyEventUiExpanded=!state.galaxyEventUiExpanded;try{localStorage.setItem('stellar_galaxy_event_ui_expanded',state.galaxyEventUiExpanded?'1':'0');}catch{}applyGalaxyEventUiState();}


// ===================== V16.2 CHAT DOCK • GLOBAL / ALIANÇA / PV =====================
const CHAT_POLL_MS=1100;
const CHAT_STATE_KEY='stellar_chat_v162';
const chatRuntime={channel:'global',pvTarget:'',busy:false,lastPollAt:0,lastSignature:'',messages:[]};
function loadChatPrefs(){
  try{const raw=JSON.parse(localStorage.getItem(CHAT_STATE_KEY)||'null');if(raw&&typeof raw==='object'){if(['global','clan','private'].includes(raw.channel))chatRuntime.channel=raw.channel;if(typeof raw.pvTarget==='string')chatRuntime.pvTarget=raw.pvTarget.slice(0,24);if(raw.expanded!==undefined)state.chatUiExpanded=!!raw.expanded;}}catch{}
  if(ui.chatPrivateCallsign)ui.chatPrivateCallsign.value=chatRuntime.pvTarget;
  applyChatUiState();renderChatTabs();renderChatMessages();
}
function saveChatPrefs(){try{localStorage.setItem(CHAT_STATE_KEY,JSON.stringify({channel:chatRuntime.channel,pvTarget:chatRuntime.pvTarget,expanded:state.chatUiExpanded}));}catch{}}
function applyChatUiState(){
  if(!ui.chatDock)return;ui.chatDock.classList.toggle('collapsed',!state.chatUiExpanded);
  if(ui.chatToggle){ui.chatToggle.textContent=state.chatUiExpanded?'▾':'▸';ui.chatToggle.setAttribute('aria-label',state.chatUiExpanded?'Minimizar chat':'Expandir chat');}
  requestAnimationFrame(layoutHudPanels);
}
function toggleChatUi(){state.chatUiExpanded=!state.chatUiExpanded;saveChatPrefs();applyChatUiState();syncHudButton();}
function chatChannelLabel(){return chatRuntime.channel==='clan'?'ALIANÇA':chatRuntime.channel==='private'?'PV':'GLOBAL';}
function renderChatTabs(){
  ui.chatTabs?.querySelectorAll('[data-chat-channel]').forEach(b=>b.classList.toggle('active',b.dataset.chatChannel===chatRuntime.channel));
  ui.chatPrivateRow?.classList.toggle('hidden',chatRuntime.channel!=='private');
  if(ui.chatChannelChip)ui.chatChannelChip.textContent=chatRuntime.channel==='private'?(chatRuntime.pvTarget?`PV • ${chatRuntime.pvTarget.toUpperCase()}`:'PV'):chatChannelLabel();
  if(ui.chatStatus)ui.chatStatus.textContent=authenticated?'ONLINE':'OFFLINE';
  if(ui.chatInput)ui.chatInput.placeholder=chatRuntime.channel==='private'&&!chatRuntime.pvTarget?'Informe o callsign acima...':'Digite uma mensagem...';
}
function chatMessageSignature(rows){return rows.map(r=>`${r.id}:${r.created_at}`).join('|');}
function renderChatMessages(){
  if(!ui.chatFeed)return;const rows=Array.isArray(chatRuntime.messages)?[...chatRuntime.messages].reverse():[];
  if(chatRuntime.channel==='private'&&!chatRuntime.pvTarget){ui.chatFeed.innerHTML='<div class="chat-empty">Digite o callsign do piloto para abrir uma conversa privada.</div>';return;}
  if(!rows.length){ui.chatFeed.innerHTML=`<div class="chat-empty">${chatRuntime.channel==='clan'?'Nenhuma mensagem da aliança ainda.':chatRuntime.channel==='private'?'Nenhuma mensagem nesta conversa.':'Nenhuma mensagem global ainda.'}</div>`;return;}
  const me=String(getUser()?.id||'');
  ui.chatFeed.innerHTML=rows.map(m=>{
    const own=String(m.sender_user_id||'')===me,when=new Date(m.created_at||Date.now()),hh=String(when.getHours()).padStart(2,'0'),mm=String(when.getMinutes()).padStart(2,'0');
    const target=m.channel==='private'&&!own?'<span class="chat-private-mark">PV</span>':'';
    return `<div class="chat-line ${own?'own':''}"><div class="chat-line-meta">${target}<b>${escHtml(m.sender_callsign||'Pilot')}</b><span>${hh}:${mm}</span></div><div class="chat-line-body">${escHtml(m.body||'')}</div></div>`;
  }).join('');
  ui.chatFeed.scrollTop=ui.chatFeed.scrollHeight;
}
async function refreshChatHistory(force=false){
  if(!authenticated||!ui.chatDock||hudVisibility.chat===false||chatRuntime.busy)return;
  const now=Date.now();if(!force&&now-chatRuntime.lastPollAt<CHAT_POLL_MS)return;
  if(chatRuntime.channel==='private'&&!chatRuntime.pvTarget){chatRuntime.messages=[];renderChatMessages();return;}
  chatRuntime.busy=true;chatRuntime.lastPollAt=now;
  try{
    const rows=await getChatHistoryOnline({channel:chatRuntime.channel,recipientCallsign:chatRuntime.pvTarget,limit:60});
    const sig=chatMessageSignature(rows);if(force||sig!==chatRuntime.lastSignature){chatRuntime.messages=rows;chatRuntime.lastSignature=sig;renderChatMessages();}
    if(ui.chatStatus)ui.chatStatus.textContent='ONLINE';
  }catch(err){if(ui.chatStatus)ui.chatStatus.textContent='ERRO';if(force)showToast(err.message||'Falha ao atualizar chat');}
  finally{chatRuntime.busy=false;}
}
function switchChatChannel(channel){
  if(!['global','clan','private'].includes(channel))return;chatRuntime.channel=channel;chatRuntime.lastSignature='';chatRuntime.messages=[];saveChatPrefs();renderChatTabs();renderChatMessages();refreshChatHistory(true);
  if(channel==='private'&&!chatRuntime.pvTarget)setTimeout(()=>ui.chatPrivateCallsign?.focus(),0);
}
function openPrivateChatTarget(){
  const value=String(ui.chatPrivateCallsign?.value||'').trim().replace(/\s+/g,' ').slice(0,24);chatRuntime.pvTarget=value;chatRuntime.lastSignature='';chatRuntime.messages=[];saveChatPrefs();renderChatTabs();renderChatMessages();if(value)refreshChatHistory(true);
}
async function sendChatNow(){
  if(!authenticated||chatRuntime.busy)return;const body=String(ui.chatInput?.value||'').trim();if(!body)return;
  if(chatRuntime.channel==='private'&&!chatRuntime.pvTarget){showToast('Informe o callsign do piloto para enviar PV');ui.chatPrivateCallsign?.focus();return;}
  chatRuntime.busy=true;if(ui.chatSend)ui.chatSend.disabled=true;
  try{await sendChatMessageOnline({channel:chatRuntime.channel,body,recipientCallsign:chatRuntime.pvTarget});if(ui.chatInput)ui.chatInput.value='';chatRuntime.lastSignature='';}
  catch(err){showToast(err.message||'Não foi possível enviar a mensagem');}
  finally{chatRuntime.busy=false;if(ui.chatSend)ui.chatSend.disabled=false;refreshChatHistory(true);}
}

function applyTopbarDockState(){
  if(!ui.topbar)return;
  ui.topbar.classList.toggle('dock-hidden',!state.topbarDockExpanded);
  if(ui.topbarDockToggle){
    ui.topbarDockToggle.textContent=state.topbarDockExpanded?'▲':'▼';
    ui.topbarDockToggle.setAttribute('aria-label',state.topbarDockExpanded?'Esconder barra superior':'Mostrar barra superior');
    ui.topbarDockToggle.title=state.topbarDockExpanded?'Esconder menu superior':'Mostrar menu superior';
  }
  if(!state.topbarDockExpanded)document.querySelectorAll('.menu-group.open').forEach(x=>x.classList.remove('open'));
  requestAnimationFrame(layoutHudPanels);
}
function loadTopbarDockState(){try{const raw=localStorage.getItem('stellar_topbar_dock_expanded');if(raw!==null)state.topbarDockExpanded=raw==='1';}catch{}applyTopbarDockState();}
function toggleTopbarDock(){state.topbarDockExpanded=!state.topbarDockExpanded;try{localStorage.setItem('stellar_topbar_dock_expanded',state.topbarDockExpanded?'1':'0');}catch{}applyTopbarDockState();}

function applyMinimapUiState(){ if(!ui.minimapPanel) return; ui.minimapPanel.classList.toggle('collapsed', !state.minimapUiExpanded); if(ui.minimapToggle) ui.minimapToggle.textContent = state.minimapUiExpanded ? '▾' : '▸'; requestAnimationFrame(layoutHudPanels); }
function loadMinimapUiState(){ try{ const raw=localStorage.getItem('stellar_minimap_ui_expanded'); if(raw!==null) state.minimapUiExpanded = raw==='1'; }catch{} applyMinimapUiState(); }
function toggleMinimapUi(){ state.minimapUiExpanded=!state.minimapUiExpanded; try{ localStorage.setItem('stellar_minimap_ui_expanded', state.minimapUiExpanded?'1':'0'); }catch{} applyMinimapUiState(); syncHudButton(); }
function applyTopMetaUiState(){ if(!ui.topbar) return; ui.topbar.classList.toggle('meta-collapsed', !state.topMetaExpanded); }
function loadTopMetaUiState(){ try{ const raw=localStorage.getItem('stellar_top_meta_expanded'); if(raw!==null) state.topMetaExpanded = raw==='1'; }catch{} applyTopMetaUiState(); }
function toggleTopMetaUi(){ state.topMetaExpanded=!state.topMetaExpanded; try{ localStorage.setItem('stellar_top_meta_expanded', state.topMetaExpanded?'1':'0'); }catch{} applyTopMetaUiState(); syncHudButton(); }
function setHudState(expanded){
  state.ammoUiExpanded = expanded; state.statsUiExpanded = expanded; state.playerUiExpanded = expanded; state.minimapUiExpanded = expanded; state.chatUiExpanded = expanded; state.topMetaExpanded = expanded;
  try{
    localStorage.setItem('stellar_ammo_ui_expanded', expanded?'1':'0');
    localStorage.setItem('stellar_stats_ui_expanded', expanded?'1':'0');
    localStorage.setItem('stellar_player_ui_expanded', expanded?'1':'0');
    localStorage.setItem('stellar_minimap_ui_expanded', expanded?'1':'0');
    localStorage.setItem(CHAT_STATE_KEY,JSON.stringify({channel:chatRuntime.channel,pvTarget:chatRuntime.pvTarget,expanded}));
    localStorage.setItem('stellar_top_meta_expanded', expanded?'1':'0');
  }catch{}
  applyAmmoUiState(); applyStatsUiState(); applyPlayerUiState(); applyMinimapUiState(); applyChatUiState(); applyTopMetaUiState(); syncHudButton();
}
function toggleHudUi(){
  const anyExpanded = state.ammoUiExpanded || state.statsUiExpanded || state.playerUiExpanded || state.minimapUiExpanded || state.chatUiExpanded || state.topMetaExpanded;
  setHudState(!anyExpanded ? true : false);
}
function syncHudButton(){
  if(!ui.hudToggle) return;
  const allCollapsed = !state.ammoUiExpanded && !state.statsUiExpanded && !state.playerUiExpanded && !state.minimapUiExpanded && !state.chatUiExpanded && !state.topMetaExpanded;
  ui.hudToggle.textContent = allCollapsed ? 'HUD +' : 'HUD';
  ui.hudToggle.classList.toggle('active-hud', !allCollapsed);
}

const HUD_VISIBILITY_KEY='stellar_hud_visibility_v2';
const HUD_VISIBILITY_DEFAULT={player:true,ship:true,pet:true,missions:true,activity:true,chat:true,minimap:true,weapons:true,gate:true};
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
  ui.chatDock?.classList.toggle('hud-user-hidden',!hudVisibility.chat);
  ui.minimapPanel?.classList.toggle('hud-user-hidden',!hudVisibility.minimap);
  ui.weaponBar?.classList.toggle('hud-user-hidden',!hudVisibility.weapons);
  ui.bottomHudDock?.classList.toggle('chat-disabled',!hudVisibility.chat);
  ui.bottomHudDock?.classList.toggle('minimap-disabled',!hudVisibility.minimap);
  ui.bottomHudDock?.classList.toggle('weapons-disabled',!hudVisibility.weapons);
  ui.gateHud?.classList.toggle('hud-user-disabled',!hudVisibility.gate);
  requestAnimationFrame(layoutHudPanels);
}
function setHudVisibility(key,value){if(!(key in HUD_VISIBILITY_DEFAULT))return;hudVisibility[key]=!!value;saveHudVisibility();applyHudVisibility();renderSettings();updatePetFloat();renderGateHud();layoutHudPanels();}
function applyAutoQualityResolution(next,announce=false){
  if(!QUALITY_PROFILES[next]||autoQualityResolved===next)return;
  autoQualityResolved=next;
  document.body.dataset.quality=resolvedQualityMode();
  trimAssetCache();resize();renderSettings();
  if(announce)showToast(`AUTO ajustou para ${qualityProfile().label}`);
}
function applyQualityMode(mode,persist=true){
  if(mode!=='auto'&&!QUALITY_PROFILES[mode])mode='auto';qualityMode=mode;
  if(mode==='auto')autoQualityResolved=initialAutoQuality();
  if(persist){try{localStorage.setItem(QUALITY_STORAGE_KEY,mode);}catch{}}
  document.body.dataset.quality=resolvedQualityMode();
  document.body.dataset.device=DEVICE_CAPS.mobile?'mobile':'desktop';
  // Trocar qualidade limpa apenas cenário/UI não essencial. Sprites de entidades ficam intactos.
  for(const path of [...ASSET_IMAGES.keys()])if(!entityAssetPath(path)&&!qualityShouldPreload(path)&&!coreAssetPath(path)){ASSET_IMAGES.delete(path);ASSET_TOUCH.delete(path);}
  preloadAssets();if(progress)preloadActiveGameplayAssets();resize();renderSettings();
  showToast(mode==='auto'?`Modo AUTO • ${qualityProfile().label}`:`Qualidade ${qualityProfile().label} ativada`);
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

// ===================== V17.9.3 — GRUPO DE BATALHA =====================
const battleGroupRuntime={state:null,busy:false,lastAt:0,searchQuery:'',searchResults:[],searchBusy:false,searchTimer:null};
function battleGroupState(){return battleGroupRuntime.state||{group:null,members:[],invites:[],my_user_id:String(getUser()?.id||'')};}
function battleGroupMemberIds(){return new Set((battleGroupState().members||[]).map(x=>String(x.user_id||'')));}
function isBattleGroupMember(userId){return battleGroupMemberIds().has(String(userId||''));}
function battleGroupMyRole(){const me=String(getUser()?.id||'');return (battleGroupState().members||[]).find(x=>String(x.user_id)===me)?.role||null;}
function battleGroupRally(){const g=battleGroupState().group;if(!g||!g.rally_map_id||!Number.isFinite(Number(g.rally_x))||!Number.isFinite(Number(g.rally_y)))return null;return {mapId:g.rally_map_id,territoryFaction:g.rally_territory_faction||null,x:Number(g.rally_x),y:Number(g.rally_y),at:g.rally_at};}
function updateBattleGroupBadge(){if(!ui.battleGroupTopStatus)return;const st=battleGroupState(),count=st.group?(st.members||[]).length:0,invites=(st.invites||[]).length;ui.battleGroupTopStatus.textContent=st.group?`${count}/5`:invites?`${invites} convite${invites>1?'s':''}`:'0/5';ui.battleGroupBtn?.classList.toggle('gold',!!st.group);}
async function refreshBattleGroup(force=false){if(!authenticated||battleGroupRuntime.busy)return battleGroupRuntime.state;if(!force&&battleGroupRuntime.state&&Date.now()-battleGroupRuntime.lastAt<5000){updateBattleGroupBadge();return battleGroupRuntime.state;}battleGroupRuntime.busy=true;try{battleGroupRuntime.state=await getBattleGroupOnline();battleGroupRuntime.lastAt=Date.now();updateBattleGroupBadge();if(ui.battleGroupModal&&!ui.battleGroupModal.classList.contains('hidden'))renderBattleGroup();return battleGroupRuntime.state;}catch(e){console.warn('battle group',e);return battleGroupRuntime.state;}finally{battleGroupRuntime.busy=false;}}
function battleGroupSearchMarkup(){
  const q=String(battleGroupRuntime.searchQuery||'').trim();
  const rows=Array.isArray(battleGroupRuntime.searchResults)?battleGroupRuntime.searchResults:[];
  if(q.length<2)return '<div class="battle-group-search-hint">Digite pelo menos 2 letras para buscar pilotos em todo o universo.</div>';
  if(battleGroupRuntime.searchBusy)return '<div class="battle-group-search-hint">BUSCANDO PILOTOS...</div>';
  if(!rows.length)return '<div class="battle-group-search-hint">Nenhum piloto encontrado com esse callsign.</div>';
  return rows.map(r=>{const online=!!r.online;const map=online&&r.map_id?displayMapLabel(r.map_id,r.territory_faction||null):'';const faction=FACTIONS[r.faction]?.name||String(r.faction||'SEM FACÇÃO').toUpperCase();return `<article class="battle-group-search-row${online?' online':''}"><div class="battle-group-search-main"><i></i><div><b>${escHtml(r.callsign||'Pilot')}</b><small>${escHtml(faction)} • ${online?`${escHtml(map||'MAPA DESCONHECIDO')} • ONLINE`:'OFFLINE'}</small></div></div>${r.in_group?'<button class="ghost-btn" disabled>EM GRUPO</button>':`<button class="small-btn gold" data-group-invite-user="${escHtml(r.user_id)}" data-group-invite-callsign="${escHtml(r.callsign||'Pilot')}">CONVIDAR</button>`}</article>`;}).join('');
}
function renderBattleGroupSearchResults(){const box=document.getElementById('battleGroupSearchResults');if(box)box.innerHTML=battleGroupSearchMarkup();}
async function runBattleGroupSearch(query){
  const q=String(query||'').trim();battleGroupRuntime.searchQuery=q;
  if(q.length<2){battleGroupRuntime.searchResults=[];battleGroupRuntime.searchBusy=false;renderBattleGroupSearchResults();return;}
  battleGroupRuntime.searchBusy=true;renderBattleGroupSearchResults();
  try{const out=await searchBattleGroupPlayersOnline(q);if(String(battleGroupRuntime.searchQuery||'').trim()!==q)return;battleGroupRuntime.searchResults=Array.isArray(out?.players)?out.players:[];}
  catch(e){if(String(battleGroupRuntime.searchQuery||'').trim()===q){battleGroupRuntime.searchResults=[];showToast(String(e?.message||e));}}
  finally{if(String(battleGroupRuntime.searchQuery||'').trim()===q){battleGroupRuntime.searchBusy=false;renderBattleGroupSearchResults();}}
}
function scheduleBattleGroupSearch(query){clearTimeout(battleGroupRuntime.searchTimer);battleGroupRuntime.searchQuery=String(query||'').trim();renderBattleGroupSearchResults();battleGroupRuntime.searchTimer=setTimeout(()=>runBattleGroupSearch(battleGroupRuntime.searchQuery),240);}
function renderBattleGroup(){if(!ui.battleGroupContent)return;const st=battleGroupState(),group=st.group,members=st.members||[],invites=st.invites||[],me=String(st.my_user_id||getUser()?.id||''),role=battleGroupMyRole(),leader=role==='leader';let html='';if(invites.length){html+=`<section class="battle-group-invites"><div class="section-kicker">CONVITES RECEBIDOS</div>${invites.map(i=>`<div class="battle-group-invite"><div><b>${escHtml(i.inviter_callsign||'Piloto')}</b><small>expira ${adminDate(i.expires_at)}</small></div><div><button class="small-btn gold" data-group-accept="${escHtml(i.id)}">ACEITAR</button><button class="ghost-btn" data-group-decline="${escHtml(i.id)}">RECUSAR</button></div></div>`).join('')}</section>`;}if(!group){html+=`<section class="battle-group-empty"><div class="battle-group-empty-icon">◇</div><h3>SEM GRUPO ATIVO</h3><p>Crie um grupo para coordenar até 5 pilotos de qualquer facção. NPCs marcados pelo grupo dividem CR/STL/XP apenas entre membros ativos no mesmo setor; a box continua exclusiva do primeiro atacante.</p><button class="primary-btn" data-group-create>CRIAR GRUPO DE BATALHA</button></section>`;}else{const rally=battleGroupRally();html+=`<section class="battle-group-summary"><div><div class="eyebrow">GRUPO ATIVO</div><h3>${members.length}/5 PILOTOS</h3><small>${leader?'Você é o líder tático.':'Líder: '+escHtml(members.find(x=>x.role==='leader')?.callsign||'Piloto')}</small></div><div class="battle-group-summary-actions">${leader?'<button class="small-btn gold" data-group-rally>MARCAR RALLY AQUI</button>':''}<button class="danger-btn" data-group-leave>SAIR</button></div></section>`;if(rally)html+=`<div class="battle-group-rally"><b>RALLY</b><span>${escHtml(displayMapLabel(rally.mapId))} • ${Math.round(rally.x)} / ${Math.round(rally.y)}${rally.mapId===progress?.mapId?' • NO SEU MAPA':''}</span></div>`;html+=`<div class="battle-group-members">${members.map(m=>{const online=m.presence_updated_at&&Date.now()-Date.parse(m.presence_updated_at)<15000;const isMe=String(m.user_id)===me;return `<article class="battle-group-member${online?' online':''}"><div class="battle-group-member-main"><i></i><div><b>${escHtml(m.callsign||'Pilot')} ${m.role==='leader'?'<em>LÍDER</em>':''}${isMe?'<em>VOCÊ</em>':''}</b><small>${m.clan_tag?`[${escHtml(m.clan_tag)}] • `:''}${escHtml(FACTIONS[m.faction]?.name||String(m.faction||'SEM FACÇÃO').toUpperCase())} • ${online?`${escHtml(displayMapLabel(m.map_id||'',m.territory_faction||null))} • ONLINE`:'OFFLINE'}</small></div></div>${leader&&!isMe?`<button class="ghost-btn" data-group-kick="${escHtml(m.user_id)}">REMOVER</button>`:''}</article>`;}).join('')}</div>`;if(leader&&members.length<5)html+=`<section class="battle-group-global-search"><div class="battle-group-search-head"><div><b>BUSCAR PILOTO</b><small>Busca global por callsign • qualquer mapa • qualquer facção • online ou offline</small></div></div><div class="battle-group-invite-form"><input id="battleGroupSearchInput" maxlength="24" value="${escHtml(battleGroupRuntime.searchQuery||'')}" placeholder="DIGITE O CALLSIGN" autocomplete="off"></div><div id="battleGroupSearchResults" class="battle-group-search-results">${battleGroupSearchMarkup()}</div></section>`;}ui.battleGroupContent.innerHTML=html;}
async function openBattleGroup(){closeNavigationModals(ui.battleGroupModal);ui.battleGroupModal?.classList.remove('hidden');await refreshBattleGroup(true);renderBattleGroup();}
async function battleGroupAction(action,arg=null){if(battleGroupRuntime.busy)return;battleGroupRuntime.busy=true;try{let result=null;if(action==='create')result=await createBattleGroupOnline();else if(action==='invite'){const callsign=String(arg?.callsign||'').trim();if(!callsign)throw new Error('Selecione um piloto na busca.');await inviteBattleGroupOnline(callsign);showToast(`Convite enviado para ${callsign}`,'system');}else if(action==='inviteUser'){const userId=String(arg?.userId||'').trim(),callsign=String(arg?.callsign||'Piloto').trim();if(!userId)throw new Error('Piloto inválido.');await inviteBattleGroupUserOnline(userId);battleGroupRuntime.searchResults=battleGroupRuntime.searchResults.map(r=>String(r.user_id)===userId?{...r,in_group:true}:r);showToast(`Convite enviado para ${callsign}`,'system');}else if(action==='accept')result=await respondBattleGroupInviteOnline(arg,true);else if(action==='decline')result=await respondBattleGroupInviteOnline(arg,false);else if(action==='leave'){if(!confirm('Sair do Grupo de Batalha?'))return;result=await leaveBattleGroupOnline();}else if(action==='kick'){if(!confirm('Remover este piloto do grupo?'))return;result=await kickBattleGroupMemberOnline(arg);}else if(action==='rally')result=await setBattleGroupRallyOnline({mapId:progress.mapId,territoryFaction:onlineTerritoryKey(),x:player.x,y:player.y});if(result?.group!==undefined)battleGroupRuntime.state=result;else battleGroupRuntime.state=await getBattleGroupOnline();battleGroupRuntime.lastAt=Date.now();updateBattleGroupBadge();renderBattleGroup();}catch(e){showToast(String(e?.message||e));}finally{battleGroupRuntime.busy=false;}}

const clanRuntime={state:null,clans:[],busy:false,lastAt:0,claimBusy:false,lastClaimAt:0};
let clanViewTab='overview';
const warfrontRuntime={state:null,clans:[],busy:false,lastAt:0,pendingBossDamage:0,lastDamageFlush:0,lastBossSync:0};
function myRankingRow(){const me=getUser()?.id;return rankingsCache.find(r=>r.id===me)||null;}
function updateRankChip(){if(!ui.rankChip)return;ui.rankChip.textContent=clanRuntime.state?.is_admin?'ADMINISTRADOR':(myRankingRow()?.rank_title||'Piloto Básico');}
function renderSettings(){
  if(!ui.configModal)return;
document.body.dataset.quality=resolvedQualityMode();
  if(ui.qualityCurrentBadge)ui.qualityCurrentBadge.textContent=qualityBadgeLabel();
  ui.qualityButtons?.querySelectorAll('[data-quality]').forEach(b=>b.classList.toggle('active',b.dataset.quality===qualityMode));
  if(ui.performanceHint){
    const bits=[DEVICE_CAPS.mobile?'MOBILE':'DESKTOP'];
    if(DEVICE_CAPS.memory)bits.push(`${DEVICE_CAPS.memory} GB RAM`);
    if(DEVICE_CAPS.cores)bits.push(`${DEVICE_CAPS.cores} THREADS`);
    if(DEVICE_CAPS.saveData)bits.push('ECONOMIA DE DADOS');
    ui.performanceHint.textContent=`${bits.join(' • ')} • perfil efetivo ${qualityProfile().label}`;
  }
  if(ui.audioEnabledToggle)ui.audioEnabledToggle.checked=audioEnabled;
  if(ui.audioVolumeRange)ui.audioVolumeRange.value=String(Math.round(audioVolume*100));
  if(ui.audioVolumeValue)ui.audioVolumeValue.textContent=`${Math.round(audioVolume*100)}%`;
  const autoCombatUnlocked=premiumAutoCombatAccess();
  if(ui.autoTargetToggle){ui.autoTargetToggle.checked=autoCombatUnlocked&&combatPrefs.autoTarget!==false;ui.autoTargetToggle.disabled=!autoCombatUnlocked;}
  if(ui.premiumAutoCombatSetting){ui.premiumAutoCombatSetting.classList.toggle('locked',!autoCombatUnlocked);ui.premiumAutoCombatSetting.classList.toggle('unlocked',autoCombatUnlocked);}
  if(ui.autoCombatAccessTag)ui.autoCombatAccessTag.textContent=autoCombatUnlocked?(premiumActive()?'PREMIUM ATIVO':'PASSE ATIVO'):'PREMIUM / PASSE MENSAL';
  if(ui.tapAttackToggle)ui.tapAttackToggle.checked=combatPrefs.tapAttack!==false;
  if(ui.combatAlertsToggle)ui.combatAlertsToggle.checked=combatPrefs.alerts!==false;
  ui.hudSettingsGrid?.querySelectorAll('[data-hud-key]').forEach(input=>input.checked=hudVisibility[input.dataset.hudKey]!==false);
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
    ui.rankingMyPatent.innerHTML=`<div class="ranking-my-head">${patentBadgeMarkup('pilot_basic','Piloto Básico')}<div class="ranking-my-name"><b>${progress?.profile?.callsign||getUser()?.callsign||'Pilot'}</b><small>Abra o ranking para sincronizar seus pontos online.</small></div></div><div class="rank-summary"><div><span>PONTOS</span><b>0</b></div><div><span>POSIÇÃO</span><b>—</b></div><div><span>NÍVEL</span><b>${fmt(progress?.profile?.level||1)}</b></div></div><div class="ranking-my-foot">Patentes competitivas liberam no LV2 e seguem a posição no ranking de pontos.</div>`;
    updateRankChip();return;
  }
  ui.rankingMyPatent.innerHTML=`<div class="ranking-my-head">${patentBadgeMarkup(row.rank_code||'pilot_basic',row.rank_title||'Piloto Básico')}<div class="ranking-my-name"><b>${row.callsign||'Pilot'}</b><small>#${fmt(row.rank_position||0)} de ${fmt(row.total_players||0)} pilotos ranqueados</small></div></div><div class="rank-summary"><div><span>PONTOS</span><b>${fmt(row.rank_points||0)}</b></div><div><span>POSIÇÃO</span><b>#${fmt(row.rank_position||0)}</b></div><div><span>NÍVEL</span><b>${fmt(row.level||1)}</b></div><div><span>ARENA</span><b>${fmt(row.arena_wins||0)}W/${fmt(row.arena_losses||0)}L</b></div><div><span>ALIENS</span><b>${fmt(row.aliens_killed||0)}</b></div><div><span>PORTAIS</span><b>${fmt(row.gg_completed||0)}</b></div></div><div class="ranking-my-foot">A partir do LV2, a patente segue sua posição por pontos no ranking — sem carência por idade da conta.</div>`;
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
  const req=status.requirements||{},mission=status.mission_progress||{},vault=Number(status.vault_credits??clanState().clan?.vault_credits??0);
  const missions=Object.entries(mission).map(([k,v])=>`<div class="clan-requirement ${v.done?'done':''}"><span>MISSÃO • ${clanMissionLabel(k)}</span><b>${fmt(v.current||0)} / ${fmt(v.target||0)}</b></div>`).join('');
  return `<div class="clan-next-level"><div class="clan-level-arrow"><b>LV ${status.level}</b><span>→</span><b>LV ${req.next_level}</b></div><div class="clan-req-grid"><div class="clan-requirement ${Number(status.member_xp)>=Number(req.xp)?'done':''}"><span>XP DO CLÃ</span><b>${fmt(status.member_xp||0)} / ${fmt(req.xp||0)}</b></div><div class="clan-requirement ${vault>=Number(req.credits||0)?'done':''}"><span>COFRE</span><b>${fmt(vault)} / ${fmt(req.credits||0)} CR</b></div>${missions}</div></div>`;
}
function clanTabsHtml(){return `<div class="clan-tabs"><button class="clan-tab-btn ${clanViewTab==='overview'?'active':''}" data-clan-tab="overview">VISÃO GERAL</button><button class="clan-tab-btn ${clanViewTab==='members'?'active':''}" data-clan-tab="members">MEMBROS</button><button class="clan-tab-btn ${clanViewTab==='vault'?'active':''}" data-clan-tab="vault">COFRE</button><button class="clan-tab-btn ${clanViewTab==='missions'?'active':''}" data-clan-tab="missions">MISSÕES</button></div>`;}
function renderClan(){
  if(!ui.clanContent)return;
  const st=clanState(),pending=Number(st.pending_credits||0);
  if(!st.clan){
    const list=(clanRuntime.clans||[]).map(c=>`<div class="clan-public-row"><div><b>[${escHtml(c.tag)}] ${escHtml(c.name)}</b><small>LV ${fmt(c.level||1)} • ${fmt(c.member_count||0)} membro(s)</small></div><span class="clan-role">ABERTO</span><button class="ghost-btn" data-clan-join="${escHtml(c.id)}">ENTRAR</button></div>`).join('')||'<div class="muted">Nenhuma aliança criada ainda.</div>';
    ui.clanContent.innerHTML=`${pending>0?`<div class="clan-panel clan-pending"><b>CRÉDITOS PENDENTES</b><div class="clan-tax-preview">Você tem <b>${fmt(pending)} CR</b> aguardando entrega.</div></div>`:''}<div class="clan-panel clan-create-box"><div class="clan-empty-title"><div class="eyebrow">FUNDE UMA ALIANÇA</div><h3>Crie seu clã ou entre em um existente</h3></div><div class="clan-create-grid"><label>NOME DO CLÃ<input id="clanCreateName" maxlength="28" placeholder="Ex.: Guardiões Orbitais"></label><label>TAG<input id="clanCreateTag" maxlength="6" placeholder="GO"></label><button class="primary-btn" id="clanCreateSubmit">CRIAR</button></div></div><div class="clan-panel"><h3>ALIANÇAS DISPONÍVEIS</h3>${list}</div>`;
    return;
  }
  const c=st.clan,members=Array.isArray(st.members)?st.members:[],txs=Array.isArray(st.transactions)?st.transactions:[],owner=st.role==='owner',status=st.level_status||{};
  const groupLeader=battleGroupMyRole()==='leader',groupIds=battleGroupMemberIds(),myUid=String(getUser()?.id||'');
  const memberHtml=members.map(m=>{const uid=String(m.user_id||m.id||''),canGroupInvite=groupLeader&&uid&&uid!==myUid&&!groupIds.has(uid);return `<div class="clan-member"><div><b>${escHtml(m.callsign||'Pilot')}</b><small>LV ${fmt(m.level||1)} • XP ${fmt(m.xp||0)} • CR ${fmt(m.credits||0)}</small></div><span class="clan-role">${m.role==='owner'?'LÍDER':'MEMBRO'}</span>${canGroupInvite?`<button class="ghost-btn" data-clan-group-invite="${escHtml(m.callsign||'')}">GRUPO</button>`:''}</div>`;}).join('')||'<div class="muted">Nenhum membro encontrado.</div>';
  const txHtml=txs.map(t=>{
    const kind=t.kind||'';let icon='•',title='',sub='',cls='clan-vault-number';
    if(kind==='daily_collection'){icon='⬆';title=`Contribuição de ${escHtml(t.actor_callsign||'Piloto')} • ${fmt(t.net_amount||0)} CR`;sub='Entrada no cofre';cls='clan-net';}
    else if(kind==='interest'){icon='↗';title=`Rendimento do cofre • +${fmt(t.net_amount||0)} CR`;sub='Rendimento';cls='clan-net';}
    else if(kind==='transfer'){icon='➜';title=`${escHtml(t.actor_callsign||'Líder')} enviou ${fmt(t.net_amount||0)} CR para ${escHtml(t.target_callsign||'Piloto')}`;sub=`Cofre -${fmt(t.gross_amount||0)} • taxa 5%: ${fmt(t.burn_amount||0)} CR`;cls='clan-burn';}
    else if(kind==='level_up'){icon='★';title=`Clã evoluiu • custo ${fmt(t.gross_amount||0)} CR`;sub='Evolução do clã';cls='clan-net';}
    else{icon='•';title=`Movimentação ${fmt(t.net_amount||0)} CR`;sub=kind;}
    return `<div class="clan-tx"><span>${icon}</span><div><b>${title}</b><small>${new Date(t.created_at).toLocaleString('pt-BR')} • ${sub}</small></div><span class="${cls}">${kind==='interest'||kind==='daily_collection'?`+${fmt(t.net_amount||0)}`:kind==='transfer'?`-${fmt(t.gross_amount||0)}`:''}</span></div>`;
  }).join('')||'<div class="muted">Ainda não há movimentações.</div>';
  const rate=Number(status.interest_rate||5).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});
  const header=`${pending>0?`<div class="clan-panel clan-pending"><b>CRÉDITOS RECEBIDOS</b><div class="clan-tax-preview"><b>${fmt(pending)} CR</b> serão adicionados à sua conta.</div></div>`:''}<div class="clan-identity-bar"><div><span class="clan-tag-big">[${escHtml(c.tag)}]</span><b>${escHtml(c.name)}</b><small>${owner?'Líder':'Membro'} • Nível ${fmt(c.level||1)}/10</small></div><div class="clan-identity-mini"><span>${fmt(members.length)} membros</span><span>${fmt(c.vault_credits||0)} CR</span></div></div>${clanTabsHtml()}`;
  let body='';
  if(clanViewTab==='overview'){
    body=`<div class="clan-head-grid clan-overview-grid"><div class="clan-stat"><span>NÍVEL</span><b>${fmt(c.level||1)} / 10</b></div><div class="clan-stat"><span>XP DO CLÃ</span><b>${fmt(status.member_xp||0)}</b></div><div class="clan-stat"><span>COFRE</span><b class="clan-vault-number">${fmt(c.vault_credits||0)} CR</b></div><div class="clan-stat"><span>RENDIMENTO</span><b>${rate}% / DIA</b></div></div><section class="clan-panel"><h3>PRÓXIMO NÍVEL</h3>${clanRequirementHtml(status)}</section><div class="clan-panel"><button class="ghost-btn" id="clanLeaveBtn">${owner&&members.length===1?'ENCERRAR CLÃ':'SAIR DO CLÃ'}</button></div>`;
  }else if(clanViewTab==='members'){
    body=`<section class="clan-panel"><h3>MEMBROS • ${members.length}</h3>${memberHtml}</section>`;
  }else if(clanViewTab==='vault'){
    body=`<div class="clan-head-grid clan-vault-grid"><div class="clan-stat"><span>SALDO</span><b class="clan-vault-number">${fmt(c.vault_credits||0)} CR</b></div><div class="clan-stat"><span>RENDIMENTO</span><b>${rate}% / DIA</b></div><div class="clan-stat"><span>CONTRIBUIÇÕES</span><b>${fmt(c.total_collected||0)}</b></div><div class="clan-stat"><span>TAXAS</span><b class="clan-burn">${fmt(c.total_transfer_fees||0)}</b></div></div>${owner?`<section class="clan-panel"><h3>REPASSE DO LÍDER</h3><div class="clan-action-row"><label>CALLSIGN DO PILOTO<input id="clanTransferCallsign" maxlength="24" placeholder="Nome exato do jogador"></label><label>VALOR QUE SAI DO COFRE<input id="clanTransferAmount" type="number" min="1" step="1" placeholder="100000000"></label><button class="primary-btn" id="clanTransferBtn">ENVIAR</button></div><div class="clan-tax-preview" id="clanTransferPreview">Taxa de transferência: <b>5%</b>.</div></section>`:''}<section class="clan-panel"><h3>MOVIMENTAÇÕES</h3>${txHtml}</section>`;
  }else{
    body=`<section class="clan-panel"><h3>EVOLUÇÃO E MISSÃO DO CLÃ</h3>${clanRequirementHtml(status)}</section>`;
  }
  ui.clanContent.innerHTML=header+body;
}
async function openClan(){if(!featureUnlocked('clan')){showFeatureLock('clan','Clã');return;}clanViewTab='overview';closeNavigationModals(ui.clanModal);ui.clanModal?.classList.remove('hidden');if(ui.clanContent)ui.clanContent.innerHTML='<div class="muted">Sincronizando aliança...</div>';await syncClanCreditGrants(true);await refreshClanState(true);}
async function createClanNow(){const name=$('#clanCreateName')?.value||'',tag=$('#clanCreateTag')?.value||'';try{await createClanOnline({name,tag});showToast(`Clã [${tag.toUpperCase()}] criado`);await refreshClanState(true);syncOnlineWorld();}catch(e){showToast(e.message);}}
async function joinClanNow(id){try{await joinClanOnline(id);showToast('Você entrou na aliança');await refreshClanState(true);syncOnlineWorld();}catch(e){showToast(e.message);}}
async function leaveClanNow(){try{await leaveClanOnline();showToast('Aliança atualizada');await refreshClanState(true);syncOnlineWorld();}catch(e){showToast(e.message);}}
async function transferClanNow(){const callsign=$('#clanTransferCallsign')?.value||'',amount=Math.trunc(Number($('#clanTransferAmount')?.value)||0);if(!callsign||amount<=0){showToast('Informe callsign e valor');return;}try{const r=await transferClanCreditsOnline({callsign,amount});showToast(`${fmt(r.net_amount||0)} CR recebidos por ${r.target_callsign} • juros ${fmt(r.fee||0)} CR`);pushActivity(`CLÃ • Cofre -${fmt(r.gross_amount||0)} • ${r.target_callsign} +${fmt(r.net_amount||0)} • juros ${fmt(r.fee||0)}`,'reward');await refreshClanState(true);}catch(e){showToast(e.message);}}

// ===================== V13.1 WARFRONT =====================
function worldBossState(){return warfrontRuntime.state?.world_boss||null;}
function currentClanWar(){return warfrontRuntime.state?.war||null;}
function updateBattleGroupStatus(){if(!ui.battleTopStatus)return;const wb=worldBossState(),war=currentClanWar();if(war)ui.battleTopStatus.textContent='WAR';else if(wb&&Number(wb.hp)>0)ui.battleTopStatus.textContent='BOSS';else if(wb&&Number(wb.hp)<=0)ui.battleTopStatus.textContent='LOOT';else ui.battleTopStatus.textContent=`${arenaStateLeft()}/${ARENA_DAILY_LIMIT}`;}
function updateWarfrontBadge(){if(ui.warfrontTopStatus){const wb=worldBossState(),war=currentClanWar(),sc=sectorControlState();if(war)ui.warfrontTopStatus.textContent='WAR';else if(wb&&Number(wb.hp)>0)ui.warfrontTopStatus.textContent='BOSS';else if(wb&&Number(wb.hp)<=0)ui.warfrontTopStatus.textContent='LOOT';else if(sc&&state.currentMap?.battle)ui.warfrontTopStatus.textContent=`CTRL ${sectorControlScore(progress?.profile?.faction)}/3`;else ui.warfrontTopStatus.textContent='READY';}updateBattleGroupStatus();}
function warfrontBossRatio(){const wb=worldBossState();return wb?Math.max(0,Math.min(1,Number(wb.hp||0)/Math.max(1,Number(wb.max_hp)||1))):0;}
function warfrontClanName(id){const all=[...(warfrontRuntime.clans||[])];const c=all.find(x=>x.id===id);return c?`[${c.tag}] ${c.name}`:'Clã rival';}
function blueprintCardHtml(bp){normalizeWarfrontProgress();const have=Number(progress.warfront.blueprints[bp.id]||0),cores=progress.warfront.skillCores,ready=have>=bp.need&&cores>=bp.cores;return `<div class="blueprint-card ${ready?'ready':''}"><div class="blueprint-icon">${bp.icon}</div><div><b>${bp.name}</b><small>${bp.desc}</small><div class="blueprint-progress"><i style="width:${Math.min(100,have/bp.need*100)}%"></i></div><span>FRAGMENTOS ${fmt(have)}/${fmt(bp.need)} • CORES ${fmt(cores)}/${fmt(bp.cores)}</span></div><button class="small-btn" data-blueprint-craft="${bp.id}" ${ready?'':'disabled'}>CONSTRUIR</button></div>`;}
function abilityMasteryHtml(){normalizeWarfrontProgress();const cls=abilityClassId(),def=shipAbilityDef(),lv=abilityMasteryLevel(),cost=lv>=5?0:[2,4,7,11][lv-1];return `<div class="mastery-card"><div class="mastery-title"><span>${def.icon}</span><div><b>${def.name} • MASTERY ${lv}/5</b><small>+${Math.round((abilityPowerMultiplier()-1)*100)}% potência • -${Math.round((1-abilityCooldownMultiplier())*100)}% recarga</small></div></div><div class="mastery-pips">${[1,2,3,4,5].map(n=>`<i class="${n<=lv?'on':''}"></i>`).join('')}</div>${lv<5?`<button class="primary-btn" data-mastery-upgrade>EVOLUIR • ${cost} CORE${cost>1?'S':''}</button>`:'<div class="mastery-max">MASTERY MÁXIMA</div>'}</div>`;}
function renderWarfront(){if(!ui.warfrontContent)return;normalizeWarfrontProgress();const st=warfrontRuntime.state,wb=worldBossState(),war=currentClanWar(),myClan=clanState().clan,myRole=clanState().role;const bp=Object.values(WARFRONT_BLUEPRINTS).map(blueprintCardHtml).join('');let bossHtml='<div class="muted">World Boss indisponível no momento.</div>';if(wb){const hp=Math.max(0,Number(wb.hp)||0),max=Math.max(1,Number(wb.max_hp)||1),dead=hp<=0,claimed=!!wb.claimed;bossHtml=`<div class="world-boss-card ${dead?'dead':''}"><div class="world-boss-head"><div><span class="threat-chip">AMEAÇA GLOBAL</span><h3>${escHtml(wb.name||'NEMESIS PRIME')}</h3><small>${dead?'DERROTADO • recompensa disponível':`Encerra ${new Date(wb.ends_at).toLocaleString('pt-BR')}`}</small></div><b>${dead?'ELIMINADO':`${(hp/max*100).toFixed(2)}%`}</b></div><div class="world-boss-track"><i style="width:${Math.round(hp/max*100)}%"></i></div><div class="world-boss-stats"><span>HP <b>${fmt(hp)} / ${fmt(max)}</b></span><span>SEU DANO <b>${fmt(wb.my_damage||0)}</b></span><span>RANK <b>#${fmt(wb.my_rank||0)||'—'}</b></span></div><div class="warfront-actions">${dead?`<button class="primary-btn" data-worldboss-claim ${claimed?'disabled':''}>${claimed?'RECOMPENSA RESGATADA':'RESGATAR RECOMPENSA'}</button>`:`<button class="danger-btn" data-worldboss-engage>ENGAJAR EM MAPA BATTLE</button>`}</div></div>`;}
let warHtml='';if(!myClan)warHtml='<div class="war-empty">Entre em um clã para participar das Guerras de Clãs.</div>';else if(war){const mine=war.my_side==='attacker'?Number(war.attacker_score||0):Number(war.defender_score||0),theirs=war.my_side==='attacker'?Number(war.defender_score||0):Number(war.attacker_score||0),opp=war.my_side==='attacker'?war.defender:war.attacker;warHtml=`<div class="clan-war-live"><div class="war-vs"><div><small>SEU CLÃ</small><b>[${escHtml(myClan.tag)}]</b><strong>${fmt(mine)}</strong></div><span>VS</span><div><small>RIVAL</small><b>[${escHtml(opp?.tag||'?')}]</b><strong>${fmt(theirs)}</strong></div></div><div class="war-score-track"><i style="width:${Math.min(100,(mine/Math.max(1,mine+theirs))*100)}%"></i></div><small>Termina ${new Date(war.ends_at).toLocaleString('pt-BR')} • BOSS +10 pts • PvP causa pontos por dano • World Boss também pontua.</small></div>`;}else if(myRole==='owner'){const opts=(warfrontRuntime.clans||[]).filter(c=>c.id!==myClan.id).map(c=>`<option value="${c.id}">[${escHtml(c.tag)}] ${escHtml(c.name)} • LV ${fmt(c.level||1)}</option>`).join('');warHtml=`<div class="war-declare clan-war-declare-card"><div class="war-declare-head"><div><span class="war-declare-kicker">PROTOCOLO DE CONFLITO</span><b>DECLARAR GUERRA</b><small>Escolha um clã rival e inicie uma guerra de 12 horas.</small></div><span class="war-declare-duration">12H</span></div><div class="war-declare-controls"><label class="war-target-field"><span>CLÃ RIVAL</span><div class="war-select-wrap"><select id="warTargetClan"><option value="">Selecionar clã rival...</option>${opts}</select></div></label><button class="danger-btn war-declare-btn" data-war-declare disabled><span class="war-declare-icon">⚔</span><span>DECLARAR GUERRA</span></button></div><div class="war-declare-note"><span>⚠</span><p><b>Somente o líder pode declarar.</b> A guerra permanece ativa por 12 horas após a confirmação.</p></div></div>`;}else warHtml='<div class="war-empty">Somente o líder pode declarar uma guerra.</div>';
ui.warfrontContent.innerHTML=`${sectorControlPanelHtml()}<div class="warfront-grid"><section class="warfront-panel worldboss-panel"><div class="section-kicker">WORLD BOSS</div>${bossHtml}</section><section class="warfront-panel"><div class="section-kicker">GUERRA DE CLÃS</div>${warHtml}</section></div><section class="warfront-panel"><div class="section-kicker">MASTERY DA HABILIDADE</div>${abilityMasteryHtml()}</section><section class="warfront-panel"><div class="section-kicker">BLUEPRINT FORGE • ${fmt(progress.warfront.skillCores)} CORES</div><div class="blueprint-grid">${bp}</div><small class="warfront-hint">BOSS comuns têm chance de dropar fragmentos. World Boss garante fragmentos + cores conforme sua contribuição.</small></section>`;updateWarfrontBadge();}
async function refreshWarfrontState(force=false){if(!authenticated||warfrontRuntime.busy)return warfrontRuntime.state;if(!force&&warfrontRuntime.state&&Date.now()-warfrontRuntime.lastAt<5000){renderWarfront();return warfrontRuntime.state;}warfrontRuntime.busy=true;try{warfrontRuntime.clans=await listClansOnline().catch(()=>warfrontRuntime.clans||[]);warfrontRuntime.state=await loadWarfrontStateOnline();warfrontRuntime.lastAt=Date.now();updateWarfrontBadge();renderWarfront();syncWorldBossEnemyFromState();if(sharedUniverseMap()&&state.currentMap?.battle&&worldBossOpen()&&!activeWorldBossEnemy())spawnWorldBossEncounter(true);return warfrontRuntime.state;}catch(e){console.warn('warfront',e);if(ui.warfrontContent&&!ui.warfrontModal?.classList.contains('hidden'))ui.warfrontContent.innerHTML=`<div class="warfront-error"><b>WARFRONT INDISPONÍVEL</b><span>${escHtml(e.message)}</span><small>Verifique sua conexão e tente novamente.</small></div>`;}finally{warfrontRuntime.busy=false;}}
async function openWarfront(){closeNavigationModals(ui.warfrontModal);ui.warfrontModal?.classList.remove('hidden');if(ui.warfrontContent)ui.warfrontContent.innerHTML='<div class="muted">Sincronizando frente de guerra...</div>';await refreshClanState(true);await refreshWarfrontState(true);}
async function declareWarNow(){const target=$('#warTargetClan')?.value;if(!target){showToast('Escolha um clã rival');return;}try{await declareClanWarOnline(target);showToast('GUERRA DECLARADA!','reward');pushActivity('WARFRONT • Guerra de Clãs iniciada','reward');await refreshWarfrontState(true);}catch(e){showToast(e.message);}}
function activeWorldBossEnemy(){return state.enemies.find(e=>e.worldBoss&&e.hp>0)||null;}
function spawnWorldBossEncounter(auto=false){const wb=worldBossState();if(!wb||Number(wb.hp)<=0){if(!auto)showToast('World Boss já foi derrotado');return;}if(!state.currentMap?.battle){if(!auto)showToast('Entre em um mapa BATTLE (4-1 / 4-2 / 4-3) para enfrentar o World Boss');return;}let e=activeWorldBossEnemy();if(e){if(!auto){state.target=e;showToast('NEMESIS PRIME já está no setor');}return;}const base=makeEnemy('bossSibelon');base.id=`worldboss_${wb.id}`;base.worldBoss=true;base.forceChase=!sharedUniverseMap();base.name=wb.name||'NEMESIS PRIME';base.maxHp=Math.max(1,Number(wb.max_hp)||250000000);base.hp=Math.max(1,Number(wb.hp)||base.maxHp);base.maxShield=0;base.shield=0;base.damage=Math.max(base.damage*2.25,22000);base.speed=sharedUniverseMap()?0:Math.max(base.speed,145);base.aggroRange=1800;base.attackRange=520;base.size=Math.max(base.size,78);if(sharedUniverseMap()){base.x=Math.round(state.currentMap.world.w*.62);base.y=Math.round(state.currentMap.world.h*.46);base.sharedStaticBoss=true;}else{base.x=Math.min(state.currentMap.world.w-350,Math.max(350,player.x+700));base.y=Math.min(state.currentMap.world.h-350,Math.max(350,player.y+250));}state.enemies.push(base);if(!auto)selectCombatTarget(base,{silent:true});playSfx('warning');if(!auto)showToast('NEMESIS PRIME ENTROU NO SETOR!','reward');pushActivity('WORLD BOSS • NEMESIS PRIME detectado','combat');}
function syncWorldBossEnemyFromState(){const wb=worldBossState(),e=activeWorldBossEnemy();if(!wb||!e)return;if(Number(wb.hp)<=0){e.hp=0;spawnExplosionFx(e.x,e.y,'#ff416b',true);if(state.target?.id===e.id)state.target=null;return;}e.maxHp=Math.max(1,Number(wb.max_hp)||e.maxHp);e.hp=Math.max(1,Number(wb.hp)||e.hp);}
async function flushWorldBossDamage(force=false){if(!authenticated||warfrontRuntime.busyDamage)return;const dmg=Math.floor(warfrontRuntime.pendingBossDamage||0);if(dmg<=0)return;if(!force&&Date.now()-warfrontRuntime.lastDamageFlush<900)return;warfrontRuntime.busyDamage=true;warfrontRuntime.pendingBossDamage=0;warfrontRuntime.lastDamageFlush=Date.now();try{const r=await hitWorldBossOnline(dmg);warfrontRuntime.state ||= {};warfrontRuntime.state.world_boss={...(warfrontRuntime.state.world_boss||{}),...r};updateWarfrontBadge();syncWorldBossEnemyFromState();if(r?.defeated){showToast('WORLD BOSS DERROTADO! RESGATE SEU LOOT!','reward');pushActivity('WORLD BOSS • NEMESIS PRIME eliminado!','reward');renderWarfront();}}catch(e){warfrontRuntime.pendingBossDamage+=dmg;console.warn('world boss damage',e);}finally{warfrontRuntime.busyDamage=false;}}
async function claimWorldBossNow(){try{const r=await claimWorldBossRewardOnline();if(r?.already_claimed){showToast('Recompensa já resgatada');return;}normalizeWarfrontProgress();progress.profile.credits+=Number(r.credits)||0;progress.profile.uridium+=Number(r.uridium)||0;telemetryEconomy('event',{cr:Number(r.credits)||0,stl:Number(r.uridium)||0});progress.warfront.skillCores+=Number(r.cores)||0;const bp=WARFRONT_BLUEPRINTS[r.blueprint_id]?r.blueprint_id:'lf4';progress.warfront.blueprints[bp]=(progress.warfront.blueprints[bp]||0)+(Number(r.fragments)||0);progress.warfront.worldBossClaims[String(r.boss_id||'boss')]=Date.now();saveGame();await flushCloudSave(true);showToast(`WORLD BOSS • +${fmt(r.credits||0)} CR • +${fmt(r.uridium||0)} STL • +${fmt(r.fragments||0)} FRAG`,'reward');pushActivity(`WORLD BOSS LOOT • ${fmt(r.fragments||0)} ${WARFRONT_BLUEPRINTS[bp].name} • +${fmt(r.cores||0)} cores`,'reward');await refreshWarfrontState(true);}catch(e){showToast(e.message);}}
function rollRareBossLoot(enemy){if(!enemy||enemy.worldBoss||!String(enemy.type||'').startsWith('boss'))return;normalizeWarfrontProgress();const chance=enemy.gateEnemy?.22:.13;if(Math.random()>chance)return;const ids=Object.keys(WARFRONT_BLUEPRINTS),id=ids[Math.floor(Math.random()*ids.length)],frags=1+(Math.random()<.22?1:0),core=Math.random()<.18?1:0;progress.warfront.blueprints[id]+=frags;progress.warfront.skillCores+=core;progress.warfront.rareDrops++;showToast(`LOOT RARO • ${WARFRONT_BLUEPRINTS[id].name} +${frags}${core?' • +1 CORE':''}`,'reward');pushActivity(`BLUEPRINT • ${WARFRONT_BLUEPRINTS[id].name} +${frags}${core?' • SKILL CORE +1':''}`,'reward');}
function craftBlueprint(id){normalizeWarfrontProgress();const bp=WARFRONT_BLUEPRINTS[id];if(!bp)return;const have=progress.warfront.blueprints[id]||0;if(have<bp.need||progress.warfront.skillCores<bp.cores){showToast('Fragmentos ou cores insuficientes');return;}progress.warfront.blueprints[id]-=bp.need;progress.warfront.skillCores-=bp.cores;progress.inventory[bp.itemId]=(progress.inventory[bp.itemId]||0)+bp.qty;progress.warfront.crafted[id]=(progress.warfront.crafted[id]||0)+1;saveGame();renderWarfront();renderHangar();showToast(`${bp.name} CONSTRUÍDO!`,'reward');pushActivity(`FORJA • ${bp.name} criado`,'reward');}
function upgradeAbilityMastery(){normalizeWarfrontProgress();const cls=abilityClassId(),lv=abilityMasteryLevel();if(lv>=5){showToast('Mastery máxima');return;}const cost=[2,4,7,11][lv-1];if(progress.warfront.skillCores<cost){showToast(`Você precisa de ${cost} Skill Cores`);return;}progress.warfront.skillCores-=cost;progress.warfront.skillMastery[cls]=lv+1;saveGame();renderWarfront();updateAbilityHud();const name=shipAbilityDef().name;showToast(`${name} • MASTERY ${lv+1}!`,'reward');pushActivity(`MASTERY • ${name} subiu para ${lv+1}`,'reward');}
async function scoreClanWar(points,reason){if(!authenticated||!currentClanTag())return;try{const r=await recordClanWarScoreOnline(points,reason);if(r?.scored){warfrontRuntime.state ||= {};warfrontRuntime.state.war=r.war||warfrontRuntime.state.war;updateWarfrontBadge();}}catch{}}
function updateWarfrontRuntime(){if(!authenticated||!progress)return;if(warfrontRuntime.pendingBossDamage>0)flushWorldBossDamage();if(activeWorldBossEnemy()&&Date.now()-warfrontRuntime.lastBossSync>5000){warfrontRuntime.lastBossSync=Date.now();refreshWarfrontState(true).catch(()=>{});}}


// ===================== V14.0 COMBAT TARGET + GALAXY EVENT DIRECTOR =====================
const GALAXY_EVENT_DEFS=[];
const galaxyEventRuntime={forcedIndex:null,activeId:null,mapKey:null,convoy:null,nextWaveAt:0,retryAt:0,lastEnsureAt:0};
const NO_GALAXY_EVENT={id:'none',icon:'◇',name:'SEM EVENTO ATIVO',desc:'Aguardando a próxima janela configurada no Supabase.',target:1,reward:{credits:0,uridium:0,xp:0,cores:0},rules:{},start:Date.now(),end:Date.now()+60000,eventId:'v16:none'};
const GALAXY_EVENT_VARIANTS={
  invasion:{mode:'wave',progressLabel:'INVASORES',waveCount:8,minAlive:4,rewardMult:1.22},
  battle:{mode:'battle_wave',progressLabel:'ABATES BATTLE',waveCount:6,minAlive:3,rewardMult:1.22},
  prime:{mode:'boss',progressLabel:'BOSS RARO',bossName:'RIFT TYRANT',bossType:'bossSibelon',bossScale:2.2,bossRewardMult:2.4,bossSize:68,bossColor:'#ff4f9a'},
  mining:{mode:'ore',progressLabel:'RECURSOS',orePool:['Prometium','Endurium','Terbium','Promerium'],oreCount:12,oreRespawnMin:5,oreAmount:[12,26]},
  convoy:{mode:'convoy',progressLabel:'ESCOLTA',convoyHp:900000,convoySpeed:105,waveCount:3,waveRespawnMs:12000,rewardMult:1.22},
  nexus_breach:{mode:'wave',progressLabel:'FENDAS NEXUS',waveCount:8,minAlive:4,pool:['saimon','mordon','devolarium'],namePrefix:'NEXUS',color:'#ff9666',scale:1.25,rewardMult:1.36},
  eclipse_surge:{mode:'wave',progressLabel:'SURTO ECLIPSE',waveCount:7,minAlive:4,pool:['lordakia','saimon','mordon'],namePrefix:'ECLIPSE',color:'#b57cff',scale:1.2,speedMult:1.18,rewardMult:1.34},
  relic_hunt:{mode:'ore',progressLabel:'RELÍQUIAS',orePool:['Promerium','Terbium','Endurium','Promerium'],oreCount:12,oreRespawnMin:5,oreAmount:[18,34]},
  quantum_storm:{mode:'convoy',progressLabel:'ESTABILIZAÇÃO',convoyHp:1150000,convoySpeed:118,waveCount:4,waveRespawnMs:10000,pool:['saimon','mordon','devolarium'],namePrefix:'QUANTUM',color:'#62efff',scale:1.18,rewardMult:1.4},
  shadow_fleet:{mode:'wave',progressLabel:'FROTA SHADOW',waveCount:6,minAlive:3,pool:['mordon','devolarium','sibelon'],namePrefix:'SHADOW',color:'#8eb6ff',scale:1.38,rewardMult:1.48},
  aux_uprising:{mode:'wave',progressLabel:'AUX HOSTIS',waveCount:8,minAlive:4,pool:['recruitStreuner','aiderStreuner','lordakia'],namePrefix:'AUX',color:'#63eaff',scale:1.08,speedMult:1.35,rewardMult:1.30,size:20},
  titan_assault:{mode:'boss',progressLabel:'TITÃ',bossName:'TITAN EXARCH',bossType:'bossSibelon',bossScale:3.4,bossRewardMult:2.8,bossSize:76,bossColor:'#ff7c52'},
  ore_frenzy:{mode:'ore',progressLabel:'MINÉRIO',orePool:['Prometium','Endurium','Terbium','Promerium'],oreCount:16,oreRespawnMin:7,oreAmount:[24,42]}
};
function galaxyEventProfile(ev=currentGalaxyEvent()){return GALAXY_EVENT_VARIANTS[String(ev?.id||'')]||GALAXY_EVENT_VARIANTS.invasion;}
function normalizeGalaxyEvents(){if(!progress)return;progress.galaxyEvents ||= {records:{},lastSeenEvent:null};progress.galaxyEvents.records ||= {};}
function currentGalaxyEvent(){
  const shared=sharedWorldEvent();
  if(sharedUniverseMap()&&shared)return {...shared,reward:shared.reward||{credits:0,uridium:0,xp:0,cores:0},start:Number(shared.start)||Date.now(),end:Number(shared.end)||Date.now()+60000};
  return {...NO_GALAXY_EVENT,start:Date.now(),end:Date.now()+60000};
}
function galaxyEventRecord(ev=currentGalaxyEvent()){normalizeGalaxyEvents();progress.galaxyEvents.records[ev.eventId] ||= {value:0,complete:false,rewarded:false,startedAt:Date.now()};return progress.galaxyEvents.records[ev.eventId];}
function galaxyEventSecondsLeft(ev=currentGalaxyEvent()){return Math.max(0,Math.ceil((ev.end-Date.now())/1000));}
function galaxyEventTimeText(sec){const m=Math.floor(sec/60),s=Math.max(0,sec%60);return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;}
function isAdminPilot(){const name=String(progress?.profile?.callsign||'').trim().toUpperCase();return name==='FELP22'||!!clanRuntime.state?.is_admin;}
function worldBossOpen(){const wb=worldBossState();return !!wb&&Number(wb.hp)>0;}
function galaxyBattleMapsOpen(){return currentGalaxyEvent().id==='battle'||worldBossOpen()||!!state.currentMap?.battle;}
function galaxyEventEligible(ev=currentGalaxyEvent()){
  if(!progress||state.currentMap?.gate)return false;
  const mode=galaxyEventProfile(ev).mode;
  if(mode==='battle_wave')return !!state.currentMap?.battle;
  if(mode==='boss')return !!state.currentMap?.battle||Number(state.currentMap?.tier||1)>=2;
  return !state.currentMap?.battle;
}
function galaxyEventObjectiveText(ev=currentGalaxyEvent(),rec=galaxyEventRecord(ev)){
  if(rec.complete)return 'OBJETIVO CONCLUÍDO • recompensa entregue';
  const profile=galaxyEventProfile(ev),label=profile.progressLabel||'INVASORES',mode=profile.mode;
  if(mode==='convoy')return label+' '+Math.min(100,Math.round(rec.value||0))+'%';
  if(mode==='ore')return fmt(rec.value||0)+' / '+fmt(ev.target)+' '+label;
  if(mode==='battle_wave')return fmt(rec.value||0)+' / '+fmt(ev.target)+' '+label;
  if(mode==='boss')return fmt(rec.value||0)+' / 1 '+label;
  return fmt(rec.value||0)+' / '+fmt(ev.target)+' '+label;
}
function galaxyEventRewardScaled(ev){const mult=1+Math.min(1.5,Math.max(0,(progress?.profile?.level||1)-1)/36);return {credits:Math.round(ev.reward.credits*mult),uridium:Math.round(ev.reward.uridium*mult),xp:Math.round(ev.reward.xp*mult*designerXpMultiplier()*.55),cores:ev.reward.cores||0};}
function triggerCombatFlash(kind='cyan'){
  if(!ui.combatFlash)return;ui.combatFlash.className=`combat-flash flash-${kind}`;void ui.combatFlash.offsetWidth;ui.combatFlash.classList.add('play');setTimeout(()=>ui.combatFlash?.classList.remove('play'),420);
}
function completeGalaxyEvent(ev=currentGalaxyEvent()){
  const rec=galaxyEventRecord(ev);if(rec.rewarded)return;rec.value=ev.target;rec.complete=true;rec.rewarded=true;const r=galaxyEventRewardScaled(ev);progress.profile.credits+=r.credits;progress.profile.uridium+=r.uridium;progress.profile.xp+=r.xp;telemetryEconomy('event',{cr:r.credits,stl:r.uridium,xp:r.xp});normalizeWarfrontProgress();progress.warfront.skillCores+=r.cores;processPlayerLevelUps();playSfx('event');triggerCombatFlash('gold');queueCelebration('mission',ev.name,`+${fmt(r.credits)} CR • +${fmt(r.uridium)} STL • +${fmt(r.xp)} XP${r.cores?` • +${r.cores} CORE`:''}`);pushActivity(`EVENTO • ${ev.name} concluído • +${fmt(r.credits)} CR • +${fmt(r.uridium)} STL`,'reward');saveGame();renderGalaxyEvent();claimEventDesignerDrop(ev).catch(()=>{});
}
function addGalaxyEventProgress(amount=1,ev=currentGalaxyEvent()){
  const rec=galaxyEventRecord(ev);if(rec.complete)return;rec.value=Math.max(0,Math.min(ev.target,(Number(rec.value)||0)+Math.max(0,Number(amount)||0)));if(rec.value>=ev.target)completeGalaxyEvent(ev);else saveGame();
}
function clearGalaxyEventEntities(){if(state.target?.eventNpc){state.target=null;player.laserFiring=false;}state.enemies=state.enemies.filter(e=>!e.eventNpc);state.ores=state.ores.filter(o=>!o.eventOre);state.enemyRespawns=state.enemyRespawns.filter(r=>!r.eventId);state.oreRespawns=state.oreRespawns.filter(r=>!r.eventId&&!r.eventOre);galaxyEventRuntime.convoy=null;galaxyEventRuntime.nextWaveAt=0;galaxyEventRuntime.retryAt=0;}
function eventEnemy(type,ev,opts={}){const e=makeEnemy(type);e.eventNpc=true;e.eventId=ev.eventId;e.forceChase=opts.forceChase??true;e.name=opts.name||`RIFT • ${e.name}`;const scale=Number(opts.scale)||1;e.maxHp=e.hp=Math.round(e.maxHp*scale);e.maxShield=e.shield=Math.round(e.maxShield*scale);e.damage=e.baseDamage=Math.round(e.damage*Math.max(1,scale*.82));e.credits=Math.round(e.credits*(opts.rewardMult||1.35));e.uridium=Math.round(e.uridium*(opts.rewardMult||1.35));e.xp=Math.round(e.xp*(opts.rewardMult||1.35));e.color=opts.color||e.color;if(opts.size)e.size=opts.size;return e;}
function spawnGalaxyEventWave(ev=currentGalaxyEvent(),count=6){const profile=galaxyEventProfile(ev),tier=Number(state.currentMap?.tier||1),pool=Array.isArray(profile.pool)&&profile.pool.length?profile.pool:(tier>=4?['mordon','devolarium','sibelon']:tier>=3?['saimon','mordon','devolarium']:tier>=2?['lordakia','saimon','mordon']:['streuner','recruitStreuner','aiderStreuner']);for(let i=0;i<count;i++){const type=pool[Math.floor(Math.random()*pool.length)],e=eventEnemy(type,ev,{forceChase:true,rewardMult:profile.rewardMult||1.22,scale:profile.scale||1,color:profile.color,size:profile.size});if(profile.namePrefix)e.name=profile.namePrefix+' • '+e.name; if(profile.speedMult){e.speed*=profile.speedMult;e.attackRange=Math.min(500,e.attackRange+(profile.speedMult-1)*90);}const a=Math.random()*TWO_PI,r=rand(420,820);e.x=Math.max(160,Math.min(state.currentMap.world.w-160,player.x+Math.cos(a)*r));e.y=Math.max(160,Math.min(state.currentMap.world.h-160,player.y+Math.sin(a)*r));state.enemies.push(e);}}
function spawnGalaxyEventPrime(ev=currentGalaxyEvent()){if(state.enemies.some(e=>e.eventNpc&&e.eventId===ev.eventId&&e.hp>0))return;const profile=galaxyEventProfile(ev),level=progress?.profile?.level||1,scale=Math.max(profile.bossScale||2.2,(profile.bossScale||2.2)+Math.min(1.8,level/18)),e=eventEnemy(profile.bossType||'bossSibelon',ev,{name:profile.bossName||'RIFT TYRANT',scale,rewardMult:profile.bossRewardMult||2.4,size:profile.bossSize||68,color:profile.bossColor||'#ff4f9a'});e.forceChase=true;e.aggroRange=800;e.attackRange=500;e.x=Math.max(280,Math.min(state.currentMap.world.w-280,player.x+650));e.y=Math.max(280,Math.min(state.currentMap.world.h-280,player.y+180));state.enemies.push(e);playSfx('warning');triggerCombatFlash('red');showToast((profile.progressLabel||'BOSS')+' • '+(profile.bossName||'RIFT TYRANT')+' detectado!','reward');}
function spawnGalaxyEventOres(ev=currentGalaxyEvent(),count=12){const profile=galaxyEventProfile(ev),pool=Array.isArray(profile.orePool)&&profile.orePool.length?profile.orePool:['Prometium','Endurium','Terbium','Promerium'],amountRange=Array.isArray(profile.oreAmount)?profile.oreAmount:[12,26];for(let i=0;i<count;i++){const pos=randomMapPosition(120),type=pool[Math.floor(Math.random()*pool.length)],res=RESOURCES[type]||RESOURCES.Prometium;state.ores.push({id:'evtore_'+ev.eventId+'_'+Math.random().toString(16).slice(2),x:pos.x,y:pos.y,type,amount:Math.round(rand(amountRange[0],amountRange[1])),color:res.color,r:rand(11,17),rot:rand(0,TWO_PI),shape:Array.from({length:7},()=>rand(.72,1.18)),eventOre:true,eventId:ev.eventId});}}
function startGalaxyConvoy(ev=currentGalaxyEvent()){
  const profile=galaxyEventProfile(ev),a=Math.atan2(state.currentMap.world.h/2-player.y,state.currentMap.world.w/2-player.x),sx=Math.max(260,Math.min(state.currentMap.world.w-260,player.x+Math.cos(a)*260)),sy=Math.max(260,Math.min(state.currentMap.world.h-260,player.y+Math.sin(a)*260));
  const tx=sx<state.currentMap.world.w/2?state.currentMap.world.w-420:420,ty=sy<state.currentMap.world.h/2?state.currentMap.world.h-420:420;
  galaxyEventRuntime.convoy={eventId:ev.eventId,x:sx,y:sy,sx,sy,tx,ty,totalDistance:Math.max(1,Math.hypot(tx-sx,ty-sy)),hp:profile.convoyHp||900000,maxHp:profile.convoyHp||900000,speed:profile.convoySpeed||105,lastHitAt:0};galaxyEventRuntime.nextWaveAt=nowSec()+3;showToast((ev.name||'COMBOIO')+' • mantenha-se próximo e proteja a rota');
}
function ensureGalaxyEventWorld(force=false){
  if(!progress)return;if(sharedUniverseMap())return;const ev=currentGalaxyEvent(),mapKey=ev.eventId+':'+progress.mapId+':'+(currentTerritoryFaction()||'');if(force||galaxyEventRuntime.activeId!==ev.eventId||galaxyEventRuntime.mapKey!==mapKey){clearGalaxyEventEntities();galaxyEventRuntime.activeId=ev.eventId;galaxyEventRuntime.mapKey=mapKey;state.eventSpawnKey=mapKey;progress.galaxyEvents.lastSeenEvent=ev.eventId;playSfx('event');pushActivity('EVENTO GALÁCTICO • '+ev.name,'reward');}
  const rec=galaxyEventRecord(ev),profile=galaxyEventProfile(ev),mode=profile.mode;if(rec.complete||!galaxyEventEligible(ev))return;
  const alive=state.enemies.filter(e=>e.eventNpc&&e.eventId===ev.eventId&&e.hp>0).length;
  if((mode==='wave'||mode==='battle_wave')&&alive<(profile.minAlive||3))spawnGalaxyEventWave(ev,profile.waveCount||6);
  else if(mode==='boss')spawnGalaxyEventPrime(ev);
  else if(mode==='ore'&&state.ores.filter(o=>o.eventOre&&o.eventId===ev.eventId).length<(profile.oreRespawnMin||5))spawnGalaxyEventOres(ev,profile.oreCount||12);
  else if(mode==='convoy'&&!galaxyEventRuntime.convoy&&nowSec()>=galaxyEventRuntime.retryAt)startGalaxyConvoy(ev);
}
function updateGalaxyConvoy(dt,ev,rec){const c=galaxyEventRuntime.convoy;if(!c||c.eventId!==ev.eventId)return;const profile=galaxyEventProfile(ev),distPlayer=Math.hypot(c.x-player.x,c.y-player.y),dx=c.tx-c.x,dy=c.ty-c.y,d=Math.hypot(dx,dy);if(distPlayer<950&&d>10){const step=Math.min(d,c.speed*dt);c.x+=dx/Math.max(1,d)*step;c.y+=dy/Math.max(1,d)*step;rec.value=Math.max(rec.value,Math.round((1-d/Math.max(1,c.totalDistance||d))*100));}
  if(nowSec()>=galaxyEventRuntime.nextWaveAt){galaxyEventRuntime.nextWaveAt=nowSec()+(profile.waveRespawnMs||12);spawnGalaxyEventWave(ev,profile.waveCount||3);}
  const nearby=state.enemies.filter(e=>e.eventNpc&&e.hp>0&&Math.hypot(e.x-c.x,e.y-c.y)<270);if(nearby.length&&nowSec()-c.lastHitAt>.8){c.lastHitAt=nowSec();const dmg=nearby.reduce((s,e)=>s+Math.max(1000,e.damage*.12),0);c.hp=Math.max(0,c.hp-dmg);spawnCombatText(c.x,c.y-34,'COMBOIO -'+fmt(dmg),'#ff7089',{kind:'warning'});}
  if(d<=14){rec.value=100;completeGalaxyEvent(ev);galaxyEventRuntime.convoy=null;}
  else if(c.hp<=0){playSfx('explosion');spawnExplosionFx(c.x,c.y,'#65dcff',true);showToast('COMBOIO DESTRUÍDO • novo cargueiro em 15s');galaxyEventRuntime.convoy=null;galaxyEventRuntime.retryAt=nowSec()+15;rec.value=0;}
}
function updateGalaxyEvent(dt){if(!progress)return;if(isGalaxyGateMap()){ui.galaxyEventHud?.classList.add('hidden');return;}if(sharedUniverseMap()){const ev=currentGalaxyEvent();if(ev.id==='none'){ui.galaxyEventHud?.classList.add('hidden');return;}const rec=galaxyEventRecord(ev);if(sharedWorldEvent()){rec.value=Math.max(0,Number(sharedWorldEvent().progress)||0);rec.complete=!!sharedWorldEvent().complete;galaxyEventRuntime.convoy=sharedWorldEvent().convoy?{...sharedWorldEvent().convoy}:null;}renderGalaxyEventHud(ev,rec);return;}ensureGalaxyEventWorld();const ev=currentGalaxyEvent(),rec=galaxyEventRecord(ev);if(galaxyEventProfile(ev).mode==='convoy'&&!rec.complete&&galaxyEventEligible(ev))updateGalaxyConvoy(dt,ev,rec);renderGalaxyEventHud(ev,rec);}
function galaxyEventKill(enemy){if(!enemy)return;if(sharedUniverseMap())return;const ev=currentGalaxyEvent(),rec=galaxyEventRecord(ev),mode=galaxyEventProfile(ev).mode;if(rec.complete)return;if(mode==='battle_wave'&&state.currentMap?.battle)addGalaxyEventProgress(1,ev);else if(enemy.eventNpc&&enemy.eventId===ev.eventId&&(mode==='wave'||mode==='boss'))addGalaxyEventProgress(1,ev);}
function galaxyEventOrePickup(ore,amount){if(sharedUniverseMap())return;const ev=currentGalaxyEvent(),rec=galaxyEventRecord(ev),mode=galaxyEventProfile(ev).mode;if(rec.complete||mode!=='ore'||!ore?.eventOre||ore.eventId!==ev.eventId)return;addGalaxyEventProgress(amount,ev);}
function renderGalaxyEventHud(ev=currentGalaxyEvent(),rec=galaxyEventRecord(ev)){
  if(!ui.galaxyEventHud)return;if(!ev||ev.id==='none'){ui.galaxyEventHud.classList.add('hidden');if(ui.galaxyEventTopStatus)ui.galaxyEventTopStatus.textContent='—';return;}ui.galaxyEventHud.classList.remove('hidden');ui.galaxyEventHud.classList.toggle('complete',!!rec.complete);if(ui.galaxyEventIcon)ui.galaxyEventIcon.textContent=ev.icon;if(ui.galaxyEventName)ui.galaxyEventName.textContent=ev.name;if(ui.galaxyEventObjective)ui.galaxyEventObjective.textContent=galaxyEventObjectiveText(ev,rec);if(ui.galaxyEventTimer)ui.galaxyEventTimer.textContent=galaxyEventTimeText(galaxyEventSecondsLeft(ev));if(ui.galaxyEventProgress)ui.galaxyEventProgress.style.width=`${Math.min(100,(Number(rec.value)||0)/Math.max(1,ev.target)*100)}%`;if(ui.galaxyEventTopStatus)ui.galaxyEventTopStatus.textContent=rec.complete?'OK':galaxyEventTimeText(galaxyEventSecondsLeft(ev));
}
function renderGalaxyEvent(){if(!ui.galaxyEventContent||!progress)return;const ev=currentGalaxyEvent(),rec=galaxyEventRecord(ev),reward=galaxyEventRewardScaled(ev),eligible=galaxyEventEligible(ev),wb=worldBossState(),worldBossHtml=wb?`<section class="galaxy-event-card world"><div><small>COLETIVO ONLINE • WARFRONT</small><b>${escHtml(wb.name||'NEMESIS PRIME')}</b><span>${Number(wb.hp)>0?`${fmt(wb.hp)} / ${fmt(wb.max_hp)} HP`:'DERROTADO • LOOT DISPONÍVEL'}</span></div><button class="ghost-btn" data-event-warfront>ABRIR WARFRONT</button></section>`:'';const admin=isAdminPilot()?`<section class="galaxy-event-admin"><small>LIVE OPS</small><div class="muted">Ativação, duração e rotação agora são controladas exclusivamente pelo Supabase.</div></section>`:'';
  ui.galaxyEventContent.innerHTML=`<section class="galaxy-event-hero ${rec.complete?'complete':''}"><div class="galaxy-event-hero-icon">${ev.icon}</div><div><div class="eyebrow">EVENTO ATUAL • ${galaxyEventTimeText(galaxyEventSecondsLeft(ev))}</div><h3>${ev.name}</h3><p>${ev.desc}</p><div class="galaxy-event-big-progress"><i style="width:${Math.min(100,(Number(rec.value)||0)/Math.max(1,ev.target)*100)}%"></i></div><b>${galaxyEventObjectiveText(ev,rec)}</b></div></section><div class="galaxy-event-grid"><section class="galaxy-event-card"><small>RECOMPENSA PESSOAL</small><b>${fmt(reward.credits)} CR</b><span>${fmt(reward.uridium)} STL • ${fmt(reward.xp)} XP${reward.cores?` • ${reward.cores} CORE`:''}</span></section><section class="galaxy-event-card"><small>SETOR</small><b>${eligible?displayMapLabel(progress.mapId):ev.id==='battle'?'4-1 / 4-2 / 4-3':'X-2 / X-3 / X-4'}</b><span>${eligible?'Você está no setor do evento.':'Abra o mapa e siga para um setor compatível.'}</span></section><section class="galaxy-event-card"><small>PILOTOS ONLINE NO SETOR</small><b>${onlineWorld.players.size+1}</b><span>${[...onlineWorld.players.values()].filter(onlinePlayerEnemy).length} hostil(is) detectado(s)</span></section></div><div class="galaxy-event-actions"><button class="primary-btn" data-event-map>ABRIR MAPA</button>${ev.id==='battle'||worldBossOpen()?'<button class="danger-btn" data-event-warfront>WARFRONT / WORLD BOSS</button>':''}</div>${worldBossHtml}${admin}`;
}
function openGalaxyEvent(){closeNavigationModals(ui.galaxyEventModal);renderGalaxyEvent();ui.galaxyEventModal?.classList.remove('hidden');}
function forceGalaxyEvent(){refreshLiveOpsState(true).then(()=>showToast('LIVE OPS atualizado do Supabase'));}


function spawnCombatText(x,y,text,color='#fff',opts={}){const cap=qualityProfile().particles;if(cap<=0)return;if(state.particles.length>=cap)state.particles.splice(0,state.particles.length-cap+1);state.particles.push({x,y,text,color,life:opts.critical?1.25:1,vy:opts.critical?42:30,vx:rand(-7,7),combat:true,critical:!!opts.critical,kind:opts.kind||'damage'});}
function combatCritical(base,{chance=.065,mult=1.55}={}){chance=Math.max(0,Math.min(.85,Number(chance||0)+designerCritChanceBonus()));const critical=Math.random()<chance;return {critical,damage:Math.round(base*(critical?mult:1))};}
function setCombatAlert(text,kind='combat',seconds=1.8){if(!combatPrefs.alerts)return;state.combatAlertText=text;state.combatAlertKind=kind;state.combatAlertUntil=nowSec()+seconds;if(kind==='danger'||kind==='shield')playSfx('warning');}
function nearestCombatTarget(excludeId=null){const range=playerLaserRange();const candidates=state.enemies.filter(e=>e.hp>0&&e.id!==excludeId&&enemyDistance(e)<=range&&onScreenWorld(e.x,e.y,90));candidates.sort((a,b)=>enemyDistance(a)-enemyDistance(b));return candidates[0]||null;}
function selectCombatTarget(target,{silent=false}={}){if(!target||target.hp<=0)return false;state.target=target;state.pointerNavActive=false;if(!silent){playSfx('target');pushActivity(`${target.isPlayer?'PVP':'Alvo selecionado'} • ${target.callsign||target.name}`,'combat');}updateTargetLockHud();return true;}
function autoAcquireNextTarget(excludeId=null){if(!combatPrefs.autoTarget||!premiumAutoCombatAccess()||!progress||state.jumping)return null;const next=nearestCombatTarget(excludeId);if(next){selectCombatTarget(next,{silent:true});player.laserFiring=true;setCombatAlert('AUTO-COMBATE • NOVO ALVO','ability',1.0);return next;}return null;}
function npcFxProfile(type){
  const t=String(type||'').toLowerCase(),boss=t.startsWith('boss');
  if(t.includes('streuner'))return {glow:boss?'#ff4f68':'#ff6b79',ring:boss?'#ffb15f':'#ff7f8d',trail:'#ff5874'};
  if(t.includes('lordakia'))return {glow:boss?'#bb65ff':'#9f6cff',ring:'#dc9cff',trail:'#8f55ff'};
  if(t.includes('saimon'))return {glow:boss?'#5ccfff':'#6ae9ff',ring:'#9eeaff',trail:'#5bc8ff'};
  if(t.includes('mordon'))return {glow:boss?'#d26cff':'#b35bff',ring:'#ef93ff',trail:'#b768ff'};
  if(t.includes('devolarium'))return {glow:boss?'#ff6a42':'#ff8a54',ring:'#ffb36b',trail:'#ff6a3f'};
  if(t.includes('sibelon'))return {glow:boss?'#ff5fba':'#c06fff',ring:'#ff9edb',trail:'#b86dff'};
  return {glow:boss?'#ff5779':'#ff7f90',ring:'#ffc06d',trail:'#ff6f80'};
}
function drawNpcAuraLocal(e,boss,size){
  const fx=npcFxProfile(e.type),t=nowSec(),phase=Math.max(0,Number(e.bossPhase)||0),event=!!e.eventNpc;
  ctx.save();ctx.globalCompositeOperation='lighter';
  if(boss){for(let i=0;i<2;i++){ctx.strokeStyle=i?fx.glow:fx.ring;ctx.globalAlpha=(.18+i*.08)+.06*Math.sin(t*3+i);ctx.lineWidth=i?1.4:2.2;ctx.beginPath();ctx.arc(0,0,size*(.58+i*.12)+Math.sin(t*4+i)*2.2,0,TWO_PI);ctx.stroke();}}
  if(event){ctx.strokeStyle='#ffbd58';ctx.globalAlpha=.42+.12*Math.sin(t*5);ctx.lineWidth=1.6;ctx.setLineDash([6,5]);ctx.beginPath();ctx.arc(0,0,size*.72,0,TWO_PI);ctx.stroke();ctx.setLineDash([]);}
  if(phase>0){ctx.strokeStyle=phase>=2?'#ff335f':'#ff9a4e';ctx.globalAlpha=.3+.12*Math.sin(t*6);ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,size*(.76+phase*.05),0,TWO_PI);ctx.stroke();}
  ctx.restore();
}
function updateTargetLockHud(){
  const t=state.target&&state.target.hp>0?state.target:null;if(!ui.targetLockHud)return;ui.targetLockHud.classList.toggle('hidden',!t);if(!t)return;
  const name=t.callsign||t.name||'ALVO',hp=Math.max(0,Number(t.hp)||0),maxHp=Math.max(1,Number(t.maxHp)||1),shield=Math.max(0,Number(t.shield)||0),maxShield=Math.max(1,Number(t.maxShield)||1),d=Math.round(enemyDistance(t));
  ui.targetLockName.textContent=name.toUpperCase();ui.targetLockType.textContent=t.isPlayer?'PVP':t.worldBoss?'WORLD BOSS':t.eventNpc?'EVENTO':String(t.type||'NPC').startsWith('boss')?'BOSS':'NPC';
  ui.targetLockDistance.textContent=`${fmt(d)}u`;ui.targetLockThreat.textContent=t.isPlayer?'PILOTO HOSTIL':t.worldBoss?'AMEAÇA GLOBAL':t.eventNpc?'ANOMALIA RIFT':d<=playerLaserRange()?'ALCANCE LASER':'FORA DO LASER';
  ui.targetLockHpFill.style.width=`${Math.max(0,Math.min(100,hp/maxHp*100))}%`;ui.targetLockHpText.textContent=`${fmt(hp)} / ${fmt(maxHp)}`;ui.targetLockShieldFill.style.width=`${Math.max(0,Math.min(100,shield/maxShield*100))}%`;ui.targetLockShieldText.textContent=`${fmt(shield)} / ${fmt(maxShield)}`;
  ui.targetLockHud.classList.toggle('boss',!t.isPlayer&&String(t.type||'').startsWith('boss'));ui.targetLockHud.classList.toggle('pvp',!!t.isPlayer);
  if(ui.targetLockPortrait&&ui.targetLockPortraitWrap){const src=!t.isPlayer?GAME_ASSETS.npcs?.[t.type]:null;ui.targetLockPortraitWrap.classList.toggle('hidden',!src);if(src&&ui.targetLockPortrait.src!==new URL(src,location.href).href)ui.targetLockPortrait.src=src;}
}

function updateCombatStateHud(){if(!ui.combatStateHud||!progress)return;const now=nowSec(),hpRatio=player.hp/Math.max(1,player.maxHp),hostiles=[...onlineWorld.players.values()].filter(rp=>onlinePlayerEnemy(rp)&&Math.hypot(rp.x-player.x,rp.y-player.y)<=state.radarRange).length,combat=player.laserFiring||now-state.lastPlayerDamageAt<5||state.enemies.some(e=>e.hp>0&&now-(e.lastAttackPlayerAt||-99)<4);let text='',meta='',kind='';if(state.combatAlertUntil>now){text=state.combatAlertText;kind=state.combatAlertKind;meta=hostiles?`PVP ${hostiles} • ALERTA`:'ALERTA TÁTICO';}else if(hpRatio<=.25){text='CASCO CRÍTICO';meta=`HP ${Math.round(hpRatio*100)}%`;kind='danger';}else if(combat){text='EM COMBATE';meta=hostiles?`PVP ${hostiles} • ${state.target?fmt(enemyDistance(state.target))+'u':'SEM LOCK'}`:(state.target?`${state.target.name||'ALVO'} • ${fmt(enemyDistance(state.target))}u`:'HOSTIL DETECTADO');kind='combat';}else if(hostiles){text='PVP NO RADAR';meta=`${hostiles} piloto(s) hostil(is)`;kind='pvp';}ui.combatStateHud.classList.toggle('hidden',!text);if(!text)return;ui.combatStateHud.dataset.kind=kind;ui.combatStateText.textContent=text;ui.combatStateMeta.textContent=meta;}
function drawGalaxyEventWorld(){const c=galaxyEventRuntime.convoy;if(!c||!onScreenWorld(c.x,c.y,180))return;const p=screenPos(c.x,c.y),a=Math.atan2(c.ty-c.y,c.tx-c.x);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(a);ctx.shadowColor='#63eaff';ctx.shadowBlur=18;ctx.fillStyle='rgba(12,49,74,.96)';ctx.strokeStyle='#8cf3ff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(32,0);ctx.lineTo(5,-16);ctx.lineTo(-28,-11);ctx.lineTo(-20,0);ctx.lineTo(-28,11);ctx.lineTo(5,16);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();const w=92,ratio=Math.max(0,c.hp/c.maxHp);ctx.fillStyle='rgba(4,18,27,.9)';ctx.fillRect(p.x-w/2,p.y-35,w,6);ctx.fillStyle=ratio>.35?'#56f0c5':'#ff5f7c';ctx.fillRect(p.x-w/2,p.y-35,w*ratio,6);ctx.fillStyle='#c8f7ff';ctx.font='bold 10px Arial';ctx.textAlign='center';ctx.fillText('COMBOIO QUÂNTICO',p.x,p.y+30);}


function layoutHudPanels(){
  const root=document.documentElement;
  const topbarVisible=!!ui.topbar&&state.topbarDockExpanded&&getComputedStyle(ui.topbar).display!=='none';
  const topbarH=topbarVisible?Math.ceil(ui.topbar.getBoundingClientRect().height):0;
  const topDockOffset=topbarVisible?topbarH+14:6;
  root.style.setProperty('--hud-top-offset',`${topbarVisible?topbarH+8:6}px`);
  root.style.setProperty('--top-dock-offset',`${topDockOffset}px`);

  const mapVisible=!!ui.minimapPanel&&getComputedStyle(ui.minimapPanel).display!=='none'&&!ui.minimapPanel.classList.contains('hidden')&&!ui.minimapPanel.classList.contains('hud-user-hidden');
  const mapW=mapVisible?Math.ceil(ui.minimapPanel.getBoundingClientRect().width):0;
  root.style.setProperty('--map-dock-width',`${mapW}px`);
  const chatVisible=!!ui.chatDock&&getComputedStyle(ui.chatDock).display!=='none'&&!ui.chatDock.classList.contains('hidden')&&!ui.chatDock.classList.contains('hud-user-hidden');
  const chatExpanded=332;
  const chatCollapsed=162;
  const minimapExpanded=window.innerWidth<=680?172:window.innerWidth<=820?188:window.innerWidth<=1100?210:window.innerWidth<=1280?228:252;
  const minimapCollapsed=window.innerWidth<=680?136:window.innerWidth<=820?144:window.innerWidth<=1100?152:window.innerWidth<=1280?160:168;
  const chatW=chatVisible?(ui.chatDock.classList.contains('collapsed')?chatCollapsed:chatExpanded):0;
  const minimapDockW=mapVisible?(ui.minimapPanel.classList.contains('collapsed')?minimapCollapsed:minimapExpanded):0;
  root.style.setProperty('--chat-dock-width-current',`${chatW}px`);
  root.style.setProperty('--minimap-dock-width-current',`${minimapDockW}px`);

  const weaponVisible=!!ui.weaponBar&&getComputedStyle(ui.weaponBar).display!=='none';
  const weaponH=weaponVisible?Math.ceil(ui.weaponBar.getBoundingClientRect().height):0;
  root.style.setProperty('--weaponbar-height',`${weaponH+12}px`);
  const bottomItems=[ui.chatDock,ui.weaponBar,ui.minimapPanel].filter(el=>el&&getComputedStyle(el).display!=='none');
  const legacyBottomH=bottomItems.length?Math.max(...bottomItems.map(el=>Math.ceil(el.getBoundingClientRect().height))):0;
  // V17.9.3: no mobile o HUD inferior vira dois andares (chat/mapa + munições).
  // Usar apenas o maior filho fazia os painéis flutuantes invadirem a barra de munição.
  const dockRect=ui.bottomHudDock&&getComputedStyle(ui.bottomHudDock).display!=='none'?ui.bottomHudDock.getBoundingClientRect():null;
  const bottomH=window.innerWidth<=760&&dockRect?Math.ceil(dockRect.height):legacyBottomH;
  root.style.setProperty('--bottom-dock-height',`${bottomH+12}px`);
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
  const live=worldRuntimeConfig.sectorDestinations.get(String(label||''));if(live)return {...live};
  if(label==='4-1')return {mapId:'b41',territoryFaction:null,battle:true};
  if(label==='4-2')return {mapId:'b42',territoryFaction:null,battle:true};
  if(label==='4-3')return {mapId:'b43',territoryFaction:null,battle:true};
  const [prefix,tierRaw]=String(label||'').split('-'),f=factionFromPrefix(prefix),tier=Number(tierRaw);
  if(!f||tier<1||tier>4)return null;
  return {mapId:`x${tier}`,territoryFaction:f.id,battle:false};
}
function internalMapFromGraphLabel(label){return graphDestination(label)?.mapId||null;}
function graphLevelRequirement(label){const live=worldRuntimeConfig.sectorInfo.get(String(label||''));if(live)return Math.max(1,Number(live.minLevel)||1);if(label.startsWith('4-'))return 15;const tier=Number(label.split('-')[1]||99);return tier===1?1:tier===2?3:tier===3?7:tier===4?10:99;}
function canTravelGraphLabel(label){
  const dest=graphDestination(label);if(!dest)return {ok:false,reason:'Rota inválida'};
  const map=MAPS[dest.mapId];if(!map||map.enabled===false)return {ok:false,reason:'Setor temporariamente indisponível'};
  if(String(label).startsWith('4-')&&!galaxyBattleMapsOpen()&&!state.currentMap?.battle)return {ok:false,reason:'BATTLE MAP FECHADO • aguarde Evento Galáctico ou World Boss'};
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
  cap+=cargoExtraBonus();if(economyBoostActive('cargo'))cap+=economyServiceEffect('cargo','cargo_flat',750);
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
function playNextCelebration(){if(celebrationRunning||!celebrationQueue.length||!ui.gameCelebration)return;celebrationRunning=true;const item=celebrationQueue.shift();playSfx('reward');ui.gameCelebration.classList.remove('hidden','mission','level');ui.gameCelebration.classList.add(item.kind==='level'?'level':'mission');ui.celebrationKicker.textContent=item.kind==='level'?'EVOLUÇÃO DE PILOTO':'PROTOCOLO DE MISSÃO';ui.celebrationTitle.textContent=item.title;ui.celebrationSubtitle.textContent=item.subtitle||'';void ui.gameCelebration.offsetWidth;ui.gameCelebration.classList.add('play');setTimeout(()=>{ui.gameCelebration.classList.remove('play');setTimeout(()=>{ui.gameCelebration.classList.add('hidden');celebrationRunning=false;playNextCelebration();},320);},1900);}
function showMissionCompleteAnimation(mission,bonus){
  const extra=bonus?.itemText?` • ${bonus.itemText}`:'';
  queueCelebration('mission','MISSÃO COMPLETA',`${mission.title} • +${fmt(bonus.credits)} CR • +${fmt(bonus.uridium)} STL • +${fmt(bonus.xp)} XP${extra}`);
}
function showLevelUpAnimation(level){queueCelebration('level',`NÍVEL ${level}`,`Seu piloto alcançou o nível ${level}`);}
function processPlayerLevelUps(){
  let gained=0;
  while(progress.profile.level<PLAYER_MAX_LEVEL&&progress.profile.xp>=levelXpThreshold(progress.profile.level+1)){
    progress.profile.level++;
    gained++;telemetryLevelReached(progress.profile.level);journeyEvent('level',progress.profile.level);syncAchievements(true);
    showLevelUpAnimation(progress.profile.level);
    queueCelebration('mission','RECOMPENSA LIBERADA',`Nível ${progress.profile.level} • abra PASSE para resgatar`);
    const unlocked=progressionUnlocksAtLevel(progress.profile.level);if(unlocked.length)queueCelebration('mission','NOVO ACESSO',unlocked.join(' • '));
  }
  if(gained){normalizeLevelRewards();updatePassBadge();saveGame();}
  return gained;
}

function setSync(text,cls=''){if(!ui.syncLabel)return;ui.syncLabel.textContent=text;ui.syncLabel.className=`sync-chip ${cls}`.trim();}
function locationStorageKey(mapId=progress?.mapId,territoryFaction=progress?.territoryFaction){
  const id=String(mapId||'x1');
  if(['x1','x2','x3','x4'].includes(id)){
    const faction=territoryFaction||progress?.profile?.faction||'battle';
    return `${id}:${faction}`;
  }
  return id;
}
const positionCheckpointRuntime={lastAt:0,lastX:null,lastY:null,lastKey:null};
const authoritativeLocationRuntime={busy:false,pending:false,lastAt:0,lastX:null,lastY:null,lastKey:null,lastSavedAt:0};
const movementPositionRuntime={wasMoving:false,lastCommitAt:0,lastX:null,lastY:null,loadedFromCheckpoint:false,hasMovedSinceLoad:false,spawnX:null,spawnY:null};
function positionCheckpointKey(mapId=progress?.mapId,territoryFaction=progress?.territoryFaction){
  const userId=getUser()?.id||progress?.accountOwnerId||'guest';
  return `${SAVE_KEY_PREFIX}:position:${userId}:${locationStorageKey(mapId,territoryFaction)}`;
}
function latestPositionCheckpointKey(){
  const userId=getUser()?.id||progress?.accountOwnerId||'guest';
  return `${SAVE_KEY_PREFIX}:positionLatest:${userId}`;
}
function readLatestPositionCheckpoint(){
  try{
    const raw=localStorage.getItem(latestPositionCheckpointKey());
    if(!raw)return null;
    const entry=JSON.parse(raw),mapId=String(entry?.mapId||'');
    if(!entry||!MAPS[mapId])return null;
    const x=Number(entry.x),y=Number(entry.y),savedAt=Number(entry.savedAt)||0;
    if(!Number.isFinite(x)||!Number.isFinite(y)||!savedAt)return null;
    // Ignora relógio impossível / checkpoint absurdamente antigo.
    if(savedAt>Date.now()+300000||savedAt<Date.now()-1000*60*60*24*30)return null;
    const territoryFaction=['x1','x2','x3','x4'].includes(mapId)
      ? (entry.territoryFaction||progress?.profile?.faction||null)
      : null;
    return {mapId,territoryFaction,x,y,savedAt};
  }catch{return null;}
}
function restoreLatestRuntimeLocationCheckpoint(){
  if(!progress)return false;
  const latest=readLatestPositionCheckpoint();
  if(!latest)return false;
  const map=MAPS[latest.mapId];if(!map)return false;
  const key=locationStorageKey(latest.mapId,latest.territoryFaction);
  const savedEntry=progress.positionByMap?.[key];
  const savedAt=Math.max(Number(savedEntry?.savedAt)||0,
    String(progress.savedMapId||'')===latest.mapId ? Number(progress.locationSavedAt||progress.clientSavedAt)||0 : 0);
  // O checkpoint local de movimento só substitui localização, nunca economia/inventário.
  if(latest.savedAt+25<savedAt)return false;
  progress.mapId=latest.mapId;
  progress.territoryFaction=latest.territoryFaction;
  progress.x=Math.max(35,Math.min(map.world.w-35,latest.x));
  progress.y=Math.max(35,Math.min(map.world.h-35,latest.y));
  progress.savedMapId=latest.mapId;
  progress.savedTerritoryFaction=latest.territoryFaction;
  progress.locationSavedAt=latest.savedAt;
  progress.positionByMap ||= {};
  progress.positionByMap[key]={x:progress.x,y:progress.y,mapId:latest.mapId,territoryFaction:latest.territoryFaction,savedAt:latest.savedAt};
  return true;
}

function applyPresenceCheckpoint(row){
  if(!progress||!row)return false;
  const mapId=String(row.map_id||'');
  const map=MAPS[mapId];if(!map)return false;
  const gateKey=gateKeyForMap(progress.mapId);
  if(gateKey&&progress.galaxyGate?.[gateKey]?.run?.active)return false;
  const x=Number(row.x),y=Number(row.y),serverAt=Date.parse(row.updated_at||'')||0;
  if(!Number.isFinite(x)||!Number.isFinite(y))return false;
  // O registro de presença recebe coordenadas durante o jogo real. Ele é uma fonte
  // mais confiável que o save econômico para restaurar posição depois de um reload.
  const local=readLatestPositionCheckpoint();
  if(local&&local.savedAt>serverAt+250)return false;
  const territoryFaction=['x1','x2','x3','x4'].includes(mapId)
    ? (row.territory_faction||progress.profile?.faction||null)
    : null;
  progress.mapId=mapId;
  progress.territoryFaction=territoryFaction;
  progress.x=Math.max(35,Math.min(map.world.w-35,x));
  progress.y=Math.max(35,Math.min(map.world.h-35,y));
  progress.savedMapId=mapId;
  progress.savedTerritoryFaction=territoryFaction;
  progress.locationSavedAt=Math.max(Number(progress.locationSavedAt)||0,serverAt);
  progress.positionByMap ||= {};
  const key=locationStorageKey(mapId,territoryFaction);
  progress.positionByMap[key]={x:progress.x,y:progress.y,mapId,territoryFaction,savedAt:serverAt};
  console.info('[position] restored from server presence',mapId,Math.round(progress.x),Math.round(progress.y));
  return true;
}
function applyDedicatedCheckpointToProgress(row,{requireNewer=true}={}){
  if(!progress||!row)return false;
  const mapId=String(row.map_id||row.mapId||'');
  const map=MAPS[mapId];if(!map)return false;
  const x=Number(row.x),y=Number(row.y);
  const savedAt=Math.max(0,Number(row.client_saved_at||row.savedAt)||Date.parse(row.updated_at||'')||0);
  if(!Number.isFinite(x)||!Number.isFinite(y)||!savedAt)return false;
  const currentStamp=Math.max(0,Number(progress.locationSavedAt)||0);
  if(requireNewer&&savedAt<=currentStamp+25)return false;
  const territory=['x1','x2','x3','x4'].includes(mapId)?(row.territory_faction||row.territoryFaction||progress.profile?.faction||null):null;
  progress.mapId=mapId;progress.territoryFaction=territory;
  progress.x=Math.max(35,Math.min(map.world.w-35,x));progress.y=Math.max(35,Math.min(map.world.h-35,y));
  progress.savedMapId=mapId;progress.savedTerritoryFaction=territory;progress.locationSavedAt=savedAt;
  progress.positionByMap ||= {};
  const key=locationStorageKey(mapId,territory);
  progress.positionByMap[key]={x:progress.x,y:progress.y,mapId,territoryFaction:territory,savedAt};
  const normalized={x:progress.x,y:progress.y,mapId,territoryFaction:territory,savedAt};
  try{localStorage.setItem(positionCheckpointKey(mapId,territory),JSON.stringify(normalized));localStorage.setItem(latestPositionCheckpointKey(),JSON.stringify(normalized));}catch{}
  return true;
}
function reapplyDedicatedCheckpointToLiveWorld(row){
  if(!progress||!row||movementPositionRuntime.hasMovedSinceLoad)return false;
  if(!applyDedicatedCheckpointToProgress(row,{requireNewer:true}))return false;
  // A localização chegou depois do primeiro frame. Reinicializa somente o mundo visual,
  // sem substituir economia/inventário e sem esperar outros serviços.
  try{sharedUniverse.close();sharedUniverseRuntime.ready=false;sharedUniverseRuntime.event=null;clearOnlinePlayers();}catch{}
  try{startLoadedGame();console.info('[bootstrap] late location applied',progress.mapId,Math.round(progress.x),Math.round(progress.y));return true;}
  catch(e){console.warn('[bootstrap] late location apply failed',e);return false;}
}

async function restoreBestRuntimePosition(){
  if(!progress)return false;
  const local=readLatestPositionCheckpoint();
  let dedicated=null;
  try{dedicated=await loadPlayerLocationCheckpointOnline();}catch(e){console.warn('[position] dedicated checkpoint unavailable',e);}

  const candidates=[];
  if(dedicated&&MAPS[String(dedicated.map_id||'')]){
    candidates.push({mapId:String(dedicated.map_id),territoryFaction:dedicated.territory_faction||null,x:Number(dedicated.x),y:Number(dedicated.y),angle:Number(dedicated.angle)||0,savedAt:Number(dedicated.client_saved_at)||Date.parse(dedicated.updated_at||'')||0,source:'dedicated'});
  }
  // Fallback local só entra quando é realmente mais novo que o checkpoint dedicado.
  // player_presence NÃO é mais usado para spawn: presença é efêmera e não deve decidir persistência.
  if(local)candidates.push({mapId:local.mapId,territoryFaction:local.territoryFaction,x:local.x,y:local.y,angle:0,savedAt:Number(local.savedAt)||0,source:'local'});
  const valid=candidates.filter(c=>MAPS[c.mapId]&&Number.isFinite(c.x)&&Number.isFinite(c.y)&&c.savedAt>0);
  if(!valid.length)return false;
  valid.sort((a,b)=>b.savedAt-a.savedAt || (a.source==='dedicated'?-1:1));
  const best=valid[0],map=MAPS[best.mapId];
  const territory=['x1','x2','x3','x4'].includes(best.mapId)?(best.territoryFaction||progress.profile?.faction||null):null;
  progress.mapId=best.mapId;progress.territoryFaction=territory;
  progress.x=Math.max(35,Math.min(map.world.w-35,best.x));progress.y=Math.max(35,Math.min(map.world.h-35,best.y));
  progress.savedMapId=best.mapId;progress.savedTerritoryFaction=territory;progress.locationSavedAt=best.savedAt;
  progress.positionByMap ||= {};
  const key=locationStorageKey(best.mapId,territory);
  progress.positionByMap[key]={x:progress.x,y:progress.y,mapId:best.mapId,territoryFaction:territory,savedAt:best.savedAt};
  try{
    const normalized={x:progress.x,y:progress.y,mapId:best.mapId,territoryFaction:territory,savedAt:best.savedAt};
    localStorage.setItem(positionCheckpointKey(best.mapId,territory),JSON.stringify(normalized));
    localStorage.setItem(latestPositionCheckpointKey(),JSON.stringify(normalized));
  }catch{}
  console.info('[position] restore winner',best.source,best.mapId,Math.round(progress.x),Math.round(progress.y),new Date(best.savedAt).toISOString());
  return true;
}

function syncRuntimeLocationToProgress(forceCheckpoint=false){
  if(!progress||!state?.currentMap)return;
  const x=Number(player?.x),y=Number(player?.y);
  if(!Number.isFinite(x)||!Number.isFinite(y))return;
  const now=Date.now(),mapKey=locationStorageKey();
  progress.positionByMap ||= {};
  const previous=progress.positionByMap[mapKey];
  const previousX=Number(previous?.x),previousY=Number(previous?.y);
  const mapChanged=String(progress.savedMapId||'')!==String(progress.mapId||'')||String(progress.savedTerritoryFaction||'')!==String(progress.territoryFaction||'');
  const actualMove=!Number.isFinite(previousX)||!Number.isFinite(previousY)||Math.hypot(x-previousX,y-previousY)>=2;

  // Economia/save geral pode atualizar progress.x/y, mas NÃO promove o timestamp de posição.
  // Só movimento real, troca de mapa ou checkpoint explícito pode tornar uma localização "mais nova".
  progress.x=x;progress.y=y;
  if(!(forceCheckpoint||mapChanged||actualMove))return;

  const saved={x,y,mapId:progress.mapId,territoryFaction:progress.territoryFaction||null,savedAt:now};
  progress.savedMapId=progress.mapId;
  progress.savedTerritoryFaction=progress.territoryFaction||null;
  progress.locationSavedAt=now;
  progress.positionByMap[mapKey]=saved;
  const moved=positionCheckpointRuntime.lastX===null||Math.hypot(x-positionCheckpointRuntime.lastX,y-positionCheckpointRuntime.lastY)>=4;
  const due=now-positionCheckpointRuntime.lastAt>=750||positionCheckpointRuntime.lastKey!==mapKey;
  if(forceCheckpoint||(moved&&due)){
    try{
      localStorage.setItem(positionCheckpointKey(),JSON.stringify(saved));
      localStorage.setItem(latestPositionCheckpointKey(),JSON.stringify(saved));
    }catch{}
    positionCheckpointRuntime.lastAt=now;positionCheckpointRuntime.lastX=x;positionCheckpointRuntime.lastY=y;positionCheckpointRuntime.lastKey=mapKey;
  }
}
async function syncAuthoritativePlayerLocation(force=false,{keepalive=false}={}){
  if(!authenticated||!progress||!state?.currentMap||isGalaxyGateMap())return false;
  const x=Number(player?.x),y=Number(player?.y);if(!Number.isFinite(x)||!Number.isFinite(y))return false;
  const now=Date.now(),key=locationStorageKey(),moved=authoritativeLocationRuntime.lastX===null||Math.hypot(x-authoritativeLocationRuntime.lastX,y-authoritativeLocationRuntime.lastY)>=5;
  const changedMap=authoritativeLocationRuntime.lastKey!==key,due=now-authoritativeLocationRuntime.lastAt>=1000;
  if(!force&&!(changedMap||(moved&&due)))return false;
  if(authoritativeLocationRuntime.busy){authoritativeLocationRuntime.pending=true;return false;}
  const payload={mapId:progress.mapId,territoryFaction:progress.territoryFaction||null,x,y,angle:Number(player.angle)||0,savedAt:now};
  authoritativeLocationRuntime.busy=true;authoritativeLocationRuntime.pending=false;
  try{
    await savePlayerLocationCheckpointOnline(payload,{keepalive});
    authoritativeLocationRuntime.lastAt=now;authoritativeLocationRuntime.lastX=x;authoritativeLocationRuntime.lastY=y;authoritativeLocationRuntime.lastKey=key;authoritativeLocationRuntime.lastSavedAt=now;
    return true;
  }catch(e){if(!keepalive)console.warn('[position] dedicated save failed',e);return false;}
  finally{
    authoritativeLocationRuntime.busy=false;
    if(authoritativeLocationRuntime.pending&&!keepalive)setTimeout(()=>syncAuthoritativePlayerLocation(true),0);
  }
}
function forceAuthoritativeLocationCheckpoint(keepalive=false){
  syncRuntimeLocationToProgress(true);
  return syncAuthoritativePlayerLocation(true,{keepalive});
}
function commitRuntimePosition(reason='movement_end'){
  if(!progress||!state?.currentMap||isGalaxyGateMap())return;
  const x=Number(player.x),y=Number(player.y);if(!Number.isFinite(x)||!Number.isFinite(y))return;
  // Nunca promove um spawn/fallback recém-carregado para 'posição mais nova' sem checkpoint válido ou movimento real.
  if(!movementPositionRuntime.loadedFromCheckpoint&&!movementPositionRuntime.hasMovedSinceLoad)return;
  const now=Date.now();
  if(movementPositionRuntime.lastX!==null&&Math.hypot(x-movementPositionRuntime.lastX,y-movementPositionRuntime.lastY)<2&&now-movementPositionRuntime.lastCommitAt<800)return;
  syncRuntimeLocationToProgress(true);
  progress.clientSavedAt=now;
  try{localStorage.setItem(saveKey(),JSON.stringify(progress));}catch(e){console.warn('[position] local final checkpoint failed',e);}
  cloudDirty=true;
  movementPositionRuntime.lastCommitAt=now;movementPositionRuntime.lastX=x;movementPositionRuntime.lastY=y;
  syncAuthoritativePlayerLocation(true).catch(e=>console.warn('[position] final checkpoint failed',reason,e));
  console.info('[position] committed',reason,progress.mapId,Math.round(x),Math.round(y));
}
function runtimeLocationSnapshot(){
  if(!progress||!state?.currentMap)return null;
  const x=Number(player.x),y=Number(player.y);if(!Number.isFinite(x)||!Number.isFinite(y))return null;
  const mapId=progress.mapId,territoryFaction=progress.territoryFaction||null,savedAt=Date.now(),key=locationStorageKey(mapId,territoryFaction);
  return {mapId,territoryFaction,x,y,savedAt,key,positionByMap:{...(progress.positionByMap||{})}};
}
function restoreRuntimeLocationAfterServerState(snapshot){
  if(!snapshot||!progress||!MAPS[snapshot.mapId])return;
  progress.mapId=snapshot.mapId;progress.territoryFaction=snapshot.territoryFaction;progress.x=snapshot.x;progress.y=snapshot.y;
  progress.savedMapId=snapshot.mapId;progress.savedTerritoryFaction=snapshot.territoryFaction;progress.locationSavedAt=snapshot.savedAt;
  progress.positionByMap={...(progress.positionByMap||{}),...(snapshot.positionByMap||{})};
  progress.positionByMap[snapshot.key]={x:snapshot.x,y:snapshot.y,mapId:snapshot.mapId,territoryFaction:snapshot.territoryFaction,savedAt:snapshot.savedAt};
}
function installServerStatePreservingPosition(serverState){
  if(!serverState||typeof serverState!=='object')throw new Error('Servidor não retornou um estado válido.');
  const loc=runtimeLocationSnapshot();
  progress=serverState;hydrateProgress();
  restoreRuntimeLocationAfterServerState(loc);
}

function savedLocationForCurrentMap(){
  if(!progress)return null;
  const map=MAPS[progress.mapId]||MAPS.x1,mapKey=locationStorageKey(),candidates=[];
  const entry=progress.positionByMap?.[mapKey];
  if(entry&&Number.isFinite(Number(entry.x))&&Number.isFinite(Number(entry.y)))candidates.push({x:Number(entry.x),y:Number(entry.y),savedAt:Number(entry.savedAt)||0,source:'save'});
  const checkpoint=readPositionCheckpoint(progress.mapId,progress.territoryFaction);
  if(checkpoint)candidates.push({x:checkpoint.x,y:checkpoint.y,savedAt:checkpoint.savedAt,source:'checkpoint'});
  const sameMap=String(progress.savedMapId||progress.mapId||'')===String(progress.mapId||'');
  const sameTerritory=!['x1','x2','x3','x4'].includes(progress.mapId)||!progress.savedTerritoryFaction||progress.savedTerritoryFaction===progress.territoryFaction;
  if(sameMap&&sameTerritory&&Number.isFinite(Number(progress.x))&&Number.isFinite(Number(progress.y)))candidates.push({x:Number(progress.x),y:Number(progress.y),savedAt:Number(progress.locationSavedAt)||Number(progress.clientSavedAt)||0,source:'legacy'});
  if(!candidates.length)return null;
  candidates.sort((a,b)=>(b.savedAt||0)-(a.savedAt||0));
  const best=candidates[0];
  return {x:Math.max(35,Math.min(map.world.w-35,best.x)),y:Math.max(35,Math.min(map.world.h-35,best.y)),savedAt:best.savedAt,source:best.source};
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
  const account=getUser();
  if(!progress.profile?.faction || !SHIPS[progress.activeShipId]) throw new Error('save incompleto');
  if(progress.accountOwnerId&&account?.id&&String(progress.accountOwnerId)!==String(account.id))throw new Error('SAVE_OWNER_MISMATCH');
  progress.accountOwnerId=account?.id||progress.accountOwnerId||null;
  progress.accountOwnerEmail=account?.email||progress.accountOwnerEmail||null;
  // A identidade da conta é soberana; um save nunca pode renomear outro usuário.
  progress.profile.callsign=account?.callsign || account?.email?.split('@')[0] || progress.profile.callsign || 'Pilot';
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
  progress.locationSavedAt=Math.max(0,Number(progress.locationSavedAt)||Number(progress.clientSavedAt)||0);
  const legacyLocationKey=locationStorageKey(progress.mapId,progress.territoryFaction);
  if(!progress.positionByMap[legacyLocationKey]&&Number.isFinite(Number(progress.x))&&Number.isFinite(Number(progress.y))){
    progress.positionByMap[legacyLocationKey]={x:Number(progress.x),y:Number(progress.y),mapId:progress.mapId,territoryFaction:progress.territoryFaction||null,savedAt:Number(progress.clientSavedAt)||0};
  }
  if(!progress.profile.xpModelV101){
    const oldCarry=progress.profile.xp;
    progress.profile.xp=legacyLevelXpThresholdV1767(progress.profile.level)+oldCarry;
    progress.profile.xpModelV101=true;
  }
  migratePlayerXpCurveV1770();
  progress.profile.level=levelFromXp(progress.profile.xp,PLAYER_MAX_LEVEL);
  progress.ownedShips ||= ['phoenix'];progress.inventory ||= {};progress.drones ||= [];progress.ammo ||= {};progress.rockets ||= {};progress.flags ||= {};progress.cargo ||= {};progress.discoveries ||= {};progress.missions ||= freshMissions();normalizeMissionState();normalizeBattlePass();normalizeLevelRewards();progress.pilotBio ||= freshPilotBio();normalizePilotBio();progress.titles ||= freshPilotTitles();normalizePilotTitles();progress.journey ||= freshPilotJourney();normalizePilotJourney();progress.achievements ||= freshAchievements();normalizeAchievements();syncAchievements(false);progress.economyBoosts ||= {};normalizeEconomyBoosts();progress.auction ||= freshAuctionState();ensureAuctionState();progress.galaxyGate ||= freshGalaxyGateState();normalizeGalaxyGateState();normalizeCombatAbilities();normalizeGalaxyEvents();
  if(progress.repairRequired&&(!progress.repairRequired.shipId||!SHIPS[progress.repairRequired.shipId]))progress.repairRequired=null;
  for(const id of Object.keys(LASER_AMMO))if(progress.ammo[id]===undefined)progress.ammo[id]=0;
  if(!LASER_AMMO[progress.selectedLaserAmmo])progress.selectedLaserAmmo='lcb10';
  progress.pet ||= freshPet();
  const legacyPetOwned=progress.pet.owned===undefined&&(Number(progress.pet.level)>1||(progress.pet.lasers||[]).some(Boolean)||(progress.pet.shields||[]).some(Boolean)||Object.values(progress.pet.gearsOwned||{}).some(Boolean));
  if(progress.pet.owned===undefined)progress.pet.owned=!!legacyPetOwned;
  const legacyPetLevel=Math.max(1,Math.min(PET_MAX_LEVEL,Number(progress.pet.level)||1));
  progress.pet.level=legacyPetLevel;
  progress.pet.xp=Math.max(0,Number(progress.pet.xp)||0);
  if(progress.pet.owned&&!progress.pet.xpModelV175){
    progress.pet.xp=Math.max(progress.pet.xp,petLevelThreshold(legacyPetLevel));
    progress.pet.xpModelV175=true;
  }
  if(!progress.pet.owned){
    progress.pet.level=1;progress.pet.xp=0;progress.pet.laserSlotsUnlocked=0;progress.pet.shieldSlotsUnlocked=0;progress.pet.lasers=[];progress.pet.shields=[];progress.pet.activeGear='off';
  }else{
    progress.pet.level=petLevelFromXp(progress.pet.xp);
    const laserCap=petSlotCapacity('laser',progress.pet.level),shieldCap=petSlotCapacity('shield',progress.pet.level);
    progress.pet.inventoryReturns ||= 0;
    progress.pet.lasers ||= [null]; progress.pet.shields ||= [null,null];
    if(progress.pet.lasers.length>laserCap){for(const id of progress.pet.lasers.slice(laserCap))if(id)addInventory(id);progress.pet.lasers=progress.pet.lasers.slice(0,laserCap);}
    if(progress.pet.shields.length>shieldCap){for(const id of progress.pet.shields.slice(shieldCap))if(id)addInventory(id);progress.pet.shields=progress.pet.shields.slice(0,shieldCap);}
    progress.pet.laserSlotsUnlocked=Math.max(1,Math.min(laserCap,Number(progress.pet.laserSlotsUnlocked)||1));
    progress.pet.shieldSlotsUnlocked=Math.max(2,Math.min(shieldCap,Number(progress.pet.shieldSlotsUnlocked)||2));
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
  progress.shipLoadout ||= blankLoadout(progress.activeShipId);compactAllEquipmentSlots();normalizeLoadout();
  normalizePremiumMeta();
  normalizeAdminUnlockState();
  ensureAdminEntitlements();
}
async function flushCloudSave(force=false){
  if(!authenticated||!progress||cloudBusy||(!cloudDirty&&!force))return;
  cloudBusy=true;setSync('SALVANDO','busy');
  try{const result=await saveCloudSave(progress);if(result?.statePatch){const patch=result.statePatch;if(Number.isFinite(Number(patch.credits)))progress.profile.credits=Number(patch.credits);if(patch.serverEconomy)progress.serverEconomy={...(progress.serverEconomy||{}),...patch.serverEconomy};localStorage.setItem(saveKey(),JSON.stringify(progress));updateUI();if(patch.serverEconomy?.lastClanCollectionDate)showToast('CLÃ • coleta diária de 10% sincronizada','system');}cloudDirty=false;setSync('ONLINE','ok');}
  catch(e){console.warn('cloud save',e);if(e?.code==='SAVE_OWNER_MISMATCH'){setSync('BLOQUEADO','err');forceLogoutBecauseSessionMoved('Proteção de conta: um save de outro usuário foi bloqueado.',getUser()?.id||null);return;}setSync('OFFLINE','err');}
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
function compactEquipmentSlots(list){
  const arr=Array.isArray(list)?list:[];
  const filled=arr.filter(Boolean);
  while(filled.length<arr.length)filled.push(null);
  return filled;
}
function compactEquipmentSlotsInPlace(list){
  if(!Array.isArray(list))return list;
  const compact=compactEquipmentSlots(list);
  list.splice(0,list.length,...compact);
  return list;
}
function compactAllEquipmentSlots(){
  if(!progress)return;
  if(progress.shipLoadout){
    for(const key of ['lasers','generators','extras'])if(Array.isArray(progress.shipLoadout[key]))compactEquipmentSlotsInPlace(progress.shipLoadout[key]);
  }
  for(const d of progress.drones||[])if(Array.isArray(d.slots))compactEquipmentSlotsInPlace(d.slots);
  if(progress.pet){
    if(Array.isArray(progress.pet.lasers))compactEquipmentSlotsInPlace(progress.pet.lasers);
    if(Array.isArray(progress.pet.shields))compactEquipmentSlotsInPlace(progress.pet.shields);
  }
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
  for(const key of ['lasers','generators','extras'])compactEquipmentSlotsInPlace(progress.shipLoadout[key]);
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
function liveCatalogKeyForCombat(def){if(!def?.id)return null;if(LASER_AMMO[def.id])return `ammo:${def.id}`;if(ROCKETS[def.id])return `rocket:${def.id}`;return null;}
function canAutoBuy(def){
  if(!def||def.purchasable===false||def.sourceOnly===true)return false;
  const q=liveQuote(liveCatalogKeyForCombat(def));if(!q)return false;
  return q.currency==='credits'?progress.profile.credits>=q.price:progress.profile.uridium>=q.price;
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
  const def=LASER_AMMO[id],q=liveQuote(`ammo:${id}`);if(!autoBuyEnabled()||!q||!canAutoBuy(def))return false;
  state.lastAutoBuyAt=nowSec();runAutoBuy(q.catalog_key,`${shortLaserLabel(id)} +${fmt(def.pack)}`).catch(()=>{});return false;
}
function autoBuyActiveRocket(id,announce=true){
  const def=ROCKETS[id],q=liveQuote(`rocket:${id}`);if(!autoBuyEnabled()||!q||!canAutoBuy(def))return false;
  state.lastAutoBuyAt=nowSec();runAutoBuy(q.catalog_key,`${shortRocketLabel(id)} +${fmt(def.pack)}`).catch(()=>{});return false;
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
  autoBuyActiveLaser(expiredId,announceBuy);
  return switchToWeakerLaser(expiredId);
}
function recoverActiveRocket(expiredId,announceBuy=true){
  if(rocketQty(expiredId)>0)return ROCKETS[expiredId];
  autoBuyActiveRocket(expiredId,announceBuy);
  return switchToWeakerRocket(expiredId);
}
function maybeAutoBuyAmmo(){
  if(!progress||!autoBuyEnabled())return;
  const now=nowSec();if(now-state.lastAutoBuyAt<0.9)return;
  const laser=currentLaserAmmo(),rocket=currentRocket(),laserNeed=Math.max(1,equippedLaserCount()+petLaserIds().length)*30;
  let requested=false;
  if(ammoQty(laser.id)<laserNeed&&canAutoBuy(laser)){const q=liveQuote(`ammo:${laser.id}`);if(q&&!economyRuntime.autoPending.has(q.catalog_key)){requested=true;runAutoBuy(q.catalog_key,`${shortLaserLabel(laser.id)} +${fmt(laser.pack)}`).catch(()=>{});}}
  if(rocketQty(rocket.id)<30&&canAutoBuy(rocket)){const q=liveQuote(`rocket:${rocket.id}`);if(q&&!economyRuntime.autoPending.has(q.catalog_key)){requested=true;runAutoBuy(q.catalog_key,`${shortRocketLabel(rocket.id)} +${fmt(rocket.pack)}`).catch(()=>{});}}
  if(requested)state.lastAutoBuyAt=now;
}
function allEquippedIds(){return [...progress.shipLoadout.lasers,...progress.shipLoadout.generators,...progress.shipLoadout.extras,...progress.drones.flatMap(d=>d.slots)].filter(Boolean);}
function equippedLaserIds(){return [...progress.shipLoadout.lasers,...progress.drones.flatMap(d=>d.slots)].filter(id=>ITEMS[id]?.type==='laser');}
function equippedLaserCount(){return equippedLaserIds().length;}

function petLevelDef(level=progress?.pet?.level||1){return PET_LEVEL_TABLE[Math.max(1,Math.min(PET_MAX_LEVEL,Number(level)||1))]||PET_LEVEL_TABLE[1];}
function petLevelThreshold(level){const lv=Math.max(1,Math.min(PET_MAX_LEVEL,Number(level)||1));return Number(PET_LEVEL_TABLE[lv]?.xp)||0;}
function petLevelXp(level){return petLevelThreshold(Math.min(PET_MAX_LEVEL,(Number(level)||1)+1));}
function petLevelFromXp(xp){let level=1;for(let lv=2;lv<=PET_MAX_LEVEL;lv++){if(Number(xp)>=petLevelThreshold(lv))level=lv;else break;}return level;}
function petSlotCapacity(kind,level=progress?.pet?.level||1){const def=petLevelDef(level);return kind==='laser'?def.laser:kind==='shield'?def.shield:kind==='gear'?def.gear:def.protocol;}
function petLevelBonuses(level=progress?.pet?.level||1){let damage=0,shield=0,tier=1;for(let lv=1;lv<=Math.min(PET_MAX_LEVEL,Number(level)||1);lv++){const d=PET_LEVEL_TABLE[lv];if(d?.damageBonus!=null)damage=Math.max(damage,Number(d.damageBonus)||0);if(d?.shieldBonus!=null)shield=Math.max(shield,Number(d.shieldBonus)||0);if(d?.tier!=null)tier=Math.max(tier,Number(d.tier)||1);}return {damage,shield,tier};}
function petRange(){return 300+(progress?.pet?.owned?(progress.pet.level||1):1)*34;}
function petSlotCost(slotNumber){const v=livePetSlotPrices.get(Number(slotNumber));return Number.isFinite(Number(v))?Number(v):null;}
function petLaserIds(){return progress?.pet?.owned?(progress.pet.lasers||[]).filter(id=>ITEMS[id]?.type==='laser'):[];}
function petShieldIds(){return progress?.pet?.owned?(progress.pet.shields||[]).filter(id=>ITEMS[id]?.type==='generator'&&ITEMS[id]?.subtype==='shield'):[];}
function petDamage(){const levelBonus=petLevelBonuses().damage/100;return petLaserIds().reduce((sum,id)=>{const it=ITEMS[id];const base=it?.alienDamage??it?.damage??0;return sum+base*(1+(Number(it?.alienBonus)||0));},0)*petDesignerDamageMultiplier()*(1+levelBonus);}
function petShieldSupport(){const levelBonus=petLevelBonuses().shield/100;return petShieldIds().reduce((sum,id)=>sum+(ITEMS[id]?.shield||0),0)*(1+levelBonus);}
function petMaxShield(){return petShieldSupport()*(1+Number(petDesignerBonuses().shield||0));}
function addPetXp(amount){
  if(!progress?.pet?.owned||amount<=0||progress.pet.level>=PET_MAX_LEVEL)return;
  progress.pet.xp+=Math.round(amount);
  let leveled=false;
  while(progress.pet.level<PET_MAX_LEVEL&&progress.pet.xp>=petLevelThreshold(progress.pet.level+1)){
    progress.pet.level++;
    leveled=true;
    const def=petLevelDef(progress.pet.level);
    showToast(`AUX-9 subiu para o nível ${progress.pet.level} • ${def.bonus}`);
  }
  if(leveled){saveGame();refreshPetViews();}
}
function unlockPetSlot(kind){
  const pet=progress.pet;if(!pet?.owned){showToast('Adquira o AUX-9 primeiro');return;}
  const key=kind==='laser'?'laserSlotsUnlocked':'shieldSlotsUnlocked',next=(Number(pet[key])||(kind==='shield'?2:1))+1,availableSlots=petSlotCapacity(kind,pet.level);
  if(next>availableSlots){showToast(`Nível ${pet.level}: limite atual de ${availableSlots} slot${availableSlots>1?'s':''} de ${kind==='laser'?'laser':'escudo'}`);return;}
  const cost=petSlotCost(next);if(cost==null){showToast('Preço do slot ainda não sincronizou com o Supabase');refreshLiveOpsState(true).then(()=>refreshPetViews());return;}
  if(progress.profile.uridium<cost){showToast(`Faltam ${fmt(cost-progress.profile.uridium)} STL`);return;}
  openSpendConfirm({title:'Liberar slot do AUX-9?',itemName:`Slot ${next} de ${kind==='laser'?'laser':'escudo'}`,detail:'Preço e desbloqueio serão validados no servidor.',value:cost,currency:'uridium',confirmLabel:'LIBERAR SLOT',onConfirm:()=>runEconomyAction('unlock_pet_slot',{kind}).then(r=>showToast(`Slot ${r?.info?.slot||next} de ${kind==='laser'?'laser':'escudo'} liberado • servidor`)).catch(e=>showToast(e.message||'Desbloqueio recusado'))});
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
  const id=list[index];if(!id)return;list[index]=null;compactEquipmentSlotsInPlace(list);addInventory(id);saveGame();refreshPetViews();refreshAmmoCounters();
}
function buyPetUnit(){
  if(progress?.pet?.owned){showToast('AUX-9 já adquirido');return;}const q=liveQuote('pet:base');if(!q){showToast('AUX-9 indisponível no catálogo LIVE OPS');return;}if(!canAfford(q.price,q.currency)){showToast(`Faltam ${fmt(q.price-(progress.profile[q.currency]||0))} ${q.currency==='uridium'?'STL':'CR'}`);return;}openSpendConfirm({title:'Comprar AUX-9?',itemName:'AUX-9 — Unidade Base',detail:'Preço validado no Supabase e compra aplicada pelo servidor.',value:q.price,currency:q.currency,onConfirm:()=>applyAuthoritativePurchase(q.catalog_key,'AUX-9')});
}
function buyPetGear(id){
  if(!progress?.pet?.owned){showToast('Adquira o AUX-9 primeiro');return;}const gear=PET_GEARS[id];if(!gear)return;if(progress.pet.gearsOwned[id]){showToast('Módulo já comprado');return;}const q=liveQuote(`pet_gear:${id}`);if(!q){showToast('Módulo indisponível no catálogo LIVE OPS');return;}if(!canAfford(q.price,q.currency)){showToast('Saldo insuficiente');return;}openSpendConfirm({title:'Comprar módulo do AUX-9?',itemName:gear.name,detail:'Preço validado no Supabase e compra aplicada pelo servidor.',value:q.price,currency:q.currency,onConfirm:()=>applyAuthoritativePurchase(q.catalog_key,gear.name)});
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
  progress.pet.activeGear=id;petRuntime.taskId=null;petRuntime.taskType='follow';petRuntime.laserTargetId=null;petRuntime.laserUntil=0;saveGame();refreshPetViews();
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
  progress.profile.credits+=credits;if(credits>0)telemetryEconomy('resource',{cr:credits});
  if(total>0){playSfx('pickup');battlePassEvent('dropResource',total);battlePassEvent('box',1);telemetryCounter('boxes',1);telemetryCounter('ore_units',total);titleStatAdd('boxes',1);journeyEvent('box',1);titleStatAdd('oreUnits',total);}
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
  petRuntime.lastShot=nowSec();petRuntime.laserTargetId=task.id;petRuntime.laserUntil=nowSec()+.16;playSfx('petLaser');
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
  const rawBase=Math.round(laserPveBase(ids)*petDesignerDamageMultiplier()*rand(.95,1.08));
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

  const followOrRoam=()=>{
    if(playerMoving){
      const back=(player.angle||0)+Math.PI,side=Math.sin(now*.85)*70;
      targetX=player.x+Math.cos(back)*150+Math.cos(back+Math.PI/2)*side;
      targetY=player.y+Math.sin(back)*150+Math.sin(back+Math.PI/2)*side;
      petRuntime.taskType='escort';petRuntime.taskId=null;
    }else{
      petChooseRoamPoint(mode!==petRuntime.lastMode);
      targetX=petRuntime.roamX;targetY=petRuntime.roamY;
      petRuntime.taskType='roam';petRuntime.taskId=null;
    }
  };

  // Cada módulo executa SOMENTE sua função principal.
  if(mode==='guard'&&pet.gearsOwned.guard){
    task=petPlayerCombatTarget()||petStableEnemyTarget('guard');
    if(task){
      combatTask=task;petRuntime.taskType='guard';petRuntime.taskId=task.id;
      const goal=petMoveGoalNearCombatTarget(task);targetX=goal.x;targetY=goal.y;
    }else followOrRoam();
  }else if(mode==='box'&&pet.gearsOwned.box){
    task=petLockedCollectionTarget(state.loot,'box',l=>!Number.isFinite(l.expiresAt)||now<l.expiresAt);
    if(task){targetX=task.x;targetY=task.y;petRuntime.taskType='box';petRuntime.taskId=task.id;}
    else followOrRoam();
  }else if(mode==='ore'&&pet.gearsOwned.ore){
    if(cargoFree()>0)task=petLockedCollectionTarget(state.ores,'ore');
    if(task){targetX=task.x;targetY=task.y;petRuntime.taskType='ore';petRuntime.taskId=task.id;}
    else followOrRoam();
  }else if(mode==='repair'&&pet.gearsOwned.repair){
    petRuntime.taskId=null;
    if(player.hp<player.maxHp){
      petRuntime.taskType='repair';targetX=player.x+72;targetY=player.y-78;
      player.hp=Math.min(player.maxHp,player.hp+player.maxHp*(0.012+pet.level*0.0008)*dt*(premiumActive()?2:1));
    }else followOrRoam();
  }else if(mode==='kami'&&pet.gearsOwned.kami&&petRuntime.kamiArmed){
    const selected=state.target&&!state.target.isPlayer&&state.target.hp>0&&petWithinPlayerRadar(state.target,petCombatSearchRange())?state.target:null;
    task=selected||petStableEnemyTarget('kami');
    if(task){targetX=task.x;targetY=task.y;petRuntime.taskType='kami';petRuntime.taskId=task.id;}
    else followOrRoam();
  }else{
    // Companhia: apenas acompanha/patrulha. Nenhum ataque, coleta ou reparo automático.
    followOrRoam();
  }
  petRuntime.lastMode=mode;

  const dx=targetX-petRuntime.x,dy=targetY-petRuntime.y,d=Math.hypot(dx,dy);
  let petSpeed=petMovementSpeed(petRuntime.taskType);
  const distanceFromPlayer=Math.hypot(petRuntime.x-player.x,petRuntime.y-player.y),shipTravelSpeed=Math.max(1,Number(player.speed||0)*shipAbilitySpeedMultiplier());
  if(playerMoving){petSpeed=Math.max(petSpeed,shipTravelSpeed);if(distanceFromPlayer>220)petSpeed=Math.max(petSpeed,shipTravelSpeed*1.18);}
  const arrival=d<150?Math.max(.26,d/150):1;
  if(d>5){const step=Math.min(d,petSpeed*arrival*dt);petRuntime.angle=Math.atan2(dy,dx);petRuntime.x+=dx/d*step;petRuntime.y+=dy/d*step;}
  if(distanceFromPlayer>petTetherRange()*1.25){
    const back=(player.angle||0)+Math.PI;petRuntime.x=player.x+Math.cos(back)*130;petRuntime.y=player.y+Math.sin(back)*130;petRuntime.taskId=null;petChooseRoamPoint(true);
  }

  // Só o Sentinela usa lasers.
  if(mode==='guard'&&combatTask&&combatTask.hp>0)petFireAt(combatTask);

  if(mode==='kami'&&petRuntime.kamiArmed&&task&&!task.isPlayer&&task.hp>0&&Math.hypot(task.x-petRuntime.x,task.y-petRuntime.y)<70&&petKamikazeCooldownRemaining()<=0){
    petRuntime.kamiArmed=false;
    petRuntime.lastKami=now;
    progress.pet.kamikazeReadyAt=Date.now()+PET_KAMIKAZE_COOLDOWN*1000;
    const activationId=petRuntime.kamiActivationId;
    const boomDmg=Math.round((3500+pet.level*650+petDamage()*2.5)*(1+pilotKamikazeDamageBonus()));
    const boomRadius=110*(1+pilotKamikazeRadiusBonus());
    const victims=state.enemies.filter(e=>e.hp>0&&Math.hypot(e.x-petRuntime.x,e.y-petRuntime.y)<boomRadius);
    playSfx('explosion');
    spawnParticle(petRuntime.x,petRuntime.y,'NOVA BURST','#ff7d8f');
    victims.forEach(e=>dealDamageToEnemy(e,boomDmg,'#ff7d8f',{canCrit:true,critChance:.08,critMult:1.6}));
    if(activationId===petRuntime.kamiActivationId){
      progress.pet.activeGear='off';petRuntime.taskId=null;petRuntime.taskType='follow';
      saveGame();refreshPetViews();showToast(`Nova Burst concluído • ${PET_KAMIKAZE_COOLDOWN}s de recarga`);
    }
  }
  if(mode==='box'&&task&&Math.hypot(task.x-petRuntime.x,task.y-petRuntime.y)<28){
    if(!Number.isFinite(task.expiresAt)||now<task.expiresAt)sellPetCargoBox(task);
    state.loot=state.loot.filter(x=>x.id!==task.id);petRuntime.taskId=null;
  }
  if(mode==='ore'&&task&&Math.hypot(task.x-petRuntime.x,task.y-petRuntime.y)<24){
    if(task.sharedWorld&&sharedUniverseMap()){if(sharedUniverseOnline()&&!sharedUniverseRuntime.pendingOres.has(task.id)){sharedUniverseRuntime.pendingOres.add(task.id);sharedUniverse.collectOre(task.id);}petRuntime.taskId=null;return;}
    const got=addCargoResource(task.type,task.amount);
    if(got>0){playSfx('pickup');spawnParticle(task.x,task.y,`AUX-9 +${got} ${task.type}`,task.color);pushActivity(`AUX-9 coletou +${fmt(got)} ${task.type} • ${fmt((RESOURCES[task.type]?.sell||0)*got)} CR na base`,'ore');missionEvent('collectOre',{amount:got,type:task.type,mapId:progress.mapId});addPetXp(3);state.ores=state.ores.filter(x=>x.id!==task.id);state.oreRespawns.push({type:task.type,at:nowSec()+rand(5,12)});saveGame();}
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
  const petShieldGenerators=petShieldIds();
  let hp=ship.hp, speed=ship.speed, shield=0, laserDamage=0, absorption=0, rocketMult=1, shieldRegenBoost=0;
  // Combate atual é PvE: respeita dano específico contra aliens e bônus PvE por laser.
  for(const id of laserIds){const it=ITEMS[id];const base=it?.alienDamage??it?.damage??0;laserDamage+=base*(1+(Number(it?.alienBonus)||0));}
  for(const id of genIds){const it=ITEMS[id];speed+=it.speed||0;shield+=it.shield||0;absorption=Math.max(absorption,it.absorption||0);shieldRegenBoost=Math.max(shieldRegenBoost,Number(it.shieldRegenBonus)||0);}
  // V16.7.9: escudos equipados no AUX-9 funcionam como suporte direto da nave, assim como escudos instalados em drones.
  // O bônus de nível do AUX é aplicado à contribuição dele; absorção/regeneração também entram no cálculo da nave.
  shield+=petShieldSupport();
  for(const id of petShieldGenerators){const it=ITEMS[id];absorption=Math.max(absorption,it.absorption||0);shieldRegenBoost=Math.max(shieldRegenBoost,Number(it.shieldRegenBonus)||0);}
  if(ship.bonusLowMaps&&low){hp+=ship.bonusLowMaps.hp;speed+=ship.bonusLowMaps.speed;shield*=ship.bonusLowMaps.shieldMult;laserDamage*=ship.bonusLowMaps.laserMult;rocketMult=ship.bonusLowMaps.rocketMult;}
  hp+=pilotSkillValue('hull1')+pilotSkillValue('hull2');
  shield*=1+pilotSkillValue('shieldEngineering')/100;
  laserDamage*=1+pilotSkillValue('alienHunter')/100;
  if(state.currentMap?.battle||state.currentMap?.gate)laserDamage*=1+pilotBattleLaserBonus();
  absorption=Math.min(95,absorption+pilotSkillValue('shieldMechanics'));
  rocketMult*=1+pilotSkillValue('rocketFusion')/100;
  const shipDesignBonus=shipDesignerBonuses(),petDesignBonus=petDesignerBonuses();
  hp*=1+Number(shipDesignBonus.hp||0)+Number(petDesignBonus.hp||0);
  shield*=1+Number(shipDesignBonus.shield||0)+Number(petDesignBonus.shield||0);
  laserDamage*=1+Number(shipDesignBonus.damage||0);
  const designerMult=droneDesignerMultipliers();hp*=designerMult.hp;shield*=designerMult.shield;laserDamage*=designerMult.damage;
  if(economyBoostActive('weapon'))laserDamage*=1+economyServiceEffect('weapon','laser_damage_pct',3)/100;if(economyBoostActive('shield'))shield*=1+economyServiceEffect('shield','shield_pct',5)/100;if(economyBoostActive('thruster'))speed+=economyServiceEffect('thruster','speed_flat',5);
  player.maxHp=Math.round(hp);player.maxShield=Math.round(shield);player.speed=Math.round(speed);player.laserDamage=Math.round(laserDamage);player.shieldAbsorption=absorption;player.rocketMult=rocketMult;player.shieldRegenBoost=shieldRegenBoost;
  player.hp=keepRatio?Math.min(player.maxHp,Math.max(1,Math.round(player.maxHp*oldHpRatio))):player.maxHp;
  player.shield=keepRatio?Math.min(player.maxShield,Math.max(0,Math.round(player.maxShield*oldShieldRatio))):player.maxShield;
  progress.hp=player.hp;progress.shield=player.shield;
}

function initializeFaction(factionId){
  state.lastPlayerDamageAt=nowSec();
  progress=freshSave(factionId);telemetryStartSession();refreshPremiumState(true).catch(()=>{});state.currentMap=MAPS.x1;player.hp=SHIPS.phoenix.hp;player.shield=1000;computeStats(false);setMap('x1',false);ui.factionModal.classList.add('hidden');buildAmmoButtons();renderAll();saveGame();flushCloudSave(true);showToast(`Bem-vindo à ${FACTIONS[factionId].name}`);
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
  for(const l of state.landmarks){const key=`${progress.mapId}:${l.id}`;if(progress.discoveries[key])continue;if(Math.hypot(player.x-l.x,player.y-l.y)>105)continue;progress.discoveries[key]=true;const tier=state.currentMap.battle?8:Math.max(1,state.currentMap.tier||1),cr=750+tier*450,xp=Math.round((180+tier*90)*designerXpMultiplier());progress.profile.credits+=cr;progress.profile.xp+=xp;telemetryEconomy('discovery',{cr,xp});processPlayerLevelUps();spawnParticle(l.x,l.y-24,`DESCOBERTA +${fmt(cr)} CR`,'#74e7ff');spawnImpactFx(l.x,l.y,'#74e7ff',46,'shield');missionEvent('explore',{landmark:l,mapId:progress.mapId});showToast(`Descoberta: ${l.name} • +${fmt(cr)} CR • +${fmt(xp)} XP`);saveGame();}
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
  const names=state.currentMap.ores||[];let oreType=type;if(!oreType){const weights=state.currentMap.oreWeights||{},total=names.reduce((sum,k)=>sum+Math.max(.01,Number(weights[k])||1),0);let roll=Math.random()*Math.max(.01,total);for(const k of names){roll-=Math.max(.01,Number(weights[k])||1);if(roll<=0){oreType=k;break;}}oreType ||= names[0]||'Prometium';}const pos=randomMapPosition(100);const res=RESOURCES[oreType]||{color:'#fff'};
  state.ores.push({id:`ore_${Math.random().toString(16).slice(2)}`,x:pos.x,y:pos.y,type:oreType,amount:1,color:res.color,r:rand(7,13),rot:rand(0,TWO_PI),shape:Array.from({length:7},()=>rand(.72,1.18))});
}
function createOres(){state.ores=[];state.oreRespawns=[];const count=state.currentMap.oreCount||(state.currentMap.battle?72:48);for(let i=0;i<count;i++)spawnOre();}
function makeEnemy(type){
  const base=NPC_TYPES[type],cluster=state.landmarks.length&&Math.random()<.74?state.landmarks[Math.floor(Math.random()*state.landmarks.length)]:null;
  let pos=cluster?{x:cluster.x+rand(-520,520),y:cluster.y+rand(-420,420)}:randomMapPosition(160);
  pos.x=Math.max(160,Math.min(state.currentMap.world.w-160,pos.x));pos.y=Math.max(160,Math.min(state.currentMap.world.h-160,pos.y));
  if(progress?.mapId==='x1'&&safeZoneDistance(pos.x,pos.y)<SAFE_ZONE.radius+180)pos=randomMapPosition(180);
  const battle=state.currentMap?.battle;return {id:`${type}_${Math.random().toString(16).slice(2,9)}`,type,name:base.name,x:pos.x,y:pos.y,hp:base.hp,maxHp:base.hp,shield:base.shield,maxShield:base.shield,credits:base.credits,uridium:base.uridium,xp:base.xp,speed:base.speed,baseSpeed:base.speed,damage:base.damage,baseDamage:base.damage,bossPhase:0,bossAttackScale:1,jammedUntil:0,color:base.color,size:base.size,resources:{...(base.resources||{})},attackRange:Math.min(500,(battle?250:230)+base.size*5.8),aggroRange:800,lastShot:0,angle:rand(0,TWO_PI),drift:rand(.4,1.4)};
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
  const gd=galaxyGateDef();
  e.hp=e.maxHp=Math.max(1,Math.round(e.maxHp*(gd.enemyScale||1)));
  e.shield=e.maxShield=Math.max(0,Math.round(e.maxShield*(gd.enemyScale||1)));
  e.damage=e.baseDamage=Math.max(1,Math.round(e.damage*(gd.damageScale??gd.enemyScale??1)));
  e.credits=Math.round(e.credits*(gd.rewardScale||1));e.uridium=Math.round(e.uridium*(gd.rewardScale||1));e.xp=Math.round(e.xp*(gd.rewardScale||1));
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
  const a=alphaGate(),gd=galaxyGateDef();
  a.run={active:true,round:1,waveIndex:0,remaining:{},nextWaveAt:0,nextRoundAt:0,killRewards:{credits:0,uridium:0,xp:0},roundRewardsClaimed:[],startedAt:Date.now()};
  a.lives=Math.max(gd.baseLives,Math.min(gd.maxLives,Number(a.lives)||gd.baseLives));
}
function setupAlphaMap(resume=false){
  sharedUniverse.close();sharedUniverseRuntime.ready=false;sharedUniverseRuntime.event=null;updateSharedUniverseChip();
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
  const gd=galaxyGateDef();if(!a.built&&!a.run){showToast(`Monte as ${gd.pieces} peças do ${gd.label} primeiro`);return;}
  if(!isAtTrader()){showToast(`O Portal Astral ${gd.label} só pode ser acessado pela base X-1`);return;}
  if(a.lives<=0){showToast(`O portal ${gd.label} foi perdido`);return;}
  if(!a.run)initAlphaRun();
  ui.gateModal?.classList.add('hidden');
  state.jumping=true;player.laserFiring=false;playSfx('portal');ui.jumpTitle.textContent=`X-1 → ${galaxyGateDef().label}`;ui.jumpSubtitle.textContent='PORTAL ASTRAL';ui.jumpTransition.classList.remove('hidden');
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
function grantGateRoundReward(roundNo){
  const a=alphaGate(),gd=galaxyGateDef(),run=a.run;if(!run)return;
  run.roundRewardsClaimed=Array.isArray(run.roundRewardsClaimed)?run.roundRewardsClaimed:[];
  if(run.roundRewardsClaimed.includes(roundNo))return;
  const r=gd.roundReward||{};normalizePilotBio();
  if(r.credits){const gain=Math.round(r.credits);progress.profile.credits+=gain;telemetryEconomy('gate',{cr:gain});}
  if(r.cores)progress.pilotBio.logDisks+=Math.round(r.cores);
  if(r.ammoId&&r.ammoQty){progress.ammo ||= {};progress.ammo[r.ammoId]=(progress.ammo[r.ammoId]||0)+Math.round(r.ammoQty);}
  run.roundRewardsClaimed.push(roundNo);cloudDirty=true;
  showToast(`${gd.label} • Round ${roundNo} concluído • ${gateRoundRewardText(gd)}`,'reward');
  pushActivity(`PORTAL ${gd.label} • Round ${roundNo} • ${gateRoundRewardText(gd)}`,'reward');
}
function grantGateFinalPackage(gd){
  const r=gd.finalReward||{};normalizePilotBio();progress.ammo ||= {};progress.rockets ||= {};progress.cargo ||= {};
  const gateCr=Math.round(r.credits||0),gateStl=Math.round(r.uridium||0);progress.profile.credits+=gateCr;progress.profile.uridium+=gateStl;telemetryEconomy('gate',{cr:gateCr,stl:gateStl});progress.pilotBio.logDisks+=Math.round(r.cores||0);
  if(r.ammoId&&r.ammoQty)progress.ammo[r.ammoId]=(progress.ammo[r.ammoId]||0)+Math.round(r.ammoQty);
  if(r.rocketId&&r.rocketQty)progress.rockets[r.rocketId]=(progress.rockets[r.rocketId]||0)+Math.round(r.rocketQty);
  if(r.voidite)progress.cargo.Xenomit=(progress.cargo.Xenomit||0)+Math.round(r.voidite);
}
function completeAlphaGate(){
  const a=alphaGate(),gd=galaxyGateDef(),earned=alphaRunReward();
  grantGateRoundReward(a.run?.round||gd.rounds.length);
  const extra=Math.max(0,gd.totalRewardMult-1),bonus={credits:Math.round(earned.credits*extra),uridium:Math.round(earned.uridium*extra),xp:Math.round(earned.xp*extra*designerXpMultiplier())};
  progress.profile.credits+=bonus.credits;progress.profile.uridium+=bonus.uridium;progress.profile.xp+=bonus.xp;telemetryEconomy('gate',{cr:bonus.credits,stl:bonus.uridium,xp:bonus.xp});grantGateFinalPackage(gd);processPlayerLevelUps();
  progress.profile.ggCompleted=(progress.profile.ggCompleted||0)+1;syncAchievements(true);a.completed++;a.lastCompletion={at:Date.now(),reward:{...earned,bonus,package:{...(gd.finalReward||{})}},totalMult:gd.totalRewardMult};a.pieces=[];a.built=false;a.lives=gd.baseLives;a.run=null;
  playSfx('reward');showToast(`${gd.label} CONCLUÍDO! • ${fmt(gd.finalReward?.cores||0)} Núcleos • pacote final entregue`,'reward');pushActivity(`PORTAL ASTRAL ${gd.label} • FINAL • ${gateFinalRewardText(gd)}`,'reward');saveGame();
  claimGateDroneDesignerDrop(gd.key,a.completed).catch(()=>{});
  setTimeout(()=>runMapTransition('x1',null,`${gd.label} CONCLUÍDO • PACOTE FINAL RECEBIDO`),1800);
}
function failAlphaGate(){const a=alphaGate(),gd=galaxyGateDef();a.failed++;a.pieces=[];a.built=false;a.lives=gd.baseLives;a.run=null;showToast(`PORTAL ASTRAL ${gd.label} PERDIDO — sem vidas restantes; o portal precisa ser remontado`);saveGame();setTimeout(()=>runMapTransition('x1',null,`${gd.label} PERDIDO`),900);}
function handleAlphaDeath(){const a=alphaGate(),gd=galaxyGateDef();telemetryCounter('deaths',1);titleStatAdd('deaths',1);syncAlphaGateSnapshot();a.lives=Math.max(0,a.lives-1);if(a.lives<=0){failAlphaGate();return;}a.run.active=true;progress.mapId='x1';progress.territoryFaction=progress.profile.faction;const b=basePointForFaction(progress.profile.faction);player.x=b.x;player.y=b.y;player.tx=b.x;player.ty=b.y;progress.x=b.x;progress.y=b.y;progress.hp=1;player.hp=1;player.shield=0;progress.shield=0;state.currentMap=MAPS.x1;state.radarRange=mapRadarRange();state.enemies=[];state.loot=[];state.ores=[];state.landmarks=[];state.target=null;state.repairRequired={shipId:progress.activeShipId,source:`Portal Astral ${gd.label}`};saveGame();openRepairModal();showToast(`${gd.label}: -1 vida • ${a.lives} restante(s) • repare sua nave na base e retorne ao mesmo Round`);}
function updateAlphaGate(){
  if(!isGalaxyGateMap())return;
  const a=alphaGate(),run=a.run;if(!run?.active)return;
  const gd=galaxyGateDef(),def=gd.rounds[run.round-1];if(!def)return;
  const now=Date.now(),alive=alphaRemainingCount();

  if(run.waveIndex<def.waves.length&&!run.nextWaveAt)run.nextWaveAt=now+GALAXY_ALPHA_WAVE_INTERVAL_MS;
  if(run.waveIndex<def.waves.length&&run.nextWaveAt&&now>=run.nextWaveAt){run.nextWaveAt=0;spawnAlphaWave();return;}

  if(run.waveIndex>=def.waves.length&&alive===0){
    grantGateRoundReward(run.round);
    if(run.round>=gd.rounds.length){completeAlphaGate();return;}
    if(!run.nextRoundAt){run.nextRoundAt=now+GALAXY_ALPHA_ROUND_INTERVAL_MS;showToast(`Round ${run.round} concluído • próximo round em ${Math.round(GALAXY_ALPHA_ROUND_INTERVAL_MS/1000)}s`);saveGame();}
    else if(now>=run.nextRoundAt){run.round++;run.waveIndex=0;run.remaining={};run.nextRoundAt=0;run.nextWaveAt=now+GALAXY_ALPHA_WAVE_INTERVAL_MS;showToast(`${gd.label} • Round ${run.round} começa em ${Math.round(GALAXY_ALPHA_WAVE_INTERVAL_MS/1000)}s`);saveGame();}
  }
  renderGateHud();
}

function processRespawns(){
  if(sharedUniverseMap())return;
  const now=nowSec();state.enemies=state.enemies.filter(e=>e.hp>0||!e.deadAt||now-e.deadAt<1.2);
  for(let i=state.enemyRespawns.length-1;i>=0;i--)if(now>=state.enemyRespawns[i].at){state.enemies.push(makeEnemy(state.enemyRespawns[i].type));state.enemyRespawns.splice(i,1);}
  for(let i=state.oreRespawns.length-1;i>=0;i--)if(now>=state.oreRespawns[i].at){spawnOre(state.oreRespawns[i].type);state.oreRespawns.splice(i,1);}
}
function factionBattleMap(){const id=progress?.profile?.faction;return id==='earth'?'b41':id==='mars'?'b42':'b43';}

function graphNode(label){return MAP_GRAPH_NODES.find(n=>n.id===label)||null;}
function graphNeighbors(label){
  const out=[];
  for(const [a,b,bidirectional=true] of MAP_GRAPH_LINKS){
    if(a===label)out.push(b);
    else if(b===label&&bidirectional!==false)out.push(a);
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
  // V17.6.0: grava a posição do mapa de origem antes de alterar mapId/território.
  if(progress&&state?.currentMap)syncRuntimeLocationToProgress(true);
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
  clearOnlinePlayers();createLandmarks();state.ores=[];state.enemies=[];state.enemyRespawns=[];state.oreRespawns=[];galaxyEventRuntime.mapKey=null;sharedUniverseRuntime.event=null;joinSharedUniverse();saveGame();
  forceAuthoritativeLocationCheckpoint(false);
  if(authenticated)flushCloudSave(true).catch(()=>{});

  const owner=territoryOwner(),home=isOwnTerritory();
  showToast(mapId==='x1'?(home?`Base ${owner?.short||''} • Zona Segura`:`INVASÃO • Base ${owner?.short||''}`):`Entrando em ${displayMapLabel(mapId,currentTerritoryFaction())}`);
  renderMapModal();syncOnlineWorld();
}
function runMapTransition(targetMapId,fromMapId=null,mode='PORTAL QUÂNTICO',targetTerritoryFaction=null,fromGraphLabel=null){
  if(state.jumping||!MAPS[targetMapId])return;
  telemetryCounter('map_jumps',1);titleStatAdd('mapJumps',1);journeyEvent('jump',1);
  state.jumping=true;player.laserFiring=false;playSfx('portal');ui.portalPrompt?.classList.add('hidden');

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
  const access=canTravelGraphLabel(portal.targetLabel||displayMapLabel(portal.to,portal.targetTerritoryFaction));
  if(!access.ok){showToast(access.reason);playSfx('warning');return;}
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
  createLandmarks();state.ores=[];state.enemies=[];state.enemyRespawns=[];state.oreRespawns=[];sharedUniverseRuntime.event=null;joinSharedUniverse();
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
    progress.profile.uridium-=SHIP_REPAIR_URI_COST;telemetrySpend('uridium',SHIP_REPAIR_URI_COST);
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
  progress.profile.uridium-=SHIP_REPAIR_URI_COST;telemetrySpend('uridium',SHIP_REPAIR_URI_COST);
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
  telemetryCounter('deaths',1);titleStatAdd('deaths',1);
  // A nova taxa de reparo substitui a antiga perda automática de 5% dos Créditos.
  movePlayerToHomeBase();
  resolveDeathRepair({allowAuto:true});
}
function spawnNpcLootBox(enemy){
  if(!enemy)return;
  const lootMult=1+pilotLootBonus(),boostedResources=Object.fromEntries(Object.entries(enemy.resources||{}).map(([id,q])=>[id,Math.max(1,Math.round(q*lootMult))]));
  state.loot.push({id:`box_${Math.random().toString(16).slice(2)}`,x:enemy.x,y:enemy.y,resources:boostedResources,source:enemy.name,spawnedAt:nowSec(),expiresAt:nowSec()+CARGO_BOX_LIFETIME_SEC});
}
function rewardEnemyKill(enemy){
  const creditMult=1+pilotSkillValue('greed')/100,uriMult=1+pilotCombined('cruelty1','cruelty2')/100,xpMult=1+pilotSkillValue('tactics')/100;
  const earnedCredits=Math.round(enemy.credits*creditMult),earnedUri=Math.round(enemy.uridium*uriMult),earnedXp=Math.round((Number(enemy.xp)||enemy.credits/10+enemy.uridium*12)*xpMult*designerXpMultiplier());
  progress.profile.credits+=earnedCredits;progress.profile.uridium+=earnedUri;progress.profile.xp+=earnedXp;progress.profile.aliensKilled=(progress.profile.aliensKilled||0)+1;telemetryEconomy('npc',{cr:earnedCredits,stl:earnedUri,xp:earnedXp});telemetryCounter('kills',1);journeyEvent('kill',1);syncAchievements(true);
  if(authenticated){const boss=/^boss/i.test(String(enemy.type||''));const clanType=String(enemy.type||'').replace(/^boss/i,'').toLowerCase();recordClanAlienKillOnline({npcType:clanType,isBoss:boss}).then(r=>{if(r?.status?.leveled_up){showToast(`CLÃ SUBIU PARA O LV ${r.status.new_level}!`,'reward');refreshClanState(true);}}).catch(()=>{});}
  pushActivity(`${enemy.name} • +${fmt(earnedCredits)} CR • +${fmt(earnedUri)} STL • +${fmt(earnedXp)} XP`,'combat');
  if(String(enemy.type||'').startsWith('boss')){if(!enemy.sharedReward||enemy.sharedOwner)rollRareBossLoot(enemy);scoreClanWar(enemy.sharedReward?Math.max(1,Math.round(10*Number(enemy.sharedRewardShare||0))):10,'boss_kill');}
  addPetXp(Math.max(12,Math.round(enemy.credits/120+enemy.uridium*4)));
  processPlayerLevelUps();
  if(enemy.sharedDropBox!==false)spawnNpcLootBox(enemy);
  missionEvent('kill',{enemy,mapId:progress.mapId});battlePassEvent('kill',1);
  if(isGalaxyGateMap()&&enemy.gateEnemy){recordAlphaKillReward(enemy);syncAlphaGateSnapshot();}else if(!sharedUniverseMap()&&!enemy.eventNpc)scheduleEnemyRespawn(enemy.type);
  saveGame();
}
function dealDamageToEnemy(enemy,damage,color,opts={}){
  if(enemy?.sharedWorld&&sharedUniverseMap()){let requested=Math.max(0,Math.round(damage));let critical=false;if(opts.canCrit){const roll=combatCritical(requested,{chance:opts.critChance??.065,mult:opts.critMult??1.55});requested=roll.damage;critical=roll.critical;}if(!sharedUniverseOnline()){setCombatAlert('UNIVERSO RECONECTANDO','danger',1.5);return 0;}const hitId=`hit_${Date.now()}_${Math.random().toString(16).slice(2)}`;if(isPortalNeutralZone())state.portalCombatUntil=Math.max(state.portalCombatUntil,nowSec()+6);sharedUniverse.damageNpc({entityId:enemy.id,damage:requested,mode:'damage',hitId,critical});if(critical){playSfx('critical');triggerCombatFlash('gold');}return requested;}
  let requested=Math.max(0,Math.round(damage));let critical=false;if(opts.canCrit){const roll=combatCritical(requested,{chance:opts.critChance??.065,mult:opts.critMult??1.55});requested=roll.damage;critical=roll.critical;}
  const before=Math.max(0,Number(enemy.shield)||0)+Math.max(0,Number(enemy.hp)||0);
  let remain=requested;const hadShield=enemy.shield>0;if(enemy.shield>0){const a=Math.min(enemy.shield,remain);enemy.shield-=a;remain-=a;}if(remain>0)enemy.hp-=remain;
  const after=Math.max(0,Number(enemy.shield)||0)+Math.max(0,Number(enemy.hp)||0),actual=Math.max(0,Math.round(before-after));
  if(actual>0){enemy.playerProvoked=true;enemy.lastProvokedAt=nowSec();battlePassEvent('damage',actual);battlePassEvent('attack',1);playSfx(critical?'critical':(hadShield?'shield':'impact'));}
  spawnCombatText(enemy.x,enemy.y-enemy.size,critical?`CRÍTICO ${fmt(actual)}`:`-${fmt(actual)}`,critical?'#ffe96f':(hadShield?'#62dcff':color),{critical,kind:hadShield?'shield':'damage'});spawnImpactFx(enemy.x,enemy.y,hadShield?'#55d8ff':color,critical?38:(hadShield?30:22),hadShield?'shield':'impact');
  if(critical)triggerCombatFlash('gold');
  if(enemy.worldBoss){if(actual>0)warfrontRuntime.pendingBossDamage+=actual;if(enemy.hp<=0)enemy.hp=1;flushWorldBossDamage();return actual;}
  if(enemy.hp<=0){enemy.hp=0;enemy.deadAt=nowSec();playSfx('explosion');spawnExplosionFx(enemy.x,enemy.y,enemy.color,enemy.type.startsWith('boss'));triggerCombatFlash(enemy.type.startsWith('boss')?'red':'cyan');galaxyEventKill(enemy);rewardEnemyKill(enemy);if(state.target?.id===enemy.id){state.target=null;player.laserFiring=false;autoAcquireNextTarget(enemy.id);}}
  return actual;
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
    if(enemy.sharedWorld&&sharedUniverseMap()){if(!sharedUniverseOnline()){setCombatAlert('UNIVERSO RECONECTANDO','danger',1.5);return 0;}if((enemy.shield||0)<=0){spawnParticle(enemy.x,enemy.y-enemy.size,'SEM ESCUDO','#79f1ff');return 0;}if(isPortalNeutralZone())state.portalCombatUntil=Math.max(state.portalCombatUntil,nowSec()+6);sharedUniverse.damageNpc({entityId:enemy.id,damage:requested,mode:'shield_drain',hitId:`sab_${Date.now()}_${Math.random().toString(16).slice(2)}`});return requested;}
    const drained=Math.min(Math.max(0,enemy.shield||0),requested);
    if(drained<=0){spawnParticle(enemy.x,enemy.y-enemy.size,'SEM ESCUDO','#79f1ff');return 0;}
    enemy.shield=Math.max(0,enemy.shield-drained);enemy.playerProvoked=true;enemy.lastProvokedAt=nowSec();playSfx('shield');
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
  if(damage>0)dealDamageToEnemy(enemy,damage,color||ammo?.color||'#7edcff',{canCrit:true,critChance:.065,critMult:1.55});
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
  playSfx('laser');

  if(state.target.isPlayer){
    if(!pvpTargetAllowed(state.target)){player.laserFiring=false;showToast('Fogo amigo bloqueado');return;}
    if(state.pvpShotPending)return;
    const shotAmmo=ammo,base=pvpLaserBase(firingIds),raw=Math.round(base*(Number(shotAmmo.mult)||1)*rand(.95,1.08));
    player.lastLaserShot=nowSec();
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
  player.lastLaserShot=nowSec();
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
    state.pvpRocketPending=true;player.lastRocketShot=nowSec();
    queuePvpAttackOnline({
      targetUserId:state.target.id,
      damage:Math.round(shotRocket.damage*player.rocketMult),
      shieldDrain:false,
      mapId:progress.mapId,
      territoryFaction:onlineTerritoryKey()
    })
      .then(row=>{
        if(!row?.accepted)return;
        playSfx('rocket');setTimeout(()=>playSfx('explosion'),220);
        progress.rockets[shotRocket.id]=Math.max(0,(progress.rockets[shotRocket.id]||0)-1);
        state.rocketFx.push({
          sx:player.x,sy:player.y,tx:state.target.x,ty:state.target.y,color:shotRocket.color,
          born:nowSec(),duration:Math.max(.18,Math.min(.48,enemyDistance(state.target)/1700)),size:5,rocketId:shotRocket.id
        });
        refreshAmmoCounters();saveGame();
        if(progress.rockets[shotRocket.id]<=0)recoverActiveRocket(shotRocket.id,true);
      })
      .catch(e=>showToast(String(e?.message||e).replace(/^.*?:\s*/,'')))
      .finally(()=>{state.pvpRocketPending=false;});
    return;
  }

  const shotRocket=r;
  player.lastRocketShot=nowSec();
  playSfx('rocket');
  progress.rockets[shotRocket.id]=Math.max(0,(progress.rockets[shotRocket.id]||0)-1);
  state.rocketFx.push({
    sx:player.x,sy:player.y,tx:state.target.x,ty:state.target.y,color:shotRocket.color,
    born:nowSec(),duration:Math.max(.18,Math.min(.48,enemyDistance(state.target)/1700)),size:5,rocketId:shotRocket.id
  });

  const rocketHitChance=Math.min(1,.90+pilotSkillValue('heatSeeking')/100);
  if(Math.random()<=rocketHitChance)dealDamageToEnemy(state.target,Math.round(shotRocket.damage*player.rocketMult*shipAbilityDamageMultiplier()),shotRocket.color,{canCrit:true,critChance:.10,critMult:1.70});
  else spawnParticle(state.target.x,state.target.y-state.target.size,'MÍSSIL ERROU','#ffb36d');

  refreshAmmoCounters();saveGame();
  if(progress.rockets[shotRocket.id]<=0)recoverActiveRocket(shotRocket.id,true);
}
function takePlayerDamage(dmg,opts={}){
  const baseSafe=isBaseSafeZone(),portalSafe=isPortalNeutralZone();
  if(baseSafe&&!opts.forcePvP)return;
  if(portalSafe&&!opts.forcePvP&&!opts.forceNpcRetaliation)return;
  dmg*=shipAbilityIncomingMultiplier();
  if(pilotEvasion()>0&&Math.random()<pilotEvasion()){spawnCombatText(player.x,player.y-35,'EVASÃO','#66d9ff',{kind:'evade'});return;}
  state.lastPlayerDamageAt=nowSec();
  const beforeShield=player.shield,beforeHp=player.hp,hadShield=player.shield>0,absorb=Math.max(0,Math.min(100,player.shieldAbsorption))/100;let shieldPart=dmg*absorb;let hullPart=dmg-shieldPart;
  if(player.shield>0){const got=Math.min(player.shield,shieldPart);player.shield-=got;shieldPart-=got;hullPart+=shieldPart;}else hullPart+=shieldPart;
  player.hp-=hullPart;playSfx(hadShield?'shield':'impact');spawnImpactFx(player.x,player.y,hadShield?'#55d8ff':'#ff6078',hadShield?38:28,hadShield?'shield':'impact');spawnCombatText(player.x,player.y-42,`-${fmt(Math.max(0,beforeHp-player.hp)+Math.max(0,beforeShield-player.shield))}`,hadShield?'#67ddff':'#ff6c83',{kind:'incoming'});
  if(beforeShield>0&&player.shield<=0){setCombatAlert('ESCUDO ROMPIDO','shield',2.3);triggerCombatFlash('blue');}
  const ratio=player.hp/Math.max(1,player.maxHp);if(ratio<=.25&&!state.lowHpWarned){state.lowHpWarned=true;setCombatAlert('CASCO CRÍTICO','danger',3);triggerCombatFlash('red');}else if(ratio>.38)state.lowHpWarned=false;
}
function collectCargoBox(drop){
  const before=cargoFree();let total=0;const picked=[];
  for(const [id,qty] of Object.entries(drop.resources||{})){
    const got=addCargoResource(id,qty);
    if(got>0){drop.resources[id]-=got;if(drop.resources[id]<=0)delete drop.resources[id];total+=got;picked.push(`${fmt(got)} ${id}`);}
  }
  if(total>0){
    playSfx('pickup');
    battlePassEvent('dropResource',total);
    if(!drop.battlePassBoxCounted){drop.battlePassBoxCounted=true;battlePassEvent('box',1);telemetryCounter('boxes',1);titleStatAdd('boxes',1);journeyEvent('box',1);}telemetryCounter('ore_units',total);titleStatAdd('oreUnits',total);
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
    progress.x=player.x;progress.y=player.y;progress.hp=player.hp;progress.shield=player.shield;syncSharedUniversePlayer();
    if(ui.repairModal?.classList.contains('hidden'))openRepairModal();
    return;
  }
  const dx=player.tx-player.x,dy=player.ty-player.y,d=Math.hypot(dx,dy),wasMoving=d>2;if(wasMoving){movementPositionRuntime.wasMoving=true;movementPositionRuntime.hasMovedSinceLoad=true;const step=Math.min(d,player.speed*shipAbilitySpeedMultiplier()*dt);player.x+=dx/d*step;player.y+=dy/d*step;}
  let desiredAngle=player.angle||0;
  if(state.target&&state.target.hp>0)desiredAngle=Math.atan2(state.target.y-player.y,state.target.x-player.x);
  else if(d>3)desiredAngle=Math.atan2(dy,dx);
  player.angle=(player.angle||0)+angleDelta(player.angle||0,desiredAngle)*Math.min(1,dt*9);
  player.x=Math.max(35,Math.min(state.currentMap.world.w-35,player.x));player.y=Math.max(35,Math.min(state.currentMap.world.h-35,player.y));
  // Checkpoint leve: salva apenas coordenadas localmente durante o movimento, sem gravar o save inteiro a cada frame.
  syncRuntimeLocationToProgress(false);
  syncAuthoritativePlayerLocation(false);
  const stillMoving=Math.hypot(player.tx-player.x,player.ty-player.y)>2;
  if(movementPositionRuntime.wasMoving&&!stillMoving){movementPositionRuntime.wasMoving=false;commitRuntimePosition('movement_end');}
  state.camera.x+=(player.x-state.camera.x)*.08;state.camera.y+=(player.y-state.camera.y)*.08;
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
    const shieldTick=(repairBot?.id==='repElite'?15000:10000)*(premiumActive()?2:1)*designerRepairMultiplier();
    const beforeShield=player.shield;
    player.shield=Math.min(player.maxShield,player.shield+shieldTick);
    state.shieldRepairFxAt=nowSec();
    const gained=Math.max(0,Math.round(player.shield-beforeShield));
    if(gained>0){playSfx('repair');spawnParticle(player.x,player.y,`ESCUDO +${fmt(gained)}`,'#62d9ff');spawnRepairFx(player.x,player.y,'#62d9ff','shieldcharge');}
  }

  const hpCanRepair=baseSafe||!!repairBot;
  const hpDelayReady=baseSafe||secondsWithoutDamage>=Number(repairBot?.repairDelay||5);
  if(hpCanRepair&&hpDelayReady&&player.hp<player.maxHp&&nowSec()-state.repairFxAt>=1){
    const hpTick=(repairBot?.id==='repElite'?10000:5000)*(premiumActive()?2:1)*designerRepairMultiplier();
    const beforeHp=player.hp;
    player.hp=Math.min(player.maxHp,player.hp+hpTick);
    state.repairFxAt=nowSec();
    const gained=Math.max(0,Math.round(player.hp-beforeHp));
    if(gained>0){playSfx('repair');spawnParticle(player.x,player.y,`${baseSafe?'BASE':'AUTO REPAIR'} +${fmt(gained)} HP`,'#73ffc0');spawnRepairFx(player.x,player.y,'#73ffc0','repair');}
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
  for(let i=state.ores.length-1;i>=0;i--){const o=state.ores[i];if(Math.hypot(o.x-player.x,o.y-player.y)<30){if(o.sharedWorld&&sharedUniverseMap()){if(cargoFree()<=0){showToast('Porão cheio');continue;}if(sharedUniverseOnline()&&!sharedUniverseRuntime.pendingOres.has(o.id)){sharedUniverseRuntime.pendingOres.add(o.id);sharedUniverse.collectOre(o.id);}continue;}const got=addCargoResource(o.type,o.amount);if(got>0){playSfx('pickup');spawnParticle(o.x,o.y,`+${got} ${o.type}`,o.color);pushActivity(`Pedra • +${fmt(got)} ${o.type} • ${fmt((RESOURCES[o.type]?.sell||0)*got)} CR na base`,'ore');telemetryCounter('ore_nodes',1);telemetryCounter('ore_units',got);titleStatAdd('oreUnits',got);journeyEvent('ore',got);missionEvent('collectOre',{amount:got,type:o.type,mapId:progress.mapId});galaxyEventOrePickup(o,got);state.ores.splice(i,1);{const min=Math.max(1,Number(state.currentMap.oreRespawnMinMs||5000)/1000),max=Math.max(min,Number(state.currentMap.oreRespawnMaxMs||12000)/1000);state.oreRespawns.push({type:o.type,at:nowSec()+rand(min,max)});}saveGame();}else showToast('Porão cheio');}}
  if(player.hp<=0){
    if(isGalaxyGateMap())handleAlphaDeath();
    else handleNormalShipDeath();
  }
  progress.hp=player.hp;progress.shield=player.shield;progress.x=player.x;progress.y=player.y;syncSharedUniversePlayer();
}
function updateBossPhase(e){
  if(!e?.type?.startsWith('boss')||e.hp<=0)return;const total=Math.max(1,e.maxHp+e.maxShield),remain=Math.max(0,e.hp)+Math.max(0,e.shield),ratio=remain/total;let next=e.bossPhase||0;if(ratio<=.33)next=2;else if(ratio<=.66)next=Math.max(next,1);if(next===(e.bossPhase||0))return;e.bossPhase=next;
  const mult=next===1?1.16:1.36;e.speed=Math.round((e.baseSpeed||e.speed)*mult);e.damage=Math.round((e.baseDamage||e.damage)*(next===1?1.20:1.48));e.bossAttackScale=next===1?.88:.70;spawnExplosionFx(e.x,e.y,next===1?'#ffb15f':'#ff3763',true);spawnParticle(e.x,e.y-e.size-16,next===1?'BOSS • FASE II':'BOSS • FASE III','#ff718c');
  if(next===2&&Math.hypot(e.x-player.x,e.y-player.y)<420){const pulse=Math.max(1500,Math.round(player.maxHp*.04));takePlayerDamage(pulse);spawnParticle(player.x,player.y-38,`PULSO -${fmt(pulse)}`,'#ff587b');}
  showToast(`${e.name} entrou na ${next===1?'FASE II • FÚRIA':'FASE III • OVERDRIVE'}!`);
}
function updateBossHud(){
  if(!ui.bossPhaseHud)return;const e=state.target&&!state.target.isPlayer&&state.target.type?.startsWith('boss')&&state.target.hp>0?state.target:null;ui.bossPhaseHud.classList.toggle('hidden',!e);if(!e)return;const hp=Math.max(0,e.hp),maxHp=Math.max(1,e.maxHp),sh=Math.max(0,e.shield),maxSh=Math.max(1,e.maxShield);ui.bossPhaseName.textContent=e.name.toUpperCase();ui.bossPhaseLabel.textContent=e.worldBoss?'AMEAÇA GLOBAL':`FASE ${(e.bossPhase||0)+1}`;if(ui.bossPhaseHpFill)ui.bossPhaseHpFill.style.width=`${Math.round(hp/maxHp*100)}%`;if(ui.bossPhaseShieldFill)ui.bossPhaseShieldFill.style.width=`${Math.round(sh/maxSh*100)}%`;if(ui.bossPhaseHpText)ui.bossPhaseHpText.textContent=`${fmt(hp)} / ${fmt(maxHp)}`;if(ui.bossPhaseShieldText)ui.bossPhaseShieldText.textContent=`${fmt(sh)} / ${fmt(maxSh)}`;if(ui.bossPhaseDistance)ui.bossPhaseDistance.textContent=`${fmt(enemyDistance(e))}u`;ui.bossPhaseStatus.textContent=e.worldBoss?'COLETIVO ONLINE • dano sincronizado no WARFRONT':(e.bossPhase||0)===0?'ESTÁVEL • 66% ativa FÚRIA':(e.bossPhase||0)===1?'FÚRIA • 33% ativa OVERDRIVE':'OVERDRIVE • MÁXIMA AMEAÇA';
}

function updateEnemies(dt){
  const sharedMode=sharedUniverseMap();
  const baseSafe=isSafeZone();
  for(const e of state.enemies){
    if(e.hp<=0||sharedMode&&e.sharedWorld)continue;updateBossPhase(e);
    const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy);e.angle+=dt*e.drift;
    if(progress.mapId==='x1'&&safeZoneDistance(e.x,e.y)<SAFE_ZONE.radius+35){
      const b=currentBasePoint(),ox=e.x-b.x,oy=e.y-b.y,od=Math.hypot(ox,oy)||1;
      e.x=b.x+ox/od*(SAFE_ZONE.radius+38);e.y=b.y+oy/od*(SAFE_ZONE.radius+38);
    }
    const forceChase=!!e.gateEnemy||!!e.forceChase,retaliating=!!e.playerProvoked,neutralX1=progress.mapId==='x1'&&!retaliating,protectedNow=baseSafe&&!retaliating;
    if(neutralX1&&!protectedNow&&d<=e.aggroRange){
      const passiveStand=Math.max(180,e.attackRange*.72);
      if(d>passiveStand){const nd=Math.max(1,d),nx=e.x+dx/nd*e.speed*.72*dt,ny=e.y+dy/nd*e.speed*.72*dt;if(!(safeZoneDistance(nx,ny)<SAFE_ZONE.radius+25)){e.x=nx;e.y=ny;}}
    }else if(!protectedNow&&!neutralX1&&d<=e.aggroRange&&d>e.attackRange*.8){
      const nd=Math.max(1,d),nx=e.x+dx/nd*e.speed*dt,ny=e.y+dy/nd*e.speed*dt;
      if(!(progress.mapId==='x1'&&safeZoneDistance(nx,ny)<SAFE_ZONE.radius+25&&!retaliating)){e.x=nx;e.y=ny;}
    }else if(d>e.aggroRange||protectedNow){e.x+=Math.cos(e.angle)*e.speed*.16*dt;e.y+=Math.sin(e.angle)*e.speed*.16*dt;}
    e.x=Math.max(25,Math.min(state.currentMap.world.w-25,e.x));e.y=Math.max(25,Math.min(state.currentMap.world.h-25,e.y));
    if(!protectedNow&&!neutralX1&&nowSec()>=(e.jammedUntil||0)&&d<e.attackRange&&nowSec()-e.lastShot>((e.name.includes('Boss')?1.6:1.15)*(e.bossAttackScale||1))){e.lastShot=nowSec();e.lastAttackPlayerAt=nowSec();takePlayerDamage(e.damage*rand(.92,1.12));spawnParticle(player.x,player.y-28,Math.round(e.damage),'#ff8080');}
  }
}
function updateSharedUniverseInterpolation(dt){
  if(!sharedUniverseMap())return;const now=Date.now();for(const e of state.enemies){if(!e.sharedWorld||e.hp<=0)continue;const live=now-(e.netAt||0)<1800,lead=live?.045:0,goalX=(e.tx??e.x)+(e.vx||0)*lead,goalY=(e.ty??e.y)+(e.vy||0)*lead,k=Math.min(1,dt*13);e.x+=(goalX-e.x)*k;e.y+=(goalY-e.y)*k;}
}
function updateParticles(dt){for(let i=state.particles.length-1;i>=0;i--){const p=state.particles[i];p.y-=p.vy*dt;if(p.vx)p.x+=p.vx*dt;p.life-=dt;if(p.life<=0)state.particles.splice(i,1);}}
function updateFx(dt){
  for(let i=state.fx.length-1;i>=0;i--){const f=state.fx[i];f.life-=dt;if(f.vx){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vx*=.985;f.vy*=.985;}if(f.life<=0)state.fx.splice(i,1);}
  const now=nowSec();for(let i=state.rocketFx.length-1;i>=0;i--)if(now-state.rocketFx[i].born>state.rocketFx[i].duration+.12)state.rocketFx.splice(i,1);
}
// ===================== ONLINE MAP PRESENCE =====================
const onlineWorld={players:new Map(),busy:false,lastSyncAt:0,lastPresenceSyncAt:0,privateRemoved:false};
function clearOnlinePlayers(){if(state.target?.isPlayer){state.target=null;player.laserFiring=false;}onlineWorld.players.clear();}
function shortestAngleDelta(a,b){return Math.atan2(Math.sin(b-a),Math.cos(b-a));}
function upsertRealtimePlayer(raw,spawn=false){
  const id=String(raw?.userId||raw?.id||'');if(!id||id===String(getUser()?.id||''))return null;const now=Date.now(),nx=Number(raw.x)||0,ny=Number(raw.y)||0;
  let rp=onlineWorld.players.get(id);if(!rp){rp={id,isPlayer:true,x:nx,y:ny,tx:nx,ty:ny,netX:nx,netY:ny,angle:Number(raw.angle)||0,targetAngle:Number(raw.angle)||0,vx:0,vy:0};onlineWorld.players.set(id,rp);}
  const dt=Math.max(.001,Math.min(1,(now-(rp.realtimeUpdatedAt||now))/1000)),px=Number.isFinite(rp.netX)?rp.netX:rp.tx,py=Number.isFinite(rp.netY)?rp.netY:rp.ty;
  if(!spawn&&rp.realtimeUpdatedAt){rp.vx=Math.max(-1400,Math.min(1400,(nx-px)/dt));rp.vy=Math.max(-1400,Math.min(1400,(ny-py)/dt));}
  rp.realtime=true;rp.realtimeUpdatedAt=now;rp.netX=nx;rp.netY=ny;rp.tx=nx;rp.ty=ny;rp.targetAngle=Number(raw.angle)||0;rp.callsign=raw.callsign||rp.callsign||'Pilot';rp.name=rp.callsign;rp.pilotTitle=raw.pilotTitle||rp.pilotTitle||'Piloto Estelar';rp.shipId=raw.shipId||rp.shipId||'phoenix';rp.shipDesignId=raw.shipDesignId||null;rp.faction=raw.faction||rp.faction||null;rp.level=Number(raw.level)||rp.level||1;rp.hp=Number(raw.hp??rp.hp)||0;rp.maxHp=Math.max(1,Number(raw.maxHp??rp.maxHp)||1);rp.shield=Math.max(0,Number(raw.shield??rp.shield)||0);rp.maxShield=Math.max(0,Number(raw.maxShield??rp.maxShield)||0);rp.size=onlineShipSize(rp.shipId)*.48;
  rp.laserFiring=!!raw.laserFiring;rp.laserColor=raw.laserColor||rp.laserColor||'#76d9ff';rp.laserAmmoId=raw.laserAmmoId||rp.laserAmmoId||'lcb10';rp.laserAmmoName=raw.laserAmmoName||rp.laserAmmoName||'PLS-1';rp.targetId=raw.targetId||null;rp.targetIsPlayer=!!raw.targetIsPlayer;
  if(raw.pet?.owned){const q=raw.pet,old=rp.pet||{},qx=Number(q.x)||nx,qy=Number(q.y)||ny,pdt=Math.max(.001,Math.min(1,(now-(old.netAt||now))/1000));rp.pet={...old,owned:true,level:Number(q.level)||1,tx:qx,ty:qy,targetAngle:Number(q.angle)||0,activeGear:q.activeGear||'off',laserTargetId:q.laserTargetId||null,laserActive:!!q.laserActive,laserColor:q.laserColor||rp.laserColor,designId:q.designId||null,netAt:now};if(!old.owned||spawn){rp.pet.x=qx;rp.pet.y=qy;rp.pet.angle=Number(q.angle)||0;rp.pet.vx=0;rp.pet.vy=0;}else{rp.pet.vx=Math.max(-1400,Math.min(1400,(qx-(old.netX??old.tx??qx))/pdt));rp.pet.vy=Math.max(-1400,Math.min(1400,(qy-(old.netY??old.ty??qy))/pdt));}rp.pet.netX=qx;rp.pet.netY=qy;}else rp.pet={owned:false};
  return rp;
}
function remoteTargetEntity(id,isPlayer){if(!id)return null;if(isPlayer){if(String(id)===String(getUser()?.id||''))return {id,isPlayer:true,x:player.x,y:player.y,hp:player.hp};return onlineWorld.players.get(String(id))||null;}return state.enemies.find(e=>e.id===id&&e.hp>0)||null;}
function onlineTerritoryKey(){
  return ['x1','x2','x3','x4'].includes(progress?.mapId)?(currentTerritoryFaction()||progress.profile.faction):'battle';
}
function onlinePlayerEnemy(rp){return !!rp&&!isBattleGroupMember(rp.id)&&rp.faction&&rp.faction!==progress?.profile?.faction;}
async function syncOnlineWorld(){
  if(!authenticated||!progress||onlineWorld.busy)return;
  onlineWorld.busy=true;
  try{
    if(isGalaxyGateMap()){
      clearOnlinePlayers();
      if(!onlineWorld.privateRemoved){onlineWorld.privateRemoved=true;}
      onlineWorld.lastSyncAt=Date.now();return;
    }
    onlineWorld.privateRemoved=false;
    const territory=onlineTerritoryKey();
    await upsertPlayerPresenceOnline({
      callsign:progress.profile.callsign,mapId:progress.mapId,territoryFaction:territory,
      x:player.x,y:player.y,angle:player.angle||0,shipId:progress.activeShipId,faction:progress.profile.faction,pilotTitle:activePilotTitle().label,
      level:progress.profile.level,hp:player.hp,maxHp:player.maxHp,shield:player.shield,maxShield:player.maxShield
    });
    const rows=await loadMapPresenceOnline(progress.mapId,territory),me=getUser()?.id,seen=new Set();
    for(const row of rows){
      if(!row?.user_id||row.user_id===me)continue;seen.add(row.user_id);
      let rp=onlineWorld.players.get(row.user_id);
      if(!rp){rp={id:row.user_id,isPlayer:true,x:Number(row.x)||0,y:Number(row.y)||0,tx:Number(row.x)||0,ty:Number(row.y)||0,angle:Number(row.angle)||0,targetAngle:Number(row.angle)||0};onlineWorld.players.set(row.user_id,rp);}
      rp.isPlayer=true;const live=rp.realtime&&Date.now()-(rp.realtimeUpdatedAt||0)<2500;if(!live){rp.tx=Number(row.x)||0;rp.ty=Number(row.y)||0;rp.targetAngle=Number(row.angle)||0;rp.hp=Number(row.hp)||0;rp.maxHp=Number(row.max_hp)||1;rp.shield=Number(row.shield)||0;rp.maxShield=Number(row.max_shield)||0;}
      rp.callsign=row.callsign||rp.callsign||'Pilot';rp.name=rp.callsign;rp.shipId=row.ship_id||rp.shipId||'phoenix';rp.faction=row.faction||rp.faction||null;rp.level=Number(row.level)||rp.level||1;
      rp.rankCode=row.rank_code||'pilot_basic';rp.rankTitle=row.rank_title||'Piloto Básico';rp.pilotTitle=row.pilot_title||rp.pilotTitle||'Piloto Estelar';rp.clanTag=row.clan_tag||'';rp.isAdmin=!!row.is_admin;
      rp.territoryFaction=row.territory_faction||territory;rp.size=onlineShipSize(rp.shipId)*.48;rp.updatedAt=row.updated_at;
    }
    for(const id of [...onlineWorld.players.keys()]){
      if(!seen.has(id)){
        const rp=onlineWorld.players.get(id);if(rp?.realtime&&Date.now()-(rp.realtimeUpdatedAt||0)<5000)continue;
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
  if(!authenticated||!progress)return;const now=Date.now(),presenceInterval=sharedUniverseOnline()?4500:1200;
  if(now-onlineWorld.lastSyncAt>presenceInterval&&!onlineWorld.busy)syncOnlineWorld();
  syncPvpInbox();syncClanCreditGrants();if(Date.now()-battleGroupRuntime.lastAt>6000)refreshBattleGroup(false);
  for(const rp of onlineWorld.players.values()){
    const live=rp.realtime&&now-(rp.realtimeUpdatedAt||0)<2500,lead=live ? 0.055 : 0,goalX=(rp.tx||0)+(live?(rp.vx||0)*lead:0),goalY=(rp.ty||0)+(live?(rp.vy||0)*lead:0),k=Math.min(1,dt*(live?14:6.5));rp.x+=(goalX-rp.x)*k;rp.y+=(goalY-rp.y)*k;rp.angle+=shortestAngleDelta(rp.angle,rp.targetAngle||0)*Math.min(1,dt*(live?15:7));
    const q=rp.pet;if(q?.owned){const pk=Math.min(1,dt*14),pgx=(q.tx||q.x||rp.x)+(q.vx||0)*.045,pgy=(q.ty||q.y||rp.y)+(q.vy||0)*.045;q.x+=(pgx-q.x)*pk;q.y+=(pgy-q.y)*pk;q.angle=(q.angle||0)+shortestAngleDelta(q.angle||0,q.targetAngle||0)*Math.min(1,dt*15);}
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
function drawPilotNameplate({x,y,rankCode='pilot_basic',clanTag='',callsign='Pilot',pilotTitle='Piloto Estelar',color='#8fffd0',isAdmin=false}){
  const code=isAdmin?'admin':rankCode,tag=clanTag?`[${clanTag}] `:'',label=`${tag}${callsign}`,fontSize=12,title=String(pilotTitle||'Piloto Estelar').slice(0,42);
  ctx.save();ctx.font=`bold ${fontSize}px Arial`;const textW=ctx.measureText(label).width,badgeW=code==='admin'?32:26,gap=6,total=badgeW+gap+textW,start=x-total/2;
  drawRankEmblemCanvas(code,start+badgeW/2,y,badgeW===32?17:16);
  ctx.font=`bold ${fontSize}px Arial`;ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.shadowColor='rgba(0,0,0,.95)';ctx.shadowBlur=4;ctx.fillText(label,start+badgeW+gap,y);ctx.shadowBlur=0;
  ctx.font='9px Arial';ctx.fillStyle='rgba(205,235,247,.82)';ctx.textAlign='center';ctx.fillText(title,x,y+13);ctx.restore();
}
function drawRemotePet(rp){
  const q=rp?.pet;if(!q?.owned||!Number.isFinite(q.x)||!Number.isFinite(q.y)||!onScreenWorld(q.x,q.y,140))return;const p=screenPos(q.x,q.y),mode=q.activeGear||'off',designer=designById(q.designId),visual=designer?.visual||{},color=visual.glow||(mode==='guard'?'#ff8c93':mode==='box'?'#ffd46b':mode==='ore'?'#7fffc4':'#7edcff'),path=droneMapAsset((q.level||1)>=10?'petElite':'pet'),img=assetImage(path);
  if(img&&img.naturalWidth){const size=30+Math.min(15,Number(q.level)||1)/15*9,sc=size/Math.max(img.naturalWidth,img.naturalHeight);ctx.save();ctx.translate(p.x,p.y);ctx.rotate((q.angle||0)+Math.PI/2);ctx.globalAlpha=.9;ctx.shadowColor=color;ctx.shadowBlur=designer?16:10;if(designer)ctx.filter=designerVisualCss(designer);ctx.drawImage(img,-img.naturalWidth*sc/2,-img.naturalHeight*sc/2,img.naturalWidth*sc,img.naturalHeight*sc);ctx.filter='none';if(designer){ctx.rotate(-((q.angle||0)+Math.PI/2));ctx.strokeStyle=visual.accent||color;ctx.lineWidth=designer.rarity==='mythic'?2:1.2;ctx.globalAlpha=.78;ctx.beginPath();ctx.arc(0,0,size*.62,0,TWO_PI);ctx.stroke();}ctx.restore();}else{ctx.fillStyle=color;ctx.beginPath();ctx.arc(p.x,p.y,7,0,TWO_PI);ctx.fill();}
  ctx.fillStyle=color;ctx.font='bold 9px Arial';ctx.textAlign='center';ctx.fillText(`AUX-9 LV ${q.level||1}${designer?' • '+designer.name:''}`,p.x,p.y+24);
  if(q.laserActive&&q.laserTargetId){const t=remoteTargetEntity(q.laserTargetId,false)||remoteTargetEntity(q.laserTargetId,true);if(t&&t.hp>0){const sp=screenPos(t.x,t.y),c=q.laserColor||rp.laserColor||'#76d9ff';ctx.save();ctx.strokeStyle=c;ctx.shadowColor=c;ctx.shadowBlur=8;ctx.globalAlpha=.9;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(sp.x,sp.y);ctx.stroke();ctx.restore();}}
}
function drawRemoteLaser(rp,p){
  if(!rp?.laserFiring||!rp.targetId)return;const t=remoteTargetEntity(rp.targetId,rp.targetIsPlayer);if(!t||t.hp<=0)return;const sp=screenPos(t.x,t.y),c=rp.laserColor||'#76d9ff';drawLaserFxLine(p.x,p.y,sp.x,sp.y,rp.laserAmmoId||'lcb10',c,.88,.86);const mx=(p.x+sp.x)/2,my=(p.y+sp.y)/2,label=rp.laserAmmoName||'';if(label&&Math.hypot(sp.x-p.x,sp.y-p.y)>80){ctx.save();ctx.font='900 8px Arial';ctx.textAlign='center';ctx.fillStyle=c;ctx.strokeStyle='rgba(0,0,0,.8)';ctx.lineWidth=3;ctx.strokeText(label,mx,my-5);ctx.fillText(label,mx,my-5);ctx.restore();}
}
function drawOnlinePlayers(){
  for(const rp of onlineWorld.players.values()){
    if(!onScreenWorld(rp.x,rp.y,180))continue;const p=screenPos(rp.x,rp.y),f=FACTIONS[rp.faction],enemy=onlinePlayerEnemy(rp),sameGroup=isBattleGroupMember(rp.id),sameClan=!!currentClanTag()&&!!rp.clanTag&&rp.clanTag===currentClanTag(),color=sameGroup?'#63e8ff':enemy?'#ff4d69':sameClan?'#ffe16b':(f?.color||'#69ffbd'),path=shipMapAsset(rp.shipId),img=assetImage(path),size=onlineShipSize(rp.shipId),designer=designById(rp.shipDesignId),visual=designer?.visual||{},moving=Math.hypot((rp.tx??rp.x)-rp.x,(rp.ty??rp.y)-rp.y)>2,bank=combatBank(rp.angle||0,(rp.targetAngle??rp.angle??0),moving);
    ctx.save();ctx.translate(p.x,p.y);ctx.globalAlpha=.92;if(state.target?.isPlayer&&state.target.id===rp.id){const rr=size*.55+18;ctx.strokeStyle='#ffed6f';ctx.lineWidth=2;ctx.setLineDash([6,4]);ctx.beginPath();ctx.arc(0,0,rr,0,TWO_PI);ctx.stroke();ctx.setLineDash([]);}
    if(img&&img.naturalWidth){const sc=size/Math.max(img.naturalWidth,img.naturalHeight);ctx.save();ctx.rotate((rp.angle||0)+Math.PI/2);drawEngineWakeLocal(size,visual.glow||color,moving?1:0,Number(rp.level)||0);ctx.transform(1,0,bank*.4,1,0,0);ctx.scale(1+Math.abs(bank)*.07,1-Math.abs(bank)*.03);ctx.shadowColor=visual.glow||color;ctx.shadowBlur=designer?18:10;if(designer)ctx.filter=designerVisualCss(designer);ctx.drawImage(img,-img.naturalWidth*sc/2,-img.naturalHeight*sc/2,img.naturalWidth*sc,img.naturalHeight*sc);ctx.filter='none';ctx.restore();drawDesignerAuraLocal(size,designer,visual,Number(rp.level)||0);}else{ctx.rotate(rp.angle||0);drawShipModel(rp.shipId,color);}ctx.restore();
    drawRemoteLaser(rp,p);drawRemotePet(rp);
    const barW=58,bx=p.x-barW/2,hp=Math.max(0,Math.min(1,rp.hp/Math.max(1,rp.maxHp))),sh=Math.max(0,Math.min(1,rp.shield/Math.max(1,rp.maxShield)));
    ctx.fillStyle='rgba(8,20,28,.78)';ctx.fillRect(bx,p.y-size*.42-17,barW,4);ctx.fillStyle='#55ff9d';ctx.fillRect(bx,p.y-size*.42-17,barW*hp,4);ctx.fillStyle='rgba(7,25,45,.82)';ctx.fillRect(bx,p.y-size*.42-11,barW,3);ctx.fillStyle='#4fcfff';ctx.fillRect(bx,p.y-size*.42-11,barW*sh,3);
    drawPilotNameplate({x:p.x,y:p.y+size*.45+17,rankCode:rp.rankCode,clanTag:rp.clanTag,callsign:rp.callsign,pilotTitle:rp.pilotTitle||'Piloto Estelar',color:sameGroup?'#85efff':enemy?'#ff8b9e':sameClan?'#ffe692':'#8fffd0',isAdmin:rp.isAdmin});
  }
}



function update(dt){if(!progress||gameBootstrapRuntime.loading)return;telemetryTick(dt);processRespawns();updateCombatAbilities();updatePlayer(dt);updateSharedUniverseInterpolation(dt);updateEnemies(dt);updatePet(dt);updateOnlineWorld(dt);updateWarfrontRuntime();updateGalaxyEvent(dt);updateParticles(dt);updateFx(dt);updateAlphaGate();updateAuctionSystem();updateUI();}

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
function laserFxProfile(ammoId,color='#76d9ff'){
  const id=String(ammoId||'lcb10');
  if(id==='mcb25')return {beams:2,width:1.7,spread:3.2,glow:10,pulse:.10,color};
  if(id==='mcb50')return {beams:3,width:2.05,spread:3.8,glow:13,pulse:.18,color};
  if(id==='ucb100')return {beams:3,width:2.7,spread:4.8,glow:18,pulse:.28,color};
  if(id==='sab50')return {beams:2,width:2.05,spread:4.5,glow:16,pulse:.34,color,shieldDrain:true};
  return {beams:1,width:1.65,spread:0,glow:8,pulse:.05,color};
}
function drawLaserFxLine(sx,sy,tx,ty,ammoId,color='#76d9ff',alpha=1,widthScale=1){
  const p=laserFxProfile(ammoId,color),dx=tx-sx,dy=ty-sy,len=Math.max(1,Math.hypot(dx,dy)),nx=-dy/len,ny=dx/len,t=nowSec();
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=alpha;
  const shimmer=1+Math.sin(t*18+len*.012)*p.pulse;
  for(let i=0;i<p.beams;i++){
    const centered=i-(p.beams-1)/2,osc=p.shieldDrain?Math.sin(t*13+i*2.1)*2.1:0,off=centered*p.spread+osc;
    const ax=sx+nx*off,ay=sy+ny*off,bx=tx+nx*off,by=ty+ny*off;
    ctx.strokeStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=p.glow;ctx.lineWidth=p.width*widthScale*shimmer;
    ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();
    ctx.shadowBlur=0;ctx.strokeStyle='rgba(255,255,255,.82)';ctx.globalAlpha=alpha*(p.shieldDrain?.7:.52);ctx.lineWidth=Math.max(.65,p.width*.28*widthScale);ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();ctx.globalAlpha=alpha;
  }
  if(ammoId==='ucb100'){
    const travel=(t*2.4)%1;ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=14;
    for(let i=0;i<3;i++){const q=(travel+i/3)%1,x=sx+dx*q,y=sy+dy*q;ctx.globalAlpha=alpha*(.28+.45*q);ctx.beginPath();ctx.arc(x,y,2.2+q*1.8,0,TWO_PI);ctx.fill();}
  }else if(p.shieldDrain){
    const q=(t*1.8)%1,x=sx+dx*q,y=sy+dy*q;ctx.fillStyle='#d9ffff';ctx.shadowColor=p.color;ctx.shadowBlur=18;ctx.globalAlpha=alpha*.8;ctx.beginPath();ctx.arc(x,y,3.2,0,TWO_PI);ctx.fill();
  }
  ctx.restore();
}
function spawnRepairFx(x,y,color='#73ffc0',kind='repair'){
  state.fx.push({x,y,color,size:46,type:kind,life:1,maxLife:1,rot:rand(0,TWO_PI)});
}
function drawRocketFx(){
  const now=nowSec();
  for(const r of state.rocketFx){
    const t=Math.max(0,Math.min(1,(now-r.born)/r.duration)),ease=1-Math.pow(1-t,2),x=r.sx+(r.tx-r.sx)*ease,y=r.sy+(r.ty-r.sy)*ease,p=screenPos(x,y),tailEase=Math.max(0,ease-.10),tail=screenPos(r.sx+(r.tx-r.sx)*tailEase,r.sy+(r.ty-r.sy)*tailEase),profile=ROCKETS[r.rocketId]||null,c=r.color||profile?.color||'#ffb36d';
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle=c;ctx.shadowColor=c;ctx.shadowBlur=16;ctx.lineWidth=3.4;ctx.globalAlpha=.92;ctx.beginPath();ctx.moveTo(tail.x,tail.y);ctx.lineTo(p.x,p.y);ctx.stroke();
    const dx=p.x-tail.x,dy=p.y-tail.y,len=Math.max(1,Math.hypot(dx,dy)),nx=-dy/len,ny=dx/len;
    ctx.shadowBlur=9;ctx.lineWidth=1;ctx.globalAlpha=.45;for(const off of [-2.5,2.5]){ctx.beginPath();ctx.moveTo(tail.x+nx*off,tail.y+ny*off);ctx.lineTo(p.x+nx*off*.4,p.y+ny*off*.4);ctx.stroke();}
    const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,11);g.addColorStop(0,'rgba(255,255,255,.98)');g.addColorStop(.28,c);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.globalAlpha=1;ctx.beginPath();ctx.arc(p.x,p.y,11,0,TWO_PI);ctx.fill();
    if(t>.82){const q=(t-.82)/.18;ctx.strokeStyle=c;ctx.shadowBlur=12;ctx.globalAlpha=(1-q)*.75;ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,7+q*30,0,TWO_PI);ctx.stroke();}
    ctx.restore();
  }
}
function drawFx(){
  for(const f of state.fx){if(!onScreenWorld(f.x,f.y,180))continue;const p=screenPos(f.x,f.y),a=Math.max(0,f.life/(f.maxLife||1)),q=1-a;ctx.save();ctx.globalAlpha=Math.min(1,a*1.4);ctx.translate(p.x,p.y);ctx.rotate(f.rot||0);
    if(f.type==='explosion'){
      const r=f.size*(.72+q*.48),g=ctx.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,'rgba(255,255,255,.98)');g.addColorStop(.14,'rgba(255,238,188,.95)');g.addColorStop(.34,f.color);g.addColorStop(.68,'rgba(255,102,48,.28)');g.addColorStop(1,'rgba(255,72,38,0)');ctx.fillStyle=g;ctx.globalCompositeOperation='lighter';ctx.beginPath();ctx.arc(0,0,r,0,TWO_PI);ctx.fill();
      ctx.strokeStyle=`rgba(255,230,175,${a*.8})`;ctx.lineWidth=2.2;ctx.shadowColor=f.color;ctx.shadowBlur=12;ctx.beginPath();ctx.arc(0,0,f.size*(.42+q*.78),0,TWO_PI);ctx.stroke();ctx.shadowBlur=0;
      ctx.strokeStyle=`rgba(255,140,90,${a*.42})`;ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,f.size*(.62+q*1.08),0,TWO_PI);ctx.stroke();
    }else if(f.type==='spark'){
      ctx.fillStyle=f.color;ctx.shadowColor=f.color;ctx.shadowBlur=8;ctx.beginPath();ctx.arc(0,0,f.size,0,TWO_PI);ctx.fill();
    }else if(f.type==='shield'||f.type==='shieldcharge'){
      const r=f.size*(.76+q*.48);ctx.globalCompositeOperation='lighter';ctx.strokeStyle=f.color;ctx.shadowColor=f.color;ctx.shadowBlur=12;ctx.lineWidth=f.type==='shieldcharge'?2.8:2.2;ctx.beginPath();ctx.ellipse(0,0,r,r*.72,0,0,TWO_PI);ctx.stroke();
      ctx.globalAlpha=a*.52;ctx.setLineDash([7,5]);ctx.rotate(q*.7);ctx.beginPath();ctx.arc(0,0,r*.84,-.4,2.2);ctx.stroke();ctx.setLineDash([]);
    }else if(f.type==='repair'){
      const r=f.size*(.78+q*.30);ctx.globalCompositeOperation='lighter';ctx.strokeStyle=f.color;ctx.shadowColor=f.color;ctx.shadowBlur=10;ctx.lineWidth=1.8;for(let i=0;i<3;i++){ctx.rotate(TWO_PI/3);ctx.beginPath();ctx.arc(0,0,r+i*5,-.52,.52);ctx.stroke();}ctx.fillStyle=f.color;ctx.globalAlpha=a*.6;for(let i=0;i<4;i++){const ang=nowSec()*2.2+i*TWO_PI/4;ctx.beginPath();ctx.arc(Math.cos(ang)*r*.65,Math.sin(ang)*r*.65,2.4,0,TWO_PI);ctx.fill();}
    }else{
      ctx.strokeStyle=f.color;ctx.shadowColor=f.color;ctx.shadowBlur=8;ctx.lineWidth=1.6;ctx.beginPath();ctx.arc(0,0,f.size*(1.5-a*.5),0,TWO_PI);ctx.stroke();
    }
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
  const b=currentBasePoint(),p=screenPos(b.x,b.y),f=territoryOwner()||getFaction(),home=isOwnTerritory(),q=qualityProfile(),light=q.sceneLight??1,pulse=1+Math.sin(nowSec()*1.8)*.008;
  ctx.save();ctx.translate(p.x,p.y);
  ctx.strokeStyle=home?hexToRgba(f?.color||'#5ce8ff',.72):'rgba(255,90,110,.68)';ctx.fillStyle=home?'rgba(40,220,170,.018)':'rgba(255,65,82,.018)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,SAFE_ZONE.radius*pulse,0,TWO_PI);ctx.fill();ctx.stroke();
  if(light>.45){ctx.strokeStyle=home?'rgba(100,255,210,.10)':'rgba(255,85,110,.10)';ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,SAFE_ZONE.radius-12,0,TWO_PI);ctx.stroke();}
  const station=assetImage(GAME_ASSETS.bases?.orbitalStation);
  if(station&&station.naturalWidth){const targetW=500,targetH=targetW*(station.naturalHeight/station.naturalWidth);ctx.save();ctx.shadowColor=f?.color||'#51dfff';ctx.shadowBlur=light>.6?22:0;ctx.drawImage(station,-targetW/2,-targetH/2,targetW,targetH);ctx.restore();if(light>.55){const core=ctx.createRadialGradient(0,-5,2,0,-5,70);core.addColorStop(0,'rgba(255,255,255,.22)');core.addColorStop(.3,hexToRgba(f?.color||'#55ddff',.24));core.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=core;ctx.beginPath();ctx.arc(0,-5,72,0,TWO_PI);ctx.fill();}}
  ctx.fillStyle=home?'#caffdf':'#ff9aa8';ctx.font='bold 12px Arial';ctx.textAlign='center';ctx.fillText(`${f?.short||''} • ${home?'BASE ORBITAL / ZONA SEGURA':'BASE INIMIGA'}`,0,-SAFE_ZONE.radius-14);ctx.restore();
}
function drawPortals(){
  const q=qualityProfile(),light=q.sceneLight??1,t=nowSec();
  for(const portal of resolvedPortals()){
    const p=screenPos(portal.x,portal.y),c=portalVisualPalette(portal);ctx.save();ctx.translate(p.x,p.y);
    ctx.save();ctx.setLineDash([8,11]);ctx.strokeStyle=hexToRgba(c.main,.14);ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(0,0,PORTAL_NEUTRAL_RADIUS,0,TWO_PI);ctx.stroke();ctx.setLineDash([]);ctx.restore();
    if(light>.4){ctx.globalCompositeOperation='lighter';const halo=ctx.createRadialGradient(0,0,0,0,0,74);halo.addColorStop(0,hexToRgba(c.main,.14*light));halo.addColorStop(.45,hexToRgba(c.ring,.07*light));halo.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=halo;ctx.beginPath();ctx.arc(0,0,74,0,TWO_PI);ctx.fill();ctx.globalCompositeOperation='source-over';}
    const portalImg=assetImage(portalAsset(portal));
    if(portalImg&&portalImg.naturalWidth){const targetH=138,targetW=targetH*(portalImg.naturalWidth/portalImg.naturalHeight);ctx.save();ctx.globalAlpha=.90;ctx.shadowColor=c.main;ctx.shadowBlur=light>.55?18:5;ctx.drawImage(portalImg,-targetW/2,-targetH/2,targetW,targetH);ctx.restore();}
    ctx.shadowColor=c.main;ctx.shadowBlur=light>.55?14:0;ctx.strokeStyle=hexToRgba(c.main,.92);ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,34,54,0,0,TWO_PI);ctx.stroke();ctx.shadowBlur=0;
    ctx.save();ctx.rotate(t*.52);ctx.strokeStyle=hexToRgba(c.ring,.72);ctx.lineWidth=4;for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(0,0,26,-.52+i*Math.PI/2,.52+i*Math.PI/2);ctx.stroke();}ctx.restore();
    ctx.save();ctx.rotate(-t*.78);ctx.strokeStyle=hexToRgba(c.main,.38);ctx.lineWidth=1.4;ctx.beginPath();ctx.ellipse(0,0,19,34,0,0,TWO_PI);ctx.stroke();ctx.restore();
    const core=ctx.createRadialGradient(0,0,1,0,0,23);core.addColorStop(0,hexToRgba(c.core,.82));core.addColorStop(.30,hexToRgba(c.main,.32));core.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=core;ctx.beginPath();ctx.ellipse(0,0,22,36,0,0,TWO_PI);ctx.fill();
    if(light>.7){ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle=hexToRgba(c.core,.26);ctx.lineWidth=.9;for(let i=0;i<2;i++){const z=((t*.42+i*.5)%1);ctx.globalAlpha=(1-z)*.34;ctx.beginPath();ctx.ellipse(0,0,8+z*25,13+z*40,0,0,TWO_PI);ctx.stroke();}ctx.restore();}
    ctx.fillStyle=c.core;ctx.font='bold 11px Arial';ctx.textAlign='center';ctx.fillText(portal.targetLabel||displayMapLabel(portal.to,portal.targetTerritoryFaction),0,-66);ctx.restore();
  }
}
function drawOres(){for(const o of state.ores){if(!onScreenWorld(o.x,o.y,100))continue;
  const p=screenPos(o.x,o.y),path=GAME_ASSETS.resources[o.type];
  const img=assetImage(path);
  if(img&&img.naturalWidth){
    const size=Math.max(26,o.r*3.2),pulse=.94+Math.sin(nowSec()*2.4+o.x*.01)*.06;
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate((o.rot||0)+nowSec()*.08);ctx.globalAlpha=.96;ctx.shadowColor=o.color;ctx.shadowBlur=(qualityProfile().sceneLight??1)>.55?10:3;
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
    ctx.shadowColor=remaining<=5?'#ff5a4c':'#ffbd48';ctx.shadowBlur=(qualityProfile().sceneLight??1)>.55?(remaining<=5?16:9):2;
    const size=42*pulse,sc=size/Math.max(img.naturalWidth,img.naturalHeight);
    ctx.drawImage(img,-img.naturalWidth*sc/2,-img.naturalHeight*sc/2,img.naturalWidth*sc,img.naturalHeight*sc);
    ctx.restore();continue;
  }
  // Fallback temporário de carregamento: mantém formato de cargo crate, nunca um quadrado chapado.
  ctx.save();ctx.globalAlpha=dyingAlpha;ctx.translate(p.x,p.y);ctx.shadowColor='#ffbd48';ctx.shadowBlur=8;
  ctx.fillStyle='rgba(16,28,40,.94)';ctx.strokeStyle='#ffbd48';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(-14,-11,28,22,4);ctx.fill();ctx.stroke();
  ctx.strokeStyle='rgba(99,214,255,.88)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-9,-5);ctx.lineTo(9,-5);ctx.moveTo(-9,5);ctx.lineTo(9,5);ctx.stroke();ctx.restore();
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
  const claim=sharedNpcClaimState(e),claimColor=claim.claimed?(claim.friendly?(e.eventNpc?'rgba(255,190,72,.96)':(e.color||'rgba(255,74,95,.96)')):'rgba(245,250,255,.94)'):null;
  if(claim.claimed){const cr=e.size+12+Math.sin(nowSec()*3.4)*1.2;ctx.strokeStyle=claimColor;ctx.globalAlpha=.72;ctx.lineWidth=1.4;ctx.setLineDash([5,5]);ctx.beginPath();ctx.arc(0,0,cr,0,TWO_PI);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;}
  if(state.target?.id===e.id){const rr=e.size+18+Math.sin(nowSec()*6)*2;ctx.strokeStyle=claimColor||(e.eventNpc?'rgba(255,190,72,.98)':'rgba(255,74,95,.98)');ctx.lineWidth=2;ctx.setLineDash([7,4]);ctx.beginPath();ctx.arc(0,0,rr,0,TWO_PI);ctx.stroke();ctx.setLineDash([]);ctx.rotate(-nowSec()*.55);for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);ctx.beginPath();ctx.moveTo(rr+3,-8);ctx.lineTo(rr+3,8);ctx.lineTo(rr-5,8);ctx.stroke();}ctx.rotate(nowSec()*.55);}
  if(img&&img.naturalWidth){
    const face=Math.atan2(player.y-e.y,player.x-e.x)+Math.PI/2,size=e.size*(boss?3.45:3.08),sc=size/Math.max(img.naturalWidth,img.naturalHeight),pulse=Math.sin(nowSec()*4+e.x*.002+e.y*.002),bank=Math.sin((e.angle||0)*1.7+nowSec()*.7)*(boss?.035:.055),fx=npcFxProfile(e.type);
    drawNpcAuraLocal(e,boss,size);ctx.rotate(face);if(Math.hypot(player.x-e.x,player.y-e.y)<900)drawEngineWakeLocal(size,fx.trail,boss?.78:.5,e.x*.01);ctx.scale(1+bank,1-Math.abs(bank)*.35);ctx.scale(1+pulse*.012,1-pulse*.012);ctx.shadowColor=fx.glow;ctx.shadowBlur=boss?28:13;if(boss&&'filter' in ctx&&Number(e.bossPhase||0)>=2)ctx.filter='saturate(1.25) brightness(1.12)';ctx.drawImage(img,-img.naturalWidth*sc/2,-img.naturalHeight*sc/2,img.naturalWidth*sc,img.naturalHeight*sc);ctx.filter='none';
  }else{
    // Enquanto o PNG carrega, o modo ALTO usa uma silhueta angular discreta em vez de círculos/quadrados.
    if(resolvedQualityMode()==='high'){
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
  const a=nowSec()*.8+i*TWO_PI/Math.max(1,progress.drones.length),r=66+(i%2)*18,x=p.x+Math.cos(a)*r,y=p.y+Math.sin(a)*r,img=assetImage(droneMapAsset(d.type)),designer=droneDesignFor(d.id),visual=designer?.visual||{},glow=visual.glow||(d.type==='iris'?'#c77cff':'#71dfff');
  if(img&&img.naturalWidth){const size=d.type==='iris'?26:23,sc=size/Math.max(img.naturalWidth,img.naturalHeight);ctx.save();ctx.translate(x,y);ctx.rotate(a+Math.PI);ctx.shadowColor=glow;ctx.shadowBlur=designer?.rarity==='mythic'?18:designer?13:8;if(designer&&'filter' in ctx)ctx.filter=visual.filter||'none';ctx.drawImage(img,-img.naturalWidth*sc/2,-img.naturalHeight*sc/2,img.naturalWidth*sc,img.naturalHeight*sc);ctx.filter='none';if(designer){ctx.rotate(-(a+Math.PI));ctx.strokeStyle=visual.accent||glow;ctx.globalAlpha=.65+.2*Math.sin(nowSec()*3+i);ctx.lineWidth=designer.rarity==='mythic'?2:1.2;ctx.beginPath();ctx.arc(0,0,size*.62,0,TWO_PI);ctx.stroke();}ctx.restore();return;}
  ctx.fillStyle=glow;ctx.beginPath();ctx.arc(x,y,designer?5:4,0,TWO_PI);ctx.fill();
});}
function drawPet(){
  if(!progress?.pet?.owned)return;
  const p=screenPos(petRuntime.x,petRuntime.y),mode=progress.pet.activeGear||'off',designer=currentPetDesign(),visual=designer?.visual||{},color=visual.glow||(mode==='guard'?'#ff8c93':mode==='box'?'#ffd46b':mode==='ore'?'#7fffc4':'#7edcff');
  const path=droneMapAsset(progress.pet.level>=10?'petElite':'pet'),img=assetImage(path);
  if(img&&img.naturalWidth){const size=34+(progress.pet.level/15)*10,sc=size/Math.max(img.naturalWidth,img.naturalHeight);ctx.save();ctx.translate(p.x,p.y);ctx.rotate((petRuntime.angle||0)+Math.PI/2);ctx.shadowColor=color;ctx.shadowBlur=designer?18:12;if(designer)ctx.filter=designerVisualCss(designer);ctx.drawImage(img,-img.naturalWidth*sc/2,-img.naturalHeight*sc/2,img.naturalWidth*sc,img.naturalHeight*sc);ctx.filter='none';if(designer){ctx.rotate(-((petRuntime.angle||0)+Math.PI/2));ctx.strokeStyle=visual.accent||color;ctx.globalAlpha=.68+.2*Math.sin(nowSec()*3);ctx.lineWidth=designer.rarity==='mythic'?2.2:1.4;ctx.beginPath();ctx.arc(0,0,size*.62,0,TWO_PI);ctx.stroke();}ctx.restore();}
  else{ctx.fillStyle=color;ctx.beginPath();ctx.arc(p.x,p.y,8,0,TWO_PI);ctx.fill();}
  ctx.fillStyle=color;ctx.font='bold 10px Arial';ctx.textAlign='center';ctx.fillText(`AUX-9 LV ${progress.pet.level}${designer?' • '+designer.name:''}`,p.x,p.y+28);
  if(petRuntime.laserTargetId&&nowSec()<petRuntime.laserUntil){const e=state.enemies.find(x=>x.id===petRuntime.laserTargetId&&x.hp>0)||onlineWorld.players.get(petRuntime.laserTargetId);if(e&&e.hp>0){const t=screenPos(e.x,e.y),ammo=currentLaserAmmo();drawLaserFxLine(p.x,p.y,t.x,t.y,ammo.id,ammo.color,.82,.68);}}
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
function combatClamp(v,min,max){return Math.max(min,Math.min(max,v));}
function combatBank(angle,targetAngle,moving){if(!moving)return 0;return combatClamp(angleDelta(angle||0,targetAngle||angle||0)*.42,-.22,.22);}
function drawEngineWakeLocal(size,color,intensity=1,phase=0){
  if(!qualityProfile().fx||intensity<=0)return;
  const pulse=.84+.16*Math.sin(nowSec()*9+phase),len=size*(.28+.18*intensity)*pulse,spread=size*.16;
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.18+.24*intensity;
  for(const ox of [-spread,spread]){const g=ctx.createRadialGradient(ox,size*.28,0,ox,size*.42,len);g.addColorStop(0,'rgba(255,255,255,.95)');g.addColorStop(.18,color);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(ox,size*.43,spread*.7,len,0,0,TWO_PI);ctx.fill();}
  ctx.restore();
}
function drawDesignerAuraLocal(size,designer,visual,phase=0){
  if(!designer||!qualityProfile().fx)return;const rare=designer.rarity==='mythic'||designer.rarity==='legendary',r=size*(rare?.64:.58),t=nowSec()*(rare?1.1:.72)+phase,c=visual.accent||visual.glow||'#7cecff';
  ctx.save();ctx.rotate(t);ctx.strokeStyle=c;ctx.globalAlpha=rare?.58:.36;ctx.lineWidth=rare?2:1.2;ctx.setLineDash(rare?[10,8]:[7,10]);ctx.beginPath();ctx.arc(0,0,r,0,TWO_PI);ctx.stroke();ctx.setLineDash([]);
  if(rare){ctx.fillStyle=c;for(let i=0;i<3;i++){const a=i*TWO_PI/3-t*.35;ctx.beginPath();ctx.arc(Math.cos(a)*r,Math.sin(a)*r,2.2,0,TWO_PI);ctx.fill();}}ctx.restore();
}
function drawPlayer(){
  const p=screenPos(player.x,player.y),f=getFaction(),a=player.angle||0,designer=currentShipDesign(),visual=designer?.visual||{},color=visual.glow||(f?.color||'#76e0ff'),path=shipMapAsset(progress.activeShipId),img=assetImage(path);
  const moving=routeDistance()>4,desired=moving?Math.atan2(player.ty-player.y,player.tx-player.x):a,bank=combatBank(a,desired,moving),motion=moving?1:0;
  ctx.save();ctx.translate(p.x,p.y);
  if(img&&img.naturalWidth){
    const ship=SHIPS[progress.activeShipId],size=(ship.id==='citadel'?105:ship.id==='bigboy'?96:ship.id==='goliath'||ship.id==='aegis'?88:78),sc=size/Math.max(img.naturalWidth,img.naturalHeight);
    ctx.save();ctx.rotate(a+Math.PI/2);drawEngineWakeLocal(size,color,motion,progress.profile.level||0);ctx.transform(1,0,bank*.42,1,0,0);ctx.scale(1+Math.abs(bank)*.08,1-Math.abs(bank)*.035);ctx.shadowColor=color;ctx.shadowBlur=designer?24:15;if(designer)ctx.filter=designerVisualCss(designer);ctx.drawImage(img,-img.naturalWidth*sc/2,-img.naturalHeight*sc/2,img.naturalWidth*sc,img.naturalHeight*sc);ctx.filter='none';ctx.restore();
    drawDesignerAuraLocal(size,designer,visual,progress.profile.level||0);
  }else{ctx.rotate(a||0);drawShipModel(progress.activeShipId,color);}
  ctx.restore();drawDrones(p);
  ctx.strokeStyle=designer?(visual.accent||'rgba(119,228,255,.45)'):'rgba(119,228,255,.23)';ctx.lineWidth=designer?1.4:1;ctx.beginPath();ctx.arc(p.x,p.y,25,0,TWO_PI);ctx.stroke();
  drawPilotNameplate({x:p.x,y:p.y+39,rankCode:myRankingRow()?.rank_code||'pilot_basic',clanTag:currentClanTag(),callsign:progress.profile.callsign||getUser()?.callsign||'Pilot',pilotTitle:activePilotTitle().label,color,isAdmin:!!clanRuntime.state?.is_admin});
  if(player.laserFiring&&state.target&&state.target.hp>0&&enemyDistance(state.target)<=playerLaserRange()){const t=screenPos(state.target.x,state.target.y),ammo=currentLaserAmmo();drawLaserFxLine(p.x,p.y,t.x,t.y,ammo.id,ammo.color,1,1);}
}
function drawParticles(){ctx.textAlign='center';for(const p of state.particles){const q=screenPos(p.x,p.y),alpha=Math.max(0,Math.min(1,p.life));ctx.globalAlpha=alpha;ctx.fillStyle=p.color;if(p.combat){ctx.font=p.critical?'900 18px Arial':'800 13px Arial';ctx.lineWidth=p.critical?4:3;ctx.strokeStyle='rgba(0,0,0,.78)';ctx.strokeText(p.text,q.x,q.y);ctx.shadowColor=p.color;ctx.shadowBlur=p.critical?12:5;ctx.fillText(p.text,q.x,q.y);ctx.shadowBlur=0;}else{ctx.font='12px Arial';ctx.fillText(p.text,q.x,q.y);}}ctx.globalAlpha=1;}
function drawWarfrontControlWorld(){
  const sc=sectorControlState();if(!sc||!state.currentMap?.battle)return;
  for(const node of sc.nodes||[]){
    const radius=Math.max(120,Number(node.radius)||360);if(!onScreenWorld(node.x,node.y,radius+120))continue;
    const p=screenPos(node.x,node.y),owner=node.owner||null,challenger=node.challenger||null,baseColor=owner?sectorFactionColor(owner):(challenger?sectorFactionColor(challenger):'#87a4b5'),pulse=1+Math.sin(nowSec()*3+Number(node.x)*.001)*.04;
    ctx.save();ctx.translate(p.x,p.y);ctx.scale(pulse,pulse);ctx.fillStyle=node.contested?'rgba(255,255,255,.035)':hexToRgba(baseColor,.045);ctx.strokeStyle=node.contested?'rgba(255,255,255,.82)':hexToRgba(baseColor,.62);ctx.lineWidth=node.contested?2.4:1.6;ctx.setLineDash(node.contested?[10,7]:[7,9]);ctx.beginPath();ctx.arc(0,0,radius,0,TWO_PI);ctx.fill();ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='rgba(3,12,23,.88)';ctx.strokeStyle=baseColor;ctx.lineWidth=2.2;ctx.beginPath();ctx.arc(0,0,34,0,TWO_PI);ctx.fill();ctx.stroke();
    const progress=Math.max(0,Math.min(100,Number(node.progress)||0));if(challenger&&progress>0){ctx.strokeStyle=sectorFactionColor(challenger);ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,42,-Math.PI/2,-Math.PI/2+TWO_PI*(progress/100));ctx.stroke();}
    ctx.textAlign='center';ctx.fillStyle='#f4fbff';ctx.font='900 18px Arial';ctx.fillText(String(node.id||'?'),0,6);ctx.fillStyle=node.contested?'#ffffff':baseColor;ctx.font='900 10px Arial';ctx.fillText(node.contested?'CONTESTADO':owner?sectorFactionLabel(owner):(challenger?`CAPTURA ${sectorFactionLabel(challenger)}`:'NEUTRO'),0,60);ctx.fillStyle='rgba(214,239,250,.8)';ctx.font='700 8px Arial';ctx.fillText(`${sectorControlNearbyTotal(node)} PILOTO(S)`,0,74);ctx.restore();
  }
}

function drawMinimap(){
  mm.clearRect(0,0,minimap.width,minimap.height);const bg=mm.createLinearGradient(0,0,0,minimap.height);bg.addColorStop(0,'#081522');bg.addColorStop(1,'#040b14');mm.fillStyle=bg;mm.fillRect(0,0,minimap.width,minimap.height);mm.strokeStyle='rgba(75,180,255,.5)';mm.strokeRect(1,1,minimap.width-2,minimap.height-2);
  const sx=minimap.width/state.currentMap.world.w,sy=minimap.height/state.currentMap.world.h;
  mm.strokeStyle='rgba(78,180,255,.08)';mm.lineWidth=.7;for(let x=0;x<=state.currentMap.world.w;x+=1000){mm.beginPath();mm.moveTo(x*sx,0);mm.lineTo(x*sx,minimap.height);mm.stroke();}for(let y=0;y<=state.currentMap.world.h;y+=1000){mm.beginPath();mm.moveTo(0,y*sy);mm.lineTo(minimap.width,y*sy);mm.stroke();}
  if(progress.mapId==='x1'){const b=currentBasePoint();mm.strokeStyle='rgba(100,255,190,.65)';mm.lineWidth=2;mm.beginPath();mm.arc(b.x*sx,b.y*sy,SAFE_ZONE.radius*Math.min(sx,sy),0,TWO_PI);mm.stroke();}
  for(const p of resolvedPortals()){mm.fillStyle='#56dbff';mm.beginPath();mm.arc(p.x*sx,p.y*sy,4,0,TWO_PI);mm.fill();}
  const sectorControl=sectorControlState();if(sectorControl){for(const node of sectorControl.nodes||[]){const x=node.x*sx,y=node.y*sy,r=Math.max(5,(Number(node.radius)||360)*Math.min(sx,sy)),color=node.owner?sectorFactionColor(node.owner):(node.challenger?sectorFactionColor(node.challenger):'#8aa0ad');mm.fillStyle=node.contested?'rgba(255,255,255,.12)':hexToRgba(color,.10);mm.strokeStyle=node.contested?'#ffffff':color;mm.lineWidth=node.contested?1.7:1.1;mm.setLineDash(node.contested?[3,2]:[]);mm.beginPath();mm.arc(x,y,r,0,TWO_PI);mm.fill();mm.stroke();mm.setLineDash([]);mm.fillStyle=color;mm.beginPath();mm.arc(x,y,3.5,0,TWO_PI);mm.fill();mm.fillStyle='#ffffff';mm.font='bold 6px Arial';mm.textAlign='center';mm.fillText(String(node.id||'?'),x,y+2);}}
  for(const l of state.landmarks){mm.fillStyle=l.type==='wreck'?'#ffc45a':l.type==='scan'?'#bd78ff':'#4fd7ff';mm.fillRect(l.x*sx-1,l.y*sy-1,2,2);}
  const px=player.x*sx,py=player.y*sy,tx=player.tx*sx,ty=player.ty*sy,rad=state.radarRange*Math.min(sx,sy);mm.strokeStyle='rgba(130,220,255,.22)';mm.lineWidth=1;mm.beginPath();mm.arc(px,py,rad,0,TWO_PI);mm.stroke();
  if(routeDistance()>35){mm.strokeStyle='rgba(115,225,255,.55)';mm.setLineDash([4,3]);mm.beginPath();mm.moveTo(px,py);mm.lineTo(tx,ty);mm.stroke();mm.setLineDash([]);mm.strokeStyle='#fff';mm.beginPath();mm.arc(tx,ty,4,0,TWO_PI);mm.stroke();}
  for(const e of state.enemies){
    if(e.hp<=0)continue;
    const dist=Math.hypot(e.x-player.x,e.y-player.y),eventPinned=!!e.eventNpc;
    if(dist>state.radarRange&&!eventPinned)continue;
    const selected=state.target?.id===e.id,x=e.x*sx,y=e.y*sy;
    if(eventPinned){
      const pulse=5.2+Math.sin(nowSec()*4+x*.01+y*.01)*1.1;
      mm.fillStyle=selected?'#ffec67':'#ffb347';
      mm.beginPath();mm.arc(x,y,selected?4.2:(String(e.type||'').startsWith('boss')?3.4:2.6),0,TWO_PI);mm.fill();
      mm.strokeStyle=selected?'rgba(255,245,168,.95)':'rgba(255,177,71,.85)';
      mm.lineWidth=selected?1.4:1.1;mm.beginPath();mm.arc(x,y,pulse,0,TWO_PI);mm.stroke();
      continue;
    }
    mm.fillStyle=selected?'#ffec67':'#ff755d';
    mm.beginPath();mm.arc(x,y,selected?3.8:(String(e.type||'').startsWith('boss')?2.8:1.8),0,TWO_PI);mm.fill();
    if(selected){mm.strokeStyle='#fff5a8';mm.lineWidth=1;mm.beginPath();mm.arc(x,y,6,0,TWO_PI);mm.stroke();}
  }
  const convoy=galaxyEventRuntime.convoy;if(convoy){mm.fillStyle='#5ef1ff';mm.fillRect(convoy.x*sx-3,convoy.y*sy-3,6,6);}
  // V16.5: radar social — hostis, companhia e aliança aparecem no mesmo mapa.
  for(const rp of onlineWorld.players.values()){
    if(Math.hypot(rp.x-player.x,rp.y-player.y)>state.radarRange)continue;
    const x=rp.x*sx,y=rp.y*sy,selected=state.target?.isPlayer&&state.target.id===rp.id,enemy=onlinePlayerEnemy(rp),sameGroup=isBattleGroupMember(rp.id),sameClan=!!currentClanTag()&&!!rp.clanTag&&rp.clanTag===currentClanTag(),ally=!enemy;
    const size=selected?6.2:sameGroup?5.8:sameClan?5.2:4.6,color=selected?'#ffea67':sameGroup?'#5ee8ff':enemy?'#ff4d69':sameClan?'#ffe16b':'#57e6a8',stroke=selected?'#fff4a8':sameGroup?'#d8fbff':enemy?'#ffd4dc':sameClan?'#fff3b2':'#d7fff0';
    mm.save();mm.translate(x,y);mm.rotate(enemy?Math.PI/4:0);mm.fillStyle=color;mm.strokeStyle=stroke;mm.lineWidth=1;
    if(sameGroup){mm.beginPath();mm.arc(0,0,size,0,TWO_PI);mm.fill();mm.stroke();}
    else if(sameClan){mm.beginPath();mm.moveTo(0,-size);mm.lineTo(size,0);mm.lineTo(0,size);mm.lineTo(-size,0);mm.closePath();mm.fill();mm.stroke();}
    else if(ally){mm.beginPath();mm.moveTo(0,-size);mm.lineTo(size*.85,size);mm.lineTo(-size*.85,size);mm.closePath();mm.fill();mm.stroke();}
    else{mm.fillRect(-size/2,-size/2,size,size);mm.strokeRect(-size/2,-size/2,size,size);}mm.restore();
  }
  const rally=battleGroupRally();if(rally&&rally.mapId===progress.mapId&&(!rally.territoryFaction||rally.territoryFaction===onlineTerritoryKey())){const rx=rally.x*sx,ry=rally.y*sy,pulse=7+Math.sin(nowSec()*4)*1.4;mm.strokeStyle='#66eaff';mm.fillStyle='rgba(80,225,255,.18)';mm.lineWidth=1.5;mm.beginPath();mm.arc(rx,ry,pulse,0,TWO_PI);mm.fill();mm.stroke();mm.fillStyle='#d9fbff';mm.font='bold 7px Arial';mm.textAlign='center';mm.fillText('R',rx,ry+2.5);}
  mm.fillStyle=getFaction()?.color||'#fff';mm.beginPath();mm.arc(px,py,4.5,0,TWO_PI);mm.fill();mm.strokeStyle='rgba(255,255,255,.7)';mm.stroke();
}
function draw(){const q=qualityProfile();ctx.clearRect(0,0,W,H);if(!progress||gameBootstrapRuntime.loading){drawNebula();drawStars();return;}if(!(q.background&&drawMapBackground()))drawNebula();drawStars();drawEnvironmentLighting();if(q.grid)drawSectorGrid();drawBounds();drawLandmarks();drawBaseSafeZone();drawPortals();drawWarfrontControlWorld();drawOres();drawLoot();drawGalaxyEventWorld();state.enemies.forEach(e=>e.hp>0&&onScreenWorld(e.x,e.y,180)&&drawEnemy(e));drawOnlinePlayers();if(q.fx)drawRocketFx();drawPlayer();drawPet();if(q.fx)drawFx();drawParticles();drawNavigationOverlay();drawMinimap();}

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
  if(ui.petFloatStatus){const gear=pet.activeGear==='off'?'COMPANHIA':(PET_GEARS[pet.activeGear]?.name||'COMPANHIA');const behavior=({guard:'EM COMBATE',box:'BUSCANDO BOX',ore:'BUSCANDO PEDRA',repair:'REPARANDO',kami:petRuntime.kamiArmed?'NOVA BURST ARMADO':'NOVA BURST',roam:'PATRULHANDO',escort:'ESCOLTANDO'})[petRuntime.taskType]||'LIVRE';const rangeLabel=pet.activeGear==='guard'?`ATAQUE ${fmt(petCombatSearchRange())}`:(pet.activeGear==='box'||pet.activeGear==='ore')?`COLETA ${fmt(petCollectionRange())}`:pet.activeGear==='repair'?'SUPORTE':pet.activeGear==='kami'?'ASSALTO':'ESCOLTA';const pd=currentPetDesign();ui.petFloatStatus.textContent=`${behavior} • ${gear} • ${rangeLabel}${pd?` • ${pd.name}`:''}`;}
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
  const f=getFaction(),ship=SHIPS[progress.activeShipId],baseSafe=isBaseSafeZone(),portalSafe=isPortalNeutralZone(),safe=baseSafe||portalSafe;ui.factionLabel.textContent=f?.short||'—';ui.factionLabel.style.color=f?.color||'';ui.mapLabel.textContent=displayMapLabel(progress.mapId);if(ui.sectorName)ui.sectorName.textContent=state.currentMap.name||'Setor';if(ui.coordLabel)ui.coordLabel.textContent=`${Math.round(player.x)} / ${Math.round(player.y)}`;if(ui.routeLabel){const rd=routeDistance();ui.routeLabel.textContent=rd>35?`${fmt(rd)}u`:'PARADO';ui.routeLabel.parentElement?.classList.toggle('active',rd>35);}if(ui.discoveriesLabel){const found=state.landmarks.filter(l=>progress.discoveries?.[`${progress.mapId}:${l.id}`]).length;ui.discoveriesLabel.textContent=`${found}/${state.landmarks.length}`;}const shipDesign=currentShipDesign();ui.shipLabel.textContent=shipDesign?`${ship.name} • ${shipDesign.name}`:ship.name;if(ui.lvl){const lv=Number(progress.profile.level)||1,xp=Math.max(0,Number(progress.profile.xp)||0);ui.lvl.textContent=`${lv} • ${fmt(xp)} XP`;const maxed=lv>=PLAYER_MAX_LEVEL,next=maxed?levelXpThreshold(PLAYER_MAX_LEVEL):levelXpThreshold(lv+1),missing=maxed?0:Math.max(0,next-xp);const tip=maxed?`Nível máximo • ${fmt(xp)} XP total`:`${fmt(xp)} XP total • faltam ${fmt(missing)} XP para o nível ${lv+1} • ${Math.round(levelProgressPercent(xp,lv))}% do nível atual`;ui.lvl.title=tip;ui.lvl.parentElement.title=tip;}ui.hp.textContent=fmt(player.hp);ui.maxHp.textContent=fmt(player.maxHp);ui.shield.textContent=fmt(player.shield);ui.maxShield.textContent=fmt(player.maxShield);ui.speed.textContent=fmt(player.speed*shipAbilitySpeedMultiplier());if(ui.dmg)ui.dmg.textContent=fmt(player.laserDamage*currentLaserAmmo().mult);ui.credits.textContent=fmt(progress.profile.credits);ui.uridium.textContent=fmt(progress.profile.uridium);ui.xp.textContent=fmt(progress.profile.xp);ui.xp.title=progress.profile.level>=PLAYER_MAX_LEVEL?'Nível máximo':`Próximo nível: ${fmt(levelXpThreshold(progress.profile.level+1))} XP • ${Math.round(levelProgressPercent(progress.profile.xp,progress.profile.level))}%`;if(ui.droneCount)ui.droneCount.textContent=progress.drones.length;ui.laserToggle.classList.toggle('active',player.laserFiring);ui.rocketCd.textContent=rocketReady()?'MÍSSIL PRONTO':`MÍSSIL ${(getRocketCooldown()-(nowSec()-player.lastRocketShot)).toFixed(1)}s`;
  if(ui.shipHudArt)ui.shipHudArt.src=shipCardAsset(progress.activeShipId)||shipCardAsset('phoenix');
  if(ui.factionIcon)ui.factionIcon.src=factionAsset(progress.profile.faction);
  if(ui.userLabel)ui.userLabel.textContent=progress.profile.callsign||getUser()?.callsign||'Pilot';updateRankChip();if(ui.petBtn)ui.petBtn.textContent=progress.pet?.owned?`AUX-9 LV${progress.pet.level}`:'AUX-9 LOJA';if(ui.safeZoneLabel){const portalCombat=portalSafe&&state.portalCombatUntil>nowSec();ui.safeZoneLabel.textContent=baseSafe?'BASE • ZONA SEGURA':portalCombat?'PORTAL • COMBATE ATIVO':portalSafe?'PORTAL • ZONA NEUTRA':'ZONA DE COMBATE';ui.safeZoneLabel.classList.toggle('active',safe&&!portalCombat);ui.safeZoneLabel.classList.toggle('danger-lite',portalCombat);}updatePremiumBadge();if(ui.cargoUsed)ui.cargoUsed.textContent=fmt(cargoUsed());if(ui.cargoMax)ui.cargoMax.textContent=fmt(cargoCapacity());if(ui.cargoBtn)ui.cargoBtn.classList.toggle('gold',isAtTrader());updatePetFloat();updateAbilityHud();updateBossHud();updateTargetLockHud();updateCombatStateHud();renderGalaxyEventHud();updateBaseTradePrompt();updateProgressionAccessLocks();renderActiveMissionHud();
  ui.shopCredits.textContent=fmt(progress.profile.credits);ui.shopStellarium.textContent=fmt(progress.profile.uridium);ui.hangarShipName.textContent=ship.name;updateExtraControls();
  const portal=nearbyPortal();if(portal&&!state.jumping&&ui.portalPrompt){const pos=screenPos(portal.x,portal.y);ui.portalPrompt.style.left=`${Math.max(85,Math.min(W-85,pos.x))}px`;ui.portalPrompt.style.top=`${Math.max(115,Math.min(H-90,pos.y-58))}px`;{const pa=canTravelGraphLabel(portal.targetLabel||displayMapLabel(portal.to,portal.targetTerritoryFaction));ui.portalPromptMap.textContent=pa.ok?`Destino ${portal.targetLabel||displayMapLabel(portal.to)} • clique ou J`:`🔒 ${pa.reason}`;}ui.portalPrompt.classList.remove('hidden');}else ui.portalPrompt?.classList.add('hidden');
}

function canAfford(price,currency){return currency==='credits'?progress.profile.credits>=price:progress.profile.uridium>=price;}
function charge(price,currency){if(!canAfford(price,currency))return false;if(currency==='credits')progress.profile.credits-=price;else progress.profile.uridium-=price;telemetrySpend(currency,price);return true;}
function priceText(p,c){return `${fmt(p)} ${c==='credits'?'CR':'STL'}`;}
function productIcon(type,subtype){return type==='ship'?'🛸':type==='laser'?'⚡':type==='generator'?(subtype==='speed'?'💨':'🛡️'):type==='drone'?'◆':type==='pet'?'🤖':type==='extra'?'🧩':type==='ammo'?'✦':'🚀';}

function ownsExtraItem(itemId){
  return (progress?.inventory?.[itemId]||0)>0||(progress?.shipLoadout?.extras||[]).includes(itemId);
}
function itemSellValue(item){if(!item)return 0;const key=item.type==='drone'?`drone:${item.id}`:`item:${item.id}`,row=liveCatalog(key);return row?Math.max(1,Math.floor((Number(row.price)||0)*.5)):0;}
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
function confirmSaleNow(){const action=pendingConfirmAction;if(!action){closeSaleConfirm();return;}const back=confirmReturnModal;pendingConfirmAction=null;confirmReturnModal=null;ui.saleConfirmModal?.classList.add('hidden');if(back)back.classList.remove('hidden');action();if(back===ui.hangarModal&&!back.classList.contains('hidden'))renderHangar();else if(back===ui.pilotModal&&!back.classList.contains('hidden'))renderPilotProfile();}
async function performSellInventoryItem(itemId,qty=1){
  const item=ITEMS[itemId],have=progress?.inventory?.[itemId]||0;qty=Math.max(1,Math.floor(qty));
  if(!item||have<qty){showToast('Item não disponível para venda');return;}
  try{const r=await runEconomyAction('sell_inventory',{item_id:itemId,qty});showToast(`${item.name} vendido por ${fmt(r?.info?.total||0)} ${saleCurrencyLabel(r?.info?.currency)}`);}catch(e){showToast(e.message||'Venda recusada pelo servidor');}
}
function sellInventoryItem(itemId,qty=1){
  const item=ITEMS[itemId],have=progress?.inventory?.[itemId]||0;qty=Math.max(1,Math.floor(qty));
  if(!item||have<qty){showToast('Item não disponível para venda');return;}
  const total=itemSellValue(item)*qty;
  openSaleConfirm({title:'Vender equipamento?',itemName:`${item.name}${qty>1?` ×${qty}`:''}`,detail:'Confirme antes de remover o item do inventário. A venda é definitiva.',value:total,currency:item.currency,onConfirm:()=>performSellInventoryItem(itemId,qty)});
}
function buyShip(shipId){const ship=SHIPS[shipId];if(!ship)return;if(ship.eventOnly||ship.shopAvailable===false){showToast(`${ship.name}: nave reservada para Evento / Missão / Passe`);return;}if(progress.ownedShips.includes(shipId)){showToast('Nave já obtida');return;}const q=liveQuote(`ship:${shipId}`);if(!q){showToast('Produto indisponível no catálogo LIVE OPS');return;}if(!canAfford(q.price,q.currency)){showToast('Saldo insuficiente');return;}openSpendConfirm({title:'Comprar nave?',itemName:ship.name,detail:`Preço validado no Supabase.${q.price<q.basePrice?' PREMIUM -5% aplicado no servidor.':''}`,value:q.price,currency:q.currency,onConfirm:()=>applyAuthoritativePurchase(q.catalog_key,ship.name)});}
function buyItem(itemId){const item=ITEMS[itemId];if(!item)return;if(item.type==='drone'){buyDrone(itemId);return;}if(item.type==='extra'&&ownsExtraItem(itemId)){showToast('Esse EXTRA já pertence à sua conta');return;}const q=liveQuote(`item:${itemId}`);if(!q){showToast('Produto indisponível no catálogo LIVE OPS');return;}if(!canAfford(q.price,q.currency)){showToast('Saldo insuficiente');return;}openSpendConfirm({title:'Comprar item?',itemName:item.name,detail:`Preço validado no Supabase.${q.price<q.basePrice?' PREMIUM -5% aplicado no servidor.':''}`,value:q.price,currency:q.currency,onConfirm:()=>applyAuthoritativePurchase(q.catalog_key,item.name)});}
function buyDrone(type){if(progress.drones.length>=8){showToast('Limite de 8 drones atingido');return;}const item=ITEMS[type];if(!item)return;const q=liveQuote(`drone:${type}`);if(!q){showToast('Drone indisponível no catálogo LIVE OPS');return;}if(!canAfford(q.price,q.currency)){showToast('Saldo insuficiente');return;}openSpendConfirm({title:'Comprar drone?',itemName:item.name,detail:`Preço validado no Supabase.${q.price<q.basePrice?' PREMIUM -5% aplicado no servidor.':''}`,value:q.price,currency:q.currency,onConfirm:()=>applyAuthoritativePurchase(q.catalog_key,item.name)});}
function buyAmmo(id){const ammo=LASER_AMMO[id];if(!ammo||ammo.purchasable===false||ammo.sourceOnly===true)return;const q=liveQuote(`ammo:${id}`);if(!q){showToast('Munição indisponível no catálogo LIVE OPS');return;}if(!canAfford(q.price,q.currency)){showToast('Saldo insuficiente');return;}openSpendConfirm({title:'Comprar munição?',itemName:`${ammo.name} • pacote ${fmt(ammo.pack)}`,detail:'Preço e quantidade validados pelo servidor.',value:q.price,currency:q.currency,onConfirm:()=>applyAuthoritativePurchase(q.catalog_key,ammo.name),confirmLabel:'CONFIRMAR COMPRA'});}
function buyRockets(id){const rocket=ROCKETS[id];if(!rocket||rocket.purchasable===false||rocket.sourceOnly===true)return;const q=liveQuote(`rocket:${id}`);if(!q){showToast('Míssil indisponível no catálogo LIVE OPS');return;}if(!canAfford(q.price,q.currency)){showToast('Saldo insuficiente');return;}openSpendConfirm({title:'Comprar míssil?',itemName:`${rocket.name} • pacote ${fmt(rocket.pack)}`,detail:'Preço e quantidade validados pelo servidor.',value:q.price,currency:q.currency,onConfirm:()=>applyAuthoritativePurchase(q.catalog_key,rocket.name),confirmLabel:'CONFIRMAR COMPRA'});}


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
  progress.shipLoadout[key][index]=null;compactEquipmentSlotsInPlace(progress.shipLoadout[key]);addInventory(id);
  let overflow=0;
  if(key==='extras'){
    for(const flag of ['autoLaser','autoRocket','turboRocket'])progress.flags[flag]=false;
    overflow=normalizeLoadout();
  }
  computeStats(true);saveGame();renderHangar();buildAmmoButtons();
  if(wasExpansion&&overflow>0)showToast(`${overflow} equipamento${overflow>1?'s':''} excedente${overflow>1?'s':''} voltou${overflow>1?'aram':''} ao inventário`);
}
function equipDroneItem(itemId){if(!canChangeEquipment()){showToast('Configure drones somente dentro da sua base X-1');return;}const item=ITEMS[itemId];if(!(item.type==='laser'||(item.type==='generator'&&item.subtype==='shield'))){showToast('Drones aceitam lasers ou geradores de escudo');return;}const drone=progress.drones.find(d=>d.slots.some(v=>!v));if(!drone){showToast('Nenhum slot livre nos drones');return;}if(!removeInventory(itemId))return;drone.slots[drone.slots.findIndex(v=>!v)]=itemId;computeStats(true);saveGame();renderHangar();buildAmmoButtons();}
function unequipDroneSlot(droneId,index){if(!canChangeEquipment()){showToast('Configure drones somente dentro da sua base X-1');return;}const d=progress.drones.find(x=>x.id===droneId);if(!d||!d.slots[index])return;addInventory(d.slots[index]);d.slots[index]=null;compactEquipmentSlotsInPlace(d.slots);computeStats(true);saveGame();renderHangar();buildAmmoButtons();}
async function performSellDrone(droneId){
  const d=progress.drones.find(x=>x.id===droneId);if(!d)return;const model=ITEMS[d.type];
  try{const r=await runEconomyAction('sell_drone',{drone_id:droneId});showToast(`${model.name} vendido por ${fmt(r?.info?.refund||0)} ${saleCurrencyLabel(r?.info?.currency)} • equipamentos retornaram ao inventário`);}catch(e){showToast(e.message||'Venda do drone recusada pelo servidor');}
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
function equipmentCategory(item){
  if(!item)return 'other';
  if(item.type==='laser')return 'lasers';
  if(item.type==='generator'&&item.subtype==='shield')return 'shields';
  if(item.type==='generator'&&item.subtype==='speed')return 'engines';
  if(item.type==='extra')return 'extras';
  return 'other';
}
const HANGAR_FILTER_LABELS={all:'TODOS',lasers:'LASERS',shields:'ESCUDOS',engines:'MOTORES',extras:'EXTRAS'};
const hangarUiPrefs={loaded:false,collapsed:{}};
function loadHangarEquipmentPrefs(){
  if(hangarUiPrefs.loaded)return;hangarUiPrefs.loaded=true;
  try{
    const raw=JSON.parse(localStorage.getItem('stellar_hangar_equipment_ui_v1679')||'{}');
    if(HANGAR_FILTER_LABELS[raw.equipmentFilter])state.hangarEquipFilter=raw.equipmentFilter;
    if(['all','lasers','shields'].includes(raw.droneFilter))state.hangarDroneFilter=raw.droneFilter;
    if(['all','lasers','shields'].includes(raw.petFilter))state.hangarPetFilter=raw.petFilter;
    if(raw.collapsed&&typeof raw.collapsed==='object')hangarUiPrefs.collapsed={...raw.collapsed};
  }catch{}
}
function saveHangarEquipmentPrefs(){
  try{localStorage.setItem('stellar_hangar_equipment_ui_v1679',JSON.stringify({equipmentFilter:state.hangarEquipFilter,droneFilter:state.hangarDroneFilter,petFilter:state.hangarPetFilter,collapsed:hangarUiPrefs.collapsed}));}catch{}
}
function setHangarEquipmentFilter(scope,filter){
  if(scope==='ship')state.hangarEquipFilter=filter;
  else if(scope==='drone')state.hangarDroneFilter=filter;
  else state.hangarPetFilter=filter;
  saveHangarEquipmentPrefs();renderHangar();
}
function toggleHangarEquipSection(key){hangarUiPrefs.collapsed[key]=!hangarUiPrefs.collapsed[key];saveHangarEquipmentPrefs();renderHangar();}
function hangarFilterBar(scope,filters,active){
  const bar=document.createElement('div');bar.className='hangar-filter-bar';
  const label=document.createElement('span');label.className='hangar-filter-label';label.textContent='FILTRO';bar.appendChild(label);
  for(const filter of filters){const b=document.createElement('button');b.type='button';b.className=`hangar-filter-btn ${active===filter?'active':''}`;b.textContent=HANGAR_FILTER_LABELS[filter]||filter.toUpperCase();b.onclick=()=>setHangarEquipmentFilter(scope,filter);bar.appendChild(b);}
  return bar;
}
function hangarSection(title,meta,key,body){
  const box=document.createElement('section');box.className=`section-box hangar-equip-section ${hangarUiPrefs.collapsed[key]?'collapsed':''}`;
  const head=document.createElement('button');head.type='button';head.className='hangar-section-head';head.innerHTML=`<span><b>${title}</b>${meta?`<small>${meta}</small>`:''}</span><em>${hangarUiPrefs.collapsed[key]?'▸':'▾'}</em>`;head.onclick=()=>toggleHangarEquipSection(key);box.appendChild(head);
  const wrap=document.createElement('div');wrap.className='hangar-section-body';wrap.appendChild(body);box.appendChild(wrap);return box;
}
function inventoryMatchesFilter(item,filter){return filter==='all'||equipmentCategory(item)===filter;}
function inventoryCard(itemId,count,context='ship'){
  const item=ITEMS[itemId],art=GAME_ASSETS.equipment[itemId];const el=document.createElement('div');el.className=`inventory-card hangar-inventory-card cat-${equipmentCategory(item)}`;
  el.innerHTML=`${art?`<img class="inventory-item-art" src="${art}" alt="${item.name}">`:''}<b>${item.name}</b><div class="qty">Quantidade: ${count}</div><div class="muted hangar-item-desc">${item.description}</div>`;
  const actions=document.createElement('div');actions.className='inventory-actions';
  const addButton=(label,fn,primary=false)=>{const b=document.createElement('button');b.className=primary?'equip-btn':'ghost-btn';b.textContent=label;b.onclick=fn;actions.appendChild(b);};
  const cat=equipmentCategory(item);
  if(['lasers','shields','engines','extras'].includes(cat))addButton('Nave',()=>equipShipItem(itemId),context==='ship');
  if((cat==='lasers'||cat==='shields')&&progress.drones.length)addButton('Drone',()=>equipDroneItem(itemId),context==='drone');
  if(progress.pet?.owned&&(cat==='lasers'||cat==='shields'))addButton('AUX-9',()=>equipPetItem(itemId,cat==='lasers'?'laser':'shield'),context==='pet');
  const sell=document.createElement('button');sell.className='danger-btn sell-item-btn';sell.textContent=`Vender 50% • ${fmt(itemSellValue(item))} ${item.currency==='uridium'?'STL':'CR'}`;sell.onclick=()=>sellInventoryItem(itemId,1);actions.appendChild(sell);el.appendChild(actions);return el;
}
function filteredInventoryGrid(filter,context='ship',allowed=['lasers','shields','engines','extras']){
  const grid=document.createElement('div');grid.className='inventory-grid hangar-inventory-grid';
  const entries=Object.entries(progress.inventory).filter(([id,q])=>q>0&&ITEMS[id]&&allowed.includes(equipmentCategory(ITEMS[id]))&&inventoryMatchesFilter(ITEMS[id],filter));
  if(!entries.length){grid.innerHTML='<div class="empty-state compact-empty">Nenhum equipamento desse tipo disponível no inventário.</div>';return grid;}
  entries.sort((a,b)=>equipmentCategory(ITEMS[a[0]]).localeCompare(equipmentCategory(ITEMS[b[0]]))||ITEMS[a[0]].name.localeCompare(ITEMS[b[0]].name));
  for(const [id,q] of entries)grid.appendChild(inventoryCard(id,q,context));return grid;
}


function renderHangarShips(){
  const root=document.createElement('div'),defs=designerCatalog().filter(d=>d.kind==='ship'),activeDesign=currentShipDesign(),eligible=shipDesignerEligible();
  const designerBox=document.createElement('div');designerBox.className='section-box ship-designer-console';
  const cards=defs.map(d=>`<div class="designer-summary-card ${d.rarity||'epic'}"><div class="designer-orb" style="--designer-glow:${d.visual?.glow||'#7edcff'};--designer-accent:${d.visual?.accent||'#fff'}"></div><div><b>${d.name}</b><small>${designerBonusSummary(d)}</small><span>${rarityLabel(d.rarity)} • EVENTO • Inventário ${ownedDesignQty(d.design_id)}</span></div></div>`).join('');
  designerBox.innerHTML=`<h3>DESIGNERS DE NAVE • ELITE / EVENTO</h3><div class="muted" style="font-size:12px;margin-bottom:10px">O designer ativo altera visual, atributos e a habilidade da tecla E. Naves comuns de Créditos não aceitam designer.</div><div class="designer-summary-grid">${cards||'<div class="muted">Sincronizando catálogo...</div>'}</div>`;
  const control=document.createElement('div');control.className='designer-loadout-control';const label=document.createElement('label');label.textContent=`NAVE ATIVA • ${SHIPS[progress.activeShipId]?.name||progress.activeShipId}`;const sel=document.createElement('select');sel.className='designer-select';
  const none=document.createElement('option');none.value='';none.textContent=eligible?'SEM DESIGNER':'NAVE NÃO ELEGÍVEL';sel.appendChild(none);
  defs.forEach(d=>{const opt=document.createElement('option');opt.value=d.design_id;opt.textContent=`${d.name} • ${rarityLabel(d.rarity)} • ${ownedDesignQty(d.design_id)}x`;opt.disabled=ownedDesignQty(d.design_id)<=0;sel.appendChild(opt);});sel.value=activeDesign?.design_id||'';sel.disabled=!eligible||!canChangeEquipment();sel.onchange=()=>equipShipDesigner(sel.value||null);control.append(label,sel);if(!eligible){const note=document.createElement('small');note.textContent='Ative uma nave ELITE (STL) ou ESPECIAL DE EVENTO para usar designers.';control.appendChild(note);}designerBox.appendChild(control);root.appendChild(designerBox);

  const wrap=document.createElement('div');wrap.className='ship-grid';
  const catalog=Object.values(SHIPS);
  const orderedShips=[...catalog.filter(s=>progress.ownedShips.includes(s.id)),...catalog.filter(s=>!progress.ownedShips.includes(s.id))];
  orderedShips.forEach(s=>{
    const owned=progress.ownedShips.includes(s.id),active=s.id===progress.activeShipId,event=!!s.eventOnly||s.shopAvailable===false,design=active?activeDesign:null,visual=design?.visual||{},c=document.createElement('div');c.className=`ship-card ${active?'active-ship':''} ${design?'has-designer '+(design.rarity||''):''}`;if(design)c.style.setProperty('--designer-glow',visual.glow||'#7edcff');
    c.innerHTML=`<div class="ship-visual designer-ship-art-wrap"><img src="${shipCardAsset(s.id)||shipCardAsset('phoenix')}" alt="${s.name}" ${design?`style="filter:${designerVisualCss(design)}"`:''}>${design?`<span class="designer-equipped-badge">${rarityLabel(design.rarity)} • ${design.name}</span>`:''}</div><div><span class="badge ${shipDesignerEligible(s.id)?'elite':''}">${owned?'OBTIDA':'BLOQUEADA'}${shipDesignerEligible(s.id)?' • ELITE':''}</span><h3>${s.name}</h3></div><div class="ship-stats">HP ${fmt(s.hp)}<br>Lasers ${s.lasers} • Geradores ${s.generators} • Extras ${s.extras}<br>VEL ${s.speed} • Cargo ${fmt(s.cargo)}${design?`<br><b>${designerBonusSummary(design)}</b>`:''}</div>`;
    const b=document.createElement('button');b.className='equip-btn';b.textContent=active?'Nave ativa':owned?'Usar nave':event?'EVENTO / MISSÃO / PASSE':'Comprar na Loja';b.disabled=active||(!owned&&event);b.onclick=()=>owned?switchShip(s.id):(ui.hangarModal.classList.add('hidden'),openShop('ships'));c.appendChild(b);wrap.appendChild(c);
  });root.appendChild(wrap);return root;
}
function shipEquipmentSectionData(filter,ship,extraCap){
  if(filter==='lasers')return {title:'LASERS',meta:`${progress.shipLoadout.lasers.filter(Boolean).length}/${ship.lasers} equipados`,key:'lasers',list:progress.shipLoadout.lasers,slotPrefix:'Laser'};
  if(filter==='extras')return {title:'EXTRAS',meta:`${progress.shipLoadout.extras.filter(Boolean).length}/${extraCap} equipados`,key:'extras',list:progress.shipLoadout.extras,slotPrefix:'Extra'};
  const gen=progress.shipLoadout.generators;
  const subtype=filter==='shields'?'shield':'speed',name=filter==='shields'?'ESCUDOS':'MOTORES',prefix=filter==='shields'?'Escudo':'Motor';
  const matching=gen.map((id,i)=>({id,i})).filter(x=>x.id&&ITEMS[x.id]?.subtype===subtype),empty=gen.map((id,i)=>({id,i})).filter(x=>!x.id);
  return {title:name,meta:`${matching.length} equipados • ${empty.length} slots de gerador livres`,key:'generators',filtered:true,matching,empty,slotPrefix:prefix};
}
function buildShipEquipmentSection(filter,ship,extraCap){
  const def=shipEquipmentSectionData(filter,ship,extraCap),grid=document.createElement('div');grid.className='slot-grid hangar-slot-grid';
  if(def.filtered){
    for(const x of def.matching)grid.appendChild(slotCard(`${def.slotPrefix} ${x.i+1}`,x.id,'generators',x.i));
    for(const x of def.empty)grid.appendChild(slotCard(`Gerador ${x.i+1}`,null,'generators',x.i));
  }else def.list.forEach((id,i)=>grid.appendChild(slotCard(`${def.slotPrefix} ${i+1}`,id,def.key,i)));
  return hangarSection(def.title,def.meta,`ship:${filter}`,grid);
}
function renderHangarEquipment(){
  loadHangarEquipmentPrefs();
  const ship=SHIPS[progress.activeShipId],root=document.createElement('div');root.className='hangar-equipment-console';
  const repairBot=activeRepairBot(),extraCap=shipExtraCapacity(),extraBonus=extraCap-ship.extras;
  const summary=document.createElement('div');summary.className='summary-grid hangar-summary-strip';summary.innerHTML=`<div class="stat-card">Dano<strong>${fmt(player.laserDamage)}</strong></div><div class="stat-card">Escudo<strong>${fmt(player.maxShield)}</strong></div><div class="stat-card">Absorção<strong>${player.shieldAbsorption}%</strong></div><div class="stat-card">VEL<strong>${fmt(player.speed)}</strong></div><div class="stat-card">Extras<strong>${extraCap}${extraBonus?` (+${extraBonus})`:''}</strong></div><div class="stat-card">Reparo<strong>${repairBot?`+${fmt(repairBot.id==='repElite'?10000:5000)}/s`:'OFF'}</strong></div>`;root.appendChild(summary);
  root.appendChild(hangarFilterBar('ship',['all','lasers','shields','engines','extras'],state.hangarEquipFilter));
  const layout=document.createElement('div');layout.className='hangar-equipment-split';
  const equipped=document.createElement('div');equipped.className='hangar-equipment-pane equipped-pane';equipped.innerHTML=`<div class="hangar-pane-title"><span>NAVE • EQUIPADOS</span><b>${ship.name}</b></div>`;
  const filters=state.hangarEquipFilter==='all'?['lasers','shields','engines','extras']:[state.hangarEquipFilter];
  for(const filter of filters)equipped.appendChild(buildShipEquipmentSection(filter,ship,extraCap));
  const inventory=document.createElement('div');inventory.className='hangar-equipment-pane inventory-pane';inventory.innerHTML='<div class="hangar-pane-title"><span>INVENTÁRIO • DISPONÍVEIS</span><b>Equipar / vender</b></div>';
  inventory.appendChild(hangarSection('EQUIPAMENTOS',HANGAR_FILTER_LABELS[state.hangarEquipFilter],`ship:inventory:${state.hangarEquipFilter}`,filteredInventoryGrid(state.hangarEquipFilter,'ship')));
  layout.append(equipped,inventory);root.appendChild(layout);return root;
}

function renderHangarDrones(){
  loadHangarEquipmentPrefs();
  const root=document.createElement('div'),defs=designerCatalog().filter(d=>d.kind==='drone');root.className='hangar-drone-console';
  const summary=document.createElement('div');summary.className='section-box drone-designer-summary';
  const cards=defs.map(d=>{const owned=ownedDesignQty(d.design_id),equipped=equippedDesignCount(d.design_id),source=d.eligibility?.source||'EVENTO';const chance=d.design_id==='drone_fury'?'10%':d.design_id==='drone_aegis'?'10%':'EVENTO FUTURO';return `<div class="designer-summary-card ${d.rarity||'rare'}"><div class="designer-orb" style="--designer-glow:${d.visual?.glow||'#7edcff'};--designer-accent:${d.visual?.accent||'#fff'}"></div><div><b>${d.name}</b><small>${designerBonusSummary(d)}</small><span>${source} • ${chance} • Inventário ${owned} • Equipado ${equipped}/8</span></div></div>`;}).join('');
  summary.innerHTML=`<h3>DESIGNERS DE DRONE • SETS 8/8</h3><div class="designer-summary-grid">${cards||'<div class="muted">Sincronizando catálogo...</div>'}</div>`;root.appendChild(summary);
  root.appendChild(hangarFilterBar('drone',['all','lasers','shields'],state.hangarDroneFilter));
  const layout=document.createElement('div');layout.className='hangar-equipment-split';
  const equippedPane=document.createElement('div');equippedPane.className='hangar-equipment-pane equipped-pane';equippedPane.innerHTML=`<div class="hangar-pane-title"><span>DRONES • EQUIPADOS</span><b>${progress.drones.length}/8</b></div>`;
  if(!progress.drones.length)equippedPane.innerHTML+='<div class="empty-state">Você ainda não possui drones.</div>';
  progress.drones.forEach((d,idx)=>{
    const model=ITEMS[d.type],design=droneDesignFor(d.id),visual=design?.visual||{},body=document.createElement('div');body.className='drone-equipment-body';
    const top=document.createElement('div');top.className='drone-compact-head';top.innerHTML=`<div class="drone-mini-art"><img src="${droneCardAsset(d.type)}" alt="${model.name}" ${design?`style="filter:${visual.filter||'none'}"`:''}></div><div><b>${model.name} #${idx+1}</b><small>${model.slots} slot${model.slots>1?'s':''}${design?` • ${design.name}`:''}</small></div>`;body.appendChild(top);
    const designerBox=document.createElement('div');designerBox.className='drone-designer-control compact';const label=document.createElement('label');label.textContent='DESIGNER';const sel=document.createElement('select');sel.className='designer-select';const none=document.createElement('option');none.value='';none.textContent='SEM DESIGNER';sel.appendChild(none);defs.forEach(def=>{const opt=document.createElement('option'),owned=ownedDesignQty(def.design_id),used=equippedDesignCount(def.design_id),current=design?.design_id===def.design_id;opt.value=def.design_id;opt.textContent=`${def.name} • ${owned}x`;opt.disabled=!current&&used>=owned;sel.appendChild(opt);});sel.value=design?.design_id||'';sel.disabled=!canChangeEquipment();sel.onchange=()=>equipDroneDesigner(d.id,sel.value||null);designerBox.append(label,sel);body.appendChild(designerBox);
    const sg=document.createElement('div');sg.className='slot-grid hangar-slot-grid';d.slots.forEach((id,i)=>{const item=id?ITEMS[id]:null,cat=equipmentCategory(item);if(state.hangarDroneFilter==='all'||!id||cat===state.hangarDroneFilter)sg.appendChild(slotCard(`Slot ${i+1}`,id,null,i,d.id));});body.appendChild(sg);
    const rm=document.createElement('button');rm.className='danger-btn drone-sell-compact';rm.textContent=`Vender drone • 50%`;rm.onclick=()=>sellDrone(d.id);body.appendChild(rm);
    equippedPane.appendChild(hangarSection(`${model.name} #${idx+1}`,`${d.slots.filter(Boolean).length}/${d.slots.length} slots`,`drone:${d.id}`,body));
  });
  const inv=document.createElement('div');inv.className='hangar-equipment-pane inventory-pane';inv.innerHTML='<div class="hangar-pane-title"><span>INVENTÁRIO • DRONES</span><b>Lasers / Escudos</b></div>';inv.appendChild(hangarSection('EQUIPAMENTOS',HANGAR_FILTER_LABELS[state.hangarDroneFilter],`drone:inventory:${state.hangarDroneFilter}`,filteredInventoryGrid(state.hangarDroneFilter,'drone',['lasers','shields'])));
  layout.append(equippedPane,inv);root.appendChild(layout);return root;
}

function renderHangarPet(){const root=document.createElement('div');root.className='hangar-embedded-panel pet-hangar-panel';renderPet(root);return root;}
function buildPilotBranch(branch,meta,avail){
  loadPilotUiPrefs();
  const skills=Object.values(PILOT_SKILLS).filter(s=>s.branch===branch),invested=skills.reduce((sum,s)=>sum+pilotSkillLevel(s.id),0),started=skills.filter(s=>pilotSkillLevel(s.id)>0).length,collapsed=!!pilotUiPrefs.collapsed[branch];
  const section=document.createElement('section');section.className=`pilot-branch ${meta.className}${collapsed?' collapsed':''}`;
  const head=document.createElement('button');head.type='button';head.className='pilot-branch-head';head.setAttribute('aria-expanded',String(!collapsed));head.innerHTML=`<span><b>${meta.label}</b><small>${invested} PP investidos • ${started}/${skills.length} pesquisas iniciadas</small></span><em>${collapsed?'▸':'▾'}</em>`;head.onclick=()=>togglePilotBranch(branch);section.appendChild(head);
  const body=document.createElement('div');body.className='pilot-branch-body';
  for(const skill of skills){
    const lv=pilotSkillLevel(skill.id),maxed=lv>=skill.max,reqInfo=pilotRequirementInfo(skill),req=!reqInfo||reqInfo.met,cost=maxed?0:pilotSkillCreditCost(skill,lv+1),card=document.createElement('article');card.className=`pilot-skill-node${maxed?' maxed':''}${!req?' locked':''}`;
    const reqHtml=reqInfo?`<div class="pilot-skill-req">${req?'✓':'🔒'} Requer ${reqInfo.skill.name} ${reqInfo.need}/${reqInfo.skill.max}${reqInfo.current?` • atual ${reqInfo.current}/${reqInfo.skill.max}`:''}</div>`:'';
    card.innerHTML=`<div class="pilot-skill-head"><b>${skill.name}</b><span>${lv}/${skill.max}</span></div><div class="pilot-skill-desc">${skill.desc}</div><div class="pilot-skill-bonus">ATUAL: <b>${pilotSkillBonusLabel(skill,lv)}</b>${!maxed?` • PRÓXIMO: <b>${pilotSkillBonusLabel(skill,lv+1)}</b>`:''}</div>${reqHtml}`;
    const b=document.createElement('button');b.className=maxed?'small-btn gold':'small-btn';b.disabled=maxed||!req||avail<=0||progress.profile.credits<cost;b.textContent=maxed?'MAX':`UP • 1 PP + ${fmt(cost)} CR`;b.onclick=()=>upgradePilotSkill(skill.id);card.appendChild(b);body.appendChild(card);
  }
  section.appendChild(body);return section;
}

function buildPilotTitlesPanel(){
  normalizePilotTitles();const current=activePilotTitle(),unlocked=PILOT_TITLES.filter(pilotTitleUnlocked).length;
  const section=document.createElement('section');section.className='pilot-title-profile';
  section.innerHTML=`<div class="pilot-title-profile-head"><div><div class="eyebrow">TÍTULOS DO PILOTO</div><h3>${current.label}</h3><small>${unlocked}/${PILOT_TITLES.length} títulos liberados • escolha a identidade exibida abaixo do callsign no mapa.</small></div><span class="pilot-title-current">EQUIPADO</span></div>`;
  const grid=document.createElement('div');grid.className='pilot-title-grid';
  for(const def of PILOT_TITLES){const pg=pilotTitleProgress(def),open=pg.current>=pg.target,selected=current.id===def.id,card=document.createElement('article');card.className=`pilot-title-card${open?' unlocked':' locked'}${selected?' selected':''}`;card.innerHTML=`<div class="pilot-title-card-top"><div><em>${escHtml(def.group||'TÍTULO')}</em><b>${escHtml(def.label)}</b></div><span>${open?'LIBERADO':'BLOQUEADO'}</span></div><p>${escHtml(def.desc)}</p><div class="pilot-title-progress"><div><i style="width:${pg.pct.toFixed(1)}%"></i></div><small>${escHtml(pg.text)}</small></div><small class="pilot-title-requirement">${open?'Disponível para equipar.':escHtml(def.req)}</small>`;const b=document.createElement('button');b.className=selected?'small-btn gold':'small-btn';b.disabled=!open||selected;b.textContent=selected?'EQUIPADO':open?'EQUIPAR':'BLOQUEADO';b.onclick=()=>selectPilotTitle(def.id);card.appendChild(b);grid.appendChild(card);}section.appendChild(grid);return section;
}

function renderHangarTitles(){
  normalizePilotTitles();
  const root=document.createElement('div');root.className='hangar-embedded-panel titles-hangar-panel';
  root.appendChild(buildPilotTitlesPanel());
  root.appendChild(buildAchievementsPanel());
  const hint=document.createElement('div');hint.className='pilot-title-help';hint.innerHTML='<b>IDENTIDADE DO PILOTO</b><span>A patente continua representada pelo emblema. No mapa, abaixo do callsign, aparece somente o título equipado — o nível não é exibido para outros pilotos.</span>';
  root.appendChild(hint);
  return root;
}

function renderHangarPilot(){
  normalizePilotBio();normalizePilotTitles();const p=progress.pilotBio,spent=pilotSpentPoints(),avail=pilotAvailablePoints(),next=p.totalPoints+1;
  const root=document.createElement('div');root.className='hangar-embedded-panel pilot-hangar-panel';
  const summary=document.createElement('div');summary.className='pilot-wallet-grid';summary.innerHTML=`<div><span>NÚCLEOS QUÂNTICOS</span><b>${fmt(p.logDisks)}</b></div><div><span>PP OBTIDOS</span><b>${p.totalPoints}/${PILOT_POINT_MAX}</b></div><div><span>PP DISPONÍVEIS</span><b>${avail}</b></div><div><span>PP INVESTIDOS</span><b>${spent}</b></div>`;root.appendChild(summary);
  const research=document.createElement('section');research.className='pilot-research-panel';
  const nextBox=document.createElement('div');if(p.totalPoints>=PILOT_POINT_MAX)nextBox.innerHTML='<div class="eyebrow">PESQUISA COMPLETA</div><h3>50 / 50 PP</h3><div class="muted">Limite máximo atingido.</div>';
  else{const logs=pilotPointLogCost(next);nextBox.innerHTML=`<div class="eyebrow">PRÓXIMO PONTO</div><h3>PP #${next}</h3><div>${fmt(logs)} Núcleos Quânticos • ${fmt(logs*LOG_DISK_URI_PRICE)} STL equivalente</div>`;const b=document.createElement('button');b.className='primary-btn';b.textContent='CONVERTER EM 1 PP';b.disabled=p.logDisks<logs;b.onclick=()=>convertPilotPoint();nextBox.appendChild(b);}research.appendChild(nextBox);
  const store=document.createElement('div');store.innerHTML='<div class="eyebrow">NÚCLEOS QUÂNTICOS • 300 STL CADA</div>';const row=document.createElement('div');row.className='pilot-log-buttons';[1,10,100,500].forEach(q=>{const b=document.createElement('button');b.className='small-btn';b.innerHTML=`${q}x <small>${fmt(q*LOG_DISK_URI_PRICE)} STL</small>`;b.disabled=progress.profile.uridium<q*LOG_DISK_URI_PRICE;b.onclick=()=>buyLogDisks(q);row.appendChild(b);});store.appendChild(row);research.appendChild(store);
  const reset=document.createElement('div');const resetCost=1000*Math.pow(2,p.resetCount);reset.innerHTML=`<div class="eyebrow">RECONFIGURAÇÃO</div><div>Reset #${p.resetCount+1}: ${fmt(resetCost)} STL</div>`;const rb=document.createElement('button');rb.className='ghost-btn';rb.textContent='RESETAR ÁRVORE';rb.disabled=spent<=0||progress.profile.uridium<resetCost;rb.onclick=()=>resetPilotTree();reset.appendChild(rb);research.appendChild(reset);root.appendChild(research);
  const tree=document.createElement('div');tree.className='pilot-skill-tree';for(const [branch,meta] of Object.entries(PILOT_BRANCHES))tree.appendChild(buildPilotBranch(branch,meta,avail));root.appendChild(tree);return root;
}
function renderHangar(){
  if(!progress)return;loadHangarEquipmentPrefs();
  const tabs={ships:'NAVES',equipment:'EQUIPAMENTOS',drones:'DRONES',pet:'AUX-9',titles:'TÍTULOS',pilot:'PERFIL DE PILOTO'};
  renderTabs(ui.hangarTabs,tabs,state.hangarTab,id=>{if(id==='pilot'&&!featureUnlocked('pilot')){showFeatureLock('pilot','Perfil de Piloto');return;}state.hangarTab=id;renderHangar();});const pilotTab=[...ui.hangarTabs.querySelectorAll('.tab-btn')][Object.keys(tabs).indexOf('pilot')];if(pilotTab&&!featureUnlocked('pilot')){pilotTab.classList.add('level-locked');pilotTab.title=`Libera no nível ${featureRequiredLevel('pilot')}`;}ui.hangarContent.innerHTML='';computeStats(true);
  const content=state.hangarTab==='ships'?renderHangarShips():state.hangarTab==='equipment'?renderHangarEquipment():state.hangarTab==='drones'?renderHangarDrones():state.hangarTab==='pet'?renderHangarPet():state.hangarTab==='titles'?renderHangarTitles():renderHangarPilot();
  ui.hangarContent.appendChild(content);updateUI();
}

function petEquipCard(kind,index){
  const pet=progress.pet,list=kind==='laser'?pet.lasers:pet.shields,id=list[index],item=id?ITEMS[id]:null;
  const card=document.createElement('div');card.className=`pet-slot ${item?'filled':''}`;
  card.innerHTML=`<div class="slot-label">${kind==='laser'?'ARMA':'ESCUDO'} ${index+1}</div><div class="slot-item">${item?item.name:'VAZIO'}</div>${item?`<div class="muted">${item.description}${kind==='shield'?` • SUPORTE NAVE +${fmt(item.shield||0)} ESC`:''}</div>`:'<div class="muted">Slot liberado</div>'}`;
  if(item){const actions=document.createElement('div');actions.className='slot-actions';const b=document.createElement('button');b.className='ghost-btn';b.textContent='Remover';b.onclick=()=>unequipPetSlot(kind,index);actions.appendChild(b);const sell=document.createElement('button');sell.className='danger-btn sell-item-btn';sell.textContent='Vender 50%';sell.title=`${fmt(itemSellValue(item))} ${item.currency==='uridium'?'STL':'CR'}`;sell.onclick=()=>sellPetEquippedSlot(kind,index);actions.appendChild(sell);card.appendChild(actions);}
  return card;
}
function petSlotRequiredLevel(kind,slot){for(let lv=1;lv<=PET_MAX_LEVEL;lv++)if(petSlotCapacity(kind,lv)>=slot)return lv;return PET_MAX_LEVEL;}
function petLockedCard(kind,index){
  const slot=index+1,cost=petSlotCost(slot),card=document.createElement('div'),requiredLevel=petSlotRequiredLevel(kind,slot);
  card.className='pet-slot locked';
  const available=progress.pet.level>=requiredLevel,priced=cost!=null;
  card.innerHTML=`<div class="slot-label">${kind==='laser'?'ARMA':'ESCUDO'} ${slot}</div><div class="slot-item">🔒 ${available?'LIBERÁVEL':'NÍVEL '+requiredLevel}</div><div class="muted">${available?(priced?`${fmt(cost)} STL para liberar`:'Sincronizando preço online...'):`Alcance o nível ${requiredLevel} do AUX-9`}</div>`;
  const b=document.createElement('button');b.className='ghost-btn';b.textContent=available?(priced?`Liberar • ${fmt(cost)} STL`:'AGUARDE'):`Nível ${requiredLevel}`;b.disabled=!available||!priced;b.onclick=()=>unlockPetSlot(kind);card.appendChild(b);return card;
}
function renderPet(root=ui.petContent){
  if(!progress?.pet||!root)return;
  const pet=progress.pet;root.innerHTML='';
  if(!pet.owned){
    const hero=document.createElement('div');hero.className='pet-hero pet-store-hero';hero.innerHTML=`<div class="pet-avatar"><img src="${droneCardAsset('pet')}" alt="AUX-9"></div><div class="pet-hero-copy"><div class="eyebrow">UNIDADE AUX-9</div><h2>AUX-9 ainda não adquirido</h2><p class="muted">Adquira a unidade base para desbloquear progressão, armas, escudos e módulos especializados.</p><div class="price uridium">${fmt(PET_BASE_PRICE)} STL</div></div>`;const b=document.createElement('button');b.className='primary-btn';b.textContent=`COMPRAR AUX-9 • ${fmt(PET_BASE_PRICE)} STL`;b.disabled=progress.profile.uridium<PET_BASE_PRICE;b.onclick=()=>buyPetUnit();hero.querySelector('.pet-hero-copy').appendChild(b);root.appendChild(hero);return;
  }
  const base=petLevelThreshold(pet.level),need=pet.level<PET_MAX_LEVEL?petLevelXp(pet.level):base,pct=pet.level>=PET_MAX_LEVEL?100:Math.min(100,(pet.xp-base)/Math.max(1,need-base)*100),petDesigner=currentPetDesign(),petVisual=petDesigner?.visual||{},petDef=petLevelDef(pet.level),petBonus=petLevelBonuses(pet.level);
  const hero=document.createElement('div');hero.className=`pet-hero ${petDesigner?'has-designer '+(petDesigner.rarity||''):''}`;if(petDesigner)hero.style.setProperty('--designer-glow',petVisual.glow||'#7edcff');
  hero.innerHTML=`<div class="pet-avatar designer-pet-art-wrap"><img src="${droneCardAsset(pet.level>=10?'petElite':'pet')}" alt="AUX-9" ${petDesigner?`style="filter:${designerVisualCss(petDesigner)}"`:''}>${petDesigner?`<span class="designer-equipped-badge">${rarityLabel(petDesigner.rarity)} • ${petDesigner.name}</span>`:''}</div><div class="pet-hero-copy"><div class="eyebrow">UNIDADE AUX-9</div><h2>Nível ${pet.level} / ${PET_MAX_LEVEL}</h2><div class="pet-xpbar"><span style="width:${pct}%"></span></div><div class="muted">${pet.level>=PET_MAX_LEVEL?'Nível máximo':`${fmt(pet.xp)} XP total • próximo ${fmt(need)}`} • Dano ${fmt(petDamage())} • Suporte ESC +${fmt(petShieldSupport())}</div><div class="pet-level-strip"><span>LASER <b>${petDef.laser}</b></span><span>ESCUDO <b>${petDef.shield}</b></span><span>MÓDULOS <b>${petDef.gear}</b></span><span>PROTOCOLOS <b>${petDef.protocol}</b></span></div><div class="muted">Bônus de nível: <b>${petBonus.damage?`DANO +${petBonus.damage}%`:''}${petBonus.damage&&petBonus.shield?' • ':''}${petBonus.shield?`ESCUDO +${petBonus.shield}%`:''}${!petBonus.damage&&!petBonus.shield?'progressão de equipamento':''}</b> • Tier ${petBonus.tier}${petDesigner?` • ${designerBonusSummary(petDesigner)}`:''}</div></div>`;
  root.appendChild(hero);

  const petDefs=designerCatalog().filter(d=>d.kind==='pet'),designerPanel=document.createElement('div');designerPanel.className='section-box aux-designer-console';
  const designerCards=petDefs.map(d=>`<div class="designer-summary-card ${d.rarity||'epic'}"><div class="designer-orb" style="--designer-glow:${d.visual?.glow||'#7edcff'};--designer-accent:${d.visual?.accent||'#fff'}"></div><div><b>${d.name}</b><small>${designerBonusSummary(d)}</small><span>${rarityLabel(d.rarity)} • EVENTO • Inventário ${ownedDesignQty(d.design_id)}</span></div></div>`).join('');
  designerPanel.innerHTML=`<h3>DESIGNERS AUX-9 • EVENTOS</h3><div class="muted" style="font-size:12px;margin-bottom:10px">Itens raros de evento. Podem combinar DANO, HP, ESCUDO e XP.</div><div class="designer-summary-grid">${designerCards||'<div class="muted">Sincronizando catálogo...</div>'}</div>`;
  const dControl=document.createElement('div');dControl.className='designer-loadout-control';const dLabel=document.createElement('label');dLabel.textContent='DESIGNER ATIVO';const dSel=document.createElement('select');dSel.className='designer-select';const dNone=document.createElement('option');dNone.value='';dNone.textContent='SEM DESIGNER';dSel.appendChild(dNone);petDefs.forEach(d=>{const o=document.createElement('option');o.value=d.design_id;o.textContent=`${d.name} • ${rarityLabel(d.rarity)} • ${ownedDesignQty(d.design_id)}x`;o.disabled=ownedDesignQty(d.design_id)<=0;dSel.appendChild(o);});dSel.value=petDesigner?.design_id||'';dSel.disabled=!canChangeEquipment();dSel.onchange=()=>equipPetDesigner(dSel.value||null);dControl.append(dLabel,dSel);designerPanel.appendChild(dControl);root.appendChild(designerPanel);

  const gears=document.createElement('div');gears.className='section-box';gears.innerHTML='<h3>Modos / Extras do AUX-9</h3><div class="muted">Apenas um modo fica ativo por vez. Os módulos são permanentes depois de comprados.</div>';
  const gearGrid=document.createElement('div');gearGrid.className='pet-gear-grid';
  const off=document.createElement('button');off.className=`pet-gear ${pet.activeGear==='off'?'active':''}`;off.innerHTML='<b>COMPANHIA</b><small>Acompanha e patrulha ao seu redor. Não ataca, não coleta e não repara.</small>';off.onclick=()=>setPetGear('off');gearGrid.appendChild(off);
  Object.values(PET_GEARS).forEach(g=>{const owned=pet.gearsOwned[g.id],b=document.createElement('button');b.className=`pet-gear ${pet.activeGear===g.id?'active':''}`;const gearArt={guard:GAME_ASSETS.equipment.autoLaserCpu,box:GAME_ASSETS.equipment.ammoAutoBuyCpu,ore:GAME_ASSETS.equipment.rocketTurboCpu,repair:GAME_ASSETS.equipment.rep2,kami:GAME_ASSETS.equipment.autoRocketCpu}[g.id];b.innerHTML=`${gearArt?`<img class="pet-gear-art" src="${gearArt}" alt="">`:''}<b>${g.name}</b><small>${g.description}</small><em>${owned?'COMPRADO':'ELITE • '+fmt(g.cost)+' STL'}</em>`;b.onclick=()=>owned?(g.id==='kami'?triggerPetKamikaze():setPetGear(g.id)):buyPetGear(g.id);gearGrid.appendChild(b);});
  gears.appendChild(gearGrid);root.appendChild(gears);

  const progression=document.createElement('div');progression.className='section-box pet-level-progression';progression.innerHTML=`<h3>PROGRESSÃO AUX-9 • NÍVEL ${pet.level}</h3><div class="pet-level-strip"><span>LASER <b>${petDef.laser}</b></span><span>ESCUDO <b>${petDef.shield}</b></span><span>MÓDULOS <b>${petDef.gear}</b></span><span>PROTOCOLOS <b>${petDef.protocol}</b></span><span>TIER <b>${petBonus.tier}</b></span></div><div class="muted">Sem combustível. O nível define a capacidade máxima de equipamento.</div>`;root.appendChild(progression);
  loadHangarEquipmentPrefs();root.appendChild(hangarFilterBar('pet',['all','lasers','shields'],state.hangarPetFilter));
  const equipmentLayout=document.createElement('div');equipmentLayout.className='hangar-equipment-split pet-equipment-split';
  const equippedPane=document.createElement('div');equippedPane.className='hangar-equipment-pane equipped-pane';equippedPane.innerHTML=`<div class="hangar-pane-title"><span>AUX-9 • EQUIPADO</span><b>Suporte ESC +${fmt(petShieldSupport())}</b></div>`;
  const kinds=state.hangarPetFilter==='all'?['laser','shield']:[state.hangarPetFilter==='lasers'?'laser':'shield'];
  for(const kind of kinds){
    const unlocked=kind==='laser'?pet.laserSlotsUnlocked:pet.shieldSlotsUnlocked,capacity=petSlotCapacity(kind,pet.level),grid=document.createElement('div');grid.className='pet-slot-grid hangar-slot-grid';
    for(let i=0;i<capacity;i++)grid.appendChild(i<unlocked?petEquipCard(kind,i):petLockedCard(kind,i));
    const title=kind==='laser'?'LASERS':'ESCUDOS DE SUPORTE',meta=kind==='shield'?`${unlocked}/${capacity} liberados • +${fmt(petShieldSupport())} ESC na nave`:`${unlocked}/${capacity} liberados`;
    equippedPane.appendChild(hangarSection(title,meta,`pet:${kind}`,grid));
  }
  const inv=document.createElement('div');inv.className='hangar-equipment-pane inventory-pane';inv.innerHTML='<div class="hangar-pane-title"><span>INVENTÁRIO • AUX-9</span><b>Lasers / Escudos</b></div>';inv.appendChild(hangarSection('EQUIPAMENTOS',HANGAR_FILTER_LABELS[state.hangarPetFilter],`pet:inventory:${state.hangarPetFilter}`,filteredInventoryGrid(state.hangarPetFilter,'pet',['lasers','shields'])));
  equipmentLayout.append(equippedPane,inv);root.appendChild(equipmentLayout);
}
function refreshPetViews(){
  renderPet();updatePetFloat();
  if(ui.hangarModal&&!ui.hangarModal.classList.contains('hidden')&&state.hangarTab==='pet')renderHangar();
}
function openPet(){if(!progress?.pet?.owned){openShop('pet');showToast(`AUX-9 disponível na Loja por ${fmt(PET_BASE_PRICE)} STL`);return;}renderPet();ui.petModal.classList.remove('hidden');}



let BASE_SERVICES_V1783={
  weapon:{name:'Calibração de Armamento',desc:'+3% dano laser por 60 minutos.',baseCost:1500000,duration:3600000,levelBandSize:5,levelCostScale:.35,maxStackMs:21600000,effect:{laser_damage_pct:3},enabled:true},
  shield:{name:'Harmonização de Escudo',desc:'+5% escudo máximo por 60 minutos.',baseCost:1000000,duration:3600000,levelBandSize:5,levelCostScale:.35,maxStackMs:21600000,effect:{shield_pct:5},enabled:true},
  cargo:{name:'Otimização de Porão',desc:'+750 capacidade de carga por 60 minutos.',baseCost:750000,duration:3600000,levelBandSize:5,levelCostScale:.35,maxStackMs:21600000,effect:{cargo_flat:750},enabled:true},
  thruster:{name:'Ajuste de Propulsão',desc:'+5 velocidade por 60 minutos.',baseCost:1000000,duration:3600000,levelBandSize:5,levelCostScale:.35,maxStackMs:21600000,effect:{speed_flat:5},enabled:true}
};
function normalizeEconomyBoosts(){if(!progress)return {};progress.economyBoosts ||= {};for(const k of Object.keys(BASE_SERVICES_V1783)){const v=Number(progress.economyBoosts[k])||0;if(v<Date.now()-86400000)delete progress.economyBoosts[k];else progress.economyBoosts[k]=v;}return progress.economyBoosts;}
function economyBoostActive(id){normalizeEconomyBoosts();const def=BASE_SERVICES_V1783?.[id];if(!def||def.enabled===false)return false;return Number(progress?.economyBoosts?.[id]||0)>Date.now();}
function economyBoostRemaining(id){const ms=Math.max(0,Number(progress?.economyBoosts?.[id]||0)-Date.now());const m=Math.ceil(ms/60000);return m>60?`${Math.floor(m/60)}h ${m%60}min`:`${m}min`;}
function baseServiceCost(def){const lv=Math.max(1,Number(progress?.profile?.level)||1),bandSize=Math.max(1,Number(def?.levelBandSize)||5),band=Math.floor((lv-1)/bandSize),scale=Math.max(0,Number(def?.levelCostScale)||0);return Math.round((Number(def?.baseCost)||0)*(1+band*scale));}
function economyServiceEffect(id,key,fallback=0){const n=Number(BASE_SERVICES_V1783?.[id]?.effect?.[key]);return Number.isFinite(n)?n:fallback;}
async function buyBaseService(id){const def=BASE_SERVICES_V1783[id];if(!def)return;if(!isAtTrader()){showToast('Serviço disponível somente na sua base X-1');return;}try{const r=await runEconomyAction('base_service',{service_id:id});computeStats(true);renderCargo();updateUI();showToast(`${def.name} • ativo por ${Math.max(1,Math.round((Number(r?.info?.duration_ms)||def.duration||3600000)/60000))} min • ${fmt(r?.info?.cost||0)} CR`,'shop');}catch(e){showToast(e.message||'Serviço recusado pelo servidor');}}
function renderBaseServices(){if(!ui.baseServiceGrid||!progress)return;normalizeEconomyBoosts();ui.baseServiceGrid.innerHTML=Object.entries(BASE_SERVICES_V1783).filter(([,d])=>d?.enabled!==false).map(([id,d])=>{const active=economyBoostActive(id),cost=baseServiceCost(d),afford=progress.profile.credits>=cost;return `<article class="base-service-card${active?' active':''}"><div><span>${active?'ATIVO':'SERVIÇO'}</span><b>${escHtml(d.name)}</b><p>${escHtml(d.desc)}</p></div><div class="base-service-foot"><small>${active?`restam ${economyBoostRemaining(id)}`:`${fmt(cost)} CR`}</small><button class="small-btn ${afford?'gold':''}" data-base-service="${id}" ${afford?'':'disabled'}>${active?'ESTENDER +1H':'ATIVAR'}</button></div></article>`;}).join('');ui.baseServiceGrid.querySelectorAll('[data-base-service]').forEach(b=>b.onclick=()=>buyBaseService(b.dataset.baseService));}

let CRAFT_RECIPES_V1782={
  prometid_batch:{name:'Ferrite Refinada',desc:'Comprime minérios básicos em Ferrite.',cost:200000,ingredients:{Prometium:220,Endurium:120,Terbium:80},output:'30 Ferrite'},
  duranium_batch:{name:'Duracite Refinada',desc:'Liga estrutural de média densidade.',cost:400000,ingredients:{Endurium:140,Terbium:140,Prometid:20},output:'20 Duracite'},
  promerium_batch:{name:'Solarium Refinado',desc:'Material raro para receitas avançadas.',cost:1500000,ingredients:{Prometid:35,Duranium:35,Xenomit:3},output:'5 Solarium'},
  ammo_pls2:{name:'Lote PLS-2',desc:'Produção de munição usando ligas refinadas.',cost:750000,ingredients:{Prometid:25,Duranium:25,Promerium:1},output:'1.500 PLS-2'},
  rocket_pack:{name:'Lote R-2026',desc:'Mísseis intermediários produzidos na base.',cost:500000,ingredients:{Duranium:20,Promerium:1},output:'100 R-2026'},
  repair_bonus:{name:'Carga de Nanorreparo',desc:'Converte recursos em 1 Bônus de Reparo.',cost:1000000,ingredients:{Prometium:40,Endurium:40,Duranium:20},output:'1 Bônus de Reparo'}
};
function craftIngredientText(recipe){return Object.entries(recipe.ingredients).map(([id,qty])=>`${fmt(qty)} ${RESOURCES[id]?.name||id}`).join(' • ');}
function canCraftRecipe(recipe){if(!progress||!recipe||recipe.enabled===false)return false;if((Number(progress.profile?.level)||1)<Math.max(1,Number(recipe.minLevel)||1))return false;const currency=recipe.currency==='uridium'?'uridium':'credits';if((Number(progress.profile?.[currency])||0)<recipe.cost)return false;return Object.entries(recipe.ingredients||{}).every(([id,qty])=>(Number(progress.cargo?.[id])||0)>=qty);}
async function craftRecipe(recipeId){const recipe=CRAFT_RECIPES_V1782[recipeId];if(!recipe)return;if(!isAtTrader()){showToast('Crafting disponível somente na sua base X-1');return;}try{const r=await runEconomyAction('craft_recipe',{recipe_id:recipeId});showToast(`CRAFT • ${recipe.name} • ${r?.info?.output||recipe.output}`,'reward');renderCargo();}catch(e){showToast(e.message||'Crafting recusado pelo servidor');}}
function renderRefinery(){if(!ui.refineryGrid||!progress)return;ui.refineryGrid.innerHTML=Object.entries(CRAFT_RECIPES_V1782).filter(([,r])=>r?.enabled!==false).map(([id,r])=>`<article class="refinery-card${canCraftRecipe(r)?' ready':''}"><div class="refinery-card-head"><div><span>RECEITA</span><b>${escHtml(r.name)}</b></div><em>${fmt(r.cost)} ${r.currency==='uridium'?'STL':'CR'}</em></div><p>${escHtml(r.desc)}</p><div class="refinery-ingredients">${escHtml(craftIngredientText(r))}</div><div class="refinery-output">→ ${escHtml(r.output)}</div><button class="small-btn ${canCraftRecipe(r)?'gold':''}" data-craft-recipe="${id}" ${canCraftRecipe(r)?'':'disabled'}>FABRICAR</button></article>`).join('');ui.refineryGrid.querySelectorAll('[data-craft-recipe]').forEach(b=>b.onclick=()=>craftRecipe(b.dataset.craftRecipe));}


// ===================== V18.1.5 MISSÕES + ECONOMIA + CRAFTING DATA DRIVEN =====================
const SYSTEMS_RUNTIME_CACHE_KEY='stellar_systems_runtime_v1815';
const systemsRuntimeConfig={version:0,updatedAt:null,lastFetchAt:0,source:'fallback',missionCategories:new Map(),customMissions:[],services:new Map(),recipes:new Map()};
function systemsMissionCategory(category){return systemsRuntimeConfig.missionCategories.get(String(category||''))||null;}
function missionSteps(category,fallback=[]){const a=systemsMissionCategory(category)?.config?.steps;return Array.isArray(a)&&a.length?a.map(v=>Math.max(1,Math.floor(Number(v)||1))).slice(0,30):fallback;}
function missionOrePool(category){const a=systemsMissionCategory(category)?.config?.ore_pool;const pool=Array.isArray(a)?a.map(String).filter(id=>RESOURCES[id]&&RESOURCES[id].enabled!==false):[];return pool.length?pool:MISSION_ORES.filter(id=>RESOURCES[id]&&RESOURCES[id].enabled!==false);}
function systemsCustomMissions(category){return systemsRuntimeConfig.customMissions.filter(m=>m.category===category&&m.enabled!==false).map(m=>makeMission({id:m.id,title:m.title,desc:m.desc,tasks:m.tasks.map(t=>({...t})),group:m.group,sequence:m.sequence,rewardFactor:m.rewardFactor,tag:m.tag,flatReward:m.flatReward}));}
function normalizeSystemsRuntimeConfig(raw,source='online'){
  if(!raw||typeof raw!=='object'||!Array.isArray(raw.mission_categories)||!raw.mission_categories.length)return false;
  const cats=new Map();for(const row of raw.mission_categories){const category=String(row?.category||'');if(!category)continue;const item={category,label:String(row.label||MISSION_CATEGORIES[category]?.label||category.toUpperCase()),accent:String(row.accent||MISSION_CATEGORIES[category]?.accent||'#58d9ff'),reset:String(row.reset_kind||category),minLevel:Math.max(1,Number(row.min_level)||1),rewardFactor:Math.max(0,Number(row.reward_factor)||0),itemChance:Math.max(0,Math.min(1,Number(row.item_chance)||0)),enabled:row.enabled!==false,config:row.config&&typeof row.config==='object'?{...row.config}:{}};cats.set(category,item);MISSION_CATEGORY_LEVELS[category]=item.minLevel;MISSION_CATEGORIES[category]={label:item.label,accent:item.accent,reset:item.reset,enabled:item.enabled};}
  systemsRuntimeConfig.missionCategories=cats;
  systemsRuntimeConfig.customMissions=(raw.custom_missions||[]).filter(x=>x?.enabled!==false&&Array.isArray(x.tasks)).map(x=>({id:String(x.mission_id||''),category:String(x.category||''),title:String(x.title||''),desc:String(x.description||''),tasks:x.tasks.map(t=>({...t,target:Math.max(1,Number(t.target)||1)})),group:String(x.group_key||'mix'),sequence:!!x.sequence,rewardFactor:x.reward_factor==null?Number(cats.get(String(x.category||''))?.rewardFactor||1):Math.max(0,Number(x.reward_factor)||0),tag:String(x.tag||''),flatReward:x.flat_reward&&typeof x.flat_reward==='object'?{...x.flat_reward}:null,enabled:true})).filter(x=>x.id&&x.category&&x.tasks.length);
  const services={};for(const row of raw.economy_services||[]){if(row?.enabled===false)continue;const id=String(row.service_id||'');if(!id)continue;services[id]={name:String(row.name||id),desc:String(row.description||''),baseCost:Math.max(0,Number(row.base_cost)||0),duration:Math.max(60000,Number(row.duration_ms)||3600000),levelBandSize:Math.max(1,Number(row.level_band_size)||5),levelCostScale:Math.max(0,Number(row.level_cost_scale)||0),maxStackMs:Math.max(60000,Number(row.max_stack_ms)||21600000),effect:row.effect&&typeof row.effect==='object'?{...row.effect}:{},enabled:true,sortOrder:Number(row.sort_order)||100};}
  if(Object.keys(services).length)BASE_SERVICES_V1783=services;
  const recipes={};for(const row of raw.crafting_recipes||[]){if(row?.enabled===false)continue;const id=String(row.recipe_id||'');if(!id)continue;recipes[id]={name:String(row.name||id),desc:String(row.description||''),cost:Math.max(0,Number(row.cost)||0),currency:String(row.currency)==='uridium'?'uridium':'credits',ingredients:row.ingredients&&typeof row.ingredients==='object'?{...row.ingredients}:{},grant:row.grant_payload&&typeof row.grant_payload==='object'?{...row.grant_payload}:{},output:String(row.output_label||''),minLevel:Math.max(1,Number(row.min_level)||1),enabled:true,sortOrder:Number(row.sort_order)||100};}
  if(Object.keys(recipes).length)CRAFT_RECIPES_V1782=recipes;
  CACHED_WEEKLY_MISSIONS=null;CACHED_MONTHLY_MISSIONS=null;CACHED_SPECIAL_MISSIONS=null;
  systemsRuntimeConfig.version=Math.max(0,Number(raw.version)||0);systemsRuntimeConfig.updatedAt=raw.updated_at||null;systemsRuntimeConfig.source=source;return true;
}
function loadSystemsRuntimeConfigCache(){try{const raw=JSON.parse(localStorage.getItem(SYSTEMS_RUNTIME_CACHE_KEY)||'null');return !!(raw&&normalizeSystemsRuntimeConfig(raw,'cache'));}catch{return false;}}
function saveSystemsRuntimeConfigCache(raw){try{localStorage.setItem(SYSTEMS_RUNTIME_CACHE_KEY,JSON.stringify(raw));}catch{}}
async function refreshSystemsRuntimeConfig(force=false){
  if(!authenticated||!getUser()?.id)return null;const now=Date.now();if(!force&&now-systemsRuntimeConfig.lastFetchAt<30000)return null;systemsRuntimeConfig.lastFetchAt=now;
  try{const raw=await loadSystemsRuntimeConfigOnline();if(!raw)return null;const changed=Number(raw.version)!==Number(systemsRuntimeConfig.version)||systemsRuntimeConfig.source!=='online';if(changed){normalizeSystemsRuntimeConfig(raw,'online');saveSystemsRuntimeConfigCache(raw);if(progress){try{normalizeMissionState();computeStats(true);renderCargo();renderMissions();updateUI();}catch{}}console.info(`[systems-config] v${systemsRuntimeConfig.version} aplicado no cliente`);}return raw;}catch(err){console.warn('[systems-config] usando cache/fallback',err);if(systemsRuntimeConfig.source==='fallback')loadSystemsRuntimeConfigCache();return null;}
}
setInterval(()=>{if(authenticated)refreshSystemsRuntimeConfig(false);},45000);

function liveResourcePrice(id){const runtime=RESOURCES[id];if(worldRuntimeConfig.version>0)return runtime&&runtime.enabled!==false?Math.max(0,Number(runtime.sell)||0):0;const row=liveCatalog(`resource:${id}`);return row&&row.enabled!==false&&String(row?.meta?.mode||'sell')==='sell'?Math.max(0,Number(row.price)||0):Math.max(0,Number(runtime?.sell)||0);}
function cargoSaleValue(){let total=0;for(const [id,qty] of Object.entries(progress.cargo||{}))total+=liveResourcePrice(id)*qty;return total;}
async function sellCargoResource(id){if(!isAtTrader()){showToast('Venda disponível somente na base X-1');return;}const qty=progress.cargo[id]||0,price=liveResourcePrice(id);if(qty<=0||price<=0){showToast('Recurso sem preço ativo no Supabase');return;}try{const r=await runEconomyAction('sell_cargo',{resource_id:id});journeyEvent('sell',1);showToast(`${qty} ${id} vendidos por ${fmt(r?.info?.total||0)} CR • servidor`);}catch(e){showToast(e.message||'Venda recusada pelo servidor');}}
async function sellAllCargo(){if(!isAtTrader()){showToast('Volte à base X-1 para vender');return;}try{const r=await runEconomyAction('sell_cargo',{resource_id:'all'});journeyEvent('sell',1);showToast(`Porão vendido: +${fmt(r?.info?.total||0)} CR • servidor`);}catch(e){showToast(e.message||'Venda recusada pelo servidor');}}
function renderCargo(){if(!progress)return;const atBase=isAtTrader();const xeno=progress.cargo?.Xenomit||0;const cargoBonus=cargoExtraBonus();ui.cargoSummary.innerHTML=`<b>${fmt(cargoUsed())}/${fmt(cargoCapacity())}</b> unidades ocupadas${cargoBonus?` • Expansão equipada: <b>+${fmt(cargoBonus)}</b>`:''} • Valor vendável: <b>${fmt(cargoSaleValue())} CR</b><br><span class="muted">${atBase?'Trader disponível: você está na base.':'Para vender recursos, retorne à Zona Segura do seu X-1.'} ${xeno?`• Voidite: <b>${fmt(xeno)}</b> (não ocupa porão)`:''}</span>`;ui.cargoGrid.innerHTML='';const entries=Object.entries(progress.cargo||{}).filter(([,q])=>q>0);if(!entries.length){ui.cargoGrid.innerHTML='<div class="empty-state">Seu porão está vazio. Colete minérios no mapa ou caixas deixadas pelos NPCs.</div>';}for(const [id,qty] of entries){const r=RESOURCES[id]||{name:id,color:'#fff'},price=liveResourcePrice(id),special=id==='Xenomit';const c=document.createElement('div');c.className='cargo-card';c.innerHTML=`<div class="cargo-ore" style="--ore:${r.color}"><img src="${GAME_ASSETS.resources[id]||GAME_ASSETS.loot.cargo}" alt="${r.name}"></div><div><b>${r.name}</b><div class="muted">${fmt(qty)} un. • ${special?'especial • não ocupa porão':(price?fmt(price)+' CR/un.':'não vendável')}</div></div>`;const b=document.createElement('button');b.className='ghost-btn';b.textContent=price?'Vender':'Guardar';b.disabled=!atBase||!price;b.onclick=()=>sellCargoResource(id);c.appendChild(b);ui.cargoGrid.appendChild(c);}ui.sellAllCargo.disabled=!atBase||cargoSaleValue()<=0;renderRefinery();renderBaseServices();}
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
  const st=premiumRuntime.state||{},products=premiumCatalogForRender(),couponHint=Object.keys(PREMIUM_EVENT_COUPONS)[0]||'EVENTO7D';
  const activeUntil=effectivePremiumUntilMs();
  if(ui.premiumModeChip){ui.premiumModeChip.textContent=premiumCanPurchase()?'ATIVO':'CATÁLOGO';ui.premiumModeChip.classList.toggle('active',premiumCanPurchase());}
  ui.premiumBenefits.innerHTML=`<div class="premium-status-card"><span>PREMIUM</span><b>${premiumActive()?'ATIVO':'INATIVO'}</b><small>${premiumActive()?`até ${formatPremiumUntil(new Date(activeUntil).toISOString())} • AUTO-COMBATE LIBERADO`:'Auto-combate • reparo grátis • regen 2X • míssil -20% • Elite -5% • Portais -10%'}</small></div><div class="premium-status-card"><span>PASSE PREMIUM</span><b>${st.battle_pass_active?'ATIVO':'INATIVO'}</b><small>Temporada ${escHtml(st.current_season||battlePassSeasonKey())} • AUTO-COMBATE • 2X ganhos + Elite + Reclaimer T30</small></div><div class="premium-coupon-card"><div class="premium-coupon-copy"><span>CUPOM DE EVENTO</span><b>RESGATE</b><small>${escHtml(couponHint)} • 7 dias Premium + 1 Nanobot de Reparo • Comum.</small></div><div class="premium-coupon-form"><input id="premiumCouponInput" maxlength="32" autocomplete="off" placeholder="DIGITE O CUPOM" /><button class="small-btn gold" id="premiumCouponRedeem" type="button">RESGATAR</button></div></div>`;
  if(!products.length){ui.premiumProductGrid.innerHTML='<div class="muted">Catálogo Premium indisponível.</div>';return;}
  ui.premiumProductGrid.innerHTML=products.map(p=>{
    const isLocalPlan=!!premiumLocalPlanById(p.id),owned=p.category==='battle_pass'?!!st.battle_pass_active:false;
    const typeLabel=isLocalPlan?'ASSINATURA FLEX':p.category==='elite_item'?'ITEM ELITE':p.category==='battle_pass'?'PASSE MENSAL':'ASSINATURA';
    const buttonDisabled=owned||!premiumCanPurchase();
    const buttonLabel=owned?'ATIVO / OBTIDO':!premiumCanPurchase()?'INDISPONÍVEL':isLocalPlan?(premiumActive()?'PRORROGAR':'ATIVAR'):'ATIVAR';
    return `<article class="premium-product ${p.category}"><div class="premium-product-icon">${premiumProductIcon(p)}</div><div class="premium-product-copy"><span class="premium-product-type">${typeLabel}</span><h3>${escHtml(p.name)}</h3><p>${escHtml(p.description||'')}</p></div><div class="premium-product-price">R$ ${Number(p.price_brl||0).toFixed(2).replace('.',',')}</div><button class="${premiumCanPurchase()?'gold-btn':'ghost-btn'}" data-premium-buy="${escHtml(p.id)}" ${buttonDisabled?'disabled':''}>${buttonLabel}</button></article>`;
  }).join('');
  ui.premiumProductGrid.querySelectorAll('[data-premium-buy]').forEach(b=>b.onclick=()=>testPremiumPurchaseNow(b.dataset.premiumBuy));
  const couponBtn=document.getElementById('premiumCouponRedeem');const couponInput=document.getElementById('premiumCouponInput');
  if(couponBtn&&couponInput){const submit=async()=>{const code=String(couponInput.value||'').trim();if(!code){showToast('Digite um cupom válido');return;}try{const res=redeemPremiumCouponLocal(code);couponInput.value='';showToast(`Cupom resgatado • Premium liberado até ${formatPremiumUntil(new Date(res.until).toISOString())}`,'reward');await flushCloudSave(true);await refreshAndRenderPremium(true);}catch(e){showToast(String(e?.message||e));}};couponBtn.onclick=submit;couponInput.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();submit();}};}
}
async function refreshAndRenderPremium(force=false){await refreshPremiumState(force);renderPremiumShop();if(ui.passModal&&!ui.passModal.classList.contains('hidden'))renderProgression();renderGalaxyGate();renderShop();}
async function testPremiumPurchaseNow(productId){
  if(!premiumCanPurchase()){showToast('Compra indisponível no momento');return;}
  const localPlan=premiumLocalPlanById(productId);
  if(localPlan){try{const until=extendLocalPremium(localPlan.days);showToast(`PREMIUM ativado por +${localPlan.days} dias`,'reward');await flushCloudSave(true);await refreshAndRenderPremium(true);if(until)pushActivity(`PREMIUM • ${localPlan.name} ativo até ${formatPremiumUntil(new Date(until).toISOString())}`,'reward');return;}catch(e){showToast(String(e?.message||e));return;}}
  try{
    await flushCloudSave(true);
    const result=await testPurchasePremiumOnline(productId);
    if(result?.category==='elite_item'&&result.item_id){progress.inventory ||= {};progress.inventory[result.item_id]=(progress.inventory[result.item_id]||0)+Math.max(1,Number(result.quantity)||1);saveGame();await flushCloudSave(true);showToast(`${ITEMS[result.item_id]?.name||result.item_id} recebido`,'reward');}
    else if(result?.category==='battle_pass')showToast('Passe Premium ativado nesta temporada','reward');
    else if(result?.category==='premium')showToast('PREMIUM ativado com sucesso','reward');
    await refreshAndRenderPremium(true);
  }catch(e){showToast(String(e?.message||e));}
}
async function openPremiumShop(){closeNavigationModals(ui.premiumModal);ui.premiumModal?.classList.remove('hidden');if(ui.premiumProductGrid)ui.premiumProductGrid.innerHTML='<div class="muted">Sincronizando Loja Premium...</div>';await refreshPremiumState(true);renderPremiumShop();}

function openShop(tab='ships'){closeNavigationModals(ui.shopModal);state.shopTab=tab;Promise.all([refreshPremiumState(),refreshLiveOpsState(true)]).finally(()=>{renderShop();ui.shopModal.classList.remove('hidden');});}
function openHangar(tab='ships'){if(tab==='pilot'&&!featureUnlocked('pilot')){showFeatureLock('pilot','Perfil de Piloto');return;}closeNavigationModals(ui.hangarModal);state.hangarTab=tab;renderHangar();ui.hangarModal.classList.remove('hidden');refreshDesignerState(true).then(()=>{computeStats(true);renderHangar();updateUI();}).catch(()=>{});if(!canChangeEquipment())showToast('Hangar em modo consulta • alterações de equipamento só funcionam na base X-1');}

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
  g.lifeBonus=(g.lifeBonus||0)+1;return {kind:'life',label:'Vida Astral Reserva +1'};
}
function spinAlpha(amount){
  normalizeGalaxyGateState();const key=currentGateKey(),q=liveQuote(`gate_spin:${key}`),unit=q?Math.max(1,Math.floor(q.basePrice*(premiumActive()?0.90:1))):null,cost=unit==null?null:amount*unit;
  if(cost==null){showToast('Preço do Materializador ainda não sincronizou com o Supabase');refreshLiveOpsState(true).then(()=>renderGalaxyGate());return;}
  if(progress.profile.uridium<cost){showToast(`Faltam ${fmt(cost-progress.profile.uridium)} STL para ${amount} sorteio${amount>1?'s':''}`);return;}
  openSpendConfirm({title:`Girar portal ${galaxyGateDef().label}?`,itemName:`${amount} sorteio${amount>1?'s':''} do Portal Astral`,detail:'Preço, sorteio e recompensas serão processados pelo servidor.',value:cost,currency:'uridium',confirmLabel:'CONFIRMAR GIRO',onConfirm:()=>runEconomyAction('gate_spin',{protocol:key,amount}).then(r=>{const info=r?.info||{},results=Array.isArray(info.results)?info.results:[],summary={};results.forEach(x=>summary[x.label]=(summary[x.label]||0)+1);const pieces=results.filter(x=>x.kind==='piece').length,lines=Object.entries(summary).slice(0,12).map(([label,count])=>`${count>1?`${count}× `:''}${label}`);ui.gateResultBox.innerHTML=`<b>${info.amount||amount} sorteio${(info.amount||amount)>1?'s':''} • ${fmt(info.cost||cost)} STL • SERVIDOR</b>${pieces?`<div class="gate-piece-win">✦ ${pieces} peça${pieces>1?'s':''} encontrada${pieces>1?'s':''}</div>`:''}<div>${lines.join(' • ')}</div>`;renderGalaxyGate();refreshAmmoCounters();refreshPilotViews();updateUI();requestAnimationFrame(()=>{renderGalaxyGate();refreshAmmoCounters();updateUI();});}).catch(e=>showToast(e.message||'Materializador recusado pelo servidor'))});
}
function useGalaxyLifeBonus(){
  normalizeGalaxyGateState();const g=progress.galaxyGate,a=alphaGate(),gd=galaxyGateDef();
  if((g.lifeBonus||0)<=0){showToast('Você não possui Vida Astral na reserva');return;}
  if(a.lives>=gd.maxLives){showToast(`${gd.label} já está no máximo de ${gd.maxLives} vidas`);return;}
  if(!isAtTrader()){showToast('Use a Vida Astral na sua base X-1');return;}
  runEconomyAction('gate_life_bonus',{protocol:gd.key}).then(()=>showToast(`${gd.label} • +1 VIDA usando a reserva`,'reward')).catch(e=>showToast(e.message||'Não foi possível usar a vida reserva'));
}
function buyGalaxyLife(){
  normalizeGalaxyGateState();const a=alphaGate(),gd=galaxyGateDef(),q=liveQuote(`gate_life:${gd.key}`),cost=q?.price??gd.lifeCost;
  if(a.lives>=gd.maxLives){showToast(`${gd.label} já está no máximo de ${gd.maxLives} vidas`);return;}
  if(!isAtTrader()){showToast('Vidas do Portal só podem ser compradas na base X-1');return;}
  if(progress.profile.credits<cost){showToast(`Faltam ${fmt(cost-progress.profile.credits)} CR para comprar +1 vida`);return;}
  openSpendConfirm({title:`Comprar +1 vida para ${gd.label}?`,itemName:`Vida Astral • ${gd.label}`,detail:`A vida fica vinculada ao ${gd.label}. Máximo ${gd.maxLives} vidas.`,value:cost,currency:'credits',confirmLabel:'COMPRAR VIDA',onConfirm:()=>runEconomyAction('gate_life',{protocol:gd.key}).then(()=>showToast(`${gd.label} • +1 VIDA comprada`,'reward')).catch(e=>showToast(e.message||'Compra de vida recusada'))});
}

function renderGateRounds(){
  if(!ui.gateRoundsGrid)return;const gd=galaxyGateDef();
  ui.gateRoundsGrid.innerHTML=gd.rounds.map(r=>`<div class="gate-round-card"><div class="gate-round-num">ROUND ${r.round}</div><b>${r.name}</b><div>${r.waves.map((w,i)=>`<span>ONDA ${i+1} • ${w.count}× ${NPC_TYPES[w.type].name}</span>`).join('')}</div><small class="gate-round-reward">${gateRoundRewardText(gd)}</small></div>`).join('');
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
  ui.gateHudLives.textContent='♥ '.repeat(a.lives).trim()+' ♡ '.repeat(Math.max(0,galaxyGateDef().maxLives-a.lives)).trim();
}
function renderGalaxyGate(){
  if(!progress||!ui.gatePieceGrid)return;normalizeGalaxyGateState();
  const g=progress.galaxyGate,gd=galaxyGateDef(),a=alphaGate(),count=a.pieces.length,atBase=isAtTrader(),unlocked=gateUnlocked(gd.key),lifeQuote=liveQuote(`gate_life:${gd.key}`),lifeCost=lifeQuote?.price??gd.lifeCost;
  if(ui.gatePieceBadge)ui.gatePieceBadge.textContent=`${gd.label} ${count}/${gd.pieces}`;
  ui.gatePiecesText.textContent=`${count} / ${gd.pieces}`;ui.gateLivesText.textContent=`${a.lives} / ${gd.maxLives}`;ui.gateCompletedText.textContent=a.completed;ui.gateUriText.textContent=fmt(progress.profile.uridium);ui.gateJumpBonus.textContent=fmt(g.jumpBonus);
  if(ui.gateLifeBonus)ui.gateLifeBonus.textContent=fmt(g.lifeBonus||0);
  if(ui.gateLogDisks){normalizePilotBio();ui.gateLogDisks.textContent=fmt(progress.pilotBio.logDisks);}
  if(ui.gateCoreLabel)ui.gateCoreLabel.textContent=gd.label;if(ui.gateProtocolLabel)ui.gateProtocolLabel.textContent=`PORTAL ${gd.label}`;
  if(ui.gateCombatProtocol)ui.gateCombatProtocol.textContent=`${gd.label} • ${gd.rounds.length} ROUNDS • ${gd.baseLives} VIDAS BASE / ${gd.maxLives} MÁX • DANO NPC ${Math.round(gd.damageScale*100)}%`;
  if(ui.gateRewardNote)ui.gateRewardNote.innerHTML=`<b>PACOTE FINAL ${gd.label}:</b> ${gateFinalRewardText(gd)}<br><small>Cada Round limpo também paga ${gateRoundRewardText(gd)}. Bônus adicional sobre os abates: +${Math.round((gd.totalRewardMult-1)*100)}% no fechamento.</small>`;
  if(ui.gateProtocolTabs)ui.gateProtocolTabs.querySelectorAll('[data-gate-protocol]').forEach(b=>{const key=b.dataset.gateProtocol;b.classList.toggle('active',key===gd.key);b.disabled=false;b.title=`${GALAXY_GATE_DEFS[key].label} • disponível`;});
  ui.gatePieceGrid.innerHTML=Array.from({length:gd.pieces},(_,i)=>`<span class="gate-piece ${a.pieces.includes(i+1)?'found':''}" title="Peça ${i+1}">${i+1}</span>`).join('');
  ui.gateSpinButtons.innerHTML='';[1,5,10,50,100].forEach(n=>{const cost=n*alphaSpinUnitCost(),b=document.createElement('button');b.className='small-btn gate-spin-btn';b.innerHTML=`${n}x <small>${fmt(cost)} STL${premiumActive()?' • -10%':''}</small>`;b.disabled=progress.profile.uridium<cost;b.onclick=()=>spinAlpha(n);ui.gateSpinButtons.appendChild(b);});
  renderGateRounds();
  if(a.run?.active){ui.gateAlphaStatusTitle.textContent=`${gd.label} em andamento • Round ${a.run.round}`;ui.gateAlphaStatusText.textContent=`${a.lives}/${gd.maxLives} vidas. Você pode fugir, regenerar e retornar ao combate; NPCs eliminados continuam eliminados.`;ui.gateJumpBtn.textContent=isGalaxyGateMap()?`VOCÊ ESTÁ NO ${gd.label}`:atBase?`RETORNAR AO ${gd.label}`:'VOLTE À BASE X-1';ui.gateJumpBtn.disabled=isGalaxyGateMap()||!atBase||a.lives<=0;}
  else if(a.built){ui.gateAlphaStatusTitle.textContent=`PORTAL ${gd.label} MONTADO`;ui.gateAlphaStatusText.textContent=`${gd.pieces}/${gd.pieces} peças • ${gd.rounds.length} rounds • ${a.lives}/${gd.maxLives} vidas • pensado para kite e progressão FREE.`;ui.gateJumpBtn.textContent=atBase?`SALTAR PARA O ${gd.label}`:'VOLTE À BASE X-1';ui.gateJumpBtn.disabled=!atBase;}
  else{ui.gateAlphaStatusTitle.textContent=`${gd.label} • EM CONSTRUÇÃO`;ui.gateAlphaStatusText.textContent=`Todos os portais estão liberados. Faltam ${gd.pieces-count} peças para montar o ${gd.label}.`;ui.gateJumpBtn.textContent='PORTAL INCOMPLETO';ui.gateJumpBtn.disabled=true;}
  if(ui.useLifeBonus){ui.useLifeBonus.textContent=`USAR VIDA RESERVA +1 (${fmt(g.lifeBonus||0)})`;ui.useLifeBonus.disabled=(g.lifeBonus||0)<=0||a.lives>=gd.maxLives||!atBase;}
  if(ui.buyGateLife){ui.buyGateLife.textContent=`COMPRAR VIDA +1 • ${fmt(lifeCost)} CR`;ui.buyGateLife.disabled=a.lives>=gd.maxLives||!atBase||progress.profile.credits<lifeCost;}
  renderGateHud();
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


function buyLogDisks(qty){normalizePilotBio();qty=Math.max(1,Math.min(500,Math.floor(qty)));const q=liveQuote('quantum_core:unit'),unit=q?.price??null,cost=unit==null?null:qty*unit;if(cost==null){showToast('Preço dos Núcleos ainda não sincronizou com o Supabase');refreshLiveOpsState(true).then(()=>refreshPilotViews());return;}if(progress.profile.uridium<cost){showToast('Stellarium insuficiente para Núcleos Quânticos');return;}openSpendConfirm({title:'Comprar Núcleos Quânticos?',itemName:`${qty} Núcleos Quânticos`,detail:'Compra validada pelo servidor usando o preço do Supabase.',value:cost,currency:'uridium',onConfirm:()=>runEconomyAction('buy_quantum_cores',{qty}).then(()=>showToast(`${qty} Núcleos Quânticos recebidos • servidor`)).catch(e=>showToast(e.message||'Compra recusada')),confirmLabel:'CONFIRMAR COMPRA'});}
function convertPilotPoint(){normalizePilotBio();const p=progress.pilotBio;if(p.totalPoints>=PILOT_POINT_MAX){showToast('Limite de 50 Pontos de Pesquisa atingido');return;}const no=p.totalPoints+1,cost=pilotPointLogCost(no);if(p.logDisks<cost){showToast(`Faltam ${fmt(cost-p.logDisks)} Núcleos Quânticos`);return;}runEconomyAction('convert_pilot_point',{}).then(r=>showToast(`Ponto de Pesquisa #${r?.info?.point||no} obtido • servidor`)).catch(e=>showToast(e.message||'Conversão recusada pelo servidor'));}
function upgradePilotSkill(id){normalizePilotBio();const skill=PILOT_SKILLS[id],lv=pilotSkillLevel(id);if(!skill||lv>=skill.max)return;const reqInfo=pilotRequirementInfo(skill);if(reqInfo&&!reqInfo.met){showToast(`Requer ${reqInfo.skill.name} nível ${reqInfo.need}/${reqInfo.skill.max}`);return;}if(pilotAvailablePoints()<1){showToast('Você não possui PP disponível');return;}const cost=pilotSkillCreditCost(skill,lv+1);if(progress.profile.credits<cost){showToast(`Faltam ${fmt(cost-progress.profile.credits)} CR`);return;}openSpendConfirm({title:'Evoluir habilidade?',itemName:`${skill.name} • nível ${lv+1}/${skill.max}`,detail:'Confirme para gastar créditos e evoluir esta habilidade da Árvore de Piloto.',value:cost,currency:'credits',confirmLabel:'EVOLUIR HABILIDADE',onConfirm:()=>{if(progress.profile.credits<cost){showToast(`Faltam ${fmt(cost-progress.profile.credits)} CR`);return;}progress.profile.credits-=cost;telemetrySpend('credits',cost);progress.pilotBio.skills[id]=lv+1;computeStats(true);saveGame();refreshPilotViews();updateUI();showToast(`${skill.name} • nível ${lv+1}/${skill.max}`);}});}
function resetPilotTree(){normalizePilotBio();const cost=1000*Math.pow(2,progress.pilotBio.resetCount);if(progress.profile.uridium<cost){showToast(`Reset requer ${fmt(cost)} STL`);return;}if(pilotSpentPoints()<=0){showToast('Nenhum ponto investido para resetar');return;}openSpendConfirm({title:'Resetar Árvore de Piloto?',itemName:`Reset #${progress.pilotBio.resetCount+1}`,detail:'Confirme para gastar Stellarium e resetar todos os pontos investidos.',value:cost,currency:'uridium',confirmLabel:'CONFIRMAR RESET',onConfirm:()=>{if(progress.profile.uridium<cost){showToast(`Reset requer ${fmt(cost)} STL`);return;}if(pilotSpentPoints()<=0){showToast('Nenhum ponto investido para resetar');return;}progress.profile.uridium-=cost;telemetrySpend('uridium',cost);for(const id of Object.keys(PILOT_SKILLS))progress.pilotBio.skills[id]=0;progress.pilotBio.resetCount++;computeStats(true);saveGame();refreshPilotViews();updateUI();showToast('Árvore de Piloto resetada');}});}
function pilotSkillBonusLabel(skill,lv){if(lv<=0)return 'SEM BÔNUS';const value=skill.values[Math.min(lv,skill.values.length)-1];return `${fmt(value)}${skill.unit}`;}
function renderPilotProfile(){
  if(!progress||!ui.pilotSkillTree)return;normalizePilotBio();const p=progress.pilotBio,spent=pilotSpentPoints(),avail=pilotAvailablePoints(),next=p.totalPoints+1;
  ui.pilotLogDisks.textContent=fmt(p.logDisks);ui.pilotPointsTotal.textContent=`${p.totalPoints} / ${PILOT_POINT_MAX}`;ui.pilotPointsAvailable.textContent=fmt(avail);ui.pilotPointsSpent.textContent=fmt(spent);if(ui.pilotPointBadge)ui.pilotPointBadge.textContent=`${avail} PP`;
  if(p.totalPoints>=PILOT_POINT_MAX){ui.pilotNextPointTitle.textContent='PESQUISA COMPLETA';ui.pilotNextPointCost.textContent='50 / 50 Pontos de Pesquisa';ui.pilotConvertPoint.disabled=true;ui.pilotConvertPoint.textContent='LIMITE ATINGIDO';}
  else{const logs=pilotPointLogCost(next);ui.pilotNextPointTitle.textContent=`PP #${next}`;ui.pilotNextPointCost.textContent=`${fmt(logs)} Núcleos Quânticos • equivalente ${fmt(logs*LOG_DISK_URI_PRICE)} STL`;ui.pilotConvertPoint.disabled=p.logDisks<logs;ui.pilotConvertPoint.textContent='CONVERTER NÚCLEOS QUÂNTICOS EM 1 PP';}
  ui.pilotLogBuyButtons.innerHTML='';[1,10,100,500].forEach(q=>{const b=document.createElement('button');b.className='small-btn';b.innerHTML=`${q}x <small>${fmt(q*LOG_DISK_URI_PRICE)} STL</small>`;b.disabled=progress.profile.uridium<q*LOG_DISK_URI_PRICE;b.onclick=()=>buyLogDisks(q);ui.pilotLogBuyButtons.appendChild(b);});
  const resetCost=1000*Math.pow(2,p.resetCount);ui.pilotResetCost.textContent=`Reset #${p.resetCount+1}: ${fmt(resetCost)} STL`;ui.pilotResetBtn.disabled=spent<=0||progress.profile.uridium<resetCost;
  ui.pilotSkillTree.innerHTML='';loadPilotUiPrefs();
  for(const [branch,meta] of Object.entries(PILOT_BRANCHES))ui.pilotSkillTree.appendChild(buildPilotBranch(branch,meta,avail));
}
function refreshPilotViews(){renderPilotProfile();if(ui.hangarModal&&!ui.hangarModal.classList.contains('hidden')&&['pilot','titles'].includes(state.hangarTab))renderHangar();requestAnimationFrame(()=>{renderPilotProfile();if(ui.hangarModal&&!ui.hangarModal.classList.contains('hidden')&&['pilot','titles'].includes(state.hangarTab))renderHangar();});}
function openPilotProfile(){if(!featureUnlocked('pilot')){showFeatureLock('pilot','Perfil de Piloto');return;}openHangar('pilot');}

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
  if(lot.kind==='item'&&ITEMS[lot.id]?.type==='drone')return (progress?.drones?.length||0)<8;
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
      if(lot.kind==='ship')art=shipCardAsset(lot.id);
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
  const src=shipCardAsset(shipId)||shipCardAsset('phoenix');
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
  tips.push('A Arena usa PLS-1 (X1) e CMT-1 fixos. Troca de munição não entra no cálculo deste modo.');
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
  updateBattleGroupStatus();
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
      const art=shipCardAsset(o.ship_id)||shipCardAsset('phoenix');
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

const adminRuntime={enabled:false,status:null,users:[],actions:[],telemetry:null,telemetryDetail:null,busy:false};
const adminRuntimeMonitor={data:null,busy:false};
function adminRuntimeTime(value){if(!value)return '—';const d=new Date(value);return Number.isNaN(d.getTime())?'—':d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});}
function renderAdminRuntimeMonitor(){
  if(!ui.adminRuntimeMonitorGrid)return;const data=adminRuntimeMonitor.data?.runtimes||{};const defs=[['topbar','TOPBAR'],['npcs','NPCs'],['world','WORLD'],['systems','SYSTEMS']];
  ui.adminRuntimeMonitorGrid.innerHTML=defs.map(([key,label])=>{const r=data[key]||{};const ok=!!r.ok;return `<article class="admin-runtime-monitor-card ${ok?'ok':'err'}"><div class="admin-runtime-monitor-card-head"><span>${label}</span><b>${ok?'ONLINE':'ERRO'}</b></div><strong>v${fmt(r.version||0)}</strong><small>${escHtml(r.file||'snapshot indisponível')}</small><div class="admin-runtime-monitor-meta"><span>ARQUIVO <b>${r.exists?'OK':'—'}</b></span><span>CONFIG <b>${adminRuntimeTime(r.config_updated_at)}</b></span><span>SNAPSHOT <b>${adminRuntimeTime(r.updated_at)}</b></span></div>${r.error?`<em>${escHtml(r.error)}</em>`:''}</article>`;}).join('');
  if(ui.adminRuntimeMonitorFoot)ui.adminRuntimeMonitorFoot.textContent=`Etapa 5/5 • Runtime • última consulta ${adminRuntimeTime(adminRuntimeMonitor.data?.generated_at)}`;
}
async function loadAdminRuntimeMonitor(force=false){
  if(adminRuntimeMonitor.busy)return;adminRuntimeMonitor.busy=true;if(ui.adminRuntimeMonitorRefresh)ui.adminRuntimeMonitorRefresh.disabled=true;
  try{adminRuntimeMonitor.data=await loadAdminRuntimeMonitorOnline(force);renderAdminRuntimeMonitor();if(force)showToast('Snapshots de runtime atualizados');}
  catch(e){if(ui.adminRuntimeMonitorGrid)ui.adminRuntimeMonitorGrid.innerHTML=`<div class="empty-state">${escHtml(e.message||'Falha ao consultar runtimes.')}</div>`;}
  finally{adminRuntimeMonitor.busy=false;if(ui.adminRuntimeMonitorRefresh)ui.adminRuntimeMonitorRefresh.disabled=false;}
}

// ===================== V18.1.6B • ADMIN INTERFACE EDITOR =====================
const adminInterfaceEditor={busy:false,activeTab:'runtime',snapshot:null};
function setAdminRuntimeTab(tab='runtime'){
  const next=['runtime','interface','npcs','world','systems','events'].includes(tab)?tab:'runtime';adminInterfaceEditor.activeTab=next;
  ui.adminRuntimeTabs?.querySelectorAll('[data-admin-runtime-tab]').forEach(b=>b.classList.toggle('active',b.dataset.adminRuntimeTab===next));
  ui.adminRuntimeMonitorPanel?.classList.toggle('hidden',next!=='runtime');
  ui.adminRuntimeInterfacePanel?.classList.toggle('hidden',next!=='interface');
  ui.adminRuntimeNpcPanel?.classList.toggle('hidden',next!=='npcs');
  ui.adminRuntimeWorldPanel?.classList.toggle('hidden',next!=='world');
  ui.adminRuntimeSystemsPanel?.classList.toggle('hidden',next!=='systems');
  ui.adminRuntimeEventsPanel?.classList.toggle('hidden',next!=='events');
  if(next==='interface'&&!adminInterfaceEditor.snapshot)loadAdminInterfaceEditor(false);
  if(next==='npcs'&&!adminNpcEditor.snapshot)loadAdminNpcEditor(false);
  if(next==='world'&&!adminWorldEditor.snapshot)loadAdminWorldEditor(false);
  if(next==='systems'&&!adminSystemsEditor.snapshot)loadAdminSystemsEditor(false);
  if(next==='events'&&!adminEventsEditor.snapshot)loadAdminEventsEditor(false);
}
function adminInterfaceMessage(text,kind='muted'){if(!ui.adminRuntimeInterfaceMessage)return;ui.adminRuntimeInterfaceMessage.textContent=text||'';ui.adminRuntimeInterfaceMessage.className=`admin-runtime-interface-message ${kind}`.trim();}
function adminModuleGroupLabel(row){if(!row?.parent_key)return 'TOPO';const p=adminInterfaceEditor.snapshot?.modules?.find(x=>x.module_key===row.parent_key);return p?.label||row.parent_key;}
function renderAdminInterfaceEditor(){
  if(!ui.adminRuntimeInterfaceGrid)return;const rows=Array.isArray(adminInterfaceEditor.snapshot?.modules)?[...adminInterfaceEditor.snapshot.modules]:[];
  const parentOrder=row=>{if(!row?.parent_key)return Number(row?.sort_order)||100;const p=rows.find(x=>x.module_key===row.parent_key);return Number(p?.sort_order)||100;};
  rows.sort((a,b)=>(parentOrder(a)-parentOrder(b))||(Number(a.parent_key?1:0)-Number(b.parent_key?1:0))||(Number(a.sort_order)-Number(b.sort_order))||String(a.module_key).localeCompare(String(b.module_key)));
  if(!rows.length){ui.adminRuntimeInterfaceGrid.innerHTML='<div class="empty-state">Nenhum módulo de interface carregado.</div>';return;}
  ui.adminRuntimeInterfaceGrid.innerHTML=rows.map(row=>{const key=String(row.module_key||''),protectedAdmin=key==='admin';return `<article class="admin-interface-row" data-interface-module="${escHtml(key)}"><div class="admin-interface-row-title"><div><b>${escHtml(key.toUpperCase())}</b><small>${escHtml(adminModuleGroupLabel(row))}</small></div>${protectedAdmin?'<span>PROTEGIDO</span>':''}</div><label>NOME<input data-iface-field="label" maxlength="40" value="${escHtml(row.label||key)}"></label><label>ORDEM<input data-iface-field="sort_order" type="number" min="0" max="999" value="${Math.max(0,Number(row.sort_order)||0)}"></label><label>NÍVEL<input data-iface-field="min_level" type="number" min="1" max="100" value="${Math.max(1,Number(row.min_level)||1)}" ${protectedAdmin?'disabled':''}></label><div class="admin-interface-toggles"><label><input data-iface-field="enabled" type="checkbox" ${row.enabled!==false?'checked':''} ${protectedAdmin?'disabled':''}> ATIVO</label><label><input data-iface-field="hide_until_level" type="checkbox" ${row.hide_until_level?'checked':''} ${protectedAdmin?'disabled':''}> OCULTAR ATÉ NÍVEL</label></div><button class="small-btn gold" type="button" data-interface-save="${escHtml(key)}">SALVAR</button></article>`;}).join('');
}
async function loadAdminInterfaceEditor(force=false){
  if(adminInterfaceEditor.busy)return;adminInterfaceEditor.busy=true;if(ui.adminRuntimeInterfaceReload)ui.adminRuntimeInterfaceReload.disabled=true;adminInterfaceMessage('Carregando configuração da Interface...');
  try{const raw=await loadRuntimeConfigOnline(!!force);adminInterfaceEditor.snapshot=raw;renderAdminInterfaceEditor();adminInterfaceMessage(`Interface v${Number(raw?.version)||0} carregada • ${raw?.modules?.length||0} módulos.`,'ok');}
  catch(e){adminInterfaceMessage(e.message||'Falha ao carregar Interface.','err');}
  finally{adminInterfaceEditor.busy=false;if(ui.adminRuntimeInterfaceReload)ui.adminRuntimeInterfaceReload.disabled=false;}
}
async function saveAdminInterfaceModule(key,card,button){
  if(adminInterfaceEditor.busy||!key||!card)return;const f=n=>card.querySelector(`[data-iface-field="${n}"]`);const payload={label:String(f('label')?.value||'').trim(),sort_order:Number(f('sort_order')?.value)||0,min_level:Number(f('min_level')?.value)||1,enabled:!!f('enabled')?.checked,hide_until_level:!!f('hide_until_level')?.checked};
  if(!payload.label){adminInterfaceMessage('O nome da aba não pode ficar vazio.','err');return;}adminInterfaceEditor.busy=true;if(button)button.disabled=true;adminInterfaceMessage(`Salvando ${key.toUpperCase()}...`);
  try{const result=await adminUpdateRuntimeModuleOnline(key,payload);const runtime=result?.runtime||await loadRuntimeConfigOnline(true);adminInterfaceEditor.snapshot=runtime;normalizeRuntimeConfig(runtime,'online');saveRuntimeConfigCache(runtime);renderAdminInterfaceEditor();await loadAdminRuntimeMonitor(false);adminInterfaceMessage(`${key.toUpperCase()} salvo • Topbar v${Number(runtime?.version)||0}.`,'ok');showToast(`${key.toUpperCase()} atualizado no runtime`);}
  catch(e){adminInterfaceMessage(e.message||'Falha ao salvar módulo.','err');}
  finally{adminInterfaceEditor.busy=false;if(button)button.disabled=false;}
}


// ===================== V18.1.6C • ADMIN NPC EDITOR =====================
const adminNpcEditor={busy:false,snapshot:null};
function adminNpcMessage(text,kind='muted'){if(!ui.adminRuntimeNpcMessage)return;ui.adminRuntimeNpcMessage.textContent=text||'';ui.adminRuntimeNpcMessage.className=`admin-runtime-interface-message ${kind}`.trim();}
function adminNpcMapLabel(id){const k=String(id||'');if(/^x[1-4]$/.test(k))return `X-${k.slice(1)}`;if(/^b4[1-3]$/.test(k))return `4-${k.slice(2)}`;return k.toUpperCase();}
function adminNpcSpawnRows(key){return (Array.isArray(adminNpcEditor.snapshot?.spawns)?adminNpcEditor.snapshot.spawns:[]).filter(x=>String(x.npc_key)===String(key)).sort((a,b)=>String(a.map_id).localeCompare(String(b.map_id),undefined,{numeric:true}));}
function renderAdminNpcEditor(){
  if(!ui.adminRuntimeNpcGrid)return;const rows=Array.isArray(adminNpcEditor.snapshot?.npcs)?[...adminNpcEditor.snapshot.npcs]:[];
  rows.sort((a,b)=>String(a.name||a.npc_key).localeCompare(String(b.name||b.npc_key),'pt-BR'));
  if(!rows.length){ui.adminRuntimeNpcGrid.innerHTML='<div class="empty-state">Nenhum NPC carregado.</div>';return;}
  ui.adminRuntimeNpcGrid.innerHTML=rows.map(row=>{const key=String(row.npc_key||''),spawns=adminNpcSpawnRows(key),rmin=Math.max(1,Number(row.respawn_min_ms)||6000)/1000,rmax=Math.max(1,Number(row.respawn_max_ms)||13000)/1000;return `<article class="admin-npc-card" data-admin-npc="${escHtml(key)}"><div class="admin-npc-card-head"><div><b>${escHtml(row.name||key)}</b><small>${escHtml(key)}</small></div><label class="admin-npc-active"><input data-npc-field="enabled" type="checkbox" ${row.enabled!==false?'checked':''}> ATIVO</label></div><div class="admin-npc-fields"><label>NOME<input data-npc-field="name" maxlength="48" value="${escHtml(row.name||key)}"></label><label>HP<input data-npc-field="hp" type="number" min="1" step="1" value="${Math.max(1,Number(row.hp)||1)}"></label><label>ESCUDO<input data-npc-field="shield" type="number" min="0" step="1" value="${Math.max(0,Number(row.shield)||0)}"></label><label>DANO<input data-npc-field="damage" type="number" min="0" step="1" value="${Math.max(0,Number(row.damage)||0)}"></label><label>VELOCIDADE<input data-npc-field="speed" type="number" min="1" max="1000" step="1" value="${Math.max(1,Number(row.speed)||1)}"></label><label>CR<input data-npc-field="credits" type="number" min="0" step="1" value="${Math.max(0,Number(row.credits)||0)}"></label><label>STL<input data-npc-field="stl" type="number" min="0" step="1" value="${Math.max(0,Number(row.stl)||0)}"></label><label>XP<input data-npc-field="xp" type="number" min="0" step="1" value="${Math.max(0,Number(row.xp)||0)}"></label><label>RESPAWN MIN (s)<input data-npc-field="respawn_min_s" type="number" min="1" max="600" step="0.1" value="${rmin}"></label><label>RESPAWN MAX (s)<input data-npc-field="respawn_max_s" type="number" min="1" max="600" step="0.1" value="${rmax}"></label></div><button class="small-btn gold admin-npc-save" type="button" data-npc-save="${escHtml(key)}">SALVAR NPC</button><div class="admin-npc-spawn-block"><div class="admin-npc-spawn-title"><b>POPULAÇÃO POR MAPA</b><small>Altera somente mapas já vinculados a este NPC.</small></div>${spawns.length?`<div class="admin-npc-spawn-grid">${spawns.map(sp=>`<div class="admin-npc-spawn-row" data-npc-spawn-map="${escHtml(sp.map_id)}"><b>${escHtml(adminNpcMapLabel(sp.map_id))}</b><input data-spawn-count type="number" min="0" max="500" step="1" value="${Math.max(0,Number(sp.spawn_count)||0)}"><label><input data-spawn-enabled type="checkbox" ${sp.enabled!==false?'checked':''}> ON</label><button class="small-btn" type="button" data-npc-spawn-save="${escHtml(key)}">SALVAR</button></div>`).join('')}</div>`:'<div class="empty-state compact">Sem população configurada em mapas normais.</div>'}</div></article>`;}).join('');
}
async function loadAdminNpcEditor(force=false){
  if(adminNpcEditor.busy)return;adminNpcEditor.busy=true;if(ui.adminRuntimeNpcReload)ui.adminRuntimeNpcReload.disabled=true;adminNpcMessage('Carregando configuração dos NPCs...');
  try{const raw=await loadNpcRuntimeConfigOnline(!!force);adminNpcEditor.snapshot=raw;renderAdminNpcEditor();adminNpcMessage(`NPC runtime v${Number(raw?.version)||0} carregado • ${raw?.npcs?.length||0} NPCs.`,'ok');}
  catch(e){adminNpcMessage(e.message||'Falha ao carregar NPCs.','err');}
  finally{adminNpcEditor.busy=false;if(ui.adminRuntimeNpcReload)ui.adminRuntimeNpcReload.disabled=false;}
}
async function saveAdminNpc(key,card,button){
  if(adminNpcEditor.busy||!key||!card)return;const f=n=>card.querySelector(`[data-npc-field="${n}"]`);const minS=Math.max(1,Number(f('respawn_min_s')?.value)||1),maxS=Math.max(1,Number(f('respawn_max_s')?.value)||1);if(maxS<minS){adminNpcMessage('Respawn máximo deve ser maior ou igual ao mínimo.','err');return;}
  const payload={name:String(f('name')?.value||'').trim(),hp:Math.max(1,Math.trunc(Number(f('hp')?.value)||1)),shield:Math.max(0,Math.trunc(Number(f('shield')?.value)||0)),damage:Math.max(0,Math.trunc(Number(f('damage')?.value)||0)),speed:Math.max(1,Number(f('speed')?.value)||1),credits:Math.max(0,Math.trunc(Number(f('credits')?.value)||0)),stl:Math.max(0,Math.trunc(Number(f('stl')?.value)||0)),xp:Math.max(0,Math.trunc(Number(f('xp')?.value)||0)),respawn_min_ms:Math.round(minS*1000),respawn_max_ms:Math.round(maxS*1000),enabled:!!f('enabled')?.checked};
  if(!payload.name){adminNpcMessage('O NPC precisa de um nome.','err');return;}adminNpcEditor.busy=true;if(button)button.disabled=true;adminNpcMessage(`Salvando ${payload.name}...`);
  try{const result=await adminUpdateNpcRuntimeOnline(key,payload);const runtime=result?.runtime||await loadNpcRuntimeConfigOnline(true);adminNpcEditor.snapshot=runtime;normalizeNpcRuntimeConfig(runtime,'online');saveNpcRuntimeConfigCache(runtime);renderAdminNpcEditor();await loadAdminRuntimeMonitor(false);adminNpcMessage(`${payload.name} salvo • NPC runtime v${Number(runtime?.version)||0}.`,'ok');showToast(`${payload.name} atualizado no runtime`);}
  catch(e){adminNpcMessage(e.message||'Falha ao salvar NPC.','err');}
  finally{adminNpcEditor.busy=false;if(button)button.disabled=false;}
}
async function saveAdminNpcSpawn(key,row,button){
  if(adminNpcEditor.busy||!key||!row)return;const mapId=String(row.dataset.npcSpawnMap||''),count=Math.max(0,Math.min(500,Math.trunc(Number(row.querySelector('[data-spawn-count]')?.value)||0))),enabled=!!row.querySelector('[data-spawn-enabled]')?.checked;adminNpcEditor.busy=true;if(button)button.disabled=true;adminNpcMessage(`Salvando população ${adminNpcMapLabel(mapId)}...`);
  try{const result=await adminUpdateNpcSpawnRuntimeOnline(key,mapId,{spawn_count:count,enabled});const runtime=result?.runtime||await loadNpcRuntimeConfigOnline(true);adminNpcEditor.snapshot=runtime;normalizeNpcRuntimeConfig(runtime,'online');saveNpcRuntimeConfigCache(runtime);renderAdminNpcEditor();await loadAdminRuntimeMonitor(false);adminNpcMessage(`${adminNpcMapLabel(mapId)} • ${count} unidades • runtime v${Number(runtime?.version)||0}.`,'ok');showToast(`População ${adminNpcMapLabel(mapId)} atualizada`);}
  catch(e){adminNpcMessage(e.message||'Falha ao salvar população.','err');}
  finally{adminNpcEditor.busy=false;if(button)button.disabled=false;}
}


// ===================== V18.1.7a • ADMIN WORLD EDITOR =====================
const adminWorldEditor={busy:false,snapshot:null,activeView:'maps'};
function adminWorldMessage(text,kind='muted'){if(!ui.adminRuntimeWorldMessage)return;ui.adminRuntimeWorldMessage.textContent=text||'';ui.adminRuntimeWorldMessage.className=`admin-runtime-interface-message ${kind}`.trim();}
function adminWorldSetView(view='maps'){
  const next=['maps','resources','sectors','portals'].includes(view)?view:'maps';adminWorldEditor.activeView=next;
  ui.adminRuntimeWorldTabs?.querySelectorAll('[data-admin-world-view]').forEach(b=>b.classList.toggle('active',b.dataset.adminWorldView===next));
  renderAdminWorldEditor();
}
function adminWorldResourceLabel(key){const r=adminWorldEditor.snapshot?.resources?.find(x=>String(x.resource_key)===String(key));return r?.name||key;}
function adminWorldMapLabel(id){const row=adminWorldEditor.snapshot?.maps?.find(x=>String(x.map_id)===String(id));return row?.label||row?.name||adminNpcMapLabel(id);}
function adminWorldMapPools(mapId){return (Array.isArray(adminWorldEditor.snapshot?.map_resources)?adminWorldEditor.snapshot.map_resources:[]).filter(x=>String(x.map_id)===String(mapId)).sort((a,b)=>String(a.resource_key).localeCompare(String(b.resource_key)));}
function renderAdminWorldMaps(){
  const rows=Array.isArray(adminWorldEditor.snapshot?.maps)?[...adminWorldEditor.snapshot.maps]:[];rows.sort((a,b)=>(Number(a.tier)||0)-(Number(b.tier)||0)||String(a.map_id).localeCompare(String(b.map_id)));
  return rows.map(row=>{const id=String(row.map_id||''),pools=adminWorldMapPools(id),rmin=Math.max(1,Number(row.ore_respawn_min_ms)||5000)/1000,rmax=Math.max(1,Number(row.ore_respawn_max_ms)||12000)/1000;return `<article class="admin-world-card admin-world-map-card" data-world-map="${escHtml(id)}"><div class="admin-world-card-head"><div><b>${escHtml(row.label||row.name||id)}</b><small>${escHtml(id)} • TIER ${fmt(row.tier||1)}${row.battle?' • BATALHA':''}${row.gate?' • PORTAL':''}</small></div><label class="admin-npc-active"><input data-world-map-field="enabled" type="checkbox" ${row.enabled!==false?'checked':''}> ATIVO</label></div><div class="admin-world-fields"><label>NOME<input data-world-map-field="name" maxlength="64" value="${escHtml(row.name||id)}"></label><label>RISCO<input data-world-map-field="risk" maxlength="32" value="${escHtml(row.risk||'Normal')}"></label><label>LARGURA<input data-world-map-field="world_w" type="number" min="1000" max="50000" step="100" value="${Math.round(Number(row.world_w)||6000)}"></label><label>ALTURA<input data-world-map-field="world_h" type="number" min="1000" max="50000" step="100" value="${Math.round(Number(row.world_h)||4500)}"></label><label>NÍVEL<input data-world-map-field="min_level" type="number" min="1" max="100" value="${Math.max(1,Number(row.min_level)||1)}"></label><label>MINÉRIOS<input data-world-map-field="ore_count" type="number" min="0" max="1000" value="${Math.max(0,Number(row.ore_count)||0)}"></label><label>RESPAWN MIN (s)<input data-world-map-field="ore_respawn_min_s" type="number" min="1" max="600" step="0.1" value="${rmin}"></label><label>RESPAWN MAX (s)<input data-world-map-field="ore_respawn_max_s" type="number" min="1" max="600" step="0.1" value="${rmax}"></label></div><button class="small-btn gold admin-world-save" type="button" data-world-map-save="${escHtml(id)}">SALVAR MAPA</button><div class="admin-world-pool-block"><div class="admin-npc-spawn-title"><b>POOL DE MINÉRIO</b><small>Peso relativo e disponibilidade dos recursos já vinculados.</small></div>${pools.length?`<div class="admin-world-pool-grid">${pools.map(pool=>`<div class="admin-world-pool-row" data-world-pool-resource="${escHtml(pool.resource_key)}"><b>${escHtml(adminWorldResourceLabel(pool.resource_key))}</b><input data-world-pool-weight type="number" min="0.01" max="1000" step="0.01" value="${Number(pool.weight)||1}"><label><input data-world-pool-enabled type="checkbox" ${pool.enabled!==false?'checked':''}> ON</label><button class="small-btn" type="button" data-world-pool-save="${escHtml(id)}">SALVAR</button></div>`).join('')}</div>`:'<div class="empty-state compact">Sem recursos vinculados a este mapa.</div>'}</div></article>`;}).join('')||'<div class="empty-state">Nenhum mapa carregado.</div>';
}
function renderAdminWorldResources(){
  const rows=Array.isArray(adminWorldEditor.snapshot?.resources)?[...adminWorldEditor.snapshot.resources]:[];rows.sort((a,b)=>String(a.name||a.resource_key).localeCompare(String(b.name||b.resource_key),'pt-BR'));
  return rows.map(row=>{const key=String(row.resource_key||''),color=/^#[0-9a-f]{6}$/i.test(String(row.color||''))?String(row.color):'#ffffff';return `<article class="admin-world-card admin-world-resource-card" data-world-resource="${escHtml(key)}"><div class="admin-world-card-head"><div><b>${escHtml(row.name||key)}</b><small>${escHtml(key)}</small></div><label class="admin-npc-active"><input data-world-resource-field="enabled" type="checkbox" ${row.enabled!==false?'checked':''}> ATIVO</label></div><div class="admin-world-resource-fields"><label>NOME<input data-world-resource-field="name" maxlength="48" value="${escHtml(row.name||key)}"></label><label>COR<div class="admin-world-color-field"><input data-world-resource-field="color_picker" type="color" value="${escHtml(color)}"><input data-world-resource-field="color" maxlength="7" value="${escHtml(color)}"></div></label><label>PREÇO DE VENDA (CR)<input data-world-resource-field="sell_price" type="number" min="0" step="1" value="${Math.max(0,Number(row.sell_price)||0)}"></label></div><button class="small-btn gold admin-world-save" type="button" data-world-resource-save="${escHtml(key)}">SALVAR RECURSO</button></article>`;}).join('')||'<div class="empty-state">Nenhum recurso carregado.</div>';
}
function renderAdminWorldSectors(){
  const rows=Array.isArray(adminWorldEditor.snapshot?.sectors)?[...adminWorldEditor.snapshot.sectors]:[];rows.sort((a,b)=>String(a.sector_label).localeCompare(String(b.sector_label),undefined,{numeric:true}));
  return rows.map(row=>{const key=String(row.sector_label||'');return `<article class="admin-world-card admin-world-sector-card" data-world-sector="${escHtml(key)}"><div class="admin-world-card-head"><div><b>SETOR ${escHtml(key)}</b><small>${escHtml(adminWorldMapLabel(row.map_id))}${row.territory_faction?` • ${escHtml(String(row.territory_faction).toUpperCase())}`:' • NEUTRO'}</small></div><label class="admin-npc-active"><input data-world-sector-field="enabled" type="checkbox" ${row.enabled!==false?'checked':''}> ATIVO</label></div><div class="admin-world-sector-fields"><label>POSIÇÃO X<input data-world-sector-field="graph_x" type="number" min="0" max="100" step="0.1" value="${Number(row.graph_x)||0}"></label><label>POSIÇÃO Y<input data-world-sector-field="graph_y" type="number" min="0" max="100" step="0.1" value="${Number(row.graph_y)||0}"></label><label>NÍVEL<input data-world-sector-field="min_level" type="number" min="1" max="100" value="${Math.max(1,Number(row.min_level)||1)}"></label></div><button class="small-btn gold admin-world-save" type="button" data-world-sector-save="${escHtml(key)}">SALVAR SETOR</button></article>`;}).join('')||'<div class="empty-state">Nenhum setor carregado.</div>';
}
function renderAdminWorldPortals(){
  const rows=Array.isArray(adminWorldEditor.snapshot?.portals)?[...adminWorldEditor.snapshot.portals]:[];rows.sort((a,b)=>(Number(a.sort_order)||0)-(Number(b.sort_order)||0)||String(a.portal_key).localeCompare(String(b.portal_key)));
  return rows.map(row=>{const key=String(row.portal_key||'');return `<article class="admin-world-card admin-world-portal-card" data-world-portal="${escHtml(key)}"><div class="admin-world-card-head"><div><b>${escHtml(row.from_sector)} ↔ ${escHtml(row.to_sector)}</b><small>${escHtml(key)}</small></div><label class="admin-npc-active"><input data-world-portal-field="enabled" type="checkbox" ${row.enabled!==false?'checked':''}> ATIVO</label></div><div class="admin-world-portal-fields"><label>ORDEM<input data-world-portal-field="sort_order" type="number" min="0" max="9999" value="${Math.max(0,Number(row.sort_order)||0)}"></label><label class="admin-world-check"><input data-world-portal-field="bidirectional" type="checkbox" ${row.bidirectional!==false?'checked':''}> BIDIRECIONAL</label></div><button class="small-btn gold admin-world-save" type="button" data-world-portal-save="${escHtml(key)}">SALVAR PORTAL</button></article>`;}).join('')||'<div class="empty-state">Nenhum portal carregado.</div>';
}
function renderAdminWorldEditor(){
  if(!ui.adminRuntimeWorldGrid)return;const view=adminWorldEditor.activeView;
  ui.adminRuntimeWorldGrid.className=`admin-runtime-world-grid view-${view}`;
  ui.adminRuntimeWorldGrid.innerHTML=view==='resources'?renderAdminWorldResources():view==='sectors'?renderAdminWorldSectors():view==='portals'?renderAdminWorldPortals():renderAdminWorldMaps();
  ui.adminRuntimeWorldGrid.querySelectorAll('[data-world-resource-field="color_picker"]').forEach(p=>p.oninput=()=>{const card=p.closest('[data-world-resource]');const t=card?.querySelector('[data-world-resource-field="color"]');if(t)t.value=p.value;});
  ui.adminRuntimeWorldGrid.querySelectorAll('[data-world-resource-field="color"]').forEach(t=>t.oninput=()=>{const v=String(t.value||'');if(/^#[0-9a-f]{6}$/i.test(v)){const card=t.closest('[data-world-resource]');const p=card?.querySelector('[data-world-resource-field="color_picker"]');if(p)p.value=v;}});
}
async function loadAdminWorldEditor(force=false){
  if(adminWorldEditor.busy)return;adminWorldEditor.busy=true;if(ui.adminRuntimeWorldReload)ui.adminRuntimeWorldReload.disabled=true;adminWorldMessage('Carregando configuração do Mundo...');
  try{const raw=await loadWorldRuntimeConfigOnline(!!force);adminWorldEditor.snapshot=raw;renderAdminWorldEditor();adminWorldMessage(`World runtime v${Number(raw?.version)||0} • ${raw?.maps?.length||0} mapas • ${raw?.sectors?.length||0} setores.`,'ok');}
  catch(e){adminWorldMessage(e.message||'Falha ao carregar Mundo.','err');}
  finally{adminWorldEditor.busy=false;if(ui.adminRuntimeWorldReload)ui.adminRuntimeWorldReload.disabled=false;}
}
async function adminWorldApplyResult(result,message){const runtime=result?.runtime||await loadWorldRuntimeConfigOnline(true);adminWorldEditor.snapshot=runtime;normalizeWorldRuntimeConfig(runtime,'online');saveWorldRuntimeConfigCache(runtime);renderAdminWorldEditor();await loadAdminRuntimeMonitor(false);adminWorldMessage(`${message} • World v${Number(runtime?.version)||0}.`,'ok');return runtime;}
async function saveAdminWorldMap(key,card,button){
  if(adminWorldEditor.busy||!key||!card)return;const f=n=>card.querySelector(`[data-world-map-field="${n}"]`);const minS=Math.max(1,Number(f('ore_respawn_min_s')?.value)||1),maxS=Math.max(1,Number(f('ore_respawn_max_s')?.value)||1);if(maxS<minS){adminWorldMessage('Respawn máximo deve ser maior ou igual ao mínimo.','err');return;}const payload={name:String(f('name')?.value||'').trim(),risk:String(f('risk')?.value||'').trim(),world_w:Math.round(Number(f('world_w')?.value)||1000),world_h:Math.round(Number(f('world_h')?.value)||1000),min_level:Math.round(Number(f('min_level')?.value)||1),ore_count:Math.round(Number(f('ore_count')?.value)||0),ore_respawn_min_ms:Math.round(minS*1000),ore_respawn_max_ms:Math.round(maxS*1000),enabled:!!f('enabled')?.checked};if(!payload.name||!payload.risk){adminWorldMessage('Nome e risco do mapa são obrigatórios.','err');return;}adminWorldEditor.busy=true;if(button)button.disabled=true;adminWorldMessage(`Salvando ${key.toUpperCase()}...`);try{await adminWorldApplyResult(await adminUpdateWorldMapOnline(key,payload),`${key.toUpperCase()} salvo`);showToast(`${key.toUpperCase()} atualizado no World Runtime`);}catch(e){adminWorldMessage(e.message||'Falha ao salvar mapa.','err');}finally{adminWorldEditor.busy=false;if(button)button.disabled=false;}}
async function saveAdminWorldResource(key,card,button){
  if(adminWorldEditor.busy||!key||!card)return;const f=n=>card.querySelector(`[data-world-resource-field="${n}"]`);const color=String(f('color')?.value||'').trim();if(!/^#[0-9a-f]{6}$/i.test(color)){adminWorldMessage('Use uma cor hexadecimal no formato #RRGGBB.','err');return;}const payload={name:String(f('name')?.value||'').trim(),color,sell_price:Math.max(0,Math.round(Number(f('sell_price')?.value)||0)),enabled:!!f('enabled')?.checked};if(!payload.name){adminWorldMessage('O recurso precisa de um nome.','err');return;}adminWorldEditor.busy=true;if(button)button.disabled=true;adminWorldMessage(`Salvando ${payload.name}...`);try{await adminWorldApplyResult(await adminUpdateWorldResourceOnline(key,payload),`${payload.name} salvo`);showToast(`${payload.name} atualizado no World Runtime`);}catch(e){adminWorldMessage(e.message||'Falha ao salvar recurso.','err');}finally{adminWorldEditor.busy=false;if(button)button.disabled=false;}}
async function saveAdminWorldSector(key,card,button){
  if(adminWorldEditor.busy||!key||!card)return;const f=n=>card.querySelector(`[data-world-sector-field="${n}"]`);const payload={graph_x:Math.max(0,Math.min(100,Number(f('graph_x')?.value)||0)),graph_y:Math.max(0,Math.min(100,Number(f('graph_y')?.value)||0)),min_level:Math.max(1,Math.min(100,Math.round(Number(f('min_level')?.value)||1))),enabled:!!f('enabled')?.checked};adminWorldEditor.busy=true;if(button)button.disabled=true;adminWorldMessage(`Salvando setor ${key}...`);try{await adminWorldApplyResult(await adminUpdateWorldSectorOnline(key,payload),`Setor ${key} salvo`);showToast(`Setor ${key} atualizado`);}catch(e){adminWorldMessage(e.message||'Falha ao salvar setor.','err');}finally{adminWorldEditor.busy=false;if(button)button.disabled=false;}}
async function saveAdminWorldPortal(key,card,button){
  if(adminWorldEditor.busy||!key||!card)return;const f=n=>card.querySelector(`[data-world-portal-field="${n}"]`);const payload={sort_order:Math.max(0,Math.min(9999,Math.round(Number(f('sort_order')?.value)||0))),enabled:!!f('enabled')?.checked,bidirectional:!!f('bidirectional')?.checked};adminWorldEditor.busy=true;if(button)button.disabled=true;adminWorldMessage(`Salvando portal ${key}...`);try{await adminWorldApplyResult(await adminUpdateWorldPortalOnline(key,payload),'Portal salvo');showToast('Portal atualizado no World Runtime');}catch(e){adminWorldMessage(e.message||'Falha ao salvar portal.','err');}finally{adminWorldEditor.busy=false;if(button)button.disabled=false;}}
async function saveAdminWorldPool(mapId,row,button){
  if(adminWorldEditor.busy||!mapId||!row)return;const resourceKey=String(row.dataset.worldPoolResource||''),weight=Math.max(.01,Math.min(1000,Number(row.querySelector('[data-world-pool-weight]')?.value)||1)),enabled=!!row.querySelector('[data-world-pool-enabled]')?.checked;adminWorldEditor.busy=true;if(button)button.disabled=true;adminWorldMessage(`Salvando pool ${adminWorldResourceLabel(resourceKey)}...`);try{await adminWorldApplyResult(await adminUpdateWorldResourcePoolOnline(mapId,resourceKey,{weight,enabled}),`${adminWorldResourceLabel(resourceKey)} em ${adminWorldMapLabel(mapId)} salvo`);showToast('Pool de minério atualizado');}catch(e){adminWorldMessage(e.message||'Falha ao salvar pool.','err');}finally{adminWorldEditor.busy=false;if(button)button.disabled=false;}}

// ===================== V18.1.7a • ADMIN SYSTEMS EDITOR =====================
const adminSystemsEditor={busy:false,snapshot:null,activeView:'missions'};
function adminSystemsMessage(text,kind='muted'){if(!ui.adminRuntimeSystemsMessage)return;ui.adminRuntimeSystemsMessage.textContent=text||'';ui.adminRuntimeSystemsMessage.className=`admin-runtime-interface-message ${kind}`.trim();}
function adminSystemsSetView(view='missions'){
  const next=['missions','economy','crafting'].includes(view)?view:'missions';adminSystemsEditor.activeView=next;
  ui.adminRuntimeSystemsTabs?.querySelectorAll('[data-admin-systems-view]').forEach(b=>b.classList.toggle('active',b.dataset.adminSystemsView===next));
  renderAdminSystemsEditor();
}
function adminSystemsJson(value){try{return JSON.stringify(value&&typeof value==='object'?value:{},null,2);}catch{return '{}';}}
function adminSystemsParseJson(text,label){let parsed;try{parsed=JSON.parse(String(text||'{}'));}catch{throw new Error(`${label}: JSON inválido.`);}if(!parsed||Array.isArray(parsed)||typeof parsed!=='object')throw new Error(`${label}: informe um objeto JSON.`);return parsed;}
function renderAdminSystemMissions(){
  const rows=Array.isArray(adminSystemsEditor.snapshot?.mission_categories)?[...adminSystemsEditor.snapshot.mission_categories]:[];rows.sort((a,b)=>String(a.category).localeCompare(String(b.category)));
  return rows.map(row=>{const key=String(row.category||'');return `<article class="admin-system-card" data-system-mission="${escHtml(key)}"><div class="admin-system-card-head"><div><b>${escHtml(row.label||key)}</b><small>${escHtml(key)} • ${escHtml(String(row.reset_kind||'').toUpperCase())}</small></div><label class="admin-npc-active"><input data-system-mission-field="enabled" type="checkbox" ${row.enabled!==false?'checked':''}> ATIVO</label></div><div class="admin-system-fields mission"><label>NÍVEL MÍNIMO<input data-system-mission-field="min_level" type="number" min="1" max="100" value="${Math.max(1,Number(row.min_level)||1)}"></label><label>MULTIPLICADOR<input data-system-mission-field="reward_factor" type="number" min="0" max="10" step="0.01" value="${Number(row.reward_factor)||0}"></label><label>CHANCE DE ITEM (0–1)<input data-system-mission-field="item_chance" type="number" min="0" max="1" step="0.01" value="${Number(row.item_chance)||0}"></label></div><label class="admin-system-json-label">CONFIGURAÇÃO DO GERADOR<textarea data-system-mission-field="config" spellcheck="false">${escHtml(adminSystemsJson(row.config))}</textarea></label><button class="small-btn gold admin-system-save" type="button" data-system-mission-save="${escHtml(key)}">SALVAR MISSÃO</button></article>`;}).join('')||'<div class="empty-state">Nenhuma categoria de missão carregada.</div>';
}
function renderAdminSystemEconomy(){
  const rows=Array.isArray(adminSystemsEditor.snapshot?.economy_services)?[...adminSystemsEditor.snapshot.economy_services]:[];rows.sort((a,b)=>(Number(a.sort_order)||0)-(Number(b.sort_order)||0)||String(a.service_id).localeCompare(String(b.service_id)));
  return rows.map(row=>{const key=String(row.service_id||''),duration=Math.max(1,Number(row.duration_ms)||3600000)/60000,stack=Math.max(1,Number(row.max_stack_ms)||21600000)/60000;return `<article class="admin-system-card" data-system-economy="${escHtml(key)}"><div class="admin-system-card-head"><div><b>${escHtml(row.name||key)}</b><small>${escHtml(key)} • ${escHtml(row.description||'')}</small></div><label class="admin-npc-active"><input data-system-economy-field="enabled" type="checkbox" ${row.enabled!==false?'checked':''}> ATIVO</label></div><div class="admin-system-fields economy"><label>CUSTO BASE (CR)<input data-system-economy-field="base_cost" type="number" min="0" step="1" value="${Math.max(0,Number(row.base_cost)||0)}"></label><label>DURAÇÃO (min)<input data-system-economy-field="duration_min" type="number" min="1" max="1440" step="1" value="${duration}"></label><label>ESCALA/NÍVEL<input data-system-economy-field="level_cost_scale" type="number" min="0" max="10" step="0.01" value="${Number(row.level_cost_scale)||0}"></label><label>STACK MÁX (min)<input data-system-economy-field="max_stack_min" type="number" min="1" max="10080" step="1" value="${stack}"></label></div><label class="admin-system-json-label">EFEITO<textarea data-system-economy-field="effect" spellcheck="false">${escHtml(adminSystemsJson(row.effect))}</textarea></label><button class="small-btn gold admin-system-save" type="button" data-system-economy-save="${escHtml(key)}">SALVAR SERVIÇO</button></article>`;}).join('')||'<div class="empty-state">Nenhum serviço econômico carregado.</div>';
}
function renderAdminSystemCrafting(){
  const rows=Array.isArray(adminSystemsEditor.snapshot?.crafting_recipes)?[...adminSystemsEditor.snapshot.crafting_recipes]:[];rows.sort((a,b)=>(Number(a.sort_order)||0)-(Number(b.sort_order)||0)||String(a.recipe_id).localeCompare(String(b.recipe_id)));
  return rows.map(row=>{const key=String(row.recipe_id||''),currency=String(row.currency||'credits');return `<article class="admin-system-card" data-system-crafting="${escHtml(key)}"><div class="admin-system-card-head"><div><b>${escHtml(row.name||key)}</b><small>${escHtml(key)} • ${escHtml(row.description||'')}</small></div><label class="admin-npc-active"><input data-system-crafting-field="enabled" type="checkbox" ${row.enabled!==false?'checked':''}> ATIVO</label></div><div class="admin-system-fields crafting"><label>CUSTO<input data-system-crafting-field="cost" type="number" min="0" step="1" value="${Math.max(0,Number(row.cost)||0)}"></label><label>MOEDA<select data-system-crafting-field="currency"><option value="credits" ${currency==='credits'?'selected':''}>CRÉDITOS</option><option value="uridium" ${currency==='uridium'?'selected':''}>STL</option></select></label><label>NÍVEL<input data-system-crafting-field="min_level" type="number" min="1" max="100" value="${Math.max(1,Number(row.min_level)||1)}"></label><label>SAÍDA<input data-system-crafting-field="output_label" maxlength="72" value="${escHtml(row.output_label||'')}"></label></div><div class="admin-system-json-grid"><label class="admin-system-json-label">INGREDIENTES<textarea data-system-crafting-field="ingredients" spellcheck="false">${escHtml(adminSystemsJson(row.ingredients))}</textarea></label><label class="admin-system-json-label">RECOMPENSA<textarea data-system-crafting-field="grant_payload" spellcheck="false">${escHtml(adminSystemsJson(row.grant_payload))}</textarea></label></div><button class="small-btn gold admin-system-save" type="button" data-system-crafting-save="${escHtml(key)}">SALVAR RECEITA</button></article>`;}).join('')||'<div class="empty-state">Nenhuma receita carregada.</div>';
}
function renderAdminSystemsEditor(){if(!ui.adminRuntimeSystemsGrid)return;const view=adminSystemsEditor.activeView;ui.adminRuntimeSystemsGrid.className=`admin-runtime-systems-grid view-${view}`;ui.adminRuntimeSystemsGrid.innerHTML=view==='economy'?renderAdminSystemEconomy():view==='crafting'?renderAdminSystemCrafting():renderAdminSystemMissions();}
async function loadAdminSystemsEditor(force=false){
  if(adminSystemsEditor.busy)return;adminSystemsEditor.busy=true;if(ui.adminRuntimeSystemsReload)ui.adminRuntimeSystemsReload.disabled=true;adminSystemsMessage('Carregando configuração dos Sistemas...');
  try{const raw=await loadSystemsRuntimeConfigOnline(!!force);adminSystemsEditor.snapshot=raw;renderAdminSystemsEditor();adminSystemsMessage(`Systems runtime v${Number(raw?.version)||0} • ${raw?.mission_categories?.length||0} categorias • ${raw?.economy_services?.length||0} serviços • ${raw?.crafting_recipes?.length||0} receitas.`,'ok');}
  catch(e){adminSystemsMessage(e.message||'Falha ao carregar Sistemas.','err');}
  finally{adminSystemsEditor.busy=false;if(ui.adminRuntimeSystemsReload)ui.adminRuntimeSystemsReload.disabled=false;}
}
async function adminSystemsApplyResult(result,message){const runtime=result?.runtime||await loadSystemsRuntimeConfigOnline(true);adminSystemsEditor.snapshot=runtime;normalizeSystemsRuntimeConfig(runtime,'online');saveSystemsRuntimeConfigCache(runtime);renderAdminSystemsEditor();await loadAdminRuntimeMonitor(false);adminSystemsMessage(`${message} • Systems v${Number(runtime?.version)||0}.`,'ok');return runtime;}
async function saveAdminSystemMission(key,card,button){
  if(adminSystemsEditor.busy||!key||!card)return;const f=n=>card.querySelector(`[data-system-mission-field="${n}"]`);let config;try{config=adminSystemsParseJson(f('config')?.value,'Configuração da missão');}catch(e){adminSystemsMessage(e.message,'err');return;}const payload={min_level:Math.max(1,Math.min(100,Math.round(Number(f('min_level')?.value)||1))),reward_factor:Math.max(0,Math.min(10,Number(f('reward_factor')?.value)||0)),item_chance:Math.max(0,Math.min(1,Number(f('item_chance')?.value)||0)),enabled:!!f('enabled')?.checked,config};adminSystemsEditor.busy=true;if(button)button.disabled=true;adminSystemsMessage(`Salvando ${key.toUpperCase()}...`);try{await adminSystemsApplyResult(await adminUpdateMissionCategoryOnline(key,payload),`${key.toUpperCase()} salvo`);showToast('Gerador de missão atualizado');}catch(e){adminSystemsMessage(e.message||'Falha ao salvar missão.','err');}finally{adminSystemsEditor.busy=false;if(button)button.disabled=false;}}
async function saveAdminSystemEconomy(key,card,button){
  if(adminSystemsEditor.busy||!key||!card)return;const f=n=>card.querySelector(`[data-system-economy-field="${n}"]`);let effect;try{effect=adminSystemsParseJson(f('effect')?.value,'Efeito');}catch(e){adminSystemsMessage(e.message,'err');return;}const payload={base_cost:Math.max(0,Math.round(Number(f('base_cost')?.value)||0)),duration_ms:Math.max(60000,Math.round((Number(f('duration_min')?.value)||1)*60000)),level_cost_scale:Math.max(0,Math.min(10,Number(f('level_cost_scale')?.value)||0)),max_stack_ms:Math.max(60000,Math.round((Number(f('max_stack_min')?.value)||1)*60000)),effect,enabled:!!f('enabled')?.checked};adminSystemsEditor.busy=true;if(button)button.disabled=true;adminSystemsMessage(`Salvando ${key.toUpperCase()}...`);try{await adminSystemsApplyResult(await adminUpdateEconomyServiceOnline(key,payload),`${key.toUpperCase()} salvo`);showToast('Serviço econômico atualizado');}catch(e){adminSystemsMessage(e.message||'Falha ao salvar serviço.','err');}finally{adminSystemsEditor.busy=false;if(button)button.disabled=false;}}
async function saveAdminSystemCrafting(key,card,button){
  if(adminSystemsEditor.busy||!key||!card)return;const f=n=>card.querySelector(`[data-system-crafting-field="${n}"]`);let ingredients,grant_payload;try{ingredients=adminSystemsParseJson(f('ingredients')?.value,'Ingredientes');grant_payload=adminSystemsParseJson(f('grant_payload')?.value,'Recompensa');}catch(e){adminSystemsMessage(e.message,'err');return;}const output_label=String(f('output_label')?.value||'').trim();if(!output_label){adminSystemsMessage('A saída da receita não pode ficar vazia.','err');return;}const payload={cost:Math.max(0,Math.round(Number(f('cost')?.value)||0)),currency:String(f('currency')?.value||'credits')==='uridium'?'uridium':'credits',min_level:Math.max(1,Math.min(100,Math.round(Number(f('min_level')?.value)||1))),output_label,ingredients,grant_payload,enabled:!!f('enabled')?.checked};adminSystemsEditor.busy=true;if(button)button.disabled=true;adminSystemsMessage(`Salvando ${key.toUpperCase()}...`);try{await adminSystemsApplyResult(await adminUpdateCraftingRecipeOnline(key,payload),`${key.toUpperCase()} salvo`);showToast('Receita atualizada no Systems Runtime');}catch(e){adminSystemsMessage(e.message||'Falha ao salvar receita.','err');}finally{adminSystemsEditor.busy=false;if(button)button.disabled=false;}}


// ===================== V18.1.7A • ADMIN EVENT SCHEDULER =====================
const adminEventsEditor={busy:false,snapshot:null};
const ADMIN_EVENT_DAYS=[['0','DOM'],['1','SEG'],['2','TER'],['3','QUA'],['4','QUI'],['5','SEX'],['6','SÁB']];
function adminEventsMessage(text,kind='muted'){if(!ui.adminRuntimeEventsMessage)return;ui.adminRuntimeEventsMessage.textContent=text||'';ui.adminRuntimeEventsMessage.className=`admin-runtime-interface-message ${kind}`.trim();}
function adminEventDateInput(value){if(!value)return '';const d=new Date(value);if(Number.isNaN(d.getTime()))return '';const pad=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;}
function adminEventTime(value){const m=String(value||'').match(/^(\d{2}:\d{2})/);return m?m[1]:'00:00';}
function adminEventModeLabel(mode){return ({interval:'INTERVALO',weekly:'SEMANAL',once:'ÚNICO'})[String(mode||'interval')]||'INTERVALO';}
function renderAdminEventsEditor(){
  if(!ui.adminRuntimeEventsGrid)return;const rows=[...(adminEventsEditor.snapshot?.events||[])].sort((a,b)=>(Number(a.priority)||100)-(Number(b.priority)||100)||String(a.event_key).localeCompare(String(b.event_key)));
  if(!rows.length){ui.adminRuntimeEventsGrid.innerHTML='<div class="empty-state">Nenhum evento cadastrado no LIVE OPS.</div>';return;}
  ui.adminRuntimeEventsGrid.innerHTML=rows.map(row=>{const key=String(row.event_key||''),mode=String(row.schedule_mode||'interval'),days=new Set((row.weekdays||[]).map(String));return `<article class="admin-event-card" data-admin-event="${escHtml(key)}"><div class="admin-event-head"><div><b>${escHtml(row.icon||'✦')} ${escHtml(row.name||key)}</b><small>${escHtml(key.toUpperCase())} • prioridade ${fmt(row.priority||0)} • ${adminEventModeLabel(mode)}</small></div><label class="admin-world-check"><input data-event-field="enabled" type="checkbox" ${row.enabled!==false?'checked':''}> ATIVO</label></div><div class="admin-event-fields"><label>MODO<select data-event-field="schedule_mode"><option value="interval" ${mode==='interval'?'selected':''}>INTERVALO</option><option value="weekly" ${mode==='weekly'?'selected':''}>SEMANAL</option><option value="once" ${mode==='once'?'selected':''}>ÚNICO</option></select></label><label>DURAÇÃO (MIN)<input data-event-field="duration_minutes" type="number" min="1" max="10080" value="${Math.max(1,Number(row.duration_minutes)||15)}"></label><label>REPETE A CADA (MIN)<input data-event-field="repeat_minutes" type="number" min="1" max="10080" value="${Math.max(1,Number(row.repeat_minutes)||75)}"></label><label>HORA SEMANAL<input data-event-field="start_local_time" type="time" value="${escHtml(adminEventTime(row.start_local_time))}"></label><label>INÍCIO / ÂNCORA<input data-event-field="starts_at" type="datetime-local" value="${escHtml(adminEventDateInput(row.starts_at))}"></label><label>ENCERRA EM (OPCIONAL)<input data-event-field="ends_at" type="datetime-local" value="${escHtml(adminEventDateInput(row.ends_at))}"></label></div><div class="admin-event-weekdays"><span>DIAS DA SEMANA</span><div>${ADMIN_EVENT_DAYS.map(([v,label])=>`<label><input type="checkbox" data-event-weekday="${v}" ${days.has(v)?'checked':''}>${label}</label>`).join('')}</div></div><div class="admin-event-summary"><span>META <b>${fmt(row.target||0)}</b></span><span>FUSO <b>AMERICA/SÃO PAULO</b></span><span>ATUALIZADO <b>${adminDate(row.updated_at)}</b></span></div><button class="small-btn gold admin-event-save" type="button" data-event-save="${escHtml(key)}">SALVAR AGENDA</button></article>`;}).join('');
}
async function loadAdminEventsEditor(force=false){
  if(adminEventsEditor.busy)return;adminEventsEditor.busy=true;if(ui.adminRuntimeEventsReload)ui.adminRuntimeEventsReload.disabled=true;adminEventsMessage('Carregando calendário de eventos...');
  try{const raw=await loadLiveOpsOnline(!!force);adminEventsEditor.snapshot=raw;renderAdminEventsEditor();adminEventsMessage(`${raw?.events?.length||0} evento(s) carregado(s) • horário oficial de São Paulo.`,'ok');}
  catch(e){adminEventsMessage(e.message||'Falha ao carregar eventos.','err');}
  finally{adminEventsEditor.busy=false;if(ui.adminRuntimeEventsReload)ui.adminRuntimeEventsReload.disabled=false;}
}
async function saveAdminEventSchedule(key,card,button){
  if(adminEventsEditor.busy||!key||!card)return;const f=n=>card.querySelector(`[data-event-field="${n}"]`),mode=String(f('schedule_mode')?.value||'interval'),weekdays=[...card.querySelectorAll('[data-event-weekday]:checked')].map(x=>Number(x.dataset.eventWeekday)).filter(n=>Number.isInteger(n));
  if(mode==='weekly'&&!weekdays.length){adminEventsMessage('Selecione pelo menos um dia para a agenda semanal.','err');return;}
  const toIso=value=>{if(!value)return '';const d=new Date(value);return Number.isNaN(d.getTime())?'':d.toISOString();};
  const payload={enabled:!!f('enabled')?.checked,schedule_mode:mode,duration_minutes:Math.max(1,Math.min(10080,Math.round(Number(f('duration_minutes')?.value)||15))),repeat_minutes:Math.max(1,Math.min(10080,Math.round(Number(f('repeat_minutes')?.value)||75))),weekdays,start_local_time:String(f('start_local_time')?.value||''),starts_at:toIso(f('starts_at')?.value),ends_at:toIso(f('ends_at')?.value)};
  if((mode==='interval'||mode==='once')&&!payload.starts_at){adminEventsMessage('Informe INÍCIO / ÂNCORA para esse modo.','err');return;}
  if(mode==='weekly'&&!payload.start_local_time){adminEventsMessage('Informe a hora da agenda semanal.','err');return;}
  adminEventsEditor.busy=true;if(button)button.disabled=true;adminEventsMessage(`Salvando agenda de ${key.toUpperCase()}...`);
  try{const result=await adminUpdateLiveEventScheduleOnline(key,payload);adminEventsEditor.snapshot=result?.runtime||await loadLiveOpsOnline(true);liveOpsRuntime.state=adminEventsEditor.snapshot;liveOpsRuntime.lastAt=Date.now();applyLiveCatalog(adminEventsEditor.snapshot?.catalog||[]);renderAdminEventsEditor();adminEventsMessage(`${key.toUpperCase()} atualizado • o universo sincroniza em até ~15s.`,'ok');showToast('Calendário do evento atualizado');}
  catch(e){adminEventsMessage(e.message||'Falha ao salvar evento.','err');}
  finally{adminEventsEditor.busy=false;if(button)button.disabled=false;}
}

function adminDate(value){if(!value)return '—';try{return new Date(value).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});}catch{return String(value);}}
function adminSetMessage(text,kind=''){if(!ui.adminMessage)return;ui.adminMessage.textContent=text||'';ui.adminMessage.className=`admin-message ${kind}`.trim();}
function renderAdminStatus(){const st=adminRuntime.status||{};if(ui.adminTotalAccounts)ui.adminTotalAccounts.textContent=fmt(st.total_accounts||0);if(ui.adminOnlineAccounts)ui.adminOnlineAccounts.textContent=fmt(st.online_accounts||0);if(ui.adminBannedAccounts)ui.adminBannedAccounts.textContent=fmt(st.banned_accounts||0);}
function renderAdminUsers(){
  if(!ui.adminUserList)return;const users=adminRuntime.users||[];
  if(!users.length){ui.adminUserList.innerHTML='<div class="empty-state">Nenhuma conta encontrada.</div>';return;}
  ui.adminUserList.innerHTML=users.map(u=>{const protectedAdmin=!!u.is_admin,banned=!!u.is_banned,online=u.presence_updated_at&&Date.now()-Date.parse(u.presence_updated_at)<120000;return `<article class="admin-user-card ${banned?'banned':''} ${protectedAdmin?'protected':''}" data-admin-user="${escHtml(u.user_id)}"><div class="admin-user-main"><div><div class="admin-user-name">${escHtml(u.callsign||'Pilot')} ${protectedAdmin?'<span class="admin-role-badge">ADM</span>':''}${banned?'<span class="admin-ban-badge">BANIDO</span>':''}</div><small>${escHtml(u.email||'sem e-mail')} • ${escHtml(u.user_id)}</small></div><span class="admin-online-dot ${online?'on':''}">${online?'ONLINE':'OFFLINE'}</span></div><div class="admin-user-stats"><span>LV <b>${fmt(u.level||1)}</b></span><span>XP <b>${fmt(u.xp||0)}</b></span><span>CR <b>${fmt(u.credits||0)}</b></span><span>STL <b>${fmt(u.uridium||0)}</b></span><span>SAVE <b>${u.has_save?'SIM':'NÃO'}</b></span></div>${banned?`<div class="admin-ban-info">${u.banned_until?`Até ${adminDate(u.banned_until)}`:'Permanente'}${u.banned_reason?` • ${escHtml(u.banned_reason)}`:''}</div>`:''}<div class="admin-user-actions">${banned?`<button class="ghost-btn" data-admin-action="unban" ${protectedAdmin?'disabled':''}>REMOVER BAN</button>`:`<button class="danger-btn" data-admin-action="ban" ${protectedAdmin?'disabled':''}>BANIR</button>`}<button class="ghost-btn admin-reset-btn" data-admin-action="reset" ${protectedAdmin?'disabled':''}>ZERAR CONTA</button><button class="danger-btn admin-delete-btn" data-admin-action="delete" ${protectedAdmin?'disabled':''}>DELETAR</button></div></article>`;}).join('');
}
function renderAdminActions(){if(!ui.adminActionLog)return;const rows=adminRuntime.actions||[];if(!rows.length){ui.adminActionLog.innerHTML='<div class="empty-state">Nenhuma ação registrada.</div>';return;}ui.adminActionLog.innerHTML=rows.map(a=>`<div class="admin-log-row"><b>${escHtml(String(a.action||'').toUpperCase())}</b><span>${escHtml(a.target_callsign||a.target_email||a.target_user_id||'Conta')}</span><small>${adminDate(a.created_at)}</small></div>`).join('');}

function adminDuration(seconds){const s=Math.max(0,Math.round(Number(seconds)||0));if(s<60)return `${s}s`;const h=Math.floor(s/3600),m=Math.floor((s%3600)/60);if(h<1)return `${m}min`;return `${h}h ${String(m).padStart(2,'0')}min`;}
function adminRatioLabel(value){const n=Number(value)||0;return `${n.toFixed(1).replace('.',',')}%`;}

let adminHealthExpanded=false;
function toggleAdminHealth(){adminHealthExpanded=!adminHealthExpanded;if(ui.adminTelemetryHealth)ui.adminTelemetryHealth.classList.toggle('hidden',!adminHealthExpanded);if(ui.adminHealthToggle)ui.adminHealthToggle.textContent=adminHealthExpanded?'OCULTAR SAÚDE':'SAÚDE DO SERVIDOR';renderAdminTelemetry();}
function adminHealthGrade(sum={}){
  const cr=Number(sum.cr_sink_pct||0),stl=Number(sum.stl_sink_pct||0),p50=Number(sum.xp_hour_p50||0),p90=Number(sum.xp_hour_p90||0),spread=p50>0?p90/p50:1;
  let score=100;
  if(cr<15)score-=25;else if(cr<25)score-=12;else if(cr>150)score-=18;
  if(stl<8)score-=20;else if(stl<15)score-=10;else if(stl>140)score-=15;
  if(spread>3.5)score-=25;else if(spread>2.5)score-=12;
  if(Number(sum.tracked_players||0)<3)score=Math.min(score,85);
  const grade=score>=85?'SAUDÁVEL':score>=65?'ATENÇÃO':'CRÍTICO';
  return {score:Math.max(0,score),grade,className:score>=85?'ok':score>=65?'warn':'hot'};
}

function renderAdminTelemetry(){
  const data=adminRuntime.telemetry||{},sum=data.summary||{},sources=data.sources||[],milestones=data.milestones||[],players=data.players||[];
  const netCr=Number(sum.credits_earned||0)-Number(sum.credits_spent||0),netStl=Number(sum.stl_earned||0)-Number(sum.stl_spent||0);
  if(ui.adminTelemetrySummary)ui.adminTelemetrySummary.innerHTML=`<div><span>JOGADORES</span><b>${fmt(sum.tracked_players||0)}</b><small>${fmt(sum.active_24h||0)} ativos em 24h</small></div><div><span>TEMPO MONITORADO</span><b>${adminDuration(sum.play_seconds||0)}</b><small>nível médio ${String(sum.avg_level||1).replace('.',',')}</small></div><div><span>XP / H GLOBAL</span><b>${fmt(sum.xp_per_hour||0)}</b><small>mediana ${fmt(sum.xp_hour_p50||0)}</small></div><div><span>STL / H GLOBAL</span><b>${fmt(sum.stl_per_hour||0)}</b><small>mediana ${fmt(sum.stl_hour_p50||0)}</small></div><div><span>CR LÍQUIDO</span><b class="${netCr<0?'negative':''}">${netCr>=0?'+':''}${fmt(netCr)}</b><small>${adminRatioLabel(sum.cr_sink_pct)} volta para sinks</small></div><div><span>STL LÍQUIDO</span><b class="${netStl<0?'negative':''}">${netStl>=0?'+':''}${fmt(netStl)}</b><small>${adminRatioLabel(sum.stl_sink_pct)} volta para sinks</small></div>`;
  if(ui.adminTelemetryHealth){const crSink=Number(sum.cr_sink_pct||0),stlSink=Number(sum.stl_sink_pct||0),p50=Number(sum.xp_hour_p50||0),p90=Number(sum.xp_hour_p90||0),spread=p50>0?p90/p50:1,grade=adminHealthGrade(sum);const notes=[];notes.push({state:grade.className,title:`SAÚDE ${grade.score}/100`,text:`Status geral: ${grade.grade}. ${Number(sum.tracked_players||0)<3?'Amostra ainda pequena; use como tendência, não conclusão.':'Amostra suficiente para acompanhamento inicial.'}`});notes.push({state:crSink<25?'warn':crSink>125?'hot':'ok',title:'CR',text:crSink<25?'Pouco CR está saindo da economia. Observe inflação e adicione sinks.':crSink>125?'Jogadores estão gastando CR mais rápido do que geram.':'Entrada e saída de CR estão em faixa saudável inicial.'});notes.push({state:stlSink<15?'warn':stlSink>120?'hot':'ok',title:'STL',text:stlSink<15?'STL está acumulando. Vale observar preços e sinks de progressão.':stlSink>120?'Gasto de STL está acima da geração monitorada.':'Fluxo de STL está equilibrado para observação.'});notes.push({state:spread>2.5?'warn':'ok',title:'PROGRESSÃO',text:spread>2.5?`XP/h muito disperso: P90 está ${spread.toFixed(1)}x acima da mediana.`:`XP/h consistente: P90 ${fmt(p90)} • mediana ${fmt(p50)}.`});const lvl5=(milestones||[]).find(x=>Number(x.level)===5),lvl10=(milestones||[]).find(x=>Number(x.level)===10);if(lvl5||lvl10)notes.push({state:'ok',title:'RITMO',text:`LV5 ${lvl5?adminDuration(lvl5.median_seconds||lvl5.avg_seconds):'—'} • LV10 ${lvl10?adminDuration(lvl10.median_seconds||lvl10.avg_seconds):'—'} (mediana).`});ui.adminTelemetryHealth.innerHTML=notes.map(n=>`<div class="admin-health-chip ${n.state}"><b>${n.title}</b><span>${n.text}</span></div>`).join('');ui.adminTelemetryHealth.classList.toggle('hidden',!adminHealthExpanded);}if(ui.adminHealthToggle){const g=adminHealthGrade(sum);ui.adminHealthToggle.dataset.health=g.className;ui.adminHealthToggle.textContent=adminHealthExpanded?`OCULTAR • ${g.grade}`:`SAÚDE DO SERVIDOR • ${g.grade}`;}
  if(ui.adminTelemetrySources){const totalXp=sources.reduce((a,x)=>a+Number(x.xp||0),0)||1,totalStl=sources.reduce((a,x)=>a+Number(x.stl||0),0)||1;ui.adminTelemetrySources.innerHTML=sources.map(s=>`<div class="admin-source-row"><div><b>${escHtml(s.label||s.key||'Fonte')}</b><small>${Math.round(Number(s.xp||0)/totalXp*100)}% XP • ${Math.round(Number(s.stl||0)/totalStl*100)}% STL</small></div><span>CR <b>${fmt(s.cr||0)}</b></span><span>STL <b>${fmt(s.stl||0)}</b></span><span>XP <b>${fmt(s.xp||0)}</b></span></div>`).join('')||'<div class="empty-state">Sem dados de recompensa.</div>';}
  if(ui.adminTelemetryMilestones)ui.adminTelemetryMilestones.innerHTML=milestones.map(m=>`<div class="admin-milestone-row"><b>LV ${fmt(m.level||0)}</b><span>${adminDuration(m.median_seconds||m.avg_seconds||0)}</span><small>mediana • média ${adminDuration(m.avg_seconds||0)} • P90 ${adminDuration(m.p90_seconds||0)} • ${fmt(m.avg_kills||0)} kills</small></div>`).join('')||'<div class="empty-state">Os tempos aparecem conforme os jogadores atingirem novos níveis.</div>';
  if(ui.adminTelemetryPlayers){const p50=Number(sum.xp_hour_p50||0),p90=Number(sum.xp_hour_p90||0);ui.adminTelemetryPlayers.innerHTML=players.map(p=>{const xpH=Number(p.xp_per_hour||0),secs=Number(p.play_seconds||0);let pace='NORMAL',paceCls='ok';if(secs>=300&&p90>0&&xpH>=p90){pace='RÁPIDO';paceCls='fast';}else if(secs>=600&&p50>0&&xpH<p50*.5){pace='LENTO';paceCls='slow';}return `<article class="admin-telemetry-player"><div class="admin-telemetry-player-head"><div><b>${escHtml(p.callsign||'Pilot')} <em class="admin-pace ${paceCls}">${pace}</em></b><small>LV ${fmt(p.level||1)} • ${escHtml(p.selected_title||'Piloto Estelar')} • ${adminDuration(p.play_seconds||0)}</small></div><button class="ghost-btn" data-admin-telemetry-user="${escHtml(p.user_id||'')}">DETALHES</button></div><div class="admin-telemetry-player-stats"><span>KILLS <b>${fmt(p.kills||0)}</b></span><span>MISSÕES <b>${fmt(p.missions_completed||0)}</b></span><span>CR/H <b>${fmt(p.cr_per_hour||0)}</b></span><span>STL/H <b>${fmt(p.stl_per_hour||0)}</b></span><span>XP/H <b>${fmt(p.xp_per_hour||0)}</b></span><span>SALDO <b>${fmt(p.last_credits||0)} CR • ${fmt(p.last_stl||0)} STL</b></span></div></article>`;}).join('')||'<div class="empty-state">Nenhum jogador registrado ainda.</div>';}
}
function renderAdminTelemetryDetail(){if(!ui.adminTelemetryDetail)return;const detail=adminRuntime.telemetryDetail;if(!detail?.telemetry||!Object.keys(detail.telemetry).length){ui.adminTelemetryDetail.classList.add('hidden');ui.adminTelemetryDetail.innerHTML='';return;}const t=detail.telemetry,m=detail.milestones||[],sources=detail.sources||[];ui.adminTelemetryDetail.classList.remove('hidden');ui.adminTelemetryDetail.innerHTML=`<div class="admin-detail-head"><div><b>${escHtml(t.callsign||'Pilot')} • EVOLUÇÃO</b><small>${escHtml(t.selected_title||'Piloto Estelar')} • ${adminDuration(t.play_seconds||0)} monitorados</small></div><button class="ghost-btn" data-admin-detail-close>FECHAR</button></div><div class="admin-detail-grid"><span>LV <b>${fmt(t.last_level||1)}</b></span><span>KILLS <b>${fmt(t.kills||0)}</b></span><span>SESSÕES <b>${fmt(t.sessions||0)}</b></span><span>CR/H <b>${fmt(t.cr_per_hour||0)}</b></span><span>STL/H <b>${fmt(t.stl_per_hour||0)}</b></span><span>XP/H <b>${fmt(t.xp_per_hour||0)}</b></span><span>MISSÕES <b>${fmt(t.missions_completed||0)}</b></span><span>MORTES <b>${fmt(t.deaths||0)}</b></span><span>RECURSOS <b>${fmt(t.ore_units||0)}</b></span><span>SALTOS <b>${fmt(t.map_jumps||0)}</b></span><span>CR GASTO <b>${fmt(t.credits_spent||0)}</b></span><span>STL GASTO <b>${fmt(t.stl_spent||0)}</b></span></div><div class="admin-detail-source-grid">${sources.filter(x=>Number(x.cr||0)||Number(x.stl||0)||Number(x.xp||0)).map(x=>`<span><b>${escHtml(x.label||'Fonte')}</b>CR ${fmt(x.cr||0)} • STL ${fmt(x.stl||0)} • XP ${fmt(x.xp||0)}</span>`).join('')||'<span>Sem fontes registradas ainda.</span>'}</div><div class="admin-detail-milestones">${m.map(x=>`<span><b>LV ${fmt(x.level)}</b>${adminDuration(x.play_seconds)} • ${fmt(x.kills)} kills • ${fmt(x.stl_earned)} STL</span>`).join('')||'<span>Nenhum marco novo registrado ainda.</span>'}</div>`;}

async function openAdminTelemetryDetail(userId){try{adminRuntime.telemetryDetail=await adminPlayerTelemetry(userId);renderAdminTelemetryDetail();}catch(e){adminSetMessage(e.message,'err');}}
async function refreshAdminStatus(silent=true){
  try{const st=await getAdminStatus();adminRuntime.status=st;adminRuntime.enabled=!!st?.is_admin;ui.adminBtn?.classList.toggle('hidden',!adminRuntime.enabled);renderAdminStatus();return adminRuntime.enabled;}catch(err){adminRuntime.enabled=false;ui.adminBtn?.classList.add('hidden');if(!silent)showToast(err.message);return false;}
}
async function refreshAdminPanel(query=null){if(adminRuntime.busy)return;adminRuntime.busy=true;adminSetMessage('Atualizando painel...','busy');try{const q=query===null?String(ui.adminSearchInput?.value||''):String(query||'');const [status,users,actions,telemetry]=await Promise.all([getAdminStatus(),adminSearchAccounts(q),adminRecentActions(),adminTelemetryOverview()]);adminRuntime.status=status;adminRuntime.enabled=!!status?.is_admin;if(!adminRuntime.enabled)throw new Error('Acesso administrativo negado.');adminRuntime.users=users?.users||[];adminRuntime.actions=actions?.actions||[];adminRuntime.telemetry=telemetry||null;renderAdminStatus();renderAdminUsers();renderAdminActions();renderAdminTelemetry();renderAdminTelemetryDetail();adminSetMessage(`${adminRuntime.users.length} conta(s) exibida(s).`,'ok');}catch(err){adminSetMessage(err.message,'err');}finally{adminRuntime.busy=false;}}
async function openAdminPanel(){if(!await refreshAdminStatus(false)){showToast('Acesso administrativo negado');return;}closeNavigationModals(ui.adminModal);ui.adminModal?.classList.remove('hidden');await Promise.all([refreshAdminPanel(),loadAdminRuntimeMonitor(false)]);}
async function runAdminAction(action,user){if(!user||adminRuntime.busy)return;const name=user.callsign||user.email||'esta conta';let changed=false;try{adminRuntime.busy=true;if(action==='ban'){const minutes=Math.max(0,Number(ui.adminBanDuration?.value)||0),reason=String(ui.adminBanReason?.value||'').trim();if(!confirm(`Banir ${name}${minutes?` por ${minutes} minuto(s)`:' permanentemente'}?`))return;await adminBanAccount(user.user_id,{minutes,reason});changed=true;adminSetMessage(`${name} foi banido.`,'ok');}
else if(action==='unban'){if(!confirm(`Remover o ban de ${name}?`))return;await adminUnbanAccount(user.user_id);changed=true;adminSetMessage(`Ban removido de ${name}.`,'ok');}
else if(action==='reset'){if(!confirm(`ZERAR TODO O PROGRESSO de ${name}?\n\nLogin e callsign serão mantidos. Premium é preservado. O jogador será desconectado.`))return;await adminResetAccount(user.user_id);changed=true;adminSetMessage(`${name} foi zerado e desconectado.`,'ok');}
else if(action==='delete'){const typed=prompt(`EXCLUSÃO DEFINITIVA.\nDigite exatamente o callsign abaixo para confirmar:\n\n${name}`,'');if(String(typed||'').trim()!==String(name).trim())throw new Error('Exclusão cancelada: callsign não confere.');if(!confirm(`ÚLTIMA CONFIRMAÇÃO: deletar ${name}? A pessoa terá que criar uma conta nova.`))return;await adminDeleteAccount(user.user_id);changed=true;adminSetMessage(`${name} foi deletado definitivamente.`,'ok');}}catch(err){adminSetMessage(err.message,'err');showToast(err.message);}finally{adminRuntime.busy=false;}if(changed)await refreshAdminPanel();}

function renderAll(){updateBattleGroupBadge();buildAmmoButtons();renderShop();renderHangar();renderCargo();renderMapModal();renderPet();renderMissions();renderGalaxyGate();renderPilotProfile();ensureAuctionState();updatePassBadge();renderGalaxyEvent();updateUI();updateWarfrontBadge();refreshArenaBadge();}

function worldPoint(ev){const r=canvas.getBoundingClientRect(),sx=ev.clientX-r.left,sy=ev.clientY-r.top;return{x:sx-W/2+state.camera.x,y:sy-H/2+state.camera.y};}
function gameplayPointerAllowed(){return authenticated&&progress&&ui.loginModal.classList.contains('hidden')&&ui.shopModal.classList.contains('hidden')&&ui.hangarModal.classList.contains('hidden')&&ui.cargoModal.classList.contains('hidden')&&ui.petModal.classList.contains('hidden')&&ui.missionModal.classList.contains('hidden')&&ui.passModal.classList.contains('hidden')&&ui.gateModal.classList.contains('hidden')&&ui.pilotModal.classList.contains('hidden')&&ui.auctionModal.classList.contains('hidden')&&ui.arenaModal.classList.contains('hidden')&&ui.galaxyEventModal.classList.contains('hidden')&&ui.configModal.classList.contains('hidden')&&ui.mapModal.classList.contains('hidden')&&ui.battleGroupModal.classList.contains('hidden')&&ui.factionModal.classList.contains('hidden');}
function setPointerDestination(ev){const p=worldPoint(ev);player.tx=Math.max(40,Math.min(state.currentMap.world.w-40,p.x));player.ty=Math.max(40,Math.min(state.currentMap.world.h-40,p.y));}
function pointerAction(ev){
  if(!gameplayPointerAllowed()||ev.button!==0)return;
  const p=worldPoint(ev);
  const found=state.enemies.find(e=>e.hp>0&&Math.hypot(e.x-p.x,e.y-p.y)<=e.size*1.8+18);
  if(found){const same=state.target?.id===found.id,quick=same&&Date.now()-state.lastTargetTapAt<900;selectCombatTarget(found);state.lastTargetTapId=found.id;state.lastTargetTapAt=Date.now();if(autoLaserEnabled()||(combatPrefs.tapAttack&&quick)){player.laserFiring=true;if(quick)setCombatAlert('LOCK CONFIRMADO • LASER ATIVO','combat',1.2);}return;}
  const hostile=[...onlineWorld.players.values()].filter(rp=>onlinePlayerEnemy(rp)&&rp.hp>0).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
  if(hostile&&Math.hypot(hostile.x-p.x,hostile.y-p.y)<=Math.max(34,hostile.size*1.7)){
    const same=state.target?.id===hostile.id,quick=same&&Date.now()-state.lastTargetTapAt<900;selectCombatTarget(hostile);state.lastTargetTapId=hostile.id;state.lastTargetTapAt=Date.now();
    if(autoLaserEnabled()||(combatPrefs.tapAttack&&quick))player.laserFiring=true;return;
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
  ui.saleConfirmModal,ui.adminModal,ui.configModal,ui.galaxyEventModal,ui.premiumModal,ui.warfrontModal,ui.clanModal,ui.battleGroupModal,ui.passModal,ui.arenaModal,ui.auctionModal,ui.pilotModal,ui.gateModal,ui.missionModal,ui.shopModal,ui.hangarModal,ui.petModal,ui.cargoModal,ui.mapModal
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

function closeCommandMenus(except=null){document.querySelectorAll('.menu-group.open').forEach(g=>{if(g!==except)g.classList.remove('open');});}
document.querySelectorAll('[data-menu-toggle]').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();const group=btn.closest('.menu-group'),opening=!group.classList.contains('open');closeCommandMenus(group);group.classList.toggle('open',opening);}));
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.menu-group'))closeCommandMenus();});
document.querySelectorAll('.menu-dropdown .menu-item').forEach(btn=>btn.addEventListener('click',()=>closeCommandMenus()));

if(ui.mapBtn)ui.mapBtn.onclick=()=>openMapModal();
if(ui.closeMap)ui.closeMap.onclick=()=>ui.mapModal.classList.add('hidden');
if(ui.missionBtn)ui.missionBtn.onclick=()=>openMissions();if(ui.activeMissionOpen)ui.activeMissionOpen.onclick=()=>currentJourneyStep()?openJourneyPanel():openMissions();
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
if(ui.clanBtn)ui.clanBtn.onclick=()=>openClan();if(ui.battleGroupBtn)ui.battleGroupBtn.onclick=()=>openBattleGroup();if(ui.closeBattleGroup)ui.closeBattleGroup.onclick=()=>ui.battleGroupModal?.classList.add('hidden');if(ui.battleGroupRefresh)ui.battleGroupRefresh.onclick=()=>refreshBattleGroup(true);if(ui.battleGroupContent){ui.battleGroupContent.onclick=e=>{const create=e.target.closest('[data-group-create]'),inviteUser=e.target.closest('[data-group-invite-user]'),accept=e.target.closest('[data-group-accept]'),decline=e.target.closest('[data-group-decline]'),leave=e.target.closest('[data-group-leave]'),kick=e.target.closest('[data-group-kick]'),rally=e.target.closest('[data-group-rally]');if(create)battleGroupAction('create');else if(inviteUser)battleGroupAction('inviteUser',{userId:inviteUser.dataset.groupInviteUser,callsign:inviteUser.dataset.groupInviteCallsign});else if(accept)battleGroupAction('accept',accept.dataset.groupAccept);else if(decline)battleGroupAction('decline',decline.dataset.groupDecline);else if(leave)battleGroupAction('leave');else if(kick)battleGroupAction('kick',kick.dataset.groupKick);else if(rally)battleGroupAction('rally');};ui.battleGroupContent.oninput=e=>{if(e.target?.id==='battleGroupSearchInput')scheduleBattleGroupSearch(e.target.value);};}
if(ui.warfrontBtn)ui.warfrontBtn.onclick=()=>openWarfront();
if(ui.galaxyEventBtn)ui.galaxyEventBtn.onclick=()=>openGalaxyEvent();
if(ui.galaxyEventHud)ui.galaxyEventHud.onclick=()=>openGalaxyEvent();
if(ui.galaxyEventToggle){ui.galaxyEventToggle.onclick=e=>{e.preventDefault();e.stopPropagation();toggleGalaxyEventUi();};ui.galaxyEventToggle.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();toggleGalaxyEventUi();}};}
if(ui.targetLockToggle)ui.targetLockToggle.onclick=e=>{e.preventDefault();e.stopPropagation();toggleTargetLockUi();};
if(ui.closeGalaxyEvent)ui.closeGalaxyEvent.onclick=()=>ui.galaxyEventModal.classList.add('hidden');
if(ui.galaxyEventContent)ui.galaxyEventContent.onclick=e=>{const force=e.target.closest('[data-force-event]');if(force){forceGalaxyEvent(force.dataset.forceEvent);return;}if(e.target.closest('[data-event-map]')){ui.galaxyEventModal.classList.add('hidden');openMapModal();return;}if(e.target.closest('[data-event-warfront]')){ui.galaxyEventModal.classList.add('hidden');openWarfront();return;}};
if(ui.closeWarfront)ui.closeWarfront.onclick=()=>ui.warfrontModal.classList.add('hidden');
if(ui.warfrontRefresh)ui.warfrontRefresh.onclick=()=>refreshWarfrontState(true);
if(ui.warfrontContent)ui.warfrontContent.onclick=e=>{const nav=e.target.closest('[data-warfront-nav]');if(nav){const node=(sectorControlState()?.nodes||[]).find(n=>String(n.id)===String(nav.dataset.warfrontNav));if(node&&state.currentMap?.battle){player.tx=Math.max(35,Math.min(state.currentMap.world.w-35,Number(node.x)||player.x));player.ty=Math.max(35,Math.min(state.currentMap.world.h-35,Number(node.y)||player.y));ui.warfrontModal.classList.add('hidden');showToast(`ROTA WARFRONT • PONTO ${node.id}`,'system');}return;}const craft=e.target.closest('[data-blueprint-craft]');if(craft){craftBlueprint(craft.dataset.blueprintCraft);return;}if(e.target.closest('[data-mastery-upgrade]')){upgradeAbilityMastery();return;}if(e.target.closest('[data-worldboss-engage]')){spawnWorldBossEncounter();ui.warfrontModal.classList.add('hidden');return;}if(e.target.closest('[data-worldboss-claim]')){claimWorldBossNow();return;}if(e.target.closest('[data-war-declare]')){declareWarNow();return;}};
if(ui.warfrontContent)ui.warfrontContent.onchange=e=>{if(e.target?.id==='warTargetClan'){const btn=ui.warfrontContent.querySelector('[data-war-declare]');if(btn)btn.disabled=!String(e.target.value||'').trim();}};
if(ui.closeClan)ui.closeClan.onclick=()=>ui.clanModal.classList.add('hidden');
if(ui.clanRefresh)ui.clanRefresh.onclick=()=>refreshClanState(true);
if(ui.clanContent)ui.clanContent.onclick=e=>{const tab=e.target.closest('[data-clan-tab]');if(tab){clanViewTab=tab.dataset.clanTab||'overview';renderClan();return;}const join=e.target.closest('[data-clan-join]');if(join){joinClanNow(join.dataset.clanJoin);return;}const groupInvite=e.target.closest('[data-clan-group-invite]');if(groupInvite){const callsign=groupInvite.dataset.clanGroupInvite||'';inviteBattleGroupOnline(callsign).then(async()=>{showToast(`Convite de grupo enviado para ${callsign}`);await refreshBattleGroup(true);renderClan();}).catch(err=>showToast(err.message));return;}if(e.target.closest('#clanCreateSubmit'))createClanNow();else if(e.target.closest('#clanTransferBtn'))transferClanNow();else if(e.target.closest('#clanLeaveBtn'))leaveClanNow();};
if(ui.clanContent)ui.clanContent.addEventListener('input',e=>{if(e.target.id==='clanTransferAmount'){const gross=Math.max(0,Math.trunc(Number(e.target.value)||0)),net=Math.floor(gross*.95),fee=gross-net,el=$('#clanTransferPreview');if(el)el.innerHTML=`Do cofre saem <b>${fmt(gross)} CR</b> → jogador recebe <b class="clan-net">${fmt(net)} CR</b> • juros <b class="clan-burn">${fmt(fee)} CR</b>.`;}});
if(ui.arenaRefresh)ui.arenaRefresh.onclick=()=>refreshArena(true);
if(ui.arenaRewardClaim)ui.arenaRewardClaim.onclick=()=>claimArenaRewardNow();
if(ui.arenaBattleSkip)ui.arenaBattleSkip.onclick=()=>{arenaRuntime.skipAnimation=true;ui.arenaBattleSkip.disabled=true;ui.arenaBattleSkip.textContent='ENCERRANDO...';};
if(ui.closeGate)ui.closeGate.onclick=()=>ui.gateModal.classList.add('hidden');
if(ui.gateJumpBtn)ui.gateJumpBtn.onclick=()=>enterAlphaGate();
if(ui.gateProtocolTabs)ui.gateProtocolTabs.onclick=e=>{const b=e.target.closest('[data-gate-protocol]');if(!b||isGalaxyGateMap())return;const key=b.dataset.gateProtocol;if(!gateUnlocked(key)){showToast(`${GALAXY_GATE_DEFS[key].label} está bloqueado`);return;}progress.galaxyGate.selected=key;saveGame();renderGalaxyGate();};
if(ui.useLifeBonus)ui.useLifeBonus.onclick=()=>useGalaxyLifeBonus();
if(ui.buyGateLife)ui.buyGateLife.onclick=()=>buyGalaxyLife();
if(ui.petBtn)ui.petBtn.onclick=()=>openHangar('pet');
if(ui.closePet)ui.closePet.onclick=()=>ui.petModal.classList.add('hidden');
if(ui.shopBtn)ui.shopBtn.onclick=()=>openShop();
if(ui.premiumBtn)ui.premiumBtn.onclick=()=>openPremiumShop();
if(ui.closePremium)ui.closePremium.onclick=()=>ui.premiumModal.classList.add('hidden');
if(ui.saleConfirmCancel)ui.saleConfirmCancel.onclick=()=>closeSaleConfirm();
if(ui.saleConfirmAccept)ui.saleConfirmAccept.onclick=()=>confirmSaleNow();
if(ui.hangarBtn)ui.hangarBtn.onclick=()=>openHangar('equipment');
if(ui.shipMenuBtn)ui.shipMenuBtn.onclick=()=>openHangar('ships');
if(ui.closeHangar)ui.closeHangar.onclick=()=>ui.hangarModal.classList.add('hidden');
if(ui.adminBtn)ui.adminBtn.onclick=()=>openAdminPanel();
if(ui.closeAdmin)ui.closeAdmin.onclick=()=>ui.adminModal.classList.add('hidden');
if(ui.adminSearchBtn)ui.adminSearchBtn.onclick=()=>refreshAdminPanel();
if(ui.adminRefreshBtn)ui.adminRefreshBtn.onclick=()=>refreshAdminPanel();
if(ui.adminRuntimeMonitorRefresh)ui.adminRuntimeMonitorRefresh.onclick=()=>loadAdminRuntimeMonitor(true);
if(ui.adminRuntimeTabs)ui.adminRuntimeTabs.onclick=e=>{const b=e.target.closest('[data-admin-runtime-tab]');if(b)setAdminRuntimeTab(b.dataset.adminRuntimeTab);};
if(ui.adminRuntimeInterfaceReload)ui.adminRuntimeInterfaceReload.onclick=()=>loadAdminInterfaceEditor(true);
if(ui.adminRuntimeInterfaceGrid)ui.adminRuntimeInterfaceGrid.onclick=e=>{const btn=e.target.closest('[data-interface-save]');if(!btn)return;const card=btn.closest('[data-interface-module]');saveAdminInterfaceModule(btn.dataset.interfaceSave,card,btn);};
if(ui.adminRuntimeNpcReload)ui.adminRuntimeNpcReload.onclick=()=>loadAdminNpcEditor(true);
if(ui.adminRuntimeNpcGrid)ui.adminRuntimeNpcGrid.onclick=e=>{const save=e.target.closest('[data-npc-save]');if(save){const card=save.closest('[data-admin-npc]');saveAdminNpc(save.dataset.npcSave,card,save);return;}const spawn=e.target.closest('[data-npc-spawn-save]');if(spawn){const row=spawn.closest('[data-npc-spawn-map]');saveAdminNpcSpawn(spawn.dataset.npcSpawnSave,row,spawn);}};
if(ui.adminRuntimeWorldReload)ui.adminRuntimeWorldReload.onclick=()=>loadAdminWorldEditor(true);
if(ui.adminRuntimeWorldTabs)ui.adminRuntimeWorldTabs.onclick=e=>{const b=e.target.closest('[data-admin-world-view]');if(b)adminWorldSetView(b.dataset.adminWorldView);};
if(ui.adminRuntimeWorldGrid)ui.adminRuntimeWorldGrid.onclick=e=>{const map=e.target.closest('[data-world-map-save]');if(map){saveAdminWorldMap(map.dataset.worldMapSave,map.closest('[data-world-map]'),map);return;}const resource=e.target.closest('[data-world-resource-save]');if(resource){saveAdminWorldResource(resource.dataset.worldResourceSave,resource.closest('[data-world-resource]'),resource);return;}const sector=e.target.closest('[data-world-sector-save]');if(sector){saveAdminWorldSector(sector.dataset.worldSectorSave,sector.closest('[data-world-sector]'),sector);return;}const portal=e.target.closest('[data-world-portal-save]');if(portal){saveAdminWorldPortal(portal.dataset.worldPortalSave,portal.closest('[data-world-portal]'),portal);return;}const pool=e.target.closest('[data-world-pool-save]');if(pool){saveAdminWorldPool(pool.dataset.worldPoolSave,pool.closest('[data-world-pool-resource]'),pool);}};
if(ui.adminRuntimeSystemsReload)ui.adminRuntimeSystemsReload.onclick=()=>loadAdminSystemsEditor(true);
if(ui.adminRuntimeSystemsTabs)ui.adminRuntimeSystemsTabs.onclick=e=>{const b=e.target.closest('[data-admin-systems-view]');if(b)adminSystemsSetView(b.dataset.adminSystemsView);};
if(ui.adminRuntimeSystemsGrid)ui.adminRuntimeSystemsGrid.onclick=e=>{const mission=e.target.closest('[data-system-mission-save]');if(mission){saveAdminSystemMission(mission.dataset.systemMissionSave,mission.closest('[data-system-mission]'),mission);return;}const economy=e.target.closest('[data-system-economy-save]');if(economy){saveAdminSystemEconomy(economy.dataset.systemEconomySave,economy.closest('[data-system-economy]'),economy);return;}const crafting=e.target.closest('[data-system-crafting-save]');if(crafting){saveAdminSystemCrafting(crafting.dataset.systemCraftingSave,crafting.closest('[data-system-crafting]'),crafting);}};
if(ui.adminRuntimeEventsReload)ui.adminRuntimeEventsReload.onclick=()=>loadAdminEventsEditor(true);
if(ui.adminRuntimeEventsGrid)ui.adminRuntimeEventsGrid.onclick=e=>{const save=e.target.closest('[data-event-save]');if(save)saveAdminEventSchedule(save.dataset.eventSave,save.closest('[data-admin-event]'),save);};
if(ui.adminSearchInput)ui.adminSearchInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();refreshAdminPanel();}});
if(ui.adminUserList)ui.adminUserList.onclick=e=>{const btn=e.target.closest('[data-admin-action]'),card=e.target.closest('[data-admin-user]');if(!btn||!card)return;const user=adminRuntime.users.find(u=>String(u.user_id)===String(card.dataset.adminUser));if(user)runAdminAction(btn.dataset.adminAction,user);};
if(ui.adminHealthToggle)ui.adminHealthToggle.onclick=toggleAdminHealth;
if(ui.adminTelemetryPlayers)ui.adminTelemetryPlayers.onclick=e=>{const btn=e.target.closest('[data-admin-telemetry-user]');if(btn)openAdminTelemetryDetail(btn.dataset.adminTelemetryUser);};
if(ui.adminTelemetryDetail)ui.adminTelemetryDetail.onclick=e=>{if(e.target.closest('[data-admin-detail-close]')){adminRuntime.telemetryDetail=null;renderAdminTelemetryDetail();}};
if(ui.configBtn)ui.configBtn.onclick=()=>openSettings();
if(ui.closeConfig)ui.closeConfig.onclick=()=>ui.configModal.classList.add('hidden');
if(ui.baseTradePrompt)ui.baseTradePrompt.onclick=()=>{if(isAtTrader())openCargo();};
if(ui.petGearQuickSelect)ui.petGearQuickSelect.onchange=e=>setPetGear(e.target.value);
if(ui.shipAbilityBtn)ui.shipAbilityBtn.onclick=()=>useShipAbility();if(ui.petKamiAbilityBtn)ui.petKamiAbilityBtn.onclick=()=>triggerPetKamikaze();
if(ui.chatToggle)ui.chatToggle.onclick=e=>{e.stopPropagation();toggleChatUi();};
if(ui.chatTabs)ui.chatTabs.onclick=e=>{const b=e.target.closest('[data-chat-channel]');if(b)switchChatChannel(b.dataset.chatChannel);};
if(ui.chatPrivateOpen)ui.chatPrivateOpen.onclick=()=>openPrivateChatTarget();
if(ui.chatPrivateCallsign)ui.chatPrivateCallsign.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();openPrivateChatTarget();ui.chatInput?.focus();}});
if(ui.chatForm)ui.chatForm.onsubmit=e=>{e.preventDefault();sendChatNow();};
if(ui.qualityButtons)ui.qualityButtons.addEventListener('click',e=>{const b=e.target.closest('[data-quality]');if(b)applyQualityMode(b.dataset.quality);});
if(ui.hudSettingsGrid)ui.hudSettingsGrid.addEventListener('change',e=>{const input=e.target.closest('[data-hud-key]');if(input)setHudVisibility(input.dataset.hudKey,input.checked);});
if(ui.settingsTabs)ui.settingsTabs.addEventListener('click',e=>{const b=e.target.closest('[data-settings-tab]');if(b)switchSettingsTab(b.dataset.settingsTab);});
if(ui.audioEnabledToggle)ui.audioEnabledToggle.onchange=()=>setAudioEnabled(ui.audioEnabledToggle.checked);
if(ui.audioVolumeRange)ui.audioVolumeRange.oninput=()=>setAudioVolume(Number(ui.audioVolumeRange.value)/100);
if(ui.autoTargetToggle)ui.autoTargetToggle.onchange=()=>{if(!premiumAutoCombatAccess()){ui.autoTargetToggle.checked=false;showToast('AUTO-COMBATE é exclusivo do PREMIUM ou PASSE MENSAL');openPremiumShop();return;}combatPrefs.autoTarget=ui.autoTargetToggle.checked;saveCombatPrefs();};
if(ui.tapAttackToggle)ui.tapAttackToggle.onchange=()=>{combatPrefs.tapAttack=ui.tapAttackToggle.checked;saveCombatPrefs();};
if(ui.combatAlertsToggle)ui.combatAlertsToggle.onchange=()=>{combatPrefs.alerts=ui.combatAlertsToggle.checked;saveCombatPrefs();};
addEventListener('pagehide',()=>{if(progress&&(movementPositionRuntime.loadedFromCheckpoint||movementPositionRuntime.hasMovedSinceLoad)){commitRuntimePosition('pagehide');forceAuthoritativeLocationCheckpoint(true);flushCloudSave(true);}if(authenticated)removePlayerPresenceOnline().catch(()=>{});clearOnlinePlayers();});
addEventListener('beforeunload',()=>{if(progress&&(movementPositionRuntime.loadedFromCheckpoint||movementPositionRuntime.hasMovedSinceLoad)){try{commitRuntimePosition('beforeunload');}catch{}try{syncAuthoritativePlayerLocation(true,{keepalive:true});}catch{}}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&progress){saveGame();forceAuthoritativeLocationCheckpoint(true);}});
if(ui.rankingRefreshBtn)ui.rankingRefreshBtn.onclick=()=>refreshRankings(true);
if(ui.accountSaveName)ui.accountSaveName.onclick=()=>saveAccountName();
if(ui.accountSavePassword)ui.accountSavePassword.onclick=()=>saveAccountPassword();
if(ui.weaponBarToggle)ui.weaponBarToggle.onclick=()=>toggleAmmoUi();
if(ui.topbarDockToggle)ui.topbarDockToggle.onclick=()=>toggleTopbarDock();
if(ui.activeMissionToggle)ui.activeMissionToggle.onclick=e=>{e.stopPropagation();toggleMissionUi();};
if(ui.petFloatToggle)ui.petFloatToggle.onclick=e=>{e.stopPropagation();togglePetUi();};
if(ui.playerPanelToggle)ui.playerPanelToggle.onclick=e=>{e.stopPropagation();togglePlayerUi();};
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


function forceLogoutBecauseSessionMoved(message='Sua conta foi acessada em outro dispositivo.',userId=null,reason='session'){
  sharedUniverse.close();sharedUniverseRuntime.ready=false;sharedUniverseRuntime.event=null;
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
  premiumRuntime.state=null;premiumRuntime.lastAt=0;liveOpsRuntime.state=null;liveOpsRuntime.catalog.clear();liveOpsRuntime.lastAt=0;
  updateClanBadge();updatePremiumBadge();chatRuntime.messages=[];chatRuntime.lastSignature='';renderChatTabs();renderChatMessages();
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
  ui.authMessage.textContent=reason==='ban'?message:message+' O login mais recente permaneceu conectado.';
}
window.addEventListener('stellar-session-replaced',e=>{
  forceLogoutBecauseSessionMoved(e?.detail?.message||'Sua conta foi acessada em outro dispositivo.',e?.detail?.userId||null,e?.detail?.code==='ACCOUNT_BANNED'?'ban':'session');
});

function showAuthMode(mode){
  const login=mode==='login',register=mode==='register',recovery=mode==='recovery';
  ui.loginForm?.classList.toggle('hidden',!login);ui.registerForm?.classList.toggle('hidden',!register);ui.recoveryForm?.classList.toggle('hidden',!recovery);
  ui.loginTabBtn?.classList.toggle('active',login);ui.registerTabBtn?.classList.toggle('active',register);
  if(ui.loginTabBtn)ui.loginTabBtn.disabled=recovery;if(ui.registerTabBtn)ui.registerTabBtn.disabled=recovery;
  if(ui.authMessage)ui.authMessage.textContent='';
}
ui.loginTabBtn.onclick=()=>showAuthMode('login');ui.registerTabBtn.onclick=()=>showAuthMode('register');
ui.loginForm.onsubmit=async e=>{e.preventDefault();ui.authMessage.textContent='Entrando...';try{await signIn({email:ui.loginEmail.value,password:ui.loginPassword.value});await afterAuth();}catch(err){ui.authMessage.textContent=err.message;}};
ui.registerForm.onsubmit=async e=>{e.preventDefault();ui.authMessage.textContent='Criando conta...';try{const result=await signUp({callsign:ui.registerCallsign.value,email:ui.registerEmail.value,password:ui.registerPassword.value});if(result.requires_confirmation){showAuthMode('login');ui.loginEmail.value=ui.registerEmail.value;ui.authMessage.textContent='Conta criada. Confirme o e-mail e depois entre.';return;}await afterAuth();}catch(err){ui.authMessage.textContent=err.message;}};
if(ui.forgotPasswordBtn)ui.forgotPasswordBtn.onclick=async()=>{const email=String(ui.loginEmail?.value||'').trim();ui.authMessage.textContent='Enviando recuperação...';try{await requestPasswordReset(email);ui.authMessage.textContent='E-mail de recuperação enviado. Abra o link recebido para criar uma nova senha.';}catch(err){ui.authMessage.textContent=err.message;}};
if(ui.recoveryForm)ui.recoveryForm.onsubmit=async e=>{e.preventDefault();const a=ui.recoveryPassword?.value||'',b=ui.recoveryPasswordConfirm?.value||'';if(a!==b){ui.authMessage.textContent='As senhas não conferem.';return;}ui.authMessage.textContent='Atualizando senha...';try{await updatePassword(a);signOutLocal();showAuthMode('login');ui.loginPassword.value='';ui.authMessage.textContent='Senha atualizada. Entre com a nova senha.';}catch(err){ui.authMessage.textContent=err.message;}};
ui.logoutBtn.onclick=async()=>{await flushTelemetry(true).catch(()=>{});telemetryRuntime.sessionOpen=false;sharedUniverse.close();sharedUniverseRuntime.ready=false;sharedUniverseRuntime.event=null;if(movementPositionRuntime.loadedFromCheckpoint||movementPositionRuntime.hasMovedSinceLoad)commitRuntimePosition('logout');await flushCloudSave(true);await removePlayerPresenceOnline().catch(()=>{});clearOnlinePlayers();await endGameSession().catch(()=>signOutLocal());authenticated=false;progress=null;npcRuntimeConfig.version=0;npcRuntimeConfig.updatedAt=null;npcRuntimeConfig.source='fallback';worldRuntimeConfig.version=0;worldRuntimeConfig.updatedAt=null;worldRuntimeConfig.source='fallback';runtimeConfigRuntime.version=0;runtimeConfigRuntime.isAdmin=false;runtimeConfigRuntime.source='fallback';runtimeConfigRuntime.modules=new Map(RUNTIME_FALLBACK_MODULES.map(x=>[x.module_key,x]));runtimeConfigRuntime.flags=new Map(Object.entries(RUNTIME_FALLBACK_FLAGS).map(([flag_key,enabled])=>[flag_key,{flag_key,enabled,config:{}}]));applyRuntimeMenuConfig();clanRuntime.state=null;clanRuntime.clans=[];clanRuntime.lastAt=0;warfrontRuntime.state=null;warfrontRuntime.clans=[];warfrontRuntime.lastAt=0;warfrontRuntime.pendingBossDamage=0;premiumRuntime.state=null;premiumRuntime.lastAt=0;updateClanBadge();updatePremiumBadge();chatRuntime.messages=[];chatRuntime.lastSignature='';renderChatTabs();renderChatMessages();state.target=null;player.laserFiring=false;for(const modal of dismissibleModals())modal.classList.add('hidden');ui.factionModal.classList.add('hidden');ui.portalPrompt?.classList.add('hidden');ui.baseTradePrompt?.classList.add('hidden');ui.petFloatPanel?.classList.add('hidden');ui.loginModal.classList.remove('hidden');if(ui.userLabel)ui.userLabel.textContent='—';if(ui.rankChip)ui.rankChip.textContent='Piloto Básico';if(ui.loginPassword)ui.loginPassword.value='';setSync('LOCAL','');showAuthMode('login');};

function startLoadedGame(){
  if(!telemetryRuntime.sessionOpen)telemetryStartSession();
  state.lastPlayerDamageAt=nowSec();
  normalizeGalaxyGateState();normalizeCombatAbilities();
  const loadedGateKey=gateKeyForMap(progress.mapId);if(loadedGateKey&&!progress.galaxyGate[loadedGateKey]?.run?.active){progress.mapId='x1';progress.territoryFaction=progress.profile.faction;}else if(loadedGateKey)progress.galaxyGate.selected=loadedGateKey;
  const savedLocation=savedLocationForCurrentMap(),savedX=savedLocation?.x??null,savedY=savedLocation?.y??null;
  state.currentMap=MAPS[progress.mapId]||MAPS.x1;state.radarRange=mapRadarRange();
  player.hp=Number(progress.hp)||1;player.shield=Math.max(0,Number(progress.shield)||0);
  // Stats are bootstrap-critical. One subsystem must never prevent map/NPC/user initialization.
  try{computeStats(true);}catch(e){
    console.error('[bootstrap] computeStats failed; using safe ship fallback',e);
    const ship=SHIPS[progress.activeShipId]||SHIPS.phoenix;
    player.maxHp=Math.max(1,Number(ship?.hp)||1);player.maxShield=Math.max(0,Number(progress.shield)||0);player.speed=Math.max(1,Number(ship?.speed)||320);
    player.hp=Math.max(1,Math.min(player.maxHp,Number(progress.hp)||player.maxHp));player.shield=Math.max(0,Math.min(player.maxShield,Number(progress.shield)||0));
    progress.hp=player.hp;progress.shield=player.shield;
  }
  player.hp=Math.min(player.maxHp,Number(progress.hp??player.maxHp));player.shield=Math.min(player.maxShield,Number(progress.shield??player.maxShield));
  positionCheckpointRuntime.lastAt=0;positionCheckpointRuntime.lastX=null;positionCheckpointRuntime.lastY=null;positionCheckpointRuntime.lastKey=null;
  authoritativeLocationRuntime.lastAt=0;authoritativeLocationRuntime.lastX=null;authoritativeLocationRuntime.lastY=null;authoritativeLocationRuntime.lastKey=null;authoritativeLocationRuntime.lastSavedAt=0;authoritativeLocationRuntime.pending=false;
  movementPositionRuntime.wasMoving=false;movementPositionRuntime.lastCommitAt=0;movementPositionRuntime.lastX=null;movementPositionRuntime.lastY=null;movementPositionRuntime.loadedFromCheckpoint=!!savedLocation;movementPositionRuntime.hasMovedSinceLoad=false;movementPositionRuntime.spawnX=savedX;movementPositionRuntime.spawnY=savedY;
  if(isGalaxyGateMap()){
    const gd=galaxyGateDef();player.x=savedX??MAPS[gd.mapId].world.w/2;player.y=savedY??MAPS[gd.mapId].world.h/2;player.tx=player.x;player.ty=player.y;petRuntime.x=player.x+82;petRuntime.y=player.y+64;petRuntime.tx=petRuntime.x;petRuntime.ty=petRuntime.y;petRuntime.roamX=null;petRuntime.roamY=null;petRuntime.nextRoamAt=0;state.camera.x=player.x;state.camera.y=player.y;state.target=null;state.loot=[];state.fx=[];state.rocketFx=[];state.ores=[];state.landmarks=[];state.enemyRespawns=[];state.oreRespawns=[];restoreAlphaGateEnemies();const a=alphaGate(),def=galaxyGateDef().rounds[a.run.round-1],alive=alphaRemainingCount(),now=Date.now();if(a.run.waveIndex<def.waves.length&&!a.run.nextWaveAt){a.run.nextWaveAt=now+GALAXY_ALPHA_WAVE_INTERVAL_MS;}else if(a.run.waveIndex>=def.waves.length&&alive===0&&a.run.round<galaxyGateDef().rounds.length&&!a.run.nextRoundAt){a.run.nextRoundAt=now+GALAXY_ALPHA_ROUND_INTERVAL_MS;}renderAll();preloadActiveGameplayAssets();return;
  }
  const spawnBase=currentBasePoint();player.x=savedX??(progress.mapId==='x1'?spawnBase.x:400);player.y=savedY??(progress.mapId==='x1'?spawnBase.y:state.currentMap.world.h/2);player.tx=player.x;player.ty=player.y;petRuntime.x=player.x+82;petRuntime.y=player.y+64;petRuntime.tx=petRuntime.x;petRuntime.ty=petRuntime.y;petRuntime.roamX=null;petRuntime.roamY=null;petRuntime.nextRoamAt=0;state.camera.x=player.x;state.camera.y=player.y;state.target=null;state.loot=[];state.fx=[];state.rocketFx=[];createLandmarks();state.ores=[];state.enemies=[];state.enemyRespawns=[];state.oreRespawns=[];galaxyEventRuntime.mapKey=null;sharedUniverseRuntime.event=null;
  try{joinSharedUniverse();}catch(e){console.error('[bootstrap] shared universe join failed',e);}
  try{renderAll();}catch(e){console.error('[bootstrap] initial render failed',e);try{updateUI();}catch{}}
  preloadActiveGameplayAssets();
  if(progress.repairRequired){movePlayerToHomeBase();player.hp=1;player.shield=0;progress.hp=1;progress.shield=0;saveGame();if(premiumActive())resolveDeathRepair({allowAuto:true});else openRepairModal();}
}

async function afterAuth(){
  const generation=++gameBootstrapRuntime.generation;
  gameBootstrapRuntime.loading=true;gameBootstrapRuntime.ready=false;gameBootstrapRuntime.lastError=null;
  authenticated=true;ui.loginModal.classList.add('hidden');ui.userLabel.textContent=getUser()?.callsign||getUser()?.email?.split('@')[0]||'Pilot';loadActivityLog();refreshAdminStatus(true);refreshClanState(true).then(()=>refreshRankings(true)).catch(()=>{});setSync('SINCRONIZANDO','busy');
  try{
    const accountId=String(getUser()?.id||'');
    let local=readLocalGameState();
    if(local?.accountOwnerId&&String(local.accountOwnerId)!==accountId){
      console.warn('Local save quarantined: owner mismatch');
      try{localStorage.removeItem(saveKey());}catch{}
      local=null;
    }
    const remote=await loadCloudSave();
    if(remote?.state?.accountOwnerId&&String(remote.state.accountOwnerId)!==accountId){
      throw Object.assign(new Error('Proteção de conta: o save online está vinculado a outro usuário.'),{code:'SAVE_OWNER_MISMATCH'});
    }
    const localStamp=Number(local?.clientSavedAt)||0;
    const remoteStamp=Number(remote?.state?.clientSavedAt)||Date.parse(remote?.updated_at||'')||0;
    const localStampSane=localStamp>0&&localStamp<=Date.now()+300000;
    if(local&&localStampSane&&localStamp>remoteStamp+250){
      progress=local;hydrateProgress();cloudDirty=true;setSync('LOCAL MAIS NOVO','busy');
      setTimeout(()=>flushCloudSave(true),0);
    }else if(remote.state){
      progress=remote.state;hydrateProgress();setSync('ONLINE','ok');
    }else if(local){
      progress=local;hydrateProgress();setSync('LOCAL','busy');cloudDirty=true;setTimeout(()=>flushCloudSave(true),0);
    }else{
      progress=null;setSync('ONLINE','ok');
    }
  }catch(err){
    console.warn(err);gameBootstrapRuntime.lastError=err;
    if(err?.code==='SAVE_OWNER_MISMATCH'){authenticated=false;progress=null;signOutLocal();ui.loginModal.classList.remove('hidden');showAuthMode('login');ui.authMessage.textContent=err.message;setSync('BLOQUEADO','err');gameBootstrapRuntime.loading=false;return;}
    loadLocalGame();setSync('OFFLINE','err');
  }
  if(generation!==gameBootstrapRuntime.generation)return;
  if(!progress){gameBootstrapRuntime.loading=false;renderFactionChoice();return;}

  // V18.1.0: aplica cache de configuração imediatamente; atualização online nunca bloqueia o mundo.
  try{loadRuntimeConfigCache();applyRuntimeMenuConfig();}catch(e){console.warn('[runtime-config] cache',e);}
  try{loadNpcRuntimeConfigCache();}catch(e){console.warn('[npc-config] cache',e);}
  try{loadWorldRuntimeConfigCache();}catch(e){console.warn('[world-config] cache',e);}

  // 1) Posição local é síncrona e nunca bloqueia o mundo.
  try{restoreLatestRuntimeLocationCheckpoint();}catch(e){console.warn('[bootstrap] local position',e);}

  // 2) Damos uma janela CURTA para o checkpoint dedicado. Nunca mais deixamos RPC externa
  // segurar stats, NPCs, usuários ou o WebSocket indefinidamente.
  let locationPromise=null,locationSettled=false;
  try{
    locationPromise=loadPlayerLocationCheckpointOnline().then(row=>{locationSettled=true;return row;}).catch(e=>{locationSettled=true;console.warn('[bootstrap] server location',e);return null;});
    const first=await Promise.race([locationPromise,bootstrapDelay(650).then(()=>null)]);
    if(first)applyDedicatedCheckpointToProgress(first,{requireNewer:true});
  }catch(e){console.warn('[bootstrap] position race',e);}

  // 3) O MUNDO SOBE AGORA. Premium/LIVE OPS/Designers são secundários e nunca bloqueiam gameplay.
  try{
    startLoadedGame();
    gameBootstrapRuntime.ready=true;
    setSync('ONLINE','ok');
  }catch(e){
    gameBootstrapRuntime.lastError=e;console.error('[bootstrap] startLoadedGame fatal',e);
    // Última barreira: mantém a nave e tenta o universo mesmo se um render auxiliar falhar.
    try{state.currentMap=MAPS[progress.mapId]||MAPS.x1;const ship=SHIPS[progress.activeShipId]||SHIPS.phoenix;player.maxHp=Math.max(1,Number(ship.hp)||1);player.maxShield=Math.max(0,Number(progress.shield)||0);player.hp=Math.max(1,Math.min(player.maxHp,Number(progress.hp)||player.maxHp));player.shield=Math.max(0,Math.min(player.maxShield,Number(progress.shield)||0));player.x=Number(progress.x)||currentBasePoint().x;player.y=Number(progress.y)||state.currentMap.world.h/2;player.tx=player.x;player.ty=player.y;state.camera.x=player.x;state.camera.y=player.y;joinSharedUniverse();syncOnlineWorld();updateUI();gameBootstrapRuntime.ready=true;}catch(inner){console.error('[bootstrap] emergency fallback failed',inner);}
  }finally{gameBootstrapRuntime.loading=false;}

  renderChatTabs();refreshChatHistory(true);updatePassBadge();syncAuctionBidsOnline();syncOnlineWorld();syncClanCreditGrants(true);refreshClanState(true);refreshWarfrontState(true).catch(()=>{});refreshRuntimeConfig(true).catch(()=>{});refreshNpcRuntimeConfig(true).catch(()=>{});refreshWorldRuntimeConfig(true).catch(()=>{});refreshSystemsRuntimeConfig(true).catch(()=>{});

  // Se a posição do servidor chegou depois dos 650ms e o jogador ainda não moveu a nave,
  // ela pode corrigir o ponto inicial sem tocar em economia/inventário.
  if(locationPromise&&!locationSettled){locationPromise.then(row=>{if(row&&generation===gameBootstrapRuntime.generation&&!movementPositionRuntime.hasMovedSinceLoad)reapplyDedicatedCheckpointToLiveWorld(row);}).catch(()=>{});}

  // Serviços não críticos em background. Designers podem alterar stats, então recalculamos ao terminar.
  Promise.allSettled([refreshPremiumState(true),refreshLiveOpsState(true),refreshDesignerState(true)]).then(()=>{
    if(generation!==gameBootstrapRuntime.generation||!authenticated||!progress)return;
    try{computeStats(true);buildAmmoButtons();refreshPetViews();renderShop();updateUI();syncSharedUniversePlayer(true);syncOnlineWorld();}catch(e){console.warn('[bootstrap] background refresh',e);}
  });

  // Watchdogs curtos: se WS/presença ainda não tiverem snapshot, tenta novamente sem bloquear o usuário.
  setTimeout(()=>{if(generation===gameBootstrapRuntime.generation&&authenticated&&progress&&sharedUniverseMap()&&!sharedUniverseRuntime.ready){try{joinSharedUniverse();}catch{}syncOnlineWorld();}},2500);
  setTimeout(()=>{if(generation===gameBootstrapRuntime.generation&&authenticated&&progress&&sharedUniverseMap()&&!sharedUniverseRuntime.ready){try{sharedUniverse.close();joinSharedUniverse();}catch{}syncOnlineWorld();}},6500);
}

async function boot(){
  ui.loginModal.classList.remove('hidden');showAuthMode('login');setSync('LOCAL','');
  try{
    const recovery=await restorePasswordRecoveryFromUrl();
    if(recovery){showAuthMode('recovery');ui.authMessage.textContent='Defina sua nova senha para concluir a recuperação.';return;}
    // V14.1 SECURITY: nunca entra sozinho. Toda nova entrada/reload exige login explícito.
    signOutLocal();
    if(ui.loginPassword)ui.loginPassword.value='';
    ui.authMessage.textContent='Por segurança, faça login para acessar sua conta.';
  }catch(err){console.warn(err);signOutLocal();ui.authMessage.textContent=err.message||'Faça login novamente.';}
}

document.body.dataset.quality=resolvedQualityMode();
document.body.dataset.device=DEVICE_CAPS.mobile?'mobile':'desktop';
document.body.dataset.reducedMotion=DEVICE_CAPS.reducedMotion?'1':'0';
loadActivityLog();
loadHudVisibility();
loadChatPrefs();
renderSettings();
preloadAssets();
loadAmmoUiState();
loadStatsUiState();
loadPlayerUiState();
loadMissionUiState();
loadPetUiState();
loadTargetLockUiState();
loadGalaxyEventUiState();
loadMinimapUiState();
loadTopMetaUiState();
loadTopbarDockState();
syncHudButton();
layoutHudPanels();
window.addEventListener('resize', layoutHudPanels);
window.addEventListener('orientationchange', ()=>setTimeout(layoutHudPanels, 120));
boot();
setInterval(()=>{
  if(!authenticated)return;
  checkGameSession().catch(()=>{});
},3000);
setInterval(()=>{if(authenticated)refreshChatHistory(false);},CHAT_POLL_MS);
setInterval(()=>{if(progress){saveGame();flushCloudSave();}},7000);
setInterval(()=>{
  if(!authenticated||!progress||!state?.currentMap||isGalaxyGateMap())return;
  const moved=movementPositionRuntime.lastX===null?Math.hypot(player.tx-player.x,player.ty-player.y)>2:Math.hypot(player.x-movementPositionRuntime.lastX,player.y-movementPositionRuntime.lastY)>=8;
  if(moved)commitRuntimePosition('periodic_movement');
},2000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&progress){if(movementPositionRuntime.loadedFromCheckpoint||movementPositionRuntime.hasMovedSinceLoad){commitRuntimePosition('hidden');saveGame();flushCloudSave(true);}}else if(document.visibilityState==='visible'&&authenticated){checkGameSession().catch(()=>{});preloadActiveGameplayAssets();}});
const AUTO_QUALITY_ORDER=['low','medium','high'];
let perfWindowStart=performance.now(),perfFrames=0,perfGoodWindows=0,perfLastChange=0;
function monitorAutoPerformance(t){
  if(qualityMode!=='auto'){perfWindowStart=t;perfFrames=0;perfGoodWindows=0;return;}
  perfFrames++;
  const elapsed=t-perfWindowStart;if(elapsed<5000)return;
  const fps=perfFrames*1000/Math.max(1,elapsed),current=resolvedQualityMode(),idx=AUTO_QUALITY_ORDER.indexOf(current),ceiling=AUTO_QUALITY_ORDER.indexOf(AUTO_QUALITY_CEILING),target=qualityProfile().fps;
  if(t-perfLastChange>9000&&fps<target*.76&&idx>0){perfLastChange=t;perfGoodWindows=0;applyAutoQualityResolution(AUTO_QUALITY_ORDER[idx-1],true);}
  else if(fps>target*.94){perfGoodWindows++;if(perfGoodWindows>=2&&t-perfLastChange>12000&&idx<ceiling){perfLastChange=t;perfGoodWindows=0;applyAutoQualityResolution(AUTO_QUALITY_ORDER[idx+1],true);}}
  else perfGoodWindows=0;
  perfWindowStart=t;perfFrames=0;
}
let last=performance.now();function loop(t){
  if(document.visibilityState==='hidden'){last=t;requestAnimationFrame(loop);return;}
  const minFrame=1000/qualityProfile().fps;if(t-last<minFrame){requestAnimationFrame(loop);return;}
  const dt=Math.min((t-last)/1000,.05);last=t;update(dt);draw();monitorAutoPerformance(t);requestAnimationFrame(loop);
}requestAnimationFrame(loop);
setInterval(()=>{if(document.visibilityState==='visible')trimAssetCache();},30000);
