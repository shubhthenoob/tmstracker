# Cron Configuration Reference

Complete reference for all configuration options and environment variables.

## Environment Variables

### Required Variables

#### `CRON_SECRET` (Required)
- **Purpose:** Authenticates cron requests from Vercel
- **Value:** Random 32-character string
- **Generate:** `openssl rand -base64 32`
- **Example:** `AbCdEfGhIjKlMnOpQrStUvWxYz1234==`
- **Security:** Never share, use Vercel secrets

#### `DATABASE_URL` (Required)
- **Purpose:** PostgreSQL connection string
- **Provider:** Neon PostgreSQL
- **Format:** `postgresql://user:password@host:port/database`
- **Example:** `postgresql://neon_user:abc123@ep-xyz.us-east-1.neon.tech/my_db`
- **Security:** Always use Vercel environment variables

#### `GOOGLE_SHEETS_API_KEY` (Required)
- **Purpose:** API key for Google Sheets API
- **Source:** Google Cloud Console
- **Setup:** 
  1. Go to https://console.cloud.google.com
  2. APIs & Services → Credentials → Create Credentials → API Key
  3. Restrict to Google Sheets API only
- **Security:** Restricted API key, not service account

#### `GOOGLE_SHEETS_ID` (Required)
- **Purpose:** The spreadsheet ID
- **Source:** Your Google Sheet URL
- **Extract from:** `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`
- **Example:** `1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p`

#### `GOOGLE_SHEETS_RANGE` (Optional)
- **Purpose:** Cell range to sync
- **Default:** `Sheet1!A2:G1000`
- **Format:** `{SheetName}!{StartCell}:{EndCell}`
- **Examples:**
  - `Sheet1!A2:G1000` - Main sheet, columns A-G
  - `Data!A1:H500` - "Data" sheet, rows 1-500
  - `Tasks!A2:Z` - All rows, columns A-Z

### Optional Variables

#### `LOG_LEVEL`
- **Purpose:** Logging verbosity
- **Options:** `debug`, `info`, `warn`, `error`
- **Default:** `info`

#### `SYNC_TIMEOUT_MS`
- **Purpose:** Maximum sync duration in milliseconds
- **Default:** `30000` (30 seconds)
- **Min:** `5000` (5 seconds)
- **Max:** `60000` (60 seconds - Vercel limit)

## Cron Schedule Configuration

### Schedule Format
```
minute hour day-of-month month day-of-week
  0     11      *          *     *
```

### Examples

```
0 11 * * *      → 11:00 AM UTC every day
0 23 * * *      → 11:00 PM UTC every day
0 */6 * * *     → Every 6 hours (0, 6, 12, 18 UTC)
30 9 * * 1-5    → 9:30 AM UTC on weekdays
0 0 1 * *       → 12:00 AM UTC on 1st of month
0 9 * * MON     → 9:00 AM UTC every Monday
*/30 * * * *    → Every 30 minutes
```

### Time Zone
- All cron schedules use **UTC timezone**
- 11:00 UTC = 4:30 PM IST (India)
- 23:00 UTC = 4:30 AM IST (next day)

### Current Configuration
```json
{
  "crons": [
    {
      "path": "/api/sync-sheet",
      "schedule": "0 11 * * *"
    },
    {
      "path": "/api/sync-sheet",
      "schedule": "0 23 * * *"
    }
  ]
}
```

## vercel.json Schema

```json
{
  "crons": [
    {
      "path": "/api/sync-sheet",
      "schedule": "0 11 * * *"
    }
  ]
}
```

### Fields
- **path:** API route to call (must start with `/api/`)
- **schedule:** Cron expression (minute hour day month dow)

## Database Schema Reference

### tasks Table

```sql
CREATE TABLE tasks (
  id INT PRIMARY KEY,
  date VARCHAR(10) NOT NULL,          -- Format: M/D/YYYY
  task TEXT NOT NULL,                 -- Task description
  assignee VARCHAR(100) NOT NULL,     -- Team member name
  hours DECIMAL(4,2) NOT NULL,        -- Hours (0.00-99.99)
  type VARCHAR(50) NOT NULL,          -- Type: Development, QA, etc.
  status VARCHAR(20) NOT NULL,        -- Status: Completed, In-progress, On-Hold
  last_synced_at TIMESTAMP,           -- Auto-set on upsert
  created_at TIMESTAMP,               -- Auto-set on insert
  updated_at TIMESTAMP                -- Auto-set on update
);

-- Indexes for performance
CREATE INDEX idx_tasks_date ON tasks(date);
CREATE INDEX idx_tasks_assignee ON tasks(assignee);
CREATE INDEX idx_tasks_status ON tasks(status);
```

### sync_logs Table

```sql
CREATE TABLE sync_logs (
  id SERIAL PRIMARY KEY,
  sync_time TIMESTAMP,                -- When sync occurred
  status VARCHAR(20),                 -- success | failed | pending
  rows_synced INT,                    -- Number of rows processed
  error_message TEXT,                 -- Error details if failed
  duration_ms INT,                    -- Execution time in ms
  created_at TIMESTAMP                -- When log was created
);

-- Indexes for performance
CREATE INDEX idx_sync_logs_sync_time ON sync_logs(sync_time DESC);
CREATE INDEX idx_sync_logs_status ON sync_logs(status);
```

