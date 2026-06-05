create or replace function public.create_membership_fee_period_and_items(
  p_year integer,
  p_title text default null,
  p_due_date date default null
)
returns table (
  period_id uuid,
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

  select *
    into v_period
  from public.membership_fee_periods p
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
  else
    update public.membership_fee_periods
      set
        title = coalesce(nullif(trim(p_title), ''), v_period.title),
        due_date = coalesce(p_due_date, v_period.due_date)
    where id = v_period.id
    returning * into v_period;
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
    from public.members m
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
      active_members.member_id,
      active_members.amount,
      active_members.status,
      coalesce(v_period.due_date, p_due_date)
    from active_members
    where not exists (
      select 1
      from public.membership_fee_items existing
      where existing.period_id = v_period.id
        and existing.member_id = active_members.member_id
    )
    returning 1
  )
  select
    v_period.id as period_id,
    v_period.year as year,
    (select count(*)::integer from inserted) as created_count,
    ((select count(*)::integer from active_members) - (select count(*)::integer from inserted)) as skipped_count,
    (select count(*)::integer from active_members) as total_active_count,
    v_period_created as period_created;
end;
$$;

revoke all on function public.create_membership_fee_period_and_items(integer, text, date) from public;
grant execute on function public.create_membership_fee_period_and_items(integer, text, date) to authenticated;
