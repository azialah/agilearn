# DATABASE.md — Agilearn PostgreSQL Schema & RLS Policies

**Stack:** PostgreSQL via Supabase (local + hosted)
**Source of truth:** `supabase/migrations/0001`–`0038` (38 files, applied in order)
**Last updated:** August 31, 2026

> `README.md` and `docs/ARCHITECTURE.md` currently describe "10 tables" citing only
> migrations `0001`–`0006`. That was accurate for that slice but is now **stale** — 32
> further migrations ran after it. This file is a plain-English map of the schema as
> it actually stands at HEAD: **26 tables, 11 enums, 3 views, 22 live functions**
> (1 dropped), RLS on every table plus 2 storage buckets. It describes shape and
> intent, not exact SQL — the migrations themselves are the only literal source; for
> the exact `CREATE TABLE` / `CREATE POLICY` text, open the file named next to each
> table below.

---

## Overview

- Every table keys on `id uuid` (or a composite PK on a join table); every
  timestamp is `timestamptz`, defaulted and set only by the database.
- **RLS is the only authorization layer.** There is no application server and no
  `service_role` key anywhere in this codebase — the browser holds the anon key,
  and Postgres decides what it can see or write.
- Two helper functions back almost every policy: `is_admin()` and
  `owns_classroom(cid)`, both `SECURITY DEFINER`. **No policy on `profiles` ever
  queries `profiles` directly** — that would recurse through the same policy set;
  admin checks always go through `is_admin()`, which bypasses RLS.
- No hard deletes on graded data — attendance, scores, and audit rows are never
  deleted by the app; only cascading from a parent (classroom, student) removes them.

---

## Enum types

| Enum                        | Values                                                             | Notes                                    |
| ---------------------------- | -------------------------------------------------------------------- | ------------------------------------------ |
| `app_role`                   | `admin`, `teacher`                                                    |                                             |
| `grade_component`            | `lecture`, `laboratory`                                               | legacy flag, kept for historical grades   |
| `attendance_status`          | `present`, `absent`, `late`, `excused`                                |                                             |
| `module_kind`                | `lesson_plan`, `activity_story`, `resource`, `syllabus`, `teaching_material` | last two added in `0014`            |
| `teaching_level`              | `preschool`, `elementary`, `high_school`, `college`                   |                                             |
| `academic_period_status`     | `active`, `archived`                                                  |                                             |
| `course_subject_kind`        | `lecture`, `laboratory`, `other`                                      |                                             |
| `class_modality`             | `face_to_face`, `online`, `hybrid`                                    |                                             |
| `calendar_event_kind`        | `event`, `holiday`, `note`                                            |                                             |
| `calendar_event_visibility`  | `private`, `organization`                                             |                                             |
| `course_subject_session`     | `single`, `lecture_lab`                                                | added `0029`                              |

---

## Access-control helper functions

| Function                     | What it does                                                                                                 | Source                   |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `is_admin()`                 | True if the caller's `profiles.role = 'admin'`. `SECURITY DEFINER` so it bypasses RLS and can't recurse.       | `0001`                    |
| `owns_classroom(cid)`        | True if the caller owns classroom `cid`, or is admin.                                                          | `0001`                    |
| `handle_new_user()`          | On signup: rejects any email whose domain isn't in `allowed_email_domains` — **except** one literal address that self-provisions as the first admin, and only while no admin exists yet (self-retiring). Recovery path for a lost last-admin account is documented in the migration itself. | `0001`, replaced by `0011`, final form `0035` |
| `enforce_role_change()`      | Blocks a non-admin from changing their own `role`.                                                             | `0001`                    |

---

## Identity & access

| Table                   | Holds                                                                 | Write access (RLS)                                     | Source                  |
| -------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------- |
| `profiles`               | One row per auth user — name, `role`, school/location, teaching levels, avatar, locale. Created only by `handle_new_user()`, never by client insert. | Owner or admin (select/update); admin-only delete       | `0001`, `0007`, `0008`, `0012`, `0023` |
| `allowed_email_domains`  | Domains permitted to self-signup as `teacher`.                             | Admin-only write; readable by anyone (pre-validates signup) | `0007`, seeded `0011`    |
| `domain_requests`        | "Request my domain" intake from the public signup page.                    | Admin-only read; writes only via `submit_domain_request()` (rate-limited 3/IP/24h) | `0009`, `0010`          |
| `audit_log`              | Append-only trail of role changes and data edits.                          | Admin-only read; writes only via `SECURITY DEFINER` triggers | `0013`, indexed `0038`   |

