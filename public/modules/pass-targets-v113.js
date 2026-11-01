/** V113 • Scaling suave para o Passe: não bloqueia jogador FREE ou mapa baixo. */
export function dailyPassTargetV113(min,max,level){
 const lo=Math.max(1,Math.trunc(Number(min)||1)),hi=Math.max(lo,Math.trunc(Number(max)||lo));
 const lv=Math.max(1,Math.min(44,Math.trunc(Number(level)||1)));
 const base=Math.min(1,(lv-1)/14);
 // V112 parava de escalar no LV15; V113 prolonga a dificuldade até o LV44.
 // Nunca ultrapassa 32% da amplitude original acima do LV15.
 const late=lv<=15?0:0.32*(lv-15)/29;
 return Math.round(lo+(hi-lo)*(base+late));
}
