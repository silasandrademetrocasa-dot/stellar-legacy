/* Stellar Legacy V116.7 — orcamento de FPS mobile e atualizacoes de NPC fora da tela.
 * Somente apresentacao visual: nenhuma alteracao de dano, rewards, missao, server ou loot.
 */
const finite=(v, fallback=0)=>Number.isFinite(Number(v))?Number(v):fallback;
export function mobileQualityProfileV1167(profile, caps={}, mode='high'){
  if(!caps.mobile)return profile;
  const weak=!!caps.saveData || (finite(caps.memory)>0&&finite(caps.memory)<=3) || (finite(caps.cores)>0&&finite(caps.cores)<=4);
  // Nao mexer nos sprites originais: somente resolucao interna de fundo e tela.
  // Perfil ALTO continua em ALTO (iluminacao/arte), mas tem orcamento real de 30 FPS.
  const fps=mode==='low'?45:30;
  const maxDpr=mode==='high'?(weak?1.40:1.70):mode==='medium'?(weak?1.12:1.30):1.0;
  return {...profile,dpr:Math.min(finite(profile?.dpr,1),maxDpr),fps};
}
export function npcVisualIntervalV1167({mobile=false,visible=false,selected=false,boss=false,eventNpc=false,near=false}={}){
  if(!mobile||visible||selected||boss||eventNpc||near)return 0;
  // NPCs que nao aparecem na tela preservam seu ultimo estado de rede;
  // 200 ms limita os trabalhos de interpolacao sem alterar NPC/combat no servidor.
  return 200;
}
export function shouldRefreshNpcVisualV1167({now=0,lastAt=-Infinity,interval=0}={}){
  return !interval || !Number.isFinite(lastAt) || now-lastAt>=interval || now<lastAt;
}
export function npcLabelQualityV1167({mobile=false,quality='high',distanceSq=0,boss=false,eventNpc=false,selected=false}={}){
  // No mobile ALTO, arte continua alta: somente a etiqueta de inimigos comuns
  // distantes pode ser omitida. Alvo, boss e evento sempre mantem informacoes.
  if(mobile&&quality==='high'&&!boss&&!eventNpc&&!selected&&distanceSq>620*620)return 'medium';
  return quality;
}

export function createSharedNpcIndexV1167(){
  const byId=new Map();
  let source=null,length=-1,rebuilds=0;
  function rebuild(entities){
    byId.clear();
    for(const entity of entities)if(entity?.sharedWorld&&entity.id)byId.set(entity.id,entity);
    source=entities;length=entities.length;rebuilds++;
  }
  return {
    find(entities,id){
      if(!Array.isArray(entities))return null;
      if(entities!==source||entities.length!==length)rebuild(entities);
      return byId.get(id)||null;
    },
    invalidate(){source=null;length=-1;byId.clear();},
    stats(){return {size:byId.size,rebuilds};}
  };
}
export function copyNpcNetworkPatchV1167(entity,raw){
  if(!entity||!raw||typeof raw!=='object')return false;
  // X/Y pertencem ao interpolador e nunca devem ser sobrescritos por patch de rede.
  for(const key of Object.keys(raw)){
    if(key==='x'||key==='y'||key==='__proto__'||key==='constructor'||key==='prototype')continue;
    entity[key]=raw[key];
  }
  return true;
}
