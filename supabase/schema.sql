-- =====================================================================
-- WS Portal – Supabase schema. Run in: Supabase Dashboard > SQL Editor
-- =====================================================================
create extension if not exists pg_trgm;

-- ---------- helpers ----------
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- profiles (1:1 with auth.users) ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null default '',
  username text unique check (username ~ '^[a-z0-9_]{3,30}$'),
  avatar_url text,
  social_links jsonb not null default '{}'::jsonb,
  bio text,
  phone text,
  city text,
  country text,
  role text not null default 'user' check (role in ('user','business_owner','admin')),
  member_type text check (member_type in ('founder','business','investor','mentor','student','professional')),
  approval_status text not null default 'approved' check (approval_status in ('pending','approved','rejected')),
  approval_note text,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_profiles_directory on public.profiles(member_type, approval_status, created_at desc) where member_type is not null;
create trigger trg_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

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
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
create index idx_profiles_approval_created on public.profiles(approval_status, created_at desc);

-- ---------- account joining fee ----------
create table public.signup_payments (
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
-- No client policies: only the service-role API may read or write joining-fee records.

-- ---------- categories ----------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  icon text,
  sort_order int not null default 0
);

-- ---------- plans ----------
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  price_minor int not null default 0,          -- smallest currency unit (paise)
  currency text not null default 'INR',
  interval text not null default 'month' check (interval in ('month','year')),
  features jsonb not null default '{}',
  is_active boolean not null default true,
  sort_order int not null default 0
);

-- ---------- businesses ----------
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  mission text,
  vision text,
  logo_url text,
  cover_url text,
  map_url text,
  listing_type text not null default 'business' check (listing_type in ('business','startup')),
  established_year int check (established_year is null or established_year between 1800 and 2100),
  employee_count int check (employee_count is null or employee_count between 0 and 10000000),
  products jsonb not null default '[]'::jsonb,
  gallery jsonb not null default '[]'::jsonb,
  email text,
  phone text,
  website text,
  address text,
  city text,
  state text,
  country text,
  postal_code text,
  latitude double precision,
  longitude double precision,
  hours jsonb not null default '{}',
  social_links jsonb not null default '{}',
  tags text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft','published','suspended')),
  listing_fee_paid boolean not null default false,
  is_verified boolean not null default false,
  is_featured boolean not null default false,
  plan_code text not null default 'free',
  avg_rating numeric(3,2) not null default 0,
  review_count int not null default 0,
  view_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_biz_updated before update on public.businesses for each row execute function public.set_updated_at();
create index idx_biz_status_city on public.businesses(status, city);
create index idx_biz_owner on public.businesses(owner_id);
create index idx_biz_category on public.businesses(category_id);
create index idx_biz_published_listing_type on public.businesses(listing_type, created_at desc) where status = 'published' and listing_fee_paid = true;
create index idx_biz_name_trgm on public.businesses using gin (name gin_trgm_ops);

create table public.business_services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  price numeric(12,2),
  currency text not null default 'INR',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index idx_services_business on public.business_services(business_id);

-- ---------- reviews ----------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, user_id)
);
create trigger trg_reviews_updated before update on public.reviews for each row execute function public.set_updated_at();

create or replace function public.refresh_business_rating() returns trigger language plpgsql as $$
declare bid uuid := coalesce(new.business_id, old.business_id);
begin
  update public.businesses set
    avg_rating = coalesce((select round(avg(rating)::numeric, 2) from public.reviews where business_id = bid), 0),
    review_count = (select count(*) from public.reviews where business_id = bid)
  where id = bid;
  return null;
end $$;
create trigger trg_reviews_rating after insert or update or delete on public.reviews for each row execute function public.refresh_business_rating();

-- ---------- favorites & notifications ----------
create table public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, business_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  data jsonb not null default '{}',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notif_user on public.notifications(user_id, is_read, created_at desc);

