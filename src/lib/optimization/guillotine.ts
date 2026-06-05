// ─────────────────────────────────────────────
// Guillotine Cutting Algorithm — CUTX ULTRA
// Phase 1: Foundation-level implementation
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
import { generateId, getPieceColor, getPieceBorderColor } from '@/lib/utils';
import { toMM } from '@/lib/utils/units';

// ─── Internal types ───────────────────────────

interface ItemToPlace {
  item: CuttingItem;
  instanceIndex: number;
}

interface PlacementResult {
  placed: boolean;
  x?: number;
  y?: number;
  rotated?: boolean;
  freeRects?: Rectangle[];
}

// ─── Main Optimization Function ───────────────

export function runGuillotineOptimization(
  sheets: Sheet[],
  cuttingItems: CuttingItem[],
  settings: ProjectSettings
): OptimizationResult {
  const startTime = performance.now();
  const kerf = toMM(settings.bladeKerf, settings.unit);

  // Expand items by quantity
  const itemsToPlace: ItemToPlace[] = [];
  for (const item of cuttingItems) {
    for (let i = 0; i < item.quantity; i++) {
      itemsToPlace.push({ item, instanceIndex: i });
    }
  }

  // Sort items by area descending (largest first — better packing)
  itemsToPlace.sort((a, b) => {
    const aArea = toMM(a.item.width, settings.unit) * toMM(a.item.height, settings.unit);
    const bArea = toMM(b.item.width, settings.unit) * toMM(b.item.height, settings.unit);
    return bArea - aArea;
  });

  if (sheets.length === 0 || itemsToPlace.length === 0) {
    return createEmptyResult(settings.optimizationAlgorithm);
  }

  const primarySheet = sheets[0]; // Phase 1: use first sheet spec
  const sheetW = toMM(primarySheet.width, settings.unit);
  const sheetH = toMM(primarySheet.height, settings.unit);

  const optimizedSheets: OptimizedSheet[] = [];
  const unplacedItems: CuttingItem[] = [];
  let remaining = [...itemsToPlace];

  // Pack items onto sheets until all are placed or max sheets reached
  const MAX_SHEETS = 50;
  let sheetIndex = 0;

  while (remaining.length > 0 && sheetIndex < MAX_SHEETS) {
    const { packedSheet, leftover } = packOneSheet(
      sheetIndex,
      primarySheet.id,
      sheetW,
      sheetH,
      remaining,
      kerf,
      settings
    );

    optimizedSheets.push(packedSheet);

    if (leftover.length === remaining.length) {
      // No progress — can't place any more
      for (const r of remaining) {
        if (!unplacedItems.find((u) => u.id === r.item.id)) {
          unplacedItems.push(r.item);
        }
      }
      break;
    }

    remaining = leftover;
    sheetIndex++;
  }

  const endTime = performance.now();

  // Compute totals
  const sheetArea = sheetW * sheetH;
  const totalUsedArea = optimizedSheets.reduce((s, sh) => s + sh.usedArea, 0);
  const totalWasteArea = optimizedSheets.reduce((s, sh) => s + sh.wasteArea, 0);
  const totalArea = sheetArea * optimizedSheets.length;
  const overallEfficiency = totalArea > 0 ? (totalUsedArea / totalArea) * 100 : 0;

  return {
    id: generateId(),
    timestamp: new Date().toISOString(),
    algorithm: 'guillotine',
    sheets: optimizedSheets,
    totalSheets: optimizedSheets.length,
    totalUsedArea,
    totalWasteArea,
    overallEfficiency,
    unplacedItems,
    processingTimeMs: endTime - startTime,
  };
}

// ─── Pack a single sheet ───────────────────────

function packOneSheet(
  sheetIndex: number,
  sheetId: string,
  sheetW: number,
  sheetH: number,
  items: ItemToPlace[],
  kerf: number,
  settings: ProjectSettings
): { packedSheet: OptimizedSheet; leftover: ItemToPlace[] } {
  // Initialize free rectangles with the full sheet
  let freeRects: Rectangle[] = [{ x: 0, y: 0, width: sheetW, height: sheetH }];
  const placedPieces: PlacedPiece[] = [];
  const leftover: ItemToPlace[] = [];
  let pieceColorIndex = 0;

  for (const entry of items) {
    const { item } = entry;
    const iW = toMM(item.width, settings.unit);
    const iH = toMM(item.height, settings.unit);

    const result = findBestFit(freeRects, iW, iH, kerf, item.allowRotation && settings.allowRotation);

    if (result.placed && result.x !== undefined && result.y !== undefined) {
      const rotated = result.rotated ?? false;
      const placedW = rotated ? iH : iW;
      const placedH = rotated ? iW : iH;

      placedPieces.push({
        id: generateId(),
        itemId: item.id,
        label: item.label,
        x: result.x,
        y: result.y,
        width: placedW,
        height: placedH,
        rotated,
        sheetIndex,
        color: getPieceColor(pieceColorIndex),
        sectionTag: item.sectionTag,
      });

      // Update free rectangles using guillotine split
      freeRects = guillotineSplit(freeRects, result.x, result.y, placedW + kerf, placedH + kerf);
      pieceColorIndex++;
    } else {
      leftover.push(entry);
    }
  }

  // Calculate metrics
  const sheetArea = sheetW * sheetH;
  const usedArea = placedPieces.reduce((s, p) => s + p.width * p.height, 0);
  const wasteArea = sheetArea - usedArea;
  const efficiency = (usedArea / sheetArea) * 100;

  return {
    packedSheet: {
      index: sheetIndex,
      sheetId,
      pieces: placedPieces,
      usedArea,
      wasteArea,
      efficiency,
      freeRectangles: freeRects,
    },
    leftover,
  };
}

