#!/usr/bin/env node
// Stellar Legacy V48.1.1 — acesso tutorial/missões/passe, sem salvar jogadores.
import fs from 'node:fs';
import path from 'node:path';
const file=path.join(process.cwd(),'public','game.js');
if(!fs.existsSync(file))throw Error('V48.1.1: public/game.js ausente');
let s=fs.readFileSync(file,'utf8'), changed=0;
function patch(oldPart,newPart,label){
  if(s.includes(newPart))return;
  const n=s.split(oldPart).length-1;
  if(n!==1)throw Error(`V48.1.1 ${label}: esperado 1 anchor, obtido ${n}`);
  s=s.replace(oldPart,newPart);changed++;
}
patch(
 'const PROGRESSION_UNLOCKS={missions:5,pilot:6,clan:8};',
 'const PROGRESSION_UNLOCKS={missions:1,pilot:6,clan:8};',
 'Missões acessíveis desde o LV1');
patch(
 'let MISSION_CATEGORY_LEVELS={daily:5,weekly:7,monthly:10,special:12};',
 'let MISSION_CATEGORY_LEVELS={daily:3,weekly:5,monthly:7,special:10};',
 'fallback categorias 3/5/7/10');
patch(
 'function runtimeModuleMinLevel(key,fallback=1){const row=runtimeModule(key);return Math.max(1,Number(row?.min_level)||Number(fallback)||1);}',
 "function runtimeModuleMinLevel(key,fallback=1){if(['missions_menu','missions','pass'].includes(key))return 1;const row=runtimeModule(key);return Math.max(1,Number(row?.min_level)||Number(fallback)||1);}",
 'Central Missões/Passe sempre visível mesmo com cache SQL antigo');
patch(
 "function battlePassEvent(kind,amount=1){\n  if(!progress||amount<=0||!battlePassSeasonActive())return;",
 "function battlePassEvent(kind,amount=1){\n  // V48.1.1: exibir o Passe no LV1, mas contar objetivos e pontos somente no LV2+.\n  if(!progress||(Number(progress.profile?.level)||1)<2||amount<=0||!battlePassSeasonActive())return;",
 'Passe gera pontos a partir do LV2');
patch(
 "{id:'reach_level_5',label:'Piloto Operacional',desc:'Alcance o nível 5 e libere o Controle de Missões.'",
 "{id:'reach_level_5',label:'Piloto Operacional',desc:'Alcance o nível 5 e desbloqueie as missões semanais.'",
 'Tutorial coerente com missões liberadas no início');
patch(
 "const missionHeadline=/\\b\\d+\\s+missões diárias\\b/i.test(seasonDescription)?'Missões diárias adaptadas ao seu nível.':seasonDescription||'Complete missões diárias para evoluir seu Passe.';",
 "const missionHeadline=(Number(progress.profile?.level)||1)<2?'Acompanhe suas recompensas desde já: objetivos e pontos do Passe começam no nível 2.':(/\\b\\d+\\s+missões diárias\\b/i.test(seasonDescription)?'Missões diárias adaptadas ao seu nível.':seasonDescription||'Complete missões diárias para evoluir seu Passe.');",
 'Aviso LV2 no Passe');
if(changed)fs.writeFileSync(file,s,'utf8');
console.log(`✅ V48.1.1 progressão inicial: ${changed?`${changed} alterações`:'já aplicada'}`);
