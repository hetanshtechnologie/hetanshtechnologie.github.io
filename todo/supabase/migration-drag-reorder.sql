-- Add order_index to todo_task_instances for drag reorder
ALTER TABLE todo_task_instances ADD COLUMN IF NOT EXISTS order_index INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_tti_order ON todo_task_instances(schedule_id, order_index);
