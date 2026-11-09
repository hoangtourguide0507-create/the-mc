import React, { useEffect, useRef, useState } from 'react';
import { chaNeed, useGameStore } from '../core/store';
import { fmtRep, levelTitle, MAX_LV } from '../core/career';

/** Khoảng đệm phía trên cho nội dung nằm dưới HUD (tính cả tai thỏ iPhone) */
/** Khoảng đệm trên: chỉ còn một hàng thẻ cấp độ và tiền (tính cả tai thỏ iPhone) */
export const HUD_PAD = 'calc(max(0.5rem, env(safe-area-inset-top)) + 84px)';
/** Khoảng đệm dưới: dành chỗ cho thanh năng lượng nằm ở đáy màn hình */
export const HUD_BOTTOM_PAD = 'calc(env(safe-area-inset-bottom) + 64px)';

function useAnimatedNumber(target: number, duration = 800): number {
  const [display, setDisplay] = useState(target);
  const startValRef = useRef(target);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (display === target) return;
    startValRef.current = display;
    startTimeRef.current = null;
    let rafId: number;

    const step = (ts: number) => {
      if (startTimeRef.current === null) startTimeRef.current = ts;
      const elapsed = ts - startTimeRef.current;
      const t = Math.min(1, elapsed / duration);
      // Cubic ease-out: 1 - (1 - t)^3
      const eased = 1 - Math.pow(1 - t, 3);
      const val = Math.round(
        startValRef.current + (target - startValRef.current) * eased
      );
      setDisplay(val);
      if (t < 1) {
        rafId = requestAnimationFrame(step);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);

  return display;
}

export const HUD: React.FC = () => {
  const state = useGameStore((s) => s.state);
  const floatingGains = useGameStore((s) => s.floatingGains);

  const animEnergy = useAnimatedNumber(state.energy);
  const animChaPts = useAnimatedNumber(state.charisma.pts);
  const animXp = useAnimatedNumber(state.xp);
  const animCash = useAnimatedNumber(state.cash);

  const energyPct = Math.round((state.energy / state.maxEnergy) * 100);
  const energyBarColor =
    energyPct <= 25
      ? 'from-rose-500 to-red-600'
      : energyPct <= 50
      ? 'from-amber-400 to-yellow-500'
      : 'from-emerald-400 to-lime-400';

  const isMax = state.charisma.lv >= MAX_LV;
  const needCha = chaNeed(state.charisma.lv);
  const chaPct = isMax ? 100 : Math.min(100, Math.round((state.charisma.pts / needCha) * 100));
  const xpModPct = state.xp % 100;

  const renderFloats = (stat: 'energy' | 'charisma' | 'xp' | 'cash') =>
    floatingGains
      .filter((f) => f.stat === stat)
      .map((f) => (
        <span
          key={f.id}
          className={`pointer-events-none absolute -bottom-5 right-2 z-50 rounded-full px-1.5 py-0.5 text-[11px] font-black shadow-lg ${
            f.delta > 0
              ? 'bg-emerald-400 text-slate-950'
              : 'bg-rose-500 text-white'
          }`}
        >
          {f.delta > 0 ? `+${f.delta}` : f.delta}
        </span>
      ));

  return (
    <>
      {/* Hàng trên: cấp độ (trái) và tiền (phải) */}
      <header
        className="pointer-events-none fixed inset-x-0 top-0 z-40 px-2.5 sm:px-6"
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
      >
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-2 sm:gap-3">
          {/* LEVEL CARD */}
          <div className="pointer-events-auto relative overflow-visible rounded-2xl ghibli-panel px-3 py-1.5">
            <div className="flex items-center justify-between gap-2 text-sm font-extrabold">
              <span className="flex min-w-0 items-center gap-1 text-purple-700">
                <span>✨</span>
                <span className="truncate">Lv.{state.charisma.lv} · {levelTitle(state.charisma.lv)}</span>
              </span>
              <span className="shrink-0 font-display text-xs text-ghibli-ink">
                {isMax ? 'MAX' : `${animChaPts}/${needCha}`}
              </span>
            </div>
            <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-ghibli-track">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                style={{ width: `${chaPct}%` }}
              />
            </div>
            <div className="mt-0.5 flex items-center justify-between text-[11px] font-bold text-cyan-800">
              <span>🗣️ {animXp} XP</span>
            </div>
            {renderFloats('charisma')}
            {renderFloats('xp')}
          </div>

          {/* CASH CARD */}
          <div className="pointer-events-auto relative overflow-visible rounded-2xl ghibli-panel px-3 py-1.5">
            <div className="flex items-center justify-between gap-2 text-sm font-extrabold">
              <span className="flex items-center gap-1 text-amber-700">
                <span>💵</span>
                <span className="hidden sm:inline">Cát-xê</span>
              </span>
              <span className="font-display text-amber-700">${animCash}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] font-bold text-ghibli-ink-soft">
              <span title="Danh tiếng: trung bình sao các show gần đây">
                ⭐ <span className="text-amber-700">{fmtRep(state.rep)}</span>
              </span>
              <span className="hidden sm:inline">🎤 {state.stats.shows} show</span>
              <span>🔥 {state.streak.count}d</span>
            </div>
            {renderFloats('cash')}
          </div>
        </div>
      </header>

      {/* Hàng dưới: năng lượng, luôn nhìn thấy ở đáy màn hình */}
      <footer
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-2.5 sm:px-6"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        <div className="pointer-events-auto relative mx-auto max-w-6xl overflow-visible rounded-2xl ghibli-panel px-3 py-2">
          <div className="flex items-center justify-between gap-3 text-sm font-extrabold">
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span>⚡</span>
              <span>Năng lượng</span>
            </span>
            <span className="font-display text-base text-ghibli-ink">
              {animEnergy}
              <span className="text-xs text-ghibli-ink-soft">/{state.maxEnergy}</span>
            </span>
          </div>
          <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-ghibli-track">
            <div
              className={`h-full rounded-full bg-gradient-to-r transition-all duration-300 ${energyBarColor}`}
              style={{ width: `${energyPct}%` }}
            />
          </div>
          {renderFloats('energy')}
        </div>
      </footer>
    </>
  );
};
