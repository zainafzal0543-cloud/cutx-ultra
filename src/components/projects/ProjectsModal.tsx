'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Search, Trash2, Copy, FolderOpen, Clock, Tag } from 'lucide-react';
import { useStore, selectActiveProject } from '@/store';
import type { Project } from '@/types';
import { cn, formatRelativeTime, truncate } from '@/lib/utils';

// Global toggle — controlled by TopBar "CUTX ULTRA" logo click
let _setOpen: ((v: boolean) => void) | null = null;
export function openProjectsModal() { _setOpen?.(true); }

export function ProjectsModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  _setOpen = setOpen;

  const {
    projects,
    activeProjectId,
    isLoadingProjects,
    selectProject,
    createProject,
    deleteProject,
    duplicateProject,
  } = useStore();

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
  );

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createProject(newName.trim());
    setNewName('');
    setCreating(false);
    setOpen(false);
  };

  const handleSelect = (id: string) => {
    selectProject(id);
    setOpen(false);
  };

  // Open on no active project
  useEffect(() => {
    if (projects.length === 0 && !isLoadingProjects) {
      setOpen(true);
    }
  }, [projects.length, isLoadingProjects]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-surface rounded-3xl shadow-modal overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div>
                <h2 className="text-base font-semibold text-text-primary">Projects</h2>
                <p className="text-xs text-text-tertiary mt-0.5">
                  {projects.length} project{projects.length !== 1 ? 's' : ''} saved locally
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-text-tertiary hover:bg-background transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search + Create */}
            <div className="px-6 py-4 border-b border-border space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search projects…"
                  className="w-full pl-9 pr-4 py-2.5 bg-background rounded-xl text-sm outline-none border border-transparent focus:border-border transition-colors placeholder:text-text-tertiary"
                />
              </div>

              <AnimatePresence mode="wait">
                {creating ? (
                  <motion.div
                    key="create-form"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex gap-2"
                  >
                    <input
                      autoFocus
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreate();
                        if (e.key === 'Escape') setCreating(false);
                      }}
                      placeholder="Project name…"
                      className="flex-1 px-3 py-2.5 bg-background rounded-xl text-sm outline-none border border-border focus:border-text-secondary transition-colors"
                    />
                    <button
                      onClick={handleCreate}
                      disabled={!newName.trim()}
                      className="px-4 py-2.5 bg-black text-white rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-neutral-800 transition-colors"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => setCreating(false)}
                      className="px-3 py-2.5 bg-background rounded-xl text-sm text-text-secondary hover:bg-border/50 transition-colors"
                    >
                      Cancel
                    </button>
                  </motion.div>
                ) : (
                  <motion.button
                    key="create-btn"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => setCreating(true)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-border text-sm text-text-secondary hover:border-text-tertiary hover:text-text-primary transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    New Project
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Project list */}
            <div className="max-h-80 overflow-y-auto px-3 py-3 space-y-1">
              {isLoadingProjects ? (
                // Shimmer
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-3 rounded-xl">
                    <div className="w-10 h-10 rounded-xl shimmer shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 rounded shimmer w-3/4" />
                      <div className="h-2.5 rounded shimmer w-1/2" />
                    </div>
                  </div>
                ))
              ) : filtered.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-text-tertiary">
                    {query ? `No projects matching "${query}"` : 'No projects yet'}
                  </p>
                </div>
              ) : (
                filtered.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    isActive={project.id === activeProjectId}
                    onSelect={handleSelect}
                    onDelete={deleteProject}
                    onDuplicate={duplicateProject}
                  />
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Project Card ─────────────────────────────

interface ProjectCardProps {
  project: Project;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  onDuplicate: (id: string) => Promise<void>;
}

function ProjectCard({ project, isActive, onSelect, onDelete, onDuplicate }: ProjectCardProps) {
  const [hovered, setHovered] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const pieceCount = project.cuttingList.reduce((s, i) => s + i.quantity, 0);
  const efficiency = project.optimizationResult?.overallEfficiency;

  return (
    <motion.div
      layout
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirmDelete(false); }}
      onClick={() => onSelect(project.id)}
      className={cn(
        'flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all',
        isActive
          ? 'bg-black/5 border border-black/10'
          : 'hover:bg-background border border-transparent'
      )}
    >
      {/* Icon */}
      <div className={cn(
        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors',
        isActive ? 'bg-black text-white' : 'bg-background border border-border text-text-tertiary'
      )}>
        <FolderOpen className="w-4 h-4" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary truncate">{project.name}</span>
          {isActive && (
            <span className="text-[10px] bg-black text-white px-1.5 py-0.5 rounded-md font-semibold shrink-0">
              ACTIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-text-tertiary flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(project.updatedAt)}
          </span>
          {pieceCount > 0 && (
            <span className="text-xs text-text-tertiary">
              {pieceCount} piece{pieceCount !== 1 ? 's' : ''}
            </span>
          )}
          {efficiency !== undefined && (
            <span className={cn(
              'text-xs font-medium',
              efficiency > 80 ? 'text-success' : efficiency > 60 ? 'text-warning' : 'text-error'
            )}>
              {efficiency.toFixed(0)}% eff.
            </span>
          )}
        </div>
        {project.tags.length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {project.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="tag-pill">{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => onDuplicate(project.id)}
              className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-background transition-all"
              title="Duplicate"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>

            {confirmDelete ? (
              <button
                onClick={() => onDelete(project.id)}
                className="px-2 py-1.5 rounded-lg text-xs font-semibold text-white bg-error hover:bg-red-600 transition-colors"
              >
                Confirm
              </button>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-1.5 rounded-lg text-text-tertiary hover:text-error hover:bg-error/10 transition-all"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
