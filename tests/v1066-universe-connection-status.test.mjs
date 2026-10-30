import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {universeConnectionStatusV1066 as status} from '../public/modules/universe-connection-status-v1066.js';
const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
test('V106.6: U-X entry rejected for level is not reported as unavailable server',()=>{
  for(const [map,level] of [['u1',20],['u2',21],['u3',22]]){
    const view=status({status:'map_error',mapId:map,reason:`Requer nível ${level}`});
    assert.equal(view.kind,'access_denied');
    assert.match(view.label,new RegExp('LV'+level));
    assert.match(view.title,/servidor est[aá] conectado/i);
  }
});
test('V106.6: network offline, session and generic admission failures remain distinct',()=>{
  assert.equal(status({status:'offline',mapId:'u1'}).label,'OFFLINE');
  assert.equal(status({status:'reconnecting',mapId:'u1'}).label,'RECONECTANDO');
  assert.equal(status({status:'auth_error',mapId:'u1'}).kind,'auth_error');
  assert.equal(status({status:'map_error',mapId:'u1',reason:'Setor indisponível: cadastro não sincronizado'}).kind,'map_error');
  assert.equal(status({status:'map_error',mapId:'b41',reason:'Requer nível 15'}).label,'MAPA • ERRO');
});
test('V106.6: successful WebSocket receives same ONLINE latency and no false PvP error',()=>{
  assert.equal(status({status:'online',mapId:'u1',latency:45.7}).label,'ONLINE 46ms');
  assert.match(game,/universeConnectionStatusV1066\(/);
  assert.match(game,/worldSyncLabel\.title=view\.title/);
  assert.doesNotMatch(game,/st==='map_error'\?'PvP • ERRO'/);
});
