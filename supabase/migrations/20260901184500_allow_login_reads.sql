-- ============================================================
-- Allow anonymous login page to read project information
-- ============================================================

create policy "projects_read_public"
on public.projects
for select
to anon
using (true);

create policy "profiles_read_public"
on public.profiles
for select
to anon
using (true);