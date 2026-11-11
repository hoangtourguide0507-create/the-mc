import React, { Suspense, useEffect } from 'react';
import { Ambience, SpeechEngine, Voice } from './audio/audioSystem';
import { HUD } from './components/HUD';
import {
  GlobalOverlays,
  PhrasebookSheet,
  ResultModal,
  ShopSheet,
  StreetTalkModal,
  WelcomeOverlay,
} from './components/SheetsAndModals';
import { dayKey } from './core/clock';
import { useGameStore } from './core/storeReact';
import { QuestSheet } from './components/QuestSheet';
import { HelpSheet } from './components/HelpSheet';
import { PronunciationSheet } from './components/PronunciationSheet';
import { TrainingSheet } from './components/TrainingSheet';
import { TourOverlay } from './components/TourOverlay';

// Ba màn hình 3D được tách thành gói riêng: màn chào hiện ngay, three.js tải song song phía sau.
const loadHub = () => import('./components/HubView').then((m) => ({ default: m.HubView }));
const loadStage = () => import('./components/StageView').then((m) => ({ default: m.StageView }));
const loadWorld = () => import('./three/CityWorld3D').then((m) => ({ default: m.CityWorld3D }));
const HubView = React.lazy(loadHub);
const StageView = React.lazy(loadStage);
const CityWorld3D = React.lazy(loadWorld);

const ViewLoading: React.FC = () => (
  <div className="flex h-full w-full items-center justify-center">
    <div className="ghibli-panel rounded-2xl px-5 py-3 font-display text-base font-black text-ghibli-ink">
      🎬 Đang dựng cảnh…
    </div>
  </div>
);

export const App: React.FC = () => {
  const view = useGameStore((s) => s.view);
  const saveNow = useGameStore((s) => s.saveNow);
  const startDayFromWelcome = useGameStore((s) => s.startDayFromWelcome);

  // Tải sẵn các màn hình 3D ngay sau khi màn chào hiện ra, để bấm "Bắt đầu" không phải chờ
  useEffect(() => {
    void loadWorld();
    void loadHub();
    void loadStage();
  }, []);

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
    <div className="relative h-[100dvh] w-screen select-none overflow-hidden bg-gradient-to-b from-ghibli-sky via-[#FFF1D6] to-ghibli-cream font-sans text-ghibli-ink">
      {/* Top Always-On HUD */}
      <HUD />

      {/* Active View Router */}
      <main className="h-full w-full">
        <Suspense fallback={<ViewLoading />}>
          {view === 'hub' && <HubView />}
          {view === 'world' && <CityWorld3D />}
          {view === 'stage' && <StageView />}
        </Suspense>
      </main>

      {/* Sheets, Modals & Overlays */}
      <WelcomeOverlay />
      <PhrasebookSheet />
      <ShopSheet />
      <ResultModal />
      <StreetTalkModal />
      <QuestSheet />
      <HelpSheet />
      <PronunciationSheet />
      <TrainingSheet />
      <TourOverlay />
      <GlobalOverlays />
    </div>
  );
};

export default App;
