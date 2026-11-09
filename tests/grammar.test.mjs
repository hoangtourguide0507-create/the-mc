// Kiểm thử bộ gợi ý sửa ngữ pháp và khẩu ngữ. Chạy: npm run test:grammar
import { build } from 'esbuild';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = await mkdtemp(path.join(os.tmpdir(), 'grammar-'));
const outfile = path.join(dir, 'grammar.mjs');
await build({ entryPoints: [path.join(root, 'src/core/grammar.ts')], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
const G = await import(pathToFileURL(outfile).href);

const fixes = (text) => G.findGrammarIssues(text).map((i) => i.fix);

// Lỗi điển hình được bắt
assert.deepEqual(fixes('Let us discuss about the plan'), ['discuss']);
assert.ok(fixes('I am agree with you').includes('I agree'));
assert.ok(fixes('She don\'t like coffee').includes("he/she/it doesn't"));
assert.ok(fixes('He have two cats').includes('he/she/it has'));
assert.ok(fixes('I wanna join the show').includes('want to'));
assert.ok(fixes('According to me, it is good').includes('in my opinion'));

// Câu đúng không bị báo lỗi
assert.deepEqual(G.findGrammarIssues('I agree, let us discuss the plan with the team'), []);
assert.deepEqual(G.findGrammarIssues('She doesn\'t like coffee, but she is going to try it'), []);

// Mỗi mẫu chỉ báo một lần dù xuất hiện nhiều lần
assert.equal(G.findGrammarIssues('gonna gonna gonna').length, 1);

console.log('grammar.test: các mẫu lỗi thường gặp được bắt đúng, câu đúng không bị báo.');
