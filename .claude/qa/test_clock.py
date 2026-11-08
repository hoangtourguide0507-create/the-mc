#!/usr/bin/env python3
"""Kiểm thử luật giờ giấc (10c. CLOCK) + ngày gắn ngày thật — không cần chụp ảnh.

  python3 .claude/qa/test_clock.py

Giả lập localStorage người chơi, mở game bằng Playwright, gọi thẳng API nội bộ
(qua window.__qa) để chứng minh: advance phát sự kiện, sceneStatus đúng mốc,
show 1 lần/ngày, daily chỉ hồi ⚡ lần đầu, trễ bị trừ cát-xê, đi ngủ/ngất xỉu,
mở lại cùng ngày thật giữ giờ, dữ liệu cũ không có clock vẫn chạy.
Thoát mã 1 nếu có ca sai hoặc lỗi JS.
"""
import asyncio, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from snap import serve, chrome  # noqa: E402

EXPOSE = ('window.__qa={state,Clock,SCHEDULE,SCENES,Stage,startScene,finishScene,saveNow,dayKey,'
          'get view(){return currentView},get routing(){return routing}};')
fails = 0

def check(name, ok, info=''):
    global fails
    print(f'{"✓" if ok else "✗"} {name}' + (f'  → {info}' if info != '' and not ok else ''))
    fails += (not ok)

