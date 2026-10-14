-- STELLAR LEGACY V19.0.17 | Balanceamento de EVENTOS - 31 naves, 4 escudos e 4 itens raros.
-- Guardado por versao e atributos correntes. Nao altera contas, lances, NPCs nem precos.
BEGIN;
CREATE TABLE IF NOT EXISTS public.game_balance_event_backup_v1917 (
 kind text NOT NULL CHECK(kind IN ('ship','item')),
 item_id text NOT NULL,
 params jsonb NOT NULL,
 label text NOT NULL,
 saved_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(kind,item_id)
);
ALTER TABLE public.game_balance_event_backup_v1917 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.game_balance_event_backup_v1917 FROM PUBLIC,anon,authenticated;
DO $event_balance$
DECLARE v_version integer; v_count integer;
BEGIN
  SELECT version INTO v_version FROM public.game_balance_meta_v1909 WHERE id=1 FOR UPDATE;
  IF v_version<>9 THEN RAISE EXCEPTION 'Balanceamento inesperado (versao %; esperado 9). Nao aplicar.',v_version; END IF;
  WITH changes(id,old_hp,attributes) AS (VALUES
    ('aegis',375000,'{"hp":455000,"speed":315,"lasers":11,"generators":18,"extras":4,"cargo":2250}'::jsonb),
    ('basilisk',325000,'{"hp":450000,"speed":330,"lasers":15,"generators":17,"extras":4,"cargo":1650}'::jsonb),
    ('berserker',500000,'{"hp":620000,"speed":300,"lasers":8,"generators":18,"extras":4,"cargo":1650}'::jsonb),
    ('centurion',365000,'{"hp":455000,"speed":335,"lasers":16,"generators":17,"extras":4,"cargo":1600}'::jsonb),
    ('citadel',650000,'{"hp":750000,"speed":250,"lasers":8,"generators":21,"extras":5,"cargo":4500}'::jsonb),
    ('cyborg',365000,'{"hp":455000,"speed":325,"lasers":16,"generators":17,"extras":4,"cargo":1600}'::jsonb),
    ('defcom',150000,'{"hp":290000,"speed":380,"lasers":12,"generators":11,"extras":3,"cargo":900}'::jsonb),
    ('defcomRaven',287500,'{"hp":365000,"speed":385,"lasers":12,"generators":12,"extras":3,"cargo":1000}'::jsonb),
    ('diminisher',356000,'{"hp":460000,"speed":325,"lasers":15,"generators":17,"extras":4,"cargo":1700}'::jsonb),
    ('disruptor',356000,'{"hp":450000,"speed":345,"lasers":14,"generators":16,"extras":4,"cargo":1650}'::jsonb),
    ('goliathX',356000,'{"hp":540000,"speed":305,"lasers":15,"generators":18,"extras":5,"cargo":1900}'::jsonb),
    ('hammerclaw',377500,'{"hp":465000,"speed":305,"lasers":13,"generators":18,"extras":4,"cargo":1900}'::jsonb),
    ('hecate',377500,'{"hp":475000,"speed":320,"lasers":15,"generators":17,"extras":4,"cargo":1600}'::jsonb),
    ('holo',375000,'{"hp":445000,"speed":330,"lasers":15,"generators":16,"extras":4,"cargo":1650}'::jsonb),
    ('hyperion',400000,'{"hp":480000,"speed":320,"lasers":15,"generators":18,"extras":4,"cargo":1750}'::jsonb),
    ('keres',356000,'{"hp":445000,"speed":330,"lasers":15,"generators":17,"extras":4,"cargo":1650}'::jsonb),
    ('mimesis',386000,'{"hp":430000,"speed":350,"lasers":13,"generators":15,"extras":4,"cargo":1650}'::jsonb),
    ('orcus',300000,'{"hp":440000,"speed":320,"lasers":15,"generators":16,"extras":4,"cargo":1750}'::jsonb),
    ('paladin',325000,'{"hp":500000,"speed":315,"lasers":13,"generators":20,"extras":4,"cargo":1750}'::jsonb),
    ('retiarus',386000,'{"hp":465000,"speed":340,"lasers":15,"generators":16,"extras":4,"cargo":1600}'::jsonb),
    ('sentinel',356000,'{"hp":535000,"speed":305,"lasers":15,"generators":18,"extras":4,"cargo":1800}'::jsonb),
    ('solace',356000,'{"hp":465000,"speed":320,"lasers":15,"generators":17,"extras":4,"cargo":1800}'::jsonb),
    ('solaris',377500,'{"hp":460000,"speed":330,"lasers":15,"generators":17,"extras":4,"cargo":1650}'::jsonb),
    ('spearhead',200000,'{"hp":280000,"speed":410,"lasers":7,"generators":12,"extras":3,"cargo":650}'::jsonb),
    ('spectrum',356000,'{"hp":510000,"speed":310,"lasers":15,"generators":18,"extras":4,"cargo":1750}'::jsonb),
    ('tartarus',360000,'{"hp":460000,"speed":345,"lasers":14,"generators":16,"extras":4,"cargo":1700}'::jsonb),
    ('tempest',300000,'{"hp":450000,"speed":360,"lasers":14,"generators":16,"extras":4,"cargo":1700}'::jsonb),
    ('venom',356000,'{"hp":450000,"speed":335,"lasers":15,"generators":17,"extras":4,"cargo":1700}'::jsonb),
    ('yamato',260000,'{"hp":340000,"speed":365,"lasers":10,"generators":13,"extras":3,"cargo":1100}'::jsonb),
    ('yRonin',300000,'{"hp":390000,"speed":375,"lasers":11,"generators":14,"extras":3,"cargo":1200}'::jsonb),
    ('zephyr',250000,'{"hp":380000,"speed":370,"lasers":13,"generators":16,"extras":4,"cargo":1650}'::jsonb)
  )
  SELECT count(*) INTO v_count FROM changes c JOIN public.game_balance_entries_v1909 e
     ON e.kind='ship' AND e.item_id=c.id
   WHERE e.params->>'role' LIKE 'EVENTO%' AND (e.params->>'hp')::integer=c.old_hp;
  IF v_count<>31 THEN RAISE EXCEPTION 'Naves de evento nao correspondem ao catalogo (%/31).',v_count; END IF;
  INSERT INTO public.game_balance_event_backup_v1917(kind,item_id,params,label)
    SELECT e.kind,e.item_id,e.params,e.label FROM public.game_balance_entries_v1909 e
    WHERE e.kind='ship' AND e.params->>'role' LIKE 'EVENTO%';
  GET DIAGNOSTICS v_count=ROW_COUNT;
  IF v_count<>31 THEN RAISE EXCEPTION 'Backup das 31 naves incompleto (%).',v_count; END IF;
  WITH changes(id,old_hp,attributes) AS (VALUES
    ('aegis',375000,'{"hp":455000,"speed":315,"lasers":11,"generators":18,"extras":4,"cargo":2250}'::jsonb),
    ('basilisk',325000,'{"hp":450000,"speed":330,"lasers":15,"generators":17,"extras":4,"cargo":1650}'::jsonb),
    ('berserker',500000,'{"hp":620000,"speed":300,"lasers":8,"generators":18,"extras":4,"cargo":1650}'::jsonb),
    ('centurion',365000,'{"hp":455000,"speed":335,"lasers":16,"generators":17,"extras":4,"cargo":1600}'::jsonb),
    ('citadel',650000,'{"hp":750000,"speed":250,"lasers":8,"generators":21,"extras":5,"cargo":4500}'::jsonb),
    ('cyborg',365000,'{"hp":455000,"speed":325,"lasers":16,"generators":17,"extras":4,"cargo":1600}'::jsonb),
    ('defcom',150000,'{"hp":290000,"speed":380,"lasers":12,"generators":11,"extras":3,"cargo":900}'::jsonb),
    ('defcomRaven',287500,'{"hp":365000,"speed":385,"lasers":12,"generators":12,"extras":3,"cargo":1000}'::jsonb),
    ('diminisher',356000,'{"hp":460000,"speed":325,"lasers":15,"generators":17,"extras":4,"cargo":1700}'::jsonb),
    ('disruptor',356000,'{"hp":450000,"speed":345,"lasers":14,"generators":16,"extras":4,"cargo":1650}'::jsonb),
    ('goliathX',356000,'{"hp":540000,"speed":305,"lasers":15,"generators":18,"extras":5,"cargo":1900}'::jsonb),
    ('hammerclaw',377500,'{"hp":465000,"speed":305,"lasers":13,"generators":18,"extras":4,"cargo":1900}'::jsonb),
    ('hecate',377500,'{"hp":475000,"speed":320,"lasers":15,"generators":17,"extras":4,"cargo":1600}'::jsonb),
    ('holo',375000,'{"hp":445000,"speed":330,"lasers":15,"generators":16,"extras":4,"cargo":1650}'::jsonb),
    ('hyperion',400000,'{"hp":480000,"speed":320,"lasers":15,"generators":18,"extras":4,"cargo":1750}'::jsonb),
    ('keres',356000,'{"hp":445000,"speed":330,"lasers":15,"generators":17,"extras":4,"cargo":1650}'::jsonb),
    ('mimesis',386000,'{"hp":430000,"speed":350,"lasers":13,"generators":15,"extras":4,"cargo":1650}'::jsonb),
    ('orcus',300000,'{"hp":440000,"speed":320,"lasers":15,"generators":16,"extras":4,"cargo":1750}'::jsonb),
    ('paladin',325000,'{"hp":500000,"speed":315,"lasers":13,"generators":20,"extras":4,"cargo":1750}'::jsonb),
    ('retiarus',386000,'{"hp":465000,"speed":340,"lasers":15,"generators":16,"extras":4,"cargo":1600}'::jsonb),
    ('sentinel',356000,'{"hp":535000,"speed":305,"lasers":15,"generators":18,"extras":4,"cargo":1800}'::jsonb),
    ('solace',356000,'{"hp":465000,"speed":320,"lasers":15,"generators":17,"extras":4,"cargo":1800}'::jsonb),
    ('solaris',377500,'{"hp":460000,"speed":330,"lasers":15,"generators":17,"extras":4,"cargo":1650}'::jsonb),
    ('spearhead',200000,'{"hp":280000,"speed":410,"lasers":7,"generators":12,"extras":3,"cargo":650}'::jsonb),
    ('spectrum',356000,'{"hp":510000,"speed":310,"lasers":15,"generators":18,"extras":4,"cargo":1750}'::jsonb),
    ('tartarus',360000,'{"hp":460000,"speed":345,"lasers":14,"generators":16,"extras":4,"cargo":1700}'::jsonb),
    ('tempest',300000,'{"hp":450000,"speed":360,"lasers":14,"generators":16,"extras":4,"cargo":1700}'::jsonb),
    ('venom',356000,'{"hp":450000,"speed":335,"lasers":15,"generators":17,"extras":4,"cargo":1700}'::jsonb),
    ('yamato',260000,'{"hp":340000,"speed":365,"lasers":10,"generators":13,"extras":3,"cargo":1100}'::jsonb),
    ('yRonin',300000,'{"hp":390000,"speed":375,"lasers":11,"generators":14,"extras":3,"cargo":1200}'::jsonb),
    ('zephyr',250000,'{"hp":380000,"speed":370,"lasers":13,"generators":16,"extras":4,"cargo":1650}'::jsonb)
  )
  UPDATE public.game_balance_entries_v1909 e SET params=e.params||c.attributes,updated_at=now()
   FROM changes c WHERE e.kind='ship' AND e.item_id=c.id;
  GET DIAGNOSTICS v_count=ROW_COUNT;
  IF v_count<>31 THEN RAISE EXCEPTION 'Naves atualizadas %/31',v_count; END IF;
  WITH changes(id,old_shield,attributes) AS (VALUES
    ('fs03',8000,'{"shield":12500,"absorption":82,"shieldRegenBonus":0.0625,"description":"12.500 escudo • 82% absorção • +6,25% regeneração • EVENTO."}'::jsonb),
    ('fs04',11400,'{"shield":17200,"absorption":84,"shieldRegenBonus":0.0625,"description":"17.200 escudo • 84% absorção • +6,25% regeneração • EVENTO RARO."}'::jsonb),
    ('sg3nb00',9000,'{"shield":13500,"absorption":78,"description":"13.500 escudo • 78% absorção • EVENTO."}'::jsonb),
    ('sg3nb03',11450,'{"shield":17500,"absorption":85,"description":"17.500 escudo • 85% absorção • EVENTO RARO."}'::jsonb)
  )
  SELECT count(*) INTO v_count FROM changes c JOIN public.game_balance_entries_v1909 e
   ON e.kind='item' AND e.item_id=c.id
   WHERE (e.params->>'shield')::integer=c.old_shield;
  IF v_count<>4 THEN RAISE EXCEPTION 'Escudos de evento nao correspondem ao catalogo (%/4).',v_count; END IF;
  INSERT INTO public.game_balance_event_backup_v1917(kind,item_id,params,label)
    SELECT e.kind,e.item_id,e.params,e.label FROM public.game_balance_entries_v1909 e
    WHERE e.kind='item' AND e.item_id IN ('fs03','fs04','sg3nb00','sg3nb03');
  GET DIAGNOSTICS v_count=ROW_COUNT;
  IF v_count<>4 THEN RAISE EXCEPTION 'Backup dos 4 escudos incompleto (%).',v_count; END IF;
  WITH changes(id,old_shield,attributes) AS (VALUES
    ('fs03',8000,'{"shield":12500,"absorption":82,"shieldRegenBonus":0.0625,"description":"12.500 escudo • 82% absorção • +6,25% regeneração • EVENTO."}'::jsonb),
    ('fs04',11400,'{"shield":17200,"absorption":84,"shieldRegenBonus":0.0625,"description":"17.200 escudo • 84% absorção • +6,25% regeneração • EVENTO RARO."}'::jsonb),
    ('sg3nb00',9000,'{"shield":13500,"absorption":78,"description":"13.500 escudo • 78% absorção • EVENTO."}'::jsonb),
    ('sg3nb03',11450,'{"shield":17500,"absorption":85,"description":"17.500 escudo • 85% absorção • EVENTO RARO."}'::jsonb)
  )
  UPDATE public.game_balance_entries_v1909 e SET params=e.params||c.attributes,updated_at=now()
  FROM changes c WHERE e.kind='item' AND e.item_id=c.id;
  GET DIAGNOSTICS v_count=ROW_COUNT;
  IF v_count<>4 THEN RAISE EXCEPTION 'Escudos atualizados %/4',v_count; END IF;
  SELECT count(*) INTO v_count FROM public.game_balance_entries_v1909 WHERE kind='item' AND item_id IN ('lfx','lfomega','g3n8700','repPrime');
  IF v_count<>0 THEN RAISE EXCEPTION 'Um dos novos equipamentos ja existe. Revisar antes de inserir.'; END IF;
  INSERT INTO public.game_balance_entries_v1909(kind,item_id,label,params) VALUES
    ('item','lfx','ARC-X','{"name":"ARC-X","description":"Laser de evento • 250 dano base e +4% contra aliens.","equipment_type":"laser","equipment_subtype":"","damage":250,"alienBonus":0.04}'::jsonb),
    ('item','lfomega','ARC-Ω','{"name":"ARC-Ω","description":"Laser raro de evento • 265 dano base e +6% contra aliens.","equipment_type":"laser","equipment_subtype":"","damage":265,"alienBonus":0.06}'::jsonb),
    ('item','g3n8700','THR-7','{"name":"THR-7","description":"Motor de evento • +14 velocidade.","equipment_type":"generator","equipment_subtype":"speed","speed":14}'::jsonb),
    ('item','repPrime','Nanobot Prime','{"name":"Nanobot Prime","description":"Reparador raro de evento • +12.000 HP/s e +18.000 escudo/s após 5s fora de combate.","equipment_type":"extra","equipment_subtype":"","repairRate":0.024,"repairTick":12000,"shieldRepairTick":18000,"repairDelay":5}'::jsonb);
  GET DIAGNOSTICS v_count=ROW_COUNT;
  IF v_count<>4 THEN RAISE EXCEPTION 'Novos itens inseridos %/4',v_count; END IF;
  INSERT INTO public.game_coupon_reward_catalog_v193(kind,item_id,name,category,rarity) VALUES
     ('inventory','lfx','ARC-X','LASERS','EVENTO'),
     ('inventory','lfomega','ARC-Ω','LASERS','EVENTO'),
     ('inventory','g3n8700','THR-7','GERADORES','EVENTO'),
     ('inventory','repPrime','Nanobot Prime','EXTRAS','EVENTO')
  ON CONFLICT(kind,item_id) DO NOTHING;
  GET DIAGNOSTICS v_count=ROW_COUNT;
  IF v_count<>4 THEN RAISE EXCEPTION 'Catalogo de cupons inesperado: % dos 4 itens.',v_count; END IF;
  UPDATE public.game_balance_meta_v1909 SET version=version+1,updated_at=now() WHERE id=1;
  GET DIAGNOSTICS v_count=ROW_COUNT;
  IF v_count<>1 THEN RAISE EXCEPTION 'Versionamento nao atualizado.'; END IF;
END;
$event_balance$;
COMMIT;