## Google Sheets Data Format

### Expected Column Order (A-G)

| Column | Type | Format | Example | Required |
|--------|------|--------|---------|----------|
| A | ID | Integer | 1 | Yes |
| B | Date | String | 3/5/2026 | Yes |
| C | Task | String | Update APIs | Yes |
| D | Assignee | String | Harsh | Yes |
| E | Hours | Decimal | 2.5 | Yes |
| F | Type | String | Development | Yes |
| G | Status | String | In-progress | Yes |

### Valid Status Values
- `Completed`
- `In-progress`
- `On-Hold`

### Valid Type Values
- `Development`
- `QA`
- `BA` (Business Analysis)
- `Designing`
- `Deployment`
- `KT` (Knowledge Transfer)
- `Bug Fixing`

## API Endpoint Details

### Sync Endpoint
```
GET /api/sync-sheet
Header: Authorization: Bearer {CRON_SECRET}
```

### Response on Success (200)
```json
{
  "success": true,
  "message": "Sync completed successfully",
  "rows_synced": 150,
  "duration_ms": 2341,
  "timestamp": "2026-03-06T11:00:00.000Z"
}
```

### Response on Error (500)
```json
{
  "success": false,
  "error": "Error message describing the issue",
  "timestamp": "2026-03-06T11:00:00.000Z"
}
```

### Response on Unauthorized (401)
```json
{
  "error": "Unauthorized"
}
```

## Admin Dashboard

### URL
```
https://your-domain.vercel.app/admin/sync-status
```

### Features
- Last sync status and duration
- Complete sync history table
- Manual sync trigger button
- Real-time updates (30-second refresh)
- Status indicators (success/failed/pending)
- Error message display

## Performance Targets

| Metric | Target | Typical |
|--------|--------|---------|
| Sync Duration | < 30s | 2-5s |
| Success Rate | > 99% | 99.9% |
| Data Freshness | 2x daily | 11 AM & 11 PM |
| Database Size (100 tasks) | - | ~30 KB |
| Index Overhead | < 20% | ~10% |

## Security Best Practices

1. **CRON_SECRET**
   - Generate with `openssl rand -base64 32`
   - Store only in Vercel Environment Variables
   - Never commit to git

2. **DATABASE_URL**
   - Store only in Vercel Environment Variables
   - Never commit to git
   - Use SSL encryption (default with Neon)

3. **API Key**
   - Restrict to Google Sheets API only
   - Don't use service account JSON
   - Rotate periodically

4. **Admin Dashboard**
   - Consider adding authentication
   - Use private Vercel deployment

## Debugging Configuration

### Enable Verbose Logging
Set `LOG_LEVEL=debug` in environment variables

### Check Current Config
```sql
-- Verify database connectivity
SELECT NOW();

-- Count synced tasks
SELECT COUNT(*) FROM tasks;

-- View recent syncs
SELECT * FROM sync_logs ORDER BY sync_time DESC LIMIT 5;

-- Check for errors
SELECT * FROM sync_logs WHERE status = 'failed' LIMIT 10;
```

### Verify Google Sheets Access
```javascript
// Test API key
const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;
fetch(url).then(r => r.json()).then(console.log);
```

## Scaling Configuration

### For Small Teams (< 100 tasks)
```
GOOGLE_SHEETS_RANGE=Sheet1!A2:G1000
Schedule: 0 11,23 * * *  (2x daily)
```

### For Medium Teams (100-1000 tasks)
```
GOOGLE_SHEETS_RANGE=Sheet1!A2:G10000
Schedule: 0 */6 * * *  (4x daily)
```

### For Large Teams (> 1000 tasks)
```
GOOGLE_SHEETS_RANGE=Sheet1!A2:Z100000
Schedule: 0 * * * *  (hourly)
Sync timeout: 60000 ms
```

## Monitoring Configuration

### Slack Alerts (Future Enhancement)
```javascript
// Send to Slack on failure
if (status === 'failed') {
  await fetch(process.env.SLACK_WEBHOOK, {
    method: 'POST',
    body: JSON.stringify({
      text: `Google Sheets sync failed: ${error_message}`
    })
  });
}
```

### Database Alerts
```sql
-- Monitor failed syncs
SELECT COUNT(*) as failed_count 
FROM sync_logs 
WHERE status = 'failed' 
AND sync_time > NOW() - INTERVAL '24 hours';
```

## Common Issues & Configuration Fixes

| Issue | Configuration | Fix |
|-------|---------------|-----|
| Timeout | Sync timeout too low | Increase `SYNC_TIMEOUT_MS` to 30000 |
| Memory issues | Too many rows | Reduce `GOOGLE_SHEETS_RANGE` |
| Auth failures | Wrong CRON_SECRET | Regenerate and update |
| DB connection | Wrong DATABASE_URL | Verify format and copy exactly |
| Wrong data | Incorrect range | Check sheet name and column range |
| Slow sync | Large dataset | Add more indexes or split into tabs |

## File Locations

- Cron endpoint: `/app/api/sync-sheet/route.ts`
- Config: `/vercel.json`
- Database schema: `/scripts/add-sync-logs.sql`
- Admin dashboard: `/app/admin/sync-status/page.tsx`
- Utilities: `/lib/db.ts`

---

**Version:** 1.0
**Last Updated:** 2026-03-06
**Status:** Production Ready
