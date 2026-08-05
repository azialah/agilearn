-- 0028_drop_classroom_subject_columns.sql
--
-- APPLY ONE RELEASE AFTER 0027, NOT TOGETHER WITH IT.
--
-- These five columns on classrooms duplicated course_subjects and had no reader
-- anywhere in the client outside the wizard's own form state. The wizard stopped
-- writing them in the release that shipped with 0027; this drops them.
--
-- The gap matters because Agilearn is an installed PWA. A cached bundle still
-- posting `room: ''` or `grading_template: 'custom'` gets a hard PostgREST 400
-- the moment the column disappears, and a service worker can serve a stale
-- bundle long after deploy. One release of overlap means those clients fail
-- their writes silently-nowhere rather than at the API.
--
-- course_name and course_code are deliberately NOT dropped: twenty-odd read
-- sites use them and 0027 turned them into a trigger-maintained mirror.

alter table public.classrooms
  drop column if exists subject_code,
  drop column if exists description,
  drop column if exists schedule,
  drop column if exists room,
  drop column if exists grading_template;
