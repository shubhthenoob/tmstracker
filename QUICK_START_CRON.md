# Quick Start: Google Sheets Cron Setup

Get your cron job running in 5 minutes.

## Step 1: Get Google Sheets API Key (2 min)

1. Open [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project → APIs & Services → Create Credentials → API Key
3. Restrict it to **Google Sheets API**
4. Copy the API key

## Step 2: Get Your Sheet ID (1 min)

1. Open your Google Sheet
2. Copy the ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit
   ```

## Step 3: Add Environment Variables to Vercel (1 min)

Go to **Project Settings → Environment Variables** and add:

```
CRON_SECRET=generate-a-random-secure-string-here
DATABASE_URL=your-neon-postgresql-url
GOOGLE_SHEETS_API_KEY=your-api-key-from-step-1
GOOGLE_SHEETS_ID=your-sheet-id-from-step-2
GOOGLE_SHEETS_RANGE=Sheet1!A2:G1000
```

**To generate CRON_SECRET:**
```bash
openssl rand -base64 32
```

## Step 4: Create Database Tables (1 min)

Open your Neon database dashboard and run this SQL:

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
```

## Step 5: Deploy (automatic)

Push to GitHub → Vercel deploys automatically → Cron jobs activate!

```bash
git add .
git commit -m "Add Google Sheets cron sync"
git push
```

## Done! ✅

Your cron jobs now run at:
- **11:00 AM UTC** (6:30 PM IST)
- **11:00 PM UTC** (4:30 AM IST)

## Verify It Works

1. Go to `/admin/sync-status` in your app
2. Click "Trigger Sync Now"
3. You should see a success message

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Unauthorized" error | Check CRON_SECRET matches exactly |
| "Missing Google Sheets config" | Verify GOOGLE_SHEETS_API_KEY and GOOGLE_SHEETS_ID |
| "DATABASE_URL not configured" | Add DATABASE_URL to Vercel env vars |
| Tables don't exist | Run the SQL from Step 4 |
| Cron not running | Check Vercel dashboard → Functions → Cron Jobs |

## What's Running

**2 Cron Jobs:**
- POST requests to `/api/sync-sheet` at 11 AM & 11 PM UTC
- Fetches data from Google Sheets
- Syncs to PostgreSQL
- Logs all operations

**Admin Dashboard:**
- View at `/admin/sync-status`
- See sync history
- Trigger manual syncs
- Monitor performance

## Files Created

- `/app/api/sync-sheet/route.ts` - Cron endpoint
- `/app/api/sync-logs/route.ts` - Logs API
- `/app/admin/sync-status/page.tsx` - Dashboard
- `/lib/db.ts` - Database utilities
- `/scripts/add-sync-logs.sql` - Database schema
- `/vercel.json` - Cron configuration
- Docs: `CRON_SETUP.md`, `CRON_IMPLEMENTATION.md`

## Next Steps

1. Prepare your Google Sheet with task data
2. Share sheet with your Google Cloud service account
3. Monitor the admin dashboard
4. Adjust schedule in `vercel.json` if needed

For detailed setup, see `CRON_SETUP.md`.
