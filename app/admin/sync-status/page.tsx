'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface SyncLog {
  id: number;
  sync_time: string;
  status: 'success' | 'failed' | 'pending';
  rows_synced: number;
  error_message: string | null;
  duration_ms: number;
}

export default function SyncStatusPage() {
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<SyncLog | null>(null);
  const [manualSyncLoading, setManualSyncLoading] = useState(false);

  useEffect(() => {
    fetchSyncLogs();
    // Refresh every 5 seconds to catch real-time updates
    const interval = setInterval(fetchSyncLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  async function fetchSyncLogs() {
    try {
      const response = await fetch('/api/sync-logs');
      if (response.ok) {
        const data = await response.json();
        setSyncLogs(data.logs || []);
        setLastSync(data.logs?.[0] || null);
      }
    } catch (error) {
      console.error('Failed to fetch sync logs:', error);
    } finally {
      setLoading(false);
    }
  }

  async function triggerManualSync() {
    setManualSyncLoading(true);
    const toastId = toast.loading('Initiating sync...');
    
    try {
      // Call a dedicated server-side proxy endpoint so the CRON_SECRET
      // never has to be exposed as a NEXT_PUBLIC_ variable.
      const response = await fetch('/api/trigger-sync', { method: 'POST' });

      if (response.ok) {
        const data = await response.json();
        console.log('[v0] Sync triggered successfully:', data);
        
        toast.dismiss(toastId);
        toast.success(`Sync completed! ${data.rows_synced} rows synced in ${data.duration_ms}ms`, {
          duration: 5000,
        });
        
        // Fetch immediately and then again after 500ms for updates
        await fetchSyncLogs();
        setTimeout(fetchSyncLogs, 500);
      } else {
        const errorData = await response.json();
        toast.dismiss(toastId);
        toast.error(`Sync failed: ${errorData.error}`, { duration: 5000 });
        console.error('Failed to trigger sync:', response.statusText);
      }
    } catch (error) {
      toast.dismiss(toastId);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Error triggering sync: ${errorMessage}`, { duration: 5000 });
      console.error('Error triggering sync:', error);
    } finally {
      setManualSyncLoading(false);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return '#10b981';
      case 'failed':
        return '#ef4444';
      case 'pending':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'success':
        return '#d1fae5';
      case 'failed':
        return '#fee2e2';
      case 'pending':
        return '#fef3c7';
      default:
        return '#f3f4f6';
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '24px', color: '#1f2937' }}>
        Google Sheets Sync Dashboard
      </h1>

      {/* Last Sync Status */}
      {lastSync && (
        <Card style={{ padding: '20px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', color: '#1f2937' }}>
            Last Sync
          </h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
            <div>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '6px' }}>
                {new Date(lastSync.sync_time).toLocaleString()}
              </p>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>
                {lastSync.rows_synced} rows synced • {lastSync.duration_ms}ms
              </p>
            </div>
            <div
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                background: getStatusBg(lastSync.status),
                color: getStatusColor(lastSync.status),
                fontWeight: '600',
                fontSize: '12px',
                textTransform: 'capitalize',
              }}
            >
              {lastSync.status}
            </div>
          </div>
        </Card>
      )}

      {/* Manual Sync Button */}
      <Card style={{ padding: '20px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', color: '#1f2937' }}>
          Manual Sync
        </h2>
        <Button
          onClick={triggerManualSync}
          disabled={manualSyncLoading}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            background: '#0284c7',
            color: '#fff',
            fontWeight: '600',
            cursor: 'pointer',
            border: 'none',
            fontSize: '14px',
          }}
        >
          {manualSyncLoading ? 'Syncing...' : 'Trigger Sync Now'}
        </Button>
      </Card>

      {/* Sync Logs History */}
      <Card style={{ padding: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', color: '#1f2937' }}>
          Sync History
        </h2>
        {loading ? (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>Loading...</p>
        ) : syncLogs.length === 0 ? (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>No sync logs yet</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px',
              }}
            >
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>
                    Time
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>
                    Status
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>
                    Rows Synced
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>
                    Duration (ms)
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>
                    Error
                  </th>
                </tr>
              </thead>
              <tbody>
                {syncLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px', color: '#1f2937' }}>
                      {new Date(log.sync_time).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          background: getStatusBg(log.status),
                          color: getStatusColor(log.status),
                          fontWeight: '600',
                          textTransform: 'capitalize',
                          fontSize: '12px',
                        }}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#1f2937' }}>
                      {log.rows_synced}
                    </td>
                    <td style={{ padding: '12px', color: '#1f2937' }}>
                      {log.duration_ms}
                    </td>
                    <td style={{ padding: '12px', color: '#ef4444', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {log.error_message || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
