import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readBestLocalSnapshotV1211,localHangarAckEligibleV1211} from '../public/modules/local-first-bridge-v1211.js';
const text=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const OWNER='11111111-1111-4111-8111-111111111111';
function make(stamp,credits=90){return {accountOwnerId:OWNER,profile:{credits,level:1},clientSavedAt:stamp,adminResetEpoch:3};}
test('v121.1 compara IndexedDB e fallback sem confiar na ordem de chegada',async()=>{
 globalThis.location={search:'?localfirst=1'};
 const base=make(100,100),indexed=make(200,200);
 assert.deepEqual(await readBestLocalSnapshotV1211(OWNER,base,{readIndexed:async()=>indexed}),indexed);
 assert.deepEqual(await readBestLocalSnapshotV1211(OWNER,indexed,{readIndexed:async()=>base}),indexed);
});
test('v121.1 rejeita outro jogador, reset anterior e timestamps futuros',async()=>{
 globalThis.location={search:'?localfirst=1'};
 const fallback=make(100),other={...make(200),accountOwnerId:'22222222-2222-4222-8222-222222222222'};
 assert.deepEqual(await readBestLocalSnapshotV1211(OWNER,fallback,{readIndexed:async()=>other}),fallback);
 assert.deepEqual(await readBestLocalSnapshotV1211(OWNER,fallback,{resetEpoch:3,readIndexed:async()=>({...make(300),adminResetEpoch:2})}),fallback);
 assert.deepEqual(await readBestLocalSnapshotV1211(OWNER,fallback,{readIndexed:async()=>make(Date.now()+3600000)}),fallback);
});
test('v121.1 ACK local de hangar requer assinatura e timestamp do save confirmado',()=>{
 const entry={module:'hangar',action:'montagem_pendente',requiresServer:true,payload:{clientSavedAt:100,signature:'build-A'}};
 assert.equal(localHangarAckEligibleV1211(entry,100,'build-A'),true);
 assert.equal(localHangarAckEligibleV1211(entry,99,'build-A'),false);
 assert.equal(localHangarAckEligibleV1211(entry,100,'build-B'),false);
 assert.equal(localHangarAckEligibleV1211({...entry,requiresServer:false},100,'build-A'),false);
});
test('v121.1 nao muda economia por cache local no bootstrap',()=>{
 const game=text('public/game.js');
 assert.match(game,/const freshLocalV1211=remote\?\.state/);
 assert.match(game,/structuredClone\(remote.state\)/);
 assert.match(game,/reconcilePendingEquipmentV109\(remote.state,local,equipmentSaveBaselineV109,equipmentSubmittedV1342\)/);
 assert.match(game,/stageLocalFirstHangarIntentV1211/);
 assert.match(game,/acknowledgeConfirmedHangarV1211/);
 assert.match(game,/readBestLocalSnapshotV1211\(accountId,readLocalGameState\(\)\)/);
});
