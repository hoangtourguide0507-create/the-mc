// Kiểm thử bộ bắt lỗi ngữ pháp (src/core/grammar.ts). Chạy: npm run test:grammar
// 1. Mỗi lỗi điển hình phải bị bắt, kèm cách sửa đúng.
// 2. Câu đúng (kể cả câu dễ bị bắt nhầm) không được báo lỗi.
// 3. Không câu mẫu tiếng Anh nào của game bị báo lỗi ngữ pháp.
import { build } from 'esbuild';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outfile = path.join(os.tmpdir(), `mc-grammar-${process.pid}.mjs`);
await build({ entryPoints: [path.join(root, 'src/core/grammar.ts')], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
const G = await import(pathToFileURL(outfile).href);

const WRONG = [
  ['It my pleasure to be your host tonight.', 'It my pleasure', 'It is my pleasure'],
  ['I very happy to be here.', 'I very happy', 'I am very happy'],
  ['We so excited to welcome you.', 'We so excited', 'We are so excited'],
  ['I am agree with you.', 'I am agree', 'I agree'],
  ['She is not agree.', 'She is not agree', "She doesn't agree"],
  ['The show will be begin in five minutes.', 'will be begin', 'will begin'],
  ['It will is a great night.', 'will is', 'will be'],
  ['The ceremony is begin now.', 'is begin', 'begins / is beginning'],
  ['Everyone are ready.', 'Everyone are', 'Everyone is'],
  ['The people is waiting outside.', 'people is', 'people are'],
  ['There is many guests tonight.', 'There is many', 'there are many'],
  ['It is my pleasure to being your host.', 'to being', 'to be'],
  ['I am honored to introducing our speaker.', 'to introducing', 'to introduce'],
  ['You can to take photos now.', 'can to take', 'can take'],
  ["Let's to welcome the couple.", "Let's to welcome", "Let's welcome"],
  ['This will make you to smile.', 'make you to smile', 'make you smile'],
  ['He did not came yesterday.', 'did not came', 'did not come'],
  ['We will went to the hall.', 'will went', 'will go'],
  ['They have went home already.', 'have went', 'have gone'],
  ["He don't like long speeches.", "He don't", "He doesn't"],
  ['She have a beautiful voice.', 'She have', 'She has'],
  ['This hall is more bigger than the last one.', 'more bigger', 'bigger'],
  ['This one is more easy than that.', 'more easy than', 'easier'],
  ['She is the most best singer.', 'the most best', 'the best'],
  ['We have many informations for you.', 'informations', 'information'],
  ['Thank you for your many advices.', 'advices', 'advice'],
  ['We need many equipment.', 'many equipment', 'a lot of equipment'],
  ['He is one of the speaker today.', 'one of the speaker', 'one of the speakers'],
  ['It is a honor to be here.', 'a honor', 'an honor'],
  ['What a amazing night!', 'a amazing', 'an amazing'],
  ['It is an great day.', 'an great', 'a great'],
  ['We will discuss about the plan.', 'discuss about', 'discuss'],
  ['Please explain me the program.', 'explain me', 'explain it to me'],
  ['Please say me your name.', 'say me', 'tell me'],
  ['Let us listen music together.', 'listen music', 'listen to music'],
  ['Please wait me here.', 'wait me', 'wait for me'],
  ['It depends of the weather.', 'depends of', 'depends on'],
  ['She married with a doctor.', 'married with', 'married'],
  ['The guests arrived to the hotel.', 'arrived to', 'arrived at / in'],
  ['Please join with us.', 'join with us', 'join us'],
  ['Thank for coming.', 'Thank for', 'thank you for'],
  ['Congratulation to the couple!', 'Congratulation', 'congratulations'],
  ['On behalf our company, welcome.', 'on behalf our', 'on behalf of our'],
  ['Good evening, ladies and gentleman.', 'ladies and gentleman', 'ladies and gentlemen'],
  ['I have worked here since five years.', 'since five years', 'for five years'],
  ['I very like this song.', 'I very like', 'I really like'],
  ['Although it rained, but everyone came.', null, 'although … (bỏ "but")'],
  ['Because we are late, so we start now.', null, 'because … (bỏ "so")'],
];
for (const [text, wrong, fix] of WRONG) {
  const found = G.grammarErrors(G.findGrammarIssues(text));
  const hit = found.find((i) => i.fix.toLowerCase() === fix.toLowerCase() && (wrong === null || i.wrong.toLowerCase() === wrong.toLowerCase()));
  assert.ok(hit, `không bắt được lỗi trong "${text}" (cần "${wrong}" → "${fix}"), máy báo: ${JSON.stringify(found)}`);
}

const RIGHT = [
  'Are you ready?',
  'Are you all ready for the next performance?',
  'Does everyone have a glass?',
  'Let her go first.',
  'Can he come up to the stage?',
  'Make it a great night!',
  'Is it a surprise?',
  'We look forward to seeing you again next year.',
  'Thank you for being here. We are committed to making this a success.',
  'I am used to speaking in front of large crowds.',
  'Let us go back to being friends.',
  'The doors will be open at six.',
  'The doors are open now.',
  'We will be close to midnight by then.',
  'There is more good news.',
  'We have more long speeches after dinner.',
  'It is an honor and an hour well spent.',
  'Please welcome an MC from Hanoi.',
  'This is a unique and useful event, a one-time chance, and a European premiere.',
  'Everyone has arrived. Everyone is here.',
  'I make you happy, and we keep them busy.',
  'They arrived to learn about the product.',
  'Congratulations, Daniel!',
  'One of the best nights of the year.',
  'He has gone home. She goes to the gym.',
  'Will you be ready by seven?',
  'Why would she agree to that?',
];
for (const text of RIGHT) {
  const found = G.grammarErrors(G.findGrammarIssues(text));
  assert.deepEqual(found, [], `báo nhầm câu đúng "${text}": ${JSON.stringify(found)}`);
}

// Văn phong: ghi chú, không phải lỗi ngữ pháp, không trừ sao
const style = G.findGrammarIssues("We're gonna start soon, I wanna thank you.");
assert.equal(style.length, 2);
assert.ok(style.every((i) => i.kind === 'style'));
assert.equal(G.grammarErrors(style).length, 0);
assert.equal(G.capForGrammar(3, style), 3);
assert.equal(G.capForGrammar(3, G.findGrammarIssues('It my pleasure.')), 2);
assert.equal(G.capForGrammar(1, G.findGrammarIssues('It my pleasure.')), 1);

// Mỗi đoạn sai chỉ báo một lần
assert.equal(G.findGrammarIssues('Thank for coming, thank for coming.').length, 1);

assert.equal(G.findGrammarIssues('gonna gonna gonna').length, 1);

/* ---------- Áp vào bộ chấm ---------- */
const out2 = path.join(os.tmpdir(), `mc-grammar-use-${process.pid}.mjs`);
const entry = path.join(os.tmpdir(), `mc-grammar-use-${process.pid}.ts`);
const q = (rel) => JSON.stringify(path.join(root, rel));
(await import('node:fs')).writeFileSync(
  entry,
  `export * as R from ${q('src/core/recall.ts')};\nexport * as T from ${q('src/core/talk.ts')};\nexport * as L from ${q('src/core/longturn.ts')};\nexport * as C from ${q('src/core/chunks.ts')};\nexport { TALKS } from ${q('src/data/talks.ts')};\nexport { LONG_TASKS } from ${q('src/data/longturns.ts')};\nexport { INTERP_SETS } from ${q('src/data/interpret.ts')};`
);
await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out2, logLevel: 'silent' });
const { R, T, L, C, TALKS, LONG_TASKS, INTERP_SETS } = await import(pathToFileURL(out2).href);

