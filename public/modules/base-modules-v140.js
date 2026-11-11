// Presentation/navigation only. All actions open existing panels and keep server validation.
export const BASE_VIEW_V140=Object.freeze({width:1000,height:562.5,anchorX:.5,anchorY:.64});
export const BASE_MODULES_V140=Object.freeze([
 {id:'missions',label:'MISSÕES',x:.17,y:.37},
 {id:'commerce',label:'COMÉRCIO',x:.83,y:.37},
 {id:'hangar',label:'HANGAR / EQUIPAMENTOS',x:.16,y:.79},
 {id:'portals',label:'PORTAIS ASTRAIS',x:.84,y:.79}
].map(Object.freeze));
const colors={earth:'#4fd7ff',mars:'#ff6a59',jupiter:'#bd78ff'};
const pads={
 earth:{missions:[.151,.365],commerce:[.842,.365],hangar:[.14,.805],portals:[.86,.805]},
 mars:{missions:[.174,.365],commerce:[.825,.365],hangar:[.164,.785],portals:[.835,.785]},
 jupiter:{missions:[.174,.365],commerce:[.825,.365],hangar:[.164,.785],portals:[.835,.785]}
};
export const hasBaseV140=mapId=>mapId==='x1'||mapId==='x8';
export const baseArtV140=faction=>colors[faction]?`/assets/v140/bases/${faction}.webp`:null;
export function modulePointV140(id,base,faction='earth'){
 const m=BASE_MODULES_V140.find(m=>m.id===id);if(!m||!base)return null;
 const [x,y]=pads[faction]?.[id]||[m.x,m.y];
 return {id:m.id,label:m.label,x:base.x+(x-.5)*BASE_VIEW_V140.width,y:base.y+(y-BASE_VIEW_V140.anchorY)*BASE_VIEW_V140.height};
}
export function hitBaseModuleV140(point,base,faction='earth'){
 return BASE_MODULES_V140.map(m=>modulePointV140(m.id,base,faction)).find(m=>((point.x-m.x)/58)**2+((point.y-m.y)/48)**2<=1)||null;
}
export function createBaseNavigationV140({getContext,move,open,notify=()=>{}}){
 let pending=null;
 const eligible=c=>!!c?.enabled&&!!c?.own&&hasBaseV140(c.mapId)&&!!colors[c.faction]&&!!c.base&&!!c.position;
 function state(){
  if(!pending)return null;
  const c=getContext();if(!eligible(c)||c.key!==pending.key){pending=null;return null;}
  const point=modulePointV140(pending.id,c.base,c.faction);
  // Another movement command supersedes this approach; never open a stale panel.
  if(c.destination&&Math.hypot(c.destination.x-pending.x,c.destination.y-pending.y)>5){pending=null;return null;}
  return {...pending,...point,ready:Math.hypot(c.position.x-point.x,c.position.y-point.y)<=90};
 }
 function activate(){const p=state();if(!p?.ready)return false;pending=null;open(p.id);return true;}
 return {
  state,cancel(){pending=null;},activate,
  hit(point){const c=getContext();return eligible(c)?hitBaseModuleV140(point,c.base,c.faction):null;},
  select(id){
   const c=getContext(),point=modulePointV140(id,c?.base,c?.faction);if(!eligible(c)||!point)return false;
   pending={...point,key:c.key};move(point);
   if(Math.hypot(c.position.x-point.x,c.position.y-point.y)<=90)return activate();
   notify(`Aproximando: ${point.label}`);return true;
  }
 };
}
export function drawBaseModulesV140(ctx,{faction,getImage,selected=null}){
 const path=baseArtV140(faction),image=path&&getImage(path);if(!image?.naturalWidth)return false;
 const {width,height,anchorY}=BASE_VIEW_V140;
 ctx.drawImage(image,-width/2,-height*anchorY,width,height);
 if(selected){
  const p=modulePointV140(selected.id,{x:0,y:0},faction);if(p){
   ctx.save();ctx.strokeStyle=colors[faction];ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y,58,48,0,0,Math.PI*2);ctx.stroke();
   ctx.font='bold 12px Arial';ctx.textAlign='center';ctx.fillStyle='#effaff';ctx.fillText(p.label,p.x,p.y-58);ctx.restore();
  }
 }
 return true;
}
