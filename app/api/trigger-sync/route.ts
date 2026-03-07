import { NextResponse } from 'next/server';

/**
 * Server-side proxy that triggers /api/sync-sheet using the CRON_SECRET
 * stored as a server-only env var. The secret is never sent to the browser.
 * 
 * This endpoint is called manually from the UI when users click "Sync Now"
 * The automatic cron jobs are configured in vercel.json and run at:
 * - 11:30 AM UTC (30 11 * * *)
 * - 11:30 PM UTC (30 23 * * *)
 */
export async function POST() {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    console.error('[trigger-sync] CRON_SECRET not configured');
    return NextResponse.json(
      { error: 'CRON_SECRET not configured on server' },
      { status: 503 }
    );
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    console.log('[trigger-sync] Calling sync endpoint at', baseUrl);
    
    const response = await fetch(`${baseUrl}/api/sync-sheet`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${secret}` },
    });

    const data = await response.json();
    console.log('[trigger-sync] Sync response:', data);

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[trigger-sync] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
