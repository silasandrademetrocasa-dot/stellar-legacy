import { randomUUID } from 'crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { MAPS, NPC_TYPES, RESOURCES } from '../public/data.js';

const PORTAL_NEUTRAL_RADIUS = 180;
const LIVE_OPS_REFRESH_MS = 15000;

function saoPauloClock(now=Date.now()){
  const offsetMs=3*60*60*1000; // UTC-3
  const spMs=now-offsetMs;
  const d=new Date(spMs);
  return {spMs,offsetMs,day:d.getUTCDay(),hour:d.getUTCHours(),minute:d.getUTCMinutes()};
}
function buildEventPayload(row,start,end,slot){
  return {
    id:String(row.event_key||''),
    icon:String(row.icon||'✦'),
    name:String(row.name||row.event_key||'EVENTO'),
    desc:String(row.description||''),
    target:Math.max(1,Number(row.target)||1),
    reward:row.reward&&typeof row.reward==='object'?row.reward:{},
    rules:row.rules&&typeof row.rules==='object'?row.rules:{},
    priority:Number(row.priority)||100,
    start,end,slot,
    eventId:`v16:${String(row.event_key||'event')}:${start}`
  };
}
function resolveLiveEvent(rows, now=Date.now()){
  const enabled=(Array.isArray(rows)?rows:[]).filter(row=>row?.enabled);
  if(!enabled.length)return null;
  const pool=[...enabled].sort((a,b)=>(Number(a.priority)||100)-(Number(b.priority)||100)||String(a.event_key||'').localeCompare(String(b.event_key||'')));
  if(pool.length>1){
    const clock=saoPauloClock(now),weekend=clock.day===0||clock.day===6;
    const slotMs=(weekend?1:4)*60*60*1000;
    const slotStartSp=Math.floor(clock.spMs/slotMs)*slotMs;
    const start=slotStartSp+clock.offsetMs,end=start+slotMs;
    const slot=Math.floor(slotStartSp/slotMs);
    const row=pool[((slot%pool.length)+pool.length)%pool.length];
    return buildEventPayload(row,start,end,slot);
  }
  const active=[];
  for(const row of pool){
    const base=Date.parse(row.starts_at||'');
    const duration=Math.max(1,Number(row.duration_minutes)||1)*60000;
    const repeat=Math.max(1,Number(row.repeat_minutes)||1)*60000;
    if(!Number.isFinite(base)||now<base)continue;
    const cycle=Math.max(0,Math.floor((now-base)/repeat));
    const start=base+cycle*repeat,end=start+duration;
    if(now<start||now>=end)continue;
    active.push(buildEventPayload(row,start,end,cycle));
  }
  active.sort((a,b)=>a.priority-b.priority||a.start-b.start||a.id.localeCompare(b.id));
  return active[0]||null;
}

function clamp(n,min,max){ return Math.max(min,Math.min(max,Number(n)||0)); }
function rand(min,max){ return min + Math.random()*(max-min); }
function nowMs(){ return Date.now(); }
function safeColor(value,fallback='#76d9ff'){
  const v=String(value||'').trim();return /^#[0-9a-fA-F]{6}$/.test(v)?v:fallback;
}
function shortText(value,max=48){return String(value||'').replace(/[\r\n\t]/g,' ').trim().slice(0,max);}
function basePointForFaction(factionId){
  const w=MAPS.x1.world.w,h=MAPS.x1.world.h;
  if(factionId==='mars') return {x:w-620,y:Math.round(h*.28)};
  if(factionId==='jupiter') return {x:w-620,y:Math.round(h*.72)};
  return {x:620,y:Math.round(h*.50)};
}
function roomKey(mapId,territoryFaction){
  return ['x1','x2','x3','x4'].includes(mapId) ? `${territoryFaction||'earth'}:${mapId}` : `battle:${mapId}`;
}
function sanitizeRoomMap(mapId){ return MAPS[mapId] && !MAPS[mapId].gate ? mapId : 'x1'; }
const EVENT_VARIANTS={
  invasion:{mode:'wave',progressLabel:'INVASORES',waveCount:8,minAlive:4,rewardMult:1.22},
  battle:{mode:'battle_wave',progressLabel:'ABATES BATTLE',waveCount:6,minAlive:3,rewardMult:1.22},
  prime:{mode:'boss',progressLabel:'BOSS RARO',bossName:'RIFT TYRANT',bossType:'bossSibelon',bossScale:4.2,bossRewardMult:2.4,bossSize:68,bossColor:'#ff4f9a'},
  mining:{mode:'ore',progressLabel:'RECURSOS',orePool:['Prometium','Endurium','Terbium','Promerium'],oreCount:12,oreRespawnMin:5,oreAmount:[12,26]},
  convoy:{mode:'convoy',progressLabel:'ESCOLTA',convoyHp:900000,convoySpeed:105,waveCount:3,waveRespawnMs:12000,rewardMult:1.22},
  nexus_breach:{mode:'wave',progressLabel:'FENDAS NEXUS',waveCount:8,minAlive:4,pool:['saimon','mordon','devolarium'],namePrefix:'NEXUS',color:'#ff9666',scale:1.25,rewardMult:1.36},
  eclipse_surge:{mode:'wave',progressLabel:'SURTO ECLIPSE',waveCount:7,minAlive:4,pool:['lordakia','saimon','mordon'],namePrefix:'ECLIPSE',color:'#b57cff',scale:1.2,speedMult:1.18,rewardMult:1.34},
  relic_hunt:{mode:'ore',progressLabel:'RELÍQUIAS',orePool:['Promerium','Terbium','Endurium','Promerium'],oreCount:12,oreRespawnMin:5,oreAmount:[18,34]},
  quantum_storm:{mode:'convoy',progressLabel:'ESTABILIZAÇÃO',convoyHp:1150000,convoySpeed:118,waveCount:4,waveRespawnMs:10000,pool:['saimon','mordon','devolarium'],namePrefix:'QUANTUM',color:'#62efff',scale:1.18,rewardMult:1.4},
  shadow_fleet:{mode:'wave',progressLabel:'FROTA SHADOW',waveCount:6,minAlive:3,pool:['mordon','devolarium','sibelon'],namePrefix:'SHADOW',color:'#8eb6ff',scale:1.38,rewardMult:1.48},
  aux_uprising:{mode:'wave',progressLabel:'AUX HOSTIS',waveCount:8,minAlive:4,pool:['recruitStreuner','aiderStreuner','lordakia'],namePrefix:'AUX',color:'#63eaff',scale:1.08,speedMult:1.35,rewardMult:1.30,size:20},
  titan_assault:{mode:'boss',progressLabel:'TITÃ',bossName:'TITAN EXARCH',bossType:'bossSibelon',bossScale:5.2,bossRewardMult:2.8,bossSize:76,bossColor:'#ff7c52'},
  ore_frenzy:{mode:'ore',progressLabel:'MINÉRIO',orePool:['Prometium','Endurium','Terbium','Promerium'],oreCount:16,oreRespawnMin:7,oreAmount:[24,42]}
};
function eventVariant(id){return EVENT_VARIANTS[String(id||'')]||EVENT_VARIANTS.invasion;}
function safeJsonSend(ws,payload){
  if(ws?.readyState!==WebSocket.OPEN) return false;
  try{ ws.send(JSON.stringify(payload)); return true; }catch{ return false; }
}

