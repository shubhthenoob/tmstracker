import { Client } from 'pg';

async function testInsert() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('[v0] DATABASE_URL not set');
    process.exit(1);
  }

  const client = new Client({ connectionString });
  
  try {
    console.log('[v0] Connecting to database...');
    await client.connect();
    console.log('[v0] Connected!');

    // Test inserting a sample task
    console.log('[v0] Inserting test task...');
    const sheetId = process.env.GOOGLE_SHEETS_ID || 'test-sheet';
    const result = await client.query(
      `INSERT INTO tasks (id, date, task_name, assignee, hours, type, status, sheet_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [999, '2024-03-19', 'Test Task', 'Test User', 8, 'development', 'pending', sheetId]
    );

    console.log('[v0] Insert successful!');
    console.log('[v0] Inserted row:', JSON.stringify(result.rows[0], null, 2));

    // Now verify it was saved
    console.log('[v0] Verifying insert...');
    const verify = await client.query('SELECT * FROM tasks WHERE id = 999');
    console.log('[v0] Verification result:', verify.rows.length, 'rows found');
    
    if (verify.rows.length > 0) {
      console.log('[v0] SUCCESS: Data was inserted and retrieved!');
    } else {
      console.log('[v0] ERROR: Data was inserted but not found on verification');
    }

    // Check total rows in tasks table
    const count = await client.query('SELECT COUNT(*) FROM tasks');
    console.log('[v0] Total rows in tasks table:', count.rows[0].count);

    await client.end();
    
  } catch (error) {
    console.error('[v0] Error:', error instanceof Error ? error.message : error);
    console.error('[v0] Full error:', error);
    await client.end();
    process.exit(1);
  }
}

testInsert();
