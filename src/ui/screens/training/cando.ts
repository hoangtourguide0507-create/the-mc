/**
 * Tab Năng lực (bản HTML thuần của CanDo trong TrainingSheet.tsx cũ). Giữ nguyên logic:
 * - danh sách "tôi làm được" lấy từ canDoList, vẽ lại khi learn hoặc ngày đổi
 * - kiểm tra tuần: 6 câu theo pickForDay từ các lượt có cue của mọi kịch bản đã gặp,
 *   chấm bằng evaluateRecallCandidates, trung bình ghi bằng recordWeekly
 * - không hiển thị lại danh sách khi đang làm bài (tránh mất lượt đang nghe)
 */
import './cando.css';
import { SFX, SpeechEngine, Voice } from '../../../audio/audioSystem';
import { canDoList, pickForDay, weeklyDue, weeklyTrend, WEEKLY_PASS, type CanDo } from '../../../core/cando';
import { evaluateRecallCandidates } from '../../../core/recall';
import { gameStore } from '../../../core/store';
import { scriptTurns } from '../../../data/content';
import { watch } from '../../../engine/watch';
import { answerBar, type AnswerBar } from '../../answer';
import { append, clear, h } from '../../dom';

interface TestItem {
  npc: string;
  npcId: string;
  speaker?: 'emma' | 'liam';
  target: string;
}

