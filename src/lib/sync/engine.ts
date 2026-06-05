// ─────────────────────────────────────────────
// CUTX ULTRA Phase 3 — Offline-First Sync Engine
// Sync queue, conflict detection, background sync
// ─────────────────────────────────────────────

import type { SyncQueueItem, SyncState } from '@/types/phase3';
import { generateId } from '@/lib/utils';

// ─── Sync Queue Persistence ───────────────────

async function getDB() {
  const { openDB } = await import('idb');
  return openDB('cutx-ultra', 4);
}

export async function enqueueSync(
  type: SyncQueueItem['type'],
  table: string,
  recordId: string,
  payload: unknown
): Promise<void> {
  const db = await getDB();
  const item: SyncQueueItem = {
    id: generateId(),
    type,
    table,
    recordId,
    payload,
    retries: 0,
    createdAt: new Date().toISOString(),
  };
  await db.put('sync_queue', item);
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getDB();
  return db.getAll('sync_queue');
}

export async function removeSyncItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('sync_queue', id);
}

export async function getSyncState(): Promise<SyncState> {
  const queue = await getSyncQueue();
  const errored = queue.filter(i => i.retries >= 3);
  const pending = queue.filter(i => i.retries < 3);

  return {
    status: errored.length > 0 ? 'error' : pending.length > 0 ? 'pending' : 'synced',
    lastSyncAt: await getLastSyncTime(),
    pendingCount: pending.length,
    conflictCount: 0,
    errorCount: errored.length,
  };
}

async function getLastSyncTime(): Promise<string | undefined> {
  try {
    const db = await getDB();
    const record = await db.get('settings' as any, 'lastSyncAt' as any);
    return record?.value;
  } catch { return undefined; }
}

async function setLastSyncTime(time: string): Promise<void> {
  try {
    const db = await getDB();
    await (db as any).put('settings', { key: 'lastSyncAt', value: time });
  } catch {}
}

// ─── Background Sync Processor ───────────────

export class SyncProcessor {
  private running = false;
  private interval: ReturnType<typeof setInterval> | null = null;

  start(intervalMs = 30_000): void {
    if (this.interval) return;
    this.interval = setInterval(() => this.process(), intervalMs);
    this.process(); // immediate first run
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.running = false;
  }

  async process(): Promise<void> {
    if (this.running || !navigator.onLine) return;
    this.running = true;

    try {
      const queue = await getSyncQueue();
      if (queue.length === 0) { this.running = false; return; }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseKey) { this.running = false; return; }

      for (const item of queue) {
        if (item.retries >= 3) continue;

        try {
          const url = `${supabaseUrl}/rest/v1/${item.table}`;
          const method = item.type === 'delete' ? 'DELETE' : 'POST';
          const res = await fetch(
            item.type === 'delete' ? `${url}?id=eq.${item.recordId}` : url,
            {
              method,
              headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Prefer': 'resolution=merge-duplicates',
              },
              body: item.type !== 'delete' ? JSON.stringify(item.payload) : undefined,
            }
          );

          if (res.ok || res.status === 409) {
            await removeSyncItem(item.id);
          } else {
            await this.incrementRetry(item.id);
          }
        } catch {
          await this.incrementRetry(item.id);
        }
      }

      await setLastSyncTime(new Date().toISOString());
    } finally {
      this.running = false;
    }
  }

  private async incrementRetry(id: string): Promise<void> {
    const db = await getDB();
    const item = await db.get('sync_queue', id);
    if (item) {
      await db.put('sync_queue', {
        ...item,
        retries: item.retries + 1,
        lastAttempt: new Date().toISOString(),
      });
    }
  }
}

export const syncProcessor = new SyncProcessor();

// ─── Connectivity detection ───────────────────

export function watchConnectivity(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

// ─── Conflict resolution ──────────────────────
// Simple last-write-wins strategy for Phase 3
// Phase 4: implement CRDT-based conflict resolution

export function resolveConflict<T extends { updatedAt: string }>(
  local: T,
  remote: T
): T {
  const localTime = new Date(local.updatedAt).getTime();
  const remoteTime = new Date(remote.updatedAt).getTime();
  return localTime >= remoteTime ? local : remote;
}
