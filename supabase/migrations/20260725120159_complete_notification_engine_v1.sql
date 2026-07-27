alter table public.notification_jobs
  drop constraint if exists notification_jobs_category_check;
alter table public.notification_jobs
  add constraint notification_jobs_category_check
  check (category = any (array['event','membership_fee','invoice','shop','sponsor','document','press','news','financing','cash','member','club_news','board','system','backup']));

alter table public.notification_templates
  drop constraint if exists notification_templates_category_check;
alter table public.notification_templates
  add constraint notification_templates_category_check
  check (category = any (array['event','membership_fee','invoice','shop','sponsor','document','press','news','financing','cash','member','club_news','board','system','backup']));

alter table public.notification_preferences
  drop constraint if exists notification_preferences_category_check;
alter table public.notification_preferences
  add constraint notification_preferences_category_check
  check (category = any (array['event','membership_fee','invoice','shop','sponsor','document','press','news','financing','cash','member','club_news','board','system','backup']));

alter table public.in_app_notifications
  drop constraint if exists in_app_notifications_category_check;
alter table public.in_app_notifications
  add constraint in_app_notifications_category_check
  check (category = any (array['event','membership_fee','invoice','shop','sponsor','document','press','news','financing','cash','member','club_news','board','system','backup']));

alter table public.notification_templates
  add column if not exists type text,
  add column if not exists priority text not null default 'normal',
  add column if not exists icon text,
  add column if not exists deep_link text;

alter table public.notification_templates
  drop constraint if exists notification_templates_priority_check;

alter table public.notification_templates
  add constraint notification_templates_priority_check
  check (priority in ('low', 'normal', 'high', 'critical'));