export function mountCando(root: HTMLElement): () => void {
  const store = () => gameStore.getState();
  let disposed = false;
  let items: TestItem[] | null = null;
  let idx = 0;
  let scores: number[] = [];
  let last: { score: number; heard: string } | null = null;
  let finalScore: number | null = null;
  let bar: AnswerBar | null = null;
  // Giữ trạng thái mở/đóng của hai nhóm qua các lần vẽ lại
  const groupOpen = { todo: true, done: false };

  const wrap = h('div', { class: 'cando' });
  root.append(wrap);

  const dropBar = () => {
    bar?.dispose();
    bar = null;
  };

  const start = () => {
    const pool: TestItem[] = [];
    const { learn, day } = store().state;
    for (const key of Object.keys(learn.exposure)) {
      const script = scriptTurns(key);
      if (!script) continue;
      for (const t of script.turns) {
        if ((t.mode === 'scripted' || t.mode === 'catch') && t.cue) {
          pool.push({ npc: t.npc, npcId: t.who || script.scene.npc, speaker: t.speaker, target: t.cue });
        }
      }
    }
    const picked = pickForDay(pool, day, 6);
    if (picked.length === 0) return;
    items = picked;
    idx = 0;
    scores = [];
    last = null;
    finalScore = null;
    renderTest();
    Voice.speak(picked[0].npc, { npcId: picked[0].npcId, speaker: picked[0].speaker });
  };

  const answer = (candidates: string[]) => {
    if (!items || last) return;
    const res = evaluateRecallCandidates(items[idx].target, candidates);
    SFX.play(res.stars >= 2 ? 'ting' : 'error');
    last = { score: res.score, heard: res.transcript };
    scores = [...scores, res.score];
    renderTest();
  };

  const next = () => {
    if (!items) return;
    if (idx + 1 >= items.length) {
      const avg = scores.reduce((a, b) => a + b, 0) / Math.max(1, scores.length);
      store().recordWeekly(avg);
      finalScore = Math.round(avg);
      items = null;
      renderIdle();
      return;
    }
    idx += 1;
    last = null;
    renderTest();
    Voice.speak(items[idx].npc, { npcId: items[idx].npcId, speaker: items[idx].speaker });
  };

  /* ---------- Danh sách năng lực và phần kiểm tra tuần ---------- */
  const row = (c: CanDo) => {
    const m = /^\[([^\]]+)\]\s*(.*)$/.exec(c.label);
    const labelEl = m
      ? h('span', { class: 'cando-label' }, h('span', { class: 'cando-cefr' }, m[1]), m[2])
      : h('span', { class: 'cando-label' }, c.label);
    return h(
      'li',
      { class: `cando-row${c.done ? ' done' : ''}` },
      h('div', { class: 'cando-top' }, labelEl, h('span', { class: 'cando-count' }, `${c.have}/${c.need}`)),
      h('div', { class: 'bar' }, h('i', { style: { width: `${(c.have / c.need) * 100}%` } })),
      c.done ? null : h('p', { class: 'cando-how' }, c.how)
    );
  };

  const group = (title: string, rows: CanDo[], key: 'todo' | 'done') => {
    if (rows.length === 0) return null;
    return h(
      'details',
      {
        class: 'cando-group',
        open: groupOpen[key] || undefined,
        ontoggle: (e: Event) => {
          groupOpen[key] = (e.currentTarget as HTMLDetailsElement).open;
        },
      },
      h('summary', null, `${title} (${rows.length})`),
      h('ul', { class: 'cando-list' }, ...rows.map(row))
    );
  };

  const renderIdle = () => {
    if (disposed) return;
    const { learn, day } = store().state;
    const list = canDoList(learn);
    const due = weeklyDue(learn, day);
    const trend = weeklyTrend(learn);
    const lastTest = learn.weekly.history[learn.weekly.history.length - 1];
    const doneCount = list.filter((c) => c.done).length;

    const testBody: (Node | string | null)[] = [
      h('p', { class: 'eyebrow' }, 'Bài kiểm tra tuần'),
    ];
    if (finalScore !== null) {
      testBody.push(
        h(
          'p',
          { class: 'cando-result-line' },
          `Kết quả: ${finalScore}% ${finalScore >= WEEKLY_PASS ? '(đạt)' : `(cần ${WEEKLY_PASS}% để đạt)`}` +
            (trend !== null ? ` · ${trend >= 0 ? 'tăng' : 'giảm'} ${Math.abs(trend)} điểm so với lần trước` : '')
        )
      );
    } else if (lastTest) {
      testBody.push(h('p', { class: 'vi' }, `Lần gần nhất (ngày ${lastTest.day}): ${lastTest.score}%`));
    }
    testBody.push(h('p', { class: 'vi' }, 'Sáu câu lấy từ các tình huống bạn đã gặp. Chỉ nghe NPC rồi tự đáp, không chữ và không gợi ý.'));
    if (due) {
      testBody.push(h('button', { class: 'btn', type: 'button', onclick: start }, 'Bắt đầu bài kiểm tra'));
    } else {
      testBody.push(
        h(
          'p',
          { class: 'cando-result-line' },
          Object.keys(learn.exposure).length === 0
            ? 'Hoàn thành ít nhất một show để mở bài kiểm tra.'
            : `Bài kế tiếp mở vào ngày ${learn.weekly.lastDay + 7} (hôm nay là ngày ${day}).`
        )
      );
    }

    clear(wrap);
    append(wrap, [
      h('p', { class: 'note-box' }, 'Tiến bộ tính bằng việc bạn tự làm được, không phải số sao. Mỗi dòng cần bằng chứng từ những lượt nói không có thẻ nhắc.'),
      h('p', { class: 'cando-sum' }, `Đã làm được ${doneCount}/${list.length} mục`),
      group('Chưa làm được', list.filter((c) => !c.done), 'todo'),
      group('Đã làm được', list.filter((c) => c.done), 'done'),
      h('div', { class: 'card cando-test' }, ...testBody),
    ]);
  };

  const renderTest = () => {
    if (disposed || !items) return;
    dropBar();
    const it = items[idx];
    const total = items.length;
    const body: (Node | string | null)[] = [
      h('p', { class: 'vi' }, `Kiểm tra tuần · câu ${idx + 1}/${total} · không có chữ, không có gợi ý`),
      h('button', { class: 'btn quiet', type: 'button', onclick: () => Voice.speak(it.npc, { npcId: it.npcId, speaker: it.speaker }) }, 'Nghe lại câu của NPC'),
      h('p', { class: 'vi' }, 'Nghe rồi tự đáp lại bằng tiếng Anh như khi đang dẫn thật.'),
    ];
    if (last) {
      body.push(
        h(
          'div',
          { class: 'note-box focus' },
          h('p', { class: 'big' }, `Đạt ${last.score}% ý của câu mẫu`),
          h('div', { class: 'heard' }, h('span', null, 'Bạn nói'), h('i', null, `“${last.heard}”`)),
          h('p', { class: 'vi' }, 'Câu của NPC'),
          h('p', { class: 'npc-line' }, it.npc),
          h('p', { class: 'vi' }, 'Câu mẫu'),
          h('p', { class: 'say' }, it.target),
          h('button', { class: 'btn', type: 'button', onclick: next }, idx + 1 >= total ? 'Xem kết quả' : 'Câu tiếp')
        )
      );
    } else {
      bar = answerBar({ onAnswer: answer });
      body.push(bar.el);
    }
    clear(wrap);
    append(wrap, [h('div', { class: 'card cando-test' }, ...body)]);
  };

  // Vẽ lại danh sách khi learn hoặc ngày đổi; không vẽ lại lúc đang làm bài
  const unsub = watch(
    (s) => `${s.state.day}|${JSON.stringify(s.state.learn)}`,
    () => {
      if (!items) renderIdle();
    }
  );

  return () => {
    disposed = true;
    unsub();
    dropBar();
    Voice.stop();
    SpeechEngine.abort();
    wrap.remove();
  };
}
