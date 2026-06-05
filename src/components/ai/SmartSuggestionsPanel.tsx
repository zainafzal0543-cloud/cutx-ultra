'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, AlertCircle, CheckCircle, Info,
  AlertTriangle, X, ChevronRight, Loader2, RefreshCw,
} from 'lucide-react';
import { useStore, selectActiveProject } from '@/store';
import { analyzeProject } from '@/lib/ai/engine';
import type { AISuggestion, OptimizationIntelligence } from '@/types/phase3';
import { cn } from '@/lib/utils';

const SEVERITY_CONFIG = {
  critical: { icon: AlertCircle,    color: 'text-error',   bg: 'bg-error/8',   border: 'border-error/20' },
  warning:  { icon: AlertTriangle,  color: 'text-warning', bg: 'bg-warning/8', border: 'border-warning/20' },
  success:  { icon: CheckCircle,    color: 'text-success', bg: 'bg-success/8', border: 'border-success/20' },
  info:     { icon: Info,           color: 'text-accent-blue', bg: 'bg-blue-50', border: 'border-blue-100' },
};

interface SmartSuggestionsPanelProps {
  onApplySuggestion?: (payload: Record<string, unknown>) => void;
}

export function SmartSuggestionsPanel({ onApplySuggestion }: SmartSuggestionsPanelProps) {
  const activeProject = useStore(selectActiveProject);
  const [intel, setIntel] = useState<OptimizationIntelligence | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const analyze = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const result = await analyzeProject(activeProject);
      setIntel(result);
    } finally {
      setLoading(false);
    }
  }, [activeProject?.id, activeProject?.optimizationResult]);

  // Auto-analyze when project/result changes
  useEffect(() => {
    if (activeProject) analyze();
  }, [activeProject?.id, activeProject?.optimizationResult?.id]);

  const visible = intel?.suggestions.filter(s => !dismissed.has(s.id)) ?? [];
  const criticals = visible.filter(s => s.severity === 'critical').length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent-blue" />
          <span className="text-sm font-semibold text-text-primary">AI Suggestions</span>
          {criticals > 0 && (
            <span className="w-5 h-5 rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center">
              {criticals}
            </span>
          )}
        </div>
        <button
          onClick={analyze}
          disabled={loading}
          className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-background transition-all"
          title="Re-analyze"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Confidence score */}
      {intel && !loading && (
        <div className="px-5 py-3 border-b border-border">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-text-tertiary">Optimization Confidence</span>
            <span className={cn(
              'text-xs font-semibold',
              intel.confidenceScore > 0.8 ? 'text-success'
                : intel.confidenceScore > 0.6 ? 'text-warning' : 'text-error'
            )}>
              {Math.round(intel.confidenceScore * 100)}%
            </span>
          </div>
          <div className="h-1.5 bg-border rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${intel.confidenceScore * 100}%` }}
              transition={{ duration: 0.8 }}
              className={cn(
                'h-full rounded-full',
                intel.confidenceScore > 0.8 ? 'bg-success'
                  : intel.confidenceScore > 0.6 ? 'bg-warning' : 'bg-error'
              )}
            />
          </div>
          {intel.estimatedMaterialSavingPercent > 1 && (
            <p className="text-[11px] text-success mt-1.5 font-medium">
              Potential saving: ~{intel.estimatedMaterialSavingPercent.toFixed(1)}% more material
            </p>
          )}
        </div>
      )}

      {/* Suggestions list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="w-6 h-6 text-text-tertiary animate-spin" />
            <p className="text-xs text-text-tertiary">Analyzing project…</p>
          </div>
        ) : !activeProject ? (
          <EmptyState message="Select a project to see suggestions" />
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
            <p className="text-sm font-medium text-text-primary">All good!</p>
            <p className="text-xs text-text-tertiary">No issues detected with your current layout.</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {visible.map(suggestion => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onDismiss={() => setDismissed(prev => new Set([...prev, suggestion.id]))}
                onApply={payload => onApplySuggestion?.(payload)}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Analysis time */}
      {intel && (
        <div className="px-5 py-2 border-t border-border">
          <p className="text-[10px] text-text-tertiary">
            Analyzed in {intel.analysisTimeMs.toFixed(1)}ms · Rule-based engine
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Suggestion Card ──────────────────────────

function SuggestionCard({ suggestion, onDismiss, onApply }: {
  suggestion: AISuggestion;
  onDismiss: () => void;
  onApply: (payload: Record<string, unknown>) => void;
}) {
  const cfg = SEVERITY_CONFIG[suggestion.severity];
  const Icon = cfg.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('p-3 rounded-xl border', cfg.bg, cfg.border)}
    >
      <div className="flex items-start gap-2.5">
        <Icon className={cn('w-4 h-4 shrink-0 mt-0.5', cfg.color)} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-text-primary leading-snug">{suggestion.title}</p>
          <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">{suggestion.description}</p>

          <div className="flex items-center gap-2 mt-2">
            {suggestion.actionLabel && suggestion.actionPayload && (
              <button
                onClick={() => onApply(suggestion.actionPayload!)}
                className="flex items-center gap-1 text-[11px] font-semibold text-text-primary hover:opacity-70 transition-opacity"
              >
                {suggestion.actionLabel}
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
            <div className="flex-1" />
            <span className="text-[10px] text-text-tertiary">
              {Math.round(suggestion.confidenceScore * 100)}% conf.
            </span>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="p-0.5 text-text-tertiary hover:text-text-primary transition-colors shrink-0"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-12 text-center">
      <Sparkles className="w-8 h-8 text-text-tertiary mx-auto mb-3 opacity-40" />
      <p className="text-sm text-text-tertiary">{message}</p>
    </div>
  );
}
