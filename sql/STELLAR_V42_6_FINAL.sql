-- STELLAR LEGACY V42.4-V42.6 | etapa 2/2 | additive, transactional, no player reset.
-- Requires 42.3 DB, game_saves, profiles, stellar_u42_inventory and research.
-- World PvP/damage and ship buffs deliberately NOT enabled here.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- V42.4: instanced deep-space investigations with server-verified NPC ledger goals.
CREATE TABLE IF NOT EXISTS public.stellar_u426_sectors (
 code text PRIMARY KEY CHECK(code ~ '^[a-z0-9_]{3,32}$'),
 title text NOT NULL CHECK(length(title) BETWEEN 3 AND 70),
 lore text NOT NULL DEFAULT '' CHECK(length(lore)<=300),
 minutes integer NOT NULL CHECK(minutes BETWEEN 5 AND 1440),
 kills_required integer NOT NULL CHECK(kills_required BETWEEN 5 AND 10000),
 research_cost integer NOT NULL CHECK(research_cost BETWEEN 0 AND 10000),
 research_reward integer NOT NULL CHECK(research_reward BETWEEN 1 AND 5000),
 enabled boolean NOT NULL DEFAULT true,
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.stellar_u426_sectors(code,title,lore,minutes,kills_required,research_cost,research_reward) VALUES
 ('nebula_veil','Nebulosa do Véu','Investigação de sinais em uma névoa magnética desconhecida.',15,20,10,30),
 ('ion_graveyard','Cemitério Iônico','Rastreie destroços e documente hostilidades no setor.',30,45,25,75),
 ('void_horizon','Horizonte do Vazio','Estabilize uma sonda avançada entre fenômenos de gravidade.',60,80,50,150)
ON CONFLICT(code) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.stellar_u426_sector_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 sector text NOT NULL REFERENCES public.stellar_u426_sectors(code),
 started_at timestamptz NOT NULL DEFAULT now(),
 ready_at timestamptz NOT NULL,
 kills_required integer NOT NULL,
 research_reward integer NOT NULL,
 claimed_at timestamptz,
 created_request uuid NOT NULL,
 UNIQUE(user_id,created_request)
);
CREATE UNIQUE INDEX IF NOT EXISTS stellar_u426_sector_one_active ON public.stellar_u426_sector_runs(user_id) WHERE claimed_at IS NULL;
CREATE INDEX IF NOT EXISTS stellar_u426_sector_history ON public.stellar_u426_sector_runs(user_id,started_at DESC);

-- V42.5: one listing == one escrowed stack; resale does not create inventory.
CREATE TABLE IF NOT EXISTS public.stellar_u426_market_rules (
 id integer PRIMARY KEY DEFAULT 1 CHECK(id=1),
 fee_bps integer NOT NULL DEFAULT 300 CHECK(fee_bps BETWEEN 0 AND 1500),
 enabled boolean NOT NULL DEFAULT false, -- activate only after two-account market tests
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.stellar_u426_market_rules(id) VALUES (1) ON CONFLICT(id) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.stellar_u426_market_offers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 seller uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 buyer uuid REFERENCES auth.users(id),
 item text NOT NULL REFERENCES public.stellar_u42_catalog(code),
 quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 5),
 unit_price bigint NOT NULL CHECK(unit_price BETWEEN 1000 AND 100000000),
 fee_credits bigint NOT NULL DEFAULT 0 CHECK(fee_credits>=0),
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','sold','cancelled')),
 request_id uuid NOT NULL,
 listed_at timestamptz NOT NULL DEFAULT now(),
 closed_at timestamptz,
 UNIQUE(seller,request_id)
);
CREATE INDEX IF NOT EXISTS stellar_u426_offers_open ON public.stellar_u426_market_offers(listed_at DESC) WHERE status='open';
CREATE INDEX IF NOT EXISTS stellar_u426_offers_seller ON public.stellar_u426_market_offers(seller,listed_at DESC);

