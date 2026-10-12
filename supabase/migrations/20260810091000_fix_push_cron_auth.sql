create or replace function public.get_push_cron_secret()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  secret_value text;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'forbidden';
  end if;
  select decrypted_secret into secret_value
  from vault.decrypted_secrets
  where name = 'push_cron_secret'
  order by created_at desc
  limit 1;
  return secret_value;
end;
$$;

revoke all on function public.get_push_cron_secret() from public, anon, authenticated;
grant execute on function public.get_push_cron_secret() to service_role;

