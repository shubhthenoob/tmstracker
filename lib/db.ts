import { Client } from 'pg';

/**
 * Fetch all tasks from the database
 */
export async function fetchTasksFromDB() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.warn('[DB] DATABASE_URL not configured, using fallback data');
    return null;
  }

  try {
    const client = new Client({ connectionString });
    await client.connect();

    const result = await client.query(
      `SELECT id, date, task, assignee, hours, type, status 
       FROM tasks 
       ORDER BY date DESC, id DESC`
    );

    await client.end();
    
    return result.rows.map((row) => ({
      id: row.id,
      date: row.date,
      task: row.task,
      assignee: row.assignee,
      hours: parseFloat(row.hours),
      type: row.type,
      status: row.status,
    }));
  } catch (error) {
    console.error('[DB] Failed to fetch tasks:', error);
    return null;
  }
}

/**
 * Get the last sync time from sync_logs
 */
export async function getLastSyncTime() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    return null;
  }

  try {
    const client = new Client({ connectionString });
    await client.connect();

    const result = await client.query(
      `SELECT sync_time, status, rows_synced 
       FROM sync_logs 
       WHERE status = 'success'
       ORDER BY sync_time DESC 
       LIMIT 1`
    );

    await client.end();
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      sync_time: new Date(row.sync_time),
      rows_synced: row.rows_synced,
    };
  } catch (error) {
    console.error('[DB] Failed to fetch last sync time:', error);
    return null;
  }
}

/**
 * Get sync statistics
 */
export async function getSyncStats() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    return null;
  }

  try {
    const client = new Client({ connectionString });
    await client.connect();

    const result = await client.query(
      `SELECT 
        status,
        COUNT(*) as count,
        AVG(duration_ms) as avg_duration,
        MAX(sync_time) as last_sync
       FROM sync_logs
       GROUP BY status`
    );

    await client.end();
    
    return result.rows.reduce((acc, row) => {
      acc[row.status] = {
        count: parseInt(row.count),
        avg_duration: Math.round(parseFloat(row.avg_duration) || 0),
        last_sync: row.last_sync ? new Date(row.last_sync) : null,
      };
      return acc;
    }, {} as Record<string, any>);
  } catch (error) {
    console.error('[DB] Failed to fetch sync stats:', error);
    return null;
  }
}
