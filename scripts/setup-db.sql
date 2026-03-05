-- Create tasks table for synced Google Sheets data
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  sheet_id VARCHAR(255) UNIQUE NOT NULL,
  date DATE NOT NULL,
  task_name TEXT NOT NULL,
  assignee VARCHAR(255) NOT NULL,
  hours DECIMAL(5, 2) NOT NULL DEFAULT 0,
  type VARCHAR(100) NOT NULL DEFAULT 'Development',
  status VARCHAR(50) NOT NULL DEFAULT 'In-progress',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create sync log table to track sync operations
CREATE TABLE IF NOT EXISTS sync_logs (
  id SERIAL PRIMARY KEY,
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  rows_synced INT DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'success'
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
