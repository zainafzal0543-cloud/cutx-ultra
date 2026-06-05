'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, TrendingUp, Layers, Leaf, ArrowLeft } from 'lucide-react';
import { useStore } from '@/store';
import { computeGlobalAnalytics } from '@/lib/analytics/engine';
import type { GlobalAnalytics } from '@/types/phase2';
import { MATERIAL_LABELS } from '@/lib/utils/presets';
import { formatArea, formatPercent } from '@/lib/utils/units';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function AnalyticsPage() {
  const { projects } = useStore();
  const [analytics, setAnalytics] = useState<GlobalAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    computeGlobalAnalytics(projects).then(a => {
      setAnalytics(a);
      setLoading(false);
    });
  }, [projects]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-14 bg-surface border-b border-border flex items-center px-6 gap-4">
        <Link href="/workspace" className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <div className="w-px h-5 bg-border" />
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-text-tertiary" />
          <span className="text-sm font-semibold text-text-primary">Analytics</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl shimmer" />
            ))}
          </div>
        ) : analytics ? (
          <>
            {/* KPI Cards */}
            <div>
              <h2 className="text-base font-semibold text-text-primary mb-4">Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KPICard
                  icon={<Layers className="w-4 h-4" />}
                  label="Total Projects"
                  value={analytics.totalProjects.toString()}
                />
                <KPICard
                  icon={<BarChart2 className="w-4 h-4" />}
                  label="Optimizations Run"
                  value={analytics.totalOptimizations.toString()}
                />
                <KPICard
                  icon={<TrendingUp className="w-4 h-4" />}
                  label="Avg Efficiency"
                  value={`${analytics.averageEfficiency.toFixed(1)}%`}
                  highlight={analytics.averageEfficiency > 80}
                />
                <KPICard
                  icon={<Leaf className="w-4 h-4" />}
                  label="Material Saved"
                  value={formatArea(analytics.totalMaterialSavedMM2, 'mm')}
                  sub="vs 40% baseline"
                />
              </div>
            </div>

            {/* Efficiency Trend */}
            {analytics.efficiencyTrend.length > 0 && (
              <div>
                <h2 className="text-base font-semibold text-text-primary mb-4">Efficiency Trend</h2>
                <div className="bg-surface border border-border rounded-2xl p-5">
                  <div className="flex items-end gap-1.5 h-32">
                    {analytics.efficiencyTrend.map((point, i) => {
                      const pct = point.efficiency / 100;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${pct * 100}%` }}
                            transition={{ delay: i * 0.04, duration: 0.5, ease: 'easeOut' }}
                            className={cn(
                              'w-full rounded-t-md',
                              point.efficiency > 80 ? 'bg-success' : point.efficiency > 60 ? 'bg-warning' : 'bg-error'
                            )}
                            style={{ minHeight: 2 }}
                          />
                          <span className="text-[9px] text-text-tertiary rotate-45 origin-left hidden md:block">
                            {point.date}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <span className="text-xs text-text-tertiary">Last {analytics.efficiencyTrend.length} optimizations</span>
                    <div className="flex items-center gap-3 text-xs text-text-tertiary">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success inline-block" />80%+</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning inline-block" />60–80%</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-error inline-block" />Below 60%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Top materials */}
            {analytics.topMaterials.length > 0 && (
              <div>
                <h2 className="text-base font-semibold text-text-primary mb-4">Top Materials</h2>
                <div className="bg-surface border border-border rounded-2xl p-5 space-y-3">
                  {analytics.topMaterials.map((m, i) => {
                    const maxCount = analytics.topMaterials[0].count;
                    return (
                      <div key={m.material} className="flex items-center gap-3">
                        <span className="text-xs text-text-tertiary w-4">{i + 1}</span>
                        <span className="text-sm text-text-primary w-24 shrink-0">
                          {MATERIAL_LABELS[m.material] ?? m.material}
                        </span>
                        <div className="flex-1 h-2 bg-background rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(m.count / maxCount) * 100}%` }}
                            transition={{ delay: i * 0.08, duration: 0.6 }}
                            className="h-full bg-black rounded-full"
                          />
                        </div>
                        <span className="text-xs text-text-secondary w-8 text-right">{m.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Weekly usage */}
            {analytics.weeklyUsage.length > 0 && (
              <div>
                <h2 className="text-base font-semibold text-text-primary mb-4">Weekly Activity</h2>
                <div className="bg-surface border border-border rounded-2xl p-5">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {analytics.weeklyUsage.slice(0, 4).map((week, i) => (
                      <div key={i} className="p-3 rounded-xl bg-background">
                        <div className="text-xs text-text-tertiary mb-1">{week.week}</div>
                        <div className="text-lg font-semibold text-text-primary">{week.projects}</div>
                        <div className="text-xs text-text-tertiary">optimizations</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {analytics.totalOptimizations === 0 && (
              <div className="py-16 text-center">
                <BarChart2 className="w-12 h-12 text-text-tertiary mx-auto mb-4 opacity-40" />
                <p className="text-sm text-text-secondary font-medium">No data yet</p>
                <p className="text-xs text-text-tertiary mt-1">Run optimizations to see your analytics</p>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

function KPICard({ icon, label, value, sub, highlight }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; highlight?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface border border-border rounded-2xl p-4"
    >
      <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center mb-3', highlight ? 'bg-success/10 text-success' : 'bg-background text-text-tertiary')}>
        {icon}
      </div>
      <div className={cn('text-xl font-bold', highlight ? 'text-success' : 'text-text-primary')}>{value}</div>
      <div className="text-xs text-text-tertiary mt-0.5">{label}</div>
      {sub && <div className="text-[11px] text-text-tertiary mt-0.5">{sub}</div>}
    </motion.div>
  );
}
