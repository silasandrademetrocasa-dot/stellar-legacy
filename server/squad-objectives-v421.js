// Objetivo semanal V42.1: apenas abates do ledger verificado de NPCs contam.
const positive=(x,min,max)=>Number.isInteger(x)&&x>=min&&x<=max;
const reply=(res,error)=>res.status(/ADMIN_ONLY|SESSION_REQUIRED|42501/i.test(String(error?.message))?403:409).json({error:String(error?.message||'Operação indisponível.').slice(0,160)});
export function attachSquadObjectivesV421(app,{requireUser,asyncRoute}){
 app.get('/api/frontier/v421/squad-objective',requireUser,asyncRoute(async(req,res)=>{
  const {data,error}=await req.sb.rpc('stellar_u42_squad_objective_v421');
  if(error)return reply(res,error);res.set('Cache-Control','no-store');return res.json(data);
 }));
 app.post('/api/frontier/v421/squad-objective/claim',requireUser,asyncRoute(async(req,res)=>{
  const {data,error}=await req.sb.rpc('stellar_u42_squad_claim_v421');
  if(error)return reply(res,error);res.set('Cache-Control','no-store');return res.json(data);
 }));
 app.post('/api/admin/frontier/v421/squad-objective',requireUser,asyncRoute(async(req,res)=>{
  const {goal,minimumPersonal,rewardResearch}=req.body||{};
  if(!positive(goal,20,10000)||!positive(minimumPersonal,1,1000)||minimumPersonal>goal||!positive(rewardResearch,1,1000))
   return res.status(400).json({error:'Configuração de objetivo inválida.'});
  const {data,error}=await req.sb.rpc('stellar_u42_squad_config_v421',{
   p_weekly_kills:goal,p_minimum_player:minimumPersonal,p_reward:rewardResearch
  });
  if(error)return reply(res,error);res.set('Cache-Control','no-store');return res.json(data);
 }));
}