class Room {
  constructor(world,mapId,territoryFaction){
    this.world=world;
    this.mapId=sanitizeRoomMap(mapId);
    this.territoryFaction=territoryFaction||'battle';
    this.key=roomKey(this.mapId,this.territoryFaction);
    this.map=MAPS[this.mapId];
    this.clients=new Set();
    this.players=new Map();
    this.npcs=new Map();
    this.ores=new Map();
    this.respawns=[];
    this.oreRespawns=[];
    this.event=null;
    this.eventParticipants=new Set();
    this.convoy=null;
    this.convoyRetryAt=0;
    this.nextEventWaveAt=0;
    this.lastBroadcastAt=0;
    this.lastEventBroadcastAt=0;
    this.generateBaseWorld();
    this.ensureEvent(true);
  }

  randomPosition(margin=160){
    const w=this.map.world.w,h=this.map.world.h;
    let x=rand(margin,w-margin),y=rand(margin,h-margin),tries=0;
    if(this.mapId==='x1'){
      const b=basePointForFaction(this.territoryFaction);
      while(Math.hypot(x-b.x,y-b.y)<700 && tries++<50){x=rand(margin,w-margin);y=rand(margin,h-margin);}
    }
    return {x,y};
  }

  makeNpc(type,opts={}){
    const base=NPC_TYPES[type]; if(!base) return null;
    const p=this.randomPosition(180), battle=!!this.map.battle;
    const e={
      id:opts.id||`${opts.eventNpc?'evt':'npc'}_${type}_${randomUUID().slice(0,8)}`,
      type,name:opts.name||base.name,x:p.x,y:p.y,
      hp:Math.round(base.hp*(opts.scale||1)),maxHp:Math.round(base.hp*(opts.scale||1)),
      shield:Math.round(base.shield*(opts.scale||1)),maxShield:Math.round(base.shield*(opts.scale||1)),
      credits:Math.round(base.credits*(opts.rewardMult||1)),uridium:Math.round(base.uridium*(opts.rewardMult||1)),xp:Math.round(base.xp*(opts.rewardMult||1)),
      speed:Math.max(10,Math.round(base.speed*(opts.speedMult||1))),baseSpeed:Math.max(10,Math.round(base.speed*(opts.speedMult||1))),
      damage:Math.round(base.damage*Math.max(1,(opts.scale||1)*.82)),baseDamage:Math.round(base.damage*Math.max(1,(opts.scale||1)*.82)),
      bossPhase:0,bossAttackScale:1,jammedUntil:0,color:opts.color||base.color,size:opts.size||base.size,
      resources:{...(base.resources||{})},attackRange:Math.min(500,(battle?250:230)+base.size*5.8),aggroRange:800,
      lastShot:0,angle:rand(0,Math.PI*2),drift:rand(.4,1.4),eventNpc:!!opts.eventNpc,eventId:opts.eventId||null,
      forceChase:!!opts.forceChase,damageContrib:new Map(),lastDamageAt:0,aggroUserId:null,aggroStartedAt:0,spawnedAt:nowMs()
    };
    if(opts.x!=null)e.x=opts.x;if(opts.y!=null)e.y=opts.y;
    return e;
  }

  publicNpc(e){
    const {damageContrib,...rest}=e;
    return rest;
  }

