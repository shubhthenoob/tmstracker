import { Client } from 'pg';

const CRON_SECRET = process.env.CRON_SECRET;
const API_URL = process.env.API_URL || 'http://localhost:3000';

async function testSync() {
  try {
    console.log('[v0] Testing sync endpoint...');
    console.log('[v0] Using API URL:', API_URL);
    console.log('[v0] Using CRON_SECRET:', CRON_SECRET ? '***' : 'NOT SET');

    if (!CRON_SECRET) {
      throw new Error('CRON_SECRET environment variable not set');
    }

    const response = await fetch(`${API_URL}/api/sync-sheet`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('[v0] Response status:', response.status);
    console.log('[v0] Response data:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      throw new Error(`Sync failed: ${data.error || 'Unknown error'}`);
    }

    // Check database for inserted data
    console.log('[v0] Checking database for synced data...');
    const connectionString = process.env.DATABASE_URL;
    const client = new Client({ connectionString });
    await client.connect();

    const result = await client.query('SELECT COUNT(*) FROM tasks');
    const count = result.rows[0].count;
    console.log('[v0] Total tasks in database:', count);

    const logs = await client.query('SELECT * FROM sync_logs ORDER BY synced_at DESC LIMIT 1');
    if (logs.rows.length > 0) {
      console.log('[v0] Last sync log:', JSON.stringify(logs.rows[0], null, 2));
    }

    await client.end();
    console.log('[v0] Sync test complete!');

  } catch (error) {
    console.error('[v0] Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

testSync();
