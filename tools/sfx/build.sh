#!/usr/bin/env bash
# Cắt và chuẩn hoá âm lượng tiếng vỗ tay thu thật (tools/sfx/raw/, tải bằng workflow fetch-sfx.yml)
# thành public/audio/sfx/*.mp3. Chạy lại khi muốn đổi đoạn cắt: bash tools/sfx/build.sh
# Ba mức (khớp với SFX.play trong src/audio/audioSystem.ts):
#   clap-*     khoảng 40 người, vỗ tay lịch sự ngắn (lượt đạt 2 sao)
#   applause-* 150 và 300 người, tràng pháo tay (lượt 3 sao, kết bài 2 sao)
#   ovation    600 người, có reo hò, đoạn đầu nối với đoạn tắt dần tự nhiên (kết bài 3 sao)
set -euo pipefail
cd "$(dirname "$0")/../.."
RAW=tools/sfx/raw
OUT=public/audio/sfx
mkdir -p "$OUT"
ENC=(-ar 44100 -ac 2 -c:a libmp3lame -b:a 96k)

# cut <nguồn> <bắt đầu> <dài> <mờ dần> <LUFS> <tên>
cut() {
  local src=$1 ss=$2 dur=$3 fade=$4 lufs=$5 name=$6
  ffmpeg -v error -y -ss "$ss" -t "$dur" -i "$RAW/$src.mp3" \
    -af "afade=t=in:d=0.08,afade=t=out:st=$(python3 -c "print($dur-$fade)"):d=$fade,loudnorm=I=$lufs:TP=-2:LRA=11" \
    "${ENC[@]}" "$OUT/$name.mp3"
}

cut 3518 1.6 3.4 1.3 -24 clap-1
cut 3521 1.4 3.4 1.3 -24 clap-2
cut 0019 0.25 4.8 1.9 -21 applause-1
cut 0020 0.5 4.8 1.9 -21 applause-2

# Tràng pháo tay lớn: 4,5 giây đầu (vỗ tay dâng lên) nối mềm với 6 giây cuối (tắt dần tự nhiên)
ffmpeg -v error -y \
  -ss 0.5 -t 5.0 -i "$RAW/0021.mp3" \
  -ss 21.5 -t 6.0 -i "$RAW/0021.mp3" \
  -filter_complex "[0:a]afade=t=in:d=0.08[a];[a][1:a]acrossfade=d=1.2:c1=tri:c2=tri,loudnorm=I=-20:TP=-2:LRA=11[o]" \
  -map "[o]" "${ENC[@]}" "$OUT/ovation.mp3"

cat > "$OUT/CREDITS.md" <<'TXT'
# Tiếng vỗ tay

Thu thật bởi Joseph Sardin, BigSoundBank (https://bigsoundbank.com), giấy phép CC0 (không bắt buộc ghi nguồn).
Nguồn: Applause from 40 People #2 và #5, Applause: 150 People, 300 People, 600 People.
Danh sách đầy đủ ở tools/sfx/sources.json; cắt và chuẩn hoá âm lượng bằng tools/sfx/build.sh.
TXT
ls -la "$OUT"