---

## Academic hierarchy

`academic_periods` (school year/semester) → `classrooms` (cohort) →
`course_subjects` (the subject actually taught) is the structure introduced in
`0016`. Classrooms created before it keep working — the link is nullable, and a
teacher opts a classroom in via the `adopt_legacy_classroom()` RPC.

| Table                       | Holds                                                                                  | Write access (RLS)          | Source                          |
| ------------------------------ | --------------------------------------------------------------------------------------- | ------------------------------- | ---------------------------------- |
| `academic_periods`           | A teacher's school year + semester, with an optional date range.                        | Owner or admin              | `0016`, dates added `0017`         |
| `classrooms`                 | A cohort (owner, year, block, color, optional school level). `course_name`/`course_code` are a **read-only mirror**, written only by a trigger off the classroom's primary subject. | Owner or admin              | `0002`, heavily altered through `0028` |
| `course_subjects`            | The actual subject/course under a classroom — a college classroom can hold several (lecture + lab). Carries per-subject grading knobs (transmutation table, grade floor, ungraded-as-zero). | Owner or admin              | `0016`, altered through `0036`     |
| `course_subject_modules`     | Which shared teaching modules a subject has imported.                                    | Owner of the subject, and the module | `0016`                          |
| `grade_components`           | Top-level split of a subject's grade (e.g. Lecture / Laboratory, or a single "Overall"). One auto-created per new subject. | Owner or admin              | `0015`, altered `0016`/`0017`      |

**Dropped along the way:** `classrooms.lecture_weight`/`laboratory_weight` (the
fixed 40/60 split moved to per-subject config, `0017`), and five columns
(`subject_code`, `description`, `schedule`, `room`, `grading_template`) that moved
from `classrooms` onto `course_subjects` (`0028`).

---

## Gradebook

`grading_periods` (weighted terms) → `activity_categories` (tagged to a grade
component) → `activities` (graded items) → `scores` (per student, per item). **All
grade math lives in `src/lib/grading.ts`** — nothing in the database computes an
average.

| Table                              | Holds                                                                       | Write access (RLS)                                                        | Source                         |
| -------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------- |
| `grading_periods`                   | Weighted terms within a subject.                                                | Classroom owner or admin                                                        | `0003`, altered `0016`/`0017`/`0020` |
| `activity_categories`               | Categories under a grade component (e.g. quizzes, exams).                       | Classroom owner or admin, plus a linkage check tying period/component to the same subject | `0003`, altered `0015`–`0017`      |
| `activities`                        | Graded items — name, max score, date. A trigger blocks lowering `max_score` below an already-recorded score. | Owner via the grading period's classroom                                        | `0003`, altered `0014`, `0019`     |
| `scores`                             | One student's score on one activity (composite key). A trigger enforces `0 ≤ score ≤ activity.max_score`. | Owner via the student's classroom, matched against the activity's classroom     | `0003`, altered `0014`, `0019`     |
| `subject_grade_combinations` + `_items` | Lets a teacher blend several subjects into one combined grade.               | **Read-only via RLS** — mutations only through `save_/delete_subject_grade_combination()`, which enforce weights sum to exactly 1 | `0030`                          |

---

## Roster & attendance

| Table                    | Holds                                                                                       | Write access (RLS)                                                                        | Source                         |
| --------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ----------------------------------- |
| `students`                | Roster entries scoped to a classroom (name, student no., optional student/guardian email).       | Classroom owner or admin                                                                        | `0002`, altered `0014`             |
| `class_sessions`          | An attendance session for a classroom/subject on a given date.                                   | Classroom owner or admin                                                                        | `0004`, altered `0016`/`0017`      |
| `attendance_records`      | A student's status (present/absent/late/excused) for a session.                                  | Classroom owner or admin, **and** the student must belong to that same classroom's roster        | `0004`, tightened `0034`           |

`0034` closed a real gap: the original policy checked only that the caller owned
the session's classroom, not that the named student was actually on that
classroom's roster — a teacher who owned *any* classroom could write attendance for
a student uuid on someone else's. The fix ties student and session to the same
classroom before allowing the write.

---

## Scheduling

