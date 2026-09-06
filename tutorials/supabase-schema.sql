CREATE TABLE tutorial_feedback (
  id BIGSERIAL PRIMARY KEY,
  tutorial_slug TEXT NOT NULL,
  feedback_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tutorial_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Feedback public insert" ON tutorial_feedback
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Feedback public read" ON tutorial_feedback
  FOR SELECT USING (true);
