// ─────────────────────────────────────────────
// CUTX ULTRA Phase 3 — AI Recommendation Engine
// Rule-based heuristic intelligence system
// Future-ready: swap analyzeWithAI() for API call
// ─────────────────────────────────────────────

import type { Project, CuttingItem, Sheet } from '@/types';
import type {
  AISuggestion, OptimizationIntelligence,
  GroupingOpportunity, SuggestionCategory,
} from '@/types/phase3';
import { toMM } from '@/lib/utils/units';
import { generateId } from '@/lib/utils';
import { SHEET_PRESETS } from '@/lib/utils/presets';

// ─── Main Analysis Entry Point ────────────────

export async function analyzeProject(project: Project): Promise<OptimizationIntelligence> {
  const start = performance.now();
  const suggestions: AISuggestion[] = [];
  const impossibleParts: string[] = [];
  const groupingOpportunities: GroupingOpportunity[] = [];

  const sheet = project.sheets[0];
  const items = project.cuttingList;
  const result = project.optimizationResult;
  const unit = project.settings.unit;

  if (!sheet || !items.length) {
    return emptyIntelligence(performance.now() - start);
  }

  const sheetW = toMM(sheet.width, unit);
  const sheetH = toMM(sheet.height, unit);
  const sheetArea = sheetW * sheetH;

  // ── 1. Detect impossible parts ─────────────
  for (const item of items) {
    const iW = toMM(item.width, unit);
    const iH = toMM(item.height, unit);
    const fitsNormal = iW <= sheetW && iH <= sheetH;
    const fitsRotated = item.allowRotation && iH <= sheetW && iW <= sheetH;

    if (!fitsNormal && !fitsRotated) {
      impossibleParts.push(item.id);
      suggestions.push(makeSuggestion({
        category: 'impossible',
        severity: 'critical',
        title: `Part too large: "${item.label}"`,
        description: `${item.width}×${item.height} ${unit} exceeds sheet dimensions ${sheet.width}×${sheet.height} ${unit}. Either split the part or use a larger sheet.`,
        confidenceScore: 1.0,
      }));
    }
  }

  // ── 2. High-wastage warning ────────────────
  if (result) {
    if (result.overallEfficiency < 60) {
      suggestions.push(makeSuggestion({
        category: 'wastage',
        severity: 'critical',
        title: 'Very high material waste detected',
        description: `Current efficiency is only ${result.overallEfficiency.toFixed(1)}%. Consider enabling rotation, grouping similar parts, or switching to Minimum Wastage mode.`,
        estimatedSavingMM2: (sheetArea * result.totalSheets) * 0.15,
        confidenceScore: 0.92,
        actionLabel: 'Switch to Min Wastage',
        actionPayload: { setMode: 'minimum_wastage' },
      }));
    } else if (result.overallEfficiency < 75) {
      suggestions.push(makeSuggestion({
        category: 'wastage',
        severity: 'warning',
        title: 'Efficiency below optimal',
        description: `At ${result.overallEfficiency.toFixed(1)}%, there's room to improve. Try enabling part rotation or sorting by area descending.`,
        estimatedSavingMM2: (sheetArea * result.totalSheets) * 0.07,
        confidenceScore: 0.78,
      }));
    } else if (result.overallEfficiency > 90) {
      suggestions.push(makeSuggestion({
        category: 'efficiency',
        severity: 'success',
        title: 'Excellent material efficiency',
        description: `${result.overallEfficiency.toFixed(1)}% efficiency is outstanding. Your layout is near-optimal.`,
        confidenceScore: 0.99,
      }));
    }
  }

  // ── 3. Sheet size recommendations ─────────
  const totalPartArea = items.reduce((sum, i) => {
    return sum + toMM(i.width, unit) * toMM(i.height, unit) * i.quantity;
  }, 0);

  // If parts barely fill the sheet (< 30%), suggest smaller sheet
  if (result && result.totalSheets === 1 && result.overallEfficiency < 30) {
    const betterPreset = SHEET_PRESETS.find(p => {
      const pArea = toMM(p.width, p.unit) * toMM(p.height, p.unit);
      return pArea >= totalPartArea * 1.2 && pArea < sheetArea * 0.7 && p.material === sheet.material;
    });

    if (betterPreset) {
      suggestions.push(makeSuggestion({
        category: 'sheet_size',
        severity: 'info',
        title: `Smaller sheet recommended`,
        description: `Your parts only need ~${(totalPartArea / sheetArea * 100).toFixed(0)}% of the current sheet. "${betterPreset.name}" (${betterPreset.width}×${betterPreset.height}) would save material.`,
        estimatedSavingMM2: sheetArea - toMM(betterPreset.width, betterPreset.unit) * toMM(betterPreset.height, betterPreset.unit),
        confidenceScore: 0.72,
        actionLabel: 'Apply this sheet',
        actionPayload: { applyPreset: betterPreset.id },
      }));
    }
  }

  // If parts require many sheets of current size, suggest larger sheet
  if (result && result.totalSheets > 5) {
    const largerPreset = SHEET_PRESETS.find(p => {
      const pArea = toMM(p.width, p.unit) * toMM(p.height, p.unit);
      return pArea > sheetArea * 1.3 && p.material === sheet.material;
    });
    if (largerPreset) {
      const projectedSheets = Math.ceil(totalPartArea / (toMM(largerPreset.width, largerPreset.unit) * toMM(largerPreset.height, largerPreset.unit) * 0.82));
      if (projectedSheets < result.totalSheets - 1) {
        suggestions.push(makeSuggestion({
          category: 'sheet_size',
          severity: 'info',
          title: 'Larger sheet could reduce sheet count',
          description: `Using "${largerPreset.name}" might reduce sheets from ${result.totalSheets} to ~${projectedSheets}, saving handling time.`,
          confidenceScore: 0.65,
          actionLabel: 'Try larger sheet',
          actionPayload: { applyPreset: largerPreset.id },
        }));
      }
    }
  }

  // ── 4. Rotation disabled warning ──────────
  const noRotation = items.filter(i => !i.allowRotation);
  if (noRotation.length > items.length * 0.5 && !project.settings.allowRotation) {
    suggestions.push(makeSuggestion({
      category: 'sorting',
      severity: 'warning',
      title: 'Rotation disabled for most parts',
      description: `${noRotation.length} parts have rotation disabled. Enabling rotation globally could improve efficiency by 5–15%.`,
      estimatedSavingMM2: sheetArea * (result?.totalSheets ?? 1) * 0.08,
      confidenceScore: 0.8,
      actionLabel: 'Enable global rotation',
      actionPayload: { enableRotation: true },
    }));
  }

  // ── 5. Grouping opportunities ──────────────
  const groups = findSimilarParts(items, unit);
  for (const group of groups) {
    if (group.partIds.length >= 3) {
      groupingOpportunities.push(group);
      if (suggestions.filter(s => s.category === 'grouping').length < 2) {
        suggestions.push(makeSuggestion({
          category: 'grouping',
          severity: 'info',
          title: `${group.partIds.length} similar parts detected`,
          description: group.reason,
          estimatedSavingMM2: group.estimatedSaving,
          confidenceScore: 0.7,
          actionLabel: 'Group these parts',
          actionPayload: { groupParts: group.partIds },
        }));
      }
    }
  }

  // ── 6. Unplaced parts warning ──────────────
  if (result && result.unplacedItems.length > 0) {
    suggestions.push(makeSuggestion({
      category: 'impossible',
      severity: 'critical',
      title: `${result.unplacedItems.length} part${result.unplacedItems.length > 1 ? 's' : ''} could not be placed`,
      description: `Increase sheet quantity or reduce part sizes. Unplaced: ${result.unplacedItems.slice(0, 3).map(i => i.label).join(', ')}${result.unplacedItems.length > 3 ? '…' : ''}`,
      confidenceScore: 1.0,
    }));
  }

  // ── 7. Kerf too large ─────────────────────
  const kerf = project.settings.bladeKerf;
  const kerfMM = toMM(kerf, unit);
  if (kerfMM > 5) {
    suggestions.push(makeSuggestion({
      category: 'efficiency',
      severity: 'warning',
      title: `Blade kerf ${kerf}${unit} seems high`,
      description: `A kerf above 5mm is unusual for most materials. Verify your saw blade width. Reducing kerf saves material on every cut.`,
      confidenceScore: 0.85,
    }));
  }

  // ── 8. Large quantity identical parts ─────
  const highQtyItems = items.filter(i => i.quantity >= 20);
  if (highQtyItems.length > 0) {
    suggestions.push(makeSuggestion({
      category: 'sorting',
      severity: 'info',
      title: 'High-quantity parts detected',
      description: `"${highQtyItems[0].label}" has ${highQtyItems[0].quantity} copies. Sorting by quantity descending can improve strip-cutting efficiency.`,
      confidenceScore: 0.68,
    }));
  }

  // ── Compute confidence score ───────────────
  const criticalCount = suggestions.filter(s => s.severity === 'critical').length;
  const warningCount  = suggestions.filter(s => s.severity === 'warning').length;
  const overallConfidence = result
    ? Math.min(0.99, (result.overallEfficiency / 100) * (1 - criticalCount * 0.1) * (1 - warningCount * 0.05))
    : 0.5;

  const estimatedSaving = suggestions.reduce((s, sg) => s + (sg.estimatedSavingMM2 ?? 0), 0);
  const savingPercent = sheetArea > 0
    ? Math.min(25, (estimatedSaving / (sheetArea * Math.max(result?.totalSheets ?? 1, 1))) * 100)
    : 0;

  return {
    suggestions: suggestions.slice(0, 8), // cap at 8
    confidenceScore: overallConfidence,
    estimatedMaterialSavingPercent: savingPercent,
    recommendedMode: getRecommendedMode(project),
    analysisTimeMs: performance.now() - start,
    impossibleParts,
    groupingOpportunities,
  };
}

