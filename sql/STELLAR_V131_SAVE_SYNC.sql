-- Additive. The existing V118 transaction still owns the save, profile and backups.
create or replace function public.stellar_read_save_v131(p_user_id uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select coalesce((select jsonb_build_object('state',state,'updated_at',updated_at,
    'save_token',md5(state::text)) from public.game_saves where user_id=p_user_id),
    jsonb_build_object('save_token','new'));
$$;

create or replace function public.stellar_commit_save_v131(
  p_user_id uuid, p_state jsonb, p_updated_at timestamptz, p_callsign text, p_expected_token text
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  current_token text;
  result jsonb;
begin
  select md5(state::text) into current_token from public.game_saves
    where user_id=p_user_id for update;
  if p_expected_token is distinct from coalesce(current_token,'new') then
    return jsonb_build_object('ok',false,'code','SAVE_REVISION_CONFLICT');
  end if;
  if current_token is null then
    -- Reserve a missing row atomically. A competing first save cannot overwrite it.
    insert into public.game_saves(user_id,state,updated_at) values(p_user_id,p_state,p_updated_at)
      on conflict(user_id) do nothing;
    if not found then return jsonb_build_object('ok',false,'code','SAVE_REVISION_CONFLICT'); end if;
  end if;
  result := public.stellar_commit_player_save_v118(p_user_id,p_state,p_updated_at,p_callsign);
  if (result->>'ok')::boolean is distinct from true then raise exception 'SAVE_NOT_CONFIRMED'; end if;
  select md5(state::text) into current_token from public.game_saves where user_id=p_user_id;
  return result || jsonb_build_object('save_token',current_token);
end; $$;
revoke all on function public.stellar_read_save_v131(uuid), public.stellar_commit_save_v131(uuid,jsonb,timestamptz,text,text) from public, anon, authenticated;
grant execute on function public.stellar_read_save_v131(uuid), public.stellar_commit_save_v131(uuid,jsonb,timestamptz,text,text) to service_role;
