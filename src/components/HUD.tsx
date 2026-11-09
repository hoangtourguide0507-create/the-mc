import React, { useEffect, useRef, useState } from 'react';
import { chaNeed, useGameStore } from '../core/store';
import { fmtRep, levelTitle, MAX_LV } from '../core/career';

/** Khoảng đệm trên: chỉ còn 1 dải Pill nổi gọn gàng ở đỉnh màn hình */
export const HUD_PAD = 'calc(max(0.5rem, env(safe-area-inset-top)) + 54px)';
/** Khoảng đệm dưới: đã bỏ thanh năng lượng khổng lồ ở đáy, chỉ chừa safe-area */
export const HUD_BOTTOM_PAD = 'calc(max(0.5rem, env(safe-area-inset-bottom)) + 8px)';

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
  const setShopOpen = useGameStore((s) => s.setShopOpen);

  const animEnergy = useAnimatedNumber(state.energy);
  const animChaPts = useAnimatedNumber(state.charisma.pts);
  const animXp = useAnimatedNumber(state.xp);
  const animCash = useAnimatedNumber(state.cash);

  const energyPct = Math.round((state.energy / state.maxEnergy) * 100);
  const energyFillColor =
    energyPct <= 25
      ? 'bg-gradient-to-r from-[#F06D4E] to-[#D94E2F]'
      : energyPct <= 50
      ? 'bg-gradient-to-r from-[#FFC652] to-[#F0A32A]'
      : 'bg-gradient-to-r from-[#74C65E] to-[#4F9E3A]';

  const isMax = state.charisma.lv >= MAX_LV;
  const needCha = chaNeed(state.charisma.lv);
  const chaPct = isMax ? 100 : Math.min(100, Math.round((state.charisma.pts / needCha) * 100));

  const renderFloats = (stat: 'energy' | 'charisma' | 'xp' | 'cash') =>
    floatingGains
      .filter((f) => f.stat === stat)
      .map((f) => (
        <span
          key={f.id}
          className={`pointer-events-none absolute -bottom-6 right-1 z-50 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-black shadow-md ${
            f.delta > 0
              ? 'border border-[#3F8D2B] bg-[#E8F8E2] text-[#286618]'
              : 'border border-[#AE361B] bg-[#FDECE7] text-[#B2351A]'
          }`}
        >
          {f.delta > 0 ? `+${f.delta}` : f.delta}
        </span>
      ));

  return (
    <header
      className="pointer-events-none fixed inset-x-0 top-0 z-40 px-2.5 sm:px-5"
      style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-1.5 sm:gap-2.5">
        {/* 1. LEVEL & XP PILL (Left) */}
        <div className="cozy-pill pointer-events-auto relative flex min-w-0 items-center gap-2 rounded-full py-1 pl-1.5 pr-3">
          {/* Circular Level Badge */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#9B6BFF] to-[#7342D6] font-display text-xs font-black text-white shadow-inner">
            Lv.{state.charisma.lv}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="hidden truncate text-xs font-extrabold text-ghibli-ink sm:inline">
                {levelTitle(state.charisma.lv)}
              </span>
              <span className="text-xs font-black text-[#6535C4]">
                {isMax ? 'MAX' : `${animChaPts}/${needCha}`}
              </span>
              <span className="text-xs font-bold text-[#1F7A73]">
                · 🗣️ {animXp}
              </span>
            </div>
            {/* Mini Charisma Progress Bar */}
            <div className="mt-0.5 h-1.5 w-24 overflow-hidden rounded-full bg-[#EFE6D5] sm:w-36">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#9B6BFF] to-[#43B0A8] transition-all duration-300"
                style={{ width: `${chaPct}%` }}
              />
            </div>
          </div>
          {renderFloats('charisma')}
          {renderFloats('xp')}
        </div>

        {/* 2. ENERGY, CASH & REP PILLS (Right) */}
        <div className="pointer-events-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          {/* Compact Tactile Energy Pill (Click opens Shop to refill) */}
          <button
            onClick={() => setShopOpen(true)}
            title="Năng lượng (Chạm để nạp thêm)"
            className="cozy-pill relative flex items-center gap-1.5 rounded-full px-2.5 py-1.5 transition hover:bg-[#FFF6E6] active:translate-y-0.5"
          >
            <span className="text-xs">⚡</span>
            <div className="flex flex-col items-start">
              <div className="flex items-baseline gap-0.5 font-display text-xs font-black leading-none text-ghibli-ink">
                <span>{animEnergy}</span>
                <span className="hidden text-xs font-semibold text-ghibli-ink-soft sm:inline">
                  /{state.maxEnergy}
                </span>
              </div>
              <div className="mt-0.5 h-1.5 w-11 overflow-hidden rounded-full bg-[#EFE6D5] sm:w-14">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${energyFillColor}`}
                  style={{ width: `${energyPct}%` }}
                />
              </div>
            </div>
            {renderFloats('energy')}
          </button>

          {/* Cash & Reputation Pill */}
          <button
            onClick={() => setShopOpen(true)}
            title={`Cát-xê & Danh tiếng (${state.stats.shows} show đã dẫn)`}
            className="cozy-pill relative flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-extrabold transition hover:bg-[#FFF6E6] active:translate-y-0.5"
          >
            <span className="flex items-center gap-1 font-display font-black text-[#B8700B]">
              <span>💵</span>
              <span>${animCash}</span>
            </span>
            <span className="h-3 w-[1px] bg-[#E2D4BE]" />
            <span className="flex items-center gap-0.5 font-bold text-[#B8700B]" title="Danh tiếng trung bình">
              <span>⭐</span>
              <span>{fmtRep(state.rep)}</span>
            </span>
            <span className="hidden items-center gap-0.5 font-bold text-[#D95B26] md:flex" title="Chuỗi ngày luyện tập">
              <span>· 🔥</span>
              <span>{state.streak.count}d</span>
            </span>
            {renderFloats('cash')}
          </button>
        </div>
      </div>
    </header>
  );
};