  makeOre(type=null,opts={}){
    const names=this.map.ores||[];
    const oreType=type||names[Math.floor(Math.random()*Math.max(1,names.length))]||'Prometium';
    const p=this.randomPosition(120),res=RESOURCES[oreType]||RESOURCES.Prometium;
    return {id:opts.id||`${opts.eventOre?'evtore':'ore'}_${randomUUID().slice(0,10)}`,x:p.x,y:p.y,type:oreType,amount:Math.max(1,Math.round(opts.amount||1)),color:res.color,r:opts.r||rand(7,13),rot:rand(0,Math.PI*2),shape:Array.from({length:7},()=>rand(.72,1.18)),eventOre:!!opts.eventOre,eventId:opts.eventId||null};
  }

  generateBaseWorld(){
    const mult=Math.max(1,Number(this.map.enemyMultiplier)||1);
    for(const group of this.map.enemyGroups||[]){
      const count=Math.max(1,Math.round(group.count*mult));
      for(let i=0;i<count;i++){const e=this.makeNpc(group.type);if(e)this.npcs.set(e.id,e);}
    }
    const oreCount=this.map.oreCount||(this.map.battle?72:48);
    for(let i=0;i<oreCount;i++){const o=this.makeOre();this.ores.set(o.id,o);}
  }

  currentEventDef(){ return this.world.currentEvent(); }
  eventProfile(ev=this.event){return eventVariant(ev?.id);}
  eventMode(ev=this.event){return this.eventProfile(ev).mode;}
  eventEligible(ev){
    if(!ev)return false;
    const rules=ev.rules||{},mode=this.eventMode(ev);
    if(rules.battle_only)return !!this.map.battle;
    if(rules.normal_only&&this.map.battle)return false;
    if(Number(rules.min_tier||0)>Number(this.map.tier||0))return false;
    if(mode==='battle_wave')return !!this.map.battle;
    if(mode==='boss')return !!this.map.battle||Number(this.map.tier||1)>=2;
    return !this.map.battle;
  }

  clearEventEntities(reason='event_cleanup',clearParticipants=true){
    const npcIds=[],oreIds=[];
    for(const [id,e] of this.npcs) if(e.eventNpc){npcIds.push(id);this.npcs.delete(id);}
    for(const [id,o] of this.ores) if(o.eventOre){oreIds.push(id);this.ores.delete(id);}
    // Never allow delayed event respawns from a finished/rotated event to come back later.
    this.respawns=this.respawns.filter(r=>r.kind!=='eventNpc');
    this.oreRespawns=this.oreRespawns.filter(r=>!r.eventOre);
    this.convoy=null;this.convoyRetryAt=0;this.nextEventWaveAt=0;
    if(clearParticipants)this.eventParticipants.clear();
    if(npcIds.length||oreIds.length)this.broadcast({type:'event_cleanup',reason,npcIds,oreIds,eventId:this.event?.eventId||null,serverTime:nowMs()});
    return {npcIds,oreIds};
  }

  ensureEvent(force=false){
    const ev=this.currentEventDef();
    if(!ev){
      if(this.event||force){this.clearEventEntities('event_end');this.event=null;this.broadcastEvent(true);if(this.clients.size)this.broadcast(this.snapshot());}
      return;
    }
    if(!force&&this.event?.eventId===ev.eventId)return;
    this.clearEventEntities(this.event?'event_rotate':'event_start');
    this.event={...ev,progress:0,complete:false};
    if(!this.eventEligible(ev))return;
    const profile=this.eventProfile(ev),mode=profile.mode;
    if(mode==='wave'||mode==='battle_wave') this.spawnEventWave(profile.waveCount||6);
    if(mode==='boss') this.spawnPrime();
    if(mode==='ore') this.spawnEventOres(profile.oreCount||12);
    if(mode==='convoy') this.startConvoy();
    this.broadcastEvent(true);
    if(this.clients.size)this.broadcast(this.snapshot());
  }

