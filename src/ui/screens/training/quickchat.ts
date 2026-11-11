/**
 * Phản xạ nhanh (bản HTML thuần của StreetTalkModal cũ). Một người lạ hỏi một câu tiếng Anh ngắn,
 * người học chọn đáp án (mode choose) hoặc nói câu mẫu (mode speak). Giữ nguyên luật:
 * - chọn tình huống theo tầng mở theo cấp Charisma (isStreetTalkUnlocked), ưu tiên câu chưa làm (streetTalkDoneIds)
 * - chấm speak bằng evaluateScripted, qua từ 2 sao; hết 3 lượt thì hiện câu mẫu
 * - mỗi lần hoàn thành gọi markStreetTalkUsed (để nhiệm vụ loại street được tính) và gain({ xp: 3 })
 * Không lọc theo giờ, địa điểm; không dùng năng lượng hay tiền.
 */
import './quickchat.css';
import { SFX, SpeechEngine, Voice } from '../../../audio/audioSystem';
import { isStreetTalkUnlocked, unlockedTier } from '../../../core/difficulty';
import { evaluateScripted } from '../../../core/evaluator';
import { gameStore } from '../../../core/store';
import { STREET_TALK, WM_NAMES } from '../../../data/content';
import { watch } from '../../../engine/watch';
import type { EvalResult, StreetTalkItem } from '../../../types/game';
import { clear, h } from '../../dom';

const SPEAK_PASS_STARS = 2;
const SPEAK_MAX_ATTEMPTS = 3;
const XP_REWARD = 3;
/** Tầng 1, 2, 3 tương ứng với CEFR A2, B1, B2 (xem core/difficulty.ts). */
const TIER_LABEL = ['A2', 'B1', 'B2'];

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

/** Câu cần nói ở mode speak: ưu tiên say, nếu không có thì lấy đáp án đúng. */
function targetOf(it: StreetTalkItem): string {
  return it.say ?? it.options.find((o) => o.ok)?.en ?? '';
}

function starsEl(n: number): HTMLElement {
  const on = Math.max(0, Math.min(3, n));
  return h(
    'span',
    { class: 'stars', 'aria-label': `${on} trên 3 sao` },
    '★'.repeat(on),
    h('span', { class: 'off' }, '★'.repeat(3 - on))
  );
}

