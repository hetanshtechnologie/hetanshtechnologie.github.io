-- =============================================================
-- YT Track — Multi-tenant YouTube playlist tracker
-- Schema: tenants / users / playlists / videos
--
-- Apply with:
--   supabase db push
-- or via SQL editor (Dashboard -> SQL -> New query -> paste).
--
-- After applying, deploy the API:
--   supabase secrets set YOUTUBE_API_KEY=<your google api key>
--   supabase functions deploy yt-api
--
-- Google API key must have YouTube Data API v3 enabled.
-- =============================================================

-- ---------- Extensions ----------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------- Enums ----------
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.video_status AS ENUM ('watched', 'unwatched');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- Tenants ----------
CREATE TABLE IF NOT EXISTS public.tenants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL CHECK (name <> ''),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- Users (profile for auth.users, one per tenant) ----------
CREATE TABLE IF NOT EXISTS public.users (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id  UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  role       public.user_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON public.users(tenant_id);

-- ---------- Playlists ----------
CREATE TABLE IF NOT EXISTS public.playlists (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id              UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  url                  TEXT NOT NULL,
  title                TEXT,
  youtube_playlist_id  TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_playlists_tenant ON public.playlists(tenant_id);
CREATE INDEX IF NOT EXISTS idx_playlists_user   ON public.playlists(user_id);

-- ---------- Videos ----------
CREATE TABLE IF NOT EXISTS public.videos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id       UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  youtube_url       TEXT NOT NULL,
  youtube_video_id  TEXT,
  duration_seconds  INTEGER NOT NULL DEFAULT 0,
  duration          TEXT NOT NULL DEFAULT '--:--',
  position          INTEGER NOT NULL DEFAULT 0,
  status            public.video_status NOT NULL DEFAULT 'unwatched',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (playlist_id, youtube_video_id)
);
CREATE INDEX IF NOT EXISTS idx_videos_playlist ON public.videos(playlist_id);
CREATE INDEX IF NOT EXISTS idx_videos_tenant   ON public.videos(tenant_id);

-- ---------- RLS helpers (security definer avoids policy recursion) ----------
CREATE OR REPLACE FUNCTION public.current_tenant_id() RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_admin() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT role = 'admin' FROM public.users WHERE id = auth.uid()), FALSE);
$$;

-- ---------- Enable RLS ----------
ALTER TABLE public.tenants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos   ENABLE ROW LEVEL SECURITY;

-- ---------- Tenants policies ----------
DROP POLICY IF EXISTS "tenants_select_own" ON public.tenants;
CREATE POLICY "tenants_select_own" ON public.tenants
  FOR SELECT USING (id = public.current_tenant_id());

-- ---------- Users policies ----------
-- Users see themselves; admins see every user in their own tenant only.
CREATE OR REPLACE FUNCTION public.check_user_visible(tid UUID, uid UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (uid = auth.uid())
      OR (public.is_tenant_admin() AND tid = public.current_tenant_id());
$$;

DROP POLICY IF EXISTS "users_select_own_tenant" ON public.users;
CREATE POLICY "users_select_own_tenant" ON public.users
  FOR SELECT USING (public.check_user_visible(tenant_id, id));

-- ---------- Playlists policies ----------
-- Non-admins see only their own playlists; admins see all in tenant.
DROP POLICY IF EXISTS "playlists_select_scoped" ON public.playlists;
CREATE POLICY "playlists_select_scoped" ON public.playlists
  FOR SELECT USING (
    tenant_id = public.current_tenant_id()
    AND (user_id = auth.uid() OR public.is_tenant_admin())
  );

-- ---------- Videos policies ----------
-- Scoped by tenant + (owner of playlist OR admin).
DROP POLICY IF EXISTS "videos_select_scoped" ON public.videos;
CREATE POLICY "videos_select_scoped" ON public.videos
  FOR SELECT USING (
    tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.playlists p
      WHERE p.id = videos.playlist_id
        AND p.tenant_id = videos.tenant_id
        AND (p.user_id = auth.uid() OR public.is_tenant_admin())
    )
  );

-- Allow status toggles through REST as defense-in-depth only if scoped.
DROP POLICY IF EXISTS "videos_update_scoped" ON public.videos;
CREATE POLICY "videos_update_scoped" ON public.videos
  FOR UPDATE USING (
    tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.playlists p
      WHERE p.id = videos.playlist_id
        AND p.tenant_id = videos.tenant_id
        AND (p.user_id = auth.uid() OR public.is_tenant_admin())
    )
  );

