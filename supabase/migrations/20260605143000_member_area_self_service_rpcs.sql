create or replace function public.get_my_member_profile()
returns table (
  member_id uuid,
  first_name text,
  last_name text,
  full_name text,
  email text,
  member_type text,
  status text,
  joined_at date
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id as member_id,
    m.first_name,
    m.last_name,
    nullif(trim(concat(coalesce(m.first_name, ''), ' ', coalesce(m.last_name, ''))), '') as full_name,
    m.email,
    m.member_type,
    m.status,
    m.joined_at
  from public.members m
  where auth.uid() is not null
    and m.auth_user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.get_my_member_profile() from public;
revoke all on function public.get_my_member_profile() from anon;
grant execute on function public.get_my_member_profile() to authenticated;

create or replace function public.get_my_membership_fees()
returns table (
  fee_item_id uuid,
  period_id uuid,
  year integer,
  period_title text,
  amount numeric,
  status text,
  due_date date,
  paid_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    item.id as fee_item_id,
    period.id as period_id,
    period.year,
    period.title as period_title,
    item.amount,
    item.status,
    coalesce(item.due_date, period.due_date) as due_date,
    item.paid_at
  from public.members m
  join public.membership_fee_items item
    on item.member_id = m.id
  join public.membership_fee_periods period
    on period.id = item.period_id
  where auth.uid() is not null
    and m.auth_user_id = auth.uid()
  order by period.year desc, item.created_at desc;
$$;

revoke all on function public.get_my_membership_fees() from public;
revoke all on function public.get_my_membership_fees() from anon;
grant execute on function public.get_my_membership_fees() to authenticated;

create or replace function public.get_my_member_area_summary()
returns table (
  profile jsonb,
  open_fees jsonb,
  paid_fees jsonb,
  next_events jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  with my_member as (
    select
      m.id,
      m.first_name,
      m.last_name,
      nullif(trim(concat(coalesce(m.first_name, ''), ' ', coalesce(m.last_name, ''))), '') as full_name,
      m.email,
      m.member_type,
      m.status,
      m.joined_at
    from public.members m
    where auth.uid() is not null
      and m.auth_user_id = auth.uid()
    limit 1
  ), my_fees as (
    select
      item.id as fee_item_id,
      period.id as period_id,
      period.year,
      period.title as period_title,
      item.amount,
      item.status,
      coalesce(item.due_date, period.due_date) as due_date,
      item.paid_at
    from my_member m
    join public.membership_fee_items item
      on item.member_id = m.id
    join public.membership_fee_periods period
      on period.id = item.period_id
  ), public_events as (
    select
      e.id,
      coalesce(e.public_title, e.title, e.name) as title,
      e.event_date,
      e.starts_at,
      e.location
    from public.events e
    where e.is_public = true
      and e.event_date >= current_date
      and coalesce(e.public_title, e.title, e.name) is not null
    order by e.event_date asc, e.starts_at asc nulls last
    limit 5
  )
  select
    coalesce((
      select jsonb_build_object(
        'member_id', id,
        'first_name', first_name,
        'last_name', last_name,
        'full_name', full_name,
        'email', email,
        'member_type', member_type,
        'status', status,
        'joined_at', joined_at
      )
      from my_member
    ), '{}'::jsonb) as profile,
    coalesce((
      select jsonb_agg(to_jsonb(my_fees) order by year desc)
      from my_fees
      where status in ('open', 'reminded')
    ), '[]'::jsonb) as open_fees,
    coalesce((
      select jsonb_agg(to_jsonb(my_fees) order by year desc)
      from my_fees
      where status = 'paid'
    ), '[]'::jsonb) as paid_fees,
    coalesce((
      select jsonb_agg(to_jsonb(public_events) order by event_date asc, starts_at asc nulls last)
      from public_events
    ), '[]'::jsonb) as next_events;
$$;

revoke all on function public.get_my_member_area_summary() from public;
revoke all on function public.get_my_member_area_summary() from anon;
grant execute on function public.get_my_member_area_summary() to authenticated;
