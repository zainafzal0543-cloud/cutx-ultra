'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Scissors, Wind, TreePine, ChevronDown, SlidersHorizontal } from 'lucide-react';
import type { OptimizationMode, SortStrategy, Phase2Settings } from '@/types/phase2';
import { cn } from '@/lib/utils';

interface OptimizationModeProps {
  settings: Partial<Phase2Settings>;
  onChange: (updates: Partial<Phase2Settings>) => void;
}

const MODES: {
  id: OptimizationMode;
  label: string;
  desc: string;
  icon: React.ReactNode;
  badge?: string;
}[] = [
  {
    id: 'minimum_wastage',
    label: 'Min Wastage',
    desc: 'Maximizes material usage. Best for expensive materials.',
    icon: <Zap className="w-4 h-4" />,
    badge: 'Default',
  },
  {
    id: 'minimum_cuts',
    label: 'Min Cuts',
    desc: 'Fewer guillotine cuts. Faster on the saw.',
    icon: <Scissors className="w-4 h-4" />,
  },
  {
    id: 'fast_cutting',
    label: 'Fast Cut',
    desc: 'Optimizes for cutting speed. Slightly less efficient.',
    icon: <Wind className="w-4 h-4" />,
  },
  {
    id: 'grain_safe',
    label: 'Grain Safe',
    desc: 'Locks grain direction. No rotation allowed.',
    icon: <TreePine className="w-4 h-4" />,
  },
];

const SORT_OPTIONS: { id: SortStrategy; label: string }[] = [
  { id: 'area_desc',      label: 'Area (largest first)' },
  { id: 'area_asc',       label: 'Area (smallest first)' },
  { id: 'width_desc',     label: 'Width (largest first)' },
  { id: 'height_desc',    label: 'Height (largest first)' },
  { id: 'perimeter_desc', label: 'Perimeter (largest first)' },
];

export function OptimizationModeSelector({ settings, onChange }: OptimizationModeProps) {
  const [expanded, setExpanded] = useState(false);
  const active = settings.optimizationMode ?? 'minimum_wastage';

  return (
    <div className="space-y-4">
      {/* Mode grid */}
      <div>
        <div className="section-label mb-3">Optimization Mode</div>
        <div className="grid grid-cols-2 gap-2">
          {MODES.map(mode => (
            <button
              key={mode.id}
              onClick={() => onChange({ optimizationMode: mode.id })}
              className={cn(
                'relative flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left transition-all',
                active === mode.id
                  ? 'border-black bg-black/5'
                  : 'border-border hover:border-text-tertiary/50 bg-surface'
              )}
            >
              {mode.badge && (
                <span className="absolute top-2 right-2 text-[9px] font-bold text-text-tertiary bg-background border border-border px-1.5 py-0.5 rounded-full">
                  {mode.badge}
                </span>
              )}
              <div className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                active === mode.id ? 'bg-black text-white' : 'bg-background text-text-tertiary'
              )}>
                {mode.icon}
              </div>
              <div>
                <div className="text-xs font-semibold text-text-primary">{mode.label}</div>
                <div className="text-[10px] text-text-tertiary leading-snug mt-0.5">{mode.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Advanced options */}
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-xs text-text-secondary hover:text-text-primary transition-colors w-full"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Advanced Options</span>
          <ChevronDown className={cn('w-3 h-3 ml-auto transition-transform', expanded && 'rotate-180')} />
        </button>

        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 space-y-4"
          >
            {/* Sort strategy */}
            <div>
              <div className="section-label mb-2">Sort Strategy</div>
              <select
                value={settings.sortStrategy ?? 'area_desc'}
                onChange={e => onChange({ sortStrategy: e.target.value as SortStrategy })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary outline-none focus:border-text-secondary transition-colors"
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Grain direction */}
            <div>
              <div className="section-label mb-2">Grain Direction</div>
              <div className="flex gap-1.5">
                {(['none', 'horizontal', 'vertical'] as const).map(dir => (
                  <button
                    key={dir}
                    onClick={() => onChange({ grainDirection: dir })}
                    className={cn(
                      'flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all',
                      (settings.grainDirection ?? 'none') === dir
                        ? 'bg-black text-white'
                        : 'bg-background text-text-secondary border border-border hover:border-text-tertiary/50'
                    )}
                  >
                    {dir}
                  </button>
                ))}
              </div>
            </div>

            {/* Auto-save remnants */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-text-primary">Auto-save Remnants</div>
                <div className="text-[10px] text-text-tertiary mt-0.5">
                  Save large leftover pieces to inventory
                </div>
              </div>
              <button
                onClick={() => onChange({ autoSaveRemnants: !(settings.autoSaveRemnants ?? true) })}
                className={cn(
                  'relative w-9 h-5 rounded-full transition-all duration-200',
                  (settings.autoSaveRemnants ?? true) ? 'bg-black' : 'bg-border'
                )}
              >
                <motion.div
                  animate={{ x: (settings.autoSaveRemnants ?? true) ? 16 : 2 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-soft"
                />
              </button>
            </div>

            {/* Min remnant size */}
            <div>
              <div className="section-label mb-2">
                Min Remnant Size — {((settings.minRemnantSize ?? 100000) / 10000).toFixed(0)} cm²
              </div>
              <input
                type="range"
                min={10000}
                max={500000}
                step={10000}
                value={settings.minRemnantSize ?? 100000}
                onChange={e => onChange({ minRemnantSize: parseInt(e.target.value) })}
                className="w-full accent-black h-1 bg-border rounded-full"
              />
              <div className="flex justify-between text-[10px] text-text-tertiary mt-1">
                <span>1 cm²</span>
                <span>500 cm²</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