  eventPool(ev=this.event){
    const profile=this.eventProfile(ev);
    if(Array.isArray(profile.pool)&&profile.pool.length)return profile.pool;
    const tier=Number(this.map.tier||1);
    return tier>=4?['mordon','devolarium','sibelon']:tier>=3?['saimon','mordon','devolarium']:tier>=2?['lordakia','saimon','mordon']:['streuner','recruitStreuner','aiderStreuner'];
  }
  spawnEventWave(count=6){
    const ev=this.event;if(!ev)return;const profile=this.eventProfile(ev),pool=this.eventPool(ev),rewardMult=profile.rewardMult||1.22;
    const alive=[...this.npcs.values()].filter(e=>e.eventNpc&&e.eventId===ev.eventId&&e.hp>0).length;
    const maxAlive=Math.max(1,Number(profile.maxAlive)||Math.max(Number(profile.waveCount)||6,(Number(profile.minAlive)||3)*2));
    count=Math.max(0,Math.min(Math.max(0,Number(count)||0),maxAlive-alive));
    for(let i=0;i<count;i++){
      const type=pool[Math.floor(Math.random()*pool.length)],baseName=(NPC_TYPES[type]?.name||String(type||'NPC')).toUpperCase();
      const e=this.makeNpc(type,{eventNpc:true,eventId:ev.eventId,forceChase:true,rewardMult,scale:profile.scale||1,color:profile.color,size:profile.size,speedMult:profile.speedMult||1,name:profile.namePrefix?(profile.namePrefix+' '+baseName):undefined});
      if(e){this.npcs.set(e.id,e);this.broadcast({type:'npc_spawn',entity:this.publicNpc(e)});}
    }
  }
  spawnPrime(){
    const ev=this.event;if(!ev)return;const profile=this.eventProfile(ev);
    const e=this.makeNpc(profile.bossType||'bossSibelon',{eventNpc:true,eventId:ev.eventId,forceChase:true,name:profile.bossName||'RIFT TYRANT',scale:profile.bossScale||4.2,rewardMult:profile.bossRewardMult||2.4,size:profile.bossSize||68,color:profile.bossColor||'#ff4f9a'});
    if(e){e.aggroRange=800;e.attackRange=500;this.npcs.set(e.id,e);this.broadcast({type:'npc_spawn',entity:this.publicNpc(e)});}
  }
  spawnEventOres(count=12){
    const ev=this.event;if(!ev)return;const profile=this.eventProfile(ev),pool=Array.isArray(profile.orePool)&&profile.orePool.length?profile.orePool:['Prometium','Endurium','Terbium','Promerium'],amountRange=Array.isArray(profile.oreAmount)?profile.oreAmount:[12,26];
    for(let i=0;i<count;i++){const o=this.makeOre(pool[Math.floor(Math.random()*pool.length)],{eventOre:true,eventId:ev.eventId,amount:rand(amountRange[0],amountRange[1]),r:rand(11,17)});this.ores.set(o.id,o);this.broadcast({type:'ore_spawn',ore:o});}
  }
  startConvoy(){
    const ev=this.event;if(!ev)return;const profile=this.eventProfile(ev),sx=420,sy=420,tx=this.map.world.w-420,ty=this.map.world.h-420;
    this.convoy={eventId:ev.eventId,x:sx,y:sy,sx,sy,tx,ty,totalDistance:Math.max(1,Math.hypot(tx-sx,ty-sy)),hp:profile.convoyHp||900000,maxHp:profile.convoyHp||900000,speed:profile.convoySpeed||105,lastHitAt:0};this.convoyRetryAt=0;
    this.nextEventWaveAt=nowMs()+3000;
  }

  eventPayload(){return this.event?{...this.event,convoy:this.convoy?{...this.convoy}:null}:null;}
  publicPlayer(p){
    if(!p)return null;
    return {userId:p.userId,callsign:p.callsign,pilotTitle:p.pilotTitle||'Piloto Estelar',faction:p.faction,shipId:p.shipId,shipDesignId:p.shipDesignId||null,level:p.level,x:p.x,y:p.y,angle:p.angle,hp:p.hp,maxHp:p.maxHp,shield:p.shield,maxShield:p.maxShield,updatedAt:p.updatedAt,
      laserFiring:!!p.laserFiring,laserColor:p.laserColor||'#76d9ff',laserAmmoId:p.laserAmmoId||'lcb10',laserAmmoName:p.laserAmmoName||'PLS-1',targetId:p.targetId||null,targetIsPlayer:!!p.targetIsPlayer,
      pet:p.pet?{...p.pet}:null};
  }
  snapshot(viewerUserId=null){return {type:'world_snapshot',roomKey:this.key,mapId:this.mapId,territoryFaction:this.territoryFaction,npcs:[...this.npcs.values()].map(e=>this.publicNpc(e)),ores:[...this.ores.values()],players:[...this.players.values()].filter(p=>p.userId!==viewerUserId).map(p=>this.publicPlayer(p)),event:this.eventPayload(),serverTime:nowMs()};}
  broadcast(payload,exclude=null){for(const c of this.clients)if(c!==exclude)safeJsonSend(c,payload);}
  broadcastEvent(force=false){const now=nowMs();if(!force&&now-this.lastEventBroadcastAt<500)return;this.lastEventBroadcastAt=now;this.broadcast({type:'event_update',event:this.eventPayload(),serverTime:now});}

