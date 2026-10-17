import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const game=readFileSync(new URL('public/game.js',root),'utf8');
const server=readFileSync(new URL('server/index.js',root),'utf8');
const sql=readFileSync(new URL('sql/STELLAR_V19_0_16_AUCTION_PRICING.sql',root),'utf8');
const data={
 'ammo:mcb50':{price:3000,currency:'uridium',enabled:true},
 'ammo:ucb100':{price:12000,currency:'uridium',enabled:true},
 'rocket:plt2021':{price:400,currency:'uridium',enabled:true},
 'rocket:plt3030':{price:1000,currency:'uridium',enabled:true},
 'drone:iris':{price:15000,currency:'uridium',enabled:true},
 'laser:lf4':{price:300000,currency:'uridium',enabled:true},
 'ship:goliath':{price:2500000,currency:'uridium',enabled:true}
};
function scope(){
 const from=game.indexOf('function auctionSeed('),to=game.indexOf('function auctionCurrentBid(');
 assert(from>0&&to>from);
 const x={Math,Date,Number,String,console,progress:{auction:{hourKey:'2026-10-14-02'}},ITEMS:{iris:{type:'drone',price:15000},lf4:{type:'laser',price:300000}},SHIPS:{goliath:{price:2500000}},LASER_AMMO:{mcb50:{price:20000}},ROCKETS:{plt2021:{price:10000}},PET_GEARS:{},liveCatalog:k=>data[k]||null,auctionHourKey:()=>'2026-10-14-02'};
 vm.createContext(x);vm.runInContext(game.slice(from,to),x);x.auctionPriceRules=vm.runInContext('auctionPriceRules',x);return x;
}
test('floors official values from shop + editable multiplier',()=>{
 const x=scope();
 assert.equal(x.auctionOpeningFloor({ref:'ammo:mcb50',kind:'ammo',id:'mcb50',uri:20000}),50100000);
 assert.equal(x.auctionOpeningFloor({ref:'ammo:ucb100',kind:'ammo',id:'ucb100',uri:100000}),200100000);
 assert.equal(x.auctionOpeningFloor({ref:'rocket:plt2021',kind:'rocket',id:'plt2021',uri:10000}),5400000);
 assert.equal(x.auctionOpeningFloor({ref:'rocket:plt3030',kind:'rocket',id:'plt3030',uri:30000}),13400000);
 assert.equal(x.auctionOpeningFloor({ref:'item:iris',kind:'item',id:'iris',uri:15000}),100000000);
});
test('admin conversion/category/individual override and min floor',()=>{
 const x=scope(); x.auctionPriceRules.stl_to_credits=8000;
 assert.equal(x.auctionOpeningFloor({ref:'ammo:mcb50',kind:'ammo',id:'mcb50'}),60000000);
 x.auctionPriceRules.category_multipliers.ammo=3;
 assert.equal(x.auctionOpeningFloor({ref:'ammo:mcb50',kind:'ammo',id:'mcb50'}),72000000);
 x.auctionPriceRules.item_multipliers['ammo:mcb50']=4;
 assert.equal(x.auctionOpeningFloor({ref:'ammo:mcb50',kind:'ammo',id:'mcb50'}),96000000);
 x.auctionPriceRules.nova_floor=200000000;
 assert.equal(x.auctionOpeningFloor({ref:'item:iris',kind:'item',id:'iris'}),200000000);
 x.auctionPriceRules.item_multipliers['ammo:mcb50']=0.01;x.auctionPriceRules.common_floor=400000;
 assert.equal(x.auctionOpeningFloor({ref:'ammo:mcb50',kind:'ammo',id:'mcb50'}),400000);
});
test('old lots update reserve without modifying live bids',()=>{
 const x=scope(),old={ref:'ammo:mcb50',kind:'ammo',id:'mcb50',uri:5000,reserve:100000,finalSystemBid:200000,marketBid:9900000,userBid:450000,leaderUserId:'player'};
 const lot=x.normalizeAuctionEconomy(old,'2026-10-14-02');
 assert.equal(lot.reserve,50100000);assert(lot.finalSystemBid>lot.reserve);
 assert.equal(lot.marketBid,9900000);assert.equal(lot.userBid,450000);assert.equal(lot.leaderUserId,'player');
});
test('server floor never trusts p_lot.systemFloor and checks trusted catalog',()=>{
 assert.match(sql,/auction_minimum_floor_v1916\(p_lot_ref\)/);
 assert.match(sql,/v_floor:=public\.auction_minimum_floor_v1916\(p_lot_ref\)/);
 assert(!sql.includes("p_lot->>'systemFloor'"));
 assert.match(sql,/FROM public\.live_shop_prices_v16/);
 assert.match(sql,/p_lot->>'ref' IS DISTINCT FROM p_lot_ref/);
 assert.match(sql,/IF v_floor IS NULL THEN RAISE EXCEPTION/);
 assert.match(sql,/is_game_admin_v1763\(auth\.uid\(\)\)/);
 assert.match(server,/admin_update_auction_rules_v1916/);
});
test('admin UI supports per-category and per-lot, with previews',()=>{
 assert.match(game,/data-auction-rule="stl_to_credits"/);
 assert.match(game,/data-auction-category/);
 assert.match(game,/data-auction-item/);
 assert.match(game,/data-auction-floor-preview/);
 assert.match(game,/adminUpdateAuctionRulesOnline\(b\)/);
});
