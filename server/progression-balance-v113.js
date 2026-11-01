/** V113.0 — Read-only, reproducible progression audit. No mutations, no rewards. */
const finite=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const ratio=(v,den)=>den>0?Math.round(v/den*100)/100:0;
const round=(v)=>Math.round(v);
export function classifyNpcV113(npc){
 const key=String(npc?.npc_key||'');
 return key==='apexOverlord'?'legendary':key.startsWith('boss')?'boss':'normal';
}
export function npcPressureV113(npc){
 const hull=Math.max(1,finite(npc?.hp)+finite(npc?.shield));
 const rank=classifyNpcV113(npc);
 return {id:String(npc?.npc_key||''),name:String(npc?.name||npc?.npc_key||''),rank,
  hull,damage:round(finite(npc?.damage)),
  credits:round(finite(npc?.credits)),stl:round(finite(npc?.stl)),xp:round(finite(npc?.xp)),
  creditsPerMillionHull:round(finite(npc?.credits)*1e6/hull),
  stlPerMillionHull:round(finite(npc?.stl)*1e6/hull),
  xpPerMillionHull:round(finite(npc?.xp)*1e6/hull)};
}
export function summarizeCombatProgressionV113({npcs=[],ships=[],items=[],missions=[],seasons=[],tiers=[]}={}){
 const activeNpcs=npcs.filter(n=>n&&n.enabled!==false);
 const pressure=activeNpcs.map(npcPressureV113);
 const bosses=pressure.filter(n=>n.rank==='boss');
 const legendary=pressure.find(n=>n.rank==='legendary')||null;
 const normals=pressure.filter(n=>n.rank==='normal');
 const allShips=ships.filter(s=>s?.kind==='ship'||s?.params?.hp);
 const allItems=items.filter(i=>i?.kind==='item'||i?.params?.equipment_type);
 const gear={drone:0,laser:0,shield:0,engine:0,auxAdvancedFamilies:5};
 for(const row of allItems){const p=row.params||{},t=p.equipment_type;
  if(t==='drone')gear.drone++;
  if(t==='laser')gear.laser++;
  if(t==='generator'&&p.equipment_subtype==='shield')gear.shield++;
  if(t==='generator'&&p.equipment_subtype==='speed')gear.engine++;
 }
 const shipRoles=allShips.map(row=>{const p=row.params||row;
  return {id:String(row.item_id||row.id||''),name:String(p.name||row.label||''),role:String(p.role||''),
   hp:finite(p.hp),speed:finite(p.speed),lasers:finite(p.lasers),generators:finite(p.generators),cargo:finite(p.cargo)};
 });
 const season=seasons.filter(s=>s?.enabled!==false).sort((a,b)=>String(b.starts_at||'').localeCompare(String(a.starts_at||'')))[0]||null;
 const pass={season:season?.season_key||null,tiers:finite(season?.tier_count),pointsPerTier:finite(season?.points_per_tier),dailyPoints:finite(season?.daily_points),
  nominalDaysToFinish:season?ratio(finite(season.tier_count)*finite(season.points_per_tier),7*finite(season.daily_points)):null,
  rewardsConfigured:tiers.filter(t=>t?.season_key===season?.season_key).length};
 const warnings=[];
 if(legendary&&legendary.hull<5000000)warnings.push('Boss lendário sem HP esperado.');
 if(!bosses.length)warnings.push('Nenhum chefe Prime ativo.');
 if(!shipRoles.length||!gear.drone)warnings.push('Catálogo de nave/drone indisponível.');
 if(season&&pass.nominalDaysToFinish<12)warnings.push('Passe pode terminar rápido demais com as 7 missões FREE.');
 if(season&&pass.rewardsConfigured<pass.tiers)warnings.push('Nem todos os tiers do Passe têm recompensas configuradas.');
 const outliers=[...normals].sort((a,b)=>b.creditsPerMillionHull-a.creditsPerMillionHull).slice(0,5);
 const bossMedian=arr=>{const sorted=arr.slice().sort((a,b)=>a-b);return sorted.length?round(sorted[Math.floor(sorted.length/2)]):0;};
 return {version:'V113',readOnly:true,counts:{npcs:activeNpcs.length,bosses:bosses.length,ships:shipRoles.length,items:allItems.length,missions:missions.filter(m=>m.enabled!==false).length},
  gear,pass,legendary,normalYield:{medianCreditsPerMillionHull:bossMedian(normals.map(n=>n.creditsPerMillionHull)),medianStlPerMillionHull:bossMedian(normals.map(n=>n.stlPerMillionHull))},
  bossesYield:{medianCreditsPerMillionHull:bossMedian(bosses.map(n=>n.creditsPerMillionHull)),medianStlPerMillionHull:bossMedian(bosses.map(n=>n.stlPerMillionHull))},
  topNormalYields:outliers,shipRoles,warnings};
}
export function installCombatProgressionAuditV113(app,{requireUser,asyncRoute,requireEliteAdmin}){
 app.get('/api/admin/v113/progression-audit',requireUser,asyncRoute(async(req,res)=>{
  const {data:admin,error}=await req.sb.rpc('is_game_admin_v1763',{p_uid:req.user.id});
  if(error||admin!==true)return res.status(403).json({error:'Somente ADM.'});
  const db=await requireEliteAdmin();
  const results=await Promise.all([
   db.from('game_npc_config_v1811').select('npc_key,name,hp,shield,damage,credits,stl,xp,enabled').limit(150),
   db.from('game_balance_entries_v1909').select('kind,item_id,label,params').limit(160),
   db.from('game_mission_category_v1815').select('category,enabled,reward_factor').limit(10),
   db.from('game_battle_pass_seasons_v1817b').select('season_key,enabled,starts_at,tier_count,points_per_tier,daily_points').limit(12),
   db.from('game_battle_pass_tiers_v1817b').select('season_key,tier_no').limit(200)
  ]);
  if(results.some(r=>r.error))return res.status(503).json({error:'Auditoria incompleta: uma configuração não respondeu.'});
  const [npcs,items,missions,seasons,tiers]=results.map(r=>r.data||[]);
  res.set('Cache-Control','no-store');return res.json({ok:true,generatedAt:new Date().toISOString(),...summarizeCombatProgressionV113({npcs,ships:items.filter(i=>i.kind==='ship'),items:items.filter(i=>i.kind==='item'),missions,seasons,tiers})});
 }));
}
