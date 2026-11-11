/**
 * Luyện phát âm (bản HTML thuần của PronunciationSheet.tsx cũ). Giữ nguyên logic:
 * - lộ trình 8 nhóm, mở nhóm kế khi đạt 60% mọi bài của nhóm trước
 * - ghi âm 2,5 giây, mô hình phoneme so với IPA, kiểm tra trọng âm; dự phòng nhận dạng giọng nói
 * - nhập tay khi không có mic; mỗi lần chấm gọi recordPron (đạt thì +5 XP)
 * - trò chơi nghe phân biệt cặp từ, không cần mic
 * Không có khung hộp thoại: nội dung hiển thị thẳng trong root.
 */
import './pronunciation.css';
import { NPCS } from '../../../data/content';
import {
  PRON_DRILLS,
  PRON_GROUP_META,
  PRON_LADDER,
  groupMastered,
  unlockedGroups,
  coachFor,
  pickPronDrill,
} from '../../../data/pronunciation';
import type { PronDrill } from '../../../data/pronunciation';
import { normText, SpeechEngine, Voice } from '../../../audio/audioSystem';
import { recordClip } from '../../../audio/clipRecorder';
import type { ClipHandle } from '../../../audio/clipRecorder';
import { modelStatus, onModelStatus, transcribePhones } from '../../../audio/phonemeModel';
import type { ModelStatus } from '../../../audio/phonemeModel';
import { bestScore, checkStress, phoneVerdict, tokenizePhones } from '../../../core/phonology';
import type { AlignOp, StressReport } from '../../../core/phonology';
import { gameStore } from '../../../core/store';
import { watch } from '../../../engine/watch';
import { append, clear, h } from '../../dom';

type Phase = 'idle' | 'recording' | 'analyzing';
type PhoneResult = {
  source: 'phone';
  pass: boolean;
  score: number;
  ops: AlignOp[];
  stress: StressReport;
  heardText: string;
};
type Result =
  | PhoneResult
  | { source: 'speech'; pass: boolean; heard: string }
  | { source: 'empty' }
  | null;

function opLabel(op: AlignOp): { text: string; cls: string } {
  switch (op.kind) {
    case 'match':
      return { text: `Khớp /${op.target}/`, cls: 'ok' };
    case 'near':
      return { text: `Gần đúng /${op.target}/ (bạn đọc /${op.heard}/)`, cls: 'near' };
    case 'missing':
      return { text: `Thiếu /${op.target}/`, cls: 'bad' };
    case 'wrong':
      return { text: `/${op.target}/ bị đọc thành /${op.heard}/`, cls: 'bad' };
    case 'extra':
      return { text: `Thừa /${op.heard}/`, cls: 'near' };
  }
}

function modelLine(status: ModelStatus, progress: number): string {
  return status === 'loading'
    ? `Đang tải mô hình phát âm lần đầu… ${progress}%`
    : status === 'ready'
    ? 'Mô hình phát âm đã sẵn sàng (chạy trên máy bạn).'
    : status === 'error'
    ? 'Không tải được mô hình phát âm. Đang dùng nhận dạng từ cơ bản.'
    : 'Lần đầu sẽ tải mô hình phát âm (vài trăm MB, chỉ một lần).';
}

function resultBox(r: NonNullable<Result>, drillWord: string): HTMLElement {
  if (r.source === 'empty') {
    return h('div', { class: 'pron-verdict bad' }, 'Chưa nghe rõ. Hãy kiểm tra micro và thử lại.');
  }
  if (r.source === 'speech') {
    const words = normText(r.heard).split(/\s+/).filter(Boolean);
    return h(
      'div',
      { class: `pron-verdict ${r.pass ? 'ok' : 'bad'}` },
      r.pass
        ? `Nhận ra “${drillWord}” (+5 XP)`
        : `Chưa nhận ra “${drillWord}”. Nghe được: “${words.join(' ') || r.heard}”.`,
      h('div', { class: 'pron-verdict-note' }, 'Nhận dạng từ chỉ kiểm tra từ, không chấm từng âm. Hãy so với phần nghe mẫu.')
    );
  }
  return h(
    'div',
    { class: 'pron-result' },
    h(
      'div',
      { class: `pron-verdict ${r.pass ? 'ok' : 'bad'}` },
      `${r.pass ? 'Phát âm đạt (+5 XP)' : 'Chưa đạt, xem chi tiết bên dưới'} · độ khớp ${Math.round(r.score * 100)}%`
    ),
    h(
      'ul',
      { class: 'pron-ops' },
      ...r.ops.map((op) => {
        const l = opLabel(op);
        return h('li', { class: `pron-op ${l.cls}` }, l.text);
      })
    ),
    h('div', { class: 'heard' }, 'Nghe mô hình hiểu là: ', h('i', null, r.heardText || '(không nghe được âm nào)')),
    h('p', { class: `vi${r.stress.stressOk === false ? ' pron-warn' : ''}` }, r.stress.message)
  );
}

