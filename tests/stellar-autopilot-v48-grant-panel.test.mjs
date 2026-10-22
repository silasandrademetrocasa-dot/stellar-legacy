import test from 'node:test';
import assert from 'node:assert/strict';
import {createStellarAutopilotV48} from '../public/modules/stellar-autopilot-v48.js';

class FakeNode {
  constructor(tag='div') {this.tag=tag;this.children=[];this.dataset={};this.style={};this.hidden=false;this.disabled=false;this.checked=false;this.isConnected=true;this.textContent='';}
  append(...nodes){for(const node of nodes){this.children.push(node);node.parentNode=this;}}
  appendChild(node){this.append(node);return node;}
  find(selector){
    const ds=selector.match(/^\[data-([a-z-]+)\]$/);
    const k=ds?.[1]?.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
    if(k && Object.prototype.hasOwnProperty.call(this.dataset,k))return true;
    if(selector==='button' && this.tag==='button')return true;
    return false;
  }
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  querySelectorAll(selector){const output=[];for(const child of this.children){if(child.find(selector))output.push(child);output.push(...child.querySelectorAll(selector));}return output;}
}

test('ADM card shows disabled control on GET failure, retry and confirmed check on success', async()=>{
  const oldDocument=globalThis.document,oldFetch=globalThis.fetch;
  let failRead=true,allow=false,writes=0;
  globalThis.document={body:null,createElement:tag=>new FakeNode(tag)};
  globalThis.fetch=async (url,opts)=>{
    if(url.endsWith('/grants')&&failRead) return {ok:false,status:503,json:async()=>({error:'Banco temporariamente indisponível'})};
    if(url.endsWith('/grants'))return {ok:true,json:async()=>({grants:[]})};
    if(url.includes('/grants/')){writes++;allow=JSON.parse(opts.body).enabled;return {ok:true,json:async()=>({ok:true,grant:{enabled:allow}})};}
    throw Error('Unexpected URL '+url);
  };
  try {
    const bot=createStellarAutopilotV48({credentials:()=>({accessToken:'test'}),getIdentity:()=>('adm'),stopFire:()=>{}});
    const root=new FakeNode('div');const card=new FakeNode('article');card.dataset.adminUser='user-1';root.append(card);
    const admin=new FakeNode('article');admin.dataset.adminUser='adm';root.append(admin);
    const users=[{user_id:'user-1',is_admin:false},{user_id:'adm',is_admin:true}];
    await bot.decorateAdminUsers(root,users);
    assert.equal(root.querySelectorAll('[data-ap-grant]').length,1,'visible check row created even when GET fails');
    const input=card.querySelector('[data-ap-grant]'),status=card.querySelector('[data-ap-grant-status]');
    assert.equal(input.disabled,true,'fail closed when GET failed');
    assert.match(status.textContent,/Falha ao consultar permissões/);
    assert.equal(card.querySelector('button').hidden,false,'manual retry shown');
    failRead=false;
    await bot.decorateAdminUsers(root,users);
    assert.equal(input.disabled,false);
    assert.equal(input.checked,false);
    assert.match(status.textContent,/BLOQUEADO/);
    input.checked=true;await input.onchange();
    assert.equal(input.checked,true);
    assert.equal(writes,1);
    assert.match(status.textContent,/LIBERADO.*confirmado/);
    assert.equal(root.querySelectorAll('[data-ap-grant]').length,1,'does not duplicate after refresh');
  } finally {globalThis.document=oldDocument;globalThis.fetch=oldFetch;}
});
