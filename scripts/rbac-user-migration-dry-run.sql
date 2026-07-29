with
app_role_candidates(app_role, target_role, is_manual_review) as (
  values
    ('super_admin', 'super_admin', false),
    ('administrator', 'administrator', false),
    ('vorstand', 'vorstand', false),
    ('kassier', 'kassier', false),
    ('schriftfuehrer', 'schriftfuehrer', false),
    ('rechnungspruefer', 'rechnungspruefer', false),
    ('mitglied', 'mitglied', false),
    ('admin', 'super_admin', false),
    ('cashier', 'kassier', false),
    ('readonly', 'mitglied', false),
    ('members', null, true),
    ('checkin', null, true)
),
club_role_candidates(club_role, target_role) as (
  values
    ('obmann', 'super_admin'),
    ('obmann_stv', 'administrator'),
    ('kassier', 'kassier'),
    ('kassier_stv', 'kassier'),
    ('schriftfuehrer', 'schriftfuehrer'),
    ('schriftfuehrer_stv', 'schriftfuehrer'),
    ('rechnungspruefer', 'rechnungspruefer'),
    ('vorstandsmitglied', 'vorstand'),
    ('beirat', 'vorstand'),
    ('mitglied', 'mitglied'),
    ('keine', 'mitglied')
),
frontend_legacy_permissions(app_role, permission_key) as (
  select 'admin', key from public.permissions
  union all
  select *
  from (
    values
      ('members', 'mitglieder.view'),
      ('members', 'mitglieder.create'),
      ('members', 'mitglieder.edit'),
      ('members', 'dokumente.view'),
      ('members', 'dokumente.create'),
      ('members', 'dokumente.edit'),
      ('members', 'events.view'),
      ('members', 'sponsoren.view'),
      ('members', 'sponsoren.create'),
      ('members', 'sponsoren.edit'),
      ('members', 'sponsoren.delete'),
      ('members', 'medien_presse.view'),
      ('members', 'medien_presse.create'),
      ('members', 'medien_presse.edit'),
      ('members', 'medien_presse.delete'),
      ('members', 'shop.view'),
      ('members', 'shop.create'),
      ('members', 'shop.edit'),
      ('members', 'shop.delete'),
      ('members', 'inventar.view'),
      ('members', 'inventar.create'),
      ('members', 'inventar.edit'),
      ('members', 'kommunikation.view'),
      ('members', 'kommunikation.create'),
      ('members', 'kommunikation.edit'),
      ('cashier', 'mitglieder.view'),
      ('cashier', 'beitraege.view'),
      ('cashier', 'beitraege.create'),
      ('cashier', 'beitraege.edit'),
      ('cashier', 'kassa.view'),
      ('cashier', 'kassa.create'),
      ('cashier', 'kassa.edit'),
      ('cashier', 'kassa.delete'),
      ('cashier', 'vorfinanzierungen.view'),
      ('cashier', 'vorfinanzierungen.create'),
      ('cashier', 'vorfinanzierungen.edit'),
      ('cashier', 'vorfinanzierungen.delete'),
      ('cashier', 'rechnungen.view'),
      ('cashier', 'rechnungen.create'),
      ('cashier', 'rechnungen.edit'),
      ('cashier', 'shop.view'),
      ('cashier', 'shop.create'),
      ('cashier', 'shop.edit'),
      ('cashier', 'einkauf.view'),
      ('cashier', 'einkauf.create'),
      ('cashier', 'einkauf.edit'),
      ('cashier', 'kommunikation.view'),
      ('cashier', 'kommunikation.create'),
      ('cashier', 'kommunikation.edit'),
      ('checkin', 'events.view'),
      ('checkin', 'events.create'),
      ('checkin', 'events.edit'),
      ('checkin', 'kommunikation.view'),
      ('checkin', 'kommunikation.create'),
      ('checkin', 'kommunikation.edit'),
      ('readonly', 'events.view'),
      ('readonly', 'dokumente.view')
  ) as legacy_permission_values(app_role, permission_key)
),
members_with_candidates as (
  select
    m.id as member_id,
    left(m.id::text, 8) as member_ref,
    m.auth_user_id,
    case when m.auth_user_id is null then null else left(m.auth_user_id::text, 8) end as masked_user_ref,
    concat(left(coalesce(m.first_name, ''), 1), '.', left(coalesce(m.last_name, ''), 1), '.') as masked_name,
    m.status as member_status,
    m.app_role,
    m.role as club_role,
    au.last_sign_in_at,
    arc.target_role as app_role_candidate,
    arc.is_manual_review as app_role_manual_review,
    crc.target_role as club_role_candidate
  from public.members m
  left join auth.users au on au.id = m.auth_user_id
  left join app_role_candidates arc on arc.app_role = m.app_role
  left join club_role_candidates crc on crc.club_role = m.role
),
resolved_candidates as (
  select
    mwc.*,
    case
      when mwc.app_role_manual_review then null
      when mwc.app_role_candidate is not null then mwc.app_role_candidate
      when mwc.club_role_candidate is not null then mwc.club_role_candidate
      else null
    end as proposed_rbac_role,
    (
      mwc.app_role_candidate is not null
      and mwc.club_role_candidate is not null
      and mwc.app_role_candidate <> mwc.club_role_candidate
    ) as has_role_conflict,
    coalesce(
      (
        select string_agg(ur.role_key, ', ' order by ur.role_key)
        from public.user_roles ur
        where ur.auth_user_id = mwc.auth_user_id
      ),
      ''
    ) as current_rbac_roles,
    exists (
      select 1
      from public.user_permissions up
      where up.auth_user_id = mwc.auth_user_id
    ) as has_user_permission_overrides
  from members_with_candidates mwc
),
base_status as (
  select
    rc.*,
    case
      when rc.member_status is distinct from 'aktiv' then 'skip_inactive'
      when rc.auth_user_id is null then 'skip_no_auth'
      when rc.app_role_manual_review then 'manual_review'
      when rc.has_role_conflict then 'skip_conflict'
      when rc.proposed_rbac_role is null then 'skip_unknown_role'
      when not exists (select 1 from public.roles r where r.key = rc.proposed_rbac_role) then 'skip_unknown_role'
      when exists (
        select 1
        from public.user_roles ur
        where ur.auth_user_id = rc.auth_user_id
          and ur.role_key = rc.proposed_rbac_role
      ) then 'already_assigned'
      else 'auto_insert'
    end as base_migration_status,
    case
      when rc.member_status is distinct from 'aktiv' then 'member is not active'
      when rc.auth_user_id is null then 'member has no auth_user_id'
      when rc.app_role_manual_review then 'legacy app_role requires manual decision'
      when rc.has_role_conflict then 'app_role and club role point to different RBAC roles'
      when rc.proposed_rbac_role is null then 'no known app_role or club role mapping'
      when not exists (select 1 from public.roles r where r.key = rc.proposed_rbac_role) then 'proposed target role does not exist in public.roles'
      when exists (
        select 1
        from public.user_roles ur
        where ur.auth_user_id = rc.auth_user_id
          and ur.role_key = rc.proposed_rbac_role
      ) then 'target role is already present in public.user_roles'
      else 'safe dry-run candidate; no data is changed by this script'
    end as base_migration_reason
  from resolved_candidates rc
),
current_effective_permissions as (
  select bs.member_id, rp.permission_key
  from base_status bs
  join public.user_roles ur on ur.auth_user_id = bs.auth_user_id
  join public.role_permissions rp on rp.role_key = ur.role_key
  union
  select bs.member_id, up.permission_key
  from base_status bs
  join public.user_permissions up on up.auth_user_id = bs.auth_user_id
  where up.effect = 'allow'
  union
  select bs.member_id, rp.permission_key
  from base_status bs
  join public.role_permissions rp on rp.role_key = bs.app_role_candidate
  where bs.app_role_candidate is not null
    and not bs.app_role_manual_review
  union
  select bs.member_id, flp.permission_key
  from base_status bs
  join frontend_legacy_permissions flp on flp.app_role = bs.app_role
),
current_effective_permissions_without_denies as (
  select cep.member_id, cep.permission_key
  from current_effective_permissions cep
  where not exists (
    select 1
    from base_status bs
    join public.user_permissions up on up.auth_user_id = bs.auth_user_id
    where bs.member_id = cep.member_id
      and up.permission_key = cep.permission_key
      and up.effect = 'deny'
  )
),
proposed_permissions as (
  select bs.member_id, rp.permission_key
  from base_status bs
  join public.role_permissions rp on rp.role_key = bs.proposed_rbac_role
  where bs.base_migration_status in ('auto_insert', 'already_assigned')
),
permission_diffs as (
  select
    bs.member_id,
    coalesce(
      (
        select array_agg(p.permission_key order by p.permission_key)
        from proposed_permissions p
        where p.member_id = bs.member_id
          and not exists (
            select 1
            from current_effective_permissions_without_denies c
            where c.member_id = bs.member_id
              and c.permission_key = p.permission_key
          )
      ),
      array[]::text[]
    ) as gained_permissions,
    coalesce(
      (
        select array_agg(c.permission_key order by c.permission_key)
        from current_effective_permissions_without_denies c
        where c.member_id = bs.member_id
          and not exists (
            select 1
            from proposed_permissions p
            where p.member_id = bs.member_id
              and p.permission_key = c.permission_key
          )
      ),
      array[]::text[]
    ) as lost_permissions
  from base_status bs
),
final_detail as (
  select
    'detail' as record_type,
    bs.member_ref,
    bs.masked_user_ref,
    bs.masked_name,
    bs.member_status,
    bs.app_role,
    bs.club_role,
    bs.app_role_candidate,
    bs.club_role_candidate,
    bs.proposed_rbac_role,
    bs.current_rbac_roles,
    bs.has_user_permission_overrides,
    case
      when bs.base_migration_status in ('auto_insert', 'already_assigned')
        and (cardinality(pd.gained_permissions) > 0 or cardinality(pd.lost_permissions) > 0)
      then 'manual_review'
      else bs.base_migration_status
    end as migration_status,
    case
      when bs.base_migration_status in ('auto_insert', 'already_assigned')
        and cardinality(pd.gained_permissions) > 0
        and cardinality(pd.lost_permissions) > 0
      then 'proposed role changes effective permissions; gains and losses require manual review'
      when bs.base_migration_status in ('auto_insert', 'already_assigned')
        and cardinality(pd.gained_permissions) > 0
      then 'proposed role grants additional permissions; manual review required'
      when bs.base_migration_status in ('auto_insert', 'already_assigned')
        and cardinality(pd.lost_permissions) > 0
      then 'proposed role loses currently effective permissions; manual review required'
      else bs.base_migration_reason
    end as migration_reason,
    (
      bs.base_migration_status = 'auto_insert'
      and cardinality(pd.gained_permissions) = 0
      and cardinality(pd.lost_permissions) = 0
    ) as would_insert,
    case
      when bs.base_migration_status = 'auto_insert'
        and cardinality(pd.gained_permissions) = 0
        and cardinality(pd.lost_permissions) = 0
      then 'INSERT INTO public.user_roles (auth_user_id, role_key) VALUES (''<auth_user_id:'
        || bs.masked_user_ref
        || '>'', '''
        || bs.proposed_rbac_role
        || ''');'
      else null
    end as proposed_insert_preview,
    case
      when bs.base_migration_status not in ('auto_insert', 'already_assigned') then 'unclear'
      when cardinality(pd.gained_permissions) > 0 and cardinality(pd.lost_permissions) > 0 then 'unclear'
      when cardinality(pd.gained_permissions) > 0 then 'rights_gain'
      when cardinality(pd.lost_permissions) > 0 then 'rights_loss'
      else 'equal'
    end as rights_comparison,
    pd.gained_permissions,
    pd.lost_permissions,
    null::jsonb as status_counts,
    null::jsonb as audit_counts
  from base_status bs
  join permission_diffs pd on pd.member_id = bs.member_id
),
summary_counts as (
  select
    'summary' as record_type,
    null::text as member_ref,
    null::text as masked_user_ref,
    null::text as masked_name,
    null::text as member_status,
    null::text as app_role,
    null::text as club_role,
    null::text as app_role_candidate,
    null::text as club_role_candidate,
    null::text as proposed_rbac_role,
    null::text as current_rbac_roles,
    null::boolean as has_user_permission_overrides,
    null::text as migration_status,
    null::text as migration_reason,
    null::boolean as would_insert,
    null::text as proposed_insert_preview,
    null::text as rights_comparison,
    null::text[] as gained_permissions,
    null::text[] as lost_permissions,
    jsonb_build_object(
      'auto_insert', count(*) filter (where migration_status = 'auto_insert'),
      'already_assigned', count(*) filter (where migration_status = 'already_assigned'),
      'skip_no_auth', count(*) filter (where migration_status = 'skip_no_auth'),
      'skip_conflict', count(*) filter (where migration_status = 'skip_conflict'),
      'skip_unknown_role', count(*) filter (where migration_status = 'skip_unknown_role'),
      'skip_inactive', count(*) filter (where migration_status = 'skip_inactive'),
      'manual_review', count(*) filter (where migration_status = 'manual_review')
    ) as status_counts,
    jsonb_build_object(
      'auth_users', (select count(*) from auth.users),
      'linked_active_members', (select count(*) from public.members where auth_user_id is not null and status = 'aktiv'),
      'members_without_auth', (select count(*) from public.members where auth_user_id is null),
      'existing_user_roles', (select count(*) from public.user_roles),
      'existing_user_permissions', (select count(*) from public.user_permissions),
      'distinct_target_roles', count(distinct proposed_rbac_role) filter (where proposed_rbac_role is not null),
      'manual_decisions', count(*) filter (where migration_status in ('manual_review', 'skip_conflict', 'skip_unknown_role'))
    ) as audit_counts
  from final_detail
)
select *
from (
  select *
  from final_detail
  union all
  select *
  from summary_counts
) as dry_run_output
order by
  case record_type when 'detail' then 1 else 2 end,
  case migration_status
    when 'auto_insert' then 1
    when 'already_assigned' then 2
    when 'manual_review' then 3
    when 'skip_conflict' then 4
    when 'skip_unknown_role' then 5
    when 'skip_no_auth' then 6
    when 'skip_inactive' then 7
    else 8
  end,
  member_ref;
