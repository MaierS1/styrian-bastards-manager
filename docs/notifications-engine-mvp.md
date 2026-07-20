# Notification Engine MVP

## Architektur

`supabase/functions/notification-dispatch` ist der zentrale serverseitige Einstieg fuer neue Benachrichtigungen. Das MVP nutzt die bestehenden Tabellen:

- `notification_jobs` fuer Dispatch-Jobs, Status, Source-Bezug und Idempotenz.
- `in_app_notifications` fuer sichtbare Benutzerbenachrichtigungen.
- `notification_preferences` fuer Kanalentscheidungen.
- `notification_logs` fuer technische Delivery-Logs.

Produktiv unterstuetzt das MVP nur `in_app`. `email` und `push` sind als Kanalnamen bekannt, werden aber kontrolliert mit `422` abgelehnt.

## Request-Schema

Pflichtfelder:

```json
{
  "type": "system_notice",
  "title": "Wichtiger Hinweis",
  "message": "Text der Benachrichtigung",
  "channels": ["in_app"],
  "recipient_user_ids": ["00000000-0000-4000-8000-000000000000"]
}
```

Optionale Felder: `category`, `priority`, `url`, `source`, `scheduled_at`, `idempotency_key`, `metadata`.

Empfaengerarten: `recipient_user_id`, `recipient_member_id`, `recipient_user_ids`, `recipient_member_ids`, `system_wide`.

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

Default fuer `in_app` ist aktiv. Eine vorhandene deaktivierte Preference blockiert normale Benachrichtigungen. Kritische Systemnachrichten (`category=system`, `priority=critical`) werden nicht durch optionale Preferences blockiert.

## Jobstatus

Die bestehende Statusmenge wird wiederverwendet:

- `processing` waehrend der Verarbeitung
- `sent` bei vollstaendiger Auslieferung oder vollstaendigem Skip ohne technischen Fehler
- `partial` bei gemischten Ergebnissen
- `failed` bei vollstaendigem technischen Fehler

## Logging

Pro Empfaenger und Kanal wird ein `notification_logs`-Eintrag geschrieben. Logs enthalten Job, Kanal, technische Statuswerte und knappe Fehlercodes, aber keine vollstaendigen Nachrichteninhalte.

## Fehlercodes

- `400`: ungueltiger Request
- `401`: nicht angemeldet
- `403`: nicht berechtigt
- `422`: nicht unterstuetzter Kanal
- `429`: Empfaenger- oder Request-Limit
- `500`: interner Fehler ohne sensible Details

## V1-Abgrenzung

Nicht enthalten:

- produktiver E-Mail-Versand
- Web Push
- Trigger aus Fachmodulen
- Admin-UI
- Template-Platzhalter aus Clientdaten
- komplexe Zielgruppenfilter

Spaeter koennen E-Mail- und Push-Adapter hinter derselben Dispatch-Struktur ergaenzt werden.
