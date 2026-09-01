-- ============================================================
-- PROJECT-LEVEL ROW LEVEL SECURITY
-- Project 01: Demiso (P1) admin
-- Project 02: Mullusew (P3) admin
-- ============================================================


-- ------------------------------------------------------------
-- 1. Helper: check whether the logged-in user is a member
--    of a specific project
-- ------------------------------------------------------------

create or replace function public.is_project_member(target_project_id bigint)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select exists (
        select 1
        from public.project_member_directory d
        join public.profiles p
          on p.member_id = d.member_id
        where d.project_id = target_project_id
          and p.id = auth.uid()
    );
$$;


-- ------------------------------------------------------------
-- 2. Helper: check whether the logged-in user is a project admin
-- ------------------------------------------------------------

create or replace function public.is_project_admin(target_project_id bigint)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select exists (
        select 1
        from public.project_member_directory d
        join public.profiles p
          on p.member_id = d.member_id
        where d.project_id = target_project_id
          and d.is_project_admin = true
          and p.id = auth.uid()
    );
$$;


-- ------------------------------------------------------------
-- 3. TASKS
-- ------------------------------------------------------------

alter table public.tasks enable row level security;


-- Remove old task policies if they exist
drop policy if exists "Authenticated users can view tasks"
    on public.tasks;

drop policy if exists "Users can view tasks"
    on public.tasks;

drop policy if exists "Admins can create tasks"
    on public.tasks;

drop policy if exists "Admins can update tasks"
    on public.tasks;

drop policy if exists "Admins can delete tasks"
    on public.tasks;


-- Members can only see tasks belonging to their projects
create policy "Project members can view project tasks"
on public.tasks
for select
to authenticated
using (
    public.is_project_member(project_id)
);


-- Only project admins can create tasks in their own project
create policy "Project admins can create project tasks"
on public.tasks
for insert
to authenticated
with check (
    public.is_project_admin(project_id)
);


-- Only project admins can update tasks in their own project
create policy "Project admins can update project tasks"
on public.tasks
for update
to authenticated
using (
    public.is_project_admin(project_id)
)
with check (
    public.is_project_admin(project_id)
);


-- Only project admins can delete tasks in their own project
create policy "Project admins can delete project tasks"
on public.tasks
for delete
to authenticated
using (
    public.is_project_admin(project_id)
);


-- ------------------------------------------------------------
-- 4. PROJECT MEMBER DIRECTORY
-- ------------------------------------------------------------

alter table public.project_member_directory
enable row level security;


drop policy if exists "Anyone can view project member directory"
    on public.project_member_directory;

drop policy if exists "Anon can view project member directory"
    on public.project_member_directory;

drop policy if exists "Authenticated users can view project member directory"
    on public.project_member_directory;


-- Keep this readable because Login/Register needs to find
-- members who have not registered yet.
create policy "Anyone can view project member directory"
on public.project_member_directory
for select
to anon, authenticated
using (true);


-- ------------------------------------------------------------
-- 5. PROJECTS
-- ------------------------------------------------------------

alter table public.projects enable row level security;


drop policy if exists "Anyone can view projects"
    on public.projects;

drop policy if exists "Anon can view projects"
    on public.projects;

drop policy if exists "Authenticated users can view projects"
    on public.projects;


-- Login/Register needs to see available projects
create policy "Anyone can view projects"
on public.projects
for select
to anon, authenticated
using (true);


-- ------------------------------------------------------------
-- 6. PROJECT MEMBERS (legacy table)
-- ------------------------------------------------------------

alter table public.project_members enable row level security;


drop policy if exists "Anyone can view project members"
    on public.project_members;

drop policy if exists "Authenticated users can view project members"
    on public.project_members;

drop policy if exists "Anon can view project members"
    on public.project_members;


-- Keep readable for the existing login verification flow
create policy "Anyone can view project members"
on public.project_members
for select
to anon, authenticated
using (true);