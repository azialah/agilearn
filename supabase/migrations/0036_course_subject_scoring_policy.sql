-- 0036_course_subject_scoring_policy.sql
-- Two per-subject scoring-policy columns, needed to reproduce the Philippine
-- college class record Agilearn is replacing. Both ride course_subjects'
-- existing owns_classroom()-based RLS from 0016 -- no new policy needed.
--
-- Both defaults reproduce today's behaviour exactly, so nothing already in the
-- database changes when this is applied. New subjects created under a college
-- or senior-high template opt in from the application side.

alter table public.course_subjects
  add column grade_floor numeric(5, 2) not null default 0
    check (grade_floor >= 0 and grade_floor < 100),
  add column ungraded_as_zero boolean not null default false;

comment on column public.course_subjects.grade_floor is
  'Lowest possible transmuted percentage. A category percent p (0-100) is reported as floor + p * (100 - floor) / 100, so 0 is off and 60 gives the Philippine college convention tab_score = (raw / max) * 40 + 60. Applied per category, which is where the paper class record applies it, so the on-screen category column matches the sheet.';
comment on column public.course_subjects.ungraded_as_zero is
  'When true, an activity the student has no score for counts as zero instead of dropping out of the ratio. Matches a spreadsheet, where a blank cell is a zero. Note the consequence: an exam row that exists but has not been given yet drags every student toward grade_floor until scores are entered.';
