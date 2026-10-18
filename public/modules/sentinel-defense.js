// O Sentinela é defensivo: um NPC só vira alvo após causar dano REAL ao piloto.
export const SENTINEL_RETALIATION_SECONDS = 12;

export function sentinelAttackerEligible(npc, now, maxAge = SENTINEL_RETALIATION_SECONDS) {
  if (!npc || npc.isPlayer || !(Number(npc.hp) > 0)) return false;
  const at = Number(npc.lastAttackPlayerAt);
  return Number.isFinite(at) && at > 0 && Number.isFinite(now) && now >= at && now - at <= maxAge;
}

export function selectSentinelAttacker(npcs, ship, range, now, previousId = null) {
  if (!ship || !Number.isFinite(Number(ship.x)) || !Number.isFinite(Number(ship.y))) return null;
  const viable = (Array.isArray(npcs) ? npcs : []).filter(npc =>
    sentinelAttackerEligible(npc, now) &&
    Number.isFinite(Number(npc.x)) && Number.isFinite(Number(npc.y)) &&
    Math.hypot(npc.x - ship.x, npc.y - ship.y) <= range
  );
  const locked = viable.find(npc => String(npc.id) === String(previousId) && previousId != null);
  return locked || viable.sort((a, b) => Number(b.lastAttackPlayerAt) - Number(a.lastAttackPlayerAt))[0] || null;
}
