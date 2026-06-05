// ─────────────────────────────────────────────
// CUTX ULTRA Phase 2 — Sharing System
// Generates shareable read-only links via Supabase
// ─────────────────────────────────────────────

import { generateId } from '@/lib/utils';
import type { ShareLink, SharedProject } from '@/types/phase2';
import type { Project } from '@/types';

// ─── Local share storage (IndexedDB fallback) ─

const SHARE_STORE = 'share_links';

async function getShareDB() {
  const { openDB } = await import('idb');
  return openDB('cutx-ultra', 3, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(SHARE_STORE)) {
        const store = db.createObjectStore(SHARE_STORE, { keyPath: 'id' });
        store.createIndex('token', 'token', { unique: true });
        store.createIndex('projectId', 'projectId');
      }
    },
  });
}

// ─── Create share link ────────────────────────

export async function createShareLink(
  project: Project,
  options: { expiresInDays?: number; readOnly?: boolean } = {}
): Promise<ShareLink> {
  const token = generateShareToken();
  const now = new Date();
  const expiresAt = options.expiresInDays
    ? new Date(now.getTime() + options.expiresInDays * 86400000).toISOString()
    : undefined;

  const link: ShareLink = {
    id: generateId(),
    projectId: project.id,
    token,
    expiresAt,
    viewCount: 0,
    createdAt: now.toISOString(),
    readOnly: options.readOnly ?? true,
  };

  // Store the stripped project snapshot alongside the token
  const snapshot: SharedProject = {
    shareId: link.id,
    token,
    project: {
      name: project.name,
      description: project.description,
      sheets: project.sheets,
      cuttingList: project.cuttingList,
      optimizationResult: project.optimizationResult,
      settings: project.settings,
    },
    createdAt: link.createdAt,
    expiresAt: link.expiresAt,
  };

  const db = await getShareDB();
  await db.put(SHARE_STORE, { ...link, snapshot });

  return link;
}

// ─── Get share link by token ──────────────────

export async function getSharedProject(token: string): Promise<SharedProject | null> {
  try {
    const db = await getShareDB();
    const record = await db.getFromIndex(SHARE_STORE, 'token', token);
    if (!record) return null;

    // Check expiry
    if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
      return null; // expired
    }

    // Increment view count
    await db.put(SHARE_STORE, { ...record, viewCount: (record.viewCount ?? 0) + 1 });

    return record.snapshot as SharedProject;
  } catch {
    return null;
  }
}

// ─── List share links for project ─────────────

export async function getShareLinksForProject(projectId: string): Promise<ShareLink[]> {
  try {
    const db = await getShareDB();
    return db.getAllFromIndex(SHARE_STORE, 'projectId', projectId);
  } catch {
    return [];
  }
}

// ─── Revoke share link ────────────────────────

export async function revokeShareLink(id: string): Promise<void> {
  const db = await getShareDB();
  await db.delete(SHARE_STORE, id);
}

// ─── Generate share URL ───────────────────────

export function buildShareURL(token: string): string {
  const base = typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL ?? 'https://cutxultra.app';
  return `${base}/share/${token}`;
}

// ─── Token generator ──────────────────────────

function generateShareToken(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
