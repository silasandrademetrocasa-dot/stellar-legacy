// V46.1 — posições fixas por destino: espelham o roteiro aprovado por facção.
// Independente do desenho do grafo; não move os portais já existentes DENTRO de U-1/U-2/U-3.
const point={TL:[.055,.085],TR:[.945,.085],BL:[.055,.915],BR:[.945,.915],CENTER:[.5,.5]};
const slots=Object.freeze({
 '4-1':{'1-1':'TL','4-2':'TR','4-3':'BR'},
 '4-2':{'2-1':'TR','4-1':'BL','4-3':'BR'},
 '4-3':{'3-1':'BR','4-1':'BL','4-2':'TL'}
});
export const CANONICAL_LINKS_V461=Object.freeze([
 ...['1','2','3'].flatMap(f=>Array.from({length:7},(_,i)=>[`${f}-${i+1}`,`${f}-${i+2}`])),
 ['1-1','4-1'],['2-1','4-2'],['3-1','4-3'],
 ['4-1','4-2'],['4-1','4-3'],['4-2','4-3'],
 ['1-8','U-1'],['2-8','U-1'],['3-8','U-1'],['U-1','U-2'],['U-2','U-3']
]);
export function portalSlotV461(from,to){
 const a=String(from||''),b=String(to||'');
 if(slots[a])return slots[a][b]||null;
 const m=/^([123])-([1-8])$/.exec(a);if(!m)return null;
 const f=m[1],n=Number(m[2]);
 if(n===1&&b===`4-${f}`)return 'CENTER';
 if(n===8&&b==='U-1')return 'CENTER';
 if(n<8&&b===`${f}-${n+1}`)return f==='1'?'BR':f==='2'?'BL':'TL';
 if(n>1&&b===`${f}-${n-1}`)return f==='1'?'TL':f==='2'?'TR':'BR';
 return null;
}
export function portalPointV461(from,to,world){
 const slot=portalSlotV461(from,to),v=point[slot];if(!v)return null;
 const w=Math.max(1000,Number(world?.w)||6000),h=Math.max(1000,Number(world?.h)||4500);
 const inset=260;
 return {x:Math.round(Math.max(inset,Math.min(w-inset,w*v[0]))),y:Math.round(Math.max(inset,Math.min(h-inset,h*v[1])))};
}
export function canonicalClientGraphV461(graph){
 const wanted=new Set(CANONICAL_LINKS_V461.map(([a,b])=>[a,b].sort().join('|')));
 const seen=new Set();
 return (graph||[]).filter(([a,b])=>{const k=[a,b].sort().join('|');if(!wanted.has(k)||seen.has(k))return false;seen.add(k);return true});
}
