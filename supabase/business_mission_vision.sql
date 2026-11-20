-- Apply in Supabase Dashboard > SQL Editor for an existing project.
begin;
alter table public.businesses
  add column if not exists mission text,
  add column if not exists vision text;
notify pgrst, 'reload schema';
commit;
