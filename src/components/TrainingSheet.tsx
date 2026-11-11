import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDialog } from './useDialog';
import { useGameStore } from '../core/store';
import { dueChunkIds, evaluateChunkUse, masteredChunks } from '../core/chunks';
import { canDoList, pickForDay, weeklyDue, weeklyTrend, WEEKLY_PASS } from '../core/cando';
import { evaluateRecallCandidates } from '../core/recall';
import { checkPauses } from '../core/phonology';
import { CHUNKS } from '../data/chunks';
import { RHYTHM_DRILLS, rhythmPauses, rhythmPlain, type RhythmDrill } from '../data/rhythm';
import { scriptTurns } from '../data/content';
import { SFX, SpeechEngine, Voice } from '../audio/audioSystem';
import { recordClip, type ClipHandle } from '../audio/clipRecorder';

type Tab = 'warmup' | 'rhythm' | 'cando';

const BTN = 'min-h-[48px] rounded-xl border-2 border-ghibli-clay px-4 text-sm font-black transition active:scale-[0.98] disabled:opacity-50';
const BTN_SUN = `${BTN} bg-gradient-to-r from-ghibli-sun to-[#F7C35C] text-ghibli-ink shadow-[0_3px_0_#6B4E3D]`;
const BTN_SAGE = `${BTN} bg-gradient-to-r from-ghibli-sage to-[#9FD68A] text-ghibli-ink shadow-[0_3px_0_#6B4E3D]`;
const BTN_PLAIN = `${BTN} bg-ghibli-cream text-ghibli-ink`;
const BTN_REC = `${BTN} bg-gradient-to-r from-[#D1502C] to-[#B2421E] text-white shadow-[0_3px_0_#6B4E3D]`;

/** Thu một câu nói bằng bộ nhận dạng của trình duyệt; có ô gõ thay khi mic không dùng được. */
function useSpeak() {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [needTyping, setNeedTyping] = useState(false);
  const tokenRef = useRef(0);

  useEffect(
    () => () => {
      tokenRef.current++;
      SpeechEngine.abort();
    },
    []
  );

  const listen = async (): Promise<string[] | null> => {
    if (listening) {
      SpeechEngine.stop();
      return null;
    }
    const mine = ++tokenRef.current;
    Voice.stop();
    setListening(true);
    setInterim('');
    const res = await SpeechEngine.listen({ onInterim: (t) => tokenRef.current === mine && setInterim(t) });
    if (tokenRef.current !== mine) return null;
    setListening(false);
    if (res.reason === 'aborted') return null;
    if (res.reason === 'error' || (!res.transcript && res.reason === 'no-speech')) {
      setNeedTyping(true);
      return null;
    }
    return res.alternatives.length > 0 ? res.alternatives : [res.transcript];
  };

  return { listening, interim, needTyping, listen, reset: () => setInterim('') };
}

/** Nút mic kèm ô gõ thay. onAnswer nhận các phương án máy nghe được. */
const AnswerBar: React.FC<{ onAnswer: (candidates: string[]) => void; label?: string }> = ({ onAnswer, label = '🎙️ Nói câu của bạn' }) => {
  const speak = useSpeak();
  const [typed, setTyped] = useState('');
  return (
    <div className="space-y-2">
      <button
        onClick={async () => {
          const c = await speak.listen();
          if (c) onAnswer(c);
        }}
        className={`w-full ${speak.listening ? BTN_REC : BTN_SUN}`}
      >
        {speak.listening ? '⏹️ Dừng & chấm' : label}
      </button>
      {speak.listening && speak.interim && <p className="text-sm font-semibold italic text-[#23706A]">“{speak.interim}”</p>}
      {speak.needTyping && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (typed.trim()) onAnswer([typed.trim()]);
            setTyped('');
          }}
        >
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Mic chưa nghe được: gõ câu tiếng Anh vào đây"
            className="min-h-[48px] min-w-0 flex-1 rounded-xl border-2 border-ghibli-clay bg-white px-3 text-sm font-semibold text-ghibli-ink"
          />
          <button type="submit" className={BTN_SAGE}>
            Chấm
          </button>
        </form>
      )}
    </div>
  );
};

