# P0 RLS Hardening Plan

Stand: 2026-07-28, Branch `staging`.

Dieser Bericht ist ein technisches Vorbereitungsartefakt. Die beschriebenen
Migrationen wurden erstellt, aber nicht auf Staging oder Produktion angewendet.
Es wurden keine Daten veraendert.

## 1. Management Summary

Der Staging-Zustand bestaetigt die im Legacy-RBAC-Audit gemeldete P0-Luecke:
10 Tabellen im `public`-Schema haben keine aktivierte Row Level Security und
keine Policies. Diese Tabellen besitzen gleichzeitig breite Grants fuer
`anon`, `authenticated` und `service_role`.

Betroffen sind:

- `audit_logs`
- `cash_month_closings`
- `documents`
- `event_checkins`
- `inventory_items`
- `invoice_customers`
- `invoice_items`
- `invoices`
- `member_change_requests`
- `membership_fees`

Die vorbereitete Hardening-Serie trennt die Risiken in sechs Migrationen:

1. Dokumente
2. Rechnungen
3. Inventar
4. Mitgliedsbeitraege und Aenderungsantraege
5. Event-Checkins und Kassa-Monatsabschluesse
6. Audit/System

Keine dieser Migrationen gehoert zur ausstehenden Cash-RLS-Migration. Die
Cash-RLS-Migration bleibt separat und wurde nicht angewendet.

## 2. Tatsaechlicher Staging-Zustand

Supabase-Projektbindung:

- `.temp/project-ref`: `vbtjjaynbdgsnwegilpn`

Git-Ausgangslage:

- Branch: `staging`
- HEAD vor Bearbeitung entsprach `origin/staging`
- Erwartete uncommitted Dateien:
  - `src/services/cash/cashEntriesRlsMigration.test.js`
  - `supabase/migrations/20260728121000_replace_cash_entries_legacy_rls_with_rbac.sql`

Staging-Zaehler:

| Objekt | Anzahl |
| --- | ---: |
| Rollen | 7 |
| Permissions | 64 |
| Role-Permissions | 217 |
| User-Roles | 2 |
| User-Permissions | 0 |
| Public-Tabellen | 54 |
| Public-Tabellen mit RLS | 44 |
| Public-Tabellen ohne RLS | 10 |
| RLS-Tabellen ohne Policies | 0 |

Die 10 Tabellen ohne RLS haben jeweils `policy_count = 0` und
`force_rls = false`.

## 3. Vollstaendige Tabellenklassifikation

| Klasse | Tabellen |
| --- | --- |
| A - RLS aktiviert und geschuetzt | `cash_entries`, `financing_liabilities`, `financing_liability_repayments`, `in_app_notifications`, `notification_jobs`, `notification_logs`, `notification_preferences`, `notification_templates`, `push_subscriptions`, `backup_jobs`, `backup_logs` |
| B - RLS aktiv, aber unvollstaendige oder breite Policies | `club_payment_settings`, `events`, `media_items`, `merch_items`, `merch_sale_items`, `merch_sales`, `merch_variants`, `permissions`, `roles`, `sponsor_contracts`, `sponsors` |
| C - RLS deaktiviert | `audit_logs`, `cash_month_closings`, `documents`, `event_checkins`, `inventory_items`, `invoice_customers`, `invoice_items`, `invoices`, `member_change_requests`, `membership_fees` |
| D - RLS aktiv, aber Legacy-/Helper-abhaengig | `event_registrations`, `member_documents`, `members`, `membership_fee_items`, `membership_fee_periods`, `media_post_channels`, `purchase_list_items`, `purchase_lists`, `purchase_price_history`, `purchase_prices`, `purchase_product_favorites`, `purchase_products`, `purchase_search_results`, `purchase_supplier_ratings`, `role_permissions`, `shop_order_items`, `shop_orders`, `suppliers`, `user_permissions`, `user_roles`, `virtual_bastard_knowledge` |
| E - bewusst oeffentlich lesend | `virtual_bastard_knowledge` fuer aktive oeffentliche Inhalte; `public-assets` Storage SELECT separat |
| F - nur service_role | kein bestaetigter Public-Tabellenfall; Edge Functions nutzen service_role fuer Rechnungsversand, Notifications und Storage |
| G - unklar | keine zusaetzliche Tabelle; offene Fragen betreffen fachliche Policy-Semantik |

