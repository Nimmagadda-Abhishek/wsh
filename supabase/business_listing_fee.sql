-- Require a confirmed one-time INR 2 listing fee before a business can publish.
alter table public.businesses
  add column if not exists listing_fee_paid boolean not null default false;

-- Preserve listings that were already public before this fee gate was introduced.
update public.businesses set listing_fee_paid = true where status = 'published' and listing_fee_paid = false;

alter table public.payments
  add column if not exists payment_type text not null default 'membership_plan';

alter table public.payments drop constraint if exists payments_payment_type_check;
alter table public.payments add constraint payments_payment_type_check
  check (payment_type in ('membership_plan','business_listing'));

create index if not exists idx_payments_type_status on public.payments(payment_type, status, created_at desc);
