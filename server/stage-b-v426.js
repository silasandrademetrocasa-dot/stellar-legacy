// V42.4–42.6: exploration investigations, escrow market and clan research.
// All rewards, inventory, NPC kills, prices and wallets are read/written by SQL RPCs.
const UID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODE=/^[a-z0-9_]{3,32}$/;
const ITEM=/^[a-z0-9_]{2,48}$/;
const int=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
export function validateSellInput(v={}){return typeof v.item==='string'&&ITEM.test(v.item)&&int(v.quantity,1,5)&&int(v.unitPrice,1000,100000000)&&UID.test(String(v.requestId||''));}
export function validateSectorStart(v={}){return typeof v.sector==='string'&&CODE.test(v.sector)&&UID.test(String(v.requestId||''));}
export function validateClanFund(v={}){return typeof v.structure==='string'&&CODE.test(v.structure)&&int(v.points,1,500)&&UID.test(String(v.requestId||''));}
const fail=(res,e)=>{
 const m=String(e?.message||'Operação recusada').slice(0,180);
 return res.status(/ADMIN_ONLY|LOGIN_REQUIRED|42501/i.test(m)?403:409).json({ok:false,error:m});
};
async function call(req,res,name,params){
 const {data,error}=await req.sb.rpc(name,params);
 if(error)return fail(res,error);
 res.set('Cache-Control','no-store');return res.json(data);
}
export function attachStageBV426(app,{requireUser,asyncRoute}){
 const api=(fn)=>[requireUser,asyncRoute(fn)];
 app.get('/api/frontier/v426/exploration',...api((req,res)=>call(req,res,'stellar_u426_exploration')));
 app.post('/api/frontier/v426/exploration/start',...api((req,res)=>{
  if(!validateSectorStart(req.body))return res.status(400).json({ok:false,error:'Exploração inválida'});
  return call(req,res,'stellar_u426_sector_start',{p_sector:req.body.sector,p_request:req.body.requestId});
 }));
 app.post('/api/frontier/v426/exploration/claim',...api((req,res)=>{
  if(!UID.test(String(req.body?.runId||'')))return res.status(400).json({ok:false,error:'Expedição inválida'});
  return call(req,res,'stellar_u426_sector_claim',{p_run:req.body.runId});
 }));
 app.get('/api/frontier/v426/market',...api((req,res)=>call(req,res,'stellar_u426_market_snapshot')));
 app.post('/api/frontier/v426/market/sell',...api((req,res)=>{
  if(!validateSellInput(req.body))return res.status(400).json({ok:false,error:'Oferta inválida'});
  return call(req,res,'stellar_u426_market_sell',{p_item:req.body.item,p_qty:req.body.quantity,p_unit:req.body.unitPrice,p_request:req.body.requestId});
 }));
 app.post('/api/frontier/v426/market/buy',...api((req,res)=>{
  if(!UID.test(String(req.body?.offerId||'')))return res.status(400).json({ok:false,error:'Oferta inválida'});
  return call(req,res,'stellar_u426_market_buy',{p_offer:req.body.offerId});
 }));
 app.post('/api/frontier/v426/market/cancel',...api((req,res)=>{
  if(!UID.test(String(req.body?.offerId||'')))return res.status(400).json({ok:false,error:'Oferta inválida'});
  return call(req,res,'stellar_u426_market_cancel',{p_offer:req.body.offerId});
 }));
 app.get('/api/frontier/v426/clan',...api((req,res)=>call(req,res,'stellar_u426_clan_snapshot')));
 app.post('/api/frontier/v426/clan/fund',...api((req,res)=>{
  if(!validateClanFund(req.body))return res.status(400).json({ok:false,error:'Contribuição inválida'});
  return call(req,res,'stellar_u426_clan_fund',{p_structure:req.body.structure,p_points:req.body.points,p_request:req.body.requestId});
 }));
 app.post('/api/admin/frontier/v426/sector',...api((req,res)=>{
  const {code,minutes,kills,cost,reward,enabled}=req.body||{};
  if(typeof code!=='string'||!CODE.test(code)||!int(minutes,5,1440)||!int(kills,5,10000)||!int(cost,0,10000)||!int(reward,1,5000)||typeof enabled!=='boolean')return res.status(400).json({ok:false,error:'Regra inválida'});
  return call(req,res,'stellar_u426_admin_sector',{p_code:code,p_minutes:minutes,p_kills:kills,p_cost:cost,p_reward:reward,p_enabled:enabled});
 }));
 app.post('/api/admin/frontier/v426/market',...api((req,res)=>{
  if(!int(req.body?.feeBps,0,1500)||typeof req.body?.enabled!=='boolean')return res.status(400).json({ok:false,error:'Taxa inválida'});
  return call(req,res,'stellar_u426_admin_market',{p_fee:req.body.feeBps,p_enabled:req.body.enabled});
 }));
 app.post('/api/admin/frontier/v426/clan',...api((req,res)=>{
  if(typeof req.body?.structure!=='string'||!CODE.test(req.body.structure)||!int(req.body?.goal,100,100000)||typeof req.body?.enabled!=='boolean')return res.status(400).json({ok:false,error:'Regra inválida'});
  return call(req,res,'stellar_u426_admin_clan',{p_structure:req.body.structure,p_goal:req.body.goal,p_enabled:req.body.enabled});
 }));
}
