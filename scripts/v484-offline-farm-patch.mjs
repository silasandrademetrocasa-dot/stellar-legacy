/* STELLAR_OFFLINE_FARM_V484: patch idempotente para o Instalador Universal */
import fs from 'node:fs';
const MARK='STELLAR_OFFLINE_FARM_V484';
const marks=['server/index.js','public/game.js'].map(p=>fs.readFileSync(p,'utf8').includes('/* '+MARK+' APPLIED */'));
if(marks.every(Boolean)){console.log('✅ V48.4 already applied (idempotente)');process.exit(0);}
if(marks.some(Boolean))throw Error('Instalação V48.4 parcial: não sobrescrever manualmente; auditar arquivos.');
function apply(path,changes){let s=fs.readFileSync(path,'utf8');if(s.includes('/* '+MARK+' APPLIED */')){console.log('✅ V48.4 already patched: '+path);return;}for(const [old,addition] of changes){const count=s.split(old).length-1;if(count!==1)throw new Error(`V48.4: expected one anchor (${count}) in ${path}: ${old.slice(0,90)}`);s=s.replace(old,addition+old);}s='/* '+MARK+' APPLIED */\n'+s;fs.writeFileSync(path,s);console.log('✅ V48.4 patched: '+path);}
apply('server/index.js',[
  ["import { attachSharedUniverse } from './world.js';", "import {installOfflineFarmV484,offlineFarmEnsureInactiveV484,makeOfflineFarmGuardV484} from './offline-farm-v484.js';\n"],
  ["app.post('/api/economy/action', requireUser, asyncRoute(async (req,res)=>{", "// Offline routes and live-economy guards installed BEFORE normal economy/save routes.\ninstallOfflineFarmV484(app,{requireUser,asyncRoute,requireEliteAdmin});\nconst OFFLINE_FARM_GUARD_V484=makeOfflineFarmGuardV484(requireEliteAdmin);\n"],
]);
// Install guarded websocket authority before accepting a room or crediting a kill.
let si=fs.readFileSync('server/index.js','utf8');
for(const needle of ["grantNpcReward:async(userId,killKey,npcType,baseCredits,baseStl)=>{","grantOreReward:async(userId,oreKey,resource,amount,mapId)=>{"]){if(!si.includes(needle))throw Error('V48.4 reward guard missing anchor');si=si.replace(needle,needle+'\n    await offlineFarmEnsureInactiveV484(userId,requireEliteAdmin);');}
const joinAnchor="authorizeJoin: async (token,userId) => {";if(!si.includes(joinAnchor))throw Error('V48.4 missing world join anchor');si=si.replace(joinAnchor,joinAnchor+'\n    await offlineFarmEnsureInactiveV484(userId,requireEliteAdmin);');
for(const [from,to] of [
  ["app.post('/api/economy/action', requireUser, asyncRoute","app.post('/api/economy/action', requireUser, OFFLINE_FARM_GUARD_V484, asyncRoute"],
  ["app.put('/api/save', requireUser, asyncRoute","app.put('/api/save', requireUser, OFFLINE_FARM_GUARD_V484, asyncRoute"]
]){if(si.split(from).length!==2)throw Error('V48.4 expected single economic save route');si=si.replace(from,to);}
fs.writeFileSync('server/index.js',si);
apply('public/game.js',[
  ["import { SharedUniverseClient } from './world.js?v=47.7.6';", "import {createOfflineFarmV484} from './modules/stellar-offline-farm-v484.js';\n"],
  ["const sharedUniverse=new SharedUniverseClient({", `const OFFLINE_FARM_V484=createOfflineFarmV484({
  credentials:()=>getSessionCredentials(),
  saveBeforeStart:async()=>{if(!authenticated||!progress||gameBootstrapRuntime.loading)throw Error('Aguarde o salvamento do personagem.');await flushCloudSave(true);},
  onPauseWorld:async()=>{player.laserFiring=false;sharedUniverse.close();},
  onFinish:async()=>{location.reload();}
});
`],
  ["authenticated=true;void AUTOPILOT_V48.refreshAccess();", "void OFFLINE_FARM_V484.enable();"],
]);
