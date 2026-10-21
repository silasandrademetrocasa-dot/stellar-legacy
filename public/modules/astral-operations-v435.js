import {loadStageAV423,adminAstralModuleV435,adminRaidV435,loadRaidV435,claimRaidV435,adminAstralTestKitV440} from '../api.js?v=45.0.0';
import {astralEquipmentBonusesV435,astralModuleCodesV435} from './astral-systems-v435.js?v=45.0.0';
let ticket=0;
const el=(tag,text)=>{const x=document.createElement(tag);if(text!=null)x.textContent=text;return x;};
const labels={astral_guard:'Guardião Astral',eclipse_lance:'Lança Eclipse',nexus_drive:'Núcleo Nexus',trinity_matrix:'Matriz Trina'};
const bonusLabel=b=>`NPC +${b.npcDamagePercent}% • ESCUDO +${b.shieldPercent}% • VELOCIDADE +${b.speedPercent}%`;
export async function renderAstralOperationsV435(root,tab,isAdmin){
  if(!['forge','war','admin'].includes(tab))return;
  const current=++ticket,card=el('section','Preparando tecnologias…');card.className='frontier-card-v42';root.append(card);
  try{
    if(tab==='forge'||tab==='admin'){
      const data=await loadStageAV423();if(current!==ticket||!card.isConnected)return;
      card.replaceChildren(el('h4',tab==='admin'?'CONTROLE DE TECNOLOGIAS':'PODER ASTRAL'));
      for(const config of [1,2])card.append(el('p',`Configuração ${config}: ${bonusLabel(astralEquipmentBonusesV435(data,config))}`));
      card.append(el('small','Bônus ativos somente quando a tecnologia estiver equipada e liberada.'));
      if(isAdmin&&tab==='admin'){
        for(const code of astralModuleCodesV435){const def=(data.definitions||[]).find(d=>d.code===code),label=el('label',labels[code]||code+' ');
          const toggle=el('input');toggle.type='checkbox';toggle.checked=def?.combatEnabled===true;label.append(toggle);
          const save=el('button','SALVAR');save.type='button';save.onclick=async()=>{save.disabled=true;try{await adminAstralModuleV435(code,toggle.checked);window.dispatchEvent(new Event('stellar-astral-loadout-updated'));save.textContent='SALVO';}catch{save.textContent='TENTE NOVAMENTE';}finally{save.disabled=false;}};
          const row=el('div');row.append(label,save);
          const kit=el('button','+5 PARA TESTES');kit.type='button';kit.title='Apenas no seu próprio inventário ADM • máximo 30 unidades';
          kit.onclick=async()=>{kit.disabled=true;try{const result=await adminAstralTestKitV440(code,5);
            if(!result?.ok)throw Error('Kit indisponível');kit.textContent='TOTAL '+Number(result.quantity||0);
            window.dispatchEvent(new Event('stellar-astral-loadout-updated'));
           }catch{kit.textContent='LIMITE OU INDISPONÍVEL';}finally{kit.disabled=false;}};
          row.append(kit);card.append(row);
        }
      }
      if(isAdmin&&tab==='admin'){
        const raid=await loadRaidV435();if(current!==ticket||!card.isConnected)return;
        const title=el('h4','RAIDS • CONFIGURAÇÃO');card.append(title);
        const fields=[['Chefes necessários','target',raid.target||3,1,50],['Participação mínima','minimum',raid.minimum||1,1,10],['Pesquisa concedida','reward',raid.reward||120,1,5000]];
        const inputs={};
        for(const [label,key,value,min,max] of fields){const l=el('label',label+' '),i=el('input');i.type='number';i.min=min;i.max=max;i.value=value;inputs[key]=i;l.append(i);card.append(l);}
        const enabled=el('input');enabled.type='checkbox';enabled.checked=raid.enabled!==false;
        const l=el('label','Raid ativa ');l.append(enabled);card.append(l);
        const button=el('button','SALVAR RAID');button.type='button';button.onclick=async()=>{button.disabled=true;try{await adminRaidV435(Number(inputs.target.value),Number(inputs.minimum.value),Number(inputs.reward.value),enabled.checked);button.textContent='SALVO';}catch{button.textContent='TENTE NOVAMENTE';}finally{button.disabled=false;}};card.append(button);
      }
    } else {
      const raid=await loadRaidV435();if(current!==ticket||!card.isConnected)return;
      card.replaceChildren(el('h4','RAID • DESAFIO DOS CHEFES'));
      if(!raid?.inSquad){card.append(el('p','Entre em um esquadrão para participar do desafio semanal.'));return;}
      card.append(el('p',`${raid.kills||0}/${raid.target||3} chefes derrotados pelo esquadrão nesta semana.`));
      card.append(el('p',`Sua participação: ${raid.personal||0} • Recompensa: ${raid.reward||0} pontos de pesquisa.`));
      const status=el('p',raid.claimed?'Resgatado nesta semana.':raid.ready?'Recompensa disponível.':'Continue derrotando chefes!');card.append(status);
      if(raid.ready&&!raid.claimed){const b=el('button','RESGATAR');b.type='button';b.onclick=async()=>{b.disabled=true;try{await claimRaidV435();b.textContent='RESGATADO';}catch{b.disabled=false;b.textContent='TENTE NOVAMENTE';}};card.append(b);}
    }
  }catch{if(card.isConnected)card.textContent='Atividade temporariamente indisponível. Tente novamente.';}
}
