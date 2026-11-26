/**
 * Khung "Hỏi AI: vì sao nói vậy?" trong thẻ từ. AI (Groq, gói miễn phí, khoá do người học tự dán)
 * giải thích bằng tiếng Việt vì sao câu dùng từ/cụm đó, cách nói khác đúng hay sai.
 * Luật dựng câu hỏi và tách câu trả lời ở src/core/ask.ts; gọi mạng ở src/core/aiClient.ts.
 */
import './askAi.css';
import { AiError, chatText, errorMessageVi, getApiKey, looksLikeKey, setApiKey } from '../core/aiClient';
import { askCacheKey, buildAskMessages, fillQuestion, parseAnswer, QUICK_ASKS, readCache, writeCache, type AskContext, type QaTurn } from '../core/ask';
import { noteKey, type NoteInput } from '../core/notes';
import { gameStore } from '../core/store';
import { clear, h } from './dom';

export interface AskSource extends AskContext {
  note: NoteInput;
}

/** Hiện câu trả lời của AI: chỉ dựng đoạn, gạch đầu dòng và chữ đậm, không chèn HTML. */
export function qaAnswer(text: string): HTMLElement {
  const box = h('div', { class: 'ask-a' });
  let list: HTMLElement | null = null;
  for (const b of parseAnswer(text)) {
    const node = h(b.kind === 'li' ? 'li' : 'p', null, ...b.parts.map((p) => (p.bold ? h('b', { lang: 'en' }, p.text) : p.text)));
    if (b.kind === 'li') {
      if (!list) box.append((list = h('ul')));
      list.append(node);
    } else {
      list = null;
      box.append(node);
    }
  }
  return box;
}

