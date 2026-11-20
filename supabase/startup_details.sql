-- Store the public startup profile details used by /startups/:slug.
alter table public.businesses
  add column if not exists startup_details jsonb not null default '{}'::jsonb;

notify pgrst, 'reload schema';
