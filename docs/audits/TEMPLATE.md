# Audit template

Copy this file rather than editing it in place.

- Per-story audit → `docs/audits/US-<n>-audit.md` (e.g. `US-04-audit.md`).
  Re-auditing the same story later appends a new dated section to that
  file instead of overwriting the original findings.
- Session/pause note → `docs/audits/<YYYY-MM-DD>-session-audit.md`.

An audit that finds nothing is still worth recording — "audited, nothing
found" is a real data point for whoever reads this next.

---

## Summary

- Scope audited: <story id / feature / "full session">
- Date:
- Gate result: format:check / typecheck / test / build — pass or fail
  (if any step failed, say which and why)

## Issues found

Repeat this block per issue. Delete if none were found.

### <short title>

- Severity: critical / high / medium / low
- Where: `path/to/file.ts:LINE`
- Description: the concrete failure — what input or state triggers it,
  what happens instead of the correct behavior
- Root cause:
- Fix: what changed, or "not fixed" with the reason and current state
- Status: fixed / deferred / won't-fix

## Verification

How the fix (or "no issue found" conclusion) was confirmed — test added
and run, manual repro steps re-checked, gate rerun end-to-end.

## Session note

Only for session/pause audits (`<YYYY-MM-DD>-session-audit.md`) — delete
this section for a per-story audit.

- Stories completed this session:
- Story in progress when paused (if any), and its final state:
  committed / stashed / reverted
- What triggered the pause: token budget exhausted / approaching the
  5-hour session limit
- Resume notes for the next session:
