// ─────────────────────────────────────────────
// CUTX ULTRA Phase 2 — Store Extension
// Adds: advanced optimization, remnants, analytics
// Extends the base store via separate slice
// ─────────────────────────────────────────────

import { useStore } from '@/store';
import type { Phase2Settings } from '@/types/phase2';

// ─── Phase2 settings helpers ──────────────────

export function usePhase2Settings(): [Partial<Phase2Settings>, (updates: Partial<Phase2Settings>) => void] {
  const activeProjectId = useStore(s => s.activeProjectId);
  const projects = useStore(s => s.projects);
  const updateProject = useStore(s => s.updateProject);

  const project = projects.find(p => p.id === activeProjectId);
  const settings: Partial<Phase2Settings> = (project as any)?.phase2Settings ?? {};

  const setSettings = (updates: Partial<Phase2Settings>) => {
    if (!activeProjectId) return;
    updateProject(activeProjectId, {
      ...(project ?? {}),
      phase2Settings: { ...settings, ...updates },
    } as any);
  };

  return [settings, setSettings];
}

// ─── Advanced optimization runner ─────────────

export async function runAdvancedOptimizationForProject(projectId: string): Promise<void> {
  const state = useStore.getState();
  const project = state.projects.find(p => p.id === projectId);
  if (!project || !project.sheets.length || !project.cuttingList.length) return;

  useStore.setState({ isOptimizing: true });

  try {
    await new Promise(r => setTimeout(r, 60)); // yield to UI

    const { runAdvancedOptimization, detectRemnants } = await import('@/lib/optimization/advanced');
    const { captureAnalyticsSnapshot } = await import('@/lib/analytics/engine');
    const { saveRemnants, deleteRemnantsByProject } = await import('@/lib/db/remnants');

    const phase2Settings: Partial<Phase2Settings> = (project as any).phase2Settings ?? {};

    const result = await runAdvancedOptimization(
      project.sheets,
      project.cuttingList,
      project.settings,
      phase2Settings,
      (progress) => {
        // Could emit progress events here
      }
    );

    // Auto-save remnants
    if (phase2Settings.autoSaveRemnants !== false) {
      const minArea = phase2Settings.minRemnantSize ?? 100_000;
      const remnants = detectRemnants(
        result,
        project.sheets[0],
        project.settings,
        project.id,
        project.name,
        minArea
      );
      if (remnants.length > 0) {
        await deleteRemnantsByProject(project.id); // clear old ones
        await saveRemnants(remnants);
      }
    }

    // Update store
    useStore.setState(s => ({
      projects: s.projects.map(p =>
        p.id === projectId
          ? { ...p, optimizationResult: result, updatedAt: new Date().toISOString() }
          : p
      ),
      isOptimizing: false,
      canvasState: { ...s.canvasState, activeSheetIndex: 0 },
    }));

    // Persist + analytics
    const updated = useStore.getState().projects.find(p => p.id === projectId);
    if (updated) {
      const { saveProject } = await import('@/lib/db/local');
      await saveProject(updated);
      await captureAnalyticsSnapshot(updated);
    }
  } catch (err) {
    console.error('Advanced optimization failed:', err);
    useStore.setState({ isOptimizing: false });
  }
}
