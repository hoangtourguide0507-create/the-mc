/**
 * Thẻ "Luyện riêng từ này" trong bài học: chấm từng âm bằng mô hình âm vị (không qua bộ nhận giọng
 * vốn hay đoán thành từ khác), chỉ đúng âm bị thiếu, hướng dẫn luật đuôi -ed/-s và bậc thang nghe
 * (switch → switch-t → switched → trong câu). Đạt thì từ được tính đúng trong câu.
 * Luật ở src/core/hardword.ts.
 */
import './hardword.css';
import { SFX, SpeechEngine, Voice } from '../audio/audioSystem';
import { recordClip } from '../audio/clipRecorder';
import { modelStatus, onModelStatus, transcribePhones } from '../audio/phonemeModel';
import { endingRule, inflectionBases, phoneProblems, wordDrillPass } from '../core/hardword';
import { lookupGloss, phoneTargetIpas } from '../core/notes';
import { bestScore, tokenizePhones, type PhoneScore } from '../core/phonology';
import { gameStore } from '../core/store';
import { PRON_DRILLS } from '../data/pronunciation';
import { clear, h } from './dom';
import { opLabel } from './screens/training/pronunciation';
import { loadGlossary } from './wordpick';

interface Opts {
  word: string;
  /** Câu chứa từ, để nghe trong ngữ cảnh và lưu vào Sổ tay */
  sentence: string;
  sentenceVi?: string;
  scene?: string;
  onPass: () => void;
}

let closeCurrent: (() => void) | null = null;

export function closeWordDrill(): void {
  closeCurrent?.();
}

