// ─────────────────────────────────────────────
// CUTX ULTRA Phase 3 — Enterprise Types
// ─────────────────────────────────────────────

import type { MaterialType, Unit } from './index';

// ─── AI Recommendations ───────────────────────

export type SuggestionSeverity = 'info' | 'warning' | 'success' | 'critical';
export type SuggestionCategory =
  | 'efficiency'
  | 'wastage'
  | 'sheet_size'
  | 'remnant'
  | 'grouping'
  | 'impossible'
  | 'sorting'
  | 'cost';

export interface AISuggestion {
  id: string;
  category: SuggestionCategory;
  severity: SuggestionSeverity;
  title: string;
  description: string;
  actionLabel?: string;
  actionPayload?: Record<string, unknown>;
  estimatedSavingMM2?: number;
  confidenceScore: number; // 0–1
  dismissed: boolean;
}

export interface OptimizationIntelligence {
  suggestions: AISuggestion[];
  confidenceScore: number;
  estimatedMaterialSavingPercent: number;
  recommendedMode: string;
  analysisTimeMs: number;
  impossibleParts: string[];
  groupingOpportunities: GroupingOpportunity[];
}

export interface GroupingOpportunity {
  partIds: string[];
  reason: string;
  estimatedSaving: number;
}

// ─── CNC Export ───────────────────────────────

export type CNCMachineType = 'router' | 'laser' | 'plasma' | 'waterjet' | 'knife';

export interface CNCProfile {
  id: string;
  name: string;
  machineType: CNCMachineType;
  toolDiameter: number;      // mm
  kerf: number;              // mm
  feedRate: number;          // mm/min
  plungeRate: number;        // mm/min
  passDepth: number;         // mm per pass
  spindleSpeed?: number;     // RPM
  coolant?: boolean;
  leadIn: number;            // mm
  leadOut: number;           // mm
  tabWidth?: number;         // mm
  tabHeight?: number;        // mm
  tabSpacing?: number;       // mm between tabs
  units: 'mm' | 'inch';
}

export interface CNCExportOptions {
  profile: CNCProfile;
  includeLeads: boolean;
  includeTabs: boolean;
  generateToolpath: boolean;
  cutOrder: 'inside_out' | 'outside_in' | 'left_right' | 'top_bottom';
  homePosition: { x: number; y: number; z: number };
  safeHeight: number;
  format: 'dxf' | 'gcode' | 'svg';
}

// ─── Inventory ────────────────────────────────

export interface InventorySheet {
  id: string;
  name: string;
  material: MaterialType;
  width: number;
  height: number;
  thickness: number;
  unit: Unit;
  quantity: number;
  minStockLevel: number;
  costPerSheet: number;
  currency: string;
  supplierId?: string;
  supplierSku?: string;
  location?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  leadTimeDays?: number;
  notes?: string;
  createdAt: string;
}

export interface InventoryTransaction {
  id: string;
  sheetId: string;
  type: 'addition' | 'deduction' | 'adjustment';
  quantity: number;
  reason: string;
  projectId?: string;
  userId?: string;
  createdAt: string;
}

export interface InventoryAlert {
  sheetId: string;
  sheetName: string;
  material: MaterialType;
  currentStock: number;
  minLevel: number;
  severity: 'low' | 'critical' | 'out_of_stock';
}

// ─── Quotation ────────────────────────────────

export interface QuotationLineItem {
  id: string;
  description: string;
  category: 'material' | 'cutting' | 'labor' | 'waste' | 'other';
  quantity: number;
  unitPrice: number;
  unit: string;
  subtotal: number;
  notes?: string;
}

