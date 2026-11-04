import {ITEMS} from '../data.js';
import {openLocalSaveV121} from './local-first-save-v121.js';
const id='00000000-0000-4000-8000-000000000121';
const el=k=>document.getElementById(k);
const currencies=n=>Number(n||0).toLocaleString('pt-BR');
let store,state;
const fresh=()=>({accountOwnerId:id,profile:{credits:150000000,uridium:0,level:1},inventory:{},combatConfigsV2013:{active:1},lab:true});
async function draw(){
 const saved=await store.read(id);
 state=saved?.state||fresh();
 el('credits').textContent=currencies(state.profile.credits);
 el('conf').textContent=state.combatConfigsV2013.active;
 el('rev').textContent=saved?.revision||0;
 const pending=await store.pending(id,100);
 el('pending').textContent=pending.length;
 el('log').textContent=pending.slice(-10).reverse().map(op=>`${op.revision} | ${op.module}: ${op.action} | ${new Date(op.createdAt).toLocaleTimeString('pt-BR')}`).join('\n')||'Fila vazia';
}
async function action(module,operation,mutate,payload={}){
 const next=structuredClone(state);
 const result=mutate(next);
 if(result===false)return;
 await store.commit(id,next,{intent:{id:crypto.randomUUID(),module,action:operation,payload,requiresServer:false}});
 await draw();
}
async function start(){
 store=await openLocalSaveV121();
 if(!await store.read(id))await store.commit(id,fresh(),{forceCheckpoint:true});
 await draw();
 const chosen=['lf1','lf2','lf3','lf4','flax','iris'];
 for(const key of chosen){
  const item=ITEMS[key];
  const line=document.createElement('div');line.className='item';
  const descr=document.createElement('div');
  const label=document.createElement('strong');label.textContent=item.name;descr.appendChild(label);
  const sub=document.createElement('div');sub.textContent=`${currencies(item.price)} ${item.currency==='credits'?'créditos':'STL'} • ${item.type}`;sub.style.fontSize='.8rem';sub.style.color='#b4c8da';descr.appendChild(sub);
  const btn=document.createElement('button');btn.textContent='Comprar';btn.disabled=item.currency!=='credits';btn.title=item.currency!=='credits'?'STL exigiria validação autoritativa online':'';
  btn.addEventListener('click',()=>action('laboratorio','compra_'+item.name,s=>{
    if(s.profile.credits<item.price){alert('Créditos fictícios insuficientes');return false;}
    s.profile.credits-=item.price;s.inventory[key]=(s.inventory[key]||0)+1;
  },{itemName:item.name,price:item.price,currency:item.currency}));
  line.append(descr,btn);el('items').appendChild(line);
 }
 el('earn').onclick=()=>action('laboratorio','recompensa_teste',s=>{s.profile.credits+=25000000;});
 el('swap').onclick=()=>action('hangar','troca_configuracao',s=>{s.combatConfigsV2013.active=s.combatConfigsV2013.active===1?2:1;});
 el('checkpoint').onclick=async()=>{await store.commit(id,state,{forceCheckpoint:true});await draw();el('check-result').textContent='Checkpoint A criado.'};
 el('restore').onclick=async()=>{const b=await store.restore(id,'A');await draw();el('check-result').textContent=b?'Checkpoint A restaurado como nova revisão.':'Checkpoint A indisponível.';};
 el('inspect').onclick=async()=>{let count=0;for(const slot of ['A','B','C'])if(await store.checkpoint(id,slot))count++;await store.read(id);el('check-result').textContent=`Save SHA-256 íntegro. ${count} checkpoint(s) íntegros.`};
}
start().catch(err=>{el('log').textContent='Falha de IndexedDB: '+(err?.message||err)});
