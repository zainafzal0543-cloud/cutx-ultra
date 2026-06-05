'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/store';
import { WorkspaceLayout } from '@/components/layout/WorkspaceLayout';
import { TopBar } from '@/components/layout/TopBar';
import { LeftSidebar } from '@/components/layout/LeftSidebar';
import { CenterCanvas } from '@/components/canvas/CenterCanvas';
import { RightSidebar } from '@/components/layout/RightSidebar';
import { ProjectsModal } from '@/components/projects/ProjectsModal';
import { MobileBottomSheet } from '@/components/layout/MobileBottomSheet';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { syncProcessor } from '@/lib/sync/engine';

const ONBOARDING_KEY = 'cutx_onboarding_done';

export default function WorkspacePage() {
  const { loadProjects, projects } = useStore();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    loadProjects();
    // Start background sync
    syncProcessor.start(30_000);
    return () => syncProcessor.stop();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done && projects.length === 0) {
      const timer = setTimeout(() => setShowOnboarding(true), 500);
      return () => clearTimeout(timer);
    }
  }, [projects.length]);

  const handleOnboardingComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, '1');
    setShowOnboarding(false);
  };

  return (
    <WorkspaceLayout>
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden md:flex">
          <LeftSidebar />
        </div>
        <CenterCanvas />
        <div className="hidden md:flex">
          <RightSidebar />
        </div>
      </div>
      <ProjectsModal />
      <MobileBottomSheet />
      {showOnboarding && <OnboardingFlow onComplete={handleOnboardingComplete} />}
    </WorkspaceLayout>
  );
}
