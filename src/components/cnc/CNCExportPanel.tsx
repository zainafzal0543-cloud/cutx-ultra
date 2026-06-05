'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Download, ChevronDown, Check, Loader2 } from 'lucide-react';
import { useStore, selectActiveProject, selectOptimizationResult } from '@/store';
import { exportAdvancedDXF, generateGCode, CNC_PROFILES } from '@/lib/cnc/export';
import type { CNCProfile, CNCExportOptions } from '@/types/phase3';
import { triggerDownload } from '@/lib/export/engine';
import { cn } from '@/lib/utils';

export function CNCExportPanel() {
  const activeProject = useStore(selectActiveProject);
  const result = useStore(selectOptimizationResult);
  const { canvasState } = useStore();

  const [selectedProfile, setSelectedProfile] = useState<CNCProfile>(CNC_PROFILES[0]);
  const [cutOrder, setCutOrder] = useState<CNCExportOptions['cutOrder']>('inside_out');
  const [includeLeads, setIncludeLeads] = useState(true);
  const [includeTabs, setIncludeTabs] = useState(true);
  const [generateToolpath, setGenerateToolpath] = useState(true);
  const [exportScope, setExportScope] = useState<'all' | 'current'>('all');
  const [exporting, setExporting] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const canExport = !!result && !!activeProject?.sheets[0];
  const safeName = (activeProject?.name ?? 'project').replace(/\s+/g, '-').toLowerCase();

  const getOptions = (): Partial<CNCExportOptions> => ({
    profile: selectedProfile,
    cutOrder,
    includeLeads,
    includeTabs,
    generateToolpath,
  });

  const handleDXF = async () => {
    if (!canExport) return;
    setExporting('dxf');
    try {
      const dxf = exportAdvancedDXF(result!, activeProject!.sheets[0], activeProject!.settings, getOptions());
      triggerDownload(dxf, `${safeName}-cnc.dxf`, 'application/dxf');
      setDone('dxf'); setTimeout(() => setDone(null), 2500);
    } finally { setExporting(null); }
  };

  const handleGCode = async () => {
    if (!canExport) return;
    setExporting('gcode');
    try {
      const sheetIdx = exportScope === 'current' ? canvasState.activeSheetIndex : 0;
      const indices = exportScope === 'current'
        ? [sheetIdx]
        : result!.sheets.map((_, i) => i);

      for (const idx of indices) {
        const gcode = generateGCode(result!, activeProject!.sheets[0], activeProject!.settings, selectedProfile, idx);
        triggerDownload(gcode, `${safeName}-sheet${idx + 1}.nc`, 'text/plain');
        await new Promise(r => setTimeout(r, 150));
      }
      setDone('gcode'); setTimeout(() => setDone(null), 2500);
    } finally { setExporting(null); }
  };

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center gap-2">
        <Cpu className="w-4 h-4 text-text-tertiary" />
        <span className="text-sm font-semibold text-text-primary">CNC Export</span>
      </div>

      {/* Machine Profile */}
      <div>
        <div className="section-label mb-3">Machine Profile</div>
        <div className="space-y-1.5">
          {CNC_PROFILES.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedProfile(p)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all',
                selectedProfile.id === p.id
                  ? 'border-black bg-black/5'
                  : 'border-border hover:border-text-tertiary/50'
              )}
            >
              <div className={cn(
                'w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0',
                selectedProfile.id === p.id ? 'bg-black text-white' : 'bg-background text-text-tertiary'
              )}>
                {p.machineType[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-text-primary truncate">{p.name}</div>
                <div className="text-[10px] text-text-tertiary">
                  ⌀{p.toolDiameter}mm · {p.feedRate}mm/min
                </div>
              </div>
              {selectedProfile.id === p.id && <Check className="w-3.5 h-3.5 text-black shrink-0" />}
            </button>
          ))}
        </div>
      </div>

      {/* Tool parameters display */}
      <div className="p-3 rounded-xl bg-background border border-border space-y-2">
        <div className="section-label">Active Profile Parameters</div>
        {[
          ['Tool Diameter', `${selectedProfile.toolDiameter}mm`],
          ['Kerf', `${selectedProfile.kerf}mm`],
          ['Feed Rate', `${selectedProfile.feedRate}mm/min`],
          ['Pass Depth', `${selectedProfile.passDepth}mm`],
          ['Lead In/Out', `${selectedProfile.leadIn}mm`],
        ].map(([label, value]) => (
          <div key={label as string} className="flex justify-between">
            <span className="text-xs text-text-tertiary">{label}</span>
            <span className="text-xs font-mono text-text-primary">{value}</span>
          </div>
        ))}
      </div>

      {/* Cut options */}
      <div className="space-y-3">
        <div className="section-label">Cut Options</div>

        <div>
          <div className="text-xs text-text-tertiary mb-2">Cut Order</div>
          <div className="grid grid-cols-2 gap-1.5">
            {([
              ['inside_out',   'Inside → Out'],
              ['outside_in',   'Outside → In'],
              ['left_right',   'Left → Right'],
              ['top_bottom',   'Top → Bottom'],
            ] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setCutOrder(val)}
                className={cn(
                  'py-1.5 rounded-lg text-xs font-medium transition-all',
                  cutOrder === val ? 'bg-black text-white' : 'bg-background border border-border text-text-secondary'
                )}
              >{label}</button>
            ))}
          </div>
        </div>

        {[
          { label: 'Lead-in / Lead-out', value: includeLeads, set: setIncludeLeads },
          { label: 'Holding tabs', value: includeTabs, set: setIncludeTabs },
          { label: 'Toolpath numbers', value: generateToolpath, set: setGenerateToolpath },
        ].map(opt => (
          <div key={opt.label} className="flex items-center justify-between">
            <span className="text-xs text-text-secondary">{opt.label}</span>
            <button
              onClick={() => opt.set(!opt.value)}
              className={cn('relative w-8 h-4 rounded-full transition-all', opt.value ? 'bg-black' : 'bg-border')}
            >
              <motion.div
                animate={{ x: opt.value ? 16 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-soft"
              />
            </button>
          </div>
        ))}

        {/* Scope */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(['all', 'current'] as const).map(scope => (
            <button
              key={scope}
              onClick={() => setExportScope(scope)}
              className={cn(
                'flex-1 py-1.5 text-xs font-medium transition-all',
                exportScope === scope ? 'bg-black text-white' : 'text-text-secondary hover:bg-background'
              )}
            >{scope === 'all' ? 'All Sheets' : 'Current Sheet'}</button>
          ))}
        </div>
      </div>

      {/* Export buttons */}
      <div className="space-y-2">
        {[
          { id: 'dxf', label: 'Export DXF (Layered)', handler: handleDXF, desc: 'CNC-ready with cut paths, tabs, leads' },
          { id: 'gcode', label: 'Export G-Code (.nc)', handler: handleGCode, desc: 'Ready for router/laser controller' },
        ].map(btn => (
          <button
            key={btn.id}
            onClick={btn.handler}
            disabled={!canExport || !!exporting}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left',
              done === btn.id ? 'border-success/30 bg-success/5' : 'border-border hover:border-text-tertiary/50 disabled:opacity-40 disabled:cursor-not-allowed'
            )}
          >
            <div className={cn(
              'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
              done === btn.id ? 'bg-success/10 text-success' : 'bg-background text-text-tertiary'
            )}>
              {exporting === btn.id ? <Loader2 className="w-4 h-4 animate-spin" /> :
               done === btn.id ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
            </div>
            <div>
              <div className="text-xs font-semibold text-text-primary">{btn.label}</div>
              <div className="text-[10px] text-text-tertiary">{btn.desc}</div>
            </div>
          </button>
        ))}
      </div>

      {!canExport && (
        <p className="text-xs text-text-tertiary text-center">Run optimization first to enable CNC export</p>
      )}
    </div>
  );
}
