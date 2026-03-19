import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint to sync Google Sheets data to the database
 * Triggered by Vercel Cron jobs at 11 AM and 11 PM UTC
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    
    // Verify the request is from Vercel Cron
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('[v0] Authorization failed. Expected Bearer token');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get Google Sheets data
    console.log('[v0] Fetching Google Sheets data...');
    const sheetData = await fetchGoogleSheetData();
    console.log('[v0] Retrieved', sheetData.length, 'rows from Google Sheets');
    
    if (!sheetData || sheetData.length === 0) {
      throw new Error('No data retrieved from Google Sheets');
    }

    // Sync to database
    console.log('[v0] Starting sync to database...');
    const result = await syncTasksToDatabase(sheetData);
    console.log('[v0] Sync completed:', result.synced_count, 'rows synced');
    
    const duration = Date.now() - startTime;

    // Log the sync operation
    await logSyncOperation({
      status: 'success',
      rows_synced: result.synced_count,
    });

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
    });

    console.error('[Cron] Sync failed:', errorMessage);
    
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
    throw new Error('Missing Google Sheets configuration');
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetRange}?key=${apiKey}`;

  console.log('[v0] Fetching from:', url.split('?')[0] + '?key=***');
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Google Sheets API error: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.values || data.values.length === 0) {
    console.log('[v0] No data in Google Sheets response');
    return [];
  }

  console.log('[v0] Raw data from sheets:', JSON.stringify(data.values.slice(0, 2)));

  // Map sheet rows to task objects
  return data.values.map((row: any[]) => ({
    id: parseInt(row[0]) || 0,
    date: row[1] || '',
    task: row[2] || '',
    assignee: row[3] || '',
    hours: parseFloat(row[4]) || 0,
    type: row[5] || '',
    status: row[6] || '',
  }));
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

    let syncedCount = 0;

    // Use upsert logic to handle updates and inserts
    const query = `
      INSERT INTO tasks (id, date, task_name, assignee, hours, type, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET
        date = EXCLUDED.date,
        task_name = EXCLUDED.task_name,
        assignee = EXCLUDED.assignee,
        hours = EXCLUDED.hours,
        type = EXCLUDED.type,
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id;
    `;

    // Execute upsert for each task
    for (const task of tasks) {
      try {
        console.log('[v0] Upserting task:', task.id, task.task);
        await client.query(query, [
          task.id,
          task.date,
          task.task,
          task.assignee,
          task.hours,
          task.type,
          task.status,
        ]);
        syncedCount++;
      } catch (error) {
        console.error('[v0] Error upserting task', task.id, ':', error instanceof Error ? error.message : error);
        throw error;
      }
    }

    console.log('[v0] All tasks synced successfully. Count:', syncedCount);
    await client.end();
    return { synced_count: syncedCount };

  } catch (error) {
    console.error('[v0] Database sync error:', error instanceof Error ? error.message : error);
    await client.end();
    throw error;
  }
}

/**
 * Log sync operation to sync_logs table
 */
async function logSyncOperation(data: {
  status: 'success' | 'failed' | 'pending';
  rows_synced: number;
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
      `INSERT INTO sync_logs (synced_at, status, rows_synced, created_at)
       VALUES (CURRENT_TIMESTAMP, $1, $2, CURRENT_TIMESTAMP)`,
      [data.status, data.rows_synced]
    );

    await client.end();
  } catch (error) {
    console.error('[Cron] Failed to log sync operation:', error);
  }
}
