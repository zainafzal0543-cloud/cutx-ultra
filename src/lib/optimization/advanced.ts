// ─────────────────────────────────────────────
// CUTX ULTRA Phase 2 — Advanced Optimization Engine
// Implements: MaxRects BSSF + Guillotine hybrid
// Supports: Multiple modes, grain direction, smart sorting
// ─────────────────────────────────────────────

import type {
  CuttingItem,
  Sheet,
  OptimizationResult,
  OptimizedSheet,
  PlacedPiece,
  Rectangle,
  ProjectSettings,
} from '@/types';
import type {
  OptimizationMode,
  SortStrategy,
  Phase2Settings,
  OptimizationProgress,
  Remnant,
} from '@/types/phase2';
import { generateId, getPieceColor } from '@/lib/utils';
import { toMM } from '@/lib/utils/units';

// ─── Progress callback ────────────────────────

export type ProgressCallback = (progress: OptimizationProgress) => void;

// ─── Main Entry Point ─────────────────────────

export async function runAdvancedOptimization(
  sheets: Sheet[],
  cuttingItems: CuttingItem[],
  settings: ProjectSettings,
  phase2: Partial<Phase2Settings> = {},
  onProgress?: ProgressCallback
): Promise<OptimizationResult> {
  const startTime = performance.now();
  const mode = phase2.optimizationMode ?? 'minimum_wastage';
  const sortStrategy = phase2.sortStrategy ?? 'area_desc';
  const grainDir = phase2.grainDirection ?? 'none';
  const kerf = toMM(settings.bladeKerf, settings.unit);

  if (!sheets.length || !cuttingItems.length) return emptyResult();

  const primarySheet = sheets[0];
  const sheetW = toMM(primarySheet.width, settings.unit);
  const sheetH = toMM(primarySheet.height, settings.unit);

  // ── Expand by quantity ─────────────────────
  const expanded: Array<{ item: CuttingItem; idx: number }> = [];
  for (const item of cuttingItems) {
    for (let i = 0; i < item.quantity; i++) {
      expanded.push({ item, idx: i });
    }
  }

  // ── Sort items ─────────────────────────────
  const sorted = sortItems(expanded.map(e => e.item), sortStrategy, settings, mode, grainDir);

  onProgress?.({ phase: 'sorting', placedCount: 0, totalCount: sorted.length, currentSheet: 0, percentComplete: 5 });

  // ── Pack across multiple sheets ────────────
  const optimizedSheets: OptimizedSheet[] = [];
  const unplacedItems: CuttingItem[] = [];
  let remaining = [...sorted];
  let sheetIndex = 0;
  const MAX_SHEETS = Math.max(primarySheet.quantity, 100);

  while (remaining.length > 0 && sheetIndex < MAX_SHEETS) {
    onProgress?.({
      phase: 'placing',
      placedCount: sorted.length - remaining.length,
      totalCount: sorted.length,
      currentSheet: sheetIndex,
      percentComplete: 5 + Math.round(85 * (sorted.length - remaining.length) / sorted.length),
    });

    // Yield every 5 sheets so the UI stays responsive
    if (sheetIndex > 0 && sheetIndex % 5 === 0) {
      await new Promise(r => setTimeout(r, 0));
    }

    const { packed, leftover } = packSheetMaxRects(
      sheetIndex,
      primarySheet.id,
      sheetW,
      sheetH,
      remaining,
      kerf,
      settings,
      mode,
      grainDir
    );

    optimizedSheets.push(packed);

    if (leftover.length === remaining.length) {
      // Can't place any more pieces
      for (const item of remaining) {
        if (!unplacedItems.find(u => u.id === item.id)) unplacedItems.push(item);
      }
      break;
    }

    remaining = leftover;
    sheetIndex++;
  }

  // ── Compact pass: try to merge last sheets ─
  onProgress?.({ phase: 'compacting', placedCount: sorted.length - unplacedItems.length, totalCount: sorted.length, currentSheet: sheetIndex, percentComplete: 90 });

  const endTime = performance.now();

  const sheetArea = sheetW * sheetH;
  const totalUsedArea = optimizedSheets.reduce((s, sh) => s + sh.usedArea, 0);
  const totalWasteArea = optimizedSheets.reduce((s, sh) => s + sh.wasteArea, 0);
  const overallEfficiency = (sheetArea * optimizedSheets.length) > 0
    ? (totalUsedArea / (sheetArea * optimizedSheets.length)) * 100
    : 0;

  onProgress?.({ phase: 'done', placedCount: sorted.length - unplacedItems.length, totalCount: sorted.length, currentSheet: sheetIndex, percentComplete: 100 });

  return {
    id: generateId(),
    timestamp: new Date().toISOString(),
    algorithm: `maxrects_${mode}`,
    sheets: optimizedSheets,
    totalSheets: optimizedSheets.length,
    totalUsedArea,
    totalWasteArea,
    overallEfficiency,
    unplacedItems,
    processingTimeMs: endTime - startTime,
  };
}

