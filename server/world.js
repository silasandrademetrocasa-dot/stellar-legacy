import { idleNpcStep, shouldLeashNpc, NpcAggroWindow } from './npc-intelligence-v34.js';
import { perceptionPlayers, nearestPerceivedPlayer, turnNpcToward, selectAggroSuccessor } from './npc-intelligence-v343.js';
import { resolveLiveEvent } from './live-event-scheduler-v341.js';
import { eventControlProfile } from '../public/modules/event-control-profile-v3411.js';
import { eventStage, eventStageTuning, bossCombatTuning } from '../public/modules/event-evolution-v345.js';
import { randomUUID } from 'crypto';
import {admitNpcDamage} from './combat-throttle.js';
import {PORTAL_NEUTRAL_RADIUS,playerInNeutralPortalRange} from './portal-safety.js';
import {socketMessageAllowed,boundedVital} from './realtime-guard.js';
import { WebSocketServer, WebSocket } from 'ws';
import {selectLiveDirective,directiveToWorldEvent} from './universe-directives.js';
import {captureElapsedSeconds, classifyWarfrontCaptureError, withCaptureTimeout, CAPTURE_FAILURE_BACKOFF_MS} from './warfront-capture.js';
import { FACTIONS, MAPS, NPC_TYPES, RESOURCES } from '../public/data.js';
import { RELAY_BASE,RELAY_NEUTRAL_MODULES,applyRelayDamage } from './relay-domination-v346.js';

const LIVE_OPS_REFRESH_MS = 15000;

// V18.1.8 • NETWORK OPTIMIZATION
// A simulação segue em 20 Hz. Somente a frequência/quantidade de dados enviados pela rede é reduzida.
const NPC_BATCH_INTERVAL_MS = 125;       // Muito próximos: até 8 Hz; demais próximos: 4 Hz.
const NPC_MID_REFRESH_MS = 500;         // NPCs a distância intermediária: até 2 Hz.
const NPC_CLOSE_RADIUS_SQ = 1250 * 1250;
const NPC_FAST_RADIUS_SQ = 800 * 800; // Somente entidades dentro de 800u recebem 8 Hz.
const NPC_SOCKET_BACKPRESSURE_BYTES = 256 * 1024; // Descarta apenas frames de movimento sob rede congestionada.
const IDLE_ROOM_TTL_MS = 2 * 60 * 1000; // Desmontar salas sem jogadores após 2 minutos.
const NPC_FAR_REFRESH_MS = 2500;         // NPCs distantes recebem correção lenta para minimapa/consistência.
const NPC_NEAR_RADIUS = 2200;
const NPC_NEAR_RADIUS_SQ = NPC_NEAR_RADIUS * NPC_NEAR_RADIUS;
const PLAYER_STATE_MIN_MS = 80;
const MAX_TRAVEL_UNITS_PER_SECOND=1300; // tolera boost/lag, rejeita saltos impossíveis entre updates
const TRAVEL_GRACE_UNITS=250;          // Protege o servidor contra cliente transmitindo estado em excesso.
const EVENT_BROADCAST_INTERVAL_MS = 1000;
const WARFRONT_BROADCAST_INTERVAL_MS = 1000;

// ===================== V18.0 WARFRONT • SECTOR CONTROL =====================
const WARFRONT_CAPTURE_RADIUS=360;
const WARFRONT_CAPTURE_RATE=5.6; // ~18s solo para um ponto neutro.
const WARFRONT_DECAY_RATE=2.2;
const WARFRONT_FACTIONS=['earth','mars','jupiter'];
const WARFRONT_NODE_LAYOUT={
  b41:[['A','ALPHA',.26,.32],['B','BETA',.54,.52],['C','GAMMA',.79,.67]],
  b42:[['A','ALPHA',.23,.68],['B','BETA',.52,.38],['C','GAMMA',.78,.65]],
  b43:[['A','ALPHA',.22,.34],['B','BETA',.52,.66],['C','GAMMA',.80,.38]],
};
const WARFRONT_MAP_LABELS={b41:'4-1',b42:'4-2',b43:'4-3'};
const WARFRONT_FACTION_LABELS={earth:'TERRA',mars:'MARTE',jupiter:'JÚPITER'};
function warfrontMapLabel(mapId){return WARFRONT_MAP_LABELS[mapId]||String(mapId||'MAPA').toUpperCase();}
function warfrontFactionLabel(factionId){return WARFRONT_FACTION_LABELS[factionId]||String(factionId||'NEUTRO').toUpperCase();}
function warfrontNodesForMap(mapId,map){
  const layout=WARFRONT_NODE_LAYOUT[mapId]||[];
  return layout.map(([id,label,nx,ny])=>({id,label,x:Math.round(map.world.w*nx),y:Math.round(map.world.h*ny),radius:WARFRONT_CAPTURE_RADIUS,owner:null,challenger:null,progress:0,contested:false,nearby:{earth:0,mars:0,jupiter:0},capturedAt:0,lastControlAt:0,revision:0,persisting:false,retryAt:0,captureError:null}));
}

