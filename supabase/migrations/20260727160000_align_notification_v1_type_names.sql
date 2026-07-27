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
  ('financing_liability_partial_repayment', 'financing_liability_partial_repayment', 'Teilrueckzahlung verbucht', 'Eine Teilrueckzahlung wurde verbucht.', 'financing', array['in_app'], 'Teilrueckzahlung verbucht', 'Fuer {description} wurde eine Rueckzahlung ueber {amount} verbucht.', 'normal', 'receipt', '/financing'),
  ('financing_liability_repaid', 'financing_liability_repaid', 'Vorfinanzierung zurueckbezahlt', 'Eine Vorfinanzierung wurde vollstaendig zurueckbezahlt.', 'financing', array['in_app'], 'Vorfinanzierung vollstaendig zurueckbezahlt', '{description} ist vollstaendig zurueckbezahlt.', 'normal', 'badge-check', '/financing'),
  ('press_published', 'press_published', 'Presseartikel veroeffentlicht', 'Ein Presseartikel wurde veroeffentlicht.', 'press', array['in_app'], 'Presseartikel veroeffentlicht', 'Der Presseartikel {title} wurde veroeffentlicht.', 'normal', 'newspaper', '/media')
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
