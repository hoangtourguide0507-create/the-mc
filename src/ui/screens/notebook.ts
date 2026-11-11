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

interface Phrase {
  id: string;
  en: string;
  vi: string;
  cat: string;
  /** Cụm mở sẵn từ đầu (không cần mở khoá) */
  fixed: boolean;
}

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
  let activeTab = store().bookInitialTab;
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
      h('p', { class: 'npc-line' }, p.en),
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

  const tabButton = (tab: string, state: GameStore['state']) => {
    const on = activeTab === tab;
    const badge =
      tab === TAB_WEAK && state.weak.length > 0
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
    offs.forEach((off) => off());
    Voice.stop();
    if (practicingKey !== null) SpeechEngine.abort();
    practicingKey = null;
    wrap.remove();
  };
}
