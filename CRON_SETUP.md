# Google Sheets Cron Job Setup Guide

This document explains how to set up automatic synchronization of Google Sheets data at 11 AM and 11 PM UTC.

## Overview

The system includes:
- **API Endpoint**: `/api/sync-sheet` - Syncs data from Google Sheets to PostgreSQL database
- **Cron Jobs**: Two scheduled runs at 11:00 AM and 11:00 PM UTC (vercel.json)
- **Database Tables**: `tasks` and `sync_logs` for storing data and sync history

## Setup Steps

### 1. Set Up Google Sheets API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Enable **Google Sheets API** and **Google Drive API**
4. Create a Service Account:
   - Go to Credentials → Create Credentials → Service Account
   - Copy the Service Account Email
5. Create a JSON key for the service account:
   - In Service Account details → Keys → Add Key → Create new JSON key
   - Save the JSON file securely

### 2. Configure Google Sheet

1. Create a Google Sheet with columns:
   - **A**: ID (task ID)
   - **B**: Date (format: M/D/YYYY)
   - **C**: Task (task name)
   - **D**: Assignee (member name)
   - **E**: Hours (decimal number)
   - **F**: Type (Development, QA, BA, etc.)
   - **G**: Status (Completed, In-progress, On-Hold)

2. Share the sheet with the Service Account Email with **Viewer** access

3. Get the Sheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit
   ```

### 3. Add Environment Variables to Vercel

In your Vercel project settings, add these environment variables:

```
CRON_SECRET=your-secure-random-string-here
DATABASE_URL=postgresql://user:password@host/dbname
GOOGLE_SHEETS_API_KEY=your-api-key-here
GOOGLE_SHEETS_ID=your-sheet-id-here
GOOGLE_SHEETS_RANGE=Sheet1!A2:G1000
```

**For GOOGLE_SHEETS_API_KEY**:
- Go to Google Cloud Console → APIs & Services → Credentials
- Create an API key (not service account)
- Restrict to Google Sheets API

### 4. Create Database Tables

Run the migration script to create required tables:

```sql
-- Run scripts/add-sync-logs.sql in your Neon database
```

Or execute the SQL manually through Neon dashboard:

```sql
-- Create sync_logs table
CREATE TABLE IF NOT EXISTS sync_logs (
  id SERIAL PRIMARY KEY,
  sync_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  rows_synced INT DEFAULT 0,
  error_message TEXT,
  duration_ms INT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_sync_time ON sync_logs(sync_time DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);

-- Create tasks table
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

CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_last_synced ON tasks(last_synced_at DESC);
```

### 5. Deploy to Vercel

1. Push your changes to GitHub
2. Vercel will automatically deploy
3. Cron jobs will be activated (visible in Vercel project settings)

### 6. Manual Sync Testing

To test the sync manually, make a GET request to:

```bash
curl -X GET "https://your-domain.vercel.app/api/sync-sheet" \
  -H "Authorization: Bearer your-cron-secret"
```

Expected response on success:
```json
{
  "success": true,
  "message": "Sync completed successfully",
  "rows_synced": 150,
  "duration_ms": 2341,
  "timestamp": "2026-03-06T11:00:00.000Z"
}
```

## Schedule

- **11:00 AM UTC** (6:30 PM IST)
- **11:00 PM UTC** (4:30 AM IST)

To change the schedule, edit `vercel.json`:
```json
"schedule": "0 11 * * *"  // 11 AM UTC
"schedule": "0 23 * * *"  // 11 PM UTC
```

Cron syntax: `minute hour day month day-of-week`

## Monitoring Sync Status

Check sync history in the database:

```sql
SELECT * FROM sync_logs ORDER BY sync_time DESC LIMIT 10;
```

## Troubleshooting

### "Missing Google Sheets configuration"
- Check GOOGLE_SHEETS_API_KEY and GOOGLE_SHEETS_ID are set
- Verify API key is not restricted to specific IPs

### "Google Sheets API error"
- Verify the Sheet ID is correct
- Ensure Service Account has Viewer access to the sheet
- Check the sheet range matches your data (default: Sheet1!A2:G1000)

### "DATABASE_URL not configured"
- Ensure DATABASE_URL is set in Vercel environment variables
- Test the connection string locally

### Cron job not running
- Check Vercel project settings → Functions → Cron Jobs
- Ensure vercel.json is in the root directory
- Redeploy after changes to vercel.json

## API Response Status Codes

- **200**: Sync successful
- **401**: Unauthorized (invalid CRON_SECRET)
- **500**: Sync failed (check error message)

## Notes

- Sync operations are idempotent using upsert logic (INSERT ON CONFLICT)
- Each sync logs the operation to `sync_logs` table for audit trail
- Failed syncs retry automatically by Vercel Cron
- Data is stored in PostgreSQL (Neon), not Google Sheets (source of truth)
