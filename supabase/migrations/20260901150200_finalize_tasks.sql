-- ============================================================
-- AI4Groundwater
-- FINAL TASK SYSTEM FIX
-- ============================================================

-- The existing database has an old BIGINT team_member_id column.
-- The application uses TEXT member_id such as P1, P1*, P2 ... P11.
-- We keep the old column untouched and use member_id exclusively.


-- ============================================================
-- 1. REQUIRED TASK COLUMNS
-- ============================================================

alter table public.tasks
add column if not exists member_id text;

alter table public.tasks
add column if not exists task text;

alter table public.tasks
add column if not exists start_date date;

alter table public.tasks
add column if not exists end_date date;

alter table public.tasks
add column if not exists task_status text;

alter table public.tasks
add column if not exists payment_status text;

alter table public.tasks
add column if not exists submitted_at timestamptz;

alter table public.tasks
add column if not exists created_at timestamptz;


-- ============================================================
-- 2. DEFAULTS
-- ============================================================

alter table public.tasks
alter column task_status set default 'Pending';

alter table public.tasks
alter column payment_status set default 'Pending';

alter table public.tasks
alter column created_at set default now();


-- ============================================================
-- 3. FIX OLD STATUS CONSTRAINT
-- ============================================================

alter table public.tasks
drop constraint if exists tasks_task_status_check;

alter table public.tasks
add constraint tasks_task_status_check
check (
    task_status in (
        'Pending',
        'In Progress',
        'Pending Review',
        'Completed',
        'Reassigned'
    )
);


-- ============================================================
-- 4. PAYMENT STATUS
-- ============================================================

alter table public.tasks
drop constraint if exists tasks_payment_status_check;

alter table public.tasks
add constraint tasks_payment_status_check
check (
    payment_status in (
        'Pending',
        'Paid'
    )
);


-- ============================================================
-- 5. REMOVE NOT NULL FROM OLD BIGINT COLUMN
-- ============================================================

alter table public.tasks
alter column team_member_id drop not null;


-- ============================================================
-- 6. MEMBER ID
-- ============================================================

-- Existing rows may have no member_id.
-- Do NOT try to copy BIGINT team_member_id into TEXT member_id.
-- New assignments will use member_id directly.


-- ============================================================
-- 7. INDEX
-- ============================================================

create index if not exists tasks_member_id_idx
on public.tasks(member_id);

create index if not exists tasks_created_at_idx
on public.tasks(created_at desc);


-- ============================================================
-- 8. RLS
-- ============================================================

alter table public.tasks enable row level security;

alter table public.profiles enable row level security;


-- ============================================================
-- 9. REMOVE OLD TASK POLICIES
-- ============================================================

drop policy if exists "tasks_read" on public.tasks;
drop policy if exists "tasks_insert" on public.tasks;
drop policy if exists "tasks_update" on public.tasks;

drop policy if exists "tasks_select_policy" on public.tasks;
drop policy if exists "tasks_admin_insert_policy" on public.tasks;
drop policy if exists "tasks_admin_update_policy" on public.tasks;
drop policy if exists "tasks_member_update_policy" on public.tasks;


-- ============================================================
-- 10. TASK SELECT
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
-- 11. ADMIN INSERT
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
-- 12. ADMIN UPDATE
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
-- 13. TEAM MEMBER UPDATE
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
-- 14. PROFILE SELECT
-- ============================================================

drop policy if exists "profiles_read" on public.profiles;
drop policy if exists "profiles_select_policy" on public.profiles;

create policy "profiles_select_policy"
on public.profiles
for select
to authenticated
using (true);


-- ============================================================
-- 15. GRANTS
-- ============================================================

grant select on public.tasks to authenticated;
grant insert on public.tasks to authenticated;
grant update on public.tasks to authenticated;

grant select on public.profiles to authenticated;