## 4. P0-Tabellen

| Tabelle | Zeilen geschaetzt | Datenart | Personenbezogen | Finanzdaten | Audit/Security | Risiko heute | Hardening-Risiko |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| `audit_logs` | 35 | Audit-JSON, User-Referenzen | ja | indirekt | ja | P0 | mittel, Frontend schreibt direkt |
| `documents` | 0 | Dokument-Metadaten, Pfade | moeglich | moeglich | nein | P0 | mittel, Storage-Bucket Drift |
| `inventory_items` | 0 | Vereinsinventar, Werte, Seriennummern | moeglich | ja | nein | P0 | klein |
| `invoice_customers` | 0 | Kundendaten | ja | indirekt | nein | P0 | mittel |
| `invoice_items` | 5 | Rechnungspositionen | indirekt | ja | nein | P0 | mittel |
| `invoices` | 5 | Rechnungen, E-Mail, Adresse, Betrag | ja | ja | nein | P0 | hoch, Edge Function nutzt service_role |
| `member_change_requests` | 0 | Aenderungsantraege als JSON | ja | moeglich | nein | P0 | mittel, Mitglieder duerfen eigene Antraege erstellen |
| `membership_fees` | 6 | Legacy-Beitraege | ja | ja | nein | P0 | mittel, alte UI-Zugriffe |
| `event_checkins` | 0 | Check-ins | ja | nein | nein | P0 | klein/mittel |
| `cash_month_closings` | 0 | Kassa-Monatsabschluss | ja, User-ID | ja | nein | P0 | mittel, Kassa-Workflow |

## 5. P1-Tabellen

P1 sind nicht unmittelbar ohne RLS, muessen aber vor groesseren Rollouts
vereinheitlicht werden:

- `cash_entries`: RLS aktiv; Cash-RLS-Produktionsmigration separat offen.
- `members`: DELETE haengt an `is_board_member()`.
- `membership_fee_periods`, `membership_fee_items`: RLS ueber
  `is_admin_user()`.
- Einkaufstabellen und `suppliers`: RLS ueber
  `is_purchase_manager_user()`.
- `roles`, `permissions`, `role_permissions`, `user_roles`,
  `user_permissions`: breite Grants, RLS mit Admin-Helpern.

## 6. Grants-Analyse

Alle 10 P0-Tabellen haben aktuell direkte Grants fuer `anon` und
`authenticated` inklusive:

- `SELECT`
- `INSERT`
- `UPDATE`
- `DELETE`
- `TRUNCATE`
- `REFERENCES`
- `TRIGGER`

Das ist die zentrale Sofortluecke: Ohne RLS koennen diese Grants ueber die
Data-API wirksam werden. Die Migrationen setzen fuer jede betroffene Tabelle:

- `REVOKE ALL ... FROM anon`
- `REVOKE ALL ... FROM authenticated`
- gezieltes `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated`
  oder bei `audit_logs` nur `SELECT, INSERT`
- keine Aenderung an `service_role`

## 7. RLS-/Policy-Analyse

Alle neuen Ziel-Policies verwenden `TO authenticated` und nach Moeglichkeit
`public.has_app_permission(module, action)`.

Verbotene Muster wurden statisch ausgeschlossen:

- kein `USING (true)` fuer sensible Policies
- kein `WITH CHECK (true)`
- kein `FORCE ROW LEVEL SECURITY`
- keine `GRANT ... TO anon`
- keine `TRUNCATE`, `REFERENCES` oder `TRIGGER` Grants an `authenticated`
- keine Daten-DML
- keine Tabellen-/Spalten-/Index-/Function-DDL

## 8. Anwendungsabhaengigkeiten

