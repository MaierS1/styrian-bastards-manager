create or replace function public.get_public_merch_items()
returns table (
  id uuid,
  title text,
  category text,
  image_path text,
  image_alt text,
  public_description text,
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
          when merch_variants.status = 'active' and merch_variants.is_public = true and coalesce(merch_variants.stock_quantity, 0) > 0 then 'available'
          else 'sold_out'
        end as availability,
        merch_variants.status,
        merch_variants.is_public,
        merch_variants.stock_quantity,
        merch_variants.reorder_level,
        merch_variants.public_sort_order,
        lower(coalesce(merch_variants.variant_name, merch_variants.size, merch_variants.color, '')) as label_sort
      from public.merch_variants
      where merch_variants.merch_item_id = merch_items.id
        and merch_variants.is_public = true
        and merch_variants.status = 'active'
        and coalesce(merch_variants.stock_quantity, 0) > 0
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
