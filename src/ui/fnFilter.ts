/**
 * Hàng nút lọc theo chức năng lời nói (src/data/functions.ts), dùng chung cho danh sách bài của
 * Trò chuyện, Nói dài, Dịch và Văn phong. Chỉ hiện các chức năng có bài; lựa chọn được nhớ
 * trong phiên (chung cho mọi danh sách) để chuyển mục vẫn giữ đúng chức năng đang luyện.
 */
import { FUNCTIONS } from '../data/functions';
import { h } from './dom';

let picked = 'all';

export function pickedFn(): string {
  return picked;
}

/** Lọc danh sách theo chức năng đang chọn; chức năng đang chọn không có bài nào thì coi như "Tất cả". */
export function byFn<T extends { fn?: string }>(items: T[]): T[] {
  if (picked === 'all' || !items.some((i) => i.fn === picked)) return items;
  return items.filter((i) => i.fn === picked);
}

export function fnChips<T extends { fn?: string }>(items: T[], onChange: () => void): HTMLElement {
  const present = FUNCTIONS.filter((f) => items.some((i) => i.fn === f.id));
  const active = present.some((f) => f.id === picked) ? picked : 'all';
  const chip = (id: string, label: string, count: number) =>
    h(
      'button',
      {
        class: 'filter',
        type: 'button',
        ariaPressed: String(active === id),
        onclick: () => {
          picked = id;
          onChange();
        },
      },
      `${label} ${count}`
    );
  return h(
    'div',
    { class: 'filters', role: 'group', ariaLabel: 'Lọc theo chức năng lời nói' },
    chip('all', 'Tất cả', items.length),
    ...present.map((f) => chip(f.id, f.label, items.filter((i) => i.fn === f.id).length))
  );
}
