/**
 * Trò chuyện: hội thoại rẽ nhánh viết sẵn với khách hàng, cô dâu, diễn giả.
 * Người học tự nghĩ câu trả lời; nhân vật đáp khác nhau theo ý nghe được, hỏi vặn nếu trả lời mơ hồ.
 * Giọng là clip thu sẵn của đúng nhân vật (phase `talk`), nên phát ngay, không cần khoá hay tải thêm.
 * Luật ở core/talk.ts, nội dung ở data/talks.ts.
 */
import './talk.css';
import { SFX, Voice } from '../../../audio/audioSystem';
import { findGrammarIssues } from '../../../core/grammar';
import { gameStore } from '../../../core/store';
import { firstSample, maxPoints, newTalk, starsFor, step, xpFor, type Talk, type TalkState } from '../../../core/talk';
import { TALKS } from '../../../data/talks';
import { answerBar } from '../../answer';
import { clear, h } from '../../dom';

const BEST_KEY = 'mclife.talk.best';

function loadBest(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY) ?? '{}') as Record<string, number>;
  } catch {
    return {};
  }
}

function saveBest(id: string, stars: number) {
  const best = loadBest();
  if ((best[id] ?? 0) >= stars) return;
  best[id] = stars;
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(best));
  } catch {
    // không lưu được thì thôi
  }
}

function starsEl(n: number): HTMLElement {
  return h('span', { class: 'stars', ariaLabel: `${n} trên 3 sao` }, '★'.repeat(n), h('span', { class: 'off' }, '★'.repeat(3 - n)));
}

