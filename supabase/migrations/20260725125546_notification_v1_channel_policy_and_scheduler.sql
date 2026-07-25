create or replace function public.get_members_with_app_permission(
  p_module text,
  p_action text default 'view'
)
returns table (
  id uuid,
  auth_user_id uuid,
  email text,
  status text
)
language sql
stable
security definer
set search_path = public
as $$
  with requested_permission as (
    select key
    from public.permissions
    where module = p_module
      and action = p_action
  )
  select distinct m.id, m.auth_user_id, m.email, m.status
  from public.members m
  cross join requested_permission rp
  where m.status = 'aktiv'
    and m.auth_user_id is not null
    and not exists (
      select 1
      from public.user_permissions up
      where up.auth_user_id = m.auth_user_id
        and up.permission_key = rp.key
        and up.effect = 'deny'
    )
    and (
      exists (
        select 1
        from public.user_permissions up
        where up.auth_user_id = m.auth_user_id
          and up.permission_key = rp.key
          and up.effect = 'allow'
      )
      or exists (
        select 1
        from public.user_roles ur
        join public.role_permissions rperm on rperm.role_key = ur.role_key
        where ur.auth_user_id = m.auth_user_id
          and rperm.permission_key = rp.key
      )
      or exists (
        select 1
        from public.role_permissions rperm
        where rperm.role_key = public.legacy_app_role_to_rbac_role(m.app_role)
          and rperm.permission_key = rp.key
      )
    );
$$;

revoke all on function public.get_members_with_app_permission(text, text) from public;
revoke all on function public.get_members_with_app_permission(text, text) from anon;
grant execute on function public.get_members_with_app_permission(text, text) to authenticated;
grant execute on function public.get_members_with_app_permission(text, text) to service_role;

with channel_policy(type, default_channels) as (
  values
    ('event_created', array['in_app','email']::text[]),
    ('event_updated', array['in_app']::text[]),
    ('event_moved', array['in_app','email']::text[]),
    ('event_cancelled', array['in_app','email']::text[]),
    ('event_full', array['in_app']::text[]),
    ('event_waitlist_enabled', array['in_app']::text[]),
    ('event_registration_deadline_reached', array['in_app']::text[]),
    ('invoice_created', array['in_app']::text[]),
    ('invoice_paid', array['in_app']::text[]),
    ('invoice_cancelled', array['in_app']::text[]),
    ('invoice_overdue', array['in_app','email']::text[]),
    ('financing_liability_created', array['in_app']::text[]),
    ('financing_liability_updated', array['in_app']::text[]),
    ('financing_repayment_recorded', array['in_app']::text[]),
    ('financing_liability_paid', array['in_app']::text[]),
    ('financing_liability_cancelled', array['in_app']::text[]),
    ('financing_liability_overdue', array['in_app','email']::text[]),
    ('member_application_received', array['in_app']::text[]),
    ('member_accepted', array['in_app']::text[]),
    ('member_rejected', array['in_app']::text[]),
    ('member_deactivated', array['in_app']::text[]),
    ('membership_fee_due', array['in_app','email']::text[]),
    ('membership_fee_paid', array['in_app']::text[]),
    ('membership_fee_reminder_created', array['in_app','email']::text[]),
    ('shop_order_received', array['in_app']::text[]),
    ('shop_order_paid', array['in_app']::text[]),
    ('shop_order_shipped', array['in_app']::text[]),
    ('shop_order_cancelled', array['in_app']::text[]),
    ('sponsor_created', array['in_app']::text[]),
    ('sponsorship_renewed', array['in_app']::text[]),
    ('sponsorship_expiring', array['in_app']::text[]),
    ('sponsorship_payment_received', array['in_app']::text[]),
    ('document_published', array['in_app','email']::text[]),
    ('press_article_published', array['in_app']::text[]),
    ('news_published', array['in_app','email']::text[]),
    ('cash_large_income', array['in_app']::text[]),
    ('cash_large_expense', array['in_app']::text[])
)
update public.notification_templates template
set
  default_channels = channel_policy.default_channels,
  updated_at = now()
from channel_policy
where template.type = channel_policy.type
   or template.key = channel_policy.type;

update public.notification_preferences
set
  enabled = false,
  required = false,
  opted_in_at = null,
  opted_out_at = coalesce(opted_out_at, now())
where channel = 'push'
  and (enabled is distinct from false or required is distinct from false);
