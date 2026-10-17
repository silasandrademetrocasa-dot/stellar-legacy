// Universo Dinâmico: mapeia avisos autenticados do banco para o motor existente.
// Não aceita pedidos de spawn vindos do navegador. Nunca cria prémios novos no cliente.
const MAPS = new Set(['x1','x2','x3','x4','x5','x6','x7','x8','b41','b42','b43']);
const CATEGORIES = Object.freeze({invasion:'invasion',boss:'titan_assault',resource:'ore_frenzy'});
export function selectLiveDirective(rows, mapId, now=Date.now()) {
  if(!MAPS.has(String(mapId)))return null;
  const eligible=(Array.isArray(rows)?rows:[]).filter(row=> {
    if(!row || row.enabled!==true || !Object.hasOwn(CATEGORIES,String(row.category)))return false;
    if(row.map_id!=='all' && row.map_id!==mapId)return false;
    const start=Date.parse(row.starts_at),end=Date.parse(row.ends_at);
    return Number.isFinite(start)&&Number.isFinite(end)&&start<=now&&now<end;
  });
  // Evento específico do mapa vence um evento genérico; desempate estável pelo início e ID.
  eligible.sort((a,b)=>Number(b.map_id===mapId)-Number(a.map_id===mapId)||Date.parse(a.starts_at)-Date.parse(b.starts_at)||Number(a.id)-Number(b.id));
  return eligible[0]||null;
}
export function directiveToWorldEvent(row,mapId){
  if(!row || !Object.hasOwn(CATEGORIES,String(row.category)))return null;
  const start=Date.parse(row.starts_at),end=Date.parse(row.ends_at);
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return null;
  const id=CATEGORIES[row.category];
  const target=row.category==='boss'?1:row.category==='resource'?100:30;
  return {id,eventId:`directive:${String(row.id).slice(0,24)}:${start}:${mapId}`,name:String(row.title||'Operação Espacial').slice(0,80),desc:String(row.description||'').slice(0,280),source:'universe-directive',target,start,end,icon:row.category==='boss'?'☄':'⚔',reward:{},rules:{},priority:200};
}
