import React, { useEffect, useMemo, useState } from 'react';
import { NPCS } from '../data/content';
import {
  PRON_GROUP_META,
  PronDrill,
  coachFor,
  pickPronDrill,
} from '../data/pronunciation';
import { normText, SpeechEngine, Voice } from '../audio/audioSystem';
import { useGameStore } from '../core/store';

type Verdict = { kind: 'ok' | 'miss' | 'empty'; heard: string } | null;

/** Bắt lỗi phát âm: mở từ nút 🗣️ ở Hub. Bài được chọn ngẫu nhiên có trọng số. */
export const PronunciationSheet: React.FC = () => {
  const pronOpen = useGameStore((s) => s.pronOpen);
  const setPronOpen = useGameStore((s) => s.setPronOpen);
  const pron = useGameStore((s) => s.state.pron);
  const recordPron = useGameStore((s) => s.recordPron);

  const [drill, setDrill] = useState<PronDrill | null>(null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [verdict, setVerdict] = useState<Verdict>(null);
  const [typed, setTyped] = useState('');
  const [showTyped, setShowTyped] = useState(false);

  // Chọn bài mới mỗi lần mở sheet
  useEffect(() => {
    if (pronOpen) {
      setDrill(pickPronDrill(pron.progress, pron.recent));
      setVerdict(null);
      setTyped('');
      setShowTyped(false);
    } else {
      Voice.stop();
      SpeechEngine.abort();
    }
    // Chỉ chạy khi mở/đóng; không đọc lại tiến độ để tránh đổi bài giữa chừng
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pronOpen]);

  const coach = drill ? NPCS[coachFor(drill)] : undefined;
  const meta = drill ? PRON_GROUP_META[drill.group] : undefined;
  const stat = drill ? pron.progress[drill.id] : undefined;

  const heardWords = useMemo(() => normText(verdict?.heard ?? '').split(/\s+/).filter(Boolean), [verdict]);

  if (!pronOpen || !drill || !meta) return null;

  const playWord = () => {
    Voice.speak(drill.word, { npcId: coachFor(drill), slow: true });
  };

  const playSentence = () => {
    Voice.speak(drill.sentence.en, { npcId: coachFor(drill) });
  };

  const judge = (heard: string) => {
    const norm = normText(heard);
    if (!norm) {
      setVerdict({ kind: 'empty', heard: '' });
      return;
    }
    const words = norm.split(/\s+/);
    const ok = words.some((w) => drill.accepted.includes(w));
    setVerdict({ kind: ok ? 'ok' : 'miss', heard });
    recordPron(drill.id, ok);
  };

  const speakAttempt = async () => {
    setVerdict(null);
    setListening(true);
    setInterim('');
    const res = await SpeechEngine.listen({ onInterim: (t) => setInterim(t) });
    setListening(false);
    if (res.reason === 'aborted') return;
    if (res.reason === 'error' || (!res.transcript && res.reason === 'no-speech')) {
      setShowTyped(true);
      return;
    }
    judge(res.transcript);
  };

  const submitTyped = () => {
    if (!typed.trim()) return;
    judge(typed);
    setTyped('');
  };

  const nextDrill = () => {
    const nextPick = pickPronDrill(pron.progress, [...pron.recent, drill.id]);
    setDrill(nextPick);
    setVerdict(null);
    setInterim('');
    setTyped('');
    setShowTyped(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ghibli-ink/40 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border ghibli-panel shadow-2xl sm:rounded-3xl">
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
          {/* Nhóm lỗi và huấn luyện viên */}
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
                      ? 'border-ghibli-clay bg-ghibli-sun text-ghibli-ink text-lg'
                      : 'border-ghibli-track bg-ghibli-cream text-ghibli-ink-soft text-base'
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

          {/* Nghe mẫu */}
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

          {/* Phân tích âm */}
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

          {/* Lỗi thường gặp */}
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

          {drill.pair && (
            <p className="text-xs font-bold text-ghibli-ink-soft">
              So sánh với từ dễ nhầm: <span className="text-ghibli-ink">{drill.pair}</span>
            </p>
          )}

          {/* Luyện nói */}
          <section className="space-y-2 rounded-2xl ghibli-panel p-4">
            <div className="font-black text-ghibli-ink">Đến lượt bạn: nói “{drill.word}”</div>
            <p className="text-xs text-ghibli-ink-soft">
              Nhận dạng giọng nói chỉ kiểm tra được từ có được nhận ra, không chấm được từng âm. Hãy tự so
              sánh với phần nghe mẫu và phân tích ở trên.
            </p>

            <button
              onClick={speakAttempt}
              disabled={listening}
              className="min-h-[48px] w-full rounded-2xl bg-gradient-to-r from-[#7FBF6A] to-[#9FD68A] px-3 text-sm font-black text-ghibli-ink border-2 border-ghibli-clay shadow-md disabled:opacity-50"
            >
              {listening ? '🎙️ Đang nghe…' : '🎤 Nói từ này'}
            </button>
            {listening && interim && (
              <p className="rounded-xl border border-ghibli-track p-2 text-xs italic text-ghibli-ink-soft">{interim}</p>
            )}

            {showTyped ? (
              <div className="flex gap-2">
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitTyped()}
                  placeholder="Gõ từ bạn vừa đọc…"
                  className="min-h-[48px] flex-1 rounded-xl border border-ghibli-clay bg-ghibli-cream px-3 text-sm text-ghibli-ink outline-none"
                />
                <button
                  onClick={submitTyped}
                  className="min-h-[48px] rounded-xl bg-ghibli-sun px-4 text-sm font-black text-ghibli-ink"
                >
                  Gửi
                </button>
              </div>
            ) : (
              !listening && (
                <button
                  onClick={() => setShowTyped(true)}
                  className="w-full text-xs font-bold text-ghibli-ink-soft underline"
                >
                  Không có mic? Gõ từ thay thế
                </button>
              )
            )}

            {verdict && (
              <div
                className={`rounded-xl border-2 p-3 text-sm font-bold ${
                  verdict.kind === 'ok'
                    ? 'border-ghibli-sage bg-[#EAF6E2] text-emerald-800'
                    : 'border-rose-300 bg-[#FCEBEB] text-rose-700'
                }`}
              >
                {verdict.kind === 'ok' && <>✅ Đúng rồi! Bạn vừa đọc “{drill.word}” rõ ràng. (+5 XP)</>}
                {verdict.kind === 'miss' && (
                  <>
                    ❌ Chưa nhận ra “{drill.word}”. Hệ thống nghe được: “{heardWords.join(' ') || verdict.heard}”.
                    Nghe mẫu lại và thử lần nữa.
                  </>
                )}
                {verdict.kind === 'empty' && <>Chưa nghe rõ. Thử lại nhé.</>}
              </div>
            )}
          </section>

          <button
            onClick={nextDrill}
            className="min-h-[48px] w-full rounded-2xl ghibli-panel px-3 text-sm font-black text-ghibli-ink"
          >
            🎲 Bài khác (ngẫu nhiên)
          </button>

          {/* Câu mẫu */}
          <section className="rounded-xl border border-ghibli-track p-3 text-xs text-ghibli-ink-soft">
            <div className="font-black text-ghibli-ink">{drill.sentence.en}</div>
            <div className="mt-0.5">{drill.sentence.vi}</div>
          </section>
        </div>
      </div>
    </div>
  );
};
