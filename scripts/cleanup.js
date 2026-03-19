import { Client } from 'pg';

async function cleanup() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('[v0] DATABASE_URL not set');
    process.exit(1);
  }

  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('[v0] Connected to database');

    // Delete test data
    await client.query('DELETE FROM tasks WHERE id = 999');
    console.log('[v0] Deleted test task with id 999');

    // Clear all data if needed
    const rows = await client.query('SELECT COUNT(*) FROM tasks');
    console.log('[v0] Total tasks remaining:', rows.rows[0].count);

    const logs = await client.query('SELECT COUNT(*) FROM sync_logs');
    console.log('[v0] Total sync logs:', logs.rows[0].count);

    await client.end();
    console.log('[v0] Cleanup complete!');
    
  } catch (error) {
    console.error('[v0] Error:', error instanceof Error ? error.message : error);
    await client.end();
    process.exit(1);
  }
}

cleanup();
