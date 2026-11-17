/**
 * Sổ tay mẫu câu và từ yếu (bản HTML thuần của PhrasebookSheet cũ).
 * Giữ nguyên logic: cụm mẫu mở khoá theo `state.learned`, từ yếu xếp theo lịch ôn SRS (core/srs),
 * đọc từ bằng mic so với từ gốc (wordSim), nút "Chuẩn" ghi nhận đọc đúng, nghe mẫu 1x và 0.8x.
 * Khác bản cũ: không có khung hộp thoại, không có cờ mở/đóng trong store (chỉ đọc bookInitialTab),
 * duyệt cả mọi tình huống trong SCENES (kể cả gói sự kiện), tab tạo theo thể loại có thực.
 */
import './notebook.css';
import { SFX, SpeechEngine, Voice } from '../../audio/audioSystem';
import { wordSim } from '../../core/evaluator';
import { boxOf, dueCount, dueOf, isDue, SRS_MAX_BOX, sortForReview } from '../../core/srs';
import { gameStore, type GameStore } from '../../core/store';
import { SCENES, STARTER } from '../../data/content';
import { watch } from '../../engine/watch';
import type { WeakWord } from '../../types/game';
import { clear, h } from '../dom';
import { recordClip } from '../../audio/clipRecorder';
import { transcribePhones } from '../../audio/phonemeModel';
import { bestScore, tokenizePhones } from '../../core/phonology';
import {
  evaluateNoteSay,
  evaluateNoteUse,
  exportNotes,
  isNoteDue,
  lookupGloss,
  NOTE_PHONE_PASS,
  phoneTargetIpas,
  realDay,
  sortNotes,
  splitWords,
  type Glossary,
  type WordNote,
} from '../../core/notes';
import { closeWordSheet, fillPickable, loadGlossary, openWordSheet } from '../wordpick';
import { grammarErrors } from '../../core/grammar';

interface Phrase {
  id: string;
  en: string;
  vi: string;
  cat: string;
  /** Cụm mở sẵn từ đầu (không cần mở khoá) */
  fixed: boolean;
}

const TAB_NOTES = 'Từ của tôi';
const TAB_WEAK = 'Cần luyện';
const TAB_ALL = 'Tất cả';
/** Thứ tự ưu tiên các thể loại gốc; thể loại sự kiện đứng sau theo thứ tự trong SCENES. */
const PREFERRED_CATS = ['Cơ bản', 'Daily', 'Backstage', 'Đám cưới', 'VIP Gala', 'Talkshow'];

function catLabel(cat: string): string {
  return cat === 'Wedding' ? 'Đám cưới' : cat;
}

/** Toàn bộ cụm mẫu: phần mở đầu và mọi lượt trong mọi tình huống của SCENES. */
function buildPhrases(): Phrase[] {
  const list: Phrase[] = STARTER.map((s) => ({ id: s.id, en: s.en, vi: s.vi, cat: s.cat, fixed: true }));
  for (const sc of Object.values(SCENES)) {
    sc.turns.forEach((t, idx) => {
      const en = t.cue || t.sample || t.options?.find((o) => o.ok)?.t || '';
      if (!en) return;
      list.push({
        id: `${sc.id}-${idx}`,
        en,
        vi: t.cueVi || t.taskVi || '',
        cat: catLabel(sc.cat),
        fixed: false,
      });
    });
  }
  return list;
}

function buildTabs(phrases: Phrase[]): string[] {
  const cats = Array.from(new Set(phrases.map((p) => p.cat)));
  return [
    TAB_NOTES,
    TAB_WEAK,
    TAB_ALL,
    ...PREFERRED_CATS.filter((c) => cats.includes(c)),
    ...cats.filter((c) => !PREFERRED_CATS.includes(c)),
  ];
}

