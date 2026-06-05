'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Plus, AlertTriangle, Edit3, Trash2,
  TrendingDown, ArrowLeft, Search, RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import {
  getAllInventory, saveInventorySheet, deleteInventorySheet,
  getInventoryAlerts, adjustInventoryQuantity, seedDefaultInventory,
} from '@/lib/inventory/engine';
import type { InventorySheet, InventoryAlert } from '@/types/phase3';
import { MATERIAL_LABELS, MATERIAL_COLORS } from '@/lib/utils/presets';
import { cn, generateId, formatRelativeTime } from '@/lib/utils';

export default function InventoryPage() {
  const [sheets, setSheets] = useState<InventorySheet[]>([]);
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<InventorySheet | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    await seedDefaultInventory();
    const [s, a] = await Promise.all([getAllInventory(), getInventoryAlerts()]);
    setSheets(s);
    setAlerts(a);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (sheet: InventorySheet) => {
    await saveInventorySheet(sheet);
    setShowForm(false);
    setEditing(null);
    load();
  };

  const handleDelete = async (id: string) => {
    await deleteInventorySheet(id);
    load();
  };

  const handleAdjust = async (id: string, delta: number) => {
    await adjustInventoryQuantity(id, delta, 'Manual adjustment');
    load();
  };

  const filtered = sheets.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.material.toLowerCase().includes(search.toLowerCase())
  );

  const totalValue = sheets.reduce((s, sh) => s + sh.quantity * sh.costPerSheet, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-14 bg-surface border-b border-border flex items-center px-6 gap-4">
        <Link href="/workspace" className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" />Back
        </Link>
        <div className="w-px h-5 bg-border" />
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-text-tertiary" />
          <span className="text-sm font-semibold text-text-primary">Inventory</span>
        </div>
        <div className="flex-1" />
        <button onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-sm font-semibold hover:bg-neutral-800 transition-colors">
          <Plus className="w-4 h-4" />Add Sheet
        </button>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map(alert => (
              <motion.div key={alert.sheetId} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className={cn('flex items-center gap-3 p-3 rounded-xl border',
                  alert.severity === 'out_of_stock' ? 'bg-error/8 border-error/20' :
                  alert.severity === 'critical' ? 'bg-warning/8 border-warning/20' : 'bg-yellow-50 border-yellow-100'
                )}>
                <AlertTriangle className={cn('w-4 h-4 shrink-0',
                  alert.severity === 'out_of_stock' ? 'text-error' : 'text-warning')} />
                <span className="text-xs font-medium text-text-primary">
                  {alert.severity === 'out_of_stock' ? 'Out of stock' :
                   alert.severity === 'critical' ? 'Critically low' : 'Low stock'}: {alert.sheetName}
                  {' '}({alert.currentStock} remaining, min {alert.minLevel})
                </span>
              </motion.div>
            ))}
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total SKUs', value: sheets.length },
            { label: 'Total Sheets', value: sheets.reduce((s, sh) => s + sh.quantity, 0) },
            { label: 'Stock Value', value: `$${totalValue.toLocaleString()}` },
            { label: 'Low Stock Alerts', value: alerts.length, warn: alerts.length > 0 },
          ].map((kpi, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-surface border border-border rounded-2xl p-4">
              <div className={cn('text-2xl font-bold', kpi.warn ? 'text-warning' : 'text-text-primary')}>
                {kpi.value}
              </div>
              <div className="text-xs text-text-tertiary mt-0.5">{kpi.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search inventory…"
            className="w-full pl-9 pr-4 py-2.5 bg-surface rounded-xl border border-border text-sm outline-none focus:border-text-secondary transition-colors" />
        </div>

        {/* Table */}
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] gap-3 px-5 py-3 border-b border-border bg-background text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
            <span>Material</span><span>Size</span><span>Stock</span><span>Min Level</span><span>Value</span><span>Actions</span>
          </div>

          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 border-b border-border/50 px-5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg shimmer" />
                <div className="flex-1 h-4 rounded shimmer" />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-text-tertiary">No inventory items</div>
          ) : (
            filtered.map(sheet => (
              <InventoryRow key={sheet.id} sheet={sheet}
                onEdit={() => { setEditing(sheet); setShowForm(true); }}
                onDelete={() => handleDelete(sheet.id)}
                onAdjust={delta => handleAdjust(sheet.id, delta)}
              />
            ))
          )}
        </div>
      </div>

      {/* Edit/Create Form Modal */}
      <AnimatePresence>
        {showForm && (
          <InventoryFormModal
            initial={editing}
            onSave={handleSave}
            onClose={() => { setShowForm(false); setEditing(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Row ──────────────────────────────────────

function InventoryRow({ sheet, onEdit, onDelete, onAdjust }: {
  sheet: InventorySheet;
  onEdit: () => void;
  onDelete: () => void;
  onAdjust: (delta: number) => void;
}) {
  const isLow = sheet.quantity <= sheet.minStockLevel;
  const isOut = sheet.quantity === 0;
  const matColor = MATERIAL_COLORS[sheet.material] ?? '#E5E5EA';

  return (
    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] gap-3 px-5 py-3 border-b border-border/50 last:border-0 items-center">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg shrink-0 border border-border/40" style={{ background: matColor }} />
        <div>
          <p className="text-sm font-medium text-text-primary truncate">{sheet.name}</p>
          <p className="text-xs text-text-tertiary">{MATERIAL_LABELS[sheet.material]} · {sheet.thickness}mm</p>
        </div>
      </div>
      <span className="text-xs font-mono text-text-secondary">{sheet.width}×{sheet.height} {sheet.unit}</span>
      <div className="flex items-center gap-1.5">
        <button onClick={() => onAdjust(-1)} className="w-5 h-5 rounded bg-background border border-border text-text-secondary text-xs hover:bg-border/50 transition-colors flex items-center justify-center">−</button>
        <span className={cn('text-sm font-semibold min-w-[24px] text-center', isOut ? 'text-error' : isLow ? 'text-warning' : 'text-text-primary')}>{sheet.quantity}</span>
        <button onClick={() => onAdjust(1)} className="w-5 h-5 rounded bg-background border border-border text-text-secondary text-xs hover:bg-border/50 transition-colors flex items-center justify-center">+</button>
      </div>
      <span className={cn('text-xs', sheet.quantity <= sheet.minStockLevel ? 'text-warning font-medium' : 'text-text-tertiary')}>{sheet.minStockLevel}</span>
      <span className="text-xs text-text-secondary">${(sheet.quantity * sheet.costPerSheet).toLocaleString()}</span>
      <div className="flex items-center gap-1">
        <button onClick={onEdit} className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-background transition-all"><Edit3 className="w-3.5 h-3.5" /></button>
        <button onClick={onDelete} className="p-1.5 rounded-lg text-text-tertiary hover:text-error transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

// ─── Form Modal ───────────────────────────────

function InventoryFormModal({ initial, onSave, onClose }: {
  initial: InventorySheet | null;
  onSave: (s: InventorySheet) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<InventorySheet>(initial ?? {
    id: generateId(), name: '', material: 'plywood', width: 2440, height: 1220,
    thickness: 18, unit: 'mm', quantity: 10, minStockLevel: 3, costPerSheet: 40,
    currency: 'USD', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  });

  const set = (k: keyof InventorySheet, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50" />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-surface rounded-3xl shadow-modal overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-border">
          <h2 className="text-base font-semibold">{initial ? 'Edit Sheet' : 'Add Inventory Sheet'}</h2>
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {[
            { label: 'Name', key: 'name', type: 'text' },
            { label: 'Width', key: 'width', type: 'number' },
            { label: 'Height', key: 'height', type: 'number' },
            { label: 'Thickness (mm)', key: 'thickness', type: 'number' },
            { label: 'Quantity', key: 'quantity', type: 'number' },
            { label: 'Min Stock Level', key: 'minStockLevel', type: 'number' },
            { label: 'Cost per Sheet ($)', key: 'costPerSheet', type: 'number' },
          ].map(field => (
            <div key={field.key}>
              <label className="section-label block mb-1.5">{field.label}</label>
              <input type={field.type} value={(form as any)[field.key]}
                onChange={e => set(field.key as keyof InventorySheet, field.type === 'number' ? parseFloat(e.target.value) : e.target.value)}
                className="input-ghost text-sm w-full" />
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-border flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-text-secondary hover:bg-background transition-colors">Cancel</button>
          <button onClick={() => onSave(form)} className="flex-1 py-2.5 rounded-xl bg-black text-white text-sm font-semibold hover:bg-neutral-800 transition-colors">Save</button>
        </div>
      </motion.div>
    </>
  );
}
