#!/usr/bin/env node
/**
 * Stellar Legacy • Fase 3 V48.3.0
 * Aplica as mudanças DEPOIS dos patches V48/V48.2.5, pelo npm run check.
 * Falha sem escrever nada se o código-base esperado não for encontrado.
 * Nunca edita saves, créditos, entitlements, tabelas ou SQL.
 */
import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.cwd();
const TAG='STELLAR_AUTOPILOT_PHASE3_V483';
const apFile=path.join(ROOT,'public/modules/stellar-autopilot-v48.js');
const gameFile=path.join(ROOT,'public/game.js');
function read(f){if(!fs.existsSync(f))throw Error('V48.3 arquivo ausente: '+path.relative(ROOT,f));return fs.readFileSync(f,'utf8');}
function swap(s,before,after,label){
  if(!s.includes(before))throw Error(`V48.3 incompatibilidade em ${label} (nenhum arquivo foi atualizado)`);
  if(s.split(before).length!==2)throw Error(`V48.3 ancora duplicada em ${label}`);
  return s.replace(before,after);
}
function swapRe(s,re,make,label){
  const matches=[...s.matchAll(new RegExp(re.source,re.flags.includes('g')?re.flags:re.flags+'g'))];
  if(matches.length!==1)throw Error(`V48.3 ${label}: esperada 1 funcao, encontrada(s) ${matches.length}`);
  return s.replace(re,make);
}
let autopilot=read(apFile),game=read(gameFile);
if(autopilot.includes(TAG)){
  if(!game.includes(TAG))throw Error('V48.3 instalação parcial detectada: Autopilot instalado, controlador não atualizado. Conferir diff antes de repetir.');
  console.log('✅ V48.3 Autopilot já aplicado (idempotente)');
  process.exit(0);
}
if(game.includes(TAG))throw Error('V48.3 marcador divergente no controlador (instalação parcial).');
const controllerCount=(game.match(/\bconst\s+AUTOPILOT_V48\s*=\s*createStellarAutopilotV48\s*\(/g)||[]).length;
if(controllerCount!==1)throw Error(`V48.3 esperado um controlador Autopilot; encontrados ${controllerCount}.`);

// Só consideramos baixa a munição ABAIXO do limite escolhido. A loja oficial
// fornece cotação em CR e a autorização remota é conferida pelo servidor.
autopilot=swap(autopilot,
  "  const lowLaser=c.autoBuy&&Number(s.ammoStock)<=c.ammoMin&&affordable(s.ammoQuote);\n  const lowRocket=c.autoBuy&&c.rockets&&Number(s.rocketStock)<=c.rocketMin&&affordable(s.rocketQuote);",
  "  const lowLaser=c.autoBuy&&Number(s.ammoStock)<c.ammoMin&&affordable(s.ammoQuote);\n  const lowRocket=c.autoBuy&&c.rockets&&Number(s.rocketStock)<c.rocketMin&&affordable(s.rocketQuote);",
  'cotações do reabastecimento');
// Evitar venda em mapas que não têm comércio autorizado.
autopilot=swap(autopilot,
  "    if(s.canSell)return {type:'sell',reason:'Vendendo recursos no comércio oficial'};",
  "    if(map==='x1'&&s.canSell)return {type:'sell',reason:'Vendendo recursos no comércio oficial'};",
  'venda somente na base');
// Evita loops repetidos durante saltos, vendas e recargas.
autopilot=swap(autopilot,
  '  let panel=null,fab=null,grantCache=new Map(),refreshingAccess=false,lastPurchaseAttempt=0,lastHealthyAt=0,lastMapId=null;',
  `  let panel=null,fab=null,grantCache=new Map(),refreshingAccess=false,lastPurchaseAttempt=0,lastHealthyAt=0,lastMapId=null;
  // ${TAG}: checkpoints somente em memoria durante a aba conectada.
  let pendingJump=null,lastPortalAttempt=0,nextRouteSearch=0,routeMisses=0,nextSaleAttempt=0,buyFailuresInRow=0,lastCheckpointAt=0;`,
  'estado de recuperação');
// Estado de sessão NA ABA (sessionStorage): somente a intenção do bot e o
// orçamento gasto. Não contém tokens, inventário nem saldo. Após reload,
// revalida acesso do servidor e espera snapshot online antes de reativar.
autopilot=swap(autopilot,
  '  const now=()=>Date.now();',
  `  const now=()=>Date.now();
  const resumeKey='stellar_autopilot_phase3_v483_resume';
  function clearResume(){try{sessionStorage.removeItem(resumeKey);}catch{}}
  function checkpoint(force=false){
    if(!running)return;
    const ts=now();if(!force&&ts-lastCheckpointAt<15000)return;
    lastCheckpointAt=ts;
    const user=String(getIdentity()||'');if(!user)return;
    try{sessionStorage.setItem(resumeKey,JSON.stringify({user,config,started,spent,attempts,failures,boxes,drops,ores,storedAt:ts}));}catch{}
  }
  function restoreCheckpoint(){
    if(running||!accessReady())return false;
    let saved;try{saved=JSON.parse(sessionStorage.getItem(resumeKey)||'null');}catch{return false;}
    if(!saved)return false;
    const ts=now(),user=String(getIdentity()||'');
    if(!user||saved.user!==user||!Number.isFinite(saved.storedAt)||ts-saved.storedAt>180000||
        !Number.isFinite(saved.started)||ts-saved.started>360*60000){clearResume();return false;}
    const s=getSnapshot();
    if(!s?.online||!s.ready||!AUTOPILOT_ALLOWED_MAPS.includes(s.map))return false;
    const recovered=cleanAutopilotConfig(saved.config);
    if(ts-saved.started>recovered.minutes*60000){clearResume();return false;}
    config=recovered;started=saved.started;spent=number(saved.spent,0,recovered.budget,0);
    attempts=number(saved.attempts,0,1000000,0);failures=number(saved.failures,0,1000000,0);
    boxes=number(saved.boxes,0,1000000,0);drops=number(saved.drops,0,1000000,0);ores=number(saved.ores,0,1000000,0);
    ended=0;lastProgress=stats(s);startStats=lastProgress;lastHealthyAt=ts;lastMapId=s.map;
    pendingJump=null;lastPortalAttempt=0;nextRouteSearch=0;routeMisses=0;nextSaleAttempt=0;buyFailuresInRow=0;
    running=true;lastTickAt=0;checkpoint(true);
    notify('Sessão restaurada e acesso validado • retomando '+config.map.toUpperCase());return true;
  }`,
  'checkpoint seguro de navegação');
autopilot=swap(autopilot,
  'stopFire=()=>{},fireRocket,sellCargo,buyPackage,onNotice=()=>{}}={})',
  'stopFire=()=>{},fireRocket,sellCargo,buyPackage,ensureCombatAmmo=()=>true,onNotice=()=>{}}={})',
  'callback de seleção segura de munição');
autopilot=swap(autopilot,
  "  function stop(why='Interrompido'){running=false;busy=false;stopFire();reason=why;ended=now();",
  "  function stop(why='Interrompido'){running=false;busy=false;pendingJump=null;clearResume();stopFire();reason=why;ended=now();",
  'encerramento da sessão');
// Chegada em setor/página recarregada: só retomar com grant oficial renovado.
autopilot=swap(autopilot,
  "        lastAccessAt=now();nextAccessAt=now()+45000;",
  "        lastAccessAt=now();nextAccessAt=now()+45000;\n        if(allowed&&!running)restoreCheckpoint();",
  'retomada após validação oficial');
// Selecionar, por padrão, o mapa em que o piloto está. Respeitar as mudanças
// que o jogador fizer no menu antes de iniciar uma sessão.
autopilot=swap(autopilot,
  '    panel.hidden=false;panelOpen=true;renderStatus();',
  `    if(!panel.dataset.phase3MapInitialized&&!running){
      const m=getSnapshot()?.map, select=panel.querySelector('[data-ap-field="map"]');
      if(select&&AUTOPILOT_ALLOWED_MAPS.includes(m)){select.value=m;config.map=m;}
      panel.dataset.phase3MapInitialized='1';
    }
    panel.hidden=false;panelOpen=true;renderStatus();`,
  'mapa inicial da rota');
autopilot=swap(autopilot,
  "    lastHealthyAt=now();lastMapId=s.map;running=true;notify('Rota '+config.map.toUpperCase()+' iniciada');}",
  "    lastHealthyAt=now();lastMapId=s.map;pendingJump=null;lastPortalAttempt=0;nextRouteSearch=0;routeMisses=0;nextSaleAttempt=0;buyFailuresInRow=0;running=true;checkpoint(true);notify('Rota '+config.map.toUpperCase()+' iniciada');}",
  'reset de sessão');
// Nada de compra duplicada quando a resposta do servidor está em andamento.
// Após repetidas recusas, encerra com erro explícito em vez de criar loop de gasto.
autopilot=swap(autopilot,
  "if(!q||!q.catalog_key||q.shop_visible===false||Number(opt.stock)>=opt.min||q.currency!=='credits')continue;",
  "if(!q||!q.catalog_key||q.shop_visible===false||Number(opt.stock)>=opt.min||q.currency!=='credits'||(opt.kind==='rocket'&&!config.rockets))continue;",
  'filtro da compra');
autopilot=swap(autopilot,
  "if(ok){spent+=cost;notify('Reabastecimento validado pelo servidor');}else failures++;}catch(e){failures++;notify('Compra recusada: '+e.message);}finally{busy=false;}break;",
  `if(ok){spent+=cost;buyFailuresInRow=0;notify('Reabastecimento validado pelo servidor');}
        else{failures++;buyFailuresInRow++;notify('Compra não confirmada pelo servidor');}}
      catch(e){failures++;buyFailuresInRow++;notify('Compra recusada: '+String(e?.message||e).slice(0,100));}
      finally{busy=false;}
      if(buyFailuresInRow>=3)stop('Compra não autorizada após 3 tentativas; verifique loja, saldo e CPU');
      break;`,
  'compra confirmada e sem repetição infinita');

// Há ticks em que a viagem concluiu na rede, mas a lista de portais ainda
// reflete o setor anterior. Esperar a transição; não saltar duas vezes.
const ROUTE=`  async function routeTo(s,map){
    const ts=now();
    if(ts<nextRouteSearch)return;
    const from=getGraphLabel(),want=getGoalLabel(map);
    if(!from||!want){nextRouteSearch=ts+1800;notify('Aguardando grafo de portais');return;}
    const path=findAutopilotPortalPath(from,want,getPortals,mayTravel);
    if(!path){
      nextRouteSearch=ts+2400;routeMisses++;
      if(routeMisses>=8){stop('Sem rota liberada para '+want+' (8 verificações)');return;}
      notify('Recalculando rota para '+want);return;
    }
    routeMisses=0;
    if(!path.length){pendingJump=null;return;}
    const p=path[0];
    if(pendingJump&&pendingJump.from===from&&pendingJump.to===p.targetLabel){
      if(ts-pendingJump.at<18000){notify('Aguardando confirmação de portal → '+p.targetLabel);return;}
      pendingJump=null;failures++;notify('Portal sem confirmação: recalculando');
    }
    const distance=dist(s.player,p);
    if(distance>43){navigate(p.x,p.y);notify('Portal → '+p.targetLabel);return;}
    if(busy||ts-lastPortalAttempt<4500)return;
    lastPortalAttempt=ts;busy=true;checkpoint(true);
    try{
      const accepted=await jumpPortal(p);
      if(accepted===false)throw Error('Viagem recusada pelo jogo');
      if(!running)return;
      pendingJump={from,to:p.targetLabel,at:now()};
      notify('Transição de mapa → '+p.targetLabel);
    }catch(e){failures++;nextRouteSearch=now()+3500;notify('Portal: '+String(e?.message||e).slice(0,90));}
    finally{busy=false;}
  }
`;
autopilot=swapRe(autopilot,/  async function routeTo\(s,map\)\{[\s\S]*?\n  \}\n(?=  function tick\(\))/,ROUTE,'controlador de portais');
autopilot=swap(autopilot,
  "    if(lastMapId!==s.map){lastMapId=s.map;notify('Setor '+String(s.map||'').toUpperCase()+' conectado • retomando rota');}",
  `    if(lastMapId!==s.map){
      lastMapId=s.map;pendingJump=null;routeMisses=0;nextRouteSearch=0;
      notify('Setor '+String(s.map||'').toUpperCase()+' conectado • retomando rota');
    }
    if(pendingJump){
      if(getGraphLabel()!==pendingJump.from){pendingJump=null;routeMisses=0;}
      else if(ts-pendingJump.at<18000){notify('Confirmando chegada ao próximo mapa');return;}
      else {pendingJump=null;failures++;notify('Portal demorou: nova tentativa controlada');}
    }
    if(ts<nextSaleAttempt&&s.map==='x1'&&config.autoSell&&Number(s.cargoUsed)/Math.max(1,Number(s.cargoCapacity))>=config.cargoThreshold/100){
      notify('Aguardando confirmação da venda no servidor');return;
    }`,
  'retomada após portal e comércio');
// Em reload, o tick revalida a autorização primeiro, sem farm offline.
autopilot=swap(autopilot,
  "  function tick(){if(!running)return;const ts=now();",
  "  function tick(){if(!running){if(allowed&&accessReady())restoreCheckpoint();return;}const ts=now();",
  'retomada autorizada no tick');
autopilot=swap(autopilot,
  "    lastHealthyAt=ts;\n    if(lastMapId!==s.map){",
  "    lastHealthyAt=ts;checkpoint();\n    if(lastMapId!==s.map){",
  'persistencia periódica da sessão');
// Preservar a sequência usada em testes antigos: if(busy)return; const action...
autopilot=swap(autopilot,
  "    if(action.type==='sell'){busy=true;Promise.resolve(sellCargo()).then(()=>notify('Venda finalizada')).catch(e=>{failures++;notify('Falha na venda: '+e.message);}).finally(()=>{busy=false;});return;}",
  `    if(action.type==='sell'){
      if(ts<nextSaleAttempt)return;
      nextSaleAttempt=ts+6500;busy=true;
      Promise.resolve().then(()=>sellCargo()).then(ok=>{
        if(ok===false){failures++;notify('Venda não confirmada pela loja');}
        else notify('Venda enviada • aguardando sincronização');
      }).catch(e=>{failures++;notify('Falha na venda: '+String(e?.message||e).slice(0,100));})
        .finally(()=>{busy=false;});
      return;
    }
    if((action.type==='hunt'||collectingWhileFiring)&&!ensureCombatAmmo()){
      stopFire();notify('Sem munição utilizável • aguardando reposição');return;
    }`,
  'venda segura e laser selecionado');
// O tick ainda exige autorização confirmada, recursos do jogador e mapa PvE.
autopilot=autopilot.replace('/* Stellar Legacy V48 — Autopilot assistido (sessão aberta).',`/* ${TAG} • Fase 3: rotas, comércio e munição controlados. */\n/* Stellar Legacy V48 — Autopilot assistido (sessão aberta).`);

// Integrar seleção local de munição comum APENAS se a escolhida acabou.
// Não altera preço ou saldo; compra passa exclusivamente pela loja real.
const fireAnchor='  fireRocket:()=>fireRocket(false),';
const combatSelector=`  // ${TAG}: a cotação em CR pode comprar LCB10 sem ela ser a munição selecionada.
  ensureCombatAmmo:()=>{
    if(!progress)return false;
    if(ammoQty(progress.selectedLaserAmmo)>0)return true;
    const next=['lcb10','mcb25','mcb50'].find(id=>ammoQty(id)>0);
    if(!next)return false;
    progress.selectedLaserAmmo=next;
    updateUI();return true;
  },
`;
game=swap(game,fireAnchor,combatSelector+fireAnchor,'fallback de munição para farm');

// Sem alterações se a instância de controle tiver duplicação ou faltas.
if((game.match(/\bconst\s+AUTOPILOT_V48\s*=\s*createStellarAutopilotV48\s*\(/g)||[]).length!==1)
  throw Error('V48.3 integração cancelada: duplicação do Autopilot.');
// Só gravar após TODAS as validações.
fs.writeFileSync(apFile,autopilot,'utf8');
fs.writeFileSync(gameFile,game,'utf8');
console.log('✅ Fase 3 V48.3 instalada: persistência na troca de mapa, retorno X-1, comércio, munição, travas anti-loop.');
