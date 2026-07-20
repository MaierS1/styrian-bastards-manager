# Event Notifications Migration

## Ausgangszustand

Vor der Migration versendete `supabase/functions/event-notifications` Event-E-Mails direkt ueber Resend. Die Function wurde von zwei Wegen genutzt:

- Admin-UI ueber `sendEventRegistrationNotification()` in `src/services/repositories/eventsRepository.js`.
- Oeffentliche Eventregistrierung ueber den Datenbanktrigger `notify_event_registration_async()` und `pg_net`.

Produktive Legacy-Typen:

- `registration_confirmation`
- `waitlist_confirmation`
- `cancellation_notification`
- `event_reminder`

Nicht vorhanden im bestehenden Flow waren automatische Benachrichtigungen fuer Eventabsage, Eventaenderung, Check-in-Informationen oder Wartelisten-Promotion. Diese wurden nicht neu eingefuehrt.

## Neue Architektur

`event-notifications` bleibt als rueckwaertskompatibler Fachadapter bestehen. Die Function validiert weiterhin Event- und Registrierungsdaten, ruft aber nicht mehr Resend auf. Der Versand laeuft ueber:

Event-Fachadapter -> `notification-dispatch` -> In-App / E-Mail / Preferences / zentrale Logs.

Der gemeinsame Builder liegt in `supabase/functions/_shared/eventNotificationService.js`.

## Interne Authentifizierung

Admin-Aufrufe an `event-notifications` benoetigen weiter ein gueltiges Benutzer-JWT. Der Adapter prueft serverseitig:

- `events.edit` fuer einzelne Event-Benachrichtigungen.
- `events.edit` und `kommunikation.create` fuer Event-Reminder.

Der interne Aufruf von `notification-dispatch` verwendet `INTERNAL_NOTIFICATION_SECRET` im Header `x-internal-notification-secret`. Optional wird der gepruefte Benutzer als `x-internal-actor-user-id` weitergegeben. Oeffentliche Registrierungen haben keinen Actor und erzeugen Jobs mit `created_by = null`.

Clients koennen `recipient_event_registration_id` nicht direkt nutzen; `notification-dispatch` akzeptiert diesen Empfaengertyp nur mit internem Secret.

## Empfaenger

Event-Empfaenger werden aus `event_registrations` geladen:

- E-Mail aus `event_registrations.email`.
- Optionales App-Konto ueber Abgleich mit `members.email`.
- Gastregistrierungen ohne App-Konto erhalten E-Mail und werden fuer In-App als `no_app_user` geskippt.

`notification_logs.event_registration_id` verknuepft Gast-Deliveries eindeutig mit der Registrierung. E-Mail-Adressen werden weiterhin nur maskiert geloggt.

## Kanalregeln

Alle migrierten Eventtypen senden `["in_app", "email"]`.

Transaktionale Typen werden fuer E-Mail als required behandelt:

- `event_registration_confirmed`
- `event_registration_waitlisted`
- `event_registration_cancelled`

`event_reminder` bleibt optional und respektiert die vorhandene E-Mail-Preference. In-App bleibt default aktiv.

## Idempotenz

Legacy-Typen werden auf stabile Engine-Typen gemappt:

- `registration_confirmation` -> `event_registration_confirmed`
- `waitlist_confirmation` -> `event_registration_waitlisted`
- `cancellation_notification` -> `event_registration_cancelled`
- `event_reminder` -> `event_reminder`

Keys:

- `event-registration-confirmed:{registration_id}:{confirmation_sent_at|initial}`
- `event-registration-waitlisted:{registration_id}:{confirmation_sent_at|initial}`
- `event-registration-cancelled:{registration_id}:{updated_at|status}`
- `event-reminder:{event_id}:{registration_id}:{reminder_sent_at|initial}`

Ein wiederholter identischer Request erzeugt keinen zweiten Job. Bewusstes erneutes Senden nach gesetztem Zeitstempel erzeugt einen neuen fachlichen Key.

## Fehlerverhalten

Die fachliche Registrierung wird nicht zurueckgerollt, wenn die Notification technisch fehlschlaegt. `event_registrations.notification_status` wird auf `sent` oder `error` aktualisiert. Providerdetails werden nicht an den Client gegeben.

## Rollback

Rollback ist moeglich, indem `event-notifications` auf die vorherige direkte Resend-Implementierung zurueckgesetzt wird und die beiden additiven Migrationen fuer `notification_logs.event_registration_id` sowie die neuen Logs ungenutzt bleiben. Bestehende Tabellen- und RLS-Strukturen werden nicht ersetzt.
