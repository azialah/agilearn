-- 0021_gradebook_overview_views.sql
--
-- Purpose: collapse the dashboard / school-overview gradebook fan-out from
-- 2 queries PER CLASSROOM (2N round trips) down to a constant number.
--
-- Why views and not an aggregate:
--   Final grades are weighted, renormalize when a category is ungraded, and are
--   unit-tested in src/lib/grading.ts, which the project designates as the ONLY
--   place grade math lives. Computing averages in SQL would duplicate that logic
--   in a second language with no shared tests, and the two would drift. So these
--   views only RESHAPE data (denormalizing classroom_id onto the two tables that
--   lack it) and leave every calculation in grading.ts.
--
-- Why the client currently needs them:
--   grading_periods / grade_components / activity_categories all carry
--   classroom_id already, so the client can fetch them unfiltered in ONE query
--   each and group client-side. `activities` only has grading_period_id and
--   `scores` only has activity_id, so without these views the client cannot ask
--   "everything I can see" in a single call — hence the per-classroom loop.
--
-- security_invoker = true: the caller's RLS still applies through the view, so a
-- teacher sees only their own classrooms and an admin sees all — exactly the
-- behaviour of the underlying tables. Do NOT drop this; without it the views
-- would run as the definer and leak across classrooms.
--
-- Safe to run more than once.

-- Activities, with the owning classroom/subject denormalized on ------------
drop view if exists public.v_gradebook_activities;

create view public.v_gradebook_activities
  with (security_invoker = true)
as
  select
    a.id,
    a.grading_period_id,
    a.category_id,
    a.name,
    a.max_score,
    a.date,
    a.position,
    gp.classroom_id,
    gp.course_subject_id
  from public.activities a
  join public.grading_periods gp on gp.id = a.grading_period_id;

comment on view public.v_gradebook_activities is
  'Activities with classroom_id/course_subject_id denormalized from grading_periods, so every visible activity can be fetched in one query. RLS applies via security_invoker.';

-- Scores, with the owning classroom denormalized on ------------------------
drop view if exists public.v_gradebook_scores;

create view public.v_gradebook_scores
  with (security_invoker = true)
as
  select
    s.activity_id,
    s.student_id,
    s.score,
    s.updated_at,
    gp.classroom_id,
    gp.course_subject_id
  from public.scores s
  join public.activities a on a.id = s.activity_id
  join public.grading_periods gp on gp.id = a.grading_period_id;

comment on view public.v_gradebook_scores is
  'Scores with classroom_id/course_subject_id denormalized, so every visible score can be fetched in one query instead of one per classroom. RLS applies via security_invoker.';

-- No new indexes are needed. The joins walk
-- scores -> activities -> grading_periods, and every column involved is already
-- indexed: activities_grading_period_id_idx and grading_periods_classroom_id_idx
-- both ship in 0003_grade_sheets.sql, and scores.activity_id is the leading
-- column of the scores primary key (activity_id, student_id), so it already has
-- a usable btree. Adding more would only cost writes.
