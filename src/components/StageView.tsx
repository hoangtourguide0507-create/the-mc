import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NPCS, SCENES, scenarioForDay } from '../data/content';
import { SCENE_OBJECTIVES } from '../data/objectives';
import { viSupport } from '../core/support';
import { clamp } from '../core/clock';
import { evaluateScripted, evaluateTurnCandidates } from '../core/evaluator';
import { applyChunkAttempt, focusChunk, mergeAttempts } from '../core/retry';
import { evaluateRecallCandidates, planTurn, supportStage } from '../core/recall';
import { CHUNKS_BY_SCRIPT } from '../data/chunks';
import { useGameStore } from '../core/store';
import { STAGE_TOP_PAD } from './HUD';
import {
  EvalResult,
  NpcMood,
  StageMicPhase,
  VisemeType,
} from '../types/game';
import { SFX, SpeechEngine, Voice } from '../audio/audioSystem';
import { Stage3D } from '../three/Stage3D';

export const StageView: React.FC = () => {
  const activeSceneId = useGameStore((s) => s.activeSceneId);
  const stageReturnTo = useGameStore((s) => s.stageReturnTo);
  const state = useGameStore((s) => s.state);
  const bonusOf = useGameStore((s) => s.bonusOf);
  const gain = useGameStore((s) => s.gain);
  const toast = useGameStore((s) => s.toast);
  const goTo = useGameStore((s) => s.goTo);
  const finishScene = useGameStore((s) => s.finishScene);
  const addWeakWordsFromTokens = useGameStore((s) => s.addWeakWordsFromTokens);
  const unlockPhrase = useGameStore((s) => s.unlockPhrase);
  const recordPhraseStars = useGameStore((s) => s.recordPhraseStars);

  const baseScene = SCENES[activeSceneId || 'coffee'] || SCENES.coffee;
  // Lượt thoại đổi theo ngày trong game; nhiệm vụ và sổ tay vẫn dùng baseScene (chỉ số lượt ổn định).
  const dayScript = useMemo(() => scenarioForDay(baseScene, state.day), [baseScene, state.day]);
  const scene = useMemo(() => ({ ...baseScene, turns: dayScript.turns }), [baseScene, dayScript]);
  // Khóa kịch bản để đếm số lần đã gặp: id tình huống, hoặc kịch bản gốc / bộ sinh của cảnh
  const scriptKey = dayScript.scenarioId ?? `${baseScene.id}:${state.day < 2 ? 'base' : 'gen'}`;
  // Mức hỗ trợ chốt lúc vào cảnh: 0 = đủ thẻ, 1 = chỉ gợi ý tiếng Việt, 2 = không gợi ý
  const stage = useMemo(() => supportStage(state.learn.exposure[scriptKey]), [scriptKey]);
  const recordStageLearning = useGameStore((s) => s.recordStageLearning);

  const [turnIdx, setTurnIdx] = useState(0);
  const [turnStars, setTurnStars] = useState<number[]>(() =>
    new Array(scene.turns.length).fill(0)
  );
  const [listeningAwarded, setListeningAwarded] = useState<boolean[]>(() =>
    new Array(scene.turns.length).fill(false)
  );
  const [speakingXpTotal, setSpeakingXpTotal] = useState(0);
  const [listeningXpTotal, setListeningXpTotal] = useState(0);

  // Per-turn state
  const [revealed, setRevealed] = useState(false);
  const [translated, setTranslated] = useState(false);
  const support = viSupport(SCENE_OBJECTIVES[activeSceneId || 'coffee']?.cefr);
  const [npcSpeaking, setNpcSpeaking] = useState(false);
  const [npcViseme, setNpcViseme] = useState<VisemeType>('rest');
  const [playerViseme, setPlayerViseme] = useState<VisemeType>('rest');
  const [npcMood, setNpcMood] = useState<NpcMood>('idle');
  const [micPhase, setMicPhase] = useState<StageMicPhase>('idle');
  const [interimText, setInterimText] = useState('');
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
  // Cụm ngắn còn chứa từ chưa đúng (lượt đọc theo thẻ / bắt từ). Người học luyện riêng cụm này
  // thay vì đọc lại cả câu; evalResult là kết quả cộng dồn của mọi lần đọc trong lượt.
  const [chunkRec, setChunkRec] = useState(false);
  // Tự nói không nhìn thẻ: người học tự bật ở lần gặp đầu (từ lần hai game tự bật)
  const [selfTalk, setSelfTalk] = useState(false);
  // Đã xin gợi ý tiếng Việt ở lượt không có gợi ý (giới hạn 2 sao)
  const [hintAsked, setHintAsked] = useState(false);
  // Các lượt đã tự nói đạt từ 2 sao khi không có thẻ
  const selfPassRef = useRef<Set<number>>(new Set());
  const practiceChunk = useMemo(
    () => (evalResult && evalResult.tokens.length > 0 ? focusChunk(evalResult.tokens) : null),
    [evalResult]
  );
  const chunkPanelRef = useRef<HTMLDivElement | null>(null);
  // Cuộn tới khung luyện cụm khi nó xuất hiện hoặc đổi sang cụm khác, để người học thấy ngay việc cần làm
  useEffect(() => {
    if (practiceChunk) chunkPanelRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [practiceChunk?.start, practiceChunk?.text]);
  const [mistakesCount, setMistakesCount] = useState(0);
  const [caughtIndices, setCaughtIndices] = useState<number[]>([]);
  const [wrongCatchWords, setWrongCatchWords] = useState<string[]>([]);
  const [quizPickedIdx, setQuizPickedIdx] = useState<number | null>(null);
  const [quizWrongIndices, setQuizWrongIndices] = useState<number[]>([]);
  // Briefly holds the last wrong choice so its button can play the shake animation
  const [shakeWord, setShakeWord] = useState<string | null>(null);
  const [shakeQuizIdx, setShakeQuizIdx] = useState<number | null>(null);
  const [reflexLeft, setReflexLeft] = useState<number | null>(null);
  const [reflexExpired, setReflexExpired] = useState(false);
  const [showFallbackBox, setShowFallbackBox] = useState(false);
  const [manualText, setManualText] = useState('');

  // Async cancellation token (++attemptRef.current)
  const attemptRef = useRef(0);
  const reflexTimerRef = useRef<number | null>(null);

  const turn = scene.turns[turnIdx] || scene.turns[0];
  const plan = planTurn(turn, stage, selfTalk);
  /** Lượt này người học phải tự nói, không có câu tiếng Anh để đọc. */
  const selfSpeak = plan.kind !== 'authored';
  const reacting = plan.kind === 'react';
  const hintVisible = plan.kind === 'recall' ? plan.hint || hintAsked : stage <= 1 || hintAsked;
  const currentNpcId = turn.who || scene.npc;
  const currentNpc = NPCS[currentNpcId] || NPCS.leo;

  // Bind Voice viseme events to 3D NPC mouth
  useEffect(() => {
    const unsub = Voice.onViseme((v) => {
      setNpcViseme(v);
      setNpcSpeaking(v !== 'rest');
    });
    return () => {
      unsub();
    };
  }, []);

  // Bind SpeechEngine pulse events to 3D Player mouth
  useEffect(() => {
    const unsub = SpeechEngine.onPulse(() => {
      const pool: VisemeType[] = ['a', 'e', 'o', 'm'];
      setPlayerViseme(pool[Math.floor(Math.random() * pool.length)]);
      window.setTimeout(() => setPlayerViseme('rest'), 140);
    });
    return () => {
      unsub();
    };
  }, []);

  // Shuffled Word-Catcher pool for 'catch' turns
  const catchPool = useMemo(() => {
    if (turn.mode !== 'catch') return [];
    const combined = [...(turn.catchAnswers || []), ...(turn.catch || [])];
    return combined
      .map((w, i) => ({ w, sortKey: Math.sin(turnIdx * 17 + i * 31) }))
      .sort((a, b) => a.sortKey - b.sortKey)
      .map((x) => x.w);
  }, [turn, turnIdx]);

  // Reset turn state and auto-speak NPC line after 350ms
  useEffect(() => {
    const myAttempt = ++attemptRef.current;
    Voice.stop();
    SpeechEngine.abort();
    if (reflexTimerRef.current) {
      window.clearInterval(reflexTimerRef.current);
      reflexTimerRef.current = null;
    }

    setRevealed(false);
    setTranslated(false);
    setNpcMood('idle');
    setEvalResult(null);
    setChunkRec(false);
    setInterimText('');
    setMistakesCount(0);
    setCaughtIndices([]);
    setWrongCatchWords([]);
    setQuizPickedIdx(null);
    setQuizWrongIndices([]);
    setReflexExpired(false);
    setManualText('');
    setHintAsked(false);
    setMicPhase(turn.mode === 'catch' && !selfSpeak ? 'locked' : 'idle');

    // Đồng hồ phản xạ: lượt chọn đáp án có ghi reflex, hoặc lượt phản xạ nói
    const countdown = reacting ? plan.seconds : turn.mode === 'quiz' && turn.reflex ? turn.reflex : 0;
    setReflexLeft(countdown > 0 ? countdown : null);

    const speakTimer = window.setTimeout(async () => {
      if (attemptRef.current !== myAttempt) return;
      await Voice.speak(turn.npc, {
        npcId: currentNpcId,
        speaker: turn.speaker,
        preferredURI: state.voiceURI,
        channel: turn.channel,
      });

      if (attemptRef.current !== myAttempt) return;

      // Start reflex countdown after NPC finishes speaking
      if (countdown > 0) {
        reflexTimerRef.current = window.setInterval(() => {
          setReflexLeft((prev) => {
            if (prev === null) return null;
            if (prev <= 1) {
              if (reflexTimerRef.current) window.clearInterval(reflexTimerRef.current);
              setReflexExpired(true);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }, 350);

    return () => {
      window.clearTimeout(speakTimer);
      if (reflexTimerRef.current) window.clearInterval(reflexTimerRef.current);
    };
  }, [turnIdx, scene.id, selfSpeak]);

  const setMoodTemporary = (mood: NpcMood, ms = 2400) => {
    setNpcMood(mood);
    if (ms > 0) {
      const curAttempt = attemptRef.current;
      window.setTimeout(() => {
        if (attemptRef.current === curAttempt) {
          setNpcMood('idle');
        }
      }, ms);
    }
  };

  const handlePlayNpcAudio = (slow = false) => {
    SFX.play('tap');
    Voice.speak(turn.npc, {
      npcId: currentNpcId,
      speaker: turn.speaker,
      slow,
      preferredURI: state.voiceURI,
      channel: turn.channel,
    });
  };

  const handlePlaySampleCue = (slow = false) => {
    SFX.play('tap');
    const text = plan.kind !== 'authored' ? plan.target : turn.cue || turn.sample || '';
    if (!text) return;
    Voice.speak(text, {
      npcId: 'coach',
      slow,
      preferredURI: state.voiceURI,
    });
  };

  // Award stars & XP for current turn
  const awardTurn = (res: EvalResult, isQuiz = false) => {
    setEvalResult(res);

    if (res.stars === 0) {
      SFX.play('error');
      setMoodTemporary('confused', 2400);
      setMicPhase('idle');
      toast('Chưa nghe rõ hoặc chưa khớp mẫu câu — hãy thử lại nhé!', 'warn');
      return;
    }

    recordPhraseStars(`${scene.id}-${turnIdx}`, res.stars);

    // Play sequential stars sound
    for (let i = 0; i < res.stars; i++) {
      window.setTimeout(() => SFX.play('star'), i * 190);
    }
    setMoodTemporary('happy', 3000);
    setMicPhase('done');

    const bonusXp = bonusOf('xp');
    const prevStars = turnStars[turnIdx] || 0;
    let totalTurnXpToGain = 0;

    // 1. Speaking XP (when stars > prevStars, non-quiz)
    if (!isQuiz && res.stars > prevStars) {
      const rawSpeakXp = (res.stars - prevStars) * 5 + (prevStars === 0 ? 5 : 0);
      const speakXp = Math.round(rawSpeakXp * (1 + bonusXp));
      totalTurnXpToGain += speakXp;
      setSpeakingXpTotal((s) => s + speakXp);
    }

    // 2. Listening XP (once per turn when reaching >= 1 star)
    if (!listeningAwarded[turnIdx]) {
      const baseListen =
        turn.mode === 'quiz'
          ? 8
          : turn.mode === 'catch'
          ? 4 + 2 * (turn.catchAnswers?.length || 1)
          : 4;
      const afterMistakes = Math.max(1, baseListen - 2 * mistakesCount);
      const blindMult = !revealed ? 2 : 1;
      const reflexBonus =
        turn.mode === 'quiz' && turn.reflex && !reflexExpired ? 5 : 0;
      const rawListenXp = afterMistakes * blindMult + reflexBonus;
      const listenXp = Math.round(rawListenXp * (1 + bonusXp));

      totalTurnXpToGain += listenXp;
      setListeningXpTotal((s) => s + listenXp);
      setListeningAwarded((prev) => {
        const copy = [...prev];
        copy[turnIdx] = true;
        return copy;
      });
    }

    if (totalTurnXpToGain > 0) {
      gain({ xp: totalTurnXpToGain });
    }

    // Update best star for this turn
    setTurnStars((prev) => {
      const copy = [...prev];
      copy[turnIdx] = Math.max(copy[turnIdx], res.stars);
      return copy;
    });

    // Unlock phrase in Phrasebook & reveal NPC text for review
    unlockPhrase(`${scene.id}-${turnIdx}`);
    setRevealed(true);

    // Record weak words for scripted/semi/catch
    if (turn.mode !== 'free' && turn.mode !== 'quiz' && res.tokens.length > 0) {
      addWeakWordsFromTokens(scene.id, turn.cue || turn.sample || '', res.tokens);
    }
  };

  const evaluateCandidatesAndAward = (candidates: string[]) => {
    setMicPhase('analyzing');
    if (plan.kind !== 'authored') {
      // Tự nói: chấm theo ý (các từ mang nghĩa của câu mẫu), không đòi đúng từng chữ
      let res = evaluateRecallCandidates(plan.target, candidates);
      const capped = (plan.kind === 'recall' && !plan.hint && hintAsked) || (reacting && reflexExpired);
      if (capped && res.stars > 2) res = { ...res, stars: 2 };
      if (evalResult && evalResult.score > res.score) res = { ...evalResult, transcript: res.transcript };
      if (res.stars >= 2) selfPassRef.current.add(turnIdx);
      awardTurn(res, false);
      return;
    }
    const res = evaluateTurnCandidates(turn, candidates);
    // Đọc theo thẻ / bắt từ: cộng dồn với các lần đọc trước, từ đã đúng một lần thì giữ là đúng
    const cumulative = turn.mode === 'scripted' || turn.mode === 'catch';
    awardTurn(cumulative ? mergeAttempts(evalResult, res) : res, false);
  };

  // Nghe lần lượt các từ còn sai trong cụm (giọng mẫu)
  const handlePlayChunkWords = async () => {
    if (!practiceChunk) return;
    SFX.play('tap');
    const myAttempt = attemptRef.current;
    for (const w of practiceChunk.weak) {
      if (attemptRef.current !== myAttempt) return;
      await Voice.speak(w.toLowerCase(), { npcId: 'coach', slow: true });
    }
  };

  // Thu âm riêng cụm còn sai rồi ghi kết quả vào câu
  const handleChunkMic = async () => {
    if (!practiceChunk || !evalResult) return;
    if (chunkRec) {
      SpeechEngine.stop();
      return;
    }
    const chunk = practiceChunk;
    const base = evalResult;
    const myAttempt = ++attemptRef.current;
    Voice.stop();
    setChunkRec(true);
    setInterimText('');
    const res = await SpeechEngine.listen({
      onInterim: (txt) => {
        if (attemptRef.current === myAttempt) setInterimText(txt);
      },
    });
    setChunkRec(false);
    if (attemptRef.current !== myAttempt || res.reason === 'aborted') return;
    if (res.reason === 'error' || (!res.transcript && res.reason === 'no-speech')) {
      setShowFallbackBox(true);
      toast('Không nghe rõ tiếng — hãy đọc lại cụm này, hoặc dùng ô Gõ thay mic.', 'warn', 2800);
      return;
    }
    const candidates = res.alternatives.length > 0 ? res.alternatives : [res.transcript];
    let best: EvalResult | null = null;
    for (const c of candidates) {
      const r = evaluateScripted(chunk.text, c);
      if (!best || r.score > best.score) best = r;
    }
    if (!best) return;
    const merged = applyChunkAttempt(base, chunk, best);
    const stillWeak = focusChunk(merged.tokens);
    awardTurn({ ...merged, transcript: best.transcript }, false);
    if (!stillWeak) toast('✅ Đã đúng hết các từ trong câu!', 'success', 2200);
    else if (stillWeak.start !== chunk.start || stillWeak.weak.length < chunk.weak.length)
      toast('👍 Cụm này tốt hơn rồi. Luyện tiếp cụm còn lại nhé.', 'success', 2200);
  };

  // Word-Catcher chip click
  const handleCatchWordClick = (word: string) => {
    if (micPhase !== 'locked') return;
    const answers = turn.catchAnswers || [];
    // Nhận từ đúng theo bất kỳ thứ tự nào: tìm ô trống đầu tiên còn thiếu đúng từ này.
    // (Trước đây chỉ nhận đúng thứ tự ô; chạm từ của ô sau trước sẽ bị tính sai và khóa luôn từ đó.)
    const hitIdx = answers.findIndex(
      (a, i) => !caughtIndices.includes(i) && a.toLowerCase() === word.toLowerCase()
    );

    if (hitIdx >= 0) {
      SFX.play('pop');
      const nextCaught = [...caughtIndices, hitIdx];
      setCaughtIndices(nextCaught);
      if (nextCaught.length >= answers.length) {
        SFX.play('ting');
        setMicPhase('idle');
        toast('🔓 Đã bắt đủ từ khoá! Hãy bấm Micro để đọc cả câu.', 'success');
      }
    } else {
      SFX.play('error');
      setMistakesCount((m) => m + 1);
      setWrongCatchWords((w) => [...w, word]);
      setShakeWord(word);
      window.setTimeout(() => setShakeWord(null), 380);
      toast('Chưa đúng từ NPC vừa nói (−2 Listening XP)', 'warn', 1600);
    }
  };

  // Quiz option click
  const handleQuizOptionClick = (idx: number) => {
    if (micPhase === 'done') return;
    const opt = turn.options?.[idx];
    if (!opt) return;

    if (opt.ok) {
      if (reflexTimerRef.current) window.clearInterval(reflexTimerRef.current);
      setQuizPickedIdx(idx);
      const hasInear = Boolean(state.items.inear);
      const revealPenalty = revealed && !hasInear ? 1 : 0;
      const reflexPenalty = turn.reflex && reflexExpired ? 1 : 0;
      const calcStars = clamp(
        3 - mistakesCount - revealPenalty - reflexPenalty,
        1,
        3
      ) as 1 | 2 | 3;

      awardTurn(
        {
          score: calcStars * 33 + 1,
          stars: calcStars,
          transcript: opt.t,
          tokens: [],
        },
        true
      );
    } else {
      SFX.play('error');
      setMistakesCount((m) => m + 1);
      setQuizWrongIndices((prev) => [...prev, idx]);
      setShakeQuizIdx(idx);
      window.setTimeout(() => setShakeQuizIdx(null), 380);
      setMoodTemporary('confused', 1800);
      toast('Đáp án chưa phù hợp với chỉ thị của NPC!', 'error', 1800);
    }
  };

  // Microphone button press
  const handleMicPress = async () => {
    if (micPhase === 'locked') {
      SFX.play('error');
      toast('Hãy chạm chọn đúng các thẻ từ còn trống trước khi mở Micro!', 'warn');
      return;
    }

    if (chunkRec) {
      // Đang thu riêng một cụm: nút mic chính chỉ dừng lượt thu đó
      SpeechEngine.stop();
      return;
    }

    if (micPhase === 'arming') {
      SpeechEngine.abort();
      setMicPhase('idle');
      return;
    }

    if (micPhase === 'rec') {
      SpeechEngine.stop();
      return;
    }

    if (reacting && reflexTimerRef.current) {
      // Đã kịp bấm mic: dừng đồng hồ phản xạ
      window.clearInterval(reflexTimerRef.current);
      reflexTimerRef.current = null;
    }
    const myAttempt = ++attemptRef.current;
    setMicPhase('arming');
    setNpcMood('listening');
    setInterimText('');

    const res = await SpeechEngine.listen({
      onInterim: (txt) => {
        if (attemptRef.current === myAttempt) {
          setMicPhase('rec');
          setInterimText(txt);
        }
      },
    });

    if (attemptRef.current !== myAttempt) return;

    if (res.reason === 'aborted') {
      setMicPhase('idle');
      setNpcMood('idle');
      return;
    }

    if (res.reason === 'error' || (!res.transcript && res.reason === 'no-speech')) {
      setMicPhase('idle');
      setMoodTemporary('confused', 2000);
      setShowFallbackBox(true);
      toast(
        res.error === 'unsupported'
          ? 'Trình duyệt chưa hỗ trợ thu âm trực tiếp — đã mở ô Gõ thay mic!'
          : 'Không nghe rõ tiếng — bạn có thể nói lại hoặc dùng ô Gõ thay mic bên dưới!',
        'warn',
        3200
      );
      return;
    }

    evaluateCandidatesAndAward(
      res.alternatives.length > 0 ? res.alternatives : [res.transcript]
    );
  };

  // Fallback Simulator (Chuẩn 3 sao / Gần 2 sao / Sai 0 sao)
  const handleSimulateGrade = (grade: 'perfect' | 'near' | 'bad') => {
    SFX.play('tap');
    const targetSentence = turn.cue || turn.sample || 'Welcome to our show tonight';
    if (grade === 'perfect') {
      evaluateCandidatesAndAward([targetSentence]);
    } else if (grade === 'near') {
      const words = targetSentence.split(/\s+/);
      const partial = words.slice(0, Math.max(2, Math.floor(words.length * 0.78))).join(' ');
      evaluateCandidatesAndAward([partial]);
    } else {
      evaluateCandidatesAndAward(['um hello testing']);
    }
  };

  const handleNextTurn = (skip = false) => {
    if (!skip && (turnStars[turnIdx] || 0) < 1) {
      SFX.play('error');
      toast('Hãy đạt ít nhất 1 sao hoặc bấm "Bỏ qua" để qua lượt tiếp theo!', 'warn');
      return;
    }

    SFX.play('tap');
    const finalStars = [...turnStars];
    if (skip && finalStars[turnIdx] === 0) {
      finalStars[turnIdx] = 0;
    }

    if (turnIdx + 1 >= scene.turns.length) {
      Voice.stop();
      SpeechEngine.abort();
      const added = recordStageLearning({
        scriptKey,
        sceneId: baseScene.id,
        unsupportedPasses: selfPassRef.current.size,
        chunkIds: (CHUNKS_BY_SCRIPT[scriptKey] || []).map((c) => c.id),
      });
      if (added > 0) toast(`🧩 ${added} cụm mới vào phần Khởi động ngày mai`, 'success', 3200);
      finishScene(finalStars, speakingXpTotal, listeningXpTotal);
    } else {
      setTurnIdx(turnIdx + 1);
    }
  };

  const handleLeaveStage = () => {
    const msg =
      scene.type === 'show'
        ? 'Rời sân khấu giữa chừng? Năng lượng đã dùng (−20 ⚡) sẽ không được hoàn lại!'
        : 'Bạn muốn rời hoạt động này về lại màn hình trước?';
    if (window.confirm(msg)) {
      attemptRef.current += 1;
      Voice.stop();
      SpeechEngine.abort();
      goTo(stageReturnTo);
    }
  };

  const playedTurns = turnStars.filter((s) => s > 0);
  const currentAvgStars =
    playedTurns.length > 0
      ? Math.round(playedTurns.reduce((a, b) => a + b, 0) / playedTurns.length)
      : 0;
  const progressPct = Math.round(((turnIdx + 1) / scene.turns.length) * 100);

  return (
    <div
      className="mx-auto flex h-full max-w-6xl flex-col gap-2 overflow-hidden px-3 sm:gap-3 sm:px-6"
      style={{ paddingTop: STAGE_TOP_PAD, paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      {/* Thanh tiêu đề: nút rời, tên hoạt động, tiến độ lượt, sao */}
      <div className="flex shrink-0 items-center justify-between gap-2 rounded-2xl ghibli-panel px-2.5 py-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <button
            onClick={handleLeaveStage}
            className="min-h-[44px] shrink-0 rounded-xl border-2 border-ghibli-clay bg-ghibli-cream px-3 text-sm font-extrabold text-ghibli-ink transition hover:bg-[#FCE4DA] hover:text-[#B2421E]"
          >
            ✕ Rời
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-black tracking-wide text-pink-700">
              {dayScript.title ? (
                <>
                  <span className="text-ghibli-ink">{dayScript.title}</span>
                  <span className="hidden uppercase sm:inline"> · {scene.title}</span>
                </>
              ) : (
                <span className="uppercase">{scene.title}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-ghibli-track sm:max-w-[11rem]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-ghibli-sun to-ghibli-sage transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="shrink-0 text-sm font-black text-ghibli-ink">
                Lượt {turnIdx + 1}/{scene.turns.length}
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5 text-sm">
          {[1, 2, 3].map((s) => (
            <span
              key={s}
              className={s <= currentAvgStars ? 'text-ghibli-sun drop-shadow-[0_1px_0_#6B4E3D]' : 'text-ghibli-ink/20'}
            >
              ★
            </span>
          ))}
        </div>
      </div>

      {/* Main Content Split: 3D Stage Viewport (Left on iPad) + Interactive Listening & Cue Cards (Right on iPad) */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 md:grid md:grid-cols-12 md:gap-3.5">
        {/* 3D STAGE VIEWPORT */}
        <div className="relative h-[22dvh] min-h-[120px] w-full shrink-0 sm:h-64 md:col-span-5 md:h-full">
          <Stage3D
            scene={scene}
            npcId={currentNpcId}
            speaker={turn.speaker}
            npcMood={npcMood}
            npcViseme={npcViseme}
            npcSpeaking={npcSpeaking}
            micPhase={micPhase}
            playerViseme={playerViseme}
            channel={turn.channel}
          />

          {/* Floating NPC Active Speech Indicator */}
          <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full ghibli-panel px-3 py-1 text-sm font-extrabold text-ghibli-ink">
            <span>{turn.channel === 'inear' ? '🎧 In-ear:' : '💬'}</span>
            <span>
              {currentNpc.isCouple
                ? turn.speaker === 'liam'
                  ? 'Liam (Chú rể)'
                  : 'Emma (Cô dâu)'
                : currentNpc.name}
            </span>
            {npcSpeaking && <span className="text-[#23706A]">•••</span>}
          </div>
        </div>

        {/* RIGHT PANEL: INTERACTIVE LISTENING + CUE CARD + MICROPHONE CONTROLS */}
        <div className="flex min-h-0 flex-1 flex-col gap-2 md:col-span-7 md:h-full md:gap-3">
          {/* Vùng cuộn: thẻ nghe và thẻ bài nói. Thanh mic nằm ngoài vùng này nên luôn nhìn thấy. */}
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pb-1 md:gap-3 md:pr-1">
          {/* 1. INTERACTIVE LISTENING CARD */}
          <div className="shrink-0 rounded-3xl ghibli-panel p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ghibli-track pb-2.5">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-ghibli-sky px-2 py-1 text-xs font-black text-ghibli-ink">
                  🎧 Nghe NPC
                </span>
                {!revealed && (
                  <span className="rounded-full bg-[#E4F2DC] px-2 py-1 text-xs font-extrabold text-[#3F7A32]">
                    Ẩn chữ ×2 XP
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handlePlayNpcAudio(false)}
                  className="min-h-[48px] rounded-xl border-2 border-ghibli-clay bg-ghibli-cream px-3 text-sm font-extrabold text-ghibli-ink transition hover:bg-[#FBEBD0]"
                >
                  🔊 1×
                </button>
                <button
                  onClick={() => handlePlayNpcAudio(true)}
                  className="min-h-[48px] rounded-xl border-2 border-ghibli-clay bg-ghibli-cream px-3 text-sm font-extrabold text-[#23706A] transition hover:bg-[#FBEBD0]"
                >
                  🐢 0.8×
                </button>
                <button
                  onClick={() => {
                    SFX.play('page');
                    setRevealed(true);
                  }}
                  disabled={revealed}
                  className="min-h-[48px] rounded-xl border-2 border-ghibli-clay bg-[#FBE3EC] px-3 text-sm font-extrabold text-pink-800 transition hover:bg-[#F8D3E0] disabled:bg-[#F1E9DC] disabled:text-ghibli-ink-soft disabled:opacity-60"
                >
                  👁️ Hiện chữ
                </button>
                {revealed && support.npcToggle && (
                  <button
                    onClick={() => {
                      SFX.play('tap');
                      setTranslated((t) => !t);
                    }}
                    className="min-h-[48px] rounded-xl border-2 border-ghibli-clay bg-[#FDF0CF] px-3 text-sm font-extrabold text-[#8A5A00]"
                  >
                    🇻🇳 Dịch
                  </button>
                )}
              </div>
            </div>

            {/* Blind Wave Bubbles OR Revealed Transcript */}
            <div className="mt-3">
              {!revealed ? (
                <div
                  onClick={() => handlePlayNpcAudio(false)}
                  className="flex cursor-pointer items-center justify-center gap-3 rounded-2xl min-h-[48px] border-2 border-dashed border-ghibli-clay bg-ghibli-track/60 px-3 py-2 transition sm:py-4 hover:bg-ghibli-track"
                >
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5, 6, 7].map((bar) => (
                      <span
                        key={bar}
                        className={`w-1.5 rounded-full bg-gradient-to-t from-ghibli-sun to-ghibli-sage transition-all ${
                          npcSpeaking ? 'h-6' : 'h-3 opacity-60'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-bold text-ghibli-ink">
                    Đang ẩn chữ · Chạm để nghe lại
                  </span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <p className="font-display text-base font-bold leading-relaxed text-ghibli-ink">
                    “{turn.npc}”
                  </p>
                  {translated && support.npcToggle && (
                    <p className="text-sm font-semibold italic text-[#8A5A00]">
                      🇻🇳 {turn.npcVi}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 2. CUE CARD / TASK CARD BY TURN MODE */}
          <div className="flex-1 rounded-3xl ghibli-panel p-3.5 sm:p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="rounded-full border-2 border-ghibli-clay bg-[#FBE3EC] px-3 py-1 text-xs font-black tracking-wide text-pink-800">
                {reacting
                  ? '⚡ Phản xạ nói'
                  : selfSpeak
                  ? '🧠 Tự nói, không có thẻ'
                  : turn.mode === 'catch'
                  ? '🎯 Bắt từ rồi nói'
                  : turn.mode === 'semi'
                  ? '✍️ Điền ô rồi nói'
                  : turn.mode === 'free'
                  ? '🔥 Ứng biến tự do'
                  : turn.mode === 'quiz'
                  ? '⚡ Phản xạ nghe hiểu'
                  : '🎙️ Đọc theo thẻ nhắc'}
              </span>

              {stage === 0 && (turn.mode === 'scripted' || turn.mode === 'catch') && !evalResult && (
                <button
                  onClick={() => setSelfTalk((v) => !v)}
                  className="min-h-[44px] rounded-full border-2 border-ghibli-clay bg-ghibli-cream px-3 text-xs font-black text-ghibli-ink"
                >
                  {selfTalk ? '👁 Hiện thẻ' : '🙈 Thử không nhìn thẻ'}
                </button>
              )}

              {(turn.mode === 'quiz' || reacting) && reflexLeft !== null && !(reacting && evalResult) && (
                <span
                  className={`rounded-full px-3 py-0.5 text-xs font-black ${
                    reflexLeft <= 5
                      ? 'bg-[#B2421E] text-white'
                      : 'bg-ghibli-sun text-ghibli-ink'
                  }`}
                >
                  ⏱️ {reacting ? (reflexLeft > 0 ? `Bấm mic trong ${reflexLeft}s` : 'Hết giờ: tối đa 2★') : `Phản xạ: ${reflexLeft}s`}
                </span>
              )}
            </div>

            {/* TỰ NÓI: không có câu tiếng Anh để đọc. Sau khi nói mới hiện câu mẫu để so. */}
            {selfSpeak && (
              <div className="space-y-2.5">
                {!evalResult ? (
                  <>
                    <p className="font-display text-base font-extrabold text-ghibli-ink">
                      {reacting
                        ? `Đáp lại ${currentNpc.name} ngay bằng lời, không cần đúng từng chữ.`
                        : `Hãy tự đáp lại ${currentNpc.name} bằng tiếng Anh.`}
                    </p>
                    {hintVisible && turn.cueVi ? (
                      <p className="rounded-2xl border-2 border-ghibli-clay bg-[#FFF8E1] px-3 py-2 text-base font-bold text-ghibli-ink">
                        🇻🇳 {turn.cueVi}
                      </p>
                    ) : (
                      turn.cueVi && (
                        <button
                          onClick={() => setHintAsked(true)}
                          className="min-h-[48px] rounded-xl border-2 border-dashed border-ghibli-clay bg-ghibli-cream px-3 text-sm font-extrabold text-ghibli-ink-soft"
                        >
                          💡 Xin gợi ý tiếng Việt (tối đa 2★)
                        </button>
                      )
                    )}
                  </>
                ) : (
                  <>
                    <div className="text-xs font-black text-ghibli-ink-soft">Câu mẫu (chạm để nghe):</div>
                    <button
                      onClick={() => handlePlaySampleCue(false)}
                      className="block w-full rounded-2xl border-2 border-ghibli-clay bg-[#E4F2DC] px-3 py-2 text-left font-display text-lg font-extrabold leading-snug text-[#2F6128]"
                    >
                      🔊 {plan.target}
                    </button>
                    {turn.cueVi && <p className="text-sm font-semibold text-ghibli-ink-soft">🇻🇳 {turn.cueVi}</p>}
                    {(evalResult.missingKeywords?.length ?? 0) > 0 && (
                      <p className="text-sm font-bold text-[#8A5A00]">
                        Ý còn thiếu: {evalResult.missingKeywords!.join(', ')}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* MODE A: SCRIPTED OR CATCH */}
            {!selfSpeak && (turn.mode === 'scripted' || turn.mode === 'catch') && (
              <div className="space-y-3">
                {/* Word-Catcher fill-in-the-blank preview */}
                {turn.mode === 'catch' && micPhase === 'locked' ? (
                  <div>
                    <p className="font-display text-base font-extrabold leading-relaxed text-ghibli-ink">
                      {(() => {
                        let ansIdx = 0;
                        return (turn.cueRaw || turn.cue || '')
                          .split(/(\{[^}]+\})/g)
                          .map((part, i) => {
                            if (part.startsWith('{') && part.endsWith('}')) {
                              const word = part.slice(1, -1);
                              const filled = caughtIndices.includes(ansIdx);
                              ansIdx++;
                              return (
                                <span
                                  key={i}
                                  className={`mx-1 inline-block rounded-lg border px-2.5 py-0.5 text-sm font-black ${
                                    filled
                                      ? 'border-2 border-[#3F7A32] bg-[#E4F2DC] text-[#2F6128]'
                                      : 'border-2 border-dashed border-ghibli-clay bg-ghibli-sky/60 text-ghibli-ink'
                                  }`}
                                >
                                  {filled ? word : '____'}
                                </span>
                              );
                            }
                            return <span key={i}>{part}</span>;
                          });
                      })()}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {catchPool.map((w, idx) => {
                        const answers = turn.catchAnswers || [];
                        const same = (a: string) => a.toLowerCase() === w.toLowerCase();
                        // Đã dùng hết: mọi ô cần từ này đều đã điền
                        const alreadyCaught =
                          answers.some(same) && answers.every((a, i) => !same(a) || caughtIndices.includes(i));
                        // Chỉ khóa từ gây nhiễu thật sự; từ là đáp án thì không bao giờ bị khóa vì chọn sai lượt
                        const isWrong = wrongCatchWords.includes(w) && !answers.some(same);
                        return (
                          <button
                            key={`${w}-${idx}`}
                            disabled={alreadyCaught || isWrong}
                            onClick={() => handleCatchWordClick(w)}
                            className={`min-h-[48px] rounded-xl border-2 px-3.5 py-2 text-sm font-extrabold transition ${shakeWord === w ? 'animate-shake' : ''} ${
                              alreadyCaught
                                ? 'border-[#3F7A32] bg-[#E4F2DC] text-[#3F7A32] opacity-60'
                                : isWrong
                                ? 'border-ghibli-coral bg-[#FCE4DA] text-[#B2421E] line-through opacity-60'
                                : 'border-ghibli-clay bg-ghibli-cream text-ghibli-ink hover:scale-105 hover:bg-[#FBEBD0]'
                            }`}
                          >
                            {w}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  // Scripted or Unlocked Catch: Show colored evaluated tokens or cue words
                  <div>
                    <div className="flex flex-wrap gap-1.5 font-display text-lg font-extrabold leading-relaxed">
                      {evalResult && evalResult.tokens.length > 0
                        ? evalResult.tokens.map((tok, i) => (
                            <button
                              key={i}
                              onClick={() =>
                                Voice.speak(tok.clean || tok.word, {
                                  preferredURI: state.voiceURI,
                                })
                              }
                              title="Chạm để nghe phát âm từ này"
                              className={`inline-flex min-h-[48px] items-center rounded-lg px-2 transition hover:scale-105 ${
                                tok.status === 'ok'
                                  ? 'bg-[#E4F2DC] text-[#2F6128]'
                                  : tok.status === 'near'
                                  ? 'bg-[#FDF0CF] text-[#8A5A00] underline decoration-wavy'
                                  : 'bg-[#FCE4DA] text-[#B2421E] underline decoration-wavy'
                              }`}
                            >
                              {tok.word}
                            </button>
                          ))
                        : (turn.cue || '').split(/\s+/).map((w, i) => (
                            <span key={i} className="text-ghibli-ink">
                              {w}
                            </span>
                          ))}
                    </div>
                    {practiceChunk && (
                      <div ref={chunkPanelRef} className="mt-2.5 rounded-2xl border-2 border-[#C9A24A] bg-[#FFF8E1] p-3">
                        <div className="text-xs font-black text-[#6B4E00]">
                          🎯 Chỉ cần luyện lại cụm này. Các từ xanh đã được tính, không phải đọc lại.
                        </div>
                        <div className="mt-1 font-display text-xl font-black text-ghibli-ink">
                          “{practiceChunk.text}”
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            onClick={handlePlayChunkWords}
                            className="min-h-[48px] rounded-xl border-2 border-ghibli-clay bg-ghibli-cream px-3 text-sm font-extrabold text-ghibli-ink transition hover:bg-[#FBEBD0]"
                          >
                            🔊 Nghe từ: {practiceChunk.weak.join(', ')}
                          </button>
                          <button
                            onClick={handleChunkMic}
                            disabled={micPhase === 'rec' || micPhase === 'arming'}
                            className={`min-h-[48px] flex-1 rounded-xl border-2 border-ghibli-clay px-4 text-sm font-black shadow-[0_3px_0_#6B4E3D] transition active:scale-[0.98] disabled:opacity-50 ${
                              chunkRec
                                ? 'bg-gradient-to-r from-[#D1502C] to-[#B2421E] text-white'
                                : 'bg-gradient-to-r from-ghibli-sun to-[#F7C35C] text-ghibli-ink'
                            }`}
                          >
                            {chunkRec ? '⏹️ Dừng & chấm cụm' : '🎙️ Đọc riêng cụm này'}
                          </button>
                        </div>
                      </div>
                    )}
                    {turn.cueVi && support.cueVi && (
                      <p className="mt-1.5 text-sm font-semibold text-ghibli-ink-soft">
                        🇻🇳 {turn.cueVi}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* MODE B: SEMI-SCRIPTED */}
            {turn.mode === 'semi' && (
              <div className="space-y-2.5">
                <p className="font-display text-lg font-extrabold text-ghibli-ink">
                  {turn.frame}
                </p>
                {turn.cueVi && support.cueVi && (
                  <p className="text-sm font-semibold text-ghibli-ink-soft">
                    🇻🇳 {turn.cueVi}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  {(turn.blankPool || []).map((group, gIdx) => (
                    <div
                      key={gIdx}
                      className="rounded-xl border-2 border-ghibli-clay bg-ghibli-cream px-3 py-2 text-sm"
                    >
                      <span className="font-black text-[#23706A]">Ô {gIdx + 1}: </span>
                      <span className="font-semibold text-ghibli-ink">
                        {group.join(' / ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MODE C: FREEFORM IMPROVISATION */}
            {turn.mode === 'free' && (
              <div className="space-y-2.5">
                <p className="font-display text-base font-extrabold text-ghibli-ink">
                  🎯 Nhiệm vụ: {turn.task}
                </p>
                {support.taskVi && <p className="text-sm font-semibold text-[#8A5A00]">{turn.taskVi}</p>}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(turn.requiredKeywords || []).map((grp, i) => {
                    const hit = evalResult?.matchedKeywords?.includes(grp[0]);
                    return (
                      <span
                        key={i}
                        className={`rounded-lg border-2 px-2.5 py-1 text-xs font-bold ${
                          hit
                            ? 'border-[#3F7A32] bg-[#E4F2DC] text-[#2F6128]'
                            : 'border-ghibli-clay/60 bg-[#FBE3EC] text-pink-800'
                        }`}
                      >
                        Bắt buộc: {grp.slice(0, 3).join(' / ')}
                      </span>
                    );
                  })}
                  {(turn.bonusKeywords || []).map((grp, i) => (
                    <span
                      key={i}
                      className="rounded-lg border-2 border-ghibli-teal bg-[#DDF1EE] px-2.5 py-1 text-xs font-bold text-[#23706A]"
                    >
                      Thưởng: {grp.slice(0, 2).join(' / ')}
                    </span>
                  ))}
                </div>
                {turn.sample && (
                  <p className="text-xs italic text-ghibli-ink-soft">
                    Gợi ý mẫu: “{turn.sample}”
                  </p>
                )}
              </div>
            )}

            {/* MODE D: QUIZ */}
            {!selfSpeak && turn.mode === 'quiz' && (
              <div className="space-y-2.5">
                <p className="font-display text-base font-extrabold text-ghibli-ink">
                  {turn.question}
                </p>
                <div className="space-y-2">
                  {(turn.options || []).map((opt, idx) => {
                    const isPicked = quizPickedIdx === idx;
                    const isWrong = quizWrongIndices.includes(idx);
                    return (
                      <button
                        key={idx}
                        disabled={micPhase === 'done' || isWrong}
                        onClick={() => handleQuizOptionClick(idx)}
                        className={`min-h-[48px] w-full rounded-2xl border-2 p-3 text-left text-sm font-bold transition ${shakeQuizIdx === idx ? 'animate-shake' : ''} ${
                          isPicked
                            ? 'border-[#3F7A32] bg-[#E4F2DC] text-[#2F6128] shadow-md'
                            : isWrong
                            ? 'border-ghibli-coral bg-[#FCE4DA] text-[#B2421E] opacity-60'
                            : 'border-ghibli-clay bg-ghibli-cream text-ghibli-ink hover:bg-[#FBEBD0]'
                        }`}
                      >
                        {opt.t}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Coach Tip */}
            {evalResult?.grammarIssues && evalResult.grammarIssues.length > 0 && (
              <div className="mt-3 rounded-2xl border-2 border-[#C9A24A] bg-[#FFF8E1] px-3 py-2 text-sm font-semibold text-[#6B4E00]">
                ✏️ Gợi ý sửa:
                <ul className="mt-1 list-disc pl-5">
                  {evalResult.grammarIssues.map((g) => (
                    <li key={g.wrong}>
                      "{g.wrong}" → <span className="font-black">"{g.fix}"</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {support.tip && (
              <div className="mt-3 rounded-2xl border-2 border-ghibli-track bg-[#FFF1D6] px-3 py-2 text-sm font-semibold text-ghibli-ink-soft">
                💡 {turn.tip}
              </div>
            )}

            {/* Evaluation Result Banner */}
            {(interimText || evalResult) && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-ghibli-track bg-[#FFF1D6] px-3.5 py-2">
                <div className="text-xs">
                  <span className="font-bold text-ghibli-ink-soft">Máy nghe được: </span>
                  <span className="font-semibold italic text-[#23706A]">
                    “{evalResult ? evalResult.transcript : interimText}”
                  </span>
                </div>
                {evalResult && (
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border-2 border-ghibli-clay bg-ghibli-sun px-3 py-1 text-sm font-black text-ghibli-ink shadow-[0_2px_0_#6B4E3D]">
                      {evalResult.score}% · {'★'.repeat(evalResult.stars)}
                      {'☆'.repeat(3 - evalResult.stars)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          </div>

          {/* 3. THANH MIC & HÀNH ĐỘNG: ghim ở đáy, không cuộn theo nội dung */}
          <div className="shrink-0 rounded-3xl ghibli-panel p-2.5 sm:p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Left: Sample Audio + Fallback Toggle */}
              <div className="order-2 flex items-center gap-1.5 sm:order-none">
                {(turn.mode !== 'quiz' || reacting) && (
                  <>
                    <button
                      onClick={() => handlePlaySampleCue(false)}
                      disabled={selfSpeak && !evalResult}
                      title={selfSpeak && !evalResult ? 'Nói thử trước, rồi mới nghe câu mẫu' : undefined}
                      className="min-h-[48px] rounded-xl border-2 border-ghibli-clay bg-ghibli-cream px-2.5 text-sm sm:px-3 font-extrabold text-ghibli-ink transition hover:bg-[#FBEBD0] disabled:opacity-40"
                    >
                      🔊 Mẫu
                    </button>
                    <button
                      onClick={() => handlePlaySampleCue(true)}
                      disabled={selfSpeak && !evalResult}
                      aria-label="Nghe câu mẫu chậm 0.8×"
                      className="min-h-[48px] min-w-[44px] rounded-xl border-2 border-ghibli-clay bg-ghibli-cream px-2.5 text-sm font-extrabold text-[#23706A] transition hover:bg-[#FBEBD0] sm:px-3"
                    >
                      🐢<span className="ml-1 hidden sm:inline">0.8×</span>
                    </button>
                    <button
                      onClick={() => setShowFallbackBox((v) => !v)}
                      aria-label="Gõ thay mic"
                      className="min-h-[48px] min-w-[44px] rounded-xl border-2 border-ghibli-clay bg-[#FDF0CF] px-2.5 text-sm sm:px-3 font-extrabold text-[#8A5A00] transition hover:bg-[#FBE3A8]"
                    >
                      ⌨️<span className="ml-1 hidden sm:inline">Gõ thay mic</span>
                    </button>
                  </>
                )}
              </div>

              {/* Center: Primary Microphone Button (for non-quiz turns) */}
              {turn.mode !== 'quiz' && (
                <button
                  onClick={handleMicPress}
                  className={`order-1 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-ghibli-clay px-6 py-2.5 font-display text-lg font-black shadow-[0_3px_0_#6B4E3D] transition active:scale-[0.98] sm:order-none sm:min-h-[48px] sm:w-auto sm:text-sm sm:hover:scale-105 ${
                    micPhase === 'locked'
                      ? 'cursor-not-allowed bg-[#F1E9DC] text-ghibli-ink-soft opacity-60'
                      : micPhase === 'rec'
                      ? 'bg-gradient-to-r from-[#D1502C] to-[#B2421E] text-white'
                      : micPhase === 'arming'
                      ? 'bg-ghibli-sun text-ghibli-ink'
                      : 'bg-gradient-to-r from-ghibli-sage to-[#9FD68A] text-ghibli-ink'
                  }`}
                >
                  <span>
                    {micPhase === 'locked'
                      ? '🔒 Bắt từ trước'
                      : micPhase === 'arming'
                      ? '⏳ Đang mở Mic...'
                      : micPhase === 'rec'
                      ? '⏹️ Dừng & Chấm điểm'
                      : evalResult && evalResult.stars > 0
                      ? evalResult.stars >= 3
                        ? '🎙️ Đọc lại cả câu'
                        : '🎙️ Đọc lại cả câu lấy 3★'
                      : '🎙️ Chạm để Nói'}
                  </span>
                </button>
              )}

              {/* Right: Skip & Continue Buttons */}
              <div className="order-3 flex items-center gap-1.5 sm:order-none sm:gap-2">
                {(turnStars[turnIdx] || 0) < 1 && turn.mode !== 'quiz' && (
                  <span className="hidden text-xs font-bold text-amber-700 sm:inline">
                    Cần 1★ để tiếp tục, hoặc bấm Bỏ qua
                  </span>
                )}
                <button
                  onClick={() => handleNextTurn(true)}
                  className="min-h-[48px] rounded-xl border-2 border-ghibli-clay bg-ghibli-cream px-2.5 text-sm font-bold text-ghibli-ink-soft sm:px-3.5 transition hover:bg-[#FBEBD0]"
                >
                  Bỏ qua
                </button>
                <button
                  disabled={(turnStars[turnIdx] || 0) < 1}
                  onClick={() => handleNextTurn(false)}
                  className="min-h-[48px] rounded-xl border-2 border-ghibli-clay bg-gradient-to-r from-ghibli-sage to-[#9FD68A] px-3 sm:px-4 text-sm font-black text-ghibli-ink shadow-[0_3px_0_#6B4E3D] transition hover:scale-105 disabled:cursor-not-allowed disabled:bg-none disabled:bg-[#F1E9DC] disabled:text-ghibli-ink-soft disabled:shadow-none disabled:opacity-60"
                >
                  {turnIdx + 1 >= scene.turns.length ? 'Kết thúc 🎉' : 'Tiếp ➔'}
                </button>
              </div>
            </div>

            {/* Fallback Simulator / Keyboard Box */}
            {showFallbackBox && turn.mode !== 'quiz' && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t-2 border-ghibli-track pt-2.5">
                <span className="text-xs font-bold text-ghibli-ink-soft">
                  Dùng khi mic không hoạt động:
                </span>
                <button
                  onClick={() => handleSimulateGrade('perfect')}
                  className="min-h-[48px] rounded-xl border-2 border-ghibli-clay bg-[#E4F2DC] px-3 text-sm font-black text-[#2F6128] hover:bg-[#D3EBC4]"
                >
                  ⚡ Thử: đúng (3★)
                </button>
                <button
                  onClick={() => handleSimulateGrade('near')}
                  className="min-h-[48px] rounded-xl border-2 border-ghibli-clay bg-[#FDF0CF] px-3 text-sm font-black text-[#8A5A00] hover:bg-[#FBE3A8]"
                >
                  ⚡ Thử: gần đúng (2★)
                </button>
                <button
                  onClick={() => handleSimulateGrade('bad')}
                  className="min-h-[48px] rounded-xl border-2 border-ghibli-clay bg-[#FCE4DA] px-3 text-sm font-black text-[#B2421E] hover:bg-[#F8D3C5]"
                >
                  ⚡ Thử: sai (0★)
                </button>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (manualText.trim()) {
                      evaluateCandidatesAndAward([manualText]);
                    }
                  }}
                  className="flex flex-1 items-center gap-1.5"
                >
                  <input
                    type="text"
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder="Hoặc gõ câu tiếng Anh vào đây..."
                    className="min-h-[48px] min-w-[160px] flex-1 rounded-xl border-2 border-ghibli-clay bg-white px-3 py-2 text-base text-ghibli-ink placeholder-ghibli-ink-soft focus:border-ghibli-teal focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="min-h-[48px] rounded-xl border-2 border-ghibli-clay bg-gradient-to-r from-ghibli-sage to-[#9FD68A] px-4 text-sm font-black text-ghibli-ink"
                  >
                    Chấm
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
