-- 0033_course_subject_grading_config.sql
-- Two small per-subject grading-config columns. Both ride course_subjects'
-- existing owns_classroom()-based RLS from 0016 — no new policy needed.

alter table public.course_subjects
  add column transmutation_table_id uuid references public.transmutation_tables (id) on delete set null,
  add column ched_increment numeric(3, 2) not null default 0.25
    check (ched_increment > 0 and ched_increment <= 1);

-- Every new FK column in this schema gets an index (matches
-- classrooms_academic_period_id_idx, grading_periods_course_subject_id_idx,
-- etc. in 0016) — without it, the ON DELETE SET NULL cascade seq-scans
-- course_subjects whenever an admin deletes a transmutation_tables row.
create index course_subjects_transmutation_table_id_idx
  on public.course_subjects (transmutation_table_id);

comment on column public.course_subjects.transmutation_table_id is
  'Explicit DepEd transmutation table for this subject. Null resolves to the transmutation_tables row with is_default = true. Only meaningful when grading_template is basic_education or senior_high.';
comment on column public.course_subjects.ched_increment is
  'CHED numeric-grade rounding increment (e.g. 0.25 or 0.10). Only meaningful when grading_template is higher_education.';
