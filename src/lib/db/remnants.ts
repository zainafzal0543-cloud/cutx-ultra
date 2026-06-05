// ─────────────────────────────────────────────
// Remnant Persistence — IndexedDB
// ─────────────────────────────────────────────

import { openDB } from 'idb';
import type { Remnant } from '@/types/phase2';

const DB_NAME = 'cutx-ultra';
const DB_VERSION = 2; // Upgraded from Phase 1 v1
const REMNANTS_STORE = 'remnants';

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // Phase 1 stores already exist — just add new ones
      if (!db.objectStoreNames.contains(REMNANTS_STORE)) {
        const store = db.createObjectStore(REMNANTS_STORE, { keyPath: 'id' });
        store.createIndex('material', 'material');
        store.createIndex('projectId', 'projectId');
        store.createIndex('used', 'used');
        store.createIndex('areaMM2', 'areaMM2');
        store.createIndex('createdAt', 'createdAt');
      }
      if (!db.objectStoreNames.contains('analytics')) {
        const aStore = db.createObjectStore('analytics', { keyPath: 'id' });
        aStore.createIndex('projectId', 'projectId');
        aStore.createIndex('timestamp', 'timestamp');
      }
      if (!db.objectStoreNames.contains('export_jobs')) {
        db.createObjectStore('export_jobs', { keyPath: 'id' });
      }
    },
  });
}

// ─── Remnant CRUD ─────────────────────────────

export async function saveRemnants(remnants: Remnant[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(REMNANTS_STORE, 'readwrite');
  await Promise.all(remnants.map(r => tx.store.put(r)));
  await tx.done;
}

export async function getAllRemnants(): Promise<Remnant[]> {
  const db = await getDB();
  const all = await db.getAll(REMNANTS_STORE);
  return all
    .filter(r => !r.used)
    .sort((a, b) => b.areaMM2 - a.areaMM2);
}

export async function getRemnantsByMaterial(material: string): Promise<Remnant[]> {
  const db = await getDB();
  return db.getAllFromIndex(REMNANTS_STORE, 'material', material);
}

export async function markRemnantUsed(id: string, projectId: string): Promise<void> {
  const db = await getDB();
  const remnant = await db.get(REMNANTS_STORE, id);
  if (remnant) {
    await db.put(REMNANTS_STORE, { ...remnant, used: true, usedInProjectId: projectId });
  }
}

export async function deleteRemnant(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(REMNANTS_STORE, id);
}

export async function deleteRemnantsByProject(projectId: string): Promise<void> {
  const db = await getDB();
  const all = await db.getAllFromIndex(REMNANTS_STORE, 'projectId', projectId);
  const tx = db.transaction(REMNANTS_STORE, 'readwrite');
  await Promise.all(all.map(r => tx.store.delete(r.id)));
  await tx.done;
}

// ─── Suggestion engine ────────────────────────

export async function suggestRemnants(
  requiredWidth: number,
  requiredHeight: number,
  material: string,
  unit: string
): Promise<Remnant[]> {
  const { toMM } = await import('@/lib/utils/units');
  const reqW = toMM(requiredWidth, unit as any);
  const reqH = toMM(requiredHeight, unit as any);
  const reqArea = reqW * reqH;

  const candidates = await getRemnantsByMaterial(material);

  return candidates
    .filter(r => {
      // Remnant must fit the required dimensions (with or without rotation)
      const fits = (r.areaMM2 * 0.8) >= reqArea; // at least 80% coverage
      return fits;
    })
    .map(r => r)
    .slice(0, 5);
}

// ─── Analytics persistence ────────────────────

export async function saveAnalyticsSnapshot(snapshot: {
  id: string;
  projectId: string;
  efficiency: number;
  sheetsUsed: number;
  wastePercent: number;
  totalPieces: number;
  material: string;
  timestamp: string;
}): Promise<void> {
  const db = await getDB();
  await db.put('analytics', snapshot);
}

export async function getAnalyticsHistory(limit = 50): Promise<unknown[]> {
  const db = await getDB();
  const all = await db.getAll('analytics');
  return all
    .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}
