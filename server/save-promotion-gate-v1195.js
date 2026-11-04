/**
 * V119.5: an explicit source-controlled cutover gate. Do not mark a module
 * migrated until its legacy RPC stops writing game_saves or goes through the
 * same transactional command validator. An environment variable alone is not
 * evidence of migration and can never bypass this list.
 */
export const SAVE_MIGRATION_COVERAGE_V1195=Object.freeze([
 {module:'checkpoint',migrated:false,reason:'V119 gateway optional; V118 HTTP remains live'},
 {module:'hangar',migrated:false,reason:'Equipment mutation RPCs remain distinct'},
 {module:'npc_ore',migrated:false,reason:'NPC and ore rewards still use legacy RPCs'},
 {module:'farm',migrated:false,reason:'Farm claim v1111 remains an independent writer'},
 {module:'missions_pass',migrated:false,reason:'Mission and pass claims independent'},
 {module:'purchase_sale',migrated:false,reason:'Shop and trade flow uses V118'},
 {module:'auction',migrated:false,reason:'Auction v1182 atomic but outside V119 receipts'},
 {module:'pvp_arena',migrated:false,reason:'PvP and Arena remain separate'},
 {module:'clans_relays',migrated:false,reason:'Clan and relay credit RPCs remain separate'},
 {module:'coupons_events',migrated:false,reason:'Coupons and event rewards still independent'}
]);
export function savePromotionReadinessV1195({requestedMode='observe',coverage=SAVE_MIGRATION_COVERAGE_V1195}={}){
 const pending=coverage.filter(x=>x.migrated!==true).map(x=>x.module);
 return {requestedMode:String(requestedMode).toLowerCase()==='enforce'?'enforce':'observe',
   effectiveMode:pending.length===0&&String(requestedMode).toLowerCase()==='enforce'?'enforce':'observe',
   ready:pending.length===0, pendingModules:pending, completedModules:coverage.length-pending.length,
   totalModules:coverage.length};
}
