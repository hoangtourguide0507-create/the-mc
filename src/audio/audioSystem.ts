import { NPCS } from '../data/content';
import { AudioBusState, VisemeType, VoiceConfig } from '../types/game';
import { clamp } from '../core/clock';

// ---------------------------------------------------------------------------
// Pre-rendered voice clips: public/audio/manifest.json (tools/render-voices.mjs, ElevenLabs)
// and public/audio/manifest.kokoro.json (tools/render-kokoro.py, Kokoro)
// ---------------------------------------------------------------------------

/** Must match normText() in tools/voice-lines.mjs. */
export function normText(s: string): string {
  return String(s)
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Voice role for a speak() call: NPC id, 'couple:emma' / 'couple:liam', 'coach' or 'passer'. */
export function roleFor(npcId: string, speaker?: 'emma' | 'liam'): string {
  return npcId === 'couple' ? `couple:${speaker || 'emma'}` : npcId;
}

const AUDIO_BASE = `${import.meta.env.BASE_URL}audio/`;

type ClipIndex = Map<string, Map<string, string>>;
interface ClipSources {
  eleven: ClipIndex;
  /** Vai đã có clip ElevenLabs cho mọi câu; chỉ các vai này mới dùng giọng ElevenLabs. */
  elevenRoles: Set<string>;
  kokoro: ClipIndex;
}

/**
 * "Một vai, một giọng": mỗi vai chỉ dùng một bộ giọng cho mọi câu của mình.
 * Vai nằm trong completeRoles của manifest.json dùng ElevenLabs; mọi vai khác dùng Kokoro
 * (manifest.kokoro.json). Không trộn hai bộ trong cùng một vai. Giọng trình duyệt chỉ là
 * phương án cuối khi câu chưa được render.
 */
class ClipLibrary {
  private index: Promise<ClipSources> | null = null;

  private fetchManifest(name: string): Promise<{ clips?: Record<string, string>; completeRoles?: string[] }> {
    return fetch(`${AUDIO_BASE}${name}`, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}));
  }

  private toIndex(clips: Record<string, string> | undefined): ClipIndex {
    const map: ClipIndex = new Map();
    for (const [key, file] of Object.entries(clips || {})) {
      const cut = key.indexOf('|');
      const role = key.slice(0, cut);
      const text = key.slice(cut + 1);
      if (!map.has(text)) map.set(text, new Map());
      map.get(text)!.set(role, file);
    }
    return map;
  }

  load(): Promise<ClipSources> {
    if (!this.index) {
      this.index = Promise.all([this.fetchManifest('manifest.json'), this.fetchManifest('manifest.kokoro.json')]).then(
        ([el, kk]) => ({
          eleven: this.toIndex(el.clips),
          elevenRoles: new Set(el.completeRoles || []),
          kokoro: this.toIndex(kk.clips),
        })
      );
    }
    return this.index;
  }

  /** Clip URL for this role and text, or null when the line has not been rendered yet. */
  async find(role: string, text: string): Promise<string | null> {
    const key = normText(text);
    const src = await this.load();
    if (src.elevenRoles.has(role)) {
      const file = src.eleven.get(key)?.get(role);
      if (file) return `${AUDIO_BASE}${file}`;
    }
    const byRole = src.kokoro.get(key);
    // Từ đơn (chạm để nghe) chỉ có bản của coach, nên cho phép mượn clip Kokoro của vai khác.
    const file = byRole?.get(role) ?? byRole?.values().next().value;
    return file ? `${AUDIO_BASE}${file}` : null;
  }
}

export const Clips = new ClipLibrary();

type ClipEnd = 'ended' | 'stopped' | 'error';

