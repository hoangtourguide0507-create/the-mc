/**
 * Hậu trường: hội thoại mở nhiều lượt với AI đóng vai khách hàng, cô dâu, diễn giả...
 * Sau mỗi câu người học nói, AI vừa trả lời trong vai vừa sửa lỗi (nếu có).
 * Logic ở core/backstage.ts, gọi mạng ở core/aiClient.ts, giọng ở audio/liveVoice.ts.
 */
import './backstage.css';
import { SFX } from '../../../audio/audioSystem';
import { liveVoiceBackend, liveVoiceDiag, liveVoiceError, loadLiveVoice, onLiveVoiceStatus, speakLive, stopLiveVoice, type LiveVoiceStatus } from '../../../audio/liveVoice';
import { AiError, chatCompletion, errorMessageVi, getApiKey, looksLikeKey, setApiKey } from '../../../core/aiClient';
import {
  MAX_MY_TURNS,
  buildMessages,
  cleanInput,
  isFinished,
  mockReply,
  myTurnCount,
  parseAiReply,
  summarize,
  type AiReply,
  type ChatTurn,
} from '../../../core/backstage';
import { gameStore } from '../../../core/store';
import { PERSONAS, type Persona } from '../../../data/backstage';
import { answerBar } from '../../answer';
import { clear, h } from '../../dom';

type View = { name: 'list' } | { name: 'key' } | { name: 'chat'; persona: Persona } | { name: 'summary'; persona: Persona };

