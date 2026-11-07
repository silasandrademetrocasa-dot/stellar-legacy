import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
const start=source.indexOf('function safePilotMessage(raw)');
const end=source.indexOf('function showToast(',start);
const translate=vm.runInNewContext(source.slice(start,end)+';safePilotMessage');
test('Confirmed hangar and pending rewards retain their distinct meanings',()=>{
 assert.equal(translate('Hangar confirmado no Supabase ✓'),'Hangar salvo ✓');
 assert.equal(translate('Recompensa anterior aguardando confirmação do Supabase'),'Recompensa anterior aguardando confirmação do servidor.');
 assert.equal(translate('Montagem antiga bloqueada • equipamentos do Supabase restaurados'),'Equipamentos restaurados para a montagem confirmada no servidor.');
});
test('Real database errors still report an unconfirmed operation',()=>{
 for(const message of ['permission denied for table game_saves','HTTP 503','Supabase indisponível','Hangar confirmado no Supabase ✓: erro SQL']){
  assert.match(translate(message),/^Confirmação online indisponível/);
 }
 assert.match(translate('SAVE_EQUIPMENT_STALE'),/ainda não confirmou a montagem/);
});
