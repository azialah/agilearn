-- Optional weighted final grades across separate subjects (for example,
-- Lecture 40% + Laboratory 60%). Grade arithmetic remains in src/lib/grading.ts.

create table public.subject_grade_combinations (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (id, classroom_id),
  unique (classroom_id, name)
);

create table public.subject_grade_combination_items (
  combination_id uuid not null,
  classroom_id uuid not null,
  course_subject_id uuid not null,
  weight numeric(5, 4) not null check (weight > 0 and weight <= 1),
  position int not null default 0,
  primary key (combination_id, course_subject_id),
  foreign key (combination_id, classroom_id)
    references public.subject_grade_combinations(id, classroom_id) on delete cascade,
  foreign key (course_subject_id, classroom_id)
    references public.course_subjects(id, classroom_id) on delete cascade
);

create index subject_grade_combination_items_classroom_idx
  on public.subject_grade_combination_items(classroom_id, combination_id, position);

alter table public.subject_grade_combinations enable row level security;
alter table public.subject_grade_combination_items enable row level security;

create policy "subject grade combinations read via classroom"
  on public.subject_grade_combinations for select to authenticated
  using (public.is_admin() or public.owns_classroom(classroom_id));

create policy "subject grade combination items read via classroom"
  on public.subject_grade_combination_items for select to authenticated
  using (public.is_admin() or public.owns_classroom(classroom_id));

-- A server-owned transaction keeps an edited combination valid as one unit.
-- This validates structure only; it deliberately contains no grade calculation.
create function public.save_subject_grade_combination(
  p_id uuid,
  p_classroom_id uuid,
  p_name text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_total numeric := 0;
  v_item jsonb;
  v_subject_id uuid;
  v_weight numeric;
  v_position int := 0;
begin
  if auth.uid() is null or not (public.owns_classroom(p_classroom_id) or public.is_admin()) then
    raise exception 'Not authorized for this classroom';
  end if;

  if coalesce(nullif(trim(p_name), ''), '') = '' then
    raise exception 'A combined grade needs a name';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 2 then
    raise exception 'A combined grade needs at least two subjects';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) as item(value)
    group by item.value ->> 'course_subject_id'
    having count(*) > 1
  ) then
    raise exception 'A subject can appear only once in a combined grade';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_subject_id := (v_item ->> 'course_subject_id')::uuid;
    v_weight := (v_item ->> 'weight')::numeric;
    if v_subject_id is null or v_weight is null or v_weight <= 0 or v_weight > 1 or not exists (
      select 1 from public.course_subjects
      where id = v_subject_id and classroom_id = p_classroom_id
    ) then
      raise exception 'Every combined subject must belong to this classroom and have a valid weight';
    end if;
    v_total := v_total + v_weight;
  end loop;

  if v_total <> 1 then
    raise exception 'Combined subject weights must total 100%%';
  end if;

  if p_id is null then
    insert into public.subject_grade_combinations (classroom_id, name)
    values (p_classroom_id, trim(p_name))
    returning id into v_id;
  else
    select id into v_id
    from public.subject_grade_combinations
    where id = p_id and classroom_id = p_classroom_id;
    if v_id is null then
      raise exception 'Combined grade not found';
    end if;
    update public.subject_grade_combinations set name = trim(p_name) where id = v_id;
    delete from public.subject_grade_combination_items where combination_id = v_id;
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    insert into public.subject_grade_combination_items (
      combination_id, classroom_id, course_subject_id, weight, position
    ) values (
      v_id,
      p_classroom_id,
      (v_item ->> 'course_subject_id')::uuid,
      (v_item ->> 'weight')::numeric,
      v_position
    );
    v_position := v_position + 1;
  end loop;

  return v_id;
end;
$$;

revoke all on function public.save_subject_grade_combination(uuid, uuid, text, jsonb) from public, anon;
grant execute on function public.save_subject_grade_combination(uuid, uuid, text, jsonb) to authenticated;

create function public.delete_subject_grade_combination(
  p_id uuid,
  p_classroom_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not (public.owns_classroom(p_classroom_id) or public.is_admin()) then
    raise exception 'Not authorized for this classroom';
  end if;

  delete from public.subject_grade_combinations
  where id = p_id and classroom_id = p_classroom_id;

  if not found then
    raise exception 'Combined grade not found';
  end if;
end;
$$;

revoke all on function public.delete_subject_grade_combination(uuid, uuid) from public, anon;
grant execute on function public.delete_subject_grade_combination(uuid, uuid) to authenticated;
