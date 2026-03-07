import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint to sync Google Sheets data to the database
 * Triggered by Vercel Cron jobs at 11 AM and 11 PM UTC
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('[Sync] Starting sync operation at', new Date().toISOString());
    
    // Verify the request is from Vercel Cron
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('[Sync] Unauthorized request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get Google Sheets data
    console.log('[Sync] Fetching Google Sheets data...');
    const sheetData = await fetchGoogleSheetData();
    
    if (!sheetData || sheetData.length === 0) {
      throw new Error('No data retrieved from Google Sheets');
    }

    console.log('[Sync] Received', sheetData.length, 'rows from Google Sheets');

    // Sync to database
    console.log('[Sync] Starting database sync...');
    const result = await syncTasksToDatabase(sheetData);
    
    const duration = Date.now() - startTime;

    // Log the sync operation
    await logSyncOperation({
      status: 'success',
      rows_synced: result.synced_count,
      duration_ms: duration,
      error_message: null,
    });

    console.log('[Sync] Sync completed successfully in', duration, 'ms');

    return NextResponse.json({
      success: true,
      message: 'Sync completed successfully',
      rows_synced: result.synced_count,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Log the failed sync operation
    await logSyncOperation({
      status: 'failed',
      rows_synced: 0,
      duration_ms: Date.now() - startTime,
      error_message: errorMessage,
    });

    console.error('[Sync] Sync failed:', errorMessage);
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Fetch data from Google Sheets API
 * Requires GOOGLE_SHEETS_API_KEY and GOOGLE_SHEETS_ID env vars
 */
async function fetchGoogleSheetData() {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  const sheetId = process.env.GOOGLE_SHEETS_ID;
  const sheetRange = process.env.GOOGLE_SHEETS_RANGE || 'Sheet1!A2:G1000';

  if (!apiKey || !sheetId) {
    throw new Error('Missing Google Sheets configuration (GOOGLE_SHEETS_API_KEY or GOOGLE_SHEETS_ID)');
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetRange)}?key=${apiKey}`;
  console.log('[Sheets API] Fetching from URL:', url.replace(apiKey, '***'));

  const response = await fetch(url);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Sheets API] API error response:', errorText);
    throw new Error(`Google Sheets API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log('[Sheets API] Raw data received:', JSON.stringify(data, null, 2));
  
  if (!data.values || data.values.length === 0) {
    console.warn('[Sheets API] No data found in sheet');
    return [];
  }

  // Map sheet rows to task objects
  const mappedData = data.values.map((row: any[]) => ({
    id: parseInt(row[0]) || 0,
    date: row[1] || '',
    task: row[2] || '',
    assignee: row[3] || '',
    hours: parseFloat(row[4]) || 0,
    type: row[5] || '',
    status: row[6] || '',
  }));

  console.log('[Sheets API] Mapped data count:', mappedData.length);
  return mappedData;
}

/**
 * Sync tasks to Neon PostgreSQL database using upsert logic
 */
async function syncTasksToDatabase(tasks: any[]) {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL not configured');
  }

  // Using node-postgres for database operations
  const { Client } = require('pg');
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('[DB] Connected to database, syncing', tasks.length, 'tasks');

    let syncedCount = 0;
    let errorCount = 0;

    // Use upsert logic to handle updates and inserts
    const query = `
      INSERT INTO tasks (id, date, task, assignee, hours, type, status, last_synced_at, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET
        date = EXCLUDED.date,
        task = EXCLUDED.task,
        assignee = EXCLUDED.assignee,
        hours = EXCLUDED.hours,
        type = EXCLUDED.type,
        status = EXCLUDED.status,
        last_synced_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id;
    `;

    // Execute upsert for each task
    for (const task of tasks) {
      try {
        const result = await client.query(query, [
          task.id,
          task.date,
          task.task,
          task.assignee,
          task.hours,
          task.type,
          task.status,
        ]);
        syncedCount++;
        console.log('[DB] Synced task:', task.id, result.rows[0]?.id);
      } catch (taskError) {
        errorCount++;
        console.error('[DB] Failed to sync task:', task.id, taskError);
      }
    }

    console.log('[DB] Sync complete. Success:', syncedCount, 'Errors:', errorCount);

    await client.end();
    return { synced_count: syncedCount };

  } catch (error) {
    console.error('[DB] Database connection error:', error);
    try {
      await client.end();
    } catch (e) {
      // ignore
    }
    throw error;
  }
}

/**
 * Log sync operation to sync_logs table
 */
async function logSyncOperation(data: {
  status: 'success' | 'failed' | 'pending';
  rows_synced: number;
  duration_ms: number;
  error_message: string | null;
}) {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('[Cron] DATABASE_URL not configured, skipping log');
    return;
  }

  try {
    const { Client } = require('pg');
    const client = new Client({ connectionString });
    await client.connect();

    await client.query(
      `INSERT INTO sync_logs (sync_time, status, rows_synced, error_message, duration_ms, created_at)
       VALUES (CURRENT_TIMESTAMP, $1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [data.status, data.rows_synced, data.error_message, data.duration_ms]
    );

    await client.end();
  } catch (error) {
    console.error('[Cron] Failed to log sync operation:', error);
  }
}
