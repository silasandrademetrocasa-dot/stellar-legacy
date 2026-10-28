/** V98: read-only competitive integrity. No rewards, scores or player saves are modified. */
const FACTIONS=new Set(['earth','mars','jupiter']);
const SAFE_COUNT=(v)=>Number.isFinite(Number(v))?Math.max(0,Math.trunc(Number(v))):0;

export function summarizeCompetitiveV98({counts={},relays=[],campaigns=[],warNodes=[],clanMembers=[]}={}){
 const alerts=[];
 const seen=new Set(),duplicates=[];
 for(const r of relays){
   const id=`${String(r.map_id||'')}:${String(r.node_id||'')}`;
   if(seen.has(id))duplicates.push(id);else seen.add(id);
 }
 if(duplicates.length)alerts.push({code:'RELAY_DUPLICATE',severity:'error',message:`Relés duplicados: ${duplicates.join(', ')}`});
 const invalidFaction=warNodes.filter(r=>r.owner&&!FACTIONS.has(String(r.owner).toLowerCase()));
 if(invalidFaction.length)alerts.push({code:'RELAY_FACTION',severity:'warning',message:`${invalidFaction.length} nó(s) com facção fora do catálogo`});
 const current=campaigns.filter(c=>c.enabled&&Number.isFinite(Date.parse(c.starts_at))&&Number.isFinite(Date.parse(c.ends_at))&&Date.parse(c.starts_at)<=Date.now()&&Date.parse(c.ends_at)>Date.now());
 if(current.length>1)alerts.push({code:'WAR_OVERLAP',severity:'warning',message:`${current.length} campanhas Warfront simultâneas`});
 const orphanMembers=clanMembers.filter(m=>!m.clan_id||!m.user_id);
 if(orphanMembers.length)alerts.push({code:'CLAN_MEMBER_INVALID',severity:'warning',message:`${orphanMembers.length} vínculo(s) de clã incompleto(s)`});
 if(relays.length===0)alerts.push({code:'RELAY_EMPTY',severity:'warning',message:'Nenhum relé retornado pela consulta de integridade'});
 if(warNodes.length===0)alerts.push({code:'WAR_NODES_EMPTY',severity:'warning',message:'Nenhum nó territorial retornado'});
 return {readOnly:true,version:'V98',summary:{
  arenaBattles:SAFE_COUNT(counts.arena_battles),pvpDamageEvents:SAFE_COUNT(counts.pvp_damage_events),
  clans:SAFE_COUNT(counts.clans),clanMembers:SAFE_COUNT(counts.clan_members),
  warActions:SAFE_COUNT(counts.stellar_war_actions),relayCount:relays.length,warNodes:warNodes.length,
  campaigns:campaigns.length,activeCampaigns:current.length},
  alerts,passed:alerts.every(a=>a.severity!=='error')};
}

export function installCompetitiveReadinessV98(app,{requireUser,asyncRoute,requireEliteAdmin}){
 app.get('/api/admin/v98/competitive-audit',requireUser,asyncRoute(async(req,res)=>{
  res.set('Cache-Control','no-store');
  const {data:allowed,error:authErr}=await req.sb.rpc('is_game_admin_v1763',{p_uid:req.user.id});
  if(authErr||allowed!==true)return res.status(403).json({error:'Somente ADM.'});
  const db=await requireEliteAdmin();
  const names=['arena_battles','pvp_damage_events','clans','clan_members','stellar_war_actions'];
  const queries=names.map(n=>db.from(n).select('*',{count:'exact',head:true}));
  queries.push(db.from('stellar_relay_state_v346').select('map_id,node_id,owner_clan_id').limit(100));
  queries.push(db.from('stellar_warfront_nodes').select('map_id,node_id,owner,revision').limit(100));
  queries.push(db.from('stellar_war_campaigns').select('id,enabled,starts_at,ends_at').limit(100));
  queries.push(db.from('clan_members').select('clan_id,user_id').limit(200));
  const results=await Promise.all(queries);
  const failed=results.find(x=>x.error);
  if(failed)return res.status(503).json({error:'Auditoria competitiva indisponível: consulta incompleta.',code:'COMPETITIVE_AUDIT_INCOMPLETE'});
  const counts=Object.fromEntries(names.map((n,i)=>[n,results[i].count]));
  const audit=summarizeCompetitiveV98({counts,relays:results[5].data||[],warNodes:results[6].data||[],campaigns:results[7].data||[],clanMembers:results[8].data||[]});
  const warnings=[];
  for(const [index,name] of [[5,'Relés'],[6,'Nós de guerra'],[7,'Campanhas'],[8,'Vínculos de clã']]){
   if(results[index].data?.length>=[100,100,100,200][index-5])warnings.push(`Amostra de ${name} atingiu limite; verificação parcial`);
  }
  return res.json({ok:true,...audit,alerts:[...audit.alerts,...warnings.map(message=>({code:'PARTIAL_SAMPLE',severity:'warning',message}))],generatedAt:new Date().toISOString()});
 }));
}
