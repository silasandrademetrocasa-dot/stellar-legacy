import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {UNIVERSE_MIN_LEVEL_V481,mayOpenUniverseV481,navigationUnlockV481,NAV_LEVELS_V481,TOPBAR_ORDER_V481} from '../public/modules/topbar-navigation-v481.js';

test('central universo tem acesso no nível 10 e posterior',()=>{
 assert.equal(UNIVERSE_MIN_LEVEL_V481,10);
 for(const lv of [0,1,2,5,8,9])assert.equal(mayOpenUniverseV481(lv),false,`LV ${lv}`);
 for(const lv of [10,11,20,30])assert.equal(mayOpenUniverseV481(lv),true,`LV ${lv}`);
});
test('conta ADM possui acesso à central independente do nível',()=>{
 for(const lv of [1,3,5,9])assert.equal(mayOpenUniverseV481(lv,true),true);
});
test('falha fechada quando nível é inválido',()=>{
 for(const lv of [null,undefined,'inválido',NaN,-1])assert.equal(mayOpenUniverseV481(lv),false);
});
test('níveis de menus seguem progressão definida',()=>{
 assert.deepEqual([NAV_LEVELS_V481.pilot,NAV_LEVELS_V481.missions,NAV_LEVELS_V481.research,NAV_LEVELS_V481.clan,NAV_LEVELS_V481.universe,NAV_LEVELS_V481.warfront],[1,1,6,8,10,15]);
 assert.equal(navigationUnlockV481(7,8),false);assert.equal(navigationUnlockV481(8,8),true);
});
test('cinco menus principais preservados',()=>{
 assert.deepEqual(TOPBAR_ORDER_V481,['pilot','missions','battle','map','more']);
});
test('patch de index foi aplicado uma vez e controles originais preservados',()=>{
 const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 assert.equal(html.split('/modules/topbar-navigation-v481.js').length-1,1);
 assert.equal(html.split('/modules/topbar-navigation-v481.css').length-1,1);
 for(const id of ['frontierExpansionBtnV42','mobileCombatModeBtn','hudIntelligenceQuick','topbarDockToggle','mapBtn','adminBtn'])assert.ok(html.includes(`id="${id}"`),id);
});
