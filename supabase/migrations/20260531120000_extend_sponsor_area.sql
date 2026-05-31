alter table public.sponsor_contracts
  add column if not exists payment_status text not null default 'open',
  add column if not exists benefits text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sponsor_contracts_payment_status_check'
      and conrelid = 'public.sponsor_contracts'::regclass
  ) then
    alter table public.sponsor_contracts
      add constraint sponsor_contracts_payment_status_check
      check (payment_status in ('open', 'partial', 'paid', 'overdue', 'waived'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'sponsor_contracts_benefits_not_blank'
      and conrelid = 'public.sponsor_contracts'::regclass
  ) then
    alter table public.sponsor_contracts
      add constraint sponsor_contracts_benefits_not_blank
      check (benefits is null or length(trim(benefits)) > 0);
  end if;
end;
$$;

create index if not exists sponsor_contracts_payment_status_idx
  on public.sponsor_contracts (payment_status);

create or replace function public.get_public_sponsors()
returns table (
  id uuid,
  name text,
  website text,
  logo_path text,
  logo_alt text,
  sponsor_level text,
  sponsor_level_rank integer,
  public_sort_order integer,
  public_description text
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
    sponsors.public_description
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
