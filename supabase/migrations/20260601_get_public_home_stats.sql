create or replace function public.get_public_home_stats()
returns table (
    active_members bigint,
    upcoming_events bigint,
    public_sponsors bigint,
    public_shop_items bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
    stats_table text;
    filter_sql text;
    date_column text;
    candidate_column text;
begin
    active_members := 0;
    upcoming_events := 0;
    public_sponsors := 0;
    public_shop_items := 0;

    if to_regclass('public.members') is not null then
        filter_sql := 'true';

        if exists (
            select 1
            from information_schema.columns
            where table_schema = 'public'
              and table_name = 'members'
              and column_name = 'is_active'
        ) then
            filter_sql := filter_sql || ' and is_active is true';
        elsif exists (
            select 1
            from information_schema.columns
            where table_schema = 'public'
              and table_name = 'members'
              and column_name = 'active'
        ) then
            filter_sql := filter_sql || ' and active is true';
        elsif exists (
            select 1
            from information_schema.columns
            where table_schema = 'public'
              and table_name = 'members'
              and column_name = 'status'
        ) then
            filter_sql := filter_sql || ' and lower(status::text) in (''active'', ''aktiv'')';
        end if;

        execute format('select count(*) from public.%I where %s', 'members', filter_sql)
        into active_members;
    end if;

    if to_regclass('public.events') is not null then
        filter_sql := 'true';

        foreach candidate_column in array array['is_public', 'public', 'published'] loop
            if exists (
                select 1
                from information_schema.columns c
                where c.table_schema = 'public'
                  and c.table_name = 'events'
                  and c.column_name = candidate_column
            ) then
                filter_sql := filter_sql || format(' and %I is true', candidate_column);
                exit;
            end if;
        end loop;

        if exists (
            select 1
            from information_schema.columns
            where table_schema = 'public'
              and table_name = 'events'
              and column_name = 'status'
        ) then
            filter_sql := filter_sql || ' and lower(status::text) in (''active'', ''published'', ''public'', ''scheduled'', ''geplant'')';
        end if;

        select c.column_name
        into date_column
        from information_schema.columns c
        where c.table_schema = 'public'
          and c.table_name = 'events'
          and c.column_name::text = any (array['starts_at', 'start_at', 'start_time', 'event_date', 'date'])
        order by array_position(array['starts_at', 'start_at', 'start_time', 'event_date', 'date'], c.column_name::text)
        limit 1;

        if date_column is not null then
            filter_sql := filter_sql || format(' and %I >= current_date', date_column);
        end if;

        execute format('select count(*) from public.%I where %s', 'events', filter_sql)
        into upcoming_events;
    end if;

    if to_regclass('public.sponsors') is not null then
        filter_sql := 'true';

        foreach candidate_column in array array['is_public', 'public', 'published'] loop
            if exists (
                select 1
                from information_schema.columns c
                where c.table_schema = 'public'
                  and c.table_name = 'sponsors'
                  and c.column_name = candidate_column
            ) then
                filter_sql := filter_sql || format(' and %I is true', candidate_column);
                exit;
            end if;
        end loop;

        if exists (
            select 1
            from information_schema.columns
            where table_schema = 'public'
              and table_name = 'sponsors'
              and column_name = 'status'
        ) then
            filter_sql := filter_sql || ' and lower(status::text) in (''active'', ''published'', ''public'')';
        end if;

        execute format('select count(*) from public.%I where %s', 'sponsors', filter_sql)
        into public_sponsors;
    end if;

    select candidate_table
    into stats_table
    from unnest(array['shop_items', 'merch_items', 'products']) as candidate_table
    where to_regclass(format('public.%I', candidate_table)) is not null
    limit 1;

    if stats_table is not null then
        filter_sql := 'true';

        foreach candidate_column in array array['is_public', 'public', 'published', 'is_active', 'active'] loop
            if exists (
                select 1
                from information_schema.columns c
                where c.table_schema = 'public'
                  and c.table_name = stats_table
                  and c.column_name = candidate_column
            ) then
                filter_sql := filter_sql || format(' and %I is true', candidate_column);
                exit;
            end if;
        end loop;

        if exists (
            select 1
            from information_schema.columns
            where table_schema = 'public'
              and table_name = stats_table
              and column_name = 'status'
        ) then
            filter_sql := filter_sql || ' and lower(status::text) in (''active'', ''available'', ''published'', ''public'')';
        end if;

        execute format('select count(*) from public.%I where %s', stats_table, filter_sql)
        into public_shop_items;
    end if;

    return next;
end;
$$;

revoke all on function public.get_public_home_stats() from public;
grant execute on function public.get_public_home_stats() to anon, authenticated;
