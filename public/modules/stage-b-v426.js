import {stellarConfirmV4776,stellarNoticeV4776} from './stellar-dialog-v4776.js?v=47.7.6';
// V42.4–42.6 | lightweight, on-demand Universe panels; no animation-frame hooks.
import {loadExplorationV426,startSectorV426,claimSectorV426,loadMarketV426,offerMarketV426,buyMarketV426,cancelMarketV426,
 loadClanProjectsV426,fundClanProjectV426,adminSectorV426,adminMarketV426,adminClanV426} from '../api.js?v=47.7.6';
const fmt=x=>Number(x||0).toLocaleString('pt-BR');
const node=(tag,txt,cls)=>{const el=document.createElement(tag);if(txt!==undefined)el.textContent=String(txt);if(cls)el.className=cls;return el;};
const valid=(v,min,max)=>Number.isSafeInteger(Number(v))&&Number(v)>=min&&Number(v)<=max;
let ticket=0;
function button(txt,cb){const b=node('button',txt);b.type='button';b.onclick=async()=>{
 if(b.disabled)return;b.disabled=true;
 try{await cb();}catch(e){await stellarNoticeV4776(e?.message||'Não foi possível concluir esta ação. Tente novamente.')}finally{b.disabled=false;}
};return b;}
const isAlive=(p,root,n)=>p.isConnected&&root.contains(p)&&n===ticket;
function input(label,value,min,max){const wrap=node('label',label+' ');const i=node('input');i.type='number';i.min=min;i.max=max;i.value=value;i.className='frontier-input-v42';wrap.append(i);return [wrap,i];}
function toggle(label,value){const wrap=node('label',label+' '),i=node('input');i.type='checkbox';i.checked=!!value;wrap.append(i);return [wrap,i];}
async function loadOne(f,p,root,n,render){const data=await f();if(!isAlive(p,root,n))return;render(data);}
async function drawExploration(p,root,n){
 await loadOne(loadExplorationV426,p,root,n,data=>{
  p.replaceChildren(node('h4','EXPLORAÇÃO DE ANOMALIAS'),node('p','Explore investigações especiais e conclua objetivos para ganhar recompensas; estas áreas ainda não são mapas pilotáveis.'),node('small','Pesquisa disponível: '+fmt(data.research)));
  const chart=node('div',undefined,'frontier-sectors-v426');
  for(const s of data.sectors||[]){const card=node('article',undefined,'frontier-sector-v426'),star=node('div','✦','frontier-sector-star-v426');card.append(star,node('strong',s.title),node('small',s.lore));
   card.append(node('div',`${s.minutes} min · ${s.kills} NPCs · Custo ${fmt(s.cost)} pesquisa · Ganho ${fmt(s.reward)}`));
   if(s.enabled&&!data.active)card.append(button('INICIAR INVESTIGAÇÃO',async()=>{if(!await stellarConfirmV4776(`Investir ${fmt(s.cost)} pontos na investigação?`))return;await startSectorV426(s.code,crypto.randomUUID());await drawExploration(p,root,n);}));
   else if(!s.enabled)card.append(node('small','Setor temporariamente desativado pelo ADM.'));
   chart.append(card);
  }
  p.append(chart);
  if(data.active){const a=data.active,ready=Date.now()>=Date.parse(a.readyAt);const card=node('section',undefined,'frontier-card-v42');card.append(node('h4','Investigação em andamento: '+a.sector),node('p',`${fmt(a.verifiedKills)}/${fmt(a.required)} abates válidos. Liberação: ${new Date(a.readyAt).toLocaleString('pt-BR')}.`));
   if(ready&&a.verifiedKills>=a.required)card.append(button('RESGATAR +'+fmt(a.reward)+' PESQUISA',async()=>{await claimSectorV426(a.id);await drawExploration(p,root,n);}));
   else card.append(node('small','O tempo e os abates verificados precisam estar completos.'));p.append(card);}
  p.append(node('small',`Investigação concluída: ${(data.history||[]).length} registros recentes.`));
 });
}
function renderOffers(card,p,root,n,market){
 card.replaceChildren(node('h4','MERCADO INTERGALÁCTICO'),node('p','Negocie módulos Astrais com outros pilotos. Os itens anunciados ficam reservados até a venda ou o cancelamento.'),node('small',`Créditos: ${fmt(market.credits)} · Taxa: ${(market.feeBps||0)/100}%`));
 if(!market.enabled){card.append(node('p','Mercado temporariamente suspenso pelo ADM.'));return;}
 const sale=node('section',undefined,'frontier-card-v42');sale.append(node('h4','ANUNCIAR MÓDULO'));
 const stock=(market.stock||[]).filter(x=>Number(x.quantity)-Number(x.equipped)>0);
 if(!stock.length)sale.append(node('small','Sem itens livres para anunciar (módulos equipados ficam protegidos).'));
 else{
  const sel=node('select');sel.className='frontier-input-v42';for(const x of stock){const opt=node('option',`${x.item} — ${fmt(x.quantity-x.equipped)} livre(s)`);opt.value=x.item;sel.append(opt);}
  const [ql,q]=input('Quantidade',1,1,5),[pl,price]=input('Preço unitário (CR)',100000,1000,100000000);sale.append(sel,ql,pl);
  sale.append(button('ANUNCIAR',async()=>{const quantity=Number(q.value),unitPrice=Number(price.value);if(!valid(quantity,1,5)||!valid(unitPrice,1000,100000000))throw Error('Preço/quantidade inválidos');if(!await stellarConfirmV4776(`Anunciar ${quantity} módulo(s) por ${fmt(unitPrice)} CR cada?`))return;await offerMarketV426(sel.value,quantity,unitPrice,crypto.randomUUID());await drawCivil(p,root,n);}));
 }
 card.append(sale,node('h4','OFERTAS DISPONÍVEIS'));
 for(const x of market.offers||[]){const row=node('section',undefined,'frontier-card-v42');row.append(node('strong',`${x.item} · ${x.quantity}× ${fmt(x.unitPrice)} CR`),node('div','Piloto: '+x.sellerName));
  if(x.mine)row.append(node('small','Sua oferta'));
  else row.append(button('COMPRAR POR '+fmt(Number(x.quantity)*Number(x.unitPrice))+' CR',async()=>{if(!await stellarConfirmV4776('Confirmar a compra com créditos do jogo?'))return;await window.stellarEconomySyncBeforeV4776?.();await buyMarketV426(x.id);await window.stellarEconomySyncAfterV4776?.();await drawCivil(p,root,n);}));card.append(row);
 }
 if(!(market.offers||[]).length)card.append(node('small','Nenhuma oferta aberta.'));
 const own=(market.mine||[]).filter(x=>x.status==='open');if(own.length)card.append(node('h4','MEUS ANÚNCIOS'));
 for(const x of own){const row=node('div',`${x.item} · ${x.quantity}× ${fmt(x.price)} CR  `,'frontier-card-v42');row.append(button('CANCELAR E DEVOLVER ITENS',async()=>{await cancelMarketV426(x.id);await drawCivil(p,root,n);}));card.append(row);}
}
function renderClan(card,p,root,n,c){
 card.replaceChildren(node('h4','INFRAESTRUTURA DOS CLÃS'),node('p','Invista suas pesquisas para desenvolver novas instalações do clã.'));
 if(!c.hasClan){card.append(node('small','Entre em um clã para contribuir.'));return;}
 card.append(node('small','Sua pesquisa disponível: '+fmt(c.research)));
 for(const x of c.structures||[]){const row=node('section',undefined,'frontier-card-v42'),goal=Number(x.goal)||1,total=Number(x.total)||0;
  row.append(node('strong',x.title),node('div',`${fmt(total)} / ${fmt(goal)} pontos (${Math.min(100,Math.round(100*total/goal))}%)`));
  if(x.enabled){const [lab,inp]=input('Contribuir pesquisa',10,1,500);row.append(lab,button('INVESTIR NO CLÃ',async()=>{const points=Number(inp.value);if(!valid(points,1,500))throw Error('Quantidade inválida');if(!await stellarConfirmV4776(`Doar ${points} pontos ao clã?`))return;await fundClanProjectV426(x.code,points,crypto.randomUUID());await drawCivil(p,root,n);}));}
  else row.append(node('small','Estrutura pausada pelo ADM.'));card.append(row);}
}
async function drawCivil(p,root,n){p.replaceChildren(node('h4','Carregando Mercado e Clãs…'));const [market,clan]=await Promise.all([loadMarketV426(),loadClanProjectsV426()]);if(!isAlive(p,root,n))return;
 const m=node('section',undefined,'frontier-card-v42'),c=node('section',undefined,'frontier-card-v42');p.replaceChildren(m,c);renderOffers(m,p,root,n,market);renderClan(c,p,root,n,clan);}
