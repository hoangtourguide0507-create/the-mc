// Kiểm thử từ khó trong lượt đọc theo thẻ (src/core/hardword.ts) và nhóm luyện đuôi -ed.
// Chạy: npm run test:hardword
import { build } from 'esbuild';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = async (entry, name) => {
  const outfile = path.join(os.tmpdir(), `mc-${name}-${process.pid}.mjs`);
  await build({ entryPoints: [path.join(root, entry)], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
  return import(pathToFileURL(outfile).href);
};
const H = await load('src/core/hardword.ts', 'hardword');
const E = await load('src/core/evaluator.ts', 'hw-eval');
const R = await load('src/core/retry.ts', 'hw-retry');
const P = await load('src/core/phonology.ts', 'hw-phon');
const D = await load('src/data/pronunciation.ts', 'hw-pron');

// Dạng gốc của từ có đuôi
assert.ok(H.inflectionBases('switched').includes('switch'));
assert.ok(H.inflectionBases('arrived').includes('arrive'));
assert.ok(H.inflectionBases('planned').includes('plan'));
assert.ok(H.inflectionBases('guests').includes('guest'));
assert.ok(H.inflectionBases('watches').includes('watch'));
assert.ok(H.inflectionBases('married').includes('marry'));
assert.deepEqual(H.inflectionBases('red'), []);
assert.ok(!H.inflectionBases('business').length || !H.inflectionBases('business').includes('busines'));

// Máy nghe ra dạng gốc mà không nghe ra từ
assert.equal(H.droppedEnding('switched', 'please make sure your phones are switch to silent mode'), true);
assert.equal(H.droppedEnding('switched', 'phones are switched to silent'), false);
assert.equal(H.droppedEnding('switched', 'phones are sweet to silent'), false);
assert.equal(H.droppedEnding('guests', 'dear guest please take your seats'), true);
assert.equal(H.droppedEnding('please', 'pleas'), false);

// Mô phỏng lượt đọc: "switched" bị nghe thành "switch" 3 lần
const cue = 'Please make sure your phones are switched to silent mode.';
const heard = 'please make sure your phones are switch to silent mode';
const idx = cue.split(/\s+/).findIndex((w) => w === 'switched');
let res = null;
let track = null;
for (let i = 1; i <= 3; i++) {
  const r = E.evaluateScripted(cue, heard);
  assert.notEqual(r.tokens[idx].status, 'ok', 'switch không được tính là switched');
  res = R.mergeAttempts(res, r);
  track = H.trackAttempt(track ?? H.newTrack(res.tokens.length), r.tokens, heard);
  assert.equal(track.misses[idx], i);
  assert.equal(track.dropped[idx], true);
  // Sai từ lần 2 thì mời luyện riêng
  assert.deepEqual(H.drillCandidates(res, track), i >= H.DRILL_AFTER ? [idx] : []);
  const f = H.forgiveDroppedEndings(res, track);
  if (i < H.FORGIVE_AFTER) assert.deepEqual(f.forgiven, []);
  else {
    // Lần 3: tạm tính gần đúng, câu không còn cụm phải luyện
    assert.deepEqual(f.forgiven, ['switched']);
    assert.equal(f.result.tokens[idx].status, 'ok');
    assert.equal(f.result.tokens[idx].forgiven, true);
    assert.equal(R.focusChunk(f.result.tokens), null);
    assert.ok(f.result.score >= res.score && f.result.stars >= res.stars);
    res = f.result;
  }
}

// Từ nghe nhầm hẳn sang từ khác (sweet) thì không tạm tính, chỉ mời luyện riêng
{
  const bad = 'please make sure your phones are sweet to silent mode';
  let rr = null;
  let tk = null;
  for (let i = 0; i < 4; i++) {
    const r = E.evaluateScripted(cue, bad);
    rr = R.mergeAttempts(rr, r);
    tk = H.trackAttempt(tk ?? H.newTrack(rr.tokens.length), r.tokens, bad);
  }
  assert.deepEqual(H.forgiveDroppedEndings(rr, tk).forgiven, []);
  assert.ok(H.drillCandidates(rr, tk).includes(idx));
  // Luyện riêng đạt: tính đúng, điểm không tụt
  const v = H.markVerified(rr, idx);
  assert.equal(v.tokens[idx].status, 'ok');
  assert.equal(v.tokens[idx].verified, true);
  assert.ok(v.score >= rr.score);
}

// Đọc cụm: lần sai được ghi đúng vị trí trong câu
{
  const tk = H.trackAttempt(H.newTrack(10), E.evaluateScripted('are switched to', 'are switch to').tokens, 'are switch to', 5);
  assert.equal(tk.misses[6], 1);
  assert.equal(tk.dropped[6], true);
  assert.equal(tk.misses[5] + tk.misses[7], 0);
}

// Chấm từng âm: thiếu /t/ cuối là chưa đạt và được nói rõ
{
  const target = P.tokenizePhones('/swɪtʃt/');
  const miss = P.bestScore([target], P.tokenizePhones('swɪtʃ'));
  assert.equal(H.wordDrillPass(miss), false);
  assert.ok(H.phoneProblems(miss.ops).some((x) => x.includes('/t/') && x.includes('cuối')), H.phoneProblems(miss.ops).join('; '));
  const good = P.bestScore([target], P.tokenizePhones('swɪtʃt'));
  assert.equal(H.wordDrillPass(good), true);
  assert.deepEqual(H.phoneProblems(good.ops), []);
}

// Luật đọc đuôi -ed và -s
assert.equal(H.endingRule('switched', 'tʃ').sound, '/t/');
assert.equal(H.endingRule('asked', 'k').sound, '/t/');
assert.equal(H.endingRule('arrived', 'v').sound, '/d/');
assert.equal(H.endingRule('planned', 'n').sound, '/d/');
assert.equal(H.endingRule('started', 't').sound, '/ɪd/');
assert.equal(H.endingRule('invited', 't').sound, '/ɪd/');
assert.equal(H.endingRule('guests', 't').sound, '/s/');
assert.equal(H.endingRule('watches', 'tʃ').sound, '/ɪz/');
assert.equal(H.endingRule('friends', 'd').sound, '/z/');
assert.equal(H.endingRule('red', 'd'), null);

// Bài nhóm -ed: IPA khớp luật đọc đuôi (từ có -ed)
for (const d of D.PRON_DRILLS.filter((x) => x.group === 'ed' && x.word.endsWith('ed'))) {
  const ph = P.tokenizePhones(d.ipa);
  const sound = ph.at(-2) === 'ɪ' && ph.at(-1) === 'd' ? '/ɪd/' : `/${ph.at(-1)}/`;
  const tail = sound === '/ɪd/' ? ph.at(-3) : ph.at(-2);
  assert.equal(H.endingRule(d.word, tail).sound, sound, `${d.id}: ${d.ipa}`);
  // Đọc đúng IPA thì đạt, bỏ âm cuối thì không
  assert.equal(H.wordDrillPass(P.bestScore([ph], ph)), true, d.id);
  assert.equal(H.wordDrillPass(P.bestScore([ph], ph.slice(0, -1))), false, `${d.id}: bỏ âm cuối phải chưa đạt`);
}

console.log('hardword.test: theo dõi từ khó, tạm tính đuôi bị nuốt, luyện riêng và luật đuôi -ed đều đúng.');
