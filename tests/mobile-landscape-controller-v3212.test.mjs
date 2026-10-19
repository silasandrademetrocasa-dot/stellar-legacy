import test from 'node:test';
import assert from 'node:assert/strict';
import {setupMobileLandscape} from '../public/modules/mobile-landscape.js';

function fakeEnv(width=844,height=390){
  const classes=new Set();
  const values=new Map();
  const listeners=new Map();
  const node=()=>({
    classList:{toggle(name,on){if(on)classes.add(name);else classes.delete(name);},contains:name=>classes.has(name)},
    setAttribute(key,val){values.set(key,val)},
    addEventListener(k,cb){listeners.set(k,cb)},
    removeEventListener(k){listeners.delete(k)},
    querySelector(){return {textContent:''}}
  });
  const hint=node(),rotate=node(),close=node();
  const body={classList:{toggle(k,v){if(v)classes.add(k);else classes.delete(k);}}};
  const doc={body,documentElement:{},getElementById(k){return {mobileLandscapeHint:hint,mobileLandscapeLaunch:rotate,mobileLandscapeDismiss:close}[k]??null;}};
  const win={innerWidth:width,innerHeight:height,addEventListener(k,cb){listeners.set(k,cb)},removeEventListener(k){listeners.delete(k)},requestAnimationFrame(cb){cb()}};
  return {doc,win,classes,values,listeners};
}
test('landscape initialization is safe and does not require a browser orientation API',()=>{
  const f=fakeEnv();let layouts=0;
  const stop=setupMobileLandscape({win:f.win,doc:f.doc,mobile:true,onLayoutChange:()=>layouts++});
  assert.equal(f.classes.has('mobile-landscape-pro'),true);
  assert.equal(f.values.get('aria-hidden'),'true');
  assert.ok(layouts>=1);
  f.win.innerWidth=390;f.win.innerHeight=844;f.listeners.get('resize')();
  assert.equal(f.classes.has('mobile-landscape-pro'),false);
  assert.equal(f.values.get('aria-hidden'),'false');
  stop();
});
test('desktop never shows the rotation tip',()=>{
  const f=fakeEnv(1280,720);
  setupMobileLandscape({win:f.win,doc:f.doc,mobile:false});
  assert.equal(f.classes.has('mobile-landscape-pro'),false);
  assert.equal(f.values.get('aria-hidden'),'true');
});
