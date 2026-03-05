# Google Sheets Cron Sync - Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SCHEDULED TRIGGERS                          │
│  Every Day at 11:00 AM UTC    │    Every Day at 11:00 PM UTC       │
│  (6:30 PM IST)                 │    (4:30 AM IST)                   │
└────────────┬────────────────────────┬────────────────────────────────┘
             │                        │
             └────────┬───────────────┘
                      │
                      ▼
         ┌──────────────────────────────┐
         │  Vercel Cron Service         │
         │  (Built-in, Zero-config)     │
         └─────────────┬────────────────┘
                       │
                       ▼ Authenticated Request
         ┌──────────────────────────────────────┐
         │  GET /api/sync-sheet                 │
         │  Header: Authorization: Bearer ...   │
         │  (route.ts - 201 lines)              │
         └────────────┬─────────────────────────┘
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
    ┌─────────────┐        ┌──────────────────────┐
    │   Verify    │        │  Google Sheets API   │
    │ CRON_SECRET │        │                      │
    │   Header    │        │ Fetch task data from │
    │             │        │ configured sheet     │
    └─────────────┘        └──────────────────────┘
          │                       │
          │  ✓ Valid             │ Data received
          │                      │
          └──────────┬───────────┘
                     │
                     ▼
        ┌────────────────────────────────┐
        │   Data Transformation          │
        │   Map Google Sheets rows       │
        │   to task objects              │
        └────────────┬───────────────────┘
                     │
                     ▼
        ┌────────────────────────────────┐
        │  PostgreSQL Upsert Logic       │
        │  INSERT ON CONFLICT (id)       │
        │  DO UPDATE ...                 │
        │  (Handles duplicates)          │
        └────────────┬───────────────────┘
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
    ┌──────────────┐    ┌──────────────────┐
    │  tasks       │    │  sync_logs       │
    │              │    │                  │
    │ ✓ Insert     │    │ ✓ Log success    │
    │   new tasks  │    │ ✓ Log duration   │
    │ ✓ Update     │    │ ✓ Log row count  │
    │   existing   │    │ ✓ Log errors     │
    │ ✓ Timestamps │    │ ✓ Timestamps     │
    └──────────────┘    └──────────────────┘
          │                     │
          └──────────┬──────────┘
                     │
                     ▼
        ┌────────────────────────────────┐
        │   Return Response               │
        │   {                             │
        │     "success": true,            │
        │     "rows_synced": 150,         │
        │     "duration_ms": 2341         │
        │   }                             │
        └────────────┬───────────────────┘
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
    ┌──────────────┐    ┌──────────────────┐
    │ Admin        │    │ Frontend         │
    │ Dashboard    │    │ Dashboard        │
    │ (/admin/sync-│    │ (Reads from DB)  │
    │  status)     │    │                  │
    │              │    │ Shows:           │
    │ Shows:       │    │ • Latest data    │
    │ • Last sync  │    │ • All tasks      │
    │ • History    │    │ • Analytics      │
    │ • Status     │    │ • Charts         │
    │ • Errors     │    │                  │
    └──────────────┘    └──────────────────┘
```

## Data Flow Timeline

```
┌────────────────────────────────────────────────────────────────────────┐
│                         TIMELINE VIEW                                  │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  00:00 ─────────────────────────────────────────────────────────────   │
│                                                                        │
│  06:30 IST (11:00 AM UTC) ──► Cron Trigger #1                        │
│           │                                                            │
│           ├─ Fetch from Google Sheets                                 │
│           ├─ Sync to PostgreSQL                                       │
│           ├─ Log in sync_logs table                                   │
│           └─ Return success response                                  │
│                                                                        │
│  12:00 ─────────────────────────────────────────────────────────────   │
│                                                                        │
│  16:30 IST (04:30 AM UTC) ──► Dashboard accessible                    │
│           │                                                            │
│           ├─ View sync status                                         │
│           ├─ See all synced tasks                                     │
│           └─ Trigger manual sync if needed                            │
│                                                                        │
│  23:00 IST (04:30 PM UTC) ──► Cron Trigger #2                        │
│           │                                                            │
│           ├─ Fetch from Google Sheets                                 │
│           ├─ Sync to PostgreSQL                                       │
│           ├─ Log in sync_logs table                                   │
│           └─ Return success response                                  │
│                                                                        │
│  23:59 ─────────────────────────────────────────────────────────────   │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
vercel.json (Cron Configuration)
    ├─ 11:00 AM UTC → /api/sync-sheet
    └─ 11:00 PM UTC → /api/sync-sheet
        │
        └─ app/api/sync-sheet/route.ts
            ├─ Authenticate (CRON_SECRET)
            ├─ Fetch Google Sheets
            │   └─ Uses GOOGLE_SHEETS_API_KEY
            ├─ Sync Database
            │   └─ Uses DATABASE_URL
            ├─ Log Operation
            │   └─ Insert to sync_logs table
            └─ Return Response