| Tabelle | Frontend/Service | Edge/RPC | Zugriffstyp |
| --- | --- | --- | --- |
| `documents` | `documentsRepository`, `DocumentsPage`, Dashboard, CSV Export | `get_member_documents()`, `member-document-link` | direktes CRUD + RPC-Leseweg |
| `invoice_customers` | `invoicesRepository` | keine direkte Edge Function | direktes CRUD |
| `invoices` | `invoiceWorkflowService`, `invoicesRepository`, Admin Testdaten | `send-invoice-email`, Notification Engine, Merch Sale RPC | direktes CRUD + service_role |
| `invoice_items` | `invoiceWorkflowService`, `invoicesRepository` | Merch Sale RPC | direktes CRUD |
| `inventory_items` | `inventoryRepository` | Backup/Restore UI | direktes CRUD |
| `membership_fees` | Legacy Cash/Fees Repositories, Testdatenloeschung | keine neue RPC-Pflicht | direktes CRUD |
| `member_change_requests` | `memberChangeRequestsRepository` | Notifications | direktes CRUD, eigene Antraege |
| `event_checkins` | `eventsRepository` | Backup/Restore UI | direktes Lesen/Insert |
| `cash_month_closings` | `cashMonthService`, `cashRepository` | Cash-Workflow | direktes Lesen/Insert/Delete |
| `audit_logs` | `createAuditLog` in `App.jsx` und Services | `send-invoice-email` mit service_role | direktes Insert, Admin-Lesen |

## 9. Fachliche Zugriffsmatrix

Legende: `-` kein direkter Zugriff, `R` SELECT, `C` INSERT, `U` UPDATE,
`D` DELETE.

| Tabelle | RBAC-Modul | anon | mitglied | rechnungspruefer | schriftfuehrer | kassier | vorstand | administrator | super_admin | service_role |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `documents` | `dokumente` | - | R | - | RCU | R | RCU | RCUD | RCUD | unveraendert |
| `invoice_customers` | `rechnungen` | - | - | R | - | RCU | R | RCUD | RCUD | unveraendert |
| `invoices` | `rechnungen`/`kassa` | - | - | R | - | RCU | R | RCUD | RCUD | unveraendert |
| `invoice_items` | `rechnungen`/`kassa` | - | - | R | - | RCU | R | RCUD | RCUD | unveraendert |
| `inventory_items` | `inventar` | - | - | - | RCU | - | RCU | RCUD | RCUD | unveraendert |
| `membership_fees` | `beitraege`/`kassa` | - | eigene R | R | - | RCU | R | RCUD | RCUD | unveraendert |
| `member_change_requests` | `mitglieder` | - | eigene RC | - | - | - | nach Rolle | RCUD | RCUD | unveraendert |
| `event_checkins` | `events` | - | R | - | RCU | - | RCUD | RCUD | RCUD | unveraendert |
| `cash_month_closings` | `kassa` | - | - | R | - | RCUD | R | RCUD | RCUD | unveraendert |
| `audit_logs` | `systemeinstellungen` | - | eigene Insert-Logs | - | - | eigene Insert-Logs | eigene Insert-Logs | RC | RC | unveraendert |

Offene fachliche Punkte:

- `audit_logs` hat keinen eigenen Permission-Key. Die vorbereitete Migration
  nutzt konservativ `systemeinstellungen.view/create/edit` und erlaubt
  authentifizierten Nutzern nur eigene Insert-Logs.
- `documents` verwendet `dokumente.view`; dadurch kann `mitglied` weiterhin
  Dokument-Metadaten lesen. Ob private Verwaltungsdokumente zusaetzlich
  getrennt werden sollen, ist fachlich offen.
- `member_change_requests` erlaubt eigene Antraege. Verwaltung laeuft ueber
  `mitglieder.*`.

## 10. Geplante Migrationsserie

| Migration | Datei | Tabellen | Risiko |
| --- | --- | --- | --- |
| A | `20260728150218_harden_public_documents_rls.sql` | `documents` | mittel |
| B | `20260728150227_harden_public_invoice_rls.sql` | `invoice_customers`, `invoices`, `invoice_items` | hoch |
| C | `20260728150227_harden_public_inventory_rls.sql` | `inventory_items` | klein |
| D | `20260728150227_harden_public_member_fee_rls.sql` | `membership_fees`, `member_change_requests` | mittel |
| E | `20260728150227_harden_public_event_cash_aux_rls.sql` | `event_checkins`, `cash_month_closings` | mittel |
| F | `20260728150227_harden_public_audit_system_rls.sql` | `audit_logs` | mittel/hoch |

Alle Migrationen sind transaktional, idempotent bezueglich Policy-Neuaufbau und
lassen `service_role` unberuehrt.

## 11. Migration pro Tabelle

