/**
 * Luyện nhịp ngắt nghỉ (bản HTML thuần của Rhythm trong TrainingSheet.tsx cũ). Giữ nguyên logic:
 * - bài đầu tiên chưa đạt là bài mở đầu; chọn bài bằng nút số
 * - thu 12 giây bằng recordClip, chấm số quãng nghỉ bằng checkPauses
 * - chỉ bài đạt (rep.ok) mới được ghi vào store qua recordRhythm
 * Hàm dọn dẹp dừng giọng, dừng lượt thu đang chạy, huỷ watch và gỡ DOM.
 */
import './rhythm.css';
import { SFX, Voice } from '../../../audio/audioSystem';
import { recordClip, type ClipHandle } from '../../../audio/clipRecorder';
import { checkPauses } from '../../../core/phonology';
import { gameStore } from '../../../core/store';
import { RHYTHM_DRILLS, rhythmPauses, rhythmPlain, type RhythmDrill } from '../../../data/rhythm';
import { watch } from '../../../engine/watch';
import { append, clear, h } from '../../dom';

type Report = ReturnType<typeof checkPauses> | 'nomic';

export function mountRhythm(root: HTMLElement): () => void {
  let disposed = false;
  let passed: Record<string, number> = gameStore.getState().state.learn.rhythm;
  let drill: RhythmDrill = RHYTHM_DRILLS.find((d) => !passed[d.id]) || RHYTHM_DRILLS[0];
  let recording = false;
  let report: Report | null = null;
  let clip: ClipHandle | null = null;

  const chipsEl = h('div', { class: 'chips rhythm-drills', role: 'group', 'aria-label': 'Chọn bài luyện nhịp' });
  const lineEl = h('p', { class: 'rhythm-line' });
  const viEl = h('p', { class: 'vi' });
  const tipEl = h('p', { class: 'rhythm-tip' });
  const sheetEl = h('div', { class: 'panel rhythm-sheet' }, lineEl, viEl, tipEl);

  const listenBtn = h(
    'button',
    {
      class: 'btn quiet',
      type: 'button',
      onclick: () => void Voice.speak(rhythmPlain(drill), { npcId: 'coach' }),
    },
    'Nghe mẫu'
  );
  const recBtn = h('button', { class: 'btn', type: 'button', onclick: () => void toggle() }, 'Đọc và thu âm');
  const actionsEl = h('div', { class: 'rhythm-actions' }, listenBtn, recBtn);

  const reportEl = h('div', { class: 'rhythm-report', role: 'status', 'aria-live': 'polite' });
  reportEl.hidden = true;

  const wrap = h(
    'div',
    { class: 'rhythm' },
    h(
      'p',
      { class: 'rhythm-intro' },
      'Đọc cả câu, dừng một nhịp rõ ở mỗi dấu ',
      h('span', { class: 'rhythm-slash', 'aria-hidden': 'true' }, '/'),
      '. Máy đếm số chỗ ngắt trong giọng của bạn (chưa kiểm tra bạn ngắt đúng từ nào).'
    ),
    chipsEl,
    sheetEl,
    actionsEl,
    reportEl
  );
  root.append(wrap);

  const paintChips = () => {
    clear(chipsEl);
    RHYTHM_DRILLS.forEach((d, i) => {
      const isPassed = !!passed[d.id];
      const isCurrent = d.id === drill.id;
      const cls = ['rhythm-drill', isPassed ? 'passed' : ''].filter(Boolean).join(' ');
      const btn = h(
        'button',
        {
          class: cls,
          type: 'button',
          'aria-pressed': String(isCurrent),
          'aria-label': `Bài ${i + 1}${isPassed ? ', đã đạt' : ''}`,
          onclick: () => selectDrill(d),
        },
        String(i + 1),
        isPassed ? h('span', { class: 'rhythm-drill-mark' }, 'đạt') : null
      );
      append(chipsEl, [btn]);
    });
  };

  const paintDrill = () => {
    clear(lineEl);
    const parts = drill.marked.split(' / ');
    parts.forEach((part, i) => {
      lineEl.append(part);
      if (i < parts.length - 1) lineEl.append(h('span', { class: 'rhythm-slash', 'aria-hidden': 'true' }, '/'));
    });
    viEl.textContent = `Nghĩa: ${drill.vi}`;
    tipEl.textContent = `Mẹo: ${drill.tip}`;
  };

  const paintRecord = () => {
    recBtn.className = `btn${recording ? ' rec' : ''}`;
    recBtn.textContent = recording ? 'Đọc xong, chấm nhịp' : 'Đọc và thu âm';
  };

  const paintReport = () => {
    if (!report) {
      reportEl.hidden = true;
      reportEl.textContent = '';
      reportEl.className = 'rhythm-report';
      return;
    }
    reportEl.hidden = false;
    if (report === 'nomic') {
      reportEl.className = 'rhythm-report';
      reportEl.textContent = 'Không thu được tiếng. Hãy cho phép dùng micro rồi thử lại.';
      return;
    }
    reportEl.className = `rhythm-report${report.ok ? ' ok' : ''}`;
    reportEl.textContent =
      report.verdict === 'silent'
        ? 'Bản ghi quá nhỏ hoặc không có tiếng. Hãy nói gần micro hơn.'
        : report.verdict === 'ok'
        ? `Bạn ngắt ${report.found} chỗ (cần ${report.expected}). Nhịp rõ ràng!`
        : report.verdict === 'rushed'
        ? `Bạn mới ngắt rõ ${report.found}/${report.expected} chỗ. Dừng hẳn khoảng nửa giây ở mỗi dấu /.`
        : `Bạn ngắt tới ${report.found} chỗ, nhiều hơn ${report.expected} chỗ cần thiết. Nối liền các từ trong cùng một cụm ý.`;
  };

  const selectDrill = (d: RhythmDrill) => {
    drill = d;
    report = null;
    paintChips();
    paintDrill();
    paintReport();
  };

  const toggle = async () => {
    if (recording) {
      clip?.stop();
      return;
    }
    // Bài và số chỗ ngắt được chốt lúc bấm, như bản React cũ: đổi bài giữa chừng không ảnh hưởng lượt đang thu.
    const target = drill;
    Voice.stop();
    report = null;
    paintReport();
    recording = true;
    paintRecord();
    const handle = recordClip(12000);
    clip = handle;
    const samples = await handle.done;
    recording = false;
    if (!disposed) paintRecord();

    if (!samples) {
      if (!disposed) {
        report = 'nomic';
        paintReport();
      }
      return;
    }
    const rep = checkPauses(samples, rhythmPauses(target));
    if (!disposed) {
      SFX.play(rep.ok ? 'ting' : 'error');
      report = rep;
      paintReport();
    }
    gameStore.getState().recordRhythm(target.id, rep.ok);
  };

  paintChips();
  paintDrill();
  paintRecord();
  paintReport();

  const unwatch = watch(
    (s) => s.state.learn.rhythm,
    (next) => {
      if (disposed) return;
      passed = next;
      paintChips();
    },
    false
  );

  return () => {
    disposed = true;
    unwatch();
    clip?.stop();
    Voice.stop();
    wrap.remove();
  };
}
