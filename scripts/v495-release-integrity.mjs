import fs from 'node:fs';
import assert from 'node:assert/strict';
const file=p=>fs.readFileSync(p,'utf8');
const game=file('public/game.js'),server=file('server/offline-farm-v484.js'),ui=file('public/modules/stellar-offline-farm-v484.js'),compare=file('public/modules/stellar-offline-v49-ui.js');
assert(game.includes('STELLAR_FARM_RECOVER_SESSION_V495'),'recuperacao nao aplicada');
assert(!game.includes('onFinish:async()=>{location.reload();}'),'forca recarga apos resgate');
assert(game.includes('const serverSave=await loadCloudSave()'),'resgate deve buscar o save SQL');
assert(server.includes('forecastV495'),'comparacao sem limite');
assert(compare.includes('&minutes='),'comparacao sem duracao');
assert(ui.includes('LASER_AMMO'),'nomes originais de municao');
assert(file('sql/STELLAR_V49_5_COMPATIBILIDADE_ACESSO.sql').includes('service_role'));
// V49.5.1: installed catalog is authoritative; never replace with test fixture.
const catalog=file('public/data.js');
for (const required of ['MAPS','RESOURCES','ROCKETS','NPC_TYPES','ITEMS','SHIPS','LASER_AMMO']) {
  assert(new RegExp('export\\s+const\\s+'+required+'\\s*=').test(catalog), 'Catalogo oficial ausente: '+required);
}
assert(catalog.length>20000 && !catalog.includes('TEST-ONLY SYNTHETIC CATALOG'), 'Catalogo do jogo substituido por fixture de teste');
console.log('✅ V49.5: sessão, UI, simulação e SQL compatíveis');
