# Google Sheets Cron Job Implementation

## What Was Built

A complete automated synchronization system that pulls data from Google Sheets and syncs it to a PostgreSQL database on a schedule (11 AM and 11 PM UTC).

## Files Created

### 1. **API Endpoint** (`/app/api/sync-sheet/route.ts`)
- Main cron job handler
- Fetches data from Google Sheets API
- Syncs to PostgreSQL using upsert logic
- Logs all sync operations
- Protected by `CRON_SECRET` header validation

**Key Features:**
- Idempotent upsert (handles duplicates)
- Error logging and handling
- Performance tracking (duration in ms)
- Validates authorization with CRON_SECRET

### 2. **Cron Configuration** (`vercel.json`)
- Defines two scheduled tasks:
  - **11:00 AM UTC** - Morning sync
  - **11:00 PM UTC** - Evening sync
- Uses standard cron syntax

### 3. **Database Schema** (`scripts/add-sync-logs.sql`)
Creates two tables:
- **`tasks`** - Stores synced task data with indexes for performance
- **`sync_logs`** - Audit trail of all sync operations

### 4. **Database Utilities** (`lib/db.ts`)
Helper functions:
- `fetchTasksFromDB()` - Get all tasks from database
- `getLastSyncTime()` - Get most recent successful sync
- `getSyncStats()` - Get sync statistics

### 5. **Sync Logs API** (`/app/api/sync-logs/route.ts`)
REST endpoint to fetch sync history for monitoring dashboard

### 6. **Admin Dashboard** (`/app/admin/sync-status/page.tsx`)
UI for monitoring:
- Last sync status and details
- Manual sync trigger button
- Complete sync history table
- Real-time refresh (30s intervals)

### 7. **Documentation**
- `CRON_SETUP.md` - Complete setup guide
- `CRON_IMPLEMENTATION.md` - This file

## Architecture

```
Google Sheets
    ↓
[Vercel Cron at 11 AM & 11 PM UTC]
    ↓
/api/sync-sheet (route.ts)
    ├─ Fetch from Google Sheets API
    ├─ Validate authorization
    ├─ Sync to PostgreSQL
    └─ Log operation to sync_logs
    ↓
PostgreSQL (Neon)
    ├─ tasks table (actual data)
    └─ sync_logs table (audit trail)
    ↓
Frontend Dashboard
    └─ Displays data from PostgreSQL
```

## Environment Variables Required

Add these to your Vercel project settings:

```
CRON_SECRET=your-secure-random-string-here
DATABASE_URL=postgresql://user:password@host/dbname
GOOGLE_SHEETS_API_KEY=your-api-key-here
GOOGLE_SHEETS_ID=your-sheet-id-here
GOOGLE_SHEETS_RANGE=Sheet1!A2:G1000
```

## How It Works

### When Cron Triggers (11 AM & 11 PM UTC)

1. **Vercel Cron Service** makes authenticated GET request to `/api/sync-sheet`
2. **API validates** the `CRON_SECRET` header
3. **Fetches data** from Google Sheets using API key
4. **Syncs to database** using PostgreSQL upsert logic:
   - If task ID exists: UPDATE all fields
   - If task ID is new: INSERT new row
5. **Logs operation** to `sync_logs` table with:
   - Sync timestamp
   - Success/failure status
   - Number of rows synced
   - Duration in milliseconds
   - Error message (if failed)

### Data Flow to Frontend

**Option A: Direct from Database**
```typescript
const tasks = await fetchTasksFromDB();
```

**Option B: Direct from Google Sheets (current)**
```javascript
const FB = [
  {id: 1, date: "3/5/2026", ...},
  // ... hardcoded data
];
```

You can migrate to Option A by updating your page component.

## Deployment Checklist

- [ ] Create Google Sheets and get credentials
- [ ] Set up all environment variables in Vercel
- [ ] Create PostgreSQL tables (run migration)
- [ ] Deploy to Vercel
- [ ] Verify cron jobs appear in Vercel dashboard
- [ ] Test manual sync via admin dashboard
- [ ] Monitor first scheduled sync

## Testing the Sync

### Via Admin Dashboard
1. Go to `/admin/sync-status`
2. Click "Trigger Sync Now"
3. View logs in real-time

### Via cURL
```bash
curl -X GET "https://your-domain.vercel.app/api/sync-sheet" \
  -H "Authorization: Bearer your-cron-secret"
```

### Check Logs in Database
```sql
SELECT * FROM sync_logs ORDER BY sync_time DESC LIMIT 10;
SELECT COUNT(*) FROM tasks;
```

## Monitoring & Alerts

To set up alerts:

1. **Check Vercel Logs** - All cron executions logged
2. **Query sync_logs table** - See all sync history
3. **Admin Dashboard** - Visual monitoring at `/admin/sync-status`

Monitor for:
- Failed syncs (status = 'failed')
- Long sync durations (> 10000ms)
- Zero rows synced (data not changing)

## Scheduling Options

Edit `vercel.json` to change schedule:

```json
{
  "crons": [
    {
      "path": "/api/sync-sheet",
      "schedule": "0 11 * * *"     // 11 AM UTC daily
    },
    {
      "path": "/api/sync-sheet",
      "schedule": "0 23 * * *"     // 11 PM UTC daily
    }
  ]
}
```

**Cron Syntax**: `minute hour day month day-of-week`

Other examples:
- `0 */6 * * *` - Every 6 hours
- `0 9-17 * * 1-5` - Weekdays 9 AM to 5 PM
- `30 2 * * *` - 2:30 AM daily

## Security Considerations

1. **CRON_SECRET** - Store securely, used to validate requests
2. **API Key** - Only for Google Sheets API, restricted to service
3. **Database URL** - Never commit to git, use Vercel secrets
4. **Admin Dashboard** - Consider adding authentication

## Troubleshooting

### Sync not running
- Check Vercel project → Functions → Cron Jobs
- Verify vercel.json is at root level
- Redeploy after updating vercel.json

### "Unauthorized" error
- CRON_SECRET header must match exactly
- Vercel Cron automatically includes correct header

### Database connection errors
- Verify DATABASE_URL format
- Check PostgreSQL user permissions
- Ensure tables exist (run migration)

### Google Sheets API errors
- Verify API key is valid
- Check Sheet ID matches
- Ensure Service Account has access
- Check GOOGLE_SHEETS_RANGE format

## Future Enhancements

1. **Incremental sync** - Only sync changed rows
2. **Real-time sync** - Use Google Sheets Pub/Sub
3. **Conflict resolution** - Handle simultaneous edits
4. **Data validation** - Schema validation before insert
5. **Webhook notifications** - Alert on sync failures
6. **Data archiving** - Archive old sync logs

## Support

For issues:
1. Check `/admin/sync-status` for error details
2. Review `sync_logs` table in database
3. Check Vercel function logs
4. Verify all environment variables are set
