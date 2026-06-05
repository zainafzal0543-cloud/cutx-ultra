'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, ArrowLeft, Plus, Mail, Shield, Activity, ChevronDown, Check } from 'lucide-react';
import Link from 'next/link';
import { getTeamMembers, logActivity, getActivityLog, ROLE_LABELS, ROLE_DESCRIPTIONS, ROLE_COLORS } from '@/lib/enterprise/permissions';
import type { TeamMember, ActivityLog, TeamRole } from '@/types/phase3';
import { cn, formatRelativeTime } from '@/lib/utils';

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [activeTab, setActiveTab] = useState<'members' | 'activity' | 'roles'>('members');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('operator');

  useEffect(() => {
    getTeamMembers().then(setMembers);
    getActivityLog(30).then(setActivity);
  }, []);

  const handleInvite = async () => {
    if (!inviteEmail) return;
    await logActivity({
      orgId: 'org1',
      userId: 'current',
      userEmail: 'owner@workshop.com',
      action: `Invited ${inviteEmail} as ${ROLE_LABELS[inviteRole]}`,
      resourceType: 'team',
    });
    setShowInvite(false);
    setInviteEmail('');
    getActivityLog(30).then(setActivity);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 bg-surface border-b border-border flex items-center px-6 gap-4">
        <Link href="/workspace" className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" />Back
        </Link>
        <div className="w-px h-5 bg-border" />
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-text-tertiary" />
          <span className="text-sm font-semibold text-text-primary">Team</span>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-sm font-semibold hover:bg-neutral-800 transition-colors"
        >
          <Plus className="w-4 h-4" />Invite Member
        </button>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-background border border-border rounded-xl w-fit">
          {(['members', 'activity', 'roles'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={cn('px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all',
                activeTab === tab ? 'bg-surface shadow-soft text-text-primary' : 'text-text-tertiary hover:text-text-secondary'
              )}>
              {tab}
            </button>
          ))}
        </div>

        {/* Members */}
        {activeTab === 'members' && (
          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-background grid grid-cols-[2fr_1fr_1fr_100px] gap-3 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
              <span>Member</span><span>Role</span><span>Status</span><span>Joined</span>
            </div>
            {members.map(member => (
              <motion.div key={member.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="px-5 py-4 border-b border-border/50 last:border-0 grid grid-cols-[2fr_1fr_1fr_100px] gap-3 items-center">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-background border border-border flex items-center justify-center text-sm font-semibold text-text-secondary shrink-0">
                    {member.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-text-primary">{member.displayName}</div>
                    <div className="text-xs text-text-tertiary">{member.email}</div>
                  </div>
                </div>
                <span className={cn('inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold w-fit', ROLE_COLORS[member.role])}>
                  {ROLE_LABELS[member.role]}
                </span>
                <span className={cn('text-xs font-medium', member.isActive ? 'text-success' : 'text-text-tertiary')}>
                  {member.isActive ? 'Active' : 'Pending'}
                </span>
                <span className="text-xs text-text-tertiary">
                  {member.joinedAt ? formatRelativeTime(member.joinedAt) : 'Not joined'}
                </span>
              </motion.div>
            ))}
          </div>
        )}

        {/* Activity */}
        {activeTab === 'activity' && (
          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            {activity.length === 0 ? (
              <div className="py-16 text-center text-sm text-text-tertiary">No activity yet</div>
            ) : activity.map((log, i) => (
              <div key={log.id ?? i} className="flex items-start gap-3 px-5 py-3 border-b border-border/50 last:border-0">
                <div className="w-7 h-7 rounded-lg bg-background border border-border flex items-center justify-center shrink-0 mt-0.5">
                  <Activity className="w-3.5 h-3.5 text-text-tertiary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-primary font-medium">{log.action}</p>
                  <p className="text-[11px] text-text-tertiary mt-0.5">{log.userEmail}</p>
                </div>
                <span className="text-[11px] text-text-tertiary shrink-0">
                  {log.createdAt ? formatRelativeTime(log.createdAt) : ''}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Roles reference */}
        {activeTab === 'roles' && (
          <div className="space-y-3">
            {(Object.keys(ROLE_LABELS) as TeamRole[]).map(role => (
              <div key={role} className="bg-surface border border-border rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <span className={cn('px-2.5 py-1 rounded-lg text-xs font-bold', ROLE_COLORS[role])}>
                    {ROLE_LABELS[role]}
                  </span>
                </div>
                <p className="text-xs text-text-secondary mb-3">{ROLE_DESCRIPTIONS[role]}</p>
                <div className="flex flex-wrap gap-1.5">
                  {(ROLE_DESCRIPTIONS[role] ? ['project:create','project:read','project:update','inventory:read','export:all'] : [])
                    .filter(() => true)
                    .map(p => (
                      <span key={p} className="text-[10px] px-2 py-0.5 rounded-md bg-background border border-border text-text-tertiary font-mono">
                        {p}
                      </span>
                    ))
                  }
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInvite && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowInvite(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50" />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-surface rounded-3xl shadow-modal overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-border">
                <h2 className="text-base font-semibold text-text-primary">Invite Team Member</h2>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <div className="section-label mb-2">Email Address</div>
                  <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com" className="input-ghost text-sm w-full" />
                </div>
                <div>
                  <div className="section-label mb-2">Role</div>
                  <div className="space-y-1.5">
                    {(['manager', 'operator', 'client_viewer'] as TeamRole[]).map(role => (
                      <button key={role} onClick={() => setInviteRole(role)}
                        className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all',
                          inviteRole === role ? 'border-black bg-black/5' : 'border-border hover:border-text-tertiary/50'
                        )}>
                        <div className="flex-1">
                          <div className="text-xs font-semibold text-text-primary">{ROLE_LABELS[role]}</div>
                          <div className="text-[10px] text-text-tertiary">{ROLE_DESCRIPTIONS[role]}</div>
                        </div>
                        {inviteRole === role && <Check className="w-4 h-4 text-black shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-border flex gap-3">
                <button onClick={() => setShowInvite(false)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-text-secondary">Cancel</button>
                <button onClick={handleInvite} disabled={!inviteEmail}
                  className="flex-1 py-2.5 rounded-xl bg-black text-white text-sm font-semibold disabled:opacity-40 hover:bg-neutral-800 transition-colors">
                  Send Invite
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
