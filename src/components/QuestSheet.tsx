import React from 'react';
import { CHAPTERS, QUESTS, objectiveLabel, objectiveMet, questMet } from '../core/quests';
import { useGameStore } from '../core/store';

/** Bảng nhiệm vụ: liệt kê các chương, quest và tiến độ từng mục tiêu. */
export const QuestSheet: React.FC = () => {
  const questOpen = useGameStore((s) => s.questOpen);
  const setQuestOpen = useGameStore((s) => s.setQuestOpen);
  const state = useGameStore((s) => s.state);

  if (!questOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-md sm:items-center sm:p-4">
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-white/20 bg-[#150C38] shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="font-display text-xl font-black text-white">📜 Nhiệm vụ</h2>
            <p className="text-xs font-semibold text-emerald-300">
              Hoàn thành nhiệm vụ để nhận XP và Charisma. Nhiệm vụ không bắt buộc.
            </p>
          </div>
          <button
            onClick={() => setQuestOpen(false)}
            className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-white hover:bg-white/20"
          >
            Đóng ✕
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {CHAPTERS.map((ch) => {
            const members = QUESTS.filter((q) => q.chapter === ch.id);
            const chDone = Boolean(state.quests.chapterDone[ch.id]);
            return (
              <section key={ch.id}>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-display text-sm font-black text-pink-200">{ch.title}</h3>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                      chDone ? 'bg-emerald-500/25 text-emerald-300' : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    {chDone ? `✓ Đã xong · +${ch.reward.xp} XP` : `Thưởng chương +${ch.reward.xp} XP`}
                  </span>
                </div>

                <div className="space-y-2">
                  {members.map((q) => {
                    const done = Boolean(state.quests.done[q.id]);
                    return (
                      <div
                        key={q.id}
                        className={`rounded-2xl border p-3 ${
                          done ? 'border-emerald-400/40 bg-emerald-500/10' : 'border-white/15 bg-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-black text-white">
                            {done ? '✅ ' : questMet(q, state) ? '🎉 ' : ''}
                            {q.title}
                          </span>
                          <span className="whitespace-nowrap text-[10px] font-black text-amber-300">
                            +{q.reward.xp} XP · +{q.reward.charisma} Cha
                          </span>
                        </div>
                        <ul className="mt-2 space-y-1">
                          {q.objectives.map((o, i) => (
                            <li
                              key={i}
                              className={`text-xs font-semibold ${
                                objectiveMet(o, state) ? 'text-emerald-300' : 'text-slate-300'
                              }`}
                            >
                              {objectiveMet(o, state) ? '☑' : '☐'} {objectiveLabel(o, state)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
};
