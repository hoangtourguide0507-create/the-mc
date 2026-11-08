export type ViewName = 'welcome' | 'hub' | 'world' | 'stage';

export type DayPeriod = 'morning' | 'afternoon' | 'evening' | 'night';

export type NpcMood = 'idle' | 'listening' | 'happy' | 'confused';
export type VisemeType = 'a' | 'e' | 'o' | 'm' | 'rest';

export type HairStyle = 'side' | 'swoop' | 'crew' | 'curly' | 'long' | 'updo' | 'veil' | 'beanie';
export type OutfitStyle = 'tux' | 'suit' | 'velvet' | 'jacket' | 'crew' | 'hoodie' | 'apron' | 'blouse' | 'gown' | 'bride';
export type AccessoryType = 'glasses' | 'beard' | 'headset' | 'intercom' | 'earrings' | 'pearls' | 'phones' | 'flower' | 'inear';
export type PropArtType = 'cup' | 'tablet' | 'clipboard' | 'bouquet' | 'mic' | 'goldmic';

export interface LookConfig {
  skin: string;
  hair: string;
  eye?: string;
  cloth: string;
  accent?: string;
  lip?: string;
  hat?: string;
  beard?: string;
  hairStyle: HairStyle;
  outfit: OutfitStyle;
  acc?: AccessoryType[];
  plaid?: boolean;
  pattern?: boolean;
  lashes?: boolean;
  propArt?: PropArtType;
  prop?: string;
  glbUrl?: string; // Optional external .glb model override
}

export interface VoiceConfig {
  lang: 'en-US' | 'en-GB' | 'en-AU';
  gender: 'f' | 'm';
  pitch: number;
  rate: number;
}

export interface NpcData {
  id: string;
  name: string;
  role: string;
  voice: VoiceConfig;
  look: LookConfig;
  isCouple?: boolean;
  coupleLooks?: {
    emma: LookConfig;
    liam: LookConfig;
  };
  coupleVoices?: {
    emma: VoiceConfig;
    liam: VoiceConfig;
  };
}

export type TurnMode = 'scripted' | 'catch' | 'semi' | 'free' | 'quiz';

export interface QuizOption {
  t: string;
  tVi?: string;
  ok?: boolean;
}

export interface TurnData {
  mode?: TurnMode;
  npc: string;
  npcVi: string;
  tip: string;
  who?: string;
  speaker?: 'emma' | 'liam';
  channel?: 'inear';
  // Scripted & Catch
  cue?: string;
  cueRaw?: string;
  cueVi?: string;
  key?: string;
  catch?: string[];
  catchAnswers?: string[];
  // Semi-scripted
  frame?: string;
  blanks?: number;
  blankPool?: string[][];
  sample?: string;
  // Freeform
  task?: string;
  taskVi?: string;
  requiredKeywords?: string[][];
  bonusKeywords?: string[][];
  forbiddenKeywords?: string[];
  minWords?: number;
  // Quiz
  question?: string;
  options?: QuizOption[];
  reflex?: number;
}

export interface SceneReward {
  cash?: number;
  charisma: number;
  energy?: number;
}

export interface SceneData {
  id: string;
  type: 'daily' | 'show';
  cat: string;
  tag: string;
  tagCls: string;
  tint: string;
  level: string;
  reqLv: number;
  /** Danh tiếng tối thiểu (0–3 sao) để nhận show */
  minRep?: number;
  icon: string;
  title: string;
  sub: string;
  curtain: string;
  art: 'room' | 'cafe' | 'backstage' | 'market' | 'beach' | 'talkshow' | 'wedding' | 'gala' | 'launch';
  npc: string;
  energy: number;
  reward: SceneReward;
  duration: number;
  turns: TurnData[];
}

export interface ScheduleSlot {
  type: 'daily' | 'show';
  open?: number;
  close?: number;
  start?: number;
}

export type SceneTimeState = 'open' | 'closed' | 'early' | 'late' | 'missed' | 'done';

export interface SceneStatusResult {
  state: SceneTimeState;
  minutesLate: number;
  label: string;
}

export interface WeakWord {
  key: string;
  word: string;
  ctx: string;
  status: 'bad' | 'near';
  misses: number;
  scene: string;
  at: number;
}

export interface GameState {
  v: number;
  energy: number;
  maxEnergy: number;
  charisma: {
    lv: number;
    pts: number;
  };
  /** Danh tiếng: trung bình trượt số sao các show (0–3), n = số show đã tính */
  rep: {
    avg: number;
    n: number;
  };
  xp: number;
  cash: number;
  day: number;
  dayDate: string;
  clock: number;
  loc: string;
  doneToday: Record<string, boolean>;
  dayFresh: boolean;
  streak: {
    count: number;
    best: number;
    last: string;
  };
  items: Record<string, boolean>;
  gigsDone: Record<string, number>;
  stats: {
    shows: number;
    daily: number;
    mastered: number;
    bestStars: Record<string, number>;
  };
  learned: string[];
  weak: WeakWord[];
  muted: boolean;
  voiceURI: string | null;
}

export interface ShopItem {
  id: string;
  name: string;
  sub: string;
  type: 'consumable' | 'upgrade';
  price: number;
  icon: string;
  energy?: number;
  bonus?: {
    cash?: number;
    cha?: number;
    xp?: number;
    inear?: boolean;
  };
}

export interface WorldLocation {
  id: string;
  name: string;
  icon: string;
  at: [number, number]; // Top corner of the building footprint
  size?: number; // Footprint (tiles per side), default 3
  district: 'center' | 'night' | 'coast';
  doorFace: 'front-left' | 'front-right';
  doorTile: [number, number]; // Absolute walkable door tile
  scenes: string[];
  color: string;
  neonColor: string;
  roofColor: string;
}

export type TileKind = 'grass' | 'road-x' | 'road-y' | 'cross' | 'walk' | 'park' | 'sand' | 'plaza' | 'water';

export interface WorldProp {
  kind:
    | 'tree'
    | 'palm'
    | 'lamp'
    | 'bench'
    | 'bush'
    | 'flower'
    | 'hydrant'
    | 'fountain'
    | 'umbrella'
    | 'kiosk'
    | 'lighthouse'
    | 'boat';
  c: number;
  r: number;
  color?: string;
  dir?: 'u' | 'v';
  /** Chặn ô (không đi qua được) */
  blocks?: boolean;
}

export interface StreetTalkOption {
  en: string;
  vi: string;
  ok?: boolean;
  why?: string;
}

export interface StreetTalkItem {
  id: string;
  level: 'A2' | 'B1' | 'B2';
  loc: string | null;
  when: DayPeriod[];
  prompt: {
    en: string;
    vi: string;
  };
  options: StreetTalkOption[];
}

export type TokenStatus = 'ok' | 'near' | 'bad';

export interface EvaluatedToken {
  word: string;
  clean: string;
  sim: number;
  status: TokenStatus;
  phonetic?: boolean;
}

export interface EvalResult {
  score: number;
  stars: 0 | 1 | 2 | 3;
  transcript: string;
  tokens: EvaluatedToken[];
  matchedKeywords?: string[];
  missingKeywords?: string[];
  bonusHit?: string[];
  forbiddenHit?: string[];
  blanksFilled?: number;
  blanksTotal?: number;
}

export type AudioBusState = 'idle' | 'speaking' | 'arming' | 'listening';
export type StageMicPhase = 'locked' | 'idle' | 'arming' | 'rec' | 'analyzing' | 'done';
