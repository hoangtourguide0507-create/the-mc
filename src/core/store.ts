import { create } from 'zustand';
import { SCENES, SCHEDULE, SHOP, TIPS } from '../data/content';
import { scheduleAfter, SRS_MAX_BOX, boxOf } from './srs';
import { PRON_RECENT_WINDOW } from '../data/pronunciation';
import {
  EvaluatedToken,
  GameState,
  StreetTalkItem,
  ViewName,
  WeakWord,
} from '../types/game';
import {
  clamp,
  DAILY_REPEAT_CHA,
  DAY_END,
  DAY_START,
  dayKey,
  dayPlan,
  DURATION_DEFAULT,
  FAINT_ENERGY_PCT,
  fmtTime,
  getPeriod,
  latePenalty,
  NEW_DAY_ENERGY_PCT,
  SLEEP_ENERGY_PCT,
  yesterdayKey,
} from './clock';
import { FUNCTION_WORDS } from './evaluator';
import { applyQuestProgress } from './quests';
import { chaNeed, levelTitle, MAX_LV, nextRep } from './career';
import { Ambience, AudioBus, SFX, Voice } from '../audio/audioSystem';

export const STORAGE_KEY_V2 = 'mclife.v2';
export const STORAGE_KEY_V1 = 'mclife.v1';

export const DEFAULT_STATE: GameState = {
  v: 2,
  energy: 100,
  maxEnergy: 100,
  charisma: { lv: 1, pts: 0 },
  rep: { avg: 0, n: 0 },
  xp: 0,
  cash: 150,
  day: 0,
  dayDate: '',
  clock: DAY_START,
  loc: 'home',
  doneToday: {},
  dayFresh: false,
  streak: { count: 0, best: 0, last: '' },
  items: {},
  gigsDone: {},
  stats: {
    shows: 0,
    daily: 0,
    mastered: 0,
    bestStars: {},
  },
  learned: [],
  weak: [],
  quests: { phraseStars: {}, streetDone: {}, done: {}, chapterDone: {} },
  tour: { acked: {}, skipped: false },
  muted: false,
  voiceURI: null,
  pron: { progress: {}, recent: [] },
};

export { chaNeed } from './career';

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function deepMerge<T extends Record<string, any>>(target: T, source: any): T {
  if (!source || typeof source !== 'object') return target;
  const out: any = Array.isArray(target) ? [...target] : { ...target };
  for (const key of Object.keys(source)) {
    const sVal = source[key];
    const tVal = out[key];
    if (
      sVal &&
      typeof sVal === 'object' &&
      !Array.isArray(sVal) &&
      tVal &&
      typeof tVal === 'object' &&
      !Array.isArray(tVal)
    ) {
      out[key] = deepMerge(tVal, sVal);
    } else if (sVal !== undefined) {
      out[key] = sVal;
    }
  }
  return out;
}

export function loadInitialState(): GameState {
  const base = deepClone(DEFAULT_STATE);
  if (typeof window === 'undefined') return base;

  try {
    const rawV2 = window.localStorage.getItem(STORAGE_KEY_V2);
    if (rawV2) {
      const parsed = JSON.parse(rawV2);
      const merged = deepMerge(base, parsed);
      SFX.muted = Boolean(merged.muted);
      return merged;
    }

    // Check migration v1 -> v2
    const rawV1 = window.localStorage.getItem(STORAGE_KEY_V1);
    if (rawV1) {
      const v1 = JSON.parse(rawV1);
      if (typeof v1.energy === 'number') base.energy = v1.energy;
      if (typeof v1.xp === 'number') base.xp = v1.xp;
      if (typeof v1.cash === 'number') base.cash = v1.cash;
      if (typeof v1.day === 'number') base.day = v1.day;
      if (typeof v1.muted === 'boolean') base.muted = v1.muted;
      if (typeof v1.voiceURI === 'string') base.voiceURI = v1.voiceURI;
      if (v1.charisma && typeof v1.charisma.lv === 'number') {
        base.charisma = { lv: v1.charisma.lv, pts: v1.charisma.pts || 0 };
      }
      if (v1.gigsDone && typeof v1.gigsDone === 'object') {
        let totalShows = 0;
        for (const [k, count] of Object.entries(v1.gigsDone)) {
          if (k !== 'cafe' && k !== 'coffee' && typeof count === 'number') {
            totalShows += count;
          }
        }
        base.stats.shows = totalShows;
      }
      window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(base));
    }
  } catch {
    // Ignore storage errors
  }

  SFX.muted = Boolean(base.muted);
  return base;
}

