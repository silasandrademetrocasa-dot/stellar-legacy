import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('V138 catalogue restores per-hull skins without changing inventory or resurrecting universal skins',async t=>{
 const db=new PGlite();t.after(()=>db.close());await db.exec(read('tests/fixtures/v134-schema.sql'));
 await db.exec("INSERT INTO live_designs_v16(design_id,kind,name,enabled,bonuses,eligibility) VALUES('n132_goliath_hp','ship','Leviathan • Vitalis',false,'{\"hp\":0.15}','{\"ship_id\":\"goliath\",\"source\":\"shop\"}'),('ship_vitalis','ship','Universal antigo',false,'{\"hp\":0.12}','{}'); INSERT INTO player_design_inventory_v16(user_id,design_id,quantity) VALUES('11111111-1111-4111-8111-111111111111','n132_goliath_hp',2);");
 const before=(await db.query('SELECT * FROM player_design_inventory_v16')).rows;
 await db.exec(read('tests/fixtures/sql/STELLAR_V138_DESIGNS.sql'));await db.exec(read('tests/fixtures/sql/STELLAR_V138_DESIGNS.sql'));
 assert.deepEqual((await db.query('SELECT * FROM player_design_inventory_v16')).rows,before);
 assert.equal((await db.query("SELECT count(*) n FROM live_designs_v16 WHERE enabled AND design_id LIKE 'n132_%'")).rows[0].n,32);
 assert.equal((await db.query("SELECT enabled FROM live_designs_v16 WHERE design_id='ship_vitalis'")).rows[0].enabled,false);
 assert.equal((await db.query("SELECT bonuses FROM live_designs_v16 WHERE design_id='n132_goliath_hp'")).rows[0].bonuses.hp,.15);
 const definitions=(await db.query("SELECT r.definition,d.visual FROM stellar_natal_rewards_v132 r JOIN live_designs_v16 d ON r.definition->>'design_id'=d.design_id WHERE r.id LIKE 'design:%'")).rows;
 assert.equal(definitions.length,32);assert.ok(definitions.every(x=>x.visual.asset.startsWith('/assets/v138/map/ships/')&&x.definition.eligibility.ship_id));
});
