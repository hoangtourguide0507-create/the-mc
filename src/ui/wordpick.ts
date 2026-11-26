/**
 * Chạm từ để ghi chú. Dùng chung cho màn bài học, Trò chuyện và Sổ tay.
 * - Chạm một từ: mở thẻ từ (phiên âm, nghĩa, nghe thường/chậm, hai nhãn "Từ mới" và "Luyện phát âm").
 * - Nhấn giữ một từ rồi kéo sang từ khác: chọn cả cụm. Trong thẻ cũng có nút nới cụm sang trái/phải,
 *   để vẫn chọn được cụm khi thao tác kéo không thuận tay.
 * Từ đã ghi được gạch chân nhẹ (.noted) ở mọi câu dùng fillPickable/bindPick.
 */
import './wordpick.css';
import { askPanel } from './askAi';
import { Voice } from '../audio/audioSystem';
import { lookupGloss, noteKey, notedMask, phraseOf, splitWords, type Glossary, type PickToken } from '../core/notes';
import { gameStore } from '../core/store';
import { clear, h } from './dom';

export interface PickCtx {
  /** Câu gốc đầy đủ và bản dịch, lưu kèm mục ghi chú. */
  sentence: string;
  vi?: string;
  npcId?: string;
  speaker?: 'emma' | 'liam';
  scene?: string;
}

let glossary: Glossary | null = null;
let glossaryLoading: Promise<Glossary> | null = null;

/** Bảng từ (IPA, nghĩa) tải lười ở lần chạm đầu tiên. */
export function loadGlossary(): Promise<Glossary> {
  if (glossary) return Promise.resolve(glossary);
  glossaryLoading ??= import('../data/glossary.json?raw')
    .then((m) => (glossary = JSON.parse(m.default) as Glossary))
    .catch(() => (glossary = {}));
  return glossaryLoading;
}

const book = () => gameStore.getState().state.notes ?? {};

/** Gạch chân các từ đã có trong sổ. Phần tử từ mang data-wp là vị trí trong `tokens`. */
export function markNoted(container: HTMLElement, tokens: PickToken[]): void {
  const mask = notedMask(tokens, book());
  container.querySelectorAll<HTMLElement>('[data-wp]').forEach((el) => {
    el.classList.toggle('noted', Boolean(mask[Number(el.dataset.wp)]));
  });
}

/**
 * Gắn thao tác chạm và nhấn-giữ-kéo cho một khối có các phần tử từ (data-wp = vị trí).
 * `tokens` song song với các phần tử đó.
 */
export function bindPick(container: HTMLElement, tokens: PickToken[], ctx: PickCtx): void {
  container.classList.add('wp');
  markNoted(container, tokens);

  let anchor = -1;
  let last = -1;
  let selecting = false;
  let timer = 0;
  let startX = 0;
  let startY = 0;
  let swallowClick = false;

  const indexAt = (x: number, y: number): number => {
    const el = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>('[data-wp]');
    return el && container.contains(el) ? Number(el.dataset.wp) : -1;
  };
  const indexOf = (target: EventTarget | null): number => {
    const el = (target as HTMLElement | null)?.closest?.<HTMLElement>('[data-wp]');
    return el && container.contains(el) && tokens[Number(el.dataset.wp)]?.word ? Number(el.dataset.wp) : -1;
  };
  const paint = () => {
    const a = Math.min(anchor, last);
    const b = Math.max(anchor, last);
    container.querySelectorAll<HTMLElement>('[data-wp]').forEach((el) => {
      const i = Number(el.dataset.wp);
      el.classList.toggle('sel', selecting && i >= a && i <= b);
    });
  };
  const reset = () => {
    window.clearTimeout(timer);
    selecting = false;
    anchor = last = -1;
    paint();
  };
  const open = (from: number, to: number) => {
    openWordSheet({ tokens, from, to, ctx, onChange: () => markNoted(container, tokens) });
  };

  container.addEventListener(
    'touchstart',
    (e) => {
      const i = indexOf(e.target);
      if (i < 0 || e.touches.length !== 1) return;
      anchor = last = i;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        selecting = true;
        navigator.vibrate?.(12);
        paint();
      }, 380);
    },
    { passive: true }
  );
  container.addEventListener(
    'touchmove',
    (e) => {
      const t = e.touches[0];
      if (!selecting) {
        // Ngón tay trượt trước khi đủ thời gian nhấn giữ: đó là cuộn trang
        if (Math.abs(t.clientX - startX) > 10 || Math.abs(t.clientY - startY) > 10) window.clearTimeout(timer);
        return;
      }
      e.preventDefault();
      const i = indexAt(t.clientX, t.clientY);
      if (i >= 0 && i !== last) {
        last = i;
        paint();
      }
    },
    { passive: false }
  );
  container.addEventListener('touchend', (e) => {
    window.clearTimeout(timer);
    if (!selecting) return;
    e.preventDefault();
    swallowClick = true;
    window.setTimeout(() => (swallowClick = false), 400);
    const [a, b] = [anchor, last];
    reset();
    open(a, b);
  });
  container.addEventListener('touchcancel', reset);
  container.addEventListener('contextmenu', (e) => {
    if (indexOf(e.target) >= 0) e.preventDefault();
  });

  // Chuột (máy tính): nhấn rồi rê qua các từ để chọn cụm
  container.addEventListener('mousedown', (e) => {
    const i = indexOf(e.target);
    if (i < 0 || e.button !== 0) return;
    anchor = last = i;
    const move = (ev: MouseEvent) => {
      const j = indexAt(ev.clientX, ev.clientY);
      if (j >= 0 && j !== last) {
        last = j;
        selecting = true;
        paint();
      }
    };
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      if (!selecting) return;
      swallowClick = true;
      window.setTimeout(() => (swallowClick = false), 100);
      const [a, b] = [anchor, last];
      reset();
      open(a, b);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });

  container.addEventListener('click', (e) => {
    const i = indexOf(e.target);
    if (i < 0) return;
    e.preventDefault();
    e.stopPropagation();
    if (swallowClick) return;
    open(i, i);
  });
}

