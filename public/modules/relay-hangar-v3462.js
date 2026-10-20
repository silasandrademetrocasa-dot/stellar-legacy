// Typed relay equipment: slot 1 laser, 2 missile, 3 capacitor, 4 regeneration, 5 armor, 6 repairs, 7/8 unique bonuses.
export const RELAY_SLOT_CATALOG=Object.freeze([
 {slot:1,category:'weapon',attribute:'laser',name:'ARMA 1 • LASER',symbol:'✦',detail:'Feixe rápido de defesa'},
 {slot:2,category:'weapon',attribute:'missile',name:'ARMA 2 • LANÇA-MÍSSEIS',symbol:'➤',detail:'Mísseis pesados de recarga lenta'},
 {slot:3,category:'shield',attribute:'capacitor',name:'ESCUDO 1 • CAPACITOR',symbol:'◇',detail:'Mais capacidade de escudo'},
 {slot:4,category:'shield',attribute:'regenerator',name:'ESCUDO 2 • REGENERADOR',symbol:'◈',detail:'Blindagem energética e recuperação'},
 {slot:5,category:'hp',attribute:'armor',name:'CASCO 1 • BLINDAGEM',symbol:'⬡',detail:'Aumenta a integridade do relé'},
 {slot:6,category:'hp',attribute:'nanobots',name:'CASCO 2 • NANORROBÔS',symbol:'✚',detail:'Estrutura reforçada e manutenção'},
 {slot:7,category:'bonus',attribute:null,name:'BÔNUS 1',symbol:'★',detail:'Benefício estratégico do clã'},
 {slot:8,category:'bonus',attribute:null,name:'BÔNUS 2',symbol:'☆',detail:'Benefício estratégico do clã'}
]);
export const RELAY_BONUS_CATALOG=Object.freeze({damage:'DANO',shield:'ESCUDO',hp:'HP',speed:'VELOCIDADE',xp:'EXPERIÊNCIA',resources:'RECURSOS'});
export function relayModuleFitsSlot(m,slot){
 const spec=RELAY_SLOT_CATALOG.find(x=>x.slot===Number(slot));if(!spec||!m||m.category!==spec.category)return false;
 if(spec.category==='bonus')return Object.hasOwn(RELAY_BONUS_CATALOG,String(m.attribute));
 return m.attribute===spec.attribute || (m.attribute===spec.category && (!m.slot || Number(m.slot)===Number(slot)));
}
export function relayModuleName(m){
 if(!m)return 'VAZIO';
 if(m.category==='bonus')return 'BÔNUS • '+(RELAY_BONUS_CATALOG[m.attribute]||'DESCONHECIDO');
 const spec=RELAY_SLOT_CATALOG.find(x=>x.attribute===m.attribute);
 return spec?.name||String(m.category||'MÓDULO').toUpperCase();
}
export function relaySlotModules(modules,slot){return (modules||[]).filter(m=>relayModuleFitsSlot(m,slot));}
export function relayBonusDuplicate(modules,chosen,mapId,nodeId,slot){return chosen?.category==='bonus'&&(modules||[]).some(m=>m.category==='bonus'&&m.attribute===chosen.attribute&&m.map_id===mapId&&m.node_id===nodeId&&Number(m.slot)!==Number(slot));}
