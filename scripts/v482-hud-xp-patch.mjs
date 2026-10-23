#!/usr/bin/env node
// V48.2 idempotent integration: XP curve, safe per-profile conversion and target-style HUD.
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
function required(p){const f=path.join(root,p);if(!fs.existsSync(f))throw Error(`V48.2 arquivo ausente: ${p}`);return f;}
const gameFile=required('public/game.js'),htmlFile=required('public/index.html');
required('public/level-curve-v482.js');required('public/modules/pilot-ship-hud-v482.js');required('public/modules/pilot-ship-hud-v482.css');
let game=fs.readFileSync(gameFile,'utf8'),html=fs.readFileSync(htmlFile,'utf8'),changed=0;
// The pinned release verifier requires every game.js import to use package.json version.
// Heal any V48.2 attempt that was applied locally before a previous workflow failed.
const release=JSON.parse(fs.readFileSync(required('package.json'),'utf8')).version;
const oldCurveImport="import { xpThresholdV482, migratePilotXpV482 } from './level-curve-v482.js?v=48.2.0';";
const correctCurveImport=`import { xpThresholdV482, migratePilotXpV482 } from './level-curve-v482.js?v=${release}';`;
if(game.includes(oldCurveImport)){
  game=game.replace(oldCurveImport,correctCurveImport);changed++;
}
function edit(oldPart,newPart,label){
  if(game.includes(newPart))return;
  const count=game.split(oldPart).length-1;
  if(count!==1)throw Error(`V48.2 ${label}: anchor esperado 1, encontrado ${count}`);
  game=game.replace(oldPart,newPart);changed++;
}
edit(
 "import { xpThresholdV460, migratePilotXpV460 } from './level-curve-v460.js?v=47.7.6';",
 `import { xpThresholdV460, migratePilotXpV460 } from './level-curve-v460.js?v=${release}';\n${correctCurveImport}`,
 'import curva nova');
edit('function levelXpThreshold(level){return xpThresholdV460(level);}',
     'function levelXpThreshold(level){return xpThresholdV482(level);}',
     'utilizar tabela híbrida');
edit('function migratePlayerXpCurveV460(){if(migratePilotXpV460(progress?.profile,PLAYER_MAX_LEVEL))cloudDirty=true;}',
     'function migratePlayerXpCurveV460(){if(migratePilotXpV460(progress?.profile,PLAYER_MAX_LEVEL))cloudDirty=true;}\nfunction migratePlayerXpCurveV482(){if(migratePilotXpV482(progress?.profile,PLAYER_MAX_LEVEL))cloudDirty=true;}',
     'conversão sem reset');
edit('  migratePlayerXpCurveV1915();\n  migratePlayerXpCurveV460();\n  progress.profile.level=levelFromXp(progress.profile.xp,PLAYER_MAX_LEVEL);',
     '  migratePlayerXpCurveV1915();\n  migratePlayerXpCurveV460();\n  migratePlayerXpCurveV482();\n  progress.profile.level=levelFromXp(progress.profile.xp,PLAYER_MAX_LEVEL);',
     'migrar antes de computar nível');
if(changed)fs.writeFileSync(gameFile,game,'utf8');
let markupChanges=0;
const newCss='<link rel="stylesheet" href="/modules/pilot-ship-hud-v482.css?v=48.2.0">';
const newScript='<script type="module" src="/modules/pilot-ship-hud-v482.js?v=48.2.0"></script>';
if(!html.includes('/modules/pilot-ship-hud-v482.css')){
  if(!html.includes('</head>'))throw Error('V48.2 </head> ausente');
  html=html.replace('</head>',`  ${newCss}\n</head>`);markupChanges++;
}
if(!html.includes('/modules/pilot-ship-hud-v482.js')){
  if(!html.includes('</body>'))throw Error('V48.2 </body> ausente');
  html=html.replace('</body>',`  ${newScript}\n</body>`);markupChanges++;
}
// V48.2.3: nova query somente nos dois assets visuais para vencer cache de navegadores mobile.
for(const asset of ['pilot-ship-hud-v482.css','pilot-ship-hud-v482.js']){
  const older=`/modules/${asset}?v=48.2.0`,newer=`/modules/${asset}?v=48.2.3`;
  if(html.includes(older)){html=html.replaceAll(older,newer);markupChanges++;}
}
if(markupChanges)fs.writeFileSync(htmlFile,html,'utf8');
// Upgrade unlock-announcement labels to match the already-configured mission categories.
const progressionFile=required('public/modules/galactic-balance-v460.js');
let milestones=fs.readFileSync(progressionFile,'utf8');let milestoneChanges=0;
const changes=[
 ["3:['MAPA X-2']","3:['MAPA X-2','MISSÕES DIÁRIAS']"],
 ["5:['MAPA X-3','MISSÕES DIÁRIAS']","5:['MAPA X-3','MISSÕES SEMANAIS']"],
 ["7:['MAPA X-4','MISSÕES SEMANAIS']","7:['MAPA X-4','MISSÕES MENSAIS']"],
 ["10:['MISSÕES MENSAIS']","10:['MISSÕES ESPECIAIS','CENTRAL UNIVERSO']"],
 ["12:['MAPA X-6','MISSÕES ESPECIAIS']","12:['MAPA X-6']"]
];
for(const [oldPart,newPart] of changes){
 if(milestones.includes(newPart))continue;
 const n=milestones.split(oldPart).length-1;
 if(n!==1)throw Error(`V48.2 marco de progressão ausente: ${oldPart}`);
 milestones=milestones.replace(oldPart,newPart);milestoneChanges++;
}
if(milestoneChanges)fs.writeFileSync(progressionFile,milestones,'utf8');
console.log(`✅ V48.2 instalada: curva=${changed}, HUD=${markupChanges}, marcos=${milestoneChanges}`);
