// V47.7 — Galactic Bot Wars. Server-authoritative, ephemeral combat NPCs.
// Never pays rewards, captures SQL relays, touches accounts, or persists bot damage.
export const WARBOT_MAPS = Object.freeze(['b41','b42','b43']);
export const WARBOT_FACTIONS = Object.freeze(['earth','mars','jupiter']);
export const WARBOT_DEFAULT = Object.freeze({enabled:false,mode:'training',bots_per_faction:2,tier:1,attack_players:false,ends_at:null});
const COLORS={earth:'#52cfff',mars:'#ff7d5e',jupiter:'#e5bb65'};
const LABELS={earth:'TERRA',mars:'MARTE',jupiter:'JÚPITER'};
const NPC_CADENCE_MS=360, BOT_RESPAWN_MS=22000, TARGET_RADIUS=1100;
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
    return {id:b.id,type:'mordon',warBot:true,faction:b.faction,name:b.name,x:Math.round(b.x),y:Math.round(b.y),angle:b.angle,visualAngle:b.angle,
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
    Object.assign(bot,{id:`warbot_${room.mapId}_${faction}_${idx}`,name:`${LABELS[faction]} • ${idx+1}`,faction,color:COLORS[faction],
      ...pos,hp,maxHp:hp,shield,maxShield:shield,speed:180+tier*18,damage:1200*tier,angle:0,lastShotAt:0,lastPilotShotAt:0,
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
    const delta=lastTick?Math.min(.45,(now-lastTick)/1000):.30;lastTick=now;nextFrameAt=now+NPC_CADENCE_MS;
    for(const b of bots.values()){
      if(b.hp<=0){if(now>=b.respawnAt){spawn(b,b.faction,Number(b.id.split('_').at(-1))||0);room.broadcast({type:'npc_spawn',entity:publicBot(b)});}continue;}
      const {target,dist}=nearestEnemy(b);
      const patrol=chooseTargetNode(b);const goal=target&&dist<TARGET_RADIUS*2?target:patrol;
      const dx=goal.x-b.x,dy=goal.y-b.y,d=Math.hypot(dx,dy)||1;
      b.angle=Math.atan2(dy,dx);
      const comfortable=target&&dist<TARGET_RADIUS?70:145;
      if(d>comfortable){const step=Math.min(d-comfortable,b.speed*delta);b.x=clamp(b.x+dx/d*step,75,room.map.world.w-75);b.y=clamp(b.y+dy/d*step,75,room.map.world.h-75);}
      if(target&&dist<950&&now-b.lastShotAt>=1150){
        b.lastShotAt=now;const dmg=b.damage;
        hurt(target,dmg);
        room.broadcast({type:'warbot_fire',from:{x:b.x,y:b.y},to:{x:target.x,y:target.y},color:b.color,source:b.id,target:target.id});
      }
      // Optional player skirmish. Training is ALWAYS non-lethal and does not change player vitals.
      if(now-b.lastPilotShotAt>=1800){
        const victims=[...room.clients].filter(ws=>ws.player&&room.playerFresh(ws.player)&&ws.player.hp>0&&ws.player.faction!==b.faction);
        let nearest=null,nearDist=780;
        for(const ws of victims){const p=ws.player,d=Math.hypot(p.x-b.x,p.y-b.y);if(d<nearDist){nearDist=d;nearest=ws;}}
        if(nearest&&(settings.mode==='training'||settings.attack_players)){
          // In training only pilots engaging these bots are targeted, never passive travelers.
          if(settings.mode==='training'&&now-(nearest._lastWarbotHitAt||0)>15000)continue;
          b.lastPilotShotAt=now;
          room.broadcast({type:'warbot_fire',from:{x:b.x,y:b.y},to:{x:nearest.player.x,y:nearest.player.y},color:b.color,source:b.id,target:'pilot'});
          if(settings.mode==='training'){
            nearest.send(JSON.stringify({type:'warbot_spar_hit',entityId:b.id,estimatedDamage:b.damage}));
          }else if(settings.attack_players){
            nearest.send(JSON.stringify({type:'npc_attack',entityId:b.id,damage:b.damage,retaliation:false}));
          }
        }
      }
    }
    if(now-lastPublishedAt>=350){lastPublishedAt=now;broadcastBots();}
  }
  function handleHit(ws,msg,admitDamage){
    const b=bots.get(String(msg.entityId||'')),p=ws.player;
    if(!settings.enabled||!b||b.hp<=0||!p||!room.playerFresh(p)||String(ws.identity?.user?.id||'')!==String(p.userId))return;
    // Same protection for bot shots as ordinary NPC hits: validation, rate limiting, range and cap.
    const policy=admitDamage(ws,msg,Date.now());
    if(!policy.allowed)return ws.send(JSON.stringify({type:'warbot_damage_result',entityId:b.id,actual:0,rejected:policy.reason}));
    if(Math.hypot(p.x-b.x,p.y-b.y)>1400)return;
    const amount=Math.max(0,Math.min(ws.identity?.isAdmin?5000000:2000000,Math.round(Number(msg.damage)||0)));
    if(amount<=0)return;
    const beforeShield=b.shield,beforeHp=b.hp;
    const actual=msg.mode==='shield_drain'?Math.min(amount,b.shield):hurt(b,amount);
    if(msg.mode==='shield_drain')b.shield-=actual;
    ws._lastWarbotHitAt=Date.now();
    ws.send(JSON.stringify({type:'warbot_damage_result',entityId:b.id,actual,mode:msg.mode||'damage',critical:!!msg.critical,beforeShield,beforeHp,hp:b.hp,shield:b.shield}));
    room.broadcast({type:'npc_patch',entity:{id:b.id,hp:b.hp,shield:b.shield}});
    // No kill/reward/XP/loot events. Shared killNpc() is NEVER called.
  }
  return {bots,configure,tick,handleHit,publicBot};
}
