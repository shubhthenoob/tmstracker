# Google Sheets Cron Job - Deployment Checklist

Use this checklist to ensure your cron job is properly set up and working.

## ✅ Pre-Deployment Checklist

### Google Sheets Setup
- [ ] Create Google Sheet with task data
- [ ] Columns: ID, Date, Task, Assignee, Hours, Type, Status
- [ ] At least 1 row of sample data
- [ ] Copy the Sheet ID from URL

### Google Cloud Setup
- [ ] Create Google Cloud project
- [ ] Enable Google Sheets API
- [ ] Enable Google Drive API
- [ ] Create API Key (not service account)
- [ ] Restrict API Key to Google Sheets API only
- [ ] Copy the API Key

### Neon PostgreSQL Setup
- [ ] Create Neon project
- [ ] Note the DATABASE_URL connection string
- [ ] Keep it secure (never share or commit)

### Local Testing (Optional)
- [ ] Clone/pull latest code
- [ ] Run `npm install` to get dependencies
- [ ] Generate CRON_SECRET: `openssl rand -base64 32`

## ✅ Deployment Checklist

### Step 1: Add Environment Variables
In Vercel Project Settings → Environment Variables:

- [ ] `CRON_SECRET` = your-random-secure-string
- [ ] `DATABASE_URL` = your-neon-connection-string
- [ ] `GOOGLE_SHEETS_API_KEY` = your-api-key
- [ ] `GOOGLE_SHEETS_ID` = your-sheet-id
- [ ] `GOOGLE_SHEETS_RANGE` = Sheet1!A2:G1000

**Verification:**
```bash
# Verify vars are set (run in Vercel environment)
echo $CRON_SECRET
echo $DATABASE_URL
echo $GOOGLE_SHEETS_API_KEY
```

### Step 2: Create Database Tables

Open Neon Dashboard → SQL Editor and run:

```sql
-- Copy from scripts/add-sync-logs.sql
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
```

**Verification:**
```sql
-- Check tables were created
\dt
-- Should show: tasks, sync_logs

-- Verify indexes
\di
-- Should show: idx_* entries
```

### Step 3: Deploy to Vercel

```bash
# From your local machine
git add .
git commit -m "feat: Add Google Sheets cron sync at 11am and 11pm UTC"
git push

# Vercel auto-deploys on push
# Wait ~2-3 minutes for deployment
```

**Verification in Vercel:**
- [ ] Build successful (check Deployments)
- [ ] No errors in Function Logs
- [ ] vercel.json parsed correctly

### Step 4: Verify Cron Jobs

In Vercel Dashboard:
- [ ] Go to Project Settings → Functions → Cron Jobs
- [ ] Should see 2 entries:
  - [ ] Path: `/api/sync-sheet`, Schedule: `0 11 * * *`
  - [ ] Path: `/api/sync-sheet`, Schedule: `0 23 * * *`

## ✅ Post-Deployment Checklist

### Manual Sync Test
- [ ] Navigate to `/admin/sync-status`
- [ ] Click "Trigger Sync Now"
- [ ] Wait for response (should see "success")
- [ ] Check "Last Sync" section shows details

**If Failed:**
- [ ] Check error message displayed
- [ ] Review logs in Vercel dashboard
- [ ] Verify environment variables
- [ ] Check database tables exist

### Database Verification

In Neon Dashboard:

```sql
-- Verify data was synced
SELECT COUNT(*) as task_count FROM tasks;
-- Should be > 0

-- Verify sync was logged
SELECT * FROM sync_logs ORDER BY sync_time DESC LIMIT 1;
-- Should show success status

-- View sample data
SELECT * FROM tasks LIMIT 5;
-- Should see your task data
```

### Dashboard Checks

- [ ] `/admin/sync-status` loads without errors
- [ ] "Last Sync" card shows data
- [ ] Sync history table is populated
- [ ] Manual sync button is clickable
- [ ] Auto-refresh is working (page updates every 30s)

### Monitor First Scheduled Sync

Track the next cron execution:
- [ ] Wait for next scheduled time (11 AM or 11 PM UTC)
- [ ] Check Vercel Function Logs
- [ ] Verify new sync_logs entry was created
- [ ] Check `/admin/sync-status` dashboard

## ✅ Monitoring & Maintenance

### Daily Monitoring
- [ ] Review `/admin/sync-status` dashboard
- [ ] Check for any failed syncs
- [ ] Monitor sync duration (should be < 10s)

### Weekly Checks
```sql
-- Check sync success rate
SELECT status, COUNT(*) 
FROM sync_logs 
GROUP BY status;

-- Check average duration
SELECT AVG(duration_ms) as avg_duration
FROM sync_logs
WHERE status = 'success';
```

