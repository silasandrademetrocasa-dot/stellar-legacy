import {formationFor} from '../public/modules/combat-tactics-v144.js';
export function dronePresentation(state){
 return {formationId:formationFor(state).id,drones:(Array.isArray(state?.drones)?state.drones:[]).slice(0,64).map(d=>({id:String(d.id).slice(0,96),type:d.type==='iris'?'iris':'flax'}))};
}
