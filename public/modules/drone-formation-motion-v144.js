import {DRONE_FORMATIONS} from './combat-tactics-v144.js';
const TAU=Math.PI*2,TRANSITION=.75;
const anchors={furia:[[115,0],[66,-65],[66,65],[-90,0]],interceptor:[[70,-108],[70,108],[-66,-108],[-66,108]],bastiao:[[74,-74],[74,74],[-74,-74],[-74,74]],colosso:[[12,-106],[12,106],[-85,-70],[-85,70]],vanguarda:[[106,-59],[106,59],[-48,-90],[-48,90]],prisma:[[120,0],[0,-112],[-112,0],[0,112]],cacador_supremo:[[128,-55],[128,55],[-65,-105],[-65,105]],leviata:[[64,-89],[64,89],[-73,-100],[-73,100]]};
export function createFormationMotion(){
 const points=new Map();let order=[],formation=null,heading=0,lastTime=null,lastIds=null;
 function sample(ids,id,angle,time,{attacking=false,quality='high'}={}){
  const def=DRONE_FORMATIONS[id]||DRONE_FORMATIONS.original;
  if(lastTime!==null&&time===lastTime&&formation===def.id&&ids===lastIds)return order;
  const dt=lastTime===null?0:Math.max(0,Math.min(.1,time-lastTime));lastTime=time;
  const delta=Math.atan2(Math.sin(angle-heading),Math.cos(angle-heading));heading+=delta*(1-Math.exp(-dt/.18));
  const switched=formation!==def.id;formation=def.id;
  if(ids!==lastIds){const live=new Set(ids.map(String));for(const key of points.keys())if(!live.has(key))points.delete(key);lastIds=ids;}
  const cos=Math.cos(heading),sin=Math.sin(heading);
  for(let i=0;i<ids.length;i++){
   const key=String(ids[i]),phase=time*.8+i*TAU/Math.max(1,ids.length),tier=Math.floor(i/4),side=i%2?-1:1;
   let x,y,z=0;
   if(def.id==='original'){const a=time*(25*Math.PI/180)+i*TAU/Math.max(1,ids.length);const radius=Math.max(83,ids.length*32/TAU)+(ids.length>10?Math.floor(i/10)*40:0);x=Math.cos(a)*radius;y=Math.sin(a)*radius;}
   else{
    const a=anchors[def.id][Math.floor(i*4/Math.min(4,ids.length))%4];x=a[0]+tier*44*Math.sign(a[0]||side);y=a[1]+tier*44*Math.sign(a[1]||side);
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
