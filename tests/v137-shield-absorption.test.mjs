import test from 'node:test';
import assert from 'node:assert/strict';
import {shieldAbsorptionV137,splitShieldDamageV137} from '../public/modules/shield-combat-v137.js';

test('10.000 de dano com 80% absorve 8.000 escudo e 2.000 HP',()=>{
 const r=splitShieldDamageV137({damage:10000,shield:15000,hp:20000,absorption:80});
 assert.deepEqual(r,{shield:7000,hp:18000,shieldDamage:8000,hpDamage:2000,actualDamage:10000});
});
test('escudo insuficiente: dano que nao foi absorvido chega ao HP',()=>{
 const r=splitShieldDamageV137({damage:10000,shield:3000,hp:20000,absorption:80});
 assert.equal(r.shieldDamage,3000);assert.equal(r.hpDamage,7000);assert.equal(r.shield,0);
});
test('escudo zerado: dano integral no HP',()=>{
 const r=splitShieldDamageV137({damage:10000,shield:0,hp:20000,absorption:80});
 assert.equal(r.hpDamage,10000);assert.equal(r.shieldDamage,0);
});
test('somente dano efetivamente recebido e contabilizado e nao gera HP negativo',()=>{
 const r=splitShieldDamageV137({damage:10000,shield:0,hp:1200,absorption:80});
 assert.equal(r.actualDamage,1200);assert.equal(r.hp,0);
});
test('absorcao ponderada: gerador 5k 50% e 10k 80% = 70%',()=>{
 const r=shieldAbsorptionV137([{capacity:5000,absorption:50},{capacity:10000,absorption:80}],0);
 assert.equal(r,70);
});
test('AUX entra na media, especializacao soma pontos percentuais, limite 95%',()=>{
 assert.equal(shieldAbsorptionV137([{capacity:5000,absorption:50},{capacity:5000,absorption:80}],10),75);
 assert.equal(shieldAbsorptionV137([{capacity:10000,absorption:90}],20),95);
 assert.equal(shieldAbsorptionV137([],12),0);
});