  addClient(ws,player){
    this.clients.add(ws);this.players.set(player.userId,player);ws.room=this;ws.player=player;
    safeJsonSend(ws,this.snapshot(player.userId));
    this.broadcast({type:'world_player_spawn',entity:this.publicPlayer(player)},ws);
  }
  removeClient(ws){
    if(!this.clients.has(ws))return;this.clients.delete(ws);if(ws.player)this.players.delete(ws.player.userId);if(ws.player)this.broadcast({type:'world_player_leave',userId:ws.player.userId});ws.room=null;ws.player=null;
  }
  updatePlayer(ws,msg){
    const p=ws.player;if(!p)return;
    const now=nowMs();if(now-(ws.lastPlayerStateAt||0)<35)return;ws.lastPlayerStateAt=now;
    p.x=clamp(msg.x,0,this.map.world.w);p.y=clamp(msg.y,0,this.map.world.h);p.angle=Number(msg.angle)||0;p.hp=Math.max(0,Number(msg.hp)||0);p.shield=Math.max(0,Number(msg.shield)||0);p.maxHp=Math.max(1,Number(msg.maxHp)||1);p.maxShield=Math.max(0,Number(msg.maxShield)||0);p.faction=String(msg.faction||p.faction||'earth');p.shipId=shortText(msg.shipId||p.shipId||'phoenix',40);p.shipDesignId=msg.shipDesignId?shortText(msg.shipDesignId,64):null;p.level=Math.max(1,Number(msg.level)||1);p.pilotTitle=shortText(msg.pilotTitle||p.pilotTitle||'Piloto Estelar',64);
    p.laserFiring=!!msg.laserFiring;p.laserColor=safeColor(msg.laserColor,p.laserColor||'#76d9ff');p.laserAmmoId=shortText(msg.laserAmmoId||p.laserAmmoId||'lcb10',24);p.laserAmmoName=shortText(msg.laserAmmoName||p.laserAmmoName||'PLS-1',20);p.targetId=msg.targetId?shortText(msg.targetId,96):null;p.targetIsPlayer=!!msg.targetIsPlayer;
    const pet=msg.pet&&typeof msg.pet==='object'?msg.pet:null;
    if(pet?.owned){p.pet={owned:true,level:Math.max(1,Math.min(15,Number(pet.level)||1)),x:clamp(pet.x,0,this.map.world.w),y:clamp(pet.y,0,this.map.world.h),angle:Number(pet.angle)||0,activeGear:shortText(pet.activeGear||'off',24),laserTargetId:pet.laserTargetId?shortText(pet.laserTargetId,96):null,laserActive:!!pet.laserActive,laserColor:safeColor(pet.laserColor,p.laserColor),designId:pet.designId?shortText(pet.designId,64):null};}else p.pet={owned:false};
    p.updatedAt=now;
    this.broadcast({type:'world_player_patch',entity:this.publicPlayer(p)},ws);
  }
  playerSafe(p){
    if(this.mapId!=='x1'||this.territoryFaction!==p.faction)return false;const b=basePointForFaction(this.territoryFaction);return Math.hypot(p.x-b.x,p.y-b.y)<=520;
  }
  playerPortalNeutral(p){
    return (this.map.portals||[]).some(portal=>Math.hypot(p.x-Number(portal.x||0),p.y-Number(portal.y||0))<=PORTAL_NEUTRAL_RADIUS);
  }
  playerProtectedFromNpc(p,e=null){
    const retaliating=String(e?.aggroUserId||'')===String(p?.userId||'');
    if(this.playerSafe(p)&&!retaliating)return true;
    if(this.playerPortalNeutral(p)&&!retaliating)return true;
    return false;
  }
  playerFresh(p){return !!p&&p.hp>0&&nowMs()-(p.updatedAt||0)<=8000;}
  lockedAggroPlayer(e){
    if(e.aggroUserId){const locked=this.players.get(e.aggroUserId);if(this.playerFresh(locked))return locked;
      const next=[...e.damageContrib.keys()].map(id=>this.players.get(id)).find(p=>this.playerFresh(p));
      if(next){e.aggroUserId=next.userId;e.aggroStartedAt=nowMs();return next;}e.aggroUserId=null;e.aggroStartedAt=0;
    }
    return null;
  }
  nearestPlayer(e){
    let best=null,dist=Infinity;for(const p of this.players.values()){if(!this.playerFresh(p)||this.playerProtectedFromNpc(p,e))continue;const d=Math.hypot(p.x-e.x,p.y-e.y);if(d<dist){dist=d;best=p;}}return best?{player:best,dist}:null;
  }

  applyBossPhase(e){
    if(!String(e.type||'').startsWith('boss')||e.hp<=0)return;const total=Math.max(1,e.maxHp+e.maxShield),remain=Math.max(0,e.hp)+Math.max(0,e.shield),ratio=remain/total;let phase=0;if(ratio<=.33)phase=2;else if(ratio<=.66)phase=1;if(phase===e.bossPhase)return;e.bossPhase=phase;const mult=phase===0?1:phase===1?1.16:1.36;e.speed=Math.round(e.baseSpeed*mult);e.damage=Math.round(e.baseDamage*(phase===0?1:phase===1?1.20:1.48));e.bossAttackScale=phase===0?1:phase===1?.88:.70;
  }

  handleDamage(ws,msg){
    const p=ws.player,e=this.npcs.get(String(msg.entityId||''));if(!p||!e||e.hp<=0)return;
    const now=nowMs();if(now-(ws.lastWorldDamageAt||0)<25)return;ws.lastWorldDamageAt=now;
    const dist=Math.hypot(p.x-e.x,p.y-e.y);if(dist>1450)return safeJsonSend(ws,{type:'damage_result',hitId:msg.hitId||null,entityId:e.id,actual:0,rejected:'range'});
    let amount=clamp(msg.damage,0,5000000);if(amount<=0)return;
    const mode=String(msg.mode||'damage');const beforeShield=e.shield,beforeHp=e.hp;let actual=0;
    if(mode==='shield_drain'){
      actual=Math.min(e.shield,Math.round(amount));e.shield=Math.max(0,e.shield-actual);
    }else{
      let remain=Math.round(amount);if(e.shield>0){const got=Math.min(e.shield,remain);e.shield-=got;remain-=got;actual+=got;}if(remain>0){const got=Math.min(e.hp,remain);e.hp-=got;actual+=got;}
    }
    if(actual>0){if(!e.aggroUserId){e.aggroUserId=p.userId;e.aggroStartedAt=now;this.broadcast({type:'npc_aggro',entityId:e.id,userId:p.userId});}e.damageContrib.set(p.userId,(e.damageContrib.get(p.userId)||0)+actual);e.lastDamageAt=now;this.eventParticipants.add(p.userId);this.applyBossPhase(e);}
    safeJsonSend(ws,{type:'damage_result',hitId:msg.hitId||null,entityId:e.id,actual,mode,critical:!!msg.critical,beforeShield,beforeHp,hp:e.hp,shield:e.shield});
    this.broadcast({type:'npc_patch',entity:{id:e.id,hp:e.hp,shield:e.shield,x:e.x,y:e.y,bossPhase:e.bossPhase}});
    if(e.hp<=0)this.killNpc(e,p.userId);
  }

