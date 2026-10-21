import {Router} from 'express';
import {UUID_V360,safeDominionRules,domLeaderboard,domRuleSummary,domWeeklyScore} from './galactic-dominion-v360.js';
const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
const failure=(res,err,status=409)=>res.status(status).json({ok:false,error:String(err?.message||err||'Operação indisponível').slice(0,175)});
export function createDominionRouter({serviceClient}){
 const r=Router();
 const sb=()=>{if(!serviceClient)throw Object.assign(new Error('Serviço de guerra indisponível no servidor.'),{status:503});return serviceClient;};
 const sqlMissing=e=>/PGRST202|PGRST205|42P01|42883|schema cache|does not exist/i.test(String(e?.message||''));
 r.get('/state',wrap(async(req,res)=>{
  const db=sb();const now=new Date();const week=new Date(now.getTime()-7*86400000).toISOString();
  const [settings,membership,relays,allClans,actions,wars]=await Promise.all([
   db.from('stellar_dominion_rules_v360').select('*').eq('id',1).maybeSingle(),
   db.from('clan_members').select('clan_id').eq('user_id',req.user.id).maybeSingle(),
   db.from('stellar_relay_state_v346').select('map_id,node_id,owner_clan_id,hp,shield,max_hp,max_shield').limit(9),
   db.from('clans').select('id,tag,name').limit(200),
   db.from('stellar_war_actions').select('clan_id,kind,occurred_at').gte('occurred_at',week).order('occurred_at',{ascending:false}).limit(1200),
   db.from('stellar_dominion_wars_v360').select('id,attacker,defender,starts_at,ends_at').order('starts_at',{ascending:false}).limit(40)
  ]);
  const err=[settings,membership,relays,allClans,actions,wars].find(x=>x.error)?.error;
  if(err)return failure(res,sqlMissing(err)?'Aguarde a migração SQL V36.0.0.':err,503);
  const rules=settings.data;if(!rules)return failure(res,'Regras V36 ainda não inicializadas.',503);
  const clanId=membership.data?.clan_id||null;
  const cl=clanId?await db.from('clans').select('id,tag,level,owner_id,vault_credits').eq('id',clanId).maybeSingle():{data:null};
  if(cl.error)return failure(res,cl.error,503);
  const claims=clanId?await db.from('stellar_dominion_claims_v360').select('claim_kind,period_start,credits').eq('clan_id',clanId).order('earned_at',{ascending:false}).limit(12):{data:[]};
  if(claims.error)return failure(res,claims.error,503);
  const warPrizeClaims=clanId?await db.from('stellar_dominion_war_claims_v360').select('war_id').eq('clan_id',clanId).limit(50):{data:[]};
  if(warPrizeClaims.error)return failure(res,warPrizeClaims.error,503);
  const warPrizes=new Set((warPrizeClaims.data||[]).map(c=>c.war_id));
  const clanTags=new Map((allClans.data||[]).map(c=>[c.id,{tag:c.tag,name:c.name}]));
  const recentWars=(wars.data||[]).filter(w=>clanId&&(w.attacker===clanId||w.defender===clanId)).slice(0,12).map(w=>({
   id:w.id,attacker:clanTags.get(w.attacker)?.tag||'CLÃ',defender:clanTags.get(w.defender)?.tag||'CLÃ',
   starts_at:w.starts_at,ends_at:w.ends_at,active:Date.parse(w.starts_at)<=Date.now()&&Date.parse(w.ends_at)>Date.now(),scheduled:Date.parse(w.starts_at)>Date.now(),prizeClaimed:warPrizes.has(w.id)
  }));
  const activeWar=(wars.data||[]).some(w=>w.attacker===clanId&&Date.parse(w.ends_at)>Date.now());
  const weekly=domWeeklyScore(actions.data,clanId,now);
  const stats={owned:clanId?(relays.data||[]).filter(x=>x.owner_clan_id===clanId&&x.hp>0).length:0,
   captures:weekly.captures,defenses:weekly.defenses};
  res.set('Cache-Control','no-store');res.json({ok:true,rules:domRuleSummary(rules),adminRules:rules,
   clan:cl.data?{id:cl.data.id,tag:cl.data.tag,level:cl.data.level,isOwner:cl.data.owner_id===req.user.id,vault_credits:cl.data.vault_credits}:null,
   clans:(allClans.data||[]).filter(c=>c.id!==clanId).map(({id,tag,name})=>({id,tag,name})),
   ranking:domLeaderboard(relays.data,actions.data,allClans.data),wars:recentWars,activeWar,
   stats,claims:claims.data||[],serverTime:Date.now()});
 }));
 r.post('/declare',wrap(async(req,res)=>{
  const id=String(req.body?.targetClanId||'');if(!UUID_V360.test(id))return failure(res,'Clã rival inválido.',400);
  let scheduled=null;
  if(req.body?.startsAt){scheduled=new Date(req.body.startsAt);
   if(!Number.isFinite(scheduled.getTime())||scheduled.getTime()<Date.now()+115000||scheduled.getTime()>Date.now()+7*86400000)
    return failure(res,'Agendamento deve ocorrer entre 2 minutos e 7 dias.',400);
  }
  const {data,error}=await req.sb.rpc('stellar_dominion_declare_v360',{p_defender:id,p_starts_at:scheduled?.toISOString()||null});
  if(error)return failure(res,error);res.set('Cache-Control','no-store');res.json(data);
 }));
 r.post('/war/prize',wrap(async(req,res)=>{
  const id=String(req.body?.warId||'');if(!UUID_V360.test(id))return failure(res,'Guerra inválida.',400);
  const {data,error}=await req.sb.rpc('stellar_dominion_war_prize_v360',{p_war_id:id});
  if(error)return failure(res,error);res.set('Cache-Control','no-store');res.json(data);
 }));
 r.post('/claim',wrap(async(req,res)=>{ 
  const kind=req.body?.kind;if(!['daily','weekly'].includes(kind))return failure(res,'Recompensa inválida.',400);
  const {data,error}=await req.sb.rpc('stellar_dominion_claim_v360',{p_kind:kind});
  if(error)return failure(res,error);res.set('Cache-Control','no-store');res.json(data);
 }));
 r.post('/admin/rules',wrap(async(req,res)=>{
  const {data:allowed,error:checkError}=await req.sb.rpc('is_game_admin_v1763',{p_uid:req.user.id});
  if(checkError||allowed!==true)return failure(res,'Somente ADM.',403);
  let payload;try{payload=safeDominionRules(req.body);}catch(e){return failure(res,e,400);}
  const {data,error}=await sb().from('stellar_dominion_rules_v360').update({...payload,updated_at:new Date().toISOString()}).eq('id',1).select('*').single();
  if(error)return failure(res,error,503);
  res.set('Cache-Control','no-store');res.json({ok:true,rules:domRuleSummary(data)});
 }));
 return r;
}
