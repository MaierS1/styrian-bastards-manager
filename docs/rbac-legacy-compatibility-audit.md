# RBAC Legacy Compatibility Audit

Stand: 2026-07-28, Branch `staging`.

Dieser Bericht ist ein reines Audit-Artefakt. Es wurden keine Rollen, Permissions,
Policies, Daten, Legacy-Funktionen oder Migrationen geaendert.

## 1. Management Summary

Die Anwendung laeuft derzeit in einem Mischbetrieb:

- Datenbankseitig existiert das neue RBAC-Modell mit `roles`, `permissions`,
  `role_permissions`, `user_roles` und `user_permissions`.
- Auf Staging sind 2 Auth-Benutzer migriert: ein `super_admin` und ein
  `mitglied`.
- `public.has_app_permission()` ist die zentrale DB-Berechtigungsfunktion, nutzt
  aber weiterhin `members.app_role` ueber
  `public.legacy_app_role_to_rbac_role()`.
- Frontend-Sichtbarkeit und viele Aktionspruefungen nutzen noch
  `src/utils/permissions.js` und damit `members.app_role`.
- Mehrere DB-Helper sind RBAC-faehig, enthalten aber Sonderrechte ueber
  Vereinsfunktionen aus `members.role`.
- Edge Functions sind uneinheitlich: einige pruefen `has_app_permission()`,
  andere pruefen `app_role`/`role` direkt.
- Storage-Policies fuer `backups` und `receipts` verwenden RBAC-Helper; der
  Bucket `public-assets` ist oeffentlich lesbar und fuer Sponsor-Uploads ueber
  `can_manage_sponsors()` geschuetzt.
- Kritischster unabhaengiger Sicherheitsbefund: 10 public-Tabellen haben auf
  Staging kein RLS und keine Policies, darunter Rechnungs-, Dokument-, Audit- und
  Inventarbereiche.

Fazit: Legacy-Fallbacks duerfen noch nicht entfernt werden. Zuerst muessen
Frontend, Edge Functions, RLS, RPCs und Storage auf eine einheitliche
Permission-Key-Architektur umgestellt und die fehlenden Auth-Verknuepfungen
fachlich geloest werden.

## 2. Ausgangslage

Git-Ausgangslage:

- Branch: `staging`
- HEAD: `6b23643086c1a8ed02dae4cb2abf9fe92cc98f60`
- HEAD entspricht `origin/staging`
- Erwartete uncommitted Dateien:
  - `src/services/cash/cashEntriesRlsMigration.test.js`
  - `supabase/migrations/20260728121000_replace_cash_entries_legacy_rls_with_rbac.sql`

Staging-Zaehlwerte:

| Objekt | Anzahl |
| --- | ---: |
| Rollen | 7 |
| Permissions | 64 |
| Role-Permissions | 217 |
| User-Roles | 2 |
| User-Permissions | 0 |
| Auth-Benutzer | 2 |
| verknuepfte Mitglieder | 2 |

Supabase-Plattformhinweis: Grants und RLS sind getrennte Schichten. Die
Supabase-Aenderung zur expliziten Data-API-Exposition bleibt fuer neue Tabellen
relevant: <https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically>.

## 3. Legacy-Rolleninventar

Technische Legacy-App-Rollen:

| Legacy-Name | Aktuelle Verwendung | Zielbehandlung |
| --- | --- | --- |
| `admin` | Frontend-Vollzugriff, DB-Fallback zu `super_admin`, Edge Function `invite-member-user`, Einkaufssuche | zu `super_admin` migrieren, danach nur als Import-/Altwert behandeln |
| `cashier` | Frontend-Finanzrechte, Edge Function `product-offer-search`, DB-Fallback zu `kassier` | zu `kassier` migrieren oder fachlich pruefen |
| `members` | Frontend Mitglieder-/Dokument-/Medien-/Shop-Rechte, DB-Fallback aktuell nur `mitglied` | keine automatische Migration; Rechte fachlich einzeln klaeren |
| `checkin` | Frontend Event-/Kommunikationsrechte, DB-Fallback aktuell `mitglied` | keine automatische Migration; ggf. `events.*`/`kommunikation.*` als `user_permissions` |
| `readonly` | Frontend `events.view` und `dokumente.view`, DB-Fallback `mitglied` | zu `mitglied` migrierbar, sofern Auth vorhanden |

Aktuelle RBAC-Rollen:

- `super_admin`
- `administrator`
- `vorstand`
- `kassier`
- `schriftfuehrer`
- `rechnungspruefer`
- `mitglied`

Vereinsfunktionen mit Sonderlogik:

- `obmann`
- `obmann_stv`
- `kassier`
- `kassier_stv`
- `schriftfuehrer`
- `schriftfuehrer_stv`
- `vorstandsmitglied`
- `beirat`

Diese Vereinsfunktionen sollen langfristig Stammdaten bleiben und keine
technischen Rechte direkt ausloesen.

## 4. Suchumfang und Fundstellen