| Table                            | Holds                                                                                                     | Write access (RLS)  | Source                  |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ------------------------ | --------------------------- |
| `subject_meeting_slots`           | Weekly recurring time slots for a subject. A database constraint (the schema's only overlap-prevention rule) stops one teacher from being double-booked across any of their subjects, at the teacher level, not the subject level. `owner_id` is trigger-derived and never trusted from the client. | Slot owner or admin | `0017`, rewritten `0025`   |
| `subject_meeting_slot_conflicts`  | Archive of slots that overlapped when the rule above was introduced — quarantined, never deleted.          | Owner or admin      | `0025`                      |
| `calendar_events`                 | Events, notes, and org-wide holidays. A holiday is always organization-visible and vice versa (enforced by a check).| Private events: owner only. Organization-visible (incl. holidays): admin only. | `0017`                      |

---

## Modules & templates

| Table                    | Holds                                                                                          | Write access (RLS)                                                     | Source                    |
| --------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------ |
| `teaching_modules`        | Metadata for a file in the private `teaching-modules` Storage bucket (title, kind, size, mime, tags, folder). Originally readable by any authenticated user; **tightened in `0016`** to owner/admin only, matching the bucket policy. | Owner or admin                                                                 | `0005`, altered `0014`, `0016` |
| `classroom_templates`     | Saved gradebook-setup wizard state, reusable across classrooms. `payload` is opaque JSON, validated client-side. | Owner only (plus admin)                                                        | `0022`                          |

---

## Notifications

| Table            | Holds                                                                                            | Write access (RLS)                                                                              | Source     |
| -------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------- |
| `notifications`   | Deduplicated incidents (low grade average, absence streak) for a recipient. At most one *active* incident per dedupe key — a resolved one can reuse its key. | Recipient can read/mark-read their own; **no client insert/delete** — only `reconcile_notification_incident()` writes, which keeps grade/streak math out of the database (it stays in `grading.ts`) | `0018`      |

---

## Grading reference data

Shared, not classroom-owned — admin-writable, readable by every authenticated user.
Opt in per subject via `course_subjects.transmutation_table_id`.

| Table                    | Holds                                                                              |
| --------------------------- | --------------------------------------------------------------------------------------- |
| `transmutation_tables`    | Named grading scales; at most one may be flagged `is_default`.                          |
| `transmutation_bands`     | The percent-range → transmuted-grade bands belonging to a table.                        |

Two tables are seeded (`0031`–`0032`, `0037`):

- **`'DepEd Order 8, s. 2015'`** (the default) — 39 bands reproducing the DepEd
  Order 8 s.2015 transmutation table. The migration's own comment flags this as a
  **best-effort reproduction, not a verified legal citation** — cross-check against
  the current DepEd issuance before it feeds a real report card.
- **`'CHED numeric equivalent (1.00-5.00)'`** — the inverted CHED point scale
  (1.00 best, 5.00 fail), display-only; pass/fail and low-average alerts always key
  off the underlying percentage in `grading.ts`, never off this scale. It has a
  **deliberate gap, 80.50–88.49%** — the source registrar data was missing rows
  there, and the migration explicitly declines to invent values; scores in that
  range resolve to `null` until real data is entered.

---

## Views

All three run `security_invoker = true` — the *caller's* RLS applies through the
view, so a teacher still sees only their own classrooms and an admin sees all.
**Never drop that setting** — without it the view runs as its definer and leaks
across classrooms.

| View                      | Purpose                                                                                       | Source  |
| ---------------------------- | -------------------------------------------------------------------------------------------------- | ----------- |
| `v_class_roster`           | Classroom joined to its students — the original reporting view.                                    | `0006`      |
| `v_gradebook_activities`   | Activities with `classroom_id`/`course_subject_id` denormalized on, so the client can fetch every visible activity in one query instead of one round trip per classroom. No grade math. | `0021`      |
| `v_gradebook_scores`       | Same denormalization for scores.                                                                    | `0021`      |

---

## Storage buckets

Layout for both: `<owner-uuid>/<filename>` — the first path segment is the owning
teacher's uuid, and every policy checks it.

| Bucket               | Visibility | Read                          | Write                                                                 | Source            |
| ----------------------- | ------------ | -------------------------------- | ---------------------------------------------------------------------- | --------------------- |
| `teaching-modules`    | private    | Owner or admin                 | Owner or admin, gated by a 500 MB-per-teacher quota (`module_storage_quota_allows()`, with an advisory lock so concurrent uploads can't race past it) | `0005`, tightened `0016`/`0017` |
| `avatars`             | public     | Unrestricted                   | Owner or admin, own folder only                                        | `0023`               |

---

## Everything-else functions (RPCs and internal triggers)

Each fires from the table or route named; full bodies live in the migration
listed — this is a map of *what exists and why*, not the implementation.

| Function                                   | Fires from                                     | Purpose                                                                                    | Source |
| --------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------- |
| `log_role_change()`                         | trigger, `profiles` role update                    | audit-log a role change                                                                          | `0013`     |
| `log_data_change()`                         | triggers, `classrooms` / `students`                | generic audit writer                                                                              | `0013`     |
| `log_score_change()`                        | trigger, `scores`                                  | audit writer for the composite-key table                                                          | `0013`     |
| `create_subject_default_grade_component()`  | trigger, `course_subjects` insert                  | inserts a default "Overall" grade component for a new subject                                     | `0015`/`0016` |
| `adopt_legacy_classroom()`                  | RPC, `authenticated`                               | one-time per-classroom migration into the academic hierarchy                                      | `0016`     |
| `course_subject_kind_matches_level()`       | trigger, `course_subjects`                         | rejects lecture/laboratory kind unless the classroom's level is college                           | `0026`     |
| `classroom_level_allows_kinds()`            | trigger, `classrooms`                              | blocks demoting a classroom's level away from college while it still has lecture/lab subjects     | `0026`     |
| `sync_classroom_subject_mirror()`           | trigger, `course_subjects`                         | keeps `classrooms.course_name`/`course_code` mirroring the primary subject                        | `0027`     |
| `enforce_score_within_activity_max()`       | trigger, `scores`                                  | rejects a score outside `[0, activity.max_score]`                                                 | `0019`     |
| `prevent_activity_max_below_existing_scores()` | trigger, `activities`                          | rejects lowering `max_score` below an existing score                                              | `0019`     |
| `set_meeting_slot_owner()`                  | trigger, `subject_meeting_slots`                   | derives `owner_id` from the subject's classroom, so it can't be spoofed                           | `0025`     |
| `submit_domain_request()`                   | RPC, `anon`/`authenticated`                        | validates and rate-limits a public domain request                                                 | `0009`/`0010` |
| `module_storage_usage()` / `module_storage_quota_allows()` | RPC / storage policy               | reports and enforces the 500 MB-per-teacher Storage quota                                          | `0017`     |
| `reconcile_notification_incident()`         | RPC, `authenticated`                               | creates or resolves a deduplicated notification incident                                          | `0018`     |
| `save_subject_grade_combination()` / `delete_subject_grade_combination()` | RPC, `authenticated`         | validated create/delete of a multi-subject grade blend                                            | `0030`     |
| ~~`create_default_grade_component()`~~      | —                                                   | **dropped in `0016`** — superseded by the subject-scoped version above; does not exist at HEAD    | —          |

---

## Notable constraints worth knowing about

- **`subject_meeting_slots`** has the schema's only overlap-prevention rule — a
  database constraint that stops one teacher from having two time slots on the same
  weekday whose times overlap, regardless of which subject they belong to.
- **`notifications`** allows uniqueness only among *active* incidents (a resolved
  one can be re-triggered under the same key).
- **`transmutation_tables`** allows at most one table flagged as the default.
- Every child table that carries both `course_subject_id` and `classroom_id`
  (`grading_periods`, `class_sessions`, `grade_components`, `activity_categories`,
  `subject_grade_combination_items`) is constrained so those two can never
  disagree — a row can't point at a subject that belongs to a different classroom.
- `0038` is the one migration whose sole purpose is indexing an already-shipped hot
  path (`audit_log` filtered by actor, `class_sessions` sorted by date, calendar
  events filtered by subject) — read it before adding a new index elsewhere; the
  same "does a real query need this" reasoning applies.

---

## Regenerating types after a schema change

```bash
supabase gen types typescript --local > src/lib/database.types.ts
```

`src/types/domain.ts` derives friendly `Profile`/`Classroom`/`Student`/… aliases
from that file. Any new table or column in a migration must land in both files, and
in this doc's table, in the same PR — see [`.claude/CLAUDE.md` §3](../.claude/CLAUDE.md).
