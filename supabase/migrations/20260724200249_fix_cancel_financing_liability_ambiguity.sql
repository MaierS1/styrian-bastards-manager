create or replace function public.cancel_financing_liability(
  p_liability_id uuid,
  p_cancellation_reason text
)
returns table (
  liability_id uuid,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_repayment_count integer;
begin
  if not public.has_app_permission('vorfinanzierungen', 'delete') then
    raise exception 'forbidden';
  end if;

  if length(trim(coalesce(p_cancellation_reason, ''))) = 0 then
    raise exception 'cancellation reason is required';
  end if;

  select count(*)::integer
    into v_repayment_count
  from public.financing_liability_repayments as flr
  where flr.liability_id = p_liability_id
    and flr.cancelled_at is null;

  if v_repayment_count > 0 then
    raise exception 'liabilities with active repayments cannot be cancelled';
  end if;

  update public.financing_liabilities as fl
  set
    status = 'cancelled',
    cancelled_at = now(),
    cancelled_by = auth.uid(),
    cancellation_reason = trim(p_cancellation_reason)
  where fl.id = p_liability_id
    and fl.status <> 'cancelled'
  returning fl.id, fl.status
  into liability_id, status;

  if liability_id is null then
    raise exception 'liability not found';
  end if;

  return next;
end;
$$;

revoke all on function public.cancel_financing_liability(uuid, text) from public;
revoke all on function public.cancel_financing_liability(uuid, text) from anon;
grant execute on function public.cancel_financing_liability(uuid, text) to authenticated;
