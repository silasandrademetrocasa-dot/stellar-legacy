-- Stellar Legacy V18.2.11: preço inicial do NOVA (item:iris) no leilão
-- é 2x o preço base (CR) do HALO (drone:flax) no Supabase, mínimo 100k.
-- Não altera preço da Loja, lances antigos, saldos ou resultados.
-- No projeto atual esta regra já foi instalada e verificada.
CREATE OR REPLACE FUNCTION public.place_auction_bid_online(
  p_hour_key text, p_lot_ref text, p_user_bid bigint, p_lot jsonb
)
RETURNS TABLE(lot_ref text, user_bid bigint, leader_user_id uuid,
  leader_callsign text, lot jsonb, updated_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_current public.auction_bids%rowtype;
  v_credits bigint := 0;
  v_reserved bigint := 0;
  v_floor bigint := greatest(100000, coalesce((p_lot->>'systemFloor')::bigint,100000));
begin
  if v_uid is null then
    raise exception 'Sessão ausente.';
  end if;

  -- Piso próprio da Nova; nunca confiar somente no piso enviado pelo cliente.
  if p_lot_ref = 'item:iris' then
    v_floor := greatest(
      v_floor,
      (select 2 * coalesce(
        (select price from public.live_shop_prices_v16
         where catalog_key='drone:flax' and currency='credits' and enabled=true limit 1),
        10000000))
    );
  end if;

  if p_user_bid < 100000 or mod(p_user_bid,100000) <> 0 then
    raise exception 'O lance deve usar passos de 100.000 CR.';
  end if;
  perform pg_advisory_xact_lock(hashtext(p_hour_key || ':' || p_lot_ref));

  select * into v_current
  from public.auction_bids
  where hour_key = p_hour_key and lot_ref = p_lot_ref and status = 'active'
  order by user_bid desc, updated_at asc
  limit 1 for update;

  if found and v_current.user_id = v_uid then
    raise exception 'Você já está liderando este lote.';
  end if;
  if found then
    if p_user_bid < greatest(v_current.user_bid + 100000,v_floor) then
      raise exception 'Seu lance precisa superar o jogador atual em pelo menos 100.000 CR.';
    end if;
  elsif p_user_bid < v_floor then
    raise exception 'O lance está abaixo do preço atual do sistema.';
  end if;

  select coalesce(credits,0) into v_credits
  from public.profiles where id = v_uid for update;

  select coalesce(sum(user_bid),0) into v_reserved
  from public.auction_bids
  where user_id = v_uid and hour_key = p_hour_key and status = 'active'
    and lot_ref <> p_lot_ref;

  if v_credits < v_reserved + p_user_bid then
    raise exception 'Créditos insuficientes considerando os seus lances em garantia.';
  end if;

  update public.auction_bids set status='lost',updated_at=now()
  where hour_key=p_hour_key and lot_ref=p_lot_ref and status='active';

  insert into public.auction_bids(
    user_id,hour_key,lot_ref,user_bid,lot,status,created_at,updated_at
  ) values (
    v_uid,p_hour_key,p_lot_ref,p_user_bid,coalesce(p_lot,'{}'::jsonb),
    'active',now(),now()
  )
  on conflict(user_id,hour_key,lot_ref)
  do update set user_bid=excluded.user_bid,lot=excluded.lot,
    status='active',updated_at=now();

  return query
  select b.lot_ref,b.user_bid,b.user_id,coalesce(p.callsign,'Pilot'),b.lot,b.updated_at
  from public.auction_bids b
  left join public.profiles p on p.id=b.user_id
  where b.user_id=v_uid and b.hour_key=p_hour_key and b.lot_ref=p_lot_ref and b.status='active'
  limit 1;
end;
$function$;
