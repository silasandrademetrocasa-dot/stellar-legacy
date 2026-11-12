// One top-down sprite, rotated only in the map plane. Keep the last bearing at rest.
export function smoothAuxHeading(current, target, dt) {
  const from=Number.isFinite(current)?current:0;
  if(!Number.isFinite(target))return from;
  const seconds=Math.max(0,Math.min(.1,Number(dt)||0));
  const delta=Math.atan2(Math.sin(target-from),Math.cos(target-from));
  const eased=delta*(1-Math.exp(-10*seconds));
  const limit=4.2*seconds; // <= 241 degrees/second, including lag spikes
  const angle=from+Math.max(-limit,Math.min(limit,eased));
  return Math.atan2(Math.sin(angle),Math.cos(angle));
}
export function auxSpriteRotation(heading) {
  // The approved artwork points up; map heading zero points right.
  return (Number.isFinite(heading)?heading:0)+Math.PI/2;
}
