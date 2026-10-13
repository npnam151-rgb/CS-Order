# Kế hoạch phát triển Hệ thống Đặt hàng Bia & Đồng bộ Google Sheets

Hệ thống đặt hàng bia tươi chuyên dụng cho nhân viên kinh doanh (Sales Reps) và quản lý nhà phân phối, mô phỏng chuẩn xác biểu mẫu nhập nhanh theo danh sách điểm bán (lên đến hơn 100 khách hàng), tự động gửi và lưu dữ liệu vào Google Sheet qua Web App URL, cùng bảng điều khiển Quản trị viên (Admin) để cấu hình danh mục sản phẩm, quản lý điểm bán và xem báo cáo tổng hợp.

---

## Phản hồi và Quyết định đã xác nhận

> [!IMPORTANT]
> Dựa trên câu trả lời làm rõ của bạn, các quyết định cốt lõi đã được xác lập:

- **Giao diện nhập đơn**: Chế độ bảng nhập nhanh theo ngày (Matrix Quick-Entry Sheet) cho phép Sales nhập số lượng nhiều khách hàng cùng lúc trên cùng 1 màn hình với thao tác bàn phím mượt mà (Enter/Tab), hỗ trợ danh sách không giới hạn (100+ khách hàng).
- **Phương thức lưu trữ Google Sheets**: Kết nối qua **Google Apps Script Web App URL**. Ứng dụng sẽ tích hợp sẵn trình tạo mã Apps Script 1-click kèm hướng dẫn cài đặt cực kỳ đơn giản (dán script vào Google Sheet là hoạt động ngay), đồng thời lưu trữ bộ nhớ đệm (Local Cache/History) để không bao giờ mất dữ liệu ngay cả khi mất mạng.
- **Phân quyền Quản trị (Admin Module)**: Cơ chế đăng nhập Admin bằng mật khẩu an toàn để:
  1. Quản lý danh mục mặt hàng (Bom 50L, Bom 30L, Keg 1L, thêm loại bia/két mới, đơn vị tính, thứ tự cột).
  2. Quản lý danh sách khách hàng / điểm bán (thêm mới, sửa, xóa, tìm kiếm, nhập danh sách hàng loạt lên đến 100+ điểm bán).
  3. Báo cáo bán hàng trực quan (tổng hợp sản lượng theo ngày, theo nhân viên sale, theo khách hàng).

---

## 1. Tổng quan & Khái niệm cốt lõi

- **Mục tiêu**: Thay thế việc nhập liệu thủ công bằng tay hoặc file excel rời rạc bằng một ứng dụng web gọn nhẹ, tốc độ cao, hỗ trợ cả điện thoại và máy tính.
- **Đối tượng sử dụng**:
  - **Nhân viên Sale**: Chọn ngày, nhập tên Sale, lướt nhanh danh sách các quán quen (8 Lê Đại Hành, Du mục, Hàng quán, Tự do, Bia Ơi,...) và gõ số lượng bom/két cần giao, nhấn Gửi đơn.
  - **Quản lý / Admin**: Quản lý các loại sản phẩm, thêm bớt điểm bán hàng ngày, cấu hình URL Google Sheet và theo dõi biểu đồ/bảng số liệu tiêu thụ.
- **Giá trị mang lại**: Giảm 90% thời gian lên đơn hàng ngày, chuẩn hóa dữ liệu vào Google Sheet tự động, tránh nhầm lẫn số lượng và kiểm soát tồn kho/sản lượng dễ dàng.

---

## 2. Trải nghiệm người dùng & Thiết kế giao diện (UX/UI)

### Luồng sử dụng chính
1. **Màn hình Đặt hàng nhanh (Sales Order Matrix)**:
   - Thanh thông tin đơn: Chọn ngày đặt hàng (mặc định hôm nay), chọn hoặc nhập Tên NV Sale.
   - Thanh tìm kiếm / lọc nhanh điểm bán (tìm theo tên khách hàng).
   - Bảng ma trận đơn hàng:
     - Cột STT, Cột Tên khách hàng (ghim cố định bên trái khi cuộn ngang trên điện thoại).
     - Các cột sản phẩm động: `Bom 50l (bom)`, `Bom 30l (bom)`, `Keg1L (két)`... với ô nhập số lượng lớn, phím tăng/giảm số nhanh hoặc gõ trực tiếp.
     - Cột Tổng cộng theo từng khách hàng.
   - Hàng Tổng cộng toàn bộ đơn hàng (Sticky footer ghim dưới chân trang) hiển thị tổng số bom 50L, 30L, Keg 1L trong ngày.
   - Nút hành động: "Gửi đơn vào Google Sheet" (kèm trạng thái gửi realtime, thông báo thành công rõ ràng).

2. **Khu vực Admin Quản trị (Admin Dashboard)**:
   - Đăng nhập bảo mật bằng mật khẩu quản trị.
   - **Tab Quản lý Điểm bán**: Danh sách khách hàng (cho phép thêm nhanh từng khách, sửa tên, đổi thứ tự, nhập danh sách hàng loạt dạng copy/paste văn bản).
   - **Tab Danh mục Mặt hàng**: Thêm loại bia mới (Bom 20L, Keg 2L, Thùng lon...), chỉnh sửa tên cột hiển thị, ẩn/hiện mặt hàng.
   - **Tab Cấu hình Google Sheets**: Nhập URL Web App của Google Apps Script, nút kiểm tra kết nối (Test Ping), kèm sẵn mã nguồn Apps Script và hướng dẫn từng bước.
   - **Tab Báo cáo & Lịch sử**: Xem các đơn đã gửi, xuất lại file Excel/CSV, biểu đồ phân tích tỷ trọng theo loại bom/keg.

