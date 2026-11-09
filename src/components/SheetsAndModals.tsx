import React, { useEffect, useMemo, useState } from 'react';
import { PASSER_LOOKS, SCENES, SHOP, STARTER } from '../data/content';
import { dayPlan, fmtTime } from '../core/clock';
import { evaluateScripted, wordSim } from '../core/evaluator';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ghibli-ink/35 p-4">
      <div className="cozy-card relative w-full max-w-md overflow-hidden rounded-3xl bg-gradient-to-b from-[#E5F5FB] via-[#FFFBF3] to-[#FFF6E4] p-6 text-center">
        <div className="mx-auto mb-3.5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#FFE082] to-[#FFC652] text-4xl shadow-md">
          🎙️
        </div>
        <div className="inline-block rounded-full bg-[#FFF0D4] px-3.5 py-1 text-xs font-black uppercase tracking-wider text-[#9C5B00]">
          3D WebGL Edition · Ghibli Studio
        </div>
        <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-ghibli-ink">
          MC Life · English Stage
        </h1>
        <p className="mt-2 text-xs font-semibold leading-relaxed text-ghibli-ink-soft">
          Nhập vai <strong className="text-[#C83E6B]">MC Thiên Ân</strong> trong thành phố 3D sống động:
          đi bộ nhận show đúng giờ, luyện nghe phản xạ <strong className="text-[#1F7A73]">Blind Listening</strong> và
          làm chủ sân khấu song ngữ!
        </p>

        <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl border border-[#E6D6C1] bg-white/85 p-3 text-xs">
          <div>
            <div className="font-black text-[#2C731D]">📖 Reading</div>
            <div className="text-xs text-ghibli-ink-soft">Cue Card & Semi</div>
          </div>
          <div>
            <div className="font-black text-[#1F7A73]">🎧 Listening</div>
            <div className="text-xs text-ghibli-ink-soft">Blind & In-ear</div>
          </div>
          <div>
            <div className="font-black text-[#C83E6B]">🗣️ Speaking</div>
            <div className="text-xs text-ghibli-ink-soft">Chấm phát âm AI</div>
          </div>
        </div>

        <button
          onClick={startDayFromWelcome}
          className="btn-tactile-sage mt-6 min-h-[50px] w-full rounded-2xl py-4 font-display text-base font-black text-white"
        >
          {btnLabel}
        </button>

        <p className="mt-3 text-xs font-semibold text-ghibli-ink-soft">
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ghibli-ink/40 sm:items-center sm:p-4">
 <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border ghibli-panel shadow-2xl sm:rounded-3xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-ghibli-track px-5 py-4">
          <div>
            <h2 className="font-display text-xl font-black text-ghibli-ink">
              📖 Sổ Tay Từ Vựng & Mẫu Câu MC
            </h2>
            <p className="text-xs font-semibold text-cyan-700">
              Đã làm chủ {state.stats.mastered} từ yếu · Mở khoá {state.learned.length + 5} cụm từ
            </p>
          </div>
          <button
            onClick={() => setBookOpen(false)}
 className="rounded-full ghibli-panel px-3 py-1.5 text-xs font-black text-ghibli-ink hover:bg-[#FBEBD0]"
          >
            Đóng ✕
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-[#EFE5D4] px-5 py-3">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                SFX.play('tap');
                setActiveTab(tab);
              }}
              className={`inline-flex min-h-[38px] shrink-0 items-center whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-extrabold leading-tight transition ${
                activeTab === tab
                  ? 'btn-tactile-sage text-white'
                  : 'btn-tactile text-ghibli-ink-soft'
              }`}
            >
              {tab}
              {tab === 'Cần luyện' && state.weak.length > 0 && (
                <span className="ml-1.5 rounded-full bg-[#D94E2F] px-1.5 py-0.5 text-xs text-white">
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
 <div className="rounded-2xl border ghibli-panel p-8 text-center">
                <div className="text-3xl">🌟</div>
                <div className="mt-2 font-display text-base font-black text-ghibli-ink">
                  Tuyệt vời! Bạn không có từ yếu nào tồn đọng!
                </div>
                <p className="mt-1 text-xs text-ghibli-ink-soft">
                  Các từ phát âm chưa chuẩn trên sân khấu sẽ tự động lưu vào đây để bạn luyện riêng.
                </p>
              </div>
            ) : (
              state.weak.map((w) => (
                <div
                  key={w.key}
 className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border ghibli-panel p-3.5"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          w.status === 'bad' ? 'bg-rose-500' : 'bg-amber-400'
                        }`}
                      />
                      <span className="font-display text-lg font-black text-ghibli-ink">
                        {w.word}
                      </span>
 <span className="rounded-full ghibli-panel px-2 py-0.5 text-xs font-bold text-ghibli-ink-soft">
                        Sai {w.misses} lần · +{w.status === 'bad' ? 10 : 6} XP
                      </span>
                    </div>
                    <p className="mt-1 text-xs italic text-ghibli-ink-soft">
                      Ngữ cảnh: “{w.ctx}”
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        Voice.speak(w.word, { preferredURI: state.voiceURI })
                      }
 className="rounded-xl border ghibli-panel px-3 py-1.5 text-xs font-extrabold text-ghibli-ink hover:bg-[#FBEBD0]"
                    >
                      🔊 Nghe
                    </button>
                    <button
                      onClick={() => handlePracticeWeakWord(w.key, w.word)}
                      className="rounded-xl bg-gradient-to-r from-[#7FBF6A] to-[#9FD68A] px-3.5 py-1.5 text-xs font-black text-ghibli-ink shadow"
                    >
                      {practicingKey === w.key ? '🎙️ Đang nghe...' : '🎙️ Đọc từ'}
                    </button>
                    <button
                      onClick={() => resolveWeakWord(w.key, 'ok')}
                      title="Giả lập đọc chuẩn từ này"
                      className="rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-2.5 py-1.5 text-xs font-black text-emerald-700 hover:bg-emerald-500/30"
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
 ? ' ghibli-panel'
 : ' ghibli-panel opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs font-black text-cyan-700">
                      {p.cat}
                    </span>
                    <p className="mt-1.5 font-display text-sm font-extrabold text-ghibli-ink">
                      {p.unlocked ? p.en : '🔒 Hoàn thành lượt diễn tương ứng trên sân khấu để mở khoá cụm từ này'}
                    </p>
                    {p.unlocked && p.vi && (
                      <p className="mt-1 text-xs font-semibold text-ghibli-ink-soft">
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
 className="rounded-xl border ghibli-panel px-2.5 py-1 text-xs font-bold text-ghibli-ink hover:bg-[#FBEBD0]"
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
 className="rounded-xl border ghibli-panel px-2.5 py-1 text-xs font-bold text-cyan-700 hover:bg-[#FBEBD0]"
                      >
                        🐢 0.8×
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ghibli-ink/40 sm:items-center sm:p-4">
 <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border ghibli-panel shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b-2 border-ghibli-track px-5 py-4">
          <div>
            <h2 className="font-display text-xl font-black text-ghibli-ink">
              🛍️ Cửa Hàng MC & Trang Bị Sân Khấu 3D
            </h2>
            <p className="text-xs font-semibold text-amber-700">
              Số dư: ${state.cash} · Năng lượng: {state.energy}/{state.maxEnergy} ⚡
            </p>
          </div>
          <button
            onClick={() => setShopOpen(false)}
 className="rounded-full ghibli-panel px-3 py-1.5 text-xs font-black text-ghibli-ink hover:bg-[#FBEBD0]"
          >
            Đóng ✕
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div className="rounded-2xl border-2 border-emerald-600/40 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-900">
            💡 Mẹo tiết kiệm: Hai hoạt động hằng ngày (Morning Coffee & Supermarket) hoàn toàn miễn phí và hồi +25 ⚡!
          </div>

          {/* Consumables */}
          <div>
            <h3 className="mb-2.5 font-display text-sm font-black uppercase tracking-wider text-emerald-700">
              ⚡ Hồi Năng Lượng Tức Thì
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {consumables.map((item) => {
                const canAfford = state.cash >= item.price;
                const fullEnergy = state.energy >= state.maxEnergy;
                return (
                  <div
                    key={item.id}
 className="flex flex-col justify-between rounded-2xl border ghibli-panel p-3.5"
                  >
                    <div>
                      <div className="text-3xl">{item.icon}</div>
                      <div className="mt-2 font-display text-sm font-black text-ghibli-ink">
                        {item.name}
                      </div>
                      <div className="mt-0.5 text-xs font-extrabold text-emerald-700">
                        +{item.energy} ⚡ Energy
                      </div>
                      <p className="mt-1 text-xs text-ghibli-ink-soft">{item.sub}</p>
                    </div>
                    <button
                      disabled={!canAfford || fullEnergy}
                      onClick={() => buyShopItem(item.id)}
                      className="mt-3 min-h-[48px] w-full rounded-xl bg-gradient-to-r from-ghibli-sage to-[#9FD68A] py-2.5 text-sm font-black text-ghibli-ink shadow transition hover:scale-[1.02] disabled:bg-none disabled:bg-[#F1E9DC] disabled:text-ghibli-ink-soft disabled:shadow-none disabled:opacity-60"
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
            <h3 className="mb-2.5 font-display text-sm font-black uppercase tracking-wider text-pink-700">
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
 : ' ghibli-panel'
                    }`}
                  >
                    <div>
                      <div className="text-3xl">{item.icon}</div>
                      <div className="mt-2 font-display text-sm font-black text-ghibli-ink">
                        {item.name}
                      </div>
                      <p className="mt-1 text-xs text-ghibli-ink-soft">{item.sub}</p>
                    </div>
                    <button
                      disabled={owned || !canAfford}
                      onClick={() => buyShopItem(item.id)}
                      className={`mt-3 w-full rounded-xl py-2 text-xs font-black shadow transition ${
                        owned
                          ? 'bg-amber-400/20 text-amber-700'
                          : 'bg-gradient-to-r from-ghibli-sun to-[#F7C35C] text-ghibli-ink hover:scale-[1.02] disabled:bg-none disabled:bg-[#F1E9DC] disabled:text-ghibli-ink-soft disabled:shadow-none disabled:opacity-60'
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
          <div className="border-t-2 border-ghibli-track pt-4 text-right">
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
              className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-500/20"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ghibli-ink/40 p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl ghibli-panel p-6 text-center">
        <div className="text-sm font-black uppercase tracking-wider text-ghibli-clay">
          {scene.icon} {scene.title}
        </div>

        {/* 3 Sequential Stars, behind them a spinning light disc, then 2 confetti bursts */}
        <div className="relative my-4">
          {visibleStars > 0 && (
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 rounded-full opacity-80"
              style={{
                background:
                  'repeating-conic-gradient(from 0deg, rgba(242,184,75,0.4) 0deg 9deg, transparent 9deg 24deg, rgba(127,191,106,0.32) 24deg 33deg, transparent 33deg 48deg)',
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
                  ? 'scale-110 text-ghibli-sun drop-shadow-[0_2px_0_#6B4E3D]'
                  : 'scale-90 text-ghibli-ink/15'
              }`}
            >
              ★
            </span>
          ))}
          </div>
          <Confetti trigger={confettiBurst} />
        </div>

        <h2 className="font-display text-lg font-black text-ghibli-ink">{praise}</h2>

        {/* Main Rewards Grid */}
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {scene.type === 'show' ? (
            <div className="rounded-2xl bg-[#FFF0D4] p-3">
              <div className="text-xs font-bold text-[#9C5B00]">Cát-xê</div>
              <div className="font-display text-xl font-black text-[#9C5B00]">
                +${summary.cashEarned}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#E5F6DF] p-3">
              <div className="text-xs font-bold text-[#2C731D]">Hồi sức</div>
              <div className="font-display text-xl font-black text-[#2C731D]">
                +{summary.energyEarned} ⚡
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-[#F3E8FB] p-3">
            <div className="text-xs font-bold text-[#6535C4]">Charisma</div>
            <div className="font-display text-xl font-black text-[#6535C4]">
              +{summary.charismaEarned}
            </div>
          </div>

          <div className="rounded-2xl bg-[#E6F4F1] p-3">
            <div className="text-xs font-bold text-[#1F7A73]">Fluency XP</div>
            <div className="font-display text-xl font-black text-[#1F7A73]">
              +{summary.xpEarned}
            </div>
          </div>
        </div>

        {/* Details Lines */}
        <div className="mt-4 space-y-1.5 rounded-2xl bg-[#FAF4E8] p-3 text-xs font-bold text-ghibli-ink">
          <div>
            🎧 Điểm Nghe hiểu (Listening XP):{' '}
            <strong className="text-[#1F7A73]">+{summary.listeningXpEarned} XP</strong>
          </div>
          <div>
            🕒 Thời gian: {fmtTime(summary.beginAt)} → {fmtTime(summary.endAt)}
          </div>
          {summary.minutesLate > 0 && (
            <div className="text-[#B2351A]">
              ⚠️ Đến trễ {summary.minutesLate} phút (−{summary.latePenaltyPct}% cát-xê)
            </div>
          )}
          {activeUpgrades.length > 0 && (
            <div className="text-[#9C5B00]">
              ✨ Thưởng trang bị:{' '}
              {activeUpgrades.map((u) => `${u.icon} ${u.name}`).join(', ')}
            </div>
          )}
          {state.weak.length > 0 && (
            <div className="text-[#C83E6B]">
              📖 Có {state.weak.length} từ đang chờ ôn luyện trong Sổ tay
            </div>
          )}
        </div>

        <button
          onClick={closeResultSummary}
          className="btn-tactile-sage mt-5 min-h-[48px] w-full rounded-2xl py-3.5 font-display text-sm font-black text-white"
        >
          Về {summary.returnTo === 'world' ? 'Bản đồ Thành phố 🗺️' : 'Phòng MC 🏠'}
        </button>
      </div>
    </div>
  );
};

// 5. STREET TALK MODAL (Passerby Conversation on 3D City Map)
// Hai chế độ:
//  - "choose" (mặc định): chọn 1 trong 3 đáp án. Đáp án được xáo ngẫu nhiên mỗi lần mở.
//  - "speak": đọc câu mẫu (item.say), người chơi nói theo bằng micro; chấm bằng evaluateScripted.
//    Đạt từ 2 sao trở lên thì qua. Hết SPEAK_MAX_ATTEMPTS lượt thì hiện đáp án mẫu.
const SPEAK_PASS_STARS = 2;
const SPEAK_MAX_ATTEMPTS = 3;

// Xáo trộn kiểu Fisher–Yates để đáp án đúng không luôn ở cùng vị trí / độ dài.
function shuffleOptions<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const StreetTalkModal: React.FC = () => {
  const streetTalkActive = useGameStore((s) => s.streetTalkActive);
  const closeStreetTalk = useGameStore((s) => s.closeStreetTalk);
  const markStreetTalkUsed = useGameStore((s) => s.markStreetTalkUsed);
  const gain = useGameStore((s) => s.gain);
  const toast = useGameStore((s) => s.toast);
  const state = useGameStore((s) => s.state);

  const item = streetTalkActive?.item;
  const isSpeak = item?.mode === 'speak';
  // Câu cần nói trong chế độ speak: ưu tiên item.say, nếu không có thì lấy đáp án đúng.
  const target = item ? item.say ?? item.options.find((o) => o.ok)?.en ?? '' : '';

  const [showViPrompt, setShowViPrompt] = useState(false);
  const [pickedIdx, setPickedIdx] = useState<number | null>(null);
  const [shakeIdx, setShakeIdx] = useState<number | null>(null);
  const [speakResult, setSpeakResult] = useState<ReturnType<typeof evaluateScripted> | null>(null);
  const [speakAttempts, setSpeakAttempts] = useState(0);
  const [speakDone, setSpeakDone] = useState(false);
  const [recording, setRecording] = useState(false);
  const [interim, setInterim] = useState('');
  const [showTyped, setShowTyped] = useState(false);
  const [typed, setTyped] = useState('');

  const shuffledOptions = useMemo(
    () => (item ? shuffleOptions(item.options) : []),
    [streetTalkActive]
  );

  useEffect(() => {
    if (!streetTalkActive) return;
    setShowViPrompt(false);
    setPickedIdx(null);
    setSpeakResult(null);
    setSpeakAttempts(0);
    setSpeakDone(false);
    setInterim('');
    setShowTyped(false);
    setTyped('');
    Voice.speak(streetTalkActive.item.prompt.en, {
      npcId: 'passer',
      preferredURI: state.voiceURI,
    });
  }, [streetTalkActive]);

  if (!streetTalkActive || !item) return null;

  const { passerName } = streetTalkActive;

  const handleChooseOption = (idx: number) => {
    if (pickedIdx !== null) return;
    setPickedIdx(idx);
    markStreetTalkUsed(item.id);
    const chosen = shuffledOptions[idx];

    if (chosen.ok) {
      SFX.play('correct');
      gain({ xp: 3 }); // +3 XP without bonus multiplier as per spec
      Voice.speak(chosen.en, {
        npcId: 'coach',
        preferredURI: state.voiceURI,
      });
    } else {
      SFX.play('error');
      setShakeIdx(idx);
      window.setTimeout(() => setShakeIdx(null), 380);
    }
  };

  // Chấm một lần nói: lấy kết quả tốt nhất trong các phương án nhận dạng.
  const evaluateAttempt = (candidates: string[]) => {
    if (speakDone || !target) return;
    const list = candidates.map((c) => c.trim()).filter(Boolean);
    let best: ReturnType<typeof evaluateScripted> | null = null;
    for (const c of list.length ? list : ['']) {
      const r = evaluateScripted(target, c);
      if (!best || r.score > best.score) best = r;
    }
    const result = best!;
    const attempts = speakAttempts + 1;
    setSpeakAttempts(attempts);
    setSpeakResult(result);

    if (result.stars >= SPEAK_PASS_STARS) {
      setSpeakDone(true);
      markStreetTalkUsed(item.id);
      SFX.play('correct');
      gain({ xp: 3 });
      Voice.speak(target, { npcId: 'coach', preferredURI: state.voiceURI });
    } else if (attempts >= SPEAK_MAX_ATTEMPTS) {
      setSpeakDone(true);
      markStreetTalkUsed(item.id);
      SFX.play('error');
      Voice.speak(target, { npcId: 'coach', preferredURI: state.voiceURI });
    } else {
      SFX.play('error');
    }
  };

  const handleSpeak = async () => {
    if (recording || speakDone) return;
    SFX.play('tap');
    setRecording(true);
    setInterim('');
    const res = await SpeechEngine.listen({
      onInterim: (txt) => setInterim(txt),
    });
    setRecording(false);
    if (res.reason === 'aborted') return;
    if (res.reason === 'error' || (!res.transcript && res.reason === 'no-speech')) {
      setShowTyped(true);
      toast(
        res.error === 'unsupported'
          ? 'Trình duyệt chưa hỗ trợ thu âm — hãy gõ câu trả lời bên dưới.'
          : 'Không nghe rõ — bạn có thể nói lại hoặc gõ câu trả lời bên dưới.',
        'warn',
        3200
      );
      return;
    }
    evaluateAttempt(res.alternatives.length > 0 ? res.alternatives : [res.transcript]);
  };

  const submitTyped = () => {
    if (!typed.trim()) return;
    evaluateAttempt([typed]);
    setTyped('');
  };

  const answered = pickedIdx !== null;
  const canContinue = isSpeak ? speakDone : answered;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ghibli-ink/40 p-4">
 <div className="w-full max-w-md rounded-3xl border ghibli-panel p-5 shadow-2xl">
        <div className="flex items-center justify-between border-b-2 border-ghibli-track pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/20 text-xl">
              {isSpeak ? '🎤' : '👋'}
            </span>
            <div>
              <h3 className="font-display text-base font-black text-ghibli-ink">
                Trò chuyện cùng {passerName}
              </h3>
              <span className="inline-block max-w-full rounded-2xl leading-snug ghibli-panel px-2.5 py-1 text-xs font-bold text-[#23706A]">
                CEFR {item.level} · {isSpeak ? 'Luyện nói' : 'Phản xạ đường phố'} (+3 XP)
              </span>
            </div>
          </div>
          <button
            onClick={closeStreetTalk}
 className="flex h-12 w-12 items-center justify-center rounded-full ghibli-panel text-sm font-bold text-ghibli-ink-soft hover:bg-[#FBEBD0]"
          >
            ✕
          </button>
        </div>

        {/* Prompt */}
 <div className="mt-3.5 rounded-2xl border ghibli-panel p-3.5">
          <p className="font-display text-sm font-extrabold text-ghibli-ink">
            “{item.prompt.en}”
          </p>
          {showViPrompt && (
            <p className="mt-1.5 text-sm font-semibold italic text-[#8A5A00]">
              🇻🇳 {item.prompt.vi}
            </p>
          )}
          <div className="mt-2.5 flex gap-2">
            <button
              onClick={() =>
                Voice.speak(item.prompt.en, { preferredURI: state.voiceURI })
              }
 className="min-h-[48px] rounded-xl ghibli-panel px-3 text-sm font-bold text-ghibli-ink hover:bg-[#FBEBD0]"
            >
              🔊 Nghe lại
            </button>
            <button
              onClick={() => setShowViPrompt((v) => !v)}
              className="min-h-[48px] rounded-xl border-2 border-ghibli-clay bg-[#FDF0CF] px-3 text-sm font-bold text-[#8A5A00]"
            >
              🇻🇳 Dịch câu hỏi
            </button>
          </div>
        </div>

        {isSpeak ? (
          <div className="mt-3.5 space-y-2.5">
            <div className="flex gap-2">
              <button
                onClick={handleSpeak}
                disabled={recording || speakDone}
                className="flex-1 rounded-2xl bg-gradient-to-r from-[#7FBF6A] to-[#9FD68A] py-2.5 text-xs font-black text-ghibli-ink border-2 border-ghibli-clay shadow-md disabled:opacity-50"
              >
                {recording ? '🎙️ Đang nghe…' : speakDone ? '✅ Xong' : '🎤 Nói câu trả lời'}
              </button>
              {!speakDone && (
                <button
                  onClick={() => setShowTyped((v) => !v)}
 className="rounded-2xl ghibli-panel px-3 text-xs font-bold text-ghibli-ink hover:ghibli-panel"
                >
                  ⌨️ Gõ
                </button>
              )}
            </div>

            {recording && interim && (
              <p className="rounded-xl ghibli-panel p-2 text-xs italic text-ghibli-ink-soft">{interim}</p>
            )}

            {showTyped && !speakDone && (
              <div className="flex gap-2">
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitTyped()}
                  placeholder="Gõ câu trả lời tiếng Anh…"
                  className="flex-1 rounded-xl border ghibli-panel px-3 py-2 text-xs text-ghibli-ink outline-none focus:border-ghibli-teal"
                />
                <button
                  onClick={submitTyped}
                  className="rounded-xl border-2 border-ghibli-clay bg-[#D9EFF5] px-3 text-xs font-bold text-[#23706A]"
                >
                  Gửi
                </button>
              </div>
            )}

            {speakResult && (
              <div className="rounded-2xl border ghibli-panel p-3">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-[#23706A]">Điểm: {speakResult.score}</span>
                  <span className="text-[#8A5A00]">{'⭐'.repeat(speakResult.stars) || '—'}</span>
                </div>
                <p className="mt-1.5 text-xs font-bold leading-relaxed">
                  {speakResult.tokens.map((t, i) => (
                    <span
                      key={i}
                      className={
                        t.status === 'ok'
                          ? 'text-[#3F7A32]'
                          : t.status === 'near'
                          ? 'text-[#8A5A00]'
                          : 'text-[#B2421E]'
                      }
                    >
                      {t.word}{' '}
                    </span>
                  ))}
                </p>
                <p className="mt-1 text-xs text-ghibli-ink-soft">Bạn nói: “{speakResult.transcript}”</p>
              </div>
            )}

            {!speakDone && speakAttempts > 0 && (
              <p className="text-xs font-bold text-[#8A5A00]">
                Chưa đạt ({SPEAK_MAX_ATTEMPTS - speakAttempts} lượt còn lại). Thử lại nhé!
              </p>
            )}

            {speakDone && (
              <div className="rounded-2xl border-2 border-ghibli-clay bg-[#E4F2DC] p-3">
                <p className="text-xs font-bold text-[#3F7A32]">Câu mẫu:</p>
                <p className="mt-1 text-xs font-bold text-ghibli-ink">{target}</p>
              </div>
            )}
          </div>
        ) : (
          /* 3 Options */
          <div className="mt-3.5 space-y-2">
            {shuffledOptions.map((opt, idx) => {
              const isSelected = pickedIdx === idx;
              return (
                <button
                  key={idx}
                  disabled={answered}
                  onClick={() => handleChooseOption(idx)}
                  className={`w-full rounded-2xl border-2 p-3 text-left text-xs transition ${shakeIdx === idx ? 'animate-shake' : ''} ${
                    !answered
                      ? 'ghibli-panel text-ghibli-ink hover:bg-[#FBEBD0]'
                      : opt.ok
                      ? 'border-ghibli-clay bg-[#E4F2DC] text-[#3F7A32]'
                      : isSelected
                      ? 'border-ghibli-clay bg-[#FCE4DA] text-[#B2421E]'
                      : 'ghibli-panel text-ghibli-ink-soft opacity-75'
                  }`}
                >
                  <div className="font-bold">{opt.en}</div>
                  {answered && (
                    <div className="mt-1 text-xs text-[#8A5A00]">
                      🇻🇳 {opt.vi}
                    </div>
                  )}
                  {answered && isSelected && !opt.ok && opt.why && (
                    <div className="mt-1 text-xs font-bold text-[#B2421E]">
                      💡 {opt.why}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {canContinue && (
          <button
            onClick={closeStreetTalk}
            className="mt-4 min-h-[48px] w-full rounded-2xl border-2 border-ghibli-clay bg-gradient-to-r from-ghibli-sage to-[#9FD68A] py-2.5 text-sm font-black text-ghibli-ink shadow-[0_3px_0_#6B4E3D]"
          >
            Tiếp tục dạo phố ➔
          </button>
        )}
      </div>
    </div>
  );
};

// 6. CURTAIN TRANSITION, SLEEP OVERLAY & TOASTS
export const GlobalOverlays: React.FC = () => {
  const curtain = useGameStore((s) => s.curtain);
  const sleepOverlay = useGameStore((s) => s.sleepOverlay);
  const toasts = useGameStore((s) => s.toasts);

  return (
    <>
      {/* Stage Curtain Transition (Ghibli Cloud & Storybook Frame) */}
      {curtain.visible && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-ghibli-sky via-[#F6EBD2] to-[#FFF1D6] p-6 text-center transition-opacity">
          {/* Decorative soft clouds */}
          <div className="pointer-events-none absolute -top-12 left-1/4 h-40 w-72 rounded-full bg-white/55 blur-xl" />
          <div className="pointer-events-none absolute -bottom-12 right-1/4 h-44 w-80 rounded-full bg-white/50 blur-xl" />

          <div className="relative rounded-3xl ghibli-panel px-8 py-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-ghibli-clay bg-[#FDF0CF] text-4xl shadow-inner">
              🎭
            </div>
            <h2 className="mt-3 font-display text-2xl font-black text-ghibli-ink">
              {curtain.title}
            </h2>
            <p className="mt-2 max-w-md text-sm font-semibold text-ghibli-ink-soft">
              {curtain.tip}
            </p>
            <div className="mx-auto mt-5 h-2.5 w-48 overflow-hidden rounded-full border border-ghibli-clay/50 bg-ghibli-track">
              <div className="h-full w-full bg-gradient-to-r from-ghibli-sun via-ghibli-coral to-ghibli-sage" />
            </div>
          </div>
        </div>
      )}

      {/* Sleep Dark Fade Overlay */}
      {sleepOverlay && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#2E3F6B] to-[#5A5C8F] p-6 text-center">
          <div className="text-5xl">🌙💤</div>
          <div className="mt-3 font-display text-xl font-black text-ghibli-cream">
            Đang nghỉ ngơi hồi phục năng lượng...
          </div>
        </div>
      )}

      {/* Floating Toasts */}
      <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 flex w-[92%] max-w-md -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`w-full rounded-full border px-4 py-2.5 text-center text-xs font-extrabold shadow-lg ${
              t.tone === 'success'
                ? 'border-[#3F8D2B] bg-[#E8F8E2] text-[#286618]'
                : t.tone === 'warn'
                ? 'border-[#C97D10] bg-[#FFF5DC] text-[#8A5200]'
                : t.tone === 'error'
                ? 'border-[#AE361B] bg-[#FDECE7] text-[#B2351A]'
                : t.tone === 'pink'
                ? 'border-[#C83E6B] bg-[#FCEAF0] text-[#9E224C]'
                : 'cozy-pill text-[#1F7A73]'
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </>
  );
};
