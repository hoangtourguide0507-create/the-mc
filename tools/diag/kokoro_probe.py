# Chẩn đoán giọng Kokoro trong trình duyệt (chạy trong GitHub Actions, nơi tải được Hugging Face).
import json, sys
from playwright.sync_api import sync_playwright
url = sys.argv[1]
ARGS = ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--enable-unsafe-webgpu',
        '--enable-features=Vulkan,WebGPU', '--use-vulkan=swiftshader', '--use-webgpu-adapter=swiftshader', '--ignore-gpu-blocklist']
JS = """async (b) => {
  const out = { backend: b };
  const lv = window.__liveVoice;
  const t0 = performance.now();
  try {
    if (b === 'auto') { out.picked = await lv.pickBackend(); return out; }
    const [device, dtype] = b.split(':');
    const tts = await lv.loadKokoro({ device, dtype });
    out.loadMs = Math.round(performance.now() - t0);
    for (const v of ['bf_emma', 'am_fenrir']) {
      const t1 = performance.now();
      const a = await tts.generate('Hi Thien An, it is Emma. Have you got a few minutes?', { voice: v, speed: 1 });
      let s = 0; for (const x of a.audio) s += x * x;
      out[v] = { ms: Math.round(performance.now() - t1), seconds: +(a.audio.length / a.sampling_rate).toFixed(2), rms: +Math.sqrt(s / a.audio.length).toFixed(4) };
    }
  } catch (e) { out.error = String(e && (e.stack || e.message || e)).slice(0, 800); }
  return out;
}"""
with sync_playwright() as p:
    for b in sys.argv[2:]:
        br = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=ARGS)
        pg = br.new_page(); logs = []
        pg.on('console', lambda m: logs.append(f'{m.type}: {m.text[:300]}'))
        pg.goto(url, wait_until='load'); pg.wait_for_timeout(2500)
        res = pg.evaluate(JS, b)
        print('RESULT', json.dumps(res))
        for l in logs:
            if any(k in l for k in ('liveVoice', 'WebGPU', 'webgpu', 'ERR', 'rror')) and 'GL Driver' not in l: print('   ', l)
        br.close()
