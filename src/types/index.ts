// ─────────────────────────────────────────────
// CUTX ULTRA — Core Type Definitions
// ─────────────────────────────────────────────

export type Unit = 'mm' | 'cm' | 'inches' | 'feet';

export type MaterialType =
  | 'plywood'
  | 'mdf'
  | 'acrylic'
  | 'aluminum'
  | 'steel'
  | 'glass'
  | 'solid_wood'
  | 'custom';

export interface Dimensions {
  width: number;
  height: number;
}

// ─────────────────────────────────────────────
// PROJECT
// ─────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  settings: ProjectSettings;
  sheets: Sheet[];
  cuttingList: CuttingItem[];
  optimizationResult?: OptimizationResult;
  syncedAt?: string;
  isLocal: boolean;
}

export interface ProjectSettings {
  unit: Unit;
  bladeKerf: number;
  allowRotation: boolean;
  optimizationAlgorithm: 'guillotine' | 'maxrects' | 'skyline';
  padding: number;
}

// ─────────────────────────────────────────────
// SHEET
// ─────────────────────────────────────────────

export interface Sheet {
  id: string;
  name: string;
  material: MaterialType;
  width: number;
  height: number;
  thickness: number;
  quantity: number;
  costPerSheet?: number;
  grainDirection?: 'horizontal' | 'vertical' | 'none';
}

export interface SheetPreset {
  id: string;
  name: string;
  material: MaterialType;
  width: number;
  height: number;
  thickness: number;
  unit: Unit;
}

// ─────────────────────────────────────────────
// CUTTING LIST
// ─────────────────────────────────────────────

export interface CuttingItem {
  id: string;
  label: string;
  width: number;
  height: number;
  quantity: number;
  allowRotation: boolean;
  sectionTag?: string;
  material?: string;
  notes?: string;
  priority?: number;
}

// ─────────────────────────────────────────────
// OPTIMIZATION
// ─────────────────────────────────────────────

export interface PlacedPiece {
  id: string;
  itemId: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotated: boolean;
  sheetIndex: number;
  color?: string;
  sectionTag?: string;
}

export interface OptimizedSheet {
  index: number;
  sheetId: string;
  pieces: PlacedPiece[];
  usedArea: number;
  wasteArea: number;
  efficiency: number;
  freeRectangles: Rectangle[];
}

export interface OptimizationResult {
  id: string;
  timestamp: string;
  algorithm: string;
  sheets: OptimizedSheet[];
  totalSheets: number;
  totalUsedArea: number;
  totalWasteArea: number;
  overallEfficiency: number;
  unplacedItems: CuttingItem[];
  processingTimeMs: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ─────────────────────────────────────────────
// UI STATE
// ─────────────────────────────────────────────

export interface CanvasState {
  zoom: number;
  panX: number;
  panY: number;
  selectedPieceId?: string;
  hoveredPieceId?: string;
  activeSheetIndex: number;
}

export interface AppState {
  activeProjectId?: string;
  projects: Project[];
  isOptimizing: boolean;
  isSaving: boolean;
  canvasState: CanvasState;
  sidebarCollapsed: {
    left: boolean;
    right: boolean;
  };
}

// ─────────────────────────────────────────────
// METRICS
// ─────────────────────────────────────────────

export interface Metrics {
  totalSheets: number;
  totalArea: number;
  usedArea: number;
  wasteArea: number;
  efficiency: number;
  totalPieces: number;
  placedPieces: number;
  unplacedPieces: number;
  estimatedCost?: number;
}

// ─────────────────────────────────────────────
// SUPABASE DATABASE TYPES
// ─────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          tags: string[];
          settings: ProjectSettings;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['projects']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['projects']['Insert']>;
      };
      sheets: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          material: MaterialType;
          width: number;
          height: number;
          thickness: number;
          quantity: number;
          cost_per_sheet: number | null;
          grain_direction: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['sheets']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['sheets']['Insert']>;
      };
      cutting_items: {
        Row: {
          id: string;
          project_id: string;
          label: string;
          width: number;
          height: number;
          quantity: number;
          allow_rotation: boolean;
          section_tag: string | null;
          notes: string | null;
          priority: number | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['cutting_items']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['cutting_items']['Insert']>;
      };
    };
  };
}