// Lượt tự nói (so với câu mẫu)
const target = 'Good evening and welcome to the official launch of Aura One. It is my pleasure to be your host tonight.';
const rec = (s) => R.evaluateRecall(target, s);
assert.equal(rec(target).stars, 3);
assert.equal(rec("Good evening and welcome to the official launch of Aura One. It's my pleasure to be your host tonight.").stars, 3, 'viết tắt it\'s vẫn đúng');
assert.equal(rec('Good evening and welcome to official launch of Aura One. It is my pleasure to be your host tonight.').stars, 3, 'tha một mạo từ máy nghe rơi');
assert.equal(rec('Good evening and welcome to the launch of Aura One. It is a pleasure to be your host this evening.').stars, 3, 'diễn đạt khác phần nội dung vẫn 3 sao');
const r2 = rec('Good evening and welcome to the official launch of Aura One. It my pleasure to being your host tonight.');
assert.equal(r2.stars, 2);
assert.ok(r2.grammarIssues.some((g) => g.fix === 'It is my pleasure') && r2.grammarIssues.some((g) => g.fix === 'to be'));
assert.equal(rec('Good evening and welcome to the official launch of Aura One. It is my pleasure be your host tonight.').stars, 2, 'thiếu "to"');
assert.equal(rec('Evening good welcome launch official Aura One pleasure host tonight be my.').stars, 1, 'đảo lộn thứ tự từ');
assert.ok(rec('Good evening, welcome official launch Aura One. My pleasure be your host tonight.').stars <= 1, 'vỡ cấu trúc nhiều chỗ');
assert.deepEqual(R.structureIssues('I am happy to be here.', 'I happy to be here.').map((g) => [g.wrong, g.fix]), [['i happy', 'i am happy']]);
assert.deepEqual(R.structureIssues('We will begin in five minutes.', 'We begin in five minutes.').map((g) => g.fix), ['we will begin']);
// Chọn phương án máy nghe sạch lỗi nếu có
assert.equal(R.evaluateRecallCandidates(target, ['Good evening and welcome to the official launch of Aura One. It my pleasure to be your host tonight.', target]).stars, 3);

