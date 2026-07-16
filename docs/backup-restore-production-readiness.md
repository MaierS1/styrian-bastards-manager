# Backup/Restore Production Readiness

## Open follow-up tasks

- Define a retention policy for `backup_jobs`, `restore_jobs`, `backup_logs`, and files in the private `backups` Storage bucket.
- Decide who may delete backup files and whether deletion should be soft-deleted/audited before hard deletion.
- Add monitoring for failed `backup_jobs` and `restore_jobs`, especially failed `pre_restore` backups.
- Add an operational alert path for repeated backup upload failures or Storage quota pressure.
- Review Storage growth after the first Production backups and set a quota/cleanup cadence.