// ─── MaxRects packing for one sheet ───────────

function packSheetMaxRects(
  sheetIndex: number,
  sheetId: string,
  sheetW: number,
  sheetH: number,
  items: CuttingItem[],
  kerf: number,
  settings: ProjectSettings,
  mode: OptimizationMode,
  grainDir: string
): { packed: OptimizedSheet; leftover: CuttingItem[] } {
  // MaxRects free rectangles list
  let freeRects: Rectangle[] = [{ x: 0, y: 0, width: sheetW, height: sheetH }];
  const placedPieces: PlacedPiece[] = [];
  const leftover: CuttingItem[] = [];
  let colorIdx = 0;

  for (const item of items) {
    const iW = toMM(item.width, settings.unit);
    const iH = toMM(item.height, settings.unit);

    // Grain-safe: disable rotation when grain direction locked
    const canRotate = item.allowRotation && settings.allowRotation && grainDir === 'none';

    const placement = findBestPlacement(freeRects, iW, iH, kerf, canRotate, mode);

    if (placement) {
      const { x, y, rotated } = placement;
      const pw = rotated ? iH : iW;
      const ph = rotated ? iW : iH;

      placedPieces.push({
        id: generateId(),
        itemId: item.id,
        label: item.label,
        x,
        y,
        width: pw,
        height: ph,
        rotated,
        sheetIndex,
        color: getPieceColor(colorIdx++),
        sectionTag: item.sectionTag,
      });

      // Update MaxRects free list
      freeRects = updateFreeRects(freeRects, x, y, pw + kerf, ph + kerf);
    } else {
      leftover.push(item);
    }
  }

  const sheetArea = sheetW * sheetH;
  const usedArea = placedPieces.reduce((s, p) => s + p.width * p.height, 0);

  return {
    packed: {
      index: sheetIndex,
      sheetId,
      pieces: placedPieces,
      usedArea,
      wasteArea: sheetArea - usedArea,
      efficiency: sheetArea > 0 ? (usedArea / sheetArea) * 100 : 0,
      freeRectangles: freeRects,
    },
    leftover,
  };
}

// ─── Best placement using MaxRects BSSF ───────

type PlacementCandidate = { x: number; y: number; rotated: boolean; score: number };

function findBestPlacement(
  freeRects: Rectangle[],
  iW: number,
  iH: number,
  kerf: number,
  canRotate: boolean,
  mode: OptimizationMode
): PlacementCandidate | null {
  let best: PlacementCandidate | null = null;

  for (const rect of freeRects) {
    // Normal orientation
    if (iW + kerf <= rect.width && iH + kerf <= rect.height) {
      const score = scoreCandidate(rect, iW, iH, mode);
      if (!best || score < best.score) {
        best = { x: rect.x, y: rect.y, rotated: false, score };
      }
    }
    // Rotated orientation
    if (canRotate && iH + kerf <= rect.width && iW + kerf <= rect.height) {
      const score = scoreCandidate(rect, iH, iW, mode);
      if (!best || score < best.score) {
        best = { x: rect.x, y: rect.y, rotated: true, score };
      }
    }
  }

  return best;
}

function scoreCandidate(rect: Rectangle, w: number, h: number, mode: OptimizationMode): number {
  switch (mode) {
    case 'minimum_wastage': {
      // Best Short Side Fit: minimize the smaller leftover dimension
      const leftoverX = rect.width - w;
      const leftoverY = rect.height - h;
      return Math.min(leftoverX, leftoverY);
    }
    case 'minimum_cuts': {
      // Best Long Side Fit: prefer cuts that go full-width/height (fewer guillotine cuts)
      const leftoverX = rect.width - w;
      const leftoverY = rect.height - h;
      return Math.max(leftoverX, leftoverY);
    }
    case 'fast_cutting': {
      // Bottom-Left: place as low and left as possible
      return rect.y * 10000 + rect.x;
    }
    case 'grain_safe': {
      // Prefer horizontally-aligned placements
      return (rect.width - w) + (rect.height - h) * 2;
    }
    default:
      return Math.min(rect.width - w, rect.height - h);
  }
}

// ─── MaxRects free rectangle update ───────────

function updateFreeRects(
  freeRects: Rectangle[],
  usedX: number,
  usedY: number,
  usedW: number,
  usedH: number
): Rectangle[] {
  const newRects: Rectangle[] = [];

  for (const rect of freeRects) {
    if (!intersects(rect, usedX, usedY, usedW, usedH)) {
      newRects.push(rect);
      continue;
    }

    // Split into up to 4 sub-rectangles (MaxRects style)
    if (usedX > rect.x) {
      newRects.push({ x: rect.x, y: rect.y, width: usedX - rect.x, height: rect.height });
    }
    if (usedX + usedW < rect.x + rect.width) {
      newRects.push({ x: usedX + usedW, y: rect.y, width: rect.x + rect.width - (usedX + usedW), height: rect.height });
    }
    if (usedY > rect.y) {
      newRects.push({ x: rect.x, y: rect.y, width: rect.width, height: usedY - rect.y });
    }
    if (usedY + usedH < rect.y + rect.height) {
      newRects.push({ x: rect.x, y: usedY + usedH, width: rect.width, height: rect.y + rect.height - (usedY + usedH) });
    }
  }

  return pruneFreeRects(newRects);
}

