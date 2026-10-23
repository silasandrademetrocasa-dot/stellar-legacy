/* Stellar Legacy V50 • ships GLB in real-time WebGL2; no CDN/dependencies.
 * Rendering only: ship stats, hitboxes, pathfinding, fire logic and economy are untouched.
 * Self-contained; automatic 2D fallback if WebGL2 or assets fail.
 */
export const ALLOWED_SHIPS_V50 = Object.freeze({
  phoenix:'Aurora',leonov:'Lynx',liberator:'Pioneer',piranha:'Raptor',vengeance:'Valkyrie',
  bigboy:'Bastion',goliath:'Leviathan',citadel:'Bulwark',aegis:'Seraph',
  spearhead:'Pathfinder',defcom:'Phantom',yamato:'Kensei',nostromo:'Meridian'
});
const ALLOWED = new Set(Object.keys(ALLOWED_SHIPS_V50));
export const isShipAllowedV50 = id=>ALLOWED.has(String(id||''));
export function ensureAllowedShipSaveV50(save){
  if(!save||typeof save!=='object')return false;
  if(isShipAllowedV50(save.activeShipId))return false;
  // Ownership, inventory, loadout, configuration builds and previous ship IDs are preserved.
  // The game's own normalizeLoadout() returns equipment exceeding Aurora slots to inventory.
  save.activeShipId='phoenix';
  if(!Array.isArray(save.ownedShips))save.ownedShips=[];
  if(!save.ownedShips.includes('phoenix'))save.ownedShips.push('phoenix');
  if(save.repairRequired && typeof save.repairRequired==='object')save.repairRequired.shipId='phoenix';
  return true;
}

const SHIP_ASSET = Object.fromEntries(Object.entries(ALLOWED_SHIPS_V50).map(([id,name])=>
  [id,`/assets/ships3d/v50/SL_${name.toUpperCase()}_LOD.glb`]));
