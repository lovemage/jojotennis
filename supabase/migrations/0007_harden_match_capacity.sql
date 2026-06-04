create unique index if not exists match_applications_active_uid_idx
  on public.match_applications(match_id, applicant_uid)
  where is_deleted = false;

alter table public.matches
  drop constraint if exists matches_filled_slots_bounds;

alter table public.matches
  add constraint matches_filled_slots_bounds
  check (filled_slots >= 0 and filled_slots <= total_slots)
  not valid;

create or replace function public.match_join_accepted(
  p_match_id text,
  p_uid text,
  p_nickname text
)
returns jsonb
language plpgsql
as $$
declare
  m public.matches%rowtype;
  app public.match_applications%rowtype;
  app_exists boolean := false;
  accepted_count integer;
begin
  select * into m
  from public.matches
  where id = p_match_id
  for update;

  if not found or m.is_deleted or m.status = 'cancelled' then
    return jsonb_build_object('ok', false, 'msg', '球局不存在或已取消');
  end if;

  if m.owner_uid = p_uid then
    return jsonb_build_object('ok', false, 'msg', '主揪不需要申請');
  end if;

  select * into app
  from public.match_applications
  where match_id = p_match_id
    and applicant_uid = p_uid
    and is_deleted = false
  for update;
  app_exists := found;

  if app_exists and app.status = 'accepted' then
    return jsonb_build_object('ok', false, 'msg', '你已加入此球局');
  end if;

  if app_exists and app.status = 'pending' then
    return jsonb_build_object('ok', false, 'msg', '已申請過此球局');
  end if;

  select count(*) into accepted_count
  from public.match_applications
  where match_id = p_match_id
    and status = 'accepted'
    and is_deleted = false;

  if accepted_count >= m.total_slots then
    update public.matches
      set filled_slots = accepted_count,
          status = 'closed',
          updated_at = now()
      where id = p_match_id;
    return jsonb_build_object('ok', false, 'msg', '球局已額滿');
  end if;

  if app_exists then
    update public.match_applications
      set status = 'accepted',
          applicant_nickname = p_nickname,
          updated_at = now()
      where id = app.id;
  else
    insert into public.match_applications(match_id, applicant_uid, applicant_nickname, status)
    values (p_match_id, p_uid, p_nickname, 'accepted');
  end if;

  accepted_count := accepted_count + 1;

  update public.matches
    set filled_slots = accepted_count,
        status = case when accepted_count >= total_slots then 'closed' else 'open' end,
        updated_at = now()
    where id = p_match_id;

  return jsonb_build_object(
    'ok', true,
    'msg', '已成功加入球局',
    'acceptedCount', accepted_count,
    'isFull', accepted_count >= m.total_slots
  );
end;
$$;

create or replace function public.match_accept_application(
  p_match_id text,
  p_applicant_uid text
)
returns jsonb
language plpgsql
as $$
declare
  m public.matches%rowtype;
  app public.match_applications%rowtype;
  accepted_count integer;
begin
  select * into m
  from public.matches
  where id = p_match_id
  for update;

  if not found or m.is_deleted or m.status = 'cancelled' then
    return jsonb_build_object('ok', false, 'msg', '球局不存在或已取消');
  end if;

  select * into app
  from public.match_applications
  where match_id = p_match_id
    and applicant_uid = p_applicant_uid
    and status = 'pending'
    and is_deleted = false
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'msg', '申請不存在或已處理');
  end if;

  select count(*) into accepted_count
  from public.match_applications
  where match_id = p_match_id
    and status = 'accepted'
    and is_deleted = false;

  if accepted_count >= m.total_slots then
    update public.matches
      set filled_slots = accepted_count,
          status = 'closed',
          updated_at = now()
      where id = p_match_id;
    return jsonb_build_object('ok', false, 'msg', '已達人數上限');
  end if;

  update public.match_applications
    set status = 'accepted',
        updated_at = now()
    where id = app.id;

  accepted_count := accepted_count + 1;

  update public.matches
    set filled_slots = accepted_count,
        status = case when accepted_count >= total_slots then 'closed' else 'open' end,
        updated_at = now()
    where id = p_match_id;

  return jsonb_build_object(
    'ok', true,
    'msg', '已接受申請',
    'acceptedCount', accepted_count,
    'isFull', accepted_count >= m.total_slots
  );
end;
$$;

revoke all on function public.match_join_accepted(text, text, text) from public, anon, authenticated;
revoke all on function public.match_accept_application(text, text) from public, anon, authenticated;
grant execute on function public.match_join_accepted(text, text, text) to service_role;
grant execute on function public.match_accept_application(text, text) to service_role;
