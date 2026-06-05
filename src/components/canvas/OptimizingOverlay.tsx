'use client';

import { motion } from 'framer-motion';

export function OptimizingOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full h-full flex flex-col items-center justify-center gap-8"
    >
      {/* Animated grid */}
      <div className="relative w-56 h-32">
        {/* Sheet outline */}
        <div className="w-full h-full rounded-xl border border-border bg-surface shadow-soft overflow-hidden">
          {/* Scanning line */}
          <motion.div
            animate={{ y: [0, 128, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-accent-blue to-transparent opacity-60"
          />

          {/* Pieces appearing */}
          {[
            { x: 8, y: 8, w: 60, h: 36, delay: 0 },
            { x: 76, y: 8, w: 48, h: 36, delay: 0.2 },
            { x: 8, y: 52, w: 40, h: 28, delay: 0.4 },
            { x: 56, y: 52, w: 68, h: 28, delay: 0.6 },
            { x: 132, y: 8, w: 36, h: 72, delay: 0.3 },
          ].map((rect, i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.2, 0.8, 0.2] }}
              transition={{ duration: 1.8, repeat: Infinity, delay: rect.delay, ease: 'easeInOut' }}
              className="absolute rounded border border-border/40"
              style={{
                left: rect.x,
                top: rect.y,
                width: rect.w,
                height: rect.h,
                background: ['#DBEAFE40', '#D1FAE540', '#FEF3C740', '#FCE7F340', '#EDE9FE40'][i],
              }}
            />
          ))}
        </div>
      </div>

      {/* Text + spinner */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2.5">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-4 h-4 border-2 border-border border-t-text-primary rounded-full"
          />
          <span className="text-sm font-semibold text-text-primary">Optimizing layout…</span>
        </div>
        <p className="text-xs text-text-tertiary">Running guillotine algorithm</p>

        {/* Progress dots */}
        <div className="flex gap-1.5 mt-1">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
              className="w-1.5 h-1.5 rounded-full bg-text-tertiary"
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
