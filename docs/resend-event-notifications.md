# Resend Event-Benachrichtigungen

Die Event-Benachrichtigungen werden über die Supabase Edge Function `event-notifications` versendet. Der Absender ist fest auf `Styrian Bastards <mail@styrian-bastards.at>` gesetzt.

## Resend vorbereiten

1. In Resend die Domain `styrian-bastards.at` hinzufügen und verifizieren.
2. Die von Resend angezeigten DNS-Einträge in Cloudflare setzen. Dazu gehören in der Regel SPF, DKIM und optional DMARC.
3. Warten, bis Resend die Domain als verifiziert anzeigt.

## Supabase Secret setzen

Der API-Key darf nicht im Repository oder Frontend gespeichert werden. Er wird nur als Supabase Secret hinterlegt:

```bash
supabase secrets set RESEND_API_KEY=...
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` und `SUPABASE_SERVICE_ROLE_KEY` werden von Supabase Functions bereitgestellt beziehungsweise als Function-Secrets verwendet.

## Function deployen

```bash
supabase functions deploy event-notifications
```

## Testmail senden

1. In der Manager-App mit einem Admin- oder Check-in-User anmelden.
2. Ein Event öffnen und im Bereich `Teilnehmer verwalten` eine Anmeldung mit gültiger E-Mail-Adresse auswählen.
3. `Bestätigung senden` oder `Erinnerung senden` auslösen.
4. Prüfen, ob `confirmation_sent_at` beziehungsweise `reminder_sent_at` gesetzt wird und `notification_status` auf `sent` steht.

Wenn `RESEND_API_KEY` fehlt, gibt die Function einen Fehler zurück und speichert `notification_status = error` sowie die Fehlermeldung in `notification_error`.
