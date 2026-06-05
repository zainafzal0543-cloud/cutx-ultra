// ─────────────────────────────────────────────
// useOptimization — convenience hook
// ─────────────────────────────────────────────

import { useCallback } from 'react';
import { useStore, selectActiveProject, selectOptimizationResult } from '@/store';
import { computeMetrics } from '@/lib/optimization/guillotine';
import { toMM } from '@/lib/utils/units';

export function useOptimization() {
  const activeProject = useStore(selectActiveProject);
  const result = useStore(selectOptimizationResult);
  const { isOptimizing, runOptimization } = useStore();

  const sheet = activeProject?.sheets[0];
  const settings = activeProject?.settings;

  const metrics = result && sheet && settings
    ? computeMetrics(
        result,
        toMM(sheet.width, settings.unit) * toMM(sheet.height, settings.unit)
      )
    : null;

  const optimize = useCallback(() => {
    if (activeProject?.id) runOptimization(activeProject.id);
  }, [activeProject?.id, runOptimization]);

  const canOptimize =
    !!activeProject &&
    activeProject.sheets.length > 0 &&
    activeProject.cuttingList.length > 0 &&
    !isOptimizing;

  return { result, metrics, isOptimizing, optimize, canOptimize };
}
