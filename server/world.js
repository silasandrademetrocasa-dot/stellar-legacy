import { randomUUID } from 'crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { MAPS, NPC_TYPES, RESOURCES } from '../public/data.js';

const PORTAL_NEUTRAL_RADIUS = 180;
const LIVE_OPS_REFRESH_MS = 15000;

function resolveLiveEvent(rows, now=Date.now()){
  const active=[];
  for(const row of Array.isArray(rows)?rows:[]){
    if(!row?.enabled)continue;
    const base=Date.parse(row.starts_at||'');
    const duration=Math.max(1,Number(row.duration_minutes)||1)*60000;
    const repeat=Math.max(1,Number(row.repeat_minutes)||1)*60000;
    if(!Number.isFinite(base)||now<base)continue;
    const cycle=Math.max(0,Math.floor((now-base)/repeat));
    const start=base+cycle*repeat,end=start+duration;
    if(now<start||now>=end)continue;
    active.push({
      id:String(row.event_key||''),
      icon:String(row.icon||'✦'),
      name:String(row.name||row.event_key||'EVENTO'),
      desc:String(row.description||''),
      target:Math.max(1,Number(row.target)||1),
      reward:row.reward&&typeof row.reward==='object'?row.reward:{},
      rules:row.rules&&typeof row.rules==='object'?row.rules:{},
      priority:Number(row.priority)||100,
      start,end,slot:cycle,
      eventId:`v16:${String(row.event_key||'event')}:${start}`
    });
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
      resources:{...(base.resources||{})},attackRange:Math.min(battle?500:420,(battle?210:170)+base.size*5.8),aggroRange:battle?920:720,
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
  eventEligible(ev){
    if(!ev)return false;
    const rules=ev.rules||{};
    if(rules.battle_only)return !!this.map.battle;
    if(rules.normal_only&&this.map.battle)return false;
    if(Number(rules.min_tier||0)>Number(this.map.tier||0))return false;
    if(ev.id==='battle')return !!this.map.battle;
    if(ev.id==='prime')return !!this.map.battle||Number(this.map.tier||1)>=2;
    return !this.map.battle;
  }

  clearEventEntities(){
    for(const [id,e] of this.npcs) if(e.eventNpc) this.npcs.delete(id);
    for(const [id,o] of this.ores) if(o.eventOre) this.ores.delete(id);
    this.convoy=null;this.convoyRetryAt=0;this.nextEventWaveAt=0;this.eventParticipants.clear();
  }

  ensureEvent(force=false){
    const ev=this.currentEventDef();
    if(!ev){
      if(this.event||force){this.clearEventEntities();this.event=null;this.broadcastEvent(true);if(this.clients.size)this.broadcast(this.snapshot());}
      return;
    }
    if(!force&&this.event?.eventId===ev.eventId)return;
    this.clearEventEntities();
    this.event={...ev,progress:0,complete:false};
    if(!this.eventEligible(ev))return;
    if(ev.id==='invasion') this.spawnEventWave(8);
    if(ev.id==='battle') this.spawnEventWave(6);
    if(ev.id==='prime') this.spawnPrime();
    if(ev.id==='mining') this.spawnEventOres(12);
    if(ev.id==='convoy') this.startConvoy();
    this.broadcastEvent(true);
    if(this.clients.size)this.broadcast(this.snapshot());
  }

  eventPool(){
    const tier=Number(this.map.tier||1);
    return tier>=4?['mordon','devolarium','sibelon']:tier>=3?['saimon','mordon','devolarium']:tier>=2?['lordakia','saimon','mordon']:['streuner','recruitStreuner','aiderStreuner'];
  }
  spawnEventWave(count=6){
    const ev=this.event;if(!ev)return;const pool=this.eventPool();
    for(let i=0;i<count;i++){
      const type=pool[Math.floor(Math.random()*pool.length)],e=this.makeNpc(type,{eventNpc:true,eventId:ev.eventId,forceChase:true,rewardMult:1.22});
      if(e){this.npcs.set(e.id,e);this.broadcast({type:'npc_spawn',entity:this.publicNpc(e)});}
    }
  }
  spawnPrime(){
    const ev=this.event;if(!ev)return;
    const e=this.makeNpc('bossSibelon',{eventNpc:true,eventId:ev.eventId,forceChase:true,name:'RIFT TYRANT',scale:4.2,rewardMult:2.4,size:68,color:'#ff4f9a'});
    if(e){e.aggroRange=1800;e.attackRange=540;this.npcs.set(e.id,e);this.broadcast({type:'npc_spawn',entity:this.publicNpc(e)});}
  }
  spawnEventOres(count=12){
    const ev=this.event;if(!ev)return;const pool=['Prometium','Endurium','Terbium','Promerium'];
    for(let i=0;i<count;i++){const o=this.makeOre(pool[Math.floor(Math.random()*pool.length)],{eventOre:true,eventId:ev.eventId,amount:rand(12,26),r:rand(11,17)});this.ores.set(o.id,o);this.broadcast({type:'ore_spawn',ore:o});}
  }
  startConvoy(){
    const ev=this.event;if(!ev)return;const sx=420,sy=420,tx=this.map.world.w-420,ty=this.map.world.h-420;
    this.convoy={eventId:ev.eventId,x:sx,y:sy,sx,sy,tx,ty,totalDistance:Math.max(1,Math.hypot(tx-sx,ty-sy)),hp:900000,maxHp:900000,speed:105,lastHitAt:0};this.convoyRetryAt=0;
    this.nextEventWaveAt=nowMs()+3000;
  }

  eventPayload(){return this.event?{...this.event,convoy:this.convoy?{...this.convoy}:null}:null;}
  publicPlayer(p){
    if(!p)return null;
    return {userId:p.userId,callsign:p.callsign,faction:p.faction,shipId:p.shipId,level:p.level,x:p.x,y:p.y,angle:p.angle,hp:p.hp,maxHp:p.maxHp,shield:p.shield,maxShield:p.maxShield,updatedAt:p.updatedAt,
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
    p.x=clamp(msg.x,0,this.map.world.w);p.y=clamp(msg.y,0,this.map.world.h);p.angle=Number(msg.angle)||0;p.hp=Math.max(0,Number(msg.hp)||0);p.shield=Math.max(0,Number(msg.shield)||0);p.maxHp=Math.max(1,Number(msg.maxHp)||1);p.maxShield=Math.max(0,Number(msg.maxShield)||0);p.faction=String(msg.faction||p.faction||'earth');p.shipId=shortText(msg.shipId||p.shipId||'phoenix',40);p.level=Math.max(1,Number(msg.level)||1);
    p.laserFiring=!!msg.laserFiring;p.laserColor=safeColor(msg.laserColor,p.laserColor||'#76d9ff');p.laserAmmoId=shortText(msg.laserAmmoId||p.laserAmmoId||'lcb10',24);p.laserAmmoName=shortText(msg.laserAmmoName||p.laserAmmoName||'PLS-1',20);p.targetId=msg.targetId?shortText(msg.targetId,96):null;p.targetIsPlayer=!!msg.targetIsPlayer;
    const pet=msg.pet&&typeof msg.pet==='object'?msg.pet:null;
    if(pet?.owned){p.pet={owned:true,level:Math.max(1,Math.min(15,Number(pet.level)||1)),x:clamp(pet.x,0,this.map.world.w),y:clamp(pet.y,0,this.map.world.h),angle:Number(pet.angle)||0,activeGear:shortText(pet.activeGear||'off',24),laserTargetId:pet.laserTargetId?shortText(pet.laserTargetId,96):null,laserActive:!!pet.laserActive,laserColor:safeColor(pet.laserColor,p.laserColor)};}else p.pet={owned:false};
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
    if(this.playerSafe(p))return true;
    if(this.playerPortalNeutral(p)&&String(e?.aggroUserId||'')!==String(p.userId||''))return true;
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
    if(this.event?.id==='battle'&&!this.event.complete)this.addEventProgress(1);
    else if(e.eventNpc&&this.event?.eventId===e.eventId){
      if(this.event.id==='invasion')this.addEventProgress(1);
      if(this.event.id==='prime')this.addEventProgress(1);
    }
    if(e.eventNpc&&this.event?.eventId===e.eventId){
      if((this.event.id==='invasion'||this.event.id==='battle')&&!this.event.complete)this.respawns.push({kind:'eventNpc',type:e.type,at:nowMs()+rand(7000,12000),eventId:e.eventId});
    }else this.respawns.push({kind:'npc',type:e.type,at:nowMs()+rand(6000,13000)});
  }

  handleOreCollect(ws,msg){
    const p=ws.player,o=this.ores.get(String(msg.entityId||''));if(!p||!o)return;
    if(Math.hypot(p.x-o.x,p.y-o.y)>90)return safeJsonSend(ws,{type:'ore_collect_result',entityId:o.id,ok:false,reason:'range'});
    this.ores.delete(o.id);this.eventParticipants.add(p.userId);
    safeJsonSend(ws,{type:'ore_collected',ore:o});this.broadcast({type:'ore_remove',entityId:o.id,collectorUserId:p.userId},ws);
    if(o.eventOre&&this.event?.eventId===o.eventId&&this.event.id==='mining')this.addEventProgress(o.amount);
    if(!o.eventOre)this.oreRespawns.push({type:o.type,at:nowMs()+rand(5000,12000)});
    else if(this.event&&!this.event.complete&&this.event.id==='mining')this.oreRespawns.push({type:o.type,eventOre:true,eventId:o.eventId,amount:o.amount,at:nowMs()+rand(8000,14000)});
  }

  addEventProgress(amount){
    if(!this.event||this.event.complete)return;this.event.progress=Math.min(this.event.target,Math.max(0,this.event.progress+Math.max(0,Number(amount)||0)));if(this.event.progress>=this.event.target){this.event.complete=true;this.broadcastEvent(true);for(const c of this.clients){if(this.eventParticipants.has(c.player?.userId))safeJsonSend(c,{type:'event_credit',event:this.eventPayload()});}}else this.broadcastEvent(true);
  }

  tick(dt){
    this.ensureEvent(false);const now=nowMs();
    for(const e of this.npcs.values()){
      const locked=this.lockedAggroPlayer(e);const near=locked?{player:locked,dist:Math.hypot(locked.x-e.x,locked.y-e.y)}:this.nearestPlayer(e);e.angle+=(Number(e.drift)||0)*dt;if(!near)continue;const p=near.player,d=near.dist,dx=p.x-e.x,dy=p.y-e.y,force=!!e.forceChase,retaliating=String(e.aggroUserId||'')===String(p.userId||''),protectedNow=this.playerProtectedFromNpc(p,e);
      if(this.mapId==='x1'){
        const b=basePointForFaction(this.territoryFaction),bd=Math.hypot(e.x-b.x,e.y-b.y);if(bd<555){const ox=e.x-b.x,oy=e.y-b.y,od=Math.hypot(ox,oy)||1;e.x=b.x+ox/od*558;e.y=b.y+oy/od*558;}
      }
      if(!protectedNow&&(retaliating||force||d<e.aggroRange)&&d>e.attackRange*.8){const nd=Math.max(1,d);e.x=clamp(e.x+dx/nd*e.speed*dt,25,this.map.world.w-25);e.y=clamp(e.y+dy/nd*e.speed*dt,25,this.map.world.h-25);}else if(!force&&((!retaliating&&d>e.aggroRange)||protectedNow)){e.x=clamp(e.x+Math.cos(e.angle)*e.speed*.16*dt,25,this.map.world.w-25);e.y=clamp(e.y+Math.sin(e.angle)*e.speed*.16*dt,25,this.map.world.h-25);}
      const attackDelay=((String(e.type).startsWith('boss')?1.6:1.15)*(e.bossAttackScale||1))*1000;if(!protectedNow&&d<e.attackRange&&now-(e.lastShot||0)>=attackDelay){e.lastShot=now;const victim=[...this.clients].find(c=>c.player?.userId===p.userId);safeJsonSend(victim,{type:'npc_attack',entityId:e.id,damage:Math.max(1,Math.round(e.damage*rand(.92,1.12))),x:e.x,y:e.y,retaliation:retaliating,aggroUserId:e.aggroUserId||null});}
    }
    for(let i=this.respawns.length-1;i>=0;i--){const r=this.respawns[i];if(now<r.at)continue;this.respawns.splice(i,1);if(r.kind==='eventNpc'&&this.event?.eventId!==r.eventId)continue;const e=this.makeNpc(r.type,r.kind==='eventNpc'?{eventNpc:true,eventId:r.eventId,forceChase:true,rewardMult:1.22}:{});if(e){this.npcs.set(e.id,e);this.broadcast({type:'npc_spawn',entity:this.publicNpc(e)});}}
    for(let i=this.oreRespawns.length-1;i>=0;i--){const r=this.oreRespawns[i];if(now<r.at)continue;this.oreRespawns.splice(i,1);if(r.eventOre&&this.event?.eventId!==r.eventId)continue;const o=this.makeOre(r.type,r.eventOre?{eventOre:true,eventId:r.eventId,amount:r.amount}:{});this.ores.set(o.id,o);this.broadcast({type:'ore_spawn',ore:o});}
    if(this.event?.id==='invasion'&&!this.event.complete){const alive=[...this.npcs.values()].filter(e=>e.eventNpc&&e.eventId===this.event.eventId).length;if(alive<4)this.spawnEventWave(8-alive);}
    if(this.event?.id==='battle'&&!this.event.complete){const alive=[...this.npcs.values()].filter(e=>e.eventNpc&&e.eventId===this.event.eventId).length;if(alive<3)this.spawnEventWave(6-alive);}
    if(this.event?.id==='mining'&&!this.event.complete){const alive=[...this.ores.values()].filter(o=>o.eventOre&&o.eventId===this.event.eventId).length;if(alive<5)this.spawnEventOres(12-alive);}
    if(this.event?.id==='convoy'&&!this.event.complete){
      if(!this.convoy&&now>=this.convoyRetryAt)this.startConvoy();
      if(this.convoy){const c=this.convoy;const close=[...this.players.values()].filter(p=>Math.hypot(p.x-c.x,p.y-c.y)<950);if(close.length){for(const p of close)this.eventParticipants.add(p.userId);const dx=c.tx-c.x,dy=c.ty-c.y,d=Math.hypot(dx,dy);if(d>10){const step=Math.min(d,c.speed*dt);c.x+=dx/Math.max(1,d)*step;c.y+=dy/Math.max(1,d)*step;this.event.progress=Math.max(this.event.progress,Math.round((1-d/c.totalDistance)*100));}if(d<=14)this.addEventProgress(100-this.event.progress);}
        const nearby=[...this.npcs.values()].filter(e=>e.eventNpc&&e.hp>0&&Math.hypot(e.x-c.x,e.y-c.y)<270);if(nearby.length&&now-c.lastHitAt>800){c.lastHitAt=now;const dmg=nearby.reduce((sum,e)=>sum+Math.max(1000,e.damage*.12),0);c.hp=Math.max(0,c.hp-dmg);if(c.hp<=0){this.convoy=null;this.event.progress=0;this.convoyRetryAt=now+15000;this.broadcastEvent(true);}}
        if(now>=this.nextEventWaveAt){this.nextEventWaveAt=now+12000;this.spawnEventWave(3);}
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
        ws.room?.removeClient(ws);const r=world.room(msg.mapId,msg.territoryFaction);const p={userId:ws.identity.user.id,callsign:ws.identity.callsign||msg.callsign||'Pilot',faction:String(msg.faction||'earth'),shipId:String(msg.shipId||'phoenix'),level:Number(msg.level)||1,x:Number(msg.x)||400,y:Number(msg.y)||400,hp:Number(msg.hp)||1,maxHp:Number(msg.maxHp)||1,shield:Number(msg.shield)||0,maxShield:Number(msg.maxShield)||0,angle:Number(msg.angle)||0,laserFiring:false,laserColor:'#76d9ff',laserAmmoId:'lcb10',laserAmmoName:'PLS-1',targetId:null,targetIsPlayer:false,pet:{owned:false},updatedAt:nowMs()};r.addClient(ws,p);return;
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
