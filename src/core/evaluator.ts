import { EvalResult, EvaluatedToken, TurnData } from '../types/game';
import { clamp } from './clock';

const HOMOPHONE_GROUPS: string[][] = [
  ['to', 'too', 'two'],
  ['for', 'four'],
  ['here', 'hear'],
  ['there', 'their', 'theyre'],
  ['your', 'youre'],
  ['its', 'it'],
  ['right', 'write', 'rite'],
  ['aisle', 'isle'],
  ['knew', 'new'],
  ['one', 'won'],
  ['sea', 'see'],
  ['sun', 'son'],
  ['hour', 'our'],
  ['peace', 'piece'],
  ['break', 'brake'],
  ['complement', 'compliment'],
  ['flower', 'flour'],
  ['night', 'knight'],
  ['wait', 'weight'],
  ['wear', 'where'],
  ['whole', 'hole'],
  ['meet', 'meat'],
  ['leo', 'lio'],
  ['emma', 'ema'],
  ['liam', 'leam'],
  ['thien', 'tian', 'tien'],
];

const HOMOPHONE_MAP = new Map<string, number>();
HOMOPHONE_GROUPS.forEach((group, idx) => {
  group.forEach((w) => HOMOPHONE_MAP.set(w, idx));
});

const ONES = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
];

const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

const ORDINALS: Record<string, string> = {
  '1st': 'first',
  '2nd': 'second',
  '3rd': 'third',
  '4th': 'fourth',
  '5th': 'fifth',
  '6th': 'sixth',
  '7th': 'seventh',
  '8th': 'eighth',
  '9th': 'ninth',
  '10th': 'tenth',
};

const ABBREVIATIONS: Record<string, string> = {
  mr: 'mister',
  mrs: 'missus',
  ms: 'miss',
  dr: 'doctor',
  st: 'saint',
  gonna: 'going to',
  wanna: 'want to',
  gotta: 'got to',
  kinda: 'kind of',
  mike: 'mic',
  ok: 'okay',
  cos: 'because',
  cuz: 'because',
};

export const FUNCTION_WORDS = new Set([
  'the',
  'and',
  'for',
  'are',
  'but',
  'not',
  'you',
  'all',
  'any',
  'can',
  'had',
  'her',
  'was',
  'one',
  'our',
  'out',
  'day',
  'get',
  'has',
  'him',
  'his',
  'how',
  'man',
  'new',
  'now',
  'old',
  'see',
  'two',
  'way',
  'who',
  'boy',
  'did',
  'its',
  'let',
  'put',
  'say',
  'she',
  'too',
  'use',
  'with',
  'that',
  'this',
  'from',
  'have',
  'will',
  'your',
]);

export function numberToWords(n: number): string {
  if (n < 0 || !Number.isFinite(n)) return String(n);
  if (n < 20) return ONES[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const r = n % 10;
    return r === 0 ? TENS[t] : `${TENS[t]} ${ONES[r]}`;
  }
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const r = n % 100;
    return r === 0 ? `${ONES[h]} hundred` : `${ONES[h]} hundred ${numberToWords(r)}`;
  }
  if (n <= 9999) {
    const th = Math.floor(n / 1000);
    const r = n % 1000;
    return r === 0 ? `${numberToWords(th)} thousand` : `${numberToWords(th)} thousand ${numberToWords(r)}`;
  }
  return String(n);
}

