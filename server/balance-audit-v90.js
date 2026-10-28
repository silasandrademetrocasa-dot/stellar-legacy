/** V88–V90 read-only ADM balance inspector. Does not update any save or reward. */
export function summarizeBalanceAuditV90({npcs=[],spawns=[],maps=[],missions=[],gates=[]}={}){
 const npcKeys=new Set(npcs.filter(x=>x.enabled!==false).map(x=>x.npc_key));
 const activeSpawns=spawns.filter(x=>x.enabled!==false&&Number(x.spawn_count)>0);
 const apex=activeSpawns.filter(x=>x.npc_key==='apexOverlord');
 const found=new Set(activeSpawns.map(x=>x.npc_key));
 const missing=activeSpawns.filter(x=>!npcKeys.has(x.npc_key)).map(x=>`${x.map_id}/${x.npc_key}`);
 const noSpawn=[...npcKeys].filter(k=>!found.has(k)).sort();
 const enabledMaps=maps.filter(x=>x.enabled!==false);
 const pressure=npcs.filter(x=>x.enabled!==false).map(n=>({npc:n.npc_key,
   hpShield:Math.max(1,Number(n.hp)||0)+Math.max(0,Number(n.shield)||0),
   xpPerMillionHull:Math.round(Math.max(0,Number(n.xp)||0)*1e6/Math.max(1,(Number(n.hp)||0)+(Number(n.shield)||0))),
   creditsPerMillionHull:Math.round(Math.max(0,Number(n.credits)||0)*1e6/Math.max(1,(Number(n.hp)||0)+(Number(n.shield)||0)))}))
   .sort((a,b)=>b.creditsPerMillionHull-a.creditsPerMillionHull).slice(0,8);
 const warnings=[];
 if(apex.length!==1||apex[0]?.map_id!=='x7'||Number(apex[0]?.spawn_count)!==2)warnings.push('Apex: deve haver exclusivamente 2 no X-7');
 if(missing.length)warnings.push(`Spawns apontando para NPC inexistente: ${missing.length}`);
 if(!gates.length||!gates[0]?.config||!['alpha','beta','gamma'].every(k=>Array.isArray(gates[0].config?.[k]?.rounds)))warnings.push('Configuração de ondas Aurora/Nexus/Eclipse incompleta');
 const apexNpc=npcs.find(x=>x.npc_key==='apexOverlord');
 if(apexNpc&&Number(apexNpc.respawn_min_ms)<120000)warnings.push('Apex com respawn muito curto para um lendário');
 return {version:'V90',readOnly:true,totalNpcs:npcs.length,activeNpcs:npcKeys.size,activeMaps:enabledMaps.length,
   activeSpawns:activeSpawns.length,missions:missions.filter(x=>x.enabled!==false).length,apex:
   {map:apex[0]?.map_id||null,count:apex[0]?.spawn_count||0,respawnMinMs:apexNpc?.respawn_min_ms||null,
    respawnMaxMs:apexNpc?.respawn_max_ms||null},missingSpawnNpc:missing,noSpawnNpcs:noSpawn,
   topCreditPressure:pressure,warnings};
}
export function installBalanceAuditV90(app,{requireUser,asyncRoute,requireEliteAdmin}){
 app.get('/api/admin/v90/balance-audit',requireUser,asyncRoute(async(req,res)=>{
   res.set('Cache-Control','no-store');
   const {data:admin,error:adminError}=await req.sb.rpc('is_game_admin_v1763',{p_uid:req.user.id});
   if(adminError||admin!==true)return res.status(403).json({error:'Somente administrador.'});
   const db=await requireEliteAdmin();
   const [npcs,spawns,maps,missions,gates]=await Promise.all([
    db.from('game_npc_config_v1811').select('npc_key,enabled,hp,shield,xp,credits,stl,respawn_min_ms,respawn_max_ms').limit(300),
    db.from('game_map_npc_spawns_v1811').select('map_id,npc_key,enabled,spawn_count').limit(500),
    db.from('game_map_config_v1814').select('map_id,enabled,min_level').limit(60),
    db.from('game_mission_custom_v1815').select('mission_id,enabled').limit(200),
    db.from('galaxy_gate_config_v1906').select('version,config').limit(3)
   ]);
   const errored=[npcs,spawns,maps,missions,gates].find(x=>x.error);
   if(errored)return res.status(503).json({error:'Auditoria indisponível; não foi possível ler todas as configurações.'});
   const report=summarizeBalanceAuditV90({npcs:npcs.data||[],spawns:spawns.data||[],maps:maps.data||[],missions:missions.data||[],gates:gates.data||[]});
   return res.json({ok:true,generatedAt:new Date().toISOString(),...report});
 }));
}
