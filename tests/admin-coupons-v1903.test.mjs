import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {ITEMS,SHIPS,LASER_AMMO,ROCKETS,RESOURCES} from '../public/data.js';
const root=resolve(import.meta.dirname,'..');
const file=name=>readFileSync(resolve(root,name),'utf8');
const game=file('public/game.js'),api=file('public/api.js'),html=file('public/index.html'),server=file('server/index.js'),css=file('public/style.css'),sql=file('sql/V19_0_3_CUPONS_ADM_CATALOGO.sql');
const list=JSON.parse(file('sql/catalog-v193.json'));
test('99 itens do jogo presentes e vinculados ao catálogo SQL',()=>{
 const expected=Object.keys(ITEMS).length+Object.keys(SHIPS).length+Object.keys(LASER_AMMO).length+Object.keys(ROCKETS).length+Object.keys(RESOURCES).length+4;
 assert.equal(list.length,expected);
 for(const row of list)assert(sql.includes(`'${row.kind}','${row.id}'`));
});
test('ADM vê uma central com catálogo, lista de cupons, limites, prazo, nível e prêmio',()=>{
 for(const part of ['adminRuntimeCouponsPanel','adminCouponsEditor','adminCouponsList','couponAdmTitle','couponAdmCode','couponAdmUses','couponAdmLevel','couponAdmExpiry','couponAdmAdd','couponAdmCreate','data-coupon-remove'])assert(game.includes(part)||html.includes(part),part);
 assert(html.includes('data-admin-runtime-tab="coupons"'));
 for(const p of ['adminCouponDashboardOnline','adminCreateCouponOnline','adminSetCouponActiveOnline'])assert(api.includes(p));
 assert.match(css,/\.admin-coupon-picker/);
});
test('As chamadas do frontend passam pelo servidor, com validação no banco',()=>{
 assert(server.includes("'/api/admin/coupons'"));
 assert(server.includes("'redeem_game_coupon_v193'"));
 assert(server.includes("'redeem_game_coupon_v1821'"));
 assert(server.includes('if(modern.data?.handled===true)return modern.data;'));
 for(const p of ['admin_coupon_dashboard_v193','admin_create_coupon_v193','admin_set_coupon_active_v193','redeem_game_coupon_v193'])assert(sql.includes(`function public.${p}`));
 assert(sql.includes('for update')||sql.includes('FOR UPDATE'));
 assert(sql.includes('primary key(code,user_id)'));
 assert(sql.includes('game_admins'));
 assert(sql.includes('revoke all on public.game_coupons_v193'));
 assert(sql.includes('on conflict(user_id)'));
});