function clamp(n,min,max){ return Math.max(min,Math.min(max,Number(n)||0)); }
function rand(min,max){ return min + Math.random()*(max-min); }
function nowMs(){ return Date.now(); }
function safeColor(value,fallback='#76d9ff'){
  const v=String(value||'').trim();return /^#[0-9a-fA-F]{6}$/.test(v)?v:fallback;
}
function shortText(value,max=48){return String(value||'').replace(/[\r\n\t]/g,' ').trim().slice(0,max);}
function basePointForFaction(factionId,mapId='x1'){
  const w=(MAPS[mapId]||MAPS.x1).world.w,h=(MAPS[mapId]||MAPS.x1).world.h;
  if(factionId==='mars') return {x:w-620,y:Math.round(h*.28)};
  if(factionId==='jupiter') return {x:w-620,y:Math.round(h*.72)};
  return {x:620,y:Math.round(h*.50)};
}
function roomKey(mapId,territoryFaction){
  return /^x[1-8]$/.test(mapId) ? `${territoryFaction||'earth'}:${mapId}` : `battle:${mapId}`;
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
    this.map=this.world.mapDefinition(this.mapId)||MAPS.x1;
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
    this.nextEventBossAt=0;
    this.lastBroadcastAt=0;
    this.lastEventBroadcastAt=0;
    this.lastWarfrontBroadcastAt=0;
    this.warfrontFullController=null;
    this.warfrontControl=this.map.battle&&WARFRONT_NODE_LAYOUT[this.mapId]?{mapId:this.mapId,nodes:warfrontNodesForMap(this.mapId,this.map),startedAt:nowMs()}:null;
    this.warfrontSynced=!this.warfrontControl;
    this.warfrontSyncError=null;
    // A sala entra imediatamente. Capturas e pontuações só começam depois de ler o banco.
    // A consulta é assíncrona e nunca impede que eventos e NPCs apareçam no primeiro mapa.
    this.ready=this.warfrontControl?this.reconcileWarfrontState().catch(err=>{
      console.warn('[warfront-initial-sync]',this.mapId,String(err?.message||err).slice(0,160));
    }):Promise.resolve();
    this.lastWarfrontSyncAt=0;this.warfrontSyncing=false;
    this.generateBaseWorld();
    this.ensureEvent(true);
  }

  randomPosition(margin=160){
    const w=this.map.world.w,h=this.map.world.h;
    let x=rand(margin,w-margin),y=rand(margin,h-margin),tries=0;
    if(['x1','x8'].includes(this.mapId)) {
      const b=basePointForFaction(this.territoryFaction,this.mapId);
      while(Math.hypot(x-b.x,y-b.y)<700 && tries++<50){x=rand(margin,w-margin);y=rand(margin,h-margin);}
    }
    return {x,y};
  }

  makeNpc(type,opts={}){
    const base=this.world.npcDefinition(type); if(!base||base.enabled===false) return null;
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
      resources:{...(base.resources||{})},attackRange:Math.min(500,(battle?250:230)+base.size*5.8),aggroRange:1000,
      lastShot:0,angle:rand(0,Math.PI*2),drift:rand(.4,1.4),eventNpc:!!opts.eventNpc,eventId:opts.eventId||null,
      patrolHomeX:p.x,patrolHomeY:p.y,patrolReturning:false,
      forceChase:!!opts.forceChase,rarePatrol:!!opts.rarePatrol,damageContrib:new Map(),lastDamageAt:0,aggroUserId:null,aggroStartedAt:0,spawnedAt:nowMs(),
      ownerUserId:null,ownerGroupId:null,claimedAt:0,ownerGroupMemberIds:new Set(),ownerGroupPromise:null,
      _configScale:Number(opts.scale||1),_configRewardMult:Number(opts.rewardMult||1),_configSpeedMult:Number(opts.speedMult||1),_configColorOverride:opts.color||null,_configSizeOverride:opts.size||null
    };
    if(opts.x!=null)e.x=opts.x;if(opts.y!=null)e.y=opts.y;
    e.patrolHomeX=e.x;e.patrolHomeY=e.y;
    return e;
  }

  publicNpc(e){
    const {patrolHomeX,patrolHomeY,patrolReturning,damageContrib,ownerGroupMemberIds,ownerGroupPromise,_configScale,_configRewardMult,_configSpeedMult,_configColorOverride,_configSizeOverride,...rest}=e;
    return rest;
  }

  // Estado de rede compacto. Mantemos os dados completos no servidor, mas enviamos números quantizados.
  npcNetFrame(e){
    return {
      id:e.id,
      x:Math.round(Number(e.x)||0),
      y:Math.round(Number(e.y)||0),
      hp:Math.max(0,Math.round(Number(e.hp)||0)),
      shield:Math.max(0,Math.round(Number(e.shield)||0)),
      angle:Math.round((Number(e.angle)||0)*100)/100,
      bossPhase:Number(e.bossPhase)||0
    };
  }

  // Envia somente campos que realmente mudaram desde o último pacote daquele jogador.
  npcNetPatch(e,prev){
    const cur=this.npcNetFrame(e);
    if(!prev)return {cur,patch:cur};
    const patch={id:cur.id};
    if(cur.x!==prev.x)patch.x=cur.x;
    if(cur.y!==prev.y)patch.y=cur.y;
    if(cur.hp!==prev.hp)patch.hp=cur.hp;
    if(cur.shield!==prev.shield)patch.shield=cur.shield;
    if(cur.angle!==prev.angle)patch.angle=cur.angle;
    if(cur.bossPhase!==prev.bossPhase)patch.bossPhase=cur.bossPhase;
    return {cur,patch:Object.keys(patch).length>1?patch:null};
  }

  // Interest management: <800u = 8 Hz; <1250u = 4 Hz; médio = 2 Hz; longe = 0,4 Hz.
  sendNpcBatches(now){
    if(!this.clients.size)return;
    for(const c of this.clients){
      const p=c.player;if(!p)continue;
      // Backpressure: mensagens críticas seguem intactas, apenas este lote de movimento aguarda a rede.
      // Não alteramos npcNetState quando ignoramos o lote: o próximo envia o delta verdadeiro.
      if(c.bufferedAmount>NPC_SOCKET_BACKPRESSURE_BYTES)continue;
      c.npcNetState ||= new Map();
      const farRefresh=now-(c.lastNpcFarRefreshAt||0)>=NPC_FAR_REFRESH_MS;
      const midRefresh=now-(c.lastNpcMidRefreshAt||0)>=NPC_MID_REFRESH_MS;
      const nearRefresh=now-(c.lastNpcNearRefreshAt||0)>=250;
      const entities=[];
      for(const e of this.npcs.values()){
        const dx=e.x-p.x,dy=e.y-p.y,distSq=dx*dx+dy*dy;
        if(distSq>NPC_NEAR_RADIUS_SQ){if(!farRefresh)continue;}
        else if(distSq>NPC_CLOSE_RADIUS_SQ&&!midRefresh)continue;
        else if(distSq>NPC_FAST_RADIUS_SQ&&!nearRefresh)continue;
        const {cur,patch}=this.npcNetPatch(e,c.npcNetState.get(e.id));
        c.npcNetState.set(e.id,cur);
        if(patch)entities.push(patch);
      }
      if(nearRefresh)c.lastNpcNearRefreshAt=now;
      if(midRefresh)c.lastNpcMidRefreshAt=now;
      if(farRefresh){
        c.lastNpcFarRefreshAt=now;
        for(const id of c.npcNetState.keys())if(!this.npcs.has(id))c.npcNetState.delete(id);
      }
      if(entities.length)safeJsonSend(c,{type:'npc_batch',entities});
    }
  }

  makeOre(type=null,opts={}){
    const pool=this.world.resourcePool(this.mapId);
    let oreType=type;
    if(!oreType){
      const total=pool.reduce((sum,row)=>sum+Math.max(.01,Number(row.weight)||1),0);let roll=Math.random()*Math.max(.01,total);
      for(const row of pool){roll-=Math.max(.01,Number(row.weight)||1);if(roll<=0){oreType=row.resource_key;break;}}
      oreType ||= pool[0]?.resource_key || (this.map.ores||[])[0] || 'Prometium';
    }
    const p=this.randomPosition(120),res=this.world.resourceDefinition(oreType)||RESOURCES[oreType]||RESOURCES.Prometium;
    return {id:opts.id||`${opts.eventOre?'evtore':'ore'}_${randomUUID().slice(0,10)}`,x:p.x,y:p.y,type:oreType,amount:Math.max(1,Math.round(opts.amount??(opts.eventOre?1:this.map.oreYield||1))),color:res.color,r:opts.r||rand(6,10),rot:rand(0,Math.PI*2),shape:Array.from({length:7},()=>rand(.72,1.18)),eventOre:!!opts.eventOre,eventId:opts.eventId||null};
  }

  generateBaseWorld(){
    const groups=this.world.npcSpawnGroups(this.mapId);
    const rareGroup=groups.filter(g=>Number(g.count)>0).at(-1);
    for(const group of groups){
      const count=Math.max(0,Math.round(Number(group.count)||0));
      for(let i=0;i<count;i++){
        // A single rare patrol REPLACES one ordinary spawn on tier 2+ maps.
        // No extra NPC, extra reward, or map-wide performance cost.
        const rarePatrol=!this.map.battle&&Number(this.map.tier||1)>=2&&group===rareGroup&&i===0;
        const baseName=this.world.npcDefinition(group.type)?.name||String(group.type);
        const opts=rarePatrol?{rarePatrol:true,name:'PATRULHA RARA • '+baseName,color:'#ffd069',scale:1.15}:{};
        const e=this.makeNpc(group.type,opts);if(e)this.npcs.set(e.id,e);
      }
    }
    const raw=Number(this.map.oreCount);const oreCount=Number.isFinite(raw)?Math.max(0,Math.round(raw)):0;
    for(let i=0;i<oreCount;i++){const o=this.makeOre();this.ores.set(o.id,o);}
  }

  desiredNpcCount(type){
    const row=this.world.npcSpawnGroups(this.mapId).find(g=>String(g.type)===String(type));
    return Math.max(0,Math.round(Number(row?.count)||0));
  }

  nonEventNpcCount(type){
    let n=0;for(const e of this.npcs.values())if(!e.eventNpc&&String(e.type)===String(type)&&e.hp>0)n++;return n;
  }

  applyNpcRuntimeConfig(){
    // Atualiza NPCs vivos preservando a porcentagem atual de HP/escudo.
    for(const [id,e] of this.npcs){
      const base=this.world.npcDefinition(e.type);
      if(!base||base.enabled===false){if(!e.eventNpc&&!e.ownerUserId){this.npcs.delete(id);this.broadcast({type:'npc_remove',entityId:id,reason:'runtime_disabled'});}continue;}
      const scale=Math.max(.01,Number(e._configScale)||1),rewardMult=Math.max(0,Number(e._configRewardMult)||1),speedMult=Math.max(.01,Number(e._configSpeedMult)||1);
      const hpRatio=e.maxHp>0?e.hp/e.maxHp:1,shieldRatio=e.maxShield>0?e.shield/e.maxShield:1;
      e.maxHp=Math.max(1,Math.round(Number(base.hp)*scale));e.hp=Math.max(0,Math.min(e.maxHp,Math.round(e.maxHp*hpRatio)));
      e.maxShield=Math.max(0,Math.round(Number(base.shield||0)*scale));e.shield=Math.max(0,Math.min(e.maxShield,Math.round(e.maxShield*shieldRatio)));
      e.credits=Math.max(0,Math.round(Number(base.credits||0)*rewardMult));e.uridium=Math.max(0,Math.round(Number(base.uridium||0)*rewardMult));e.xp=Math.max(0,Math.round(Number(base.xp||0)*rewardMult));
      e.baseSpeed=Math.max(10,Math.round(Number(base.speed||10)*speedMult));e.baseDamage=Math.round(Number(base.damage||0)*Math.max(1,scale*.82));{const phase=Math.max(0,Math.min(2,Number(e.bossPhase)||0)),t=String(e.type||'').startsWith('boss')?bossCombatTuning(this.event?.id,phase):{speed:1,damage:1,attackDelay:1};e.speed=Math.round(e.baseSpeed*t.speed);e.damage=Math.round(e.baseDamage*t.damage);e.bossAttackScale=t.attackDelay;}
      e.name=e._configColorOverride?e.name:base.name;e.color=e._configColorOverride||base.color;e.size=e._configSizeOverride||base.size;e.resources={...(base.resources||{})};
      this.broadcast({type:'npc_patch',entity:{id:e.id,name:e.name,hp:e.hp,maxHp:e.maxHp,shield:e.shield,maxShield:e.maxShield,credits:e.credits,uridium:e.uridium,xp:e.xp,speed:e.speed,damage:e.damage,color:e.color,size:e.size,resources:e.resources}});
    }
    // Ajuste de população em tempo real: menos NPCs sem despawnar alvos já reivindicados.
    // Bosses/NPCs de evento não pertencem à densidade normal e não são afetados.
    this.respawns=this.respawns.filter(r=>r.kind!=='npc');
    const groups=this.world.npcSpawnGroups(this.mapId);
    const desired=new Map(groups.map(g=>[String(g.type),Math.max(0,Math.round(Number(g.count)||0))]));
    const types=new Set([...desired.keys(),...[...this.npcs.values()].filter(e=>!e.eventNpc).map(e=>String(e.type))]);
    for(const type of types){
      const current=[...this.npcs.values()].filter(e=>!e.eventNpc&&String(e.type)===type&&e.hp>0);
      let excess=current.length-(desired.get(type)||0);
      for(const e of current.reverse()){
        if(excess<=0)break;
        if(e.ownerUserId||nowMs()-Number(e.lastDamageAt||0)<15000)continue;
        this.npcs.delete(e.id);
        this.broadcast({type:'npc_remove',entityId:e.id,reason:'runtime_density'});
        excess--;
      }
    }
    for(const group of groups){
      const target=desired.get(String(group.type))||0,current=this.nonEventNpcCount(group.type);
      for(let i=current;i<target;i++){const e=this.makeNpc(group.type);if(e){this.npcs.set(e.id,e);this.broadcast({type:'npc_spawn',entity:this.publicNpc(e)});}}
    }
  }

  applyWorldRuntimeConfig(){
    this.map=this.world.mapDefinition(this.mapId)||MAPS.x1;
    const w=this.map.world?.w||6000,h=this.map.world?.h||4500;
    for(const p of this.players.values()){p.x=clamp(p.x,25,w-25);p.y=clamp(p.y,25,h-25);}
    for(const e of this.npcs.values()){e.x=clamp(e.x,25,w-25);e.y=clamp(e.y,25,h-25);}
    for(const o of this.ores.values()){o.x=clamp(o.x,25,w-25);o.y=clamp(o.y,25,h-25);const res=this.world.resourceDefinition(o.type);if(res)o.color=res.color;}
    // Quando o ADM troca os recursos permitidos, elimina imediatamente
    // pedras normais legadas; nunca remove minérios temporários de EVENTO.
    const allowedOres=new Set(this.world.resourcePool(this.mapId).map(r=>r.resource_key));
    for(const [id,ore] of this.ores){
      if(!ore.eventOre&&!allowedOres.has(ore.type)){
        this.ores.delete(id);this.broadcast({type:'ore_remove',entityId:id,reason:'resource_pool_changed'});
      }
    }
    const target=Math.max(0,Math.round(Number(this.map.oreCount)||0));
    const normal=[...this.ores.values()].filter(o=>!o.eventOre);
    if(normal.length>target){for(const o of normal.slice(target)){this.ores.delete(o.id);this.broadcast({type:'ore_remove',entityId:o.id,reason:'runtime_count'});}}
    else for(let i=normal.length;i<target;i++){const o=this.makeOre();this.ores.set(o.id,o);this.broadcast({type:'ore_spawn',ore:o});}
    this.oreRespawns=this.oreRespawns.filter(r=>r.eventOre);
    if(this.map.battle&&!this.warfrontControl){this.warfrontControl={mapId:this.mapId,nodes:warfrontNodesForMap(this.mapId,this.map),startedAt:nowMs()};this.warfrontSynced=false;this.reconcileWarfrontState().catch(()=>{});}
    if(!this.map.battle){this.warfrontControl=null;this.warfrontSynced=true;}
    if(this.clients.size)this.broadcast(this.snapshot());
  }

  currentEventDef(){ const live=this.world.currentEvent();if(live&&this.eventEligible(live))return live;return directiveToWorldEvent(selectLiveDirective(this.world.directives,this.mapId),this.mapId); }
  eventProfile(ev=this.event){return eventControlProfile(eventVariant(ev?.id),ev?.rules?.event_control);}
  eventMode(ev=this.event){return this.eventProfile(ev).mode;}
  eventStageNow(now=nowMs()){return eventStage(this.event,now,this.eventProfile().phaseCount??4);}
  eventTuningNow(now=nowMs()){return eventStageTuning(this.eventProfile(),this.eventStageNow(now));}
  eventEligible(ev){
    if(!ev)return false;
    const rules=ev.rules||{},mode=this.eventMode(ev);
    if(rules.battle_only)return !!this.map.battle;
    if(rules.normal_only&&this.map.battle)return false;
    if(Number(rules.min_tier||0)>Number(this.map.tier||0))return false;
    if(ev.source==='universe-directive')return !this.map.gate&&(mode!=='ore'||!this.map.battle);
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
    this.convoy=null;this.convoyRetryAt=0;this.nextEventWaveAt=0;this.lastEventStageIndex=-1;
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
    this.event={...ev,progress:0,complete:false,stage:0,stageName:'RECONHECIMENTO'};
    this.nextEventBossAt=0;
    this.lastEventStageIndex=-1;
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
    const stageTuning=this.eventTuningNow();let eliteBudget=stageTuning.eliteCount;
    const maxAlive=Math.max(1,Math.min(48,Number(profile.maxAlive)||Math.max(stageTuning.waveTarget,(Number(profile.minAlive)||3)*2)));
    // V34: bounded spawn work each tick. Never touch reward calculations.
    count=Math.max(0,Math.min(12,Math.max(0,Number(count)||0),maxAlive-alive));
    for(let i=0;i<count;i++){
      const type=pool[Math.floor(Math.random()*pool.length)],baseName=(this.world.npcDefinition(type)?.name||String(type||'NPC')).toUpperCase();
      const elite=eliteBudget>0 && (i===0 || i===2);if(elite)eliteBudget--;
      const e=this.makeNpc(type,{eventNpc:true,eventId:ev.eventId,forceChase:true,rewardMult,
        scale:(profile.scale||1)*(elite?1.16:1),color:elite?'#ffca6b':profile.color,size:profile.size,
        speedMult:profile.speedMult||1,name:elite?('ELITE '+(profile.namePrefix?profile.namePrefix+' ':'')+baseName):(profile.namePrefix?(profile.namePrefix+' '+baseName):undefined)});
      if(e){this.npcs.set(e.id,e);this.broadcast({type:'npc_spawn',entity:this.publicNpc(e)});}
    }
  }
  spawnPrime(){
    const ev=this.event;if(!ev)return;const profile=this.eventProfile(ev);
    const e=this.makeNpc(profile.bossType||'bossSibelon',{eventNpc:true,eventId:ev.eventId,forceChase:true,name:profile.bossName||'RIFT TYRANT',scale:profile.bossScale||4.2,rewardMult:profile.bossRewardMult||2.4,size:profile.bossSize||68,color:profile.bossColor||'#ff4f9a'});
    if(e){e.aggroRange=1000;e.attackRange=500;this.npcs.set(e.id,e);this.broadcast({type:'npc_spawn',entity:this.publicNpc(e)});}
  }
  spawnEventOres(count=12){
    const ev=this.event;if(!ev)return;const profile=this.eventProfile(ev),pool=Array.isArray(profile.orePool)&&profile.orePool.length?profile.orePool:['Prometium','Endurium','Terbium','Promerium'],amountRange=Array.isArray(profile.oreAmount)?profile.oreAmount:[12,26];
    const alive=[...this.ores.values()].filter(o=>o.eventOre&&o.eventId===ev.eventId).length;
    count=Math.max(0,Math.min(20,Math.floor(Number(count)||0),48-alive));
    for(let i=0;i<count;i++){const o=this.makeOre(pool[Math.floor(Math.random()*pool.length)],{eventOre:true,eventId:ev.eventId,amount:rand(amountRange[0],amountRange[1]),r:rand(8,12)});this.ores.set(o.id,o);this.broadcast({type:'ore_spawn',ore:o});}
  }
  startConvoy(){
    const ev=this.event;if(!ev)return;const profile=this.eventProfile(ev),sx=420,sy=420,tx=this.map.world.w-420,ty=this.map.world.h-420;
    this.convoy={eventId:ev.eventId,x:sx,y:sy,sx,sy,tx,ty,totalDistance:Math.max(1,Math.hypot(tx-sx,ty-sy)),hp:profile.convoyHp||900000,maxHp:profile.convoyHp||900000,speed:profile.convoySpeed||105,lastHitAt:0};this.convoyRetryAt=0;
    this.nextEventWaveAt=nowMs()+3000;
  }

  warfrontPayload(){
    if(!this.warfrontControl||!this.warfrontSynced)return null;
    const scores={earth:0,mars:0,jupiter:0};
    for(const n of this.warfrontControl.nodes)if(scores[n.owner]!==undefined)scores[n.owner]++;
    const ranked=WARFRONT_FACTIONS.map(id=>({id,score:scores[id]})).sort((a,b)=>b.score-a.score);
    const dominant=ranked[0].score>ranked[1].score?ranked[0].id:null;
    return {mapId:this.mapId,relayMode:this.warfrontControl.nodes.some(n=>n.relayMode===true),nodes:this.warfrontControl.nodes.map(n=>({relayMode:!!n.relayMode,ownerClanId:n.ownerClanId||null,hp:n.relayHp??0,maxHp:n.relayMaxHp||RELAY_BASE.hp,shield:n.relayShield??0,maxShield:n.relayMaxShield||RELAY_BASE.shield,protectedUntil:n.protectedUntil||0,modules:n.ownerClanId?(n.relayModules||[]):RELAY_NEUTRAL_MODULES,id:n.id,label:n.label,x:n.x,y:n.y,radius:n.radius,owner:n.owner,challenger:n.challenger,progress:Math.round(n.progress*10)/10,contested:!!n.contested,nearby:{...n.nearby},capturedAt:n.capturedAt||0,persisting:!!n.persisting,captureError:n.captureError&&nowMs()-(n.captureError.at||0)<30000?{code:n.captureError.code,message:n.captureError.message}:null})),scores,dominantFaction:dominant,serverTime:nowMs()};
  }
  async handleRelayAttack(ws,msg){
    const p=ws?.player,node=this.warfrontControl?.nodes?.find(n=>n.id===String(msg?.nodeId||''));
    if(!p||!node?.relayMode||!this.warfrontSynced||!this.playerFresh(p)||ws.identity?.user?.id!==p.userId)return;
    if(!p.clanId)return safeJsonSend(ws,{type:'relay_hit_result',ok:false,reason:'Entre em um clã antes de atacar relés.'});
    if(p.clanId&&node.ownerClanId===p.clanId)return safeJsonSend(ws,{type:'relay_hit_result',ok:false,reason:'Seu clã já domina este relé.'});
    const now=nowMs(),rules=node.relayRules||{};
    if(now<node.protectedUntil||node.relayHp<=0)return safeJsonSend(ws,{type:'relay_hit_result',ok:false,reason:'Estrutura protegida ou já destruída.'});
    if(Math.hypot(p.x-node.x,p.y-node.y)>RELAY_BASE.attackRange||this.playerPortalNeutral(p))return safeJsonSend(ws,{type:'relay_hit_result',ok:false,reason:'Aproxime-se do relé e saia da zona neutra.'});
    const cooldown=Math.max(400,Number(rules.hit_cooldown_ms)||RELAY_BASE.hitCooldownMs);
    if(now-(ws._relayHitAt||0)<cooldown||ws._relayBusy)return;
    ws._relayHitAt=now;ws._relayBusy=true;
    try{
      const damage=Math.max(100,Math.min(50000,Number(rules.hit_damage)||RELAY_BASE.hit));
      const result=await withCaptureTimeout(this.world.damageRelay(this.mapId,node.id,damage,p.userId),4500);
      if(result?.ok&&Number(result.revision)>=Number(node.relayRevision||0)){
        node.relayHp=Number(result.hp)||0;node.relayShield=Number(result.shield)||0;node.relayRevision=Number(result.revision)||0;
        this.broadcast({type:'relay_hit_fx',nodeId:node.id,userId:p.userId,x:node.x,y:node.y,actual:result.actual,shield:node.relayShield,hp:node.relayHp});
        this.broadcast({type:'warfront_control',warfront:this.warfrontPayload(),serverTime:nowMs()});
      }
      safeJsonSend(ws,{type:'relay_hit_result',...result,nodeId:node.id});
    }catch(e){safeJsonSend(ws,{type:'relay_hit_result',ok:false,reason:'Falha ao registrar o ataque. Tente novamente.'});}
    finally{ws._relayBusy=false;}
  }

  updateWarfrontControl(dt,now){
    // Sem confirmação de persistência, ninguém captura um relé em estado provisório.
    if(!this.warfrontControl||!this.warfrontSynced)return;
    let lastChange=null;
    for(const node of this.warfrontControl.nodes){
      // O dt geral da sala é limitado para proteger o combate. A captura, porém,
      // precisa acompanhar segundos REAIS, sem acelerar em períodos de inatividade.
      const captureDt=captureElapsedSeconds(node.lastControlAt,now);
      node.lastControlAt=now;
      const counts={earth:0,mars:0,jupiter:0};
      const candidates={earth:[],mars:[],jupiter:[]};
      for(const p of this.players.values()){
        const distance=Math.hypot(p.x-node.x,p.y-node.y);
        if(!this.playerFresh(p)||p.hp<=0||distance>node.radius)continue;
        if(counts[p.faction]!==undefined){counts[p.faction]++;candidates[p.faction].push({player:p,distance});}
      }
      for(const list of Object.values(candidates))list.sort((a,b)=>a.distance-b.distance);
      node.nearby=counts;
      if(node.persisting)continue;
      const active=WARFRONT_FACTIONS.filter(id=>counts[id]>0);
      // In relay combat, two unrelated clans from the same faction also contest.
      const clanCompetitors=node.relayMode?new Set([...this.players.values()].filter(p=>p.clanId&&this.playerFresh(p)&&Math.hypot(p.x-node.x,p.y-node.y)<=node.radius).map(p=>p.clanId)):null;
      node.contested=active.length>1||(node.relayMode&&clanCompetitors.size>1);
      if(node.contested)continue;
      if(active.length===1){
        const faction=active[0],weight=Math.max(1,Math.min(3,counts[faction]));
        if(node.relayMode && (node.relayHp>0 || now<Number(node.protectedUntil||0))){node.challenger=null;node.challengerClanId=null;node.progress=0;node.defenseEligible=false;continue;}
        if(node.relayMode&&!candidates[faction].some(v=>v.player.clanId && v.player.clanId!==node.ownerClanId)){node.challenger=null;node.challengerClanId=null;node.progress=0;continue;}
        if(node.relayMode?node.ownerClanId===candidates[faction][0]?.player.clanId:node.owner===faction){
          // Defesa real: um inimigo iniciou captura >=20%, recuou e a facção dona permaneceu.
          if(node.challenger&&node.challenger!==faction&&node.defenseEligible){
            const defender=candidates[faction][0]?.player;
            if(defender?.userId)this.world.recordWarDefense?.(this.mapId,node.id,faction,defender.userId).catch(err=>console.warn('Defesa:',err?.message));
          }
          node.challenger=null;node.challengerClanId=null;node.progress=0;node.defenseEligible=false;continue;
        }
        const relayChallenger=node.relayMode?candidates[faction].find(v=>v.player.clanId&&v.player.clanId!==node.ownerClanId)?.player.clanId:null;
        if(node.challenger!==faction||(node.relayMode&&node.challengerClanId!==relayChallenger)){node.challenger=faction;node.challengerClanId=relayChallenger;node.progress=0;node.defenseEligible=false;}
        if(now<Number(node.retryAt||0))continue; // Não inundar o banco se ele estiver indisponível.
        node.captureError=null;
        node.progress=Math.min(100,node.progress+(node.relayMode?100000/Math.max(5000,Number(node.relayRules?.capture_ms)||RELAY_BASE.neutralCaptureMs):WARFRONT_CAPTURE_RATE)*weight*captureDt);
        if(node.progress>=20)node.defenseEligible=true;
        if(node.progress>=100&&!node.persisting){
          // Só aplicar a mudança depois do COMMIT. Na falha, o dono antigo permanece.
          const actor=node.relayMode?candidates[faction].find(x=>x.player.clanId===node.challengerClanId)?.player:candidates[faction][0]?.player||null;
          if(!actor?.userId)continue;
          const formerOwner=node.owner,expectedRevision=node.revision||0;
          node.persisting=true;
          // Rede lenta não pode deixar uma captura eternamente pendente.
          withCaptureTimeout((node.relayMode?this.world.persistRelayCapture:this.world.persistCapture)(this.mapId,node.id,faction,expectedRevision,actor.userId)).then(row=>{
            node.owner=row.owner;
            node.revision=Number(row.revision)||expectedRevision+1;
            node.capturedAt=Date.parse(row.captured_at||'')||Date.now();
            if(node.relayMode){node.ownerClanId=actor.clanId;node.relayHp=node.relayMaxHp;node.relayShield=node.relayMaxShield;node.protectedUntil=Date.now()+(node.relayRules?.protection_ms||RELAY_BASE.protectionMs);node.relayModules=[];}
            node.progress=0;node.challenger=null;node.challengerClanId=null;node.defenseEligible=false;
            node.retryAt=0;node.captureError=null;
            const actorSocket=this.world.findClient(actor.userId);
            if(actorSocket?.room===this)safeJsonSend(actorSocket,{type:'warfront_capture_result',ok:true,mapId:this.mapId,nodeId:node.id,owner:row.owner,revision:node.revision});
            const change={type:'captured',node,faction,formerOwner,actor,allies:counts[faction]};
            this.world.broadcastGlobalAnnouncement({
              kind:'warfront_point',key:`warfront_point:${this.mapId}:${node.id}:${faction}:${node.revision}`,
              mapId:this.mapId,nodeId:node.id,nodeLabel:node.label,faction,
              actorUserId:actor.userId,actorCallsign:shortText(actor.callsign||'PILOTO',32),
              title:`⚔ WARFRONT • ${shortText(actor.callsign||'PILOTO',32)} CONQUISTOU ${node.id} • ${warfrontMapLabel(this.mapId)}`,
              subtitle:`${node.label} agora pertence à ${warfrontFactionLabel(faction)}`
            });
            this.world.recordEliteEvent?.(actor.userId,'sector_capture').catch(err=>console.warn('Elite capture:',err?.message));
            this.refreshWarfrontDomination(Date.now(),change);
            this.broadcast({type:'warfront_control',warfront:this.warfrontPayload(),serverTime:Date.now()});
          }).catch(async err=>{
            const problem=classifyWarfrontCaptureError(err);
            console.error('[warfront-capture-failed]',{mapId:this.mapId,nodeId:node.id,code:problem.code,detail:String(err?.message||err).slice(0,220)});
            // Uma resposta lenta pode gravar depois do timeout; consulte o banco
            // antes de apresentar falha ou autorizar outra tentativa.
            let confirmed=false;
            try{const rows=await withCaptureTimeout(this.world.loadWarfront(this.mapId),5000);const saved=rows.find(r=>r.node_id===node.id);
              if(saved){node.owner=saved.owner;node.revision=Number(saved.revision)||0;node.capturedAt=Date.parse(saved.captured_at||'')||0;
                if(saved.relay){node.ownerClanId=saved.relay.owner_clan_id||null;node.relayHp=Number(saved.relay.hp)||0;node.relayShield=Number(saved.relay.shield)||0;node.relayModules=saved.relay.modules||[];node.protectedUntil=Date.parse(saved.relay.protected_until||'')||0;}
                confirmed=saved.owner===faction&&Number(saved.revision)>expectedRevision&&String(saved.captured_by||'')===String(actor.userId);}
            }catch(lookupErr){console.warn('[warfront-capture-check]',String(lookupErr?.message||lookupErr).slice(0,160));}
            node.progress=0;node.challenger=null;node.challengerClanId=null;node.defenseEligible=false;
            if(confirmed){node.retryAt=0;node.captureError=null;this.refreshWarfrontDomination(Date.now(),null);}
            else{node.retryAt=Date.now()+CAPTURE_FAILURE_BACKOFF_MS;node.captureError={...problem,at:Date.now()};}
            const actorSocket=this.world.findClient(actor.userId);
            if(actorSocket?.room===this)safeJsonSend(actorSocket,{type:'warfront_capture_result',ok:confirmed,mapId:this.mapId,nodeId:node.id,owner:node.owner,revision:node.revision,...(confirmed?{}:problem)});
            const owners=this.warfrontControl.nodes.map(n=>n.owner);
            this.warfrontFullController=owners[0]&&owners.every(o=>o===owners[0])?owners[0]:null;
            this.broadcast({type:'warfront_control',warfront:this.warfrontPayload(),serverTime:Date.now()});
          }).finally(()=>{node.persisting=false;});
        }
      }else if(node.challenger&&node.progress>0){
        node.progress=Math.max(0,node.progress-WARFRONT_DECAY_RATE*captureDt);
        if(node.progress<=0){
          // Defesa somente após ameaça real >=20%, invasor ausente e defensor da facção presente.
          const defender=candidates[node.owner]?.[0]?.player;
          if(node.defenseEligible&&defender?.userId&&!node.contested){
            this.world.recordWarDefense?.(this.mapId,node.id,node.owner,defender.userId).catch(err=>console.warn('Defesa:',err?.message));
          }
          node.challenger=null;node.challengerClanId=null;node.defenseEligible=false;
        }
      }
    }
    // Two independently timed defensive weapons. Neutral relays have virtual LV1 equipment,
    // never deposited in any clan inventory or eligible for faction bonuses.
    for(const node of this.warfrontControl.nodes){
      if(!node.relayMode||!node.relayHp)continue;
      const weapons=(node.ownerClanId?node.relayModules:RELAY_NEUTRAL_MODULES).filter(m=>m.category==='weapon'&&[1,2].includes(Number(m.slot)));
      if(!weapons.length)continue;
      const hostile=[...this.clients].filter(c=>c.player&&this.playerFresh(c.player)&&(!node.ownerClanId||c.player.clanId!==node.ownerClanId)&&!this.playerPortalNeutral(c.player)&&Math.hypot(c.player.x-node.x,c.player.y-node.y)<=Math.min(RELAY_BASE.weaponRange,node.radius+150)).sort((a,b)=>Math.hypot(a.player.x-node.x,a.player.y-node.y)-Math.hypot(b.player.x-node.x,b.player.y-node.y))[0];
      if(!hostile)continue;
      node.relayTurretAt||={};
      for(const module of weapons){
        const missile=Number(module.slot)===2,cooldown=missile?3200:1150,slot=Number(module.slot);
        if(now-(node.relayTurretAt[slot]||0)<cooldown)continue;
        node.relayTurretAt[slot]=now;
        const lv=Math.min(3,Math.max(1,Number(module.level)||1));
        const damage=missile?1600+1000*lv:700+650*lv;
        safeJsonSend(hostile,{type:'relay_turret_attack',nodeId:node.id,x:node.x,y:node.y,damage,weapon:missile?'missile':'laser'});
        this.broadcast({type:'relay_turret_fx',nodeId:node.id,targetUserId:hostile.player.userId,x:node.x,y:node.y,weapon:missile?'missile':'laser'});
      }
    }
    this.refreshWarfrontDomination(now,lastChange);
    if(this.clients.size&&now-this.lastWarfrontBroadcastAt>=WARFRONT_BROADCAST_INTERVAL_MS){this.lastWarfrontBroadcastAt=now;this.broadcast({type:'warfront_control',warfront:this.warfrontPayload(),serverTime:now});}
  }
  async reconcileWarfrontState(){
    if(!this.warfrontControl||this.warfrontSyncing||this.warfrontControl.nodes.some(n=>n.persisting))return;
    this.warfrontSyncing=true;
    try{
      const rows=await withCaptureTimeout(this.world.loadWarfront(this.mapId),6500);
      if(!Array.isArray(rows)||rows.length!==this.warfrontControl.nodes.length)throw new Error('Relés incompletos no banco');
      const initial=!this.warfrontSynced;
      let changed=initial;
      for(const node of this.warfrontControl.nodes){
        const row=rows.find(x=>x.node_id===node.id);
        if(!row)throw new Error('Relé sem registro persistido');
        const revision=Number(row.revision)||0;
        const relayRevision=Number(row.relay?.revision)||0;
        const relaySignature=JSON.stringify(row.relay?.modules||[]);
        if(!initial&&revision<=Number(node.revision||0)&&relayRevision<=Number(node.relayRevision||0)&&relaySignature===node.relaySignature)continue;
        node.owner=WARFRONT_FACTIONS.includes(row.owner)?row.owner:null;
        node.revision=revision;node.capturedAt=Date.parse(row.captured_at||'')||0;
        node.relayMode=!!row.relay;node.relayRevision=relayRevision;node.relaySignature=relaySignature;
        node.ownerClanId=row.relay?.owner_clan_id||null;node.relayHp=Number(row.relay?.hp??0);node.relayShield=Number(row.relay?.shield??0);
        node.relayMaxHp=Number(row.relay?.max_hp)||RELAY_BASE.hp;node.relayMaxShield=Number(row.relay?.max_shield)||RELAY_BASE.shield;
        node.protectedUntil=Date.parse(row.relay?.protected_until||'')||0;node.relayModules=row.relay?.modules||[];node.relayRules=row.relay?.rules||null;
        node.progress=0;node.challenger=null;changed=true;
      }
      this.warfrontSynced=true;this.warfrontSyncError=null;
      if(changed){
        const owners=this.warfrontControl.nodes.map(n=>n.owner);
        this.warfrontFullController=owners[0]&&owners.every(o=>o===owners[0])?owners[0]:null;
        this.broadcast({type:'warfront_control',warfront:this.warfrontPayload(),serverTime:nowMs()});
      }
    }catch(err){
      this.warfrontSyncError=String(err?.message||err).slice(0,160);
      throw err; // o ciclo de 15 s tentará novamente sem expulsar jogadores da sala.
    }finally{this.warfrontSyncing=false;}
  }
  refreshWarfrontDomination(now,lastChange=null){
    if(!this.warfrontControl)return;
    const previousFull=this.warfrontFullController||null;
    const scores={earth:0,mars:0,jupiter:0};
    for(const n of this.warfrontControl.nodes)if(scores[n.owner]!==undefined)scores[n.owner]++;
    const currentFull=WARFRONT_FACTIONS.find(id=>scores[id]===this.warfrontControl.nodes.length)||null;
    if(previousFull&&currentFull!==previousFull){
      const breaker=lastChange?.faction&&lastChange.faction!==previousFull?lastChange.faction:null;
      const actor=lastChange?.actor||null;
      this.world.broadcastGlobalAnnouncement({
        kind:'warfront_break',
        key:`warfront_break:${this.mapId}:${previousFull}:${breaker||'unknown'}`,
        mapId:this.mapId,
        faction:breaker,
        formerFaction:previousFull,
        actorUserId:actor?.userId||null,
        actorCallsign:shortText(actor?.callsign||'',32),
        title:`⚠ DOMÍNIO ROMPIDO • ${warfrontMapLabel(this.mapId)}`,
        subtitle:breaker?`${warfrontFactionLabel(breaker)} quebrou o controle total da ${warfrontFactionLabel(previousFull)}${actor?.callsign?` • ${shortText(actor.callsign,32)}`:''}`:`O domínio da ${warfrontFactionLabel(previousFull)} foi quebrado`
      });
    }
    if(currentFull&&currentFull!==previousFull){
      const actor=lastChange?.actor||null;
      this.world.broadcastGlobalAnnouncement({
        kind:'warfront_domination',
        key:`warfront_domination:${this.mapId}:${currentFull}`,
        mapId:this.mapId,
        faction:currentFull,
        actorUserId:actor?.userId||null,
        actorCallsign:shortText(actor?.callsign||'',32),
        title:`🚨 DOMÍNIO TOTAL • ${warfrontMapLabel(this.mapId)} CONTROLADO PELA ${warfrontFactionLabel(currentFull)}`,
        subtitle:`3/3 relés conquistados${actor?.callsign?` • último ponto por ${shortText(actor.callsign,32)}`:''}`
      });
    }
    this.warfrontFullController=currentFull;
  }

  eventPayload(){if(!this.event)return null;const stage=this.eventStageNow();return {...this.event,stage:stage.number,stageTotal:stage.total,stageName:stage.label,stageProgress:stage.progress,convoy:this.convoy?{...this.convoy}:null};}
  publicPlayer(p){
    if(!p)return null;
    return {userId:p.userId,callsign:p.callsign,pilotTitle:p.pilotTitle||'Piloto Estelar',faction:p.faction,shipId:p.shipId,shipDesignId:p.shipDesignId||null,level:p.level,x:p.x,y:p.y,angle:p.angle,hp:p.hp,maxHp:p.maxHp,shield:p.shield,maxShield:p.maxShield,updatedAt:p.updatedAt,
      laserFiring:!!p.laserFiring,laserColor:p.laserColor||'#76d9ff',laserAmmoId:p.laserAmmoId||'lcb10',laserAmmoName:p.laserAmmoName||'PLS-1',targetId:p.targetId||null,targetIsPlayer:!!p.targetIsPlayer,
      pet:p.pet?{...p.pet}:null};
  }
  snapshot(viewerUserId=null){return {type:'world_snapshot',roomKey:this.key,mapId:this.mapId,territoryFaction:this.territoryFaction,npcs:[...this.npcs.values()].map(e=>this.publicNpc(e)),ores:[...this.ores.values()],players:[...this.players.values()].filter(p=>p.userId!==viewerUserId).map(p=>this.publicPlayer(p)),event:this.eventPayload(),globalEvent:this.world.currentEvent(),warfront:this.warfrontPayload(),serverTime:nowMs()};}
  broadcast(payload,exclude=null){
    if(!this.clients.size)return;
    const wire=JSON.stringify(payload); // Serializar apenas uma vez por sala.
    for(const c of this.clients){if(c===exclude||c.readyState!==WebSocket.OPEN)continue;try{c.send(wire);}catch{}}
  }
  broadcastEvent(force=false){const now=nowMs();if(!force&&now-this.lastEventBroadcastAt<EVENT_BROADCAST_INTERVAL_MS)return;this.lastEventBroadcastAt=now;this.broadcast({type:'event_update',event:this.eventPayload(),globalEvent:this.world.currentEvent(),serverTime:now});}
  // V18.2.6: progresso é individual, por EVENT ID + janela, persistido no Supabase.
  sendPersonalEventStatus(ws,ev=this.event){
    if(ev?.source==='universe-directive'||!ws?.identity?.accessToken||!ev?.eventId||!this.world.loadPlayerEventProgress)return;
    this.world.loadPlayerEventProgress(ws.identity.accessToken,ev.eventId)
      .then(data=>{if(data&&ws.readyState===WebSocket.OPEN&&ws.room?.event?.eventId===ev.eventId)
        safeJsonSend(ws,{type:'event_personal_update',eventId:ev.eventId,personal:data});})
      .catch(err=>console.warn('[event-status]',err?.message||err));
  }
  creditPersonalEvent(ws,ev,amount){
    if(ev?.source==='universe-directive'||!ws?.identity?.accessToken||!ev?.eventId||!this.world.recordPlayerEventProgress)return;
    this.world.recordPlayerEventProgress(ws.identity.accessToken,ev.eventId,amount)
      .then(data=>{if(data&&ws.readyState===WebSocket.OPEN&&ws.room?.event?.eventId===ev.eventId)
        safeJsonSend(ws,{type:'event_personal_update',eventId:ev.eventId,personal:data});})
      .catch(err=>{console.warn('[event-progress]',err?.message||err);safeJsonSend(ws,{type:'event_personal_error',eventId:ev.eventId,message:'Não foi possível salvar o evento. Tente novamente.'});});
  }

  addClient(ws,player){
    // Sala pode ter ficado em repouso: atualizar evento antes do snapshot de quem retornou.
    this.ensureEvent(false);
    this.clients.add(ws);this.players.set(player.userId,player);ws.room=this;ws.player=player;
    safeJsonSend(ws,this.snapshot(player.userId));
    this.sendPersonalEventStatus(ws);
    // Snapshot inicial já contém todos os NPCs: ele vira a base do delta para não reenviar tudo em seguida.
    ws.npcNetState=new Map([...this.npcs.values()].map(e=>[e.id,this.npcNetFrame(e)]));
    ws.lastNpcFarRefreshAt=nowMs();
    ws.lastNpcMidRefreshAt=nowMs();
    ws.lastNpcNearRefreshAt=nowMs();
    this.broadcast({type:'world_player_spawn',entity:this.publicPlayer(player)},ws);
  }
  removeClient(ws){
    if(!this.clients.has(ws))return;this.clients.delete(ws);if(ws.player)this.players.delete(ws.player.userId);if(ws.player)this.broadcast({type:'world_player_leave',userId:ws.player.userId});ws.room=null;ws.player=null;ws.npcNetState=null;ws.lastNpcFarRefreshAt=0;ws.lastNpcMidRefreshAt=0;ws.lastNpcNearRefreshAt=0;
  }
  updatePlayer(ws,msg){
    const p=ws.player;if(!p)return;
    const now=nowMs();if(now-(ws.lastPlayerStateAt||0)<PLAYER_STATE_MIN_MS)return;ws.lastPlayerStateAt=now;
    const nextX=clamp(msg.x,0,this.map.world.w),nextY=clamp(msg.y,0,this.map.world.h);
    const dt=Math.min(4,Math.max(.08,(now-Number(p.updatedAt||now))/1000));
    const maxDist=TRAVEL_GRACE_UNITS+MAX_TRAVEL_UNITS_PER_SECOND*dt;
    const requestedDist=Math.hypot(nextX-p.x,nextY-p.y);
    if(requestedDist>maxDist&&requestedDist>0){
      const ratio=maxDist/requestedDist;
      p.x+=((nextX-p.x)*ratio);p.y+=((nextY-p.y)*ratio);
      ws.motionAnomalies=(ws.motionAnomalies||0)+1;
      if(ws.motionAnomalies>=6&&(!ws.lastMotionWarningAt||now-ws.lastMotionWarningAt>60000)){
        ws.lastMotionWarningAt=now;
        this.world.recordSecurityViolation?.(p.userId,{code:'WORLD_MOVEMENT_ANOMALY',severity:'warn',evidence:{map:String(this.mapId),movement:Math.round(requestedDist)}},'world_motion').catch(()=>{});
      }
    }else{p.x=nextX;p.y=nextY;ws.motionAnomalies=Math.max(0,(ws.motionAnomalies||0)-1);}
    p.angle=boundedVital(msg.angle,{fallback:0,max:1e6,min:-1e6});p.maxHp=boundedVital(msg.maxHp,{fallback:Math.max(1,p.maxHp||1),max:1e12,min:1});p.maxShield=boundedVital(msg.maxShield,{fallback:p.maxShield||0,max:1e12});p.hp=Math.min(p.maxHp,boundedVital(msg.hp,{fallback:p.hp||0,max:1e12}));p.shield=Math.min(p.maxShield,boundedVital(msg.shield,{fallback:p.shield||0,max:1e12}));p.faction=p.faction||'earth';p.shipId=shortText(msg.shipId||p.shipId||'phoenix',40);p.shipDesignId=msg.shipDesignId?shortText(msg.shipDesignId,64):null;p.level=Math.max(1,Number(p.level)||1);p.pilotTitle=shortText(msg.pilotTitle||p.pilotTitle||'Piloto Estelar',64);
    p.laserFiring=!!msg.laserFiring;p.laserColor=safeColor(msg.laserColor,p.laserColor||'#76d9ff');p.laserAmmoId=shortText(msg.laserAmmoId||p.laserAmmoId||'lcb10',24);p.laserAmmoName=shortText(msg.laserAmmoName||p.laserAmmoName||'PLS-1',20);p.targetId=msg.targetId?shortText(msg.targetId,96):null;p.targetIsPlayer=!!msg.targetIsPlayer;
    const pet=msg.pet&&typeof msg.pet==='object'?msg.pet:null;
    if(pet?.owned){p.pet={owned:true,level:Math.max(1,Math.min(15,Number(pet.level)||1)),x:clamp(pet.x,0,this.map.world.w),y:clamp(pet.y,0,this.map.world.h),angle:Number(pet.angle)||0,activeGear:shortText(pet.activeGear||'off',24),laserTargetId:pet.laserTargetId?shortText(pet.laserTargetId,96):null,laserActive:!!pet.laserActive,laserColor:safeColor(pet.laserColor,p.laserColor),designId:pet.designId?shortText(pet.designId,64):null};}else p.pet={owned:false};
    p.updatedAt=now;
    this.broadcast({type:'world_player_patch',entity:this.publicPlayer(p)},ws);
  }
  playerSafe(p){
    if(!['x1','x8'].includes(this.mapId)||this.territoryFaction!==p.faction)return false;const b=basePointForFaction(this.territoryFaction,this.mapId);return Math.hypot(p.x-b.x,p.y-b.y)<=520;
  }
  playerPortalNeutral(p){
    return playerInNeutralPortalRange(p,this.world.portalsForRoom(this.mapId,this.territoryFaction),{mapId:this.mapId,battle:!!this.map?.battle});
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
      const next=selectAggroSuccessor(e.damageContrib,this.players,p=>this.playerFresh(p));
      if(next){e.aggroUserId=next.userId;e.aggroStartedAt=nowMs();return next;}e.aggroUserId=null;e.aggroStartedAt=0;
    }
    return null;
  }
  nearestPlayer(e){
    // Percepcao congelada por tick: protegidos/recem-desconectados sao
    // calculados uma unica vez, sem recalcular portais para cada NPC.
    return nearestPerceivedPlayer(e,this._npcPerceptionV343||perceptionPlayers(this.players.values(),{
      now:nowMs(),isProtected:p=>this.playerSafe(p)||this.playerPortalNeutral(p)
    }));
  }

  applyBossPhase(e){
    if(!String(e.type||'').startsWith('boss')||e.hp<=0)return;const total=Math.max(1,e.maxHp+e.maxShield),remain=Math.max(0,e.hp)+Math.max(0,e.shield),ratio=remain/total;let phase=0;if(ratio<=.33)phase=2;else if(ratio<=.66)phase=1;if(phase===e.bossPhase)return;e.bossPhase=phase;const tuning=bossCombatTuning(e.eventId?.includes('titan')?'titan':this.event?.id,phase);
    e.speed=Math.round(e.baseSpeed*tuning.speed);e.damage=Math.round(e.baseDamage*tuning.damage);e.bossAttackScale=tuning.attackDelay;
    // Reinforcements are tied to a boss HP phase transition, never to every damage packet.
    // Use the existing bounded wave spawner; no extra event rewards or duplicate claims.
    if(phase>0 && e.eventNpc && this.event?.eventId===e.eventId){
      const wanted=this.eventTuningNow().bossEscortCount;
      const alive=[...this.npcs.values()].filter(n=>n.eventNpc&&n.eventId===e.eventId&&n.id!==e.id&&n.hp>0).length;
      if(wanted>alive)this.spawnEventWave(Math.min(3,wanted-alive));
    }
  }

  async groupStateForWs(ws,force=false){
    if(!this.world.loadBattleGroup||!ws?.identity?.accessToken)return null;
    const now=nowMs(),cached=ws._battleGroupCache;
    if(!force&&cached&&now-cached.at<5000)return cached.state;
    try{const state=await this.world.loadBattleGroup(ws.identity.accessToken);ws._battleGroupCache={at:nowMs(),state};return state;}catch{return cached?.state||null;}
  }

  claimNpc(e,ws,p,now){
    if(e.ownerUserId)return;
    e.ownerUserId=p.userId;e.ownerGroupId=null;e.claimedAt=now;e.ownerGroupMemberIds=new Set([p.userId]);
    this.broadcast({type:'npc_claim',entityId:e.id,ownerUserId:e.ownerUserId,ownerGroupId:null,claimedAt:e.claimedAt});
    e.ownerGroupPromise=this.groupStateForWs(ws,false).then(st=>{
      if(e.ownerUserId!==p.userId)return;
      const gid=st?.group?.id?String(st.group.id):null;
      e.ownerGroupId=gid;
      e.ownerGroupMemberIds=new Set(gid?(st.members||[]).map(m=>String(m.user_id||'')).filter(Boolean):[p.userId]);
      e.ownerGroupMemberIds.add(p.userId);
      this.broadcast({type:'npc_claim',entityId:e.id,ownerUserId:e.ownerUserId,ownerGroupId:e.ownerGroupId,claimedAt:e.claimedAt});
    }).catch(()=>{});
  }

  async handleDamage(ws,msg){
    const p=ws.player,e=this.npcs.get(String(msg.entityId||''));if(!p||!e||e.hp<=0)return;
    const now=nowMs();
    if(!this.playerFresh(p)||String(ws.identity?.user?.id||'')!==String(p.userId))return;
    const hitPolicy=admitNpcDamage(ws,msg,now);
    if(!hitPolicy.allowed)return safeJsonSend(ws,{type:'damage_result',hitId:msg.hitId||null,entityId:e.id,actual:0,rejected:hitPolicy.reason});
    const dist=Math.hypot(p.x-e.x,p.y-e.y);if(dist>1450)return safeJsonSend(ws,{type:'damage_result',hitId:msg.hitId||null,entityId:e.id,actual:0,rejected:'range'});
    // Teto conservador: clientes nao ADM nao podem injetar golpes de 5M no NPC.
    // Evita false-positives em builds fortes; validar loadout no servidor e a proxima etapa.
    let amount=clamp(msg.damage,0,ws.identity?.isAdmin===true?5000000:2000000);if(amount<=0)return;
    const mode=String(msg.mode||'damage');const beforeShield=e.shield,beforeHp=e.hp;let actual=0;
    if(mode==='shield_drain'){
      actual=Math.min(e.shield,Math.round(amount));e.shield=Math.max(0,e.shield-actual);
    }else{
      let remain=Math.round(amount);if(e.shield>0){const got=Math.min(e.shield,remain);e.shield-=got;remain-=got;actual+=got;}if(remain>0){const got=Math.min(e.hp,remain);e.hp-=got;actual+=got;}
    }
    if(actual>0){this.claimNpc(e,ws,p,now);p.lastNpcAttackAt=now;ws.lastNpcAttackAt=now;this.world.markNpcActivity(p.userId,now);if(!e.aggroUserId){e.aggroUserId=p.userId;e.aggroStartedAt=now;this.broadcast({type:'npc_aggro',entityId:e.id,userId:p.userId});}e.damageContrib.set(p.userId,(e.damageContrib.get(p.userId)||0)+actual);e.lastDamageAt=now;this.eventParticipants.add(p.userId);this.applyBossPhase(e);}
    safeJsonSend(ws,{type:'damage_result',hitId:msg.hitId||null,entityId:e.id,actual,mode,critical:!!msg.critical,beforeShield,beforeHp,hp:e.hp,shield:e.shield,ownerUserId:e.ownerUserId,ownerGroupId:e.ownerGroupId});
    this.broadcast({type:'npc_patch',entity:{id:e.id,hp:e.hp,shield:e.shield,x:e.x,y:e.y,bossPhase:e.bossPhase,ownerUserId:e.ownerUserId,ownerGroupId:e.ownerGroupId,claimedAt:e.claimedAt}});
    if(e.hp<=0)await this.killNpc(e,p.userId);
  }

  async killNpc(e,killerUserId){
    if(!this.npcs.has(e.id))return;
    this.npcs.delete(e.id);
    try{await e.ownerGroupPromise;}catch{}
    const total=[...e.damageContrib.values()].reduce((a,b)=>a+b,0)||1;
    const contributors=[...e.damageContrib.entries()].map(([userId,damage])=>({userId,damage,share:damage/total}));
    const dead=this.publicNpc({...e,hp:0});
    this.broadcast({type:'npc_death',entity:dead,killerUserId,contributors,ownerUserId:e.ownerUserId,ownerGroupId:e.ownerGroupId});

    const ownerId=String(e.ownerUserId||'');
    const ownerClient=this.world.findClient(ownerId);
    const ownerRoomClient=[...this.clients].find(c=>String(c.player?.userId||'')===ownerId)||null;

    // V17.9.5: resolve o grupo ATUAL do primeiro atacante na hora da morte.
    // Assim membros que entraram/saíram durante uma luta longa não ficam presos a um snapshot antigo.
    let rewardGroupId=e.ownerGroupId||null;
    let rewardMemberIds=e.ownerGroupMemberIds instanceof Set?new Set(e.ownerGroupMemberIds):new Set([ownerId]);
    if(ownerClient){
      try{
        const liveGroup=await this.groupStateForWs(ownerClient,true);
        rewardGroupId=liveGroup?.group?.id?String(liveGroup.group.id):null;
        rewardMemberIds=new Set(rewardGroupId?(liveGroup.members||[]).map(m=>String(m.user_id||'')).filter(Boolean):[ownerId]);
        rewardMemberIds.add(ownerId);
      }catch{}
    }
    e.ownerGroupId=rewardGroupId;

    // this.clients = mesma instância real do mapa/território. Nenhuma recompensa atravessa salas.
    let candidateClients=[];
    if(rewardGroupId){
      candidateClients=[...this.clients].filter(c=>c.player&&rewardMemberIds.has(String(c.player.userId||'')));
    }else{
      candidateClients=[...this.clients].filter(c=>String(c.player?.userId||'')===ownerId);
    }
    const cutoff=nowMs()-120000;
    const eligible=candidateClients.filter(c=>{
      const uid=String(c.player?.userId||'');
      return Number(c.player?.hp||0)>0&&this.world.lastNpcActivity(uid)>=cutoff;
    });
    const factor=eligible.length?1/eligible.length:0;
    for(const c of eligible){
      // Apenas o abate validado pelo servidor gera progresso permanente de Elite.
      this.world.recordEliteEvent?.(c.player.userId,'npc_kill').catch(err=>console.warn('Elite NPC:',err?.message));
      const isOwner=String(c.player?.userId||'')===ownerId;
      // Somente a sala online define o NPC, a divisão e o ID do abate.
      // O Supabase confirma a concessão em transação idempotente ANTES de informar o cliente.
      const killKey=`${this.key}:${e.id}`.slice(0,180);
      try{
        const serverReward=await this.world.grantNpcReward(c.player.userId,killKey,String(e.type||'npc'),Math.max(0,Math.round((Number(e.credits)||0)*factor)),Math.max(0,Math.round((Number(e.uridium)||0)*factor)));
        this.world.recordRelayPve?.(c.player.userId,`npc:${this.key}:${e.id}:${c.player.userId}`,'npc').catch(()=>{});
        safeJsonSend(c,{type:'kill_credit',entity:dead,factor,serverReward,groupShared:!!rewardGroupId,eligibleCount:eligible.length,ownerUserId:ownerId,ownerGroupId:rewardGroupId||null,dropBox:isOwner});
      }catch(err){
        console.error('[npc-reward] falha no ledger',{npc:e.id,error:String(err?.message||err).slice(0,180)});
        safeJsonSend(c,{type:'npc_reward_error',entityId:e.id,message:'Recompensa econômica indisponível. Nenhum saldo foi adicionado pelo navegador.'});
      }
    }

    // A BOX nunca é compartilhada. Mesmo se o dono ficou inativo (>120s), ela continua sendo dele.
    if(ownerRoomClient&&!eligible.includes(ownerRoomClient))safeJsonSend(ownerRoomClient,{type:'npc_loot_credit',entity:dead,ownerUserId:ownerId});

    const mode=this.eventMode(),ev=this.event;
    if(ev && ((mode==='battle_wave'&&this.map.battle)||(e.eventNpc&&ev.eventId===e.eventId&&(mode==='wave'||mode==='boss')))){
      // Mesmos elegíveis do abate; cada conta avança UMA vez, independente da sala.
      for(const c of eligible)this.creditPersonalEvent(c,ev,1);
    }
    if(e.eventNpc&&this.event?.eventId===e.eventId&&mode==='boss')this.nextEventBossAt=nowMs()+25000;
    if(!e.eventNpc){const delay=this.world.npcRespawnDelay(e.type);if(this.desiredNpcCount(e.type)>0)this.respawns.push({kind:'npc',type:e.type,rarePatrol:!!e.rarePatrol,at:nowMs()+delay});}
  }

  async handleOreCollect(ws,msg){
    const p=ws.player,entityId=String(msg.entityId||''),o=this.ores.get(entityId);
    if(!p)return;
    if(!o)return safeJsonSend(ws,{type:'ore_collect_result',entityId,ok:false,reason:'missing'});
    const collector=msg.collector==='pet'?'pet':'ship';
    if(collector==='pet'){
      // AUX-9 equipado com EXTRATOR. A posição registrada pelo servidor vem de player_state.
      // A nave pode estar longe da pedra, mas o AUX deve alcançá-la de verdade.
      const pet=p.pet;
      if(!pet?.owned||pet.activeGear!=='ore')return safeJsonSend(ws,{type:'ore_collect_result',entityId,ok:false,reason:'pet_inactive'});
      const radar=this.map.battle?2200:1650;
      const collectRange=Math.max(300,radar*.5),tetherRange=Math.max(900,radar*.82)*1.25;
      const distanceToPlayer=Math.hypot(p.x-o.x,p.y-o.y);
      const distancePetPlayer=Math.hypot(pet.x-p.x,pet.y-p.y);
      const distancePetOre=Math.hypot(pet.x-o.x,pet.y-o.y);
      if(distanceToPlayer>collectRange+40||distancePetPlayer>tetherRange+40||distancePetOre>90)
        return safeJsonSend(ws,{type:'ore_collect_result',entityId,ok:false,reason:'pet_range'});
    }else if(Math.hypot(p.x-o.x,p.y-o.y)>90){
      return safeJsonSend(ws,{type:'ore_collect_result',entityId,ok:false,reason:'range'});
    }
    // A sala verifica existência/distância; o banco concede a carga em transação idempotente.
    // Remove primeiro da sala para impedir coleta concorrente, e restaura se o banco falhar.
    this.ores.delete(o.id);
    const oreKey=`${this.key}:${o.id}`.slice(0,180);
    let receipt;
    try {
      if(!this.world.grantOreReward)throw new Error('Concessão de minério indisponível.');
      receipt=await this.world.grantOreReward(p.userId,oreKey,o.type,Math.trunc(Number(o.amount)||0),this.mapId);
      if(!receipt||!Number.isSafeInteger(Number(receipt.revision))||Number(receipt.revision)<1)
        throw new Error('Minério não confirmado no banco.');
    } catch(err) {
      this.ores.set(o.id,o);
      console.warn('[ore-grant]',String(err?.message||err).slice(0,200));
      return safeJsonSend(ws,{type:'ore_collect_result',entityId,ok:false,reason:'persistence_error'});
    }
    if(receipt.granted===true)this.world.recordRelayPve?.(p.userId,`ore:${oreKey}:${p.userId}`,'ore').catch(()=>{});
    this.eventParticipants.add(p.userId);
    safeJsonSend(ws,{type:'ore_collected',ore:o,collector,reward:receipt});
    this.broadcast({type:'ore_remove',entityId:o.id,collectorUserId:p.userId},ws);
    const mode=this.eventMode();
    if(o.eventOre&&this.event?.eventId===o.eventId&&mode==='ore')this.creditPersonalEvent(ws,this.event,o.amount);
    if(!o.eventOre){const min=Math.max(1000,Number(this.map.oreRespawnMinMs)||5000),max=Math.max(min,Number(this.map.oreRespawnMaxMs)||12000);this.oreRespawns.push({type:o.type,at:nowMs()+rand(min,max)});}
  }

  addEventProgress(amount){
    if(!this.event)return;
    // Indicador de sala apenas: não pode finalizar o evento pessoal de outros pilotos.
    this.event.progress=Math.min(this.event.target,Math.max(0,this.event.progress+Math.max(0,Number(amount)||0)));
    this.broadcastEvent(true);
  }

  // Lightweight, server-authoritative patrol for unengaged common NPCs.
  applyIdlePatrolV34(e,dt){
    if(!shouldLeashNpc(e)){
      e.x=clamp(e.x+Math.cos(e.angle)*e.speed*.12*dt,25,this.map.world.w-25);
      e.y=clamp(e.y+Math.sin(e.angle)*e.speed*.12*dt,25,this.map.world.h-25);
      return;
    }
    const move=idleNpcStep(e,{dt,worldW:this.map.world.w,worldH:this.map.world.h});
    if(move.returning)e.angle=turnNpcToward(e.angle,e.x,e.y,move.x,move.y,dt,3.2);
    e.x=move.x;e.y=move.y;e.patrolReturning=move.returning;
  }

  tick(dt){
    this.ensureEvent(false);const now=nowMs();
    // Only build this lookup once per server tick; no change to combat/authority.
    const clientByUserId=new Map([...this.clients].filter(c=>c.player?.userId).map(c=>[String(c.player.userId),c]));
    // Jogadores elegiveis: snapshot reaproveitado por todos os NPCs neste tick.
    this._npcPerceptionV343=perceptionPlayers(this.players.values(),{
      now,isProtected:p=>this.playerSafe(p)||this.playerPortalNeutral(p)
    });
    this.updateWarfrontControl(dt,now);
    const activeEventId=this.event?.eventId||null;
    let staleNpc=false,staleOre=false;
    for(const [id,e] of this.npcs)if(e.eventNpc&&(!activeEventId||e.eventId!==activeEventId)){this.npcs.delete(id);staleNpc=true;}
    for(const [id,o] of this.ores)if(o.eventOre&&(!activeEventId||o.eventId!==activeEventId)){this.ores.delete(id);staleOre=true;}
    if(staleNpc||staleOre){this.respawns=this.respawns.filter(r=>r.kind!=='eventNpc');this.oreRespawns=this.oreRespawns.filter(r=>!r.eventOre);if(this.clients.size)this.broadcast(this.snapshot());}
    for(const e of this.npcs.values()){
      const locked=this.lockedAggroPlayer(e);const near=locked?{player:locked,dist:Math.hypot(locked.x-e.x,locked.y-e.y)}:this.nearestPlayer(e);
      e.angle+=(Number(e.drift)||0)*dt;
      // No player in acquisition range: ordinary NPCs patrol their spawn sector,
      // never drifting indefinitely toward map borders. Bosses/events are exempt.
      if(!near || (!locked && shouldLeashNpc(e) && near.dist>NpcAggroWindow(e))){this.applyIdlePatrolV34(e,dt);continue;}
      e.patrolReturning=false;
      // NPCs olham para o alvo durante perseguicao/combate, com curva suave.
      // A direcao e apenas visual: nao muda projeteis, distancia ou DPS.
      e.angle=turnNpcToward(e.angle,e.x,e.y,near.player.x,near.player.y,dt);
      const p=near.player,d=near.dist,dx=p.x-e.x,dy=p.y-e.y,force=!!e.forceChase,retaliating=String(e.aggroUserId||'')===String(p.userId||''),protectedNow=this.playerProtectedFromNpc(p,e),neutralX1=['x1','x8'].includes(this.mapId)&&!retaliating;
      if(['x1','x8'].includes(this.mapId)) {
        const b=basePointForFaction(this.territoryFaction,this.mapId),bd=Math.hypot(e.x-b.x,e.y-b.y);if(bd<555){const ox=e.x-b.x,oy=e.y-b.y,od=Math.hypot(ox,oy)||1;e.x=b.x+ox/od*558;e.y=b.y+oy/od*558;}
      }
      if(neutralX1&&!protectedNow){
        const passiveStand=Math.max(180,e.attackRange*.72);
        if(d<=e.aggroRange&&d>passiveStand){const nd=Math.max(1,d);e.x=clamp(e.x+dx/nd*e.speed*.72*dt,25,this.map.world.w-25);e.y=clamp(e.y+dy/nd*e.speed*.72*dt,25,this.map.world.h-25);}
        else if(d>e.aggroRange){e.x=clamp(e.x+Math.cos(e.angle)*e.speed*.16*dt,25,this.map.world.w-25);e.y=clamp(e.y+Math.sin(e.angle)*e.speed*.16*dt,25,this.map.world.h-25);}
      }else if(!protectedNow&&!neutralX1&&d<=e.aggroRange&&d>e.attackRange*.8){const nd=Math.max(1,d);e.x=clamp(e.x+dx/nd*e.speed*dt,25,this.map.world.w-25);e.y=clamp(e.y+dy/nd*e.speed*dt,25,this.map.world.h-25);}else if(d>e.aggroRange||protectedNow){e.x=clamp(e.x+Math.cos(e.angle)*e.speed*.16*dt,25,this.map.world.w-25);e.y=clamp(e.y+Math.sin(e.angle)*e.speed*.16*dt,25,this.map.world.h-25);}
      const attackDelay=((String(e.type).startsWith('boss')?1.6:1.15)*(e.bossAttackScale||1))*1000;if(!protectedNow&&!neutralX1&&d<e.attackRange&&now-(e.lastShot||0)>=attackDelay){e.lastShot=now;const victim=clientByUserId.get(String(p.userId));safeJsonSend(victim,{type:'npc_attack',entityId:e.id,damage:Math.max(1,Math.round(e.damage*rand(.92,1.12))),x:e.x,y:e.y,retaliation:retaliating,aggroUserId:e.aggroUserId||null});}
    }
    for(let i=this.respawns.length-1;i>=0;i--){const r=this.respawns[i];if(now<r.at)continue;this.respawns.splice(i,1);if(r.kind==='eventNpc'&&this.event?.eventId!==r.eventId)continue;if(r.kind==='npc'&&this.nonEventNpcCount(r.type)>=this.desiredNpcCount(r.type))continue;const profile=r.kind==='eventNpc'?this.eventProfile():null,baseName=(this.world.npcDefinition(r.type)?.name||String(r.type||'NPC')).toUpperCase();const e=this.makeNpc(r.type,r.kind==='eventNpc'?{eventNpc:true,eventId:r.eventId,forceChase:true,rewardMult:profile?.rewardMult||1.22,scale:profile?.scale||1,color:profile?.color,size:profile?.size,speedMult:profile?.speedMult||1,name:profile?.namePrefix?(profile.namePrefix+' '+baseName):undefined}:(r.rarePatrol?{rarePatrol:true,name:'PATRULHA RARA • '+baseName,color:'#ffd069',scale:1.15}:{}));if(e){this.npcs.set(e.id,e);this.broadcast({type:'npc_spawn',entity:this.publicNpc(e)});}}
    for(let i=this.oreRespawns.length-1;i>=0;i--){const r=this.oreRespawns[i];if(now<r.at)continue;this.oreRespawns.splice(i,1);if(r.eventOre&&this.event?.eventId!==r.eventId)continue;const o=this.makeOre(r.type,r.eventOre?{eventOre:true,eventId:r.eventId,amount:r.amount}:{});this.ores.set(o.id,o);this.broadcast({type:'ore_spawn',ore:o});}
    if(this.event&&!this.event.complete){
      const profile=this.eventProfile(),mode=profile.mode,stage=this.eventStageNow(now),tuning=eventStageTuning(profile,stage);
      if(stage.index!==this.lastEventStageIndex){
        this.lastEventStageIndex=stage.index;this.event.stage=stage.number;this.event.stageName=stage.label;
        // Transitions are server-driven; only one broadcast per boundary.
        this.broadcastEvent(true);
      }
      if(mode==='wave'||mode==='battle_wave'){
        const alive=[...this.npcs.values()].filter(e=>e.eventNpc&&e.eventId===this.event.eventId).length,minimum=Math.min(12,(profile.minAlive||3)+Math.min(2,stage.index)),targetWave=tuning.waveTarget;
        if(alive<minimum&&(!profile.waveRespawnMs||now>=this.nextEventWaveAt)){this.spawnEventWave(Math.max(1,targetWave-alive));if(profile.waveRespawnMs)this.nextEventWaveAt=now+profile.waveRespawnMs;}
      }
      // O BOSS retorna após 25s para permitir que outros pilotos concluam a mesma janela.
      // Quem já recebeu o prêmio continua bloqueado pelo registro pessoal no banco.
      if(mode==='boss'&&now>=this.nextEventBossAt&&!([...this.npcs.values()].some(e=>e.eventNpc&&e.eventId===this.event.eventId&&e.hp>0&&String(e.type||'').startsWith('boss')))){
        this.spawnPrime();this.nextEventBossAt=now+25000;
      }
      if(mode==='ore'){
        const alive=[...this.ores.values()].filter(o=>o.eventOre&&o.eventId===this.event.eventId).length,minimum=Math.min(16,(profile.oreRespawnMin||5)+stage.index*2),targetCount=tuning.oreTarget;
        if(alive<minimum)this.spawnEventOres(Math.max(1,targetCount-alive));
      }
      if(mode==='convoy'){
        if(!this.convoy&&now>=this.convoyRetryAt)this.startConvoy();
        if(this.convoy){const c=this.convoy;c.speed=Math.round((profile.convoySpeed||105)*tuning.convoySpeedScale);const close=[...this.players.values()].filter(p=>Math.hypot(p.x-c.x,p.y-c.y)<950);if(close.length){for(const p of close)this.eventParticipants.add(p.userId);const dx=c.tx-c.x,dy=c.ty-c.y,d=Math.hypot(dx,dy);if(d>10){const step=Math.min(d,c.speed*dt);c.x+=dx/Math.max(1,d)*step;c.y+=dy/Math.max(1,d)*step;this.event.progress=Math.max(this.event.progress,Math.round((1-d/c.totalDistance)*100));}if(d<=14){
        const current=this.event;
        this.addEventProgress(100-this.event.progress);
        for(const cws of this.clients){const pilot=cws.player;if(pilot&&Math.hypot(pilot.x-c.x,pilot.y-c.y)<950)this.creditPersonalEvent(cws,current,100);}
        this.convoy=null;this.convoyRetryAt=now+15000;
      }}
          const nearby=[...this.npcs.values()].filter(e=>e.eventNpc&&e.hp>0&&Math.hypot(e.x-c.x,e.y-c.y)<270);if(nearby.length&&now-c.lastHitAt>800){c.lastHitAt=now;const dmg=nearby.reduce((sum,e)=>sum+Math.max(1000,e.damage*.12),0);c.hp=Math.max(0,c.hp-dmg);if(c.hp<=0){this.convoy=null;this.event.progress=0;this.convoyRetryAt=now+15000;this.broadcastEvent(true);}}
          if(now>=this.nextEventWaveAt){this.nextEventWaveAt=now+(profile.waveRespawnMs||12000);this.spawnEventWave(profile.waveCount||3);}
        }
      }
    }
    if(now-this.lastBroadcastAt>=NPC_BATCH_INTERVAL_MS){this.lastBroadcastAt=now;this.sendNpcBatches(now);}
    this.broadcastEvent(false);
  }
}