### Phong cách thiết kế
- **Bảng màu**: Màu bia vàng hổ phách đặc trưng (`Amber-500` / `Warm Bronze`), nền sáng hiện đại sạch sẽ (`Slate-50` / `White`), chữ màu than đậm (`Slate-900`) chuẩn độ tương phản cao, dễ nhìn ngoài công trường hoặc quán xá.
- **Typography**: Phông chữ hiện đại kết hợp số dạng bảng (`tabular-nums font-mono`) để các cột số lượng và tổng cộng luôn thẳng hàng tăm tắp.
- **Tối ưu di động (Mobile-First Data Entry)**: Các ô nhập có kích thước tối thiểu 44px, hỗ trợ gõ bàn phím số (number keypad), nút bấm thao tác nhanh không bị che khuất.

---

## 3. Kiến trúc kỹ thuật & Dữ liệu

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Giao diện Người dùng                           │
│  ┌───────────────────────────────┐   ┌──────────────────────────────┐  │
│  │   Bảng Nhập Đơn Nhanh (Sale)  │   │  Khu vực Quản trị (Admin)    │  │
│  │ - Ngày đặt & Tên NV Sale      │   │ - Quản lý Mặt hàng & Điểm bán│  │
│  │ - Ma trận điểm bán (100+ mục) │   │ - Cấu hình Web App URL       │  │
│  │ - Nhập số lượng & Tính tổng   │   │ - Báo cáo & Lịch sử gửi đơn  │  │
│  └───────────────┬───────────────┘   └──────────────┬───────────────┘  │
└──────────────────┼──────────────────────────────────┼──────────────────┘
                   │                                  │
                   ▼                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Local Storage & State Engine                    │
│  - Lưu danh sách 100+ khách hàng, danh mục mặt hàng, lịch sử đơn        │
│  - Hỗ trợ lưu nháp (Auto-save draft) chống mất dữ liệu khi vô tình tắt │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼ (HTTP POST / JSON)
┌────────────────────────────────────────────────────────────────────────┐
│                      Google Sheets Sync Connector                       │
│  - Gửi payload dữ liệu đơn hàng tới Google Apps Script Web App         │
│  - Google Apps Script tự động thêm các dòng đơn hàng vào Google Sheet   │
│  - Trả về phản hồi xác nhận thành công & mã số đơn                     │
└────────────────────────────────────────────────────────────────────────┘
```

### Cấu trúc dữ liệu ghi nhận vào Google Sheet
Tương ứng chính xác với biểu mẫu mẫu của bạn:
- `Ngày đặt hàng` (Ví dụ: `13/10/2026`)
- `NV Sale đặt đơn` (Ví dụ: `Nguyễn Văn A`)
- `Khách hàng` (Ví dụ: `8 lê đại hành`, `Du mục`, `Bia Ơi`...)
- `Bom 50l (bom)` (Số lượng)
- `Bom 30l (bom)` (Số lượng)
- `Keg1L (két)` (Số lượng)
- *(Mở rộng động theo các loại mặt hàng cấu hình trong Admin)*

---

## 4. Các bước triển khai chi tiết sau khi phê duyệt

1. **Khởi tạo dữ liệu mẫu và kho lưu trữ (State & Storage)**:
   - Khởi tạo danh sách khách hàng ban đầu từ ảnh mẫu (`8 lê đại hành`, `Du mục`, `Hàng quán`, `Tự do`, `Bia Ơi`...) với khả năng mở rộng lên 100+ điểm bán.
   - Khởi tạo 3 mặt hàng mặc định (`Bom 50l (bom)`, `Bom 30l (bom)`, `Keg1L (két)`).
2. **Xây dựng Màn hình Bảng Nhập Đơn Nhanh (Sales Order Entry)**:
   - Bộ chọn ngày và nhân viên sale.
   - Bảng dữ liệu ma trận với thanh cuộn mượt mà, bộ lọc tìm kiếm khách hàng tức thời.
   - Tự động cộng tổng từng dòng và tổng toàn bộ phiếu theo thời gian thực.
   - Nút Gửi đơn với hiệu ứng xử lý và phản hồi trực quan.
3. **Xây dựng Trình tích hợp Google Sheets (Google Apps Script Web App)**:
   - Module gửi dữ liệu qua Web App URL với cơ chế xử lý CORS và Retry.
   - Hộp thoại hiển thị sẵn toàn bộ mã nguồn Google Apps Script (copy là chạy) + hướng dẫn tạo Sheet chuẩn chỉ trong 30 giây.
4. **Xây dựng Module Admin Quản trị & Báo cáo**:
   - Quản lý thêm/sửa/xóa điểm bán (hỗ trợ dán danh sách hàng loạt).
   - Quản lý thêm/sửa mặt hàng và đơn vị tính.
   - Thống kê lịch sử các đợt đặt hàng và xuất file Excel/CSV dự phòng.
5. **Kiểm tra và hoàn thiện**:
   - Biên dịch và kiểm thử mượt mà trên cả giao diện di động lẫn máy tính để bàn.
