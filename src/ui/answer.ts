/**
 * Nút mic kèm ô gõ thay, dùng chung cho các màn luyện tập (bản thuần của useSpeak + AnswerBar cũ).
 * onAnswer nhận các phương án máy nghe được. Gọi dispose() khi rời màn để huỷ lượt thu đang chạy.
 */
import { SpeechEngine, Voice } from '../audio/audioSystem';
import { h } from './dom';

export interface AnswerBar {
  el: HTMLElement;
  /** Xoá dòng chữ máy đang nghe (gọi khi sang câu mới) */
  reset: () => void;
  dispose: () => void;
}

export function answerBar(opts: { label?: string; onAnswer: (candidates: string[]) => void }): AnswerBar {
  const label = opts.label ?? 'Nói câu của bạn';
  let listening = false;
  let token = 0;

  const btn = h('button', { class: 'btn', type: 'button' }, label);
  const interim = h('p', { class: 'vi', style: { fontStyle: 'italic', display: 'none' } });
  const input = h('input', { type: 'text', placeholder: 'Mic chưa nghe được: gõ câu tiếng Anh vào đây', autocomplete: 'off', autocapitalize: 'off' });
  const form = h(
    'form',
    {
      class: 'answer-form',
      style: { display: 'none' },
      onsubmit: (e: Event) => {
        e.preventDefault();
        const v = input.value.trim();
        if (v) opts.onAnswer([v]);
        input.value = '';
      },
    },
    input,
    h('button', { class: 'btn', type: 'submit', style: { width: 'auto' } }, 'Chấm')
  );

  const paint = () => {
    btn.className = `btn${listening ? ' rec' : ''}`;
    btn.textContent = listening ? 'Dừng và chấm' : label;
    if (!listening) interim.style.display = 'none';
  };

  btn.onclick = async () => {
    if (listening) return SpeechEngine.stop();
    const mine = ++token;
    Voice.stop();
    listening = true;
    interim.textContent = '';
    paint();
    const res = await SpeechEngine.listen({
      onInterim: (t) => {
        if (token !== mine) return;
        interim.textContent = `“${t}”`;
        interim.style.display = t ? '' : 'none';
      },
    });
    if (token !== mine) return;
    listening = false;
    paint();
    if (res.reason === 'aborted') return;
    if (res.reason === 'error' || (!res.transcript && res.reason === 'no-speech')) {
      form.style.display = '';
      return;
    }
    opts.onAnswer(res.alternatives.length > 0 ? res.alternatives : [res.transcript]);
  };

  return {
    el: h('div', { class: 'answer' }, btn, interim, form),
    reset: () => {
      interim.textContent = '';
      interim.style.display = 'none';
    },
    dispose: () => {
      token++;
      if (listening) SpeechEngine.abort();
      listening = false;
    },
  };
}
