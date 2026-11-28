/**
 * Podcast du lịch: nghe hai người dẫn kể chuyện ít người biết về một địa danh, rồi trả lời câu hỏi nghe hiểu.
 * Nghe trước không có chữ; lời thoại mở sau khi trả lời xong (mở sớm thì tối đa 2 sao).
 * Sai một câu thì được nghe lại đúng đoạn có đáp án rồi chọn lại.
 * Luật ở core/podcast.ts, nội dung ở data/podcasts.ts. Giọng là clip Kokoro (phase `podcast`).
 */
import './podcast.css';
import { SFX, Voice } from '../../../audio/audioSystem';
import { gameStore } from '../../../core/store';
import {
  POD_HOSTS,
  POD_LEVELS,
  answerPod,
  durationLabel,
  evidenceLines,
  newQuiz,
  nextQuestion,
  podMax,
  podStars,
  podXp,
  replaySpan,
  type PodEpisode,
  type PodLevel,
  type PodQuiz,
} from '../../../core/podcast';
import { PODCASTS } from '../../../data/podcasts';
import { append, clear, h } from '../../dom';
import { closeWordSheet, fillPickable } from '../../wordpick';

const BEST_KEY = 'mclife.podcast.best';
const SLOW_KEY = 'mclife.podcast.slow';

function loadBest(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY) ?? '{}') as Record<string, number>;
  } catch {
    return {};
  }
}

function saveBest(id: string, stars: number) {
  const best = loadBest();
  if ((best[id] ?? -1) >= stars) return;
  best[id] = stars;
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(best));
  } catch {
    // không lưu được thì thôi
  }
}

function loadSlow(): boolean {
  try {
    return localStorage.getItem(SLOW_KEY) === '1';
  } catch {
    return false;
  }
}

function saveSlow(on: boolean) {
  try {
    localStorage.setItem(SLOW_KEY, on ? '1' : '0');
  } catch {
    // bỏ qua
  }
}

function starsEl(n: number): HTMLElement {
  return h('span', { class: 'stars', ariaLabel: `${n} trên 3 sao` }, '★'.repeat(n), h('span', { class: 'off' }, '★'.repeat(3 - n)));
}

const LETTERS = ['A', 'B', 'C', 'D'];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let levelFilter: PodLevel | 'all' = 'all';

