#!/usr/bin/env node
// V47.7 — idempotent patch: install only from official V47.0.0 base or same V47.7.0.
// Data-safe: source/editor/server wiring only; SQL executed separately by ADM.
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {resolve,dirname,join,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const OLD='47.0.0',NEW='47.7.0';
const load=p=>readFileSync(resolve(root,p),'utf8');
const edit=(p,fn)=>{const before=load(p),after=fn(before);if(before!==after)writeFileSync(resolve(root,p),after);};
function rep(s,a,b,path){if(s.includes(b))return s;if(!s.includes(a))throw Error(`V47.7 missing anchor ${path}: ${a.slice(0,85)}`);return s.replace(a,b);}
function walk(dir){return readdirSync(resolve(root,dir),{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(join(dir,x.name)):x.isFile()?[join(dir,x.name)]:[]);}
const must=(p,needle)=>{if(!load(p).includes(needle))throw Error(`${p}: missing anchor ${needle}`);};
const v=JSON.parse(load('package.json')).version;
if(v!==OLD&&v!==NEW)throw Error(`V47.7 expects V${OLD} or V${NEW}; found V${v}`);
// Regression checks for old audio/combat phases must validate the CURRENT release,
// not hard-code the historical asset cache-busting query. This preserves strict
// HTML-version verification while allowing the V47.7 update to pass safely.
function repairPinnedAssetVersionAssertions(){
  const tests=[
    {path:'tests/combat-reborn-v470.test.mjs',variable:'h',replacement:"assert.ok(h.includes('/game.js?v='+pkg.version));"},
    {path:'tests/stellar-audio-v462.test.mjs',variable:'html',replacement:"assert.ok(html.includes('/game.js?v='+JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8')).version));"}
  ];
  for(const item of tests){
    edit(item.path,s=>{
      if(s.includes(item.replacement))return s; // idempotent on repeated checks
      const lines=s.split('\n');
      const matches=[];
      for(let i=0;i<lines.length;i++){
        const t=lines[i].trim();
        if(t.startsWith(`assert.match(${item.variable},`)&&t.includes('game')&&t.includes('v=47'))matches.push(i);
      }
      if(matches.length!==1)throw Error(`Ambiguous or missing legacy asset-version assertion in ${item.path}`);
      lines[matches[0]]=lines[matches[0]].slice(0,lines[matches[0]].indexOf('assert.match('))+item.replacement;
      return lines.join('\n');
    });
  }
}
repairPinnedAssetVersionAssertions();
if(load('public/game.js').includes('handleWarbotMessageV477')&&load('server/world.js').includes('createWarbotEngine(this)')){console.log('V47.7 already integrated');process.exit(0);}
for(const file of ['server/world.js','server/index.js','public/game.js','public/index.html','public/modules/warbot-visual-v477.js','public/modules/warbot-admin-v477.js','server/warbot-engine-v477.js'])must(file, file==='public/game.js'?'function drawEnemy(e)':file==='server/world.js'?'export function attachSharedUniverse':file==='server/index.js'?'const sharedUniverse = attachSharedUniverse':file==='public/index.html'?'id="adminRuntimeEventsPanel"':'');

edit('server/world.js',s=>{
  s=rep(s,"import {portalPointV461} from '../public/modules/portal-layout-v461.js';", "import {createWarbotEngine} from './warbot-engine-v477.js';\nimport {portalPointV461} from '../public/modules/portal-layout-v461.js';",'world imports');
  s=rep(s,'    this.npcs=new Map();','    this.npcs=new Map();\n    this.warbotEngine=createWarbotEngine(this);','warbot construct');
  s=rep(s,'    this.generateBaseWorld();\n    this.ensureEvent(true);','    this.generateBaseWorld();\n    this.warbotEngine.configure(world.warbotSettings.get(this.mapId));\n    this.ensureEvent(true);','warbot startup');
  s=rep(s,'npcs:[...this.npcs.values()].map(e=>this.publicNpc(e)),ores:',
    'npcs:[...this.npcs.values()].map(e=>this.publicNpc(e)).concat([...this.warbotEngine.bots.values()].filter(e=>e.hp>0).map(e=>this.warbotEngine.publicBot(e))),ores:','snapshot bots');
  s=rep(s,'  async handleDamage(ws,msg){\n    const p=ws.player,e=this.npcs.get(String(msg.entityId||\'\'));',
    "  async handleDamage(ws,msg){\n    if(this.warbotEngine.bots.has(String(msg.entityId||'')))return this.warbotEngine.handleHit(ws,msg,admitNpcDamage);\n    const p=ws.player,e=this.npcs.get(String(msg.entityId||''));",'bot hit handler');
  s=rep(s,'    this.updateWarfrontControl(dt,now);\n    const activeEventId=',
    '    this.updateWarfrontControl(dt,now);\n    this.warbotEngine.tick(dt,now);\n    const activeEventId=','bot tick');
  s=rep(s,'loadWorldDirectives,grantNpcReward,grantOreReward}){','loadWorldDirectives,grantNpcReward,grantOreReward,loadWarbotConfig}){','bot config dependency');
  s=rep(s,'    directives:[],lastDirectivesAt:0,directivesBusy:false,',
    `    warbotSettings:new Map(),lastWarbotConfigAt:0,warbotConfigBusy:false,
    async refreshWarbotSettings(force=false){
      const now=nowMs();if(!loadWarbotConfig)return this.warbotSettings;
      if(!force&&now-this.lastWarbotConfigAt<10000)return this.warbotSettings;
      if(this.warbotConfigBusy)return this.warbotSettings;
      this.warbotConfigBusy=true;
      try{
        const rows=await loadWarbotConfig();if(!Array.isArray(rows))throw Error('Configuração Warbot inválida');
        const next=new Map(rows.filter(x=>['b41','b42','b43'].includes(x?.map_id)).map(x=>[x.map_id,x]));
        this.warbotSettings=next;
        for(const room of rooms.values())room.warbotEngine.configure(next.get(room.mapId));
      }catch(e){console.warn('[warbot-config] Modo seguro DESLIGADO:',String(e.message||e));this.warbotSettings=new Map();for(const room of rooms.values())room.warbotEngine.configure(null);}
      finally{this.lastWarbotConfigAt=nowMs();this.warbotConfigBusy=false;}
      return this.warbotSettings;
    },
    directives:[],lastDirectivesAt:0,directivesBusy:false,`, 'refresh bot config');
  s=rep(s,'  world.refreshWorldConfig(true).catch(()=>{});',
    '  world.refreshWorldConfig(true).catch(()=>{});\n  world.refreshWarbotSettings(true).catch(()=>{});','warbot initial refresh');
  s=rep(s,'if(n-world.lastDirectivesAt>=20000)world.refreshDirectives(false).catch(()=>{});',
    'if(n-world.lastDirectivesAt>=20000)world.refreshDirectives(false).catch(()=>{});if(n-world.lastWarbotConfigAt>=10000)world.refreshWarbotSettings(false).catch(()=>{});','warbot poll');
  return s;
});

edit('server/index.js',s=>{
  s=rep(s,"import express from 'express';","import {cleanWarbotConfig,WARBOT_MAPS} from './warbot-engine-v477.js';\nimport express from 'express';",'server imports');
  const routes=`
// V47.7: controlled, expiring Warbot sessions; ADMIN check from authenticated RPC.
async function requireWarbotAdministrator(req,res){
  const {data,error}=await req.sb.rpc('admin_status_v1763');
  if(error||data?.is_admin!==true){res.status(403).json({error:'Apenas administradores podem controlar bots.'});return false;}
  return true;
}
app.get('/api/admin/warbots',requireUser,asyncRoute(async(req,res)=>{
  if(!await requireWarbotAdministrator(req,res))return;
  const sb=await requireEliteAdmin();
  const {data,error}=await sb.from('stellar_warbot_events_v477').select('map_id,enabled,mode,bots_per_faction,tier,attack_players,ends_at,updated_at').order('map_id');
  if(error)return res.status(503).json({error:'Execute primeiro o SQL V47.7 no Supabase.'});
  res.set('Cache-Control','no-store');res.json({ok:true,maps:data||[]});
}));
app.post('/api/admin/warbots',requireUser,asyncRoute(async(req,res)=>{
  if(!await requireWarbotAdministrator(req,res))return;
  const raw=req.body||{},map_id=String(raw.map_id||'');
  if(!WARBOT_MAPS.includes(map_id)||typeof raw.enabled!=='boolean')return res.status(400).json({error:'Mapa ou ativação inválida.'});
  if(raw.enabled&&(!['conquest','training'].includes(raw.mode)||!Number.isInteger(raw.bots_per_faction)||raw.bots_per_faction<1||raw.bots_per_faction>4||!Number.isInteger(raw.tier)||raw.tier<1||raw.tier>3))return res.status(400).json({error:'Modo, quantidade ou dificuldade inválida.'});
  const duration=Number(raw.duration_minutes);
  if(raw.enabled&&(!Number.isInteger(duration)||duration<5||duration>120))return res.status(400).json({error:'Duração deve ser de 5 a 120 minutos.'});
  const cleaned=cleanWarbotConfig({enabled:raw.enabled,mode:raw.mode,bots_per_faction:raw.bots_per_faction,tier:raw.tier,attack_players:raw.attack_players===true,ends_at:raw.enabled?new Date(Date.now()+duration*60000).toISOString():null});
  const sb=await requireEliteAdmin();
  const values={map_id,...cleaned,updated_at:new Date().toISOString(),updated_by:req.user.id};
  const {error}=await sb.from('stellar_warbot_events_v477').upsert(values,{onConflict:'map_id'});
  if(error)return res.status(503).json({error:'Não foi possível persistir Warbots. Confira a migração V47.7.'});
  await sharedUniverse.refreshWarbotSettings(true);
  res.set('Cache-Control','no-store');res.json({ok:true,map_id,configuration:cleaned});
}));
`;
  s=rep(s,"app.get('/api/admin/status', requireUser, asyncRoute(async(req,res)=>adminRpc(req,res,'admin_status_v1763')));",
    routes+"\napp.get('/api/admin/status', requireUser, asyncRoute(async(req,res)=>adminRpc(req,res,'admin_status_v1763')));",'admin routes');
  s=rep(s,'const sharedUniverse = attachSharedUniverse(server, {',
    `const sharedUniverse = attachSharedUniverse(server, {
  loadWarbotConfig:async()=>{
    const sb=await requireEliteAdmin();
    const {data,error}=await sb.from('stellar_warbot_events_v477').select('map_id,enabled,mode,bots_per_faction,tier,attack_players,ends_at');
    if(error)throw new Error('SQL Warbot V47.7 indisponível');
    return data||[];
  },`, 'server injection');
  return s;
});

edit('public/game.js',s=>{
  s=rep(s,"import {createCombatRebornV470,npcTacticalDriftV470,drawPortalSignatureV470} from './modules/combat-reborn-v470.js?v=47.0.0';",
    `import {createWarbotAdminV477} from './modules/warbot-admin-v477.js?v=${NEW}';
import {drawWarbotShipV477,drawWarbotBeamV477} from './modules/warbot-visual-v477.js?v=${NEW}';
import {createCombatRebornV470,npcTacticalDriftV470,drawPortalSignatureV470} from './modules/combat-reborn-v470.js?v=${OLD}';`, 'game imports');
  s=rep(s,'function normalizeSharedNpc(raw){',
    `const warbotBeamsV477=[];
function handleWarbotMessageV477(msg){
  if(msg.type==='warbot_clear'){
    const ids=new Set(msg.ids||[]);state.enemies=state.enemies.filter(e=>!ids.has(e.id));
    if(state.target&&ids.has(state.target.id)){state.target=null;player.laserFiring=false;}
    return true;
  }
  if(msg.type==='warbot_state'){
    const ids=new Set((msg.bots||[]).map(e=>String(e.id||'')));
    state.enemies=state.enemies.filter(e=>!e.warBot||ids.has(String(e.id)));
    for(const raw of msg.bots||[]){
      if(!String(raw.id||'').startsWith('warbot_'))continue;
      const prev=findSharedNpc(raw.id);
      if(prev)applySharedNpcPatch(raw);
      else state.enemies.push(normalizeSharedNpc(raw));
    }
    if(state.target?.warBot&&!ids.has(String(state.target.id))){state.target=null;player.laserFiring=false;}
    return true;
  }
  if(msg.type==='warbot_damage_result'){
    const e=findSharedNpc(msg.entityId);if(e&&msg.actual>0){
      e.hp=Number(msg.hp??e.hp);e.shield=Number(msg.shield??e.shield);
      spawnCombatText(e.x,e.y-e.size,'BOT -'+fmt(msg.actual),'#ffd89b',{kind:'damage'});
      spawnImpactFx(e.x,e.y,'#ffb675',26,'impact');
    }
    // Warbot damage never completes passes, missions, quests, economy or PVP kill stats.
    return true;
  }
  if(msg.type==='warbot_spar_hit'){
    if(progress&&state.currentMap?.battle)spawnCombatText(player.x,player.y-45,'TREINO -'+fmt(Number(msg.estimatedDamage)||0),'#ebc868',{kind:'incoming'});
    return true;
  }
  if(msg.type==='warbot_fire'){
    if(!state.currentMap?.battle)return true;
    const a=msg.from||{},b=msg.to||{};
    if(Number.isFinite(Number(a.x))&&Number.isFinite(Number(a.y))&&Number.isFinite(Number(b.x))&&Number.isFinite(Number(b.y))){
      warbotBeamsV477.push({a:{x:Number(a.x),y:Number(a.y)},b:{x:Number(b.x),y:Number(b.y)},color:String(msg.color||'#77cfff'),created:nowSec()});
      if(warbotBeamsV477.length>12)warbotBeamsV477.shift();
      playSfx('petLaser');
    }
    return true;
  }
  return false;
}
function drawWarbotBeamsV477(){
  const now=nowSec(),quality=resolvedQualityMode();
  for(let i=warbotBeamsV477.length-1;i>=0;i--){
    const f=warbotBeamsV477[i];
    if(now-f.created>.22){warbotBeamsV477.splice(i,1);continue;}
    if(!onScreenWorld(f.a.x,f.a.y,160)&&!onScreenWorld(f.b.x,f.b.y,160))continue;
    drawWarbotBeamV477(ctx,{...f,a:screenPos(f.a.x,f.a.y),b:screenPos(f.b.x,f.b.y)},now,quality);
  }
}
function normalizeSharedNpc(raw){`, 'warbot listener helpers');
  s=rep(s,'function handleSharedUniverseMessage(msg){',
    `function handleSharedUniverseMessage(msg){
  if(handleWarbotMessageV477(msg))return;`, 'websocket dispatch');
  s=rep(s,'function drawEnemy(e){\n',
    `function drawEnemy(e){
  if(e.warBot){
    const p=screenPos(e.x,e.y);
    drawWarbotShipV477(ctx,{...e,x:p.x,y:p.y},state.target?.id===e.id,resolvedQualityMode(),nowSec());
    ctx.save();ctx.fillStyle='#ffffff';ctx.font='bold 9px Arial';ctx.textAlign='center';ctx.fillText(e.name,p.x,p.y-36);
    ctx.fillStyle='#ff6c73';ctx.fillRect(p.x-22,p.y+30,44*Math.max(0,e.hp)/Math.max(1,e.maxHp),3);
    ctx.fillStyle='#63d6ff';ctx.fillRect(p.x-22,p.y+34,44*Math.max(0,e.shield)/Math.max(1,e.maxShield),2);
    ctx.restore();return;
  }
`, 'special bot renderer');
  // Consumable ammunition is still deducted normally, but shooting bots never advances ammo-use passes.
  s=rep(s,"progress.ammo[ammo.id]=Math.max(0,stock-firingCount);battlePassEvent('ammoUse',firingCount);",
    "progress.ammo[ammo.id]=Math.max(0,stock-firingCount);if(!state.target?.warBot)battlePassEvent('ammoUse',firingCount);",'anti-farm laser');
  s=s.replaceAll("progress.rockets[shotRocket.id]=Math.max(0,(progress.rockets[shotRocket.id]||0)-1);battlePassEvent('ammoUse',1);",
    "progress.rockets[shotRocket.id]=Math.max(0,(progress.rockets[shotRocket.id]||0)-1);if(!state.target?.warBot)battlePassEvent('ammoUse',1);");
  s=rep(s,'drawOnlinePlayers();if(q.fx)drawRocketFx();drawPlayer();',
    'drawOnlinePlayers();drawWarbotBeamsV477();if(q.fx)drawRocketFx();drawPlayer();','bot FX draw');
  s=rep(s,"  if(next==='events'&&!adminEventsEditor.snapshot)loadAdminEventsEditor(false);",
    "  if(next==='events'&&!adminEventsEditor.snapshot)loadAdminEventsEditor(false);\n  if(next==='events')WAR_BOT_ADMIN_V477.load();",'ADM events activation');
  s=rep(s,'const adminInterfaceEditor={busy:false,activeTab:\'runtime\',snapshot:null};',
    `const WAR_BOT_ADMIN_V477=createWarbotAdminV477({root:document.getElementById('warbotAdminRoot'),credentials:getSessionCredentials,notify:msg=>showToast(msg,'system')});
const adminInterfaceEditor={busy:false,activeTab:'runtime',snapshot:null};`, 'ADM panel init');
  return s;
});
edit('public/index.html',s=>rep(s,'      <div class="admin-runtime-events-grid" id="adminRuntimeEventsGrid">',
  '      <div id="warbotAdminRoot" class="warbot-admin-root"><div class="empty-state">GALACTIC BOT WARS • carregando controles...</div></div>\n      <div class="admin-runtime-events-grid" id="adminRuntimeEventsGrid">','ADM html'));
edit('public/style.css',s=>s.includes('/* WARBOT V47.7 */')?s:s+`
/* WARBOT V47.7 */
.warbot-adm-section{padding:12px;margin:10px 0 16px;border:1px solid rgba(74,184,255,.25);border-radius:12px;background:#071526}
.warbot-adm-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:9px;margin-top:10px}
.warbot-adm-card{padding:12px;background:#091d2b;border:1px solid rgba(100,181,255,.18);border-radius:10px}
.warbot-adm-card-head,.warbot-adm-actions{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;flex-wrap:wrap}
.warbot-on{color:#78ffc0}.warbot-off{color:#ffb6ab}
.warbot-adm-controls{display:grid;gap:9px;margin-bottom:10px}
.warbot-adm-controls label{display:flex;justify-content:space-between;align-items:center;gap:10px;color:#bed2e8;font-size:11px}
.warbot-adm-controls select{background:#122d3a;border:1px solid #315977;color:#e4f7ff;max-width:60%;min-width:110px;border-radius:5px;padding:7px}
.warbot-adm-controls .warbot-adm-check{justify-content:flex-start}
.warbot-adm-controls input{accent-color:#6beaff}
@media(max-width:520px){.warbot-adm-grid{grid-template-columns:1fr}.warbot-adm-controls select{max-width:54%}}
`);

// Replace versioned client imports safely, retaining the original source modules.
for(const file of walk('public').filter(f=>['.js','.mjs','.html','.css'].includes(extname(f))))edit(file,s=>s.replaceAll('?v='+OLD,'?v='+NEW));
edit('server/index.js',s=>s.replace("const RELEASE_VERSION = '"+OLD+"'","const RELEASE_VERSION = '"+NEW+"'"));
for(const file of walk('tests').filter(f=>f.endsWith('.test.mjs')))edit(file,s=>s
 .replaceAll(OLD,NEW).replaceAll('v470-apply-patch','v477-apply-patch'));
console.log('V47.7: Galactic Bot Wars linked. All three maps remain OFF until authorized ADM + SQL.');
