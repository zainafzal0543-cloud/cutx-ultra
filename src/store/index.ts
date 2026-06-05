// ─────────────────────────────────────────────
// CUTX ULTRA — Global State Store (Zustand)
// ─────────────────────────────────────────────

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  Project,
  Sheet,
  CuttingItem,
  OptimizationResult,
  CanvasState,
  ProjectSettings,
} from '@/types';
import { generateId } from '@/lib/utils';

// ─── Default values ───────────────────────────

const DEFAULT_SETTINGS: ProjectSettings = {
  unit: 'mm',
  bladeKerf: 3.2,
  allowRotation: true,
  optimizationAlgorithm: 'guillotine',
  padding: 0,
};

const DEFAULT_CANVAS_STATE: CanvasState = {
  zoom: 1,
  panX: 0,
  panY: 0,
  activeSheetIndex: 0,
};

// ─── Store interface ──────────────────────────

interface CutxStore {
  projects: Project[];
  activeProjectId: string | null;
  isOptimizing: boolean;
  isSaving: boolean;
  isLoadingProjects: boolean;
  canvasState: CanvasState;
  leftSidebarCollapsed: boolean;
  rightSidebarCollapsed: boolean;

  loadProjects: () => Promise<void>;
  createProject: (name: string, description?: string) => Promise<Project>;
  selectProject: (id: string) => void;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  duplicateProject: (id: string) => Promise<void>;
  getActiveProject: () => Project | null;

  updateSheet: (projectId: string, sheet: Sheet) => Promise<void>;
  updateSettings: (projectId: string, settings: Partial<ProjectSettings>) => Promise<void>;

  addCuttingItem: (projectId: string, item?: Partial<CuttingItem>) => Promise<void>;
  updateCuttingItem: (projectId: string, itemId: string, updates: Partial<CuttingItem>) => Promise<void>;
  deleteCuttingItem: (projectId: string, itemId: string) => Promise<void>;
  duplicateCuttingItem: (projectId: string, itemId: string) => Promise<void>;
  importCuttingItems: (projectId: string, items: Omit<CuttingItem, 'id'>[]) => Promise<void>;

  runOptimization: (projectId: string) => Promise<void>;
  updateCanvasState: (updates: Partial<CanvasState>) => void;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
}

// ─── Helper: persist project ──────────────────

async function persist(project: Project) {
  try {
    const { saveProject } = await import('@/lib/db/local');
    await saveProject(project);
  } catch (e) {
    console.warn('Failed to persist project:', e);
  }
}

// ─── Store ────────────────────────────────────

