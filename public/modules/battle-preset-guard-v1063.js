/* V106.3: pure preflight against silent preset-driven loss of equipped items.
   Does not mutate inventories or bypass the V106.2 server hangar intent gate. */
const ids = value => (Array.isArray(value) ? value : []).filter(Boolean).map(String);
const tally = values => {
  const counts = new Map();
  for (const id of values) counts.set(id, (counts.get(id)||0) + 1);
  return counts;
};
const countDifference = (from, to) => {
  const old=tally(from), next=tally(to);
  let removed=0, added=0;
  for(const [key,value] of old) removed+=Math.max(0,value-(next.get(key)||0));
  for(const [key,value] of next) added+=Math.max(0,value-(old.get(key)||0));
  return {before:from.length, after:to.length, removed, added};
};
export function inspectPresetSafetyV1063({currentLoadout, proposedLoadout, currentDrones=[], proposedDrones=[], currentPet=null, proposedPet=null}={}) {
  const current=currentLoadout||{}, proposed=proposedLoadout||{};
  const categories={
    lasers:countDifference(ids(current.lasers),ids(proposed.lasers)),
    generators:countDifference(ids(current.generators),ids(proposed.generators)),
    extras:countDifference(ids(current.extras),ids(proposed.extras)),
    drones:countDifference((currentDrones||[]).flatMap(d=>ids(d?.slots)),(proposedDrones||[]).flatMap(d=>ids(d?.slots))),
    aux:countDifference([ ...ids(currentPet?.lasers), ...ids(currentPet?.shields)],[
      ...ids(proposedPet?.lasers ?? currentPet?.lasers), ...ids(proposedPet?.shields ?? currentPet?.shields)
    ])
  };
  const removed=Object.values(categories).reduce((s,x)=>s+x.removed,0);
  const added=Object.values(categories).reduce((s,x)=>s+x.added,0);
  const hasReduction=Object.values(categories).some(x=>x.after<x.before);
  const protocolIds=['guard','ore','box','repair','kami'];
  const oldProtocols=currentPet?.protocols||{},nextProtocols=proposedPet?.protocols??oldProtocols;
  const specializationChange=protocolIds.some(id=>Number(oldProtocols[id]||0)!==Number(nextProtocols[id]||0));
  const modeChange=Boolean(proposedPet&&String(currentPet?.activeGear||'off')!==String(proposedPet.activeGear||'off'));
  return {categories,removed,added,hasReduction,specializationChange,modeChange,changesEquipment:removed>0||added>0||specializationChange||modeChange};
}
export function presetWarningV1063(kind, report, missing=0) {
  const labels={lasers:'Lasers', generators:'Geradores', extras:'Extras', drones:'Drones', aux:'AUX'};
  const changed=Object.entries(report?.categories||{}).filter(([,v])=>v.before!==v.after);
  const lines=changed.map(([key,v])=>`${labels[key]||key}: ${v.before} → ${v.after}`);
  if(report?.removed && !changed.length) lines.push(`${report.removed} item(ns) serão substituídos por modelos diferentes.`);
  if(report?.specializationChange)lines.push('Especializações do AUX serão substituídas pelas deste preset.');
  if(report?.modeChange)lines.push('Modo ativo do AUX será alterado.');
  if(missing>0) lines.push(`${missing} equipamento(s) do preset não estão disponíveis.`);
  if(!lines.length) return '';
  return `APLICAR ${kind} alterará sua montagem:\n${lines.join('\n')}\n\nOs itens removidos voltam ao INVENTÁRIO. Confirmar essa operação?`;
}
export function presetStateStampV1063(progress){
  // Guards the asynchronous confirmation interval against another hangar edit.
  return JSON.stringify([progress?.activeShipId,progress?.shipLoadout,progress?.drones,progress?.pet,progress?.inventory,progress?.combatConfigsV2013?.active]);
}
