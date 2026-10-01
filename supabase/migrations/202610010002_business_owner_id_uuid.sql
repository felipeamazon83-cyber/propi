-- Older deployments stored Supabase Auth user IDs as varchar.  The API and
-- auth.users use UUID values, so make the database type match permanently.
alter table public.businesses
    alter column owner_id type uuid using owner_id::uuid;

create index if not exists businesses_owner_created_idx
    on public.businesses (owner_id, created_at desc);
