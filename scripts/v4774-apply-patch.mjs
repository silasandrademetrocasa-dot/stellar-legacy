#!/usr/bin/env node
// V47.7.4 — Bot Elite/UX recovery patch. Incremental, no SQL, no economy modification.
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {resolve,dirname,join,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const OLD='47.7.3',NEW='47.7.4';
const read=file=>readFileSync(resolve(root,file),'utf8');
let changed=0;
function edit(file,fn){const old=read(file),next=fn(old);if(old!==next){writeFileSync(resolve(root,file),next);changed++;}}
function replaceOne(s,old,updated,label){
 if(s.includes(updated))return s;
 const n=s.split(old).length-1;
 if(n!==1)throw Error(`V47.7.4 ${label}: expected 1 anchor, found ${n}`);
 return s.replace(old,updated);
}
function walk(dir){return readdirSync(resolve(root,dir),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):e.isFile()?[join(dir,e.name)]:[]);}
if(JSON.parse(read('package.json')).version!==NEW)throw Error('Wrong package.json version for V47.7.4');
if(!read('server/warbot-engine-v477.js').includes("role==='interceptor'?182"))throw Error('Slower Warbot engine missing');
if(!read('public/modules/warbot-visual-v477.js').includes('colossar-prime.webp'))throw Error('Elite art missing');
if(!read('server/frontier-stability-v450.js').includes("if(IS_U.test(String(mapId)))return !!sector&&"))throw Error('U-X neutral sector validation missing');
// On a low-level U-X attempt verify the player's admin role against the SAME RPC as the WS room.
edit('public/api.js',s=>replaceOne(s,
`export async function getAdminStatus(){
  return authedServerFetch('/api/admin/status');
}`,
`export async function getAdminStatus(){
  return authedServerFetch('/api/admin/status');
}
// V47.7.4 — server-authenticated U-X preflight; never takes admin claims from the browser.
export async function frontierAdminAccessV4774(mapId){
  if(!/^u[1-3]$/.test(String(mapId||'')))throw new Error('Setor inválido');
  return authedServerFetch('/api/frontier/admin-entry?mapId='+encodeURIComponent(mapId));
}`,'frontier authenticated preflight API'));
edit('server/index.js',s=>replaceOne(s,
`app.get('/api/admin/status', requireUser, asyncRoute(async(req,res)=>adminRpc(req,res,'admin_status_v1763')));`,
`// V47.7.4: U-X preflight uses the same Supabase role authority as /ws join_map.
app.get('/api/frontier/admin-entry',requireUser,asyncRoute(async(req,res)=>{
  const mapId=String(req.query.mapId||'');
  if(!/^u[1-3]$/.test(mapId))return res.status(400).json({allowed:false,error:'Setor inválido'});
  const {data,error}=await req.sb.rpc('is_game_admin_v1763',{p_uid:req.user.id});
  if(error)return res.status(503).json({allowed:false,error:'Não foi possível verificar ADM'});
  res.set('Cache-Control','no-store');return res.json({allowed:data===true,mapId});
}));
app.get('/api/admin/status', requireUser, asyncRoute(async(req,res)=>adminRpc(req,res,'admin_status_v1763')));`,'frontier server RPC admin entry'));
edit('public/game.js',s=>{
  if(!s.includes("import {frontierAdminAccessV4774} from './api.js?v="+NEW+"';"))s=replaceOne(s,
`import {createWarbotAdminV477} from './modules/warbot-admin-v477.js?v=${OLD}';`,
`import {createWarbotAdminV477} from './modules/warbot-admin-v477.js?v=${OLD}';
import {frontierAdminAccessV4774} from './api.js?v=${OLD}';`,'frontier preflight import');
  const old=`    access=canTravelGraphLabel(label);
  }
  return access;
}
function canTravelGraphLabel(label){`;
  const updated=`    access=canTravelGraphLabel(label);
    // The websocket uses is_game_admin_v1763; check the same authority if the UI is still stale.
    if(!access.ok&&/^Requer nível/.test(String(access.reason))){
      try{
        const admission=await frontierAdminAccessV4774(sectorDestinationV435(String(label))?.mapId);
        if(admission?.allowed===true){
          // A preflight grant applies only to this travel, NEVER to general admin permissions.
          const dest=graphDestination(label);
          access={ok:true,mapId:dest.mapId,territoryFaction:dest.territoryFaction,battle:false,foreign:false};
        }
      }catch(err){console.warn('[frontier-admission]',String(err?.message||err).slice(0,90));}
    }
  }
  return access;
}
function canTravelGraphLabel(label){`;
  s=replaceOne(s,old,updated,'U-X authenticated fallback on stale admin flag');
  // Distinct error message and rollback instead of silently showing an empty frontier world.
  const oldJoin=`    showToast('MAPA PvP • '+sharedUniverseRuntime.mapError,'system');
    return;
  }
  if(msg.type==='world_snapshot'){`;
  const updatedJoin=`    const deniedFrontier=/^u[1-3]$/.test(progress.mapId)&&(/MAP_JOIN_DENIED|nível mínimo|Requer nível|Setor indisponível/i.test(String(msg.reason||'')));
    if(deniedFrontier){
      // Do not display a fake empty U-X room after a failed authoritative join.
      sharedUniverseRuntime.ready=false;
      showToast('U-X • entrada negada pelo servidor. Verifique a permissão ADM e o nível.','system');
    }else showToast('MAPA • '+sharedUniverseRuntime.mapError,'system');
    return;
  }
  if(msg.type==='world_snapshot'){`;
  s=replaceOne(s,oldJoin,updatedJoin,'frontier denied room message');
  return s;
});
edit('server/world.js',s=>{
  // Fail closed when U-X sector catalog is missing; refresh the authoritative SQL catalog first.
  s=replaceOne(s,
`        const sector=world.sectorForRoom(mapId,territory);`,
`        // U-X sector cache can be empty during startup: load authoritative SQL before admission.
        if(/^u[1-3]$/.test(mapId)&&!world.sectorForRoom(mapId,territory)){
          await world.refreshWorldConfig(true);
        }
        const sector=world.sectorForRoom(mapId,territory);`,'U-X authoritative sector on-demand hydration');
  const original=`        if(/^u[1-3]$/.test(mapId)&&r.npcs.size===0&&world.npcSpawnGroups(mapId).some(g=>g.count>0))r.applyNpcRuntimeConfig();
        r.addClient(ws,p);`;
  const updated=`        if(/^u[1-3]$/.test(mapId)&&r.npcs.size===0&&world.npcSpawnGroups(mapId).some(g=>g.count>0))r.applyNpcRuntimeConfig();
        r.addClient(ws,p);
        // U-X rooms can be created before asynchronous NPC settings finish loading.
        // Once the cached runtime is ready, repopulate only a genuinely empty frontier room.
        if(/^u[1-3]$/.test(mapId)&&r.npcs.size===0){
          world.refreshNpcConfig(false).then(()=>{
            if(ws.room!==r||r.npcs.size>0)return;
            const groups=world.npcSpawnGroups(mapId);
            if(groups.length&&groups.some(g=>g.count>0))r.applyNpcRuntimeConfig();
          }).catch(e=>console.warn('[frontier-ux-spawn]',String(e?.message||e).slice(0,100)));
        }`;
  s=replaceOne(s,original,updated,'U-X asynchronous NPC hydration');
  return s;
});
// Retains V47.7.2 offscreen battle effects culling and V47.7.3 FPS improvements.
// Only versioned resource URLs and text match the new release; game FPS code untouched.
for(const file of walk('public').filter(f=>['.js','.mjs','.html','.css','.webmanifest'].includes(extname(f)))){
  edit(file,s=>s.replaceAll('?v='+OLD,'?v='+NEW));
}
edit('server/index.js',s=>replaceOne(s,`const RELEASE_VERSION = '${OLD}'`,`const RELEASE_VERSION = '${NEW}'`,'server release version'));
// Update only retired expectations for the intentional V47.7.4 art/Canvas contract.
edit('tests/warbot-polish-v4771.test.mjs',s=>s
  .replace('for(const f of [\'earth\',\'mars\',\'jupiter\'])assert.equal(WARBOT_SHIP_ASSETS[f],`/assets/v2212/ships/${f}-map.webp`);',
           "assert.deepEqual(Object.values(WARBOT_SHIP_ASSETS).map(x=>x.split('/').at(-1)),['colossar-prime.webp','dreadnox-prime.webp','kharon-prime.webp']);")
  .replace("assert.deepEqual(calls,['save','save','drawImage','restore','restore']);", "assert.deepEqual(calls,['save','drawImage','restore']);"));
