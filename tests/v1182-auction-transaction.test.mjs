import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const read=path=>fs.readFileSync(new URL(path,root),'utf8');
const sql=read('sql/STELLAR_V118_2_LEILAO_TRANSACIONAL.sql');
const server=read('server/index.js');
const game=read('public/game.js');
const html=read('public/index.html');
test('V118.2: SQL settlement protects wallet, grant and receipt with single transactional commit',()=>{
 assert.match(sql,/create table if not exists public\.stellar_auction_settlements_v1182/);
 assert.match(sql,/primary key references public\.auction_bids\(id\)/);
 assert.match(sql,/pg_advisory_xact_lock/);
 assert.match(sql,/for update of g,p/);
 assert.match(sql,/public\.stellar_commit_player_save_v118\(/);
 assert.match(sql,/insert into public\.stellar_auction_settlements_v1182/);
 assert.match(sql,/update public\.auction_bids set status='won'/);
 assert.ok(sql.indexOf('stellar_commit_player_save_v118(p_user_id') < sql.indexOf("update public.auction_bids set status='won'"));
});
test('V118.2: only service role can settle; no public payment endpoint',()=>{
 assert.match(sql,/revoke all on function public\.stellar_settle_auction_bid_v1182\(uuid,text,text\) from public,anon,authenticated/);
 assert.match(sql,/grant execute on function public\.stellar_settle_auction_bid_v1182\(uuid,text,text\) to service_role/);
 assert.match(server,/app\.post\('\/api\/auction\/settle',requireUser,OFFLINE_FARM_GUARD_V484/);
 assert.match(server,/withPurchaseLock\(req\.user\.id/);
 assert.match(server,/settleAuctionUnifiedV1332\(db,/);
});
test('V118.2: browser cannot grant item nor mark own auction victory',()=>{
 const section=game.slice(game.indexOf('async function finalizeOnlineAuctionBid(row){'),game.indexOf('let auctionSyncBusy=false'));
 assert.doesNotMatch(section,/grantAuctionLot\(/);
 assert.doesNotMatch(section,/markAuctionBidStatusOnline\(/);
 assert.doesNotMatch(section,/progress\.profile\.credits\s*[-+]=/);
 assert.match(section,/settleAuctionServerV1182\(row\)/);
 assert.match(section,/installEconomyState\(response\.state/);
 assert.match(game,/X-Game-Session-ID/);
 assert.match(html,/v1182-auction-atomic/);
});
test('V118.2: legacy wins require audit, repeated requests see receipt',()=>{
 assert.match(sql,/AUCTION_LEGACY_REVIEW/);
 assert.match(sql,/AUCTION_ALREADY_SETTLED/);
 assert.match(sql,/AUCTION_INSUFFICIENT_CREDITS/);
 assert.match(sql,/AUCTION_FLEET_FULL/);
 assert.match(sql,/AUCTION_OUTBID/);
});
