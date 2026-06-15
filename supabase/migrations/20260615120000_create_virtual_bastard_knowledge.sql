create or replace function public.can_manage_virtual_bastard_knowledge()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members
    where auth_user_id = auth.uid()
      and (
        app_role = 'admin'
        or role in ('obmann', 'obmann_stv', 'schriftfuehrer', 'schriftfuehrer_stv', 'kassier', 'kassier_stv')
      )
  );
$$;

create table if not exists public.virtual_bastard_knowledge (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  keywords text[] not null default '{}',
  answer text not null,
  links jsonb not null default '[]'::jsonb,
  quick_replies jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  is_public boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid null references auth.users(id) on delete set null,
  updated_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint virtual_bastard_knowledge_title_not_blank check (length(trim(title)) > 0),
  constraint virtual_bastard_knowledge_category_not_blank check (length(trim(category)) > 0),
  constraint virtual_bastard_knowledge_answer_not_blank check (length(trim(answer)) > 0),
  constraint virtual_bastard_knowledge_links_array check (jsonb_typeof(links) = 'array'),
  constraint virtual_bastard_knowledge_quick_replies_array check (jsonb_typeof(quick_replies) = 'array')
);

create unique index if not exists virtual_bastard_knowledge_title_category_uidx
  on public.virtual_bastard_knowledge (title, category);

create index if not exists virtual_bastard_knowledge_public_idx
  on public.virtual_bastard_knowledge (is_active, is_public, sort_order, title);

create index if not exists virtual_bastard_knowledge_category_idx
  on public.virtual_bastard_knowledge (category);

drop trigger if exists set_virtual_bastard_knowledge_updated_at on public.virtual_bastard_knowledge;

create trigger set_virtual_bastard_knowledge_updated_at
  before update on public.virtual_bastard_knowledge
  for each row
  execute function public.set_updated_at();

alter table public.virtual_bastard_knowledge enable row level security;

revoke all on table public.virtual_bastard_knowledge from public;
revoke all on table public.virtual_bastard_knowledge from anon;
grant select on table public.virtual_bastard_knowledge to anon;
grant select, insert, update, delete on table public.virtual_bastard_knowledge to authenticated;

drop policy if exists "public can read active public virtual bastard knowledge" on public.virtual_bastard_knowledge;
create policy "public can read active public virtual bastard knowledge"
  on public.virtual_bastard_knowledge
  for select
  to anon, authenticated
  using (is_active = true and is_public = true);

drop policy if exists "board can read virtual bastard knowledge" on public.virtual_bastard_knowledge;
create policy "board can read virtual bastard knowledge"
  on public.virtual_bastard_knowledge
  for select
  to authenticated
  using (public.can_manage_virtual_bastard_knowledge());

drop policy if exists "board can insert virtual bastard knowledge" on public.virtual_bastard_knowledge;
create policy "board can insert virtual bastard knowledge"
  on public.virtual_bastard_knowledge
  for insert
  to authenticated
  with check (public.can_manage_virtual_bastard_knowledge());

drop policy if exists "board can update virtual bastard knowledge" on public.virtual_bastard_knowledge;
create policy "board can update virtual bastard knowledge"
  on public.virtual_bastard_knowledge
  for update
  to authenticated
  using (public.can_manage_virtual_bastard_knowledge())
  with check (public.can_manage_virtual_bastard_knowledge());

drop policy if exists "board can delete virtual bastard knowledge" on public.virtual_bastard_knowledge;
create policy "board can delete virtual bastard knowledge"
  on public.virtual_bastard_knowledge
  for delete
  to authenticated
  using (public.can_manage_virtual_bastard_knowledge());