// ── Khởi động: nói lại các cụm tới hạn trong ngữ cảnh mới ─────────────────────
const Warmup: React.FC = () => {
  const learn = useGameStore((s) => s.state.learn);
  const day = useGameStore((s) => s.state.day);
  const gradeChunk = useGameStore((s) => s.gradeChunk);
  // Chốt danh sách lúc mở, để chấm xong một cụm thì hàng đợi không tự xáo lại
  const queue = useMemo(() => dueChunkIds(learn.chunks, day, 8).filter((id) => CHUNKS[id]), []);
  const [idx, setIdx] = useState(0);
  const [peeked, setPeeked] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; heard: string; hasChunk: boolean } | null>(null);
  const [graded, setGraded] = useState(false);
  const [right, setRight] = useState(0);

  const total = Object.keys(learn.chunks).length;
  if (queue.length === 0 || idx >= queue.length) {
    return (
      <div className="space-y-3 text-center">
        <div className="text-4xl">{queue.length === 0 ? '🌤️' : '🎉'}</div>
        <p className="font-display text-lg font-black text-ghibli-ink">
          {queue.length === 0 ? 'Hôm nay chưa có cụm nào tới hạn.' : `Xong phần khởi động: đúng ${right}/${queue.length} cụm ngay lần đầu.`}
        </p>
        <p className="text-sm font-semibold text-ghibli-ink-soft">
          {total === 0
            ? 'Hoàn thành một show hay hoạt động để nhận hai cụm mang về. Chúng sẽ tới hạn vào ngày hôm sau.'
            : `Bạn đang giữ ${total} cụm, trong đó ${masteredChunks(learn.chunks)} cụm đã vững. Cụm nói sai sẽ quay lại vào ngày mai.`}
        </p>
      </div>
    );
  }

  const chunk = CHUNKS[queue[idx]];
  const answer = (candidates: string[]) => {
    let best = { ok: false, hasChunk: false, heard: candidates[0] || '' };
    for (const c of candidates) {
      const r = evaluateChunkUse(chunk.en, c);
      if (r.ok || (r.hasChunk && !best.hasChunk)) best = { ok: r.ok, hasChunk: r.hasChunk, heard: c };
      if (r.ok) break;
    }
    SFX.play(best.ok ? 'ting' : 'error');
    setResult(best);
    if (!graded) {
      // Chỉ lần nói đầu tiên quyết định lịch ôn; xem trước cụm thì coi như chưa thuộc
      const correct = best.ok && !peeked;
      gradeChunk(chunk.id, correct);
      if (correct) setRight((n) => n + 1);
      setGraded(true);
    }
  };
  const next = () => {
    setIdx((i) => i + 1);
    setPeeked(false);
    setResult(null);
    setGraded(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-black text-ghibli-ink-soft">
        <span>
          Cụm {idx + 1}/{queue.length}
        </span>
        <span>Nói một câu trọn vẹn có dùng cụm này</span>
      </div>
      <div className="rounded-2xl border-2 border-ghibli-clay bg-[#FFF8E1] p-3">
        <div className="text-xs font-black text-[#6B4E00]">Tình huống mới</div>
        <p className="mt-0.5 font-display text-lg font-extrabold leading-snug text-ghibli-ink">{chunk.useVi}</p>
        <p className="mt-2 text-sm font-bold text-ghibli-ink">
          Dùng cụm có nghĩa: <span className="text-[#B2421E]">“{chunk.vi}”</span>
        </p>
        {peeked || result ? (
          <p className="mt-1 font-display text-xl font-black text-[#2F6128]">{chunk.en}</p>
        ) : (
          <button onClick={() => setPeeked(true)} className="mt-2 min-h-[44px] rounded-xl border-2 border-dashed border-ghibli-clay px-3 text-xs font-extrabold text-ghibli-ink-soft">
            💡 Quên rồi, cho xem cụm (mai ôn lại)
          </button>
        )}
      </div>

      {result && (
        <div className={`rounded-2xl border-2 border-ghibli-clay p-3 ${result.ok ? 'bg-[#E4F2DC]' : 'bg-[#FCE4DA]'}`}>
          <p className="text-sm font-black text-ghibli-ink">
            {result.ok
              ? peeked
                ? '✅ Đúng rồi. Vì đã xem trước nên mai cụm này quay lại.'
                : '✅ Chuẩn! Cụm này sẽ quay lại sau vài ngày.'
              : result.hasChunk
              ? '🟡 Có cụm rồi, nhưng hãy nói thành một câu trọn vẹn.'
              : '❌ Chưa nghe thấy cụm này trong câu của bạn.'}
          </p>
          <p className="mt-1 text-sm font-semibold italic text-ghibli-ink-soft">Máy nghe được: “{result.heard}”</p>
          <button onClick={() => Voice.speak(chunk.sample, { npcId: 'coach' })} className="mt-2 block w-full rounded-xl border-2 border-ghibli-clay bg-white px-3 py-2 text-left text-base font-extrabold text-ghibli-ink">
            🔊 Câu mẫu: {chunk.sample}
          </button>
        </div>
      )}

      <AnswerBar key={`${chunk.id}-${result ? 'retry' : 'first'}`} onAnswer={answer} label={result ? '🎙️ Nói lại cho quen miệng' : '🎙️ Nói câu của bạn'} />
      {result && (
        <button onClick={next} className={`w-full ${BTN_SAGE}`}>
          {idx + 1 >= queue.length ? 'Hoàn thành ✔' : 'Cụm tiếp ➔'}
        </button>
      )}
    </div>
  );
};

