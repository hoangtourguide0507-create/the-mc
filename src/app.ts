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
import { watch } from './engine/watch';
import { mountHome } from './ui/screens/home';
import { mountLesson } from './ui/screens/lesson';

const canvas = document.getElementById('stage3d') as HTMLCanvasElement;
const ui = document.getElementById('ui') as HTMLDivElement;

/* ---------- Nền sáng là mặc định; người học có thể đổi sang nền tối ---------- */
type UiTheme = 'light' | 'dark';
const THEME_KEY = 'mclife.ui.theme';
let uiTheme: UiTheme = 'light';
try {
  if (localStorage.getItem(THEME_KEY) === 'dark') uiTheme = 'dark';
} catch {
  // chế độ riêng tư: dùng mặc định
}
document.documentElement.dataset.theme = uiTheme;

const engine = new Engine(canvas);
const backdrop = new StageBackdrop('lounge', uiTheme);
engine.register('backdrop', () => backdrop);
void engine.show('backdrop');
engine.start();

function setUiTheme(next: UiTheme) {
  uiTheme = next;
  document.documentElement.dataset.theme = next;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'light' ? '#F1ECE3' : '#15161A');
  backdrop.setMode(next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    // bỏ qua
  }
}

/* ---------- Vòng đời trang ---------- */
function onHide() {
  gameStore.getState().saveNow();
  Voice.stop();
  SpeechEngine.abort();
  Ambience.stop();
}
window.addEventListener('pagehide', onHide);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') onHide();
  else if (!gameStore.getState().activeSceneId) gameStore.getState().rollLessonDay();
});
gameStore.getState().rollLessonDay();

/* ---------- Thông báo: hiện toast mới nhất của store ---------- */
const toast = h('div', { class: 'panel toast', role: 'status' });
let toastTimer = 0;
function say(msg: string, ms = 2600) {
  toast.textContent = msg;
  toast.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('on'), ms);
}
watch(
  (s) => s.toasts,
  (list) => {
    const last = list[list.length - 1];
    if (last) say(last.msg);
  },
  false
);

/* ---------- Điều hướng: màn chính ⇄ màn bài học ---------- */
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
const tabbar = h(
  'nav',
  { class: 'panel tabbar' },
  ...tabs.map(([label, d], i) =>
    h('button', { class: 'tab', ariaCurrent: i === 0 ? 'page' : null, onclick: () => i > 0 && say(`${label}: sẽ có ở bước kế tiếp`) }, icon(d), label)
  )
);

let unmount: (() => void) | null = null;

function showHome() {
  unmount?.();
  backdrop.setCalm(1);
  backdrop.setTheme('lounge');
  tabbar.style.display = '';
  unmount = mountHome(ui, {
    onTheme: (theme: StageTheme) => backdrop.setTheme(theme),
    onStart: (sceneId) => showLesson(sceneId),
    themeLabel: () => (uiTheme === 'light' ? 'Nền tối' : 'Nền sáng'),
    onToggleTheme: () => setUiTheme(uiTheme === 'light' ? 'dark' : 'light'),
  });
}

function showLesson(sceneId: string) {
  // Gọi trong thao tác chạm để mở khoá âm thanh trên iOS
  if (!gameStore.getState().startLesson(sceneId)) return;
  unmount?.();
  tabbar.style.display = 'none';
  backdrop.setCalm(0.45); // nền dịu hẳn khi đang đọc và nói
  unmount = mountLesson(ui, sceneId, {
    onExit: (again) => {
      gameStore.getState().closeLesson();
      if (again) showLesson(sceneId);
      else showHome();
    },
  });
}

ui.append(tabbar, toast);
showHome();

// QA: ?qa=1 mở store, engine và nền sân khấu ra window để chụp ảnh tự động
if (new URLSearchParams(window.location.search).has('qa')) {
  Object.assign(window as any, { __mc: gameStore, __engine: engine, __backdrop: backdrop });
}
