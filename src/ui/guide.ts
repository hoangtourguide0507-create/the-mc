/**
 * Hướng dẫn sử dụng.
 * - `openGuide`: trang Hướng dẫn tra cứu phủ toàn màn hình (tìm kiếm, nhóm, mở từng bài, nút "Thử ngay").
 * - `helpStrip`: gợi ý tại chỗ ở đầu một mục. Lần đầu vào mục, hiện câu tóm tắt kèm "Xem hướng dẫn"
 *   và "Đã hiểu"; bấm "Đã hiểu" thì từ đó chỉ còn một nút nhỏ "Cách dùng mục này".
 * Nội dung lấy từ src/data/guide.ts. Trạng thái "đã xem" là tuỳ chọn giao diện, lưu ở localStorage
 * riêng (không nằm trong tiến độ học).
 */
import './guide.css';
import { GUIDE, GUIDE_BY_ID, GUIDE_GROUPS, isStrongMatch, searchGuide, type GuideEntry, type GuideTab } from '../data/guide';
import { clear, h } from './dom';

const SEEN_KEY = 'mclife.guide.seen';

function loadSeen(): Set<string> {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function markSeen(id: string): void {
  const seen = loadSeen();
  seen.add(id);
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  } catch {
    /* Trình duyệt chặn lưu trữ: gợi ý sẽ hiện lại lần sau, không sao */
  }
}

type Navigate = (target: { tab: GuideTab; section?: string }) => void;
let navigate: Navigate | null = null;

/** app.ts đăng ký cách chuyển tab, để nút "Thử ngay" mở đúng chỗ. */
export function setGuideNavigator(fn: Navigate): void {
  navigate = fn;
}

let closeCurrent: (() => void) | null = null;

export function closeGuide(): void {
  closeCurrent?.();
}

/**
 * Mở trang Hướng dẫn. `focus`: mở sẵn và cuộn tới một bài. `jump: false` ẩn nút "Thử ngay"
 * (dùng khi đang trong bài học, để không vô tình rời bài).
 */
export function openGuide(opts: { focus?: string; jump?: boolean } = {}): void {
  closeCurrent?.();
  const jump = opts.jump !== false;
  const search = h('input', { class: 'gd-search', type: 'search', placeholder: 'Tìm: mic, Diễn, sổ từ, dịch…', autocomplete: 'off', ariaLabel: 'Tìm trong hướng dẫn' });
  const list = h('div', { class: 'gd-list' });
  const panel = h(
    'div',
    { class: 'gd-panel', role: 'dialog', ariaLabel: 'Hướng dẫn sử dụng' },
    h(
      'header',
      { class: 'gd-head' },
      h('div', null, h('div', { class: 'eyebrow' }, 'MC Life'), h('h2', null, 'Hướng dẫn')),
      h('button', { class: 'btn quiet', onclick: () => close() }, 'Đóng')
    ),
    search,
    list
  );
  const veil = h('div', { class: 'gd-veil' }, panel);

  const close = () => {
    if (closeCurrent !== close) return;
    closeCurrent = null;
    document.removeEventListener('keydown', onKey);
    veil.remove();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKey);
  closeCurrent = close;

  const entryEl = (e: GuideEntry, open: boolean): HTMLElement => {
    const body = h('div', { class: 'gd-body' }, h('p', null, e.what));
    if (e.steps.length) body.append(h('div', { class: 'gd-sub' }, 'Cách dùng'), h('ol', null, ...e.steps.map((s) => h('li', null, s))));
    if (e.scoring?.length) body.append(h('div', { class: 'gd-sub' }, 'Máy chấm thế nào'), h('ul', null, ...e.scoring.map((s) => h('li', null, s))));
    if (e.tips?.length) body.append(h('div', { class: 'gd-sub' }, 'Mẹo'), h('ul', { class: 'gd-tips' }, ...e.tips.map((s) => h('li', null, s))));
    const target = e.target;
    if (jump && target && navigate) {
      body.append(
        h(
          'button',
          {
            class: 'btn',
            onclick: () => {
              close();
              navigate?.(target);
            },
          },
          'Thử ngay'
        )
      );
    }
    const card = h(
      'details',
      { class: 'panel gd-entry', open, dataset: { id: e.id } },
      h('summary', null, h('b', null, e.title), h('span', null, e.short)),
      body
    );
    return card;
  };

  const render = () => {
    clear(list);
    const q = search.value.trim();
    const found = searchGuide(q);
    if (found.length === 0) {
      list.append(h('p', { class: 'gd-empty' }, 'Không tìm thấy. Thử từ khác, ví dụ “mic”, “Diễn”, “sổ từ”.'));
      return;
    }
    if (q !== '') {
      // Đang tìm: bỏ nhóm, xếp theo độ khớp; bài khớp thẳng tiêu đề được mở sẵn
      list.append(h('div', { class: 'gd-group eyebrow' }, `${found.length} kết quả`));
      for (const e of found) list.append(entryEl(e, isStrongMatch(e, q) || found.length === 1));
      return;
    }
    for (const g of GUIDE_GROUPS) {
      const items = found.filter((e) => e.group === g.id);
      if (items.length === 0) continue;
      list.append(h('div', { class: 'gd-group eyebrow' }, g.label));
      for (const e of items) list.append(entryEl(e, e.id === opts.focus));
    }
  };
  search.addEventListener('input', render);
  veil.addEventListener('click', (ev) => {
    if (ev.target === veil) close();
  });

  render();
  document.body.append(veil);
  if (opts.focus && GUIDE_BY_ID[opts.focus]) {
    list.querySelector<HTMLElement>(`[data-id="${opts.focus}"]`)?.scrollIntoView({ block: 'start' });
  }
}

/**
 * Gợi ý tại chỗ cho một mục. Trả về null nếu mục không có bài hướng dẫn.
 */
export function helpStrip(id: string): HTMLElement | null {
  const e = GUIDE_BY_ID[id];
  if (!e) return null;
  const box = h('div', { class: 'gd-strip' });
  const compact = () => {
    clear(box);
    box.className = 'gd-strip compact';
    box.append(h('button', { class: 'link gd-help', ariaLabel: `Cách dùng mục ${e.title}`, onclick: () => openGuide({ focus: id }) }, '? Cách dùng mục này'));
  };
  if (loadSeen().has(id)) {
    compact();
    return box;
  }
  box.className = 'gd-strip note-box';
  box.append(
    h('p', null, h('b', null, `${e.title}. `), e.short),
    h(
      'div',
      { class: 'gd-row' },
      h('button', { class: 'btn quiet', onclick: () => openGuide({ focus: id }) }, 'Xem hướng dẫn'),
      h(
        'button',
        {
          class: 'btn quiet',
          onclick: () => {
            markSeen(id);
            compact();
          },
        },
        'Đã hiểu'
      )
    )
  );
  return box;
}

/** Số bài hướng dẫn, để hiện trên nút mở. */
export const GUIDE_COUNT = GUIDE.length;