-- V42.5: clan research construction is progress only (no unverified combat buffs).
CREATE TABLE IF NOT EXISTS public.stellar_u426_clan_rules (
 structure text PRIMARY KEY CHECK(structure IN ('observatory','dockyard','research_hub')),
 title text NOT NULL,
 research_goal integer NOT NULL CHECK(research_goal BETWEEN 100 AND 100000),
 enabled boolean NOT NULL DEFAULT true,
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.stellar_u426_clan_rules(structure,title,research_goal) VALUES
 ('observatory','Observatório Astral',3000),
 ('dockyard','Estaleiro de Expedições',5000),
 ('research_hub','Instituto de Pesquisa',7000)
ON CONFLICT(structure) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.stellar_u426_clan_funding (
 clan_id uuid NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
 structure text NOT NULL REFERENCES public.stellar_u426_clan_rules(structure),
 research_total bigint NOT NULL DEFAULT 0 CHECK(research_total BETWEEN 0 AND 100000000),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(clan_id,structure)
);
CREATE TABLE IF NOT EXISTS public.stellar_u426_clan_donations (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 clan_id uuid NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
 structure text NOT NULL REFERENCES public.stellar_u426_clan_rules(structure),
 research_points integer NOT NULL CHECK(research_points BETWEEN 1 AND 500),
 request_id uuid NOT NULL,
 donated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,request_id)
);
CREATE INDEX IF NOT EXISTS stellar_u426_clan_donations_history ON public.stellar_u426_clan_donations(clan_id,donated_at DESC);

