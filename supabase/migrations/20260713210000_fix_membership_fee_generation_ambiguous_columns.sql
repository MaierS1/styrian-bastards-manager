do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.membership_fee_items'::regclass
      and c.conname = 'membership_fee_items_period_member_unique'
  ) then
    if exists (
      select 1
      from pg_class i
      join pg_namespace n on n.oid = i.relnamespace
      where n.nspname = 'public'
        and i.relname = 'membership_fee_items_period_member_uidx'
    ) then
      alter table public.membership_fee_items
        add constraint membership_fee_items_period_member_unique
        unique using index membership_fee_items_period_member_uidx;
    else
      alter table public.membership_fee_items
        add constraint membership_fee_items_period_member_unique
        unique (period_id, member_id);
    end if;
  end if;
end $$;

drop function if exists public.create_membership_fee_period_and_items(integer, text, date);

create or replace function public.create_membership_fee_period_and_items(
  p_year integer,
  p_title text default null,
  p_due_date date default null
)
returns table (
  v_period_id uuid,
  year integer,
  created_count integer,
  skipped_count integer,
  total_active_count integer,
  period_created boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period public.membership_fee_periods%rowtype;
  v_period_created boolean := false;
begin
  if not public.is_admin_user() then
    raise exception 'forbidden';
  end if;

  if p_year is null or p_year < 2000 then
    raise exception 'invalid year';
  end if;

  select p.*
    into v_period
  from public.membership_fee_periods as p
  where p.year = p_year
  limit 1;

  if not found then
    insert into public.membership_fee_periods (year, title, due_date, status)
    values (
      p_year,
      nullif(trim(coalesce(p_title, format('Mitgliedsbeiträge %s', p_year))), ''),
      p_due_date,
      'open'
    )
    returning * into v_period;

    v_period_created := true;
  end if;

  return query
  with active_members as (
    select
      m.id as member_id,
      public.get_membership_fee_amount_for_member_type(m.member_type) as amount,
      case
        when public.get_membership_fee_amount_for_member_type(m.member_type) <= 0 then 'waived'
        else 'open'
      end as status
    from public.members as m
    where m.status = 'aktiv'
      and coalesce(m.is_test, false) = false
  ),
  inserted as (
    insert into public.membership_fee_items (
      period_id,
      member_id,
      amount,
      status,
      due_date
    )
    select
      v_period.id,
      am.member_id,
      am.amount,
      am.status,
      coalesce(v_period.due_date, p_due_date)
    from active_members as am
    on conflict on constraint membership_fee_items_period_member_unique do nothing
    returning 1
  )
  select
    v_period.id as v_period_id,
    v_period.year as year,
    (select count(*)::integer from inserted) as created_count,
    ((select count(*)::integer from active_members) - (select count(*)::integer from inserted)) as skipped_count,
    (select count(*)::integer from active_members) as total_active_count,
    v_period_created as period_created;
end;
$$;

revoke all on function public.create_membership_fee_period_and_items(integer, text, date) from public;
grant execute on function public.create_membership_fee_period_and_items(integer, text, date) to authenticated;
