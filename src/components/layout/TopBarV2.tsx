'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen, Zap, Settings, ChevronDown,
  BarChart2, Grid, LayoutTemplate,
} from 'lucide-react';
import { useStore, selectActiveProject } from '@/store';
import { openProjectsModal } from '@/components/projects/ProjectsModal';
import { runAdvancedOptimizationForProject } from '@/store/phase2';
import { formatRelativeTime, cn } from '@/lib/utils';
import Link from 'next/link';

export function TopBar() {
  const { activeProjectId, isOptimizing, isSaving } = useStore();
  const activeProject = useStore(selectActiveProject);
  const [showGrid, setShowGrid] = useState(false);

  const handleOptimize = () => {
    if (activeProjectId) runAdvancedOptimizationForProject(activeProjectId);
  };

  const hasResult = !!activeProject?.optimizationResult;

  return (
    <header className="h-14 bg-surface border-b border-border flex items-center px-4 gap-3 shrink-0 z-40">
      {/* Logo */}
      <button
        onClick={openProjectsModal}
        className="flex items-center gap-2.5 shrink-0 hover:opacity-70 transition-opacity"
      >
        <div className="w-7 h-7 bg-black rounded-xl flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 3h10M2 6h7M2 9h10M2 12h7" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </div>
        <span className="text-[13px] font-semibold tracking-tight text-text-primary hidden md:block">
          CUTX ULTRA
        </span>
      </button>

      <div className="w-px h-5 bg-border shrink-0" />

      {/* Project selector */}
      <button
        onClick={openProjectsModal}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-background transition-colors group max-w-[200px]"
      >
        <FolderOpen className="w-3.5 h-3.5 text-text-tertiary group-hover:text-text-primary transition-colors shrink-0" />
        <span className="text-sm font-medium text-text-primary truncate">
          {activeProject?.name ?? 'Select Project'}
        </span>
        <ChevronDown className="w-3 h-3 text-text-tertiary shrink-0" />
      </button>

      <div className="flex-1" />

      {/* Saving */}
      <AnimatePresence>
        {isSaving && (
          <motion.span
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-xs text-text-tertiary hidden sm:block"
          >
            Saving…
          </motion.span>
        )}
      </AnimatePresence>

      {/* Efficiency badge */}
      {hasResult && (
        <div className={cn(
          'hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold',
          activeProject!.optimizationResult!.overallEfficiency > 80
            ? 'bg-success/10 text-success'
            : activeProject!.optimizationResult!.overallEfficiency > 60
            ? 'bg-warning/10 text-warning'
            : 'bg-error/10 text-error'
        )}>
          {activeProject!.optimizationResult!.overallEfficiency.toFixed(1)}% efficient
        </div>
      )}

      {/* Grid view toggle */}
      {hasResult && (
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={cn(
            'p-2 rounded-lg transition-all',
            showGrid
              ? 'bg-black text-white'
              : 'text-text-tertiary hover:text-text-primary hover:bg-background'
          )}
          title="Sheet grid overview"
        >
          <Grid className="w-4 h-4" />
        </button>
      )}

      {/* Analytics */}
      <Link
        href="/analytics"
        className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-background transition-all hidden sm:flex"
        title="Analytics"
      >
        <BarChart2 className="w-4 h-4" />
      </Link>

      {/* Optimize */}
      <button
        onClick={handleOptimize}
        disabled={!activeProjectId || isOptimizing}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-black text-white hover:bg-neutral-800 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        {isOptimizing ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
              className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full"
            />
            <span className="hidden sm:block">Optimizing…</span>
          </>
        ) : (
          <>
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden sm:block">Optimize</span>
          </>
        )}
      </button>

      {/* Settings */}
      <button className="w-8 h-8 flex items-center justify-center rounded-lg text-text-tertiary hover:text-text-primary hover:bg-background transition-all">
        <Settings className="w-4 h-4" />
      </button>
    </header>
  );
}
