import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const TAG='STELLAR_NETWORK_RECOVERY_V4831';

test('WebSocket stale watchdog keeps map join and implements safe reconnect',()=>{
  const s=read('public/world.js');
  assert.ok(s.includes(TAG));
  assert.match(s,/stale\(\)/);
  assert.match(s,/lastRxAt/);
  assert.match(s,/this\.pendingJoin\)this\.join/);
  assert.match(s,/failedAuthToken/);
  assert.match(s,/clearPulse\(\)/);
  assert.match(s,/visibilitychange/);
  assert.match(s,/this\.manual=false;this\.connect\(\)/);
});

test('HTTP requests are deadline-bounded and transient errors preserve identity',()=>{
  const s=read('public/api.js');
  assert.ok(s.includes(TAG));
  assert.match(s,/boundedFetchV4831/);
  assert.match(s,/NETWORK_TIMEOUT/);
  assert.match(s,/controller\.abort\(\)/);
  assert.match(s,/verifiedAuthDenialV4831\(err\)\)signOutLocal\(\)/);
  assert.match(s,/configPromise=null/);
});

test('Autopilot waits on loss of connectivity instead of corrupting economic actions',()=>{
  const s=read('public/modules/stellar-autopilot-v48.js');
  assert.ok(s.includes(TAG));
  assert.match(s,/Tempo limite na consulta ao Autopilot/);
  assert.match(s,/Sem sincronização do setor • aguardando servidor/);
  assert.match(s,/Reconectando com segurança • sem ações de economia/);
  assert.match(s,/ts-saved\.storedAt>600000/);
  assert.match(s,/Compra sem confirmação • confira estoque/);
  assert.match(s,/Venda sem confirmação • confira o porão/);
});

test('session checks are single-flight at reduced cadence and resume on foreground',()=>{
  const s=read('public/game.js');
  assert.ok(s.includes(TAG));
  assert.match(s,/sessionCheckInFlightV4831/);
  assert.match(s,/setInterval\(\(\)=>\{void safeSessionCheckV4831\(\);\},20000\)/);
  assert.match(s,/sharedUniverse\.recover\(\)/);
  assert.doesNotMatch(s,/checkGameSession\(\)\.catch\(\(\)=>\{\}\);\s*\},3000/);
});

// Integration simulation: a WebSocket may remain OPEN without ever replying to ping.
test('websocket watchdog forces a new connection and re-joins the same map',async()=>{
  const oldLocation=globalThis.location;
  const oldSocket=globalThis.WebSocket;
  const instances=[];
  class MockSocket {
    static OPEN=1;static CONNECTING=0;static CLOSED=3;
    constructor(url){this.url=url;this.readyState=0;this.sent=[];instances.push(this);}
    send(data){this.sent.push(JSON.parse(data));}
    close(){this.readyState=3;this.onclose?.();}
    open(){this.readyState=1;this.onopen?.();}
    message(msg){this.onmessage?.({data:JSON.stringify(msg)});}
  }
  globalThis.location={protocol:'https:',host:'stellar.test'};
  globalThis.WebSocket=MockSocket;
  const {SharedUniverseClient}=await import(new URL('../public/world.js',import.meta.url));
  const credentials={accessToken:'token-abc',gameSessionId:'session-abc'};
  const states=[];
  const c=new SharedUniverseClient({getCredentials:()=>credentials,onMessage:()=>{},onStatus:s=>states.push(s.state)});
  try{
    c.join({mapId:'x2',territoryFaction:'terra'});
    assert.equal(instances.length,1);
    instances[0].open();instances[0].message({type:'auth_ok'});
    assert.ok(instances[0].sent.some(x=>x.type==='join_map'&&x.mapId==='x2'));
    instances[0].message({type:'world_snapshot'});
    c.lastRxAt=Date.now()-30000;
    c.recover();
    await new Promise(resolve=>setTimeout(resolve,25));
    assert.equal(instances.length,2);
    instances[1].open();instances[1].message({type:'auth_ok'});
    assert.ok(instances[1].sent.some(x=>x.type==='join_map'&&x.mapId==='x2'));
    assert.equal(c.isOnline(),true);
    assert.ok(states.includes('reconnecting'));
  }finally{c.close();globalThis.location=oldLocation;globalThis.WebSocket=oldSocket;}
});

test('login denial does not create uncontrolled reconnects, but a new token can connect',async()=>{
  const oldLocation=globalThis.location,oldSocket=globalThis.WebSocket;
  let created=0;
  class MockSocket {
    static OPEN=1;static CONNECTING=0;
    constructor(){this.readyState=0;created++;MockSocket.last=this;}
    send(){}
    close(){this.readyState=3;this.onclose?.();}
    open(){this.readyState=1;this.onopen?.();}
    message(m){this.onmessage?.({data:JSON.stringify(m)});}
  }
  globalThis.location={protocol:'https:',host:'stellar.test'};globalThis.WebSocket=MockSocket;
  const {SharedUniverseClient}=await import(new URL('../public/world.js',import.meta.url));
  const credentials={accessToken:'bad-token',gameSessionId:'session'};
  const c=new SharedUniverseClient({getCredentials:()=>credentials,onStatus:()=>{}});
  try{
    c.join({mapId:'x1'});MockSocket.last.open();MockSocket.last.message({type:'auth_error'});
    assert.equal(created,1);
    c.recover();await new Promise(resolve=>setTimeout(resolve,15));
    assert.equal(created,1);
    credentials.accessToken='new-token';c.recover();
    assert.equal(created,2);
  }finally{c.close();globalThis.location=oldLocation;globalThis.WebSocket=oldSocket;}
});
