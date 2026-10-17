// V20.2.0 | Primeiro módulo extraído de game.js.
// Perfis gráficos e seleção determinística da qualidade AUTO.
// Sem navegador, localStorage, rede ou dependências externas: testável com Node.
export const QUALITY_PROFILES={
  // V17.5.2: qualidade dinâmica atua no CENÁRIO / ILUMINAÇÃO / densidade de efeitos,
  // mas nunca rebaixa ou descarta os sprites V17 de NAVE, NPC, DRONES ou AUX-9.
  high:{label:'ALTA',dpr:2,fps:60,background:true,backgroundAlpha:.78,stars:1,grid:false,fx:true,particles:105,preload:'smart',saturation:1.16,contrast:1.08,sceneLight:1,assetCap:54},
  medium:{label:'MÉDIA',dpr:1.30,fps:45,background:true,backgroundAlpha:.56,stars:.52,grid:false,fx:true,particles:48,preload:'core',saturation:1.05,contrast:1.03,sceneLight:.68,assetCap:34},
  low:{label:'BAIXA',dpr:.70,fps:30,background:true,backgroundAlpha:.44,stars:0,grid:false,fx:true,particles:6,preload:'minimal',saturation:1,contrast:1,sceneLight:0,assetCap:24},
};

export function initialAutoQualityForDevice(caps={},viewportWidth=Infinity){
  if(caps.saveData)return 'low';
  if(caps.mobile&&(viewportWidth<=620||(caps.memory&&caps.memory<=4)||(caps.cores&&caps.cores<=4)))return 'low';
  if(caps.mobile)return 'medium';
  if((caps.memory&&caps.memory<=4)||(caps.cores&&caps.cores<=4))return 'medium';
  return 'high';
}
