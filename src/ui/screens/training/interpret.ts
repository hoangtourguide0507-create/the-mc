/**
 * Dịch nối tiếp Việt → Anh: câu tiếng Việt của người phát biểu hiện vài giây rồi ẩn,
 * người học nói lại bằng tiếng Anh. Chấm theo ý (core/longturn.ts), chấp nhận nhiều cách dịch.
 * Xem lại câu gốc sau khi đã ẩn thì câu đó tối đa 2 sao.
 */
import './talk.css';
import './longturn.css';
import { SFX, Voice } from '../../../audio/audioSystem';
import { scoreInterp, setStars, showSeconds, type InterpScore, type InterpSet } from '../../../core/longturn';
import { gameStore } from '../../../core/store';
import { INTERP_SETS } from '../../../data/interpret';
import { answerBar, type AnswerBar } from '../../answer';
import { clear, h } from '../../dom';
import { closeWordSheet, fillPickable } from '../../wordpick';
import { byFn, fnChips } from '../../fnFilter';
import { REGISTER_SETS } from '../../../data/register';

function starsEl(n: number): HTMLElement {
  return h('span', { class: 'stars', ariaLabel: `${n} trên 3 sao` }, '★'.repeat(n), h('span', { class: 'off' }, '★'.repeat(3 - n)));
}

/** Cấu hình một mục luyện dùng chung khung "xem câu nguồn, ẩn đi, nói lại": Dịch nối tiếp và Đổi văn phong. */
interface DrillConfig {
  sets: InterpSet[];
  bucket: 'interp' | 'register';
  eyebrow: string;
  lead: string;
  /** Nhãn trên câu nguồn */
  source: string;
  hidden: string;
  answerLabel: string;
  modelLabel: string;
  okLabel: string;
  endEyebrow: string;
  endTip: string;
  again: string;
}

const INTERPRET: DrillConfig = {
  sets: INTERP_SETS,
  bucket: 'interp',
  eyebrow: 'Dịch nối tiếp',
  lead: 'Việc thật của MC song ngữ: người phát biểu nói một câu tiếng Việt, bạn nói lại bằng tiếng Anh. Câu gốc chỉ hiện vài giây. Dịch đủ ý là đạt, không cần đúng từng chữ.',
  source: 'Người phát biểu nói',
  hidden: 'Câu gốc đã ẩn. Nói lại ý đó bằng tiếng Anh, như đang đứng cạnh người phát biểu.',
  answerLabel: 'Nói bản dịch tiếng Anh',
  modelLabel: 'Một cách dịch tự nhiên',
  okLabel: 'Dịch đủ ý',
  endEyebrow: 'Kết quả dịch nối tiếp',
  endTip: 'Mẹo của phiên dịch viên: nghe để bắt ý chính và con số, đừng cố nhớ từng chữ.',
  again: 'Dịch lại bộ này',
};

const REGISTER: DrillConfig = {
  sets: REGISTER_SETS,
  bucket: 'register',
  eyebrow: 'Văn phong',
  lead: 'Cùng một ý, nhưng nói với bạn bè khác với nói trên sân khấu. Xem câu nguồn, rồi nói lại ý đó cho đúng tông. Đủ ý mà còn từ sai tông (như “guys” ở tiệc trang trọng) thì chưa đạt.',
  source: 'Câu nguồn (sai tông)',
  hidden: 'Câu nguồn đã ẩn. Nói lại ý đó cho đúng tông của sự kiện.',
  answerLabel: 'Nói lại cho đúng tông',
  modelLabel: 'Một cách nói đúng tông',
  okLabel: 'Đúng tông, đủ ý',
  endEyebrow: 'Kết quả đổi văn phong',
  endTip: 'Mẹo: lời trang trọng thường dài hơn, dùng “please”, “may I”, “we kindly ask”, và gọi đúng chức danh.',
  again: 'Làm lại bộ này',
};

export function mountInterpret(root: HTMLElement): () => void {
  return mountDrill(root, INTERPRET);
}

