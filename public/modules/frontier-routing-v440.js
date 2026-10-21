// Canonical portal selection. Database topology wins whenever U-1 has been registered.
import {frontierServerPortalsV435,sectorPortalsV435} from './frontier-sectors-v435.js';
const labelKey=p=>[String(p?.targetLabel||''),String(p?.to||''),String(p?.targetTerritoryFaction||'')].join('|');
export function uniqueFrontierPortalsV440(list){
 const seen=new Set(),result=[];
 for(const p of list||[]){if(!p||!p.to)continue;const key=labelKey(p);if(seen.has(key))continue;seen.add(key);result.push(p);}
 return result;
}
// For offline maps (before SQL installation) keep existing code-based exits.
// With official SQL links installed, never resurrect an ADM-disabled route.
export function mergeFrontierServerPortalsV440(mapId,faction,map,runtimeLinks,topology){
 const base=frontierServerPortalsV435(mapId,faction,map)||[];
 const out=Array.isArray(runtimeLinks)?runtimeLinks:[];
 const managed=Array.isArray(topology)&&topology.some(p=>/^(?:U-[123])$/.test(String(p.from_sector||''))||/^(?:U-[123])$/.test(String(p.to_sector||'')));
 if(!managed)return uniqueFrontierPortalsV440([...out,...base]);
 const positions=new Map(base.map(p=>[p.targetLabel,p]));
 // Take *only* runtime links; static coordinates are cosmetic and cannot grant access.
 return uniqueFrontierPortalsV440(out.map(p=>positions.has(p.targetLabel)?{...p,...positions.get(p.targetLabel)}:p));
}
export function filteredFrontierPortalsV440(label,faction,neighbors,managed){
 const base=sectorPortalsV435(label,faction);
 if(!managed)return uniqueFrontierPortalsV440(base);
 const allowed=new Set(Array.isArray(neighbors)?neighbors:[]);
 return uniqueFrontierPortalsV440(base.filter(p=>allowed.has(p.targetLabel)));
}
