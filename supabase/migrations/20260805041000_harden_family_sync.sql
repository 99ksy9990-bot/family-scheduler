revoke execute on function public.create_household(text, text, text) from anon;
revoke execute on function public.join_household(text, text, text) from anon;
revoke execute on function public.save_household_state(uuid, jsonb) from anon;
revoke execute on function public.set_household_member_permission(uuid, uuid, boolean) from anon;

create index if not exists households_owner_id_idx
  on public.households (owner_id);

create index if not exists household_states_updated_by_idx
  on public.household_states (updated_by);