function silentWavUrl(): string {
  const n = 800; // 0.1 s of 8 kHz 8-bit silence
  const buf = new ArrayBuffer(44 + n);
  const v = new DataView(buf);
  const str = (o: number, t: string) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
  str(36, 'data'); v.setUint32(40, n, true);
  for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

/**
 * One reused <audio> element. iOS only lets an element play later if it first played
 * inside a tap, so unlock() runs from the welcome tap. Slow mode changes playbackRate
 * with preservesPitch on, so the voice gets slower without sounding deeper.
 */
class ClipPlayer {
  private el: HTMLAudioElement | null = null;
  private done: ((r: ClipEnd) => void) | null = null;
  private unlocked = false;

  private ensure(): HTMLAudioElement | null {
    if (!this.el && typeof Audio !== 'undefined') {
      this.el = new Audio();
      this.el.preload = 'auto';
      this.el.setAttribute('playsinline', '');
    }
    return this.el;
  }

  unlock() {
    const el = this.ensure();
    if (!el || this.unlocked) return;
    this.unlocked = true;
    el.src = silentWavUrl();
    el.play().catch(() => {});
    Clips.load();
  }

  play(url: string, rate: number, onProgress?: (fraction: number) => void): Promise<ClipEnd> {
    const el = this.ensure();
    if (!el) return Promise.resolve('error');
    this.stop();
    return new Promise<ClipEnd>((resolve) => {
      this.done = (r) => {
        el.onended = null;
        el.onerror = null;
        el.ontimeupdate = null;
        this.done = null;
        resolve(r);
      };
      el.onended = () => this.done?.('ended');
      el.onerror = () => this.done?.('error');
      el.ontimeupdate = () => {
        if (el.duration > 0) onProgress?.(el.currentTime / el.duration);
      };
      const pitchKeeper = el as HTMLAudioElement & { webkitPreservesPitch?: boolean; mozPreservesPitch?: boolean };
      pitchKeeper.preservesPitch = true;
      pitchKeeper.webkitPreservesPitch = true;
      pitchKeeper.mozPreservesPitch = true;
      el.src = url;
      el.defaultPlaybackRate = rate;
      el.playbackRate = rate;
      el.play().catch(() => this.done?.('error'));
    });
  }

  stop() {
    if (this.el && this.done) {
      try {
        this.el.pause();
      } catch {
        // ignore
      }
      this.done('stopped');
    }
  }
}

export const ClipAudio = new ClipPlayer();

class SoundSystem {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  comp: DynamicsCompressorNode | null = null;
  unlocked = false;
  muted = false;

  unlock(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.comp = this.ctx.createDynamicsCompressor();
      this.comp.threshold.value = -14;
      this.comp.ratio.value = 4;
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.55;
      this.master.connect(this.comp);
      this.comp.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    // Play silent buffer for iOS unlock
    try {
      const buf = this.ctx.createBuffer(1, 1, 22050);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this.ctx.destination);
      src.start(0);
      this.unlocked = true;
      ClipAudio.unlock();
    } catch {
      // ignore
    }

    return this.ctx;
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType = 'sine',
    vol = 0.25,
    delay = 0,
    slideTo?: number
  ) {
    if (!this.unlocked || this.muted || !this.ctx || !this.master) return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + dur);
    }
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(vol, now + Math.min(0.015, dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  /** Nhiễu trắng qua bộ lọc thông dải: dùng cho tiếng vỗ tay và xì xào của khán phòng */
  private noise(dur: number, freq: number, vol: number, claps = 0) {
    if (!this.unlocked || this.muted || !this.ctx || !this.master) return;
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      // Vỗ tay: nhiều nhịp ngắn chồng nhau; xì xào: nền đều
      const grain = claps > 0 ? Math.pow(Math.abs(Math.sin(t * claps * Math.PI + Math.sin(i * 0.0007) * 3)), 6) + 0.25 : 1;
      d[i] = (Math.random() * 2 - 1) * grain * Math.sin(Math.PI * Math.min(1, t * 1.15)) ;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(bp);
    bp.connect(g);
    g.connect(this.master);
    src.start();
  }

  play(name: string) {
    if (!this.unlocked || this.muted) return;
    switch (name) {
      case 'alarm':
        this.tone(740, 0.12, 'square', 0.12, 0);
        this.tone(554, 0.12, 'square', 0.12, 0.14);
        this.tone(740, 0.12, 'square', 0.12, 0.28);
        break;
      case 'applause':
        this.noise(2.2, 2400, 0.5, 26);
        break;
      case 'clap':
        this.noise(1.0, 2200, 0.3, 10);
        break;
      case 'murmur':
        this.noise(0.9, 380, 0.22);
        break;
      case 'tap':
        this.tone(520, 0.045, 'sine', 0.18, 0, 320);
        break;
      case 'pop':
        this.tone(420, 0.065, 'triangle', 0.22, 0, 760);
        break;
      case 'page':
        this.tone(340, 0.09, 'sine', 0.14, 0, 620);
        break;
      case 'whoosh':
        this.tone(240, 0.28, 'sine', 0.16, 0, 95);
        break;
      case 'ting':
        this.tone(880, 0.22, 'sine', 0.25);
        this.tone(1320, 0.32, 'triangle', 0.18, 0.05);
        break;
      case 'correct':
        this.tone(523.25, 0.12, 'triangle', 0.24, 0);
        this.tone(659.25, 0.14, 'triangle', 0.24, 0.09);
        this.tone(783.99, 0.26, 'sine', 0.28, 0.18);
        break;
      case 'star':
        this.tone(660, 0.14, 'sine', 0.25, 0);
        this.tone(990, 0.28, 'triangle', 0.26, 0.07);
        break;
      case 'coin':
        this.tone(987.77, 0.08, 'sine', 0.22, 0);
        this.tone(1318.5, 0.26, 'sine', 0.24, 0.07);
        break;
      case 'levelUp':
        [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
          this.tone(f, 0.22, 'triangle', 0.26, idx * 0.09);
        });
        break;
      case 'error':
        this.tone(220, 0.14, 'sawtooth', 0.18, 0, 165);
        this.tone(175, 0.2, 'sawtooth', 0.18, 0.12, 130);
        break;
      case 'recStart':
        this.tone(440, 0.08, 'sine', 0.2, 0);
        this.tone(660, 0.12, 'sine', 0.22, 0.07);
        break;
      case 'recStop':
        this.tone(660, 0.08, 'sine', 0.2, 0);
        this.tone(440, 0.12, 'sine', 0.2, 0.07);
        break;
      case 'radioIn':
        this.tone(1450, 0.04, 'square', 0.09, 0);
        this.tone(1920, 0.05, 'square', 0.09, 0.045);
        break;
      case 'radioOut':
        this.tone(1680, 0.04, 'square', 0.08, 0);
        this.tone(1120, 0.05, 'square', 0.08, 0.045);
        break;
      case 'step': {
        const pitchJitter = 150 + Math.random() * 45;
        this.tone(pitchJitter, 0.04, 'triangle', 0.07, 0, 85);
        break;
      }
      case 'door':
        this.tone(310, 0.1, 'triangle', 0.2, 0, 460);
        this.tone(620, 0.18, 'sine', 0.2, 0.09);
        break;
      case 'tick':
        this.tone(800, 0.03, 'sine', 0.09);
        break;
      case 'night':
        this.tone(440, 0.35, 'sine', 0.14, 0);
        this.tone(554.37, 0.45, 'sine', 0.12, 0.15);
        break;
      case 'chat':
        this.tone(587.33, 0.09, 'sine', 0.18, 0, 740);
        break;
      case 'sleep':
      case 'nap':
        [523.25, 440, 349.23, 261.63].forEach((f, idx) => {
          this.tone(f, 0.32, 'sine', 0.15, idx * 0.18);
        });
        break;
      default:
        break;
    }
  }
}

