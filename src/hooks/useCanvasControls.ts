// ─────────────────────────────────────────────
// useCanvasControls — zoom, pan, fit-to-screen
// ─────────────────────────────────────────────

import { useCallback, useEffect } from 'react';
import { useStore } from '@/store';
import { clamp } from '@/lib/utils';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.1;
const WHEEL_SENSITIVITY = 0.001;

export function useCanvasControls() {
  const { canvasState, updateCanvasState } = useStore();

  const zoomIn = useCallback(() => {
    updateCanvasState({ zoom: clamp(canvasState.zoom + ZOOM_STEP, MIN_ZOOM, MAX_ZOOM) });
  }, [canvasState.zoom, updateCanvasState]);

  const zoomOut = useCallback(() => {
    updateCanvasState({ zoom: clamp(canvasState.zoom - ZOOM_STEP, MIN_ZOOM, MAX_ZOOM) });
  }, [canvasState.zoom, updateCanvasState]);

  const setZoom = useCallback((zoom: number) => {
    updateCanvasState({ zoom: clamp(zoom, MIN_ZOOM, MAX_ZOOM) });
  }, [updateCanvasState]);

  const resetView = useCallback(() => {
    updateCanvasState({ zoom: 1, panX: 0, panY: 0 });
  }, [updateCanvasState]);

  const zoomToFit = useCallback(() => {
    updateCanvasState({ zoom: 0.9, panX: 0, panY: 0 });
  }, [updateCanvasState]);

  const pan = useCallback((dx: number, dy: number) => {
    updateCanvasState({
      panX: canvasState.panX + dx,
      panY: canvasState.panY + dy,
    });
  }, [canvasState.panX, canvasState.panY, updateCanvasState]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Don't fire if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.metaKey || e.ctrlKey) && e.key === '=') { e.preventDefault(); zoomIn(); }
      if ((e.metaKey || e.ctrlKey) && e.key === '-') { e.preventDefault(); zoomOut(); }
      if ((e.metaKey || e.ctrlKey) && e.key === '0') { e.preventDefault(); resetView(); }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [zoomIn, zoomOut, resetView]);

  return {
    zoom: canvasState.zoom,
    panX: canvasState.panX,
    panY: canvasState.panY,
    zoomIn,
    zoomOut,
    setZoom,
    resetView,
    zoomToFit,
    pan,
  };
}
