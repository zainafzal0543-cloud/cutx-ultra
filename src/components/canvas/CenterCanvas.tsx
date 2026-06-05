'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn, ZoomOut, Maximize2, ChevronLeft, ChevronRight, Grid } from 'lucide-react';
import { useStore, selectActiveProject, selectOptimizationResult } from '@/store';
import { useCanvasControls } from '@/hooks/useCanvasControls';
import { useTouchGestures } from '@/hooks/usePerformance';
import { OptimizationCanvas } from './OptimizationCanvas';
import { EmptyCanvasState } from './EmptyCanvasState';
import { OptimizingOverlay } from './OptimizingOverlay';
import { SheetGrid } from './SheetGrid';
import { cn } from '@/lib/utils';

export function CenterCanvas() {
  const activeProject = useStore(selectActiveProject);
  const result = useStore(selectOptimizationResult);
  const { isOptimizing, canvasState, updateCanvasState } = useStore();
  const { zoomIn, zoomOut, resetView, setZoom, zoom, pan } = useCanvasControls();

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [showGrid, setShowGrid] = useState(false);

  // Measure container
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ width: Math.max(width, 100), height: Math.max(height, 100) });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Touch gestures
  const { handleTouchStart, handleTouchMove, handleTouchEnd } = useTouchGestures(
    (dx, dy) => updateCanvasState({ panX: canvasState.panX + dx, panY: canvasState.panY + dy }),
    setZoom,
    zoom
  );

  const handleOptimize = () => {
    if (activeProject) {
      const { runAdvancedOptimizationForProject } = require('@/store/phase2');
      runAdvancedOptimizationForProject(activeProject.id);
    }
  };

  const totalSheets = result?.totalSheets ?? 0;
  const activeSheet = canvasState.activeSheetIndex;

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      {/* Canvas area */}
      <div
        ref={containerRef}
        className="flex-1 canvas-container relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait">
          {isOptimizing ? (
            <OptimizingOverlay key="optimizing" />
          ) : showGrid && result ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full h-full overflow-y-auto"
            >
              <SheetGrid
                result={result}
                sheet={activeProject!.sheets[0]}
                settings={activeProject!.settings}
                activeIndex={activeSheet}
                onSelectSheet={idx => {
                  updateCanvasState({ activeSheetIndex: idx });
                  setShowGrid(false);
                }}
              />
            </motion.div>
          ) : result && result.sheets.length > 0 && activeProject?.sheets[0] && activeProject?.settings ? (
            <motion.div key="canvas" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full">
              <OptimizationCanvas
                result={result}
                sheet={activeProject.sheets[0]}
                settings={activeProject.settings}
                containerSize={containerSize}
                activeSheetIndex={activeSheet}
                zoom={canvasState.zoom}
                panX={canvasState.panX}
                panY={canvasState.panY}
                onPanChange={(panX, panY) => updateCanvasState({ panX, panY })}
              />
            </motion.div>
          ) : (
            <EmptyCanvasState key="empty" onOptimize={handleOptimize} />
          )}
        </AnimatePresence>
      </div>

      {/* Bottom toolbar */}
      <div className="h-10 bg-surface border-t border-border flex items-center px-3 gap-2 shrink-0">
        {/* Sheet tabs */}
        {totalSheets > 1 && !showGrid && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => updateCanvasState({ activeSheetIndex: Math.max(0, activeSheet - 1) })}
              disabled={activeSheet === 0}
              className="p-1 rounded text-text-tertiary hover:text-text-primary disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: Math.min(totalSheets, 10) }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => updateCanvasState({ activeSheetIndex: i })}
                  className={cn(
                    'min-w-[24px] h-6 px-1.5 rounded text-xs font-medium transition-all',
                    i === activeSheet ? 'bg-black text-white' : 'text-text-tertiary hover:bg-background'
                  )}
                >
                  {i + 1}
                </button>
              ))}
              {totalSheets > 10 && (
                <span className="text-xs text-text-tertiary px-1">+{totalSheets - 10}</span>
              )}
            </div>
            <button
              onClick={() => updateCanvasState({ activeSheetIndex: Math.min(totalSheets - 1, activeSheet + 1) })}
              disabled={activeSheet >= totalSheets - 1}
              className="p-1 rounded text-text-tertiary hover:text-text-primary disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex-1" />

        {/* Result summary */}
        {result && (
          <span className="text-xs text-text-tertiary hidden sm:block">
            {result.totalSheets} sheet{result.totalSheets !== 1 ? 's' : ''} ·{' '}
            {result.overallEfficiency.toFixed(1)}% · {result.processingTimeMs.toFixed(0)}ms
          </span>
        )}

        {/* Grid toggle */}
        {totalSheets > 1 && (
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={cn(
              'p-1.5 rounded transition-all',
              showGrid ? 'bg-black text-white' : 'text-text-tertiary hover:text-text-primary hover:bg-background'
            )}
            title="Sheet grid overview"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="w-px h-4 bg-border" />

        {/* Zoom */}
        <div className="flex items-center gap-0.5">
          <button onClick={zoomOut} className="p-1.5 rounded text-text-tertiary hover:text-text-primary hover:bg-background transition-all">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button onClick={resetView} className="px-2 py-1 rounded text-xs font-mono text-text-secondary hover:bg-background transition-all w-12 text-center">
            {Math.round(zoom * 100)}%
          </button>
          <button onClick={zoomIn} className="p-1.5 rounded text-text-tertiary hover:text-text-primary hover:bg-background transition-all">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button onClick={resetView} className="p-1.5 rounded text-text-tertiary hover:text-text-primary hover:bg-background transition-all">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
