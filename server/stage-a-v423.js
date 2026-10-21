// V42.3 bridge; client never supplies inventory, kills, prices or reward amounts.
const failure=(res,error)=>res.status(/42501|ADMIN_ONLY|SESSION_REQUIRED/i.test(String(error?.message))?403:409).json({error:String(error?.message||'Indisponível').slice(0,180)});
const rpc=async(req,res,name,args)=>{const {data,error}=await req.sb.rpc(name,args);if(error)return failure(res,error);res.set('Cache-Control','no-store');return res.json(data);};
export function attachStageAV423(app,{requireUser,asyncRoute}){
 const route=fn=>[requireUser,asyncRoute(fn)];
 app.get('/api/frontier/v423/loadouts',...route((req,res)=>rpc(req,res,'stellar_u423_loadout_snapshot')));
 app.post('/api/frontier/v423/loadouts',...route((req,res)=>{
  const {config,slot,item}=req.body||{};
  if(![1,2].includes(config)||!['defense','engine','weapon','utility'].includes(slot)||
   !(item===null||(typeof item==='string'&&/^[a-z0-9_]{2,48}$/.test(item))))return res.status(400).json({error:'Equipamento inválido'});
  return rpc(req,res,'stellar_u423_equip',{p_config:config,p_slot:slot,p_item:item});
 }));
 app.get('/api/frontier/v423/operations',...route((req,res)=>rpc(req,res,'stellar_u423_operation_progress')));
 app.post('/api/frontier/v423/operations/claim',...route((req,res)=>{
  if(![1,2,3].includes(req.body?.tier))return res.status(400).json({error:'Nível inválido'});
  return rpc(req,res,'stellar_u423_operation_claim',{p_tier:req.body.tier});
 }));
 app.post('/api/admin/frontier/v423/operations',...route((req,res)=>{
  const {tier,goal,minimum,reward,enabled}=req.body||{};
  if(![1,2,3].includes(tier)||!Number.isInteger(goal)||goal<10||goal>10000||!Number.isInteger(minimum)||minimum<1||minimum>goal||minimum>2000||
    !Number.isInteger(reward)||reward<1||reward>5000||typeof enabled!=='boolean')return res.status(400).json({error:'Configuração inválida'});
  return rpc(req,res,'stellar_u423_operation_admin',{p_tier:tier,p_goal:goal,p_min:minimum,p_reward:reward,p_enabled:enabled});
 }));
}
