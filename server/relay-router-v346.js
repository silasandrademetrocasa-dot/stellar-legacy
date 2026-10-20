import {Router} from 'express';
import {derivedGlobalBonus,RELAY_MAPS,RELAY_IDS,RELAY_BONUS_VALUES,validRelayModuleId} from './relay-domination-v346.js';
const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
const fail=(res,error,status=409)=>res.status(status).json({error:String(error?.message||error||'Falha no relé').slice(0,200)});
export function createRelayRouter({serviceClient}){
 const r=Router();
 const sb=()=>{if(!serviceClient)throw Object.assign(new Error('Servidor sem chave privilegiada do banco.'),{status:503});return serviceClient;};
 r.get('/state',wrap(async(req,res)=>{
   const db=sb();
   const [controls,owners,states,modules,member,profile]=await Promise.all([
     db.from('stellar_relay_rules_v346').select('*').eq('id',1).maybeSingle(),
     db.from('stellar_warfront_nodes').select('map_id,node_id,owner,revision'),
     db.from('stellar_relay_state_v346').select('*').limit(9),
     db.from('stellar_relay_modules_v346').select('id,clan_id,category,attribute,level,map_id,node_id,slot').not('map_id','is',null).limit(72),
     db.from('clan_members').select('clan_id').eq('user_id',req.user.id).maybeSingle(),
     db.from('profiles').select('faction').eq('id',req.user.id).maybeSingle()
   ]);
   const error=[controls,owners,states,modules,member,profile].find(q=>q.error)?.error;if(error)return fail(res,error,503);
   const [balanceResult,missionResult]=await Promise.all([
      db.from('stellar_relay_module_balance_v3463').select('*').order('category').order('attribute').order('level'),
      req.sb.rpc('stellar_relay_mission_progress_v3463')
   ]);
   // Deploy-safe: before new SQL, legacy relay UI and older inventory keep working.
   const missing=x=>/42P01|PGRST205|PGRST202|schema cache|does not exist|42883/i.test(String(x?.message||''));
   if((balanceResult.error&&!missing(balanceResult.error))||(missionResult.error&&!missing(missionResult.error)))
     return fail(res,balanceResult.error||missionResult.error,503);
   const balance=balanceResult.data||[];
   const missionProgress=missionResult.data||{};
   const clanId=member.data?.clan_id||null;
   const rows=(owners.data||[]).map(o=>({...o,...(states.data||[]).find(s=>s.map_id===o.map_id&&s.node_id===o.node_id)}));
   const installed=(modules.data||[]).filter(m=>m.map_id&&m.node_id);
   const global=derivedGlobalBonus(rows,installed,clanId,profile.data?.faction||null,balance);
   let inventory=[],pieces=[],missions=[],clan=null;
   if(clanId){const [inv,part,claims,c,data]=await Promise.all([
     db.from('stellar_relay_modules_v346').select('*').eq('clan_id',clanId).order('created_at',{ascending:false}).limit(150),
     db.from('stellar_relay_clan_parts_v346').select('*').eq('clan_id',clanId),
     db.from('stellar_relay_mission_claims_v346').select('mission_id,period_start').eq('clan_id',clanId).order('period_start',{ascending:false}).limit(30),
     db.from('clans').select('id,name,tag,level,owner_id,vault_credits').eq('id',clanId).maybeSingle(),
     db.from('stellar_relay_clan_pve_v346').select('period_start,npc_kills,ore_collections').eq('clan_id',clanId).order('period_start',{ascending:false}).limit(1)
   ]); const err=[inv,part,claims,c,data].find(x=>x.error)?.error;if(err)return fail(res,err,503);
   inventory=inv.data||[];pieces=part.data||[];missions=claims.data||[];clan={...c.data,isOwner:c.data?.owner_id===req.user.id,pve:(data.data||[])[0]||null};}
   res.set('Cache-Control','no-store');res.json({ok:true,enabled:controls.data?.enabled===true,rules:controls.data,nodes:rows,installedModules:installed,inventory,pieces,missions,missionProgress,balance,clan,global,bonusCatalog:RELAY_BONUS_VALUES,serverTime:Date.now()});
 }));
 r.post('/module',wrap(async(req,res)=>{
   const {action,moduleId,category,attribute,mapId,nodeId,slot}=req.body||{};
   if(!['craft','upgrade','equip','unequip'].includes(action))return fail(res,'Ação inválida',400);
   if(moduleId!=null&&!validRelayModuleId(moduleId))return fail(res,'Módulo inválido',400);
   if(mapId!=null&&!RELAY_MAPS.includes(mapId))return fail(res,'Mapa inválido',400);
   if(nodeId!=null&&!RELAY_IDS.includes(nodeId))return fail(res,'Relé inválido',400);
   if(slot!=null&&(!Number.isInteger(slot)||slot<1||slot>8))return fail(res,'Slot inválido',400);
   const {data,error}=await req.sb.rpc('stellar_relay_module_action_v346',{p_action:action,p_module_id:moduleId||null,p_category:category||null,p_attribute:attribute||null,p_map_id:mapId||null,p_node_id:nodeId||null,p_slot:slot??null});
   if(error)return fail(res,error);res.json(data);
 }));
 r.post('/repair',wrap(async(req,res)=>{const map=String(req.body?.mapId||''),node=String(req.body?.nodeId||'');if(!RELAY_MAPS.includes(map)||!RELAY_IDS.includes(node))return fail(res,'Relé inválido',400);const {data,error}=await req.sb.rpc('stellar_relay_repair_v346',{p_map_id:map,p_node_id:node});if(error)return fail(res,error);res.json(data); }));
 r.post('/mission/:id/claim',wrap(async(req,res)=>{
   if(!['capture_week','defend_week','hunter_week','domination_week'].includes(req.params.id))return fail(res,'Missão inválida',400);
   const {data,error}=await req.sb.rpc('stellar_relay_claim_mission_v346',{p_mission_id:req.params.id});if(error)return fail(res,error);res.json(data);
 }));
 r.get('/admin',wrap(async(req,res)=>{
   const {data:yes,error:authError}=await req.sb.rpc('is_game_admin_v1763',{p_uid:req.user.id});if(authError||yes!==true)return fail(res,'Somente ADM',403);
   const {data,error}=await sb().from('stellar_relay_rules_v346').select('*').eq('id',1).single();if(error)return fail(res,error,503);res.json({ok:true,rules:data});
 }));
 r.post('/admin/release',wrap(async(req,res)=>{
   const mapId=String(req.body?.mapId||''),nodeId=String(req.body?.nodeId||''),clearFaction=req.body?.clearFaction;
   if(!RELAY_MAPS.includes(mapId)||!RELAY_IDS.includes(nodeId)||typeof clearFaction!=='boolean')return fail(res,'Relé ou ação inválidos',400);
   const {data:yes,error:authError}=await req.sb.rpc('is_game_admin_v1763',{p_uid:req.user.id});
   if(authError||yes!==true)return fail(res,'Somente ADM',403);
   const {data,error}=await sb().rpc('stellar_relay_admin_release_v3461',{p_map_id:mapId,p_node_id:nodeId,p_clear_faction:clearFaction,p_actor:req.user.id});
   if(error)return fail(res,error);res.set('Cache-Control','no-store');res.json(data);
 }));
 r.post('/admin/module-balance',wrap(async(req,res)=>{
   const {data:allowed,error:authError}=await req.sb.rpc('is_game_admin_v1763',{p_uid:req.user.id});
   if(authError||allowed!==true)return fail(res,'Somente ADM',403);
   const b=req.body||{};
   const category=String(b.category||''),attribute=String(b.attribute||''),level=Number(b.level);
   const allowedAttributes={weapon:['laser','missile'],shield:['capacitor','regenerator'],hp:['armor','nanobots'],bonus:['damage','shield','hp','speed','xp','resources']};
   if(!allowedAttributes[category]?.includes(attribute)||![1,2,3].includes(level))return fail(res,'Módulo ou nível inválido',400);
   const fields={damage:[0,20000],cooldown_ms:[0,10000],shield_bonus:[0,500000],hp_bonus:[0,500000],bonus_pct:[0,25],parts:[0,250],credits:[0,10000000],min_clan_level:[1,50]};
   const patch={updated_at:new Date().toISOString()};
   for(const [k,[low,high]] of Object.entries(fields)){
     if(b[k]===undefined)continue;
     const v=Number(b[k]);
     if(!Number.isFinite(v)||v<low||v>high||(k!=='bonus_pct'&&!Number.isSafeInteger(v)))return fail(res,`Valor inválido: ${k}`,400);
     patch[k]=v;
   }
   if(Object.keys(patch).length<2)return fail(res,'Nenhuma alteração',400);
   const {data,error}=await sb().from('stellar_relay_module_balance_v3463').update(patch).match({category,attribute,level}).select('*').single();
   if(error)return fail(res,error);
   if(category==='shield'||category==='hp'){
     const {data:equipped,error:lookupError}=await sb().from('stellar_relay_modules_v346').select('map_id,node_id').match({category,attribute,level}).not('map_id','is',null).limit(9);
     if(lookupError)return fail(res,lookupError);
     for(const relay of (equipped||[])){const {error:recomputeError}=await sb().rpc('stellar_relay_recompute_v346',{p_map_id:relay.map_id,p_node_id:relay.node_id});if(recomputeError)return fail(res,recomputeError);}
   }
   res.set('Cache-Control','no-store');res.json({ok:true,balance:data});
 }));
 r.post('/admin/rules',wrap(async(req,res)=>{
   const {data:yes,error:authError}=await req.sb.rpc('is_game_admin_v1763',{p_uid:req.user.id});if(authError||yes!==true)return fail(res,'Somente ADM',403);
   const limits={max_hp:[10000,12000000],max_shield:[10000,8000000],hit_damage:[100,50000],hit_cooldown_ms:[400,3000],capture_ms:[5000,60000],protection_ms:[10000,180000]};
   const patch={updated_at:new Date().toISOString()};for(const [key,range] of Object.entries(limits)){if(req.body?.[key]===undefined)continue;const v=req.body[key];if(!Number.isSafeInteger(v)||v<range[0]||v>range[1])return fail(res,`${key}: fora dos limites`,400);patch[key]=v;}
   if(typeof req.body?.enabled==='boolean')patch.enabled=req.body.enabled;
   if(req.body?.weekend_multiplier!==undefined){const x=Number(req.body.weekend_multiplier);if(!Number.isFinite(x)||x<1||x>2)return fail(res,'Multiplicador inválido',400);patch.weekend_multiplier=x;}
   const {data,error}=await sb().from('stellar_relay_rules_v346').update(patch).eq('id',1).select('*').single();if(error)return fail(res,error);res.json({ok:true,rules:data});
 }));
 return r;
}