// ── Nhịp ngắt nghỉ ────────────────────────────────────────────────────────────
const Rhythm: React.FC = () => {
  const passed = useGameStore((s) => s.state.learn.rhythm);
  const recordRhythm = useGameStore((s) => s.recordRhythm);
  const [drill, setDrill] = useState<RhythmDrill>(() => RHYTHM_DRILLS.find((d) => !passed[d.id]) || RHYTHM_DRILLS[0]);
  const [recording, setRecording] = useState(false);
  const [report, setReport] = useState<ReturnType<typeof checkPauses> | 'nomic' | null>(null);
  const clipRef = useRef<ClipHandle | null>(null);

  useEffect(() => () => clipRef.current?.stop(), []);

  const expected = rhythmPauses(drill);
  const toggle = async () => {
    if (recording) {
      clipRef.current?.stop();
      return;
    }
    Voice.stop();
    setReport(null);
    setRecording(true);
    const clip = recordClip(12000);
    clipRef.current = clip;
    const samples = await clip.done;
    setRecording(false);
    if (!samples) {
      setReport('nomic');
      return;
    }
    const rep = checkPauses(samples, expected);
    SFX.play(rep.ok ? 'ting' : 'error');
    setReport(rep);
    recordRhythm(drill.id, rep.ok);
  };

  const parts = drill.marked.split(' / ');
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-ghibli-ink-soft">
        Đọc cả câu, dừng một nhịp rõ ở mỗi dấu <span className="font-black text-[#B2421E]">/</span>. Máy đếm số chỗ ngắt trong giọng của bạn (chưa kiểm tra bạn ngắt đúng từ nào).
      </p>
      <div className="flex flex-wrap gap-1.5">
        {RHYTHM_DRILLS.map((d, i) => (
          <button
            key={d.id}
            onClick={() => {
              setDrill(d);
              setReport(null);
            }}
            className={`min-h-[44px] min-w-[44px] rounded-full border-2 border-ghibli-clay px-3 text-sm font-black ${
              d.id === drill.id ? 'bg-ghibli-sun text-ghibli-ink' : passed[d.id] ? 'bg-[#E4F2DC] text-[#2F6128]' : 'bg-ghibli-cream text-ghibli-ink'
            }`}
          >
            {passed[d.id] ? '✓' : ''}
            {i + 1}
          </button>
        ))}
      </div>
      <div className="rounded-2xl border-2 border-ghibli-clay bg-[#FFF8E1] p-3">
        <p className="font-display text-xl font-extrabold leading-relaxed text-ghibli-ink">
          {parts.map((part, i) => (
            <React.Fragment key={i}>
              {part}
              {i < parts.length - 1 && <span className="mx-1.5 font-black text-[#B2421E]">/</span>}
            </React.Fragment>
          ))}
        </p>
        <p className="mt-1.5 text-sm font-semibold text-ghibli-ink-soft">🇻🇳 {drill.vi}</p>
        <p className="mt-1.5 text-sm font-bold text-[#6B4E00]">💡 {drill.tip}</p>
      </div>
      <div className="flex gap-2">
        <button onClick={() => Voice.speak(rhythmPlain(drill), { npcId: 'coach' })} className={BTN_PLAIN}>
          🔊 Nghe mẫu
        </button>
        <button onClick={toggle} className={`flex-1 ${recording ? BTN_REC : BTN_SUN}`}>
          {recording ? '⏹️ Đọc xong, chấm nhịp' : '🎙️ Đọc và thu âm'}
        </button>
      </div>
      {report && (
        <div className={`rounded-2xl border-2 border-ghibli-clay p-3 text-sm font-bold text-ghibli-ink ${report !== 'nomic' && report.ok ? 'bg-[#E4F2DC]' : 'bg-[#FDF0CF]'}`}>
          {report === 'nomic'
            ? 'Không thu được tiếng. Hãy cho phép dùng micro rồi thử lại.'
            : report.verdict === 'silent'
            ? 'Bản ghi quá nhỏ hoặc không có tiếng. Hãy nói gần micro hơn.'
            : report.verdict === 'ok'
            ? `✅ Bạn ngắt ${report.found} chỗ (cần ${expected}). Nhịp rõ ràng!`
            : report.verdict === 'rushed'
            ? `Bạn mới ngắt rõ ${report.found}/${expected} chỗ. Dừng hẳn khoảng nửa giây ở mỗi dấu /.`
            : `Bạn ngắt tới ${report.found} chỗ, nhiều hơn ${expected} chỗ cần thiết. Nối liền các từ trong cùng một cụm ý.`}
        </div>
      )}
    </div>
  );
};

