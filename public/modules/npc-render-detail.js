// V20.2.6 - LOD gráfico para NPCs distantes (NÃO altera colisão, alvo ou combate).
// Mesmo em qualidade BAIXA, chefes, NPCs de eventos e alvo selecionado mantêm
// imagem, indicadores de casco/escudo e nome na tela.
export function npcVisualDetail({quality='high',distanceSq=0,boss=false,eventNpc=false,selected=false}={}){
  if(quality!=='low'||boss||eventNpc||selected)return 'full';
  const sq=Number(distanceSq);
  if(!Number.isFinite(sq)||sq<0)return 'full';
  if(sq>500*500)return 'sprite';
  if(sq>280*280)return 'bars';
  return 'full';
}
