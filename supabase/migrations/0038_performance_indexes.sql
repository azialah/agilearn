-- 0038_performance_indexes.sql
-- Three indexes for filters and sorts the application actually issues. Each is
-- on a column the query layer reaches for on a hot path and that no existing
-- index already covers. Follows the same reasoning 0033 spells out: every FK
-- column in this schema gets one.

-- src/lib/queries/auditLog.ts filters by actor when an admin narrows the log.
-- audit_log only had audit_log_created_at_idx (0013), and it is append-only --
-- three triggers write to it and nothing prunes -- so this scan only ever gets
-- slower.
create index if not exists audit_log_actor_id_idx
  on public.audit_log (actor_id);

-- useAllClassSessions() in src/lib/queries/attendance.ts is an unfiltered read
-- ordered by session_date desc, and it is mounted on the dashboard. The table
-- had indexes on classroom_id (0004) and course_subject_id (0016) but nothing
-- to serve the sort.
create index if not exists class_sessions_session_date_idx
  on public.class_sessions (session_date desc);

-- src/lib/queries/calendar.ts filters events by subject. calendar_events (0017)
-- indexes (owner_id, starts_at) and (visibility, starts_at) but not this FK.
create index if not exists calendar_events_course_subject_id_idx
  on public.calendar_events (course_subject_id);
