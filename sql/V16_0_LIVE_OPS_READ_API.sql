-- Stellar Legacy V16.0.0 — ETAPA 1
-- As tabelas live_event_config_v16 e live_shop_prices_v16 já são criadas pelo schema LIVE OPS.
-- Esta RPC expõe somente configuração operacional pública do jogo (eventos e catálogo/preços).

create or replace function public.get_live_ops_v16()
returns jsonb
language sql
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'server_time', (extract(epoch from clock_timestamp())*1000)::bigint,
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'event_key',event_key,'name',name,'icon',icon,'description',description,'enabled',enabled,
        'starts_at',starts_at,'duration_minutes',duration_minutes,'repeat_minutes',repeat_minutes,
        'priority',priority,'target',target,'reward',reward,'rules',rules,'updated_at',updated_at
      ) order by priority,event_key)
      from public.live_event_config_v16 where enabled
    ), '[]'::jsonb),
    'catalog', coalesce((
      select jsonb_agg(jsonb_build_object(
        'catalog_key',catalog_key,'kind',kind,'ref_id',ref_id,'price',price,'currency',currency,
        'enabled',enabled,'meta',meta,'updated_at',updated_at
      ) order by kind,catalog_key)
      from public.live_shop_prices_v16 where enabled
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_live_ops_v16() from public;
grant execute on function public.get_live_ops_v16() to anon, authenticated, service_role;
