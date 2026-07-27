# Push Notifications

Die Notification Engine ist fuer Web Push vorbereitet. Sprint 1 stellt nur die
Subscription-Infrastruktur bereit; der fachliche Versand ueber
`notification-dispatch` bleibt bis zum Versand-Sprint deaktiviert.

## VAPID-Konfiguration

Web Push benoetigt ein VAPID-Schluesselpaar pro Umgebung. Staging und Produktion
muessen getrennte Schluessel verwenden.

Frontend:

```env
VITE_VAPID_PUBLIC_KEY=
```

Supabase Edge Functions:

```env
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=
```

Der private VAPID-Schluessel darf niemals im Frontend, in Git, in Logs oder in
Screenshots erscheinen. In `.env.example` wird deshalb nur der oeffentliche
Frontend-Platzhalter dokumentiert.

## Subject

Das VAPID Subject ist die Kontaktangabe fuer Push-Provider. Fuer die
Vereinsmanager-Umgebungen wird `mailto:office@styrian-bastards.at` verwendet,
sofern die Adresse fuer die jeweilige Umgebung freigegeben ist. Alternativ kann
die Website-URL verwendet werden.

## Lokale Entwicklung

Fuer lokale Builds kann `VITE_VAPID_PUBLIC_KEY` in einer ignorierten lokalen
Env-Datei gesetzt werden. Private VAPID-Secrets gehoeren nicht in lokale
Frontend-Env-Dateien. Sie werden nur serverseitig als Supabase Secrets gesetzt,
sobald der Push-Versand implementiert wird.

## Rotation

Bei einer Rotation muss pro Umgebung ein neues VAPID-Schluesselpaar erzeugt und
vollstaendig ausgerollt werden:

1. Supabase Secrets fuer Public Key, Private Key und Subject aktualisieren.
2. Frontend-Variable `VITE_VAPID_PUBLIC_KEY` in Vercel aktualisieren.
3. Frontend neu deployen, weil `VITE_`-Variablen beim Build eingebettet werden.
4. Bestehende Browser-Subscriptions als potenziell erneuerungsbeduerftig
   behandeln.

Nach einer Rotation koennen bestehende Browser-Subscriptions eine erneute
Registrierung benoetigen. Der Reconciliation-Flow soll deshalb beim Oeffnen der
Benachrichtigungseinstellungen den Browser- und Datenbankstatus abgleichen,
ohne automatisch einen Permission-Prompt auszuloesen.