// ─── Find best fitting free rectangle (Best Short Side Fit) ───

function findBestFit(
  freeRects: Rectangle[],
  itemW: number,
  itemH: number,
  kerf: number,
  allowRotation: boolean
): PlacementResult {
  let bestScore = Infinity;
  let bestRect: Rectangle | null = null;
  let bestRotated = false;

  for (const rect of freeRects) {
    // Try normal orientation
    if (itemW + kerf <= rect.width && itemH + kerf <= rect.height) {
      const score = Math.min(rect.width - itemW, rect.height - itemH);
      if (score < bestScore) {
        bestScore = score;
        bestRect = rect;
        bestRotated = false;
      }
    }

    // Try rotated orientation
    if (allowRotation && itemH + kerf <= rect.width && itemW + kerf <= rect.height) {
      const score = Math.min(rect.width - itemH, rect.height - itemW);
      if (score < bestScore) {
        bestScore = score;
        bestRect = rect;
        bestRotated = true;
      }
    }
  }

  if (!bestRect) return { placed: false };

  return {
    placed: true,
    x: bestRect.x,
    y: bestRect.y,
    rotated: bestRotated,
  };
}

// ─── Guillotine split: remove used area from free rects ───

function guillotineSplit(
  freeRects: Rectangle[],
  usedX: number,
  usedY: number,
  usedW: number,
  usedH: number
): Rectangle[] {
  const newFreeRects: Rectangle[] = [];

  for (const rect of freeRects) {
    // Check if this free rect overlaps with the placed piece
    if (
      usedX >= rect.x + rect.width ||
      usedX + usedW <= rect.x ||
      usedY >= rect.y + rect.height ||
      usedY + usedH <= rect.y
    ) {
      // No overlap — keep this rect
      newFreeRects.push(rect);
      continue;
    }

    // Overlap — split into up to 4 sub-rectangles

    // Right of placed piece
    if (usedX + usedW < rect.x + rect.width) {
      newFreeRects.push({
        x: usedX + usedW,
        y: rect.y,
        width: rect.x + rect.width - (usedX + usedW),
        height: rect.height,
      });
    }

    // Left of placed piece
    if (usedX > rect.x) {
      newFreeRects.push({
        x: rect.x,
        y: rect.y,
        width: usedX - rect.x,
        height: rect.height,
      });
    }

    // Below placed piece
    if (usedY + usedH < rect.y + rect.height) {
      newFreeRects.push({
        x: rect.x,
        y: usedY + usedH,
        width: rect.width,
        height: rect.y + rect.height - (usedY + usedH),
      });
    }

    // Above placed piece
    if (usedY > rect.y) {
      newFreeRects.push({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: usedY - rect.y,
      });
    }
  }

  // Remove contained/redundant rects
  return removeContainedRects(newFreeRects);
}

// ─── Remove rectangles fully contained in others ───

function removeContainedRects(rects: Rectangle[]): Rectangle[] {
  return rects.filter((r, i) => {
    for (let j = 0; j < rects.length; j++) {
      if (i === j) continue;
      const other = rects[j];
      if (
        other.x <= r.x &&
        other.y <= r.y &&
        other.x + other.width >= r.x + r.width &&
        other.y + other.height >= r.y + r.height
      ) {
        return false; // r is contained in other
      }
    }
    return true;
  });
}

// ─── Empty result helper ───────────────────────

function createEmptyResult(algorithm: string): OptimizationResult {
  return {
    id: generateId(),
    timestamp: new Date().toISOString(),
    algorithm,
    sheets: [],
    totalSheets: 0,
    totalUsedArea: 0,
    totalWasteArea: 0,
    overallEfficiency: 0,
    unplacedItems: [],
    processingTimeMs: 0,
  };
}

// ─── Compute metrics from result ──────────────

export function computeMetrics(result: OptimizationResult, sheetArea: number) {
  return {
    totalSheets: result.totalSheets,
    totalArea: sheetArea * result.totalSheets,
    usedArea: result.totalUsedArea,
    wasteArea: result.totalWasteArea,
    efficiency: result.overallEfficiency,
    totalPieces: result.sheets.reduce((s, sh) => s + sh.pieces.length, 0),
    placedPieces: result.sheets.reduce((s, sh) => s + sh.pieces.length, 0),
    unplacedPieces: result.unplacedItems.length,
  };
}
