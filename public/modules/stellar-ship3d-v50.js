import {modelYawFromHeadingV526,modelZoomFactorV526} from './visual-scale-v526.js';
import {shipPivotV53} from './stellar-astral-expansion-v53.js';
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
const ASTRAL_MODEL_ASSET={
  "portal_normal":'/assets/v53/models/portal_normal.glb',
  "portal_pvp":'/assets/v53/models/portal_pvp.glb',
  "portal_universe":'/assets/v53/models/portal_universe.glb',
  "drone_common":'/assets/v53/models/drone_common.glb',
  "drone_elite":'/assets/v53/models/drone_elite.glb',
  "drone_a":'/assets/v53/models/drone_a.glb',
  "drone_b":'/assets/v53/models/drone_b.glb',
  "drone_c":'/assets/v53/models/drone_c.glb',
  "drone_d":'/assets/v53/models/drone_d.glb',
  "drone_e":'/assets/v53/models/drone_e.glb',
  "astral_aurora":'/assets/v53/models/astral_aurora.glb',
  "astral_nexus":'/assets/v53/models/astral_nexus.glb',
  "astral_eclipse":'/assets/v53/models/astral_eclipse.glb',
  "base_earth":'/assets/v53/models/base_earth.glb',
  "base_mars":'/assets/v53/models/base_mars.glb',
  "base_jupiter":'/assets/v53/models/base_jupiter.glb'
};
const RELAY54_MODEL_ASSET={
  'relay_1_neutral':'/assets/v54/models/relay_1_neutral.glb',
  'relay_2_neutral':'/assets/v54/models/relay_2_neutral.glb',
  'relay_3_neutral':'/assets/v54/models/relay_3_neutral.glb',
  'relay_1_earth':'/assets/v54/models/relay_1_earth.glb',
  'relay_2_earth':'/assets/v54/models/relay_2_earth.glb',
  'relay_3_earth':'/assets/v54/models/relay_3_earth.glb',
  'relay_1_mars':'/assets/v54/models/relay_1_mars.glb',
  'relay_2_mars':'/assets/v54/models/relay_2_mars.glb',
  'relay_3_mars':'/assets/v54/models/relay_3_mars.glb',
  'relay_1_jupiter':'/assets/v54/models/relay_1_jupiter.glb',
  'relay_2_jupiter':'/assets/v54/models/relay_2_jupiter.glb',
  'relay_3_jupiter':'/assets/v54/models/relay_3_jupiter.glb'
};
const MODEL_ASSET={...SHIP_ASSET,...EXT_MODEL_ASSET,...ASTRAL_MODEL_ASSET,...RELAY54_MODEL_ASSET};
for(const id of ["npc_riftScout", "npc_bossRiftScout", "npc_voidCorsair", "npc_bossVoidCorsair", "npc_nexusWarden", "npc_bossNexusWarden", "npc_astralReaper", "npc_bossAstralReaper"])MODEL_ASSET[id]=`/assets/v59/models/${id}.glb`;
// V59: high detail for explicit 3D. Auto mode keeps optimized geometry; OFF keeps 2D fallback.
const HQ_MODEL_ASSET_V59={"SL_AURORA":"/assets/v59/models/SL_AURORA_HQ.glb","SL_LYNX":"/assets/v59/models/SL_LYNX_HQ.glb","SL_PIONEER":"/assets/v59/models/SL_PIONEER_HQ.glb","SL_RAPTOR":"/assets/v59/models/SL_RAPTOR_HQ.glb","SL_VALKYRIE":"/assets/v59/models/SL_VALKYRIE_HQ.glb","SL_BASTION":"/assets/v59/models/SL_BASTION_HQ.glb","SL_LEVIATHAN":"/assets/v59/models/SL_LEVIATHAN_HQ.glb","SL_BULWARK":"/assets/v59/models/SL_BULWARK_HQ.glb","SL_SERAPH":"/assets/v59/models/SL_SERAPH_HQ.glb","SL_PATHFINDER":"/assets/v59/models/SL_PATHFINDER_HQ.glb","SL_PHANTOM":"/assets/v59/models/SL_PHANTOM_HQ.glb","SL_KENSEI":"/assets/v59/models/SL_KENSEI_HQ.glb","SL_MERIDIAN":"/assets/v59/models/SL_MERIDIAN_HQ.glb","npc_aiderStreuner":"/assets/v59/models/npc_aiderStreuner.glb","npc_bossDevolarium":"/assets/v59/models/npc_bossDevolarium.glb","npc_bossLordakia":"/assets/v59/models/npc_bossLordakia.glb","npc_bossMordon":"/assets/v59/models/npc_bossMordon.glb","npc_bossSaimon":"/assets/v59/models/npc_bossSaimon.glb","npc_bossSibelon":"/assets/v59/models/npc_bossSibelon.glb","npc_bossStreuner":"/assets/v59/models/npc_bossStreuner.glb","npc_devolarium":"/assets/v59/models/npc_devolarium.glb","npc_lordakia":"/assets/v59/models/npc_lordakia.glb","npc_mordon":"/assets/v59/models/npc_mordon.glb","npc_recruitStreuner":"/assets/v59/models/npc_recruitStreuner.glb","npc_saimon":"/assets/v59/models/npc_saimon.glb","npc_sibelon":"/assets/v59/models/npc_sibelon.glb","npc_streuner":"/assets/v59/models/npc_streuner.glb","aux9":"/assets/v59/models/aux9.glb","drone_common":"/assets/v59/models/drone_common.glb","drone_elite":"/assets/v59/models/drone_elite.glb","drone_a":"/assets/v59/models/drone_a.glb","drone_b":"/assets/v59/models/drone_b.glb","drone_c":"/assets/v59/models/drone_c.glb","drone_d":"/assets/v59/models/drone_d.glb","drone_e":"/assets/v59/models/drone_e.glb","npc_riftScout":"/assets/v59/models/npc_riftScout.glb","npc_bossRiftScout":"/assets/v59/models/npc_bossRiftScout.glb","npc_voidCorsair":"/assets/v59/models/npc_voidCorsair.glb","npc_bossVoidCorsair":"/assets/v59/models/npc_bossVoidCorsair.glb","npc_nexusWarden":"/assets/v59/models/npc_nexusWarden.glb","npc_bossNexusWarden":"/assets/v59/models/npc_bossNexusWarden.glb","npc_astralReaper":"/assets/v59/models/npc_astralReaper.glb","npc_bossAstralReaper":"/assets/v59/models/npc_bossAstralReaper.glb"};
// V61: IDs das naves no save (phoenix/goliath/...) precisam ser
// traduzidos para o nome do GLB HQ (SL_AURORA/SL_LEVIATHAN/...).
export function requestedModelAssetV59(id, mode=renderMode()){
  const key=ALLOWED_SHIPS_V50[id]?`SL_${ALLOWED_SHIPS_V50[id].toUpperCase()}`:id;
  return mode==='on'?(HQ_MODEL_ASSET_V59[key]||MODEL_ASSET[id]):MODEL_ASSET[id];
}

