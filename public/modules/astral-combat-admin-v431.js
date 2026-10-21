// Exibido apenas quando o piloto abre a Forja ou a central administrativa.
import {loadStageAV423,adminAstralPowerV431} from '../api.js?v=47.7.1';
import {verifiedAstralPveBonusV431} from './astral-combat-v431.js?v=47.7.1';
let current=0;
const create=(tag,text)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;return e;};
export async function renderAstralCombatAdminV431(root,tab,isAdmin){
 if(tab!=='forge'&&tab!=='admin')return;
 const ticket=++current;
 const box=create('section','Preparando suas tecnologias Astrais…');box.className='frontier-card-v42';root.append(box);
 try{
  const data=await loadStageAV423();if(ticket!==current||!box.isConnected)return;
  box.replaceChildren(create('h4','TECNOLOGIAS ASTRAIS'));
  const ready=(data.definitions||[]).find(r=>r.code==='eclipse_lance')?.combatEnabled===true;
  for(const config of [1,2]){
   const weapon=(data.equipped||[]).find(r=>Number(r.config)===config&&r.slot==='weapon')?.code;
   const gain=verifiedAstralPveBonusV431(data,config);
   box.append(create('p',`Configuração ${config}: ${weapon==='eclipse_lance'?'Lança Eclipse equipada':'sem Lança Eclipse'} · ${gain?`+${gain}% de dano contra NPCs`:'tecnologia em preparação'}.`));
  }
  box.append(create('small','O bônus é exclusivo de combate contra NPCs. Não afeta PvP, vida ou escudos.'));
  if(tab==='admin'&&isAdmin){
   const label=create('label',' Habilitar bônus PvE da Lança Eclipse');
   const check=create('input');check.type='checkbox';check.checked=ready;label.prepend(check);
   box.append(label,create('p','Ative somente depois de validar dano, munição e equipamentos em contas de teste.'));
   const save=create('button','SALVAR TECNOLOGIA');save.type='button';
   save.onclick=async()=>{if(save.disabled)return;save.disabled=true;try{await adminAstralPowerV431(check.checked);box.append(create('small','Configuração atualizada. Reabra a Forja para conferir.'));window.dispatchEvent(new Event('stellar-astral-loadout-updated'));}catch(e){box.append(create('small','Não foi possível salvar esta configuração.'));}finally{save.disabled=false;}};
   box.append(save);
  }
 }catch{if(box.isConnected)box.textContent='Tecnologias temporariamente indisponíveis. Tente novamente.';}
}
