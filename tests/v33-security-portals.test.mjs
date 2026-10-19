import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {PORTAL_NEUTRAL_RADIUS, portalGrantsNpcProtection, playerInNeutralPortalRange} from '../server/portal-safety.js';
import {socketMessageAllowed,boundedVital} from '../server/realtime-guard.js';
test('portal protection matches client radius and excludes PvP in all directions',()=>{
 const client=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
 assert.match(client,new RegExp('PORTAL_NEUTRAL_RADIUS = '+PORTAL_NEUTRAL_RADIUS));
 assert.equal(portalGrantsNpcProtection({x:10,y:10,to:'x2'},{mapId:'x1'}),true);
 for(const to of ['b41','b42','b43'])assert.equal(portalGrantsNpcProtection({x:10,y:10,to},{mapId:'x1'}),false);
 assert.equal(portalGrantsNpcProtection({x:10,y:10,to:'x1'},{mapId:'b41',battle:true}),false);
 assert.equal(portalGrantsNpcProtection({x:10,y:10,to:'x1',battle:true},{mapId:'x2'}),false);
 assert.equal(portalGrantsNpcProtection({x:10,y:10,to:'x1',targetLabel:'4-2'},{mapId:'x2'}),false);
 assert.equal(playerInNeutralPortalRange({x:241,y:0},[{x:0,y:0,to:'x2'}],{mapId:'x1'}),false);
 assert.equal(playerInNeutralPortalRange({x:239,y:0},[{x:0,y:0,to:'x2'}],{mapId:'x1'}),true);
 assert.equal(playerInNeutralPortalRange({x:0,y:0},[{x:0,y:0,to:'b43'}],{mapId:'x1'}),false);
});
test('websocket budget resets safely and vitals reject infinity/NaN',()=>{
 const s={};for(let i=0;i<80;i++)assert.equal(socketMessageAllowed(s,1000),true);
 assert.equal(socketMessageAllowed(s,1000),false);assert.equal(socketMessageAllowed(s,2001),true);
 assert.equal(boundedVital(Infinity,{fallback:150}),150);assert.equal(boundedVital(-20),0);
 assert.equal(boundedVital('100000000000000000000'),1e12);
});
test('world socket admin event control and maximum message size are protected',()=>{
 const src=readFileSync(new URL('../server/world.js',import.meta.url),'utf8');
 assert.match(src,/maxPayload:64\*1024/);assert.match(src,/if\(!socketMessageAllowed\(ws\)\)return;/);
 assert.match(src,/msg\.type==='force_event'&&ws\.identity\?\.isAdmin===true/);
 assert.match(src,/playerInNeutralPortalRange\(p,/);
});
