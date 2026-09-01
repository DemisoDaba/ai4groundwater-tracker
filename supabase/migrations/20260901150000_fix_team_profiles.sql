-- ============================================================
-- AI4Groundwater
-- FIX TEAM MEMBER DIRECTORY
-- ============================================================

-- Make sure profiles has the required structure
alter table public.profiles
add column if not exists member_id text;

alter table public.profiles
add column if not exists full_name text;

alter table public.profiles
add column if not exists email text;

alter table public.profiles
add column if not exists role text default 'team';

-- ============================================================
-- IMPORTANT
--
-- We CANNOT create fake auth.users records here.
--
-- Profiles.id references auth.users(id).
--
-- Therefore:
--   - people who already registered get their real auth ID
--   - people who have not registered yet are NOT inserted
--     into profiles
--
-- The application should therefore use a fixed project
-- member directory for assignment instead of depending on
-- profiles for the dropdown.
-- ============================================================

-- Make sure existing registered members have correct information.
update public.profiles
set
    full_name = case member_id
        when 'P1' then 'Demiso Daba (M.Sc) - (PI)'
        when 'P1*' then 'Mikiyas Ali'
        when 'P2' then 'Zelalem Anley (M.Sc)'
        when 'P3' then 'Mullusew Bezabih (M.Sc)'
        when 'P4' then 'Sintayehu Yadete (Ph.D.)'
        when 'P5' then 'Meron Mohammed (M.Sc)'
        when 'P6' then 'Getachew Enssa (M.Sc)'
        when 'P7' then 'Sufiyan Abdurhman (M.Sc)'
        when 'P8' then 'Aschalewu Cherie (Ph.D.)'
        when 'P9' then 'Tafese Fitensa (M.Sc)'
        when 'P10' then 'Kinfe Bereda (M.Sc)'
        when 'P11' then 'Babur Tesfaye (M.Sc)'
        else full_name
    end,
    email = case member_id
        when 'P1' then 'demisod390@gmail.com'
        when 'P1*' then 'mikiasali333@gmail.com'
        when 'P2' then 'zelalemanley3@gmail.com'
        when 'P3' then 'bmullusew@gmail.com'
        when 'P4' then 'sintayadete5@gmail.com'
        when 'P5' then 'meronamin23@gmail.com'
        when 'P6' then 'getachew.enssa12@gmail.com'
        when 'P7' then 'sufi.abdi@gmail.com'
        when 'P8' then 'aschalewc@gmail.com'
        when 'P9' then 'tatiyihun@gmail.com'
        when 'P10' then 'kinfem110@gmail.com'
        when 'P11' then 'baburtesfaye@gmail.com'
        else email
    end,
    role = case
        when member_id = 'P1' then 'admin'
        else 'team'
    end
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

-- ============================================================
-- TASK INDEX
-- ============================================================

create index if not exists tasks_member_id_idx
on public.tasks(member_id);

create index if not exists tasks_created_at_idx
on public.tasks(created_at desc);