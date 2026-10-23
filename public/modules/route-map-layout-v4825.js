// V48.2.5 — somente coordenadas do desenho. Não altera ligações, permissões ou destinos reais.
const XY=Object.freeze({
  '1':[[14,23],[38,23],[62,23],[86,23],[86,46],[62,46],[38,46],[14,46]],
  '2':[[14,23],[38,23],[62,23],[86,23],[86,46],[62,46],[38,46],[14,46]],
  '3':[[14,23],[38,23],[62,23],[86,23],[86,46],[62,46],[38,46],[14,46]]
});
export const ROUTE_VIEWS_V4825=Object.freeze(['all','1','2','3']);
export function routeViewV4825(view,admin=false){return admin&&ROUTE_VIEWS_V4825.includes(String(view))?String(view):null;}
export function routeMapLayoutV4825(raw,{admin=false,prefix='1',view='all'}={}){
  const own=['1','2','3'].includes(String(prefix))?String(prefix):'1';
  const selected=admin?routeViewV4825(view,true)||'all':own;
  const all=selected==='all'&&admin;
  const list=(raw||[]).filter(n=>{
    if(!n?.id)return false;
    if(/^U-[123]$/.test(n.id)||/^4-[123]$/.test(n.id))return true;
    return /^([123])-([1-8])$/.test(n.id)&&(all||n.id.startsWith(selected+'-'));
  });
  const stable=(n)=>{
    const m=/^([123])-([1-8])$/.exec(n.id);
    if(m){const row=Number(m[2])-1;
      if(all)return {x:12+row*10.85,y:19+(Number(m[1])-1)*22};
      return {x:XY[m[1]][row][0],y:XY[m[1]][row][1]};
    }
    if(/^4-[123]$/.test(n.id)){
      const i=Number(n.id.slice(-1))-1;
      return {x:all?24+i*26:18+i*32,y:all?80:69};
    }
    if(/^U-[123]$/.test(n.id)){
      const i=Number(n.id.slice(-1))-1;
      return {x:all?24+i*26:18+i*32,y:all?94:87};
    }
    return {x:n.x,y:n.y};
  };
  return list.map(n=>({...n,...stable(n)}));
}