export function normalizeText(input: string): string[] {
  let s = (input || '').toLowerCase().trim();
  s = s.replace(/&/g, ' and ').replace(/%/g, ' percent ');

  // Currency: $4.50 -> 4 50, $9 -> 9 dollars
  s = s.replace(/\$(\d+)\.(\d+)/g, (_, d, c) => ` ${d} ${c} `);
  s = s.replace(/\$(\d+)/g, (_, d) => ` ${d} dollars `);

  // Time: 7:00 -> 7 oclock, 7:30 -> 7 30
  s = s.replace(/\b(\d{1,2}):00\b/g, (_, h) => ` ${h} oclock `);
  s = s.replace(/\b(\d{1,2}):(\d{2})\b/g, (_, h, m) => ` ${h} ${m} `);

  // Contractions
  s = s
    .replace(/[’‘]/g, "'")
    .replace(/\bi'm\b/g, 'i am')
    .replace(/\byou're\b/g, 'you are')
    .replace(/\bwe're\b/g, 'we are')
    .replace(/\bthey're\b/g, 'they are')
    .replace(/\bhe's\b/g, 'he is')
    .replace(/\bshe's\b/g, 'she is')
    .replace(/\bit's\b/g, 'it is')
    .replace(/\bthat's\b/g, 'that is')
    .replace(/\bthere's\b/g, 'there is')
    .replace(/\bwhat's\b/g, 'what is')
    .replace(/\blet's\b/g, 'let us')
    .replace(/\bi'll\b/g, 'i will')
    .replace(/\byou'll\b/g, 'you will')
    .replace(/\bwe'll\b/g, 'we will')
    .replace(/\bi've\b/g, 'i have')
    .replace(/\byou've\b/g, 'you have')
    .replace(/\bwe've\b/g, 'we have')
    .replace(/\bi'd\b/g, 'i would')
    .replace(/\byou'd\b/g, 'you would')
    .replace(/\bwon't\b/g, 'will not')
    .replace(/\bcan't\b/g, 'cannot')
    .replace(/\bcannot\b/g, 'can not')
    .replace(/n't\b/g, ' not')
    .replace(/'s\b/g, '');

  // Strip non-alphanumeric
  s = s.replace(/[^a-z0-9\s]/g, ' ');

  const rawTokens = s.split(/\s+/).filter(Boolean);
  const out: string[] = [];

  for (const tok of rawTokens) {
    if (ORDINALS[tok]) {
      out.push(ORDINALS[tok]);
      continue;
    }
    if (/^\d+$/.test(tok)) {
      const n = parseInt(tok, 10);
      if (n <= 9999) {
        out.push(...numberToWords(n).split(/\s+/));
        continue;
      }
    }
    if (ABBREVIATIONS[tok]) {
      out.push(...ABBREVIATIONS[tok].split(/\s+/));
      continue;
    }
    out.push(tok);
  }

  return out;
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[a.length][b.length];
}

export function soundex(word: string): string {
  const s = word.toUpperCase().replace(/[^A-Z]/g, '');
  if (!s) return '';
  const first = s[0];
  const map: Record<string, string> = {
    B: '1', F: '1', P: '1', V: '1',
    C: '2', G: '2', J: '2', K: '2', Q: '2', S: '2', X: '2', Z: '2',
    D: '3', T: '3',
    L: '4',
    M: '5', N: '5',
    R: '6',
  };
  let out = first;
  let prev = map[first] || '0';
  for (let i = 1; i < s.length && out.length < 4; i++) {
    const code = map[s[i]] || '0';
    if (code !== '0' && code !== prev) {
      out += code;
    }
    prev = code;
  }
  return out.padEnd(4, '0');
}

export function metaphone(word: string): string {
  let s = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!s) return '';
  s = s
    .replace(/^kn|^gn|^pn|^ae|^wr/, (m) => m[1])
    .replace(/^x/, 's')
    .replace(/^wh/, 'w')
    .replace(/mb$/, 'm')
    .replace(/ph/g, 'f')
    .replace(/sh|ch|ti(?=[ao])/g, 'x')
    .replace(/th/g, '0')
    .replace(/dg(?=[eiy])/g, 'j')
    .replace(/c(?=[eiy])/g, 's')
    .replace(/ck|c|q/g, 'k')
    .replace(/gh(?![aeiou])/g, '')
    .replace(/g(?=[eiy])/g, 'j');

  const first = s[0];
  const rest = s.slice(1).replace(/[aeiouyhw]/g, '');
  return (first + rest).replace(/(.)\1+/g, '$1').slice(0, 6);
}

export function wordSim(a: string, b: string): { sim: number; phonetic: boolean } {
  if (!a || !b) return { sim: 0, phonetic: false };
  if (a === b) return { sim: 1, phonetic: false };

  const gA = HOMOPHONE_MAP.get(a);
  const gB = HOMOPHONE_MAP.get(b);
  if (gA !== undefined && gA === gB) {
    return { sim: 0.95, phonetic: true };
  }

  const maxLen = Math.max(a.length, b.length);
  const lev = 1 - levenshtein(a, b) / maxLen;
  let sim = lev;
  let phonetic = false;

  if (a.length >= 2 && b.length >= 2 && metaphone(a) === metaphone(b)) {
    sim = Math.max(sim, 0.9);
    phonetic = true;
  } else if (a.length >= 4 && b.length >= 4 && soundex(a) === soundex(b)) {
    sim = Math.max(sim, 0.7 + 0.25 * lev);
    phonetic = true;
  }

  return { sim: clamp(sim, 0, 1), phonetic };
}

interface AlignCell {
  cost: number;
  prevI: number;
  prevJ: number;
  matchedSim: number;
  phonetic: boolean;
}

export function alignTokens(
  targetTokens: string[],
  spokenTokens: string[]
): { sims: { sim: number; phonetic: boolean }[]; extraWords: number } {
  const n = targetTokens.length;
  const m = spokenTokens.length;

  if (n === 0) return { sims: [], extraWords: m };
  if (m === 0) {
    return {
      sims: targetTokens.map(() => ({ sim: 0, phonetic: false })),
      extraWords: 0,
    };
  }

  const dp: AlignCell[][] = Array.from({ length: n + 1 }, () =>
    Array.from({ length: m + 1 }, () => ({
      cost: Infinity,
      prevI: -1,
      prevJ: -1,
      matchedSim: 0,
      phonetic: false,
    }))
  );

  dp[0][0].cost = 0;
  for (let i = 1; i <= n; i++) {
    dp[i][0] = { cost: i * 1.0, prevI: i - 1, prevJ: 0, matchedSim: 0, phonetic: false };
  }
  for (let j = 1; j <= m; j++) {
    dp[0][j] = { cost: j * 0.6, prevI: 0, prevJ: j - 1, matchedSim: 0, phonetic: false };
  }

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      // 1. Delete target token (missed word): cost + 1.0
      const delCost = dp[i - 1][j].cost + 1.0;
      if (delCost < dp[i][j].cost) {
        dp[i][j] = { cost: delCost, prevI: i - 1, prevJ: j, matchedSim: 0, phonetic: false };
      }

      // 2. Insert spoken token (extra word): cost + 0.6
      const insCost = dp[i][j - 1].cost + 0.6;
      if (insCost < dp[i][j].cost) {
        dp[i][j] = { cost: insCost, prevI: i, prevJ: j - 1, matchedSim: 0, phonetic: false };
      }

      // 3. Substitute 1-to-1: cost + (1 - sim)
      const { sim, phonetic } = wordSim(targetTokens[i - 1], spokenTokens[j - 1]);
      const subCost = dp[i - 1][j - 1].cost + (1 - sim);
      if (subCost <= dp[i][j].cost) {
        dp[i][j] = { cost: subCost, prevI: i - 1, prevJ: j - 1, matchedSim: sim, phonetic };
      }

      // 4. Merge 2 target tokens -> 1 spoken token ("count down" <-> "countdown")
      if (i >= 2) {
        const mergedTarget = targetTokens[i - 2] + targetTokens[i - 1];
        const mSim = wordSim(mergedTarget, spokenTokens[j - 1]);
        if (mSim.sim >= 0.85) {
          const mergeCost = dp[i - 2][j - 1].cost + 2 * (1 - mSim.sim) + 0.05;
          if (mergeCost < dp[i][j].cost) {
            dp[i][j] = {
              cost: mergeCost,
              prevI: i - 2,
              prevJ: j - 1,
              matchedSim: mSim.sim,
              phonetic: mSim.phonetic,
            };
          }
        }
      }

      // 5. Split 1 target token -> 2 spoken tokens
      if (j >= 2) {
        const mergedSpoken = spokenTokens[j - 2] + spokenTokens[j - 1];
        const sSim = wordSim(targetTokens[i - 1], mergedSpoken);
        if (sSim.sim >= 0.85) {
          const splitCost = dp[i - 1][j - 2].cost + (1 - sSim.sim) + 0.15;
          if (splitCost < dp[i][j].cost) {
            dp[i][j] = {
              cost: splitCost,
              prevI: i - 1,
              prevJ: j - 2,
              matchedSim: sSim.sim,
              phonetic: sSim.phonetic,
            };
          }
        }
      }
    }
  }

  // Backtrack
  const sims: { sim: number; phonetic: boolean }[] = new Array(n).fill({ sim: 0, phonetic: false });
  let extraWords = 0;
  let ci = n;
  let cj = m;

  while (ci > 0 || cj > 0) {
    const cell = dp[ci][cj];
    const di = ci - cell.prevI;
    const dj = cj - cell.prevJ;

    if (di === 1 && dj >= 1) {
      sims[ci - 1] = { sim: cell.matchedSim, phonetic: cell.phonetic };
    } else if (di === 2 && dj === 1) {
      sims[ci - 1] = { sim: cell.matchedSim, phonetic: cell.phonetic };
      sims[ci - 2] = { sim: cell.matchedSim, phonetic: cell.phonetic };
    } else if (di === 0 && dj === 1) {
      extraWords++;
    }
    ci = cell.prevI;
    cj = cell.prevJ;
  }

  return { sims, extraWords };
}

function scoreToStars(score: number): 0 | 1 | 2 | 3 {
  if (score >= 90) return 3;
  if (score >= 75) return 2;
  if (score >= 55) return 1;
  return 0;
}

export function evaluateScripted(cueText: string, transcript: string): EvalResult {
  const rawDisplayWords = cueText.trim().split(/\s+/).filter(Boolean);
  const spokenTokens = normalizeText(transcript);

  const tokenGroups = rawDisplayWords.map((w) => {
    const norm = normalizeText(w);
    return { display: w, norm: norm.length ? norm : [w.toLowerCase().replace(/[^a-z0-9]/g, '')] };
  });

  const flatTarget: string[] = [];
  const wordToFlatIndices: number[][] = [];
  tokenGroups.forEach((g) => {
    const indices: number[] = [];
    g.norm.forEach((t) => {
      if (t) {
        indices.push(flatTarget.length);
        flatTarget.push(t);
      }
    });
    wordToFlatIndices.push(indices);
  });

  if (spokenTokens.length === 0 || flatTarget.length === 0) {
    return {
      score: 0,
      stars: 0,
      transcript,
      tokens: rawDisplayWords.map((w) => ({
        word: w,
        clean: w.toLowerCase().replace(/[^a-z]/g, ''),
        sim: 0,
        status: 'bad',
      })),
    };
  }

  const { sims, extraWords } = alignTokens(flatTarget, spokenTokens);
  const avgSim = sims.reduce((acc, s) => acc + s.sim, 0) / sims.length;
  const penalty = Math.min(12, 2 * extraWords);
  const score = clamp(Math.round(avgSim * 100 - penalty), 0, 100);

  const evaluatedTokens: EvaluatedToken[] = rawDisplayWords.map((w, idx) => {
    const indices = wordToFlatIndices[idx];
    const clean = w.toLowerCase().replace(/[^a-z]/g, '');
    if (!indices.length) {
      return { word: w, clean, sim: 1, status: 'ok' };
    }
    const subSims = indices.map((i) => sims[i]);
    const wSim = subSims.reduce((a, b) => a + b.sim, 0) / subSims.length;
    const phonetic = subSims.some((s) => s.phonetic);
    const status = wSim >= 0.85 || phonetic ? 'ok' : wSim >= 0.65 ? 'near' : 'bad';
    return { word: w, clean, sim: wSim, status, phonetic };
  });

  return {
    score,
    stars: scoreToStars(score),
    transcript,
    tokens: evaluatedTokens,
  };
}

export function evaluateSemi(turn: TurnData, transcript: string): EvalResult {
  const frame = turn.frame || '';
  const frameWithoutBlanks = frame.replace(/___/g, '').replace(/\s+/g, ' ').trim();
  const baseEval = evaluateScripted(frameWithoutBlanks, transcript);
  const spokenTokens = normalizeText(transcript);

  const pool = turn.blankPool || [];
  const blanksTotal = pool.length || turn.blanks || 1;
  let blanksFilled = 0;

  for (const group of pool) {
    const hit = group.some((candidate) => {
      const candTokens = normalizeText(candidate);
      if (candTokens.length === 1) {
        return spokenTokens.some((st) => wordSim(candTokens[0], st).sim >= 0.8);
      }
      return containsTokenSequence(spokenTokens, candTokens);
    });
    if (hit) blanksFilled++;
  }

  const fillRatio = blanksTotal > 0 ? blanksFilled / blanksTotal : 1;
  const score =
    spokenTokens.length === 0
      ? 0
      : clamp(Math.round(baseEval.score * 0.6 + fillRatio * 100 * 0.4), 0, 100);

  let stars = scoreToStars(score);
  if (blanksFilled === 0) {
    stars = Math.min(stars, 1) as 0 | 1 | 2 | 3;
  } else if (blanksFilled < blanksTotal) {
    stars = Math.min(stars, 2) as 0 | 1 | 2 | 3;
  }

  return {
    ...baseEval,
    score,
    stars,
    blanksFilled,
    blanksTotal,
  };
}

function kwMatch(keywordVariant: string, spokenTokens: string[]): boolean {
  const kwTokens = normalizeText(keywordVariant);
  if (kwTokens.length === 0) return false;

  if (kwTokens.length === 1) {
    const target = kwTokens[0];
    return spokenTokens.some((st) => {
      if (target.length < 4) return st === target;
      const maxLen = Math.max(target.length, st.length);
      const lev = 1 - levenshtein(target, st) / maxLen;
      if (lev >= 0.8) return true;
      if (lev >= 0.6 && metaphone(target) === metaphone(st)) return true;
      return false;
    });
  }

  // Multi-word keyword phrase: must match whole consecutive tokens
  return containsTokenSequence(spokenTokens, kwTokens);
}

/** True when `needle` appears as a run of consecutive whole tokens in `haystack`. */
export function containsTokenSequence(haystack: string[], needle: string[]): boolean {
  if (needle.length === 0 || needle.length > haystack.length) return false;
  for (let i = 0; i + needle.length <= haystack.length; i++) {
    let ok = true;
    for (let k = 0; k < needle.length; k++) {
      if (haystack[i + k] !== needle[k]) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

export function evaluateFreeform(turn: TurnData, transcript: string): EvalResult {
  const spokenTokens = normalizeText(transcript);
  if (spokenTokens.length === 0) {
    return {
      score: 0,
      stars: 0,
      transcript,
      tokens: [],
      matchedKeywords: [],
      missingKeywords: (turn.requiredKeywords || []).map((g) => g[0]),
      bonusHit: [],
      forbiddenHit: [],
    };
  }

  const reqGroups = turn.requiredKeywords || [];
  const bonusGroups = turn.bonusKeywords || [];
  const forbidden = turn.forbiddenKeywords || [];
  const minWords = turn.minWords || 8;

  const matchedKeywords: string[] = [];
  const missingKeywords: string[] = [];

  for (const group of reqGroups) {
    const matched = group.find((v) => kwMatch(v, spokenTokens));
    if (matched) {
      matchedKeywords.push(group[0]);
    } else {
      missingKeywords.push(group[0]);
    }
  }

  const bonusHit: string[] = [];
  for (const group of bonusGroups) {
    const matched = group.find((v) => kwMatch(v, spokenTokens));
    if (matched) bonusHit.push(group[0]);
  }

  const forbiddenHit: string[] = [];
  for (const word of forbidden) {
    if (kwMatch(word, spokenTokens)) {
      forbiddenHit.push(word);
    }
  }

  const reqRatio = reqGroups.length > 0 ? matchedKeywords.length / reqGroups.length : 1;
  const bonusTarget = Math.max(1, Math.min(3, bonusGroups.length));
  const bonusRatio = bonusGroups.length > 0 ? Math.min(1, bonusHit.length / bonusTarget) : 1;
  const lenRatio = Math.min(1, spokenTokens.length / minWords);

  const rawScore =
    70 * reqRatio + 20 * bonusRatio + 10 * lenRatio - 25 * forbiddenHit.length;
  const score = clamp(Math.round(rawScore), 0, 100);

  let stars: 0 | 1 | 2 | 3 = 0;
  const longEnough = spokenTokens.length >= minWords;

  if (reqRatio >= 1) {
    if (bonusHit.length >= Math.min(2, bonusGroups.length) && longEnough) {
      stars = 3;
    } else {
      stars = 2;
    }
  } else if (reqRatio >= 0.5 && longEnough) {
    stars = 1;
  }

  if (forbiddenHit.length > 0) {
    stars = Math.min(stars, 1) as 0 | 1 | 2 | 3;
  }

  const displayTokens: EvaluatedToken[] = transcript
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => ({
      word: w,
      clean: w.toLowerCase().replace(/[^a-z]/g, ''),
      sim: 1,
      status: 'ok',
    }));

  return {
    score,
    stars,
    transcript,
    tokens: displayTokens,
    matchedKeywords,
    missingKeywords,
    bonusHit,
    forbiddenHit,
  };
}

export function evaluateTurnCandidates(turn: TurnData, candidates: string[]): EvalResult {
  const list = candidates.filter((c) => c && c.trim().length > 0);
  if (list.length === 0) {
    list.push('');
  }

  let best: EvalResult | null = null;
  for (const cand of list) {
    let res: EvalResult;
    if (turn.mode === 'semi') {
      res = evaluateSemi(turn, cand);
    } else if (turn.mode === 'free') {
      res = evaluateFreeform(turn, cand);
    } else {
      res = evaluateScripted(turn.cue || '', cand);
    }

    if (!best || res.score > best.score || (res.score === best.score && res.stars > best.stars)) {
      best = res;
    }
  }

  return best!;
}
