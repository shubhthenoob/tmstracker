#!/usr/bin/env node

/**
 * Test script to verify database connectivity and check table contents
 */

const { Client } = require('pg');

async function testDatabase() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('[ERROR] DATABASE_URL environment variable not set');
    process.exit(1);
  }

  const client = new Client({ connectionString });

  try {
    console.log('[v0] Connecting to database...');
    await client.connect();
    console.log('[v0] ✓ Connected successfully');

    // Check tasks table
    console.log('\n[v0] Checking tasks table...');
    const tasksResult = await client.query('SELECT COUNT(*) as count FROM tasks');
    console.log('[v0] Tasks in database:', tasksResult.rows[0].count);
    
    const tasksSample = await client.query('SELECT * FROM tasks LIMIT 3');
    if (tasksSample.rows.length > 0) {
      console.log('[v0] Sample tasks:');
      tasksSample.rows.forEach(row => {
        console.log(`  - ID: ${row.id}, Date: ${row.date}, Task: ${row.task_name}, Status: ${row.status}`);
      });
    } else {
      console.log('[v0] No tasks found in database');
    }

    // Check sync_logs table
    console.log('\n[v0] Checking sync_logs table...');
    const logsResult = await client.query('SELECT COUNT(*) as count FROM sync_logs');
    console.log('[v0] Sync logs in database:', logsResult.rows[0].count);
    
    const logsSample = await client.query('SELECT * FROM sync_logs ORDER BY synced_at DESC LIMIT 3');
    if (logsSample.rows.length > 0) {
      console.log('[v0] Recent sync logs:');
      logsSample.rows.forEach(row => {
        console.log(`  - Status: ${row.status}, Rows: ${row.rows_synced}, Time: ${row.synced_at}`);
      });
    } else {
      console.log('[v0] No sync logs found in database');
    }

    console.log('\n[v0] ✓ Database test completed');
    await client.end();
  } catch (error) {
    console.error('[ERROR] Database test failed:', error instanceof Error ? error.message : error);
    await client.end();
    process.exit(1);
  }
}

testDatabase();
