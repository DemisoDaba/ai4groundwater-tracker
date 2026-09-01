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
