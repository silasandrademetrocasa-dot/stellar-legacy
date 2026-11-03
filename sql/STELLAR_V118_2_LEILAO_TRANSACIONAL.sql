-- V118.2: Settlement authoritative and atomic. Run before deploying client/server patch.
-- Does not automatically settle historical wins or change any current balance.
create table if not exists public.stellar_auction_settlements_v1182 (
 bid_id bigint primary key references public.auction_bids(id),
 user_id uuid not null,
 hour_key text not null,
 lot_ref text not null,
 paid_credits bigint not null check(paid_credits>=0),
 award jsonb not null,
 save_hash text not null,
 settled_at timestamptz not null default clock_timestamp()
);
alter table public.stellar_auction_settlements_v1182 enable row level security;
revoke all on public.stellar_auction_settlements_v1182 from public,anon,authenticated;
grant select,insert on public.stellar_auction_settlements_v1182 to service_role;

create or replace function public.stellar_settle_auction_bid_v1182(
 p_user_id uuid,p_hour_key text,p_lot_ref text
) returns jsonb language plpgsql security invoker set search_path=public,pg_temp
as $fn$
declare
 v_bid public.auction_bids%rowtype;
 v_winner public.auction_bids%rowtype;
 v_catalog public.live_shop_prices_v16%rowtype;
 v_existing public.stellar_auction_settlements_v1182%rowtype;
 v_state jsonb;
 v_id text;
 v_prefix text;
 v_catalog_key text;
 v_grant jsonb;
 v_kind text;
 v_count int;
 v_qty int;
 v_slots int;
 v_credits bigint;
 v_available bigint;
 v_label text;
 v_callsign text;
 v_new_drone_id text;
 v_history jsonb;
 v_now timestamptz:=clock_timestamp();
 v_result jsonb;
