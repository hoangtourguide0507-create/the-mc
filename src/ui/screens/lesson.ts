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
import { INCIDENT_SECONDS, evaluateIncident, incidentGroupOf, planIncidents, type Incident, type IncidentResult } from '../../core/incident';
import { PERFORM_TRIES, applyImprove, applyIncident, applyMiss, applySkip, applyTurn, moodOf, multiplier, newShow, performBonus, verdict, type TurnOutcome } from '../../core/show';
import { INCIDENTS } from '../../data/incidents';
import { gameStore } from '../../core/store';
import { viSupport } from '../../core/support';
import { CHUNKS_BY_SCRIPT } from '../../data/chunks';
import { NPCS, SCENES, scenarioForDay, scriptList } from '../../data/content';
import { SCENE_OBJECTIVES } from '../../data/objectives';
import type { EvalResult, StageMicPhase } from '../../types/game';
import type { LiveStage } from '../../scenes/LiveStage';
import { append, clear, h } from '../dom';

export interface LessonOptions {
  /** Rời bài hoặc xong bài; `again` = người học muốn luyện lại ngay bài này */
  onExit: (again: boolean) => void;
  /** Sân khấu 3D phản ứng theo buổi diễn (không có thì chỉ chạy phần HTML) */
  live?: LiveStage;
  /** Chế độ Diễn: mỗi lượt nói một lần, không gợi ý, tính danh tiếng. Mặc định là Tập. */
  perform?: boolean;
  /** Bối cảnh sân khấu, dùng để chọn sự cố đúng thể loại */
  theme?: string;
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
  /** Buổi diễn sống: thanh khán giả, chuỗi liên tiếp, điểm diễn */
  let show = newShow();
  let turnClean = true;
  const live = opts.live;
  const perform = Boolean(opts.perform);
  /** Sự cố bất ngờ: Tập có 1, Diễn có 2; chen vào sau lượt có chỉ số là khoá của Map */
  const incidents = planIncidents(INCIDENTS, incidentGroupOf(opts.theme || 'lounge'), turns.length, perform ? 2 : 1, Math.random);
  let inc: { data: Incident; phase: 'ask' | 'rec' | 'done'; left: number; inTime: boolean; res: IncidentResult | null } | null = null;
  let incTimer = 0;
  /** Số lần đã nói ở lượt hiện tại (để khoá lượt khi Diễn) */
  let tries = 0;
  const performLocked = () => perform && ((evalResult?.stars ?? 0) > 0 || tries >= PERFORM_TRIES);

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
  // Nửa trên là sân khấu 3D (trong suốt), phủ lên đó là thanh trên, thanh khán giả và bong bóng thoại.
  // Nửa dưới là thẻ nhắc lời và thanh mic.
  const heatFill = h('i');
  const moodEl = h('span', { class: 'mood' });
  const streakEl = h('span', { class: 'streak' });
  const scoreEl = h('b', { class: 'pts' }, '0');
  const meterEl = h('div', { class: 'l-meter' }, h('div', { class: 'top' }, moodEl, streakEl, scoreEl), h('div', { class: 'heat' }, heatFill));
  const fxEl = h('div', { class: 'l-fx', ariaHidden: 'true' });
  const bubbleEl = h('div', { class: 'l-bubble' });
  const stageEl = h('div', { class: 'l-stage' }, topEl, meterEl, fxEl, bubbleEl);
  const sheetEl = h('div', { class: 'l-sheet' }, bodyEl, micEl);
  const screen = h('div', { class: 'lesson live' }, stageEl, sheetEl);
  root.append(screen);

