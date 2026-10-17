import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nominalMovementSpeed,movementSpeed,FLIGHT_PACING_FACTOR,PVE_SECTORS,PVP_SECTORS,followShipCamera} from '../public/modules/ship-navigation.js';
const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
test('O atributo de velocidade apresentado no HUD nao diminui com o novo ritmo',()=>{
  assert.equal(FLIGHT_PACING_FACTOR,0.72);
  for(const mapId of [...PVE_SECTORS,...PVP_SECTORS]){
    for(const attribute of [390,720]){
      for(const ability of [1,1.35]){
        const before=attribute*ability*0.88;
        assert.equal(nominalMovementSpeed(attribute,mapId,ability),before);
        assert.ok(Math.abs(movementSpeed(attribute,mapId,ability)-before*.72)<1e-10);
      }
    }
  }
  assert.equal(nominalMovementSpeed(720,'ggAlpha'),720);
  assert.equal(movementSpeed(720,'ggAlpha'),720);
});
test('HUD principal e de combate mostram velocidade nominal e apenas movimento usa o passo reduzido',()=>{
  assert.equal((game.match(/fmt\(nominalMovementSpeed\(player\.speed,progress\?\.mapId,shipAbilitySpeedMultiplier\(\)\)\)/g)||[]).length,2);
  assert.match(game,/const step=Math\.min\(d,movementSpeed\(player\.speed,progress\?\.mapId,shipAbilitySpeedMultiplier\(\)\)\*dt\)/);
  assert.match(game,/VEL<strong>\$\{fmt\(player\.speed\)\}/);
});
test('CONF de corrida mantem vantagem e camera segue centralizada',()=>{
  const normal=movementSpeed(430,'x4',1),race=movementSpeed(800,'x4',1);
  assert.ok(race>normal*1.8);
  const cam=followShipCamera({x:40,y:40},{x:1040,y:850},.07);
  assert.ok(Math.hypot(cam.x-1040,cam.y-850)<=14.0001);
});