DO $ddl$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['stellar_u426_sectors','stellar_u426_sector_runs','stellar_u426_market_rules',
 'stellar_u426_market_offers','stellar_u426_clan_rules','stellar_u426_clan_funding','stellar_u426_clan_donations'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC,anon,authenticated',t);
 END LOOP;
END $ddl$;

-- Sector dashboard: authoritative configuration; no NPC kills submitted by the browser.
CREATE OR REPLACE FUNCTION public.stellar_u426_exploration()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $fn$
DECLARE u uuid:=auth.uid(); p bigint; active jsonb; history jsonb;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT coalesce(points,0) INTO p FROM public.stellar_u42_research WHERE user_id=u;
 SELECT jsonb_build_object('id',r.id,'sector',r.sector,'startedAt',r.started_at,'readyAt',r.ready_at,
 'required',r.kills_required,'reward',r.research_reward,
 'verifiedKills',(SELECT count(*) FROM public.stellar_npc_reward_ledger l WHERE l.user_id=u AND l.issued_at>=r.started_at),
 'completed',r.claimed_at IS NOT NULL)
 INTO active FROM public.stellar_u426_sector_runs r WHERE r.user_id=u AND r.claimed_at IS NULL LIMIT 1;
 SELECT coalesce(jsonb_agg(jsonb_build_object('sector',h.sector,'claimedAt',h.claimed_at) ORDER BY h.claimed_at DESC),'[]'::jsonb)
 INTO history FROM (SELECT sector,claimed_at FROM public.stellar_u426_sector_runs WHERE user_id=u AND claimed_at IS NOT NULL ORDER BY claimed_at DESC LIMIT 12) h;
 RETURN jsonb_build_object('ok',true,'research',coalesce(p,0),'active',active,'history',history,
 'sectors',(SELECT coalesce(jsonb_agg(jsonb_build_object('code',code,'title',title,'lore',lore,'minutes',minutes,
 'kills',kills_required,'cost',research_cost,'reward',research_reward,'enabled',enabled) ORDER BY code),'[]'::jsonb)
 FROM public.stellar_u426_sectors));
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_u426_exploration() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_u426_exploration() TO authenticated;

CREATE OR REPLACE FUNCTION public.stellar_u426_sector_start(p_sector text,p_request uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $fn$
DECLARE u uuid:=auth.uid(); c public.stellar_u426_sectors%ROWTYPE; r public.stellar_u426_sector_runs%ROWTYPE; have bigint;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED' USING ERRCODE='42501'; END IF;
 IF p_request IS NULL OR p_sector IS NULL THEN RAISE EXCEPTION 'INVALID_REQUEST'; END IF;
 PERFORM 1 FROM public.game_saves WHERE user_id=u FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'SAVE_MISSING'; END IF;
 SELECT * INTO r FROM public.stellar_u426_sector_runs WHERE user_id=u AND created_request=p_request;
 IF FOUND THEN RETURN jsonb_build_object('ok',true,'alreadyStarted',true,'runId',r.id); END IF;
 IF EXISTS(SELECT 1 FROM public.stellar_u426_sector_runs WHERE user_id=u AND claimed_at IS NULL) THEN RAISE EXCEPTION 'SECTOR_ALREADY_ACTIVE'; END IF;
 SELECT * INTO c FROM public.stellar_u426_sectors WHERE code=p_sector AND enabled;
 IF NOT FOUND THEN RAISE EXCEPTION 'SECTOR_UNAVAILABLE'; END IF;
 INSERT INTO public.stellar_u42_research(user_id,points) VALUES(u,0) ON CONFLICT(user_id) DO NOTHING;
 SELECT points INTO have FROM public.stellar_u42_research WHERE user_id=u FOR UPDATE;
 IF have<c.research_cost THEN RAISE EXCEPTION 'RESEARCH_INSUFFICIENT'; END IF;
 UPDATE public.stellar_u42_research SET points=points-c.research_cost,updated_at=now() WHERE user_id=u;
 INSERT INTO public.stellar_u426_sector_runs(user_id,sector,ready_at,kills_required,research_reward,created_request)
 VALUES(u,p_sector,now()+make_interval(mins=>c.minutes),c.kills_required,c.research_reward,p_request) RETURNING * INTO r;
 RETURN jsonb_build_object('ok',true,'runId',r.id,'readyAt',r.ready_at);
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_u426_sector_start(text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_u426_sector_start(text,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.stellar_u426_sector_claim(p_run uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $fn$
DECLARE u uuid:=auth.uid(); r public.stellar_u426_sector_runs%ROWTYPE; kills bigint;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM public.stellar_u426_sector_runs WHERE id=p_run AND user_id=u FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'RUN_MISSING'; END IF;
 IF r.claimed_at IS NOT NULL THEN RETURN jsonb_build_object('ok',true,'alreadyClaimed',true); END IF;
 IF r.ready_at>now() THEN RAISE EXCEPTION 'SCAN_IN_PROGRESS'; END IF;
 SELECT count(*) INTO kills FROM public.stellar_npc_reward_ledger WHERE user_id=u AND issued_at>=r.started_at;
 IF kills<r.kills_required THEN RAISE EXCEPTION 'VERIFIED_KILLS_INCOMPLETE'; END IF;
 UPDATE public.stellar_u426_sector_runs SET claimed_at=now() WHERE id=r.id;
 INSERT INTO public.stellar_u42_research(user_id,points) VALUES(u,r.research_reward)
 ON CONFLICT(user_id) DO UPDATE SET points=public.stellar_u42_research.points+excluded.points,updated_at=now();
 RETURN jsonb_build_object('ok',true,'researchGranted',r.research_reward,'sector',r.sector);
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_u426_sector_claim(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_u426_sector_claim(uuid) TO authenticated;

-- Market read intentionally bounded; no tokens or private emails exposed.
CREATE OR REPLACE FUNCTION public.stellar_u426_market_snapshot()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $fn$
DECLARE u uuid:=auth.uid(); rules record; cash bigint;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT * INTO rules FROM public.stellar_u426_market_rules WHERE id=1;
 SELECT coalesce((state#>>'{profile,credits}')::bigint,0) INTO cash FROM public.game_saves WHERE user_id=u;
 RETURN jsonb_build_object('ok',true,'credits',coalesce(cash,0),'feeBps',rules.fee_bps,'enabled',rules.enabled,
 'offers',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',o.id,'item',o.item,'quantity',o.quantity,'unitPrice',o.unit_price,
 'sellerName',coalesce(p.callsign,'Piloto'),'mine',o.seller=u,'listedAt',o.listed_at) ORDER BY o.listed_at DESC),'[]'::jsonb)
 FROM (SELECT * FROM public.stellar_u426_market_offers WHERE status='open' ORDER BY listed_at DESC LIMIT 60) o
 LEFT JOIN public.profiles p ON p.id=o.seller),
 'mine',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'item',item,'status',status,'quantity',quantity,
 'price',unit_price,'fee',fee_credits) ORDER BY listed_at DESC),'[]'::jsonb)
 FROM (SELECT * FROM public.stellar_u426_market_offers WHERE seller=u ORDER BY listed_at DESC LIMIT 20) x),
 'stock',(SELECT coalesce(jsonb_agg(jsonb_build_object('item',i.item,'quantity',i.quantity,
 'equipped',(SELECT count(*) FROM public.stellar_u423_loadouts l WHERE l.user_id=u AND l.item=i.item))),'[]'::jsonb)
 FROM public.stellar_u42_inventory i WHERE i.user_id=u AND i.quantity>0));
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_u426_market_snapshot() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_u426_market_snapshot() TO authenticated;

