'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers, List, Package, Download, Share2,
  ChevronLeft, ChevronRight, SlidersHorizontal,
  Sparkles, Cpu,
} from 'lucide-react';
import { useStore } from '@/store';
import { SheetSpecPanel } from '@/components/cutting/SheetSpecPanel';
import { VirtualizedCuttingList } from '@/components/cutting/VirtualizedCuttingList';
import { RemnantsPanel } from '@/components/remnants/RemnantsPanel';
import { ExportPanel } from '@/components/export/ExportPanel';
import { SharePanel } from '@/components/sharing/SharePanel';
import { OptimizationModeSelector } from '@/components/canvas/OptimizationModeSelector';
import { SmartSuggestionsPanel } from '@/components/ai/SmartSuggestionsPanel';
import { CNCExportPanel } from '@/components/cnc/CNCExportPanel';
import { usePhase2Settings } from '@/store/phase2';
import { cn } from '@/lib/utils';

type Tab = 'sheet' | 'cutting' | 'mode' | 'ai' | 'cnc' | 'remnants' | 'export' | 'share';

const TABS: { id: Tab; icon: React.ReactNode; label: string }[] = [
  { id: 'sheet',    icon: <Layers className="w-3.5 h-3.5" />,              label: 'Sheet' },
  { id: 'cutting',  icon: <List className="w-3.5 h-3.5" />,                label: 'Parts' },
  { id: 'mode',     icon: <SlidersHorizontal className="w-3.5 h-3.5" />,  label: 'Mode' },
  { id: 'ai',       icon: <Sparkles className="w-3.5 h-3.5" />,           label: 'AI' },
  { id: 'cnc',      icon: <Cpu className="w-3.5 h-3.5" />,                label: 'CNC' },
  { id: 'remnants', icon: <Package className="w-3.5 h-3.5" />,            label: 'Stock' },
  { id: 'export',   icon: <Download className="w-3.5 h-3.5" />,           label: 'Export' },
  { id: 'share',    icon: <Share2 className="w-3.5 h-3.5" />,             label: 'Share' },
];

export function LeftSidebar() {
  const { leftSidebarCollapsed, toggleLeftSidebar } = useStore();
  const [activeTab, setActiveTab] = useState<Tab>('sheet');
  const [phase2Settings, setPhase2Settings] = usePhase2Settings();

  return (
    <motion.aside
      animate={{ width: leftSidebarCollapsed ? 0 : 320 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="relative flex flex-col h-full bg-surface border-r border-border overflow-hidden shrink-0"
    >
      {!leftSidebarCollapsed && (
        <div className="flex flex-col h-full">
          <div className="flex items-center border-b border-border px-1.5 pt-1.5 gap-0 overflow-x-auto scrollbar-none">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1 px-2 py-2 text-[11px] font-medium rounded-t-lg transition-all whitespace-nowrap shrink-0',
                  activeTab === tab.id
                    ? 'text-text-primary bg-background border-b-2 border-b-black -mb-px'
                    : 'text-text-tertiary hover:text-text-secondary'
                )}
              >
                {tab.icon}
                <span className="hidden lg:block">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div key={activeTab}
                initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="h-full overflow-y-auto"
              >
                {activeTab === 'sheet'    && <SheetSpecPanel />}
                {activeTab === 'cutting'  && <VirtualizedCuttingList />}
                {activeTab === 'mode'     && <div className="p-5"><OptimizationModeSelector settings={phase2Settings} onChange={setPhase2Settings} /></div>}
                {activeTab === 'ai'       && <SmartSuggestionsPanel />}
                {activeTab === 'cnc'      && <CNCExportPanel />}
                {activeTab === 'remnants' && <RemnantsPanel />}
                {activeTab === 'export'   && <ExportPanel />}
                {activeTab === 'share'    && <SharePanel />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}

      <button onClick={toggleLeftSidebar}
        className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-12 bg-surface border border-border rounded-r-lg flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-background transition-all shadow-soft">
        {leftSidebarCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </motion.aside>
  );
}
