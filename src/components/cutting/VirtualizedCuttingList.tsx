'use client';

import {
  useState, useRef, useCallback, useEffect, useMemo,
  memo,
} from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  Plus, Trash2, Copy, Upload, RotateCw, Search,
  GripVertical, ChevronDown, Filter, X,
} from 'lucide-react';
import { useStore, selectActiveProject } from '@/store';
import type { CuttingItem } from '@/types';
import { cn, generateId } from '@/lib/utils';
import Papa from 'papaparse';

const ROW_H = 40; // px per row
const OVERSCAN = 8;

// ─── Main Panel ───────────────────────────────

export function VirtualizedCuttingList() {
  const activeProject = useStore(selectActiveProject);
  const {
    addCuttingItem,
    updateCuttingItem,
    deleteCuttingItem,
    duplicateCuttingItem,
    importCuttingItems,
  } = useStore();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [sortField, setSortField] = useState<keyof CuttingItem | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerH, setContainerH] = useState(400);

  const items = activeProject?.cuttingList ?? [];
  const projectId = activeProject?.id;

  // ── Measure container ─────────────────────
  useEffect(() => {
    if (!scrollRef.current) return;
    const ro = new ResizeObserver(entries => {
      setContainerH(entries[0].contentRect.height);
    });
    ro.observe(scrollRef.current);
    return () => ro.disconnect();
  }, []);

  // ── Filter + Sort ─────────────────────────
  const filtered = useMemo(() => {
    let list = [...items];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.label.toLowerCase().includes(q) ||
        (i.sectionTag ?? '').toLowerCase().includes(q)
      );
    }
    if (filterSection) {
      list = list.filter(i => i.sectionTag === filterSection);
    }
    if (sortField) {
      list.sort((a, b) => {
        const av = a[sortField] as number | string;
        const bv = b[sortField] as number | string;
        if (typeof av === 'number' && typeof bv === 'number') {
          return sortDir === 'asc' ? av - bv : bv - av;
        }
        return sortDir === 'asc'
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      });
    }
    return list;
  }, [items, search, filterSection, sortField, sortDir]);

  // ── Virtual window ────────────────────────
  const totalH = filtered.length * ROW_H;
  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
  const visibleCount = Math.ceil(containerH / ROW_H) + OVERSCAN * 2;
  const endIdx = Math.min(filtered.length, startIdx + visibleCount);
  const visibleItems = filtered.slice(startIdx, endIdx);

  // ── Sections ──────────────────────────────
  const sections = useMemo(() =>
    Array.from(new Set(items.map(i => i.sectionTag).filter(Boolean))) as string[],
    [items]
  );

  // ── Handlers ─────────────────────────────
  const handleAdd = () => {
    if (!projectId) return;
    addCuttingItem(projectId, { label: `Part ${items.length + 1}` });
    // Scroll to bottom
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 50);
  };

  const handleBulkDelete = () => {
    if (!projectId) return;
    selectedIds.forEach(id => deleteCuttingItem(projectId, id));
    setSelectedIds(new Set());
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(i => i.id)));
    }
  };

  const handleCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: results => {
        if (!projectId) return;
        const parsed = (results.data as Record<string, string>[]).map(row => ({
          label: row.label || row.Label || row.name || 'Part',
          width: parseFloat(row.width || row.Width || '0') || 0,
          height: parseFloat(row.height || row.Height || '0') || 0,
          quantity: parseInt(row.quantity || row.qty || '1') || 1,
          allowRotation: !['false', '0', 'no'].includes((row.rotation || '').toLowerCase()),
          sectionTag: row.section || row.tag || '',
        })).filter(i => i.width > 0 && i.height > 0);
        importCuttingItems(projectId, parsed);
      },
    });
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (!projectId) return;
    const text = e.clipboardData.getData('text');
    if (!text.includes('\t') && !text.includes('\n')) return;
    e.preventDefault();
    const rows = text.trim().split('\n').map(r => r.split('\t'));
    const parsed = rows.map(cols => ({
      label: cols[0]?.trim() || 'Part',
      width: parseFloat(cols[1] || '0') || 0,
      height: parseFloat(cols[2] || '0') || 0,
      quantity: parseInt(cols[3] || '1') || 1,
      allowRotation: cols[4]?.trim().toLowerCase() !== 'false',
      sectionTag: cols[5]?.trim() || '',
    })).filter(i => i.width > 0 && i.height > 0);
    if (parsed.length) importCuttingItems(projectId, parsed);
  }, [projectId, importCuttingItems]);

  const toggleSort = (field: keyof CuttingItem) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  if (!activeProject) return (
    <div className="p-6 text-center text-sm text-text-tertiary">No project selected</div>
  );

  const totalPieces = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="flex flex-col h-full" onPaste={handlePaste}>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-border flex-wrap gap-y-1.5">
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black text-white text-xs font-semibold hover:bg-neutral-800 transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>

        {selectedIds.size > 0 && (
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-error/10 text-error text-xs font-semibold hover:bg-error/20 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete ({selectedIds.size})
          </button>
        )}

        {/* Search */}
        <div className="relative flex-1 min-w-[100px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text-tertiary" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-full pl-7 pr-2 py-1.5 bg-background rounded-lg text-xs outline-none border border-transparent focus:border-border transition-colors placeholder:text-text-tertiary"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Section filter */}
        {sections.length > 0 && (
          <select
            value={filterSection}
            onChange={e => setFilterSection(e.target.value)}
            className="px-2 py-1.5 bg-background rounded-lg text-xs border border-transparent focus:border-border outline-none text-text-secondary"
          >
            <option value="">All sections</option>
            {sections.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}

        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-background transition-all"
          title="Import CSV"
        >
          <Upload className="w-3.5 h-3.5" />
        </button>
        <input ref={fileInputRef} type="file" accept=".csv" className="hidden"
          onChange={e => e.target.files?.[0] && handleCSV(e.target.files[0])} />
      </div>

      {/* ── Column Headers ── */}
      <div className="grid grid-cols-[20px_1fr_56px_56px_36px_28px] items-center gap-1 px-3 py-2 border-b border-border bg-background text-[10px] font-semibold tracking-wider uppercase text-text-tertiary">
        <input
          type="checkbox"
          checked={filtered.length > 0 && selectedIds.size === filtered.length}
          onChange={handleSelectAll}
          className="accent-black"
        />
        <button className="text-left flex items-center gap-1" onClick={() => toggleSort('label')}>
          Label {sortField === 'label' && <span>{sortDir === 'asc' ? '↑' : '↓'}</span>}
        </button>
        <button className="text-center" onClick={() => toggleSort('width')}>
          W {sortField === 'width' && <span>{sortDir === 'asc' ? '↑' : '↓'}</span>}
        </button>
        <button className="text-center" onClick={() => toggleSort('height')}>
          H {sortField === 'height' && <span>{sortDir === 'asc' ? '↑' : '↓'}</span>}
        </button>
        <button className="text-center" onClick={() => toggleSort('quantity')}>
          Qty {sortField === 'quantity' && <span>{sortDir === 'asc' ? '↑' : '↓'}</span>}
        </button>
        <span className="text-center">Rot</span>
      </div>

      {/* ── Virtual Scroll Container ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto relative"
        onScroll={e => setScrollTop((e.target as HTMLDivElement).scrollTop)}
      >
        {filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-center px-6">
            <div className="w-12 h-12 rounded-2xl bg-background flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="#AEAEB2" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-text-secondary">
              {search || filterSection ? 'No matching parts' : 'No parts added'}
            </p>
            {!search && !filterSection && (
              <button onClick={handleAdd} className="text-xs font-semibold text-black underline underline-offset-4">
                Add first part
              </button>
            )}
          </div>
        ) : (
          // Virtual spacer + visible rows
          <div style={{ height: totalH, position: 'relative' }}>
            <div style={{ position: 'absolute', top: startIdx * ROW_H, left: 0, right: 0 }}>
              {visibleItems.map((item, localIdx) => {
                const globalIdx = startIdx + localIdx;
                return (
                  <CuttingRow
                    key={item.id}
                    item={item}
                    index={globalIdx}
                    selected={selectedIds.has(item.id)}
                    onToggleSelect={id => {
                      setSelectedIds(prev => {
                        const next = new Set(prev);
                        next.has(id) ? next.delete(id) : next.add(id);
                        return next;
                      });
                    }}
                    onUpdate={(id, field, val) => projectId && updateCuttingItem(projectId, id, { [field]: val })}
                    onDelete={id => projectId && deleteCuttingItem(projectId, id)}
                    onDuplicate={id => projectId && duplicateCuttingItem(projectId, id)}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      {items.length > 0 && (
        <div className="px-3 py-2 border-t border-border flex items-center justify-between">
          <span className="text-[11px] text-text-tertiary">
            {filtered.length}/{items.length} parts · {totalPieces} pieces
          </span>
          <span className="text-[11px] text-text-tertiary">
            {selectedIds.size > 0 ? `${selectedIds.size} selected · ` : ''}
            Paste Excel to import
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Individual Row (memoized) ────────────────

interface RowProps {
  item: CuttingItem;
  index: number;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onUpdate: (id: string, field: keyof CuttingItem, value: string | number | boolean) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

const CuttingRow = memo(function CuttingRow({
  item, index, selected, onToggleSelect, onUpdate, onDelete, onDuplicate,
}: RowProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{ height: ROW_H }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'grid grid-cols-[20px_1fr_56px_56px_36px_28px] items-center gap-1 px-3',
        'border-b border-border/40 transition-colors relative',
        selected ? 'bg-blue-50/60' : hovered ? 'bg-background' : ''
      )}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggleSelect(item.id)}
        className="accent-black"
        onClick={e => e.stopPropagation()}
      />

      {/* Label */}
      <div className="flex items-center gap-1 min-w-0">
        <span className="text-[10px] text-text-tertiary shrink-0 w-4 text-right">{index + 1}</span>
        <input
          type="text"
          value={item.label}
          onChange={e => onUpdate(item.id, 'label', e.target.value)}
          className="table-cell-input text-xs min-w-0"
          placeholder="Label"
        />
        {item.sectionTag && (
          <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-border/60 text-text-tertiary hidden sm:block">
            {item.sectionTag}
          </span>
        )}
      </div>

      <input type="number" value={item.width}
        onChange={e => onUpdate(item.id, 'width', parseFloat(e.target.value) || 0)}
        className="table-cell-input text-center font-mono text-xs" min={1} />

      <input type="number" value={item.height}
        onChange={e => onUpdate(item.id, 'height', parseFloat(e.target.value) || 0)}
        className="table-cell-input text-center font-mono text-xs" min={1} />

      <input type="number" value={item.quantity}
        onChange={e => onUpdate(item.id, 'quantity', parseInt(e.target.value) || 1)}
        className="table-cell-input text-center font-mono text-xs" min={1} />

      <button
        onClick={() => onUpdate(item.id, 'allowRotation', !item.allowRotation)}
        className={cn('w-5 h-5 mx-auto rounded flex items-center justify-center transition-all',
          item.allowRotation ? 'text-success' : 'text-text-tertiary/40')}
      >
        <RotateCw className="w-3 h-3" />
      </button>

      {/* Hover actions overlay */}
      {hovered && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 bg-surface border border-border rounded-lg shadow-soft px-1 py-0.5 z-10">
          <button onClick={() => onDuplicate(item.id)}
            className="p-1 text-text-tertiary hover:text-text-primary transition-colors">
            <Copy className="w-3 h-3" />
          </button>
          <button onClick={() => onDelete(item.id)}
            className="p-1 text-text-tertiary hover:text-error transition-colors">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
});
