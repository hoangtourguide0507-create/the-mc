import React, { useEffect, useMemo, useState } from 'react';
import { PASSER_LOOKS, SCENES, SHOP, STARTER } from '../data/content';
import { dayPlan, fmtTime } from '../core/clock';
import { wordSim } from '../core/evaluator';
import { useGameStore } from '../core/store';
import { SFX, SpeechEngine, Voice } from '../audio/audioSystem';
import { Confetti } from './Confetti';

// 1. WELCOME OVERLAY (Unlocks iOS Web Audio + TTS on first tap)
export const WelcomeOverlay: React.FC = () => {
  const view = useGameStore((s) => s.view);
  const state = useGameStore((s) => s.state);
  const startDayFromWelcome = useGameStore((s) => s.startDayFromWelcome);

  if (view !== 'welcome') return null;

  const plan = dayPlan(state);
  const btnLabel =
    plan === 'resume'
      ? `▶️ Tiếp tục Ngày ${state.day} · ${fmtTime(state.clock)}`
      : state.day > 0
      ? `🌅 Bắt đầu Ngày ${state.day + 1} (07:00)`
      : '🌅 Bắt đầu Ngày mới (07:00)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#120A30]/95 p-4 backdrop-blur-2xl">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-b from-[#23145B] to-[#120A30] p-6 text-center shadow-[0_0_60px_rgba(255,79,216,0.35)]">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl border border-pink-400/50 bg-gradient-to-br from-pink-500/30 to-cyan-500/30 text-4xl shadow-inner">
          🎙️
        </div>
        <div className="inline-block rounded-full border border-cyan-400/40 bg-cyan-500/15 px-3 py-0.5 text-[11px] font-black uppercase tracking-widest text-cyan-300">
          3D WebGL Edition · Neon Stage × Clay
        </div>
        <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-white">
          MC Life · English Stage
        </h1>
        <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-300">
          Nhập vai <strong className="text-pink-300">MC Thiên Ân</strong> trong thành phố 3D sống động:
          đi bộ nhận show đúng giờ, luyện nghe phản xạ <strong className="text-cyan-300">Blind Listening</strong> và
          làm chủ sân khấu song ngữ!
        </p>

        <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-black/25 p-3 text-xs">
          <div>
            <div className="font-black text-emerald-300">📖 Reading</div>
            <div className="text-[10px] text-slate-400">Cue Card & Semi</div>
          </div>
          <div>
            <div className="font-black text-cyan-300">🎧 Listening</div>
            <div className="text-[10px] text-slate-400">Blind & In-ear</div>
          </div>
          <div>
            <div className="font-black text-pink-300">🗣️ Speaking</div>
            <div className="text-[10px] text-slate-400">Chấm phát âm AI</div>
          </div>
        </div>

        <button
          onClick={startDayFromWelcome}
          className="mt-6 w-full rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 py-4 font-display text-base font-black text-white shadow-[0_0_30px_rgba(255,79,216,0.5)] transition hover:scale-[1.02]"
        >
          {btnLabel}
        </button>

        <p className="mt-3 text-[11px] text-slate-400">
          Chạm nút trên để kích hoạt Âm thanh 3D & Giọng đọc TTS trên thiết bị.
        </p>
      </div>
    </div>
  );
};