-- ---------- Revoke unwanted grants ----------
REVOKE ALL ON public.tenants   FROM anon, authenticated;
REVOKE ALL ON public.users     FROM anon, authenticated;
REVOKE ALL ON public.playlists FROM anon, authenticated;
REVOKE ALL ON public.videos    FROM anon, authenticated;

GRANT SELECT ON public.tenants   TO authenticated;
GRANT SELECT ON public.users     TO authenticated;
GRANT SELECT ON public.playlists TO authenticated;
GRANT SELECT ON public.videos    TO authenticated;
GRANT UPDATE (status) ON public.videos TO authenticated;

-- ---------- Auto-provision tenant + profile on registration ----------
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  t_id UUID;
  tenant_name TEXT;
BEGIN
  tenant_name := COALESCE(NULLIF(split_part(NEW.email, '@', 1), ''), 'Tenant') || ' [' || left(NEW.id::text, 8) || ']';
  INSERT INTO public.tenants (name) VALUES (tenant_name) RETURNING id INTO t_id;
  INSERT INTO public.users (id, tenant_id, email, role)
  VALUES (
    NEW.id,
    t_id,
    NEW.email,
    CASE WHEN NEW.email = 'hetanshtechnologie@gmail.com' THEN 'admin'::public.user_role ELSE 'user'::public.user_role END
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------- Self-heal: provision tenant + profile for the signed-in user ----------
-- Client calls this when a session exists but no public.users row is found
-- (e.g. accounts created by OAuth before the signup trigger was installed).
CREATE OR REPLACE FUNCTION public.ensure_user_profile() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id      UUID := auth.uid();
  v_email   TEXT;
  v_tenant  UUID;
BEGIN
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM public.users WHERE id = v_id) THEN
    RETURN;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_id;

  INSERT INTO public.tenants (name)
  VALUES (
    COALESCE(NULLIF(split_part(COALESCE(v_email, 'Tenant'), '@', 1), ''), 'Tenant') || ' [' || left(v_id::text, 8) || ']'
  )
  RETURNING id INTO v_tenant;

  INSERT INTO public.users (id, tenant_id, email, role)
  VALUES (
    v_id, v_tenant, v_email,
    CASE WHEN v_email = 'hetanshtechnologie@gmail.com' THEN 'admin'::public.user_role ELSE 'user'::public.user_role END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_user_profile() TO authenticated;

-- ---------- Bulk upsert playlist videos (preserves watched/unwatched status) ----------
CREATE OR REPLACE FUNCTION public.upsert_videos(p_playlist_id uuid, p_tenant_id uuid, p_videos jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.videos (playlist_id, tenant_id, title, youtube_url, youtube_video_id, duration_seconds, duration, position)
  SELECT
    p_playlist_id,
    p_tenant_id,
    (v->>'title')::text,
    (v->>'youtube_url')::text,
    (v->>'youtube_video_id')::text,
    COALESCE((v->>'duration_seconds')::integer, 0),
    COALESCE((v->>'duration')::text, '--:--'),
    COALESCE((v->>'position')::integer, 0)
  FROM jsonb_array_elements(p_videos) AS v
  ON CONFLICT (playlist_id, youtube_video_id)
  DO UPDATE SET
    title            = EXCLUDED.title,
    youtube_url      = EXCLUDED.youtube_url,
    duration_seconds = EXCLUDED.duration_seconds,
    duration         = EXCLUDED.duration,
    position         = EXCLUDED.position;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_videos(uuid, uuid, jsonb) TO authenticated;

-- =============================================================
-- v2 — Link tracking with hierarchical categories
-- (users add YouTube links manually; watched tracked via checkbox)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  parent_id  UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  name       TEXT NOT NULL CHECK (name <> ''),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_categories_tenant ON public.categories(tenant_id);

CREATE TABLE IF NOT EXISTS public.links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  url         TEXT NOT NULL CHECK (url <> ''),
  title       TEXT,
  watched     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_links_tenant   ON public.links(tenant_id);
CREATE INDEX IF NOT EXISTS idx_links_user     ON public.links(user_id);
CREATE INDEX IF NOT EXISTS idx_links_category ON public.links(category_id);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links      ENABLE ROW LEVEL SECURITY;

-- ---------- Categories: tenant-scoped for every user in the tenant ----------
DROP POLICY IF EXISTS "categories_select_tenant" ON public.categories;
CREATE POLICY "categories_select_tenant" ON public.categories
  FOR SELECT USING (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "categories_insert_tenant" ON public.categories;
CREATE POLICY "categories_insert_tenant" ON public.categories
  FOR INSERT WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND (
      parent_id IS NULL
      OR EXISTS (SELECT 1 FROM public.categories c WHERE c.id = public.categories.parent_id AND c.tenant_id = public.categories.tenant_id)
    )
  );

DROP POLICY IF EXISTS "categories_update_tenant" ON public.categories;
CREATE POLICY "categories_update_tenant" ON public.categories
  FOR UPDATE USING (tenant_id = public.current_tenant_id())
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND (
      parent_id IS NULL
      OR EXISTS (SELECT 1 FROM public.categories c WHERE c.id = public.categories.parent_id AND c.tenant_id = public.categories.tenant_id)
    )
  );

DROP POLICY IF EXISTS "categories_delete_tenant" ON public.categories;
CREATE POLICY "categories_delete_tenant" ON public.categories
  FOR DELETE USING (tenant_id = public.current_tenant_id());

-- ---------- Links: owners + tenant admins ----------
DROP POLICY IF EXISTS "links_select_scoped" ON public.links;
CREATE POLICY "links_select_scoped" ON public.links
  FOR SELECT USING (
    tenant_id = public.current_tenant_id()
    AND (user_id = auth.uid() OR public.is_tenant_admin())
  );

DROP POLICY IF EXISTS "links_insert_own" ON public.links;
CREATE POLICY "links_insert_own" ON public.links
  FOR INSERT WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND user_id = auth.uid()
    AND (
      category_id IS NULL
      OR EXISTS (SELECT 1 FROM public.categories c WHERE c.id = public.links.category_id AND c.tenant_id = public.links.tenant_id)
    )
  );

