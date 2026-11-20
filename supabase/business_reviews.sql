-- Apply in Supabase Dashboard > SQL Editor for projects created before reviews were added.
begin;

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_reviews_business_user_unique
  on public.reviews(business_id, user_id);
create index if not exists idx_reviews_business_created
  on public.reviews(business_id, created_at desc);

alter table public.reviews enable row level security;

create or replace function public.refresh_business_rating() returns trigger language plpgsql as $$
declare bid uuid := coalesce(new.business_id, old.business_id);
begin
  update public.businesses set
    avg_rating = coalesce((select round(avg(rating)::numeric, 2) from public.reviews where business_id = bid), 0),
    review_count = (select count(*) from public.reviews where business_id = bid)
  where id = bid;
  return null;
end $$;

drop trigger if exists trg_reviews_updated on public.reviews;
create trigger trg_reviews_updated before update on public.reviews
for each row execute function public.set_updated_at();

drop trigger if exists trg_reviews_rating on public.reviews;
create trigger trg_reviews_rating after insert or update or delete on public.reviews
for each row execute function public.refresh_business_rating();

notify pgrst, 'reload schema';
commit;
