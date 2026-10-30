import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createAmmoSelectionTrackerV1061} from '../public/modules/ammo-selection-recovery-v1061.js';
const tracker=()=>createAmmoSelectionTrackerV1061({laserIds:['lcb10','ucb100'],rocketIds:['r310','plt2026']});
test('V106.1: nova selecao prevalece sobre save antigo sem tocar saldo ou estoque',()=>{
  const t=tracker();t.mark('selectedLaserAmmo','ucb100');
  const remote={selectedLaserAmmo:'lcb10',selectedRocket:'r310',ammo:{ucb100:120},profile:{uridium:50},inventory:{lf4:2}};
  const merged=t.merge(remote);assert.equal(merged.selectedLaserAmmo,'ucb100');assert.equal(merged.selectedRocket,'r310');
  assert.strictEqual(merged.ammo,remote.ammo);assert.strictEqual(merged.profile,remote.profile);assert.strictEqual(merged.inventory,remote.inventory);
  assert.equal(remote.selectedLaserAmmo,'lcb10');assert.equal(t.pending,true);
});
test('V106.1: ACK de selecao antiga nao apaga a ultima escolha',()=>{
  const t=tracker();t.mark('selectedLaserAmmo','ucb100');
  const old={selectedLaserAmmo:'ucb100',selectedRocket:'r310'};
  t.mark('selectedLaserAmmo','lcb10');assert.equal(t.confirm(old),false);assert.equal(t.merge(old).selectedLaserAmmo,'lcb10');
  assert.equal(t.confirm({selectedLaserAmmo:'lcb10'}),true);assert.equal(t.pending,false);
});
test('V106.1: preferencia de laser e foguete independente, com ACK parcial',()=>{
  const t=tracker();t.mark('selectedRocket','plt2026');t.mark('selectedLaserAmmo','ucb100');
  t.confirm({selectedLaserAmmo:'ucb100',selectedRocket:'r310'});
  assert.deepEqual(t.desired,{selectedRocket:'plt2026'});
  assert.deepEqual(t.merge({selectedRocket:'r310',selectedLaserAmmo:'lcb10'}),{selectedRocket:'plt2026',selectedLaserAmmo:'lcb10'});
});
test('V106.1: nao aceita codigo inventado, remove preferencias em logout',()=>{
  const t=tracker();assert.equal(t.mark('selectedLaserAmmo','super999'),false);
  assert.equal(t.mark('profile.uridium','999999'),false);assert.equal(t.pending,false);
  t.mark('selectedRocket','plt2026');t.reset();assert.equal(t.pending,false);
});
test('V106.1: HUD, hotkeys, fallback e Autopilot usam o mesmo save prioritario',()=>{
  const s=fs.readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
  assert.match(s,/b\.onclick=\(\)=>changeAmmoSelectionV1061\('laser',a\.id\)/);
  assert.match(s,/b\.onclick=\(\)=>changeAmmoSelectionV1061\('rocket',r\.id\)/);
  assert.match(s,/changeAmmoSelectionV1061\('laser',Object\.keys\(LASER_AMMO\)/);
  assert.match(s,/changeAmmoSelectionV1061\('laser',next\)/);
  assert.match(s,/changeAmmoSelectionV1061\('rocket',next\)/);
  assert.match(s,/AMMO_SELECTION_V1061\.confirm\(snapshot\)/);
  assert.match(s,/progress=AMMO_SELECTION_V1061\.merge\(serverState\)/);
  assert.match(s,/AMMO_SELECTION_V1061\.pending\|\|cloudSaveMutationV105!==sentMutation/);
});
