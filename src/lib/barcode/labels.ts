// ─────────────────────────────────────────────
// CUTX ULTRA Phase 3 — Barcode/QR Label System
// Generates printable labels with piece tracking
// ─────────────────────────────────────────────

import type { OptimizationResult, Project } from '@/types';
import type { PieceLabel, ScanEvent } from '@/types/phase3';
import { generateId } from '@/lib/utils';

// ─── Generate labels from optimization result ─

export function generatePieceLabels(
  project: Project,
  result: OptimizationResult
): PieceLabel[] {
  const labels: PieceLabel[] = [];
  const now = new Date().toISOString();

  for (const optSheet of result.sheets) {
    for (const piece of optSheet.pieces) {
      const qrData = JSON.stringify({
        app: 'CUTX',
        v: 1,
        pid: project.id,
        pname: project.name,
        lid: piece.id,
        label: piece.label,
        w: piece.width.toFixed(1),
        h: piece.height.toFixed(1),
        sheet: optSheet.index + 1,
        rot: piece.rotated ? 1 : 0,
      });

      labels.push({
        pieceId: piece.id,
        projectId: project.id,
        projectName: project.name,
        partLabel: piece.label,
        width: piece.width,
        height: piece.height,
        thickness: project.sheets[0]?.thickness ?? 18,
        material: project.sheets[0]?.material ?? 'plywood',
        sheetNumber: optSheet.index + 1,
        positionX: piece.x,
        positionY: piece.y,
        rotated: piece.rotated,
        qrData,
        barcodeData: `CUTX-${project.id.slice(0, 6)}-${piece.id.slice(0, 8)}`.toUpperCase(),
        cutStatus: 'pending',
        createdAt: now,
      });
    }
  }

  return labels;
}

// ─── Persist labels ───────────────────────────

export async function savePieceLabels(labels: PieceLabel[]): Promise<void> {
  const { openDB } = await import('idb');
  const db = await openDB('cutx-ultra', 4);
  const tx = db.transaction('piece_labels', 'readwrite');
  await Promise.all(labels.map(l => tx.store.put(l)));
  await tx.done;
}

export async function getPieceLabelsForProject(projectId: string): Promise<PieceLabel[]> {
  const { openDB } = await import('idb');
  const db = await openDB('cutx-ultra', 4);
  return db.getAllFromIndex('piece_labels', 'projectId', projectId);
}

export async function updatePieceLabelStatus(
  pieceId: string,
  status: PieceLabel['cutStatus'],
  scannedBy?: string
): Promise<void> {
  const { openDB } = await import('idb');
  const db = await openDB('cutx-ultra', 4);
  const label = await db.get('piece_labels', pieceId);
  if (label) {
    await db.put('piece_labels', { ...label, cutStatus: status });
  }

  const event: ScanEvent = {
    id: generateId(),
    labelId: pieceId,
    scannedBy,
    status,
    timestamp: new Date().toISOString(),
  };
  await db.put('scan_events', event);
}

// ─── SVG QR Code (lightweight, no library needed) ─

export function generateSVGQRCode(data: string, size = 80): string {
  // Compact SVG QR representation using pattern hash
  // In production, replace with a proper QR library like 'qrcode'
  const hash = simpleHash(data);
  const cells = 21; // QR Version 1
  const cellSize = size / cells;
  const pattern = generateQRPattern(hash, cells);

  const rects: string[] = [];
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      if (pattern[r][c]) {
        rects.push(`<rect x="${c * cellSize}" y="${r * cellSize}" width="${cellSize}" height="${cellSize}" fill="black"/>`);
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="white"/>
  ${rects.join('\n  ')}
</svg>`;
}

function simpleHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function generateQRPattern(seed: number, cells: number): boolean[][] {
  const pattern: boolean[][] = Array.from({ length: cells }, () => Array(cells).fill(false));

  // Finder patterns (corners)
  const drawFinder = (r: number, c: number) => {
    for (let dr = 0; dr < 7; dr++) for (let dc = 0; dc < 7; dc++) {
      const isOuter = dr === 0 || dr === 6 || dc === 0 || dc === 6;
      const isInner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
      if (r + dr < cells && c + dc < cells) pattern[r + dr][c + dc] = isOuter || isInner;
    }
  };
  drawFinder(0, 0); drawFinder(0, cells - 7); drawFinder(cells - 7, 0);

  // Data bits from seed
  let s = seed;
  for (let r = 8; r < cells; r++) {
    for (let c = 8; c < cells; c++) {
      s = ((s * 1664525) + 1013904223) >>> 0;
      pattern[r][c] = (s & 1) === 1;
    }
  }

  return pattern;
}

// ─── Barcode SVG (Code 128 style visual) ─────

export function generateBarcodeSVG(data: string, width = 150, height = 40): string {
  const seed = simpleHash(data);
  const barCount = 30;
  const barWidth = width / barCount;
  const bars: string[] = [];
  let s = seed;

  for (let i = 0; i < barCount; i++) {
    s = ((s * 1664525) + 1013904223) >>> 0;
    const isBlack = (s & 3) !== 0; // 75% density
    const w = barWidth * (0.8 + (s % 3) * 0.1);
    if (isBlack) {
      bars.push(`<rect x="${i * barWidth}" y="0" width="${w}" height="${height - 8}" fill="black"/>`);
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="white"/>
  ${bars.join('\n  ')}
  <text x="${width / 2}" y="${height}" text-anchor="middle" font-family="monospace" font-size="7" fill="black">${data.slice(0, 22)}</text>
</svg>`;
}

// ─── Printable label sheet HTML ───────────────

export function generateLabelSheetHTML(labels: PieceLabel[]): string {
  const labelHTMLs = labels.map(label => {
    const qrSvg = generateSVGQRCode(label.qrData, 64);
    const barSvg = generateBarcodeSVG(label.barcodeData, 130, 32);

    return `
<div class="label">
  <div class="label-header">
    <div class="qr">${qrSvg}</div>
    <div class="info">
      <div class="part-name">${label.partLabel}</div>
      <div class="dims">${label.width.toFixed(1)} × ${label.height.toFixed(1)}mm${label.rotated ? ' ↻' : ''}</div>
      <div class="meta">Sheet ${label.sheetNumber} · ${label.material}</div>
      <div class="meta">${label.projectName}</div>
    </div>
  </div>
  <div class="barcode">${barSvg}</div>
</div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>CUTX ULTRA — Cut Labels</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'DM Sans', system-ui, sans-serif; background: white; }
  .page { display: flex; flex-wrap: wrap; gap: 8px; padding: 16px; }
  .label {
    width: 180px; border: 1px solid #E5E5EA; border-radius: 8px;
    padding: 8px; background: white; page-break-inside: avoid;
    display: flex; flex-direction: column; gap: 6px;
  }
  .label-header { display: flex; gap: 8px; align-items: flex-start; }
  .qr { flex-shrink: 0; }
  .info { flex: 1; min-width: 0; }
  .part-name { font-size: 11px; font-weight: 700; color: #1D1D1F; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .dims { font-size: 10px; font-weight: 600; color: #1D1D1F; margin-top: 2px; font-family: monospace; }
  .meta { font-size: 9px; color: #86868B; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .barcode { margin-top: 2px; }
  @media print {
    body { margin: 0; }
    .page { padding: 8px; gap: 6px; }
    .label { border: 0.5pt solid #ccc; }
  }
</style>
</head>
<body>
<div class="page">${labelHTMLs}</div>
</body>
</html>`;
}
