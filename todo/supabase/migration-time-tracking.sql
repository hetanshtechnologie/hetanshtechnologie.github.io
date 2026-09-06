-- Time Tracking for tasks (run via SQL editor)
CREATE TABLE IF NOT EXISTS todo_time_tracking (
  id INTEGER PRIMARY KEY,
  task_id INTEGER NOT NULL,
  task_type TEXT NOT NULL DEFAULT 'permanent' CHECK (task_type IN ('permanent','daily')),
  task_title TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time TEXT NOT NULL,
  end_time TEXT,
  duration_seconds INTEGER,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ttt_user ON todo_time_tracking(user_id, task_type, task_id);
ALTER TABLE todo_time_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own time tracking" ON todo_time_tracking FOR ALL USING (user_id = auth.uid());
GRANT ALL ON todo_time_tracking TO authenticated;
