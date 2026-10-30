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
  const started=Date.now();
  res.set('Cache-Control','no-store');
  const {data,error}=await req.sb.rpc('stellar_u42_dashboard');
  if(error){
   const detail=String(error.message||'').slice(0,160);
   const missing=/PGRST202|42883|does not exist|schema cache/i.test(String(error.code||'')+' '+detail);
   const timed=/57014|timeout|canceling statement/i.test(String(error.code||'')+' '+detail);
   const code=missing?'UNIVERSE_SQL_MISSING':timed?'UNIVERSE_DB_TIMEOUT':'UNIVERSE_DB_ERROR';
   // Diagnostico sem token, callsign, ID do jogador ou dados economicos.
   console.warn('[universe-v42] dashboard read failed',{code,dbCode:String(error.code||'').slice(0,18),durationMs:Date.now()-started});
   if(!missing)res.set('Retry-After','1');
   return res.status(missing?503:timed?504:503).json({code,error:missing?'A expansão do Universo não foi instalada no banco.':timed?'Tempo limite ao carregar o Universo Estelar.':'Não foi possível carregar o Universo Estelar.'});
  }
  if(!data||typeof data!=='object'||Array.isArray(data)||!Array.isArray(data.catalog)){
   console.warn('[universe-v42] dashboard invalid response',{durationMs:Date.now()-started});
   return res.status(503).json({code:'UNIVERSE_INVALID_RESPONSE',error:'O servidor recebeu um painel incompleto.'});
  }
  return res.json(data);
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