let saveTimer: number | null = null;

export function persistStateNow(st: GameState) {
  if (typeof window === 'undefined') return;
  if (saveTimer) {
    window.clearTimeout(saveTimer);
    saveTimer = null;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(st));
  } catch {
    // Swallow quota/private browsing errors
  }
}

export function persistStateDebounced(st: GameState) {
  if (typeof window === 'undefined') return;
  if (saveTimer) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    persistStateNow(st);
  }, 120);
}

export interface ToastItem {
  id: number;
  msg: string;
  tone: 'info' | 'success' | 'warn' | 'error' | 'pink';
}

export interface FloatingGainItem {
  id: number;
  stat: 'energy' | 'charisma' | 'xp' | 'cash';
  delta: number;
}

export interface StageFinishSummary {
  sceneId: string;
  avgStars: number;
  roundedStars: number;
  cashEarned: number;
  charismaEarned: number;
  energyEarned: number;
  xpEarned: number;
  listeningXpEarned: number;
  beginAt: number;
  endAt: number;
  minutesLate: number;
  latePenaltyPct: number;
  returnTo: ViewName;
}

export interface WorldAutoTarget {
  locId: string;
  enterSceneId?: string;
}

interface GameStore {
  state: GameState;
  view: ViewName;
  routing: boolean;
  curtain: { visible: boolean; title: string; tip: string };
  toasts: ToastItem[];
  floatingGains: FloatingGainItem[];
  activeSceneId: string | null;
  stageReturnTo: ViewName;
  stageEntry: { at: number; late: number } | null;
  faintPending: boolean;
  sleepOverlay: boolean;
  bookOpen: boolean;
  bookInitialTab: string;
  shopOpen: boolean;
  voiceModalOpen: boolean;
  resultSummary: StageFinishSummary | null;
  streetTalkActive: { passerName: string; lookIndex: number; item: StreetTalkItem } | null;
  streetTalkDoneIds: Record<string, boolean>;
  worldTarget: WorldAutoTarget | null;

  // Helpers
  bonusOf: (key: 'cash' | 'cha' | 'xp') => number;
  toast: (msg: string, tone?: ToastItem['tone'], ms?: number) => void;
  saveNow: () => void;
  gain: (deltas: { energy?: number; xp?: number; cash?: number; charisma?: number }) => void;

  // Navigation
  goTo: (targetView: ViewName, opts?: { title?: string; tip?: string; immediate?: boolean }) => Promise<void>;
  openWorldWithTarget: (locId: string, enterSceneId?: string) => void;
  clearWorldTarget: () => void;

  // Clock & Day lifecycle
  touchStreak: () => number;
  startDayFromWelcome: () => void;
  advanceClock: (minutes: number) => void;
  sleepDay: (opts?: { forced?: boolean }) => Promise<void>;
  waitUntilMinute: (targetMinute: number) => void;
  flushPendingFaint: () => boolean;
  setLocation: (locId: string) => void;

  // Stage lifecycle
  startScene: (sceneId: string, returnTo?: ViewName) => boolean;
  finishScene: (
    turnStars: number[],
    speakingXpTotal: number,
    listeningXpTotal: number
  ) => void;
  closeResultSummary: () => void;
  addWeakWordsFromTokens: (sceneId: string, cueText: string, tokens: EvaluatedToken[]) => void;
  resolveWeakWord: (key: string, status: 'ok' | 'near') => void;
  unlockPhrase: (phraseId: string) => void;

  // Modals & Shop
  setBookOpen: (open: boolean, tab?: string) => void;
  setShopOpen: (open: boolean) => void;
  setVoiceModalOpen: (open: boolean) => void;
  buyShopItem: (itemId: string) => void;
  toggleMute: () => void;
  setVoiceURI: (uri: string | null) => void;
  resetAllData: () => void;

  // Street talk
  openStreetTalk: (passerName: string, lookIndex: number, item: StreetTalkItem) => void;
  closeStreetTalk: () => void;
  markStreetTalkUsed: (itemId: string) => void;

