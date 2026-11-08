import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NPCS, SCENES } from '../data/content';
import { clamp } from '../core/clock';
import { evaluateTurnCandidates } from '../core/evaluator';
import { useGameStore } from '../core/store';
import { HUD_PAD } from './HUD';
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

  const scene = SCENES[activeSceneId || 'coffee'] || SCENES.coffee;

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
  const [npcSpeaking, setNpcSpeaking] = useState(false);
  const [npcViseme, setNpcViseme] = useState<VisemeType>('rest');
  const [playerViseme, setPlayerViseme] = useState<VisemeType>('rest');
  const [npcMood, setNpcMood] = useState<NpcMood>('idle');
  const [micPhase, setMicPhase] = useState<StageMicPhase>('idle');
  const [interimText, setInterimText] = useState('');
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
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
    setInterimText('');
    setMistakesCount(0);
    setCaughtIndices([]);
    setWrongCatchWords([]);
    setQuizPickedIdx(null);
    setQuizWrongIndices([]);
    setReflexExpired(false);
    setManualText('');
    setMicPhase(turn.mode === 'catch' ? 'locked' : 'idle');

    if (turn.mode === 'quiz' && turn.reflex) {
      setReflexLeft(turn.reflex);
    } else {
      setReflexLeft(null);
    }

    const speakTimer = window.setTimeout(async () => {
      if (attemptRef.current !== myAttempt) return;
      await Voice.speak(turn.npc, {
        npcId: currentNpcId,
        speaker: turn.speaker,
        preferredURI: state.voiceURI,
        channel: turn.channel,
      });

      if (attemptRef.current !== myAttempt) return;

      // Start reflex countdown for Quiz after NPC finishes speaking
      if (turn.mode === 'quiz' && turn.reflex) {
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
  }, [turnIdx, scene.id]);

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
    const text = turn.cue || turn.sample || '';
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
    const res = evaluateTurnCandidates(turn, candidates);
    awardTurn(res, false);
  };

  // Word-Catcher chip click
  const handleCatchWordClick = (word: string) => {
    if (micPhase !== 'locked') return;
    const answers = turn.catchAnswers || [];
    const nextIdx = caughtIndices.length;
    const expected = answers[nextIdx];

    if (expected && word.toLowerCase() === expected.toLowerCase()) {
      SFX.play('pop');
      const nextCaught = [...caughtIndices, nextIdx];
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

    if (micPhase === 'arming') {
      SpeechEngine.abort();
      setMicPhase('idle');
      return;
    }

    if (micPhase === 'rec') {
      SpeechEngine.stop();
      return;
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
          ? 'Trình duyệt chưa hỗ trợ thu âm trực tiếp — đã mở bảng Gõ phím / Giả lập!'
          : 'Không nghe rõ tiếng — bạn có thể nói lại hoặc dùng chế độ Gõ phím / Giả lập bên dưới!',
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
    <div className="mx-auto flex h-full max-w-6xl flex-col gap-3 overflow-y-auto px-3 pb-6 sm:px-6" style={{ paddingTop: HUD_PAD }}>
      {/* Top Stage Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/15 bg-[#120A30]/90 px-3.5 py-2 shadow-lg backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleLeaveStage}
            className="rounded-xl border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-extrabold text-slate-200 transition hover:bg-rose-500/30 hover:text-white"
          >
            ✕ Rời
          </button>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-pink-300">
              ACTIVITY: {scene.title}
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-28 overflow-hidden rounded-full bg-white/10 sm:w-44">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-pink-500 via-cyan-400 to-lime-400 transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-xs font-black text-white">
                Lượt {turnIdx + 1}/{scene.turns.length}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 text-sm">
          {[1, 2, 3].map((s) => (
            <span
              key={s}
              className={s <= currentAvgStars ? 'text-amber-400' : 'text-white/20'}
            >
              ★
            </span>
          ))}
        </div>
      </div>

      {/* Main Content Split: 3D Stage Viewport (Left on iPad) + Interactive Listening & Cue Cards (Right on iPad) */}
      <div className="grid flex-1 grid-cols-1 gap-3.5 md:grid-cols-12 md:overflow-hidden">
        {/* 3D STAGE VIEWPORT */}
        <div className="relative h-64 w-full sm:h-72 md:col-span-5 md:h-full">
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
          <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full border border-white/20 bg-[#120A30]/85 px-3 py-1 text-xs font-extrabold text-white backdrop-blur-md">
            <span>{turn.channel === 'inear' ? '🎧 In-ear:' : '💬'}</span>
            <span>
              {currentNpc.isCouple
                ? turn.speaker === 'liam'
                  ? 'Liam (Chú rể)'
                  : 'Emma (Cô dâu)'
                : currentNpc.name}
            </span>
            {npcSpeaking && <span className="animate-pulse text-cyan-300">•••</span>}
          </div>
        </div>

        {/* RIGHT PANEL: INTERACTIVE LISTENING + CUE CARD + MICROPHONE CONTROLS */}
        <div className="flex flex-col justify-between gap-3 md:col-span-7 md:h-full md:overflow-y-auto md:pr-1">
          {/* 1. INTERACTIVE LISTENING CARD */}
          <div className="rounded-3xl border border-white/15 bg-white/5 p-3.5 shadow-xl backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-cyan-500/20 px-2 py-0.5 text-[11px] font-black text-cyan-300">
                  🎧 INTERACTIVE LISTENING
                </span>
                {!revealed && (
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold text-emerald-300">
                    Blind ×2 XP
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handlePlayNpcAudio(false)}
                  className="rounded-xl border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-extrabold text-white transition hover:bg-white/20"
                >
                  🔊 1×
                </button>
                <button
                  onClick={() => handlePlayNpcAudio(true)}
                  className="rounded-xl border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-extrabold text-cyan-200 transition hover:bg-white/20"
                >
                  🐢 0.8×
                </button>
                <button
                  onClick={() => {
                    SFX.play('page');
                    setRevealed(true);
                  }}
                  disabled={revealed}
                  className="rounded-xl border border-pink-400/40 bg-pink-500/20 px-2.5 py-1 text-xs font-extrabold text-pink-200 transition hover:bg-pink-500/30 disabled:opacity-40"
                >
                  👁️ Hiện chữ
                </button>
                {revealed && (
                  <button
                    onClick={() => {
                      SFX.play('tap');
                      setTranslated((t) => !t);
                    }}
                    className="rounded-xl border border-amber-400/40 bg-amber-500/20 px-2.5 py-1 text-xs font-extrabold text-amber-200"
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
                  className="flex cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed border-cyan-400/35 bg-[#120A30]/60 py-4 transition hover:border-cyan-400"
                >
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5, 6, 7].map((bar) => (
                      <span
                        key={bar}
                        className={`w-1.5 rounded-full bg-gradient-to-t from-pink-500 to-cyan-400 transition-all ${
                          npcSpeaking ? 'h-6 animate-pulse' : 'h-3 opacity-60'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-cyan-200">
                    Đang ẩn chữ (Blind Listening) · Chạm để nghe lại
                  </span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <p className="font-display text-base font-bold leading-relaxed text-white">
                    “{turn.npc}”
                  </p>
                  {translated && (
                    <p className="text-xs font-semibold italic text-amber-200">
                      🇻🇳 {turn.npcVi}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 2. CUE CARD / TASK CARD BY TURN MODE */}
          <div className="flex-1 rounded-3xl border border-white/15 bg-white/5 p-4 shadow-xl backdrop-blur-xl">
            <div className="mb-2 flex items-center justify-between">
              <span className="rounded-full border border-pink-400/40 bg-pink-500/20 px-3 py-0.5 text-[11px] font-black uppercase tracking-wider text-pink-200">
                {turn.mode === 'catch'
                  ? '🎯 WORD-CATCHER + SPEAKING'
                  : turn.mode === 'semi'
                  ? '✍️ BÁN KỊCH BẢN (SEMI-SCRIPTED)'
                  : turn.mode === 'free'
                  ? '🔥 ỨNG BIẾN TỰ DO (FREEFORM)'
                  : turn.mode === 'quiz'
                  ? '⚡ PHẢN XẠ NGHE HIỂU (QUIZ)'
                  : '🎙️ CUE CARD (SCRIPTED)'}
              </span>

              {turn.mode === 'quiz' && reflexLeft !== null && (
                <span
                  className={`rounded-full px-3 py-0.5 text-xs font-black ${
                    reflexLeft <= 5
                      ? 'animate-pulse bg-rose-500 text-white'
                      : 'bg-amber-400 text-slate-950'
                  }`}
                >
                  ⏱️ Phản xạ: {reflexLeft}s
                </span>
              )}
            </div>

            {/* MODE A: SCRIPTED OR CATCH */}
            {(turn.mode === 'scripted' || turn.mode === 'catch') && (
              <div className="space-y-3">
                {/* Word-Catcher fill-in-the-blank preview */}
                {turn.mode === 'catch' && micPhase === 'locked' ? (
                  <div>
                    <p className="font-display text-base font-extrabold leading-relaxed text-white">
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
                                      ? 'border-emerald-400 bg-emerald-500/25 text-emerald-200'
                                      : 'border-dashed border-cyan-400 bg-cyan-500/15 text-cyan-300'
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
                        const alreadyCaught = (turn.catchAnswers || [])
                          .slice(0, caughtIndices.length)
                          .some((a) => a.toLowerCase() === w.toLowerCase());
                        const isWrong = wrongCatchWords.includes(w);
                        return (
                          <button
                            key={`${w}-${idx}`}
                            disabled={alreadyCaught || isWrong}
                            onClick={() => handleCatchWordClick(w)}
                            className={`rounded-xl border px-3 py-1.5 text-xs font-extrabold transition ${shakeWord === w ? 'animate-shake' : ''} ${
                              alreadyCaught
                                ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-300 opacity-50'
                                : isWrong
                                ? 'border-rose-500/40 bg-rose-500/20 text-rose-300 line-through opacity-40'
                                : 'border-cyan-400/50 bg-cyan-500/20 text-white hover:scale-105 hover:bg-cyan-500/35'
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
                              className={`rounded-lg px-1.5 py-0.5 transition hover:scale-105 ${
                                tok.status === 'ok'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : tok.status === 'near'
                                  ? 'bg-amber-500/25 text-amber-300 underline decoration-wavy'
                                  : 'bg-rose-500/25 text-rose-300 underline decoration-wavy'
                              }`}
                            >
                              {tok.word}
                            </button>
                          ))
                        : (turn.cue || '').split(/\s+/).map((w, i) => (
                            <span key={i} className="text-white">
                              {w}
                            </span>
                          ))}
                    </div>
                    {turn.cueVi && (
                      <p className="mt-1.5 text-xs font-semibold text-slate-300">
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
                <p className="font-display text-lg font-extrabold text-white">
                  {turn.frame}
                </p>
                {turn.cueVi && (
                  <p className="text-xs font-semibold text-slate-300">
                    🇻🇳 {turn.cueVi}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  {(turn.blankPool || []).map((group, gIdx) => (
                    <div
                      key={gIdx}
                      className="rounded-xl border border-white/15 bg-black/30 px-2.5 py-1.5 text-xs"
                    >
                      <span className="font-black text-cyan-300">Ô {gIdx + 1}: </span>
                      <span className="font-semibold text-slate-200">
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
                <p className="font-display text-base font-extrabold text-white">
                  🎯 Nhiệm vụ: {turn.task}
                </p>
                <p className="text-xs font-semibold text-amber-200">{turn.taskVi}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(turn.requiredKeywords || []).map((grp, i) => {
                    const hit = evalResult?.matchedKeywords?.includes(grp[0]);
                    return (
                      <span
                        key={i}
                        className={`rounded-lg border px-2 py-0.5 text-[11px] font-bold ${
                          hit
                            ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                            : 'border-pink-400/40 bg-pink-500/15 text-pink-200'
                        }`}
                      >
                        Bắt buộc: {grp.slice(0, 3).join(' / ')}
                      </span>
                    );
                  })}
                  {(turn.bonusKeywords || []).map((grp, i) => (
                    <span
                      key={i}
                      className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-bold text-cyan-200"
                    >
                      Thưởng: {grp.slice(0, 2).join(' / ')}
                    </span>
                  ))}
                </div>
                {turn.sample && (
                  <p className="text-[11px] italic text-slate-400">
                    Gợi ý mẫu: “{turn.sample}”
                  </p>
                )}
              </div>
            )}

            {/* MODE D: QUIZ */}
            {turn.mode === 'quiz' && (
              <div className="space-y-2.5">
                <p className="font-display text-sm font-extrabold text-cyan-200">
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
                        className={`w-full rounded-2xl border p-3 text-left text-xs font-bold transition ${shakeQuizIdx === idx ? 'animate-shake' : ''} ${
                          isPicked
                            ? 'border-emerald-400 bg-emerald-500/25 text-white shadow-lg'
                            : isWrong
                            ? 'border-rose-500/40 bg-rose-500/20 text-rose-300 opacity-50'
                            : 'border-white/15 bg-white/5 text-slate-100 hover:border-cyan-400 hover:bg-white/10'
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
            <div className="mt-3 rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-[11px] font-semibold text-purple-200">
              💡 {turn.tip}
            </div>

            {/* Evaluation Result Banner */}
            {(interimText || evalResult) && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/15 bg-[#120A30]/80 px-3.5 py-2">
                <div className="text-xs">
                  <span className="font-bold text-slate-400">Máy nghe được: </span>
                  <span className="font-semibold italic text-cyan-200">
                    “{evalResult ? evalResult.transcript : interimText}”
                  </span>
                </div>
                {evalResult && (
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-black text-amber-300">
                      {evalResult.score}% · {'★'.repeat(evalResult.stars)}
                      {'☆'.repeat(3 - evalResult.stars)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. BOTTOM MICROPHONE & ACTION BAR */}
          <div className="rounded-3xl border border-white/15 bg-[#120A30]/95 p-3 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Left: Sample Audio + Fallback Toggle */}
              <div className="flex items-center gap-1.5">
                {turn.mode !== 'quiz' && (
                  <>
                    <button
                      onClick={() => handlePlaySampleCue(false)}
                      className="rounded-xl border border-white/15 bg-white/10 px-2.5 py-2 text-xs font-extrabold text-white transition hover:bg-white/20"
                    >
                      🔊 Mẫu 1×
                    </button>
                    <button
                      onClick={() => handlePlaySampleCue(true)}
                      className="rounded-xl border border-white/15 bg-white/10 px-2.5 py-2 text-xs font-extrabold text-cyan-200 transition hover:bg-white/20"
                    >
                      🐢 0.8×
                    </button>
                    <button
                      onClick={() => setShowFallbackBox((v) => !v)}
                      className="rounded-xl border border-amber-400/40 bg-amber-500/15 px-2.5 py-2 text-xs font-extrabold text-amber-200 transition hover:bg-amber-500/25"
                    >
                      ⌨️ Giả lập / Gõ
                    </button>
                  </>
                )}
              </div>

              {/* Center: Primary Microphone Button (for non-quiz turns) */}
              {turn.mode !== 'quiz' && (
                <button
                  onClick={handleMicPress}
                  className={`flex items-center gap-2 rounded-2xl px-6 py-2.5 font-display text-sm font-black text-white shadow-xl transition hover:scale-105 ${
                    micPhase === 'locked'
                      ? 'cursor-not-allowed bg-slate-700 opacity-60'
                      : micPhase === 'rec'
                      ? 'animate-pulse bg-gradient-to-r from-rose-500 to-pink-600 shadow-[0_0_25px_#F43F5E]'
                      : micPhase === 'arming'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 shadow-[0_0_20px_rgba(255,79,216,0.45)]'
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
                      ? '🎙️ Thu lại lấy 3★'
                      : '🎙️ Chạm để Nói'}
                  </span>
                </button>
              )}

              {/* Right: Skip & Continue Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNextTurn(true)}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/15"
                >
                  Bỏ qua
                </button>
                <button
                  disabled={(turnStars[turnIdx] || 0) < 1}
                  onClick={() => handleNextTurn(false)}
                  className="rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-2 text-xs font-black text-slate-950 shadow-lg transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {turnIdx + 1 >= scene.turns.length ? 'Kết thúc 🎉' : 'Tiếp tục ➔'}
                </button>
              </div>
            </div>

            {/* Fallback Simulator / Keyboard Box */}
            {showFallbackBox && turn.mode !== 'quiz' && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-2.5">
                <span className="text-[11px] font-bold text-slate-300">
                  Chế độ dự phòng:
                </span>
                <button
                  onClick={() => handleSimulateGrade('perfect')}
                  className="rounded-lg bg-emerald-500/25 px-2.5 py-1 text-xs font-black text-emerald-200 hover:bg-emerald-500/35"
                >
                  ⚡ Giả lập Chuẩn (3★)
                </button>
                <button
                  onClick={() => handleSimulateGrade('near')}
                  className="rounded-lg bg-amber-500/25 px-2.5 py-1 text-xs font-black text-amber-200 hover:bg-amber-500/35"
                >
                  ⚡ Giả lập Gần (2★)
                </button>
                <button
                  onClick={() => handleSimulateGrade('bad')}
                  className="rounded-lg bg-rose-500/25 px-2.5 py-1 text-xs font-black text-rose-200 hover:bg-rose-500/35"
                >
                  ⚡ Giả lập Sai (0★)
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
                    className="min-w-[160px] flex-1 rounded-xl border border-white/20 bg-black/40 px-3 py-1 text-xs text-white placeholder-slate-400 focus:border-cyan-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-cyan-500 px-3 py-1 text-xs font-black text-slate-950"
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
