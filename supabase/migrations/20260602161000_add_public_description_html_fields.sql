alter table public.events
  add column if not exists public_description_html text;

alter table public.merch_items
  add column if not exists public_description_html text;

alter table public.sponsors
  add column if not exists public_description_html text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'events_public_description_html_not_blank'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_public_description_html_not_blank
      check (public_description_html is null or length(trim(public_description_html)) > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'merch_items_public_description_html_not_blank'
      and conrelid = 'public.merch_items'::regclass
  ) then
    alter table public.merch_items
      add constraint merch_items_public_description_html_not_blank
      check (public_description_html is null or length(trim(public_description_html)) > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'sponsors_public_description_html_not_blank'
      and conrelid = 'public.sponsors'::regclass
  ) then
    alter table public.sponsors
      add constraint sponsors_public_description_html_not_blank
      check (public_description_html is null or length(trim(public_description_html)) > 0);
  end if;
end;
$$;

drop function if exists public.get_public_events();

create function public.get_public_events()
returns table (
  id uuid,
  title text,
  short_description text,
  description text,
  public_description_html text,
  starts_at timestamptz,
  ends_at timestamptz,
  event_date date,
  location text,
  meeting_point text,
  event_category text,
  contact_person text,
  registration_deadline timestamptz,
  max_participants integer,
  public_image_path text,
  public_image_url text,
  public_registration_url text,
  public_external_url text,
  public_sort_order integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    events.id,
    coalesce(nullif(trim(events.public_title), ''), nullif(trim(events.title), ''), events.name) as title,
    events.short_description,
    coalesce(events.description, events.public_description) as description,
    events.public_description_html,
    events.starts_at,
    events.ends_at,
    events.event_date,
    events.location,
    events.meeting_point,
    events.event_category,
    events.contact_person,
    events.registration_deadline,
    events.max_participants,
    events.public_image_path,
    events.public_image_url,
    events.public_registration_url,
    events.public_external_url,
    events.public_sort_order
  from public.events
  where events.is_public = true
    and events.public_status = 'published'
    and coalesce(nullif(trim(events.public_title), ''), nullif(trim(events.title), ''), events.name) is not null
    and coalesce(events.starts_at::date, events.event_date) >= current_date
    and events.status in ('geplant', 'laufend')
    and (
      events.public_published_at is null
      or events.public_published_at <= now()
    )
  order by
    coalesce(events.starts_at, events.event_date::timestamptz) asc,
    events.public_sort_order asc,
    lower(coalesce(events.public_title, events.title, events.name)) asc;
$$;

revoke all on function public.get_public_events() from public;
grant execute on function public.get_public_events() to anon;
grant execute on function public.get_public_events() to authenticated;

drop function if exists public.get_public_sponsors();

create function public.get_public_sponsors()
returns table (
  id uuid,
  name text,
  website text,
  logo_path text,
  logo_alt text,
  sponsor_level text,
  sponsor_level_rank integer,
  public_sort_order integer,
  public_description text,
  public_description_html text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    sponsors.id,
    sponsors.name,
    sponsors.website,
    sponsors.logo_path,
    coalesce(nullif(trim(sponsors.logo_alt), ''), sponsors.name) as logo_alt,
    sponsors.sponsor_level,
    case sponsors.sponsor_level
      when 'main' then 10
      when 'premium' then 20
      when 'partner' then 30
      when 'supporter' then 40
      else 99
    end as sponsor_level_rank,
    sponsors.public_sort_order,
    sponsors.public_description,
    sponsors.public_description_html
  from public.sponsors
  where sponsors.status = 'active'
    and sponsors.is_public = true
  order by
    sponsor_level_rank asc,
    sponsors.public_sort_order asc,
    lower(sponsors.name) asc;
$$;

revoke all on function public.get_public_sponsors() from public;
grant execute on function public.get_public_sponsors() to anon;
grant execute on function public.get_public_sponsors() to authenticated;

drop function if exists public.get_public_merch_items();

create function public.get_public_merch_items()
returns table (
  id uuid,
  title text,
  category text,
  image_path text,
  image_alt text,
  public_description text,
  public_description_html text,
  public_cta_label text,
  public_cta_url text,
  display_price_cents integer,
  variants jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    merch_items.id,
    coalesce(nullif(trim(merch_items.public_title), ''), merch_items.name) as title,
    merch_items.category,
    merch_items.image_path,
    coalesce(
      nullif(trim(merch_items.public_image_alt), ''),
      nullif(trim(merch_items.public_title), ''),
      merch_items.name
    ) as image_alt,
    merch_items.public_description,
    merch_items.public_description_html,
    merch_items.public_cta_label,
    merch_items.public_cta_url,
    coalesce(public_prices.lowest_price_cents, merch_items.base_price_cents) as display_price_cents,
    coalesce(public_variants.variants, '[]'::jsonb) as variants
  from public.merch_items
  left join lateral (
    select min(coalesce(merch_variants.price_cents, merch_items.base_price_cents)) as lowest_price_cents
    from public.merch_variants
    where merch_variants.merch_item_id = merch_items.id
      and merch_variants.is_public = true
      and merch_variants.status = 'active'
      and coalesce(merch_variants.stock_quantity, 0) > 0
  ) public_prices on true
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'id', public_variant_rows.id,
        'merch_item_id', public_variant_rows.merch_item_id,
        'name', public_variant_rows.variant_name,
        'size', public_variant_rows.size,
        'color', public_variant_rows.color,
        'display_price_cents', public_variant_rows.display_price_cents,
        'availability', public_variant_rows.availability,
        'status', public_variant_rows.status,
        'is_public', public_variant_rows.is_public,
        'stock_quantity', public_variant_rows.stock_quantity,
        'reorder_level', public_variant_rows.reorder_level
      )
      order by
        public_variant_rows.public_sort_order asc,
        public_variant_rows.label_sort asc
    ) as variants
    from (
      select
        merch_variants.id,
        merch_variants.merch_item_id,
        merch_variants.variant_name,
        merch_variants.size,
        merch_variants.color,
        coalesce(merch_variants.price_cents, merch_items.base_price_cents) as display_price_cents,
        case
          when coalesce(merch_variants.stock_quantity, 0) <= 0 then 'sold_out'
          else 'available'
        end as availability,
        case
          when coalesce(merch_variants.stock_quantity, 0) <= 0 then 'sold_out'
          else merch_variants.status
        end as status,
        merch_variants.is_public,
        merch_variants.stock_quantity,
        merch_variants.reorder_level,
        merch_variants.public_sort_order,
        lower(coalesce(merch_variants.variant_name, merch_variants.size, merch_variants.color, '')) as label_sort
      from public.merch_variants
      where merch_variants.merch_item_id = merch_items.id
        and merch_variants.is_public = true
        and (
          merch_variants.status = 'active'
          or (
            merch_variants.status = 'sold_out'
            and coalesce(merch_variants.stock_quantity, 0) <= 0
          )
        )
    ) public_variant_rows
  ) public_variants on true
  where merch_items.is_public = true
    and merch_items.status = 'active'
  order by
    merch_items.public_sort_order asc,
    lower(coalesce(merch_items.public_title, merch_items.name)) asc;
$$;

revoke all on function public.get_public_merch_items() from public;
grant execute on function public.get_public_merch_items() to anon;
grant execute on function public.get_public_merch_items() to authenticated;
