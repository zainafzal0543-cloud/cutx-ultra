'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, Copy, Check, Trash2, Clock, Eye, Plus, ExternalLink } from 'lucide-react';
import { useStore, selectActiveProject } from '@/store';
import {
  createShareLink, getShareLinksForProject,
  revokeShareLink, buildShareURL,
} from '@/lib/sharing';
import type { ShareLink } from '@/types/phase2';
import { cn, formatRelativeTime } from '@/lib/utils';

export function SharePanel() {
  const activeProject = useStore(selectActiveProject);
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expiryDays, setExpiryDays] = useState<number | undefined>(7);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!activeProject) return;
    getShareLinksForProject(activeProject.id).then(setLinks);
  }, [activeProject?.id]);

  const handleCreate = async () => {
    if (!activeProject) return;
    setCreating(true);
    try {
      const link = await createShareLink(activeProject, {
        expiresInDays: expiryDays,
        readOnly: true,
      });
      setLinks(prev => [link, ...prev]);
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async (token: string) => {
    const url = buildShareURL(token);
    await navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleRevoke = async (id: string) => {
    await revokeShareLink(id);
    setLinks(prev => prev.filter(l => l.id !== id));
  };

  if (!activeProject) return (
    <div className="p-6 text-center text-sm text-text-tertiary">No project selected</div>
  );

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link2 className="w-4 h-4 text-text-tertiary" />
        <span className="text-sm font-semibold text-text-primary">Share Project</span>
      </div>

      {/* Info */}
      <div className="p-3 rounded-xl bg-background border border-border">
        <p className="text-xs text-text-secondary">
          Share a read-only link to your layout with clients, colleagues, or contractors.
          Anyone with the link can view the cutting plan without editing it.
        </p>
      </div>

      {/* Create new link */}
      <div className="space-y-3">
        <div className="section-label">New Share Link</div>
        <div>
          <div className="text-xs text-text-tertiary mb-2">Expires after</div>
          <div className="flex gap-1.5">
            {[
              { label: '24h', days: 1 },
              { label: '7d', days: 7 },
              { label: '30d', days: 30 },
              { label: 'Never', days: undefined },
            ].map(opt => (
              <button
                key={opt.label}
                onClick={() => setExpiryDays(opt.days)}
                className={cn(
                  'flex-1 py-1.5 rounded-lg text-xs font-medium transition-all',
                  expiryDays === opt.days
                    ? 'bg-black text-white'
                    : 'bg-background border border-border text-text-secondary hover:border-text-tertiary/50'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={creating}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-black text-white text-sm font-semibold hover:bg-neutral-800 transition-colors disabled:opacity-50"
        >
          {creating ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
            />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          Generate Share Link
        </button>
      </div>

      {/* Existing links */}
      {links.length > 0 && (
        <div className="space-y-2">
          <div className="section-label">Active Links ({links.length})</div>
          <AnimatePresence>
            {links.map(link => {
              const url = buildShareURL(link.token);
              const isExpired = link.expiresAt && new Date(link.expiresAt) < new Date();

              return (
                <motion.div
                  key={link.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={cn(
                    'p-3 rounded-xl border',
                    isExpired ? 'border-border/50 opacity-50' : 'border-border bg-background'
                  )}
                >
                  {/* URL row */}
                  <div className="flex items-center gap-2 mb-2">
                    <code className="flex-1 text-[11px] font-mono text-text-secondary truncate bg-surface px-2 py-1 rounded-lg border border-border">
                      {url}
                    </code>
                    <button
                      onClick={() => handleCopy(link.token)}
                      className={cn(
                        'p-1.5 rounded-lg transition-all shrink-0',
                        copied === link.token
                          ? 'bg-success/10 text-success'
                          : 'bg-surface border border-border text-text-tertiary hover:text-text-primary'
                      )}
                      title="Copy link"
                    >
                      {copied === link.token ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-surface border border-border text-text-tertiary hover:text-text-primary transition-all shrink-0"
                      title="Open link"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-[11px] text-text-tertiary">
                        <Clock className="w-3 h-3" />
                        {link.expiresAt
                          ? isExpired ? 'Expired' : `Expires ${formatRelativeTime(link.expiresAt)}`
                          : 'Never expires'
                        }
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-text-tertiary">
                        <Eye className="w-3 h-3" />
                        {link.viewCount} view{link.viewCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRevoke(link.id)}
                      className="p-1 text-text-tertiary hover:text-error transition-colors"
                      title="Revoke"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