for(const file of walk('tests').filter(f=>f.endsWith('.test.mjs')&&!f.endsWith('bot-elite-frontier-v4774.test.mjs'))){
  edit(file,s=>s.replaceAll(OLD,NEW).replaceAll(OLD.replaceAll('.','\\.'),NEW.replaceAll('.','\\.')).replaceAll('v4773-apply-patch','v4774-apply-patch'));
}
const required=[
  ['public/game.js','frontierAdminAccessV4774('],
  ['public/api.js','export async function frontierAdminAccessV4774'],
  ['server/index.js','/api/frontier/admin-entry'],
  ['server/world.js','[frontier-ux-spawn]'],
  ['server/world.js','await world.refreshWorldConfig(true)'],
  ['server/frontier-stability-v450.js','return !!sector&&'],
  ['server/warbot-engine-v477.js',"role==='interceptor'?182"],
  ['public/modules/warbot-visual-v477.js','colossar-prime.webp']
];
for(const [f,k] of required)if(!read(f).includes(k))throw Error('Missing V47.7.4 integration: '+f+' '+k);
if(!read('public/index.html').includes('/game.js?v='+NEW))throw Error('Cache-busting game.js version mismatch');
console.log(`✅ V47.7.4 ELITE POLISH / FRONTIER RECOVERY • ${changed} edits • no SQL required.`);
