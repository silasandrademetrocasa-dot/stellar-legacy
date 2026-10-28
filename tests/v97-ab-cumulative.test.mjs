import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {quoteBulkPurchase} from '../public/modules/bulk-purchase-v92.js';
import {requestGameOrientation,setupMobileLandscape} from '../public/modules/mobile-landscape.js';
const root=fileURLToPath(new URL('..',import.meta.url));
const read=p=>readFileSync(join(root,p),'utf8');

test('V92: pedido arbitário vira pacotes inteiros, uma operação',()=>{
 assert.deepEqual(quoteBulkPurchase({requested:1150,packSize:1000,packPrice:125}),{requested:1150,packSize:1000,packPrice:125,packages:2,delivered:2000,price:250});
});
test('V92: limites, subunidades e estouros são rejeitados antes da cobrança',()=>{
 for(const qty of [0,-1,1.1,2_000_001,NaN,Infinity])assert.throws(()=>quoteBulkPurchase({requested:qty,packSize:1000,packPrice:125}));
 assert.throws(()=>quoteBulkPurchase({requested:6000,packSize:10,packPrice:2}));
 assert.throws(()=>quoteBulkPurchase({requested:1,packSize:1,packPrice:0}));
});
test('V92: compra em lote tem autenticação, guarda offline, débito e grant autoritativos',()=>{
 const server=read('server/index.js');
 assert.match(server,/app.post\('\/api\/live\/purchase\/bulk', requireUser, OFFLINE_FARM_GUARD_V484/);
 assert.match(server,/withPurchaseLock\(req\.user\.id/);
 assert.match(server,/state\.bulkPurchaseReceiptsV92=/);
 assert.match(server,/applyLiveGrant\(state,\{\.\.\.row/);
 assert.match(server,/writeVerifiedSave\(req,state,updatedAt\)/);
 assert.ok(server.indexOf('const OFFLINE_FARM_GUARD_V484=')<server.indexOf("app.post('/api/live/purchase/bulk'"),'guard must be initialized first');
 assert.match(server,/expected_price\)!==quote.price/);
 assert.match(server,/bulkPurchaseReceiptsV92=structuredClone/);
 assert.match(server,/previous\.catalogKey!==key\|\|previous\.quantity!==quantity/);
});
test('V92: UI seleciona produto, quantidade digitável, confirmação e chamada única',()=>{
 const html=read('public/index.html'),game=read('public/game.js'),api=read('public/api.js');
 assert.match(html,/data-bulk-product/);assert.match(html,/data-bulk-quantity/);
 assert.match(game,/purchaseLiveBulkOnline\(product,quantity,idempotency,quote.price,q.currency,quote.packSize\)/);
 assert.match(game,/openSpendConfirm\(\{title:'Confirmar compra em lote\?'/);
 assert.match(api,/\/api\/live\/purchase\/bulk/);
});
test('V93: nenhum popup de landscape no login e controles em Configurações',()=>{
 const html=read('public/index.html');
 assert.doesNotMatch(html,/id="mobileLandscapeHint"/);
 assert.match(html,/id="orientationSettingsV92"/);
 assert.match(html,/id="landscapeEnableV92"/);
 assert.match(html,/id="landscapeDisableV92"/);
});
test('V93: APK controla orientação pelo bridge nativo sem forçar fullscreen',async()=>{
 const java=read('android/app/src/main/java/com/stellarlegacy/mobile/MainActivity.java');
 assert.match(java,/addJavascriptInterface\(new OrientationBridge\(\), "StellarAndroid"\)/);
 assert.match(java,/SCREEN_ORIENTATION_SENSOR_LANDSCAPE/);
 let selected=null;
 const result=await requestGameOrientation({landscape:true,win:{StellarAndroid:{setLandscape(v){selected=v;}}},doc:{}});
 assert.deepEqual(result,{ok:true,native:true});assert.equal(selected,true);
});
test('V93: WebView recursos locais e rede permitida apenas para dados',()=>{
 const java=read('android/app/src/main/java/com/stellarlegacy/mobile/MainActivity.java');
 assert.match(java,/WebViewAssetLoader/);assert.match(java,/path.startsWith\("\/api\/"\)/);
 assert.match(java,/new WebResourceResponse\("text\/plain", "UTF-8", 404/);
});
test('V94–V97: Autopilot, Farm e progressão são diagnósticos, não novos saves',()=>{
 const ap=read('public/modules/stellar-autopilot-v48.js');const farm=read('public/modules/stellar-offline-farm-v484.js');const game=read('public/game.js');
 assert.match(ap,/astralStlGrossEstimated/);assert.match(farm,/DIAGNOSTICAR FALHA para identificar save/);
 assert.match(game,/const progressGuide=document.getElementById\('v95ProgressGuideText'\)/);
 assert.match(game,/levelXpThreshold\(level\+1\)/);
 assert.match(game,/\['X-7',15\]/);
 assert.match(game,/className='v96-mission-guide'/);
 assert.match(game,/X-7 contém somente dois Apex Overlord lendários/);
});
test('V97: versão, APK e assets preservados',()=>{
 assert.match(JSON.parse(read('package.json')).version,/^47\.7\.(53|56)$/);
 for(const file of ['public/assets/v65/ships/top/phoenix.webp','public/assets/v65/aux/aux9.webp','public/modules/stellar-autopilot-v48.js','server/offline-farm-v484.js'])assert.ok(existsSync(join(root,file)),file);
});
