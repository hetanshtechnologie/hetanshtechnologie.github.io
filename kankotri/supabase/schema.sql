-- ============================================================
-- Kankotri Invitation Generator - Supabase schema
-- Run this file once in Supabase Dashboard > SQL Editor.
-- Safe to re-run (idempotent).
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Plans
-- ------------------------------------------------------------
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  price numeric not null default 0,
  invite_limit integer not null default 20,
  storage_limit_mb integer not null default 100,
  features jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Profiles
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  provider text default 'email',
  role text not null default 'user' check (role in ('admin','user')),
  plan_id uuid references public.plans(id) on delete set null,
  subscription_status text not null default 'free',
  is_suspended boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, provider, role)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(coalesce(new.email, 'guest'), '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_app_meta_data->>'provider', 'email'),
    'user'
  )
  on conflict (id) do update
    set email = excluded.email,
        provider = excluded.provider,
        avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
        full_name = coalesce(public.profiles.full_name, excluded.full_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Prevent non-admin users from escalating role / plan fields.
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if public.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role then new.role := old.role; end if;
  if new.plan_id is distinct from old.plan_id then new.plan_id := old.plan_id; end if;
  if new.subscription_status is distinct from old.subscription_status then new.subscription_status := old.subscription_status; end if;
  if new.is_suspended is distinct from old.is_suspended then new.is_suspended := old.is_suspended; end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_fields on public.profiles;
create trigger profiles_protect_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- ------------------------------------------------------------
-- Templates
-- ------------------------------------------------------------
create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  thumbnail_url text,
  template_image_url text,
  category text not null default 'Gujarati Wedding',
  is_active boolean not null default true,
  is_premium boolean not null default false,
  design jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Guest lists
-- ------------------------------------------------------------
create table if not exists public.guest_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Guest list',
  file_name text,
  guest_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.guest_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  batch_id uuid references public.guest_batches(id) on delete cascade,
  guest_name text not null,
  family_name text,
  city text,
  mobile text,
  relation text,
  uploaded_at timestamptz not null default now()
);
create index if not exists guest_lists_batch_idx on public.guest_lists(batch_id);
create index if not exists guest_lists_user_idx on public.guest_lists(user_id);

-- ------------------------------------------------------------
-- Invitation details (customization)
-- ------------------------------------------------------------
create table if not exists public.invitation_details (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid references public.templates(id) on delete set null,
  design_json jsonb not null default '{}'::jsonb,
  event_name text,
  bride_name text,
  groom_name text,
  wedding_date date,
  time text,
  venue text,
  maps_url text,
  message text,
  family_details text,
  language text not null default 'gu',
  font_family text,
  logo_url text,
  show_qr boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists invitation_details_user_idx on public.invitation_details(user_id);

-- ------------------------------------------------------------
-- Generation jobs / cards
-- ------------------------------------------------------------
create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid references public.templates(id) on delete set null,
  invitation_id uuid references public.invitation_details(id) on delete set null,
  guest_batch_id uuid references public.guest_batches(id) on delete set null,
  template_name text,
  guest_count integer not null default 0,
  card_count integer not null default 0,
  status text not null default 'processing' check (status in ('processing','completed','failed','cancelled')),
  format text not null default 'png',
  zip_url text,
  zip_path text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists generation_jobs_user_idx on public.generation_jobs(user_id);

create table if not exists public.generated_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid references public.generation_jobs(id) on delete cascade,
  guest_name text not null,
  template_id uuid references public.templates(id) on delete set null,
  image_url text,
  storage_path text,
  created_at timestamptz not null default now()
);
create index if not exists generated_cards_job_idx on public.generated_cards(job_id);
create index if not exists generated_cards_user_idx on public.generated_cards(user_id);

-- ------------------------------------------------------------
-- Subscriptions / usage / payments / audit
-- ------------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid references public.plans(id) on delete set null,
  status text not null default 'active' check (status in ('active','expired','cancelled','trial')),
  start_date timestamptz not null default now(),
  end_date timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists subscriptions_user_unique on public.subscriptions(user_id);

create table if not exists public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid references public.plans(id) on delete set null,
  invite_count integer not null default 0,
  generated_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists usage_logs_user_idx on public.usage_logs(user_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  amount numeric not null default 0,
  currency text not null default 'INR',
  payment_provider text not null default 'razorpay',
  payment_status text not null default 'pending' check (payment_status in ('pending','success','failed','refunded')),
  transaction_id text,
  created_at timestamptz not null default now()
);
create index if not exists payments_user_idx on public.payments(user_id);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text,
  entity_id text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Effective plan helper (used by the frontend)
-- ------------------------------------------------------------
create or replace function public.get_my_plan()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select to_jsonb(p) into result
  from public.plans p
  join public.profiles pr on pr.plan_id = p.id
  where pr.id = auth.uid();

  if result is null then
    select to_jsonb(p) into result from public.plans p where p.name = 'Free' limit 1;
  end if;
  return result;
