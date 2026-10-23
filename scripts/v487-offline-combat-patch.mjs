/* STELLAR_OFFLINE_COMBAT_V487 — existing game UI logic remains in module;
 * server and SQL implement the new offline model. This prelaunch check is idempotent.
 */
import fs from 'node:fs';
for(const file of ['server/offline-farm-v487-engine.js','server/offline-farm-v484.js','public/modules/stellar-offline-farm-v484.js']){
 if(!fs.existsSync(file))throw Error('V48.7 missing '+file);
}
const server=fs.readFileSync('server/offline-farm-v484.js','utf8');
if(!server.includes('stellar_offline_farm_')||!server.includes("method==='start'||method==='claim'?'_v487'"))throw Error('V48.7 server hooks missing');
console.log('✅ V48.7: combat and display hooks verified');
