/* V106.1 — Preferencias de tiro aguardando ACK.
 * NUNCA transporta stocks, moedas, recompensas, inventario ou configuracoes de nave.
 */
export function createAmmoSelectionTrackerV1061({laserIds=[],rocketIds=[]}={}){
  const allowed={selectedLaserAmmo:new Set(laserIds),selectedRocket:new Set(rocketIds)};
  const pending=Object.create(null);
  const keys=Object.keys(allowed);
  const accepts=(key,value)=>Object.hasOwn(allowed,key)&&typeof value==='string'&&allowed[key].has(value);
  return {
    accepts,
    mark(key,value){if(!accepts(key,value))return false;pending[key]=value;return true;},
    merge(remote){
      if(!remote||typeof remote!=='object'||Array.isArray(remote))return remote;
      const changes=Object.fromEntries(keys.filter(key=>Object.hasOwn(pending,key)).map(key=>[key,pending[key]]));
      return Object.keys(changes).length?{...remote,...changes}:remote;
    },
    confirm(snapshot){
      for(const key of keys)if(Object.hasOwn(pending,key)&&snapshot?.[key]===pending[key])delete pending[key];
      return !this.pending;
    },
    reset(){for(const key of keys)delete pending[key];},
    get pending(){return keys.some(key=>Object.hasOwn(pending,key));},
    get desired(){return {...pending};}
  };
}
