-- One-time ₹2 signup fee. Apply to an existing Supabase project before deploying.
-- Listings remain free; signup_payments is the account approval source of truth,
-- while the payments row makes the transaction visible in the existing admin ledger.
alter table public.signup_payments add column if not exists amount_minor integer not null default 200;
alter table public.signup_payments add column if not exists status text not null default 'created';
alter table public.payments drop constraint if exists payments_payment_type_check;
alter table public.payments add constraint payments_payment_type_check
  check (payment_type in ('membership_plan','business_listing','signup_fee'));
create index if not exists idx_signup_payments_user_status on public.signup_payments(user_id, status);
notify pgrst, 'reload schema';
