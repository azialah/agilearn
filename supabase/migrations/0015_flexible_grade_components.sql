-- Data-driven grade components replace the fixed lecture/laboratory assumption.
-- Legacy columns remain for backwards-compatible exported and historical grades.

create table public.grade_components (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  name text not null,
  weight numeric(5, 4) not null check (weight > 0 and weight <= 1),
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique (classroom_id, name)
);
create index grade_components_classroom_id_idx on public.grade_components(classroom_id);
alter table public.grade_components enable row level security;
create policy "grade_components all via classroom" on public.grade_components for all to authenticated
  using (public.is_admin() or public.owns_classroom(classroom_id))
  with check (public.is_admin() or public.owns_classroom(classroom_id));

alter table public.activity_categories
  add column grading_period_id uuid references public.grading_periods(id) on delete cascade,
  add column grade_component_id uuid references public.grade_components(id) on delete restrict,
  add column position int not null default 0;
create index activity_categories_grading_period_id_idx on public.activity_categories(grading_period_id);
create index activity_categories_grade_component_id_idx on public.activity_categories(grade_component_id);

-- New classes start with one editable Overall component. Existing classroom rows
-- are already backfilled above, so the trigger only governs future inserts.
create function public.create_default_grade_component()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  insert into public.grade_components (classroom_id, name, weight, position)
  values (new.id, 'Overall', 1, 0);
  return new;
end;
$$;
create trigger classrooms_default_grade_component
  after insert on public.classrooms
  for each row execute function public.create_default_grade_component();

-- Period-scoped categories and components must belong to the same classroom.
drop policy if exists "activity_categories all via classroom" on public.activity_categories;
create policy "activity_categories all via matching classroom" on public.activity_categories for all to authenticated
  using (
    public.is_admin() or public.owns_classroom(classroom_id)
  )
  with check (
    public.is_admin() or (
      public.owns_classroom(classroom_id)
      and (grading_period_id is null or classroom_id = (select classroom_id from public.grading_periods where id = grading_period_id))
      and (grade_component_id is null or classroom_id = (select classroom_id from public.grade_components where id = grade_component_id))
    )
  );
