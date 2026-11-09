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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ghibli-ink/40 sm:items-center sm:p-4">
 <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border ghibli-panel shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-ghibli-track px-5 py-4">
          <div>
            <h2 className="font-display text-xl font-black text-ghibli-ink">📜 Nhiệm vụ</h2>
            <p className="text-xs font-semibold text-emerald-700">
              Hoàn thành nhiệm vụ để nhận XP và Charisma. Nhiệm vụ không bắt buộc.
            </p>
          </div>
          <button
            onClick={() => setQuestOpen(false)}
 className="rounded-full ghibli-panel px-3 py-1.5 text-xs font-black text-ghibli-ink hover:ghibli-panel"
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
                  <h3 className="font-display text-sm font-black text-pink-700">{ch.title}</h3>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-black ${
 chDone ? 'bg-emerald-500/25 text-emerald-700' : 'ghibli-panel text-ghibli-ink-soft'
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
 done ? 'border-emerald-400/40 bg-emerald-500/10' : ' ghibli-panel'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-black text-ghibli-ink">
                            {done ? '✅ ' : questMet(q, state) ? '🎉 ' : ''}
                            {q.title}
                          </span>
                          <span className="whitespace-nowrap text-xs font-black text-amber-700">
                            +{q.reward.xp} XP · +{q.reward.charisma} Cha
                          </span>
                        </div>
                        <ul className="mt-2 space-y-1">
                          {q.objectives.map((o, i) => (
                            <li
                              key={i}
                              className={`text-xs font-semibold ${
                                objectiveMet(o, state) ? 'text-emerald-700' : 'text-ghibli-ink-soft'
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
