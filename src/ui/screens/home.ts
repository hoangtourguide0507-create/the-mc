/**
 * Màn chính: thang nghề + danh sách tình huống. Không còn thành phố, đồng hồ, năng lượng, tiền, shop.
 * Khoá tình huống chỉ theo cấp MC (reqLv) và danh tiếng (minRep).
 */
import { chaNeed, fmtRep, levelTitle, MAX_LV } from '../../core/career';
import { lessonLock } from '../../core/lesson';
import { gameStore } from '../../core/store';
import { SCENES } from '../../data/content';
import { EVENT_UI } from '../../data/events';
import { watch } from '../../engine/watch';
import type { StageTheme } from '../../scenes/StageBackdrop';
import type { SceneData } from '../../types/game';
import { clear, h } from '../dom';

/** Nhãn thể loại và bối cảnh 3D của các tình huống gốc; sự kiện mới tự khai trong gói (EVENT_UI) */
const SCENE_INFO: Record<string, { kind: string; theme: StageTheme }> = {
  coffee: { kind: 'Khởi động', theme: 'lounge' },
  market: { kind: 'Khởi động', theme: 'lounge' },
  backstage: { kind: 'Tổng duyệt', theme: 'conference' },
  wedding: { kind: 'Tiệc cưới', theme: 'wedding' },
  beach: { kind: 'Tiệc cưới', theme: 'wedding' },
  gala: { kind: 'Gala', theme: 'gala' },
  interview: { kind: 'Toạ đàm', theme: 'conference' },
  ...EVENT_UI,
};
/** Khởi động trước, rồi các sự kiện theo cấp mở khoá tăng dần */
const ORDER = Object.values(SCENES)
  .sort((a, b) => Number(a.type === 'show') - Number(b.type === 'show') || a.reqLv - b.reqLv || (a.minRep ?? 0) - (b.minRep ?? 0))
  .map((s) => s.id);

export interface HomeOptions {
  onTheme: (theme: StageTheme) => void;
  onStart: (sceneId: string) => void;
  /** Nhãn nút đổi nền ("Nền tối" / "Nền sáng") và hàm đổi */
  themeLabel: () => string;
  onToggleTheme: () => void;
}

function lockReason(sc: SceneData, lv: number, rep: { avg: number; n: number }): string | null {
  const lock = lessonLock(sc, lv, rep);
  if (!lock) return null;
  return lock.kind === 'level' ? `Mở ở Lv.${lock.need} · ${levelTitle(lock.need)}` : `Cần danh tiếng ${lock.need.toFixed(1)} sao`;
}

/** Bỏ giờ diễn ở đầu mô tả ("18:30 · ..."): bản mới không còn đồng hồ trong ngày */
function plainSub(sub: string): string {
  return sub.replace(/^\s*\d{1,2}:\d{2}(\s*[–-]\s*\d{1,2}:\d{2})?\s*·\s*/, '');
}

function stars(n: number): HTMLElement {
  const full = Math.round(Math.max(0, Math.min(3, n)));
  return h('span', { class: 'stars', ariaLabel: `${full} trên 3 sao` }, '★'.repeat(full), h('span', { class: 'off' }, '★'.repeat(3 - full)));
}

export function mountHome(root: HTMLElement, opts: HomeOptions): () => void {
  const career = h('section', { class: 'panel career' });
  const list = h('div', { class: 'col', style: { gap: '12px' } });
  let selected: string | null = null;
  const themeBtn = h('button', { class: 'link' }, opts.themeLabel());
  themeBtn.onclick = () => {
    opts.onToggleTheme();
    themeBtn.textContent = opts.themeLabel();
  };

  const screen = h(
    'div',
    { class: 'screen' },
    h(
      'div',
      { class: 'col' },
      h(
        'header',
        { class: 'brand' },
        h('div', null, h('div', { class: 'eyebrow' }, 'Tiếng Anh sân khấu'), h('h1', null, 'MC Life ', h('em', null, 'English Stage'))),
        themeBtn
      ),
      h('div', { class: 'spacer-hero' }),
      career,
      h('div', { class: 'section-title eyebrow' }, 'Tình huống'),
      list
    )
  );
  root.append(screen);

  function renderCareer() {
    const { charisma, rep, streak, stats } = gameStore.getState().state;
    const need = chaNeed(charisma.lv);
    const pct = charisma.lv >= MAX_LV ? 100 : Math.min(100, (charisma.pts / need) * 100);
    clear(career);
    career.append(
      h('div', { class: 'row' }, h('span', { class: 'lv' }, `CẤP ${charisma.lv} / ${MAX_LV}`), h('span', { class: 'meta' }, charisma.lv >= MAX_LV ? 'Cấp cao nhất' : `${charisma.pts} / ${need} điểm`)),
      h('div', { class: 'title' }, levelTitle(charisma.lv)),
      h('div', { class: 'bar', role: 'progressbar', ariaValueNow: String(Math.round(pct)) }, h('i', { style: { width: `${pct}%` } })),
      h(
        'div',
        { class: 'meta stats' },
        h('span', null, 'Danh tiếng ', h('b', null, fmtRep(rep) === '—' ? 'chưa có' : `${fmtRep(rep)} ★`)),
        h('span', null, 'Show đã dẫn ', h('b', null, String(stats.shows))),
        h('span', null, 'Chuỗi ngày ', h('b', null, String(streak.count)))
      )
    );
  }

  function renderList() {
    const { charisma, rep, stats } = gameStore.getState().state;
    clear(list);
    for (const id of ORDER) {
      const sc = SCENES[id];
      if (!sc) continue;
      const info = SCENE_INFO[id] ?? { kind: 'Tình huống', theme: 'lounge' as StageTheme };
      const locked = lockReason(sc, charisma.lv, rep);
      const open = selected === id;
      const card = h(
        'button',
        {
          class: `panel show${locked ? ' locked' : ''}`,
          ariaPressed: String(open),
          onclick: () => {
            selected = open ? null : id;
            opts.onTheme(selected ? info.theme : 'lounge');
            renderList();
          },
        },
        h('span', { class: 'tag' }, `${info.kind} · ${sc.level}`),
        stars(stats.bestStars[id] ?? 0),
        h('span', { class: 'name' }, sc.title),
        h('span', { class: 'sub' }, plainSub(sc.sub)),
        locked ? h('span', { class: 'lock' }, locked) : null
      );
      list.append(card);
      if (open && !locked) {
        list.append(h('button', { class: 'btn', onclick: () => opts.onStart(id) }, 'Lên sân khấu'));
      }
    }
  }

  const offs = [
    watch((s) => s.state.charisma, renderCareer),
    watch((s) => s.state.rep, () => { renderCareer(); renderList(); }, false),
    watch((s) => s.state.stats, () => { renderCareer(); renderList(); }, false),
  ];
  renderList();

  return () => {
    offs.forEach((off) => off());
    screen.remove();
  };
}
