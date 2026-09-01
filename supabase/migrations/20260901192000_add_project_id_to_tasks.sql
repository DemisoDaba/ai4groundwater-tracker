-- ============================================================
-- ADD PROJECT ID TO TASKS
-- Existing tasks are assigned to Project 01
-- ============================================================

alter table public.tasks
add column if not exists project_id bigint
references public.projects(id)
on delete cascade;

-- Existing tasks belong to Project 01
update public.tasks
set project_id = 1
where project_id is null;

-- Every task must belong to a project
alter table public.tasks
alter column project_id set not null;

-- Index for project-based task queries
create index if not exists idx_tasks_project_id
on public.tasks(project_id);