  killNpc(e,killerUserId){
    if(!this.npcs.has(e.id))return;
    this.npcs.delete(e.id);
    const total=[...e.damageContrib.values()].reduce((a,b)=>a+b,0)||1;
    const contributors=[...e.damageContrib.entries()].map(([userId,damage])=>({userId,damage,share:damage/total}));
    const dead=this.publicNpc({...e,hp:0});
    this.broadcast({type:'npc_death',entity:dead,killerUserId,contributors});
    for(const c of this.clients){const row=contributors.find(x=>x.userId===c.player?.userId);if(row)safeJsonSend(c,{type:'kill_credit',entity:dead,share:row.share,finalBlow:c.player.userId===killerUserId});}
    const mode=this.eventMode();
    if(mode==='battle_wave'&&!this.event?.complete)this.addEventProgress(1);
    else if(e.eventNpc&&this.event?.eventId===e.eventId&&(mode==='wave'||mode==='boss'))this.addEventProgress(1);
    if(!e.eventNpc)this.respawns.push({kind:'npc',type:e.type,at:nowMs()+rand(6000,13000)});
  }

  handleOreCollect(ws,msg){
    const p=ws.player,o=this.ores.get(String(msg.entityId||''));if(!p||!o)return;
    if(Math.hypot(p.x-o.x,p.y-o.y)>90)return safeJsonSend(ws,{type:'ore_collect_result',entityId:o.id,ok:false,reason:'range'});
    this.ores.delete(o.id);this.eventParticipants.add(p.userId);
    safeJsonSend(ws,{type:'ore_collected',ore:o});this.broadcast({type:'ore_remove',entityId:o.id,collectorUserId:p.userId},ws);
    const mode=this.eventMode();
    if(o.eventOre&&this.event?.eventId===o.eventId&&mode==='ore')this.addEventProgress(o.amount);
    if(!o.eventOre)this.oreRespawns.push({type:o.type,at:nowMs()+rand(5000,12000)});
  }

  addEventProgress(amount){
    if(!this.event||this.event.complete)return;
    this.event.progress=Math.min(this.event.target,Math.max(0,this.event.progress+Math.max(0,Number(amount)||0)));
    if(this.event.progress>=this.event.target){
      this.event.complete=true;this.broadcastEvent(true);
      for(const c of this.clients){if(this.eventParticipants.has(c.player?.userId))safeJsonSend(c,{type:'event_credit',event:this.eventPayload()});}
      this.clearEventEntities('event_complete',false);
      if(this.clients.size)this.broadcast(this.snapshot());
    }else this.broadcastEvent(true);
  }