begin
 if p_user_id is null or p_hour_key !~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{2}$'
   or p_lot_ref !~ '^(item|ship|ammo|rocket|petGear):[a-zA-Z0-9_]+$'
 then raise exception 'AUCTION_REQUEST_INVALID'; end if;
 if p_hour_key >= to_char(v_now at time zone 'America/Sao_Paulo','YYYY-MM-DD-HH24')
 then return jsonb_build_object('ok',false,'code','AUCTION_STILL_ACTIVE','message','Este leilão ainda está em andamento.');end if;
 -- Serialize settlement for this lot across players, not merely each player's wallet.
 perform pg_advisory_xact_lock(hashtextextended(p_hour_key||'|'||p_lot_ref,1182));
 select * into v_bid from public.auction_bids
 where user_id=p_user_id and hour_key=p_hour_key and lot_ref=p_lot_ref for update;
 if not found then return jsonb_build_object('ok',false,'code','AUCTION_BID_NOT_FOUND','message','Este lance não foi encontrado.');end if;
 select * into v_existing from public.stellar_auction_settlements_v1182 where bid_id=v_bid.id;
 if found then
    select state into v_state from public.game_saves where user_id=p_user_id;
    return jsonb_build_object('ok',true,'replayed',true,'code','AUCTION_ALREADY_SETTLED',
       'receipt',jsonb_build_object('bid_id',v_bid.id,'paid_credits',v_existing.paid_credits,'grant',v_existing.award),
       'state',v_state);
 end if;
 if v_bid.status='won' then
   -- Legacy client could mark WON without committing a debit or an item.
   -- Never charge again or grant a second item without audited reconciliation.
   return jsonb_build_object('ok',false,'code','AUCTION_LEGACY_REVIEW',
     'message','Lance antigo marcado como vencedor. A entrega precisa ser conferida sem cobrança duplicada.');
 end if;
 if v_bid.status not in ('active','lost') then
   return jsonb_build_object('ok',false,'code','AUCTION_NOT_ACTIVE','message','Este lance já foi encerrado.');
 end if;
 select * into v_winner from public.auction_bids
 where hour_key=p_hour_key and lot_ref=p_lot_ref and status in ('active','won')
 order by user_bid desc, updated_at asc, id asc limit 1;
 if v_winner.id is distinct from v_bid.id then
   update public.auction_bids set status='lost',updated_at=v_now where id=v_bid.id and status='active';
   return jsonb_build_object('ok',false,'code','AUCTION_OUTBID','message','Outro piloto venceu este lote. Nenhum valor foi descontado.');
 end if;
 if v_bid.status<>'active' or v_bid.user_bid is null or v_bid.user_bid<=0 then
   return jsonb_build_object('ok',false,'code','AUCTION_INVALID_BID','message','Lance inválido; não foi cobrado.');
 end if;
 -- Validate the stored lot against the authoritative catalog, never trust JSON lot data as a grant.
 v_prefix:=split_part(p_lot_ref,':',1);v_id:=split_part(p_lot_ref,':',2);
 v_catalog_key:=case when v_prefix='item' and v_id in ('iris','flax') then 'drone:'||v_id
                     when v_prefix='petGear' then 'pet_gear:'||v_id
                     else p_lot_ref end;
 select * into v_catalog from public.live_shop_prices_v16 where catalog_key=v_catalog_key;
 if not found or v_catalog.enabled is false then
   return jsonb_build_object('ok',false,'code','AUCTION_CATALOG_UNAVAILABLE','message','Produto indisponível no catálogo oficial. O lance permanece guardado.');
 end if;
 v_grant:=v_catalog.meta->'grant'; v_kind:=v_grant->>'kind';
 if v_grant is null or v_grant->>'id' is distinct from v_id or
   ((v_prefix='ship' and v_kind<>'ship') or
    (v_prefix='item' and v_id in ('iris','flax') and v_kind<>'drone') or
    (v_prefix='item' and v_id not in ('iris','flax') and v_kind<>'inventory') or
    (v_prefix='ammo' and v_kind<>'ammo') or
    (v_prefix='rocket' and v_kind<>'rocket') or
    (v_prefix='petGear' and v_kind<>'pet_gear'))
 then raise exception 'AUCTION_CATALOG_MISMATCH';end if;
 if v_bid.user_bid < public.auction_minimum_floor_v1916(p_lot_ref)
 then return jsonb_build_object('ok',false,'code','AUCTION_BELOW_FLOOR','message','Lance abaixo do preço mínimo confirmado.');end if;
 if v_bid.lot->>'ref' is distinct from p_lot_ref or v_bid.lot->>'id' is distinct from v_id
 then raise exception 'AUCTION_LOT_MISMATCH';end if;
 select g.state,p.callsign into v_state,v_callsign from public.game_saves g
 join public.profiles p on p.id=g.user_id where g.user_id=p_user_id for update of g,p;
 if v_state is null or v_state->>'accountOwnerId' is distinct from p_user_id::text
 then raise exception 'AUCTION_SAVE_OWNER_INVALID';end if;
 v_credits:=coalesce((v_state#>>'{profile,credits}')::bigint,0);
 if v_credits < v_bid.user_bid then
   return jsonb_build_object('ok',false,'code','AUCTION_INSUFFICIENT_CREDITS',
      'message','Créditos insuficientes para pagar o lance vencedor. Nenhuma cobrança feita.');
 end if;
 v_qty:=coalesce((v_grant->>'qty')::int,1);
 if v_qty<1 or v_qty>1000000 then raise exception 'AUCTION_GRANT_QTY_INVALID';end if;
 if v_prefix in ('ammo','rocket') and coalesce((v_bid.lot->>'qty')::int,0)<>v_qty
 then raise exception 'AUCTION_LOT_QTY_MISMATCH';end if;
 if v_kind='drone' then
   v_count:=jsonb_array_length(coalesce(v_state->'drones','[]'::jsonb));
   if v_count>=8 then return jsonb_build_object('ok',false,'code','AUCTION_FLEET_FULL',
      'message','Sua frota está completa. Libere uma vaga para receber o drone vencedor.');end if;
   v_slots:=greatest(1,least(10,coalesce((v_grant->>'slots')::int,1)));
   v_new_drone_id:='d_auc_'||(extract(epoch from v_now)*1000)::bigint||'_'||substr(md5(v_bid.id::text||p_user_id::text),1,6);
   v_state:=jsonb_set(v_state,'{drones}',coalesce(v_state->'drones','[]'::jsonb)||
      jsonb_build_array(jsonb_build_object('id',v_new_drone_id,'type',v_id,
      'slots',(select jsonb_agg(null::text) from generate_series(1,v_slots)))),true);
 elsif v_kind='ship' then
   if coalesce(v_state->'ownedShips','[]'::jsonb) ? v_id then
      return jsonb_build_object('ok',false,'code','AUCTION_ALREADY_OWNED','message','Nave já adquirida. O lance precisa de revisão.');end if;
   v_state:=jsonb_set(v_state,'{ownedShips}',coalesce(v_state->'ownedShips','[]'::jsonb)||to_jsonb(v_id),true);
 elsif v_kind='inventory' then
   if v_catalog.kind='extra' and (coalesce((v_state->'inventory'->>v_id)::int,0)>0 or
     coalesce(v_state#>'{shipLoadout,extras}','[]'::jsonb) ? v_id) then
      return jsonb_build_object('ok',false,'code','AUCTION_ALREADY_OWNED','message','Extra já adquirido. Nenhuma cobrança efetuada.');end if;
   v_state:=jsonb_set(v_state,array['inventory',v_id],to_jsonb(coalesce((v_state->'inventory'->>v_id)::int,0)+v_qty),true);
 elsif v_kind in ('ammo','rocket') then
   v_available:=coalesce((v_state->(case when v_kind='ammo' then 'ammo' else 'rockets' end)->>v_id)::bigint,0);
   if v_available+v_qty>1000000000 then raise exception 'AUCTION_STOCK_OVERFLOW';end if;
   v_state:=jsonb_set(v_state,array[case when v_kind='ammo' then 'ammo' else 'rockets' end,v_id],to_jsonb(v_available+v_qty),true);
 elsif v_kind='pet_gear' then
   if coalesce((v_state#>>'{pet,owned}')::boolean,false) is false then
      return jsonb_build_object('ok',false,'code','AUCTION_PET_REQUIRED','message','Você precisa possuir o AUX-9 para receber este módulo.');end if;
   if coalesce((v_state#>>array['pet','gearsOwned',v_id])::boolean,false) then
      return jsonb_build_object('ok',false,'code','AUCTION_ALREADY_OWNED','message','Módulo AUX já adquirido.');end if;
   v_state:=jsonb_set(v_state,array['pet','gearsOwned',v_id],'true'::jsonb,true);
 else raise exception 'AUCTION_GRANT_UNSUPPORTED';end if;
 v_state:=jsonb_set(v_state,'{profile,credits}',to_jsonb(v_credits-v_bid.user_bid),true);
 v_state:=jsonb_set(v_state,'{serverPurchaseRevision}',
    to_jsonb(coalesce((v_state->>'serverPurchaseRevision')::bigint,0)+1),true);
 v_label:=coalesce(nullif(v_bid.lot->>'name',''),v_catalog.display_name,v_id);
 v_history:=jsonb_build_array(jsonb_build_object('at',(extract(epoch from v_now)*1000)::bigint,
    'bid',v_bid.user_bid,'name',v_label,'result','VENCEU')) || coalesce(v_state#>'{auction,history}','[]'::jsonb);
 select coalesce(jsonb_agg(value order by rn),'[]'::jsonb) into v_history
 from jsonb_array_elements(v_history) with ordinality as x(value,rn) where rn<=12;
 v_state:=jsonb_set(v_state,'{auction,history}',v_history,true);
 -- Includes game_saves + profiles + A/B/C in the SAME transaction, including all triggers.
 v_result:=public.stellar_commit_player_save_v118(p_user_id,v_state,v_now,v_callsign);
 if v_result->>'ok'<>'true' then raise exception 'AUCTION_SAVE_NOT_CONFIRMED';end if;
 insert into public.stellar_auction_settlements_v1182
 (bid_id,user_id,hour_key,lot_ref,paid_credits,award,save_hash)
 values(v_bid.id,p_user_id,p_hour_key,p_lot_ref,v_bid.user_bid,
    jsonb_build_object('kind',v_kind,'id',v_id,'qty',v_qty,'drone_id',v_new_drone_id),md5(v_state::text));
 update public.auction_bids set status='won',updated_at=v_now where id=v_bid.id and status='active';
 if not found then raise exception 'AUCTION_STATUS_RACE';end if;
 return jsonb_build_object('ok',true,'replayed',false,'state',v_state,'receipt',
    jsonb_build_object('bid_id',v_bid.id,'paid_credits',v_bid.user_bid,'product',v_label,
     'grant',jsonb_build_object('kind',v_kind,'id',v_id,'qty',v_qty,'drone_id',v_new_drone_id)));
end;
$fn$;
revoke all on function public.stellar_settle_auction_bid_v1182(uuid,text,text) from public,anon,authenticated;
grant execute on function public.stellar_settle_auction_bid_v1182(uuid,text,text) to service_role;