end;
$$;

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.templates enable row level security;
alter table public.guest_batches enable row level security;
alter table public.guest_lists enable row level security;
alter table public.invitation_details enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.generated_cards enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_logs enable row level security;
alter table public.payments enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "profiles select own or admin" on public.profiles;
create policy "profiles select own or admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles
  for insert with check (id = auth.uid() or public.is_admin());
drop policy if exists "profiles update own or admin" on public.profiles;
create policy "profiles update own or admin" on public.profiles
  for update using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles delete admin" on public.profiles;
create policy "profiles delete admin" on public.profiles
  for delete using (public.is_admin());

drop policy if exists "plans read" on public.plans;
create policy "plans read" on public.plans
  for select using (is_active = true or public.is_admin());
drop policy if exists "plans admin write" on public.plans;
create policy "plans admin write" on public.plans
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "templates read" on public.templates;
create policy "templates read" on public.templates
  for select using (is_active = true or public.is_admin());
drop policy if exists "templates admin write" on public.templates;
create policy "templates admin write" on public.templates
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "batches own" on public.guest_batches;
create policy "batches own" on public.guest_batches
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "guests own" on public.guest_lists;
create policy "guests own" on public.guest_lists
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "invitations own" on public.invitation_details;
create policy "invitations own" on public.invitation_details
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "jobs own" on public.generation_jobs;
create policy "jobs own" on public.generation_jobs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "cards own" on public.generated_cards;
create policy "cards own" on public.generated_cards
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "subscriptions own read" on public.subscriptions;
create policy "subscriptions own read" on public.subscriptions
  for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "subscriptions admin write" on public.subscriptions;
create policy "subscriptions admin write" on public.subscriptions
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "usage own read" on public.usage_logs;
create policy "usage own read" on public.usage_logs
  for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "usage own insert" on public.usage_logs;
create policy "usage own insert" on public.usage_logs
  for insert with check (user_id = auth.uid());
drop policy if exists "usage admin write" on public.usage_logs;
create policy "usage admin write" on public.usage_logs
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "payments own read" on public.payments;
create policy "payments own read" on public.payments
  for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "payments admin write" on public.payments;
create policy "payments admin write" on public.payments
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "audit admin read" on public.audit_logs;
create policy "audit admin read" on public.audit_logs
  for select using (public.is_admin());
drop policy if exists "audit authenticated insert" on public.audit_logs;
create policy "audit authenticated insert" on public.audit_logs
  for insert with check (auth.uid() is not null);

