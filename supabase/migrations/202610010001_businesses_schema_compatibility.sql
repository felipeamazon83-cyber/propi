-- Apply this migration to projects that already had a `businesses` table before
-- the complete initial schema was introduced.  `create_all()` does not alter an
-- existing PostgreSQL table, so these columns must be added by a migration.
alter table public.businesses
    add column if not exists legal_name text,
    add column if not exists logo_url text,
    add column if not exists country text not null default 'ES',
    add column if not exists currency text not null default 'EUR',
    add column if not exists stripe_account_id text,
    add column if not exists subscription_status text not null default 'trialing',
    add column if not exists active boolean not null default true,
    add column if not exists created_at timestamptz not null default now(),
    add column if not exists updated_at timestamptz not null default now();

create index if not exists businesses_owner_created_idx
    on public.businesses (owner_id, created_at desc);
