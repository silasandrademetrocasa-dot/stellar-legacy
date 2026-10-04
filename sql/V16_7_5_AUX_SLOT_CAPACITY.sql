-- Stellar Legacy V16.7.5 — AUX-9 slot capacity extension
-- Already applied to production Supabase by ChatGPT.
insert into public.live_shop_prices_v16(catalog_key,kind,ref_id,price,currency,enabled,meta,updated_at)
values
('pet_slot:16','pet_slot','16',2960000,'uridium',true,'{"grant":{"kind":"pet_slot","slot":16}}'::jsonb,now()),
('pet_slot:17','pet_slot','17',3315000,'uridium',true,'{"grant":{"kind":"pet_slot","slot":17}}'::jsonb,now()),
('pet_slot:18','pet_slot','18',3690000,'uridium',true,'{"grant":{"kind":"pet_slot","slot":18}}'::jsonb,now()),
('pet_slot:19','pet_slot','19',4085000,'uridium',true,'{"grant":{"kind":"pet_slot","slot":19}}'::jsonb,now()),
('pet_slot:20','pet_slot','20',4500000,'uridium',true,'{"grant":{"kind":"pet_slot","slot":20}}'::jsonb,now()),
('pet_slot:21','pet_slot','21',4935000,'uridium',true,'{"grant":{"kind":"pet_slot","slot":21}}'::jsonb,now()),
('pet_slot:22','pet_slot','22',5390000,'uridium',true,'{"grant":{"kind":"pet_slot","slot":22}}'::jsonb,now())
on conflict(catalog_key) do update set
  kind=excluded.kind,ref_id=excluded.ref_id,price=excluded.price,currency=excluded.currency,
  enabled=excluded.enabled,meta=excluded.meta,updated_at=now();
