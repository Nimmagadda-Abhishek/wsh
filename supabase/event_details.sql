-- Rich event information collected by the event creator form.
alter table public.events
  add column if not exists format text not null default 'In-Person'
    check (format in ('In-Person', 'Online', 'Hybrid')),
  add column if not exists languages text[] not null default array['English']::text[],
  add column if not exists learning_outcomes jsonb not null default '[]'::jsonb,
  add column if not exists audience jsonb not null default '[]'::jsonb,
  add column if not exists requirements jsonb not null default '[]'::jsonb,
  add column if not exists agenda jsonb not null default '[]'::jsonb,
  add column if not exists speakers jsonb not null default '[]'::jsonb,
  add column if not exists sponsors jsonb not null default '[]'::jsonb,
  add column if not exists venue_details jsonb not null default '{}'::jsonb,
  add column if not exists gallery jsonb not null default '[]'::jsonb;
