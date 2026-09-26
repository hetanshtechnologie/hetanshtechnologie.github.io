-- ============================================================================
-- PDF Password Remover — schema
--
-- Run this once in the Supabase SQL editor (Dashboard > SQL Editor > New query).
-- Then run storage-policies.sql.
--
-- NOTE ON TABLE NAMES
-- This app lives in a Supabase project that is shared with other apps in this
-- repo, and that project already has an unrelated public.users table. Every
-- object here is therefore prefixed `pr_` to avoid colliding with it.
--
-- Env vars assumed by the Edge Functions: SUPABASE_URL, SUPABASE_ANON_KEY,
-- SUPABASE_SERVICE_ROLE_KEY (all provided automatically by Supabase).
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------- enums ----------
do $$ begin
  create type public.pr_role as enum ('admin', 'user');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.pr_user_status as enum ('active', 'blocked');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.pr_log_status as enum ('success', 'failure');
exception when duplicate_object then null; end $$;

-- ---------- tables ----------
create table if not exists public.pr_users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  role        public.pr_role not null default 'user',
  status      public.pr_user_status not null default 'active',
  created_at  timestamptz not null default now(),
  blocked_at  timestamptz
);

create table if not exists public.pr_pdf_logs (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.pr_users(id) on delete cascade,
  filename           text not null,
  status             public.pr_log_status not null,
  error_message      text,
  file_size_bytes    bigint,
  was_encrypted      boolean,
  password_removed   boolean not null default false,
    input_path         text,
    output_path        text,
    created_at         timestamptz not null default now()
  );

  -- Password and retention are added by alter so an existing deployment can be
  -- upgraded in place. See the migration block below.
  alter table public.pr_pdf_logs add column if not exists password_cipher text;
  alter table public.pr_pdf_logs add column if not exists retain_until   timestamptz;

create index if not exists idx_pr_pdf_logs_user    on public.pr_pdf_logs (user_id, created_at desc);
create index if not exists idx_pr_pdf_logs_created on public.pr_pdf_logs (created_at desc);
create index if not exists idx_pr_pdf_logs_status  on public.pr_pdf_logs (status);

-- ---------- helper functions (SECURITY DEFINER to avoid RLS recursion) ----------
-- Admin means "active admin". Folding the status check in here means blocking an
-- admin account takes effect immediately across every admin RPC and RLS policy,
-- instead of leaving a live session with working admin rights until it expires.
create or replace function public.pr_is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select role = 'admin' and status = 'active'
    from public.pr_users where id = auth.uid()
  ), false);
$$;

create or replace function public.pr_is_active() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select status = 'active' from public.pr_users where id = auth.uid()), false);
$$;

