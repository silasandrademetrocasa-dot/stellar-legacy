// Etapa 1 — V42.2/V42.3: UI leve sob demanda; nunca dentro do loop de jogo.
import {loadStageAV423,saveLoadoutV423,loadOpsV423,claimOpsV423,adminOpsV423} from '../api.js?v=42.6.1';
const cfgs=[1,2];
const slots=[['defense','Defesa'],['engine','Motor'],['weapon','Armamento'],['utility','Suporte']];
const fmt=n=>Number(n||0).toLocaleString('pt-BR');
function node(tag,text,cls){const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e;}
function alertError(e){alert(String(e?.message||e));}
let activeRequest=0;
export async function renderStageAV423(root,tab){
 const index=++activeRequest;const card=node('section','Carregando sistemas da V42.3…','frontier-card-v42 frontier-stage-v423');root.append(card);
 try{
  if(tab==='forge')await forge(card,root,index);
  else if(tab==='war')await war(card,root,index,false);
  else if(tab==='admin')await war(card,root,index,true);
 }catch(e){if(card.isConnected)card.textContent='Módulo V42.3 indisponível: '+String(e?.message||e);}
}
const alive=(card,root,index)=>card.isConnected&&index===activeRequest&&root.contains(card);
async function forge(card,root,index){
 const data=await loadStageAV423();if(!alive(card,root,index))return;
 card.replaceChildren(node('h4','V42.2 • CONFIGURAÇÕES ASTRAIS'));
 card.append(node('p','Equipamentos fabricados são persistidos em duas configurações. Bônus de dano/escudo ainda NÃO estão ativos até validação do motor de combate.'));
 const inventory=new Map((data.items||[]).map(x=>[x.code,Number(x.qty)]));
 const items=Array.isArray(data.definitions)?data.definitions:[];
 const equipped=Array.isArray(data.equipped)?data.equipped:[];
 for(const conf of cfgs){
  const section=node('div',null,'frontier-card-v42');section.append(node('h4',`Configuração ${conf}`));
  for(const [slot,label] of slots){
   const current=equipped.find(x=>Number(x.config)===conf&&x.slot===slot)?.code||'';
   const row=node('div',null,'frontier-v423-row');const name=node('label',`${label}: `);const select=node('select',null,'frontier-input-v42');select.setAttribute('aria-label',`${label}, configuração ${conf}`);
   for(const opt of [{code:'',name:'Nenhum'},...items.filter(m=>m.slot===slot).map(m=>({code:m.code,name:`${m.code} · ${fmt(inventory.get(m.code)||0)} fabricado(s)`}))]){
    const option=node('option',opt.name);option.value=opt.code;option.selected=opt.code===current;select.append(option);
   }
   const save=node('button','EQUIPAR');save.type='button';save.onclick=async()=>{save.disabled=true;try{await saveLoadoutV423(conf,slot,select.value||null);const fresh=await loadStageAV423();if(!card.isConnected)return;data.items=fresh.items;data.equipped=fresh.equipped;await forgeReload(card,root);}catch(e){alertError(e);}finally{save.disabled=false;}};
   name.append(select);row.append(name,save);section.append(row);
  }
  card.append(section);
 }
 card.append(node('small','Quantidade fabricada limita o número de posições ocupadas. Trocas não alteram escudos atuais, atributos PvP ou histórico do piloto.'));
}
async function forgeReload(card,root){const i=++activeRequest;await forge(card,root,i);}
async function war(card,root,index,admin){
 const p=await loadOpsV423();if(!alive(card,root,index))return;
 card.replaceChildren(node('h4',admin?'V42.3 • ADM OPERAÇÕES':'V42.3 • OPERAÇÕES COOPERATIVAS'));
 if(!admin){
  card.append(node('p','Progresso confirmado pelo ledger de NPCs do servidor. Esta etapa é preparação para raids; chefes cooperativos em tempo real ainda não estão ativados.'));
  card.append(node('div',`${fmt(p.teamKills)} abates do esquadrão • ${fmt(p.personalKills)} seus nesta semana.`));
  if(!p.inSquad)card.append(node('p','Participe de um esquadrão para concluir operações.'));
 }
 for(const t of p.tiers||[]){
  const wrap=node('div',null,'frontier-card-v42');wrap.append(node('h4',`Operação nível ${t.tier}`));
  if(admin){
   const inputs=[];
   for(const [text,key,min,max] of [['Meta de NPCs','goal',10,10000],['Participação pessoal','mineRequired',1,2000],['Pesquisa por piloto','reward',1,5000]]){
    const label=node('label',`${text}: `);const el=node('input');el.type='number';el.value=t[key];el.min=min;el.max=max;el.className='frontier-input-v42';inputs.push(el);label.append(el);wrap.append(label);
   }
   const enabled=node('input');enabled.type='checkbox';enabled.checked=!!t.enabled;const label=node('label',' Ativado');label.prepend(enabled);wrap.append(label);
   const btn=node('button','SALVAR REGRAS');btn.onclick=async()=>{btn.disabled=true;try{const [goal,minimum,reward]=inputs.map(x=>Number(x.value));await adminOpsV423(t.tier,goal,minimum,reward,enabled.checked);await reloadWar(card,root,true);}catch(e){alertError(e);btn.disabled=false;}};wrap.append(btn);
  }else{
   wrap.append(node('div',`Grupo: ${fmt(p.teamKills)}/${fmt(t.goal)} · Você: ${fmt(p.personalKills)}/${fmt(t.mineRequired)} · Prêmio: ${fmt(t.reward)} pesquisa.`));
   if(!t.enabled)wrap.append(node('small','Operação suspensa pelo ADM.'));
   else if(t.claimed)wrap.append(node('small','Recompensa desta semana já coletada.'));
   else if(t.ready){const btn=node('button','RESGATAR PESQUISA');btn.onclick=async()=>{btn.disabled=true;try{await claimOpsV423(t.tier);await reloadWar(card,root,false);}catch(e){alertError(e);btn.disabled=false;}};wrap.append(btn);}
   else wrap.append(node('small','Ainda não concluído.'));
  }
  card.append(wrap);
 }
}
async function reloadWar(card,root,admin){const i=++activeRequest;await war(card,root,i,admin);}
