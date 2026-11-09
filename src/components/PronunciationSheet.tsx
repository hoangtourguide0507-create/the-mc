import { useDialog } from './useDialog';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NPCS } from '../data/content';
import {
  PRON_DRILLS,
  PRON_GROUP_META,
  PronDrill,
  coachFor,
  pickPronDrill,
} from '../data/pronunciation';
import { normText, SpeechEngine, Voice } from '../audio/audioSystem';
import { recordClip, ClipHandle } from '../audio/clipRecorder';
import { ModelStatus, modelStatus, onModelStatus, transcribePhones } from '../audio/phonemeModel';
import {
  AlignOp,
  bestScore,
  checkStress,
  phoneVerdict,
  StressReport,
  tokenizePhones,
} from '../core/phonology';
import { useGameStore } from '../core/store';

type PhoneResult = {
  source: 'phone';
  pass: boolean;
  score: number;
  ops: AlignOp[];
  stress: StressReport;
  heardText: string;
};
type SpeechResult = { source: 'speech'; pass: boolean; heard: string } | { source: 'empty' } | null;
type Result = PhoneResult | SpeechResult;

const OP_LABEL = (op: AlignOp): { text: string; cls: string } => {
  switch (op.kind) {
    case 'match':
      return { text: `✓ /${op.target}/`, cls: 'text-emerald-700' };
    case 'near':
      return { text: `~ /${op.target}/ gần đúng (bạn đọc /${op.heard}/)`, cls: 'text-amber-700' };
    case 'missing':
      return { text: `✗ thiếu /${op.target}/`, cls: 'text-rose-700' };
    case 'wrong':
      return { text: `✗ /${op.target}/ bị đọc thành /${op.heard}/`, cls: 'text-rose-700' };
    case 'extra':
      return { text: `+ thừa /${op.heard}/`, cls: 'text-amber-700' };
  }
};