const same = (a: string, b: string) => a.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() === b.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function mountTalk(root: HTMLElement): () => void {
  const box = h('div', { class: 'talk' });
  root.append(box);
  let disposed = false;
  let cleanupView: (() => void) | null = null;

  const go = (view: () => void) => {
    cleanupView?.();
    cleanupView = null;
    Voice.stop();
    clear(box);
    view();
  };

  /* ---------- Chọn cuộc trò chuyện ---------- */
  function renderList() {
    const best = loadBest();
    box.append(
      h(
        'section',
        { class: 'panel tk-card' },
        h('div', { class: 'eyebrow' }, 'Trò chuyện'),
        h('p', { class: 'tk-lead' }, 'Nói chuyện nhiều lượt với khách hàng, cô dâu, diễn giả. Không có câu mẫu để đọc: bạn tự nghĩ câu. Trả lời mơ hồ sẽ bị hỏi vặn lại.')
      )
    );
    for (const t of TALKS) {
      box.append(
        h(
          'button',
          {
            class: 'panel tk-persona',
            onclick: () => {
              SFX.unlock();
              SFX.play('page');
              go(() => renderChat(t));
            },
          },
          h('span', { class: 'tk-top' }, h('span', { class: 'pill' }, t.kind), h('span', { class: 'tk-meta' }, t.cefr, ' · ', starsEl(best[t.id] ?? 0))),
          h('span', { class: 'tk-name' }, t.name),
          h('span', { class: 'vi' }, t.roleVi),
          h('span', { class: 'tk-goal' }, 'Mục tiêu: ', t.goalVi)
        )
      );
    }
  }

  /* ---------- Hội thoại ---------- */
  function renderChat(t: Talk) {
    let st: TalkState = newTalk();
    let busy = true;
    let token = 0;
    const speakOpts = { npcId: t.npcId, speaker: t.speaker };

    const turnsPill = h('span', { class: 'pill' });
    const log = h('div', { class: 'tk-log', role: 'log', ariaLive: 'polite' });
    const taskEl = h('p', { class: 'tk-task' });
    const hintEl = h('div', { class: 'note-box focus', style: { display: 'none' } });
    const typeInput = h('input', { type: 'text', placeholder: 'Gõ câu tiếng Anh', autocomplete: 'off', autocapitalize: 'off' });
    const typeForm = h(
      'form',
      {
        class: 'answer-form tk-type',
        style: { display: 'none' },
        onsubmit: (e: Event) => {
          e.preventDefault();
          const v = typeInput.value.trim();
          if (v) answer([v]);
          typeInput.value = '';
        },
      },
      typeInput,
      h('button', { class: 'btn', type: 'submit', style: { width: 'auto' } }, 'Gửi')
    );
    const bar = answerBar({ label: 'Chạm để nói', onAnswer: (c) => answer(c) });
    bar.el.addEventListener('click', () => SFX.unlock(), true);
    const dock = h(
      'div',
      { class: 'panel tk-dock' },
      h('div', { class: 'eyebrow' }, 'Việc của bạn'),
      taskEl,
      hintEl,
      bar.el,
      h(
        'div',
        { class: 'tk-row tk-between' },
        h(
          'button',
          {
            class: 'link',
            onclick: () => {
              typeForm.style.display = typeForm.style.display ? '' : 'none';
              if (!typeForm.style.display) typeInput.focus();
            },
          },
          'Gõ thay vì nói'
        ),
        h('button', { class: 'link', onclick: () => go(renderList) }, 'Rời')
      ),
      typeForm
    );

    const reveal = () => requestAnimationFrame(() => (dock.isConnected && dock.style.display !== 'none' ? dock : log.lastElementChild)?.scrollIntoView({ block: 'end', behavior: 'smooth' }));

    const setBusy = (b: boolean) => {
      busy = b;
      bar.el.style.opacity = b ? '0.5' : '';
      bar.el.style.pointerEvents = b ? 'none' : '';
    };

    const paintNode = () => {
      turnsPill.textContent = `Lượt ${Math.min(st.node + 1, t.nodes.length)}/${t.nodes.length}`;
      if (!st.done) taskEl.textContent = t.nodes[st.node].task;
    };

    /** Bong bóng của nhân vật: nghe trước, chữ ẩn cho tới khi bấm "Hiện chữ" */
    const npcBubble = (text: string, vi?: string) => {
      const body = h('p', { class: 'tk-text', style: { display: 'none' } }, text);
      const viEl = vi ? h('p', { class: 'vi', style: { display: 'none' } }, vi) : null;
      const wave = h('span', { class: 'wave' }, h('i'), h('i'), h('i'), h('i'), h('i'));
      const showBtn = h('button', { class: 'btn quiet tk-mini', onclick: () => { body.style.display = ''; showBtn.style.display = 'none'; } }, 'Hiện chữ');
      const el = h(
        'div',
        { class: 'tk-bubble npc' },
        h('div', { class: 'tk-who' }, t.name, wave),
        body,
        viEl,
        h(
          'div',
          { class: 'tk-row' },
          h('button', { class: 'btn quiet tk-mini', onclick: () => { if (!busy) void Voice.speak(text, speakOpts); } }, 'Nghe lại'),
          h('button', { class: 'btn quiet tk-mini', onclick: () => { if (!busy) void Voice.speak(text, { ...speakOpts, slow: true }); } }, 'Chậm'),
          showBtn,
          viEl ? h('button', { class: 'btn quiet tk-mini', onclick: () => { viEl.style.display = ''; body.style.display = ''; showBtn.style.display = 'none'; } }, 'Dịch') : null
        )
      );
      log.append(el);
      reveal();
      return wave;
    };

    /** Nhân vật nói lần lượt từng câu */
    async function say(lines: { text: string; vi?: string }[]) {
      const mine = ++token;
      setBusy(true);
      for (const l of lines) {
        if (mine !== token || disposed) return;
        const wave = npcBubble(l.text, l.vi);
        wave.classList.add('on');
        await Voice.speak(l.text, speakOpts);
        wave.classList.remove('on');
      }
      if (mine !== token || disposed) return;
      setBusy(false);
    }

    const viOf = (text: string) => (text === t.end ? t.endVi : t.nodes.find((n) => n.ask === text)?.askVi);

    function answer(candidates: string[]) {
      const cands = candidates.map((c) => c.trim()).filter(Boolean);
      if (busy || disposed || st.done || cands.length === 0) return;
      const node = t.nodes[st.node];
      const res = step(t, st, cands);
      const heard = res.match?.transcript ?? cands[0];
      bar.reset();

      const note = h('div', { class: 'tk-note' });
      const model = res.outcome === 'advance' ? res.match!.reply : firstSample(node);
      if (res.outcome === 'advance') {
        note.append(h('div', { class: 'tk-ok' }, `✓ ${model.label} · +${res.gained} điểm`));
        SFX.play('correct');
      } else if (res.outcome === 'press') {
        note.append(h('div', { class: 'tk-warn' }, `Còn chung chung, ${t.name} hỏi vặn lại.`));
        SFX.play('pop');
      } else if (res.outcome === 'nudge') {
        note.append(h('div', { class: 'tk-warn' }, `${t.name} chưa hiểu ý bạn.`));
        SFX.play('pop');
      } else {
        note.append(h('div', { class: 'tk-warn' }, 'Hết lượt thử, câu chuyện đi tiếp.'));
        SFX.play('error');
      }
      for (const g of findGrammarIssues(heard)) note.append(h('div', { class: 'tk-fix' }, 'Sửa: ', h('s', null, g.wrong), ' → ', h('strong', null, g.fix)));
      if ((res.outcome === 'advance' || res.outcome === 'forced') && model.say && !same(model.say, heard)) {
        const sample = model.say;
        note.append(
          h(
            'div',
            { class: 'tk-model' },
            h('div', { class: 'tk-model-label' }, res.outcome === 'forced' ? 'Câu nên nói' : 'Cách nói tự nhiên'),
            h('p', { class: 'tk-model-text' }, sample),
            h('button', { class: 'btn quiet tk-mini', onclick: () => { if (!busy) void Voice.speak(sample, { npcId: 'coach' }); } }, 'Nghe')
          )
        );
      }
      log.append(h('div', { class: 'tk-bubble me' }, h('p', { class: 'tk-text' }, heard), note));

      // Gợi ý: lần đầu trượt thì hiện các ý có thể trả lời, lần hai hiện luôn câu mẫu
      clear(hintEl);
      if (res.outcome === 'press' || res.outcome === 'nudge') {
        const ideas = node.replies.filter((r) => !r.stay).map((r) => r.label);
        hintEl.append(h('div', null, 'Bạn có thể trả lời theo ý: ', ideas.join(' · ')));
        if (res.reveal) hintEl.append(h('div', { class: 'big' }, firstSample(node).say ?? ''));
        hintEl.style.display = '';
      } else hintEl.style.display = 'none';

      st = res.state;
      paintNode();
      if (st.done) dock.style.display = 'none';
      void say(res.npc.map((text) => ({ text, vi: viOf(text) }))).then(() => {
        if (!st.done || disposed) return;
        log.append(h('button', { class: 'btn tk-end', onclick: () => go(() => renderSummary(t, st.points)) }, 'Xem kết quả'));
        reveal();
      });
    }

    box.append(
      h(
        'div',
        { class: 'panel tk-head' },
        h(
          'div',
          { class: 'tk-row tk-between' },
          h('div', { class: 'tk-title' }, h('strong', null, t.name), h('span', { class: 'vi' }, t.roleVi)),
          turnsPill
        ),
        h('div', { class: 'tk-goal' }, 'Mục tiêu: ', t.goalVi)
      ),
      log,
      dock
    );
    paintNode();
    void say([{ text: t.nodes[0].ask, vi: t.nodes[0].askVi }]);

    cleanupView = () => {
      token++;
      bar.dispose();
    };
  }

  /* ---------- Kết quả ---------- */
  function renderSummary(t: Talk, points: number) {
    const max = maxPoints(t);
    const stars = starsFor(points, max);
    const xp = xpFor(points, max);
    saveBest(t.id, stars);
    if (xp > 0) gameStore.getState().gain({ xp });
    SFX.play(stars >= 2 ? 'star' : 'page');
    box.append(
      h(
        'section',
        { class: 'panel tk-card' },
        h('div', { class: 'eyebrow' }, 'Kết quả trò chuyện'),
        h('h2', { class: 'tk-h' }, stars === 3 ? `Xong việc với ${t.name}!` : `Cuộc nói chuyện với ${t.name}`),
        h('div', { class: 'tk-bigstars' }, starsEl(stars)),
        h(
          'div',
          { class: 'tk-stats' },
          h('div', null, h('strong', null, `${points}/${max}`), h('span', { class: 'vi' }, 'điểm')),
          h('div', null, h('strong', null, `+${xp}`), h('span', { class: 'vi' }, 'XP'))
        ),
        h('p', { class: 'vi' }, 'Trả lời rõ ý ngay lần đầu được 2 điểm, sau khi bị hỏi lại được 1 điểm. Thử lại và chọn ý khác để nghe nhân vật phản ứng khác đi.')
      ),
      h(
        'div',
        { class: 'tk-row' },
        h('button', { class: 'btn', onclick: () => { SFX.unlock(); go(() => renderChat(t)); } }, 'Nói lại'),
        h('button', { class: 'btn quiet', onclick: () => go(renderList) }, 'Chọn người khác')
      )
    );
  }

  go(renderList);

  return () => {
    disposed = true;
    cleanupView?.();
    Voice.stop();
    box.remove();
  };
}
