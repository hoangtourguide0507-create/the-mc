import React, { useEffect, useState } from 'react';
import { currentTourStep, TOUR_STEPS } from '../core/onboarding';
import { useGameStore } from '../core/store';

/** Chỉ điểm từng nút trên Hub cho người chơi ngày đầu (Cozy Modern Tactile). */
export const TourOverlay: React.FC = () => {
  const view = useGameStore((s) => s.view);
  const state = useGameStore((s) => s.state);
  const ackTour = useGameStore((s) => s.ackTour);
  const skipTour = useGameStore((s) => s.skipTour);
  const step = view === 'hub' ? currentTourStep(state) : null;
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!step) {
      setRect(null);
      return;
    }
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    const measure = () => setRect(el.getBoundingClientRect());
    measure();
    const t = window.setTimeout(measure, 400);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [step?.id, view]);

  if (!step || !rect) return null;

  const vh = window.innerHeight;
  const placeBelow = rect.bottom + 190 < vh;
  const tipPos = placeBelow
    ? { top: Math.min(rect.bottom + 14, vh - 190) }
    : { bottom: Math.max(12, vh - rect.top + 14) };
  const n = TOUR_STEPS.indexOf(step) + 1;

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed z-[60] rounded-3xl border-2 border-[#FFC652] transition-all duration-300"
        style={{
          top: rect.top - 6,
          left: rect.left - 6,
          width: rect.width + 12,
          height: rect.height + 12,
          boxShadow: '0 0 0 9999px rgba(42, 30, 22, 0.55)',
        }}
      />
      <div
        role="dialog"
        aria-label="Hướng dẫn chơi"
        className="cozy-card fixed inset-x-3 z-[61] mx-auto max-w-md rounded-3xl p-4"
        style={tipPos}
      >
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-[#FFF0D4] px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-[#9C5B00]">
            ✨ Hướng dẫn · {n}/{TOUR_STEPS.length}
          </span>
        </div>
        <p className="mt-2 text-sm font-bold leading-relaxed text-ghibli-ink">{step.text}</p>
        <div className="mt-3.5 flex items-center justify-between gap-2">
          <button
            onClick={skipTour}
            className="rounded-xl px-2.5 py-1.5 text-xs font-bold text-ghibli-ink-soft hover:text-ghibli-ink"
          >
            Bỏ qua hướng dẫn
          </button>
          <button
            onClick={() => ackTour(step.id)}
            className="btn-tactile-amber rounded-2xl px-4 py-2 text-xs font-black"
          >
            Hiểu rồi ➔
          </button>
        </div>
      </div>
    </>
  );
};
