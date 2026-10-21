// Promotes one existing U-sector boss to an elite, without adding new NPCs.
// Existing server-owned NPC damage, phases and reward ledger remain authoritative.
const ELItes=Object.freeze({
 u1:{npc:'bossRiftScout',name:'VIGIA DA NEBULOSA',scale:1.65,color:'#b9a2ff',rewardMult:1.10},
 u2:{npc:'bossVoidCorsair',name:'TITÃ IÔNICO',scale:2.15,color:'#72e5da',rewardMult:1.15},
 u3:{npc:'bossAstralReaper',name:'GUARDIÃO DO VAZIO',scale:3.1,color:'#ff86b5',rewardMult:1.25}
});
export function frontierBossSetupV440(mapId,npcType,index){
 const b=ELItes[String(mapId||'')];
 if(!b||npcType!==b.npc||index!==0)return null;
 return {name:b.name,scale:b.scale,color:b.color,rewardMult:b.rewardMult,size:66,rarePatrol:true};
}