/** Đổi văn phong: câu thân mật thành lời trang trọng của MC, và ngược lại. */
export function mountRegister(root: HTMLElement): () => void {
  return mountDrill(root, REGISTER);
}

function mountDrill(root: HTMLElement, cfg: DrillConfig): () => void {
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

  function renderList() {
    const done = store().state.speak?.[cfg.bucket] ?? {};
    box.append(
      h(
        'section',
        { class: 'panel tk-card' },
        h('div', { class: 'eyebrow' }, cfg.eyebrow),
        h('p', { class: 'tk-lead' }, cfg.lead)
      ),
      fnChips(cfg.sets, () => go(renderList))
    );
    for (const set of byFn(cfg.sets)) {
      box.append(
        h(
          'button',
          {
            class: 'panel tk-persona',
            onclick: () => {
              SFX.unlock();
              SFX.play('page');
              go(() => renderRun(set));
            },
          },
          h('div', { class: 'tk-top' }, h('span', { class: 'pill' }, set.kind), h('span', { class: 'tk-meta' }, `${set.cefr} · `, starsEl(done[set.id]?.stars ?? 0))),
          h('span', { class: 'tk-name' }, set.title),
          h('span', { class: 'tk-goal' }, set.brief)
        )
      );
    }
  }

  function renderRun(set: InterpSet) {
    let idx = 0;
    let peeked = false;
    let phase: 'show' | 'hidden' | 'result' = 'show';
    let result: InterpScore | null = null;
    let timer = 0;
    let bar: AnswerBar | null = null;
    const stars: number[] = [];

    const pill = h('span', { class: 'pill' });
    const body = h('section', { class: 'panel tk-card' });
    box.append(
      h(
        'section',
        { class: 'panel tk-head' },
        h(
          'div',
          { class: 'tk-row tk-between' },
          h('div', { class: 'tk-title' }, h('strong', null, set.title), h('span', { class: 'vi' }, set.brief)),
          h('button', { class: 'link', onclick: () => go(renderList) }, 'Rời')
        ),
        pill
      ),
      body
    );

    const dropBar = () => {
      bar?.dispose();
      bar = null;
    };
    const hide = () => {
      window.clearTimeout(timer);
      phase = 'hidden';
      render();
    };
    const answer = (candidates: string[]) => {
      if (disposed || phase !== 'hidden') return;
      result = scoreInterp(set.segments[idx], candidates, peeked);
      SFX.play(result.stars >= 2 ? 'ting' : 'error');
      stars.push(result.stars);
      phase = 'result';
      render();
    };
    const next = () => {
      idx += 1;
      peeked = false;
      result = null;
      if (idx >= set.segments.length) return go(() => renderEnd(set, stars));
      phase = 'show';
      render();
    };

    function render() {
      if (disposed) return;
      const g = set.segments[idx];
      pill.textContent = `Câu ${idx + 1}/${set.segments.length}`;
      window.clearTimeout(timer);
      dropBar();
      clear(body);
      if (phase === 'show') {
        const sec = showSeconds(g.vi);
        const count = h('i');
        body.append(
          h('div', { class: 'eyebrow' }, peeked ? 'Xem lại câu gốc (câu này tối đa 2 sao)' : cfg.source),
          h('p', { class: 'lt-vi' }, g.vi),
          h('div', { class: 'lt-count' }, count),
          h('button', { class: 'btn', onclick: hide }, 'Nhớ rồi, ẩn câu gốc và dịch')
        );
        // Thanh đếm ngược chạy bằng transition, hết giờ thì tự ẩn câu gốc
        count.style.transition = `transform ${sec}s linear`;
        requestAnimationFrame(() => requestAnimationFrame(() => (count.style.transform = 'scaleX(0)')));
        timer = window.setTimeout(hide, sec * 1000);
      } else if (phase === 'hidden') {
        bar = answerBar({ label: cfg.answerLabel, onAnswer: answer });
        body.append(
          h('div', { class: 'eyebrow' }, 'Đến lượt bạn'),
          h('p', { class: 'lt-vi hidden' }, cfg.hidden),
          bar.el,
          h('button', { class: 'link', onclick: () => { peeked = true; phase = 'show'; render(); } }, 'Quên mất rồi? Xem lại câu gốc')
        );
      } else if (result) {
        const r = result;
        const model = h('p', { class: 'tk-model-text' });
        fillPickable(model, g.say, { vi: cfg.bucket === 'interp' ? g.vi : undefined, npcId: 'coach', scene: `${cfg.bucket}:${set.id}` });
        body.append(
          h('div', { class: 'tk-row tk-between' }, h('div', { class: 'eyebrow' }, r.stars === 3 ? cfg.okLabel : r.offTone.length ? 'Còn từ sai tông' : r.stars > 0 ? 'Còn thiếu ý' : 'Chưa đạt'), starsEl(r.stars)),
          h('p', { class: 'vi' }, g.vi),
          h('div', { class: 'lt-chipline' }, ...g.ideas.map((idea, k) => h('span', { class: `lt-chip ${r.covered[k] ? 'hit' : 'miss'}` }, `${r.covered[k] ? '✓' : '✗'} ${idea.label}`))),
          r.offTone.length ? h('div', { class: 'note-box focus' }, `Từ sai tông cần bỏ: ${r.offTone.map((w) => `“${w}”`).join(', ')}. Còn từ này thì câu tối đa 1 sao.`) : '',
          h('p', { class: 'lt-heard' }, 'Máy nghe được: ', h('i', null, `“${r.transcript}”`)),
          h(
            'div',
            { class: 'tk-model' },
            h('div', { class: 'tk-model-label' }, cfg.modelLabel),
            model,
            h(
              'div',
              { class: 'tk-row' },
              h('button', { class: 'btn quiet tk-mini', onclick: () => void Voice.speak(g.say, { npcId: 'coach' }) }, 'Nghe'),
              h('button', { class: 'btn quiet tk-mini', onclick: () => void Voice.speak(g.say, { npcId: 'coach', slow: true }) }, 'Chậm')
            )
          ),
          peeked ? h('p', { class: 'vi' }, 'Bạn đã xem lại câu gốc nên câu này tối đa 2 sao.') : '',
          h('button', { class: 'btn', onclick: next }, idx + 1 >= set.segments.length ? 'Xem kết quả' : 'Câu tiếp')
        );
      }
    }

    render();
    cleanupView = () => {
      window.clearTimeout(timer);
      dropBar();
    };
  }

  function renderEnd(set: InterpSet, stars: number[]) {
    const total = setStars(stars);
    const xp = store().recordInterp(set.id, total, cfg.bucket);
    SFX.play(total >= 2 ? 'star' : 'page');
    box.append(
      h(
        'section',
        { class: 'panel tk-card' },
        h('div', { class: 'eyebrow' }, cfg.endEyebrow),
        h('h2', { class: 'tk-h' }, total === 3 && cfg.bucket === 'interp' ? 'Người phát biểu rất yên tâm!' : set.title),
        h('div', { class: 'tk-bigstars' }, starsEl(total)),
        h(
          'div',
          { class: 'tk-stats' },
          h('div', null, h('strong', null, `${stars.filter((s) => s === 3).length}/${stars.length}`), h('span', { class: 'vi' }, 'câu đủ ý')),
          h('div', null, h('strong', null, `+${xp}`), h('span', { class: 'vi' }, 'XP'))
        ),
        h('p', { class: 'vi' }, cfg.endTip)
      ),
      h(
        'div',
        { class: 'tk-row' },
        h('button', { class: 'btn', onclick: () => { SFX.unlock(); go(() => renderRun(set)); } }, cfg.again),
        h('button', { class: 'btn quiet', onclick: () => go(renderList) }, 'Chọn bộ khác')
      )
    );
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
