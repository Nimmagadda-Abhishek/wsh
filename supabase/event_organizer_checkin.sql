-- Organizer registration list and attendance check-in support.
alter table public.event_registrations
  add column if not exists checked_in_at timestamptz;

create index if not exists idx_event_registrations_checkin
  on public.event_registrations(event_id, checked_in_at)
  where status = 'confirmed';
