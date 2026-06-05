// ─────────────────────────────────────────────
// Analytics Engine — CUTX ULTRA Phase 2
// ─────────────────────────────────────────────

import type { Project } from '@/types';
import type { GlobalAnalytics, AnalyticsSnapshot } from '@/types/phase2';
import { getAnalyticsHistory, saveAnalyticsSnapshot } from '@/lib/db/remnants';
import { generateId } from '@/lib/utils';

// Capture snapshot after optimization
export async function captureAnalyticsSnapshot(project: Project): Promise<void> {
  const result = project.optimizationResult;
  if (!result || !project.sheets[0]) return;

  const snapshot: AnalyticsSnapshot = {
    id: generateId(),
    projectId: project.id,
    efficiency: result.overallEfficiency,
    sheetsUsed: result.totalSheets,
    wastePercent: 100 - result.overallEfficiency,
    totalPieces: result.sheets.reduce((s, sh) => s + sh.pieces.length, 0),
    material: project.sheets[0].material,
    timestamp: new Date().toISOString(),
  };

  await saveAnalyticsSnapshot(snapshot);
}

// Compute global analytics from projects + history
export async function computeGlobalAnalytics(projects: Project[]): Promise<GlobalAnalytics> {
  const history = await getAnalyticsHistory(200) as AnalyticsSnapshot[];

  const totalProjects = projects.length;
  const totalOptimizations = history.length;

  const efficiencies = history.map(h => h.efficiency).filter(Boolean);
  const averageEfficiency = efficiencies.length
    ? efficiencies.reduce((s, e) => s + e, 0) / efficiencies.length
    : 0;

  // Material usage tally
  const materialCounts: Record<string, number> = {};
  for (const p of projects) {
    const mat = p.sheets[0]?.material ?? 'custom';
    materialCounts[mat] = (materialCounts[mat] ?? 0) + 1;
  }
  const topMaterials = Object.entries(materialCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([material, count]) => ({ material: material as any, count }));

  // Efficiency trend (last 14 entries)
  const efficiencyTrend = history.slice(0, 14).reverse().map(h => ({
    date: new Date(h.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    efficiency: h.efficiency,
  }));

  // Weekly usage (last 8 weeks)
  const weeklyMap: Record<string, { projects: number; sheets: number }> = {};
  const now = Date.now();
  for (const h of history) {
    const daysAgo = Math.floor((now - new Date(h.timestamp).getTime()) / 86400000);
    const weekNum = Math.floor(daysAgo / 7);
    if (weekNum >= 8) continue;
    const weekLabel = weekNum === 0 ? 'This week' : weekNum === 1 ? 'Last week' : `${weekNum}w ago`;
    if (!weeklyMap[weekLabel]) weeklyMap[weekLabel] = { projects: 0, sheets: 0 };
    weeklyMap[weekLabel].projects++;
    weeklyMap[weekLabel].sheets += h.sheetsUsed;
  }
  const weeklyUsage = Object.entries(weeklyMap).map(([week, data]) => ({ week, ...data }));

  // Estimate total material saved vs worst-case (40% efficiency)
  const totalMaterialSavedMM2 = history.reduce((s, h) => {
    const baseline = 40;
    const saved = Math.max(0, h.efficiency - baseline);
    return s + saved * 1000; // rough mm² estimate
  }, 0);

  return {
    totalProjects,
    totalOptimizations,
    totalMaterialSavedMM2,
    averageEfficiency,
    topMaterials,
    efficiencyTrend,
    weeklyUsage,
  };
}
