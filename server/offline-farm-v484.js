import {forecastV495} from './farm-v495-forecast.js';
import {safeFarmEconomySnapshot} from './farm-v86-economy.js';
import {createHash,timingSafeEqual} from 'node:crypto';
import {combatProfileV487,npcCombatCycleV487} from './offline-farm-v487-engine.js';
/* STELLAR_OFFLINE_FARM_V484 — servidor: sessão persistida e liquidação SQL atômica.
 * Não roda timers em segundo plano, não faz ping artificial para manter o Render acordado.
 */
const activityCacheV484=new Map();
const FARM_V49='STELLAR_FARM_V49';
const onlyOrdinaryNpc=n=>!/(boss|rift|elite|suprem|legend|lend|uber|ultra|titan)/i.test(String(n.npc_key||'')+' '+String(n.name||''));
const saneMoney=x=>Math.max(0,Number(x)||0);
async function farmGrantV49(sb,userId){
 const [grant,adm,global]=await Promise.all([
  sb.from('stellar_offline_farm_access_v488').select('enabled,max_minutes,expires_at').eq('user_id',userId).maybeSingle(),
  sb.from('game_admins').select('user_id').eq('user_id',userId).maybeSingle(),
  sb.from('stellar_offline_farm_settings_v485').select('max_minutes').eq('id',1).single()
 ]);
 if(grant.error||adm.error||global.error)throw grant.error||adm.error||global.error;
 const isAdmin=!!adm.data,allowed=isAdmin||!!(grant.data?.enabled&&(!grant.data.expires_at||new Date(grant.data.expires_at)>new Date()));
 const maxMinutes=Math.min(Number(global.data.max_minutes)||240,Number(grant.data?.max_minutes)||720);
 return {allowed,isAdmin,maxMinutes,explicit:!!grant.data?.enabled,expiresAt:grant.data?.expires_at||null};
}
async function farmNpcOptionsV49(sb,map){
 if(!/^x[1-8]$/.test(String(map||'')))return [];
 const [spawn,npcs]=await Promise.all([
  sb.from('game_map_npc_spawns_v1811').select('npc_key').eq('map_id',map).eq('enabled',true).gt('spawn_count',0),
  sb.from('game_npc_config_v1811').select('npc_key,name,hp,shield,credits,stl,xp').eq('enabled',true)
 ]);
 if(spawn.error||npcs.error)throw spawn.error||npcs.error;
 const avail=new Set(spawn.data.map(x=>x.npc_key));
 return npcs.data.filter(n=>avail.has(n.npc_key)&&onlyOrdinaryNpc(n));
}
function rankFarmNpcV49(npcs,model,strategy,ammoPack,limits={}){
 const mins=Math.max(30,Math.min(720,Math.floor(Number(limits.minutes)||60)));
 const maxKills=Math.max(0,Math.floor(Number(limits.maxKills)||550));
 const stock=Math.max(0,Math.floor(Number(limits.stock)||0));
 const credits=Math.max(0,Math.floor(Number(limits.credits)||0));
 const autoBuy=limits.autoBuy!==false;
 return npcs.map(n=>{
  const cycle=npcCombatCycleV487({...model,npc:n});
  const forecast=forecastV495({npc:n,cycle,minutes:mins,maxKills,stock,credits,autoBuy,pack:ammoPack});
  const metrics={credits:forecast.creditsNet,xp:forecast.xp,stl:forecast.stl,balanced:forecast.creditsNet/10000+forecast.xp/400+forecast.stl*3,weakest:-Number(n.hp||0)-Number(n.shield||0)};
  const score=forecast.kills>0?metrics[strategy]??metrics.credits:Number.NEGATIVE_INFINITY;
  return {id:n.npc_key,name:n.name,credits:saneMoney(n.credits),xp:saneMoney(n.xp),stl:saneMoney(n.stl),timeSeconds:cycle.killSeconds,ammoPerKill:cycle.ammoPerKill,
   score,...forecast,perHourCredits:Math.round(forecast.creditsNet*60/mins),perHourXp:Math.round(forecast.xp*60/mins),perHourStl:Math.round(forecast.stl*60/mins)};
 }).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
}
function ratio(num,den){return den>0?Math.round(num*100/den)/100:0;}
function summarizedFarmHistoryV49(rows){
 return rows.map(f=>{const r=f.report||{},dur=Math.max(1,(new Date(f.ends_at)-new Date(f.started_at))/3600000);return {id:f.id,map:f.map_id,npc:f.npc_key,npcName:r.npc_name||f.snapshot?.npc_name||f.snapshot?.npc?.name||f.npc_key,model:r.combat_model||f.snapshot?.combat_model||'legacy',status:f.status,minutes:f.minutes,startedAt:f.started_at,endsAt:f.ends_at,completedAt:f.completed_at,kills:saneMoney(r.kills),xp:saneMoney(r.xp),creditsNet:Number(r.credits_net)||0,npcCredits:saneMoney(r.npc_credits),saleCredits:saneMoney(r.sale_credits),stl:saneMoney(r.stl),ammoSpent:saneMoney(r.ammo_spent),ammoBought:saneMoney(r.ammo_bought),killsPerHour:ratio(saneMoney(r.kills),dur),creditsPerHour:ratio(Number(r.credits_net)||0,dur),stlPerHour:ratio(saneMoney(r.stl),dur),reason:r.reason||null}});
}