create or replace function public.get_public_virtual_bastard_knowledge()
returns table (
  id uuid,
  title text,
  category text,
  keywords text[],
  answer text,
  links jsonb,
  quick_replies jsonb,
  sort_order integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    virtual_bastard_knowledge.id,
    virtual_bastard_knowledge.title,
    virtual_bastard_knowledge.category,
    virtual_bastard_knowledge.keywords,
    virtual_bastard_knowledge.answer,
    virtual_bastard_knowledge.links,
    virtual_bastard_knowledge.quick_replies,
    virtual_bastard_knowledge.sort_order
  from public.virtual_bastard_knowledge
  where is_active = true
    and is_public = true
  order by sort_order asc, title asc;
$$;

grant execute on function public.get_public_virtual_bastard_knowledge() to anon, authenticated;
grant execute on function public.can_manage_virtual_bastard_knowledge() to authenticated;

with seed_data as (
  select *
  from jsonb_to_recordset($vb_seed$[
  {
    "title": "Mitgliedschaft",
    "category": "mitgliedschaft",
    "keywords": [
      "mitgliedschaft",
      "mitglied",
      "mitglied werden",
      "beitreten",
      "aufnahme",
      "verein"
    ],
    "answer": "Sehr gute Richtung. Mitglied bei den Styrian Bastards kannst du werden, wenn du den ATSE Graz Hockey als Fan oder Unterstuetzer begleiten willst. Der Einstieg laeuft ueber die Seite Mitglied werden; dort findest du Antrag und die wichtigsten Infos.",
    "links": [
      {
        "label": "Mitglied werden",
        "href": "/mitglied-werden.html"
      },
      {
        "label": "FAQ",
        "href": "/faq.html"
      }
    ],
    "quick_replies": [
      "Mitglied werden",
      "Probejahr erklaeren",
      "Mitgliedsbeitraege"
    ],
    "is_active": true,
    "is_public": true,
    "sort_order": 1
  },
  {
    "title": "Vollmitglied",
    "category": "mitgliedschaft",
    "keywords": [
      "vollmitglied",
      "aktive mitgliedschaft",
      "stimmberechtigt",
      "rechte",
      "pflichten"
    ],
    "answer": "Eine Vollmitgliedschaft kostet aktuell 70 EUR pro Jahr. Wenn du aktiv am Vereinsleben teilnehmen und den Verein dauerhaft begleiten moechtest, ist das die passende Mitgliedschaft.",
    "links": [
      {
        "label": "Mitglied werden",
        "href": "/mitglied-werden.html"
      },
      {
        "label": "FAQ",
        "href": "/faq.html"
      }
    ],
    "quick_replies": [
      "Mitglied werden",
      "Probejahr erklaeren",
      "Kontakt"
    ],
    "is_active": true,
    "is_public": true,
    "sort_order": 2
  },
  {
    "title": "Foerdermitglied",
    "category": "mitgliedschaft",
    "keywords": [
      "foerdermitglied",
      "foerderer",
      "unterstuetzen",
      "supporter",
      "finanziell"
    ],
    "answer": "Als Foerdermitglied unterstuetzt du die Styrian Bastards mit 40 EUR pro Jahr. Das passt gut, wenn du den Verein staerken willst, ohne aktiv in der Vereinsarbeit dabei zu sein.",
    "links": [
      {
        "label": "Mitglied werden",
        "href": "/mitglied-werden.html"
      },
      {
        "label": "Kontakt",
        "href": "/kontakt.html"
      }
    ],
    "quick_replies": [
      "Mitglied werden",
      "Sponsoring-Infos",
      "Kontakt"
    ],
    "is_active": true,
    "is_public": true,
    "sort_order": 3
  },
  {
    "title": "Probejahr",
    "category": "mitgliedschaft",
    "keywords": [
      "probejahr",
      "probe",
      "erstes jahr",
      "kennenlernen",
      "aufnahme"
    ],
    "answer": "Das Probejahr ist der entspannte Einstieg in den Verein. Du lernst die Styrian Bastards kennen, wir lernen dich kennen, und danach entscheidet der Vorstand ueber die weitere Aufnahme als Vollmitglied.",
    "links": [
      {
        "label": "Mitglied werden",
        "href": "/mitglied-werden.html"
      },
      {
        "label": "FAQ",
        "href": "/faq.html"
      }
    ],
    "quick_replies": [
      "Mitglied werden",
      "Vollmitglied",
      "Mitgliedsbeitraege"
    ],
    "is_active": true,
    "is_public": true,
    "sort_order": 4
  },
  {
    "title": "Mitgliedsbeitraege",
    "category": "mitgliedschaft",
    "keywords": [
      "mitgliedsbeitrag",
      "mitgliedsbeitraege",
      "beitrag",
      "kosten",
      "preis",
      "gebuehr",
      "jahresbeitrag"
    ],
    "answer": "Kurz und sauber: Probejahr 40 EUR im ersten Jahr, Foerdermitglied 40 EUR pro Jahr und Vollmitglied 70 EUR pro Jahr. Wenn du unsicher bist, welcher Weg passt, hilft dir die FAQ oder der direkte Kontakt.",
    "links": [
      {
        "label": "FAQ",
        "href": "/faq.html"
      },
      {
        "label": "Kontakt",
        "href": "/kontakt.html"
      }
    ],
    "quick_replies": [
      "Mitglied werden",
      "Probejahr erklaeren",
      "Kontakt"
    ],
    "is_active": true,
    "is_public": true,
    "sort_order": 5
  },
  {
    "title": "Events",
    "category": "events",
    "keywords": [
      "events",
      "veranstaltungen",
      "termine",
      "treffen",
      "turniere",
      "kalender"
    ],
    "answer": "Unsere oeffentlichen Events findest du im Event-Bereich. Dort geht es je nach Saison um Treffen, Fanfahrten, Vereinsveranstaltungen oder Turniere.",
    "links": [
      {
        "label": "Events anzeigen",
        "href": "/index.html#events"
      },
      {
        "label": "FAQ",
        "href": "/faq.html"
      }
    ],
    "quick_replies": [
      "Naechstes Event",
      "Eventseite oeffnen",
      "Fanfahrten"
    ],
    "is_active": true,
    "is_public": true,
    "sort_order": 6
  },
  {
    "title": "Fanfahrten",
    "category": "events",
    "keywords": [
      "fanfahrt",
      "fanfahrten",
      "auswaerts",
      "auswaertsspiel",
      "fahrt",
      "bus"
    ],
    "answer": "Fanfahrten werden ueber die oeffentlichen Events oder Vereinsinfos angekuendigt. Wenn gerade nichts sichtbar ist, lohnt sich ein spaeterer Blick auf die Eventseite.",
    "links": [
      {
        "label": "Events",
        "href": "/index.html#events"
      },
      {
        "label": "Kontakt",
        "href": "/kontakt.html"
      }
    ],
    "quick_replies": [
      "Naechstes Event",
      "Eventseite oeffnen",
      "Kontakt"
    ],
    "is_active": true,
    "is_public": true,
    "sort_order": 7
  },
  {
    "title": "Shop & Fanartikel",
    "category": "shop",
    "keywords": [
      "shop",
      "fanartikel",
      "merch",
      "merchandise",
      "artikel"
    ],
    "answer": "Fanartikel findest du im Shop-Bereich der Homepage. Der Virtual Bastard kann dir den Weg zeigen; Details und Anfragen laufen direkt ueber die Shop-Seite.",
    "links": [
      {
        "label": "Shop & Fanartikel",
        "href": "/merch.html"
      }
    ],
    "quick_replies": [
      "Fanartikel anzeigen",
      "Shop oeffnen",
      "Kontakt"
    ],
    "is_active": true,
    "is_public": true,
    "sort_order": 8
  },
  {
    "title": "Sponsoren",
    "category": "sponsoren",
    "keywords": [
      "sponsor",
      "sponsoren",
      "sponsoring",
      "partner",
      "unterstuetzer",
      "werbung"
    ],
    "answer": "Sponsoren, Partner und Unterstuetzer helfen uns bei Veranstaltungen, Fanprojekten und Vereinsaktivitaeten. Wenn du uns unterstuetzen willst, ist die Sponsoren-Seite der beste Startpunkt.",
    "links": [
      {
        "label": "Sponsoren",
        "href": "/sponsoren.html"
      },
      {
        "label": "Kontakt",
        "href": "/kontakt.html"
      }
    ],
    "quick_replies": [
      "Sponsoren anzeigen",
      "Sponsoring-Infos",
      "Kontakt"
    ],
    "is_active": true,
    "is_public": true,
    "sort_order": 9
  },
  {
    "title": "Presse",
    "category": "presse",
    "keywords": [
      "presse",
      "news",
      "medien",
      "bericht",
      "artikel",
      "oeffentlichkeit"
    ],
    "answer": "Presse- und Medienbeitraege findest du im Pressebereich. Fuer Anfragen fuehrt dich der Virtual Bastard direkt zur Kontaktseite.",
    "links": [
      {
        "label": "Presse",
        "href": "/presse.html"
      },
      {
        "label": "Kontakt",
        "href": "/kontakt.html"
      }
    ],
    "quick_replies": [
      "Presse & News",
      "Kontakt",
      "FAQ"
    ],
    "is_active": true,
    "is_public": true,
    "sort_order": 10
  },
  {
    "title": "Kontakt",
    "category": "kontakt",
    "keywords": [
      "kontakt",
      "fragen",
      "anschreiben",
      "erreichen"
    ],
    "answer": "Wenn du uns direkt erreichen willst, fuehrt dich der Virtual Bastard zur Kontaktseite. Dort bist du richtig fuer Fragen zu Mitgliedschaft, Events, Sponsoring oder Presse.",
    "links": [
      {
        "label": "Kontakt",
        "href": "/kontakt.html"
      }
    ],
    "quick_replies": [
      "FAQ oeffnen",
      "Mitglied werden",
      "Sponsoren"
    ],
    "is_active": true,
    "is_public": true,
    "sort_order": 11
  },
  {
    "title": "FAQ",
    "category": "faq",
    "keywords": [
      "faq",
      "haeufige fragen",
      "fragen",
      "antworten",
      "hilfe"
    ],
    "answer": "In der FAQ findest du die schnellen Antworten zu Mitgliedschaft, Beitraegen, Probejahr, Aufnahme und Kontakt. Praktisch, wenn du erst einmal querlesen willst.",
    "links": [
      {
        "label": "FAQ",
        "href": "/faq.html"
      },
      {
        "label": "Kontakt",
        "href": "/kontakt.html"
      }
    ],
    "quick_replies": [
      "Haeufige Fragen",
      "Kontakt",
      "Mitglied werden"
    ],
    "is_active": true,
    "is_public": true,
    "sort_order": 12
  },
  {
    "title": "Vereinsgeschichte",
    "category": "verein",
    "keywords": [
      "vereinsgeschichte",
      "geschichte",
      "historie",
      "wer seid ihr",
      "seit wann gibt es euch",
      "entstehung"
    ],
    "answer": "Die Styrian Bastards sind ein Fanclub aus Graz und begleiten den ATSE Graz Hockey als offizieller Fanclub. Laut Homepage wurde der Verein 2023 gegruendet.",
    "links": [
      {
        "label": "FAQ",
        "href": "/faq.html"
      },
      {
        "label": "Kontakt",
        "href": "/kontakt.html"
      }
    ],
    "quick_replies": [
      "Gruendung",
      "ATSE Graz",
      "Vereinszweck"
    ],
    "is_active": true,
    "is_public": true,
    "sort_order": 13
  },
  {
    "title": "Gruendung",
    "category": "verein",
    "keywords": [
      "gruendung",
      "gegruendet",
      "2023",
      "wann gegruendet",
      "vereinsgruendung"
    ],
    "answer": "Laut Homepage-Kachel wurden die Styrian Bastards 2023 gegruendet. Seitdem geht es darum, Fanleben, Gemeinschaft und Support rund um den ATSE Graz Hockey sichtbar zu machen.",
    "links": [
      {
        "label": "FAQ",
        "href": "/faq.html"
      }
    ],
    "quick_replies": [
      "Vereinsgeschichte",
      "Vereinszweck",
      "Mitglied werden"
    ],
    "is_active": true,
    "is_public": true,
    "sort_order": 14
  },
  {
    "title": "ATSE Graz Hockey",
    "category": "verein",
    "keywords": [
      "atse",
      "atse graz",
      "atse graz hockey",
      "hockey",
      "eishockey",
      "offizieller fanclub"
    ],
    "answer": "Die Styrian Bastards sind der offizielle Fanclub des ATSE Graz Hockey. Der Fokus liegt auf Support, Gemeinschaft, Veranstaltungen und Fanaktivitaeten rund um den Verein.",
    "links": [
      {
        "label": "Events",
        "href": "/index.html#events"
      },
      {
        "label": "Kontakt",
        "href": "/kontakt.html"
      }
    ],
    "quick_replies": [
      "Wer seid ihr",
      "Vereinsfarben",
      "Mitglied werden"
    ],
    "is_active": true,
    "is_public": true,
    "sort_order": 15
  },
  {
    "title": "Vereinszweck",
    "category": "verein",
    "keywords": [
      "vereinszweck",
      "was macht ihr",
      "warum gibt es euch",
      "zweck",
      "aufgabe",
      "fanclub"
    ],
    "answer": "Kurz gesagt: Wir buendeln Fanleben rund um den ATSE Graz Hockey. Dazu gehoeren Support, Treffen, Fanfahrten, Events und ein Vereinsumfeld, in dem neue Leute gut andocken koennen.",
    "links": [
      {
        "label": "Mitglied werden",
        "href": "/mitglied-werden.html"
      },
      {
        "label": "Events",
        "href": "/index.html#events"
      }
    ],
    "quick_replies": [
      "Mitgliedervorteile",
      "Events",
      "Kontakt"
    ],
    "is_active": true,
    "is_public": true,
    "sort_order": 16
  },
  {
    "title": "Vereinsfarben",
    "category": "verein",
    "keywords": [
      "vereinsfarben",
      "farben",
      "schwarz weiss",
      "schwarz weiß",
      "rot weiss blau",
      "rot weiss blau",
      "clubfarben"
    ],
    "answer": "Die Styrian Bastards treten hauptsaechlich in Schwarz und Weiss auf. Je nach Kontext tauchen auch ATSE-Farben wie Rot, Weiss und Blau auf.",
    "links": [
      {
        "label": "Shop & Fanartikel",
        "href": "/merch.html"
      }
    ],
    "quick_replies": [
      "Fanartikel anzeigen",
      "ATSE Graz",
      "Shop oeffnen"
    ],
    "is_active": true,
    "is_public": true,
    "sort_order": 17
  },
  {
    "title": "Vorstand",
    "category": "verein",
    "keywords": [
      "vorstand",
      "obmann",
      "leitung",
      "wer fuehrt",
      "verantwortlich",
      "funktionaere"
    ],
    "answer": "Der Vorstand organisiert den Verein und entscheidet bei Themen wie Aufnahme oder Vereinsentwicklung. Konkrete Namen nenne ich hier nur, wenn sie oeffentlich auf der Homepage stehen; fuer Details nutze bitte Kontakt oder Impressum.",
    "links": [
      {
        "label": "Kontakt",
        "href": "/kontakt.html"
      },
      {
        "label": "Impressum",
        "href": "/impressum.html"
      }
    ],
    "quick_replies": [
      "Kontakt",
      "Impressum",
      "Mitgliedschaft"
    ],
    "is_active": true,
    "is_public": true,
    "sort_order": 18
  },
  {
    "title": "Mitgliedervorteile",
    "category": "mitgliedschaft",
    "keywords": [
      "mitgliedervorteile",
      "vorteile",
      "was bekomme ich",
      "was bringt mitgliedschaft",
      "warum mitglied",
      "community"
    ],
    "answer": "Als Mitglied bist du naeher am Vereinsleben: du bekommst Anschluss an die Community, kannst dich einbringen und bist bei Fanaktivitaeten besser angebunden. Verbindliche Details stehen in FAQ und Mitgliedsantrag.",
    "links": [
      {
        "label": "Mitglied werden",
        "href": "/mitglied-werden.html"
      },
      {
        "label": "FAQ",
        "href": "/faq.html"
      }
    ],
    "quick_replies": [
      "Vollmitglied",
      "Probejahr erklaeren",
      "Mitgliedsbeitraege"
    ],
    "is_active": true,
    "is_public": true,
    "sort_order": 19
  },
  {
    "title": "Probejahr Details",
    "category": "mitgliedschaft",
    "keywords": [
      "probejahr details",
      "probejahr erklaeren",
      "probejahr kosten",
      "erstes jahr",
      "neues mitglied"
    ],
    "answer": "Das Probejahr kostet 40 EUR im ersten Jahr und ist zum Kennenlernen gedacht. Danach wird entschieden, ob die weitere Aufnahme als Vollmitglied passt.",
    "links": [
      {
        "label": "Mitglied werden",
        "href": "/mitglied-werden.html"
      },
      {
        "label": "FAQ",
        "href": "/faq.html"
      }
    ],
    "quick_replies": [
      "Vollmitglied Details",
      "Mitgliedsbeitraege",
      "Kontakt"
    ],
    "is_active": true,
    "is_public": true,
    "sort_order": 20
  },
  {
    "title": "Foerdermitglied Details",
    "category": "mitgliedschaft",
    "keywords": [
      "foerdermitglied details",
      "foerdermitglied kosten",
      "unterstuetzen ohne aktiv",
      "foerderer details"
    ],
    "answer": "Foerdermitgliedschaft bedeutet: du unterstuetzt den Verein mit 40 EUR pro Jahr, ohne aktiv in der Vereinsarbeit dabei sein zu muessen. Das ist ein guter Weg, wenn du Support zeigen willst.",
    "links": [
      {
        "label": "Mitglied werden",
        "href": "/mitglied-werden.html"
      },
      {
        "label": "Kontakt",
        "href": "/kontakt.html"
      }
    ],
    "quick_replies": [
      "Mitglied werden",
      "Sponsoren",
      "Kontakt"
    ],
    "is_active": true,
    "is_public": true,
    "sort_order": 21
  },
  {
    "title": "Vollmitglied Details",
    "category": "mitgliedschaft",
    "keywords": [
      "vollmitglied details",
      "vollmitglied kosten",
      "aktive mitgliedschaft details",
      "was kostet ein vollmitglied"
    ],
    "answer": "Die Vollmitgliedschaft kostet aktuell 70 EUR pro Jahr. Sie ist fuer alle gedacht, die aktiv am Vereinsleben teilnehmen und den Fanclub dauerhaft mittragen wollen.",
    "links": [
      {
        "label": "Mitglied werden",
        "href": "/mitglied-werden.html"
      },
      {
        "label": "FAQ",
        "href": "/faq.html"
      }
    ],
    "quick_replies": [
      "Probejahr",
      "Mitgliedsbeitraege",
      "Kontakt"
    ],
    "is_active": true,
    "is_public": true,
    "sort_order": 22
  },
  {
    "title": "Cornhole Turnier",
    "category": "events",
    "keywords": [
      "cornhole",
      "cornhole turnier",
      "turnier",
      "wurfspiel",
      "was ist mit cornhole"
    ],
    "answer": "Cornhole ist eines der Eventthemen, die bei den Styrian Bastards auftauchen koennen. Wenn ein Turnier oeffentlich geplant ist, findest du es im Event-Bereich.",
    "links": [
      {
        "label": "Events",
        "href": "/index.html#events"
      },
      {
        "label": "Kontakt",
        "href": "/kontakt.html"
      }
    ],
    "quick_replies": [
      "Naechstes Event",
      "Events anzeigen",
      "Kontakt"
    ],
    "is_active": true,
    "is_public": true,
    "sort_order": 23
  },
  {
    "title": "Veranstaltungen",
    "category": "events",
    "keywords": [
      "veranstaltungen",
      "veranstaltung",
      "eventarten",
      "was macht ihr bei events",
      "treffen",
      "vereinsveranstaltungen"
    ],
    "answer": "Zu unseren Veranstaltungen koennen Treffen, Fanfahrten, Turniere und Vereinsaktivitaeten gehoeren. Oeffentliche Termine zeigt dir der Event-Bereich live an.",
    "links": [
      {
        "label": "Events anzeigen",
        "href": "/index.html#events"
      }
    ],
    "quick_replies": [
      "Naechstes Event",
      "Fanfahrten",
      "Cornhole"
    ],
    "is_active": true,
    "is_public": true,
    "sort_order": 24
  },
  {
    "title": "Sponsoring-Pakete",
    "category": "sponsoren",
    "keywords": [
      "sponsoring pakete",
      "sponsorpaket",
      "werbepaket",
      "sponsoring infos",
      "sponsoring moeglichkeiten"
    ],
    "answer": "Sponsoring kann je nach Bedarf unterschiedlich aussehen. Der Virtual Bastard gibt hier keine verbindlichen Pakete aus; fuer konkrete Moeglichkeiten fuehrt der beste Weg ueber Sponsoren-Seite oder Kontakt.",
    "links": [
      {
        "label": "Sponsoren",
        "href": "/sponsoren.html"
      },
      {
        "label": "Kontakt",
        "href": "/kontakt.html"
      }
    ],
    "quick_replies": [
      "Sponsor werden",
      "Sponsoren anzeigen",
      "Kontakt"
    ],
    "is_active": true,
    "is_public": true,
    "sort_order": 25
  },
  {
    "title": "Sponsor werden",
    "category": "sponsoren",
    "keywords": [
      "sponsor werden",
      "wie werde ich sponsor",
      "partner werden",
      "unterstuetzer werden",
      "sponsoring anfrage"
    ],
    "answer": "Wenn du Sponsor oder Partner werden moechtest, schau dir zuerst die Sponsoren-Seite an und melde dich danach direkt ueber Kontakt. Dann kann alles konkret und sauber besprochen werden.",
    "links": [
      {
        "label": "Sponsoren",
        "href": "/sponsoren.html"
      },
      {
        "label": "Kontakt",
        "href": "/kontakt.html"
      }
    ],
    "quick_replies": [
      "Sponsoring-Pakete",
      "Kontakt",
      "Foerdermitglied"
    ],
    "is_active": true,
    "is_public": true,
    "sort_order": 26
  },
  {
    "title": "Pressekit",
    "category": "presse",
    "keywords": [
      "pressekit",
      "pressemappe",
      "presse material",
      "medienmaterial",
      "logo anfrage"
    ],
    "answer": "Fuer Presse- oder Medienmaterial nutze bitte den Pressebereich oder die Kontaktseite. Ich gebe hier keine verbindlichen Freigaben fuer Logos, Bilder oder Texte.",
    "links": [
      {
        "label": "Presse",
        "href": "/presse.html"
      },
      {
        "label": "Kontakt",
        "href": "/kontakt.html"
      }
    ],
    "quick_replies": [
      "Presse & News",
      "Radio Helsinki",
      "Kontakt"
    ],
    "is_active": true,
    "is_public": true,
    "sort_order": 27
  },
  {
    "title": "Radio Helsinki",
    "category": "presse",
    "keywords": [
      "radio helsinki",
      "radio",
      "helsinki",
      "interview",
      "sendung",
      "was war bei radio helsinki"
    ],
    "answer": "Radio Helsinki ist ein oeffentlicher Medienbezug im Pressebereich. Wenn dazu ein Beitrag sichtbar ist, findest du ihn bei Presse und News.",
    "links": [
      {
        "label": "Presse",
        "href": "/presse.html"
      }
    ],
    "quick_replies": [
      "Presse & News",
      "Pressekit",
      "Kontakt"
    ],
    "is_active": true,
    "is_public": true,
    "sort_order": 28
  },
  {
    "title": "Shop & Fanartikel Details",
    "category": "shop",
    "keywords": [
      "shop details",
      "fanartikel details",
      "merch details",
      "was gibt es im shop",
      "fanartikel kaufen"
    ],
    "answer": "Im Shop-Bereich werden oeffentlich sichtbare Fanartikel angezeigt. Der Virtual Bastard zeigt keine Bestellungen oder persoenlichen Kaufdaten an.",
    "links": [
      {
        "label": "Shop & Fanartikel",
        "href": "/merch.html"
      }
    ],
    "quick_replies": [
      "Fanartikel anzeigen",
      "Shop oeffnen",
      "Kontakt"
    ],
    "is_active": true,
    "is_public": true,
    "sort_order": 29
  },
  {
    "title": "App und Homepage",
    "category": "mitgliederbereich",
    "keywords": [
      "app homepage",
      "homepage",
      "website",
      "app",
      "wofuer ist die app",
      "was ist auf der homepage"
    ],
    "answer": "Die Homepage ist fuer oeffentliche Infos wie Events, Sponsoren, Presse, Shop und Kontakt da. Persoenliche Mitgliedsdaten gehoeren in den geschuetzten Mitgliederbereich oder die App.",
    "links": [
      {
        "label": "Mitgliederbereich",
        "href": "/mitgliederbereich.html"
      },
      {
        "label": "Kontakt",
        "href": "/kontakt.html"
      }
    ],
    "quick_replies": [
      "Mitgliederbereich",
      "Datenschutz",
      "FAQ"
    ],
    "is_active": true,
    "is_public": true,
    "sort_order": 30
  },
  {
    "title": "Datenschutz Hinweis",
    "category": "rechtliches",
    "keywords": [
      "datenschutz hinweis",
      "datenschutz",
      "personenbezogene daten",
      "persoenliche daten",
      "daten im assistenten"
    ],
    "answer": "Datenschutz ist wichtig: Der Virtual Bastard beantwortet oeffentliche Fragen und zeigt keine persoenlichen Mitgliedsdaten, keine Bestellungen und keine Beitragsdaten an.",
    "links": [
      {
        "label": "Datenschutz",
        "href": "/datenschutz.html"
      },
      {
        "label": "Impressum",
        "href": "/impressum.html"
      }
    ],
    "quick_replies": [
      "Datenschutz",
      "Mitgliederbereich",
      "Kontakt"
    ],
    "is_active": true,
    "is_public": true,
    "sort_order": 31
  },
  {
    "title": "Kontaktwege",
    "category": "kontakt",
    "keywords": [
      "kontaktwege",
      "wie erreiche ich euch",
      "kontakt aufnehmen",
      "email",
      "anschreiben",
      "frage stellen"
    ],
    "answer": "Am einfachsten erreichst du die Styrian Bastards ueber die Kontaktseite. Dort passt alles hin: Mitgliedschaft, Events, Sponsoring, Presse oder allgemeine Fragen.",
    "links": [
      {
        "label": "Kontakt",
        "href": "/kontakt.html"
      },
      {
        "label": "FAQ",
        "href": "/faq.html"
      }
    ],
    "quick_replies": [
      "Kontakt",
      "FAQ",
      "Mitglied werden"
    ],
    "is_active": true,
    "is_public": true,
    "sort_order": 32
  },
  {
    "title": "Navigation",
    "category": "navigation",
    "keywords": [
      "navigation",
      "navigator",
      "wo finde ich",
      "seite",
      "bereich",
      "weiterleiten"
    ],
    "answer": "Ich helfe dir als Virtual Bastard beim Navigieren: Mitglied werden, Events, Shop, Sponsoren, Presse, FAQ, Kontakt und Mitgliederbereich sind direkt erreichbar.",
    "links": [
      {
        "label": "Mitglied werden",
        "href": "/mitglied-werden.html"
      },
      {
        "label": "FAQ",
        "href": "/faq.html"
      },
      {
        "label": "Kontakt",
        "href": "/kontakt.html"
      }
    ],
    "quick_replies": [
      "Events",
      "Shop & Fanartikel",
      "Mitgliederbereich"
    ],
    "is_active": true,
    "is_public": true,
    "sort_order": 33
  },
  {
    "title": "Mitgliederbereich",
    "category": "mitgliederbereich",
    "keywords": [
      "mitgliederbereich",
      "mitglieder",
      "geschuetzter bereich",
      "geschutzter bereich",
      "intern"
    ],
    "answer": "Der Mitgliederbereich ist der geschuetzte Bereich fuer Mitglieder und App-Funktionen. Ich verlinke dich nur dorthin und zeige hier keine persoenlichen Mitgliederdaten an.",
    "links": [
      {
        "label": "Mitgliederbereich oeffnen",
        "href": "/mitgliederbereich.html"
      }
    ],
    "quick_replies": [
      "Login",
      "App",
      "Kontakt"
    ],
    "is_active": true,
    "is_public": true,
    "sort_order": 34
  },
  {
    "title": "App",
    "category": "mitgliederbereich",
    "keywords": [
      "app",
      "mitglieder app",
      "vereinsapp",
      "anwendung"
    ],
    "answer": "Fuer App- oder Mitgliederbereich-Funktionen fuehre ich dich zur geschuetzten Seite. Persoenliche Daten oder App-Inhalte zeige ich hier nicht an.",
    "links": [
      {
        "label": "Mitgliederbereich oeffnen",
        "href": "/mitgliederbereich.html"
      },
      {
        "label": "Kontakt",
        "href": "/kontakt.html"
      }
    ],
    "quick_replies": [
      "Mitgliederbereich",
      "Login",
      "FAQ"
    ],
    "is_active": true,
    "is_public": true,
    "sort_order": 35
  },
  {
    "title": "Login",
    "category": "mitgliederbereich",
    "keywords": [
      "login",
      "einloggen",
      "anmelden",
      "zugang",
      "passwort"
    ],
    "answer": "Zum Login geht es ueber den Mitgliederbereich. Ich pruefe hier keinen Login und frage keine Zugangsdaten ab.",
    "links": [
      {
        "label": "Mitgliederbereich oeffnen",
        "href": "/mitgliederbereich.html"
      }
    ],
    "quick_replies": [
      "Mitgliederbereich",
      "Kontakt",
      "FAQ"
    ],
    "is_active": true,
    "is_public": true,
    "sort_order": 36
  },
  {
    "title": "Datenschutz",
    "category": "rechtliches",
    "keywords": [
      "datenschutz",
      "privacy",
      "daten",
      "cookies",
      "cookie",
      "personenbezogene daten"
    ],
    "answer": "Informationen zum Datenschutz und zu Cookies findest du in der Datenschutzerklaerung. Der Virtual Bastard beantwortet oeffentliche Fragen und fragt keine personenbezogenen Daten ab.",
    "links": [
      {
        "label": "Datenschutz",
        "href": "/datenschutz.html"
      },
      {
        "label": "Impressum",
        "href": "/impressum.html"
      }
    ],
    "quick_replies": [
      "Impressum",
      "Kontakt",
      "FAQ"
    ],
    "is_active": true,
    "is_public": true,
    "sort_order": 37
  },
  {
    "title": "Impressum",
    "category": "rechtliches",
    "keywords": [
      "impressum",
      "anbieter",
      "rechtliches",
      "verein",
      "verantwortlich"
    ],
    "answer": "Das Impressum findest du auf der Impressumsseite. Dort stehen die rechtlichen Anbieterinformationen zur Website.",
    "links": [
      {
        "label": "Impressum",
        "href": "/impressum.html"
      },
      {
        "label": "Datenschutz",
        "href": "/datenschutz.html"
      }
    ],
    "quick_replies": [
      "Datenschutz",
      "Kontakt",
      "FAQ"
    ],
    "is_active": true,
    "is_public": true,
    "sort_order": 38
  }
]$vb_seed$::jsonb) as item(
    title text,
    category text,
    keywords jsonb,
    answer text,
    links jsonb,
    quick_replies jsonb,
    is_active boolean,
    is_public boolean,
    sort_order integer
  )
)
insert into public.virtual_bastard_knowledge (
  title,
  category,
  keywords,
  answer,
  links,
  quick_replies,
  is_active,
  is_public,
  sort_order
)
select
  title,
  category,
  coalesce(
    array(
      select jsonb_array_elements_text(coalesce(keywords, '[]'::jsonb))
    ),
    '{}'
  ),
  answer,
  coalesce(links, '[]'::jsonb),
  coalesce(quick_replies, '[]'::jsonb),
  coalesce(is_active, true),
  coalesce(is_public, true),
  coalesce(sort_order, 0)
from seed_data
on conflict (title, category) do update
set
  keywords = excluded.keywords,
  answer = excluded.answer,
  links = excluded.links,
  quick_replies = excluded.quick_replies,
  is_active = excluded.is_active,
  is_public = excluded.is_public,
  sort_order = excluded.sort_order,
  updated_at = now();
