// Kiểm thử sổ từ tự chọn (src/core/notes.ts) và bảng từ (src/data/glossary.json). Chạy: npm run test:notes
import { build } from 'esbuild';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { arpaToIpa } from '../tools/build-glossary.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outfile = path.join(os.tmpdir(), `mc-notes-test-${process.pid}.mjs`);
await build({ entryPoints: [path.join(root, 'src/core/notes.ts')], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
const N = await import(pathToFileURL(outfile).href);
const glossary = JSON.parse(readFileSync(path.join(root, 'src/data/glossary.json'), 'utf8'));

// Tách câu và ghép cụm
const sentence = 'Please join me in welcoming our CEO, Elena Park!';
const toks = N.splitWords(sentence);
assert.equal(toks.length, 9);
assert.equal(toks[6].word, 'CEO');
assert.equal(N.phraseOf(toks, 1, 4), 'join me in welcoming');
assert.equal(N.phraseOf(toks, 8, 6), 'CEO, Elena Park', 'kéo ngược vẫn ra cụm, giữ dấu câu ở giữa, bỏ ở hai đầu');
assert.equal(N.noteKey('  Welcoming, '), 'welcoming');
assert.equal(N.noteKey("Don’t worry!"), "don't worry");
assert.equal(N.cleanWord('“Aura'), 'Aura');

// Thêm, gộp nhãn, bỏ nhãn
let book = {};
book = N.upsertNote(book, { text: 'welcoming', vocab: true, ctx: sentence, ctxVi: 'x', npcId: 'maya' }, 100, 5);
assert.deepEqual(Object.keys(book), ['welcoming']);
assert.equal(book.welcoming.box, 1);
assert.equal(book.welcoming.due, 100, 'mục mới đến hạn ngay');
book = N.upsertNote(book, { text: 'Welcoming', vocab: true, pron: true, ctx: 'other' }, 101, 6);
assert.equal(book.welcoming.pron, true);
assert.equal(book.welcoming.ctx, sentence, 'giữ câu gốc đầu tiên');
assert.equal(book.welcoming.day, 100);
book = N.upsertNote(book, { text: 'join me in welcoming', vocab: true, ctx: sentence }, 101, 7);
const before = book;
book = N.upsertNote(book, { text: 'welcoming', vocab: false, pron: false }, 102);
assert.ok(!('welcoming' in book), 'bỏ cả hai nhãn là xoá mục');
assert.ok('welcoming' in before, 'không sửa sổ cũ');
assert.equal(N.upsertNote(book, { text: ' ,, ', vocab: true }, 1), book, 'chuỗi không có chữ thì bỏ qua');

// Ghi chú riêng
book = N.setMemo(book, 'join me in welcoming', '  mời vỗ tay  ');
assert.equal(book['join me in welcoming'].memo, 'mời vỗ tay');
assert.equal(N.setMemo(book, 'join me in welcoming', ' ')['join me in welcoming'].memo, undefined);

// Lịch ôn: 1, 2, 4, 8, 16 ngày; sai thì về hộp 1
let n = { ...before.welcoming };
const gaps = [];
let day = 100;
for (let i = 0; i < 5; i++) {
  n = N.scheduleNote(n, true, day);
  gaps.push(n.due - day);
  day = n.due;
}
assert.deepEqual(gaps, [2, 4, 8, 16, 16]);
n = N.scheduleNote(n, false, day);
assert.equal(n.box, 1);
assert.equal(n.due, day + 1);
assert.ok(N.isNoteDue(n, day + 1) && !N.isNoteDue(n, day));

// Sắp xếp: đến hạn trước
const sorted = N.sortNotes({ a: { ...n, key: 'a', due: 50, box: 2, at: 1 }, b: { ...n, key: 'b', due: 999, box: 1, at: 2 }, c: { ...n, key: 'c', due: 10, box: 1, at: 3 } }, 100);
assert.deepEqual(sorted.map((x) => x.key), ['c', 'a', 'b']);
assert.equal(N.dueNotes({ a: { ...n, due: 50 }, b: { ...n, due: 999 } }, 100).length, 1);

// Tô từ đã ghi: từ lẻ và cả cụm
const mask = N.notedMask(toks, { please: {}, 'join me in welcoming': {} });
assert.deepEqual(mask, [true, true, true, true, true, false, false, false, false]);
assert.deepEqual(N.notedMask(N.splitWords('Welcome - to the show'), { 'welcome to': {} }), [true, false, true, false, false], 'dấu gạch đứng riêng không làm đứt cụm');

// Ôn bằng cách nói
assert.equal(N.evaluateNoteUse('applause', 'Please give her a big round of applause').ok, true);
assert.deepEqual(N.evaluateNoteUse('applause', 'applause'), { ok: false, hasNote: true, fullSentence: false });
assert.equal(N.evaluateNoteUse('applause', 'I had noodles for lunch with my cousin').hasNote, false);
assert.equal(N.evaluateNoteUse('join me in welcoming', 'Please join me in welcoming our next speaker tonight').ok, true);
assert.equal(N.evaluateNoteSay('schedule', ['shed', 'the schedule']), true);
assert.equal(N.evaluateNoteSay('schedule', ['cattle', '']), false);

// Gợi ý từ đọc sai nhiều lần
const weak = [{ key: 'venue', word: 'venue', misses: 2 }, { key: 'aisle', word: 'aisle', misses: 1 }, { key: 'toast', word: 'toast', misses: 3 }, { key: 'gala', word: 'gala', misses: 4 }];
assert.deepEqual(N.suggestFromWeak(weak, { toast: {} }, ['gala']).map((w) => w.key), ['venue']);

// Ngày thật theo múi giờ máy
assert.equal(N.realDay(Date.UTC(2026, 10, 16, 18, 0), -420), N.realDay(Date.UTC(2026, 10, 16, 17, 0), -420) , 'cùng ngày 17/11 giờ Việt Nam');
assert.equal(N.realDay(Date.UTC(2026, 10, 16, 17, 0), -420) - N.realDay(Date.UTC(2026, 10, 16, 16, 59), -420), 1, 'qua nửa đêm giờ Việt Nam thì sang ngày mới');

// Đổi ARPABET sang IPA
assert.equal(arpaToIpa('W EH1 L K AH0 M'), 'ˈwelkəm');
assert.equal(arpaToIpa('IH2 N T R AH0 D UW1 S'), 'ɪntrəˈduːs');
assert.equal(arpaToIpa('AH0 P L AO1 Z'), 'əˈplɔːz');
assert.equal(arpaToIpa('G EH1 S T'), 'ɡest', 'từ một âm tiết không cần dấu trọng âm');
assert.equal(arpaToIpa('S ER1 V AH0 S'), 'ˈsɜːrvəs');

// Bảng từ
for (const w of ['welcome', 'guest', 'ceremony', 'applause', 'schedule', 'introduce', 'toast', 'venue']) {
  assert.ok(glossary[w]?.[0] && glossary[w]?.[1], `bảng từ thiếu ${w}`);
}
assert.deepEqual(N.lookupGloss(glossary, 'Guests,'), { ipa: glossary.guests[0], vi: glossary.guest[1], lemma: 'guest' });
assert.equal(N.lookupGloss(glossary, 'welcoming').lemma, 'welcome');
assert.equal(N.lookupGloss(glossary, 'invited').lemma, 'invite');
assert.equal(N.lookupGloss(glossary, 'news').lemma, undefined, 'news không phải dạng của new');
assert.equal(N.lookupGloss(glossary, 'this').lemma, undefined);
assert.ok(!N.lookupGloss(glossary, 'has').lemma && !N.lookupGloss(glossary, 'was').lemma);
const phrase = N.lookupGloss(glossary, 'join me in welcoming');
assert.ok(phrase.ipa.split(' ').length === 4 && phrase.vi === '');
assert.deepEqual(N.lookupGloss(glossary, 'zzzqx'), { ipa: '', vi: '' });
// Nghĩa lấy theo dạng gốc không được trỏ vào một từ gốc sai nghĩa hiển nhiên
for (const [w, bad] of [['does', 'doe'], ['goes', 'goe'], ['yes', 'ye'], ['always', 'alway'], ['series', 'serie']]) {
  assert.notEqual(N.lookupGloss(glossary, w).lemma, bad);
}
const entries = Object.entries(glossary);
assert.ok(entries.length > 4000, 'bảng từ phải phủ nội dung game');
assert.ok(entries.filter(([, v]) => v[1]).length > 2200, 'cần hơn 2200 nghĩa soạn sẵn');
for (const [w, v] of entries) assert.ok(Array.isArray(v) && v.length === 2 && !/[;=]/.test(v[1]), `mục ${w} sai định dạng`);

// Âm vị đích cho mô hình chấm
assert.deepEqual(N.phoneTargetIpas('ˈsɜːrvəs'), ['ˈsɜːvəs']);
assert.deepEqual(N.phoneTargetIpas('ˈwelkəm'), ['ˈwɛlkəm']);
assert.deepEqual(N.phoneTargetIpas('ˈspiːkər'), ['ˈspiːkɚ', 'ˈspiːkə']);
assert.equal(N.phoneTargetIpas('teɪk')[0], 'teɪk', 'không đổi e trong eɪ');

// Xuất CSV
const csv = N.exportNotes({ a: { key: 'guest', text: 'guest', vocab: true, pron: true, ctx: 'Dear guests, "welcome"', ctxVi: 'Kính thưa', memo: 'khách', at: 1 } }, glossary);
const lines = csv.split('\n');
assert.equal(lines.length, 2);
assert.equal(lines[0], 'Từ,Phiên âm,Nghĩa,Nhãn,Câu gốc,Nghĩa câu gốc,Ghi chú');
assert.equal(lines[1], `guest,/ɡest/,khách mời,từ mới + phát âm,"Dear guests, ""welcome""",Kính thưa,khách`);

console.log('notes.test: đạt');