Gesucht wurde im gesamten Repository nach den geforderten Legacy- und
RBAC-Begriffen. Rohfund:

- 2574 Treffer in 166 Dateien.
- Historische Migrationen, Tests und Dokumente sind stark vertreten und wurden
  nicht automatisch als aktuelle Runtime-Logik bewertet.
- Aktuelle Runtime-Hotspots:
  - `src/App.jsx`
  - `src/utils/permissions.js`
  - `src/services/invoices/invoiceWorkflowService.js`
  - `src/services/notifications/domainNotificationService.js`
  - `src/services/repositories/membersRepository.js`
  - `supabase/functions/invite-member-user/index.ts`
  - `supabase/functions/product-offer-search/index.ts`
  - `supabase/functions/analyze-cash-receipt/index.ts`
  - `supabase/functions/event-notifications/index.ts`
  - `supabase/functions/membership-notifications/index.ts`
  - `supabase/functions/notification-dispatch/index.ts`
  - `supabase/functions/send-invoice-email/index.ts`

## 5. Helper-Inventar

| Name | Ort | Typ | Eingaben | Rollenfelder | Permission-Keys | Legacy-Fallback | RBAC | Zweck | Aufrufer | Ersetzbar | Risiko | Zielarchitektur |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `public.has_app_permission(p_module,p_action)` | DB `public` | SQL Function | Modul, Aktion | `members.app_role` | dynamisch aus `permissions` | ja | ja | zentrale Permission-Pruefung | RLS, RPCs, Edge Functions | erst nach Vollmigration | mittel | nur `user_permissions` + `user_roles` + `role_permissions` |
| `public.legacy_app_role_to_rbac_role(p_app_role)` | DB `public` | SQL Function | Legacy-App-Rolle | `members.app_role` | indirekt | ja | nein | Mapping-Fallback | `has_app_permission`, `get_members_with_app_permission` | nein, bis 7 Auth-Luecken und Edge/Frontend geloest | mittel | entfernen oder nur fuer historische Reports |
| `public.get_members_with_app_permission()` | DB `public` | SQL Function | Modul, Aktion | `members.app_role` | dynamisch | ja | ja | Empfaengerauflosung fuer Scheduler | `notification-scheduler` | spaeter | mittel | nur RBAC + Overrides |
| `public.is_admin_user()` | DB `public` | SQL Function | keine | `members.app_role` | `systemeinstellungen.edit` | ja | ja | Admin-Gate fuer Policies | RBAC-Tabellen, Beitrage, Member-Dokumente | ja, nach Umstellung auf konkrete Permissions | hoch | `has_app_permission('systemeinstellungen','edit')` oder spezifische Permission |
| `public.is_board_member()` | DB `public` | SQL Function | keine | `members.app_role`, `members.role` | keine | ja | nein | Vorstand-/Admin-Sondergate | `members` DELETE | ja, aber fachliche Entscheidung | hoch | `mitglieder.delete` |
| `public.can_manage_cash()` | DB `public` | SQL Function | keine | indirekt via `has_app_permission` | `kassa.edit` | indirekt | ja | Kassa-Helper | Storage receipts, Beleganalyse | ja | niedrig/mittel | direkt `has_app_permission('kassa','edit')` |
| `public.can_manage_events()` | DB `public` | SQL Function | keine | indirekt | `events.edit` | indirekt | ja | Event-Helper | Events, Registrations | ja | niedrig | direkt `has_app_permission('events','edit')` |
| `public.can_manage_members()` | DB `public` | SQL Function | keine | indirekt | `mitglieder.edit` | indirekt | ja | Mitglieder-Helper | alte Policies/Code | ja | niedrig | direkt Permission-Key |
| `public.can_manage_sponsors()` | DB `public` | SQL Function | keine | indirekt | `sponsoren.edit` | indirekt | ja | Sponsor-Helper | Sponsors, Storage public assets | ja | niedrig | direkt Permission-Key |
| `public.can_manage_media()` | DB `public` | SQL Function | keine | indirekt | `medien_presse.edit` | indirekt | ja | Media-Helper | Media-Policies, RPC | ja | niedrig | direkt Permission-Key |
| `public.can_manage_merch()` | DB `public` | SQL Function | keine | indirekt | `shop.edit` | indirekt | ja | Shop-Helper | Merch-Policies | ja | niedrig | direkt Permission-Key |
| `public.can_manage_merch_sales()` | DB `public` | SQL Function | keine | indirekt | `shop.edit` oder `kassa.edit` | indirekt | ja | Verkauf/Storno im Shop | Merch RPCs | fachlich pruefen | mittel | eigene Permission oder dokumentiertes OR |
| `public.is_purchase_manager_user()` | DB `public` | SQL Function | keine | `members.role` | `einkauf.edit` | ja | ja | Einkaufsverwaltung | Purchase-RLS | ja, nach Rollenmodell | hoch | `has_app_permission('einkauf','edit')` |
| `public.can_manage_virtual_bastard_knowledge()` | DB `public` | SQL Function | keine | `members.role` | `homepage.edit` | ja | ja | VB-Wissen verwalten | VB-RLS, Frontend analog | ja, nach Rollenmodell | mittel | `has_app_permission('homepage','edit')` |
| `isAdminRole()` | `src/utils/permissions.js` | Frontend | Rolle | `app_role` | keine | ja | teilweise | Admin-UX | `App.jsx` | ja | UX/inkonsistent | Permission-Key im Clientzustand |
| `isSuperAdminRole()` | `src/utils/permissions.js` | Frontend | Rolle | `app_role` | keine | ja | teilweise | Superadmin-UX | wenige/unklar | ja | UX | zentrale Permission |
| `hasPermission()` | `src/utils/permissions.js` | Frontend | Member/Rolle, Modul, Aktion | `app_role` | lokale Matrix | ja | lokale Kopie | UI-Sichtbarkeit | Navigation, Aktionen, Notifications | ja | mittel | aus DB-RBAC abgeleitete Permission-Map |
| `isBoardFunction()` | `src/utils/permissions.js` | Frontend | Vereinsfunktion | `members.role` | keine | ja | nein | Parked Modules / VB-Wissen | `App.jsx` | ja | mittel | fachliche Funktion ohne technische Rechte |
| `product-offer-search.isPurchaseManager()` | Edge Function | Edge Function | Member | `app_role`, `role` | keine | ja | nein | Einkaufsangebotssuche | HTTP Function | ja, dringend | hoch | `has_app_permission('einkauf','edit')` |
| `invite-member-user` Admincheck | Edge Function | Edge Function | Caller | `app_role` | keine | ja | nein | Auth-User einladen | Admin UI | ja, dringend | hoch | `has_app_permission('systemeinstellungen','edit')` plus user-role assignment design |

