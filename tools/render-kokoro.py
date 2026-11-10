#!/usr/bin/env python3
"""Render giọng Kokoro (miễn phí, chạy trên CPU) cho mọi câu game đọc mà chưa có clip ElevenLabs.

  pip install kokoro-onnx            # cần thêm ffmpeg trong PATH
  python3 tools/render-kokoro.py                  # render các câu còn thiếu
  python3 tools/render-kokoro.py --dry-run        # chỉ thống kê
  python3 tools/render-kokoro.py --minutes 40     # dừng sau 40 phút, lần sau chạy tiếp
  python3 tools/render-kokoro.py --prune          # xóa clip không còn dùng

Chọn giọng trong tools/voices.kokoro.json. Kết quả: public/audio/kokoro/<hash>.mp3 và
public/audio/manifest.kokoro.json. Game ưu tiên clip ElevenLabs (manifest.json); câu nào
không có thì dùng clip Kokoro; không có cả hai mới dùng giọng trình duyệt.
Hash của clip gồm giọng, tốc độ, ngôn ngữ và nội dung, nên chỉ render lại khi một trong số đó đổi.
"""
import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO_DIR = os.path.join(ROOT, 'public', 'audio')
CLIP_DIR = os.path.join(AUDIO_DIR, 'kokoro')
MANIFEST = os.path.join(AUDIO_DIR, 'manifest.kokoro.json')
EL_MANIFEST = os.path.join(AUDIO_DIR, 'manifest.json')
CACHE_DIR = os.environ.get('KOKORO_CACHE', os.path.join(ROOT, '.cache', 'kokoro'))


def load_lines():
    out = subprocess.run(['node', os.path.join(ROOT, 'tools', 'voice-lines.mjs'), '--json'],
                         check=True, capture_output=True, text=True, cwd=ROOT)
    return json.loads(out.stdout)


def spec_for(item, cfg):
    """Giọng cho một câu. Vai 'passer' chọn cố định theo nội dung câu trong passerPool."""
    if item['role'] == 'passer' and cfg.get('passerPool'):
        pool = cfg['passerPool']
        idx = int(hashlib.sha1(item['key'].encode('utf-8')).hexdigest()[:8], 16) % len(pool)
        spec = pool[idx]
    else:
        spec = cfg['roles'].get(item['role']) or cfg['roles']['coach']
    return {'voice': spec['voice'], 'lang': spec.get('lang', 'en-us'), 'speed': float(spec.get('speed', 1.0))}


def clip_name(item, spec, cfg):
    raw = json.dumps([spec['voice'], spec['lang'], spec['speed'], cfg['bitrate'], item['text']], ensure_ascii=False)
    return 'kokoro/%s.mp3' % hashlib.sha1(raw.encode('utf-8')).hexdigest()[:16]


def fetch(url, dest):
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return dest
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    print('Tải %s ...' % url, flush=True)
    tmp = dest + '.part'
    urllib.request.urlretrieve(url, tmp)
    os.replace(tmp, dest)
    return dest


class Engine:
    def __init__(self, cfg):
        import numpy as np
        from kokoro_onnx import Kokoro
        self.np = np
        model = fetch(cfg['modelUrl'], os.path.join(CACHE_DIR, 'kokoro-v1.0.onnx'))
        voices = fetch(cfg['voicesUrl'], os.path.join(CACHE_DIR, 'voices-v1.0.bin'))
        self.kokoro = Kokoro(model, voices)
        self.styles = {}

    def style(self, voice):
        """'af_heart' hoặc trộn 'bf_emma:0.5+af_bella:0.5' (tổng trọng số được chuẩn hóa về 1)."""
        if voice not in self.styles:
            parts = []
            for chunk in voice.split('+'):
                name, _, weight = chunk.strip().partition(':')
                parts.append((name, float(weight) if weight else 1.0))
            total = sum(w for _, w in parts)
            mixed = sum(self.kokoro.get_voice_style(n) * (w / total) for n, w in parts)
            self.styles[voice] = mixed.astype(self.np.float32)
        return self.styles[voice]

    def render(self, text, spec, bitrate, dest):
        samples, rate = self.kokoro.create(text, voice=self.style(spec['voice']), speed=spec['speed'], lang=spec['lang'])
        samples = self.np.asarray(samples, dtype=self.np.float32).reshape(-1)
        peak = float(self.np.max(self.np.abs(samples))) if samples.size else 0.0
        if peak > 0:
            samples = samples * (0.89 / peak)  # đưa đỉnh về khoảng -1 dBFS để các clip to đều nhau
        tmp = dest + '.part.mp3'
        subprocess.run(
            ['ffmpeg', '-loglevel', 'error', '-y', '-f', 'f32le', '-ar', str(rate), '-ac', '1', '-i', '-',
             '-b:a', bitrate, tmp],
            input=samples.tobytes(), check=True)
        os.replace(tmp, dest)
        return samples.size / rate