insert into public.notification_templates (
  key,
  type,
  label,
  description,
  category,
  default_channels,
  title_template,
  body_template,
  priority,
  icon,
  deep_link
)
values
  ('event_created', 'event_created', 'Event erstellt', 'Ein Event wurde angelegt.', 'event', array['in_app','email'], 'Event erstellt: {name}', 'Das Event {name} wurde fuer {date} angelegt.', 'normal', 'calendar-plus', '/events'),
  ('event_updated', 'event_updated', 'Event geaendert', 'Ein Event wurde aktualisiert.', 'event', array['in_app','email'], 'Event geaendert: {name}', 'Das Event {name} wurde aktualisiert.', 'normal', 'calendar-clock', '/events'),
  ('event_moved', 'event_moved', 'Event verschoben', 'Ein Event wurde verschoben.', 'event', array['in_app','email'], 'Event verschoben: {name}', 'Das Event {name} wurde auf {date} verschoben.', 'high', 'calendar-clock', '/events'),
  ('event_cancelled', 'event_cancelled', 'Event abgesagt', 'Ein Event wurde abgesagt.', 'event', array['in_app','email'], 'Event abgesagt: {name}', 'Das Event {name} wurde abgesagt.', 'high', 'calendar-x', '/events'),
  ('event_full', 'event_full', 'Event voll', 'Ein Event ist voll.', 'event', array['in_app','email'], 'Event voll: {name}', 'Alle regulaeren Plaetze fuer {name} sind belegt.', 'high', 'users', '/events'),
  ('event_waitlist_enabled', 'event_waitlist_enabled', 'Warteliste aktiviert', 'Eine Warteliste wurde aktiviert.', 'event', array['in_app','email'], 'Warteliste aktiviert: {name}', 'Fuer {name} wurde die Warteliste aktiviert.', 'normal', 'list-plus', '/events'),
  ('event_registration_deadline_reached', 'event_registration_deadline_reached', 'Anmeldeschluss erreicht', 'Ein Anmeldeschluss wurde erreicht.', 'event', array['in_app','email'], 'Anmeldeschluss erreicht: {name}', 'Der Anmeldeschluss fuer {name} ist erreicht.', 'normal', 'timer', '/events'),
  ('invoice_created', 'invoice_created', 'Rechnung erstellt', 'Eine Rechnung wurde erstellt.', 'invoice', array['in_app','email'], 'Rechnung erstellt: {invoice_number}', 'Rechnung {invoice_number} fuer {customer_name} wurde erstellt.', 'normal', 'file-text', '/invoices'),
  ('invoice_paid', 'invoice_paid', 'Rechnung bezahlt', 'Eine Rechnung wurde bezahlt.', 'invoice', array['in_app','email'], 'Rechnung bezahlt: {invoice_number}', 'Rechnung {invoice_number} wurde als bezahlt markiert.', 'normal', 'badge-check', '/invoices'),
  ('invoice_cancelled', 'invoice_cancelled', 'Rechnung storniert', 'Eine Rechnung wurde storniert.', 'invoice', array['in_app','email'], 'Rechnung storniert: {invoice_number}', 'Rechnung {invoice_number} wurde storniert.', 'high', 'file-x', '/invoices'),
  ('invoice_overdue', 'invoice_overdue', 'Rechnung ueberfaellig', 'Eine Rechnung ist ueberfaellig.', 'invoice', array['in_app','email'], 'Rechnung ueberfaellig: {invoice_number}', 'Rechnung {invoice_number} ist seit {due_date} ueberfaellig.', 'high', 'alarm-clock', '/invoices'),
  ('financing_liability_created', 'financing_liability_created', 'Vorfinanzierung angelegt', 'Eine Vorfinanzierung wurde angelegt.', 'financing', array['in_app','email'], 'Vorfinanzierung angelegt', '{creditor_name} hat {amount} fuer {description} vorfinanziert.', 'normal', 'hand-coins', '/financing'),
  ('financing_liability_updated', 'financing_liability_updated', 'Vorfinanzierung bearbeitet', 'Eine Vorfinanzierung wurde bearbeitet.', 'financing', array['in_app','email'], 'Vorfinanzierung bearbeitet', 'Die Vorfinanzierung {description} wurde bearbeitet.', 'normal', 'edit', '/financing'),
  ('financing_repayment_recorded', 'financing_repayment_recorded', 'Teilrueckzahlung verbucht', 'Eine Teilrueckzahlung wurde verbucht.', 'financing', array['in_app','email'], 'Teilrueckzahlung verbucht', 'Fuer {description} wurde eine Rueckzahlung ueber {amount} verbucht.', 'normal', 'receipt', '/financing'),
  ('financing_liability_paid', 'financing_liability_paid', 'Vorfinanzierung zurueckbezahlt', 'Eine Vorfinanzierung wurde vollstaendig zurueckbezahlt.', 'financing', array['in_app','email'], 'Vorfinanzierung vollstaendig zurueckbezahlt', '{description} ist vollstaendig zurueckbezahlt.', 'normal', 'badge-check', '/financing'),
  ('financing_liability_cancelled', 'financing_liability_cancelled', 'Vorfinanzierung storniert', 'Eine Vorfinanzierung wurde storniert.', 'financing', array['in_app','email'], 'Vorfinanzierung storniert', 'Die Vorfinanzierung {description} wurde storniert.', 'high', 'ban', '/financing'),
  ('financing_liability_overdue', 'financing_liability_overdue', 'Vorfinanzierung ueberfaellig', 'Eine Vorfinanzierung ist ueberfaellig.', 'financing', array['in_app','email'], 'Vorfinanzierung ueberfaellig', 'Die Vorfinanzierung {description} ist seit {due_date} faellig.', 'high', 'alarm-clock', '/financing'),
  ('member_application_received', 'member_application_received', 'Mitgliedsantrag eingegangen', 'Ein Mitgliedsantrag ist eingegangen.', 'member', array['in_app','email'], 'Mitgliedsantrag eingegangen', 'Ein Mitgliedsantrag von {member_name} ist eingegangen.', 'normal', 'user-plus', '/members'),
  ('member_accepted', 'member_accepted', 'Mitglied aufgenommen', 'Ein Mitglied wurde aufgenommen.', 'member', array['in_app','email'], 'Mitglied aufgenommen', '{member_name} wurde aufgenommen.', 'normal', 'user-check', '/members'),
  ('member_rejected', 'member_rejected', 'Mitglied abgelehnt', 'Ein Mitglied wurde abgelehnt.', 'member', array['in_app','email'], 'Mitglied abgelehnt', '{member_name} wurde abgelehnt.', 'normal', 'user-x', '/members'),
  ('member_deactivated', 'member_deactivated', 'Mitglied deaktiviert', 'Ein Mitglied wurde deaktiviert.', 'member', array['in_app','email'], 'Mitglied deaktiviert', '{member_name} wurde deaktiviert.', 'normal', 'user-minus', '/members'),
  ('membership_fee_due', 'membership_fee_due', 'Beitrag faellig', 'Ein Mitgliedsbeitrag ist faellig.', 'membership_fee', array['in_app','email'], 'Beitrag faellig', 'Der Mitgliedsbeitrag {period} ist faellig.', 'high', 'wallet', '/fees'),
  ('membership_fee_paid', 'membership_fee_paid', 'Beitrag bezahlt', 'Ein Mitgliedsbeitrag wurde bezahlt.', 'membership_fee', array['in_app','email'], 'Beitrag bezahlt', 'Der Mitgliedsbeitrag von {member_name} wurde bezahlt.', 'normal', 'badge-check', '/fees'),
  ('membership_fee_reminder_created', 'membership_fee_reminder_created', 'Mahnung erstellt', 'Eine Beitragsmahnung wurde erstellt.', 'membership_fee', array['in_app','email'], 'Mahnung erstellt', 'Fuer {member_name} wurde eine Beitragsmahnung erstellt.', 'high', 'mail-warning', '/fees'),
  ('shop_order_received', 'shop_order_received', 'Bestellung eingegangen', 'Eine Shop-Bestellung ist eingegangen.', 'shop', array['in_app','email'], 'Bestellung eingegangen', 'Shop-Bestellung {order_number} von {buyer_name} ist eingegangen.', 'normal', 'shopping-bag', '/merch'),
  ('shop_order_paid', 'shop_order_paid', 'Bestellung bezahlt', 'Eine Shop-Bestellung wurde bezahlt.', 'shop', array['in_app','email'], 'Bestellung bezahlt', 'Shop-Bestellung {order_number} wurde bezahlt.', 'normal', 'badge-check', '/merch'),
  ('shop_order_shipped', 'shop_order_shipped', 'Bestellung versendet', 'Eine Shop-Bestellung wurde versendet.', 'shop', array['in_app','email'], 'Bestellung versendet', 'Shop-Bestellung {order_number} wurde versendet.', 'normal', 'truck', '/merch'),
  ('shop_order_cancelled', 'shop_order_cancelled', 'Bestellung storniert', 'Eine Shop-Bestellung wurde storniert.', 'shop', array['in_app','email'], 'Bestellung storniert', 'Shop-Bestellung {order_number} wurde storniert.', 'high', 'shopping-bag-x', '/merch'),
  ('sponsor_created', 'sponsor_created', 'Sponsor angelegt', 'Ein Sponsor wurde angelegt.', 'sponsor', array['in_app','email'], 'Sponsor angelegt', 'Sponsor {sponsor_name} wurde angelegt.', 'normal', 'handshake', '/sponsors'),
  ('sponsorship_renewed', 'sponsorship_renewed', 'Sponsoring verlaengert', 'Ein Sponsoring wurde verlaengert.', 'sponsor', array['in_app','email'], 'Sponsoring verlaengert', 'Sponsoring {contract_title} wurde verlaengert.', 'normal', 'refresh-cw', '/sponsors'),
  ('sponsorship_expiring', 'sponsorship_expiring', 'Sponsoring laeuft aus', 'Ein Sponsoring laeuft aus.', 'sponsor', array['in_app','email'], 'Sponsoring laeuft aus', 'Sponsoring {contract_title} laeuft am {ends_on} aus.', 'high', 'timer', '/sponsors'),
  ('sponsorship_payment_received', 'sponsorship_payment_received', 'Sponsorzahlung eingegangen', 'Eine Sponsorzahlung ist eingegangen.', 'sponsor', array['in_app','email'], 'Sponsorzahlung eingegangen', 'Zahlung fuer Sponsoring {contract_title} ist eingegangen.', 'normal', 'badge-check', '/sponsors'),
  ('document_published', 'document_published', 'Dokument veroeffentlicht', 'Ein Dokument wurde veroeffentlicht.', 'document', array['in_app','email'], 'Dokument veroeffentlicht', 'Das Dokument {title} wurde veroeffentlicht.', 'normal', 'file-check', '/documents'),
  ('press_article_published', 'press_article_published', 'Presseartikel veroeffentlicht', 'Ein Presseartikel wurde veroeffentlicht.', 'press', array['in_app','email'], 'Presseartikel veroeffentlicht', 'Der Presseartikel {title} wurde veroeffentlicht.', 'normal', 'newspaper', '/media'),
  ('news_published', 'news_published', 'News veroeffentlicht', 'News wurden veroeffentlicht.', 'news', array['in_app','email'], 'News veroeffentlicht', 'News veroeffentlicht: {title}', 'normal', 'megaphone', '/media'),
  ('cash_large_income', 'cash_large_income', 'Grosse Einnahme', 'Vorbereitung fuer grosse Einnahmen.', 'cash', array['in_app','email'], 'Grosse Einnahme', 'Eine groessere Einnahme wurde vorbereitet: {description}.', 'normal', 'trending-up', '/cash'),
  ('cash_large_expense', 'cash_large_expense', 'Grosse Ausgabe', 'Vorbereitung fuer grosse Ausgaben.', 'cash', array['in_app','email'], 'Grosse Ausgabe', 'Eine groessere Ausgabe wurde vorbereitet: {description}.', 'normal', 'trending-down', '/cash')