export const SFX = new SoundSystem();

class AmbienceSystem {
  mode: 'day' | 'night' | null = null;
  running = false;
  timer: number | null = null;
  private gateTimer: number | null = null;
  // Brown-noise "distant traffic" bed. Created lazily once the AudioContext exists.
  private bed: {
    src: AudioBufferSourceNode;
    swell: GainNode;
    lfo: OscillatorNode;
    gate: GainNode;
  } | null = null;

  /** Builds the brown-noise chain: looped noise → lowpass → slow swell → gate → master. */
  private ensureBed(): boolean {
    if (this.bed) return true;
    const ctx = SFX.ctx;
    const master = SFX.master;
    if (!ctx || !master || !SFX.unlocked) return false;

    // Brown noise = integrated white noise (random walk), 6 s loop
    const len = Math.floor(ctx.sampleRate * 6);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    let peak = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last;
      peak = Math.max(peak, Math.abs(last));
    }
    if (peak > 0) {
      for (let i = 0; i < len; i++) data[i] = (data[i] / peak) * 0.9;
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    lp.Q.value = 0.7;

    // Slow LFO (0.07 Hz) swells the rumble by ±25%, like traffic passing in the distance
    const swell = ctx.createGain();
    swell.gain.value = 1;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.25;
    lfo.connect(lfoDepth);
    lfoDepth.connect(swell.gain);

    // Gate controls the audible level; it is driven by gateTick()
    const gate = ctx.createGain();
    gate.gain.value = 0;

    src.connect(lp);
    lp.connect(swell);
    swell.connect(gate);
    gate.connect(master);
    src.start();
    lfo.start();
    this.bed = { src, swell, lfo, gate };
    return true;
  }

