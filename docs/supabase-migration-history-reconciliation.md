# Supabase migration history reconciliation

Date: 2026-07-14

## Scope

This document records the migration-history state observed during the controlled event-registration production rollout.

Do not use uncontrolled `supabase db push` until these differences are reconciled. Use explicit, reviewed migration execution for production changes.

## Projects

- Production: `ekaxdyysefmypkainhij` (`Styrian Bastards Vereins App`)
- Staging: `vbtjjaynbdgsnwegilpn` (`styrian-bastards-manager-staging`)

## Production

Observed after applying `20260714120000_scope_event_registrations_to_events.sql` manually with `supabase db query --linked --file ...` and marking only that version as applied.

- `20260714120000`: local and remote; applied.
- `20260713120000`: local and remote; applied.
- `20260713210000`: local and remote; applied.
- `20260629120000`: local and remote; applied.
- `20260705120000`: local and remote; applied.
- `20260501000000`: local-only in `supabase migration list`; no matching remote history row was shown.

## Staging

Observed after the staging event-registration test rollout and after returning the CLI link to staging.

- `20260714120000`: local and remote; applied.
- `20260713210000`: local and remote; applied.
- `20260713120000`: local-only; no matching remote history row was shown.
- `20260629120000`: local and remote; applied.
- `20260705120000`: local and remote; applied.
- `20260501000000`: local and remote; applied.

## Risks

- A plain `supabase db push` can fail or propose unexpected history changes when local and remote histories differ.
- Repairing migration history without proving the schema state can incorrectly mark unapplied schema as applied.
- Reverting or applying unrelated migration versions during a production rollout can mix unrelated schema changes into a targeted release.

## Safe Reconciliation Plan

1. Export `supabase migration list` for both Production and Staging.
2. For each local-only or remote-only version, compare the actual database schema/functions/policies against the corresponding migration file.
3. For versions that are already materially present in the database, repair only that specific version with `supabase migration repair --status applied <version>`.
4. For versions that are absent from the database, apply only the reviewed migration file first, then mark only that version as applied.
5. Never run broad repair commands or `supabase db push` until the version-by-version audit is complete.
6. Re-run `supabase migration list` for both environments and archive the before/after output.

## Rollout Notes

During the event-registration rollout, only `20260714120000` was manually executed and repaired. No other migration was applied, reverted, or repaired.
