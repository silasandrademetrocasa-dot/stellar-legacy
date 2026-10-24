// Stellar Legacy V57 - Administração organizada, sem alterar contratos da API.
// Todos os editores legados continuam com os próprios handlers/autorização.
const modal = document.getElementById('adminModal');
const nav = document.getElementById('v57AdmNav');
const subnav = document.getElementById('v57AdmSubnav');
const locationLabel = document.getElementById('v57AdmLocation');
const farmMount = document.getElementById('v57AdmFarmMount');
const farmSection = document.getElementById('v57AdmFarmArea');

const CATEGORIES = [
 {id:'overview',icon:'◈',title:'PAINEL',subtitle:'Visão geral',items:[{label:'Monitor ao vivo',mode:'overview'},{label:'Telemetria',mode:'overview',focus:'adminTelemetrySummary'}]},
 {id:'players',icon:'♙',title:'JOGADORES',subtitle:'Contas e permissões',items:[{label:'Buscar jogadores',mode:'players',focus:'adminSearchInput'},{label:'Banimentos e reset',mode:'players',focus:'adminUserList'}]},
 {id:'world',icon:'◇',title:'MUNDO',subtitle:'Mapas e NPCs',items:[{label:'Mapas',tab:'world',world:'maps'},{label:'NPCs e spawns',tab:'world',world:'npcs'},{label:'Minérios',tab:'world',world:'resources'},{label:'Setores',tab:'world',world:'sectors'},{label:'Box bônus',tab:'world',world:'box'},{label:'Rotas e portais',tab:'world',world:'portals'}]},
 {id:'universe',icon:'✦',title:'UNIVERSO',subtitle:'Expansão e portais',items:[{label:'Portais astrais',tab:'portals'},{label:'Abrir Universo',action:'universe'},{label:'Relés e domínio',action:'warfront'}]},
 {id:'farm',icon:'◷',title:'FARM',subtitle:'Offline e sessões',items:[{label:'Regras e sessões',mode:'farm'}]},
 {id:'combat',icon:'⚔',title:'COMBATE',subtitle:'Relés e balanceamento',items:[{label:'Balanceamento',tab:'balance'},{label:'WarBot e eventos',tab:'events',focus:'warbotAdminRoot'},{label:'Relés / clãs',action:'warfront'}]},
 {id:'economy',icon:'◈',title:'ECONOMIA',subtitle:'Loja e benefícios',items:[{label:'Preços e lojas',tab:'shops'},{label:'Economia',tab:'systems',systems:'economy'},{label:'Cupons',tab:'coupons'},{label:'Passe de batalha',tab:'pass'}]},
 {id:'events',icon:'✧',title:'EVENTOS',subtitle:'Calendário e recompensas',items:[{label:'Eventos galácticos',tab:'events'},{label:'Prêmios astrais',action:'astral'}]},
 {id:'systems',icon:'⚙',title:'SISTEMAS',subtitle:'Missões e interface',items:[{label:'Missões',tab:'systems',systems:'missions'},{label:'Crafting',tab:'systems',systems:'crafting'},{label:'Interface do jogo',tab:'interface'}]},
 {id:'audit',icon:'▣',title:'SEGURANÇA',subtitle:'Logs e antifraude',items:[{label:'Incidentes',mode:'audit',focus:'adminSecurityIncidents'},{label:'Histórico de ações',mode:'audit',focus:'adminActionLog'}]}
];
const registry = new Map(CATEGORIES.map(category=>[category.id,category]));
let currentCategory = 'overview';
let currentSubitem = 0;

