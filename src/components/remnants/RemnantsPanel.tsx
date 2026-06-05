'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Search, Trash2, CheckCircle, ArrowRight, Filter } from 'lucide-react';
import { getAllRemnants, deleteRemnant, markRemnantUsed } from '@/lib/db/remnants';
import type { Remnant } from '@/types/phase2';
import { MATERIAL_LABELS, MATERIAL_COLORS } from '@/lib/utils/presets';
import { formatArea } from '@/lib/utils/units';
import { cn, formatRelativeTime } from '@/lib/utils';

interface RemnantsProps {
  onUseRemnant?: (remnant: Remnant) => void;
  filterMaterial?: string;
}

export function RemnantsPanel({ onUseRemnant, filterMaterial }: RemnantsProps) {
  const [remnants, setRemnants] = useState<Remnant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState<string>(filterMaterial ?? 'all');
  const [sortBy, setSortBy] = useState<'area' | 'date' | 'material'>('area');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getAllRemnants();
      setRemnants(all);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    await deleteRemnant(id);
    setRemnants(prev => prev.filter(r => r.id !== id));
  };

  const materials = ['all', ...Array.from(new Set(remnants.map(r => r.material)))];

  const filtered = remnants
    .filter(r => {
      if (selectedMaterial !== 'all' && r.material !== selectedMaterial) return false;
      if (search && !r.projectName.toLowerCase().includes(search.toLowerCase()) &&
          !r.material.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'area') return b.areaMM2 - a.areaMM2;
      if (sortBy === 'date') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return a.material.localeCompare(b.material);
    });

  const totalSavedArea = filtered.reduce((s, r) => s + r.areaMM2, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-text-tertiary" />
            <span className="text-sm font-semibold text-text-primary">Remnant Inventory</span>
          </div>
          <span className="text-xs text-text-tertiary">
            {filtered.length} piece{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search remnants…"
            className="w-full pl-8 pr-3 py-2 bg-background rounded-lg text-sm outline-none border border-transparent focus:border-border transition-colors placeholder:text-text-tertiary"
          />
        </div>

        {/* Material filter tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {materials.map(mat => (
            <button
              key={mat}
              onClick={() => setSelectedMaterial(mat)}
              className={cn(
                'shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                selectedMaterial === mat
                  ? 'bg-black text-white'
                  : 'bg-background text-text-secondary hover:bg-border/50'
              )}
            >
              {mat === 'all' ? 'All' : MATERIAL_LABELS[mat] ?? mat}
            </button>
          ))}
        </div>
      </div>

      {/* Saved area stat */}
      {filtered.length > 0 && (
        <div className="px-5 py-3 bg-success/5 border-b border-success/10">
          <p className="text-xs text-success font-medium">
            {formatArea(totalSavedArea, 'mm')} of reusable material available
          </p>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl shimmer" />
          ))
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-16 flex flex-col items-center gap-3 text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-background flex items-center justify-center">
              <Package className="w-5 h-5 text-text-tertiary" />
            </div>
            <p className="text-sm text-text-secondary font-medium">No remnants yet</p>
            <p className="text-xs text-text-tertiary max-w-[200px]">
              Run optimization with "Auto-save remnants" enabled to build your inventory
            </p>
          </motion.div>
        ) : (
          <AnimatePresence initial={false}>
            {filtered.map(remnant => (
              <RemnantCard
                key={remnant.id}
                remnant={remnant}
                onUse={onUseRemnant}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// ─── Remnant Card ─────────────────────────────

interface RemnantCardProps {
  remnant: Remnant;
  onUse?: (r: Remnant) => void;
  onDelete: (id: string) => void;
}

function RemnantCard({ remnant, onUse, onDelete }: RemnantCardProps) {
  const [hovered, setHovered] = useState(false);
  const aspectRatio = remnant.width / remnant.height;
  const matColor = MATERIAL_COLORS[remnant.material] ?? '#E5E5EA';

  // Visual proportion clamped to card
  const previewW = Math.min(48, Math.max(20, 48 * Math.min(aspectRatio, 2) / 2));
  const previewH = Math.min(48, Math.max(20, 48 / Math.max(aspectRatio, 0.5) * 0.8));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, height: 0 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-text-tertiary/50 bg-surface transition-all"
    >
      {/* Visual preview */}
      <div className="w-12 h-12 rounded-lg bg-background flex items-center justify-center shrink-0 overflow-hidden">
        <div
          className="rounded border border-border/60 opacity-80"
          style={{
            width: previewW,
            height: previewH,
            background: matColor,
          }}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-text-primary">
            {remnant.width} × {remnant.height} {remnant.unit}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-background border border-border text-text-tertiary">
            {remnant.thickness}mm
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-text-tertiary">
            {MATERIAL_LABELS[remnant.material] ?? remnant.material}
          </span>
          <span className="text-[11px] text-text-tertiary">·</span>
          <span className="text-[11px] text-text-tertiary truncate">
            {remnant.projectName}
          </span>
        </div>
        <span className="text-[11px] text-success font-medium">
          {formatArea(remnant.areaMM2, 'mm')}
        </span>
      </div>

      {/* Actions */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, x: 4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 4 }}
            className="flex flex-col gap-1"
          >
            {onUse && (
              <button
                onClick={() => onUse(remnant)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black text-white text-[11px] font-semibold hover:bg-neutral-800 transition-colors"
              >
                Use <ArrowRight className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={() => onDelete(remnant.id)}
              className="p-1 rounded-lg text-text-tertiary hover:text-error transition-colors self-end"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
