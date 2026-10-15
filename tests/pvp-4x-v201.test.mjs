import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const game=fs.readFileSync(path.join(ROOT,'public/game.js'),'utf8');
const sql=fs.readFileSync(path.join(ROOT,'sql/STELLAR_V20_1_PVP_4X.sql'),'utf8');
const manifest=fs.readFileSync(path.join(ROOT,'public/assets/v17/manifest.js'),'utf8');
function grab(a,b){const s=game.indexOf(a);assert.ok(s>=0,a);const e=game.indexOf(b,s+a.length);assert.ok(e>s,b);return game.slice(s,e);}
function context(map='b41'){
  const playerA={id:'other-a',isPlayer:true,x:100,y:100,hp:1000,maxHp:1000,faction:'earth',shipId:'goliath',callsign:'ALIADO'};
  const playerB={...playerA,id:'other-b',x:300,faction:'mars',callsign:'INIMIGO'};
  let chosen=null;
  const x={progress:{mapId:map,profile:{faction:'earth'}},getUser:()=>({id:'me'}),isBattleGroupMember:()=>false,
    onlineWorld:{players:new Map([['other-a',playerA],['other-b',playerB]])},state:{enemies:[],pointerNavActive:false,target:null,currentMap:{world:{w:6000,h:4000}}},
    player:{laserFiring:false},canvas:{setPointerCapture:()=>{}},worldPoint:()=>({x:100,y:100}),
    gameplayPointerAllowed:()=>true,onlineShipSize:()=>82,autoLaserEnabled:()=>false,combatPrefs:{tapAttack:false},
    selectCombatTarget:(t)=>{chosen=t;return true;},setCombatAlert:()=>{},showToast:()=>{},portalAtWorld:()=>null,nearbyPortal:()=>null,
    setPointerDestination:()=>{},Date,Math, get chosen(){return chosen;}};
  vm.createContext(x);
  vm.runInContext(grab('function isPublicPvpSector(', 'async function syncOnlineWorld('),x);
  vm.runInContext(grab('function pvpTargetAllowed(', 'function pvpLaserBase('),x);
  vm.runInContext(grab('function pointerAction(ev){','function pointerNavigateMove('),x);
  return {x,playerA,playerB};
}
test('seleciona inclusive jogador da mesma faccao em cada 4-X',()=>{
 for(const map of ['b41','b42','b43']){const {x}=context(map); x.pointerAction({button:0,pointerId:1});assert.equal(x.chosen?.id,'other-a');}
});
test('X-1 ate X-8 nunca permitem alvo PvP',()=>{
 for(const map of ['x1','x2','x3','x4','x5','x6','x7','x8']){const {x,playerA}=context(map);assert.equal(x.pvpTargetAllowed(playerA),false);x.pointerAction({button:0,pointerId:1});assert.equal(x.chosen,null);}
});
test('nao seleciona si proprio, aliado de grupo ou nave morta',()=>{
 const {x,playerA}=context(); x.isBattleGroupMember=id=>id==='other-a';assert.equal(x.pvpTargetAllowed(playerA),false);
 assert.equal(x.pvpTargetAllowed({...playerA,id:'me'}),false);assert.equal(x.pvpTargetAllowed({...playerA,hp:0}),false);
});
test('server rejeita fora de 4-X, distancia, spam, dano absurdo, grupo e propria conta',()=>{
 for(const s of ["('b41','b42','b43')",'p_map_id IS NULL','p_territory_faction IS DISTINCT FROM', 'v_attacker.map_id<>p_map_id', 'v_target.map_id<>p_map_id','v_dist>2200','p_damage>100000',"interval '0.35 seconds'",'battle_group_members_v179','p_target_user_id=v_uid'])assert.ok(sql.includes(s),s);
 assert.ok(!sql.includes("Fogo amigo bloqueado.'"),'nao proibir mesma faccao');
});
test('oito sprites exclusivos e transparentes foram vinculados corretamente',()=>{
 for(const name of ['arc-x','arc-omega','thr-7','nanobot-prime','aeg3','aeg4','vsh0','vsh6']){
  const src='/assets/v20/equipment/'+name+'.png';assert.ok(manifest.includes(src),src);
  const bytes=fs.readFileSync(path.join(ROOT,'public'+src));assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.equal(bytes[25],6,src+' RGBA');
 }
 for(const id of ['lfx','lfomega','g3n8700','repPrime']) assert.match(manifest,new RegExp('\\b'+id+':'));
});
