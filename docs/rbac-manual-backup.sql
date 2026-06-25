-- Manual pre-migration backup / export queries for the RBAC rollout.
-- Run each statement individually in the Supabase SQL editor and export the result.
-- Read-only only. No writes. No deletes.

-- Core member data
select * from public.members;
select * from public.membership_fee_items;
select * from public.membership_fee_periods;

-- Events
select * from public.events;
select * from public.event_registrations;

-- Sponsors / media
select * from public.sponsors;
select * from public.media_items;

-- Merch / shop
select * from public.merch_items;
select * from public.merch_variants;
select * from public.merch_sales;
select * from public.merch_sale_items;
select * from public.cash_entries;
select * from public.shop_orders;
select * from public.shop_order_items;

-- Einkauf / purchase comparison
select * from public.purchase_products;
select * from public.purchase_prices;
select * from public.purchase_price_history;
select * from public.purchase_product_favorites;
select * from public.purchase_lists;
select * from public.purchase_list_items;
select * from public.purchase_supplier_ratings;
select * from public.purchase_search_results;
select * from public.suppliers;
