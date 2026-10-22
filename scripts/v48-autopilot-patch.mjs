#!/usr/bin/env node
// V48 ZIP installer stage: source-only/idempotent. No network, no account writes.
import {readFileSync,writeFileSync} from 'node:fs';
const ROOT=new URL('../',import.meta.url);
function patch(p,fn){const url=new URL(p,ROOT),old=readFileSync(url,'utf8'),next=fn(old);if(next!==old){writeFileSync(url,next);console.log('V48 • integração:',p);}else console.log('V48 • já instalado:',p);}
function once(s,anchor,replace,label){if(s.includes(replace))return s;const n=s.split(anchor).length-1;if(n!==1)throw Error(`V48 ${label}: esperado 1 anchor, obtido ${n}`);return s.replace(anchor,replace);}
const SERVER_MARK='// ===================== ADMIN CONTROL PANEL =====================';
const SERVER_CODE=`// ====== V48 • AUTOPILOT ENTITLEMENT / ADMIN GRANTS ======
// Admin RPC is authoritative. Entitlements are never sourced from Premium or JWT metadata.
async function autopilotAdminV48(req,res){
  const {data,error}=await req.sb.rpc('admin_status_v1763');
  if(error||data?.is_admin!==true){res.status(403).json({error:'Somente ADM autenticado.'});return false;}
  return true;
}
app.get('/api/autopilot/v48/access',requireUser,asyncRoute(async(req,res)=>{
  res.set('Cache-Control','no-store');
  const {data:admin,error:err}=await req.sb.rpc('admin_status_v1763');
  if(err)return res.status(503).json({error:'Autorização indisponível.'});
  const isAdmin=admin?.is_admin===true;
  if(isAdmin)return res.json({allowed:true,is_admin:true,source:'admin'});
  const service=await requireEliteAdmin();
  const {data,error}=await service.from('stellar_autopilot_access_v48').select('enabled,source,expires_at').eq('user_id',req.user.id).maybeSingle();
  if(error)return res.status(503).json({error:'Permissão do Autopilot indisponível.'});
  const active=data?.enabled===true&&(!data.expires_at||new Date(data.expires_at).getTime()>Date.now());
  return res.json({allowed:active,is_admin:false,source:active?data.source:null});
}));
app.get('/api/admin/autopilot/v48/grants',requireUser,asyncRoute(async(req,res)=>{
  if(!await autopilotAdminV48(req,res))return;
  const service=await requireEliteAdmin();
  const {data,error}=await service.from('stellar_autopilot_access_v48').select('user_id,enabled,source,expires_at,updated_at').limit(1000);
  if(error)return res.status(503).json({error:'Lista de permissões indisponível.'});
  res.set('Cache-Control','no-store');res.json({grants:data||[]});
}));
app.put('/api/admin/autopilot/v48/grants/:userId',requireUser,asyncRoute(async(req,res)=>{
  if(!await autopilotAdminV48(req,res))return;
  const userId=String(req.params.userId||'');
  if(!/^[a-f0-9-]{36}$/i.test(userId)||typeof req.body?.enabled!=='boolean')return res.status(400).json({error:'Dados inválidos.'});
  const service=await requireEliteAdmin();
  const {data:user,error:userError}=await service.from('profiles').select('id').eq('id',userId).maybeSingle();
  if(userError||!user)return res.status(404).json({error:'Jogador não encontrado.'});
  const {data:isProtected,error:protectedError}=await req.sb.rpc('is_game_admin_v1763',{p_uid:userId});
  if(protectedError)return res.status(503).json({error:'Não foi possível validar a conta.'});
  if(isProtected===true)return res.status(403).json({error:'Administradores já têm acesso.'});
  // Origem de acesso sempre ADM. Verificação de pagamento futuro exige fluxo próprio.
  const {data,error}=await service.from('stellar_autopilot_access_v48').upsert({user_id:userId,enabled:req.body.enabled,source:'admin',granted_by:req.user.id,expires_at:null,updated_at:new Date().toISOString()},{onConflict:'user_id'}).select('user_id,enabled').single();
  if(error)return res.status(503).json({error:'Permissão não pôde ser salva.'});
  res.set('Cache-Control','no-store');res.json({ok:true,grant:data});
}));
// ====== END AUTOPILOT V48 ======
`;
patch('server/index.js',s=>once(s,SERVER_MARK,SERVER_CODE+'\n'+SERVER_MARK,'rotas do servidor'));
const IMPORT_ANCHOR="import { createFrameGate } from './modules/frame-gate.js?v=47.7.6';";
const IMPORT_V48="import { createStellarAutopilotV48 } from './modules/stellar-autopilot-v48.js?v=47.7.6';";
const CONTROLLER_ANCHOR="const adminRuntimeMonitor={data:null,busy:false};";
const CONTROLLER_V48=`// V48 • Piloto conectado: não credita prêmios e não contorna a autorização do Render.
const AUTOPILOT_V48=createStellarAutopilotV48({
  credentials:()=>getSessionCredentials(),
  getIdentity:()=>getUser()?.id||null,
  npcTypes:Object.entries(NPC_TYPES||{}).map(([id,n])=>({id,label:n?.name||id})),
  getSnapshot:()=>({
    online:authenticated&&sharedUniverseOnline(),ready:!!progress&&!gameBootstrapRuntime.loading,
    jumping:!!state.jumping,map:progress?.mapId||'',repairRequired:!!progress?.repairRequired,
    atBase:!!progress&&isAtTrader(),canSell:!!progress&&canSellCargoNow(),buyPermitted:!!progress&&(isAtTrader()||autoBuyEnabled()),
    base:progress?basePointForFaction(progress.profile.faction,'x1'):{x:0,y:0},
    player:{x:player.x,y:player.y,hp:player.hp,maxHp:player.maxHp},
    enemies:state.enemies,loot:state.loot,bonusBoxes:state.bonusBoxes,ores:state.ores,timeSec:nowSec(),
    laserRange:playerLaserRange(),rocketRange:playerRocketRange(),rocketReady:rocketReady(),
    credits:Number(progress?.profile?.credits)||0,stl:Number(progress?.profile?.uridium)||0,
    xp:Number(progress?.profile?.xp)||0,kills:Number(progress?.profile?.aliensKilled)||0,
    level:Number(progress?.profile?.level)||1,
    cargoUsed:progress?cargoUsed():0,cargoCapacity:progress?cargoCapacity():1,cargoFree:progress?cargoFree():0,
    ammoStock:progress?ammoQty(progress.selectedLaserAmmo):0,rocketStock:progress?rocketQty(progress.selectedRocket):0,
    ammoQuote:progress?liveQuote('ammo:'+progress.selectedLaserAmmo):null,
    rocketQuote:progress?liveQuote('rocket:'+progress.selectedRocket):null
  }),
  getGraphLabel:()=>currentGraphMapLabel(),
  getGoalLabel:map=>displayMapLabel(map,progress?.profile?.faction||null),
  getPortals:label=>portalsForGraphLabel(label)||[],
  mayTravel:label=>!/^4-/.test(String(label))&&canTravelGraphLabel(label).ok,
  navigate:(x,y)=>{if(!progress||!state.currentMap)return;const world=state.currentMap.world;
    player.tx=Math.max(35,Math.min(world.w-35,Number(x)||player.x));
    player.ty=Math.max(35,Math.min(world.h-35,Number(y)||player.y));},
  jumpPortal:portal=>jumpThroughPortal(portal),
  selectNpc:(npc,fire)=>{if(state.target?.id!==npc.id)selectCombatTarget(npc,{silent:true});player.laserFiring=!!fire;},
  stopFire:()=>{player.laserFiring=false;state.target=null;},
  fireRocket:()=>fireRocket(false),
  sellCargo:()=>sellAllCargo(),
  buyPackage:(key,kind)=>runAutoBuy(key,kind==='ammo'?'Munição Autopilot':'Mísseis Autopilot'),
  onNotice:()=>{}
});
`;
patch('public/game.js',s=>{
 s=once(s,IMPORT_ANCHOR,IMPORT_ANCHOR+'\n'+IMPORT_V48,'import');
 s=once(s,CONTROLLER_ANCHOR,CONTROLLER_ANCHOR+'\n'+CONTROLLER_V48,'instância');
 s=once(s,'authenticated=true;void refreshCommandV22();','authenticated=true;void AUTOPILOT_V48.refreshAccess();void refreshCommandV22();','verificação no login');
 s=once(s,"canvas.addEventListener('pointerdown',pointerAction);","canvas.addEventListener('pointerdown',e=>{if(AUTOPILOT_V48.active)AUTOPILOT_V48.stop('Controle manual retomado');}, {capture:true});\ncanvas.addEventListener('pointerdown',pointerAction);",'controle manual');
 s=once(s,'telemetryTick(dt);eliteRouteTrackV2012(dt);processRespawns();','telemetryTick(dt);eliteRouteTrackV2012(dt);processRespawns();AUTOPILOT_V48.tick();','tick');
 s=once(s,'renderAdminStatus();renderAdminUsers();renderAdminActions();', 'renderAdminStatus();renderAdminUsers();void AUTOPILOT_V48.decorateAdminUsers(ui.adminUserList,adminRuntime.users);renderAdminActions();','check do jogador');
 s=once(s,"if(fromPet)addPetXp(5);\n  saveGame();updateUI();","if(fromPet)addPetXp(5);\n  AUTOPILOT_V48.recordCollect('box');\n  saveGame();updateUI();",'BOX bônus real');
 s=once(s,"if(total>0){\n    playSfx('pickup');","if(total>0){\n    AUTOPILOT_V48.recordCollect('drop');\n    playSfx('pickup');",'drop NPC real');
 s=once(s,"const got=addCargoResource(o.type,o.amount);if(got>0){playSfx('ore');","const got=addCargoResource(o.type,o.amount);if(got>0){AUTOPILOT_V48.recordCollect('ore');playSfx('ore');",'minério real');
 return s;
});
console.log('✅ Integração Autopilot V48 verificada (sem alterações no banco).');