`public.current_user_role()` wurde auf Staging nicht als aktuelle Funktion
gefunden. Historische oder dokumentierte Vorkommen sind nicht Runtime.

## 6. `has_app_permission()`-Analyse

Aktuelle Implementierung:

1. Ermittelt die angeforderte Permission ueber `public.permissions` nach
   `module` und `action`.
2. Ermittelt den Caller ueber `auth.uid()`.
3. Prueft zuerst explizite Denies in `public.user_permissions`.
4. Wenn ein Deny existiert, Ergebnis `false`.
5. Prueft danach explizite Allows in `public.user_permissions`.
6. Prueft Rollen aus `public.user_roles` gegen `public.role_permissions`.
7. Prueft als Legacy-Fallback `public.members.app_role` ueber
   `public.legacy_app_role_to_rbac_role()`.
8. Gibt `true`, wenn mindestens eine Allow-/Role-/Fallback-Quelle passt.
9. Gibt sonst `false`.

Verhalten:

| Fall | Ergebnis |
| --- | --- |
| Mehrere Rollen | Union aller Rollen, Deny gewinnt vorher |
| Explizites Allow | erlaubt, sofern kein Deny fuer denselben Key existiert |
| Explizites Deny | blockiert vor Rollen und Legacy |
| Kein `members`-Eintrag | nur `user_roles`/`user_permissions`; sonst false |
| Keine `user_roles` | Legacy-`app_role` kann weiter erlauben |
| `service_role` ohne gesetztes JWT-Sub | `auth.uid()` ist null, Funktion typischerweise false; service_role umgeht RLS ausserhalb der Funktion |
| `anon` | keine EXECUTE-Rechte auf `has_app_permission()` |
| NULL Modul/Aktion | keine requested Permission, false |
| unbekannte Permission | false |

Technik:

- `SECURITY DEFINER`
- `search_path = public`
- EXECUTE: `authenticated`, `postgres`, `service_role`
- keine direkte Vereinsfunktionslogik
- indirekte Legacy-Abhaengigkeit ueber `members.app_role`
- keine erkennbare RLS-Rekursion in der Funktion selbst, weil
  `SECURITY DEFINER` die internen Lookups privilegiert ausfuehrt

Staging/Produktion:

- Staging hat die erste `user_roles`-Migration. Produktion ist unveraendert.
- In Produktion waere der Legacy-Fallback weiterhin zentral, solange
  `user_roles` leer oder unvollstaendig ist.
- Entfernen des Fallbacks waere aktuell produktionsgefaehrlich.

## 7. Frontend-Analyse

Aktuell produktiv wirksam:

- `src/utils/permissions.js` definiert Rollen, Legacy-Rollen, Module,
  Permission-Aktionen und lokale Role-Permission-Matrizen.
- `App.jsx` laedt `currentMember`, setzt `appRole` aus `member.app_role` und
  verwendet `hasPermission(currentMember, module, action)` fuer Navigation,
  Modulsichtbarkeit und Aktionen.
- Navigation (`src/app/navigation.js`) enthaelt Modulschluessel, aber die
  Auswertung basiert im Client weiterhin auf der lokalen Matrix.
