// Stellar Legacy V20.2.1 — módulo isolado de cache e carregamento de sprites.
// Não acessa a rede, o DOM, timers nem dados de usuário diretamente: dependências injetadas.
// Nunca descarte sprites de naves, NPCs, drones ou AUX via limpeza automática.

const ASSET_REVISION = '34.6.0';
export function versionedAssetUrl(path) {
  const value=String(path||'');
  if(!value)return value;
  const revision=value.includes('/assets/v18/bonus/')?'18.2.8':ASSET_REVISION;
  return value.includes('?')?`${value}&asset=${revision}`:`${value}?asset=${revision}`;
}

export function flattenAssetPaths(value,out=[]) {
  if(!value)return out;
  if(typeof value==='string')out.push(value);
  else if(Array.isArray(value))value.forEach(v=>flattenAssetPaths(v,out));
  else if(typeof value==='object')Object.values(value).forEach(v=>flattenAssetPaths(v,out));
  return out;
}

export function entityAssetPath(path) {
  return /\/assets\/(?:v17\/(?:ships|ships-map|drones|drones-map|npcs)|v30\/(?:shipsheets|shipsheets32|dronesheets|dronesheets32|npcsheets|npcsheets32)|v63\/ships|v65\/(?:ships|npcs|drones|aux)|v66\/(?:ships|npcs|drones|aux)|v64\/(?:drones|aux))\//.test(String(path||''));
}
export function coreAssetPath(path) {
  const value=String(path||'');
  return entityAssetPath(value)||/\/(branding|ammo)\//.test(value)
    ||/\/assets\/v17\/(environment|loot)\//.test(value)||/\/assets\/v18\/bonus\//.test(value);
}
function isSceneAsset(path) {
  // Fundos, portais e minério. Só se limpa depois de ficar muito tempo sem ser utilizado.
  return /\/assets\/v17\/environment\//.test(String(path||''));
}

export function createAssetCache({
  createImage,
  now=()=>0,
  warn=()=>{},
  retryAfterMs=15_000,
  sceneIdleMs=90_000,
  recentUseMs=20_000,
}={}) {
  if(typeof createImage!=='function')throw new TypeError('createImage é obrigatório');
  const images=new Map();
  const touches=new Map();
  const failedAt=new Map();
  const currentTime=()=>{
    const time=Number(now());
    return Number.isFinite(time)?time:0;
  };
  function evict(path) {
    if(!images.has(path))return false;
    images.delete(path);
    touches.delete(path);
    failedAt.delete(path);
    return true;
  }
  function requestAssetImage(path) {
    if(!path)return null;
    const key=String(path);
    const time=currentTime();
    const previous=images.get(key);
    if(previous) {
      const failed=failedAt.get(key);
      // Erro temporário de conexão: não repetir a mesma requisição a cada frame.
      if(failed===undefined||time-failed<retryAfterMs) {
        touches.set(key,time);
        return previous;
      }
      evict(key); // refaz somente depois do intervalo; não descarta imagens válidas.
    }
    const img=createImage();
    img.decoding='async';
    img.loading='eager'; // sprites de Canvas não têm nó DOM para acionar lazy-loading.
    try{img.fetchPriority=coreAssetPath(key)?'high':'low';}catch{}
    images.set(key,img);
    touches.set(key,time);
    img.onload=()=>{
      if(images.get(key)!==img)return; // ignora download antigo após troca de qualidade.
      failedAt.delete(key);
      touches.set(key,currentTime());
    };
    img.onerror=()=>{
      if(images.get(key)!==img)return;
      failedAt.set(key,currentTime());
      warn('Asset não carregado:',key,'→',img.src);
    };
    img.src=versionedAssetUrl(key);
    return img;
  }
  function trimAssetCache(cap=32) {
    const time=currentTime();
    let removed=0;
    // O fundo do mapa anterior e recursos antigos podem ser liberados após 90 s,
    // mesmo que o cache geral ainda esteja abaixo do limite.
    for(const path of [...images.keys()]) {
      if(isSceneAsset(path)&&time-(touches.get(path)??time)>=sceneIdleMs) {
        if(evict(path))removed++;
      }
    }
    // Mesma proteção da V20.2.0: sprites de entidades e assets principais não
    // competem com o cache de ícones extras, imagens de loja e habilidades.
    const nonCore=[...images.keys()].filter(path=>!coreAssetPath(path));
    const limit=Math.max(0,Math.floor(Number(cap)||0));
    let left=nonCore.length;
    if(left>limit) {
      const idle=nonCore.filter(path=>time-(touches.get(path)??time)>=recentUseMs)
        .sort((a,b)=>(touches.get(a)||0)-(touches.get(b)||0));
      for(const path of idle) {
        if(left<=limit)break;
        if(evict(path)){left--;removed++;}
      }
    }
    return removed;
  }
  function discardUnusedForQuality(shouldPreload) {
    let removed=0;
    for(const path of [...images.keys()]) {
      if(!entityAssetPath(path)&&!shouldPreload(path)&&!coreAssetPath(path)) {
        if(evict(path))removed++;
      }
    }
    return removed;
  }
  function stats() {
    return {count:images.size, failed:failedAt.size,
      entities:[...images.keys()].filter(entityAssetPath).length,
      scenes:[...images.keys()].filter(isSceneAsset).length};
  }
  return {requestAssetImage,trimAssetCache,discardUnusedForQuality,stats};
}
