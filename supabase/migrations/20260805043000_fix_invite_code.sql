create or replace function public.create_household(
  household_name text,
  display_name text,
  member_role text default 'parent'
)
returns table (household_id uuid, invite_code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_household_id uuid;
  generated_code text;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;
  if nullif(trim(display_name), '') is null then
    raise exception '표시 이름을 입력해 주세요.';
  end if;
  if member_role not in ('parent', 'child') then
    raise exception '올바르지 않은 가족 역할입니다.';
  end if;

  loop
    generated_code := upper(substr(md5(random()::text || clock_timestamp()::text || auth.uid()::text), 1, 8));
    exit when not exists (
      select 1 from public.households where households.invite_code = generated_code
    );
  end loop;

  insert into public.households (name, invite_code, owner_id)
  values (coalesce(nullif(trim(household_name), ''), '우리 가족'), generated_code, auth.uid())
  returning id into new_household_id;

  insert into public.household_members (household_id, user_id, display_name, member_role, can_edit)
  values (new_household_id, auth.uid(), trim(display_name), member_role, true);

  insert into public.household_states (household_id, state, updated_by)
  values (new_household_id, '{}'::jsonb, auth.uid());

  return query select new_household_id, generated_code;
end;
$$;

revoke all on function public.create_household(text, text, text) from public, anon;
grant execute on function public.create_household(text, text, text) to authenticated;
