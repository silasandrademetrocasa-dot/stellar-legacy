// Protected admin-only convenience actions. Inventory changes remain transactional SQL RPCs.
export const ASTRAL_TEST_ITEMS_V440=Object.freeze(['astral_guard','nexus_drive','eclipse_lance','trinity_matrix']);
export function validAdminTestGrantV440(body){
 return !!body&&ASTRAL_TEST_ITEMS_V440.includes(body.code)&&Number.isSafeInteger(body.quantity)&&body.quantity>=1&&body.quantity<=5;
}
export function attachFrontierAdminV440(app,{requireUser,asyncRoute}){
 app.post('/api/admin/frontier/test-kit',requireUser,asyncRoute(async(req,res)=>{
  if(!validAdminTestGrantV440(req.body))return res.status(400).json({ok:false,error:'Escolha um equipamento Astral válido.'});
  const {data,error}=await req.sb.rpc('stellar_u440_admin_test_kit',{p_code:req.body.code,p_quantity:req.body.quantity});
  if(error){const denied=String(error.message||'').match(/ADMIN_ONLY|permission|42501/i);
   return res.status(denied?403:409).json({ok:false,error:'Não foi possível atualizar seu inventário de testes.'});}
  res.set('Cache-Control','no-store');return res.json(data);
 }));
}