- Create/Edit/Delete werden teilweise getrennt geprueft, aber nicht ueberall:
  - Vorfinanzierungen nutzt `view/create/edit/delete` relativ sauber.
  - Inventar-Delete nutzt `inventar.delete`.
  - Viele Modulverwaltungen nutzen nur `canManageX()` = `*.edit`.
  - Rechnungen/Kunden nutzen `canManageCash() || isAdmin()`.
  - Mitgliedsbeitraege verwenden `canEditModule('beitraege')` im UI, DB-RLS
    laeuft fuer einige Tabellen noch ueber `is_admin_user()`.
- Superadmin-Abkuerzungen existieren via `isAdminRole()` und `isAdmin()`.
- Vereinsfunktions-Sonderlogik:
  - `canAccessParkedModules()`: `isAdmin()` oder `isBoardFunction(role)`
  - `canManageVirtualBastardKnowledge()`: `homepage.edit` oder
    `isBoardFunction(role)`
  - `canManagePurchaseMember()`: `einkauf.edit` oder Board-Funktion

Bewertung:

| Bereich | Status | Bewertung |
| --- | --- | --- |
| Navigation | kompatibler Legacy-Fallback | UX-relevant, nicht Sicherheitsgrenze |
| Kassa UI | Legacy-Clientmatrix + DB RLS RBAC | nach Cash-RLS weiter pruefen |
| Beitraege UI | Permission-Key im Client, DB teils Admin-Helper | inkonsistent |
| Mitglieder UI | Client `mitglieder.edit`, DB teils RBAC, DELETE Board-Helper | kritisch fuer Delete |
| Shop/Media/Sponsoren | Helper basiert indirekt auf RBAC, Client Legacy | migrierbar |
| Backup/Admin | Client Permission-Key `backup`, DB RBAC | relativ sauber, aber Tabellen pruefen |
| Benutzer-Einladung | Frontend `isAdmin()`, Edge Function `app_role` direkt | hoch priorisiert |

## 8. RLS-Analyse

RLS-Policy-Zusammenfassung aus Staging:

| Kategorie | Tabellen |
| --- | --- |
| direkt `has_app_permission()` | `backup_jobs`, `backup_logs`, `cash_entries`, `financing_liabilities`, `financing_liability_repayments`, `in_app_notifications`, `members`, `notification_jobs`, `notification_logs`, `notification_preferences`, `notification_templates`, `push_subscriptions`, `restore_jobs` |
| `is_admin_user()` | `club_payment_settings`, `event_registrations`, `events`, `member_documents`, `membership_fee_items`, `membership_fee_periods`, `permissions`, `role_permissions`, `roles`, `user_permissions`, `user_roles` |
| `is_board_member()` | `members` DELETE |
| `is_purchase_manager_user()` | `purchase_*`, `suppliers` |
| `can_manage_*()` | `events`, `event_registrations`, `media_*`, `merch_*`, `shop_orders`, `sponsors`, `sponsor_contracts`, `virtual_bastard_knowledge` |
| Ownership ueber `auth.uid()` | eigene Profile, Registrierungen, Notification-Preferences, Push-Subscriptions, Backup/Restore-Jobs |

Tabellen ohne RLS und ohne Policies auf Staging:

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

Bewertung pro Pflichtbereich:

| Bereich/Tabelle | RLS/Helper-Status | Risiko | Zielumstellung |
| --- | --- | --- | --- |
| `cash_entries` | RLS aktiv, 4 RBAC-Policies; Cash-RLS-Prodmigration noch offen | P1 | Cash-RLS freigeben, Grants weiter haerten |
| `membership_fee_periods/items` | RLS aktiv, `is_admin_user()` | P2 | `beitraege.*` und ggf. `kassa.*` |
| `invoices`, `invoice_items`, `invoice_customers` | kein RLS | P0 | RLS + `rechnungen.*`/`kassa.*` |
| `financing_liabilities` | RLS aktiv, `vorfinanzierungen.*` | P2 | bereits nah am Ziel |
| `members` | RBAC fuer C/U/R, DELETE via `is_board_member()` | P1/P2 | DELETE auf `mitglieder.delete` |
| `documents` | kein RLS | P0 | `dokumente.*`, Member-Area-Freigaben separat |
| `member_documents` | RLS aktiv, `is_admin_user()` | P2 | `mitglieder.*` oder `dokumente.*` fachlich klaeren |
| `events`, `event_registrations` | RLS aktiv, `can_manage_events()`/`is_admin_user()` | P2 | `events.*` |
| Einkauf `purchase_*`, `suppliers` | RLS aktiv, `is_purchase_manager_user()` mit Vereinsfunktion | P1/P2 | `einkauf.*` |
| Shop/Merch | RLS aktiv, `can_manage_merch*()` | P2 | `shop.*` plus Verkaufssonderfall |
| Sponsoren | RLS aktiv, `can_manage_sponsors()` | P2 | `sponsoren.*` |
| Medien/Presse | RLS aktiv, `can_manage_media()` | P2 | `medien_presse.*` |
| Homepage/VB | RLS aktiv, Vereinsfunktionsfallback | P2 | `homepage.*` |
| Benachrichtigungen | RLS aktiv, `kommunikation.*`/Ownership | P2 | bereits weitgehend RBAC |
| Inventar | kein RLS | P0 | `inventar.*` |
| Audit Logs | kein RLS | P0 | nur Admin/System, append-only |
| Backup | RLS aktiv, Storage RBAC | P1/P2 | Grants pruefen, service flows dokumentieren |

