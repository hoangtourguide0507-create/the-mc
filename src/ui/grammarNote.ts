/**
 * Khung "Ngữ pháp cần sửa" dùng chung cho mọi màn chấm nói: mỗi lỗi một dòng
 * (đoạn sai gạch ngang → cách sửa, kèm giải thích ngắn). Ghi chú văn phong (gonna, wanna…)
 * hiện riêng, nhẹ hơn, vì không trừ sao.
 */
import type { GrammarIssue } from '../core/grammar';
import { h } from './dom';

export function grammarNote(issues: GrammarIssue[] | undefined, opts: { capped?: boolean } = {}): HTMLElement | null {
  const list = issues ?? [];
  if (list.length === 0) return null;
  const errors = list.filter((i) => (i.kind ?? 'grammar') === 'grammar');
  const style = list.filter((i) => i.kind === 'style');
  const line = (i: GrammarIssue) =>
    h('div', { class: 'gn-line' }, h('s', null, i.wrong), ' → ', h('strong', null, i.fix), i.why ? h('span', { class: 'gn-why' }, i.why) : null);
  const box = h('div', { class: `note-box gn${errors.length ? ' focus' : ''}` });
  if (errors.length) {
    box.append(h('div', { class: 'gn-title' }, opts.capped ? 'Ngữ pháp cần sửa (lượt này tối đa 2 sao)' : 'Ngữ pháp cần sửa'), ...errors.map(line));
  }
  if (style.length) box.append(h('div', { class: 'gn-title' }, 'Văn phong (không trừ điểm)'), ...style.map(line));
  return box;
}