### Monthly Cleanup
```sql
-- Archive old sync logs (optional)
DELETE FROM sync_logs 
WHERE sync_time < NOW() - INTERVAL '3 months'
  AND status = 'success';

-- Keep failed syncs for reference
```

## ✅ Troubleshooting Checklist

### "Sync Failed" Error

**Check 1: Authorization**
```
Error: "Unauthorized"
Solution: CRON_SECRET mismatch
→ Verify CRON_SECRET in Vercel env vars
→ Check it's exactly correct (no spaces)
```

**Check 2: Google Sheets**
```
Error: "Missing Google Sheets configuration"
Solution: API key or Sheet ID missing
→ Verify GOOGLE_SHEETS_API_KEY is set
→ Verify GOOGLE_SHEETS_ID is set
→ Check they're not truncated in UI
```

**Check 3: Database**
```
Error: "DATABASE_URL not configured"
Solution: Database connection string missing
→ Verify DATABASE_URL is set
→ Check it starts with "postgresql://"
→ Test connection in Neon dashboard
```

**Check 4: Tables**
```
Error: "relation 'tasks' does not exist"
Solution: Database tables not created
→ Run migration SQL from Step 2
→ Verify with \dt in Neon
```

### Cron Jobs Not Running

**Check 1: Deployment**
```
→ Verify deployment was successful
→ Check no build errors in Vercel
→ vercel.json is at root level
```

**Check 2: Schedule**
```
→ Review cron schedule in vercel.json
→ Syntax: minute hour day month dow
→ 0 11 * * * = 11 AM UTC daily
→ 0 23 * * * = 11 PM UTC daily
```

**Check 3: Activation**
```
→ Go to Vercel Project Settings
→ Functions → Cron Jobs
→ Cron jobs should be listed
→ If not: redeploy
```

### Dashboard Shows No Data

**Check 1: Sync Completed**
```
→ Has a sync completed? Check sync_logs
SELECT * FROM sync_logs;
→ If empty, trigger manual sync first
```

**Check 2: Database Connection**
```
→ Can dashboard connect to DB?
→ Check DATABASE_URL in function logs
→ Test Neon connection
```

**Check 3: Task Data**
```
→ Verify tasks table has data
SELECT COUNT(*) FROM tasks;
→ If 0 rows, no sync completed
```

## ✅ Security Checklist

- [ ] CRON_SECRET is unique (use `openssl rand -base64 32`)
- [ ] CRON_SECRET never shared or committed
- [ ] DATABASE_URL never shared or committed
- [ ] API Key restricted to Google Sheets API only
- [ ] Neon password is strong
- [ ] VPC enabled on Neon (if available)
- [ ] IP restrictions on Neon (if needed)

## ✅ Performance Checklist

- [ ] Sync duration < 10 seconds (typical: 2-5s)
- [ ] No timeout errors
- [ ] Database queries use indexes
- [ ] No N+1 queries in logs
- [ ] Cron triggers on schedule
- [ ] Dashboard loads in < 2 seconds

## ✅ Documentation Checklist

- [ ] Read `QUICK_START_CRON.md` for overview
- [ ] Read `CRON_SETUP.md` for detailed steps
- [ ] Read `CRON_IMPLEMENTATION.md` for architecture
- [ ] Read `ARCHITECTURE.md` for visual diagrams
- [ ] Bookmark `/admin/sync-status` dashboard

## ✅ Final Sign-Off

- [ ] All environment variables set
- [ ] Database tables created
- [ ] Deployed to Vercel
- [ ] Cron jobs visible in Vercel
- [ ] Manual sync test passed
- [ ] Database has synced data
- [ ] Dashboard displays correctly
- [ ] Monitored first scheduled sync
- [ ] Team has access to dashboard
- [ ] Documentation reviewed

## 🎉 Ready for Production!

Your Google Sheets cron job is now live and syncing automatically at:
- **11:00 AM UTC** (6:30 PM IST)
- **11:00 PM UTC** (4:30 AM IST)

**Monitor at:** `/admin/sync-status`

---

## Quick Reference

| What | Where | How |
|------|-------|-----|
| Manual sync | `/admin/sync-status` | Click "Trigger Sync Now" |
| Check logs | Neon SQL Editor | `SELECT * FROM sync_logs` |
| View data | Neon SQL Editor | `SELECT * FROM tasks` |
| Change schedule | `vercel.json` | Edit cron schedule |
| Add env vars | Vercel Settings | Functions → Environment Variables |
| Monitor sync | `/admin/sync-status` | Real-time dashboard |

## Support

If issues persist:
1. Check documentation files in project root
2. Review Vercel function logs
3. Query sync_logs table for errors
4. Test Google Sheets API access
5. Verify Neon database connection