export interface Quotation {
  id: string;
  projectId: string;
  quoteNumber: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientCompany?: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  lineItems: QuotationLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountType: 'percent' | 'fixed' | 'none';
  discountValue: number;
  discountAmount: number;
  total: number;
  currency: string;
  profitMarginPercent: number;
  validUntil?: string;
  notes?: string;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PricingConfig {
  materialCostPerMM2: Record<MaterialType, number>;
  cuttingCostPerMeter: number;
  laborCostPerHour: number;
  wasteSurchargePercent: number;
  defaultMarginPercent: number;
  defaultTaxRate: number;
  currency: string;
  currencySymbol: string;
  regionName: string;
}

// ─── Barcode / QR ─────────────────────────────

export interface PieceLabel {
  pieceId: string;
  projectId: string;
  projectName: string;
  partLabel: string;
  width: number;
  height: number;
  thickness: number;
  material: string;
  sheetNumber: number;
  positionX: number;
  positionY: number;
  rotated: boolean;
  qrData: string;
  barcodeData: string;
  cutStatus: 'pending' | 'in_progress' | 'done' | 'rejected';
  createdAt: string;
}

export interface ScanEvent {
  id: string;
  labelId: string;
  scannedBy?: string;
  status: PieceLabel['cutStatus'];
  notes?: string;
  timestamp: string;
  deviceInfo?: string;
}

// ─── Enterprise / Teams ───────────────────────

export type TeamRole = 'super_admin' | 'owner' | 'manager' | 'operator' | 'client_viewer';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'starter' | 'professional' | 'enterprise';
  logoUrl?: string;
  settings: OrgSettings;
  createdAt: string;
  updatedAt: string;
}

export interface OrgSettings {
  defaultCurrency: string;
  defaultUnit: Unit;
  timezone: string;
  allowClientSharing: boolean;
  requireApprovalForExport: boolean;
  maxTeamMembers: number;
}

export interface TeamMember {
  id: string;
  userId: string;
  orgId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  role: TeamRole;
  invitedAt: string;
  joinedAt?: string;
  isActive: boolean;
}

export interface ActivityLog {
  id: string;
  orgId: string;
  userId: string;
  userEmail: string;
  action: string;
  resourceType: 'project' | 'inventory' | 'quotation' | 'team' | 'export';
  resourceId?: string;
  resourceName?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

export type Permission =
  | 'project:create' | 'project:read' | 'project:update' | 'project:delete'
  | 'inventory:read' | 'inventory:write'
  | 'quotation:create' | 'quotation:read' | 'quotation:send'
  | 'team:manage' | 'analytics:view' | 'export:all' | 'settings:manage';

export const ROLE_PERMISSIONS: Record<TeamRole, Permission[]> = {
  super_admin:   ['project:create','project:read','project:update','project:delete','inventory:read','inventory:write','quotation:create','quotation:read','quotation:send','team:manage','analytics:view','export:all','settings:manage'],
  owner:         ['project:create','project:read','project:update','project:delete','inventory:read','inventory:write','quotation:create','quotation:read','quotation:send','team:manage','analytics:view','export:all','settings:manage'],
  manager:       ['project:create','project:read','project:update','inventory:read','inventory:write','quotation:create','quotation:read','quotation:send','analytics:view','export:all'],
  operator:      ['project:create','project:read','project:update','inventory:read','export:all'],
  client_viewer: ['project:read'],
};

// ─── Offline Sync ─────────────────────────────

export type SyncStatus = 'synced' | 'pending' | 'conflict' | 'error';

export interface SyncQueueItem {
  id: string;
  type: 'upsert' | 'delete';
  table: string;
  recordId: string;
  payload: unknown;
  retries: number;
  createdAt: string;
  lastAttempt?: string;
  error?: string;
}

export interface SyncState {
  status: SyncStatus;
  lastSyncAt?: string;
  pendingCount: number;
  conflictCount: number;
  errorCount: number;
}

// ─── Business Intelligence ────────────────────

export interface BIReport {
  id: string;
  period: 'week' | 'month' | 'quarter' | 'year';
  startDate: string;
  endDate: string;
  totalProjects: number;
  totalSheetsUsed: number;
  totalMaterialCost: number;
  totalRevenue: number;
  totalProfit: number;
  averageEfficiency: number;
  totalWasteMM2: number;
  topMaterials: { material: string; sheetsUsed: number; cost: number }[];
  efficiencyByWeek: { week: string; efficiency: number; sheets: number }[];
}
