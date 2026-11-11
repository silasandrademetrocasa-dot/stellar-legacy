import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {WebSocket} from 'ws';
import {attachSharedUniverse} from '../server/world.js';
test('V138 live WebSocket authenticates collection and coalesces duplicate in-flight requests',async t=>{
 const server=http.createServer();let calls=0,release,received;
 const blocked=new Promise(r=>release=r);
 const world=attachSharedUniverse(server,{
  authenticate:async(token,session)=>{assert.equal(token,'qa138_token');return {user:{id:'qa138_user'},callsign:'QA138',faction:'earth',level:44,accessToken:token,gameSessionId:session};},
  natal:{active:()=>false,refresh:async()=>{}},
  collectDrop:async(uid,body,session,arrival)=>{calls++;received={uid,body,session,arrival};await blocked;return {ok:true,state:{},receipt:{kind:'loot'}};}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const ws=new WebSocket(`ws://127.0.0.1:${server.address().port}/ws`);
 t.after(async()=>{ws.terminate();await new Promise(r=>server.close(r));});
 const backlog=[],waiters=[];
 ws.on('message',raw=>{const m=JSON.parse(String(raw)),i=waiters.findIndex(p=>p.type===m.type);if(i<0)backlog.push(m);else{const [p]=waiters.splice(i,1);clearTimeout(p.timer);p.resolve(m);}});
 const packet=type=>{const i=backlog.findIndex(m=>m.type===type);if(i>=0)return Promise.resolve(backlog.splice(i,1)[0]);return new Promise((resolve,reject)=>{const p={type,resolve};p.timer=setTimeout(()=>reject(Error('No '+type)),4000);waiters.push(p);});};
 const send=data=>ws.send(JSON.stringify(data));
 await new Promise(r=>ws.once('open',r));send({type:'auth',accessToken:'qa138_token',gameSessionId:'qa138_session'});
 assert.equal((await packet('auth_ok')).features.collectionV138,true);
 send({type:'collect_drop',request_id:'qa138_no_map',drop_id:'loot_qa138_test'});
 assert.equal((await packet('collect_drop_result')).code,'COLLECTION_MAP_MISMATCH');assert.equal(calls,0);
 send({type:'join_map',mapId:'x1',faction:'earth',x:400,y:400,hp:100,maxHp:100});await packet('world_snapshot');
 const body={type:'collect_drop',request_id:'qa138_socket_request',drop_id:'loot_qa138_test',collector:'ship',user_id:'spoofed'};
 send(body);send(body);send(body);
 await new Promise(resolve=>{const poll=()=>calls?resolve():setTimeout(poll,5);poll();});
 // A pong after the three requests proves the duplicate frames were processed
 // while the collector is still blocked, independent of runner scheduling.
 send({type:'ping',ts:138});await packet('pong');
 world.findClient('qa138_user').player.x=3000;
 assert.equal(received.uid,'qa138_user');assert.equal(received.session,'qa138_session');assert.equal(received.arrival.player.x,400);assert.equal(received.body.user_id,undefined);
 release();const result=await packet('collect_drop_result');assert.equal(result.ok,true);assert.equal(calls,1);assert.equal(result.request_id,body.request_id);
});