/** Đổ một câu vào khối dưới dạng các từ chạm được. `wordClass` thêm lớp riêng cho từng từ (ví dụ 'w'). */
export function fillPickable(container: HTMLElement, text: string, ctx: Omit<PickCtx, 'sentence'> & { sentence?: string }, wordClass = ''): void {
  const tokens = splitWords(text);
  tokens.forEach((t, i) => {
    if (i > 0) container.append(' ');
    container.append(h('span', { class: `wp-w${wordClass ? ` ${wordClass}` : ''}`, dataset: { wp: String(i) } }, t.raw));
  });
  bindPick(container, tokens, { ...ctx, sentence: ctx.sentence ?? text });
}

/* ---------- Thẻ từ ---------- */

interface SheetOpts {
  tokens: PickToken[];
  from: number;
  to: number;
  ctx: PickCtx;
  onChange?: () => void;
}

let closeCurrent: (() => void) | null = null;

export function closeWordSheet(): void {
  closeCurrent?.();
}

export function openWordSheet(o: SheetOpts): void {
  closeCurrent?.();
  const store = () => gameStore.getState();
  let from = Math.min(o.from, o.to);
  let to = Math.max(o.from, o.to);
  // Bỏ các mảnh không có chữ ở hai đầu
  while (from < to && !o.tokens[from].word) from += 1;
  while (to > from && !o.tokens[to].word) to -= 1;

  const card = h('div', { class: 'wp-card panel', role: 'dialog', ariaLabel: 'Ghi chú từ' });
  const veil = h('div', { class: 'wp-veil' }, card);
  const text = () => phraseOf(o.tokens, from, to);
  const key = () => noteKey(text());
  const note = () => store().state.notes?.[key()];
  const speak = (slow: boolean) => void Voice.speak(text(), { npcId: 'coach', slow });
  // Khung hỏi AI: tạo một lần, giữ lịch sử hỏi khi thẻ vẽ lại; đổi cụm thì bắt đầu cuộc hỏi mới
  let askOpen = false;
  const asker = askPanel(() => ({
    phrase: text(),
    sentence: o.ctx.sentence,
    sentenceVi: o.ctx.vi,
    note: { text: text(), ctx: o.ctx.sentence, ctxVi: o.ctx.vi, npcId: o.ctx.npcId, speaker: o.ctx.speaker, scene: o.ctx.scene },
  }));

  const close = () => {
    if (closeCurrent !== close) return;
    closeCurrent = null;
    document.removeEventListener('keydown', onKey);
    veil.remove();
    o.onChange?.();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };
  veil.addEventListener('click', (e) => {
    if (e.target === veil) close();
  });
  document.addEventListener('keydown', onKey);
  closeCurrent = close;

  const toggle = (tag: 'vocab' | 'pron') => {
    const n = note();
    const input = { text: text(), ctx: o.ctx.sentence, ctxVi: o.ctx.vi, npcId: o.ctx.npcId, speaker: o.ctx.speaker, scene: o.ctx.scene };
    store().saveNote({ ...input, vocab: n?.vocab ?? false, pron: n?.pron ?? false, [tag]: !(n?.[tag] ?? false) });
    render();
    o.onChange?.();
  };

  function render() {
    const t = text();
    const n = note();
    const g = glossary ? lookupGloss(glossary, t) : null;
    const many = to > from;
    clear(card);
    card.append(
      h(
        'div',
        { class: 'wp-head' },
        h('div', null, h('b', { class: 'wp-text' }, t), g?.ipa ? h('span', { class: 'wp-ipa' }, `/${g.ipa}/`) : null),
        h('button', { class: 'link', ariaLabel: 'Đóng thẻ từ', onclick: close }, 'Đóng')
      ),
      g?.vi
        ? h('p', { class: 'wp-vi' }, g.lemma ? `${g.vi} (dạng của “${g.lemma}”)` : g.vi)
        : h('p', { class: 'wp-vi dim' }, !glossary ? 'Đang tải nghĩa…' : many ? 'Cụm từ: xem nghĩa trong câu gốc bên dưới.' : 'Chưa có nghĩa soạn sẵn: xem câu gốc bên dưới, hoặc tự ghi nghĩa.'),
      h(
        'div',
        { class: 'wp-row' },
        h('button', { class: 'btn quiet', onclick: () => speak(false) }, 'Nghe'),
        h('button', { class: 'btn quiet', onclick: () => speak(true) }, 'Chậm'),
        h('button', { class: 'btn quiet', onclick: () => void Voice.speak(o.ctx.sentence, { npcId: o.ctx.npcId, speaker: o.ctx.speaker }) }, 'Nghe cả câu')
      ),
      h(
        'div',
        { class: 'wp-row' },
        h('button', { class: `btn wp-tag${n?.vocab ? ' on' : ''}`, ariaPressed: String(Boolean(n?.vocab)), onclick: () => toggle('vocab') }, n?.vocab ? '✓ Từ mới' : '+ Từ mới'),
        h('button', { class: `btn wp-tag${n?.pron ? ' on' : ''}`, ariaPressed: String(Boolean(n?.pron)), onclick: () => toggle('pron') }, n?.pron ? '✓ Luyện phát âm' : '+ Luyện phát âm')
      ),
      h(
        'div',
        { class: 'wp-row wp-grow' },
        h('span', { class: 'wp-label' }, 'Chọn cả cụm:'),
        h('button', { class: 'btn quiet', disabled: from <= 0, ariaLabel: 'Thêm từ đứng trước', onclick: () => { from -= 1; render(); } }, '← thêm'),
        h('button', { class: 'btn quiet', disabled: !many, ariaLabel: 'Bớt một từ', onclick: () => { to -= 1; render(); } }, 'bớt'),
        h('button', { class: 'btn quiet', disabled: to >= o.tokens.length - 1, ariaLabel: 'Thêm từ đứng sau', onclick: () => { to += 1; render(); } }, 'thêm →')
      ),
      h(
        'button',
        {
          class: `btn quiet wp-ask${askOpen ? ' on' : ''}`,
          ariaExpanded: String(askOpen),
          onclick: () => {
            askOpen = !askOpen;
            render();
            if (askOpen) asker.reveal();
          },
        },
        askOpen ? 'Ẩn hỏi AI' : 'Hỏi AI: vì sao nói vậy?'
      )
    );
    if (askOpen) {
      asker.refresh();
      card.append(asker.el);
    }
    if (n) {
      const memo = h('input', { class: 'wp-memo', type: 'text', value: n.memo ?? '', placeholder: 'Ghi chú riêng của bạn (nghĩa, mẹo nhớ…)', autocomplete: 'off' });
      memo.addEventListener('change', () => store().memoNote(key(), memo.value));
      card.append(memo);
    }
    card.append(
      h('div', { class: 'wp-ctx' }, h('span', { class: 'wp-label' }, 'Câu gốc'), h('p', null, o.ctx.sentence), o.ctx.vi ? h('p', { class: 'vi' }, o.ctx.vi) : null)
    );
  }

  render();
  document.body.append(veil);
  if (!glossary) void loadGlossary().then(() => closeCurrent === close && render());
  // Chạm một từ lẻ thì đọc luôn từ đó, như nút từ trước đây
  if (from === to) speak(false);
}