export function mountNotebook(root: HTMLElement): () => void {
  const store = () => gameStore.getState();
  const phrases = buildPhrases();
  const tabs = buildTabs(phrases);

  let disposed = false;
  // Có mục trong sổ từ đến hạn ôn thì mở thẳng tab đó
  let activeTab = Object.values(store().state.notes ?? {}).some((n) => isNoteDue(n, realDay())) ? TAB_NOTES : store().bookInitialTab;
  let practicingKey: string | null = null;

  const wrap = h('div', { class: 'notebook' });
  root.append(wrap);

  const speakPhrase = (text: string, slow: boolean) => {
    void Voice.speak(text, { slow, preferredURI: store().state.voiceURI });
  };

  const practice = async (key: string) => {
    practicingKey = key;
    render();
    const res = await SpeechEngine.listen({ weakMode: true });
    practicingKey = null;
    render();

    if (!res.transcript) {
      store().toast('Chưa nghe rõ từ. Bạn có thể bấm nút Chuẩn bên cạnh để ôn nhanh!', 'warn');
      return;
    }

    const spokenClean = res.transcript.toLowerCase().replace(/[^a-z]/g, '');
    const { sim, phonetic } = wordSim(key, spokenClean);
    if (sim >= 0.85 || phonetic) {
      store().resolveWeakWord(key, 'ok');
    } else if (sim >= 0.65) {
      store().resolveWeakWord(key, 'near');
    } else {
      SFX.play('error');
      store().toast(`Máy nghe thành "${res.transcript}". Hãy nghe mẫu và đọc lại nhé!`, 'warn');
    }
  };

  const weakCard = (w: WeakWord, day: number, state: GameStore['state']) => {
    const practicing = practicingKey === w.key;
    const dueText = isDue(w, day) ? 'ôn hôm nay' : `ôn sau ${dueOf(w, day) - day} ngày`;
    const isBad = w.status === 'bad';
    return h(
      'article',
      { class: 'card notebook-item' },
      h(
        'div',
        { class: 'head' },
        h('strong', { class: 'notebook-word' }, w.word),
        h('span', { class: isBad ? 'pill warn' : 'pill' }, isBad ? 'Cần sửa' : 'Gần đúng'),
        h('span', { class: 'pill' }, `Sai ${w.misses} lần · +${isBad ? 10 : 6} XP`),
        h('span', { class: 'pill' }, `Hộp ${boxOf(w)}/${SRS_MAX_BOX} · ${dueText}`)
      ),
      h('p', { class: 'vi' }, `Ngữ cảnh: “${w.ctx}”`),
      h(
        'div',
        { class: 'chips' },
        h(
          'button',
          {
            class: 'btn quiet',
            type: 'button',
            onclick: () => {
              void Voice.speak(w.word, { preferredURI: store().state.voiceURI });
            },
          },
          'Nghe'
        ),
        h(
          'button',
          {
            class: practicing ? 'btn quiet rec' : 'btn quiet notebook-main',
            type: 'button',
            onclick: () => {
              void practice(w.key);
            },
          },
          practicing ? 'Đang nghe...' : 'Đọc từ'
        ),
        h(
          'button',
          {
            class: 'btn quiet',
            type: 'button',
            title: 'Đánh dấu là đã đọc chuẩn từ này',
            onclick: () => store().resolveWeakWord(w.key, 'ok'),
          },
          'Chuẩn'
        )
      )
    );
  };

  const phraseCard = (p: Phrase, unlocked: boolean) => {
    if (!unlocked) {
      return h(
        'article',
        { class: 'card notebook-locked' },
        h('div', { class: 'head' }, h('span', { class: 'pill' }, p.cat)),
        h('p', { class: 'vi' }, 'Hoàn thành lượt diễn tương ứng trên sân khấu để mở khoá cụm từ này')
      );
    }
    return h(
      'article',
      { class: 'card' },
      h('div', { class: 'head' }, h('span', { class: 'pill' }, p.cat)),
      (() => { const el = h('p', { class: 'npc-line' }); fillPickable(el, p.en, { vi: p.vi, npcId: 'coach' }); return el; })(),
      p.vi ? h('p', { class: 'vi' }, p.vi) : null,
      h(
        'div',
        { class: 'chips' },
        h(
          'button',
          { class: 'btn quiet', type: 'button', onclick: () => speakPhrase(p.en, false) },
          'Nghe 1×'
        ),
        h(
          'button',
          { class: 'btn quiet', type: 'button', onclick: () => speakPhrase(p.en, true) },
          'Nghe chậm 0.8×'
        )
      )
    );
  };

  /* ---------- Từ của tôi: từ và cụm người học tự ghi ---------- */
  let glossary: Glossary | null = null;
  void loadGlossary().then((g) => {
    glossary = g;
    if (activeTab === TAB_NOTES) render();
  });
  /** Phản hồi của lần ôn gần nhất, hiện ngay trong thẻ của mục đó. */
  let noteMsg: { key: string; text: string; ok: boolean } | null = null;

  const reviewUse = async (n: WordNote) => {
    practicingKey = `use:${n.key}`;
    render();
    const res = await SpeechEngine.listen({});
    practicingKey = null;
    if (disposed) return;
    const tries = [res.transcript, ...res.alternatives].filter(Boolean);
    if (tries.length === 0) {
      noteMsg = { key: n.key, ok: false, text: 'Chưa nghe rõ. Hãy thử lại ở nơi yên tĩnh hơn.' };
      return render();
    }
    const best = tries.map((t) => ({ t, r: evaluateNoteUse(n.text, t) })).sort((a, b) => Number(b.r.ok) - Number(a.r.ok) || Number(b.r.hasNote) - Number(a.r.hasNote))[0];
    if (best.r.ok) {
      store().reviewNote(n.key, true);
      SFX.play('correct');
      noteMsg = { key: n.key, ok: true, text: `Đạt. Máy nghe: “${best.t}”` };
    } else {
      SFX.play('error');
      noteMsg = {
        key: n.key,
        ok: false,
        text: best.r.hasNote && best.r.fullSentence
          ? `Có từ rồi nhưng câu còn sai ngữ pháp: ${grammarErrors(best.r.grammar).map((g) => `“${g.wrong}” → “${g.fix}”`).join('; ')}. Máy nghe: “${best.t}”`
          : best.r.hasNote
          ? `Câu còn ngắn quá. Hãy nói trọn một câu của MC có “${n.text}”. Máy nghe: “${best.t}”`
          : `Chưa nghe thấy “${n.text}” trong câu. Máy nghe: “${best.t}”`,
      };
    }
    render();
  };

  const reviewSay = async (n: WordNote) => {
    practicingKey = `say:${n.key}`;
    render();
    const res = await SpeechEngine.listen({ weakMode: true });
    practicingKey = null;
    if (disposed) return;
    const tries = [res.transcript, ...res.alternatives].filter(Boolean);
    if (tries.length === 0) noteMsg = { key: n.key, ok: false, text: 'Chưa nghe rõ. Nghe mẫu rồi đọc lại nhé.' };
    else if (evaluateNoteSay(n.text, tries)) {
      store().reviewNote(n.key, true);
      SFX.play('correct');
      noteMsg = { key: n.key, ok: true, text: 'Máy nghe ra đúng từ này.' };
    } else {
      SFX.play('error');
      noteMsg = { key: n.key, ok: false, text: `Máy nghe thành “${tries[0]}”. Nghe chậm rồi đọc lại.` };
    }
    render();
  };

  /** Chấm từng âm bằng mô hình nhận âm vị (chỉ cho từ lẻ có phiên âm). */
  const reviewPhones = async (n: WordNote, ipa: string) => {
    practicingKey = `ph:${n.key}`;
    noteMsg = { key: n.key, ok: true, text: 'Đang thu 2,5 giây: đọc từ này một lần.' };
    render();
    const samples = await recordClip(2500).done;
    if (disposed) return;
    if (!samples) {
      practicingKey = null;
      noteMsg = { key: n.key, ok: false, text: 'Không thu được tiếng. Kiểm tra quyền micro.' };
      return render();
    }
    noteMsg = { key: n.key, ok: true, text: 'Đang chấm từng âm (lần đầu phải tải mô hình, có thể mất một lúc)…' };
    render();
    let heardIpa = '';
    try {
      heardIpa = await transcribePhones(samples);
    } catch {
      heardIpa = '';
    }
    practicingKey = null;
    if (disposed) return;
    if (!heardIpa.trim()) {
      noteMsg = { key: n.key, ok: false, text: 'Không chấm được từng âm trên máy này. Hãy dùng nút “Đọc từ”.' };
      return render();
    }
    const best = bestScore(phoneTargetIpas(ipa).map(tokenizePhones), tokenizePhones(heardIpa));
    const off = best.ops.filter((o) => o.kind === 'missing' || o.kind === 'wrong').map((o) => (o.kind === 'missing' ? `thiếu /${o.target}/` : `/${o.target}/ nghe thành /${o.heard}/`));
    const pass = best.score >= NOTE_PHONE_PASS;
    if (pass) store().reviewNote(n.key, true);
    SFX.play(pass ? 'correct' : 'error');
    noteMsg = {
      key: n.key,
      ok: pass,
      text: `${pass ? 'Đạt' : 'Chưa đạt'} ${Math.round(best.score * 100)}%. Máy nghe: /${heardIpa.trim()}/${off.length ? `. Cần sửa: ${off.slice(0, 3).join('; ')}` : ''}`,
    };
    render();
  };

  const exportList = () => {
    const csv = '\uFEFF' + exportNotes(store().state.notes ?? {}, glossary);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = h('a', { href: url, download: 'tu-cua-toi.csv' });
    document.body.append(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    void navigator.clipboard?.writeText(csv).then(
      () => store().toast('Đã tải file tu-cua-toi.csv và chép danh sách vào bộ nhớ tạm.', 'success'),
      () => store().toast('Đã tải file tu-cua-toi.csv.', 'success')
    );
  };

  const noteCard = (n: WordNote, day: number) => {
    const g = glossary ? lookupGloss(glossary, n.text) : null;
    const single = !n.key.includes(' ');
    const busy = practicingKey !== null;
    const due = isNoteDue(n, day);
    const memo = h('input', { class: 'wp-memo', type: 'text', value: n.memo ?? '', placeholder: 'Ghi chú riêng (nghĩa, mẹo nhớ…)', autocomplete: 'off' });
    memo.addEventListener('change', () => store().memoNote(n.key, memo.value));
    const tokens = splitWords(n.text);
    const ctx = { sentence: n.ctx || n.text, vi: n.ctxVi, npcId: n.npcId, speaker: n.speaker, scene: n.scene };
    return h(
      'article',
      { class: 'card notebook-item' },
      h(
        'div',
        { class: 'head' },
        h('strong', { class: 'notebook-word' }, n.text),
        g?.ipa ? h('span', { class: 'wp-ipa' }, `/${g.ipa}/`) : null,
        n.vocab ? h('span', { class: 'pill' }, 'Từ mới') : null,
        n.pron ? h('span', { class: 'pill' }, 'Phát âm') : null,
        h('span', { class: due ? 'pill warn' : 'pill' }, `Hộp ${n.box}/5 · ${due ? 'ôn hôm nay' : `ôn sau ${n.due - day} ngày`}`)
      ),
      g?.vi ? h('p', { class: 'notebook-meaning' }, g.lemma ? `${g.vi} (dạng của “${g.lemma}”)` : g.vi) : null,
      n.ctx ? h('p', { class: 'vi' }, `Câu gốc: “${n.ctx}”${n.ctxVi ? ` (${n.ctxVi})` : ''}`) : null,
      memo,
      h(
        'div',
        { class: 'chips' },
        h('button', { class: 'btn quiet', type: 'button', onclick: () => void Voice.speak(n.text, { npcId: 'coach' }) }, 'Nghe'),
        h('button', { class: 'btn quiet', type: 'button', onclick: () => void Voice.speak(n.text, { npcId: 'coach', slow: true }) }, 'Chậm'),
        n.ctx ? h('button', { class: 'btn quiet', type: 'button', onclick: () => void Voice.speak(n.ctx, { npcId: n.npcId, speaker: n.speaker }) }, 'Nghe câu gốc') : null
      ),
      h(
        'div',
        { class: 'chips' },
        n.vocab
          ? h('button', { class: practicingKey === `use:${n.key}` ? 'btn quiet rec' : 'btn quiet notebook-main', type: 'button', disabled: busy, onclick: () => void reviewUse(n) }, practicingKey === `use:${n.key}` ? 'Đang nghe…' : 'Tự đặt một câu MC có từ này')
          : null,
        n.pron
          ? h('button', { class: practicingKey === `say:${n.key}` ? 'btn quiet rec' : 'btn quiet notebook-main', type: 'button', disabled: busy, onclick: () => void reviewSay(n) }, practicingKey === `say:${n.key}` ? 'Đang nghe…' : 'Đọc từ')
          : null,
        n.pron && single && g?.ipa
          ? h('button', { class: practicingKey === `ph:${n.key}` ? 'btn quiet rec' : 'btn quiet', type: 'button', disabled: busy, onclick: () => void reviewPhones(n, g.ipa) }, 'Chấm từng âm')
          : null
      ),
      noteMsg?.key === n.key ? h('div', { class: `note-box${noteMsg.ok ? '' : ' focus'}` }, noteMsg.text) : null,
      h(
        'div',
        { class: 'chips' },
        h('button', { class: 'link', type: 'button', onclick: () => openWordSheet({ tokens, from: 0, to: tokens.length - 1, ctx, onChange: render }) }, 'Đổi nhãn'),
        h('button', { class: 'link', type: 'button', disabled: busy, onclick: () => { store().reviewNote(n.key, false); noteMsg = { key: n.key, ok: false, text: 'Đã đưa về hộp 1, mai ôn lại.' }; render(); } }, 'Chưa thuộc'),
        h('button', { class: 'link', type: 'button', onclick: () => { store().dropNote(n.key); render(); } }, 'Xoá')
      )
    );
  };

  const notesBody = (state: GameStore['state']): Node[] => {
    const book = state.notes ?? {};
    const day = realDay();
    const list = sortNotes(book, day);
    if (list.length === 0) {
      return [
        h(
          'div',
          { class: 'empty' },
          h('p', { class: 'npc-line' }, 'Chưa có từ nào trong sổ.'),
          h('p', { class: 'vi' }, 'Trong bài học hoặc Trò chuyện, chạm vào một từ để ghi lại. Nhấn giữ một từ rồi kéo sang từ khác để ghi cả cụm. Chọn “Từ mới” hoặc “Luyện phát âm”.')
        ),
      ];
    }
    const due = list.filter((n) => isNoteDue(n, day)).length;
    return [
      h(
        'div',
        { class: 'note-box' },
        `Hôm nay cần ôn: ${due} mục · Tổng ${list.length} mục. Ôn đạt thì mục lên hộp và giãn dần: 1, 2, 4, 8, 16 ngày.`,
        h('button', { class: 'btn quiet', type: 'button', onclick: exportList }, 'Xuất danh sách (Excel, Anki)')
      ),
      ...list.map((n) => noteCard(n, day)),
    ];
  };

  const tabButton = (tab: string, state: GameStore['state']) => {
    const on = activeTab === tab;
    const noteDue = tab === TAB_NOTES ? Object.values(state.notes ?? {}).filter((n) => isNoteDue(n, realDay())).length : 0;
    const badge =
      noteDue > 0
        ? h('span', { class: 'pill warn' }, String(noteDue))
        : tab === TAB_WEAK && state.weak.length > 0
        ? h('span', { class: 'pill warn' }, String(dueCount(state.weak, state.day) || state.weak.length))
        : null;
    return h(
      'button',
      {
        class: 'filter',
        type: 'button',
        'aria-pressed': String(on),
        onclick: () => {
          SFX.play('tap');
          activeTab = tab;
          render();
        },
      },
      tab,
      badge
    );
  };

  const bodyNodes = (state: GameStore['state']): Node[] => {
    if (activeTab === TAB_NOTES) return notesBody(state);
    if (activeTab === TAB_WEAK) {
      if (state.weak.length === 0) {
        return [
          h(
            'div',
            { class: 'empty' },
            h('p', { class: 'npc-line' }, 'Tuyệt vời! Bạn không có từ yếu nào tồn đọng!'),
            h('p', { class: 'vi' }, 'Các từ phát âm chưa chuẩn trên sân khấu sẽ tự động lưu vào đây để bạn luyện riêng.')
          ),
        ];
      }
      return [
        h('div', { class: 'note-box' }, `Hôm nay cần ôn: ${dueCount(state.weak, state.day)} từ · Tổng ${state.weak.length} từ`),
        ...sortForReview(state.weak, state.day).map((w) => weakCard(w, state.day, state)),
      ];
    }
    const learned = state.learned;
    return phrases
      .filter((p) => activeTab === TAB_ALL || p.cat === activeTab)
      .map((p) => phraseCard(p, p.fixed || learned.includes(p.id)));
  };

  const render = () => {
    if (disposed) return;
    const state = store().state;
    clear(wrap);
    wrap.append(
      h('p', { class: 'vi' }, `Đã làm chủ ${state.stats.mastered} từ yếu · Mở khoá ${state.learned.length + 5} cụm từ`),
      h('div', { class: 'filters' }, ...tabs.map((t) => tabButton(t, state))),
      h('div', { class: 'notebook-list' }, ...bodyNodes(state))
    );
  };

  const offs = [
    watch((s) => s.state.weak, () => render(), false),
    watch((s) => s.state.notes, () => { if (practicingKey === null && !(document.activeElement instanceof HTMLInputElement)) render(); }, false),
    watch((s) => s.state.learned, () => render(), false),
    watch((s) => s.state.day, () => render(), false),
    watch((s) => s.state.stats.mastered, () => render(), false),
    watch(
      (s) => s.bookInitialTab,
      (tab) => {
        activeTab = tab;
        render();
      },
      false
    ),
  ];

  render();

  return () => {
    disposed = true;
    closeWordSheet();
    offs.forEach((off) => off());
    Voice.stop();
    if (practicingKey !== null) SpeechEngine.abort();
    practicingKey = null;
    wrap.remove();
  };
}