/** Tạo khung hỏi đáp; `source()` trả về cụm và câu đang chọn (đổi cụm thì bắt đầu cuộc hỏi mới). */
export function askPanel(source: () => AskSource): { el: HTMLElement; refresh: () => void; reveal: () => void } {
  const el = h('div', { class: 'ask' });
  const input = h('input', { class: 'ask-input', type: 'text', placeholder: 'Gõ câu hỏi, ví dụ: sao không nói “we change plan”?', autocomplete: 'off', enterKeyHint: 'send' }) as HTMLInputElement;
  let thread: (QaTurn & { model?: string; saved?: boolean })[] = [];
  let forPhrase = '';
  let busy = false;
  let error = '';
  let errorKind = '';
  let editKey = !getApiKey();

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void ask(input.value);
    }
  });

  const store = () => gameStore.getState();
  const savedQa = (src: AskSource) => store().state.notes?.[noteKey(src.phrase)]?.qa ?? [];

  async function ask(raw: string) {
    const q = raw.trim();
    if (!q || busy || q.includes('…')) {
      if (q.includes('…')) {
        error = 'Thay dấu “…” bằng cách nói bạn đang nghĩ tới.';
        render();
      }
      return;
    }
    const src = source();
    error = '';
    const cacheKey = thread.length === 0 ? askCacheKey(src, q) : '';
    const cached = cacheKey ? readCache()[cacheKey] : undefined;
    if (cached) {
      thread = [...thread, { q, a: cached }];
      input.value = '';
      return render();
    }
    busy = true;
    thread = [...thread, { q, a: '' }];
    input.value = '';
    render();
    try {
      const res = await chatText(getApiKey(), buildAskMessages(src, thread.slice(0, -1), q));
      thread = thread.map((t, i) => (i === thread.length - 1 ? { ...t, a: res.text, model: res.model } : t));
      if (cacheKey) writeCache(cacheKey, res.text);
    } catch (e) {
      thread = thread.slice(0, -1);
      input.value = q;
      errorKind = e instanceof AiError ? e.kind : 'server';
      error = e instanceof AiError ? e.message : errorMessageVi('server');
      if (errorKind === 'bad-key' || errorKind === 'no-key') editKey = true;
    }
    busy = false;
    render();
  }

  function keyForm() {
    const keyIn = h('input', { class: 'ask-input', type: 'password', placeholder: 'gsk_…', autocomplete: 'off', value: getApiKey() }) as HTMLInputElement;
    const err = h('p', { class: 'ask-err', role: 'alert' });
    return h(
      'div',
      { class: 'ask-key' },
      h('p', null, h('b', null, 'Cần khoá Groq (miễn phí) để hỏi AI.'), ' Làm một lần trên máy này:'),
      h(
        'ol',
        null,
        h('li', null, 'Mở ', h('a', { href: 'https://console.groq.com/keys', target: '_blank', rel: 'noopener' }, 'console.groq.com/keys'), ', đăng nhập bằng Google. Không cần thẻ.'),
        h('li', null, 'Bấm "Create API Key", sao chép khoá (bắt đầu bằng gsk_).'),
        h('li', null, 'Dán vào ô dưới. Khoá chỉ lưu trên máy này, không gửi lên GitHub.')
      ),
      keyIn,
      err,
      h(
        'div',
        { class: 'wp-row' },
        h(
          'button',
          {
            class: 'btn',
            onclick: () => {
              const k = keyIn.value.trim();
              if (!looksLikeKey(k)) {
                err.textContent = 'Khoá chưa đúng dạng. Khoá Groq bắt đầu bằng gsk_ và khá dài.';
                return;
              }
              setApiKey(k);
              editKey = false;
              error = '';
              render();
            },
          },
          'Lưu khoá'
        ),
        getApiKey() ? h('button', { class: 'btn quiet', onclick: () => { editKey = false; render(); } }, 'Huỷ') : null
      ),
      getApiKey() ? h('button', { class: 'link', onclick: () => { setApiKey(''); keyIn.value = ''; render(); } }, 'Xoá khoá khỏi máy này') : null
    );
  }

  const answer = qaAnswer;

  function render() {
    const src = source();
    // Đổi cụm đang chọn: bắt đầu cuộc hỏi mới
    if (src.phrase !== forPhrase) {
      forPhrase = src.phrase;
      thread = [];
      error = '';
    }
    clear(el);
    el.append(h('div', { class: 'ask-title' }, h('span', null, `Hỏi AI về “${src.phrase}”`), getApiKey() && !editKey ? h('button', { class: 'link', onclick: () => { editKey = true; render(); } }, 'Khoá AI') : null));
    if (editKey || !getApiKey()) {
      el.append(keyForm());
      return;
    }
    const old = savedQa(src).filter((s) => !thread.some((t) => t.q === s.q));
    if (old.length && thread.length === 0) {
      el.append(h('p', { class: 'ask-note' }, 'Đã hỏi trước đây:'), ...old.map((t) => h('div', { class: 'ask-turn' }, h('p', { class: 'ask-q' }, t.q), answer(t.a))));
    }
    for (const t of thread) {
      el.append(
        h(
          'div',
          { class: 'ask-turn' },
          h('p', { class: 'ask-q' }, t.q),
          t.a
            ? answer(t.a)
            : h('p', { class: 'ask-wait', role: 'status' }, 'AI đang trả lời…'),
          t.a
            ? h(
                'button',
                {
                  class: `btn quiet ask-save${t.saved ? ' on' : ''}`,
                  disabled: t.saved,
                  onclick: () => {
                    store().qaNote(src.note, t.q, t.a);
                    t.saved = true;
                    store().toast(`Đã lưu vào Sổ tay, mục “${src.phrase}”.`, 'success', 2200);
                    render();
                  },
                },
                t.saved ? '✓ Đã lưu vào Sổ tay' : 'Lưu vào Sổ tay'
              )
            : null
        )
      );
    }
    if (error) el.append(h('p', { class: 'ask-err', role: 'alert' }, error));
    el.append(
      h(
        'div',
        { class: 'ask-chips' },
        ...QUICK_ASKS.map((qa) =>
          h(
            'button',
            {
              class: 'chip',
              disabled: busy,
              onclick: () => {
                if (qa.q) return void ask(fillQuestion(qa.q, src.phrase));
                input.value = qa.fill ?? '';
                input.focus();
                // Đặt con trỏ vào chỗ "…" để gõ ngay
                const at = input.value.indexOf('…');
                if (at >= 0) input.setSelectionRange(at, at + 1);
              },
            },
            qa.label
          )
        )
      ),
      h('div', { class: 'ask-row' }, input, h('button', { class: 'btn', disabled: busy, onclick: () => void ask(input.value) }, busy ? '…' : 'Hỏi')),
      h('p', { class: 'ask-note' }, `${thread.length ? 'Hỏi tiếp được, AI nhớ các câu trước. ' : ''}AI có thể nhầm; câu quan trọng nên kiểm tra lại.`)
    );
  }

  render();
  return {
    el,
    refresh: render,
    reveal: () => requestAnimationFrame(() => el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })),
  };
}
