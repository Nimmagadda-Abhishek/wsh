-- Paid memberships required before a business or startup can be published.
alter table public.subscriptions
  add column if not exists razorpay_subscription_id text unique;

create table if not exists public.account_memberships (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  status text not null default 'active' check (status in ('active','expired','cancelled')),
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null,
  razorpay_subscription_id text unique,
  created_at timestamptz not null default now()
);
alter table public.account_memberships enable row level security;
create policy "own account membership" on public.account_memberships for select using (auth.uid() = user_id);

insert into public.plans (code, name, description, price_minor, currency, interval, features, is_active, sort_order)
values
  ('member_monthly', 'WS Hub Monthly Membership', '₹3,100 first payment, then ₹299 monthly autopay', 310000, 'INR', 'month',
   '{"max_services":50,"featured":false,"analytics":true,"monthly_recurring_minor":29900,"first_payment_minor":310000}', true, 4),
  ('member_yearly', 'WS Hub Yearly Membership', '₹5,200 auto-renewing each year', 520000, 'INR', 'year',
   '{"max_services":50,"featured":false,"analytics":true,"yearly_recurring_minor":520000}', true, 5)
on conflict (code) do update set
  name = excluded.name, description = excluded.description, price_minor = excluded.price_minor,
  currency = excluded.currency, interval = excluded.interval, features = excluded.features,
  is_active = excluded.is_active, sort_order = excluded.sort_order;

-- Carry forward any currently active listing memberships as account memberships.
insert into public.account_memberships (user_id, plan_id, status, current_period_start, current_period_end, razorpay_subscription_id)
select distinct on (s.user_id) s.user_id, s.plan_id, s.status, s.current_period_start, s.current_period_end, s.razorpay_subscription_id
from public.subscriptions s join public.plans p on p.id = s.plan_id
where p.code in ('member_monthly', 'member_yearly') and s.status = 'active' and s.current_period_end > now()
order by s.user_id, s.current_period_end desc
on conflict (user_id) do update set plan_id = excluded.plan_id, status = excluded.status,
  current_period_start = excluded.current_period_start, current_period_end = excluded.current_period_end,
  razorpay_subscription_id = excluded.razorpay_subscription_id;

-- Require existing public listings to have a paid membership too.
update public.businesses b set status = 'draft'
where b.status = 'published' and not exists (
  select 1 from public.account_memberships m
  where m.user_id = b.owner_id and m.status = 'active' and m.current_period_end > now()
);

create or replace function public.expire_subscriptions() returns void language plpgsql as $$
begin
  update public.businesses set status = 'draft', listing_fee_paid = false
  where owner_id in (select user_id from public.account_memberships where status = 'active' and current_period_end < now());
  update public.businesses set plan_code = 'free', is_featured = false
  where owner_id in (select user_id from public.account_memberships where status = 'active' and current_period_end < now());
  update public.account_memberships set status = 'expired' where status = 'active' and current_period_end < now();
  update public.businesses set status = 'draft', listing_fee_paid = false
  where id in (
    select s.business_id from public.subscriptions s
    join public.plans p on p.id = s.plan_id
    where s.status = 'active' and s.current_period_end < now()
      and p.code in ('member_monthly', 'member_yearly')
  );
  update public.businesses set plan_code = 'free', is_featured = false
  where id in (select business_id from public.subscriptions where status = 'active' and current_period_end < now());
  update public.subscriptions set status = 'expired'
  where status = 'active' and current_period_end < now();
end;
$$;
