create policy "clients cannot read push delivery log"
on public.push_delivery_log for select to authenticated
using (false);

create policy "clients cannot read push config"
on public.push_config for select to authenticated
using (false);

create index if not exists event_comments_created_by_idx on public.event_comments (created_by);
create index if not exists event_checklist_created_by_idx on public.event_checklist_items (created_by);
create index if not exists event_checklist_updated_by_idx on public.event_checklist_items (updated_by);
create index if not exists event_attachments_uploaded_by_idx on public.event_attachments (uploaded_by);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

