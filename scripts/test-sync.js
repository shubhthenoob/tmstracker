#!/usr/bin/env node

/**
 * Test script to manually trigger a sync and see what happens
 */

async function testSync() {
  try {
    console.log('[v0] Testing sync endpoint...\n');
    
    const secret = process.env.CRON_SECRET;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    if (!secret) {
      console.error('[v0] ERROR: CRON_SECRET not set');
      process.exit(1);
    }

    console.log('[v0] Using CRON_SECRET:', secret.substring(0, 5) + '***');
    console.log('[v0] Base URL:', baseUrl);
    console.log('[v0] Making request to /api/sync-sheet\n');

    const response = await fetch(`${baseUrl}/api/sync-sheet`, {
      method: 'GET',
      headers: { 
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json'
      },
    });

    console.log('[v0] Response status:', response.status);
    console.log('[v0] Response headers:', Object.fromEntries(response.headers));

    const data = await response.json();
    console.log('[v0] Response body:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('\n✓ Sync completed successfully!');
    } else {
      console.log('\n✗ Sync failed!');
      process.exit(1);
    }

  } catch (error) {
    console.error('[v0] Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

testSync();
