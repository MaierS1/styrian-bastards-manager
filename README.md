# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Environment Setup

`.env.example` is only a template and contains placeholder values. Do not commit real Supabase keys or production URLs.

Required variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

For local development, create `.env.local` from the template and start the dev server:

```sh
cp .env.example .env.local
npm run dev
```

For local staging, create `.env.staging` from the template and run Vite in staging mode:

```sh
cp .env.example .env.staging
npm run dev -- --mode staging
```

`.env.local` is used for normal local development. `.env.staging` is used locally for staging. Both files contain environment-specific values and must not be committed.

For production deployments on Vercel, set these values under Environment Variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

After changing Vercel Environment Variables, trigger a redeploy so the build receives the updated values.

`npm run build` runs `scripts/check-env.js` before `vite build`. The script verifies that the required variables are set. If one is missing or empty, the build intentionally fails with a clear error message.

## Staging Seed Data

`supabase/seed.sql` contains synthetic staging data that is loaded after `supabase db reset`. It creates test members, a test event, a test sponsor, a test merch item, and sample membership fee/cash data. The seed uses placeholder data only and must not contain production data, real personal data, or secrets.

The seed is idempotent and can be run multiple times without creating duplicate rows.

Auth users are not inserted into `auth.users` by the seed. For local or staging login tests, create the auth user through Supabase Auth and then link it manually by setting `public.members.auth_user_id` to the created auth user UUID. The seeded admin member is `admin.member@example.test`.

## Roadmap

- Vorfinanzierungen & Verbindlichkeiten MVP: in Umsetzung auf `staging`.
- Spaetere Erweiterungen: Belegautomatisierung, Genehmigungsworkflow, Erinnerungen, PDF-Abrechnung, erweiterte Auswertungen.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

Staging deployment test.

## Notification Engine V1

Die Anwendung verwendet genau eine Notification Engine. Fachmodule schreiben keine Datensaetze direkt in `notification_logs` oder `in_app_notifications`; sie erzeugen ausschliesslich Jobs ueber `dispatchNotification()`.

Standardablauf:

```text
Fachmodul
-> dispatchNotification()
-> notification_jobs
-> notification-dispatch
-> notification_logs
-> in_app_notifications
-> Realtime
-> Notification Center
```

Jede fachliche Benachrichtigung besitzt mindestens `type`, `category`, `title`, `message`, `target_type`, `target_id`, `priority`, `channels`, `created_by`, `created_at` sowie optionale `metadata`, `deep_link` und `icon`. Die Engine speichert technische Details wie Target, Deep-Link und Icon in der Job-Payload beziehungsweise in den In-App-Daten.

Zentrale Templates liegen in `src/services/notifications/domainNotificationService.js` und werden durch die Migration `20260725120159_complete_notification_engine_v1.sql` in `notification_templates` gespiegelt. Neue Texte duerfen nicht in Fachkomponenten verteilt werden.

Default-Channels werden pro Template fachlich festgelegt. Kritische oder persoenliche Faelligkeiten nutzen `in_app` und `email`; interne Statusmeldungen, Finanzereignisse, Shop-Status und Kassa-Grenzwertvorbereitungen sind primaer `in_app`. `push` ist in Benutzerprofil und Datenmodell vorbereitet, wird aber in V1 nicht als Versandkanal in Dispatch-Payloads gesetzt.

Empfaenger werden ueber die bestehende RBAC-Berechtigungsmatrix in `src/utils/permissions.js` bestimmt. Module melden Zielmodule und Aktionen, daraus werden aktive Mitglieder mit Login und passender Berechtigung ermittelt. Super-Admin-Benachrichtigungen entstehen dadurch ueber bestehende Vollberechtigungen, nicht ueber hartcodierte Rollenlisten.

Benutzer verwalten ihre Benachrichtigungseinstellungen im Profil unter "Benachrichtigungseinstellungen". Einstellungen werden pro Kategorie und Kanal gespeichert. Bestehende aktive Benutzer erhalten per Migration Default-Preferences fuer In-App, E-Mail und vorbereitete Push-Konfiguration.

Zeitabhaengige Ereignisse laufen zentral ueber `notification-scheduler`. Die Function erzeugt keine direkten In-App- oder Log-Datensaetze, sondern idempotente Jobs fuer `notification-dispatch`. Stabile Deduplication-Keys verhindern doppelte Benachrichtigungen bei wiederholten Scheduler-Laeufen.

V1-Notification-Typen:

- Events: `event_created`, `event_updated`, `event_moved`, `event_cancelled`, `event_full`, `event_waitlist_enabled`, `event_registration_deadline_reached`
- Rechnungen: `invoice_created`, `invoice_paid`, `invoice_cancelled`, `invoice_overdue`
- Vorfinanzierungen: `financing_liability_created`, `financing_liability_updated`, `financing_repayment_recorded`, `financing_liability_paid`, `financing_liability_cancelled`, `financing_liability_overdue`
- Mitglieder: `member_application_received`, `member_accepted`, `member_rejected`, `member_deactivated`
- Mitgliedsbeitraege: `membership_fee_due`, `membership_fee_paid`, `membership_fee_reminder_created`
- Shop: `shop_order_received`, `shop_order_paid`, `shop_order_shipped`, `shop_order_cancelled`
- Sponsoren: `sponsor_created`, `sponsorship_renewed`, `sponsorship_expiring`, `sponsorship_payment_received`
- Inhalte: `document_published`, `press_article_published`, `news_published`
- Kassa vorbereitet: `cash_large_income`, `cash_large_expense`
