import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {drawPortalV71} from '../public/modules/stellar-animation-v71.js';
import {astralDisplayNameV1163} from '../public/modules/stage-a-v423.js';
const base=resolve(import.meta.dirname,'..');
const load=x=>readFileSync(join(base,x),'utf8');
const game=load('public/game.js');
const index=load('public/index.html');
const css=load('public/modules/layout-polish-v1163.css');

test('V116.3 login: opções curtas com checkbox na mesma linha',()=>{
  assert.match(index,/> Salvar Login<\/label>/);
  assert.match(index,/> Manter conectado<\/label>/);
  assert.match(css,/#loginForm label\.auth-remember-row/);
  assert.match(css,/flex-flow:row nowrap!important/);
  assert.match(css,/#loginForm label\.auth-remember-row input\[type=checkbox\]/);
});
test('V116.3 AUX HUD: XP real baseado na tabela de níveis e módulo preservado',()=>{
  assert.match(index,/id="petFloatXpBar"/);assert.match(index,/id="petFloatXpText"/);
  assert.match(game,/const start=petLevelThreshold\(pet\.level\),end=pet\.level>=PET_MAX_LEVEL/);
  assert.match(game,/xpText\.textContent=maxed/);
  assert.match(index,/id="petGearQuickSelect"/);
  assert.match(css,/#topHudDock #petFloatPanel/);
});
test('V116.3: 8 missões possíveis, não há denominador fixo de 5',()=>{
  assert.match(game,/\$\{missions\.length\} concluídas hoje/);
  assert.doesNotMatch(game,/\/5 concluídas hoje/);
});
test('V116.3: artes corretas e percentuais normalizados nos protocolos AUX',()=>{
  assert.match(game,/type='auxProtocol';badge=/);
  assert.match(game,/if\(type==='auxProtocol'&&AUX_ADVANCED_V110/);
  assert.match(game,/Intl\.NumberFormat\('pt-BR',\{maximumFractionDigits:2\}\)/);
  for(const id of ['dano','hp','escudo','loot','porao']){
    assert.ok(existsSync(join(base,`public/assets/v109/aux-protocols/aux_protocol_${id}_n1.png`)));
  }
});
test('V116.3: códigos astrais intactos, nomes apresentados sem underline',()=>{
  for(const [id,label] of Object.entries({astral_guard:'Guarda Astral',nexus_drive:'Propulsor Nexus',eclipse_lance:'Lança Eclipse',trinity_matrix:'Matriz Trina'}))assert.equal(astralDisplayNameV1163(id),label);
  assert.equal(astralDisplayNameV1163('unknown_code'),'Unknown Code');
});
test('V116.3: o portal usa um sprite estático, centralizado e sem alterar hitboxes',()=>{
  const calls=[],urls=[];
  const ctx={drawImage:(...args)=>calls.push(args)};
  const portal={to:'x2',targetLabel:'1-2'};
  assert.equal(drawPortalV71(ctx,{portal,getImage:src=>{urls.push(src);return {naturalWidth:256,naturalHeight:256};}}),true);
  assert.equal(calls.length,1);assert.equal(urls.length,1);assert.match(urls[0],/\/assets\/v137\/portals\/normal\.webp$/);
  assert.deepEqual(calls[0].slice(1),[-68,-70,136,140]);
  assert.equal(portal.to,'x2');
});
test('V116.3: Farm Offline protegido e legibilidade sem textos de versão',()=>{
  const farm=load('public/modules/stellar-offline-farm-v484.js');
  assert.match(farm,/id="v484-settle"/);assert.match(farm,/v103\/preflight/);
  assert.doesNotMatch(farm,/<small>V103 · RESGATE PROTEGIDO<\/small>/);
  assert.doesNotMatch(farm,/color:#f5d598;font-size:12px">V103:/);
  assert.match(index,/id="visualDiagSectionV75"/);assert.match(css,/#visualDiagSectionV75,#visualDiagFloatingV75/);
});
test('V116.3: preserva correções V116.1 de autopilot e compra/venda em batalha',()=>{
  assert.match(game,/stellar-autopilot-v126/); // V126 mantém o mecanismo V116 por nova ponte de cache
  assert.ok(existsSync(join(base,'public/modules/stellar-autopilot-recovery-v116.js')));
  assert.match(game,/baseTradeVisibleV116/);
});
