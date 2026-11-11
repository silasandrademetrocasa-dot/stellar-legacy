import {randomUUID} from 'node:crypto';
import {NPCS,christmasWindow,isChristmas} from '../public/modules/christmas-v132.js';
export function createChristmasService({service,ensureInactive}){
 const api={config:null,lastRefresh:0};
 api.refresh=async()=>{if(Date.now()-api.lastRefresh<15000)return;api.lastRefresh=Date.now();try{const sb=await service();const {data,error}=await sb.from('stellar_natal_config_v132').select('*').eq('id',1).single();if(error)throw error;api.config=data;}catch{api.config=null;}};
 api.active=()=>api.config?.enabled===true&&Date.now()>=Date.parse(api.config.starts_at)&&Date.now()<Date.parse(api.config.ends_at);
 api.action=async(uid,key,action,payload={})=>{await ensureInactive(uid);const sb=await service();const {data,error}=await sb.rpc('stellar_player_natal_action',{p_user_id:uid,p_key:key,p_action:action,p_payload:payload});if(error)throw Error(error.message);return data;};
 api.status=async uid=>{await api.refresh();const sb=await service();const {data,error}=await sb.rpc('stellar_natal_status_v132',{p_user_id:uid});if(error)throw Error(error.message);return data;};
 api.recover=async(uid,key)=>{const sb=await service();const {data,error}=await sb.from('stellar_natal_actions_v132').select('receipt').eq('user_id',uid).eq('key',key).maybeSingle();if(error)throw Error(error.message);if(!data)return null;const save=await sb.from('game_saves').select('state').eq('user_id',uid).single();if(save.error)throw Error(save.error.message);return {...data.receipt,state:save.data.state,replayed:true};};
 api.bossKilled=async key=>{const sb=await service();const {data,error}=await sb.from('stellar_natal_counts_v132').select('key').eq('key','npc:'+key).maybeSingle();if(error)throw Error(error.message);return !!data;};
 return api;
}
export function mountChristmasRoutes(app,{requireUser,asyncRoute,api,getWorld}){
 app.get('/api/player/natal',requireUser,asyncRoute(async(req,res)=>{const status=await api.status(req.user.id),world=getWorld();const main=t=>world?.mainEventV132?.(t)||null;
 const now=Date.now(),upcoming=[];let last='';for(let t=now;t<now+86400000;t+=60000){const e=main(t)||christmasWindow(t,main);if(e&&e.eventId!==last){upcoming.push(e);last=e.eventId;if(upcoming.length>=6)break;}}
 res.set('Cache-Control','no-store').json({...status,current:world?.currentEvent?.(),upcoming});}));
 app.post('/api/player/natal/claim',requireUser,asyncRoute(async(req,res)=>{
 const key=String(req.body?.key||'');const action=key.split(':')[0];
 if(!['coupon','mission','faction','global','design','pass'].includes(action)||key.length>160)return res.status(400).json({error:'Prêmio inválido'});
 res.json(await api.action(req.user.id,key,action));
 }));
}
export function natalRoomTick(room,now,send){
 const ev=room.event;if(!ev?.rules?.christmas)return;
 if(room.natalEventId!==ev.eventId){room.natalEventId=ev.eventId;room.natalRefill=0;room.natalBossChecked=false;room.natalKills=0;}
 if(now>=(room.natalRefill||0)){
  room.natalRefill=now+60000;
  const caps=room.mapId==='x4'?[6,3,1]:[8,4,2];
  Object.keys(NPCS).slice(0,3).forEach((type,i)=>{
   const alive=[...room.npcs.values()].filter(e=>e.type===type&&e.eventId===ev.eventId).length;
   for(let k=alive;k<caps[i];k++){const e=room.makeNpc(type,{eventNpc:true,eventId:ev.eventId,forceChase:true});if(e){const p=natalPosition(room);Object.assign(e,p,{patrolHomeX:p.x,patrolHomeY:p.y});room.npcs.set(e.id,e);room.broadcast({type:'npc_spawn',entity:room.publicNpc(e)});}}
  });

 }
 if(room.mapId!=='x4'&&!room.natalBossChecked&&(now>=ev.start+1200000||(room.natalKills>=60&&now>=ev.start+300000))){
  room.natalBossChecked=true;const key=`${ev.eventId}:king`;
  room.world.natal.bossKilled(key).then(killed=>{
   if(killed||room.event?.eventId!==ev.eventId)return;
   const e=room.makeNpc('natalRei',{id:key,eventNpc:true,eventId:ev.eventId,forceChase:true});if(e){Object.assign(e,natalPosition(room));room.npcs.set(e.id,e);room.broadcast({type:'npc_spawn',entity:room.publicNpc(e)});}
  }).catch(()=>{setTimeout(()=>{room.natalBossChecked=false;},15000).unref?.();});
 }
}
function natalPosition(room){
 const portals=room.map.portals||[];let p;
 for(let i=0;i<50;i++){p=room.randomPosition(600);if(!portals.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<600))break;}return p;
}
export async function natalSocket(room,ws,msg,send){
 const uid=ws.player?.userId;if(!uid||!room.world.natal?.active()||!room.playerFresh(ws.player))return;
 if(msg.type==='natal_fire'){
  if(ws.natalPending)return;ws.natalPending=true;
  try{
   const id=String(msg.id||'');if(!/^[0-9a-f-]{36}$/i.test(id))return;
   const r=await room.world.natal.action(uid,'fire:'+id,'fire');send(ws,{type:'natal_fire_ack',id,...r});
   // A replay returns the same receipt, never broadcasts another effect.
   if(!r.replayed)room.broadcast({type:'natal_firework',userId:uid,x:ws.player.x,y:ws.player.y,start:Date.parse(r.launched_at),style:['snow','red','gold'].includes(msg.style)?msg.style:'gold'});
  }catch(e){send(ws,{type:'natal_error',message:e.message});}finally{ws.natalPending=false;}
 }
}
