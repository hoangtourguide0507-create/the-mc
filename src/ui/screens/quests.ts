/**
 * Bảng nhiệm vụ (bản HTML thuần của QuestSheet.tsx cũ), hiển thị thẳng trong `root`.
 * Giữ nguyên logic: tiến độ CEFR từ objectiveReport, chương và quest từ core/quests,
 * mục tiêu đạt hay chưa theo objectiveMet, quest đã xong theo quests.done.
 * Chỉ khác ở chữ: nhãn mục tiêu `street` gọi tên theo "Phản xạ nhanh" và bỏ emoji.
 */
import './quests.css';
import { chaNeed, fmtRep, levelTitle, MAX_LV } from '../../core/career';
import { objectiveReport } from '../../core/progress';
import { CHAPTERS, QUESTS, objectiveLabel, objectiveMet, questMet } from '../../core/quests';
import { gameStore } from '../../core/store';
import { watch } from '../../engine/watch';
import type { ChapterDef, GameState, QuestDef, QuestObjective } from '../../types/game';
import { clear, h } from '../dom';

/** Nhãn mục tiêu: `street` là phản xạ nhanh ở tab Luyện tập; các loại khác lấy từ core. */
function objectiveText(o: QuestObjective, st: GameState): string {
  if (o.kind === 'street') {
    const n = Object.keys(st.quests.streetDone).length;
    return `Phản xạ nhanh: ${Math.min(n, o.count)}/${o.count}`;
  }
  return objectiveLabel(o, st);
}

/** Thẻ thang nghề: cấp, danh hiệu, tiến độ tới cấp sau, danh tiếng (giống thẻ .career ở màn chính). */
function careerCard(st: GameState): HTMLElement {
  const { charisma, rep } = st;
  const max = charisma.lv >= MAX_LV;
  const need = chaNeed(charisma.lv);
  const pct = max ? 100 : Math.min(100, (charisma.pts / need) * 100);
  const repText = rep.n > 0 ? `${fmtRep(rep)} ★` : 'chưa có';
  return h(
    'section',
    { class: 'panel career' },
    h(
      'div',
      { class: 'row' },
      h('span', { class: 'lv' }, `CẤP ${charisma.lv} / ${MAX_LV}`),
      h('span', { class: 'meta' }, max ? 'Cấp cao nhất' : `${charisma.pts} / ${need} điểm`)
    ),
    h('div', { class: 'title' }, levelTitle(charisma.lv)),
    h('div', { class: 'bar', role: 'progressbar', ariaValueNow: String(Math.round(pct)) }, h('i', { style: { width: `${pct}%` } })),
    h('div', { class: 'meta' }, h('span', null, 'Danh tiếng ', h('b', null, repText)))
  );
}

function cefrCard(st: GameState): HTMLElement {
  const rep = objectiveReport(st.stats.bestStars);
  return h(
    'section',
    { class: 'panel quests-card' },
    h('div', { class: 'eyebrow' }, 'Tiến độ mục tiêu CEFR'),
    h(
      'div',
      { class: 'quests-cefr' },
      ...(['A2', 'B1', 'B2'] as const).map((lv) =>
        h('div', { class: 'quests-lv' }, h('b', null, lv), h('small', null, `${rep[lv].met}/${rep[lv].total} đạt`))
      )
    )
  );
}

function questCard(q: QuestDef, st: GameState): HTMLElement {
  const done = Boolean(st.quests.done[q.id]);
  const ready = !done && questMet(q, st);
  const status = done ? h('span', { class: 'quests-tag done' }, 'Đã xong') : ready ? h('span', { class: 'quests-tag ready' }, 'Đã đủ điều kiện') : null;
  return h(
    'article',
    { class: done ? 'panel quests-quest done' : 'panel quests-quest' },
    h(
      'div',
      { class: 'quests-qhead' },
      h('span', { class: 'quests-qname' }, q.title),
      status,
      h('span', { class: 'quests-reward' }, `+${q.reward.xp} XP · +${q.reward.charisma} Charisma`)
    ),
    h(
      'ul',
      { class: 'quests-objs' },
      ...q.objectives.map((o) => {
        const met = objectiveMet(o, st);
        return h(
          'li',
          { class: met ? 'quests-obj met' : 'quests-obj' },
          h('span', { class: 'quests-mark', ariaHidden: 'true' }, met ? '✓' : ''),
          h('span', null, objectiveText(o, st))
        );
      })
    )
  );
}

function chapterSection(ch: ChapterDef, st: GameState): HTMLElement {
  const members = QUESTS.filter((q) => q.chapter === ch.id);
  const chDone = Boolean(st.quests.chapterDone[ch.id]);
  return h(
    'section',
    { class: 'quests-chapter' },
    h(
      'div',
      { class: 'quests-chead' },
      h('h3', { class: 'quests-ctitle' }, ch.title),
      h(
        'span',
        { class: chDone ? 'quests-tag done' : 'quests-tag' },
        chDone ? `Đã xong · +${ch.reward.xp} XP` : `Thưởng chương +${ch.reward.xp} XP`
      )
    ),
    ...members.map((q) => questCard(q, st))
  );
}

export function mountQuests(root: HTMLElement): () => void {
  const wrap = h('div', { class: 'quests' });
  root.append(wrap);

  function render(): void {
    const st = gameStore.getState().state;
    clear(wrap);
    wrap.append(
      careerCard(st),
      h('p', { class: 'vi' }, 'Hoàn thành nhiệm vụ để nhận XP và Charisma. Nhiệm vụ không bắt buộc.'),
      cefrCard(st),
      ...CHAPTERS.map((ch) => chapterSection(ch, st))
    );
  }

  const off = watch((s) => s.state, render);

  return () => {
    off();
    wrap.remove();
  };
}