-- ---------- signup trigger ----------
-- Fires for password signups AND OAuth (Google) sign-ins, since both insert into
-- auth.users. The address is compared case-insensitively: an OAuth provider
-- hands back whatever casing the account is stored with, so an exact match
-- would quietly hand out the wrong role.
create or replace function public.pr_handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.pr_users (id, email, role)
  values (
    new.id,
    coalesce(new.email, ''),
    public.pr_role_for_email(new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Single source of truth for role assignment. Both the signup trigger and the
-- self-heal below call this, so they can never disagree.
create or replace function public.pr_role_for_email(p_email text) returns public.pr_role
language sql immutable set search_path = '' as $$
  -- btrim as well as lower: Google and some password signups hand back the
  -- address with stray whitespace, and ' hetansh...@gmail.com' must not quietly
  -- become a plain user.
  select case
    when lower(btrim(coalesce(p_email, ''))) = 'hetanshtechnologie@gmail.com'
      then 'admin'::public.pr_role
    else 'user'::public.pr_role
  end;
$$;

drop trigger if exists pr_on_auth_user_created on auth.users;
create trigger pr_on_auth_user_created
  after insert on auth.users
  for each row execute function public.pr_handle_new_user();

-- Self-heal for accounts created before this trigger existed, or before the
-- admin address was configured. Applies the same role rule as the trigger, so
-- re-running the SQL is enough to promote an account that already exists -
-- which is what you need after adding a new admin address.
create or replace function public.pr_ensure_user_profile() returns public.pr_users
language plpgsql security definer set search_path = '' as $$
declare
  v public.pr_users;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select coalesce(email, '') into v_email
    from auth.users where id = auth.uid();

  insert into public.pr_users (id, email, role)
  values (auth.uid(), v_email, public.pr_role_for_email(v_email))
  on conflict (id) do nothing;

  -- An existing row keeps its role unless the address is the admin one and the
  -- row is not an admin yet. Never demotes anyone.
  update public.pr_users
     set role = 'admin'::public.pr_role
   where id = auth.uid()
     and role <> 'admin'::public.pr_role
     and public.pr_role_for_email(email) = 'admin'::public.pr_role;

  select * into v from public.pr_users where id = auth.uid();
  return v;
end;
$$;

-- Defence in depth for the logs table. Gated on the JWT role, not just
-- auth.uid(): a service-role key may carry a `sub` claim of its own, and pr-unlock
-- inserts with the service role on the user's behalf.
create or replace function public.pr_enforce_log_fields() returns trigger
language plpgsql set search_path = '' as $$
begin
  if coalesce(auth.role(), '') = 'authenticated'
     and new.user_id is distinct from auth.uid() then
    raise exception 'user_id must be the current user';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_pr_enforce_log_fields on public.pr_pdf_logs;
create trigger trg_pr_enforce_log_fields
  before insert on public.pr_pdf_logs
  for each row execute function public.pr_enforce_log_fields();

-- ---------- RLS ----------
alter table public.pr_users    enable row level security;
alter table public.pr_pdf_logs enable row level security;

revoke all on public.pr_users    from anon, authenticated;
revoke all on public.pr_pdf_logs from anon, authenticated;

-- Logs are written exclusively by pr-unlock using the service role, so the
-- client gets read-only access. Nothing in the frontend inserts.
grant select on public.pr_users    to authenticated;
grant select on public.pr_pdf_logs to authenticated;

drop policy if exists pr_users_select on public.pr_users;
create policy pr_users_select on public.pr_users
  for select using (id = auth.uid() or public.pr_is_admin());

drop policy if exists pr_users_admin_update on public.pr_users;
create policy pr_users_admin_update on public.pr_users
  for update using (public.pr_is_admin()) with check (public.pr_is_admin());

drop policy if exists pr_logs_select on public.pr_pdf_logs;
create policy pr_logs_select on public.pr_pdf_logs
  for select using (user_id = auth.uid() or public.pr_is_admin());

-- A user must not be able to promote themselves to admin.
create or replace function public.pr_protect_user_fields() returns trigger
language plpgsql set search_path = '' as $$
begin
  if public.pr_is_admin() then
    return new;
  end if;

  -- Self-heel exception. pr_ensure_user_profile() promotes a row whose address
  -- is the admin one, for an account that predates this schema and was created
  -- before any trigger existed. Without this the promotion is impossible: the
  -- caller is not an admin yet, which is precisely what it is trying to become.
  --
  -- Allow exactly one transition and nothing else - 'user' to the role the
  -- row's own email earns, with status and email untouched. This cannot grant
  -- admin to a different account, cannot unblock anyone, cannot change an
  -- address, and cannot demote or re-promote an existing admin.
  if new.role is distinct from old.role
     and old.role = 'user'::public.pr_role
     and new.role = public.pr_role_for_email(new.email)
     and new.status is not distinct from old.status
     and new.email is not distinct from old.email then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.status is distinct from old.status
     or new.email is distinct from old.email then
    raise exception 'role, status and email are administrator-managed';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_pr_protect_user_fields on public.pr_users;
create trigger trg_pr_protect_user_fields
  before update on public.pr_users
  for each row execute function public.pr_protect_user_fields();

-- ---------- admin RPCs (SECURITY DEFINER, guarded) ----------
create or replace function public.pr_admin_list_users()
returns table (
  id           uuid,
  email        text,
  role         public.pr_role,
  status       public.pr_user_status,
  created_at   timestamptz,
  blocked_at   timestamptz,
  total_runs   bigint,
  success_runs bigint
)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.pr_is_admin() then
    raise exception 'Administrator access required';
  end if;

  return query
  select u.id, u.email, u.role, u.status, u.created_at, u.blocked_at,
         count(l.id),
         count(l.id) filter (where l.status = 'success'::public.pr_log_status)
  from public.pr_users u
  left join public.pr_pdf_logs l on l.user_id = u.id
  group by u.id
  order by u.created_at desc;
end;
$$;

create or replace function public.pr_admin_set_user_status(p_user_id uuid, p_blocked boolean)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.pr_is_admin() then
    raise exception 'Administrator access required';
  end if;
  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot block your own account';
  end if;
  if exists (select 1 from public.pr_users where id = p_user_id and role = 'admin') then
    raise exception 'Cannot block an administrator';
  end if;

  update public.pr_users
     set status = case when p_blocked then 'blocked' else 'active' end::public.pr_user_status,
         blocked_at = case when p_blocked then now() else null end
   where id = p_user_id;

  if not found then
    raise exception 'User not found';
  end if;
end;
$$;

create or replace function public.pr_admin_set_user_role(p_user_id uuid, p_role text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.pr_is_admin() then
    raise exception 'Administrator access required';
  end if;
  if p_role not in ('admin', 'user') then
    raise exception 'p_role must be admin or user';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot change your own role';
  end if;

  update public.pr_users set role = p_role::public.pr_role where id = p_user_id;
  if not found then
    raise exception 'User not found';
  end if;
end;
$$;

create or replace function public.pr_admin_stats()
returns table (
  total_users     bigint,
  active_users    bigint,
  blocked_users   bigint,
  total_runs      bigint,
  success_runs    bigint,
  failure_runs    bigint,
  runs_last_24h   bigint,
  runs_last_7d    bigint
)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.pr_is_admin() then
    raise exception 'Administrator access required';
  end if;

  return query
  select
    (select count(*) from public.pr_users),
    (select count(*) from public.pr_users where status = 'active'),
    (select count(*) from public.pr_users where status = 'blocked'),
    (select count(*) from public.pr_pdf_logs),
    (select count(*) from public.pr_pdf_logs where status = 'success'),
    (select count(*) from public.pr_pdf_logs where status = 'failure'),
    (select count(*) from public.pr_pdf_logs where created_at >= now() - interval '24 hours'),
    (select count(*) from public.pr_pdf_logs where created_at >= now() - interval '7 days');
end;
$$;

create or replace function public.pr_admin_user_leaderboard(p_limit int default 10)
returns table (
  id         uuid,
  email      text,
  total_runs bigint,
  success_runs bigint,
  failure_runs bigint,
  last_run_at timestamptz
)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.pr_is_admin() then
    raise exception 'Administrator access required';
  end if;

  return query
  select u.id, u.email,
         count(l.id),
         count(l.id) filter (where l.status = 'success'::public.pr_log_status),
         count(l.id) filter (where l.status = 'failure'::public.pr_log_status),
         max(l.created_at)
  from public.pr_users u
  left join public.pr_pdf_logs l on l.user_id = u.id
  group by u.id
  order by count(l.id) desc, u.created_at asc
  limit greatest(1, least(coalesce(p_limit, 10), 100));
end;
$$;

-- Daily volume for the last 30 days (admin analytics chart).
create or replace function public.pr_admin_daily_volume()
returns table (day date, total bigint, success bigint, failure bigint)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.pr_is_admin() then
    raise exception 'Administrator access required';
  end if;

  return query
  select d::date,
         count(l.id),
         count(l.id) filter (where l.status = 'success'::public.pr_log_status),
         count(l.id) filter (where l.status = 'failure'::public.pr_log_status)
  from generate_series(date_trunc('day', now()) - interval '29 days', date_trunc('day', now()), interval '1 day') d
  left join public.pr_pdf_logs l on l.created_at >= d and l.created_at < d + interval '1 day'
  group by d
  order by d;
end;
$$;

-- Paginated log feed for the admin dashboard.
create or replace function public.pr_admin_list_logs(
  p_limit  int default 100,
  p_offset int default 0,
  p_user   uuid default null,
  p_status text default null
)
  returns table (
    id            uuid,
    user_id       uuid,
    email         text,
    filename      text,
    status        public.pr_log_status,
    error_message text,
    file_size_bytes bigint,
    was_encrypted boolean,
    password_removed boolean,
    created_at    timestamptz,
    has_password  boolean,
    has_input     boolean,
    has_output    boolean,
    retain_until  timestamptz
  )
  language plpgsql security definer set search_path = '' as $$
  begin
    if not public.pr_is_admin() then
      raise exception 'Administrator access required';
    end if;

    return query
    select l.id, l.user_id, u.email, l.filename, l.status, l.error_message,
           l.file_size_bytes, l.was_encrypted, l.password_removed, l.created_at,
           -- has_password, not password_cipher: the list view deliberately does
           -- not carry every user's password to the browser on every page load.
           -- pr_admin_get_log() hands it over on an explicit request instead.
           (l.password_cipher is not null),
           (l.input_path  is not null),
           (l.output_path is not null),
           coalesce(l.retain_until, l.created_at + interval '7 days')
    from public.pr_pdf_logs l
    join public.pr_users u on u.id = l.user_id
    where (p_user is null or l.user_id = p_user)
      and (p_status is null or l.status = p_status::public.pr_log_status)
    order by l.created_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 500))
  offset greatest(0, coalesce(p_offset, 0));
end;
$$;

-- Full detail for one run, requested explicitly. The password is returned still
-- encrypted: the AES-GCM key lives in the PDF_PASSWORD_SECRET function secret and
-- never reaches the database, so only pr-admin can turn password_cipher back
-- into a readable password.
create or replace function public.pr_admin_get_log(p_log_id uuid)
returns table (
  id            uuid,
  user_id       uuid,
  email         text,
  filename      text,
  status        public.pr_log_status,
  error_message text,
  file_size_bytes bigint,
  was_encrypted boolean,
  password_removed boolean,
  input_path    text,
  output_path   text,
  password_cipher text,
  created_at    timestamptz,
  retain_until  timestamptz
)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.pr_is_admin() then
    raise exception 'Administrator access required';
  end if;

  return query
  select l.id, l.user_id, u.email, l.filename, l.status, l.error_message,
         l.file_size_bytes, l.was_encrypted, l.password_removed,
         l.input_path, l.output_path, l.password_cipher, l.created_at,
         coalesce(l.retain_until, l.created_at + interval '7 days')
  from public.pr_pdf_logs l
  join public.pr_users u on u.id = l.user_id
  where l.id = p_log_id;
end;
$$;

-- Pin a run's files so the cleanup sweep leaves them alone, or release the pin
-- (p_retain_hours null) to let them age out on the next sweep.
create or replace function public.pr_admin_set_retain(
  p_log_id       uuid,
  p_retain_hours int default null
)
returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  v_until timestamptz;
begin
  if not public.pr_is_admin() then
    raise exception 'Administrator access required';
  end if;

  v_until := case
    when p_retain_hours is null then null
    else now() + make_interval(hours => greatest(1, least(p_retain_hours, 8760)))
  end;

  update public.pr_pdf_logs
     set retain_until = v_until
   where id = p_log_id;

  if not found then
    raise exception 'No such run';
  end if;

  return v_until;
end;
$$;

-- ---------- grants ----------
-- Supabase ships this default privilege for the postgres role in schema public:
--   postgres=X, anon=X, authenticated=X, service_role=X  (functions)
-- so every function created here is handed to anon and authenticated the moment
-- it is created. "revoke ... from public" does NOT undo that, because the grant
-- is explicit to those roles rather than to PUBLIC. Each revoke below therefore
-- names anon explicitly. Every admin RPC still opens with a pr_is_admin() check,
-- so this is defence in depth rather than the only thing standing in the way.
revoke all on function public.pr_ensure_user_profile() from public, anon, authenticated;
grant execute on function public.pr_ensure_user_profile() to authenticated;

-- pr_is_admin/pr_is_active are called from inside RLS policies, which are
-- evaluated as the querying role, so authenticated must keep EXECUTE on those.
-- anon must not: a policy never runs as anon for these tables, and leaving it
-- callable would expose the admin check to unauthenticated callers.
revoke all on function public.pr_is_admin() from public, anon;
revoke all on function public.pr_is_active() from public, anon;
grant execute on function public.pr_is_admin() to authenticated;
grant execute on function public.pr_is_active() to authenticated;

-- Never called by a client: trigger bodies and the scheduled cleanup. Lock
-- these down completely.
revoke all on function public.pr_handle_new_user() from public, anon, authenticated, service_role;
revoke all on function public.pr_enforce_log_fields() from public, anon, authenticated, service_role;
revoke all on function public.pr_cleanup_expired_pdfs() from public, anon, authenticated, service_role;
-- The previous zero-argument signature is replaced by (int,int). Postgres keeps
-- the old entry as a separate overload, so it is revoked here as well - otherwise
-- it stays callable by anon and someone could sweep the bucket at will.
revoke all on function public.pr_cleanup_expired_pdfs(int, int) from public, anon;

-- pr_protect_user_fields() is a trigger, not invokable directly, but it runs as
-- the calling role and has to evaluate pr_role_for_email() to decide whether a
-- self-heel promotion is legitimate. That is the one reason authenticated needs
-- EXECUTE here; the function only reports whether an address is the admin one.
revoke all on function public.pr_protect_user_fields() from public, anon, authenticated, service_role;
revoke all on function public.pr_role_for_email(text) from public, anon;
grant execute on function public.pr_role_for_email(text) to authenticated;

revoke all on function public.pr_admin_list_users() from public, anon, authenticated;
revoke all on function public.pr_admin_set_user_status(uuid, boolean) from public, anon, authenticated;
revoke all on function public.pr_admin_set_user_role(uuid, text) from public, anon, authenticated;
revoke all on function public.pr_admin_stats() from public, anon, authenticated;
revoke all on function public.pr_admin_user_leaderboard(int) from public, anon, authenticated;
revoke all on function public.pr_admin_daily_volume() from public, anon, authenticated;
revoke all on function public.pr_admin_list_logs(int, int, uuid, text) from public, anon, authenticated;
revoke all on function public.pr_admin_get_log(uuid) from public, anon, authenticated;
revoke all on function public.pr_admin_set_retain(uuid, int) from public, anon, authenticated;

grant execute on function public.pr_admin_get_log(uuid) to authenticated;
grant execute on function public.pr_admin_set_retain(uuid, int) to authenticated;
grant execute on function public.pr_cleanup_expired_pdfs(int, int) to service_role;

grant execute on function public.pr_admin_list_users() to authenticated;
grant execute on function public.pr_admin_set_user_status(uuid, boolean) to authenticated;
grant execute on function public.pr_admin_set_user_role(uuid, text) to authenticated;
grant execute on function public.pr_admin_stats() to authenticated;
grant execute on function public.pr_admin_user_leaderboard(int) to authenticated;
grant execute on function public.pr_admin_daily_volume() to authenticated;
grant execute on function public.pr_admin_list_logs(int, int, uuid, text) to authenticated;

  grant usage on schema public to anon, authenticated, service_role;
  -- pr-unlock uses a service-role client to write the log row and the unlocked
  -- object. Grant that on OUR tables only. "grant all on all tables in schema
  -- public" would hand service_role write access to the ~60 unrelated tables
  -- other apps already keep in this shared schema.
  grant all on table public.pr_users, public.pr_pdf_logs to service_role;

  -- ---------- retention sweep ----------
  -- Uploaded originals and unlocked copies are both kept, so an admin can go
  -- back to any run. A row is swept only once its retention window has passed:
  --   retain_until            when an admin explicitly pinned or released it
  --   created_at + 7 days     the default, chosen by DEFAULT_RETAIN_HOURS
  -- p_extra_hours shifts the default, which is how a test can force an expiry
  -- without waiting a week.
  create or replace function public.pr_cleanup_expired_pdfs(
    p_default_hours int  default 168,
    p_extra_hours   int  default 0
  )
  returns integer
  language plpgsql security definer set search_path = '' as $$
  declare
    r record;
    removed integer := 0;
  begin
    for r in
      select o.name
      from storage.objects o
      where o.bucket_id = 'pr_pdfs'
        and (
          select min(
            coalesce(
              l.retain_until,
              l.created_at + make_interval(hours => greatest(1, coalesce(p_default_hours, 168)))
            )
          )
          from public.pr_pdf_logs l
          where l.input_path = o.name or l.output_path = o.name
        ) <= now() + make_interval(hours => coalesce(p_extra_hours, 0))
    loop
      begin
        perform storage.delete_object('pr_pdfs', r.name);
        removed := removed + 1;
      exception when others then
        -- One unreadable object must not abort the whole sweep.
        null;
      end;
    end loop;
    return removed;
  end;
  $$;

  -- pg_cron is optional on Supabase. When the extension is present the sweep is
  -- scheduled; otherwise it raises a notice and pr_cleanup_expired_pdfs() has to
  -- be called from some other scheduler, or objects are never reclaimed.
  do $$ begin
    if exists (select 1 from pg_extension where extname = 'pg_cron') then
      -- Drop first so re-running this script does not pile up duplicate jobs.
      perform cron.unschedule(jobid) from cron.job where jobname = 'pr-cleanup-expired-pdfs';
      perform cron.schedule('pr-cleanup-expired-pdfs', '*/15 * * * *', 'select public.pr_cleanup_expired_pdfs()');
    else
      raise notice 'pg_cron not installed: run public.pr_cleanup_expired_pdfs() on a schedule or objects are never deleted';
    end if;
  exception when others then
    raise notice 'pg_cron scheduling skipped: %', sqlerrm;
  end $$;