| Tabelle | SELECT | INSERT | UPDATE | DELETE | Besonderheit |
| --- | --- | --- | --- | --- | --- |
| `documents` | `dokumente.view` | `dokumente.create` | `dokumente.edit` | `dokumente.delete` | Storage-Bucket `documents` separat pruefen |
| `invoice_customers` | `rechnungen.view` | `rechnungen.create` | `rechnungen.edit` | `rechnungen.delete` | keine Kassa-Erweiterung fuer Kundenstamm |
| `invoices` | `rechnungen.view OR kassa.view` | `rechnungen.create OR kassa.create OR kassa.edit` | `rechnungen.edit OR kassa.edit` | `rechnungen.delete` | E-Mail Edge Function nutzt service_role |
| `invoice_items` | `rechnungen.view OR kassa.view` | `rechnungen.create OR kassa.create OR kassa.edit` | `rechnungen.edit OR kassa.edit` | `rechnungen.delete` | Positionen folgen Rechnungskontext |
| `inventory_items` | `inventar.view` | `inventar.create` | `inventar.edit` | `inventar.delete` | keine oeffentliche Nutzung |
| `membership_fees` | `beitraege.view OR kassa.view OR eigene Zeile` | `beitraege.create` | `beitraege.edit OR kassa.edit` | `beitraege.delete` | Legacy-Tabelle, neue Items sind separat |
| `member_change_requests` | eigene Zeile oder `mitglieder.view` | eigene Zeile | `mitglieder.edit` | `mitglieder.delete` | Member-Self-Service bleibt moeglich |
| `event_checkins` | `events.view` | `events.create OR events.edit` | `events.edit` | `events.delete` | Checkin UI nutzt eigenes `canUseCheckin()` |
| `cash_month_closings` | `kassa.view` | `kassa.edit` | `kassa.edit` | `kassa.delete` | UI aktuell Admin-only; RBAC-Ziel ist Kassa |
| `audit_logs` | `systemeinstellungen.view` | eigene Logs oder `systemeinstellungen.create/edit` | - | - | keine direct update/delete Grants |

## 12. Rollback-Konzept

Rollback veraendert keine Daten. Fuer jede Migration gilt:

1. Neue Policies droppen.
2. RLS fuer die betroffene Tabelle nur dann wieder deaktivieren, wenn der
   Rollback explizit den alten ungeschuetzten Zustand wiederherstellen soll.
3. Vorherige Grants wiederherstellen, falls App-Kompatibilitaet kurzfristig
   priorisiert werden muss.

Beispielmuster:

```sql
begin;
drop policy if exists "<policy>" on public.<table>;
alter table public.<table> disable row level security;
grant all on table public.<table> to anon;
grant all on table public.<table> to authenticated;
commit;
```

Abbruchkriterien:

- `mitglied` kann mehr als eigene/zulassige Daten sehen.
- `super_admin` verliert administrativen Zugriff.
- Edge Functions mit service_role koennen nicht mehr lesen/schreiben.
- Dokumente, Rechnungen oder Beitraege brechen im normalen Workflow.
- Audit-Logging blockiert fachlich notwendige Aktionen.

## 13. Testkonzept

Automatisierte statische Tests:

- `scripts/p0RlsHardeningMigrations.test.js`
- prueft Scope, RLS-Aktivierung, Grants, Policies, Idempotenz und Cash-RLS-
  Trennung.

Staging-Abnahmetests vor Anwendung:

- Migrationsserie einzeln in einer Staging-Testsequenz anwenden.
- Nach jeder Migration Tabellenstatus, Grants und Policies abfragen.
- CRUD-Matrix fuer `super_admin`, `mitglied`, `anon`, `service_role` pruefen.
- Edge Function `send-invoice-email` mit erlaubtem und verbotenem Benutzer
  testen.
- Dokument-Upload, Dokument-Liste und Member-Area-Dokumente testen.
- Rechnungsanlage, Rechnungsmail, Zahlung, Storno und Delete testen.
- Inventar-Import, Update, Ausmustern und Delete testen.
- Mitgliedsaenderungsantrag erstellen und bearbeiten testen.
- Event-Checkin und Monatsabschluss testen.

## 14. Staging-Abnahmekriterien

