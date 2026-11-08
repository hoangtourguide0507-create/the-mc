import React from 'react';
import { GIG_ORDER, SCENES, SHOP, WORLD_LOCS } from '../data/content';
import { dayKey, fmtTime, getPeriodMeta, sceneStatus, yesterdayKey } from '../core/clock';
import { chaNeed, useGameStore } from '../core/store';
import { fmtRep, levelTitle, MAX_LV } from '../core/career';
import { HUD_PAD } from './HUD';
import { HubRoom3D } from '../three/HubRoom3D';
import { currentQuest, questProgress } from '../core/quests';
import { nextHint } from '../core/onboarding';

export const HubView: React.FC = () => {
  const state = useGameStore((s) => s.state);
  const goTo = useGameStore((s) => s.goTo);
  const openWorldWithTarget = useGameStore((s) => s.openWorldWithTarget);
  const setBookOpen = useGameStore((s) => s.setBookOpen);
  const setShopOpen = useGameStore((s) => s.setShopOpen);
  const toggleMute = useGameStore((s) => s.toggleMute);
  const sleepDay = useGameStore((s) => s.sleepDay);
  const toast = useGameStore((s) => s.toast);
  const setQuestOpen = useGameStore((s) => s.setQuestOpen);
  const setHelpOpen = useGameStore((s) => s.setHelpOpen);
  const hint = nextHint(state);
  const quest = currentQuest(state);
  const questProg = quest ? questProgress(quest, state) : null;

  const periodMeta = getPeriodMeta(state.clock);
  const today = dayKey();
  const yesterday = yesterdayKey();
  const streakAlive =
    state.streak.last === today || state.streak.last === yesterday;
  const streakCount = streakAlive ? state.streak.count : 0;
  const touchedToday = state.streak.last === today;

  const canSleep = state.clock >= 1080 || state.energy < 30;
  const ownedUpgrades = SHOP.filter(
    (item) => item.type === 'upgrade' && state.items[item.id]
  );

  const handleSceneCardClick = (sceneId: string) => {
    const st = sceneStatus(sceneId, state.clock, state.doneToday);
    if (st.state === 'done') {
      toast('✓ Bạn đã dẫn show này trong hôm nay rồi!', 'info');
      return;
    }
    if (st.state === 'missed') {
      toast('⚠️ Bạn đã lỡ giờ diễn của show này hôm nay!', 'warn');
      return;
    }
    const locEntry = Object.values(WORLD_LOCS).find((l) =>
      l.scenes.includes(sceneId)
    );
    if (locEntry) {
      openWorldWithTarget(locEntry.id, sceneId);
    }
  };

  return (
    <div
      className="mx-auto flex h-full max-w-6xl flex-col gap-4 overflow-y-auto px-3 pb-8 sm:px-6 md:grid md:grid-cols-12 md:overflow-hidden"
      style={{ paddingTop: HUD_PAD }}
    >
      {/* LEFT COLUMN (iPad: 5 cols): 3D Studio Room + Career Profile */}
      <div className="flex flex-col gap-3 md:col-span-5 md:h-full">
        {/* Room Header */}
        <div className="flex items-center justify-between rounded-2xl border border-white/15 bg-white/5 px-3.5 py-2.5 backdrop-blur-md">
          <div>
            <h1 className="font-display text-lg font-black leading-tight text-white">
              Phòng của MC Thiên Ân
            </h1>
            <p className="text-xs font-semibold text-purple-200">
              Ngày {Math.max(1, state.day)} trong sự nghiệp MC
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Help */}
            <button
              onClick={() => setHelpOpen(true)}
              title="Hướng dẫn chơi"
              className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-black text-white transition hover:bg-white/20"
            >
              ❓
            </button>

            {/* Streak Pill */}
            <div
              title={`Kỷ lục: ${state.streak.best} ngày`}
              className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-black ${
                touchedToday
                  ? 'border-orange-400/50 bg-orange-500/20 text-orange-300'
                  : 'border-white/15 bg-white/5 text-slate-400 grayscale'
              }`}
            >
              <span>🔥</span>
              <span>{streakCount}</span>
            </div>

            {/* Mute Toggle */}
            <button
              onClick={toggleMute}
              title={state.muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              className="rounded-full border border-white/15 bg-white/10 p-2 text-xs text-white transition hover:bg-white/20"
            >
              {state.muted ? '🔇' : '🔊'}
            </button>
          </div>
        </div>

        {/* 3D Interactive Room Viewport */}
        <div className="relative h-72 w-full flex-shrink-0 sm:h-80 md:h-auto md:flex-1">
          <HubRoom3D />

          {/* Clock Strip & Sleep Button Overlay inside 3D Room Frame */}
          <div className="pointer-events-none absolute inset-x-3 bottom-3 z-30 flex items-center justify-between">
            <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/20 bg-[#120A30]/85 px-3 py-1 text-xs font-extrabold text-white shadow-lg backdrop-blur-md">
              <span>{periodMeta.icon}</span>
              <span>{fmtTime(state.clock)}</span>
              <span className="text-slate-300">· {periodMeta.label}</span>
            </div>

            <button
              disabled={!canSleep}
              onClick={() => {
                if (
                  window.confirm(
                    'Kết thúc ngày hôm nay và đi ngủ để hồi 100% Năng lượng cho ngày mai?'
                  )
                ) {
                  sleepDay({ forced: false });
                }
              }}
              className="pointer-events-auto flex items-center gap-1 rounded-full border border-amber-300/50 bg-amber-500/25 px-3 py-1 text-xs font-black text-amber-200 shadow-lg backdrop-blur-md transition hover:scale-105 disabled:pointer-events-none disabled:opacity-35"
            >
              <span>🛌</span>
              <span>Đi ngủ</span>
            </button>
          </div>

          {/* Owned Upgrades Badges */}
          {ownedUpgrades.length > 0 && (
            <div className="pointer-events-none absolute left-3 top-3 z-30 flex flex-wrap gap-1.5">
              {ownedUpgrades.map((up) => (
                <span
                  key={up.id}
                  className="rounded-full border border-amber-400/50 bg-[#120A30]/90 px-2.5 py-0.5 text-[11px] font-bold text-amber-200 shadow"
                >
                  {up.icon} {up.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Career Profile Card (visible on iPad or bottom of room) */}
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/15 bg-white/5 p-3 text-center backdrop-blur-md">
          <div>
            <div className="font-display text-base font-black text-cyan-300">
              {state.learned.length + 5}
            </div>
            <div className="text-[11px] font-semibold text-slate-300">Cụm từ đã mở</div>
          </div>
          <div>
            <div className="font-display text-base font-black text-pink-300">
              {state.stats.shows}
            </div>
            <div className="text-[11px] font-semibold text-slate-300">Show đã dẫn</div>
          </div>
          <div>
            <div className="font-display text-base font-black text-purple-300">
              {state.charisma.lv >= MAX_LV
                ? '⭐ ' + fmtRep(state.rep)
                : `${Math.max(0, chaNeed(state.charisma.lv) - state.charisma.pts)} điểm`}
            </div>
            <div className="text-[11px] font-semibold text-slate-300">
              {state.charisma.lv >= MAX_LV
                ? 'Ngôi sao MC · Danh tiếng'
                : `Tới Lv.${state.charisma.lv + 1} · ${levelTitle(state.charisma.lv + 1)}`}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN (iPad: 7 cols): Actions, Daily Runs, Tools & Show Schedule Rail */}
      <div className="flex flex-col gap-3.5 md:col-span-7 md:h-full md:overflow-y-auto md:pr-1">
        {/* Big CTA: Ra Phố (3D Isometric City Map) */}
        <button
          onClick={() => goTo('world', { title: '🗺️ Đang bước ra Thành phố 3D...' })}
          className="group relative flex w-full items-center justify-between overflow-hidden rounded-3xl border border-pink-400/50 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-4 text-left shadow-[0_0_30px_rgba(255,79,216,0.3)] transition hover:scale-[1.01]"
        >
          <div className="flex items-center gap-3.5">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-2xl shadow-inner backdrop-blur-sm">
              🗺️
            </span>
            <div>
              <div className="font-display text-lg font-black text-white">
                Ra Phố · Bản Đồ Thành Phố 3D
              </div>
              <div className="text-xs font-semibold text-pink-100">
                Đi bộ tới các sảnh sự kiện, ngắm phố ngày/đêm & trò chuyện cùng người đi đường
              </div>
            </div>
          </div>
          <span className="rounded-full bg-white/20 px-3.5 py-1.5 text-xs font-black text-white transition group-hover:translate-x-1">
            Khám phá ➔
          </span>
        </button>

        {/* Gợi ý bước tiếp theo cho người mới */}
        {hint && (
          <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-3.5 text-xs font-semibold leading-relaxed text-amber-100">
            💡 {hint}
          </div>
        )}

        {/* Quest hiện tại: mở bảng nhiệm vụ đầy đủ */}
        <button
          onClick={() => setQuestOpen(true)}
          className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-400/35 bg-emerald-500/10 p-3.5 text-left transition hover:border-emerald-400 hover:bg-emerald-500/20"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-400/20 text-xl">
              📜
            </span>
            <div className="min-w-0">
              <div className="text-[11px] font-black uppercase tracking-wider text-emerald-300">
                Nhiệm vụ hiện tại
              </div>
              <div className="truncate font-display text-sm font-black text-white">
                {quest ? quest.title : 'Bạn đã hoàn thành tất cả nhiệm vụ! 🏆'}
              </div>
            </div>
          </div>
          <span className="flex-shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-xs font-black text-white">
            {questProg ? `${questProg.met}/${questProg.total}` : '✓'}
          </span>
        </button>

        {/* Two Free Daily Activities (Morning Coffee & Supermarket) */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-sm font-black uppercase tracking-wider text-emerald-300">
              ⚡ Hoạt Động Hằng Ngày (Miễn Phí · Hồi Năng Lượng)
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {(['coffee', 'market'] as const).map((dId) => {
              const sc = SCENES[dId];
              const st = sceneStatus(dId, state.clock, state.doneToday);
              return (
                <button
                  key={dId}
                  onClick={() => handleSceneCardClick(dId)}
                  className="flex flex-col justify-between rounded-2xl border border-white/15 bg-white/5 p-3.5 text-left transition hover:border-emerald-400/60 hover:bg-white/10"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-xl">
                        {sc.icon}
                      </span>
                      <div>
                        <div className="font-display text-sm font-black text-white">
                          {sc.title}
                        </div>
                        <div className="text-[11px] font-bold text-emerald-300">
                          +{sc.reward.energy} ⚡ · +{sc.reward.charisma} Charisma
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between border-t border-white/10 pt-2 text-[11px]">
                    <span
                      className={`font-bold ${
                        st.state === 'open' ? 'text-cyan-300' : 'text-slate-400'
                      }`}
                    >
                      🕒 {st.label}
                    </span>
                    <span className="font-extrabold text-white">Đi tới ➔</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Phrasebook & Shop Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => setBookOpen(true)}
            className="relative flex items-center gap-3 rounded-2xl border border-cyan-400/35 bg-cyan-500/10 p-3.5 text-left transition hover:border-cyan-400 hover:bg-cyan-500/20"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/20 text-xl">
              📖
            </span>
            <div>
              <div className="font-display text-sm font-black text-white">
                Sổ Tay Từ Vựng
              </div>
              <div className="text-[11px] font-semibold text-cyan-200">
                {state.weak.length > 0
                  ? `${state.weak.length} từ cần luyện lại`
                  : `${state.learned.length + 5} mẫu câu MC`}
              </div>
            </div>
            {state.weak.length > 0 && (
              <span className="absolute right-3 top-3 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-black text-white shadow">
                {state.weak.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setShopOpen(true)}
            className="flex items-center gap-3 rounded-2xl border border-amber-400/35 bg-amber-500/10 p-3.5 text-left transition hover:border-amber-400 hover:bg-amber-500/20"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/20 text-xl">
              🛍️
            </span>
            <div>
              <div className="font-display text-sm font-black text-white">
                Cửa Hàng MC
              </div>
              <div className="text-[11px] font-semibold text-amber-200">
                Nạp ⚡ & Trang bị 3D (${state.cash})
              </div>
            </div>
          </button>
        </div>

        {/* GIG_ORDER Horizontal Poster Rail */}
        <div className="flex-1">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-sm font-black uppercase tracking-wider text-pink-300">
              🎬 Lịch Nhận Show Hôm Nay (Vuốt Ngang)
            </h2>
            <span className="text-[11px] font-semibold text-slate-400">
              Mở cửa trước 60 phút
            </span>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-3 pt-1">
            {GIG_ORDER.map((sceneId) => {
              const sc = SCENES[sceneId];
              const st = sceneStatus(sceneId, state.clock, state.doneToday);
              const lockedLv = state.charisma.lv < sc.reqLv;
              const lockedRep =
                !lockedLv &&
                Boolean(sc.minRep) &&
                (state.rep.n <= 0 || state.rep.avg < (sc.minRep || 0));
              const isDoneOrMissed = st.state === 'done' || st.state === 'missed';
              const bestStars = state.stats.bestStars[sceneId] || 0;

              return (
                <div
                  key={sceneId}
                  onClick={() => handleSceneCardClick(sceneId)}
                  className={`group relative flex w-64 flex-shrink-0 cursor-pointer flex-col justify-between overflow-hidden rounded-3xl border p-4 transition hover:-translate-y-0.5 ${
                    isDoneOrMissed
                      ? 'border-white/10 bg-white/5 opacity-60'
                      : lockedLv || lockedRep
                      ? 'border-white/15 bg-white/5 opacity-75'
                      : 'border-white/20 bg-gradient-to-b from-white/10 to-white/5 hover:border-pink-400/60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold ${sc.tagCls}`}
                      >
                        {sc.tag}
                      </span>
                      <div className="flex gap-0.5 text-xs">
                        {[1, 2, 3].map((s) => (
                          <span
                            key={s}
                            className={
                              s <= bestStars ? 'text-amber-400' : 'text-white/20'
                            }
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2.5">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-2xl shadow-inner">
                        {sc.icon}
                      </span>
                      <div>
                        <h3 className="font-display text-base font-black leading-snug text-white">
                          {sc.title}
                        </h3>
                        <span className="text-[11px] font-bold text-slate-300">
                          {sc.level} · Cần Lv.{sc.reqLv}
                          {sc.minRep ? ` · ⭐${sc.minRep.toFixed(1)}` : ''}
                        </span>
                      </div>
                    </div>

                    <p className="mt-2 line-clamp-2 text-xs text-slate-300">
                      {sc.sub}
                    </p>
                  </div>

                  <div className="mt-4 space-y-2 border-t border-white/10 pt-2.5">
                    <div className="flex items-center justify-between text-xs font-extrabold">
                      <span className="text-amber-300">+${sc.reward.cash}</span>
                      <span className="text-purple-300">
                        +{sc.reward.charisma} Cha
                      </span>
                      <span className="text-rose-300">−{sc.energy} ⚡</span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-black/35 px-2.5 py-1.5 text-[11px] font-bold">
                      <span
                        className={
                          st.state === 'open'
                            ? 'text-emerald-300'
                            : st.state === 'late'
                            ? 'text-amber-300'
                            : 'text-slate-300'
                        }
                      >
                        {st.label}
                      </span>
                    </div>
                  </div>

                  {/* Lock or Done Stamp Overlay */}
                  {(lockedLv || lockedRep) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#120A30]/75 backdrop-blur-[2px]">
                      <div className="rounded-2xl border border-purple-400/50 bg-[#120A30]/95 px-3.5 py-2 text-center shadow-xl">
                        <div className="text-lg">🔒</div>
                        <div className="text-xs font-black text-purple-200">
                          {lockedLv
                            ? `Cần Lv.${sc.reqLv} · ${levelTitle(sc.reqLv)}`
                            : `Cần Danh tiếng ⭐ ${(sc.minRep || 0).toFixed(1)}`}
                        </div>
                        {lockedRep && (
                          <div className="mt-0.5 text-[10px] font-bold text-slate-400">
                            Hiện tại: ⭐ {fmtRep(state.rep)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {st.state === 'done' && (
                    <div className="pointer-events-none absolute right-3 top-12 rotate-12 rounded-xl border-2 border-emerald-400 bg-emerald-950/90 px-2.5 py-1 text-xs font-black text-emerald-300 shadow-lg">
                      ✓ ĐÃ DẪN
                    </div>
                  )}
                  {st.state === 'missed' && (
                    <div className="pointer-events-none absolute right-3 top-12 rotate-12 rounded-xl border-2 border-rose-400 bg-rose-950/90 px-2.5 py-1 text-xs font-black text-rose-300 shadow-lg">
                      LỠ SHOW
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