/** Lấy cụm ngắn quanh từ trong câu (từ đó và một từ sau), để nghe nối âm: "switched to". */
function contextChunk(word: string, sentence: string): string {
  const words = sentence.split(/\s+/);
  const i = words.findIndex((w) => w.toLowerCase().replace(/[^a-z']/g, '') === word);
  if (i < 0) return word;
  return words
    .slice(Math.max(0, i - 1), Math.min(words.length, i + 2))
    .join(' ')
    .replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g, '');
}

export function openWordDrill(o: Opts): void {
  closeCurrent?.();
  const word = o.word.toLowerCase().replace(/[^a-z']/g, '');
  const drill = PRON_DRILLS.find((d) => d.word === word);
  const card = h('div', { class: 'hw-card panel', role: 'dialog', ariaLabel: `Luyện riêng từ ${word}` });
  const veil = h('div', { class: 'wp-veil hw-veil' }, card);
  let disposed = false;
  let busy = false;
  let passed = false;
  let result: { score: PhoneScore; heard: string; pass: boolean } | { speech: string; pass: boolean } | null = null;
  let modelNote = '';
  let ipa = drill?.ipa ?? '';
  let targets: string[][] = drill ? [tokenizePhones(drill.ipa), tokenizePhones(drill.ipaAlt ?? drill.ipa)] : [];

  let offModel = () => {};
  const close = () => {
    if (closeCurrent !== close) return;
    closeCurrent = null;
    disposed = true;
    offModel();
    Voice.stop();
    veil.remove();
  };
  closeCurrent = close;
  veil.addEventListener('click', (e) => {
    if (e.target === veil) close();
  });

  // Từ khó thì ghi luôn vào Sổ tay để ôn sau
  gameStore.getState().saveNote({ text: word, pron: true, auto: true, ctx: o.sentence, ctxVi: o.sentenceVi, npcId: 'coach', scene: o.scene });

  if (!drill) {
    void loadGlossary().then((g) => {
      const gl = lookupGloss(g, word);
      if (gl.ipa) {
        ipa = `/${gl.ipa}/`;
        targets = phoneTargetIpas(gl.ipa).map(tokenizePhones);
      }
      if (!disposed) render();
    });
  }

  const speak = (text: string, slow = false) => void Voice.speak(text, { npcId: 'coach', slow });

  async function record() {
    if (busy) return;
    busy = true;
    result = null;
    Voice.stop();
    render();
    const samples = await recordClip(2500).done;
    if (disposed) return;
    if (!samples) {
      busy = false;
      modelNote = 'Không thu được tiếng. Kiểm tra quyền micro rồi thử lại.';
      return render();
    }
    render();
    let heard = '';
    try {
      if (targets.length === 0) throw new Error('no-ipa');
      heard = await transcribePhones(samples);
    } catch {
      // Không chấm từng âm được: dùng nhận dạng từ như cũ
      if (disposed) return;
      modelNote = 'Máy này chưa chấm từng âm được. Đang dùng nhận dạng từ: đọc lại từ một lần nữa.';
      render();
      const res = await SpeechEngine.listen({ weakMode: true });
      if (disposed) return;
      const all = [res.transcript, ...res.alternatives].join(' ').toLowerCase();
      const pass = new RegExp(`\\b${word}\\b`).test(all);
      finish(pass, { speech: res.transcript || '(không nghe được)', pass });
      return;
    }
    if (disposed) return;
    const score = bestScore(targets, tokenizePhones(heard));
    const pass = wordDrillPass(score);
    finish(pass, { score, heard, pass });
  }

  function finish(pass: boolean, r: NonNullable<typeof result>) {
    busy = false;
    result = r;
    SFX.play(pass ? 'correct' : 'error');
    if (pass && !passed) {
      passed = true;
      o.onPass();
    }
    render();
  }

  function render() {
    if (disposed) return;
    clear(card);
    const phones = targets[0] ?? [];
    // Âm cuối của từ gốc, để giải thích luật đọc đuôi
    const tail = phones.length >= 3 && (phones.at(-2) === 'ɪ' || phones.at(-2) === 'ə') ? phones.at(-3) : phones.at(-2);
    const rule = tail ? endingRule(word, tail) : null;
    const base = inflectionBases(word).find((b) => b.length >= 3 && word.startsWith(b.slice(0, -1)));
    const chunk = contextChunk(word, o.sentence);

    card.append(
      h(
        'div',
        { class: 'wp-head' },
        h('div', null, h('div', { class: 'eyebrow' }, 'Luyện riêng từ này'), h('b', { class: 'wp-text' }, word), ipa ? h('span', { class: 'wp-ipa' }, ipa) : null),
        h('button', { class: 'link', onclick: close }, passed ? 'Quay lại bài' : 'Đóng')
      ),
      h('p', { class: 'vi' }, 'Máy nghe từ trong câu thường đoán thành từ khác khi thiếu một âm nhỏ. Ở đây máy nghe từng âm, nên chỉ ra được bạn thiếu âm nào.')
    );
    if (rule) {
      card.append(h('div', { class: 'note-box' }, h('b', null, `Đuôi ${rule.ending} ở đây đọc ${rule.sound}. `), rule.why));
    }
    if (drill) {
      card.append(
        h('div', { class: 'note-box' }, h('b', null, 'Mẹo: '), drill.tip),
        ...drill.mistakes.slice(0, 1).map((m) => h('p', { class: 'vi' }, `Hay đọc sai thành “${m.wrong}”: ${m.why}`))
      );
    }
    // Bậc thang nghe: từ gốc, từ chậm, từ thường, trong cụm
    const steps: [string, () => void][] = [];
    if (base) steps.push([`1. ${base}`, () => speak(base, true)]);
    steps.push([`${base ? '2' : '1'}. ${word} (chậm)`, () => speak(word, true)]);
    steps.push([`${base ? '3' : '2'}. ${word}`, () => speak(word)]);
    if (chunk.toLowerCase() !== word) steps.push([`${base ? '4' : '3'}. ${chunk}`, () => speak(chunk)]);
    card.append(h('div', { class: 'hw-sub' }, 'Nghe theo bậc rồi đọc theo'), h('div', { class: 'hw-steps' }, ...steps.map(([label, fn]) => h('button', { class: 'btn quiet', onclick: fn }, label))));

    card.append(
      h('button', { class: `btn${busy ? ' rec' : ''}`, disabled: busy, onclick: () => void record() }, busy ? 'Đang nghe… đọc từ một lần' : result ? 'Đọc lại và chấm' : 'Thu âm và chấm (2,5 giây)')
    );
    const status = modelNote || (modelStatus() === 'idle' ? 'Lần đầu phải tải mô hình nghe từng âm (khá nặng, chỉ tải một lần).' : '');
    if (status) card.append(h('p', { class: 'vi' }, status));

    if (result && 'score' in result) {
      const probs = phoneProblems(result.score.ops);
      card.append(
        h(
          'div',
          { class: `pron-verdict ${result.pass ? 'ok' : 'bad'}` },
          result.pass ? 'Đạt! Từ này đã được tính đúng trong câu.' : `Chưa đạt: ${probs.join('; ') || 'đọc chưa rõ'}.`,
          ` Độ khớp ${Math.round(result.score.score * 100)}%.`
        ),
        h('ul', { class: 'pron-ops' }, ...result.score.ops.map((op) => { const l = opLabel(op); return h('li', { class: `pron-op ${l.cls}` }, l.text); })),
        h('p', { class: 'vi' }, 'Mô hình nghe được: ', h('i', null, `/${result.heard || '…'}/`))
      );
    } else if (result) {
      card.append(h('div', { class: `pron-verdict ${result.pass ? 'ok' : 'bad'}` }, result.pass ? 'Đạt! Từ này đã được tính đúng trong câu.' : `Máy nghe thành “${result.speech}”.`));
    }
    card.append(h('p', { class: 'vi' }, 'Từ này đã được ghi vào Sổ tay (Luyện phát âm) để ôn lại các ngày sau.'));
  }

  render();
  // Đăng ký sau khi mọi biến đã khai báo: onModelStatus gọi lại ngay lập tức
  offModel = onModelStatus((st, pct) => {
    modelNote = st === 'loading' ? `Đang tải mô hình nghe từng âm lần đầu… ${pct}%` : '';
    if (!disposed) render();
  });
  document.body.append(veil);
  speak(word, true);
}
