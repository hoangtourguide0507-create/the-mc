#!/usr/bin/env python3
"""Chụp màn hình MC Life · English Stage ở iPhone dọc & iPad ngang.

  python3 .claude/qa/snap.py [màn ...] [--out THƯ_MỤC] [--only iphone|ipad]
  Màn: welcome hub coffee wedding backstage gala interview beach shop book finish gallery
       world world-walk world-card world-talk world-night world-enter all  (mặc định: all)

- Tự chạy server tĩnh, tự build Tailwind (CDN bị chặn trong môi trường test) và giả lập dữ liệu người chơi.
- In lỗi JS (pageerror) của từng màn. Ảnh lưu ở --out (mặc định /tmp/mc-shots).
"""
import asyncio, json, os, sys, subprocess, socket, threading, functools, http.server, shutil

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
APP = os.path.join(ROOT, 'mc-life-english-stage')
QA = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join('/tmp', 'mc-qa-cache')
VIEWS = {'iphone': (390, 844), 'ipad': (1180, 820)}
ALL = ['welcome', 'hub', 'coffee', 'wedding', 'shop', 'book', 'finish', 'gallery', 'world', 'world-walk']
# Bản đồ thành phố: W = World; WORLD_CLOCK đặt state.clock (phút) trước khi mở bản đồ
WORLD = {
    'world':       ('', 2300),
    'world-walk':  ("W.travelTo('theater')", 1100),          # chụp lúc MC đang đi
    'world-card':  ("W.travelTo('cafe')", 4200),             # tới nơi → thẻ “Vào …”
    'world-talk':  ("W.approach(W.passers.slice().sort((a,b)=>Math.hypot(a.fc-W.player.fc,a.fr-W.player.fr)-Math.hypot(b.fc-W.player.fc,b.fr-W.player.fr))[0])", 4200),
    'world-night': ('', 2300),
    'world-enter': ("W.travelTo('wedding',{enter:'wedding'})", 7000),   # vào show từ bản đồ → Stage
}
WORLD_CLOCK = {'world-night': 1290, 'world-enter': 1080, 'world-card': 480}
STATE = {'v': 2, 'energy': 100, 'charisma': {'lv': 9, 'pts': 0}, 'cash': 400, 'day': 3,
         'streak': {'count': 4, 'best': 6, 'last': ''}, 'items': {'goldmic': True}}

def tailwind_css():
    os.makedirs(CACHE, exist_ok=True)
    out = os.path.join(CACHE, 'tw.css')
    if not os.path.exists(os.path.join(CACHE, 'node_modules', 'tailwindcss')):
        subprocess.run('npm init -y >/dev/null && npm i -s tailwindcss@3 >/dev/null 2>&1', shell=True, cwd=CACHE, check=True)
    with open(os.path.join(CACHE, 'in.css'), 'w') as f: f.write('@tailwind base;@tailwind components;@tailwind utilities;')
    subprocess.run(['npx', 'tailwindcss', '-c', os.path.join(QA, 'tw.config.js'), '-i', 'in.css', '-o', out], cwd=CACHE, check=True, capture_output=True)
    return open(out).read()

def serve():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); port = s.getsockname()[1]; s.close()
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    h = functools.partial(Quiet, directory=APP)
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', port), h)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return f'http://127.0.0.1:{port}/index.html'

def chrome():
    for p in ('/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'):
        if os.path.exists(p): return p
    return None

async def main(screens, out, only):
    from playwright.async_api import async_playwright
    css = tailwind_css()
    twjs = 'window.tailwind={config:{}};(function(){var s=document.createElement("style");s.textContent=' + json.dumps(css) + \
           ';document.addEventListener("DOMContentLoaded",function(){document.head.appendChild(s)});})();'
    url = serve(); os.makedirs(out, exist_ok=True); bad = 0
    async with async_playwright() as p:
        kw = {'args': ['--no-sandbox']}
        if chrome(): kw['executable_path'] = chrome()
        b = await p.chromium.launch(**kw)
        for dev, (w, h) in VIEWS.items():
            if only and dev != only: continue
            for sc in screens:
                ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, has_touch=True)
                await ctx.route('https://cdn.tailwindcss.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=twjs))
                async def expose(route):
                    r = await route.fetch(); body = await r.text()
                    body = body.replace('\n})();\n</script>', '\nwindow.__qa={finishScene,Stage,SCENES,NPCS,npcSVG,World,Clock,state};\n})();\n</script>')
                    await route.fulfill(response=r, body=body)
                await ctx.route('**/index.html*', expose)
                await ctx.add_init_script(f"localStorage.setItem('mclife.v2', {json.dumps(json.dumps(STATE))}); sessionStorage.setItem('mclife.autoUpd','x')")
                pg = await ctx.new_page(); errs = []
                pg.on('pageerror', lambda e: errs.append(str(e)))
                await pg.goto(url); await pg.wait_for_timeout(900)
                if sc != 'welcome':
                    await pg.click('#btnStart'); await pg.wait_for_timeout(1300)
                if sc in ('coffee',): await pg.click('#btnCafe'); await pg.wait_for_timeout(2400)
                elif sc in ('wedding', 'backstage', 'gala', 'interview', 'beach'):
                    await pg.click(f'[data-gig="{sc}"]'); await pg.wait_for_timeout(2400)
                elif sc == 'shop': await pg.click('#btnShop'); await pg.wait_for_timeout(900)
                elif sc == 'book': await pg.click('#btnBook'); await pg.wait_for_timeout(900)
                elif sc == 'finish':
                    await pg.evaluate("()=>{const t=window.__qa;t.Stage.sc=t.SCENES.wedding;t.Stage.stars=[3,3,2,3];t.Stage.xpEarned=84;t.Stage.listenEarned=30;t.finishScene()}")
                    await pg.wait_for_timeout(2600)
                elif sc in WORLD:
                    act, ms = WORLD[sc]
                    if sc in WORLD_CLOCK: await pg.evaluate(f"()=>{{window.__qa.state.clock={WORLD_CLOCK[sc]}}}")
                    await pg.evaluate("()=>window.__qa.World.open()"); await pg.wait_for_timeout(1800)
                    if act: await pg.evaluate(f"()=>{{const W=window.__qa.World;{act}}}")
                    await pg.wait_for_timeout(ms)
                elif sc == 'gallery':
                    await pg.evaluate("""()=>{const q=window.__qa,d=document.createElement('div');d.style.cssText='position:fixed;inset:0;z-index:999;background:#1a1240;display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:center;gap:8px;padding:12px;overflow:auto';
                      Object.keys(q.NPCS).forEach(k=>{const n=q.NPCS[k],w=document.createElement('div');w.style.cssText='height:200px;aspect-ratio:'+(n.duo?'270/222':'160/222');w.innerHTML=q.npcSVG(n);d.appendChild(w)});document.body.appendChild(d)}""")
                    await pg.wait_for_timeout(500)
                path = os.path.join(out, f'{dev}_{sc}.png'); await pg.screenshot(path=path)
                print(f'{"✗" if errs else "✓"} {path}' + (f'  LỖI JS: {errs[:3]}' if errs else '')); bad += bool(errs)
                await ctx.close()
        await b.close()
    return bad

if __name__ == '__main__':
    a = sys.argv[1:]; out = '/tmp/mc-shots'; only = None
    if '--out' in a: i = a.index('--out'); out = a[i + 1]; del a[i:i + 2]
    if '--only' in a: i = a.index('--only'); only = a[i + 1]; del a[i:i + 2]
    screens = ALL if not a or a == ['all'] else a
    sys.exit(1 if asyncio.run(main(screens, out, only)) else 0)