-- ---------- payments & subscriptions ----------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  plan_id uuid references public.plans(id) on delete set null,
  payment_type text not null default 'membership_plan' check (payment_type in ('membership_plan','business_listing')),
  razorpay_order_id text unique not null,
  razorpay_payment_id text unique,
  amount int not null,
  currency text not null default 'INR',
  status text not null default 'created' check (status in ('created','paid','failed','refunded')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_payments_user on public.payments(user_id, created_at desc);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  status text not null default 'active' check (status in ('active','expired','cancelled')),
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- functions ----------
create or replace function public.increment_business_views(bid uuid) returns void language sql as $$
  update public.businesses set view_count = view_count + 1 where id = bid and status = 'published';
$$;

-- Schedule with pg_cron (daily) or call from a cron job.
create or replace function public.expire_subscriptions() returns void language plpgsql as $$
begin
  update public.businesses set plan_code = 'free', is_featured = false
  where id in (select business_id from public.subscriptions where status = 'active' and current_period_end < now());
  update public.subscriptions set status = 'expired' where status = 'active' and current_period_end < now();
end $$;

-- ---------- Row Level Security ----------
-- The Node API uses the service-role key (bypasses RLS) and enforces authorization itself.
-- These policies protect the data if the frontend ever talks to Supabase directly.
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.plans enable row level security;
alter table public.businesses enable row level security;
alter table public.business_services enable row level security;
alter table public.reviews enable row level security;
alter table public.favorites enable row level security;
alter table public.notifications enable row level security;
alter table public.payments enable row level security;
alter table public.subscriptions enable row level security;

create policy "own profile" on public.profiles for select using (auth.uid() = id);
create policy "public categories" on public.categories for select using (true);
create policy "public plans" on public.plans for select using (is_active);
create policy "published or own businesses" on public.businesses for select using (status = 'published' or owner_id = auth.uid());
create policy "services of visible businesses" on public.business_services for select using (
  exists (select 1 from public.businesses b where b.id = business_id and (b.status = 'published' or b.owner_id = auth.uid())));
create policy "public reviews" on public.reviews for select using (true);
create policy "own favorites" on public.favorites for select using (auth.uid() = user_id);
create policy "own notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "own payments" on public.payments for select using (auth.uid() = user_id);
create policy "own subscriptions" on public.subscriptions for select using (auth.uid() = user_id);
-- No insert/update/delete policies: all writes go through the API.

-- ---------- storage buckets ----------
insert into storage.buckets (id, name, public) values ('avatars','avatars',true), ('business-media','business-media',true)
on conflict (id) do nothing;

-- ---------- seed data ----------
insert into public.categories (name, slug, icon, sort_order) values
 ('Restaurants & Cafes','restaurants-cafes','utensils',1),
 ('Retail & Shopping','retail-shopping','shopping-bag',2),
 ('Health & Wellness','health-wellness','heart',3),
 ('Education & Training','education-training','book',4),
 ('Professional Services','professional-services','briefcase',5),
 ('Home Services','home-services','home',6),
 ('Technology & IT','technology-it','cpu',7),
 ('Beauty & Salon','beauty-salon','scissors',8),
 ('Automotive','automotive','car',9),
 ('Events & Entertainment','events-entertainment','music',10)
on conflict do nothing;

insert into public.plans (code, name, description, price_minor, interval, features, sort_order) values
 ('free','Free','Get listed on the portal',0,'month','{"max_services":5,"featured":false,"analytics":false}',1),
 ('pro','Pro','More services and analytics',49900,'month','{"max_services":50,"featured":false,"analytics":true}',2),
 ('premium','Premium','Featured placement on the homepage',99900,'month','{"max_services":500,"featured":true,"analytics":true}',3)
on conflict do nothing;

-- To make yourself an admin after signing up:
-- update public.profiles set role = 'admin' where id = '<your-user-uuid>';
