import { NextResponse } from 'next/server';

/**
 * Server-side proxy that triggers /api/sync-sheet using the CRON_SECRET
 * stored as a server-only env var. The secret is never sent to the browser.
 */
export async function POST() {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured on server' },
      { status: 503 }
    );
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/sync-sheet`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${secret}` },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
