import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint to fetch sync logs from the database
 * Used by the admin sync status dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      return NextResponse.json(
        { error: 'Database not configured', logs: [] },
        { status: 503 }
      );
    }

    const { Client } = require('pg');
    const client = new Client({ connectionString });
    await client.connect();

    // Fetch last 50 sync logs
    console.log('[v0] Fetching sync logs from database');
    const result = await client.query(
      `SELECT id, synced_at, status, rows_synced, created_at
       FROM sync_logs
       ORDER BY synced_at DESC
       LIMIT 50`
    );

    console.log('[v0] Retrieved', result.rows.length, 'sync logs');
    await client.end();

    return NextResponse.json({
      success: true,
      logs: result.rows.map((row: any) => ({
        id: row.id,
        sync_time: row.synced_at,
        status: row.status,
        rows_synced: row.rows_synced,
        error_message: null,
        duration_ms: 0,
      })),
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] Failed to fetch sync logs:', errorMessage);
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        logs: [],
      },
      { status: 500 }
    );
  }
}
