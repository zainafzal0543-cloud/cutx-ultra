'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, FileText, Image, Table, Code, FileJson,
  ChevronDown, Check, Loader2
} from 'lucide-react';
import { useStore, selectActiveProject, selectOptimizationResult } from '@/store';
import {
  exportToCSV, exportToDXF, exportSheetToPNG,
  exportOptimizationToCSV, triggerDownload
} from '@/lib/export/engine';
import type { ExportFormat } from '@/types/phase2';
import { cn } from '@/lib/utils';

const FORMATS: { id: ExportFormat; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'csv',  label: 'Cutting List CSV', icon: <Table className="w-4 h-4" />,    desc: 'Parts list for Excel / Google Sheets' },
  { id: 'png',  label: 'Layout PNG',       icon: <Image className="w-4 h-4" />,    desc: 'High-res image of each sheet layout' },
  { id: 'dxf',  label: 'DXF Vector',       icon: <Code className="w-4 h-4" />,     desc: 'CNC-ready vector geometry' },
  { id: 'json', label: 'Project JSON',     icon: <FileJson className="w-4 h-4" />, desc: 'Full project backup / import' },
];

export function ExportPanel() {
  const activeProject = useStore(selectActiveProject);
  const result = useStore(selectOptimizationResult);
  const { canvasState } = useStore();

  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [done, setDone] = useState<ExportFormat | null>(null);
  const [includeMetrics, setIncludeMetrics] = useState(true);
  const [includeLabels, setIncludeLabels] = useState(true);
  const [includeDims, setIncludeDims] = useState(true);
  const [sheetsScope, setSheetsScope] = useState<'all' | 'current'>('all');

  const safeName = (activeProject?.name ?? 'project').replace(/\s+/g, '-').toLowerCase();

  const handleExport = async (format: ExportFormat) => {
    if (!activeProject) return;
    setExporting(format);

    try {
      switch (format) {
        case 'csv': {
          const csv = result
            ? exportOptimizationToCSV(result, activeProject)
            : exportToCSV(activeProject);
          triggerDownload(csv, `${safeName}-cutting-list.csv`, 'text/csv');
          break;
        }
        case 'dxf': {
          if (!result || !activeProject.sheets[0]) break;
          const indices = sheetsScope === 'current'
            ? [canvasState.activeSheetIndex]
            : 'all';
          const dxf = exportToDXF(result, activeProject.sheets[0], activeProject.settings, indices);
          triggerDownload(dxf, `${safeName}-layout.dxf`, 'application/dxf');
          break;
        }
        case 'png': {
          if (!result || !activeProject.sheets[0]) break;
          const indices = sheetsScope === 'current'
            ? [canvasState.activeSheetIndex]
            : result.sheets.map((_, i) => i);

          for (const idx of indices) {
            const blob = await exportSheetToPNG(
              result, activeProject.sheets[0], activeProject.settings, idx,
              { includeLabels, includeDimensions: includeDims }
            );
            triggerDownload(blob, `${safeName}-sheet-${idx + 1}.png`, 'image/png');
            await new Promise(r => setTimeout(r, 200));
          }
          break;
        }
        case 'json': {
          const json = JSON.stringify(activeProject, null, 2);
          triggerDownload(json, `${safeName}.cutx.json`, 'application/json');
          break;
        }
      }

      setDone(format);
      setTimeout(() => setDone(null), 2500);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(null);
    }
  };

  const hasResult = !!result;

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Download className="w-4 h-4 text-text-tertiary" />
        <span className="text-sm font-semibold text-text-primary">Export</span>
      </div>

      {/* Options */}
      <div className="space-y-2">
        <div className="section-label mb-2">Options</div>

        {/* Scope */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(['all', 'current'] as const).map(scope => (
            <button
              key={scope}
              onClick={() => setSheetsScope(scope)}
              className={cn(
                'flex-1 py-1.5 text-xs font-medium transition-all',
                sheetsScope === scope
                  ? 'bg-black text-white'
                  : 'text-text-secondary hover:bg-background'
              )}
            >
              {scope === 'all' ? 'All Sheets' : 'Current Sheet'}
            </button>
          ))}
        </div>

        {/* Toggles */}
        {[
          { label: 'Include piece labels', value: includeLabels, set: setIncludeLabels },
          { label: 'Include dimensions',   value: includeDims,   set: setIncludeDims },
          { label: 'Include metrics',      value: includeMetrics, set: setIncludeMetrics },
        ].map(opt => (
          <div key={opt.label} className="flex items-center justify-between py-1">
            <span className="text-xs text-text-secondary">{opt.label}</span>
            <button
              onClick={() => opt.set(!opt.value)}
              className={cn(
                'relative w-8 h-4 rounded-full transition-all duration-200',
                opt.value ? 'bg-black' : 'bg-border'
              )}
            >
              <motion.div
                animate={{ x: opt.value ? 16 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-soft"
              />
            </button>
          </div>
        ))}
      </div>

      {/* Format buttons */}
      <div className="space-y-2">
        <div className="section-label mb-2">Format</div>
        {FORMATS.map(fmt => {
          const isExporting = exporting === fmt.id;
          const isDone = done === fmt.id;
          const needsResult = ['png', 'dxf'].includes(fmt.id);
          const disabled = (needsResult && !hasResult) || !!exporting;

          return (
            <button
              key={fmt.id}
              onClick={() => handleExport(fmt.id)}
              disabled={disabled}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left',
                isDone
                  ? 'border-success/30 bg-success/5'
                  : disabled
                  ? 'border-border opacity-40 cursor-not-allowed'
                  : 'border-border hover:border-text-tertiary/50 hover:bg-background active:scale-99'
              )}
            >
              <div className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                isDone ? 'bg-success/10 text-success' : 'bg-background text-text-tertiary'
              )}>
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isDone ? (
                  <Check className="w-4 h-4" />
                ) : (
                  fmt.icon
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-text-primary">{fmt.label}</div>
                <div className="text-[11px] text-text-tertiary">{fmt.desc}</div>
              </div>
              {!disabled && !isExporting && (
                <Download className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {!hasResult && (
        <p className="text-xs text-text-tertiary text-center">
          Run optimization first to enable PNG & DXF export
        </p>
      )}
    </div>
  );
}
