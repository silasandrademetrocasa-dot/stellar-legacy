/* V114.3 — log de combate confirmado pelo banco, reprodução visual com limite no celular. */
export const ARENA_MAX_VISIBLE_EVENTS_V1143=48;
export function arenaVisibleCombatLogV1143(input,limit=ARENA_MAX_VISIBLE_EVENTS_V1143){
 const list=Array.isArray(input)?input:[];
 const cap=Math.max(2,Math.min(240,Math.floor(Number(limit)||ARENA_MAX_VISIBLE_EVENTS_V1143)));
 if(list.length<=cap)return list;
 const indices=new Set([0,list.length-1]);
 for(let i=1;i<cap-1;i++)indices.add(Math.floor(i*(list.length-1)/(cap-1)));
 return [...indices].sort((a,b)=>a-b).map(index=>list[index]);
}
export function arenaBattleTimeoutMessageV1143(events){
 const len=Array.isArray(events)?events.length:0;
 return len>ARENA_MAX_VISIBLE_EVENTS_V1143?`Exibindo ${ARENA_MAX_VISIBLE_EVENTS_V1143} de ${len} eventos; resultado oficial preservado.`:null;
}
