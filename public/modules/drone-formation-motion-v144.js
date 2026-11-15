import {DRONE_FORMATIONS} from './combat-tactics-v144.js';
const TAU=Math.PI*2,TRANSITION=.75;
// D1..D8 in the pilot's drawings (14 November). X is forward, Y is starboard.
// Numbering is independent of depth sorting. Fewer drones keep their numbered slots.
export const FORMATION_ANCHORS=Object.freeze(Object.fromEntries(Object.entries({
 original:[[-96,0],[-112,40],[-112,-40],[-128,0],[8,-80],[8,80],[-8,-120],[-8,120]],
 furia:[[130,0],[85,80],[85,-80],[25,120],[25,-120],[-85,120],[-85,-120],[-100,0]],
 interceptor:[[112,-40],[112,40],[82,-80],[8,80],[8,-80],[-66,120],[-66,-120],[-96,0]],
 bastiao:[[97,-40],[97,40],[38,-80],[38,80],[-38,-80],[-38,80],[-97,-40],[-97,40]],
 colosso:[[98,-40],[98,40],[68,-80],[68,80],[8,-120],[8,120],[-68,-80],[-68,80]],
 vanguarda:[[97,-40],[97,40],[38,-80],[38,80],[-8,-120],[-8,120],[-66,-120],[-66,120]],
 prisma:[[110,0],[-94,0],[8,-120],[8,120],[66,-80],[66,80],[-50,-80],[-50,80]],
 cacador_supremo:[[108,0],[79,80],[79,-80],[50,120],[50,-120],[-94,40],[-94,-40],[-108,0]],
 leviata:[[94,-40],[94,40],[79,-120],[79,120],[7,-120],[7,120],[-66,-120],[-66,120]]
}).map(([id,slots])=>[id,Object.freeze(slots.map(p=>Object.freeze(p)))])));
export function createFormationMotion(){
 const points=new Map();let order=[],formation=null,heading=0,lastTime=null,lastIds=null,orbitStart=0,orbitHeading=0;
 function sample(ids,id,angle,time,{attacking=false,quality='high'}={}){
  const def=DRONE_FORMATIONS[id]||DRONE_FORMATIONS.original;
  if(lastTime!==null&&time===lastTime&&formation===def.id&&ids===lastIds)return order;
  const first=lastTime===null,dt=first?0:Math.max(0,Math.min(.1,time-lastTime));lastTime=time;
  if(first)heading=angle;
  const delta=Math.atan2(Math.sin(angle-heading),Math.cos(angle-heading));heading+=delta*(1-Math.exp(-dt/.18));
  const switched=formation!==def.id;formation=def.id;
  if(switched&&def.id==='original'){orbitStart=time;orbitHeading=heading;}
  if(ids!==lastIds){const live=new Set(ids.map(String));for(const key of points.keys())if(!live.has(key))points.delete(key);lastIds=ids;}
  const cos=Math.cos(heading),sin=Math.sin(heading);
  for(let i=0;i<ids.length;i++){
   const key=String(ids[i]),phase=time*.8+i*TAU/Math.max(1,ids.length),tier=Math.floor(i/8),side=i%2?-1:1;
   const anchor=FORMATION_ANCHORS[def.id][i%8];
   let x=anchor[0]+tier*44*Math.sign(anchor[0]||side),y=anchor[1]+tier*44*Math.sign(anchor[1]||side),z=0;
   if(def.id==='original'){const a=orbitHeading+(time-orbitStart)*(25*Math.PI/180),rx=x*Math.cos(a)-y*Math.sin(a);y=x*Math.sin(a)+y*Math.cos(a);x=rx;}
   else{
    switch(def.id){
     case 'furia':x+=Math.sin(phase)*5+(attacking?12:0);y+=Math.cos(phase)*4;break;
     case 'interceptor':x+=Math.cos(phase)*10;y+=Math.sin(phase)*7;break;
     case 'bastiao':x+=Math.cos(time*.45+i)*8;y+=Math.sin(time*.45+i)*8;break;
     case 'colosso':x+=Math.sin(time*.6+i)*6;y+=Math.cos(time*.6+i)*4;break;
     case 'vanguarda':x+=Math.sin(time*1.4+i*.8)*18;z=Math.sin(time*1.4+i*.8)*17;break;
     case 'prisma':x+=Math.sin(phase)*6;z=Math.sin(time+i*TAU/Math.max(1,ids.length))*24;break;
     case 'cacador_supremo':x+=Math.max(0,Math.sin(time*1.2+i))*23;z=Math.cos(time*1.2+i)*19;break;
     case 'leviata':x+=Math.sin(time*.65+i)*5;y+=Math.cos(time*.65+i)*7;z=Math.sin(time*.7+i)*15;break;
    }
    const rx=x*cos-y*sin; y=x*sin+y*cos;x=rx;
   }
   y-=z*.36;
   let point=points.get(key);
   if(!point){point={id:key,x,y,z,fromX:x,fromY:y,fromZ:z,start:time,scale:1,alpha:1};points.set(key,point);}
   if(switched){point.fromX=point.x;point.fromY=point.y;point.fromZ=point.z;point.start=time;}
   const progress=Math.max(0,Math.min(1,(time-point.start)/TRANSITION)),e=progress*progress*(3-2*progress);
   const a0=Math.atan2(point.fromY,point.fromX),a1=Math.atan2(y,x),arc=Math.atan2(Math.sin(a1-a0),Math.cos(a1-a0)),radius=Math.hypot(point.fromX,point.fromY)+(Math.hypot(x,y)-Math.hypot(point.fromX,point.fromY))*e;point.x=Math.cos(a0+arc*e)*radius;point.y=Math.sin(a0+arc*e)*radius;point.z=point.fromZ+(z-point.fromZ)*e;
   point.scale=def.depth?1+point.z/180:1;point.alpha=def.depth?.88+(point.z+24)/48*.12:1;
   point.rotation=heading+Math.PI/2;point.shadow=def.depth&&quality!=='low';
  }
  order.length=0;for(const key of ids){const p=points.get(String(key));if(p)order.push(p);}
  // Short positional relaxation avoids sprite overlap while retaining stable drone identities.
  if(dt>0)for(let pass=0;pass<3;pass++)for(let a=0;a<order.length;a++)for(let b=a+1;b<order.length;b++){
   const p=order[a],q=order[b],dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy),min=32*Math.max(p.scale,q.scale);
   if(d<min){const nx=d>.001?dx/d:1,ny=d>.001?dy/d:0,step=(min-d)/2;p.x-=nx*step;p.y-=ny*step;q.x+=nx*step;q.y+=ny*step;}
  }
  order.sort((a,b)=>a.z-b.z);
  return order;
 }
 return {sample,reset(){points.clear();order.length=0;formation=null;heading=0;lastTime=null;lastIds=null;}};
}
export const FORMATION_TRANSITION_SECONDS=TRANSITION;
