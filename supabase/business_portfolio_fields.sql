-- Business profile details, startup/business directory choice, and editable portfolio content.
alter table public.businesses
  add column if not exists listing_type text not null default 'business',
  add column if not exists established_year integer,
  add column if not exists employee_count integer,
  add column if not exists map_url text,
  add column if not exists products jsonb not null default '[]'::jsonb,
  add column if not exists gallery jsonb not null default '[]'::jsonb;

alter table public.businesses drop constraint if exists businesses_listing_type_check;
alter table public.businesses add constraint businesses_listing_type_check
  check (listing_type in ('business', 'startup'));

alter table public.businesses drop constraint if exists businesses_established_year_check;
alter table public.businesses add constraint businesses_established_year_check
  check (established_year is null or established_year between 1800 and 2100);

alter table public.businesses drop constraint if exists businesses_employee_count_check;
alter table public.businesses add constraint businesses_employee_count_check
  check (employee_count is null or employee_count between 0 and 10000000);

create index if not exists idx_biz_published_listing_type
  on public.businesses(listing_type, created_at desc)
  where status = 'published' and listing_fee_paid = true;
