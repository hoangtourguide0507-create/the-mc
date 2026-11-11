/**
 * Điểm vào của bản three.js thuần (không React).
 * 3D chỉ làm nền: một sân khấu tối đổi bối cảnh theo tình huống; nội dung học là HTML phủ lên.
 * Bản React cũ vẫn chạy ở index.html cho tới khi chuyển xong.
 */
import './ui/base.css';
import { Ambience, SpeechEngine, Voice } from './audio/audioSystem';
import { gameStore } from './core/store';
import { Engine } from './engine/Engine';
import { StageBackdrop, type StageTheme } from './scenes/StageBackdrop';
import { h } from './ui/dom';
import { mountHome } from './ui/screens/home';

const canvas = document.getElementById('stage3d') as HTMLCanvasElement;
const ui = document.getElementById('ui') as HTMLDivElement;
const engine = new Engine(canvas);
// Bloom tự lo tone mapping ở OutputPass
const backdrop = new StageBackdrop('lounge');
engine.register('backdrop', () => backdrop);
void engine.show('backdrop');
engine.start();

/* ---------- Vòng đời trang: lưu ngay khi ẩn ---------- */
function onHide() {
  gameStore.getState().saveNow();
  Voice.stop();
  SpeechEngine.abort();
  Ambience.stop();
}
window.addEventListener('pagehide', onHide);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') onHide();
});

/* ---------- Giao diện ---------- */
const toast = h('div', { class: 'panel toast', role: 'status' });
let toastTimer = 0;
function say(msg: string) {
  toast.textContent = msg;
  toast.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('on'), 2600);
}

mountHome(ui, {
  onTheme: (theme: StageTheme) => backdrop.setTheme(theme),
  // Màn bài học (nghe, nói, chấm điểm) được chuyển sang ở bước kế tiếp
  onStart: () => say('Màn bài học đang được dựng lại ở bước kế tiếp'),
});

const icon = (d: string) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', d);
  svg.append(p);
  return svg;
};
const tabs: [string, string][] = [
  ['Sân khấu', 'M4 20h16M6 20V9l6-5 6 5v11M10 20v-5h4v5'],
  ['Luyện tập', 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3'],
  ['Sổ tay', 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11'],
  ['Nhiệm vụ', 'M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z'],
];
ui.append(
  h(
    'nav',
    { class: 'panel tabbar' },
    ...tabs.map(([label, d], i) =>
      h(
        'button',
        {
          class: 'tab',
          ariaCurrent: i === 0 ? 'page' : null,
          onclick: () => i > 0 && say(`${label}: sẽ có ở bước kế tiếp`),
        },
        icon(d),
        label
      )
    )
  ),
  toast
);

// QA: ?qa=1 mở store, engine và nền sân khấu ra window để chụp ảnh tự động
if (new URLSearchParams(window.location.search).has('qa')) {
  Object.assign(window as any, { __mc: gameStore, __engine: engine, __backdrop: backdrop });
}
