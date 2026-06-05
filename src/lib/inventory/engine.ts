// ─────────────────────────────────────────────
// CUTX ULTRA Phase 3 — Inventory System
// ─────────────────────────────────────────────

import { openDB } from 'idb';
import type { InventorySheet, Supplier, InventoryTransaction, InventoryAlert } from '@/types/phase3';
import { generateId } from '@/lib/utils';

const DB_NAME = 'cutx-ultra';
const DB_VERSION = 4;

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains('inventory')) {
        const inv = db.createObjectStore('inventory', { keyPath: 'id' });
        inv.createIndex('material', 'material');
        inv.createIndex('quantity', 'quantity');
      }
      if (!db.objectStoreNames.contains('suppliers')) {
        db.createObjectStore('suppliers', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('inv_transactions')) {
        const tx = db.createObjectStore('inv_transactions', { keyPath: 'id' });
        tx.createIndex('sheetId', 'sheetId');
        tx.createIndex('createdAt', 'createdAt');
      }
      if (!db.objectStoreNames.contains('quotations')) {
        const q = db.createObjectStore('quotations', { keyPath: 'id' });
        q.createIndex('projectId', 'projectId');
        q.createIndex('status', 'status');
      }
      if (!db.objectStoreNames.contains('piece_labels')) {
        const pl = db.createObjectStore('piece_labels', { keyPath: 'pieceId' });
        pl.createIndex('projectId', 'projectId');
        pl.createIndex('cutStatus', 'cutStatus');
      }
      if (!db.objectStoreNames.contains('scan_events')) {
        db.createObjectStore('scan_events', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('activity_log')) {
        const al = db.createObjectStore('activity_log', { keyPath: 'id' });
        al.createIndex('createdAt', 'createdAt');
      }
      if (!db.objectStoreNames.contains('sync_queue')) {
        db.createObjectStore('sync_queue', { keyPath: 'id' });
      }
    },
  });
}

// ─── Inventory CRUD ───────────────────────────

export async function getAllInventory(): Promise<InventorySheet[]> {
  const db = await getDB();
  return db.getAll('inventory');
}

export async function saveInventorySheet(sheet: InventorySheet): Promise<void> {
  const db = await getDB();
  await db.put('inventory', { ...sheet, updatedAt: new Date().toISOString() });
}

export async function deleteInventorySheet(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('inventory', id);
}

export async function adjustInventoryQuantity(
  sheetId: string,
  delta: number,
  reason: string,
  projectId?: string
): Promise<void> {
  const db = await getDB();
  const sheet = await db.get('inventory', sheetId);
  if (!sheet) return;

  const newQty = Math.max(0, sheet.quantity + delta);
  await db.put('inventory', { ...sheet, quantity: newQty, updatedAt: new Date().toISOString() });

  const tx: InventoryTransaction = {
    id: generateId(),
    sheetId,
    type: delta > 0 ? 'addition' : 'deduction',
    quantity: Math.abs(delta),
    reason,
    projectId,
    createdAt: new Date().toISOString(),
  };
  await db.put('inv_transactions', tx);
}

export async function getInventoryAlerts(): Promise<InventoryAlert[]> {
  const sheets = await getAllInventory();
  const alerts: InventoryAlert[] = [];

  for (const sheet of sheets) {
    if (sheet.quantity === 0) {
      alerts.push({ sheetId: sheet.id, sheetName: sheet.name, material: sheet.material, currentStock: 0, minLevel: sheet.minStockLevel, severity: 'out_of_stock' });
    } else if (sheet.quantity <= sheet.minStockLevel * 0.5) {
      alerts.push({ sheetId: sheet.id, sheetName: sheet.name, material: sheet.material, currentStock: sheet.quantity, minLevel: sheet.minStockLevel, severity: 'critical' });
    } else if (sheet.quantity <= sheet.minStockLevel) {
      alerts.push({ sheetId: sheet.id, sheetName: sheet.name, material: sheet.material, currentStock: sheet.quantity, minLevel: sheet.minStockLevel, severity: 'low' });
    }
  }

  return alerts.sort((a, b) => {
    const order = { out_of_stock: 0, critical: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });
}

export async function getTransactionHistory(sheetId: string, limit = 20): Promise<InventoryTransaction[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('inv_transactions', 'sheetId', sheetId);
  return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
}

// ─── Suppliers ────────────────────────────────

export async function getAllSuppliers(): Promise<Supplier[]> {
  const db = await getDB();
  return db.getAll('suppliers');
}

export async function saveSupplier(supplier: Supplier): Promise<void> {
  const db = await getDB();
  await db.put('suppliers', supplier);
}

// ─── Auto-deduct after optimization ──────────

export async function autoDeductFromOptimization(
  projectId: string,
  projectName: string,
  sheetsUsed: number,
  materialType: string
): Promise<void> {
  const sheets = await getAllInventory();
  const match = sheets.find(s => s.material === materialType && s.quantity >= sheetsUsed);
  if (!match) return;

  await adjustInventoryQuantity(
    match.id,
    -sheetsUsed,
    `Used in project: ${projectName}`,
    projectId
  );
}

// ─── Default inventory sheets ────────────────

export async function seedDefaultInventory(): Promise<void> {
  const existing = await getAllInventory();
  if (existing.length > 0) return;

  const defaults: InventorySheet[] = [
    { id: generateId(), name: '18mm Birch Plywood 8×4', material: 'plywood', width: 2440, height: 1220, thickness: 18, unit: 'mm', quantity: 20, minStockLevel: 5, costPerSheet: 45, currency: 'USD', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: generateId(), name: '18mm MDF 8×4', material: 'mdf', width: 2440, height: 1220, thickness: 18, unit: 'mm', quantity: 15, minStockLevel: 5, costPerSheet: 28, currency: 'USD', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: generateId(), name: '3mm Clear Acrylic 8×4', material: 'acrylic', width: 2440, height: 1220, thickness: 3, unit: 'mm', quantity: 8, minStockLevel: 3, costPerSheet: 65, currency: 'USD', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ];

  for (const sheet of defaults) await saveInventorySheet(sheet);
}
