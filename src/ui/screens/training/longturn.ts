/**
 * Nói dài: độc thoại 60-90 giây theo dàn ý 6 ý (mở màn, giới thiệu diễn giả, bế mạc…).
 * Người học tự nói; máy dò từng ý, đếm số từ và tốc độ (core/longturn.ts). Không chấm đúng từng chữ.
 * Luồng: danh sách bài → chuẩn bị (dàn ý, gợi ý cụm) → nói (đồng hồ, ý sáng lên khi nói tới) → kết quả.
 * Thu tiếng bằng SpeechEngine.listen({ long: true }): không tự dừng khi ngắt nghỉ. Nếu trình duyệt
 * tự kết thúc phiên nghe giữa chừng thì hiện nút "Nói tiếp" và nối phần mới vào phần đã nói.
 */
import './talk.css';
import './longturn.css';
import { SFX, SpeechEngine, Voice } from '../../../audio/audioSystem';
import { coverIdeas, LONG_FULL_WORDS, LONG_MAX_SEC, LONG_MIN_SEC, longAdvice, modelOf, scoreLong, type LongScore, type LongTask } from '../../../core/longturn';
import { gameStore } from '../../../core/store';
import { LONG_TASKS } from '../../../data/longturns';
import { clear, h } from '../../dom';
import { closeWordSheet, fillPickable } from '../../wordpick';

/** Giới hạn một lượt nói, giây. Thanh thời gian chia theo mốc này. */
const HARD_MAX = 120;

function starsEl(n: number): HTMLElement {
  return h('span', { class: 'stars', ariaLabel: `${n} trên 3 sao` }, '★'.repeat(n), h('span', { class: 'off' }, '★'.repeat(3 - n)));
}

const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

