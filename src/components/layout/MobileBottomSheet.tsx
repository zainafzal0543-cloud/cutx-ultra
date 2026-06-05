'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { ChevronUp, Zap, Layers, List, X } from 'lucide-react';
import { useStore, selectActiveProject, selectOptimizationResult } from '@/store';
import { runAdvancedOptimizationForProject } from '@/store/phase2';
import { openProjectsModal } from '@/components/projects/ProjectsModal';
import { cn } from '@/lib/utils';

type MobileTab = 'sheet' | 'parts' | 'metrics';

export function MobileBottomSheet() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<MobileTab>('sheet');
  const { activeProjectId, isOptimizing } = useStore();
  const activeProject = useStore(selectActiveProject);
  const result = useStore(selectOptimizationResult);

  const handleOptimize = () => {
    if (activeProjectId) {
      runAdvancedOptimizationForProject(activeProjectId);
      setOpen(false);
    }
  };

  return (
    <>
      {/* Floating action bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border">
        <div className="flex items-center gap-2 px-4 py-3">
          {/* Project name */}
          <button
            onClick={openProjectsModal}
            className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-background text-sm font-medium text-text-secondary"
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span className="truncate">{activeProject?.name ?? 'No Project'}</span>
          </button>

          {/* Sheet config */}
          <button
            onClick={() => { setActiveTab('sheet'); setOpen(true); }}
            className="p-2.5 rounded-xl bg-background text-text-secondary"
          >
            <Layers className="w-4 h-4" />
          </button>

          {/* Parts */}
          <button
            onClick={() => { setActiveTab('parts'); setOpen(true); }}
            className="p-2.5 rounded-xl bg-background text-text-secondary"
          >
            <List className="w-4 h-4" />
          </button>

          {/* Optimize */}
          <button
            onClick={handleOptimize}
            disabled={!activeProjectId || isOptimizing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black text-white text-sm font-semibold disabled:opacity-40"
          >
            {isOptimizing ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
              />
            ) : (
              <Zap className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Bottom sheet */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="md:hidden fixed inset-0 bg-black/20 z-50"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface rounded-t-3xl shadow-modal"
              style={{ maxHeight: '80vh' }}
            >
              {/* Handle */}
              <div className="flex items-center justify-between px-5 pt-4 pb-3">
                <div className="w-10 h-1 bg-border rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-3" />
                <div className="flex gap-4 mt-2">
                  {([
                    { id: 'sheet' as MobileTab, label: 'Sheet' },
                    { id: 'parts' as MobileTab, label: 'Parts' },
                    { id: 'metrics' as MobileTab, label: 'Metrics' },
                  ]).map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'text-sm font-medium pb-1 border-b-2 transition-all',
                        activeTab === tab.id
                          ? 'text-text-primary border-black'
                          : 'text-text-tertiary border-transparent'
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <button onClick={() => setOpen(false)} className="text-text-tertiary ml-auto">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 60px)' }}>
                {activeTab === 'sheet' && (
                  <div className="pb-32">
                    {/* SheetSpecPanel inlined — import lazily in real app */}
                    <div className="px-5 py-4 text-sm text-text-secondary">
                      Sheet configuration — use the desktop sidebar for full controls.
                    </div>
                  </div>
                )}
                {activeTab === 'parts' && (
                  <div className="pb-32">
                    <div className="px-5 py-4 text-sm text-text-secondary">
                      {activeProject?.cuttingList.length ?? 0} parts in cutting list.
                    </div>
                  </div>
                )}
                {activeTab === 'metrics' && result && (
                  <div className="px-5 py-4 space-y-3 pb-32">
                    {[
                      { label: 'Efficiency', value: `${result.overallEfficiency.toFixed(1)}%` },
                      { label: 'Sheets Used', value: result.totalSheets },
                      { label: 'Parts Placed', value: result.sheets.reduce((s, sh) => s + sh.pieces.length, 0) },
                      { label: 'Unplaced', value: result.unplacedItems.length },
                    ].map(m => (
                      <div key={m.label} className="flex justify-between py-2 border-b border-border">
                        <span className="text-sm text-text-secondary">{m.label}</span>
                        <span className="text-sm font-semibold text-text-primary">{m.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
