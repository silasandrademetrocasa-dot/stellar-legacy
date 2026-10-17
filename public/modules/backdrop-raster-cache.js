// V20.2.5 — cache LRU opcional dos fundos em qualidade BAIXA.
// Não modifica imagens de naves, NPCs, AUX, save ou rede.
// Redimensionamento acontece apenas uma vez por imagem carregada.
export function createBackdropRasterCache({makeCanvas,maxEdge=1024,maxEntries=2}={}){
  if(typeof makeCanvas!=='function')throw new TypeError('makeCanvas necessario');
  const limit=Math.max(64,Math.floor(maxEdge)||1024);
  const capacity=Math.max(1,Math.floor(maxEntries)||2);
  const lru=new Map();
  function get(image){
    if(!image)return image;
    const w=Number(image.naturalWidth||image.width)||0;
    const h=Number(image.naturalHeight||image.height)||0;
    if(w<=0||h<=0||Math.max(w,h)<=limit)return image;
    const found=lru.get(image);
    if(found){lru.delete(image);lru.set(image,found);return found;}
    try{
      const canvas=makeCanvas();
      if(!canvas||typeof canvas.getContext!=='function')return image;
      const scale=limit/Math.max(w,h);
      canvas.width=Math.max(1,Math.round(w*scale));
      canvas.height=Math.max(1,Math.round(h*scale));
      const context=canvas.getContext('2d',{alpha:false});
      if(!context||typeof context.drawImage!=='function')return image;
      context.imageSmoothingEnabled=true;
      context.imageSmoothingQuality='low';
      context.drawImage(image,0,0,canvas.width,canvas.height);
      lru.set(image,canvas);
      while(lru.size>capacity)lru.delete(lru.keys().next().value);
      return canvas;
    }catch{return image;} // Se faltar memoria/contexto, usa sprite original.
  }
  return {get, clear(){lru.clear();},size(){return lru.size;}};
}
