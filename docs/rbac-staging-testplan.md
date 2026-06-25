# RBAC Staging-Testplan

1. Vor der Migration ein Backup der Supabase-Datenbank anlegen.
2. Die Migrationen in dieser Reihenfolge ausführen:
   - `20260625160000_prepare_rbac_permissions.sql`
   - `20260625170000_refine_rbac_legacy_grants_and_merch_storno.sql`
3. `docs/rbac-checks.sql` in Supabase ausführen.
4. Testaccounts prüfen:
   - `super_admin`
   - `vorstand`
   - `kassier`
   - `schriftfuehrer`
   - `rechnungspruefer`
   - `mitglied`
5. Navigation je Rolle prüfen.
6. Supabase-Zugriffe je Modul prüfen.
7. Rollback nur ueber das fruehere Backup oder einen DB-Snapshot, nicht ueber Delete-Skripte.
8. Bei Problemen nur die RBAC-Migrationen zuruecknehmen und danach die alten Funktionsdefinitionen gegen die vorige Sicherung vergleichen.

## Kurzcheck

- `super_admin` muss weiterhin Vollzugriff haben.
- Legacy-User mit `admin`, `members`, `cashier`, `checkin`, `readonly` muessen nach der Migration weiter funktionieren.
- Mitglieder ohne `auth_user_id` duerfen in der App und in den Listen weiter sichtbar bleiben, solange keine Auth-Funktion erforderlich ist.
