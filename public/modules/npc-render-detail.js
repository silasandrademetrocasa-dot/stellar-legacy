// V20.2.6 - LOD gráfico para NPCs distantes (NÃO altera colisão, alvo ou combate).
// Mesmo em qualidade BAIXA, chefes, NPCs de eventos e alvo selecionado mantêm
// imagem, indicadores de casco/escudo e nome na tela.
export function npcVisualDetail({quality='high',distanceSq=0,boss=false,eventNpc=false,selected=false}={}){
  if(boss||eventNpc||selected)return 'full';
  // LOD visual: nenhum impacto em combate, alvo ou posição.
  // Em MÉDIA, esconde somente HUD de NPCs muito distantes, preservando o sprite.
  if(quality==='high')return 'full';
  const sq=Number(distanceSq);
  if(!Number.isFinite(sq)||sq<0)return 'full';
  if(quality==='medium'){if(sq>620*620)return 'sprite';return 'full';}
  if(sq>500*500)return 'sprite';
  if(sq>280*280)return 'bars';
  return 'full';
}
