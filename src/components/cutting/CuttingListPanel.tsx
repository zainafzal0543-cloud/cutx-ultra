'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Copy, Upload, RotateCw } from 'lucide-react';
import { useStore, selectActiveProject } from '@/store';
import type { CuttingItem } from '@/types';
import { cn, generateId } from '@/lib/utils';
import Papa from 'papaparse';

export function CuttingListPanel() {
  const activeProject = useStore(selectActiveProject);
  const {
    addCuttingItem,
    updateCuttingItem,
    deleteCuttingItem,
    duplicateCuttingItem,
    importCuttingItems,
  } = useStore();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  const items = activeProject?.cuttingList ?? [];
  const projectId = activeProject?.id;

  const handleAdd = () => {
    if (!projectId) return;
    addCuttingItem(projectId, {
      label: `Part ${items.length + 1}`,
      width: 400,
      height: 300,
      quantity: 1,
      allowRotation: true,
    });
  };

  const handleUpdate = (id: string, field: keyof CuttingItem, value: string | number | boolean) => {
    if (!projectId) return;
    updateCuttingItem(projectId, id, { [field]: value });
  };

  const handleDelete = (id: string) => {
    if (!projectId) return;
    deleteCuttingItem(projectId, id);
    setSelectedIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
  };

  const handleDuplicate = (id: string) => {
    if (!projectId) return;
    duplicateCuttingItem(projectId, id);
  };

  const handleDeleteSelected = () => {
    if (!projectId) return;
    selectedIds.forEach((id) => deleteCuttingItem(projectId, id));
    setSelectedIds(new Set());
  };

  // CSV Import
  const handleCSVImport = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!projectId) return;
        const items = (results.data as Record<string, string>[]).map((row) => ({
          label: row.label || row.name || row.Label || row.Name || 'Unnamed',
          width: parseFloat(row.width || row.Width || '0') || 0,
          height: parseFloat(row.height || row.Height || '0') || 0,
          quantity: parseInt(row.quantity || row.qty || row.Quantity || '1') || 1,
          allowRotation: !['false', '0', 'no'].includes((row.rotation || '').toLowerCase()),
          sectionTag: row.section || row.tag || '',
        }));
        importCuttingItems(projectId, items);
      },
    });
  };

  // Excel paste handling
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (!projectId) return;
    const text = e.clipboardData.getData('text');
    if (!text.includes('\t') && !text.includes('\n')) return;

    e.preventDefault();
    const rows = text.trim().split('\n').map((r) => r.split('\t'));
    const items = rows.map((cols) => ({
      label: cols[0]?.trim() || 'Part',
      width: parseFloat(cols[1] || '0') || 0,
      height: parseFloat(cols[2] || '0') || 0,
      quantity: parseInt(cols[3] || '1') || 1,
      allowRotation: cols[4]?.trim().toLowerCase() !== 'false',
      sectionTag: cols[5]?.trim() || '',
    })).filter((i) => i.width > 0 && i.height > 0);

    if (items.length > 0) importCuttingItems(projectId, items);
  }, [projectId, importCuttingItems]);

  if (!activeProject) {
    return (
      <div className="p-6 flex flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-text-tertiary">No project selected</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" onPaste={handlePaste}>
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border">
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black text-white text-xs font-semibold hover:bg-neutral-800 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Part
        </button>

        {selectedIds.size > 0 && (
          <button
            onClick={handleDeleteSelected}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-error/10 text-error text-xs font-semibold hover:bg-error/20 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete ({selectedIds.size})
          </button>
        )}

        <div className="flex-1" />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-background transition-all"
          title="Import CSV"
        >
          <Upload className="w-3.5 h-3.5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleCSVImport(e.target.files[0])}
        />
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_60px_60px_40px_28px] items-center gap-1 px-3 py-2 border-b border-border bg-background">
        <span className="section-label">Label</span>
        <span className="section-label text-center">W</span>
        <span className="section-label text-center">H</span>
        <span className="section-label text-center">Qty</span>
        <span className="section-label text-center">Rot</span>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence initial={false}>
          {items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-background flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="#AEAEB2" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-text-secondary">No parts added</p>
                <p className="text-xs text-text-tertiary mt-1">Add parts or paste from Excel</p>
              </div>
              <button
                onClick={handleAdd}
                className="text-xs font-semibold text-black underline underline-offset-4"
              >
                Add first part
              </button>
            </motion.div>
          ) : (
            items.map((item, index) => (
              <CuttingRow
                key={item.id}
                item={item}
                index={index}
                selected={selectedIds.has(item.id)}
                onSelect={(id, multi) => {
                  setSelectedIds((prev) => {
                    const next = multi ? new Set(prev) : new Set<string>();
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  });
                }}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Footer stats */}
      {items.length > 0 && (
        <div className="px-4 py-2.5 border-t border-border flex items-center justify-between">
          <span className="text-xs text-text-tertiary">
            {items.length} part{items.length !== 1 ? 's' : ''} ·{' '}
            {items.reduce((s, i) => s + i.quantity, 0)} total pieces
          </span>
          <span className="text-xs text-text-tertiary">
            Paste Excel data to import
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Individual Row ────────────────────────────

interface CuttingRowProps {
  item: CuttingItem;
  index: number;
  selected: boolean;
  onSelect: (id: string, multi: boolean) => void;
  onUpdate: (id: string, field: keyof CuttingItem, value: string | number | boolean) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

function CuttingRow({ item, index, selected, onSelect, onUpdate, onDelete, onDuplicate }: CuttingRowProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, height: 0 }}
      transition={{ duration: 0.15 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => onSelect(item.id, e.metaKey || e.ctrlKey)}
      className={cn(
        'relative grid grid-cols-[1fr_60px_60px_40px_28px] items-center gap-1 px-3 py-2',
        'border-b border-border/50 cursor-pointer transition-colors',
        selected ? 'bg-blue-50/50' : hovered ? 'bg-background' : ''
      )}
    >
      {/* Index */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[10px] text-text-tertiary shrink-0 w-4 text-right">{index + 1}</span>
        <input
          type="text"
          value={item.label}
          onChange={(e) => onUpdate(item.id, 'label', e.target.value)}
          onClick={(e) => e.stopPropagation()}
          placeholder="Label"
          className="table-cell-input min-w-0 truncate"
        />
      </div>

      <input
        type="number"
        value={item.width}
        onChange={(e) => onUpdate(item.id, 'width', parseFloat(e.target.value) || 0)}
        onClick={(e) => e.stopPropagation()}
        className="table-cell-input text-center font-mono"
        min={1}
      />

      <input
        type="number"
        value={item.height}
        onChange={(e) => onUpdate(item.id, 'height', parseFloat(e.target.value) || 0)}
        onClick={(e) => e.stopPropagation()}
        className="table-cell-input text-center font-mono"
        min={1}
      />

      <input
        type="number"
        value={item.quantity}
        onChange={(e) => onUpdate(item.id, 'quantity', parseInt(e.target.value) || 1)}
        onClick={(e) => e.stopPropagation()}
        className="table-cell-input text-center font-mono"
        min={1}
      />

      {/* Rotation toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); onUpdate(item.id, 'allowRotation', !item.allowRotation); }}
        className={cn(
          'w-5 h-5 mx-auto rounded flex items-center justify-center transition-all',
          item.allowRotation ? 'text-success' : 'text-text-tertiary'
        )}
        title="Allow rotation"
      >
        <RotateCw className="w-3 h-3" />
      </button>

      {/* Hover actions */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center gap-0.5 bg-surface border border-border rounded-lg shadow-soft px-1 py-0.5"
          >
            <button
              onClick={(e) => { e.stopPropagation(); onDuplicate(item.id); }}
              className="p-1 text-text-tertiary hover:text-text-primary transition-colors"
            >
              <Copy className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
              className="p-1 text-text-tertiary hover:text-error transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
