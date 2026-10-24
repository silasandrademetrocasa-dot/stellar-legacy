import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';import {resolve,dirname} from 'node:path';import {fileURLToPath} from 'node:url';
import {captureCombatBuildV2013,freshBattleConfigsV2013,exchangeCombatBuildV2013,clampStoredShieldV2013} from '../public/combat-config-v2013.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),read=f=>readFileSync(resolve(root,f),'utf8');
const game=read('public/game.js'),css=read('public/modules/stellar-premium-ui-v56.css'),html=read('public/index.html');
const items={l:{type:'laser'},g:{type:'generator',subtype:'shield'},m:{type:'generator',subtype:'speed'},e:{type:'extra'}};
const ship={lasers:2,generators:2,extras:1};
const loadout={lasers:['l',null],generators:['m',null],extras:['e']};
const drones=[{id:'d1',type:'iris',slots:['l','g']}];
const pet={owned:true,lasers:['l'],shields:['g'],gearsOwned:{guard:true},activeGear:'guard'};
test('V56: configurações capturam NAVE + DRONES + AUX, não apenas nave',()=>{
 const data=freshBattleConfigsV2013(loadout,drones,600,pet);
 assert.deepEqual(data.profiles[1].droneSlots.d1,['l','g']);
 assert.deepEqual(data.profiles[1].petLoadout.lasers,['l']);
 assert.deepEqual(data.profiles[1].petLoadout.shields,['g']);
 assert.equal(data.profiles[1].petLoadout.activeGear,'guard');
 assert.equal(data.profiles[1].shield,600);
});
test('V56: troca equipamentos em conjunto, sem duplicar inventário',()=>{
 const before={l:3,g:2,m:1,e:1}; // inventory contains separately owned copies
 const target=captureCombatBuildV2013(loadout,drones,100,pet);
 const result=exchangeCombatBuildV2013({inventory:before,shipLoadout:loadout,drones,pet,target,ship,items});
 const sum=obj=>Object.values(obj).reduce((a,b)=>a+b,0);
 const inventoryTotal=sum(before)+Object.values(loadout).flat().filter(Boolean).length+drones[0].slots.filter(Boolean).length+pet.lasers.concat(pet.shields).filter(Boolean).length;
 const after=sum(result.inventory)+Object.values(result.shipLoadout).flat().filter(Boolean).length+result.drones.flatMap(d=>d.slots).filter(Boolean).length+result.petLoadout.lasers.concat(result.petLoadout.shields).filter(Boolean).length;
 assert.equal(after,inventoryTotal);
 assert.equal(result.petLoadout.activeGear,'guard');
 assert.equal(clampStoredShieldV2013(target.shield,90),90);
});
test('V56: presets antigos sem AUX não removem os equipamentos do drone',()=>{
 const old=captureCombatBuildV2013(loadout,drones,0);
 const result=exchangeCombatBuildV2013({inventory:{},shipLoadout:loadout,drones,pet,target:old,ship,items});
 assert.equal(result.petLoadout,null);assert.deepEqual(pet.lasers,['l']);assert.deepEqual(pet.shields,['g']);
});
test('V56: base V2212 restaurada no mapa sem base GLB antiga',()=>{
 assert.match(game,/const baseImagePath=GAME_ASSETS\.bases\?\.\[factionKey\]/);
 assert.doesNotMatch(game,/STELLAR_3D_V50\.drawAsset\(ctx,baseVisualId/);
 for(const faction of ['earth','mars','jupiter'])assert(existsSync(resolve(root,`public/assets/v2212/bases/${faction}.webp`)));
});
test('V56: Hangar unificado, sem atributos duplicados, mantém ações existentes',()=>{
 for(const token of ['v56EquipmentView','v56EquipTarget','CONF ','renderHangarDrones()','renderHangarPet()','renderHangarEquipment()','onBuy=()=>buyItem(id)','return {inventory:stock,shipLoadout:result,drones:resultDrones,petLoadout}']){
  assert(game.includes(token)||read('public/combat-config-v2013.js').includes(token),token);
 }
 assert(!/hangar-summary-strip';summary.innerHTML/.test(game));
 assert.match(css,/\.v56-unit-body/);assert.match(css,/@media\(max-width:600px\)/);
 assert.match(html,/stellar-premium-ui-v56\.css\?v=47\.7\.12/);
});
test('V56: 13 sprites renderizados dos GLBs e imagens na Loja e nave selecionada',()=>{
 const names=['aurora','bastion','bulwark','kensei','leviathan','lynx','meridian','pathfinder','phantom','pioneer','raptor','seraph','valkyrie'];
 for(const name of names){const data=readFileSync(resolve(root,`public/assets/v56/ships/${name}.webp`));assert.equal(data.subarray(0,4).toString(),'RIFF',name);}
 assert.match(game,/type==='ship'\?\(v56ShipPerspectiveArt/);
 assert.match(game,/v56EnsureShopLayout/);
});
