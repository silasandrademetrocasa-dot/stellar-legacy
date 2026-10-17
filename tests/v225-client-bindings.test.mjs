import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const path=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
test('importações novas partem do módulo correto e carregam versão do pacote',()=>{
 const pkg=JSON.parse(path('package.json'));
 const game=path('public/game.js');
 const api=path('public/api.js');
 const allGameImports=[...game.matchAll(/^import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/gm)];
 const origins=new Map();for(const m of allGameImports){const k=m[2].split('?')[0];origins.set(k,[...(origins.get(k)||[]),...m[1].split(',').map(x=>x.trim())]);}
 assert.ok((origins.get('./api.js')||[]).includes('loadClanOperationsOnline'));
 assert.ok((origins.get('./api.js')||[]).includes('claimClanOperationOnline'));
 assert.ok((origins.get('./api.js')||[]).includes('saveAdminClanOperationOnline'));
 assert.ok(!(origins.get('./modules/ship-navigation.js')||[]).includes('loadClanOperationsOnline'));
 assert.match(api,/export async function loadClanOperationsOnline\(/);
 assert.match(api,/export async function claimClanOperationOnline\(/);
 assert.match(api,/export async function saveAdminClanOperationOnline\(/);
 for(const m of allGameImports)assert.equal(m[2].split('?')[1],`v=${pkg.version}`);
});
