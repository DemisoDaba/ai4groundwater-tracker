-- Make member_id unique
create unique index if not exists profiles_member_id_unique
on public.profiles (member_id);