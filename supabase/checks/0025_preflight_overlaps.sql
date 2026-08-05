-- Pre-flight for 0025. NOT a migration — run this by hand first.
--
-- EXCLUDE constraints cannot be added NOT VALID, so 0025 fails outright if any
-- teacher already has overlapping meetings. The app has allowed them since
-- 0017, so assume there are some. This lists them, worst offender first, so the
-- blast radius is known before 0025 quarantines anything.

select
  c.owner_id,
  p.full_name as teacher,
  cl.cohort_name as classroom,
  sa.name as subject_a,
  a.weekday,
  a.starts_at as a_starts,
  a.ends_at as a_ends,
  sb.name as subject_b,
  b.starts_at as b_starts,
  b.ends_at as b_ends
from public.subject_meeting_slots a
join public.course_subjects sa on sa.id = a.course_subject_id
join public.classrooms c on c.id = sa.classroom_id
join public.subject_meeting_slots b on b.id > a.id and b.weekday = a.weekday
join public.course_subjects sb on sb.id = b.course_subject_id
join public.classrooms cb on cb.id = sb.classroom_id and cb.owner_id = c.owner_id
join public.classrooms cl on cl.id = sa.classroom_id
join public.profiles p on p.id = c.owner_id
where a.starts_at < b.ends_at
  and b.starts_at < a.ends_at
order by p.full_name, a.weekday, a.starts_at;
