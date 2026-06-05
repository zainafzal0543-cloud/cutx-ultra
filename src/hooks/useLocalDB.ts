// ─────────────────────────────────────────────
// useLocalDB — IndexedDB project persistence
// ─────────────────────────────────────────────

import { useCallback } from 'react';
import {
  saveProject,
  getProject,
  getAllProjects,
  deleteProject,
  exportProjectToJSON,
  importProjectFromJSON,
} from '@/lib/db/local';
import type { Project } from '@/types';

export function useLocalDB() {
  const save = useCallback(async (project: Project) => {
    await saveProject(project);
  }, []);

  const load = useCallback(async (id: string) => {
    return getProject(id);
  }, []);

  const loadAll = useCallback(async () => {
    return getAllProjects();
  }, []);

  const remove = useCallback(async (id: string) => {
    await deleteProject(id);
  }, []);

  const exportJSON = useCallback(async (id: string): Promise<string | null> => {
    return exportProjectToJSON(id);
  }, []);

  const importJSON = useCallback(async (json: string): Promise<Project> => {
    return importProjectFromJSON(json);
  }, []);

  const downloadJSON = useCallback(async (id: string, name: string) => {
    const json = await exportProjectToJSON(id);
    if (!json) return;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/\s+/g, '-').toLowerCase()}.cutx.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return { save, load, loadAll, remove, exportJSON, importJSON, downloadJSON };
}
