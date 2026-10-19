// Somente nomes apresentados ao jogador. IDs legados persistem para compatibilidade com saves/SQL.
export const STELLAR_ORE_NAMES=Object.freeze({
  Prometium:'Ferron',Endurium:'Cryon',Terbium:'Virel',
  Prometid:'Ferrite',Duranium:'Duracite',Promerium:'Solarium',Xenomit:'Voidite'
});
export function stellarOreName(id,fallback=''){
  const key=String(id??'');
  return STELLAR_ORE_NAMES[key]||String(fallback||key);
}
