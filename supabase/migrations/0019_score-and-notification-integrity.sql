-- Enforce score bounds at the database boundary, including direct API writes.
-- The client may validate for UX, but activity.max_score is authoritative.

create function public.enforce_score_within_activity_max()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  activity_max numeric(7, 2);
begin
  if new.score is null then
    return new;
  end if;

  select max_score into activity_max
  from public.activities
  where id = new.activity_id;

  if activity_max is null then
    raise exception 'Activity % does not exist', new.activity_id;
  end if;

  if new.score < 0 or new.score > activity_max then
    raise exception 'Score must be between 0 and the activity maximum (%)', activity_max
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger scores_enforce_within_activity_max
  before insert or update of score, activity_id on public.scores
  for each row execute function public.enforce_score_within_activity_max();

create function public.prevent_activity_max_below_existing_scores()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.max_score < old.max_score and exists (
    select 1 from public.scores where activity_id = old.id and score > new.max_score
  ) then
    raise exception 'Activity maximum cannot be below an existing score'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger activities_prevent_max_below_scores
  before update of max_score on public.activities
  for each row execute function public.prevent_activity_max_below_existing_scores();

comment on function public.reconcile_notification_incident(text, uuid, uuid, uuid, boolean, jsonb)
  is 'Creates or resolves an incident for the classroom owner. Admin callers may evaluate incidents but do not receive or read another recipient''s notifications. Low-average inputs may be provisional computed grades.';
