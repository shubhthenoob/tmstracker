-- Create sync_logs table to track Google Sheets synchronization
CREATE TABLE IF NOT EXISTS sync_logs (
  id SERIAL PRIMARY KEY,
  sync_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  rows_synced INT DEFAULT 0,
  error_message TEXT,
  duration_ms INT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index for querying recent syncs
CREATE INDEX IF NOT EXISTS idx_sync_logs_sync_time ON sync_logs(sync_time DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);

-- Create tasks table to store task data from Google Sheets
CREATE TABLE IF NOT EXISTS tasks (
  id INT PRIMARY KEY,
  date VARCHAR(10) NOT NULL,
  task TEXT NOT NULL,
  assignee VARCHAR(100) NOT NULL,
  hours DECIMAL(4,2) NOT NULL,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  last_synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index for date queries
CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_last_synced ON tasks(last_synced_at DESC);
