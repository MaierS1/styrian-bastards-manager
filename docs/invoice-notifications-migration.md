# Invoice Notifications Migration

## Ausgangszustand

Vor der Migration versendete `supabase/functions/send-invoice-email` Rechnungen und Zahlungserinnerungen direkt ueber Resend. Die Function war bereits sicherheitsgehaertet: JWT, serverseitige RBAC-Pruefung, serverseitiges Laden der Rechnung, Ablehnung freier Felder wie `to`, `subject`, `html` und `from`, PDF-Groessenlimit und Statuspruefung.

Aufrufstelle im Frontend ist `src/services/invoices/invoiceWorkflowService.js`. Die UI erzeugt den bestehenden Rechnungs-PDF-Blob, wandelt ihn in Base64 um und ruft `send-invoice-email` auf.

Vorhandene produktive Versandfaelle:

- erstmaliger Rechnungsversand
- erneuter Rechnungsversand ueber `allow_resend`
- Rechnungserinnerung
- erneute Rechnungserinnerung ueber `allow_resend`

Nicht vorhanden waren ein separater Testversand, Gutschriftversand, Mahnstufenplattform oder automatischer Scheduler. Diese wurden nicht neu eingefuehrt.

## Neue Architektur

`send-invoice-email` bleibt als rueckwaertskompatibler Fachadapter bestehen. Die Function prueft weiterhin Authentifizierung, Berechtigung, Request und Rechnung, ruft aber nicht mehr Resend direkt auf.

Flow:

Invoice-Workflow -> `send-invoice-email` -> Invoice Notification Service -> `notification-dispatch` -> zentraler E-Mail-Adapter -> Resend.

Der gemeinsame Builder liegt in `supabase/functions/_shared/invoiceNotificationService.js`.

## Sicherheitsmodell

Die Function akzeptiert keine anonymen Aufrufe. Der Benutzer wird per Supabase Auth JWT bestimmt. Fuer den Versand ist mindestens eine vorhandene Permission erforderlich:

- `rechnungen.edit`
- `kassa.edit`

Der Client darf keine freie Empfaengeradresse, keinen freien Betreff, kein freies HTML, keinen freien Absender und keinen beliebigen Anhang uebergeben. Der bestehende PDF-Base64-Kompatibilitaetspfad bleibt erhalten, wird aber streng validiert.

## Empfaenger

Produktive Rechnungen nutzen intern `recipient_invoice_id`. Dieser Empfaengertyp ist in `notification-dispatch` nur mit `INTERNAL_NOTIFICATION_SECRET` erlaubt. Die Engine laedt daraus `invoices.customer_email` und optional das zugehoerige Mitglied/App-Konto ueber `invoices.member_id`.

Externe Rechnungsempfaenger erhalten nur E-Mail. In-App-Auslieferung wurde fuer Rechnungen in diesem Schritt nicht aktiviert.

## PDF-Anhang

Die PDF-Quelle bleibt kurzfristig der bestehende Frontend-PDF-Blob. Die Function akzeptiert nur reinen Base64-Inhalt mit:

- `application/pdf`
- maximal 8 MiB
- gueltiger Base64-Struktur
- PDF-Signatur `%PDF-`

Der Dateiname fuer den Versand wird serverseitig aus der Rechnungsnummer erzeugt, z.B. `Rechnung_2026_001.pdf`. PDF-Base64 wird nicht in `notification_jobs`, `notification_logs` oder Auditdaten gespeichert.

## Nachrichtentypen

Migrierte Typen:

- `invoice_issued`
- `invoice_resent`
- `invoice_reminder`

Kategorie: `invoice`.

## Kanal- und Preference-Regeln

Rechnungen und Zahlungserinnerungen sind transaktionale Vereinskommunikation. Der E-Mail-Adapter behandelt die migrierten Invoice-Typen als required. Dadurch blockiert der konservative E-Mail-Default der Notification Preferences den Rechnungsversand nicht.

## Idempotenz

Keys:

- `invoice-issued:{invoice_id}:{updated_at|invoice_number}`
- `invoice-resent:{invoice_id}:{emailed_at|updated_at|resent}`
- `invoice-reminder:{invoice_id}:{reminder_count|initial}`

`allow_resend` ist kein freier Provider-Bypass. Es erzeugt einen fachlich anderen Typ beziehungsweise eine neue serverseitig abgeleitete Reminder-Occurrence.

## Statusupdates

Nach erfolgreichem neuen Dispatch aktualisiert `send-invoice-email` weiterhin die bestehenden Rechnungsfelder:

- Erstversand/erneuter Versand: `emailed_at`
- Reminder: `last_reminder_at`, `reminder_count`

Bei Idempotenztreffern werden diese Felder nicht erneut aktualisiert. Der Frontend-Service aktualisiert diese Felder nicht mehr selbst, damit keine doppelten Zaehler entstehen.

## Logging

Zentrale technische Zustellungen landen in `notification_jobs` und `notification_logs`. `notification_logs.invoice_id` bildet den fachlichen Empfaengerbezug fuer externe Rechnungsempfaenger. Vollstaendige E-Mail-Adressen, PDF-Inhalte und Providerdetails werden nicht an den Client zurueckgegeben.

Das bestehende fachliche Audit im Frontend bleibt erhalten, speichert aber keine vollstaendige Empfaengeradresse mehr.

## Rollback

Rollback ist moeglich, indem `send-invoice-email` auf die vorherige direkte Resend-Implementierung zurueckgesetzt und die additive Spalte `notification_logs.invoice_id` ignoriert oder entfernt wird. Es wurden keine Rechnungs- oder Kassa-RPCs geaendert.
