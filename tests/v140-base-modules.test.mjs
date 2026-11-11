import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {BASE_MODULES_V140,baseArtV140,hasBaseV140,modulePointV140,hitBaseModuleV140,createBaseNavigationV140,drawBaseModulesV140} from '../public/modules/base-modules-v140.js';
const context=()=>({enabled:true,key:'pilot:earth:x1',mapId:'x1',faction:'earth',own:true,base:{x:620,y:1500},position:{x:620,y:1500},destination:{x:620,y:1500}});
function rig(){const c=context(),moves=[],actions=[];const nav=createBaseNavigationV140({getContext:()=>c,move:p=>{moves.push(p);c.destination={x:p.x,y:p.y};},open:id=>actions.push(id)});return {c,nav,moves,actions};}
test('V140 all four totems fit the existing safe radius in both X-1 and X-8 of each faction',()=>{
 for(const faction of ['earth','mars','jupiter'])for(const mapId of ['x1','x8']){
  assert.ok(hasBaseV140(mapId));assert.ok(baseArtV140(faction));
  const {c,nav}=rig();c.faction=faction;c.mapId=mapId;c.key=`pilot:${faction}:${mapId}`;
  for(const m of BASE_MODULES_V140){const p=modulePointV140(m.id,c.base,faction);assert.ok(Math.hypot(p.x-c.base.x,p.y-c.base.y)<450);assert.equal(nav.hit(p).id,m.id);assert.ok(hitBaseModuleV140(p,c.base,faction));}
 }
 assert.equal(hasBaseV140('x2'),false);assert.equal(hasBaseV140('b41'),false);assert.equal(baseArtV140('battle'),null);
});
test('V140 far click approaches, then explicit interaction opens one existing panel only once',()=>{
 const {c,nav,moves,actions}=rig();assert.equal(nav.select('commerce'),true);assert.equal(moves.length,1);assert.equal(nav.state().ready,false);assert.equal(nav.activate(),false);assert.deepEqual(actions,[]);
 const p=modulePointV140('commerce',c.base);Object.assign(c.position,p);assert.equal(nav.state().ready,true);
 assert.equal(nav.activate(),true);assert.equal(nav.activate(),false);assert.deepEqual(actions,['commerce']);
});
test('V140 nearby emblem directly opens the selected service',()=>{
 const {c,nav,actions}=rig();Object.assign(c.position,modulePointV140('hangar',c.base));assert.equal(nav.select('hangar'),true);assert.deepEqual(actions,['hangar']);assert.equal(nav.state(),null);
});
test('V140 navigation cancels on another movement, another account/map, logout, death or enemy base',()=>{
 for(const variant of ['move','map','account','off','enemy']){
  const {c,nav,actions}=rig();nav.select('portals');
  if(variant==='move')c.destination={x:900,y:900};if(variant==='map')c.mapId='x2';if(variant==='account')c.key='other-account:earth:x1';if(variant==='off')c.enabled=false;if(variant==='enemy')c.own=false;
  assert.equal(nav.state(),null,variant);assert.equal(nav.activate(),false);assert.deepEqual(actions,[]);
 }
 const {c,nav}=rig();c.own=false;assert.equal(nav.select('missions'),false);assert.equal(nav.hit(modulePointV140('missions',c.base)),null);
});
test('V140 a base without selection is one static draw, including low quality',()=>{
 let draws=0;const ctx={drawImage:()=>draws++};
 assert.equal(drawBaseModulesV140(ctx,{faction:'earth',getImage:()=>({naturalWidth:1024})}),true);assert.equal(draws,1);
 assert.equal(drawBaseModulesV140(ctx,{faction:'earth',getImage:()=>({naturalWidth:0})}),false);assert.equal(draws,1);
});
test('V140 idle navigation performs no context queries and three static textures fit the budget',()=>{
 let reads=0;const nav=createBaseNavigationV140({getContext:()=>{reads++;return context();},move:()=>{},open:()=>{}});
 for(let i=0;i<10000;i++)assert.equal(nav.state(),null);assert.equal(reads,0);
 const manifest=JSON.parse(readFileSync(new URL('../public/assets/v140/bases/manifest.json',import.meta.url),'utf8'));
 assert.equal(manifest.rows.length,3);let decoded=0,bytes=0;
 for(const row of manifest.rows){
  const data=readFileSync(new URL('../public'+baseArtV140(row.faction),import.meta.url));
  assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',12,16),'VP8X');
  assert.equal(data.readUIntLE(24,3)+1,1024);assert.equal(data.readUIntLE(27,3)+1,576);
  assert.equal(createHash('sha256').update(data).digest('hex'),row.sha256);decoded+=1024*576*4;bytes+=data.length;
 }
 assert.ok(decoded<8*1024*1024);assert.ok(bytes<2*1024*1024);
});
