-- 0024_classroom_color.sql
-- Optional per-classroom accent, like colouring a folder in a file drive.
-- NULL means "auto" — the client derives a stable colour from the classroom id.

alter table public.classrooms
  add column color text
    check (
      color is null
      or color in ('slate', 'orange', 'amber', 'green', 'teal', 'blue', 'plum', 'rose')
    );

comment on column public.classrooms.color is
  'Teacher-chosen accent for the classroom card; NULL = auto-assigned from the id.';
