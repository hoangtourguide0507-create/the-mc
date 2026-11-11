/**
 * Màn bài học (bản HTML thuần của StageView.tsx cũ). Giữ nguyên logic học:
 * - 5 kiểu lượt: đọc theo thẻ, bắt từ rồi nói, điền ô, ứng biến, chọn đáp án
 * - giảm dần hỗ trợ (core/recall.ts): tự nói với gợi ý tiếng Việt, phản xạ nói có đồng hồ
 * - chấm cộng dồn và luyện riêng cụm còn sai (core/retry.ts)
 * - công thức Speaking XP / Listening XP như AI_HANDOVER_SPEC mục 2.2
 * - token `attempt` huỷ mọi kết quả bất đồng bộ của lượt cũ; mic bán song công nằm trong SpeechEngine
 * Thanh mic ghim ở đáy, nằm ngoài vùng cuộn.
 */
import { SFX, SpeechEngine, Voice } from '../../audio/audioSystem';
import { clamp } from '../../core/clock';
import { evaluateScripted, evaluateTurnCandidates } from '../../core/evaluator';
import { evaluateRecallCandidates, planTurn, supportStage } from '../../core/recall';
import { applyChunkAttempt, focusChunk, mergeAttempts } from '../../core/retry';
import { gameStore } from '../../core/store';
import { viSupport } from '../../core/support';
import { CHUNKS_BY_SCRIPT } from '../../data/chunks';
import { NPCS, SCENES, scenarioForDay, scriptList } from '../../data/content';
import { SCENE_OBJECTIVES } from '../../data/objectives';
import type { EvalResult, StageMicPhase } from '../../types/game';
import { append, clear, h } from '../dom';

export interface LessonOptions {
  /** Rời bài hoặc xong bài; `again` = người học muốn luyện lại ngay bài này */
  onExit: (again: boolean) => void;
}

