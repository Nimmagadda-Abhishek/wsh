-- Adds member categories for public founder/investor directories.
alter table public.profiles add column if not exists member_type text
  check (member_type in ('founder','business','investor','mentor','student','professional'));
create index if not exists idx_profiles_directory on public.profiles(member_type, approval_status, created_at desc) where member_type is not null;

-- Recover categories where existing auth metadata still contains them. Existing
-- business owners can be classified from their existing profile role. Other
-- legacy user accounts are left unset because their original signup choice was
-- not saved and cannot be inferred safely.
update public.profiles p
set member_type = case
  when p.role = 'business_owner' then 'business'
  when u.raw_user_meta_data->>'member_type' in ('founder','business','investor','mentor','student','professional') then u.raw_user_meta_data->>'member_type'
  else p.member_type
end
from auth.users u
where u.id = p.id and (p.role = 'business_owner' or p.member_type is null);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  signup_member_type text := new.raw_user_meta_data->>'member_type';
begin
  if signup_member_type not in ('founder','business','investor','mentor','student','professional') then
    signup_member_type := null;
  end if;
  insert into public.profiles (id, email, full_name, phone, role, member_type, approval_status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone',
    case when signup_member_type = 'business' then 'business_owner' else 'user' end,
    signup_member_type,
    'pending'
  );
  return new;
end $$;