export function mountQuickchat(root: HTMLElement): () => void {
  const store = () => gameStore.getState();
  let disposed = false;
  /** Tăng mỗi câu mới; kết quả bất đồng bộ của câu cũ bị bỏ qua. */
  let qToken = 0;
  const timers: number[] = [];
  const unwatchers: Array<() => void> = [];

  let item: StreetTalkItem | null = null;
  let noData = false;
  let lastId: string | null = null;
  let passerName = '';
  let options: StreetTalkItem['options'] = [];
  let showVi = false;
  let picked: number | null = null;
  let shakeIdx: number | null = null;
  let speakResult: EvalResult | null = null;
  let attempts = 0;
  let speakDone = false;
  let recording = false;
  let interimText = '';
  let interimEl: HTMLElement | null = null;
  let showTyped = false;
  let focusTyped = false;
  let typed = '';

  // Phần đầu trang: tiến độ theo tầng mở. Vẽ lại khi store đổi.
  const progressWho = h('p', { class: 'who' });
  const progressFill = h('i');
  const progressBar = h('div', { class: 'bar' }, progressFill);
  const intro = h(
    'div',
    { class: 'card quickchat-top' },
    h('p', { class: 'vi' }, 'Người lạ hỏi một câu tiếng Anh ngắn. Chọn đáp án hoặc nói câu trả lời. Mỗi câu đúng được +3 XP.'),
    progressWho,
    progressBar
  );
  const box = h('div', { class: 'quickchat-box' });
  const el = h('section', { class: 'quickchat' }, intro, box);
  root.append(el);

  function paintProgress(): void {
    const st = store();
    const lv = st.state.charisma.lv;
    const unlocked = STREET_TALK.filter((it) => isStreetTalkUnlocked(it.level, lv));
    const done = unlocked.filter((it) => st.streetTalkDoneIds[it.id]).length;
    const tier = unlockedTier(lv);
    progressWho.textContent = `Đã làm ${done}/${unlocked.length} tình huống ở các tầng đã mở (đến CEFR ${TIER_LABEL[tier - 1] ?? 'A2'}, Charisma cấp ${lv}).`;
    progressFill.style.width = `${unlocked.length ? Math.round((done / unlocked.length) * 100) : 0}%`;
  }

  /** Chọn câu tiếp theo: ưu tiên câu chưa làm trong phiên, hết thì lặp lại câu đã mở khoá (như bản cũ). */
  function pickItem(): StreetTalkItem | null {
    const st = store();
    const lv = st.state.charisma.lv;
    const unlocked = STREET_TALK.filter((it) => isStreetTalkUnlocked(it.level, lv));
    const unused = unlocked.filter((it) => !st.streetTalkDoneIds[it.id]);
    let pool = unused.length ? unused : unlocked;
    if (pool.length > 1) pool = pool.filter((it) => it.id !== lastId);
    if (!pool.length) return STREET_TALK[0] ?? null;
    return pick(pool);
  }

  function nextQuestion(): void {
    if (disposed) return;
    const next = pickItem();
    if (!next) {
      item = null;
      noData = true;
      paintQuestion();
      return;
    }
    startQuestion(next);
  }

  function startQuestion(it: StreetTalkItem): void {
    qToken++;
    item = it;
    noData = false;
    lastId = it.id;
    passerName = pick(WM_NAMES);
    options = shuffle(it.options);
    showVi = false;
    picked = null;
    shakeIdx = null;
    speakResult = null;
    attempts = 0;
    speakDone = false;
    recording = false;
    interimText = '';
    showTyped = false;
    focusTyped = false;
    typed = '';
    SFX.play('chat');
    paintQuestion();
    Voice.speak(it.prompt.en, { npcId: 'passer', preferredURI: store().state.voiceURI });
  }

  function handleChoose(idx: number): void {
    const it = item;
    if (!it || picked !== null) return;
    const token = qToken;
    picked = idx;
    store().markStreetTalkUsed(it.id);
    const chosen = options[idx];
    if (chosen.ok) {
      SFX.play('correct');
      store().gain({ xp: XP_REWARD });
      Voice.speak(chosen.en, { npcId: 'coach', preferredURI: store().state.voiceURI });
    } else {
      SFX.play('error');
      shakeIdx = idx;
      timers.push(
        window.setTimeout(() => {
          if (disposed || token !== qToken) return;
          shakeIdx = null;
          paintQuestion();
        }, 380)
      );
    }
    paintQuestion();
  }

  /** Chấm một lần nói: lấy kết quả tốt nhất trong các phương án nhận dạng. */
  function evaluateAttempt(candidates: string[]): void {
    const it = item;
    const target = it ? targetOf(it) : '';
    if (!it || speakDone || !target) return;
    const list = candidates.map((c) => c.trim()).filter(Boolean);
    let best: EvalResult | null = null;
    for (const c of list.length ? list : ['']) {
      const r = evaluateScripted(target, c);
      if (!best || r.score > best.score) best = r;
    }
    const result = best!;
    attempts += 1;
    speakResult = result;

    if (result.stars >= SPEAK_PASS_STARS) {
      speakDone = true;
      store().markStreetTalkUsed(it.id);
      SFX.play('correct');
      store().gain({ xp: XP_REWARD });
      Voice.speak(target, { npcId: 'coach', preferredURI: store().state.voiceURI });
    } else if (attempts >= SPEAK_MAX_ATTEMPTS) {
      speakDone = true;
      store().markStreetTalkUsed(it.id);
      SFX.play('error');
      Voice.speak(target, { npcId: 'coach', preferredURI: store().state.voiceURI });
    } else {
      SFX.play('error');
    }
  }

  async function handleSpeak(): Promise<void> {
    if (!item || recording || speakDone) return;
    const token = qToken;
    SFX.play('tap');
    recording = true;
    interimText = '';
    paintQuestion();
    const res = await SpeechEngine.listen({
      onInterim: (txt: string) => {
        if (disposed || token !== qToken) return;
        interimText = txt;
        if (interimEl) {
          interimEl.textContent = txt;
          interimEl.style.display = txt ? '' : 'none';
        }
      },
    });
    if (disposed || token !== qToken) return;
    recording = false;
    if (res.reason === 'aborted') {
      paintQuestion();
      return;
    }
    if (res.reason === 'error' || (!res.transcript && res.reason === 'no-speech')) {
      showTyped = true;
      focusTyped = true;
      store().toast(
        res.error === 'unsupported'
          ? 'Trình duyệt chưa hỗ trợ thu âm. Hãy gõ câu trả lời bên dưới.'
          : 'Không nghe rõ. Bạn có thể nói lại hoặc gõ câu trả lời bên dưới.',
        'warn',
        3200
      );
      paintQuestion();
      return;
    }
    evaluateAttempt(res.alternatives.length > 0 ? res.alternatives : [res.transcript]);
    paintQuestion();
  }

  function submitTyped(): void {
    if (!typed.trim()) return;
    evaluateAttempt([typed]);
    typed = '';
    paintQuestion();
  }

  function buildChoose(): HTMLElement {
    const answered = picked !== null;
    const list = h('div', { class: 'quickchat-opts' });
    options.forEach((opt, idx) => {
      const isSel = picked === idx;
      let cls = 'opt';
      if (answered && opt.ok) cls += ' picked';
      else if (answered && isSel) cls += ' wrong';
      if (shakeIdx === idx) cls += ' shake';
      list.append(
        h(
          'button',
          { class: cls, type: 'button', onclick: () => handleChoose(idx) },
          h('span', { class: 'quickchat-opt-en' }, opt.en),
          answered ? h('span', { class: 'quickchat-opt-vi' }, opt.vi) : null
        )
      );
      if (answered && isSel && !opt.ok && opt.why) {
        list.append(h('div', { class: 'note-box focus' }, `Gợi ý: ${opt.why}`));
      }
    });
    return list;
  }

  function buildSpeak(it: StreetTalkItem): HTMLElement {
    const target = targetOf(it);
    const wrap = h('div', { class: 'quickchat-speak' });

    const mic = h(
      'button',
      {
        class: recording ? 'btn rec' : 'btn',
        type: 'button',
        disabled: speakDone,
        onclick: () => handleSpeak(),
      },
      speakDone ? 'Đã xong' : recording ? 'Đang nghe…' : 'Nói câu trả lời'
    );
    const rowItems: HTMLElement[] = [mic];
    if (!speakDone) {
      rowItems.push(
        h(
          'button',
          {
            class: 'btn quiet',
            type: 'button',
            onclick: () => {
              showTyped = !showTyped;
              focusTyped = showTyped;
              paintQuestion();
            },
          },
          'Gõ'
        )
      );
    }
    wrap.append(h('div', { class: 'quickchat-row' }, ...rowItems));
    wrap.append(h('div', { class: recording ? 'wave on' : 'wave', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'), h('i'), h('i')));

    const interim = h(
      'p',
      { class: 'vi', style: { display: recording && interimText ? '' : 'none' } },
      interimText
    );
    interimEl = interim;
    wrap.append(interim);

    if (showTyped && !speakDone) {
      const input = h('input', {
        type: 'text',
        placeholder: 'Gõ câu trả lời tiếng Anh',
        autocomplete: 'off',
        autocapitalize: 'off',
        value: typed,
        oninput: (e: Event) => {
          typed = (e.target as HTMLInputElement).value;
        },
      });
      wrap.append(
        h(
          'form',
          {
            class: 'answer-form',
            onsubmit: (e: Event) => {
              e.preventDefault();
              submitTyped();
            },
          },
          input,
          h('button', { class: 'btn quiet', type: 'submit' }, 'Gửi')
        )
      );
      if (focusTyped) {
        focusTyped = false;
        queueMicrotask(() => input.focus());
      }
    }

    if (speakResult) {
      const r = speakResult;
      wrap.append(
        h(
          'div',
          { class: 'note-box' },
          h('div', { class: 'heard' }, h('span', { class: 'score' }, `Điểm: ${r.score}`), starsEl(r.stars)),
          h('p', { class: 'say' }, ...r.tokens.map((t) => h('span', { class: `tok ${t.status}` }, t.word))),
          h('p', { class: 'vi' }, `Bạn nói: “${r.transcript}”`)
        )
      );
    }
    if (!speakDone && attempts > 0) {
      wrap.append(h('div', { class: 'note-box focus' }, `Chưa đạt, còn ${SPEAK_MAX_ATTEMPTS - attempts} lượt. Thử lại nhé!`));
    }
    if (speakDone) {
      wrap.append(
        h('div', { class: 'note-box' }, h('span', { class: 'vi' }, 'Câu mẫu:'), h('p', { class: 'big' }, target))
      );
    }
    return wrap;
  }

  function paintQuestion(): void {
    clear(box);
    interimEl = null;
    if (!item) {
      box.append(
        noData
          ? h('div', { class: 'empty' }, 'Chưa có tình huống nào để luyện.')
          : h(
              'div',
              { class: 'card quickchat-start' },
              h('p', { class: 'npc-line' }, 'Một người lạ sẽ hỏi bạn một câu tiếng Anh ngắn. Chọn đáp án hoặc nói câu trả lời ngay.'),
              h('p', { class: 'vi' }, 'Câu được chọn theo cấp Charisma và bỏ qua những câu đã làm.'),
              h('button', { class: 'btn', type: 'button', onclick: () => nextQuestion() }, 'Bắt đầu')
            )
      );
      return;
    }
    const it = item;
    const isSpeak = it.mode === 'speak';
    const canContinue = isSpeak ? speakDone : picked !== null;
    const card = h(
      'div',
      { class: 'card quickchat-card' },
      h(
        'div',
        { class: 'head' },
        h('span', { class: 'who' }, 'Người hỏi: ', h('b', null, passerName)),
        h(
          'span',
          { class: 'chips' },
          h('span', { class: 'pill' }, `CEFR ${it.level}`),
          h('span', { class: 'pill' }, isSpeak ? 'Luyện nói' : 'Chọn đáp án')
        )
      ),
      h('p', { class: 'npc-line' }, `“${it.prompt.en}”`),
      showVi ? h('p', { class: 'vi' }, it.prompt.vi) : null,
      h(
        'div',
        { class: 'quickchat-row' },
        h(
          'button',
          {
            class: 'btn quiet',
            type: 'button',
            onclick: () => Voice.speak(it.prompt.en, { npcId: 'passer', preferredURI: store().state.voiceURI }),
          },
          'Nghe lại'
        ),
        h(
          'button',
          {
            class: 'btn quiet',
            type: 'button',
            onclick: () => {
              showVi = !showVi;
              paintQuestion();
            },
          },
          showVi ? 'Ẩn nghĩa tiếng Việt' : 'Dịch câu hỏi'
        )
      )
    );
    card.append(isSpeak ? buildSpeak(it) : buildChoose());
    if (canContinue) {
      card.append(h('button', { class: 'btn', type: 'button', onclick: () => nextQuestion() }, 'Câu tiếp theo'));
    }
    box.append(card);
  }

  unwatchers.push(watch((s) => s.streetTalkDoneIds, () => paintProgress()));
  unwatchers.push(watch((s) => s.state.charisma.lv, () => paintProgress()));
  paintQuestion();

  return () => {
    disposed = true;
    qToken++;
    for (const t of timers) window.clearTimeout(t);
    for (const u of unwatchers) u();
    if (recording) SpeechEngine.abort();
    recording = false;
    Voice.stop();
    el.remove();
  };
}