  /** Every 200 ms: silent while muted or while the mic is open, half level while TTS speaks. */
  private gateTick() {
    if (!this.ensureBed() || !this.bed) return;
    const ctx = SFX.ctx;
    if (!ctx) return;
    const base = this.mode === 'night' ? 0.018 : 0.03;
    let target = base;
    if (!this.running || SFX.muted) target = 0;
    else if (AudioBus.state === 'arming' || AudioBus.state === 'listening') target = 0;
    else if (AudioBus.state === 'speaking') target = base * 0.5;
    this.bed.gate.gain.setTargetAtTime(target, ctx.currentTime, 0.12);
  }

  start(newMode: 'day' | 'night') {
    if (this.running && this.mode === newMode) return;
    this.mode = newMode;
    this.running = true;
    if (this.timer) window.clearInterval(this.timer);

    // Subtle procedural ambient chirps/crickets when active and not muted/recording
    this.timer = window.setInterval(() => {
      if (!this.running || SFX.muted || !SFX.unlocked || AudioBus.state !== 'idle') return;
      if (Math.random() > 0.38) return;
      if (this.mode === 'day') {
        // Gentle bird chirp
        SFX['tone'](1760 + Math.random() * 400, 0.07, 'sine', 0.025, 0, 2200);
      } else {
        // Gentle night cricket
        SFX['tone'](3200 + Math.random() * 200, 0.04, 'sine', 0.015, 0);
        SFX['tone'](3200 + Math.random() * 200, 0.04, 'sine', 0.015, 0.06);
      }
    }, 2400);

    if (this.gateTimer) window.clearInterval(this.gateTimer);
    this.gateTimer = window.setInterval(() => this.gateTick(), 200);
    this.gateTick();
  }

  stop() {
    this.running = false;
    this.mode = null;
    if (this.timer) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    if (this.gateTimer) {
      window.clearInterval(this.gateTimer);
      this.gateTimer = null;
    }
    if (this.bed && SFX.ctx) {
      this.bed.gate.gain.setTargetAtTime(0, SFX.ctx.currentTime, 0.1);
    }
  }
}

export const Ambience = new AmbienceSystem();

type StateListener = (st: AudioBusState) => void;

class HalfDuplexAudioBus {
  state: AudioBusState = 'idle';
  lastMicReleaseAt = 0;
  listeners = new Set<StateListener>();

  subscribe(fn: StateListener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private setState(next: AudioBusState) {
    if (this.state !== next) {
      this.state = next;
      this.listeners.forEach((fn) => fn(next));
    }
  }

  reset() {
    ClipAudio.stop();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.setState('idle');
  }

  canSpeak(): boolean {
    return this.state !== 'arming' && this.state !== 'listening';
  }

  async waitBeforeSpeak(): Promise<boolean> {
    if (!this.canSpeak()) return false;
    const sinceMic = Date.now() - this.lastMicReleaseAt;
    if (sinceMic < 350) {
      await new Promise((r) => setTimeout(r, 350 - sinceMic));
    }
    return this.canSpeak();
  }

  enterSpeaking() {
    if (this.canSpeak()) {
      this.setState('speaking');
    }
  }

  exitSpeaking() {
    if (this.state === 'speaking') {
      this.setState('idle');
    }
  }

  async armMic(): Promise<boolean> {
    this.setState('arming');
    ClipAudio.stop();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const startWait = Date.now();
      while (window.speechSynthesis.speaking && Date.now() - startWait < 1500) {
        await new Promise((r) => setTimeout(r, 40));
      }
    }
    // iOS session switch safety buffer (320ms)
    await new Promise((r) => setTimeout(r, 320));
    if (this.state !== 'arming') return false;
    this.setState('listening');
    return true;
  }

