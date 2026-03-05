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
    const result = await client.query(
      `SELECT id, sync_time, status, rows_synced, error_message, duration_ms
       FROM sync_logs
       ORDER BY sync_time DESC
       LIMIT 50`
    );

    await client.end();

    return NextResponse.json({
      success: true,
      logs: result.rows.map((row: any) => ({
        id: row.id,
        sync_time: row.sync_time,
        status: row.status,
        rows_synced: row.rows_synced,
        error_message: row.error_message,
        duration_ms: row.duration_ms,
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
