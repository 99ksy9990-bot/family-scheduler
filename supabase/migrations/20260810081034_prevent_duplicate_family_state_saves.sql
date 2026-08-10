create or replace function public.save_household_state_v2(
  target_household_id uuid,
  next_state jsonb,
  expected_version bigint
)
returns public.household_states
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved public.household_states;
begin
  if auth.uid() is null or not private.can_edit_household(target_household_id) then
    raise exception '이 가족 일정의 수정 권한이 없습니다.';
  end if;

  select * into saved
  from public.household_states
  where household_id = target_household_id
  for update;

  if saved.household_id is null then
    raise exception '가족 일정 저장소를 찾을 수 없습니다.';
  end if;

  -- JSONB equality ignores object key order. Returning the current row for an
  -- identical payload prevents old clients from creating version-only loops.
  if saved.state = next_state then
    return saved;
  end if;

  if saved.version <> expected_version then
    raise exception using errcode = '40001', message = 'SYNC_CONFLICT';
  end if;

  update public.household_states
  set state = next_state,
      version = version + 1,
      updated_at = now(),
      updated_by = auth.uid()
  where household_id = target_household_id
  returning * into saved;

  return saved;
end;
$$;