  releaseMic() {
    if (this.state === 'listening' || this.state === 'arming') {
      this.lastMicReleaseAt = Date.now();
    }
    this.setState('idle');
  }
}

export const AudioBus = new HalfDuplexAudioBus();

const FEMALE_NAMES = ['samantha', 'karen', 'moira', 'tessa', 'victoria', 'serena', 'ava', 'allison', 'susan', 'zoe', 'catherine', 'martha', 'nicky', 'jenny', 'aria', 'sonia', 'libby', 'natasha'];
const MALE_NAMES = ['daniel', 'alex', 'tom', 'oliver', 'arthur', 'fred', 'gordon', 'lee', 'rishi', 'aaron', 'guy', 'ryan', 'william', 'brian'];
const NOVELTY_NAMES = ['albert', 'bubbles', 'zarvox', 'bad news', 'bahh', 'bells', 'boing', 'cellos', 'deranged', 'good news', 'hysterical', 'pipe organ', 'trinoids', 'whisper', 'wobble', 'jester'];

/** Browser-voice settings for roles that are not NPCs. Pitch and rate stay neutral on purpose. */
const EXTRA_VOICES: Record<string, VoiceConfig> = {
  coach: { lang: 'en-US', gender: 'f', pitch: 1, rate: 1 },
  passer: { lang: 'en-US', gender: 'm', pitch: 1, rate: 1 },
};

const SLOW_RATE = 0.8;

export function charToViseme(ch: string): VisemeType {
  const c = (ch || '').toLowerCase();
  if ('aáàảãạăắằẳẵặâấầẩẫậ'.includes(c)) return 'a';
  if ('ouw'.includes(c)) return 'o';
  if ('eéèẻẽẹêếềểễệiy'.includes(c)) return 'e';
  if ('mbp'.includes(c)) return 'm';
  return Math.random() > 0.5 ? 'a' : 'e';
}

class VoiceEngine {
  cache = new Map<string, SpeechSynthesisVoice>();
  visemeCallbacks = new Set<(v: VisemeType, wordIndex: number) => void>();
  activeTimer: number | null = null;
  lipInterval: number | null = null;
  lastBoundaryAt = 0;

  onViseme(cb: (v: VisemeType, wordIndex: number) => void) {
    this.visemeCallbacks.add(cb);
    return () => this.visemeCallbacks.delete(cb);
  }

  private emitViseme(v: VisemeType, wordIndex = -1) {
    this.visemeCallbacks.forEach((cb) => cb(v, wordIndex));
  }

  getEnglishVoices(): SpeechSynthesisVoice[] {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
    return window.speechSynthesis
      .getVoices()
      .filter((v) => v.lang && v.lang.toLowerCase().startsWith('en'))
      .filter((v) => {
        const low = v.name.toLowerCase();
        return !NOVELTY_NAMES.some((n) => low.includes(n));
      });
  }

  scoreVoice(v: SpeechSynthesisVoice, cfg: VoiceConfig): number {
    let score = 0;
    const vLang = v.lang.replace('_', '-').toLowerCase();
    const targetLang = cfg.lang.toLowerCase();
    const lowName = v.name.toLowerCase();

    if (vLang === targetLang) score += 60;
    else if (vLang.startsWith('en')) score += 15;

    const targetList = cfg.gender === 'f' ? FEMALE_NAMES : MALE_NAMES;
    const oppList = cfg.gender === 'f' ? MALE_NAMES : FEMALE_NAMES;

    if (targetList.some((n) => lowName.includes(n))) {
      score += vLang === targetLang ? 40 : 12;
    }
    if (oppList.some((n) => lowName.includes(n))) {
      score -= 35;
    }
    if (lowName.includes('premium') || lowName.includes('enhanced') || lowName.includes('neural') || lowName.includes('natural')) {
      score += 20;
    }
    return score;
  }

