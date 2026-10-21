// Three additional PvE rooms. Reuses the existing world, NPC and mining engines.
const NEW_SECTORS=Object.freeze([
 {id:'u1',label:'U-1',name:'Nebulosa do Véu',tier:9,minLevel:20,width:12600,height:9100,color:'#5a3d89',accent:'#a4b0ff',npcs:[['riftScout',7],['voidCorsair',7],['bossRiftScout',2]]},
 {id:'u2',label:'U-2',name:'Cemitério Iônico',tier:10,minLevel:21,width:13600,height:9900,color:'#244a59',accent:'#73e6df',npcs:[['voidCorsair',8],['nexusWarden',7],['bossVoidCorsair',2]]},
 {id:'u3',label:'U-3',name:'Horizonte do Vazio',tier:11,minLevel:22,width:14800,height:10600,color:'#563450',accent:'#ffa1c9',npcs:[['nexusWarden',8],['astralReaper',7],['bossAstralReaper',2]]}
]);
export function registerFrontierSectorsV435(maps){
  for(const s of NEW_SECTORS){
    if(maps[s.id])continue;
    maps[s.id]={id:s.id,label:s.label,name:s.name,tier:s.tier,minLevel:s.minLevel,oreYield:4,risk:'Extremo',world:{w:s.width,h:s.height},enemyMultiplier:1,
      ores:['Prometium','Endurium','Terbium'],oreCount:66,landmarkCount:7,
      palette:{nebula:s.color,accent:s.accent,deep:'#060615'},structures:['Passagem Dimensional','Zona de Exploração'],
      portals:sectorPortalsV435(s.label,'earth'),enemyGroups:s.npcs.map(([type,count])=>({type,count}))};
  }
  return maps;
}
export const sectorDestinationV435=label=>{const x=NEW_SECTORS.find(s=>s.label===label);return x?{mapId:x.id,territoryFaction:null,battle:false}:null;};
export const sectorLabelV435=id=>NEW_SECTORS.find(s=>s.id===id)?.label||null;
export const sectorLevelV435=label=>NEW_SECTORS.find(s=>s.label===label)?.minLevel||null;
export function sectorPortalsV435(label,faction='earth'){
  const name=String(label||'');const w=NEW_SECTORS.find(s=>s.label===name);
  const prefix=({earth:'1',mars:'2',jupiter:'3'})[faction]||'1';
  const make=(x,y,to,targetLabel)=>({x,y,to,targetLabel,targetTerritoryFaction:null,battle:false});
  if(w){
    const next=Number(w.id.slice(1));const items=[];
    if(next===1)items.push({...make(540,Math.round(w.height/2),'x8',`${prefix}-8`),targetTerritoryFaction:faction});
    else items.push(make(540,Math.round(w.height/2),'u'+(next-1),'U-'+(next-1)));
    if(next<3)items.push(make(w.width-540,Math.round(w.height/2),'u'+(next+1),'U-'+(next+1)));
    return items;
  }
  if(/^[123]-8$/.test(name))return [make(11130,1650,'u1','U-1')];
  return [];
}
export function frontierServerPortalsV435(mapId,faction,map){
  const label=sectorLabelV435(mapId)||(/^x8$/.test(mapId)?`${({earth:'1',mars:'2',jupiter:'3'})[faction]||'1'}-8`:null);
  const items=sectorPortalsV435(label,faction);
  return mapId==='x8'&&items.length?[{...items[0],x:map.world.w-870,y:Math.min(map.world.h-900,1650)}]:items;
}
export const frontierSectorCatalogV435=NEW_SECTORS.map(({id,label,name,minLevel})=>({id,label,name,minLevel}));