export async function offlineFarmActiveV484(userId, getAdmin){
  const key=String(userId||'');const cached=activityCacheV484.get(key);
  if(cached&&Date.now()-cached.at<1200)return cached.active;
  const sb=await getAdmin();
  const {data,error}=await sb.from('stellar_offline_farm_v484').select('id').eq('user_id',userId).eq('status','running').limit(1);
  // Se a migração ainda não foi aplicada, não bloquear o jogo existente.
  if(error && /PGRST205|42P01|does not exist|schema cache/i.test(error.message||''))return false;
  if(error)throw new Error('Não foi possível verificar sessão offline: '+error.message);
  const active=!!data?.length;activityCacheV484.set(key,{at:Date.now(),active});
  return active;
}
export async function offlineFarmEnsureInactiveV484(userId,getAdmin){
  if(await offlineFarmActiveV484(userId,getAdmin))throw Object.assign(new Error('FARM_OFFLINE_ATIVO: finalize ou cancele antes de voltar ao combate.'),{code:'FARM_OFFLINE_ACTIVE',status:409});
}
export function installOfflineFarmV484(app,{requireUser,asyncRoute,requireEliteAdmin}){
  const noCache=(res)=>res.set('Cache-Control','no-store');
  const errorResponse=(res,e)=>{
    const msg=String(e?.message||'Operação indisponível');
    const bad=/INVALID_DURATION|FARM_MAP|FARM_SAVE|FARM_NO_ELIGIBLE|FARM_ALREADY|FARM_ACCESS|FARM_ECONOMY|FARM_CREDITS|FARM_OFFLINE_ACTIVE/.test(msg);
    return res.status(bad?409:503).json({ok:false,error:msg.slice(0,230)});
  };
  async function rpc(req,res,method,args={}){
    noCache(res);
    try{
      const sb=await requireEliteAdmin();
      let fn='stellar_offline_farm_'+method+(method==='start'||method==='claim'?'_v49':'_v484');
      if(method==='start'){
        const grant=await farmGrantV49(sb,req.user.id);
        if(!grant.allowed)throw Error('FARM_ACCESS_REQUIRED');
        if(Number(args.p_minutes)>grant.maxMinutes)throw Error('INVALID_DURATION');
      }
      if(method==='start'){
        const {data:save,error:saveError}=await sb.from('game_saves').select('state,updated_at').eq('user_id',req.user.id).maybeSingle();
        if(saveError||!save?.state)throw saveError||Error('FARM_SAVE_MISSING');
        const requested=String(args.p_ammo_key||save.state.selectedLaserAmmo||'lcb10');
        const model=combatProfileV487(save.state,requested);
        const rawNpc=String(args.p_npc_key||'');
        if(rawNpc.startsWith('auto:')){
          const strategy=rawNpc.slice(5);
          if(!['credits','xp','stl','balanced','weakest'].includes(strategy))throw Error('FARM_NPC_STRATEGY_INVALID');
          const [npcs,quotes]=await Promise.all([
            farmNpcOptionsV49(sb,save.state.mapId),
            sb.from('live_shop_prices_v16').select('ref_id,price,currency,meta').eq('kind','ammo').eq('ref_id',requested).eq('enabled',true).limit(1)
          ]);
          if(quotes.error)throw quotes.error;
          const pack=quotes.data?.[0];
          const cfg=await sb.from('stellar_offline_farm_settings_v485').select('max_kills').eq('id',1).single();
          if(cfg.error)throw cfg.error;
          const best=rankFarmNpcV49(npcs,model,strategy,pack&&{price:pack.price,currency:pack.currency,qty:pack.meta?.grant?.qty},{minutes:args.p_minutes,maxKills:cfg.data?.max_kills,stock:save.state.ammo?.[requested],credits:save.state.profile?.credits,autoBuy:args.p_auto_buy})[0];
          if(!best)throw Error('FARM_NO_ELIGIBLE_NPCS');
          args.p_npc_key=best.id;
        }
        args={...args,p_ammo_key:requested,p_combat:model,p_baseline_save_at:save.updated_at};
      }
      const {data,error}=await sb.rpc(fn,{p_user:req.user.id,...args});
      if(error)throw error;
      if(method==='start'&&data?.status==='running')activityCacheV484.set(String(req.user.id),{at:Date.now(),active:true});
      if(method==='cancel'||method==='claim')activityCacheV484.delete(String(req.user.id));
      return res.json(data||{ok:false});
    }catch(e){return errorResponse(res,e);}
  }
  // V86: read the account's authoritative balance while offline farm is active.
  // No economic write, no claim and no mutation of stale client saves.
  app.get('/api/offline-farm/v484/v86/economy',requireUser,asyncRoute(async(req,res)=>{
    noCache(res);
    const sb=await requireEliteAdmin();
    const {data,error}=await sb.from('game_saves').select('state,updated_at').eq('user_id',req.user.id).maybeSingle();
    if(error)return res.status(503).json({error:'Saldo online indisponível.'});
    if(!data?.state)return res.status(404).json({error:'Save não encontrado para sua conta.'});
    res.json({ok:true,economy:safeFarmEconomySnapshot(data.state,data.updated_at),
      note:'Saldo confirmado no save; os ganhos projetados do Farm Offline entram apenas após resgate.'});
  }));
  app.get('/api/offline-farm/v484/status',requireUser,asyncRoute(async(req,res)=>rpc(req,res,'status')));
  app.get('/api/offline-farm/v484/options',requireUser,asyncRoute(async(req,res)=>{
    noCache(res);
    try{
      const sb=await requireEliteAdmin();
      const save=await sb.from('game_saves').select('state').eq('user_id',req.user.id).maybeSingle();
      if(save.error)throw save.error;
      const map=String(save.data?.state?.mapId||'');
      if(!/^x[1-8]$/.test(map))return res.json({map,choices:[]});
      const [spawn,npcs,ammo,settings]=await Promise.all([sb.from('game_map_npc_spawns_v1811').select('npc_key').eq('map_id',map).eq('enabled',true),sb.from('game_npc_config_v1811').select('npc_key,name,hp,shield,credits,stl,xp').eq('enabled',true),sb.from('live_shop_prices_v16').select('ref_id,price,currency,meta').eq('kind','ammo').eq('enabled',true).eq('shop_visible',true),sb.from('stellar_offline_farm_settings_v485').select('max_minutes').eq('id',1).single()]);
      if(spawn.error||npcs.error||ammo.error||settings.error)throw spawn.error||npcs.error||ammo.error||settings.error;
      const found=new Set((spawn.data||[]).map(r=>r.npc_key));
      const choices=(npcs.data||[]).filter(r=>found.has(r.npc_key)&&!/(boss|rift|elite|suprem|legend|lend|uber|ultra|titan)/i.test(r.npc_key+' '+r.name)).map(r=>({id:r.npc_key,name:r.name,credits:r.credits,stl:r.stl})).sort((a,b)=>Number(a.credits)-Number(b.credits));
      const grant=await farmGrantV49(sb,req.user.id);
      return res.json({map,allowed:grant.allowed,isAdmin:grant.isAdmin,choices,ammunition:(ammo.data||[]).filter(r=>['lcb10','mcb25','mcb50','ucb100'].includes(r.ref_id)).map(r=>({id:r.ref_id,price:r.price,currency:r.currency,qty:Number(r.meta?.grant?.qty)||0})),maxMinutes:grant.maxMinutes,selectedAmmo:String(save.data?.state?.selectedLaserAmmo||'lcb10')});
    }catch(e){return errorResponse(res,e);}
  }));
  app.post('/api/offline-farm/v484/start',requireUser,asyncRoute(async(req,res)=>{ 
    const b=req.body||{};
    if(!Number.isInteger(b.minutes)||b.minutes<30||b.minutes>720||b.minutes%30!==0 || ['autoSell','autoBuy','mine'].some(k=>b[k]!==undefined&&typeof b[k]!=='boolean'))
      return res.status(400).json({error:'Duração ou preferências inválidas.'});
    return rpc(req,res,'start',{p_minutes:b.minutes,p_auto_sell:b.autoSell!==false,p_auto_buy:b.autoBuy!==false,p_mine:b.mine!==false,p_npc_key:typeof b.npc==='string'&&b.npc.length<=60?b.npc:null,p_ammo_key:typeof b.ammo==='string'&&b.ammo.length<=20?b.ammo:null});
  }));

  // The farm cannot accrue SQL rewards while Render sleeps. This endpoint computes an
  // explicitly non-authoritative preview from the same frozen NPC/ammo/session values.
  app.get('/api/offline-farm/v484/preview',requireUser,asyncRoute(async(req,res)=>{
    noCache(res);
    try{
      const sb=await requireEliteAdmin();
      const {data:f,error}=await sb.from('stellar_offline_farm_v484').select('id,status,map_id,npc_key,ammo_key,minutes,auto_buy,auto_sell,mine,started_at,ends_at,snapshot,report').eq('user_id',req.user.id).order('created_at',{ascending:false}).limit(1).maybeSingle();
      if(error)throw error;
      if(!f||f.status!=='running')return res.json({status:f?.status||'none',report:f?.report||null});
      const {data:save,error:saveError}=await sb.from('game_saves').select('state').eq('user_id',req.user.id).maybeSingle();
      if(saveError)throw saveError;
      const [resources,orePool]=await Promise.all([sb.from('game_resource_config_v1814').select('resource_key,sell_price').eq('enabled',true),sb.from('game_map_resource_pool_v1814').select('resource_key').eq('enabled',true).eq('map_id',f.map_id).order('resource_key',{ascending:true})]);
      if(resources.error||orePool.error)throw resources.error||orePool.error;
      return res.json(previewOfflineFarmV485(f,save?.state||{},resources.data||[],orePool.data||[]));
    }catch(e){return errorResponse(res,e);}
  }));

  async function adm(req,res){
    const {data,error}=await req.sb.rpc('admin_status_v1763');
    if(error||data?.is_admin!==true){res.status(403).json({error:'Acesso exclusivo do ADM'});return null;}
    return await requireEliteAdmin();
  }
  app.get('/api/offline-farm/v484/admin/settings',requireUser,asyncRoute(async(req,res)=>{
    const sb=await adm(req,res);if(!sb)return;
    const [cfg,sessions]=await Promise.all([sb.from('stellar_offline_farm_settings_v485').select('*').eq('id',1).single(),sb.from('stellar_offline_farm_v484').select('user_id,map_id,npc_key,started_at,ends_at,minutes').eq('status','running').order('started_at',{ascending:false}).limit(100)]);
    if(cfg.error||sessions.error)return errorResponse(res,cfg.error||sessions.error);
    const {data:catalog,error:catalogError}=await sb.from('game_npc_config_v1811').select('npc_key,name');
    if(catalogError)throw catalogError;
    const byKey=new Map((catalog||[]).map(x=>[x.npc_key,x.name]));
    noCache(res);return res.json({settings:cfg.data,sessions:(sessions.data||[]).map(x=>({...x,npc_name:byKey.get(x.npc_key)||x.npc_key}))});
  }));
  app.put('/api/offline-farm/v484/admin/settings',requireUser,asyncRoute(async(req,res)=>{
    const sb=await adm(req,res);if(!sb)return;
    const b=req.body||{};
    const values={max_minutes:Number(b.max_minutes),damage_percent:Number(b.damage_percent),max_kills:Number(b.max_kills),travel_seconds:Number(b.travel_seconds)};
    if(!Object.values(values).every(Number.isInteger)||values.max_minutes<30||values.max_minutes>720||values.max_minutes%30!==0||values.damage_percent<50||values.damage_percent>150||values.max_kills<20||values.max_kills>2000||values.travel_seconds<45||values.travel_seconds>600)return res.status(400).json({error:'Configuração fora dos limites de segurança.'});
    const {data,error}=await sb.from('stellar_offline_farm_settings_v485').update({...values,updated_at:new Date().toISOString()}).eq('id',1).select('*').single();
    if(error)return errorResponse(res,error);
    noCache(res);return res.json({ok:true,settings:data});
  }));
  app.post('/api/offline-farm/v484/admin/cancel',requireUser,asyncRoute(async(req,res)=>{
    const sb=await adm(req,res);if(!sb)return;
    const id=String(req.body?.userId||'');if(!/^[a-f0-9-]{36}$/i.test(id))return res.status(400).json({error:'ID de piloto inválido'});
    const {data,error}=await sb.rpc('stellar_offline_farm_cancel_v484',{p_user:id});if(error)return errorResponse(res,error);
    return res.json(data||{ok:true});
  }));
  // V49: private history and forward-looking per-NPC economic recommendations.
  app.get('/api/offline-farm/v484/v49/history',requireUser,asyncRoute(async(req,res)=>{
    noCache(res);try{
      const sb=await requireEliteAdmin();
      const {data,error}=await sb.from('stellar_offline_farm_v484').select('id,map_id,npc_key,status,minutes,started_at,ends_at,completed_at,report,snapshot').eq('user_id',req.user.id).order('created_at',{ascending:false}).limit(35);
      if(error)throw error;
      res.json({sessions:summarizedFarmHistoryV49(data||[])});
    }catch(e){errorResponse(res,e);}
  }));
  app.get('/api/offline-farm/v484/v49/strategies',requireUser,asyncRoute(async(req,res)=>{
    noCache(res);try{
      const sb=await requireEliteAdmin();
      const {data:save,error}=await sb.from('game_saves').select('state').eq('user_id',req.user.id).maybeSingle();
      if(error||!save?.state)throw error||Error('FARM_SAVE_MISSING');
      const state=save.state,ammo=String(req.query.ammo||state.selectedLaserAmmo||'lcb10');
      const requestedMinutes=Number(req.query.minutes);
      const minutes=Number.isInteger(requestedMinutes)?Math.min(720,Math.max(30,requestedMinutes)):60;
      const autoBuy=req.query.autoBuy!=='0';
      const profile=combatProfileV487(state,ammo);
      const [npcs,quotes,settings,grant]=await Promise.all([
        farmNpcOptionsV49(sb,state.mapId),
        sb.from('live_shop_prices_v16').select('ref_id,price,currency,meta').eq('kind','ammo').eq('ref_id',ammo).eq('enabled',true).limit(1),
        sb.from('stellar_offline_farm_settings_v485').select('max_kills').eq('id',1).single(),
        farmGrantV49(sb,req.user.id)
      ]);
      if(settings.error)throw settings.error;
      if(quotes.error)throw quotes.error;
      const q=quotes.data?.[0],pack=q&&{price:q.price,currency:q.currency,qty:q.meta?.grant?.qty};
      const boundedMinutes=Math.min(minutes,grant.maxMinutes);
      const budget={minutes:boundedMinutes,maxKills:settings.data?.max_kills,stock:state.ammo?.[ammo],credits:state.profile?.credits,autoBuy};
      const strategies=Object.fromEntries(['credits','xp','stl','balanced','weakest'].map(key=>[key,rankFarmNpcV49(npcs,profile,key,pack,budget).slice(0,6)]));
      res.json({map:state.mapId,ammo,minutes:boundedMinutes,autoBuy,model:'v495_forecast',strategies,disclaimer:'PROJEÇÃO NÃO GARANTIDA: simulação conservadora sem ganhos de mineração/vendas ou bônus temporários. Saldo só é creditado no resgate.'});
    }catch(e){errorResponse(res,e);}
  }));
  app.get('/api/offline-farm/v484/v49/access',requireUser,asyncRoute(async(req,res)=>{
    noCache(res);try{res.json(await farmGrantV49(await requireEliteAdmin(),req.user.id));}catch(e){errorResponse(res,e);}
  }));
  app.get('/api/offline-farm/v484/v49/admin/audit',requireUser,asyncRoute(async(req,res)=>{
    const sb=await adm(req,res);if(!sb)return;
    const [sessions,profiles,access]=await Promise.all([
      sb.from('stellar_offline_farm_v484').select('id,user_id,map_id,npc_key,status,minutes,started_at,ends_at,completed_at,report,snapshot').order('created_at',{ascending:false}).limit(120),
      sb.from('profiles').select('id,callsign').order('callsign',{ascending:true}).limit(300),
      sb.from('stellar_offline_farm_access_v488').select('user_id,enabled,max_minutes,expires_at,updated_at').limit(300)
    ]);
    if(sessions.error||profiles.error||access.error)return errorResponse(res,sessions.error||profiles.error||access.error);
    const named=new Map(profiles.data.map(p=>[p.id,p.callsign]));
    const mapped=(sessions.data||[]).map(f=>({...summarizedFarmHistoryV49([f])[0],userId:f.user_id,callsign:named.get(f.user_id)||'Piloto'}));
    const settled=mapped.filter(f=>f.status==='settled');
    const summary={sessions:mapped.length,active:mapped.filter(x=>x.status==='running').length,settled:settled.length,conflicts:mapped.filter(x=>x.status==='conflict').length,creditsNet:settled.reduce((t,x)=>t+x.creditsNet,0),stl:settled.reduce((t,x)=>t+x.stl,0),salesCredits:settled.reduce((t,x)=>t+x.saleCredits,0)};
    noCache(res);return res.json({summary,sessions:mapped,players:profiles.data.map(p=>({id:p.id,callsign:p.callsign,offline:(access.data||[]).find(g=>g.user_id===p.id)||{enabled:false,max_minutes:null}}))});
  }));
  app.put('/api/offline-farm/v484/v49/admin/access',requireUser,asyncRoute(async(req,res)=>{
    const sb=await adm(req,res);if(!sb)return;
    const userId=String(req.body?.userId||'');const enabled=req.body?.enabled;const minutes=req.body?.maxMinutes;
    if(!/^[a-f0-9-]{36}$/i.test(userId)||typeof enabled!=='boolean'||(minutes!==null&&minutes!==undefined&&(!Number.isInteger(minutes)||minutes<30||minutes>720||minutes%30)))return res.status(400).json({error:'Permissão ou limite inválido'});
    const {data:existing,error:lookupError}=await sb.from('profiles').select('id').eq('id',userId).maybeSingle();
    if(lookupError||!existing)return res.status(404).json({error:'Piloto não encontrado'});
    const {data,error}=await sb.from('stellar_offline_farm_access_v488').upsert({user_id:userId,enabled,max_minutes:minutes??null,granted_by:req.user.id,updated_at:new Date().toISOString()},{onConflict:'user_id'}).select('user_id,enabled,max_minutes').single();
    if(error)return errorResponse(res,error);
    noCache(res);res.json({ok:true,grant:data});
  }));
  app.post('/api/offline-farm/v484/settle',requireUser,asyncRoute(async(req,res)=>rpc(req,res,'claim')));
  app.post('/api/offline-farm/v484/cancel',requireUser,asyncRoute(async(req,res)=>rpc(req,res,'cancel')));

}

