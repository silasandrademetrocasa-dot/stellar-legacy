-- Stellar Legacy V18.1.7A — Calendário de Eventos Data Driven

alter table public.live_event_config_v16
  add column if not exists schedule_mode text not null default 'interval',
  add column if not exists weekdays smallint[] not null default '{}'::smallint[],
  add column if not exists start_local_time time without time zone,
  add column if not exists timezone text not null default 'America/Sao_Paulo',
  add column if not exists ends_at timestamptz;

do $$ begin
  alter table public.live_event_config_v16
    add constraint live_event_schedule_mode_v1817a_check
    check (schedule_mode in ('interval','weekly','once'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.live_event_config_v16
    add constraint live_event_timezone_v1817a_check
    check (timezone = 'America/Sao_Paulo');
exception when duplicate_object then null; end $$;

create or replace function public.get_live_ops_v16()
returns jsonb
language sql
security definer
set search_path to 'public'
as $$
  select jsonb_build_object(
    'server_time', (extract(epoch from clock_timestamp())*1000)::bigint,
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'event_key',event_key,'name',name,'icon',icon,'description',description,'enabled',enabled,
        'starts_at',starts_at,'duration_minutes',duration_minutes,'repeat_minutes',repeat_minutes,
        'schedule_mode',schedule_mode,'weekdays',weekdays,'start_local_time',start_local_time,
        'timezone',timezone,'ends_at',ends_at,
        'priority',priority,'target',target,'reward',reward,'rules',rules,'updated_at',updated_at
      ) order by priority,event_key)
      from public.live_event_config_v16
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

create or replace function public.admin_update_live_event_schedule_v1817a(
  p_event_key text,
  p_enabled boolean default null,
  p_schedule_mode text default null,
  p_starts_at timestamptz default null,
  p_duration_minutes integer default null,
  p_repeat_minutes integer default null,
  p_weekdays integer[] default null,
  p_start_local_time text default null,
  p_ends_at timestamptz default null,
  p_clear_ends_at boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_uid uuid:=auth.uid();
  v_days smallint[];
  v_time time;
  v_mode text;
begin
  if not public.is_game_admin_v1763(v_uid) then raise exception 'Acesso administrativo negado.'; end if;
  if not exists(select 1 from public.live_event_config_v16 where event_key=p_event_key) then raise exception 'Evento não encontrado.'; end if;

  if p_schedule_mode is not null and p_schedule_mode not in ('interval','weekly','once') then
    raise exception 'Modo de agenda inválido.';
  end if;

  if p_weekdays is not null then
    select coalesce(array_agg(distinct x::smallint order by x::smallint),'{}'::smallint[])
      into v_days
      from unnest(p_weekdays) x
      where x between 0 and 6;
  end if;

  if p_start_local_time is not null and btrim(p_start_local_time)<>'' then
    begin
      v_time:=p_start_local_time::time;
    exception when others then
      raise exception 'Horário local inválido.';
    end;
  end if;

  update public.live_event_config_v16
  set enabled=case when p_enabled is null then enabled else p_enabled end,
      schedule_mode=case when p_schedule_mode is null then schedule_mode else p_schedule_mode end,
      starts_at=case when p_starts_at is null then starts_at else p_starts_at end,
      duration_minutes=case when p_duration_minutes is null then duration_minutes else greatest(1,least(10080,p_duration_minutes)) end,
      repeat_minutes=case when p_repeat_minutes is null then repeat_minutes else greatest(1,least(10080,p_repeat_minutes)) end,
      weekdays=case when p_weekdays is null then weekdays else coalesce(v_days,'{}'::smallint[]) end,
      start_local_time=case when p_start_local_time is null then start_local_time else v_time end,
      timezone='America/Sao_Paulo',
      ends_at=case when p_clear_ends_at then null when p_ends_at is null then ends_at else p_ends_at end,
      updated_at=now()
  where event_key=p_event_key;

  select schedule_mode into v_mode from public.live_event_config_v16 where event_key=p_event_key;
  if v_mode='weekly' and (
    coalesce(array_length((select weekdays from public.live_event_config_v16 where event_key=p_event_key),1),0)=0
    or (select start_local_time is null from public.live_event_config_v16 where event_key=p_event_key)
  ) then
    raise exception 'Agenda semanal precisa de pelo menos um dia e um horário.';
  end if;

  return public.get_live_ops_v16();
end;
$$;

revoke all on function public.admin_update_live_event_schedule_v1817a(text,boolean,text,timestamptz,integer,integer,integer[],text,timestamptz,boolean) from public,anon;
grant execute on function public.admin_update_live_event_schedule_v1817a(text,boolean,text,timestamptz,integer,integer,integer[],text,timestamptz,boolean) to authenticated,service_role;
