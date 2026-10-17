// Stellar Legacy V20.2.3 — cache pequeno de gradientes de cenário (sem sprites ou saves).
// Cada tipo mantém somente o último conjunto. A chave inclui as cores e as dimensões:
// mudança de mapa, de paleta ou redimensionamento recompõem o degradê.
export function createSceneGradientCache(ctx){
  if(!ctx||typeof ctx.createRadialGradient!=='function'||typeof ctx.createLinearGradient!=='function'){
    throw new TypeError('Contexto Canvas2D necessário');
  }
  const entries=new Map();
  function cached(kind,key,build){
    const old=entries.get(kind);
    if(old&&old.key===key)return old.value;
    const value=build();entries.set(kind,{key,value});return value;
  }
  return {
    nebula(w,h,pal){
      const key=JSON.stringify([w,h,pal.nebula,pal.accent]);
      return cached('nebula',key,()=>{
        const primary=ctx.createRadialGradient(w*.62,h*.36,20,w*.62,h*.36,Math.max(w,h)*.72);
        primary.addColorStop(0,`${pal.nebula}55`);primary.addColorStop(.38,`${pal.nebula}22`);primary.addColorStop(1,'rgba(0,0,0,0)');
        const accent=ctx.createRadialGradient(w*.18,h*.78,10,w*.18,h*.78,Math.max(w,h)*.42);
        accent.addColorStop(0,`${pal.accent}1f`);accent.addColorStop(1,'rgba(0,0,0,0)');
        return {primary,accent};
      });
    },
    backdrop(w,h,edge,hexToRgba){
      const key=JSON.stringify([w,h,edge]);
      return cached('backdrop',key,()=>{
        const shade=ctx.createLinearGradient(0,0,0,h);
        shade.addColorStop(0,'rgba(1,7,16,.05)');shade.addColorStop(.52,'rgba(1,6,14,.018)');shade.addColorStop(1,'rgba(1,5,12,.18)');
        const vignette=ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*.28,w/2,h/2,Math.max(w,h)*.78);
        vignette.addColorStop(0,'rgba(0,0,0,0)');vignette.addColorStop(1,hexToRgba(edge,.24));
        return {shade,vignette};
      });
    },
    // O efeito primário pulsa a cada frame, mas a iluminação secundária é constante.
    secondaryLight(w,h,color,strength,hexToRgba){
      const key=JSON.stringify([w,h,color,strength]);
      return cached('secondaryLight',key,()=>{
        const g=ctx.createRadialGradient(w*.82,h*.70,0,w*.82,h*.70,Math.max(w,h)*.44);
        g.addColorStop(0,hexToRgba(color,.07*strength));g.addColorStop(1,'rgba(0,0,0,0)');
        return g;
      });
    },
    clear(){entries.clear();},
    size(){return entries.size;}
  };
}