export function mountBackstage(root: HTMLElement): () => void {
  const box = h('div', { class: 'backstage' });
  root.append(box);
  let disposed = false;
  let mock = false;
  let cleanupView: (() => void) | null = null;
  let voiceStatus: LiveVoiceStatus = 'idle';
  let voicePct = 0;
  const voiceListeners = new Set<() => void>();
  const offVoice = onLiveVoiceStatus((s, p) => {
    voiceStatus = s;
    voicePct = p;
    voiceListeners.forEach((fn) => fn());
  });

  let history: ChatTurn[] = [];
  let goalMet = false;

  const go = (v: View) => {
    cleanupView?.();
    cleanupView = null;
    stopLiveVoice();
    clear(box);
    if (v.name === 'list') renderList();
    else if (v.name === 'key') renderKey();
    else if (v.name === 'chat') renderChat(v.persona);
    else renderSummary(v.persona);
  };

  /* ---------- Nhập khoá ---------- */
  function renderKey() {
    const input = h('input', { type: 'password', placeholder: 'gsk_...', autocomplete: 'off', autocapitalize: 'off', spellcheck: false });
    input.value = getApiKey();
    const err = h('p', { class: 'vi bs-err', style: { display: 'none' } });
    box.append(
      h(
        'section',
        { class: 'panel bs-card' },
        h('div', { class: 'eyebrow' }, 'Bước một lần'),
        h('h2', { class: 'bs-h' }, 'Kết nối bộ não AI (miễn phí)'),
        h(
          'ol',
          { class: 'bs-steps' },
          h('li', null, 'Mở ', h('a', { href: 'https://console.groq.com/keys', target: '_blank', rel: 'noopener' }, 'console.groq.com/keys'), ', đăng nhập bằng Google. Không cần thẻ.'),
          h('li', null, 'Bấm "Create API Key", đặt tên tuỳ ý, sao chép khoá (bắt đầu bằng gsk_).'),
          h('li', null, 'Dán vào ô dưới đây. Khoá chỉ lưu trên máy này, không gửi lên GitHub.')
        ),
        input,
        err,
        h(
          'div',
          { class: 'bs-row' },
          h(
            'button',
            {
              class: 'btn',
              onclick: () => {
                const k = input.value.trim();
                if (!looksLikeKey(k)) {
                  err.textContent = 'Khoá chưa đúng dạng. Khoá Groq bắt đầu bằng gsk_ và khá dài.';
                  err.style.display = '';
                  return;
                }
                setApiKey(k);
                mock = false;
                SFX.play('page');
                go({ name: 'list' });
              },
            },
            'Lưu khoá'
          ),
          getApiKey()
            ? h('button', { class: 'btn quiet', onclick: () => { setApiKey(''); input.value = ''; } }, 'Xoá khoá')
            : null
        ),
        h(
          'button',
          { class: 'link', onclick: () => { mock = true; go({ name: 'list' }); } },
          'Chạy thử không cần khoá (AI giả, chỉ để xem giao diện)'
        )
      )
    );
  }

  /* ---------- Chọn vai ---------- */
  function renderList() {
    if (!getApiKey() && !mock) return renderKey();
    box.append(
      h(
        'section',
        { class: 'panel bs-card' },
        h('div', { class: 'eyebrow' }, 'Hậu trường'),
        h('p', { class: 'bs-lead' }, 'Nói chuyện tự do với khách hàng, cô dâu, diễn giả. Không có câu mẫu: bạn tự nghĩ câu. Sau mỗi câu, AI sửa lỗi cho bạn.'),
        h(
          'div',
          { class: 'bs-row' },
          mock ? h('span', { class: 'pill warn' }, 'Đang chạy AI giả') : h('span', { class: 'pill' }, 'Groq · miễn phí'),
          h('button', { class: 'link', onclick: () => go({ name: 'key' }) }, mock ? 'Nhập khoá thật' : 'Đổi khoá')
        )
      )
    );
    for (const p of PERSONAS) {
      box.append(
        h(
          'button',
          { class: 'panel bs-persona', onclick: () => { SFX.unlock(); SFX.play('page'); go({ name: 'chat', persona: p }); } },
          h('span', { class: 'bs-persona-top' }, h('span', { class: 'pill' }, p.kind), h('span', { class: 'bs-cefr' }, p.cefr)),
          h('span', { class: 'bs-persona-name' }, p.name),
          h('span', { class: 'vi' }, p.roleVi),
          h('span', { class: 'bs-goal' }, 'Mục tiêu: ', p.goalVi)
        )
      );
    }
  }

  /* ---------- Hội thoại ---------- */
  function renderChat(p: Persona) {
    history = [{ who: 'npc', text: p.opener }];
    goalMet = false;
    let busy = false;
    let token = 0;

    const turnsPill = h('span', { class: 'pill' });
    const voiceLine = h('p', { class: 'vi bs-voice' });
    const log = h('div', { class: 'bs-log', role: 'log', ariaLive: 'polite' });
    const thinking = h('p', { class: 'vi bs-thinking', style: { display: 'none' } }, `${p.name} đang nghĩ…`);
    const errBox = h('div', { class: 'note-box bs-errbox', style: { display: 'none' } });
    const typeInput = h('input', { type: 'text', placeholder: 'Gõ câu tiếng Anh', autocomplete: 'off', autocapitalize: 'off' });
    const typeForm = h(
      'form',
      {
        class: 'answer-form bs-type',
        style: { display: 'none' },
        onsubmit: (e: Event) => {
          e.preventDefault();
          const v = typeInput.value.trim();
          if (v) send(v);
          typeInput.value = '';
        },
      },
      typeInput,
      h('button', { class: 'btn', type: 'submit', style: { width: 'auto' } }, 'Gửi')
    );

    const bar = answerBar({ label: 'Chạm để nói', onAnswer: (c) => send(c[0] ?? '') });
    // Bấm mic thì dừng giọng NPC đang đọc
    bar.el.addEventListener('click', () => { SFX.unlock(); stopLiveVoice(); }, true);

    const retryVoice = h('button', { class: 'btn quiet bs-mini', style: { display: 'none' }, onclick: () => void loadLiveVoice().catch(() => {}) }, 'Thử tải lại giọng');
    const paintVoice = () => {
      const b = liveVoiceBackend();
      voiceLine.textContent =
        voiceStatus === 'loading'
          ? `Đang tải giọng nhân vật lần đầu: ${voicePct}% (${b?.device === 'webgpu' ? (b.dtype === 'fp16' ? 'khoảng 165 MB, chạy bằng GPU' : 'khoảng 330 MB, chạy bằng GPU') : 'khoảng 90 MB'}). Nên dùng Wi-Fi. Chữ vẫn hiện để bạn đọc trước.`
          : voiceStatus === 'error'
            ? `Không tải được giọng (${liveVoiceError() || 'lỗi không rõ'}). Bạn vẫn luyện được bằng chữ.`
            : liveVoiceDiag()
              ? `Giọng: ${liveVoiceDiag()}`
              : '';
      voiceLine.style.display = voiceLine.textContent ? '' : 'none';
      retryVoice.style.display = voiceStatus === 'error' ? '' : 'none';
    };
    voiceListeners.add(paintVoice);
    paintVoice();

    const paintTurns = () => {
      turnsPill.textContent = `Lượt ${Math.min(myTurnCount(history) + 1, MAX_MY_TURNS)}/${MAX_MY_TURNS}`;
    };

    const npcBubble = (text: string, vi?: string) => {
      let shown = voiceStatus !== 'ready';
      const body = h('p', { class: 'bs-text' }, text);
      const viEl = vi ? h('p', { class: 'vi', style: { display: 'none' } }, vi) : null;
      const showBtn = h('button', { class: 'btn quiet bs-mini' }, 'Hiện chữ');
      const paint = () => {
        body.style.display = shown ? '' : 'none';
        showBtn.style.display = shown ? 'none' : '';
      };
      showBtn.onclick = () => { shown = true; paint(); };
      paint();
      const el = h(
        'div',
        { class: 'bs-bubble npc' },
        h('div', { class: 'bs-who' }, p.name),
        body,
        viEl,
        h(
          'div',
          { class: 'bs-row' },
          h('button', { class: 'btn quiet bs-mini', onclick: () => { SFX.unlock(); void speakLive(text, p.voiceRole); } }, 'Nghe lại'),
          showBtn,
          viEl ? h('button', { class: 'btn quiet bs-mini', onclick: () => { viEl.style.display = ''; shown = true; paint(); } }, 'Dịch') : null
        )
      );
      const gen = h('span', { class: 'bs-gen' }, 'Đang tạo giọng…');
      el.querySelector('.bs-who')?.append(gen);
      log.append(el);
      reveal();
      void speakLive(text, p.voiceRole, () => gen.remove()).then((ok) => {
        gen.remove();
        if (!ok && !shown) { shown = true; paint(); }
      });
    };

    const myBubble = (turn: ChatTurn) => {
      const c = turn.correction;
      const el = h(
        'div',
        { class: 'bs-bubble me' },
        h('p', { class: 'bs-text' }, turn.text),
        c
          ? h(
              'div',
              { class: 'bs-fix' },
              h('div', { class: 'bs-fix-label' }, 'Nói tự nhiên hơn'),
              h('p', { class: 'bs-fix-text' }, c.fixed),
              c.noteVi ? h('p', { class: 'vi' }, c.noteVi) : null,
              h('button', { class: 'btn quiet bs-mini', onclick: () => { SFX.unlock(); void speakLive(c.fixed, 'coach'); } }, 'Nghe câu sửa')
            )
          : h('div', { class: 'bs-ok' }, '✓ Câu ổn')
      );
      log.append(el);
      reveal();
    };

    let dock: HTMLElement | null = null;
    /** Kéo tới câu mới nhất mà vẫn thấy nút mic */
    const reveal = () => requestAnimationFrame(() => (dock?.isConnected && dock.style.display !== 'none' ? dock : log.lastElementChild)?.scrollIntoView({ block: 'end', behavior: 'smooth' }));

    const setBusy = (b: boolean) => {
      busy = b;
      thinking.style.display = b ? '' : 'none';
      bar.el.style.opacity = b ? '0.5' : '';
      bar.el.style.pointerEvents = b ? 'none' : '';
    };

    async function send(raw: string) {
      const text = cleanInput(raw);
      if (!text || busy || disposed) return;
      const mine = ++token;
      errBox.style.display = 'none';
      bar.reset();
      setBusy(true);
      let reply: AiReply;
      try {
        if (mock) {
          await new Promise((r) => setTimeout(r, 500));
          reply = mockReply(p, history, text);
        } else {
          const raw = await chatCompletion(getApiKey(), buildMessages(p, history, text));
          reply = parseAiReply(raw, text);
        }
      } catch (e) {
        if (mine !== token || disposed) return;
        setBusy(false);
        const kind = e instanceof AiError ? e.kind : 'server';
        errBox.textContent = errorMessageVi(kind);
        errBox.style.display = '';
        if (kind === 'bad-key' || kind === 'no-key') errBox.append(h('button', { class: 'link', onclick: () => go({ name: 'key' }) }, 'Nhập lại khoá'));
        return;
      }
      if (mine !== token || disposed) return;
      setBusy(false);
      const me: ChatTurn = { who: 'me', text, correction: reply.correction };
      history.push(me);
      myBubble(me);
      SFX.play(reply.correction ? 'pop' : 'correct');
      history.push({ who: 'npc', text: reply.reply });
      goalMet = goalMet || reply.goalMet;
      npcBubble(reply.reply);
      paintTurns();
      if (isFinished(history, goalMet)) {
        if (dock) dock.style.display = 'none';
        bar.dispose();
        log.append(h('button', { class: 'btn bs-end', onclick: () => go({ name: 'summary', persona: p }) }, 'Xem tổng kết'));
        reveal();
      }
    }

    const typeToggle = h('button', { class: 'link', onclick: () => { typeForm.style.display = typeForm.style.display ? '' : 'none'; if (!typeForm.style.display) typeInput.focus(); } }, 'Gõ thay vì nói');

    box.append(
      h(
        'div',
        { class: 'panel bs-chat-head' },
        h(
          'div',
          { class: 'bs-row bs-between' },
          h('button', { class: 'btn quiet', onclick: () => go({ name: 'list' }) }, 'Rời'),
          h('div', { class: 'bs-title' }, h('strong', null, p.name), h('span', { class: 'vi' }, p.roleVi)),
          turnsPill
        ),
        h('div', { class: 'bs-goal' }, 'Mục tiêu: ', p.goalVi),
        voiceLine,
        retryVoice
      ),
      log,
      (dock = h(
        'div',
        { class: 'panel bs-dock' },
        thinking,
        errBox,
        bar.el,
        h(
          'div',
          { class: 'bs-row bs-between' },
          typeToggle,
          h('button', { class: 'link', onclick: () => go({ name: 'summary', persona: p }) }, 'Kết thúc sớm')
        ),
        typeForm
      ))
    );
    paintTurns();
    npcBubble(p.opener, p.openerVi);
    // Bắt đầu tải giọng ngay khi vào hội thoại (lần đầu ~90 MB)
    void loadLiveVoice().catch(() => {});

    cleanupView = () => {
      token++;
      voiceListeners.delete(paintVoice);
      bar.dispose();
    };
  }

  /* ---------- Tổng kết ---------- */
  function renderSummary(p: Persona) {
    const s = summarize(history, goalMet);
    if (s.xp > 0 && !mock) gameStore.getState().gain({ xp: s.xp });
    box.append(
      h(
        'section',
        { class: 'panel bs-card' },
        h('div', { class: 'eyebrow' }, 'Tổng kết hậu trường'),
        h('h2', { class: 'bs-h' }, s.goalMet ? `Xong việc với ${p.name}!` : `Buổi nói chuyện với ${p.name}`),
        h(
          'div',
          { class: 'bs-stats' },
          h('div', null, h('strong', null, String(s.myTurns)), h('span', { class: 'vi' }, 'câu đã nói')),
          h('div', null, h('strong', null, `${s.cleanPct}%`), h('span', { class: 'vi' }, 'câu không cần sửa')),
          h('div', null, h('strong', null, mock ? '0' : `+${s.xp}`), h('span', { class: 'vi' }, 'XP'))
        ),
        h('p', { class: 'vi' }, s.goalMet ? 'Bạn đã đạt mục tiêu của cuộc nói chuyện.' : `Chưa đạt mục tiêu: ${p.goalVi}`)
      )
    );
    if (s.corrections.length) {
      box.append(
        h(
          'section',
          { class: 'panel bs-card' },
          h('div', { class: 'eyebrow' }, 'Câu nên nói lại'),
          ...s.corrections.map((c) =>
            h(
              'div',
              { class: 'bs-fix' },
              h('p', { class: 'bs-orig' }, c.original),
              h('p', { class: 'bs-fix-text' }, c.fixed),
              c.noteVi ? h('p', { class: 'vi' }, c.noteVi) : null,
              h('button', { class: 'btn quiet bs-mini', onclick: () => { SFX.unlock(); void speakLive(c.fixed, 'coach'); } }, 'Nghe')
            )
          )
        )
      );
    }
    box.append(
      h(
        'div',
        { class: 'bs-row' },
        h('button', { class: 'btn', onclick: () => { SFX.unlock(); go({ name: 'chat', persona: p }); } }, 'Nói lại vai này'),
        h('button', { class: 'btn quiet', onclick: () => go({ name: 'list' }) }, 'Chọn vai khác')
      )
    );
  }

  go({ name: 'list' });

  return () => {
    disposed = true;
    cleanupView?.();
    stopLiveVoice();
    offVoice();
    box.remove();
  };
}
