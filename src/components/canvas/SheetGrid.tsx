'use client';

import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Grid, LayoutList } from 'lucide-react';
import type { OptimizationResult, Sheet, ProjectSettings } from '@/types';
import { toMM } from '@/lib/utils/units';
import { cn } from '@/lib/utils';

const PIECE_COLORS = [
  '#DBEAFE','#D1FAE5','#FEF3C7','#FCE7F3','#EDE9FE',
  '#FFEDD5','#ECFDF5','#FFF7ED','#F0F9FF','#F5F3FF',
];

interface SheetGridProps {
  result: OptimizationResult;
  sheet: Sheet;
  settings: ProjectSettings;
  activeIndex: number;
  onSelectSheet: (idx: number) => void;
}

export const SheetGrid = memo(function SheetGrid({
  result, sheet, settings, activeIndex, onSelectSheet,
}: SheetGridProps) {
  const sheetW = toMM(sheet.width, settings.unit);
  const sheetH = toMM(sheet.height, settings.unit);

  return (
    <div className="p-4">
      <div className="section-label mb-3">
        {result.totalSheets} Sheet{result.totalSheets !== 1 ? 's' : ''} — {result.overallEfficiency.toFixed(1)}% avg efficiency
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {result.sheets.map((optSheet, idx) => (
          <SheetThumbnailCard
            key={idx}
            sheetIndex={idx}
            optSheet={optSheet}
            sheetW={sheetW}
            sheetH={sheetH}
            isActive={idx === activeIndex}
            onClick={() => onSelectSheet(idx)}
          />
        ))}
      </div>
    </div>
  );
});

// ─── Thumbnail Card ───────────────────────────

interface ThumbProps {
  sheetIndex: number;
  optSheet: OptimizationResult['sheets'][0];
  sheetW: number;
  sheetH: number;
  isActive: boolean;
  onClick: () => void;
}

const SheetThumbnailCard = memo(function SheetThumbnailCard({
  sheetIndex, optSheet, sheetW, sheetH, isActive, onClick,
}: ThumbProps) {
  const THUMB_W = 120;
  const THUMB_H = 80;
  const scaleX = THUMB_W / sheetW;
  const scaleY = THUMB_H / sheetH;
  const scale = Math.min(scaleX, scaleY);
  const sw = sheetW * scale;
  const sh = sheetH * scale;

  const colorMap = useMemo(() => {
    const m = new Map<string, number>();
    optSheet.pieces.forEach(p => { if (!m.has(p.itemId)) m.set(p.itemId, m.size); });
    return m;
  }, [optSheet.pieces]);

  const effColor = optSheet.efficiency > 80 ? '#34C759'
    : optSheet.efficiency > 60 ? '#FF9F0A' : '#FF3B30';

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-2 p-3 rounded-xl border transition-all',
        isActive
          ? 'border-black bg-black/5 shadow-soft'
          : 'border-border hover:border-text-tertiary/50 bg-surface'
      )}
    >
      {/* SVG thumbnail */}
      <div
        className="relative overflow-hidden rounded"
        style={{ width: THUMB_W, height: THUMB_H }}
      >
        <svg
          width={THUMB_W}
          height={THUMB_H}
          viewBox={`0 0 ${THUMB_W} ${THUMB_H}`}
          className="w-full h-full"
        >
          {/* Sheet bg */}
          <rect
            x={(THUMB_W - sw) / 2}
            y={(THUMB_H - sh) / 2}
            width={sw}
            height={sh}
            fill="#FAFAFA"
            stroke="#E5E5EA"
            strokeWidth={0.5}
            rx={1}
          />
          {/* Pieces */}
          {optSheet.pieces.map(piece => {
            const ci = (colorMap.get(piece.itemId) ?? 0) % PIECE_COLORS.length;
            const ox = (THUMB_W - sw) / 2;
            const oy = (THUMB_H - sh) / 2;
            return (
              <rect
                key={piece.id}
                x={ox + piece.x * scale}
                y={oy + piece.y * scale}
                width={piece.width * scale}
                height={piece.height * scale}
                fill={PIECE_COLORS[ci]}
                stroke="#ffffff"
                strokeWidth={0.3}
                rx={0.5}
              />
            );
          })}
        </svg>
      </div>

      {/* Stats */}
      <div className="w-full">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-text-primary">Sheet {sheetIndex + 1}</span>
          <span className="text-xs font-bold" style={{ color: effColor }}>
            {optSheet.efficiency.toFixed(0)}%
          </span>
        </div>
        <div className="text-[10px] text-text-tertiary mt-0.5">
          {optSheet.pieces.length} piece{optSheet.pieces.length !== 1 ? 's' : ''}
        </div>
        {/* Efficiency bar */}
        <div className="h-1 bg-border rounded-full mt-1.5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${optSheet.efficiency}%`, background: effColor }}
          />
        </div>
      </div>
    </motion.button>
  );
});
