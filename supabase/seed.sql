-- Staging seed data for local Supabase resets.
-- Contains only synthetic placeholder data. Do not add production data,
-- personal real-world data, or secrets to this file.
--
-- Auth users are intentionally not inserted into auth.users here.
-- To connect a local/staging auth account, create it through Supabase Auth
-- and set public.members.auth_user_id to that user's UUID.

insert into public.members (
  id,
  member_number,
  first_name,
  last_name,
  email,
  phone,
  member_type,
  role,
  app_role,
  status,
  joined_at,
  is_test,
  street,
  postal_code,
  city,
  birthdate,
  clothing_size,
  notes
)
values
  (
    '00000000-0000-4000-8000-000000000101',
    'TEST-ADMIN-001',
    'Alex',
    'Admin',
    'admin.member@example.test',
    '+430000000001',
    'vollmitglied',
    'obmann',
    'admin',
    'aktiv',
    '2026-01-15',
    true,
    'Teststrasse 1',
    '8010',
    'Teststadt',
    '1990-01-01',
    'L',
    'Synthetic staging admin member. Link auth_user_id manually if needed.'
  ),
  (
    '00000000-0000-4000-8000-000000000102',
    'TEST-MEMBER-001',
    'Mira',
    'Member',
    'mira.member@example.test',
    '+430000000002',
    'vollmitglied',
    'mitglied',
    'members',
    'aktiv',
    '2026-02-01',
    true,
    'Testweg 2',
    '8020',
    'Teststadt',
    '1995-05-12',
    'M',
    'Synthetic staging member.'
  ),
  (
    '00000000-0000-4000-8000-000000000103',
    'TEST-MEMBER-002',
    'Noah',
    'Supporter',
    'noah.supporter@example.test',
    '+430000000003',
    'foerdermitglied',
    'mitglied',
    'readonly',
    'aktiv',
    '2026-03-01',
    true,
    'Beispielgasse 3',
    '8030',
    'Teststadt',
    '1988-09-23',
    'XL',
    'Synthetic staging supporter.'
  )
on conflict (id) do update
set
  member_number = excluded.member_number,
  first_name = excluded.first_name,
  last_name = excluded.last_name,
  email = excluded.email,
  phone = excluded.phone,
  member_type = excluded.member_type,
  role = excluded.role,
  app_role = excluded.app_role,
  status = excluded.status,
  joined_at = excluded.joined_at,
  is_test = excluded.is_test,
  street = excluded.street,
  postal_code = excluded.postal_code,
  city = excluded.city,
  birthdate = excluded.birthdate,
  clothing_size = excluded.clothing_size,
  notes = excluded.notes;

insert into public.events (
  id,
  name,
  event_date,
  location,
  status,
  notes,
  is_public,
  public_title,
  public_description,
  public_sort_order,
  public_published_at,
  public_status,
  event_category,
  title,
  short_description,
  description,
  starts_at,
  ends_at,
  meeting_point,
  contact_person,
  registration_enabled,
  allow_waitlist,
  contact_name,
  contact_email,
  members_only,
  internal_only
)
values (
  '00000000-0000-4000-8000-000000000201',
  'Staging Test Event',
  '2026-08-15',
  'Test Venue',
  'geplant',
  'Synthetic staging event for local development.',
  true,
  'Staging Test Event',
  'Placeholder event used for staging and local development.',
  10,
  now(),
  'published',
  'event',
  'Staging Test Event',
  'Placeholder event for testing event lists and registrations.',
  'This event is synthetic and must not be confused with a real public event.',
  '2026-08-15 16:00:00+00',
  '2026-08-15 20:00:00+00',
  'Test Venue entrance',
  'Alex Admin',
  true,
  true,
  'Alex Admin',
  'events@example.test',
  false,
  false
)
on conflict (id) do update
set
  name = excluded.name,
  event_date = excluded.event_date,
  location = excluded.location,
  status = excluded.status,
  notes = excluded.notes,
  is_public = excluded.is_public,
  public_title = excluded.public_title,
  public_description = excluded.public_description,
  public_sort_order = excluded.public_sort_order,
  public_published_at = excluded.public_published_at,
  public_status = excluded.public_status,
  event_category = excluded.event_category,
  title = excluded.title,
  short_description = excluded.short_description,
  description = excluded.description,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  meeting_point = excluded.meeting_point,
  contact_person = excluded.contact_person,
  registration_enabled = excluded.registration_enabled,
  allow_waitlist = excluded.allow_waitlist,
  contact_name = excluded.contact_name,
  contact_email = excluded.contact_email,
  members_only = excluded.members_only,
  internal_only = excluded.internal_only;

insert into public.sponsors (
  id,
  name,
  contact_person,
  email,
  phone,
  website,
  status,
  notes,
  is_public,
  sponsor_level,
  public_sort_order,
  public_description,
  logo_alt
)
values (
  '00000000-0000-4000-8000-000000000301',
  'Example Sponsor GmbH',
  'Sam Sponsor',
  'sponsor@example.test',
  '+430000000010',
  'https://example.test',
  'active',
  'Synthetic staging sponsor.',
  true,
  'supporter',
  10,
  'Placeholder sponsor for staging previews.',
  'Example Sponsor placeholder logo'
)
on conflict (id) do update
set
  name = excluded.name,
  contact_person = excluded.contact_person,
  email = excluded.email,
  phone = excluded.phone,
  website = excluded.website,
  status = excluded.status,
  notes = excluded.notes,
  is_public = excluded.is_public,
  sponsor_level = excluded.sponsor_level,
  public_sort_order = excluded.public_sort_order,
  public_description = excluded.public_description,
  logo_alt = excluded.logo_alt;