export function mountPronunciation(root: HTMLElement): () => void {
  const store = () => gameStore.getState();
  const initPron = store().state.pron;
  let drill: PronDrill = pickPronDrill(initPron.progress, initPron.recent);

  let disposed = false;
  let token = 0;
  let phase: Phase = 'idle';
  let interim = '';
  let result: Result = null;
  let mStatus: ModelStatus = modelStatus();
  let mProgress = 0;
  let typed = '';
  let showTyped = false;
  let clip: ClipHandle | null = null;
  let modelEl: HTMLElement | null = null;

  /** Kết quả bất đồng bộ chỉ được áp dụng khi màn còn mở và lượt vẫn là lượt đó */
  const live = (t: number) => !disposed && t === token;
  /** Phát giọng, bỏ qua nếu màn đã đóng */
  const say = (text: string, opts: { npcId: string; slow?: boolean }) => {
    if (!disposed) void Voice.speak(text, opts);
  };

  const wrap = h('div', { class: 'pron' });
  const ladderBox = h('div', { class: 'chips pron-ladder' });
  const ladderCard = h(
    'section',
    { class: 'card' },
    h('div', { class: 'eyebrow' }, 'Lộ trình phát âm'),
    ladderBox,
    h('p', { class: 'vi' }, 'Đạt từ 60% đúng ở mọi bài của một nhóm để mở nhóm kế tiếp.')
  );
  const metaRow = h('div', { class: 'chips pron-meta' });
  const drillSlot = h('div', { class: 'pron-drill' });
  const practice = h('section', { class: 'card pron-practice' });
  const pairSlot = h('div', { class: 'pron-pair-slot' });
  const nextBtn = h('button', { class: 'btn quiet', type: 'button', onclick: nextDrill }, 'Bài khác (ngẫu nhiên)');
  const sentenceSlot = h('section', { class: 'note-box pron-sentence' });
  wrap.append(ladderCard, metaRow, drillSlot, practice, pairSlot, nextBtn, sentenceSlot);
  root.append(wrap);

  function paintLadder(): void {
    const progress = store().state.pron.progress;
    const open = unlockedGroups(progress);
    clear(ladderBox);
    PRON_LADDER.forEach((g, i) => {
      const done = groupMastered(progress, g);
      const isOpen = open.includes(g);
      const state = done ? 'done' : isOpen ? 'open' : 'locked';
      const note = done ? ' · đã xong' : isOpen ? ' · đang mở' : ' · khóa';
      ladderBox.append(h('span', { class: `pron-step ${state}` }, `${i + 1}. ${PRON_GROUP_META[g].label}${note}`));
    });
  }

  function paintMeta(): void {
    const d = drill;
    const meta = PRON_GROUP_META[d.group];
    const stat = store().state.pron.progress[d.id];
    const coach = NPCS[coachFor(d)];
    clear(metaRow);
    append(metaRow, [
      h('span', { class: 'pill' }, meta.label),
      h('span', { class: 'who' }, 'Huấn luyện viên: ', h('b', null, coach?.name ?? 'chưa có')),
      stat ? h('span', { class: 'who' }, `Đã thử ${stat.tries} · đạt ${stat.ok}`) : null,
    ]);
  }

  /** Trò nghe phân biệt cặp từ: trạng thái riêng, dựng lại khi đổi bài */
  function buildPair(d: PronDrill, pairWord: string): HTMLElement {
    const pairDrill = PRON_DRILLS.find((x) => x.word === pairWord);
    let target = d.word;
    let options = [d.word, pairWord];
    let picked: string | null = null;
    let score = { right: 0, total: 0 };
    const box = h('section', { class: 'card pron-pair' });

    function paint(): void {
      const showState = picked !== null;
      clear(box);
      append(box, [
        h('div', { class: 'pron-h' }, `Nghe phân biệt: ${d.word} hay ${pairWord}?`),
        h(
          'p',
          { class: 'vi' },
          `Trò này kiểm tra khả năng nghe. Nghe rồi chọn từ đúng.${pairDrill ? ` (${pairWord}: ${pairDrill.ipa})` : ''}`
        ),
        h('button', { class: 'btn quiet', type: 'button', onclick: () => say(target, { npcId: coachFor(d) }) }, 'Nghe lại'),
        h(
          'div',
          { class: 'pron-pair-grid' },
          ...options.map((w) => {
            const isRight = w === target;
            const state = showState && isRight ? 'picked' : showState && picked === w ? 'wrong' : '';
            return h('button', { class: `opt pron-pair-opt ${state}`, type: 'button', onclick: () => choose(w) }, w);
          })
        ),
      ]);
      if (picked !== null) {
        const ok = picked === target;
        box.append(
          h(
            'div',
            { class: 'pron-pair-foot' },
            h('span', { class: ok ? 'pron-pair-ok' : 'pron-pair-no' }, ok ? 'Đúng rồi!' : `Sai, đó là “${target}”.`),
            h('button', { class: 'btn quiet', type: 'button', onclick: newRound }, 'Vòng tiếp')
          )
        );
      }
      box.append(h('div', { class: 'vi pron-pair-score' }, `Đúng ${score.right}/${score.total}`));
    }

    function choose(w: string): void {
      if (picked !== null) return;
      picked = w;
      score = { right: score.right + (w === target ? 1 : 0), total: score.total + 1 };
      paint();
    }

    function newRound(): void {
      target = Math.random() < 0.5 ? d.word : pairWord;
      options = Math.random() < 0.5 ? [d.word, pairWord] : [pairWord, d.word];
      picked = null;
      paint();
      say(target, { npcId: coachFor(d) });
    }

    paint();
    // Phát từ đích khi vừa dựng vòng đầu, như hiệu ứng mount của bản cũ
    say(target, { npcId: coachFor(d) });
    return box;
  }

  /** Phần nội dung của bài: từ, nghe mẫu, phân tích, lỗi hay gặp, mẹo, cặp từ, câu mẫu */
  function buildDrill(): void {
    const d = drill;
    paintMeta();
    clear(drillSlot);
    append(drillSlot, [
      h(
        'section',
        { class: 'card pron-word' },
        h('div', { class: 'pron-word-text' }, d.word),
        h('div', { class: 'pron-ipa' }, d.ipa, d.ipaAlt ? h('span', { class: 'pron-ipa-alt' }, `hoặc ${d.ipaAlt}`) : null),
        h(
          'div',
          { class: 'chips' },
          ...d.syllables.map((syl) => h('span', { class: syl.stressed ? 'pron-syl stressed' : 'pron-syl' }, syl.text))
        ),
        h('p', { class: 'vi' }, 'Âm tiết to và nổi bật hơn là âm được nhấn.')
      ),
      h(
        'div',
        { class: 'pron-listen' },
        h(
          'button',
          { class: 'btn', type: 'button', onclick: () => say(d.word, { npcId: coachFor(d), slow: true }) },
          'Nghe từ (chậm)'
        ),
        h(
          'button',
          { class: 'btn quiet', type: 'button', onclick: () => say(d.sentence.en, { npcId: coachFor(d) }) },
          'Nghe câu mẫu'
        )
      ),
      h(
        'section',
        { class: 'card' },
        h('div', { class: 'pron-h' }, 'Phân tích từng âm'),
        h(
          'ul',
          { class: 'pron-list' },
          ...d.analysis.map((a) => h('li', { class: 'pron-item' }, h('b', null, a.part), h('div', { class: 'vi' }, a.note)))
        )
      ),
      h(
        'section',
        { class: 'card' },
        h('div', { class: 'pron-h' }, 'Lỗi người Việt hay gặp'),
        h(
          'ul',
          { class: 'pron-list' },
          ...d.mistakes.map((m) =>
            h('li', { class: 'pron-item bad' }, h('b', null, `Hay đọc thành: ${m.wrong}`), h('div', { class: 'vi' }, m.why))
          )
        )
      ),
      h('p', { class: 'note-box pron-tip' }, h('b', null, 'Mẹo: '), d.tip),
    ]);

    clear(pairSlot);
    if (d.pair) pairSlot.append(buildPair(d, d.pair));

    clear(sentenceSlot);
    append(sentenceSlot, [h('div', { class: 'pron-en' }, d.sentence.en), h('div', { class: 'vi' }, d.sentence.vi)]);
  }

  /** Vùng luyện nói: chỉ dựng lại khi trạng thái nói đổi */
  function renderPractice(): void {
    const d = drill;
    const modelP = h('p', { class: 'vi' }, modelLine(mStatus, mProgress));
    modelEl = modelP;
    const kids: Node[] = [h('p', { class: 'npc-line' }, `Đến lượt bạn: nói “${d.word}”`), modelP];

    if (phase === 'recording') {
      kids.push(h('button', { class: 'btn rec', type: 'button', onclick: stopRecording }, 'Dừng ghi âm'));
    } else {
      kids.push(
        h(
          'button',
          { class: 'btn', type: 'button', disabled: phase === 'analyzing', onclick: startPhoneAttempt },
          phase === 'analyzing' ? 'Đang phân tích…' : 'Nói từ này'
        )
      );
    }
    if (interim) kids.push(h('p', { class: 'pron-interim' }, interim));

    if (showTyped) {
      kids.push(typedForm());
    } else if (phase === 'idle') {
      kids.push(
        h(
          'button',
          {
            class: 'link pron-link',
            type: 'button',
            onclick: () => {
              showTyped = true;
              renderPractice();
            },
          },
          'Không có mic? Gõ từ thay thế'
        )
      );
    }

    if (result) kids.push(resultBox(result, d.word));

    clear(practice);
    append(practice, kids);
    nextBtn.disabled = phase !== 'idle';
  }

  function typedForm(): HTMLFormElement {
    const input = h('input', {
      class: 'text-input',
      type: 'text',
      placeholder: 'Gõ từ bạn vừa đọc…',
      autocomplete: 'off',
      autocapitalize: 'off',
      value: typed,
    });
    input.addEventListener('input', () => {
      typed = input.value;
    });
    return h(
      'form',
      {
        class: 'answer-form',
        onsubmit: (e: Event) => {
          e.preventDefault();
          const v = typed;
          if (!v.trim()) return;
          typed = '';
          judgeText(v);
        },
      },
      input,
      h('button', { class: 'btn quiet', type: 'submit' }, 'Gửi')
    );
  }

  /** Dự phòng: chấm theo chữ nghe được (nhận dạng từ), ghi kết quả như bản cũ */
  function judgeText(heard: string): void {
    const d = drill;
    const norm = normText(heard);
    if (!norm) {
      result = { source: 'empty' };
      renderPractice();
      return;
    }
    const ok = norm.split(/\s+/).some((w) => d.accepted.includes(w));
    result = { source: 'speech', pass: ok, heard };
    store().recordPron(d.id, ok);
    renderPractice();
  }

  async function speechFallback(): Promise<void> {
    const mine = token;
    phase = 'recording';
    interim = '';
    renderPractice();
    const res = await SpeechEngine.listen({
      onInterim: (t) => {
        if (!live(mine)) return;
        interim = t;
        renderPractice();
      },
    });
    if (!live(mine)) return;
    phase = 'idle';
    if (res.reason === 'aborted') {
      renderPractice();
      return;
    }
    if (res.reason === 'error' || (!res.transcript && res.reason === 'no-speech')) {
      showTyped = true;
      renderPractice();
      return;
    }
    judgeText(res.transcript);
  }

  /** Luyện nói chính: ghi âm → mô hình phoneme → so IPA + kiểm tra trọng âm */
  async function startPhoneAttempt(): Promise<void> {
    if (modelStatus() === 'error') {
      void speechFallback();
      return;
    }
    const mine = token;
    const d = drill;
    result = null;
    phase = 'recording';
    renderPractice();

    const handle = recordClip(2500);
    clip = handle;
    const samples = await handle.done;
    clip = null;
    if (!live(mine)) return;
    if (!samples) {
      phase = 'idle';
      result = { source: 'empty' };
      renderPractice();
      return;
    }

    phase = 'analyzing';
    renderPractice();
    let text: string;
    try {
      text = await transcribePhones(samples);
    } catch {
      if (!live(mine)) return;
      phase = 'idle';
      void speechFallback();
      return;
    }
    if (!live(mine)) return;

    const heard = tokenizePhones(text);
    const targets = [tokenizePhones(d.ipa), tokenizePhones(d.ipaAlt ?? d.ipa)];
    const best = bestScore(targets, heard);
    const stress = checkStress(samples, d.syllables);
    const pass = phoneVerdict(best) && stress.stressOk !== false;
    result = {
      source: 'phone',
      pass,
      score: best.score,
      ops: best.ops,
      stress,
      heardText: text,
    };
    store().recordPron(d.id, pass);
    phase = 'idle';
    renderPractice();
  }

  function stopRecording(): void {
    clip?.stop();
  }

  function nextDrill(): void {
    token++;
    const pron = store().state.pron;
    drill = pickPronDrill(pron.progress, [...pron.recent, drill.id]);
    result = null;
    interim = '';
    typed = '';
    showTyped = false;
    buildDrill();
    renderPractice();
  }

  // Dựng lần đầu
  paintLadder();
  buildDrill();
  renderPractice();

  // Theo dõi store: lộ trình và số lần thử của bài hiện tại. Nội dung bài và vùng nói không dựng lại.
  const unwatch = watch(
    (s) => s.state.pron,
    () => {
      paintLadder();
      paintMeta();
    },
    false
  );
  const offModel = onModelStatus((s, p) => {
    mStatus = s;
    mProgress = p;
    if (modelEl) modelEl.textContent = modelLine(s, p);
  });

  return () => {
    disposed = true;
    token++;
    unwatch();
    offModel();
    clip?.stop();
    clip = null;
    Voice.stop();
    SpeechEngine.abort();
    wrap.remove();
  };
}