  // Quests
  recordPhraseStars: (phraseId: string, stars: number) => void;
  evaluateQuests: () => void;
  questOpen: boolean;
  setQuestOpen: (open: boolean) => void;
  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;
  pronOpen: boolean;
  setPronOpen: (open: boolean) => void;
  recordPron: (drillId: string, ok: boolean) => void;
  ackTour: (stepId: string) => void;
  skipTour: () => void;
}

let toastSeq = 1;
let floatSeq = 1;

export const useGameStore = create<GameStore>((set, get) => ({
  state: loadInitialState(),
  view: 'welcome',
  routing: false,
  curtain: { visible: false, title: '', tip: TIPS[0] },
  toasts: [],
  floatingGains: [],
  activeSceneId: null,
  stageReturnTo: 'hub',
  stageEntry: null,
  faintPending: false,
  sleepOverlay: false,
  bookOpen: false,
  bookInitialTab: 'Tất cả',
  shopOpen: false,
  voiceModalOpen: false,
  resultSummary: null,
  streetTalkActive: null,
  streetTalkDoneIds: {},
  worldTarget: null,
  questOpen: false,
  helpOpen: false,
  pronOpen: false,

  bonusOf: (key) => {
    const items = get().state.items;
    let sum = 0;
    for (const shopItem of SHOP) {
      if (items[shopItem.id] && shopItem.bonus && typeof shopItem.bonus[key] === 'number') {
        sum += shopItem.bonus[key]!;
      }
    }
    return sum;
  },

  toast: (msg, tone = 'info', ms = 2400) => {
    const id = toastSeq++;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, msg, tone }] }));
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, ms);
    }
  },

  saveNow: () => {
    persistStateNow(get().state);
  },

  gain: ({ energy = 0, xp = 0, cash = 0, charisma = 0 }) => {
    const st = deepClone(get().state);
    const newFloats: FloatingGainItem[] = [];

    if (energy !== 0) {
      const nextE = clamp(Math.round(st.energy + energy), 0, st.maxEnergy);
      const actualDelta = nextE - st.energy;
      st.energy = nextE;
      if (actualDelta !== 0) {
        newFloats.push({ id: floatSeq++, stat: 'energy', delta: actualDelta });
      }
    }

    if (xp !== 0) {
      const nextXp = Math.max(0, Math.round(st.xp + xp));
      const actualDelta = nextXp - st.xp;
      st.xp = nextXp;
      if (actualDelta !== 0) {
        newFloats.push({ id: floatSeq++, stat: 'xp', delta: actualDelta });
      }
    }

    if (cash !== 0) {
      const nextCash = Math.max(0, Math.round(st.cash + cash));
      const actualDelta = nextCash - st.cash;
      st.cash = nextCash;
      if (actualDelta !== 0) {
        newFloats.push({ id: floatSeq++, stat: 'cash', delta: actualDelta });
      }
    }

    let leveledUpTo: number | null = null;
    if (charisma !== 0) {
      const deltaCha = Math.round(charisma);
      st.charisma.pts = Math.max(0, st.charisma.pts + deltaCha);
      while (st.charisma.lv < MAX_LV && st.charisma.pts >= chaNeed(st.charisma.lv)) {
        st.charisma.pts -= chaNeed(st.charisma.lv);
        st.charisma.lv += 1;
        leveledUpTo = st.charisma.lv;
      }
      if (st.charisma.lv >= MAX_LV) st.charisma.pts = 0;
      if (deltaCha !== 0) {
        newFloats.push({ id: floatSeq++, stat: 'charisma', delta: deltaCha });
      }
    }

    set((prev) => ({
      state: st,
      floatingGains: [...prev.floatingGains, ...newFloats],
    }));

    persistStateDebounced(st);

    if (newFloats.length > 0 && typeof window !== 'undefined') {
      const ids = new Set(newFloats.map((f) => f.id));
      window.setTimeout(() => {
        set((prev) => ({
          floatingGains: prev.floatingGains.filter((f) => !ids.has(f.id)),
        }));
      }, 1150);
    }

    if (leveledUpTo !== null && typeof window !== 'undefined') {
      window.setTimeout(() => {
        SFX.play('levelUp');
        const lv = leveledUpTo as number;
        const unlocked = Object.values(SCENES)
          .filter((sc) => sc.reqLv === lv)
          .map((sc) => sc.title);
        get().toast(
          `✨ Lên Lv.${lv} · ${levelTitle(lv)}!` +
            (unlocked.length ? ` Mở khoá: ${unlocked.join(', ')}` : ''),
          'pink',
          4200
        );
      }, 650);
    }
  },

  goTo: async (targetView, opts = {}) => {
    const current = get();
    if (current.view === targetView && !opts.immediate) return;
    if (current.routing) return;

    Voice.stop();
    if (opts.immediate) {
      set({ view: targetView });
      return;
    }

    const tip = opts.tip || TIPS[Math.floor(Math.random() * TIPS.length)];
    const title =
      opts.title ||
      (targetView === 'world'
        ? 'Đang ra phố...'
        : targetView === 'hub'
        ? 'Về Phòng MC Thiên Ân...'
        : 'Đang bước lên sân khấu...');

    SFX.play('whoosh');
    set({ routing: true, curtain: { visible: true, title, tip } });

    await new Promise((r) => setTimeout(r, 780));
    set({ view: targetView });

    if (targetView === 'world') {
      const p = getPeriod(get().state.clock);
      Ambience.start(p === 'evening' || p === 'night' ? 'night' : 'day');
    } else {
      Ambience.stop();
    }

    await new Promise((r) => setTimeout(r, 180));
    set((s) => ({ routing: false, curtain: { ...s.curtain, visible: false } }));
  },

  openWorldWithTarget: (locId, enterSceneId) => {
    set({ worldTarget: { locId, enterSceneId } });
    get().goTo('world', {
      title: 'Ra phố di chuyển...',
    });
  },

  clearWorldTarget: () => {
    set({ worldTarget: null });
  },

  touchStreak: () => {
    const st = deepClone(get().state);
    const today = dayKey();
    const yesterday = yesterdayKey();

    if (st.streak.last === today) {
      // unchanged
    } else if (st.streak.last === yesterday) {
      st.streak.count += 1;
    } else {
      st.streak.count = 1;
    }
    st.streak.last = today;
    st.streak.best = Math.max(st.streak.best, st.streak.count);

    set({ state: st });
    persistStateDebounced(st);
    return st.streak.count;
  },

  startDayFromWelcome: () => {
    SFX.unlock();
    AudioBus.reset();
    // Unlock iOS TTS with empty utterance
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        const u = new SpeechSynthesisUtterance('');
        u.volume = 0;
        window.speechSynthesis.speak(u);
      } catch {
        // ignore
      }
    }

    const st = deepClone(get().state);
    const plan = dayPlan(st);
    const today = dayKey();

    if (plan === 'resume') {
      // keep clock & day
    } else if (plan === 'fresh') {
      st.dayDate = today;
      st.clock = DAY_START;
      st.loc = 'home';
    } else {
      st.day += 1;
      st.dayDate = today;
      st.clock = DAY_START;
      st.doneToday = {};
      st.loc = 'home';
      st.energy = Math.max(st.energy, Math.round(st.maxEnergy * NEW_DAY_ENERGY_PCT));
      st.dayFresh = true;
    }

    set({ state: st, view: 'hub', streetTalkDoneIds: {} });
    persistStateNow(st);

    const streakCount = get().touchStreak();
    get().toast(
      plan === 'resume'
        ? `Chào mừng trở lại Ngày ${st.day} · ${fmtTime(st.clock)}!`
        : `🌅 Chào Ngày ${st.day} trong sự nghiệp MC Thiên Ân!`,
      'success'
    );

    if (streakCount > 1 && typeof window !== 'undefined') {
      window.setTimeout(() => {
        get().toast(`🔥 Chuỗi ${streakCount} ngày luyện tiếng Anh liên tiếp!`, 'pink', 3000);
      }, 2600);
    }
  },

  advanceClock: (minutes) => {
    if (minutes <= 0) return;
    const prevSt = get().state;
    const prevPeriod = getPeriod(prevSt.clock);

    const st = deepClone(prevSt);
    st.clock = clamp(Math.round(st.clock + minutes), DAY_START, DAY_END);
    st.dayFresh = false;

    const newPeriod = getPeriod(st.clock);
    set({ state: st });
    persistStateDebounced(st);

    SFX.play('tick');

    if (
      (prevPeriod === 'morning' || prevPeriod === 'afternoon') &&
      (newPeriod === 'evening' || newPeriod === 'night')
    ) {
      SFX.play('night');
      if (get().view === 'world') {
        Ambience.start('night');
      }
    }

    if (st.clock >= DAY_END) {
      const curr = get();
      if (curr.view === 'stage' || curr.routing || curr.resultSummary) {
        set({ faintPending: true });
      } else {
        get().sleepDay({ forced: true });
      }
    }
  },

  sleepDay: async ({ forced = false } = {}) => {
    SFX.play('sleep');
    set({ sleepOverlay: true, faintPending: false });
    await new Promise((r) => setTimeout(r, 1200));

    const st = deepClone(get().state);
    const pct = forced ? FAINT_ENERGY_PCT : SLEEP_ENERGY_PCT;
    st.day += 1;
    st.dayDate = dayKey();
    st.clock = DAY_START;
    st.doneToday = {};
    st.loc = 'home';
    st.dayFresh = true;
    st.energy = Math.max(st.energy, Math.round(st.maxEnergy * pct));

    set({
      state: st,
      sleepOverlay: false,
      view: 'hub',
      streetTalkDoneIds: {},
      worldTarget: null,
    });
    Ambience.stop();
    persistStateNow(st);

    if (forced) {
      get().toast(
        `😵 Đã quá 24:00! Bạn kiệt sức ngất đi và thức dậy vào Ngày ${st.day} (60% ⚡).`,
        'warn',
        3600
      );
    } else {
      get().toast(
        `🌅 Chào buổi sáng Ngày ${st.day}! Năng lượng đã hồi đầy 100% ⚡.`,
        'success',
        3000
      );
    }
  },

  waitUntilMinute: (targetMinute) => {
    const cur = get().state.clock;
    if (targetMinute > cur) {
      get().advanceClock(targetMinute - cur);
      get().toast(`⏩ Đã chờ đến ${fmtTime(targetMinute)}!`, 'info');
    }
  },

  flushPendingFaint: () => {
    if (get().faintPending || get().state.clock >= DAY_END) {
      get().sleepDay({ forced: true });
      return true;
    }
    return false;
  },

  setLocation: (locId) => {
    const st = deepClone(get().state);
    st.loc = locId;
    set({ state: st });
    persistStateDebounced(st);
  },

  startScene: (sceneId, returnTo = 'hub') => {
    const scene = SCENES[sceneId];
    if (!scene) return false;
    const st = get().state;

    // 1. Check clock/schedule, charisma, energy
    const slot = SCHEDULE[sceneId];
    const now = st.clock;
    let late = 0;

    if (slot?.type === 'show') {
      const start = slot.start ?? 900;
      if (st.doneToday[sceneId]) {
        SFX.play('error');
        get().toast('Bạn đã dẫn show này trong hôm nay rồi!', 'warn');
        return false;
      }
      if (now < start - 60) {
        SFX.play('error');
        get().toast(`Show chưa mở cửa! Mở cửa lúc ${fmtTime(start - 60)}.`, 'warn');
        return false;
      }
      if (now - start > 45) {
        SFX.play('error');
        get().toast('Bạn đã trễ quá 45 phút và lỡ show này!', 'error');
        return false;
      }
      late = Math.max(0, now - start);
    } else if (slot?.type === 'daily') {
      const open = slot.open ?? 420;
      const close = slot.close ?? 1260;
      if (now < open || now >= close) {
        SFX.play('error');
        get().toast(`Hoạt động chỉ mở cửa từ ${fmtTime(open)} đến ${fmtTime(close)}!`, 'warn');
        return false;
      }
    }

    if (st.charisma.lv < scene.reqLv) {
      SFX.play('error');
      get().toast(`Cần Charisma Lv.${scene.reqLv} để mở khoá show này!`, 'warn');
      return false;
    }

    if (scene.minRep && (!st.rep || st.rep.n <= 0 || st.rep.avg < scene.minRep)) {
      SFX.play('error');
      get().toast(`Cần Danh tiếng ⭐ ${scene.minRep.toFixed(1)} để nhận show này!`, 'warn');
      return false;
    }

    if (scene.type === 'show' && st.energy < scene.energy) {
      SFX.play('error');
      get().toast(`Không đủ Năng lượng (Cần ${scene.energy} ⚡)!`, 'error');
      return false;
    }

    // Deduct energy on entry for shows
    if (scene.type === 'show' && scene.energy > 0) {
      get().gain({ energy: -scene.energy });
    }

    SFX.play('door');
    set({
      activeSceneId: sceneId,
      stageReturnTo: returnTo,
      stageEntry: { at: now, late },
      resultSummary: null,
    });

    get().goTo('stage', {
      title: `${scene.icon} ${scene.title}`,
      tip: scene.curtain,
    });
    return true;
  },

  finishScene: (turnStars, speakingXpTotal, listeningXpTotal) => {
    const { activeSceneId, stageEntry, stageReturnTo, state } = get();
    if (!activeSceneId) return;
    const scene = SCENES[activeSceneId];
    if (!scene) return;

    const avg =
      turnStars.length > 0
        ? turnStars.reduce((a, b) => a + b, 0) / turnStars.length
        : 0;
    const mult = 0.6 + 0.15 * avg;
    const isRepeatDaily = scene.type === 'daily' && Boolean(state.doneToday[activeSceneId]);

    const bonusCash = get().bonusOf('cash');
    const bonusCha = get().bonusOf('cha');

    const minutesLate = stageEntry?.late ?? 0;
    const pen = scene.type === 'show' ? latePenalty(minutesLate) : 0;

    const rawCash = scene.reward.cash
      ? Math.round(scene.reward.cash * (0.8 + 0.1 * avg) * (1 + bonusCash))
      : 0;
    const cashEarned = Math.round(rawCash * (1 - pen));

    const kCha =
      scene.type === 'show'
        ? 1 + bonusCha
        : isRepeatDaily
        ? DAILY_REPEAT_CHA
        : 1;
    const charismaEarned = Math.round(scene.reward.charisma * mult * kCha);

    const energyEarned =
      scene.type === 'daily' && !isRepeatDaily && scene.reward.energy
        ? Math.round(scene.reward.energy * mult)
        : 0;

    // Advance time
    const slot = SCHEDULE[activeSceneId];
    const entryAt = stageEntry?.at ?? state.clock;
    const beginAt =
      scene.type === 'show' && slot?.start
        ? Math.max(entryAt, slot.start)
        : entryAt;
    const dur = scene.duration || DURATION_DEFAULT[scene.type];
    const endAt = Math.min(DAY_END, beginAt + dur);

    // Update stats & records
    const nextState = deepClone(get().state);
    nextState.gigsDone[activeSceneId] = (nextState.gigsDone[activeSceneId] || 0) + 1;
    nextState.doneToday[activeSceneId] = true;
    if (scene.type === 'show') {
      nextState.stats.shows += 1;
      nextState.rep = nextRep(nextState.rep || { avg: 0, n: 0 }, avg);
    } else {
      nextState.stats.daily += 1;
    }
    const roundedStars = Math.round(avg);
    nextState.stats.bestStars[activeSceneId] = Math.max(
      nextState.stats.bestStars[activeSceneId] || 0,
      roundedStars
    );
    nextState.clock = endAt;
    nextState.dayFresh = false;

    const faintNow = endAt >= DAY_END;

    set({
      state: nextState,
      faintPending: faintNow,
      resultSummary: {
        sceneId: activeSceneId,
        avgStars: avg,
        roundedStars,
        cashEarned,
        charismaEarned,
        energyEarned,
        xpEarned: speakingXpTotal + listeningXpTotal,
        listeningXpEarned: listeningXpTotal,
        beginAt,
        endAt,
        minutesLate,
        latePenaltyPct: Math.round(pen * 100),
        returnTo: stageReturnTo,
      },
    });

    get().gain({
      cash: cashEarned,
      charisma: charismaEarned,
      energy: energyEarned,
    });
    get().evaluateQuests();
    persistStateNow(get().state);
  },

  closeResultSummary: () => {
    const summary = get().resultSummary;
    set({ resultSummary: null, activeSceneId: null });
    if (get().flushPendingFaint()) {
      return;
    }
    get().goTo(summary?.returnTo || 'hub');
  },

  addWeakWordsFromTokens: (sceneId, cueText, tokens) => {
    const st = deepClone(get().state);
    let changed = false;

    for (const tok of tokens) {
      if (tok.status === 'ok') continue;
      const clean = tok.clean;
      if (!clean || clean.length < 3 || FUNCTION_WORDS.has(clean)) continue;

      const existingIdx = st.weak.findIndex((w) => w.key === clean);
      if (existingIdx >= 0) {
        const ex = st.weak[existingIdx];
        ex.misses += 1;
        if (tok.status === 'bad') ex.status = 'bad';
        ex.ctx = cueText;
        ex.scene = sceneId;
        ex.at = Date.now();
        ex.box = 1;
        ex.due = st.day;
        // Move to front
        st.weak.splice(existingIdx, 1);
        st.weak.unshift(ex);
      } else {
        const item: WeakWord = {
          key: clean,
          word: tok.word.replace(/[^a-zA-Z'-]/g, '') || clean,
          ctx: cueText,
          status: tok.status,
          misses: 1,
          scene: sceneId,
          at: Date.now(),
          box: 1,
          due: st.day,
        };
        st.weak.unshift(item);
        if (st.weak.length > 60) st.weak.length = 60;
      }
      changed = true;
    }

    if (changed) {
      set({ state: st });
      persistStateDebounced(st);
    }
  },

  resolveWeakWord: (key, status) => {
    const st = deepClone(get().state);
    const idx = st.weak.findIndex((w) => w.key === key);
    if (idx < 0) return;

    const item = st.weak[idx];
    const bonusXp = get().bonusOf('xp');

    if (status === 'ok') {
      const baseXp = item.status === 'bad' ? 10 : 6;
      const earned = Math.round(baseXp * (1 + bonusXp));
      const reviewed = scheduleAfter(item, true, st.day);
      if (boxOf(item) >= SRS_MAX_BOX) {
        // Đúng ở hộp cao nhất: coi như đã làm chủ từ này
        st.weak.splice(idx, 1);
        st.stats.mastered += 1;
        set({ state: st });
        get().gain({ xp: earned });
        SFX.play('correct');
        get().toast(`🎉 Đã làm chủ từ "${item.word}" (+${earned} XP)!`, 'success');
      } else {
        st.weak[idx] = reviewed;
        set({ state: st });
        persistStateDebounced(st);
        get().gain({ xp: earned });
        SFX.play('correct');
        const gap = (reviewed.due ?? st.day) - st.day;
        get().toast(`Đúng! "${item.word}" sẽ ôn lại sau ${gap} ngày (+${earned} XP)`, 'success');
      }
    } else {
      const again = scheduleAfter(item, false, st.day);
      st.weak[idx] = again;
      set({ state: st });
      persistStateDebounced(st);
      SFX.play('ting');
      get().toast(`Gần chuẩn rồi! "${item.word}" sẽ ôn lại ngày mai.`, 'info');
    }
  },

  unlockPhrase: (phraseId) => {
    const st = get().state;
    if (st.learned.includes(phraseId)) return;
    const next = deepClone(st);
    next.learned.push(phraseId);
    set({ state: next });
    persistStateDebounced(next);
  },

  setBookOpen: (open, tab) => {
    SFX.play('page');
    const st = get().state;
    const defaultTab = tab || (st.weak.length > 0 ? 'Cần luyện' : 'Tất cả');
    set({ bookOpen: open, bookInitialTab: defaultTab });
  },

  setShopOpen: (open) => {
    SFX.play('pop');
    set({ shopOpen: open });
  },

  setVoiceModalOpen: (open) => {
    SFX.play('tap');
    set({ voiceModalOpen: open });
  },

  buyShopItem: (itemId) => {
    const item = SHOP.find((i) => i.id === itemId);
    if (!item) return;
    const st = get().state;

    if (st.cash < item.price) {
      SFX.play('error');
      get().toast('Chưa đủ cát-xê để mua món này!', 'error');
      return;
    }

    if (item.type === 'consumable') {
      if (st.energy >= st.maxEnergy) {
        SFX.play('error');
        get().toast('Năng lượng đang đầy 100% ⚡ rồi!', 'warn');
        return;
      }
      SFX.play('coin');
      get().gain({ cash: -item.price, energy: item.energy || 0 });
      get().toast(`${item.icon} Đã dùng ${item.name} (+${item.energy} ⚡)!`, 'success');
      return;
    }

    // Upgrade item
    if (st.items[item.id]) {
      get().toast('Bạn đã sở hữu nâng cấp này rồi!', 'info');
      return;
    }

    const next = deepClone(st);
    next.items[item.id] = true;
    set({ state: next });
    SFX.play('levelUp');
    get().gain({ cash: -item.price });
    get().toast(`✨ Đã trang bị ${item.name} lên nhân vật 3D!`, 'pink', 3200);
  },

  toggleMute: () => {
    const next = deepClone(get().state);
    next.muted = !next.muted;
    SFX.muted = next.muted;
    if (next.muted) {
      Ambience.stop();
    } else {
      SFX.play('tap');
      if (get().view === 'world') {
        const p = getPeriod(next.clock);
        Ambience.start(p === 'evening' || p === 'night' ? 'night' : 'day');
      }
    }
    set({ state: next });
    persistStateNow(next);
  },

  setVoiceURI: (uri) => {
    const next = deepClone(get().state);
    next.voiceURI = uri;
    set({ state: next });
    persistStateNow(next);
  },

  resetAllData: () => {
    const fresh = deepClone(DEFAULT_STATE);
    fresh.day = 1;
    fresh.dayDate = dayKey();
    fresh.dayFresh = true;
    fresh.streak = { count: 1, best: 1, last: dayKey() };
    set({
      state: fresh,
      view: 'hub',
      shopOpen: false,
      bookOpen: false,
      streetTalkDoneIds: {},
    });
    persistStateNow(fresh);
    get().toast('Đã đặt lại dữ liệu về Ngày 1!', 'info');
  },

  openStreetTalk: (passerName, lookIndex, item) => {
    SFX.play('chat');
    set({ streetTalkActive: { passerName, lookIndex, item } });
  },

  closeStreetTalk: () => {
    Voice.stop();
    set({ streetTalkActive: null });
  },

  markStreetTalkUsed: (itemId) => {
    set((s) => ({
      streetTalkDoneIds: { ...s.streetTalkDoneIds, [itemId]: true },
    }));
    const st = get().state;
    if (st.quests.streetDone[itemId]) return;
    const next = deepClone(st);
    next.quests.streetDone[itemId] = true;
    set({ state: next });
    persistStateDebounced(next);
    get().evaluateQuests();
  },

  recordPhraseStars: (phraseId, stars) => {
    const next = deepClone(get().state);
    next.quests.phraseStars[phraseId] = Math.max(next.quests.phraseStars[phraseId] || 0, stars);
    set({ state: next });
    persistStateDebounced(next);
    get().evaluateQuests();
  },

  evaluateQuests: () => {
    const st = get().state;
    const res = applyQuestProgress(st);
    if (res.newQuests.length === 0 && res.newChapters.length === 0) return;
    const next = deepClone(st);
    next.quests = res.quests;
    set({ state: next });
    persistStateDebounced(next);
    for (const d of res.newQuests) {
      get().toast(`✅ Hoàn thành nhiệm vụ: ${d.title}`, 'success', 3200);
    }
    for (const c of res.newChapters) {
      get().toast(`🏆 Hoàn thành ${c.title}!`, 'success', 3800);
    }
    if (res.xp > 0 || res.charisma > 0) {
      get().gain({ xp: res.xp, charisma: res.charisma });
    }
  },

  ackTour: (stepId) => {
    const next = deepClone(get().state);
    next.tour.acked[stepId] = true;
    set({ state: next });
    persistStateDebounced(next);
  },

  skipTour: () => {
    const next = deepClone(get().state);
    next.tour.skipped = true;
    set({ state: next });
    persistStateDebounced(next);
  },

  setHelpOpen: (open) => {
    SFX.play('page');
    set({ helpOpen: open });
  },

  setPronOpen: (open) => {
    SFX.play('page');
    set({ pronOpen: open });
  },

  recordPron: (drillId, ok) => {
    const next = deepClone(get().state);
    const prev = next.pron.progress[drillId] || { tries: 0, ok: 0 };
    next.pron.progress[drillId] = { tries: prev.tries + 1, ok: prev.ok + (ok ? 1 : 0) };
    next.pron.recent = [...next.pron.recent, drillId].slice(-PRON_RECENT_WINDOW);
    set({ state: next });
    persistStateDebounced(next);
    if (ok) get().gain({ xp: 5 });
  },

  setQuestOpen: (open) => {
    SFX.play('page');
    set({ questOpen: open });
  },
}));
