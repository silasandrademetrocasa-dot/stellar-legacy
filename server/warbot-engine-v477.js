// V47.7 — Galactic Bot Wars. Server-authoritative, ephemeral combat NPCs.
// Never pays rewards, captures SQL relays, touches accounts, or persists bot damage.
export const WARBOT_MAPS = Object.freeze(['b41','b42','b43']);
export const WARBOT_FACTIONS = Object.freeze(['earth','mars','jupiter']);
export const WARBOT_DEFAULT = Object.freeze({enabled:false,mode:'training',bots_per_faction:2,tier:1,attack_players:false,ends_at:null});
const COLORS={earth:'#52cfff',mars:'#ff7d5e',jupiter:'#e5bb65'};
const LABELS={earth:'TERRA',mars:'MARTE',jupiter:'JÚPITER'};
const NPC_CADENCE_MS=300, BOT_RESPAWN_MS=22000, TARGET_RADIUS=1450;
export const WARBOT_ROLES=Object.freeze(['interceptor','assault','guardian','support']);
const ROLE_LABELS={interceptor:'INTERCEPTOR',assault:'ASSALTO',guardian:'GUARDIÃO',support:'SUPORTE'};
export const warbotRole=i=>WARBOT_ROLES[Math.max(0,Math.floor(Number(i)||0))%4];
export function warbotPlayerEligible(room,bot,ws,settings,now=Date.now()){
  const p=ws?.player,provoked=bot.aggroPilotId===p?.userId&&bot.aggroPilotUntil>now;
  if(!p||!room.playerFresh(p)||Number(p.hp)<=0||!Number.isFinite(p.x)||!Number.isFinite(p.y))return false;
  if(room.playerSafe?.(p)||room.playerPortalNeutral?.(p))return false;
  if(p.faction===bot.faction&&!(settings.mode==='training'&&provoked))return false;
  return settings.mode==='training'?provoked:settings.attack_players===true;
}
export function warbotTarget(bot,others,clients,room,settings,now=Date.now()){
  let pilot=null,pilotScore=Infinity;
  for(const ws of clients){
    if(!warbotPlayerEligible(room,bot,ws,settings,now))continue;
    const p=ws.player,d=Math.hypot(bot.x-p.x,bot.y-p.y);
    if(d>TARGET_RADIUS)continue;
    const score=d-(bot.aggroPilotId===p.userId&&bot.aggroPilotUntil>now?600:0);
    if(score<pilotScore){pilot={kind:'pilot',target:p,ws,dist:d};pilotScore=score;}
  }
  if(pilot)return pilot; // Pilot ALWAYS takes priority when ADM has permitted attack.
  let enemy=null,best=Infinity;
  for(const other of others){
    if(other.faction===bot.faction||other.hp<=0)continue;
    const d=Math.hypot(bot.x-other.x,bot.y-other.y),score=d-(other.shield<=0?80:0);
    if(score<best){enemy={kind:'bot',target:other,dist:d};best=score;}
  }
  return enemy;
}
export function warbotTacticalMove(b,goal,engaged,dt,world){
  const dx=goal.x-b.x,dy=goal.y-b.y,d=Math.max(1,Math.hypot(dx,dy)),nx=dx/d,ny=dy/d;
  const role=b.role||'assault',ideal=role==='support'?540:role==='guardian'?430:role==='interceptor'?310:380;
  const weak=(b.shield||0)/Math.max(1,b.maxShield||1)<.2&&(b.hp||0)<(b.maxHp||1)*.75;
  const forward=weak&&engaged?-.95:d>ideal+70?1:d<ideal-95?-.6:0;
  const orbit=engaged?(role==='interceptor'?.85:role==='support'?.3:.48):0;
  const side=b.index%2===0?1:-1,dxm=nx*forward-ny*orbit*side,dym=ny*forward+nx*orbit*side,mag=Math.max(1,Math.hypot(dxm,dym));
  const step=Math.max(0,Math.min(.45,dt))*b.speed;
  return {x:clamp(b.x+dxm/mag*step,95,world.w-95),y:clamp(b.y+dym/mag*step,95,world.h-95),angle:Math.atan2(dy,dx)};
}
const clamp=(v,min,max)=>Math.min(max,Math.max(min,Number(v)||min));
export function cleanWarbotConfig(input,now=Date.now()){
  const mode=input?.mode==='conquest'?'conquest':'training';
  const until=input?.ends_at?Date.parse(input.ends_at):NaN;
  const enabled=input?.enabled===true&&Number.isFinite(until)&&until>now&&until<=now+2*60*60*1000;
  return {enabled,mode,bots_per_faction:Math.round(clamp(input?.bots_per_faction,1,4)),tier:Math.round(clamp(input?.tier,1,3)),attack_players:input?.attack_players===true&&mode==='conquest',ends_at:enabled?new Date(until).toISOString():null};
}
export function activeWarbotConfig(input,now=Date.now()){
  const end=input?.ends_at?Date.parse(input.ends_at):0;
  return Boolean(input?.enabled&&WARBOT_MAPS.includes(input?.map_id)&&end>now);
}
export function createWarbotEngine(room){
  const bots=new Map();let settings={...WARBOT_DEFAULT};let nextFrameAt=0,lastTick=0,lastPublishedAt=0;
  function publicBot(b){
    return {id:b.id,type:'mordon',warBot:true,faction:b.faction,role:b.role,name:b.name,x:Math.round(b.x),y:Math.round(b.y),angle:b.angle,visualAngle:b.angle,
      hp:Math.round(b.hp),maxHp:b.maxHp,shield:Math.round(b.shield),maxShield:b.maxShield,size:26,color:b.color,
      speed:b.speed,credits:0,uridium:0,xp:0,resources:{},bossPhase:0,eventNpc:false,ownerUserId:null};
  }
  function broadcastBots(){
    if(!room.clients.size)return;
    room.broadcast({type:'warbot_state',bots:[...bots.values()].filter(x=>x.hp>0).map(publicBot),mode:settings.mode,ends_at:settings.ends_at});
  }
  function spawn(bot,faction,idx){
    const n=room.warfrontControl?.nodes||[];
    const p=n[(idx+WARBOT_FACTIONS.indexOf(faction))%Math.max(1,n.length)];
    const w=room.map.world.w,h=room.map.world.h;
    const anchor=p||{x:w*.5,y:h*.5};
    const angle=idx*2.31+WARBOT_FACTIONS.indexOf(faction)*2.1;
    const pos={x:clamp(anchor.x+Math.cos(angle)*520,120,w-120),y:clamp(anchor.y+Math.sin(angle)*520,120,h-120)};
    const tier=settings.tier, hp=90000*tier,shield=150000*tier;
    const role=warbotRole(idx);
    Object.assign(bot,{id:`warbot_${room.mapId}_${faction}_${idx}`,name:`${LABELS[faction]} • ${ROLE_LABELS[role]}`,faction,role,index:idx,color:COLORS[faction],
      ...pos,hp,maxHp:hp,shield,maxShield:shield,speed:(role==='interceptor'?245:role==='guardian'?155:role==='support'?175:205)+tier*15,damage:(role==='assault'?1500:role==='interceptor'?1250:role==='guardian'?1000:900)*tier,angle:0,lastShotAt:0,lastPilotShotAt:0,aggroPilotId:null,aggroPilotUntil:0,
      targetId:null,spawnAt:Date.now(),respawnAt:0});
  }
  function configure(raw){
    const next=cleanWarbotConfig(raw||WARBOT_DEFAULT);
    if(!room.warfrontControl)next.enabled=false;
    const prior=settings;settings=next;
    if(!next.enabled){if(bots.size){const ids=[...bots.keys()];bots.clear();room.broadcast({type:'warbot_clear',ids});}return;}
    const reset=prior.tier!==next.tier||prior.bots_per_faction!==next.bots_per_faction||prior.mode!==next.mode;
    const allowed=new Set();
    for(const f of WARBOT_FACTIONS)for(let i=0;i<next.bots_per_faction;i++){
      const id=`warbot_${room.mapId}_${f}_${i}`;allowed.add(id);
      if(!bots.has(id)||reset){let b=bots.get(id)||{};spawn(b,f,i);bots.set(id,b);}
    }
    const removed=[];for(const id of bots.keys())if(!allowed.has(id)){bots.delete(id);removed.push(id);}
    if(removed.length)room.broadcast({type:'warbot_clear',ids:removed});
    broadcastBots();
  }
  function hurt(bot,amount){
    let n=Math.max(0,amount);const shieldHit=Math.min(n,Math.max(0,bot.shield));bot.shield-=shieldHit;n-=shieldHit;
    const hullHit=Math.min(n,Math.max(0,bot.hp));bot.hp-=hullHit;
    if(bot.hp<=0){bot.hp=0;bot.respawnAt=Date.now()+BOT_RESPAWN_MS;room.broadcast({type:'npc_remove',entityId:bot.id,reason:'warbot_destroyed'});}
    return shieldHit+hullHit;
  }
  function nearestEnemy(bot){
    let chosen=null,best=Infinity;
    for(const target of bots.values()){
      if(target.faction===bot.faction||target.hp<=0)continue;
      const d=Math.hypot(target.x-bot.x,target.y-bot.y);
      if(d<best){best=d;chosen=target;}
    }
    return {target:chosen,dist:best};
  }
  function chooseTargetNode(bot){const nodes=room.warfrontControl?.nodes||[];if(!nodes.length)return {x:room.map.world.w/2,y:room.map.world.h/2};
    return nodes[(WARBOT_FACTIONS.indexOf(bot.faction)+Math.floor((Date.now()-bot.spawnAt)/45000))%nodes.length];}
  function tick(dt,now=Date.now()){
    if(!settings.enabled||!room.clients.size)return;
    if(settings.ends_at&&Date.parse(settings.ends_at)<=now){configure({...settings,enabled:false});return;}
    if(now<nextFrameAt)return;
    const delta=lastTick?Math.min(.45,(now-lastTick)/1000):.3;lastTick=now;nextFrameAt=now+NPC_CADENCE_MS;
    const pilots=[...room.clients],roster=[...bots.values()];
    for(const b of roster){
      if(b.hp<=0){if(now>=b.respawnAt){spawn(b,b.faction,Number(b.id.split('_').at(-1))||0);room.broadcast({type:'npc_spawn',entity:publicBot(b)});}continue;}
      const choice=warbotTarget(b,roster,pilots,room,settings,now);
      const target=choice?.target||chooseTargetNode(b);
      const moved=warbotTacticalMove(b,target,!!choice,delta,room.map.world);
      b.x=moved.x;b.y=moved.y;b.angle=moved.angle;
      if(!choice||choice.dist>=1050)continue;
      const last=choice.kind==='pilot'?'lastPilotShotAt':'lastShotAt';
      const cadence=choice.kind==='pilot'?1300:b.role==='interceptor'?900:1150;
      if(now-(b[last]||0)<cadence)continue;
      b[last]=now;
      room.broadcast({type:'warbot_fire',from:{x:b.x,y:b.y},to:{x:target.x,y:target.y},color:b.color,source:b.id,target:choice.kind==='pilot'?'pilot':target.id});
      if(choice.kind==='bot')hurt(target,b.damage);
      else if(settings.mode==='training')choice.ws.send(JSON.stringify({type:'warbot_spar_hit',entityId:b.id,estimatedDamage:b.damage}));
      else if(settings.attack_players)choice.ws.send(JSON.stringify({type:'npc_attack',entityId:b.id,damage:b.damage,retaliation:false}));
    }
    if(now-lastPublishedAt>=300){lastPublishedAt=now;broadcastBots();}
  }
  function handleHit(ws,msg,admitDamage){
    const b=bots.get(String(msg.entityId||'')),p=ws.player;
    if(!settings.enabled||!b||b.hp<=0||!p||!room.playerFresh(p)||String(ws.identity?.user?.id||'')!==String(p.userId))return;
    if(settings.mode==='conquest'&&p.faction===b.faction)return; // Friendly fire is disabled for conquest
    // A pilot in a safe base / neutral portal cannot attack bots while immune to retaliation.
    // Match the protection the same authoritative room already applies to NPC attacks.
    if(room.playerSafe?.(p)||room.playerPortalNeutral?.(p)){
      ws.send(JSON.stringify({type:'warbot_damage_result',entityId:b.id,actual:0,rejected:'safe_zone'}));
      return;
    }
    // Same protection for bot shots as ordinary NPC hits: validation, rate limiting, range and cap.
    const policy=admitDamage(ws,msg,Date.now());
    if(!policy.allowed)return ws.send(JSON.stringify({type:'warbot_damage_result',entityId:b.id,actual:0,rejected:policy.reason}));
    if(Math.hypot(p.x-b.x,p.y-b.y)>1400)return;
    const amount=Math.max(0,Math.min(ws.identity?.isAdmin?5000000:2000000,Math.round(Number(msg.damage)||0)));
    if(amount<=0)return;
    const beforeShield=b.shield,beforeHp=b.hp;
    const actual=msg.mode==='shield_drain'?Math.min(amount,b.shield):hurt(b,amount);
    if(msg.mode==='shield_drain')b.shield-=actual;
    if(actual>0){ws._lastWarbotHitAt=Date.now();b.aggroPilotId=p.userId;b.aggroPilotUntil=Date.now()+20000;}
    ws.send(JSON.stringify({type:'warbot_damage_result',entityId:b.id,actual,mode:msg.mode||'damage',critical:!!msg.critical,beforeShield,beforeHp,hp:b.hp,shield:b.shield}));
    room.broadcast({type:'npc_patch',entity:{id:b.id,hp:b.hp,shield:b.shield}});
    // No kill/reward/XP/loot events. Shared killNpc() is NEVER called.
  }
  return {bots,configure,tick,handleHit,publicBot};
}
