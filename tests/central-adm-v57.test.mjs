import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const html=read('public/index.html');
const js=read('public/modules/stellar-admin-v57.js');
const css=read('public/modules/stellar-admin-v57.css');
const game=read('public/game.js');
const farm=read('public/modules/stellar-offline-farm-v484.js');
test('V57: navegação ADM tem todas as áreas e usa painel existente',()=>{
 for(const label of ['overview','players','world','universe','farm','combat','economy','events','systems','audit']) assert.match(js,new RegExp(`id:'${label}'`));
 for(const id of ['v57AdmNav','v57AdmSubnav','v57AdmFarmMount','v57AdmFarmArea','adminRuntimeTabs','adminRuntimeWorldTabs','adminRuntimeSystemsTabs'])assert.match(html,new RegExp(`id="${id}"`));
 assert.match(js,/button\.click\(\)/);
 assert.match(js,/data-admin-runtime-tab/);
 assert.match(css,/\.v57-adm-nav/);
 assert.match(css,/@media\(max-width:570px\)/);
});
test('V57: Farm realocado sem duplicar ou perder suas actions de servidor',()=>{
 assert.match(js,/farmMount\.replaceChildren\(details\)/);
 assert.match(js,/MutationObserver\(moveFarm\)/);
 assert.match(farm,/v485-adm-save/);
 assert.match(farm,/admin\/cancel/);
 assert.match(farm,/admin\/settings/);
 assert.match(js,/details\.open = currentCategory==='farm'/);
});
test('V57: chamadas críticas continuam com as permissões originais',()=>{
 assert.match(game,/getAdminStatus\(\)/);
 assert.match(game,/adminRuntime\.enabled=!!status\?\.is_admin/);
 assert.match(game,/setAdminRuntimeTab\(b\.dataset\.adminRuntimeTab\)/);
 assert.match(js,/openLegacy\('frontierExpansionBtnV42'\)/);
 assert.match(js,/openLegacy\('warfrontBtn'\)/);
 assert.doesNotMatch(js,/fetch\(|localStorage|supabase/i);
});
