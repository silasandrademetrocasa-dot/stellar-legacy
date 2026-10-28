import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {summarizeCompetitiveV98} from '../server/competitive-readiness-v98.js';
import {digestLiveopsV99,compareLiveopsV99,LIVEOPS_TABLES_V99} from '../server/liveops-snapshot-v99.js';
import {releaseReadinessV100,CORE_APK_ASSETS_V100} from '../server/release-readiness-v100.js';
const root=fileURLToPath(new URL('..',import.meta.url));
const read=p=>readFileSync(join(root,p),'utf8');

test('V98: painel competitivo identifica relés duplicados e facções inválidas sem modificar pontos',()=>{
 const relays=[{map_id:'b41',node_id:'A'},{map_id:'b41',node_id:'A'}];
 const rows={relays,warNodes:[{owner:'moon'}],campaigns:[],counts:{arena_battles:4}};
 const before=JSON.stringify(rows);const r=summarizeCompetitiveV98(rows);
 assert.equal(r.readOnly,true);assert.equal(r.passed,false);assert.ok(r.alerts.some(x=>x.code==='RELAY_DUPLICATE'));
 assert.ok(r.alerts.some(x=>x.code==='RELAY_FACTION'));
 assert.equal(JSON.stringify(rows),before);assert.equal(r.summary.arenaBattles,4);
});
test('V98: sobreposição de campanhas é sinalizada; nenhuma alteração ou pagamento é feito',()=>{
 const now=Date.now(),camp=[0,1].map(i=>({id:i,enabled:true,starts_at:new Date(now-3600000).toISOString(),ends_at:new Date(now+3600000).toISOString()}));
 const r=summarizeCompetitiveV98({campaigns:camp,relays:[{map_id:'b41',node_id:'A'}],warNodes:[{owner:'earth'}]});
 assert.ok(r.alerts.some(a=>a.code==='WAR_OVERLAP'));assert.equal(r.summary.activeCampaigns,2);
});
test('V98: protege com autenticação e ADM; consulta de tabelas é somente leitura',()=>{
 const code=read('server/competitive-readiness-v98.js');
 assert.match(code,/is_game_admin_v1763/);assert.match(code,/\/api\/admin\/v98\/competitive-audit/);
 assert.match(code,/requireUser,asyncRoute/);assert.doesNotMatch(code,/\.update\(|\.insert\(|\.delete\(|\.rpc\(['"]stellar_claim/);
});
test('V99: hash estável independentemente da ordem de campos',()=>{
 assert.equal(digestLiveopsV99({npcs:[{a:1,b:2}],gates:[{config:{x:1,y:2}}]}),digestLiveopsV99({gates:[{config:{y:2,x:1}}],npcs:[{b:2,a:1}]}));
 assert.equal(compareLiveopsV99({sections:{npcs:[{hp:1}]}},{sections:{npcs:[{hp:2}]}}).join(','),'npcs');
});
test('V99: snapshot ADM cobre NPCs, mapas, missões, astral, relés e guerras',()=>{
 for(const name of ['npcs','maps','missions','gates','astralRewards','warRules','relayRules'])assert.ok(LIVEOPS_TABLES_V99[name]);
 const server=read('server/liveops-snapshot-v99.js');assert.match(server,/is_game_admin_v1763/);assert.match(server,/Cache-Control/);
});
test('V99: nenhuma operação de mudança de LiveOps ocorre pelo endpoint',()=>{
 const code=read('server/liveops-snapshot-v99.js');assert.doesNotMatch(code,/\.from\([^)]*\)\.(?:update|insert|upsert|delete)\(/);
});
test('V100: preflight distingue verificação estrutural de teste no aparelho',()=>{
 const good=releaseReadinessV100({version:'47.7.58',databaseReady:true,checks:[{name:'game.js',ok:true}]});
 assert.equal(good.pass,true);assert.ok(good.manualAcceptanceRequired.some(x=>x.includes('Autopilot Astral')));
 const bad=releaseReadinessV100({version:'47.7.58',databaseReady:false,checks:[{name:'game.js',ok:false}]});
 assert.equal(bad.pass,false);assert.equal(bad.failures.length,2);
});
test('V100: APK mantém recursos internos e não depende de imagem remota',()=>{
 for(const file of CORE_APK_ASSETS_V100)assert.ok(existsSync(join(root,file)),file);
 const java=read('android/app/src/main/java/com/stellarlegacy/mobile/MainActivity.java');
 assert.match(java,/WebViewAssetLoader/);
 const ui=read('public/index.html');assert.match(ui,/id="v98CompetitiveAuditBtn"/);assert.match(ui,/id="v99SnapshotBtn"/);assert.match(ui,/id="v100ReadinessBtn"/);
 assert.match(ui,/stellar-admin-c-v100\.js\?v=47\.7\.58/);
});
test('V98–V100: rotas administrativas integradas, sem SQL novo',()=>{
 const code=read('server/index.js');
 for(const name of ['installCompetitiveReadinessV98','installLiveopsSnapshotV99','installReleaseReadinessV100'])assert.match(code,new RegExp(name+'\\(app'));
 assert.match(code,/const RELEASE_VERSION = '47\.7\.58'/);
 const pkg=JSON.parse(read('package.json'));assert.equal(pkg.version,'47.7.58');assert.equal(pkg.scripts['preflight:v100'],'node scripts/v100-release-readiness.mjs');
});