def write_manifest(clips):
    with open(MANIFEST, 'w', encoding='utf-8') as f:
        json.dump({'version': 1, 'engine': 'kokoro', 'clips': dict(sorted(clips.items()))}, f, ensure_ascii=False, indent=1)
        f.write('\n')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--prune', action='store_true')
    ap.add_argument('--minutes', type=float, default=0, help='Dừng sau số phút này (0 = không giới hạn)')
    ap.add_argument('--phases', default='', help='Chỉ render các phase này, cách nhau bằng dấu phẩy')
    args = ap.parse_args()

    with open(os.path.join(ROOT, 'tools', 'voices.kokoro.json'), encoding='utf-8') as f:
        cfg = json.load(f)
    phases = [p for p in args.phases.split(',') if p] or cfg['phases']
    rank = {p: i for i, p in enumerate(phases)}

    try:
        with open(EL_MANIFEST, encoding='utf-8') as f:
            el_keys = set(json.load(f).get('clips', {}))
    except (OSError, ValueError):
        el_keys = set()

    os.makedirs(CLIP_DIR, exist_ok=True)
    clips, keep, todo, covered = {}, set(), [], 0
    for item in load_lines():
        spec = spec_for(item, cfg)
        name = clip_name(item, spec, cfg)
        path = os.path.join(AUDIO_DIR, name)
        if os.path.exists(path) and os.path.getsize(path) > 0:
            clips[item['key']] = name
            keep.add(name)
        elif item['key'] in el_keys:
            covered += 1  # đã có giọng ElevenLabs, không cần Kokoro
        elif item['phase'] in rank:
            todo.append((item, spec, name, path))
    todo.sort(key=lambda t: rank[t[0]['phase']])

    chars = sum(len(t[0]['text']) for t in todo)
    print('Kokoro: %d clip đã có, %d câu đã có giọng ElevenLabs, %d câu cần render (%d ký tự).'
          % (len(clips), covered, len(todo), chars), flush=True)
    if todo and not args.dry_run and not shutil.which('ffmpeg'):
        sys.exit('Thiếu ffmpeg trong PATH (cần để nén mp3).')
    if args.dry_run:
        for item, spec, _, _ in todo[:15]:
            print('  [%s/%s → %s] %s' % (item['phase'], item['role'], spec['voice'], item['text'][:70]))
        return

    done, audio_s, started, failed = 0, 0.0, time.time(), 0
    if todo:
        engine = Engine(cfg)
        for item, spec, name, path in todo:
            if args.minutes and time.time() - started > args.minutes * 60:
                print('Hết %.0f phút cho lần chạy này; phần còn lại chờ lần sau.' % args.minutes, flush=True)
                break
            try:
                audio_s += engine.render(item['text'], spec, cfg['bitrate'], path)
                clips[item['key']] = name
                keep.add(name)
                done += 1
                if done % 25 == 0:
                    write_manifest(clips)
                    print('  %d/%d (%.0f phút âm thanh, %.0f phút chạy)' % (done, len(todo), audio_s / 60, (time.time() - started) / 60), flush=True)
            except Exception as err:  # một câu lỗi không làm hỏng cả lượt
                failed += 1
                print('  ✗ [%s] %s: %s' % (item['role'], item['text'][:50], err), flush=True)
                if failed > 20:
                    print('Quá nhiều lỗi, dừng.', flush=True)
                    break

    if args.prune:
        for f in os.listdir(CLIP_DIR):
            if 'kokoro/%s' % f not in keep:
                os.remove(os.path.join(CLIP_DIR, f))
    write_manifest(clips)
    print('Đã render %d clip (%.1f phút âm thanh). Manifest Kokoro có %d clip.' % (done, audio_s / 60, len(clips)), flush=True)
    if failed > 20:
        sys.exit(1)


if __name__ == '__main__':
    main()
