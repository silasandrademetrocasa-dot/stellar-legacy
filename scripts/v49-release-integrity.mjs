import fs from 'node:fs';
const file=p=>fs.readFileSync(p,'utf8');
const server=file('server/offline-farm-v484.js'),ui=file('public/modules/stellar-offline-farm-v484.js');
const sql=file('sql/STELLAR_V49_0_TODAS_AS_FASES.sql');
for(const [path,needle] of [
 ['server/offline-farm-v484.js',"method==='start'||method==='claim'?'_v49'"],
 ['server/offline-farm-v484.js','v49/admin/access'],
 ['server/offline-farm-v484.js','v49/strategies'],
 ['server/offline-farm-v49-push.js','x-stellar-farm-push-token'],
 ['public/modules/stellar-offline-v49-ui.js','pushManager.subscribe'],
 ['public/modules/stellar-offline-farm-v484.js','mountFarmV49({shell,request})'],
 ['public/sw.js',"self.addEventListener('push'"],
 ['sql/STELLAR_V49_0_TODAS_AS_FASES.sql','stellar_offline_farm_access_v488'],
 ['sql/STELLAR_V49_0_TODAS_AS_FASES.sql','stellar_offline_farm_claim_v49'],
 ]){
  if(!file(path).includes(needle))throw Error('V49 integrity: '+path+' missing '+needle);
}
if(!ui.includes('STELLAR_OFFLINE_FARM_MENU_RESCUE_V4851'))throw Error('V49 removed original farm rescue fix');
if(!sql.includes('ON CONFLICT(user_id) DO NOTHING'))throw Error('V49 grant migration is not backward-compatible');
console.log('✅ V49: all-phase bundle / security / restore verified');
