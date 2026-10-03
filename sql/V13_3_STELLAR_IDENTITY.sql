-- Stellar Legacy V13.3.0 — identity patch
-- Preserva IDs internos; altera apenas nomes exibidos e rótulos históricos.

begin;

update public.premium_catalog_v12
set name = case id
  when 'elite_lf3' then 'ARC-3'
  when 'elite_lf4' then 'ARC-4'
  when 'elite_sg3nb02' then 'VSH-5'
  when 'elite_g3n6900' then 'THR-5'
  when 'elite_g3n7900' then 'THR-6'
  when 'elite_repair_bot' then 'Nanobot de Reparo • Elite'
  else name end,
description = case id
  when 'elite_lf3' then 'Laser Elite • dano 175 • bônus PvE.'
  when 'elite_lf4' then 'Laser Elite de alto desempenho.'
  when 'elite_sg3nb02' then 'Gerador de escudo Elite • 10.000 ESC • 80% absorção.'
  when 'elite_g3n6900' then 'Motor Elite • +7 velocidade.'
  when 'elite_g3n7900' then 'Motor Elite • +10 velocidade.'
  when 'elite_repair_bot' then 'Nanobot Elite para HP e escudo.'
  else description end
where id in ('elite_lf3','elite_lf4','elite_sg3nb02','elite_g3n6900','elite_g3n7900','elite_repair_bot');

update public.arena_battles
set result = replace(replace(result::text,'LCB-10','PLS-1'),'R-310','CMT-1')::jsonb
where result::text like '%LCB-10%' or result::text like '%R-310%';

-- Atualiza os rótulos gerados nas novas batalhas sem recriar a lógica da função.
do $$
declare v_sql text;
begin
  select pg_get_functiondef(p.oid)
  into v_sql
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='arena_attack_v11' and p.prokind='f'
  limit 1;

  if v_sql is not null then
    v_sql := replace(v_sql,'LCB-10','PLS-1');
    v_sql := replace(v_sql,'R-310','CMT-1');
    execute v_sql;
  end if;
end $$;

commit;
