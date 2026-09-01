-- ============================================================
-- AI4Groundwater
-- Team member seed data
--
-- IMPORTANT:
-- profiles.id references auth.users.id.
-- Therefore, Auth users must be created first.
-- This migration only creates/updates profile records
-- for users that already exist in auth.users.
-- ============================================================

INSERT INTO public.profiles
    (id, member_id, full_name, email, role)

SELECT
    u.id,
    v.member_id,
    v.full_name,
    v.email,
    v.role
FROM (
    VALUES
        ('P1',  'Demiso Daba (M.Sc) - (PI)', 'demisod390@gmail.com', 'admin'),
        ('P1*', 'Mikiyas Ali',                 'mikiasali333@gmail.com', 'team'),
        ('P2',  'Zelalem Anley (M.Sc)',        'zelalemanley3@gmail.com', 'team'),
        ('P3',  'Mullusew Bezabih (M.Sc)',     'bmullusew@gmail.com', 'team'),
        ('P4',  'Sintayehu Yadete (Ph.D.)',    'sintayadete5@gmail.com', 'team'),
        ('P5',  'Meron Mohammed (M.Sc)',       'meronamin23@gmail.com', 'team'),
        ('P6',  'Getachew Enssa (M.Sc)',       'getachew.enssa12@gmail.com', 'team'),
        ('P7',  'Sufiyan Abdurhman (M.Sc)',    'sufi.abdi@gmail.com', 'team'),
        ('P8',  'Aschalewu Cherie (Ph.D.)',    'aschalewc@gmail.com', 'team'),
        ('P9',  'Tafese Fitensa (M.Sc)',       'tatiyihun@gmail.com', 'team'),
        ('P10', 'Kinfe Bereda (M.Sc)',         'kinfem110@gmail.com', 'team'),
        ('P11', 'Babur Tesfaye (M.Sc)',        'baburtesfaye@gmail.com', 'team')
) AS v(member_id, full_name, email, role)
JOIN auth.users u
    ON lower(u.email) = lower(v.email)

ON CONFLICT (id)
DO UPDATE SET
    member_id = EXCLUDED.member_id,
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    role = EXCLUDED.role;