-- Stellar Legacy V11 — Arena Cinematic Combat
-- Adds a new RPC without removing the V10 arena RPC, so rollback is simple.
-- Fixed Arena loadout: LCB-10 (X1) + R-310.

create or replace function public.arena_attack_v11(p_target_user_id uuid)
returns table(
  won boolean,
  rounds integer,
  attacks_left integer,
  opponent_callsign text,
  attacker_remaining bigint,
  defender_remaining bigint,
  attacker_rating integer,
  defender_rating integer,
  attacker_hp_start bigint,
  attacker_shield_start bigint,
  defender_hp_start bigint,
  defender_shield_start bigint,
  attacker_ship text,
  defender_ship text,
  attacker_callsign text,
  defender_callsign text,
  attacker_laser_damage bigint,
  defender_laser_damage bigint,
  attacker_speed integer,
  defender_speed integer,
  battle_duration_ms integer,
  combat_log jsonb
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_day date := (now() at time zone 'America/Sao_Paulo')::date;
  a public.arena_profiles%rowtype;
  d public.arena_profiles%rowtype;
  daily public.arena_daily%rowtype;

  a_hp bigint;
  a_shield bigint;
  d_hp bigint;
  d_shield bigint;
  a_hp_start bigint;
  a_shield_start bigint;
  d_hp_start bigint;
  d_shield_start bigint;

  v_hit bigint;
  v_shield_damage bigint;
  v_hp_damage bigint;
  v_dodged boolean;
  v_log jsonb := '[]'::jsonb;
  v_seq integer := 0;
  v_round integer := 0;
  v_i integer;
  v_winner uuid;
  v_won boolean;
  a_rating integer;
  d_rating integer;
  v_duration integer;
begin
  if v_uid is null then raise exception 'Sessão ausente.'; end if;
  if p_target_user_id is null or p_target_user_id = v_uid then raise exception 'Adversário inválido.'; end if;

  perform pg_advisory_xact_lock(hashtext(v_uid::text || ':' || v_day::text));

  select * into a from public.arena_profiles where user_id = v_uid for update;
  if a.user_id is null then raise exception 'Abra a Arena novamente para sincronizar sua nave.'; end if;

  select * into d from public.arena_profiles where user_id = p_target_user_id;
  if d.user_id is null then raise exception 'Adversário indisponível.'; end if;

  insert into public.arena_daily(user_id,battle_date,attacks_used)
  values(v_uid,v_day,0)
  on conflict(user_id,battle_date) do nothing;

  select * into daily
  from public.arena_daily
  where user_id = v_uid and battle_date = v_day
  for update;

  if daily.attacks_used >= 10 then
    raise exception 'Limite diário atingido: 10 batalhas.';
  end if;

  update public.arena_daily
  set attacks_used = attacks_used + 1
  where user_id = v_uid and battle_date = v_day;

  insert into public.arena_stats(user_id) values(v_uid) on conflict(user_id) do nothing;
  insert into public.arena_stats(user_id) values(p_target_user_id) on conflict(user_id) do nothing;

  a_hp_start := greatest(1, a.hp);
  a_shield_start := greatest(0, a.shield);
  d_hp_start := greatest(1, d.hp);
  d_shield_start := greatest(0, d.shield);
  a_hp := a_hp_start;
  a_shield := a_shield_start;
  d_hp := d_hp_start;
  d_shield := d_shield_start;

  -- Up to 30 rounds. Each pilot fires LCB-10 every round and an R-310 every 4th round.
  for v_i in 1..30 loop
    v_round := v_i;
    -- Attacker LCB-10
    v_hit := greatest(100, round(greatest(100,a.laser_damage) * (0.88 + random()*0.24) + a.level*90)::bigint);
    v_dodged := random() < least(0.18, d.speed/10000.0);
    if v_dodged then v_hit := greatest(1, round(v_hit*0.60)::bigint); end if;
    v_shield_damage := least(d_shield, v_hit);
    v_hp_damage := greatest(0, v_hit - v_shield_damage);
    d_shield := greatest(0, d_shield - v_shield_damage);
    d_hp := greatest(0, d_hp - v_hp_damage);
    v_seq := v_seq + 1;
    v_log := v_log || jsonb_build_array(jsonb_build_object(
      'seq',v_seq,'round',v_round,'actor','attacker','weapon','LCB-10','damage',v_hit,
      'shield_damage',v_shield_damage,'hp_damage',v_hp_damage,'dodged',v_dodged,
      'target_hp',d_hp,'target_shield',d_shield
    ));
    if d_hp <= 0 then exit; end if;

    -- Attacker R-310 every 4th round
    if mod(v_round,4)=0 then
      v_hit := greatest(1, round(1000 * (0.95 + random()*0.10))::bigint);
      v_shield_damage := least(d_shield, v_hit);
      v_hp_damage := greatest(0, v_hit - v_shield_damage);
      d_shield := greatest(0, d_shield - v_shield_damage);
      d_hp := greatest(0, d_hp - v_hp_damage);
      v_seq := v_seq + 1;
      v_log := v_log || jsonb_build_array(jsonb_build_object(
        'seq',v_seq,'round',v_round,'actor','attacker','weapon','R-310','damage',v_hit,
        'shield_damage',v_shield_damage,'hp_damage',v_hp_damage,'dodged',false,
        'target_hp',d_hp,'target_shield',d_shield
      ));
      if d_hp <= 0 then exit; end if;
    end if;

    -- Defender LCB-10
    v_hit := greatest(100, round(greatest(100,d.laser_damage) * (0.88 + random()*0.24) + d.level*90)::bigint);
    v_dodged := random() < least(0.18, a.speed/10000.0);
    if v_dodged then v_hit := greatest(1, round(v_hit*0.60)::bigint); end if;
    v_shield_damage := least(a_shield, v_hit);
    v_hp_damage := greatest(0, v_hit - v_shield_damage);
    a_shield := greatest(0, a_shield - v_shield_damage);
    a_hp := greatest(0, a_hp - v_hp_damage);
    v_seq := v_seq + 1;
    v_log := v_log || jsonb_build_array(jsonb_build_object(
      'seq',v_seq,'round',v_round,'actor','defender','weapon','LCB-10','damage',v_hit,
      'shield_damage',v_shield_damage,'hp_damage',v_hp_damage,'dodged',v_dodged,
      'target_hp',a_hp,'target_shield',a_shield
    ));
    if a_hp <= 0 then exit; end if;

    -- Defender R-310 every 4th round
    if mod(v_round,4)=0 then
      v_hit := greatest(1, round(1000 * (0.95 + random()*0.10))::bigint);
      v_shield_damage := least(a_shield, v_hit);
      v_hp_damage := greatest(0, v_hit - v_shield_damage);
      a_shield := greatest(0, a_shield - v_shield_damage);
      a_hp := greatest(0, a_hp - v_hp_damage);
      v_seq := v_seq + 1;
      v_log := v_log || jsonb_build_array(jsonb_build_object(
        'seq',v_seq,'round',v_round,'actor','defender','weapon','R-310','damage',v_hit,
        'shield_damage',v_shield_damage,'hp_damage',v_hp_damage,'dodged',false,
        'target_hp',a_hp,'target_shield',a_shield
      ));
      if a_hp <= 0 then exit; end if;
    end if;
  end loop;

  if a_hp = d_hp and a_shield = d_shield then
    v_winner := case when random() < 0.5 then v_uid else p_target_user_id end;
  elsif (a_hp + a_shield) > (d_hp + d_shield) then
    v_winner := v_uid;
  else
    v_winner := p_target_user_id;
  end if;
  v_won := v_winner = v_uid;

  update public.arena_stats
  set battles = battles + 1,
      wins = wins + (case when user_id = v_winner then 1 else 0 end),
      losses = losses + (case when user_id <> v_winner then 1 else 0 end),
      rating = greatest(0, rating + (case when user_id = v_winner then 25 else -10 end)),
      updated_at = now()
  where user_id in (v_uid,p_target_user_id);

  v_duration := greatest(1800, jsonb_array_length(v_log) * 360);

  insert into public.arena_battles(
    battle_date,attacker_id,defender_id,winner_id,attacker_power,defender_power,rounds,result
  ) values(
    v_day,v_uid,p_target_user_id,v_winner,a.power,d.power,v_round,
    jsonb_build_object(
      'version','11.0.0',
      'fixed_laser','LCB-10',
      'fixed_rocket','R-310',
      'attacker_remaining',greatest(0,a_hp+a_shield),
      'defender_remaining',greatest(0,d_hp+d_shield),
      'attacker_hp_start',a_hp_start,
      'attacker_shield_start',a_shield_start,
      'defender_hp_start',d_hp_start,
      'defender_shield_start',d_shield_start,
      'attacker_ship',a.ship_id,
      'defender_ship',d.ship_id,
      'battle_duration_ms',v_duration,
      'combat_log',v_log
    )
  );

  select rating into a_rating from public.arena_stats where user_id=v_uid;
  select rating into d_rating from public.arena_stats where user_id=p_target_user_id;

  return query
  select
    v_won,
    v_round,
    (9-daily.attacks_used)::int,
    d.callsign,
    greatest(0,a_hp+a_shield)::bigint,
    greatest(0,d_hp+d_shield)::bigint,
    a_rating,
    d_rating,
    a_hp_start,
    a_shield_start,
    d_hp_start,
    d_shield_start,
    a.ship_id,
    d.ship_id,
    a.callsign,
    d.callsign,
    a.laser_damage,
    d.laser_damage,
    a.speed,
    d.speed,
    v_duration,
    v_log;
end;
$$;

revoke all on function public.arena_attack_v11(uuid) from public, anon;
grant execute on function public.arena_attack_v11(uuid) to authenticated;
