/**
 * Dựng bảng từ cho tính năng "chạm từ để ghi chú": phiên âm IPA và nghĩa tiếng Việt
 * của mọi từ tiếng Anh có trong nội dung game. Kết quả: src/data/glossary.json.
 *
 *   npm i --no-save cmu-pronouncing-dictionary   # chỉ cần khi dựng lại bảng từ
 *   npm run glossary
 *
 * - IPA lấy từ CMU Pronouncing Dictionary (giọng Mỹ), đổi ARPABET sang IPA.
 * - Nghĩa tiếng Việt soạn tay trong tools/glossary/vi-*.txt (dạng `từ=nghĩa; từ=nghĩa`).
 *   Từ biến đổi (guests, welcomed) tra theo dạng gốc lúc chạy, nên chỉ cần soạn dạng gốc.
 * Thêm nội dung mới thì chạy lại lệnh; lệnh in ra các từ hay gặp còn thiếu nghĩa.
 */
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const V = {
  AA: 'ɑː', AE: 'æ', AO: 'ɔː', AW: 'aʊ', AY: 'aɪ', EH: 'e', EY: 'eɪ', IH: 'ɪ', IY: 'iː',
  OW: 'oʊ', OY: 'ɔɪ', UH: 'ʊ', UW: 'uː',
};
const C = {
  B: 'b', CH: 'tʃ', D: 'd', DH: 'ð', F: 'f', G: 'ɡ', HH: 'h', JH: 'dʒ', K: 'k', L: 'l', M: 'm',
  N: 'n', NG: 'ŋ', P: 'p', R: 'r', S: 's', SH: 'ʃ', T: 't', TH: 'θ', V: 'v', W: 'w', Y: 'j', Z: 'z', ZH: 'ʒ',
};
// Tổ hợp phụ âm đầu âm tiết hợp lệ trong tiếng Anh, để đặt dấu trọng âm đúng chỗ
const ONSETS = new Set(
  ('P B T D K G F V TH DH S Z SH ZH HH M N L R W Y CH JH ' +
    'P_L P_R B_L B_R T_R D_R K_L K_R G_L G_R F_L F_R TH_R SH_R S_P S_T S_K S_M S_N S_L S_W ' +
    'T_W D_W K_W G_W P_Y B_Y K_Y F_Y M_Y HH_Y V_Y S_P_L S_P_R S_T_R S_K_R S_K_W').split(' ')
);

export function arpaToIpa(arpa) {
  const ph = arpa.split(' ').map((p) => {
    const m = /^([A-Z]+)([012])?$/.exec(p);
    return { base: m[1], stress: m[2] };
  });
  const vowels = ph.filter((p) => p.stress !== undefined).length;
  const sym = ph.map((p, i) => {
    if (p.stress === undefined) return C[p.base];
    if (p.base === 'AH') return p.stress === '0' ? 'ə' : 'ʌ';
    if (p.base === 'ER') return p.stress === '0' ? 'ər' : 'ɜːr';
    if (p.base === 'IY' && p.stress === '0' && i === ph.length - 1) return 'i';
    return V[p.base];
  });
  const main = ph.findIndex((p) => p.stress === '1');
  if (main >= 0 && vowels > 1) {
    // Lùi về đầu cụm phụ âm dài nhất còn là phụ âm đầu hợp lệ
    let start = main;
    while (start > 0 && ph[start - 1].stress === undefined) {
      const onset = ph.slice(start - 1, main).map((x) => x.base).join('_');
      if (!ONSETS.has(onset)) break;
      start -= 1;
    }
    sym.splice(start, 0, 'ˈ');
  }
  return sym.join('');
}

