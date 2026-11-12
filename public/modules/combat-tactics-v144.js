import {LASER_AMMO,ROCKETS} from '../data.js';
const entries=[
 ['original','Original','base',0,0,0,0],['furia','Fúria','common',18,-10,-8,0],
 ['interceptor','Interceptor','common',-10,0,-8,18],['bastiao','Bastião','rare',-6,0,22,-12],
 ['colosso','Colosso','rare',-12,22,0,-6],['vanguarda','Vanguarda','epic',14,-10,-8,14],
 ['prisma','Prisma','epic',14,-6,14,-10],['cacador_supremo','Caçador Supremo','legendary',16,-6,-12,18],
 ['leviata','Leviatã','legendary',-6,18,18,-12]
];
export const DRONE_FORMATIONS=Object.freeze(Object.fromEntries(entries.map(([id,name,rarity,damage,hp,shield,speed])=>[id,Object.freeze({id,name,rarity,damage,hp,shield,speed,depth:['epic','legendary'].includes(rarity)})])));
export const COMBAT_SLOT_COUNT=18;
export const FORMATION_GLYPHS=Object.freeze({original:'○',furia:'△',interceptor:'⋈',bastiao:'▣',colosso:'▰',vanguarda:'⋀',prisma:'◇',cacador_supremo:'⌖',leviata:'♜'});
export const TACTICS_KEY='combatHudV144';
export function ownedFormations(state){return new Set(['original',...(Array.isArray(state?.ownedDroneFormationsV144)?state.ownedDroneFormationsV144:[]).filter(id=>Object.hasOwn(DRONE_FORMATIONS,id))]);}
export const activeConfig=state=>Number(state?.combatConfigsV2013?.active)===2?2:1;
export function defaultSlots(){return [...Object.keys(LASER_AMMO).slice(0,5).map(id=>({kind:'laser',id})),...Object.keys(ROCKETS).slice(0,3).map(id=>({kind:'rocket',id})),{kind:'formation',id:'original'},...Array(9).fill(null)].slice(0,COMBAT_SLOT_COUNT);}
const validRef=r=>r===null||(r&&Object.keys(r).length===2&&typeof r.id==='string'&&['laser','rocket','formation'].includes(r.kind)&&Object.hasOwn({laser:LASER_AMMO,rocket:ROCKETS,formation:DRONE_FORMATIONS}[r.kind],r.id));
export function tacticsFor(state){
 const owned=ownedFormations(state),raw=state?.[TACTICS_KEY],profiles={};
 for(const n of [1,2]){
  const p=raw?.profiles?.[n]||{};
  profiles[n]={formation:owned.has(p.formation)?p.formation:'original',
   laser:Object.hasOwn(LASER_AMMO,p.laser)?p.laser:Object.hasOwn(LASER_AMMO,state?.selectedLaserAmmo)?state.selectedLaserAmmo:'lcb10',
   rocket:Object.hasOwn(ROCKETS,p.rocket)?p.rocket:Object.hasOwn(ROCKETS,state?.selectedRocket)?state.selectedRocket:'r310',
   slots:Array.from({length:COMBAT_SLOT_COUNT},(_,i)=>{const r=(Array.isArray(p.slots)?p.slots:defaultSlots())[i]??null;return validRef(r)&&(r?.kind!=='formation'||owned.has(r.id))?(r?{kind:r.kind,id:r.id}:null):null;})};
 }
 return {version:1,profiles};
}
export function formationFor(state){const t=tacticsFor(state);return DRONE_FORMATIONS[t.profiles[activeConfig(state)].formation];}
export function formationMultipliers(state){const f=formationFor(state);return Object.fromEntries(['damage','hp','shield','speed'].map(k=>[k,1+f[k]/100]));}
export function validateTacticsWrite(stored,next){
 const fail=code=>({ok:false,code});
 if(JSON.stringify(next?.ownedDroneFormationsV144??null)!==JSON.stringify(stored?.ownedDroneFormationsV144??null))return fail('FORMATION_OWNERSHIP_RESERVED');
 const raw=next?.[TACTICS_KEY];if(raw==null)return {ok:true};
 if(raw.version!==1||!raw.profiles||Object.keys(raw).some(k=>!['version','profiles'].includes(k))||Object.keys(raw.profiles).length!==2)return fail('COMBAT_HUD_INVALID');
 const owned=ownedFormations(stored);
 for(const n of [1,2]){
  const p=raw.profiles[n];if(!p||Object.keys(p).some(k=>!['formation','laser','rocket','slots'].includes(k))||!owned.has(p.formation)||!Object.hasOwn(LASER_AMMO,p.laser)||!Object.hasOwn(ROCKETS,p.rocket)||!Array.isArray(p.slots)||![12,COMBAT_SLOT_COUNT].includes(p.slots.length))return fail('COMBAT_SELECTION_INVALID');
  for(const ref of p.slots)if(!validRef(ref)||(ref?.kind==='formation'&&!owned.has(ref.id)))return fail('COMBAT_SLOT_INVALID');
 }
 return {ok:true};
}
export function rescaleResource(value,oldMax,newMax){return Math.max(0,Math.min(newMax,Math.floor((Math.max(0,Number(value)||0)/Math.max(1,Number(oldMax)||1))*newMax)));}
export function formationDescription(f){const name={damage:'DANO',hp:'HP',shield:'ESC',speed:'VEL'};return ['damage','hp','shield','speed'].filter(k=>f[k]).map(k=>`${name[k]} ${f[k]>0?'+':''}${f[k]}%`).join(' · ')||'SEM MODIFICADORES';}
