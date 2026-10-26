// STELLAR LEGACY V68 • Camadas decorativas modulares (somente renderização).
// Não acessa saves, combate, física, spawns, portais nem coordenadas de entidades.
const MAP_ROOT='/assets/mapas';
export function modularMapKey(mapId,faction){
  const m=String(mapId||'').match(/^x([1-8])$/);
  if(m){const prefix={earth:'1',mars:'2',jupiter:'3'}[String(faction||'')];return prefix?`${prefix}-${m[1]}`:null;}
  const b=String(mapId||'').match(/^b4([1-3])$/);
  if(b)return `4-${b[1]}`;
  const u=String(mapId||'').match(/^(?:u|U-)([1-3])$/);
  return u?`U-${u[1]}`:null;
}
export function mapLayoutPath(key){
  if(!key)return null;
  const k=String(key);
  const m=k.match(/^([1-3])-([1-8])$/);
  if(m){const faction={1:'Terra',2:'Marte',3:'Jupiter'}[m[1]];return `${MAP_ROOT}/${faction}/Mapa_${k}/layout.json`;}
  if(/^4-[1-3]$/.test(k))return `${MAP_ROOT}/PvP/Mapa_${k}/layout.json`;
  if(/^U-[1-3]$/.test(k))return `${MAP_ROOT}/Universo/Mapa_${k}/layout.json`;
  return null;
}
// Ordenação determinística independente de nível gráfico, relógio e FPS.
export function stableHash(value,seed=0){
  let h=(2166136261^(Number(seed)||0))>>>0;
  for(const c of String(value||'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}
  return h>>>0;
}
export function stableMediumSubset(items,seed=0){
  const arr=Array.isArray(items)?items:[];
  const keep=Math.floor(arr.length*.5);
  const chosen=new Set(arr.map((x,i)=>({i,score:stableHash(x.id||`${i}`,seed)}))
    .sort((a,b)=>a.score-b.score||a.i-b.i).slice(0,keep).map(x=>x.i));
  return arr.filter((x,i)=>chosen.has(i));
}
export function mapVisualLayers(layout,quality){
  const q=quality==='low'?'low':quality==='medium'?'medium':'high';
  if(q==='low')return [];
  const objects=(layout?.objects||[]), stars=(layout?.stars||[]), bodies=(layout?.celestialBodies||[]), nebulae=(layout?.nebulas||[]);
  if(q==='medium')return [...stableMediumSubset(stars,layout.seed),...stableMediumSubset(objects,layout.seed),...bodies.slice(0,1),...nebulae.slice(0,1)].sort((a,b)=>(a.depth||0)-(b.depth||0));
  return [...stars,...objects,...bodies,...nebulae].sort((a,b)=>(a.depth||0)-(b.depth||0));
}
function naturalDimension(img){return [Number(img?.naturalWidth||img?.width)||0,Number(img?.naturalHeight||img?.height)||0];}
export function drawModularBackground(ctx,img,{width,height,cameraX,cameraY,worldWidth,worldHeight}){
  const [iw,ih]=naturalDimension(img);
  if(!iw||!ih||width<=0||height<=0)return false;
  // Aspect ratio conservado: cover com cropping limitado; nenhuma deformação.
  const aspect=width/height,sourceAspect=iw/ih;
  let sw=iw,sh=ih;
  if(sourceAspect>aspect)sw=ih*aspect;else sh=iw/aspect;
  const fx=Math.max(0,Math.min(1,(cameraX||0)/Math.max(1,worldWidth||1)));
  const fy=Math.max(0,Math.min(1,(cameraY||0)/Math.max(1,worldHeight||1)));
  ctx.drawImage(img,(iw-sw)*fx,(ih-sh)*fy,sw,sh,0,0,width,height);
  return true;
}
export function createModularMapV2({loadLayout,requestImage,warn=()=>{},maxVisibleHigh=58,maxVisibleMedium=28}={}){
  if(typeof loadLayout!=='function'||typeof requestImage!=='function')throw new TypeError('Carregadores injetados obrigatórios');
  const states=new Map();let activeKey=null;
  function activate(key){
    if(key===activeKey)return;
    activeKey=key;
    // Apenas o mapa atual é carregado; o anterior pode ser descartado.
    for(const old of [...states.keys()])if(old!==key)states.delete(old);
    if(!mapLayoutPath(key))return;
    if(states.has(key))return;
    const state={status:'loading',layout:null,error:null,layers:{},requested:new Set()};
    states.set(key,state);
    Promise.resolve().then(()=>loadLayout(mapLayoutPath(key))).then(layout=>{
      if(states.get(key)!==state)return;
      if(!layout||layout.schemaVersion!==2||layout.mapId!==key||!layout.background?.high||!layout.background?.low)throw Error('Manifesto inválido');
      state.layout=layout;state.status='ready';
      state.layers.high=mapVisualLayers(layout,'high');
      state.layers.medium=mapVisualLayers(layout,'medium');
    }).catch(error=>{if(states.get(key)!==state)return;state.status='error';state.error=error;warn('Mapa modular indisponível; fallback anterior ativado',key,error);});
  }
  function draw(ctx,{key,quality='high',width,height,cameraX=0,cameraY=0,worldWidth=7200,worldHeight=5400,mobile=false}={}){
    if(!mapLayoutPath(key))return false;
    activate(key);
    const state=states.get(key);
    if(state?.status!=='ready')return false;
    const layout=state.layout;
    const q=['low','medium','high'].includes(quality)?quality:'high';
    const bgPath=q==='low'?layout.background.low:layout.background.high;
    const background=requestImage(bgPath);
    state.requested.add(bgPath);
    if(!naturalDimension(background)[0])return false;
    ctx.save();
    try{
      ctx.fillStyle='#061222';ctx.fillRect(0,0,width,height);
      if(!drawModularBackground(ctx,background,{width,height,cameraX,cameraY,worldWidth,worldHeight}))return false;
      if(q==='low')return true;
      // Nunca reamostrar posições com aleatoriedade durante renderização.
      const layers=state.layers[q]||[];
      const limit=q==='medium'?maxVisibleMedium:(mobile?Math.min(38,maxVisibleHigh):maxVisibleHigh);
      const speed=q==='medium'?.38:1;
      let painted=0,initiated=0;
      // Espalha a decodificação de novas texturas por vários frames. A composição continua estável.
      for(const e of layers){
        if(painted>=limit)break;
        const p=(Math.min(.95,Math.max(0,Number(e.parallax)||0)))*speed;
        const sx=Number(e.x)*worldWidth-cameraX*p+width*.5;
        const sy=Number(e.y)*worldHeight-cameraY*p+height*.5;
        const size=60*Math.min(3,Math.max(.06,Number(e.scale)||.4))*(e.kind==='nebulas'?2.2:e.kind==='celestialBodies'?2.2:1);
        if(sx<-size||sy<-size||sx>width+size||sy>height+size)continue;
        if(!state.requested.has(e.sprite)){
          if(initiated>=(mobile?2:4))continue;
          initiated++;state.requested.add(e.sprite);
        }
        const img=requestImage(e.sprite),[iw,ih]=naturalDimension(img);
        if(!iw||!ih)continue;
        const sc=size/Math.max(iw,ih),dw=iw*sc,dh=ih*sc;
        ctx.save();ctx.globalAlpha=Math.min(e.kind==='celestialBodies'?.38:.78,Math.max(.04,Number(e.opacity)||.3));
        ctx.translate(sx,sy);ctx.rotate(Number(e.rotation)||0);
        ctx.drawImage(img,-dw/2,-dh/2,dw,dh);ctx.restore();
        painted++;
      }
      return true;
    }finally{ctx.restore();}
  }
  return {activate,draw,active:()=>activeKey,state:key=>states.get(key)?.status||'unloaded',layout:key=>states.get(key)?.layout||null};
}
