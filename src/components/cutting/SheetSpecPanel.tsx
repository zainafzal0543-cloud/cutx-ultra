'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, RefreshCw } from 'lucide-react';
import { useStore, selectActiveProject, selectActiveSheet } from '@/store';
import type { Sheet, MaterialType, Unit } from '@/types';
import { SHEET_PRESETS, MATERIAL_LABELS, DEFAULT_KERF_BY_MATERIAL } from '@/lib/utils/presets';
import { UNIT_LABELS } from '@/lib/utils/units';
import { cn, generateId } from '@/lib/utils';

const UNITS: Unit[] = ['mm', 'cm', 'inches', 'feet'];
const MATERIALS: MaterialType[] = ['plywood', 'mdf', 'acrylic', 'aluminum', 'steel', 'glass', 'solid_wood', 'custom'];

export function SheetSpecPanel() {
  const activeProject = useStore(selectActiveProject);
  const { updateSheet, updateSettings } = useStore();

  const sheet = activeProject?.sheets[0];
  const settings = activeProject?.settings;

  const [localSheet, setLocalSheet] = useState<Sheet | null>(sheet ?? null);
  const [showPresets, setShowPresets] = useState(false);

  useEffect(() => {
    if (sheet) setLocalSheet(sheet);
  }, [sheet?.id]);

  if (!activeProject || !localSheet || !settings) {
    return (
      <div className="p-6 flex flex-col items-center justify-center gap-3 text-center">
        <div className="w-10 h-10 rounded-2xl bg-background flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="3" y="3" width="14" height="14" rx="2" stroke="#AEAEB2" strokeWidth="1.5"/>
          </svg>
        </div>
        <p className="text-sm text-text-tertiary">No project selected</p>
      </div>
    );
  }

  const handleSheetChange = (field: keyof Sheet, value: string | number) => {
    const updated = { ...localSheet, [field]: value };
    setLocalSheet(updated);
    if (activeProject) {
      updateSheet(activeProject.id, updated);
    }
  };

  const handlePresetSelect = (presetId: string) => {
    const preset = SHEET_PRESETS.find((p) => p.id === presetId);
    if (!preset || !activeProject) return;

    const updated: Sheet = {
      ...localSheet,
      name: preset.name,
      material: preset.material,
      width: preset.width,
      height: preset.height,
      thickness: preset.thickness,
    };

    setLocalSheet(updated);
    updateSheet(activeProject.id, updated);
    updateSettings(activeProject.id, {
      unit: preset.unit,
      bladeKerf: DEFAULT_KERF_BY_MATERIAL[preset.material] ?? 3.2,
    });
    setShowPresets(false);
  };

  const handleMaterialChange = (material: MaterialType) => {
    handleSheetChange('material', material);
    if (activeProject) {
      updateSettings(activeProject.id, {
        bladeKerf: DEFAULT_KERF_BY_MATERIAL[material] ?? 3.2,
      });
    }
  };

  return (
    <div className="p-5 space-y-6">
      {/* Presets */}
      <div>
        <div className="section-label mb-3">Quick Presets</div>
        <button
          onClick={() => setShowPresets(!showPresets)}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-border hover:border-text-tertiary bg-background transition-all text-sm"
        >
          <span className="text-text-secondary">Select preset size…</span>
          <ChevronDown className={cn('w-4 h-4 text-text-tertiary transition-transform', showPresets && 'rotate-180')} />
        </button>

        {showPresets && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-1 border border-border rounded-xl overflow-hidden bg-surface shadow-card"
          >
            {SHEET_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetSelect(preset.id)}
                className="w-full text-left px-3 py-2.5 hover:bg-background transition-colors border-b border-border/50 last:border-0"
              >
                <div className="text-sm font-medium text-text-primary">{preset.name}</div>
                <div className="text-xs text-text-tertiary mt-0.5">
                  {preset.width} × {preset.height} {preset.unit} · {preset.thickness}mm
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </div>

      {/* Material */}
      <div>
        <div className="section-label mb-3">Material</div>
        <div className="grid grid-cols-2 gap-1.5">
          {MATERIALS.map((mat) => (
            <button
              key={mat}
              onClick={() => handleMaterialChange(mat)}
              className={cn(
                'px-3 py-2 rounded-lg text-xs font-medium transition-all',
                localSheet.material === mat
                  ? 'bg-black text-white'
                  : 'bg-background text-text-secondary hover:bg-border/50'
              )}
            >
              {MATERIAL_LABELS[mat]}
            </button>
          ))}
        </div>
      </div>

      {/* Sheet name */}
      <div>
        <div className="section-label mb-2">Sheet Name</div>
        <input
          type="text"
          value={localSheet.name}
          onChange={(e) => handleSheetChange('name', e.target.value)}
          placeholder="e.g. 18mm Birch Ply"
          className="input-ghost text-sm"
        />
      </div>

      {/* Dimensions */}
      <div>
        <div className="section-label mb-3">Dimensions</div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-text-tertiary block mb-1.5">Width</span>
              <input
                type="number"
                value={localSheet.width}
                onChange={(e) => handleSheetChange('width', parseFloat(e.target.value) || 0)}
                className="input-borderless text-sm font-mono"
                min={1}
              />
            </label>
            <label className="block">
              <span className="text-xs text-text-tertiary block mb-1.5">Height</span>
              <input
                type="number"
                value={localSheet.height}
                onChange={(e) => handleSheetChange('height', parseFloat(e.target.value) || 0)}
                className="input-borderless text-sm font-mono"
                min={1}
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs text-text-tertiary block mb-1.5">Thickness</span>
            <input
              type="number"
              value={localSheet.thickness}
              onChange={(e) => handleSheetChange('thickness', parseFloat(e.target.value) || 0)}
              className="input-borderless text-sm font-mono"
              step={0.5}
            />
          </label>

          <label className="block">
            <span className="text-xs text-text-tertiary block mb-1.5">Quantity</span>
            <input
              type="number"
              value={localSheet.quantity}
              onChange={(e) => handleSheetChange('quantity', parseInt(e.target.value) || 1)}
              className="input-borderless text-sm font-mono"
              min={1}
            />
          </label>
        </div>
      </div>

      {/* Unit System */}
      <div>
        <div className="section-label mb-3">Unit System</div>
        <div className="space-y-1">
          {UNITS.map((unit) => (
            <button
              key={unit}
              onClick={() => updateSettings(activeProject.id, { unit })}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all',
                settings.unit === unit
                  ? 'bg-black/5 text-text-primary font-medium'
                  : 'text-text-secondary hover:bg-background'
              )}
            >
              <span>{UNIT_LABELS[unit]}</span>
              {settings.unit === unit && (
                <div className="w-1.5 h-1.5 rounded-full bg-black" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Blade Kerf */}
      <div>
        <div className="section-label mb-3">Blade Kerf</div>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <input
              type="range"
              min={0}
              max={10}
              step={0.1}
              value={settings.bladeKerf}
              onChange={(e) => updateSettings(activeProject.id, { bladeKerf: parseFloat(e.target.value) })}
              className="w-full accent-black h-1 bg-border rounded-full"
            />
          </div>
          <div className="flex items-center gap-1 w-20">
            <input
              type="number"
              value={settings.bladeKerf}
              onChange={(e) => updateSettings(activeProject.id, { bladeKerf: parseFloat(e.target.value) || 0 })}
              step={0.1}
              min={0}
              max={20}
              className="w-14 text-right font-mono text-sm bg-transparent border-b border-border outline-none"
            />
            <span className="text-xs text-text-tertiary">mm</span>
          </div>
        </div>
        <p className="text-xs text-text-tertiary mt-2">
          Material lost per cut. Typically 2.5–4mm for saw blade.
        </p>
      </div>

      {/* Allow rotation */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-text-primary">Allow Rotation</div>
          <div className="text-xs text-text-tertiary mt-0.5">Rotate pieces 90° for better fit</div>
        </div>
        <button
          onClick={() => updateSettings(activeProject.id, { allowRotation: !settings.allowRotation })}
          className={cn(
            'relative w-10 h-6 rounded-full transition-all duration-200',
            settings.allowRotation ? 'bg-black' : 'bg-border'
          )}
        >
          <motion.div
            animate={{ x: settings.allowRotation ? 16 : 2 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-soft"
          />
        </button>
      </div>
    </div>
  );
}