const ANGULAR_BUCKETS=32,CANVAS_SIZE=160,MAX_CACHED_BITMAPS=100;
const TAG='stellar-ships3d-v50';
const vs=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;
uniform float uYaw;
uniform float uZoom;
uniform float uPivot;
out vec3 vPoint;
void main(){
  float c=cos(uYaw),s=sin(uYaw);
  vec3 v=vec3(aPosition.x,aPosition.y,aPosition.z-uPivot);
  vec3 w=vec3(v.x*c+v.z*s,v.y,-v.x*s+v.z*c);
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
  let uploads=new Map(),cache=new Map(),requests=new Set(),modelZoom=new Map();
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
    // Normalização VISUAL do enquadramento. Os GLBs dos cristais e boxes medem
    // apenas 1-2 unidades, enquanto uma nave tem ~5-6. Sem isso somem no mapa.
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,minZ=Infinity,maxZ=-Infinity;
    for(const p of parts){const v=p.positions;for(let n=0;n<v.length;n+=3){
      minX=Math.min(minX,v[n]);maxX=Math.max(maxX,v[n]);
      minY=Math.min(minY,v[n+1]);maxY=Math.max(maxY,v[n+1]);
      minZ=Math.min(minZ,v[n+2]);maxZ=Math.max(maxZ,v[n+2]);
    }}
    const span=Math.max(maxX-minX,maxZ-minZ+(maxY-minY)*.42,(maxY-minY)*.9);
    modelZoom.set(id,viewportScale*modelZoomFactorV526(id,span));
    uploads.set(id,parts.map(p=>{
      const vert=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vert);gl.bufferData(gl.ARRAY_BUFFER,p.positions,gl.STATIC_DRAW);
      const ind=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ind);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,p.indices,gl.STATIC_DRAW);
      return {vert,ind,color:p.color,emissive:p.emissive,count:p.indices.length};
    }));
  }
  function preload(id){
    if(!MODEL_ASSET[id]||requests.has(id)||uploads.has(id)||!ensureGL())return;
    requests.add(id);
    fetch(requestedModelAssetV59(id),{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error('GLB HTTP '+r.status);return r.arrayBuffer()})
      .then(decodeGlb).then(parts=>uploadParts(id,parts)).catch(e=>console.warn(`[ship3d] ${id}: 2D fallback`,e));
  }
  function render(shipId,angle){
    const parts=uploads.get(shipId);if(!parts?.length||!gl)return null;
    const now=performance.now();if(now-lastFrameTime>16){lastFrameTime=now;framesRendered=0;}
    if(framesRendered>=3)return null;framesRendered++;
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,CANVAS_SIZE,CANVAS_SIZE);
    gl.clearColor(0,0,0,0);gl.clearDepth(1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);gl.uniform1f(gl.getUniformLocation(program,'uYaw'),modelYawFromHeadingV526(angle));
    gl.uniform1f(gl.getUniformLocation(program,'uZoom'),modelZoom.get(shipId)||viewportScale);
    gl.uniform1f(gl.getUniformLocation(program,'uPivot'),shipPivotV53(shipId));
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
  function drawAsset(ctx,id,angle,size){return !isShipAllowedV50(id)&&Boolean(MODEL_ASSET[id])&&drawKey(ctx,id,angle,size);}
  function drawAssetAt(ctx,id,angle,size,x,y){ctx.save();ctx.translate(x,y);const ok=drawAsset(ctx,id,angle,size);ctx.restore();return ok;}
  function setMode(mode){
    const prev=renderMode();const next=['off','on','auto'].includes(mode)?mode:'auto';
    try{localStorage.setItem('stellar3d.v50',next)}catch{}
    if(prev!==next){
      cache.clear();
      // Delete stale buffers and re-request assets only after mode changes, not each frame.
      if(gl)for(const partList of uploads.values())for(const part of partList){gl.deleteBuffer(part.vert);gl.deleteBuffer(part.ind);}
      uploads.clear();requests.clear();modelZoom.clear();
    }
    if(next!=='off')preload('phoenix');
  }
  function getMode(){return renderMode()}
  return {draw,drawAsset,drawAssetAt,preload,setMode,getMode,get supported(){return !dead}};
}
