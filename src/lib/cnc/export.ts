// ─────────────────────────────────────────────
// CUTX ULTRA Phase 3 — Advanced CNC Export Engine
// DXF with layers, G-code generation, toolpath prep
// ─────────────────────────────────────────────

import type { OptimizationResult, Sheet, ProjectSettings } from '@/types';
import type { CNCProfile, CNCExportOptions } from '@/types/phase3';
import { toMM } from '@/lib/utils/units';

// ─── Default CNC Profiles ────────────────────

export const CNC_PROFILES: CNCProfile[] = [
  {
    id: 'router_standard',
    name: 'CNC Router — Standard',
    machineType: 'router',
    toolDiameter: 6,
    kerf: 6.2,
    feedRate: 4000,
    plungeRate: 1200,
    passDepth: 6,
    spindleSpeed: 18000,
    coolant: false,
    leadIn: 5,
    leadOut: 5,
    tabWidth: 8,
    tabHeight: 3,
    tabSpacing: 200,
    units: 'mm',
  },
  {
    id: 'router_fine',
    name: 'CNC Router — Fine Detail',
    machineType: 'router',
    toolDiameter: 3,
    kerf: 3.2,
    feedRate: 2000,
    plungeRate: 600,
    passDepth: 3,
    spindleSpeed: 24000,
    coolant: false,
    leadIn: 3,
    leadOut: 3,
    tabWidth: 5,
    tabHeight: 2,
    tabSpacing: 150,
    units: 'mm',
  },
  {
    id: 'laser_standard',
    name: 'Laser Cutter — Standard',
    machineType: 'laser',
    toolDiameter: 0.2,
    kerf: 0.3,
    feedRate: 15000,
    plungeRate: 0,
    passDepth: 20,
    leadIn: 2,
    leadOut: 2,
    units: 'mm',
  },
  {
    id: 'plasma_standard',
    name: 'Plasma Cutter',
    machineType: 'plasma',
    toolDiameter: 1.5,
    kerf: 2.0,
    feedRate: 3000,
    plungeRate: 500,
    passDepth: 50,
    leadIn: 8,
    leadOut: 8,
    units: 'mm',
  },
];

// ─── Advanced DXF Export ──────────────────────

