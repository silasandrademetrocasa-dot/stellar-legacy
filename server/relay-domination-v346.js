// V34.6 — deterministic limits shared by server, UI tests and SQL migrations.
export const RELAY_MAPS=Object.freeze(['b41','b42','b43']);
export const RELAY_IDS=Object.freeze(['A','B','C']);
export const RELAY_SLOTS=Object.freeze({weapon:[1,2],shield:[3,4],hp:[5,6],bonus:[7,8]});
export const RELAY_BONUS_VALUES=Object.freeze({damage:[3,4,5],shield:[5,7,9],hp:[5,7,9],speed:[2,3,4],xp:[5,7,10],resources:[3,4,5]});
export const RELAY_PARTS=Object.freeze({weapon:'weapon_parts',shield:'shield_parts',hp:'hull_parts',bonus:'circuit_parts'});
export const RELAY_BUILD=Object.freeze({1:{parts:5,credits:0,minClanLevel:1},2:{parts:12,credits:100000,minClanLevel:3},3:{parts:25,credits:350000,minClanLevel:5}});
export const RELAY_BASE=Object.freeze({shield:240000,hp:360000,hit:12000,hitCooldownMs:650,weaponRange:950,attackRange:1200,neutralCaptureMs:8000,protectionMs:90000});
export function slotCategory(slot){let n=Number(slot);return Object.keys(RELAY_SLOTS).find(cat=>RELAY_SLOTS[cat].includes(n))||null;}
export function validRelayKey(map,node){return RELAY_MAPS.includes(map)&&RELAY_IDS.includes(node);}
export function validModule(module){
 if(!module||!Number.isInteger(Number(module.level))||module.level<1||module.level>3)return false;
 const cat=slotCategory(module.slot),attr=String(module.attribute||'');
 return cat===module.category && (cat!=='bonus'||Object.hasOwn(RELAY_BONUS_VALUES,attr)) && (cat==='bonus'||attr===cat);
}
export function slotAssignmentAllowed(modules,module){
 if(!validModule(module)||!Array.isArray(modules))return false;
 return !modules.some(m=>Number(m.slot)===Number(module.slot)||module.category==='bonus'&&m.category==='bonus'&&m.attribute===module.attribute);
}
export function bestBonus(modules){
 const eligible=(modules||[]).filter(m=>m?.category==='bonus'&&Object.hasOwn(RELAY_BONUS_VALUES,m.attribute)&&Number.isInteger(Number(m.level))&&m.level>=1&&m.level<=3);
 const sorted=eligible.map(m=>({attribute:m.attribute,level:Number(m.level),value:RELAY_BONUS_VALUES[m.attribute][Number(m.level)-1]})).sort((a,b)=>b.level-a.level||b.value-a.value||a.attribute.localeCompare(b.attribute));
 return sorted[0]||null;
}
export function clanSupremacy(nodes,clanId){
 const clan=String(clanId||'');if(!clan)return [];
 return RELAY_MAPS.filter(map=>RELAY_IDS.every(id=>nodes.some(n=>n.map_id===map&&n.node_id===id&&n.owner_clan_id===clan)));
}
export function factionSupremacy(nodes){
 if(!RELAY_MAPS.every(map=>RELAY_IDS.every(id=>nodes.some(n=>n.map_id===map&&n.node_id===id))))return null;
 const owners=new Set(nodes.filter(n=>validRelayKey(n.map_id,n.node_id)).map(n=>n.owner));
 return owners.size===1&&['earth','mars','jupiter'].includes([...owners][0])?[...owners][0]:null;
}
export function derivedGlobalBonus(nodes,modules,clanId,faction){
 const maps=clanSupremacy(nodes,clanId),dominant=factionSupremacy(nodes);
 const own=nodes.filter(n=>maps.includes(n.map_id)&&n.owner_clan_id===clanId);
 const clan=bestBonus(modules.filter(m=>own.some(n=>n.map_id===m.map_id&&n.node_id===m.node_id)));
 const fac=dominant===faction?bestBonus(modules.filter(m=>nodes.some(n=>n.map_id===m.map_id&&n.node_id===m.node_id&&n.owner===faction))):null;
 // Only the single strongest bonus, not additive, even when both regimes apply.
 const strongest=bestBonus([...(clan?[{...clan,category:'bonus'}]:[]),...(fac?[{...fac,category:'bonus'}]:[])]);
 return {clanMaps:maps,factionDominance:dominant,clanBonus:clan,factionBonus:fac,active:strongest};
}
export function applyRelayDamage(shield,hp,damage){
 let left=Math.max(0,Math.floor(Number(damage)||0));let s=Math.max(0,Math.floor(Number(shield)||0)),h=Math.max(0,Math.floor(Number(hp)||0));const usedShield=Math.min(left,s);s-=usedShield;left-=usedShield;const usedHp=Math.min(left,h);h-=usedHp;return {shield:s,hp:h,actual:usedShield+usedHp,broken:h===0};
}

export const validRelayModuleId=id=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id||''));
