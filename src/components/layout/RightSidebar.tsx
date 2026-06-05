'use client';

import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore, selectOptimizationResult, selectActiveSheet } from '@/store';
import { MetricsPanel } from '@/components/metrics/MetricsPanel';
import { cn } from '@/lib/utils';

export function RightSidebar() {
  const { rightSidebarCollapsed, toggleRightSidebar } = useStore();

  return (
    <motion.aside
      animate={{ width: rightSidebarCollapsed ? 0 : 280 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="relative flex flex-col h-full bg-surface border-l border-border overflow-hidden shrink-0"
    >
      {!rightSidebarCollapsed && (
        <div className="flex flex-col h-full overflow-y-auto">
          <MetricsPanel />
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={toggleRightSidebar}
        className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-6 h-12 bg-surface border border-border rounded-l-lg flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-background transition-all shadow-soft"
      >
        {rightSidebarCollapsed ? (
          <ChevronLeft className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
      </button>
    </motion.aside>
  );
}
