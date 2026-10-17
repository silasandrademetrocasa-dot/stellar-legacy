// V20.2.8 — Evita alterações redundantes no DOM. Nenhum estado de gameplay/cache de save.
export function createHudContentCache(){
  const signatures=new Map();
  return {
    text(element,value){
      if(!element)return false;
      const next=String(value);
      if(element.textContent===next)return false;
      element.textContent=next;return true;
    },
    src(element,value){
      if(!element||!value)return false;
      if(element.getAttribute('src')===String(value))return false;
      element.setAttribute('src',String(value));return true;
    },
    needsRefresh(key,signature){
      if(signatures.has(key)&&signatures.get(key)===signature)return false;
      signatures.set(key,signature);return true;
    },
    clear(){signatures.clear();}
  };
}
