// Cầu nối tạm cho giao diện React cũ; sẽ xoá khi chuyển xong sang three.js thuần.
import { useStore } from 'zustand';
import { gameStore, type GameStore } from './store';

function hook<T>(selector: (s: GameStore) => T): T {
  return useStore(gameStore, selector);
}

export const useGameStore = Object.assign(hook, {
  getState: gameStore.getState,
  setState: gameStore.setState,
  subscribe: gameStore.subscribe,
});
