import {Router} from 'express';
const safeError=(error)=>String(error?.message||error||'Fronteira indisponível.').slice(0,170);
const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
const contractId=/^[a-z0-9_]{3,36}$/;
export function createFrontierRouter({serviceClient}){
 const r=Router();
 r.get('/state',wrap(async(req,res)=>{
  const {data,error}=await req.sb.rpc('stellar_frontier_state_v370');
  if(error)return res.status(503).json({ok:false,error:/PGRST202|does not exist|schema cache/i.test(error.message||'')?'Aguardando SQL V37.0.0.':safeError(error)});
  res.set('Cache-Control','no-store');res.json(data);
 }));
 r.post('/claim',wrap(async(req,res)=>{
  const id=req.body?.contractId;
  if(typeof id!=='string'||!contractId.test(id))return res.status(400).json({ok:false,error:'Contrato inválido.'});
  const {data,error}=await req.sb.rpc('stellar_frontier_claim_v370',{p_id:id});
  if(error)return res.status(409).json({ok:false,error:safeError(error)});
  res.set('Cache-Control','no-store');res.json(data);
 }));
 r.post('/craft',wrap(async(req,res)=>{
  const {data,error}=await req.sb.rpc('stellar_frontier_craft_v370');
  if(error)return res.status(409).json({ok:false,error:safeError(error)});
  res.set('Cache-Control','no-store');res.json(data);
 }));
 r.post('/clan-claim',wrap(async(req,res)=>{
  const {data,error}=await req.sb.rpc('stellar_frontier_clan_claim_v370');
  if(error)return res.status(409).json({ok:false,error:safeError(error)});
  res.set('Cache-Control','no-store');res.json(data);
 }));
 r.post('/admin/contract',wrap(async(req,res)=>{
  const {data:allowed,error:authError}=await req.sb.rpc('is_game_admin_v1763',{p_uid:req.user.id});
  if(authError||allowed!==true)return res.status(403).json({ok:false,error:'Somente ADM.'});
  if(!serviceClient)return res.status(503).json({ok:false,error:'Serviço SQL indisponível.'});
  const id=req.body?.id;
  if(typeof id!=='string'||!contractId.test(id))return res.status(400).json({ok:false,error:'Contrato inválido.'});
  const limits={target_count:[1,250],reward_credits:[0,3000000],reward_stl:[0,10000],reward_shards:[1,20],min_level:[1,70]};
  const changes={};
  for(const [key,[min,max]] of Object.entries(limits))if(req.body?.[key]!==undefined){
   const v=req.body[key];if(!Number.isSafeInteger(v)||v<min||v>max)return res.status(400).json({ok:false,error:`Valor inválido: ${key}`});changes[key]=v;
  }
  if(req.body?.enabled!==undefined){if(typeof req.body.enabled!=='boolean')return res.status(400).json({ok:false,error:'Estado inválido.'});changes.enabled=req.body.enabled;}
  if(!Object.keys(changes).length)return res.status(400).json({ok:false,error:'Nenhuma alteração.'});
  const {data,error}=await serviceClient.from('stellar_frontier_contracts_v370').update({...changes,updated_at:new Date().toISOString()}).eq('id',id).select('*').single();
  if(error)return res.status(503).json({ok:false,error:safeError(error)});
  res.set('Cache-Control','no-store');res.json({ok:true,contract:data});
 }));
 return r;
}
