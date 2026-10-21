// Read-only ADM panel: the numbers are local balancing targets, not account grants.
import {GALACTIC_XP_ANCHORS_V460,xpThresholdV460} from '../level-curve-v460.js?v=47.7.0';
import {GALACTIC_PVE_LEVELS_V451} from './galactic-progression-v451.js?v=47.7.0';
const format=n=>Number(n).toLocaleString('pt-BR');
export function renderGalacticBalanceV460(root,tab,isAdmin){
 if(tab!=='admin'||isAdmin!==true||!root)return;
 const section=document.createElement('section');section.className='frontier-card-v42';
 const h=document.createElement('h4');h.textContent='V46 • BALANCEAMENTO GALÁCTICO';section.append(h);
 const summary=document.createElement('p');summary.textContent='Curva de XP acumulada e desbloqueios (somente leitura). Dados de jogadores não são alterados por este painel.';section.append(summary);
 for(const [id,level] of Object.entries(GALACTIC_PVE_LEVELS_V451)){
  const p=document.createElement('p');p.textContent=`${id.toUpperCase()} • nível ${level} • ${format(xpThresholdV460(level))} XP acumulado`;section.append(p);
 }
 const note=document.createElement('small');note.textContent='PvP 4-X: nível 15. A conversão de XP conserva o nível e o progresso relativo de contas existentes. Sem recompensa extra ou acesso ADM por este painel.';section.append(note);
 root.append(section);
}