  private configFor(npcId: string, speaker?: 'emma' | 'liam'): VoiceConfig {
    if (EXTRA_VOICES[npcId]) return EXTRA_VOICES[npcId];
    const npc = NPCS[npcId] || NPCS.leo;
    return npc.isCouple && speaker && npc.coupleVoices ? npc.coupleVoices[speaker] : npc.voice;
  }

  /** Fallback browser voice for a role: matched by accent and gender only. */
  forNpc(npcId: string, speaker?: 'emma' | 'liam'): { voice: SpeechSynthesisVoice | null; cfg: VoiceConfig } {
    const cfg = this.configFor(npcId, speaker);
    const voices = this.getEnglishVoices();
    if (voices.length === 0) return { voice: null, cfg };

    const cacheKey = `${cfg.lang}:${cfg.gender}`;
    if (this.cache.has(cacheKey)) {
      return { voice: this.cache.get(cacheKey)!, cfg };
    }

    let best = voices[0];
    let bestScore = -999;
    for (const v of voices) {
      const s = this.scoreVoice(v, cfg);
      if (s > bestScore) {
        bestScore = s;
        best = v;
      }
    }
    this.cache.set(cacheKey, best);
    return { voice: best, cfg };
  }

  stop() {
    if (this.activeTimer) {
      window.clearTimeout(this.activeTimer);
      this.activeTimer = null;
    }
    if (this.lipInterval) {
      window.clearInterval(this.lipInterval);
      this.lipInterval = null;
    }
    ClipAudio.stop();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.emitViseme('rest', -1);
    AudioBus.exitSpeaking();
  }

