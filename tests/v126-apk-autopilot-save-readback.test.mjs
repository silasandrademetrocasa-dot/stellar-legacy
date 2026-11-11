import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createStellarAutopilotV48,cleanAutopilotConfig} from '../public/modules/stellar-autopilot-v48.js';

const file=p=>readFileSync(resolve(import.meta.dirname,'..',p),'utf8');
const game=file('public/game.js');
const ap=file('public/modules/stellar-autopilot-v48.js');
const html=file('public/index.html');

test('V126: APK usa URL nova da ponte do Autopilot, sem assets de render alterados',()=>{
  assert.match(game,/stellar-autopilot-v126\.js\?v=47\.7\.71/);
  assert.match(file('public/modules/stellar-autopilot-v126.js'),/stellar-autopilot-v48\.js\?v=126\.0/);
  assert.match(html,/v126-ap-hangar/);
  assert.match(file('public/sw.js'),/stellar-shell-v136-visuals/);
});
test('V126: Autopilot limita restauração sem rodar trabalho a cada frame',()=>{
  assert.match(ap,/if\(ts-lastTickAt<tickCadenceMs\)return;lastTickAt=ts;/);
  assert.match(ap,/if\(!running\)\{if\(allowed&&accessReady\(\)\)restoreCheckpoint\(\);return;/);
  assert.match(game,/AUX_WORK_V2027\.due\('autopilotV126',250\)/);
  assert.match(game,/tickIntervalMs:DEVICE_CAPS\.mobile\?650:380/);
  assert.equal(cleanAutopilotConfig({autoSell:false}).autoSell,false);
});
test('V126: readback do servidor só confirma montagem igual a tentativa enviada',()=>{
  assert.match(game,/const persisted=await loadCloudSave\(\);/);
  assert.match(game,/equipmentLayoutSignatureV1062\(persisted\.state\)===submittedHangarLayoutV126/);
  assert.match(game,/equipmentSavedV109\(snapshot\); \/\/ só limpa a intenção ainda atual/);
  assert.match(game,/!\['SAVE_OWNER_MISMATCH','SAVE_RESET_STALE'\]\.includes\(e\?\.code\)/);
});
test('V126: coleta e venda permanecem autoritativas, sem crédito local prévio',()=>{
  assert.match(game,/runEconomyAction\('sell_cargo'/);
  assert.match(game,/sharedUniverse\.collectOre\(o\.id\)/);
  assert.match(game,/receipt\.granted===true/);
  assert.match(game,/const capacity=progress\?cargoCapacity\(\):1;/);
  assert.match(game,/ammoQuote:ammoOffer\?\.currency===/);
});
