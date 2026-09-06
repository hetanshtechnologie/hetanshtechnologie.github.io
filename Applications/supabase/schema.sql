-- Project Management Schema

-- Admin check function (SECURITY DEFINER bypasses RLS to avoid infinite recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM pm_roles WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- ======= Roles =======
CREATE TABLE IF NOT EXISTS pm_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE pm_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own role" ON pm_roles FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "admin manage roles" ON pm_roles FOR ALL USING (public.is_admin());

-- ======= Projects =======
CREATE TABLE IF NOT EXISTS pm_projects (
  id INTEGER PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on_hold', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  start_date TEXT,
  end_date TEXT,
  budget DECIMAL(14,2) DEFAULT 0,
  spent DECIMAL(14,2) DEFAULT 0,
  client_name TEXT DEFAULT '',
  client_email TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pm_projects_user ON pm_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_pm_projects_status ON pm_projects(status);
ALTER TABLE pm_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own projects" ON pm_projects FOR ALL USING (user_id = auth.uid());
CREATE POLICY "admin all projects" ON pm_projects FOR ALL USING (
  public.is_admin()
);

-- ======= Tasks =======
CREATE TABLE IF NOT EXISTS pm_tasks (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  estimated_hours DECIMAL(8,2) DEFAULT 0,
  logged_hours DECIMAL(8,2) DEFAULT 0,
  due_date TEXT,
  start_date TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_project ON pm_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_assigned ON pm_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_status ON pm_tasks(status);
ALTER TABLE pm_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users access own tasks" ON pm_tasks FOR ALL USING (
  user_id = auth.uid() OR assigned_to = auth.uid() OR
  EXISTS (SELECT 1 FROM pm_projects WHERE id = pm_tasks.project_id AND user_id = auth.uid()) OR
  public.is_admin()
);

-- ======= Comments =======
CREATE TABLE IF NOT EXISTS pm_comments (
  id INTEGER PRIMARY KEY,
  project_id INTEGER REFERENCES pm_projects(id) ON DELETE CASCADE,
  task_id INTEGER REFERENCES pm_tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pm_comments_project ON pm_comments(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_comments_task ON pm_comments(task_id);
ALTER TABLE pm_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users access comments" ON pm_comments FOR ALL USING (
  user_id = auth.uid() OR
  public.is_admin() OR
  EXISTS (SELECT 1 FROM pm_projects WHERE id = pm_comments.project_id AND user_id = auth.uid())
);

-- ======= Files =======
CREATE TABLE IF NOT EXISTS pm_files (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
  task_id INTEGER REFERENCES pm_tasks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  size INTEGER DEFAULT 0,
  type TEXT DEFAULT '',
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE pm_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users access files" ON pm_files FOR ALL USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM pm_projects WHERE id = pm_files.project_id AND user_id = auth.uid()) OR
  public.is_admin()
);

-- ======= Risks =======
CREATE TABLE IF NOT EXISTS pm_risks (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'mitigating', 'resolved', 'closed')),
  mitigation TEXT DEFAULT '',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE pm_risks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users access risks" ON pm_risks FOR ALL USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM pm_projects WHERE id = pm_risks.project_id AND user_id = auth.uid()) OR
  public.is_admin()
);

-- ======= Milestones =======
CREATE TABLE IF NOT EXISTS pm_milestones (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'delayed')),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE pm_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users access milestones" ON pm_milestones FOR ALL USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM pm_projects WHERE id = pm_milestones.project_id AND user_id = auth.uid()) OR
  public.is_admin()
);

-- ======= Notifications =======
CREATE TABLE IF NOT EXISTS pm_notifications (
  id INTEGER PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT DEFAULT '',
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
  link TEXT DEFAULT '',
  read INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pm_notifications_user ON pm_notifications(user_id);
ALTER TABLE pm_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own notifications" ON pm_notifications FOR ALL USING (user_id = auth.uid());

-- ======= Time Logs =======
CREATE TABLE IF NOT EXISTS pm_time_logs (
  id INTEGER PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES pm_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hours DECIMAL(6,2) NOT NULL,
  description TEXT DEFAULT '',
  log_date TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE pm_time_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own time logs" ON pm_time_logs FOR ALL USING (
  user_id = auth.uid() OR
  public.is_admin()
);

-- Grants
GRANT ALL ON pm_roles TO authenticated;
GRANT ALL ON pm_projects TO authenticated;
GRANT ALL ON pm_tasks TO authenticated;
GRANT ALL ON pm_comments TO authenticated;
GRANT ALL ON pm_files TO authenticated;
GRANT ALL ON pm_risks TO authenticated;
GRANT ALL ON pm_milestones TO authenticated;
GRANT ALL ON pm_notifications TO authenticated;
GRANT ALL ON pm_time_logs TO authenticated;
