// Rotas da evolução do Centro de Comando.
// Conteúdo de temporada e alertas = leitura autenticada. Pontuação sempre do servidor.
import {Router} from 'express';
import {seasonStatus,safeSeasonDraft,safeDirective,buildSeasonRanking} from './competitive-seasons.js';
import {clanOperationProgress,safeClanOperationDraft} from './clan-operations.js';
const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
const missingRelation=e=>!!e && (/^(?:42P01|PGRST205)$/.test(String(e.code||''))||/could not find the table|does not exist/i.test(String(e.message||'')));
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function createCommandCenterRouter({serviceClient,requireService}){
 const r=Router();
 const sb=async()=>{if(!serviceClient)throw Object.assign(new Error('SUPABASE_SERVICE_ROLE_KEY ausente no Render.'),{status:503});return serviceClient;};
 async function admin(req,res){const check=await req.sb.rpc('is_game_admin_v1763',{p_uid:req.user.id});if(check.error||check.data!==true){res.status(403).json({error:'Somente ADM.'});return false;}return true;}
 r.get('/overview',wrap(async(req,res)=>{
  const client=await sb();
  const [seasonsResult,directivesResult,ownTitleResult,claimsResult,historyResult]=await Promise.all([
   client.from('stellar_competitive_seasons').select('*').eq('enabled',true).order('starts_at',{ascending:false}).limit(12),
   client.from('stellar_world_directives').select('id,title,description,map_id,category,starts_at,ends_at').eq('enabled',true).lte('starts_at',new Date().toISOString()).gt('ends_at',new Date().toISOString()).order('starts_at',{ascending:false}).limit(25),
   client.from('stellar_elite_selected_titles').select('objective_id,title').eq('user_id',req.user.id).maybeSingle(),
   client.from('stellar_competitive_claims').select('season_id').eq('user_id',req.user.id),
   client.from('stellar_competitive_history').select('id,title,starts_at,ends_at,pilots,rewards_claimed,winning_faction').order('ends_at',{ascending:false}).limit(15)
  ]);
  const error=[seasonsResult,directivesResult,ownTitleResult,claimsResult].find(x=>x.error)?.error || (historyResult.error && !missingRelation(historyResult.error)?historyResult.error:null);
  if(error)return res.status(503).json({error:`Centro de Comando indisponível: ${error.message}`});
  const allSeasons=seasonsResult.data||[],open=allSeasons.find(s=>seasonStatus(s)==='ativa')||allSeasons.find(s=>seasonStatus(s)==='agendada')||allSeasons[0]||null;
  const allIds=allSeasons.map(s=>s.id);
  let ranking={pilots:[],factions:[],clans:[],myRank:null,myPoints:0};
  const rankBySeason=new Map();
  if(allIds.length){
   const [pilots,clans]=await Promise.all([
    client.from('stellar_season_scores').select('season_id,user_id,faction,points,captures,defenses').in('season_id',allIds).limit(5000),
    client.from('stellar_season_clan_scores').select('season_id,clan_id,faction,points,pilots,captures,defenses').in('season_id',allIds).limit(2000)
   ]);
   if(pilots.error||clans.error)return res.status(503).json({error:pilots.error?.message||clans.error?.message});
   for(const season of allSeasons){rankBySeason.set(season.id,buildSeasonRanking((pilots.data||[]).filter(p=>p.season_id===season.id),(clans.data||[]).filter(p=>p.season_id===season.id),req.user.id));}
   ranking=rankBySeason.get(open?.id)||ranking;
   ranking.pilots=ranking.pilots.map(p=>({rank:p.rank,alias:p.user_id===req.user.id?'VOCÊ':`PILOTO #${p.rank}`,isMe:p.user_id===req.user.id,faction:p.faction,points:p.points,captures:p.captures,defenses:p.defenses}));
  }
  const claims=new Set((claimsResult.data||[]).map(c=>c.season_id));
  const recent=allSeasons.map(s=>{const mine=rankBySeason.get(s.id)||{},claimable=!claims.has(s.id)&&seasonStatus(s)==='encerrada'&&mine.myRank!=null&&mine.myRank<=s.top_n&&mine.myPoints>=s.min_points;
   return {id:s.id,title:s.title,starts_at:s.starts_at,ends_at:s.ends_at,state:seasonStatus(s),min_points:s.min_points,top_n:s.top_n,reward_credits:s.reward_credits,reward_stl:s.reward_stl,claimed:claims.has(s.id),claimable};
  });
  res.set('Cache-Control','no-store');res.json({ok:true,seasons:recent,selectedSeasonId:open?.id||null,ranking,alerts:directivesResult.data||[],history:historyResult.data||[],equippedTitle:ownTitleResult.data||null});
 }));
 r.post('/season/:id/claim',wrap(async(req,res)=>{
  if(!uuid.test(req.params.id))return res.status(400).json({error:'Temporada inválida.'});
  const {data,error}=await req.sb.rpc('stellar_claim_competitive_season',{p_season_id:req.params.id});
  if(error)return res.status(409).json({error:error.message});res.json(data);
 }));
 r.post('/elite/equip-title',wrap(async(req,res)=>{
  const id=String(req.body?.objective_id||'');if(!/^[a-z][a-z0-9_]{2,39}$/.test(id))return res.status(400).json({error:'Título inválido.'});
  const {data,error}=await req.sb.rpc('stellar_equip_elite_title',{p_objective_id:id});
  if(error)return res.status(409).json({error:error.message});res.json(data);
 }));
 r.post('/elite/unequip-title',wrap(async(req,res)=>{
  const {data,error}=await req.sb.rpc('stellar_unequip_elite_title');
  if(error)return res.status(409).json({error:error.message});res.json(data);
 }));
 r.get('/clan/operations',wrap(async(req,res)=>{
  const client=await sb();
  const member=await client.from('clan_members').select('clan_id').eq('user_id',req.user.id).maybeSingle();
  if(member.error)return res.status(503).json({error:member.error.message});
  if(!member.data?.clan_id)return res.json({ok:true,clan:null,objectives:[]});
  const clanId=member.data.clan_id;
  const [clan,objectives,claims,captures,defenses]=await Promise.all([
    client.from('clans').select('id,name,owner_id,vault_credits').eq('id',clanId).single(),
    client.from('stellar_clan_operations').select('*').eq('enabled',true).order('sort_order'),
    client.from('stellar_clan_operation_claims').select('operation_id').eq('clan_id',clanId),
    client.from('stellar_war_actions').select('id',{head:true,count:'exact'}).eq('clan_id',clanId).eq('kind','capture'),
    client.from('stellar_war_actions').select('id',{head:true,count:'exact'}).eq('clan_id',clanId).eq('kind','defense')
  ]);
  const err=[clan,objectives,claims,captures,defenses].find(x=>x.error)?.error;
  if(err)return res.status(503).json({error:err.message});
  res.set('Cache-Control','no-store');res.json({ok:true,clan:{id:clan.data.id,name:clan.data.name,vaultCredits:clan.data.vault_credits,isOwner:clan.data.owner_id===req.user.id},objectives:clanOperationProgress(objectives.data,claims.data,{capture:captures.count||0,defense:defenses.count||0})});
 }));
 r.post('/clan/operations/:id/claim',wrap(async(req,res)=>{
  if(!/^[a-z][a-z0-9_]{2,39}$/.test(req.params.id))return res.status(400).json({error:'Operação inválida.'});
  const {data,error}=await req.sb.rpc('stellar_claim_clan_operation',{p_operation_id:req.params.id});
  if(error)return res.status(409).json({error:error.message});res.json(data);
 }));
 r.get('/admin',wrap(async(req,res)=>{
  if(!await admin(req,res))return;const client=await sb();
  const [ss,ds,co]=await Promise.all([
   client.from('stellar_competitive_seasons').select('*').order('starts_at',{ascending:false}).limit(50),
   client.from('stellar_world_directives').select('*').order('starts_at',{ascending:false}).limit(50),
   client.from('stellar_clan_operations').select('*').order('sort_order').limit(100)
  ]);
  if(ss.error||ds.error||(co.error&&!missingRelation(co.error)))return res.status(503).json({error:ss.error?.message||ds.error?.message||co.error?.message});
  res.json({seasons:ss.data||[],directives:ds.data||[],clanObjectives:co.data||[]});
 }));
 r.post('/admin/season',wrap(async(req,res)=>{
  if(!await admin(req,res))return;const client=await sb();let payload;
  try{payload=safeSeasonDraft(req.body||{});}catch(e){return res.status(400).json({error:e.message});}
  const id=String(req.body?.id||'');
  if(id){
   if(!uuid.test(id))return res.status(400).json({error:'ID inválido.'});
   const old=await client.from('stellar_competitive_seasons').select('*').eq('id',id).maybeSingle();
   if(old.error)return res.status(503).json({error:old.error.message});if(!old.data)return res.status(404).json({error:'Temporada não encontrada.'});
   if(old.data.enabled && Date.now()>=Date.parse(old.data.starts_at))return res.status(409).json({error:'Temporada iniciada: calendário e prêmios não podem mudar.'});
   payload.id=id;
  }
  if(payload.enabled){const active=await client.from('stellar_competitive_seasons').select('id,starts_at,ends_at').eq('enabled',true).lt('starts_at',payload.ends_at).gt('ends_at',payload.starts_at);
   if(active.error)return res.status(503).json({error:active.error.message});if((active.data||[]).some(x=>x.id!==id))return res.status(409).json({error:'Já existe uma temporada nesse período.'});
  }
  const result=id?await client.from('stellar_competitive_seasons').update(payload).eq('id',id).select('*').single():await client.from('stellar_competitive_seasons').insert(payload).select('*').single();
  if(result.error)return res.status(409).json({error:result.error.message});res.json({ok:true,season:result.data});
 }));
 r.post('/admin/clan-operation',wrap(async(req,res)=>{
  if(!await admin(req,res))return;const client=await sb();let payload;
  try{payload=safeClanOperationDraft(req.body||{});}catch(e){return res.status(400).json({error:e.message});}
  const {data,error}=await client.from('stellar_clan_operations').upsert(payload,{onConflict:'id'}).select('*').single();
  if(error)return res.status(409).json({error:error.message});res.json({ok:true,operation:data});
 }));
 r.post('/admin/directive',wrap(async(req,res)=>{
  if(!await admin(req,res))return;const client=await sb();let payload;
  try{payload=safeDirective(req.body||{});}catch(e){return res.status(400).json({error:e.message});}
  const id=String(req.body?.id||'');
  if(id&&!/^[0-9]{1,12}$/.test(id))return res.status(400).json({error:'Aviso inválido.'});
  const result=id?await client.from('stellar_world_directives').update(payload).eq('id',Number(id)).select('*').single():await client.from('stellar_world_directives').insert(payload).select('*').single();
  if(result.error)return res.status(409).json({error:result.error.message});res.json({ok:true,directive:result.data});
 }));
 return r;
}