export const useStore = create<CutxStore>()(
  subscribeWithSelector((set, get) => ({
    projects: [],
    activeProjectId: null,
    isOptimizing: false,
    isSaving: false,
    isLoadingProjects: false,
    canvasState: { ...DEFAULT_CANVAS_STATE },
    leftSidebarCollapsed: false,
    rightSidebarCollapsed: false,

    // ─── Projects ───────────────────────────

    loadProjects: async () => {
      set({ isLoadingProjects: true });
      try {
        const { getAllProjects } = await import('@/lib/db/local');
        const projects = await getAllProjects();
        set({
          projects,
          isLoadingProjects: false,
          activeProjectId: projects[0]?.id ?? null,
        });
      } catch {
        set({ isLoadingProjects: false });
      }
    },

    createProject: async (name, description) => {
      const now = new Date().toISOString();
      const project: Project = {
        id: generateId(),
        name,
        description,
        tags: [],
        createdAt: now,
        updatedAt: now,
        settings: { ...DEFAULT_SETTINGS },
        sheets: [{
          id: generateId(),
          name: 'Sheet 1',
          material: 'plywood',
          width: 2440,
          height: 1220,
          thickness: 18,
          quantity: 10,
        }],
        cuttingList: [],
        isLocal: true,
      };
      await persist(project);
      set((s) => ({
        projects: [project, ...s.projects],
        activeProjectId: project.id,
        canvasState: { ...DEFAULT_CANVAS_STATE },
      }));
      return project;
    },

    selectProject: (id) => {
      set({ activeProjectId: id, canvasState: { ...DEFAULT_CANVAS_STATE } });
    },

    updateProject: async (id, updates) => {
      set((s) => ({
        projects: s.projects.map((p) =>
          p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
        ),
      }));
      const project = get().projects.find((p) => p.id === id);
      if (project) await persist(project);
    },

    deleteProject: async (id) => {
      try {
        const { deleteProject: dbDel } = await import('@/lib/db/local');
        await dbDel(id);
      } catch {}
      set((s) => {
        const projects = s.projects.filter((p) => p.id !== id);
        return {
          projects,
          activeProjectId: s.activeProjectId === id ? (projects[0]?.id ?? null) : s.activeProjectId,
        };
      });
    },

    duplicateProject: async (id) => {
      const { duplicateProject: dbDup } = await import('@/lib/db/local');
      const original = get().projects.find((p) => p.id === id);
      if (!original) return;
      const copy = await dbDup(id, `${original.name} (Copy)`);
      if (copy) set((s) => ({ projects: [copy, ...s.projects] }));
    },

    getActiveProject: () => {
      const { projects, activeProjectId } = get();
      return projects.find((p) => p.id === activeProjectId) ?? null;
    },

    // ─── Sheet & Settings ────────────────────

    updateSheet: async (projectId, sheet) => {
      set((s) => ({
        projects: s.projects.map((p) =>
          p.id === projectId
            ? { ...p, sheets: [sheet], updatedAt: new Date().toISOString() }
            : p
        ),
      }));
      const project = get().projects.find((p) => p.id === projectId);
      if (project) await persist(project);
    },

    updateSettings: async (projectId, updates) => {
      set((s) => ({
        projects: s.projects.map((p) =>
          p.id === projectId
            ? { ...p, settings: { ...p.settings, ...updates }, updatedAt: new Date().toISOString() }
            : p
        ),
      }));
      const project = get().projects.find((p) => p.id === projectId);
      if (project) await persist(project);
    },

    // ─── Cutting List ────────────────────────

    addCuttingItem: async (projectId, partial) => {
      const item: CuttingItem = {
        id: generateId(),
        label: 'New Part',
        width: 400,
        height: 300,
        quantity: 1,
        allowRotation: true,
        sectionTag: '',
        ...partial,
      };
      set((s) => ({
        projects: s.projects.map((p) =>
          p.id === projectId
            ? { ...p, cuttingList: [...p.cuttingList, item], updatedAt: new Date().toISOString() }
            : p
        ),
      }));
      const project = get().projects.find((p) => p.id === projectId);
      if (project) await persist(project);
    },

    updateCuttingItem: async (projectId, itemId, updates) => {
      set((s) => ({
        projects: s.projects.map((p) =>
          p.id === projectId
            ? {
                ...p,
                cuttingList: p.cuttingList.map((i) =>
                  i.id === itemId ? { ...i, ...updates } : i
                ),
                updatedAt: new Date().toISOString(),
              }
            : p
        ),
      }));
      const project = get().projects.find((p) => p.id === projectId);
      if (project) await persist(project);
    },

    deleteCuttingItem: async (projectId, itemId) => {
      set((s) => ({
        projects: s.projects.map((p) =>
          p.id === projectId
            ? {
                ...p,
                cuttingList: p.cuttingList.filter((i) => i.id !== itemId),
                updatedAt: new Date().toISOString(),
              }
            : p
        ),
      }));
      const project = get().projects.find((p) => p.id === projectId);
      if (project) await persist(project);
    },

    duplicateCuttingItem: async (projectId, itemId) => {
      set((s) => ({
        projects: s.projects.map((p) => {
          if (p.id !== projectId) return p;
          const item = p.cuttingList.find((i) => i.id === itemId);
          if (!item) return p;
          const copy: CuttingItem = { ...item, id: generateId(), label: `${item.label} (Copy)` };
          return { ...p, cuttingList: [...p.cuttingList, copy], updatedAt: new Date().toISOString() };
        }),
      }));
      const project = get().projects.find((p) => p.id === projectId);
      if (project) await persist(project);
    },

    importCuttingItems: async (projectId, items) => {
      const withIds = items.map((i) => ({ ...i, id: generateId() }));
      set((s) => ({
        projects: s.projects.map((p) =>
          p.id === projectId
            ? {
                ...p,
                cuttingList: [...p.cuttingList, ...withIds],
                updatedAt: new Date().toISOString(),
              }
            : p
        ),
      }));
      const project = get().projects.find((p) => p.id === projectId);
      if (project) await persist(project);
    },

    // ─── Optimization ────────────────────────

    runOptimization: async (projectId) => {
      const project = get().projects.find((p) => p.id === projectId);
      if (!project || !project.sheets.length || !project.cuttingList.length) return;

      set({ isOptimizing: true });
      try {
        await new Promise((r) => setTimeout(r, 60)); // yield to UI
        const { runGuillotineOptimization } = await import('@/lib/optimization/guillotine');
        const result = runGuillotineOptimization(project.sheets, project.cuttingList, project.settings);

        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? { ...p, optimizationResult: result, updatedAt: new Date().toISOString() }
              : p
          ),
          isOptimizing: false,
          canvasState: { ...get().canvasState, activeSheetIndex: 0 },
        }));

        const updated = get().projects.find((p) => p.id === projectId);
        if (updated) await persist(updated);
      } catch (e) {
        console.error('Optimization failed:', e);
        set({ isOptimizing: false });
      }
    },

    // ─── Canvas ──────────────────────────────

    updateCanvasState: (updates) => {
      set((s) => ({ canvasState: { ...s.canvasState, ...updates } }));
    },

    // ─── UI ──────────────────────────────────

    toggleLeftSidebar: () => set((s) => ({ leftSidebarCollapsed: !s.leftSidebarCollapsed })),
    toggleRightSidebar: () => set((s) => ({ rightSidebarCollapsed: !s.rightSidebarCollapsed })),
  }))
);

// ─── Selectors ────────────────────────────────

export const selectActiveProject = (s: CutxStore) =>
  s.projects.find((p) => p.id === s.activeProjectId) ?? null;

export const selectActiveSheet = (s: CutxStore) =>
  selectActiveProject(s)?.sheets[0] ?? null;

export const selectOptimizationResult = (s: CutxStore) =>
  selectActiveProject(s)?.optimizationResult ?? null;
