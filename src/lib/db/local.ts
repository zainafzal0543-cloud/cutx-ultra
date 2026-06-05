// ─────────────────────────────────────────────
// IndexedDB Local Persistence — CUTX ULTRA
// ─────────────────────────────────────────────

import { openDB, type IDBPDatabase } from 'idb';
import type { Project } from '@/types';

const DB_NAME = 'cutx-ultra';
const DB_VERSION = 1;
const PROJECTS_STORE = 'projects';
const SETTINGS_STORE = 'settings';

let dbInstance: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Projects store
      if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
        const projectStore = db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
        projectStore.createIndex('updatedAt', 'updatedAt');
        projectStore.createIndex('createdAt', 'createdAt');
      }

      // App settings store
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
      }
    },
  });

  return dbInstance;
}

// ─── Projects ────────────────────────────────

export async function saveProject(project: Project): Promise<void> {
  const db = await getDB();
  const now = new Date().toISOString();
  await db.put(PROJECTS_STORE, { ...project, updatedAt: now, isLocal: true });
}

export async function getProject(id: string): Promise<Project | undefined> {
  const db = await getDB();
  return db.get(PROJECTS_STORE, id);
}

export async function getAllProjects(): Promise<Project[]> {
  const db = await getDB();
  const all = await db.getAll(PROJECTS_STORE);
  return all.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(PROJECTS_STORE, id);
}

export async function duplicateProject(id: string, newName: string): Promise<Project | null> {
  const project = await getProject(id);
  if (!project) return null;

  const { generateId } = await import('@/lib/utils');
  const now = new Date().toISOString();

  const duplicate: Project = {
    ...project,
    id: generateId(),
    name: newName,
    createdAt: now,
    updatedAt: now,
    isLocal: true,
    optimizationResult: undefined,
  };

  await saveProject(duplicate);
  return duplicate;
}

// ─── Settings ────────────────────────────────

export async function saveSetting(key: string, value: unknown): Promise<void> {
  const db = await getDB();
  await db.put(SETTINGS_STORE, { key, value });
}

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const db = await getDB();
  const record = await db.get(SETTINGS_STORE, key);
  return record?.value as T | undefined;
}

// ─── Export / Import ─────────────────────────

export async function exportProjectToJSON(id: string): Promise<string | null> {
  const project = await getProject(id);
  if (!project) return null;
  return JSON.stringify(project, null, 2);
}

export async function importProjectFromJSON(json: string): Promise<Project> {
  const { generateId } = await import('@/lib/utils');
  const project = JSON.parse(json) as Project;
  const now = new Date().toISOString();

  // Assign a new ID to avoid conflicts
  const imported: Project = {
    ...project,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
    isLocal: true,
  };

  await saveProject(imported);
  return imported;
}
