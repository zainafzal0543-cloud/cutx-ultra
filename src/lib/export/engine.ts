// ─────────────────────────────────────────────
// CUTX ULTRA Phase 2 — Export Engine
// Supports: PDF, PNG, CSV, DXF, JSON
// ─────────────────────────────────────────────

import type { OptimizationResult, Sheet, ProjectSettings, Project } from '@/types';
import type { ExportOptions } from '@/types/phase2';
import { toMM, fromMM, formatArea } from '@/lib/utils/units';
import { MATERIAL_LABELS } from '@/lib/utils/presets';
import { formatDate } from '@/lib/utils';

// ─── CSV Export ───────────────────────────────

export function exportToCSV(project: Project): string {
  const { cuttingList, settings } = project;
  const unit = settings.unit;

  const headers = ['#', 'Label', `Width (${unit})`, `Height (${unit})`, 'Quantity', 'Allow Rotation', 'Section', 'Notes'];
  const rows = cuttingList.map((item, i) => [
    i + 1,
    item.label,
    item.width,
    item.height,
    item.quantity,
    item.allowRotation ? 'Yes' : 'No',
    item.sectionTag ?? '',
    item.notes ?? '',
  ]);

  const csvLines = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','));

  // Add summary footer
  csvLines.push('');
  csvLines.push(`"Project","${project.name}"`);
  csvLines.push(`"Exported","${new Date().toISOString()}"`);

  if (project.optimizationResult) {
    const r = project.optimizationResult;
    csvLines.push(`"Total Sheets","${r.totalSheets}"`);
    csvLines.push(`"Efficiency","${r.overallEfficiency.toFixed(1)}%"`);
    csvLines.push(`"Algorithm","${r.algorithm}"`);
  }

  return csvLines.join('\n');
}

// ─── DXF Export ───────────────────────────────

export function exportToDXF(
  result: OptimizationResult,
  sheet: Sheet,
  settings: ProjectSettings,
  sheetIndices: number[] | 'all' = 'all'
): string {
  const indices = sheetIndices === 'all'
    ? result.sheets.map((_, i) => i)
    : sheetIndices;

  const lines: string[] = [];

  // DXF header
  lines.push('0', 'SECTION', '2', 'HEADER');
  lines.push('9', '$ACADVER', '1', 'AC1015');
  lines.push('9', '$INSUNITS', '70', '4'); // 4 = mm
  lines.push('0', 'ENDSEC');

  // Layers section
  lines.push('0', 'SECTION', '2', 'TABLES');
  lines.push('0', 'TABLE', '2', 'LAYER', '70', `${indices.length + 2}`);

  // Sheet outline layer
  dxfLayer(lines, 'SHEET', 7);   // 7 = white
  dxfLayer(lines, 'PIECES', 3);  // 3 = green
  dxfLayer(lines, 'LABELS', 1);  // 1 = red
  dxfLayer(lines, 'DIMS', 5);    // 5 = blue

  lines.push('0', 'ENDTAB', '0', 'ENDSEC');

  // Entities section
  lines.push('0', 'SECTION', '2', 'ENTITIES');

  const sheetW = toMM(sheet.width, settings.unit);
  const sheetH = toMM(sheet.height, settings.unit);

  for (const idx of indices) {
    const optSheet = result.sheets[idx];
    if (!optSheet) continue;

    const offsetX = idx * (sheetW + 100); // Stack sheets horizontally with 100mm gap

    // Sheet outline rectangle
    dxfRect(lines, 'SHEET', offsetX, 0, sheetW, sheetH);

    // Place each piece
    for (const piece of optSheet.pieces) {
      dxfRect(lines, 'PIECES', offsetX + piece.x, piece.y, piece.width, piece.height);

      // Label text
      dxfText(lines, 'LABELS',
        offsetX + piece.x + piece.width / 2,
        piece.y + piece.height / 2,
        piece.label,
        Math.min(piece.width, piece.height) * 0.12
      );

      // Dimension lines (width)
      dxfDimLine(lines, 'DIMS',
        offsetX + piece.x, piece.y - 5,
        offsetX + piece.x + piece.width, piece.y - 5,
        `${piece.width.toFixed(1)}`
      );
    }
  }

  lines.push('0', 'ENDSEC');
  lines.push('0', 'EOF');

  return lines.join('\n');
}

function dxfLayer(lines: string[], name: string, color: number) {
  lines.push('0', 'LAYER', '2', name, '70', '0', '62', String(color), '6', 'CONTINUOUS');
}

function dxfRect(lines: string[], layer: string, x: number, y: number, w: number, h: number) {
  lines.push('0', 'LWPOLYLINE', '8', layer, '90', '4', '70', '1');
  lines.push('10', String(x),       '20', String(y));
  lines.push('10', String(x + w),   '20', String(y));
  lines.push('10', String(x + w),   '20', String(y + h));
  lines.push('10', String(x),       '20', String(y + h));
}

function dxfText(lines: string[], layer: string, x: number, y: number, text: string, height: number) {
  lines.push('0', 'TEXT', '8', layer,
    '10', String(x), '20', String(y), '30', '0',
    '40', String(Math.max(height, 2)),
    '1', text, '72', '1', '73', '2',
    '11', String(x), '21', String(y), '31', '0'
  );
}

