# Hướng dẫn nạp mô hình VRM (VRoid Studio)

Thư mục này chứa các file mô hình nhân vật `.vrm`. Game đọc file từ đây và hiển thị thay cho nhân vật anime chibi dựng bằng code. Nếu chưa có file nào, game vẫn chạy bình thường bằng nhân vật chibi mặc định.

Lưu ý: file `.vrm` **không** nằm trong git của repo này. Thư mục chỉ có `.gitkeep` và README này. Khi thêm file, hãy kiểm tra quyền sử dụng trước khi commit (xem bước 6).

## Bước 1: Chuẩn bị mô hình trong VRoid Studio

1. Cài VRoid Studio (miễn phí) từ trang chính thức của VRoid.
2. Mở mô hình có sẵn hoặc tạo nhân vật mới.
3. Kiểm tra mô hình chỉ có một bộ xương humanoid chuẩn (mặc định của VRoid). Không xóa hoặc đổi tên các bone chính như hips, spine, head, arm, leg.

## Bước 2: Xuất file VRM

1. Vào menu xuất file và chọn định dạng **VRM** (thường là `File` → `Export` → `VRM`; tên menu có thể khác theo phiên bản).
2. Chọn phiên bản VRM. Game hỗ trợ cả VRM 0.x (mặc định của VRoid) và VRM 1.0.
3. Đặt tên file theo mã nhân vật, ví dụ `mc.vrm` cho nhân vật chính, `emma.vrm` và `liam.vrm` cho cặp đôi.
4. Lưu file.

## Bước 3: Đặt file vào thư mục dự án

Sao chép file vào `public/vrm/`, ví dụ:

```
public/vrm/mc.vrm
```

## Bước 4: Điền đường dẫn trong `src/data/content.ts`

Mở `src/data/content.ts`, tìm `VRM_MODELS` (khoảng dòng 89) và bỏ dấu `//` ở dòng tương ứng:

```ts
export const VRM_MODELS: Record<string, string> = {
  mc: 'vrm/mc.vrm',
  // emma: 'vrm/emma.vrm',
  // liam: 'vrm/liam.vrm',
};
```

Quy tắc đặt khóa:

- `mc`: nhân vật chính (MC). Khóa này được dùng cho nhân vật trên bản đồ và trong sân khấu.
- `emma`, `liam`: cặp đôi trong cảnh đám cưới. Các khóa khác phải khớp với id NPC trong `NPCS`.
- Đường dẫn phải **tương đối** (không bắt đầu bằng `/`), ví dụ `vrm/mc.vrm`. Game tự thêm `BASE_URL` (`/the-mc/` khi build cho GitHub Pages).

## Bước 5: Kiểm tra

1. Chạy `npm run dev` và mở game.
2. Kiểm tra bản đồ (nhân vật chính) và sân khấu (MC cùng NPC).
3. Mở Console của trình duyệt. Nếu thấy cảnh báo `[VRM] Không nạp được`, kiểm tra lại tên file và đường dẫn.
4. Chạy `npm run build` để đảm bảo build vẫn thành công.

## Bước 6: Kiểm tra quyền sử dụng (bắt buộc)

Mô hình VRoid thường có điều khoản riêng (ví dụ về chỉnh sửa, phân phối lại, dùng thương mại, ghi công). Trước khi đưa file lên GitHub Pages, hãy:

- Mở trang mô hình trên VRoid Hub hoặc xem phần license trong VRoid Studio.
- Xác nhận được phép **phân phối lại** file `.vrm` (game công khai file này trên web).
- Ghi công tác giả nếu license yêu cầu.
- Nếu mô hình là của bạn, kiểm tra đúng các quyền bạn muốn cấp cho người khác.

Nếu không chắc, hãy dùng nhân vật chibi mặc định (bỏ trống `VRM_MODELS`) thay vì commit file.

## Kích thước khuyến nghị

| Mục | Khuyến nghị | Giới hạn cứng |
|---|---|---|
| Dung lượng file `.vrm` | Dưới 10 MB | 20 MB |
| Kích thước texture | 1024 px (có thể 2048 px cho mặt) | 2048 px |
| Số lượng tam giác | Dưới 50.000 mỗi nhân vật | 80.000 |
| Số nhân vật VRM hiển thị cùng lúc | Tối đa 3 (sân khấu cặp đôi) | 3 |

Nếu file quá lớn, hãy giảm kích thước texture trong VRoid Studio (xuất lại với texture nhỏ hơn) hoặc dùng công cụ nén texture trước khi xuất.

Trên bản đồ, người đi đường dùng nhân vật chibi dựng bằng code (không dùng VRM) để giữ hiệu năng trên điện thoại. Chỉ nhân vật chính có VRM trên bản đồ.

## Xử lý sự cố

- **Hiện hình tạm (thân capsule, đầu cầu)**: file chưa nạp được. Kiểm tra tên file, đường dẫn trong `VRM_MODELS`, và Console.
- **Nhân vật quay lưng về phía người xem**: model VRM 0.x được xoay tự động. Nếu vẫn sai, báo lại để kiểm tra trong `src/three/VrmCharacter3D.tsx`.
- **Miệng hoặc chớp mắt không hoạt động**: mô hình có thể không có biểu cảm chuẩn. Trong VRoid Studio, kiểm tra tab biểu cảm có các preset `A`, `I`, `U`, `E`, `O`, `Blink`, `Joy`.