## 9. RPC-/Function-Analyse

Sensible `SECURITY DEFINER`-Funktionen:

- `has_app_permission()`: zentral, aber Legacy-Fallback.
- `get_members_with_app_permission()`: RBAC + Legacy-Fallback fuer
  Benachrichtigungsempfaenger.
- `is_admin_user()`: `systemeinstellungen.edit` plus direkte Admin-App-Rollen.
- `is_board_member()`: direkte Vereinsfunktionsrechte.
- `is_purchase_manager_user()`: `einkauf.edit` plus Vereinsfunktionen.
- `can_manage_virtual_bastard_knowledge()`: `homepage.edit` plus
  Vereinsfunktionen.
- `create_financing_liability_repayment()`, `cancel_financing_liability*()`:
  pruefen `vorfinanzierungen.edit/delete`.
- `create_merch_sale()`, `cancel_merch_sale()`: pruefen Shop/Kassa ueber
  `can_manage_merch_sales()`.
- `save_media_item_with_channels()`: prueft `can_manage_media()`.
- Public read RPCs wie `get_public_merch_items()` und
  `get_public_virtual_bastard_knowledge()` sind bewusst oeffentlich lesend,
  muessen aber getrennt von Admin-RPCs bleiben.

Empfehlung: Helper mit nur einem Permission-Key durch direkte
`has_app_permission()`-Policies ersetzen. Fachliche OR-Helper wie
`can_manage_merch_sales()` erst nach Entscheidung behalten oder in eigene
Permissions ueberfuehren.

## 10. Storage-Analyse

Staging-Buckets:

| Bucket | Public | Limits | Policies | Legacy-Abhaengigkeit | Risiko | Ziel |
| --- | --- | --- | --- | --- | --- | --- |
| `backups` | nein | 50 MiB, JSON/octet-stream | `backup.view/create/delete` | indirekt ueber `has_app_permission()` Legacy-Fallback | hoch | rein RBAC, ggf. Pfadbindung beibehalten |
| `receipts` | nein | 15 MiB, PDF/JPEG/PNG/WebP | `can_manage_cash()` fuer `cash/%` | indirekt | hoch | `kassa.view/create/edit/delete` direkt |
| `public-assets` | ja | keine Limits | Public SELECT, Sponsor-Write via `can_manage_sponsors()` | indirekt | mittel | oeffentlich nur fuer echte Public Assets; Schreibrechte direkt `sponsoren.*` |

Nicht vorhandene Buckets auf Staging, obwohl Code/Module sie nahelegen:

- `documents`
- `member documents`
- Produkt-/Shop-Bilder als eigener Bucket
- Media/Event/Sponsor-spezifische Buckets ausser `public-assets`

`member-document-link` referenziert den privaten Bucket `documents`. Da Staging
nur `backups`, `receipts` und `public-assets` meldet, ist hier ein
Deployment-/Datenmodell-Drift zu pruefen.

## 11. Edge-Function-Analyse

| Function | Auth | Service Role | Aktuelle Berechtigung | Legacy | Risiko | Ziel |
| --- | --- | --- | --- | --- | --- | --- |
| `analyze-cash-receipt` | Bearer erforderlich | ja, Storage Download | RPC `can_manage_cash()` | indirekt | mittel | `has_app_permission('kassa','edit')` |
| `notification-dispatch` | Bearer oder interner Secret | ja | `kommunikation.create`, Self-Dispatch-Regel | indirekt | mittel | beibehalten, Fallback entfernen |
| `event-notifications` | Bearer, public registration Sonderfall | ja | `events.edit`, bei Reminder `kommunikation.create`; laedt Caller-Member nur als Existenzcheck | gering indirekt | niedrig/mittel | sauberes RBAC, Member-Existenz optional klaeren |
| `membership-notifications` | Bearer | ja | `beitraege.edit` oder `kassa.edit` | indirekt | niedrig/mittel | sauberes RBAC |
| `send-invoice-email` | Bearer | ja | `rechnungen.edit` oder `kassa.edit` | indirekt | mittel | sauberes RBAC, RLS fuer invoices ergaenzen |
| `notification-scheduler` | interner Secret | ja | `get_members_with_app_permission()` | indirekt | mittel | Funktion ohne Legacy-Fallback |
| `product-offer-search` | Bearer | ja | direkte `app_role`/`role` in `purchaseRoles` | ja direkt | hoch | `has_app_permission('einkauf','edit')` |
| `invite-member-user` | Bearer | ja | direkte Admin-App-Rollen | ja direkt | hoch | `has_app_permission('systemeinstellungen','edit')`, dabei `user_roles` mitschreiben |
| `member-document-link` | Bearer | ja | verknuepftes Mitglied + Dokument-Freigabe | keine technische Permission | mittel | ok fuer Mitgliederbereich; Bucket-Drift klaeren |
| `ai-chat` | keine Auth | nein | Visitor-Pfad, public RPC client | keine Adminrechte | niedrig/mittel | nur public Tools zulassen |

