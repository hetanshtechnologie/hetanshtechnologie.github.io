create extension if not exists pgcrypto;

create table if not exists public.glowly_users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  phone text not null default '',
  role text not null default 'customer' check (role in ('admin', 'owner', 'stylist', 'customer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.glowly_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  price numeric(10, 2) not null default 0 check (price >= 0),
  features jsonb not null default '[]'::jsonb,
  stylist_limit integer not null default 3 check (stylist_limit >= 0),
  appointment_limit integer not null default 100 check (appointment_limit >= 0),
  analytics_enabled boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.glowly_salons (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.glowly_users(id) on delete cascade,
  name text not null,
  address text not null default '',
  contact text not null default '',
  plan_id uuid references public.glowly_plans(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  timezone text not null default 'UTC',
  usage_percent integer not null default 0 check (usage_percent between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.glowly_salons drop constraint if exists glowly_salons_plan_id_fkey;
alter table public.glowly_salons add constraint glowly_salons_plan_id_fkey foreign key (plan_id) references public.glowly_plans(id) on delete restrict;

create table if not exists public.glowly_salon_stylists (
  salon_id uuid not null references public.glowly_salons(id) on delete cascade,
  user_id uuid not null references public.glowly_users(id) on delete cascade,
  role text not null default 'stylist' check (role in ('stylist', 'manager')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (salon_id, user_id)
);

create table if not exists public.glowly_salon_invitations (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.glowly_salons(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  role text not null default 'stylist' check (role in ('stylist', 'manager')),
  specialty text not null default '',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by uuid not null default auth.uid() references public.glowly_users(id) on delete restrict,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz
);

alter table public.glowly_salon_invitations drop constraint if exists glowly_salon_invitations_salon_id_email_key;

create table if not exists public.glowly_salon_customers (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.glowly_salons(id) on delete cascade,
  name text not null,
  email text not null default '',
  phone text not null default '',
  status text not null default 'active' check (status in ('active', 'vip', 'new', 'inactive')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.glowly_services (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.glowly_salons(id) on delete cascade,
  name text not null,
  description text not null default '',
  price numeric(10, 2) not null default 0 check (price >= 0),
  duration_minutes integer not null default 60 check (duration_minutes > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.glowly_availability (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.glowly_salons(id) on delete cascade,
  stylist_id uuid not null references public.glowly_users(id) on delete cascade,
  date date not null,
  time_slot time not null,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  unique (salon_id, stylist_id, date, time_slot)
);

create table if not exists public.glowly_appointments (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.glowly_salons(id) on delete cascade,
  customer_id uuid not null references public.glowly_users(id) on delete cascade,
  stylist_id uuid references public.glowly_users(id) on delete set null,
  service_id uuid not null references public.glowly_services(id) on delete restrict,
  service text not null,
  date date not null,
  time time not null,
  duration_minutes integer not null default 60 check (duration_minutes > 0),
  price numeric(10, 2) not null default 0 check (price >= 0),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.glowly_invoices (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.glowly_salons(id) on delete cascade,
  amount numeric(10, 2) not null check (amount >= 0),
  status text not null default 'paid' check (status in ('paid', 'open', 'void')),
  description text not null default '',
  period_start date,
  period_end date,
  created_at timestamptz not null default now()
);

create table if not exists public.glowly_subscription_requests (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.glowly_salons(id) on delete cascade,
  requested_plan_id uuid not null references public.glowly_plans(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  note text not null default '',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists glowly_users_role_idx on public.glowly_users(role);
create index if not exists glowly_salons_owner_id_idx on public.glowly_salons(owner_id);
create index if not exists glowly_salons_status_idx on public.glowly_salons(status);
create index if not exists glowly_salon_stylists_user_id_idx on public.glowly_salon_stylists(user_id);
create index if not exists glowly_salon_invitations_salon_id_idx on public.glowly_salon_invitations(salon_id);
create index if not exists glowly_salon_customers_salon_id_idx on public.glowly_salon_customers(salon_id);
create index if not exists glowly_services_salon_id_idx on public.glowly_services(salon_id);
create index if not exists glowly_availability_salon_date_idx on public.glowly_availability(salon_id, date);
create index if not exists glowly_appointments_salon_date_idx on public.glowly_appointments(salon_id, date, time);
create index if not exists glowly_appointments_customer_date_idx on public.glowly_appointments(customer_id, date);
create index if not exists glowly_invoices_salon_id_idx on public.glowly_invoices(salon_id);
create index if not exists glowly_subscription_requests_salon_id_idx on public.glowly_subscription_requests(salon_id);
create unique index if not exists glowly_salon_invitations_pending_email_idx on public.glowly_salon_invitations (salon_id, lower(email)) where status = 'pending';
create unique index if not exists glowly_subscription_requests_one_pending_idx on public.glowly_subscription_requests (salon_id) where status = 'pending';

create or replace function public.glowly_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.glowly_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text;
begin
  requested_role := case when new.raw_user_meta_data ->> 'role' = 'owner' then 'owner' else 'customer' end;
  insert into public.glowly_users (id, name, email, phone, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    requested_role
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.glowly_current_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.glowly_users where id = auth.uid();
$$;

create or replace function public.glowly_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.glowly_current_user_role() = 'admin', false);
$$;

create or replace function public.glowly_bootstrap_first_admin(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.glowly_users where role = 'admin') then
    raise exception 'An administrator already exists';
  end if;
  update public.glowly_users set role = 'admin' where id = target_user_id;
  if not found then
    raise exception 'The target user does not exist';
  end if;
  return true;
end;
$$;

create or replace function public.glowly_is_salon_owner(target_salon_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.glowly_salons where id = target_salon_id and owner_id = auth.uid());
$$;

create or replace function public.glowly_is_salon_manager(target_salon_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.glowly_is_admin()
    or public.glowly_is_salon_owner(target_salon_id)
    or exists (
      select 1
      from public.glowly_salon_stylists
      where salon_id = target_salon_id
        and user_id = auth.uid()
        and role = 'manager'
        and active
    );
$$;

create or replace function public.glowly_is_salon_staff(target_salon_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.glowly_is_admin() or exists (
    select 1 from public.glowly_salon_stylists
    where salon_id = target_salon_id and user_id = auth.uid() and active
  );
$$;

create or replace function public.glowly_is_salon_member(target_salon_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.glowly_is_salon_owner(target_salon_id) or public.glowly_is_salon_staff(target_salon_id);
$$;

create or replace function public.glowly_can_view_user(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    target_user_id = auth.uid()
    or public.glowly_is_admin()
    or exists (
      select 1
      from public.glowly_salon_stylists mine
      join public.glowly_salon_stylists theirs on theirs.salon_id = mine.salon_id
      where mine.user_id = auth.uid() and theirs.user_id = target_user_id and mine.active and theirs.active
    )
    or exists (
      select 1
      from public.glowly_salons s
      join public.glowly_salon_stylists membership on membership.salon_id = s.id
      where s.owner_id = auth.uid() and membership.user_id = target_user_id and membership.active
    )
    or exists (
      select 1
      from public.glowly_salons s
      join public.glowly_appointments a on a.salon_id = s.id
      where (s.owner_id = auth.uid() or public.glowly_is_salon_staff(s.id)) and a.customer_id = target_user_id
    );
$$;

create or replace function public.glowly_owns_or_manages_salon(target_salon_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.glowly_is_salon_manager(target_salon_id);
$$;

create or replace function public.glowly_protect_user_profile()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id or new.email is distinct from old.email then
    raise exception 'Only administrators can change identity fields';
  end if;
  if new.role is distinct from old.role and not (
    public.glowly_is_admin()
    or (
      new.role = 'admin'
      and old.role <> 'admin'
      and (select relowner from pg_class where oid = 'public.glowly_users'::regclass) = (select oid from pg_roles where rolname = current_user)
      and not exists (select 1 from public.glowly_users where role = 'admin')
    )
  ) then
    raise exception 'Only administrators can change account roles';
  end if;
  return new;
end;
$$;

create or replace function public.glowly_protect_salon_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.glowly_is_admin() and (
    new.owner_id is distinct from old.owner_id
    or new.status is distinct from old.status
    or new.plan_id is distinct from old.plan_id
    or new.usage_percent is distinct from old.usage_percent
  ) then
    raise exception 'Plan, usage and approval fields are administrator-managed';
  end if;
  return new;
end;
$$;

create or replace function public.glowly_protect_invitation_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'pending' or new.accepted_at is not null or new.expires_at <= now() then
      raise exception 'New invitations must be active and pending';
    end if;
    if not public.glowly_is_admin() and new.invited_by is distinct from auth.uid() then
      raise exception 'Invitation ownership cannot be forged';
    end if;
    return new;
  end if;

  if new.salon_id is distinct from old.salon_id
    or new.email is distinct from old.email
    or new.invited_by is distinct from old.invited_by
    or new.created_at is distinct from old.created_at then
    raise exception 'Invitation ownership fields are immutable';
  end if;

  if new.status = 'accepted' then
    if public.glowly_is_admin() or (select relowner from pg_class where oid = 'public.glowly_salon_invitations'::regclass) = (select oid from pg_roles where rolname = current_user) then
      return new;
    end if;
    raise exception 'Only the invitation acceptance service can accept an invitation';
  end if;

  if old.status = 'accepted'
    or (old.status = 'pending' and new.status not in ('pending', 'revoked', 'expired'))
    or (old.status in ('revoked', 'expired') and new.status is distinct from old.status and new.status <> 'pending') then
    raise exception 'Invalid invitation status transition';
  end if;

  if new.status = 'pending' and (new.accepted_at is not null or new.expires_at <= now()) then
    raise exception 'Pending invitations must be active and have no acceptance time';
  end if;
  if new.status in ('revoked', 'expired') and new.accepted_at is not null then
    raise exception 'Closed invitations cannot have an acceptance time';
  end if;
  return new;
end;
$$;

create or replace function public.glowly_enforce_stylist_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  allowed integer;
  current_count integer;
  plan_active boolean;
begin
  if tg_op = 'UPDATE' then
    if new.salon_id is distinct from old.salon_id or new.user_id is distinct from old.user_id then
      raise exception 'Salon and user membership fields are immutable';
    end if;
    if old.active then
      return new;
    end if;
  end if;

  if not new.active then
    return new;
  end if;

  perform 1 from public.glowly_salons where id = new.salon_id for update;
  select p.stylist_limit, p.active
  into allowed, plan_active
  from public.glowly_salons s
  join public.glowly_plans p on p.id = s.plan_id
  where s.id = new.salon_id;

  if allowed is null or plan_active is not true then
    raise exception 'An active subscription plan is required';
  end if;

  if allowed > 0 then
    select count(*) into current_count from public.glowly_salon_stylists where salon_id = new.salon_id and active;
    if current_count >= allowed then
      raise exception 'The current plan stylist limit has been reached';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.glowly_validate_appointment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  salon_status text;
  salon_timezone text;
  plan_active boolean;
  service_record record;
  appointment_limit integer;
  appointment_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('salon:' || new.salon_id::text || ':' || to_char(new.date, 'YYYY-MM'), 0));

  select s.status, s.timezone, p.appointment_limit, p.active
  into salon_status, salon_timezone, appointment_limit, plan_active
  from public.glowly_salons s
  join public.glowly_plans p on p.id = s.plan_id
  where s.id = new.salon_id;

  if salon_status is distinct from 'approved' then
    raise exception 'Appointments require an approved salon';
  end if;
  if appointment_limit is null or plan_active is not true then
    raise exception 'An active subscription plan is required';
  end if;
  if not public.glowly_is_salon_manager(new.salon_id) and new.customer_id is distinct from auth.uid() then
    raise exception 'Customers may only book for themselves';
  end if;
  if not public.glowly_is_salon_manager(new.salon_id) and new.date + new.time <= timezone(salon_timezone, now())::timestamp then
    raise exception 'Appointments must be booked in the future';
  end if;

  select id, name, duration_minutes, price
  into service_record
  from public.glowly_services
  where id = new.service_id and salon_id = new.salon_id and active;

  if service_record is null then
    raise exception 'The selected service is not available for this salon';
  end if;

  new.duration_minutes := service_record.duration_minutes;
  if new.duration_minutes > 1440 or extract(epoch from new.time) / 60 + new.duration_minutes > 1440 then
    raise exception 'Appointments must finish on the same calendar day';
  end if;

  if new.stylist_id is null then
    select candidate.stylist_id
    into new.stylist_id
    from public.glowly_availability candidate
    join public.glowly_salon_stylists membership
      on membership.salon_id = candidate.salon_id
     and membership.user_id = candidate.stylist_id
     and membership.active
    where candidate.salon_id = new.salon_id
      and candidate.date = new.date
      and candidate.time_slot = new.time
      and candidate.is_available
      and not exists (
        select 1
        from public.glowly_appointments booked
        where booked.stylist_id = candidate.stylist_id
          and booked.date = new.date
          and booked.status <> 'cancelled'
          and new.time < booked.time + (booked.duration_minutes * interval '1 minute')
          and new.time + (new.duration_minutes * interval '1 minute') > booked.time
      )
    order by (membership.role = 'manager') desc, candidate.stylist_id
    limit 1;

    if new.stylist_id is null then
      raise exception 'No stylist is available at that time';
    end if;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('stylist:' || new.stylist_id::text || ':' || new.date::text, 0));

  if not exists (
    select 1 from public.glowly_salon_stylists where salon_id = new.salon_id and user_id = new.stylist_id and active
  ) then
    raise exception 'The selected stylist is not part of this salon';
  end if;

  if not exists (
    select 1 from public.glowly_availability
    where salon_id = new.salon_id and stylist_id = new.stylist_id and date = new.date and time_slot = new.time and is_available
  ) then
    raise exception 'The selected stylist is not available at that time';
  end if;

  if exists (
    select 1
    from public.glowly_appointments existing
    where existing.stylist_id = new.stylist_id
      and existing.date = new.date
      and existing.status <> 'cancelled'
      and new.time < existing.time + (existing.duration_minutes * interval '1 minute')
      and new.time + (new.duration_minutes * interval '1 minute') > existing.time
  ) then
    raise exception 'That stylist already has an appointment during this time';
  end if;

  if appointment_limit > 0 then
    select count(*) into appointment_count
    from public.glowly_appointments
    where salon_id = new.salon_id
      and date >= date_trunc('month', new.date)::date
      and date < (date_trunc('month', new.date) + interval '1 month')::date
      and status <> 'cancelled';
    if appointment_count >= appointment_limit then
      raise exception 'The current plan appointment limit has been reached';
    end if;
  end if;

  new.service := service_record.name;
  new.price := service_record.price;
  new.status := 'pending';
  new.created_at := now();
  return new;
end;
$$;

create or replace function public.glowly_protect_appointment_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.glowly_is_admin() or public.glowly_is_salon_manager(old.salon_id) or old.stylist_id = auth.uid() then
    if new.salon_id is distinct from old.salon_id
      or new.customer_id is distinct from old.customer_id
      or new.stylist_id is distinct from old.stylist_id
      or new.service_id is distinct from old.service_id
      or new.service is distinct from old.service
      or new.date is distinct from old.date
      or new.time is distinct from old.time
      or new.duration_minutes is distinct from old.duration_minutes
      or new.price is distinct from old.price
      or new.created_at is distinct from old.created_at then
      raise exception 'Only appointment details, notes and status can be changed';
    end if;
    if (old.status = 'cancelled' and new.status <> 'cancelled')
      or (old.status = 'completed' and new.status <> 'completed') then
      raise exception 'Completed and cancelled appointments cannot be reopened';
    end if;
    return new;
  end if;

  if old.customer_id = auth.uid()
    and new.customer_id is not distinct from old.customer_id
    and new.salon_id is not distinct from old.salon_id
    and new.stylist_id is not distinct from old.stylist_id
    and new.service_id is not distinct from old.service_id
    and new.service is not distinct from old.service
    and new.date is not distinct from old.date
    and new.time is not distinct from old.time
    and new.duration_minutes is not distinct from old.duration_minutes
    and new.price is not distinct from old.price
    and new.notes is not distinct from old.notes
    and new.created_at is not distinct from old.created_at
    and new.status = 'cancelled'
    and old.status not in ('completed', 'cancelled') then
    return new;
  end if;

  raise exception 'Customers may only cancel their own appointments';
end;
$$;

create or replace function public.glowly_accept_salon_invitation(target_invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.glowly_salon_invitations;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  select * into invitation
  from public.glowly_salon_invitations
  where id = target_invitation_id
  for update;

  if invitation.id is null or lower(invitation.email) <> lower(auth.jwt() ->> 'email') then
    raise exception 'Invitation not found for this account';
  end if;
  if invitation.status <> 'pending' or invitation.expires_at <= now() then
    raise exception 'This invitation is no longer active';
  end if;

  insert into public.glowly_salon_stylists (salon_id, user_id, role, active)
  values (invitation.salon_id, auth.uid(), invitation.role, true)
  on conflict (salon_id, user_id) do update set role = excluded.role, active = true;

  update public.glowly_salon_invitations
  set status = 'accepted', accepted_at = now()
  where id = invitation.id;

  return invitation.salon_id;
end;
$$;

create or replace function public.glowly_resolve_subscription_request(target_request_id uuid, resolution text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_record public.glowly_subscription_requests;
  salon_status text;
begin
  if not public.glowly_is_admin() then
    raise exception 'Administrator access is required';
  end if;
  if resolution not in ('approved', 'rejected') then
    raise exception 'Invalid subscription resolution';
  end if;

  select * into request_record
  from public.glowly_subscription_requests
  where id = target_request_id
  for update;

  if request_record.id is null then
    raise exception 'Subscription request not found';
  end if;
  if request_record.status <> 'pending' then
    raise exception 'Subscription request was already resolved';
  end if;

  select status into salon_status
  from public.glowly_salons
  where id = request_record.salon_id
  for update;

  if salon_status is null then
    raise exception 'The salon for this request no longer exists';
  end if;

  if resolution = 'approved' then
    if salon_status <> 'approved' then
      raise exception 'Only approved salons can change subscription plans';
    end if;
    if not exists (select 1 from public.glowly_plans where id = request_record.requested_plan_id and active) then
      raise exception 'The requested subscription plan is no longer active';
    end if;
    update public.glowly_salons
    set plan_id = request_record.requested_plan_id
    where id = request_record.salon_id;
  end if;

  update public.glowly_subscription_requests
  set status = resolution, resolved_at = now()
  where id = target_request_id;
end;
$$;

drop trigger if exists glowly_on_auth_user_created on auth.users;
create trigger glowly_on_auth_user_created
after insert on auth.users
for each row execute function public.glowly_handle_new_user();

drop trigger if exists glowly_users_set_updated_at on public.glowly_users;
create trigger glowly_users_set_updated_at before update on public.glowly_users for each row execute function public.glowly_set_updated_at();
drop trigger if exists glowly_users_protect_profile on public.glowly_users;
create trigger glowly_users_protect_profile before update on public.glowly_users for each row execute function public.glowly_protect_user_profile();
drop trigger if exists glowly_plans_set_updated_at on public.glowly_plans;
create trigger glowly_plans_set_updated_at before update on public.glowly_plans for each row execute function public.glowly_set_updated_at();
drop trigger if exists glowly_salons_set_updated_at on public.glowly_salons;
create trigger glowly_salons_set_updated_at before update on public.glowly_salons for each row execute function public.glowly_set_updated_at();
drop trigger if exists glowly_salons_protect_fields on public.glowly_salons;
create trigger glowly_salons_protect_fields before update on public.glowly_salons for each row execute function public.glowly_protect_salon_fields();
drop trigger if exists glowly_salon_invitations_protect_fields on public.glowly_salon_invitations;
create trigger glowly_salon_invitations_protect_fields before insert or update on public.glowly_salon_invitations for each row execute function public.glowly_protect_invitation_fields();
drop trigger if exists glowly_salon_customers_set_updated_at on public.glowly_salon_customers;
create trigger glowly_salon_customers_set_updated_at before update on public.glowly_salon_customers for each row execute function public.glowly_set_updated_at();
drop trigger if exists glowly_services_set_updated_at on public.glowly_services;
create trigger glowly_services_set_updated_at before update on public.glowly_services for each row execute function public.glowly_set_updated_at();
drop trigger if exists glowly_salon_stylists_enforce_limit on public.glowly_salon_stylists;
create trigger glowly_salon_stylists_enforce_limit before insert or update of active, salon_id, user_id on public.glowly_salon_stylists for each row execute function public.glowly_enforce_stylist_limit();
drop trigger if exists glowly_appointments_set_updated_at on public.glowly_appointments;
create trigger glowly_appointments_set_updated_at before update on public.glowly_appointments for each row execute function public.glowly_set_updated_at();
drop trigger if exists glowly_appointments_validate on public.glowly_appointments;
create trigger glowly_appointments_validate before insert on public.glowly_appointments for each row execute function public.glowly_validate_appointment();
drop trigger if exists glowly_appointments_protect_update on public.glowly_appointments;
create trigger glowly_appointments_protect_update before update on public.glowly_appointments for each row execute function public.glowly_protect_appointment_update();

revoke all on function public.glowly_bootstrap_first_admin(uuid) from public;
grant execute on function public.glowly_bootstrap_first_admin(uuid) to service_role;
revoke all on function public.glowly_accept_salon_invitation(uuid) from public;
grant execute on function public.glowly_accept_salon_invitation(uuid) to authenticated;
revoke all on function public.glowly_resolve_subscription_request(uuid, text) from public;
grant execute on function public.glowly_resolve_subscription_request(uuid, text) to authenticated;

alter table public.glowly_users enable row level security;
alter table public.glowly_plans enable row level security;
alter table public.glowly_salons enable row level security;
alter table public.glowly_salon_stylists enable row level security;
alter table public.glowly_salon_invitations enable row level security;
alter table public.glowly_salon_customers enable row level security;
alter table public.glowly_services enable row level security;
alter table public.glowly_availability enable row level security;
alter table public.glowly_appointments enable row level security;
alter table public.glowly_invoices enable row level security;
alter table public.glowly_subscription_requests enable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant select on public.glowly_plans to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;

drop policy if exists users_select_related on public.glowly_users;
create policy users_select_related on public.glowly_users for select using (id = auth.uid() or public.glowly_is_admin() or public.glowly_can_view_user(id));

drop policy if exists users_update_self on public.glowly_users;
create policy users_update_self on public.glowly_users for update using (id = auth.uid() or public.glowly_is_admin()) with check (id = auth.uid() or public.glowly_is_admin());

drop policy if exists users_admin_insert on public.glowly_users;
create policy users_admin_insert on public.glowly_users for insert with check (public.glowly_is_admin());

drop policy if exists users_admin_delete on public.glowly_users;
create policy users_admin_delete on public.glowly_users for delete using (public.glowly_is_admin());

drop policy if exists plans_public_select on public.glowly_plans;
create policy plans_public_select on public.glowly_plans for select using (active);

drop policy if exists plans_authenticated_select on public.glowly_plans;
create policy plans_authenticated_select on public.glowly_plans for select using (auth.role() = 'authenticated' and active);

drop policy if exists plans_admin_insert on public.glowly_plans;
create policy plans_admin_insert on public.glowly_plans for insert with check (public.glowly_is_admin());

drop policy if exists plans_admin_update on public.glowly_plans;
create policy plans_admin_update on public.glowly_plans for update using (public.glowly_is_admin()) with check (public.glowly_is_admin());

drop policy if exists plans_admin_delete on public.glowly_plans;
create policy plans_admin_delete on public.glowly_plans for delete using (public.glowly_is_admin());

drop policy if exists salons_authenticated_select on public.glowly_salons;
create policy salons_authenticated_select on public.glowly_salons for select using (auth.role() = 'authenticated' and (status = 'approved' or public.glowly_owns_or_manages_salon(id) or public.glowly_is_salon_staff(id)));

drop policy if exists salons_owner_insert on public.glowly_salons;
create policy salons_owner_insert on public.glowly_salons for insert with check (owner_id = auth.uid() and status = 'pending');

drop policy if exists salons_owner_update on public.glowly_salons;
create policy salons_owner_update on public.glowly_salons for update using (public.glowly_owns_or_manages_salon(id)) with check (public.glowly_owns_or_manages_salon(id));

drop policy if exists salons_admin_delete on public.glowly_salons;
create policy salons_admin_delete on public.glowly_salons for delete using (public.glowly_is_admin());

drop policy if exists salon_stylists_visible on public.glowly_salon_stylists;
create policy salon_stylists_visible on public.glowly_salon_stylists for select using (public.glowly_is_salon_member(salon_id));

drop policy if exists salon_stylists_manager_insert on public.glowly_salon_stylists;
create policy salon_stylists_manager_insert on public.glowly_salon_stylists for insert with check (public.glowly_is_salon_manager(salon_id));

drop policy if exists salon_stylists_manager_update on public.glowly_salon_stylists;
create policy salon_stylists_manager_update on public.glowly_salon_stylists for update using (public.glowly_is_salon_manager(salon_id)) with check (public.glowly_is_salon_manager(salon_id));

drop policy if exists salon_stylists_manager_delete on public.glowly_salon_stylists;
create policy salon_stylists_manager_delete on public.glowly_salon_stylists for delete using (public.glowly_is_salon_manager(salon_id));

drop policy if exists salon_invitations_select on public.glowly_salon_invitations;
create policy salon_invitations_select on public.glowly_salon_invitations for select using (public.glowly_is_salon_manager(salon_id) or lower(email) = lower(auth.jwt() ->> 'email'));

drop policy if exists salon_invitations_manager_insert on public.glowly_salon_invitations;
create policy salon_invitations_manager_insert on public.glowly_salon_invitations for insert with check (public.glowly_is_salon_manager(salon_id));

drop policy if exists salon_invitations_manager_update on public.glowly_salon_invitations;
create policy salon_invitations_manager_update on public.glowly_salon_invitations for update using (public.glowly_is_salon_manager(salon_id)) with check (public.glowly_is_salon_manager(salon_id));

drop policy if exists salon_customers_visible on public.glowly_salon_customers;
create policy salon_customers_visible on public.glowly_salon_customers for select using (public.glowly_is_salon_member(salon_id));

drop policy if exists salon_customers_manager_insert on public.glowly_salon_customers;
create policy salon_customers_manager_insert on public.glowly_salon_customers for insert with check (public.glowly_is_salon_manager(salon_id));

drop policy if exists salon_customers_manager_update on public.glowly_salon_customers;
create policy salon_customers_manager_update on public.glowly_salon_customers for update using (public.glowly_is_salon_manager(salon_id)) with check (public.glowly_is_salon_manager(salon_id));

drop policy if exists salon_customers_manager_delete on public.glowly_salon_customers;
create policy salon_customers_manager_delete on public.glowly_salon_customers for delete using (public.glowly_is_salon_manager(salon_id));

drop policy if exists services_visible on public.glowly_services;
create policy services_visible on public.glowly_services for select using (
  auth.role() = 'authenticated'
  and (public.glowly_is_salon_member(salon_id) or (active and exists (select 1 from public.glowly_salons where id = services.salon_id and status = 'approved')))
);

drop policy if exists services_manager_insert on public.glowly_services;
create policy services_manager_insert on public.glowly_services for insert with check (public.glowly_is_salon_manager(salon_id));

drop policy if exists services_manager_update on public.glowly_services;
create policy services_manager_update on public.glowly_services for update using (public.glowly_is_salon_manager(salon_id)) with check (public.glowly_is_salon_manager(salon_id));

drop policy if exists services_manager_delete on public.glowly_services;
create policy services_manager_delete on public.glowly_services for delete using (public.glowly_is_salon_manager(salon_id));

drop policy if exists availability_visible on public.glowly_availability;
create policy availability_visible on public.glowly_availability for select using (public.glowly_is_salon_member(salon_id) or stylist_id = auth.uid());

drop policy if exists availability_stylist_insert on public.glowly_availability;
create policy availability_stylist_insert on public.glowly_availability for insert with check (public.glowly_is_salon_member(salon_id) and (stylist_id = auth.uid() or public.glowly_is_salon_manager(salon_id)));

drop policy if exists availability_stylist_update on public.glowly_availability;
create policy availability_stylist_update on public.glowly_availability for update using (stylist_id = auth.uid() or public.glowly_is_salon_manager(salon_id)) with check (public.glowly_is_salon_member(salon_id) and (stylist_id = auth.uid() or public.glowly_is_salon_manager(salon_id)));

drop policy if exists availability_stylist_delete on public.glowly_availability;
create policy availability_stylist_delete on public.glowly_availability for delete using (stylist_id = auth.uid() or public.glowly_is_salon_manager(salon_id));

drop policy if exists appointments_visible on public.glowly_appointments;
create policy appointments_visible on public.glowly_appointments for select using (customer_id = auth.uid() or stylist_id = auth.uid() or public.glowly_is_salon_manager(salon_id));

drop policy if exists appointments_customer_insert on public.glowly_appointments;
create policy appointments_customer_insert on public.glowly_appointments for insert with check (customer_id = auth.uid());

drop policy if exists appointments_staff_insert on public.glowly_appointments;
create policy appointments_staff_insert on public.glowly_appointments for insert with check (public.glowly_is_salon_manager(salon_id));

drop policy if exists appointments_participant_update on public.glowly_appointments;
create policy appointments_participant_update on public.glowly_appointments for update using (customer_id = auth.uid() or stylist_id = auth.uid() or public.glowly_is_salon_manager(salon_id)) with check (customer_id = auth.uid() or stylist_id = auth.uid() or public.glowly_is_salon_manager(salon_id));

drop policy if exists appointments_staff_delete on public.glowly_appointments;
create policy appointments_staff_delete on public.glowly_appointments for delete using (public.glowly_is_salon_manager(salon_id));

drop policy if exists invoices_owner_select on public.glowly_invoices;
create policy invoices_owner_select on public.glowly_invoices for select using (public.glowly_owns_or_manages_salon(salon_id));

drop policy if exists invoices_admin_insert on public.glowly_invoices;
create policy invoices_admin_insert on public.glowly_invoices for insert with check (public.glowly_is_admin());

drop policy if exists invoices_admin_update on public.glowly_invoices;
create policy invoices_admin_update on public.glowly_invoices for update using (public.glowly_is_admin()) with check (public.glowly_is_admin());

drop policy if exists subscription_requests_visible on public.glowly_subscription_requests;
create policy subscription_requests_visible on public.glowly_subscription_requests for select using (public.glowly_owns_or_manages_salon(salon_id));

drop policy if exists subscription_requests_owner_insert on public.glowly_subscription_requests;
create policy subscription_requests_owner_insert on public.glowly_subscription_requests for insert with check (
  public.glowly_owns_or_manages_salon(salon_id)
  and exists (select 1 from public.glowly_salons where id = salon_id and status = 'approved')
  and status = 'pending'
  and resolved_at is null
  and exists (select 1 from public.glowly_plans where id = requested_plan_id and active)
);
