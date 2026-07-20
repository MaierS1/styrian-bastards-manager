# Notification Engine MVP

## Architektur

`supabase/functions/notification-dispatch` ist der zentrale serverseitige Einstieg fuer neue Benachrichtigungen. Das MVP nutzt die bestehenden Tabellen:

- `notification_jobs` fuer Dispatch-Jobs, Status, Source-Bezug und Idempotenz.
- `in_app_notifications` fuer sichtbare Benutzerbenachrichtigungen.
- `notification_preferences` fuer Kanalentscheidungen.
- `notification_logs` fuer technische Delivery-Logs.

Produktiv unterstuetzt die Engine `in_app` und `email`. `push` ist als Kanalname bekannt, wird aber kontrolliert mit `422` abgelehnt.

## Request-Schema

Pflichtfelder:

```json
{
  "type": "system_notice",
  "title": "Wichtiger Hinweis",
  "message": "Text der Benachrichtigung",
  "channels": ["in_app", "email"],
  "recipient_user_ids": ["00000000-0000-4000-8000-000000000000"]
}
```

Optionale Felder: `category`, `priority`, `url`, `source`, `scheduled_at`, `idempotency_key`, `metadata`.

Empfaengerarten: `recipient_user_id`, `recipient_member_id`, `recipient_user_ids`, `recipient_member_ids`, `system_wide`.

Freie Transportfelder wie `to`, `from`, `subject` oder `html` sind nicht erlaubt. E-Mail-Empfaenger werden serverseitig aus `members.email` oder, fuer reine Auth-User ohne Mitgliedsdatensatz, aus Supabase Auth aufgeloest.

Fachadapter koennen serverseitig `recipient_event_registration_id` verwenden. Dieser Empfaengertyp ist in `notification-dispatch` nur mit `INTERNAL_NOTIFICATION_SECRET` erlaubt und dient der sicheren Migration oeffentlicher Event-Gastregistrierungen ohne freie Empfaengeradresse.

## Berechtigungsmodell

Die Function akzeptiert keine anonymen Requests. Sie validiert das JWT ueber Supabase Auth und bestimmt `created_by` serverseitig.

Administrative Dispatches brauchen `kommunikation.create`:

- mehrere Empfaenger
- `system_wide`
- Prioritaet `high` oder `critical`

Ein nicht administrativer Einzel-Dispatch ist nur an den eigenen Auth-User bzw. das eigene verknuepfte Mitglied erlaubt.

## Idempotenz

Wenn `idempotency_key` gesetzt ist, wird er eindeutig in `notification_jobs` gespeichert. Ohne expliziten Key erzeugt die Function einen stabilen Key aus Typ, Kategorie, Quelle, Empfaengern und Kanal. Ein erneuter gleicher Request liefert den bestehenden Job zurueck und erzeugt keine zweite In-App-Benachrichtigung.

## Preferences

Default fuer `in_app` ist aktiv. Eine vorhandene deaktivierte Preference blockiert normale In-App-Benachrichtigungen. Kritische Systemnachrichten (`category=system`, `priority=critical`) werden nicht durch optionale In-App-Preferences blockiert.

Default fuer `email` ist bewusst deaktiviert. Normale E-Mail-Benachrichtigungen werden nur gesendet, wenn fuer `notification_type` und Kanal `email` eine aktivierte oder als `required` markierte Preference existiert. Kritische System-E-Mails werden trotz optional deaktivierter Preference gesendet, aber nicht an inaktive oder ausgetretene Mitglieder.

Marketing-E-Mails sind nicht Teil der Engine und duerfen ohne separates Opt-in nicht ueber diesen Kanal abgebildet werden.

Transaktionale Eventtypen und migrierte Mitgliedsbeitrags-Typen koennen als fachlich required behandelt werden, damit vorhandene Pflicht- und Bestaetigungsflows durch die konservative E-Mail-Default-Regel nicht verloren gehen.

Migrierte Mitgliedsbeitrags-Typen:

- `membership_fee_reminder`
- `membership_fee_payment_confirmed`
- `membership_fee_reminder_test`
- `membership_fee_payment_confirmed_test`

Diese Typen sind required, weil die bisherigen manuell ausgeloesten Beitragsmails direkt und ohne Preference-Gate per Resend versendet wurden. Der Fachadapter `membership-notifications` bleibt als rueckwaertskompatibler Einstiegspunkt bestehen.

## E-Mail-Adapter

Der E-Mail-Adapter nutzt die bestehende Resend-Infrastruktur per `https://api.resend.com/emails`.

ENV-Werte:

