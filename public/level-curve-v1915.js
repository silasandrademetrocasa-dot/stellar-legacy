// Stellar Legacy V19.0.15: progressao acumulada do PILOTO (nao da nave).
// Curva V1770 preservada ate o LV10. Pontos de calibracao: 30 min/round no
// farm de alta eficiencia, sem Premium/quests/designer, referencia de 150h
// de combate ATIVO entre os niveis 7 e 32 com mapas sempre desbloqueados.
export function xpThresholdV1770(level){
  const lv=Math.max(1,Math.floor(Number(level)||1));
  if(lv<=1)return 0;
  const n=lv-1;
  return Math.round(15000*Math.pow(n,2.3)*Math.pow(1.20,Math.max(0,lv-2)));
}

// Nivel 7->10: ~4h em X-3 (mantido sem alteracao).
// Niveis 10/18/22/27/32 acumulam aproximadamente 4/20/45/90/150h desde LV7.
export const XP_ANCHORS_V1915=Object.freeze([
  Object.freeze({level:10,xp:10099480}),
  Object.freeze({level:18,xp:49299480}),
  Object.freeze({level:22,xp:158299480}),
  Object.freeze({level:27,xp:397249480}),
  Object.freeze({level:32,xp:741049480}),
]);

export function xpThresholdV1915(level){
  const lv=Math.max(1,Math.floor(Number(level)||1));
  if(lv<=10)return xpThresholdV1770(lv);
  if(lv<=32){
    for(let i=1;i<XP_ANCHORS_V1915.length;i++){
      const left=XP_ANCHORS_V1915[i-1],right=XP_ANCHORS_V1915[i];
      if(lv>right.level)continue;
      // Interpolacao normalizada pela progressao antiga: niveis ficam
      // progressivamente mais longos, sem degraus nem crescimento negativo.
      const a=xpThresholdV1770(left.level),b=xpThresholdV1770(right.level);
      const t=(xpThresholdV1770(lv)-a)/(b-a);
      return Math.round(left.xp+(right.xp-left.xp)*t);
    }
  }
  // Endgame (LV33..44): continua a tendencia antiga, normalizada na chegada
  // ao LV32 para nao desvalorizar os proximos 12 niveis.
  const scale=XP_ANCHORS_V1915.at(-1).xp/xpThresholdV1770(32);
  return Math.round(xpThresholdV1770(lv)*scale);
}

// Uma unica conversao do save antigo: conserva NIVEL e PROGRESSO RELATIVO.
// Nenhum premio ou evento de level-up e concedido durante a migracao.
export function migratePilotXpV1915(profile,maxLevel=44){
  if(!profile||profile.xpModelV1915)return false;
  const lv=Math.max(1,Math.min(maxLevel,Math.floor(Number(profile.level)||1)));
  const oldXP=Math.max(0,Number(profile.xp)||0);
  if(lv>=maxLevel){
    const excess=Math.max(0,oldXP-xpThresholdV1770(maxLevel));
    const factor=xpThresholdV1915(maxLevel)/Math.max(1,xpThresholdV1770(maxLevel));
    profile.xp=xpThresholdV1915(maxLevel)+Math.round(excess*factor);
  }else{
    const oldBase=xpThresholdV1770(lv),oldNext=xpThresholdV1770(lv+1);
    const t=Math.max(0,Math.min(.999999999, (oldXP-oldBase)/Math.max(1,oldNext-oldBase)));
    const nextBase=xpThresholdV1915(lv),nextTarget=xpThresholdV1915(lv+1);
    profile.xp=Math.max(nextBase,Math.min(nextTarget-1,Math.round(nextBase+t*(nextTarget-nextBase))));
  }
  profile.level=lv;
  profile.xpModelV1915=true;
  return true;
}
