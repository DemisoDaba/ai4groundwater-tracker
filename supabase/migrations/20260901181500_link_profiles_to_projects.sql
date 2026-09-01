-- ============================================================
-- Link team members to projects
-- ============================================================

alter table public.profiles
add column if not exists project_id bigint;

-- Link the existing team to Project 01
update public.profiles
set project_id = (
    select id
    from public.projects
    where project_code = '01'
)
where member_id in (
    'P1',
    'P1*',
    'P2',
    'P3',
    'P4',
    'P5',
    'P6',
    'P7',
    'P8',
    'P9',
    'P10',
    'P11'
);

-- Connect project_id to projects
do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'profiles_project_id_fkey'
    ) then
        alter table public.profiles
        add constraint profiles_project_id_fkey
        foreign key (project_id)
        references public.projects(id)
        on delete restrict;
    end if;
end $$;

create index if not exists profiles_project_id_idx
on public.profiles(project_id);