// V21.1 — Progressão endgame observacional; NUNCA concede XP, CR, STL ou itens.
// Registros são derivados do save existente e são compatíveis com contas antigas.
export const ELITE_OBJECTIVES_V21=Object.freeze([
 {id:'pilot',label:'Comandante de Elite',desc:'Alcance o nível 25.',key:'level',target:25,icon:'✦'},
 {id:'pilot_75',label:'Almirante do Vazio',desc:'Alcance o nível 75.',key:'level',target:75,icon:'✧'},
 {id:'pilot_125',label:'Lenda do Cosmos',desc:'Alcance o nível 125.',key:'level',target:125,icon:'✧'},
 {id:'hunter',label:'Defensor Galáctico',desc:'Derrote 1.000 NPCs.',key:'aliensKilled',target:1000,icon:'✹'},
 {id:'hunter_10k',label:'Exterminador de Setores',desc:'Derrote 10.000 NPCs.',key:'aliensKilled',target:10000,icon:'✹'},
 {id:'operative',label:'Operador Veterano',desc:'Conclua 50 missões.',key:'missions',target:50,icon:'▣'},
 {id:'operative_250',label:'Mestre das Operações',desc:'Conclua 250 missões.',key:'missions',target:250,icon:'▣'},
 {id:'navigator',label:'Explorador dos Setores',desc:'Realize 100 viagens por portais.',key:'mapJumps',target:100,icon:'◎'},
 {id:'navigator_500',label:'Cartógrafo da Galáxia',desc:'Realize 500 viagens por portais.',key:'mapJumps',target:500,icon:'◎'},
 {id:'gate',label:'Guardião de Portais',desc:'Conclua 3 Portais Astrais.',key:'ggCompleted',target:3,icon:'◉'},
 {id:'gate_25',label:'Senhor dos Portais',desc:'Conclua 25 Portais Astrais.',key:'ggCompleted',target:25,icon:'◉'},
 {id:'salvager',label:'Mestre da Recuperação',desc:'Colete 250 boxes.',key:'boxes',target:250,icon:'◆'},
 {id:'salvager_1000',label:'Recuperador Supremo',desc:'Colete 1.000 boxes.',key:'boxes',target:1000,icon:'◆'}
]);
export const clampValue=(x,min=0,max=Number.MAX_SAFE_INTEGER)=>Math.max(min,Math.min(max,Number.isFinite(Number(x))?Number(x):min));
export function deriveEliteOperations(metrics={}){
 const items=ELITE_OBJECTIVES_V21.map(def=>{
  const value=Math.floor(clampValue(metrics[def.key]));
  const pct=Math.round(Math.min(100,(value/def.target)*100));
  return {id:def.id,label:def.label,desc:def.desc,icon:def.icon,value,target:def.target,pct,complete:value>=def.target};
 });
 const done=items.filter(item=>item.complete).length;
 return {items,done,total:items.length,percent:Math.round(done/items.length*100),status:done===items.length?'LENDÁRIO':done>=6?'VETERANO':'EM EVOLUÇÃO'};
}
