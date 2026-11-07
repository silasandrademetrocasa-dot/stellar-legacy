import {BASE_ART,DESIGNS,NPCS} from './christmas-v132.js';
const cache=new Map(),loading=new Map();
const layout={elite:{cols:3,rows:4,top:.025,bottom:.94},designs:{cols:5,rows:5,top:0,bottom:.935},christmas:{cols:3,rows:2,top:0,bottom:1}};
export async function prepareChristmasArt(){
 await Promise.all(Object.entries(layout).map(([key,l])=>new Promise(resolve=>{
 const img=new Image();img.onload=()=>{for(let i=0;i<l.cols*l.rows;i++){
  const w=img.width/l.cols,h=img.height*(l.bottom-l.top)/l.rows,c=document.createElement('canvas');c.width=384;c.height=384;
  c.getContext('2d').drawImage(img,(i%l.cols)*w,img.height*l.top+Math.floor(i/l.cols)*h,w,h,0,0,384,384);
  cache.set(`${key}:${i}`,c.toDataURL('image/png'));
 }resolve();};img.onerror=resolve;img.src=`/assets/v132/${key}.png`;
 })));
}
export function shipChristmasArt(ship,designId=null){const d=DESIGNS.find(d=>d.design_id===designId&&d.eligibility.ship_id===ship);return d?cache.get(`${d.visual.atlas}:${d.visual.cell}`):cache.get(`elite:${BASE_ART[ship]}`);}
export function npcChristmasArt(type){const i=Object.keys(NPCS).indexOf(type);return i<0?null:cache.get(`christmas:${i}`);}
export const boxChristmasArt=()=>cache.get('christmas:4');
export const fireworkChristmasArt=()=>cache.get('christmas:5');
