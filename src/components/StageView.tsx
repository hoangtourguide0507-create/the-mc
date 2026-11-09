import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NPCS, SCENES } from '../data/content';
import { clamp } from '../core/clock';
import { evaluateTurnCandidates } from '../core/evaluator';
import { useGameStore } from '../core/store';
import { HUD_BOTTOM_PAD, HUD_PAD } from './HUD';
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

  const speakerDisplayName = currentNpc.isCouple
    ? turn.speaker === 'liam'
      ? 'Liam (Chú rể)'
      : 'Emma (Cô dâu)'
    : currentNpc.name;

  return (
    <div
      className="mx-auto flex h-full max-w-6xl flex-col gap-2.5 overflow-y-auto px-2.5 pb-4 sm:px-5 md:grid md:grid-cols-12 md:gap-4 md:overflow-hidden"
      style={{ paddingTop: HUD_PAD, paddingBottom: HUD_BOTTOM_PAD }}
    >
      {/* LEFT / TOP COLUMN: EXPANSIVE 3D STAGE VIEWPORT WITH FLOATING CORNER PILLS */}
      <div className="relative h-52 w-full shrink-0 sm:h-72 md:col-span-6 md:h-full">
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

        {/* Top-Left Floating Exit & Show Title Pill */}
        <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex items-center justify-between gap-2">
          <div className="pointer-events-auto flex items-center gap-1.5">
            <button
              onClick={handleLeaveStage}
              className="btn-tactile flex h-10 items-center gap-1 rounded-full px-3 text-xs font-black text-[#B2351A]"
            >
              <span>✕</span>
              <span>Rời</span>
            </button>
            <div className="cozy-pill hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold text-ghibli-ink sm:flex">
              <span>{scene.icon}</span>
              <span className="max-w-[160px] truncate">{scene.title}</span>
            </div>
          </div>

          {/* Top-Right Turn Progress & Stars Pill */}
          <div className="cozy-pill pointer-events-auto flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black">
            <span className="text-ghibli-ink">
              Lượt {turnIdx + 1}/{scene.turns.length}
            </span>
            <div className="h-2 w-16 overflow-hidden rounded-full bg-[#EFE6D5] sm:w-20">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#FFC652] to-[#58AD42] transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3].map((s) => (
                <span
                  key={s}
                  className={
                    s <= currentAvgStars ? 'text-[#F0A32A]' : 'text-ghibli-ink/20'
                  }
                >
                  ★
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom-Left Floating Speaker Status Chip on Stage */}
        <div className="pointer-events-none absolute bottom-3 left-3 z-20 flex items-center gap-2 rounded-full border border-[#D4B896] bg-[#FFFDF9]/95 px-3 py-1 text-xs font-extrabold text-ghibli-ink shadow-md">
          <span>{turn.channel === 'inear' ? '🎧 Tai nghe:' : '💬 Đang thoại:'}</span>
          <span className="font-black text-[#1F7A73]">{speakerDisplayName}</span>
          {npcSpeaking && (
            <span className="inline-flex h-2 w-2 animate-ping rounded-full bg-[#43B0A8]" />
          )}
        </div>
      </div>

      {/* RIGHT / BOTTOM COLUMN: SPEECH BUBBLE + CUE CARD + HERO MIC DOCK */}
      <div className="flex flex-1 flex-col justify-between gap-2.5 md:col-span-6 md:h-full md:overflow-y-auto md:pr-1">
        {/* 1. NPC DIALOGUE SPEECH BUBBLE */}
        <div className="cozy-card relative rounded-3xl p-3.5">
          {/* Bubble Header: Speaker Name + Blind Bonus + Compact Audio Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EFE5D4] pb-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E6F4F1] text-sm">
                {turn.channel === 'inear' ? '🎧' : '💬'}
              </span>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-sm font-black text-ghibli-ink">
                    {speakerDisplayName}
                  </span>
                  {!revealed && (
                    <span className="rounded-full bg-[#E5F6DF] px-2 py-0.5 text-xs font-black text-[#2C731D]">
                      Blind ×2 XP
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Compact Tactile Audio Control Strip */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handlePlayNpcAudio(false)}
                title="Nghe lại tốc độ chuẩn"
                className="btn-tactile flex h-9 items-center gap-1 rounded-full px-3 text-xs font-extrabold"
              >
                <span>🔊</span>
                <span>1×</span>
              </button>
              <button
                onClick={() => handlePlayNpcAudio(true)}
                title="Nghe chậm 0.8×"
                className="btn-tactile flex h-9 items-center gap-1 rounded-full px-3 text-xs font-extrabold text-[#1F7A73]"
              >
                <span>🐢</span>
                <span>0.8×</span>
              </button>
              {!revealed ? (
                <button
                  onClick={() => {
                    SFX.play('page');
                    setRevealed(true);
                  }}
                  className="btn-tactile flex h-9 items-center gap-1 rounded-full bg-[#FFF3D6] px-3 text-xs font-extrabold text-[#9C5B00]"
                >
                  <span>👁️</span>
                  <span>Hiện chữ</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    SFX.play('tap');
                    setTranslated((t) => !t);
                  }}
                  className="btn-tactile flex h-9 items-center gap-1 rounded-full bg-[#FFF3D6] px-3 text-xs font-extrabold text-[#9C5B00]"
                >
                  <span>🇻🇳</span>
                  <span>Dịch</span>
                </button>
              )}
            </div>
          </div>

          {/* Bubble Content: Blind Audio Wave OR Revealed Dialogue Text */}
          <div className="mt-2.5">
            {!revealed ? (
              <button
                onClick={() => handlePlayNpcAudio(false)}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-dashed border-[#D4B896] bg-[#FAF4E8] px-4 py-3 text-left transition hover:bg-[#F4E9D5]"
              >
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5, 6, 7].map((bar) => (
                    <span
                      key={bar}
                      className={`w-1.5 rounded-full bg-gradient-to-t from-[#F0A32A] to-[#43B0A8] transition-all ${
                        npcSpeaking ? 'h-5' : 'h-2.5 opacity-60'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs font-extrabold text-ghibli-ink">
                  Đang ẩn lời thoại để nhân đôi XP · Chạm để nghe lại
                </span>
              </button>
            ) : (
              <div className="space-y-1">
                <p className="font-display text-base font-extrabold leading-relaxed text-ghibli-ink">
                  “{turn.npc}”
                </p>
                {translated && (
                  <p className="text-xs font-semibold italic text-[#9C5B00]">
                    🇻🇳 {turn.npcVi}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 2. CUE CARD / INTERACTIVE TASK CARD */}
        <div className="cozy-card flex flex-1 flex-col justify-between rounded-3xl p-4">
          <div>
            {/* Mode Badge & Reflex Countdown */}
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <span className="rounded-full bg-[#F3E8FB] px-3 py-1 text-xs font-black uppercase tracking-wider text-[#6535C4]">
                {turn.mode === 'catch'
                  ? '🎯 Bắt Từ Khoá & Đọc Câu'
                  : turn.mode === 'semi'
                  ? '✍️ Bán Kịch Bản (Semi-Scripted)'
                  : turn.mode === 'free'
                  ? '🔥 Ứng Biến Tự Do (Freeform)'
                  : turn.mode === 'quiz'
                  ? '⚡ Phản Xạ Nghe Hiểu (Quiz)'
                  : '🎙️ Kịch Bản MC (Cue Card)'}
              </span>

              {turn.mode === 'quiz' && reflexLeft !== null && (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${
                    reflexLeft <= 5
                      ? 'bg-[#D94E2F] text-white'
                      : 'bg-[#FFF0D4] text-[#9C5B00]'
                  }`}
                >
                  ⏱️ Phản xạ: {reflexLeft}s
                </span>
              )}
            </div>

            {/* MODE A: SCRIPTED OR CATCH */}
            {(turn.mode === 'scripted' || turn.mode === 'catch') && (
              <div className="space-y-3">
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
                                  className={`mx-1 inline-block rounded-xl px-2.5 py-0.5 text-sm font-black ${
                                    filled
                                      ? 'bg-[#E5F6DF] text-[#2C731D]'
                                      : 'border border-dashed border-[#43B0A8] bg-[#E6F4F1] text-[#1F7A73]'
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
                            className={`min-h-[44px] rounded-2xl px-4 py-2 text-sm font-extrabold transition ${
                              shakeWord === w ? 'animate-shake' : ''
                            } ${
                              alreadyCaught
                                ? 'bg-[#E5F6DF] text-[#2C731D] opacity-60'
                                : isWrong
                                ? 'bg-[#FDECE7] text-[#B2351A] line-through opacity-60'
                                : 'btn-tactile'
                            }`}
                          >
                            {w}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
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
                              className={`inline-flex min-h-[38px] items-center rounded-xl px-2.5 py-0.5 transition hover:scale-105 ${
                                tok.status === 'ok'
                                  ? 'bg-[#E5F6DF] text-[#2C731D]'
                                  : tok.status === 'near'
                                  ? 'bg-[#FFF0D4] text-[#9C5B00] underline decoration-wavy'
                                  : 'bg-[#FDECE7] text-[#B2351A] underline decoration-wavy'
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
                    {turn.cueVi && (
                      <p className="mt-1.5 text-xs font-semibold text-ghibli-ink-soft">
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
                {turn.cueVi && (
                  <p className="text-xs font-semibold text-ghibli-ink-soft">
                    🇻🇳 {turn.cueVi}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  {(turn.blankPool || []).map((group, gIdx) => (
                    <div
                      key={gIdx}
                      className="rounded-2xl border border-[#DFC9AE] bg-[#FAF4E8] px-3 py-1.5 text-xs"
                    >
                      <span className="font-black text-[#1F7A73]">Ô {gIdx + 1}: </span>
                      <span className="font-bold text-ghibli-ink">
                        {group.join(' / ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MODE C: FREEFORM IMPROVISATION */}
            {turn.mode === 'free' && (
              <div className="space-y-2">
                <p className="font-display text-base font-extrabold text-ghibli-ink">
                  🎯 Nhiệm vụ: {turn.task}
                </p>
                <p className="text-xs font-semibold text-[#9C5B00]">{turn.taskVi}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(turn.requiredKeywords || []).map((grp, i) => {
                    const hit = evalResult?.matchedKeywords?.includes(grp[0]);
                    return (
                      <span
                        key={i}
                        className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                          hit
                            ? 'bg-[#E5F6DF] text-[#2C731D]'
                            : 'bg-[#FDECE7] text-[#B2351A]'
                        }`}
                      >
                        Bắt buộc: {grp.slice(0, 3).join(' / ')}
                      </span>
                    );
                  })}
                  {(turn.bonusKeywords || []).map((grp, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-[#E6F4F1] px-3 py-1 text-xs font-extrabold text-[#1F7A73]"
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
            {turn.mode === 'quiz' && (
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
                        className={`min-h-[48px] w-full rounded-2xl p-3 text-left text-sm font-extrabold transition ${
                          shakeQuizIdx === idx ? 'animate-shake' : ''
                        } ${
                          isPicked
                            ? 'border-2 border-[#3F8D2B] bg-[#E5F6DF] text-[#2C731D] shadow-sm'
                            : isWrong
                            ? 'bg-[#FDECE7] text-[#B2351A] opacity-60'
                            : 'btn-tactile'
                        }`}
                      >
                        {opt.t}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Coach Tip & Evaluation Feedback Strip */}
          <div className="mt-3 space-y-2">
            {(interimText || evalResult) ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#FFF6E4] px-3.5 py-2">
                <div className="text-xs">
                  <span className="font-bold text-ghibli-ink-soft">Máy nghe được: </span>
                  <span className="font-extrabold italic text-[#1F7A73]">
                    “{evalResult ? evalResult.transcript : interimText}”
                  </span>
                </div>
                {evalResult && (
                  <span className="rounded-full bg-[#FFC652] px-3 py-0.5 text-xs font-black text-ghibli-ink shadow-sm">
                    {evalResult.score}% · {'★'.repeat(evalResult.stars)}
                    {'☆'.repeat(3 - evalResult.stars)}
                  </span>
                )}
              </div>
            ) : (
              <div className="rounded-2xl bg-[#FAF4E8] px-3.5 py-2 text-xs font-semibold text-ghibli-ink-soft">
                💡 {turn.tip}
              </div>
            )}
          </div>
        </div>

        {/* 3. BOTTOM HERO MICROPHONE & ACTION DOCK */}
        <div className="cozy-card rounded-3xl p-2.5 sm:p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Left: Sample Audio & Keyboard Fallback */}
            <div className="flex items-center gap-1.5">
              {turn.mode !== 'quiz' && (
                <>
                  <button
                    onClick={() => handlePlaySampleCue(false)}
                    title="Nghe câu mẫu 1×"
                    className="btn-tactile flex h-11 items-center gap-1 rounded-2xl px-3 text-xs font-extrabold"
                  >
                    <span>🔊</span>
                    <span>Mẫu</span>
                  </button>
                  <button
                    onClick={() => handlePlaySampleCue(true)}
                    title="Nghe mẫu chậm 0.8×"
                    className="btn-tactile flex h-11 items-center gap-1 rounded-2xl px-2.5 text-xs font-extrabold text-[#1F7A73]"
                  >
                    <span>🐢</span>
                    <span>0.8×</span>
                  </button>
                  <button
                    onClick={() => setShowFallbackBox((v) => !v)}
                    title="Mở bàn phím hoặc nút chấm thử"
                    className={`btn-tactile flex h-11 items-center gap-1 rounded-2xl px-3 text-xs font-extrabold ${
                      showFallbackBox ? 'bg-[#FFF3D6] text-[#9C5B00]' : ''
                    }`}
                  >
                    <span>⌨️</span>
                    <span className="hidden sm:inline">Gõ</span>
                  </button>
                </>
              )}
            </div>

            {/* Center: HERO MICROPHONE BUTTON */}
            {turn.mode !== 'quiz' && (
              <button
                onClick={handleMicPress}
                className={`flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl px-5 py-3 font-display text-sm font-black transition sm:flex-initial sm:px-7 ${
                  micPhase === 'locked'
                    ? 'cursor-not-allowed bg-[#EFE6D5] text-ghibli-ink-soft opacity-65'
                    : micPhase === 'rec'
                    ? 'btn-tactile-coral animate-pulse'
                    : micPhase === 'arming'
                    ? 'btn-tactile-amber'
                    : 'btn-tactile-sage'
                }`}
              >
                <span className="text-base leading-none">
                  {micPhase === 'locked'
                    ? '🔒'
                    : micPhase === 'arming'
                    ? '⏳'
                    : micPhase === 'rec'
                    ? '⏹️'
                    : '🎙️'}
                </span>
                <span>
                  {micPhase === 'locked'
                    ? 'Bắt từ trước'
                    : micPhase === 'arming'
                    ? 'Đang mở Mic...'
                    : micPhase === 'rec'
                    ? 'Dừng & Chấm'
                    : evalResult && evalResult.stars > 0
                    ? 'Thu lại lấy 3★'
                    : 'Chạm để Nói'}
                </span>
              </button>
            )}

            {/* Right: Skip & Next Turn */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleNextTurn(true)}
                className="btn-tactile h-11 rounded-2xl px-3 text-xs font-extrabold text-ghibli-ink-soft"
              >
                Bỏ qua
              </button>
              <button
                disabled={(turnStars[turnIdx] || 0) < 1}
                onClick={() => handleNextTurn(false)}
                className={`h-11 rounded-2xl px-4 text-xs font-black transition ${
                  (turnStars[turnIdx] || 0) >= 1
                    ? 'btn-tactile-amber'
                    : 'cursor-not-allowed bg-[#EFE6D5] text-ghibli-ink-soft opacity-55'
                }`}
              >
                {turnIdx + 1 >= scene.turns.length ? 'Kết thúc 🎉' : 'Tiếp tục ➔'}
              </button>
            </div>
          </div>

          {/* Fallback Simulator / Keyboard Box */}
          {showFallbackBox && turn.mode !== 'quiz' && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-[#EFE5D4] pt-2.5">
              <button
                onClick={() => handleSimulateGrade('perfect')}
                className="btn-tactile rounded-xl bg-[#E5F6DF] px-3 py-2 text-xs font-black text-[#2C731D]"
              >
                ⚡ Thử đúng (3★)
              </button>
              <button
                onClick={() => handleSimulateGrade('near')}
                className="btn-tactile rounded-xl bg-[#FFF0D4] px-3 py-2 text-xs font-black text-[#9C5B00]"
              >
                ⚡ Gần đúng (2★)
              </button>
              <button
                onClick={() => handleSimulateGrade('bad')}
                className="btn-tactile rounded-xl bg-[#FDECE7] px-3 py-2 text-xs font-black text-[#B2351A]"
              >
                ⚡ Thử sai (0★)
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
                  placeholder="Gõ câu tiếng Anh vào đây..."
                  className="h-10 min-w-[140px] flex-1 rounded-xl border border-[#D4B896] bg-white px-3 text-sm text-ghibli-ink placeholder-ghibli-ink-soft focus:border-[#43B0A8] focus:outline-none"
                />
                <button
                  type="submit"
                  className="btn-tactile-sage h-10 rounded-xl px-4 text-xs font-black"
                >
                  Chấm
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