export function exportAdvancedDXF(
  result: OptimizationResult,
  sheet: Sheet,
  settings: ProjectSettings,
  cncOptions: Partial<CNCExportOptions> = {}
): string {
  const profile = cncOptions.profile ?? CNC_PROFILES[0];
  const sheetW = toMM(sheet.width, settings.unit);
  const sheetH = toMM(sheet.height, settings.unit);
  const indices = Array.from({ length: result.sheets.length }, (_, i) => i);
  const lines: string[] = [];

  // ── DXF Header ────────────────────────────
  lines.push(
    '0', 'SECTION', '2', 'HEADER',
    '9', '$ACADVER', '1', 'AC1015',
    '9', '$INSUNITS', '70', '4',      // 4 = mm
    '9', '$MEASUREMENT', '70', '1',   // 1 = metric
    '9', '$EXTMIN', '10', '0.0', '20', '0.0', '30', '0.0',
    '9', '$EXTMAX',
    '10', String(sheetW * indices.length + 100 * indices.length),
    '20', String(sheetH),
    '30', '0.0',
    '0', 'ENDSEC'
  );

  // ── Tables (Layers) ───────────────────────
  lines.push('0', 'SECTION', '2', 'TABLES');
  lines.push('0', 'TABLE', '2', 'LAYER', '70', '8');
  dxfLayer(lines, '0',            7);   // Default
  dxfLayer(lines, 'SHEET_OUTLINE',7);   // white
  dxfLayer(lines, 'CUT_PATHS',    3);   // green — toolpaths
  dxfLayer(lines, 'LABELS',       1);   // red
  dxfLayer(lines, 'DIMENSIONS',   5);   // blue
  dxfLayer(lines, 'GRAIN_DIR',    4);   // cyan
  dxfLayer(lines, 'TABS',         6);   // magenta
  dxfLayer(lines, 'LEAD_IN_OUT',  2);   // yellow
  lines.push('0', 'ENDTAB', '0', 'ENDSEC');

  // ── Entities ──────────────────────────────
  lines.push('0', 'SECTION', '2', 'ENTITIES');

  const toolR = profile.toolDiameter / 2; // tool radius for offset

  for (const idx of indices) {
    const optSheet = result.sheets[idx];
    if (!optSheet) continue;

    const ox = idx * (sheetW + 100); // horizontal stack with 100mm gap

    // Sheet outline
    dxfRect(lines, 'SHEET_OUTLINE', ox, 0, sheetW, sheetH, 0.5);

    // Sheet label
    dxfText(lines, 'LABELS', ox + 5, sheetH + 8,
      `Sheet ${idx + 1} / ${result.totalSheets}  ·  ${optSheet.efficiency.toFixed(1)}%  ·  ${optSheet.pieces.length} parts`, 4);

    // Determine cut order
    const orderedPieces = [...optSheet.pieces].sort((a, b) => {
      switch (cncOptions.cutOrder ?? 'inside_out') {
        case 'left_right':   return a.x - b.x;
        case 'top_bottom':   return a.y - b.y;
        case 'outside_in':   return (b.x + b.y) - (a.x + a.y);
        case 'inside_out':
        default:             return (a.x + a.y) - (b.x + b.y);
      }
    });

    orderedPieces.forEach((piece, order) => {
      const px = ox + piece.x;
      const py = piece.y;
      const pw = piece.width;
      const ph = piece.height;

      // Inward offset for router tool radius compensation
      const comp = profile.machineType === 'router' ? toolR : 0;
      const cx = px + comp;
      const cy = py + comp;
      const cw = pw - comp * 2;
      const ch = ph - comp * 2;

      if (cw > 0 && ch > 0) {
        // Cut path (tool center line)
        dxfRect(lines, 'CUT_PATHS', cx, cy, cw, ch, 1.0);
      }

      // Lead-in / lead-out arc at bottom-left corner
      if (cncOptions.includeLeads !== false && profile.leadIn > 0 && cw > 0) {
        const liLen = Math.min(profile.leadIn, cw / 2);
        lines.push(
          '0', 'LINE',
          '8', 'LEAD_IN_OUT',
          '10', String(cx - liLen), '20', String(cy),
          '11', String(cx), '21', String(cy),
          '30', '0', '31', '0',
        );
      }

      // Tabs (bridges) on long edges
      if (cncOptions.includeTabs !== false && profile.tabWidth && ph > profile.tabSpacing!) {
        const tabCount = Math.floor(ph / profile.tabSpacing!);
        for (let t = 1; t <= tabCount; t++) {
          const ty = cy + (ph / (tabCount + 1)) * t;
          lines.push(
            '0', 'LINE', '8', 'TABS',
            '10', String(cx), '20', String(ty - profile.tabWidth / 2),
            '11', String(cx), '21', String(ty + profile.tabWidth / 2),
            '30', '0', '31', '0',
          );
        }
      }

      // Part label
      if (pw > 20 && ph > 10) {
        const fontSize = Math.min(8, Math.max(3, pw / 10));
        dxfText(lines, 'LABELS', px + pw / 2 - fontSize * piece.label.length / 4,
          py + ph / 2, piece.label, fontSize);
        dxfText(lines, 'DIMENSIONS', px + pw / 2 - 10, py + ph / 2 - fontSize - 1,
          `${piece.width.toFixed(1)}×${piece.height.toFixed(1)}`, Math.max(2.5, fontSize * 0.7));
      }

      // Cut order number
      if (cncOptions.generateToolpath) {
        dxfText(lines, 'LABELS', px + 2, py + ph - 4, String(order + 1), 3);
      }
    });

    // Dimension annotation
    dxfDimH(lines, 'DIMENSIONS', ox, -12, sheetW, `${sheet.width} ${settings.unit}`);
    dxfDimV(lines, 'DIMENSIONS', ox - 12, 0, sheetH, `${sheet.height} ${settings.unit}`);
  }

  lines.push('0', 'ENDSEC', '0', 'EOF');
  return lines.join('\n');
}

// ─── G-Code Generator ────────────────────────

