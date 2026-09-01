insert into public.project_member_directory (
    project_id,
    member_id,
    full_name,
    email,
    project_role
)
select
    2,
    d.member_id,
    d.full_name,
    d.email,
    case
        when d.member_id = 'P3' then 'PI'
        else 'team'
    end
from public.project_member_directory d
where d.project_id = 1
on conflict (project_id, member_id)
do update set
    full_name = excluded.full_name,
    email = excluded.email,
    project_role = excluded.project_role;