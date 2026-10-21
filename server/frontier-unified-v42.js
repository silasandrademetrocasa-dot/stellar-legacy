// V39–V42 — Complementos autenticados e econômicos via PostgreSQL.
// Nenhuma recompensa/tempo/preço é calculado com valores enviados pelo navegador.
const CODES=/^[a-z0-9_]{2,48}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const asError=(res,error)=>{
 const message=String(error?.message||'Operação não permitida.').slice(0,250);
 const denied=/(ADMIN_ONLY|SESSION_REQUIRED|PERMISSION|42501)/i.test(message);
 return res.status(denied?403:409).json({error:message});
};
export function attachFrontierUnifiedV42(app,{requireUser,asyncRoute}){
 app.get('/api/frontier/v42',requireUser,asyncRoute(async(req,res)=>{
  const {data,error}=await req.sb.rpc('stellar_u42_dashboard');
  if(error)return res.status(503).json({error:'A expansão V39–V42 requer SQL cumulativo.',detail:String(error.message||'').slice(0,130)});
  res.set('Cache-Control','no-store');return res.json(data);
 }));
 app.post('/api/frontier/v42/action',requireUser,asyncRoute(async(req,res)=>{
  const {action,code,idempotencyKey}=req.body||{};
  const amount=req.body?.amount;
  if(!['forge','expedition_start','expedition_claim','donate'].includes(action)||typeof code!=='string'||!CODES.test(code)||
     !Number.isInteger(amount)||amount<1||amount>100||!UUID.test(String(idempotencyKey||'')))
    return res.status(400).json({error:'Comando inválido.'});
  const {data,error}=await req.sb.rpc('stellar_u42_action',{
   p_action:action,p_code:code,p_quantity:amount,p_request_id:idempotencyKey
  });
  if(error)return asError(res,error);
  res.set('Cache-Control','no-store');return res.json(data);
 }));
 app.post('/api/frontier/v42/squad',requireUser,asyncRoute(async(req,res)=>{
  const action=String(req.body?.action||''),inviteCode=String(req.body?.inviteCode||'').toLowerCase();
  if(!['create','join','leave'].includes(action)||inviteCode.length>8)return res.status(400).json({error:'Esquadrão inválido.'});
  const {data,error}=await req.sb.rpc('stellar_u42_squad',{p_action:action,p_invite_code:inviteCode||null});
  if(error)return asError(res,error);
  res.set('Cache-Control','no-store');return res.json(data);
 }));
 app.post('/api/admin/frontier/v42/catalog',requireUser,asyncRoute(async(req,res)=>{
  const {code,cost}=req.body||{};
  if(typeof code!=='string'||!CODES.test(code)||!cost||typeof cost!=='object'||Array.isArray(cost)||
   JSON.stringify(cost).length>1500)return res.status(400).json({error:'Regra inválida.'});
  const {data,error}=await req.sb.rpc('stellar_u42_admin_price',{p_code:code,p_cost:cost});
  if(error)return asError(res,error);
  res.set('Cache-Control','no-store');return res.json(data);
 }));
}
