// V20.2.5 — evita medir repetidamente os mesmos nomes e tags no Canvas.
// Limite pequeno para nao reter chamadas e nomes antigos indefinidamente.
export function createTextWidthCache({capacity=128}={}){
  const max=Math.max(1,Math.floor(capacity)||128);
  const widths=new Map();
  return {
    measure(ctx,text){
      const key=String(ctx.font||'')+'\0'+String(text);
      if(widths.has(key)){
        const value=widths.get(key);widths.delete(key);widths.set(key,value);return value;
      }
      const width=ctx.measureText(text).width;
      if(!Number.isFinite(width))return width;
      widths.set(key,width);
      while(widths.size>max)widths.delete(widths.keys().next().value);
      return width;
    },
    size(){return widths.size;},
    clear(){widths.clear();}
  };
}
