// ─────────────────────────────────────────────
// CUTX ULTRA — Phase 2 Extended Types
// ─────────────────────────────────────────────

import type { MaterialType, Unit, Rectangle } from './index';

// ─── Optimization Modes ───────────────────────

export type OptimizationMode =
  | 'minimum_wastage'   // Best-fit packing, maximize efficiency
  | 'minimum_cuts'      // Minimize number of cuts (guillotine-friendly)
  | 'fast_cutting'      // Speed-optimized, fewer rotations
  | 'grain_safe';       // Preserve grain direction, no rotation

export type SortStrategy =
  | 'area_desc'         // Largest first (default)
  | 'area_asc'
  | 'width_desc'
  | 'height_desc'
  | 'perimeter_desc';

// ─── Remnant System ───────────────────────────

export interface Remnant {
  id: string;
  projectId: string;
  projectName: string;
  sheetId: string;
  material: MaterialType;
  width: number;
  height: number;
  thickness: number;
  unit: Unit;
  areaMM2: number;
  x: number;             // Position on original sheet
  y: number;
  sheetIndex: number;
  createdAt: string;
  notes?: string;
  used: boolean;
  usedInProjectId?: string;
}

export interface RemnantSuggestion {
  remnant: Remnant;
  coverage: number;     // % of required material this remnant covers
  savings: number;      // mm² of material saved
}

// ─── Export System ────────────────────────────

export type ExportFormat = 'pdf' | 'png' | 'csv' | 'xlsx' | 'dxf' | 'json';

export interface ExportOptions {
  format: ExportFormat;
  includeMetrics: boolean;
  includeLabels: boolean;
  includeDimensions: boolean;
  includeCuttingOrder: boolean;
  scale: number;
  resolution: number;   // DPI for raster exports
  sheetsToExport: number[] | 'all';
}

export interface ExportJob {
  id: string;
  projectId: string;
  format: ExportFormat;
  status: 'pending' | 'processing' | 'done' | 'error';
  createdAt: string;
  completedAt?: string;
  fileUrl?: string;
  error?: string;
}

// ─── Analytics ────────────────────────────────

export interface ProjectAnalytics {
  projectId: string;
  totalOptimizations: number;
  bestEfficiency: number;
  averageEfficiency: number;
  totalMaterialUsed: number;   // mm²
  totalMaterialWasted: number; // mm²
  totalSheetsSaved: number;
  mostUsedMaterial: MaterialType;
  lastOptimizedAt: string;
}

export interface GlobalAnalytics {
  totalProjects: number;
  totalOptimizations: number;
  totalMaterialSavedMM2: number;
  averageEfficiency: number;
  topMaterials: { material: MaterialType; count: number }[];
  efficiencyTrend: { date: string; efficiency: number }[];
  weeklyUsage: { week: string; projects: number; sheets: number }[];
}

export interface AnalyticsSnapshot {
  id: string;
  projectId: string;
  efficiency: number;
  sheetsUsed: number;
  wastePercent: number;
  totalPieces: number;
  material: MaterialType;
  timestamp: string;
}

// ─── Sharing ──────────────────────────────────

export interface ShareLink {
  id: string;
  projectId: string;
  token: string;
  expiresAt?: string;
  viewCount: number;
  createdAt: string;
  readOnly: boolean;
  password?: string;
}

export interface SharedProject {
  shareId: string;
  token: string;
  project: {
    name: string;
    description?: string;
    sheets: unknown[];
    cuttingList: unknown[];
    optimizationResult?: unknown;
    settings: unknown;
  };
  createdAt: string;
  expiresAt?: string;
}

// ─── Phase 2 Project Settings extension ───────

export interface Phase2Settings {
  optimizationMode: OptimizationMode;
  sortStrategy: SortStrategy;
  grainDirection: 'horizontal' | 'vertical' | 'none';
  minRemnantSize: number;  // mm² — below this area, don't save as remnant
  autoSaveRemnants: boolean;
  showCuttingOrder: boolean;
  cuttingOrderStyle: 'guillotine' | 'optimized';
}

// ─── Multi-sheet workspace ────────────────────

export interface SheetThumbnail {
  sheetIndex: number;
  efficiency: number;
  pieceCount: number;
  dataUrl?: string;  // Rendered thumbnail
}

// ─── Virtualized list ─────────────────────────

export interface VirtualizedListConfig {
  itemHeight: number;
  overscan: number;
  containerHeight: number;
}

// ─── Progress tracking ────────────────────────

export interface OptimizationProgress {
  phase: 'sorting' | 'placing' | 'compacting' | 'done';
  placedCount: number;
  totalCount: number;
  currentSheet: number;
  percentComplete: number;
}
