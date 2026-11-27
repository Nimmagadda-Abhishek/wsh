-- Event publishing, registration capacity, paid checkout, and digital tickets.
-- Run in Supabase Dashboard > SQL Editor before enabling the events API.

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 160),
  slug text not null unique,
  description text not null check (char_length(description) between 1 and 10000),
  banner_url text not null,
  start_at timestamptz not null,
  location text not null check (char_length(location) between 2 and 300),
  format text not null default 'In-Person' check (format in ('In-Person','Online','Hybrid')),
  languages text[] not null default array['English']::text[],
  learning_outcomes jsonb not null default '[]'::jsonb,
  audience jsonb not null default '[]'::jsonb,
  requirements jsonb not null default '[]'::jsonb,
  agenda jsonb not null default '[]'::jsonb,
  speakers jsonb not null default '[]'::jsonb,
  sponsors jsonb not null default '[]'::jsonb,
  venue_details jsonb not null default '{}'::jsonb,
  gallery jsonb not null default '[]'::jsonb,
  is_free boolean not null default true,
  registration_fee_minor integer not null default 0 check (registration_fee_minor >= 0),
  ticket_capacity integer not null check (ticket_capacity between 1 and 1000000),
  tickets_sold integer not null default 0 check (tickets_sold >= 0),
  status text not null default 'published' check (status in ('draft','published','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_free_price_check check ((is_free and registration_fee_minor = 0) or (not is_free and registration_fee_minor > 0))
);

create index if not exists idx_events_public_start on public.events(status, start_at asc);
create index if not exists idx_events_host_created on public.events(host_user_id, created_at desc);
drop trigger if exists trg_events_updated on public.events;
create trigger trg_events_updated before update on public.events for each row execute function public.set_updated_at();

create table if not exists public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  attendee_name text not null check (char_length(attendee_name) between 2 and 120),
  attendee_email text not null,
  ticket_code text not null unique,
  amount_minor integer not null default 0 check (amount_minor >= 0),
  status text not null default 'pending' check (status in ('pending','confirmed','payment_review','cancelled','refunded')),
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  checked_in_at timestamptz,
  expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_event_registrations_capacity on public.event_registrations(event_id, status, expires_at);
create index if not exists idx_event_registrations_user on public.event_registrations(user_id, created_at desc);
create unique index if not exists idx_event_registration_one_active_per_user
  on public.event_registrations(event_id, user_id) where status in ('pending','confirmed','payment_review');
drop trigger if exists trg_event_registrations_updated on public.event_registrations;
create trigger trg_event_registrations_updated before update on public.event_registrations for each row execute function public.set_updated_at();

alter table public.events enable row level security;
alter table public.event_registrations enable row level security;
-- No client policies: all event and ticket writes/reads go through the authenticated API.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-banners','event-banners',true,5242880,array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/png','image/jpeg','image/webp','image/gif'];

-- Serialize each event's seat count while reserving a ticket. A paid ticket holds
-- capacity for 15 minutes; free tickets become confirmed immediately.
create or replace function public.reserve_event_ticket(
  p_event_id uuid,
  p_user_id uuid,
  p_attendee_name text,
  p_attendee_email text,
  p_ticket_code text
) returns public.event_registrations
language plpgsql security definer set search_path = public as $$
declare
  ev public.events%rowtype;
  reg public.event_registrations%rowtype;
  occupied bigint;
begin
  select * into ev from public.events where id = p_event_id for update;
  if not found then raise exception 'event_not_found'; end if;
  if ev.status <> 'published' then raise exception 'event_not_available'; end if;
  if ev.start_at <= now() then raise exception 'event_registration_closed'; end if;

  select * into reg from public.event_registrations
    where event_id = p_event_id and user_id = p_user_id
      and (status in ('confirmed','payment_review') or (status = 'pending' and expires_at > now()))
    limit 1 for update;
  if found then return reg; end if;

  update public.event_registrations set status = 'cancelled'
    where event_id = p_event_id and user_id = p_user_id and status = 'pending' and expires_at <= now();

  select count(*) into occupied from public.event_registrations
    where event_id = p_event_id and (status in ('confirmed','payment_review') or (status = 'pending' and expires_at > now()));
  if occupied >= ev.ticket_capacity then raise exception 'event_sold_out'; end if;

  insert into public.event_registrations (
    event_id, user_id, attendee_name, attendee_email, ticket_code, amount_minor, status, expires_at, paid_at
  ) values (
    p_event_id, p_user_id, p_attendee_name, lower(p_attendee_email), p_ticket_code,
    ev.registration_fee_minor,
    case when ev.is_free then 'confirmed' else 'pending' end,
    case when ev.is_free then null else now() + interval '15 minutes' end,
    case when ev.is_free then now() else null end
  ) returning * into reg;

  if ev.is_free then
    update public.events set tickets_sold = tickets_sold + 1 where id = p_event_id;
  end if;
  return reg;
end $$;

-- A successful gateway payment confirms the held seat once. If the hold expired
-- and capacity was resold, keep the captured payment in review instead of
-- overselling; the organizer can reconcile/refund it.
create or replace function public.confirm_event_ticket(
  p_registration_id uuid,
  p_order_id text,
  p_payment_id text
) returns public.event_registrations
language plpgsql security definer set search_path = public as $$
declare
  reg public.event_registrations%rowtype;
  ev public.events%rowtype;
  occupied bigint;
begin
  select * into reg from public.event_registrations where id = p_registration_id for update;
  if not found then raise exception 'registration_not_found'; end if;
  if reg.razorpay_order_id is distinct from p_order_id then raise exception 'order_mismatch'; end if;
  if reg.status in ('confirmed','payment_review') then return reg; end if;
  if reg.status not in ('pending','cancelled') then raise exception 'registration_not_pending'; end if;

  select * into ev from public.events where id = reg.event_id for update;
  select count(*) into occupied from public.event_registrations
    where event_id = reg.event_id and id <> reg.id
      and (status in ('confirmed','payment_review') or (status = 'pending' and expires_at > now()));

  if occupied >= ev.ticket_capacity then
    update public.event_registrations set status = 'payment_review', razorpay_payment_id = p_payment_id,
      paid_at = now(), expires_at = null where id = reg.id returning * into reg;
    return reg;
  end if;

  update public.event_registrations set status = 'confirmed', razorpay_payment_id = p_payment_id,
    paid_at = now(), expires_at = null where id = reg.id returning * into reg;
  update public.events set tickets_sold = tickets_sold + 1 where id = reg.event_id;
  return reg;
end $$;

revoke all on function public.reserve_event_ticket(uuid,uuid,text,text,text) from public, anon, authenticated;
revoke all on function public.confirm_event_ticket(uuid,text,text) from public, anon, authenticated;
grant execute on function public.reserve_event_ticket(uuid,uuid,text,text,text) to service_role;
grant execute on function public.confirm_event_ticket(uuid,text,text) to service_role;
