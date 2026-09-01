-- ============================================================
-- PROJECT-LEVEL ADMIN
-- Project 01 -> Demiso Daba
-- Project 02 -> Mullusew Bezabih
-- ============================================================

alter table public.project_member_directory
add column if not exists is_project_admin boolean
not null default false;

-- Reset project-admin flags first
update public.project_member_directory
set is_project_admin = false;

-- Project 01 admin: P1 Demiso Daba
update public.project_member_directory
set is_project_admin = true
where project_id = 1
  and member_id = 'P1';

-- Project 02 admin: P3 Mullusew Bezabih
update public.project_member_directory
set is_project_admin = true
where project_id = 2
  and member_id = 'P3';