export function mountPodcast(root: HTMLElement): () => void {
  const box = h('div', { class: 'podcast' });
  root.append(box);
  let disposed = false;
  let cleanupView: (() => void) | null = null;
  let first = true;

  const go = (view: () => void) => {
    cleanupView?.();
    cleanupView = null;
    Voice.stop();
    closeWordSheet();
    clear(box);
    view();
    if (!first) box.scrollIntoView({ block: 'start' });
    first = false;
  };

  /* ---------- Danh sách tập ---------- */
  function renderList() {
    const best = loadBest();
    const done = PODCASTS.filter((e) => (best[e.id] ?? -1) >= 0).length;
    box.append(
      h(
        'section',
        { class: 'panel pc-card' },
        h('div', { class: 'eyebrow' }, 'Podcast du lịch · Hidden Corners'),
        h('p', { class: 'pc-lead' }, 'Nora (giọng Anh) và Owen (giọng Mỹ) kể những chuyện ít người biết về các địa danh nổi tiếng của Trung Quốc, và tả cảnh nơi đó. Nghe hết tập, rồi trả lời 5 câu hỏi.'),
        h('div', { class: 'pc-meta' }, `${PODCASTS.length} tập · đã nghe ${done}`)
      )
    );
    const chips = h('div', { class: 'filters', role: 'group', ariaLabel: 'Lọc theo trình độ' });
    for (const lv of ['all', ...POD_LEVELS] as const) {
      chips.append(
        h(
          'button',
          {
            class: 'filter',
            ariaPressed: String(levelFilter === lv),
            onclick: () => {
              levelFilter = lv;
              go(renderList);
            },
          },
          lv === 'all' ? 'Tất cả' : lv
        )
      );
    }
    box.append(chips);
    PODCASTS.forEach((ep, i) => {
      if (levelFilter !== 'all' && ep.level !== levelFilter) return;
      const stars = best[ep.id];
      box.append(
        h(
          'button',
          {
            class: 'panel pc-ep',
            onclick: () => {
              SFX.unlock();
              SFX.play('page');
              go(() => renderEpisode(ep));
            },
          },
          h(
            'span',
            { class: 'pc-top' },
            h('span', { class: 'pill' }, `Tập ${i + 1}`),
            h('span', { class: 'pc-meta' }, ep.level, ' · ', durationLabel(ep), stars != null ? h('span', null, ' · ', starsEl(stars)) : null)
          ),
          h('span', { class: 'pc-name' }, ep.place),
          h('span', { class: 'vi' }, `${ep.placeVi} · ${ep.region}`),
          h('span', { class: 'pc-hook' }, ep.hookVi)
        )
      );
    });
  }

  /* ---------- Một tập ---------- */
  function renderEpisode(ep: PodEpisode) {
    const idx = PODCASTS.indexOf(ep);
    let slow = loadSlow();
    let pos = 0; // câu đang hoặc sắp phát
    let playing = false;
    let token = 0;
    let heardAll = false;
    let peeked = false;
    let quiz: PodQuiz = newQuiz(ep);
    const speakOf = (i: number) => ({ npcId: ep.lines[i].who, slow });

    /* Trình phát */
    const whoEl = h('div', { class: 'pc-who' });
    const wave = h('span', { class: 'wave' }, h('i'), h('i'), h('i'), h('i'), h('i'));
    const count = h('span', { class: 'pc-count' });
    const fill = h('div', { class: 'pc-fill' });
    const bar = h('div', { class: 'pc-bar', role: 'progressbar', ariaValuemin: '0', ariaValuemax: String(ep.lines.length) }, fill);
    const playBtn = h('button', { class: 'btn pc-play', onclick: () => (playing ? pause() : play(pos >= ep.lines.length ? 0 : pos)) });
    const backBtn = h('button', { class: 'btn quiet pc-mini', onclick: () => jump(-1) }, '⟲ Lùi lại');
    const againBtn = h('button', { class: 'btn quiet pc-mini', onclick: () => play(Math.max(0, Math.min(pos, ep.lines.length - 1)), { one: true }) }, 'Lặp câu');
    const slowBtn = h('button', {
      class: 'btn quiet pc-mini',
      ariaPressed: String(slow),
      onclick: () => {
        slow = !slow;
        saveSlow(slow);
        slowBtn.setAttribute('aria-pressed', String(slow));
      },
    }, 'Chậm');
    const statusEl = h('p', { class: 'pc-status' });

    const paintPlayer = () => {
      const cur = Math.min(pos, ep.lines.length - 1);
      const host = POD_HOSTS[ep.lines[cur].who];
      clear(whoEl);
      whoEl.append(h('strong', null, host.name), h('span', { class: 'vi' }, host.accentVi), wave);
      wave.classList.toggle('on', playing);
      count.textContent = `Câu ${Math.min(pos + 1, ep.lines.length)}/${ep.lines.length}`;
      fill.style.width = `${Math.round((Math.min(pos, ep.lines.length) / ep.lines.length) * 100)}%`;
      bar.setAttribute('aria-valuenow', String(pos));
      playBtn.textContent = playing ? '⏸ Tạm dừng' : pos === 0 ? '▶ Nghe tập này' : pos >= ep.lines.length ? '▶ Nghe lại từ đầu' : '▶ Nghe tiếp';
      statusEl.textContent = heardAll
        ? 'Đã nghe hết tập. Trả lời câu hỏi bên dưới, hoặc nghe lại đoạn nào chưa rõ.'
        : 'Nghe không có chữ. Chưa rõ thì bấm "Lùi lại", "Lặp câu" hoặc bật "Chậm".';
    };

    /** Phát từ câu `from`; one: chỉ một câu; span: chỉ các câu này */
    async function play(from: number, opt: { one?: boolean; span?: number[] } = {}) {
      SFX.unlock();
      const mine = ++token;
      Voice.stop();
      playing = true;
      const list = opt.span ?? (opt.one ? [from] : Array.from({ length: ep.lines.length - from }, (_, k) => from + k));
      for (const i of list) {
        if (mine !== token || disposed) return;
        pos = i;
        paintPlayer();
        markLine(i);
        await Voice.speak(ep.lines[i].en, speakOf(i));
        if (mine !== token || disposed) return;
        await sleep(ep.lines[i + 1]?.who !== ep.lines[i].who ? 260 : 120);
      }
      if (mine !== token || disposed) return;
      playing = false;
      markLine(-1);
      if (!opt.one && !opt.span) {
        pos = ep.lines.length;
        if (!heardAll) {
          heardAll = true;
          SFX.play('page');
        }
      } else if (!opt.span) pos = Math.min(from + 1, ep.lines.length);
      paintPlayer();
      if (heardAll && quizBox.dataset.state === 'idle') openQuizPrompt();
    }

    function pause() {
      token++;
      playing = false;
      Voice.stop();
      markLine(-1);
      paintPlayer();
    }

    function jump(delta: number) {
      const target = Math.max(0, Math.min(ep.lines.length - 1, (playing ? pos : Math.min(pos, ep.lines.length)) + delta));
      void play(target);
    }

    const player = h(
      'section',
      { class: 'panel pc-player' },
      h('div', { class: 'pc-row pc-between' }, whoEl, count),
      bar,
      playBtn,
      h('div', { class: 'pc-row' }, backBtn, againBtn, slowBtn),
      statusEl
    );

    /* Xem trước câu hỏi */
    const preview = h('ol', { class: 'pc-preview', style: { display: 'none' } }, ...ep.questions.map((q) => h('li', null, q.q)));
    const previewBtn = h(
      'button',
      {
        class: 'link',
        onclick: () => {
          const show = preview.style.display === 'none';
          preview.style.display = show ? '' : 'none';
          previewBtn.textContent = show ? 'Ẩn câu hỏi' : 'Đọc trước câu hỏi';
        },
      },
      'Đọc trước câu hỏi'
    );

    /* Lời thoại */
    const lineEls: HTMLElement[] = [];
    const transcript = h('section', { class: 'panel pc-transcript', style: { display: 'none' } });
    const markLine = (i: number) => lineEls.forEach((el, k) => el.classList.toggle('now', k === i));
    const evidenceOf = new Map<number, number[]>();
    ep.questions.forEach((q, qi) => evidenceLines(ep, q).forEach((li) => evidenceOf.set(li, [...(evidenceOf.get(li) ?? []), qi + 1])));

    function buildTranscript() {
      clear(transcript);
      lineEls.length = 0;
      transcript.append(h('div', { class: 'eyebrow' }, 'Lời thoại'), h('p', { class: 'vi' }, 'Chạm một từ để xem nghĩa và ghi vào Sổ tay. Dòng có nhãn là chỗ chứa đáp án.'));
      ep.lines.forEach((l, i) => {
        const text = h('p', { class: 'pc-text' });
        fillPickable(text, l.en, { vi: l.vi, npcId: l.who, scene: `podcast:${ep.id}` });
        const viEl = h('p', { class: 'vi', style: { display: 'none' } }, l.vi);
        const tags = evidenceOf.get(i);
        const el = h(
          'div',
          { class: `pc-line ${l.who}` },
          h(
            'div',
            { class: 'pc-row pc-between' },
            h('span', { class: 'pc-host' }, POD_HOSTS[l.who].name, tags ? h('span', { class: 'pill pc-tag' }, `Câu hỏi ${tags.join(', ')}`) : null),
            h(
              'span',
              { class: 'pc-row' },
              h('button', { class: 'btn quiet pc-mini', ariaLabel: 'Nghe câu này', onclick: () => void play(i, { one: true }) }, '▶'),
              h('button', { class: 'btn quiet pc-mini', onclick: () => (viEl.style.display = viEl.style.display ? '' : 'none') }, 'Dịch')
            )
          ),
          text,
          viEl
        );
        lineEls.push(el);
        transcript.append(el);
      });
    }

    const peekBtn = h(
      'button',
      {
        class: 'link',
        onclick: () => {
          if (transcript.style.display !== 'none') {
            transcript.style.display = 'none';
            peekBtn.textContent = quiz.done ? 'Xem lời thoại' : 'Hiện lời thoại (tối đa 2★)';
            return;
          }
          if (!quiz.done) peeked = true;
          if (!lineEls.length) buildTranscript();
          transcript.style.display = '';
          peekBtn.textContent = 'Ẩn lời thoại';
        },
      },
      'Hiện lời thoại (tối đa 2★)'
    );

    /* Câu hỏi */
    const quizBox = h('section', { class: 'panel pc-quiz', dataset: { state: 'idle' } });

    function openQuizPrompt() {
      clear(quizBox);
      quizBox.dataset.state = 'idle';
      quizBox.append(
        h('div', { class: 'eyebrow' }, 'Câu hỏi nghe hiểu'),
        h('p', { class: 'pc-lead' }, heardAll ? 'Bạn đã nghe hết tập. Trả lời 5 câu hỏi nhé.' : 'Nên nghe hết tập trước khi trả lời. Sai câu nào sẽ được nghe lại đúng đoạn đó.'),
        h('button', { class: heardAll ? 'btn' : 'btn quiet', onclick: () => { pause(); renderQuestion(); } }, 'Trả lời câu hỏi')
      );
    }

    function renderQuestion() {
      clear(quizBox);
      quizBox.dataset.state = 'quiz';
      if (quiz.done) return renderSummary();
      const q = ep.questions[quiz.qi];
      const qText = h('p', { class: 'pc-q' });
      fillPickable(qText, q.q, { vi: q.qVi, npcId: 'coach', scene: `podcast:${ep.id}` });
      const qVi = h('p', { class: 'vi', style: { display: 'none' } }, q.qVi);
      const feedback = h('div', { class: 'pc-feedback', ariaLive: 'polite' });
      const optBtns = q.options.map((o, k) =>
        h('button', { class: 'pc-opt', onclick: () => choose(k) }, h('span', { class: 'pc-letter' }, LETTERS[k]), h('span', null, o))
      );
      const nextBtn = h('button', { class: 'btn', style: { display: 'none' }, onclick: () => { quiz = nextQuestion(ep, quiz); renderQuestion(); } }, quiz.qi + 1 >= ep.questions.length ? 'Xem kết quả' : 'Câu tiếp');

      function choose(k: number) {
        const res = answerPod(ep, quiz, k);
        if (res.state === quiz) return;
        quiz = res.state;
        clear(feedback);
        optBtns[k].classList.add(res.correct ? 'ok' : 'bad');
        optBtns[k].disabled = true;
        if (res.correct) {
          SFX.play('correct');
          feedback.append(h('div', { class: 'pc-ok' }, `✓ Đúng · +${res.gained} điểm${res.gained === 1 ? ' (sau khi nghe lại)' : ''}`), h('p', { class: 'pc-why' }, q.whyVi));
        } else if (res.retry) {
          SFX.play('pop');
          const span = replaySpan(ep, q);
          feedback.append(
            h('div', { class: 'pc-warn' }, 'Chưa đúng. Nghe lại đoạn có đáp án rồi chọn lại.'),
            h('button', { class: 'btn quiet', onclick: () => void play(span[0], { span }) }, '▶ Nghe lại đoạn này')
          );
          void play(span[0], { span });
        } else if (res.reveal) {
          SFX.play('error');
          optBtns[q.answer].classList.add('ok');
          const ev = evidenceLines(ep, q);
          const said = h('div', { class: 'pc-said' });
          for (const li of ev) {
            const p = h('p', { class: 'pc-text' });
            fillPickable(p, ep.lines[li].en, { vi: ep.lines[li].vi, npcId: ep.lines[li].who, scene: `podcast:${ep.id}` });
            said.append(h('span', { class: 'pc-host' }, POD_HOSTS[ep.lines[li].who].name), p);
          }
          feedback.append(
            h('div', { class: 'pc-warn' }, `Đáp án đúng là ${LETTERS[q.answer]}.`),
            h('p', { class: 'pc-why' }, q.whyVi),
            said,
            h('button', { class: 'btn quiet', onclick: () => void play(ev[0], { span: ev }) }, '▶ Nghe câu có đáp án')
          );
        }
        if (res.settled) {
          optBtns.forEach((b) => (b.disabled = true));
          nextBtn.style.display = '';
        }
      }

      quizBox.append(
        h('div', { class: 'pc-row pc-between' }, h('div', { class: 'eyebrow' }, `Câu ${quiz.qi + 1}/${ep.questions.length}`), h('span', { class: 'pc-meta' }, `${quiz.points} điểm`)),
        qText,
        h('button', { class: 'link', onclick: () => (qVi.style.display = qVi.style.display ? '' : 'none') }, 'Dịch câu hỏi'),
        qVi,
        h('div', { class: 'pc-opts' }, ...optBtns),
        feedback,
        nextBtn
      );
    }

    function renderSummary() {
      const max = podMax(ep);
      const stars = podStars(quiz.points, max, peeked);
      const xp = podXp(quiz.points, max, peeked);
      saveBest(ep.id, stars);
      if (xp > 0) gameStore.getState().gain({ xp });
      SFX.play(stars >= 2 ? 'star' : 'page');
      const next = PODCASTS[idx + 1];
      clear(quizBox);
      quizBox.dataset.state = 'done';
      append(quizBox, [
        h('div', { class: 'eyebrow' }, 'Kết quả'),
        h('div', { class: 'pc-bigstars' }, starsEl(stars)),
        h(
          'div',
          { class: 'pc-stats' },
          h('div', null, h('strong', null, `${quiz.points}/${max}`), h('span', { class: 'vi' }, 'điểm')),
          h('div', null, h('strong', null, `+${xp}`), h('span', { class: 'vi' }, 'XP'))
        ),
        h(
          'div',
          { class: 'pc-dots' },
          ...quiz.results.map((r, k) => h('span', { class: `pc-dot r${r ?? 0}`, title: `Câu ${k + 1}` }, String(k + 1)))
        ),
        peeked ? h('p', { class: 'vi' }, 'Bạn đã mở lời thoại khi đang làm nên tối đa 2 sao.') : null,
        h('p', { class: 'vi' }, 'Giờ hãy đọc lời thoại, chạm vào những từ hay để ghi vào Sổ tay, rồi nghe lại cả tập một lần nữa.'),
        h(
          'div',
          { class: 'pc-row' },
          h('button', { class: 'btn', onclick: () => retry() }, 'Làm lại'),
          next ? h('button', { class: 'btn quiet', onclick: () => go(() => renderEpisode(next)) }, `Tập tiếp: ${next.place}`) : null
        ),
      ]);
      if (!lineEls.length) buildTranscript();
      transcript.style.display = '';
      peekBtn.textContent = 'Ẩn lời thoại';
    }

    /** Làm lại: ẩn lời thoại để nghe và trả lời lại từ đầu */
    function retry() {
      quiz = newQuiz(ep);
      peeked = false;
      transcript.style.display = 'none';
      peekBtn.textContent = 'Hiện lời thoại (tối đa 2★)';
      renderQuestion();
      player.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }

    box.append(
      h(
        'div',
        { class: 'panel pc-head' },
        h('div', { class: 'pc-row pc-between' }, h('button', { class: 'link', onclick: () => go(renderList) }, '‹ Danh sách'), h('span', { class: 'pc-meta' }, `Tập ${idx + 1} · ${ep.level} · ${durationLabel(ep)}`)),
        h('h2', { class: 'pc-h' }, ep.place),
        h('div', { class: 'vi' }, `${ep.placeVi} · ${ep.region}`),
        h('p', { class: 'pc-hook' }, ep.hookVi)
      ),
      player,
      h('div', { class: 'pc-row pc-between pc-links' }, previewBtn, peekBtn),
      preview,
      quizBox,
      transcript
    );
    paintPlayer();
    openQuizPrompt();

    cleanupView = () => {
      token++;
      Voice.stop();
    };
  }

  go(renderList);

  return () => {
    disposed = true;
    cleanupView?.();
    Voice.stop();
    box.remove();
  };
}
