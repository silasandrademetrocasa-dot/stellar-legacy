import {createHash} from 'node:crypto';
import {ITEMS,SHIPS,MAPS} from '../public/data.js';
import {applyRecruitBonusV2012} from '../public/progression-plan-v2012.js';
import {auxAdvancedEffectsV110,auxAdvancedLootQuantityV110} from '../public/modules/aux-advanced-protocols-v110.js';
import {operationDigestV125} from './economy-receipts-v125.js';
const fail=(message,code='PLAYER_REWARD_INVALID')=>{throw Object.assign(Error(message),{code,status:409});};
const count=v=>Math.max(0,Math.floor(Number(v)||0));
export function cargoCapacityV134(s,systems={}){
 const ship=SHIPS[s.activeShipId]||{},extras=(s.shipLoadout?.extras||[]).reduce((n,id)=>n+Number(ITEMS[id]?.cargoBonus||0),0);
 let cap=Number(ship.cargo||0)+extras;
 if(ship.bonusLowMaps&&['x1','x2','x3','x4'].includes(s.mapId))cap+=Number(ship.bonusLowMaps.cargo||0);
 const svc=s.economyBoosts?.cargo||s.economyServices?.cargo;
 if(Number(svc?.expiresAt||svc?.expires_at||svc||0)>Date.now())cap+=Number(systems.economy_services?.find(r=>r.service_id==='cargo')?.effect?.cargo_flat||750);
 cap*=1+[0,4,8,12,16,25][Math.min(5,count(s.pilotBio?.skills?.logistics))]/100;
 cap*=1+Number(auxAdvancedEffectsV110(s.pet)?.porao||0);
 return Math.round(cap);
}
export function applyBundleV134(s,r){
 s.profile||={};s.ammo||={};s.rockets||={};s.inventory||={};s.ownedShips||=[];s.galaxyGate||={};
 for(const k of ['credits','uridium','xp'])s.profile[k]=count(s.profile[k])+count(r[k]);
 for(const [field,values] of [['ammo',r.ammo],['rockets',r.rockets]])for(const [id,n] of Object.entries(values||{}))s[field][id]=count(s[field][id])+count(n);
 for(const id of r.items||[]){if(!ITEMS[id])fail('Item de recompensa inválido');s.inventory[id]=count(s.inventory[id])+1;}
 for(const id of r.ships||[]){if(!SHIPS[id])fail('Nave de recompensa inválida');if(!s.ownedShips.includes(id))s.ownedShips.push(id);}
 s.galaxyGate.repairBonus=count(s.galaxyGate.repairBonus)+count(r.repairBonus);
}
export function levelRewardV134(level){
 const r={credits:level*100000,uridium:level*150,ammo:{lcb10:level*250},items:[],repairBonus:0};
 if(level===5)r.ammo.mcb25=5000;
 if(level===10){r.ammo.mcb50=2500;r.repairBonus++;}
 if(level===15)r.items.push('lf2');
 if(level===20){r.ammo.ucb100=2500;r.repairBonus++;}
 if(level===25)r.items.push('lf3');
 if(level===30){r.items.push('sg3nb02');r.ammo.mcb50=5000;r.repairBonus++;}
 if(level===35){r.ammo.ucb100=5000;r.repairBonus+=2;}
 if(level===40)r.items.push('lf4');
 if(level===44){r.credits+=10000000;r.uridium+=10000;r.ammo.ucb100=10000;r.items.push('lf4');r.repairBonus+=3;}
 return applyRecruitBonusV2012(r,level);
}
export function seededRandomV134(id){let counter=0;return ()=>createHash('sha256').update(id+':'+counter++).digest().readUInt32BE(0)/4294967296;}
export function rollBonusV134(config,pet,rng=Math.random){
 const pool=(config.rewards||[]).filter(r=>Number(r.weight)>0),sum=pool.reduce((n,r)=>n+Number(r.weight),0);if(!sum)fail('Configuração de box indisponível');
 let roll=rng()*sum,def=pool.at(-1);for(const r of pool){roll-=Number(r.weight);if(roll<0){def=r;break;}}
 const qty=auxAdvancedLootQuantityV110(Math.floor(Number(def.min)+rng()*(Number(def.max)-Number(def.min)+1)),Number(auxAdvancedEffectsV110(pet)?.loot||0),rng());
 if(!Number.isSafeInteger(qty)||qty<1||!['credits','uridium','ammo','stellarDust'].includes(def.kind))fail('Recompensa de box inválida');
 return {...def,qty};
}
export function createPlayerRewardsV134({db,readPass,readPremium,readBonus,readSystems,world,secret}){
 const saved=async uid=>{const {data,error}=await db.from('game_saves').select('state,updated_at').eq('user_id',uid).single();if(error||!data?.state)fail('Progresso indisponível','PLAYER_STORAGE_UNAVAILABLE');return data;};
 async function replay(uid,id,hash,module){
  const {data,error}=await db.from('stellar_player_commands_v134').select('request_hash,module').eq('user_id',uid).eq('command_id',id).maybeSingle();if(error)fail('Recibos indisponíveis','PLAYER_STORAGE_UNAVAILABLE');
  if(!data)return null;if(data.request_hash!==hash||data.module!==module)fail('Identificador reutilizado','COMMAND_ID_REUSED');
  const r=await db.rpc('stellar_player_commit',{p_user_id:uid,p_command_id:id,p_module:module,p_request_hash:hash,p_payload:{}});if(r.error||!r.data?.ok)fail('Recuperação indisponível');return r.data;
 }
 async function commit(uid,id,module,hash,make){
  const previous=await replay(uid,id,hash,module);if(previous)return previous;
  for(let attempt=0;attempt<5;attempt++){
   const before=await saved(uid),draft=structuredClone(before.state),payload=await make(draft);
   draft.serverPurchaseRevision=count(before.state.serverPurchaseRevision)+1;
   const r=await db.rpc('stellar_player_commit',{p_user_id:uid,p_command_id:id,p_module:module,p_request_hash:hash,p_payload:{...payload,base:before.state,state:draft}});
   if(r.error)throw Object.assign(Error(r.error.message),{code:r.error.code,status:503});if(r.data?.ok)return r.data;
   if(!['PLAYER_RETRY','COLLECTION_STALE'].includes(r.data?.code))fail('Operação não confirmada',r.data?.code);
  }fail('Outra operação está sendo confirmada. Tente novamente com o mesmo pedido.','PLAYER_RETRY');
 }
 return {
  async claim(uid,body,req){
   const kind=String(body.kind||''),n=Number(body.tier||body.level),season=String(body.season||'');
   if(!['level','pass_free','pass_premium'].includes(kind)||!Number.isSafeInteger(n)||n<1||n>100)fail('Resgate inválido');
   const intent={kind,n,season},id='reward_'+operationDigestV125('reward',intent),hash=operationDigestV125('reward',intent);
   return commit(uid,id,'reward',hash,async s=>{
    let reward;if(kind==='level'){
     if(n<2||n>44||count(s.profile?.level)<n)fail('Nível não liberado');s.levelRewards||={};s.levelRewards.claimed||={};
     if(s.levelRewards.claimed[n])return {receipt:{alreadyClaimed:true}};
     reward=levelRewardV134(n);s.levelRewards.claimed[n]=Date.now();
    }else{
     const pass=await readPass(),def=(pass.seasons||[]).find(x=>x.season_key===season),tier=(pass.tiers||[]).find(x=>x.season_key===season&&Number(x.tier_no)===n);
     if(!def||!def.enabled||Date.now()<Date.parse(def.starts_at)||Date.now()>=Date.parse(def.ends_at)||!tier||tier.enabled===false)fail('Temporada ou tier indisponível');
     if(s.battlePass?.season!==season||Math.floor(count(s.battlePass?.points)/Number(def.points_per_tier))<n)fail('Tier não liberado');
     if(kind==='pass_premium'&&!(await readPremium(req))?.battle_pass_active)fail('Passe Premium necessário');
     const field=kind==='pass_free'?'claimedTiers':'premiumClaimedTiers';s.battlePass[field]||={};
     if(s.battlePass[field][n])return {receipt:{alreadyClaimed:true}};
     reward=kind==='pass_free'?tier.free_reward:tier.premium_reward;s.battlePass[field][n]=Date.now();
    }
    applyBundleV134(s,reward);return {receipt:{...intent,reward}};
   });
  },
  async ensure(uid){
   const client=world()?.findClient(uid);if(!client?.player||!client.room)fail('Conecte-se ao mapa');
   const mapId=client.room.mapId,key=client.room.key,config=(await readBonus()).config||{},map=MAPS[mapId];
   const target=map?.gate?0:Math.max(0,Math.min(100,Number(config.map_counts?.[mapId])||0));
   const r=await db.rpc('stellar_player_bonus_ensure',{p_user_id:uid,p_map_key:key,p_count:target,p_width:Number(map?.world?.w)||4000,p_height:Number(map?.world?.h)||3000});
   if(r.error)throw Error(r.error.message);const loot=await db.from('stellar_collection_drops_v134').select('drop_id,x,y,payload,expires_at').eq('user_id',uid).eq('map_key',key).eq('kind','loot').gt('expires_at',new Date().toISOString());if(loot.error)throw Error(loot.error.message);return {ok:true,map_key:key,boxes:r.data||[],loot:(loot.data||[]).map(d=>({id:d.drop_id,x:d.x,y:d.y,resources:d.payload.resources,expires_at:d.expires_at}))};
  },
  async collect(uid,body){
   const dropId=String(body.drop_id||''),id=String(body.request_id||'');if(!/^[A-Za-z0-9_:-]{8,180}$/.test(dropId)||!/^[A-Za-z0-9_-]{10,90}$/.test(id))fail('Coleta inválida');
   const hash=operationDigestV125('collection',{dropId});
   return commit(uid,id,'collection',hash,async s=>{
    const {data:drop,error}=await db.from('stellar_collection_drops_v134').select('*').eq('user_id',uid).eq('drop_id',dropId).maybeSingle();
    if(error||!drop)fail('Caixa não disponível','COLLECTION_UNAVAILABLE');
    const client=world()?.findClient(uid);
    if(!client?.player||client.room?.key!==drop.map_key||Math.hypot(client.player.x-drop.x,client.player.y-drop.y)>150)fail('Aproxime-se da caixa');
    const payload={drop_id:dropId,drop_before:drop.payload,drop_after:null};
    if(drop.kind==='loot'){
     s.cargo||={};let free=Math.max(0,cargoCapacityV134(s,await readSystems())-Object.entries(s.cargo).reduce((n,[k,v])=>n+(k==='Xenomit'?0:count(v)),0));const remaining={...drop.payload.resources},picked={};
     for(const [k,v] of Object.entries(remaining)){
      const n=Math.min(count(v),k==='Xenomit'?count(v):free);if(!n)continue;s.cargo[k]=count(s.cargo[k])+n;remaining[k]-=n;if(!remaining[k])delete remaining[k];picked[k]=n;if(k!=='Xenomit')free-=n;
     }
     if(!Object.keys(picked).length)fail('Porão cheio','CARGO_FULL');
     payload.drop_after=Object.keys(remaining).length?{...drop.payload,resources:remaining}:null;payload.receipt={kind:'loot',picked,remaining};
    }else{
     const config=(await readBonus()).config||{};if(Number(config.map_counts?.[client.room.mapId]||0)<=0)fail('Box desativada neste mapa','COLLECTION_DISABLED');const reward=rollBonusV134(config,s.pet,seededRandomV134(secret+':'+uid+':'+dropId));
     if(reward.kind==='ammo'){s.ammo||={};s.ammo[reward.id]=count(s.ammo[reward.id])+reward.qty;}
     else if(reward.kind==='stellarDust')s.stellarDust=count(s.stellarDust)+reward.qty;
     else s.profile[reward.kind]=count(s.profile[reward.kind])+reward.qty;
     const rng=seededRandomV134(secret+':respawn:'+dropId),delay=Number(config.respawn_min_ms||10000)+rng()*Math.max(0,Number(config.respawn_max_ms||30000)-Number(config.respawn_min_ms||10000));
     payload.respawn_ms=Math.round(delay);const area=client.room.map?.world||MAPS[client.room.mapId]?.world||{w:4000,h:3000};payload.respawn_x=220+rng()*(Number(area.w)-440);payload.respawn_y=220+rng()*(Number(area.h)-440);payload.receipt={kind:'bonus',reward};
    }
    return payload;
   });
  }
 };
}
