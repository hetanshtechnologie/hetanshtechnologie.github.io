-- ============================================================================
-- Reassign ALL application data from one auth user to another.
--
--   SOURCE (old Google login) : snehaliteng@gmail.com
--   TARGET (new Google login) : hetanshtechnologie@gmail.com
--
-- WHY THIS IS NEEDED
--   Google OAuth identifies a user by Google's internal "sub", not by email.
--   So logging in with hetanshtechnologie@gmail.com creates a *different*
--   auth.users row (different UUID) than snehaliteng@gmail.com. Every app
--   stores rows under that UUID (user_id / created_by / owner_id / profile
--   primary keys, ...). To "see the old data" from the new account we must
--   rewrite all of those UUIDs from the old id to the new id.
--
-- PREREQUISITE
--   A row must exist in auth.users for hetanshtechnologie@gmail.com (sign in
--   once with Google, or create it). The script aborts otherwise.
--   Take a backup first.
--
-- HOW TO RUN
--   Supabase Dashboard -> SQL Editor -> paste this whole file -> Run.
--
-- IMPLEMENTATION
--   FK/RI triggers are suppressed for the duration (session_replication_role
--   = replica) so parent/child rows can be rewritten in any order, then the
--   transaction commits atomically. auth schema and system schemas are never
--   touched; storage object ownership is.
--
-- NOTES
--   * On a primary-key / unique-key collision the TARGET (new account) row
--     is removed so the SOURCE (old account) data wins.
--   * Safe to re-run: it only matches the old UUID / old email.
-- ============================================================================

begin;

do $$
declare
  src_email text := 'snehaliteng@gmail.com';
  dst_email text := 'hetanshtechnologie@gmail.com';

  sys_schemas text[] := array[
    'auth','storage','extensions','graphql','graphql_public','net',
    'pgsodium','pgsodium_masks','pgbouncer','realtime','vault',
    'supabase_functions','supabase_migrations','cron','pgmq',
    '_analytics','_realtime','_supabase'
  ];

  src_uid uuid;
  dst_uid uuid;
  rec     record;
  uq      record;
  cond    text;
  n       bigint;
begin
  select id into src_uid from auth.users where lower(email) = lower(src_email);
  select id into dst_uid from auth.users where lower(email) = lower(dst_email);

  if src_uid is null then
    raise exception 'Source user % not found in auth.users', src_email;
  end if;
  if dst_uid is null then
    raise exception 'Target user % not found. Sign in once with Google using that account, then re-run.', dst_email;
  end if;
  if src_uid = dst_uid then
    raise notice 'Source and target are the same user (%) - nothing to do.', src_uid;
    return;
  end if;

  raise notice 'Reassigning % (%)  ->  % (%)', src_email, src_uid, dst_email, dst_uid;

  -- Suppress FK / RI triggers for this session (transaction-safe).
  execute 'set session_replication_role = replica';

  begin
    -- ------------------------------------------------------------------------
    -- 1) Rewrite every UUID column that currently holds the old user id.
    -- ------------------------------------------------------------------------
    for rec in
      select table_schema as sch, table_name as tbl, column_name as col
      from information_schema.columns
      where data_type = 'uuid'
        and table_schema <> 'information_schema'
        and table_schema not like 'pg\_%'
        and table_schema <> all(sys_schemas)
      order by table_schema, table_name, column_name
    loop
      begin
        execute format('update %I.%I set %I = $1 where %I = $2',
                       rec.sch, rec.tbl, rec.col, rec.col)
          using dst_uid, src_uid;
        get diagnostics n = row_count;
        if n > 0 then
          raise notice 'reassigned  %.% -> % row(s)', rec.tbl, rec.col, n;
        end if;

      exception when unique_violation then
        -- Target already has a row that collides on a PK/unique key.
        -- Remove the colliding TARGET row(s) so the old data wins, then retry.
        for uq in
          select array_agg(k.column_name order by k.ordinal_position) as cols
          from information_schema.table_constraints tc
          join information_schema.key_column_usage k
            on k.constraint_name = tc.constraint_name
           and k.table_schema    = tc.table_schema
           and k.table_name      = tc.table_name
          where tc.table_schema = rec.sch
            and tc.table_name   = rec.tbl
            and tc.constraint_type in ('PRIMARY KEY','UNIQUE')
          group by tc.constraint_name
        loop
          select string_agg(
                   case when c = rec.col then 'true'
                        else format('s.%I = d.%I', c, c) end, ' and ')
            into cond
            from unnest(uq.cols) as x(c);

          execute format(
            'delete from %I.%I d where d.%I = $2 and exists (
               select 1 from %I.%I s where s.%I = $1 and %s)',
            rec.sch, rec.tbl, rec.col,
            rec.sch, rec.tbl, rec.col, cond)
            using src_uid, dst_uid;
        end loop;

        execute format('update %I.%I set %I = $1 where %I = $2',
                       rec.sch, rec.tbl, rec.col, rec.col)
          using dst_uid, src_uid;
        get diagnostics n = row_count;
        raise notice 'merged      %.% -> % row(s) (target conflict resolved)', rec.tbl, rec.col, n;
      end;
    end loop;

    -- ------------------------------------------------------------------------
    -- 2) Rewrite plain email text columns that still hold the old address.
    -- ------------------------------------------------------------------------
    for rec in
      select table_schema as sch, table_name as tbl, column_name as col
      from information_schema.columns
      where table_schema <> 'information_schema'
        and table_schema not like 'pg\_%'
        and table_schema <> all(sys_schemas)
        and data_type in ('text','character varying','character')
        and column_name ilike '%email%'
      order by table_schema, table_name, column_name
    loop
      execute format('update %I.%I set %I = $1 where lower(%I) = lower($2)',
                     rec.sch, rec.tbl, rec.col, rec.col)
        using dst_email, src_email;
      get diagnostics n = row_count;
      if n > 0 then
        raise notice 'email       %.% -> % row(s)', rec.tbl, rec.col, n;
      end if;
    end loop;

    -- ------------------------------------------------------------------------
    -- 3) Storage object ownership (files uploaded by the old account).
    -- ------------------------------------------------------------------------
    for rec in
      select column_name as col, data_type as dt
      from information_schema.columns
      where table_schema = 'storage' and table_name = 'objects'
        and column_name in ('owner','owner_id')
    loop
      if rec.dt = 'uuid' then
        execute format('update storage.objects set %I = $1 where %I = $2', rec.col, rec.col)
          using dst_uid, src_uid;
      else
        execute format('update storage.objects set %I = $1 where %I = $2', rec.col, rec.col)
          using dst_uid::text, src_uid::text;
      end if;
      get diagnostics n = row_count;
      if n > 0 then
        raise notice 'reassigned  storage.objects.% -> % row(s)', rec.col, n;
      end if;
    end loop;

  exception when others then
    execute 'set session_replication_role = origin';
    raise;
  end;

  execute 'set session_replication_role = origin';
  raise notice 'DONE. Data from % now belongs to %.', src_email, dst_email;
end $$;

commit;
