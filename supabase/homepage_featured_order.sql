-- Persist the admin-selected ordering for homepage businesses and startups.
create table if not exists public.app_settings (
  setting_key text primary key,
  setting_value text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;
grant select, insert, update on public.app_settings to service_role;

insert into public.app_settings (setting_key, setting_value)
values ('homepage_featured_order', 'latest')
on conflict (setting_key) do nothing;