// Khởi động: có cụm nhưng sai ngữ pháp thì chưa thuộc
assert.equal(C.evaluateChunkUse('a warm welcome', 'Please give a warm welcome to our guest').ok, true);
assert.equal(C.evaluateChunkUse('a warm welcome', 'Everyone are give a warm welcome to our guest').ok, false);

// Trò chuyện: đúng ý nhưng sai ngữ pháp chỉ được 1 điểm
const talk = TALKS[0];
const sample = T.firstSample(talk.nodes[0]).say;
const okStep = T.step(talk, T.newTalk(), [sample]);
assert.equal(okStep.gained, 2);
assert.equal(okStep.grammarCost, false);
const badStep = T.step(talk, T.newTalk(), [`${sample} I very happy to help.`]);
assert.equal(badStep.outcome, 'advance');
assert.equal(badStep.gained, 1);
assert.equal(badStep.grammarCost, true);

// Nói dài và Dịch: đủ ý nhưng sai ngữ pháp thì tối đa 2 sao
const task = LONG_TASKS[0];
assert.equal(L.scoreLong(task, [L.modelOf(task)], 75).stars, 3);
const longBad = L.scoreLong(task, [`${L.modelOf(task)} I very happy to be your host.`], 75);
assert.equal(longBad.stars, 2);
assert.ok(L.longAdvice(task, longBad).some((a) => a.includes('ngữ pháp')));
const seg = INTERP_SETS[0].segments[0];
assert.equal(L.scoreInterp(seg, [seg.say]).stars, 3);
assert.equal(L.scoreInterp(seg, [`${seg.say} We so excited.`]).stars, 2);
assert.equal(L.scoreInterp(seg, [`${seg.say} We are gonna have fun.`]).stars, 3, 'văn phong không trừ sao');

// Không câu mẫu nào của game bị báo lỗi
const V = await import(pathToFileURL(path.join(root, 'tools/voice-lines.mjs')).href);
const lines = [...new Set(V.collect(await V.loadContent()).map((l) => l.text))];
const fp = [];
for (const t of lines) for (const i of G.grammarErrors(G.findGrammarIssues(t))) fp.push(`"${i.wrong}" trong: ${t}`);
assert.deepEqual(fp.slice(0, 10), [], `${fp.length} câu mẫu bị báo nhầm`);

console.log(`grammar.test: ${WRONG.length} lỗi bắt đúng, ${RIGHT.length} câu đúng không báo nhầm, ${lines.length} câu mẫu sạch — OK`);