export function mountLongTurn(root: HTMLElement): () => void {
  const store = () => gameStore.getState();
  const box = h('div', { class: 'lt' });
  root.append(box);
  let disposed = false;
  let cleanupView: (() => void) | null = null;

  const go = (view: () => void) => {
    cleanupView?.();
    cleanupView = null;
    Voice.stop();
    closeWordSheet();
    clear(box);
    view();
    box.scrollIntoView({ block: 'start' });
  };

  /* ---------- Danh sách bài ---------- */
  function renderList() {
    const done = store().state.speak?.long ?? {};
    box.append(
      h(
        'section',
        { class: 'panel tk-card' },
        h('div', { class: 'eyebrow' }, 'Nói dài'),
        h('p', { class: 'tk-lead' }, `Tự nói một mạch ${LONG_MIN_SEC}-${LONG_MAX_SEC} giây như trên sân khấu thật. Không có câu để đọc: bạn chỉ có dàn ý. Máy chấm theo ý, số từ và tốc độ nói.`)
      )
    );
    for (const t of LONG_TASKS) {
      const d = done[t.id];
      box.append(
        h(
          'button',
          {
            class: 'panel tk-persona',
            onclick: () => {
              SFX.unlock();
              SFX.play('page');
              go(() => renderPrep(t));
            },
          },
          h('div', { class: 'tk-top' }, h('span', { class: 'pill' }, t.kind), h('span', { class: 'tk-meta' }, `${t.cefr} · `, starsEl(d?.stars ?? 0), d?.blind ? ' · không nhìn dàn ý' : '')),
          h('span', { class: 'tk-name' }, t.title),
          h('span', { class: 'tk-goal' }, t.brief)
        )
      );
    }
  }

  const head = (t: LongTask) =>
    h(
      'section',
      { class: 'panel tk-head' },
      h(
        'div',
        { class: 'tk-row tk-between' },
        h('div', { class: 'tk-title' }, h('strong', null, t.title), h('span', { class: 'vi' }, `${t.kind} · ${t.cefr}`)),
        h('button', { class: 'link', onclick: () => go(renderList) }, 'Rời')
      )
    );

  /* ---------- Chuẩn bị ---------- */
  function renderPrep(t: LongTask, blind = false) {
    let showKeys = false;
    const list = h('ol', { class: 'lt-ideas' });
    const paint = () => {
      clear(list);
      for (const idea of t.ideas) list.append(h('li', { class: 'lt-idea' }, h('div', null, h('b', null, idea.label), showKeys ? h('span', { class: 'lt-key' }, `“${idea.key}…”`) : null)));
    };
    paint();
    const blindBox = h('input', { type: 'checkbox', checked: blind });
    const keyBtn = h(
      'button',
      {
        class: 'btn quiet',
        onclick: () => {
          showKeys = !showKeys;
          keyBtn.textContent = showKeys ? 'Ẩn cụm gợi ý' : 'Bí từ? Xem cụm gợi ý';
          paint();
        },
      },
      'Bí từ? Xem cụm gợi ý'
    );
    box.append(
      head(t),
      h(
        'section',
        { class: 'panel tk-card' },
        h('div', { class: 'eyebrow' }, 'Tình huống'),
        h('p', { class: 'lt-brief' }, t.brief),
        h('div', { class: 'eyebrow' }, 'Dàn ý: nói đủ 6 ý, mỗi ý khoảng hai câu'),
        list,
        keyBtn,
        h('div', { class: 'note-box' }, t.tip),
        h('label', { class: 'lt-toggle' }, blindBox, 'Ẩn dàn ý trong lúc nói (khó hơn, +10 XP)'),
        h('button', { class: 'btn', onclick: () => { SFX.unlock(); go(() => renderSpeak(t, blindBox.checked)); } }, `Bắt đầu nói (${LONG_MIN_SEC}-${LONG_MAX_SEC} giây)`),
        h('button', { class: 'link', onclick: () => go(() => renderTyped(t, blindBox.checked)) }, 'Mic không dùng được? Gõ bài nói')
      )
    );
  }

  /* ---------- Gõ thay mic ---------- */
  function renderTyped(t: LongTask, blind: boolean) {
    const area = h('textarea', { placeholder: 'Gõ bài nói tiếng Anh của bạn vào đây', autocapitalize: 'sentences' });
    box.append(
      head(t),
      h(
        'section',
        { class: 'panel tk-card' },
        h('p', { class: 'lt-brief' }, t.brief),
        area,
        h('p', { class: 'vi' }, 'Gõ thì không đo được tốc độ nói, nhưng vẫn chấm đủ ý và độ dài.'),
        h('button', { class: 'btn', onclick: () => { if (area.value.trim()) finish(t, [area.value], 0, blind); } }, 'Chấm bài'),
        h('button', { class: 'btn quiet', onclick: () => go(() => renderPrep(t, blind)) }, 'Quay lại')
      )
    );
  }

  /* ---------- Nói ---------- */
  function renderSpeak(t: LongTask, blind: boolean) {
    const segments: string[] = [];
    let alternatives: string[] = [];
    let spoken = 0; // giây đã nói ở các đoạn trước
    let segStart = 0; // mốc bắt đầu đoạn đang nói (0 = đang không nói)
    let userStopped = false;
    let token = 0;
    let ticker = 0;
    let interim = '';

    const elapsed = () => spoken + (segStart ? (Date.now() - segStart) / 1000 : 0);
    /** Chỉ hiện đoạn vừa nói (khoảng 22 từ cuối) để màn hình không dài ra trong lúc nói. */
    const tail = (parts: string[]) => {
      const words = parts.join(' ').trim().split(/\s+/).filter(Boolean);
      return words.length ? `“${words.length > 22 ? '… ' : ''}${words.slice(-22).join(' ')}”` : '';
    };
    const timeEl = h('span', { class: 'lt-time' }, '0:00', h('small', null, `mục tiêu ${LONG_MIN_SEC}-${LONG_MAX_SEC} giây`));
    const fill = h('i');
    const liveEl = h('p', { class: 'lt-live' }, 'Đang mở mic…');
    const list = h('ol', { class: 'lt-ideas' });
    const actions = h('div', { class: 'tk-row' });

    const paintIdeas = () => {
      if (blind) return;
      const covered = coverIdeas(t.ideas, [...segments, interim].join(' '));
      clear(list);
      t.ideas.forEach((idea, k) => list.append(h('li', { class: `lt-idea${covered[k] ? ' hit' : ''}` }, h('div', null, h('b', null, idea.label)))));
    };
    const paintClock = () => {
      const sec = elapsed();
      timeEl.firstChild!.textContent = clock(sec);
      fill.style.width = `${Math.min(100, (sec / HARD_MAX) * 100)}%`;
      fill.className = sec >= LONG_MIN_SEC ? 'ok' : '';
    };
    const paintActions = (mode: 'rec' | 'paused') => {
      clear(actions);
      if (mode === 'rec') {
        actions.append(h('button', { class: 'btn rec', onclick: stop }, 'Dừng và chấm'));
      } else {
        actions.append(
          h('button', { class: 'btn', onclick: () => void listen() }, 'Nói tiếp'),
          h('button', { class: 'btn quiet', onclick: grade }, 'Chấm luôn')
        );
      }
    };

    function stop() {
      userStopped = true;
      SpeechEngine.stop();
    }
    function grade() {
      const whole = segments.join(' ').trim();
      // Chỉ một đoạn thì dùng luôn các phương án máy nghe được của đoạn đó
      const candidates = segments.length === 1 && alternatives.length > 0 ? alternatives : [whole];
      finish(t, candidates, Math.round(elapsed()), blind);
    }

    async function listen() {
      const mine = ++token;
      Voice.stop();
      userStopped = false;
      interim = '';
      liveEl.textContent = tail(segments) || 'Đang mở mic…';
      paintActions('rec');
      const left = Math.max(5, HARD_MAX - elapsed());
      const res = await SpeechEngine.listen({
        long: true,
        maxMs: left * 1000,
        onStart: () => {
          if (mine !== token) return;
          segStart = Date.now();
          if (!segments.length) liveEl.textContent = 'Mic đã mở. Bắt đầu nói…';
        },
        onInterim: (text) => {
          if (mine !== token) return;
          interim = text;
          liveEl.textContent = tail([...segments, text]);
          paintIdeas();
        },
      });
      if (mine !== token || disposed) return;
      if (segStart) spoken += (Date.now() - segStart) / 1000;
      segStart = 0;
      interim = '';
      if (res.reason === 'aborted') return;
      if (res.transcript) {
        segments.push(res.transcript);
        alternatives = res.alternatives;
      }
      paintIdeas();
      paintClock();
      if (segments.length === 0) {
        // Chưa nghe được gì: mic lỗi hoặc không được cấp quyền
        liveEl.textContent = res.reason === 'error' ? 'Mic không dùng được trên trình duyệt này. Bạn có thể gõ bài nói.' : 'Chưa nghe thấy tiếng. Thử lại, hoặc gõ bài nói.';
        clear(actions);
        actions.append(
          h('button', { class: 'btn', onclick: () => void listen() }, 'Thử lại'),
          h('button', { class: 'btn quiet', onclick: () => go(() => renderTyped(t, blind)) }, 'Gõ bài nói')
        );
        return;
      }
      if (userStopped || res.reason === 'max-time' || elapsed() >= HARD_MAX - 1) return grade();
      // Trình duyệt tự đóng phiên nghe: cho người học nói tiếp phần còn lại
      liveEl.textContent = `Mic vừa tự ngắt. ${tail(segments)}`;
      SFX.play('ting');
      paintActions('paused');
    }

    box.append(
      head(t),
      h(
        'section',
        { class: 'panel tk-card' },
        h('div', { class: 'lt-clock' }, timeEl, h('div', { class: 'lt-bar' }, fill)),
        // Nút dừng nằm ngay dưới đồng hồ để luôn trong tầm tay, không bị chữ đẩy xuống
        actions,
        liveEl,
        blind ? h('p', { class: 'vi' }, 'Dàn ý đang ẩn. Nhớ đủ 6 ý: bạn sẽ thấy kết quả sau khi dừng.') : list
      )
    );
    paintIdeas();
    ticker = window.setInterval(paintClock, 250);
    cleanupView = () => {
      token += 1;
      window.clearInterval(ticker);
      SpeechEngine.abort();
    };
    void listen();
  }

  /* ---------- Kết quả ---------- */
  function finish(t: LongTask, candidates: string[], seconds: number, blind: boolean) {
    const s = scoreLong(t, candidates, seconds);
    const xp = store().recordLong(t.id, s.stars, s.wpm, blind);
    SFX.play(s.stars >= 2 ? 'star' : 'page');
    go(() => renderResult(t, s, seconds, xp, blind));
  }

  function renderResult(t: LongTask, s: LongScore, seconds: number, xp: number, blind: boolean) {
    let playing = 0;
    let showAll = s.stars === 0;
    const list = h('ol', { class: 'lt-ideas' });
    const paint = () => {
      clear(list);
      t.ideas.forEach((idea, k) => {
        const hit = s.covered[k];
        const body = h('div', null, h('b', null, idea.label));
        if (!hit || showAll) {
          const say = h('p', { class: 'lt-say' });
          fillPickable(say, idea.say, { npcId: 'coach', scene: `long:${t.id}` });
          body.append(say, h('button', { class: 'btn quiet tk-mini', onclick: () => { playing += 1; void Voice.speak(idea.say, { npcId: 'coach' }); } }, 'Nghe ý này'));
        }
        list.append(h('li', { class: `lt-idea ${hit ? 'hit' : 'miss'}` }, body));
      });
    };
    paint();
    const playModel = async () => {
      const mine = ++playing;
      for (const idea of t.ideas) {
        if (mine !== playing || disposed) return;
        await Voice.speak(idea.say, { npcId: 'coach' });
      }
    };
    const advice = longAdvice(t, s);
    const paceText = s.wpm === null ? '—' : `${s.wpm}`;
    const title = s.stars === 3 ? 'Trọn vẹn như trên sân khấu!' : s.stars === 2 ? 'Gần đủ rồi' : s.stars === 1 ? 'Mới được một phần' : 'Chưa thành bài';
    const allBtn = h(
      'button',
      {
        class: 'btn quiet',
        onclick: () => {
          showAll = !showAll;
          allBtn.textContent = showAll ? 'Chỉ hiện ý còn thiếu' : 'Xem câu mẫu của mọi ý';
          paint();
        },
      },
      showAll ? 'Chỉ hiện ý còn thiếu' : 'Xem câu mẫu của mọi ý'
    );
    box.append(
      head(t),
      h(
        'section',
        { class: 'panel tk-card' },
        h('div', { class: 'eyebrow' }, 'Kết quả nói dài'),
        h('h2', { class: 'tk-h' }, title),
        h('div', { class: 'tk-bigstars' }, starsEl(s.stars)),
        h(
          'div',
          { class: 'lt-stats' },
          h('div', null, h('strong', null, `${s.hit}/${t.ideas.length}`), h('span', null, 'ý đã nói')),
          h('div', null, h('strong', null, String(s.words)), h('span', null, `từ (cần ${LONG_FULL_WORDS})`)),
          h('div', null, h('strong', null, paceText), h('span', null, 'từ mỗi phút'))
        ),
        h('p', { class: 'vi' }, [seconds > 0 ? `Thời gian nói: ${clock(seconds)}.` : '', xp > 0 ? `+${xp} XP.` : '', blind ? 'Không nhìn dàn ý.' : '', 'Tốc độ dễ nghe trên sân khấu là 100-165 từ mỗi phút.'].filter(Boolean).join(' ')),
        advice.length ? h('div', { class: 'note-box focus' }, 'Lần sau:', h('ul', { class: 'lt-advice' }, ...advice.map((a) => h('li', null, a)))) : h('div', { class: 'note-box' }, 'Đủ ý, đủ dài, tốc độ tốt. Thử lại với dàn ý ẩn, hoặc chọn bài khác.'),
        h('div', { class: 'eyebrow' }, 'Dàn ý và câu mẫu (chạm một từ để ghi vào sổ)'),
        list,
        allBtn,
        h('button', { class: 'btn quiet', onclick: () => void playModel() }, `Nghe cả bài mẫu (${modelOf(t).split(/\s+/).length} từ)`),
        s.transcript ? h('p', { class: 'lt-heard' }, 'Máy nghe được: ', h('i', null, `“${s.transcript}”`)) : null
      ),
      h(
        'div',
        { class: 'tk-row' },
        h('button', { class: 'btn', onclick: () => { SFX.unlock(); go(() => renderPrep(t, blind || s.stars === 3)); } }, 'Nói lại'),
        h('button', { class: 'btn quiet', onclick: () => go(renderList) }, 'Chọn bài khác')
      )
    );
    cleanupView = () => {
      playing += 1;
    };
  }

  go(renderList);

  return () => {
    disposed = true;
    cleanupView?.();
    Voice.stop();
    closeWordSheet();
    box.remove();
  };
}
