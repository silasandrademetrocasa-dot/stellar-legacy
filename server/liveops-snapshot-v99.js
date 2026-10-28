import {createHash} from 'node:crypto';
/** V99: read-only, secret-free snapshots of public Live Ops configuration for ADM review. */
export const LIVEOPS_TABLES_V99=Object.freeze({
 npcs:{table:'game_npc_config_v1811',order:'npc_key',limit:100},
 spawns:{table:'game_map_npc_spawns_v1811',order:'map_id',limit:250},
 maps:{table:'game_map_config_v1814',order:'map_id',limit:80},
 missions:{table:'game_mission_category_v1815',order:'category',limit:20},
 gates:{table:'galaxy_gate_config_v1906',order:'id',limit:3},
 astralRewards:{table:'stellar_astral_config_v381',order:'gate',limit:5},
 warRules:{table:'stellar_war_rules',order:'id',limit:3},
 relayRules:{table:'stellar_relay_rules_v346',order:'id',limit:3}
});
function stable(value){
 if(Array.isArray(value))return value.map(stable);
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));
 return value;
}
export function digestLiveopsV99(sections={}){
 const normalized=stable(sections);
 return createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}
export function compareLiveopsV99(oldSnapshot={},newSnapshot={}){
 const before=oldSnapshot.sections||{},after=newSnapshot.sections||{};
 const changed=[];
 for(const key of new Set([...Object.keys(before),...Object.keys(after)])){
  if(JSON.stringify(stable(before[key]))!==JSON.stringify(stable(after[key])))changed.push(key);
 }
 return changed.sort();
}
export function installLiveopsSnapshotV99(app,{requireUser,asyncRoute,requireEliteAdmin}){
 app.get('/api/admin/v99/liveops-snapshot',requireUser,asyncRoute(async(req,res)=>{
  res.set('Cache-Control','no-store');
  const {data:allowed,error:authErr}=await req.sb.rpc('is_game_admin_v1763',{p_uid:req.user.id});
  if(authErr||allowed!==true)return res.status(403).json({error:'Somente ADM.'});
  const db=await requireEliteAdmin();
  const entries=Object.entries(LIVEOPS_TABLES_V99);
  const results=await Promise.all(entries.map(([,cfg])=>db.from(cfg.table).select('*').order(cfg.order).limit(cfg.limit)));
  const failing=results.find(x=>x.error);
  if(failing)return res.status(503).json({error:'Snapshot não gerado: fonte indisponível. Nenhuma configuração foi alterada.',code:'LIVEOPS_SNAPSHOT_INCOMPLETE'});
  const sections={};const warnings=[];
  for(let i=0;i<entries.length;i++){
   const [name,cfg]=entries[i];sections[name]=[...(results[i].data||[])].sort((a,b)=>JSON.stringify(stable(a)).localeCompare(JSON.stringify(stable(b))));
   if(sections[name].length===cfg.limit)warnings.push(`A seção ${name} atingiu o limite de leitura: verificar completude`);
  }
  const hash=digestLiveopsV99(sections);
  return res.json({ok:true,readOnly:true,version:'V99',generatedAt:new Date().toISOString(),sha256:hash,sections,warnings});
 }));
}
