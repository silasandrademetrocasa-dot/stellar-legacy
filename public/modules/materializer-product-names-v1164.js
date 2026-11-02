import {LASER_AMMO,ROCKETS,ITEMS,SHIPS,RESOURCES} from '../data.js';
/** Only the display label changes: the server-owned reward ID/qty stay untouched. */
const amount=n=>Math.max(0,Math.floor(Number(n)||0)).toLocaleString('pt-BR');
export function materializerProductNameV1164(reward,lookup=null){
 const row=reward||{},kind=String(row.kind||''),id=String(row.id||'');
 const entry=(typeof lookup==='function'&&id?lookup(kind,id):null)||null;
 const raw=String(row.label||'').trim();
 const qty=Number(row.qty);
 const name=entry?.display_name||entry?.name||(
   kind==='ammo'?LASER_AMMO[id]?.name:
   kind==='rocket'?ROCKETS[id]?.name:
   kind==='item'?ITEMS[id]?.name:
   kind==='ship'?SHIPS[id]?.name:
   kind==='resource'?RESOURCES[id]?.name:null);
 if(name)return `${String(name)}${qty>0?' +'+amount(qty):''}`;
 if(kind==='credits')return `Créditos +${amount(qty)}`;
 if(kind==='xenomit')return `Voidite +${amount(qty)}`;
 if(kind==='logdisk')return `Núcleos Quânticos +${amount(qty)}`;
 if(kind==='jump')return 'Bônus de Salto +1';
 // Old authoritative receipts may provide only legacy label; translate the known ID prefixes.
 if(raw){
  for(const [code,title] of Object.entries({r310:'CMT-1',plt2026:'CMT-2',plt2021:'CMT-3',plt3030:'CMT-4',lcb10:'PLS-1',mcb25:'PLS-2',mcb50:'PLS-3',ucb100:'PLS-4'})){
    if(raw===code||raw.startsWith(code+' +')||raw.startsWith(code+' '))return raw.replace(code,title);
  }
  return raw;
 }
 return kind==='piece'?`Peça #${Number(row.piece)||'?'} `:`Recompensa ${kind||'especial'}`;
}
