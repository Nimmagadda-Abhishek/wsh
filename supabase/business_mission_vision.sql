alter table public.businesses
  add column if not exists mission text,
  add column if not exists vision text;