on conflict (key) do update
set
  type = excluded.type,
  label = excluded.label,
  description = excluded.description,
  category = excluded.category,
  default_channels = excluded.default_channels,
  title_template = excluded.title_template,
  body_template = excluded.body_template,
  priority = excluded.priority,
  icon = excluded.icon,
  deep_link = excluded.deep_link,
  updated_at = now();

with category_defaults as (
  select *
  from (values
    ('event', false),
    ('invoice', true),
    ('membership_fee', true),
    ('shop', false),
    ('sponsor', false),
    ('document', false),
    ('press', false),
    ('news', false),
    ('financing', true),
    ('cash', true),
    ('member', true),
    ('club_news', false),
    ('system', true)
  ) as item(category, required)
),
channel_defaults as (
  select *
  from (values
    ('in_app', true),
    ('email', true),
    ('push', false)
  ) as item(channel, enabled)
)
insert into public.notification_preferences (
  auth_user_id,
  member_id,
  notification_type,
  category,
  channel,
  enabled,
  required,
  opted_in_at
)
select
  members.auth_user_id,
  members.id,
  category_defaults.category,
  category_defaults.category,
  channel_defaults.channel,
  case when category_defaults.required then true else channel_defaults.enabled end,
  category_defaults.required,
  case when channel_defaults.enabled or category_defaults.required then now() else null end
from public.members
cross join category_defaults
cross join channel_defaults
where members.status = 'aktiv'
  and members.auth_user_id is not null
on conflict do nothing;