- `RESEND_API_KEY`: erforderlich fuer produktiven E-Mail-Versand.
- `FROM_EMAIL`: optional, Fallback ist `Styrian Bastards <mail@styrian-bastards.at>`.
- `REPLY_TO_EMAIL`: optional.
- `APP_PUBLIC_URL`: optional fuer CTA-Links aus internen App-Pfaden.
- `INTERNAL_NOTIFICATION_SECRET`: erforderlich fuer serverseitige Fachadapter wie `event-notifications`.

Das Template wird serverseitig aus `title`, `message`, `priority` und optional `url` erzeugt. Client-HTML wird nicht akzeptiert; Titel und Nachricht werden fuer HTML escaped. Es gibt immer eine Plain-Text-Version. CTA-Links werden nur aus bereits validierten internen Pfaden und einer sicheren `APP_PUBLIC_URL` erzeugt.

Resend-Fehler werden normalisiert, z.B. `email_rate_limited`, `email_provider_unavailable`, `email_configuration_missing`, `email_send_failed` oder `timeout`. Providerdetails und Secrets werden nicht an den Client zurueckgegeben.

## Jobstatus

Die bestehende Statusmenge wird wiederverwendet:

- `processing` waehrend der Verarbeitung
- `sent` bei vollstaendiger Auslieferung oder vollstaendigem fachlichem Skip ohne technischen Fehler
- `partial` bei gemischten Ergebnissen
- `failed` bei vollstaendigem technischen Fehler

Die Job-Zaehler (`recipient_count`, `success_count`, `skipped_count`, `failure_count`) zaehlen Deliveries, nicht nur eindeutige Empfaenger. Ein Dispatch an 10 Empfaenger mit `["in_app", "email"]` ergibt `recipient_count = 20`.

## Logging

Pro Empfaenger und Kanal wird ein `notification_logs`-Eintrag geschrieben. Logs enthalten Job, Kanal, technische Statuswerte und knappe Fehlercodes, aber keine vollstaendigen Nachrichteninhalte. E-Mail-Adressen werden nur maskiert im Feld `email` gespeichert. Resend Message IDs werden datenschutzarm in `provider_response.resend_message_id` abgelegt.

Erfolgreiche Deliveries sind pro Job, Kanal und Empfaenger eindeutig. Fuer Gast-Eventregistrierungen wird `notification_logs.event_registration_id` als eindeutiger Empfaengerbezug genutzt. Fehlgeschlagene oder uebersprungene Versuche koennen fuer spaetere Retry-Analysen mehrfach protokolliert werden. `attempt_count` und `last_attempt_at` bilden die minimale Retry-Grundlage; ein Scheduler oder Worker ist noch nicht enthalten.

## Fehlercodes

- `400`: ungueltiger Request
- `401`: nicht angemeldet
- `403`: nicht berechtigt
- `422`: nicht unterstuetzter Kanal
- `429`: Empfaenger-, E-Mail-Bulk- oder Request-Limit
- `500`: interner Fehler ohne sensible Details

## Limits

Explizite Empfaenger sind auf 100 begrenzt. Systemweite In-App-Benachrichtigungen sind auf 500 aktive App-Benutzer begrenzt. Synchroner E-Mail-Versand ist auf 100 Empfaenger begrenzt und wird sequenziell verarbeitet, damit keine unkontrollierte Resend-Parallelisierung entsteht.

## Beispiele

E-Mail-only:

```json
{
  "type": "system_notice",
  "category": "system",
  "title": "Wichtiger Hinweis",
  "message": "Bitte pruefe die neue Information im Portal.",
  "channels": ["email"],
  "recipient_user_id": "00000000-0000-4000-8000-000000000000",
  "url": "/dashboard",
  "idempotency_key": "system_notice:example:email"
}
```

In-App und E-Mail:

```json
{
  "type": "system_notice",
  "category": "system",
  "title": "Wichtiger Hinweis",
  "message": "Bitte pruefe die neue Information im Portal.",
  "channels": ["in_app", "email"],
  "recipient_user_ids": ["00000000-0000-4000-8000-000000000000"],
  "url": "/dashboard"
}
```

## V1-Abgrenzung

Nicht enthalten:

- Web Push
- weitere Trigger aus Fachmodulen
- Admin-UI
- Template-Platzhalter aus Clientdaten
- komplexe Zielgruppenfilter

`event-notifications` und `membership-notifications` sind auf die zentrale Engine migriert und bleiben als schmale fachliche Adapter bestehen. `send-invoice-email` und dessen Frontend-Aufrufer bleiben unveraendert.

Spaeter koennen Fachmodul-Trigger, Templateverwaltung, Retry-Worker und Push-Adapter hinter derselben Dispatch-Struktur ergaenzt werden.
