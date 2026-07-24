# Membership Notifications Migration

## Ausgangszustand

Vor der Migration versendete `supabase/functions/membership-notifications` Beitragsmails direkt ueber Resend. Die Function wurde aus `src/services/repositories/membershipFeesRepository.js` aufgerufen und in `MembershipFeesPage` fuer Einzelaktionen sowie den bestehenden clientseitigen Sammelversand genutzt.

Produktive Legacy-Typen:

- `fee_reminder`
- `fee_paid_confirmation`
- `fee_reminder_test`
- `fee_paid_confirmation_test`

Nicht vorhanden waren automatische Faelligkeitshinweise, Mahnstufen, Payment-Reverted-Nachrichten oder Scheduler. Diese wurden nicht neu eingefuehrt.

## Neue Architektur

`membership-notifications` bleibt als rueckwaertskompatibler Fachadapter bestehen. Die Function validiert Authentifizierung, Berechtigung und Beitragsdaten, ruft aber nicht mehr Resend auf.

Flow:

Membership-Fachadapter -> `notification-dispatch` -> In-App / E-Mail / Preferences / zentrale Logs.

Der gemeinsame Builder liegt in `supabase/functions/_shared/membershipNotificationService.js`.

## Berechtigungen

Die Function akzeptiert keine anonymen Aufrufe. Ein Benutzer muss serverseitig per JWT validiert werden und mindestens eine der vorhandenen Permissions besitzen:

- `beitraege.edit`
- `kassa.edit`

Der bestehende Sammelversand in der UI ruft weiterhin einzelne `fee_reminder`-Requests nacheinander aus. Es wurde kein neuer serverseitiger Gruppenversand eingefuehrt.

## Serverseitige Validierung

Die Function laedt `membership_fee_items`, `membership_fee_periods`, `members` und `club_payment_settings` serverseitig. Clientdaten zu Betrag, Status, Faelligkeit, Zahlungsoptionen oder Mitglied werden nicht akzeptiert.

Regeln:

- Reminder nur fuer `open` oder `reminded`.
- Reminder nicht fuer Ehrenmitglieder oder 0-Euro-Positionen.
- Zahlungsbestaetigung nur fuer `paid`.
- Produktive Nachrichten nicht an inaktive Mitglieder.
- Testnachrichten gehen an den aufrufenden Auth-User, nicht an eine freie Testadresse.

## Empfaenger

Produktive Nachrichten nutzen `recipient_member_id`. Die Notification Engine loest daraus App-Benutzer und E-Mail-Adresse serverseitig auf. Mitglieder ohne App-Konto koennen per E-Mail erreicht werden; In-App wird zentral als skipped geloggt.

## Kanalregeln und Preferences

Alle migrierten Typen nutzen `["in_app", "email"]`.

Die bestehenden produktiven Beitragsmails waren manuell ausgeloeste transaktionale Nachrichten. Deshalb werden folgende Engine-Typen fuer E-Mail als required behandelt:

- `membership_fee_reminder`
- `membership_fee_payment_confirmed`
- `membership_fee_reminder_test`
- `membership_fee_payment_confirmed_test`

In-App bleibt default aktiv. Marketingkommunikation ist nicht Teil dieses Flows.

## Inhalte

Der Membership-Service erzeugt Titel und Nachricht serverseitig als Text. Reminder enthalten weiter die vorhandenen Zahlungsinformationen aus `club_payment_settings`, soweit gepflegt:

- E-Banking mit Kontoinhaber, IBAN, BIC, Bank und Verwendungszweck.
- Barzahlungshinweis.
- PayPal-Hinweis.

HTML wird nicht vom Beitragsmodul erzeugt. Die zentrale Notification Engine escaped den Text im E-Mail-Template.

## Idempotenz

Typ-Mapping:

- `fee_reminder` -> `membership_fee_reminder`
- `fee_paid_confirmation` -> `membership_fee_payment_confirmed`
- `fee_reminder_test` -> `membership_fee_reminder_test`
- `fee_paid_confirmation_test` -> `membership_fee_payment_confirmed_test`

Keys:

- `membership-fee-reminder:{item_id}:{reminder_sent_at|initial}`
- `membership-fee-payment-confirmed:{item_id}:{paid_at|updated_at|paid}`
- `membership-fee-reminder-test:{item_id}:{actor_user_id}:{reminder_sent_at|initial}`
- `membership-fee-payment-confirmed-test:{item_id}:{actor_user_id}:{paid_at|updated_at|paid}`

Ein wiederholter identischer Request erzeugt keinen zweiten Job. Eine bewusst erneute Erinnerung nach gesetztem `reminder_sent_at` erzeugt einen neuen fachlichen Key.

## Fehlerverhalten

Eine erfolgreiche Beitrags- oder Kassabuchung wird durch Notification-Fehler nicht zurueckgerollt. Bei produktiven Nachrichten wird `membership_fee_items.notification_status` auf `sent` oder `error` aktualisiert. Providerdetails werden nicht an die UI weitergegeben.

## Rollback

Rollback ist moeglich, indem `membership-notifications` auf die vorherige direkte Resend-Implementierung zurueckgesetzt wird. Es wurden keine neuen Beitrags-Tabellen angelegt und keine Beitrags-/Kassa-RPCs geaendert.