## 12. Vereinsfunktions-Sonderrechte

| Funktion | Aktuelle technische Wirkung | Bewertung | Ziel |
| --- | --- | --- | --- |
| `obmann` | Board/Purchase/VB, initial zu `super_admin` migriert | fachlich wichtig, technisch nicht dauerhaft direkt | technische Rechte ueber RBAC |
| `obmann_stv` | Board/Purchase/VB | fachlich wichtig | `administrator` oder passende Permissions |
| `kassier` | Purchase/VB-Sonderrecht in DB, Finanzrolle fachlich | teilweise fachlich | `kassier` RBAC plus ggf. `einkauf.*` explizit |
| `kassier_stv` | Purchase/VB-Sonderrecht | fachlich zu klaeren | RBAC oder `user_permissions` |
| `schriftfuehrer` | Purchase/VB-Sonderrecht | teilweise fachlich | `schriftfuehrer` RBAC plus explizite Zusatzrechte |
| `schriftfuehrer_stv` | Purchase/VB-Sonderrecht | fachlich zu klaeren | RBAC oder `user_permissions` |
| `vorstandsmitglied` | Board/Purchase/VB | fachlich Vorstand | `vorstand` RBAC |
| `beirat` | `is_board_member()` in DB, nicht in Frontend-Board-Liste | inkonsistent | fachlich entscheiden: Vorstand oder keine technische Rolle |

## 13. Rechtevergleich der migrierten Benutzer

Staging, maskierte Benutzerreferenzen:

| Gruppe | User-Ref | Permissions | RBAC erlaubt | Legacy erlaubt | Abweichung |
| --- | --- | ---: | ---: | ---: | --- |
| `super_admin` / Legacy `admin` + `obmann` | `1e7c0f89` | 64 | 64 | 64 | `equal` |
| `mitglied` / Legacy `mitglied` | `19e3b0b3` | 64 | 2 | 2 | `equal` |

Fuer alle 64 Permission-Keys gilt:

- `super_admin`: RBAC-Ergebnis = Legacy-Ergebnis = finales
  `has_app_permission()`-Ergebnis.
- `mitglied`: RBAC-Ergebnis = Legacy-Ergebnis = finales
  `has_app_permission()`-Ergebnis.
- Keine `RBAC broader`-, `Legacy broader`- oder `unclear`-Abweichung bei den
  beiden migrierten Benutzern.

Legacy-Helper-Ergebnis:

- `super_admin`: getestete Helper fuer Kassa, Mitglieder, Events, Sponsoren,
  Media, Merch, Einkauf und Virtual Bastard liefern `true`.
- `mitglied`: dieselben administrativen Helper liefern `false`; nur
  `dokumente.view` und `events.view` sind erlaubt.

## 14. Ausfallsimulation

Ohne reale Aenderung abgeleitet:

| Simulation | Erwartete Folge |
| --- | --- |
| `legacy_app_role_to_rbac_role()` entfernen | `has_app_permission()` und `get_members_with_app_permission()` brechen, solange die Funktion referenziert wird. |
| `members.app_role` nicht mehr beruecksichtigen | Benutzer ohne `user_roles` verlieren DB-Berechtigungen; Produktion waere stark betroffen. |
| Vereinsfunktionen ohne Sonderrechte | Einkauf, Virtual Bastard, `members` DELETE und Board-Zugriffe verlieren Sonderfreigaben. |
| `current_user_role()` entfernen | Auf Staging keine direkte Runtime-Funktion gefunden; historische Migrationen/Docs pruefen. |
| nur `user_roles`/`user_permissions` | Staging funktioniert fuer 2 Benutzer, aber 7 Auth-lose Mitglieder bleiben ohne App-Login; Produktion erst nach Migration sicher. |
| Frontend nur RBAC | aktuelle App kann ohne neue Permission-Quelle im Client keine Navigation/Aktionssichtbarkeit korrekt berechnen. |
| RLS ohne Legacy | Policies mit `has_app_permission()` funktionieren fuer migrierte User, aber nicht fuer nicht migrierte Produktion. |
| Edge Functions ohne Legacy | `product-offer-search` und `invite-member-user` muessen vorher umgestellt werden. |

## 15. Sicherheitsrisiken

P0 - unmittelbare Sicherheitsluecke:

- Public-Tabellen ohne RLS/Policies und mit potentiell breiten Grants:
  `audit_logs`, `documents`, `inventory_items`, `invoice_customers`,
  `invoice_items`, `invoices`, `member_change_requests`, `membership_fees`,
  `event_checkins`, `cash_month_closings`.

