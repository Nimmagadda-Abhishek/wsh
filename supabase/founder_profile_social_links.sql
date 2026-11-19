-- Public profile links used by approved founder, business, investor and mentor pages.
alter table public.profiles
  add column if not exists social_links jsonb not null default '{}'::jsonb;
