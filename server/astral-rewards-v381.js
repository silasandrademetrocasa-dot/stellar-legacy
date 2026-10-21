// Stellar Legacy V38.1.0 — API de bônus astral, resgate transacional e editor visual.
// Não aceita prêmio, moeda, dano, quantidade de ondas ou usuário do navegador.
const GATES = new Set(['alpha','beta','gamma']);
export function attachAstralRewardsV381(app,{requireUser,asyncRoute,requireEliteAdmin}) {
  app.get('/api/astral-rewards',requireUser,asyncRoute(async(req,res)=>{
    const {data,error}=await req.sb.rpc('stellar_astral_dashboard_v381');
    if(error)return res.status(503).json({error:'Astral Rewards indisponível: execute o SQL V38.1.0.',detail:String(error.message||'').slice(0,120)});
    res.set('Cache-Control','no-store');res.json(data);
  }));
  app.post('/api/astral-rewards/lock',requireUser,asyncRoute(async(req,res)=>{
    const gate=String(req.body?.gate||'');
    if(!GATES.has(gate))return res.status(400).json({error:'Portal inexistente.'});
    const {data,error}=await req.sb.rpc('stellar_astral_lock_quote_v381',{p_gate:gate});
    if(error)return res.status(409).json({error:String(error.message||'Não foi possível fixar o prêmio.')});
    res.set('Cache-Control','no-store');res.json(data);
  }));
  app.post('/api/admin/astral-rewards',requireUser,asyncRoute(async(req,res)=>{
    const gate=String(req.body?.gate||''),config=req.body?.config;
    if(!GATES.has(gate)||!config||typeof config!=='object'||Array.isArray(config)||JSON.stringify(config).length>3000)
      return res.status(400).json({error:'Configuração do portal inválida.'});
    const {data,error}=await req.sb.rpc('stellar_admin_set_astral_v381',{p_gate:gate,p_config:config});
    if(error){const message=String(error.message||'Erro ao gravar recompensas.');
      return res.status(/ADMIN_ONLY|42501|permission|permiss/i.test(message)?403:400).json({error:message});}
    res.set('Cache-Control','no-store');res.json(data);
  }));
  app.post('/api/astral-rewards/claim',requireUser,asyncRoute(async(req,res)=>{
    const gate=String(req.body?.gate||'');
    if(!GATES.has(gate))return res.status(400).json({error:'Portal inexistente.'});
    // A função SQL trava o save, compara o contador de conclusões e usa UNIQUE
    // (user_id, gate, completion_number). Nunca calcula o prêmio no cliente.
    const service=await requireEliteAdmin();
    const {data,error}=await service.rpc('stellar_claim_astral_v381',{p_user_id:req.user.id,p_gate:gate});
    if(error){const message=String(error.message||'Resgate negado.');
      return res.status(/SEQUENCE|INVALID|MISSING/.test(message)?409:503).json({error:message});}
    res.set('Cache-Control','no-store');res.json(data);
  }));
}