function dxfDimLine(lines: string[], layer: string, x1: number, y1: number, x2: number, y2: number, label: string) {
  lines.push('0', 'LINE', '8', layer,
    '10', String(x1), '20', String(y1), '30', '0',
    '11', String(x2), '21', String(y2), '31', '0'
  );
}

// ─── Canvas-based PNG Export ──────────────────

export async function exportSheetToPNG(
  result: OptimizationResult,
  sheet: Sheet,
  settings: ProjectSettings,
  sheetIndex: number,
  options: Partial<ExportOptions> = {}
): Promise<Blob> {
  const dpi = options.resolution ?? 150;
  const scale = dpi / 96;

  const sheetW = toMM(sheet.width, settings.unit);
  const sheetH = toMM(sheet.height, settings.unit);

  // Scale to fit in reasonable canvas size (max 4000px)
  const maxPx = 3000;
  const pxPerMM = Math.min(scale, maxPx / sheetW, maxPx / sheetH);

  const canvasW = Math.round(sheetW * pxPerMM) + 80;
  const canvasH = Math.round(sheetH * pxPerMM) + 100;

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = '#FBFBFC';
  ctx.fillRect(0, 0, canvasW, canvasH);

  const offsetX = 40;
  const offsetY = 40;
  const optSheet = result.sheets[sheetIndex];
  if (!optSheet) return new Blob();

  // Sheet bg
  ctx.fillStyle = '#FAFAFA';
  ctx.strokeStyle = '#E5E5EA';
  ctx.lineWidth = 1;
  ctx.fillRect(offsetX, offsetY, sheetW * pxPerMM, sheetH * pxPerMM);
  ctx.strokeRect(offsetX, offsetY, sheetW * pxPerMM, sheetH * pxPerMM);

  // Pieces
  const COLORS = ['#DBEAFE', '#D1FAE5', '#FEF3C7', '#FCE7F3', '#EDE9FE', '#FFEDD5', '#ECFDF5', '#F5F3FF'];
  const STROKES = ['#93C5FD', '#6EE7B7', '#FCD34D', '#F9A8D4', '#C4B5FD', '#FDBA74', '#A7F3D0', '#DDD6FE'];

  const colorMap = new Map<string, number>();

  for (const piece of optSheet.pieces) {
    if (!colorMap.has(piece.itemId)) colorMap.set(piece.itemId, colorMap.size);
    const ci = colorMap.get(piece.itemId)! % COLORS.length;

    const px = offsetX + piece.x * pxPerMM;
    const py = offsetY + piece.y * pxPerMM;
    const pw = piece.width * pxPerMM;
    const ph = piece.height * pxPerMM;

    ctx.fillStyle = COLORS[ci];
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = STROKES[ci];
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px, py, pw, ph);

    if (options.includeLabels !== false && pw > 30 && ph > 15) {
      const fontSize = Math.min(12, Math.max(7, pw / 8));
      ctx.font = `${fontSize}px DM Sans, sans-serif`;
      ctx.fillStyle = '#1D1D1F';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(piece.label, px + pw / 2, py + ph / 2 - fontSize * 0.6, pw - 8);

      if (options.includeDimensions !== false && pw > 50 && ph > 28) {
        ctx.font = `${Math.max(6, fontSize * 0.8)}px DM Mono, monospace`;
        ctx.fillStyle = '#86868B';
        ctx.fillText(`${piece.width.toFixed(0)}×${piece.height.toFixed(0)}`, px + pw / 2, py + ph / 2 + fontSize * 0.8, pw - 8);
      }
    }
  }

  // Project header
  ctx.fillStyle = '#1D1D1F';
  ctx.font = 'bold 13px DM Sans, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`Sheet ${sheetIndex + 1} of ${result.totalSheets}  ·  ${optSheet.efficiency.toFixed(1)}% efficiency`, offsetX, 14);

  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob!), 'image/png', 0.95);
  });
}

// ─── Trigger browser download ─────────────────

export function triggerDownload(content: string | Blob, filename: string, mimeType = 'text/plain') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── Excel-compatible CSV ─────────────────────

export function exportOptimizationToCSV(result: OptimizationResult, project: Project): string {
  const lines: string[] = [];
  lines.push(`"CUTX ULTRA — Optimization Report"`);
  lines.push(`"Project","${project.name}"`);
  lines.push(`"Date","${new Date().toLocaleString()}"`);
  lines.push(`"Algorithm","${result.algorithm}"`);
  lines.push(`"Total Sheets","${result.totalSheets}"`);
  lines.push(`"Overall Efficiency","${result.overallEfficiency.toFixed(1)}%"`);
  lines.push('');
  lines.push('"Sheet #","Piece Label","X","Y","Width","Height","Rotated","Section"');

  for (const sheet of result.sheets) {
    for (const piece of sheet.pieces) {
      lines.push([
        sheet.index + 1,
        `"${piece.label}"`,
        piece.x.toFixed(1),
        piece.y.toFixed(1),
        piece.width.toFixed(1),
        piece.height.toFixed(1),
        piece.rotated ? 'Yes' : 'No',
        `"${piece.sectionTag ?? ''}"`,
      ].join(','));
    }
  }

  if (result.unplacedItems.length > 0) {
    lines.push('');
    lines.push('"UNPLACED ITEMS"');
    lines.push('"Label","Width","Height","Quantity"');
    for (const item of result.unplacedItems) {
      lines.push(`"${item.label}",${item.width},${item.height},${item.quantity}`);
    }
  }

  return lines.join('\n');
}
