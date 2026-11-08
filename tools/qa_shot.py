#!/usr/bin/env python3
"""Chụp thử bản 3D bằng Playwright (WebGL qua SwiftShader).

Cách dùng:
  npm run build && npx vite preview --port 4173 &
  python3 tools/qa_shot.py world hub world-night  [--out /tmp/qa]

Mỗi chế độ chụp ở iPhone dọc (390x844) và iPad ngang (1180x820).
Báo lỗi JS (pageerror / console.error) ra màn hình; thoát mã 1 nếu có lỗi.
"""
import argparse
import json
import os
import sys

from playwright.sync_api import sync_playwright

URL = os.environ.get('QA_URL', 'http://localhost:4173/?qa=1')
DEVICES = {
    'iphone': dict(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True),
    'ipad': dict(viewport={'width': 1180, 'height': 820}, device_scale_factor=1, has_touch=True),
}

SETUP = {
    'hub': "s.getState().goTo('hub', {immediate:true})",
    'world': "s.getState().goTo('world', {immediate:true})",
    'world-night': "s.setState(x => ({state:{...x.state, clock: 1290}})); s.getState().goTo('world', {immediate:true})",
    'stage': "s.getState().startScene('coffee', 'hub')",
    'stage-wedding': "s.setState(x => ({state:{...x.state, clock: 1100, charisma:{lv:3, pts:0}}})); s.getState().startScene('wedding', 'hub')",
    'world-lv5': "s.setState(x => ({state:{...x.state, clock: 1010, charisma:{lv:5, pts:40}, rep:{avg:2.2, n:6}}})); s.getState().goTo('world', {immediate:true})",
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('modes', nargs='+')
    ap.add_argument('--out', default='/tmp/qa')
    ap.add_argument('--wait', type=int, default=3500)
    ap.add_argument('--js', default='', help='JS chạy thêm sau khi vào chế độ (biến s = store)')
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        for dev, opts in DEVICES.items():
            ctx = browser.new_context(**opts)
            for mode in args.modes:
                page = ctx.new_page()
                page.on('pageerror', lambda e, m=mode, d=dev: errors.append(f'[{d}/{m}] pageerror: {e}'))
                page.on('console', lambda msg, m=mode, d=dev: msg.type == 'error' and 'fonts.g' not in msg.text and errors.append(f'[{d}/{m}] console: {msg.text}'))
                page.goto(URL, wait_until='domcontentloaded')
                page.wait_for_timeout(1200)
                page.evaluate("() => { const s = window.__mc; s.getState().startDayFromWelcome && s.getState().startDayFromWelcome(); }")
                page.wait_for_timeout(600)
                page.evaluate(f"() => {{ const s = window.__mc; {SETUP.get(mode, SETUP['world'])}; }}")
                if args.js:
                    page.wait_for_timeout(800)
                    page.evaluate(f"() => {{ const s = window.__mc; {args.js} }}")
                page.wait_for_timeout(args.wait)
                path = os.path.join(args.out, f'{mode}-{dev}.png')
                page.screenshot(path=path)
                print('saved', path)
                page.close()
            ctx.close()
        browser.close()
    for e in errors:
        print(e)
    sys.exit(1 if errors else 0)


if __name__ == '__main__':
    main()
