#!/usr/bin/env node
// V48.2.5: cliente, UI e controle de sessão. Sem alteração de contas, SQL, inventário ou preços.
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const needed=p=>{const full=path.join(root,p);if(!fs.existsSync(full))throw Error('V48.2.5 arquivo ausente: '+p);return full;};
const pkg=JSON.parse(fs.readFileSync(needed('package.json'),'utf8'));
const rel=pkg.version;
const file=needed('public/game.js');let game=fs.readFileSync(file,'utf8'),count=0;
function edit(anchor,replacement,label){
  if(game.includes(replacement))return;
  const n=game.split(anchor).length-1;
  if(n!==1)throw Error(`V48.2.5 ${label}: anchor esperado 1, encontrado ${n}`);
  game=game.replace(anchor,replacement);count++;
}
const mapImport=`import {routeMapLayoutV4825} from './modules/route-map-layout-v4825.js?v=${rel}';`;
if(!game.includes(mapImport)){
  const anchor="import { createStellarAutopilotV48 } from './modules/stellar-autopilot-v48.js?v=47.7.6';";
  edit(anchor,anchor+'\n'+mapImport,'import da rota');
}
// Apenas o grafo renderizado muda: canTravelGraphLabel / MAP_GRAPH_LINKS continuam autoritativos.
const oldList="const visibleNodes=MAP_GRAPH_NODES.filter(n=>adminJump||n.id.startsWith(ownedPrefix+'-')||/^4-[123]$/.test(n.id)||/^U-[123]$/.test(n.id));";
const newList="const visibleNodes=routeMapLayoutV4825(MAP_GRAPH_NODES,{admin:adminJump,prefix:ownedPrefix,view:routeMapViewV4825});";
edit(oldList,newList,'posições visuais dos setores');
const where="function renderMapModal(){ensureFrontierGraphV435();";
const add="let routeMapViewV4825='all';\nfunction renderMapModal(){ensureFrontierGraphV435();";
edit(where,add,'filtro do ADM');
const marker="  ui.mapNetwork.innerHTML=html;";
const insert=`  let filters=document.getElementById('v4825RouteFilters');
  if(!filters){
    filters=document.createElement('nav');filters.id='v4825RouteFilters';filters.className='v4825-route-tabs';
    filters.setAttribute('aria-label','Filtrar rotas por território');
    ui.mapNetwork.before(filters);
    filters.addEventListener('click',event=>{const btn=event.target.closest('[data-route-view-v4825]');if(!btn)return;
      routeMapViewV4825=btn.dataset.routeViewV4825;
      renderMapModal();});
  }
  filters.hidden=!adminJump;
  if(adminJump){filters.innerHTML=[['all','TODOS'],['1','TERRA'],['2','MARTE'],['3','JÚPITER']].map(([id,label])=>
     '<button type="button" data-route-view-v4825="'+id+'" aria-pressed="'+String(routeMapViewV4825===id)+'">'+label+'</button>').join('');}
  ui.mapNetwork.dataset.v4825AdminAll=adminJump&&routeMapViewV4825==='all'?'1':'0';
  ${marker}`;
edit(marker,insert,'abas de mapa ADM');
// Distinguir nó bloqueado por nível e ícones sem cobrir o nome.
const oldSub="const sub=active?'ATUAL':!access.ok?access.reason:adminJump?'SALTO ADM • LIVRE':jumps>0?'1 BÔNUS DE SALTO':'USE OS PORTAIS';";
const newSub="const sub=active?'VOCÊ ESTÁ AQUI':!access.ok?(/^Requer nível/i.test(access.reason)?`LV ${graphLevelRequirement(node.id)}`:'BLOQUEADO'):adminJump?'ADM • SALTO LIVRE':jumps>0?'SALTO DISPONÍVEL':'PORTAL';";
edit(oldSub,newSub,'status compacto do mapa');
// Compras: na base usa a operação de compra NORMAL, sem CPU; fora dela AUTO BUY exige CPU no servidor.
const oldBuy="buyPackage:(key,kind)=>runAutoBuy(key,kind==='ammo'?'Munição Autopilot':'Mísseis Autopilot'),";
const newBuy="buyPackage:(key,kind)=>isAtTrader()?applyAuthoritativePurchase(key,kind==='ammo'?'Munição Autopilot':'Mísseis Autopilot'):(autoBuyEnabled()?runAutoBuy(key,kind==='ammo'?'Munição Autopilot':'Mísseis Autopilot'):Promise.resolve(false)),";
edit(oldBuy,newBuy,'comprar na base sem CPU');
// Resolve estoque e cotação de munição em CR, inclusive caso o jogador esteja com munição Elite ativa.
const oldAmmo="ammoQuote:progress?liveQuote('ammo:'+progress.selectedLaserAmmo):null,";
const newAmmo="ammoQuote:progress?([liveQuote('ammo:'+progress.selectedLaserAmmo),liveQuote('ammo:lcb10')].find(q=>q&&q.currency==='credits'&&q.shop_visible!==false)||null):null,";
edit(oldAmmo,newAmmo,'cotar munição comum');
const oldRocket="rocketQuote:progress?liveQuote('rocket:'+progress.selectedRocket):null";
const newRocket="rocketQuote:progress?([liveQuote('rocket:'+progress.selectedRocket),liveQuote('rocket:r310')].find(q=>q&&q.currency==='credits'&&q.shop_visible!==false)||null):null";
edit(oldRocket,newRocket,'cotar míssil comum');
const oldStock="ammoStock:progress?ammoQty(progress.selectedLaserAmmo):0,rocketStock:progress?rocketQty(progress.selectedRocket):0,";
const newStock="ammoStock:progress?ammoQty((([liveQuote('ammo:'+progress.selectedLaserAmmo),liveQuote('ammo:lcb10')].find(q=>q&&q.currency==='credits'&&q.shop_visible!==false)||{}).catalog_key||'').split(':')[1]||progress.selectedLaserAmmo):0,rocketStock:progress?rocketQty((([liveQuote('rocket:'+progress.selectedRocket),liveQuote('rocket:r310')].find(q=>q&&q.currency==='credits'&&q.shop_visible!==false)||{}).catalog_key||'').split(':')[1]||progress.selectedRocket):0,";
edit(oldStock,newStock,'estoque coerente com cotação');
// Remove apenas o toast técnico: mantém log para diagnóstico, sem esconder mensagens de economia e erros.
const oldToast="showToast('Recompensas sincronizadas com o servidor','reward');";
const newToast="console.info('[save-reconcile] Recompensas sincronizadas com o servidor');";
edit(oldToast,newToast,'silenciar toast de sincronização');
if((game.match(/\bconst\s+AUTOPILOT_V48\s*=\s*createStellarAutopilotV48\s*\(/g)||[]).length!==1)throw Error('V48.2.6: esperado exatamente um controlador AUTOPILOT_V48');
if(count)fs.writeFileSync(file,game,'utf8');
let html=fs.readFileSync(needed('public/index.html'),'utf8'),hc=0;
const sheet='<link rel="stylesheet" href="/modules/route-map-layout-v4825.css?v=48.2.5">';
if(!html.includes('/modules/route-map-layout-v4825.css')){
  if(!html.includes('</head>'))throw Error('V48.2.5 HEAD ausente');
  html=html.replace('</head>',`  ${sheet}\n</head>`);hc++;
}
if(hc)fs.writeFileSync(needed('public/index.html'),html,'utf8');
console.log(`✅ V48.2.5 mapa + bot: game=${count} html=${hc}`);
