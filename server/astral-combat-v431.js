// Perfil verificado é consultado com credenciais do servidor, jamais via WS.
export function safeAstralProfileV431(row){
 const n=Number(row?.npcDamagePercent);
 return {npcDamagePercent:row?.enabled===true&&Number.isFinite(n)?Math.max(0,Math.min(4,n)):0,activeConfig:[1,2].includes(Number(row?.activeConfig))?Number(row.activeConfig):1};
}
// Conservador: teto de anomalia, não um simulador definitivo de dano.
// Margem para críticos, designs, habilidades, AUX e multiplicadores já existentes.
export function astralNpcHitCapV431(baseLaserDamage,bonusPct=0){
 const base=Number(baseLaserDamage);
 if(!Number.isFinite(base)||base<=0)return null;
 const bonus=Math.max(0,Math.min(4,Number(bonusPct)||0));
 return Math.min(2_000_000,Math.max(175_000,Math.ceil(base*(1+bonus/100)*14+60_000)));
}
export function attachAstralCombatV431(app,{requireUser,asyncRoute}){
 app.post('/api/admin/frontier/astral-power',requireUser,asyncRoute(async(req,res)=>{
  if(typeof req.body?.enabled!=='boolean')return res.status(400).json({error:'Configuração inválida.'});
  const {data,error}=await req.sb.rpc('stellar_u431_admin_weapon',{p_enabled:req.body.enabled});
  if(error)return res.status(/ADMIN_ONLY|42501|permission/i.test(String(error.message))?403:409).json({error:'Não foi possível atualizar a configuração.'});
  res.set('Cache-Control','no-store');res.json(data);
 }));
}