async function drawAdmin(p,root,n){
 p.replaceChildren(node('h4','CENTRAL DE EXPANSÕES'));
 const [exp,market,clan]=await Promise.all([loadExplorationV426(),loadMarketV426(),loadClanProjectsV426()]);if(!isAlive(p,root,n))return;
 p.append(node('p','Gerencie os objetivos das investigações. Atividades iniciadas mantêm suas condições originais.'));
 for(const s of exp.sectors||[]){const card=node('section',undefined,'frontier-card-v42');card.append(node('strong','Setor: '+s.title));const vals=[];
  for(const [label,key,min,max] of [['Minutos','minutes',5,1440],['NPCs','kills',5,10000],['Custo de pesquisa','cost',0,10000],['Prêmio','reward',1,5000]]){const [wrap,inp]=input(label,s[key],min,max);vals.push(inp);card.append(wrap);}
  const [lab,en]=toggle('Ativo',s.enabled);card.append(lab,button('SALVAR SETOR',async()=>{const [minutes,kills,cost,reward]=vals.map(v=>Number(v.value));await adminSectorV426(s.code,minutes,kills,cost,reward,en.checked);await drawAdmin(p,root,n);}));p.append(card);}
 const m=node('section',undefined,'frontier-card-v42');m.append(node('h4','Mercado'));const [w,fee]=input('Taxa (pontos-base, 300=3%)',market.feeBps,0,1500),[lab,en]=toggle('Ativo',market.enabled);
 m.append(w,lab,button('SALVAR TAXA',async()=>{await adminMarketV426(Number(fee.value),en.checked);await drawAdmin(p,root,n);}));p.append(m);
 for(const s of clan.structures||[]){const c=node('section',undefined,'frontier-card-v42');c.append(node('h4','Clã: '+s.title));const [w,goal]=input('Meta de pesquisa',s.goal,100,100000),[lab,on]=toggle('Ativo',s.enabled);
  c.append(w,lab,button('SALVAR PROJETO',async()=>{await adminClanV426(s.code,Number(goal.value),on.checked);await drawAdmin(p,root,n);}));p.append(c);}
}
export async function renderStageBV426(root,tab){
 if(!['scout','civil','admin'].includes(tab))return;
 const n=++ticket,p=node('section','Preparando novas atividades…','frontier-card-v42 frontier-final-v426');root.append(p);
 try{if(tab==='scout')await drawExploration(p,root,n);if(tab==='civil')await drawCivil(p,root,n);if(tab==='admin')await drawAdmin(p,root,n)}
 catch(e){if(isAlive(p,root,n))p.textContent='Este painel está temporariamente indisponível. Tente novamente.'}
}
