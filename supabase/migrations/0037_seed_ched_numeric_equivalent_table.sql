-- 0037_seed_ched_numeric_equivalent_table.sql
-- Same narrow exception to "no data mutations in schema migrations" that 0032
-- takes: a numeric-equivalent ("grade equivalent") table is a fixed
-- institutional constant, not per-deployment user content.
--
-- Softer case than 0032, and worth saying plainly: this row ships with
-- is_default = false, so no deployment picks it up automatically. It only
-- applies to subjects that opt in via course_subjects.transmutation_table_id.
-- A fresh database functions without it, which is not true of 0032's DepEd
-- table. If you would rather keep migrations strictly structural, this belongs
-- in supabase/seed.sql instead.
--
-- Why it is needed at all: grading.ts's built-in CHED path is a straight line
-- from 75 -> 3.00 to 100 -> 1.00 snapped to an increment. The table Philippine
-- HEIs actually publish is piecewise -- 0.1 per point from 75 to 90, then 0.05
-- per point from 90 to 100. Checked against the 17 known pairs from a real
-- class record, the linear formula gets 14 of them wrong, by as much as 0.4
-- (it reports 89% as 2.00 where the registrar's table says 1.60). A banded
-- table is the only shape that reproduces it.
--
-- Scale note: transmuted_grade normally holds a 0-100 quarterly grade (0032).
-- This table stores the INVERTED 1.00-5.00 point scale, where lower is better.
-- Nothing may compare its output against a percentage threshold. The app does
-- not: pass/fail and low-average alerts are both judged on the underlying
-- percentage (see remarkFor in src/lib/grading.ts), and this value is only ever
-- displayed. A subject that sets transmutation_table_id uses this table; one
-- that leaves it null falls back to the built-in formula and ched_increment.
--
-- Band boundaries sit on half-points so that any percentage rounding to N lands
-- in N's band. Percentages strictly inside a 0.01 boundary gap (74.495, say)
-- are uncovered and transmute to null, exactly as 0032's .99/.00 boundaries
-- behave. Callers already treat null as "no grade yet".
--
-- DELIBERATE GAP, 80.50-88.49 (percentages 81-88).
-- The source class record jumped straight from 80 -> 2.50 to 89 -> 1.60 with
-- those eight rows missing, which in the spreadsheet meant VLOOKUP(..., TRUE)
-- silently returned 2.50 for every grade in that range. Neither reproducing
-- that bug nor interpolating eight invented values is acceptable in a table
-- that issues real grades, so the range is simply left uncovered: a student
-- scoring 81-88 shows no equivalent until the registrar's published values are
-- entered here. hasValidTransmutationTable permits gaps by design.
--
-- TO COMPLETE: add the registrar's eight rows for 81-88 in a follow-up
-- migration, following the same half-point boundary convention used below.
-- Example tuples are deliberately not written out here -- a commented-out row
-- in a seed file is too easy to uncomment or to scrape by mistake.

insert into public.transmutation_tables (name, is_default)
values ('CHED numeric equivalent (1.00-5.00)', false);

insert into public.transmutation_bands (table_id, min_percent, max_percent, transmuted_grade)
select id, band.min_percent, band.max_percent, band.transmuted_grade
from public.transmutation_tables,
  (values
    -- Everything below the 75 passing mark is a flat 5.00.
    (0.00, 74.49, 5.00),
    -- 0.1 per point from 75 to 80, transcribed from the source table.
    (74.50, 75.49, 3.00), (75.50, 76.49, 2.90), (76.50, 77.49, 2.80),
    (77.50, 78.49, 2.70), (78.50, 79.49, 2.60), (79.50, 80.49, 2.50),
    -- 80.50-88.49 intentionally absent; see DELIBERATE GAP above.
    (88.50, 89.49, 1.60), (89.50, 90.49, 1.50),
    -- 0.05 per point from 90 to 100, so each grade spans two percentage points.
    (90.50, 92.49, 1.40), (92.50, 94.49, 1.30), (94.50, 96.49, 1.20),
    (96.50, 98.49, 1.10), (98.50, 100.00, 1.00)
  ) as band (min_percent, max_percent, transmuted_grade)
where public.transmutation_tables.name = 'CHED numeric equivalent (1.00-5.00)';