P1 - vor Cash-RLS-Rollout notwendig:

- Cash-RLS-Produktionsmigration separat finalisieren; aktuelle uncommitted
  Cash-RLS-Dateien nicht mit RBAC-Legacy-Arbeit vermischen.
- `product-offer-search` direkte Rollenlogik auf `einkauf.edit` umstellen.
- `invite-member-user` direkte Admin-App-Rollenlogik auf
  `systemeinstellungen.edit` umstellen und Zielverhalten fuer `user_roles`
  definieren.
- `members` DELETE von `is_board_member()` auf `mitglieder.delete` umstellen.

P2 - vor Entfernung der Legacy-Fallbacks notwendig:

- Frontend-Permission-State aus echter RBAC-Matrix laden.
- `has_app_permission()` ohne `members.app_role` vorbereiten, aber erst nach
  Produktivmigration aktivieren.
- `get_members_with_app_permission()` ohne Legacy-Fallback vorbereiten.
- `is_purchase_manager_user()` und
  `can_manage_virtual_bastard_knowledge()` durch Permissions ersetzen.
- Storage-Policies mit direkten Permission-Keys vereinheitlichen.

P3 - technische Bereinigung:

- `LEGACY_ROLE_PERMISSIONS`, `LEGACY_APP_ROLES`, `isAdminRole()`,
  `isSuperAdminRole()` entfernen.
- Legacy-Felder `members.app_role` nur nach Datenmigration und Regression
  entfernen oder read-only archivieren.
- Historische Rollback-/Check-Dokumente aktualisieren.

## 16. Zielarchitektur

Grundsaetze:

- Technische Rechte nur ueber:
  - `public.user_roles`
  - `public.role_permissions`
  - `public.user_permissions`
  - `public.has_app_permission()`
- Vereinsfunktionen bleiben fachliche Stammdaten ohne direkte technische
  Rechte.
- Frontend prueft fuer UX eine vom Backend geladene Permission-Map, ist aber
  keine Sicherheitsgrenze.
- DB, RPC und Edge Functions erzwingen die Rechte.
- `service_role` bleibt nur fuer kontrollierte serverseitige Prozesse.
- Superadmin ist zentral ueber `role_permissions` nachvollziehbar.
- Mehrere Rollen ergeben eine Union, explizites Deny in `user_permissions`
  gewinnt vor Allows/Rollen.
- Nicht verknuepfte Mitglieder haben keine technischen App-Rechte.
- Neue Benutzer erhalten bei Einladung sofort eine eindeutige `user_roles`-
  Zuordnung.
- Rollenwechsel erfolgt durch neue `user_roles`/`user_permissions`, nicht durch
  `members.app_role`.
- Austritt/Deaktivierung muss Login-/Session- und Rollenverhalten explizit
  regeln; mindestens keine administrativen Rechte fuer inaktive Mitglieder.

Endgueltige Legacy-Behandlung:

| Legacy | Ziel |
| --- | --- |
| `admin` | `super_admin` |
| `cashier` | `kassier` oder fachlich individuelle Zusatzrechte |
| `readonly` | `mitglied` |
| `members` | keine automatische Rolle; fachliche Einzelentscheidung |
| `checkin` | keine automatische Rolle; ggf. `events.*`/`kommunikation.*` |

## 17. Bereinigungsplan

### Schritt 1 - Tests und Beobachtbarkeit

- Dateien: Tests fuer `has_app_permission`, Edge Function Auth, RLS-Audit.
- Tabellen/Funktionen: keine Aenderung.
- Voraussetzung: Staging-Daten stabil.
- Tests: negative/positive Permission-Matrix.
- Rueckfall: nur Tests entfernen.
- Abnahme: alle aktuellen Legacy- und RBAC-Faelle dokumentiert.
- Risiko: klein.

### Schritt 2 - Frontend auf Permission-Keys

- Dateien: `src/utils/permissions.js`, `src/App.jsx`, Navigation/Guards.
- Voraussetzung: API/Query fuer effektive Permissions je User.
- Tests: Navigation und Aktionen je Rolle.
- Rueckfall: lokale Matrix beibehalten.
- Abnahme: keine direkte Rollenentscheidung fuer technische Rechte.
- Risiko: mittel.

### Schritt 3 - DB-Helper vereinheitlichen

- Funktionen: `is_admin_user`, `can_manage_*`,
  `is_purchase_manager_user`, `can_manage_virtual_bastard_knowledge`.
- Ziel: direkte `has_app_permission()`-Pruefungen.
- Tests: RPC- und Policy-Simulation.
- Risiko: mittel.

### Schritt 4 - RLS-Policies schrittweise RBAC-only

- Tabellen: zuerst `cash_entries`, dann Mitglieder/Beitraege, danach Shop,
  Einkauf, Medien, Sponsoren.
