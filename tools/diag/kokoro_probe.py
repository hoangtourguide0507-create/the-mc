# Chẩn đoán giọng Kokoro trong trình duyệt (chạy trong GitHub Actions, nơi tải được Hugging Face).
import json, sys, time
from playwright.sync_api import sync_playwright
url = sys.argv[1]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page()
    logs = []
    pg.on('console', lambda m: logs.append(f'{m.type}: {m.text[:400]}'))
    pg.on('pageerror', lambda e: logs.append(f'PAGEERR: {str(e)[:600]}'))
    pg.goto(url, wait_until='load')
    pg.wait_for_timeout(3000)
    res = pg.evaluate("""async () => {
      const out = {};
      const t0 = performance.now();
      try {
        const lv = await import('/src/audio/liveVoice.ts');
        const tts = await lv.loadLiveVoice();
        out.loadMs = Math.round(performance.now() - t0);
        for (const v of ['bf_emma', 'af_nova', 'bm_daniel']) {
          const t1 = performance.now();
          const a = await tts.generate('Hi Thien An, it is Emma. Have you got a few minutes?', { voice: v, speed: 1 });
          out[v] = { ms: Math.round(performance.now() - t1), samples: a.audio?.length, rate: a.sampling_rate, blob: a.toBlob().size };
        }
      } catch (e) {
        out.error = String(e && (e.stack || e.message || e));
      }
      return out;
    }""")
    print('RESULT', json.dumps(res, indent=2))
    print('LOGS'); print('\n'.join(l for l in logs if 'GL Driver' not in l)[:6000])
    b.close()
