'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { OptimizationResult, Sheet, ProjectSettings, PlacedPiece } from '@/types';
import { toMM } from '@/lib/utils/units';
import { cn } from '@/lib/utils';

// Dynamically import Konva to avoid SSR issues
const Stage = dynamic(() => import('react-konva').then(m => m.Stage), { ssr: false });
const Layer = dynamic(() => import('react-konva').then(m => m.Layer), { ssr: false });
const Rect = dynamic(() => import('react-konva').then(m => m.Rect), { ssr: false });
const Text = dynamic(() => import('react-konva').then(m => m.Text), { ssr: false });
const Group = dynamic(() => import('react-konva').then(m => m.Group), { ssr: false });
const Line = dynamic(() => import('react-konva').then(m => m.Line), { ssr: false });

interface OptimizationCanvasProps {
  result: OptimizationResult;
  sheet: Sheet;
  settings: ProjectSettings;
  containerSize: { width: number; height: number };
  activeSheetIndex: number;
  zoom: number;
  panX: number;
  panY: number;
  onPanChange: (x: number, y: number) => void;
}

const PADDING = 60; // canvas padding in px
const PIECE_COLORS = [
  '#DBEAFE', '#D1FAE5', '#FEF3C7', '#FCE7F3', '#EDE9FE',
  '#FFEDD5', '#ECFDF5', '#FFF7ED', '#F0F9FF', '#F5F3FF',
];
const PIECE_STROKE_COLORS = [
  '#93C5FD', '#6EE7B7', '#FCD34D', '#F9A8D4', '#C4B5FD',
  '#FDBA74', '#A7F3D0', '#FED7AA', '#BAE6FD', '#DDD6FE',
];

export function OptimizationCanvas({
  result,
  sheet,
  settings,
  containerSize,
  activeSheetIndex,
  zoom,
  panX,
  panY,
  onPanChange,
}: OptimizationCanvasProps) {
  const [hoveredPieceId, setHoveredPieceId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const stageRef = useRef<any>(null);

  const activeSheet = result.sheets[activeSheetIndex];
  if (!activeSheet) return null;

  const sheetWmm = toMM(sheet.width, settings.unit);
  const sheetHmm = toMM(sheet.height, settings.unit);

  // Calculate scale to fit sheet in container
  const availW = containerSize.width - PADDING * 2;
  const availH = containerSize.height - PADDING * 2;
  const scaleX = availW / sheetWmm;
  const scaleY = availH / sheetHmm;
  const baseScale = Math.min(scaleX, scaleY) * zoom;

  const scaledW = sheetWmm * baseScale;
  const scaledH = sheetHmm * baseScale;

  // Center the sheet
  const offsetX = (containerSize.width - scaledW) / 2 + panX;
  const offsetY = (containerSize.height - scaledH) / 2 + panY;

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(false);
    dragStartRef.current = { x: e.clientX, y: e.clientY, panX, panY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      setIsDragging(true);
      onPanChange(dragStartRef.current.panX + dx, dragStartRef.current.panY + dy);
    }
  };

  const handleMouseUp = () => {
    dragStartRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    // Handled by parent zoom state
  };

  // Color assignment per item
  const colorMap = new Map<string, number>();
  activeSheet.pieces.forEach((p, i) => {
    if (!colorMap.has(p.itemId)) {
      colorMap.set(p.itemId, colorMap.size % PIECE_COLORS.length);
    }
  });

  return (
    <div
      className={cn('w-full h-full select-none', isDragging ? 'cursor-grabbing' : 'cursor-grab')}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <Stage
        ref={stageRef}
        width={containerSize.width}
        height={containerSize.height}
      >
        <Layer>
          {/* Sheet shadow */}
          <Rect
            x={offsetX + 4}
            y={offsetY + 4}
            width={scaledW}
            height={scaledH}
            fill="rgba(0,0,0,0.06)"
            cornerRadius={4}
          />

          {/* Sheet background */}
          <Rect
            x={offsetX}
            y={offsetY}
            width={scaledW}
            height={scaledH}
            fill="#FAFAFA"
            stroke="#E5E5EA"
            strokeWidth={1.5}
            cornerRadius={2}
          />

          {/* Sheet dimensions label - top */}
          <Text
            x={offsetX}
            y={offsetY - 22}
            width={scaledW}
            text={`${sheet.width} × ${sheet.height} ${settings.unit}  ·  ${sheet.material.toUpperCase()}`}
            fontSize={11}
            fontFamily="DM Mono, monospace"
            fill="#86868B"
            align="center"
          />

          {/* Pieces */}
          {activeSheet.pieces.map((piece, idx) => {
            const colorIdx = colorMap.get(piece.itemId) ?? idx % PIECE_COLORS.length;
            const fill = PIECE_COLORS[colorIdx];
            const stroke = PIECE_STROKE_COLORS[colorIdx];
            const isHovered = hoveredPieceId === piece.id;

            const px = offsetX + piece.x * baseScale;
            const py = offsetY + piece.y * baseScale;
            const pw = piece.width * baseScale;
            const ph = piece.height * baseScale;

            return (
              <Group key={piece.id}>
                {/* Piece fill */}
                <Rect
                  x={px}
                  y={py}
                  width={pw}
                  height={ph}
                  fill={isHovered ? stroke : fill}
                  stroke={stroke}
                  strokeWidth={isHovered ? 2 : 1}
                  cornerRadius={2}
                  onMouseEnter={() => setHoveredPieceId(piece.id)}
                  onMouseLeave={() => setHoveredPieceId(null)}
                />

                {/* Label — only show if piece is large enough */}
                {pw > 40 && ph > 20 && (
                  <Text
                    x={px + 4}
                    y={py + ph / 2 - 7}
                    width={pw - 8}
                    text={piece.label}
                    fontSize={Math.min(11, Math.max(7, pw / 8))}
                    fontFamily="DM Sans, sans-serif"
                    fontStyle="500"
                    fill="#1D1D1F"
                    ellipsis
                    listening={false}
                  />
                )}

                {/* Dimensions label */}
                {pw > 60 && ph > 32 && (
                  <Text
                    x={px + 4}
                    y={py + ph / 2 + 2}
                    width={pw - 8}
                    text={`${piece.width.toFixed(0)}×${piece.height.toFixed(0)}`}
                    fontSize={Math.min(9, Math.max(6, pw / 12))}
                    fontFamily="DM Mono, monospace"
                    fill="#86868B"
                    ellipsis
                    listening={false}
                  />
                )}

                {/* Rotation indicator */}
                {piece.rotated && pw > 20 && ph > 20 && (
                  <Text
                    x={px + pw - 14}
                    y={py + 3}
                    text="↻"
                    fontSize={9}
                    fill="#86868B"
                    listening={false}
                  />
                )}
              </Group>
            );
          })}

          {/* Efficiency overlay — bottom right of sheet */}
          <Rect
            x={offsetX + scaledW - 80}
            y={offsetY + scaledH - 28}
            width={76}
            height={24}
            fill="rgba(0,0,0,0.06)"
            cornerRadius={4}
          />
          <Text
            x={offsetX + scaledW - 80}
            y={offsetY + scaledH - 21}
            width={76}
            text={`${activeSheet.efficiency.toFixed(1)}% used`}
            fontSize={9}
            fontFamily="DM Mono, monospace"
            fill="#86868B"
            align="center"
          />
        </Layer>
      </Stage>
    </div>
  );
}
