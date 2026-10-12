create schema if not exists private;

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default '우리 가족',
  invite_code text not null unique,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  member_role text not null check (member_role in ('parent', 'child')),
  can_edit boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table if not exists public.household_states (
  household_id uuid primary key references public.households(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  version bigint not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create index if not exists household_members_user_id_idx
  on public.household_members (user_id);

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_states enable row level security;

create or replace function private.is_household_member(target_household uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members
    where household_id = target_household
      and user_id = (select auth.uid())
  );
$$;

create or replace function private.can_edit_household(target_household uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members
    where household_id = target_household
      and user_id = (select auth.uid())
      and can_edit = true
  );
$$;

create or replace function private.is_household_owner(target_household uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.households
    where id = target_household
      and owner_id = (select auth.uid())
  );
$$;

revoke all on function private.is_household_member(uuid) from public;
revoke all on function private.can_edit_household(uuid) from public;
revoke all on function private.is_household_owner(uuid) from public;
grant execute on function private.is_household_member(uuid) to authenticated;
grant execute on function private.can_edit_household(uuid) to authenticated;
grant execute on function private.is_household_owner(uuid) to authenticated;

drop policy if exists "members can view household" on public.households;
create policy "members can view household"
on public.households for select
to authenticated
using ((select private.is_household_member(id)));

drop policy if exists "members can view members" on public.household_members;
create policy "members can view members"
on public.household_members for select
to authenticated
using ((select private.is_household_member(household_id)));

drop policy if exists "owners can update members" on public.household_members;
create policy "owners can update members"
on public.household_members for update
to authenticated
using ((select private.is_household_owner(household_id)))
with check ((select private.is_household_owner(household_id)));

drop policy if exists "members can view state" on public.household_states;
create policy "members can view state"
on public.household_states for select
to authenticated
using ((select private.is_household_member(household_id)));

grant select on public.households to authenticated;
grant select, update on public.household_members to authenticated;
grant select on public.household_states to authenticated;

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
    generated_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
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

create or replace function public.join_household(
  household_code text,
  display_name text,
  member_role text default 'child'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_household_id uuid;
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

  select id into target_household_id
  from public.households
  where invite_code = upper(trim(household_code));

  if target_household_id is null then
    raise exception '가족 연결 코드를 확인해 주세요.';
  end if;

  insert into public.household_members (household_id, user_id, display_name, member_role, can_edit)
  values (target_household_id, auth.uid(), trim(display_name), member_role, false)
  on conflict (household_id, user_id) do update
    set display_name = excluded.display_name,
        member_role = excluded.member_role;

  return target_household_id;
end;
$$;

create or replace function public.save_household_state(
  target_household_id uuid,
  next_state jsonb
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

  update public.household_states
  set state = next_state,
      version = version + 1,
      updated_at = now(),
      updated_by = auth.uid()
  where household_id = target_household_id
  returning * into saved;

  if saved.household_id is null then
    raise exception '가족 일정 저장소를 찾을 수 없습니다.';
  end if;

  return saved;
end;
$$;

create or replace function public.set_household_member_permission(
  target_household_id uuid,
  target_user_id uuid,
  allow_edit boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.is_household_owner(target_household_id) then
    raise exception '가족 대표만 권한을 변경할 수 있습니다.';
  end if;
  if target_user_id = auth.uid() and allow_edit = false then
    raise exception '가족 대표의 수정 권한은 해제할 수 없습니다.';
  end if;

  update public.household_members
  set can_edit = allow_edit
  where household_id = target_household_id
    and user_id = target_user_id;
end;
$$;

revoke all on function public.create_household(text, text, text) from public;
revoke all on function public.join_household(text, text, text) from public;
revoke all on function public.save_household_state(uuid, jsonb) from public;
revoke all on function public.set_household_member_permission(uuid, uuid, boolean) from public;
grant execute on function public.create_household(text, text, text) to authenticated;
grant execute on function public.join_household(text, text, text) to authenticated;
grant execute on function public.save_household_state(uuid, jsonb) to authenticated;
grant execute on function public.set_household_member_permission(uuid, uuid, boolean) to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'household_states'
  ) then
    alter publication supabase_realtime add table public.household_states;
  end if;
end;
$$;
