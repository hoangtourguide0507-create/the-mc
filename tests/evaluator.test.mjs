// Kiểm thử bộ chấm điểm phát âm (evaluator). Chạy: npm run test:evaluator
import { build } from 'esbuild';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = await mkdtemp(path.join(os.tmpdir(), 'evaluator-'));
const outfile = path.join(dir, 'evaluator.mjs');
await build({
  entryPoints: [path.join(root, 'src/core/evaluator.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile,
  logLevel: 'silent',
});
const E = await import(pathToFileURL(outfile).href);

const semi = (frame, pool, transcript) =>
  E.evaluateSemi({ frame, blankPool: pool, blanks: pool.length }, transcript);

// Cụm nhiều từ phải khớp nguyên từ, không khớp chuỗi con.
{
  assert.equal(semi('We will ___ there', [['to be']], 'we went to beach').blanksFilled, 0);
  assert.equal(semi('We will ___ there', [['to be']], 'we will to be there').blanksFilled, 1);
  assert.equal(
    E.evaluateFreeform({ requiredKeywords: [['in charge']], minWords: 2 }, 'they are in chargers now').matchedKeywords.length,
    0
  );
  assert.equal(
    E.evaluateFreeform({ requiredKeywords: [['in charge']], minWords: 2 }, 'i am in charge here').matchedKeywords.length,
    1
  );
  assert.equal(E.containsTokenSequence(['a', 'b', 'c'], ['b', 'c']), true);
  assert.equal(E.containsTokenSequence(['a', 'b', 'c'], ['c', 'b']), false);
  assert.equal(E.containsTokenSequence(['a'], []), false);
  console.log('evaluator: khớp cụm từ theo nguyên từ pass');
}

// "ill" (ốm) không còn được coi là đồng âm với "aisle".
{
  const r = E.evaluateScripted('the aisle', 'the ill');
  assert.notEqual(r.tokens[1].status, 'ok');
  console.log('evaluator: không nhầm "ill" với "aisle" pass');
}
