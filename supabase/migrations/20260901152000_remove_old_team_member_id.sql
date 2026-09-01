-- ============================================================
-- AI4Groundwater
-- FINAL CLEANUP
--
-- member_id is the ONLY task assignment identifier.
-- Examples:
-- P1*, P2, P3 ... P11
-- ============================================================


-- ============================================================
-- 1. REMOVE EVERY OLD POLICY THAT MAY REFERENCE
--    team_member_id
-- ============================================================

drop policy if exists "Team members view own tasks" on public.tasks;

drop policy if exists "Team members submit own tasks" on public.tasks;

drop policy if exists "Members can view own tasks" on public.tasks;

drop policy if exists "Members can submit own tasks" on public.tasks;

drop policy if exists "tasks_select_policy" on public.tasks;

drop policy if exists "tasks_admin_insert_policy" on public.tasks;

drop policy if exists "tasks_admin_update_policy" on public.tasks;

drop policy if exists "tasks_member_update_policy" on public.tasks;


-- ============================================================
-- 2. REMOVE OLD team_member_id COLUMN
-- ============================================================

alter table public.tasks
drop column if exists team_member_id;


-- ============================================================
-- 3. MAKE member_id THE CANONICAL ASSIGNMENT COLUMN
-- ============================================================

alter table public.tasks
alter column member_id set not null;


-- ============================================================
-- 4. TASK SELECT POLICY
--
-- ADMIN:
--   Can see all tasks.
--
-- TEAM:
--   Can see only tasks assigned to their member_id.
-- ============================================================

create policy "tasks_select_policy"
on public.tasks
for select
to authenticated
using (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
    )
    or
    member_id = (
        select p.member_id
        from public.profiles p
        where p.id = auth.uid()
    )
);


-- ============================================================
-- 5. ADMIN INSERT
-- ============================================================

create policy "tasks_admin_insert_policy"
on public.tasks
for insert
to authenticated
with check (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
    )
);


-- ============================================================
-- 6. ADMIN UPDATE
-- ============================================================

create policy "tasks_admin_update_policy"
on public.tasks
for update
to authenticated
using (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
    )
)
with check (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
    )
);


-- ============================================================
-- 7. TEAM MEMBER UPDATE
--
-- A team member can update only their own tasks.
-- ============================================================

create policy "tasks_member_update_policy"
on public.tasks
for update
to authenticated
using (
    member_id = (
        select p.member_id
        from public.profiles p
        where p.id = auth.uid()
    )
)
with check (
    member_id = (
        select p.member_id
        from public.profiles p
        where p.id = auth.uid()
    )
);


-- ============================================================
-- 8. PROFILE READ
-- ============================================================

drop policy if exists "profiles_read" on public.profiles;

drop policy if exists "profiles_select_policy" on public.profiles;

create policy "profiles_select_policy"
on public.profiles
for select
to authenticated
using (true);


-- ============================================================
-- 9. PRIVILEGES
-- ============================================================

grant select on public.tasks to authenticated;
grant insert on public.tasks to authenticated;
grant update on public.tasks to authenticated;

grant select on public.profiles to authenticated;


-- ============================================================
-- 10. INDEX
-- ============================================================

create index if not exists tasks_member_id_idx
on public.tasks(member_id);

create index if not exists tasks_created_at_idx
on public.tasks(created_at desc);
