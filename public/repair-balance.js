// V19.0.10 — Pure repair pulse rules.  Receives the live, validated ITEMS entry.
// Keep this module dependency-free so we can regression-test the real game rules.
const BASE_HP_PER_SECOND=5000;
const BASE_SHIELD_PER_SECOND=10000;
const DEFAULT_DELAY_SECONDS=5;

function boundedSetting(value, fallback, max){
  // Zero is intentional in the ADM: disable this pulse / remove the delay.
  if(value === undefined || value === null || value === '')return fallback;
  const number=Number(value);
  return Number.isFinite(number)?Math.max(0,Math.min(max,number)):fallback;
}

export function repairPulseSettings({
  repairBot=null,
  baseSafe=false,
  secondsWithoutDamage=0,
  premium=false,
  designerMultiplier=1,
  shieldRegenBonus=0
}={}){
  // Defaults retain the behavior that players had before V19.0.10.
  const oldElite=repairBot?.id==='repElite';
  const hpBase=repairBot?boundedSetting(repairBot.repairTick,oldElite?10000:BASE_HP_PER_SECOND,1000000):BASE_HP_PER_SECOND;
  const shieldBase=repairBot?boundedSetting(repairBot.shieldRepairTick,oldElite?15000:BASE_SHIELD_PER_SECOND,1000000):BASE_SHIELD_PER_SECOND;
  const delaySeconds=repairBot?boundedSetting(repairBot.repairDelay,DEFAULT_DELAY_SECONDS,120):DEFAULT_DELAY_SECONDS;
  const multiplier=(premium?2:1)*boundedSetting(designerMultiplier,1,100);
  // AEG: bônus percentual do gerador aplicado somente ao pulso de escudo.
  const shieldMultiplier=1+boundedSetting(shieldRegenBonus,0,1);
  const ready=!!baseSafe||Number(secondsWithoutDamage)>=delaySeconds;
  return {
    hpTick:Math.max(0,Math.round(hpBase*multiplier)),
    shieldTick:Math.max(0,Math.round(shieldBase*multiplier*shieldMultiplier)),
    delaySeconds,
    hpReady:(!!baseSafe||!!repairBot)&&ready,
    shieldReady:ready
  };
}
