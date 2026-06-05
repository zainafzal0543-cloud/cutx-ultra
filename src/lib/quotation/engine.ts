// ─────────────────────────────────────────────
// CUTX ULTRA Phase 3 — Quotation Engine
// Auto-generates quotes from optimization results
// ─────────────────────────────────────────────

import type { Project, OptimizationResult } from '@/types';
import type { Quotation, QuotationLineItem, PricingConfig } from '@/types/phase3';
import { generateId } from '@/lib/utils';
import { toMM, fromMM } from '@/lib/utils/units';

// ─── Default pricing config ───────────────────

export const DEFAULT_PRICING: PricingConfig = {
  materialCostPerMM2: {
    plywood:    0.000025,  // $/mm²
    mdf:        0.000015,
    acrylic:    0.000060,
    aluminum:   0.000120,
    steel:      0.000080,
    glass:      0.000090,
    solid_wood: 0.000040,
    custom:     0.000030,
  },
  cuttingCostPerMeter: 0.85,
  laborCostPerHour: 45,
  wasteSurchargePercent: 12,
  defaultMarginPercent: 25,
  defaultTaxRate: 10,
  currency: 'USD',
  currencySymbol: '$',
  regionName: 'Default',
};

// ─── Auto-generate quotation ──────────────────

export function generateQuotation(
  project: Project,
  pricing: PricingConfig = DEFAULT_PRICING,
  clientInfo: Partial<Quotation> = {}
): Quotation {
  const result = project.optimizationResult;
  const sheet = project.sheets[0];
  const unit = project.settings.unit;

  const lineItems: QuotationLineItem[] = [];

  if (result && sheet) {
    const sheetW = toMM(sheet.width, unit);
    const sheetH = toMM(sheet.height, unit);
    const sheetAreaMM2 = sheetW * sheetH;

    // 1. Material cost
    const matCostPerMM2 = pricing.materialCostPerMM2[sheet.material] ?? 0.000025;
    const totalSheetCostPerSheet = sheetAreaMM2 * matCostPerMM2;
    const totalMaterialCost = totalSheetCostPerSheet * result.totalSheets;

    lineItems.push({
      id: generateId(),
      description: `${sheet.material.toUpperCase()} ${sheet.width}×${sheet.height}${unit} (${sheet.thickness}mm) — ${result.totalSheets} sheet${result.totalSheets > 1 ? 's' : ''}`,
      category: 'material',
      quantity: result.totalSheets,
      unitPrice: parseFloat(totalSheetCostPerSheet.toFixed(2)),
      unit: 'sheet',
      subtotal: parseFloat(totalMaterialCost.toFixed(2)),
    });

    // 2. Cutting cost — estimate total cut length
    let totalCutLengthMM = 0;
    for (const optSheet of result.sheets) {
      for (const piece of optSheet.pieces) {
        totalCutLengthMM += 2 * (piece.width + piece.height); // perimeter
      }
    }
    const totalCutLengthM = totalCutLengthMM / 1000;
    const cuttingCost = totalCutLengthM * pricing.cuttingCostPerMeter;

    lineItems.push({
      id: generateId(),
      description: `CNC Cutting — ${totalCutLengthM.toFixed(1)}m total cut length`,
      category: 'cutting',
      quantity: parseFloat(totalCutLengthM.toFixed(2)),
      unitPrice: pricing.cuttingCostPerMeter,
      unit: 'm',
      subtotal: parseFloat(cuttingCost.toFixed(2)),
    });

    // 3. Labor — estimate based on piece count
    const totalPieces = result.sheets.reduce((s, sh) => s + sh.pieces.length, 0);
    const estimatedHours = Math.max(0.5, totalPieces * 0.03); // ~2 min per piece
    const laborCost = estimatedHours * pricing.laborCostPerHour;

    lineItems.push({
      id: generateId(),
      description: `Labor — setup, handling & quality check (~${estimatedHours.toFixed(1)}h for ${totalPieces} parts)`,
      category: 'labor',
      quantity: parseFloat(estimatedHours.toFixed(2)),
      unitPrice: pricing.laborCostPerHour,
      unit: 'hour',
      subtotal: parseFloat(laborCost.toFixed(2)),
    });

    // 4. Waste/offcut surcharge
    const wasteArea = result.totalWasteArea;
    const wasteCost = (totalMaterialCost * pricing.wasteSurchargePercent) / 100;
    if (wasteCost > 1) {
      lineItems.push({
        id: generateId(),
        description: `Offcut/waste material handling (${(100 - result.overallEfficiency).toFixed(1)}% waste)`,
        category: 'waste',
        quantity: 1,
        unitPrice: parseFloat(wasteCost.toFixed(2)),
        unit: 'job',
        subtotal: parseFloat(wasteCost.toFixed(2)),
        notes: `${pricing.wasteSurchargePercent}% of material cost`,
      });
    }
  }

  // Compute totals
  const subtotal = lineItems.reduce((s, l) => s + l.subtotal, 0);
  const marginAmount = subtotal * (pricing.defaultMarginPercent / 100);
  const totalBeforeTax = subtotal + marginAmount;
  const taxAmount = totalBeforeTax * (pricing.defaultTaxRate / 100);
  const total = totalBeforeTax + taxAmount;

  const quoteNumber = `QT-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;

  return {
    id: generateId(),
    projectId: project.id,
    quoteNumber,
    status: 'draft',
    lineItems,
    subtotal: parseFloat(subtotal.toFixed(2)),
    taxRate: pricing.defaultTaxRate,
    taxAmount: parseFloat(taxAmount.toFixed(2)),
    discountType: 'none',
    discountValue: 0,
    discountAmount: 0,
    total: parseFloat(total.toFixed(2)),
    currency: pricing.currency,
    profitMarginPercent: pricing.defaultMarginPercent,
    validUntil: new Date(Date.now() + 30 * 86400000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...clientInfo,
  };
}

// ─── Persistence ──────────────────────────────

export async function saveQuotation(q: Quotation): Promise<void> {
  const { openDB } = await import('idb');
  const db = await openDB('cutx-ultra', 4);
  await db.put('quotations', { ...q, updatedAt: new Date().toISOString() });
}

export async function getQuotationsForProject(projectId: string): Promise<Quotation[]> {
  const { openDB } = await import('idb');
  const db = await openDB('cutx-ultra', 4);
  return db.getAllFromIndex('quotations', 'projectId', projectId);
}

export async function getAllQuotations(): Promise<Quotation[]> {
  const { openDB } = await import('idb');
  const db = await openDB('cutx-ultra', 4);
  return db.getAll('quotations');
}

// ─── Format currency ──────────────────────────

export function formatCurrency(amount: number, symbol = '$'): string {
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Export quote to text (PDF ready) ─────────

export function quoteToText(quote: Quotation, projectName: string): string {
  const lines: string[] = [
    `QUOTATION — ${quote.quoteNumber}`,
    `Project: ${projectName}`,
    `Date: ${new Date(quote.createdAt).toLocaleDateString()}`,
    `Valid Until: ${quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : 'N/A'}`,
    '',
    quote.clientName ? `Client: ${quote.clientName}` : '',
    quote.clientCompany ? `Company: ${quote.clientCompany}` : '',
    quote.clientEmail ? `Email: ${quote.clientEmail}` : '',
    '',
    '─'.repeat(60),
    'DESCRIPTION'.padEnd(40) + 'QTY'.padEnd(8) + 'UNIT'.padEnd(8) + 'AMOUNT',
    '─'.repeat(60),
    ...quote.lineItems.map(l =>
      l.description.slice(0, 38).padEnd(40) +
      String(l.quantity).padEnd(8) +
      l.unit.padEnd(8) +
      `$${l.subtotal.toFixed(2)}`
    ),
    '─'.repeat(60),
    `${'SUBTOTAL'.padEnd(56)}$${quote.subtotal.toFixed(2)}`,
    `${`Margin (${quote.profitMarginPercent}%)`.padEnd(56)}$${(quote.subtotal * quote.profitMarginPercent / 100).toFixed(2)}`,
    `${`Tax (${quote.taxRate}%)`.padEnd(56)}$${quote.taxAmount.toFixed(2)}`,
    '─'.repeat(60),
    `${'TOTAL'.padEnd(56)}${quote.currency} $${quote.total.toFixed(2)}`,
    '',
    quote.notes ?? '',
    '',
    'Generated by CUTX ULTRA',
  ];
  return lines.filter(l => l !== undefined).join('\n');
}