export function attachSharedUniverse(server,{authenticate,authorizeJoin,recordSecurityViolation,loadLiveOps,loadBattleGroup,loadNpcConfig,loadWorldConfig,loadPlayerEventProgress,recordPlayerEventProgress,loadWarfront,persistCapture,persistRelayCapture,damageRelay,loadActorClan,recordRelayPve,recordEliteEvent,recordWarDefense,loadWorldDirectives,grantNpcReward,grantOreReward}){
  const wss=new WebSocketServer({
    server,
    path:'/ws',
    maxPayload:64*1024, // no JSON do jogo requer payload maior; bloqueia floods grandes
    perMessageDeflate:{
      threshold:512,
      concurrencyLimit:5,
      zlibDeflateOptions:{level:3}
    }
  });const rooms=new Map();
  const world={
    recordSecurityViolation,
    recordWarDefense:recordWarDefense||(()=>Promise.resolve(false)),
    damageRelay:damageRelay||(()=>Promise.reject(new Error("SQL V34.6 pendente"))),
    persistRelayCapture:persistRelayCapture||(()=>Promise.reject(new Error("SQL V34.6 pendente"))),
    loadActorClan:loadActorClan||(()=>Promise.resolve(null)),
    recordRelayPve:recordRelayPve||(()=>Promise.resolve(false)),
    loadWarfront:loadWarfront||(()=>Promise.reject(new Error('Sem conexão com o banco de relés'))),
    persistCapture:persistCapture||(()=>Promise.reject(new Error('Sem gravação de relés'))),
    recordEliteEvent:recordEliteEvent||(()=>Promise.resolve()),
    grantNpcReward:grantNpcReward||(()=>Promise.reject(new Error('Recompensa NPC não configurada no servidor'))),
    grantOreReward:grantOreReward||(()=>Promise.reject(new Error('Pagamento de minério não configurado no servidor'))),
    directives:[],lastDirectivesAt:0,directivesBusy:false,
    liveOps:{events:[],catalog:[],server_time:0},
    lastLiveOpsAt:0,
    liveOpsBusy:false,
    npcRuntime:{version:0,updatedAt:null,npcs:new Map(),spawns:new Map(),source:'fallback'},
    lastNpcConfigAt:0,
    npcConfigBusy:false,
    worldRuntime:{version:0,updatedAt:null,maps:new Map(),resources:new Map(),mapResources:new Map(),sectors:new Map(),portals:[],source:'fallback'},
    lastWorldConfigAt:0,
    worldConfigBusy:false,
    mapDefinition(mapId){return this.worldRuntime?.maps?.get?.(String(mapId||''))||MAPS[String(mapId||'')]||null;},
    resourceDefinition(key){return this.worldRuntime?.resources?.get?.(String(key||''))||RESOURCES[String(key||'')]||null;},
    resourcePool(mapId){const id=String(mapId||'');if(this.mapDefinition(id)?.battle)return [];const rows=this.worldRuntime?.mapResources?.get?.(id);if(Array.isArray(rows)&&rows.length)return rows.filter(r=>r.enabled!==false&&this.resourceDefinition(r.resource_key)?.enabled!==false);return (MAPS[id]?.ores||[]).map(resource_key=>({resource_key,weight:1,enabled:true}));},
    sectorForRoom(mapId,territoryFaction){const rows=[...this.worldRuntime.sectors.values()].filter(x=>x.enabled!==false&&String(x.map_id)===String(mapId));if(!rows.length)return null;if(MAPS[mapId]?.battle||this.mapDefinition(mapId)?.battle)return rows[0]||null;return rows.find(x=>String(x.territory_faction||'')===String(territoryFaction||''))||rows[0]||null;},
    portalEdgePoint(fromSector,toSector,map){const a=this.worldRuntime.sectors.get(String(fromSector||'')),b=this.worldRuntime.sectors.get(String(toSector||''));const w=map?.world?.w||6000,h=map?.world?.h||4500,inset=175,cx=w/2,cy=h/2;if(!a||!b)return{x:cx,y:cy};const vx=((Number(b.graph_x)-Number(a.graph_x))/100)*w,vy=((Number(b.graph_y)-Number(a.graph_y))/100)*h,ax=Math.abs(vx),ay=Math.abs(vy),tx=ax>0?(cx-inset)/ax:Infinity,ty=ay>0?(cy-inset)/ay:Infinity,t=Math.max(0,Math.min(tx,ty));return{x:Math.round(Math.max(inset,Math.min(w-inset,cx+vx*t))),y:Math.round(Math.max(inset,Math.min(h-inset,cy+vy*t)))};},
    portalsForRoom(mapId,territoryFaction){territoryFaction=({'b41':'earth','b42':'mars','b43':'jupiter'})[mapId]||territoryFaction;const origin=this.sectorForRoom(mapId,territoryFaction);if(!origin)return MAPS[mapId]?.portals||[];const map=this.mapDefinition(mapId)||MAPS.x1,out=[];for(const link of this.worldRuntime.portals){if(link.enabled===false)continue;let target=null;if(link.from_sector===origin.sector_label)target=link.to_sector;else if(link.bidirectional!==false&&link.to_sector===origin.sector_label)target=link.from_sector;if(!target)continue;const dest=this.worldRuntime.sectors.get(target);if(!dest||dest.enabled===false)continue;// Portais entre 4-1/4-2/4-3 são livres; acesso aos setores territoriais continua restrito.
      if(dest.territory_faction&&dest.territory_faction!==territoryFaction)continue;const pos=this.portalEdgePoint(origin.sector_label,target,map);if(mapId==='x8'){
        const w=map.world?.w||10000,h=map.world?.h||7400;
        const base=territoryFaction==='earth'?{x:620,y:Math.round(h*.50)}:territoryFaction==='mars'?{x:w-620,y:Math.round(h*.28)}:{x:w-620,y:Math.round(h*.72)};
        pos.x=base.x<w/2?w-420:420;pos.y=Math.round(base.y<h/2?h*.74:h*.26);
      }out.push({...pos,to:dest.map_id,targetLabel:target,targetTerritoryFaction:dest.territory_faction||null,battle:!!this.mapDefinition(dest.map_id)?.battle});}return out;},
    loadBattleGroup:loadBattleGroup||null,
    loadPlayerEventProgress:loadPlayerEventProgress||null,
    recordPlayerEventProgress:recordPlayerEventProgress||null,
    npcActivity:new Map(),
    announcementCooldowns:new Map(),
    npcDefinition(type){
      const key=String(type||''),live=this.npcRuntime?.npcs?.get?.(key),fallback=NPC_TYPES[key]||null;
      return live||fallback;
    },
    npcSpawnGroups(mapId){
      const key=String(mapId||''),rows=this.npcRuntime?.spawns?.get?.(key);
      if(this.npcRuntime?.version>0&&Array.isArray(rows))return rows.filter(r=>r.enabled!==false&&Number(r.count)>0&&this.npcDefinition(r.type)?.enabled!==false).map(r=>({type:r.type,count:Math.max(0,Math.round(Number(r.count)||0))}));
      const map=MAPS[key]||MAPS.x1,mult=Math.max(1,Number(map.enemyMultiplier)||1);
      return (map.enemyGroups||[]).map(g=>({type:g.type,count:Math.max(1,Math.round((Number(g.count)||0)*mult))}));
    },
    npcRespawnDelay(type){
      const n=this.npcDefinition(type)||{},min=Math.max(1000,Number(n.respawn_min_ms)||6000),max=Math.max(min,Number(n.respawn_max_ms)||13000);return rand(min,max);
    },
    async refreshNpcConfig(force=false){
      const now=nowMs();if(!loadNpcConfig)return this.npcRuntime;if(!force&&this.lastNpcConfigAt&&now-this.lastNpcConfigAt<12000)return this.npcRuntime;if(this.npcConfigBusy)return this.npcRuntime;this.npcConfigBusy=true;
      try{
        const raw=await loadNpcConfig();
        if(raw&&Array.isArray(raw.npcs)&&Array.isArray(raw.spawns)){
          const nextVersion=Math.max(0,Number(raw.version)||0),changed=nextVersion!==Number(this.npcRuntime.version);
          const npcs=new Map();for(const row of raw.npcs){if(!row?.npc_key)continue;npcs.set(String(row.npc_key),{...row,name:shortText(row.name||row.npc_key,64),hp:Math.max(1,Number(row.hp)||1),shield:Math.max(0,Number(row.shield)||0),credits:Math.max(0,Number(row.credits)||0),uridium:Math.max(0,Number(row.stl)||0),xp:Math.max(0,Number(row.xp)||0),speed:Math.max(1,Number(row.speed)||1),damage:Math.max(0,Number(row.damage)||0),color:safeColor(row.color,'#ff755d'),size:Math.max(4,Number(row.size)||18),resources:row.resources&&typeof row.resources==='object'?row.resources:{},respawn_min_ms:Math.max(1000,Number(row.respawn_min_ms)||6000),respawn_max_ms:Math.max(1000,Number(row.respawn_max_ms)||13000),enabled:row.enabled!==false});}
          const spawns=new Map();for(const row of raw.spawns){const mapId=String(row?.map_id||''),type=String(row?.npc_key||'');if(!MAPS[mapId]||!type)continue;if(!spawns.has(mapId))spawns.set(mapId,[]);spawns.get(mapId).push({type,count:Math.max(0,Math.round(Number(row.spawn_count)||0)),enabled:row.enabled!==false});}
          this.npcRuntime={version:nextVersion,updatedAt:raw.updated_at||null,npcs,spawns,source:'supabase'};this.lastNpcConfigAt=nowMs();
          if(changed){for(const r of rooms.values())r.applyNpcRuntimeConfig();console.info(`[npc-config] v${nextVersion} aplicado • ${npcs.size} NPCs`);}
        }
      }catch(err){this.lastNpcConfigAt=nowMs();console.warn('NPC runtime refresh failed; mantendo fallback/cache atual:',err?.message||err);}
      finally{this.npcConfigBusy=false;}
      return this.npcRuntime;
    },
    async refreshWorldConfig(force=false){
      const now=nowMs();if(!loadWorldConfig)return this.worldRuntime;if(!force&&this.lastWorldConfigAt&&now-this.lastWorldConfigAt<15000)return this.worldRuntime;if(this.worldConfigBusy)return this.worldRuntime;this.worldConfigBusy=true;
      try{
        const raw=await loadWorldConfig();
        if(raw&&Array.isArray(raw.maps)&&Array.isArray(raw.resources)&&Array.isArray(raw.sectors)&&Array.isArray(raw.portals)){
          const nextVersion=Math.max(0,Number(raw.version)||0),changed=nextVersion!==Number(this.worldRuntime.version);
          const resources=new Map();for(const row of raw.resources){if(!row?.resource_key)continue;const key=String(row.resource_key),obj={id:key,name:shortText(row.name||key,48),color:safeColor(row.color,'#ffffff'),sell:Math.max(0,Number(row.sell_price)||0),enabled:row.enabled!==false};resources.set(key,obj);RESOURCES[key]={...(RESOURCES[key]||{}),...obj};}
          const maps=new Map();for(const row of raw.maps){if(!row?.map_id)continue;const key=String(row.map_id),fallback=MAPS[key]||{};const map={...fallback,id:key,label:row.label??fallback.label,tier:Number(row.tier)||fallback.tier||1,name:shortText(row.name||fallback.name||key,64),risk:shortText(row.risk||fallback.risk||'Normal',32),world:{w:Math.max(1000,Number(row.world_w)||fallback.world?.w||6000),h:Math.max(1000,Number(row.world_h)||fallback.world?.h||4500)},enemyMultiplier:Math.max(.1,Number(row.enemy_multiplier)||fallback.enemyMultiplier||1),oreCount:Math.max(0,Math.round(Number(row.ore_count)||0)),oreYield:Math.max(1,Math.min(20,Math.round(Number(row.ore_yield??fallback.oreYield)||1))),oreRespawnMinMs:Math.max(1000,Number(row.ore_respawn_min_ms)||5000),oreRespawnMaxMs:Math.max(1000,Number(row.ore_respawn_max_ms)||12000),landmarkCount:Math.max(0,Math.round(Number(row.landmark_count)||0)),minLevel:Math.max(1,Number(row.min_level)||1),battle:!!row.battle,gate:!!row.gate,enabled:row.enabled!==false,palette:row.palette&&typeof row.palette==='object'?row.palette:(fallback.palette||{}),structures:Array.isArray(row.structures)?row.structures:(fallback.structures||[])};maps.set(key,map);MAPS[key]=map;}
          const mapResources=new Map();for(const row of raw.map_resources||[]){const mapId=String(row?.map_id||''),resource_key=String(row?.resource_key||'');if(!mapId||!resource_key)continue;if(!mapResources.has(mapId))mapResources.set(mapId,[]);mapResources.get(mapId).push({resource_key,weight:Math.max(.01,Number(row.weight)||1),enabled:row.enabled!==false});}
          for(const [mapId,map] of maps){const pool=(mapResources.get(mapId)||[]).filter(x=>x.enabled!==false);if(pool.length){map.ores=pool.map(x=>x.resource_key);map.oreWeights=Object.fromEntries(pool.map(x=>[x.resource_key,x.weight]));}else if(!Array.isArray(map.ores)){map.ores=[...(MAPS[mapId]?.ores||[])];}}
          const sectors=new Map();for(const row of raw.sectors||[]){if(!row?.sector_label||!maps.has(String(row.map_id)))continue;sectors.set(String(row.sector_label),{...row,sector_label:String(row.sector_label),map_id:String(row.map_id),territory_faction:row.territory_faction?String(row.territory_faction):null,graph_x:Number(row.graph_x)||0,graph_y:Number(row.graph_y)||0,min_level:Math.max(1,Number(row.min_level)||1),enabled:row.enabled!==false});}
          const portals=(raw.portals||[]).filter(x=>x?.from_sector&&x?.to_sector).map(x=>({...x,from_sector:String(x.from_sector),to_sector:String(x.to_sector),bidirectional:x.bidirectional!==false,enabled:x.enabled!==false,sort_order:Number(x.sort_order)||100}));
          this.worldRuntime={version:nextVersion,updatedAt:raw.updated_at||null,maps,resources,mapResources,sectors,portals,source:'render-cache'};this.lastWorldConfigAt=nowMs();
          if(changed){for(const r of rooms.values())r.applyWorldRuntimeConfig();console.info(`[world-config] v${nextVersion} aplicado • ${maps.size} mapas • ${portals.length} portais`);}
        }
      }catch(err){this.lastWorldConfigAt=nowMs();console.warn('World runtime refresh failed; mantendo fallback/cache atual:',err?.message||err);}
      finally{this.worldConfigBusy=false;}return this.worldRuntime;
    },
    broadcastGlobalAnnouncement(payload={}){
      const now=nowMs(),key=String(payload.key||payload.kind||'global');
      const last=Number(this.announcementCooldowns.get(key)||0);
      if(now-last<5000)return false;
      this.announcementCooldowns.set(key,now);
      if(this.announcementCooldowns.size>120){for(const [k,t] of this.announcementCooldowns)if(now-t>120000)this.announcementCooldowns.delete(k);}
      const message={type:'global_announcement',scope:'global',category:'warfront',...payload,serverTime:now};
      for(const r of rooms.values())for(const c of r.clients)safeJsonSend(c,message);
      return true;
    },
    markNpcActivity(userId,at=nowMs()){const uid=String(userId||'');if(uid)this.npcActivity.set(uid,Number(at)||nowMs());},
    lastNpcActivity(userId){return Number(this.npcActivity.get(String(userId||''))||0);},
    findClient(userId){const uid=String(userId||'');for(const r of rooms.values())for(const c of r.clients)if(String(c.player?.userId||'')===uid)return c;return null;},
    async refreshDirectives(force=false){
      const now=nowMs();if(!loadWorldDirectives)return this.directives;
      if(!force && now-this.lastDirectivesAt<20000)return this.directives;
      if(this.directivesBusy)return this.directives;
      this.directivesBusy=true;
      try{
        const rows=await loadWorldDirectives();
        if(!Array.isArray(rows))throw new Error('Resposta inválida de operações do universo');
        const before=this.directives;this.directives=rows.slice(0,80);this.lastDirectivesAt=nowMs();
        const changed=rooms.size>0&&[...rooms.values()].some(room=>{
          const old=selectLiveDirective(before,room.mapId);
          const next=selectLiveDirective(this.directives,room.mapId);
          return JSON.stringify(old||null)!==JSON.stringify(next||null);
        });
        if(changed)for(const room of rooms.values())room.ensureEvent(true);
      }catch(e){this.lastDirectivesAt=nowMs();console.warn('[universe-directives]',e?.message||e);}
      finally{this.directivesBusy=false;}
      return this.directives;
    },
    currentEvent(){return resolveLiveEvent(world.liveOps?.events||[],nowMs(),world.liveOps?.weekend_settings,world.liveOps?.manual_override);},
    async refreshLiveOps(force=false){
      const now=nowMs();
      if(!loadLiveOps)return world.liveOps;
      if(!force&&world.lastLiveOpsAt&&now-world.lastLiveOpsAt<LIVE_OPS_REFRESH_MS)return world.liveOps;
      if(world.liveOpsBusy)return world.liveOps;
      world.liveOpsBusy=true;
      try{
        const data=await loadLiveOps(force);
        if(data&&Array.isArray(data.events)){
          const before=world.currentEvent();
          world.liveOps=data;
          world.lastLiveOpsAt=nowMs();
          const after=world.currentEvent();
          const changed=JSON.stringify(before)!==JSON.stringify(after);
          for(const r of rooms.values()){
            if(changed)r.ensureEvent(true);
            else if(force){r.ensureEvent(false);r.broadcastEvent(true);}
          }
        }
      }catch(err){console.warn('LIVE OPS refresh failed:',err?.message||err);}
      finally{world.liveOpsBusy=false;}
      return world.liveOps;
    },
    room(mapId,territoryFaction){const requested=String(mapId||'x1'),def=this.mapDefinition(requested),id=def&&def.enabled!==false&&!def.gate?requested:sanitizeRoomMap(requested),key=roomKey(id,territoryFaction);if(!rooms.has(key))rooms.set(key,new Room(world,id,territoryFaction));return rooms.get(key);},
    broadcastGlobalEventStatus(force=false){
      const globalEvent=this.currentEvent();
      const signature=globalEvent?.eventId||'none';
      if(!force&&signature===this.lastGlobalEventSignature)return;
      this.lastGlobalEventSignature=signature;
      for(const room of rooms.values())if(room.clients.size){
        room.ensureEvent(false);
        room.broadcastEvent(true);
      }
    },
    stats(){return {rooms:rooms.size,clients:[...rooms.values()].reduce((s,r)=>s+r.clients.size,0),npcs:[...rooms.values()].reduce((s,r)=>s+r.npcs.size,0),ores:[...rooms.values()].reduce((s,r)=>s+r.ores.size,0),event:world.currentEvent(),directivesCached:world.directives.length,directivesUpdatedAt:world.lastDirectivesAt,liveOpsUpdatedAt:world.lastLiveOpsAt,npcConfigVersion:Number(world.npcRuntime?.version)||0,npcConfigUpdatedAt:world.npcRuntime?.updatedAt||null,worldConfigVersion:Number(world.worldRuntime?.version)||0,worldConfigUpdatedAt:world.worldRuntime?.updatedAt||null};}
  };

  wss.on('connection',ws=>{
    try{ws._socket?.setNoDelay?.(true);}catch{}
    ws.isAuthed=false;ws.authTimer=setTimeout(()=>{try{ws.close(4401,'auth timeout');}catch{}},8000);
    ws.on('message',async raw=>{
      if(!socketMessageAllowed(ws))return;
      let msg;try{msg=JSON.parse(String(raw));if(!msg||typeof msg!=='object'||Array.isArray(msg))return;}catch{return;}
      if(msg.type==='ping')return safeJsonSend(ws,{type:'pong',ts:msg.ts,serverTime:nowMs()});
      if(!ws.isAuthed){
        if(msg.type!=='auth')return;
        try{const identity=await authenticate(String(msg.accessToken||''),String(msg.gameSessionId||''));if(!identity?.user?.id)throw new Error('auth');ws.isAuthed=true;ws.identity=identity;clearTimeout(ws.authTimer);safeJsonSend(ws,{type:'auth_ok',user:{id:identity.user.id,callsign:identity.callsign},serverTime:nowMs()});}catch{safeJsonSend(ws,{type:'auth_error'});try{ws.close(4401,'auth failed');}catch{}}return;
      }
      if(msg.type==='join_map'){
        const identity=ws.identity;const mapId=String(msg.mapId||'x1');
        if(authorizeJoin){try{const fresh=await authorizeJoin(identity.accessToken,identity.user.id);identity.faction=fresh?.faction||identity.faction;identity.level=Math.max(1,Number(fresh?.level)||Number(identity.level)||1);identity.isAdmin=fresh?.isAdmin===true;}catch{safeJsonSend(ws,{type:'join_error',reason:'Falha ao validar progresso no servidor'});return;}}
        const known=String(identity.faction||'');const faction=known||(['earth','mars','jupiter'].includes(String(msg.faction||''))&&mapId==='x1'?String(msg.faction):'');const level=Math.max(1,Number(identity.level)||1);
        const admin=identity.isAdmin===true;
        const territorial=/^x[1-8]$/.test(mapId);
        const territory=territorial?(admin?String(msg.territoryFaction||faction):faction):null;
        const validTerritory=!territorial||['earth','mars','jupiter'].includes(territory);
        const owner=({'b41':'earth','b42':'mars','b43':'jupiter'})[mapId];
        const dest=world.mapDefinition(mapId);
        const sector=world.sectorForRoom(mapId,territory);
        const sectorValid=!territorial||!sector||String(sector.territory_faction||'')===territory;
        const required=Math.max(1,Number(dest?.minLevel)||1,Number(sector?.min_level)||1);
        // Somente X-1..X-8 são territoriais; b41,b42,b43 são PvP públicos de nível mínimo.
        const wrongFaction=!admin&&territorial&&String(msg.territoryFaction||faction)!==faction;
        if(!dest||dest.enabled===false||dest.gate||!validTerritory||!sectorValid||wrongFaction||(!admin&&level<required)||!faction){safeJsonSend(ws,{type:'join_error',code:'MAP_JOIN_DENIED',reason:wrongFaction?'INVASÕES BLOQUEADAS':`Setor indisponível / nível mínimo ${required}`});return;}
        if(/^b4[123]$/.test(mapId)){
          try{identity.clanId=await world.loadActorClan(identity.user.id);}catch{identity.clanId=null;}
        }
        const r=world.room(mapId,territory);
        // Não aguardar a consulta de relés para abrir o PvP. O controlador permanece
        // travado até a primeira leitura válida e publica os donos oficiais depois.
        ws.room?.removeClient(ws);const p={clanId:identity.clanId||null,userId:identity.user.id,callsign:identity.callsign||msg.callsign||'Pilot',pilotTitle:shortText(msg.pilotTitle||'Piloto Estelar',64),faction:faction,shipId:String(msg.shipId||'phoenix'),shipDesignId:msg.shipDesignId?shortText(msg.shipDesignId,64):null,level:level,x:Number(msg.x)||400,y:Number(msg.y)||400,hp:Number(msg.hp)||1,maxHp:Number(msg.maxHp)||1,shield:Number(msg.shield)||0,maxShield:Number(msg.maxShield)||0,angle:Number(msg.angle)||0,laserFiring:false,laserColor:'#76d9ff',laserAmmoId:'lcb10',laserAmmoName:'PLS-1',targetId:null,targetIsPlayer:false,pet:{owned:false},updatedAt:nowMs()};r.addClient(ws,p);
        // Verificar eventos imediatamente ao entrar (sem depender de trocar de mapa).
        Promise.allSettled([world.refreshLiveOps?.(nowMs()-(world.lastLiveOpsAt||0)>3000)??Promise.resolve(),world.refreshDirectives?.(false)??Promise.resolve()]).then(()=>{
          if(ws.room!==r)return;
          r.ensureEvent?.(false);
          if(typeof r.eventPayload==='function')safeJsonSend(ws,{type:'event_update',event:r.eventPayload(),globalEvent:world.currentEvent(),serverTime:nowMs()});
        }).catch(()=>{});
        return;
      }
      if(msg.type==='player_state'){
        if(authorizeJoin&&nowMs()-(ws.lastAccessAuditAt||0)>45000){
          ws.lastAccessAuditAt=nowMs();
          authorizeJoin(ws.identity.accessToken,ws.identity.user.id).catch(()=>{
            ws.room?.removeClient(ws);try{ws.close(4403,'access revoked');}catch{}
          });
        }
        return ws.room?.updatePlayer(ws,msg);
      }
      if(msg.type==='npc_damage')return await ws.room?.handleDamage(ws,msg);
      if(msg.type==='relay_attack')return await ws.room?.handleRelayAttack(ws,msg);
      if(msg.type==='collect_ore')return await ws.room?.handleOreCollect(ws,msg);
      if(msg.type==='force_event'&&ws.identity?.isAdmin===true&&String(ws.identity.callsign||'').trim().toUpperCase()==='FELP22'){
        await world.refreshLiveOps(true);
        safeJsonSend(ws,{type:'live_ops_refresh',ok:true,event:world.currentEvent(),serverTime:nowMs()});
        return;
      }
    });
    ws.on('close',()=>{clearTimeout(ws.authTimer);ws.room?.removeClient(ws);});
    ws.on('error',()=>{});
  });

  world.refreshWorldConfig(true).catch(()=>{});
  world.refreshNpcConfig(true).catch(()=>{});
  world.refreshLiveOps(true).catch(()=>{});
  world.refreshDirectives(true).catch(()=>{});
  let last=nowMs(),lastActivityCleanup=0,lastGlobalEventCheckAt=0;const timer=setInterval(()=>{const n=nowMs(),dt=Math.min(.12,(n-last)/1000);last=n;if(n-lastGlobalEventCheckAt>1000){lastGlobalEventCheckAt=n;world.broadcastGlobalEventStatus(false);}if(n-world.lastLiveOpsAt>=LIVE_OPS_REFRESH_MS)world.refreshLiveOps(false).catch(()=>{});if(n-world.lastNpcConfigAt>=12000)world.refreshNpcConfig(false).catch(()=>{});if(n-world.lastWorldConfigAt>=15000)world.refreshWorldConfig(false).catch(()=>{});if(n-world.lastDirectivesAt>=20000)world.refreshDirectives(false).catch(()=>{});for(const [key,r] of rooms){if(r.clients.size>0){r.lastUsedAt=n;r.tick(dt);if(r.warfrontControl&&n-r.lastWarfrontSyncAt>15000){r.lastWarfrontSyncAt=n;r.reconcileWarfrontState().catch(err=>console.warn('Falha sincronizando relés:',err?.message));}}else if(n-(r.lastUsedAt||n)>IDLE_ROOM_TTL_MS)rooms.delete(key);}if(n-lastActivityCleanup>60000){lastActivityCleanup=n;for(const [uid,at] of world.npcActivity)if(n-Number(at)>10*60*1000)world.npcActivity.delete(uid);}},50);
  timer.unref?.();
  return world;
}
