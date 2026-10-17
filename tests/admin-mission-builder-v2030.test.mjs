import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createAdminMissionPreset,duplicateAdminMission,validateAdminMissionDraft,previewAdminMission,ADMIN_MISSION_PRESETS} from '../public/modules/admin-mission-builder.js';
const ids={npcIds:['streuner','lordakia'],oreIds:['Prometium','Endurium']};
test('três modelos com categorias e objetivos compatíveis com o servidor',()=>{
 assert.deepEqual(ADMIN_MISSION_PRESETS.map(x=>x.id),['patrol','mining','mixed']);
 for(const preset of ADMIN_MISSION_PRESETS){
  const d=createAdminMissionPreset(preset.id,ids);assert.equal(d.mission_id,'');assert.equal(d.enabled,false);assert.ok(d.tasks.length>=1);
  assert.deepEqual(validateAdminMissionDraft({...d,mission_id:`teste_${preset.id}`},ids),[]);
 }
});
test('duplicação não reusa ID, nunca publica automaticamente e não altera original',()=>{
 const original={mission_id:'ativa',title:'Conquista',description:'Desc',category:'special',tasks:[{id:'obj_99',type:'kill',npc:'lordakia',target:55}],enabled:true,reward_factor:3,flat_reward:{credits:500,uridium:3,xp:200}};
 const copy=duplicateAdminMission(original);assert.equal(copy.mission_id,'');assert.equal(copy.enabled,false);assert.equal(copy.tasks[0].id,'task_1');assert.equal(copy.tasks[0].target,55);
 copy.tasks[0].target=9;assert.equal(original.tasks[0].target,55);assert.equal(original.mission_id,'ativa');
 assert.deepEqual(validateAdminMissionDraft({...copy,mission_id:'copia_valida'},ids),[]);
});
test('validação rejeita valores ilegais e objetivos desconhecidos',()=>{
 const valid={...createAdminMissionPreset('patrol',ids),mission_id:'missao1'};
 assert.deepEqual(validateAdminMissionDraft(valid,ids),[]);
 assert.ok(validateAdminMissionDraft({...valid,mission_id:'../ruim'},ids).length);
 assert.ok(validateAdminMissionDraft({...valid,category:'bad'},ids).length);
 assert.ok(validateAdminMissionDraft({...valid,reward_factor:11},ids).length);
 assert.ok(validateAdminMissionDraft({...valid,flat_reward:{credits:-1,uridium:0,xp:0}},ids).length);
 assert.ok(validateAdminMissionDraft({...valid,tasks:[{type:'kill',npc:'nao_existe',target:12}]},ids).length);
 assert.ok(validateAdminMissionDraft({...valid,tasks:[]},ids).length);
 assert.ok(validateAdminMissionDraft({...valid,tasks:Array.from({length:9},()=>valid.tasks[0])},ids).length);
});
test('prévia diferencia objetivos e mostra prêmios sem executar API',()=>{
 const d={...createAdminMissionPreset('mixed',ids),mission_id:'novo',enabled:true,flat_reward:{credits:1200,uridium:2,xp:10}};
 const p=previewAdminMission(d,{npcNames:{streuner:'Streuner'},oreNames:{Prometium:'Prometium'}});
 assert.equal(p.objectives.length,2);assert.match(p.objectives[0],/Streuner/);assert.match(p.objectives[1],/Prometium/);assert.match(p.rewards,/1200 CR/);
});
test('botões do ADM estão ligados à prévia e a duplicação sem modificação de backend',()=>{
 const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
 for(const piece of ['data-new-mission-preset','data-new-mission-duplicate','admUpdateMissionPreview','validateAdminMissionDraft'])assert.ok(game.includes(piece),piece);
});

test('não sobrescreve missão existente ao duplicar ou aplicar preset',()=>{
 const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
 assert.ok(game.includes('existing&&adminContentDraft.editingId!==d.mission_id'));
 assert.ok(game.includes('adminContentDraft.editingId=null'));
 assert.ok(game.includes('adminContentDraft.editingId=row.mission_id'));
 assert.ok(game.includes("d.enabled?'ATIVA':'INATIVA'"));
});