lib/db.ts (Database Utilities)
    ├─ fetchTasksFromDB()
    ├─ getLastSyncTime()
    └─ getSyncStats()

app/api/sync-logs/route.ts (API Endpoint)
    └─ Fetch sync history from sync_logs table

app/admin/sync-status/page.tsx (Admin Dashboard)
    ├─ Display last sync status
    ├─ Show sync history table
    ├─ Trigger manual sync button
    └─ Auto-refresh every 30s

Database Schema (PostgreSQL)
    ├─ tasks table
    │   ├─ id, date, task, assignee, hours
    │   ├─ type, status, timestamps
    │   └─ Indexes: date, assignee, status
    └─ sync_logs table
        ├─ id, sync_time, status
        ├─ rows_synced, error_message, duration
        └─ Indexes: sync_time, status
```

## Environment Variables Flow

```
Vercel Project Settings
    │
    ├─ CRON_SECRET ────────────────────┐
    │                                   │
    ├─ DATABASE_URL ────┐              │
    │                   │              │
    ├─ GOOGLE_SHEETS_API_KEY ──┐       │
    │                           │      │
    ├─ GOOGLE_SHEETS_ID ────┐  │      │
    │                       │  │      │
    └─ GOOGLE_SHEETS_RANGE  │  │      │
                            │  │      │
                            ▼  ▼      ▼
                    app/api/sync-sheet/route.ts
                        │   │      │
            ┌───────────┘   │      └─ Verify authorization
            │               │
            │               └─ Connect to PostgreSQL
            │
            └─ Fetch from Google Sheets
```

## Error Handling Flow

```
Cron Triggers /api/sync-sheet
    │
    ├─ Validation Phase
    │  ├─ Check CRON_SECRET ──── Fail ──► Return 401
    │  └─ Check env vars ──────── Fail ──► Return 500
    │
    ├─ Fetch Phase
    │  ├─ Google Sheets API ────── Fail ──► Log error, Return 500
    │  └─ Parse data ────────────── Fail ──► Log error, Return 500
    │
    ├─ Sync Phase
    │  ├─ Connect to DB ────────── Fail ──► Log error, Return 500
    │  ├─ Upsert operation ─────── Fail ──► Log error, Return 500
    │  └─ Success ────────────────────────► Log success
    │
    └─ Response
       ├─ Success ──► 200 + JSON response
       └─ Error ───► 500 + error message

All errors logged to sync_logs table with:
  - Timestamp
  - Error message
  - Status: 'failed'
  - Duration taken
```

## Database Indexing Strategy

```
tasks table indexes (for performance)
├─ idx_tasks_date
│  └─ Fast lookup by date range
├─ idx_tasks_assignee
│  └─ Fast filter by team member
├─ idx_tasks_status
│  └─ Fast filter by status
└─ idx_tasks_last_synced
   └─ Find recently updated rows

sync_logs table indexes
├─ idx_sync_logs_sync_time
│  └─ Get recent syncs quickly
└─ idx_sync_logs_status
   └─ Find failed syncs
```

## Security Layers

```
Request from Vercel Cron
    │
    ├─ Layer 1: Authorization Header
    │  └─ Check: Bearer {CRON_SECRET}
    │     └─ Prevents unauthorized calls
    │
    ├─ Layer 2: Environment Validation
    │  └─ Check: All required env vars exist
    │     └─ Prevents incomplete config
    │
    ├─ Layer 3: API Rate Limiting
    │  └─ Vercel auto-protects cron endpoints
    │     └─ Prevents abuse
    │
    └─ Layer 4: Database Access
       └─ DATABASE_URL (Neon) handles auth
          └─ SSL encryption by default
```

## Scalability Considerations

```
Current Setup (Perfect for Teams < 1000)
├─ 2 syncs per day (11 AM & 11 PM UTC)
├─ Database growth: ~30KB per 100 tasks
├─ Sync duration: 2-5 seconds typical
└─ Zero infrastructure management

Future Growth Options
├─ Increase frequency: Change cron schedule
├─ Multiple sheets: Add more cron jobs
├─ Real-time sync: Implement webhook listener
├─ Incremental sync: Track last_synced_at
└─ Data archiving: Archive old sync_logs
```

This architecture is:
- ✅ Scalable (handles 1000+ tasks easily)
- ✅ Reliable (Vercel's cron is battle-tested)
- ✅ Secure (CRON_SECRET + env vars)
- ✅ Observable (sync_logs audit trail)
- ✅ Maintainable (clear separation of concerns)
