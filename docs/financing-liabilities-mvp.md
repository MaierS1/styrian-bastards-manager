# Vorfinanzierungen & Verbindlichkeiten MVP

## Datenmodell

Das MVP nutzt `financing_liabilities` fuer die Stammdaten einer privaten Auslage oder sonstigen Vereinsverbindlichkeit und `financing_liability_repayments` fuer Rueckzahlungen. Betraege werden als `numeric(12,2)` gespeichert. Relevante Historie wird nicht per Cascade geloescht; Storno erfolgt ueber Status- und Zeitstempelfelder.

`financing_liability_balances` ist eine `security_invoker`-View, die Rueckzahlungen aggregiert und `repaid_amount`, `open_amount` sowie `computed_status` bereitstellt.

## Statuslogik

Der Status entsteht grundsaetzlich aus gueltigen Rueckzahlungen:

- keine Rueckzahlung: `open`
- Rueckzahlungen groesser 0 und kleiner Gesamtbetrag: `partially_paid`
- Rueckzahlungen in Hoehe des Gesamtbetrags: `paid`
- `cancelled` nur ueber explizite Storno-RPC

Ungueltige oder stornierte Rueckzahlungen werden in der Summe ignoriert. Der offene Betrag wird serverseitig mit `greatest(original_amount - repaid_amount, 0)` begrenzt.

## Kassenintegration

Die urspruengliche Vorfinanzierung veraendert den Kassenstand nicht. Eine Rueckzahlung wird ausschliesslich ueber `create_financing_liability_repayment(...)` erfasst. Die Funktion sperrt die Verbindlichkeit, prueft Status und offenen Betrag, erzeugt eine `cash_entries`-Ausgabe der Kategorie `vorfinanzierung`, legt die Rueckzahlung an und verknuepft beide Datensaetze.

Scheitert ein Teilschritt, wird die gesamte Transaktion verworfen. Storno einer Rueckzahlung erfolgt ueber `cancel_financing_liability_repayment(...)` und storniert den verknuepften Kassa-Eintrag weich.

## Berechtigungen

Das Modul nutzt das bestehende RBAC-System mit `has_app_permission('vorfinanzierungen', action)`.

- `super_admin`, `administrator`, `kassier`: view/create/edit/delete
- `vorstand`: view/create
- `schriftfuehrer`, `rechnungspruefer`: view
- `mitglied`: kein Zugriff

RLS ist fuer beide neuen Tabellen aktiv. Schreibzugriffe auf Rueckzahlungen laufen ueber RPCs.

## Migration

Neue Migration: `supabase/migrations/20260724180804_create_financing_liabilities_mvp.sql`

Sie erstellt Tabellen, Indizes, Status-Trigger, Balance-View, RPCs, Grants, RLS-Policies und die neuen Berechtigungsdatensaetze.

## Staging-Testablauf

1. Migration auf Staging anwenden.
2. Als Kassier eine Vorfinanzierung ueber 620,94 EUR anlegen.
3. Pruefen, dass Status `open` und offen 620,94 EUR ist.
4. Rueckzahlung ueber 200,00 EUR erfassen und genau eine Kassenausgabe pruefen.
5. Restzahlung ueber 420,94 EUR erfassen und Status `paid` pruefen.
6. Ueberzahlung, Nullbetrag und Rueckzahlung auf `paid`/`cancelled` pruefen.
7. Als unberechtigtes Mitglied Zugriff und RPC-Aufruf pruefen.
8. Testdatensaetze ueber Stornofunktionen bereinigen.

## Bekannte Einschraenkungen

Belegautomatisierung, Genehmigungsworkflow, Erinnerungen, PDF-Abrechnung und erweiterte Auswertungen sind nicht Teil des MVP. Mitglieder sehen eigene Forderungen noch nicht separat im Portal.
