export const ASTRAL_CODES_V435=Object.freeze(['astral_guard','eclipse_lance','nexus_drive','trinity_matrix']);
export const validModuleConfigV435=(body)=>!!body&&typeof body.enabled==='boolean'&&ASTRAL_CODES_V435.includes(body.code);
export function attachAstralIntegrationsV435(app,{requireUser,asyncRoute}){
  app.post('/api/admin/frontier/astral-module',requireUser,asyncRoute(async(req,res)=>{
    if(!validModuleConfigV435(req.body))return res.status(400).json({ok:false,error:'Configuração inválida.'});
    const {data,error}=await req.sb.rpc('stellar_u435_admin_module',{p_code:req.body.code,p_enabled:req.body.enabled});
    if(error)return res.status(/ADMIN_ONLY|42501|permission/i.test(String(error.message))?403:409).json({ok:false,error:'Não foi possível salvar.'});
    res.set('Cache-Control','no-store');res.json(data);
  }));
  app.post('/api/admin/frontier/raid',requireUser,asyncRoute(async(req,res)=>{
    const {target,minimum,reward,enabled}=req.body||{};
    const int=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
    if(!int(target,1,50)||!int(minimum,1,10)||!int(reward,1,5000)||typeof enabled!=='boolean')return res.status(400).json({ok:false,error:'Parâmetros inválidos.'});
    const {data,error}=await req.sb.rpc('stellar_u435_raid_admin',{p_target:target,p_minimum:minimum,p_reward:reward,p_enabled:enabled});
    if(error)return res.status(/ADMIN_ONLY|42501/i.test(error.message)?403:409).json({ok:false,error:'Não foi possível salvar.'});
    res.set('Cache-Control','no-store');res.json(data);
  }));
  app.get('/api/frontier/raid',requireUser,asyncRoute(async(req,res)=>{
    const {data,error}=await req.sb.rpc('stellar_u435_raid_snapshot');if(error)return res.status(409).json({ok:false,error:'Desafio indisponível.'});
    res.set('Cache-Control','no-store');res.json(data);
  }));
  app.post('/api/frontier/raid/claim',requireUser,asyncRoute(async(req,res)=>{
    const {data,error}=await req.sb.rpc('stellar_u435_raid_claim');if(error)return res.status(409).json({ok:false,error:'O desafio ainda não foi concluído ou já foi resgatado.'});
    res.set('Cache-Control','no-store');res.json(data);
  }));
}
