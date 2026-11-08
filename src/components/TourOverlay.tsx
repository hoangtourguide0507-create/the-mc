import React, { useEffect, useState } from 'react';
import { currentTourStep, TOUR_STEPS } from '../core/onboarding';
import { useGameStore } from '../core/store';

/** Chỉ điểm từng nút trên Hub cho người chơi ngày đầu. Không chặn thao tác trên phần tử được chỉ. */
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
        className="pointer-events-none fixed z-[60] rounded-2xl border-2 border-amber-300 transition-all duration-300"
        style={{
          top: rect.top - 6,
          left: rect.left - 6,
          width: rect.width + 12,
          height: rect.height + 12,
          boxShadow: '0 0 0 9999px rgba(10,5,25,0.72)',
        }}
      />
      <div
        role="dialog"
        aria-label="Hướng dẫn chơi"
        className="fixed inset-x-3 z-[61] mx-auto max-w-md rounded-2xl border border-amber-300/60 bg-[#150C38] p-4 shadow-2xl"
        style={tipPos}
      >
        <p className="text-[11px] font-black uppercase tracking-wider text-amber-300">
          Hướng dẫn · {n}/{TOUR_STEPS.length}
        </p>
        <p className="mt-1 text-sm font-semibold leading-relaxed text-white">{step.text}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            onClick={skipTour}
            className="rounded-lg px-2 py-1 text-xs font-bold text-slate-400 hover:text-white"
          >
            Bỏ qua hướng dẫn
          </button>
          <button
            onClick={() => ackTour(step.id)}
            className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-slate-950 transition hover:scale-105"
          >
            Hiểu rồi
          </button>
        </div>
      </div>
    </>
  );
};