async function main() {
  let dict;
  try {
    dict = (await import('cmu-pronouncing-dictionary')).dictionary;
  } catch {
    console.error('Thiếu gói cmu-pronouncing-dictionary. Chạy: npm i --no-save cmu-pronouncing-dictionary');
    process.exit(1);
  }

  // Gom mọi chuỗi tiếng Anh trong dữ liệu nội dung
  const entry = path.join(os.tmpdir(), `mc-gloss-entry-${process.pid}.ts`);
  const outfile = path.join(os.tmpdir(), `mc-gloss-${process.pid}.mjs`);
  const src = (f) => JSON.stringify(path.join(root, 'src', 'data', f));
  const files = ['content.ts', 'talks.ts', 'chunks.ts', 'incidents.ts', 'rhythm.ts', 'pronunciation.ts', 'scenarios/index.ts', 'events/index.ts', 'longturns.ts', 'interpret.ts', 'register.ts'];
  fs.writeFileSync(entry, files.map((f, i) => `export * as m${i} from ${src(f)};`).join('\n'));
  await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
  const mod = await import(pathToFileURL(outfile).href);
  fs.rmSync(entry, { force: true });
  fs.rmSync(outfile, { force: true });

  const viChar = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
  const freq = new Map();
  const seen = new Set();
  const walk = (v) => {
    if (typeof v === 'string') {
      if (viChar.test(v) || v.length < 2) return;
      for (const w of v.toLowerCase().replace(/[’‘]/g, "'").match(/[a-z]+(?:'[a-z]+)?/g) || []) freq.set(w, (freq.get(w) || 0) + 1);
    } else if (v && typeof v === 'object') {
      if (seen.has(v)) return;
      seen.add(v);
      Object.values(v).forEach(walk);
    }
  };
  walk(mod);

  // Nghĩa tiếng Việt soạn tay
  const vi = new Map();
  const dir = path.join(root, 'tools', 'glossary');
  for (const f of fs.readdirSync(dir).filter((f) => /^vi-.*\.txt$/.test(f)).sort()) {
    for (const item of fs.readFileSync(path.join(dir, f), 'utf8').split(/[;\n]/)) {
      const at = item.indexOf('=');
      if (at < 0) continue;
      const w = item.slice(0, at).trim().toLowerCase();
      const m = item.slice(at + 1).trim();
      if (w && m) vi.set(w, m);
    }
  }

  const glossary = {};
  for (const w of new Set([...freq.keys(), ...vi.keys()])) {
    const arpa = dict[w];
    if (!arpa && !vi.has(w)) continue;
    glossary[w] = [arpa ? arpaToIpa(arpa) : '', vi.get(w) || ''];
  }
  const sorted = Object.fromEntries(Object.entries(glossary).sort(([a], [b]) => (a < b ? -1 : 1)));
  fs.writeFileSync(path.join(root, 'src', 'data', 'glossary.json'), JSON.stringify(sorted) + '\n');

  // Thống kê độ phủ theo số lần xuất hiện
  const { lookupGloss } = await (async () => {
    const o = path.join(os.tmpdir(), `mc-notes-${process.pid}.mjs`);
    await build({ entryPoints: [path.join(root, 'src/core/notes.ts')], bundle: true, format: 'esm', platform: 'node', outfile: o, logLevel: 'silent' });
    const m = await import(pathToFileURL(o).href);
    fs.rmSync(o, { force: true });
    return m;
  })();
  let total = 0, withVi = 0, withIpa = 0;
  const missing = [];
  for (const [w, n] of freq) {
    total += n;
    const g = lookupGloss(sorted, w);
    if (g.vi) withVi += n;
    else if (n >= 3 && dict[w]) missing.push(`${w}(${n})`);
    if (g.ipa) withIpa += n;
  }
  console.log(`Từ khác nhau trong nội dung: ${freq.size}; mục trong bảng: ${Object.keys(sorted).length}`);
  console.log(`Độ phủ theo lượt xuất hiện: nghĩa ${(100 * withVi / total).toFixed(1)}%, IPA ${(100 * withIpa / total).toFixed(1)}%`);
  console.log(`Từ gặp từ 3 lần còn thiếu nghĩa (${missing.length}): ${missing.slice(0, 200).join(' ')}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
