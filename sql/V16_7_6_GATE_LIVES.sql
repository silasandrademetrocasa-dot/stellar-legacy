-- Stellar Legacy V16.7.6 • Gate life prices
insert into public.live_shop_prices_v16(catalog_key,kind,ref_id,price,currency,enabled,meta,updated_at) values
('gate_life:alpha','gate_life','alpha',4000000,'credits',true,'{"grant":{"kind":"gate_life","protocol":"alpha","qty":1}}'::jsonb,now()),
('gate_life:beta','gate_life','beta',8000000,'credits',true,'{"grant":{"kind":"gate_life","protocol":"beta","qty":1}}'::jsonb,now()),
('gate_life:gamma','gate_life','gamma',15000000,'credits',true,'{"grant":{"kind":"gate_life","protocol":"gamma","qty":1}}'::jsonb,now())
on conflict(catalog_key) do update set kind=excluded.kind,ref_id=excluded.ref_id,price=excluded.price,currency=excluded.currency,enabled=excluded.enabled,meta=excluded.meta,updated_at=now();