// 2. PHRASEBOOK & WEAK WORDS PRACTICE SHEET
export const PhrasebookSheet: React.FC = () => {
  const bookOpen = useGameStore((s) => s.bookOpen);
  const bookInitialTab = useGameStore((s) => s.bookInitialTab);
  const setBookOpen = useGameStore((s) => s.setBookOpen);
  const state = useGameStore((s) => s.state);
  const resolveWeakWord = useGameStore((s) => s.resolveWeakWord);
  const toast = useGameStore((s) => s.toast);

  const [activeTab, setActiveTab] = useState(bookInitialTab);
  const [practicingKey, setPracticingKey] = useState<string | null>(null);

  useEffect(() => {
    if (bookOpen) {
      setActiveTab(bookInitialTab);
    }
  }, [bookOpen, bookInitialTab]);

  const allPhrases = useMemo(() => {
    const list: { id: string; en: string; vi: string; cat: string; unlocked: boolean }[] =
      STARTER.map((s) => ({ ...s, unlocked: true }));

    for (const sc of Object.values(SCENES)) {
      sc.turns.forEach((t, idx) => {
        const pid = `${sc.id}-${idx}`;
        const en = t.cue || t.sample || t.options?.find((o) => o.ok)?.t || '';
        const vi = t.cueVi || t.taskVi || '';
        if (en) {
          list.push({
            id: pid,
            en,
            vi,
            cat:
              sc.cat === 'Wedding'
                ? 'Đám cưới'
                : sc.cat,
            unlocked: state.learned.includes(pid),
          });
        }
      });
    }
    return list;
  }, [state.learned]);

  if (!bookOpen) return null;

  const tabs = [
    'Cần luyện',
    'Tất cả',
    'Cơ bản',
    'Daily',
    'Backstage',
    'Đám cưới',
    'VIP Gala',
    'Talkshow',
  ];

  const handlePracticeWeakWord = async (wordKey: string, targetWord: string) => {
    setPracticingKey(wordKey);
    const res = await SpeechEngine.listen({ weakMode: true });
    setPracticingKey(null);

    if (!res.transcript) {
      toast('Chưa nghe rõ từ — bạn có thể bấm nút Giả lập Chuẩn bên cạnh để ôn nhanh!', 'warn');
      return;
    }

    const spokenClean = res.transcript.toLowerCase().replace(/[^a-z]/g, '');
    const { sim, phonetic } = wordSim(wordKey, spokenClean);
    if (sim >= 0.85 || phonetic) {
      resolveWeakWord(wordKey, 'ok');
    } else if (sim >= 0.65) {
      resolveWeakWord(wordKey, 'near');
    } else {
      SFX.play('error');
      toast(`Máy nghe thành "${res.transcript}" — hãy nghe mẫu và đọc lại nhé!`, 'warn');
    }
  };

  const filteredPhrases = allPhrases.filter(
    (p) => activeTab === 'Tất cả' || p.cat === activeTab
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-md sm:items-center sm:p-4">
      <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-white/20 bg-[#150C38] shadow-2xl sm:rounded-3xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="font-display text-xl font-black text-white">
              📖 Sổ Tay Từ Vựng & Mẫu Câu MC
            </h2>
            <p className="text-xs font-semibold text-cyan-300">
              Đã làm chủ {state.stats.mastered} từ yếu · Mở khoá {state.learned.length + 5} cụm từ
            </p>
          </div>
          <button
            onClick={() => setBookOpen(false)}
            className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-white hover:bg-white/20"
          >
            Đóng ✕
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1.5 overflow-x-auto border-b border-white/10 px-5 py-2.5">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                SFX.play('tap');
                setActiveTab(tab);
              }}
              className={`whitespace-nowrap rounded-full px-3.5 py-1 text-xs font-extrabold transition ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-pink-500 to-cyan-500 text-white shadow'
                  : 'bg-white/5 text-slate-300 hover:bg-white/15'
              }`}
            >
              {tab}
              {tab === 'Cần luyện' && state.weak.length > 0 && (
                <span className="ml-1.5 rounded-full bg-rose-500 px-1.5 py-0.2 text-[10px] text-white">
                  {state.weak.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 space-y-2.5 overflow-y-auto p-5">
          {activeTab === 'Cần luyện' ? (
            state.weak.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
                <div className="text-3xl">🌟</div>
                <div className="mt-2 font-display text-base font-black text-white">
                  Tuyệt vời! Bạn không có từ yếu nào tồn đọng!
                </div>
                <p className="mt-1 text-xs text-slate-300">
                  Các từ phát âm chưa chuẩn trên sân khấu sẽ tự động lưu vào đây để bạn luyện riêng.
                </p>
              </div>
            ) : (
              state.weak.map((w) => (
                <div
                  key={w.key}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/5 p-3.5"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          w.status === 'bad' ? 'bg-rose-500' : 'bg-amber-400'
                        }`}
                      />
                      <span className="font-display text-lg font-black text-white">
                        {w.word}
                      </span>
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                        Sai {w.misses} lần · +{w.status === 'bad' ? 10 : 6} XP
                      </span>
                    </div>
                    <p className="mt-1 text-xs italic text-slate-300">
                      Ngữ cảnh: “{w.ctx}”
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        Voice.speak(w.word, { preferredURI: state.voiceURI })
                      }
                      className="rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-white/20"
                    >
                      🔊 Nghe
                    </button>
                    <button
                      onClick={() => handlePracticeWeakWord(w.key, w.word)}
                      className="rounded-xl bg-gradient-to-r from-pink-500 to-cyan-500 px-3.5 py-1.5 text-xs font-black text-white shadow"
                    >
                      {practicingKey === w.key ? '🎙️ Đang nghe...' : '🎙️ Đọc từ'}
                    </button>
                    <button
                      onClick={() => resolveWeakWord(w.key, 'ok')}
                      title="Giả lập đọc chuẩn từ này"
                      className="rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-2.5 py-1.5 text-xs font-black text-emerald-200 hover:bg-emerald-500/30"
                    >
                      ✓ Chuẩn
                    </button>
                  </div>
                </div>
              ))
            )
          ) : (
            filteredPhrases.map((p) => (
              <div
                key={p.id}
                className={`rounded-2xl border p-3.5 ${
                  p.unlocked
                    ? 'border-white/15 bg-white/5'
                    : 'border-white/5 bg-white/[0.02] opacity-55'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-black text-cyan-300">
                      {p.cat}
                    </span>
                    <p className="mt-1.5 font-display text-sm font-extrabold text-white">
                      {p.unlocked ? p.en : '🔒 Hoàn thành lượt diễn tương ứng trên sân khấu để mở khoá cụm từ này'}
                    </p>
                    {p.unlocked && p.vi && (
                      <p className="mt-1 text-xs font-semibold text-slate-300">
                        🇻🇳 {p.vi}
                      </p>
                    )}
                  </div>

                  {p.unlocked && (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        onClick={() =>
                          Voice.speak(p.en, {
                            slow: false,
                            preferredURI: state.voiceURI,
                          })
                        }
                        className="rounded-xl border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-bold text-white hover:bg-white/20"
                      >
                        🔊 1×
                      </button>
                      <button
                        onClick={() =>
                          Voice.speak(p.en, {
                            slow: true,
                            preferredURI: state.voiceURI,
                          })
                        }
                        className="rounded-xl border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-bold text-cyan-200 hover:bg-white/20"
                      >
                        🐢 0.75×
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// 3. SHOP SHEET (Consumables & Permanent 3D Upgrades)
export const ShopSheet: React.FC = () => {
  const shopOpen = useGameStore((s) => s.shopOpen);
  const setShopOpen = useGameStore((s) => s.setShopOpen);
  const state = useGameStore((s) => s.state);
  const buyShopItem = useGameStore((s) => s.buyShopItem);
  const resetAllData = useGameStore((s) => s.resetAllData);

  if (!shopOpen) return null;

  const consumables = SHOP.filter((i) => i.type === 'consumable');
  const upgrades = SHOP.filter((i) => i.type === 'upgrade');

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-md sm:items-center sm:p-4">
      <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-white/20 bg-[#150C38] shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="font-display text-xl font-black text-white">
              🛍️ Cửa Hàng MC & Trang Bị Sân Khấu 3D
            </h2>
            <p className="text-xs font-semibold text-amber-300">
              Số dư: ${state.cash} · Năng lượng: {state.energy}/{state.maxEnergy} ⚡
            </p>
          </div>
          <button
            onClick={() => setShopOpen(false)}
            className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-white hover:bg-white/20"
          >
            Đóng ✕
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-200">
            💡 Mẹo tiết kiệm: Hai hoạt động hằng ngày (Morning Coffee & Supermarket) hoàn toàn miễn phí và hồi +25 ⚡!
          </div>

          {/* Consumables */}
          <div>
            <h3 className="mb-2.5 font-display text-sm font-black uppercase tracking-wider text-emerald-300">
              ⚡ Hồi Năng Lượng Tức Thì
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {consumables.map((item) => {
                const canAfford = state.cash >= item.price;
                const fullEnergy = state.energy >= state.maxEnergy;
                return (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between rounded-2xl border border-white/15 bg-white/5 p-3.5"
                  >
                    <div>
                      <div className="text-3xl">{item.icon}</div>
                      <div className="mt-2 font-display text-sm font-black text-white">
                        {item.name}
                      </div>
                      <div className="mt-0.5 text-xs font-extrabold text-emerald-300">
                        +{item.energy} ⚡ Energy
                      </div>
                      <p className="mt-1 text-[11px] text-slate-300">{item.sub}</p>
                    </div>
                    <button
                      disabled={!canAfford || fullEnergy}
                      onClick={() => buyShopItem(item.id)}
                      className="mt-3 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-2 text-xs font-black text-slate-950 shadow transition hover:scale-[1.02] disabled:opacity-40"
                    >
                      {fullEnergy ? 'Đầy ⚡' : `Mua $${item.price}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Permanent 3D Upgrades */}
          <div>
            <h3 className="mb-2.5 font-display text-sm font-black uppercase tracking-wider text-pink-300">
              ✨ Nâng Cấp Vĩnh Viễn (Hiển Thị Trực Tiếp Lên Nhân Vật 3D)
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {upgrades.map((item) => {
                const owned = Boolean(state.items[item.id]);
                const canAfford = state.cash >= item.price;
                return (
                  <div
                    key={item.id}
                    className={`flex flex-col justify-between rounded-2xl border p-3.5 ${
                      owned
                        ? 'border-amber-400/50 bg-amber-500/10'
                        : 'border-white/15 bg-white/5'
                    }`}
                  >
                    <div>
                      <div className="text-3xl">{item.icon}</div>
                      <div className="mt-2 font-display text-sm font-black text-white">
                        {item.name}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-300">{item.sub}</p>
                    </div>
                    <button
                      disabled={owned || !canAfford}
                      onClick={() => buyShopItem(item.id)}
                      className={`mt-3 w-full rounded-xl py-2 text-xs font-black shadow transition ${
                        owned
                          ? 'bg-amber-400/20 text-amber-300'
                          : 'bg-gradient-to-r from-amber-400 to-pink-500 text-slate-950 hover:scale-[1.02] disabled:opacity-40'
                      }`}
                    >
                      {owned ? 'Đã sở hữu ✓' : `Mua $${item.price}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reset Save Data */}
          <div className="border-t border-white/10 pt-4 text-right">
            <button
              onClick={() => {
                if (
                  window.confirm(
                    'Bạn có chắc chắn muốn xoá toàn bộ tiến trình và chơi lại từ Ngày 1?'
                  )
                ) {
                  resetAllData();
                }
              }}
              className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500/20"
            >
              🗑️ Xoá dữ liệu chơi lại từ đầu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 4. STAGE RESULT SUMMARY MODAL
export const ResultModal: React.FC = () => {
  const summary = useGameStore((s) => s.resultSummary);
  const closeResultSummary = useGameStore((s) => s.closeResultSummary);
  const state = useGameStore((s) => s.state);

  const [visibleStars, setVisibleStars] = useState(0);
  // Confetti fires twice: once as the last star lands, once more shortly after.
  const [confettiBurst, setConfettiBurst] = useState(0);

  useEffect(() => {
    setConfettiBurst(0);
    if (!summary) {
      setVisibleStars(0);
      return;
    }
    const timers: number[] = [];
    for (let i = 1; i <= summary.roundedStars; i++) {
      const t = window.setTimeout(() => {
        SFX.play('star');
        setVisibleStars(i);
      }, 350 + (i - 1) * 280);
      timers.push(t);
    }
    if (summary.roundedStars >= 1) {
      const lastStarAt = 350 + (summary.roundedStars - 1) * 280;
      timers.push(
        window.setTimeout(() => {
          SFX.play('ting');
          setConfettiBurst(1);
        }, lastStarAt + 120)
      );
      timers.push(window.setTimeout(() => setConfettiBurst(2), lastStarAt + 700));
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [summary]);

  if (!summary) return null;

  const scene = SCENES[summary.sceneId] || SCENES.coffee;
  const praise =
    summary.avgStars >= 2.6
      ? '🌟 Đỉnh cao sân khấu! Khán phòng vỗ tay không ngớt!'
      : summary.avgStars >= 1.8
      ? '👏 Màn dẫn dắt duyên dáng và chuyên nghiệp!'
      : summary.avgStars > 0
      ? '💪 Hoàn thành buổi dẫn! Luyện thêm để lấy trọn 3 sao nhé!'
      : '😅 Hãy ôn lại câu thoại trong Sổ tay rồi thử sức lại nhé!';

  const activeUpgrades = SHOP.filter(
    (i) => i.type === 'upgrade' && state.items[i.id]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xl">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/25 bg-gradient-to-b from-[#251360] to-[#120A30] p-6 text-center shadow-[0_0_60px_rgba(255,79,216,0.4)]">
        <div className="text-xs font-black uppercase tracking-widest text-pink-300">
          {scene.icon} {scene.title}
        </div>

        {/* 3 Sequential Stars, behind them a spinning light disc, then 2 confetti bursts */}
        <div className="relative my-4">
          {visibleStars > 0 && (
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 animate-ray-spin rounded-full opacity-80"
              style={{
                background:
                  'repeating-conic-gradient(from 0deg, rgba(251,191,36,0.32) 0deg 9deg, transparent 9deg 24deg, rgba(255,79,216,0.22) 24deg 33deg, transparent 33deg 48deg)',
                WebkitMaskImage: 'radial-gradient(circle, #000 20%, transparent 70%)',
                maskImage: 'radial-gradient(circle, #000 20%, transparent 70%)',
              }}
            />
          )}
          <div className="relative z-[1] flex justify-center gap-3 text-5xl">
          {[1, 2, 3].map((s) => (
            <span
              key={s}
              className={`transition-all duration-300 ${
                s <= visibleStars
                  ? 'scale-110 text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.9)]'
                  : 'scale-90 text-white/15'
              }`}
            >
              ★
            </span>
          ))}
          </div>
          <Confetti trigger={confettiBurst} />
        </div>

        <h2 className="font-display text-lg font-black text-white">{praise}</h2>

        {/* Main Rewards Grid */}
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {scene.type === 'show' ? (
            <div className="rounded-2xl border border-amber-400/40 bg-amber-500/15 p-3">
              <div className="text-[11px] font-bold text-amber-200">Cát-xê</div>
              <div className="font-display text-xl font-black text-amber-300">
                +${summary.cashEarned}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/15 p-3">
              <div className="text-[11px] font-bold text-emerald-200">Hồi sức</div>
              <div className="font-display text-xl font-black text-emerald-300">
                +{summary.energyEarned} ⚡
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-purple-400/40 bg-purple-500/15 p-3">
            <div className="text-[11px] font-bold text-purple-200">Charisma</div>
            <div className="font-display text-xl font-black text-purple-300">
              +{summary.charismaEarned}
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-400/40 bg-cyan-500/15 p-3">
            <div className="text-[11px] font-bold text-cyan-200">Fluency XP</div>
            <div className="font-display text-xl font-black text-cyan-300">
              +{summary.xpEarned}
            </div>
          </div>
        </div>

        {/* Details Lines */}
        <div className="mt-4 space-y-1.5 rounded-2xl border border-white/10 bg-black/30 p-3 text-xs font-semibold text-slate-200">
          <div>
            🎧 Điểm Nghe hiểu (Listening XP):{' '}
            <strong className="text-cyan-300">+{summary.listeningXpEarned} XP</strong>
          </div>
          <div>
            🕒 Thời gian: {fmtTime(summary.beginAt)} → {fmtTime(summary.endAt)}
          </div>
          {summary.minutesLate > 0 && (
            <div className="text-rose-300">
              ⚠️ Đến trễ {summary.minutesLate} phút (−{summary.latePenaltyPct}% cát-xê)
            </div>
          )}
          {activeUpgrades.length > 0 && (
            <div className="text-amber-300">
              ✨ Thưởng trang bị:{' '}
              {activeUpgrades.map((u) => `${u.icon} ${u.name}`).join(', ')}
            </div>
          )}
          {state.weak.length > 0 && (
            <div className="text-pink-300">
              📖 Có {state.weak.length} từ đang chờ ôn luyện trong Sổ tay
            </div>
          )}
        </div>

        <button
          onClick={closeResultSummary}
          className="mt-5 w-full rounded-2xl bg-gradient-to-r from-pink-500 to-cyan-500 py-3.5 font-display text-sm font-black text-white shadow-xl transition hover:scale-[1.02]"
        >
          Về {summary.returnTo === 'world' ? 'Bản đồ Thành phố 🗺️' : 'Phòng MC 🏠'}
        </button>
      </div>
    </div>
  );
};

// 5. STREET TALK MODAL (Passerby Conversation on 3D City Map)
export const StreetTalkModal: React.FC = () => {
  const streetTalkActive = useGameStore((s) => s.streetTalkActive);
  const closeStreetTalk = useGameStore((s) => s.closeStreetTalk);
  const markStreetTalkUsed = useGameStore((s) => s.markStreetTalkUsed);
  const gain = useGameStore((s) => s.gain);
  const state = useGameStore((s) => s.state);

  const [showViPrompt, setShowViPrompt] = useState(false);
  const [pickedIdx, setPickedIdx] = useState<number | null>(null);
  const [shakeIdx, setShakeIdx] = useState<number | null>(null);

  const shuffledOptions = useMemo(() => {
    if (!streetTalkActive) return [];
    return [...streetTalkActive.item.options].sort(
      (a, b) => a.en.length - b.en.length
    );
  }, [streetTalkActive]);

  useEffect(() => {
    if (!streetTalkActive) return;
    setShowViPrompt(false);
    setPickedIdx(null);
    Voice.speak(streetTalkActive.item.prompt.en, {
      npcId: 'leo',
      preferredURI: state.voiceURI,
    });
  }, [streetTalkActive]);

  if (!streetTalkActive) return null;

  const { passerName, item } = streetTalkActive;

  const handleChooseOption = (idx: number) => {
    if (pickedIdx !== null) return;
    setPickedIdx(idx);
    markStreetTalkUsed(item.id);
    const chosen = shuffledOptions[idx];

    if (chosen.ok) {
      SFX.play('correct');
      gain({ xp: 3 }); // +3 XP without bonus multiplier as per spec
      Voice.speak(chosen.en, {
        npcId: 'ivy',
        preferredURI: state.voiceURI,
      });
    } else {
      SFX.play('error');
      setShakeIdx(idx);
      window.setTimeout(() => setShakeIdx(null), 380);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-3xl border border-white/20 bg-[#150C38] p-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/20 text-xl">
              👋
            </span>
            <div>
              <h3 className="font-display text-base font-black text-white">
                Trò chuyện cùng {passerName}
              </h3>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                CEFR {item.level} · Phản xạ đường phố (+3 XP)
              </span>
            </div>
          </div>
          <button
            onClick={closeStreetTalk}
            className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold text-slate-300 hover:bg-white/20"
          >
            ✕
          </button>
        </div>

        {/* Prompt */}
        <div className="mt-3.5 rounded-2xl border border-white/15 bg-white/5 p-3.5">
          <p className="font-display text-sm font-extrabold text-white">
            “{item.prompt.en}”
          </p>
          {showViPrompt && (
            <p className="mt-1.5 text-xs font-semibold italic text-amber-200">
              🇻🇳 {item.prompt.vi}
            </p>
          )}
          <div className="mt-2.5 flex gap-2">
            <button
              onClick={() =>
                Voice.speak(item.prompt.en, { preferredURI: state.voiceURI })
              }
              className="rounded-xl bg-white/10 px-2.5 py-1 text-xs font-bold text-white hover:bg-white/20"
            >
              🔊 Nghe lại
            </button>
            <button
              onClick={() => setShowViPrompt((v) => !v)}
              className="rounded-xl bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-200"
            >
              🇻🇳 Dịch câu hỏi
            </button>
          </div>
        </div>

        {/* 3 Options */}
        <div className="mt-3.5 space-y-2">
          {shuffledOptions.map((opt, idx) => {
            const answered = pickedIdx !== null;
            const isSelected = pickedIdx === idx;
            return (
              <button
                key={idx}
                disabled={answered}
                onClick={() => handleChooseOption(idx)}
                className={`w-full rounded-2xl border p-3 text-left text-xs transition ${shakeIdx === idx ? 'animate-shake' : ''} ${
                  !answered
                    ? 'border-white/15 bg-white/5 text-white hover:border-cyan-400 hover:bg-white/10'
                    : opt.ok
                    ? 'border-emerald-400 bg-emerald-500/25 text-white'
                    : isSelected
                    ? 'border-rose-500 bg-rose-500/25 text-rose-200'
                    : 'border-white/10 bg-white/5 text-slate-400'
                }`}
              >
                <div className="font-bold">{opt.en}</div>
                {answered && (
                  <div className="mt-1 text-[11px] text-amber-200">
                    🇻🇳 {opt.vi}
                  </div>
                )}
                {answered && isSelected && !opt.ok && opt.why && (
                  <div className="mt-1 text-[11px] font-bold text-rose-300">
                    💡 {opt.why}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {pickedIdx !== null && (
          <button
            onClick={closeStreetTalk}
            className="mt-4 w-full rounded-2xl bg-gradient-to-r from-pink-500 to-cyan-500 py-2.5 text-xs font-black text-white shadow-lg"
          >
            Tiếp tục dạo phố ➔
          </button>
        )}
      </div>
    </div>
  );
};

// 6. VOICE SELECTOR MODAL
export const VoiceSelectorModal: React.FC = () => {
  const open = useGameStore((s) => s.voiceModalOpen);
  const setVoiceModalOpen = useGameStore((s) => s.setVoiceModalOpen);
  const state = useGameStore((s) => s.state);
  const setVoiceURI = useGameStore((s) => s.setVoiceURI);

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!open) return;
    const update = () => setVoices(Voice.getEnglishVoices());
    update();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = update;
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
      <div className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/20 bg-[#150C38] p-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="font-display text-base font-black text-white">
            🗣️ Chọn Giọng Đọc Tiếng Anh (TTS)
          </h3>
          <button
            onClick={() => setVoiceModalOpen(false)}
            className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold text-white"
          >
            Đóng ✕
          </button>
        </div>

        <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
          <button
            onClick={() => {
              setVoiceURI(null);
              Voice.speak('Hello Thien An! Automatic voice selection is active.', {
                preferredURI: null,
              });
            }}
            className={`flex w-full items-center justify-between rounded-2xl border p-3 text-left text-xs font-bold ${
              !state.voiceURI
                ? 'border-cyan-400 bg-cyan-500/20 text-white'
                : 'border-white/15 bg-white/5 text-slate-300'
            }`}
          >
            <span>✨ Tự động chọn giọng chuẩn nhất theo từng NPC</span>
            {!state.voiceURI && <span>✓</span>}
          </button>

          {voices.map((v) => (
            <div
              key={v.voiceURI}
              className={`flex items-center justify-between rounded-2xl border p-2.5 text-xs ${
                state.voiceURI === v.voiceURI
                  ? 'border-pink-400 bg-pink-500/20 text-white'
                  : 'border-white/10 bg-white/5 text-slate-200'
              }`}
            >
              <button
                onClick={() => setVoiceURI(v.voiceURI)}
                className="flex-1 text-left font-bold"
              >
                {v.name} <span className="text-[10px] text-cyan-300">({v.lang})</span>
              </button>
              <button
                onClick={() =>
                  Voice.speak('Welcome to English Stage Tonight!', {
                    preferredURI: v.voiceURI,
                  })
                }
                className="rounded-xl bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-white/20"
              >
                🔊 Thử
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// 7. CURTAIN TRANSITION, SLEEP OVERLAY & TOASTS
export const GlobalOverlays: React.FC = () => {
  const curtain = useGameStore((s) => s.curtain);
  const sleepOverlay = useGameStore((s) => s.sleepOverlay);
  const toasts = useGameStore((s) => s.toasts);

  return (
    <>
      {/* Stage Curtain Transition */}
      {curtain.visible && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#120A30] p-6 text-center transition-opacity">
          <div className="text-4xl animate-bounce">🎭</div>
          <h2 className="mt-3 font-display text-2xl font-black text-white">
            {curtain.title}
          </h2>
          <p className="mt-2 max-w-md text-xs font-semibold text-cyan-200">
            {curtain.tip}
          </p>
          <div className="mt-5 h-1.5 w-48 overflow-hidden rounded-full bg-white/15">
            <div className="h-full w-full animate-pulse bg-gradient-to-r from-pink-500 via-cyan-400 to-lime-400" />
          </div>
        </div>
      )}

      {/* Sleep Dark Fade Overlay */}
      {sleepOverlay && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 text-center">
          <div className="text-5xl">🌙💤</div>
          <div className="mt-3 font-display text-xl font-black text-indigo-200">
            Đang nghỉ ngơi hồi phục năng lượng...
          </div>
        </div>
      )}

      {/* Floating Toasts */}
      <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 flex w-[92%] max-w-md -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`w-full rounded-2xl border px-4 py-2.5 text-center text-xs font-extrabold shadow-2xl backdrop-blur-xl ${
              t.tone === 'success'
                ? 'border-emerald-400/60 bg-emerald-950/90 text-emerald-200'
                : t.tone === 'warn'
                ? 'border-amber-400/60 bg-amber-950/90 text-amber-200'
                : t.tone === 'error'
                ? 'border-rose-400/60 bg-rose-950/90 text-rose-200'
                : t.tone === 'pink'
                ? 'border-pink-400/60 bg-pink-950/90 text-pink-200'
                : 'border-cyan-400/60 bg-[#120A30]/95 text-cyan-200'
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </>
  );
};