export function makeOfflineFarmGuardV484(requireEliteAdmin){
  return async(req,res,next)=>{try{await offlineFarmEnsureInactiveV484(req.user.id,requireEliteAdmin);next();}
  catch(e){res.status(409).json({code:'FARM_OFFLINE_ACTIVE',error:String(e.message||'Farm offline ativo').slice(0,220)});}};
}


// Preview conservador: sem escrita e sem remuneração antecipada. Pagamento é EXCLUSIVAMENTE o SQL claim.
export function previewOfflineFarmV485(f, save, prices=[], orePool=[], clock=Date.now()){
 const begin=new Date(f.started_at).getTime(),end=new Date(f.ends_at).getTime();
 const secs=Math.max(0,Math.floor((Math.min(clock,end)-begin)/1000));
 const npc=f.snapshot?.npc||{}, shop=f.snapshot?.shop||{};
 const hp=Math.max(0,Number(npc.hp)||0)+Math.max(0,Number(npc.shield)||0),lv=Math.max(1,Number(f.snapshot?.level)||1);
 const damage=Math.max(1,Number(f.snapshot?.damage_per_shot)||(175+lv*80));
 const killSeconds=f.snapshot?.damage_per_shot?Math.max(25,Math.min(480,Math.ceil(hp/damage*7))):Math.max(35,Math.min(480,Math.ceil(hp/(150+lv*60))*7));
 let shots=f.snapshot?.damage_per_shot?Math.max(1,Math.min(150,Math.ceil(hp/damage))):Math.max(8,Math.min(150,Math.ceil(hp/(175+lv*80))));
 const cycle=f.snapshot?.combat_model==='v487'?npcCombatCycleV487(f.snapshot):null;
 const perKill=cycle?cycle.killSeconds:killSeconds;
 if(cycle)shots=cycle.ammoPerKill;
 const baseTrip=Math.max(45,Math.min(600,Number(f.snapshot?.trip_seconds)||125));
 const trip=cycle?Math.max(45,Math.min(600,Math.ceil(baseTrip*350/Math.max(100,Number(f.snapshot?.ship_speed)||350)))):baseTrip;
 const limit=Math.max(20,Math.min(2000,Number(f.snapshot?.max_kills)||550));
 let cr=Math.max(0,Number(save.profile?.credits)||0),ammo=Math.max(0,Number(save.ammo?.[f.ammo_key])||0),used=0,kills=0,bought=0,buyCost=0,sold=0,saleCredits=0,baseSaleCredits=0,mined=0,credits=0,stl=0,xp=0,reason='duration';
 const cargo={...save.cargo},initialCargo={...save.cargo},earnedResources={},sellPrices=Object.fromEntries(prices.map(r=>[String(r.resource_key),Math.max(0,Number(r.sell_price)||0)]));
 const saleLimit=f.snapshot?.economic_model==='v49'?Math.max(0,Number(f.snapshot?.max_sale_credits)||0):Infinity;
 const capacity=cycle?Math.max(100,Math.min(15000,Number(f.snapshot?.cargo_capacity)||1500)):1500;
 let cargoUsed=Object.values(cargo).reduce((a,x)=>a+Math.max(0,Number(x)||0),0);
 const mineResource=orePool.find(x=>x.resource_key!=='Xenomit')?.resource_key;
 for(;kills<limit && used+perKill<=secs;){
  while(ammo<shots){const pack=Number(shop.qty)||0,price=Number(shop.price)||0;
   if(!f.auto_buy||shop.currency!=='credits'||pack<=0||price<=0||cr+credits+saleCredits-buyCost<price||bought>=100){reason='ammo_exhausted';break;}
   if(used+trip>secs){reason='waiting_to_restock';break;}
   used+=trip;ammo+=pack;bought++;buyCost+=price;
  }
  if(ammo<shots||used+perKill>secs)break;
  used+=perKill;ammo-=shots;kills++;credits+=Math.max(0,Number(npc.credits)||0);stl+=Math.max(0,Number(npc.stl)||0);xp+=Math.max(0,Number(npc.xp)||0);
  for(const [key,raw] of Object.entries(npc.resources||{})){
   const n=Math.max(0,Math.min(1000,Number(raw)||0,capacity-cargoUsed));if(n>0){cargo[key]=(Number(cargo[key])||0)+n;earnedResources[key]=(earnedResources[key]||0)+n;cargoUsed+=n;}
  }
  if(f.mine&&mineResource&&kills%5===0&&cargoUsed<capacity){const n=Math.min(10,capacity-cargoUsed);cargo[mineResource]=(Number(cargo[mineResource])||0)+n;earnedResources[mineResource]=(earnedResources[mineResource]||0)+n;cargoUsed+=n;mined+=n;}
  if(cargoUsed>=capacity){if(!f.auto_sell){reason='cargo_full';break;}if(used+trip>secs){reason='cargo_waiting_sale';break;}used+=trip;sold++;
   for(const [key,raw] of Object.entries(cargo)){if(key==='Xenomit'||!sellPrices[key])continue;const n=Math.max(0,Number(raw)||0);
    if(saleCredits+n*sellPrices[key]>saleLimit){reason='sale_limit_reached';break;}
    const original=Math.min(n,Math.max(0,Number(initialCargo[key])||0));initialCargo[key]=Math.max(0,(Number(initialCargo[key])||0)-original);baseSaleCredits+=original*sellPrices[key];
    saleCredits+=n*sellPrices[key];cargo[key]=0;}
   cargoUsed=Object.values(cargo).reduce((a,x)=>a+Math.max(0,Number(x)||0),0);
   if(reason==='sale_limit_reached')break;
  }
 }
 return {status:'running',estimated:true,elapsedSeconds:secs,durationSeconds:Math.max(1,Math.floor((end-begin)/1000)),damagePerSecond:cycle?Math.round(Number(f.snapshot?.damage_per_volley||0)*Number(f.snapshot?.hit_chance||.75)/.42):Number(f.snapshot?.damage_per_second)||null,report:{kills,boxes_collected:kills,xp,npc_credits:credits,stl,ammo_bought:bought,ammo_spent:buyCost,sales:sold,sale_credits:saleCredits,starting_cargo_sale_credits:baseSaleCredits,farm_generated_sale_credits:saleCredits-baseSaleCredits,audit_sale_cap:Number.isFinite(saleLimit)?saleLimit:null,mined_units:mined,ammo_remaining:ammo,credits_net:credits+saleCredits-buyCost,cargo_collected:earnedResources,reason,npc_name:f.snapshot?.npc?.name||f.npc_key,laser_count:cycle?Number(f.snapshot.laser_count):null,ammo_per_kill:cycle?cycle.ammoPerKill:null,travel_per_kill:cycle?Number(f.snapshot.move_between_seconds):null}};
}
