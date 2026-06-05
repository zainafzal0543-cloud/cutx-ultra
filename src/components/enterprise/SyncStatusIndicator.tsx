'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, CloudOff, RefreshCw, CheckCircle, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { getSyncState, syncProcessor, watchConnectivity } from '@/lib/sync/engine';
import type { SyncState } from '@/types/phase3';
import { cn, formatRelativeTime } from '@/lib/utils';

export function SyncStatusIndicator() {
  const [syncState, setSyncState] = useState<SyncState>({
    status: 'synced', pendingCount: 0, conflictCount: 0, errorCount: 0,
  });
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);

    const refresh = async () => {
      const state = await getSyncState();
      setSyncState(state);
    };

    refresh();
    const refreshInterval = setInterval(refresh, 5000);

    const cleanup = watchConnectivity(
      () => { setOnline(true); syncProcessor.process(); },
      () => setOnline(false)
    );

    return () => {
      clearInterval(refreshInterval);
      cleanup();
    };
  }, []);

  const handleManualSync = async () => {
    setSyncing(true);
    await syncProcessor.process();
    const state = await getSyncState();
    setSyncState(state);
    setSyncing(false);
  };

  const statusIcon = !online ? <WifiOff className="w-3 h-3" />
    : syncing ? <RefreshCw className="w-3 h-3 animate-spin" />
    : syncState.errorCount > 0 ? <AlertCircle className="w-3 h-3" />
    : syncState.pendingCount > 0 ? <RefreshCw className="w-3 h-3" />
    : <CheckCircle className="w-3 h-3" />;

  const statusColor = !online ? 'text-text-tertiary'
    : syncState.errorCount > 0 ? 'text-error'
    : syncState.pendingCount > 0 ? 'text-warning'
    : 'text-success';

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetail(!showDetail)}
        className={cn('flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-background transition-all', statusColor)}
      >
        {statusIcon}
        <span className="text-[11px] font-medium hidden sm:block">
          {!online ? 'Offline' : syncState.pendingCount > 0 ? `${syncState.pendingCount} pending` : 'Synced'}
        </span>
      </button>

      <AnimatePresence>
        {showDetail && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowDetail(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-8 z-50 w-64 bg-surface border border-border rounded-2xl shadow-elevated p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-text-primary">Sync Status</span>
                <div className={cn('flex items-center gap-1.5 text-xs font-medium', online ? 'text-success' : 'text-text-tertiary')}>
                  {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                  {online ? 'Online' : 'Offline'}
                </div>
              </div>

              {[
                { label: 'Pending changes', value: syncState.pendingCount, warn: syncState.pendingCount > 0 },
                { label: 'Sync errors', value: syncState.errorCount, warn: syncState.errorCount > 0 },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-xs text-text-tertiary">{row.label}</span>
                  <span className={cn('text-xs font-semibold', row.warn && row.value > 0 ? 'text-warning' : 'text-text-secondary')}>
                    {row.value}
                  </span>
                </div>
              ))}

              {syncState.lastSyncAt && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-tertiary">Last synced</span>
                  <span className="text-xs text-text-secondary">{formatRelativeTime(syncState.lastSyncAt)}</span>
                </div>
              )}

              <button
                onClick={handleManualSync}
                disabled={syncing || !online}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-black text-white text-xs font-semibold disabled:opacity-40 hover:bg-neutral-800 transition-colors"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', syncing && 'animate-spin')} />
                {syncing ? 'Syncing…' : 'Sync Now'}
              </button>

              <p className="text-[10px] text-text-tertiary text-center">
                All changes saved locally. Cloud sync requires Supabase.
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
