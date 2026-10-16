import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {freshBattleConfigsV2013,captureCombatBuildV2013,exchangeCombatBuildV2013,combatConfigRemainingV2013,clampStoredShieldV2013} from '../public/combat-config-v2013.js';
const source=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const items={lf1:{type:'laser'},lf4:{type:'laser'},shield:{type:'generator',subtype:'shield'},motor:{type:'generator',subtype:'speed'},extra:{type:'extra'},expander:{type:'extra',slotBonus:3}};
const ship={lasers:2,generators:2,extras:1};
const drones=[{id:'a',type:'iris',slots:['lf4',null]},{id:'b',type:'iris',slots:['shield',null]}];
const build={lasers:['lf4','lf1'],generators:['shield','shield'],extras:['extra']};
test('duas configurações iniciam com o equipamento conhecido, sem conceder escudo extra',()=>{
 const c=freshBattleConfigsV2013(build,drones,205000);
 assert.equal(c.active,1);assert.equal(c.profiles[1].shield,205000);assert.equal(c.profiles[2].shield,0);
 assert.deepEqual(c.profiles[1].shipLoadout,build);
 assert.notStrictEqual(c.profiles[1].shipLoadout,c.profiles[2].shipLoadout);
});
test('o escudo original de 205 mil volta com 205 mil, nunca com 400 mil',()=>{
 const c=freshBattleConfigsV2013(build,drones,205000);
 c.profiles[2].shield=100000;
 assert.equal(clampStoredShieldV2013(c.profiles[1].shield,400000),205000);
 assert.equal(clampStoredShieldV2013(c.profiles[2].shield,100000),100000);
 assert.equal(clampStoredShieldV2013(c.profiles[1].shield,150000),150000);
 assert.equal(clampStoredShieldV2013(300000,100000),100000);
});
test('cooldown de 5 segundos contabiliza última troca',()=>{
 assert.equal(combatConfigRemainingV2013(100000,101000),4000);
 assert.equal(combatConfigRemainingV2013(100000,105000),0);
});
test('mesmos itens podem estar planejados nas duas CONF, mas inventário não duplica',()=>{
 const c=freshBattleConfigsV2013(build,drones,205000);
 let inventory={motor:2,lf1:1};
 // Existing equipment is materialized only once; switching returns all items first.
 const invBefore={...inventory};
 const beforeCount={};
 for(const id of [...Object.keys(invBefore),...Object.values(build).flat(),...drones.flatMap(d=>d.slots)].filter(Boolean))beforeCount[id]=(beforeCount[id]||0)+(invBefore[id]||0);
 const out=exchangeCombatBuildV2013({inventory,shipLoadout:build,drones,target:c.profiles[2],ship,items});
 assert.deepEqual(out.shipLoadout,build);
 assert.equal(out.inventory.motor,2);
 assert.equal(out.inventory.lf1,1);
 assert.deepEqual(out.drones.map(x=>x.slots),drones.map(x=>x.slots));
});
test('itens vendidos ou inexistentes não se materializam na próxima CONF',()=>{
 const low={lasers:['lf1',null],generators:[null,null],extras:[null]};
 const target=captureCombatBuildV2013({lasers:['lf4','lf4'],generators:['shield','motor'],extras:['extra']},[],300000);
 const out=exchangeCombatBuildV2013({inventory:{lf4:1,motor:1},shipLoadout:low,drones:[],target,ship,items});
 assert.deepEqual(out.shipLoadout.lasers,['lf4',null]);
 assert.deepEqual(out.shipLoadout.generators,[null,'motor']);
 assert.equal(out.inventory.lf1,1);
});
test('o cliente persiste escudos separados e utiliza o mesmo relógio global de dano',()=>{
 assert.match(source,/state\.lastPlayerDamageAt=nowSec\(\)/);
 assert.match(source,/saveActiveBattleConfigV2013\(\)/);
 assert.match(source,/player\.shield=clampStoredShieldV2013\(configs\.profiles\[target\]\.shield,player\.maxShield\)/);
 assert.match(source,/player\.hp=Math\.max\(0,Math\.min\(player\.maxHp,previousHp\)\)/);
 assert.match(source,/secondsWithoutDamage:nowSec\(\)-state\.lastPlayerDamageAt/);
 assert.doesNotMatch(source.match(/function switchBattleConfigV2013[\s\S]*?function emptyAllEquippedV2013/)?.[0]||'',/player\.laserFiring=false/);
 assert.match(source,/const configs=progress\.combatConfigsV2013;if\(configs\?\.profiles/);
 assert.match(source,/clampStoredShieldV2013\(savedAbsoluteShield,player\.maxShield\)/);
 assert.match(source,/const beforeHp=player\.hp,beforeShield=player\.shield;installServerStatePreservingPosition\(state\)/);
});
test('HUD e hangar possuem CONF 1, CONF 2 e ação de remover todos',()=>{
 assert.match(html,/id="battleConf1"/);assert.match(html,/id="battleConf2"/);
 assert.match(source,/renderBattleConfigHangarV2013/);
 assert.match(source,/REMOVER TODOS • NAVE \+ DRONES/);
 assert.match(source,/REMOVER TODOS • AUX-9/);
});
