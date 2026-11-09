import React from 'react';
import { CHAPTERS, QUESTS, objectiveLabel, objectiveMet, questMet } from '../core/quests';
import { useGameStore } from '../core/store';

/** Bảng nhiệm vụ: liệt kê các chương, quest và tiến độ từng mục tiêu (Cozy Modern Tactile). */
export const QuestSheet: React.FC = () => {
  const questOpen = useGameStore((s) => s.questOpen);
  const setQuestOpen = useGameStore((s) => s.setQuestOpen);
  const state = useGameStore((s) => s.state);

  if (!questOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ghibli-ink/35 sm:items-center sm:p-4">
      <div className="cozy-card flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-[#EFE5D4] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E5F6DF] text-2xl">
              📜
            </span>
            <div>
              <h2 className="font-display text-xl font-black text-ghibli-ink">Nhiệm Vụ Sự Nghiệp</h2>
              <p className="text-xs font-semibold text-[#2C731D]">
                Hoàn thành nhiệm vụ để nhận thưởng XP và Charisma
              </p>
            </div>
          </div>
          <button
            onClick={() => setQuestOpen(false)}
            className="btn-tactile rounded-full px-3.5 py-1.5 text-xs font-black text-ghibli-ink"
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
                <div className="mb-2.5 flex items-center justify-between">
                  <h3 className="font-display text-sm font-black uppercase tracking-wider text-[#C83E6B]">
                    {ch.title}
                  </h3>
                  <span
                    className={`rounded-full px-3 py-0.5 text-xs font-black ${
                      chDone
                        ? 'bg-[#E5F6DF] text-[#2C731D]'
                        : 'bg-[#FFF0D4] text-[#9C5B00]'
                    }`}
                  >
                    {chDone ? `✓ Đã xong · +${ch.reward.xp} XP` : `Thưởng chương +${ch.reward.xp} XP`}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {members.map((q) => {
                    const done = Boolean(state.quests.done[q.id]);
                    return (
                      <div
                        key={q.id}
                        className={`rounded-2xl border p-3.5 transition ${
                          done
                            ? 'border-[#B6E2A8] bg-[#F2FBEF]'
                            : 'border-[#E6D6C1] bg-[#FFFDF9]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-display text-sm font-black text-ghibli-ink">
                            {done ? '✅ ' : questMet(q, state) ? '🎉 ' : '🎯 '}
                            {q.title}
                          </span>
                          <span className="whitespace-nowrap rounded-full bg-[#FFF0D4] px-2.5 py-0.5 text-xs font-black text-[#9C5B00]">
                            +{q.reward.xp} XP · +{q.reward.charisma} Cha
                          </span>
                        </div>
                        <ul className="mt-2 space-y-1">
                          {q.objectives.map((o, i) => {
                            const met = objectiveMet(o, state);
                            return (
                              <li
                                key={i}
                                className={`flex items-center gap-1.5 text-xs font-bold ${
                                  met ? 'text-[#2C731D]' : 'text-ghibli-ink-soft'
                                }`}
                              >
                                <span>{met ? '☑' : '☐'}</span>
                                <span>{objectiveLabel(o, state)}</span>
                              </li>
                            );
                          })}
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
