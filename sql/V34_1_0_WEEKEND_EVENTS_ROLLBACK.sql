-- Para reverter apenas os horários de eventos se necessário.
-- Execute somente após decidir reverter também o servidor para V34.0.1.
BEGIN;
UPDATE public.live_event_config_v16 live SET
  enabled=(b.original_row->>'enabled')::boolean,
  schedule_mode=b.original_row->>'schedule_mode',
  duration_minutes=(b.original_row->>'duration_minutes')::integer,
  repeat_minutes=(b.original_row->>'repeat_minutes')::integer,
  starts_at=(b.original_row->>'starts_at')::timestamptz,
  ends_at=(b.original_row->>'ends_at')::timestamptz,
  weekdays=ARRAY(SELECT jsonb_array_elements_text(b.original_row->'weekdays')::smallint),
  start_local_time=(b.original_row->>'start_local_time')::time,
  rules=b.original_row->'rules',
  updated_at=now()
FROM public.live_event_weekend_backup_v341 b
WHERE live.event_key=b.event_key;
COMMIT;
-- A função de progresso compatível com os modos antigos continua funcional após reverter as flags.