// ─── Find similar parts for grouping ─────────

function findSimilarParts(items: CuttingItem[], unit: Unit): GroupingOpportunity[] {
  const groups: Map<string, CuttingItem[]> = new Map();

  for (const item of items) {
    const wMM = Math.round(toMM(item.width, unit) / 50) * 50; // bucket to 50mm
    const hMM = Math.round(toMM(item.height, unit) / 50) * 50;
    const key = `${Math.min(wMM, hMM)}x${Math.max(wMM, hMM)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  const opportunities: GroupingOpportunity[] = [];
  for (const [key, groupItems] of groups) {
    if (groupItems.length >= 3) {
      const [w, h] = key.split('x').map(Number);
      opportunities.push({
        partIds: groupItems.map(i => i.id),
        reason: `${groupItems.length} parts are similar in size (~${w}×${h}mm). Grouping them helps the optimizer pack strips efficiently.`,
        estimatedSaving: w * h * groupItems.length * 0.05,
      });
    }
  }

  return opportunities;
}

function getRecommendedMode(project: Project): string {
  const result = project.optimizationResult;
  if (!result) return 'minimum_wastage';
  if (result.overallEfficiency < 70) return 'minimum_wastage';
  if (result.totalSheets > 8) return 'minimum_cuts';
  return 'minimum_wastage';
}

// ─── Suggestion factory ───────────────────────

function makeSuggestion(fields: Omit<AISuggestion, 'id' | 'dismissed'>): AISuggestion {
  return { id: generateId(), dismissed: false, ...fields };
}

function emptyIntelligence(ms: number): OptimizationIntelligence {
  return {
    suggestions: [],
    confidenceScore: 0,
    estimatedMaterialSavingPercent: 0,
    recommendedMode: 'minimum_wastage',
    analysisTimeMs: ms,
    impossibleParts: [],
    groupingOpportunities: [],
  };
}

// ─── Future AI API integration hook ──────────
// Replace this function body with an API call to OpenAI/Claude/Gemini
// when ready. All callers remain unchanged.

export async function analyzeWithExternalAI(
  _projectJson: string,
  _provider: 'openai' | 'claude' | 'gemini' = 'claude'
): Promise<AISuggestion[]> {
  // TODO Phase 4: POST to /api/ai/analyze with projectJson
  // const res = await fetch('/api/ai/analyze', { method: 'POST', body: projectJson });
  // return res.json();
  console.warn('External AI analysis not yet configured. Using rule-based engine.');
  return [];
}