- Alle 10 P0-Tabellen haben RLS aktiv.
- Keine der 10 Tabellen hat `FORCE RLS`.
- Keine P0-Tabelle hat Grants an `anon`.
- `authenticated` besitzt keine `TRUNCATE`, `REFERENCES` oder `TRIGGER`
  Grants auf P0-Tabellen.
- `service_role` bleibt unveraendert funktionsfaehig.
- Keine normale Mitgliedsrolle erhaelt Verwaltungs-, Finanz-, Audit- oder
  Systemrechte.
- `super_admin` behaelt alle notwendigen Verwaltungsrechte.
- Keine Cash-RLS-Migration wird in dieser Serie angewendet.

## 15. Produktionsrisiken

| Bereich | Risiko | Gegenmassnahme |
| --- | --- | --- |
| Rechnungen | direkte Frontend-CRUD-Abhaengigkeit | zuerst Staging-Workflow komplett testen |
| Dokumente | Bucket `documents` fehlt auf Staging laut Audit | Storage-Setup vor Anwendung klaeren |
| Audit Logs | Frontend schreibt direkt | Insert-Policy fuer eigene Logs testen; langfristig RPC |
| Mitgliedsaenderungen | Self-Service und Verwaltung gemischt | positive/negative Tests je Rolle |
| Monatsabschluesse | UI aktuell Admin-only, Ziel RBAC-Kassa | fachliche Freigabe fuer `kassa.edit/delete` |
| Legacy-Fallbacks | `has_app_permission()` nutzt Legacy weiter | bewusst beibehalten bis Produktivmigration |

## 16. Verhaeltnis zur Cash-RLS-Migration

Die Cash-RLS-Migration
`20260728121000_replace_cash_entries_legacy_rls_with_rbac.sql` ist nicht Teil
dieser Serie und wurde nicht veraendert.

Empfehlung:

1. P0-Serie zuerst auf Staging sequenziell testen.
2. Danach Cash-RLS-Migration erneut isoliert pruefen.
3. Cash-RLS erst anwenden, wenn P0-Finanz-/Rechnungsdaten keinen breiten
   Direktzugriff mehr haben und Kassa-Workflows weiterhin funktionieren.

## 17. Empfohlene Reihenfolge

1. Migration C: `inventory_items`
2. Migration A: `documents`
3. Migration D: `membership_fees`, `member_change_requests`
4. Migration E: `event_checkins`, `cash_month_closings`
5. Migration B: `invoice_customers`, `invoices`, `invoice_items`
6. Migration F: `audit_logs`
7. Separate Cash-RLS-Migration

Begruendung:

- Inventar ist intern und aktuell leer.
- Dokumente sind leer, aber Storage-Abhaengigkeit muss beobachtet werden.
- Mitglieds-/Beitragsdaten haben Self-Service- und Finanzbezug.
- Event/Kassa-Nebenbereiche beeinflussen Workflows, aber wenige Daten.
- Rechnungen enthalten Finanz- und personenbezogene Daten und muessen intensiv
  getestet werden.
- Audit-Logs zuletzt, weil sie von vielen Workflows als Nebenwirkung beschrieben
  werden.

## 18. Offene fachliche Entscheidungen

- Soll `audit_logs` langfristig eine eigene Permission erhalten, statt
  `systemeinstellungen.*` zu nutzen?
- Soll Audit-Logging nur noch ueber eine `SECURITY DEFINER` RPC mit internem
  Payload-Filter laufen?
- Duerfen normale Mitglieder alle `documents`-Metadaten lesen, oder nur aktive
  Member-Area-Dokumente?
- Soll `cash_month_closings` durch `kassa.edit/delete` oder nur durch
  `systemeinstellungen.*` verwaltet werden?
- Soll `event_checkins` durch `events.create/edit` oder eine eigene
  Checkin-Berechtigung geschuetzt werden?
- Soll `membership_fees` als Legacy-Tabelle mittelfristig abgeloest werden?

## 19. Naechster Codex-Auftrag

Naechster konkreter Auftrag:

Die vorbereitete P0-Serie lokal/statisch weiter pruefen und dann auf Staging
Migration C einzeln anwenden, danach Metadaten, Grants, RLS, Rollenmatrix und
Inventar-Workflows validieren. Erst nach erfolgreicher Einzelabnahme die naechste
Migration der Serie freigeben.