async def open_game(b, url, seed, start=True, errs=None):
    """Mở game với localStorage giả lập (seed=None: giữ nguyên dữ liệu đã có trong context)."""
    ctx = await b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True)
    await ctx.route('https://cdn.tailwindcss.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body='window.tailwind={config:{}};'))
    async def expose(route):
        r = await route.fetch(); body = await r.text()
        body = body.replace('\n})();\n</script>', '\n' + EXPOSE + '\n})();\n</script>')
        await route.fulfill(response=r, body=body)
    await ctx.route('**/index.html*', expose)
    # chỉ gieo dữ liệu ở lần mở đầu tiên của context → reload giữ đúng dữ liệu game đã lưu
    await ctx.add_init_script(f"""if(!sessionStorage.getItem('qa.seeded')){{sessionStorage.setItem('qa.seeded','1');
      const s={json.dumps(json.dumps(seed) if seed is not None else None)}; if(s) localStorage.setItem('mclife.v2', s);
      sessionStorage.setItem('mclife.autoUpd','x');}}""")
    pg = await ctx.new_page()
    errs = errs if errs is not None else []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.errs = errs
    await pg.goto(url); await pg.wait_for_timeout(500)
    if start: await pg.evaluate("()=>document.querySelector('#btnStart').click()"); await pg.wait_for_timeout(1200)
    return ctx, pg

async def reload_and_start(pg):
    await pg.reload(); await pg.wait_for_timeout(500)
    label = await pg.inner_text('#btnStart')
    await pg.evaluate("()=>document.querySelector('#btnStart').click()"); await pg.wait_for_timeout(1200)
    return label

async def toasts(pg):
    return await pg.evaluate("()=>document.body.innerText")

async def play_scene(pg, sid, stars):
    """startScene → đợi lên sân khấu → chấm sao cố định → finishScene → bấm về."""
    await pg.evaluate(f"()=>__qa.startScene('{sid}', document.body)")
    await pg.wait_for_timeout(1400)
    entered = await pg.evaluate("()=>__qa.view") == 'stage'
    if entered:
        await pg.evaluate(f"()=>{{__qa.Stage.stars={json.dumps(stars)}.slice(0,__qa.SCENES['{sid}'].turns.length);while(__qa.Stage.stars.length<__qa.SCENES['{sid}'].turns.length)__qa.Stage.stars.push({stars[0]});__qa.finishScene()}}")
        await pg.wait_for_timeout(600)
    return entered

async def go_home(pg):
    await pg.evaluate("()=>document.querySelector('#btnHome').click()"); await pg.wait_for_timeout(1500)

async def main():
    from playwright.async_api import async_playwright
    url = serve()
    base = {'v': 2, 'energy': 60, 'charisma': {'lv': 9, 'pts': 0}, 'cash': 400, 'day': 3,
            'streak': {'count': 4, 'best': 6, 'last': ''}, 'items': {}}
    async with async_playwright() as p:
        kw = {'args': ['--no-sandbox']}
        if chrome(): kw['executable_path'] = chrome()
        b = await p.chromium.launch(**kw)
        allerrs = []

        # ---------- 1. Dữ liệu cũ không có clock/loc/doneToday + sang ngày thật mới ----------
        ctx, pg = await open_game(b, url, dict(base, dayDate='2020-01-01'), errs=allerrs)
        s = await pg.evaluate("()=>({day:__qa.state.day,clock:__qa.state.clock,loc:__qa.state.loc,done:__qa.state.doneToday,energy:__qa.state.energy,dd:__qa.state.dayDate,today:__qa.dayKey()})")
        check('save cũ thiếu clock: tự điền clock=420, loc=home, doneToday={}', s['clock'] == 420 and s['loc'] == 'home' and s['done'] == {}, s)
        check('sang ngày thật mới → Ngày 4, dayDate = hôm nay', s['day'] == 4 and s['dd'] == s['today'], s)
        check('sang ngày thật mới → hồi đầy năng lượng', s['energy'] == 100, s)

        # ---------- 2. advance phát sự kiện 'clock' ----------
        ev = await pg.evaluate("""()=>{let got=[];const f=e=>got.push(e.detail.now);document.addEventListener('clock',f);
            __qa.Clock.advance(30);document.removeEventListener('clock',f);return {got,now:__qa.Clock.now(),label:__qa.Clock.label(),period:__qa.Clock.period()}}""")
        check('advance(30) phát sự kiện clock với detail.now=450', ev['got'] == [450] and ev['now'] == 450 and ev['label'] == '07:30', ev)
        per = await pg.evaluate("()=>[420,700,1110,1300].map(m=>__qa.Clock.period(m))")
        check('period: 07:00 sáng · 11:40 chiều · 18:30 tối · 21:40 đêm', per == ['morning', 'afternoon', 'evening', 'night'], per)
        tm = await pg.evaluate("()=>[0,1,10].map(n=>__qa.Clock.travelMinutes(n))")
        check('travelMinutes ≈ 3–4 phút/ô (0→2, 1→4, 10→35)', tm == [2, 4, 35], tm)

        # ---------- 3. sceneStatus các mốc ----------
        st = await pg.evaluate("""()=>{const S=m=>{__qa.state.clock=m;return ['coffee','wedding','market'].map(id=>__qa.Clock.sceneStatus(id))};
            return {t0700:S(420),t1845:S(1125),t1930:S(1170),t1730:S(1050),t1200:S(720)}}""")
        c, w, m = st['t0700']
        check('07:00 coffee open', c['state'] == 'open' and c['label'] == 'Mở cửa đến 11:00', c)
        check('07:00 wedding early ("Bắt đầu 18:30 · còn 11g30")', w['state'] == 'early' and w['label'] == 'Bắt đầu 18:30 · còn 11g30', w)
        check('07:00 market closed (mở 08:00)', m['state'] == 'closed' and m['label'] == 'Mở cửa lúc 08:00', m)
        w = st['t1845'][1]
        check('18:45 wedding late 15′', w['state'] == 'late' and w['minutesLate'] == 15 and w['label'] == 'Trễ 15 phút', w)
        w = st['t1930'][1]
        check('19:30 wedding missed', w['state'] == 'missed' and w['label'] == 'Đã lỡ show', w)
        w = st['t1730'][1]
        check('17:30 wedding open (mở cửa trước 60′)', w['state'] == 'open' and 'còn 1g' in w['label'], w)
        check('12:00 coffee closed', st['t1200'][0]['state'] == 'closed', st['t1200'][0])

        # ---------- 4. Bị chặn khi early/missed ----------
        await pg.evaluate("()=>{__qa.state.clock=420}")
        entered = await play_scene(pg, 'wedding', [3])
        txt = await toasts(pg)
        check('07:00 vào wedding bị chặn + toast "Chưa tới giờ"', not entered and 'Chưa tới giờ' in txt, txt[-200:])
        await pg.wait_for_timeout(3500)
        await pg.evaluate("()=>{__qa.state.clock=1170}")
        entered = await play_scene(pg, 'wedding', [3])
        check('19:30 vào wedding bị chặn + toast "lỡ show"', not entered and 'lỡ show' in await toasts(pg))
        await pg.wait_for_timeout(3500)

        # ---------- 5. Đúng giờ: dẫn xong cộng duration, show lần 2 bị chặn ----------
        await pg.evaluate("()=>{__qa.state.clock=1080;__qa.state.energy=100}")    # 18:00, mở cửa
        cash0 = await pg.evaluate("()=>__qa.state.cash")
        entered = await play_scene(pg, 'wedding', [3])
        dur = await pg.evaluate("()=>__qa.Clock.duration('wedding')")
        r = await pg.evaluate("()=>({clock:__qa.state.clock,done:__qa.state.doneToday.wedding,txt:document.querySelector('.res-card').innerText})")
        check('đến sớm 18:00 → chờ tới 18:30 rồi + duration', entered and r['clock'] == 1110 + dur, (entered, r['clock'], dur))
        check('màn tổng kết ghi giờ 18:30 → kết thúc', '18:30 →' in r['txt'] and 'Trễ' not in r['txt'], r['txt'])
        check('doneToday.wedding = true', r['done'] is True)
        await go_home(pg)
        cash1 = await pg.evaluate("()=>__qa.state.cash")
        await pg.evaluate("()=>{__qa.state.clock=1110}")
        entered = await play_scene(pg, 'wedding', [3])
        check('show lần 2 trong ngày bị chặn ("đã dẫn")', not entered and 'đã dẫn show này' in await toasts(pg))
        check('sceneStatus(wedding) = done', (await pg.evaluate("()=>__qa.Clock.sceneStatus('wedding').state")) == 'done')
        await pg.wait_for_timeout(3500)

        # ---------- 6. Trễ 15′ → trừ cát-xê & báo rõ ----------
        await pg.evaluate("()=>{__qa.state.clock=1215;__qa.state.energy=100}")    # interview 20:00 → trễ 15′
        c0 = await pg.evaluate("()=>__qa.state.cash")
        entered = await play_scene(pg, 'interview', [3])
        r = await pg.evaluate("()=>({cash:__qa.state.cash,txt:document.querySelector('.res-card').innerText,clock:__qa.state.clock})")
        base_cash = await pg.evaluate("()=>{const sc=__qa.SCENES.interview;return Math.round(sc.reward.cash*(0.8+3*0.1))}")
        exp = round(base_cash * (1 - 0.12))
        check('trễ 15′ → cát-xê −12% (ân hạn 5′, 1.2%/phút)', entered and r['cash'] - c0 == exp, (r['cash'] - c0, exp))
        check('màn tổng kết báo "Trễ 15 phút → cát-xê −12%"', 'Trễ 15 phút → cát-xê −12%' in r['txt'], r['txt'])
        dur = await pg.evaluate("()=>__qa.Clock.duration('interview')")
        check('trễ: giờ kết thúc = giờ vào + duration', r['clock'] == 1215 + dur, r['clock'])
        pen = await pg.evaluate("()=>[0,5,15,45,200].map(m=>__qa.Clock.latePenalty(m))")
        check('latePenalty tối đa 50%', pen[0] == 0 and pen[1] == 0 and abs(pen[2] - .12) < 1e-9 and abs(pen[3] - .48) < 1e-9 and pen[4] == .5, pen)
        await go_home(pg)

        # ---------- 7. Daily lặp được, chỉ hồi ⚡ lần đầu ----------
        await pg.evaluate("()=>{__qa.state.clock=480;__qa.state.energy=30;__qa.state.doneToday={}}")
        await play_scene(pg, 'market', [3]); e1 = await pg.evaluate("()=>__qa.state.energy"); await go_home(pg)
        entered = await play_scene(pg, 'market', [3]); e2 = await pg.evaluate("()=>__qa.state.energy")
        lbl = await pg.evaluate("()=>document.querySelector('.res-card').textContent")
        check('daily lần 1 hồi ⚡', e1 > 30, e1)
        check('daily lần 2 vẫn vào được nhưng không hồi ⚡', entered and e2 == e1 and 'đã hồi ⚡ rồi' in lbl, (entered, e1, e2))
        check('daily cộng 30′ mỗi lần (08:00 → 09:00)', (await pg.evaluate("()=>__qa.state.clock")) == 540)
        await go_home(pg)

        # ---------- 8. Đi ngủ ----------
        await pg.evaluate("()=>{__qa.state.clock=1300;__qa.state.energy=10;__qa.state.loc='cafe'}")
        d0 = await pg.evaluate("()=>__qa.state.day")
        got = await pg.evaluate("()=>{let n=null;document.addEventListener('clock',e=>n=e.detail.now,{once:true});__qa.Clock.sleep();const s=__qa.state;return {n,day:s.day,clock:s.clock,energy:s.energy,max:s.maxEnergy,done:s.doneToday,loc:s.loc,dd:s.dayDate,today:__qa.dayKey()}}")
        check('sleep → ngày mới, clock 420, năng lượng đầy, doneToday={}, loc=home, phát clock',
              got['day'] == d0 + 1 and got['clock'] == 420 and got['energy'] == got['max'] and got['done'] == {} and got['loc'] == 'home' and got['n'] == 420 and got['dd'] == got['today'], got)
        check('sau khi ngủ: wedding lại nhận được (early lúc 07:00, không còn done)', (await pg.evaluate("()=>__qa.Clock.sceneStatus('wedding').state")) == 'early')

        # ---------- 9. Chạm 24:00 → ngất xỉu (60% ⚡) ----------
        await pg.wait_for_timeout(3500)
        await pg.evaluate("()=>{__qa.state.clock=1430;__qa.state.energy=10}")
        d0 = await pg.evaluate("()=>__qa.state.day")
        await pg.evaluate("()=>__qa.Clock.advance(20)")
        got = await pg.evaluate("()=>({day:__qa.state.day,clock:__qa.state.clock,energy:__qa.state.energy})")
        check('advance qua 24:00 → forced sleep: ngày mới 07:00, ⚡ = 60', got == {'day': d0 + 1, 'clock': 420, 'energy': 60}, got)
        check('toast ngất xỉu', 'ngất xỉu' in await toasts(pg))

        # ---------- 10. Mở lại cùng ngày thật: giữ ngày + giờ (3 lần) ----------
        await pg.evaluate("()=>{__qa.state.clock=900;__qa.state.doneToday={backstage:true};__qa.saveNow()}")
        d0 = await pg.evaluate("()=>__qa.state.day")
        ok = True; labels = []
        for _ in range(3):
            labels.append(await reload_and_start(pg))
            s = await pg.evaluate("()=>({day:__qa.state.day,clock:__qa.state.clock,done:__qa.state.doneToday})")
            ok = ok and s == {'day': d0, 'clock': 900, 'done': {'backstage': True}}
        check(f'mở lại 3 lần cùng ngày thật → vẫn Ngày {d0} lúc 15:00, giữ doneToday', ok, s)
        check('nút màn chào: "Tiếp tục Ngày N · 15:00"', all(f'Tiếp tục Ngày {d0} · 15:00' in l for l in labels), labels)

        # ---------- 11. Sang ngày thật mới mà chưa ngủ → ngày mới 07:00 ----------
        await pg.evaluate("()=>{__qa.state.dayDate='2020-01-01';__qa.state.dayFresh=false;__qa.state.energy=20;__qa.saveNow()}")
        await reload_and_start(pg)
        s = await pg.evaluate("()=>({day:__qa.state.day,clock:__qa.state.clock,done:__qa.state.doneToday,energy:__qa.state.energy})")
        check('sang ngày thật mới (chưa ngủ) → Ngày N+1, 07:00, doneToday reset, ⚡ đầy', s == {'day': d0 + 1, 'clock': 420, 'done': {}, 'energy': 100}, s)

        # ---------- 12. Đã ngủ nhưng chưa chơi, sang ngày thật mới → dùng luôn ngày đó (không nhảy 2 ngày) ----------
        await pg.evaluate("()=>{__qa.Clock.sleep();__qa.state.dayDate='2020-01-01';__qa.saveNow()}")
        d1 = await pg.evaluate("()=>__qa.state.day")
        await reload_and_start(pg)
        s = await pg.evaluate("()=>({day:__qa.state.day,clock:__qa.state.clock,dd:__qa.state.dayDate,today:__qa.dayKey()})")
        check('ngủ xong chưa chơi, sang ngày thật mới → giữ Ngày N (không nhảy)', s['day'] == d1 and s['clock'] == 420 and s['dd'] == s['today'], (d1, s))
        await ctx.close()

        # ---------- 13. Save cũ cùng ngày thật, không có clock → tiếp tục, không lỗi ----------
        ctx, pg = await open_game(b, url, None, start=False, errs=allerrs)
        today = await pg.evaluate("()=>__qa.dayKey()")
        await ctx.close()
        ctx, pg = await open_game(b, url, dict(base, dayDate=today), errs=allerrs)
        s = await pg.evaluate("()=>({day:__qa.state.day,clock:__qa.state.clock,status:__qa.Clock.sceneStatus('coffee').state})")
        check('save cũ cùng ngày, không có clock → Ngày 3 tiếp tục lúc 07:00', s == {'day': 3, 'clock': 420, 'status': 'open'}, s)
        await ctx.close()

        # ---------- 14. Người chơi mới tinh ----------
        ctx, pg = await open_game(b, url, None, errs=allerrs)
        s = await pg.evaluate("()=>({day:__qa.state.day,clock:__qa.state.clock})")
        check('người chơi mới → Ngày 1 lúc 07:00', s == {'day': 1, 'clock': 420}, s)
        await ctx.close()

        check('không có lỗi JS', not allerrs, allerrs[:3])
        await b.close()
    return fails

if __name__ == '__main__':
    n = asyncio.run(main())
    print(f'\n{"TẤT CẢ ĐÚNG" if not n else f"{n} ca SAI"}')
    sys.exit(1 if n else 0)
