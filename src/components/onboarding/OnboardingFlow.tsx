'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Layers, List, BarChart2, ChevronRight, Check } from 'lucide-react';
import { useStore } from '@/store';
import { cn } from '@/lib/utils';

interface OnboardingProps {
  onComplete: () => void;
}

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to CUTX ULTRA',
    subtitle: 'Industrial sheet cutting optimization',
    description: 'The most powerful cutting optimizer for furniture factories, CNC shops, and industrial woodworkers.',
    icon: (
      <div className="w-16 h-16 bg-black rounded-3xl flex items-center justify-center mx-auto">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path d="M4 8h24M4 14h16M4 20h24M4 26h16" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      </div>
    ),
  },
  {
    id: 'sheet',
    title: 'Configure Your Sheet',
    subtitle: 'Step 1 of 3',
    description: 'Start by selecting a material and entering your sheet dimensions. Choose from 10 presets or enter custom sizes.',
    icon: <Layers className="w-10 h-10 text-black mx-auto" />,
    tip: '💡 Use the Sheet tab in the left sidebar',
  },
  {
    id: 'parts',
    title: 'Add Your Parts',
    subtitle: 'Step 2 of 3',
    description: 'Enter your cutting list manually, paste directly from Excel, or import a CSV file. Supports thousands of parts.',
    icon: <List className="w-10 h-10 text-black mx-auto" />,
    tip: '💡 Paste Excel data directly — Tab-separated columns: Label, Width, Height, Qty',
  },
  {
    id: 'optimize',
    title: 'Run Optimization',
    subtitle: 'Step 3 of 3',
    description: 'Choose an optimization mode and click Optimize. The AI engine places parts to maximize material usage.',
    icon: <Zap className="w-10 h-10 text-black mx-auto" />,
    tip: '💡 "Min Wastage" mode gives the best material efficiency',
  },
  {
    id: 'done',
    title: "You're Ready",
    subtitle: 'Start optimizing',
    description: 'Export to DXF, generate G-Code, manage inventory, create quotes — everything you need is here.',
    icon: (
      <div className="w-16 h-16 bg-success/10 rounded-3xl flex items-center justify-center mx-auto">
        <Check className="w-8 h-8 text-success" />
      </div>
    ),
  },
];

export function OnboardingFlow({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const { createProject } = useStore();

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const progress = (step / (STEPS.length - 1)) * 100;

  const handleNext = async () => {
    if (isLast) {
      // Create first project
      await createProject('My First Project', 'Created during onboarding');
      onComplete();
    } else {
      setStep(s => s + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-6">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Progress bar */}
        <div className="h-1 bg-border rounded-full mb-10 overflow-hidden">
          <motion.div
            className="h-full bg-black rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="text-center space-y-5"
          >
            <div className="mb-6">{current.icon}</div>

            {current.subtitle && (
              <p className="text-xs font-semibold tracking-wider uppercase text-text-tertiary">
                {current.subtitle}
              </p>
            )}

            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              {current.title}
            </h1>

            <p className="text-sm text-text-secondary leading-relaxed max-w-sm mx-auto">
              {current.description}
            </p>

            {(current as any).tip && (
              <div className="bg-background border border-border rounded-xl p-3 text-xs text-text-secondary text-left">
                {(current as any).tip}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-2 mt-10 mb-8">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => i < step && setStep(i)}
              className={cn(
                'rounded-full transition-all duration-300',
                i === step ? 'w-6 h-2 bg-black' :
                i < step ? 'w-2 h-2 bg-black/40' : 'w-2 h-2 bg-border'
              )}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex-1 py-3 rounded-2xl border border-border text-sm font-semibold text-text-secondary hover:bg-background transition-colors"
            >
              Back
            </button>
          )}

          <button
            onClick={handleNext}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-black text-white text-sm font-semibold hover:bg-neutral-800 active:scale-98 transition-all"
          >
            {isLast ? 'Start Optimizing' : 'Continue'}
            {!isLast && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {step === 0 && (
          <button
            onClick={onComplete}
            className="w-full mt-3 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            Skip tour
          </button>
        )}
      </motion.div>
    </div>
  );
}