insert into public.merch_items (
  id,
  item_number,
  name,
  description,
  category,
  status,
  base_price_cents,
  tax_rate,
  sku_prefix,
  is_public,
  public_sort_order,
  public_title,
  public_description,
  public_image_alt,
  public_cta_label,
  short_description,
  purchase_price_cents,
  member_price_cents,
  storage_location,
  is_new,
  pickup_available,
  shipping_available,
  shipping_cost_cents
)
values (
  '00000000-0000-4000-8000-000000000401',
  'TEST-MERCH-001',
  'Staging Test Shirt',
  'Synthetic fanartikel for local and staging development.',
  'apparel',
  'active',
  2500,
  20.00,
  'TEST-SHIRT',
  true,
  10,
  'Staging Test Shirt',
  'Placeholder fanartikel for testing the merch workflow.',
  'Placeholder product image',
  'Anfragen',
  'Synthetic merch item for testing.',
  1200,
  2000,
  'Staging Lager A',
  true,
  true,
  false,
  0
)
on conflict (id) do update
set
  item_number = excluded.item_number,
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  status = excluded.status,
  base_price_cents = excluded.base_price_cents,
  tax_rate = excluded.tax_rate,
  sku_prefix = excluded.sku_prefix,
  is_public = excluded.is_public,
  public_sort_order = excluded.public_sort_order,
  public_title = excluded.public_title,
  public_description = excluded.public_description,
  public_image_alt = excluded.public_image_alt,
  public_cta_label = excluded.public_cta_label,
  short_description = excluded.short_description,
  purchase_price_cents = excluded.purchase_price_cents,
  member_price_cents = excluded.member_price_cents,
  storage_location = excluded.storage_location,
  is_new = excluded.is_new,
  pickup_available = excluded.pickup_available,
  shipping_available = excluded.shipping_available,
  shipping_cost_cents = excluded.shipping_cost_cents;

insert into public.merch_variants (
  id,
  merch_item_id,
  sku,
  variant_name,
  size,
  color,
  price_cents,
  stock_quantity,
  reorder_level,
  status,
  sort_order,
  is_public,
  public_sort_order
)
values (
  '00000000-0000-4000-8000-000000000402',
  '00000000-0000-4000-8000-000000000401',
  'TEST-SHIRT-M-BLACK',
  'M / Schwarz',
  'M',
  'Schwarz',
  2500,
  12,
  3,
  'active',
  10,
  true,
  10
)
on conflict (id) do update
set
  merch_item_id = excluded.merch_item_id,
  sku = excluded.sku,
  variant_name = excluded.variant_name,
  size = excluded.size,
  color = excluded.color,
  price_cents = excluded.price_cents,
  stock_quantity = excluded.stock_quantity,
  reorder_level = excluded.reorder_level,
  status = excluded.status,
  sort_order = excluded.sort_order,
  is_public = excluded.is_public,
  public_sort_order = excluded.public_sort_order;

insert into public.membership_fee_periods (
  id,
  year,
  title,
  due_date,
  status
)
values (
  '00000000-0000-4000-8000-000000000501',
  2026,
  'Staging Mitgliedsbeitraege 2026',
  '2026-09-30',
  'open'
)
on conflict (year) do update
set
  id = excluded.id,
  title = excluded.title,
  due_date = excluded.due_date,
  status = excluded.status;

insert into public.membership_fee_items (
  id,
  period_id,
  member_id,
  amount,
  status,
  due_date,
  paid_at
)
values (
  '00000000-0000-4000-8000-000000000502',
  '00000000-0000-4000-8000-000000000501',
  '00000000-0000-4000-8000-000000000102',
  70.00,
  'paid',
  '2026-09-30',
  '2026-06-15 10:00:00+00'
)
on conflict (id) do update
set
  period_id = excluded.period_id,
  member_id = excluded.member_id,
  amount = excluded.amount,
  status = excluded.status,
  due_date = excluded.due_date,
  paid_at = excluded.paid_at;

insert into public.cash_entries (
  id,
  entry_date,
  entry_year,
  receipt_number,
  is_cancelled,
  type,
  category,
  amount,
  description,
  payment_method,
  is_opening,
  event_id,
  member_id,
  membership_fee_item_id,
  is_test
)
values (
  '00000000-0000-4000-8000-000000000503',
  '2026-06-15',
  2026,
  'TEST-RECEIPT-2026-001',
  false,
  'einnahme',
  'mitgliedsbeitrag',
  70.00,
  'Synthetic staging membership fee payment.',
  'bar',
  false,
  '00000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000102',
  '00000000-0000-4000-8000-000000000502',
  true
)
on conflict (id) do update
set
  entry_date = excluded.entry_date,
  entry_year = excluded.entry_year,
  receipt_number = excluded.receipt_number,
  is_cancelled = excluded.is_cancelled,
  type = excluded.type,
  category = excluded.category,
  amount = excluded.amount,
  description = excluded.description,
  payment_method = excluded.payment_method,
  is_opening = excluded.is_opening,
  event_id = excluded.event_id,
  member_id = excluded.member_id,
  membership_fee_item_id = excluded.membership_fee_item_id,
  is_test = excluded.is_test;

update public.membership_fee_items
set cash_entry_id = '00000000-0000-4000-8000-000000000503'
where id = '00000000-0000-4000-8000-000000000502';