- Voraussetzung: alle produktiven User in `user_roles`.
- Tests: CRUD-Matrix je Modul.
- Risiko: hoch.

### Schritt 5 - Edge Functions und RPCs

- Dateien: `invite-member-user`, `product-offer-search`,
  `notification-*`, `send-invoice-email`, `analyze-cash-receipt`.
- Ziel: keine direkte `app_role`/`role`-Pruefung.
- Tests: 401/403/200 je Permission.
- Risiko: mittel.

### Schritt 6 - Storage-Policies

- Buckets: `backups`, `receipts`, `public-assets`; fehlende Buckets klaeren.
- Ziel: direkte Permission-Keys, Pfadbindung beibehalten.
- Tests: Upload/Read/Delete negativ und positiv.
- Risiko: hoch fuer Belege/Backups.

### Schritt 7 - verbleibende Auth-Benutzer migrieren

- Tabellen: `user_roles`, optional `user_permissions`.
- Voraussetzung: 7 Auth-Luecken fachlich geloest.
- Tests: Dry-Run vorher/nachher.
- Risiko: mittel.

### Schritt 8 - Legacy-Fallbacks deaktivieren

- Funktionen: `has_app_permission`, `get_members_with_app_permission`.
- Vorgehen: Feature-/Rollback-Migration, Fallback erst deaktivieren, nicht
  loeschen.
- Tests: komplette Regression.
- Risiko: hoch.

### Schritt 9 - Regressionstests

- Bereiche: Frontend, RLS, RPC, Edge, Storage, negative Tests.
- Abnahme: keine `Legacy broader`-Abweichung fuer aktive Benutzer.
- Risiko: mittel.

### Schritt 10 - Legacy entfernen

- Entfernen: `LEGACY_ROLE_PERMISSIONS`, `LEGACY_APP_ROLES`,
  `legacy_app_role_to_rbac_role`, direkte App-Rollenpruefungen, ggf.
  `members.app_role`.
- Voraussetzung: Produktionsbetrieb stabil ohne Fallback.
- Risiko: mittel/gross.

## 18. Priorisierung

| Prio | Bereich | Risiko | Empfehlung | Aufwand |
| --- | --- | --- | --- | --- |
| P0 | Tabellen ohne RLS | Datenexposition ueber Data API/Grants | RLS + minimale Grants fuer Rechnungen, Dokumente, Audit, Inventar, Mitgliedsdaten | gross |
| P1 | Cash-RLS | Produktionsrollout blockiert | Cash-RLS-Migration getrennt validieren und anwenden | mittel |
| P1 | `invite-member-user` | Adminrechte ueber Legacy-App-Rolle | auf `systemeinstellungen.edit` und neue `user_roles`-Zuordnung umstellen | mittel |
| P1 | `product-offer-search` | Einkauf via `app_role`/`role` direkt | auf `einkauf.edit` umstellen | klein |
| P1 | `members` DELETE | Vereinsfunktion loest Delete aus | auf `mitglieder.delete` umstellen | klein/mittel |
| P2 | Frontend-Matrix | UI inkonsistent zu DB | echte effektive Permissions laden | gross |
| P2 | `has_app_permission` Legacy-Fallback | blockiert Legacy-Entfernung | Fallback-Deaktivierung vorbereiten | mittel |
| P2 | Purchase/VB-Sonderrechte | Vereinsfunktion = Technikrecht | in Permissions ueberfuehren | mittel |
| P2 | Storage | indirekte Legacy-Abhaengigkeit | Policies direkt auf Permission-Keys | mittel |
| P3 | Legacy-Code | technische Schulden | nach stabiler Migration entfernen | mittel |

## 19. Offene fachliche Entscheidungen

- Soll `beirat` technische Vorstand-Rechte bekommen oder nur Stammdatum sein?
- Soll `kassier_stv` dieselben technischen Rechte wie `kassier` erhalten?
- Soll `schriftfuehrer_stv` dieselben Rechte wie `schriftfuehrer` erhalten?
- Welche Rechte ersetzen Legacy `members` exakt?
- Welche Rechte ersetzen Legacy `checkin` exakt?
- Soll `can_manage_merch_sales()` als OR aus `shop.edit`/`kassa.edit`
  bestehen bleiben oder eine eigene Permission erhalten?
- Welche Tabellen duerfen oeffentlich oder fuer alle Auth-Benutzer lesbar sein?
- Wie werden die 7 Mitglieder ohne Auth-Verknuepfung behandelt?

## 20. Empfohlener naechster Umsetzungsschritt

Naechster konkreter Schritt:

1. Ein separates P0-Hardening-Audit fuer die 10 public-Tabellen ohne RLS
   erstellen.
2. Danach `product-offer-search` und `invite-member-user` auf
   `has_app_permission()` umstellen.
3. Erst danach die Cash-RLS-Produktionsmigration final freigeben.

Die Legacy-Fallbacks in `has_app_permission()` sollten erst nach vollstaendiger
Produktivmigration aller Auth-Benutzer deaktiviert werden.