-- ------------------------------------------------------------
-- Storage buckets & policies
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('invitations', 'invitations', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('templates', 'templates', true)
on conflict (id) do nothing;

drop policy if exists "invitations owner read" on storage.objects;
create policy "invitations owner read" on storage.objects
  for select using (
    bucket_id = 'invitations'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "invitations owner write" on storage.objects;
create policy "invitations owner write" on storage.objects
  for insert with check (
    bucket_id = 'invitations'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "invitations owner update" on storage.objects;
create policy "invitations owner update" on storage.objects
  for update using (
    bucket_id = 'invitations'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "invitations owner delete" on storage.objects;
create policy "invitations owner delete" on storage.objects
  for delete using (
    bucket_id = 'invitations'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "templates public read" on storage.objects;
create policy "templates public read" on storage.objects
  for select using (bucket_id = 'templates');
drop policy if exists "templates admin write" on storage.objects;
create policy "templates admin write" on storage.objects
  for all using (bucket_id = 'templates' and public.is_admin())
  with check (bucket_id = 'templates' and public.is_admin());

-- ------------------------------------------------------------
-- Seed plans
-- ------------------------------------------------------------
insert into public.plans (name, price, invite_limit, storage_limit_mb, features, is_active)
values
  ('Free', 0, 20, 100, '{
      "all_templates": false,
      "hd_export": false,
      "zip_download": true,
      "whatsapp": false,
      "qr_code": false,
      "gujarati_fonts": false,
      "remove_watermark": false,
      "email": false,
      "pdf": false,
      "custom_font": false,
      "bulk_whatsapp": false,
      "bulk_email": false,
      "white_label": false,
      "team": false,
      "custom_domain": false
    }'::jsonb, true),
  ('Premium', 299, 500, 2048, '{
      "all_templates": true,
      "hd_export": true,
      "zip_download": true,
      "whatsapp": true,
      "qr_code": true,
      "gujarati_fonts": true,
      "remove_watermark": true,
      "email": true,
      "pdf": true,
      "custom_font": true,
      "bulk_whatsapp": false,
      "bulk_email": false,
      "white_label": false,
      "team": false,
      "custom_domain": false
    }'::jsonb, true),
  ('Business', 999, 999999, 10240, '{
      "all_templates": true,
      "hd_export": true,
      "zip_download": true,
      "whatsapp": true,
      "qr_code": true,
      "gujarati_fonts": true,
      "remove_watermark": true,
      "email": true,
      "pdf": true,
      "custom_font": true,
      "bulk_whatsapp": true,
      "bulk_email": true,
      "white_label": true,
      "team": true,
      "custom_domain": true
    }'::jsonb, true)
on conflict (name) do update
  set price = excluded.price,
      invite_limit = excluded.invite_limit,
      storage_limit_mb = excluded.storage_limit_mb,
      features = excluded.features;

-- Attach every existing profile without a plan to the Free plan.
update public.profiles
set plan_id = (select id from public.plans where name = 'Free' limit 1),
    subscription_status = 'free'
where plan_id is null;

-- ------------------------------------------------------------
-- Seed templates
-- ------------------------------------------------------------
insert into public.templates (name, category, is_premium, is_active, design)
select v.name, v.category, v.is_premium, true, v.design
from (values
  ('Ganesha Kankotri', 'Gujarati Wedding', false, '{"bg":["#FFF8E7","#F3DFC1"],"accent":"#B76E79","gold":"#D4AF37","text":"#5A2A2A","border":"mandala","ornament":"ganesh","layout":"classic","font":"Cormorant Garamond"}'::jsonb),
  ('Marigold Mangal', 'Gujarati Wedding', false, '{"bg":["#FFF4DC","#F7C873"],"accent":"#C0392B","gold":"#D4AF37","text":"#6B1D1D","border":"floral","ornament":"floral","layout":"royal","font":"Playfair Display"}'::jsonb),
  ('Rani Pink Garba', 'Gujarati Wedding', true, '{"bg":["#FFF0F5","#F5B7C7"],"accent":"#B76E79","gold":"#C9A227","text":"#7A1F3D","border":"paisley","ornament":"mandala","layout":"classic","font":"Cormorant Garamond"}'::jsonb),
  ('Royal Maroon', 'Hindu Wedding', true, '{"bg":["#FFF8E7","#E8C9A0"],"accent":"#8B2E3F","gold":"#D4AF37","text":"#4A1A1A","border":"double","ornament":"om","layout":"royal","font":"Playfair Display"}'::jsonb),
  ('Ivory Temple', 'Hindu Wedding', false, '{"bg":["#FFFDF6","#EFE3C8"],"accent":"#A0522D","gold":"#C9A227","text":"#4B3621","border":"paisley","ornament":"mandala","layout":"classic","font":"Cormorant Garamond"}'::jsonb),
  ('Golden Reception', 'Reception', true, '{"bg":["#1E1B18","#3A2E23"],"accent":"#D4AF37","gold":"#F0D98C","text":"#FFF8E7","border":"minimal","ornament":"sparkle","layout":"modern","font":"Playfair Display"}'::jsonb),
  ('Blush Reception', 'Reception', false, '{"bg":["#FFF6F2","#F3D6D0"],"accent":"#B76E79","gold":"#D4AF37","text":"#5A2A2A","border":"floral","ornament":"floral","layout":"modern","font":"Cormorant Garamond"}'::jsonb),
  ('Ring Ceremony', 'Engagement', true, '{"bg":["#F7F3FF","#DCD0F5"],"accent":"#7B4B94","gold":"#D4AF37","text":"#3C2350","border":"minimal","ornament":"rings","layout":"modern","font":"Cormorant Garamond"}'::jsonb),
  ('Sakura Engagement', 'Engagement', false, '{"bg":["#FFF8F9","#F6D7DE"],"accent":"#C46A7E","gold":"#C9A227","text":"#5A2A2A","border":"floral","ornament":"floral","layout":"classic","font":"Playfair Display"}'::jsonb),
  ('Little Blessing', 'Baby Shower', false, '{"bg":["#F4FBF7","#CDE8DA"],"accent":"#5B8C6E","gold":"#D4AF37","text":"#274436","border":"paisley","ornament":"floral","layout":"modern","font":"Cormorant Garamond"}'::jsonb),
  ('Griha Pravesh', 'House Warming', false, '{"bg":["#FFF8E7","#EFD6A8"],"accent":"#B76E79","gold":"#C9A227","text":"#5A2A2A","border":"mandala","ornament":"kalash","layout":"classic","font":"Cormorant Garamond"}'::jsonb),
  ('Celebration Gold', 'Birthday', true, '{"bg":["#FFF9E8","#F2D48A"],"accent":"#B8860B","gold":"#D4AF37","text":"#4A3000","border":"minimal","ornament":"sparkle","layout":"modern","font":"Playfair Display"}'::jsonb)
) as v(name, category, is_premium, design)
where not exists (select 1 from public.templates t where t.name = v.name);

-- ------------------------------------------------------------
-- Promote the site owner to admin (edit the email if needed).
-- ------------------------------------------------------------
update public.profiles set role = 'admin'
where email = 'hetanshtechnologie@gmail.com';
