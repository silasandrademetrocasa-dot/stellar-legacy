// Operational health dashboard. The database RPC itself enforces admin permission.
export function attachFrontierAuditV450(app,{requireUser,asyncRoute}){
 app.get('/api/admin/frontier/diagnostics',requireUser,asyncRoute(async(req,res)=>{
  const {data,error}=await req.sb.rpc('stellar_u450_admin_diagnostics');
  if(error){const msg=String(error.message||'Diagnóstico indisponível.');
   return res.status(/ADMIN_ONLY|acesso|administrat|negado|permission/i.test(msg)?403:503).json({ok:false,error:'Diagnóstico indisponível para esta sessão.'});}
  res.set('Cache-Control','no-store');return res.json({ok:true,report:data});
 }));
}
