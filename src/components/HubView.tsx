import React, { useState } from 'react';
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

  // Điều khiển ngăn kéo Lịch Show & Hoạt động (Mở sẵn để thấy vé show, có thể thu gọn để ngắm trọn phòng 3D)
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'daily' | 'gigs'>('all');

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
    const sc = SCENES[sceneId];
    if (sc && state.charisma.lv < sc.reqLv) {
      toast(`🔒 Cần Charisma Lv.${sc.reqLv} để mở khoá show này!`, 'warn');
      return;
    }
    if (sc?.minRep && (state.rep.n <= 0 || state.rep.avg < sc.minRep)) {
      toast(`🔒 Cần Danh tiếng ⭐ ${sc.minRep.toFixed(1)} để nhận show này!`, 'warn');
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
    <div className="relative h-full w-full overflow-hidden">
      {/* 1. BACKGROUND: 100% FULL-SCREEN 3D INTERACTIVE STUDIO */}
      <div className="absolute inset-0 z-0">
        <HubRoom3D />
      </div>

      {/* 2. TOP SUB-HUD FLOATING BAR (Clock, Career Mini-Stats, Quest & Utility Pills) */}
      <div
        className="pointer-events-none absolute inset-x-0 z-20 mx-auto flex max-w-6xl flex-col gap-2 px-2.5 sm:px-5"
        style={{ top: HUD_PAD }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Left Cluster: Clock + Sleep + Career Quick Pill */}
          <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Time & Day Pill */}
            <div className="cozy-pill flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-extrabold text-ghibli-ink">
              <span className="text-sm">{periodMeta.icon}</span>
              <span className="font-display text-sm font-black">{fmtTime(state.clock)}</span>
              <span className="text-ghibli-ink-soft">· {periodMeta.label}</span>
              <span className="rounded-full bg-[#F3E8D4] px-2 py-0.5 text-xs font-black text-[#8A5A00]">
                Ngày {Math.max(1, state.day)}
              </span>
            </div>

            {/* Sleep Button (Highlighted when canSleep) */}
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
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-black transition ${
                canSleep
                  ? 'btn-tactile-amber'
                  : 'cozy-pill opacity-50'
              }`}
              title="Chỉ ngủ được từ 18:00 hoặc khi Năng lượng dưới 30"
            >
              <span>🛌</span>
              <span>Đi ngủ</span>
            </button>

            {/* Career Stats Pill (data-tour="career") */}
            <div
              data-tour="career"
              className="cozy-pill hidden items-center gap-2.5 rounded-full px-3 py-1.5 text-xs font-bold sm:flex"
            >
              <span className="text-[#1F7A73]" title="Cụm từ đã mở">
                📖 <strong>{state.learned.length + 5}</strong> câu
              </span>
              <span className="text-[#C83E6B]" title="Show đã dẫn">
                🎤 <strong>{state.stats.shows}</strong> show
              </span>
              <span className="text-[#6535C4]">
                {state.charisma.lv >= MAX_LV
                  ? `⭐ ${fmtRep(state.rep)}`
                  : `Cần ${Math.max(0, chaNeed(state.charisma.lv) - state.charisma.pts)} Cha → Lv.${state.charisma.lv + 1}`}
              </span>
            </div>
          </div>

          {/* Right Cluster: Quest Chip + Streak + Mute + Help */}
          <div className="pointer-events-auto flex items-center gap-1.5">
            {/* Quest Tracker Pill */}
            <button
              onClick={() => setQuestOpen(true)}
              className="btn-tactile flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-extrabold"
            >
              <span>📜</span>
              <span className="max-w-[130px] truncate font-display font-black text-ghibli-ink sm:max-w-[200px]">
                {quest ? quest.title : 'Hoàn thành nhiệm vụ 🏆'}
              </span>
              <span className="rounded-full bg-[#E4F5DE] px-2 py-0.5 text-xs font-black text-[#2F7520]">
                {questProg ? `${questProg.met}/${questProg.total}` : '✓'}
              </span>
            </button>

            {/* Streak Pill */}
            <div
              title={`Chuỗi ngày: ${streakCount} (Kỷ lục: ${state.streak.best} ngày)`}
              className={`cozy-pill flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-black ${
                touchedToday ? 'bg-[#FFF3D6] text-[#C96412]' : 'text-ghibli-ink-soft opacity-70'
              }`}
            >
              <span>🔥</span>
              <span>{streakCount}</span>
            </div>

            {/* Mute Toggle */}
            <button
              onClick={toggleMute}
              title={state.muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              className="btn-tactile flex h-9 w-9 items-center justify-center rounded-full text-xs"
            >
              {state.muted ? '🔇' : '🔊'}
            </button>

            {/* Help Button */}
            <button
              onClick={() => setHelpOpen(true)}
              title="Hướng dẫn chơi"
              className="btn-tactile flex h-9 w-9 items-center justify-center rounded-full text-xs font-black"
            >
              ❓
            </button>
          </div>
        </div>

        {/* Mobile Career Stats Row (for narrow screens so data-tour="career" is always visible) */}
        <div className="pointer-events-auto flex items-center justify-between gap-2 sm:hidden">
          <div
            data-tour="career"
            className="cozy-pill flex items-center gap-2.5 rounded-full px-3 py-1 text-xs font-bold"
          >
            <span className="text-[#1F7A73]">📖 {state.learned.length + 5} câu</span>
            <span className="text-[#C83E6B]">🎤 {state.stats.shows} show</span>
            <span className="text-[#6535C4]">
              {state.charisma.lv >= MAX_LV
                ? `⭐ ${fmtRep(state.rep)}`
                : `Cần ${Math.max(0, chaNeed(state.charisma.lv) - state.charisma.pts)} Cha`}
            </span>
          </div>

          {ownedUpgrades.length > 0 && (
            <div className="cozy-pill flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-[#9C650C]">
              {ownedUpgrades.map((u) => (
                <span key={u.id} title={u.name}>
                  {u.icon}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Onboarding Coach Hint Pill */}
        {hint && (
          <div className="pointer-events-auto flex items-center justify-between gap-2 self-start rounded-2xl border border-[#E5B85B] bg-[#FFF8E4] px-3.5 py-2 text-xs font-bold text-[#7D4E00] shadow-md">
            <span>💡 {hint}</span>
          </div>
        )}
      </div>

      {/* 3. BOTTOM FLOATING SCHEDULE DRAWER + NAVIGATION DOCK */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 mx-auto flex max-w-6xl flex-col gap-2 px-2.5 sm:px-5"
        style={{ paddingBottom: 'max(0.6rem, env(safe-area-inset-bottom))' }}
      >
        {/* Collapsible Ticket Drawer */}
        <div
          className={`pointer-events-auto overflow-hidden rounded-3xl border border-[#DFC9AE] bg-[#FFFDF9]/95 shadow-[0_-4px_24px_rgba(59,42,34,0.12)] transition-all duration-300 ${
            drawerOpen ? 'p-3 sm:p-4' : 'px-4 py-2'
          }`}
        >
          {/* Drawer Header Bar */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setDrawerOpen(true);
                  setActiveTab('all');
                }}
                className={`rounded-full px-3 py-1 text-xs font-black transition ${
                  activeTab === 'all' && drawerOpen
                    ? 'bg-[#3B2A22] text-white'
                    : 'bg-[#F4EBDC] text-ghibli-ink-soft hover:bg-[#EADBC4]'
                }`}
              >
                ✨ Tất cả ({2 + GIG_ORDER.length})
              </button>
              <button
                onClick={() => {
                  setDrawerOpen(true);
                  setActiveTab('daily');
                }}
                className={`rounded-full px-3 py-1 text-xs font-black transition ${
                  activeTab === 'daily' && drawerOpen
                    ? 'bg-[#489E35] text-white'
                    : 'bg-[#E9F6E5] text-[#2F7520] hover:bg-[#D8EFD0]'
                }`}
              >
                ⚡ Nạp sức Miễn phí
              </button>
              <button
                onClick={() => {
                  setDrawerOpen(true);
                  setActiveTab('gigs');
                }}
                className={`rounded-full px-3 py-1 text-xs font-black transition ${
                  activeTab === 'gigs' && drawerOpen
                    ? 'bg-[#D94E2F] text-white'
                    : 'bg-[#FDECE7] text-[#B2351A] hover:bg-[#FADCD3]'
                }`}
              >
                🎬 Vé Show Hôm Nay
              </button>
            </div>

            <button
              onClick={() => setDrawerOpen((v) => !v)}
              className="btn-tactile flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black text-ghibli-ink"
            >
              <span>{drawerOpen ? 'Thu gọn ▾' : 'Mở lịch ▴'}</span>
            </button>
          </div>

          {/* Horizontal Ticket Rail */}
          {drawerOpen && (
            <div
              data-tour="gigs"
              className="mt-3 flex gap-3 overflow-x-auto pb-1.5 pt-0.5"
            >
              {/* A. Free Daily Activity Tickets */}
              {(activeTab === 'all' || activeTab === 'daily') &&
                (['coffee', 'market'] as const).map((dId) => {
                  const sc = SCENES[dId];
                  const st = sceneStatus(dId, state.clock, state.doneToday);
                  const isDone = st.state === 'done';
                  return (
                    <button
                      key={dId}
                      data-tour={dId === 'coffee' ? 'coffee' : undefined}
                      onClick={() => handleSceneCardClick(dId)}
                      className={`ticket-pass group flex w-60 shrink-0 flex-col justify-between rounded-2xl p-3 text-left transition hover:-translate-y-0.5 ${
                        isDone ? 'opacity-65' : ''
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="rounded-full bg-[#E5F6DF] px-2.5 py-0.5 text-xs font-black text-[#2C731D]">
                            ⚡ MIỄN PHÍ · +{sc.reward.energy}⚡
                          </span>
                          <span className="text-xs font-bold text-ghibli-ink-soft">
                            +{sc.reward.charisma} Cha
                          </span>
                        </div>

                        <div className="mt-2.5 flex items-center gap-2.5">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E6F7E0] to-[#C8ECC0] text-2xl shadow-sm">
                            {sc.icon}
                          </span>
                          <div className="min-w-0">
                            <h3 className="truncate font-display text-sm font-black text-ghibli-ink">
                              {sc.title}
                            </h3>
                            <p className="truncate text-xs font-semibold text-ghibli-ink-soft">
                              {sc.sub}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Perforated Ticket Footer */}
                      <div className="mt-3 flex items-center justify-between border-t-2 border-dashed border-[#E6D6C1] pt-2 text-xs">
                        <span
                          className={`font-extrabold ${
                            st.state === 'open' ? 'text-[#1F7A73]' : 'text-ghibli-ink-soft'
                          }`}
                        >
                          🕒 {st.label}
                        </span>
                        <span className="rounded-full bg-[#489E35] px-2.5 py-0.5 font-black text-white shadow-sm transition group-hover:translate-x-0.5">
                          {isDone ? 'Đã xong ✓' : 'Vào ➔'}
                        </span>
                      </div>
                    </button>
                  );
                })}

              {/* B. Show Event Ticket Passes */}
              {(activeTab === 'all' || activeTab === 'gigs') &&
                GIG_ORDER.map((sceneId) => {
                  const sc = SCENES[sceneId];
                  const st = sceneStatus(sceneId, state.clock, state.doneToday);
                  const lockedLv = state.charisma.lv < sc.reqLv;
                  const lockedRep =
                    !lockedLv &&
                    Boolean(sc.minRep) &&
                    (state.rep.n <= 0 || state.rep.avg < (sc.minRep || 0));
                  const isLocked = lockedLv || lockedRep;
                  const isDoneOrMissed = st.state === 'done' || st.state === 'missed';
                  const bestStars = state.stats.bestStars[sceneId] || 0;

                  return (
                    <div
                      key={sceneId}
                      onClick={() => handleSceneCardClick(sceneId)}
                      className={`ticket-pass group relative flex w-64 shrink-0 cursor-pointer flex-col justify-between overflow-hidden rounded-2xl p-3 transition hover:-translate-y-0.5 ${
                        isDoneOrMissed ? 'opacity-60' : ''
                      }`}
                    >
                      <div>
                        {/* Ticket Top Strip */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="rounded-full bg-[#FFF0D4] px-2.5 py-0.5 text-xs font-black text-[#9C5B00]">
                            🎟️ {sc.tag}
                          </span>
                          <div className="flex gap-0.5 text-xs">
                            {[1, 2, 3].map((s) => (
                              <span
                                key={s}
                                className={
                                  s <= bestStars ? 'text-[#F0A32A]' : 'text-ghibli-ink/15'
                                }
                              >
                                ★
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Show Title & Icon */}
                        <div className="mt-2.5 flex items-center gap-2.5">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFF4DC] to-[#FCE0B0] text-2xl shadow-sm">
                            {sc.icon}
                          </span>
                          <div className="min-w-0">
                            <h3 className="truncate font-display text-sm font-black text-ghibli-ink">
                              {sc.title}
                            </h3>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-ghibli-ink-soft">
                              <span>+${sc.reward.cash}</span>
                              <span>·</span>
                              <span className="text-[#6535C4]">+{sc.reward.charisma} Cha</span>
                              <span>·</span>
                              <span className="text-[#C84B31]">−{sc.energy}⚡</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Perforated Ticket Tear Line & Time Status */}
                      <div className="mt-3 flex items-center justify-between border-t-2 border-dashed border-[#E6D6C1] pt-2 text-xs">
                        <span
                          className={`font-extrabold ${
                            st.state === 'open'
                              ? 'text-[#2C731D]'
                              : st.state === 'late'
                              ? 'text-[#B8700B]'
                              : 'text-ghibli-ink-soft'
                          }`}
                        >
                          🕒 {st.label}
                        </span>
                        <span className="rounded-full bg-[#FFF0D4] px-2.5 py-0.5 font-black text-[#8A5A00] transition group-hover:translate-x-0.5">
                          Nhận show ➔
                        </span>
                      </div>

                      {/* Lock Badge Overlay (Sleek Frosted Ribbon instead of ugly full-box block) */}
                      {isLocked && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[#FFFDF9]/85 p-3">
                          <div className="rounded-2xl border border-[#D4B896] bg-[#FFF8EB] px-3.5 py-2 text-center shadow-md">
                            <div className="text-xs font-black text-[#6535C4]">
                              🔒 {lockedLv
                                ? `Cần Lv.${sc.reqLv} · ${levelTitle(sc.reqLv)}`
                                : `Cần Danh tiếng ⭐ ${(sc.minRep || 0).toFixed(1)}`}
                            </div>
                            {lockedRep && (
                              <div className="mt-0.5 text-xs font-semibold text-ghibli-ink-soft">
                                Hiện có: ⭐ {fmtRep(state.rep)}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {st.state === 'done' && (
                        <div className="pointer-events-none absolute right-2.5 top-9 rotate-6 rounded-full bg-[#489E35] px-2.5 py-0.5 text-xs font-black text-white shadow">
                          ✓ ĐÃ DẪN
                        </div>
                      )}
                      {st.state === 'missed' && (
                        <div className="pointer-events-none absolute right-2.5 top-9 rotate-6 rounded-full bg-[#D94E2F] px-2.5 py-0.5 text-xs font-black text-white shadow">
                          LỠ GIỜ
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Floating Bottom Navigation Dock */}
        <nav className="pointer-events-auto mx-auto flex w-full max-w-2xl items-center justify-between gap-2 rounded-3xl border border-[#DFC9AE] bg-[#FFFDF9]/95 p-2 shadow-[0_8px_28px_rgba(59,42,34,0.16)]">
          {/* 1. Toggle Schedule */}
          <button
            onClick={() => setDrawerOpen((v) => !v)}
            className={`btn-tactile flex flex-1 flex-col items-center justify-center rounded-2xl py-2 text-xs font-extrabold ${
              drawerOpen ? 'bg-[#FFF3D6] text-[#9C5B00]' : ''
            }`}
          >
            <span className="text-lg leading-none">🎟️</span>
            <span className="mt-1">Lịch Show</span>
          </button>

          {/* 2. Sổ Tay Từ Vựng */}
          <button
            onClick={() => setBookOpen(true)}
            className="btn-tactile relative flex flex-1 flex-col items-center justify-center rounded-2xl py-2 text-xs font-extrabold"
          >
            <span className="text-lg leading-none">📖</span>
            <span className="mt-1">Sổ Tay</span>
            {state.weak.length > 0 && (
              <span className="absolute right-2.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#D94E2F] px-1 text-xs font-black text-white shadow">
                {state.weak.length}
              </span>
            )}
          </button>

          {/* 3. PRIMARY CENTER CTA: RA PHỐ 3D (data-tour="map") */}
          <button
            data-tour="map"
            onClick={() => goTo('world', { title: '🗺️ Đang bước ra Thành phố 3D...' })}
            className="btn-tactile-sage flex flex-[1.45] items-center justify-center gap-2 rounded-2xl px-4 py-3 font-display text-sm font-black text-white"
          >
            <span className="text-xl leading-none">🗺️</span>
            <div className="text-left leading-tight">
              <div>Ra Phố 3D</div>
              <div className="text-xs font-semibold text-white/90">Dạo phố & Nhận show</div>
            </div>
          </button>

          {/* 4. Cửa Hàng MC */}
          <button
            onClick={() => setShopOpen(true)}
            className="btn-tactile flex flex-1 flex-col items-center justify-center rounded-2xl py-2 text-xs font-extrabold"
          >
            <span className="text-lg leading-none">🛍️</span>
            <span className="mt-1">Cửa Hàng</span>
          </button>

          {/* 5. Nhiệm Vụ */}
          <button
            onClick={() => setQuestOpen(true)}
            className="btn-tactile flex flex-1 flex-col items-center justify-center rounded-2xl py-2 text-xs font-extrabold"
          >
            <span className="text-lg leading-none">📜</span>
            <span className="mt-1">Nhiệm Vụ</span>
          </button>
        </nav>
      </div>
    </div>
  );
};
