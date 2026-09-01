-- ============================================================
-- Allow Denied as a task payment status
-- ============================================================

alter table public.tasks
drop constraint if exists tasks_payment_status_check;

alter table public.tasks
add constraint tasks_payment_status_check
check (payment_status in ('Pending', 'Paid', 'Denied'));