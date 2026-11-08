import React, { useEffect } from 'react';
import { Ambience, SpeechEngine, Voice } from './audio/audioSystem';
import { HUD } from './components/HUD';
import { HubView } from './components/HubView';
import {
  GlobalOverlays,
  PhrasebookSheet,
  ResultModal,
  ShopSheet,
  StreetTalkModal,
  WelcomeOverlay,
} from './components/SheetsAndModals';
import { StageView } from './components/StageView';
import { dayKey } from './core/clock';
import { useGameStore } from './core/store';
import { CityWorld3D } from './three/CityWorld3D';

export const App: React.FC = () => {
  const view = useGameStore((s) => s.view);
  const saveNow = useGameStore((s) => s.saveNow);
  const startDayFromWelcome = useGameStore((s) => s.startDayFromWelcome);

  // Lifecycle listeners: immediate save on backgrounding + midnight real-day rollover
  useEffect(() => {
    const handlePageHide = () => {
      saveNow();
      Voice.stop();
      SpeechEngine.abort();
      Ambience.stop();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handlePageHide();
      } else if (document.visibilityState === 'visible') {
        const curr = useGameStore.getState();
        if (
          curr.view !== 'welcome' &&
          curr.view !== 'stage' &&
          curr.state.dayDate &&
          curr.state.dayDate !== dayKey()
        ) {
          startDayFromWelcome();
        }
      }
    };

    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [saveNow, startDayFromWelcome]);

  return (
    <div className="relative h-screen w-screen select-none overflow-hidden bg-[#120A30] font-sans text-white">
      {/* Top Always-On HUD */}
      <HUD />

      {/* Active View Router */}
      <main className="h-full w-full">
        {view === 'hub' && <HubView />}
        {view === 'world' && <CityWorld3D />}
        {view === 'stage' && <StageView />}
      </main>

      {/* Sheets, Modals & Overlays */}
      <WelcomeOverlay />
      <PhrasebookSheet />
      <ShopSheet />
      <ResultModal />
      <StreetTalkModal />
      <GlobalOverlays />
    </div>
  );
};

export default App;
