// ─────────────────────────────────────────────
// CUTX ULTRA Phase 3 — Enterprise Permissions
// Role-based access control + activity logging
// ─────────────────────────────────────────────

import type { TeamRole, Permission, ActivityLog, TeamMember } from '@/types/phase3';
import { ROLE_PERMISSIONS } from '@/types/phase3';
import { generateId } from '@/lib/utils';

// ─── Permission Checks ────────────────────────

export function hasPermission(role: TeamRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canAccess(role: TeamRole, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(role, p));
}

export function getPermissionsForRole(role: TeamRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

// ─── Activity Logging ─────────────────────────

export async function logActivity(entry: Omit<ActivityLog, 'id' | 'createdAt'>): Promise<void> {
  try {
    const { openDB } = await import('idb');
    const db = await openDB('cutx-ultra', 4);
    await db.put('activity_log', {
      ...entry,
      id: generateId(),
      createdAt: new Date().toISOString(),
    });
  } catch {
    // Non-critical — never throw
  }
}

export async function getActivityLog(limit = 50): Promise<ActivityLog[]> {
  const { openDB } = await import('idb');
  const db = await openDB('cutx-ultra', 4);
  const all = await db.getAll('activity_log');
  return all
    .sort((a: ActivityLog, b: ActivityLog) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, limit);
}

// ─── Role display helpers ─────────────────────

export const ROLE_LABELS: Record<TeamRole, string> = {
  super_admin:   'Super Admin',
  owner:         'Owner',
  manager:       'Manager',
  operator:      'Operator',
  client_viewer: 'Client Viewer',
};

export const ROLE_DESCRIPTIONS: Record<TeamRole, string> = {
  super_admin:   'Full system access including billing and team management',
  owner:         'Full access to all projects and settings',
  manager:       'Manage projects, inventory, and quotations',
  operator:      'Create and run optimizations, view inventory',
  client_viewer: 'Read-only access to shared projects',
};

export const ROLE_COLORS: Record<TeamRole, string> = {
  super_admin:   'bg-error/10 text-error',
  owner:         'bg-black/10 text-black',
  manager:       'bg-accent-blue/10 text-accent-blue',
  operator:      'bg-success/10 text-success',
  client_viewer: 'bg-border text-text-secondary',
};

// ─── Team member persistence ──────────────────

export async function getTeamMembers(): Promise<TeamMember[]> {
  const { openDB } = await import('idb');
  try {
    const db = await openDB('cutx-ultra', 4);
    if (!db.objectStoreNames.contains('team_members')) return getMockTeam();
    return db.getAll('team_members');
  } catch {
    return getMockTeam();
  }
}

function getMockTeam(): TeamMember[] {
  return [
    {
      id: '1',
      userId: 'u1',
      orgId: 'org1',
      email: 'owner@workshop.com',
      displayName: 'Workshop Owner',
      role: 'owner',
      invitedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
      joinedAt: new Date(Date.now() - 86400000 * 29).toISOString(),
      isActive: true,
    },
    {
      id: '2',
      userId: 'u2',
      orgId: 'org1',
      email: 'manager@workshop.com',
      displayName: 'Floor Manager',
      role: 'manager',
      invitedAt: new Date(Date.now() - 86400000 * 14).toISOString(),
      joinedAt: new Date(Date.now() - 86400000 * 13).toISOString(),
      isActive: true,
    },
    {
      id: '3',
      userId: 'u3',
      orgId: 'org1',
      email: 'operator@workshop.com',
      displayName: 'CNC Operator',
      role: 'operator',
      invitedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      isActive: false,
    },
  ];
}
