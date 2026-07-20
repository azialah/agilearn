-- seed.sql — LOCAL DEVELOPMENT ONLY.
--
-- This inserts directly into auth.users, which is only appropriate against a
-- local Supabase stack (`supabase db reset` / `supabase start`). Never run it
-- against a hosted project — create real users through the dashboard/API there.
--
-- Password for every seeded account is: password123
--
-- Seeds: 1 admin + 2 teachers, 2 classrooms (~15 students each), Prelim/Midterm/
-- Final periods, Quizzes/Exams categories for both components, activities with
-- scores, and 5 attendance sessions with records.

-- Deterministic identifiers so re-seeding is stable.
-- admin  : 00000000-0000-0000-0000-000000000001
-- teacher: 00000000-0000-0000-0000-000000000002
-- teacher: 00000000-0000-0000-0000-000000000003

-- Allowlisted sign-up domains. Must exist before the auth.users inserts below,
-- since the on_auth_user_created trigger now rejects unlisted domains.
-- 'school.edu' is here so you can walk the /signup wizard locally.
insert into public.allowed_email_domains (domain)
values ('agilearn.dev'), ('school.edu')
on conflict (domain) do nothing;

insert into auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000',
   '00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
   'admin@agilearn.dev', crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Ada Admin"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000',
   '00000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated',
   'teacher.a@agilearn.dev', crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Tom Teacher"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000',
   '00000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated',
   'teacher.b@agilearn.dev', crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Bea Teacher"}', now(), now())
on conflict (id) do nothing;

-- The on_auth_user_created trigger has already created matching profiles.
-- Promote the admin and make sure names are populated.
update public.profiles
  set role = 'admin', full_name = 'Ada Admin'
  where id = '00000000-0000-0000-0000-000000000001';
update public.profiles
  set full_name = 'Tom Teacher'
  where id = '00000000-0000-0000-0000-000000000002';
update public.profiles
  set full_name = 'Bea Teacher'
  where id = '00000000-0000-0000-0000-000000000003';

-- Classrooms + full gradebook, built procedurally.
do $$
declare
  v_owner uuid;
  v_classroom uuid;
  v_class_defs jsonb := '[
    {"owner":"00000000-0000-0000-0000-000000000002",
     "name":"Introduction to Computing","code":"CS101","year":"1","block":"A"},
    {"owner":"00000000-0000-0000-0000-000000000003",
     "name":"Data Structures","code":"CS201","year":"2","block":"B"}
  ]'::jsonb;
  v_def jsonb;
  v_period record;
  v_category record;
  v_activity uuid;
  v_student uuid;
  v_session uuid;
  v_period_id uuid;
  v_category_id uuid;
  i int;
  s int;
  v_periods text[] := array['Prelim', 'Midterm', 'Final'];
  v_status public.attendance_status;
begin
  for v_def in select * from jsonb_array_elements(v_class_defs) loop
    v_owner := (v_def ->> 'owner')::uuid;

    insert into public.classrooms
      (owner_id, course_name, course_code, year, block)
    values
      (v_owner, v_def ->> 'name', v_def ->> 'code', v_def ->> 'year',
       v_def ->> 'block')
    returning id into v_classroom;

    -- 15 students
    for i in 1..15 loop
      insert into public.students
        (classroom_id, student_no, last_name, first_name, middle_initial)
      values
        (v_classroom,
         (v_def ->> 'code') || '-' || lpad(i::text, 3, '0'),
         'Last' || i, 'First' || i, chr(65 + (i % 26)));
    end loop;

    -- grading periods
    for i in 1..array_length(v_periods, 1) loop
      insert into public.grading_periods
        (classroom_id, name, weight, position)
      values (v_classroom, v_periods[i], 1.0, i)
      returning id into v_period_id;
    end loop;

    -- categories: Quizzes (0.4) + Exams (0.6) for both components
    for v_category in
      select * from (values
        ('lecture'::public.grade_component, 'Quizzes', 0.4),
        ('lecture'::public.grade_component, 'Exams', 0.6),
        ('laboratory'::public.grade_component, 'Quizzes', 0.4),
        ('laboratory'::public.grade_component, 'Exams', 0.6)
      ) as t(component, name, weight)
    loop
      insert into public.activity_categories
        (classroom_id, component, name, weight)
      values
        (v_classroom, v_category.component, v_category.name, v_category.weight);
    end loop;

    -- activities: two per (period, category), with scores for every student
    for v_period in
      select id from public.grading_periods where classroom_id = v_classroom
    loop
      for v_category in
        select id from public.activity_categories
        where classroom_id = v_classroom
      loop
        for s in 1..2 loop
          insert into public.activities
            (grading_period_id, category_id, name, max_score, position)
          values
            (v_period.id, v_category.id, 'Activity ' || s, 100, s)
          returning id into v_activity;

          for v_student in
            select id from public.students where classroom_id = v_classroom
          loop
            insert into public.scores (activity_id, student_id, score)
            values (v_activity, v_student, 70 + floor(random() * 31));
          end loop;
        end loop;
      end loop;
    end loop;

    -- 5 attendance sessions with records for every student
    for i in 1..5 loop
      insert into public.class_sessions
        (classroom_id, session_date, title)
      values
        (v_classroom, (date '2026-01-06' + (i * 7)), 'Week ' || i)
      returning id into v_session;

      for v_student in
        select id from public.students where classroom_id = v_classroom
      loop
        v_status := (array['present','present','present','late','absent']::
          public.attendance_status[])[1 + floor(random() * 5)];
        insert into public.attendance_records (session_id, student_id, status)
        values (v_session, v_student, v_status);
      end loop;
    end loop;
  end loop;
end $$;
