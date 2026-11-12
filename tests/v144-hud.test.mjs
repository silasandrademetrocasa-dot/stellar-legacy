import test from 'node:test';import assert from 'node:assert/strict';import {parseHTML} from 'linkedom';
import {mountCombatHud} from '../public/modules/combat-hud-v144.js';
import {tacticsFor,DRONE_FORMATIONS} from '../public/modules/combat-tactics-v144.js';
test('compact HUD: exactly 18 assignable slots, independent CONF, no consumption, collapse and SKILL drawer',async()=>{
 const {document,window}=parseHTML('<html><body><section id="weaponBar"><div class="weapon-toolbar"></div><div id="weaponBarContent"><div class="ammo-clusters"></div><div id="abilityBar"><button>✦</button></div></div></section></body></html>');
 const before={document:globalThis.document,requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame};globalThis.document=document;globalThis.requestAnimationFrame=()=>0;globalThis.cancelAnimationFrame=()=>{};
 try{
 const state={drones:Array.from({length:8},(_,i)=>({id:'d'+i})),selectedLaserAmmo:'lcb10',selectedRocket:'r310',ammo:{lcb10:2000,mcb25:1000},rockets:{r310:33},combatConfigsV2013:{active:1}};state.combatHudV144=tacticsFor(state);
 const inventory=JSON.stringify([state.ammo,state.rockets]),assigned=[],selected=[];
 const root=document.getElementById('weaponBar');
 const hud=mountCombatHud({root,getState:()=>state,getConfirmedFormation:()=>state.combatHudV144.profiles[state.combatConfigsV2013.active].formation,getAsset:id=>'/icons/'+id+'.png',onSelect:async ref=>{selected.push(ref);state.selectedLaserAmmo=ref.id;},onAssign:async(conf,i,ref)=>{assigned.push([conf,i,ref]);state.combatHudV144.profiles[conf].slots[i]=ref;},onConfig:async conf=>{state.combatConfigsV2013.active=conf;}});
 assert.equal(root.querySelectorAll('.combat-slot').length,18);assert.equal(root.querySelectorAll('.combat-side').length,2);
 await root.querySelector('[data-slot="0"]').onclick();assert.equal(selected[0].kind,'laser');assert.equal(JSON.stringify([state.ammo,state.rockets]),inventory);
 root.querySelector('.combat-skill').onclick();assert.equal(root.querySelector('#abilityBar').hidden,false);root.querySelector('.combat-skill').onclick();assert.equal(root.querySelector('#abilityBar').hidden,true);
 root.querySelector('#weaponBarToggle').onclick();assert.equal(root.classList.contains('combat-collapsed'),true);assert.equal(root.querySelector('#weaponBarToggle').closest('#weaponBarContent'),null);assert.equal(root.querySelector('#weaponBarToggle').getAttribute('aria-label'),'Expandir atalhos');root.querySelector('#weaponBarToggle').onclick();assert.equal(root.classList.contains('combat-collapsed'),false);
 await root.querySelector('[data-conf="2"]').onclick();assert.equal(state.combatConfigsV2013.active,2);
 const create=document.createElement.bind(document);document.createElement=tag=>{const e=create(tag);if(tag==='dialog'){e.showModal=()=>{e.open=true;};e.close=()=>{e.open=false;};}return e;};
 hud.openEditor(17);const dialog=document.querySelector('dialog');assert.ok(dialog.open);
 const ammoButton=dialog.querySelector('.combat-choice');await ammoButton.onclick();assert.equal(assigned.at(-1)[0],2);assert.equal(assigned.at(-1)[1],17);assert.equal(state.combatHudV144.profiles[1].slots[17],null);assert.equal(JSON.stringify([state.ammo,state.rockets]),inventory);
 hud.openEditor(0);const formationTab=[...dialog.querySelectorAll('nav button')].find(b=>b.textContent==='Formações');formationTab.onclick();
 assert.equal(dialog.querySelectorAll('.combat-choice').length,9);assert.equal(dialog.querySelectorAll('[data-locked="true"]').length,8);assert.equal(Object.keys(DRONE_FORMATIONS).length,9);
 }finally{for(const [key,value] of Object.entries(before)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});
