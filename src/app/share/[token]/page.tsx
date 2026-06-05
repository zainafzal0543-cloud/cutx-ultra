'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Layers, BarChart2, AlertCircle } from 'lucide-react';
import { getSharedProject } from '@/lib/sharing';
import type { SharedProject } from '@/types/phase2';

interface SharedViewPageProps {
  params: { token: string };
}

export default function SharedViewPage({ params }: SharedViewPageProps) {
  const [data, setData] = useState<SharedProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getSharedProject(params.token).then(result => {
      if (result) setData(result);
      else setNotFound(true);
      setLoading(false);
    });
  }, [params.token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-border border-t-text-primary rounded-full animate-spin" />
          <p className="text-sm text-text-tertiary">Loading shared project…</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center p-8">
          <div className="w-16 h-16 rounded-3xl bg-background border border-border flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-text-tertiary" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-text-primary">Link not found</h1>
            <p className="text-sm text-text-tertiary mt-1.5">
              This share link may have expired or been revoked.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const project = data!.project;
  const result = project.optimizationResult as any;
  const settings = project.settings as any;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-14 bg-surface border-b border-border flex items-center px-6 gap-4">
        <div className="w-7 h-7 bg-black rounded-xl flex items-center justify-center shrink-0">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 3h10M2 6h7M2 9h10M2 12h7" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </div>
        <span className="text-sm font-semibold text-text-primary">{project.name}</span>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background border border-border ml-2">
          <Lock className="w-3 h-3 text-text-tertiary" />
          <span className="text-[11px] text-text-tertiary font-medium">Read-only view</span>
        </div>
        <div className="flex-1" />
        <span className="text-xs text-text-tertiary">Shared via CUTX ULTRA</span>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Stats */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
          >
            {[
              { label: 'Total Sheets', value: result.totalSheets },
              { label: 'Efficiency', value: `${result.overallEfficiency?.toFixed(1)}%` },
              { label: 'Parts Placed', value: result.sheets?.reduce((s: number, sh: any) => s + sh.pieces.length, 0) },
              { label: 'Algorithm', value: result.algorithm?.replace(/_/g, ' ').replace('maxrects ', '') },
            ].map(stat => (
              <div key={stat.label} className="bg-surface border border-border rounded-2xl p-4">
                <div className="text-xl font-bold text-text-primary">{stat.value}</div>
                <div className="text-xs text-text-tertiary mt-0.5">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Cutting list summary */}
        <div>
          <h2 className="text-base font-semibold text-text-primary mb-4">
            Cutting List ({(project.cuttingList as any[]).length} parts)
          </h2>
          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[1fr_80px_80px_60px] gap-3 px-4 py-2.5 border-b border-border bg-background text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
              <span>Label</span>
              <span className="text-center">Width</span>
              <span className="text-center">Height</span>
              <span className="text-center">Qty</span>
            </div>
            {(project.cuttingList as any[]).map((item: any, i: number) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_80px_80px_60px] gap-3 px-4 py-2.5 border-b border-border/50 last:border-0 text-sm"
              >
                <span className="text-text-primary font-medium truncate">{item.label}</span>
                <span className="text-center text-text-secondary font-mono">{item.width}</span>
                <span className="text-center text-text-secondary font-mono">{item.height}</span>
                <span className="text-center text-text-secondary">{item.quantity}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-text-tertiary">
            Generated with{' '}
            <a href="/" className="text-text-primary font-semibold hover:underline">CUTX ULTRA</a>
            {data?.expiresAt && ` · Expires ${new Date(data.expiresAt).toLocaleDateString()}`}
          </p>
        </div>
      </div>
    </div>
  );
}
