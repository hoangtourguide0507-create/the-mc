# Phong cách giao diện "Ghibli Studio" — MC Life · English Stage

Tài liệu này là nguồn chuẩn cho mọi màu, khung, chữ và chuyển động. Khi thêm hoặc sửa giao diện, dùng đúng các token dưới đây (Tailwind: `ghibli-*`, class `.ghibli-panel`). Không thêm neon, không dùng `backdrop-blur` cho khung nội dung.

## 1. Ý tưởng
Một buổi sáng hè ở thị trấn nhỏ: trời xanh nhạt, mây kem, cây cối xanh mềm, nắng vàng ấm, khung giấy kem như cuốn sổ tay vẽ tay. Ban đêm là xanh tím dịu, đèn cửa sổ vàng ấm. Không tương phản gắt, không viền sáng chói.

## 2. Bảng màu (giao diện 2D)
| Token | Hex | Dùng cho |
|---|---|---|
| `ghibli-cream` | #FFF8EC | nền khung, sheet, modal |
| `ghibli-track` | #EADFCB | nền thanh tiến độ, đường kẻ |
| `ghibli-ink` | #3B2A22 | chữ chính |
| `ghibli-ink-soft` | #6B5A4E | chữ phụ, nhãn (đạt ≥ 4.5:1 trên kem) |
| `ghibli-clay` | #6B4E3D | viền 2px, nút phụ |
| `ghibli-sky` | #BFE6F2 | nền trời, khối nhạt xanh |
| `ghibli-sage` | #7FBF6A | thành công, năng lượng |
| `ghibli-sun` | #F2B84B | tiền, cấp độ, điểm nổi bật |
| `ghibli-coral` | #E0643E | cảnh báo, khóa, nhấn mạnh |
| `ghibli-teal` | #3E9B94 | nhãn Fluency, thông tin |

Màu chữ trên nền kem: dùng biến thể đậm (`-700`, `-800`), không dùng `-200`/`-300`.
Nút có nền màu đặc/gradient: chữ trắng (nền đậm) hoặc `ghibli-ink` (nền sáng).

## 3. Bảng màu 3D (cảnh thành phố, phòng hub, sân khấu)
- Ngày: trời trên `#9FD8EE`, chân trời `#FFF1D6`, sương mù ấm `#F6EBD2`.
- Đất cỏ `#A8D98A`, đường `#8E8576`, vỉa hè `#F3E7CF`, nước `#8FD3E8`.
- Ánh sáng: nắng `#FFE7B0`, ánh sáng môi trường xanh nhạt `#CFEFFF` và nâu đất `#B8A07A`. Bóng mềm, không đen đặc.
- Đêm: trời `#2E3F6B` → `#5A5C8F`, sương `#3A4A74`, đèn đường và cửa sổ `#FFD58A` (không dùng neon hồng/cyan).
- Sân khấu: đèn spotlight `#FFE2A8`, phông hoàng hôn `#F7C6A0` → `#B9D8F0`, sóng âm pastel (hồng nhạt, xanh ngọc, vàng).
- Phòng hub: tường kem `#F5E6CC`, sàn gỗ `#C89A6B`.

## 4. Khung và nút
- Khung: `.ghibli-panel` (nền kem, viền 2px `ghibli-clay`, bóng dưới 3px). Bo góc 16–24px.
- Nút chính: nền gradient nhẹ (ví dụ `ghibli-sage` → `#9FD68A`, hoặc `ghibli-sun` → `#F7C35C`) có viền 2px `ghibli-clay`, chữ `ghibli-ink`, bóng dưới 3px.
- Nút phụ/chip: nền kem, viền clay. Trạng thái chọn: nền gradient pastel + chữ trắng.
- Trạng thái khóa: nền `#F1E9DC`, chữ `ghibli-ink-soft`, có icon khóa và lý do rõ ràng. Không làm mờ dưới 60% độ đục.
- Vùng chạm tối thiểu 48×48px. Icon trong nút tối thiểu 24px. Nút chính có nhãn chữ.
- Overlay nền tối (modal): `bg-ghibli-ink/40` (không đen đặc, không blur mạnh).

## 5. Chữ
- Tiêu đề: Baloo 2 (`font-display`), đậm. Nội dung: Nunito.
- Cỡ tối thiểu: nhãn 12px (`text-xs`), nội dung 14px, giá trị số 16px đậm. Không dùng `text-[10px]`.
- Không viết hoa toàn bộ câu dài. Tiêu đề mục có thể dùng `uppercase tracking-wider` ở cỡ `text-sm`.

## 6. Chuyển động
- Thời lượng 180–300ms, easing ease-out. Hiệu ứng lá/mây trôi chậm (8–14s).
- Không nhấp nháy liên tục. Bounce chỉ dùng cho phần thưởng và thông báo ngắn.
- Giữ nguyên `prefers-reduced-motion` nếu có.

## 7. Nhân vật
- Chibi anime (đã có). Viền nét mềm màu nâu ấm thay vì đen. Má hồng nhạt. Bóng đổ mềm.
- Chế độ `ghibli` là mặc định (`src/three/artStyle.ts`). `?style=neon` vẫn dùng được để so sánh.

## 8. Quy tắc bất khả xâm phạm
- Không đổi logic game, công thức, store, thời gian, audio, hay vị trí tương tác. Chỉ đổi màu, khoảng cách, cỡ chữ, bóng, nền và chuyển động.
- Không thêm thư viện mới. Không làm nặng hậu kỳ trên điện thoại.
- Mọi thay đổi phải pass `npm run build` và `python3 tests/test_core_logic.py`.
