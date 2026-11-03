/* Microbenchmark sintetico, nunca substitui medicao de FPS no Android. */
import {performance} from 'node:perf_hooks';
import {createSharedNpcIndexV1167} from '../public/modules/mobile-performance-v1167.js';
const npcs=Array.from({length:320},(_,i)=>({id:`npc_${i}`,sharedWorld:true,hp:1234}));
const requests=Array.from({length:36000},(_,i)=>`npc_${i%npcs.length}`);
const lookup=createSharedNpcIndexV1167();
function measure(fn){for(let k=0;k<3;k++)fn();const timings=[];for(let k=0;k<7;k++){const start=performance.now();fn();timings.push(performance.now()-start);}timings.sort((a,b)=>a-b);return Number(timings[3].toFixed(2));}
const linear=measure(()=>{for(const id of requests){const e=npcs.find(n=>n.id===id&&n.sharedWorld);if(!e)throw Error('lookup failed');}});
const indexed=measure(()=>{for(const id of requests){const e=lookup.find(npcs,id);if(!e)throw Error('index failed');}});
const result={npcCount:npcs.length,requests:requests.length,linearMedianMs:linear,indexMedianMs:indexed,speedup:Number((linear/Math.max(.0001,indexed)).toFixed(1)),note:'Teste sintetico Node, nao uma medicao de FPS real'};
console.log(JSON.stringify(result,null,2));