// ── Năng lực và bài kiểm tra tuần ─────────────────────────────────────────────
interface TestItem {
  npc: string;
  npcId: string;
  speaker?: 'emma' | 'liam';
  target: string;
}

const CanDo: React.FC = () => {
  const learn = useGameStore((s) => s.state.learn);
  const day = useGameStore((s) => s.state.day);
  const recordWeekly = useGameStore((s) => s.recordWeekly);
  const [items, setItems] = useState<TestItem[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [last, setLast] = useState<{ score: number; heard: string } | null>(null);
  const [finalScore, setFinalScore] = useState<number | null>(null);

  const list = canDoList(learn);
  const due = weeklyDue(learn, day);
  const trend = weeklyTrend(learn);
  const lastTest = learn.weekly.history[learn.weekly.history.length - 1];

  const start = () => {
    const pool: TestItem[] = [];
    for (const key of Object.keys(learn.exposure)) {
      const script = scriptTurns(key);
      if (!script) continue;
      for (const t of script.turns) {
        if ((t.mode === 'scripted' || t.mode === 'catch') && t.cue) {
          pool.push({ npc: t.npc, npcId: t.who || script.scene.npc, speaker: t.speaker, target: t.cue });
        }
      }
    }
    const picked = pickForDay(pool, day, 6);
    if (picked.length === 0) return;
    setItems(picked);
    setIdx(0);
    setScores([]);
    setLast(null);
    setFinalScore(null);
    Voice.speak(picked[0].npc, { npcId: picked[0].npcId, speaker: picked[0].speaker });
  };

  const answer = (candidates: string[]) => {
    if (!items || last) return;
    const res = evaluateRecallCandidates(items[idx].target, candidates);
    SFX.play(res.stars >= 2 ? 'ting' : 'error');
    setLast({ score: res.score, heard: res.transcript });
    setScores((s) => [...s, res.score]);
  };

  const next = () => {
    if (!items) return;
    if (idx + 1 >= items.length) {
      const avg = scores.reduce((a, b) => a + b, 0) / Math.max(1, scores.length);
      recordWeekly(avg);
      setFinalScore(Math.round(avg));
      setItems(null);
      return;
    }
    const n = idx + 1;
    setIdx(n);
    setLast(null);
    Voice.speak(items[n].npc, { npcId: items[n].npcId, speaker: items[n].speaker });
  };

  if (items) {
    const it = items[idx];
    return (
      <div className="space-y-3">
        <div className="text-xs font-black text-ghibli-ink-soft">
          Kiểm tra tuần · câu {idx + 1}/{items.length} · không có chữ, không có gợi ý
        </div>
        <button onClick={() => Voice.speak(it.npc, { npcId: it.npcId, speaker: it.speaker })} className={`w-full ${BTN_PLAIN}`}>
          🔊 Nghe lại câu của NPC
        </button>
        <p className="text-sm font-semibold text-ghibli-ink-soft">Nghe rồi tự đáp lại bằng tiếng Anh như khi đang dẫn thật.</p>
        {last ? (
          <div className="rounded-2xl border-2 border-ghibli-clay bg-[#FFF8E1] p-3">
            <p className="text-sm font-black text-ghibli-ink">Đạt {last.score}% ý của câu mẫu</p>
            <p className="mt-1 text-sm font-semibold italic text-ghibli-ink-soft">Bạn nói: “{last.heard}”</p>
            <p className="mt-1 text-sm font-semibold text-ghibli-ink-soft">NPC: “{it.npc}”</p>
            <p className="mt-1 font-display text-base font-extrabold text-[#2F6128]">Câu mẫu: {it.target}</p>
            <button onClick={next} className={`mt-2 w-full ${BTN_SAGE}`}>
              {idx + 1 >= items.length ? 'Xem kết quả' : 'Câu tiếp ➔'}
            </button>
          </div>
        ) : (
          <AnswerBar key={idx} onAnswer={answer} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-ghibli-ink-soft">
        Tiến bộ tính bằng việc bạn tự làm được, không phải số sao. Mỗi dòng cần bằng chứng từ những lượt nói không có thẻ nhắc.
      </p>
      <ul className="space-y-2">
        {list.map((c) => (
          <li key={c.id} className={`rounded-2xl border-2 border-ghibli-clay p-2.5 ${c.done ? 'bg-[#E4F2DC]' : 'bg-ghibli-cream'}`}>
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-extrabold leading-snug text-ghibli-ink">
                {c.done ? '✅ ' : ''}
                {c.label}
              </span>
              <span className="shrink-0 font-display text-sm font-black text-ghibli-ink">
                {c.have}/{c.need}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ghibli-track">
              <div className="h-full rounded-full bg-gradient-to-r from-ghibli-sage to-[#9FD68A]" style={{ width: `${(c.have / c.need) * 100}%` }} />
            </div>
            {!c.done && <div className="mt-1 text-xs font-semibold text-ghibli-ink-soft">{c.how}</div>}
          </li>
        ))}
      </ul>

      <div className="rounded-2xl border-2 border-ghibli-clay bg-[#FFF8E1] p-3">
        <div className="font-display text-base font-black text-ghibli-ink">📝 Bài kiểm tra tuần</div>
        {finalScore !== null && (
          <p className="mt-1 text-sm font-black text-ghibli-ink">
            Kết quả: {finalScore}% {finalScore >= WEEKLY_PASS ? '(đạt)' : `(cần ${WEEKLY_PASS}% để đạt)`}
            {trend !== null && ` · ${trend >= 0 ? 'tăng' : 'giảm'} ${Math.abs(trend)} điểm so với lần trước`}
          </p>
        )}
        {finalScore === null && lastTest && (
          <p className="mt-1 text-sm font-semibold text-ghibli-ink-soft">
            Lần gần nhất (ngày {lastTest.day}): {lastTest.score}%
          </p>
        )}
        <p className="mt-1 text-sm font-semibold text-ghibli-ink-soft">
          Sáu câu lấy từ các tình huống bạn đã gặp. Chỉ nghe NPC rồi tự đáp, không chữ và không gợi ý.
        </p>
        {due ? (
          <button onClick={start} className={`mt-2 w-full ${BTN_SUN}`}>
            Bắt đầu bài kiểm tra
          </button>
        ) : (
          <p className="mt-2 text-sm font-black text-ghibli-ink">
            {Object.keys(learn.exposure).length === 0
              ? 'Hoàn thành ít nhất một show để mở bài kiểm tra.'
              : `Bài kế tiếp mở vào ngày ${learn.weekly.lastDay + 7} (hôm nay là ngày ${day}).`}
          </p>
        )}
      </div>
    </div>
  );
};

/** Phòng luyện: khởi động bằng cụm, nhịp ngắt nghỉ, và bảng năng lực. Mở từ nút 🎯 ở phòng MC. */
export const TrainingSheet: React.FC = () => {
  const open = useGameStore((s) => s.trainOpen);
  const tab = useGameStore((s) => s.trainTab);
  const setTrainOpen = useGameStore((s) => s.setTrainOpen);
  const close = () => {
    Voice.stop();
    SpeechEngine.abort();
    setTrainOpen(false);
  };
  const dialog = useDialog(open, close, 'Phòng luyện');
  if (!open) return null;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'warmup', label: '🔥 Khởi động' },
    { id: 'rhythm', label: '🎼 Nhịp' },
    { id: 'cando', label: '🎯 Năng lực' },
  ];

  return (
    <div {...dialog.backdropProps} className="fixed inset-0 z-50 flex items-end justify-center bg-ghibli-ink/20 sm:items-center sm:p-4">
      <div {...dialog.panelProps} className="ghibli-panel flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-[#EFE5D4] px-4 py-3">
          <h2 className="font-display text-xl font-black text-ghibli-ink">Phòng luyện</h2>
          <button onClick={close} className="min-h-[44px] rounded-full ghibli-panel px-3.5 text-xs font-black text-ghibli-ink">
            Đóng ✕
          </button>
        </div>
        <div className="flex gap-1.5 border-b border-[#EFE5D4] px-3 py-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTrainOpen(true, t.id)}
              className={`min-h-[44px] flex-1 rounded-xl border-2 border-ghibli-clay px-2 text-sm font-black ${tab === t.id ? 'bg-ghibli-sun text-ghibli-ink' : 'bg-ghibli-cream text-ghibli-ink-soft'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="overflow-y-auto p-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          {tab === 'warmup' && <Warmup />}
          {tab === 'rhythm' && <Rhythm />}
          {tab === 'cando' && <CanDo />}
        </div>
      </div>
    </div>
  );
};