DROP POLICY IF EXISTS "links_update_scoped" ON public.links;
CREATE POLICY "links_update_scoped" ON public.links
  FOR UPDATE USING (
    tenant_id = public.current_tenant_id()
    AND (user_id = auth.uid() OR public.is_tenant_admin())
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND (user_id = auth.uid() OR public.is_tenant_admin())
    AND (
      category_id IS NULL
      OR EXISTS (SELECT 1 FROM public.categories c WHERE c.id = public.links.category_id AND c.tenant_id = public.links.tenant_id)
    )
  );

DROP POLICY IF EXISTS "links_delete_scoped" ON public.links;
CREATE POLICY "links_delete_scoped" ON public.links
  FOR DELETE USING (
    tenant_id = public.current_tenant_id()
    AND (user_id = auth.uid() OR public.is_tenant_admin())
  );

-- ---------- Grants ----------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.links      TO authenticated;

-- Tenant admins may promote/demote users within their own tenant.
GRANT UPDATE (role) ON public.users TO authenticated;
DROP POLICY IF EXISTS "users_update_admin" ON public.users;
CREATE POLICY "users_update_admin" ON public.users
  FOR UPDATE USING (
    public.is_tenant_admin()
    AND tenant_id = public.current_tenant_id()
    AND id <> auth.uid()
  );

-- Optional: make an existing auth user a tenant admin (run once).
-- UPDATE public.users SET role = 'admin' WHERE email = 'hetanshtechnologie@gmail.com';

-- ---------- Backfill: provision tenants + profiles for pre-existing auth users ----------
DO $$
DECLARE
  u RECORD;
  t_id UUID;
BEGIN
  FOR u IN SELECT id, email FROM auth.users LOOP
    CONTINUE WHEN EXISTS (SELECT 1 FROM public.users WHERE id = u.id);
    INSERT INTO public.tenants (name)
      VALUES (
        COALESCE(NULLIF(split_part(COALESCE(u.email, 'User'), '@', 1), ''), 'Tenant')
          || ' [' || left(u.id::text, 8) || ']'
      )
      RETURNING id INTO t_id;
    INSERT INTO public.users (id, tenant_id, email, role)
    VALUES (
      u.id, t_id, u.email,
      CASE WHEN u.email = 'hetanshtechnologie@gmail.com' THEN 'admin'::public.user_role ELSE 'user'::public.user_role END
    );
  END LOOP;
END $$;