  const MOOD_LABEL = { cold: 'Khán phòng nguội', warm: 'Khán giả theo dõi', hot: 'Khán phòng sôi động' } as const;
  function paintMeter() {
    const mood = moodOf(show.heat);
    meterEl.dataset.mood = mood;
    heatFill.style.width = `${show.heat}%`;
    moodEl.textContent = MOOD_LABEL[mood];
    streakEl.textContent = show.streak >= 2 ? `Chuỗi ${show.streak} · ×${multiplier(show.streak).toFixed(1)}` : '';
    streakEl.classList.toggle('on', show.streak >= 2);
    scoreEl.textContent = show.score.toLocaleString('vi-VN');
  }
  /** Chữ nổi bay lên trên sân khấu (điểm cộng, mất chuỗi) */
  function pop(text: string, tone: 'good' | 'bad' = 'good') {
    const el = h('span', { class: `pop ${tone}` }, text);
    fxEl.append(el);
    window.setTimeout(() => el.remove(), 1400);
  }
  /** Ghi một kết quả vào buổi diễn và cho khán phòng phản ứng */
  function react(o: TurnOutcome, cheer: 0 | 1 | 2 | 3) {
    const before = show.streak;
    show = o.state;
    paintMeter();
    live?.setHeat(show.heat / 100);
    if (cheer > 0) {
      live?.cheer(cheer as 1 | 2 | 3);
      SFX.play(cheer === 3 ? 'applause' : 'clap');
      if (o.points > 0) pop(`+${o.points}${show.streak >= 2 ? `  ×${multiplier(show.streak).toFixed(1)}` : ''}`);
      if (cheer === 3) navigator.vibrate?.(30);
    } else {
      live?.murmur();
      SFX.play('murmur');
      navigator.vibrate?.([20, 40, 20]);
    }
    if (o.streakBroken) pop(`Mất chuỗi ${before}`, 'bad');
    meterEl.classList.remove('bump');
    void meterEl.offsetWidth;
    meterEl.classList.add('bump');
  }
  /** Từ nào trong thẻ nhắc đã nghe thấy thì sáng lên ngay khi đang nói */
  function paintLive(txt: string) {
    const heard = txt.toLowerCase().replace(/[^a-z0-9' ]/g, ' ').split(/\s+/).filter(Boolean);
    let from = 0;
    bodyEl.querySelectorAll<HTMLElement>('.say .w').forEach((el) => {
      const clean = (el.textContent || '').toLowerCase().replace(/[^a-z0-9']/g, '');
      const at = clean ? heard.indexOf(clean, from) : -1;
      if (at >= 0) {
        el.classList.add('lit');
        from = at + 1;
      }
    });
  }
  paintMeter();
  live?.setHeat(show.heat / 100);

  const offViseme = Voice.onViseme((v) => {
    const on = v !== 'rest';
    if (on === npcSpeaking) return;
    npcSpeaking = on;
    screen.querySelector('.wave')?.classList.toggle('on', on);
    live?.setTalking(on ? 'guest' : null);
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
    tries = 0;
    turnClean = true;
    live?.setFocus('guest');
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
    if (!isQuiz) tries += 1;
    const t = turn();
    if (res.stars === 0) {
      SFX.play('error');
      turnClean = false;
      react(applyMiss(show), 0);
      micPhase = performLocked() ? 'done' : 'idle';
      toast(performLocked() ? 'Lượt này chưa đạt. Show vẫn phải tiếp tục.' : perform ? 'Chưa nghe rõ. Bạn còn một lần nói cho lượt này.' : 'Chưa nghe rõ hoặc chưa khớp mẫu câu. Thử lại nhé.', 'warn');
      render();
      return;
    }
    const s = store();
    s.recordPhraseStars(`${baseScene.id}-${turnIdx}`, res.stars);
    for (let i = 0; i < res.stars; i++) window.setTimeout(() => SFX.play('star'), i * 190);
    micPhase = 'done';

    const bonusXp = s.bonusOf('xp');
    const prev = turnStars[turnIdx] || 0;
    // Buổi diễn: kết quả đầu tiên của lượt quyết định chuỗi; nói lại chỉ gỡ điểm
    if (prev === 0) react(applyTurn(show, res.stars as 1 | 2 | 3, turnClean && mistakes === 0), res.stars as 1 | 2 | 3);
    else if (res.stars > prev) react(applyImprove(show, prev, res.stars), 1);
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

  // Diễn thì không có luyện lại từng cụm
  const practiceChunk = () => (!perform && evalResult && evalResult.tokens.length > 0 ? focusChunk(evalResult.tokens) : null);

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
      turnClean = false;
      react(applyMiss(show), 0);
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
    if (performLocked()) return toast('Khi Diễn, mỗi lượt chỉ nói một lần. Bấm Tiếp.', 'info', 2200);
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
    live?.setFocus('mc');
    live?.setTalking('mc');
    render();
    const res = await SpeechEngine.listen({
      onInterim: (txt) => {
        if (attempt !== my) return;
        const first = micPhase !== 'rec';
        micPhase = 'rec';
        interim = txt;
        if (first) render();
        else heardText.textContent = `“${txt}”`;
        paintLive(txt);
      },
    });
    if (attempt === my) live?.setTalking(null);
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
    if (!skip && (turnStars[turnIdx] || 0) < 1 && !performLocked()) {
      SFX.play('error');
      return toast('Cần ít nhất 1 sao, hoặc bấm Bỏ qua.', 'warn');
    }
    SFX.play('tap');
    if ((turnStars[turnIdx] || 0) < 1) react(applySkip(show), 0);
    const hit = incidents.get(turnIdx);
    if (hit) {
      incidents.delete(turnIdx);
      return startIncident(hit);
    }
    advance();
  }

  /* ---------- Sự cố bất ngờ: một câu ứng biến, chỉ một lần nói, có đồng hồ ---------- */
  function stopIncClock() {
    if (incTimer) window.clearInterval(incTimer);
    incTimer = 0;
  }

  function startIncident(data: Incident) {
    attempt += 1;
    Voice.stop();
    SpeechEngine.abort();
    stopReflex();
    inc = { data, phase: 'ask', left: INCIDENT_SECONDS, inTime: true, res: null };
    interim = '';
    manual.value = '';
    live?.alarm();
    live?.setFocus('mc');
    SFX.play('alarm');
    navigator.vibrate?.([60, 60, 60]);
    render();
    incTimer = window.setInterval(() => {
      if (!inc || inc.phase === 'done') return stopIncClock();
      if (inc.left <= 1) {
        inc.left = 0;
        inc.inTime = false;
        stopIncClock();
      } else inc.left -= 1;
      paintIncClock();
    }, 1000);
  }

  function judgeIncident(candidates: string[]) {
    if (!inc || inc.phase === 'done') return;
    stopIncClock();
    const r = evaluateIncident(inc.data, candidates);
    inc.res = r;
    inc.phase = 'done';
    react(applyIncident(show, r.stars, inc.inTime), r.stars === 3 && inc.inTime ? 3 : r.stars >= 2 ? 2 : 0);
    if (r.stars > 0) {
      const xp = r.stars * 4;
      speakingXp += xp;
      store().gain({ xp });
    }
    render();
  }

  async function incidentMic() {
    if (!inc || inc.phase === 'done') return;
    if (inc.phase === 'rec') return SpeechEngine.stop();
    stopIncClock(); // đã kịp bấm mic
    const my = ++attempt;
    inc.phase = 'rec';
    interim = '';
    live?.setTalking('mc');
    render();
    const res = await SpeechEngine.listen({
      onInterim: (txt) => {
        if (attempt !== my) return;
        interim = txt;
        heardText.textContent = `“${txt}”`;
      },
    });
    if (attempt === my) live?.setTalking(null);
    if (attempt !== my || disposed || !inc) return;
    if (res.reason === 'aborted' || res.reason === 'error' || (!res.transcript && res.reason === 'no-speech')) {
      inc.phase = 'ask';
      showFallback = true;
      if (res.reason !== 'aborted') toast('Không nghe rõ. Nói lại, hoặc gõ thay mic.', 'warn', 2800);
      return render();
    }
    judgeIncident(res.alternatives.length > 0 ? res.alternatives : [res.transcript]);
  }

  let incPill: HTMLElement | null = null;
  function paintIncClock() {
    if (!incPill || !inc) return;
    incPill.className = `pill${inc.left <= 5 ? ' warn' : ''}`;
    incPill.textContent = inc.inTime ? `Bấm mic trong ${inc.left}s` : 'Hết giờ: khán giả đã nhận ra';
  }

  function renderIncident() {
    if (!inc) return;
    const it = inc;
    renderTop();
    clear(bubbleEl);
    clear(bodyEl);
    clear(micEl);
    bubbleEl.append(
      h('section', { class: 'panel card bubble alert' }, h('div', { class: 'head' }, h('span', { class: 'pill warn' }, 'Sự cố bất ngờ')), h('p', { class: 'npc-line' }, it.data.alert))
    );
    incPill = null;
    const card = h('section', { class: 'panel card' });
    const head = h('div', { class: 'head' }, h('span', { class: 'pill' }, 'Ứng biến một câu'));
    if (it.phase !== 'done') {
      incPill = h('span', { class: 'pill' });
      head.append(incPill);
      paintIncClock();
    }
    card.append(head, h('p', { class: 'npc-line' }, it.data.task));
    if (it.res) {
      const r = it.res;
      append(card, [
        h('div', { class: 'chips' }, ...r.matched.map((k) => h('span', { class: 'kw hit' }, `Có ý: ${k}`)), ...r.missing.map((k) => h('span', { class: 'kw' }, `Thiếu ý: ${k}`))),
        h('span', { class: 'who' }, 'Một cách nói (chạm để nghe)'),
        h('button', { class: 'opt picked', onclick: () => void Voice.speak(it.data.sample, { npcId: 'coach', preferredURI: store().state.voiceURI }) }, it.data.sample),
        h('div', { class: 'heard' }, h('span', null, 'Máy nghe được: ', h('i', null, `“${r.transcript}”`)), h('span', { class: 'score' }, r.stars === 3 && !it.inTime ? 'Trễ giờ ' : '', starsEl(r.stars))),
      ]);
    } else if (interim) {
      heardText.textContent = `“${interim}”`;
      card.append(h('div', { class: 'heard' }, h('span', null, 'Máy nghe được: ', heardText)));
    }
    bodyEl.append(card);
    if (it.phase === 'done') {
      micEl.append(
        h('button', { class: 'btn main', style: { width: '100%' }, onclick: () => { inc = null; SFX.play('tap'); advance(); } }, 'Tiếp tục show')
      );
      return;
    }
    micEl.append(
      h('button', { class: `btn main${it.phase === 'rec' ? ' rec' : ''}`, style: { width: '100%' }, onclick: () => void incidentMic() }, it.phase === 'rec' ? 'Dừng và chấm' : 'Chạm để ứng biến'),
      h('div', { class: 'row' }, h('button', { class: 'btn quiet', ariaLabel: 'Gõ thay mic', onclick: () => { showFallback = !showFallback; render(); } }, 'Gõ'), h('span', { class: 'grow' }))
    );
    if (showFallback) {
      micEl.append(
        h('form', { onsubmit: (e: Event) => { e.preventDefault(); if (manual.value.trim()) judgeIncident([manual.value]); } }, manual, h('button', { class: 'btn', type: 'submit', style: { width: 'auto' } }, 'Chấm'))
      );
    }
  }

  /** Sang lượt kế tiếp, hoặc khép show nếu đã hết lượt */
  function advance() {
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
    s.finishScene([...turnStars], speakingXp, listeningXp, { perform, heat: show.heat });
    finished = true;
    // Khép show: khán phòng phản ứng theo độ nóng cuối cùng
    live?.setFocus('wide');
    live?.setTalking(null);
    const end = show.heat >= 70 ? 3 : show.heat >= 45 ? 2 : 1;
    live?.cheer(end, show.heat >= 85);
    SFX.play(end === 3 ? 'applause' : 'clap');
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
        h('div', { class: 'ttl' }, h('span', { class: `mode${perform ? ' live' : ''}` }, perform ? 'Diễn' : 'Tập'), dayScript.title || baseScene.title),
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
      { class: 'panel card bubble' },
      h(
        'div',
        { class: 'head' },
        h('span', { class: 'who' }, t.channel === 'inear' ? 'Tai nghe · ' : 'Nghe · ', h('b', null, npcName())),
        h('span', { class: `wave${npcSpeaking ? ' on' : ''}` }, ...[1, 2, 3, 4, 5, 6, 7].map(() => h('i')))
      ),
      // Chưa hiện chữ thì bong bóng chỉ có tên và sóng âm: nghe trước, đọc sau (×2 XP nghe)
      revealed ? h('p', { class: 'npc-line' }, `“${t.npc}”`) : null,
      revealed && translated && support.npcToggle ? h('p', { class: 'vi' }, t.npcVi) : null,
      h(
        'div',
        { class: 'chips' },
        h('button', { class: 'btn quiet', onclick: () => playNpc(false) }, 'Nghe lại'),
        h('button', { class: 'btn quiet', onclick: () => playNpc(true) }, 'Nghe chậm'),
        perform
          ? null
          : !revealed
          ? h('button', { class: 'btn quiet', title: 'Giữ ẩn chữ để được ×2 XP nghe', onclick: () => { SFX.play('page'); revealed = true; render(); } }, 'Hiện chữ')
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
    if (!perform && stage === 0 && (t.mode === 'scripted' || t.mode === 'catch') && !evalResult) {
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
              : perform
              ? ''
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
        } else for (const w of (t.cue || '').split(/\s+/)) line.append(h('span', { class: 'w' }, w));
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
        if (t.cueVi && support.cueVi && !perform) card.append(h('p', { class: 'vi' }, t.cueVi));
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
      if (t.sample && (!perform || evalResult)) card.append(h('p', { class: 'vi' }, `Gợi ý mẫu: “${t.sample}”`));
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
    if (support.tip && t.tip && !perform) card.append(h('div', { class: 'note-box' }, t.tip));

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
    const locked = performLocked();
    const got = (turnStars[turnIdx] || 0) >= 1 || locked;
    const last = turnIdx + 1 >= turns.length;

    if (!isQuiz) {
      const label =
        locked
          ? 'Đã diễn lượt này'
          : micPhase === 'locked'
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
        h('button', { class: `btn main${micPhase === 'rec' ? ' rec' : micPhase === 'arming' || micPhase === 'locked' ? ' wait' : got ? ' quiet' : ''}`, style: { width: '100%' }, disabled: locked, onclick: () => void micPress() }, label)
      );
    }
    const row = h('div', { class: 'row' });
    if (!isQuiz) {
      if (!perform) row.append(
        h('button', { class: 'btn quiet', disabled: selfSpeak && !evalResult, title: selfSpeak && !evalResult ? 'Nói thử trước, rồi mới nghe câu mẫu' : '', onclick: () => playSample(false) }, 'Mẫu'),
        h('button', { class: 'btn quiet', disabled: selfSpeak && !evalResult, ariaLabel: 'Nghe câu mẫu chậm', onclick: () => playSample(true) }, 'Chậm')
      );
      row.append(
        h('button', { class: 'btn quiet', ariaLabel: 'Gõ thay mic', ariaPressed: String(showFallback), onclick: () => { showFallback = !showFallback; renderMic(); } }, 'Gõ')
      );
    }
    row.append(
      h('span', { class: 'grow' }),
      perform ? '' : h('button', { class: 'link', onclick: () => nextTurn(true) }, 'Bỏ qua'),
      h('button', { class: `btn${got ? '' : ' quiet'}`, style: { width: 'auto' }, disabled: !got, onclick: () => nextTurn(false) }, last ? 'Kết thúc' : 'Tiếp')
    );
    micEl.append(row);
    if (showFallback && !isQuiz && !locked) {
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
    clear(bubbleEl);
    clear(bodyEl);
    screen.classList.add('done');
    const v = verdict(show.heat);
    bodyEl.append(
      h(
        'section',
        { class: 'panel result' },
        h('span', { class: 'eyebrow' }, dayScript.title || baseScene.title),
        h('div', { class: 'big-stars' }, starsEl(r?.roundedStars ?? 0)),
        h('h2', null, v.title),
        h('p', { class: 'vi' }, `${v.line} ${r?.objectiveMet ? 'Đã đạt mục tiêu bài học.' : 'Chưa đạt mục tiêu bài học.'}`),
        h(
          'p',
          { class: 'vi' },
          perform
            ? `Bạn đã Diễn: danh tiếng được tính${performBonus(show.heat) > 1 ? `, điểm thang nghề ×${performBonus(show.heat)}` : ''}.`
            : 'Đây là buổi Tập: chưa tính danh tiếng. Chọn Diễn để tính.'
        ),
        h(
          'div',
          { class: 'grid' },
          h('div', { class: 'cell' }, h('b', null, show.score.toLocaleString('vi-VN')), h('span', null, 'Điểm diễn')),
          h('div', { class: 'cell' }, h('b', null, String(show.bestStreak)), h('span', null, 'Chuỗi dài nhất'))
        ),
        h(
          'div',
          { class: 'grid' },
          h('div', { class: 'cell' }, h('b', null, `+${r?.charismaEarned ?? 0}`), h('span', null, 'Điểm thang nghề')),
          h('div', { class: 'cell' }, h('b', null, `+${r?.xpEarned ?? 0}`), h('span', null, 'XP nói và nghe')),
          h('div', { class: 'cell' }, h('b', null, (r?.avgStars ?? 0).toFixed(1)), h('span', null, 'Sao trung bình')),
          h('div', { class: 'cell' }, h('b', null, `Lv.${charisma.lv}`), h('span', null, 'Cấp hiện tại'))
        ),
        h('button', { class: 'btn', onclick: () => opts.onExit(true) }, perform ? 'Diễn lại bài này' : 'Tập lại bài này'),
        h('button', { class: 'btn quiet', style: { width: '100%' }, onclick: () => opts.onExit(false) }, 'Về danh sách')
      )
    );
  }

  function render() {
    if (disposed) return;
    if (finished) return renderResult();
    if (inc) return renderIncident();
    renderTop();
    const keep = bodyEl.scrollTop;
    clear(bodyEl);
    clear(bubbleEl);
    bubbleEl.append(listenCard());
    bodyEl.append(taskCard());
    bodyEl.scrollTop = keep;
    if (micPhase === 'rec' && interim) paintLive(interim);
    renderMic();
    // Đưa khung luyện cụm vào tầm nhìn để người học thấy ngay việc cần làm
    bodyEl.querySelector('[data-chunk]')?.scrollIntoView({ block: 'nearest' });
  }

  /* ---------- Mở màn: rèm kéo ra, tên sự kiện, rồi mới vào lượt đầu ---------- */
  const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const intro = h(
    'button',
    { class: 'l-intro', ariaLabel: 'Bỏ qua mở màn' },
    h('i', { class: 'drape left' }),
    h('i', { class: 'drape right' }),
    h('span', { class: 'card' }, h('span', { class: 'eyebrow' }, perform ? 'Diễn thật · một lần mỗi lượt' : 'Buổi tập'), h('b', null, dayScript.title || baseScene.title), h('small', null, `${turns.length} lượt · có sự cố bất ngờ`))
  );
  let introTimer = 0;
  const openShow = () => {
    if (!intro.isConnected) return;
    window.clearTimeout(introTimer);
    intro.remove();
    if (!disposed) beginTurn();
  };
  intro.onclick = openShow;
  screen.append(intro);
  renderTop();
  SFX.play('correct');
  live?.cheer(1);
  introTimer = window.setTimeout(openShow, calm ? 600 : 2100);

  return () => {
    disposed = true;
    stopIncClock();
    window.clearTimeout(introTimer);
    attempt += 1;
    stopReflex();
    window.clearTimeout(speakTimer);
    Voice.stop();
    SpeechEngine.abort();
    offViseme();
    screen.remove();
  };
}
