import test from 'node:test';
import assert from 'node:assert/strict';
import {createAuxiliaryWorkScheduler} from '../public/modules/aux-work-scheduler.js';

test('tarefas auxiliares executam na primeira tentativa, respeitam prazo e mantêm cadências independentes',()=>{
 let clock=0;
 const s=createAuxiliaryWorkScheduler({now:()=>clock});
 assert.equal(s.due('boxes',240),true);
 assert.equal(s.due('online',100),true);
 clock=90;assert.equal(s.due('boxes',240),false);assert.equal(s.due('online',100),false);
 clock=100;assert.equal(s.due('online',100),true);assert.equal(s.due('boxes',240),false);
 clock=241;assert.equal(s.due('boxes',240),true);
});
test('retomada após pausa e reset não impedem primeira execução',()=>{
 let t=1000;const s=createAuxiliaryWorkScheduler({now:()=>t});
 assert.equal(s.due('event',250),true);
 t=600;assert.equal(s.due('event',250),true); // relógio retrocedeu
 t=700;assert.equal(s.due('event',250),false);
 s.reset();assert.equal(s.due('event',250),true);
});
test('intervalos inválidos não criam bloqueios indefinidos',()=>{
 let t=1;const s=createAuxiliaryWorkScheduler({now:()=>t});
 assert.equal(s.due('poll',-1),true);
 assert.equal(s.due('poll',-1),true);
 t=2;assert.equal(s.due('poll',Infinity),true);
});
