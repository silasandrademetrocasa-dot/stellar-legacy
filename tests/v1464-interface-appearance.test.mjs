import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const script=read('public/modules/interface-appearance-v1464.js');
function app({stored=null,ready='complete',storageFailure=false,settings=true}={}){
 const attrs={},events={},writes=[],handlers={};let select=settings?{value:'',addEventListener:(k,fn)=>handlers[k]=fn}:null,status=settings?{textContent:''}:null;
 const ctx={document:{readyState:ready,documentElement:{setAttribute:(k,v)=>attrs[k]=v},getElementById:id=>id==='interfaceAppearanceV1464'?select:id==='interfaceAppearanceStatusV1464'?status:null,addEventListener:(k,fn)=>events[k]=fn},localStorage:{getItem:()=>{if(storageFailure)throw Error('blocked');return stored;},setItem:(k,v)=>{if(storageFailure)throw Error('blocked');writes.push([k,v]);}},fetch(){throw Error('appearance must not use the network');},setInterval(){throw Error('appearance must not poll');}};
 vm.runInNewContext(script,ctx);
 return {attrs,events,writes,handlers,get select(){return select;},get status(){return status;},attach(){select={value:'',addEventListener:(k,fn)=>handlers[k]=fn};status={textContent:''};events.DOMContentLoaded();},choose(value){select.value=value;handlers.change();}};
}
test('original palette is applied before parsing the game and does not require authentication or HTTP',()=>{
 const a=app({ready:'loading',settings:false});assert.equal(a.attrs['data-interface-appearance'],'game');assert.equal(a.writes.length,0);a.attach();assert.equal(a.select.value,'game');assert.equal(a.status.textContent,'Cores originais de Stellar Legacy.');
 const html=read('public/index.html');assert.ok(html.indexOf('/modules/interface-appearance-v1464.js')<html.indexOf('/style.css'));
});
test('system accessibility colors are an explicit persistent choice and survive reload',()=>{
 const a=app();a.choose('system');assert.equal(a.attrs['data-interface-appearance'],'system');assert.equal(a.writes.length,1);assert.deepEqual(a.writes[0],['stellar_interface_appearance_v1464','system']);
 const reopened=app({stored:a.writes[0][1]});assert.equal(reopened.select.value,'system');assert.match(reopened.status.textContent,/contraste do sistema/);
 reopened.choose('game');assert.equal(reopened.attrs['data-interface-appearance'],'game');
});
test('invalid preferences and unavailable local storage fall back safely without resetting player data',()=>{
 for(const stored of [null,'bad','{"credits":99999}','<script>'])assert.equal(app({stored}).attrs['data-interface-appearance'],'game');
 const blocked=app({storageFailure:true});blocked.choose('system');assert.equal(blocked.attrs['data-interface-appearance'],'system');assert.equal(blocked.writes.length,0);blocked.choose('other');assert.equal(blocked.attrs['data-interface-appearance'],'game');
 assert.doesNotMatch(script,/game_saves|saveGame\(|getUser\(|\.clear\(|removeItem\(|fetch\(|setInterval\(/);
});
test('real settings markup has two labelled modes and restores author colors only for the selected original mode',()=>{
 const {document}=parseHTML(read('public/index.html'));const select=document.getElementById('interfaceAppearanceV1464');assert.ok(select);assert.equal(select.querySelectorAll('option').length,2);assert.ok(document.querySelector('label[for="interfaceAppearanceV1464"]'));assert.equal(document.getElementById('interfaceAppearanceStatusV1464').getAttribute('role'),'status');
 const css=read('public/style.css');assert.match(css,/:root\[data-interface-appearance="game"\]\{color-scheme:only dark;forced-color-adjust:none\}/);assert.match(css,/:root\[data-interface-appearance="system"\]\{color-scheme:dark;forced-color-adjust:auto\}/);
});
