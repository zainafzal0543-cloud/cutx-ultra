'use client';

import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { useStore, selectActiveProject } from '@/store';

interface EmptyCanvasStateProps {
  onOptimize: () => void;
}

export function EmptyCanvasState({ onOptimize }: EmptyCanvasStateProps) {
  const activeProject = useStore(selectActiveProject);
  const hasItems = (activeProject?.cuttingList.length ?? 0) > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full h-full flex flex-col items-center justify-center gap-8"
    >
      {/* Animated sheet illustration */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
        className="relative"
      >
        {/* Background sheet */}
        <div className="w-56 h-32 rounded-xl border-2 border-dashed border-border bg-surface shadow-soft relative overflow-hidden">
          {/* Grid dots */}
          <div className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: 'radial-gradient(circle, #AEAEB2 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
          />

          {/* Animated placeholder pieces */}
          {[
            { x: 8, y: 8, w: 60, h: 36, delay: 0.3 },
            { x: 76, y: 8, w: 48, h: 36, delay: 0.4 },
            { x: 8, y: 52, w: 40, h: 28, delay: 0.5 },
            { x: 56, y: 52, w: 68, h: 28, delay: 0.6 },
            { x: 132, y: 8, w: 36, h: 72, delay: 0.45 },
          ].map((rect, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: rect.delay, type: 'spring', stiffness: 300 }}
              className="absolute rounded-md border border-border/60"
              style={{
                left: rect.x,
                top: rect.y,
                width: rect.w,
                height: rect.h,
                background: ['#DBEAFE', '#D1FAE5', '#FEF3C7', '#FCE7F3', '#EDE9FE'][i],
              }}
            />
          ))}
        </div>

        {/* Floating badge */}
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-3 -right-3 bg-success text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-card"
        >
          94% USED
        </motion.div>
      </motion.div>

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center space-y-2"
      >
        <h3 className="text-base font-semibold text-text-primary">
          {!activeProject
            ? 'Create a project to start'
            : !hasItems
            ? 'Add parts to your cutting list'
            : 'Ready to optimize'}
        </h3>
        <p className="text-sm text-text-tertiary max-w-xs">
          {!activeProject
            ? 'Open the project panel and create your first cutting layout'
            : !hasItems
            ? 'Switch to the Cutting List tab and add the parts you need to cut'
            : 'Click Optimize to generate the best cutting layout for your parts'}
        </p>
      </motion.div>

      {/* CTA */}
      {activeProject && hasItems && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          onClick={onOptimize}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-2xl text-sm font-semibold shadow-elevated hover:bg-neutral-800 transition-colors"
        >
          <Zap className="w-4 h-4" />
          Run Optimization
        </motion.button>
      )}
    </motion.div>
  );
}