/** Bài luyện nói + nghe phân biệt. Mở từ nút 🗣️ ở Hub. */
export const PronunciationSheet: React.FC = () => {
  const pronOpen = useGameStore((s) => s.pronOpen);
  const setPronOpen = useGameStore((s) => s.setPronOpen);
  const pron = useGameStore((s) => s.state.pron);
  const recordPron = useGameStore((s) => s.recordPron);

  const [drill, setDrill] = useState<PronDrill | null>(null);
  const [phase, setPhase] = useState<'idle' | 'recording' | 'analyzing'>('idle');
  const [interim, setInterim] = useState('');
  const [result, setResult] = useState<Result>(null);
  const [mStatus, setMStatus] = useState<ModelStatus>(modelStatus());
  const [mProgress, setMProgress] = useState(0);
  const [typed, setTyped] = useState('');
  const [showTyped, setShowTyped] = useState(false);
  const clipRef = useRef<ClipHandle | null>(null);

  // Lắng nghe trạng thái tải mô hình
  useEffect(() => onModelStatus((s, p) => {
    setMStatus(s);
    setMProgress(p);
  }), []);

  // Chọn bài mới mỗi lần mở sheet; dọn dẹp khi đóng
  useEffect(() => {
    if (pronOpen) {
      setDrill(pickPronDrill(pron.progress, pron.recent));
      setResult(null);
      setTyped('');
      setShowTyped(false);
    } else {
      clipRef.current?.stop();
      Voice.stop();
      SpeechEngine.abort();
      setPhase('idle');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pronOpen]);

  const coach = drill ? NPCS[coachFor(drill)] : undefined;
  const meta = drill ? PRON_GROUP_META[drill.group] : undefined;
  const stat = drill ? pron.progress[drill.id] : undefined;
  const speechWords = useMemo(
    () => (result && result.source === 'speech' ? normText(result.heard).split(/\s+/).filter(Boolean) : []),
    [result]
  );

  const dialog = useDialog(pronOpen, () => setPronOpen(false), 'Luyện phát âm');
  if (!pronOpen || !drill || !meta) return null;

  const playWord = () => Voice.speak(drill.word, { npcId: coachFor(drill), slow: true });
  const playSentence = () => Voice.speak(drill.sentence.en, { npcId: coachFor(drill) });

  /** Dự phòng: nhận dạng từ bằng giọng nói của trình duyệt (cách cũ) */
  const judgeText = (heard: string) => {
    const norm = normText(heard);
    if (!norm) {
      setResult({ source: 'empty' });
      return;
    }
    const ok = norm.split(/\s+/).some((w) => drill.accepted.includes(w));
    setResult({ source: 'speech', pass: ok, heard });
    recordPron(drill.id, ok);
  };

  const speechFallback = async () => {
    setPhase('recording');
    setInterim('');
    const res = await SpeechEngine.listen({ onInterim: (t) => setInterim(t) });
    setPhase('idle');
    if (res.reason === 'aborted') return;
    if (res.reason === 'error' || (!res.transcript && res.reason === 'no-speech')) {
      setShowTyped(true);
      return;
    }
    judgeText(res.transcript);
  };

  /** Luyện nói chính: ghi âm → mô hình phoneme → so IPA + kiểm tra trọng âm */
  const startPhoneAttempt = async () => {
    if (modelStatus() === 'error') {
      speechFallback();
      return;
    }
    setResult(null);
    setPhase('recording');
    const handle = recordClip(2500);
    clipRef.current = handle;
    const samples = await handle.done;
    clipRef.current = null;
    if (!samples) {
      setPhase('idle');
      setResult({ source: 'empty' });
      return;
    }
    setPhase('analyzing');
    let text: string;
    try {
      text = await transcribePhones(samples);
    } catch {
      setPhase('idle');
      speechFallback();
      return;
    }
    const heard = tokenizePhones(text);
    const targets = [tokenizePhones(drill.ipa), tokenizePhones(drill.ipaAlt ?? drill.ipa)];
    const best = bestScore(targets, heard);
    const stress = checkStress(samples, drill.syllables);
    const pass = phoneVerdict(best) && stress.stressOk !== false;
    setResult({
      source: 'phone',
      pass,
      score: best.score,
      ops: best.ops,
      stress,
      heardText: text,
    });
    recordPron(drill.id, pass);
    setPhase('idle');
  };

  const stopRecording = () => clipRef.current?.stop();

  const nextDrill = () => {
    const nextPick = pickPronDrill(pron.progress, [...pron.recent, drill.id]);
    setDrill(nextPick);
    setResult(null);
    setInterim('');
    setTyped('');
    setShowTyped(false);
  };

  const modelLine =
    mStatus === 'loading'
      ? `Đang tải mô hình phát âm lần đầu… ${mProgress}%`
      : mStatus === 'ready'
      ? 'Mô hình phát âm đã sẵn sàng (chạy trên máy bạn).'
      : mStatus === 'error'
      ? 'Không tải được mô hình phát âm. Đang dùng nhận dạng từ cơ bản.'
      : 'Lần đầu sẽ tải mô hình phát âm (vài trăm MB, chỉ một lần).';

  return (
    <div {...dialog.backdropProps} className="fixed inset-0 z-50 flex items-end justify-center bg-ghibli-ink/20 sm:items-center sm:p-4">
      <div {...dialog.panelProps} className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border ghibli-panel shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-ghibli-track px-5 py-4">
          <h2 className="font-display text-xl font-black text-ghibli-ink">🗣️ Bắt lỗi phát âm</h2>
          <button
            onClick={() => setPronOpen(false)}
            className="min-h-[48px] rounded-full ghibli-panel px-4 text-sm font-black text-ghibli-ink"
          >
            Đóng ✕
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm text-ghibli-ink">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="rounded-full border border-ghibli-clay bg-[#FDF0CF] px-3 py-1 text-[#8A5A00]">
              {meta.label}
            </span>
            <span className="text-ghibli-ink-soft">
              Huấn luyện viên: <span className="font-black text-ghibli-ink">{coach?.name ?? '—'}</span>
            </span>
            {stat && (
              <span className="text-ghibli-ink-soft">
                Đã thử {stat.tries} · đạt {stat.ok}
              </span>
            )}
          </div>

          {/* Từ và phiên âm */}
          <section className="rounded-2xl ghibli-panel p-4 text-center">
            <div className="font-display text-4xl font-black text-ghibli-ink">{drill.word}</div>
            <div className="mt-1 text-base font-bold text-ghibli-ink-soft">
              {drill.ipa}
              {drill.ipaAlt && <span className="ml-2 text-xs">hoặc {drill.ipaAlt}</span>}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              {drill.syllables.map((syl, i) => (
                <span
                  key={`${syl.text}-${i}`}
                  className={`rounded-xl border-2 px-3 py-1.5 font-display font-black ${
                    syl.stressed
                      ? 'border-ghibli-clay bg-ghibli-sun text-lg text-ghibli-ink'
                      : 'border-ghibli-track bg-ghibli-cream text-base text-ghibli-ink-soft'
                  }`}
                >
                  {syl.text}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs font-bold text-ghibli-ink-soft">
              Âm tiết to và nổi bật hơn là âm được nhấn.
            </p>
          </section>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={playWord}
              className="min-h-[48px] rounded-2xl border-2 border-ghibli-clay bg-gradient-to-r from-[#7FBF6A] to-[#9FD68A] px-3 text-sm font-black text-ghibli-ink shadow-md"
            >
              🔊 Nghe từ (chậm)
            </button>
            <button
              onClick={playSentence}
              className="min-h-[48px] rounded-2xl ghibli-panel px-3 text-sm font-black text-ghibli-ink"
            >
              💬 Nghe câu mẫu
            </button>
          </div>

          <section>
            <h3 className="mb-1.5 font-display text-base font-black text-pink-700">Phân tích từng âm</h3>
            <ul className="space-y-2">
              {drill.analysis.map((a) => (
                <li key={a.part} className="rounded-xl border border-ghibli-track bg-ghibli-cream p-3">
                  <div className="font-black text-ghibli-ink">{a.part}</div>
                  <div className="mt-0.5 text-ghibli-ink-soft">{a.note}</div>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="mb-1.5 font-display text-base font-black text-pink-700">Lỗi người Việt hay gặp</h3>
            <ul className="space-y-2">
              {drill.mistakes.map((m) => (
                <li key={m.wrong} className="rounded-xl border border-rose-300 bg-[#FCEBEB] p-3">
                  <div className="font-black text-rose-700">✗ {m.wrong}</div>
                  <div className="mt-0.5 text-ghibli-ink-soft">{m.why}</div>
                </li>
              ))}
            </ul>
          </section>

          <p className="rounded-xl border border-ghibli-track bg-[#E6F4EC] p-3 text-ghibli-ink">
            <span className="font-black">💡 Mẹo:</span> {drill.tip}
          </p>

          {/* Luyện nói */}
          <section className="space-y-2 rounded-2xl ghibli-panel p-4">
            <div className="font-black text-ghibli-ink">Đến lượt bạn: nói “{drill.word}”</div>
            <p className="text-xs text-ghibli-ink-soft">{modelLine}</p>

            {phase === 'recording' ? (
              <button
                onClick={stopRecording}
                className="min-h-[48px] w-full rounded-2xl border-2 border-ghibli-clay bg-rose-200 px-3 text-sm font-black text-ghibli-ink"
              >
                ⏹ Dừng ghi âm
              </button>
            ) : (
              <button
                onClick={startPhoneAttempt}
                disabled={phase === 'analyzing'}
                className="min-h-[48px] w-full rounded-2xl border-2 border-ghibli-clay bg-gradient-to-r from-[#7FBF6A] to-[#9FD68A] px-3 text-sm font-black text-ghibli-ink shadow-md disabled:opacity-50"
              >
                {phase === 'analyzing' ? '⏳ Đang phân tích…' : '🎤 Nói từ này'}
              </button>
            )}
            {interim && <p className="rounded-xl border border-ghibli-track p-2 text-xs italic text-ghibli-ink-soft">{interim}</p>}

            {showTyped ? (
              <div className="flex gap-2">
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && typed.trim()) {
                      judgeText(typed);
                      setTyped('');
                    }
                  }}
                  placeholder="Gõ từ bạn vừa đọc…"
                  className="min-h-[48px] flex-1 rounded-xl border border-ghibli-clay bg-ghibli-cream px-3 text-sm text-ghibli-ink outline-none"
                />
                <button
                  onClick={() => {
                    if (typed.trim()) {
                      judgeText(typed);
                      setTyped('');
                    }
                  }}
                  className="min-h-[48px] rounded-xl bg-ghibli-sun px-4 text-sm font-black text-ghibli-ink"
                >
                  Gửi
                </button>
              </div>
            ) : (
              phase === 'idle' && (
                <button onClick={() => setShowTyped(true)} className="min-h-[44px] w-full text-xs font-bold text-ghibli-ink-soft underline">
                  Không có mic? Gõ từ thay thế
                </button>
              )
            )}

            {result && result.source === 'phone' && (
              <div className="space-y-2">
                <div
                  className={`rounded-xl border-2 p-3 font-bold ${
                    result.pass ? 'border-ghibli-sage bg-[#EAF6E2] text-emerald-800' : 'border-rose-300 bg-[#FCEBEB] text-rose-700'
                  }`}
                >
                  {result.pass ? '✅ Phát âm đạt (+5 XP)' : '❌ Chưa đạt, xem chi tiết bên dưới'} · độ khớp {Math.round(result.score * 100)}%
                </div>
                <ul className="space-y-1 rounded-xl border border-ghibli-track bg-ghibli-cream p-3 text-xs font-bold">
                  {result.ops.map((op, i) => {
                    const l = OP_LABEL(op);
                    return (
                      <li key={i} className={l.cls}>
                        {l.text}
                      </li>
                    );
                  })}
                </ul>
                <p className="text-xs text-ghibli-ink-soft">
                  Nghe mô hình hiểu là: <span className="font-black">{result.heardText || '(không nghe được âm nào)'}</span>
                </p>
                <p className={`text-xs font-bold ${result.stress.stressOk === false ? 'text-rose-700' : 'text-ghibli-ink-soft'}`}>
                  {result.stress.message}
                </p>
              </div>
            )}

            {result && result.source === 'speech' && (
              <div
                className={`rounded-xl border-2 p-3 text-sm font-bold ${
                  result.pass ? 'border-ghibli-sage bg-[#EAF6E2] text-emerald-800' : 'border-rose-300 bg-[#FCEBEB] text-rose-700'
                }`}
              >
                {result.pass ? `✅ Nhận ra “${drill.word}” (+5 XP)` : `❌ Chưa nhận ra “${drill.word}”. Nghe được: “${speechWords.join(' ') || result.heard}”.`}
                <div className="mt-1 text-xs font-normal">Nhận dạng từ chỉ kiểm tra từ, không chấm từng âm. Hãy so với phần nghe mẫu.</div>
              </div>
            )}
            {result && result.source === 'empty' && <div className="text-sm font-bold text-rose-700">Chưa nghe rõ. Hãy kiểm tra micro và thử lại.</div>}
          </section>

          {drill.pair && <PairGame key={drill.id} drill={drill} />}

          <button
            onClick={nextDrill}
            disabled={phase !== 'idle'}
            className="min-h-[48px] w-full rounded-2xl ghibli-panel px-3 text-sm font-black text-ghibli-ink disabled:opacity-50"
          >
            🎲 Bài khác (ngẫu nhiên)
          </button>

          <section className="rounded-xl border border-ghibli-track p-3 text-xs text-ghibli-ink-soft">
            <div className="font-black text-ghibli-ink">{drill.sentence.en}</div>
            <div className="mt-0.5">{drill.sentence.vi}</div>
          </section>
        </div>
      </div>
    </div>
  );
};

/** Trò chơi nghe phân biệt cặp từ dễ nhầm: kiểm tra khả năng nghe, không cần mic. */
const PairGame: React.FC<{ drill: PronDrill }> = ({ drill }) => {
  const pairWord = drill.pair as string;
  const pairDrill = PRON_DRILLS.find((d) => d.word === pairWord);
  const [target, setTarget] = useState<string>(drill.word);
  const [options, setOptions] = useState<string[]>([drill.word, pairWord]);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState({ right: 0, total: 0 });

  const newRound = () => {
    const t = Math.random() < 0.5 ? drill.word : pairWord;
    setTarget(t);
    setOptions(Math.random() < 0.5 ? [drill.word, pairWord] : [pairWord, drill.word]);
    setPicked(null);
  };

  useEffect(() => {
    Voice.speak(target, { npcId: coachFor(drill) });
    // chỉ phát khi đổi vòng
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const choose = (w: string) => {
    if (picked) return;
    setPicked(w);
    setScore((s) => ({ right: s.right + (w === target ? 1 : 0), total: s.total + 1 }));
  };

  return (
    <section className="space-y-2 rounded-2xl border border-ghibli-track bg-ghibli-cream p-4">
      <div className="font-black text-ghibli-ink">Nghe phân biệt: {drill.word} hay {pairWord}?</div>
      <p className="text-xs text-ghibli-ink-soft">
        Trò này kiểm tra khả năng nghe. Nghe rồi chọn từ đúng.
        {pairDrill ? ` (${pairWord}: ${pairDrill.ipa})` : ''}
      </p>
      <button
        onClick={() => Voice.speak(target, { npcId: coachFor(drill) })}
        className="min-h-[48px] w-full rounded-2xl ghibli-panel px-3 text-sm font-black text-ghibli-ink"
      >
        🔊 Nghe lại
      </button>
      <div className="grid grid-cols-2 gap-2">
        {options.map((w) => {
          const isRight = w === target;
          const showState = picked !== null;
          return (
            <button
              key={w}
              onClick={() => choose(w)}
              className={`min-h-[48px] rounded-2xl border-2 px-3 font-display text-lg font-black ${
                showState && isRight
                  ? 'border-ghibli-sage bg-[#EAF6E2] text-emerald-800'
                  : showState && picked === w
                  ? 'border-rose-300 bg-[#FCEBEB] text-rose-700'
                  : 'border-ghibli-clay bg-ghibli-cream text-ghibli-ink'
              }`}
            >
              {w}
            </button>
          );
        })}
      </div>
      {picked && (
        <div className="flex items-center justify-between gap-2 text-sm font-bold">
          <span className={picked === target ? 'text-emerald-700' : 'text-rose-700'}>
            {picked === target ? 'Đúng rồi!' : `Sai, đó là “${target}”.`}
          </span>
          <button onClick={newRound} className="min-h-[48px] rounded-xl ghibli-panel px-3 text-sm font-black text-ghibli-ink">
            Vòng tiếp
          </button>
        </div>
      )}
      <div className="text-xs font-bold text-ghibli-ink-soft">
        Đúng {score.right}/{score.total}
      </div>
    </section>
  );
};
