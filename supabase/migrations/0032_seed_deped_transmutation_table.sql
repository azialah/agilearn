-- 0032_seed_deped_transmutation_table.sql
-- Narrow, deliberate exception to "no data mutations in schema migrations":
-- the DepEd Order 8, s. 2015 transmutation table is a fixed national
-- constant every basic_education/senior_high classroom needs to function at
-- all, not per-deployment application data — closer to a schema default than
-- to user content. Reproduced here from the widely-published DO 8, s. 2015
-- Table 2. FLAG FOR REVIEW: cross-check every band against the current
-- official DepEd issuance before relying on this for real report cards —
-- this is a best-effort reproduction, not a verified legal citation, and
-- DepEd has issued clarifying memos on this table since 2015.

insert into public.transmutation_tables (name, is_default)
values ('DepEd Order 8, s. 2015', true);

insert into public.transmutation_bands (table_id, min_percent, max_percent, transmuted_grade)
select id, band.min_percent, band.max_percent, band.transmuted_grade
from public.transmutation_tables,
  (values
    -- Failing range: Initial Grade 0.00-59.99 compresses into Transmuted 60-74,
    -- 4-point bands (never reports below 60, DepEd's floor for failing work).
    (0.00, 3.99, 60), (4.00, 7.99, 61), (8.00, 11.99, 62), (12.00, 15.99, 63),
    (16.00, 19.99, 64), (20.00, 23.99, 65), (24.00, 27.99, 66), (28.00, 31.99, 67),
    (32.00, 35.99, 68), (36.00, 39.99, 69), (40.00, 43.99, 70), (44.00, 47.99, 71),
    (48.00, 51.99, 72), (52.00, 55.99, 73), (56.00, 59.99, 74),
    -- Passing range: Initial Grade 60.00-99.99 compresses into Transmuted
    -- 75-99, 1.6-point bands; Initial Grade 100 maps to Transmuted 100 exactly.
    (60.00, 61.59, 75), (61.60, 63.19, 76), (63.20, 64.79, 77), (64.80, 66.39, 78),
    (66.40, 67.99, 79), (68.00, 69.59, 80), (69.60, 71.19, 81), (71.20, 72.79, 82),
    (72.80, 74.39, 83), (74.40, 75.99, 84), (76.00, 77.59, 85), (77.60, 79.19, 86),
    (79.20, 80.79, 87), (80.80, 82.39, 88), (82.40, 83.99, 89), (84.00, 85.59, 90),
    (85.60, 87.19, 91), (87.20, 88.79, 92), (88.80, 90.39, 93), (90.40, 91.99, 94),
    (92.00, 93.59, 95), (93.60, 95.19, 96), (95.20, 96.79, 97), (96.80, 98.39, 98),
    (98.40, 99.99, 99), (100.00, 100.00, 100)
  ) as band(min_percent, max_percent, transmuted_grade)
where public.transmutation_tables.name = 'DepEd Order 8, s. 2015';