export function generateGCode(
  result: OptimizationResult,
  sheet: Sheet,
  settings: ProjectSettings,
  profile: CNCProfile,
  sheetIndex = 0
): string {
  const sheetW = toMM(sheet.width, settings.unit);
  const sheetH = toMM(sheet.height, settings.unit);
  const optSheet = result.sheets[sheetIndex];
  if (!optSheet) return '';

  const lines: string[] = [];
  const toolR = profile.toolDiameter / 2;
  const safeZ = 5;
  const workZ = -Math.min(profile.passDepth, sheet.thickness);

  // ── Program header ────────────────────────
  lines.push(
    `; CUTX ULTRA — G-Code Export`,
    `; Project sheet ${sheetIndex + 1} / ${result.totalSheets}`,
    `; Material: ${sheet.material}  ${sheet.width}×${sheet.height} ${settings.unit}`,
    `; Tool: ⌀${profile.toolDiameter}mm  Feed: ${profile.feedRate}mm/min`,
    `; Generated: ${new Date().toISOString()}`,
    `; ─────────────────────────────────────────`,
    `%`,
    `G21        ; Units: mm`,
    `G90        ; Absolute positioning`,
    `G17        ; XY plane`,
    `G94        ; Feed rate: mm/min`,
    ``,
    `; === TOOL SETUP ===`,
    `T1 M6      ; Select tool 1 (⌀${profile.toolDiameter}mm)`,
    profile.spindleSpeed ? `S${profile.spindleSpeed} M3 ; Spindle ON @ ${profile.spindleSpeed} RPM` : `M3 ; Spindle ON`,
    `G4 P2      ; Dwell 2s for spindle spin-up`,
    ``,
    `; === SAFE HOME ===`,
    `G0 Z${safeZ}  ; Rapid to safe height`,
    `G0 X0 Y0   ; Move to origin`,
    ``
  );

  // Sort pieces by cut order
  const orderedPieces = [...optSheet.pieces].sort((a, b) => (a.x + a.y) - (b.x + b.y));

  orderedPieces.forEach((piece, i) => {
    const comp = toolR;
    const x = piece.x + comp;
    const y = piece.y + comp;
    const w = piece.width - comp * 2;
    const h = piece.height - comp * 2;

    if (w <= 0 || h <= 0) return;

    lines.push(
      `; --- Part ${i + 1}: "${piece.label}" ---`,
      `G0 Z${safeZ}`,
      `G0 X${f(x - profile.leadIn)} Y${f(y)}  ; Approach`,
    );

    // Multi-pass for thick materials
    const passes = Math.ceil(sheet.thickness / profile.passDepth);
    for (let pass = 1; pass <= passes; pass++) {
      const depth = -Math.min(profile.passDepth * pass, sheet.thickness);
      lines.push(
        `; Pass ${pass}/${passes} — depth ${Math.abs(depth)}mm`,
        `G0 X${f(x - profile.leadIn)} Y${f(y)}`,
        `G1 Z${depth} F${profile.plungeRate}  ; Plunge`,
        `G1 X${f(x)} Y${f(y)} F${profile.feedRate}  ; Lead-in`,
        `G1 X${f(x + w)} Y${f(y)}  ; Bottom edge`,
        `G1 X${f(x + w)} Y${f(y + h)}  ; Right edge`,
        `G1 X${f(x)} Y${f(y + h)}  ; Top edge`,
        `G1 X${f(x)} Y${f(y)}  ; Left edge (close)`,
        `G1 X${f(x - profile.leadOut)} Y${f(y)}  ; Lead-out`,
        `G0 Z${safeZ}  ; Retract`,
      );
    }
    lines.push('');
  });

  // ── Program footer ────────────────────────
  lines.push(
    `; === END OF PROGRAM ===`,
    `G0 Z${safeZ}  ; Safe height`,
    `G0 X0 Y0   ; Return to origin`,
    `M5          ; Spindle OFF`,
    `M30         ; End program`,
    `%`
  );

  return lines.join('\n');
}

// ─── DXF Helpers ─────────────────────────────

function f(n: number): string { return n.toFixed(3); }

function dxfLayer(lines: string[], name: string, color: number) {
  lines.push('0','LAYER','2',name,'70','0','62',String(color),'6','CONTINUOUS');
}

function dxfRect(lines: string[], layer: string, x: number, y: number, w: number, h: number, lw = 0.25) {
  lines.push(
    '0','LWPOLYLINE','8',layer,'43',String(lw),'90','4','70','1',
    '10',f(x),       '20',f(y),
    '10',f(x + w),   '20',f(y),
    '10',f(x + w),   '20',f(y + h),
    '10',f(x),       '20',f(y + h),
  );
}

function dxfText(lines: string[], layer: string, x: number, y: number, text: string, height: number) {
  lines.push(
    '0','TEXT','8',layer,
    '10',f(x),'20',f(y),'30','0',
    '40',f(Math.max(height, 1.5)),
    '1', text,
    '72','1','73','2',
    '11',f(x),'21',f(y),'31','0',
  );
}

function dxfDimH(lines: string[], layer: string, x: number, y: number, length: number, label: string) {
  lines.push('0','LINE','8',layer,'10',f(x),'20',f(y),'11',f(x + length),'21',f(y),'30','0','31','0');
  dxfText(lines, layer, x + length / 2 - label.length, y - 4, label, 3);
}

function dxfDimV(lines: string[], layer: string, x: number, y: number, length: number, label: string) {
  lines.push('0','LINE','8',layer,'10',f(x),'20',f(y),'11',f(x),'21',f(y + length),'30','0','31','0');
  dxfText(lines, layer, x - 8, y + length / 2, label, 3);
}