  tick(dt){
    this.ensureEvent(false);const now=nowMs();
    const activeEventId=this.event?.eventId||null;
    let staleNpc=false,staleOre=false;
    for(const [id,e] of this.npcs)if(e.eventNpc&&(!activeEventId||e.eventId!==activeEventId)){this.npcs.delete(id);staleNpc=true;}
    for(const [id,o] of this.ores)if(o.eventOre&&(!activeEventId||o.eventId!==activeEventId)){this.ores.delete(id);staleOre=true;}
    if(staleNpc||staleOre){this.respawns=this.respawns.filter(r=>r.kind!=='eventNpc');this.oreRespawns=this.oreRespawns.filter(r=>!r.eventOre);if(this.clients.size)this.broadcast(this.snapshot());}
    for(const e of this.npcs.values()){
      const locked=this.lockedAggroPlayer(e);const near=locked?{player:locked,dist:Math.hypot(locked.x-e.x,locked.y-e.y)}:this.nearestPlayer(e);e.angle+=(Number(e.drift)||0)*dt;if(!near){e.x=clamp(e.x+Math.cos(e.angle)*e.speed*.12*dt,25,this.map.world.w-25);e.y=clamp(e.y+Math.sin(e.angle)*e.speed*.12*dt,25,this.map.world.h-25);continue;}const p=near.player,d=near.dist,dx=p.x-e.x,dy=p.y-e.y,force=!!e.forceChase,retaliating=String(e.aggroUserId||'')===String(p.userId||''),protectedNow=this.playerProtectedFromNpc(p,e),neutralX1=this.mapId==='x1'&&!retaliating;
      if(this.mapId==='x1'){
        const b=basePointForFaction(this.territoryFaction),bd=Math.hypot(e.x-b.x,e.y-b.y);if(bd<555){const ox=e.x-b.x,oy=e.y-b.y,od=Math.hypot(ox,oy)||1;e.x=b.x+ox/od*558;e.y=b.y+oy/od*558;}
      }
      if(neutralX1&&!protectedNow){
        const passiveStand=Math.max(180,e.attackRange*.72);
        if(d<=e.aggroRange&&d>passiveStand){const nd=Math.max(1,d);e.x=clamp(e.x+dx/nd*e.speed*.72*dt,25,this.map.world.w-25);e.y=clamp(e.y+dy/nd*e.speed*.72*dt,25,this.map.world.h-25);}
        else if(d>e.aggroRange){e.x=clamp(e.x+Math.cos(e.angle)*e.speed*.16*dt,25,this.map.world.w-25);e.y=clamp(e.y+Math.sin(e.angle)*e.speed*.16*dt,25,this.map.world.h-25);}
      }else if(!protectedNow&&!neutralX1&&d<=e.aggroRange&&d>e.attackRange*.8){const nd=Math.max(1,d);e.x=clamp(e.x+dx/nd*e.speed*dt,25,this.map.world.w-25);e.y=clamp(e.y+dy/nd*e.speed*dt,25,this.map.world.h-25);}else if(d>e.aggroRange||protectedNow){e.x=clamp(e.x+Math.cos(e.angle)*e.speed*.16*dt,25,this.map.world.w-25);e.y=clamp(e.y+Math.sin(e.angle)*e.speed*.16*dt,25,this.map.world.h-25);}
      const attackDelay=((String(e.type).startsWith('boss')?1.6:1.15)*(e.bossAttackScale||1))*1000;if(!protectedNow&&!neutralX1&&d<e.attackRange&&now-(e.lastShot||0)>=attackDelay){e.lastShot=now;const victim=[...this.clients].find(c=>c.player?.userId===p.userId);safeJsonSend(victim,{type:'npc_attack',entityId:e.id,damage:Math.max(1,Math.round(e.damage*rand(.92,1.12))),x:e.x,y:e.y,retaliation:retaliating,aggroUserId:e.aggroUserId||null});}
    }
    for(let i=this.respawns.length-1;i>=0;i--){const r=this.respawns[i];if(now<r.at)continue;this.respawns.splice(i,1);if(r.kind==='eventNpc'&&this.event?.eventId!==r.eventId)continue;const profile=r.kind==='eventNpc'?this.eventProfile():null,baseName=(NPC_TYPES[r.type]?.name||String(r.type||'NPC')).toUpperCase();const e=this.makeNpc(r.type,r.kind==='eventNpc'?{eventNpc:true,eventId:r.eventId,forceChase:true,rewardMult:profile?.rewardMult||1.22,scale:profile?.scale||1,color:profile?.color,size:profile?.size,speedMult:profile?.speedMult||1,name:profile?.namePrefix?(profile.namePrefix+' '+baseName):undefined}:{});if(e){this.npcs.set(e.id,e);this.broadcast({type:'npc_spawn',entity:this.publicNpc(e)});}}
    for(let i=this.oreRespawns.length-1;i>=0;i--){const r=this.oreRespawns[i];if(now<r.at)continue;this.oreRespawns.splice(i,1);if(r.eventOre&&this.event?.eventId!==r.eventId)continue;const o=this.makeOre(r.type,r.eventOre?{eventOre:true,eventId:r.eventId,amount:r.amount}:{});this.ores.set(o.id,o);this.broadcast({type:'ore_spawn',ore:o});}
    if(this.event&&!this.event.complete){
      const profile=this.eventProfile(),mode=profile.mode;
      if(mode==='wave'||mode==='battle_wave'){
        const alive=[...this.npcs.values()].filter(e=>e.eventNpc&&e.eventId===this.event.eventId).length,minimum=profile.minAlive||3,targetWave=profile.waveCount||6;
        if(alive<minimum)this.spawnEventWave(Math.max(1,targetWave-alive));
      }
      if(mode==='ore'){
        const alive=[...this.ores.values()].filter(o=>o.eventOre&&o.eventId===this.event.eventId).length,minimum=profile.oreRespawnMin||5,targetCount=profile.oreCount||12;
        if(alive<minimum)this.spawnEventOres(Math.max(1,targetCount-alive));
      }
      if(mode==='convoy'){
        if(!this.convoy&&now>=this.convoyRetryAt)this.startConvoy();
        if(this.convoy){const c=this.convoy;const close=[...this.players.values()].filter(p=>Math.hypot(p.x-c.x,p.y-c.y)<950);if(close.length){for(const p of close)this.eventParticipants.add(p.userId);const dx=c.tx-c.x,dy=c.ty-c.y,d=Math.hypot(dx,dy);if(d>10){const step=Math.min(d,c.speed*dt);c.x+=dx/Math.max(1,d)*step;c.y+=dy/Math.max(1,d)*step;this.event.progress=Math.max(this.event.progress,Math.round((1-d/c.totalDistance)*100));}if(d<=14)this.addEventProgress(100-this.event.progress);}
          const nearby=[...this.npcs.values()].filter(e=>e.eventNpc&&e.hp>0&&Math.hypot(e.x-c.x,e.y-c.y)<270);if(nearby.length&&now-c.lastHitAt>800){c.lastHitAt=now;const dmg=nearby.reduce((sum,e)=>sum+Math.max(1000,e.damage*.12),0);c.hp=Math.max(0,c.hp-dmg);if(c.hp<=0){this.convoy=null;this.event.progress=0;this.convoyRetryAt=now+15000;this.broadcastEvent(true);}}
          if(now>=this.nextEventWaveAt){this.nextEventWaveAt=now+(profile.waveRespawnMs||12000);this.spawnEventWave(profile.waveCount||3);}
        }
      }
    }
    if(now-this.lastBroadcastAt>=100){this.lastBroadcastAt=now;this.broadcast({type:'npc_batch',entities:[...this.npcs.values()].map(e=>({id:e.id,x:e.x,y:e.y,hp:e.hp,shield:e.shield,angle:e.angle,bossPhase:e.bossPhase}))});}
    this.broadcastEvent(false);
  }
}

