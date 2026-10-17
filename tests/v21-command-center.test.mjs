import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {deriveEliteOperations,ELITE_OBJECTIVES_V21} from '../public/modules/v21/operations.js';
import {deriveWarBriefing} from '../public/modules/v21/war-briefing.js';
import {deriveSeasonBriefing} from '../public/modules/v21/season-briefing.js';
import {renderV21CommandCenter,escapeV21,V21_TABS} from '../public/modules/v21/command-center-view.js';
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const SNAP={callsign:'Piloto & <V21>',metrics:{level:25,aliensKilled:1000,missions:50,mapJumps:100,ggCompleted:3,boxes:250},war:{faction:'mars',map:'x4',worldReady:true,warfront:{scores:{mars:2,earth:1,jupiter:0},nodes:[{id:'A',label:'Relay A',owner:'mars',progress:100}]},boss:{name:'Boss',hp:125,max_hp:500},clan:{name:'Guardiões'}},season:{season:{name:'Temporada 1',season_key:'21-01'},tier:15,tierCount:30,points:3000,achievements:6,totalAchievements:11,active:true}};
test('V21 elite: zero progresso e todos os treze objetivos a 100%',()=>{
 assert.equal(deriveEliteOperations().done,0);assert.equal(ELITE_OBJECTIVES_V21.length,13);
 const report=deriveEliteOperations({level:125,aliensKilled:10000,missions:250,mapJumps:500,ggCompleted:25,boxes:1000});assert.equal(report.done,13);assert.equal(report.percent,100);assert.equal(report.status,'LENDÁRIO');
});
test('V21 elite: scores negativos, inválidos e enormes são tratados com segurança',()=>{
 let result=deriveEliteOperations({level:-1,aliensKilled:'não-numérico',missions:Infinity,mapJumps:NaN});
 assert.equal(result.done,0);assert.equal(result.items[0].value,0);
 result=deriveEliteOperations({level:100000,missions:90});assert.equal(result.items[0].pct,100);assert.equal(result.items.find(x=>x.id==='operative').complete,true);
});
test('V21 frente de guerra: controle territorial e boss reais, sem gerar loot',()=>{
 const r=deriveWarBriefing(SNAP.war);
 assert.equal(r.faction,'MARTE');assert.equal(r.controls[1].score,2);assert.equal(r.boss.pct,25);
 assert.equal(r.nodes[0].owner,'MARTE');assert.equal(r.clanName,'Guardiões');
 assert.equal('rewards' in r,false);assert.equal('credits' in r,false);
});
test('V21 frente de guerra: dados ausentes são tolerados',()=>{
 const r=deriveWarBriefing();assert.equal(r.worldReady,false);assert.equal(r.nodes.length,0);
 assert.equal(r.boss,null);assert.equal(r.clanWarActive,false);
});
test('V21 temporadas: métricas limitadas e sem prêmio inventado',()=>{
 let r=deriveSeasonBriefing(SNAP.season);assert.equal(r.tierPercent,50);assert.equal(r.prestigeTitle,'VETERANO');
 assert.equal(r.achievementPercent,55);
 r=deriveSeasonBriefing({tier:999,tierCount:30,achievements:999,totalAchievements:11});
 assert.equal(r.tier,30);assert.equal(r.achievements,11);assert.equal(r.prestigeTitle,'LENDA ESTELAR');
});
test('V21 UI mostra três seções sem interpolar HTML de jogadores/servidor',()=>{
 for(const tab of V21_TABS){const html=renderV21CommandCenter({...SNAP,callsign:'<img src=x onerror=alert(1) />',war:{...SNAP.war,boss:{name:'<script>bad</script>',hp:1,max_hp:2},warfront:{...SNAP.war.warfront,nodes:[{label:'<img src=x>',owner:'earth'}]}}},tab);
  assert.match(html,/&lt;img src=x/);assert.doesNotMatch(html,/<script>bad<\/script>/);assert.doesNotMatch(html,/<img src=x/);assert.match(html,/v21-command-content/);
 }
 assert.equal(escapeV21('A&B"<\'>'), 'A&amp;B&quot;&lt;&#39;&gt;');
});
test('V21 UI: botões de navegação têm destinos explicitamente permitidos',()=>{
 const game=file('public/game.js'),html=file('public/index.html');
 for(const id of ['commandCenterModal','commandCenterBtn','commandCenterContent','closeCommandCenter','installStellarApp'])assert.ok(html.includes(`id="${id}"`));
 for(const a of ['missions','pilot','warfront','clan','events','pass'])assert.match(game,new RegExp(a+':\\(\\)=>open'));
 assert.match(game,/closeNavigationModals\(COMMAND_MODAL_V21\)/);
 assert.match(game,/COMMAND_MODAL_V21,ui.saleConfirmModal/);
});
test('V21 PWA: apenas ícones e tela offline em cache; API e saves online não são interceptados',()=>{
 const sw=file('public/sw.js');const manifest=JSON.parse(file('public/manifest.webmanifest'));
 assert.equal(manifest.display,'standalone');assert.equal(manifest.start_url,'/');
 assert.match(sw,/req.mode!=='navigate'/);assert.match(sw,/fetch\(req\)\.catch/);
 assert.doesNotMatch(sw,/\/api\/|auth\/v1/);
 for(const icon of manifest.icons)assert.ok(existsSync(new URL('../public'+icon.src,import.meta.url)));
});
test('V21 versão alinhada em HTML, servidor e imports',()=>{
 const pkg=JSON.parse(file('package.json'));const html=file('public/index.html'),server=file('server/index.js'),game=file('public/game.js');
 assert.match(pkg.version,/^21\.\d+\.\d+$/);assert.ok(html.includes(`manifest.webmanifest?v=${pkg.version}`));
 assert.ok(server.includes(`const RELEASE_VERSION = '${pkg.version}'`));
 assert.ok(game.includes(`'./modules/v21/command-center-view.js?v=${pkg.version}'`));
});
