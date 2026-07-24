-- 0020_grading_period_dates.sql
-- Add optional date ranges to grading_periods so clients can scope
-- attendance and activities to a per-classroom grading period.

alter table public.grading_periods
  add column starts_on date,
  add column ends_on date;

-- No data migration is performed here; existing grading_periods will remain
-- null for starts_on/ends_on. Clients should fall back to the global
-- academic_period when values are not provided.

-- Ensure indexes if queries will filter by classroom_id + dates (optional)
create index if not exists grading_periods_classroom_dates_idx
  on public.grading_periods (classroom_id, starts_on, ends_on);
