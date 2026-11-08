import { SCHEDULE, SCENES } from '../data/content';
import { DayPeriod, GameState, SceneStatusResult } from '../types/game';

export const DAY_START = 420; // 07:00
export const DAY_END = 1440; // 24:00
export const SHOW_DOOR_OPEN = 60; // 60 min before start
export const SHOW_LATE_MAX = 45; // >45 min late = missed
export const LATE_GRACE_MIN = 5; // 5 min grace period
export const LATE_CASH_PER_MIN = 0.012; // 1.2% per min after grace
export const LATE_CASH_MAX = 0.5; // max 50% penalty
export const DAILY_REPEAT_CHA = 0.5;
export const DURATION_DEFAULT = { daily: 30, show: 90 };
export const TRAVEL_MIN_PER_TILE = 2.5;
export const TRAVEL_MIN = 2;
export const SLEEP_ENERGY_PCT = 1.0;
export const FAINT_ENERGY_PCT = 0.6;
export const NEW_DAY_ENERGY_PCT = 1.0;
export const PERIOD_BOUNDS = [660, 1020, 1260] as const; // <11:00 morning, <17:00 afternoon, <21:00 evening, else night

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function fmtTime(minutes: number): string {
  const m = clamp(Math.round(minutes), 0, 1440);
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function getPeriod(minutes: number): DayPeriod {
  if (minutes < PERIOD_BOUNDS[0]) return 'morning';
  if (minutes < PERIOD_BOUNDS[1]) return 'afternoon';
  if (minutes < PERIOD_BOUNDS[2]) return 'evening';
  return 'night';
}

export function getPeriodMeta(minutes: number): {
  id: DayPeriod;
  label: string;
  icon: string;
  skyTop: string;
  skyBottom: string;
  ambientIntensity: number;
  sunIntensity: number;
  sunColor: string;
  isNight: boolean;
} {
  const p = getPeriod(minutes);
  switch (p) {
    case 'morning':
      return {
        id: 'morning',
        label: 'Buổi Sáng',
        icon: '🌅',
        skyTop: '#38BDF8',
        skyBottom: '#FEF08A',
        ambientIntensity: 0.85,
        sunIntensity: 1.35,
        sunColor: '#FFFBEB',
        isNight: false,
      };
    case 'afternoon':
      return {
        id: 'afternoon',
        label: 'Buổi Chiều',
        icon: '☀️',
        skyTop: '#0284C7',
        skyBottom: '#BAE6FD',
        ambientIntensity: 0.9,
        sunIntensity: 1.5,
        sunColor: '#FFF7ED',
        isNight: false,
      };
    case 'evening':
      return {
        id: 'evening',
        label: 'Hoàng Hôn',
        icon: '🌇',
        skyTop: '#311042',
        skyBottom: '#FB7185',
        ambientIntensity: 0.55,
        sunIntensity: 0.95,
        sunColor: '#F97316',
        isNight: true,
      };
    case 'night':
      return {
        id: 'night',
        label: 'Ban Đêm',
        icon: '🌙',
        skyTop: '#090518',
        skyBottom: '#1E1B4B',
        ambientIntensity: 0.35,
        sunIntensity: 0.4,
        sunColor: '#818CF8',
        isNight: true,
      };
  }
}

export function dayKey(d = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function yesterdayKey(d = new Date()): string {
  const prev = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
  return dayKey(prev);
}

export function latePenalty(minutesLate: number): number {
  if (minutesLate <= LATE_GRACE_MIN) return 0;
  return clamp((minutesLate - LATE_GRACE_MIN) * LATE_CASH_PER_MIN, 0, LATE_CASH_MAX);
}

export function travelMinutes(tilesCount: number): number {
  if (tilesCount <= 0) return 0;
  return Math.max(TRAVEL_MIN, Math.round(tilesCount * TRAVEL_MIN_PER_TILE));
}

export function sceneStatus(
  sceneId: string,
  clock: number,
  doneToday: Record<string, boolean>
): SceneStatusResult {
  const slot = SCHEDULE[sceneId];
  const scene = SCENES[sceneId];
  if (!slot || !scene) {
    return { state: 'open', minutesLate: 0, label: 'Đang mở cửa' };
  }

  if (slot.type === 'daily') {
    const open = slot.open ?? 420;
    const close = slot.close ?? 1260;
    const repeatSuffix = doneToday[sceneId] ? ' · đã hồi ⚡ hôm nay' : '';
    if (clock < open) {
      return {
        state: 'closed',
        minutesLate: 0,
        label: `Mở cửa lúc ${fmtTime(open)}${repeatSuffix}`,
      };
    }
    if (clock >= close) {
      return {
        state: 'closed',
        minutesLate: 0,
        label: `Đã đóng cửa (${fmtTime(open)}–${fmtTime(close)})${repeatSuffix}`,
      };
    }
    return {
      state: 'open',
      minutesLate: 0,
      label: `Đang mở (${fmtTime(open)}–${fmtTime(close)})${repeatSuffix}`,
    };
  }

  // Show logic
  const start = slot.start ?? 900;
  if (doneToday[sceneId]) {
    return {
      state: 'done',
      minutesLate: 0,
      label: `✓ Đã dẫn hôm nay (${fmtTime(start)})`,
    };
  }

  if (clock < start - SHOW_DOOR_OPEN) {
    return {
      state: 'early',
      minutesLate: 0,
      label: `Mở cửa ${fmtTime(start - SHOW_DOOR_OPEN)} · Diễn ${fmtTime(start)}`,
    };
  }

  if (clock <= start) {
    return {
      state: 'open',
      minutesLate: 0,
      label: `Đang mở cửa · Bắt đầu ${fmtTime(start)}`,
    };
  }

  const diff = clock - start;
  if (diff <= SHOW_LATE_MAX) {
    const penPct = Math.round(latePenalty(diff) * 100);
    return {
      state: 'late',
      minutesLate: diff,
      label: `Trễ ${diff} phút${penPct > 0 ? ` (−${penPct}% cát-xê)` : ' (ân hạn)'}`,
    };
  }

  return {
    state: 'missed',
    minutesLate: diff,
    label: `Đã lỡ show (${fmtTime(start)})`,
  };
}

export function blockReason(
  sceneId: string,
  state: GameState
): string | null {
  const scene = SCENES[sceneId];
  if (!scene) return 'Hoạt động không tồn tại.';

  const st = sceneStatus(sceneId, state.clock, state.doneToday);
  if (st.state === 'done') {
    return 'Bạn đã hoàn thành show này trong hôm nay rồi!';
  }
  if (st.state === 'early') {
    const slot = SCHEDULE[sceneId];
    const doorTime = (slot?.start ?? 900) - SHOW_DOOR_OPEN;
    return `Sân khấu chưa mở cửa! Hãy quay lại lúc ${fmtTime(doorTime)}.`;
  }
  if (st.state === 'closed') {
    return `Địa điểm hiện đang đóng cửa (${st.label}).`;
  }
  if (st.state === 'missed') {
    return 'Rất tiếc, bạn đã trễ quá 45 phút và lỡ mất show diễn này hôm nay!';
  }

  if (state.charisma.lv < scene.reqLv) {
    return `Cần đạt Charisma Lv.${scene.reqLv} để nhận dẫn show này!`;
  }

  if (scene.minRep) {
    const rep = state.rep;
    if (!rep || rep.n <= 0 || rep.avg < scene.minRep) {
      return `Cần Danh tiếng ⭐ ${scene.minRep.toFixed(1)} (hiện ${rep && rep.n > 0 ? rep.avg.toFixed(1) : '—'}) — dẫn các show nhỏ thật tốt để lên danh tiếng!`;
    }
  }

  if (scene.type === 'show' && state.energy < scene.energy) {
    return `Không đủ Năng lượng (cần ${scene.energy} ⚡). Hãy ghé Cửa hàng hoặc đi uống Cà phê/Siêu thị!`;
  }

  return null;
}

export function getWaitTargetMinute(sceneId: string, clock: number): number | null {
  const slot = SCHEDULE[sceneId];
  if (!slot) return null;
  if (slot.type === 'daily') {
    const open = slot.open ?? 420;
    return clock < open ? open : null;
  }
  const doorOpen = (slot.start ?? 900) - SHOW_DOOR_OPEN;
  return clock < doorOpen ? doorOpen : null;
}

export function dayPlan(state: GameState): 'resume' | 'fresh' | 'new' {
  const today = dayKey();
  if (state.day > 0 && state.dayDate === today) {
    return 'resume';
  }
  if (state.dayFresh) {
    return 'fresh';
  }
  return 'new';
}
