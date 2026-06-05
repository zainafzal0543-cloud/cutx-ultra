'use client';

import { motion } from 'framer-motion';
import { BarChart2, Layers, Target, Scissors, AlertCircle, Clock } from 'lucide-react';
import { useStore, selectActiveProject, selectOptimizationResult, selectActiveSheet } from '@/store';
import { formatArea, toMM } from '@/lib/utils/units';
import { formatPercent } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function MetricsPanel() {
  const activeProject = useStore(selectActiveProject);
  const result = useStore(selectOptimizationResult);
  const sheet = useStore(selectActiveSheet);

  const settings = activeProject?.settings;
  const unit = settings?.unit ?? 'mm';

  const sheetAreaMM2 = sheet
    ? toMM(sheet.width, unit) * toMM(sheet.height, unit)
    : 0;

  const totalSheets = result?.totalSheets ?? 0;
  const efficiency = result?.overallEfficiency ?? 0;
  const usedArea = result?.totalUsedArea ?? 0;
  const wasteArea = result?.totalWasteArea ?? 0;
  const totalArea = sheetAreaMM2 * totalSheets;
  const totalPieces = result?.sheets.reduce((s, sh) => s + sh.pieces.length, 0) ?? 0;
  const unplaced = result?.unplacedItems.length ?? 0;
  const processingMs = result?.processingTimeMs ?? 0;

  const hasResult = !!result;

  return (
    <div className="p-5 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-text-tertiary" />
        <span className="text-sm font-semibold text-text-primary">Metrics</span>
        {hasResult && (
          <span className="ml-auto text-[10px] text-text-tertiary font-mono flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {processingMs.toFixed(0)}ms
          </span>
        )}
      </div>

      {/* Efficiency ring */}
      <div className="flex flex-col items-center py-4">
        <div className="relative w-24 h-24">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            {/* Background circle */}
            <circle
              cx="50" cy="50" r="42"
              fill="none"
              stroke="#E5E5EA"
              strokeWidth="8"
            />
            {/* Progress circle */}
            <motion.circle
              cx="50" cy="50" r="42"
              fill="none"
              stroke={efficiency > 80 ? '#34C759' : efficiency > 60 ? '#FF9F0A' : '#FF3B30'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 42}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - efficiency / 100) }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-text-primary tabular-nums">
              {hasResult ? Math.round(efficiency) : '—'}
            </span>
            <span className="text-[10px] text-text-tertiary -mt-0.5">% used</span>
          </div>
        </div>
        <p className="text-xs text-text-tertiary mt-3">
          {!hasResult
            ? 'Run optimization to see metrics'
            : efficiency > 85
            ? 'Excellent efficiency'
            : efficiency > 70
            ? 'Good efficiency'
            : 'Consider adjusting layout'}
        </p>
      </div>

      {/* Stat cards */}
      <div className="space-y-3">
        <MetricRow
          icon={<Layers className="w-3.5 h-3.5" />}
          label="Total Sheets"
          value={hasResult ? totalSheets.toString() : '—'}
          sub={hasResult ? `${sheet?.material ?? ''} · ${sheet?.width}×${sheet?.height}` : 'No result yet'}
        />

        <MetricRow
          icon={<Target className="w-3.5 h-3.5" />}
          label="Used Area"
          value={hasResult ? formatArea(usedArea, unit) : '—'}
          sub={hasResult ? `of ${formatArea(totalArea, unit)} total` : ''}
          bar={hasResult ? efficiency / 100 : 0}
          barColor="bg-success"
        />

        <MetricRow
          icon={<Scissors className="w-3.5 h-3.5" />}
          label="Waste Area"
          value={hasResult ? formatArea(wasteArea, unit) : '—'}
          sub={hasResult ? `${formatPercent(100 - efficiency)} wasted` : ''}
          bar={hasResult ? (100 - efficiency) / 100 : 0}
          barColor="bg-warning"
        />

        <MetricRow
          icon={<BarChart2 className="w-3.5 h-3.5" />}
          label="Parts Placed"
          value={hasResult ? totalPieces.toString() : '—'}
          sub={hasResult ? `${activeProject?.cuttingList.reduce((s, i) => s + i.quantity, 0) ?? 0} total requested` : ''}
        />
      </div>

      {/* Unplaced warning */}
      {hasResult && unplaced > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2.5 p-3 rounded-xl bg-warning/10 border border-warning/20"
        >
          <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-warning">
              {unplaced} part{unplaced !== 1 ? 's' : ''} unplaced
            </p>
            <p className="text-xs text-text-secondary mt-0.5">
              Increase sheet quantity or reduce part sizes.
            </p>
          </div>
        </motion.div>
      )}

      {/* Per-sheet breakdown */}
      {hasResult && result.sheets.length > 1 && (
        <div>
          <div className="section-label mb-3">Per-Sheet Breakdown</div>
          <div className="space-y-2">
            {result.sheets.map((s, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span className="text-xs font-mono text-text-tertiary w-14 shrink-0">
                  Sheet {i + 1}
                </span>
                <div className="flex-1 metric-bar">
                  <motion.div
                    className="metric-bar-fill bg-success"
                    initial={{ width: 0 }}
                    animate={{ width: `${s.efficiency}%` }}
                    transition={{ duration: 0.8, delay: i * 0.05 }}
                  />
                </div>
                <span className="text-xs font-mono text-text-secondary w-10 text-right">
                  {s.efficiency.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shimmer placeholder when no result */}
      {!hasResult && (
        <div className="space-y-3">
          {[80, 60, 70, 50].map((w, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg shimmer shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className={`h-3 rounded shimmer`} style={{ width: `${w}%` }} />
                <div className="h-2 rounded shimmer w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Metric Row ───────────────────────────────

interface MetricRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  bar?: number;
  barColor?: string;
}

function MetricRow({ icon, label, value, sub, bar, barColor = 'bg-accent-blue' }: MetricRowProps) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-background">
      <div className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center text-text-tertiary shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs text-text-tertiary">{label}</span>
          <span className="text-sm font-semibold text-text-primary tabular-nums shrink-0">{value}</span>
        </div>
        {sub && <p className="text-[11px] text-text-tertiary mt-0.5 truncate">{sub}</p>}
        {bar !== undefined && bar > 0 && (
          <div className="metric-bar mt-2">
            <motion.div
              className={cn('metric-bar-fill', barColor)}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(bar * 100, 100)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