export function attachSharedUniverse(server,{authenticate,loadLiveOps}){
  const wss=new WebSocketServer({server,path:'/ws',perMessageDeflate:false});const rooms=new Map();
  const world={
    liveOps:{events:[],catalog:[],server_time:0},
    lastLiveOpsAt:0,
    liveOpsBusy:false,
    currentEvent(){return resolveLiveEvent(world.liveOps?.events||[],nowMs());},
    async refreshLiveOps(force=false){
      const now=nowMs();
      if(!loadLiveOps)return world.liveOps;
      if(!force&&world.lastLiveOpsAt&&now-world.lastLiveOpsAt<LIVE_OPS_REFRESH_MS)return world.liveOps;
      if(world.liveOpsBusy)return world.liveOps;
      world.liveOpsBusy=true;
      try{
        const data=await loadLiveOps();
        if(data&&Array.isArray(data.events)){
          const before=world.currentEvent()?.eventId||null;
          world.liveOps=data;
          world.lastLiveOpsAt=nowMs();
          const after=world.currentEvent()?.eventId||null;
          if(before!==after||force)for(const r of rooms.values())r.ensureEvent(true);
        }
      }catch(err){console.warn('LIVE OPS refresh failed:',err?.message||err);}
      finally{world.liveOpsBusy=false;}
      return world.liveOps;
    },
    room(mapId,territoryFaction){const id=sanitizeRoomMap(mapId),key=roomKey(id,territoryFaction);if(!rooms.has(key))rooms.set(key,new Room(world,id,territoryFaction));return rooms.get(key);},
    stats(){return {rooms:rooms.size,clients:[...rooms.values()].reduce((s,r)=>s+r.clients.size,0),npcs:[...rooms.values()].reduce((s,r)=>s+r.npcs.size,0),ores:[...rooms.values()].reduce((s,r)=>s+r.ores.size,0),event:world.currentEvent(),liveOpsUpdatedAt:world.lastLiveOpsAt};}
  };

  wss.on('connection',ws=>{
    try{ws._socket?.setNoDelay?.(true);}catch{}
    ws.isAuthed=false;ws.authTimer=setTimeout(()=>{try{ws.close(4401,'auth timeout');}catch{}},8000);
    ws.on('message',async raw=>{
      let msg;try{msg=JSON.parse(String(raw));}catch{return;}
      if(msg.type==='ping')return safeJsonSend(ws,{type:'pong',ts:msg.ts,serverTime:nowMs()});
      if(!ws.isAuthed){
        if(msg.type!=='auth')return;
        try{const identity=await authenticate(String(msg.accessToken||''),String(msg.gameSessionId||''));if(!identity?.user?.id)throw new Error('auth');ws.isAuthed=true;ws.identity=identity;clearTimeout(ws.authTimer);safeJsonSend(ws,{type:'auth_ok',user:{id:identity.user.id,callsign:identity.callsign},serverTime:nowMs()});}catch{safeJsonSend(ws,{type:'auth_error'});try{ws.close(4401,'auth failed');}catch{}}return;
      }
      if(msg.type==='join_map'){
        ws.room?.removeClient(ws);const r=world.room(msg.mapId,msg.territoryFaction);const p={userId:ws.identity.user.id,callsign:ws.identity.callsign||msg.callsign||'Pilot',pilotTitle:shortText(msg.pilotTitle||'Piloto Estelar',64),faction:String(msg.faction||'earth'),shipId:String(msg.shipId||'phoenix'),shipDesignId:msg.shipDesignId?shortText(msg.shipDesignId,64):null,level:Number(msg.level)||1,x:Number(msg.x)||400,y:Number(msg.y)||400,hp:Number(msg.hp)||1,maxHp:Number(msg.maxHp)||1,shield:Number(msg.shield)||0,maxShield:Number(msg.maxShield)||0,angle:Number(msg.angle)||0,laserFiring:false,laserColor:'#76d9ff',laserAmmoId:'lcb10',laserAmmoName:'PLS-1',targetId:null,targetIsPlayer:false,pet:{owned:false},updatedAt:nowMs()};r.addClient(ws,p);return;
      }
      if(msg.type==='player_state')return ws.room?.updatePlayer(ws,msg);
      if(msg.type==='npc_damage')return ws.room?.handleDamage(ws,msg);
      if(msg.type==='collect_ore')return ws.room?.handleOreCollect(ws,msg);
      if(msg.type==='force_event'&&String(ws.identity.callsign||'').trim().toUpperCase()==='FELP22'){
        await world.refreshLiveOps(true);
        safeJsonSend(ws,{type:'live_ops_refresh',ok:true,event:world.currentEvent(),serverTime:nowMs()});
        return;
      }
    });
    ws.on('close',()=>{clearTimeout(ws.authTimer);ws.room?.removeClient(ws);});
    ws.on('error',()=>{});
  });

  world.refreshLiveOps(true).catch(()=>{});
  let last=nowMs();const timer=setInterval(()=>{const n=nowMs(),dt=Math.min(.12,(n-last)/1000);last=n;if(n-world.lastLiveOpsAt>=LIVE_OPS_REFRESH_MS)world.refreshLiveOps(false).catch(()=>{});for(const [key,r] of rooms){r.tick(dt);if(r.clients.size===0&&n-(r.lastUsedAt||n)>30*60*1000)rooms.delete(key);else if(r.clients.size>0)r.lastUsedAt=n;}},50);
  timer.unref?.();
  return world;
}
