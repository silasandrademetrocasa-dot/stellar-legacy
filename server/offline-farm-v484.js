/* STELLAR_OFFLINE_FARM_V484 — servidor: sessão persistida e liquidação SQL atômica.
 * Não roda timers em segundo plano, não faz ping artificial para manter o Render acordado.
 */
const activityCacheV484=new Map();
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
      const {data,error}=await sb.rpc('stellar_offline_farm_'+method+'_v484',{p_user:req.user.id,...args});
      if(error)throw error;
      if(method==='start'&&data?.status==='running')activityCacheV484.set(String(req.user.id),{at:Date.now(),active:true});
      if(method==='cancel'||method==='claim')activityCacheV484.delete(String(req.user.id));
      return res.json(data||{ok:false});
    }catch(e){return errorResponse(res,e);}
  }
  app.get('/api/offline-farm/v484/status',requireUser,asyncRoute(async(req,res)=>rpc(req,res,'status')));
  app.get('/api/offline-farm/v484/options',requireUser,asyncRoute(async(req,res)=>{
    noCache(res);
    try{
      const sb=await requireEliteAdmin();
      const save=await sb.from('game_saves').select('state').eq('user_id',req.user.id).maybeSingle();
      if(save.error)throw save.error;
      const map=String(save.data?.state?.mapId||'');
      if(!/^x[1-8]$/.test(map))return res.json({map,choices:[]});
      const [spawn,npcs]=await Promise.all([sb.from('game_map_npc_spawns_v1811').select('npc_key').eq('map_id',map).eq('enabled',true),sb.from('game_npc_config_v1811').select('npc_key,name,hp,credits,stl,xp').eq('enabled',true)]);
      if(spawn.error||npcs.error)throw spawn.error||npcs.error;
      const found=new Set((spawn.data||[]).map(r=>r.npc_key));
      const choices=(npcs.data||[]).filter(r=>found.has(r.npc_key)&&!/^(boss|rift|elite)/i.test(r.npc_key)).map(r=>({id:r.npc_key,name:r.name,credits:r.credits,stl:r.stl})).sort((a,b)=>Number(a.credits)-Number(b.credits));
      return res.json({map,choices});
    }catch(e){return errorResponse(res,e);}
  }));
  app.post('/api/offline-farm/v484/start',requireUser,asyncRoute(async(req,res)=>{ 
    const b=req.body||{};
    if(![60,120,240].includes(b.minutes) || ['autoSell','autoBuy','mine'].some(k=>b[k]!==undefined&&typeof b[k]!=='boolean'))
      return res.status(400).json({error:'Duração ou preferências inválidas.'});
    return rpc(req,res,'start',{p_minutes:b.minutes,p_auto_sell:b.autoSell!==false,p_auto_buy:b.autoBuy!==false,p_mine:b.mine!==false,p_npc_key:typeof b.npc==='string'&&b.npc.length<=60?b.npc:null});
  }));
  app.post('/api/offline-farm/v484/settle',requireUser,asyncRoute(async(req,res)=>rpc(req,res,'claim')));
  app.post('/api/offline-farm/v484/cancel',requireUser,asyncRoute(async(req,res)=>rpc(req,res,'cancel')));

}

export function makeOfflineFarmGuardV484(requireEliteAdmin){
  return async(req,res,next)=>{try{await offlineFarmEnsureInactiveV484(req.user.id,requireEliteAdmin);next();}
  catch(e){res.status(409).json({code:'FARM_OFFLINE_ACTIVE',error:String(e.message||'Farm offline ativo').slice(0,220)});}};
}
