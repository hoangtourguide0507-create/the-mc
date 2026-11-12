/**
 * Điểm vào của bản three.js thuần (không React).
 * 3D chỉ làm nền: một sân khấu tối đổi bối cảnh theo tình huống; nội dung học là HTML phủ lên.
 */
import './ui/base.css';
import { Ambience, SpeechEngine, Voice } from './audio/audioSystem';
import { gameStore } from './core/store';
import { Engine } from './engine/Engine';
import { LiveStage } from './scenes/LiveStage';
import { StageBackdrop, type StageTheme } from './scenes/StageBackdrop';
import { h } from './ui/dom';
import { watch } from './engine/watch';
import { mountHome, sceneTheme } from './ui/screens/home';
import { SCENES } from './data/content';
import { mountLesson } from './ui/screens/lesson';
import { mountNotebook } from './ui/screens/notebook';
import { mountPage } from './ui/screens/page';
import { mountQuests } from './ui/screens/quests';
import { mountCando } from './ui/screens/training/cando';
import { mountPronunciation } from './ui/screens/training/pronunciation';
import { mountQuickchat } from './ui/screens/training/quickchat';
import { mountRhythm } from './ui/screens/training/rhythm';
import { mountWarmup } from './ui/screens/training/warmup';

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
// Sân khấu của màn diễn chỉ dựng khi vào bài đầu tiên
let live: LiveStage | null = null;
void engine.show('backdrop');
engine.start();

function setUiTheme(next: UiTheme) {
  uiTheme = next;
  document.documentElement.dataset.theme = next;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'light' ? '#F1ECE3' : '#15161A');
  backdrop.setMode(next);
  live?.setMode(next);
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
type TabId = 'home' | 'train' | 'notebook' | 'quests';
const TAB_IDS: TabId[] = ['home', 'train', 'notebook', 'quests'];
let activeTab: TabId = 'home';
const tabButtons = tabs.map(([label, d], i) => h('button', { class: 'tab', onclick: () => showTab(TAB_IDS[i]) }, icon(d), label));
const tabbar = h('nav', { class: 'panel tabbar' }, ...tabButtons);

let unmount: (() => void) | null = null;

/** Dừng mọi âm thanh và lượt thu khi rời một màn */
function quiet() {
  Voice.stop();
  SpeechEngine.abort();
}

function showTab(tab: TabId) {
  quiet();
  unmount?.();
  activeTab = tab;
  tabbar.style.display = '';
  tabButtons.forEach((b, i) => (TAB_IDS[i] === tab ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')));
  void engine.show('backdrop');
  backdrop.setTheme('lounge');
  // Màn chính cho thấy sân khấu; các tab đọc nhiều thì làm dịu nền
  backdrop.setCalm(tab === 'home' ? 1 : 0.45);
  if (tab === 'home') {
    unmount = mountHome(ui, {
      onTheme: (theme: StageTheme) => backdrop.setTheme(theme),
      onStart: (sceneId, scriptKey, perform) => showLesson(sceneId, scriptKey, perform),
      themeLabel: () => (uiTheme === 'light' ? 'Nền tối' : 'Nền sáng'),
      onToggleTheme: () => setUiTheme(uiTheme === 'light' ? 'dark' : 'light'),
    });
  } else if (tab === 'train') {
    unmount = mountPage(ui, {
      key: 'train',
      eyebrow: 'Phòng luyện',
      title: 'Luyện tập',
      sections: [
        { id: 'warmup', label: 'Khởi động', mount: mountWarmup },
        { id: 'pron', label: 'Phát âm', mount: mountPronunciation },
        { id: 'rhythm', label: 'Nhịp', mount: mountRhythm },
        { id: 'quick', label: 'Phản xạ nhanh', mount: mountQuickchat },
        { id: 'cando', label: 'Năng lực', mount: mountCando },
      ],
    });
  } else if (tab === 'notebook') {
    unmount = mountPage(ui, { key: 'notebook', eyebrow: 'Ôn lại', title: 'Sổ tay', sections: [{ id: 'all', label: 'Sổ tay', mount: mountNotebook }] });
  } else {
    unmount = mountPage(ui, { key: 'quests', eyebrow: 'Thang nghề', title: 'Nhiệm vụ', sections: [{ id: 'all', label: 'Nhiệm vụ', mount: mountQuests }] });
  }
  // Đặt màn mới dưới thanh tab và thông báo
  ui.append(tabbar, toast);
}

function showLesson(sceneId: string, scriptKey: string | null = null, perform = false) {
  // Gọi trong thao tác chạm để mở khoá âm thanh trên iOS
  if (!gameStore.getState().startLesson(sceneId, scriptKey)) return;
  unmount?.();
  tabbar.style.display = 'none';
  // Vào show: đổi sang sân khấu có khán giả; màn LED ghi tên sự kiện
  const stage = (live ??= new LiveStage(uiTheme));
  engine.register('live', () => stage);
  stage.setShow(sceneTheme(sceneId), SCENES[sceneId]?.title ?? '');
  void engine.show('live');
  unmount = mountLesson(ui, sceneId, {
    live: stage,
    perform,
    theme: sceneTheme(sceneId),
    onExit: (again) => {
      gameStore.getState().closeLesson();
      if (again) showLesson(sceneId, scriptKey, perform);
      else showTab('home');
    },
  });
  ui.append(toast);
}

ui.append(tabbar, toast);
showTab('home');

// QA: ?qa=1 mở store, engine và nền sân khấu ra window để chụp ảnh tự động
if (new URLSearchParams(window.location.search).has('qa')) {
  Object.assign(window as any, { __mc: gameStore, __engine: engine, __backdrop: backdrop, __live: () => live });
}
