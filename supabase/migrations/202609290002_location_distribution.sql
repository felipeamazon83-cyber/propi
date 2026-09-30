alter table public.locations add column distribution_mode text not null default 'employee' check (distribution_mode in ('employee','team','custom'));
alter table public.locations add column fixed_employee_id uuid references public.employees(id);
alter table public.locations add column employee_percentage numeric(5,2) not null default 100 check (employee_percentage between 0 and 100);
alter table public.locations add column suggested_amounts numeric[] not null default array[1,2,3,5]::numeric[];
