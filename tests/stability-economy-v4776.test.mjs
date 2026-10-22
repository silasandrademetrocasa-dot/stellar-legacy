import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {saleQuoteV4776} from '../public/modules/sale-policy-v4776.js';
const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Elite purchase 300k STL resells for exactly 300k CREDITS, never STL',()=>{
 const q=saleQuoteV4776({price:300000,currency:'uridium',enabled:true});
 assert.deepEqual(q,{unit:300000,currency:'credits',available:true,elite:true});
});
test('all shop credit gear resells for half the catalogue price in credits',()=>{
 assert.deepEqual(saleQuoteV4776({price:1000000,currency:'credits',enabled:true}),{unit:500000,currency:'credits',available:true,elite:false});
 assert.equal(saleQuoteV4776({price:11,currency:'credits'}).unit,5);
});
test('no price, invalid, and disabled rare/event items cannot be sold with guessed value',()=>{
 for(const row of [null,{price:0,currency:'uridium'},{price:-1,currency:'credits'},{price:180000,currency:'uridium',enabled:false}]){
  const q=saleQuoteV4776(row);assert.equal(q.available,false);assert.equal(q.unit,0);assert.equal(q.currency,'credits');
 }
});
test('very large price is never allowed to become non-safe arithmetic',()=>{
 assert.equal(saleQuoteV4776({price:Number.MAX_SAFE_INTEGER+1,currency:'uridium'}).available,false);
});
test('new purchase/confirmation modal performs no native blocking prompt, page reload or login',()=>{
 const src=read('public/modules/stellar-dialog-v4776.js');
 assert.match(src,/Promise\(resolve/);assert.match(src,/sale-confirm-card/);
 assert.doesNotMatch(src,/[^\w.]window\.confirm\s*\(|location\.reload\s*\(|logOut\s*\(/);
});
test('Patch is incremental and preserves economy server authority without SQL',()=>{
 const pkg=JSON.parse(read('package.json')),script=read('scripts/v4776-apply-patch.mjs');
 assert.equal(pkg.version,'47.7.6');assert.match(pkg.scripts.check,/v4776-apply-patch/);
 // The Universal Installer consumes stellar-install.json but deliberately does NOT copy it to the repository.
 assert.match(script,/const OLD='47\.7\.5',NEW='47\.7\.6'/);
 assert.match(script,/saleQuoteV4776\(row\)/);assert.match(script,/stellarEconomySyncAfterV4776/);
 assert.match(script,/bossPhaseToggleV4776/);assert.match(script,/itemSellCaptionV4776/);
 assert.match(script,/stellarConfirmV4776/);assert.match(script,/#targetLockHud\.collapsed/);
 assert.doesNotMatch(script,/UPDATE\s+(?:public\.)?game_saves|DELETE\s+FROM|DROP\s+TABLE/i);
});

test('browser imports use ?v=47.7.6 and a second patch run cannot duplicate them',()=>{
 const patch=read('scripts/v4776-apply-patch.mjs');
 assert.match(patch,/from '\.\/modules\/sale-policy-v4776\.js\?v=/);
 assert.match(patch,/from '\.\/modules\/stellar-dialog-v4776\.js\?v=/);
 assert.match(patch,/from '\.\/stellar-dialog-v4776\.js\?v=/);
 assert.match(patch,/currencyCount===3/);
 assert.match(patch,/total===0&&s\.includes/);
 assert.match(patch,/stability-economy-v4776\.test\.mjs/);
});
