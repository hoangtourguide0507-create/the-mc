/**
 * Điểm vào của bản three.js thuần (không React). Giai đoạn 1: engine + chuyển cảnh + lớp UI HTML.
 * Bản React cũ vẫn chạy ở index.html cho tới khi chuyển xong.
 */
import './ui/base.css';
import { Ambience, SpeechEngine, Voice } from './audio/audioSystem';
import { dayKey, getPeriod } from './core/clock';
import { gameStore } from './core/store';
import { Engine } from './engine/Engine';
import { watch } from './engine/watch';
import { PlaceholderScene } from './scenes/PlaceholderScene';
import { installGhibliShading } from './three/artStyle';
import { h } from './ui/dom';
import type { ViewName } from './types/game';

// Phải chạy trước khi bất kỳ shader nào được biên dịch
installGhibliShading();

const canvas = document.getElementById('stage3d') as HTMLCanvasElement;
const ui = document.getElementById('ui') as HTMLDivElement;
const engine = new Engine(canvas);

const periodId = () => getPeriod(gameStore.getState().state.clock);

// Cảnh tạm; từng cảnh sẽ được thay bằng bản thật ở các giai đoạn sau
engine.register('hub', () => new PlaceholderScene('#C89A6B', periodId()));
engine.register('world', () => new PlaceholderScene('#3D8A8A', periodId()));
engine.register('stage', () => new PlaceholderScene('#C8643B', 'evening'));

/** Màn chào dùng phòng MC làm nền */
const sceneFor = (view: ViewName) => (view === 'welcome' ? 'hub' : view);

watch(
  (s) => s.view,
  (view) => void engine.show(sceneFor(view))
);
engine.start();

/* ---------- Vòng đời trang: lưu ngay khi ẩn, sang ngày thật mới khi quay lại ---------- */
function onHide() {
  gameStore.getState().saveNow();
  Voice.stop();
  SpeechEngine.abort();
  Ambience.stop();
}
window.addEventListener('pagehide', onHide);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') return onHide();
  const cur = gameStore.getState();
  if (cur.view !== 'welcome' && cur.view !== 'stage' && cur.state.dayDate && cur.state.dayDate !== dayKey()) {
    cur.startDayFromWelcome();
  }
});

/* ---------- UI tạm của giai đoạn 1: thanh chuyển cảnh để kiểm tra ---------- */
const views: { id: ViewName; label: string }[] = [
  { id: 'hub', label: '🏠 Phòng MC' },
  { id: 'world', label: '🗺️ Thành phố' },
  { id: 'stage', label: '🎤 Sân khấu' },
];
const buttons = views.map(({ id, label }) =>
  h('button', { class: 'btn ghost', onclick: () => gameStore.setState({ view: id }) }, label)
);
ui.append(
  h('div', { class: 'panel devnote' }, 'Bản three.js thuần · giai đoạn 1 (nền móng)'),
  h('div', { class: 'panel devbar' }, ...buttons)
);
watch(
  (s) => s.view,
  (view) => buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(views[i].id === sceneFor(view))))
);

// QA: ?qa=1 mở store và engine ra window để chụp ảnh tự động
if (new URLSearchParams(window.location.search).has('qa')) {
  (window as any).__mc = gameStore;
  (window as any).__engine = engine;
}
