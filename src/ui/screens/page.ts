/** Khung chung của các tab ngoài màn chính: tiêu đề, thanh chọn mục con, vùng nội dung. */
import { clear, h } from '../dom';

export interface Section {
  id: string;
  label: string;
  mount: (root: HTMLElement) => () => void;
}

const lastSection: Record<string, string> = {};

export function mountPage(root: HTMLElement, opts: { key: string; eyebrow: string; title: string; sections: Section[] }): () => void {
  const body = h('div', { class: 'page-body' });
  const seg = h('div', { class: 'seg', role: 'tablist' });
  let off: (() => void) | null = null;
  let current = lastSection[opts.key] && opts.sections.some((s) => s.id === lastSection[opts.key]) ? lastSection[opts.key] : opts.sections[0].id;

  const show = (id: string) => {
    off?.();
    off = null;
    current = id;
    lastSection[opts.key] = id;
    clear(body);
    Array.from(seg.children).forEach((b, i) => b.setAttribute('aria-selected', String(opts.sections[i].id === id)));
    const sec = opts.sections.find((s) => s.id === id);
    if (sec) off = sec.mount(body);
  };

  for (const s of opts.sections) seg.append(h('button', { class: 'seg-btn', role: 'tab', onclick: () => show(s.id) }, s.label));

  const screen = h(
    'div',
    { class: 'screen page' },
    h(
      'div',
      { class: 'col' },
      h('header', { class: 'brand' }, h('div', null, h('div', { class: 'eyebrow' }, opts.eyebrow), h('h1', null, opts.title))),
      opts.sections.length > 1 ? seg : null,
      body
    )
  );
  root.append(screen);
  show(current);

  return () => {
    off?.();
    screen.remove();
  };
}