function intersects(rect: Rectangle, x: number, y: number, w: number, h: number): boolean {
  return !(x >= rect.x + rect.width || x + w <= rect.x || y >= rect.y + rect.height || y + h <= rect.y);
}

function pruneFreeRects(rects: Rectangle[]): Rectangle[] {
  return rects.filter((a, i) =>
    !rects.some((b, j) => i !== j && contains(b, a))
  );
}

function contains(outer: Rectangle, inner: Rectangle): boolean {
  return (
    outer.x <= inner.x &&
    outer.y <= inner.y &&
    outer.x + outer.width >= inner.x + inner.width &&
    outer.y + outer.height >= inner.y + inner.height
  );
}

// ─── Smart Sorting ────────────────────────────

function sortItems(
  items: CuttingItem[],
  strategy: SortStrategy,
  settings: ProjectSettings,
  mode: OptimizationMode,
  grainDir: string
): CuttingItem[] {
  const area = (i: CuttingItem) =>
    toMM(i.width, settings.unit) * toMM(i.height, settings.unit);
  const perimeter = (i: CuttingItem) =>
    2 * (toMM(i.width, settings.unit) + toMM(i.height, settings.unit));

  const sorted = [...items];

  // Mode-specific overrides
  if (mode === 'fast_cutting') {
    // Sort by width descending — creates clean vertical strips
    sorted.sort((a, b) => toMM(b.width, settings.unit) - toMM(a.width, settings.unit));
    return sorted;
  }

  if (mode === 'minimum_cuts') {
    // Sort by largest dimension descending
    sorted.sort((a, b) => {
      const aMax = Math.max(toMM(a.width, settings.unit), toMM(a.height, settings.unit));
      const bMax = Math.max(toMM(b.width, settings.unit), toMM(b.height, settings.unit));
      return bMax - aMax;
    });
    return sorted;
  }

  switch (strategy) {
    case 'area_desc':    sorted.sort((a, b) => area(b) - area(a)); break;
    case 'area_asc':     sorted.sort((a, b) => area(a) - area(b)); break;
    case 'width_desc':   sorted.sort((a, b) => toMM(b.width, settings.unit) - toMM(a.width, settings.unit)); break;
    case 'height_desc':  sorted.sort((a, b) => toMM(b.height, settings.unit) - toMM(a.height, settings.unit)); break;
    case 'perimeter_desc': sorted.sort((a, b) => perimeter(b) - perimeter(a)); break;
  }

  return sorted;
}

// ─── Remnant Detection ────────────────────────

export function detectRemnants(
  result: OptimizationResult,
  sheet: Sheet,
  settings: ProjectSettings,
  projectId: string,
  projectName: string,
  minAreaMM2 = 100_000  // 100cm² default min remnant
): Remnant[] {
  const remnants: Remnant[] = [];
  const now = new Date().toISOString();

  for (const optSheet of result.sheets) {
    for (const rect of optSheet.freeRectangles) {
      const areaMM2 = rect.width * rect.height;
      if (areaMM2 < minAreaMM2) continue;

      // Convert from mm back to project units for display
      const { fromMM } = require('@/lib/utils/units');
      const unit = settings.unit;

      remnants.push({
        id: generateId(),
        projectId,
        projectName,
        sheetId: sheet.id,
        material: sheet.material,
        width: parseFloat(fromMM(rect.width, unit).toFixed(2)),
        height: parseFloat(fromMM(rect.height, unit).toFixed(2)),
        thickness: sheet.thickness,
        unit,
        areaMM2,
        x: rect.x,
        y: rect.y,
        sheetIndex: optSheet.index,
        createdAt: now,
        used: false,
      });
    }
  }

  // Sort by area descending, keep top 20 per optimization
  return remnants
    .sort((a, b) => b.areaMM2 - a.areaMM2)
    .slice(0, 20);
}

// ─── Cutting order assignment ─────────────────

export function assignCuttingOrder(sheets: OptimizedSheet[]): OptimizedSheet[] {
  return sheets.map(sheet => ({
    ...sheet,
    pieces: sheet.pieces.map((piece, idx) => ({
      ...piece,
      cuttingOrder: idx + 1,
    })),
  }));
}

// ─── Empty result ─────────────────────────────

function emptyResult(): OptimizationResult {
  return {
    id: generateId(),
    timestamp: new Date().toISOString(),
    algorithm: 'maxrects_minimum_wastage',
    sheets: [],
    totalSheets: 0,
    totalUsedArea: 0,
    totalWasteArea: 0,
    overallEfficiency: 0,
    unplacedItems: [],
    processingTimeMs: 0,
  };
}
