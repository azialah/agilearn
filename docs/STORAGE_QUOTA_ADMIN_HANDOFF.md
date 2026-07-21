# Storage quota operations

Agilearn limits each teacher's private `teaching-modules` objects to **500 MB**.
The limit is enforced when the Storage API inserts or replaces an object; the
browser meter is informational and cannot override it.

## Monitor

Run `select * from public.module_storage_usage();` while authenticated as the
teacher, or aggregate `storage.objects.metadata->>'size'` by the first path
segment for an administrator report. The Usage screen shows the same source of
truth for the signed-in teacher.

## Change the allowance

Update the `524288000` byte constant in a reviewed migration and deploy it.
Do not make the bucket public and do not move quota enforcement to browser code.
Storage object metadata is service-owned; use the Storage API for uploads and
deletions rather than editing `storage.objects` directly.

## Support and recovery

Teachers can delete files from Usage or Modules to free capacity. If an object
exists without a matching module row, remove it through the Storage dashboard
or Storage API after confirming the owner path. Keep audit records for support
actions and do not download learner files into shared support channels.