export function mountLesson(root: HTMLElement, sceneId: string, opts: LessonOptions): () => void {
  const store = () => gameStore.getState();
  const st0 = store().state;
  const baseScene = SCENES[sceneId] || SCENES.coffee;
  // Bài do người học chọn trong danh sách; nếu không chọn thì lấy bài theo ngày học.
  // Nhiệm vụ và sổ tay vẫn đánh số theo vị trí lượt của tình huống.
  const pickedKey = store().lessonScriptKey;
  const picked = pickedKey ? scriptList(baseScene.id).find((x) => x.key === pickedKey) : null;
  const dayScript = picked
    ? { scenarioId: picked.key.endsWith(':base') ? null : picked.key, title: picked.title, turns: picked.turns }
    : scenarioForDay(baseScene, st0.day);
  const turns = dayScript.turns;
  const scriptKey = picked ? picked.key : dayScript.scenarioId ?? `${baseScene.id}:${st0.day < 2 ? 'base' : 'gen'}`;
  // Mức hỗ trợ chốt lúc vào bài: 0 = đủ thẻ, 1 = chỉ gợi ý tiếng Việt, 2 = không gợi ý
  const stage = supportStage(st0.learn.exposure[scriptKey]);
  const support = viSupport(SCENE_OBJECTIVES[sceneId]?.cefr);
  const toast = (msg: string, tone: 'info' | 'success' | 'warn' | 'error' = 'info', ms?: number) => store().toast(msg, tone, ms);

  /* ---------- Trạng thái cả bài ---------- */
  let turnIdx = 0;
  const turnStars: number[] = new Array(turns.length).fill(0);
  const listeningAwarded: boolean[] = new Array(turns.length).fill(false);
  let speakingXp = 0;
  let listeningXp = 0;
  const selfPass = new Set<number>();
  let selfTalk = false;
  let showFallback = false;
  let finished = false;
  let disposed = false;

  /* ---------- Trạng thái từng lượt ---------- */
  let revealed = false;
  let translated = false;
  let npcSpeaking = false;
  let micPhase: StageMicPhase = 'idle';
  let interim = '';
  let evalResult: EvalResult | null = null;
  let chunkRec = false;
  let hintAsked = false;
  let mistakes = 0;
  let caught: number[] = [];
  let wrongCatch: string[] = [];
  let quizPicked: number | null = null;
  let quizWrong: number[] = [];
  let shakeKey: string | null = null;
  let reflexLeft: number | null = null;
  let reflexExpired = false;
  let leaveArmed = false;

  let attempt = 0;
  let reflexTimer = 0;
  let speakTimer = 0;

  const turn = () => turns[turnIdx] || turns[0];
  const plan = () => planTurn(turn(), stage, selfTalk);
  const npcId = () => turn().who || baseScene.npc;
  const npcName = () => {
    const n = NPCS[npcId()] || NPCS.leo;
    if (n.isCouple) return turn().speaker === 'liam' ? 'Liam (chú rể)' : 'Emma (cô dâu)';
    return n.name;
  };
  const stopReflex = () => {
    if (reflexTimer) window.clearInterval(reflexTimer);
    reflexTimer = 0;
  };

  /* ---------- Khung DOM ---------- */
  const topEl = h('div', { class: 'l-top' });
  const bodyEl = h('div', { class: 'l-body' });
  const micEl = h('div', { class: 'l-mic' });
  const heardText = h('i');
  const manual = h('input', { type: 'text', placeholder: 'Gõ câu tiếng Anh thay cho mic', autocomplete: 'off', autocapitalize: 'off' });
  const screen = h('div', { class: 'lesson' }, topEl, bodyEl, micEl);
  root.append(screen);

  const offViseme = Voice.onViseme((v) => {
    const on = v !== 'rest';
    if (on === npcSpeaking) return;
    npcSpeaking = on;
    screen.querySelector('.wave')?.classList.toggle('on', on);
  });

  /* ---------- Vào một lượt: đặt lại trạng thái, 350ms sau NPC nói ---------- */
  function beginTurn() {
    const my = ++attempt;
    Voice.stop();
    SpeechEngine.abort();
    stopReflex();
    window.clearTimeout(speakTimer);

    revealed = false;
    translated = false;
    evalResult = null;
    chunkRec = false;
    interim = '';
    mistakes = 0;
    caught = [];
    wrongCatch = [];
    quizPicked = null;
    quizWrong = [];
    reflexExpired = false;
    hintAsked = false;
    manual.value = '';
    const t = turn();
    const p = plan();
    micPhase = t.mode === 'catch' && p.kind === 'authored' ? 'locked' : 'idle';

    // Đồng hồ phản xạ: lượt chọn đáp án có ghi reflex, hoặc lượt phản xạ nói
    const countdown = p.kind === 'react' ? p.seconds : t.mode === 'quiz' && t.reflex ? t.reflex : 0;
    reflexLeft = countdown > 0 ? countdown : null;
    render();
    bodyEl.scrollTop = 0;

    speakTimer = window.setTimeout(async () => {
      if (attempt !== my) return;
      await Voice.speak(t.npc, { npcId: npcId(), speaker: t.speaker, preferredURI: store().state.voiceURI, channel: t.channel });
      if (attempt !== my || countdown <= 0) return;
      // Đồng hồ chỉ chạy sau khi NPC nói xong
      reflexTimer = window.setInterval(() => {
        if (reflexLeft === null) return;
        if (reflexLeft <= 1) {
          stopReflex();
          reflexLeft = 0;
          reflexExpired = true;
        } else reflexLeft -= 1;
        // Chỉ cập nhật nhãn đồng hồ: dựng lại cả thẻ mỗi giây sẽ làm hụt cú chạm đang diễn ra
        paintReflex();
      }, 1000);
    }, 350);
  }

  function playNpc(slow = false) {
    SFX.play('tap');
    const t = turn();
    void Voice.speak(t.npc, { npcId: npcId(), speaker: t.speaker, slow, preferredURI: store().state.voiceURI, channel: t.channel });
  }

  function playSample(slow = false) {
    SFX.play('tap');
    const p = plan();
    const text = p.kind !== 'authored' ? p.target : turn().cue || turn().sample || '';
    if (text) void Voice.speak(text, { npcId: 'coach', slow, preferredURI: store().state.voiceURI });
  }

  /* ---------- Chấm sao và XP cho lượt hiện tại ---------- */
  function awardTurn(res: EvalResult, isQuiz = false) {
    evalResult = res;
    const t = turn();
    if (res.stars === 0) {
      SFX.play('error');
      micPhase = 'idle';
      toast('Chưa nghe rõ hoặc chưa khớp mẫu câu. Thử lại nhé.', 'warn');
      render();
      return;
    }
    const s = store();
    s.recordPhraseStars(`${baseScene.id}-${turnIdx}`, res.stars);
    for (let i = 0; i < res.stars; i++) window.setTimeout(() => SFX.play('star'), i * 190);
    micPhase = 'done';

    const bonusXp = s.bonusOf('xp');
    const prev = turnStars[turnIdx] || 0;
    let xp = 0;
    // 1. Speaking XP: khi vượt số sao tốt nhất của lượt (không áp dụng cho chọn đáp án)
    if (!isQuiz && res.stars > prev) {
      const add = Math.round(((res.stars - prev) * 5 + (prev === 0 ? 5 : 0)) * (1 + bonusXp));
      xp += add;
      speakingXp += add;
    }
    // 2. Listening XP: một lần mỗi lượt khi đạt từ 1 sao
    if (!listeningAwarded[turnIdx]) {
      const base = t.mode === 'quiz' ? 8 : t.mode === 'catch' ? 4 + 2 * (t.catchAnswers?.length || 1) : 4;
      const afterMistakes = Math.max(1, base - 2 * mistakes);
      const reflexBonus = t.mode === 'quiz' && t.reflex && !reflexExpired ? 5 : 0;
      const add = Math.round((afterMistakes * (revealed ? 1 : 2) + reflexBonus) * (1 + bonusXp));
      xp += add;
      listeningXp += add;
      listeningAwarded[turnIdx] = true;
    }
    if (xp > 0) s.gain({ xp });
    turnStars[turnIdx] = Math.max(turnStars[turnIdx], res.stars);
    s.unlockPhrase(`${baseScene.id}-${turnIdx}`);
    revealed = true;
    if (t.mode !== 'free' && t.mode !== 'quiz' && res.tokens.length > 0) {
      s.addWeakWordsFromTokens(baseScene.id, t.cue || t.sample || '', res.tokens);
    }
    render();
  }

  function evaluateAndAward(candidates: string[]) {
    micPhase = 'analyzing';
    const t = turn();
    const p = plan();
    if (p.kind !== 'authored') {
      // Tự nói: chấm theo ý (các từ mang nghĩa của câu mẫu), không đòi đúng từng chữ
      let res = evaluateRecallCandidates(p.target, candidates);
      const capped = (p.kind === 'recall' && !p.hint && hintAsked) || (p.kind === 'react' && reflexExpired);
      if (capped && res.stars > 2) res = { ...res, stars: 2 };
      if (evalResult && evalResult.score > res.score) res = { ...evalResult, transcript: res.transcript };
      if (res.stars >= 2) selfPass.add(turnIdx);
      awardTurn(res);
      return;
    }
    const res = evaluateTurnCandidates(t, candidates);
    // Đọc theo thẻ / bắt từ: cộng dồn, từ đã đúng một lần thì giữ là đúng
    const cumulative = t.mode === 'scripted' || t.mode === 'catch';
    awardTurn(cumulative ? mergeAttempts(evalResult, res) : res);
  }

  const practiceChunk = () => (evalResult && evalResult.tokens.length > 0 ? focusChunk(evalResult.tokens) : null);

  async function playChunkWords() {
    const chunk = practiceChunk();
    if (!chunk) return;
    SFX.play('tap');
    const my = attempt;
    for (const w of chunk.weak) {
      if (attempt !== my) return;
      await Voice.speak(w.toLowerCase(), { npcId: 'coach', slow: true });
    }
  }

  /** Thu âm riêng cụm còn sai rồi ghi kết quả vào câu */
  async function chunkMic() {
    const chunk = practiceChunk();
    if (!chunk || !evalResult) return;
    if (chunkRec) return SpeechEngine.stop();
    const base = evalResult;
    const my = ++attempt;
    Voice.stop();
    chunkRec = true;
    interim = '';
    render();
    const res = await SpeechEngine.listen({
      onInterim: (txt) => {
        if (attempt !== my) return;
        interim = txt;
        heardText.textContent = `“${txt}”`;
      },
    });
    chunkRec = false;
    if (attempt !== my || disposed) return;
    if (res.reason === 'aborted') return render();
    if (res.reason === 'error' || (!res.transcript && res.reason === 'no-speech')) {
      showFallback = true;
      toast('Không nghe rõ. Đọc lại cụm này, hoặc gõ thay mic.', 'warn', 2800);
      return render();
    }
    const candidates = res.alternatives.length > 0 ? res.alternatives : [res.transcript];
    let best: EvalResult | null = null;
    for (const c of candidates) {
      const r = evaluateScripted(chunk.text, c);
      if (!best || r.score > best.score) best = r;
    }
    if (!best) return render();
    const merged = applyChunkAttempt(base, chunk, best);
    const still = focusChunk(merged.tokens);
    awardTurn({ ...merged, transcript: best.transcript });
    if (!still) toast('Đã đúng hết các từ trong câu.', 'success', 2200);
    else if (still.start !== chunk.start || still.weak.length < chunk.weak.length) toast('Cụm này tốt hơn rồi. Luyện tiếp cụm còn lại nhé.', 'success', 2200);
  }

  function catchWord(word: string) {
    if (micPhase !== 'locked') return;
    const answers = turn().catchAnswers || [];
    // Nhận từ đúng theo bất kỳ thứ tự nào: ô trống đầu tiên còn thiếu đúng từ này
    const hit = answers.findIndex((a, i) => !caught.includes(i) && a.toLowerCase() === word.toLowerCase());
    if (hit >= 0) {
      SFX.play('pop');
      caught = [...caught, hit];
      if (caught.length >= answers.length) {
        SFX.play('ting');
        micPhase = 'idle';
        toast('Đã bắt đủ từ khoá. Bấm mic để đọc cả câu.', 'success');
      }
    } else {
      SFX.play('error');
      mistakes += 1;
      wrongCatch = [...wrongCatch, word];
      flashShake(`w:${word}`);
      toast('Chưa đúng từ vừa nghe (−2 Listening XP)', 'warn', 1600);
    }
    render();
  }

  function pickOption(idx: number) {
    if (micPhase === 'done') return;
    const t = turn();
    const opt = t.options?.[idx];
    if (!opt) return;
    if (opt.ok) {
      stopReflex();
      quizPicked = idx;
      const revealPenalty = revealed && !store().state.items.inear ? 1 : 0;
      const reflexPenalty = t.reflex && reflexExpired ? 1 : 0;
      const stars = clamp(3 - mistakes - revealPenalty - reflexPenalty, 1, 3) as 1 | 2 | 3;
      awardTurn({ score: stars * 33 + 1, stars, transcript: opt.t, tokens: [] }, true);
    } else {
      SFX.play('error');
      mistakes += 1;
      quizWrong = [...quizWrong, idx];
      flashShake(`q:${idx}`);
      toast('Đáp án chưa khớp với điều vừa nghe.', 'error', 1800);
      render();
    }
  }

  function flashShake(key: string) {
    shakeKey = key;
    window.setTimeout(() => {
      if (shakeKey === key) shakeKey = null;
    }, 380);
  }

  async function micPress() {
    if (micPhase === 'locked') {
      SFX.play('error');
      return toast('Chạm chọn đủ các từ còn trống trước khi mở mic.', 'warn');
    }
    if (chunkRec) return SpeechEngine.stop(); // đang thu riêng một cụm: nút chính chỉ dừng lượt thu đó
    if (micPhase === 'arming') {
      SpeechEngine.abort();
      micPhase = 'idle';
      return render();
    }
    if (micPhase === 'rec') return SpeechEngine.stop();
    if (plan().kind === 'react') stopReflex(); // đã kịp bấm mic

    const my = ++attempt;
    micPhase = 'arming';
    interim = '';
    render();
    const res = await SpeechEngine.listen({
      onInterim: (txt) => {
        if (attempt !== my) return;
        const first = micPhase !== 'rec';
        micPhase = 'rec';
        interim = txt;
        if (first) render();
        else heardText.textContent = `“${txt}”`;
      },
    });
    if (attempt !== my || disposed) return;
    if (res.reason === 'aborted') {
      micPhase = 'idle';
      return render();
    }
    if (res.reason === 'error' || (!res.transcript && res.reason === 'no-speech')) {
      micPhase = 'idle';
      showFallback = true;
      toast(
        res.error === 'unsupported'
          ? 'Trình duyệt này chưa hỗ trợ thu âm. Đã mở ô gõ thay mic.'
          : 'Không nghe rõ. Nói lại, hoặc gõ thay mic ở bên dưới.',
        'warn',
        3200
      );
      return render();
    }
    evaluateAndAward(res.alternatives.length > 0 ? res.alternatives : [res.transcript]);
  }

  function nextTurn(skip: boolean) {
    if (!skip && (turnStars[turnIdx] || 0) < 1) {
      SFX.play('error');
      return toast('Cần ít nhất 1 sao, hoặc bấm Bỏ qua.', 'warn');
    }
    SFX.play('tap');
    if (turnIdx + 1 < turns.length) {
      turnIdx += 1;
      return beginTurn();
    }
    attempt += 1;
    Voice.stop();
    SpeechEngine.abort();
    stopReflex();
    const s = store();
    const added = s.recordStageLearning({
      scriptKey,
      sceneId: baseScene.id,
      unsupportedPasses: selfPass.size,
      chunkIds: (CHUNKS_BY_SCRIPT[scriptKey] || []).map((c) => c.id),
    });
    if (added > 0) toast(`${added} cụm mới vào phần Khởi động ngày mai`, 'success', 3200);
    s.finishScene([...turnStars], speakingXp, listeningXp);
    finished = true;
    render();
  }

  function leave() {
    if (!leaveArmed) {
      leaveArmed = true;
      window.setTimeout(() => {
        leaveArmed = false;
        if (!disposed && !finished) renderTop();
      }, 3000);
      return renderTop();
    }
    opts.onExit(false);
  }

  /* ---------- Vẽ ---------- */
  const starsEl = (n: number) => h('span', { class: 'stars' }, '★'.repeat(n), h('span', { class: 'off' }, '★'.repeat(3 - n)));

  function renderTop() {
    clear(topEl);
    const played = turnStars.filter((s) => s > 0);
    const avg = played.length ? Math.round(played.reduce((a, b) => a + b, 0) / played.length) : 0;
    topEl.append(
      h('button', { class: 'btn quiet', onclick: leave }, leaveArmed ? 'Chạm lần nữa để rời' : 'Rời'),
      h(
        'div',
        { class: 'info' },
        h('div', { class: 'ttl' }, dayScript.title || baseScene.title),
        h(
          'div',
          { class: 'prog' },
          h('div', { class: 'bar' }, h('i', { style: { width: `${Math.round(((turnIdx + 1) / turns.length) * 100)}%` } })),
          `Lượt ${turnIdx + 1}/${turns.length}`
        )
      ),
      starsEl(avg)
    );
  }

  let reflexPill: HTMLElement | null = null;
  function paintReflex() {
    if (!reflexPill || reflexLeft === null) return;
    const reacting = plan().kind === 'react';
    reflexPill.className = `pill${reflexLeft <= 5 ? ' warn' : ''}`;
    reflexPill.textContent = reacting ? (reflexLeft > 0 ? `Bấm mic trong ${reflexLeft}s` : 'Hết giờ: tối đa 2 sao') : `Phản xạ: ${reflexLeft}s`;
  }

  function modeLabel(): string {
    const p = plan();
    const m = turn().mode;
    if (p.kind === 'react') return 'Phản xạ nói';
    if (p.kind === 'recall') return 'Tự nói, không có thẻ';
    if (m === 'catch') return 'Bắt từ rồi nói';
    if (m === 'semi') return 'Điền ô rồi nói';
    if (m === 'free') return 'Ứng biến tự do';
    if (m === 'quiz') return 'Phản xạ nghe hiểu';
    return 'Đọc theo thẻ nhắc';
  }

  function listenCard(): HTMLElement {
    const t = turn();
    return h(
      'section',
      { class: 'panel card' },
      h(
        'div',
        { class: 'head' },
        h('span', { class: 'who' }, t.channel === 'inear' ? 'Tai nghe · ' : 'Nghe · ', h('b', null, npcName())),
        !revealed ? h('span', { class: 'pill' }, 'Ẩn chữ: ×2 XP nghe') : null
      ),
      !revealed
        ? h(
            'button',
            { class: 'hidden-line', onclick: () => playNpc(false) },
            h('span', { class: `wave${npcSpeaking ? ' on' : ''}` }, ...[1, 2, 3, 4, 5, 6, 7].map(() => h('i'))),
            'Chạm để nghe lại'
          )
        : h('p', { class: 'npc-line' }, `“${t.npc}”`),
      revealed && translated && support.npcToggle ? h('p', { class: 'vi' }, t.npcVi) : null,
      h(
        'div',
        { class: 'chips' },
        h('button', { class: 'btn quiet', onclick: () => playNpc(false) }, 'Nghe lại'),
        h('button', { class: 'btn quiet', onclick: () => playNpc(true) }, 'Nghe chậm'),
        !revealed
          ? h('button', { class: 'btn quiet', onclick: () => { SFX.play('page'); revealed = true; render(); } }, 'Hiện chữ')
          : support.npcToggle
          ? h('button', { class: 'btn quiet', onclick: () => { SFX.play('tap'); translated = !translated; render(); } }, translated ? 'Ẩn dịch' : 'Dịch')
          : null
      )
    );
  }

  function taskCard(): HTMLElement {
    const t = turn();
    const p = plan();
    const selfSpeak = p.kind !== 'authored';
    const reacting = p.kind === 'react';
    const hintVisible = p.kind === 'recall' ? p.hint || hintAsked : stage <= 1 || hintAsked;
    const card = h('section', { class: 'panel card' });
    reflexPill = null;

    const head = h('div', { class: 'head' }, h('span', { class: 'pill' }, modeLabel()));
    if (stage === 0 && (t.mode === 'scripted' || t.mode === 'catch') && !evalResult) {
      head.append(
        h('button', { class: 'link', onclick: () => { selfTalk = !selfTalk; beginTurn(); } }, selfTalk ? 'Hiện lại thẻ' : 'Thử không nhìn thẻ')
      );
    }
    if ((t.mode === 'quiz' || reacting) && reflexLeft !== null && !(reacting && evalResult)) {
      reflexPill = h('span', { class: 'pill' });
      paintReflex();
      head.append(reflexPill);
    }
    card.append(head);

    if (selfSpeak) {
      // Tự nói: không có câu tiếng Anh để đọc. Nói xong mới hiện câu mẫu để so.
      if (!evalResult) {
        card.append(
          h('p', { class: 'npc-line' }, reacting ? `Đáp lại ${npcName()} ngay bằng lời, không cần đúng từng chữ.` : `Tự đáp lại ${npcName()} bằng tiếng Anh.`)
        );
        if (t.cueVi) {
          card.append(
            hintVisible
              ? h('div', { class: 'note-box' }, h('span', { class: 'big' }, t.cueVi))
              : h('button', { class: 'btn quiet', onclick: () => { hintAsked = true; render(); } }, 'Xin gợi ý tiếng Việt (tối đa 2 sao)')
          );
        }
      } else {
        append(card, [
          h('span', { class: 'who' }, 'Câu mẫu (chạm để nghe)'),
          h('button', { class: 'opt picked', onclick: () => playSample(false) }, p.target),
          t.cueVi ? h('p', { class: 'vi' }, t.cueVi) : null,
          (evalResult.missingKeywords?.length ?? 0) > 0 ? h('p', { class: 'vi' }, `Ý còn thiếu: ${evalResult.missingKeywords!.join(', ')}`) : null,
        ]);
      }
    } else if (t.mode === 'scripted' || t.mode === 'catch' || !t.mode) {
      if (t.mode === 'catch' && micPhase === 'locked') {
        // Bắt từ: câu có ô trống, chạm đúng các từ NPC vừa nói
        const line = h('p', { class: 'say' });
        let ans = 0;
        for (const part of (t.cueRaw || t.cue || '').split(/(\{[^}]+\})/g)) {
          if (part.startsWith('{') && part.endsWith('}')) {
            const filled = caught.includes(ans++);
            line.append(h('span', { class: `blank${filled ? ' filled' : ''}` }, filled ? part.slice(1, -1) : ' '));
          } else if (part.trim()) line.append(h('span', null, part.trim()));
        }
        const answers = t.catchAnswers || [];
        const pool = [...answers, ...(t.catch || [])]
          .map((w, i) => ({ w, k: Math.sin(turnIdx * 17 + i * 31) }))
          .sort((a, b) => a.k - b.k)
          .map((x) => x.w);
        const chips = h('div', { class: 'chips' });
        for (const w of pool) {
          const same = (a: string) => a.toLowerCase() === w.toLowerCase();
          const used = answers.some(same) && answers.every((a, i) => !same(a) || caught.includes(i));
          // Chỉ khoá từ gây nhiễu; từ là đáp án không bao giờ bị khoá vì chọn sai lượt
          const wrong = wrongCatch.includes(w) && !answers.some(same);
          chips.append(
            h('button', { class: `chip${used ? ' used' : wrong ? ' wrong' : ''}${shakeKey === `w:${w}` ? ' shake' : ''}`, disabled: used || wrong, onclick: () => catchWord(w) }, w)
          );
        }
        card.append(line, chips);
      } else {
        const line = h('p', { class: 'say' });
        if (evalResult && evalResult.tokens.length > 0) {
          for (const tok of evalResult.tokens) {
            line.append(
              h(
                'button',
                { class: `tok ${tok.status === 'ok' ? 'ok' : tok.status === 'near' ? 'near' : 'bad'}`, title: 'Chạm để nghe từ này', onclick: () => void Voice.speak(tok.clean || tok.word, { preferredURI: store().state.voiceURI }) },
                tok.word
              )
            );
          }
        } else for (const w of (t.cue || '').split(/\s+/)) line.append(h('span', null, w));
        card.append(line);
        const chunk = practiceChunk();
        if (chunk) {
          card.append(
            h(
              'div',
              { class: 'note-box focus', dataset: { chunk: '1' } },
              'Chỉ cần luyện lại cụm này. Các từ xanh đã được tính, không phải đọc lại.',
              h('span', { class: 'big' }, `“${chunk.text}”`),
              h(
                'div',
                { class: 'chips' },
                h('button', { class: 'btn quiet', onclick: () => void playChunkWords() }, `Nghe: ${chunk.weak.join(', ')}`),
                h('button', { class: `btn ${chunkRec ? 'rec' : ''}`, style: { width: 'auto', flex: '1' }, disabled: micPhase === 'rec' || micPhase === 'arming', onclick: () => void chunkMic() }, chunkRec ? 'Dừng và chấm cụm' : 'Đọc riêng cụm này')
              )
            )
          );
        }
        if (t.cueVi && support.cueVi) card.append(h('p', { class: 'vi' }, t.cueVi));
      }
    }

    if (t.mode === 'semi') {
      card.append(h('p', { class: 'say' }, t.frame || ''));
      if (t.cueVi && support.cueVi) card.append(h('p', { class: 'vi' }, t.cueVi));
      card.append(h('div', { class: 'chips' }, ...(t.blankPool || []).map((g, i) => h('span', { class: 'kw' }, `Ô ${i + 1}: ${g.join(' / ')}`))));
    }

    if (t.mode === 'free') {
      card.append(h('p', { class: 'npc-line' }, `Nhiệm vụ: ${t.task || ''}`));
      if (support.taskVi && t.taskVi) card.append(h('p', { class: 'vi' }, t.taskVi));
      card.append(
        h(
          'div',
          { class: 'chips' },
          ...(t.requiredKeywords || []).map((g) => h('span', { class: `kw${evalResult?.matchedKeywords?.includes(g[0]) ? ' hit' : ''}` }, `Cần có: ${g.slice(0, 3).join(' / ')}`)),
          ...(t.bonusKeywords || []).map((g) => h('span', { class: 'kw' }, `Thưởng: ${g.slice(0, 2).join(' / ')}`))
        )
      );
      if (t.sample) card.append(h('p', { class: 'vi' }, `Gợi ý mẫu: “${t.sample}”`));
    }

    if (!selfSpeak && t.mode === 'quiz') {
      card.append(h('p', { class: 'npc-line' }, t.question || ''));
      (t.options || []).forEach((opt, idx) => {
        const wrong = quizWrong.includes(idx);
        card.append(
          h('button', { class: `opt${quizPicked === idx ? ' picked' : wrong ? ' wrong' : ''}${shakeKey === `q:${idx}` ? ' shake' : ''}`, disabled: micPhase === 'done' || wrong, onclick: () => pickOption(idx) }, opt.t)
        );
      });
    }

    if (evalResult?.grammarIssues?.length) {
      card.append(h('div', { class: 'note-box focus' }, 'Gợi ý sửa:', ...evalResult.grammarIssues.map((g) => h('span', null, `“${g.wrong}” → “${g.fix}”`))));
    }
    if (support.tip && t.tip) card.append(h('div', { class: 'note-box' }, t.tip));

    if (interim || evalResult) {
      heardText.textContent = `“${evalResult ? evalResult.transcript : interim}”`;
      card.append(
        h(
          'div',
          { class: 'heard' },
          h('span', null, 'Máy nghe được: ', heardText),
          evalResult ? h('span', { class: 'score' }, `${evalResult.score}% `, starsEl(evalResult.stars)) : null
        )
      );
    }
    return card;
  }

  function renderMic() {
    clear(micEl);
    const t = turn();
    const p = plan();
    const selfSpeak = p.kind !== 'authored';
    const isQuiz = t.mode === 'quiz' && !selfSpeak;
    const got = (turnStars[turnIdx] || 0) >= 1;
    const last = turnIdx + 1 >= turns.length;

    if (!isQuiz) {
      const label =
        micPhase === 'locked'
          ? 'Bắt từ trước đã'
          : micPhase === 'arming'
          ? 'Đang mở mic…'
          : micPhase === 'rec'
          ? 'Dừng và chấm điểm'
          : evalResult && evalResult.stars > 0
          ? evalResult.stars >= 3
            ? 'Đọc lại cả câu'
            : 'Đọc lại cả câu để lấy 3 sao'
          : 'Chạm để nói';
      micEl.append(
        h('button', { class: `btn main${micPhase === 'rec' ? ' rec' : micPhase === 'arming' || micPhase === 'locked' ? ' wait' : got ? ' quiet' : ''}`, style: { width: '100%' }, onclick: () => void micPress() }, label)
      );
    }
    const row = h('div', { class: 'row' });
    if (!isQuiz) {
      row.append(
        h('button', { class: 'btn quiet', disabled: selfSpeak && !evalResult, title: selfSpeak && !evalResult ? 'Nói thử trước, rồi mới nghe câu mẫu' : '', onclick: () => playSample(false) }, 'Mẫu'),
        h('button', { class: 'btn quiet', disabled: selfSpeak && !evalResult, ariaLabel: 'Nghe câu mẫu chậm', onclick: () => playSample(true) }, 'Chậm'),
        h('button', { class: 'btn quiet', ariaLabel: 'Gõ thay mic', ariaPressed: String(showFallback), onclick: () => { showFallback = !showFallback; renderMic(); } }, 'Gõ')
      );
    }
    row.append(
      h('span', { class: 'grow' }),
      h('button', { class: 'link', onclick: () => nextTurn(true) }, 'Bỏ qua'),
      h('button', { class: `btn${got ? '' : ' quiet'}`, style: { width: 'auto' }, disabled: !got, onclick: () => nextTurn(false) }, last ? 'Kết thúc' : 'Tiếp')
    );
    micEl.append(row);
    if (showFallback && !isQuiz) {
      micEl.append(
        h(
          'form',
          {
            onsubmit: (e: Event) => {
              e.preventDefault();
              if (manual.value.trim()) evaluateAndAward([manual.value]);
            },
          },
          manual,
          h('button', { class: 'btn', type: 'submit', style: { width: 'auto' } }, 'Chấm')
        )
      );
    }
  }

  function renderResult() {
    const r = store().resultSummary;
    const { charisma } = store().state;
    clear(topEl);
    clear(micEl);
    micEl.style.display = 'none';
    clear(bodyEl);
    bodyEl.append(
      h(
        'section',
        { class: 'panel result' },
        h('span', { class: 'eyebrow' }, dayScript.title || baseScene.title),
        h('div', { class: 'big-stars' }, starsEl(r?.roundedStars ?? 0)),
        h('h2', null, r?.objectiveMet ? 'Đạt mục tiêu bài học' : 'Hoàn thành, chưa đạt mục tiêu'),
        h(
          'div',
          { class: 'grid' },
          h('div', { class: 'cell' }, h('b', null, `+${r?.charismaEarned ?? 0}`), h('span', null, 'Điểm thang nghề')),
          h('div', { class: 'cell' }, h('b', null, `+${r?.xpEarned ?? 0}`), h('span', null, 'XP nói và nghe')),
          h('div', { class: 'cell' }, h('b', null, (r?.avgStars ?? 0).toFixed(1)), h('span', null, 'Sao trung bình')),
          h('div', { class: 'cell' }, h('b', null, `Lv.${charisma.lv}`), h('span', null, 'Cấp hiện tại'))
        ),
        h('button', { class: 'btn', onclick: () => opts.onExit(true) }, 'Luyện lại bài này'),
        h('button', { class: 'btn quiet', style: { width: '100%' }, onclick: () => opts.onExit(false) }, 'Về danh sách')
      )
    );
  }

  function render() {
    if (disposed) return;
    if (finished) return renderResult();
    renderTop();
    const keep = bodyEl.scrollTop;
    clear(bodyEl);
    bodyEl.append(listenCard(), taskCard());
    bodyEl.scrollTop = keep;
    renderMic();
    // Đưa khung luyện cụm vào tầm nhìn để người học thấy ngay việc cần làm
    bodyEl.querySelector('[data-chunk]')?.scrollIntoView({ block: 'nearest' });
  }

  beginTurn();

  return () => {
    disposed = true;
    attempt += 1;
    stopReflex();
    window.clearTimeout(speakTimer);
    Voice.stop();
    SpeechEngine.abort();
    offViseme();
    screen.remove();
  };
}