  /**
   * Speak a line. Plays the pre-rendered ElevenLabs clip when one exists; otherwise uses
   * the browser voice at natural pitch. npcId defaults to 'coach' (sample answers,
   * phrasebook, single words). preferredURI is kept for old callers and ignored.
   */
  async speak(
    text: string,
    opts: {
      npcId?: string;
      speaker?: 'emma' | 'liam';
      slow?: boolean;
      preferredURI?: string | null;
      channel?: 'inear';
      onWord?: (wordIdx: number) => void;
    } = {}
  ): Promise<void> {
    if (!text || typeof window === 'undefined') return;
    const ok = await AudioBus.waitBeforeSpeak();
    if (!ok) return;

    this.stop();

    const npcId = opts.npcId || 'coach';
    const clipUrl = await Clips.find(roleFor(npcId, opts.speaker), text);

    if (opts.channel === 'inear') {
      SFX.play('radioIn');
      await new Promise((r) => setTimeout(r, 450));
    }
    if (!AudioBus.canSpeak()) return;

    AudioBus.enterSpeaking();

    const words = text.trim().split(/\s+/).filter(Boolean);
    const rateMul = opts.slow ? SLOW_RATE : 1;

    return new Promise<void>((resolve) => {
      let finished = false;
      let currentWordIdx = 0;
      let safetyTimer: number | null = null;
      let lipTimer: number | null = null;

      const finish = () => {
        if (finished) return;
        finished = true;
        // Clear only this call's timers: a newer speak() may already own this.activeTimer.
        if (safetyTimer) window.clearTimeout(safetyTimer);
        if (lipTimer) window.clearInterval(lipTimer);
        if (this.activeTimer === safetyTimer) this.activeTimer = null;
        if (this.lipInterval === lipTimer) this.lipInterval = null;
        this.emitViseme('rest', -1);
        AudioBus.exitSpeaking();
        if (opts.channel === 'inear') {
          SFX.play('radioOut');
        }
        resolve();
      };

      const setWord = (idx: number) => {
        currentWordIdx = clamp(idx, 0, Math.max(0, words.length - 1));
        this.lastBoundaryAt = Date.now();
        opts.onWord?.(currentWordIdx);
      };

      // Lip-sync loop every 105ms
      lipTimer = this.lipInterval = window.setInterval(() => {
        if (finished) return;
        const now = Date.now();
        if (now - this.lastBoundaryAt < 300 && words[currentWordIdx]) {
          const w = words[currentWordIdx];
          const ch = w[Math.floor(Math.random() * w.length)] || 'a';
          this.emitViseme(charToViseme(ch), currentWordIdx);
        } else {
          const pool: VisemeType[] = ['a', 'e', 'o', 'm'];
          const v = pool[Math.floor(Math.random() * pool.length)];
          this.emitViseme(v, currentWordIdx);
        }
      }, 105);

      const armSafety = (ms: number) => {
        if (safetyTimer) window.clearTimeout(safetyTimer);
        safetyTimer = this.activeTimer = window.setTimeout(finish, ms);
      };

      const speakWithBrowser = () => {
        if (finished) return;
        const { voice, cfg } = this.forNpc(npcId, opts.speaker);
        const rate = clamp(rateMul, 0.5, 1.6);
        armSafety(2500 + (words.length * 650) / rate);

        const hasSpeechSynthesis: boolean = 'speechSynthesis' in window;
        if (!hasSpeechSynthesis) {
          window.setTimeout(finish, 1500);
          return;
        }
        try {
          const utter = new SpeechSynthesisUtterance(text);
          if (voice) utter.voice = voice;
          utter.lang = cfg.lang;
          utter.rate = rate;
          utter.pitch = 1;
          utter.onboundary = (ev) => {
            if (typeof ev.charIndex === 'number') {
              const prefix = text.slice(0, ev.charIndex);
              setWord(prefix.trim() ? prefix.trim().split(/\s+/).length : 0);
              this.emitViseme(charToViseme((words[currentWordIdx] || 'a')[0]), currentWordIdx);
            }
          };
          utter.onend = finish;
          utter.onerror = finish;
          window.speechSynthesis.speak(utter);
        } catch {
          finish();
        }
      };

      if (!clipUrl) {
        speakWithBrowser();
        return;
      }

      armSafety(4000 + (words.length * 900) / rateMul);
      ClipAudio.play(clipUrl, rateMul, (fraction) => {
        const idx = Math.floor(fraction * words.length);
        if (idx !== currentWordIdx) setWord(idx);
        else this.lastBoundaryAt = Date.now();
      }).then((end) => {
        if (end === 'error') speakWithBrowser();
        else finish();
      });
    });
  }
}

export const Voice = new VoiceEngine();

export interface ListenResult {
  transcript: string;
  alternatives: string[];
  reason: 'silence' | 'no-speech' | 'max-time' | 'manual' | 'error' | 'aborted';
  error?: string;
}

export function mergeChunks(chunks: string[]): string {
  const cleaned = chunks.map((c) => c.trim()).filter(Boolean);
  if (cleaned.length === 0) return '';
  const out: string[] = [];
  for (const chunk of cleaned) {
    const low = chunk.toLowerCase();
    if (out.length === 0) {
      out.push(chunk);
      continue;
    }
    const prev = out[out.length - 1];
    const prevLow = prev.toLowerCase();
    if (low.includes(prevLow)) {
      out[out.length - 1] = chunk;
    } else if (prevLow.includes(low)) {
      // already contained
    } else {
      out.push(chunk);
    }
  }
  return out.join(' ').replace(/\s+/g, ' ').trim();
}

class SpeechRecognitionEngine {
  activeRec: any = null;
  stopFn: (() => void) | null = null;
  abortFn: (() => void) | null = null;
  energyPulseCallbacks = new Set<(level: number) => void>();

  onPulse(cb: (level: number) => void) {
    this.energyPulseCallbacks.add(cb);
    return () => this.energyPulseCallbacks.delete(cb);
  }

  private pulse(level: number) {
    this.energyPulseCallbacks.forEach((cb) => cb(level));
  }

  isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean(
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    );
  }

  stop() {
    this.stopFn?.();
  }

  abort() {
    this.abortFn?.();
  }

  async listen(opts: { weakMode?: boolean; onInterim?: (text: string) => void } = {}): Promise<ListenResult> {
    const armed = await AudioBus.armMic();
    if (!armed) {
      return { transcript: '', alternatives: [], reason: 'aborted' };
    }

    const SpeechRec =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRec) {
      AudioBus.releaseMic();
      return {
        transcript: '',
        alternatives: [],
        reason: 'error',
        error: 'unsupported',
      };
    }

    const silenceMs = opts.weakMode ? 1100 : 1800;
    const noSpeechMs = opts.weakMode ? 5000 : 7000;
    const maxTotalMs = opts.weakMode ? 6000 : 20000;

    return new Promise<ListenResult>((resolve) => {
      let done = false;
      let started = false;
      let heardSpeech = false;
      const finalChunks: string[] = [];
      let interimText = '';
      const altSet = new Set<string>();

      let startTimer: number | null = null;
      let noSpeechTimer: number | null = null;
      let silenceTimer: number | null = null;
      let maxTimer: number | null = null;

      const clearTimers = () => {
        if (startTimer) window.clearTimeout(startTimer);
        if (noSpeechTimer) window.clearTimeout(noSpeechTimer);
        if (silenceTimer) window.clearTimeout(silenceTimer);
        if (maxTimer) window.clearTimeout(maxTimer);
      };

      const finish = (reason: ListenResult['reason'], error?: string) => {
        if (done) return;
        done = true;
        clearTimers();
        this.stopFn = null;
        this.abortFn = null;
        try {
          rec.onend = null;
          rec.onerror = null;
          rec.onresult = null;
          rec.abort();
        } catch {
          // ignore
        }
        AudioBus.releaseMic();
        const combined = mergeChunks([...finalChunks, interimText]);
        if (combined) altSet.add(combined);
        resolve({
          transcript: combined,
          alternatives: Array.from(altSet).slice(0, 3),
          reason,
          error,
        });
      };

      const rec = new SpeechRec();
      this.activeRec = rec;
      rec.lang = 'en-US';
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 3;

      this.stopFn = () => {
        if (done) return;
        SFX.play('recStop');
        try {
          rec.stop();
        } catch {
          finish('manual');
        }
        window.setTimeout(() => finish('manual'), 1500);
      };

      this.abortFn = () => {
        if (done) return;
        finalChunks.length = 0;
        interimText = '';
        finish('aborted');
      };

      startTimer = window.setTimeout(() => {
        if (!started) finish('error', 'start-timeout');
      }, 5000);

      rec.onstart = () => {
        started = true;
        if (startTimer) window.clearTimeout(startTimer);
        SFX.play('recStart');
        noSpeechTimer = window.setTimeout(() => {
          if (!heardSpeech) finish('no-speech');
        }, noSpeechMs);
        maxTimer = window.setTimeout(() => {
          finish('max-time');
        }, maxTotalMs);
      };

      rec.onresult = (event: any) => {
        heardSpeech = true;
        if (noSpeechTimer) window.clearTimeout(noSpeechTimer);
        if (silenceTimer) window.clearTimeout(silenceTimer);

        this.pulse(0.65 + Math.random() * 0.35);

        interimText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const primary = res[0]?.transcript || '';
          if (res.isFinal) {
            finalChunks.push(primary);
            for (let a = 1; a < res.length; a++) {
              if (res[a]?.transcript) {
                altSet.add(mergeChunks([...finalChunks.slice(0, -1), res[a].transcript]));
              }
            }
          } else {
            interimText += primary + ' ';
          }
        }

        const currentPreview = mergeChunks([...finalChunks, interimText]);
        opts.onInterim?.(currentPreview);

        silenceTimer = window.setTimeout(() => {
          SFX.play('recStop');
          finish('silence');
        }, silenceMs);
      };

      rec.onerror = (ev: any) => {
        const err = ev?.error || 'unknown';
        if (err === 'no-speech') {
          finish('no-speech');
        } else {
          finish('error', err);
        }
      };

      rec.onend = () => {
        finish('manual');
      };

      try {
        rec.start();
      } catch (e: any) {
        finish('error', e?.message || 'start-failed');
      }
    });
  }
}

export const SpeechEngine = new SpeechRecognitionEngine();
