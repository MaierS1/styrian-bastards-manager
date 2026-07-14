# Event registration event scope

## Migration

`supabase/migrations/20260714120000_scope_event_registrations_to_events.sql`

- Ensures `public.event_registrations.event_id` exists.
- Assigns existing registrations without `event_id` to the existing Cornhole event when one can be found by event text fields.
- Falls back to the single existing event only when the database contains exactly one event.
- Stops with a clear exception if any existing registration still cannot be assigned. No existing registration is deleted.
- Sets `event_id` to `not null`.
- Replaces existing `event_id` foreign keys with `event_registrations_event_id_fkey` referencing `public.events(id) on delete restrict`.
- Keeps event registration counts grouped by `event_id`.
- Replaces the broad authenticated insert RLS policy with an event-manager/admin insert policy that requires a non-null valid `event_id`.

## Changed files

- `src/services/repositories/eventsRepository.js`
  - `updateEventRegistration` and `deleteEventRegistration` accept `eventId` and add `.eq('event_id', eventId)`.
  - `sendEventRegistrationNotification` sends the current `event_id` to the Edge Function.
  - Event delete warnings include existing registrations; the database now blocks deleting events that still have registrations.
- `src/components/events/EventRegistrationsManager.jsx`
  - Update, cancel, check-in, delete, and notification actions pass the currently opened event ID.
  - Manual team creation already writes `event_id: event.id`.
- `supabase/functions/event-notifications/index.ts`
  - If an `event_id` is provided, the function verifies that the registration belongs to that event before sending.

## Two-event verification

Run after applying migrations in a Supabase SQL console or local database:

```sql
insert into public.events (id, name, event_date, status)
values
  ('11111111-1111-1111-1111-111111111111', 'Scope Test A', current_date + 10, 'geplant'),
  ('22222222-2222-2222-2222-222222222222', 'Scope Test B', current_date + 11, 'geplant')
on conflict (id) do nothing;

insert into public.event_registrations (event_id, full_name, email, participant_count, status, team_name)
values
  ('11111111-1111-1111-1111-111111111111', 'Team A Kontakt', 'team-a@example.test', 2, 'registered', 'Team A'),
  ('22222222-2222-2222-2222-222222222222', 'Team B Kontakt', 'team-b@example.test', 2, 'waitlist', 'Team B');

select event_id, team_name, status
from public.event_registrations
where event_id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
)
order by event_id, team_name;

select *
from public.get_event_registration_counts()
where event_id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
)
order by event_id;
```

Expected result: `Team A` only appears for `Scope Test A`, `Team B` only appears for `Scope Test B`, and count rows are separated by `event_id`.