/* STELLAR_V52_RENDER_UPGRADE */
const EXT_MODEL_ASSET={
  aux9:'/assets/v52_3/models/aux9.glb',
  npc_streuner:'/assets/v52_3/models/npc_streuner.glb',
  npc_recruitStreuner:'/assets/v52_3/models/npc_recruitStreuner.glb',
  npc_aiderStreuner:'/assets/v52_3/models/npc_aiderStreuner.glb',
  npc_bossStreuner:'/assets/v52_3/models/npc_bossStreuner.glb',
  npc_lordakia:'/assets/v52_3/models/npc_lordakia.glb',
  npc_bossLordakia:'/assets/v52_3/models/npc_bossLordakia.glb',
  npc_saimon:'/assets/v52_3/models/npc_saimon.glb',
  npc_bossSaimon:'/assets/v52_3/models/npc_bossSaimon.glb',
  npc_mordon:'/assets/v52_3/models/npc_mordon.glb',
  npc_bossMordon:'/assets/v52_3/models/npc_bossMordon.glb',
  npc_devolarium:'/assets/v52_3/models/npc_devolarium.glb',
  npc_bossDevolarium:'/assets/v52_3/models/npc_bossDevolarium.glb',
  npc_sibelon:'/assets/v52_3/models/npc_sibelon.glb',
  npc_bossSibelon:'/assets/v52_3/models/npc_bossSibelon.glb',
  ore_Prometium:'/assets/v52_3/models/ore_Prometium.glb',
  ore_Endurium:'/assets/v52_3/models/ore_Endurium.glb',
  ore_Terbium:'/assets/v52_3/models/ore_Terbium.glb',
  ore_Prometid:'/assets/v52_3/models/ore_Prometid.glb',
  ore_Duranium:'/assets/v52_3/models/ore_Duranium.glb',
  ore_Promerium:'/assets/v52_3/models/ore_Promerium.glb',
  ore_Xenomit:'/assets/v52_3/models/ore_Xenomit.glb',
  box_bonus:'/assets/v52_3/models/box_bonus.glb',
  box_loot:'/assets/v52_3/models/box_loot.glb',
  box_mystery:'/assets/v52_3/models/box_mystery.glb',
  box_elite:'/assets/v52_3/models/box_elite.glb',
  box_repair:'/assets/v52_3/models/box_repair.glb',
  box_ammo:'/assets/v52_3/models/box_ammo.glb',
};
const MODEL_ASSET={...SHIP_ASSET,...EXT_MODEL_ASSET};
const ANGULAR_BUCKETS=32,CANVAS_SIZE=160,MAX_CACHED_BITMAPS=100;
const TAG='stellar-ships3d-v50';
const vs=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;
uniform float uYaw;
uniform float uZoom;
out vec3 vPoint;
void main(){
  float c=cos(uYaw),s=sin(uYaw);
  vec3 w=vec3(aPosition.x*c+aPosition.z*s,aPosition.y,-aPosition.x*s+aPosition.z*c);
  vPoint=w;
  gl_Position=vec4(w.x*uZoom,(w.z*.91+w.y*.42)*uZoom,(-w.y*.25+w.z*.08)*uZoom,1.);
}`;
const fs=`#version 300 es
precision highp float;
in vec3 vPoint;
uniform vec4 uColor;
uniform vec3 uEmissive;
out vec4 outColor;
void main(){
  vec3 n=normalize(cross(dFdx(vPoint),dFdy(vPoint)));
  float d=abs(dot(n,normalize(vec3(.20,1.,.48))));
  vec3 rgb=uColor.rgb*(.60+.40*d)+uEmissive*.34;
  outColor=vec4(min(rgb,vec3(1.0)),uColor.a);
}`;
function makeShader(gl,type,source){
  const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s)||'shader compile');
  return s;
}
function createProgram(gl){
  const p=gl.createProgram();gl.attachShader(p,makeShader(gl,gl.VERTEX_SHADER,vs));gl.attachShader(p,makeShader(gl,gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p)||'shader link');
  return p;
}
export function decodeGlb(arrayBuffer){
  const d=new DataView(arrayBuffer);
  if(d.byteLength<28||d.getUint32(0,true)!==0x46546c67||d.getUint32(4,true)!==2)throw Error('GLB inválido');
  const jsonLen=d.getUint32(12,true),jsonType=d.getUint32(16,true);
  if(jsonType!==0x4e4f534a)throw Error('GLB sem JSON');
  const header=JSON.parse(new TextDecoder().decode(new Uint8Array(arrayBuffer,20,jsonLen)));
  const off=20+jsonLen;
  if(off+8>d.byteLength||d.getUint32(off+4,true)!==0x004e4942)throw Error('GLB sem BIN');
  const binStart=off+8;
  const bufferViews=header.bufferViews||[],accessors=header.accessors||[];
  function typed(accId){
    const a=accessors[accId],v=bufferViews[a.bufferView];
    if(!a||!v||a.sparse)throw Error('accessor GLB não suportado');
    const comps={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type];
    const format={5121:Uint8Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array}[a.componentType];
    if(!comps||!format)throw Error('GLB type não suportado');
    const byteOffset=binStart+(v.byteOffset||0)+(a.byteOffset||0),bytes=format.BYTES_PER_ELEMENT;
    const stride=v.byteStride||bytes*comps;
    if(stride===bytes*comps && byteOffset%bytes===0)return new format(arrayBuffer,byteOffset,a.count*comps);
    const output=new format(a.count*comps);
    const dv=new DataView(arrayBuffer);
    for(let i=0;i<a.count;i++)for(let j=0;j<comps;j++){
      const idx=byteOffset+i*stride+j*bytes;
      output[i*comps+j]=format===Float32Array?dv.getFloat32(idx,true):format===Uint32Array?dv.getUint32(idx,true):format===Uint16Array?dv.getUint16(idx,true):dv.getUint8(idx);
    }
    return output;
  }
  // Models are exported in baked world coordinates without skin/morph/external assets.
  const parts=[];
  for(const mesh of header.meshes||[])for(const p of mesh.primitives||[]){
    if((p.mode??4)!==4)continue;
    const pos=typed(p.attributes.POSITION);
    const ind=p.indices===undefined?Uint32Array.from({length:pos.length/3},(_,i)=>i):typed(p.indices);
    const m=header.materials?.[p.material||0]||{};
    parts.push({positions:new Float32Array(pos),indices:new Uint32Array(ind),
      color:m.pbrMetallicRoughness?.baseColorFactor||[1,1,1,1],emissive:m.emissiveFactor||[0,0,0]});
  }
  if(!parts.length)throw Error('GLB sem triângulos');
  return parts;
}
function renderMode(){try{return localStorage.getItem('stellar3d.v50')||'auto'}catch{return 'auto'}}
export function createStellarShipRendererV50(){
  let canvas=null,gl=null,program=null,enabled=true,dead=false,viewportScale=.215;
  let uploads=new Map(),cache=new Map(),requests=new Set();
  let lastFrameTime=0,framesRendered=0;
  function ensureGL(){
    if(dead||!enabled||renderMode()==='off')return false;
    if(gl)return true;
    try{
      canvas=document.createElement('canvas');canvas.width=canvas.height=CANVAS_SIZE;
      canvas.style.cssText='position:fixed;left:-9999px;top:-9999px;pointer-events:none';
      gl=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:true,antialias:false,preserveDrawingBuffer:true,depth:true,powerPreference:'low-power'});
      if(!gl)throw Error('WebGL2 não disponível');
      program=createProgram(gl);gl.useProgram(program);gl.disable(gl.CULL_FACE);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
      gl.viewport(0,0,CANVAS_SIZE,CANVAS_SIZE);
      canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();dead=true;cache.clear();},false);
      return true;
    }catch(e){console.warn('[ship3d] fallback 2D:',e);dead=true;gl=null;return false;}
  }
  function uploadParts(id,parts){
    if(!gl)return;
    uploads.set(id,parts.map(p=>{
      const vert=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vert);gl.bufferData(gl.ARRAY_BUFFER,p.positions,gl.STATIC_DRAW);
      const ind=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ind);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,p.indices,gl.STATIC_DRAW);
      return {vert,ind,color:p.color,emissive:p.emissive,count:p.indices.length};
    }));
  }
  function preload(id){
    if(!MODEL_ASSET[id]||requests.has(id)||uploads.has(id)||!ensureGL())return;
    requests.add(id);
    fetch(MODEL_ASSET[id],{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error('GLB HTTP '+r.status);return r.arrayBuffer()})
      .then(decodeGlb).then(parts=>uploadParts(id,parts)).catch(e=>console.warn(`[ship3d] ${id}: 2D fallback`,e));
  }
  function render(shipId,angle){
    const parts=uploads.get(shipId);if(!parts?.length||!gl)return null;
    const now=performance.now();if(now-lastFrameTime>16){lastFrameTime=now;framesRendered=0;}
    if(framesRendered>=3)return null;framesRendered++;
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,CANVAS_SIZE,CANVAS_SIZE);
    gl.clearColor(0,0,0,0);gl.clearDepth(1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);gl.uniform1f(gl.getUniformLocation(program,'uYaw'),Math.PI/2-angle);
    gl.uniform1f(gl.getUniformLocation(program,'uZoom'),viewportScale);
    for(const p of parts){
      gl.bindBuffer(gl.ARRAY_BUFFER,p.vert);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,p.ind);
      gl.uniform4fv(gl.getUniformLocation(program,'uColor'),p.color);
      gl.uniform3fv(gl.getUniformLocation(program,'uEmissive'),p.emissive);
      gl.drawElements(gl.TRIANGLES,p.count,gl.UNSIGNED_INT,0);
    }
    const c=document.createElement('canvas');c.width=c.height=CANVAS_SIZE;
    c.getContext('2d').drawImage(canvas,0,0);
    return c;
  }
  function drawKey(ctx,shipId,angle,size){
    if(renderMode()==='off'||!MODEL_ASSET[shipId]||!ensureGL())return false;
    if(!uploads.has(shipId)){preload(shipId);return false;}
    const buckets=shipId.startsWith('npc_')?16:ANGULAR_BUCKETS;
    const bucket=((Math.round(((angle%(2*Math.PI)+2*Math.PI)%(2*Math.PI))*buckets/(2*Math.PI)))%buckets);
    const key=shipId+':'+bucket;
    let thumb=cache.get(key);
    if(!thumb){
      try{thumb=render(shipId,bucket*2*Math.PI/buckets)}catch(e){console.warn('[ship3d] draw fallback',e);return false;}
      if(!thumb)return false;
      cache.set(key,thumb);
      if(cache.size>MAX_CACHED_BITMAPS)cache.delete(cache.keys().next().value);
    } else{cache.delete(key);cache.set(key,thumb);}
    ctx.drawImage(thumb,-size*.62,-size*.62,size*1.24,size*1.24);
    return true;
  }
  function draw(ctx,shipId,angle,size){return isShipAllowedV50(shipId)?drawKey(ctx,shipId,angle,size):false;}
  function drawAsset(ctx,id,angle,size){return Boolean(EXT_MODEL_ASSET[id])&&drawKey(ctx,id,angle,size);}
  function drawAssetAt(ctx,id,angle,size,x,y){ctx.save();ctx.translate(x,y);const ok=drawAsset(ctx,id,angle,size);ctx.restore();return ok;}
  function setMode(mode){try{localStorage.setItem('stellar3d.v50',['off','on','auto'].includes(mode)?mode:'auto')}catch{};if(mode!=='off')preload('phoenix');}
  function getMode(){return renderMode()}
  return {draw,drawAsset,drawAssetAt,preload,setMode,getMode,get supported(){return !dead}};
}