CREATE OR REPLACE FUNCTION public.stellar_u426_market_sell(p_item text,p_qty integer,p_unit bigint,p_request uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $fn$
DECLARE u uuid:=auth.uid(); have bigint; used bigint; v_id uuid; rules record;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED' USING ERRCODE='42501'; END IF;
 IF p_request IS NULL OR p_qty NOT BETWEEN 1 AND 5 OR p_unit NOT BETWEEN 1000 AND 100000000 THEN RAISE EXCEPTION 'INVALID_OFFER'; END IF;
 PERFORM 1 FROM public.game_saves WHERE user_id=u FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'SAVE_MISSING'; END IF;
 SELECT id INTO v_id FROM public.stellar_u426_market_offers WHERE seller=u AND request_id=p_request;
 IF FOUND THEN RETURN jsonb_build_object('ok',true,'alreadyListed',true,'offerId',v_id); END IF;
 SELECT * INTO rules FROM public.stellar_u426_market_rules WHERE id=1;
 IF NOT rules.enabled THEN RAISE EXCEPTION 'MARKET_PAUSED'; END IF;
 IF (SELECT count(*) FROM public.stellar_u426_market_offers WHERE seller=u AND status='open')>=10 THEN RAISE EXCEPTION 'OFFER_LIMIT'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.stellar_u42_catalog WHERE code=p_item AND kind='forge') THEN RAISE EXCEPTION 'ITEM_NOT_TRADABLE'; END IF;
 SELECT quantity INTO have FROM public.stellar_u42_inventory WHERE user_id=u AND item=p_item FOR UPDATE;
 SELECT count(*) INTO used FROM public.stellar_u423_loadouts WHERE user_id=u AND item=p_item;
 IF coalesce(have,0)-used<p_qty THEN RAISE EXCEPTION 'ITEM_NOT_AVAILABLE'; END IF;
 UPDATE public.stellar_u42_inventory SET quantity=quantity-p_qty WHERE user_id=u AND item=p_item;
 INSERT INTO public.stellar_u426_market_offers(seller,item,quantity,unit_price,request_id)
 VALUES(u,p_item,p_qty,p_unit,p_request) RETURNING id INTO v_id;
 RETURN jsonb_build_object('ok',true,'offerId',v_id,'escrowed',p_qty);
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_u426_market_sell(text,integer,bigint,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_u426_market_sell(text,integer,bigint,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.stellar_u426_market_cancel(p_offer uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $fn$
DECLARE u uuid:=auth.uid(); o public.stellar_u426_market_offers%ROWTYPE;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT * INTO o FROM public.stellar_u426_market_offers WHERE id=p_offer AND seller=u FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'OFFER_MISSING'; END IF;
 IF o.status='cancelled' THEN RETURN jsonb_build_object('ok',true,'alreadyCancelled',true); END IF;
 IF o.status<>'open' THEN RAISE EXCEPTION 'OFFER_CLOSED'; END IF;
 PERFORM 1 FROM public.game_saves WHERE user_id=u FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'SAVE_MISSING'; END IF;
 UPDATE public.stellar_u426_market_offers SET status='cancelled',closed_at=now() WHERE id=o.id;
 INSERT INTO public.stellar_u42_inventory(user_id,item,quantity) VALUES(u,o.item,o.quantity)
 ON CONFLICT(user_id,item) DO UPDATE SET quantity=public.stellar_u42_inventory.quantity+excluded.quantity;
 RETURN jsonb_build_object('ok',true,'returned',o.quantity);
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_u426_market_cancel(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_u426_market_cancel(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.stellar_u426_market_buy(p_offer uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $fn$
DECLARE u uuid:=auth.uid(); o public.stellar_u426_market_offers%ROWTYPE; rules record;
 buyer_state jsonb; seller_state jsonb; buyer_cash bigint; seller_cash bigint;
 total bigint; fee bigint; net bigint;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT * INTO o FROM public.stellar_u426_market_offers WHERE id=p_offer FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'OFFER_MISSING'; END IF;
 IF o.status='sold' AND o.buyer=u THEN RETURN jsonb_build_object('ok',true,'alreadyPurchased',true); END IF;
 IF o.status<>'open' OR o.seller=u THEN RAISE EXCEPTION 'OFFER_NOT_AVAILABLE'; END IF;
 SELECT * INTO rules FROM public.stellar_u426_market_rules WHERE id=1;
 IF NOT rules.enabled THEN RAISE EXCEPTION 'MARKET_PAUSED'; END IF;
 -- Stable UUID ordering prevents buyer/seller concurrent purchases deadlocking wallets.
 PERFORM 1 FROM public.game_saves WHERE user_id IN (u,o.seller) ORDER BY user_id FOR UPDATE;
 SELECT state INTO buyer_state FROM public.game_saves WHERE user_id=u;
 SELECT state INTO seller_state FROM public.game_saves WHERE user_id=o.seller;
 IF buyer_state IS NULL OR seller_state IS NULL THEN RAISE EXCEPTION 'SAVE_MISSING'; END IF;
 buyer_cash:=coalesce((buyer_state#>>'{profile,credits}')::bigint,0);
 seller_cash:=coalesce((seller_state#>>'{profile,credits}')::bigint,0);
 total:=o.unit_price*o.quantity;
 fee:=(total*rules.fee_bps+9999)/10000;
 net:=total-fee;
 IF buyer_cash<total THEN RAISE EXCEPTION 'CREDITS_INSUFFICIENT'; END IF;
 IF seller_cash>9000000000000000-net THEN RAISE EXCEPTION 'SELLER_WALLET_CAP'; END IF;
 UPDATE public.game_saves SET state=jsonb_set(jsonb_set(state,'{profile,credits}',to_jsonb(buyer_cash-total),true),
 '{serverPurchaseRevision}',to_jsonb(coalesce((state->>'serverPurchaseRevision')::bigint,0)+1),true),updated_at=now() WHERE user_id=u;
 UPDATE public.game_saves SET state=jsonb_set(jsonb_set(state,'{profile,credits}',to_jsonb(seller_cash+net),true),
 '{serverPurchaseRevision}',to_jsonb(coalesce((state->>'serverPurchaseRevision')::bigint,0)+1),true),updated_at=now() WHERE user_id=o.seller;
 UPDATE public.profiles SET credits=buyer_cash-total,updated_at=now() WHERE id=u;
 UPDATE public.profiles SET credits=seller_cash+net,updated_at=now() WHERE id=o.seller;
 INSERT INTO public.stellar_u42_inventory(user_id,item,quantity) VALUES(u,o.item,o.quantity)
 ON CONFLICT(user_id,item) DO UPDATE SET quantity=public.stellar_u42_inventory.quantity+excluded.quantity;
 UPDATE public.stellar_u426_market_offers SET status='sold',buyer=u,fee_credits=fee,closed_at=now() WHERE id=o.id;
 RETURN jsonb_build_object('ok',true,'item',o.item,'quantity',o.quantity,'paid',total,'fee',fee);
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_u426_market_buy(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_u426_market_buy(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.stellar_u426_clan_snapshot()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $fn$
DECLARE u uuid:=auth.uid(); c uuid; balance bigint;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED' USING ERRCODE='42501'; END IF;
 SELECT clan_id INTO c FROM public.clan_members WHERE user_id=u;
 SELECT coalesce(points,0) INTO balance FROM public.stellar_u42_research WHERE user_id=u;
 RETURN jsonb_build_object('ok',true,'hasClan',c IS NOT NULL,'research',coalesce(balance,0),
 'structures',(SELECT coalesce(jsonb_agg(jsonb_build_object('code',r.structure,'title',r.title,'goal',r.research_goal,
 'enabled',r.enabled,'total',coalesce(f.research_total,0)) ORDER BY r.structure),'[]'::jsonb)
 FROM public.stellar_u426_clan_rules r LEFT JOIN public.stellar_u426_clan_funding f ON f.structure=r.structure AND f.clan_id=c));
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_u426_clan_snapshot() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_u426_clan_snapshot() TO authenticated;

CREATE OR REPLACE FUNCTION public.stellar_u426_clan_fund(p_structure text,p_points integer,p_request uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $fn$
DECLARE u uuid:=auth.uid(); c uuid; balance bigint; total bigint;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'LOGIN_REQUIRED' USING ERRCODE='42501'; END IF;
 IF p_request IS NULL OR p_points NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'INVALID_CONTRIBUTION'; END IF;
 PERFORM 1 FROM public.game_saves WHERE user_id=u FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'SAVE_MISSING'; END IF;
 IF EXISTS(SELECT 1 FROM public.stellar_u426_clan_donations WHERE user_id=u AND request_id=p_request) THEN
  RETURN jsonb_build_object('ok',true,'alreadyFunded',true); END IF;
 SELECT clan_id INTO c FROM public.clan_members WHERE user_id=u;
 IF c IS NULL THEN RAISE EXCEPTION 'CLAN_REQUIRED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.stellar_u426_clan_rules WHERE structure=p_structure AND enabled) THEN RAISE EXCEPTION 'STRUCTURE_UNAVAILABLE'; END IF;
 INSERT INTO public.stellar_u42_research(user_id,points) VALUES(u,0) ON CONFLICT(user_id) DO NOTHING;
 SELECT points INTO balance FROM public.stellar_u42_research WHERE user_id=u FOR UPDATE;
 IF balance<p_points THEN RAISE EXCEPTION 'RESEARCH_INSUFFICIENT'; END IF;
 UPDATE public.stellar_u42_research SET points=points-p_points,updated_at=now() WHERE user_id=u;
 INSERT INTO public.stellar_u426_clan_funding(clan_id,structure,research_total) VALUES(c,p_structure,p_points)
 ON CONFLICT(clan_id,structure) DO UPDATE SET research_total=public.stellar_u426_clan_funding.research_total+excluded.research_total,updated_at=now()
 RETURNING research_total INTO total;
 INSERT INTO public.stellar_u426_clan_donations(user_id,clan_id,structure,research_points,request_id) VALUES(u,c,p_structure,p_points,p_request);
 RETURN jsonb_build_object('ok',true,'total',total,'spent',p_points);
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_u426_clan_fund(text,integer,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_u426_clan_fund(text,integer,uuid) TO authenticated;

-- V42.6: Admin endpoints update bounded safe data, not free-form JSON or SQL.
CREATE OR REPLACE FUNCTION public.stellar_u426_admin_sector(p_code text,p_minutes integer,p_kills integer,p_cost integer,p_reward integer,p_enabled boolean)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_game_admin_v1763(auth.uid()) THEN RAISE EXCEPTION 'ADMIN_ONLY' USING ERRCODE='42501'; END IF;
 IF p_minutes NOT BETWEEN 5 AND 1440 OR p_kills NOT BETWEEN 5 AND 10000 OR p_cost NOT BETWEEN 0 AND 10000 OR p_reward NOT BETWEEN 1 AND 5000 OR p_enabled IS NULL THEN RAISE EXCEPTION 'INVALID_SETTINGS'; END IF;
 UPDATE public.stellar_u426_sectors SET minutes=p_minutes,kills_required=p_kills,research_cost=p_cost,research_reward=p_reward,enabled=p_enabled,updated_at=now() WHERE code=p_code;
 IF NOT FOUND THEN RAISE EXCEPTION 'SECTOR_UNKNOWN'; END IF;
 RETURN jsonb_build_object('ok',true,'code',p_code);
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_u426_admin_sector(text,integer,integer,integer,integer,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_u426_admin_sector(text,integer,integer,integer,integer,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.stellar_u426_admin_market(p_fee integer,p_enabled boolean)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_game_admin_v1763(auth.uid()) THEN RAISE EXCEPTION 'ADMIN_ONLY' USING ERRCODE='42501'; END IF;
 IF p_fee NOT BETWEEN 0 AND 1500 OR p_enabled IS NULL THEN RAISE EXCEPTION 'INVALID_SETTINGS'; END IF;
 UPDATE public.stellar_u426_market_rules SET fee_bps=p_fee,enabled=p_enabled,updated_at=now() WHERE id=1;
 RETURN jsonb_build_object('ok',true);
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_u426_admin_market(integer,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_u426_admin_market(integer,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.stellar_u426_admin_clan(p_structure text,p_goal integer,p_enabled boolean)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_game_admin_v1763(auth.uid()) THEN RAISE EXCEPTION 'ADMIN_ONLY' USING ERRCODE='42501'; END IF;
 IF p_goal NOT BETWEEN 100 AND 100000 OR p_enabled IS NULL THEN RAISE EXCEPTION 'INVALID_SETTINGS'; END IF;
 UPDATE public.stellar_u426_clan_rules SET research_goal=p_goal,enabled=p_enabled,updated_at=now() WHERE structure=p_structure;
 IF NOT FOUND THEN RAISE EXCEPTION 'STRUCTURE_UNKNOWN'; END IF;
 RETURN jsonb_build_object('ok',true);
END;$fn$;
REVOKE ALL ON FUNCTION public.stellar_u426_admin_clan(text,integer,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.stellar_u426_admin_clan(text,integer,boolean) TO authenticated;
COMMIT;
