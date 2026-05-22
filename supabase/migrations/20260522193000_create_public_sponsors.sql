alter table public.sponsors
  add column if not exists is_public boolean not null default false,
  add column if not exists sponsor_level text not null default 'supporter',
  add column if not exists public_sort_order integer not null default 0,
  add column if not exists public_description text,
  add column if not exists logo_alt text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sponsors_sponsor_level_check'
      and conrelid = 'public.sponsors'::regclass
  ) then
    alter table public.sponsors
      add constraint sponsors_sponsor_level_check
      check (sponsor_level in ('main', 'premium', 'partner', 'supporter'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'sponsors_public_sort_order_check'
      and conrelid = 'public.sponsors'::regclass
  ) then
    alter table public.sponsors
      add constraint sponsors_public_sort_order_check
      check (public_sort_order >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'sponsors_public_description_not_blank'
      and conrelid = 'public.sponsors'::regclass
  ) then
    alter table public.sponsors
      add constraint sponsors_public_description_not_blank
      check (public_description is null or length(trim(public_description)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'sponsors_logo_alt_not_blank'
      and conrelid = 'public.sponsors'::regclass
  ) then
    alter table public.sponsors
      add constraint sponsors_logo_alt_not_blank
      check (logo_alt is null or length(trim(logo_alt)) > 0);
  end if;
end;
$$;

create index if not exists sponsors_public_listing_idx
  on public.sponsors (is_public, status, sponsor_level, public_sort_order, lower(name));

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

create or replace function public.can_manage_sponsors()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members
    where members.auth_user_id = auth.uid()
      and members.app_role in ('admin', 'members')
  );
$$;

revoke all on function public.can_manage_sponsors() from public;
grant execute on function public.can_manage_sponsors() to authenticated;

alter table public.sponsors enable row level security;

revoke all on table public.sponsors from public;
revoke all on table public.sponsors from anon;
grant select, insert, update, delete on table public.sponsors to authenticated;

drop policy if exists "authenticated users can read sponsors" on public.sponsors;
create policy "authenticated users can read sponsors"
  on public.sponsors
  for select
  to authenticated
  using (true);

drop policy if exists "authenticated users can insert sponsors" on public.sponsors;
create policy "authenticated users can insert sponsors"
  on public.sponsors
  for insert
  to authenticated
  with check (public.can_manage_sponsors());

drop policy if exists "authenticated users can update sponsors" on public.sponsors;
create policy "authenticated users can update sponsors"
  on public.sponsors
  for update
  to authenticated
  using (public.can_manage_sponsors())
  with check (public.can_manage_sponsors());

drop policy if exists "authenticated users can delete sponsors" on public.sponsors;
create policy "authenticated users can delete sponsors"
  on public.sponsors
  for delete
  to authenticated
  using (public.can_manage_sponsors());

insert into storage.buckets (id, name, public)
values ('public-assets', 'public-assets', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "public assets are readable" on storage.objects;
create policy "public assets are readable"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'public-assets');

drop policy if exists "authenticated users can upload public assets" on storage.objects;
create policy "authenticated users can upload public assets"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'public-assets'
    and name like 'sponsors/%'
    and public.can_manage_sponsors()
  );

drop policy if exists "authenticated users can update public assets" on storage.objects;
create policy "authenticated users can update public assets"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'public-assets'
    and name like 'sponsors/%'
    and public.can_manage_sponsors()
  )
  with check (
    bucket_id = 'public-assets'
    and name like 'sponsors/%'
    and public.can_manage_sponsors()
  );

drop policy if exists "authenticated users can delete public assets" on storage.objects;
create policy "authenticated users can delete public assets"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'public-assets'
    and name like 'sponsors/%'
    and public.can_manage_sponsors()
  );
