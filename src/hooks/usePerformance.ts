// ─────────────────────────────────────────────
// Performance Hooks — CUTX ULTRA Phase 2
// Memoized selectors, debounced updates, lazy loading
// ─────────────────────────────────────────────

import { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { useStore } from '@/store';
import type { CuttingItem, OptimizationResult } from '@/types';
import { toMM } from '@/lib/utils/units';
import { debounce } from '@/lib/utils';

// ─── Memoized metrics computation ────────────

export function useOptimizationMetrics() {
  const result = useStore(s => s.projects.find(p => p.id === s.activeProjectId)?.optimizationResult);
  const sheet  = useStore(s => s.projects.find(p => p.id === s.activeProjectId)?.sheets[0]);
  const unit   = useStore(s => s.projects.find(p => p.id === s.activeProjectId)?.settings.unit ?? 'mm');

  return useMemo(() => {
    if (!result || !sheet) return null;
    const sheetArea = toMM(sheet.width, unit) * toMM(sheet.height, unit);
    return {
      totalSheets:      result.totalSheets,
      totalArea:        sheetArea * result.totalSheets,
      usedArea:         result.totalUsedArea,
      wasteArea:        result.totalWasteArea,
      efficiency:       result.overallEfficiency,
      totalPieces:      result.sheets.reduce((s, sh) => s + sh.pieces.length, 0),
      unplacedPieces:   result.unplacedItems.length,
      processingTimeMs: result.processingTimeMs,
      perSheet:         result.sheets.map(sh => ({
        index:      sh.index,
        efficiency: sh.efficiency,
        pieces:     sh.pieces.length,
        usedArea:   sh.usedArea,
        wasteArea:  sh.wasteArea,
      })),
    };
  }, [result, sheet, unit]);
}

// ─── Debounced cutting item update ────────────

export function useDebouncedUpdate(projectId: string | null, delay = 300) {
  const updateCuttingItem = useStore(s => s.updateCuttingItem);

  return useCallback(
    debounce((itemId: string, field: keyof CuttingItem, value: unknown) => {
      if (projectId) updateCuttingItem(projectId, itemId, { [field]: value } as any);
    }, delay),
    [projectId, updateCuttingItem, delay]
  ) as (itemId: string, field: keyof CuttingItem, value: unknown) => void;
}

// ─── Intersection-based lazy canvas rendering ─

export function useVisibleCanvas(containerRef: React.RefObject<HTMLElement>) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      entries => setIsVisible(entries[0].isIntersecting),
      { threshold: 0.01 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return isVisible;
}

// ─── Stable piece color map ───────────────────

export function usePieceColorMap(result: OptimizationResult | null, sheetIndex: number) {
  return useMemo(() => {
    const map = new Map<string, number>();
    if (!result) return map;
    const sheet = result.sheets[sheetIndex];
    if (!sheet) return map;
    sheet.pieces.forEach(p => {
      if (!map.has(p.itemId)) map.set(p.itemId, map.size);
    });
    return map;
  }, [result, sheetIndex]);
}

// ─── Touch gesture support ───────────────────

interface TouchState {
  startX: number; startY: number;
  startPinchDist: number;
  startZoom: number;
}

export function useTouchGestures(
  onPan: (dx: number, dy: number) => void,
  onZoom: (zoom: number) => void,
  currentZoom: number
) {
  const touchState = useRef<TouchState | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchState.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        startPinchDist: 0,
        startZoom: currentZoom,
      };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      touchState.current = {
        startX: 0, startY: 0,
        startPinchDist: dist,
        startZoom: currentZoom,
      };
    }
  }, [currentZoom]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (!touchState.current) return;

    if (e.touches.length === 1 && touchState.current.startPinchDist === 0) {
      const dx = e.touches[0].clientX - touchState.current.startX;
      const dy = e.touches[0].clientY - touchState.current.startY;
      onPan(dx, dy);
      touchState.current.startX = e.touches[0].clientX;
      touchState.current.startY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const scale = dist / touchState.current.startPinchDist;
      const newZoom = Math.max(0.1, Math.min(5, touchState.current.startZoom * scale));
      onZoom(newZoom);
    }
  }, [onPan, onZoom]);

  const handleTouchEnd = useCallback(() => {
    touchState.current = null;
  }, []);

  return { handleTouchStart, handleTouchMove, handleTouchEnd };
}

// ─── Window size hook ─────────────────────────

export function useWindowSize() {
  const [size, setSize] = useState({ width: 1200, height: 800 });

  useEffect(() => {
    const update = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return size;
}

// ─── Mobile detection ─────────────────────────

export function useIsMobile() {
  const { width } = useWindowSize();
  return width < 768;
}

export function useIsTablet() {
  const { width } = useWindowSize();
  return width >= 768 && width < 1024;
}
