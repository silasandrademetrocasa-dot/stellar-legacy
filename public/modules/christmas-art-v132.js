import {BASE_ART,DESIGNS,NPCS} from './christmas-v132.js';
const cache=new Map(),loading=new Map();
const layout={elite:{cols:3,rows:4,top:.025,bottom:.94},designs:{cols:5,rows:5,top:0,bottom:.935},christmas:{cols:3,rows:2,top:0,bottom:1}};
export async function prepareChristmasArt(){
 await Promise.all(Object.entries(layout).map(([key,l])=>new Promise(resolve=>{
 const img=new Image();img.onload=()=>{for(let i=0;i<l.cols*l.rows;i++){
  const col=i%l.cols,row=Math.floor(i/l.cols),w=img.width/l.cols,h=img.height*(l.bottom-l.top)/l.rows,c=document.createElement('canvas');c.width=384;c.height=384;
  // The approved atlas has margins and nonuniform spacing; equal cells cut hulls and include adjacent engines.
  const xs=[20,273,515,754,994,1248],ys=[0,225,447,676,902,1165];
  const x=key==='designs'?xs[col]/1261*img.width:col*w,y=key==='designs'?ys[row]/1247*img.height:img.height*l.top+row*h;
  const sw=key==='designs'?(xs[col+1]-xs[col])/1261*img.width:w,sh=key==='designs'?(ys[row+1]-ys[row])/1247*img.height:h;
  const ratio=Math.min(364/sw,364/sh),dw=sw*ratio,dh=sh*ratio;
  c.getContext('2d').drawImage(img,x,y,sw,sh,(384-dw)/2,(384-dh)/2,dw,dh);
  cache.set(`${key}:${i}`,c.toDataURL('image/png'));
 }resolve();};img.onerror=resolve;img.src=`/assets/v132/${key}.png`;
 })));
}
export function shipChristmasArt(ship,designId=null){const d=DESIGNS.find(d=>d.design_id===designId&&d.eligibility.ship_id===ship);return d?cache.get(`${d.visual.atlas}:${d.visual.cell}`):cache.get(`elite:${BASE_ART[ship]}`);}
export function npcChristmasArt(type){const i=Object.keys(NPCS).indexOf(type);return i<0?null:cache.get(`christmas:${i}`);}
export const boxChristmasArt=()=>cache.get('christmas:4');
export const fireworkChristmasArt=()=>cache.get('christmas:5');