function moveFarm(){
 const details = document.getElementById('v485-adm-farm');
 if(details && farmMount && details.parentElement!==farmMount){
  farmMount.replaceChildren(details);
  // The Farm module already owns loading/saving and its session cancellation handlers.
  details.open = currentCategory==='farm';
 }
}
function revealMode(mode){
 if(!modal)return;
 modal.dataset.v57Mode=mode;
 farmSection?.classList.toggle('hidden',mode!=='farm');
}
function navigateEditor(tab,view){
 const button=modal?.querySelector(`#adminRuntimeTabs [data-admin-runtime-tab="${tab}"]`);
 if(!button)return false;
 revealMode('editor');
 button.click();
 if(view?.world)modal.querySelector(`#adminRuntimeWorldTabs [data-admin-world-view="${view.world}"]`)?.click();
 if(view?.systems)modal.querySelector(`#adminRuntimeSystemsTabs [data-admin-systems-view="${view.systems}"]`)?.click();
 return true;
}
function jumpToControl(id){
 // The view is already visible; scroll inside the modal without triggering a save.
 const target=document.getElementById(id);
 if(target?.isConnected){target.scrollIntoView({behavior:'smooth',block:'nearest'});}
}
function openLegacy(id){
 const button=document.getElementById(id);
 if(!button||button.disabled)return;
 modal?.classList.add('hidden');
 button.click();
}
function selectItem(categoryId,index=0,{focus=false}={}){
 const category=registry.get(categoryId);if(!category)return;
 const item=category.items[index]||category.items[0];
 currentCategory=categoryId;currentSubitem=index;
 nav?.querySelectorAll('[data-v57-category]').forEach(b=>{
  const active=b.dataset.v57Category===categoryId;
  b.classList.toggle('active',active);
  b.setAttribute('aria-current',active?'page':'false');
 });
 subnav.replaceChildren();
 category.items.forEach((route,i)=>{
  const b=document.createElement('button');b.type='button';b.textContent=route.label;
  b.className='v57-adm-tool'+(index===i?' active':'');
  b.setAttribute('aria-pressed',String(index===i));
  b.dataset.v57Tool=String(i);subnav.append(b);
 });
 if(locationLabel)locationLabel.textContent=`${category.title}  /  ${item.label}`;
 if(item.tab){navigateEditor(item.tab,item);}
 else if(item.mode){if(item.mode==='overview')navigateEditor('runtime');revealMode(item.mode);if(item.mode==='farm')moveFarm();}
 else if(item.action==='universe'){openLegacy('frontierExpansionBtnV42');}
 else if(item.action==='warfront'){openLegacy('warfrontBtn');}
 else if(item.action==='astral'){
  navigateEditor('events');
  const toggle=document.getElementById('astralAdminOpenV381');
  const panel=document.getElementById('astralAdminEditorV381');
  if(toggle && panel?.classList.contains('hidden'))toggle.click();
  panel?.scrollIntoView({behavior:'smooth',block:'nearest'});
 }
 if(focus&&item.focus)requestAnimationFrame(()=>jumpToControl(item.focus));
}
function boot(){
 if(!modal||!nav||!subnav)return;
 if(modal.dataset.v57Ready==='1')return;
 modal.dataset.v57Ready='1';
 nav.replaceChildren();
 CATEGORIES.forEach(category=>{
  const b=document.createElement('button');b.type='button';b.dataset.v57Category=category.id;
  b.className='v57-adm-category';
  const icon=document.createElement('span');icon.className='v57-adm-category-icon';icon.textContent=category.icon;
  const label=document.createElement('span');label.className='v57-adm-category-text';
  const title=document.createElement('strong');title.textContent=category.title;
  const subtitle=document.createElement('small');subtitle.textContent=category.subtitle;
  label.append(title,subtitle);b.append(icon,label);nav.append(b);
 });
 nav.addEventListener('click',event=>{
  const b=event.target.closest('[data-v57-category]');if(b)selectItem(b.dataset.v57Category,0);
 });
 subnav.addEventListener('click',event=>{
  const b=event.target.closest('[data-v57-tool]');if(b)selectItem(currentCategory,Number(b.dataset.v57Tool),{focus:true});
 });
 const monitor=modal.querySelector('.admin-runtime-monitor-section');
 if(monitor){const farmObserver=new MutationObserver(moveFarm);farmObserver.observe(monitor,{childList:true,subtree:false});}
 moveFarm();selectItem('overview');
 // Visiting the panel again resets navigation to an informative, non-destructive overview.
 const visibilityObserver=new MutationObserver(()=>{
  if(!modal.classList.contains('hidden')){moveFarm();if(!modal.dataset.v57Mode)selectItem('overview');}
 });
 visibilityObserver.observe(modal,{attributes:true,attributeFilter:['class']});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
