-- Safe upgrade for an existing WS Hub database.
-- Existing accounts remain approved; the auth.users insert trigger marks only new accounts pending.
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists member_type text
  check (member_type in ('founder','business','investor','mentor','student','professional'));
alter table public.profiles add column if not exists approval_status text not null default 'approved'
  check (approval_status in ('pending','approved','rejected'));
alter table public.profiles add column if not exists approval_note text;
alter table public.profiles add column if not exists approved_at timestamptz;
alter table public.profiles add column if not exists approved_by uuid references auth.users(id) on delete set null;

update public.profiles p set email = u.email
from auth.users u where u.id = p.id and p.email is null;

create index if not exists idx_profiles_approval_created
  on public.profiles(approval_status, created_at desc);

create table if not exists public.signup_payments (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  user_id uuid references auth.users(id) on delete set null,
  razorpay_order_id text not null unique,
  razorpay_payment_id text unique,
  amount_minor integer not null check (amount_minor = 200),
  status text not null default 'created' check (status in ('created','paid')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
alter table public.signup_payments enable row level security;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, phone, role, member_type, approval_status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone',
    case when new.raw_user_meta_data->>'member_type' = 'business' then 'business_owner' else 'user' end,
    case when new.raw_user_meta_data->>'member_type' in ('founder','business','investor','mentor','student','professional') then new.raw_user_meta_data->>'member_type' else null end,
    'pending'
  );
  return new;
end $$;
