// ADM-only visual view of the public world config. No game frame loop, no writes.
import {loadFrontierAuditV450} from '../api.js?v=47.0.0';
let generation=0;
const el=(tag,label)=>{const x=document.createElement(tag);if(label!=null)x.textContent=String(label);return x;};
export async function renderFrontierAuditV450(root,tab,isAdmin){
 if(tab!=='admin'||isAdmin!==true)return;
 const current=++generation,card=el('section','Conferindo navegação, NPCs e raids…');
 card.className='frontier-card-v42';root.append(card);
 async function refresh(){
  card.replaceChildren(el('h4','DIAGNÓSTICO DO UNIVERSO'));
  const status=el('p','Sincronizando informações oficiais…');card.append(status);
  try{
   const reply=await loadFrontierAuditV450();
   if(current!==generation||!card.isConnected)return;
   if(!reply?.ok||!reply.report)throw Error('UNAVAILABLE');
   const d=reply.report;
   status.textContent=`Mapas ${d.totalMaps||0} • Configuração do mundo ${d.worldRevision||0} • NPCs ${d.npcRevision||0}`;
   for(const m of d.maps||[]){
    const line=el('div',`${m.label} — ${m.name} • ${m.enabled?'ATIVO':'DESATIVADO'} • ${m.spawnTypes||0} grupos de NPC • ${m.resourceTypes||0} minérios`);
    card.append(line);
   }
   const heading=el('h4','PORTAIS E ROTAS');card.append(heading);
   for(const p of d.routes||[]){card.append(el('div',`${p.from} ⇄ ${p.to}: ${p.enabled?'ATIVO':'DESATIVADO'}`));}
   const raid=d.raid||{};
   card.append(el('h4','RAID SEMANAL'));
   card.append(el('p',raid.enabled?`ATIVA • ${raid.target||0} chefes • mínimo ${raid.minimum||0} por piloto • ${raid.reward||0} pesquisa`:'DESATIVADA'));
   if((d.maps||[]).length!==3||(d.routes||[]).length!==5||(d.maps||[]).some(m=>m.spawnTypes===0)){
    card.append(el('p','ATENÇÃO: verifique os cadastros dos novos setores e os NPCs no painel Mundo & Mapas.'));
   }
  }catch{if(current===generation&&card.isConnected)status.textContent='Diagnóstico indisponível. Reabra esta aba e tente novamente.';}
  if(current===generation&&card.isConnected){const button=el('button','ATUALIZAR DIAGNÓSTICO');button.type='button';button.onclick=()=>{button.disabled=true;void refresh()};card.append(button);}
 }
 void refresh();
}
