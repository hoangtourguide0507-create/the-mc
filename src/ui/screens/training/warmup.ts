import './warmup.css';
import { SFX, SpeechEngine, Voice } from '../../../audio/audioSystem';
import { dueChunkIds, evaluateChunkUse, masteredChunks } from '../../../core/chunks';
import { gameStore } from '../../../core/store';
import { CHUNKS } from '../../../data/chunks';
import { watch } from '../../../engine/watch';
import { answerBar, type AnswerBar } from '../../answer';
import { clear, h } from '../../dom';

/**
 * Khởi động: nói lại các cụm tới hạn trong ngữ cảnh mới (bản thuần của Warmup trong TrainingSheet.tsx).
 * Giữ nguyên luật: chỉ lần nói đầu tiên quyết định lịch ôn; xem trước cụm thì coi như chưa thuộc.
 */
export function mountWarmup(root: HTMLElement): () => void {
  const store = () => gameStore.getState();
  // Chốt danh sách lúc mở, để chấm xong một cụm thì hàng đợi không tự xáo lại
  const queue = dueChunkIds(store().state.learn.chunks, store().state.day, 8).filter((id) => CHUNKS[id]);

  let idx = 0;
  let peeked = false;
  let result: { ok: boolean; heard: string; hasChunk: boolean } | null = null;
  let graded = false;
  let right = 0;
  let disposed = false;

  let bar: AnswerBar | null = null;
  let barKey = '';

  const host = h('div', { class: 'warmup' });
  root.append(host);

  function dropBar() {
    bar?.dispose();
    bar = null;
    barKey = '';
  }

  function answer(candidates: string[]) {
    if (disposed) return;
    const chunk = CHUNKS[queue[idx]];
    let best = { ok: false, hasChunk: false, heard: candidates[0] || '' };
    for (const c of candidates) {
      const r = evaluateChunkUse(chunk.en, c);
      if (r.ok || (r.hasChunk && !best.hasChunk)) best = { ok: r.ok, hasChunk: r.hasChunk, heard: c };
      if (r.ok) break;
    }
    SFX.play(best.ok ? 'ting' : 'error');
    result = best;
    if (!graded) {
      // Chỉ lần nói đầu tiên quyết định lịch ôn; xem trước cụm thì coi như chưa thuộc
      const correct = best.ok && !peeked;
      store().gradeChunk(chunk.id, correct);
      if (correct) right += 1;
      graded = true;
    }
    render();
  }

  function next() {
    idx += 1;
    peeked = false;
    result = null;
    graded = false;
    render();
  }

  function renderDone() {
    dropBar();
    const { learn } = store().state;
    const total = Object.keys(learn.chunks).length;
    host.append(
      h(
        'section',
        { class: 'panel card warmup-done' },
        h(
          'p',
          { class: 'npc-line' },
          queue.length === 0 ? 'Hôm nay chưa có cụm nào tới hạn.' : `Xong phần khởi động: đúng ${right}/${queue.length} cụm ngay lần đầu.`
        ),
        h(
          'p',
          { class: 'vi' },
          total === 0
            ? 'Hoàn thành một show hay hoạt động để nhận hai cụm mang về. Chúng sẽ tới hạn vào ngày hôm sau.'
            : `Bạn đang giữ ${total} cụm, trong đó ${masteredChunks(learn.chunks)} cụm đã vững. Cụm nói sai sẽ quay lại vào ngày mai.`
        )
      )
    );
  }

  function render() {
    if (disposed) return;
    clear(host);
    if (queue.length === 0 || idx >= queue.length) {
      renderDone();
      return;
    }

    const chunk = CHUNKS[queue[idx]];
    const card = h('section', { class: 'panel card warmup-card' });

    card.append(
      h(
        'div',
        { class: 'head' },
        h('span', { class: 'eyebrow' }, `Cụm ${idx + 1}/${queue.length}`),
        h('span', { class: 'vi' }, 'Nói một câu trọn vẹn có dùng cụm này')
      )
    );

    const situation = h(
      'div',
      { class: 'warmup-situation' },
      h('span', { class: 'eyebrow' }, 'Tình huống mới'),
      h('p', { class: 'warmup-use' }, chunk.useVi),
      h('p', { class: 'vi' }, 'Dùng cụm có nghĩa: ', h('b', { class: 'warmup-meaning' }, `“${chunk.vi}”`))
    );
    if (peeked || result) {
      situation.append(h('p', { class: 'warmup-chunk' }, chunk.en));
    } else {
      situation.append(
        h(
          'button',
          {
            class: 'btn quiet warmup-peek',
            type: 'button',
            onclick: () => {
              peeked = true;
              render();
            },
          },
          'Quên rồi, cho xem cụm (mai ôn lại)'
        )
      );
    }
    card.append(situation);

    if (result) {
      const r = result;
      const verdict = r.ok
        ? peeked
          ? 'Đúng rồi. Vì đã xem trước nên mai cụm này quay lại.'
          : 'Chuẩn! Cụm này sẽ quay lại sau vài ngày.'
        : r.hasChunk
        ? 'Có cụm rồi, nhưng hãy nói thành một câu trọn vẹn.'
        : 'Chưa nghe thấy cụm này trong câu của bạn.';
      card.append(
        h(
          'div',
          { class: `warmup-result ${r.ok ? 'ok' : 'miss'}` },
          h('p', { class: 'warmup-verdict' }, verdict),
          h('p', { class: 'vi' }, 'Máy nghe được: ', h('i', null, `“${r.heard}”`)),
          h(
            'button',
            {
              class: 'btn quiet warmup-sample',
              type: 'button',
              onclick: () => {
                void Voice.speak(chunk.sample, { npcId: 'coach' });
              },
            },
            `Câu mẫu: ${chunk.sample}`
          )
        )
      );
    }

    // Mic/ô gõ: tạo lại khi đổi cụm hoặc đổi pha (lần đầu / nói lại), giữ nguyên khi chỉ vẽ lại
    const key = `${chunk.id}-${result ? 'retry' : 'first'}`;
    if (key !== barKey) {
      dropBar();
      bar = answerBar({ label: result ? 'Nói lại cho quen miệng' : 'Nói câu của bạn', onAnswer: answer });
      barKey = key;
    }
    card.append(bar!.el);

    if (result) {
      card.append(
        h(
          'button',
          { class: 'btn warmup-next', type: 'button', onclick: next },
          idx + 1 >= queue.length ? 'Hoàn thành' : 'Cụm tiếp'
        )
      );
    }

    host.append(card);
  }

  const offLearn = watch((s) => s.state.learn, () => render(), false);
  const offDay = watch((s) => s.state.day, () => render(), false);
  render();

  return () => {
    disposed = true;
    offLearn();
    offDay();
    dropBar();
    Voice.stop();
    SpeechEngine.abort();
    host.remove();
  };
}
