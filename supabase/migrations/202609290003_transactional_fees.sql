-- Propi is €0/month: pricing is recorded per successful customer transaction.
alter table public.tips add column platform_fixed_fee numeric(10,2) not null default 0;
alter table public.tips add column platform_percentage_fee numeric(10,2) not null default 0;
alter table public.tips add column customer_total numeric(10,2) not null default 0;
alter table public.tips add column connected_account_payout numeric(10,2) not null default 0;
alter table public.tips add column stripe_transfer_id text unique;
