// V135: the canonical save is mutated only inside the centralized command/receipt transaction.
export const WARFRONT_RECIPES_V135=Object.freeze({
 lf4:{need:12,cores:2,itemId:'lf4'},
 sg3nb02:{need:18,cores:3,itemId:'sg3nb02'},
 g3n7900:{need:15,cores:2,itemId:'g3n7900'}
});
const CLASSES=Object.freeze({
 support:['aegis','hammerclaw','solace','holo'],
 tank:['bigboy','citadel','sentinel','spectrum','berserker','paladin'],
 control:['spearhead','defcom','defcomRaven','mimesis','disruptor','hyperion','keres'],
 singularity:['venom','cyborg','solaris','diminisher','basilisk','hecate']
});
export function warfrontShipClassV135(shipId){return Object.keys(CLASSES).find(c=>CLASSES[c].includes(String(shipId)))||'assault';}
const positive=v=>Math.max(0,Math.floor(Number(v)||0));
function refuse(message){throw Object.assign(Error(message),{status:409,code:'WARFRONT_ACTION_DENIED'});}
export function applyWarfrontActionV135(state,action,itemId){
 if(!state||typeof state!=='object')refuse('Save do piloto inválido');
 const w=state.warfront||{};state.warfront=w;
 w.blueprints||={};w.crafted||={};w.skillMastery||={};state.inventory||={};
 if(action==='craft'){
  const recipe=WARFRONT_RECIPES_V135[String(itemId)];if(!recipe)refuse('Projeto de forja desconhecido');
  if(positive(w.blueprints[itemId])<recipe.need||positive(w.skillCores)<recipe.cores)refuse('Fragmentos ou cores insuficientes');
  w.blueprints[itemId]=positive(w.blueprints[itemId])-recipe.need;
  w.skillCores=positive(w.skillCores)-recipe.cores;
  state.inventory[recipe.itemId]=positive(state.inventory[recipe.itemId])+1;
  w.crafted[itemId]=positive(w.crafted[itemId])+1;
  return {action,item_id:itemId,item_count:state.inventory[recipe.itemId],cores_remaining:w.skillCores};
 }
 if(action==='mastery'){
  const cls=warfrontShipClassV135(state.activeShipId);
  // Never trust a class or ship id supplied by the client.
  if(itemId&&itemId!==cls)refuse('A nave ativa mudou; reabra o hangar');
  const level=Math.max(1,Math.min(5,Math.floor(Number(w.skillMastery[cls])||1)));
  if(level>=5)refuse('Mastery máxima');
  const cost=[2,4,7,11][level-1];if(positive(w.skillCores)<cost)refuse(`Você precisa de ${cost} Skill Cores`);
  w.skillCores=positive(w.skillCores)-cost;w.skillMastery[cls]=level+1;
  return {action,skill_class:cls,level:level+1,cores_remaining:w.skillCores};
 }
 refuse('Operação da forja não permitida');
}
